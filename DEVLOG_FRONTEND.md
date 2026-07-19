# PGNLens — Frontend Dev Log

How the React frontend connects to the Django backend.

---

# ============================================
# CONNECTING REACT TO THE DJANGO API
# ============================================

---

## The Big Picture

```
React (frontend, :5173)  --HTTP-->  Django REST Framework (backend, :8002)
     fetch("/api/reports/")  --->  ReportViewSet returns JSON
```

The Django backend already exposes a REST API at `/api/` with four endpoints:

- `GET /api/games/` — list games
- `GET /api/reports/` — list reports
- `POST /api/reports/` — upload a PGN file
- `GET /api/moves/` — list moves

The React frontend calls those URLs with `fetch()`.

## How the Layers Connect

|      Layer          |      File     |     What it does               |
|---------------------|---------------|--------------------------------|
| **React component** | `src/ReportIndex.tsx` | Calls `fetch("/api/reports/")` |
| **Vite proxy** | `vite.config.ts` | Forwards `/api/*` to `localhost:8002` |
| **Django URL router** | `backend/urls.py` | Maps `/api/reports/` to `ReportViewSet` |
| **DRF ViewSet** | `views.py` | Queries the database, returns JSON |
| **DRF Serializer** | `serializers.py` | Converts Django model instances to JSON |
| **Django Model** | `models.py` | Defines the database tables |

The TypeScript `interface` you write on the frontend should mirror the fields
that the serializer sends back. Since our serializers use `fields = '__all__'`,
the interface should match the model's fields.

## Vite Proxy

React runs on port 5173 (Vite) and Django on port 8002. To avoid CORS issues
during development, Vite proxies API requests to Django. This is already
configured in `frontend/vite.config.ts`:

```ts
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8002',
    },
  },
})
```

Now when React code calls `fetch("/api/reports/")`, Vite forwards it to
Django automatically. The browser only sees `localhost:5173` — no cross-origin
issues.

---

# ============================================
# PROJECT STRUCTURE
# ============================================

---

## Set Up the File Layout

The frontend needs a place for shared types and a folder for page components.
From the `frontend/` directory:

```bash
cd frontend
mkdir src/pages
touch src/types.ts
touch src/pages/ReportsIndex.tsx
touch src/pages/ReportView.tsx
touch src/pages/ReportCreate.tsx
```

After this, your `src/` folder should look like:

```
src/
  main.tsx              — entry point (already exists, don't touch)
  App.tsx               — top-level layout and routing (already exists, will be rewritten)
  types.ts              — shared TypeScript interfaces (Report, Game, etc.)
  pages/
    ReportIndex.tsx      — list of all reports, link to create
    ReportCreate.tsx     — upload PGN file and create a new report
    ReportView.tsx       — single report detail page
```

- `types.ts` is where you define TypeScript interfaces that multiple
  files need. For example, both `ReportIndex.tsx` and `ReportView.tsx`
  need to know what a `Report` looks like, so the interface goes in
  `types.ts` and both pages import it from there.
- `pages/` holds one file per page. Each page is a React component
  that fetches its own data and renders it.
- `App.tsx` will be rewritten to set up routing (which URL shows which page).

Don't leave page files empty — they need at least a placeholder component
with a default export, or `App.tsx` won't compile. Minimum placeholder:

```tsx
// src/pages/ReportView.tsx
function ReportView() {
  return <h1>Report View</h1>
}

export default ReportView
```

```tsx
// src/pages/ReportIndex.tsx
function ReportIndex() {
  return <h1>Reports</h1>
}

export default ReportIndex
```

## Install react-router-dom

`react-router-dom` is a library that lets you have multiple pages in a
React app. Without it, React is a single page — there's no way to have
`/reports` show one thing and `/reports/3` show another.

```bash
cd frontend
npm install react-router-dom
```

## Set Up Routing in App.tsx

The current `App.tsx` is Vite's starter boilerplate — a counter demo, animated
logos, and links to Vite/React docs. None of it is PGNLens code, so you can
replace the entire file. You can also delete `App.css` (it only has styles for
the boilerplate) and remove the unused asset imports (`reactLogo`, `viteLogo`,
`heroImg`).

Replace the contents of `src/App.tsx` with:

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ReportIndex from './pages/ReportIndex'
import ReportCreate from './pages/ReportCreate'
import ReportView from './pages/ReportView'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/reports" element={<ReportIndex />} />
        <Route path="/reports/create" element={<ReportCreate />} />
        <Route path="/reports/:id" element={<ReportView />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
```

This tells React:

- When the URL is `/reports`, render the `ReportIndex` component
- When the URL is `/reports/create`, render the `ReportCreate` component
- When the URL is `/reports/3` (or any number), render the `ReportView` component
- `:id` is a URL parameter — `ReportView` can read it to know which report to fetch

The URLs map directly to the API:

```
/reports       → ReportIndex  (fetches GET /api/reports/)
/reports/3     → ReportView   (fetches GET /api/reports/3/)
/reports/create ...
```

## Two Routers, Two Jobs

The frontend and backend each have their own router, but they do
different things:

- **Django's router** (`backend/urls.py`) decides which Python code
  handles an API request. When something hits `/api/reports/`, Django's
  router sends it to `ReportViewSet`, which queries the database and
  returns JSON. Django's router handles **data**.

- **React's router** (`App.tsx`) decides which component to show in the
  browser. When you navigate to `/reports`, React's router renders
  `ReportIndex` on screen. No server is involved — it just swaps out
  what's visible on the page. React's router handles **what you see**.

They work together in sequence:

1. You visit `/reports` in the browser
2. React's router shows the `ReportIndex` component
3. `ReportIndex` calls `fetch("/api/reports/")`
4. Vite proxy forwards that to Django
5. Django's router sends it to `ReportViewSet`
6. JSON comes back, React displays it

---

# ============================================
# FETCHING DATA (GET)
# ============================================

---

## TypeScript Interfaces

Define a TypeScript type that matches what the Django serializer returns.
This gives you autocomplete and type checking — if you mistype a field name,
TypeScript catches it before you run the code.

This goes in `src/types.ts` so multiple pages can import it:
`import type { Report } from '../types'`

```tsx
export interface Report {
  id: number
  report_name: string
  player_name: string
  total_games: number
  wins: number
  losses: number
  draws: number
  win_rate: number
}
```

## Fetching with useEffect and useState

React has two hooks for this:

- `useState` — stores data in a variable that triggers a re-render when updated
- `useEffect` — runs a side effect (like a fetch) when the component mounts

This goes in `src/pages/ReportIndex.tsx` (not `App.tsx` — that only handles routing).
The upload form lives on its own page at `/reports/create`, so `ReportIndex`
just lists reports and links to the create page.

```tsx
// src/pages/ReportIndex.tsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { Report } from '../types'

function ReportIndex() {
  const [reports, setReports] = useState<Report[]>([])

  useEffect(() => {
    fetch('/api/reports/')           // hits Django via the Vite proxy
      .then(response => response.json())  // parse the JSON body
      .then(data => setReports(data))     // store it in state
  }, [])  // empty array = run once when the component first mounts

  return (
    <div>
      <h1>My Reports</h1>
      <Link to="/reports/create">Upload PGN File</Link>
      {reports.map(report => (
        <div key={report.id}>
          <h2>{report.report_name}</h2>
          <p>{report.wins}W / {report.losses}L / {report.draws}D</p>
        </div>
      ))}
    </div>
  )
}

export default ReportIndex
```

### How it works step by step

1. Component mounts — `useState` initializes `reports` as an empty array
2. `useEffect` fires — calls `fetch("/api/reports/")`
3. Vite proxy forwards the request to Django at `localhost:8002/api/reports/`
4. Django's `ReportViewSet` queries the database, serializes the results to JSON
5. The JSON comes back to the browser — `.then(data => setReports(data))` stores it
6. React re-renders with the new data — the `reports.map(...)` now has items

### The empty dependency array `[]`

The second argument to `useEffect` controls when it re-runs:

- `[]` — run once on mount (what we want for loading data)
- `[someVariable]` — re-run whenever `someVariable` changes
- no array — re-run on every render (almost never what you want)

---

# ============================================
# SENDING DATA (POST)
# ============================================

---

## Uploading a PGN File

The upload form lives on its own page at `src/pages/ReportCreate.tsx`.
The user navigates here from the "Upload PGN File" link on the reports index.

It matches what `ReportViewSet.create()` expects on the backend — it reads
`request.FILES['file']` and `request.data.get('player_name')`.

### Why FormData instead of JSON

The backend uses `MultiPartParser` (for file uploads). `FormData` is the
browser's built-in way to send files — it sets the `Content-Type` to
`multipart/form-data` automatically. Don't set the header manually or
the browser won't add the boundary string that the server needs.

### Wiring it into ReportCreate

The full `ReportCreate` component combines `uploadPGNFileAndCreateReport`
with the form. This is the complete `src/pages/ReportCreate.tsx` file:

```tsx
import { useState } from 'react'

async function uploadPGNFileAndCreateReport(file: File, playerName: string) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('player_name', playerName)

  const response = await fetch('/api/reports/', {
    method: 'POST',
    body: formData,
  })

  const result = await response.json()
  console.log('Created report:', result.report_id)
}

function ReportCreate() {
  const [file, setFile] = useState<File | null>(null)
  const [playerName, setPlayerName] = useState('')

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()    // stop the browser from reloading the page
    if (!file) return

    await uploadPGNFileAndCreateReport(file, playerName)
  }

  return (
    <div>
      <h1>Upload PGN File</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="file"
          accept=".pgn"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
        />
        <input
          type="text"
          placeholder="Player name"
          value={playerName}
          onChange={(event) => setPlayerName(event.target.value)}
        />
        <button type="submit">Upload and Create Report</button>
      </form>
    </div>
  )
}

export default ReportCreate
```

`event.preventDefault()` is needed because HTML forms default to submitting
via a full page reload. In React, we handle the submission ourselves with
`fetch()` so the page stays loaded.

---

# ============================================
# COMPONENT PLACEHOLDERS
# ============================================

---

Every page component needs at least a default export or the app won't compile.
Start with these placeholders and fill them in as you build each page.

```tsx
// src/pages/GamesIndex.tsx
function GamesIndex() {
  return <h1>Games</h1>
}

export default GamesIndex
```

```tsx
// src/pages/GameCreate.tsx
function GameCreate() {
  return <h1>Create Game</h1>
}

export default GameCreate
```

```tsx
// src/pages/GameView.tsx
function GameView() {
  return <h1>Game View</h1>
}

export default GameView
```

---

# ============================================
# LOADING A SAVED GAME
# ============================================

---

## How It Works

The Game model doesn't store a PGN string. Instead, each game has a list of
Move records with UCI notation (e.g. "e2e4", "e7e5"). To display a game:

1. Fetch the game data: `GET /api/games/600/`
2. Fetch the game's moves: `GET /api/moves/?game=600`
3. Use `chess.js` to replay the moves and get a FEN for each position
4. Pass the current FEN to `react-chessboard` to render the board
5. Add next/prev buttons to step through the move list

## Game TypeScript Interface

Add this to `src/types.ts` alongside the `Report` interface:

```tsx
export interface Game {
  id: number
  event: string
  site: string
  date: string
  round: number | null
  white_player: string
  black_player: string
  result: string
  white_elo: number | null
  black_elo: number | null
  time_control: string
  end_time: string | null
  termination: string
  eco_code: string
  first_moves: string
  opening_category: string
  fen_matches_array: string[]
  opening_line: string
  opening_family: string
}

export interface Move {
  id: number
  game: number
  move_number: number
  white_move: string
  black_move: string
  evaluation: number | null
  is_blunder: boolean
  is_mistake: boolean
  is_good_move: boolean
  is_brilliant_move: boolean
  is_excellent_move: boolean
  is_superb_move: boolean
  is_perfect_move: boolean
  is_terrible_move: boolean
  is_horrible_move: boolean
}
```

## GameView Component

This goes in `src/pages/GameView.tsx`. It fetches a game and its moves,
replays them with `chess.js`, and displays the board with `react-chessboard`.

```tsx
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import type { Game, Move } from '../types'

function GameView() {
  const { id } = useParams()                        // read :id from the URL
  const [game, setGame] = useState<Game | null>(null)
  const [moves, setMoves] = useState<Move[]>([])
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0)
  const [positions, setPositions] = useState<string[]>([])

  // fetch game and moves
  useEffect(() => {
    fetch(`/api/games/${id}/`)
      .then(response => response.json())
      .then(data => setGame(data))

    fetch(`/api/moves/?game=${id}`)
      .then(response => response.json())
      .then(data => setMoves(data))
  }, [id])

  // replay moves with chess.js to build a list of FEN positions
  useEffect(() => {
    if (moves.length === 0) return

    const chess = new Chess()
    const fenList = [chess.fen()]                    // starting position

    for (const move of moves) {
      for (const side of [move.white_move, move.black_move]) {
        if (side) {
          try {
            chess.move({
              from: side.slice(0, 2),
              to: side.slice(2, 4),
              promotion: side[4] || undefined,
            })
            fenList.push(chess.fen())
          } catch {
            console.warn(`Skipping invalid move: ${side}`)
          }
        }
      }
    }

    setPositions(fenList)
  }, [moves])

  // navigation
  const goToStart = () => setCurrentMoveIndex(0)
  const goBack = () => setCurrentMoveIndex(Math.max(0, currentMoveIndex - 1))
  const goForward = () => setCurrentMoveIndex(Math.min(positions.length - 1, currentMoveIndex + 1))
  const goToEnd = () => setCurrentMoveIndex(positions.length - 1)

  if (!game || positions.length === 0) return <p>Loading...</p>

  return (
    <div>
      <h1>{game.white_player} vs {game.black_player}</h1>
      <p>{game.opening_line} — {game.result}</p>

      <Chessboard position={positions[currentMoveIndex]} />

      <div>
        <button onClick={goToStart}>⟨⟨</button>
        <button onClick={goBack}>⟨</button>
        <button onClick={goForward}>⟩</button>
        <button onClick={goToEnd}>⟩⟩</button>
      </div>
    </div>
  )
}

export default GameView
```

### How the move replay works

`chess.js` maintains an internal board state. Each call to `chess.move()`
advances the position and returns the new state. We capture the FEN string
after each move to build an array of every position in the game:

```
positions[0]  = starting position
positions[1]  = after 1. e4
positions[2]  = after 1... e5
positions[3]  = after 2. Nf3
...
```

`currentMoveIndex` tracks which position to display. The navigation buttons
just change the index, and `react-chessboard` re-renders with the new FEN.

### Note on move format

The moves in the database are stored in UCI notation (e.g. "e2e4").
`chess.js` does NOT accept raw UCI strings — passing `"e2e4"` directly
to `chess.move()` throws `Invalid move`. Instead, split the UCI string
into `from`, `to`, and optional `promotion` fields:

```tsx
chess.move({
  from: side.slice(0, 2),       // "e2"
  to: side.slice(2, 4),         // "e4"
  promotion: side[4] || undefined,  // "q" for promotions like "e7e8q"
})
```

---

# ============================================
# CHESS UI LIBRARIES
# ============================================

---

## Chosen Stack: react-chessboard + chess.js

**react-chessboard** renders the board. Pass it a FEN string and it displays
the position. It handles drag-and-drop, move highlighting, arrow drawing,
and board orientation.

**chess.js** handles all the chess logic — legal move validation, FEN/PGN
parsing, check/checkmate detection. It has no UI — it just knows the rules.

They work together:
1. `chess.js` loads a PGN and gives you a list of positions (FEN strings)
2. `react-chessboard` displays each position on the board
3. You build the move history and navigation controls yourself

```bash
cd frontend
npm install react-chessboard chess.js
```

### Why this over @mdwebb/react-chess

We also considered `@mdwebb/react-chess`, which is built on chessground
(the Lichess board engine) and has PGN loading, move history, and board
navigation built in. We went with `react-chessboard` + `chess.js` because:

- Larger community, more examples, actively maintained
- Arrow drawing built in (not exposed in @mdwebb/react-chess)
- More flexibility — won't hit a wall when customizing
- PGN parsing already exists on the Django backend

---

# ============================================
# STYLING AND ICONS
# ============================================

---

## Tailwind CSS

Utility-first CSS framework. Instead of writing CSS files, you apply
classes directly in JSX:

```tsx
<button className="bg-blue-500 text-white p-4 rounded">Upload</button>
```

Tailwind is the most in-demand CSS framework for frontend roles right now.
React + TypeScript + Tailwind is the standard modern stack.

```bash
cd frontend
npm install -D tailwindcss @tailwindcss/vite
```

## react-icons

Gives you access to multiple icon sets (Font Awesome, Material, Heroicons,
etc.) in one package. Import only the icons you use:

```tsx
import { FaChess } from 'react-icons/fa'
import { MdUpload } from 'react-icons/md'

<FaChess />
<MdUpload />
```

```bash
cd frontend
npm install react-icons
```

### Chess Icons

All chess icons come from `react-icons/fa`:

```tsx
import {
  FaChess,          // general chess icon
  FaChessBoard,     // board icon
  FaChessKing,
  FaChessQueen,
  FaChessRook,
  FaChessBishop,
  FaChessKnight,
  FaChessPawn,
} from 'react-icons/fa'
```

These are single-color glyphs — good for UI elements **around** the board,
not for rendering the board itself (use `react-chessboard` for that).
Good uses for chess icons:

- Navigation menus — `FaChess` as a logo or section marker
- Move history lists — `FaChessKnight` next to "Nf3"
- Stats displays — `FaChessPawn` next to pawn structure info
- Buttons and labels — `FaChessBoard` next to "Start Analysis"

---

# ============================================
# SOUND
# ============================================

---

## Move Sound

Sound files are from Lichess (open source) and stored in
`frontend/public/sound/lichess/standard/`. Files in `public/` are served
at the root URL, so `/sound/lichess/standard/Move.mp3` works directly.

Available sounds:
- `Move.mp3` — piece moving
- `Capture.mp3` — piece capturing

Define `playMoveSound` inside the component (e.g. `GameView`), above the
return block. Then call it from the navigation button `onClick` handlers:

```tsx
function GameView() {
    // ... state declarations and useEffects ...

    function playMoveSound() {
        new Audio('/sound/lichess/standard/Move.mp3').play()
    }

    return (
        // ... JSX with buttons calling playMoveSound() ...
    )
}
```

Wire it to the navigation buttons:

```tsx
<button onClick={() => {
    setCurrentMoveIndex(Math.min(FENpositions.length - 1, currentMoveIndex + 1))
    playMoveSound()
}}>Next</button>

<button onClick={() => {
    setCurrentMoveIndex(Math.max(0, currentMoveIndex - 1))
    playMoveSound()
}}>Previous</button>
```

---

# ============================================
# CUSTOM PIECE SETS
# ============================================

---

## Lichess Piece Themes

All 42 Lichess piece sets are downloaded to `frontend/public/piece/`.
Each set has 12 SVG files (6 white, 6 black): `wK.svg`, `wQ.svg`,
`wR.svg`, `wB.svg`, `wN.svg`, `wP.svg`, `bK.svg`, `bQ.svg`, `bR.svg`,
`bB.svg`, `bN.svg`, `bP.svg`.

Available themes: alpha, anarcandy, caliente, california, cardinal,
cburnett, celtic, chess7, chessnut, companion, cooke, disguised,
dubrovny, fantasy, firi, fresca, gioco, governor, horsey, icpieces,
kiwen-suwi, kosal, leipzig, letter, maestro, merida, monarchy, mono,
mpchess, papercut, pirouetti, pixel, reillycraig, rhosgfx, riohacha,
shahi-ivory-brown, shapes, spatial, staunty, tatiana, totoy, xkcd.

## Using a Custom Piece Set

`react-chessboard` v5 accepts a `pieces` option — a record where each key
is a piece code (`"wK"`, `"bQ"`, etc.) and the value is a function
returning JSX. Build it from the SVG files:

This goes at the top of `src/pages/GameView.tsx`, outside the component
(since it doesn't depend on any state):

```tsx
const PIECE_CODES = ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP', 'bK', 'bQ', 'bR', 'bB', 'bN', 'bP']

function makePieceSet(theme: string, extension = 'svg') {
    const pieces: Record<string, () => React.JSX.Element> = {}
    for (const code of PIECE_CODES) {
        pieces[code] = () => (
            <img
                src={`/piece/${theme}/${code}.${extension}`}
                alt={code}
                style={{ width: '100%', height: '100%' }}
            />
        )
    }
    return pieces
}
```

Then pass it to the Chessboard:

```tsx
<Chessboard options={{
    position: FENpositions[currentMoveIndex],
    pieces: makePieceSet('california'),
}} />
```

Change `'california'` to any theme name to switch piece styles.

## Board Styling

Customize the board square colors with `darkSquareStyle` and `lightSquareStyle`
in the Chessboard options. In `src/pages/GameView.tsx`, in the return block:

```tsx
<Chessboard options={{
    position: FENpositions[currentMoveIndex],
    pieces: makePieceSet('pixel'),
    darkSquareStyle: { backgroundColor: '#888' },
    lightSquareStyle: { backgroundColor: '#ddd' },
}} />
```

For a pixelated look (sharp pixel art scaling), wrap the board in a div
with the Tailwind class `[image-rendering:pixelated]`:

```tsx
<div className="[image-rendering:pixelated]">
    <Chessboard options={{ ... }} />
</div>
```

---

# ============================================
# REMOVING THE MOVE MODEL
# ============================================

---

## Why

The Move model creates a separate database row for every move in every game.
With 600 games averaging 40 moves each, that's 24,000+ rows — and we never
query individual moves. The moves are only used to replay games on the
frontend. A JSON array on the Game model is simpler and faster.

## Step 1: Add moves field to Game model

**File:** `backend/game_analyzer/models.py`

Add a JSONField to the Game class:

```python
class Game(models.Model):
    # ... existing fields ...
    moves = models.JSONField(default=list, blank=True)
```

The moves array stores structured move data with analysis info:

```python
# Example of what game.moves will look like:
[
    {"move_number": 1, "white_move": "e2e4", "black_move": "e7e5", "white_eval": 0.3, "black_eval": 0.2, "white_classification": "", "black_classification": ""},
    {"move_number": 2, "white_move": "g1f3", "black_move": "d7d5", "white_eval": 0.4, "black_eval": -0.8, "white_classification": "", "black_classification": "blunder"},
]
```

Each move has:
- `move_number` — which move (1, 2, 3...)
- `white_move` / `black_move` — UCI notation
- `white_eval` / `black_eval` — Stockfish eval after the move (added later during analysis)
- `white_classification` / `black_classification` — "blunder", "brilliant", "", etc.

This gives you everything in one field:
- Replay the game by reading the move strings
- Show icons during replay by reading the classification
- Count blunders/brilliants for reports by filtering the array

## Step 2: Update the PGN parser

**File:** `backend/game_analyzer/pgn_parser.py`

Instead of creating Move objects, build a list of dicts and save it on the game:

```python
# Replace the move-saving loop with:
move_list = []
board = pgn_game.board()
move_number = 1
white_move = ""

for move in pgn_game.mainline_moves():
    if board.turn == chess.WHITE:
        white_move = str(move)
    else:
        black_move = str(move)
        move_list.append({
            "move_number": move_number,
            "white_move": white_move,
            "black_move": black_move,
            "white_eval": None,
            "black_eval": None,
            "white_classification": "",
            "black_classification": "",
        })
        move_number += 1
    board.push(move)

# If game ended on white's move (no black response)
if board.turn == chess.BLACK:
    move_list.append({
        "move_number": move_number,
        "white_move": white_move,
        "black_move": "",
        "white_eval": None,
        "black_eval": None,
        "white_classification": "",
        "black_classification": "",
    })

game.moves = move_list
```

Remove all `Move.objects.create(...)` calls.

## Step 3: Remove Move model and ALL references

When deleting a model, you must remove every import of it at the same time
or Django will crash with `ImportError`. Do all of these BEFORE running
migrations:

**File:** `backend/game_analyzer/models.py`
- Delete the entire `class Move(models.Model)` block.

**File:** `backend/game_analyzer/admin.py`
- Remove `Move` from the import line
- Remove `admin.site.register(Move)` if present

**File:** `backend/game_analyzer/serializers.py`
- Remove `Move` from the import line
- Delete `class MoveSerializer`

**File:** `backend/game_analyzer/views.py`
- Remove `Move` from the import line
- Delete `class MoveViewSet`

**File:** `backend/game_analyzer/pgn_parser.py`
- Remove `Move` from the import line
- Remove all `Move.objects.create(...)` calls

**File:** `backend/backend/urls.py`
- Remove `MoveViewSet` from the import line
- Remove `router.register(r'moves', MoveViewSet)`

Then run migrations:

```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```


## Step 6: Update the frontend types

**File:** `frontend/src/types.ts`

Remove the `Move` interface. Add a `GameMove` interface and `moves` to
the `Game` interface:

```tsx
export interface GameMove {
    move_number: number
    white_move: string
    black_move: string
    white_eval: number | null
    black_eval: number | null
    white_classification: string
    black_classification: string
}

export interface Game {
    // ... existing fields ...
    moves: GameMove[]
}
```

## Step 7: Simplify GameView

**File:** `frontend/src/pages/GameView.tsx`

Remove the second `fetch` call for moves. Read moves directly from the
game data:

```tsx
// Before: two separate fetches
fetch(`/api/games/${id}/`)
fetch(`/api/moves/?game=${id}`)

// After: one fetch, moves are on the game object
fetch(`/api/games/${id}/`)
    .then(response => response.json())
    .then(data => setGame(data))
```

Update the replay useEffect to read from `game.moves` instead of the
separate moves state:

```tsx
useEffect(() => {
    if (!game || game.moves.length === 0) return

    const chess = new Chess()
    const fenList = [chess.fen()]

    for (const move of game.moves) {
        for (const side of [move.white_move, move.black_move]) {
            if (side) {
                try {
                    chess.move({
                        from: side.slice(0, 2),
                        to: side.slice(2, 4),
                        promotion: side[4] || undefined,
                    })
                    fenList.push(chess.fen())
                } catch {
                    console.log(`Skipping invalid move: ${side}`)
                }
            }
        }
    }
    setFENPositions(fenList)
}, [game])
```

You can remove the `moves` state (`useState<Move[]>([])`) and the
second `fetch` call entirely.

To show classification icons during replay, use `currentMoveIndex` to
look up which move you're on and check its classification:

```tsx
// Figure out which move record and which side the current position is
const currentMoveRecord = game.moves[Math.floor(currentMoveIndex / 2)]
const isBlackTurn = currentMoveIndex % 2 === 0
const classification = isBlackTurn
    ? currentMoveRecord?.black_classification
    : currentMoveRecord?.white_classification
```

---

# ============================================
# REPORT INDEX PAGE
# ============================================

---

## What it shows

Each report in the list displays:
- Report name
- Total games
- Win rate
- Number of unique openings
- Date created
- Open icon (link to report detail)
- Trash icon (delete button)

## Updated Report interface

**File:** `frontend/src/types.ts`

```tsx
export interface Report {
    id: number
    report_name: string
    player_name: string
    total_games: number
    wins: number
    losses: number
    draws: number
    win_rate: number
    opening_family_count: number
    opening_line_count: number
    created_at: string
}
```

## ReportIndex component

**File:** `frontend/src/pages/ReportIndex.tsx`

```tsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FaTrash, FaFolderOpen } from 'react-icons/fa'
import type { Report } from '../types'

function ReportIndex() {
    const [reports, setReports] = useState<Report[]>([])

    useEffect(() => {
        fetch('/api/reports/')
            .then(response => response.json())
            .then(data => setReports(data))
    }, [])

    return (
        <div>
            <h1>Saved Reports</h1>
            <Link to="/reports/create">Upload PGN File</Link>

            {reports.map(report => (
                <div key={report.id}>
                    <h2>{report.report_name}</h2>
                    <p>Games: {report.total_games}</p>
                    <p>Win Rate: {report.win_rate}%</p>
                    <p>Unique Openings: {report.opening_family_count}</p>
                    <p>{report.created_at}</p>
                    <Link to={`/reports/${report.id}`}><FaFolderOpen /> Open</Link>
                    <button><FaTrash /> Delete</button>
                </div>
            ))}
        </div>
    )
}

export default ReportIndex
```

## Setting up Tailwind CSS

Tailwind classes won't work until you wire up the plugin and CSS import.

**Step 1 — File:** `frontend/vite.config.ts` — add the Tailwind plugin:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:8002',
    },
  },
})
```

**Step 2 — File:** `frontend/src/index.css` — create this file with one line:

```css
@import "tailwindcss";
```

**Step 3 — File:** `frontend/src/main.tsx` — import the CSS:

```tsx
import './index.css'
```

After this, all Tailwind classes (`border`, `rounded-lg`, `p-4`, `flex`, etc.)
will work in your JSX.

## Card styling with Tailwind

**File:** `frontend/src/pages/ReportIndex.tsx`

Each report card uses these Tailwind classes:

```tsx
{reports.map(report => (
    <div key={report.id} className="border rounded-lg p-4 shadow-sm mb-4">
        <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">{report.report_name}</h2>
            <button><FaTrash /></button>
        </div>
        <p>Games: {report.total_games} | Win Rate: {report.win_rate}% | Openings: {report.opening_family_count}</p>
        <hr className="my-2" />
        <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{report.created_at}</p>
            <Link to={`/reports/${report.id}`}><FaFolderOpen /> Open</Link>
        </div>
    </div>
))}
```

Key classes:
- `border rounded-lg p-4 shadow-sm mb-4` — card appearance with spacing between cards
- `flex justify-between items-center` — push items to opposite sides
- `text-lg font-bold` — report name stands out
- `text-sm text-gray-500` — date is de-emphasized
- `my-2` on `<hr>` — vertical margin around the divider line

## Delete handler (TODO)

The delete button needs an `onClick` that calls `DELETE /api/reports/${report.id}/`
and removes the report from local state so it disappears without a page refresh:

```tsx
async function deleteReport(reportId: number) {
    await fetch(`/api/reports/${reportId}/`, { method: 'DELETE' })
    setReports(reports.filter(report => report.id !== reportId))
}
```

Then on the button:
```tsx
<button onClick={() => deleteReport(report.id)}><FaTrash /> Delete</button>
```

---

# ============================================
# REFERENCE LINKS
# ============================================

---

## React

- **useState** — https://react.dev/reference/react/useState
- **useEffect** — https://react.dev/reference/react/useEffect
- **Thinking in React** (how components, state, and data flow work) — https://react.dev/learn/thinking-in-react
- **Synchronizing with Effects** (when and why to use useEffect) — https://react.dev/learn/synchronizing-with-effects

## React Router

- **Link component** (client-side navigation without page reload) — https://reactrouter.com/en/main/components/link
- **Route component** (maps a URL path to a component) — https://reactrouter.com/en/main/route/route
- **useParams** (read URL parameters like `:id`) — https://reactrouter.com/en/main/hooks/use-params
- **useNavigate** (programmatic navigation, e.g. redirect after form submit) — https://reactrouter.com/en/main/hooks/use-navigate

## TypeScript

- **TypeScript for React developers** — https://react.dev/learn/typescript
- **TypeScript handbook** — https://www.typescriptlang.org/docs/handbook/intro.html
- **import type** (type-only imports required by verbatimModuleSyntax) — https://www.typescriptlang.org/docs/handbook/modules/reference.html#type-only-imports-and-exports

## Vite

- **Vite dev server proxy** — https://vite.dev/config/server-options.html#server-proxy

## Fetch API

- **Using the Fetch API** (MDN) — https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
- **FormData** (MDN) — https://developer.mozilla.org/en-US/docs/Web/API/FormData
- **Using FormData with fetch** (MDN) — https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest_API/Using_FormData_Objects

## Django REST Framework

- **ViewSets** — https://www.django-rest-framework.org/api-guide/viewsets/
- **Serializers** — https://www.django-rest-framework.org/api-guide/serializers/
- **Routers** (how URLs are auto-generated) — https://www.django-rest-framework.org/api-guide/routers/
- **Parsers** (MultiPartParser for file uploads) — https://www.django-rest-framework.org/api-guide/parsers/
