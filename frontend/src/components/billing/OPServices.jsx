    import { useEffect, useState } from 'react'
import { Search, Plus } from 'lucide-react'
import api from '../../api/axios'
import CatalogPickerModal from '../registration/CatalogPickerModal'

export default function OPServices() {
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [data, setData] = useState([])
  const [patients, setPatients] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [showPicker, setShowPicker] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const searchPatients = async (q) => {
    if (!q.trim()) {
      setPatients([])
      return
    }
    try {
      const { data } = await api.get('/patients', { params: { search: q, limit: 10 } })
      setPatients(data)
    } catch (err) {
      console.error('Patient search failed:', err)
    }
  }

  const fetchServiceRecords = async (patientId) => {
    if (!patientId) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('patient_id', patientId)
      if (startDate) params.append('start_date', startDate)
      if (endDate) params.append('end_date', endDate)
      const { data } = await api.get(`/op-services?${params.toString()}`)
      setData(data)
    } catch (err) {
      console.error(err)
      setError('Failed to load service records')
    } finally {
      setLoading(false)
    }
  }

  const selectPatient = (patient) => {
    setSelectedPatient(patient)
    setSearchQuery(`${patient.name} — ${patient.phone}`)
    setPatients([])
    fetchServiceRecords(patient.id)
  }

  const applyFilters = () => {
    if (selectedPatient) fetchServiceRecords(selectedPatient.id)
  }

  const resetFilters = () => {
    setStartDate('')
    setEndDate('')
    if (selectedPatient) fetchServiceRecords(selectedPatient.id)
  }

  const handleAddServices = async (selectedList, total) => {
    if (!selectedPatient) {
      setError('Please select a patient first')
      return
    }
    try {
      const { data: registrations } = await api.get('/op-registrations', {
        params: { patient_id: selectedPatient.id, status: 'Active' }
      })
      if (!registrations || registrations.length === 0) {
        setError('Patient has no active OP registration')
        return
      }
      const registrationId = registrations[0].id

      const items = selectedList.map(item => ({
        service_name: item.service_name || item.name,
        quantity: item.quantity || 1,
        rate: item.rate || 0,
        amount: item.amount || (item.rate * (item.quantity || 1)) || 0,
      }))

      await api.post('/op-services', {
        op_registration_id: registrationId,
        items: items,
      })

      setSuccess(`${selectedList.length} service(s) added successfully`)
      setShowPicker(false)
      fetchServiceRecords(selectedPatient.id)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add services')
    }
  }

  useEffect(() => {
    if (selectedPatient) fetchServiceRecords(selectedPatient.id)
  }, [selectedPatient])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[250px] relative">
          <label className="label">Search Patient</label>
          <div className="relative">
            <input
              className="input w-full"
              placeholder="Search by name, MR, phone, or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                searchPatients(e.target.value)
              }}
            />
            {patients.length > 0 && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-border rounded-sm shadow-lg max-h-60 overflow-y-auto">
                {patients.map(p => (
                  <button
                    key={p.id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectPatient(p)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-teal-50 border-b border-border last:border-0"
                  >
                    <div className="flex justify-between">
                      <span className="font-medium">{p.name}</span>
                      <span className="text-ink/40 text-xs">{p.patient_uid}</span>
                    </div>
                    <p className="text-xs text-ink/50">{p.phone} · {p.gender} · Age {p.age ?? '—'}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="label">From</label>
          <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <button onClick={applyFilters} className="btn-primary flex items-center gap-2">
          <Search size={16} /> Apply
        </button>
        <button onClick={resetFilters} className="btn-secondary">Reset</button>
      </div>

      {error && <div className="text-sm text-danger-500 bg-danger-50 border border-danger-200 rounded-sm px-3 py-2">{error}</div>}
      {success && <div className="text-sm text-teal-700 bg-teal-50 border border-teal-100 rounded-sm px-3 py-2">{success}</div>}

      {selectedPatient && (
        <div className="flex justify-between items-center">
          <div>
            <span className="font-medium">{selectedPatient.name}</span>
            <span className="ml-2 text-sm text-ink/50">MR: {selectedPatient.patient_uid}</span>
            <span className="ml-2 text-sm text-ink/50">Phone: {selectedPatient.phone}</span>
          </div>
          <button onClick={() => setShowPicker(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Services
          </button>
        </div>
      )}

      {loading && <div className="text-center py-4">Loading...</div>}

      {!loading && selectedPatient && data.length === 0 && (
        <div className="text-center py-8 text-ink/50">No service records found for this patient.</div>
      )}

      {!loading && data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink/5 border-b border-border">
              <tr>
                <th className="px-3 py-2 text-left">OPD Reg No</th>
                <th className="px-3 py-2 text-left">Service</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Rate</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id} className="border-b border-border hover:bg-ink/5">
                  <td className="px-3 py-2">{row.opd_reg_no}</td>
                  <td className="px-3 py-2">{row.service_name}</td>
                  <td className="px-3 py-2 text-right">{row.quantity}</td>
                  <td className="px-3 py-2 text-right">{row.rate}</td>
                  <td className="px-3 py-2 text-right font-medium">{row.amount}</td>
                  <td className="px-3 py-2">{new Date(row.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!selectedPatient && (
        <div className="text-center py-8 text-ink/50">Search for a patient to view their service records.</div>
      )}

      {showPicker && (
        <CatalogPickerModal
          title="Service Items"
          endpoint="/op-services/catalog"
          groupField="service_type"
          nameField="name"
          onApply={handleAddServices}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}