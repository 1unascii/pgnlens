import { render, screen } from '@testing-library/react'
import GameIndex from './GameIndex'

describe('GameIndex', () => {

    it('renders the games page', () => {
        render(<GameIndex />)
        expect(screen.getByText('Games')).toBeInTheDocument()
    })
})
