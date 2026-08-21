import PharmacySidebar from './PharmacySidebar'

export default function PharmacyLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-ink/[0.02]">
      <PharmacySidebar />
      <main className="flex-1 p-6 overflow-x-hidden">{children}</main>
    </div>
  )
}