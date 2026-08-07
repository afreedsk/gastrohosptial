import { useState } from 'react'
import { PageHeader } from '../../components/PageHeader'
import BillingActionForm from '../../components/billing/BillingActionForm'
import BillingActionsTable from '../../components/billing/BillingActionsTable'

export default function BillingManagement() {
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div>
      <PageHeader title="Billing Modifications" subtitle="Cancellations, modifications and refunds — logged with full audit trail" />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-1">
          <BillingActionForm onCreated={() => setRefreshKey((k) => k + 1)} />
        </div>
        <div className="xl:col-span-2">
          <BillingActionsTable pollIntervalMs={5000} refreshKey={refreshKey} />
        </div>
      </div>
    </div>
  )
}