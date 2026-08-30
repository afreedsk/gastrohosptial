import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, FileBarChart, LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function LabSidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  if (!user) return null

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const linkClass = (isActive) =>
    `flex items-center gap-3 px-4 py-2.5 text-sm rounded-sm transition-colors ${
      isActive ? 'bg-teal-50 text-teal-700 border-r-2 border-teal-600 font-medium' : 'text-ink/60 hover:bg-ink/5'
    }`

  const navLinks = [
    { to: '/lab/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/lab/op-reports', label: 'OP Reports', icon: FileBarChart },
    { to: '/lab/ip-reports', label: 'IP Reports', icon: FileBarChart },
  ]

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white border border-border rounded-sm"
      >
        {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside
        className={`
          w-64 shrink-0 h-screen sticky top-0 flex flex-col border-r border-border bg-white
          transition-transform duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          fixed md:relative z-40
        `}
      >
        {/* Header */}
        <div className="px-4 py-4 border-b border-border">
          <p className="font-semibold text-sm">HMS Lab</p>
          <p className="text-xs text-ink/40 mt-0.5 capitalize">{user.role.replace('_', ' ')}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-0.5">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => linkClass(isActive)}
              onClick={() => setIsMobileOpen(false)}
            >
              <Icon size={16} className="shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border">
          <p className="text-xs text-ink/50 truncate mb-2">{user.email}</p>
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-danger-500 hover:underline">
            <LogOut size={14} /> Log out
          </button>
        </div>
      </aside>
    </>
  )
}