import { useState } from 'react'
import { useParams } from 'react-router-dom'

function ConfirmEmail() {
    const { key } = useParams()

    // Status messages
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

    // Tracks whether the verification link has expired
    const [expired, setExpired] = useState(false)

    // Email input for resending verification when the link is expired
    const [email, setEmail] = useState('')

    // Confirmation message after resending
    const [resendMessage, setResendMessage] = useState('')

    // Attempt to verify the email using the key from the URL
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
            // Verification succeeded
            setMessage('Email verified! You can now log in.')
            setError('')
            setExpired(false)
        } else {
            // Verification failed — the key is invalid or expired
            setError('Verification failed. The link may have expired.')
            setMessage('')
            setExpired(true)
        }
    }

    return (
        <div className="max-w-md mx-auto p-4 text-center">
            <h1 className="text-2xl font-bold mb-4">Confirm Your Email</h1>

            {/* Success message after verification */}
            {message && <p className="text-green-500 mb-4">{message}</p>}

            {/* Error message when verification fails */}
            {error && <p className="text-red-500 mb-4">{error}</p>}

            {/* Verify button — hidden after successful verification */}
            {!message && !expired && (
                <button
                    onClick={handleConfirm}
                    className="bg-blue-500 text-white rounded p-2 w-full"
                >
                    Verify Email
                </button>
            )}

            {/* Resend form — shown when the verification link is expired.
                Uses the dj-rest-auth resend endpoint since we don't have
                the username on this page, only the user's email. */}
            {expired && (
                <div className="mt-4">
                    <p className="mb-2">Enter your email to receive a new verification link.</p>
                    <input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="border rounded p-2 w-full mb-2"
                    />
                    <button
                        className="bg-blue-500 text-white rounded p-2 w-full"
                        onClick={async () => {
                            // Extract CSRF token for Django's CSRF protection
                            const csrfToken = document.cookie
                                .split('; ')
                                .find(row => row.startsWith('csrftoken='))
                                ?.split('=')[1]

                            const response = await fetch('/api/auth/resend-verification/', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'X-CSRFToken': csrfToken || '',
                                },
                                body: JSON.stringify({ email }),
                            })
                            const data = await response.json()
                            setResendMessage(
                                data.masked_email
                                    ? `Verification email sent to ${data.masked_email}.`
                                    : 'Verification email sent. Check your inbox.'
                            )
                        }}
                    >
                        Resend verification email
                    </button>

                    {/* Confirmation after resend request */}
                    {resendMessage && (
                        <p className="text-green-500 mt-2">{resendMessage}</p>
                    )}
                </div>
            )}
        </div>
    )
}

export default ConfirmEmail
