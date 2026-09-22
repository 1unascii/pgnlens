// Shared chess utility functions used across multiple pages

// All piece codes used by react-chessboard for custom piece images
const PIECE_CODES = ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP', 'bK', 'bQ', 'bR', 'bB', 'bN', 'bP']

// Build a custom piece set from image files in /piece/<theme>/
export function makePieceSet(theme: string, extension = 'svg') {
    const pieceSet: Record<string, () => React.JSX.Element> = {}
    for (const code of PIECE_CODES) {
        pieceSet[code] = () => (
            <img src={`/piece/${theme}/${code}.${extension}`} alt={code}
                style={{ width: '100%', height: '100%' }} />
        )
    }
    return pieceSet
}

// Compare the current board to starting pieces to figure out what's been captured
export function getCapturedPieces(fen: string) {
    const startingPieces = {
        white: { K: 1, Q: 1, R: 2, B: 2, N: 2, P: 8 },
        black: { k: 1, q: 1, r: 2, b: 2, n: 2, p: 8 },
    }
    const boardPart = fen.split(' ')[0]
    const currentPieces: Record<string, number> = {}
    for (const char of boardPart) {
        if (/[A-Za-z]/.test(char)) {
            currentPieces[char] = (currentPieces[char] || 0) + 1
        }
    }
    const whiteCaptured: string[] = []
    const blackCaptured: string[] = []
    for (const [piece, count] of Object.entries(startingPieces.white)) {
        const missing = count - (currentPieces[piece] || 0)
        for (let i = 0; i < missing; i++) whiteCaptured.push(piece)
    }
    for (const [piece, count] of Object.entries(startingPieces.black)) {
        const missing = count - (currentPieces[piece] || 0)
        for (let i = 0; i < missing; i++) blackCaptured.push(piece)
    }
    return { whiteCaptured, blackCaptured }
}
