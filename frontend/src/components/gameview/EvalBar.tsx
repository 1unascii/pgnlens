import React, { useRef } from 'react'

interface EvalBarProps {
    centipawns: number | null
    orientation: 'white' | 'black'
}

function evalToPercent(centipawns: number): number {
    return 50 + 50 * (
        2 / (1 + Math.exp(-0.00368208 * centipawns)) - 1
    )
}

function EvalBar({ centipawns, orientation }: EvalBarProps) {
    // Remember the last known eval so the bar doesn't reset when data is temporarily null
    const lastEval = useRef(0)
    if (centipawns !== null) lastEval.current = centipawns
    const whitePercent = evalToPercent(lastEval.current)

    // Format the display value using the resolved eval (handles null via ref)
    const displayEval = lastEval.current
    let displayValue: string
    if (displayEval >= 10000) {
        displayValue = 'M'
    } else if (displayEval <= -10000) {
        displayValue = 'M'
    } else {
        displayValue = (Math.abs(displayEval) / 100).toFixed(1)
    }

    // Bottom of bar = the player's color (matches board orientation)
    // orientation='white' → white on bottom (light), black on top (dark)
    // orientation='black' → black on bottom (dark), white on top (light)
    const topColor = orientation === 'white' ? 'bg-gray-800' : 'bg-white'
    const bottomColor = orientation === 'white' ? 'bg-white' : 'bg-gray-800'
    const topTextColor = orientation === 'white' ? 'text-white' : 'text-black'
    const bottomTextColor = orientation === 'white' ? 'text-black' : 'text-white'
    const topPercent = orientation === 'white' ? 100 - whitePercent : whitePercent
    const bottomPercent = orientation === 'white' ? whitePercent : 100 - whitePercent
    const showOnTop = orientation === 'white' ? displayEval < 0 : displayEval >= 0
    const showOnBottom = !showOnTop

    return (
        <div className="w-10 h-[768px] flex flex-col
            border rounded overflow-hidden">
            <div
                className={`${topColor} flex items-start
                    justify-center ${topTextColor}
                    text-xs pt-1`}
                style={{ height: `${topPercent}%` }}
            >
                {showOnTop && displayValue}
            </div>
            <div
                className={`${bottomColor} flex items-end
                    justify-center ${bottomTextColor}
                    text-xs pb-1`}
                style={{ height: `${bottomPercent}%` }}
            >
                {showOnBottom && displayValue}
            </div>
        </div>
    )
}

export default React.memo(EvalBar)