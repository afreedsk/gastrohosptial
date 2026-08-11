import { useEffect, useRef, useState } from 'react'
import { Search, Loader2 } from 'lucide-react'
import api from '../../api/axios'

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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const requestIdRef = useRef(0)

  // Debounced search — waits 300ms after the user stops typing, and only
  // applies the response if it's still the latest request (avoids a slow
  // early response overwriting a faster later one).
  useEffect(() => {
    if (!q.trim()) {
      setResults([])
      setOpen(false)
      setError('')
      return
    }

    const thisRequestId = ++requestIdRef.current
    setLoading(true)
    setError('')

    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get('/patients', { params: { search: q, limit: 20 } })
        if (requestIdRef.current !== thisRequestId) return // stale response, ignore
        setResults(data)
        setOpen(true)
      } catch (err) {
        if (requestIdRef.current !== thisRequestId) return
        console.error('Patient search failed:', err)
        setError(err.response?.data?.error || 'Search failed — check your connection')
        setResults([])
        setOpen(true)
      } finally {
        if (requestIdRef.current === thisRequestId) setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [q])

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
        {loading ? <Loader2 size={14} className="text-ink/40 animate-spin" /> : <Search size={14} className="text-ink/40" />}
        <input
          className="input"
          placeholder="Type name, mobile, email, or MR number (e.g. PT-000003)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => (results.length || error) && setOpen(true)}
        />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-border rounded-sm shadow-lg max-h-64 overflow-y-auto">
          {error && (
            <div className="px-3 py-2 text-xs text-danger-500">{error}</div>
          )}

          {!error && results.map((p) => (
            <button
              type="button"
              key={p.id}
              // onMouseDown fires before the input's onBlur, so the click
              // registers before React can close/unmount this dropdown.
              // Using onClick here is the classic reason a "select" click
              // appears to do nothing.
              onMouseDown={(e) => {
                e.preventDefault()
                pick(p)
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-teal-50 border-b border-border last:border-0"
            >
              <div className="flex justify-between">
                <span className="font-medium">{p.name}</span>
                <span className="text-ink/40 text-xs">{p.patient_uid}</span>
              </div>
              <p className="text-xs text-ink/50">{p.phone} · {p.gender} · Age {p.age ?? '—'}</p>
            </button>
          ))}

          {!error && !loading && !results.length && (
            <div className="px-3 py-2 text-xs text-ink/40">
              No matching patient found — continue filling the form below for a new registration.
            </div>
          )}
        </div>
      )}
    </div>
  )
}