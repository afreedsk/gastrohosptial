import { useEffect, useState } from 'react'
import api from '../../api/axios'

const ADD_NEW_VALUE = '__add_new__'

/**
 * Picker for the "Referring Doctor Name" field on the OP registration form.
 *
 * Unlike DoctorSelect (which selects the hospital's own consultant doctors
 * by id), this manages a separate list of *external* referring doctors and
 * outputs a plain name string via onChange — so it drops straight into the
 * existing `form.referral_doctor_name` field with no backend schema change.
 *
 * "+ Add New Referring Doctor" is listed FIRST, existing names below it.
 *
 * Props:
 *  - value: current referral_doctor_name string
 *  - onChange(name): called with the chosen or newly-created doctor's name
 */
export default function ReferringDoctorSelect({ value, onChange }) {
  const [referringDoctors, setReferringDoctors] = useState([])
  const [adding, setAdding] = useState(false)
  const [newDoctor, setNewDoctor] = useState({ name: '', phone: '', hospital_name: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/referral-doctors').then((r) => setReferringDoctors(r.data)).catch(() => {})
  }, [])

  const startAdd = () => {
    setNewDoctor({ name: '', phone: '', hospital_name: '' })
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
      const { data } = await api.post('/referral-doctors', {
        name: newDoctor.name.trim(),
        phone: newDoctor.phone,
        hospital_name: newDoctor.hospital_name,
      })
      setReferringDoctors((prev) => [data, ...prev])
      onChange(data.name)
      setAdding(false)
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save referring doctor')
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
          placeholder="Referring Doctor Name *"
          value={newDoctor.name}
          onChange={(e) => setField('name', e.target.value)}
          autoFocus
        />
        <input
          className="input"
          placeholder="Hospital / Clinic"
          value={newDoctor.hospital_name}
          onChange={(e) => setField('hospital_name', e.target.value)}
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

  // Match the current value against the known list so an existing selection
  // (or a legacy free-typed name already sitting in form state) still shows.
  const matchesKnownDoctor = referringDoctors.some((d) => d.name === value)

  return (
    <select
      className="input"
      value={matchesKnownDoctor ? value : ''}
      onChange={(e) => {
        if (e.target.value === ADD_NEW_VALUE) {
          startAdd()
        } else {
          onChange(e.target.value)
        }
      }}
    >
      <option value={ADD_NEW_VALUE}>+ Add New Referring Doctor</option>
      <option value="">-- Select Referring Doctor --</option>
      {referringDoctors.map((d) => (
        <option key={d.id} value={d.name}>
          {d.name}{d.hospital_name ? ` (${d.hospital_name})` : ''}
        </option>
      ))}
    </select>
  )
}