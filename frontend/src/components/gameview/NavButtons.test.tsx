import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NavButtons from './NavButtons'

describe('NavButtons', () => {

    it('renders 4 buttons', () => {
        render(
            <NavButtons
                onStart={() => {}}
                onBack={() => {}}
                onForward={() => {}}
                onEnd={() => {}}
            />
        )
        const buttons = screen.getAllByRole('button')
        expect(buttons.length).toBe(4)
    })

    it('calls onStart when first button is clicked', async () => {
        const onStart = vi.fn()
        render(
            <NavButtons
                onStart={onStart}
                onBack={() => {}}
                onForward={() => {}}
                onEnd={() => {}}
            />
        )
        const buttons = screen.getAllByRole('button')
        await userEvent.click(buttons[0])
        expect(onStart).toHaveBeenCalledOnce()
    })

    it('calls onBack when second button is clicked', async () => {
        const onBack = vi.fn()
        render(
            <NavButtons
                onStart={() => {}}
                onBack={onBack}
                onForward={() => {}}
                onEnd={() => {}}
            />
        )
        const buttons = screen.getAllByRole('button')
        await userEvent.click(buttons[1])
        expect(onBack).toHaveBeenCalledOnce()
    })

    it('calls onForward when third button is clicked', async () => {
        const onForward = vi.fn()
        render(
            <NavButtons
                onStart={() => {}}
                onBack={() => {}}
                onForward={onForward}
                onEnd={() => {}}
            />
        )
        const buttons = screen.getAllByRole('button')
        await userEvent.click(buttons[2])
        expect(onForward).toHaveBeenCalledOnce()
    })

    it('calls onEnd when fourth button is clicked', async () => {
        const onEnd = vi.fn()
        render(
            <NavButtons
                onStart={() => {}}
                onBack={() => {}}
                onForward={() => {}}
                onEnd={onEnd}
            />
        )
        const buttons = screen.getAllByRole('button')
        await userEvent.click(buttons[3])
        expect(onEnd).toHaveBeenCalledOnce()
    })
})