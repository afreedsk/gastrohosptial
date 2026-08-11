import { Construction } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'

export default function ComingSoon({ title }) {
  return (
    <div>
      <PageHeader title={title} subtitle="This module is not built yet" />
      <div className="flex flex-col items-center justify-center py-20 text-ink/40">
        <Construction size={40} className="mb-3" />
        <p className="text-sm">{title} is coming soon.</p>
      </div>
    </div>
  )
}