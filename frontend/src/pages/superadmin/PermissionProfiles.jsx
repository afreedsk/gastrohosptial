import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, X } from 'lucide-react'
import api from '../../api/axios'
import { PageHeader } from '../../components/PageHeader'

export default function PermissionProfiles() {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [menuTree, setMenuTree] = useState([])

  const fetchProfiles = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/permissions/profiles')
      setProfiles(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchMenu = async () => {
    try {
      const { data } = await api.get('/permissions/menu')
      setMenuTree(data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchProfiles()
    fetchMenu()
  }, [])

  const handleDelete = async (id) => {
    if (!confirm('Delete this profile?')) return
    try {
      await api.delete(`/permissions/profiles/${id}`)
      fetchProfiles()
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed')
    }
  }

  return (
    <div>
      <PageHeader title="Permission Profiles" subtitle="Manage user permission sets" />
      <div className="mb-4">
        <button onClick={() => { setEditingId(null); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Profile
        </button>
      </div>

      {loading && <div className="text-center py-4">Loading...</div>}
      {!loading && profiles.length === 0 && <div className="text-center py-8 text-ink/50">No profiles found.</div>}

      {!loading && profiles.length > 0 && (
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr><th>Name</th><th>Description</th><th>Permissions Count</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {profiles.map(p => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.description || '—'}</td>
                  <td>{(p.permissions || []).length}</td>
                  <td>{p.is_active ? '✅ Active' : '❌ Inactive'}</td>
                  <td className="flex gap-1">
                    <button onClick={() => { setEditingId(p.id); setShowModal(true); }} className="text-indigo-600 hover:text-indigo-800"><Edit size={16} /></button>
                    <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && <ProfileModal profileId={editingId} menuTree={menuTree} onClose={() => { setShowModal(false); setEditingId(null); fetchProfiles(); }} />}
    </div>
  )
}

// ---------- Profile Modal ----------
function ProfileModal({ profileId, menuTree, onClose }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    permissions: [],
    is_active: true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (profileId) {
      api.get(`/permissions/profiles/${profileId}`).then(res => {
        const d = res.data
        setForm({
          id: d.id,
          name: d.name || '',
          description: d.description || '',
          permissions: d.permissions || [],
          is_active: Boolean(d.is_active),
        })
      }).catch(console.error)
    }
  }, [profileId])

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

  const renderTree = (items, level = 0) => {
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
        {item.children && renderTree(item.children, level + 1)}
      </div>
    ))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return setError('Profile name is required')
    setLoading(true)
    try {
      await api.post('/permissions/profiles', form)
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">{profileId ? 'Edit Profile' : 'Add Profile'}</h2>
          <button onClick={onClose} className="text-ink/50 hover:text-ink"><X size={24} /></button>
        </div>
        {error && <div className="text-sm text-danger-500 bg-danger-50 border border-danger-200 rounded-sm px-3 py-2 mb-4">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Name *</label><input className="input" required value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} /></div>
            <div><label className="label">Description</label><input className="input" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} /></div>
            <div className="col-span-2">
              <label className="label">Permissions</label>
              <div className="border border-border rounded-sm p-3 max-h-60 overflow-y-auto">
                {renderTree(menuTree)}
              </div>
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({...form, is_active: e.target.checked})} /> Is Active</label>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Profile'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}