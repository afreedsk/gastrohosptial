import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, UserPlus, BedDouble, Stethoscope, Receipt,
  FileBarChart, ChevronDown, ChevronRight, LogOut, Users, ShieldAlert,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const GROUPS = [
  {
    key: 'registration', label: 'Registration Desk', icon: UserPlus,
    roles: ['executive', 'admin', 'super_admin'],
    items: [
      { label: 'Patient Registration', to: '/executive/patient-registration' },
      { label: 'In Patient', to: '/executive/in-patients' },
      { label: 'Out Patient', to: '/executive/out-patients' },
      { label: 'Direct Services', to: '/executive/direct-services' },
      { label: 'Patient Records', to: '/executive/patient-records' },
      { label: 'Room Occupation', to: '/executive/room-occupation' },
      { label: 'Room Transfer Approval', to: '/executive/room-transfer-approval' },
      { label: 'Patient Status', to: '/executive/patient-status' },
    ],
  },
  {
    key: 'billing', label: 'Billing', icon: Receipt,
    roles: ['executive', 'admin', 'super_admin'],
    items: [
      { label: 'Advance Payment', to: '/executive/advance-payment' },
      { label: 'Inpatient Billing', to: '/executive/ip-billing' },
      { label: 'Outpatient Billing', to: '/executive/op-billing' },
      { label: 'Discharge Summary', to: '/executive/discharge-summary' },
      { label: 'New Discharge Summary', to: '/executive/new-discharge-summary' },
      { label: 'Billing Summary', to: '/executive/billing-summary' },
      { label: 'Referral Doctor', to: '/executive/referral-doctor' },
    ],
  },
  {
    key: 'reports', label: 'Reports', icon: FileBarChart,
    roles: ['executive', 'admin', 'super_admin'],
    items: [
      { label: 'Inpatient Lab Reports', to: '/executive/reports/ip-lab' },
      { label: 'Outpatient Lab Reports', to: '/executive/reports/op-lab' },
      { label: 'Inpatient Radiology Reports', to: '/executive/reports/ip-radiology' },
      { label: 'Outpatient Radiology Reports', to: '/executive/reports/op-radiology' },
    ],
  },
]

const DIRECT_ITEMS = [
  { label: 'InPatientDashboard', to: '/executive/inpatient-dashboard', icon: BedDouble,
    roles: ['executive', 'admin', 'super_admin'] },
  { label: 'OutPatientDashboard', to: '/executive/outpatient-dashboard', icon: Stethoscope,
    roles: ['executive', 'admin', 'super_admin'] },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [openGroups, setOpenGroups] = useState({})

  if (!user) return null

  const dashboardPath = user.role === 'super_admin' ? '/superadmin/dashboard'
    : user.role === 'admin' ? '/admin/dashboard'
    : '/executive/dashboard'

  const billingManagementPath = user.role === 'executive' ? '/executive/billing-modifications' : '/admin/billing'

  const toggleGroup = (key) => setOpenGroups((g) => ({ ...g, [key]: !g[key] }))

  const linkClass = (isActive) =>
    `flex items-center gap-3 px-4 py-2.5 text-sm ${
      isActive ? 'bg-teal-50 text-teal-700 border-r-2 border-teal-600' : 'text-ink/60 hover:bg-ink/5'
    }`

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 flex flex-col border-r border-border bg-white">
      <div className="px-4 py-4 border-b border-border">
        <p className="font-semibold text-sm">HMS</p>
        <p className="text-xs text-ink/40 mt-0.5 capitalize">{user.role.replace('_', ' ')}</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        <NavLink to={dashboardPath} className={({ isActive }) => linkClass(isActive)}>
          <LayoutDashboard size={16} />
          Dashboard
        </NavLink>

        {GROUPS.filter((g) => g.roles.includes(user.role)).map((group) => {
          const isOpen = openGroups[group.key] ?? group.items.some((i) => location.pathname === i.to)
          const GroupIcon = group.icon
          return (
            <div key={group.key}>
              <button
                type="button"
                onClick={() => toggleGroup(group.key)}
                className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-ink/70 hover:bg-ink/5"
              >
                <span className="flex items-center gap-3">
                  <GroupIcon size={16} />
                  {group.label}
                </span>
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {isOpen && (
                <div className="bg-ink/[0.02]">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `block pl-11 pr-4 py-2 text-sm ${
                          isActive ? 'text-teal-700 font-medium' : 'text-ink/55 hover:text-ink/80'
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {DIRECT_ITEMS.filter((i) => i.roles.includes(user.role)).map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => linkClass(isActive)}>
            <Icon size={16} />
            {label}
          </NavLink>
        ))}

        <NavLink to={billingManagementPath} className={({ isActive }) => linkClass(isActive)}>
          <ShieldAlert size={16} />
          Billing Management
        </NavLink>

        {user.role === 'super_admin' && (
          <NavLink to="/superadmin/users" className={({ isActive }) => linkClass(isActive)}>
            <Users size={16} />
            User Management
          </NavLink>
        )}
      </nav>

      <div className="px-4 py-3 border-t border-border">
        <p className="text-xs text-ink/50 truncate mb-2">{user.email}</p>
        <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-danger-500 hover:underline">
          <LogOut size={14} /> Log out
        </button>
      </div>
    </aside>
  )
}