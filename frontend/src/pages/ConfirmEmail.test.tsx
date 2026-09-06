import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ConfirmEmail from './ConfirmEmail'

beforeEach(() => {
    vi.restoreAllMocks()
})

function renderWithRoute() {
    return render(
        <MemoryRouter initialEntries={['/confirm-email/test-key-123/']}>
            <Routes>
                <Route path="/confirm-email/:key/" element={<ConfirmEmail />} />
            </Routes>
        </MemoryRouter>
    )
}

describe('ConfirmEmail', () => {

    it('renders the confirm page', () => {
        renderWithRoute()
        expect(screen.getByText('Confirm Your Email')).toBeInTheDocument()
        expect(screen.getByText('Verify Email')).toBeInTheDocument()
    })

    it('shows success message on verification', async () => {
        global.fetch = vi.fn().mockResolvedValue({ ok: true })
        renderWithRoute()
        await userEvent.click(screen.getByText('Verify Email'))
        expect(await screen.findByText('Email verified! You can now log in.')).toBeInTheDocument()
    })

    it('shows error on failed verification', async () => {
        global.fetch = vi.fn().mockResolvedValue({ ok: false })
        renderWithRoute()
        await userEvent.click(screen.getByText('Verify Email'))
        expect(await screen.findByText('Verification failed. The link may have expired.')).toBeInTheDocument()
    })
})
