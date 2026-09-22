import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Chessboard } from 'react-chessboard'
import { makePieceSet } from '../utils/chessHelpers'

interface OpeningLine {
    fen: string
    eco: string
    moves: string
}

interface OpeningFamily {
    lines: Record<string, OpeningLine>
}

function OpeningIndex() {
    const navigate = useNavigate()
    const [openings, setOpenings] = useState<Record<string, OpeningFamily>>({})
    const [expandedFamily, setExpandedFamily] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const rowsPerPage = 5
    const [visibleRows, setVisibleRows] = useState(rowsPerPage)
    const gridRef = useRef<HTMLDivElement>(null)
    const [columnsPerRow, setColumnsPerRow] = useState(5)
    const accordionScrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        fetch('/data/openings.json')
            .then(response => response.json())
            .then(data => setOpenings(data))
    }, [])

    // Measure how many cards fit per row
    useEffect(() => {
        function measure() {
            if (gridRef.current) {
                const width = gridRef.current.clientWidth
                const cardWidth = 160 + 12 // 10rem + gap
                const tolerance = cardWidth * 0.25 // allow cards to overlap a bit before dropping a column
                setColumnsPerRow(Math.max(1, Math.floor((width + tolerance) / cardWidth)))
            }
        }
        measure()
        window.addEventListener('resize', measure)
        return () => window.removeEventListener('resize', measure)
    }, [])

    const contentWidth = columnsPerRow * 160 + (columnsPerRow - 1) * 12


    function startPractice(familyName: string, lineName: string) {
        navigate(`/practice/board/${encodeURIComponent(familyName)}/${encodeURIComponent(lineName)}`)
    }

    return (
            <div className="max-w-7xl mx-auto p-8">
                <h1 className="text-2xl font-bold mb-4">Practice Openings</h1>
    
                {/* Search filter */}
                <input
                    type="text"
                    placeholder="Search openings..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setVisibleRows(rowsPerPage) }}
                    className="border rounded p-2 mb-4"
                    style={{ width: contentWidth }}
                />
    
                {/* Opening families — chunked into rows with accordion between rows */}
                <div ref={gridRef}>
                    {(() => {
                        const filtered = Object.entries(openings)
                            .filter(([name]) => name.toLowerCase().includes(searchTerm.toLowerCase()))
                            .slice(0, visibleRows * columnsPerRow)

                        // Find which row the expanded family is in
                        const expandedIndex = filtered.findIndex(([name]) => name === expandedFamily)
                        const result: React.ReactNode[] = []

                        for (let i = 0; i < filtered.length; i += columnsPerRow) {
                            const rowItems = filtered.slice(i, i + columnsPerRow)

                            result.push(
                                <div key={`row-${i}`} className="flex flex-nowrap gap-3 mb-3 overflow-hidden">
                                    {rowItems.map(([familyName, family]) => (
                                        <div
                                            key={familyName}
                                            onClick={() => setExpandedFamily(
                                                expandedFamily === familyName ? null : familyName
                                            )}
                                            className={`cursor-pointer shrink-0 w-40 border rounded p-2
                                                       hover:bg-gray-100 dark:hover:bg-gray-700
                                                       ${expandedFamily === familyName ? 'ring-2 ring-blue-500' : ''}`}
                                        >
                                            <div className="w-36 h-36 mb-1">
                                                <Chessboard options={{
                                                    position: Object.values(family.lines)[0].fen,
                                                    pieces: makePieceSet('monarchy', 'webp'),
                                                    darkSquareStyle: { backgroundColor: '#999' },
                                                    lightSquareStyle: { backgroundColor: '#ddd' },
                                                    boardOrientation: Object.values(family.lines)[0].fen.split(' ')[1] === 'w' ? 'black' : 'white',
                                                    allowDragging: false,
                                                    showNotation: false,
                                                }} />
                                            </div>
                                            <p className="text-xs font-bold truncate">{familyName}</p>
                                            <p className="text-xs text-gray-400">
                                                {Object.keys(family.lines).length} lines
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )

                            // Insert accordion after the row that contains the expanded family
                            if (expandedFamily && i + columnsPerRow > expandedIndex && i <= expandedIndex && openings[expandedFamily]) {
                                result.push(
                                    <div key="accordion" className="relative mb-3">
                                        {/* Left arrow */}
                                        <button
                                            onClick={() => {
                                                accordionScrollRef.current?.scrollBy({ left: -400, behavior: 'smooth' })
                                            }}
                                            className="absolute left-0 top-1/2 -translate-y-1/2 z-10
                                                       bg-black/50 text-white rounded-full w-8 h-8
                                                       flex items-center justify-center hover:bg-black/70"
                                        >
                                            ‹
                                        </button>

                                        {/* Scrollable line cards */}
                                        <div
                                            ref={accordionScrollRef}
                                            className="flex overflow-x-auto gap-3 p-3 px-10 border rounded hide-scrollbar"
                                            style={{ scrollbarWidth: 'none' }}
                                        >
                                            {Object.entries(openings[expandedFamily].lines).map(([lineName, line]) => (
                                                <div
                                                    key={lineName}
                                                    onClick={() => startPractice(expandedFamily!, lineName)}
                                                    className="cursor-pointer shrink-0 w-40 border rounded p-2
                                                               hover:bg-gray-100 dark:hover:bg-gray-700"
                                                >
                                                    <div className="w-36 h-36 mb-1">
                                                        <Chessboard options={{
                                                            position: line.fen,
                                                            pieces: makePieceSet('monarchy', 'webp'),
                                                            darkSquareStyle: { backgroundColor: '#999' },
                                                            lightSquareStyle: { backgroundColor: '#ddd' },
                                                            boardOrientation: line.fen.split(' ')[1] === 'w' ? 'black' : 'white',
                                                            allowDragging: false,
                                                    showNotation: false,
                                                        }} />
                                                    </div>
                                                    <p className="text-xs font-bold truncate">{lineName}</p>
                                                    <p className="text-xs text-gray-400">{line.eco}</p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Right arrow */}
                                        <button
                                            onClick={() => {
                                                accordionScrollRef.current?.scrollBy({ left: 400, behavior: 'smooth' })
                                            }}
                                            className="absolute right-0 top-1/2 -translate-y-1/2 z-10
                                                       bg-black/50 text-white rounded-full w-8 h-8
                                                       flex items-center justify-center hover:bg-black/70"
                                        >
                                            ›
                                        </button>
                                    </div>
                                )
                            }
                        }

                        return result
                    })()}
                </div>

                {/* Load more button */}
                {visibleRows * columnsPerRow < Object.entries(openings).filter(([name]) =>
                    name.toLowerCase().includes(searchTerm.toLowerCase())
                ).length && (
                    <button
                        onClick={() => setVisibleRows(prev => prev + rowsPerPage)}
                        className="mt-4 border rounded p-3 hover:bg-gray-100 dark:hover:bg-gray-700"
                        style={{ width: contentWidth }}
                    >
                        Load more
                    </button>
                )}
            </div>
        )
}

export default OpeningIndex