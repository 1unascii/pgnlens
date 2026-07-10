from django.shortcuts import render
from rest_framework import viewsets
from .models import Game, Move, Report
from .serializers import GameSerializer, MoveSerializer, ReportSerializer
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser  # Handles file uploads
from rest_framework.response import Response
from .pgn_parser import parse_pgn

# Create your views here.

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

@api_view(['POST'])  # Only accepts POST requests
@parser_classes([MultiPartParser])  # Tells DRF to expect a file upload
def upload_pgn(request):
    file = request.FILES['file']  # Get the uploaded file from the request
    games = parse_pgn(file)  # Parse and save all games to the database
    return Response({'games_created': len(games)})  # Return how many games were created
