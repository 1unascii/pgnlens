import os
import pytest
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token


FIXTURE_DIR = os.path.join(
    os.path.dirname(__file__), 'fixtures'
)


@pytest.fixture
def authenticated_client():
    user = User.objects.create_user(
        username='testuser',
        password='testpass123',
    )
    token = Token.objects.create(user=user)
    client = APIClient()
    client.credentials(
        HTTP_AUTHORIZATION=f'Token {token.key}'
    )
    return client


@pytest.fixture
def report_with_games(authenticated_client):
    """Create a report by uploading a PGN file."""
    pgn_path = os.path.join(FIXTURE_DIR, 'test.pgn')
    with open(pgn_path, 'rb') as pgn_file:
        response = authenticated_client.post(
            '/api/reports/',
            {
                'file': pgn_file,
                'player_name': 'Alice',
            },
            format='multipart',
        )
    return response.data['report_id']


@pytest.mark.django_db
def test_list_all_games(report_with_games):
    client = APIClient()
    response = client.get('/api/games/')
    assert response.status_code == 200
    assert len(response.data) > 0


@pytest.mark.django_db
def test_filter_games_by_report(
    authenticated_client, report_with_games
):
    client = APIClient()
    response = client.get(
        f'/api/games/?report={report_with_games}'
    )
    assert response.status_code == 200
    assert len(response.data) > 0
    # GameCardSerializer should NOT include 'moves'
    assert 'moves' not in response.data[0]


@pytest.mark.django_db
def test_game_detail_includes_moves(
    authenticated_client, report_with_games
):
    client = APIClient()
    # Get list first to find a game ID
    list_response = client.get('/api/games/')
    game_id = list_response.data[0]['id']

    response = client.get(f'/api/games/{game_id}/')
    assert response.status_code == 200
    # GameSerializer should include 'moves'
    assert 'moves' in response.data


@pytest.mark.django_db
def test_filter_by_nonexistent_report():
    client = APIClient()
    response = client.get('/api/games/?report=99999')
    assert response.status_code == 200
    assert len(response.data) == 0