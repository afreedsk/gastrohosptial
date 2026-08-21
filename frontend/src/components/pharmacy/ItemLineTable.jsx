import { useState } from 'react'
import api from '../../api/axios'

const emptyLine = () => ({
  item_id: null, item_name: '', batch_no: '', old_tax_percent: 0,
  new_tax_percent: 0, grn_id: '', qty: 1, mrp: 0,
})

export default function ItemLineTable({ lines, setLines, storeId }) {
  const [suggestions, setSuggestions] = useState({}) // rowIndex -> results
  const [openRow, setOpenRow] = useState(null)

  const searchItem = async (idx, value) => {
    setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, item_name: value } : l)))
    if (!value.trim()) { setSuggestions((s) => ({ ...s, [idx]: [] })); return }
    const { data } = await api.get('/pharmacy-items', { params: { search: value, store_id: storeId } })
    setSuggestions((s) => ({ ...s, [idx]: data }))
    setOpenRow(idx)
  }

  const pickItem = (idx, item) => {
    setLines((ls) => ls.map((l, i) => (i === idx ? {
      ...l,
      item_id: item.id, item_name: item.name, batch_no: item.batch_no || '',
      old_tax_percent: item.old_tax_percent, new_tax_percent: item.new_tax_percent,
      grn_id: item.grn_id || '', mrp: item.mrp,
    } : l)))
    setOpenRow(null)
  }

  const updateQty = (idx, qty) => {
    setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, qty } : l)))
  }

  const addRow = () => setLines((ls) => [...ls, emptyLine()])
  const removeRow = (idx) => setLines((ls) => ls.filter((_, i) => i !== idx))

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex gap-4">
          <button type="button" onClick={addRow} className="text-sm text-teal-600 hover:underline">+ Add New</button>
          <button type="button" className="text-sm text-teal-600 hover:underline">Add Package</button>
        </div>
        <button type="button" className="btn-secondary text-xs">Drug Combination</button>
      </div>

      <div className="overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>S.No</th><th>Item Name</th><th>Batch No</th><th>Old Tax(%)</th>
              <th>New Tax(%)</th><th>GrnId</th><th>Qty</th><th>MRP (₹)</th><th>Amount</th><th></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx}>
                <td>{idx + 1}</td>
                <td className="relative">
                  <input
                    className="input"
                    value={line.item_name}
                    onChange={(e) => searchItem(idx, e.target.value)}
                    onFocus={() => suggestions[idx]?.length && setOpenRow(idx)}
                  />
                  {openRow === idx && suggestions[idx]?.length > 0 && (
                    <div className="absolute z-30 mt-1 w-64 bg-white border border-border rounded-sm shadow-lg max-h-48 overflow-y-auto">
                      {suggestions[idx].map((it) => (
                        <button
                          type="button"
                          key={it.id}
                          onMouseDown={(e) => { e.preventDefault(); pickItem(idx, it) }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-teal-50 border-b border-border last:border-0"
                        >
                          <div className="font-medium">{it.name}</div>
                          <div className="text-ink/40">Batch {it.batch_no || '—'} · Stock {it.stock_qty} · ₹{it.mrp}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </td>
                <td>{line.batch_no || '—'}</td>
                <td>{line.old_tax_percent}</td>
                <td>{line.new_tax_percent}</td>
                <td>{line.grn_id || '—'}</td>
                <td>
                  <input type="number" min="1" className="input w-20" value={line.qty}
                    onChange={(e) => updateQty(idx, e.target.value)} />
                </td>
                <td>₹{Number(line.mrp).toFixed(2)}</td>
                <td>₹{(Number(line.qty || 0) * Number(line.mrp || 0)).toFixed(2)}</td>
                <td>
                  {lines.length > 1 && (
                    <button type="button" onClick={() => removeRow(idx)} className="text-danger-500 text-xs">✕</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export { emptyLine }