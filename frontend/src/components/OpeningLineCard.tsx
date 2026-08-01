import type { OpeningStats } from '../types'

interface OpeningLineCardProps {
    name: string
    stats: OpeningStats
}

function OpeningLineCard({ name, stats }: OpeningLineCardProps) {
    return (
        <div className="border rounded-lg p-4 shadow-sm">
            <h3 className="font-bold">{name}</h3>
            <p className="text-sm text-gray-500">
                {stats.wins}W / {stats.losses}L / {stats.draws}D — {stats.total} games
            </p>
            <p className={`text-lg font-bold ${stats.win_rate < 50 ? 'text-red-500' : 'text-green-500'}`}>
                {stats.win_rate}%
            </p>
        </div>
    )
}

export default OpeningLineCard