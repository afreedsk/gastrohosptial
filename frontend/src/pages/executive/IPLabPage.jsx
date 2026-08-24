import { PageHeader } from '../../components/PageHeader'
import IPLab from '../../components/billing/IPLab'

export default function IPLabPage() {
  return (
    <>
      <PageHeader title="IP Lab" subtitle="View and filter inpatient lab records" />
      <IPLab />
    </>
  )
}