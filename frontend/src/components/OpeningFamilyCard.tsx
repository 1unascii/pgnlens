import type { OpeningStats, Report } from '../types'
import OpeningLineCard from './OpeningLineCard'

interface OpeningFamilyCardProps {
    name: string
    stats: OpeningStats
    isExpanded: boolean
    onToggle: () => void
    report: Report
}

function OpeningFamilyCard({ name, stats, isExpanded, onToggle, report }: OpeningFamilyCardProps) {
    return (
        <div className="cursor-pointer" onClick={onToggle}>
            <OpeningLineCard name={name} stats={stats} />

            {isExpanded && (
                <div className="mt-4 space-y-2">
                    {(report.family_to_lines[name] || []).map(lineName => {
                        const lineStats = report.opening_line_stats[lineName]
                        if (!lineStats) return null
                        return <OpeningLineCard key={lineName} name={lineName} stats={lineStats} />
                    })}
                </div>
            )}
        </div>
    )
}

export default OpeningFamilyCard