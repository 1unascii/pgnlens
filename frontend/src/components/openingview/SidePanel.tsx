import { FaChessKing, FaChessQueen, FaChessRook, FaChessBishop, FaChessKnight, FaChessPawn } from 'react-icons/fa'

// FontAwesome chess piece icons for the book moves list
const PIECE_ICON_MAP: Record<string, Record<string, React.ReactNode>> = {
    white: {
        K: <FaChessKing className="inline text-white" />,
        Q: <FaChessQueen className="inline text-white" />,
        R: <FaChessRook className="inline text-white" />,
        B: <FaChessBishop className="inline text-white" />,
        N: <FaChessKnight className="inline text-white" />,
        P: <FaChessPawn className="inline text-white" />,
    },
    black: {
        K: <FaChessKing className="inline text-black" />,
        Q: <FaChessQueen className="inline text-black" />,
        R: <FaChessRook className="inline text-black" />,
        B: <FaChessBishop className="inline text-black" />,
        N: <FaChessKnight className="inline text-black" />,
        P: <FaChessPawn className="inline text-black" />,
    },
}

// Map Stockfish depth (1-20) to approximate ELO rating for the slider display
const ELO_LABELS: Record<number, number> = {
    1: 400, 2: 600, 3: 800, 4: 1000, 5: 1100, 6: 1200,
    7: 1400, 8: 1500, 9: 1600, 10: 1800, 11: 1900, 12: 2000,
    13: 2200, 14: 2300, 15: 2400, 16: 2500, 17: 2600, 18: 2700,
    19: 2800, 20: 2900,
}

// Get the right piece icon for a move (looks at first letter of SAN notation)
function getPieceIconForMove(san: string, isWhiteTurn: boolean): React.ReactNode {
    const color = isWhiteTurn ? 'white' : 'black'
    const firstChar = san[0]
    if (PIECE_ICON_MAP[color][firstChar]) {
        return PIECE_ICON_MAP[color][firstChar]
    }
    return PIECE_ICON_MAP[color]['P']
}

export interface BookMove {
    uci: string
    san: string
    white: number
    draws: number
    black: number
    averageRating: number
}

interface SidePanelProps {
    currentOpeningName: string
    isBookExhausted: boolean
    playerColor: 'white' | 'black'
    isWhiteTurn: boolean
    engineDepth: number
    setEngineDepth: (depth: number) => void
    bookMoves: BookMove[]
    moveList: string[]
    onToggleColor: () => void
    onPlayBookMove: (uci: string) => void
    onUndoLastMove: () => void
    onResetBoard: () => void
    hoveredMove: string | null
    setHoveredMove: (uci: string | null) => void
}

// Side panel for the opening practice view — shows book moves, move history, and controls
function SidePanel({
    currentOpeningName, isBookExhausted, playerColor, isWhiteTurn,
    engineDepth, setEngineDepth, bookMoves, moveList,
    onToggleColor, onPlayBookMove, onUndoLastMove, onResetBoard,
    hoveredMove, setHoveredMove,
}: SidePanelProps) {
    return (
        <div className="flex-shrink-0 flex flex-col gap-2" style={{ width: 250 }}>
            <p className="font-bold">{currentOpeningName || 'Starting Position'}</p>
            <p className="text-sm text-gray-400">
                {isBookExhausted ? 'Engine' : 'Book'}
            </p>

            <button
                onClick={onToggleColor}
                className="border rounded p-2 text-sm"
            >
                Playing as: {playerColor === 'white' ? 'White' : 'Black'}
            </button>

            {isBookExhausted && (
                <div className="text-sm">
                    <label>Computer ELO: {ELO_LABELS[engineDepth] || engineDepth}</label>
                    <input
                        type="range" min={1} max={20}
                        value={engineDepth}
                        onChange={(e) => setEngineDepth(Number(e.target.value))}
                        className="w-full"
                    />
                </div>
            )}

            {/* Book moves list */}
            <div className="border rounded p-2">
                {bookMoves.length > 0 ? (
                    bookMoves.map(move => {
                        const total = move.white + move.draws + move.black
                        const whitePercent = Math.round(move.white / total * 100)
                        const drawPercent = Math.round(move.draws / total * 100)
                        const blackPercent = Math.round(move.black / total * 100)
                        return (
                            <div
                                key={move.uci}
                                onClick={() => onPlayBookMove(move.uci)}
                                onMouseEnter={() => setHoveredMove(move.uci)}
                                onMouseLeave={() => setHoveredMove(null)}
                                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded"
                            >
                                <span className="font-bold inline-flex items-center gap-1">
                                    {getPieceIconForMove(move.san, isWhiteTurn)}
                                    {move.san}
                                </span>
                                <span className="text-sm ml-2">
                                    {whitePercent}% / {drawPercent}% / {blackPercent}%
                                </span>
                                <span className="text-gray-400 text-xs ml-2">
                                    {total} games
                                </span>
                            </div>
                        )
                    })
                ) : (
                    <p className="text-sm text-gray-400">
                        {isBookExhausted ? 'Book exhausted — using engine' : 'Loading...'}
                    </p>
                )}
            </div>

            {/* Move history */}
            <div className="border rounded p-2 text-sm min-h-[60px]">
                {moveList.length === 0 ? (
                    <p className="text-gray-400">No moves yet</p>
                ) : (
                    moveList.map((move, i) => (
                        <span key={i}>
                            {i % 2 === 0 && (
                                <span className="text-gray-400">
                                    {Math.floor(i / 2) + 1}.{' '}
                                </span>
                            )}
                            {move}{' '}
                        </span>
                    ))
                )}
            </div>

            {/* Undo and reset buttons */}
            <div className="flex gap-2">
                <button
                    onClick={onUndoLastMove}
                    disabled={moveList.length === 0}
                    className="border rounded p-2 flex-1
                               disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    ← Back
                </button>
                <button
                    onClick={onResetBoard}
                    className="bg-red-500 text-white rounded p-2 flex-1"
                >
                    Reset
                </button>
            </div>
        </div>
    )
}

export default SidePanel
