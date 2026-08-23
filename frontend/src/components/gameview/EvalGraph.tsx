import React from 'react'

interface EvalGraphProps {
    moves: { white_eval: number | null, black_eval: number | null, white_move: string, black_move: string }[]
    currentMoveIndex: number
    orientation: 'white' | 'black'
    onMoveClick: (halfMove: number) => void
}

// Convert centipawns to a Y position (0-100). 50 = equal.
// orientation='white': 0 = white winning (top), 100 = black winning (bottom)
// orientation='black': flipped — 0 = black winning (top), 100 = white winning (bottom)
function evalToY(centipawns: number | null, orientation: 'white' | 'black'): number {
    if (centipawns === null) return 50
    const clamped = Math.max(-1000, Math.min(1000, centipawns))
    const y = 50 - (clamped / 1000) * 50
    return orientation === 'black' ? 100 - y : y
}

// Horizontal eval graph showing advantage over the course of the game. Clickable to jump to a move.
function EvalGraph({ moves, currentMoveIndex, orientation, onMoveClick }: EvalGraphProps) {
    // Build (x, y) points from eval data — one per half-move
    const points: { x: number, y: number }[] = [{ x: 0, y: 50 }] // starting position is equal
    let halfMove = 0
    for (const move of moves) {
        if (move.white_move) { halfMove++; points.push({ x: halfMove, y: evalToY(move.white_eval, orientation) }) }
        if (move.black_move) { halfMove++; points.push({ x: halfMove, y: evalToY(move.black_eval, orientation) }) }
    }

    const totalHalfMoves = halfMove
    if (totalHalfMoves === 0) return null

    const width = 300, height = 80

    // Build SVG path from points
    const pathData = points.map((p, i) => {
        const x = (p.x / totalHalfMoves) * width
        const y = (p.y / 100) * height
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
    }).join(' ')

    // Fill the player's side with white. When orientation='white', white's area is below the eval line.
    // When orientation='black', flip it — white's area is above the eval line.
    const lastX = (points[points.length - 1].x / totalHalfMoves) * width
    const whiteFill = orientation === 'white'
        ? pathData + ` L ${lastX} ${height} L 0 ${height} Z`  // fill below (white on bottom)
        : pathData + ` L ${lastX} 0 L 0 0 Z`                  // fill above (white on top, black on bottom)

    // Green vertical line showing current position
    const currentX = (currentMoveIndex / totalHalfMoves) * width

    // Click handler: convert click position to a half-move index
    function handleClick(event: React.MouseEvent<SVGSVGElement>) {
        const rect = event.currentTarget.getBoundingClientRect()
        const ratio = (event.clientX - rect.left) / rect.width
        const targetMove = Math.round(ratio * totalHalfMoves)
        onMoveClick(Math.max(0, Math.min(totalHalfMoves, targetMove)))
    }

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-20 cursor-pointer" onClick={handleClick}>
            <rect width={width} height={height} fill="#1f2937" />                           {/* background (black's area) */}
            <path d={whiteFill} fill="white" />                                             {/* white's area (above eval line) */}
            <line x1="0" y1={height/2} x2={width} y2={height/2} stroke="#4b5563" strokeWidth="0.5" /> {/* centerline (equal) */}
            <path d={pathData} fill="none" stroke="#666" strokeWidth="0.5" />               {/* eval line border */}
            <line x1={currentX} y1="0" x2={currentX} y2={height} stroke="#22c55e" strokeWidth="1" /> {/* current position */}
        </svg>
    )
}

export default EvalGraph