# PGNLens — Dev Log

How I built this app, step by step.

## Prerequisites

- Python 3.14+ (python.org/downloads, check "Add to PATH" during install)
- Node.js 18+ (nodejs.org)
- PostgreSQL 17+ (postgresql.org/download/windows)
- pipenv (`pip install pipenv`)

## PostgreSQL Setup

1. Download and install from postgresql.org/download/windows
2. During install:
   - Keep the default port 5432
   - Set a password for the postgres user
   - Keep pgAdmin checked
   - Skip the Stack Builder at the end (uncheck or close it)
3. Open pgAdmin and create a database called `pgnlens`

## Backend (Django)

```bash
mkdir pgnlens
cd pgnlens
pip install pipenv
pipenv shell
pipenv install django
django-admin startproject backend
cd backend
python manage.py startapp game_analyzer
```

Django runs at http://localhost:8002

### Environment Variables

This project uses `django-environ` to keep secrets out of the repo.

```bash
pipenv install django-environ psycopg2-binary
```

Create a `.env` file in the project root (`pgnlens/`):

```bash
touch .env
```

```
DEBUG=True
SECRET_KEY=your-secret-key-here
DATABASE_URL=postgres://postgres:YOUR_PASSWORD@127.0.0.1:5432/pgnlens
```

In `backend/backend/settings.py`, load the env file:

```python
import environ
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env()
environ.Env.read_env(BASE_DIR.parent / '.env')

DEBUG = env.bool('DEBUG', default=True)
SECRET_KEY = env('SECRET_KEY')

DATABASES = {
    'default': env.db(),
}
```

### Register the App

Add `'game_analyzer'` to `INSTALLED_APPS` in `backend/settings.py`.

### Create Models

Define the Game model in `game_analyzer/models.py`:

```python
from django.db import models

class Game(models.Model):
    event = models.CharField(max_length=50)
    site = models.CharField(max_length=50)
    date = models.DateField()
    round = models.IntegerField(null=True, blank=True)  # null if round is unknown (PGN uses "-" or "?")
    white_player = models.CharField(max_length=50)
    black_player = models.CharField(max_length=50)
    result = models.CharField(max_length=10)
    white_elo = models.IntegerField()
    black_elo = models.IntegerField()
    time_control = models.CharField(max_length=25)
    end_time = models.TimeField(null=True, blank=True)  # PGN only provides time, not date
    termination = models.CharField(max_length=50)

    def __str__(self):
        return f"{self.white_player} vs {self.black_player} on {self.date}"

class Move(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='moves')
    move_number = models.IntegerField()          # Which move (1, 2, 3...)
    white_move = models.CharField(max_length=10) # White's move in UCI notation (e.g. "e2e4")
    black_move = models.CharField(max_length=10, blank=True)  # Black's move (blank if game ended on white's move)
    evaluation = models.FloatField(null=True)    # Stockfish score (added later during analysis)
    is_blunder = models.BooleanField(default=False)  # Flagged during analysis

    def __str__(self):
        return f"Game {self.game.id} - Move {self.move_number}"
```

Then run (from the `backend/` directory):

```bash
python manage.py makemigrations game_analyzer
python manage.py migrate
```

### Register Model in Admin

This lets you view, create, edit, and delete Game records
from the Django admin panel (http://localhost:8002/admin).

Update `game_analyzer/admin.py`:

```python
from django.contrib import admin
from .models import Game

# Customize how Games appear in the admin list view
class GameAdmin(admin.ModelAdmin):
    list_display = ('white_player', 'black_player', 'date', 'result')

# Register the Game model so it shows up in admin
admin.site.register(Game, GameAdmin)
```

### Create Superuser

```bash
python manage.py createsuperuser
```

Now you can access the admin panel at http://localhost:8002/admin

### Set Up the API

**Django REST Framework (DRF)** turns Django into an API server.
Without it, Django only serves HTML pages. With DRF, Django sends
and receives JSON, which is how the React frontend communicates
with the backend.

**CORS (Cross-Origin Resource Sharing)** is a browser security
rule that blocks requests between different URLs. React on
`localhost:5173` and Django on `localhost:8002` are different
origins, so the browser blocks the requests by default.
`django-cors-headers` tells Django to allow requests from
the React dev server.

```bash
pipenv install djangorestframework django-cors-headers
```

Add to `INSTALLED_APPS` in `backend/settings.py`:

```python
INSTALLED_APPS = [
    # ... existing apps ...
    'corsheaders',
    'rest_framework',
    'game_analyzer',
]
```

Add to `MIDDLEWARE`:

```python
MIDDLEWARE = [
    # ... existing middleware ...
    'corsheaders.middleware.CorsMiddleware',
]
```

Add CORS whitelist to the bottom of `backend/settings.py`:

```python
CORS_ORIGIN_WHITELIST = [
    'http://localhost:5173',
]

CSRF_TRUSTED_ORIGINS = [
    'http://localhost:5173',
]
```

### Create Serializers

```bash
touch game_analyzer/serializers.py
```

Add to `game_analyzer/serializers.py`:

```python
from rest_framework import serializers
from .models import Game, Move

class GameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Game
        fields = '__all__'

class MoveSerializer(serializers.ModelSerializer):
    class Meta:
        model = Move
        fields = '__all__'
```

### Create Views

Views are the backend logic that handles API requests (not frontend UI).
A ViewSet automatically provides list, create, read, update, and delete
endpoints for a model — no need to write each one manually.

Add a viewset to `game_analyzer/views.py`:

```python
from rest_framework import viewsets
from .models import Game, Move
from .serializers import GameSerializer, MoveSerializer

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
```

### Set Up URLs

Update `backend/urls.py`:

```python
from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from game_analyzer.views import GameViewSet, MoveViewSet

router = routers.DefaultRouter()
router.register(r'games', GameViewSet)   # /api/games/
router.register(r'moves', MoveViewSet)   # /api/moves/

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
]
```

Now you can browse the API at http://localhost:8002/api/ and manage games at http://localhost:8002/api/games/ and moves at http://localhost:8002/api/moves/

## PGN Parser

The parser reads a PGN file and saves each game directly to the database.
It validates the data (required fields, correct types) and skips bad games
rather than crashing or saving garbage.

### Create the parser

```bash
touch game_analyzer/pgn_parser.py
```

### Install python-chess

`python-chess` is a library that handles PGN parsing, move validation,
board state tracking, and engine analysis (Stockfish). 

```bash
pipenv install python-chess
```



Add to `game_analyzer/pgn_parser.py`:

```python
import chess.pgn  # PGN parsing from python-chess library
import io          # TextIOWrapper converts binary file to text mode
from .models import Game, Move

def parse_pgn(pgn_file):
    """
    Parse a PGN file and save each game and its moves to the database.
    Accepts a file-like object (e.g. from request.FILES).
    Returns a list of created Game objects.
    """
    games = []
    # Django's uploaded file is in binary mode, but chess.pgn needs text mode
    pgn_io = io.TextIOWrapper(pgn_file, encoding='utf-8')

    # A PGN file can contain multiple games — loop until there are none left
    while True:
        pgn_game = chess.pgn.read_game(pgn_io)
        if pgn_game is None:
            break  # No more games in the file

        # Headers are the metadata between square brackets in PGN
        headers = pgn_game.headers

        # Save the game record to the database
        game = Game.objects.create(
            event=headers.get("Event", ""),
            site=headers.get("Site", ""),
            date=headers.get("Date", "").replace(".", "-"),  # PGN uses dots (2026.05.01), Django needs dashes (2026-05-01)
            round=int(headers.get("Round", "0")) if headers.get("Round", "-").isdigit() else None,  # Store unknown rounds as null
            white_player=headers.get("White", ""),
            black_player=headers.get("Black", ""),
            result=headers.get("Result", ""),
            white_elo=int(headers.get("WhiteElo", 0)),
            black_elo=int(headers.get("BlackElo", 0)),
            time_control=headers.get("TimeControl", ""),
            end_time=headers.get("EndTime", "").split(" ")[0] or None,  # Strip timezone, keep just the time (e.g. "12:34:12")
            termination=headers.get("Termination", ""),
        )

        # Save each move as a separate record linked to this game
        board = pgn_game.board()
        move_number = 1
        white_move = None

        for move in pgn_game.mainline_moves():
            if board.turn == chess.WHITE:
                # White's turn — store the move and wait for black's response
                white_move = str(move)
            else:
                # Black's turn — save the pair as one Move record
                Move.objects.create(
                    game=game,
                    move_number=move_number,
                    white_move=white_move,
                    black_move=str(move),
                )
                move_number += 1
                white_move = None

            board.push(move)

        # If the game ended on white's move (no black response)
        if white_move is not None:
            Move.objects.create(
                game=game,
                move_number=move_number,
                white_move=white_move,
                black_move="",
            )

        games.append(game)

    return games
```

### Create the upload endpoint

Add to `game_analyzer/views.py`:

```python
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser  # Handles file uploads
from rest_framework.response import Response
from .pgn_parser import parse_pgn

@api_view(['POST'])  # Only accepts POST requests
@parser_classes([MultiPartParser])  # Tells DRF to expect a file upload
def upload_pgn(request):
    file = request.FILES['file']  # Get the uploaded file from the request
    games = parse_pgn(file)  # Parse and save all games to the database
    return Response({'games_created': len(games)})  # Return how many games were created
```

### Add the upload URL

Update `backend/urls.py`:

```python
from game_analyzer.views import GameViewSet, upload_pgn

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/upload_pgn/', upload_pgn),
]
```

### Test the upload

Two ways to test:

1. **Browser**: Run the server and go to http://localhost:8002/api/upload_pgn/
   DRF shows a file upload form — pick your PGN file and hit POST.

2. **Command line**: curl sends a file directly to the endpoint.
   `-X POST` means it's a POST request, `-F` attaches a file.

```bash
curl -X POST -F "file=@pgn/chess_com_games_2026-07-03.pgn" http://localhost:8002/api/upload_pgn/
```

If it works, you'll get back `{"games_created": N}` where N is the
number of games parsed from the file.

## Frontend (React + TypeScript)

The todo app in the tutorial I followed used `create-react-app` (CRA), but it's outdated and no longer
maintained. Vite is the modern replacement — it's faster, simpler, and actively
supported. It runs the dev server on port 5173 instead of CRA's port 3000.

From the project root (not inside `backend/`):

```bash
npm create vite@latest frontend -- --template react-ts
```

## More about React Later. For now I am going to focus on backend logic
---

# ============================================
# DEVELOPMENT TOOLS
# ============================================

---

### Linting

Vite's `react-ts` template includes ESLint out of the box. ESLint is the
standard linter for JavaScript/TypeScript — like a spell-checker for code.
It catches things like unused variables, missing hook dependencies, bad imports,
and unreachable code. Your editor (Cursor) shows these warnings inline as you
type, but you can also check everything at once with:

To run the linter:

```bash
cd frontend
npm run lint
```

### Dev Server

The dev server launches automatically after creation.
To relaunch in a new terminal:

```bash
cd frontend
npm run dev
```

React runs at http://localhost:5173

### Frontend Production Build

```bash
cd frontend
npm run build
```

## Vite Proxy

API requests from the frontend are proxied to Django.
Configure in `frontend/vite.config.ts`:

```ts
server: {
    proxy: {
        '/api': 'http://localhost:8002',
    },
},
```

## Running Both Servers

Terminal 1 — Django backend (development):

```bash
cd pgnlens/backend
pipenv shell
python manage.py runserver 8002
```

Terminal 1 — Django backend (production):

```bash
cd pgnlens/backend
pipenv shell
python serve.py
```

Terminal 2 — React frontend (development):

```bash
cd pgnlens/frontend
npm run dev
```

Terminal 2 — React frontend (production):

```bash
cd pgnlens/frontend
npm run build
```

## Production Server (Waitress)

```bash
pipenv install waitress
python serve.py
```

---

# ============================================
# JULY 9, 2026 — Report Model
# ============================================

---

## Report Model

A report is a saved grouping of games created by a user. All stats
(win rate, opening performance, lines to practice) are computed from
the games — the report itself just holds the grouping. Games and
reports have a many-to-many relationship so a game can belong to
multiple reports in the future.

### Add the Report model

Add this class to `game_analyzer/models.py` below the existing models:

```python
from django.contrib.auth.models import User

class Report(models.Model):
    name = models.CharField(max_length=100)  # e.g. the uploaded filename
    created_at = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reports')
    games = models.ManyToManyField(Game, related_name='reports', blank=True)

    def __str__(self):
        return self.name
```

`auto_now_add=True` sets `created_at` to the current time when the
report is created. `CASCADE` means if a user is deleted, their reports
are deleted too. `blank=True` on the ManyToManyField allows creating
a report before any games are added to it.

Django automatically creates a junction table (`game_analyzer_report_games`)
for the ManyToManyField — no need to define it manually. You interact
with it through the relationship:

```python
report.games.add(game)       # link a game to a report
report.games.all()           # get all games in a report
game.reports.all()           # get all reports a game belongs to
```

### Add the serializer

Update `game_analyzer/serializers.py` — add the import and serializer:

```python
from .models import Game, Move, Report

class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = '__all__'
```

### Add the viewset

Update the imports in `game_analyzer/views.py`:

```python
from .models import Game, Move, Report
from .serializers import GameSerializer, MoveSerializer, ReportSerializer
```

Add a viewset for reports:

```python
class ReportViewSet(viewsets.ModelViewSet):
    queryset = Report.objects.all()
    serializer_class = ReportSerializer
```

### Register the URL

Update `backend/urls.py` — add `ReportViewSet` to the import:

```python
from game_analyzer.views import GameViewSet, upload_pgn, MoveViewSet, ReportViewSet
```

Register the route with the router:

```python
router.register(r'reports', ReportViewSet)  # /api/reports/
```

### Run migrations

```bash
python manage.py makemigrations game_analyzer
python manage.py migrate
```

Now you can browse reports at http://localhost:8002/api/reports/

---

# ============================================
# ECO OPENING DATABASE (LOCAL LOOKUP TABLE)
# ============================================

---

## ECO Data — What It Is

ECO (Encyclopaedia of Chess Openings) is a standard classification system
that assigns a code (A00–E99) to every known chess opening. Each code
covers a family of related variations — for example, A00 includes the
Amar Opening, Amar Gambit, and Amsterdam Attack.

We need this data so the parser can look up what opening was played in
each uploaded game by matching the move sequence.

## Why No Django Model

The ECO data is a fixed reference table — it doesn't change, users don't
edit it, and it doesn't need relationships to other models. Storing it
in the database would mean writing a model, serializer, migration, and
seed script for data that never changes. Instead, we download the JSON
files once and load them directly in Python when needed.

## Where the Data Comes From

The ECO data comes from the `JeffML/eco.json` repo on GitHub:
https://github.com/JeffML/eco.json

The data is split across five JSON files by letter:

- `ecoA.json` — codes A00–A99
- `ecoB.json` — codes B00–B99
- `ecoC.json` — codes C00–C99
- `ecoD.json` — codes D00–D99
- `ecoE.json` — codes E00–E99

Each file is a dictionary keyed by FEN position (board state). Each
value contains:

```json
{
    "src": "eco_tsv",
    "eco": "A00",
    "moves": "1. Nh3 d5 2. g3 e5 3. f4 Bxh3 4. Bxh3 exf4",
    "name": "Amar Gambit"
}
```

The key for that entry is the FEN after those moves:
`rn1qkbnr/ppp2ppp/8/3p4/5p2/6PB/PPPPP2P/RNBQK2R w KQkq - 0 5`

```
    a   b   c   d   e   f   g   h
  +---+---+---+---+---+---+---+---+
8 | r | n |   | q | k | b | n | r |  FEN: rn1qkbnr
  +---+---+---+---+---+---+---+---+
7 | p | p | p |   |   | p | p | p |  FEN: ppp2ppp
  +---+---+---+---+---+---+---+---+
6 |   |   |   |   |   |   |   |   |  FEN: 8
  +---+---+---+---+---+---+---+---+
5 |   |   |   | p |   |   |   |   |  FEN: 3p4
  +---+---+---+---+---+---+---+---+
4 |   |   |   |   |   | p |   |   |  FEN: 5p2
  +---+---+---+---+---+---+---+---+
3 |   |   |   |   |   |   | P | B |  FEN: 6PB
  +---+---+---+---+---+---+---+---+
2 | P | P | P | P | P |   |   | P |  FEN: PPPPP2P
  +---+---+---+---+---+---+---+---+
1 | R | N | B | Q | K |   |   | R |  FEN: RNBQK2R
  +---+---+---+---+---+---+---+---+

  Lowercase = black pieces, Uppercase = white pieces
  Numbers in FEN = consecutive empty squares
  "w KQkq - 0 5" = white to move, all castling available, move 5
```

- `eco` — the ECO code
- `name` — the opening name (including variation)
- `moves` — the move sequence that defines this variation
- `src` — which source file the entry was compiled from (e.g. `eco_tsv`).
  This is metadata about how the repo author built the dataset — we only
  care about the eco code, name, and moves, so we can ignore this field.

Multiple entries can share the same ECO code — each one is a different
variation within that opening family.

## Download the ECO Files

From the `backend/` directory:

```bash
mkdir eco
curl -o eco/ecoA.json "https://raw.githubusercontent.com/JeffML/eco.json/master/ecoA.json"
curl -o eco/ecoB.json "https://raw.githubusercontent.com/JeffML/eco.json/master/ecoB.json"
curl -o eco/ecoC.json "https://raw.githubusercontent.com/JeffML/eco.json/master/ecoC.json"
curl -o eco/ecoD.json "https://raw.githubusercontent.com/JeffML/eco.json/master/ecoD.json"
curl -o eco/ecoE.json "https://raw.githubusercontent.com/JeffML/eco.json/master/ecoE.json"
```

These files are saved locally in `backend/eco/` and loaded by the parser at
runtime. No network requests needed after this.

### Test the ECO Data

Open the Django shell (`python manage.py shell`) and try loading a file:

```python
import json

with open("eco/ecoA.json") as f:
    data = json.load(f)

len(data)  # number of entries in ecoA
```

The dictionary is keyed by FEN position (a string that describes the
board state). Each value contains the ECO code, opening name, and moves:

```python
first_key = list(data.keys())[0]
data[first_key]
# {'src': 'eco_tsv', 'eco': 'A00', 'moves': '1. Nh3 d5 2. g3 ...', 'name': 'Amar Gambit'}
```

Browse a few entries:

```python
for key in list(data.keys())[:5]:
    d = data[key]
    print(d['eco'], d['name'])
```

## Add Opening Fields to the Game Model

Add three new fields to the `Game` model in `game_analyzer/models.py`:

```python
eco_code = models.CharField(max_length=10, blank=True)           # ECO code, e.g. "B90"
opening_line = models.CharField(max_length=200, blank=True)      # e.g. "Sicilian Defense: Najdorf Variation"
opening_family = models.CharField(max_length=200, blank=True)    # e.g. "Sicilian Defense"
first_fen_match = models.CharField(max_length=200, blank=True)   # Broadest ECO match, e.g. "King's Pawn Game"
```

Then run migrations:

```bash
python manage.py makemigrations game_analyzer
python manage.py migrate
```

## Add ECO Lookup to the PGN Parser

The ECO JSON files are keyed by FEN (board position string). The parser
already replays every move with `board.push(move)`, so `board.fen()`
gives the current position at each step. We check each position against
the ECO data — the last match is the most specific opening for that game.

For example, a game that opens 1. e4 e5 goes through these positions:

```
  Starting position                After 1. e4                    After 1... e5
  board.fen() =                    board.fen() =                   board.fen() =
  "rnbqkbnr/pppppppp/8/8/          "rnbqkbnr/pppppppp/8/8/         "rnbqkbnr/pppp1ppp/8/4p3/
  8/8/PPPPPPPP/RNBQKBNR            4P3/8/PPPP1PPP/RNBQKBNR         4P3/8/PPPP1PPP/RNBQKBNR
  w KQkq - 0 1"                    b KQkq - 0 1"                   w KQkq - 0 2"

    a b c d e f g h               a b c d e f g h                a b c d e f g h
  +---+---+---+---+---+         +---+---+---+---+---+          +---+---+---+---+---+
8 | r n b q k b n r |         8 | r n b q k b n r |          8 | r n b q k b n r |
7 | p p p p p p p p |         7 | p p p p p p p p |          7 | p p p p . p p p |
6 | . . . . . . . . |         6 | . . . . . . . . |          6 | . . . . . . . . |
5 | . . . . . . . . |         5 | . . . . . . . . |          5 | . . . . p . . . |
4 | . . . . . . . . |         4 | . . . . P . . . |          4 | . . . . P . . . |
3 | . . . . . . . . |         3 | . . . . . . . . |          3 | . . . . . . . . |
2 | P P P P P P P P |         2 | P P P P . P P P |          2 | P P P P . P P P |
1 | R N B Q K B N R |         1 | R N B Q K B N R |          1 | R N B Q K B N R |
  +---+---+---+---+---+         +---+---+---+---+---+          +---+---+---+---+---+
  No ECO match                   No ECO match                   ECO match! C20
                                                                "King's Pawn Game"
```

Each `board.fen()` is checked against the ECO lookup dictionary. The
lookup keeps updating as long as matches are found — so if move 6
matches a more specific variation, that replaces the earlier match.

The opening family is derived from the opening line by splitting on `":"`.
For example, `"Sicilian Defense: Najdorf Variation"` splits to family
`"Sicilian Defense"`. If there's no colon, the full name is the family.

We tried using the first ECO match as the family, but it was too generic —
any game starting with 1. e4 e5 would get "King's Pawn Game" as the family
regardless of whether it became an Italian, Spanish, or Scotch game.

Update `game_analyzer/pgn_parser.py`:

### 1. Load all ECO files into one dictionary (at module level, outside the function)

```python
import json
import os

# Load all ECO JSON files into one lookup dictionary keyed by FEN
eco_directory = os.path.join(os.path.dirname(__file__), '..', 'eco')
eco_lookup = {}
for letter in 'ABCDE':
    filepath = os.path.join(eco_directory, f'eco{letter}.json')
    with open(filepath) as f:
        eco_lookup.update(json.load(f))
```

Loading at module level means the files are read once when Django starts,
not on every upload.

### 2. Inside `parse_pgn`, before the move loop, initialize tracking variables

```python
eco_code = None
opening_line = None
opening_family = None
first_fen_match = None
```

### 3. Inside the move loop, after `board.push(move)`, check for a match

```python
fen = board.fen()
if fen in eco_lookup:
    if first_fen_match is None:
        first_fen_match = eco_lookup[fen]['name']
    eco_code = eco_lookup[fen]['eco']
    opening_line = eco_lookup[fen]['name']
    opening_family = opening_line.split(':')[0]
```

### 4. After the move loop (and the leftover white-move block), save the opening to the game

```python
game.eco_code = eco_code or ""
game.opening_line = opening_line or ""
game.opening_family = opening_family or ""
game.first_fen_match = first_fen_match or ""
game.save()
```

`game.save()` is needed because the game was already created with
`Game.objects.create()` earlier — without it, the opening fields
are set on the Python object but never written to the database.

### Test the opening lookup

Upload a PGN file and check the results:

```bash
curl -X POST -F "file=@pgn/chess_com_games_2026-07-03.pgn" http://localhost:8002/api/upload_pgn/
```

Then browse http://localhost:8002/api/games/ — each game should now show
`eco_code`, `opening_line`, `opening_family`, and `first_fen_match` fields.