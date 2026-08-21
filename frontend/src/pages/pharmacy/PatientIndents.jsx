import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import api from '../../api/axios'
import { PageHeader, Section } from '../../components/PageHeader'

export default function PatientIndents() {
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')

  const load = (q = '') => api.get('/patient-indents', { params: { search: q } }).then((r) => setRows(r.data))
  useEffect(() => { load() }, [])

  const markFulfilled = async (id) => {
    await api.patch(`/patient-indents/${id}/status`, { status: 'Fulfilled' })
    load(search)
  }

  return (
    <div>
      <PageHeader title="Patient Indents" />
      <Section title="">
        <div className="flex justify-end mb-3">
          <div className="flex items-center gap-2 max-w-xs">
            <Search size={14} className="text-ink/40" />
            <input className="input" placeholder="Search" value={search}
              onChange={(e) => { setSearch(e.target.value); load(e.target.value) }} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>MR Number</th><th>Patient Name</th><th>Patient Reg No</th>
                <th>Medicine Details</th><th>Medication Requested Date</th><th>Requested By</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.mr_number}</td>
                  <td>{r.patient_name}</td>
                  <td>{r.patient_reg_no}</td>
                  <td>{r.medicine_details}</td>
                  <td>{new Date(r.requested_date).toLocaleString()}</td>
                  <td>{r.requested_by_name || '—'}</td>
                  <td>
                    {r.status === 'Pending' ? (
                      <button className="text-teal-600 text-xs hover:underline" onClick={() => markFulfilled(r.id)}>
                        Mark Fulfilled
                      </button>
                    ) : (
                      <span className="text-xs text-ink/40">{r.status}</span>
                    )}
                  </td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={7} className="text-center text-ink/40 py-8">Details not available.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-ink/40 mt-2">Showing {rows.length} to {rows.length} of {rows.length} entries</p>
      </Section>
    </div>
  )
}