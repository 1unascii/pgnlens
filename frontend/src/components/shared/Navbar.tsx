import { Outlet, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { FaSun, FaMoon } from 'react-icons/fa'
import authHeaders from '../../utils/authHeaders'

function Navbar() {
    const [darkMode, setDarkMode] = useState(() => {
        return localStorage.getItem('theme') === 'dark'
    })

    const [isLoggedIn, setIsLoggedIn] = useState(() => {                                        
        return !!localStorage.getItem('authToken')
    })

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark')
            localStorage.setItem('theme', 'dark')
        } else {
            document.documentElement.classList.remove('dark')
            localStorage.setItem('theme', 'light')
        }
    }, [darkMode])

    return (
        <div>
            <nav className="flex items-center justify-between px-6 py-3 border-b
                            bg-white dark:bg-gray-900 text-black dark:text-white
                            border-gray-200 dark:border-gray-700">
                {/* Left side — main navigation */}
                <div className="flex items-center gap-6">
                    <Link to="/reports" className="font-semibold hover:underline">
                        Analyze
                    </Link>
                    <Link to="/practice" className="font-semibold hover:underline">
                        Practice
                    </Link>
                </div>

                {/* Right side — theme toggle, separator, auth links */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setDarkMode(!darkMode)}
                        className="text-xl"
                    >
                        {darkMode ? <FaSun /> : <FaMoon />}
                    </button>

                    <span className="text-gray-400">|</span>

                    {isLoggedIn ? (
                        <>
                            <button
                                onClick={async () => {
                                    await fetch('/api/auth/logout/', {
                                        method: 'POST',
                                        headers: authHeaders(),
                                    })
                                    localStorage.removeItem('authToken')
                                    setIsLoggedIn(false)
                                    window.location.href = '/login'
                                }}
                                className="hover:underline"
                            >
                                Logout
                            </button>
                            <Link to="/profile" className="hover:underline">
                                Profile
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="hover:underline">
                                Login
                            </Link>
                            <Link to="/register" className="hover:underline">
                                Register
                            </Link>
                        </>
                    )}
                </div>
            </nav>

            {/* Page content renders here */}
            <main className="bg-white dark:bg-gray-900 text-black dark:text-white min-h-screen">
                <Outlet />
            </main>
        </div>
    )
}

export default Navbar