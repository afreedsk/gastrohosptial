import { PageHeader } from '../../components/PageHeader'
import OPLab from '../../components/billing/OPLab'

export default function OPLabPage() {
  return (
    <>
      <PageHeader title="OP Lab" subtitle="Manage and add lab items for outpatients" />
      <OPLab />
    </>
  )
}