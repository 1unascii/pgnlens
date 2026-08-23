import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PaginationControls from './PaginationControls'

describe('PaginationControls', () => {

    it('shows correct "Page X of Y" text', () => {
        render(
            <PaginationControls
                currentPage={0}
                totalItems={15}
                itemsPerPage={5}
                onChange={() => {}}
            />
        )
        expect(screen.getByText('Page 1 of 3'))
            .toBeInTheDocument()
    })

    it('Previous is disabled on first page', () => {
        render(
            <PaginationControls
                currentPage={0}
                totalItems={15}
                itemsPerPage={5}
                onChange={() => {}}
            />
        )
        expect(screen.getByText('Previous'))
            .toBeDisabled()
    })

    it('Next is disabled on last page', () => {
        render(
            <PaginationControls
                currentPage={2}
                totalItems={15}
                itemsPerPage={5}
                onChange={() => {}}
            />
        )
        expect(screen.getByText('Next'))
            .toBeDisabled()
    })

    it('clicking Next calls onChange with currentPage + 1',
    async () => {
        const onChange = vi.fn()
        render(
            <PaginationControls
                currentPage={0}
                totalItems={15}
                itemsPerPage={5}
                onChange={onChange}
            />
        )
        await userEvent.click(screen.getByText('Next'))
        expect(onChange).toHaveBeenCalledWith(1)
    })

    it('clicking Previous calls onChange with currentPage - 1',
    async () => {
        const onChange = vi.fn()
        render(
            <PaginationControls
                currentPage={2}
                totalItems={15}
                itemsPerPage={5}
                onChange={onChange}
            />
        )
        await userEvent.click(
            screen.getByText('Previous')
        )
        expect(onChange).toHaveBeenCalledWith(1)
    })

    it('handles totalItems of 0 without crashing', () => {
        render(
            <PaginationControls
                currentPage={0}
                totalItems={0}
                itemsPerPage={5}
                onChange={() => {}}
            />
        )
        expect(screen.getByText('Page 1 of 0'))
            .toBeInTheDocument()
    })
})