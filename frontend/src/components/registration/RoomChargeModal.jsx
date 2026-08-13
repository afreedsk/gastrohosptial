import { useEffect, useMemo, useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'

// Fixed per-day rates by room category. VIP and ICU rates are as specified;
// other categories default to 0 until real rates are supplied — edit this
// table directly to configure them.
const RATE_TABLE = {
  VIP: { room_rate: 2500, doctor_charge: 3000, assistant_charge: 700, nursing_charge: 300 },
  ICU: { room_rate: 3500, doctor_charge: 4000, assistant_charge: 500, nursing_charge: 500 },
  Deluxe: { room_rate: 1500, doctor_charge: 0, assistant_charge: 0, nursing_charge: 0 },
  Private: { room_rate: 1200, doctor_charge: 0, assistant_charge: 0, nursing_charge: 0 },
  'Semi-Private': { room_rate: 800, doctor_charge: 0, assistant_charge: 0, nursing_charge: 0 },
  General: { room_rate: 500, doctor_charge: 0, assistant_charge: 0, nursing_charge: 0 },
}

const ROOM_CATEGORIES = Object.keys(RATE_TABLE)

let nextEntryId = 1
const makeEntry = (overrides = {}) => ({
  id: nextEntryId++,
  roomType: 'ICU',
  days: 1,
  ...overrides,
})

function entryTotals(entry) {
  const rates = RATE_TABLE[entry.roomType]
  const d = Math.max(0, Number(entry.days) || 0)
  const roomTotal = rates.room_rate * d
  const doctorTotal = rates.doctor_charge * d
  const assistantTotal = rates.assistant_charge * d
  const nursingTotal = rates.nursing_charge * d
  const grandTotal = roomTotal + doctorTotal + assistantTotal + nursingTotal
  return { rates, d, roomTotal, doctorTotal, assistantTotal, nursingTotal, grandTotal }
}

export default function RoomChargeModal({ initial, onApply, onClose }) {
  // `initial` can be an array of {roomType, days} (new, multi-entry) or a
  // single {roomType, days} object (legacy) — both are supported here.
  const initialEntries = useMemo(() => {
    if (Array.isArray(initial) && initial.length) {
      return initial.map((e) => makeEntry({ roomType: e.roomType, days: e.days }))
    }
    if (initial?.roomType) {
      return [makeEntry({ roomType: initial.roomType, days: initial.days })]
    }
    return [makeEntry()]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [entries, setEntries] = useState(initialEntries)

  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [onClose])

  const updateEntry = (id, patch) => {
    setEntries((current) => current.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }

  const addEntry = () => {
    setEntries((current) => [...current, makeEntry()])
  }

  const removeEntry = (id) => {
    setEntries((current) => (current.length > 1 ? current.filter((e) => e.id !== id) : current))
  }

  const perEntryTotals = useMemo(() => entries.map((e) => ({ entry: e, ...entryTotals(e) })), [entries])

  const combined = useMemo(() => {
    return perEntryTotals.reduce(
      (sum, t) => ({
        roomTotal: sum.roomTotal + t.roomTotal,
        doctorTotal: sum.doctorTotal + t.doctorTotal,
        assistantTotal: sum.assistantTotal + t.assistantTotal,
        nursingTotal: sum.nursingTotal + t.nursingTotal,
        grandTotal: sum.grandTotal + t.grandTotal,
      }),
      { roomTotal: 0, doctorTotal: 0, assistantTotal: 0, nursingTotal: 0, grandTotal: 0 }
    )
  }, [perEntryTotals])

  const apply = () => {
    onApply({
      // list of {roomType, days} for display in IPBilling.jsx
      entries: perEntryTotals.map((t) => ({ roomType: t.entry.roomType, days: t.d })),
      room_charge: combined.roomTotal,
      doctor_visit_charge: combined.doctorTotal,
      // No dedicated "assistant doctor" column exists on ip_bills — folded
      // into misc_charge. Adjust here if you add a real column later.
      assistant_doctor_charge: combined.assistantTotal,
      nursing_charge: combined.nursingTotal,
      grand_total: combined.grandTotal,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-md w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h3 className="font-semibold text-sm">Room Type & Charges</h3>
          <button onClick={onClose} className="text-ink/40 hover:text-ink/70">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto">
          {perEntryTotals.map((t, idx) => (
            <div key={t.entry.id} className={idx > 0 ? 'pt-4 border-t border-border' : ''}>
              <div className="flex items-center justify-between mb-1">
                <label className="label">Room Type & Charges</label>
                {idx === 0 ? (
                  <button
                    type="button"
                    onClick={addEntry}
                    className="text-xs text-teal-700 hover:text-teal-800 font-medium flex items-center gap-1"
                  >
                    <Plus size={13} /> Add New
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => removeEntry(t.entry.id)}
                    className="text-xs text-danger-500 hover:text-danger-600 font-medium flex items-center gap-1"
                  >
                    <Trash2 size={13} /> Remove
                  </button>
                )}
              </div>

              <select
                className="input mb-3"
                value={t.entry.roomType}
                onChange={(e) => updateEntry(t.entry.id, { roomType: e.target.value })}
              >
                {ROOM_CATEGORIES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>

              <div className="overflow-x-auto">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Doctor Charge</th>
                      <th>Assistant Doctor</th>
                      <th>Nursing</th>
                      <th>Room Rate / Day</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>₹{t.rates.doctor_charge.toFixed(2)}</td>
                      <td>₹{t.rates.assistant_charge.toFixed(2)}</td>
                      <td>₹{t.rates.nursing_charge.toFixed(2)}</td>
                      <td>₹{t.rates.room_rate.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-3">
                <label className="label">No. of Days</label>
                <input
                  type="number"
                  min="1"
                  className="input"
                  value={t.entry.days}
                  onChange={(e) => updateEntry(t.entry.id, { days: e.target.value })}
                />
              </div>

              <div className="bg-teal-50 rounded-sm p-3 text-sm space-y-1 mt-3">
                <div className="flex justify-between"><span>Room ({t.rates.room_rate} × {t.d})</span><span>₹{t.roomTotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Doctor Charge ({t.rates.doctor_charge} × {t.d})</span><span>₹{t.doctorTotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Assistant Doctor ({t.rates.assistant_charge} × {t.d})</span><span>₹{t.assistantTotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Nursing ({t.rates.nursing_charge} × {t.d})</span><span>₹{t.nursingTotal.toFixed(2)}</span></div>
                <div className="flex justify-between font-semibold pt-1 border-t border-teal-100">
                  <span>Subtotal</span><span>₹{t.grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}

          {entries.length > 1 && (
            <div className="bg-teal-100 rounded-sm p-3 text-sm space-y-1 border border-teal-200">
              <div className="flex justify-between"><span>Total Room</span><span>₹{combined.roomTotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Total Doctor Charge</span><span>₹{combined.doctorTotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Total Assistant Doctor</span><span>₹{combined.assistantTotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Total Nursing</span><span>₹{combined.nursingTotal.toFixed(2)}</span></div>
              <div className="flex justify-between font-semibold pt-1 border-t border-teal-200">
                <span>Grand Total</span><span>₹{combined.grandTotal.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-border shrink-0">
          <button type="button" className="btn-primary flex-1" onClick={apply}>Apply</button>
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}