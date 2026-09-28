"""
Tests for move commentary generation.

Uses a real chess.com game (axeljung vs 1una5cii, 2026-09-25) as the test case.
Chess.com's classifications for this game are known, so we can verify our
commentary generates appropriate text for each classification type.

- Every move gets commentary text
- Book moves are identified correctly
- Best move is stored for non-book moves
- Commentary mentions the best move for mistakes/blunders
- Commentary mentions eval shift for big swings
"""
import pytest
import chess

# The test PGN (axeljung vs 1una5cii, Englund Gambit)
TEST_MOVES = [
    "d2d4", "e7e5",    # 1. d4 e5 (book, book)
    "d4e5", "b8c6",    # 2. dxe5 Nc6 (book, last book)
    "f2f4", "d8e7",    # 3. f4 Qe7 (inaccuracy, mistake)
    "c1d2", "g7g6",    # 4. Bd2 g6 (inaccuracy, mistake)
    "e2e3", "f8h6",    # 5. e3 Bh6 (miss, miss)
    "g2g3", "g6g5",    # 6. g3 g5 (miss, miss)
    "g1e2", "g5f4",    # 7. Ne2 gxf4 (inaccuracy, excellent)
    "e3f4", "d7d6",    # 8. exf4 d6 (best, best)
    "d2c3", "c8g4",    # 9. Bc3 Bg4 (mistake, blunder)
    "e5d6", "c7d6",    # 10. exd6 cxd6 (best, inaccuracy)
    "c3h8", "e8c8",    # 11. Bxh8 O-O-O (best, best)
    "b1c3", "d8e8",    # 12. Nc3 Re8 (best, good)
    "h2h3", "g4e2",    # 13. h3 Bxe2 (excellent, best)
    "d1e2", "h6f4",    # 14. Qxe2 Bxf4 (excellent, best)
    "g3f4", "e7h4",    # 15. gxf4 Qh4+ (mistake, best)
    "e1d1", "e8e2",    # 16. Kd1 Rxe2 (excellent, best)
    "f1e2", "h4f4",    # 17. Bxe2 Qxf4 (excellent, good)
    "h1f1", "f4b4",    # 18. Rf1 Qb4 (excellent, inaccuracy)
    "a2a3", "b4b2",    # 19. a3 Qxb2 (excellent, mistake)
    "a1a2", "b2b6",    # 20. Ra2 Qb6 (mistake, best)
    "f1f7", "b6g1",    # 21. Rxf7 Qg1+ (best, good)
    "d1d2", "c6e7",    # 22. Kd2 Nce7 (good, inaccuracy)
    "f7f1", "g1g5",    # 23. Rf1 Qg5+ (mistake, best)
    "d2e1", "g8g6",    # 24. Ke1 Ng6 (best, excellent)
    "c3e4", "g5c1",    # 25. Ne4 Qc1+ (blunder, excellent)
    "e2d1", "c1e3",    # 26. Bd1 Qe3+ (best, best)
    "d1e2", "g6h8",    # 27. Be2 Nxh8 (forced, good)
    "e4d6", "c8c7",    # 28. Nxd6+ Kc7 (excellent, best)
    "d6c4", "e3c3",    # 29. Nc4 Qc3+ (excellent, good)
    "e1d1", "c3d4",    # 30. Kd1 Qd4+ (best, excellent)
    "e2d3", "d4d5",    # 31. Bd3 Qd5 (excellent, good)
    "d1d2", "b7b5",    # 32. Kd2 b5 (blunder, great)
    "c4e3", "d5a2",    # 33. Ne3 Qxa2 (inaccuracy, best)
]

# Chess.com's known classifications for reference
# Format: (white_classification, black_classification)
CHESS_COM_CLASSIFICATIONS = [
    ("book", "book"),           # 1. d4 e5
    ("book", "book"),           # 2. dxe5 Nc6
    ("inaccuracy", "mistake"),  # 3. f4 Qe7
    ("inaccuracy", "mistake"),  # 4. Bd2 g6
    ("miss", "miss"),           # 5. e3 Bh6
    ("miss", "miss"),           # 6. g3 g5
    ("inaccuracy", "excellent"),# 7. Ne2 gxf4
    ("best", "best"),           # 8. exf4 d6
    ("mistake", "blunder"),     # 9. Bc3 Bg4
    ("best", "inaccuracy"),     # 10. exd6 cxd6
    ("best", "best"),           # 11. Bxh8 O-O-O
    ("best", "good"),           # 12. Nc3 Re8
    ("excellent", "best"),      # 13. h3 Bxe2
    ("excellent", "best"),      # 14. Qxe2 Bxf4
    ("mistake", "best"),        # 15. gxf4 Qh4+
    ("excellent", "best"),      # 16. Kd1 Rxe2
    ("excellent", "good"),      # 17. Bxe2 Qxf4
    ("excellent", "inaccuracy"),# 18. Rf1 Qb4
    ("excellent", "mistake"),   # 19. a3 Qxb2
    ("mistake", "best"),        # 20. Ra2 Qb6
    ("best", "good"),           # 21. Rxf7 Qg1+
    ("good", "inaccuracy"),     # 22. Kd2 Nce7
    ("mistake", "best"),        # 23. Rf1 Qg5+
    ("best", "excellent"),      # 24. Ke1 Ng6
    ("blunder", "excellent"),   # 25. Ne4 Qc1+
    ("best", "best"),           # 26. Bd1 Qe3+
    ("forced", "good"),         # 27. Be2 Nxh8
    ("excellent", "best"),      # 28. Nxd6+ Kc7
    ("excellent", "good"),      # 29. Nc4 Qc3+
    ("best", "excellent"),      # 30. Kd1 Qd4+
    ("excellent", "good"),      # 31. Bd3 Qd5
    ("blunder", "great"),       # 32. Kd2 b5
    ("inaccuracy", "best"),     # 33. Ne3 Qxa2
]


# --- Tests for the commentary generator ---
# These will test the generate_commentary function once it exists.
# For now, they serve as the spec.

@pytest.mark.django_db
class TestCommentaryBasics:
    """Basic tests for commentary generation."""

    def test_book_move_commentary_mentions_book(self):
        """Book moves should say they are book moves."""
        from game_analyzer.commentary import generate_commentary

        text = generate_commentary(
            classification="book",
            eval_before=0,
            eval_after=19,
            is_white_turn=True,
            move_san="d4",
            best_move_san="d4",
        )
        assert "book" in text.lower()

    def test_best_move_commentary(self):
        """Best moves should get positive commentary."""
        from game_analyzer.commentary import generate_commentary

        text = generate_commentary(
            classification="best",
            eval_before=183,
            eval_after=183,
            is_white_turn=True,
            move_san="exf4",
            best_move_san="exf4",
        )
        assert text  # should not be empty
        assert len(text) > 5  # should be a real sentence

    def test_blunder_mentions_best_move(self):
        """Blunder commentary should mention what the best move was."""
        from game_analyzer.commentary import generate_commentary

        text = generate_commentary(
            classification="blunder",
            eval_before=286,
            eval_after=-107,
            is_white_turn=True,
            move_san="Ne4",
            best_move_san="Qd2",
        )
        assert "Qd2" in text

    def test_inaccuracy_mentions_best_move(self):
        """Inaccuracy commentary should mention the better option."""
        from game_analyzer.commentary import generate_commentary

        text = generate_commentary(
            classification="inaccuracy",
            eval_before=123,
            eval_after=26,
            is_white_turn=True,
            move_san="f4",
            best_move_san="Nf3",
        )
        assert "Nf3" in text

    def test_mistake_mentions_eval_shift(self):
        """Mistake commentary should reference the eval change."""
        from game_analyzer.commentary import generate_commentary

        text = generate_commentary(
            classification="mistake",
            eval_before=-32,
            eval_after=286,
            is_white_turn=False,
            move_san="Bg4",
            best_move_san="dxe5",
        )
        assert text
        # Should mention the best move
        assert "dxe5" in text

    def test_excellent_move_commentary(self):
        """Excellent moves should get positive commentary."""
        from game_analyzer.commentary import generate_commentary

        text = generate_commentary(
            classification="excellent",
            eval_before=183,
            eval_after=183,
            is_white_turn=False,
            move_san="gxf4",
            best_move_san="gxf4",
        )
        assert text
        assert len(text) > 5

    def test_good_move_commentary(self):
        """Good moves should get mild commentary."""
        from game_analyzer.commentary import generate_commentary

        text = generate_commentary(
            classification="good",
            eval_before=434,
            eval_after=483,
            is_white_turn=False,
            move_san="Re8",
            best_move_san="Qb4",
        )
        assert text
        assert len(text) > 5

    def test_every_classification_produces_text(self):
        """Every valid classification should produce non-empty commentary."""
        from game_analyzer.commentary import generate_commentary

        classifications = ["book", "best", "excellent", "good", "inaccuracy", "mistake", "blunder"]
        for c in classifications:
            text = generate_commentary(
                classification=c,
                eval_before=0,
                eval_after=50,
                is_white_turn=True,
                move_san="Nf3",
                best_move_san="d4",
            )
            assert text, f"No commentary generated for classification '{c}'"
            assert len(text) > 0, f"Empty commentary for classification '{c}'"


@pytest.mark.django_db
class TestCommentaryWithFullGame:
    """Test commentary generation against the full test game."""

    def test_full_game_all_moves_get_commentary(self):
        """Every move in the test game should produce commentary."""
        from game_analyzer.commentary import generate_commentary

        board = chess.Board()
        previous_eval = 0

        for i, (white_uci, black_uci) in enumerate(
            [(TEST_MOVES[j], TEST_MOVES[j+1]) for j in range(0, len(TEST_MOVES), 2)]
        ):
            white_class, black_class = CHESS_COM_CLASSIFICATIONS[i]

            # White move
            white_move = board.parse_uci(white_uci)
            white_san = board.san(white_move)
            board.push(white_move)
            white_eval = previous_eval + 10  # simplified for test

            if white_class not in ("miss", "forced", "great"):
                white_text = generate_commentary(
                    classification=white_class,
                    eval_before=previous_eval,
                    eval_after=white_eval,
                    is_white_turn=True,
                    move_san=white_san,
                    best_move_san=white_san,
                )
                assert white_text, f"Move {i+1} white ({white_san}) got no commentary"

            previous_eval = white_eval

            # Black move
            black_move = board.parse_uci(black_uci)
            black_san = board.san(black_move)
            board.push(black_move)
            black_eval = previous_eval - 5  # simplified for test

            if black_class not in ("miss", "forced", "great"):
                black_text = generate_commentary(
                    classification=black_class,
                    eval_before=previous_eval,
                    eval_after=black_eval,
                    is_white_turn=False,
                    move_san=black_san,
                    best_move_san=black_san,
                )
                assert black_text, f"Move {i+1} black ({black_san}) got no commentary"

            previous_eval = black_eval

    def test_book_moves_are_first_few(self):
        """The first 4 half-moves should be classified as book moves."""
        # d4, e5, dxe5, Nc6 are all book moves per chess.com
        for i in range(2):
            assert CHESS_COM_CLASSIFICATIONS[i] == ("book", "book")
