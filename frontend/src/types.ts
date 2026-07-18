export interface Report {
    id: number
    report_name: string
    player_name: string
    total_games: number
    wins: number
    losses: number
    draws: number
    win_rate: number
    date_created: string
}
export interface Game {
    id: number
    event: string
    site: string
    date: string
    round: number | null
    white_player: string
    black_player: string
    result: string
    white_elo: number | null
    black_elo: number | null
    time_control: string
    end_time: string | null
    termination: string
    eco_code: string
    first_moves: string
    opening_category: string
    fen_matches_array: string[]
    opening_line: string
    opening_family: string
  }
  
  export interface Move {
    id: number
    game: number
    move_number: number
    white_move: string
    black_move: string
    evaluation: number | null
    is_blunder: boolean
    is_mistake: boolean
    is_good_move: boolean
    is_brilliant_move: boolean
    is_excellent_move: boolean
    is_superb_move: boolean
    is_perfect_move: boolean
    is_terrible_move: boolean
    is_horrible_move: boolean
  }