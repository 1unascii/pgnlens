import { useState } from 'react'
import { useParams } from 'react-router-dom'

function ConfirmEmail() {
    const { key } = useParams()
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

    const handleConfirm = async () => {
        const csrfToken = document.cookie
            .split('; ')
            .find(row => row.startsWith('csrftoken='))
            ?.split('=')[1]

        const response = await fetch('/api/auth/verify-email/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken || '',
            },
            body: JSON.stringify({ key }),
        })

        if (response.ok) {
            setMessage('Email verified! You can now log in.')
            setError('')
        } else {
            setError('Verification failed. The link may have expired.')
            setMessage('')
        }
    }

    return (
        <div className="max-w-md mx-auto p-4 text-center">
            <h1 className="text-2xl font-bold mb-4">Confirm Your Email</h1>
            {message && <p className="text-green-500 mb-4">{message}</p>}
            {error && <p className="text-red-500 mb-4">{error}</p>}
            {!message && (
                <button
                    onClick={handleConfirm}
                    className="bg-blue-500 text-white rounded p-2 w-full"
                >
                    Verify Email
                </button>
            )}
        </div>
    )
}

export default ConfirmEmail