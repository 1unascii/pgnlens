import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ReportView from './ReportView'

// Mock recharts ResponsiveContainer
vi.mock('recharts', async () => {
    const actual = await vi.importActual('recharts')
    return {
        ...actual,
        ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
            <div style={{ width: 500, height: 400 }}>{children}</div>
        ),
    }
})

const mockReport = {
    id: 1,
    report_name: 'Test Report',
    player_name: 'TestPlayer',
    created_at: '2024-01-01',
    all_games_stats: {
        total_games: 10,
        wins: 6,
        losses: 3,
        draws: 1,
        win_rate: 60.0,
        opening_category_count: 2,
        opening_family_count: 3,
        opening_line_count: 5,
        opening_category_stats: {},
        opening_family_stats: {
            'Italian Game': { wins: 3, losses: 1, draws: 0, total: 4, win_rate: 75.0 },
            'Sicilian Defense': { wins: 2, losses: 2, draws: 1, total: 5, win_rate: 40.0 },
        },
        opening_line_stats: {
            'Giuoco Piano': { wins: 2, losses: 0, draws: 0, total: 2, win_rate: 100.0 },
            'Najdorf': { wins: 1, losses: 2, draws: 0, total: 3, win_rate: 33.3 },
        },
        family_to_lines: {
            'Italian Game': ['Giuoco Piano'],
            'Sicilian Defense': ['Najdorf'],
        },
    },
    player_is_white_stats: {
        total_games: 5,
        wins: 4,
        losses: 1,
        draws: 0,
        win_rate: 80.0,
        opening_category_count: 1,
        opening_family_count: 2,
        opening_line_count: 2,
        opening_category_stats: {},
        opening_family_stats: {},
        opening_line_stats: {},
        family_to_lines: {},
    },
    player_is_black_stats: {
        total_games: 5,
        wins: 2,
        losses: 2,
        draws: 1,
        win_rate: 40.0,
        opening_category_count: 1,
        opening_family_count: 2,
        opening_line_count: 3,
        opening_category_stats: {},
        opening_family_stats: {},
        opening_line_stats: {},
        family_to_lines: {},
    },
}

const mockGameCards = [
    {
        id: 1,
        white_player: 'TestPlayer',
        black_player: 'Opponent1',
        date: '2024-01-01',
        result: '1-0',
        termination: 'TestPlayer won',
        opening_line: 'Giuoco Piano',
        opening_family: 'Italian Game',
    },
    {
        id: 2,
        white_player: 'Opponent2',
        black_player: 'TestPlayer',
        date: '2024-01-02',
        result: '0-1',
        termination: 'TestPlayer won',
        opening_line: 'Najdorf',
        opening_family: 'Sicilian Defense',
    },
]

beforeEach(() => {
    vi.restoreAllMocks()
    Object.defineProperty(globalThis, 'localStorage', {
        value: {
            getItem: vi.fn(() => 'fake-token'),
            setItem: vi.fn(),
            removeItem: vi.fn(),
        },
        writable: true,
    })
    global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/games/')) {
            return Promise.resolve({
                json: () => Promise.resolve(mockGameCards),
            })
        }
        return Promise.resolve({
            json: () => Promise.resolve(mockReport),
        })
    })
})

function renderReportView() {
    return render(
        <MemoryRouter initialEntries={['/reports/1']}>
            <Routes>
                <Route path="/reports/:id" element={<ReportView />} />
            </Routes>
        </MemoryRouter>
    )
}

describe('ReportView', () => {

    it('shows loading initially', () => {
        global.fetch = vi.fn().mockReturnValue(new Promise(() => {}))
        renderReportView()
        expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('renders the report name', async () => {
        renderReportView()
        expect(await screen.findByText('Test Report')).toBeInTheDocument()
    })

    it('renders stat cards', async () => {
        renderReportView()
        expect(await screen.findByText('Total Games')).toBeInTheDocument()
        expect(screen.getByText('10')).toBeInTheDocument()
        expect(screen.getByText('Win Rate')).toBeInTheDocument()
        expect(screen.getByText('60%')).toBeInTheDocument()
    })

    it('renders opening families', async () => {
        renderReportView()
        expect(await screen.findByText('Italian Game')).toBeInTheDocument()
        expect(screen.getByText('Sicilian Defense')).toBeInTheDocument()
    })

    it('renders the All Openings section', async () => {
        renderReportView()
        expect(await screen.findByText('All Openings')).toBeInTheDocument()
    })

    it('renders the Lines That Need Practice section', async () => {
        renderReportView()
        expect(await screen.findByText('Lines That Need Practice')).toBeInTheDocument()
    })

    it('renders the search input', async () => {
        renderReportView()
        expect(await screen.findByPlaceholderText('Search openings...')).toBeInTheDocument()
    })

    it('renders the min games input', async () => {
        renderReportView()
        expect(await screen.findByText('Min games:')).toBeInTheDocument()
    })

    it('renders the color filter', async () => {
        renderReportView()
        expect(await screen.findByText('All Games')).toBeInTheDocument()
    })

    it('renders back link', async () => {
        renderReportView()
        expect(await screen.findByText('Back')).toBeInTheDocument()
    })

    it('renders sort buttons for all sections', async () => {
        renderReportView()
        await screen.findByText('Test Report')
        // Should have sort buttons for bar chart, all openings, and weak lines
        const byGamesButtons = screen.getAllByText('By Games')
        expect(byGamesButtons.length).toBe(3)
    })

    it('renders the Opening Performance heading', async () => {
        renderReportView()
        expect(await screen.findByText('Opening Performance')).toBeInTheDocument()
    })

    it('can change color filter', async () => {
        renderReportView()
        await screen.findByText('Test Report')
        const select = screen.getByRole('combobox')
        await userEvent.selectOptions(select, 'white')
        // Stats should update to white stats
        expect(screen.getByText('5')).toBeInTheDocument() // total_games for white
    })

    it('can change min games filter', async () => {
        renderReportView()
        await screen.findByText('Test Report')
        const input = screen.getByRole('spinbutton')
        await userEvent.clear(input)
        await userEvent.type(input, '5')
        // Openings with fewer than 5 games should be filtered out
    })

    it('can type in the search input', async () => {
        renderReportView()
        await screen.findByText('Test Report')
        const searchInput = screen.getByPlaceholderText('Search openings...')
        await userEvent.type(searchInput, 'Italian')
        expect(searchInput).toHaveValue('Italian')
    })
})
