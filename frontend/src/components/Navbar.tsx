import { Outlet, Link } from 'react-router-dom'
import { useState } from 'react'
import { FaSun, FaMoon } from 'react-icons/fa'

function Navbar() {
    const [darkMode, setDarkMode] = useState(false)

    return (
        <div className={darkMode ? 'dark' : ''}>
            <nav className="flex items-center justify-between px-6 py-3 border-b">
                
                {/* Left side — main navigation */}
                <div className="flex items-center gap-6">
                    <Link to="/reports" className="font-semibold hover:underline">
                        Analyze
                    </Link>
                    <Link to="/practice" className="font-semibold hover:underline">
                        Practice
                    </Link>
                    <button
                        onClick={() => setDarkMode(!darkMode)}
                        className="text-xl"
                    >
                        {darkMode ? <FaSun /> : <FaMoon />}
                    </button>
                </div>

                {/* Right side — theme toggle, separator, auth links */}
                <div className="flex items-center gap-4">

                    <span className="text-gray-400">|</span>

                    <Link to="/login" className="hover:underline">
                        Login
                    </Link>
                    <Link to="/register" className="hover:underline">
                        Register
                    </Link>
                </div>
            </nav>

            {/* Page content renders here */}
            <main>
                <Outlet />
            </main>
        </div>
    )
}

export default Navbar