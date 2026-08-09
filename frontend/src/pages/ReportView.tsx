import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { FaArrowLeft } from 'react-icons/fa'
import type { Report, GameCardData } from '../types'
import SortButtons from '../components/SortButtons'
import PaginationControls from '../components/PaginationControls'
import OpeningLineCard from '../components/OpeningLineCard'
import OpeningFamilyCard from '../components/OpeningFamilyCard'
import OpeningBarChart from '../components/OpeningBarChart'
import StatCard from '../components/StatCard'
import GameCard from '../components/GameCard'
import filterSortPaginate from '../utils/filterSortPaginate'
import authHeaders from '../utils/authHeaders'


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

    // sortDirection controls the direction of the sort (asc or desc)
    const [sortDirection, setSortDirection] = useState({
        barChart: 'asc' as 'asc' | 'desc',
        weakLines: 'asc' as 'asc' | 'desc',
        allOpenings: 'asc' as 'asc' | 'desc',
    })

    
    function handleSortChange(
        section: 'barChart' | 'weakLines' | 'allOpenings',
        value: 'total' | 'win_rate'
    ) {
        setSortBy({ ...sortBy, [section]: value })
        if (section === 'weakLines' && value === 'win_rate') {
            setSortDirection({ ...sortDirection, [section]: 'asc' })
        } else {
            setSortDirection({ ...sortDirection, [section]: 'desc' })
        }
    }

    // Pagination controls for the weak lines section
    const [currentPage, setCurrentPage] = useState({
        weakLines: 0,
        allOpenings: 0,
    })
    const linesPerPage = 5
    const [minimumGames, setMinimumGames] = useState(1)
    const [expandedFamily, setExpandedFamily] = useState<string | null>(null)
    const [expandedLine, setExpandedLine] = useState<string | null>(null)
    const [gameCards, setGameCards] = useState<GameCardData[]>([])

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
        const headers = authHeaders()
    
        fetch(`/api/reports/${id}/`, { headers })
            .then(response => response.json())
            .then(data => setReport(data))
    
        fetch(`/api/games/?report=${id}`, { headers })
            .then(response => response.json())
            .then(data => setGameCards(data))
    }, [id])

    const handleLineCardClick = (line: string) => {
        setExpandedLine(expandedLine === line ? null : line)
    }

    const [colorFilter, setColorFilter] = useState<'all' | 'white' | 'black'>('all')

    // Show loading text until the API responses arrive
    // Show loading text until the API response arrives
    if (!report) return <div>Loading...</div>

    const reportStats = colorFilter === 'white'
    ? report.player_is_white_stats
    : colorFilter === 'black'
    ? report.player_is_black_stats
    : report.all_games_stats
    
    const filteredGameCards = colorFilter === 'all'
    ? gameCards
    : gameCards.filter(game => 
        colorFilter === 'white'
        ? game.white_player === report.player_name
        : game.black_player === report.player_name
    )

    // The API returns opening_family_stats as an object like:
    //   { "Sicilian Defense": { wins: 10, losses: 5, draws: 2, total: 17, win_rate: 58.8 }, ... }
    // recharts needs an array of objects, so we convert it with Object.entries().
    // Each entry becomes { name: "Sicilian Defense", wins: 10, ..., fill: "#4f46e5" }.
    // Then we sort by whichever column the user picked (total games or win rate).
    const openingFamilyBarChartData = filterSortPaginate(
        reportStats.opening_family_stats,
        minimumGames,
        sortBy.barChart,
        sortDirection.barChart,
        0,
        Infinity
    )
    .map(([name, stats], index) => ({
        name,
        ...stats,
        fill: CHART_COLORS[index % CHART_COLORS.length]
    }))

    // Render the report view
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

            {/* Input */}
            {/* Player color */}
            <select
                value={colorFilter}
                onChange={(e) => setColorFilter(e.target.value as 'all' | 'white' | 'black')}
                className="border rounded p-1 bg-white text-black"
            >
                <option value="all">All Games</option>
                <option value="white">Playing White</option>
                <option value="black">Playing Black</option>
            </select>

            {/* Header — report name on the left, back arrow link on the right */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">{report.report_name}</h1>
                <Link to="/reports"><FaArrowLeft /> Back</Link>
            </div>

            {/* Output */}
            {/* Stat cards — three summary numbers in a row */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <StatCard label="Total Games" value={reportStats.total_games} />
                <StatCard label="Win Rate" value={`${reportStats.win_rate}%`} />
                <StatCard label="Openings" value={reportStats.opening_family_count} />
            </div>

            
            <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-bold">Opening Performance</h2>

                {/* SORT BY GAMES OR WIN RATE */}
                <SortButtons
                    sortBy={sortBy.barChart}
                    onChange={(value) => handleSortChange('barChart', value)}
                    direction={sortDirection.barChart}
                    onDirectionToggle={() => setSortDirection({
                        ...sortDirection,
                        barChart: sortDirection.barChart === 'desc' ? 'asc' : 'desc'
                    })}
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
                    onChange={(value) => handleSortChange('allOpenings', value)}
                    direction={sortDirection.allOpenings}
                    onDirectionToggle={() => setSortDirection({
                        ...sortDirection,
                        allOpenings: sortDirection.allOpenings === 'desc' ? 'asc' : 'desc'
                    })}
                />

                </div>

                {/* CARDS #1 - OPENING FAMILIES */}
                <div className="space-y-4">
                    {filterSortPaginate(
                            reportStats.opening_family_stats,
                            minimumGames,
                            sortBy.allOpenings,
                            sortDirection.allOpenings,
                            currentPage.allOpenings,
                            linesPerPage
                        )
                        .map(([name, stats]) => (
                            <OpeningFamilyCard
                                key={name}
                                name={name}
                                stats={stats}
                                isExpanded={expandedFamily === name}
                                onToggle={() => setExpandedFamily(expandedFamily === name ? null : name)}
                                reportStats={reportStats}
                                gameCards={filteredGameCards}
                                expandedLine={expandedLine}
                                onLineToggle={(lineName) => setExpandedLine(expandedLine === lineName ? null : lineName)}
                                playerName={report.player_name}
                            />
                        ))
                    }
                </div>

                {/* PAGINATION #1 - OPENING FAMILIES */}
                <PaginationControls
                    currentPage={currentPage.allOpenings}
                    totalItems={Object.values(reportStats.opening_family_stats)
                        .filter(s => s.total >= minimumGames).length}
                    itemsPerPage={linesPerPage}
                    onChange={(page) => setCurrentPage({ ...currentPage, allOpenings: page })}
                />

            </div>

            {/* LINES THAT NEED PRACTICE */}
            <div className="mb-6">
                
                <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-bold">Lines That Need Practice</h2>
                
                    {/* SORT #2 - GAMES | WIN RATE - LINES THAT NEED PRACTICE */}
                    <SortButtons
                        sortBy={sortBy.weakLines}
                        onChange={(value) => handleSortChange('weakLines', value)}
                        direction={sortDirection.weakLines}
                        onDirectionToggle={() => setSortDirection({
                            ...sortDirection,
                            weakLines: sortDirection.weakLines === 'desc' ? 'asc' : 'desc'
                        })}
                    />

                </div>

                {/* CARDS #2 - LINES THAT NEED PRACTICE */}
                <div className="space-y-4">
                    {filterSortPaginate(
                        reportStats.opening_line_stats,
                        minimumGames,
                        sortBy.weakLines,
                        sortDirection.weakLines,
                        currentPage.weakLines,
                        linesPerPage,
                        50
                    )
                        .map(([name, stats]) => (
                            <div key={name}>
                                <div onClick={() => handleLineCardClick(name)} className="cursor-pointer">
                                    <OpeningLineCard name={name} stats={stats} />
                                </div>
                                {expandedLine === name && (
                                    <div className="mt-2 space-y-2">
                                        {filteredGameCards
                                            .filter(game => game.opening_line === name)
                                            .map(game => (
                                                <GameCard key={game.id} game={game} />
                                            ))
                                        }
                                    </div>
                                )}
                            </div>
                        ))
                    }
                </div>

                {/* PAGINATION #2 - LINES THAT NEED PRACTICE */}
                <PaginationControls
                    currentPage={currentPage.weakLines}
                    totalItems={Object.values(reportStats.opening_line_stats)
                        .filter(s => s.win_rate < 50 && s.total >= minimumGames).length}
                    itemsPerPage={linesPerPage}
                    onChange={(page) => setCurrentPage({ ...currentPage, weakLines: page })}
                />

            </div>   

        </div>
    )

}
export default ReportView    