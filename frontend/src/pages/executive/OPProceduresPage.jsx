import { PageHeader } from '../../components/PageHeader'
import OPProcedures from '../../components/billing/OPProcedures'

export default function OPProceduresPage() {
  return (
    <>
      <PageHeader title="OP Procedures" subtitle="Manage and add procedure items for outpatients" />
      <OPProcedures />
    </>
  )
}