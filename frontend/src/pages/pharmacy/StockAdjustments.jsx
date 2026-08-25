import { useEffect, useState } from 'react'
import { Plus, Search, Edit, Trash2, X, Eye } from 'lucide-react'
import api from '../../api/axios'
import { PageHeader } from '../../components/PageHeader'

export default function StockAdjustments() {
  const [adjustments, setAdjustments] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (startDate) params.append('start_date', startDate)
      if (endDate) params.append('end_date', endDate)
      const { data } = await api.get(`/stock-adjustments?${params.toString()}`)
      setAdjustments(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleFilter = () => fetchData()
  const resetFilter = () => {
    setSearch('')
    setStartDate('')
    setEndDate('')
    setTimeout(fetchData, 0)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this adjustment?')) return
    try {
      await api.delete(`/stock-adjustments/${id}`)
      fetchData()
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed')
    }
  }

  return (
    <div>
      <PageHeader title="Stock Adjustments" subtitle="Manage inventory adjustments" />
      
      <div className="flex flex-wrap gap-4 items-end mb-4">
        <div className="flex-1 min-w-[200px]">
          <label className="label">Search</label>
          <input className="input" placeholder="By item, batch, adjustment no..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div>
          <label className="label">From</label>
          <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <button onClick={handleFilter} className="btn-primary flex items-center gap-2"><Search size={16} /> Filter</button>
        <button onClick={resetFilter} className="btn-secondary">Reset</button>
        <button onClick={() => { setEditingId(null); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Adjustment
        </button>
      </div>

      {loading && <div className="text-center py-4">Loading...</div>}
      {!loading && adjustments.length === 0 && <div className="text-center py-8 text-ink/50">No adjustments found.</div>}

      {!loading && adjustments.length > 0 && (
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Adj No</th><th>Date</th><th>Item</th><th>Batch</th><th>Exp</th>
                <th>Qty</th><th>MRP</th><th>Rate</th><th>Eff Rate</th><th>Tax%</th>
                <th>GRN No</th><th>Supplier</th><th>Reason</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.map(a => (
                <tr key={a.id}>
                  <td>{a.adjustment_no}</td>
                  <td>{a.adjustment_date}</td>
                  <td>{a.item_name}</td>
                  <td>{a.batch_no || '—'}</td>
                  <td>{a.exp_date || '—'}</td>
                  <td>{a.quantity}</td>
                  <td>{a.mrp}</td>
                  <td>{a.rate}</td>
                  <td>{a.eff_rate}</td>
                  <td>{a.tax_percent}</td>
                  <td>{a.grn_no || '—'}</td>
                  <td>{a.supplier_name || '—'}</td>
                  <td>{a.reason || '—'}</td>
                  <td><span className={`px-2 py-0.5 text-xs rounded-full ${a.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{a.status}</span></td>
                  <td className="flex gap-1">
                    <button onClick={() => { setEditingId(a.id); setShowModal(true); }} className="text-indigo-600 hover:text-indigo-800"><Eye size={16} /></button>
                    <button onClick={() => handleDelete(a.id)} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && <StockAdjustmentModal adjustmentId={editingId} onClose={() => { setShowModal(false); setEditingId(null); fetchData(); }} />}
    </div>
  )
}

// ============================================================
// Stock Adjustment Modal
// ============================================================
function StockAdjustmentModal({ adjustmentId, onClose }) {
  const [form, setForm] = useState({
    adjustment_date: new Date().toISOString().slice(0,10),
    item_id: '',
    batch_no: '',
    exp_date: '',
    quantity: 0,
    mrp: 0,
    rate: 0,
    eff_rate: 0,
    tax_percent: 0,
    grn_id: '',
    supplier_id: '',
    reason: '',
    status: 'Draft'
  })
  const [items, setItems] = useState([])
  const [itemSearch, setItemSearch] = useState('')
  const [itemResults, setItemResults] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (adjustmentId) {
      api.get(`/stock-adjustments/${adjustmentId}`).then(res => {
        const d = res.data
        setForm({
          id: d.id,
          adjustment_date: d.adjustment_date,
          item_id: d.item_id,
          batch_no: d.batch_no || '',
          exp_date: d.exp_date || '',
          quantity: d.quantity || 0,
          mrp: d.mrp || 0,
          rate: d.rate || 0,
          eff_rate: d.eff_rate || 0,
          tax_percent: d.tax_percent || 0,
          grn_id: d.grn_id || '',
          supplier_id: d.supplier_id || '',
          reason: d.reason || '',
          status: d.status || 'Draft'
        })
        // Load item details
        api.get(`/grn/items?q=${d.item_id}`).then(res => {
          if (res.data.length) setItems(res.data)
        }).catch(console.error)
      }).catch(console.error)
    }
  }, [adjustmentId])

  const searchItems = async (q) => {
    if (!q.trim()) { setItemResults([]); return }
    try {
      const { data } = await api.get(`/grn/items?q=${q}`)
      setItemResults(data)
    } catch (err) { console.error(err) }
  }

  const selectItem = (item) => {
    setForm({
      ...form,
      item_id: item.id,
      batch_no: item.batch_no || '',
      exp_date: item.exp_date || '',
      mrp: item.mrp || 0,
      rate: item.rate || 0,
      eff_rate: item.eff_rate || 0,
      tax_percent: item.tax_percent || 0,
      grn_id: item.grn_id || '',
      supplier_id: item.supplier_id || ''
    })
    setItemSearch(item.item_name)
    setItemResults([])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.item_id) return alert('Please select an item')
    setLoading(true)
    try {
      await api.post('/stock-adjustments', form)
      onClose()
    } catch (err) {
      alert(err.response?.data?.error || 'Save failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">{adjustmentId ? 'Edit Adjustment' : 'New Adjustment'}</h2>
          <button onClick={onClose} className="text-ink/50 hover:text-ink"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label">Date *</label>
              <input type="date" className="input" required value={form.adjustment_date} onChange={(e) => setForm({...form, adjustment_date: e.target.value})} />
            </div>
            <div className="relative">
              <label className="label">Item *</label>
              <input className="input" placeholder="Search item..." value={itemSearch} onChange={(e) => { setItemSearch(e.target.value); searchItems(e.target.value); }} />
              {itemResults.length > 0 && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-border rounded-sm shadow-lg max-h-40 overflow-y-auto">
                  {itemResults.map(item => (
                    <button key={item.id} type="button" onClick={() => selectItem(item)} className="block w-full text-left px-3 py-2 hover:bg-teal-50 border-b">
                      {item.item_name} ({item.batch_no || 'No batch'})
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="label">Batch No</label>
              <input className="input" value={form.batch_no} onChange={(e) => setForm({...form, batch_no: e.target.value})} />
            </div>
            <div>
              <label className="label">Exp Date</label>
              <input type="date" className="input" value={form.exp_date} onChange={(e) => setForm({...form, exp_date: e.target.value})} />
            </div>
            <div>
              <label className="label">Qty *</label>
              <input type="number" className="input" required value={form.quantity} onChange={(e) => setForm({...form, quantity: parseFloat(e.target.value) || 0})} />
            </div>
            <div>
              <label className="label">MRP</label>
              <input type="number" className="input" value={form.mrp} onChange={(e) => setForm({...form, mrp: parseFloat(e.target.value) || 0})} />
            </div>
            <div>
              <label className="label">Rate</label>
              <input type="number" className="input" value={form.rate} onChange={(e) => setForm({...form, rate: parseFloat(e.target.value) || 0})} />
            </div>
            <div>
              <label className="label">Eff Rate</label>
              <input type="number" className="input" value={form.eff_rate} onChange={(e) => setForm({...form, eff_rate: parseFloat(e.target.value) || 0})} />
            </div>
            <div>
              <label className="label">Tax%</label>
              <input type="number" className="input" value={form.tax_percent} onChange={(e) => setForm({...form, tax_percent: parseFloat(e.target.value) || 0})} />
            </div>
            <div>
              <label className="label">GRN No (optional)</label>
              <input className="input" value={form.grn_id} onChange={(e) => setForm({...form, grn_id: e.target.value})} placeholder="GRN ID or number" />
            </div>
            <div>
              <label className="label">Supplier (optional)</label>
              <input className="input" value={form.supplier_id} onChange={(e) => setForm({...form, supplier_id: e.target.value})} placeholder="Supplier ID" />
            </div>
            <div className="col-span-2">
              <label className="label">Reason</label>
              <textarea className="input w-full" rows="2" value={form.reason} onChange={(e) => setForm({...form, reason: e.target.value})} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={(e) => setForm({...form, status: e.target.value})}>
                <option value="Draft">Draft</option>
                <option value="Approved">Approved</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Adjustment'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}