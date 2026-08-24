import { PageHeader } from '../../components/PageHeader'
import IPProcedures from '../../components/billing/IPProcedures'

export default function IPProceduresPage() {
  return (
    <>
      <PageHeader title="IP Procedures" subtitle="View and filter inpatient procedures" />
      <IPProcedures />
    </>
  )
}