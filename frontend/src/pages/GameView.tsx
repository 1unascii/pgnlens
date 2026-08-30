import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import type { Game } from '../types'
import EvalBar from '../components/gameview/EvalBar'
import PlayerBar from '../components/gameview/PlayerBar'
import InfoPanel from '../components/gameview/InfoPanel'

const PIECE_CODES = ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP', 'bK', 'bQ', 'bR', 'bB', 'bN', 'bP']

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

function makePieceSet(theme: string, extension = 'svg') {
    const pieceSet: Record<string, () => React.JSX.Element> = {}
    for (const code of PIECE_CODES) {
        pieceSet[code] = () => (
            <img
                src={`/piece/${theme}/${code}.${extension}`}
                alt={code}
                style={{ width: '100%', height: '100%' }}
            />
        )
    }
    return pieceSet
}

function GameView() {
    const { id } = useParams()
    const [searchParams] = useSearchParams()
    const boardOrientation = searchParams.get('color') === 'black' ? 'black' : 'white'
    const playerColor = searchParams.get('color') || 'white'
    const [game, setGame] = useState<Game | null>(null)
    const playerName = playerColor === 'white' ? game?.white_player : game?.black_player
    const opponentName = playerColor === 'white' ? game?.black_player : game?.white_player
    const playerElo = playerColor === 'white' ? game?.white_elo : game?.black_elo
    const opponentElo = playerColor === 'white' ? game?.black_elo : game?.white_elo
    const [currentMoveIndex, setCurrentMoveIndex] = useState(0)
    const [FENpositions, setFENPositions] = useState<string[]>([])
    const [FENComputed, setFENComputed] = useState(false)
    
    //FEN matches (the last FEN match that was reached)
    const [ecoLookup, setEcoLookup] = useState<Record<string, { eco: string, name: string }>>({})
    const [FENMatches, setFENMatches] = useState<{ name: string, halfMove: number }[]>([])

    useEffect(() => {
        fetch('/data/eco.json')
            .then(response => response.json())
            .then(data => setEcoLookup(data))
    }, [])

    function goToMove(halfMove: number) {
        setCurrentMoveIndex(halfMove)
        playMoveSound()
    }

    function playMoveSound() {
        new Audio('/sound/lichess/standard/Move.mp3').play()
    }

    useEffect(() => {
        fetch(`/api/games/${id}/`)
            .then(response => response.json())
            .then(data => setGame(data))
            .catch(error => console.error('Error fetching game data:', error))
    }, [id])

    useEffect(() => {
        if (!game || FENComputed || game.moves.length === 0 || Object.keys(ecoLookup).length === 0) return
  
        const chess = new Chess()
        const fenList = [chess.fen()]
        const matches: { name: string, halfMove: number }[] = []
  
        let halfMove = 0
        for (const move of game.moves) {
            for (const side of [move.white_move, move.black_move]) {
                if (side) {
                    try {
                        chess.move({
                            from: side.slice(0, 2),
                            to: side.slice(2, 4),
                            promotion: side[4] || undefined,
                        })
                        halfMove++
                        const fen = chess.fen()
                        fenList.push(fen)
  
                        if (ecoLookup[fen]) {
                            matches.push({
                                name: ecoLookup[fen].name,
                                halfMove: halfMove,
                            })
                        }
                    } catch (error) {
                        console.log('Error parsing move:', side, error)
                    }
                }
            }
        }
        setFENPositions(fenList)
        setFENMatches(matches)
        setFENComputed(true)
    }, [game, ecoLookup, FENComputed])

    const [polling, setPolling] = useState(false)

    // Three-pass Stockfish analysis: depth 8 (quick), depth 16 (decent), 1.5M nodes (accurate)
    useEffect(() => {
        if (!game) return

        // Skip if already analyzed
        if (game.analysis_complete) return
        const alreadyAnalyzed = game.moves.every((move: any) =>
            (!move.white_move || move.white_eval !== null) &&
            (!move.black_move || move.black_eval !== null)
        )
        if (alreadyAnalyzed) return

        // Pass 1: depth 8 — synchronous, quick evals (~5-8 seconds)
        fetch(`/api/games/${id}/analyze/?depth=8`)
            .then(r => { if (!r.ok) throw new Error(`Depth 8 failed: ${r.status}`); return r.json() })
            .then(data => {
                if (data.moves) setGame(prev => prev ? { ...prev, moves: data.moves } : prev)
                // Pass 2+3: depth 16 then 1.5M nodes — both run in background sequentially
                // Start polling to pick up progressive updates from both passes
                fetch(`/api/games/${id}/analyze/?depth=16&nodes=1500000`)
                setPolling(true)
            })
            .catch(error => console.error('Analysis error:', error))
    }, [game?.id])

    // Poll game data to pick up partial results from background analysis.
    // Only starts after the nodes pass kicks off. Stops when analysis_complete is true.
    useEffect(() => {
        if (!polling || !game) return

        const poll = setInterval(() => {
            fetch(`/api/games/${id}/`)
                .then(r => r.json())
                .then(data => {
                    if (data.moves) setGame(prev => prev ? { ...prev, moves: data.moves } : prev)
                    if (data.analysis_complete) {
                        clearInterval(poll)
                        setPolling(false)
                    }
                })
        }, 1000)

        return () => clearInterval(poll)
    }, [polling, game?.id])

    if (!game || FENpositions.length === 0) return <div>Loading...</div>

    const currentFENMatch = FENMatches
      .filter(match => match.halfMove <= currentMoveIndex)
      .at(-1)
      const currentMoveRecord = currentMoveIndex === 0
      ? null
      : game.moves[Math.floor((currentMoveIndex - 1) / 2)]
    const isWhiteMove = currentMoveIndex % 2 === 1
    const classification = currentMoveRecord
      ? (isWhiteMove
          ? currentMoveRecord.white_classification
          : currentMoveRecord.black_classification)
      : null

    const currentEval = currentMoveIndex === 0
    ? 0
    : isWhiteMove
        ? currentMoveRecord?.white_eval ?? null
        : currentMoveRecord?.black_eval ?? null
  
    
    const { whiteCaptured, blackCaptured } = getCapturedPieces(
        FENpositions[currentMoveIndex]
    )

    //pieces captured BY the player (opponent's missing pieces)
    const opponentMissingPieces = playerColor === 'white'
        ? blackCaptured
        : whiteCaptured

    //pieces captured BY the opponent (player's missing pieces)
    const playerMissingPieces = playerColor === 'white'
    ? whiteCaptured
    : blackCaptured

    return (
        <div className="bg-white dark:bg-gray-800 p-4">
            <div className="flex gap-4">
                {/* Left column: opponent bar, eval bar + board, player bar */}
                <div>
                    <PlayerBar name={opponentName} elo={opponentElo} capturedPieces={playerMissingPieces} />
                    <div className="flex gap-2">
                        <EvalBar centipawns={currentEval} orientation={boardOrientation} />
                        <div className="w-[768px] [image-rendering:pixelated]">
                            <Chessboard options={{
                                position: FENpositions[currentMoveIndex],
                                pieces: makePieceSet('monarchy', 'webp'),
                                darkSquareStyle: { backgroundColor: '#999' },
                                lightSquareStyle: { backgroundColor: '#ddd' },
                                boardOrientation: boardOrientation,
                            }} />
                        </div>
                    </div>
                    <PlayerBar name={playerName} elo={playerElo} capturedPieces={opponentMissingPieces} />
                </div>
    
                {/* Right column: classification, move list, opening, eval graph, nav */}
                <InfoPanel
                    classification={classification}
                    currentEval={currentEval}
                    moves={game.moves}
                    currentMoveIndex={currentMoveIndex}
                    totalHalfMoves={FENpositions.length - 1}
                    result={game.result}
                    termination={game.termination}
                    openingFamily={game.opening_family}
                    openingMatch={currentFENMatch?.name ?? null}
                    orientation={boardOrientation}
                    onMoveClick={goToMove}
                    onStart={() => goToMove(0)}
                    onBack={() => goToMove(Math.max(0, currentMoveIndex - 1))}
                    onForward={() => goToMove(Math.min(FENpositions.length - 1, currentMoveIndex + 1))}
                    onEnd={() => goToMove(FENpositions.length - 1)}
                />
            </div>
        </div>
    )
}

export default GameView
