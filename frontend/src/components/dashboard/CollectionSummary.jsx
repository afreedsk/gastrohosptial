import { useState } from 'react'
import { Printer, Download, Search as SearchIcon } from 'lucide-react'
import api from '../../api/axios'
import { Section } from '../PageHeader'

const today = () => new Date().toISOString().slice(0, 10)

function BucketTable({ rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="table-base">
        <thead>
          <tr><th>Category</th><th>Cash</th><th>Card</th><th>UPI</th><th>Bank</th><th>Total</th></tr>
        </thead>
        <tbody>
          {rows.map(({ label, bucket }) => (
            <tr key={label}>
              <td>{label}</td>
              <td>₹{bucket.cash.toFixed(2)}</td>
              <td>₹{bucket.card.toFixed(2)}</td>
              <td>₹{bucket.upi.toFixed(2)}</td>
              <td>₹{bucket.bank.toFixed(2)}</td>
              <td className="font-medium">₹{bucket.total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function CollectionSummary() {
  const [startDate, setStartDate] = useState(today())
  const [endDate, setEndDate] = useState(today())
  const [clinic, setClinic] = useState('All')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const getData = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/dashboard/collection-summary', {
        params: { start_date: startDate, end_date: endDate, clinic },
      })
      setData(data)
    } finally {
      setLoading(false)
    }
  }

  const exportCsv = () => {
    if (!data) return
    const lines = [['Category', 'Cash', 'Card', 'UPI', 'Bank', 'Total']]
    const rows = [
      ['OP Billing', data.op_billing], ['OP Diagnostics', data.op_diagnostics],
      ['OP Radiology', data.op_radiology], ['Direct Patients', data.direct_patients],
      ['Direct Diagnostics', data.direct_diagnostics], ['Direct Radiology', data.direct_radiology],
      ['IP Income', data.ip_income], ['IP Diagnostics', data.ip_diagnostics],
      ['IP Radiology', data.ip_radiology],
    ]
    rows.forEach(([label, b]) => lines.push([label, b.cash, b.card, b.upi, b.bank, b.total]))
    lines.push([])
    lines.push(['Total Income', '', '', '', '', data.total_income])
    lines.push(['Expenses', '', '', '', '', data.expenses])
    lines.push(['Grand Total', '', '', '', '', data.grand_total])
    const csv = lines.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `collection-summary-${startDate}-to-${endDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Section title="Hospital Collection">
      <div className="flex flex-wrap items-end gap-3 mb-5 print:hidden">
        <div>
          <label className="label">Start Date</label>
          <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="label">End Date</label>
          <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Clinic</label>
          <select className="input" value={clinic} onChange={(e) => setClinic(e.target.value)}>
            <option>All</option>
            <option>Main Clinic</option>
          </select>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={getData} disabled={loading}>
          <SearchIcon size={15} /> {loading ? 'Loading…' : 'Get'}
        </button>
        <button className="btn-secondary flex items-center gap-2" onClick={() => window.print()} disabled={!data}>
          <Printer size={15} /> Print
        </button>
        <button className="btn-secondary flex items-center gap-2" onClick={exportCsv} disabled={!data}>
          <Download size={15} /> Export
        </button>
      </div>

      {!data && <p className="text-sm text-ink/40">Choose a date range and click Get to load collection data.</p>}

      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="border border-border rounded-sm p-3">
              <p className="text-ink/40 text-xs">Users</p>
              <p className="font-semibold text-lg">{data.meta.users}</p>
            </div>
            <div className="border border-border rounded-sm p-3">
              <p className="text-ink/40 text-xs">Doctors</p>
              <p className="font-semibold text-lg">{data.meta.doctors}</p>
            </div>
            <div className="border border-border rounded-sm p-3">
              <p className="text-ink/40 text-xs">Last Updated</p>
              <p className="font-semibold text-sm">{new Date(data.meta.last_updated).toLocaleString()}</p>
            </div>
            <div className="border border-border rounded-sm p-3">
              <p className="text-ink/40 text-xs">SMS Remaining</p>
              <p className="font-semibold text-lg">{data.meta.sms_remaining ?? '—'}</p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">OP Billing</h4>
            <BucketTable rows={[{ label: 'OP Billing', bucket: data.op_billing }]} />
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">OP Diagnostics & Radiology</h4>
            <BucketTable rows={[
              { label: 'OP Diagnostics', bucket: data.op_diagnostics },
              { label: 'OP Radiology', bucket: data.op_radiology },
            ]} />
            <p className="text-xs text-ink/40 mt-1">OP Refunds: ₹{data.op_refund.toFixed(2)}</p>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">Direct Patients</h4>
            <BucketTable rows={[
              { label: 'Direct Patients', bucket: data.direct_patients },
              { label: 'Direct Diagnostics', bucket: data.direct_diagnostics },
              { label: 'Direct Radiology', bucket: data.direct_radiology },
            ]} />
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">IP Income</h4>
            <BucketTable rows={[
              { label: 'IP Income', bucket: data.ip_income },
              { label: 'IP Diagnostics', bucket: data.ip_diagnostics },
              { label: 'IP Radiology', bucket: data.ip_radiology },
            ]} />
            <p className="text-xs text-ink/40 mt-1">IP Refunds: ₹{data.ip_refund.toFixed(2)}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-teal-200 bg-teal-50/50 rounded-sm p-4">
              <p className="text-ink/50 text-xs">Total Income</p>
              <p className="font-semibold text-xl">₹{data.total_income.toFixed(2)}</p>
            </div>
            <div className="border border-border rounded-sm p-4">
              <p className="text-ink/50 text-xs">Expenses</p>
              <p className="font-semibold text-xl">₹{data.expenses.toFixed(2)}</p>
            </div>
            <div className="border border-teal-600 bg-teal-600/5 rounded-sm p-4">
              <p className="text-ink/50 text-xs">Grand Total</p>
              <p className="font-semibold text-xl text-teal-700">₹{data.grand_total.toFixed(2)}</p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">Due Totals</h4>
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead><tr><th>Category</th><th>Amount Due</th></tr></thead>
                <tbody>
                  <tr><td>OP & Direct Bill Due</td><td>₹{data.due.op_direct_bill_due.toFixed(2)}</td></tr>
                  <tr><td>OP Lab & Radiology Due</td><td>₹{data.due.op_lab_radiology_due.toFixed(2)}</td></tr>
                  <tr><td>IP Bill Due</td><td>₹{data.due.ip_bill_due.toFixed(2)}</td></tr>
                  <tr><td>IP Lab & Radiology Due</td><td>₹{data.due.ip_lab_radiology_due.toFixed(2)}</td></tr>
                  <tr className="font-semibold"><td>Total Due</td><td>₹{data.due.total_due.toFixed(2)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Section>
  )
}