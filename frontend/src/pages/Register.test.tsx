import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Register from './Register'

beforeEach(() => {
    vi.restoreAllMocks()
})

describe('Register', () => {

    it('renders the registration form', () => {
        render(<Register />)
        expect(screen.getByRole('heading', { name: 'Register' })).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Username')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Confirm password')).toBeInTheDocument()
    })

    it('shows success message on successful registration', async () => {
        global.fetch = vi.fn().mockResolvedValue({ ok: true })
        render(<Register />)
        await userEvent.type(screen.getByPlaceholderText('Email'), 'test@test.com')
        await userEvent.type(screen.getByPlaceholderText('Username'), 'testuser')
        await userEvent.type(screen.getByPlaceholderText('Password'), 'Pass123!')
        await userEvent.type(screen.getByPlaceholderText('Confirm password'), 'Pass123!')
        await userEvent.click(screen.getByRole('button', { name: 'Register' }))
        expect(await screen.findByText('Check your email for a verification link.')).toBeInTheDocument()
    })

    it('shows error on failed registration', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            json: () => Promise.resolve({ username: ['This username is taken.'] }),
        })
        render(<Register />)
        await userEvent.type(screen.getByPlaceholderText('Email'), 'test@test.com')
        await userEvent.type(screen.getByPlaceholderText('Username'), 'taken')
        await userEvent.type(screen.getByPlaceholderText('Password'), 'Pass123!')
        await userEvent.type(screen.getByPlaceholderText('Confirm password'), 'Pass123!')
        await userEvent.click(screen.getByRole('button', { name: 'Register' }))
        expect(await screen.findByText('This username is taken.')).toBeInTheDocument()
    })
})
