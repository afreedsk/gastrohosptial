import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import api from '../../api/axios'
import { PageHeader, Section, StatusBadge } from '../../components/PageHeader'

const CATEGORIES = {
  Patient: [
    { key: 'daily', label: 'Daily Registration', url: '/reports/patients/daily' },
    { key: 'monthly', label: 'Monthly Registration', url: '/reports/patients/monthly' },
    { key: 'doctor-wise', label: 'Doctor Wise Patients', url: '/reports/patients/doctor-wise' },
  ],
  Billing: [
    { key: 'daily-collection', label: 'Daily Collection', url: '/reports/billing/daily-collection' },
    { key: 'monthly-collection', label: 'Monthly Collection', url: '/reports/billing/monthly-collection' },
    { key: 'outstanding', label: 'Outstanding', url: '/reports/billing/outstanding' },
    { key: 'cancelled', label: 'Cancelled Bills', url: '/reports/billing/cancelled' },
    { key: 'refunds', label: 'Refund Report', url: '/reports/billing/refunds' },
  ],
  Lab: [
    { key: 'pending', label: 'Pending', url: '/reports/lab/pending' },
    { key: 'completed', label: 'Completed', url: '/reports/lab/completed' },
    { key: 'cancelled', label: 'Cancelled', url: '/reports/lab/cancelled' },
  ],
  Admission: [
    { key: 'current', label: 'Current IP', url: '/reports/admissions/current' },
    { key: 'discharged', label: 'Discharged', url: '/reports/admissions/discharged' },
    { key: 'transfers', label: 'Transfers', url: '/reports/admissions/transfers' },
    { key: 'occupancy', label: 'Occupancy', url: '/reports/admissions/occupancy' },
  ],
}

function toRows(data) {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    // flatten {op:[...], ip:[...]} style responses
    const arrays = Object.values(data).filter(Array.isArray)
    if (arrays.length) return arrays.flat()
    return [data] // single summary object
  }
  return []
}

export default function Reports() {
  const [category, setCategory] = useState('Patient')
  const [reportKey, setReportKey] = useState(CATEGORIES.Patient[0].key)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  const current = CATEGORIES[category].find((r) => r.key === reportKey) || CATEGORIES[category][0]

  useEffect(() => {
    setLoading(true)
    api.get(current.url).then((r) => setRows(toRows(r.data))).finally(() => setLoading(false))
  }, [category, reportKey])

  const columns = rows.length ? Object.keys(rows[0]).filter((k) => !['created_at'].includes(k) || true).slice(0, 8) : []

  const exportCsv = () => {
    if (!rows.length) return
    const cols = Object.keys(rows[0])
    const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => JSON.stringify(r[c] ?? '')).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${category}-${reportKey}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Operational and financial reports — export to CSV/Excel"
        action={
          <button onClick={exportCsv} className="btn-secondary flex items-center gap-2">
            <Download size={14} /> Export CSV
          </button>
        }
      />

      <div className="flex gap-2 mb-4">
        {Object.keys(CATEGORIES).map((c) => (
          <button key={c}
            onClick={() => { setCategory(c); setReportKey(CATEGORIES[c][0].key) }}
            className={`text-sm px-4 py-2 rounded-sm border ${category === c ? 'bg-teal-600 text-white border-teal-600' : 'border-border text-ink/60 bg-white'}`}>
            {c} Reports
          </button>
        ))}
      </div>

      <Section>
        <div className="flex gap-2 mb-4 flex-wrap">
          {CATEGORIES[category].map((r) => (
            <button key={r.key}
              onClick={() => setReportKey(r.key)}
              className={`text-xs px-3 py-1.5 rounded-full border ${reportKey === r.key ? 'bg-teal-50 border-teal-400 text-teal-700' : 'border-border text-ink/50'}`}>
              {r.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>{columns.map((c) => <th key={c}>{c.replace(/_/g, ' ')}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {columns.map((c) => (
                    <td key={c}>
                      {c === 'status' ? <StatusBadge status={row[c]} /> : String(row[c] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
              {!loading && !rows.length && (
                <tr><td colSpan={columns.length || 1} className="text-center text-ink/40 py-8">No data for this report</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}
