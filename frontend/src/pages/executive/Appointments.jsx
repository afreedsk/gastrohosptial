import { useEffect, useState } from 'react'
import { CalendarPlus, Printer, X, RotateCcw } from 'lucide-react'
import api from '../../api/axios'
import { PageHeader, Section, StatusBadge } from '../../components/PageHeader'

const SLOTS = ['09:00-10:00', '10:00-11:00', '11:00-12:00', '14:00-15:00', '15:00-16:00', '16:00-17:00']

export default function Appointments() {
  const [departments, setDepartments] = useState([])
  const [doctors, setDoctors] = useState([])
  const [patients, setPatients] = useState([])
  const [list, setList] = useState([])
  const [form, setForm] = useState({
    patient_id: '', department_id: '', doctor_id: '', appointment_date: new Date().toISOString().slice(0, 10),
    time_slot: SLOTS[0], visit_type: 'New',
  })
  const [patientSearch, setPatientSearch] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const loadAppointments = () => api.get('/appointments').then((r) => setList(r.data))

  useEffect(() => {
    api.get('/appointments/departments').then((r) => setDepartments(r.data))
    api.get('/appointments/doctors').then((r) => setDoctors(r.data))
    loadAppointments()
  }, [])

  useEffect(() => {
    if (patientSearch.length > 1) {
      api.get('/patients', { params: { search: patientSearch } }).then((r) => setPatients(r.data))
    } else {
      setPatients([])
    }
  }, [patientSearch])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const filteredDoctors = form.department_id
    ? doctors.filter((d) => String(d.department_id) === String(form.department_id))
    : doctors

  const handleBook = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.patient_id) return setError('Select a patient first')
    setSaving(true)
    try {
      await api.post('/appointments', form)
      loadAppointments()
      setForm((f) => ({ ...f, patient_id: '' }))
      setPatientSearch('')
    } catch (err) {
      setError(err.response?.data?.error || 'Could not book appointment')
    } finally {
      setSaving(false)
    }
  }

  const changeStatus = async (id, status) => {
    await api.patch(`/appointments/${id}/status`, { status })
    loadAppointments()
  }

  return (
    <div>
      <PageHeader title="Appointment" subtitle="Book, reschedule, and manage patient appointments" />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <form onSubmit={handleBook} className="xl:col-span-1">
          <Section title="Book Appointment">
            {error && <p className="text-sm text-danger-500 mb-3">{error}</p>}

            <label className="label">Patient</label>
            <input
              className="input mb-1"
              placeholder="Search by name or phone…"
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
            />
            {patients.length > 0 && (
              <div className="border border-border rounded-sm mb-3 max-h-40 overflow-y-auto">
                {patients.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => { set('patient_id', p.id); setPatientSearch(`${p.name} (${p.patient_uid})`); setPatients([]) }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-teal-50 border-b border-border last:border-0"
                  >
                    {p.name} · {p.phone} · {p.patient_uid}
                  </button>
                ))}
              </div>
            )}
            {!patients.length && <div className="mb-3" />}

            <label className="label">Department</label>
            <select className="input mb-3" value={form.department_id} onChange={(e) => set('department_id', e.target.value)}>
              <option value="">Select department</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>

            <label className="label">Doctor</label>
            <select className="input mb-3" required value={form.doctor_id} onChange={(e) => set('doctor_id', e.target.value)}>
              <option value="">Select doctor</option>
              {filteredDoctors.map((d) => <option key={d.id} value={d.id}>{d.name} (₹{d.consultation_fee})</option>)}
            </select>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="label">Date</label>
                <input type="date" className="input" required value={form.appointment_date} onChange={(e) => set('appointment_date', e.target.value)} />
              </div>
              <div>
                <label className="label">Time Slot</label>
                <select className="input" value={form.time_slot} onChange={(e) => set('time_slot', e.target.value)}>
                  {SLOTS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <label className="label">Visit Type</label>
            <div className="flex gap-2 mb-4">
              {['New', 'Follow-up', 'Emergency'].map((v) => (
                <button
                  type="button"
                  key={v}
                  onClick={() => set('visit_type', v)}
                  className={`flex-1 text-xs py-2 rounded-sm border ${form.visit_type === v ? 'bg-teal-600 text-white border-teal-600' : 'border-border text-ink/60'}`}
                >
                  {v}
                </button>
              ))}
            </div>

            <button className="btn-primary w-full flex items-center justify-center gap-2" disabled={saving}>
              <CalendarPlus size={15} /> {saving ? 'Booking…' : 'Book Appointment'}
            </button>
          </Section>
        </form>

        <div className="xl:col-span-2">
          <Section title="Appointments">
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Token</th><th>Patient</th><th>Doctor</th><th>Date</th><th>Slot</th>
                    <th>Type</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((a) => (
                    <tr key={a.id}>
                      <td>#{a.token_no}</td>
                      <td>{a.patient_name}</td>
                      <td>{a.doctor_name}</td>
                      <td>{a.appointment_date}</td>
                      <td>{a.time_slot}</td>
                      <td>{a.visit_type}</td>
                      <td><StatusBadge status={a.status} /></td>
                      <td>
                        {a.status === 'Booked' && (
                          <div className="flex gap-1.5">
                            <button title="Complete" onClick={() => changeStatus(a.id, 'Completed')} className="text-teal-600 hover:text-teal-700">
                              <Printer size={15} />
                            </button>
                            <button title="Reschedule" onClick={() => changeStatus(a.id, 'Rescheduled')} className="text-amber-500 hover:text-amber-600">
                              <RotateCcw size={15} />
                            </button>
                            <button title="Cancel" onClick={() => changeStatus(a.id, 'Cancelled')} className="text-danger-500 hover:text-danger-400">
                              <X size={15} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!list.length && (
                    <tr><td colSpan={8} className="text-center text-ink/40 py-8">No appointments yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}
