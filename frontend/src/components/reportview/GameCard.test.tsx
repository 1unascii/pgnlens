import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import GameCard from './GameCard'

// GameCard uses <Link> from react-router, so it needs to be
// wrapped in a Router for tests. MemoryRouter is the test-friendly
// version — it doesn't need a real browser URL.

const sampleGame = {
    id: 1,
    white_player: 'TestPlayer',
    black_player: 'Opponent',
    date: '2024-01-01',
    result: '1-0',
    termination: 'TestPlayer won by checkmate',
    opening_line: 'Italian Game',
    opening_family: 'Italian Game',
}

describe('GameCard', () => {

    it('renders player names', () => {
        render(
            <MemoryRouter>
                <GameCard game={sampleGame} />
            </MemoryRouter>
        )
        expect(screen.getAllByText(/TestPlayer/).length).toBeGreaterThan(0)
        expect(screen.getByText(/Opponent/)).toBeInTheDocument()
    })

    it('renders the date and result', () => {
        render(
            <MemoryRouter>
                <GameCard game={sampleGame} />
            </MemoryRouter>
        )
        expect(screen.getByText(/2024-01-01/)).toBeInTheDocument()
        expect(screen.getByText(/1-0/)).toBeInTheDocument()
    })

    it('links to game page without color when no playerName', () => {
        render(
            <MemoryRouter>
                <GameCard game={sampleGame} />
            </MemoryRouter>
        )
        const link = screen.getByRole('link')
        expect(link).toHaveAttribute('href', '/games/1')
    })

    it('links with color=white when player is white', () => {
        render(
            <MemoryRouter>
                <GameCard game={sampleGame} playerName="TestPlayer" />
            </MemoryRouter>
        )
        const link = screen.getByRole('link')
        expect(link).toHaveAttribute('href', '/games/1?color=white')
    })

    it('links with color=black when player is black', () => {
        render(
            <MemoryRouter>
                <GameCard game={sampleGame} playerName="Opponent" />
            </MemoryRouter>
        )
        const link = screen.getByRole('link')
        expect(link).toHaveAttribute('href', '/games/1?color=black')
    })
})