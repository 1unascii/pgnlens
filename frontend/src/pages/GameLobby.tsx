import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import authHeaders from '../utils/authHeaders'

function GameLobby() {
    const navigate = useNavigate()
    const [creating, setCreating] = useState(false)

    async function createGame() {
        setCreating(true)
        const response = await fetch('/api/live-games/', {
            method: 'POST',
            headers: {
                ...authHeaders(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ time_control: 600 }),
        })
        const data = await response.json()
        navigate(`/play/${data.game_id}`)
    }

    return (
        <div className="max-w-md mx-auto p-4 text-center">
            <h1 className="text-2xl font-bold mb-6">Play</h1>
            <button
                onClick={createGame}
                disabled={creating}
                className="bg-blue-500 text-white rounded p-4 w-full text-lg font-bold"
            >
                {creating ? 'Creating...' : 'Create Game'}
            </button>
            <p className="text-gray-500 mt-4 text-sm">
                Create a game and share the link with a friend.
            </p>
        </div>
    )
}

export default GameLobby