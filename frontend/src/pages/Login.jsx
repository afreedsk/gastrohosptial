import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/executive/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-9 h-9 rounded-md bg-teal-600 flex items-center justify-center">
            <Activity size={18} className="text-white" />
          </div>
          <span className="h-title text-lg">HMS Console</span>
        </div>

        <form onSubmit={handleSubmit} className="card p-6">
          <h1 className="h-title text-base mb-1">Sign in</h1>
          <p className="text-sm text-ink/50 mb-5">Executive &amp; reception access</p>

          {error && (
            <div className="mb-4 text-sm text-danger-500 bg-danger-400/10 border border-danger-400/30 rounded-sm px-3 py-2">
              {error}
            </div>
          )}

          <label className="label">Email</label>
          <input
            className="input mb-4"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@hospital.com"
            required
          />

          <label className="label">Password</label>
          <input
            className="input mb-6"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          <button className="btn-primary w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="text-xs text-ink/40 text-center mt-4">
          Accounts are created via <code>/api/auth/register</code> by an admin.
        </p>
      </div>
    </div>
  )
}
