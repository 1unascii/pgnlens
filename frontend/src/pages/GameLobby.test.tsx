import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import GameLobby from './GameLobby'

beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
        value: {
            getItem: vi.fn(() => 'fake-token'),
            setItem: vi.fn(),
            removeItem: vi.fn(),
        },
        writable: true,
    })
})

describe('GameLobby', () => {

    it('renders the play page', () => {
        render(
            <MemoryRouter>
                <GameLobby />
            </MemoryRouter>
        )
        expect(screen.getByText('Play')).toBeInTheDocument()
        expect(screen.getByText('Create Game')).toBeInTheDocument()
    })
})
