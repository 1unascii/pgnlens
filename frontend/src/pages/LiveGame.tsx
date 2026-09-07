import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'

function PlayGame() {
    const { gameId } = useParams()
    const [chess] = useState(new Chess())
    const [fen, setFen] = useState(chess.fen())
    const [status, setStatus] = useState('waiting')
    const [white, setWhite] = useState('')
    const [black, setBlack] = useState<string | null>(null)
    const [myColor, setMyColor] = useState<'white' | 'black'>('white')
    const ws = useRef<WebSocket | null>(null)

    useEffect(() => {
        // Connect to the WebSocket
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
        const socket = new WebSocket(`${protocol}://${window.location.host}/ws/game/${gameId}/`)

        socket.onopen = () => {
            console.log('WebSocket connected')
        }

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data)

            if (data.type === 'game_state') {
                // Initial state when connecting
                chess.load(data.fen)
                setFen(data.fen)
                setStatus(data.status)
                setWhite(data.white)
                setBlack(data.black)
                // Set board orientation based on which player you are
                const username = localStorage.getItem('username')
                if (data.black === username) {
                    setMyColor('black')
                }
            }

            if (data.type === 'game_move') {
                // Opponent made a move
                chess.load(data.fen)
                setFen(data.fen)
                setStatus(data.status)
            }

            if (data.type === 'player_joined') {
                setWhite(data.white)
                setBlack(data.black)                                                                            
                setStatus('active')
                const username = localStorage.getItem('username')
                if (data.black === username) {
                    setMyColor('black')
                } else {
                    setMyColor('white')
                }
            }

            if (data.type === 'game_over') {
                setStatus(data.status)
                alert(data.message)
            }
        }

        socket.onclose = () => {
            console.log('WebSocket disconnected')
        }

        ws.current = socket
        return () => socket.close()
    }, [gameId])

    function onDrop({ sourceSquare, targetSquare }:
        { sourceSquare: string, targetSquare: string | null }): boolean {
        if (!targetSquare) return false
        // Try the move locally with chess.js
        const move = chess.move({
            from: sourceSquare,
            to: targetSquare,
            promotion: 'q',  // always promote to queen for now
        })

        if (!move) return false  // illegal move

        setFen(chess.fen())

        // Send the move to the server
        const moveUci = sourceSquare + targetSquare
            + (move.promotion ? move.promotion : '')
        ws.current?.send(JSON.stringify({
            type: 'move',
            move: moveUci,
        }))

        return true
    }

    function handleResign() {
        ws.current?.send(JSON.stringify({ type: 'resign' }))
    }

    function handleJoin() {
        ws.current?.send(JSON.stringify({ type: 'join' }))
    }

    // Share link for the opponent
    const shareUrl = `${window.location.origin}/play/${gameId}`

    return (
        <div className="max-w-4xl mx-auto p-4">
            <div className="flex gap-4">
                <div>
                <Chessboard options={{                                                                                    position: fen,                      
                    onPieceDrop: onDrop,                                                                            
                    boardOrientation: myColor,  }} /> 
                </div>
                <div className="w-64 space-y-4">
                    <p className="font-bold">
                        {white} vs {black || 'waiting...'}
                    </p>
                    <p className="text-sm text-gray-500">
                        Status: {status}
                    </p>

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

                    {status === 'active' && (
                        <button
                            onClick={handleResign}
                            className="bg-red-500 text-white rounded p-2 w-full"
                        >
                            Resign
                        </button>
                    )}

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