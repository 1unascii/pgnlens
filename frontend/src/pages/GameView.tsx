import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import type { Game } from '../types'

const PIECE_CODES = ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP', 'bK', 'bQ', 'bR', 'bB', 'bN', 'bP']

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
    const [game, setGame] = useState<Game | null>(null)
    const [currentMoveIndex, setCurrentMoveIndex] = useState(0)
    const [FENpositions, setFENPositions] = useState<string[]>([])

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
                    } catch (error) {
                        console.log('Error parsing move:', side, error)
                    }
                }
            }
        }
        setFENPositions(fenList)
    }, [game])

    if (!game || FENpositions.length === 0) return <div>Loading...</div>

    const currentMoveRecord = game.moves[Math.floor(currentMoveIndex / 2)]
    const isBlackTurn = currentMoveIndex % 2 === 0
    const classification = isBlackTurn
        ? currentMoveRecord?.black_classification
        : currentMoveRecord?.white_classification

    return (
        <div>
            <h1>{game.white_player} vs {game.black_player}</h1>
            <p>{game.opening_line} -- {game.opening_family} -- {game.result}</p>
            <div className="[image-rendering:pixelated]">
                <Chessboard options={{
                    position: FENpositions[currentMoveIndex],
                    pieces: makePieceSet('monarchy', 'webp'),
                    darkSquareStyle: { backgroundColor: '#999' },
                    lightSquareStyle: { backgroundColor: '#ddd' },
                }} />
            </div>

            <p>Move: {currentMoveIndex} / {FENpositions.length - 1}</p>
            {classification && <p>{classification}</p>}

            <div>
                <button onClick={() => {setCurrentMoveIndex(Math.min(FENpositions.length - 1, currentMoveIndex + 1)); playMoveSound()}}>Next</button>
                <button onClick={() => {setCurrentMoveIndex(Math.max(0, currentMoveIndex - 1)); playMoveSound()}}>Previous</button>
                <button onClick={() => {setCurrentMoveIndex(0); playMoveSound()}}>Start</button>
                <button onClick={() => {setCurrentMoveIndex(FENpositions.length - 1); playMoveSound()}}>End</button>
            </div>
        </div>
    )
}

export default GameView
