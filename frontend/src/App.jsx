import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import ComingSoon from './pages/ComingSoon'

import Login from './pages/auth/Login'

import SuperAdminDashboard from './pages/superadmin/Dashboard'
import UserManagement from './pages/superadmin/UserManagement'

import AdminDashboard from './pages/admin/Dashboard'
import AdminBillingManagement from './pages/admin/BillingManagement'

import ExecutiveDashboard from './pages/executive/Dashboard'
import ExecutiveBillingModifications from './pages/executive/BillingModifications'
import OutPatientList from './pages/executive/OutPatientList'
import InPatientList from './pages/executive/InPatientList'
import PatientRecords from './pages/executive/PatientRecords'
import PatientRegistration from './pages/executive/PatientRegistration'
import Appointments from './pages/executive/Appointments'
import Admission from './pages/executive/Admission'
import OPBilling from './pages/executive/OPBilling'
import IPBilling from './pages/executive/IPBilling'
import PatientStatus from './pages/executive/PatientStatus'
import RoomTransferApproval from './pages/executive/RoomTransferApproval'
import RoomOccupation from './pages/executive/RoomOccupation'
import DirectServices from './pages/executive/DirectServices'

function withLayout(el) {
  return <Layout>{el}</Layout>
}

const EXEC_ROLES = ['executive', 'admin', 'super_admin']

// label -> path for every not-yet-built module, rendered via ComingSoon
const PLACEHOLDERS = [
  ['Inpatient Dashboard', '/executive/inpatient-dashboard'],
  ['Outpatient Dashboard', '/executive/outpatient-dashboard'],
  ['Advance Payment', '/executive/advance-payment'],
  ['Discharge Summary', '/executive/discharge-summary'],
  ['New Discharge Summary', '/executive/new-discharge-summary'],
  ['Billing Summary', '/executive/billing-summary'],
  ['Referral Doctor', '/executive/referral-doctor'],
  ['Inpatient Lab Reports', '/executive/reports/ip-lab'],
  ['Outpatient Lab Reports', '/executive/reports/op-lab'],
  ['Inpatient Radiology Reports', '/executive/reports/ip-radiology'],
  ['Outpatient Radiology Reports', '/executive/reports/op-radiology'],
]

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/superadmin/dashboard" element={
          <ProtectedRoute roles={['super_admin']}>{withLayout(<SuperAdminDashboard />)}</ProtectedRoute>
        } />
        <Route path="/superadmin/users" element={
          <ProtectedRoute roles={['super_admin']}>{withLayout(<UserManagement />)}</ProtectedRoute>
        } />

        <Route path="/admin/dashboard" element={
          <ProtectedRoute roles={['admin', 'super_admin']}>{withLayout(<AdminDashboard />)}</ProtectedRoute>
        } />
        <Route path="/admin/billing" element={
          <ProtectedRoute roles={['admin', 'super_admin']}>{withLayout(<AdminBillingManagement />)}</ProtectedRoute>
        } />

        <Route path="/executive/dashboard" element={
          <ProtectedRoute roles={EXEC_ROLES}>{withLayout(<ExecutiveDashboard />)}</ProtectedRoute>
        } />
        <Route path="/executive/billing-modifications" element={
          <ProtectedRoute roles={EXEC_ROLES}>{withLayout(<ExecutiveBillingModifications />)}</ProtectedRoute>
        } />
        <Route path="/executive/patient-registration" element={
          <ProtectedRoute roles={EXEC_ROLES}>{withLayout(<PatientRegistration />)}</ProtectedRoute>
        } />
        <Route path="/executive/appointments" element={
          <ProtectedRoute roles={EXEC_ROLES}>{withLayout(<Appointments />)}</ProtectedRoute>
        } />
        <Route path="/executive/admission" element={
          <ProtectedRoute roles={EXEC_ROLES}>{withLayout(<Admission />)}</ProtectedRoute>
        } />
        <Route path="/executive/op-billing" element={
          <ProtectedRoute roles={EXEC_ROLES}>{withLayout(<OPBilling />)}</ProtectedRoute>
        } />
        <Route path="/executive/ip-billing" element={
          <ProtectedRoute roles={EXEC_ROLES}>{withLayout(<IPBilling />)}</ProtectedRoute>
        } />
        <Route path="/executive/out-patients" element={
          <ProtectedRoute roles={EXEC_ROLES}>{withLayout(<OutPatientList />)}</ProtectedRoute>
        } />
        <Route path="/executive/in-patients" element={
          <ProtectedRoute roles={EXEC_ROLES}>{withLayout(<InPatientList />)}</ProtectedRoute>
        } />
        <Route path="/executive/patient-records" element={
          <ProtectedRoute roles={EXEC_ROLES}>{withLayout(<PatientRecords />)}</ProtectedRoute>
        } />
        <Route path="/executive/direct-services" element={
  <ProtectedRoute roles={EXEC_ROLES}>{withLayout(<DirectServices />)}</ProtectedRoute>
} />
<Route path="/executive/room-occupation" element={
  <ProtectedRoute roles={EXEC_ROLES}>{withLayout(<RoomOccupation />)}</ProtectedRoute>
} />
<Route path="/executive/room-transfer-approval" element={
  <ProtectedRoute roles={EXEC_ROLES}>{withLayout(<RoomTransferApproval />)}</ProtectedRoute>
} />
<Route path="/executive/patient-status" element={
  <ProtectedRoute roles={EXEC_ROLES}>{withLayout(<PatientStatus />)}</ProtectedRoute>
} />

        {PLACEHOLDERS.map(([label, path]) => (
          <Route key={path} path={path} element={
            <ProtectedRoute roles={EXEC_ROLES}>{withLayout(<ComingSoon title={label} />)}</ProtectedRoute>
          } />
        ))}

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  )
}