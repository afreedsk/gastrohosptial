import { useEffect, useState } from 'react'
import api from '../../api/axios'

const ADD_NEW_VALUE = '__add_new__'

/**
 * Doctor picker used by both OP and IP registration forms.
 *
 * - Selecting an existing doctor calls onChange(doctorId) as before.
 * - Selecting "+ Add New Doctor" reveals an inline mini-form. Saving it
 *   POSTs to /doctors, adds the new doctor to the shared `doctors` list
 *   (via onDoctorAdded) and auto-selects it (via onChange), so the parent
 *   form ends up with the correct doctor_id either way.
 *
 * Props:
 *  - doctors: array of { id, name, department, consultation_fee }
 *  - value: currently selected doctor_id (string/number) or ''
 *  - onChange(doctorId): called when a doctor is selected (existing or newly created)
 *  - onDoctorAdded(doctor): called with the newly created doctor row so the
 *    parent can push it into its own `doctors` state
 */
export default function DoctorSelect({ doctors, value, onChange, onDoctorAdded }) {
  const [departments, setDepartments] = useState([])
  const [adding, setAdding] = useState(false)
  const [newDoctor, setNewDoctor] = useState({ name: '', department_id: '', consultation_fee: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { api.get('/departments').then((r) => setDepartments(r.data)).catch(() => {}) }, [])

  const startAdd = () => {
    setNewDoctor({ name: '', department_id: '', consultation_fee: '', phone: '' })
    setError('')
    setAdding(true)
  }

  const cancelAdd = () => {
    setAdding(false)
    setError('')
  }

  const setField = (k, v) => setNewDoctor((d) => ({ ...d, [k]: v }))

  const saveNewDoctor = async () => {
    if (!newDoctor.name.trim()) {
      setError('Doctor name is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const { data } = await api.post('/doctors', {
        name: newDoctor.name.trim(),
        department_id: newDoctor.department_id || null,
        consultation_fee: newDoctor.consultation_fee ? Number(newDoctor.consultation_fee) : 0,
        phone: newDoctor.phone,
      })
      onDoctorAdded?.(data)
      onChange(String(data.id))
      setAdding(false)
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save doctor')
    } finally {
      setSaving(false)
    }
  }

  if (adding) {
    return (
      <div className="space-y-2 border border-border rounded-sm p-3 bg-ink/[0.02]">
        {error && (
          <div className="text-xs text-danger-500 bg-danger-400/10 border border-danger-400/30 rounded-sm px-2 py-1">
            {error}
          </div>
        )}
        <input
          className="input"
          placeholder="Doctor Name *"
          value={newDoctor.name}
          onChange={(e) => setField('name', e.target.value)}
          autoFocus
        />
        <select
          className="input"
          value={newDoctor.department_id}
          onChange={(e) => setField('department_id', e.target.value)}
        >
          <option value="">-- Department --</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <input
          type="number"
          min="0"
          className="input"
          placeholder="Consultation Fee"
          value={newDoctor.consultation_fee}
          onChange={(e) => setField('consultation_fee', e.target.value)}
        />
        <input
          className="input"
          placeholder="Phone"
          value={newDoctor.phone}
          onChange={(e) => setField('phone', e.target.value)}
        />
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            className="btn-primary text-xs px-3 py-1.5"
            disabled={saving}
            onClick={saveNewDoctor}
          >
            {saving ? 'Saving…' : 'Save Doctor'}
          </button>
          <button type="button" className="btn-secondary text-xs px-3 py-1.5" onClick={cancelAdd}>
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <select
      className="input"
      value={value}
      onChange={(e) => {
        if (e.target.value === ADD_NEW_VALUE) {
          startAdd()
        } else {
          onChange(e.target.value)
        }
      }}
    >
      <option value="">-- Select Doctor --</option>
      {doctors.map((d) => (
        <option key={d.id} value={d.id}>{d.name} ({d.department})</option>
      ))}
      <option value={ADD_NEW_VALUE}>+ Add New Doctor</option>
    </select>
  )
}