import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import PlayerBar from '../components/gameview/PlayerBar'

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

// Piece values for material score
const PIECE_VALUES: Record<string, number> = {
    K: 0, Q: 9, R: 5, B: 3, N: 3, P: 1,
    k: 0, q: 9, r: 5, b: 3, n: 3, p: 1,
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

function getMaterialScore(whiteCaptured: string[], blackCaptured: string[]): number {
    const whiteScore = blackCaptured.reduce((sum, p) => sum + (PIECE_VALUES[p] || 0), 0)
    const blackScore = whiteCaptured.reduce((sum, p) => sum + (PIECE_VALUES[p] || 0), 0)
    return whiteScore - blackScore
}

function PlayGame() {
    const { gameId } = useParams()
    const [chess] = useState(new Chess())
    const [fen, setFen] = useState(chess.fen())
    const [status, setStatus] = useState('waiting')
    const [white, setWhite] = useState('')
    const [black, setBlack] = useState<string | null>(null)
    const [myColor, setMyColor] = useState<'white' | 'black'>('white')
    const [moveList, setMoveList] = useState<string[]>([])
    const ws = useRef<WebSocket | null>(null)
    const moveListRef = useRef<HTMLDivElement>(null)

    function playMoveSound() {
        new Audio('/sound/lichess/standard/Move.mp3').play().catch(() => {})
    }

    useEffect(() => {
        // Close any existing connection before creating a new one
        if (ws.current) {
            ws.current.close()
        }

        // In dev, connect directly to Django (Vite proxy doesn't reliably forward WS data frames)
        // In production, use the same host (nginx handles the proxy)
        const isDev = window.location.port === '5173'
        const wsUrl = isDev
            ? `ws://localhost:8002/ws/game/${gameId}/`
            : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws/game/${gameId}/`
        const socket = new WebSocket(wsUrl)

        // Set the ref immediately so handlers always use the latest socket
        ws.current = socket

        socket.onopen = () => console.log('WebSocket connected')

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data)
            console.log('[WS] Received:', data.type, data)

            if (data.type === 'game_state') {
                chess.load(data.fen)
                setFen(data.fen)
                setStatus(data.status)
                setWhite(data.white)
                setBlack(data.black)
                if (data.moves) setMoveList(data.moves)
                const username = localStorage.getItem('username')
                if (data.black === username) setMyColor('black')
            }

            if (data.type === 'game_move') {
                chess.load(data.fen)
                setFen(data.fen)
                setStatus(data.status)
                setMoveList(prev => [...prev, data.move])
                playMoveSound()
            }

            if (data.type === 'player_joined') {
                setWhite(data.white)
                setBlack(data.black)
                setStatus('active')
                const username = localStorage.getItem('username')
                setMyColor(data.black === username ? 'black' : 'white')
            }

            if (data.type === 'game_over') {
                setStatus(data.status)
                alert(data.message)
            }
        }

        socket.onclose = () => console.log('WebSocket disconnected')

        return () => {
            socket.close()
        }
    }, [gameId])

    // Auto-scroll move list
    useEffect(() => {
        if (moveListRef.current) {
            moveListRef.current.scrollTop = moveListRef.current.scrollHeight
        }
    }, [moveList])

    function onDrop({ sourceSquare, targetSquare }:
        { sourceSquare: string, targetSquare: string | null }): boolean {
        if (!targetSquare) return false

        // Only allow moves on your turn
        const isWhiteTurn = chess.turn() === 'w'
        console.log('Turn check:', 'myColor:', myColor, 'isWhiteTurn:', isWhiteTurn, 'chess.turn():', chess.turn())
        if ((myColor === 'white' && !isWhiteTurn) || (myColor === 'black' && isWhiteTurn)) {
            console.log('BLOCKED: not your turn')
            return false
        }

        const move = chess.move({
            from: sourceSquare,
            to: targetSquare,
            promotion: 'q',
        })
        if (!move) return false

        setFen(chess.fen())
        playMoveSound()

        // Send move to server
        console.log('ws.current:', ws.current, 'readyState:', ws.current?.readyState)
        ws.current?.send(JSON.stringify({
            type: 'move',
            move: sourceSquare + targetSquare + (move.promotion ? move.promotion : ''),
        }))
        return true
    }

    function handleResign() {
        ws.current?.send(JSON.stringify({ type: 'resign' }))
    }

    function handleJoin() {
        ws.current?.send(JSON.stringify({ type: 'join' }))
    }

    const shareUrl = `${window.location.origin}/play/${gameId}`

    // Captured pieces and material score
    const { whiteCaptured, blackCaptured } = getCapturedPieces(fen)
    const materialScore = getMaterialScore(whiteCaptured, blackCaptured)

    // Player names and captured pieces based on orientation
    const topPlayer = myColor === 'white' ? (black || 'waiting...') : white
    const bottomPlayer = myColor === 'white' ? white : (black || 'waiting...')
    // Pieces captured BY the top player (bottom player's missing pieces)
    const topCaptured = myColor === 'white' ? whiteCaptured : blackCaptured
    // Pieces captured BY the bottom player (top player's missing pieces)
    const bottomCaptured = myColor === 'white' ? blackCaptured : whiteCaptured
    // Material advantage from bottom player's perspective
    const bottomAdvantage = myColor === 'white' ? materialScore : -materialScore

    // Format move list into pairs for display
    const movePairs: { num: number, white: string, black?: string }[] = []
    for (let i = 0; i < moveList.length; i += 2) {
        movePairs.push({
            num: Math.floor(i / 2) + 1,
            white: moveList[i],
            black: moveList[i + 1],
        })
    }

    return (
        <div className="max-w-4xl mx-auto p-4">
            <div className="flex gap-4">
                <div>
                    {/* Top player bar */}
                    <div className="flex items-center gap-2">
                        <PlayerBar name={topPlayer} elo={null} capturedPieces={topCaptured} />
                        {bottomAdvantage < 0 && (
                            <span className="text-xs text-gray-400">+{Math.abs(bottomAdvantage)}</span>
                        )}
                    </div>

                    {/* Board */}
                    <div style={{ lineHeight: 0 }}>
                        <Chessboard options={{
                            position: fen,
                            onPieceDrop: onDrop,
                            boardOrientation: myColor,
                            pieces: makePieceSet('monarchy', 'webp'),
                            darkSquareStyle: { backgroundColor: '#999' },
                            lightSquareStyle: { backgroundColor: '#ddd' },
                        }} />
                    </div>

                    {/* Bottom player bar */}
                    <div className="flex items-center gap-2">
                        <PlayerBar name={bottomPlayer} elo={null} capturedPieces={bottomCaptured} />
                        {bottomAdvantage > 0 && (
                            <span className="text-xs text-gray-400">+{bottomAdvantage}</span>
                        )}
                    </div>
                </div>

                {/* Right panel */}
                <div className="flex-shrink-0 flex flex-col gap-2 bg-gray-900 text-white rounded-lg p-4" style={{ width: 250 }}>
                    <p className="text-sm text-gray-500">
                        Status: {status}
                    </p>

                    {/* Move list */}
                    <div ref={moveListRef} className="flex-1 overflow-y-auto max-h-[500px] border rounded p-2 bg-gray-50 dark:bg-gray-800">
                        {movePairs.length === 0 && (
                            <p className="text-sm text-gray-400 text-center">No moves yet</p>
                        )}
                        {movePairs.map((pair) => (
                            <div key={pair.num} className="flex text-sm py-0.5">
                                <span className="w-8 text-gray-400">{pair.num}.</span>
                                <span className="flex-1">{pair.white}</span>
                                {pair.black && <span className="flex-1">{pair.black}</span>}
                            </div>
                        ))}
                    </div>

                    {/* Waiting / share link */}
                    {status === 'waiting' && !black && (
                        <div>
                            <p className="text-sm mb-2">Share this link:</p>
                            <div className="flex gap-1">
                                <input
                                    type="text"
                                    readOnly
                                    value={shareUrl}
                                    className="border rounded p-2 w-full text-sm"
                                    onClick={(e) => (e.target as HTMLInputElement).select()}
                                />
                                <button
                                    onClick={() => { navigator.clipboard.writeText(shareUrl) }}
                                    className="border rounded p-2 text-sm hover:bg-gray-100"
                                    title="Copy link"
                                >
                                    📋
                                </button>
                            </div>
                            <button
                                onClick={handleJoin}
                                className="mt-2 bg-blue-500 text-white rounded p-2 w-full"
                            >
                                Join Game
                            </button>
                        </div>
                    )}

                    {/* Resign button */}
                    {status === 'active' && (
                        <button
                            onClick={handleResign}
                            className="bg-red-500 text-white rounded p-2 w-full"
                        >
                            Resign
                        </button>
                    )}

                    {/* Game over */}
                    {(status === 'checkmate' || status === 'stalemate'
                        || status === 'resigned' || status === 'draw') && (
                        <p className="text-lg font-bold text-center">
                            Game Over
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}

export default PlayGame
