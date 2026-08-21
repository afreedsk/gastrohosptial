import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { UserPlus2, Printer, Pencil, Search } from 'lucide-react'
import api from '../../api/axios'
import { PageHeader, Section } from '../../components/PageHeader'

const PAYMENT_MODES = ['Cash', 'Card', 'UPI', 'Insurance', 'Credit']

export default function AdvancePaymentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [search, setSearch] = useState('')
  const [modalType, setModalType] = useState(null) // 'Payment' | 'Refund' | null
  const [amount, setAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState('Cash')
  const [remarks, setRemarks] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () => api.get(`/advance-payments/${id}`).then((r) => setData(r.data)).catch(() => setData(null))
  useEffect(() => { load() }, [id])

  const filteredEntries = data?.entries.filter((e) =>
    !search || e.patient_reg_no.toLowerCase().includes(search.toLowerCase())
  ) || []

  const submitEntry = async () => {
    setError('')
    if (!amount || Number(amount) <= 0) return setError('Enter a valid amount')
    setSaving(true)
    try {
      await api.post('/advance-payments', {
        ip_registration_id: id,
        entry_type: modalType,
        amount,
        payment_mode: paymentMode,
        remarks,
      })
      setModalType(null); setAmount(''); setRemarks(''); setPaymentMode('Cash')
      load()
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save entry')
    } finally {
      setSaving(false)
    }
  }

  if (!data) {
    return (
      <div>
        <PageHeader title="Advance Payment" />
        <p className="text-sm text-ink/40">Loading…</p>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Advance Payment" />

      <Section title="Patient Details">
        <div className="flex items-center gap-2 mb-3">
          <UserPlus2 size={16} className="text-teal-600" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div><span className="font-medium text-ink/50">Patient Reg.No.</span> <span className="text-teal-700">{data.patient.patient_reg_no}</span></div>
          <div><span className="font-medium text-ink/50">Name</span> <span className="text-amber-600">{data.patient.name}</span></div>
          <div><span className="font-medium text-ink/50">Room</span> <span className="text-amber-600">{data.patient.room}</span></div>
        </div>
      </Section>

      <Section title="">
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-2">
            <button className="btn-primary" onClick={() => setModalType('Payment')}>Add</button>
            <button className="bg-teal-600/80 hover:bg-teal-700 text-white text-sm px-3 py-1.5 rounded-sm" onClick={() => setModalType('Refund')}>
              Add Refund
            </button>
          </div>
          <div className="flex items-center gap-2 max-w-xs">
            <Search size={14} className="text-ink/40" />
            <input className="input" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Patient Reg No.</th><th>Amount Paid</th><th>Refund Paid</th><th>Total</th>
                <th>Received At</th><th>Received By</th><th></th><th></th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((e) => (
                <tr key={e.id}>
                  <td>{e.patient_reg_no}</td>
                  <td>₹{e.amount_paid.toFixed(2)}</td>
                  <td>{e.refund_paid}</td>
                  <td>{e.total}</td>
                  <td>{new Date(e.received_at).toLocaleString()}</td>
                  <td>{e.received_by}</td>
                  <td><Printer size={14} className="text-ink/40 cursor-pointer hover:text-teal-600" /></td>
                  <td><Pencil size={14} className="text-ink/40 cursor-pointer hover:text-teal-600" /></td>
                </tr>
              ))}
              {!filteredEntries.length && <tr><td colSpan={8} className="text-center text-ink/40 py-8">No entries yet</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end text-sm font-medium mt-2">
          Total: ₹{data.amount_paid_total.toFixed(2)} / ₹{data.net_total.toFixed(2)}
        </div>

        <p className="text-xs text-ink/40 mt-2">Showing 1 to {filteredEntries.length} of {filteredEntries.length} entries</p>

        <div className="flex justify-center mt-4">
          <button className="bg-amber-500 hover:bg-amber-600 text-white text-sm px-6 py-2 rounded-sm" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </Section>

      {modalType && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-md w-full max-w-sm p-5">
            <h3 className="font-semibold text-sm mb-3">{modalType === 'Payment' ? 'Add Advance Payment' : 'Add Refund'}</h3>
            {error && <p className="text-sm text-danger-500 mb-3">{error}</p>}
            <label className="label">Amount *</label>
            <input type="number" min="0" step="0.01" className="input mb-3" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <label className="label">Payment Mode</label>
            <select className="input mb-3" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
              {PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}
            </select>
            <label className="label">Remarks</label>
            <input className="input mb-4" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            <div className="flex gap-2">
              <button className="btn-primary flex-1" disabled={saving} onClick={submitEntry}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button className="btn-secondary flex-1" onClick={() => setModalType(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}