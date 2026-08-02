import type { OpeningStats } from '../types'                                                                                                                                              
  interface OpeningLineCardProps {                                                            
      name: string
      stats: OpeningStats
      variant?: 'parent' | 'child'
  }

  function OpeningLineCard({ name, stats, variant = 'parent' }: OpeningLineCardProps) {       
      const styles = variant === 'child'
          ? 'border rounded p-3 ml-4 bg-gray-50 dark:bg-gray-800'
          : 'border rounded-lg p-4 shadow-sm'

      return (
          <div className={styles}>
              <h3 className={variant === 'child' ? 'font-semibold text-sm' :'font-bold'}>{name}</h3>
              <p className="text-sm text-gray-500">
                  {stats.wins}W / {stats.losses}L / {stats.draws}D — {stats.total} games      
              </p>
              <p className={`font-bold ${variant === 'child' ? 'text-sm' : 'text-lg'} 
              ${stats.win_rate < 50 ? 'text-red-500' : 'text-green-500'}`}>
                  {stats.win_rate}%
              </p>
          </div>
      )
  }

  export default OpeningLineCard