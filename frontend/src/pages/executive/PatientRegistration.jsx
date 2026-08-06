import { useEffect, useState } from 'react'
import { Search, Printer, UserPlus } from 'lucide-react'
import api from '../../api/axios'
import { PageHeader, Section } from '../../components/PageHeader'

const empty = {
  name: '', gender: 'Male', dob: '', blood_group: '', weight: '', height: '',
  email: '', phone: '', alt_phone: '', aadhar_number: '', occupation: '', marital_status: 'Single',
  door_no: '', street: '', city: '', district: '', state: '', pincode: '',
  guardian_name: '', guardian_relation: '', guardian_phone: '',
  allergies: '', diabetes: false, hypertension: false, existing_diseases: '', notes: '',
}

export default function PatientRegistration() {
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [savedPatient, setSavedPatient] = useState(null)
  const [error, setError] = useState('')
  const [patients, setPatients] = useState([])
  const [search, setSearch] = useState('')

  const loadPatients = (q = '') => {
    api.get('/patients', { params: { search: q } }).then((r) => setPatients(r.data))
  }

  useEffect(() => { loadPatients() }, [])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const { data } = await api.post('/patients', form)
      setSavedPatient(data)
      setForm(empty)
      loadPatients()
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save patient')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader title="Patient Registration" subtitle="Register a new patient or search existing records" />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <form onSubmit={handleSubmit} className="xl:col-span-2 space-y-5">
          {error && (
            <div className="text-sm text-danger-500 bg-danger-400/10 border border-danger-400/30 rounded-sm px-3 py-2">
              {error}
            </div>
          )}

          {savedPatient && (
            <div className="text-sm text-teal-700 bg-teal-50 border border-teal-100 rounded-sm px-3 py-2 flex items-center justify-between">
              <span>
                Registered <b>{savedPatient.name}</b> — Patient ID <b>{savedPatient.patient_uid}</b>,
                Reg No <b>{savedPatient.reg_no}</b>
              </span>
              <button type="button" className="btn-secondary py-1 px-2 flex items-center gap-1">
                <Printer size={14} /> Print Card
              </button>
            </div>
          )}

          <Section title="Basic Details">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="label">Patient Name *</label>
                <input className="input" required value={form.name} onChange={(e) => set('name', e.target.value)} />
              </div>
              <div>
                <label className="label">Gender *</label>
                <select className="input" value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </div>
              <div>
                <label className="label">Date of Birth</label>
                <input type="date" className="input" value={form.dob} onChange={(e) => set('dob', e.target.value)} />
              </div>
              <div>
                <label className="label">Blood Group</label>
                <select className="input" value={form.blood_group} onChange={(e) => set('blood_group', e.target.value)}>
                  <option value="">--</option>
                  {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((b) => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Weight (kg)</label>
                <input type="number" step="0.1" className="input" value={form.weight} onChange={(e) => set('weight', e.target.value)} />
              </div>
              <div>
                <label className="label">Height (cm)</label>
                <input type="number" step="0.1" className="input" value={form.height} onChange={(e) => set('height', e.target.value)} />
              </div>
              <div>
                <label className="label">Phone *</label>
                <input className="input" required value={form.phone} onChange={(e) => set('phone', e.target.value)} />
              </div>
              <div>
                <label className="label">Alternate Phone</label>
                <input className="input" value={form.alt_phone} onChange={(e) => set('alt_phone', e.target.value)} />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" value={form.email} onChange={(e) => set('email', e.target.value)} />
              </div>
              <div>
                <label className="label">Aadhar Number</label>
                <input className="input" value={form.aadhar_number} onChange={(e) => set('aadhar_number', e.target.value)} />
              </div>
              <div>
                <label className="label">Occupation</label>
                <input className="input" value={form.occupation} onChange={(e) => set('occupation', e.target.value)} />
              </div>
              <div>
                <label className="label">Marital Status</label>
                <select className="input" value={form.marital_status} onChange={(e) => set('marital_status', e.target.value)}>
                  <option>Single</option><option>Married</option><option>Widowed</option><option>Divorced</option>
                </select>
              </div>
            </div>
          </Section>

          <Section title="Address">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <input className="input" placeholder="Door No" value={form.door_no} onChange={(e) => set('door_no', e.target.value)} />
              <input className="input" placeholder="Street" value={form.street} onChange={(e) => set('street', e.target.value)} />
              <input className="input" placeholder="City" value={form.city} onChange={(e) => set('city', e.target.value)} />
              <input className="input" placeholder="District" value={form.district} onChange={(e) => set('district', e.target.value)} />
              <input className="input" placeholder="State" value={form.state} onChange={(e) => set('state', e.target.value)} />
              <input className="input" placeholder="Pincode" value={form.pincode} onChange={(e) => set('pincode', e.target.value)} />
            </div>
          </Section>

          <Section title="Emergency Contact">
            <div className="grid grid-cols-3 gap-4">
              <input className="input" placeholder="Guardian Name" value={form.guardian_name} onChange={(e) => set('guardian_name', e.target.value)} />
              <input className="input" placeholder="Relation" value={form.guardian_relation} onChange={(e) => set('guardian_relation', e.target.value)} />
              <input className="input" placeholder="Phone" value={form.guardian_phone} onChange={(e) => set('guardian_phone', e.target.value)} />
            </div>
          </Section>

          <Section title="Medical">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.diabetes} onChange={(e) => set('diabetes', e.target.checked)} />
                Diabetes
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.hypertension} onChange={(e) => set('hypertension', e.target.checked)} />
                Hypertension
              </label>
            </div>
            <textarea className="input mb-3" rows={2} placeholder="Allergies" value={form.allergies} onChange={(e) => set('allergies', e.target.value)} />
            <textarea className="input mb-3" rows={2} placeholder="Existing Diseases" value={form.existing_diseases} onChange={(e) => set('existing_diseases', e.target.value)} />
            <textarea className="input" rows={2} placeholder="Notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </Section>

          <div className="flex gap-3">
            <button className="btn-primary flex items-center gap-2" disabled={saving}>
              <UserPlus size={15} /> {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setForm(empty)}>Cancel</button>
          </div>
        </form>

        <div>
          <Section title="Recent Patients">
            <div className="flex items-center gap-2 mb-3">
              <Search size={14} className="text-ink/40" />
              <input
                className="input"
                placeholder="Search name / phone / ID"
                value={search}
                onChange={(e) => { setSearch(e.target.value); loadPatients(e.target.value) }}
              />
            </div>
            <div className="space-y-2 max-h-[640px] overflow-y-auto">
              {patients.map((p) => (
                <div key={p.id} className="border border-border rounded-sm p-3">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-medium">{p.name}</p>
                    <span className="text-xs text-ink/40">{p.patient_uid}</span>
                  </div>
                  <p className="text-xs text-ink/50 mt-0.5">{p.phone} · {p.gender} · Age {p.age ?? '—'}</p>
                </div>
              ))}
              {!patients.length && <p className="text-sm text-ink/40 text-center py-8">No patients found</p>}
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}
