import { FaArrowUp, FaArrowDown } from 'react-icons/fa'

type SortOption = 'total' | 'win_rate'

interface SortButtonsProps {
    sortBy: SortOption
    onChange: (value: SortOption) => void
    direction: 'asc' | 'desc'
    onDirectionToggle: () => void
}

function SortButtons({ sortBy, onChange, direction, onDirectionToggle }: SortButtonsProps) {
    return (
        <div className="flex items-center gap-1">
            <button onClick={() => onChange('total')}
                className={sortBy === 'total' ? 'font-bold' : ''}>
                By Games
            </button>
            {' | '}
            <button onClick={() => onChange('win_rate')}
                className={sortBy === 'win_rate' ? 'font-bold' : ''}>
                By Win Rate
            </button>
            <button onClick={onDirectionToggle} className="ml-1">
                {direction === 'asc' ? <FaArrowUp /> : <FaArrowDown />}
            </button>
        </div>
    )
}

export default SortButtons