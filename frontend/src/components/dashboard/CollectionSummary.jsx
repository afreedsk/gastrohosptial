import { useState } from 'react'
import { Printer, Download, Search as SearchIcon } from 'lucide-react'
import api from '../../api/axios'
import { Section } from '../PageHeader'

const today = () => new Date().toISOString().slice(0, 10)

const EMPTY_BUCKET = { cash: 0, card: 0, upi: 0, bank: 0, total: 0 }

const fmt = (n) => `₹${Number(n || 0).toFixed(2)}`

function BucketTable({ rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="table-base">
        <thead>
          <tr>
            <th>Category</th>
            <th className="text-right">Cash</th>
            <th className="text-right">Card</th>
            <th className="text-right">UPI</th>
            <th className="text-right">Bank</th>
            <th className="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ label, bucket }) => {
            const b = bucket || EMPTY_BUCKET
            return (
              <tr key={label}>
                <td>{label}</td>
                <td className="text-right">{fmt(b.cash)}</td>
                <td className="text-right">{fmt(b.card)}</td>
                <td className="text-right">{fmt(b.upi)}</td>
                <td className="text-right">{fmt(b.bank)}</td>
                <td className="text-right font-medium">{fmt(b.total)}</td>
              </tr>
            )
          })}
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
  const [error, setError] = useState(null)

  const getData = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get('/dashboard/collection-summary', {
        params: { start_date: startDate, end_date: endDate, clinic },
      })
      setData(data)
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  const exportCsv = () => {
    if (!data) return
    const lines = [['Category', 'Cash', 'Card', 'UPI', 'Bank', 'Total']]
    const rows = [
      ['OP Billing', data.op_billing],
      ['OP Diagnostics', data.op_diagnostics],
      ['OP Radiology', data.op_radiology],
      ['Direct Patients', data.direct_patients],
      ['Direct Diagnostics', data.direct_diagnostics],
      ['Direct Radiology', data.direct_radiology],
      ['IP Income', data.ip_income],
      ['IP Diagnostics', data.ip_diagnostics],
      ['IP Radiology', data.ip_radiology],
    ]
    rows.forEach(([label, b]) => {
      const x = b || EMPTY_BUCKET
      lines.push([label, x.cash, x.card, x.upi, x.bank, x.total])
    })
    lines.push([])
    lines.push(['Total Income', '', '', '', '', data.total_income])
    lines.push(['Expenses', '', '', '', '', data.expenses])
    lines.push(['Grand Total', '', '', '', '', data.grand_total])
    lines.push([])
    lines.push(['Due - OP & Direct Bill', '', '', '', '', data.due.op_direct_bill_due])
    lines.push(['Due - OP Lab & Radiology', '', '', '', '', data.due.op_lab_radiology_due])
    lines.push(['Due - IP Bill', '', '', '', '', data.due.ip_bill_due])
    lines.push(['Due - IP Lab & Radiology', '', '', '', '', data.due.ip_lab_radiology_due])
    lines.push(['Due - Total', '', '', '', '', data.due.total_due])

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
          <input
            type="date"
            className="input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label className="label">End Date</label>
          <input
            type="date"
            className="input"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Clinic</label>
          <select
            className="input"
            value={clinic}
            onChange={(e) => setClinic(e.target.value)}
          >
            <option>All</option>
            <option>Main Clinic</option>
          </select>
        </div>
        <button
          className="btn-primary flex items-center gap-2"
          onClick={getData}
          disabled={loading}
        >
          <SearchIcon size={15} /> {loading ? 'Loading…' : 'Get'}
        </button>
        <button
          className="btn-secondary flex items-center gap-2"
          onClick={() => window.print()}
          disabled={!data}
        >
          <Printer size={15} /> Print
        </button>
        <button
          className="btn-secondary flex items-center gap-2"
          onClick={exportCsv}
          disabled={!data}
        >
          <Download size={15} /> Export
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 mb-3">{error}</p>
      )}

      {!data && !error && (
        <p className="text-sm text-ink/40">
          Choose a date range and click Get to load collection data.
        </p>
      )}

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
              <p className="font-semibold text-sm">
                {new Date(data.meta.last_updated).toLocaleString()}
              </p>
            </div>
            <div className="border border-border rounded-sm p-3">
              <p className="text-ink/40 text-xs">SMS Remaining</p>
              <p className="font-semibold text-lg">
                {data.meta.sms_remaining ?? '—'}
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">OP Billing</h4>
            <BucketTable rows={[{ label: 'OP Billing', bucket: data.op_billing }]} />
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">OP Diagnostics & Radiology</h4>
            <BucketTable
              rows={[
                { label: 'OP Diagnostics', bucket: data.op_diagnostics },
                { label: 'OP Radiology', bucket: data.op_radiology },
              ]}
            />
            <p className="text-xs text-ink/40 mt-1">
              OP Refunds: {fmt(data.op_refund)}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">Direct Patients</h4>
            <BucketTable
              rows={[
                { label: 'Direct Patients', bucket: data.direct_patients },
                { label: 'Direct Diagnostics', bucket: data.direct_diagnostics },
                { label: 'Direct Radiology', bucket: data.direct_radiology },
              ]}
            />
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">IP Income</h4>
            <BucketTable
              rows={[
                { label: 'IP Income', bucket: data.ip_income },
                { label: 'IP Diagnostics', bucket: data.ip_diagnostics },
                { label: 'IP Radiology', bucket: data.ip_radiology },
              ]}
            />
            <p className="text-xs text-ink/40 mt-1">
              IP Refunds: {fmt(data.ip_refund)}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-teal-200 bg-teal-50/50 rounded-sm p-4">
              <p className="text-ink/50 text-xs">Total Income</p>
              <p className="font-semibold text-xl">{fmt(data.total_income)}</p>
            </div>
            <div className="border border-border rounded-sm p-4">
              <p className="text-ink/50 text-xs">Expenses</p>
              <p className="font-semibold text-xl">{fmt(data.expenses)}</p>
            </div>
            <div className="border border-teal-600 bg-teal-600/5 rounded-sm p-4">
              <p className="text-ink/50 text-xs">Grand Total</p>
              <p className="font-semibold text-xl text-teal-700">
                {fmt(data.grand_total)}
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">Due Totals</h4>
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th className="text-right">Amount Due</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>OP &amp; Direct Bill Due</td>
                    <td className="text-right">{fmt(data.due.op_direct_bill_due)}</td>
                  </tr>
                  <tr>
                    <td>OP Lab &amp; Radiology Due</td>
                    <td className="text-right">{fmt(data.due.op_lab_radiology_due)}</td>
                  </tr>
                  <tr>
                    <td>IP Bill Due</td>
                    <td className="text-right">{fmt(data.due.ip_bill_due)}</td>
                  </tr>
                  <tr>
                    <td>IP Lab &amp; Radiology Due</td>
                    <td className="text-right">{fmt(data.due.ip_lab_radiology_due)}</td>
                  </tr>
                  <tr className="font-semibold">
                    <td>Total Due</td>
                    <td className="text-right">{fmt(data.due.total_due)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Section>
  )
}