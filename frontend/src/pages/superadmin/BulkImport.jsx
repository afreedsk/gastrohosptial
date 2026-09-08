import { useState } from 'react'
import { Upload, Download } from 'lucide-react'
import api from '../../api/axios'
import { PageHeader } from '../../components/PageHeader'

// ----- helper: parse a CSV line respecting quotes -----
function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++ // skip escaped quote
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

export default function BulkImport() {
  const [mode, setMode] = useState('op')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const getEndpoints = () => {
    if (mode === 'op') {
      return { import: '/superadmin/op-import', export: '/superadmin/op-export' }
    } else {
      return { import: '/superadmin/lab-import', export: '/superadmin/lab-export' }
    }
  }

  const getColumnDescription = () => {
    if (mode === 'op') {
      return 'CreatedAt, Bill.No, MR Number, Patient Reg No, Patient Name, Phone, Age/Gender, DOB, Area, Doctor Name, Date, Service, Cash, Card, UPI, Bank, Total, Referral, MLC Patient, MLC Number, Remarks'
    } else {
      return 'Date, MR Number, Patient Reg.No, Patient Name, Gender, Age, Phone, Doctor Name, Invoice No, Investigations, Ref Amount, Total Amount, Discount, Due Discount, BillAmount, PaidAmount, Due Amount, Pay Mode, User Name, Referral Type, Referral Doctor'
    }
  }

  const getExportFilename = () => {
    const prefix = mode === 'op' ? 'OP_Export' : 'Lab_Export'
    return `${prefix}_${new Date().toISOString().slice(0, 10)}.csv`
  }

  const handleFileChange = (e) => {
    const f = e.target.files[0]
    if (f) setFile(f)
  }

  const handleUpload = async () => {
    if (!file) return alert('Please select a file')
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      if (lines.length < 2) throw new Error('File must have a header row and data rows')

      const headers = parseCSVLine(lines[0])
      const rows = lines.slice(1).map(line => {
        const values = parseCSVLine(line)
        const obj = {}
        headers.forEach((h, i) => { obj[h] = values[i] || '' })
        return obj
      })

      if (!rows.length) throw new Error('No data rows found')

      const { import: importUrl } = getEndpoints()
      const { data } = await api.post(importUrl, rows)
      setResult(data)
      setFile(null)
      document.getElementById('fileInput').value = ''
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const { export: exportUrl } = getEndpoints()
      const { data } = await api.get(exportUrl)
      if (!data.length) return alert('No data to export')
      const headers = Object.keys(data[0])
      const rows = data.map(row =>
        headers.map(key => {
          const val = row[key] ?? ''
          const str = String(val).replace(/"/g, '""')
          return /[,"\n]/.test(str) ? `"${str}"` : str
        }).join(',')
      )
      const csv = [headers.join(','), ...rows].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = getExportFilename()
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError('Export failed: ' + (err.response?.data?.error || err.message))
    }
  }

  const switchMode = (newMode) => {
    if (newMode === mode) return
    setMode(newMode)
    setFile(null)
    setResult(null)
    setError('')
    const input = document.getElementById('fileInput')
    if (input) input.value = ''
  }

  return (
    <div>
      <PageHeader title="Bulk Import / Export" subtitle="Import or export OP / Lab billing data" />

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-4 border-b border-border pb-2">
        <button
          onClick={() => switchMode('op')}
          className={`px-4 py-2 rounded-sm font-medium ${mode === 'op' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-ink/70 hover:bg-gray-200'}`}
        >
          OP Bills
        </button>
        <button
          onClick={() => switchMode('lab')}
          className={`px-4 py-2 rounded-sm font-medium ${mode === 'lab' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-ink/70 hover:bg-gray-200'}`}
        >
          Lab Bills
        </button>
      </div>

      {error && <div className="text-sm text-danger-500 bg-danger-50 border border-danger-200 rounded-sm px-3 py-2 mb-4">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Import Section */}
        <div className="border border-border rounded-sm p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Upload size={20} /> Import {mode === 'op' ? 'OP' : 'Lab'} Data
          </h2>
          <p className="text-sm text-ink/60 mb-4">
            Upload a CSV file with columns: <br />
            <span className="font-mono text-xs">{getColumnDescription()}</span>
            <br />
            <span className="text-danger-500">⚠️ Fields with commas must be quoted.</span>
          </p>
          <div className="mb-4">
            <input
              id="fileInput"
              type="file"
              accept=".csv,.tsv,.txt"
              onChange={handleFileChange}
              className="block w-full text-sm text-ink/60 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
            />
            {file && <p className="mt-2 text-sm text-ink/70">Selected: {file.name}</p>}
          </div>
          <button
            onClick={handleUpload}
            disabled={loading || !file}
            className="btn-primary flex items-center gap-2"
          >
            <Upload size={16} /> {loading ? 'Importing...' : 'Import'}
          </button>
          {result && (
            <div className="mt-4 p-3 bg-teal-50 border border-teal-100 rounded-sm">
              <p className="text-sm text-teal-700">Imported: {result.imported} bills</p>
              {result.errors && result.errors.length > 0 && (
                <div className="mt-2 text-sm text-danger-500">
                  <p>Errors ({result.errors.length}):</p>
                  <ul className="list-disc pl-4 max-h-40 overflow-y-auto">
                    {result.errors.slice(0, 20).map((e, i) => <li key={i}>{e}</li>)}
                    {result.errors.length > 20 && <li>... and {result.errors.length - 20} more</li>}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Export Section */}
        <div className="border border-border rounded-sm p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Download size={20} /> Export {mode === 'op' ? 'OP' : 'Lab'} Data
          </h2>
          <p className="text-sm text-ink/60 mb-4">
            Download all {mode === 'op' ? 'OP' : 'lab'} billing data in CSV format.
          </p>
          <button onClick={handleExport} className="btn-primary flex items-center gap-2">
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>
    </div>
  )
}