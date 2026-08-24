import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import api from '../../api/axios'

export default function IPLab() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (startDate) params.append('start_date', startDate)
      if (endDate) params.append('end_date', endDate)
      const { data } = await api.get(`/ip-lab?${params.toString()}`)
      setData(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line
  }, [])

  const handleFilter = (e) => {
    e.preventDefault()
    fetchData()
  }

  const resetFilter = () => {
    setSearch('')
    setStartDate('')
    setEndDate('')
    setTimeout(fetchData, 0)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="label">Search</label>
          <input
            className="input"
            placeholder="By item, patient, IP Reg No..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <label className="label">From</label>
          <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <button onClick={handleFilter} className="btn-primary flex items-center gap-2">
          <Search size={16} /> Filter
        </button>
        <button onClick={resetFilter} className="btn-secondary">Reset</button>
      </div>

      {loading && <div className="text-center py-4">Loading...</div>}

      {!loading && data.length === 0 && (
        <div className="text-center py-8 text-ink/50">No lab records found.</div>
      )}

      {!loading && data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink/5 border-b border-border">
              <tr>
                <th className="px-3 py-2 text-left">IP Reg No</th>
                <th className="px-3 py-2 text-left">Patient</th>
                <th className="px-3 py-2 text-left">Item</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Rate</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id} className="border-b border-border hover:bg-ink/5">
                  <td className="px-3 py-2">{row.ip_reg_no}</td>
                  <td className="px-3 py-2">{row.patient_name}</td>
                  <td className="px-3 py-2">{row.item_name}</td>
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
    </div>
  )
}