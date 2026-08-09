import { useState, useEffect } from 'react'
import authHeaders from '../utils/authHeaders'

function Profile() {
    const [user, setUser] = useState<{ username: string, email: string } | null>(null)

    useEffect(() => {
        fetch('/api/auth/user/', {
            headers: authHeaders(),
        })
            .then(response => response.json())
            .then(data => setUser(data))
    }, [])

    if (!user) return <div>Loading...</div>

    return (
        <div className="max-w-md mx-auto p-4">
            <p><strong>Username:</strong> {user.username}</p>
            <p><strong>Email:</strong> {user.email}</p>
        </div>
    )
}

export default Profile
