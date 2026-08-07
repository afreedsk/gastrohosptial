import { PageHeader } from '../../components/PageHeader'
import BillingActionsTable from '../../components/billing/BillingActionsTable'

export default function ExecutiveBillingModifications() {
  return (
    <div>
      <PageHeader title="Billing Modifications" subtitle="Read-only — updates automatically as Admin/Super Admin take action" />
      <BillingActionsTable pollIntervalMs={5000} />
    </div>
  )
}