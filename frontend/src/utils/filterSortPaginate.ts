import type { OpeningStats } from "../types"

// Each card in the ReportView is filtered, sorted, and paginated independently.
function filterSortPaginate(
    stats: Record<string, OpeningStats>,
    minimumGames: number,
    sortField: 'total' | 'win_rate',
    sortDirection: 'asc' | 'desc',
    page: number,
    perPage: number,
    winRateCap?: number
) {
    return Object.entries(stats)
        .filter(([, s]) => s.total >= minimumGames
            && (winRateCap === undefined
                || s.win_rate < winRateCap))
        .sort((a, b) =>
            sortDirection === 'desc'
                ? b[1][sortField] - a[1][sortField]
                : a[1][sortField] - b[1][sortField]
        )
        .slice(page * perPage, (page + 1) * perPage)
}

export default filterSortPaginate