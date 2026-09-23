# PGN Lens

A chess analysis and practice tool. Upload PGN files to analyze your opening repertoire, practice openings against book moves and Stockfish, review games with move-by-move evaluation, and play live games against friends.

Live site: https://pgnlens.com

## Stack

**Backend:** Django, Django REST Framework, PostgreSQL, python-chess, Stockfish, Django Channels, Daphne, Redis

**Frontend:** React 19, TypeScript, Vite, Tailwind CSS, react-chessboard, chess.js, Stockfish WASM, Recharts

## Prerequisites

- Python 3.12+
- Node.js 18+
- PostgreSQL
- Redis
- Stockfish (installed or on PATH)
- WSL required on Windows (Daphne and Redis don't run natively)

## Setup

### 1. Clone and create .env

```bash
git clone https://github.com/1unascii/pgnlens.git
cd pgnlens
```

Create a `.env` file in the project root:

```
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/pgnlens
STOCKFISH_PATH=stockfish
RESEND_API_KEY=your-resend-key
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
EMAIL_HOST_USER=resend
LICHESS_TOKEN=your-lichess-token
```

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
```

### 3. Frontend

```bash
cd frontend
npm install
```

### 4. Run

Start Redis and PostgreSQL, then in separate terminals:

```bash
# Backend (WSL on Windows)
cd backend
source venv/bin/activate
daphne -b 0.0.0.0 -p 8002 backend.asgi:application

# Frontend
cd frontend
npm run dev
```

Or use the start scripts:

```bash
./backend/start-server.sh
./frontend/start-server.sh
```

Open http://localhost:5173

## Scripts

| Script | Description |
|--------|-------------|
| `backend/start-server.sh` | Start the backend (daphne) |
| `frontend/start-server.sh` | Start the frontend (vite) |
| `run-tests.sh` | Run backend and frontend tests |
| `deploy.sh` | Deploy to production (pull, build, migrate, restart, smoke test) |

## API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| GET | /api/games/ | List games |
| GET | /api/games/?report=ID | Games for a report |
| GET | /api/games/ID/ | Game detail with moves |
| GET | /api/reports/ | List reports (auth required) |
| POST | /api/reports/ | Upload PGN + create report |
| DELETE | /api/reports/ID/ | Delete a report |
| GET | /api/games/ID/analyze/ | Run Stockfish analysis |
| GET | /api/lichess-explorer/ | Lichess opening book proxy |
| POST | /api/auth/login/ | Login |
| POST | /api/auth/registration/ | Register |
| POST | /api/auth/verify-email/ | Verify email |
| POST | /api/auth/resend-verification/ | Resend verification email |
| POST | /api/live-games/ | Create a live game |
| GET | /api/live-games/ID/ | Live game state |
