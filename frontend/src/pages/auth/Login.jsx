import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { useAuth, dashboardPathForRole } from '../../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
      <form onSubmit={submit} className="bg-white w-full max-w-sm p-6 rounded-md shadow-sm border border-border">
        <h1 className="text-lg font-semibold mb-1">HMS Login</h1>
        <p className="text-sm text-ink/50 mb-5">Sign in to your dashboard</p>

        {error && <p className="text-sm text-danger-500 mb-3">{error}</p>}

        <label className="label">Email</label>
        <input className="input mb-3" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

        <label className="label">Password</label>
        <input className="input mb-4" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

        <button className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
          <LogIn size={15} /> {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  )
}