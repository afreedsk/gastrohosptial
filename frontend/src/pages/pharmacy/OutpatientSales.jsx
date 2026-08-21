import { useEffect, useState } from 'react'
import api from '../../api/axios'
import { PageHeader, Section } from '../../components/PageHeader'
import ItemLineTable, { emptyLine } from '../../components/pharmacy/ItemLineTable'

export default function OutpatientSales() {
  const [saleKind, setSaleKind] = useState('OP') // 'OP' | 'Direct'
  const [regNo, setRegNo] = useState('')
  const [patient, setPatient] = useState(null)
  const [mobile, setMobile] = useState('')
  const [name, setName] = useState('')
  const [ageGender, setAgeGender] = useState('')
  const [stores, setStores] = useState([])
  const [storeId, setStoreId] = useState('')
  const [barcode, setBarcode] = useState('')
  const [lines, setLines] = useState([emptyLine()])
  const [discountPercent, setDiscountPercent] = useState(0)
  const [paymentMode, setPaymentMode] = useState('Cash')
  const [paid, setPaid] = useState(0)
  const [remarks, setRemarks] = useState('NA')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(null)

  useEffect(() => {
    api.get('/pharmacy-items/stores').then((r) => {
      setStores(r.data)
      if (r.data.length) setStoreId(r.data[0].id)
    })
  }, [])

  const lookupPatient = async () => {
    setError('')
    if (!regNo.trim()) return
    try {
      const { data } = await api.get('/op-registrations', { params: { search: regNo } })
      const match = data.find((r) => r.opd_reg_no === regNo || r.mr_number === regNo) || data[0]
      if (!match) return setError('No matching OP registration found')
      setPatient(match)
      setName(match.name)
      setMobile(match.mobile)
      setAgeGender(`${match.age ?? '—'} / ${match.gender}`)
    } catch {
      setError('Could not look up patient')
    }
  }

  const total = lines.reduce((s, l) => s + Number(l.qty || 0) * Number(l.mrp || 0), 0)
  const discountAmount = (total * Number(discountPercent || 0)) / 100
  const net = Math.max(0, total - discountAmount)
  const due = Math.max(0, net - Number(paid || 0))

  const submit = async (asDraft) => {
    setError('')
    if (saleKind === 'OP' && !patient) return setError('Look up the OP registration first')
    if (saleKind === 'Direct' && (!name || !mobile)) return setError('Patient name and mobile are required for a direct sale')
    setSaving(true)
    try {
      const { data } = await api.post('/pharmacy-sales', {
        sale_type: saleKind === 'OP' ? 'OP' : 'Direct',
        op_registration_id: saleKind === 'OP' ? patient?.id : null,
        store_id: storeId,
        items: lines.filter((l) => l.item_name),
        discount_percent: discountPercent,
        payment_mode: paymentMode,
        paid_amount: paid,
        remarks,
        save_as_draft: asDraft,
      })
      setSaved(data)
      setLines([emptyLine()])
      setPaid(0)
      setDiscountPercent(0)
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save sale')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader title="Out Patient Sales Form" />
      {error && <div className="text-sm text-danger-500 bg-danger-400/10 border border-danger-400/30 rounded-sm px-3 py-2 mb-3">{error}</div>}
      {saved && (
        <div className="text-sm text-teal-700 bg-teal-50 border border-teal-100 rounded-sm px-3 py-2 mb-3">
          Sale <b>{saved.sale_no}</b> saved — Net ₹{Number(saved.net_amount).toFixed(2)}
        </div>
      )}

      <Section title="Patient Details">
        <div className="flex items-center gap-6 mb-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" checked={saleKind === 'OP'} onChange={() => setSaleKind('OP')} /> OP
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" checked={saleKind === 'Direct'} onChange={() => setSaleKind('Direct')} /> Direct
          </label>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="label">Patient Reg No {saleKind === 'OP' && '*'}</label>
            <div className="flex gap-1">
              <input className="input" value={regNo} onChange={(e) => setRegNo(e.target.value)} disabled={saleKind === 'Direct'} />
              <button type="button" className="btn-secondary px-3" onClick={lookupPatient} disabled={saleKind === 'Direct'}>🔍</button>
            </div>
          </div>
          <div><label className="label">Mobile *</label><input className="input" value={mobile} onChange={(e) => setMobile(e.target.value)} readOnly={saleKind === 'OP'} /></div>
          <div><label className="label">Patient Name *</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} readOnly={saleKind === 'OP'} /></div>
          <div><label className="label">Age/Gender *</label><input className="input" value={ageGender} onChange={(e) => setAgeGender(e.target.value)} readOnly={saleKind === 'OP'} /></div>
          <div><label className="label">Doctor Name</label><input className="input" readOnly value={patient?.doctor_name || ''} /></div>
          <div>
            <label className="label">Select Pharmacy Store</label>
            <select className="input" value={storeId} onChange={(e) => setStoreId(e.target.value)}>
              {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div><label className="label">Barcode</label><input className="input" placeholder="Scan or enter barcode" value={barcode} onChange={(e) => setBarcode(e.target.value)} /></div>
        </div>
      </Section>

      <Section title="Item Details">
        <ItemLineTable lines={lines} setLines={setLines} storeId={storeId} />
      </Section>

      <Section title="Payment Details">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><label className="label">Total Amount(₹)</label><input className="input" readOnly value={total.toFixed(2)} /></div>
          <div><label className="label">Discount(%)</label><input type="number" className="input" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} /></div>
          <div><label className="label">Discount Amount(₹)</label><input className="input" readOnly value={discountAmount.toFixed(2)} /></div>
          <div><label className="label">Net Amount(₹)</label><input className="input" readOnly value={net.toFixed(2)} /></div>
          <div>
            <label className="label">Payment Mode *</label>
            <select className="input" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
              {['Cash', 'Card', 'UPI', 'Insurance', 'Credit'].map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div><label className="label">Paid Amount *</label><input type="number" className="input" value={paid} onChange={(e) => setPaid(e.target.value)} /></div>
          <div><label className="label">Due Amount *</label><input className="input" readOnly value={due.toFixed(2)} /></div>
          <div><label className="label">Remarks *</label><input className="input" value={remarks} onChange={(e) => setRemarks(e.target.value)} /></div>
        </div>

        <div className="flex gap-3 mt-4">
          <button type="button" className="btn-secondary" disabled={saving} onClick={() => submit(true)}>Save as Draft</button>
          <button type="button" className="btn-primary" disabled={saving} onClick={() => submit(false)}>{saving ? 'Submitting…' : 'Submit'}</button>
          <button type="button" className="btn-secondary" onClick={() => setLines([emptyLine()])}>Clear</button>
        </div>
      </Section>
    </div>
  )
}