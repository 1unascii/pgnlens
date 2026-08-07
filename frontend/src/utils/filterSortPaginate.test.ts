import filterSortPaginate from './filterSortPaginate'

const mockStats = {
    'Sicilian Defense': {
        wins: 10, losses: 5, draws: 2,
        total: 17, win_rate: 58.8
    },
    'French Defense': {
        wins: 3, losses: 7, draws: 1,
        total: 11, win_rate: 27.3
    },
    'Italian Game': {
        wins: 2, losses: 1, draws: 0,
        total: 3, win_rate: 66.7
    },
    'London System': {
        wins: 1, losses: 4, draws: 1,
        total: 6, win_rate: 16.7
    },
    'King\'s Indian': {
        wins: 5, losses: 3, draws: 2,
        total: 10, win_rate: 50.0
    },
    'Caro-Kann': {
        wins: 1, losses: 0, draws: 0,
        total: 1, win_rate: 100.0
    },
}

describe('filterSortPaginate', () => {

    it('returns entries with total >= minimumGames', () => {
        const result = filterSortPaginate(
            mockStats, 5, 'total', 'desc', 0, Infinity
        )
        result.forEach(([, stats]) => {
            expect(stats.total).toBeGreaterThanOrEqual(5)
        })
    })

    it('filters out entries below minimumGames', () => {
        const result = filterSortPaginate(
            mockStats, 5, 'total', 'desc', 0, Infinity
        )
        const names = result.map(([name]) => name)
        expect(names).not.toContain('Italian Game')
        expect(names).not.toContain('Caro-Kann')
    })

    it('sorts descending when direction is desc', () => {
        const result = filterSortPaginate(
            mockStats, 1, 'total', 'desc', 0, Infinity
        )
        for (let i = 0; i < result.length - 1; i++) {
            expect(result[i][1].total)
                .toBeGreaterThanOrEqual(result[i + 1][1].total)
        }
    })

    it('sorts ascending when direction is asc', () => {
        const result = filterSortPaginate(
            mockStats, 1, 'total', 'asc', 0, Infinity
        )
        for (let i = 0; i < result.length - 1; i++) {
            expect(result[i][1].total)
                .toBeLessThanOrEqual(result[i + 1][1].total)
        }
    })

    it('sorts by total when sortField is total', () => {
        const result = filterSortPaginate(
            mockStats, 1, 'total', 'desc', 0, Infinity
        )
        expect(result[0][0]).toBe('Sicilian Defense')
    })

    it('sorts by win_rate when sortField is win_rate', () => {
        const result = filterSortPaginate(
            mockStats, 1, 'win_rate', 'desc', 0, Infinity
        )
        expect(result[0][0]).toBe('Caro-Kann')
    })

    it('returns correct page slice (page 0, 2 per page)',
    () => {
        const result = filterSortPaginate(
            mockStats, 1, 'total', 'desc', 0, 2
        )
        expect(result).toHaveLength(2)
    })

    it('returns correct page slice (page 1, 2 per page)',
    () => {
        const result = filterSortPaginate(
            mockStats, 1, 'total', 'desc', 1, 2
        )
        expect(result).toHaveLength(2)
        expect(result[0][0]).not.toBe('Sicilian Defense')
    })

    it('returns empty array when no entries pass filter',
    () => {
        const result = filterSortPaginate(
            mockStats, 100, 'total', 'desc', 0, Infinity
        )
        expect(result).toEqual([])
    })

    it('filters by winRateCap when provided', () => {
        const result = filterSortPaginate(
            mockStats, 1, 'win_rate', 'asc', 0, Infinity, 50
        )
        result.forEach(([, stats]) => {
            expect(stats.win_rate).toBeLessThan(50)
        })
        const names = result.map(([name]) => name)
        expect(names).toContain('French Defense')
        expect(names).toContain('London System')
        expect(names).not.toContain('Sicilian Defense')
    })

    it('returns all entries when winRateCap is undefined',
    () => {
        const result = filterSortPaginate(
            mockStats, 1, 'total', 'desc', 0, Infinity
        )
        expect(result).toHaveLength(6)
    })

    it('handles empty stats object', () => {
        const result = filterSortPaginate(
            {}, 1, 'total', 'desc', 0, Infinity
        )
        expect(result).toEqual([])
    })

    it('returns empty array for page beyond total items',
    () => {
        const result = filterSortPaginate(
            mockStats, 1, 'total', 'desc', 10, 5
        )
        expect(result).toEqual([])
    })
})