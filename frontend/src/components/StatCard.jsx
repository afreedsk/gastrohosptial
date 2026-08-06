export default function StatCard({ label, value, icon: Icon, tone = 'teal' }) {
  const tones = {
    teal: 'bg-teal-50 text-teal-600',
    amber: 'bg-amber-400/15 text-amber-500',
    red: 'bg-danger-400/15 text-danger-500',
  }
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${tones[tone]}`}>
        {Icon && <Icon size={18} />}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-ink/50 truncate">{label}</p>
        <p className="stat-num text-xl font-semibold text-ink leading-tight">{value}</p>
      </div>
    </div>
  )
}
