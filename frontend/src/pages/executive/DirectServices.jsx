import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, UserPlus } from 'lucide-react'
import api from '../../api/axios'
import { PageHeader, Section } from '../../components/PageHeader'

const today = () => new Date().toISOString().slice(0, 10)

export default function DirectServices() {
  const navigate = useNavigate()
  const [startDate, setStartDate] = useState(today())
  const [endDate, setEndDate] = useState(today())
  const [rows, setRows] = useState(null)
  const [loading, setLoading] = useState(false)

  const getData = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/direct-services', { params: { start_date: startDate, end_date: endDate } })
      setRows(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PageHeader title="Direct Services" subtitle="Walk-in patients billed without a prior appointment" />

      <Section title="Filters">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">Start Date</label>
            <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="label">End Date</label>
            <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <button className="btn-primary flex items-center gap-2" onClick={getData} disabled={loading}>
            <Search size={15} /> {loading ? 'Loading…' : 'Get'}
          </button>
          <button
            type="button"
            className="btn-secondary flex items-center gap-2 ml-auto"
            onClick={() => navigate('/executive/patient-registration')}
          >
            <UserPlus size={15} /> Add Patient
          </button>
        </div>
      </Section>

      {rows && (
        <Section title="Direct Service Patients">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Patient</th><th>Reg No</th><th>Full Name</th><th>Gender</th><th>Age</th>
                  <th>Phone</th><th>Doctor</th><th>Date</th><th>Amount</th><th>Bill Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.mr_number}</td>
                    <td>{r.reg_no}</td>
                    <td>{r.full_name}</td>
                    <td>{r.gender}</td>
                    <td>{r.age ?? '—'}</td>
                    <td>{r.phone}</td>
                    <td>{r.doctor_name || '—'}</td>
                    <td>{new Date(r.date).toLocaleDateString()}</td>
                    <td>₹{Number(r.amount).toFixed(2)}</td>
                    <td>{r.bill_status}</td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={10} className="text-center text-ink/40 py-8">No direct service patients in this range</td></tr>}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  )
}