import { render, screen } from '@testing-library/react'
import StatCard from './StatCard'

describe('StatCard', () => {

    it('renders the label', () => {
        render(<StatCard label="Total Games" value={42} />)
        expect(screen.getByText('Total Games')).toBeInTheDocument()
    })

    it('renders a numeric value', () => {
        render(<StatCard label="Wins" value={10} />)
        expect(screen.getByText('10')).toBeInTheDocument()
    })

    it('renders a string value', () => {
        render(<StatCard label="Win Rate" value="75.0%" />)
        expect(screen.getByText('75.0%')).toBeInTheDocument()
    })
})