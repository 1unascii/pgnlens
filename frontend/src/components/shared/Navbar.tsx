import { Outlet, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { FaSun, FaMoon, FaBookOpen } from 'react-icons/fa'
import { GiCrossedSwords } from 'react-icons/gi'
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
                    <Link to="/reports" className="font-semibold hover:underline flex items-center gap-1.5">
                        <svg viewBox="0 0 76 76" width="18" height="18">
                            <rect x="2" y="2" width="56" height="56" rx="4" fill="#1a1a2e"/>
                            <rect x="4" y="4" width="13" height="13" fill="#f0d9b5"/>
                            <rect x="17" y="4" width="13" height="13" fill="#b58863"/>
                            <rect x="30" y="4" width="13" height="13" fill="#f0d9b5"/>
                            <rect x="43" y="4" width="13" height="13" fill="#b58863"/>
                            <rect x="4" y="17" width="13" height="13" fill="#b58863"/>
                            <rect x="17" y="17" width="13" height="13" fill="#f0d9b5"/>
                            <rect x="30" y="17" width="13" height="13" fill="#b58863"/>
                            <rect x="43" y="17" width="13" height="13" fill="#f0d9b5"/>
                            <rect x="4" y="30" width="13" height="13" fill="#f0d9b5"/>
                            <rect x="17" y="30" width="13" height="13" fill="#b58863"/>
                            <rect x="30" y="30" width="13" height="13" fill="#f0d9b5"/>
                            <rect x="43" y="30" width="13" height="13" fill="#b58863"/>
                            <rect x="4" y="43" width="13" height="13" fill="#b58863"/>
                            <rect x="17" y="43" width="13" height="13" fill="#f0d9b5"/>
                            <rect x="30" y="43" width="13" height="13" fill="#b58863"/>
                            <rect x="43" y="43" width="13" height="13" fill="#f0d9b5"/>
                            <circle cx="44" cy="44" r="23" fill="rgba(26,26,46,0.4)" stroke="#3b82f6" strokeWidth="3.5"/>
                            <line x1="60" y1="60" x2="73" y2="73" stroke="#3b82f6" strokeWidth="5" strokeLinecap="round"/>
                        </svg>
                        Analyze
                    </Link>
                    <Link to="/practice" className="font-semibold hover:underline flex items-center gap-1.5">
                        <FaBookOpen />
                        Practice
                    </Link>
                    <Link to="/play" className="font-semibold hover:underline flex items-center gap-1.5">
                        <GiCrossedSwords />
                        Live Arena
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