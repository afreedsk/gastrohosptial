import { useEffect, useState } from 'react'
import { Plus, Search, Edit, Trash2, X, Download, Upload } from 'lucide-react'
import api from '../../api/axios'
import { PageHeader } from '../../components/PageHeader'

export default function DoctorMaster() {
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [departments, setDepartments] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchDoctors = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      const { data } = await api.get(`/doctors?${params.toString()}`)
      setDoctors(data)
    } catch (err) {
      console.error(err)
      setError('Failed to load doctors')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDoctors()
    api.get('/departments').then(res => setDepartments(res.data)).catch(console.error)
  }, [])

  const handleDelete = async (id) => {
    if (!confirm('Delete this doctor?')) return
    try {
      await api.delete(`/doctors/${id}`)
      setSuccess('Doctor deleted successfully')
      fetchDoctors()
    } catch (err) {
      setError(err.response?.data?.error || 'Delete failed')
    }
  }

  // ---------- CSV PARSER (handles quoted fields) ----------
  const parseCSVLine = (line) => {
    const result = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())
    return result
  }

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim())
    if (!lines.length) return []

    const headerLine = lines[0]
    const headers = parseCSVLine(headerLine)
    const result = []
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      if (values.length < headers.length) continue
      const obj = {}
      headers.forEach((h, idx) => {
        obj[h] = values[idx] || ''
      })
      result.push(obj)
    }
    return result
  }

  // ---------- EXPORT CSV ----------
  const exportCSV = async () => {
    try {
      const { data } = await api.get('/doctors/export')
      if (!data.length) {
        alert('No doctors to export')
        return
      }
      const headers = Object.keys(data[0])
      const rows = data.map(row => headers.map(key => `"${(row[key] ?? '').replace(/"/g, '""')}"`).join(','))
      const csv = [headers.join(','), ...rows].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Doctor_Masters_${new Date().toISOString().slice(0,10)}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
      setSuccess('Export successful')
    } catch (err) {
      setError('Export failed: ' + (err.response?.data?.error || err.message))
    }
  }

  // ---------- IMPORT CSV ----------
  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const text = event.target.result
        const rows = parseCSV(text)
        if (!rows.length) {
          alert('No data rows found in CSV')
          return
        }
        const { data } = await api.post('/doctors/import', { doctors: rows })
        setSuccess(data.message)
        if (data.errors && data.errors.length) {
          alert(`Import completed with errors:\n${data.errors.join('\n')}`)
        }
        fetchDoctors()
      } catch (err) {
        setError('Import failed: ' + (err.response?.data?.error || err.message))
      }
      e.target.value = ''
    }
    reader.readAsText(file)
  }

  return (
    <div>
      <PageHeader title="Doctor Master" subtitle="Manage doctor profiles" />

      {error && <div className="text-sm text-danger-500 bg-danger-50 border border-danger-200 rounded-sm px-3 py-2 mb-4">{error}</div>}
      {success && <div className="text-sm text-teal-700 bg-teal-50 border border-teal-100 rounded-sm px-3 py-2 mb-4">{success}</div>}

      <div className="flex flex-wrap gap-4 items-end mb-4">
        <div className="flex-1 min-w-[200px]">
          <label className="label">Search</label>
          <input className="input" placeholder="By name, email, phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button onClick={fetchDoctors} className="btn-primary flex items-center gap-2"><Search size={16} /> Search</button>
        <button onClick={exportCSV} className="btn-primary flex items-center gap-2 bg-green-600 hover:bg-green-700">
          <Download size={16} /> Export
        </button>
        <label className="btn-primary flex items-center gap-2 bg-blue-600 hover:bg-blue-700 cursor-pointer">
          <Upload size={16} /> Import CSV
          <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
        </label>
        <button onClick={() => { setEditingId(null); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Doctor
        </button>
      </div>

      {loading && <div className="text-center py-4">Loading...</div>}
      {!loading && doctors.length === 0 && <div className="text-center py-8 text-ink/50">No doctors found.</div>}

      {!loading && doctors.length > 0 && (
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Name</th><th>Gender</th><th>Phone</th><th>Department</th><th>Email</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {doctors.map(d => (
                <tr key={d.id}>
                  <td>{d.name || `${d.first_name} ${d.last_name}`}</td>
                  <td>{d.gender || '—'}</td>
                  <td>{d.phone || '—'}</td>
                  <td>{d.department || '—'}</td>
                  <td>{d.email || '—'}</td>
                  <td>{d.is_active ? '✅ Active' : '❌ Inactive'}</td>
                  <td className="flex gap-1">
                    <button onClick={() => { setEditingId(d.id); setShowModal(true); }} className="text-indigo-600 hover:text-indigo-800"><Edit size={16} /></button>
                    <button onClick={() => handleDelete(d.id)} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && <DoctorModal doctorId={editingId} departments={departments} onClose={() => { setShowModal(false); setEditingId(null); fetchDoctors(); }} />}
    </div>
  )
}

// ---------- Doctor Modal (unchanged) ----------
function DoctorModal({ doctorId, departments, onClose }) {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    gender: 'Male',
    phone: '',
    emergency_phone: '',
    email: '',
    address: '',
    department_id: '',
    specialization: '',
    op_consultation_fee: 0,
    ip_consultation_fee: 0,
    surgeon_fee: 0,
    emergency_consultation_fee: 0,
    op_visits: 0,
    op_valid_for: 0,
    op_doctor_fee: 0,
    ip_doctor_fee: 0,
    doctor_description: '',
    image: '',
    signature: '',
    is_active: true,
    max_bookings_per_day: 0,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (doctorId) {
      api.get(`/doctors/${doctorId}`).then(res => {
        const d = res.data
        setForm({
          id: d.id,
          first_name: d.first_name || '',
          last_name: d.last_name || '',
          gender: d.gender || 'Male',
          phone: d.phone || '',
          emergency_phone: d.emergency_phone || '',
          email: d.email || '',
          address: d.address || '',
          department_id: d.department_id || '',
          specialization: d.specialization || '',
          op_consultation_fee: d.op_consultation_fee || 0,
          ip_consultation_fee: d.ip_consultation_fee || 0,
          surgeon_fee: d.surgeon_fee || 0,
          emergency_consultation_fee: d.emergency_consultation_fee || 0,
          op_visits: d.op_visits || 0,
          op_valid_for: d.op_valid_for || 0,
          op_doctor_fee: d.op_doctor_fee || 0,
          ip_doctor_fee: d.ip_doctor_fee || 0,
          doctor_description: d.doctor_description || '',
          image: d.image || '',
          signature: d.signature || '',
          is_active: Boolean(d.is_active),
          max_bookings_per_day: d.max_bookings_per_day || 0,
        })
      }).catch(console.error)
    }
  }, [doctorId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.first_name.trim()) return setError('First name is required')
    setLoading(true)
    try {
      await api.post('/doctors', form)
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">{doctorId ? 'Edit Doctor' : 'Add New Doctor'}</h2>
          <button onClick={onClose} className="text-ink/50 hover:text-ink"><X size={24} /></button>
        </div>
        {error && <div className="text-sm text-danger-500 bg-danger-50 border border-danger-200 rounded-sm px-3 py-2 mb-4">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div><label className="label">First Name *</label><input className="input" required value={form.first_name} onChange={(e) => setForm({...form, first_name: e.target.value})} /></div>
            <div><label className="label">Last Name</label><input className="input" value={form.last_name} onChange={(e) => setForm({...form, last_name: e.target.value})} /></div>
            <div><label className="label">Gender</label>
              <select className="input" value={form.gender} onChange={(e) => setForm({...form, gender: e.target.value})}>
                <option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
              </select>
            </div>
            <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} /></div>
            <div><label className="label">Emergency Phone</label><input className="input" value={form.emergency_phone} onChange={(e) => setForm({...form, emergency_phone: e.target.value})} /></div>
            <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} /></div>
            <div className="col-span-2"><label className="label">Address</label><textarea className="input w-full" rows="2" value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} /></div>
            <div><label className="label">Department</label>
              <select className="input" value={form.department_id} onChange={(e) => setForm({...form, department_id: e.target.value})}>
                <option value="">Select</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div><label className="label">Specialization</label><input className="input" value={form.specialization} onChange={(e) => setForm({...form, specialization: e.target.value})} /></div>
            <div><label className="label">OP Consultation Fee</label><input type="number" className="input" value={form.op_consultation_fee} onChange={(e) => setForm({...form, op_consultation_fee: parseFloat(e.target.value) || 0})} /></div>
            <div><label className="label">IP Consultation Fee</label><input type="number" className="input" value={form.ip_consultation_fee} onChange={(e) => setForm({...form, ip_consultation_fee: parseFloat(e.target.value) || 0})} /></div>
            <div><label className="label">Surgeon Fee</label><input type="number" className="input" value={form.surgeon_fee} onChange={(e) => setForm({...form, surgeon_fee: parseFloat(e.target.value) || 0})} /></div>
            <div><label className="label">Emergency Consultation Fee</label><input type="number" className="input" value={form.emergency_consultation_fee} onChange={(e) => setForm({...form, emergency_consultation_fee: parseFloat(e.target.value) || 0})} /></div>
            <div><label className="label">OP Visits</label><input type="number" className="input" value={form.op_visits} onChange={(e) => setForm({...form, op_visits: parseInt(e.target.value) || 0})} /></div>
            <div><label className="label">OP Valid For</label><input type="number" className="input" value={form.op_valid_for} onChange={(e) => setForm({...form, op_valid_for: parseInt(e.target.value) || 0})} /></div>
            <div><label className="label">OP Doctor Fee</label><input type="number" className="input" value={form.op_doctor_fee} onChange={(e) => setForm({...form, op_doctor_fee: parseFloat(e.target.value) || 0})} /></div>
            <div><label className="label">IP Doctor Fee</label><input type="number" className="input" value={form.ip_doctor_fee} onChange={(e) => setForm({...form, ip_doctor_fee: parseFloat(e.target.value) || 0})} /></div>
            <div className="col-span-2"><label className="label">Doctor Description</label><textarea className="input w-full" rows="3" value={form.doctor_description} onChange={(e) => setForm({...form, doctor_description: e.target.value})} /></div>
            <div><label className="label">Max Bookings Per Day</label><input type="number" className="input" value={form.max_bookings_per_day} onChange={(e) => setForm({...form, max_bookings_per_day: parseInt(e.target.value) || 0})} /></div>
            <div className="col-span-2 flex items-center gap-4">
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({...form, is_active: e.target.checked})} /> Is Active</label>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Submit'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}