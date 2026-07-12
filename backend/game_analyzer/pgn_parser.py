import chess.pgn  # PGN parsing from python-chess library
import io          # TextIOWrapper converts binary file to text mode
import json
import os
from .models import Game, Move

# Load all ECO JSON files into one lookup dictionary keyed by FEN
eco_directory = os.path.join(os.path.dirname(__file__), '..', 'eco')
eco_lookup = {}
for letter in 'ABCDE':
    filepath = os.path.join(eco_directory, f'eco{letter}.json')
    with open(filepath) as f:
        eco_lookup.update(json.load(f))

def parse_pgn(pgn_file):
    """
    Parse a PGN file and save each game and its moves to the database.
    Accepts a file-like object (e.g. from request.FILES).
    Returns a list of created Game objects.
    """
    games = []
    
    # Django's uploaded file is in binary mode, but chess.pgn needs text mode
    pgn_io = io.TextIOWrapper(pgn_file, encoding='utf-8')

    # A PGN file can contain multiple games — loop until there are none left
    while True:
        pgn_game = chess.pgn.read_game(pgn_io)
        if pgn_game is None:
            break  # No more games in the file

        # Headers are the metadata between square brackets in PGN
        headers = pgn_game.headers

        # Save the game record to the database
        game = Game.objects.create(
            event=headers.get("Event", ""),
            site=headers.get("Site", ""),
            date=headers.get("Date", "").replace(".", "-"),  # PGN uses dots (2026.05.01), Django needs dashes (2026-05-01)
            round=int(headers.get("Round", 0)) if headers.get("Round", 0).isdigit() else None, # Store unknown rounds as null.
            white_player=headers.get("White", ""),
            black_player=headers.get("Black", ""),
            result=headers.get("Result", ""),
            white_elo=int(headers.get("WhiteElo", 0)),
            black_elo=int(headers.get("BlackElo", 0)),
            time_control=headers.get("TimeControl", ""),
            end_time=headers.get("EndTime", "").split(" ")[0] or None,  # Strip timezone, keep just the time (e.g. "12:34:12")
            termination=headers.get("Termination", ""),
        )

        # Save each move as a separate record linked to this game
        board = pgn_game.board()
        move_number = 1
        white_move = ""

        for move in pgn_game.mainline_moves():
            if board.turn == chess.WHITE:
                # White's turn — store the move and wait for black's response
                white_move = str(move)
            else:
                # Black's turn — save the pair as one Move record
                Move.objects.create(
                    game=game,
                    move_number=move_number,
                    white_move=white_move,
                    black_move=str(move),
                )
                move_number += 1
                white_move = None

            board.push(move)

        # If the game ended on white's move (no black response)
        if white_move is not None:
            Move.objects.create(
                game=game,
                move_number=move_number,
                white_move=white_move,
                black_move="",
            )

        # Classify the opening from the board's move history
        fen_matches = get_fen_matches(board)
        opening = classify_opening(fen_matches)
        game.eco_code = opening["eco_code"]
        game.opening_line = opening["opening_line"]
        game.opening_family = opening["opening_family"]
        game.fen_matches_array = [match["name"] for match in fen_matches]
        game.save()
        games.append(game)
        
    return games         

def get_fen_matches(board):
    """
    Replay a board's move history and collect every ECO match in order.

    Args:
        board: a chess.Board object with moves already pushed onto it.

    Returns:
        list of dicts, each with 'eco_code' and 'name' keys.
        Example: [
            {"eco_code": "B20", "name": "Sicilian Defense"},
            {"eco_code": "B90", "name": "Sicilian Defense: Najdorf Variation"},
        ]
    """
    fen_matches = []
    replay_board = chess.Board()
    for move in board.move_stack:
        replay_board.push(move)
        fen = replay_board.fen()
        if fen in eco_lookup:
            fen_matches.append({
                "eco_code": eco_lookup[fen]['eco'],
                "name": eco_lookup[fen]['name'],
            })
    return fen_matches


def classify_opening(fen_matches):
    """
    Given a list of ECO matches (from get_fen_matches), determine the
    opening line, family, and eco code to assign to the game.

    Current logic: use the last (most specific) match.

    Args:
        fen_matches: list of dicts with 'eco_code' and 'name' keys.

    Returns:
        dict with eco_code, opening_line, opening_family (strings, default empty).
    """
    if not fen_matches:
        return {
            "eco_code": "",
            "opening_line": "",
            "opening_family": "",
        }

    last_match = fen_matches[-1]
    opening_line = last_match["name"]
    opening_family = opening_line.split(":")[0].strip()

    return {
        "eco_code": last_match["eco_code"],
        "opening_line": opening_line,
        "opening_family": opening_family,
    }