import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import authHeaders from '../utils/authHeaders'

function ReportsCreate() {
    const navigate = useNavigate()
    const [file, setFile] = useState<File | null>(null)
    const [playerName, setPlayerName] = useState('')
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [fading, setFading] = useState(false)

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        if (!file || !playerName) return

        const formData = new FormData()
        formData.append('file', file)
        formData.append('player_name', playerName)

        const response = await fetch('/api/reports/', {
            method: 'POST',
            headers: authHeaders(),
            body: formData,
        })

        if (response.ok) {
            setMessage('Report created!')
            setError('')
            setTimeout(() => setFading(true), 1500)
            setTimeout(() => navigate('/reports'), 2500)
        } else {
            const data = await response.json()
            setError(
                typeof data === 'object'
                    ? Object.values(data).flat().join(' ')
                    : 'Something went wrong.'
            )
            setMessage('')
        }
    }

    return (
        <div className="max-w-md mx-auto p-4">
            <h1 className="text-2xl font-bold mb-6">Upload PGN File</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    type="file"
                    accept=".pgn"
                    required
                    onChange={(event) => setFile(event.target.files?.[0] || null)}
                    className="block w-full text-sm border rounded p-2 bg-white dark:bg-gray-800"
                />
                <input
                    type="text"
                    placeholder="Enter player name"
                    value={playerName}
                    onChange={(event) => setPlayerName(event.target.value)}
                    className="border rounded p-2 w-full bg-white dark:bg-gray-800"
                />
                <button
                    type="submit"
                    disabled={!file || !playerName}
                    className="bg-blue-500 text-white rounded p-2 w-full font-semibold
                               disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Upload and Create Report
                </button>
            </form>

            {error && (
                <p className="text-red-500 mt-4">{error}</p>
            )}

            {message && (
                <div className={`fixed inset-0 flex items-start justify-center pt-32 bg-black/50 z-50
                                 transition-opacity duration-1000 ${fading ? 'opacity-0' : 'opacity-100'}`}>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg text-center">
                        <p className="text-lg font-bold text-green-500">{message}</p>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ReportsCreate
