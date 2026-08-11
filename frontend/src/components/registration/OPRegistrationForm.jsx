import { useEffect, useState } from 'react'
import { UserPlus } from 'lucide-react'
import api from '../../api/axios'
import { Section } from '../PageHeader'
import PatientSearchPicker from './PatientSearchPicker'

const REFERRAL_TYPES = ['Walkin', 'Online', 'Doctor', 'Hospital User', 'Other', 'Camp', 'Ads', 'Friend/Family', 'Marketing']
const PAYMENT_MODES = ['Cash', 'UPI', 'Card', 'Cheque', 'NEFT', 'Credit']

const empty = {
  title: 'Mr', first_name: '', last_name: '', gender: 'Male', dob: '',
  email: '', mobile: '', alt_phone: '', aadhar_number: '',
  visit_type: 'General', guardian_relation: '', guardian_name: '', guardian_mobile: '',
  street_address: '', doctor_id: '', consultation_fee: 0,
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

  const onDoctorChange = (id) => {
    const doc = doctors.find((d) => String(d.id) === String(id))
    set('doctor_id', id)
    if (doc) set('consultation_fee', doc.consultation_fee)
  }

  const applyExistingPatient = (patient) => {
    setForm((f) => ({ ...f, ...patient }))
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.first_name || !form.mobile) return setError('First name and mobile are required')
    setSaving(true)
    try {
      const { data } = await api.post('/op-registrations', form)
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
          <div><label className="label">DOB</label><input type="date" className="input" value={form.dob} onChange={(e) => set('dob', e.target.value)} /></div>
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

      <Section title="Guardian Details">
        <div className="grid grid-cols-3 gap-4">
          <input className="input" placeholder="Guardian Relationship" value={form.guardian_relation} onChange={(e) => set('guardian_relation', e.target.value)} />
          <input className="input" placeholder="Parent / Guardian Name" value={form.guardian_name} onChange={(e) => set('guardian_name', e.target.value)} />
          <input className="input" placeholder="Guardian Mobile" value={form.guardian_mobile} onChange={(e) => set('guardian_mobile', e.target.value)} />
        </div>
        <input className="input mt-4" placeholder="Street Address" value={form.street_address} onChange={(e) => set('street_address', e.target.value)} />
      </Section>

      <Section title="Consultation">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Consultant Doctor</label>
            <select className="input" value={form.doctor_id} onChange={(e) => onDoctorChange(e.target.value)}>
              <option value="">-- Select Doctor --</option>
              {doctors.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.department})</option>)}
            </select>
          </div>
          <div><label className="label">Consultation Fee</label><input type="number" className="input" value={form.consultation_fee} onChange={(e) => set('consultation_fee', e.target.value)} /></div>
          <div>
            <label className="label">Referral Type</label>
            <select className="input" value={form.referral_type} onChange={(e) => set('referral_type', e.target.value)}>
              {REFERRAL_TYPES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
        </div>

        {/* Appointment date/time, payment mode, registration fee and MLC are now
            visible for every referral type. Only "Referring Doctor Name" stays
            conditional on referral_type === 'Doctor'. */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          {form.referral_type === 'Doctor' && (
            <div>
              <label className="label">Referring Doctor Name</label>
              <input className="input" value={form.referral_doctor_name} onChange={(e) => set('referral_doctor_name', e.target.value)} />
            </div>
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