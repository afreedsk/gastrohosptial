import { Link } from 'react-router-dom'
import { SquarePen } from 'lucide-react'
import ReportListPage from '../../../components/reports/ReportListPage'

// Expected row shape from GET /reports/op-radiology?start_date&end_date:
// {
//   id, mr_number, patient_reg_no, patient_id, name, contact, age, gender,
//   doctor_name, appointment_at
// }
export default function OPRadiologyReport() {
  const columns = [
    { key: 'mr_number', label: 'MR Number' },
    {
      key: 'patient_reg_no',
      label: 'Patient Reg. No',
      render: (row) => (
        <Link to={`/executive/patient-records?reg=${row.patient_reg_no}`} className="text-teal-600 hover:underline">
          {row.patient_reg_no}
        </Link>
      ),
    },
    { key: 'name', label: 'Name' },
    { key: 'contact', label: 'Contact' },
    { key: 'gender', label: 'Gender' },
    { key: 'age', label: 'Age' },
    { key: 'doctor_name', label: 'Doctor' },
    { key: 'appointment_at', label: 'Appointment At' },
  ]

  const rowActions = (row) => [
    {
      icon: <SquarePen size={16} />,
      label: 'Edit',
      onClick: () => { window.location.href = `/executive/op-billing/${row.id}` }, // TODO: confirm real edit route
    },
  ]

  return (
    <ReportListPage
      breadcrumbTrail={['Reports', 'Outpatient Radiology Report']}
      fetchUrl="/reports/op-radiology"
      columns={columns}
      rowActions={rowActions}
      emptyText="No billing details available."
    />
  )
}