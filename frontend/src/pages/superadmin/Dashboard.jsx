import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  UserPlus, CalendarClock, Stethoscope, BedDouble,
  Receipt, IndianRupee, XCircle, FlaskConical, Users, ShieldAlert, ChevronRight
} from 'lucide-react'
import api from '../../api/axios'
import StatCard from '../../components/StatCard'
import { PageHeader, Section } from '../../components/PageHeader'

export default function SuperAdminDashboard() {
  const [summary, setSummary] = useState(null)
  const [userCount, setUserCount] = useState(null)
  const [recentActions, setRecentActions] = useState([])

  useEffect(() => {
    api.get('/dashboard/summary').then((r) => setSummary(r.data)).catch(() => {})
    api.get('/users').then((r) => setUserCount(r.data.length)).catch(() => {})
    api.get('/billing-management/actions').then((r) => setRecentActions(r.data.slice(0, 5))).catch(() => {})
  }, [])

  const cards = summary
    ? [
        { label: "Today's Registrations", value: summary.todays_registrations, icon: UserPlus },
        { label: "Today's Appointments", value: summary.todays_appointments, icon: CalendarClock },
        { label: "Today's OP Patients", value: summary.todays_op_patients, icon: Stethoscope },
        { label: "Today's IP Admissions", value: summary.todays_ip_admissions, icon: BedDouble },
        { label: 'Pending Bills', value: summary.pending_bills, icon: Receipt, tone: 'amber' },
        { label: "Today's Revenue", value: `₹${summary.todays_revenue.toLocaleString()}`, icon: IndianRupee },
        { label: 'Cancelled Bills', value: summary.cancelled_bills, icon: XCircle, tone: 'red' },
        { label: 'Pending Lab Reports', value: summary.pending_lab_reports, icon: FlaskConical, tone: 'amber' },
      ]
    : []

  return (
    <div>
      <PageHeader title="Super Admin" subtitle="System-wide overview and controls" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {cards.length
          ? cards.map((c) => <StatCard key={c.label} {...c} />)
          : Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card p-4 h-[68px] animate-pulse bg-ink/5" />
            ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Link to="/superadmin/users" className="lg:col-span-1">
          <Section title="Users">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-ink/60">
                <Users size={18} className="text-teal-600" />
                <span className="text-2xl font-semibold text-ink">{userCount ?? '—'}</span>
                <span className="text-sm">total accounts</span>
              </div>
              <ChevronRight size={16} className="text-ink/30" />
            </div>
            <p className="text-xs text-ink/40 mt-2">Manage roles, access, and passwords</p>
          </Section>
        </Link>

        <div className="lg:col-span-2">
          <Link to="/admin/billing">
            <Section title="Recent Billing Actions">
              <div className="overflow-x-auto">
                <table className="table-base">
                  <thead>
                    <tr><th>Type</th><th>Bill ID</th><th>Action</th><th>Amount</th><th>By</th></tr>
                  </thead>
                  <tbody>
                    {recentActions.map((a) => (
                      <tr key={a.id}>
                        <td>{a.bill_type}</td>
                        <td>{a.bill_id}</td>
                        <td>{a.action_type.replace(/_/g, ' ')}</td>
                        <td>₹{Number(a.amount).toFixed(2)}</td>
                        <td>{a.performed_by_name}</td>
                      </tr>
                    ))}
                    {!recentActions.length && (
                      <tr><td colSpan={5} className="text-center text-ink/40 py-6">No actions recorded yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-ink/40 mt-2 flex items-center gap-1">
                <ShieldAlert size={12} /> View and act on full billing management
              </p>
            </Section>
          </Link>
        </div>
      </div>
    </div>
  )
}