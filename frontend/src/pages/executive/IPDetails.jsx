import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Pencil, CreditCard } from 'lucide-react'
import api from '../../api/axios'
import { PageHeader, Section } from '../../components/PageHeader'

export default function IPDetails() {
  const [data, setData] = useState(null)
  const [search, setSearch] = useState('')

  const load = (q = '') => api.get('/advance-payments/patients-detail', { params: { search: q } }).then((r) => setData(r.data))
  useEffect(() => { load() }, [])

  return (
    <div>
      <PageHeader title="Inpatient Dashboard" subtitle="Inpatient Details" />

      <Section title="">
        <div className="flex items-center justify-between mb-3">
          <button className="btn-secondary">Patient List</button>
          <div className="flex items-center gap-4">
            <p className="text-sm text-ink/60">No Of Patients: <b>{data?.count ?? 0}</b></p>
            <div className="flex items-center gap-2 max-w-xs">
              <Search size={14} className="text-ink/40" />
              <input className="input" placeholder="Name/RegNo/Mobile" value={search}
                onChange={(e) => { setSearch(e.target.value); load(e.target.value) }} />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>MR Number</th><th>Patient Reg No</th><th>Opd Reg No</th><th>Name</th><th>Phone</th>
                <th>Gender / Age</th><th>Consultant Doctor</th><th>Referral Type</th><th>Room Info</th>
                <th>Admitted Date</th><th>Advance Amount</th><th>Action</th><th>Paymode Change</th>
              </tr>
            </thead>
            <tbody>
              {(data?.results || []).map((r) => (
                <tr key={r.id}>
                  <td>{r.mr_number}</td>
                  <td>
                    <Link to={`/executive/ip-advance/${r.id}`} className="text-teal-600 hover:underline">
                      {r.patient_reg_no}
                    </Link>
                  </td>
                  <td>{r.opd_reg_no || '—'}</td>
                  <td>{r.name}</td>
                  <td>{r.phone}</td>
                  <td>{r.gender} / {r.age ?? '—'}</td>
                  <td>{r.doctor_name || '—'}</td>
                  <td>{r.referral_type}</td>
                  <td>{r.room_type} / {r.room_no || '—'} / {r.bed_no || '—'}</td>
                  <td>{new Date(r.admitted_date).toLocaleString()}</td>
                  <td>₹{Number(r.advance_amount).toFixed(2)}</td>
                  <td><Pencil size={14} className="text-teal-600 cursor-pointer" /></td>
                  <td><CreditCard size={14} className="text-teal-600 cursor-pointer" /></td>
                </tr>
              ))}
              {!data?.results.length && <tr><td colSpan={13} className="text-center text-ink/40 py-8">No admitted patients found</td></tr>}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}