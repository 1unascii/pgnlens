import { render, screen } from '@testing-library/react'
import InfoPanel from './InfoPanel'

const sampleMoves = [
    { white_move: 'e2e4', black_move: 'e7e5', white_classification: 'book',
      black_classification: 'book', white_eval: 30, black_eval: 20 },
]

const defaultProps = {
    classification: 'best',
    currentEval: 50,
    moves: sampleMoves,
    currentMoveIndex: 1,
    totalHalfMoves: 2,
    result: '1-0',
    termination: 'White won by checkmate',
    openingFamily: 'Italian Game',
    openingMatch: 'Giuoco Piano',
    orientation: 'white' as const,
    onMoveClick: () => {},
    onStart: () => {},
    onBack: () => {},
    onForward: () => {},
    onEnd: () => {},
}

describe('InfoPanel', () => {

    it('renders the result and termination', () => {
        render(<InfoPanel {...defaultProps} />)
        expect(screen.getByText(/1-0 — White won by checkmate/)).toBeInTheDocument()
    })

    it('renders the opening family', () => {
        render(<InfoPanel {...defaultProps} />)
        expect(screen.getByText('Italian Game')).toBeInTheDocument()
    })

    it('renders the opening match', () => {
        render(<InfoPanel {...defaultProps} />)
        expect(screen.getByText('Giuoco Piano')).toBeInTheDocument()
    })

    it('shows Starting Position when currentMoveIndex is 0', () => {
        render(<InfoPanel {...defaultProps} currentMoveIndex={0} />)
        expect(screen.getByText('Starting Position')).toBeInTheDocument()
    })

    it('renders the classification', () => {
        render(<InfoPanel {...defaultProps} />)
        expect(screen.getByText('best')).toBeInTheDocument()
    })

    it('renders eval display', () => {
        render(<InfoPanel {...defaultProps} />)
        expect(screen.getByText('+0.50')).toBeInTheDocument()
    })

    it('shows Analyzing when classification is null', () => {
        render(<InfoPanel {...defaultProps} classification={null} />)
        expect(screen.getByText('Analyzing...')).toBeInTheDocument()
    })

    it('renders the move counter', () => {
        render(<InfoPanel {...defaultProps} />)
        expect(screen.getByText('Move 1 / 2')).toBeInTheDocument()
    })
})
