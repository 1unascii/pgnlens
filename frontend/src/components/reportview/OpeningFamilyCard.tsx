import type { OpeningStats, ReportStats, GameCardData } from '../types'
import OpeningLineCard from './OpeningLineCard'

interface OpeningFamilyCardProps {
    name: string
    stats: OpeningStats
    isExpanded: boolean
    onToggle: () => void
    reportStats: ReportStats
    gameCards: GameCardData[]
    expandedLine: string | null
    onLineToggle: (lineName: string) => void
    playerName?: string
}

function OpeningFamilyCard({ 
    name, 
    stats, 
    isExpanded, 
    onToggle, 
    reportStats, 
    gameCards, 
    expandedLine, 
    onLineToggle, 
    playerName 
    }: OpeningFamilyCardProps) 
{
    return (
        <div className="cursor-pointer" onClick={onToggle}>
            <OpeningLineCard name={name} stats={stats} playerName={playerName} />

            {isExpanded && (
                <div className="mt-4 space-y-2" onClick={(e) => e.stopPropagation()}>
                    {(reportStats.family_to_lines[name] || []).map(lineName => {
                        const lineStats = reportStats.opening_line_stats[lineName]
                        if (!lineStats) return null
                        return (
                            <OpeningLineCard
                                key={lineName}
                                name={lineName}
                                stats={lineStats}
                                variant="child"
                                gameCards={gameCards}
                                isExpanded={expandedLine === lineName}
                                onToggle={() => onLineToggle(lineName)}
                                gameCardVariant="childOfChild"
                                playerName={playerName}
                            />
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default OpeningFamilyCard