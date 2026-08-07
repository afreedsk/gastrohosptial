import { useEffect, useRef, useState } from 'react'
import api from '../../api/axios'
import { Section } from '../PageHeader'

export default function BillingActionsTable({ pollIntervalMs = 5000, refreshKey = 0 }) {
  const [actions, setActions] = useState([])
  const [lastUpdated, setLastUpdated] = useState(null)
  const timerRef = useRef(null)

  const load = async () => {
    try {
      const r = await api.get('/billing-management/actions')
      setActions(r.data)
      setLastUpdated(new Date())
    } catch {
      // silent fail on background poll; keep last known data
    }
  }

  useEffect(() => {
    load()
    timerRef.current = setInterval(load, pollIntervalMs)
    return () => clearInterval(timerRef.current)
  }, [pollIntervalMs])

  // manual trigger right after a create, so the table updates instantly
  // instead of waiting for the next poll tick
  useEffect(() => {
    if (refreshKey > 0) load()
  }, [refreshKey])

  return (
    <Section title="Recent Billing Actions">
      {lastUpdated && (
        <p className="text-xs text-ink/40 mb-2">
          Auto-updates every {pollIntervalMs / 1000}s · last refreshed {lastUpdated.toLocaleTimeString()}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr><th>Type</th><th>Bill ID</th><th>Action</th><th>Amount</th><th>Reason</th><th>By</th><th>Date</th></tr>
          </thead>
          <tbody>
            {actions.map((a) => (
              <tr key={a.id}>
                <td>{a.bill_type}</td>
                <td>{a.bill_id}</td>
                <td>{a.action_type.replace(/_/g, ' ')}</td>
                <td>₹{Number(a.amount).toFixed(2)}</td>
                <td className="max-w-[200px] truncate" title={a.reason}>{a.reason}</td>
                <td>{a.performed_by_name}</td>
                <td>{new Date(a.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {!actions.length && <tr><td colSpan={7} className="text-center text-ink/40 py-8">No actions recorded yet</td></tr>}
          </tbody>
        </table>
      </div>
    </Section>
  )
}