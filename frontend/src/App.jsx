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
import PharmacyLayout from './components/pharmacy/PharmacyLayout'
import PharmacyDashboard from './pages/pharmacy/Dashboard'
import PharmacyComingSoon from './pages/pharmacy/ComingSoon'
import InpatientSales from './pages/pharmacy/InpatientSales'
import OutpatientSales from './pages/pharmacy/OutpatientSales'
import PatientIndents from './pages/pharmacy/PatientIndents'
import OTIndents from './pages/pharmacy/OTIndents'
import AdvancePayment from './pages/executive/AdvancePayment'
import AdvancePaymentDetail from './pages/executive/AdvancePaymentDetail'
import IPDetails from './pages/executive/IPDetails'
import IPLabReport from './pages/executive/reports/IPLabReport'
import OPLabReport from './pages/executive/reports/OPLabReport'
import IPRadiologyReport from './pages/executive/reports/IPRadiologyReport'
import OPRadiologyReport from './pages/executive/reports/OPRadiologyReport'

function withLayout(el) {
  return <Layout>{el}</Layout>
}
function withPharmacyLayout(el) {
  return <PharmacyLayout>{el}</PharmacyLayout>
}

const EXEC_ROLES = ['executive', 'admin', 'super_admin']

// label -> path for every not-yet-built module, rendered via ComingSoon.
// The 4 lab/radiology report paths used to live here — they now have real
// pages (see the explicit <Route> block below), so they were removed from
// this list.
const PLACEHOLDERS = [
  ['Inpatient Dashboard', '/executive/inpatient-dashboard'],
  ['Outpatient Dashboard', '/executive/outpatient-dashboard'],
  ['Advance Payment', '/executive/advance-payment'],
  ['Discharge Summary', '/executive/discharge-summary'],
  ['New Discharge Summary', '/executive/new-discharge-summary'],
  ['Billing Summary', '/executive/billing-summary'],
  ['Referral Doctor', '/executive/referral-doctor'],
]

const PHARMACY_ROLES = EXEC_ROLES

const PHARMACY_PLACEHOLDERS = [
  ['Inventory Type', '/pharmacy/masters/inventory-type'],
  ['Item Type', '/pharmacy/masters/item-type'],
  ['Supplier', '/pharmacy/masters/supplier'],
  ['Manufacturer', '/pharmacy/masters/manufacturer'],
  ['Tax Categories', '/pharmacy/masters/tax-categories'],
  ['Rack Master', '/pharmacy/masters/rack-master'],
  ['Item Master', '/pharmacy/masters/item-master'],
  ['Item Package Master', '/pharmacy/masters/item-package-master'],
  ['Drug Combination', '/pharmacy/masters/drug-combination'],
  ['Purchase Order', '/pharmacy/transaction/purchase-order'],
  ['Goods Receive Note', '/pharmacy/transaction/goods-receive-note'],
  ['Stock Adjustments', '/pharmacy/transaction/stock-adjustments'],
  ['Stock Returns', '/pharmacy/transaction/stock-returns'],
  ['Inpatient Sales Returns', '/pharmacy/sales-returns/inpatient'],
  ['Outpatient Sales Returns', '/pharmacy/sales-returns/outpatient'],
  ['Duplicate Invoice', '/pharmacy/duplicate-invoice'],
  ['Total Dues', '/pharmacy/reports/total-dues'],
  ['Due Reported Sales', '/pharmacy/reports/due-reported-sales'],
  ['Sales Returns Report', '/pharmacy/reports/sales-returns'],
  ['OP/IP Sales Report', '/pharmacy/reports/op-ip-sales'],
  ['OP/IP Due Report', '/pharmacy/reports/op-ip-due'],
  ['Pharmacy Report', '/pharmacy/reports/pharmacy'],
  ['Sales Report', '/pharmacy/reports/sales'],
  ['Due Collections', '/pharmacy/due-collections'],
  ['Stock', '/pharmacy/stock'],
  ['Expenses', '/pharmacy/expenses'],
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

<Route path="/pharmacy/dashboard" element={
  <ProtectedRoute roles={PHARMACY_ROLES}>{withPharmacyLayout(<PharmacyDashboard />)}</ProtectedRoute>
} />

{PHARMACY_PLACEHOLDERS.map(([label, path]) => (
  <Route key={path} path={path} element={
    <ProtectedRoute roles={PHARMACY_ROLES}>{withPharmacyLayout(<PharmacyComingSoon title={label} />)}</ProtectedRoute>
  } />
))}

<Route path="/executive/ip-advance" element={
  <ProtectedRoute roles={EXEC_ROLES}>{withLayout(<AdvancePayment />)}</ProtectedRoute>
} />
<Route path="/executive/ip-advance/:id" element={
  <ProtectedRoute roles={EXEC_ROLES}>{withLayout(<AdvancePaymentDetail />)}</ProtectedRoute>
} />
<Route path="/executive/ip-details" element={
  <ProtectedRoute roles={EXEC_ROLES}>{withLayout(<IPDetails />)}</ProtectedRoute>
} />

<Route path="/pharmacy/sales/inpatient" element={
  <ProtectedRoute roles={PHARMACY_ROLES}>{withPharmacyLayout(<InpatientSales />)}</ProtectedRoute>
} />
<Route path="/pharmacy/sales/outpatient" element={
  <ProtectedRoute roles={PHARMACY_ROLES}>{withPharmacyLayout(<OutpatientSales />)}</ProtectedRoute>
} />
<Route path="/pharmacy/sales/patient-indents" element={
  <ProtectedRoute roles={PHARMACY_ROLES}>{withPharmacyLayout(<PatientIndents />)}</ProtectedRoute>
} />
<Route path="/pharmacy/sales/ot-indents" element={
  <ProtectedRoute roles={PHARMACY_ROLES}>{withPharmacyLayout(<OTIndents />)}</ProtectedRoute>
} />

{/* Lab / Radiology reports — real pages now, no longer ComingSoon */}
<Route path="/executive/reports/ip-lab" element={
  <ProtectedRoute roles={EXEC_ROLES}>{withLayout(<IPLabReport />)}</ProtectedRoute>
} />
<Route path="/executive/reports/op-lab" element={
  <ProtectedRoute roles={EXEC_ROLES}>{withLayout(<OPLabReport />)}</ProtectedRoute>
} />
<Route path="/executive/reports/ip-radiology" element={
  <ProtectedRoute roles={EXEC_ROLES}>{withLayout(<IPRadiologyReport />)}</ProtectedRoute>
} />
<Route path="/executive/reports/op-radiology" element={
  <ProtectedRoute roles={EXEC_ROLES}>{withLayout(<OPRadiologyReport />)}</ProtectedRoute>
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