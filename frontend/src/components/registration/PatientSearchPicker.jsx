import { useState } from 'react'
import { Search } from 'lucide-react'
import api from '../../api/axios'

// Splits a stored "Mr Shaik Afreed" style name into first/last, stripping
// a leading title if present so it doesn't get treated as a first name.
const TITLES = ['Mr', 'Mrs', 'Ms', 'Master', 'Baby', 'Dr']
function splitName(fullName) {
  const parts = (fullName || '').trim().split(/\s+/)
  let title = ''
  if (parts.length > 1 && TITLES.includes(parts[0])) {
    title = parts.shift()
  }
  const first_name = parts.shift() || ''
  const last_name = parts.join(' ')
  return { title, first_name, last_name }
}

export default function PatientSearchPicker({ onSelect }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)

  const search = async (value) => {
    setQ(value)
    if (!value.trim()) { setResults([]); setOpen(false); return }
    const { data } = await api.get('/patients', { params: { search: value } })
    setResults(data)
    setOpen(true)
  }

  const pick = (p) => {
    const { title, first_name, last_name } = splitName(p.name)
    onSelect({
      title, first_name, last_name,
      gender: p.gender, dob: p.dob ? p.dob.slice(0, 10) : '',
      age: p.age, email: p.email || '', mobile: p.phone, alt_phone: p.alt_phone || '',
      aadhar_number: p.aadhar_number || '', occupation: p.occupation || '',
      blood_group: p.blood_group || '', marital_status: p.marital_status || 'Single',
      street_address: p.street || '', city: p.city || '', state: p.state || '',
      pincode: p.pincode || '', guardian_name: p.guardian_name || '',
      guardian_relation: p.guardian_relation || '', guardian_mobile: p.guardian_phone || '',
    })
    setQ(`${p.name} — ${p.phone}`)
    setOpen(false)
  }

  return (
    <div className="relative mb-4">
      <label className="label">Existing Patient? Search by name, mobile, email or MR number</label>
      <div className="flex items-center gap-2">
        <Search size={14} className="text-ink/40" />
        <input
          className="input"
          placeholder="Type name, mobile, email, or MR number (e.g. PT-000003)"
          value={q}
          onChange={(e) => search(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-border rounded-sm shadow-md max-h-64 overflow-y-auto">
          {results.map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => pick(p)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-teal-50 border-b border-border last:border-0"
            >
              <div className="flex justify-between">
                <span className="font-medium">{p.name}</span>
                <span className="text-ink/40 text-xs">{p.patient_uid}</span>
              </div>
              <p className="text-xs text-ink/50">{p.phone} · {p.gender} · Age {p.age ?? '—'}</p>
            </button>
          ))}
        </div>
      )}
      {open && !results.length && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-border rounded-sm shadow-md px-3 py-2 text-xs text-ink/40">
          No matching patient found — continue filling the form below for a new registration.
        </div>
      )}
    </div>
  )
}