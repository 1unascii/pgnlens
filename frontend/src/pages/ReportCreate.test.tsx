import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ReportCreate from './ReportCreate'

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

describe('ReportCreate', () => {

    it('renders the upload form', () => {
        render(
            <MemoryRouter>
                <ReportCreate />
            </MemoryRouter>
        )
        expect(screen.getByText('Upload PGN File')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Enter player name')).toBeInTheDocument()
        expect(screen.getByText('Upload and Create Report')).toBeInTheDocument()
    })

    it('submit button is disabled when no file or player name', () => {
        render(
            <MemoryRouter>
                <ReportCreate />
            </MemoryRouter>
        )
        const button = screen.getByText('Upload and Create Report')
        expect(button).toBeDisabled()
    })

    it('accepts a file input', () => {
        render(
            <MemoryRouter>
                <ReportCreate />
            </MemoryRouter>
        )
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
        expect(fileInput).toBeInTheDocument()
        expect(fileInput.accept).toBe('.pgn')
    })

    it('accepts player name input', async () => {
        render(
            <MemoryRouter>
                <ReportCreate />
            </MemoryRouter>
        )
        const input = screen.getByPlaceholderText('Enter player name')
        await userEvent.type(input, 'TestPlayer')
        expect(input).toHaveValue('TestPlayer')
    })
})
