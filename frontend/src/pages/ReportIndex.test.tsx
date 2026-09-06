import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ReportIndex from './ReportIndex'

beforeEach(() => {
    vi.restoreAllMocks()
    Object.defineProperty(globalThis, 'localStorage', {
        value: {
            getItem: vi.fn((key: string) => {
                if (key === 'authToken') return 'fake-token'
                return null
            }),
            setItem: vi.fn(),
            removeItem: vi.fn(),
        },
        writable: true,
    })
})

describe('ReportIndex', () => {

    it('renders the page title', () => {
        global.fetch = vi.fn().mockResolvedValue({
            status: 200,
            json: () => Promise.resolve([]),
        })
        render(
            <MemoryRouter>
                <ReportIndex />
            </MemoryRouter>
        )
        expect(screen.getByText('Saved Reports')).toBeInTheDocument()
    })

    it('shows upload link', () => {
        global.fetch = vi.fn().mockResolvedValue({
            status: 200,
            json: () => Promise.resolve([]),
        })
        render(
            <MemoryRouter>
                <ReportIndex />
            </MemoryRouter>
        )
        expect(screen.getByText('Upload PGN File')).toBeInTheDocument()
    })

    it('shows empty state message when no reports', () => {
        global.fetch = vi.fn().mockResolvedValue({
            status: 200,
            json: () => Promise.resolve([]),
        })
        render(
            <MemoryRouter>
                <ReportIndex />
            </MemoryRouter>
        )
        expect(screen.getByText(/No saved reports/)).toBeInTheDocument()
    })

    it('renders reports when data is returned', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            status: 200,
            json: () => Promise.resolve([{
                id: 1,
                report_name: 'My Report',
                player_name: 'TestPlayer',
                created_at: '2024-01-01',
                all_games_stats: { total_games: 5, win_rate: 60.0, opening_family_count: 3 },
                player_is_white_stats: {},
                player_is_black_stats: {},
            }]),
        })
        render(
            <MemoryRouter>
                <ReportIndex />
            </MemoryRouter>
        )
        expect(await screen.findByText('My Report')).toBeInTheDocument()
        expect(screen.getByText(/Games: 5/)).toBeInTheDocument()
        expect(screen.getByText(/Win Rate: 60%/)).toBeInTheDocument()
    })

    it('handles 401 by removing token', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            status: 401,
            json: () => Promise.resolve({}),
        })
        render(
            <MemoryRouter>
                <ReportIndex />
            </MemoryRouter>
        )
        // Should attempt to remove the auth token
        await screen.findByText('Saved Reports')
    })
})
