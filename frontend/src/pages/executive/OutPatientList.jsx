import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, UserPlus } from 'lucide-react'
import api from '../../api/axios'
import { PageHeader, Section } from '../../components/PageHeader'

export default function OutPatientList() {
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')

  const load = (q = '') => api.get('/op-registrations', { params: { search: q } }).then((r) => setRows(r.data))
  useEffect(() => { load() }, [])

  return (
    <div>
      <PageHeader title="Out Patients" subtitle="All outpatient registrations">
        <Link to="/executive/patient-registration" className="btn-primary flex items-center gap-2">
          <UserPlus size={15} /> New Registration
        </Link>
      </PageHeader>

      <Section title="Registered Outpatients">
        <div className="flex items-center gap-2 mb-3 max-w-sm">
          <Search size={14} className="text-ink/40" />
          <input className="input" placeholder="Search name / phone / MR / OPD no" value={search}
            onChange={(e) => { setSearch(e.target.value); load(e.target.value) }} />
        </div>
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>MR Number</th><th>Patient Reg No</th><th>Token No</th><th>Name</th><th>Phone</th>
                <th>Gender/Age</th><th>Consultant Doctor</th><th>Referral Type</th><th>Appointment Time</th>
                <th>Consultation Fee</th><th>Booking Type</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.mr_number}</td>
                  <td>{r.patient_reg_no}</td>
                  <td>{r.token_no}</td>
                  <td>{r.name}</td>
                  <td>{r.mobile}</td>
                  <td>{r.gender} / {r.age ?? '—'}</td>
                  <td>{r.doctor_name || '—'}</td>
                  <td>{r.referral_type}</td>
                  <td>{r.appointment_time || '—'}</td>
                  <td>₹{Number(r.consultation_fee).toFixed(2)}</td>
                  <td>{r.booking_type}</td>
                  <td><button className="text-teal-600 text-xs hover:underline">View</button></td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={12} className="text-center text-ink/40 py-8">No outpatient records found</td></tr>}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}