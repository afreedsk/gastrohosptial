import { useEffect, useState } from 'react'
import { BedDouble } from 'lucide-react'
import api from '../../api/axios'
import { Section } from '../PageHeader'
import PatientSearchPicker from './PatientSearchPicker'
import DoctorSelect from './DoctorSelect'

const REFERRAL_TYPES = ['Walkin', 'Online', 'Doctor', 'Hospital User', 'Other', 'Camp', 'Ads', 'Friend/Family', 'Marketing']
const PAYMENT_MODES = ['Cash', 'UPI', 'Card', 'Cheque', 'NEFT', 'Credit']
const FLOORS = ['1st Floor', '2nd Floor', '3rd Floor']
const ROOM_TYPES = ['General', 'Semi-Private', 'Private', 'ICU', 'Deluxe']
const BOOKING_TYPES = ['Walk-in', 'Online', 'Phone']

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
  title: 'Mr', first_name: '', last_name: '', gender: 'Male', age: '', dob: '',
  marital_status: 'Single', blood_group: '', aadhar_number: '', mobile: '', alt_phone: '',
  occupation: '', email: '', state: '', city: '', locality: '', street_address: '', pincode: '',
  guardian_name: '', guardian_relation: '', guardian_mobile: '', mother_name: '',
  doctor_id: '', symptoms: '', floor: '1st Floor', room_type: 'General', room_no: '', bed_no: '',
  referral_type: 'Walkin', payment_mode: 'Cash', advance_amount: 0, booking_type: 'Walk-in',
  abha_number: '', admitted_date: new Date().toISOString().slice(0, 10),
}

export default function IPRegistrationForm({ onCreated }) {
  const [form, setForm] = useState(empty)
  const [doctors, setDoctors] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(null)

  useEffect(() => { api.get('/doctors').then((r) => setDoctors(r.data)).catch(() => {}) }, [])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const onDobChange = (value) => {
    setForm((f) => ({ ...f, dob: value, age: calcAge(value) }))
  }

  const onDoctorChange = (id) => set('doctor_id', id)

  const onDoctorAdded = (doc) => setDoctors((prev) => [...prev, doc])

  const applyExistingPatient = (patient) => {
    setForm((f) => ({
      ...f,
      ...patient,
      age: patient.dob ? calcAge(patient.dob) : (patient.age ?? ''),
    }))
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.first_name || !form.mobile) return setError('First name and mobile are required')
    setSaving(true)
    try {
      const { data } = await api.post('/ip-registrations', form)
      setSaved(data)
      setForm(empty)
      onCreated?.()
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save admission')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {error && <div className="text-sm text-danger-500 bg-danger-400/10 border border-danger-400/30 rounded-sm px-3 py-2">{error}</div>}
      {saved && (
        <div className="text-sm text-teal-700 bg-teal-50 border border-teal-100 rounded-sm px-3 py-2">
          Admitted <b>{saved.first_name} {saved.last_name}</b> — MR <b>{saved.mr_number}</b>, IP Reg <b>{saved.ip_reg_no}</b>
        </div>
      )}

      <Section title="Inpatient Registration Form">
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
          <div><label className="label">DOB</label><input type="date" className="input" value={form.dob} onChange={(e) => onDobChange(e.target.value)} /></div>
          <div>
            <label className="label">Age</label>
            <input
              type="number"
              min="0"
              className="input"
              value={form.age}
              onChange={(e) => set('age', e.target.value)}
              placeholder="Auto from DOB"
            />
          </div>
          <div>
            <label className="label">Marital Status</label>
            <select className="input" value={form.marital_status} onChange={(e) => set('marital_status', e.target.value)}>
              <option>Single</option><option>Married</option><option>Widowed</option><option>Divorced</option>
            </select>
          </div>
          <div>
            <label className="label">Blood Group</label>
            <select className="input" value={form.blood_group} onChange={(e) => set('blood_group', e.target.value)}>
              <option value="">--</option>
              {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((b) => <option key={b}>{b}</option>)}
            </select>
          </div>
          <div><label className="label">Aadhar Number</label><input className="input" value={form.aadhar_number} onChange={(e) => set('aadhar_number', e.target.value)} /></div>
          <div><label className="label">Mobile *</label><input className="input" required value={form.mobile} onChange={(e) => set('mobile', e.target.value)} /></div>
          <div><label className="label">Alternate Mobile</label><input className="input" value={form.alt_phone} onChange={(e) => set('alt_phone', e.target.value)} /></div>
          <div><label className="label">Occupation</label><input className="input" value={form.occupation} onChange={(e) => set('occupation', e.target.value)} /></div>
          <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={(e) => set('email', e.target.value)} /></div>
          <div><label className="label">ABHA Number</label><input className="input" value={form.abha_number} onChange={(e) => set('abha_number', e.target.value)} /></div>
        </div>
      </Section>

      <Section title="Address">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <input className="input" placeholder="State" value={form.state} onChange={(e) => set('state', e.target.value)} />
          <input className="input" placeholder="City" value={form.city} onChange={(e) => set('city', e.target.value)} />
          <input className="input" placeholder="Locality" value={form.locality} onChange={(e) => set('locality', e.target.value)} />
          <input className="input" placeholder="Street Address" value={form.street_address} onChange={(e) => set('street_address', e.target.value)} />
          <input className="input" placeholder="Pincode" value={form.pincode} onChange={(e) => set('pincode', e.target.value)} />
        </div>
      </Section>

      <Section title="Guardian Details">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <input className="input" placeholder="Parent / Guardian Name" value={form.guardian_name} onChange={(e) => set('guardian_name', e.target.value)} />
          <input className="input" placeholder="Guardian Relationship" value={form.guardian_relation} onChange={(e) => set('guardian_relation', e.target.value)} />
          <input className="input" placeholder="Guardian Mobile" value={form.guardian_mobile} onChange={(e) => set('guardian_mobile', e.target.value)} />
          <input className="input" placeholder="Mother Name" value={form.mother_name} onChange={(e) => set('mother_name', e.target.value)} />
        </div>
      </Section>

      <Section title="Clinical & Room Details">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Consultant Doctor</label>
            <DoctorSelect
              doctors={doctors}
              value={form.doctor_id}
              onChange={onDoctorChange}
              onDoctorAdded={onDoctorAdded}
            />
          </div>
          <div className="md:col-span-2"><label className="label">Symptoms</label><input className="input" value={form.symptoms} onChange={(e) => set('symptoms', e.target.value)} /></div>
          <div>
            <label className="label">Floor</label>
            <select className="input" value={form.floor} onChange={(e) => set('floor', e.target.value)}>
              {FLOORS.map((f) => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Room Type</label>
            <select className="input" value={form.room_type} onChange={(e) => set('room_type', e.target.value)}>
              {ROOM_TYPES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div><label className="label">Room No</label><input className="input" value={form.room_no} onChange={(e) => set('room_no', e.target.value)} /></div>
          <div><label className="label">Bed</label><input className="input" value={form.bed_no} onChange={(e) => set('bed_no', e.target.value)} /></div>
          <div><label className="label">Admitted Date</label><input type="date" className="input" value={form.admitted_date} onChange={(e) => set('admitted_date', e.target.value)} /></div>
        </div>
      </Section>

      <Section title="Referral & Payment">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Referral Type</label>
            <select className="input" value={form.referral_type} onChange={(e) => set('referral_type', e.target.value)}>
              {REFERRAL_TYPES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Payment Mode</label>
            <select className="input" value={form.payment_mode} onChange={(e) => set('payment_mode', e.target.value)}>
              {PAYMENT_MODES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div><label className="label">Advance Amount</label><input type="number" className="input" value={form.advance_amount} onChange={(e) => set('advance_amount', e.target.value)} /></div>
          <div>
            <label className="label">Booking Type</label>
            <select className="input" value={form.booking_type} onChange={(e) => set('booking_type', e.target.value)}>
              {BOOKING_TYPES.map((b) => <option key={b}>{b}</option>)}
            </select>
          </div>
        </div>
      </Section>

      <div className="flex gap-3">
        <button className="btn-primary flex items-center gap-2" disabled={saving}>
          <BedDouble size={15} /> {saving ? 'Saving…' : 'Admit Patient'}
        </button>
        <button type="button" className="btn-secondary" onClick={() => setForm(empty)}>Cancel</button>
      </div>
    </form>
  )
}