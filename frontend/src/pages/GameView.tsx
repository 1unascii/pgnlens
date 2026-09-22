import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import type { Game } from '../types'
import EvalBar from '../components/gameview/EvalBar'
import PlayerBar from '../components/gameview/PlayerBar'
import SidePanel from '../components/gameview/SidePanel'
import playSound from '../utils/playSound'
import { makePieceSet, getCapturedPieces } from '../utils/chessHelpers'

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
    const [moveSoundType, setMoveSoundType] = useState<('Move' | 'Capture' | 'Castle')[]>([])
    const [checkSquares, setCheckSquares] = useState<(string | null)[]>([])
    const [activeCheckSquare, setActiveCheckSquare] = useState<string | null>(null)
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
        if (halfMove > 0 || currentMoveIndex > 0) {
            const goingBack = halfMove < currentMoveIndex
            const soundIndex = goingBack ? currentMoveIndex : halfMove
            playSound(moveSoundType[soundIndex], !!checkSquares[soundIndex])
        }
        setCurrentMoveIndex(halfMove)
        setActiveCheckSquare(null)
        if (checkSquares[halfMove]) {
            setTimeout(() => {
                setActiveCheckSquare(checkSquares[halfMove])
                setTimeout(() => setActiveCheckSquare(null), 1200)
            }, 50)
        }
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
        const soundTypes: ('Move' | 'Capture' | 'Castle')[] = ['Move']
        const checks: (string | null)[] = [null]
        const matches: { name: string, halfMove: number }[] = []

        let halfMove = 0
        for (const move of game.moves) {
            for (const side of [move.white_move, move.black_move]) {
                if (side) {
                    try {
                        const result = chess.move({
                            from: side.slice(0, 2),
                            to: side.slice(2, 4),
                            promotion: side[4] || undefined,
                        })
                        halfMove++
                        fenList.push(chess.fen())
                        soundTypes.push(
                            result.san.startsWith('O-O') ? 'Castle'
                            : result.captured ? 'Capture'
                            : 'Move'
                        )
                        if (chess.isCheck()) {
                            const kingSquare = chess.board().flat().find(
                                sq => sq && sq.type === 'k' && sq.color === chess.turn()
                            )
                            checks.push(kingSquare ? kingSquare.square : null)
                        } else {
                            checks.push(null)
                        }

                        if (ecoLookup[chess.fen()]) {
                            matches.push({
                                name: ecoLookup[chess.fen()].name,
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
        setMoveSoundType(soundTypes)
        setCheckSquares(checks)
        setFENMatches(matches)
        setFENComputed(true)
    }, [game, ecoLookup, FENComputed])

    const [polling, setPolling] = useState(false)

    // Two-pass Stockfish analysis: depth 8 (sync), then 1.5M nodes (background with polling)
    useEffect(() => {
        if (!game) return

        // Skip if already analyzed
        if (game.analysis_complete) return
        const alreadyAnalyzed = game.moves.every((move: any) =>
            (!move.white_move || move.white_eval !== null) &&
            (!move.black_move || move.black_eval !== null)
        )
        if (alreadyAnalyzed) return

        // Pass 1: depth 8 — synchronous, quick evals
        fetch(`/api/games/${id}/analyze/?depth=8`)
            .then(r => { if (!r.ok) throw new Error(`Depth 8 failed: ${r.status}`); return r.json() })
            .then(data => {
                if (data.moves) setGame(prev => prev ? { ...prev, moves: data.moves } : prev)
                // Pass 2: 1.5M nodes — background thread, poll for progressive updates
                fetch(`/api/games/${id}/analyze/?nodes=1500000`)
                setPolling(true)
            })
            .catch(error => console.error('Analysis error:', error))
    }, [game?.id])

    // Poll game data to pick up partial results from background analysis.
    // Stops when analysis_complete is true.
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

    // Find the most recent opening match for this position
    const currentFENMatch = FENMatches
      .filter(match => match.halfMove <= currentMoveIndex)
      .at(-1)

    // Get the move record for the current position
    const moveIndex = Math.floor((currentMoveIndex - 1) / 2)
    const currentMoveRecord = currentMoveIndex === 0 ? null : game.moves[moveIndex]
    const isWhiteMove = currentMoveIndex % 2 === 1

    // Get classification and eval for the current move
    let classification = null
    let currentEval: number | null = 0
    if (currentMoveRecord) {
        if (isWhiteMove) {
            classification = currentMoveRecord.white_classification
            currentEval = currentMoveRecord.white_eval ?? null
        } else {
            classification = currentMoveRecord.black_classification
            currentEval = currentMoveRecord.black_eval ?? null
        }
    }
  
    
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
                                squareStyles: activeCheckSquare ? {
                                    [activeCheckSquare]: {
                                        backgroundColor: 'rgba(255, 0, 0, 0.5)',
                                        transition: 'background-color 0.8s ease-out',
                                        animation: 'king-wiggle 0.4s ease-in-out',
                                    }
                                } : {},
                            }} />
                        </div>
                    </div>
                    <PlayerBar name={playerName} elo={playerElo} capturedPieces={opponentMissingPieces} />
                </div>
    
                {/* Right column: classification, move list, opening, eval graph, nav */}
                <SidePanel
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
