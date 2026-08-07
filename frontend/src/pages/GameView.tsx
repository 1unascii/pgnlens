import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import type { Game } from '../types'

const PIECE_CODES = ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP', 'bK', 'bQ', 'bR', 'bB', 'bN', 'bP']

import {
    FaChessKing, FaChessQueen, FaChessRook,
    FaChessBishop, FaChessKnight, FaChessPawn
} from 'react-icons/fa'

const pieceIconMap: Record<string, React.ReactNode> = {
    K: <FaChessKing className="text-white" />,
    Q: <FaChessQueen className="text-white" />,
    R: <FaChessRook className="text-white" />,
    B: <FaChessBishop className="text-white" />,
    N: <FaChessKnight className="text-white" />,
    P: <FaChessPawn className="text-white" />,
    k: <FaChessKing className="text-black" />,
    q: <FaChessQueen className="text-black" />,
    r: <FaChessRook className="text-black" />,
    b: <FaChessBishop className="text-black" />,
    n: <FaChessKnight className="text-black" />,
    p: <FaChessPawn className="text-black" />,
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

    
    //TODO:current FEN match (the last FEN match that was reached)
    const [ecoLookup, setEcoLookup] = useState<Record<string, { eco: string, name: string       
    }>>({})
    const [FENMatches, setFENMatches] = useState<{ name: string, halfMove: number }[]>([])
    useEffect(() => {
        fetch('/data/eco.json')
            .then(response => response.json())
            .then(data => setEcoLookup(data))
    }, [])

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
        if (!game || game.moves.length === 0 || Object.keys(ecoLookup).length === 0) return     
  
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
    }, [game, ecoLookup])

    if (!game || FENpositions.length === 0) return <div>Loading...</div>

    const currentFENMatch = FENMatches
      .filter(match => match.halfMove <= currentMoveIndex)
      .at(-1)
    const currentMoveRecord = game.moves[Math.floor(currentMoveIndex / 2)]
    const isBlackTurn = currentMoveIndex % 2 === 0
    const classification = isBlackTurn
        ? currentMoveRecord?.black_classification
        : currentMoveRecord?.white_classification

    
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
        <div className="bg-white dark:bg-gray-800">
            <h1>{game.white_player} vs {game.black_player} -- {game.date}</h1>
            <p>Opening Family: {game.opening_family}</p>
            <p>Opening Line: {game.opening_line}</p>
            <p>Result: {game.result} -- {game.termination}</p>

            {/* Opponent at top */}
            <div className="flex items-center gap-2">
                <span className="font-semibold">{opponentName}</span>
                {opponentElo && <span className="text-sm text-gray-500">({opponentElo})</span>}
                {/* Opponent's captured pieces go here */}
                <div className="flex items-center gap-1">
                    {playerMissingPieces.map((piece, index) => (
                        <span key={index}>{pieceIconMap[piece]}</span>
                    ))}
                </div>
            </div>

            {/* Board */}
            <div className="max-w-3xl [image-rendering:pixelated]">
                
                <Chessboard options={{
                    position: FENpositions[currentMoveIndex],
                    pieces: makePieceSet('monarchy', 'webp'),
                    darkSquareStyle: { backgroundColor: '#999' },
                    lightSquareStyle: { backgroundColor: '#ddd' },
                    boardOrientation: boardOrientation,
                }} />
            </div>

            {/* Player at bottom */}
            <div className="flex items-center gap-2">
                <span className="font-semibold">{playerName}</span>
                {playerElo && <span className="text-sm text-gray-500">({playerElo})</span>}
                {/* Player's captured pieces go here */}
                <div className="flex items-center gap-1">
                    {opponentMissingPieces.map((piece, index) => (
                        <span key={index}>{pieceIconMap[piece]}</span>
                    ))}
                </div>
            </div>

            {/*TODO: current FEN match (the last FEN match that was reached) */}
            {currentFENMatch && (
                <p className="text-sm text-gray-500">
                    Position: {currentFENMatch.name}
                </p>
            )}

            {/* Move counter */}      
            <p>Move: {currentMoveIndex} / {FENpositions.length - 1}</p>
            {classification && <p>{classification}</p>}

            <div>
                <button onClick={() => {setCurrentMoveIndex(Math.min(FENpositions.length - 1, currentMoveIndex + 1)); playMoveSound()}}> Next |</button>
                <button onClick={() => {setCurrentMoveIndex(Math.max(0, currentMoveIndex - 1)); playMoveSound()}}> | Previous |</button>
                <button onClick={() => {setCurrentMoveIndex(0); playMoveSound()}}> | Start |</button> 
                <button onClick={() => {setCurrentMoveIndex(FENpositions.length - 1); playMoveSound()}}> | End </button>
            </div>
        </div>
    )
}

export default GameView
