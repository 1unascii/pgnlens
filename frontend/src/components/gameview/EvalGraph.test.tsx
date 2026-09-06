import { render } from '@testing-library/react'
import EvalGraph from './EvalGraph'

const sampleMoves = [
    { white_move: 'e2e4', black_move: 'e7e5', white_eval: 30, black_eval: 20 },
    { white_move: 'g1f3', black_move: 'b8c6', white_eval: 50, black_eval: 40 },
]

describe('EvalGraph', () => {

    it('renders an SVG', () => {
        const { container } = render(
            <EvalGraph moves={sampleMoves} currentMoveIndex={0} orientation="white" onMoveClick={() => {}} />
        )
        expect(container.querySelector('svg')).toBeInTheDocument()
    })

    it('returns null when no moves', () => {
        const { container } = render(
            <EvalGraph moves={[]} currentMoveIndex={0} orientation="white" onMoveClick={() => {}} />
        )
        expect(container.firstChild).toBeNull()
    })

    it('renders a green current-position line', () => {
        const { container } = render(
            <EvalGraph moves={sampleMoves} currentMoveIndex={2} orientation="white" onMoveClick={() => {}} />
        )
        const greenLine = container.querySelector('line[stroke="#22c55e"]')
        expect(greenLine).toBeInTheDocument()
    })

    it('renders the white fill path', () => {
        const { container } = render(
            <EvalGraph moves={sampleMoves} currentMoveIndex={0} orientation="white" onMoveClick={() => {}} />
        )
        const paths = container.querySelectorAll('path')
        expect(paths.length).toBeGreaterThanOrEqual(1)
    })

    it('handles null evals gracefully', () => {
        const movesWithNull = [
            { white_move: 'e2e4', black_move: 'e7e5', white_eval: null, black_eval: null },
        ]
        const { container } = render(
            <EvalGraph moves={movesWithNull} currentMoveIndex={0} orientation="white" onMoveClick={() => {}} />
        )
        expect(container.querySelector('svg')).toBeInTheDocument()
    })
})
