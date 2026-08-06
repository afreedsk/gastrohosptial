import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, UserPlus, CalendarClock, Receipt,
  BedDouble, ClipboardList, ShieldAlert, BarChart3, Activity, LogOut
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { to: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: 'patient-registration', label: 'Patient Registration', icon: UserPlus },
  { to: 'appointments', label: 'Appointment', icon: CalendarClock },
  { to: 'op-billing', label: 'OP Billing', icon: Receipt },
  { to: 'ip-billing', label: 'IP Billing', icon: ClipboardList },
  { to: 'admission', label: 'Admission', icon: BedDouble },
  { to: 'billing-management', label: 'Billing Modifications', icon: ShieldAlert },
  { to: 'reports', label: 'Reports', icon: BarChart3 },
]

export default function ExecutiveLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-teal-700 text-white flex flex-col shrink-0">
        <div className="flex items-center gap-2 px-5 h-16 border-b border-white/10">
          <div className="w-8 h-8 rounded-md bg-white/15 flex items-center justify-center">
            <Activity size={16} />
          </div>
          <div>
            <p className="font-display font-semibold text-sm leading-none">HMS</p>
            <p className="text-[11px] text-white/60 leading-none mt-1">Executive Console</p>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm transition-colors ${
                  isActive ? 'bg-white text-teal-700 font-medium' : 'text-white/80 hover:bg-white/10'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10">
          <div className="px-3 py-2 mb-1">
            <p className="text-sm font-medium">{user?.name}</p>
            <p className="text-[11px] text-white/50 capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/10 rounded-sm"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="max-w-7xl mx-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
