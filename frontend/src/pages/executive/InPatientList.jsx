import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Edit3, ArrowRightLeft, BedDouble } from 'lucide-react'
import api from '../../api/axios'
import { PageHeader, Section } from '../../components/PageHeader'

export default function InPatientList() {
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [transferFor, setTransferFor] = useState(null)
  const [roomNo, setRoomNo] = useState('')
  const [bedNo, setBedNo] = useState('')

  const load = (q = '') => api.get('/ip-registrations', { params: { search: q } }).then((r) => setRows(r.data))
  useEffect(() => { load() }, [])

  const submitTransfer = async () => {
    if (!roomNo) return
    // in InPatientList.jsx submitTransfer():
    await api.post(`/ip-registrations/${transferFor}/transfer/request`, { room_no: roomNo, bed_no: bedNo })
    setTransferFor(null); setRoomNo(''); setBedNo('')
    load(search)
  }

  return (
    <div>
      <PageHeader title="In Patients" subtitle="All inpatient admissions">
        <div className="flex gap-2">
          <button className="btn-secondary flex items-center gap-2">
            <Edit3 size={15} /> Edit Patient
          </button>
          <button className="btn-secondary flex items-center gap-2">
            <ArrowRightLeft size={15} /> Room Transfer
          </button>
          <Link to="/executive/patient-registration" className="btn-primary flex items-center gap-2">
            <BedDouble size={15} /> New Admission
          </Link>
        </div>
      </PageHeader>

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
                <th>MR Number</th><th>Patient Reg No</th><th>OPD Reg No</th><th>Name</th><th>Phone</th>
                <th>Gender/Age</th><th>Consultant Doctor</th><th>Referral Type</th><th>Room Type</th>
                <th>Room No</th><th>Bed No</th><th>Admitted Date</th><th>Room Transfer Status</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.mr_number}</td>
                  <td>{r.patient_reg_no}</td>
                  <td>{r.opd_reg_no || '—'}</td>
                  <td>{r.name}</td>
                  <td>{r.mobile}</td>
                  <td>{r.gender} / {r.age ?? '—'}</td>
                  <td>{r.doctor_name || '—'}</td>
                  <td>{r.referral_type}</td>
                  <td>{r.room_type}</td>
                  <td>{r.room_no || '—'}</td>
                  <td>{r.bed_no || '—'}</td>
                  <td>{new Date(r.admitted_date).toLocaleDateString()}</td>
                  <td>{r.room_transfer_status}</td>
                  <td>
                    <button className="text-teal-600 text-xs hover:underline" onClick={() => setTransferFor(r.id)}>
                      Transfer
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={14} className="text-center text-ink/40 py-8">No inpatient records found</td></tr>}
            </tbody>
          </table>
        </div>
      </Section>

      {transferFor && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white p-5 rounded-md w-full max-w-sm">
            <h3 className="font-semibold text-sm mb-3">Room Transfer</h3>
            <label className="label">New Room No</label>
            <input className="input mb-3" value={roomNo} onChange={(e) => setRoomNo(e.target.value)} />
            <label className="label">New Bed No</label>
            <input className="input mb-4" value={bedNo} onChange={(e) => setBedNo(e.target.value)} />
            <div className="flex gap-2">
              <button className="btn-primary flex-1" onClick={submitTransfer}>Confirm Transfer</button>
              <button className="btn-secondary flex-1" onClick={() => setTransferFor(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}