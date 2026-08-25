import { useEffect, useMemo, useState } from 'react'
import { Receipt, FlaskConical, Stethoscope, Scissors } from 'lucide-react'
import api from '../../api/axios'
import { PageHeader, Section, StatusBadge } from '../../components/PageHeader'
import OPLab from '../../components/billing/OPLab'
import OPServices from '../../components/billing/OPServices'
import OPProcedures from '../../components/billing/OPProcedures'

const CHARGE_ROWS = [
  { key: 'consultation_charge', label: 'Consultation' },
  { key: 'lab_charge', label: 'Lab / Blood Test' },
  { key: 'procedure_charge', label: 'Procedure' },
  { key: 'service_charge', label: 'Service / X-Ray' },
  { key: 'pharmacy_charge', label: 'Pharmacy / Medicine' },
]

const initCharges = {
  consultation_charge: 0,
  lab_charge: 0,
  procedure_charge: 0,
  service_charge: 0,
  pharmacy_charge: 0,
}

export default function OPBilling() {
  const [patientSearch, setPatientSearch] = useState('')
  const [patients, setPatients] = useState([])
  const [patientId, setPatientId] = useState('')
  const [charges, setCharges] = useState(initCharges)
  const [discount, setDiscount] = useState(0)
  const [paid, setPaid] = useState(0)
  const [paymentMode, setPaymentMode] = useState('Cash')
  const [bills, setBills] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('bills') // 'bills', 'lab', 'services', 'procedures'

  const loadBills = () => {
    api.get('/op-billing')
      .then((r) => setBills(r.data))
      .catch((err) => console.error('Failed to load OP bills:', err))
  }

  useEffect(() => {
    loadBills()
  }, [])

  useEffect(() => {
    if (patientSearch.length > 1) {
      api.get('/patients', { params: { search: patientSearch } })
        .then((r) => setPatients(r.data))
        .catch(() => setPatients([]))
    } else {
      setPatients([])
    }
  }, [patientSearch])

  const gross = useMemo(() => {
    return Object.values(charges).reduce((sum, value) => sum + Number(value || 0), 0)
  }, [charges])

  const netTotal = Math.max(0, gross - Number(discount || 0))
  const due = Math.max(0, netTotal - Number(paid || 0))

  const submit = async (e) => {
    e.preventDefault()
    if (!patientId) return setError('Select a patient first')
    setError('')
    setSaving(true)
    try {
      await api.post('/op-billing', {
        patient_id: patientId,
        ...charges,
        discount,
        paid_amount: paid,
        payment_mode: paymentMode,
      })
      setPatientId('')
      setPatientSearch('')
      setPatients([])
      setCharges(initCharges)
      setDiscount(0)
      setPaid(0)
      setPaymentMode('Cash')
      loadBills()
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create bill')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader title="Outpatient Billing" subtitle="Create and manage OP bills" />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Left column – New OP Bill Form */}
        <form onSubmit={submit} className="xl:col-span-1">
          <Section title="New OP Bill">
            {error && <p className="text-sm text-danger-500 mb-3">{error}</p>}

            <label className="label">Patient</label>
            <input
              className="input mb-1"
              placeholder="Search name or phone…"
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
            />
            {patients.length > 0 && (
              <div className="border border-border rounded-sm mb-3 max-h-40 overflow-y-auto">
                {patients.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => {
                      setPatientId(p.id)
                      setPatientSearch(`${p.name} (${p.patient_uid})`)
                      setPatients([])
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-teal-50 border-b border-border last:border-0"
                  >
                    {p.name} · {p.phone}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-2 my-3">
              {CHARGE_ROWS.map((c) => (
                <div key={c.key} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-ink/70">{c.label}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input w-28 text-right"
                    value={charges[c.key]}
                    onChange={(e) =>
                      setCharges((current) => ({ ...current, [c.key]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>

            <div className="mb-3">
              <label className="label">Discount</label>
              <input type="number" min="0" step="0.01" className="input" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </div>

            <div className="bg-teal-50 rounded-sm p-3 text-sm space-y-1 mb-3">
              <div className="flex justify-between"><span>Gross Total</span><span>₹{gross.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Discount</span><span>₹{Number(discount || 0).toFixed(2)}</span></div>
              <div className="flex justify-between font-semibold"><span>Net Total</span><span>₹{netTotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-danger-500"><span>Due</span><span>₹{due.toFixed(2)}</span></div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="label">Paid</label>
                <input type="number" min="0" step="0.01" className="input" value={paid} onChange={(e) => setPaid(e.target.value)} />
              </div>
              <div>
                <label className="label">Payment Mode</label>
                <select className="input" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                  {['Cash', 'Card', 'UPI', 'Insurance', 'Credit'].map((mode) => (
                    <option key={mode} value={mode}>{mode}</option>
                  ))}
                </select>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" disabled={saving}>
              <Receipt size={15} /> {saving ? 'Generating…' : 'Generate Bill'}
            </button>
          </Section>
        </form>

        {/* Right column – Tabs for Bills / Lab / Services / Procedures */}
        <div className="xl:col-span-2">
          <Section title="OP Records">
            <div className="flex border-b border-border mb-4">
              <button
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'bills' ? 'text-teal-700 border-b-2 border-teal-700' : 'text-ink/50 hover:text-ink'
                }`}
                onClick={() => setActiveTab('bills')}
              >
                <Receipt size={14} className="inline mr-1" /> OP Bills
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'lab' ? 'text-teal-700 border-b-2 border-teal-700' : 'text-ink/50 hover:text-ink'
                }`}
                onClick={() => setActiveTab('lab')}
              >
                <FlaskConical size={14} className="inline mr-1" /> Lab
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'services' ? 'text-teal-700 border-b-2 border-teal-700' : 'text-ink/50 hover:text-ink'
                }`}
                onClick={() => setActiveTab('services')}
              >
                <Stethoscope size={14} className="inline mr-1" /> Services
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'procedures' ? 'text-teal-700 border-b-2 border-teal-700' : 'text-ink/50 hover:text-ink'
                }`}
                onClick={() => setActiveTab('procedures')}
              >
                <Scissors size={14} className="inline mr-1" /> Procedures
              </button>
            </div>

            <div>
              {activeTab === 'bills' && (
                <div className="overflow-x-auto">
                  <table className="table-base">
                    <thead>
                      <tr>
                        <th>Bill No</th><th>Patient</th><th>Net Total</th><th>Paid</th><th>Due</th><th>Mode</th><th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bills.map((b) => (
                        <tr key={b.id}>
                          <td>{b.bill_no}</td>
                          <td>{b.patient_name}</td>
                          <td>₹{Number(b.net_total || 0).toFixed(2)}</td>
                          <td>₹{Number(b.paid_amount || 0).toFixed(2)}</td>
                          <td>₹{Number(b.due_amount || 0).toFixed(2)}</td>
                          <td>{b.payment_mode}</td>
                          <td><StatusBadge status={b.status} /></td>
                        </tr>
                      ))}
                      {!bills.length && <tr><td colSpan={7} className="text-center text-ink/40 py-8">No OP bills yet</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
              {activeTab === 'lab' && <OPLab />}
              {activeTab === 'services' && <OPServices />}
              {activeTab === 'procedures' && <OPProcedures />}
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}