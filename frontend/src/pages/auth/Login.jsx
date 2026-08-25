import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { useAuth, dashboardPathForRole } from '../../context/AuthContext'
import logo from '../../assets/siddharthhospital.png' // adjust if name differs

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [fadeIn, setFadeIn] = useState(false)

  // Trigger animation after component mounts
  useEffect(() => {
    setFadeIn(true)
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(email, password)
      navigate(dashboardPathForRole(user.role), { replace: true })
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink/5">
      <div
        className={`
          bg-white w-full max-w-sm p-8 rounded-md shadow-sm border border-border
          transition-all duration-700 ease-out
          ${fadeIn ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
        `}
      >
        {/* Logo & Title */}
        <div className="text-center mb-6">
          <img
            src={logo}
            alt="Siddharth Hospital"
            className="w-32 h-32 mx-auto object-contain mb-3 drop-shadow-md"
          />
          <h1 className="text-2xl font-display font-semibold text-ink tracking-tight">
            Siddharth Hospital
          </h1>
          <p className="text-sm text-ink/50 mt-0.5">Healthcare Management System</p>
        </div>

        <hr className="mb-5 border-border" />

        {error && (
          <div className="text-sm text-danger-500 bg-danger-400/10 border border-danger-400/20 rounded-sm px-3 py-2 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={submit}>
          <label className="label">Email</label>
          <input
            className="input mb-3"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
          />

          <label className="label">Password</label>
          <input
            className="input mb-4"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          <button
            type="submit"
            className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
            disabled={loading}
          >
            <LogIn size={18} />
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-xs text-ink/30 text-center mt-4">
          © {new Date().getFullYear()} Siddharth Hospital
        </p>
      </div>
    </div>
  )
}