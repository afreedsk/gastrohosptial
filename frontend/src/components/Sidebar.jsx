import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, UserPlus, BedDouble, CalendarCheck, Receipt,
  FileBarChart, Ban, ChevronDown, ChevronRight, LogOut, Users, ShieldAlert,
  ExternalLink, Settings, FlaskConical, // <-- Added FlaskConical for Lab icon
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const ALL_ROLES = ['executive', 'admin', 'super_admin']

const NAV_TREE = [
  { type: 'link', label: 'Patient Registration', to: '/executive/patient-registration', icon: UserPlus, roles: ALL_ROLES },
  { type: 'link', label: 'Appointments', to: '/executive/appointments', icon: CalendarCheck, roles: ALL_ROLES },
  {
    type: 'group', key: 'billing', label: 'Billing', icon: Receipt, roles: ALL_ROLES,
    children: [
      {
        type: 'group', key: 'billing-ip', label: 'IP',
        children: [
          { label: 'IP Billing', to: '/executive/ip-billing' },
          { label: 'IP Advance', to: '/executive/ip-advance' },
          { label: 'IP Lab', to: '/executive/ip-lab' },
          { label: 'IP Services', to: '/executive/ip-services' },
          { label: 'IP Procedures', to: '/executive/ip-procedures' },
        ],
      },
      {
        type: 'group', key: 'billing-op', label: 'OP',
        children: [
          { label: 'OP Billing', to: '/executive/op-billing' },
          { label: 'OP Lab', to: '/executive/op-lab' },
          { label: 'OP Services', to: '/executive/op-services' },
          { label: 'OP Procedures', to: '/executive/op-procedures' },
        ],
      },
    ],
  },
  {
    type: 'group', key: 'ip-admission', label: 'IP Admission', icon: BedDouble, roles: ALL_ROLES,
    children: [
      { label: 'IP Details', to: '/executive/ip-details' },
      { label: 'Admission', to: '/executive/admission' },
      { label: 'Room Transfer', to: '/executive/room-transfer-approval' },
      { label: 'Discharge Summary', to: '/executive/discharge-summary' },
    ],
  },
  {
    type: 'group', key: 'cancellations', label: 'Cancellations', icon: Ban, roles: ALL_ROLES,
    children: [
      { label: 'OP Consultation Cancel', to: '/executive/cancellations/op-consultation' },
      { label: 'OP Billing Cancel', to: '/executive/cancellations/op-billing' },
      { label: 'OP Lab Cancel', to: '/executive/cancellations/op-lab' },
      { label: 'OP Lab Modifications', to: '/executive/cancellations/op-lab-modifications' },
      { label: 'IP Lab Cancellation', to: '/executive/cancellations/ip-lab' },
      { label: 'OP Services Cancellation', to: '/executive/cancellations/op-services' },
      { label: 'IP Billing Cancellation', to: '/executive/cancellations/ip-billing' },
      { label: 'IP Surgery Cancel', to: '/executive/cancellations/ip-surgery' },
    ],
  },
  {
    type: 'group', key: 'reports', label: 'Reports', icon: FileBarChart, roles: ALL_ROLES,
    children: [
      { label: 'Inpatient Lab Reports', to: '/executive/reports/ip-lab' },
      { label: 'Outpatient Lab Reports', to: '/executive/reports/op-lab' },
      { label: 'Inpatient Radiology Reports', to: '/executive/reports/ip-radiology' },
      { label: 'Outpatient Radiology Reports', to: '/executive/reports/op-radiology' },
    ],
  },
  // ============================================================
  // MASTERS GROUP (only for super_admin)
  // ============================================================
  {
    type: 'group', key: 'masters', label: 'Masters', icon: Settings, roles: ['super_admin'],
    children: [
      { label: 'Users', to: '/superadmin/users' },
      { label: 'Permission Profiles', to: '/superadmin/permission-profiles' },
      { label: 'Doctors', to: '/superadmin/doctors' },
      { label: 'Specialization', to: '/superadmin/specializations' },
      { label: 'Referral Marketing', to: '/superadmin/referral-marketing' },
      { label: 'Company', to: '/superadmin/companies' },
      { label: 'Discharge Form', to: '/superadmin/discharge-forms' },
      { label: 'Procedures', to: '/superadmin/procedures' },
      { label: 'Lab Test Category', to: '/superadmin/lab-test-categories' },
      { label: 'Lab Test Attributes', to: '/superadmin/lab-test-attributes' },
      { label: 'Lab Tests', to: '/superadmin/lab-tests' },
      { label: 'Lab Packages', to: '/superadmin/lab-packages' },
      { label: 'Lab Vendor', to: '/superadmin/lab-vendors' },
      { label: 'Radiology', to: '/superadmin/radiology' },
      { label: 'Radiology Departments', to: '/superadmin/radiology-departments' },
      { label: 'Floors', to: '/superadmin/floors' },
      { label: 'Rooms', to: '/superadmin/rooms' },
      { label: 'Room Types', to: '/superadmin/room-types' },
      { label: 'Equipment', to: '/superadmin/equipment' },
      { label: 'Operation Theatre', to: '/superadmin/operation-theatres' },
      { label: 'Insurance', to: '/superadmin/insurance' },
      { label: 'File Upload', to: '/superadmin/file-upload' },
      { label: 'Services', to: '/superadmin/services' },
      { label: 'Certificates', to: '/superadmin/certificates' },
      { label: 'Bulk Import/Export', to: '/superadmin/bulk-import' },
      { label: 'Master Refund Request Reason', to: '/superadmin/refund-reasons' },
    ],
  },
]

const TOP_PADDING = ['px-4']
const GROUP_HEADER_PADDING = ['px-4', 'pl-8 pr-4']
const LEAF_PADDING = ['pl-11 pr-4', 'pl-11 pr-4', 'pl-16 pr-4']

function flattenLinks(node) {
  if (node.type === 'link') return [node.to]
  if (node.children) return node.children.flatMap(flattenLinks)
  return node.to ? [node.to] : []
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [openGroups, setOpenGroups] = useState({})

  if (!user) return null

  const dashboardPath = user.role === 'super_admin' ? '/superadmin/dashboard'
    : user.role === 'admin' ? '/admin/dashboard'
    : user.role === 'lab_technician' ? '/lab/dashboard'
    : '/executive/dashboard'

  const billingManagementPath = user.role === 'executive' ? '/executive/billing-modifications' : '/admin/billing'

  // Pharmacy is a fully separate module. Executives only ever see the
  // executive sidebar/dashboard — no Pharmacy link. Admin and super_admin
  // get everything, including Pharmacy.
  const canSeePharmacyLink = user.role === 'admin' || user.role === 'super_admin'

  // Lab Technician link - visible to admin, super_admin, and lab_technician
  const canSeeLabLink = ['admin', 'super_admin', 'lab_technician'].includes(user.role)

  const toggleGroup = (key) => setOpenGroups((g) => ({ ...g, [key]: !g[key] }))

  const linkClass = (isActive, depth = 0) =>
    `flex items-center gap-3 py-2.5 text-sm ${TOP_PADDING[depth] || TOP_PADDING[TOP_PADDING.length - 1]} ${
      isActive ? 'bg-teal-50 text-teal-700 border-r-2 border-teal-600 font-medium' : 'text-ink/60 hover:bg-ink/5'
    }`

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const renderNode = (node, depth, shaded) => {
    if (node.type === 'link') {
      const Icon = node.icon
      return (
        <NavLink key={node.to} to={node.to} className={({ isActive }) => linkClass(isActive, depth)}>
          {Icon && <Icon size={16} className="shrink-0" />}
          {node.label}
        </NavLink>
      )
    }

    if (!node.type && node.to) {
      return (
        <NavLink
          key={node.to}
          to={node.to}
          className={({ isActive }) =>
            `block py-2 text-sm ${LEAF_PADDING[depth] || LEAF_PADDING[LEAF_PADDING.length - 1]} ${
              isActive ? 'text-teal-700 font-medium' : 'text-ink/55 hover:text-ink/80'
            }`
          }
        >
          {node.label}
        </NavLink>
      )
    }

    const allLinks = flattenLinks(node)
    const isOpen = openGroups[node.key] ?? allLinks.some((to) => location.pathname === to)
    const GroupIcon = node.icon
    const isTopLevel = depth === 0

    return (
      <div key={node.key}>
        <button
          type="button"
          onClick={() => toggleGroup(node.key)}
          className={`w-full flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-ink/5 ${
            GROUP_HEADER_PADDING[depth] || GROUP_HEADER_PADDING[GROUP_HEADER_PADDING.length - 1]
          } ${isTopLevel ? 'text-ink/70' : 'text-ink/45 text-xs font-semibold uppercase tracking-wide'}`}
        >
          <span className="flex items-center gap-3">
            {GroupIcon && <GroupIcon size={16} className="shrink-0" />}
            {node.label}
          </span>
          {isOpen ? <ChevronDown size={14} className="shrink-0" /> : <ChevronRight size={14} className="shrink-0" />}
        </button>
        {isOpen && (
          <div className={!shaded && isTopLevel ? 'bg-ink/[0.03]' : undefined}>
            {node.children.map((child) => renderNode(child, depth + 1, shaded || isTopLevel))}
          </div>
        )}
      </div>
    )
  }

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 flex flex-col border-r border-border bg-white">
      <div className="px-4 py-4 border-b border-border">
        <p className="font-semibold text-sm">HMS</p>
        <p className="text-xs text-ink/40 mt-0.5 capitalize">{user.role.replace('_', ' ')}</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        <NavLink to={dashboardPath} className={({ isActive }) => linkClass(isActive)}>
          <LayoutDashboard size={16} className="shrink-0" />
          Dashboard
        </NavLink>

        {NAV_TREE.filter((n) => !n.roles || n.roles.includes(user.role)).map((node) => renderNode(node, 0, false))}

        <NavLink to={billingManagementPath} className={({ isActive }) => linkClass(isActive)}>
          <ShieldAlert size={16} className="shrink-0" />
          Billing Management
        </NavLink>

        {canSeePharmacyLink && (
          <a
            href="/pharmacy/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink/60 hover:bg-ink/5"
          >
            <ExternalLink size={16} className="shrink-0" />
            Pharmacy
          </a>
        )}

        {/* Lab Technician link - separate from Pharmacy */}
        {canSeeLabLink && (
          <NavLink
            to="/lab/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 text-sm ${
                isActive ? 'bg-teal-50 text-teal-700 border-r-2 border-teal-600 font-medium' : 'text-ink/60 hover:bg-ink/5'
              }`
            }
          >
            <FlaskConical size={16} className="shrink-0" />
            Lab Technician
          </NavLink>
        )}

        {user.role === 'super_admin' && (
          <NavLink to="/superadmin/users" className={({ isActive }) => linkClass(isActive)}>
            <Users size={16} className="shrink-0" />
            User Management
          </NavLink>
        )}
      </nav>

      <div className="px-4 py-3 border-t border-border">
        <p className="text-xs text-ink/50 truncate mb-2">{user.email}</p>
        <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-danger-500 hover:underline">
          <LogOut size={14} className="shrink-0" /> Log out
        </button>
      </div>
    </aside>
  )
}