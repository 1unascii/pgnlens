import { render, screen } from '@testing-library/react'
import PlayerBar from './PlayerBar'

describe('PlayerBar', () => {

    it('renders the player name', () => {
        render(<PlayerBar name="Magnus" elo={2850} capturedPieces={[]} />)
        expect(screen.getByText('Magnus')).toBeInTheDocument()
    })

    it('renders the elo in parentheses', () => {
        render(<PlayerBar name="Magnus" elo={2850} capturedPieces={[]} />)
        expect(screen.getByText('(2850)')).toBeInTheDocument()
    })

    it('does not render elo when null', () => {
        render(<PlayerBar name="Magnus" elo={null} capturedPieces={[]} />)
        expect(screen.queryByText(/\(/)).not.toBeInTheDocument()
    })

    it('renders captured pieces', () => {
        const { container } = render(
            <PlayerBar name="Magnus" elo={2850} capturedPieces={['P', 'N']} />
        )
        // Should render 2 piece icons
        const pieces = container.querySelectorAll('span > svg')
        expect(pieces.length).toBe(2)
    })
})