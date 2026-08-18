import { useEffect, useMemo, useState } from 'react'
import { Receipt } from 'lucide-react'
import api from '../../api/axios'
import {
  PageHeader,
  Section,
  StatusBadge,
} from '../../components/PageHeader'
import RoomChargeModal from '../../components/registration/RoomChargeModal'
import CatalogPickerModal from '../../components/registration/CatalogPickerModal'

const CHARGE_ROWS = [
  { key: 'admission_charge', label: 'Admission Charges' },
  { key: 'room_charge', label: 'Room Charges', picker: 'room' },
  { key: 'doctor_visit_charge', label: 'Doctor Visit' },
  { key: 'lab_charge', label: 'Lab', picker: 'lab' },
  { key: 'radiology_charge', label: 'Radiology' },
  { key: 'ot_charge', label: 'OT Charges' },
  { key: 'procedure_charge', label: 'Procedures / Surgeries', picker: 'procedure' },
  { key: 'medicine_charge', label: 'Medicines' },
  { key: 'nursing_charge', label: 'Nursing Services' },
  { key: 'service_charge', label: 'Services', picker: 'service' },
  { key: 'food_charge', label: 'Food' },
  { key: 'misc_charge', label: 'Miscellaneous' },
]

const initCharges = Object.fromEntries(CHARGE_ROWS.map((c) => [c.key, 0]))

export default function IPBilling() {
  const [admissions, setAdmissions] = useState([])
  const [admissionId, setAdmissionId] = useState('')
  const [charges, setCharges] = useState(initCharges)
  const [discount, setDiscount] = useState(0)
  const [advanceAdjusted, setAdvanceAdjusted] = useState(0)
  const [paid, setPaid] = useState(0)
  const [bills, setBills] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [activePicker, setActivePicker] = useState(null) // 'room' | 'lab' | 'procedure' | 'service' | null
  const [roomSelection, setRoomSelection] = useState(null)
  // per-key list of selected catalog items, purely for display chips
  const [pickedItems, setPickedItems] = useState({ lab_charge: [], procedure_charge: [], service_charge: [] })

  const loadBills = () => {
    api.get('/ip-billing').then((r) => setBills(r.data))
      .catch((err) => console.error('Failed to load IP bills:', err))
  }

  useEffect(() => {
    api.get('/ip-registrations', { params: { status: 'Admitted' } })
      .then((r) => setAdmissions(r.data))
      .catch((err) => console.error('Failed to load admitted patients:', err))
    loadBills()
  }, [])

  const gross = useMemo(() => {
    return Object.values(charges).reduce((sum, value) => sum + Number(value || 0), 0)
  }, [charges])

  const discountedTotal = Math.max(0, gross - Number(discount || 0))
  const grandTotal = +discountedTotal.toFixed(2)
  const due = +Math.max(0, grandTotal - Number(advanceAdjusted || 0) - Number(paid || 0)).toFixed(2)

  const applyRoomCharge = (result) => {
    setCharges((current) => ({
      ...current,
      room_charge: result.room_charge,
      doctor_visit_charge: result.doctor_visit_charge,
      nursing_charge: result.nursing_charge,
      // no dedicated assistant-doctor column on ip_bills — added into misc_charge
      misc_charge: Number(current.misc_charge || 0) + result.assistant_doctor_charge,
    }))
    setRoomSelection({ roomType: result.roomType, days: result.days })
    setActivePicker(null)
  }

  const applyCatalogSelection = (chargeKey) => (selectedList, total) => {
    setCharges((current) => ({
      ...current,
      [chargeKey]: Number(current[chargeKey] || 0) + total,
    }))
    setPickedItems((current) => ({
      ...current,
      [chargeKey]: [...current[chargeKey], ...selectedList],
    }))
    setActivePicker(null)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!admissionId) {
      return setError('Select an admitted patient first')
    }
    setError('')
    setSaving(true)
    try {
      await api.post('/ip-billing', {
        ip_registration_id: admissionId,
        ...charges,
        discount,
        advance_adjusted: advanceAdjusted,
        paid_amount: paid,
      })
      setAdmissionId('')
      setCharges(initCharges)
      setDiscount(0)
      setAdvanceAdjusted(0)
      setPaid(0)
      setRoomSelection(null)
      setPickedItems({ lab_charge: [], procedure_charge: [], service_charge: [] })
      loadBills()
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create bill')
    } finally {
      setSaving(false)
    }
  }

  const chipSummary = (key) => {
    const items = pickedItems[key]
    if (!items?.length) return null
    const names = items.map((i) => i.investigation_name || i.service_name).join(', ')
    return <span className="block text-xs text-teal-600 truncate max-w-[220px]" title={names}>{names}</span>
  }

  return (
    <div>
      <PageHeader title="Inpatient Billing" subtitle="Create and manage IP bills" />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <form onSubmit={submit} className="xl:col-span-1">
          <Section title="New IP Bill">
            {error && <p className="text-sm text-danger-500 mb-3">{error}</p>}

            <label className="label">Admitted Patient</label>
            <select className="input mb-3" value={admissionId} onChange={(e) => setAdmissionId(e.target.value)}>
              <option value="">Select admission</option>
              {admissions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.ip_reg_no} — {a.name} ({a.room_no || '—'}/{a.bed_no || '—'})
                </option>
              ))}
            </select>

            {!admissions.length && (
              <p className="text-xs text-amber-600 mb-3">
                No admitted patients found. Admit a patient first via In Patient Registration.
              </p>
            )}

            <div className="space-y-2 my-3 max-h-72 overflow-y-auto pr-1">
              {CHARGE_ROWS.map((c) => (
                <div key={c.key} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-ink/70">
                    {c.label}
                    {c.key === 'room_charge' && roomSelection && (
                      <span className="block text-xs text-teal-600">
                        {roomSelection.roomType} · {roomSelection.days} day(s)
                      </span>
                    )}
                    {c.picker && c.picker !== 'room' && chipSummary(c.key)}
                  </span>

                  {c.picker ? (
                    <input
                      type="number"
                      readOnly
                      onClick={() => setActivePicker(c.picker)}
                      className="input w-28 text-right cursor-pointer bg-teal-50/50"
                      value={charges[c.key]}
                      title={`Click to select ${c.label.toLowerCase()}`}
                    />
                  ) : (
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
                  )}
                </div>
              ))}
            </div>

            <div className="mb-3">
              <label className="label">Discount</label>
              <input type="number" min="0" step="0.01" className="input" value={discount}
                onChange={(e) => setDiscount(e.target.value)} />
            </div>

            <div className="bg-teal-50 rounded-sm p-3 text-sm space-y-1 mb-3">
              <div className="flex justify-between"><span>Gross Total</span><span>₹{gross.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Discount</span><span>₹{Number(discount || 0).toFixed(2)}</span></div>
              <div className="flex justify-between font-semibold"><span>Grand Total</span><span>₹{grandTotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Advance Adjusted</span><span>₹{Number(advanceAdjusted || 0).toFixed(2)}</span></div>
              <div className="flex justify-between text-danger-500"><span>Due</span><span>₹{due.toFixed(2)}</span></div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="label">Advance Adjusted</label>
                <input type="number" min="0" step="0.01" className="input" value={advanceAdjusted}
                  onChange={(e) => setAdvanceAdjusted(e.target.value)} />
              </div>
              <div>
                <label className="label">Paid Now</label>
                <input type="number" min="0" step="0.01" className="input" value={paid}
                  onChange={(e) => setPaid(e.target.value)} />
              </div>
            </div>

            <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" disabled={saving}>
              <Receipt size={15} />
              {saving ? 'Generating…' : 'Generate IP Bill'}
            </button>
          </Section>
        </form>

        <div className="xl:col-span-2">
          <Section title="IP Bills">
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Bill No</th><th>Admission</th><th>Patient</th><th>Grand Total</th>
                    <th>Paid</th><th>Due</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((b) => (
                    <tr key={b.id}>
                      <td>{b.bill_no}</td>
                      <td>{b.admission_no}</td>
                      <td>{b.patient_name}</td>
                      <td>₹{Number(b.grand_total || 0).toFixed(2)}</td>
                      <td>₹{Number(b.paid_amount || 0).toFixed(2)}</td>
                      <td>₹{Number(b.due_amount || 0).toFixed(2)}</td>
                      <td><StatusBadge status={b.status} /></td>
                    </tr>
                  ))}
                  {!bills.length && <tr><td colSpan={7} className="text-center text-ink/40 py-8">No IP bills yet</td></tr>}
                </tbody>
              </table>
            </div>
          </Section>
        </div>
      </div>

      {activePicker === 'room' && (
        <RoomChargeModal
          initial={roomSelection}
          onApply={applyRoomCharge}
          onClose={() => setActivePicker(null)}
        />
      )}

      {activePicker === 'lab' && (
        <CatalogPickerModal
          title="Lab Investigations"
          endpoint="/catalog/lab"
          groupField="department"
          nameField="investigation_name"
          onApply={applyCatalogSelection('lab_charge')}
          onClose={() => setActivePicker(null)}
        />
      )}

      {activePicker === 'procedure' && (
        <CatalogPickerModal
          title="Procedures"
          endpoint="/catalog/services"
          groupField="service_type"
          nameField="service_name"
          extraParams={{ type: 'PROCEDURE CHARGES' }}
          onApply={applyCatalogSelection('procedure_charge')}
          onClose={() => setActivePicker(null)}
        />
      )}

      {activePicker === 'service' && (
        <CatalogPickerModal
          title="Services"
          endpoint="/catalog/services"
          groupField="service_type"
          nameField="service_name"
          onApply={applyCatalogSelection('service_charge')}
          onClose={() => setActivePicker(null)}
        />
      )}
    </div>
  )
}