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

const defaults = {
    minimumGames: 1,
    sortField: 'total' as const,
    sortDirection: 'desc' as const,
    page: 0,
    perPage: Infinity,
}

describe('filterSortPaginate', () => {

    it('returns entries with total >= minimumGames', () => {
        const result = filterSortPaginate(mockStats, {
            ...defaults, minimumGames: 5,
        })
        result.forEach(([, stats]) => {
            expect(stats.total).toBeGreaterThanOrEqual(5)
        })
    })

    it('filters out entries below minimumGames', () => {
        const result = filterSortPaginate(mockStats, {
            ...defaults, minimumGames: 5,
        })
        const names = result.map(([name]) => name)
        expect(names).not.toContain('Italian Game')
        expect(names).not.toContain('Caro-Kann')
    })

    it('sorts descending when direction is desc', () => {
        const result = filterSortPaginate(mockStats, {
            ...defaults, sortDirection: 'desc',
        })
        for (let i = 0; i < result.length - 1; i++) {
            expect(result[i][1].total)
                .toBeGreaterThanOrEqual(result[i + 1][1].total)
        }
    })

    it('sorts ascending when direction is asc', () => {
        const result = filterSortPaginate(mockStats, {
            ...defaults, sortDirection: 'asc',
        })
        for (let i = 0; i < result.length - 1; i++) {
            expect(result[i][1].total)
                .toBeLessThanOrEqual(result[i + 1][1].total)
        }
    })

    it('sorts by total when sortField is total', () => {
        const result = filterSortPaginate(mockStats, {
            ...defaults, sortField: 'total',
        })
        expect(result[0][0]).toBe('Sicilian Defense')
    })

    it('sorts by win_rate when sortField is win_rate', () => {
        const result = filterSortPaginate(mockStats, {
            ...defaults, sortField: 'win_rate',
        })
        expect(result[0][0]).toBe('Caro-Kann')
    })

    it('returns correct page slice (page 0, 2 per page)', () => {
        const result = filterSortPaginate(mockStats, {
            ...defaults, page: 0, perPage: 2,
        })
        expect(result).toHaveLength(2)
    })

    it('returns correct page slice (page 1, 2 per page)', () => {
        const result = filterSortPaginate(mockStats, {
            ...defaults, page: 1, perPage: 2,
        })
        expect(result).toHaveLength(2)
        expect(result[0][0]).not.toBe('Sicilian Defense')
    })

    it('returns empty array when no entries pass filter', () => {
        const result = filterSortPaginate(mockStats, {
            ...defaults, minimumGames: 100,
        })
        expect(result).toEqual([])
    })

    it('filters by winRateCap when provided', () => {
        const result = filterSortPaginate(mockStats, {
            ...defaults, sortField: 'win_rate',
            sortDirection: 'asc', winRateCap: 50,
        })
        result.forEach(([, stats]) => {
            expect(stats.win_rate).toBeLessThan(50)
        })
        const names = result.map(([name]) => name)
        expect(names).toContain('French Defense')
        expect(names).toContain('London System')
        expect(names).not.toContain('Sicilian Defense')
    })

    it('returns all entries when winRateCap is undefined', () => {
        const result = filterSortPaginate(mockStats, defaults)
        expect(result).toHaveLength(6)
    })

    it('handles empty stats object', () => {
        const result = filterSortPaginate({}, defaults)
        expect(result).toEqual([])
    })

    it('returns empty array for page beyond total items', () => {
        const result = filterSortPaginate(mockStats, {
            ...defaults, page: 10, perPage: 5,
        })
        expect(result).toEqual([])
    })

    it('filters by searchTerm', () => {
        const result = filterSortPaginate(mockStats, {
            ...defaults, searchTerm: 'sicilian',
        })
        expect(result).toHaveLength(1)
        expect(result[0][0]).toBe('Sicilian Defense')
    })

    it('searchTerm is case insensitive', () => {
        const result = filterSortPaginate(mockStats, {
            ...defaults, searchTerm: 'FRENCH',
        })
        expect(result).toHaveLength(1)
        expect(result[0][0]).toBe('French Defense')
    })

    it('returns all when searchTerm is empty', () => {
        const result = filterSortPaginate(mockStats, {
            ...defaults, searchTerm: '',
        })
        expect(result).toHaveLength(6)
    })
})
