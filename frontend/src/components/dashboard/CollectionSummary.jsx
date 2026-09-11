import { useState, Fragment } from 'react'
import {
  Printer, Download, Search as SearchIcon, Users, Stethoscope,
  MessageSquare, Footprints, Microscope, Radio, UserPlus,
  BedDouble, IndianRupee,
} from 'lucide-react'
import api from '../../api/axios'
import { Section } from '../PageHeader'

const today = () => new Date().toISOString().slice(0, 10)

const EMPTY_BUCKET = { cash: 0, card: 0, upi: 0, bank: 0, total: 0, count: 0 }

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// Color themes matching the reference layout: soft pastel backgrounds with
// a solid-colored icon chip on the left.
const THEME = {
  red:    { bg: 'bg-red-50',     border: 'border-red-100',     chip: 'bg-red-400' },
  green:  { bg: 'bg-emerald-50', border: 'border-emerald-100', chip: 'bg-emerald-500' },
  orange: { bg: 'bg-amber-50',   border: 'border-amber-100',   chip: 'bg-amber-400' },
  blue:   { bg: 'bg-sky-50',     border: 'border-sky-100',     chip: 'bg-sky-400' },
  navy:   { bg: 'bg-blue-50',    border: 'border-blue-100',    chip: 'bg-blue-600' },
}

function StatCard({ icon: Icon, theme = 'blue', title, value, sub }) {
  const t = THEME[theme]
  return (
    <div className={`flex items-stretch rounded-sm border ${t.border} ${t.bg} overflow-hidden`}>
      <div className={`flex items-center justify-center w-14 shrink-0 ${t.chip}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div className="p-3 flex flex-col justify-center">
        <p className="text-[11px] tracking-wide text-ink/50 uppercase">{title}</p>
        <p className="text-lg font-semibold text-ink leading-tight">{value}</p>
        {sub && <p className="text-[11px] text-ink/40">{sub}</p>}
      </div>
    </div>
  )
}

function CollectionCard({ icon: Icon, theme = 'blue', title, bucket, refund }) {
  const t = THEME[theme]
  const b = bucket || EMPTY_BUCKET
  return (
    <div className={`flex items-stretch rounded-sm border ${t.border} ${t.bg} overflow-hidden relative`}>
      <div className={`flex items-center justify-center w-14 shrink-0 ${t.chip}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div className="p-3 flex-1 text-xs">
        <p className="uppercase tracking-wide text-ink/50 text-[11px] mb-1">
          {title} — {b.count ?? 0}
        </p>
        <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
          <span className="text-ink/50">CASH</span><span className="text-right font-medium">{fmt(b.cash)}</span>
          <span className="text-ink/50">CARD</span><span className="text-right font-medium">{fmt(b.card)}</span>
          <span className="text-ink/50">UPI</span><span className="text-right font-medium">{fmt(b.upi)}</span>
          <span className="text-ink/50">BANK</span><span className="text-right font-medium">{fmt(b.bank)}</span>
          <span className="text-ink/60 font-semibold border-t border-ink/10 pt-0.5 mt-0.5">TOTAL</span>
          <span className="text-right font-semibold border-t border-ink/10 pt-0.5 mt-0.5">{fmt(b.total)}</span>
        </div>
      </div>
      {refund ? (
        <div className="absolute top-2 right-2 bg-amber-100 text-amber-700 text-[10px] font-medium px-2 py-0.5 rounded-sm">
          Refunds: {refund}
        </div>
      ) : null}
    </div>
  )
}

function MoneyCard({ theme, title, value }) {
  const t = THEME[theme]
  return (
    <div className={`flex items-stretch rounded-sm border ${t.border} ${t.bg} overflow-hidden`}>
      <div className={`flex items-center justify-center w-14 shrink-0 ${t.chip}`}>
        <IndianRupee size={22} className="text-white" />
      </div>
      <div className="p-3 flex flex-col justify-center text-xs">
        <p className="uppercase tracking-wide text-ink/50 text-[11px]">{title}</p>
        <p className="text-lg font-semibold text-ink">{fmt(value)}</p>
      </div>
    </div>
  )
}

function DueCard({ due }) {
  const rows = [
    ['OP & DIRECT BILL DUE', due.op_direct_bill_due],
    ['OP LAB & RADIOLOGY DUE', due.op_lab_radiology_due],
    ['IP BILL DUE', due.ip_bill_due],
    ['IP LAB & RADIOLOGY DUE', due.ip_lab_radiology_due],
  ]
  return (
    <div className="flex items-stretch rounded-sm border border-blue-100 bg-blue-50 overflow-hidden">
      <div className="flex items-center justify-center w-14 shrink-0 bg-blue-600">
        <IndianRupee size={22} className="text-white" />
      </div>
      <div className="p-3 flex-1 text-xs">
        <p className="uppercase tracking-wide text-ink/50 text-[11px] mb-1">Due Total</p>
        <div className="grid grid-cols-[1fr_auto] gap-y-0.5">
          {rows.map(([label, val]) => (
            <Fragment key={label}>
              <span className="text-ink/60">{label}</span>
              <span className="text-right font-medium">{fmt(val)}</span>
            </Fragment>
          ))}
          <span className="text-ink/60 font-semibold border-t border-ink/10 pt-0.5 mt-0.5">TOTAL</span>
          <span className="text-right font-semibold border-t border-ink/10 pt-0.5 mt-0.5">{fmt(due.total_due)}</span>
        </div>
      </div>
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
    const lines = [['Category', 'Count', 'Cash', 'Card', 'UPI', 'Bank', 'Total']]
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
      lines.push([label, x.count ?? 0, x.cash, x.card, x.upi, x.bank, x.total])
    })
    lines.push([])
    lines.push(['Total Income', '', '', '', '', '', data.total_income])
    lines.push(['Expenses', '', '', '', '', '', data.expenses])
    lines.push(['Grand Total', '', '', '', '', '', data.grand_total])
    lines.push([])
    lines.push(['Due - OP & Direct Bill', '', '', '', '', '', data.due.op_direct_bill_due])
    lines.push(['Due - OP Lab & Radiology', '', '', '', '', '', data.due.op_lab_radiology_due])
    lines.push(['Due - IP Bill', '', '', '', '', '', data.due.ip_bill_due])
    lines.push(['Due - IP Lab & Radiology', '', '', '', '', '', data.due.ip_lab_radiology_due])
    lines.push(['Due - Total', '', '', '', '', '', data.due.total_due])

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
          <SearchIcon size={15} /> {loading ? 'Loading…' : 'Get Data'}
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
          Choose a date range and click Get Data to load collection data.
        </p>
      )}

      {data && (
        <div className="space-y-4">
          {/* ---- top meta row ---- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard icon={Users} theme="red" title="Users" value={data.meta.users} />
            <StatCard icon={Stethoscope} theme="green" title="Doctors" value={data.meta.doctors} />
            <StatCard
              icon={MessageSquare}
              theme="orange"
              title="Last Updated / SMS"
              value={new Date(data.meta.last_updated).toLocaleString()}
              sub={`SMS Remaining: ${data.meta.sms_remaining ?? '0'}`}
            />
          </div>

          {/* ---- OP row ---- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CollectionCard icon={Footprints} theme="blue" title="OP Billing" bucket={data.op_billing} />
            <CollectionCard
              icon={Microscope} theme="blue" title="OP Diagnostics"
              bucket={data.op_diagnostics} refund={data.op_refund ? fmt(data.op_refund) : 0}
            />
            <CollectionCard
              icon={Radio} theme="blue" title="OP Radiology"
              bucket={data.op_radiology} refund={data.op_refund ? fmt(data.op_refund) : 0}
            />
          </div>

          {/* ---- Direct row ---- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CollectionCard icon={UserPlus} theme="green" title="Direct Patients" bucket={data.direct_patients} />
            <CollectionCard icon={Microscope} theme="green" title="Direct Diagnostics" bucket={data.direct_diagnostics} />
            <CollectionCard icon={Radio} theme="green" title="Direct Radiology" bucket={data.direct_radiology} />
          </div>

          {/* ---- IP row ---- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CollectionCard icon={BedDouble} theme="navy" title="IP Income" bucket={data.ip_income} />
            <CollectionCard
              icon={Microscope} theme="navy" title="IP Diagnostics"
              bucket={data.ip_diagnostics} refund={data.ip_refund ? fmt(data.ip_refund) : 0}
            />
            <CollectionCard
              icon={Radio} theme="navy" title="IP Radiology"
              bucket={data.ip_radiology} refund={data.ip_refund ? fmt(data.ip_refund) : 0}
            />
          </div>

          {/* ---- totals + due row ---- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MoneyCard theme="red" title="Total Income" value={data.total_income} />
            <MoneyCard theme="blue" title="Expenses" value={data.expenses} />
            <MoneyCard theme="navy" title="Grand Total" value={data.grand_total} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DueCard due={data.due} />
          </div>
        </div>
      )}
    </Section>
  )
}