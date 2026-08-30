from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from collections import defaultdict
from .models import Game, Report, ReportGame
from .serializers import GameSerializer, GameCardSerializer, ReportSerializer, PGNUploadSerializer
from .pgn_parser import parse_pgn, detect_player_name
from .stockfish_analyzer import analyze_all_moves
from django.views.decorators.csrf import csrf_exempt


# ModelViewSet gives you full CRUD at /api/games/ automatically:
# GET /api/games/       — list all games
# POST /api/games/      — create a game
# GET /api/games/1/     — get one game
# PUT /api/games/1/     — update a game
# DELETE /api/games/1/  — delete a game
class GameViewSet(viewsets.ModelViewSet):
    queryset = Game.objects.all()

    def get_serializer_class(self):
        """Use GameCardSerializer when filtering by report (card display),
        GameSerializer for individual game detail (move replay)."""
        if self.request.query_params.get('report'):
            return GameCardSerializer
        return GameSerializer

    def get_queryset(self):
        report_id = self.request.query_params.get('report')
        if report_id:
            return Game.objects.filter(reports__id=report_id)
        return Game.objects.all()

def build_stats_by_player_color(games, player_name):
    """Compute all report stats from a list of games."""
    opening_category_stats = defaultdict(lambda: {"wins": 0, "losses": 0, "draws": 0, "total": 0})
    opening_family_stats = defaultdict(lambda: {"wins": 0, "losses": 0, "draws": 0, "total": 0})
    opening_line_stats = defaultdict(lambda: {"wins": 0, "losses": 0, "draws": 0, "total": 0})
    wins = 0
    losses = 0
    draws = 0
    family_to_lines = defaultdict(set)

    for game in games:
        if game.white_player == player_name:
            outcome = "win" if game.result == "1-0" else "loss" if game.result == "0-1" else "draw"
        elif game.black_player == player_name:
            outcome = "win" if game.result == "0-1" else "loss" if game.result == "1-0" else "draw"
        else:
            outcome = "error: player not found"

        if outcome == "win":
            wins += 1
        elif outcome == "loss":
            losses += 1
        else:
            draws += 1

        category = game.opening_category or "Unknown"
        family = game.opening_family or "Unknown"
        line = game.opening_line or "Unknown"
        outcome_key = "losses" if outcome == "loss" else outcome + "s"

        opening_category_stats[category]["total"] += 1
        opening_category_stats[category][outcome_key] += 1
        opening_family_stats[family]["total"] += 1
        opening_family_stats[family][outcome_key] += 1
        opening_line_stats[line]["total"] += 1
        opening_line_stats[line][outcome_key] += 1
        family_to_lines[family].add(line)

    total_games = len(games)

    for stats in opening_category_stats.values():
        stats["win_rate"] = round(stats["wins"] / stats["total"] * 100, 1) if stats["total"] > 0 else 0.0
    for stats in opening_family_stats.values():
        stats["win_rate"] = round(stats["wins"] / stats["total"] * 100, 1) if stats["total"] > 0 else 0.0
    for stats in opening_line_stats.values():
        stats["win_rate"] = round(stats["wins"] / stats["total"] * 100, 1) if stats["total"] > 0 else 0.0

    return {
        "total_games": total_games,
        "wins": wins,
        "losses": losses,
        "draws": draws,
        "win_rate": round(wins / total_games * 100, 1) if total_games > 0 else 0.0,
        "opening_category_count": len(opening_category_stats),
        "opening_family_count": len(opening_family_stats),
        "opening_line_count": len(opening_line_stats),
        "opening_category_stats": dict(opening_category_stats),
        "opening_family_stats": dict(opening_family_stats),
        "opening_line_stats": dict(opening_line_stats),
        "family_to_lines": {family: list(lines) for family, lines in family_to_lines.items()},
    }

# GET /api/reports/      — list all reports
# GET /api/reports/1/    — get one report
# POST /api/reports/     — upload a PGN file to create a report (the only way to create one)
# DELETE /api/reports/1/  — delete a report
class ReportViewSet(viewsets.ModelViewSet):
    queryset = Report.objects.all()
    serializer_class = ReportSerializer
    parser_classes = [MultiPartParser]  # Django REST Framework (DRF) file upload parser (not related to pgn_parser)

    def get_queryset(self):
        return Report.objects.filter(user=self.request.user)

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
        #if not player_name:
            #player_name = detect_player_name(games)

        # If no player_name provided, return an error and don't create the report. I wanted to 
        # originally allow the player name to be detected from the games, but decided against it.
        if not player_name:
            return Response({'detail': 'Player name is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Prevent the user from mis typing their player name and creating a junk report.
        player_in_all_games = all(
            game.white_player == player_name
            or game.black_player == player_name
            for game in games
        )

        if not player_in_all_games:
            return Response(
                {'detail': f'Invalid player name: "{player_name}".'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # If the player name is found in the games, create the report.
        # Use provided report name, or fall back to the uploaded filename
        report_name = request.data.get('report_name', '').strip() or file.name
        report = Report.objects.create(
            report_name=report_name,
            user=request.user,
            player_name=player_name,
        )

        white_games = []
        black_games = []

        for game in games:
            if game.white_player == player_name:
                outcome = "win" if game.result == "1-0" else "loss" if game.result == "0-1" else "draw"
                white_games.append(game)
            elif game.black_player == player_name:
                outcome = "win" if game.result == "0-1" else "loss" if game.result == "1-0" else "draw"
                black_games.append(game)
            else:
                outcome = "error: player not found"

            ReportGame.objects.create(report=report, game=game, outcome=outcome)

        report.all_games_stats = build_stats_by_player_color(games, player_name)
        report.player_is_white_stats = build_stats_by_player_color(white_games, player_name)
        report.player_is_black_stats = build_stats_by_player_color(black_games, player_name)
        report.save()

        return Response({
            'report_id': report.id,
            'games_created': len(games),
            'player_name': player_name,
        })

@api_view(['POST'])
@permission_classes([AllowAny])
def verify_email(request):
    """Verify an email address using the confirmation key."""
    from allauth.account.models import get_emailconfirmation_model

    key = request.data.get('key')
    if not key:
        return Response({'detail': 'Key is required.'}, status=status.HTTP_400_BAD_REQUEST)

    model = get_emailconfirmation_model()
    confirmation = model.from_key(key)
    if not confirmation:
        return Response({'detail': 'Invalid or expired key.'}, status=status.HTTP_404_NOT_FOUND)

    confirmation.confirm(request)
    return Response({'detail': 'Email verified successfully.'}, status=status.HTTP_200_OK)

import threading

@api_view(['GET'])
@permission_classes([AllowAny])
def analyze_game(request, game_id):
    """Analyze all moves in a game at the requested depth.
    Depths <= 15 run synchronously (fast, frontend waits for results).
    Depth > 15 runs in a background thread (slow, frontend polls for results)."""
    try:
        game = Game.objects.get(id=game_id)
    except Game.DoesNotExist:
        return Response({'detail': 'Game not found.'}, status=status.HTTP_404_NOT_FOUND)

    depth = request.query_params.get('depth')
    nodes = request.query_params.get('nodes')

    if depth and nodes:
        # Combined pass — run depth then nodes sequentially in background
        def run_combined_analysis(game_id, depth, nodes):
            from django.db import connection
            connection.close()
            game = Game.objects.get(id=game_id)
            analyze_all_moves(game, depth=int(depth))
            game.refresh_from_db()
            analyze_all_moves(game, nodes=int(nodes), final_pass=True)

        thread = threading.Thread(target=run_combined_analysis, args=(game_id, int(depth), int(nodes)))
        thread.daemon = True
        thread.start()
        return Response({ 'game_id': game.id, 'moves': game.moves })
    elif nodes:
        # Node-limited deep pass — background thread so polls can pick up partial results
        def run_node_analysis(game_id, nodes):
            from django.db import connection
            connection.close()
            game = Game.objects.get(id=game_id)
            analyze_all_moves(game, nodes=int(nodes), final_pass=True)

        thread = threading.Thread(target=run_node_analysis, args=(game_id, int(nodes)))
        thread.daemon = True
        thread.start()
        return Response({ 'game_id': game.id, 'moves': game.moves })
    else:
        # Depth-limited pass — synchronous (fast enough to wait)
        analyze_all_moves(game, depth=int(depth or 8))
        return Response({ 'game_id': game.id, 'moves': game.moves })