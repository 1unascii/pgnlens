import { useState, useEffect } from 'react' 
import { useParams } from 'react-router-dom' // Hook to get the game ID from the URL
import { Chess } from 'chess.js' // Library to parse and validate chess moves
import { Chessboard } from 'react-chessboard' // Component to display the chessboard
import type { Game, Move } from '../types' // Types for the game and move data

//used by makePieceSet to create a set of pieces for the chessboard
const PIECE_CODES = ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP', 'bK', 'bQ', 'bR', 'bB', 'bN', 'bP']

// 
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
    const { id } = useParams() // Get the game ID from the URL
    const [game, setGame] = useState<Game | null>(null) // State to store the game data
    const [moves, setMoves] = useState<Move[]>([]) // State to store the moves data
    const [currentMoveIndex, setCurrentMoveIndex] = useState(0) // State to store the current move index
    const [FENpositions, setFENPositions] = useState<string[]>([]) // State to store the list of FEN positions


    function playMoveSound() {
        new Audio('/sound/lichess/standard/Move.mp3').play()
    }

    useEffect(() => {
        fetch(`/api/games/${id}`) // Fetch the game data from the API
        .then(response => response.json())
        .then(data => setGame(data))
        .catch(error => console.error('Error fetching game data:', error))

        fetch(`/api/moves?game=${id}`) // Fetch the moves data from the API
        .then(response => response.json())
        .then(data => setMoves(data))
        .catch(error => console.error('Error fetching moves data:', error))
    }, [id])

    // Replay the game moves with chess.js to build a list of FEN positions
    useEffect(() => {
        if (moves.length === 0) return

        const chess = new Chess() // Create a new chess instance
        const fenList = [chess.fen()] // Add the initial FEN position -- no pieces moved yet

        for (const move of moves) {
            for (const side of [move.white_move, move.black_move]) {
                if (side) {
                    try{
                        chess.move({from: side.slice(0, 2), 
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
    }, [moves])

    if (!game || !moves.length) return <div>Loading...</div>

    return (
        <div>
            <h1>{game.white_player} vs {game.black_player}</h1>
            <p>{game.opening_line} -- {game.opening_category} -- {game.opening_family} -- {game.result}</p>
            <div className="[image-rendering:pixelated]">
                <Chessboard options={{ 
                    position: FENpositions[currentMoveIndex],
                    pieces: makePieceSet('monarchy', 'webp'), // use the piece set we created
                    darkSquareStyle: { backgroundColor: '#111' },
                    lightSquareStyle: { backgroundColor: '#zzz' },
                }} />
            </div>
                
            <p>Current FEN: {FENpositions[currentMoveIndex]}</p>

            <div>
                <button onClick={() => {setCurrentMoveIndex(currentMoveIndex + 1); playMoveSound()}}>Next</button>
                <button onClick={() => {setCurrentMoveIndex(currentMoveIndex - 1); playMoveSound()}}>Previous</button>
                <button onClick={() => {setCurrentMoveIndex(0); playMoveSound()}}>Start</button>
                <button onClick={() => {setCurrentMoveIndex(FENpositions.length - 1); playMoveSound()}}>End</button>
                <button onClick={() => {setCurrentMoveIndex(Math.floor(FENpositions.length / 2)); playMoveSound()}}>Middle</button>
                <button onClick={() => {setCurrentMoveIndex(Math.floor(FENpositions.length / 4)); playMoveSound()}}>Quarter</button>
            </div>
        </div>
    )
}

export default GameView