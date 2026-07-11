import chess
from game_analyzer.pgn_parser import classify_opening


def print_result(result):
    print()
    print(f"    ECO:    {result['eco_code']}")
    print(f"    Line:   {result['opening_line']}")
    print(f"    Family: {result['opening_family']}")
    print(f"    Matches:")
    for match in result['fen_matches_array']:
        print(f"      - {match}")
    print()


# --- Sicilian Defense ---

def test_sicilian_najdorf():
    board = chess.Board()
    for move in ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4", "f3d4", "g8f6", "b1c3", "a7a6"]:
        board.push(chess.Move.from_uci(move))
    result = classify_opening(board)
    print_result(result)
    assert result["opening_family"] == "Sicilian Defense"
    assert result["opening_line"] == "Sicilian Defense: Najdorf Variation"
    assert result["eco_code"] == "B90"


def test_sicilian_dragon():
    board = chess.Board()
    for move in ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4", "f3d4", "g8f6", "b1c3", "g7g6"]:
        board.push(chess.Move.from_uci(move))
    result = classify_opening(board)
    print_result(result)
    assert result["opening_family"] == "Sicilian Defense"
    assert result["opening_line"] == "Sicilian Defense: Dragon Variation"
    assert result["eco_code"] == "B70"


# --- Italian Game ---

def test_italian_giuoco_piano():
    board = chess.Board()
    for move in ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5"]:
        board.push(chess.Move.from_uci(move))
    result = classify_opening(board)
    print_result(result)
    assert result["opening_family"] == "Italian Game"
    assert result["opening_line"] == "Italian Game: Giuoco Piano"
    assert result["eco_code"] == "C50"


def test_italian_two_knights():
    board = chess.Board()
    for move in ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "g8f6"]:
        board.push(chess.Move.from_uci(move))
    result = classify_opening(board)
    print_result(result)
    assert result["opening_family"] == "Italian Game"
    assert result["opening_line"] == "Italian Game: Two Knights Defense"
    assert result["eco_code"] == "C55"


# --- Queen's Gambit ---

def test_queens_gambit_declined():
    board = chess.Board()
    for move in ["d2d4", "d7d5", "c2c4", "e7e6"]:
        board.push(chess.Move.from_uci(move))
    result = classify_opening(board)
    print_result(result)
    assert result["opening_family"] == "Queen's Gambit Declined"
    assert result["opening_line"] == "Queen's Gambit Declined"
    assert result["eco_code"] == "D30"


def test_queens_gambit_accepted():
    board = chess.Board()
    for move in ["d2d4", "d7d5", "c2c4", "d5c4"]:
        board.push(chess.Move.from_uci(move))
    result = classify_opening(board)
    print_result(result)
    assert result["opening_family"] == "Queen's Gambit Accepted"
    assert result["opening_line"] == "Queen's Gambit Accepted"
    assert result["eco_code"] == "D20"


# --- French Defense ---

def test_french_winawer():
    board = chess.Board()
    for move in ["e2e4", "e7e6", "d2d4", "d7d5", "b1c3", "f8b4"]:
        board.push(chess.Move.from_uci(move))
    result = classify_opening(board)
    print_result(result)
    assert result["opening_family"] == "French Defense"
    assert result["opening_line"] == "French Defense: Winawer Variation"
    assert result["eco_code"] == "C15"


def test_french_advance():
    board = chess.Board()
    for move in ["e2e4", "e7e6", "d2d4", "d7d5", "e4e5"]:
        board.push(chess.Move.from_uci(move))
    result = classify_opening(board)
    print_result(result)
    assert result["opening_family"] == "French Defense"
    assert result["opening_line"] == "French Defense: Advance Variation"
    assert result["eco_code"] == "C02"


# --- Caro-Kann Defense ---

def test_caro_kann_advance():
    board = chess.Board()
    for move in ["e2e4", "c7c6", "d2d4", "d7d5", "e4e5"]:
        board.push(chess.Move.from_uci(move))
    result = classify_opening(board)
    print_result(result)
    assert result["opening_family"] == "Caro-Kann Defense"
    assert result["opening_line"] == "Caro-Kann Defense: Advance Variation"
    assert result["eco_code"] == "B12"


def test_caro_kann_classical():
    board = chess.Board()
    for move in ["e2e4", "c7c6", "d2d4", "d7d5", "b1c3", "d5e4", "c3e4", "c8f5"]:
        board.push(chess.Move.from_uci(move))
    result = classify_opening(board)
    print_result(result)
    assert result["opening_family"] == "Caro-Kann Defense"
    assert result["opening_line"] == "Caro-Kann Defense: Classical Variation"
    assert result["eco_code"] == "B18"


# --- King's Indian Defense ---

def test_kings_indian_classical():
    board = chess.Board()
    for move in ["d2d4", "g8f6", "c2c4", "g7g6", "b1c3", "f8g7", "e2e4", "d7d6", "g1f3"]:
        board.push(chess.Move.from_uci(move))
    result = classify_opening(board)
    print_result(result)
    assert result["opening_family"] == "King's Indian Defense"
    assert result["opening_line"] == "King's Indian Defense: Normal Variation, Rare Defenses"
    assert result["eco_code"] == "E90"


def test_kings_indian_samisch():
    board = chess.Board()
    for move in ["d2d4", "g8f6", "c2c4", "g7g6", "b1c3", "f8g7", "e2e4", "d7d6", "f2f3"]:
        board.push(chess.Move.from_uci(move))
    result = classify_opening(board)
    print_result(result)
    assert result["opening_family"] == "King's Indian Defense"
    assert "misch Variation" in result["opening_line"]
    assert result["eco_code"] == "E80"


# --- Ruy Lopez ---

def test_ruy_lopez_morphy():
    board = chess.Board()
    for move in ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5", "a7a6"]:
        board.push(chess.Move.from_uci(move))
    result = classify_opening(board)
    print_result(result)
    assert result["opening_family"] == "Ruy Lopez"
    assert result["opening_line"] == "Ruy Lopez: Morphy Defense"
    assert result["eco_code"] == "C70"


def test_ruy_lopez_berlin():
    board = chess.Board()
    for move in ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5", "g8f6"]:
        board.push(chess.Move.from_uci(move))
    result = classify_opening(board)
    print_result(result)
    assert result["opening_family"] == "Ruy Lopez"
    assert result["opening_line"] == "Ruy Lopez: Berlin Defense"
    assert result["eco_code"] == "C65"


# --- London System ---

def test_london_system():
    board = chess.Board()
    for move in ["d2d4", "d7d5", "g1f3", "g8f6", "c1f4"]:
        board.push(chess.Move.from_uci(move))
    result = classify_opening(board)
    print_result(result)
    assert result["opening_family"] == "Queen's Pawn Game"
    assert result["opening_line"] == "Queen's Pawn Game: London System"
    assert result["eco_code"] == "D02"


def test_london_accelerated():
    board = chess.Board()
    for move in ["d2d4", "d7d5", "c1f4", "c7c6"]:
        board.push(chess.Move.from_uci(move))
    result = classify_opening(board)
    print_result(result)
    assert result["opening_family"] == "Queen's Pawn Game"
    assert result["opening_line"] == "Queen's Pawn Game: Accelerated London System"
    assert result["eco_code"] == "D00"


# --- Edge cases ---

def test_no_opening_match():
    board = chess.Board()
    result = classify_opening(board)
    print_result(result)
    assert result["eco_code"] == ""
    assert result["opening_line"] == ""
    assert result["opening_family"] == ""
    assert result["fen_matches_array"] == []


def test_fen_matches_array_grows():
    board = chess.Board()
    for move in ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4", "f3d4", "g8f6", "b1c3", "a7a6"]:
        board.push(chess.Move.from_uci(move))
    result = classify_opening(board)
    print_result(result)
    assert isinstance(result["fen_matches_array"], list)
    assert len(result["fen_matches_array"]) >= 2
    assert result["fen_matches_array"][-1] == result["opening_line"]
