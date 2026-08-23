import MoveList from './MoveList'
import NavButtons from './NavButtons'
import EvalGraph from './EvalGraph'

// Color classes for each move classification level
const classificationColors: Record<string, string> = {
    book: 'text-gray-400',      best: 'text-green-500',
    excellent: 'text-green-400', good: 'text-green-300',
    inaccuracy: 'text-yellow-500', mistake: 'text-orange-500',
    blunder: 'text-red-500',
}

interface InfoPanelProps {
    classification: string | null  // current move's classification
    currentEval: number | null     // centipawns from white's perspective
    moves: { white_move: string, black_move: string, white_classification: string,
        black_classification: string, white_eval: number | null, black_eval: number | null }[]    
    currentMoveIndex: number       // current half-move index (0 = starting position)
    totalHalfMoves: number         // total half-moves in the game
    result: string                 // e.g. "1-0", "0-1", "1/2-1/2"
    termination: string            // e.g. "Time forfeit", "Resignation"
    openingFamily: string          // e.g. "Sicilian Defense"
    openingMatch: string | null    // current ECO opening name or null
    orientation: 'white' | 'black' // board orientation — flips the eval graph
    onMoveClick: (halfMove: number) => void
    onStart: () => void
    onBack: () => void
    onForward: () => void
    onEnd: () => void
}

// Right-side panel showing move classification, move list, opening info, game result, and nav buttons.
function InfoPanel({ classification, currentEval, moves, currentMoveIndex, totalHalfMoves,
    result, termination, openingFamily, openingMatch, orientation, onMoveClick,
    onStart, onBack, onForward, onEnd }: InfoPanelProps) {

    // Format eval as +1.20 or -0.50
    const evalDisplay = currentEval !== null
        ? `${currentEval >= 0 ? '+' : ''}${(currentEval / 100).toFixed(2)}`
        : null

    // Show "Starting Position" when no moves played, otherwise the current opening name
    const openingDisplay = currentMoveIndex === 0
        ? 'Starting Position'
        : openingMatch || openingFamily || 'Unknown opening'

    return (
        <div className="w-[350px] flex flex-col gap-2 bg-gray-900 text-white rounded-lg p-4">
            {/* Game info — result, opening family, opening line at top */}
            <div className="text-sm border-b border-gray-700 pb-2">
                <p className="font-semibold">{result} — {termination}</p>
                <p className="text-gray-400">{openingFamily}</p>
                <p className="text-gray-400">{openingDisplay}</p>
            </div>

            {/* Classification callout — shows current move's rating and eval */}
            <div className="bg-gray-800 rounded p-3">
                {classification ? (
                    <>
                        <span className={`font-bold ${classificationColors[classification] || 'text-gray-500'}`}>
                            {classification}
                        </span>
                        {evalDisplay && <span className="float-right text-sm">{evalDisplay}</span>}
                    </>
                ) : (
                    <span className="text-gray-500">Analyzing...</span>
                )}
            </div>

            {/* Move counter */}
            <div className="text-sm text-gray-400">Move {currentMoveIndex} / {totalHalfMoves}</div>

            {/* Scrollable move list */}
            <MoveList moves={moves} currentMoveIndex={currentMoveIndex} result={result} onMoveClick={onMoveClick} />

            {/* Move navigation */}
            <NavButtons onStart={onStart} onBack={onBack} onForward={onForward} onEnd={onEnd} />

            {/* Eval graph — clickable to jump to a position */}
            <EvalGraph moves={moves} currentMoveIndex={currentMoveIndex} orientation={orientation} onMoveClick={onMoveClick} />
        </div>
    )
}

export default InfoPanel