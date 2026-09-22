import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import PlayerBar from '../components/gameview/PlayerBar'
import SidePanel from '../components/openingview/SidePanel'
import type { BookMove } from '../components/openingview/SidePanel'
import playSound from '../utils/playSound'
import { makePieceSet, getCapturedPieces } from '../utils/chessHelpers'

// Cache API responses so we don't re-fetch the same position
const bookMoveCache = new Map<string, { moves: BookMove[], opening?: { name: string } }>()

// ── Components ──

// "Checkmate" text positioned over the king square on the board
function CheckmateOverlay({ square, orientation }: { square: string, orientation: 'white' | 'black' }) {
    const squareSize = 768 / 8
    const file = square.charCodeAt(0) - 97
    const rank = parseInt(square[1]) - 1
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

// Main component — opening practice board with book moves and engine fallback
function OpeningView() {
    const { family, line } = useParams()
    const navigate = useNavigate()
    const familyName = decodeURIComponent(family || '')
    const lineName = decodeURIComponent(line || '')

    // State
    const [openingData, setOpeningData] = useState<{ fen: string, moves: string } | null>(null)
    const [chess] = useState(new Chess())
    const [initialized, setInitialized] = useState(false)
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

    const startingMoves = openingData?.moves || ''

    // Load opening data from JSON
    useEffect(() => {
        fetch('/data/openings.json')
            .then(r => r.json())
            .then(data => {
                const lineData = data[familyName]?.lines?.[lineName]
                if (lineData) setOpeningData(lineData)
            })
    }, [familyName, lineName])

    // Initialize the board once opening data loads
    useEffect(() => {
        if (!openingData || initialized) return
        chess.reset()
        // Strip move numbers ("1. e4 e5 2. Nf3" → "e4 e5 Nf3") and split into individual moves
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

    // Ask Stockfish WASM for a move at the given depth
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

    // Fetch book moves from the Lichess explorer API (cached)
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

    // Highlight the king square on check or checkmate
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

    // Apply a UCI move to the board, play the appropriate sound, and check for check/checkmate
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

    // Pick a random book move weighted by how often it's played
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

    // Computer's turn: try a book move first, fall back to Stockfish engine
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

    // Handle when the player drags and drops a piece
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

    // Check if it's the computer's turn to move
    function isComputersTurn(color: 'white' | 'black' = playerColor): boolean {
        const isWhiteTurn = chess.turn() === 'w'
        return (color === 'white' && !isWhiteTurn)
            || (color === 'black' && isWhiteTurn)
    }

    // Player clicked a book move from the sidebar — play it and trigger computer response
    function playBookMove(uci: string) {
        applyMoveAndSound(uci)
        if (isComputersTurn() && !chess.isGameOver()) {
            setTimeout(() => makeComputerMove(), 400)
        }
    }

    // Undo one move
    function undoLastMove() {
        chess.undo()
        setFen(chess.fen())
        setMoveList(prev => prev.slice(0, -1))
    }

    // Reset board back to the opening's starting position
    function resetBoard() {
        chess.reset()
        // Strip move numbers and split into individual moves
        const moves = startingMoves ? startingMoves.replace(/\d+\.\s*/g, '').trim().split(/\s+/) : []
        for (const moveStr of moves) {
            chess.move(moveStr)
        }
        setFen(chess.fen())
        setMoveList(moves)
        setIsBookExhausted(false)
        setCurrentOpeningName(lineName)
        setActiveCheckSquare(null)
        setShowCheckmate(false)

        if (isComputersTurn()) {
            setTimeout(() => makeComputerMove(), 800)
        }
    }

    // Switch which side the player is playing
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
                <SidePanel
                    currentOpeningName={currentOpeningName}
                    isBookExhausted={isBookExhausted}
                    playerColor={playerColor}
                    isWhiteTurn={chess.turn() === 'w'}
                    engineDepth={engineDepth}
                    setEngineDepth={setEngineDepth}
                    bookMoves={bookMoves}
                    moveList={moveList}
                    onToggleColor={toggleColor}
                    onPlayBookMove={playBookMove}
                    onUndoLastMove={undoLastMove}
                    onResetBoard={resetBoard}
                    hoveredMove={hoveredMove}
                    setHoveredMove={setHoveredMove}
                />
            </div>
        </div>
    )
}

export default OpeningView
