import { useEffect, useState } from 'react'
import { Plus, Search, Edit, Trash2, X } from 'lucide-react'
import api from '../../api/axios'
import { PageHeader } from '../../components/PageHeader'

export default function SupplierMaster() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const fetchSuppliers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      const { data } = await api.get(`/suppliers?${params.toString()}`)
      setSuppliers(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSuppliers()
  }, [])

  const handleSearch = () => fetchSuppliers()
  const resetSearch = () => {
    setSearch('')
    setTimeout(fetchSuppliers, 0)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this supplier?')) return
    try {
      await api.delete(`/suppliers/${id}`)
      fetchSuppliers()
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed')
    }
  }

  return (
    <div>
      <PageHeader title="Supplier Master" subtitle="Manage vendor/supplier details" />
      
      <div className="flex flex-wrap gap-4 items-end mb-4">
        <div className="flex-1 min-w-[200px]">
          <label className="label">Search</label>
          <input className="input" placeholder="By name, contact, email..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button onClick={handleSearch} className="btn-primary flex items-center gap-2"><Search size={16} /> Search</button>
        <button onClick={resetSearch} className="btn-secondary">Reset</button>
        <button onClick={() => { setEditingId(null); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Supplier
        </button>
      </div>

      {loading && <div className="text-center py-4">Loading...</div>}
      {!loading && suppliers.length === 0 && <div className="text-center py-8 text-ink/50">No suppliers found.</div>}

      {!loading && suppliers.length > 0 && (
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Name</th><th>Contact Person</th><th>Contact No</th><th>Email</th>
                <th>GST No</th><th>Inventory Type</th><th>Active</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map(s => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.contact_person || '—'}</td>
                  <td>{s.contact_no || '—'}</td>
                  <td>{s.email || '—'}</td>
                  <td>{s.gst_no || '—'}</td>
                  <td>{s.inventory_type || '—'}</td>
                  <td>{s.is_active ? '✅' : '❌'}</td>
                  <td className="flex gap-1">
                    <button onClick={() => { setEditingId(s.id); setShowModal(true); }} className="text-indigo-600 hover:text-indigo-800"><Edit size={16} /></button>
                    <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && <SupplierModal supplierId={editingId} onClose={() => { setShowModal(false); setEditingId(null); fetchSuppliers(); }} />}
    </div>
  )
}

// ============================================================
// Supplier Modal (Add/Edit)
// ============================================================
function SupplierModal({ supplierId, onClose }) {
  const [form, setForm] = useState({
    name: '',
    inventory_type: '',
    vat_no: '',
    contact_person: '',
    contact_no: '',
    email: '',
    gst_no: '',
    pincode: '',
    address: '',
    fax: '',
    alt_contact_no: '',
    website: '',
    remarks: '',
    apgst_no: '',
    cst_no: '',
    dl_no: '',
    pan_no: '',
    is_active: true,
    is_igst_tax: false,
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (supplierId) {
      api.get(`/suppliers/${supplierId}`).then(res => {
        const d = res.data
        setForm({
          id: d.id,
          name: d.name || '',
          inventory_type: d.inventory_type || '',
          vat_no: d.vat_no || '',
          contact_person: d.contact_person || '',
          contact_no: d.contact_no || '',
          email: d.email || '',
          gst_no: d.gst_no || '',
          pincode: d.pincode || '',
          address: d.address || '',
          fax: d.fax || '',
          alt_contact_no: d.alt_contact_no || '',
          website: d.website || '',
          remarks: d.remarks || '',
          apgst_no: d.apgst_no || '',
          cst_no: d.cst_no || '',
          dl_no: d.dl_no || '',
          pan_no: d.pan_no || '',
          is_active: Boolean(d.is_active),
          is_igst_tax: Boolean(d.is_igst_tax),
        })
      }).catch(console.error)
    }
  }, [supplierId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return alert('Supplier name is required')
    setLoading(true)
    try {
      await api.post('/suppliers', form)
      onClose()
    } catch (err) {
      alert(err.response?.data?.error || 'Save failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">{supplierId ? 'Edit Supplier' : 'Add Supplier'}</h2>
          <button onClick={onClose} className="text-ink/50 hover:text-ink"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="label">Supplier *</label>
              <input className="input" required value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
            </div>
            <div>
              <label className="label">Inventory Type</label>
              <select className="input" value={form.inventory_type} onChange={(e) => setForm({...form, inventory_type: e.target.value})}>
                <option value="">Select options</option>
                <option value="Pharmaceutical">Pharmaceutical</option>
                <option value="Surgical">Surgical</option>
                <option value="Consumables">Consumables</option>
                <option value="Equipment">Equipment</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="label">VAT NO</label>
              <input className="input" value={form.vat_no} onChange={(e) => setForm({...form, vat_no: e.target.value})} />
            </div>
            <div>
              <label className="label">Contact Person</label>
              <input className="input" value={form.contact_person} onChange={(e) => setForm({...form, contact_person: e.target.value})} />
            </div>
            <div>
              <label className="label">Contact No</label>
              <input className="input" value={form.contact_no} onChange={(e) => setForm({...form, contact_no: e.target.value})} />
            </div>
            <div>
              <label className="label">Email ID</label>
              <input type="email" className="input" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
            </div>
            <div>
              <label className="label">GST NO</label>
              <input className="input" value={form.gst_no} onChange={(e) => setForm({...form, gst_no: e.target.value})} />
            </div>
            <div>
              <label className="label">PinCode</label>
              <input className="input" value={form.pincode} onChange={(e) => setForm({...form, pincode: e.target.value})} />
            </div>
            <div className="col-span-2">
              <label className="label">Address</label>
              <textarea className="input w-full" rows="2" value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} />
            </div>
            <div>
              <label className="label">Fax</label>
              <input className="input" value={form.fax} onChange={(e) => setForm({...form, fax: e.target.value})} />
            </div>
            <div>
              <label className="label">Alternate Contact No</label>
              <input className="input" value={form.alt_contact_no} onChange={(e) => setForm({...form, alt_contact_no: e.target.value})} />
            </div>
            <div>
              <label className="label">Website</label>
              <input className="input" value={form.website} onChange={(e) => setForm({...form, website: e.target.value})} />
            </div>
            <div className="col-span-2">
              <label className="label">Remarks</label>
              <textarea className="input w-full" rows="2" value={form.remarks} onChange={(e) => setForm({...form, remarks: e.target.value})} />
            </div>
            <div>
              <label className="label">APGST NO</label>
              <input className="input" value={form.apgst_no} onChange={(e) => setForm({...form, apgst_no: e.target.value})} />
            </div>
            <div>
              <label className="label">CST NO</label>
              <input className="input" value={form.cst_no} onChange={(e) => setForm({...form, cst_no: e.target.value})} />
            </div>
            <div>
              <label className="label">DL NO</label>
              <input className="input" value={form.dl_no} onChange={(e) => setForm({...form, dl_no: e.target.value})} />
            </div>
            <div>
              <label className="label">PAN NO</label>
              <input className="input" value={form.pan_no} onChange={(e) => setForm({...form, pan_no: e.target.value})} />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({...form, is_active: e.target.checked})} />
                Is Active
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_igst_tax} onChange={(e) => setForm({...form, is_igst_tax: e.target.checked})} />
                Is IGST Tax
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Submit'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}