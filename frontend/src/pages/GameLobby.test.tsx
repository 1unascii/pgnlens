import { render, screen } from '@testing-library/react'
import GameLobby from './GameLobby'

describe('GameLobby', () => {

    it('renders the practice page', () => {
        render(<GameLobby />)
        expect(screen.getByText('Practice')).toBeInTheDocument()
        expect(screen.getByText('Coming soon.')).toBeInTheDocument()
    })
})
