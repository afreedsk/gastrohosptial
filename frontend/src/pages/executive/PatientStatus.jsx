import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import api from '../../api/axios'
import { PageHeader, Section } from '../../components/PageHeader'

export default function PatientStatus() {
  const [patients, setPatients] = useState([])
  const [search, setSearch] = useState('')

  const load = (q = '') => api.get('/patients', { params: { search: q, limit: 100 } }).then((r) => setPatients(r.data))
  useEffect(() => { load() }, [])

  const toggleStatus = async (p) => {
    await api.patch(`/patients/${p.id}/status`, { is_active: p.is_active ? 0 : 1 })
    load(search)
  }

  return (
    <div>
      <PageHeader title="Patient Status" subtitle="Active / inactive status for all registered patients" />

      <Section title="All Patients">
        <div className="flex items-center gap-2 mb-3 max-w-sm">
          <Search size={14} className="text-ink/40" />
          <input
            className="input"
            placeholder="Search name / phone / MR number"
            value={search}
            onChange={(e) => { setSearch(e.target.value); load(e.target.value) }}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>MR No</th><th>Patient Name</th><th>Gender/Age</th><th>Phone</th><th>DOB</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id}>
                  <td>{p.patient_uid}</td>
                  <td>{p.name}</td>
                  <td>{p.gender} / {p.age ?? '—'}</td>
                  <td>{p.phone}</td>
                  <td>{p.dob ? new Date(p.dob).toLocaleDateString() : '—'}</td>
                  <td>
                    <button
                      onClick={() => toggleStatus(p)}
                      className={`text-xs px-2 py-1 rounded-full border ${
                        p.is_active
                          ? 'bg-teal-50 text-teal-700 border-teal-200'
                          : 'bg-danger-400/10 text-danger-500 border-danger-400/30'
                      }`}
                    >
                      {p.is_active ? 'ON' : 'OFF'}
                    </button>
                  </td>
                </tr>
              ))}
              {!patients.length && <tr><td colSpan={6} className="text-center text-ink/40 py-8">No patients found</td></tr>}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}