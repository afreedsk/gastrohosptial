import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, UserPlus, CalendarCheck, BedDouble,
  Receipt, FileText, ShieldAlert, Users, LogOut,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

// `to` can be a fixed path, or a function(role) => path when the destination
// depends on role (e.g. Billing Management: full page for admin/super_admin,
// read-only page for executive).
const NAV_ITEMS = [
  {
    label: 'Dashboard', icon: LayoutDashboard,
    roles: ['executive', 'admin', 'super_admin'],
    to: (role) => (role === 'super_admin' ? '/superadmin/dashboard'
      : role === 'admin' ? '/admin/dashboard'
      : '/executive/dashboard'),
  },
  { label: 'Patient Registration', icon: UserPlus, roles: ['executive', 'admin', 'super_admin'],
    to: () => '/executive/patient-registration' },
  { label: 'Appointments', icon: CalendarCheck, roles: ['executive', 'admin', 'super_admin'],
    to: () => '/executive/appointments' },
  { label: 'Admission', icon: BedDouble, roles: ['executive', 'admin', 'super_admin'],
    to: () => '/executive/admission' },
  { label: 'OP Billing', icon: Receipt, roles: ['executive', 'admin', 'super_admin'],
    to: () => '/executive/op-billing' },
  { label: 'IP Billing', icon: FileText, roles: ['executive', 'admin', 'super_admin'],
    to: () => '/executive/ip-billing' },
  {
    label: 'Billing Management', icon: ShieldAlert,
    roles: ['executive', 'admin', 'super_admin'],
    to: (role) => (role === 'executive' ? '/executive/billing-modifications' : '/admin/billing'),
  },
  { label: 'User Management', icon: Users, roles: ['super_admin'],
    to: () => '/superadmin/users' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  if (!user) return null

  const visibleItems = NAV_ITEMS
    .filter((item) => item.roles.includes(user.role))
    .map((item) => ({ ...item, path: item.to(user.role) }))

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 flex flex-col border-r border-border bg-white">
      <div className="px-4 py-4 border-b border-border">
        <p className="font-semibold text-sm">HMS</p>
        <p className="text-xs text-ink/40 mt-0.5 capitalize">{user.role.replace('_', ' ')}</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {visibleItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={label}
            to={path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 text-sm ${
                isActive ? 'bg-teal-50 text-teal-700 border-r-2 border-teal-600' : 'text-ink/60 hover:bg-ink/5'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
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