import { render } from '@testing-library/react'
import OpeningBarChart from './OpeningBarChart'

// Mock recharts ResponsiveContainer since it needs real DOM dimensions
vi.mock('recharts', async () => {
    const actual = await vi.importActual('recharts')
    return {
        ...actual,
        ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
            <div style={{ width: 500, height: 400 }}>{children}</div>
        ),
    }
})

const sampleData = [
    { name: 'Italian Game', win_rate: 60, total: 10, fill: '#4f46e5' },
    { name: 'Sicilian Defense', win_rate: 45, total: 8, fill: '#4f46e5' },
]

describe('OpeningBarChart', () => {

    it('renders without crashing', () => {
        const { container } = render(<OpeningBarChart data={sampleData} />)
        expect(container.firstChild).toBeInTheDocument()
    })

    it('renders with empty data', () => {
        const { container } = render(<OpeningBarChart data={[]} />)
        expect(container.firstChild).toBeInTheDocument()
    })
})
