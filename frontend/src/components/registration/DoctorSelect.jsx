import { useEffect, useState } from 'react'
import api from '../../api/axios'

/**
 * Doctor picker used by both OP and IP registration forms.
 *
 * Renders its own label row with an "Add New +" link next to it. Clicking
 * it swaps the dropdown for an inline mini-form; the dropdown itself only
 * ever lists real doctors (no pseudo "add new" option mixed into it).
 *
 * - Selecting an existing doctor calls onChange(doctorId) as before.
 * - Saving the inline form POSTs to /doctors, adds the new doctor to the
 *   shared `doctors` list (via onDoctorAdded) and auto-selects it (via
 *   onChange), so the parent form ends up with the correct doctor_id either way.
 *
 * Props:
 *  - label: text shown above the field (e.g. "Consultant Doctor")
 *  - doctors: array of { id, name, department, consultation_fee }
 *  - value: currently selected doctor_id (string/number) or ''
 *  - onChange(doctorId): called when a doctor is selected (existing or newly created)
 *  - onDoctorAdded(doctor): called with the newly created doctor row so the
 *    parent can push it into its own `doctors` state
 */
export default function DoctorSelect({ label = 'Consultant Doctor', doctors, value, onChange, onDoctorAdded }) {
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

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="label mb-0">{label}</label>
        {!adding && (
          <button
            type="button"
            onClick={startAdd}
            className="text-xs text-teal-600 underline hover:text-teal-700"
          >
            {/* Add New + */}
          </button>
        )}
      </div>

      {adding ? (
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
      ) : (
        <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">-- Select Doctor --</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>{d.name} ({d.department})</option>
          ))}
        </select>
      )}
    </div>
  )
}