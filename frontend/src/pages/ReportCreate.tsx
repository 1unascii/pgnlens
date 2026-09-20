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
    const [uploading, setUploading] = useState(false)

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        if (!file || !playerName || uploading) return

        setUploading(true)
        setError('')

        const formData = new FormData()
        formData.append('file', file)
        formData.append('player_name', playerName)

        // Check for auth token before making the request.
        // authHeaders() redirects to /login if no token exists,
        // which causes a flash. Handle it gracefully instead.
        const token = localStorage.getItem('authToken')
        if (!token) {
            setUploading(false)
            setError('You must be logged in to create a report.')
            setMessage('')
            setTimeout(() => setFading(true), 1500)
            setTimeout(() => { setFading(false); navigate('/login') }, 2500)
            return
        }

        try {
            const response = await fetch('/api/reports/', {
                method: 'POST',
                headers: authHeaders(),
                body: formData,
            })

            setUploading(false)

            if (response.ok) {
                setMessage('Report created!')
                setError('')
                setTimeout(() => setFading(true), 1500)
                setTimeout(() => navigate('/reports'), 2500)
            } else if (response.status === 401 || response.status === 403) {
                // Token exists but is invalid/expired
                localStorage.removeItem('authToken')
                setError('Your session has expired. Please log in again.')
                setMessage('')
                setTimeout(() => setFading(true), 1500)
                setTimeout(() => { setFading(false); navigate('/login') }, 2500)
            } else {
                const data = await response.json()
                setError(
                    typeof data === 'object'
                        ? Object.values(data).flat().join(' ')
                        : 'Something went wrong.'
                )
                setMessage('')
            }
        } catch {
            setUploading(false)
            setError('Request timed out.')
            setTimeout(() => navigate('/reports'), 2000)
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
                    disabled={!file || !playerName || uploading}
                    className="bg-blue-500 text-white rounded p-2 w-full font-semibold
                               disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {uploading ? 'Uploading...' : 'Upload and Create Report'}
                </button>
            </form>

            {/* Success or error popup — same fade-out overlay for both */}
            {(message || error) && (
                <div className={`fixed inset-0 flex items-start justify-center pt-32 bg-black/50 z-50
                                 transition-opacity duration-1000 ${fading ? 'opacity-0' : 'opacity-100'}`}>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg text-center">
                        {message && <p className="text-lg font-bold text-green-500">{message}</p>}
                        {error && <p className="text-lg font-bold text-red-500">{error}</p>}
                    </div>
                </div>
            )}
        </div>
    )
}

export default ReportsCreate
