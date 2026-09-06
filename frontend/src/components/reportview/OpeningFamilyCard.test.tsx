import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import OpeningFamilyCard from './OpeningFamilyCard'

const defaultProps = {
    name: 'Italian Game',
    stats: { wins: 5, losses: 3, draws: 2, total: 10, win_rate: 50.0 },
    isExpanded: false,
    onToggle: vi.fn(),
    reportStats: {
        total_games: 10,
        wins: 5, losses: 3, draws: 2, win_rate: 50.0,
        opening_category_count: 1, opening_family_count: 1, opening_line_count: 2,
        opening_category_stats: {},
        opening_family_stats: {},
        opening_line_stats: {
            'Giuoco Piano': { wins: 3, losses: 1, draws: 1, total: 5, win_rate: 60.0 },
            'Two Knights': { wins: 2, losses: 2, draws: 1, total: 5, win_rate: 40.0 },
        },
        family_to_lines: { 'Italian Game': ['Giuoco Piano', 'Two Knights'] },
    },
    gameCards: [],
    expandedLine: null,
    onLineToggle: vi.fn(),
}

describe('OpeningFamilyCard', () => {

    it('renders the family name', () => {
        render(
            <MemoryRouter>
                <OpeningFamilyCard {...defaultProps} />
            </MemoryRouter>
        )
        expect(screen.getByText('Italian Game')).toBeInTheDocument()
    })

    it('calls onToggle when clicked', async () => {
        const onToggle = vi.fn()
        render(
            <MemoryRouter>
                <OpeningFamilyCard {...defaultProps} onToggle={onToggle} />
            </MemoryRouter>
        )
        await userEvent.click(screen.getByText('Italian Game'))
        expect(onToggle).toHaveBeenCalledOnce()
    })

    it('shows line cards when expanded', () => {
        render(
            <MemoryRouter>
                <OpeningFamilyCard {...defaultProps} isExpanded={true} />
            </MemoryRouter>
        )
        expect(screen.getByText('Giuoco Piano')).toBeInTheDocument()
        expect(screen.getByText('Two Knights')).toBeInTheDocument()
    })

    it('does not show line cards when collapsed', () => {
        render(
            <MemoryRouter>
                <OpeningFamilyCard {...defaultProps} isExpanded={false} />
            </MemoryRouter>
        )
        expect(screen.queryByText('Giuoco Piano')).not.toBeInTheDocument()
    })
})
