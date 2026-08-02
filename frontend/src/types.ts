export interface Report {
    id: number
    report_name: string
    player_name: string
    total_games: number
    wins: number
    losses: number
    draws: number
    win_rate: number
    opening_category_count: number
    opening_family_count: number
    opening_line_count: number
    opening_category_stats: Record<string, OpeningStats>
    opening_family_stats: Record<string, OpeningStats>
    opening_line_stats: Record<string, OpeningStats>
    created_at: string
    family_to_lines: Record<string, string[]>
}

export interface GameMove {
    move_number: number
    white_move: string
    black_move: string
    white_eval: number | null
    black_eval: number | null
    white_classification: string
    black_classification: string
}

export interface OpeningStats {         
    wins: number
    losses: number      
    draws: number
    total: number                                                                        
    win_rate: number
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
    fen_matches_array: string[]
    opening_line: string
    opening_family: string
    moves: GameMove[]
}

export interface GameCard {
    id: number
    white_player: string
    black_player: string
    date: string
    result: string
    termination: string
    opening_line: string
    opening_family: string
}