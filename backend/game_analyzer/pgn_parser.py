import chess.pgn  # PGN parsing from python-chess library
import io          # TextIOWrapper converts binary file to text mode
import json
import os
from collections import Counter
from .models import Game

# Load all ECO JSON files into one lookup dictionary keyed by FEN.
# Used by get_fen_matches() to identify openings during game replay.
eco_directory = os.path.join(os.path.dirname(__file__), '..', 'eco')
eco_lookup = {}
for letter in 'ABCDE':
    filepath = os.path.join(eco_directory, f'eco{letter}.json')
    with open(filepath) as f:
        eco_lookup.update(json.load(f))

# Load openings.json to build a name → family lookup.
# This lets classify_opening() use the same family grouping as
# the opening browser instead of duplicating the derivation logic.
openings_path = os.path.join(eco_directory, 'openings.json')
name_to_family = {}
with open(openings_path) as f:
    openings_data = json.load(f)
    for family_name, family_data in openings_data.items():
        for line_name in family_data["lines"]:
            name_to_family[line_name] = family_name

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

        # Build a list of moves as structured dicts
        board = pgn_game.board()
        move_list = []
        move_number = 1
        white_move = ""

        for move in pgn_game.mainline_moves():
            if board.turn == chess.WHITE:
                white_move = str(move)
            else:
                black_move = str(move)
                move_list.append({
                    "move_number": move_number,
                    "white_move": white_move,
                    "black_move": black_move,
                    "white_eval": None,
                    "black_eval": None,
                    "white_classification": "",
                    "black_classification": "",
                })

                if move_number == 1:
                    game.opening_category = categorize_opening(white_move, black_move)
                    # game.first_moves = f"{white_move} {black_move}"
                move_number += 1

            board.push(move)

        # If the game ended on white's move (no black response)
        if board.turn == chess.BLACK:
            move_list.append({
                "move_number": move_number,
                "white_move": white_move,
                "black_move": "",
                "white_eval": None,
                "black_eval": None,
                "white_classification": "",
                "black_classification": "",
            })

        game.moves = move_list

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

# These openings are so common that they aren't statistically useful for analysis.
# A number of openings such as Scotch Game, Scandinavian, The London, Italian etc can only be
# matched if we ignore that these games are also "King's Pawn Game" or "Queen's Pawn Game."
TOO_BROAD_FAMILY_NAMES = {"King's Pawn Game", "Queen's Pawn Game", "King's Knight Opening"}

def classify_opening(fen_matches):
    """Classify a game's opening using the FEN match chain.

    Uses the name_to_family lookup (built from openings.json) to get the
    family for each match, so family grouping is consistent with the
    opening browser. Keyword overrides and alias normalization are already
    applied in openings.json by build_openings.py.

    Walks the match chain and picks the first non-broad family found.
    """
    if not fen_matches:
        return {
            "eco_code": "",
            "opening_line": "",
            "opening_family": "",
        }

    last_match = fen_matches[-1]
    opening_line = last_match["name"]
    opening_family = None

    # Walk the match chain and look up each name's family from openings.json.
    # Skip families that are too broad to be useful in analysis.
    for match in fen_matches:
        family = name_to_family.get(match["name"])
        if family and family not in TOO_BROAD_FAMILY_NAMES:
            opening_family = family
            break

    # Fallback: use the last match's family, even if it's broad
    if not opening_family:
        opening_family = name_to_family.get(opening_line)
        if not opening_family:
            # Extract the base name before any ":" or "," separator
            opening_family = opening_line.split(":")[0].split(",")[0].strip()

    return {
        "eco_code": last_match["eco_code"],
        "opening_line": opening_line,
        "opening_family": opening_family,
    }


def categorize_opening(white_move, black_move):
    if white_move == "e2e4" and black_move == "e7e5":
        return "Open Game"
    elif white_move == "e2e4":
        return "Semi-Open Game"
    elif white_move == "d2d4" and black_move == "d7d5":
        return "Closed Game"
    elif white_move == "d2d4":
        return "Semi-Closed Game"
    else:
        return "Flank Game"