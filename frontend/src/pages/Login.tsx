import { useState } from 'react'

function Login() {
    // Form input state
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')

    // Error message for invalid credentials
    const [error, setError] = useState('')

    // Tracks whether login failed because the email is unverified
    const [needsVerification, setNeedsVerification] = useState(false)

    // Confirmation message shown after resending verification email
    const [resendMessage, setResendMessage] = useState('')

    // Handle login form submission
    const handleSubmit = async (event: React.SyntheticEvent) => {
        event.preventDefault()

        // Extract CSRF token from cookies for Django's CSRF protection
        const csrfToken = document.cookie
            .split('; ')
            .find(row => row.startsWith('csrftoken='))
            ?.split('=')[1]

        // Send login request to dj-rest-auth
        const response = await fetch('/api/auth/login/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken || '',
            },
            body: JSON.stringify({ username, password }),
        })

        if (response.ok) {
            // Login successful — store auth token and username, redirect to reports
            const data = await response.json()
            localStorage.setItem('authToken', data.key)
            localStorage.setItem('username', username) // live game needs this
            window.location.href = '/reports'
        } else {
            // Login failed — parse the error response to determine why.
            // dj-rest-auth returns different error messages depending on the issue.
            // Flatten all error values into a single string so we can check for
            // the specific "E-mail is not verified" message from allauth.
            const data = await response.json()
            const errorMessages = Object.values(data).flat().join(' ')

            if (errorMessages.includes('E-mail is not verified')) {
                // Credentials were correct but email isn't verified yet.
                // Show the verification UI instead of a generic error.
                setNeedsVerification(true)
                setError('')
            } else {
                // Wrong username or password
                setNeedsVerification(false)
                setError('Invalid username or password.')
            }
        }
    }

    return (
        <div className="max-w-md mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Login</h1>

            {/* Generic error message (wrong credentials) */}
            {error && <p className="text-red-500 mb-4">{error}</p>}

            {/* Email verification prompt — shown when login fails because the
                user's email is unverified. Lets them resend the verification email.
                The backend returns a masked version of their email address
                (e.g. j****e@gmail.com) so they know where to check without
                fully exposing the address. */}
            {needsVerification && (
                <div className="mb-4">
                    <p className="text-red-500 mb-2">
                        Your email address has not been verified.
                    </p>
                    <button
                        className="bg-blue-500 text-white rounded p-2"
                        onClick={async () => {
                            // Send the username to the resend endpoint.
                            // The backend looks up the user, resends the
                            // verification email, and returns a masked email.
                            // Extract CSRF token for Django's CSRF protection
                            const csrfToken = document.cookie
                                .split('; ')
                                .find(row => row.startsWith('csrftoken='))
                                ?.split('=')[1]

                            const response = await fetch(
                                '/api/auth/resend-verification/',
                                {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'X-CSRFToken': csrfToken || '',
                                    },
                                    body: JSON.stringify({ username }),
                                },
                            )
                            const data = await response.json()
                            setResendMessage(
                                `Verification email sent to ${data.masked_email}.`
                            )
                        }}
                    >
                        Resend verification email
                    </button>

                    {/* Show confirmation after the resend request succeeds */}
                    {resendMessage && (
                        <p className="text-green-500 mt-2">{resendMessage}</p>
                    )}
                </div>
            )}

            {/* Login form */}
            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="border rounded p-2 w-full"
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border rounded p-2 w-full"
                />
                <button type="submit" className="bg-blue-500 text-white rounded p-2 w-full">
                    Login
                </button>
            </form>
        </div>
    )
}

export default Login
