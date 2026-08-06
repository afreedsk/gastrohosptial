import { useEffect, useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import api from '../../api/axios'
import { PageHeader, Section } from '../../components/PageHeader'

const OP_ACTIONS = [
  { value: 'Consultation_Cancel', label: 'OP Consultation Cancel' },
  { value: 'Bill_Cancel', label: 'OP Billing Cancel' },
  { value: 'Lab_Cancel', label: 'OP Lab Cancel' },
  { value: 'Lab_Modify', label: 'OP Lab Modification' },
  { value: 'Service_Cancel', label: 'OP Service / Procedure Cancel' },
]
const IP_ACTIONS = [
  { value: 'Admission_Cancel', label: 'IP Admission Cancel' },
  { value: 'Lab_Cancel', label: 'IP Lab Cancel' },
  { value: 'Service_Cancel', label: 'IP Service Cancel' },
  { value: 'Procedure_Cancel', label: 'IP Procedure Cancel' },
  { value: 'Surgery_Cancel', label: 'IP Surgery Cancel' },
  { value: 'Advance_Adjustment', label: 'Advance Payment Adjustment' },
  { value: 'Advance_Refund', label: 'Advance Refund' },
  { value: 'Reprint', label: 'Reprint Bill' },
]

export default function BillingManagement() {
  const [billType, setBillType] = useState('OP')
  const [billId, setBillId] = useState('')
  const [actionType, setActionType] = useState(OP_ACTIONS[0].value)
  const [amount, setAmount] = useState(0)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [actions, setActions] = useState([])

  const loadActions = () => api.get('/billing-management/actions').then((r) => setActions(r.data))
  useEffect(() => { loadActions() }, [])

  const options = billType === 'OP' ? OP_ACTIONS : IP_ACTIONS

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!billId) return setError('Enter the bill ID to act on')
    if (!reason) return setError('A reason is required for audit purposes')
    setSaving(true)
    try {
      await api.post('/billing-management/actions', {
        bill_type: billType, bill_id: billId, action_type: actionType, amount, reason,
      })
      setBillId(''); setAmount(0); setReason('')
      loadActions()
    } catch (err) {
      setError(err.response?.data?.error || 'Action requires Admin or Super Admin role')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader title="Billing Modifications" subtitle="Cancellations, modifications and refunds — logged with full audit trail" />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <form onSubmit={submit} className="xl:col-span-1">
          <Section title="New Billing Action">
            {error && <p className="text-sm text-danger-500 mb-3">{error}</p>}

            <label className="label">Bill Type</label>
            <div className="flex gap-2 mb-3">
              {['OP', 'IP'].map((t) => (
                <button type="button" key={t}
                  onClick={() => { setBillType(t); setActionType(t === 'OP' ? OP_ACTIONS[0].value : IP_ACTIONS[0].value) }}
                  className={`flex-1 text-sm py-2 rounded-sm border ${billType === t ? 'bg-teal-600 text-white border-teal-600' : 'border-border text-ink/60'}`}>
                  {t} Billing
                </button>
              ))}
            </div>

            <label className="label">Bill ID</label>
            <input className="input mb-3" placeholder="e.g. 14" value={billId} onChange={(e) => setBillId(e.target.value)} />

            <label className="label">Action</label>
            <select className="input mb-3" value={actionType} onChange={(e) => setActionType(e.target.value)}>
              {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <label className="label">Amount (if applicable)</label>
            <input type="number" min="0" className="input mb-3" value={amount} onChange={(e) => setAmount(e.target.value)} />

            <label className="label">Reason *</label>
            <textarea className="input mb-4" rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Required — recorded in the audit log" />

            <button className="btn-danger w-full flex items-center justify-center gap-2" disabled={saving}>
              <ShieldAlert size={15} /> {saving ? 'Submitting…' : 'Submit Action'}
            </button>
            <p className="text-xs text-ink/40 mt-2">Requires Admin or Super Admin role for approval.</p>
          </Section>
        </form>

        <div className="xl:col-span-2">
          <Section title="Recent Billing Actions">
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr><th>Type</th><th>Bill ID</th><th>Action</th><th>Amount</th><th>Reason</th><th>By</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {actions.map((a) => (
                    <tr key={a.id}>
                      <td>{a.bill_type}</td>
                      <td>{a.bill_id}</td>
                      <td>{a.action_type.replace(/_/g, ' ')}</td>
                      <td>₹{Number(a.amount).toFixed(2)}</td>
                      <td className="max-w-[200px] truncate" title={a.reason}>{a.reason}</td>
                      <td>{a.performed_by_name}</td>
                      <td>{new Date(a.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                  {!actions.length && <tr><td colSpan={7} className="text-center text-ink/40 py-8">No actions recorded yet</td></tr>}
                </tbody>
              </table>
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}
