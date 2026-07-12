from rest_framework import viewsets
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from collections import defaultdict
from .models import Game, Move, Report, ReportGame
from .serializers import GameSerializer, MoveSerializer, ReportSerializer, PGNUploadSerializer
from .pgn_parser import parse_pgn, detect_player_name


# ModelViewSet gives you full CRUD at /api/games/ automatically:
# GET /api/games/       — list all games
# POST /api/games/      — create a game
# GET /api/games/1/     — get one game
# PUT /api/games/1/     — update a game
# DELETE /api/games/1/  — delete a game
class GameViewSet(viewsets.ModelViewSet):
    queryset = Game.objects.all()
    serializer_class = GameSerializer

# GET /api/moves/       — list all moves
# GET /api/moves/?game=1 — filter moves by game (add later)
# GET /api/moves/1/     — get one move
class MoveViewSet(viewsets.ModelViewSet):
    queryset = Move.objects.all()
    serializer_class = MoveSerializer

# GET /api/reports/      — list all reports
# GET /api/reports/1/    — get one report
# POST /api/reports/     — upload a PGN file to create a report (the only way to create one)
# DELETE /api/reports/1/  — delete a report
class ReportViewSet(viewsets.ModelViewSet):
    queryset = Report.objects.all()
    serializer_class = ReportSerializer
    parser_classes = [MultiPartParser]  # Django REST Framework (DRF) file upload parser (not related to pgn_parser)

    # When CREATEING A REPORT, use the PGN Upload Serializer!!!
    def get_serializer_class(self):
        # Use PGNUploadSerializer for POST (file upload), ReportSerializer for everything else.
        if self.action == 'create':
            return PGNUploadSerializer
        return ReportSerializer

    def create(self, request):
        # Override create to handle PGN file upload instead of normal JSON create.
        file = request.FILES['file']
        player_name = request.data.get('player_name', '').strip()
        games = parse_pgn(file)

        # If no player_name provided, detect from the games
        if not player_name:
            player_name = detect_player_name(games)

        # Use provided report name, or fall back to the uploaded filename
        report_name = request.data.get('report_name', '').strip() or file.name
        report = Report.objects.create(
            report_name=report_name,
            user=request.user,
            player_name=player_name,
        )

        opening_family_stats = defaultdict(lambda: ({"wins": 0, "losses": 0, "draws": 0, "total": 0}))
        opening_line_stats = defaultdict(lambda: {"wins": 0, "losses": 0, "draws": 0, "total": 0})
        wins = 0
        losses = 0
        draws = 0

        for game in games:
            if game.white_player == player_name:
                if game.result == "1-0":
                    outcome = "win"
                    wins += 1
                elif game.result == "0-1":
                    outcome = "loss"
                    losses += 1
                elif game.result == "1/2-1/2":
                    outcome = "draw"
                    draws += 1
            elif game.black_player == player_name:
                if game.result == "0-1":
                    outcome = "win"
                    wins += 1
                elif game.result == "1-0":
                    outcome = "loss"
                    losses += 1
                elif game.result == "1/2-1/2":
                    outcome = "draw"
                    draws += 1
            else:
                outcome = "draw" ## Edge case 
                draws += 1

            # Link game to report with its outcome
            ReportGame.objects.create(report=report, game=game, outcome=outcome)

            # Count per-opening results
            family = game.opening_family or "Unknown"
            line = game.opening_line or "Unknown"

            # Convert outcome to the dict key: "win"->"wins", "loss"->"losses", "draw"->"draws"
            outcome_key = "losses" if outcome == "loss" else outcome + "s"

            opening_family_stats[family]["total"] += 1
            opening_family_stats[family][outcome_key] += 1

            opening_line_stats[line]["total"] += 1
            opening_line_stats[line][outcome_key] += 1

        # Calculate win rates
        total_games = len(games)

        for stats in opening_family_stats.values():
            stats["win_rate"] = round(stats["wins"] / stats["total"] * 100, 1) if stats["total"] > 0 else 0.0

        for stats in opening_line_stats.values():
            stats["win_rate"] = round(stats["wins"] / stats["total"] * 100, 1) if stats["total"] > 0 else 0.0

        # Save summary stats to the report
        report.total_games = total_games
        report.wins = wins
        report.losses = losses
        report.draws = draws
        report.win_rate = round(wins / total_games * 100, 1) if total_games > 0 else 0.0
        report.opening_family_count = len(opening_family_stats)
        report.opening_line_count = len(opening_line_stats)
        report.opening_family_stats = dict(opening_family_stats)
        report.opening_line_stats = dict(opening_line_stats)
        report.save()

        return Response({
            'report_id': report.id,
            'games_created': len(games),
            'player_name': player_name,
        })