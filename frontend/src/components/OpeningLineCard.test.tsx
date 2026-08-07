import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import OpeningLineCard from './OpeningLineCard'

const mockStats = {
    wins: 10, losses: 5, draws: 2,
    total: 17, win_rate: 58.8,
}

const mockGameCards = [
    {
        id: 1,
        white_player: 'Alice',
        black_player: 'Bob',
        date: '2026-07-15',
        result: '1-0',
        termination: 'Normal',
        opening_line: 'Sicilian Defense',
        opening_family: 'Sicilian',
    },
    {
        id: 2,
        white_player: 'Alice',
        black_player: 'Charlie',
        date: '2026-07-16',
        result: '0-1',
        termination: 'Resignation',
        opening_line: 'French Defense',
        opening_family: 'French',
    },
]

describe('OpeningLineCard', () => {

    it('renders name and stats', () => {
        render(
            <MemoryRouter>
                <OpeningLineCard
                    name="Sicilian Defense"
                    stats={mockStats}
                />
            </MemoryRouter>
        )
        expect(screen.getByText('Sicilian Defense'))
            .toBeInTheDocument()
        expect(screen.getByText('10W / 5L / 2D — 17 Games'))
            .toBeInTheDocument()
        expect(screen.getByText('58.8%'))
            .toBeInTheDocument()
    })

    it('uses parent styling by default', () => {
        render(
            <MemoryRouter>
                <OpeningLineCard
                    name="Sicilian Defense"
                    stats={mockStats}
                />
            </MemoryRouter>
        )
        expect(screen.getByText('Sicilian Defense')
            .closest('div'))
            .toHaveClass('shadow-sm')
    })

    it('uses child styling when variant is child', () => {
        render(
            <MemoryRouter>
                <OpeningLineCard
                    name="Sicilian Defense"
                    stats={mockStats}
                    variant="child"
                />
            </MemoryRouter>
        )
        expect(screen.getByText('Sicilian Defense')
            .closest('div'))
            .toHaveClass('ml-4')
    })

    it('shows cursor-pointer only when onToggle provided',
    () => {
        const { container, rerender } = render(
            <MemoryRouter>
                <OpeningLineCard
                    name="Sicilian Defense"
                    stats={mockStats}
                />
            </MemoryRouter>
        )
        const clickDiv = container.querySelector(
            '.cursor-pointer'
        )
        expect(clickDiv).toBeNull()

        rerender(
            <MemoryRouter>
                <OpeningLineCard
                    name="Sicilian Defense"
                    stats={mockStats}
                    onToggle={() => {}}
                />
            </MemoryRouter>
        )
        expect(container.querySelector(
            '.cursor-pointer'
        )).toBeTruthy()
    })

    it('clicking calls onToggle when provided',
    async () => {
        const onToggle = vi.fn()
        render(
            <MemoryRouter>
                <OpeningLineCard
                    name="Sicilian Defense"
                    stats={mockStats}
                    onToggle={onToggle}
                />
            </MemoryRouter>
        )
        await userEvent.click(
            screen.getByText('Sicilian Defense')
        )
        expect(onToggle).toHaveBeenCalledOnce()
    })

    it('shows game cards when isExpanded is true', () => {
        render(
            <MemoryRouter>
                <OpeningLineCard
                    name="Sicilian Defense"
                    stats={mockStats}
                    gameCards={mockGameCards}
                    isExpanded={true}
                    onToggle={() => {}}
                />
            </MemoryRouter>
        )
        expect(screen.getByText('Alice vs Bob'))
            .toBeInTheDocument()
    })

    it('hides game cards when isExpanded is false', () => {
        render(
            <MemoryRouter>
                <OpeningLineCard
                    name="Sicilian Defense"
                    stats={mockStats}
                    gameCards={mockGameCards}
                    isExpanded={false}
                    onToggle={() => {}}
                />
            </MemoryRouter>
        )
        expect(screen.queryByText('Alice vs Bob'))
            .toBeNull()
    })

    it('filters game cards by opening_line name', () => {
        render(
            <MemoryRouter>
                <OpeningLineCard
                    name="Sicilian Defense"
                    stats={mockStats}
                    gameCards={mockGameCards}
                    isExpanded={true}
                    onToggle={() => {}}
                />
            </MemoryRouter>
        )
        expect(screen.getByText('Alice vs Bob'))
            .toBeInTheDocument()
        expect(screen.queryByText('Alice vs Charlie'))
            .toBeNull()
    })
})