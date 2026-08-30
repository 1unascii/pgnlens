import type { OpeningStats, GameCardData } from '../../types'                                    
import GameCard from './GameCard'
                                                                                              
  interface OpeningLineCardProps {
      name: string
      stats: OpeningStats
      variant?: 'parent' | 'child'
      gameCards?: GameCardData[]
      isExpanded?: boolean
      onToggle?: () => void
      gameCardVariant?: 'child' | 'childOfChild'
      playerName?: string
  }

  function OpeningLineCard({ name, stats, variant = 'parent', gameCards, isExpanded, onToggle,
   gameCardVariant = 'child', playerName = '' }: OpeningLineCardProps) {
      const styles = variant === 'child'
          ? 'border rounded p-3 ml-4 bg-gray-50 dark:bg-gray-800'
          : 'border rounded-lg p-4 shadow-sm'

      return (
          <div>
              <div onClick={onToggle} className={onToggle ? 'cursor-pointer' : ''}>
                  <div className={styles}>
                      <h3 className={variant === 'child' ? 'font-semibold text-sm' : 'font-bold'}>{name}</h3>
                      <p className="text-sm text-gray-500">
                          {stats.wins}W / {stats.losses}L / {stats.draws}D — {stats.total} Games
                      </p>
                      <p className={`font-bold ${variant === 'child' ? 'text-sm' : 'text-lg'} ${stats.win_rate < 50 ? 'text-red-500' : 'text-green-500'}`}>
                          {stats.win_rate}%
                      </p>
                  </div>
              </div>
              {isExpanded && gameCards && (
                  <div className="mt-2 space-y-2">
                      {gameCards
                          .filter(game => game.opening_line === name)
                          .map(game => (
                              <GameCard 
                                key={game.id} 
                                game={game} 
                                variant={gameCardVariant} 
                                playerName={playerName} 
                                />
                          ))
                      }
                  </div>
              )}
          </div>
      )
  }

  export default OpeningLineCard