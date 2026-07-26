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
    const [sortBy, setSortBy] = useState({ 
        barChart: 'total' as 'total' | 'win_rate',
        weakLines: 'total' as 'total' | 'win_rate',
        allOpenings: 'total' as 'total' | 'win_rate',
    })

    // Pagination controls for the weak lines section
    const [currentPage, setCurrentPage] = useState({
        weakLines: 0,
        allOpenings: 0,
    })
    const linesPerPage = 5

    const [minimumGames, setMinimumGames] = useState(1)

    
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

    // Calculate the height of the X-axis labels based on the longest opening family name.// Calculate the height of the X-axis labels based on the longest opening family name.
    const nameLengths = Object.keys(report.opening_family_stats).map(name => name.length)
    const longestName = Math.max(...nameLengths)  
    const xAxisHeight = Math.max(100, longestName * 7)

    // The API returns opening_family_stats as an object like:
    //   { "Sicilian Defense": { wins: 10, losses: 5, draws: 2, total: 17, win_rate: 58.8 }, ... }
    // recharts needs an array of objects, so we convert it with Object.entries().
    // Each entry becomes { name: "Sicilian Defense", wins: 10, ..., fill: "#4f46e5" }.
    // Then we sort by whichever column the user picked (total games or win rate).
    const openingFamilyBarChartData = Object.entries(report.opening_family_stats)
    .filter(([, stats]) => stats.total >= minimumGames)
     .map(([name, stats], index) => ({
        name,
        ...stats,
        fill: CHART_COLORS[index % CHART_COLORS.length]
    }))
     .sort((a, b) => b[sortBy.barChart] - a[sortBy.barChart])


    type ToolTipContents = { payload?: { total: number } }
                                          
    function formatToolTip(_value: number, _name: string, { payload  }: ToolTipContents) {      
        return [`${payload?.total ?? 0} games`]
    }  

    return (
        <div className="max-w-6xl mx-auto p-4">

            {/* Input */}
            {/* Filter by the minimum number of games played for that opening family or line */}
            <div className="flex items-center gap-2">
                <label>Min games:</label>
                <input
                    type="number"
                    min={1}
                    value={minimumGames}
                    onChange={(e) => {
                        setMinimumGames(Number(e.target.value))
                        setCurrentPage({ ...currentPage, weakLines: 0 })
                    }}
                    className="border rounded p-1 w-16"
                />

            </div>

            {/* Header — report name on the left, back arrow link on the right */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">{report.report_name}</h1>
                <Link to="/reports"><FaArrowLeft /> Back</Link>
            </div>

            {/* Output */}
            {/* Stat cards — three summary numbers in a row */}
            <div className="grid grid-cols-3 gap-4 mb-6">

                {/* Total games */}
                <div className="border rounded-lg p-4 shadow-sm text-center">
                    <p className="text-sm text-gray-500">Total Games</p>
                    <p className="text-2xl font-bold">{report.total_games}</p>
                </div>

                {/* Win rate */}
                <div className="border rounded-lg p-4 shadow-sm text-center">
                    <p className="text-sm text-gray-500">Win Rate</p>
                    <p className="text-2xl font-bold">{report.win_rate}%</p>
                </div>

                {/* Opening count */}
                <div className="border rounded-lg p-4 shadow-sm text-center">
                    <p className="text-sm text-gray-500">Openings</p>
                    <p className="text-2xl font-bold">{report.opening_family_count}</p>
                </div>

            </div>

            {/* Toggle between sorting by total games played or by win rate */}
            <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-lg font-bold">Win Rate by Opening</h2>
                    <div>
                        <button onClick={() => setSortBy({ ...sortBy, barChart: 'total' })}
                            className={sortBy.barChart === 'total' ? 'font-bold' : ''}>
                            By Games
                        </button>
                        {' | '}
                        <button onClick={() => setSortBy({ ...sortBy, barChart: 'win_rate' })}
                            className={sortBy.barChart === 'win_rate' ? 'font-bold' : ''}>
                            By Win Rate
                        </button>
                    </div>
                </div>

                {/* Output */}
                <ResponsiveContainer width="100%" height={300 + xAxisHeight}>

                    <BarChart 
                        data={openingFamilyBarChartData} 
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
                        <Tooltip formatter={formatToolTip} />
                        <Bar dataKey="win_rate" fill="#4f46e5" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Openings Grouped by Family */}
            <div className="mb-6">
                
                <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-bold">Opening Families</h2>
                
                    {/* Toggle between sorting by total games played or by win rate */}
                    <div>
                        <button onClick={() => setSortBy({ ...sortBy, allOpenings: 'total' })}
                            className={sortBy.allOpenings === 'total' ? 'font-bold' : ''}>
                            By Games
                        </button>
                        {' | '}
                        <button onClick={() => setSortBy({ ...sortBy, allOpenings: 'win_rate' })}
                            className={sortBy.allOpenings === 'win_rate' ? 'font-bold' : ''}>
                            By Win Rate
                        </button>
                    </div>

                </div>

                {/* Output */}
                <div className="space-y-4">
                    {Object.entries(report.opening_family_stats)
                        .filter(([, stats]) => stats.total >= minimumGames)
                        .sort((a, b) =>
                            sortBy.allOpenings === 'win_rate'
                                ? b[1].win_rate - a[1].win_rate   // best first
                                : b[1].total - a[1].total          // most played first
                        )
                        .slice(
                            currentPage.allOpenings * linesPerPage, 
                            (currentPage.allOpenings + 1) * linesPerPage
                        )
                        .map(([name, stats]) => (
                            <div key={name} className="border rounded-lg p-4 shadow-sm">
                                <h3 className="font-bold">{name}</h3>
                                <p className="text-sm text-gray-500">
                                    {stats.wins}W / {stats.losses}L / {stats.draws}D — {stats.total} games
                                </p>
                                <p className={`text-lg font-bold ${stats.win_rate < 50 ? 'text-red-500' :   'text-green-500'}`}>{stats.win_rate}%</p>
                            </div>
                        ))
                    }
                </div>

                {/* Pagination controls */}
                <div className="flex justify-between items-center mt-4">

                    {/* Previous button */}
                    <button
                        onClick={() => setCurrentPage({ 
                            ...currentPage, 
                            allOpenings: Math.max(0, currentPage.allOpenings - 1) 
                        })}
                        disabled={currentPage.allOpenings === 0}>
                        Previous
                    </button>

                    {/* Current page number */}
                    <p className="text-sm text-gray-500">
                        Page {currentPage.allOpenings + 1} of {Math.ceil(
                            Object.values(report.opening_family_stats)
                            .filter(s => s.total >= minimumGames).length / linesPerPage
                        )}
                    </p>

                    {/* Next button */}
                    <button
                        onClick={() => setCurrentPage({ 
                            ...currentPage, 
                            allOpenings: currentPage.allOpenings + 1 
                        })}
                        disabled={(currentPage.allOpenings + 1) * linesPerPage >= 
                            Object.values(report.opening_family_stats)
                            .filter(s => s.total >= minimumGames).length}>
                        Next
                    </button>

                </div>

            </div>

            {/* Lines that need practice */}
            <div className="mb-6">
                
                <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-bold">Lines that need practice</h2>
                
                    {/* Toggle between sorting by total games played or by win rate */}
                    <div>
                        <button onClick={() => setSortBy({ ...sortBy, weakLines: 'total' })}
                            className={sortBy.weakLines === 'total' ? 'font-bold' : ''}>
                            By Games
                        </button>
                        {' | '}
                        <button onClick={() => setSortBy({ ...sortBy, weakLines: 'win_rate' })}
                            className={sortBy.weakLines === 'win_rate' ? 'font-bold' : ''}>
                            By Win Rate
                        </button>
                    </div>

                </div>

                {/* Output */}
                <div className="space-y-4">
                    {Object.entries(report.opening_line_stats)
                        .filter(([, stats]) => stats.win_rate < 50 && stats.total >= minimumGames)
                        .sort((a, b) =>
                            sortBy.weakLines === 'win_rate'
                                ? a[1].win_rate - b[1].win_rate   // worst first
                                : b[1].total - a[1].total          // most played first
                        )
                        .slice(
                            currentPage.weakLines * linesPerPage, 
                            (currentPage.weakLines + 1) * linesPerPage
                        )
                        .map(([name, stats]) => (
                            <div key={name} className="border rounded-lg p-4 shadow-sm">
                                <h3 className="font-bold">{name}</h3>
                                <p className="text-sm text-gray-500">
                                    {stats.wins}W / {stats.losses}L / {stats.draws}D — {stats.total} games
                                </p>
                                <p className="text-lg font-bold text-red-500">{stats.win_rate}%</p>
                            </div>
                        ))
                    }
                </div>

                {/* Pagination controls */}
                <div className="flex justify-between items-center mt-4">

                    {/* Previous button */}
                    <button
                        onClick={() => setCurrentPage({ 
                            ...currentPage, 
                            weakLines: Math.max(0, currentPage.weakLines - 1) 
                        })}
                        disabled={currentPage.weakLines === 0}>
                        Previous
                    </button>

                    {/* Current page number */}
                    <p className="text-sm text-gray-500">
                        Page {currentPage.weakLines + 1} of {Math.ceil(
                            Object.values(report.opening_line_stats)
                            .filter(s => s.win_rate < 50 && s.total >= minimumGames).length / linesPerPage
                        )}
                    </p>

                    {/* Next button */}
                    <button
                        onClick={() => setCurrentPage({ 
                            ...currentPage, 
                            weakLines: currentPage.weakLines + 1 
                        })}
                        disabled={(currentPage.weakLines + 1) * linesPerPage >= 
                            Object.values(report.opening_line_stats)
                            .filter(s => s.win_rate < 50 && s.total >= minimumGames).length}>
                        Next
                    </button>

                </div>

            </div>

            

        </div>
    )

}
export default ReportView    