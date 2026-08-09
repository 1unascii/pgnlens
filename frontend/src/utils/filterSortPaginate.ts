import type { OpeningStats } from "../types"

interface FilterSortPaginateOptions {
    minimumGames: number
    sortField: 'total' | 'win_rate'
    sortDirection: 'asc' | 'desc'
    page: number
    perPage: number
    winRateCap?: number
    searchTerm?: string
}

function filterSortPaginate(
    stats: Record<string, OpeningStats>,
    options: FilterSortPaginateOptions
) {
    const { minimumGames, sortField, sortDirection,
            page, perPage, winRateCap, searchTerm } = options

    return Object.entries(stats)
        .filter(([name, s]) =>
            s.total >= minimumGames
            && (winRateCap === undefined || s.win_rate < winRateCap)
            && (!searchTerm || name.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        .sort((a, b) =>
            sortDirection === 'desc'
                ? b[1][sortField] - a[1][sortField]
                : a[1][sortField] - b[1][sortField]
        )
        .slice(page * perPage, (page + 1) * perPage)
}

export default filterSortPaginate