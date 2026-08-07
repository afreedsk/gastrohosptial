import { useEffect, useState } from 'react'
import { ShieldCheck, KeyRound, Power } from 'lucide-react'
import api from '../../api/axios'
import { PageHeader, Section } from '../../components/PageHeader'

const ROLES = ['super_admin', 'admin', 'executive', 'doctor', 'lab_technician']

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('executive')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadUsers = () => api.get('/users').then((r) => setUsers(r.data))
  useEffect(() => { loadUsers() }, [])

  const createUser = async (e) => {
    e.preventDefault()
    setError('')
    if (!name || !email || !password) return setError('Name, email and password are required')
    setSaving(true)
    try {
      await api.post('/users', { name, email, password, role })
      setName(''); setEmail(''); setPassword(''); setRole('executive')
      loadUsers()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user')
    } finally {
      setSaving(false)
    }
  }

  const changeRole = async (id, newRole) => {
    try {
      await api.patch(`/users/${id}/role`, { role: newRole })
      loadUsers()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update role')
    }
  }

  const toggleStatus = async (u) => {
    try {
      await api.patch(`/users/${u.id}/status`, { is_active: u.is_active ? 0 : 1 })
      loadUsers()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update status')
    }
  }

  const resetPassword = async (id) => {
    const pw = window.prompt('Enter new password for this user (min 6 characters):')
    if (!pw) return
    try {
      await api.post(`/users/${id}/reset-password`, { password: pw })
      alert('Password reset successfully')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password')
    }
  }

  return (
    <div>
      <PageHeader title="User & Role Management" subtitle="Super Admin controls — create accounts, assign roles, manage access" />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <form onSubmit={createUser} className="xl:col-span-1">
          <Section title="New User">
            {error && <p className="text-sm text-danger-500 mb-3">{error}</p>}

            <label className="label">Name</label>
            <input className="input mb-3" value={name} onChange={(e) => setName(e.target.value)} />

            <label className="label">Email</label>
            <input className="input mb-3" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

            <label className="label">Password</label>
            <input className="input mb-3" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

            <label className="label">Role</label>
            <select className="input mb-4" value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
            </select>

            <button className="btn-primary w-full flex items-center justify-center gap-2" disabled={saving}>
              <ShieldCheck size={15} /> {saving ? 'Creating…' : 'Create User'}
            </button>
          </Section>
        </form>

        <div className="xl:col-span-2">
          <Section title="All Users">
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Created</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>
                        <select
                          className="input py-1 text-sm"
                          value={u.role}
                          onChange={(e) => changeRole(u.id, e.target.value)}
                        >
                          {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                        </select>
                      </td>
                      <td>
                        <span className={u.is_active ? 'text-teal-600' : 'text-danger-500'}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            title="Reset password"
                            onClick={() => resetPassword(u.id)}
                            className="p-1 text-ink/50 hover:text-teal-600"
                          >
                            <KeyRound size={15} />
                          </button>
                          <button
                            type="button"
                            title={u.is_active ? 'Deactivate' : 'Activate'}
                            onClick={() => toggleStatus(u)}
                            className="p-1 text-ink/50 hover:text-danger-500"
                          >
                            <Power size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!users.length && <tr><td colSpan={6} className="text-center text-ink/40 py-8">No users yet</td></tr>}
                </tbody>
              </table>
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}