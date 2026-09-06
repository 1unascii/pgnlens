import { render } from '@testing-library/react'
import EvalBar from './EvalBar'

describe('EvalBar', () => {

    it('renders without crashing', () => {
        const { container } = render(<EvalBar centipawns={0} orientation="white" />)
        expect(container.firstChild).toBeInTheDocument()
    })

    it('shows equal position at roughly 50/50', () => {
        const { container } = render(<EvalBar centipawns={0} orientation="white" />)
        const divs = container.querySelectorAll('div > div')
        expect(divs.length).toBeGreaterThanOrEqual(2)
    })

    it('shows white advantage when centipawns positive', () => {
        const { container } = render(<EvalBar centipawns={500} orientation="white" />)
        expect(container.textContent).toContain('5.0')
    })

    it('shows black advantage when centipawns negative', () => {
        const { container } = render(<EvalBar centipawns={-300} orientation="white" />)
        expect(container.textContent).toContain('3.0')
    })

    it('shows M for mate scores', () => {
        const { container } = render(<EvalBar centipawns={10000} orientation="white" />)
        expect(container.textContent).toContain('M')
    })

    it('handles null centipawns without crashing', () => {
        const { container } = render(<EvalBar centipawns={null} orientation="white" />)
        expect(container.firstChild).toBeInTheDocument()
    })

    it('flips colors when orientation is black', () => {
        const { container } = render(<EvalBar centipawns={0} orientation="black" />)
        const divs = container.querySelectorAll('div > div > div')
        expect(divs[0]).toHaveClass('bg-white')
    })
})
