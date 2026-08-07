import { Link } from 'react-router-dom'
import { Receipt, Users } from 'lucide-react'
import { PageHeader, Section } from '../../components/PageHeader'

export default function AdminDashboard() {
  return (
    <div>
      <PageHeader title="Admin Dashboard" subtitle="Manage billing cancellations, refunds and modifications" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Link to="/admin/billing">
          <Section title="Billing Modifications">
            <div className="flex items-center gap-3 text-ink/60">
              <Receipt size={18} />
              <span>Cancellations, refunds, and reprints — full audit trail</span>
            </div>
          </Section>
        </Link>
        <Link to="/executive/dashboard">
          <Section title="Executive Overview">
            <div className="flex items-center gap-3 text-ink/60">
              <Users size={18} />
              <span>View live billing activity across the hospital</span>
            </div>
          </Section>
        </Link>
      </div>
    </div>
  )
}