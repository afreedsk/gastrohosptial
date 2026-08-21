import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import api from '../../api/axios'
import { PageHeader, Section } from '../../components/PageHeader'

export default function AdvancePayment() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')

  const load = (q = '') => api.get('/advance-payments/patients', { params: { search: q } }).then((r) => setRows(r.data))
  useEffect(() => { load() }, [])

  return (
    <div>
      <PageHeader title="Advance Payment" subtitle="Admitted patients — click Patient Reg No to view or add advance payments" />

      <Section title="Admitted Patients">
        <div className="flex items-center gap-2 mb-3 max-w-sm">
          <Search size={14} className="text-ink/40" />
          <input className="input" placeholder="Search name / phone / MR / IP no" value={search}
            onChange={(e) => { setSearch(e.target.value); load(e.target.value) }} />
        </div>
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>MR Number</th><th>Patient Reg No.</th><th>Name</th><th>Contact</th>
                <th>Gender</th><th>Floor/Room Type/Room No./Bed No.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.mr_number}</td>
                  <td>
                    <button
                      className="text-teal-600 hover:underline"
                      onClick={() => navigate(`/executive/ip-advance/${r.id}`)}
                    >
                      {r.patient_reg_no}
                    </button>
                  </td>
                  <td>{r.name}</td>
                  <td>{r.contact}</td>
                  <td>{r.gender}</td>
                  <td>{r.floor || '—'}/{r.room_type}/{r.room_no || '—'}/{r.bed_no || '—'}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={6} className="text-center text-ink/40 py-8">No admitted patients found</td></tr>}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}