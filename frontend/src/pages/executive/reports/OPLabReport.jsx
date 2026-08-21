import { Link } from 'react-router-dom'
import { Printer, SquarePen } from 'lucide-react'
import ReportListPage from '../../../components/reports/ReportListPage'

// Expected row shape from GET /reports/op-lab?start_date&end_date:
// {
//   id, mr_number, patient_reg_no, patient_id, name, contact, age, gender,
//   doctor_name, appointment_at,
//   lab_orders: [{ order_no: '20260821-209' }, ...]
// }
export default function OPLabReport() {
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
    { key: 'appointment_at', label: 'AppointmentAt' },
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
      onClick: () => { window.location.href = `/executive/op-billing/${row.id}` }, // TODO: confirm real edit route
    },
  ]

  return (
    <ReportListPage
      breadcrumbTrail={['Reports', 'Outpatient Lab Report']}
      fetchUrl="/reports/op-lab"
      columns={columns}
      rowActions={rowActions}
    />
  )
}