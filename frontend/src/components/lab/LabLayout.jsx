import { Outlet } from 'react-router-dom'
import LabSidebar from './LabSidebar'

export default function LabLayout() {
  return (
    <div className="min-h-screen flex">
      <LabSidebar />
      <main className="flex-1 min-w-0 bg-surface">
        <div className="max-w-7xl mx-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}