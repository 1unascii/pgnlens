import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import Profile from './Profile'

beforeEach(() => {
    vi.restoreAllMocks()
    Object.defineProperty(globalThis, 'localStorage', {
        value: {
            getItem: vi.fn(() => 'fake-token'),
            setItem: vi.fn(),
            removeItem: vi.fn(),
        },
        writable: true,
    })
})

describe('Profile', () => {

    it('shows loading initially', () => {
        global.fetch = vi.fn().mockResolvedValue({
            json: () => Promise.resolve({ username: 'testuser', email: 'test@test.com' }),
        })
        render(<Profile />)
        expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('shows user data after fetch', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            json: () => Promise.resolve({ username: 'testuser', email: 'test@test.com' }),
        })
        render(<Profile />)
        expect(await screen.findByText('testuser')).toBeInTheDocument()
        expect(screen.getByText('test@test.com')).toBeInTheDocument()
    })
})
