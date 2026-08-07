import { useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import api from '../../api/axios'
import { Section } from '../PageHeader'

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

export default function BillingActionForm({ onCreated }) {
  const [billType, setBillType] = useState('OP')
  const [billId, setBillId] = useState('')
  const [actionType, setActionType] = useState(OP_ACTIONS[0].value)
  const [amount, setAmount] = useState(0)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const options = billType === 'OP' ? OP_ACTIONS : IP_ACTIONS

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!billId) return setError('Enter the Bill No to act on')
    if (!reason) return setError('A reason is required for audit purposes')
    setSaving(true)
    try {
      await api.post('/billing-management/actions', {
        bill_type: billType, bill_id: billId.trim(), action_type: actionType, amount, reason,
      })
      setBillId(''); setAmount(0); setReason('')
      onCreated?.()
    } catch (err) {
      setError(err.response?.data?.error || 'Action requires Admin or Super Admin role')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit}>
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

        <label className="label">Bill No</label>
        <input
          className="input mb-3"
          placeholder={billType === 'OP' ? 'e.g. OPB-000002' : 'e.g. IPB-000002'}
          value={billId}
          onChange={(e) => setBillId(e.target.value)}
        />
        <p className="text-xs text-ink/40 -mt-2 mb-3">Enter the bill number shown on the {billType} bill.</p>

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
  )
}