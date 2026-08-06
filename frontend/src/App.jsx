import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import ExecutiveLayout from './layouts/ExecutiveLayout'
import Dashboard from './pages/executive/Dashboard'
import PatientRegistration from './pages/executive/PatientRegistration'
import Appointments from './pages/executive/Appointments'
import OPBilling from './pages/executive/OPBilling'
import IPBilling from './pages/executive/IPBilling'
import Admission from './pages/executive/Admission'
import BillingManagement from './pages/executive/BillingManagement'
import Reports from './pages/executive/Reports'

function Protected({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/executive"
        element={
          <Protected>
            <ExecutiveLayout />
          </Protected>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="patient-registration" element={<PatientRegistration />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="op-billing" element={<OPBilling />} />
        <Route path="ip-billing" element={<IPBilling />} />
        <Route path="admission" element={<Admission />} />
        <Route path="billing-management" element={<BillingManagement />} />
        <Route path="reports" element={<Reports />} />
      </Route>
      <Route path="*" element={<Navigate to="/executive/dashboard" replace />} />
    </Routes>
  )
}
