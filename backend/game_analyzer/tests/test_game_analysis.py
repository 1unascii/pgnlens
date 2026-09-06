# pytest — the test runner framework
import pytest
# patch — lets us replace real classes with fakes (only needed for the thread test)
from unittest.mock import patch
# APIClient — simulates a browser making requests to our Django API
from rest_framework.test import APIClient
# Game — our database model for chess games
from game_analyzer.models import Game


# A "fixture" is a reusable piece of test setup.
# Any test that has "sample_game" as a parameter will automatically
# get a Game object created in the test database before the test runs.
@pytest.fixture
def sample_game():
    """Create a game with some moves for analysis tests."""
    return Game.objects.create(
        event="Test",
        site="Test",
        date="2024-01-01",
        white_player="White",
        black_player="Black",
        result="1-0",
        time_control="600",
        termination="White won",
        moves=[
            {
                "move_number": 1,
                "white_move": "e2e4",
                "black_move": "e7e5",
                "white_eval": None,
                "black_eval": None,
                "white_classification": "",
                "black_classification": "",
            }
        ],
    )


# django_db — tells pytest this test needs access to the database
@pytest.mark.django_db
def test_analyze_game_not_found():
    """Requesting analysis for a nonexistent game returns 404."""
    # Create a fake browser client
    client = APIClient()
    # Try to analyze a game ID that doesn't exist
    response = client.get('/api/games/99999/analyze/?depth=8')
    # Should get a 404 Not Found
    assert response.status_code == 404
    assert response.data['detail'] == 'Game not found.'


@pytest.mark.django_db
def test_analyze_depth_runs_synchronously(sample_game):
    """Depth-limited analysis runs Stockfish and returns evaluated moves."""
    client = APIClient()
    # Hit the analyze URL with depth=8 — this actually runs Stockfish
    response = client.get(f'/api/games/{sample_game.id}/analyze/?depth=8')
    # Should succeed
    assert response.status_code == 200
    # Response should include the game's moves
    assert 'moves' in response.data
    assert response.data['game_id'] == sample_game.id
    # After analysis, evals should be filled in (no longer None)
    first_move = response.data['moves'][0]
    assert first_move['white_eval'] is not None
    assert first_move['black_eval'] is not None
    # Classifications should be set too
    assert first_move['white_classification'] != ''
    assert first_move['black_classification'] != ''


@pytest.mark.django_db
def test_analyze_default_depth(sample_game):
    """No depth or nodes param defaults to depth 8."""
    client = APIClient()
    # Hit the analyze URL with NO depth parameter
    response = client.get(f'/api/games/{sample_game.id}/analyze/')
    # Should still succeed and produce evals
    assert response.status_code == 200
    first_move = response.data['moves'][0]
    assert first_move['white_eval'] is not None


# This one test uses a mock because background threads can't see the
# test database — Django wraps each test in a transaction that other
# threads/connections can't access. So we fake the thread and just
# verify that the view tried to start one.
@pytest.mark.django_db
@patch('game_analyzer.views.threading.Thread')
def test_analyze_nodes_runs_in_background(mock_thread, sample_game):
    """Node-limited analysis starts a background thread and returns immediately."""
    client = APIClient()
    # Hit the analyze URL with nodes — this would normally start a background thread
    response = client.get(f'/api/games/{sample_game.id}/analyze/?nodes=1500000')
    # Should return immediately with 200 (doesn't wait for analysis)
    assert response.status_code == 200
    # Should return current moves (not yet analyzed)
    assert 'moves' in response.data
    assert response.data['game_id'] == sample_game.id
    # Verify a Thread was created
    mock_thread.assert_called_once()
    # Verify .start() was called on the thread (it was kicked off)
    mock_thread.return_value.start.assert_called_once()
