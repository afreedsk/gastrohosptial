import { useEffect, useState } from 'react'
import { Search, Eye } from 'lucide-react'
import api from '../../api/axios'
import { PageHeader, StatusBadge } from '../../components/PageHeader'

export default function OPReports() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [status, setStatus] = useState('')
  const [selectedReport, setSelectedReport] = useState(null)
  const [showModal, setShowModal] = useState(false)

  const fetchReports = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (startDate) params.append('start_date', startDate)
      if (endDate) params.append('end_date', endDate)
      if (status) params.append('status', status)
      const { data } = await api.get(`/lab-reports/op?${params.toString()}`)
      setReports(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [])

  const handleFilter = (e) => {
    e.preventDefault()
    fetchReports()
  }

  const resetFilter = () => {
    setSearch('')
    setStartDate('')
    setEndDate('')
    setStatus('')
    setTimeout(fetchReports, 0)
  }

  const viewReport = (report) => {
    setSelectedReport(report)
    setShowModal(true)
  }

  const updateStatus = async (id, newStatus) => {
    try {
      await api.patch(`/lab-reports/${id}/status`, { status: newStatus, table: 'op' })
      fetchReports()
      if (selectedReport) {
        setSelectedReport({ ...selectedReport, status: newStatus })
      }
    } catch (err) {
      alert('Failed to update status')
    }
  }

  return (
    <div>
      <PageHeader title="OP Lab Reports" subtitle="View and manage outpatient lab reports" />

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end mb-4">
        <div className="flex-1 min-w-[200px]">
          <label className="label">Search</label>
          <input className="input" placeholder="By test, patient, OPD No..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div>
          <label className="label">From</label>
          <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Verified">Verified</option>
          </select>
        </div>
        <button onClick={handleFilter} className="btn-primary flex items-center gap-2"><Search size={16} /> Apply</button>
        <button onClick={resetFilter} className="btn-secondary">Reset</button>
      </div>

      {loading && <div className="text-center py-4">Loading...</div>}
      {!loading && reports.length === 0 && <div className="text-center py-8 text-ink/50">No reports found.</div>}

      {!loading && reports.length > 0 && (
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>OPD No</th><th>Patient</th><th>MR No</th><th>Test Name</th>
                <th>Result</th><th>Normal Range</th><th>Status</th><th>Report Date</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(r => (
                <tr key={r.id}>
                  <td>{r.opd_reg_no}</td>
                  <td>{r.patient_name}</td>
                  <td>{r.mr_number}</td>
                  <td>{r.test_name}</td>
                  <td className="max-w-[150px] truncate">{r.result || '—'}</td>
                  <td>{r.normal_range || '—'}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>{r.report_date ? new Date(r.report_date).toLocaleDateString() : '—'}</td>
                  <td>
                    <button onClick={() => viewReport(r)} className="text-teal-600 hover:text-teal-800">
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Report Detail Modal */}
      {showModal && selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Report Details</h2>
              <button onClick={() => setShowModal(false)} className="text-ink/50 hover:text-ink text-2xl">&times;</button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="font-medium">Patient</label><p>{selectedReport.patient_name}</p></div>
                <div><label className="font-medium">MR No</label><p>{selectedReport.mr_number}</p></div>
                <div><label className="font-medium">OPD No</label><p>{selectedReport.opd_reg_no}</p></div>
                <div><label className="font-medium">Test Name</label><p>{selectedReport.test_name}</p></div>
                <div className="col-span-2"><label className="font-medium">Result</label><p>{selectedReport.result || 'Not available'}</p></div>
                <div className="col-span-2"><label className="font-medium">Normal Range</label><p>{selectedReport.normal_range || 'Not specified'}</p></div>
                <div><label className="font-medium">Unit</label><p>{selectedReport.unit || '—'}</p></div>
                <div><label className="font-medium">Status</label>
                  <select className="input mt-1" value={selectedReport.status} onChange={(e) => updateStatus(selectedReport.id, e.target.value)}>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Verified">Verified</option>
                  </select>
                </div>
                <div><label className="font-medium">Performed By</label><p>{selectedReport.performed_by_name || '—'}</p></div>
                <div><label className="font-medium">Verified By</label><p>{selectedReport.verified_by_name || '—'}</p></div>
                <div><label className="font-medium">Report Date</label><p>{selectedReport.report_date ? new Date(selectedReport.report_date).toLocaleDateString() : '—'}</p></div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setShowModal(false)} className="btn-secondary">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}