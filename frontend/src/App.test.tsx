import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import App from './App'

// Mock localStorage for Navbar
beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
        value: {
            getItem: vi.fn(() => null),
            setItem: vi.fn(),
            removeItem: vi.fn(),
        },
        writable: true,
    })
})

describe('App', () => {

    it('renders without crashing', () => {
        const { container } = render(<App />)
        expect(container.firstChild).toBeInTheDocument()
    })
})
