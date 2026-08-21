import { useState } from 'react'
import { IndianRupee, Plus, X } from 'lucide-react'
import api from '../../api/axios'
import { PageHeader } from '../../components/PageHeader'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function formatMoney(v) {
  return `₹${Number(v ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const CARD_FIELDS = ['cash', 'card', 'upi', 'bank', 'total']
const FIELD_LABELS = { cash: 'CASH', card: 'CARD', upi: 'UPI', bank: 'BANK', total: 'TOTAL' }

function MoneyCard({ title, tone = 'blue', values, fields = CARD_FIELDS, extraRow }) {
  const iconBg = tone === 'red' ? 'bg-danger-500' : 'bg-sky-500'
  return (
    <div className="card p-4 flex gap-3">
      <div className={`w-11 h-11 rounded-sm flex items-center justify-center text-white shrink-0 ${iconBg}`}>
        <IndianRupee size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold tracking-wide text-ink/40 uppercase">{title}</p>
        <div className="mt-1.5 space-y-0.5">
          {fields.map((f) => (
            <div key={f} className="flex items-center justify-between text-sm gap-3">
              <span className="text-teal-600 text-xs font-medium">{FIELD_LABELS[f]}</span>
              <span className={f === 'total' ? 'font-semibold' : ''}>
                {values ? formatMoney(values[f]) : '—'}
              </span>
            </div>
          ))}
          {extraRow && (
            <div className="flex items-center justify-between text-sm gap-3 pt-1 mt-1 border-t border-border">
              <span className="text-amber-500 text-xs font-medium">{extraRow.label}</span>
              <span className="font-semibold text-amber-500">
                {values ? formatMoney(values[extraRow.key]) : '—'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StockWidget({ title, accentClass, items, onDismiss }) {
  const [open, setOpen] = useState(false)
  if (items === null) return null // dismissed by the user for this session

  return (
    <div className={`card border-l-4 ${accentClass}`}>
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-sm font-semibold">{title}</p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="text-ink/40 hover:text-teal-600"
            aria-label={open ? 'Collapse' : 'Expand'}
          >
            <Plus size={16} className={`transition-transform ${open ? 'rotate-45' : ''}`} />
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="text-ink/40 hover:text-danger-500"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      {open && (
        <div className="px-4 pb-3 border-t border-border">
          {items.length === 0 ? (
            <p className="text-xs text-ink/40 pt-3">No items</p>
          ) : (
            <ul className="pt-3 space-y-1 text-sm">
              {items.map((it, i) => (
                <li key={i} className="flex items-center justify-between">
                  <span className="truncate">{it.name}</span>
                  <span className="text-ink/50 shrink-0 ml-3">{it.qty} {it.unit || ''}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export default function PharmacyDashboard() {
  const [startDate, setStartDate] = useState(todayISO())
  const [endDate, setEndDate] = useState(todayISO())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [stockAlerts, setStockAlerts] = useState({ nonMovable: [], shortExpiry: [], minimumStock: [] })

  const getData = async () => {
    setLoading(true)
    setError('')
    try {
      // Expected response shape from the backend (route not built yet — see
      // the note above about needing your pharmacy schema first):
      // {
      //   op_sales: { cash, card, upi, bank, total }, ip_sales: {...}, direct_sales: {...},
      //   op_sale_returns: {...}, ip_sale_returns: {...}, direct_sale_returns: {...},
      //   total_collection: {...}, pharmacy_expenses: { total },
      //   grand_total: { cash, card, upi, bank, total, due_total },
      //   stock_alerts: {
      //     non_movable: [{ name, qty, unit }], short_expiry: [...], minimum_stock: [...]
      //   }
      // }
      const { data: res } = await api.get('/pharmacy/dashboard-summary', {
        params: { start_date: startDate, end_date: endDate },
      })
      setData(res)
      setStockAlerts({
        nonMovable: res.stock_alerts?.non_movable ?? [],
        shortExpiry: res.stock_alerts?.short_expiry ?? [],
        minimumStock: res.stock_alerts?.minimum_stock ?? [],
      })
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => window.print()

  const handleExport = () => {
    if (!data) {
      setError('Click Get Data first, then Export')
      return
    }
    const rows = [['Section', 'Cash', 'Card', 'UPI', 'Bank', 'Total']]
    const sections = [
      ['OP Sales', data.op_sales], ['IP Sales', data.ip_sales], ['Direct Sales', data.direct_sales],
      ['OP Sale Returns', data.op_sale_returns], ['IP Sale Returns', data.ip_sale_returns],
      ['Direct Sale Returns', data.direct_sale_returns],
      ['Total Collection', data.total_collection], ['Grand Total', data.grand_total],
    ]
    sections.forEach(([label, v]) => {
      if (!v) return
      rows.push([label, v.cash ?? 0, v.card ?? 0, v.upi ?? 0, v.bank ?? 0, v.total ?? 0])
    })
    if (data.pharmacy_expenses) rows.push(['Pharmacy Expenses', '', '', '', '', data.pharmacy_expenses.total ?? 0])
    if (data.grand_total?.due_total != null) rows.push(['Due Total', '', '', '', '', data.grand_total.due_total])

    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pharmacy-summary_${startDate}_to_${endDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <PageHeader title="Pharmacy Dashboard" subtitle="Inventory, sales, and stock overview" />

      <div className="card p-4 flex flex-wrap items-end gap-4 mb-6">
        <div>
          <label className="label">Start Date</label>
          <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="label">End Date</label>
          <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <button type="button" onClick={getData} disabled={loading} className="btn-primary disabled:opacity-50">
          {loading ? 'Loading…' : 'Get Data'}
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className="px-4 py-2 rounded-sm text-sm font-medium text-white bg-blue-500 hover:bg-blue-600"
        >
          Print
        </button>
        <button
          type="button"
          onClick={handleExport}
          className="px-4 py-2 rounded-sm text-sm font-medium text-white bg-danger-500 hover:bg-danger-400"
        >
          Export
        </button>
        {!data && !loading && !error && (
          <p className="text-xs text-danger-500 w-full">Click on Get Data to show amounts</p>
        )}
        {error && <p className="text-xs text-danger-500 w-full">{error}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MoneyCard title="OP Sales" values={data?.op_sales} />
        <MoneyCard title="IP Sales" values={data?.ip_sales} />
        <MoneyCard title="Direct Sales" values={data?.direct_sales} />

        <MoneyCard title="OP Sale Returns" tone="red" values={data?.op_sale_returns} />
        <MoneyCard title="IP Sale Returns" tone="red" values={data?.ip_sale_returns} />
        <MoneyCard title="Direct Sale Returns" tone="red" values={data?.direct_sale_returns} />

        <MoneyCard title="Total Collection" values={data?.total_collection} />
        <MoneyCard title="Pharmacy Expenses" values={data?.pharmacy_expenses} fields={['total']} />
        <MoneyCard title="Grand Total" values={data?.grand_total} extraRow={{ label: 'DUE TOTAL', key: 'due_total' }} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <StockWidget
          title="Non - Movable & Fast Moving Stock"
          accentClass="border-blue-400"
          items={stockAlerts.nonMovable}
          onDismiss={() => setStockAlerts((s) => ({ ...s, nonMovable: null }))}
        />
        <StockWidget
          title="Short Expiry Stock"
          accentClass="border-teal-400"
          items={stockAlerts.shortExpiry}
          onDismiss={() => setStockAlerts((s) => ({ ...s, shortExpiry: null }))}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <StockWidget
          title="Minimum Stock"
          accentClass="border-amber-400"
          items={stockAlerts.minimumStock}
          onDismiss={() => setStockAlerts((s) => ({ ...s, minimumStock: null }))}
        />
      </div>
    </div>
  )
}