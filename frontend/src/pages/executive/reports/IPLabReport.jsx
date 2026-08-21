import { Link } from 'react-router-dom'
import { Printer, SquarePen } from 'lucide-react'
import ReportListPage from '../../../components/reports/ReportListPage'

// Expected row shape from GET /reports/ip-lab?start_date&end_date&show_discharged:
// {
//   id, mr_number, patient_reg_no, patient_id, name, contact, age, gender,
//   doctor_name, room_type, room_no, bed_no,
//   lab_orders: [{ order_no: '20260820-108' }, ...]   // one row can have many orders
// }
export default function IPLabReport() {
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
    { key: 'age_gender', label: 'Age/Gender', render: (row) => `${row.gender} / ${row.age}Y` },
    { key: 'doctor_name', label: 'Doctor' },
    { key: 'room_type', label: 'Room Type' },
    { key: 'room_no', label: 'Room No' },
    { key: 'bed_no', label: 'Bed NO' },
    {
      key: 'lab_orders',
      label: 'Lab Order.No',
      render: (row) => (
        <div className="space-y-0.5">
          {(row.lab_orders ?? []).map((o, i) => (
            <div key={i}>{o.order_no}</div>
          ))}
        </div>
      ),
    },
  ]

  const rowActions = (row) => [
    {
      icon: <Printer size={16} />,
      label: 'Print',
      onClick: () => window.print(), // TODO: point at a real per-row print template once one exists
    },
    {
      icon: <SquarePen size={16} />,
      label: 'Edit',
      onClick: () => { window.location.href = `/executive/ip-details/${row.id}` }, // TODO: confirm real edit route
    },
  ]

  return (
    <ReportListPage
      breadcrumbTrail={['Reports', 'Inpatient Lab Report']}
      fetchUrl="/reports/ip-lab"
      columns={columns}
      rowActions={rowActions}
      showDischargedToggle
    />
  )
}