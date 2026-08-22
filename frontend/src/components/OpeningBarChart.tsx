import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface ChartDataEntry {
    name: string
    win_rate: number
    total: number
    fill: string
}

function formatToolTip(_value: number | string | undefined, _name: string, entry: { payload?: { total: number } }) {
    return [`${entry.payload?.total ?? 0} games`]
}

interface OpeningBarChartProps {
    data: ChartDataEntry[]
}

function OpeningBarChart({ data }: OpeningBarChartProps) {
    const nameLengths = data.map(entry => entry.name.length)
    const longestName = Math.max(...nameLengths, 0)
    const xAxisHeight = Math.max(100, longestName * 7)

    return (
        <ResponsiveContainer width="100%" height={300 + xAxisHeight}>
            <BarChart
                data={data}
                margin={{ top: 20, right: 0, left: 50, bottom: 0 }}
                barGap={10}
            >
                <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={xAxisHeight}
                    interval={0}
                    tick={{ fontSize: 12 }}
                />
                <YAxis />
                <Tooltip formatter={formatToolTip as never} />
                <Bar dataKey="win_rate" fill="#4f46e5" />
            </BarChart>
        </ResponsiveContainer>
    )
}

export default OpeningBarChart