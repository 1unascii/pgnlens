import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from allauth.account.models import EmailAddress
from django.test import override_settings

# Minimal PGN with two games — one win as white, one loss as black.
# Player name: "TestPlayer"
TEST_PGN = """
[Event "Live Chess"]
[Site "Chess.com"]
[Date "2024.01.01"]
[Round "-"]
[White "TestPlayer"]
[Black "Opponent1"]
[Result "1-0"]
[WhiteElo "1000"]
[BlackElo "1000"]
[TimeControl "600"]
[Termination "TestPlayer won by resignation"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 1-0

[Event "Live Chess"]
[Site "Chess.com"]
[Date "2024.01.02"]
[Round "-"]
[White "Opponent2"]
[Black "TestPlayer"]
[Result "1-0"]
[WhiteElo "1000"]
[BlackElo "1000"]
[TimeControl "600"]
[Termination "Opponent2 won by checkmate"]

1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Be7 5. e3 O-O 1-0
""".strip()


@pytest.mark.django_db
def test_full_user_journey():
    with override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend'):
        client = APIClient()

        # ── Step 1: Register ─────────────────────────────────────────
        register_response = client.post('/api/auth/registration/', {
            'username': 'testplayer',
            'email': 'testplayer@example.com',
            'password1': 'SecurePass123!',
            'password2': 'SecurePass123!',
        }, format='json')
        assert register_response.status_code == 204 or register_response.status_code == 201, \
            f"Registration failed: {register_response.data}"

        # ── Step 2: Verify email ─────────────────────────────────────
        # Mark the email as verified directly in the database.
        # The verify-email endpoint is tested separately in test_verify_email.py.
        email_address = EmailAddress.objects.get(email='testplayer@example.com')
        email_address.verified = True
        email_address.save()

        # ── Step 3: Login ────────────────────────────────────────────
        login_response = client.post('/api/auth/login/', {
            'username': 'testplayer',
            'password': 'SecurePass123!',
        }, format='json')
        assert login_response.status_code == 200, \
            f"Login failed: {login_response.data}"

        # Extract the auth token and set it on the client
        token = login_response.data.get('key')
        assert token is not None, "No auth token returned"
        client.credentials(HTTP_AUTHORIZATION=f'Token {token}')

        # ── Step 4: Upload PGN and create report ─────────────────────
        pgn_file = SimpleUploadedFile(
            "test_games.pgn",
            TEST_PGN.encode(),
            content_type="application/octet-stream",
        )
        upload_response = client.post('/api/reports/', {
            'file': pgn_file,
            'player_name': 'TestPlayer',
            'report_name': 'Test Report',
        }, format='multipart')
        assert upload_response.status_code == 200, \
            f"Upload failed: {upload_response.data}"
        assert upload_response.data['games_created'] == 2
        assert upload_response.data['player_name'] == 'TestPlayer'
        report_id = upload_response.data['report_id']

        # ── Step 5: List reports — should see exactly one ─────────────
        list_response = client.get('/api/reports/')
        assert list_response.status_code == 200
        assert len(list_response.data) == 1
        assert list_response.data[0]['report_name'] == 'Test Report'
        assert list_response.data[0]['player_name'] == 'TestPlayer'

        # ── Step 6: View report detail ────────────────────────────────
        detail_response = client.get(f'/api/reports/{report_id}/')
        assert detail_response.status_code == 200
        report_data = detail_response.data

        # Check all_games_stats
        all_stats = report_data['all_games_stats']
        assert all_stats['total_games'] == 2
        assert all_stats['wins'] == 1
        assert all_stats['losses'] == 1
        assert all_stats['draws'] == 0
        assert all_stats['win_rate'] == 50.0

        # Check player_is_white_stats
        white_stats = report_data['player_is_white_stats']
        assert white_stats['total_games'] == 1
        assert white_stats['wins'] == 1
        assert white_stats['losses'] == 0

        # Check player_is_black_stats
        black_stats = report_data['player_is_black_stats']
        assert black_stats['total_games'] == 1
        assert black_stats['wins'] == 0
        assert black_stats['losses'] == 1

        # Check opening stats exist
        assert 'opening_category_stats' in all_stats
        assert 'opening_family_stats' in all_stats
        assert 'opening_line_stats' in all_stats
        assert 'family_to_lines' in all_stats

        # Check opening counts are reasonable
        assert all_stats['opening_family_count'] >= 1
        assert all_stats['opening_line_count'] >= 1

        # ── Step 7: List games filtered by report ─────────────────────
        games_response = client.get(f'/api/games/?report={report_id}')
        assert games_response.status_code == 200
        assert len(games_response.data) == 2

        # Games should be GameCardSerializer format (no moves field)
        first_game = games_response.data[0]
        assert 'white_player' in first_game
        assert 'black_player' in first_game
        assert 'opening_line' in first_game
        assert 'opening_family' in first_game

        # ── Step 8: View individual game detail ───────────────────────
        game_id = games_response.data[0]['id']
        game_response = client.get(f'/api/games/{game_id}/')
        assert game_response.status_code == 200
        game_data = game_response.data

        # Full game detail should include moves
        assert 'moves' in game_data
        assert len(game_data['moves']) > 0
        assert game_data['white_player'] in ['TestPlayer', 'Opponent1', 'Opponent2']
        assert game_data['black_player'] in ['TestPlayer', 'Opponent1', 'Opponent2']
        assert game_data['analysis_complete'] == False

        # Each move should have the expected structure
        first_move = game_data['moves'][0]
        assert 'move_number' in first_move
        assert 'white_move' in first_move
        assert 'black_move' in first_move
        assert 'white_eval' in first_move
        assert 'black_eval' in first_move
        assert 'white_classification' in first_move
        assert 'black_classification' in first_move

        # ── Step 9: Delete report ─────────────────────────────────────
        delete_response = client.delete(f'/api/reports/{report_id}/')
        assert delete_response.status_code == 204

        # Verify it's gone
        list_after_delete = client.get('/api/reports/')
        assert len(list_after_delete.data) == 0

        # Verify uploaded games were cascade-deleted with the report
        from game_analyzer.models import Game
        assert Game.objects.count() == 0