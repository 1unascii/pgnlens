import { Link } from 'react-router-dom'
import type { GameCardData } from '../types'

interface GameCardProps {
    game: GameCardData
    variant?: 'child' | 'childOfChild'
}

function GameCard({ game, variant = 'child' }: GameCardProps) {
    const styles = variant === 'childOfChild'
        ? 'border rounded p-3 ml-8 bg-gray-100 dark:bg-gray-700'
        : 'border rounded p-3 ml-4 bg-gray-50 dark:bg-gray-800'

    return (
        <Link to={`/games/${game.id}`}>
            <div className={styles}>
                <p className="font-semibold text-sm">
                    {game.white_player} vs {game.black_player}
                </p>
                <p className="text-sm text-gray-500">
                    {game.date} — {game.result} — {game.termination}
                </p>
            </div>
        </Link>
    )
}

export default GameCard