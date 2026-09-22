import { useRef } from 'react'
import { Chessboard } from 'react-chessboard'
import { makePieceSet } from '../../utils/chessHelpers'

interface OpeningLine {
    fen: string
    eco: string
    moves: string
}

interface OpeningLineScrollerProps {
    lines: Record<string, OpeningLine>
    onLineClick: (lineName: string) => void
}

// Horizontally scrollable row of opening line cards with left/right arrow buttons
function OpeningLineScroller({ lines, onLineClick }: OpeningLineScrollerProps) {
    const scrollRef = useRef<HTMLDivElement>(null)

    return (
        <div className="relative mb-3">
            {/* Left arrow */}
            <button
                onClick={() => scrollRef.current?.scrollBy({ left: -400, behavior: 'smooth' })}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10
                           bg-black/50 text-white rounded-full w-8 h-8
                           flex items-center justify-center hover:bg-black/70"
            >
                ‹
            </button>

            {/* Scrollable line cards */}
            <div
                ref={scrollRef}
                className="flex overflow-x-auto gap-3 p-3 px-10 border rounded hide-scrollbar"
                style={{ scrollbarWidth: 'none' }}
            >
                {Object.entries(lines).map(([lineName, line]) => (
                    <div
                        key={lineName}
                        onClick={() => onLineClick(lineName)}
                        className="cursor-pointer shrink-0 w-40 border rounded p-2
                                   hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <div className="w-36 h-36 mb-1">
                            <Chessboard options={{
                                position: line.fen,
                                pieces: makePieceSet('monarchy', 'webp'),
                                darkSquareStyle: { backgroundColor: '#999' },
                                lightSquareStyle: { backgroundColor: '#ddd' },
                                boardOrientation: line.fen.split(' ')[1] === 'w' ? 'black' : 'white',
                                allowDragging: false,
                                showNotation: false,
                            }} />
                        </div>
                        <p className="text-xs font-bold truncate">{lineName}</p>
                        <p className="text-xs text-gray-400">{line.eco}</p>
                    </div>
                ))}
            </div>

            {/* Right arrow */}
            <button
                onClick={() => scrollRef.current?.scrollBy({ left: 400, behavior: 'smooth' })}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10
                           bg-black/50 text-white rounded-full w-8 h-8
                           flex items-center justify-center hover:bg-black/70"
            >
                ›
            </button>
        </div>
    )
}

export default OpeningLineScroller
