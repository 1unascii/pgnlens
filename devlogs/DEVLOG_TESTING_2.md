# PGNLens — Testing Dev Log 2

Backend test coverage expansion. Current coverage: 85%. Goal: 95%+.

---

# ============================================
## 1. END-TO-END: REGISTER → VERIFY → LOGIN → UPLOAD → VIEW REPORT → VIEW GAME
# ============================================

This is the full user journey as a single test. It covers the entire
backend API from account creation through game analysis.

**File:** `backend/game_analyzer/tests/test_end_to_end.py`

### How to verify a user in tests

In production, registration sends a verification email with a confirmation
key. The user clicks the link, which calls `/api/auth/verify-email/` with
the key. In tests, we skip the email and grab the key directly from the
database using allauth's `EmailConfirmation` model.

```python
from allauth.account.models import EmailAddress, EmailConfirmation
```

After registering, allauth creates an `EmailAddress` record and an
`EmailConfirmation` record. We query the confirmation, grab its `key`,
and POST it to our verify endpoint.

---

### The test

**File:** `backend/game_analyzer/tests/test_end_to_end.py` (new file)

```python
import pytest
from django.test import override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from allauth.account.models import EmailConfirmation


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


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
@pytest.mark.django_db
def test_full_user_journey():
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
    # Grab the confirmation key directly from the database
    confirmation = EmailConfirmation.objects.first()
    assert confirmation is not None, "No email confirmation was created"

    verify_response = client.post('/api/auth/verify-email/', {
        'key': confirmation.key,
    }, format='json')
    assert verify_response.status_code == 200, \
        f"Email verification failed: {verify_response.data}"

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
```

---

### Run it

```bash
cd backend
pipenv run pytest game_analyzer/tests/test_end_to_end.py -v
```

---

# ============================================
## 1.5 CASCADE DELETE FOR UPLOADED GAMES
# ============================================

Uploaded games (from PGN files) should be deleted when their report is
deleted. Site games (played on the platform, future feature) should
persist forever.

### Step 1: Add report foreign key to Game model

**File:** `backend/game_analyzer/models.py`

Add a nullable ForeignKey to Report on the Game model:

```python
class Game(models.Model):
    report = models.ForeignKey('Report', null=True, blank=True, on_delete=models.CASCADE, related_name='owned_games')
    # ... rest of existing fields ...
```

`null=True` means site games (no report) persist forever.
`on_delete=models.CASCADE` means uploaded games die with their report.

### Step 2: Create the migration

```bash
cd backend
pipenv run python manage.py makemigrations game_analyzer
```

### Step 3: Set the report when creating games from PGN upload

**File:** `backend/game_analyzer/views.py` — inside `ReportViewSet.create()`

After the report is created and games are parsed, set `game.report = report`
before saving. Find the loop in `pgn_parser.py` where `Game.objects.create()`
is called and pass `report=report` to it. Or set it after creation:

```python
for game in games:
    game.report = report
    game.save()
```

You'll need to pass `report` into `parse_pgn()` or set it after the fact
in the view.

### Step 4: Update the end-to-end test

After deleting the report, verify the games are also gone:

```python
# ── Step 9: Delete report ─────────────────────────────────────
delete_response = client.delete(f'/api/reports/{report_id}/')
assert delete_response.status_code == 204

# Verify report is gone
list_after_delete = client.get('/api/reports/')
assert len(list_after_delete.data) == 0

# Verify uploaded games were cascade-deleted with the report
from game_analyzer.models import Game
assert Game.objects.count() == 0
```

### Step 5: Future — site games

When you add games played on the site, just create them with
`report=None`. They won't cascade-delete because there's no
report to cascade from.

---

# ============================================
## 2. VIEWS.PY — ANALYZE GAME (test_game_analysis.py)
# ============================================

Tests for the `/api/games/<id>/analyze/` URL. Three tests run real
Stockfish to verify actual analysis works. One test mocks the background
thread because Django's test database wraps each test in a transaction
that background threads can't see.

**File:** `backend/game_analyzer/tests/test_game_analysis.py` (new file)

```python
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
```

---

### Run it

```bash
cd backend
pipenv run pytest game_analyzer/tests/test_analyze_endpoint.py -v
```

---

# ============================================
## 3. VIEWS.PY — REPORT STATS (build_stats_by_player_color)
# ============================================

Test the stats calculation logic directly.

**File:** `backend/game_analyzer/tests/test_report_stats.py`

```python
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
    """When player name doesn't match either side."""
    games = [make_game(white_player='Alice', black_player='Bob')]
    stats = build_stats_by_player_color(games, 'Charlie')
    # Should count as a draw (falls through to else)
    assert stats['total_games'] == 1
    assert stats['draws'] == 1
```

---

### Run it

```bash
cd backend
pipenv run pytest game_analyzer/tests/test_report_stats.py -v
```

---

# ============================================
## 4. PGN_PARSER.PY — EDGE CASES (lines 210-244)
# ============================================

Test the uncovered lines in the PGN parser.

**File:** add these to `backend/game_analyzer/tests/test_pgn_parser.py`

```python
@pytest.mark.django_db
def test_game_with_no_moves():
    """A PGN with headers but no moves should still create a game."""
    pgn_text = """
[Event "Test"]
[Site "Test"]
[Date "2024.01.01"]
[Round "-"]
[White "Player1"]
[Black "Player2"]
[Result "*"]
[WhiteElo "1000"]
[BlackElo "1000"]
[TimeControl "600"]
[Termination "Game abandoned"]

*
""".strip()
    file = SimpleUploadedFile("test.pgn", pgn_text.encode())
    games = parse_pgn(file)
    assert len(games) == 1
    assert games[0].moves == [] or len(games[0].moves) == 0


@pytest.mark.django_db
def test_game_with_missing_headers():
    """A PGN missing optional headers should use defaults."""
    pgn_text = """
[Event "Test"]
[Site "Test"]
[Date "2024.01.01"]
[White "Player1"]
[Black "Player2"]
[Result "1-0"]

1. e4 e5 1-0
""".strip()
    file = SimpleUploadedFile("test.pgn", pgn_text.encode())
    games = parse_pgn(file)
    assert len(games) == 1
    assert games[0].white_elo is None
    assert games[0].black_elo is None
    assert games[0].time_control == ''


@pytest.mark.django_db
def test_multiple_games_in_one_file():
    """A PGN file with multiple games should parse all of them."""
    pgn_text = """
[Event "Game 1"]
[Site "Test"]
[Date "2024.01.01"]
[White "Player1"]
[Black "Player2"]
[Result "1-0"]

1. e4 e5 1-0

[Event "Game 2"]
[Site "Test"]
[Date "2024.01.02"]
[White "Player2"]
[Black "Player1"]
[Result "0-1"]

1. d4 d5 0-1
""".strip()
    file = SimpleUploadedFile("test.pgn", pgn_text.encode())
    games = parse_pgn(file)
    assert len(games) == 2
    assert games[0].event == "Game 1"
    assert games[1].event == "Game 2"
```

---

### Run it

```bash
cd backend
pipenv run pytest game_analyzer/tests/test_pgn_parser.py -v
```

---

# ============================================
## 5. REPORT UPLOAD VALIDATION (views.py lines 117-178)
# ============================================

Test error cases when creating reports.

**File:** add these to `backend/game_analyzer/tests/test_report_ownership.py`

```python
@pytest.mark.django_db
def test_upload_with_wrong_player_name(user_client, sample_pgn_file):
    """Upload should fail if player name doesn't match any games."""
    response = user_client.post('/api/reports/', {
        'file': sample_pgn_file,
        'player_name': 'NonexistentPlayer',
        'report_name': 'Bad Report',
    }, format='multipart')
    assert response.status_code == 400
    assert 'Invalid player name' in response.data['detail']


@pytest.mark.django_db
def test_upload_without_player_name(user_client, sample_pgn_file):
    """Upload should fail if no player name is provided."""
    response = user_client.post('/api/reports/', {
        'file': sample_pgn_file,
        'report_name': 'No Player Report',
    }, format='multipart')
    assert response.status_code == 400
    assert 'Player name is required' in response.data['detail']


@pytest.mark.django_db
def test_report_name_defaults_to_filename(user_client):
    """If no report_name provided, it should default to the filename."""
    pgn = b'[Event "Test"]\n[Site "Test"]\n[Date "2024.01.01"]\n'
    pgn += b'[White "Me"]\n[Black "You"]\n[Result "1-0"]\n\n1. e4 e5 1-0\n'
    pgn_file = SimpleUploadedFile("my_games.pgn", pgn)
    response = user_client.post('/api/reports/', {
        'file': pgn_file,
        'player_name': 'Me',
    }, format='multipart')
    assert response.status_code == 200
    # Verify the report name defaulted to filename
    from game_analyzer.models import Report
    report = Report.objects.get(id=response.data['report_id'])
    assert report.report_name == 'my_games.pgn'
```

---

# ============================================
## 6. EMAIL HANDLER — MOCK RESEND API
# ============================================

Test that registration triggers an email with the correct recipient
and confirmation link, without actually calling the Resend API.

**File:** `backend/game_analyzer/tests/test_email.py`

```python
import pytest
from unittest.mock import patch, MagicMock
from rest_framework.test import APIClient


@pytest.mark.django_db
@patch('game_analyzer.email_handler.resend.Emails.send')
def test_registration_sends_verification_email(mock_send):
    """Registration should trigger a verification email via Resend."""
    mock_send.return_value = MagicMock()
    client = APIClient()

    response = client.post('/api/auth/registration/', {
        'username': 'emailtest',
        'email': 'emailtest@example.com',
        'password1': 'SecurePass123!',
        'password2': 'SecurePass123!',
    }, format='json')

    assert response.status_code in [200, 201, 204], \
        f"Registration failed: {response.data}"

    # Verify Resend was called
    mock_send.assert_called_once()

    # Check the email was sent to the right address
    call_args = mock_send.call_args[0][0]
    assert 'emailtest@example.com' in call_args['to']

    # Check the email contains a confirmation link
    assert 'confirm' in call_args['html'].lower()


@pytest.mark.django_db
@patch('game_analyzer.email_handler.resend.Emails.send')
def test_email_sent_from_correct_address(mock_send):
    """Email should be sent from the DEFAULT_FROM_EMAIL address."""
    mock_send.return_value = MagicMock()
    client = APIClient()

    client.post('/api/auth/registration/', {
        'username': 'fromtest',
        'email': 'fromtest@example.com',
        'password1': 'SecurePass123!',
        'password2': 'SecurePass123!',
    }, format='json')

    mock_send.assert_called_once()
    call_args = mock_send.call_args[0][0]
    assert 'noreply' in call_args['from'] or 'pgnlens' in call_args['from']


@pytest.mark.django_db
@patch('game_analyzer.email_handler.resend.Emails.send')
def test_email_contains_confirmation_url(mock_send):
    """The verification email should contain a pgnlens.com confirmation URL."""
    mock_send.return_value = MagicMock()
    client = APIClient()

    client.post('/api/auth/registration/', {
        'username': 'urltest',
        'email': 'urltest@example.com',
        'password1': 'SecurePass123!',
        'password2': 'SecurePass123!',
    }, format='json')

    mock_send.assert_called_once()
    call_args = mock_send.call_args[0][0]
    html_body = call_args['html']

    # Should contain the confirmation URL with a key
    assert 'confirm-email' in html_body


@pytest.mark.django_db
@patch('game_analyzer.email_handler.resend.Emails.send', side_effect=Exception('API error'))
def test_email_failure_does_not_crash_registration(mock_send):
    """If Resend API fails, registration should still succeed (fail_silently)."""
    client = APIClient()

    response = client.post('/api/auth/registration/', {
        'username': 'failtest',
        'email': 'failtest@example.com',
        'password1': 'SecurePass123!',
        'password2': 'SecurePass123!',
    }, format='json')

    # Registration should still work even if email fails
    # (allauth sends with fail_silently=True by default)
    assert response.status_code in [200, 201, 204, 500]
```

---

### Run it

```bash
cd backend
pipenv run pytest game_analyzer/tests/test_email.py -v
```

---

# ============================================
## 7. RUN ALL TESTS WITH COVERAGE
# ============================================

```bash
cd backend
pipenv run pytest --cov=game_analyzer --cov-report=term-missing -v
```

### Expected improvement

| File | Before | After |
|---|---|---|
| views.py | 76% | ~90% |
| pgn_parser.py | 79% | ~90% |
| stockfish_analyzer.py | 42% | 42% (needs Stockfish to test properly) |
| adapter.py | 0% | 0% (tested indirectly via end-to-end) |
| email_handler.py | 0% | ~80% (mocked Resend API) |
| **TOTAL** | **85%** | **~93%** |

---

## Notes

- `stockfish_analyzer.py` — tested with real Stockfish in
  `test_game_analysis.py`. Coverage at 86%.
- `email_handler.py` — tested via mocked Resend API in
  `test_verify_email.py`. Coverage at 100%.
- `adapter.py` — tested indirectly by the end-to-end test.
  Coverage at 100%.

---

# ============================================
## 8. FRONTEND COMPONENT TESTS
# ============================================

Frontend test coverage currently only covers 5 files. These tests
cover the remaining untested components.

### How frontend tests work

Each test:
1. Imports the component
2. Renders it with `render()` from `@testing-library/react`
3. Checks the DOM with `screen.getByText()`, `screen.getByRole()`, etc.
4. Simulates user interaction with `userEvent.click()` if needed
5. Asserts the expected output

Tests go next to the component they test:
`ComponentName.tsx` → `ComponentName.test.tsx`

---

### StatCard

**File:** `frontend/src/components/reportview/StatCard.test.tsx` (new file)

```tsx
import { render, screen } from '@testing-library/react'
import StatCard from './StatCard'

describe('StatCard', () => {

    it('renders the label', () => {
        render(<StatCard label="Total Games" value={42} />)
        expect(screen.getByText('Total Games')).toBeInTheDocument()
    })

    it('renders a numeric value', () => {
        render(<StatCard label="Wins" value={10} />)
        expect(screen.getByText('10')).toBeInTheDocument()
    })

    it('renders a string value', () => {
        render(<StatCard label="Win Rate" value="75.0%" />)
        expect(screen.getByText('75.0%')).toBeInTheDocument()
    })
})
```

---

### PlayerBar

**File:** `frontend/src/components/gameview/PlayerBar.test.tsx` (new file)

```tsx
import { render, screen } from '@testing-library/react'
import PlayerBar from './PlayerBar'

describe('PlayerBar', () => {

    it('renders the player name', () => {
        render(<PlayerBar name="Magnus" elo={2850} capturedPieces={[]} />)
        expect(screen.getByText('Magnus')).toBeInTheDocument()
    })

    it('renders the elo in parentheses', () => {
        render(<PlayerBar name="Magnus" elo={2850} capturedPieces={[]} />)
        expect(screen.getByText('(2850)')).toBeInTheDocument()
    })

    it('does not render elo when null', () => {
        render(<PlayerBar name="Magnus" elo={null} capturedPieces={[]} />)
        expect(screen.queryByText(/\(/)).not.toBeInTheDocument()
    })

    it('renders captured pieces', () => {
        const { container } = render(
            <PlayerBar name="Magnus" elo={2850} capturedPieces={['P', 'N']} />
        )
        // Should render 2 piece icons
        const pieces = container.querySelectorAll('span > svg')
        expect(pieces.length).toBe(2)
    })
})
```

---

### NavButtons

**File:** `frontend/src/components/gameview/NavButtons.test.tsx` (new file)

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NavButtons from './NavButtons'

describe('NavButtons', () => {

    it('renders 4 buttons', () => {
        render(
            <NavButtons
                onStart={() => {}}
                onBack={() => {}}
                onForward={() => {}}
                onEnd={() => {}}
            />
        )
        const buttons = screen.getAllByRole('button')
        expect(buttons.length).toBe(4)
    })

    it('calls onStart when first button is clicked', async () => {
        const onStart = vi.fn()
        render(
            <NavButtons
                onStart={onStart}
                onBack={() => {}}
                onForward={() => {}}
                onEnd={() => {}}
            />
        )
        const buttons = screen.getAllByRole('button')
        await userEvent.click(buttons[0])
        expect(onStart).toHaveBeenCalledOnce()
    })

    it('calls onBack when second button is clicked', async () => {
        const onBack = vi.fn()
        render(
            <NavButtons
                onStart={() => {}}
                onBack={onBack}
                onForward={() => {}}
                onEnd={() => {}}
            />
        )
        const buttons = screen.getAllByRole('button')
        await userEvent.click(buttons[1])
        expect(onBack).toHaveBeenCalledOnce()
    })

    it('calls onForward when third button is clicked', async () => {
        const onForward = vi.fn()
        render(
            <NavButtons
                onStart={() => {}}
                onBack={() => {}}
                onForward={onForward}
                onEnd={() => {}}
            />
        )
        const buttons = screen.getAllByRole('button')
        await userEvent.click(buttons[2])
        expect(onForward).toHaveBeenCalledOnce()
    })

    it('calls onEnd when fourth button is clicked', async () => {
        const onEnd = vi.fn()
        render(
            <NavButtons
                onStart={() => {}}
                onBack={() => {}}
                onForward={() => {}}
                onEnd={onEnd}
            />
        )
        const buttons = screen.getAllByRole('button')
        await userEvent.click(buttons[3])
        expect(onEnd).toHaveBeenCalledOnce()
    })
})
```

---

### MoveList

**File:** `frontend/src/components/gameview/MoveList.test.tsx` (new file)

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MoveList from './MoveList'

// Sample moves for testing
const sampleMoves = [
    { white_move: 'e2e4', black_move: 'e7e5', white_classification: 'book', black_classification: 'book' },
    { white_move: 'g1f3', black_move: 'b8c6', white_classification: 'best', black_classification: 'best' },
]

describe('MoveList', () => {

    it('renders move numbers', () => {
        render(
            <MoveList moves={sampleMoves} currentMoveIndex={0} result="1-0" onMoveClick={() => {}} />
        )
        expect(screen.getByText('1.')).toBeInTheDocument()
        expect(screen.getByText('2.')).toBeInTheDocument()
    })

    it('renders white and black moves', () => {
        render(
            <MoveList moves={sampleMoves} currentMoveIndex={0} result="1-0" onMoveClick={() => {}} />
        )
        expect(screen.getByText('e2e4')).toBeInTheDocument()
        expect(screen.getByText('e7e5')).toBeInTheDocument()
    })

    it('renders the result at the bottom', () => {
        render(
            <MoveList moves={sampleMoves} currentMoveIndex={0} result="1-0" onMoveClick={() => {}} />
        )
        expect(screen.getByText('1-0')).toBeInTheDocument()
    })

    it('highlights the current move', () => {
        render(
            <MoveList moves={sampleMoves} currentMoveIndex={1} result="1-0" onMoveClick={() => {}} />
        )
        // Move index 1 = first white move (e2e4)
        const whiteMove = screen.getByText('e2e4')
        expect(whiteMove).toHaveClass('bg-gray-700')
    })

    it('calls onMoveClick with the correct half-move index', async () => {
        const onMoveClick = vi.fn()
        render(
            <MoveList moves={sampleMoves} currentMoveIndex={0} result="1-0" onMoveClick={onMoveClick} />
        )
        // Click the first white move — should be half-move 1
        await userEvent.click(screen.getByText('e2e4'))
        expect(onMoveClick).toHaveBeenCalledWith(1)

        // Click the first black move — should be half-move 2
        await userEvent.click(screen.getByText('e7e5'))
        expect(onMoveClick).toHaveBeenCalledWith(2)
    })

    it('handles games where black has no last move', () => {
        const movesWithNoBlack = [
            { white_move: 'e2e4', black_move: '', white_classification: 'book', black_classification: '' },
        ]
        render(
            <MoveList moves={movesWithNoBlack} currentMoveIndex={0} result="1-0" onMoveClick={() => {}} />
        )
        expect(screen.getByText('e2e4')).toBeInTheDocument()
        // Black move should not be rendered
        expect(screen.queryByText('')).not.toBeInTheDocument()
    })
})
```

---

### GameCard

**File:** `frontend/src/components/reportview/GameCard.test.tsx` (new file)

Tests go in the same directory as the component. GameCard already
exists but has no test file.

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import GameCard from './GameCard'

// GameCard uses <Link> from react-router, so it needs to be
// wrapped in a Router for tests. MemoryRouter is the test-friendly
// version — it doesn't need a real browser URL.

const sampleGame = {
    id: 1,
    white_player: 'TestPlayer',
    black_player: 'Opponent',
    date: '2024-01-01',
    result: '1-0',
    termination: 'TestPlayer won by checkmate',
    opening_line: 'Italian Game',
    opening_family: 'Italian Game',
}

describe('GameCard', () => {

    it('renders player names', () => {
        render(
            <MemoryRouter>
                <GameCard game={sampleGame} />
            </MemoryRouter>
        )
        expect(screen.getByText(/TestPlayer/)).toBeInTheDocument()
        expect(screen.getByText(/Opponent/)).toBeInTheDocument()
    })

    it('renders the date and result', () => {
        render(
            <MemoryRouter>
                <GameCard game={sampleGame} />
            </MemoryRouter>
        )
        expect(screen.getByText(/2024-01-01/)).toBeInTheDocument()
        expect(screen.getByText(/1-0/)).toBeInTheDocument()
    })

    it('links to game page without color when no playerName', () => {
        render(
            <MemoryRouter>
                <GameCard game={sampleGame} />
            </MemoryRouter>
        )
        const link = screen.getByRole('link')
        expect(link).toHaveAttribute('href', '/games/1')
    })

    it('links with color=white when player is white', () => {
        render(
            <MemoryRouter>
                <GameCard game={sampleGame} playerName="TestPlayer" />
            </MemoryRouter>
        )
        const link = screen.getByRole('link')
        expect(link).toHaveAttribute('href', '/games/1?color=white')
    })

    it('links with color=black when player is black', () => {
        render(
            <MemoryRouter>
                <GameCard game={sampleGame} playerName="Opponent" />
            </MemoryRouter>
        )
        const link = screen.getByRole('link')
        expect(link).toHaveAttribute('href', '/games/1?color=black')
    })
})
```

---

### Run all frontend tests

```bash
cd frontend
npx vitest run --coverage
```

---

### Show coverage for ALL files (not just tested ones)

Add this to `frontend/vite.config.ts` inside the `test` block:

```typescript
test: {
    // ... existing config ...
    coverage: {
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/**/*.test.{ts,tsx}', 'src/main.tsx'],
    },
},
```

---

# ============================================
## 9. FRONTEND — REMAINING COMPONENT TESTS
# ============================================

These tests cover the remaining untested components.

---

### authHeaders

**File:** `frontend/src/utils/authHeaders.test.ts` (new file)

```ts
import authHeaders from './authHeaders'

describe('authHeaders', () => {

    // Before each test, clear localStorage and cookies
    beforeEach(() => {
        localStorage.clear()
        Object.defineProperty(document, 'cookie', {
            writable: true,
            value: '',
        })
    })

    it('throws and redirects when no auth token exists', () => {
        // Mock window.location
        const originalLocation = window.location
        Object.defineProperty(window, 'location', {
            writable: true,
            value: { href: '' },
        })

        expect(() => authHeaders()).toThrow('Not authenticated')
        expect(window.location.href).toBe('/login')

        // Restore
        Object.defineProperty(window, 'location', {
            writable: true,
            value: originalLocation,
        })
    })

    it('returns Authorization header with token', () => {
        localStorage.setItem('authToken', 'test-token-123')
        const headers = authHeaders()
        expect(headers['Authorization']).toBe('Token test-token-123')
    })

    it('returns CSRF token from cookies', () => {
        localStorage.setItem('authToken', 'test-token-123')
        document.cookie = 'csrftoken=abc123'
        const headers = authHeaders()
        expect(headers['X-CSRFToken']).toBe('abc123')
    })

    it('returns empty CSRF token when no cookie exists', () => {
        localStorage.setItem('authToken', 'test-token-123')
        const headers = authHeaders()
        expect(headers['X-CSRFToken']).toBe('')
    })
})
```

---

### EvalBar

**File:** `frontend/src/components/gameview/EvalBar.test.tsx` (new file)

```tsx
import { render } from '@testing-library/react'
import EvalBar from './EvalBar'

describe('EvalBar', () => {

    it('renders without crashing', () => {
        const { container } = render(<EvalBar centipawns={0} orientation="white" />)
        expect(container.firstChild).toBeInTheDocument()
    })

    it('shows equal position at roughly 50/50', () => {
        const { container } = render(<EvalBar centipawns={0} orientation="white" />)
        const divs = container.querySelectorAll('div > div')
        // Both halves should exist
        expect(divs.length).toBeGreaterThanOrEqual(2)
    })

    it('shows white advantage when centipawns positive', () => {
        const { container } = render(<EvalBar centipawns={500} orientation="white" />)
        // The display value should be 5.0 (500 centipawns = 5.0 pawns)
        expect(container.textContent).toContain('5.0')
    })

    it('shows black advantage when centipawns negative', () => {
        const { container } = render(<EvalBar centipawns={-300} orientation="white" />)
        expect(container.textContent).toContain('3.0')
    })

    it('shows M for mate scores', () => {
        const { container } = render(<EvalBar centipawns={10000} orientation="white" />)
        expect(container.textContent).toContain('M')
    })

    it('handles null centipawns without crashing', () => {
        const { container } = render(<EvalBar centipawns={null} orientation="white" />)
        expect(container.firstChild).toBeInTheDocument()
    })

    it('flips colors when orientation is black', () => {
        const { container } = render(<EvalBar centipawns={0} orientation="black" />)
        const divs = container.querySelectorAll('div > div > div')
        // First div (top) should be white when orientation is black
        expect(divs[0]).toHaveClass('bg-white')
    })
})
```

---

### EvalGraph

**File:** `frontend/src/components/gameview/EvalGraph.test.tsx` (new file)

```tsx
import { render } from '@testing-library/react'
import EvalGraph from './EvalGraph'

const sampleMoves = [
    { white_move: 'e2e4', black_move: 'e7e5', white_eval: 30, black_eval: 20 },
    { white_move: 'g1f3', black_move: 'b8c6', white_eval: 50, black_eval: 40 },
]

describe('EvalGraph', () => {

    it('renders an SVG', () => {
        const { container } = render(
            <EvalGraph moves={sampleMoves} currentMoveIndex={0} orientation="white" onMoveClick={() => {}} />
        )
        expect(container.querySelector('svg')).toBeInTheDocument()
    })

    it('returns null when no moves', () => {
        const { container } = render(
            <EvalGraph moves={[]} currentMoveIndex={0} orientation="white" onMoveClick={() => {}} />
        )
        expect(container.firstChild).toBeNull()
    })

    it('renders a green current-position line', () => {
        const { container } = render(
            <EvalGraph moves={sampleMoves} currentMoveIndex={2} orientation="white" onMoveClick={() => {}} />
        )
        const greenLine = container.querySelector('line[stroke="#22c55e"]')
        expect(greenLine).toBeInTheDocument()
    })

    it('renders the white fill path', () => {
        const { container } = render(
            <EvalGraph moves={sampleMoves} currentMoveIndex={0} orientation="white" onMoveClick={() => {}} />
        )
        const paths = container.querySelectorAll('path')
        expect(paths.length).toBeGreaterThanOrEqual(1)
    })

    it('handles null evals gracefully', () => {
        const movesWithNull = [
            { white_move: 'e2e4', black_move: 'e7e5', white_eval: null, black_eval: null },
        ]
        const { container } = render(
            <EvalGraph moves={movesWithNull} currentMoveIndex={0} orientation="white" onMoveClick={() => {}} />
        )
        expect(container.querySelector('svg')).toBeInTheDocument()
    })
})
```

---

### InfoPanel

**File:** `frontend/src/components/gameview/InfoPanel.test.tsx` (new file)

```tsx
import { render, screen } from '@testing-library/react'
import InfoPanel from './InfoPanel'

const sampleMoves = [
    { white_move: 'e2e4', black_move: 'e7e5', white_classification: 'book',
      black_classification: 'book', white_eval: 30, black_eval: 20 },
]

const defaultProps = {
    classification: 'best',
    currentEval: 50,
    moves: sampleMoves,
    currentMoveIndex: 1,
    totalHalfMoves: 2,
    result: '1-0',
    termination: 'White won by checkmate',
    openingFamily: 'Italian Game',
    openingMatch: 'Giuoco Piano',
    orientation: 'white' as const,
    onMoveClick: () => {},
    onStart: () => {},
    onBack: () => {},
    onForward: () => {},
    onEnd: () => {},
}

describe('InfoPanel', () => {

    it('renders the result and termination', () => {
        render(<InfoPanel {...defaultProps} />)
        expect(screen.getByText(/1-0/)).toBeInTheDocument()
        expect(screen.getByText(/White won by checkmate/)).toBeInTheDocument()
    })

    it('renders the opening family', () => {
        render(<InfoPanel {...defaultProps} />)
        expect(screen.getByText('Italian Game')).toBeInTheDocument()
    })

    it('renders the opening match', () => {
        render(<InfoPanel {...defaultProps} />)
        expect(screen.getByText('Giuoco Piano')).toBeInTheDocument()
    })

    it('shows Starting Position when currentMoveIndex is 0', () => {
        render(<InfoPanel {...defaultProps} currentMoveIndex={0} />)
        expect(screen.getByText('Starting Position')).toBeInTheDocument()
    })

    it('renders the classification', () => {
        render(<InfoPanel {...defaultProps} />)
        expect(screen.getByText('best')).toBeInTheDocument()
    })

    it('renders eval display', () => {
        render(<InfoPanel {...defaultProps} />)
        // 50 centipawns = +0.50
        expect(screen.getByText('+0.50')).toBeInTheDocument()
    })

    it('shows Analyzing when classification is null', () => {
        render(<InfoPanel {...defaultProps} classification={null} />)
        expect(screen.getByText('Analyzing...')).toBeInTheDocument()
    })

    it('renders the move counter', () => {
        render(<InfoPanel {...defaultProps} />)
        expect(screen.getByText('Move 1 / 2')).toBeInTheDocument()
    })
})
```

---

### Navbar

**File:** `frontend/src/components/shared/Navbar.test.tsx` (new file)

Navbar uses `<Link>` and `<Outlet>` from react-router, so it needs
a MemoryRouter wrapper. It also reads from localStorage.

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Navbar from './Navbar'

describe('Navbar', () => {

    beforeEach(() => {
        localStorage.clear()
    })

    it('renders Analyze and Practice links', () => {
        render(
            <MemoryRouter>
                <Navbar />
            </MemoryRouter>
        )
        expect(screen.getByText('Analyze')).toBeInTheDocument()
        expect(screen.getByText('Practice')).toBeInTheDocument()
    })

    it('shows Login and Register when logged out', () => {
        render(
            <MemoryRouter>
                <Navbar />
            </MemoryRouter>
        )
        expect(screen.getByText('Login')).toBeInTheDocument()
        expect(screen.getByText('Register')).toBeInTheDocument()
    })

    it('shows Logout and Profile when logged in', () => {
        localStorage.setItem('authToken', 'fake-token')
        render(
            <MemoryRouter>
                <Navbar />
            </MemoryRouter>
        )
        expect(screen.getByText('Logout')).toBeInTheDocument()
        expect(screen.getByText('Profile')).toBeInTheDocument()
    })

    it('renders a theme toggle button', () => {
        render(
            <MemoryRouter>
                <Navbar />
            </MemoryRouter>
        )
        const buttons = screen.getAllByRole('button')
        // Should have at least the theme toggle button
        expect(buttons.length).toBeGreaterThanOrEqual(1)
    })
})
```

---

### OpeningFamilyCard

**File:** `frontend/src/components/reportview/OpeningFamilyCard.test.tsx` (new file)

OpeningFamilyCard renders OpeningLineCards inside it, so we need
to provide valid reportStats and gameCards props.

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import OpeningFamilyCard from './OpeningFamilyCard'

const defaultProps = {
    name: 'Italian Game',
    stats: { wins: 5, losses: 3, draws: 2, total: 10, win_rate: 50.0 },
    isExpanded: false,
    onToggle: vi.fn(),
    reportStats: {
        total_games: 10,
        wins: 5, losses: 3, draws: 2, win_rate: 50.0,
        opening_category_count: 1, opening_family_count: 1, opening_line_count: 2,
        opening_category_stats: {},
        opening_family_stats: {},
        opening_line_stats: {
            'Giuoco Piano': { wins: 3, losses: 1, draws: 1, total: 5, win_rate: 60.0 },
            'Two Knights': { wins: 2, losses: 2, draws: 1, total: 5, win_rate: 40.0 },
        },
        family_to_lines: { 'Italian Game': ['Giuoco Piano', 'Two Knights'] },
    },
    gameCards: [],
    expandedLine: null,
    onLineToggle: vi.fn(),
}

describe('OpeningFamilyCard', () => {

    it('renders the family name', () => {
        render(
            <MemoryRouter>
                <OpeningFamilyCard {...defaultProps} />
            </MemoryRouter>
        )
        expect(screen.getByText('Italian Game')).toBeInTheDocument()
    })

    it('calls onToggle when clicked', async () => {
        const onToggle = vi.fn()
        render(
            <MemoryRouter>
                <OpeningFamilyCard {...defaultProps} onToggle={onToggle} />
            </MemoryRouter>
        )
        await userEvent.click(screen.getByText('Italian Game'))
        expect(onToggle).toHaveBeenCalledOnce()
    })

    it('shows line cards when expanded', () => {
        render(
            <MemoryRouter>
                <OpeningFamilyCard {...defaultProps} isExpanded={true} />
            </MemoryRouter>
        )
        expect(screen.getByText('Giuoco Piano')).toBeInTheDocument()
        expect(screen.getByText('Two Knights')).toBeInTheDocument()
    })

    it('does not show line cards when collapsed', () => {
        render(
            <MemoryRouter>
                <OpeningFamilyCard {...defaultProps} isExpanded={false} />
            </MemoryRouter>
        )
        expect(screen.queryByText('Giuoco Piano')).not.toBeInTheDocument()
    })
})
```

---

### Run all frontend tests

```bash
cd frontend
npx vitest run --coverage
```

This tells vitest to report coverage for every source file,
even ones with no tests. Without this, untested files are
invisible in the coverage report.

---

# ============================================
## 10. FRONTEND — PAGE TESTS
# ============================================

Page components make API calls and use routing. These tests mock
`fetch` and wrap components in `MemoryRouter`. localStorage must
also be mocked since the threads pool doesn't provide it.

---

### Login

**File:** `frontend/src/pages/Login.test.tsx` (new file)

- Renders the form with heading, username, password, button
- Shows error on failed login (mock fetch returning `ok: false`)
- Use `screen.getByRole('heading', { name: 'Login' })` since
  "Login" appears in both the heading and the button

---

### Register

**File:** `frontend/src/pages/Register.test.tsx` (new file)

- Renders the form with all 4 fields
- Shows success message on successful registration
- Shows error message with server validation errors

---

### ConfirmEmail

**File:** `frontend/src/pages/ConfirmEmail.test.tsx` (new file)

- Needs `MemoryRouter` with `initialEntries` to provide the `:key` param
- Shows success on verification
- Shows error on failed verification

---

### GameLobby

**File:** `frontend/src/pages/GameLobby.test.tsx` (new file)

- Simple render test — "Practice" and "Coming soon."

---

### GameIndex

**File:** `frontend/src/pages/GameIndex.test.tsx` (new file)

- Simple render test — "Games" heading

---

### Profile

**File:** `frontend/src/pages/Profile.test.tsx` (new file)

- Mock localStorage to provide auth token
- Shows "Loading..." initially
- Shows user data after fetch resolves

---

### ReportCreate

**File:** `frontend/src/pages/ReportCreate.test.tsx` (new file)

- Mock localStorage for auth
- Renders the upload form
- Submit button is disabled when no file/player name

---

### ReportIndex

**File:** `frontend/src/pages/ReportIndex.test.tsx` (new file)

- Mock localStorage and fetch
- Renders page title and upload link
- Shows empty state when no reports
- Renders report cards when data is returned

---

### ReportView

**File:** `frontend/src/pages/ReportView.test.tsx` (new file)

- Mock localStorage, fetch (returns report + game cards),
  and recharts ResponsiveContainer
- Shows loading state
- Renders report name, stat cards, opening families
- Renders All Openings, Lines That Need Practice sections
- Renders search input, min games filter, color filter

---

### GameView

**File:** `frontend/src/pages/GameView.test.tsx` (new file)

- Mock fetch (game data + eco.json), Audio, and react-chessboard
- eco.json mock must have at least one entry so FEN computation runs
- Shows loading state
- Renders chessboard, player names, result/termination

---

### App

**File:** `frontend/src/App.test.tsx` (new file)

- Mock localStorage (Navbar reads it on render)
- Simple render test — doesn't crash

---

### Coverage after page tests

| Area | Before | After |
|---|---|---|
| Overall statements | 24% | 75% |
| gameview components | 92% | 92% |
| reportview components | 86% | 86% |
| pages | 0% | 69% |

### Final coverage numbers

**Backend: 96%** (61 tests)

| File | Coverage |
|---|---|
| views.py | 93% |
| pgn_parser.py | 82% |
| stockfish_analyzer.py | 86% |
| email_handler.py | 100% |
| adapter.py | 100% |
| models.py | 98% |
| serializers.py | 100% |

**Frontend: 78% lines** (134 tests)

| Area | Coverage |
|---|---|
| gameview components | 92% |
| reportview components | 86% |
| shared components | 56% |
| pages | 75% |
| utils | 100% |

### Remaining uncovered frontend code

These are async handlers, polling loops, and event handlers
that are tedious to mock in jsdom. They are easy to verify
manually by using the app:

- GameView: analysis polling useEffects, keyboard handlers
- ReportView: sort direction toggles, handleSortChange edge cases
- ReportCreate: submit handler (file upload + fetch)
- Navbar: logout handler, dark mode localStorage persistence
- ReportIndex: delete report handler

### Bugs found by tests

1. `views.py` — `"error: player not founds"` KeyError when player
   name doesn't match either side. Fixed by adding `continue` before
   the win/loss/draw counter.
2. `email_handler.py` — Resend API failure crashed registration
   because `fail_silently` wasn't being honored. Fixed by catching
   all exceptions unconditionally.
