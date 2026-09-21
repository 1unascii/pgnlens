import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import PlayerBar from '../components/gameview/PlayerBar'
import playSound from '../utils/playSound'
import { FaChessKing, FaChessQueen, FaChessRook, FaChessBishop, FaChessKnight, FaChessPawn } from 'react-icons/fa'

const PIECE_CODES = ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP', 'bK', 'bQ', 'bR', 'bB', 'bN', 'bP']

function makePieceSet(theme: string, extension = 'svg') {
    const pieceSet: Record<string, () => React.JSX.Element> = {}
    for (const code of PIECE_CODES) {
        pieceSet[code] = () => (
            <img src={`/piece/${theme}/${code}.${extension}`} alt={code}
                style={{ width: '100%', height: '100%' }} />
        )
    }
    return pieceSet
}

function getCapturedPieces(fen: string) {
    const boardPart = fen.split(' ')[0]
    const startingPieces = {
        white: { K: 1, Q: 1, R: 2, B: 2, N: 2, P: 8 },
        black: { k: 1, q: 1, r: 2, b: 2, n: 2, p: 8 },
    }
    const currentPieces: Record<string, number> = {}
    for (const char of boardPart) {
        if (/[A-Za-z]/.test(char)) {
            currentPieces[char] = (currentPieces[char] || 0) + 1
        }
    }
    const whiteCaptured: string[] = []
    const blackCaptured: string[] = []
    for (const [piece, count] of Object.entries(startingPieces.white)) {
        const missing = count - (currentPieces[piece] || 0)
        for (let i = 0; i < missing; i++) whiteCaptured.push(piece)
    }
    for (const [piece, count] of Object.entries(startingPieces.black)) {
        const missing = count - (currentPieces[piece] || 0)
        for (let i = 0; i < missing; i++) blackCaptured.push(piece)
    }
    return { whiteCaptured, blackCaptured }
}

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

function getPieceIconForMove(san: string, isWhiteTurn: boolean): React.ReactNode {
    const color = isWhiteTurn ? 'white' : 'black'
    const firstChar = san[0]
    if (PIECE_ICON_MAP[color][firstChar]) {
        return PIECE_ICON_MAP[color][firstChar]
    }
    return PIECE_ICON_MAP[color]['P']
}

interface BookMove {
    uci: string
    san: string
    white: number
    draws: number
    black: number
    averageRating: number
}

const bookMoveCache = new Map<string, { moves: BookMove[], opening?: { name: string } }>()

const ELO_LABELS: Record<number, number> = {
    1: 400, 2: 600, 3: 800, 4: 1000, 5: 1100, 6: 1200,
    7: 1400, 8: 1500, 9: 1600, 10: 1800, 11: 1900, 12: 2000,
    13: 2200, 14: 2300, 15: 2400, 16: 2500, 17: 2600, 18: 2700,
    19: 2800, 20: 2900,
}

function CheckmateOverlay({ square, orientation }: { square: string, orientation: 'white' | 'black' }) {
    const file = square.charCodeAt(0) - 97
    const rank = parseInt(square[1]) - 1
    const squareSize = 768 / 8
    const x = orientation === 'white' ? file * squareSize + squareSize / 2 : (7 - file) * squareSize + squareSize / 2
    const y = orientation === 'white' ? (7 - rank) * squareSize + squareSize / 2 : rank * squareSize + squareSize / 2
    return (
        <div style={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)', zIndex: 10, pointerEvents: 'none' }}>
            <span style={{
                fontFamily: "'UnifrakturMaguntia', cursive", fontSize: '3rem', color: 'white',
                whiteSpace: 'nowrap', textShadow: '2px 2px 4px rgba(0,0,0,0.7)',
                animation: 'textFadeOut 3s ease-out forwards',
            }}>
                Checkmate
            </span>
        </div>
    )
}

function OpeningView() {
    const { family, line } = useParams()
    const navigate = useNavigate()
    const familyName = decodeURIComponent(family || '')
    const lineName = decodeURIComponent(line || '')

    const [openingData, setOpeningData] = useState<{ fen: string, moves: string } | null>(null)

    useEffect(() => {
        fetch('/data/openings.json')
            .then(r => r.json())
            .then(data => {
                const lineData = data[familyName]?.lines?.[lineName]
                if (lineData) setOpeningData(lineData)
            })
    }, [familyName, lineName])

    const startingMoves = openingData?.moves || ''

    const [chess] = useState(new Chess())
    const [initialized, setInitialized] = useState(false)

    useEffect(() => {
        if (!openingData || initialized) return
        chess.reset()
        const moves = startingMoves ? startingMoves.replace(/\d+\.\s*/g, '').trim().split(/\s+/) : []
        for (const moveStr of moves) {
            chess.move(moveStr)
        }
        setFen(chess.fen())
        setMoveList(moves)
        const color = moves.length % 2 === 0 ? 'black' : 'white'
        setPlayerColor(color)
        setInitialized(true)

        if (isComputersTurn(color)) {
            setTimeout(() => makeComputerMove(), 800)
        }
    }, [openingData])

    const [fen, setFen] = useState(chess.fen())
    const [moveList, setMoveList] = useState<string[]>([])
    const [bookMoves, setBookMoves] = useState<BookMove[]>([])
    const [isBookExhausted, setIsBookExhausted] = useState(false)
    const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white')
    const [engineDepth, setEngineDepth] = useState(10)
    const [currentOpeningName, setCurrentOpeningName] = useState(lineName)
    const [activeCheckSquare, setActiveCheckSquare] = useState<string | null>(null)
    const [showCheckmate, setShowCheckmate] = useState(false)
    const [hoveredMove, setHoveredMove] = useState<string | null>(null)
    const stockfish = useRef<Worker | null>(null)

    // Stockfish WASM setup
    useEffect(() => {
        const base = import.meta.env.BASE_URL
        const worker = new Worker(`${base}stockfish/stockfish.js`)
        worker.postMessage('uci')
        worker.postMessage('isready')
        stockfish.current = worker
        return () => worker.terminate()
    }, [])

    // Fetch book moves when position changes
    useEffect(() => {
        fetchBookMoves(fen)
    }, [fen])


    function getStockfishMove(fen: string, depth: number): Promise<string | null> {
        return new Promise((resolve) => {
            const worker = stockfish.current
            if (!worker) return resolve(null)
            worker.postMessage(`position fen ${fen}`)
            worker.postMessage(`go depth ${depth}`)
            worker.onmessage = (event) => {
                if (event.data.startsWith('bestmove')) {
                    resolve(event.data.split(' ')[1])
                }
            }
        })
    }

    async function fetchBookMoves(currentFen: string) {
        // Check cache first
        if (bookMoveCache.has(currentFen)) {
            const cached = bookMoveCache.get(currentFen)!
            setBookMoves(cached.moves)
            setIsBookExhausted(cached.moves.length === 0)
            if (cached.opening) setCurrentOpeningName(cached.opening.name)
            return
        }

        const encodedFen = encodeURIComponent(currentFen)
        const response = await fetch(
            `/api/lichess-explorer/`
            + `?fen=${encodedFen}`
            + `&ratings=1600,1800,2000`
            + `&speeds=blitz,rapid`
        )
        const data = await response.json()

        // Cache the result
        bookMoveCache.set(currentFen, { moves: data.moves || [], opening: data.opening })

        setBookMoves(data.moves || [])
        setIsBookExhausted((data.moves || []).length === 0)
        if (data.opening) {
            setCurrentOpeningName(data.opening.name || '')
        }
    }

    function flashCheckHighlight() {
        if (chess.isCheckmate()) {
            const kingSquare = chess.board().flat().find(
                sq => sq && sq.type === 'k' && sq.color === chess.turn()
            )
            if (kingSquare) {
                setActiveCheckSquare(kingSquare.square)
            }
            setShowCheckmate(true)
        } else if (chess.isCheck()) {
            const kingSquare = chess.board().flat().find(
                sq => sq && sq.type === 'k' && sq.color === chess.turn()
            )
            if (kingSquare) {
                setActiveCheckSquare(kingSquare.square)
                setTimeout(() => setActiveCheckSquare(null), 1200)
            }
        } else {
            setActiveCheckSquare(null)
        }
    }

    function applyMoveAndSound(moveUCI: string) {
        // Stockfish WASM sometimes outputs castling in Chess960 format
        // (king to rook square) instead of standard UCI (king to destination).
        // Convert: e1h1 → e1g1, e1a1 → e1c1, e8h8 → e8g8, e8a8 → e8c8
        const castlingMap: Record<string, string> = {
            'e1h1': 'e1g1', 'e1a1': 'e1c1',
            'e8h8': 'e8g8', 'e8a8': 'e8c8',
        }
        const normalizedUCI = castlingMap[moveUCI] || moveUCI

        const move = chess.move({
            from: normalizedUCI.slice(0, 2),
            to: normalizedUCI.slice(2, 4),
            promotion: normalizedUCI[4] || undefined,
        })
        if (!move) return null
        setFen(chess.fen())
        setMoveList(prev => [...prev, move.san])
        playSound(
            move.san.startsWith('O-O') ? 'Castle'
            : move.captured ? 'Capture'
            : 'Move',
            chess.isCheck()
        )
        flashCheckHighlight()
        return move
    }

    function pickBookMove(moves: BookMove[]): string {
        const totalGames = moves.reduce(
            (sum, m) => sum + m.white + m.draws + m.black, 0
        )
        let roll = Math.random() * totalGames
        for (const move of moves) {
            roll -= (move.white + move.draws + move.black)
            if (roll <= 0) return move.uci
        }
        return moves[0].uci
    }

    async function makeComputerMove() {
        if (chess.isGameOver()) return
        await new Promise(r => setTimeout(r, 300))

        try {
            const currentFen = chess.fen()
            let currentBookMoves: BookMove[]

            // Check cache first
            if (bookMoveCache.has(currentFen)) {
                currentBookMoves = bookMoveCache.get(currentFen)!.moves
            } else {
                const encodedFen = encodeURIComponent(currentFen)
                const response = await fetch(
                    `/api/lichess-explorer/`
                    + `?fen=${encodedFen}`
                    + `&ratings=1600,1800,2000`
                    + `&speeds=blitz,rapid`
                )
                const data = await response.json()
                currentBookMoves = data.moves || []
                bookMoveCache.set(currentFen, { moves: currentBookMoves, opening: data.opening })
            }

            let moveUCI: string | null = null

            if (currentBookMoves.length > 0) {
                moveUCI = pickBookMove(currentBookMoves)
            } else {
                setIsBookExhausted(true)
                moveUCI = await getStockfishMove(chess.fen(), engineDepth)
            }

            if (moveUCI) {
                applyMoveAndSound(moveUCI)
            }
        } catch (error) {
            console.error('Computer move failed:', error)
            setIsBookExhausted(true)
            const moveUCI = await getStockfishMove(chess.fen(), engineDepth)
            if (moveUCI) {
                applyMoveAndSound(moveUCI)
            }
        }
    }

    function onDrop({ sourceSquare, targetSquare }:
        { sourceSquare: string, targetSquare: string | null }): boolean {
        if (!targetSquare) return false

        if (isComputersTurn()) return false

        let move
        try {
            move = chess.move({
                from: sourceSquare,
                to: targetSquare,
                promotion: 'q',
            })
        } catch {
            playSound('Error')
            return false
        }
        if (!move) {
            playSound('Error')
            return false
        }

        setFen(chess.fen())
        setMoveList(prev => [...prev, move.san])
        playSound(
            move.san.startsWith('O-O') ? 'Castle'
            : move.captured ? 'Capture'
            : 'Move',
            chess.isCheck()
        )
        flashCheckHighlight()

        if (!chess.isGameOver()) {
            setTimeout(() => makeComputerMove(), 400)
        }
        return true
    }

    function isComputersTurn(color: 'white' | 'black' = playerColor): boolean {
        const isWhiteTurn = chess.turn() === 'w'
        return (color === 'white' && !isWhiteTurn)
            || (color === 'black' && isWhiteTurn)
    }

    function playBookMove(uci: string) {
        applyMoveAndSound(uci)
        if (isComputersTurn() && !chess.isGameOver()) {
            setTimeout(() => makeComputerMove(), 400)
        }
    }

    function undoLastMove() {
        chess.undo()
        setFen(chess.fen())
        setMoveList(prev => prev.slice(0, -1))
    }

    function resetBoard() {
        chess.reset()
        if (startingMoves) {
            const moves = startingMoves.replace(/\d+\.\s*/g, '').trim().split(/\s+/)
            for (const moveStr of moves) {
                chess.move(moveStr)
            }
        }
        setFen(chess.fen())
        setMoveList(startingMoves ? startingMoves.replace(/\d+\.\s*/g, '').trim().split(/\s+/) : [])
        setIsBookExhausted(false)
        setCurrentOpeningName(lineName)
        setActiveCheckSquare(null)
        setShowCheckmate(false)

        if (isComputersTurn()) {
            setTimeout(() => makeComputerMove(), 800)
        }
    }

    function toggleColor() {
        const newColor = playerColor === 'white' ? 'black' : 'white'
        setPlayerColor(newColor)
        if (isComputersTurn(newColor) && !chess.isGameOver()) {
            setTimeout(() => makeComputerMove(), 500)
        }
    }

    if (!initialized) return <div className="p-4">Loading...</div>

    const { whiteCaptured, blackCaptured } = getCapturedPieces(fen)
    const opponentCaptured = playerColor === 'white' ? whiteCaptured : blackCaptured
    const playerCaptured = playerColor === 'white' ? blackCaptured : whiteCaptured

    return (
        <div className="max-w-6xl mx-auto p-4 relative">
            {/* Checkmate overlay */}

            {/* Screen flash on checkmate */}
            {showCheckmate && (
                <div className="fixed inset-0 bg-red-500/40 z-50 pointer-events-none"
                     style={{ animation: 'checkmateFlash 2s ease-out forwards' }} />
            )}

            <button
                onClick={() => navigate('/practice')}
                className="mb-4 text-sm hover:underline"
            >
                ← Back to openings
            </button>
            <p className="font-bold mb-2">{currentOpeningName}</p>

            <div className="flex gap-4">
                {/* Board column */}
                <div>
                    {/* Top player (opponent) */}
                    <PlayerBar
                        name={playerColor === 'white' ? 'Computer (Black)' : 'Computer (White)'}
                        elo={null}
                        capturedPieces={opponentCaptured}
                    />

                <div className="w-[768px] [image-rendering:pixelated] relative">
                    <Chessboard options={{
                        position: fen,
                        onPieceDrop: onDrop,
                        boardOrientation: playerColor,
                        pieces: makePieceSet('monarchy', 'webp'),
                        darkSquareStyle: { backgroundColor: '#999' },
                        lightSquareStyle: { backgroundColor: '#ddd' },
                        squareStyles: {
                            ...(activeCheckSquare ? {
                                [activeCheckSquare]: showCheckmate ? {
                                    animation: 'kingPulse 2.5s ease-in-out infinite',
                                } : {
                                    backgroundColor: 'rgba(255, 0, 0, 0.5)',
                                    transition: 'background-color 0.8s ease-out',
                                    animation: 'king-wiggle 0.4s ease-in-out',
                                }
                            } : {}),
                            ...(hoveredMove ? {
                                [hoveredMove.slice(0, 2)]: {
                                    backgroundColor: 'rgba(59, 130, 246, 0.4)',
                                },
                                [hoveredMove.slice(2, 4)]: {
                                    backgroundColor: 'rgba(59, 130, 246, 0.4)',
                                },
                            } : {}),
                        },
                        arrows: hoveredMove ? [{
                            startSquare: hoveredMove.slice(0, 2),
                            endSquare: hoveredMove.slice(2, 4),
                            color: 'rgba(59, 130, 246, 0.7)',
                        }] : [],
                    }} />

                    {showCheckmate && activeCheckSquare && (
                        <CheckmateOverlay square={activeCheckSquare} orientation={playerColor} />
                    )}
                </div>

                    {/* Bottom player (you) */}
                    <PlayerBar
                        name={playerColor === 'white' ? 'You (White)' : 'You (Black)'}
                        elo={null}
                        capturedPieces={playerCaptured}
                    />
                </div>

                {/* Side panel */}
                <div className="flex-shrink-0 flex flex-col gap-2" style={{ width: 250 }}>
                    <p className="font-bold">{currentOpeningName || 'Starting Position'}</p>
                    <p className="text-sm text-gray-400">
                        {isBookExhausted ? 'Engine' : 'Book'}
                    </p>

                    <button
                        onClick={toggleColor}
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
                                        onClick={() => playBookMove(move.uci)}
                                        onMouseEnter={() => setHoveredMove(move.uci)}
                                        onMouseLeave={() => setHoveredMove(null)}
                                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded"
                                    >
                                        <span className="font-bold inline-flex items-center gap-1">
                                            {getPieceIconForMove(move.san, chess.turn() === 'w')}
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

                    <div className="flex gap-2">
                        <button
                            onClick={undoLastMove}
                            disabled={moveList.length === 0}
                            className="border rounded p-2 flex-1
                                       disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            ← Back
                        </button>
                        <button
                            onClick={resetBoard}
                            className="bg-red-500 text-white rounded p-2 flex-1"
                        >
                            Reset
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default OpeningView
