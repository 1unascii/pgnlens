export interface Report {
    id: number
    report_name: string
    player_name: string
    total_games: number
    wins: number
    losses: number
    draws: number
    win_rate: number
    opening_family_count: number
    opening_line_count: number
    created_at: string
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
