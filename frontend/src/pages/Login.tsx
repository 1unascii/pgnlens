import { useState } from 'react'                                                            

  function Login() {
      const [email, setEmail] = useState('')
      const [password, setPassword] = useState('')
      const [error, setError] = useState('')

      const handleSubmit = async (event: React.FormEvent) => {
          event.preventDefault()

          const csrfToken = document.cookie
              .split('; ')
              .find(row => row.startsWith('csrftoken='))
              ?.split('=')[1]

          const response = await fetch('/api/auth/login/', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'X-CSRFToken': csrfToken || '',
              },
              body: JSON.stringify({ email, password }),
          })

          if (response.ok) {
              const data = await response.json()
              localStorage.setItem('authToken', data.key)
              window.location.href = '/reports'
          } else {
              setError('Invalid email or password.')
          }
      }

      return (
          <div className="max-w-md mx-auto p-4">
              <h1 className="text-2xl font-bold mb-4">Login</h1>
              {error && <p className="text-red-500 mb-4">{error}</p>}
              <form onSubmit={handleSubmit} className="space-y-4">
                  <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
