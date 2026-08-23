interface MoveListProps {
    moves: {
        white_move: string
        black_move: string
        white_classification: string
        black_classification: string
    }[]
    currentMoveIndex: number
    result: string
    onMoveClick: (halfMove: number) => void
}

function MoveList({ moves, currentMoveIndex, result, onMoveClick }: MoveListProps) {
    return (
        <div className="flex-1 overflow-y-auto max-h-[400px]">
            {moves.map((move, index) => (
                <div key={index} className="flex text-sm border-b border-gray-700 py-1">
                    <span className="w-8 text-gray-400">{index + 1}.</span>
                    <span
                        className={`flex-1 cursor-pointer hover:bg-gray-700 px-2 rounded ${currentMoveIndex === index * 2 + 1 ? 'bg-gray-700' : ''}`}
                        onClick={() => onMoveClick(index * 2 + 1)}
                    >
                        {move.white_move}
                    </span>
                    {move.black_move && (
                        <span
                            className={`flex-1 cursor-pointer hover:bg-gray-700 px-2 rounded ${currentMoveIndex === index * 2 + 2 ? 'bg-gray-700' : ''}`}
                            onClick={() => onMoveClick(index * 2 + 2)}
                        >
                            {move.black_move}
                        </span>
                    )}
                </div>
            ))}
            <div className="text-sm text-gray-400 py-1">{result}</div>
        </div>
    )
}

export default MoveList