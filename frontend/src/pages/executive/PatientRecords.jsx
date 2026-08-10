import { useState } from 'react'
import { Search } from 'lucide-react'
import api from '../../api/axios'
import { PageHeader, Section } from '../../components/PageHeader'

export default function PatientRecords() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [type, setType] = useState('ALL')
  const [search, setSearch] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)

  const getData = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/patient-records', {
        params: { start_date: startDate, end_date: endDate, type, search },
      })
      setResults(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PageHeader title="Patient Records" subtitle="Search OP and IP records by date range or patient" />

      <Section title="Search Filters">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="label">Start Date</label>
            <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="label">End Date</label>
            <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="ALL">All</option><option value="OP">OP</option><option value="IP">IP</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">Search by Name / Mobile</label>
            <div className="flex items-center gap-2">
              <Search size={14} className="text-ink/40" />
              <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </div>
        <button className="btn-primary mt-4" onClick={getData} disabled={loading}>
          {loading ? 'Searching…' : 'Get Data'}
        </button>
      </Section>

      {results && (
        <Section title="Results">
          <p className="text-sm text-ink/60 mb-3">Number of patients found: <b>{results.count}</b></p>
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Type</th><th>Patient Name</th><th>Gender/Age</th><th>MR Number</th>
                  <th>Mobile</th><th>OP/IP Number</th><th>Date</th><th>Doctor Consultant</th>
                </tr>
              </thead>
              <tbody>
                {results.results.map((r, i) => (
                  <tr key={i}>
                    <td>{r.type}</td>
                    <td>{r.patient_name}</td>
                    <td>{r.gender} / {r.age ?? '—'}</td>
                    <td>{r.mr_number}</td>
                    <td>{r.mobile}</td>
                    <td>{r.op_number}</td>
                    <td>{new Date(r.date).toLocaleDateString()}</td>
                    <td>{r.doctor_name || '—'}</td>
                  </tr>
                ))}
                {!results.results.length && <tr><td colSpan={8} className="text-center text-ink/40 py-8">No records found</td></tr>}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  )
}