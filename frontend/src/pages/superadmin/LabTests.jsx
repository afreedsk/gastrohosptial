import { useEffect, useState } from 'react'
import { Plus, Search, Download, Upload, X, Link, Trash2, Save } from 'lucide-react'
import api from '../../api/axios'
import { PageHeader } from '../../components/PageHeader'

export default function LabTests() {
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [selectedTestId, setSelectedTestId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchTests = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      const { data } = await api.get(`/lab-tests?${params.toString()}`)
      setTests(data)
    } catch (err) {
      console.error(err)
      setError('Failed to load lab tests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTests()
  }, [])

  const handleDelete = async (id) => {
    if (!confirm('Delete this test?')) return
    try {
      await api.delete(`/lab-tests/${id}`)
      setSuccess('Test deleted successfully')
      fetchTests()
    } catch (err) {
      setError(err.response?.data?.error || 'Delete failed')
    }
  }

  // ---------- EXPORT CSV ----------
  const exportCSV = async () => {
    try {
      const { data } = await api.get('/lab-tests/export')
      if (!data.length) {
        alert('No tests to export')
        return
      }
      const headers = Object.keys(data[0])
      const rows = data.map(row => headers.map(key => `"${(row[key] ?? '').replace(/"/g, '""')}"`).join(','))
      const csv = [headers.join(','), ...rows].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `LabMaster_${new Date().toISOString().slice(0,10)}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
      setSuccess('Export successful')
    } catch (err) {
      setError('Export failed: ' + (err.response?.data?.error || err.message))
    }
  }

  // ---------- IMPORT CSV ----------
  const parseCSVLine = (line) => {
    const result = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
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

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim())
    if (!lines.length) return []

    const headerLine = lines[0]
    const headers = parseCSVLine(headerLine)
    const result = []
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      if (values.length < headers.length) continue
      const obj = {}
      headers.forEach((h, idx) => {
        obj[h] = values[idx] || ''
      })
      result.push(obj)
    }
    return result
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const text = event.target.result
        const rows = parseCSV(text)
        if (!rows.length) {
          alert('No data rows found in CSV')
          return
        }
        const { data } = await api.post('/lab-tests/import', { tests: rows })
        setSuccess(data.message)
        if (data.errors && data.errors.length) {
          alert(`Import completed with errors:\n${data.errors.join('\n')}`)
        }
        fetchTests()
      } catch (err) {
        setError('Import failed: ' + (err.response?.data?.error || err.message))
      }
      e.target.value = ''
    }
    reader.readAsText(file)
  }

  return (
    <div>
      <PageHeader title="Lab Tests" subtitle="Manage laboratory test master" />

      {error && <div className="text-sm text-danger-500 bg-danger-50 border border-danger-200 rounded-sm px-3 py-2 mb-4">{error}</div>}
      {success && <div className="text-sm text-teal-700 bg-teal-50 border border-teal-100 rounded-sm px-3 py-2 mb-4">{success}</div>}

      <div className="flex flex-wrap gap-4 items-end mb-4">
        <div className="flex-1 min-w-[200px]">
          <label className="label">Search</label>
          <input className="input" placeholder="By test name..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button onClick={fetchTests} className="btn-primary flex items-center gap-2"><Search size={16} /> Search</button>
        <button onClick={exportCSV} className="btn-primary flex items-center gap-2 bg-green-600 hover:bg-green-700">
          <Download size={16} /> Export
        </button>
        <label className="btn-primary flex items-center gap-2 bg-blue-600 hover:bg-blue-700 cursor-pointer">
          <Upload size={16} /> Import CSV
          <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
        </label>
        <button onClick={() => { setEditingId(null); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Test
        </button>
      </div>

      {loading && <div className="text-center py-4">Loading...</div>}
      {!loading && tests.length === 0 && <div className="text-center py-8 text-ink/50">No lab tests found.</div>}

      {!loading && tests.length > 0 && (
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Test</th><th>Short Name</th><th>Cost (₹)</th><th>Status</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {tests.map(t => (
                <tr key={t.id}>
                  <td>{t.test_name}</td>
                  <td>{t.short_name || '—'}</td>
                  <td>₹{Number(t.cost).toFixed(2)}</td>
                  <td>{t.is_active ? '✅ Active' : '❌ Inactive'}</td>
                  <td>
                    <button 
                      onClick={() => { setSelectedTestId(t.id); setShowModal(true); }} 
                      className="text-teal-600 hover:text-teal-800"
                      title="View/Edit details"
                    >
                      <Link size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <TestDetailModal 
          testId={selectedTestId || editingId} 
          onClose={() => { setShowModal(false); setSelectedTestId(null); setEditingId(null); fetchTests(); }} 
        />
      )}
    </div>
  )
}

// ============================================================
// TEST DETAIL MODAL (Full detail view)
// ============================================================
function TestDetailModal({ testId, onClose }) {
  const [test, setTest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [attributes, setAttributes] = useState([])
  const [newAttr, setNewAttr] = useState({ attribute_name: '', unit: '', normal_range: '' })
  const [editingAttrId, setEditingAttrId] = useState(null)

  useEffect(() => {
    if (testId) {
      api.get(`/lab-tests/${testId}/detail`).then(res => {
        setTest(res.data)
        setAttributes(res.data.attributes || [])
        setLoading(false)
      }).catch(err => {
        console.error(err)
        setLoading(false)
      })
    }
  }, [testId])

  const updateTestField = (field, value) => {
    setTest(prev => ({ ...prev, [field]: value }))
  }

  const saveTestDetails = async () => {
    if (!test) return
    try {
      await api.post('/lab-tests', {
        id: test.id,
        test_name: test.test_name,
        short_name: test.short_name,
        cost: test.cost,
        is_active: test.is_active,
      })
      alert('Test updated successfully')
    } catch (err) {
      alert('Failed to update test: ' + (err.response?.data?.error || err.message))
    }
  }

  const addAttribute = async () => {
    if (!newAttr.attribute_name.trim()) return alert('Attribute name is required')
    try {
      const { data } = await api.post(`/lab-tests/${testId}/attributes`, {
        attribute_name: newAttr.attribute_name,
        unit: newAttr.unit,
        normal_range: newAttr.normal_range,
        is_active: true,
      })
      setAttributes([...attributes, { ...newAttr, id: data.id, is_active: true }])
      setNewAttr({ attribute_name: '', unit: '', normal_range: '' })
    } catch (err) {
      alert('Failed to add attribute: ' + (err.response?.data?.error || err.message))
    }
  }

  const deleteAttribute = async (attrId) => {
    if (!confirm('Delete this attribute?')) return
    try {
      await api.delete(`/lab-tests/attributes/${attrId}`)
      setAttributes(attributes.filter(a => a.id !== attrId))
    } catch (err) {
      alert('Failed to delete attribute')
    }
  }

  const updateAttribute = async (attrId, field, value) => {
    const updated = attributes.map(a => {
      if (a.id === attrId) return { ...a, [field]: value }
      return a
    })
    setAttributes(updated)
    // Auto-save after change (optional, we'll do on blur)
    try {
      const attr = updated.find(a => a.id === attrId)
      await api.post(`/lab-tests/${testId}/attributes`, {
        id: attrId,
        attribute_name: attr.attribute_name,
        unit: attr.unit,
        normal_range: attr.normal_range,
        is_active: attr.is_active,
      })
    } catch (err) {
      alert('Failed to update attribute')
    }
  }

  if (loading) return <div className="p-8 text-center">Loading...</div>
  if (!test) return <div className="p-8 text-center">Test not found</div>

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Lab Test Details</h2>
          <button onClick={onClose} className="text-ink/50 hover:text-ink"><X size={24} /></button>
        </div>

        {/* Test Basic Details */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="label">Department</label>
            <input className="input" placeholder="Department" />
          </div>
          <div>
            <label className="label">Test</label>
            <input className="input" value={test.test_name} onChange={(e) => updateTestField('test_name', e.target.value)} />
          </div>
          <div>
            <label className="label">Short Name</label>
            <input className="input" value={test.short_name || ''} onChange={(e) => updateTestField('short_name', e.target.value)} />
          </div>
          <div>
            <label className="label">Cost (₹)</label>
            <input type="number" className="input" value={test.cost} onChange={(e) => updateTestField('cost', parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className="label">Referral Cost</label>
            <input type="number" className="input" value={0} />
          </div>
        </div>

        {/* Result Fields */}
        <div className="mb-4">
          <h3 className="font-medium text-sm mb-2">RESULT</h3>
          <div className="grid grid-cols-3 gap-2">
            <input className="input" placeholder="Units" />
            <input className="input" placeholder="ReffRange" />
            <input type="number" className="input" placeholder="0" />
          </div>
        </div>

        {/* Lab Attributes */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-sm">LAB ATTRIBUTES</h3>
            <button 
              onClick={addAttribute} 
              className="btn-primary text-xs flex items-center gap-1 py-1 px-3"
            >
              <Plus size={14} /> Add Attribute
            </button>
          </div>
          <div className="flex gap-2 mb-2">
            <input className="input flex-1" placeholder="Search attributes..." />
          </div>
          <div className="border border-border rounded-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink/5">
                <tr>
                  <th className="px-3 py-2 text-left">Attribute</th>
                  <th className="px-3 py-2 text-left">Units</th>
                  <th className="px-3 py-2 text-left">ReffRange</th>
                  <th className="px-3 py-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {attributes.map(attr => (
                  <tr key={attr.id} className="border-b">
                    <td className="px-3 py-2">
                      <input 
                        className="input py-1" 
                        value={attr.attribute_name} 
                        onChange={(e) => setAttributes(attributes.map(a => a.id === attr.id ? { ...a, attribute_name: e.target.value } : a))}
                        onBlur={() => updateAttribute(attr.id, 'attribute_name', attr.attribute_name)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input 
                        className="input py-1" 
                        value={attr.unit || ''} 
                        onChange={(e) => setAttributes(attributes.map(a => a.id === attr.id ? { ...a, unit: e.target.value } : a))}
                        onBlur={() => updateAttribute(attr.id, 'unit', attr.unit)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input 
                        className="input py-1" 
                        value={attr.normal_range || ''} 
                        onChange={(e) => setAttributes(attributes.map(a => a.id === attr.id ? { ...a, normal_range: e.target.value } : a))}
                        onBlur={() => updateAttribute(attr.id, 'normal_range', attr.normal_range)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button onClick={() => deleteAttribute(attr.id)} className="text-danger-500 hover:text-danger-700">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {attributes.length === 0 && (
                  <tr><td colSpan="4" className="text-center py-4 text-ink/40">No attributes added</td></tr>
                )}
                {/* Add new attribute row */}
                <tr>
                  <td className="px-3 py-2">
                    <input className="input py-1" placeholder="New attribute" value={newAttr.attribute_name} onChange={(e) => setNewAttr({...newAttr, attribute_name: e.target.value})} />
                  </td>
                  <td className="px-3 py-2">
                    <input className="input py-1" placeholder="Unit" value={newAttr.unit} onChange={(e) => setNewAttr({...newAttr, unit: e.target.value})} />
                  </td>
                  <td className="px-3 py-2">
                    <input className="input py-1" placeholder="Normal range" value={newAttr.normal_range} onChange={(e) => setNewAttr({...newAttr, normal_range: e.target.value})} />
                  </td>
                  <td className="px-3 py-2">
                    <button onClick={addAttribute} className="text-teal-600 hover:text-teal-800"><Plus size={16} /></button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Other fields */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="label">Method</label>
            <input className="input" placeholder="Method" />
          </div>
          <div>
            <label className="label">Note</label>
            <input className="input" placeholder="Note" />
          </div>
          <div>
            <label className="label">Add Material Qty</label>
            <input type="number" className="input" placeholder="0" />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={test.is_active} onChange={(e) => updateTestField('is_active', e.target.checked)} />
              Is Active
            </label>
          </div>
          <div>
            <label className="label">Lab Room Type Charges</label>
            <input className="input" placeholder="Lab Room Type Charges" />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={saveTestDetails} className="btn-primary flex items-center gap-2">
            <Save size={16} /> Save List
          </button>
        </div>
      </div>
    </div>
  )
}