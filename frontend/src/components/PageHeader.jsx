export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="h-title text-xl">{title}</h1>
        {subtitle && <p className="text-sm text-ink/50 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function Section({ title, children, className = '' }) {
  return (
    <div className={`card p-5 ${className}`}>
      {title && <h2 className="h-title text-sm mb-4">{title}</h2>}
      {children}
    </div>
  )
}

export function StatusBadge({ status }) {
  const map = {
    Booked: 'badge-green', Completed: 'badge-green', Paid: 'badge-green', Admitted: 'badge-green',
    Available: 'badge-green',
    Pending: 'badge-amber', Partial: 'badge-amber', Due: 'badge-amber', Draft: 'badge-amber',
    Occupied: 'badge-amber',
    Cancelled: 'badge-red', Discharged: 'badge-gray', Rescheduled: 'badge-amber', Transferred: 'badge-gray',
  }
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>
}
