import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  UserPlus, CalendarClock, Stethoscope, BedDouble,
  Receipt, IndianRupee, XCircle, FlaskConical, CalendarCheck, FileText, ShieldAlert
} from 'lucide-react'
import api from '../../api/axios'
import StatCard from '../../components/StatCard'
import { PageHeader, Section } from '../../components/PageHeader'

const COLORS = ['#0E7C7B', '#E8A33D']

const QUICK_LINKS = [
  { to: '/executive/patient-registration', label: 'Patient Registration', icon: UserPlus },
  { to: '/executive/appointments', label: 'Appointments', icon: CalendarCheck },
  { to: '/executive/admission', label: 'Admission', icon: BedDouble },
  { to: '/executive/op-billing', label: 'OP Billing', icon: Receipt },
  { to: '/executive/ip-billing', label: 'IP Billing', icon: FileText },
  { to: '/executive/billing-modifications', label: 'Billing Management', icon: ShieldAlert },
]

export default function ExecutiveDashboard() {
  const [summary, setSummary] = useState(null)
  const [patientsPerDay, setPatientsPerDay] = useState([])
  const [revenue, setRevenue] = useState([])
  const [opVsIp, setOpVsIp] = useState([])
  const [deptCollection, setDeptCollection] = useState([])

  useEffect(() => {
    api.get('/dashboard/summary').then((r) => setSummary(r.data)).catch(() => {})
    api.get('/dashboard/charts/patients-per-day').then((r) => setPatientsPerDay(r.data)).catch(() => {})
    api.get('/dashboard/charts/revenue').then((r) => setRevenue(r.data)).catch(() => {})
    api.get('/dashboard/charts/op-vs-ip').then((r) => setOpVsIp(r.data)).catch(() => {})
    api.get('/dashboard/charts/department-collection').then((r) => setDeptCollection(r.data)).catch(() => {})
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
      <PageHeader title="Executive Dashboard" subtitle="Live overview of today's hospital activity" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {cards.length
          ? cards.map((c) => <StatCard key={c.label} {...c} />)
          : Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card p-4 h-[68px] animate-pulse bg-ink/5" />
            ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Section title="Patients per Day">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={patientsPerDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8E7" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#0E7C7B" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Revenue (Last 7 Days)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={revenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8E7" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="revenue" fill="#0E7C7B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Section title="OP vs IP (Last 7 Days)">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={opVsIp} dataKey="value" nameKey="name" outerRadius={80} label>
                {opVsIp.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Department Wise Collection">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={deptCollection} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8E7" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="department" tick={{ fontSize: 11 }} width={100} />
              <Tooltip />
              <Bar dataKey="collection" fill="#E8A33D" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      </div>

      <Section title="Quick Access">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {QUICK_LINKS.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className="flex items-center gap-3 p-3 rounded-sm border border-border hover:border-teal-600 hover:bg-teal-50/50 text-sm text-ink/70">
              <Icon size={16} className="text-teal-600" />
              {label}
            </Link>
          ))}
        </div>
      </Section>
    </div>
  )
}