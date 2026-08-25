import { PageHeader } from '../../components/PageHeader'
import OPServices from '../../components/billing/OPServices'

export default function OPServicesPage() {
  return (
    <>
      <PageHeader title="OP Services" subtitle="Manage and add service items for outpatients" />
      <OPServices />
    </>
  )
}