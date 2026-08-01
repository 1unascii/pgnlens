type SortOption = 'total' | 'win_rate'

interface SortButtonsProps {
    sortBy: SortOption
    onChange: (value: SortOption) => void
}

function SortButtons({ sortBy, onChange }: SortButtonsProps) {
    return (
        <div>
            <button onClick={() => onChange('total')}
                className={sortBy === 'total' ? 'font-bold' : ''}>
                By Games
            </button>
            {' | '}
            <button onClick={() => onChange('win_rate')}
                className={sortBy === 'win_rate' ? 'font-bold' : ''}>
                By Win Rate
            </button>
        </div>
    )
}

export default SortButtons