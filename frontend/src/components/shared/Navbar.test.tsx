import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Navbar from './Navbar'

// Mock localStorage since the threads pool doesn't provide it
const mockStorage: Record<string, string> = {}

beforeEach(() => {
    Object.keys(mockStorage).forEach(key => delete mockStorage[key])
    Object.defineProperty(globalThis, 'localStorage', {
        value: {
            getItem: vi.fn((key: string) => mockStorage[key] ?? null),
            setItem: vi.fn((key: string, value: string) => { mockStorage[key] = value }),
            removeItem: vi.fn((key: string) => { delete mockStorage[key] }),
        },
        writable: true,
    })
})

describe('Navbar', () => {

    it('renders Analyze and Practice links', () => {
        render(
            <MemoryRouter>
                <Navbar />
            </MemoryRouter>
        )
        expect(screen.getByText('Analyze')).toBeInTheDocument()
        expect(screen.getByText('Practice')).toBeInTheDocument()
    })

    it('shows Login and Register when logged out', () => {
        render(
            <MemoryRouter>
                <Navbar />
            </MemoryRouter>
        )
        expect(screen.getByText('Login')).toBeInTheDocument()
        expect(screen.getByText('Register')).toBeInTheDocument()
    })

    it('shows Logout and Profile when logged in', () => {
        mockStorage['authToken'] = 'fake-token'
        render(
            <MemoryRouter>
                <Navbar />
            </MemoryRouter>
        )
        expect(screen.getByText('Logout')).toBeInTheDocument()
        expect(screen.getByText('Profile')).toBeInTheDocument()
    })

    it('renders a theme toggle button', () => {
        render(
            <MemoryRouter>
                <Navbar />
            </MemoryRouter>
        )
        const buttons = screen.getAllByRole('button')
        expect(buttons.length).toBeGreaterThanOrEqual(1)
    })
})
