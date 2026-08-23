import { FaChessKing, FaChessQueen, FaChessRook, FaChessBishop, FaChessKnight, FaChessPawn } from 'react-icons/fa'

// Maps piece codes (K, Q, etc.) to colored chess icons
const pieceIconMap: Record<string, React.ReactNode> = {
    K: <FaChessKing className="text-white" />,  Q: <FaChessQueen className="text-white" />,
    R: <FaChessRook className="text-white" />,  B: <FaChessBishop className="text-white" />,
    N: <FaChessKnight className="text-white" />, P: <FaChessPawn className="text-white" />,
    k: <FaChessKing className="text-black" />,  q: <FaChessQueen className="text-black" />,
    r: <FaChessRook className="text-black" />,  b: <FaChessBishop className="text-black" />,
    n: <FaChessKnight className="text-black" />, p: <FaChessPawn className="text-black" />,
}

interface PlayerBarProps {
    name: string | undefined
    elo: number | null | undefined
    capturedPieces: string[] // pieces captured BY this player (opponent's missing pieces)
}

// Displays player name, elo rating, and captured pieces. Used above and below the board.
function PlayerBar({ name, elo, capturedPieces }: PlayerBarProps) {
    return (
        <div className="flex items-center gap-2 py-1">
            <div className="w-10" /> {/* spacer to align with eval bar */}
            <span className="font-semibold">{name}</span>
            {elo && <span className="text-sm text-gray-500">({elo})</span>}
            <div className="flex items-center gap-1">
                {capturedPieces.map((piece, i) => <span key={i}>{pieceIconMap[piece]}</span>)}
            </div>
        </div>
    )
}

export default PlayerBar