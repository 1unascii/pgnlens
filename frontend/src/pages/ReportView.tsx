import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer} from 'recharts' // javascript charts library
import { FaArrowLeft } from 'react-icons/fa'
import type { Report } from '../types'


function ReportView() {

    // useParams() reads the :id from the URL (e.g. /reports/3 gives id = "3")
    const { id } = useParams()

    // report holds the fetched report data, starts as null until the API responds
    const [report, setReport] = useState<Report | null>(null)

    // sortBy controls how the bar chart is ordered — by total games or by win rate
    const [sortBy, setSortBy] = useState<'total' | 'win_rate'>('total')

    // Fetch the report data from the API when the component mounts.
    // The [id] dependency means this re-runs if the URL id changes.
    useEffect(() => {
        fetch(`/api/reports/${id}/`)
            .then(response => response.json())
            .then(data => setReport(data))
    }, [id])

    // Show loading text until the API response arrives
    if (!report) return <div>Loading...</div>

    // Colors for the bar chart — each opening gets a different color.
    // Cycles back to the start if there are more openings than colors.
    const CHART_COLORS = [
        '#4f46e5', '#f97316', '#ec4899', '#8b5cf6', '#4ade80',
        '#fbbf24', '#f472b6', '#3b82f6', '#10b981', '#f59e0b',
        '#a855f7', '#f472b6', '#3b82f6', '#10b981', '#f59e0b',
    ]

    // The API returns opening_family_stats as an object like:
    //   { "Sicilian Defense": { wins: 10, losses: 5, draws: 2, total: 17, win_rate: 58.8 }, ... }
    // recharts needs an array of objects, so we convert it with Object.entries().
    // Each entry becomes { name: "Sicilian Defense", wins: 10, ..., fill: "#4f46e5" }.
    // Then we sort by whichever column the user picked (total games or win rate).
    const openingData = Object.entries(report.opening_family_stats)
     .map(([name, stats], index) => ({
        name,
        ...stats,
        fill: CHART_COLORS[index % CHART_COLORS.length]
    }))
     .sort((a, b) => b[sortBy] - a[sortBy])

     return (
        <div className="max-w-6xl mx-auto p-4">

            {/* Header — report name on the left, back arrow link on the right */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">{report.report_name}</h1>
                <Link to="/reports"><FaArrowLeft /> Back</Link>
            </div>

            {/* Stat cards — three summary numbers in a row */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="border rounded-lg p-4 shadow-sm text-center">
                    <p className="text-sm text-gray-500">Total Games</p>
                    <p className="text-2xl font-bold">{report.total_games}</p>
                </div>
                <div className="border rounded-lg p-4 shadow-sm text-center">
                    <p className="text-sm text-gray-500">Win Rate</p>
                    <p className="text-2xl font-bold">{report.win_rate}%</p>
                </div>
                <div className="border rounded-lg p-4 shadow-sm text-center">
                    <p className="text-sm text-gray-500">Openings</p>
                    <p className="text-2xl font-bold">{report.opening_family_count}</p>
                </div>
            </div>

            {/* Opening family bar chart — shows win rate for each opening family.
                The sort buttons let the user toggle between ordering by number of
                games played vs. ordering by win rate percentage.
                ResponsiveContainer makes the chart resize with the page width.
                XAxis angle={-45} rotates the opening names so they don't overlap.
                interval={0} forces all labels to show (by default recharts skips some). */}
            <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-lg font-bold">Win Rate by Opening</h2>
                    <div>
                        <button onClick={() => setSortBy('total')}
                            className={sortBy === 'total' ? 'font-bold' : ''}>
                            By Games
                        </button>
                        {' | '}
                        <button onClick={() => setSortBy('win_rate')}
                            className={sortBy === 'win_rate' ? 'font-bold' : ''}>
                            By Win Rate
                        </button>
                    </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={openingData}>
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} interval={0}/>
                        <YAxis />
                        <Tooltip formatter={(_value: number, _name: string, { payload }: {     
                        payload?: { total: number } }) => [
                            `${payload?.total ?? 0} games`
                        ]} />
                        <Bar dataKey="win_rate" fill="#4f46e5" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    )

}
export default ReportView    