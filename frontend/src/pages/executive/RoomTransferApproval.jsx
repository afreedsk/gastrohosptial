import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import api from '../../api/axios'
import { PageHeader, Section } from '../../components/PageHeader'

export default function RoomTransferApproval() {
  const [requests, setRequests] = useState([])
  const [error, setError] = useState('')

  const load = () => api.get('/ip-registrations/transfer-requests').then((r) => setRequests(r.data))
  useEffect(() => { load() }, [])

  const approve = async (id) => {
    setError('')
    try {
      await api.post(`/ip-registrations/${id}/transfer/approve`)
      load()
    } catch (err) {
      setError(err.response?.data?.error || 'Could not approve transfer')
    }
  }

  const reject = async (id) => {
    setError('')
    try {
      await api.post(`/ip-registrations/${id}/transfer/reject`)
      load()
    } catch (err) {
      setError(err.response?.data?.error || 'Could not reject transfer')
    }
  }

  return (
    <div>
      <PageHeader title="Room Transfer Approval" subtitle="Pending inpatient room transfer requests" />

      <Section title="Pending Requests">
        {error && <p className="text-sm text-danger-500 mb-3">{error}</p>}
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>MR No</th><th>Patient Reg No</th><th>Patient Name</th>
                <th>From Room Type/Room No/Bed No</th><th>Room Type/Room No/Bed No</th>
                <th>Requested Date</th><th>Approve</th><th>Reject</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td>{r.mr_number}</td>
                  <td>{r.patient_reg_no}</td>
                  <td>{r.name}</td>
                  <td>{r.from_room_type} / {r.from_room_no || '—'} / {r.from_bed_no || '—'}</td>
                  <td>{r.to_room_no} / {r.to_bed_no || '—'}</td>
                  <td>{r.transfer_requested_at ? new Date(r.transfer_requested_at).toLocaleString() : '—'}</td>
                  <td>
                    <button onClick={() => approve(r.id)} className="text-teal-600 hover:text-teal-700" title="Approve">
                      <Check size={16} />
                    </button>
                  </td>
                  <td>
                    <button onClick={() => reject(r.id)} className="text-danger-500 hover:text-danger-600" title="Reject">
                      <X size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {!requests.length && <tr><td colSpan={8} className="text-center text-ink/40 py-8">No pending transfer requests</td></tr>}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}