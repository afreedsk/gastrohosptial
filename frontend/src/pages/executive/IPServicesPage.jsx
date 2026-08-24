import { PageHeader } from '../../components/PageHeader'
import IPServices from '../../components/billing/IPServices'

export default function IPServicesPage() {
  return (
    <>
      <PageHeader title="IP Services" subtitle="View and filter inpatient services" />
      <IPServices />
    </>
  )
}