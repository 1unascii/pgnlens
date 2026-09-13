import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import authHeaders from '../utils/authHeaders'

const BLITZ_PRESETS = [
    { value: 60, label: '1 min' },
    { value: 180, label: '3 min' },
    { value: 300, label: '5 min' },
]

const RAPID_PRESETS = [
    { value: 600, label: '10 min' },
    { value: 900, label: '15 min' },
    { value: 1800, label: '30 min' },
]

const DAILY_PRESETS = [
    { value: 86400, label: '1 day' },
    { value: 259200, label: '3 days' },
    { value: 432000, label: '5 days' },
]

function GameLobby() {
    const navigate = useNavigate()
    const [creating, setCreating] = useState(false)
    const [timeControl, setTimeControl] = useState(600)
    const [timeMode, setTimeMode] = useState<'total' | 'per_move'>('total')

    function selectPreset(value: number, mode: 'total' | 'per_move') {
        setTimeControl(value)
        setTimeMode(mode)
    }

    async function createGame() {
        setCreating(true)
        const response = await fetch('/api/live-games/', {
            method: 'POST',
            headers: {
                ...authHeaders(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ time_control: timeControl, time_mode: timeMode }),
        })
        const data = await response.json()
        navigate(`/play/${data.game_id}`)
    }

    const isSelected = (value: number, mode: 'total' | 'per_move') =>
        timeControl === value && timeMode === mode

    const buttonClass = (value: number, mode: 'total' | 'per_move') =>
        `rounded p-3 font-semibold transition ${
            isSelected(value, mode)
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
        }`

    return (
        <div className="max-w-md mx-auto p-4 text-center">
            <h1 className="text-2xl font-bold mb-6">Live Arena</h1>

            <p className="text-sm text-gray-500 mb-1">Blitz</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
                {BLITZ_PRESETS.map(preset => (
                    <button
                        key={preset.value}
                        onClick={() => selectPreset(preset.value, 'total')}
                        className={buttonClass(preset.value, 'total')}
                    >
                        {preset.label}
                    </button>
                ))}
            </div>

            <p className="text-sm text-gray-500 mb-1">Rapid</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
                {RAPID_PRESETS.map(preset => (
                    <button
                        key={preset.value}
                        onClick={() => selectPreset(preset.value, 'total')}
                        className={buttonClass(preset.value, 'total')}
                    >
                        {preset.label}
                    </button>
                ))}
            </div>

            <p className="text-sm text-gray-500 mb-1">Daily</p>
            <div className="grid grid-cols-3 gap-2 mb-6">
                {DAILY_PRESETS.map(preset => (
                    <button
                        key={preset.value}
                        onClick={() => selectPreset(preset.value, 'per_move')}
                        className={buttonClass(preset.value, 'per_move')}
                    >
                        {preset.label}
                    </button>
                ))}
            </div>

            <button
                onClick={createGame}
                disabled={creating}
                className="bg-blue-500 text-white rounded p-4 w-full text-lg font-bold
                           disabled:opacity-50 disabled:cursor-not-allowed"
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
