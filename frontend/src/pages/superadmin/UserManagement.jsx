import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, X, Eye } from 'lucide-react'
import api from '../../api/axios'
import { PageHeader } from '../../components/PageHeader'

const ROLES = ['super_admin', 'admin', 'executive', 'doctor', 'lab_technician', 'pharmacy']

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [menuTree, setMenuTree] = useState([])

  const [form, setForm] = useState({
    id: null,
    name: '',
    email: '',
    password: '',
    role: 'executive',
    gender: '',
    phone: '',
    address: '',
    user_belongs_to: '',
    discount_percentage: 0,
    permissions: [],
    is_active: true,
  })

  const loadUsers = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/users')
      setUsers(data)
    } catch (err) {
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const loadMenu = async () => {
    try {
      const { data } = await api.get('/permissions/menu')
      setMenuTree(data)
    } catch (err) {
      console.error('Failed to load menu', err)
    }
  }

  useEffect(() => {
    loadUsers()
    loadMenu()
  }, [])

  const resetForm = () => {
    setForm({
      id: null,
      name: '',
      email: '',
      password: '',
      role: 'executive',
      gender: '',
      phone: '',
      address: '',
      user_belongs_to: '',
      discount_percentage: 0,
      permissions: [],
      is_active: true,
    })
    setEditingUser(null)
  }

  const openEditModal = (user) => {
    setEditingUser(user)
    setForm({
      id: user.id,
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'executive',
      gender: user.gender || '',
      phone: user.phone || '',
      address: user.address || '',
      user_belongs_to: user.user_belongs_to || '',
      discount_percentage: user.discount_percentage || 0,
      permissions: user.permissions || [],
      is_active: Boolean(user.is_active),
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/users', form)
      resetForm()
      setShowModal(false)
      loadUsers()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save user')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this user?')) return
    try {
      await api.delete(`/users/${id}`)
      loadUsers()
    } catch (err) {
      setError(err.response?.data?.error || 'Delete failed')
    }
  }

  const togglePermission = (path) => {
    setForm(prev => {
      const perms = prev.permissions || []
      if (perms.includes(path)) {
        return { ...prev, permissions: perms.filter(p => p !== path) }
      } else {
        return { ...prev, permissions: [...perms, path] }
      }
    })
  }

  const renderPermissionTree = (items, level = 0) => {
    return items.map(item => (
      <div key={item.path || item.label} style={{ marginLeft: level * 20 }}>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.permissions.includes(item.path)}
            onChange={() => item.path && togglePermission(item.path)}
            disabled={!item.path}
          />
          <span>{item.label}</span>
        </label>
        {item.children && renderPermissionTree(item.children, level + 1)}
      </div>
    ))
  }

  return (
    <div>
      <PageHeader title="User Management" subtitle="Create, edit, and manage user accounts" />

      {error && <div className="text-sm text-danger-500 bg-danger-50 border border-danger-200 rounded-sm px-3 py-2 mb-4">{error}</div>}

      <div className="mb-4">
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add User
        </button>
      </div>

      {loading && <div className="text-center py-4">Loading...</div>}

      {!loading && users.length === 0 && <div className="text-center py-8 text-ink/50">No users found.</div>}

      {!loading && users.length > 0 && (
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Created</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.phone || '—'}</td>
                  <td>{u.role.replace('_', ' ')}</td>
                  <td>{u.is_active ? '✅ Active' : '❌ Inactive'}</td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="flex gap-1">
                    <button onClick={() => openEditModal(u)} className="text-indigo-600 hover:text-indigo-800"><Edit size={16} /></button>
                    <button onClick={() => handleDelete(u.id)} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{editingUser ? 'Edit User' : 'Add User'}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-ink/50 hover:text-ink"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Name *</label><input className="input" required value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} /></div>
                <div><label className="label">Email *</label><input type="email" className="input" required value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} /></div>
                <div><label className="label">Password {editingUser && '(leave blank to keep current)'}</label><input type="password" className="input" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} /></div>
                <div><label className="label">Role</label><select className="input" value={form.role} onChange={(e) => setForm({...form, role: e.target.value})}>{ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}</select></div>
                <div><label className="label">Gender</label><select className="input" value={form.gender} onChange={(e) => setForm({...form, gender: e.target.value})}><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></div>
                <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} /></div>
                <div className="col-span-2"><label className="label">Address</label><textarea className="input w-full" rows="2" value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} /></div>
                <div><label className="label">User Belongs To</label><input className="input" value={form.user_belongs_to} onChange={(e) => setForm({...form, user_belongs_to: e.target.value})} /></div>
                <div><label className="label">Discount Percentage</label><input type="number" className="input" value={form.discount_percentage} onChange={(e) => setForm({...form, discount_percentage: parseFloat(e.target.value) || 0})} /></div>
                <div className="col-span-2">
                  <label className="label">Permissions</label>
                  <div className="border border-border rounded-sm p-3 max-h-60 overflow-y-auto">
                    {renderPermissionTree(menuTree)}
                  </div>
                </div>
                <div className="col-span-2 flex items-center gap-4">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({...form, is_active: e.target.checked})} /> Is Active</label>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}