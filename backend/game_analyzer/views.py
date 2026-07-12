from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from .models import Game, Move, Report
from .serializers import GameSerializer, MoveSerializer, ReportSerializer, PGNUploadSerializer
from .pgn_parser import parse_pgn


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

class ReportViewSet(viewsets.ModelViewSet):
    queryset = Report.objects.all()
    serializer_class = ReportSerializer

class UploadPGNView(APIView):
    parser_classes = [MultiPartParser]
    serializer_class = PGNUploadSerializer

    def post(self, request):
        file = request.FILES['file']
        games = parse_pgn(file)
        report = Report.objects.create(
            name=file.name,
            user=request.user,
        )
        report.games.add(*games)
        return Response({'report_id': report.id, 'games_created': len(games)})

    def get_serializer(self):
        return PGNUploadSerializer()