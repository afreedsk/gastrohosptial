import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import api from '../../api/axios'
import { PageHeader, Section } from '../../components/PageHeader'

const today = () => new Date().toISOString().slice(0, 10)

export default function OTIndents() {
  const [startDate, setStartDate] = useState(today())
  const [endDate, setEndDate] = useState(today())
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [raisedFor, setRaisedFor] = useState('')
  const [providedTo, setProvidedTo] = useState('')
  const [itemDetails, setItemDetails] = useState('')
  const [indentDate, setIndentDate] = useState(today())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () => api.get('/ot-indents', { params: { start_date: startDate, end_date: endDate, search } })
    .then((r) => setRows(r.data))

  useEffect(() => { load() }, [])

  const createIndent = async () => {
    setError('')
    if (!raisedFor || !itemDetails) return setError('Indent Raised For and Item Details are required')
    setSaving(true)
    try {
      await api.post('/ot-indents', {
        indent_date: indentDate, indent_raised_for: raisedFor,
        indent_provided_to: providedTo, item_details: itemDetails,
      })
      setModalOpen(false)
      setRaisedFor(''); setProvidedTo(''); setItemDetails('')
      load()
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create indent')
    } finally {
      setSaving(false)
    }
  }

  const markReturn = async (id) => {
    await api.patch(`/ot-indents/${id}/return`)
    load()
  }

  return (
    <div>
      <PageHeader title="OT Indents" />

      <Section title="">
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div><label className="label">Start Date</label><input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
          <div><label className="label">End Date</label><input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
          <button className="btn-primary" onClick={load}>Get In Detail</button>
        </div>

        <div className="flex items-center justify-between mb-3">
          <button className="btn-primary" onClick={() => setModalOpen(true)}>New OT Indent</button>
          <div className="flex items-center gap-2 max-w-xs">
            <Search size={14} className="text-ink/40" />
            <input className="input" placeholder="Search" value={search}
              onChange={(e) => setSearch(e.target.value)} onBlur={load} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Indent Date</th><th>Indent Raised For</th><th>Indent Provided To</th>
                <th>Item Details</th><th>Indent Return</th><th>Print</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{new Date(r.indent_date).toLocaleDateString()}</td>
                  <td>{r.indent_raised_for}</td>
                  <td>{r.indent_provided_to || '—'}</td>
                  <td>{r.item_details}</td>
                  <td>
                    {r.indent_return === 'Pending' ? (
                      <button className="text-teal-600 text-xs hover:underline" onClick={() => markReturn(r.id)}>Mark Returned</button>
                    ) : (
                      <span className="text-xs text-ink/40">{r.indent_return}</span>
                    )}
                  </td>
                  <td><button className="text-ink/40 text-xs hover:underline">🖨</button></td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={6} className="text-center text-ink/40 py-8">Details not available.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-ink/40 mt-2">Showing {rows.length} to {rows.length} of {rows.length} entries</p>
      </Section>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-md w-full max-w-lg p-5">
            <h3 className="font-semibold text-sm mb-3">New OT Indent</h3>
            {error && <p className="text-sm text-danger-500 mb-3">{error}</p>}
            <label className="label">Indent Date</label>
            <input type="date" className="input mb-3" value={indentDate} onChange={(e) => setIndentDate(e.target.value)} />
            <label className="label">Indent Raised For *</label>
            <input className="input mb-3" value={raisedFor} onChange={(e) => setRaisedFor(e.target.value)} />
            <label className="label">Indent Provided To</label>
            <input className="input mb-3" value={providedTo} onChange={(e) => setProvidedTo(e.target.value)} />
            <label className="label">Item Details *</label>
            <textarea className="input mb-4" rows={3} value={itemDetails} onChange={(e) => setItemDetails(e.target.value)} />
            <div className="flex gap-2">
              <button className="btn-primary flex-1" disabled={saving} onClick={createIndent}>{saving ? 'Saving…' : 'Save'}</button>
              <button className="btn-secondary flex-1" onClick={() => setModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}