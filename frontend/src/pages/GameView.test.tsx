import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import GameView from './GameView'

// Mock chessboard since it needs canvas/WebGL
vi.mock('react-chessboard', () => ({
    Chessboard: () => <div data-testid="chessboard">Chessboard</div>,
}))

const mockGame = {
    id: 1,
    event: 'Test',
    site: 'Test',
    date: '2024-01-01',
    round: null,
    white_player: 'TestPlayer',
    black_player: 'Opponent',
    result: '1-0',
    white_elo: 1000,
    black_elo: 1000,
    time_control: '600',
    end_time: null,
    termination: 'TestPlayer won by checkmate',
    eco_code: 'C50',
    first_moves: 'e2e4 e7e5',
    opening_category: 'Open Game',
    fen_matches_array: ['Italian Game'],
    opening_line: 'Italian Game',
    opening_family: 'Italian Game',
    analysis_complete: true,
    moves: [
        {
            move_number: 1,
            white_move: 'e2e4',
            black_move: 'e7e5',
            white_eval: 30,
            black_eval: 20,
            white_classification: 'book',
            black_classification: 'book',
        },
    ],
}

beforeEach(() => {
    vi.restoreAllMocks()
    // Mock fetch to return game data and eco.json
    // eco.json needs at least one entry so the FEN computation loop runs
    const mockEco: Record<string, { eco: string, name: string }> = {
        'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1': { eco: 'B00', name: 'Kings Pawn' },
    }
    global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/data/eco.json')) {
            return Promise.resolve({
                json: () => Promise.resolve(mockEco),
            })
        }
        if (url.includes('/api/games/1/analyze')) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ game_id: 1, moves: mockGame.moves }),
            })
        }
        return Promise.resolve({
            json: () => Promise.resolve(mockGame),
        })
    })
    // Mock Audio
    global.Audio = vi.fn().mockImplementation(() => ({
        play: vi.fn().mockResolvedValue(undefined),
    }))
})

function renderGameView() {
    return render(
        <MemoryRouter initialEntries={['/games/1']}>
            <Routes>
                <Route path="/games/:id" element={<GameView />} />
            </Routes>
        </MemoryRouter>
    )
}

describe('GameView', () => {

    it('shows loading initially', () => {
        // Override fetch to never resolve
        global.fetch = vi.fn().mockReturnValue(new Promise(() => {}))
        renderGameView()
        expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('renders the chessboard after data loads', async () => {
        renderGameView()
        expect(await screen.findByTestId('chessboard')).toBeInTheDocument()
    })

    it('renders player names', async () => {
        renderGameView()
        expect(await screen.findByText('TestPlayer')).toBeInTheDocument()
        expect(screen.getByText('Opponent')).toBeInTheDocument()
    })

    it('renders the result and termination', async () => {
        renderGameView()
        expect(await screen.findByText(/1-0 — TestPlayer won by checkmate/)).toBeInTheDocument()
    })
})
