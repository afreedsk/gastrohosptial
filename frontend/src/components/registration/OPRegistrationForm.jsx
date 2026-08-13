import { useEffect, useState } from 'react'
import { UserPlus } from 'lucide-react'
import api from '../../api/axios'
import { Section } from '../PageHeader'
import PatientSearchPicker from './PatientSearchPicker'
import DoctorSelect from './DoctorSelect'
import ReferringDoctorSelect from './ReferringDoctorSelect'

const REFERRAL_TYPES = ['Walkin', 'Online', 'Doctor', 'Hospital User', 'Other', 'Camp', 'Ads', 'Friend/Family', 'Marketing']
const PAYMENT_MODES = ['Cash', 'UPI', 'Card', 'Cheque', 'NEFT', 'Credit']

function calcAge(dobStr) {
  if (!dobStr) return ''
  const dob = new Date(dobStr)
  if (isNaN(dob)) return ''
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const hasHadBirthdayThisYear =
    today.getMonth() > dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate())
  if (!hasHadBirthdayThisYear) age -= 1
  return age >= 0 ? age : ''
}

const empty = {
  title: 'Mr', first_name: '', last_name: '', gender: 'Male', dob: '', age: '',
  email: '', mobile: '', alt_phone: '', aadhar_number: '',
  visit_type: 'General', guardian_relation: '', guardian_name: '', guardian_mobile: '',
  street_address: '', village: '', mandal: '', district: '', state: '', pincode: '',
  doctor_id: '', consultation_fee: 0,
  referral_type: 'Walkin', referral_doctor_name: '', appointment_date: '', appointment_time: '',
  payment_mode: 'Cash', registration_fee: 0, abha_number: '', occupation: '',
  blood_group: '', mlc: false, booking_type: 'Walk-in',
}

export default function OPRegistrationForm({ onCreated }) {
  const [form, setForm] = useState(empty)
  const [doctors, setDoctors] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(null)

  useEffect(() => { api.get('/doctors').then((r) => setDoctors(r.data)).catch(() => {}) }, [])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  // DOB -> Age: whenever the actual date picker changes, recompute age
  // precisely (accounts for whether this year's birthday has passed yet).
  const onDobChange = (value) => {
    setForm((f) => ({ ...f, dob: value, age: calcAge(value) }))
  }

  // Age -> DOB: if the clerk types an age first (before knowing the exact
  // DOB), default the date of birth to 1 Jan of the matching birth year
  // (today's year minus the typed age). The DOB field stays fully editable
  // afterwards — editing it manually goes through onDobChange above, which
  // then recalculates the precise age from the real date.
  const onAgeChange = (value) => {
    setForm((f) => {
      const next = { ...f, age: value }
      const ageNum = parseInt(value, 10)
      if (value !== '' && !isNaN(ageNum) && ageNum >= 0) {
        const birthYear = new Date().getFullYear() - ageNum
        next.dob = `${birthYear}-01-01`
      }
      return next
    })
  }

  // Handles both "picked an existing doctor" and "just created + auto-selected
  // a new doctor" — in both cases doctors already contains the matching row
  // by the time this runs (existing list, or appended via onDoctorAdded below).
  const onDoctorChange = (id) => {
    const doc = doctors.find((d) => String(d.id) === String(id))
    set('doctor_id', id)
    if (doc) set('consultation_fee', doc.consultation_fee)
  }

  const onDoctorAdded = (doc) => {
    setDoctors((prev) => [...prev, doc])
    set('consultation_fee', doc.consultation_fee ?? 0)
  }

  const applyExistingPatient = (patient) => {
    setForm((f) => ({ ...f, ...patient, age: patient.dob ? calcAge(patient.dob) : (patient.age ?? '') }))
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.first_name || !form.mobile) return setError('First name and mobile are required')
    if (!form.village.trim() || !form.district.trim()) return setError('Village and District are required')
    setSaving(true)
    try {
      // age is derived from dob for display only — op_registrations has no
      // age column, so it isn't sent to the backend (matches existing schema)
      const { age, ...payload } = form
      const { data } = await api.post('/op-registrations', payload)
      setSaved(data)
      setForm(empty)
      onCreated?.()
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save registration')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {error && <div className="text-sm text-danger-500 bg-danger-400/10 border border-danger-400/30 rounded-sm px-3 py-2">{error}</div>}
      {saved && (
        <div className="text-sm text-teal-700 bg-teal-50 border border-teal-100 rounded-sm px-3 py-2">
          Registered <b>{saved.first_name} {saved.last_name}</b> — MR <b>{saved.mr_number}</b>, OPD <b>{saved.opd_reg_no}</b>, Token <b>{saved.token_no}</b>
        </div>
      )}

      <Section title="Outpatient Registration Form">
        <PatientSearchPicker onSelect={applyExistingPatient} />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="label">Title</label>
            <select className="input" value={form.title} onChange={(e) => set('title', e.target.value)}>
              {['Mr', 'Mrs', 'Ms', 'Master', 'Baby', 'Dr'].map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div><label className="label">First Name *</label><input className="input" required value={form.first_name} onChange={(e) => set('first_name', e.target.value)} /></div>
          <div><label className="label">Last Name</label><input className="input" value={form.last_name} onChange={(e) => set('last_name', e.target.value)} /></div>
          <div>
            <label className="label">Gender *</label>
            <select className="input" value={form.gender} onChange={(e) => set('gender', e.target.value)}>
              <option>Male</option><option>Female</option><option>Other</option>
            </select>
          </div>
          <div>
            <label className="label">DOB</label>
            <input type="date" className="input" value={form.dob} onChange={(e) => onDobChange(e.target.value)} />
          </div>
          <div>
            <label className="label">Age</label>
            <input
              type="number"
              min="0"
              className="input"
              value={form.age}
              onChange={(e) => onAgeChange(e.target.value)}
              placeholder="Enter age or pick DOB"
            />
          </div>
          <div><label className="label">Mobile *</label><input className="input" required value={form.mobile} onChange={(e) => set('mobile', e.target.value)} /></div>
          <div><label className="label">Alternate Phone</label><input className="input" value={form.alt_phone} onChange={(e) => set('alt_phone', e.target.value)} /></div>
          <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={(e) => set('email', e.target.value)} /></div>
          <div><label className="label">Aadhar Number</label><input className="input" value={form.aadhar_number} onChange={(e) => set('aadhar_number', e.target.value)} /></div>
          <div>
            <label className="label">Visit Type</label>
            <select className="input" value={form.visit_type} onChange={(e) => set('visit_type', e.target.value)}>
              <option>General</option><option>Emergency</option>
            </select>
          </div>
          <div><label className="label">Occupation</label><input className="input" value={form.occupation} onChange={(e) => set('occupation', e.target.value)} /></div>
          <div>
            <label className="label">Blood Group</label>
            <select className="input" value={form.blood_group} onChange={(e) => set('blood_group', e.target.value)}>
              <option value="">--</option>
              {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((b) => <option key={b}>{b}</option>)}
            </select>
          </div>
          <div><label className="label">ABHA Number</label><input className="input" value={form.abha_number} onChange={(e) => set('abha_number', e.target.value)} /></div>
        </div>
      </Section>

      <Section title="Address">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Village *</label>
            <input className="input" required value={form.village} onChange={(e) => set('village', e.target.value)} />
          </div>
          <div><label className="label">Mandal</label><input className="input" value={form.mandal} onChange={(e) => set('mandal', e.target.value)} /></div>
          <div>
            <label className="label">District *</label>
            <input className="input" required value={form.district} onChange={(e) => set('district', e.target.value)} />
          </div>
          <div><label className="label">State</label><input className="input" value={form.state} onChange={(e) => set('state', e.target.value)} /></div>
          <div><label className="label">Pincode</label><input className="input" value={form.pincode} onChange={(e) => set('pincode', e.target.value)} /></div>
          <div><label className="label">Street Address</label><input className="input" value={form.street_address} onChange={(e) => set('street_address', e.target.value)} /></div>
        </div>
      </Section>

      <Section title="Guardian Details">
        <div className="grid grid-cols-3 gap-4">
          <input className="input" placeholder="Guardian Relationship" value={form.guardian_relation} onChange={(e) => set('guardian_relation', e.target.value)} />
          <input className="input" placeholder="Parent / Guardian Name" value={form.guardian_name} onChange={(e) => set('guardian_name', e.target.value)} />
          <input className="input" placeholder="Guardian Mobile" value={form.guardian_mobile} onChange={(e) => set('guardian_mobile', e.target.value)} />
        </div>
      </Section>

      <Section title="Consultation">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <DoctorSelect
            label="Consultant Doctor"
            doctors={doctors}
            value={form.doctor_id}
            onChange={onDoctorChange}
            onDoctorAdded={onDoctorAdded}
          />
          <div><label className="label">Consultation Fee</label><input type="number" className="input" value={form.consultation_fee} onChange={(e) => set('consultation_fee', e.target.value)} /></div>
          <div>
            <label className="label">Referral Type</label>
            <select className="input" value={form.referral_type} onChange={(e) => set('referral_type', e.target.value)}>
              {REFERRAL_TYPES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          {form.referral_type === 'Doctor' && (
            <ReferringDoctorSelect
              label="Referring Doctor Name"
              value={form.referral_doctor_name}
              onChange={(name) => set('referral_doctor_name', name)}
            />
          )}
          <div><label className="label">Appointment Date</label><input type="date" className="input" value={form.appointment_date} onChange={(e) => set('appointment_date', e.target.value)} /></div>
          <div><label className="label">Appointment Time</label><input type="time" className="input" value={form.appointment_time} onChange={(e) => set('appointment_time', e.target.value)} /></div>
          <div>
            <label className="label">Payment Mode</label>
            <select className="input" value={form.payment_mode} onChange={(e) => set('payment_mode', e.target.value)}>
              {PAYMENT_MODES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div><label className="label">Registration Fee</label><input type="number" className="input" value={form.registration_fee} onChange={(e) => set('registration_fee', e.target.value)} /></div>
          <label className="flex items-center gap-2 text-sm mt-6">
            <input type="checkbox" checked={form.mlc} onChange={(e) => set('mlc', e.target.checked)} />
            MLC Patient (tick, if medico legal case)
          </label>
        </div>
      </Section>

      <div className="flex gap-3">
        <button className="btn-primary flex items-center gap-2" disabled={saving}>
          <UserPlus size={15} /> {saving ? 'Saving…' : 'Register Outpatient'}
        </button>
        <button type="button" className="btn-secondary" onClick={() => setForm(empty)}>Cancel</button>
      </div>
    </form>
  )
}