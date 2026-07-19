# PGNLens — Bug Fixes

---

## vite.config.ts — Stray characters

**File:** `frontend/vite.config.ts`

**Error:**
```
ReferenceError: op is not defined
```

**Problem:** Stray `op` text at the end of the file.

**Fix:** Remove the stray `op` on line 13. (Fixed.)

---

## App.tsx — Missing closing brace

**File:** `frontend/src/App.tsx`

**Error:**
```
Expected `}` but found `EOF`
```

**Problem:** The `App` function is missing its closing `}` before `export default App`.

**Fix:** Add the closing brace after the `return` block:

```tsx
    </div>
  )
}

export default App
```

---

## App.tsx — Missing Report import

**File:** `frontend/src/App.tsx`

**Problem:** `Report` type is used in `useState<Report[]>([])` but never imported.

**Fix:** Add the import at the top:

```tsx
import type { Report } from './types'
```

---

## Report import requires type-only syntax

**File:** Any file importing `Report` (e.g. `frontend/src/pages/ReportIndex.tsx`)

**Error (VS Code):**
```
'Report' is a type and must be imported using a type-only import when 'verbatimModuleSyntax' is enabled.
```

**Error (browser console):**
```
Uncaught SyntaxError: The requested module '/src/types.ts' does not provide an export named 'Report'
```

**Problem:** TypeScript's `verbatimModuleSyntax` is enabled, which requires type-only imports for interfaces/types. This causes a blank page with no visible error — check the browser console (F12) to see it.

**Fix:** Use `import type` instead of `import` in every file that imports `Report`:

```tsx
// in src/pages/ReportIndex.tsx
import type { Report } from '../types'

// in src/App.tsx
import type { Report } from './types'
```

---

## App.tsx — Route path mismatch

**File:** `frontend/src/App.tsx`

**Error (browser console):**
```
No routes matched location "/reports"
```

**Problem:** The route for `ReportIndex` was set to `path="/"` but the URL being
visited was `/reports`. No route matched, so the page was blank.

**Fix:** Change the route path to `/reports`:

```tsx
<Route path="/reports" element={<ReportIndex />} />
```

---

## main.tsx — Missing index.css

**File:** `frontend/src/main.tsx`

**Error (browser console):**
```
GET http://localhost:5173/src/index.css net::ERR_ABORTED 404 (Not Found)
```

**Problem:** `main.tsx` imports `./index.css` but the file was deleted with the
rest of the Vite boilerplate.

**Fix:** Remove the import from `main.tsx`:

```tsx
// delete this line:
import './index.css'
```

---

## GameView — Iterating over property names instead of values

**File:** `frontend/src/pages/GameView.tsx`

**Error:**
```
'move' is declared but its value is never read.
```

**Problem:** The inner loop iterates over the literal strings `'white_move'` and
`'black_move'` instead of accessing those properties on the `move` object.

**Wrong:**
```tsx
for (const side of ['white_move', 'black_move']) {
```

**Fix:** Use the actual property values from the move object:
```tsx
for (const side of [move.white_move, move.black_move]) {
```

---

## GameView — Wrong moves API URL

**File:** `frontend/src/pages/GameView.tsx`

**Error (browser console):**
```
GET http://localhost:5173/api/games/600/moves 404 (Not Found)
```

**Problem:** The fetch URL `/api/games/600/moves` doesn't exist. Moves are a
separate resource at `/api/moves/`, filtered by a query parameter.

**Wrong:**
```tsx
fetch(`/api/games/${id}/moves`)
```

**Fix:**
```tsx
fetch(`/api/moves/?game=${id}`)
```

---

## GameView — chess.js rejects raw UCI strings

**File:** `frontend/src/pages/GameView.tsx`

**Error (browser console):**
```
Uncaught Error: Invalid move: g2f1
```

**Problem:** `chess.js` does not accept raw UCI strings like `"e2e4"` passed to
`chess.move()`. It needs either SAN notation (`"e4"`) or an object with
`from` and `to` fields.

**Wrong:**
```tsx
chess.move(side)
```

**Fix:** Split the UCI string into from/to/promotion:
```tsx
chess.move({
    from: side.slice(0, 2),
    to: side.slice(2, 4),
    promotion: side[4] || undefined,
})
```

---

## GameView — Extra closing brace in chess.move()

**File:** `frontend/src/pages/GameView.tsx`

**Error:**
```
Expected `,` or `)` but found `}`
```

**Problem:** Extra `}` on the closing line — `}})` instead of `})`.

**Wrong:**
```tsx
chess.move({
    from: side.slice(0, 2),
    to: side.slice(2, 4),
    promotion: side[4] || undefined,
}})
```

**Fix:** Remove the extra `}`:
```tsx
chess.move({
    from: side.slice(0, 2),
    to: side.slice(2, 4),
    promotion: side[4] || undefined,
})
```

---

## MoveViewSet — No game filtering

**File:** `backend/game_analyzer/views.py`

**Error (browser console):**
```
Uncaught Error: Invalid move: g2f1
```

**Problem:** `GET /api/moves/?game=600` returns ALL moves from every game, not
just game 600. The `?game=` filter was never implemented (the comment in
`views.py` says "add later"). chess.js crashes because it's replaying moves
from unrelated games on the same board.

**Fix:** Override `get_queryset` in `MoveViewSet` to filter by game and
order by move number:

```python
class MoveViewSet(viewsets.ModelViewSet):
    queryset = Move.objects.all().order_by('move_number')
    serializer_class = MoveSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        game_id = self.request.query_params.get('game')
        if game_id:
            queryset = queryset.filter(game_id=game_id)
        return queryset
```

---

## PGN parser — Duplicate last move

**File:** `backend/game_analyzer/pgn_parser.py`

**Error (browser console):**
```
Uncaught Error: Invalid move: {"from":"a3","to":"a2"}
```

**Problem:** The PGN parser creates a duplicate Move record at the end of a game.
For example, game 600 has move 47 (white: `a3a2`, black: `e4d4`) and move 48
(white: `a3a2`, black: `""`). Move 48 is a duplicate of move 47's white move.
chess.js crashes because the king already moved from a3 to a2.

**Workaround:** Wrap `chess.move()` in a try/catch so invalid moves are skipped
instead of crashing the page:

```tsx
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
```

**Root cause:** In `pgn_parser.py` line 81, the check for an unpaired white
move is wrong:

```python
# If the game ended on white's move (no black response)
if white_move is not None:
```

`white_move` is a string — it's never `None`. It starts as `""` and gets set
to a move string on white's turn. So this block **always** runs, creating a
duplicate Move record even when the game ended on black's turn.

**Fix:** Check whose turn it is after the loop. If it's black's turn, that
means the last move was white's and hasn't been saved yet:

```python
if board.turn == chess.BLACK:
    Move.objects.create(
        game=game,
        move_number=move_number,
        white_move=white_move,
        black_move="",
    )
```

---

## Removing Move model — ImportError in multiple files

**Files that need `Move` removed from imports:**

When deleting the `class Move` from `models.py`, every file that imports it
will crash with `ImportError: cannot import name 'Move'`. All of these need
to be cleaned up at the same time:

- `backend/game_analyzer/admin.py` — remove `Move` from import, remove `admin.site.register(Move)`
- `backend/game_analyzer/views.py` — remove `Move` from import, delete `MoveViewSet`
- `backend/game_analyzer/serializers.py` — remove `Move` from import, delete `MoveSerializer`
- `backend/game_analyzer/pgn_parser.py` — remove `Move` from import, remove all `Move.objects.create(...)` calls
- `backend/backend/urls.py` — remove `MoveViewSet` from import, remove `router.register(r'moves', MoveViewSet)`

**Lesson:** When removing a model, grep for all imports of it first and
clean them all up before running migrations.
