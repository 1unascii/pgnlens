import pytest
from django.contrib.auth.models import User
from game_analyzer.models import Game, Report


@pytest.fixture
def sample_user():
    return User.objects.create_user(username="testuser", password="testpass")


@pytest.fixture
def sample_game():
    return Game.objects.create(
        event="Test",
        site="chess.com",
        date="2026-07-11",
        white_player="Alice",
        black_player="Bob",
        result="1-0",
        time_control="10+0",
        termination="Resignation",
        eco_code="A00",
        fen_matches_array=["King's Pawn Game", "Sicilian Defense", "Sicilian Defense: Najdorf Variation"],
        opening_line="Sicilian Defense: Najdorf Variation",
        opening_family="Sicilian Defense",
    )


@pytest.mark.django_db
def test_game_str(sample_game):
    assert str(sample_game) == "Alice vs Bob on 2026-07-11"


@pytest.mark.django_db
def test_report_str(sample_user):
    report = Report.objects.create(
        report_name="Test Report",
        user=sample_user,
    )
    assert str(report) == "Test Report"
