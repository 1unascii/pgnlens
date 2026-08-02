import type { OpeningStats, Report, GameCardData } from '../types'
import GameCard from './GameCard'
import OpeningLineCard from './OpeningLineCard'

interface OpeningFamilyCardProps {
    name: string
    stats: OpeningStats
    isExpanded: boolean
    onToggle: () => void
    report: Report
    gameCards: GameCardData[]
    expandedLine: string | null
    onLineToggle: (lineName: string) => void
}

function OpeningFamilyCard({ name, stats, isExpanded, onToggle, report, gameCards, expandedLine, onLineToggle }: OpeningFamilyCardProps) {
    return (
        <div className="cursor-pointer" onClick={onToggle}>
            <OpeningLineCard name={name} stats={stats} />

            {isExpanded && (
                <div className="mt-4 space-y-2" onClick={(e) => e.stopPropagation()}>
                    {(report.family_to_lines[name] || []).map(lineName => {
                        const lineStats = report.opening_line_stats[lineName]
                        if (!lineStats) return null
                        return (
                            <div key={lineName}>
                                <div onClick={() => onLineToggle(lineName)} className="cursor-pointer">
                                    <OpeningLineCard name={lineName} stats={lineStats} variant="child" />
                                </div>
                                {expandedLine === lineName && (
                                    <div className="mt-2 space-y-2">
                                        {gameCards
                                            .filter(game => game.opening_line === lineName)
                                            .map(game => (
                                                <GameCard key={game.id} game={game} variant="childOfChild" />
                                            ))
                                        }
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default OpeningFamilyCard