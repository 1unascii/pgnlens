import chess
from game_analyzer.pgn_parser import classify_opening

def test_sicilian_najdorf():
    board = chess.Board()
    for move in ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4", "f3d4", "g8f6", "b1c3", "a7a6"]:
        board.push(chess.Move.from_uci(move))
    result = classify_opening(board)
    assert result["opening_family"] == "Sicilian Defense"
    assert "Najdorf" in result["opening_line"]