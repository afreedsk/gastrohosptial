import { useState } from 'react'
import { Upload, Download, FileSpreadsheet, X } from 'lucide-react'
import api from '../../api/axios'
import { PageHeader } from '../../components/PageHeader'

export default function BulkImport() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

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
      // Parse CSV (assuming comma separated, with headers)
      const lines = text.split('\n').filter(line => line.trim())
      const headers = lines[0].split(',').map(h => h.trim())
      const rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim())
        const obj = {}
        headers.forEach((h, i) => { obj[h] = values[i] || '' })
        return obj
      })
      if (!rows.length) throw new Error('No data rows found')
      const { data } = await api.post('/superadmin/op-import', rows)
      setResult(data)
      setFile(null)
      // Reset file input
      document.getElementById('fileInput').value = ''
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const { data } = await api.get('/superadmin/op-export')
      if (!data.length) return alert('No data to export')
      const headers = Object.keys(data[0])
      const rows = data.map(row => headers.map(key => `"${(row[key] ?? '').replace(/"/g, '""')}"`).join(','))
      const csv = [headers.join(','), ...rows].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `OP_Export_${new Date().toISOString().slice(0,10)}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError('Export failed: ' + (err.response?.data?.error || err.message))
    }
  }

  return (
    <div>
      <PageHeader title="Bulk Import / Export" subtitle="Import or export OP billing data" />

      {error && <div className="text-sm text-danger-500 bg-danger-50 border border-danger-200 rounded-sm px-3 py-2 mb-4">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Import Section */}
        <div className="border border-border rounded-sm p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Upload size={20} /> Import OP Data
          </h2>
          <p className="text-sm text-ink/60 mb-4">
            Upload a CSV file with columns: CreatedAt, Bill.No, MR Number, Patient Reg No, Patient Name, Phone, Age/Gender, DOB, Area, Doctor Name, Date, Service, Cash, Card, UPI, Bank, Total, Referral, MLC Patient, MLC Number, Remarks.
          </p>
          <div className="mb-4">
            <input
              id="fileInput"
              type="file"
              accept=".csv"
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
                  <p>Errors:</p>
                  <ul className="list-disc pl-4">
                    {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Export Section */}
        <div className="border border-border rounded-sm p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Download size={20} /> Export OP Data
          </h2>
          <p className="text-sm text-ink/60 mb-4">
            Download all OP billing data in CSV format with the same columns as import.
          </p>
          <button
            onClick={handleExport}
            className="btn-primary flex items-center gap-2"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>
    </div>
  )
}