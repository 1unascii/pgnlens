from game_analyzer.stockfish_analyzer import (
    centipawns_to_win_probability,
    classify_move,
)


def test_equal_position_is_fifty_percent():
    assert centipawns_to_win_probability(0) == 0.5


def test_positive_eval_above_fifty():
    assert centipawns_to_win_probability(100) > 0.5


def test_negative_eval_below_fifty():
    assert centipawns_to_win_probability(-100) < 0.5


def test_mate_score_near_one():
    result = centipawns_to_win_probability(10000)
    assert result > 0.99


def test_best_move_no_loss():
    result = classify_move(100, 150, is_white_turn=True)
    assert result == 'best'


def test_blunder_large_loss():
    # White had +300, now it's -200 — huge drop
    result = classify_move(300, -200, is_white_turn=True)
    assert result == 'blunder'


def test_inaccuracy_moderate_loss():
    # White had +100, now +20
    result = classify_move(100, 20, is_white_turn=True)
    assert result == 'inaccuracy'


def test_black_move_perspective():
    # Black had -100 (good for black), now +50 (bad for black)
    result = classify_move(-100, 50, is_white_turn=False)
    assert result in ('mistake', 'blunder')


def test_black_best_move():
    # Eval goes from +100 to -50 — black improved position
    result = classify_move(100, -50, is_white_turn=False)
    assert result == 'best'