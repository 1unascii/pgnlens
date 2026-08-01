import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { FaArrowLeft } from 'react-icons/fa'
import type { Report } from '../types'
import SortButtons from '../components/SortButtons'
import PaginationControls from '../components/PaginationControls'
import OpeningLineCard from '../components/OpeningLineCard'
import OpeningFamilyCard from '../components/OpeningFamilyCard'
import OpeningBarChart from '../components/OpeningBarChart'
import StatCard from '../components/StatCard'


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
    const [expandedFamily, setExpandedFamily] = useState<string | null>(null)
    // Colors for the bar chart — each opening gets a different color.
    // Cycles back to the start if there are more openings than colors.
    function generateChartColors(count: number): string[] {
        const colors: string[] = []
        for (let i = 0; i < count; i++) {
            const hue = (i * 360) / count
            colors.push(`hsl(${hue}, 70%, 55%)`)
        }
        return colors
    }
  
    const CHART_COLORS = generateChartColors(15)

    // Fetch the report data from the API when the component mounts.
    // The [id] dependency means this re-runs if the URL id changes.
    useEffect(() => {
        fetch(`/api/reports/${id}/`)
            .then(response => response.json())
            .then(data => setReport(data))
    }, [id])

    // Show loading text until the API response arrives
    if (!report) return <div>Loading...</div>

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
                <StatCard label="Total Games" value={report.total_games} />
                <StatCard label="Win Rate" value={`${report.win_rate}%`} />
                <StatCard label="Openings" value={report.opening_family_count} />
            </div>

            
            <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-bold">Opening Performance</h2>

                {/* SORT BY GAMES OR WIN RATE */}
                <SortButtons
                    sortBy={sortBy.barChart}
                    onChange={(value) => setSortBy({ ...sortBy, barChart: value })}
                />
                </div>

                {/* BAR CHART */}
                <OpeningBarChart data={openingFamilyBarChartData} />
            </div>

            {/* OPENING FAMILIES*/}
            <div className="mb-6">
                
                <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-bold">All Openings</h2>
                
                {/* SORT #1 - GAMES | WIN RATE  - OPENING FAMILIES */}
                <SortButtons
                    sortBy={sortBy.allOpenings}
                    onChange={(value) => setSortBy({ ...sortBy, allOpenings: value })}
                />

                </div>

                {/* CARDS #1 - OPENING FAMILIES */}
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
                            <OpeningFamilyCard
                                key={name}
                                name={name}
                                stats={stats}
                                isExpanded={expandedFamily === name}
                                onToggle={() => setExpandedFamily(expandedFamily === name ? null : name)}
                                report={report}
                            />
                        ))
                    }
                </div>

                {/* PAGINATION #1 - OPENING FAMILIES */}
                <PaginationControls
                    currentPage={currentPage.allOpenings}
                    totalItems={Object.values(report.opening_family_stats)
                        .filter(s => s.total >= minimumGames).length}
                    itemsPerPage={linesPerPage}
                    onChange={(page) => setCurrentPage({ ...currentPage, allOpenings: page })}
                />

            </div>

            {/* LINES THAT NEED PRACTICE */}
            <div className="mb-6">
                
                <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-bold">Weak Opening Lines</h2>
                
                    {/* SORT #2 - GAMES | WIN RATE - LINES THAT NEED PRACTICE */}
                    <SortButtons
                        sortBy={sortBy.weakLines}
                        onChange={(value) => setSortBy({ ...sortBy, weakLines: value })}
                    />

                </div>

                {/* CARDS #2 - LINES THAT NEED PRACTICE */}
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
                            <OpeningLineCard key={name} name={name} stats={stats} />
                        ))
                    }
                </div>

                {/* PAGINATION #2 - LINES THAT NEED PRACTICE */}
                <PaginationControls
                    currentPage={currentPage.weakLines}
                    totalItems={Object.values(report.opening_family_stats)
                        .filter(s => s.total >= minimumGames).length}
                    itemsPerPage={linesPerPage}
                    onChange={(page) => setCurrentPage({ ...currentPage, weakLines: page })}
                />

            </div>   

        </div>
    )

}
export default ReportView    