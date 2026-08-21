import { useMemo, useState } from 'react'
import { HelpCircle, Home, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import api from '../../api/axios'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function ReportBreadcrumb({ trail }) {
  return (
    <div className="flex items-center gap-2 text-sm text-ink/50 mb-4 pb-3 border-b border-border">
      <span className="flex items-center gap-1 text-teal-600"><HelpCircle size={14} /> Help</span>
      <span className="text-ink/30">/</span>
      <span className="flex items-center gap-1 text-teal-600"><Home size={14} /> Home</span>
      {trail.map((t, i) => (
        <span key={i} className="flex items-center gap-2">
          <span className="text-ink/30">/</span>
          <span className={i === trail.length - 1 ? 'text-ink/70 font-medium' : 'text-teal-600'}>{t}</span>
        </span>
      ))}
    </div>
  )
}

/**
 * Generic report list page: date-range filter + "Get In Detail" button,
 * optional "Show Discharged Patients" toggle, a search box, a table with
 * caller-supplied columns, and client-side pagination/search over whatever
 * the API returned for the selected date range.
 *
 * Props:
 *  - breadcrumbTrail: string[] — e.g. ['Reports', 'Inpatient Lab Report']
 *  - fetchUrl: string — GET endpoint, called with { start_date, end_date, show_discharged? }
 *  - columns: [{ key, label, render?(row) }]
 *  - rowActions?(row): [{ icon, label, onClick }] — rendered as an actions column when provided
 *  - showDischargedToggle?: boolean
 *  - searchKeys?: string[] — row fields checked against the search box (default below)
 *  - emptyText?: string
 */
export default function ReportListPage({
  breadcrumbTrail,
  fetchUrl,
  columns,
  rowActions,
  showDischargedToggle = false,
  searchPlaceholder = 'Reg/Name/Phone/Doctor',
  searchKeys = ['mr_number', 'patient_reg_no', 'name', 'contact', 'doctor_name'],
  emptyText = 'No billing details available.',
  pageSize = 10,
}) {
  const [startDate, setStartDate] = useState(todayISO())
  const [endDate, setEndDate] = useState(todayISO())
  const [showDischarged, setShowDischarged] = useState(false)
  const [rows, setRows] = useState(null) // null = not fetched yet
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const getDetail = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get(fetchUrl, {
        params: {
          start_date: startDate,
          end_date: endDate,
          ...(showDischargedToggle ? { show_discharged: showDischarged ? 1 : 0 } : {}),
        },
      })
      setRows(Array.isArray(data) ? data : [])
      setPage(1)
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load report')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    if (!rows) return []
    if (!search.trim()) return rows
    const q = search.trim().toLowerCase()
    return rows.filter((r) => searchKeys.some((k) => String(r[k] ?? '').toLowerCase().includes(q)))
  }, [rows, search, searchKeys])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize)
  const colSpan = columns.length + (rowActions ? 1 : 0)

  return (
    <div>
      <ReportBreadcrumb trail={breadcrumbTrail} />

      <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="label">Start Date</label>
            <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="label">End Date</label>
            <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <button type="button" onClick={getDetail} disabled={loading} className="btn-primary disabled:opacity-50">
            {loading ? 'Loading…' : 'Get In Detail'}
          </button>
          {showDischargedToggle && (
            <label className="flex items-center gap-2 text-sm text-ink/60 pb-2">
              <input
                type="checkbox"
                checked={showDischarged}
                onChange={(e) => setShowDischarged(e.target.checked)}
              />
              Show Discharged Patients
            </label>
          )}
        </div>
        <div>
          <label className="label">Search</label>
          <input
            className="input w-64"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
      </div>

      {error && (
        <div className="text-sm text-danger-500 bg-danger-400/10 border border-danger-400/30 rounded-sm px-3 py-2 mb-4">
          {error}
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-teal-600 text-white text-left">
              {columns.map((c) => (
                <th key={c.key} className="px-3 py-2 font-medium whitespace-nowrap">{c.label}</th>
              ))}
              {rowActions && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody>
            {rows === null ? (
              <tr>
                <td colSpan={colSpan} className="px-3 py-6 text-center text-ink/40">
                  Click "Get In Detail" to load this report
                </td>
              </tr>
            ) : pageRows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-3 py-6 text-center text-ink/40">{emptyText}</td>
              </tr>
            ) : (
              pageRows.map((row, i) => (
                <tr key={row.id ?? i} className="odd:bg-white even:bg-ink/[0.02] border-t border-border align-top">
                  {columns.map((c) => (
                    <td key={c.key} className="px-3 py-2">{c.render ? c.render(row) : (row[c.key] ?? '—')}</td>
                  ))}
                  {rowActions && (
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {rowActions(row).map((action, ai) => (
                          <button
                            key={ai}
                            type="button"
                            onClick={action.onClick}
                            title={action.label}
                            className="text-teal-600 hover:text-teal-700"
                          >
                            {action.icon}
                          </button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {rows !== null && (
        <div className="flex items-center justify-between mt-3 text-sm text-ink/50">
          <span>
            Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, filtered.length)} of {filtered.length} entries
          </span>
          <div className="flex items-center gap-1">
            <button type="button" disabled={page <= 1} onClick={() => setPage(1)} className="p-1 disabled:opacity-30">
              <ChevronsLeft size={16} />
            </button>
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-1 disabled:opacity-30">
              <ChevronLeft size={16} />
            </button>
            <span className="px-2">{page}</span>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="p-1 disabled:opacity-30">
              <ChevronRight size={16} />
            </button>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage(totalPages)} className="p-1 disabled:opacity-30">
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}