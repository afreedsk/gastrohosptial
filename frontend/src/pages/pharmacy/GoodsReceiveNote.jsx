import { useEffect, useState } from 'react'
import { Plus, Search, Eye, RotateCcw, Edit, Trash2, X } from 'lucide-react'
import api from '../../api/axios'
import { PageHeader } from '../../components/PageHeader'

export default function GoodsReceiveNote() {
  const [grns, setGrns] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingGrn, setEditingGrn] = useState(null)
  const [suppliers, setSuppliers] = useState([])
  const [items, setItems] = useState([])

  const fetchGrns = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (startDate) params.append('start_date', startDate)
      if (endDate) params.append('end_date', endDate)
      const { data } = await api.get(`/grn?${params.toString()}`)
      setGrns(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGrns()
  }, [])

  const handleFilter = () => fetchGrns()
  const resetFilter = () => {
    setSearch('')
    setStartDate('')
    setEndDate('')
    setTimeout(fetchGrns, 0)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this GRN?')) return
    try {
      await api.delete(`/grn/${id}`)
      fetchGrns()
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed')
    }
  }

  return (
    <div>
      <PageHeader title="Goods Receive Note" subtitle="Manage incoming stock" />
      
      {/* Filter bar */}
      <div className="flex flex-wrap gap-4 items-end mb-4">
        <div className="flex-1 min-w-[200px]">
          <label className="label">Search</label>
          <input className="input" placeholder="By GRN, Invoice, Supplier..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
        <button onClick={() => { setEditingGrn(null); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add New GRN
        </button>
      </div>

      {loading && <div className="text-center py-4">Loading...</div>}

      {!loading && grns.length === 0 && <div className="text-center py-8 text-ink/50">No GRNs found.</div>}

      {!loading && grns.length > 0 && (
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>GRN No</th><th>GRN Date</th><th>Invoice No</th><th>Invoice Date</th>
                <th>Supplier</th><th>Supplier Mobile</th><th>Amount</th>
                <th>Created By</th><th>Status</th><th>Remarks</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {grns.map(g => (
                <tr key={g.id}>
                  <td>{g.grn_no}</td>
                  <td>{g.grn_date}</td>
                  <td>{g.invoice_no || '—'}</td>
                  <td>{g.invoice_date || '—'}</td>
                  <td>{g.supplier_name || '—'}</td>
                  <td>{g.supplier_mobile || '—'}</td>
                  <td>₹{Number(g.total_amount).toFixed(2)}</td>
                  <td>{g.created_by_name || '—'}</td>
                  <td><span className={`px-2 py-0.5 text-xs rounded-full ${g.status === 'Approved' ? 'bg-green-100 text-green-700' : g.status === 'Draft' ? 'bg-yellow-100 text-yellow-700' : g.status === 'Returned' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{g.status}</span></td>
                  <td>{g.remarks || '—'}</td>
                  <td className="flex gap-1">
                    <button onClick={() => { setEditingGrn(g.id); setShowModal(true); }} className="text-indigo-600 hover:text-indigo-800"><Eye size={16} /></button>
                    <button onClick={() => handleDelete(g.id)} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
                    {/* Return action */}
                    <button className="text-amber-600 hover:text-amber-800"><RotateCcw size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && <GRNModal grnId={editingGrn} onClose={() => { setShowModal(false); setEditingGrn(null); fetchGrns(); }} />}
    </div>
  )
}

// ============================================================
// GRN Modal (Add/Edit)
// ============================================================
function GRNModal({ grnId, onClose }) {
  const [form, setForm] = useState({
    grn_date: new Date().toISOString().slice(0,10),
    invoice_no: '',
    invoice_date: '',
    supplier_id: '',
    supplier_mobile: '',
    total_amount: 0,
    status: 'Draft',
    remarks: '',
    items: []
  })
  const [suppliers, setSuppliers] = useState([])
  const [itemSearch, setItemSearch] = useState('')
  const [itemResults, setItemResults] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Load suppliers for dropdown
    api.get('/grn/suppliers?q=').then(res => setSuppliers(res.data)).catch(console.error)
    if (grnId) {
      api.get(`/grn/${grnId}`).then(res => {
        const data = res.data
        setForm({
          id: data.id,
          grn_date: data.grn_date,
          invoice_no: data.invoice_no || '',
          invoice_date: data.invoice_date || '',
          supplier_id: data.supplier_id || '',
          supplier_mobile: data.supplier_mobile || '',
          total_amount: data.total_amount || 0,
          status: data.status,
          remarks: data.remarks || '',
          items: data.items || []
        })
      }).catch(console.error)
    }
  }, [grnId])

  const searchItems = async (q) => {
    if (!q.trim()) { setItemResults([]); return }
    try {
      const { data } = await api.get(`/grn/items?q=${q}`)
      setItemResults(data)
    } catch (err) { console.error(err) }
  }

  const addItem = (item) => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, {
        item_id: item.id,
        item_name: item.item_name,
        batch_no: '',
        exp_date: '',
        quantity: 0,
        mrp: 0,
        rate: 0,
        eff_rate: 0,
        tax_percent: 0,
        amount: 0
      }]
    }))
    setItemSearch('')
    setItemResults([])
  }

  const updateItem = (index, field, value) => {
    const updated = [...form.items]
    updated[index][field] = value
    // Auto-calculate amount
    if (['quantity', 'eff_rate'].includes(field)) {
      const qty = updated[index].quantity || 0
      const rate = updated[index].eff_rate || 0
      updated[index].amount = qty * rate
    }
    setForm(prev => ({ ...prev, items: updated }))
    // Recalculate total
    const total = updated.reduce((sum, i) => sum + (i.amount || 0), 0)
    setForm(prev => ({ ...prev, total_amount: total }))
  }

  const removeItem = (index) => {
    const updated = form.items.filter((_, i) => i !== index)
    setForm(prev => ({ ...prev, items: updated }))
    const total = updated.reduce((sum, i) => sum + (i.amount || 0), 0)
    setForm(prev => ({ ...prev, total_amount: total }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/grn', form)
      onClose()
    } catch (err) {
      alert(err.response?.data?.error || 'Save failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">{grnId ? 'Edit GRN' : 'New GRN'}</h2>
          <button onClick={onClose} className="text-ink/50 hover:text-ink"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="label">GRN Date *</label>
              <input type="date" className="input" required value={form.grn_date} onChange={(e) => setForm({...form, grn_date: e.target.value})} />
            </div>
            <div>
              <label className="label">Invoice No</label>
              <input className="input" value={form.invoice_no} onChange={(e) => setForm({...form, invoice_no: e.target.value})} />
            </div>
            <div>
              <label className="label">Invoice Date</label>
              <input type="date" className="input" value={form.invoice_date} onChange={(e) => setForm({...form, invoice_date: e.target.value})} />
            </div>
            <div>
              <label className="label">Supplier</label>
              <select className="input" value={form.supplier_id} onChange={(e) => setForm({...form, supplier_id: e.target.value})}>
                <option value="">Select Supplier</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Supplier Mobile</label>
              <input className="input" value={form.supplier_mobile} onChange={(e) => setForm({...form, supplier_mobile: e.target.value})} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={(e) => setForm({...form, status: e.target.value})}>
                <option value="Draft">Draft</option>
                <option value="Received">Received</option>
                <option value="Approved">Approved</option>
                <option value="Returned">Returned</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Remarks</label>
              <textarea className="input w-full" rows="2" value={form.remarks} onChange={(e) => setForm({...form, remarks: e.target.value})} />
            </div>
            <div>
              <label className="label">Total Amount</label>
              <input type="number" className="input bg-gray-50" value={form.total_amount} readOnly />
            </div>
          </div>

          {/* Items table */}
          <div className="mb-4">
            <label className="label">Items</label>
            <div className="flex gap-2 mb-2">
              <input className="input flex-1" placeholder="Search item..." value={itemSearch} onChange={(e) => { setItemSearch(e.target.value); searchItems(e.target.value); }} />
              {itemResults.length > 0 && (
                <div className="absolute mt-12 bg-white border border-border rounded-sm shadow-lg max-h-40 overflow-y-auto w-full">
                  {itemResults.map(item => (
                    <button key={item.id} type="button" onClick={() => addItem(item)} className="block w-full text-left px-3 py-2 hover:bg-teal-50 border-b">
                      {item.item_name} ({item.item_code})
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-ink/5">
                  <tr>
                    <th>Item Name</th><th>Batch No</th><th>Exp Date</th><th>Qty</th>
                    <th>MRP</th><th>Rate</th><th>Eff Rate</th><th>Tax%</th><th>Amount</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((item, idx) => (
                    <tr key={idx} className="border-b">
                      <td>{item.item_name}</td>
                      <td><input className="input w-24" value={item.batch_no} onChange={(e) => updateItem(idx, 'batch_no', e.target.value)} /></td>
                      <td><input type="date" className="input w-32" value={item.exp_date} onChange={(e) => updateItem(idx, 'exp_date', e.target.value)} /></td>
                      <td><input type="number" className="input w-20" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)} /></td>
                      <td><input type="number" className="input w-20" value={item.mrp} onChange={(e) => updateItem(idx, 'mrp', parseFloat(e.target.value) || 0)} /></td>
                      <td><input type="number" className="input w-20" value={item.rate} onChange={(e) => updateItem(idx, 'rate', parseFloat(e.target.value) || 0)} /></td>
                      <td><input type="number" className="input w-20" value={item.eff_rate} onChange={(e) => updateItem(idx, 'eff_rate', parseFloat(e.target.value) || 0)} /></td>
                      <td><input type="number" className="input w-20" value={item.tax_percent} onChange={(e) => updateItem(idx, 'tax_percent', parseFloat(e.target.value) || 0)} /></td>
                      <td>{(item.amount || 0).toFixed(2)}</td>
                      <td><button type="button" onClick={() => removeItem(idx)} className="text-red-500"><Trash2 size={16} /></button></td>
                    </tr>
                  ))}
                  {form.items.length === 0 && <tr><td colSpan={10} className="text-center text-ink/40 py-4">No items added</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save GRN'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}