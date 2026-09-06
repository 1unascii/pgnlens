import chess
import chess.engine
import math
import subprocess
import sys
from django.conf import settings
import time

# Load ECO lookup for book move detection
import json
import os


def _get_engine():
    """Open a Stockfish engine. Uses subprocess.Popen directly on Windows
    with Daphne/ASGI because chess.engine.SimpleEngine.popen_uci uses
    asyncio.run() internally, which conflicts with Daphne's event loop
    on Windows (SelectorEventLoop can't spawn subprocesses)."""
    try:
        return chess.engine.SimpleEngine.popen_uci(settings.STOCKFISH_PATH)
    except NotImplementedError:
        # Windows + Daphne fallback: use subprocess directly
        process = subprocess.Popen(
            [settings.STOCKFISH_PATH],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
        )
        return _StockfishProcess(process)


class _StockfishProcess:
    """Minimal wrapper around a Stockfish subprocess that mimics
    the chess.engine.SimpleEngine interface for our use case."""

    def __init__(self, process):
        self.process = process
        # Read the initial UCI greeting
        self._send('uci')
        self._read_until('uciok')
        self._send('isready')
        self._read_until('readyok')

    def _send(self, command):
        self.process.stdin.write(command + '\n')
        self.process.stdin.flush()

    def _read_until(self, token):
        while True:
            line = self.process.stdout.readline().strip()
            if line == token:
                return
            if not line:
                return

    def analyse(self, board, limit):
        """Analyze a position and return a dict with 'score'."""
        self._send(f'position fen {board.fen()}')
        if hasattr(limit, 'depth') and limit.depth is not None:
            self._send(f'go depth {limit.depth}')
        elif hasattr(limit, 'nodes') and limit.nodes is not None:
            self._send(f'go nodes {limit.nodes}')
        else:
            self._send('go depth 8')

        best_score = None
        while True:
            line = self.process.stdout.readline().strip()
            if line.startswith('info') and ' score ' in line:
                parts = line.split()
                try:
                    score_idx = parts.index('score')
                    score_type = parts[score_idx + 1]
                    score_value = int(parts[score_idx + 2])
                    if score_type == 'cp':
                        best_score = chess.engine.PovScore(
                            chess.engine.Cp(score_value), chess.WHITE
                        )
                    elif score_type == 'mate':
                        best_score = chess.engine.PovScore(
                            chess.engine.Mate(score_value), chess.WHITE
                        )
                except (ValueError, IndexError):
                    pass
            if line.startswith('bestmove'):
                break

        return {'score': best_score}

    def quit(self):
        try:
            self._send('quit')
            self.process.wait(timeout=5)
        except Exception:
            self.process.kill()

eco_directory = os.path.join(
    os.path.dirname(__file__), '..', 'eco'
)
eco_lookup = {}
for letter in 'ABCDE':
    filepath = os.path.join(
        eco_directory, f'eco{letter}.json'
    )
    with open(filepath) as f:
        eco_lookup.update(json.load(f))


def analyze_all_moves(game, depth=None, nodes=None, final_pass=False):
    """Analyze every move in a game. Uses depth or node limit. Keeps engine alive for speed."""
    if not settings.STOCKFISH_PATH:
        return

    # Build the search limit — either depth-based or node-based
    if nodes:
        limit = chess.engine.Limit(nodes=nodes)
        limit_label = f"{nodes} nodes"
    else:
        depth = depth or 15
        limit = chess.engine.Limit(depth=depth)
        limit_label = f"depth {depth}"

    start = time.time()
    moves = game.moves
    board = chess.Board()
    engine = _get_engine()

    # Evaluate starting position
    previous_eval = _analyze_position(engine, board, limit)

    for index, move_record in enumerate(moves):
        if move_record.get("white_move"):
            board.push(chess.Move.from_uci(move_record["white_move"]))
            after_eval = _analyze_position(engine, board, limit)
            move_record["white_eval"] = after_eval
            move_record["white_classification"] = _classify_move_with_book(
                previous_eval, after_eval, True, board.fen())
            previous_eval = after_eval

        if move_record.get("black_move"):
            board.push(chess.Move.from_uci(move_record["black_move"]))
            after_eval = _analyze_position(engine, board, limit)
            move_record["black_eval"] = after_eval
            move_record["black_classification"] = _classify_move_with_book(
                previous_eval, after_eval, False, board.fen())
            previous_eval = after_eval

        # Save after each move so the frontend can fetch partial results
        # Force a new list so Django's JSONField detects the change
        game.moves = list(moves)
        game.save(update_fields=['moves'])
        print(f"  game {game.id} | {limit_label}: move {index + 1}/{len(moves)} ({time.time() - start:.1f}s)")

    engine.quit()
    if final_pass:
        game.analysis_complete = True
    game.save()
    print(f"Game {game.id}: analyzed {len(moves)} moves at {limit_label} in {time.time() - start:.1f}s")
    
def _analyze_position(engine, board, limit):
    """Analyze a single position and return centipawns from white's perspective."""
    info = engine.analyse(board, limit)
    return _score_to_centipawns(info["score"].white())


def _run_stockfish(board, depth):
    """Run Stockfish on a single position and return
    the analysis info dict."""
    engine = chess.engine.SimpleEngine.popen_uci(
        settings.STOCKFISH_PATH
    )
    info = engine.analyse(
        board, chess.engine.Limit(depth=depth)
    )
    engine.quit()
    return info


def _score_to_centipawns(score):
    """Convert a chess.engine score to centipawns."""
    if score.is_mate():
        return 10000 if score.mate() > 0 else -10000
    return score.score()


def centipawns_to_win_probability(centipawns):
    """
    Convert centipawns to win probability (0.0 to 1.0)
    from white's perspective.

    Uses the same sigmoid formula as chess.com / lichess.
    """
    return 0.5 + 0.5 * (
        2 / (1 + math.exp(-0.00368208 * centipawns)) - 1
    )


def classify_move(eval_before, eval_after, is_white_turn):
    """
    Classify a move based on how much win probability
    it lost.

    Returns: 'best', 'excellent', 'good', 'inaccuracy',
             'mistake', or 'blunder'
    """
    win_before = centipawns_to_win_probability(eval_before)
    win_after = centipawns_to_win_probability(eval_after)

    if is_white_turn:
        loss = win_before - win_after
    else:
        loss = win_after - win_before

    if loss <= 0:
        return 'best'
    elif loss < 0.02:
        return 'excellent'
    elif loss < 0.05:
        return 'good'
    elif loss < 0.10:
        return 'inaccuracy'
    elif loss < 0.20:
        return 'mistake'
    else:
        return 'blunder'


def _classify_move_with_book(
    eval_before, eval_after, is_white_turn, fen
):
    """Classify a move, returning 'book' if the
    position is in the ECO lookup table."""
    if fen in eco_lookup:
        return 'book'
    return classify_move(
        eval_before, eval_after, is_white_turn
    )