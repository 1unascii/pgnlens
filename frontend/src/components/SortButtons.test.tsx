import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SortButtons from './SortButtons'

describe('SortButtons', () => {

    it('"By Games" is bold when sortBy is total', () => {
        render(
            <SortButtons
                sortBy="total"
                onChange={() => {}}
                direction="desc"
                onDirectionToggle={() => {}}
            />
        )
        expect(screen.getByText('By Games'))
            .toHaveClass('font-bold')
    })

    it('"By Win Rate" is bold when sortBy is win_rate',
    () => {
        render(
            <SortButtons
                sortBy="win_rate"
                onChange={() => {}}
                direction="desc"
                onDirectionToggle={() => {}}
            />
        )
        expect(screen.getByText('By Win Rate'))
            .toHaveClass('font-bold')
    })

    it('clicking "By Games" calls onChange with total',
    async () => {
        const onChange = vi.fn()
        render(
            <SortButtons
                sortBy="win_rate"
                onChange={onChange}
                direction="desc"
                onDirectionToggle={() => {}}
            />
        )
        await userEvent.click(screen.getByText('By Games'))
        expect(onChange).toHaveBeenCalledWith('total')
    })

    it('clicking "By Win Rate" calls onChange with win_rate',
    async () => {
        const onChange = vi.fn()
        render(
            <SortButtons
                sortBy="total"
                onChange={onChange}
                direction="desc"
                onDirectionToggle={() => {}}
            />
        )
        await userEvent.click(
            screen.getByText('By Win Rate')
        )
        expect(onChange).toHaveBeenCalledWith('win_rate')
    })

    it('shows up arrow when direction is asc', () => {
        render(
            <SortButtons
                sortBy="total"
                onChange={() => {}}
                direction="asc"
                onDirectionToggle={() => {}}
            />
        )
        const buttons = screen.getAllByRole('button')
        const arrowButton = buttons[buttons.length - 1]
        expect(arrowButton.querySelector('svg'))
            .toBeTruthy()
    })

    it('shows down arrow when direction is desc', () => {
        render(
            <SortButtons
                sortBy="total"
                onChange={() => {}}
                direction="desc"
                onDirectionToggle={() => {}}
            />
        )
        const buttons = screen.getAllByRole('button')
        const arrowButton = buttons[buttons.length - 1]
        expect(arrowButton.querySelector('svg'))
            .toBeTruthy()
    })

    it('clicking the arrow calls onDirectionToggle',
    async () => {
        const onToggle = vi.fn()
        render(
            <SortButtons
                sortBy="total"
                onChange={() => {}}
                direction="desc"
                onDirectionToggle={onToggle}
            />
        )
        const buttons = screen.getAllByRole('button')
        await userEvent.click(buttons[buttons.length - 1])
        expect(onToggle).toHaveBeenCalledOnce()
    })
})