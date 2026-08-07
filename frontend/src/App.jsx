import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'

import Login from './pages/auth/Login'

import SuperAdminDashboard from './pages/superadmin/Dashboard'
import UserManagement from './pages/superadmin/UserManagement'

import AdminDashboard from './pages/admin/Dashboard'
import AdminBillingManagement from './pages/admin/BillingManagement'

import ExecutiveDashboard from './pages/executive/Dashboard'
import ExecutiveBillingModifications from './pages/executive/BillingModifications'

// ⚠️ Confirm these paths match your real files — adjust if they live elsewhere
import PatientRegistration from './pages/executive/PatientRegistration'
import Appointments from './pages/executive/Appointments'
import Admission from './pages/executive/Admission'
import OPBilling from './pages/executive/OPBilling'
import IPBilling from './pages/executive/IPBilling'

function withLayout(el) {
  return <Layout>{el}</Layout>
}

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
          <ProtectedRoute roles={['executive', 'admin', 'super_admin']}>{withLayout(<ExecutiveDashboard />)}</ProtectedRoute>
        } />
        <Route path="/executive/billing-modifications" element={
          <ProtectedRoute roles={['executive', 'admin', 'super_admin']}>{withLayout(<ExecutiveBillingModifications />)}</ProtectedRoute>
        } />
        <Route path="/executive/patient-registration" element={
          <ProtectedRoute roles={['executive', 'admin', 'super_admin']}>{withLayout(<PatientRegistration />)}</ProtectedRoute>
        } />
        <Route path="/executive/appointments" element={
          <ProtectedRoute roles={['executive', 'admin', 'super_admin']}>{withLayout(<Appointments />)}</ProtectedRoute>
        } />
        <Route path="/executive/admission" element={
          <ProtectedRoute roles={['executive', 'admin', 'super_admin']}>{withLayout(<Admission />)}</ProtectedRoute>
        } />
        <Route path="/executive/op-billing" element={
          <ProtectedRoute roles={['executive', 'admin', 'super_admin']}>{withLayout(<OPBilling />)}</ProtectedRoute>
        } />
        <Route path="/executive/ip-billing" element={
          <ProtectedRoute roles={['executive', 'admin', 'super_admin']}>{withLayout(<IPBilling />)}</ProtectedRoute>
        } />

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  )
}