import pytest
from game_analyzer.models import Game
from game_analyzer.views import build_stats_by_player_color


def make_game(**kwargs):
    """Create a Game object without saving to DB (for stats testing)."""
    defaults = {
        'event': 'Test', 'site': 'Test', 'date': '2024-01-01',
        'white_player': 'Player', 'black_player': 'Opponent',
        'result': '1-0', 'time_control': '600', 'termination': 'Win',
        'opening_category': 'Open Game', 'opening_family': 'Italian Game',
        'opening_line': 'Italian Game: Giuoco Piano',
    }
    defaults.update(kwargs)
    return Game(**defaults)


def test_single_win_as_white():
    games = [make_game(result='1-0')]
    stats = build_stats_by_player_color(games, 'Player')
    assert stats['wins'] == 1
    assert stats['losses'] == 0
    assert stats['draws'] == 0
    assert stats['win_rate'] == 100.0


def test_single_loss_as_white():
    games = [make_game(result='0-1')]
    stats = build_stats_by_player_color(games, 'Player')
    assert stats['wins'] == 0
    assert stats['losses'] == 1
    assert stats['win_rate'] == 0.0


def test_single_win_as_black():
    games = [make_game(white_player='Opponent', black_player='Player', result='0-1')]
    stats = build_stats_by_player_color(games, 'Player')
    assert stats['wins'] == 1
    assert stats['losses'] == 0


def test_draw():
    games = [make_game(result='1/2-1/2')]
    stats = build_stats_by_player_color(games, 'Player')
    assert stats['draws'] == 1
    assert stats['wins'] == 0
    assert stats['losses'] == 0


def test_multiple_games_stats():
    games = [
        make_game(result='1-0', opening_family='Italian Game', opening_line='Giuoco Piano'),
        make_game(result='0-1', opening_family='Italian Game', opening_line='Giuoco Piano'),
        make_game(result='1-0', opening_family='Ruy Lopez', opening_line='Morphy Defense'),
    ]
    stats = build_stats_by_player_color(games, 'Player')
    assert stats['total_games'] == 3
    assert stats['wins'] == 2
    assert stats['losses'] == 1
    assert stats['win_rate'] == 66.7
    assert stats['opening_family_count'] == 2
    assert stats['opening_line_count'] == 2


def test_family_to_lines_mapping():
    games = [
        make_game(opening_family='Italian Game', opening_line='Giuoco Piano'),
        make_game(opening_family='Italian Game', opening_line='Two Knights'),
    ]
    stats = build_stats_by_player_color(games, 'Player')
    italian_lines = stats['family_to_lines']['Italian Game']
    assert 'Giuoco Piano' in italian_lines
    assert 'Two Knights' in italian_lines


def test_opening_win_rates():
    games = [
        make_game(result='1-0', opening_family='Italian Game', opening_line='Giuoco Piano'),
        make_game(result='0-1', opening_family='Italian Game', opening_line='Giuoco Piano'),
    ]
    stats = build_stats_by_player_color(games, 'Player')
    italian_stats = stats['opening_family_stats']['Italian Game']
    assert italian_stats['win_rate'] == 50.0
    assert italian_stats['total'] == 2


def test_player_not_found():
    """When player name doesn't match either side, the game is skipped."""
    games = [make_game(white_player='Alice', black_player='Bob')]
    stats = build_stats_by_player_color(games, 'Charlie')
    # Game should be skipped — not counted in stats
    assert stats['total_games'] == 1
    assert stats['wins'] == 0
    assert stats['losses'] == 0
    assert stats['draws'] == 0