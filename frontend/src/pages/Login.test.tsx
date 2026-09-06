import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Login from './Login'

beforeEach(() => {
    vi.restoreAllMocks()
})

describe('Login', () => {

    it('renders the login form', () => {
        render(<Login />)
        expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Username')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
    })

    it('shows error on failed login', async () => {
        global.fetch = vi.fn().mockResolvedValue({ ok: false })
        render(<Login />)
        await userEvent.type(screen.getByPlaceholderText('Username'), 'baduser')
        await userEvent.type(screen.getByPlaceholderText('Password'), 'badpass')
        await userEvent.click(screen.getByRole('button', { name: 'Login' }))
        expect(await screen.findByText('Invalid username or password.')).toBeInTheDocument()
    })
})
