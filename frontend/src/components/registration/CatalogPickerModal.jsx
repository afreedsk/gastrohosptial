import { useEffect, useMemo, useState } from 'react'
import { X, Search } from 'lucide-react'
import api from '../../api/axios'

/**
 * Generic searchable, multi-select, checkbox catalog picker.
 * Works for both Lab (grouped by department) and Services/Procedures
 * (grouped by service_type) by passing the right `endpoint` and field names.
 */
export default function CatalogPickerModal({
  title,
  endpoint,          // '/catalog/lab' or '/catalog/services'
  groupField,         // 'department' or 'service_type'
  nameField,          // 'investigation_name' or 'service_name'
  extraParams,        // e.g. { type: 'OT' } to pre-filter services by type
  onApply,
  onClose,
}) {
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState({}) // id -> item
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.get(endpoint, { params: { search, ...extraParams } })
      .then((r) => setItems(r.data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [search, endpoint, extraParams])

  const grouped = useMemo(() => {
    const g = {}
    for (const item of items) {
      const key = item[groupField] || 'Other'
      if (!g[key]) g[key] = []
      g[key].push(item)
    }
    return g
  }, [items, groupField])

  const toggle = (item) => {
    setSelected((s) => {
      const next = { ...s }
      if (next[item.id]) delete next[item.id]
      else next[item.id] = item
      return next
    })
  }

  const selectedList = Object.values(selected)
  const total = selectedList.reduce((sum, i) => sum + Number(i.rate || 0), 0)

  const apply = () => {
    onApply(selectedList, total)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-md w-full max-w-2xl shadow-xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-sm">{title}</h3>
          <button onClick={onClose} className="text-ink/40 hover:text-ink/70">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Search size={14} className="text-ink/40" />
            <input
              className="input"
              placeholder="Search by name or department/type…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading && <p className="text-sm text-ink/40 py-4 text-center">Loading…</p>}
          {!loading && !items.length && (
            <p className="text-sm text-ink/40 py-4 text-center">No matching items found.</p>
          )}
          {!loading && Object.entries(grouped).map(([group, groupItems]) => (
            <div key={group} className="mb-4">
              <p className="text-xs font-semibold text-ink/50 uppercase mb-1">{group}</p>
              <table className="table-base">
                <thead>
                  <tr><th className="w-10"></th><th>S.No</th><th>Name</th><th>Rate (Rs.)</th></tr>
                </thead>
                <tbody>
                  {groupItems.map((item, idx) => (
                    <tr
                      key={item.id}
                      className="cursor-pointer hover:bg-teal-50/50"
                      onClick={() => toggle(item)}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={!!selected[item.id]}
                          onChange={() => toggle(item)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td>{idx + 1}</td>
                      <td>
                        {item[nameField]}
                        {item.description && <span className="block text-xs text-ink/40">{item.description}</span>}
                      </td>
                      <td>₹{Number(item.rate).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <div className="px-5 py-4 border-t border-border">
          <div className="flex justify-between text-sm mb-3">
            <span>{selectedList.length} item(s) selected</span>
            <span className="font-semibold">Total: ₹{total.toFixed(2)}</span>
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-primary flex-1" onClick={apply} disabled={!selectedList.length}>
              Apply
            </button>
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}