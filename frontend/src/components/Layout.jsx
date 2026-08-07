import Sidebar from './Sidebar'

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-ink/[0.02]">
      <Sidebar />
      <main className="flex-1 p-6 overflow-x-hidden">{children}</main>
    </div>
  )
}