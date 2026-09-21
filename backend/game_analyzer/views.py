from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from collections import defaultdict
from django.conf import settings
import requests
from .models import Game, Report, ReportGame, LiveGame
from .serializers import GameSerializer, GameCardSerializer, ReportSerializer, PGNUploadSerializer
from .pgn_parser import parse_pgn
from .stockfish_analyzer import analyze_all_moves
from django.db import transaction
from django.contrib.auth.models import User
from allauth.account.models import EmailConfirmation, EmailAddress



# ModelViewSet gives you full CRUD at /api/games/ automatically:
# GET /api/games/       — list all games
# POST /api/games/      — create a game
# GET /api/games/1/     — get one game
# PUT /api/games/1/     — update a game
# DELETE /api/games/1/  — delete a game
class GameViewSet(viewsets.ReadOnlyModelViewSet):
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

def _get_outcome(game, player_name):
    if game.white_player == player_name:
        return "win" if game.result == "1-0" else "loss" if game.result == "0-1" else "draw"
    elif game.black_player == player_name:
        return "win" if game.result == "0-1" else "loss" if game.result == "1-0" else "draw"
    return None

def _add_win_rates(stats_dict):
    for stats in stats_dict.values():
        stats["win_rate"] = round(stats["wins"] / stats["total"] * 100, 1) if stats["total"] > 0 else 0.0

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
        outcome = _get_outcome(game, player_name)
        if not outcome:
            continue

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

    _add_win_rates(opening_category_stats)
    _add_win_rates(opening_family_stats)
    _add_win_rates(opening_line_stats)

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
    permission_classes = [IsAuthenticated]
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
        # Wrapped in a transaction so if validation fails, all games are rolled back
        # automatically — no orphan games left in the database.

        file = request.FILES['file']
        player_name = request.data.get('player_name', '').strip()

        try:
            with transaction.atomic():
                games = parse_pgn(file)

                if not player_name:
                    raise ValueError('Player name is required.')

                player_in_all_games = all(
                    game.white_player == player_name
                    or game.black_player == player_name
                    for game in games
                )

                if not player_in_all_games:
                    raise ValueError(f'Invalid player name: "{player_name}".')
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

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
            outcome = _get_outcome(game, player_name) or "error: player not found"
            if game.white_player == player_name:
                white_games.append(game)
            elif game.black_player == player_name:
                black_games.append(game)

            ReportGame.objects.create(report=report, game=game, outcome=outcome)

        report.all_games_stats = build_stats_by_player_color(games, player_name)
        report.player_is_white_stats = build_stats_by_player_color(white_games, player_name)
        report.player_is_black_stats = build_stats_by_player_color(black_games, player_name)
        report.save()

        for game in games:
            game.report = report
            game.save()

        return Response({
            'report_id': report.id,
            'games_created': len(games),
            'player_name': player_name,
        })

@api_view(['POST'])
@permission_classes([AllowAny])
def verify_email(request):
    """Verify an email address using the confirmation key."""

    key = request.data.get('key')
    if not key:
        return Response({'detail': 'Key is required.'}, status=status.HTTP_400_BAD_REQUEST)

    confirmation = EmailConfirmation.objects.filter(key=key).first()
    if not confirmation:
        return Response({'detail': 'Invalid or expired key.'}, status=status.HTTP_404_NOT_FOUND)

    if confirmation.sent and confirmation.key_expired():
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

    if nodes:
        # Node-limited deep pass — background thread, frontend polls for results
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
        # Depth-limited pass — synchronous
        analyze_all_moves(game, depth=int(depth or 8))
        return Response({ 'game_id': game.id, 'moves': game.moves })

# LIVE GAME VIEWS
@api_view(['POST'])
def create_live_game(request):
    """Create a new live game. Returns the game ID for sharing."""
    time_control = request.data.get('time_control', 600)
    time_mode = request.data.get('time_mode', 'total')
    game = LiveGame.objects.create(
        white_player=request.user,
        time_control=time_control,
        time_mode=time_mode,
    )
    return Response({
        'game_id': str(game.id),
        'join_url': f'/play/{game.id}',
    })


@api_view(['GET'])
def live_game_state(request, game_id):
    """Get the current state of a live game."""
    try:
        game = LiveGame.objects.get(id=game_id)
    except LiveGame.DoesNotExist:
        return Response({'detail': 'Game not found.'}, status=404)
    return Response({
        'game_id': str(game.id),
        'fen': game.fen,
        'moves': game.moves,
        'status': game.status,
        'result': game.result,
        'white': game.white_player.username,
        'black': game.black_player.username if game.black_player else None,
        'time_control': game.time_control,
    })

@api_view(['POST'])
@permission_classes([AllowAny])
def resend_verification_for_username(request):
    """Look up a user by username or email, resend verification email,
    and return a masked version of their email address."""

    username = request.data.get('username')
    email = request.data.get('email')
    if not username and not email:
        return Response(
            {'detail': 'Username or email is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        if username:
            user = User.objects.get(username=username)
        else:
            user = User.objects.get(email=email)
    except User.DoesNotExist:
        # Don't reveal whether the user exists
        return Response({'detail': 'ok', 'masked_email': ''})

    email_obj = EmailAddress.objects.filter(
        user=user, verified=False
    ).first()
    if email_obj:
        # Create a fresh confirmation key and send it.
        # send_confirmation() may skip sending if an unexpired
        # key already exists, so we create a new one explicitly.
        confirmation = EmailConfirmation.create(email_obj)
        confirmation.save()
        confirmation.send(request)

    # Mask the email: j****e@gmail.com
    email = user.email
    local, domain = email.split('@')
    if len(local) <= 2:
        masked_local = local[0] + '*' * (len(local) - 1)
    else:
        masked_local = (
            local[0]
            + '*' * (len(local) - 2)
            + local[-1]
        )
    masked_email = f'{masked_local}@{domain}'

    return Response({
        'detail': 'ok',
        'masked_email': masked_email,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def lichess_explorer(request):
    """Proxy requests to the Lichess Opening Explorer API.
    The browser sends an Origin header that Lichess rejects for
    unknown domains. This endpoint forwards the request from the
    server (no Origin header) and returns the result."""
    fen = request.query_params.get('fen', '')
    ratings = request.query_params.get('ratings', '1600,1800,2000')
    speeds = request.query_params.get('speeds', 'blitz,rapid')

    response = requests.get(
        'https://explorer.lichess.ovh/lichess',
        params={'fen': fen, 'ratings': ratings, 'speeds': speeds},
        headers={'Authorization': f'Bearer {settings.LICHESS_TOKEN}'} if hasattr(settings, 'LICHESS_TOKEN') and settings.LICHESS_TOKEN else {},
    )

    if not response.ok:
        # Lichess returned an error (rate limit, block, etc.)
        # Return empty data so the frontend falls back to Stockfish
        print(f"Lichess explorer returned {response.status_code}: {response.text[:200]}")
        return Response({'moves': [], 'opening': None})

    return Response(response.json())