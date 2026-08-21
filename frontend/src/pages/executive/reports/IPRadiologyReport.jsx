import { Link } from 'react-router-dom'
import { SquarePen } from 'lucide-react'
import ReportListPage from '../../../components/reports/ReportListPage'

// Expected row shape from GET /reports/ip-radiology?start_date&end_date&show_discharged:
// {
//   id, mr_number, patient_reg_no, patient_id, name, contact, age, gender,
//   doctor_name, room_type, room_no, bed_no
// }
export default function IPRadiologyReport() {
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
    { key: 'room_type', label: 'Room Type' },
    { key: 'room_no', label: 'Room No' },
    { key: 'bed_no', label: 'Bed. NO' },
  ]

  const rowActions = (row) => [
    {
      icon: <SquarePen size={16} />,
      label: 'Edit',
      onClick: () => { window.location.href = `/executive/ip-details/${row.id}` }, // TODO: confirm real edit route
    },
  ]

  return (
    <ReportListPage
      breadcrumbTrail={['Reports', 'Inpatient Radiology Report']}
      fetchUrl="/reports/ip-radiology"
      columns={columns}
      rowActions={rowActions}
      showDischargedToggle
    />
  )
}