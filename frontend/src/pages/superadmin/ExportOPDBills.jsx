import { useState } from 'react'
import { Download, FileSpreadsheet, FileText, FileType } from 'lucide-react'
import api from '../../api/axios'

const today = () => new Date().toISOString().slice(0, 10)
const firstOfMonth = () => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

const BILL_TYPES = [
  { value: 'opd',       label: 'OPD Bills',       route: 'op-bills' },
  { value: 'lab',       label: 'Lab Bills',       route: 'lab-bills' },
  { value: 'radiology', label: 'Radiology Bills', route: 'radiology-bills' },
]

const FORMATS = [
  { value: 'xlsx', label: 'Excel (.xlsx)', Icon: FileSpreadsheet, mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  { value: 'csv',  label: 'CSV (.csv)',    Icon: FileType,        mime: 'text/csv' },
  { value: 'pdf',  label: 'PDF (.pdf)',    Icon: FileText,        mime: 'application/pdf' },
]

export default function ExportOPDBills() {
  const [billType, setBillType] = useState('opd')
  const [format, setFormat] = useState('xlsx')
  const [fromDate, setFromDate] = useState(firstOfMonth())
  const [toDate, setToDate] = useState(today())
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const handleDownload = async () => {
    setDownloading(true)
    setError(null)
    setSuccess(null)

    const cfg = BILL_TYPES.find((b) => b.value === billType)
    const fmt = FORMATS.find((f) => f.value === format)

    try {
      const res = await api.get(`/superadmin/export/${cfg.route}`, {
        params: { from: fromDate, to: toDate, format },
        responseType: 'blob',
      })

      const blob = new Blob([res.data], { type: fmt.mime })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${cfg.route}_${fromDate}_to_${toDate}.${format}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      setSuccess(`Downloaded ${cfg.label} as ${format.toUpperCase()} (${fromDate} → ${toDate})`)
    } catch (e) {
      // When responseType is 'blob', error responses also arrive as Blob —
      // decode to read the JSON error message the backend sent.
      let msg = e.message || 'Download failed'
      const data = e.response?.data
      if (data instanceof Blob) {
        try {
          const text = await data.text()
          const json = JSON.parse(text)
          msg = json.error || msg
        } catch { /* keep default msg */ }
      } else if (data?.error) {
        msg = data.error
      }
      setError(msg)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Export Bills</h3>
        <p className="text-sm text-ink/50">
          Download bills in Excel, CSV, or PDF for a date range.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="label">Bill Type</label>
          <select className="input" value={billType} onChange={(e) => setBillType(e.target.value)}>
            {BILL_TYPES.map((b) => (
              <option key={b.value} value={b.value}>{b.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">From</label>
          <input type="date" className="input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Format</label>
          <select className="input" value={format} onChange={(e) => setFormat(e.target.value)}>
            {FORMATS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          className="btn-primary flex items-center gap-2"
          onClick={handleDownload}
          disabled={downloading || !fromDate || !toDate}
        >
          {(() => {
            const Icon = FORMATS.find((f) => f.value === format).Icon
            return <Icon size={15} />
          })()}
          {downloading ? 'Preparing…' : 'Download'}
        </button>

        <div className="flex gap-2">
          {FORMATS.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFormat(value)}
              className={`px-3 py-1.5 rounded-sm border text-xs flex items-center gap-1.5 ${
                format === value
                  ? 'border-teal-600 bg-teal-50 text-teal-700'
                  : 'border-border text-ink/60 hover:border-teal-400'
              }`}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-sm px-3 py-2">
          {error}
        </div>
      )}
      {success && (
        <div className="text-sm text-teal-700 bg-teal-50 border border-teal-200 rounded-sm px-3 py-2">
          {success}
        </div>
      )}

      <p className="text-xs text-ink/40">
        Tip: CSV opens in Excel / Google Sheets. PDF is optimised for printing —
        it shows the business-critical columns only (bill no, date, patient, doctor, amounts, mode, status).
      </p>
    </div>
  )
}