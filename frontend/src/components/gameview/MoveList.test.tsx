import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MoveList from './MoveList'

// Sample moves for testing
const sampleMoves = [
    { white_move: 'e2e4', black_move: 'e7e5', white_classification: 'book', black_classification: 'book' },
    { white_move: 'g1f3', black_move: 'b8c6', white_classification: 'best', black_classification: 'best' },
]

describe('MoveList', () => {

    it('renders move numbers', () => {
        render(
            <MoveList moves={sampleMoves} currentMoveIndex={0} result="1-0" onMoveClick={() => {}} />
        )
        expect(screen.getByText('1.')).toBeInTheDocument()
        expect(screen.getByText('2.')).toBeInTheDocument()
    })

    it('renders white and black moves', () => {
        render(
            <MoveList moves={sampleMoves} currentMoveIndex={0} result="1-0" onMoveClick={() => {}} />
        )
        expect(screen.getByText('e2e4')).toBeInTheDocument()
        expect(screen.getByText('e7e5')).toBeInTheDocument()
    })

    it('renders the result at the bottom', () => {
        render(
            <MoveList moves={sampleMoves} currentMoveIndex={0} result="1-0" onMoveClick={() => {}} />
        )
        expect(screen.getByText('1-0')).toBeInTheDocument()
    })

    it('highlights the current move', () => {
        render(
            <MoveList moves={sampleMoves} currentMoveIndex={1} result="1-0" onMoveClick={() => {}} />
        )
        // Move index 1 = first white move (e2e4)
        const whiteMove = screen.getByText('e2e4')
        expect(whiteMove).toHaveClass('bg-gray-700')
    })

    it('calls onMoveClick with the correct half-move index', async () => {
        const onMoveClick = vi.fn()
        render(
            <MoveList moves={sampleMoves} currentMoveIndex={0} result="1-0" onMoveClick={onMoveClick} />
        )
        // Click the first white move — should be half-move 1
        await userEvent.click(screen.getByText('e2e4'))
        expect(onMoveClick).toHaveBeenCalledWith(1)

        // Click the first black move — should be half-move 2
        await userEvent.click(screen.getByText('e7e5'))
        expect(onMoveClick).toHaveBeenCalledWith(2)
    })

    it('handles games where black has no last move', () => {
        const movesWithNoBlack = [
            { white_move: 'e2e4', black_move: '', white_classification: 'book', black_classification: '' },
        ]
        const { container } = render(
            <MoveList moves={movesWithNoBlack} currentMoveIndex={0} result="1-0" onMoveClick={() => {}} />
        )
        expect(screen.getByText('e2e4')).toBeInTheDocument()
        // Should only have 1 clickable move span (white), not 2
        const moveSpans = container.querySelectorAll('.cursor-pointer')
        expect(moveSpans.length).toBe(1)
    })
})