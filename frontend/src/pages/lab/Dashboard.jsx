import { useEffect, useState } from 'react'
import { FileBarChart, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import api from '../../api/axios'
import { PageHeader } from '../../components/PageHeader'

export default function LabDashboard() {
  const [stats, setStats] = useState({
    op_pending: 0,
    op_completed: 0,
    ip_pending: 0,
    ip_completed: 0,
    total: 0
  })

  useEffect(() => {
    // Fetch OP stats
    api.get('/lab-reports/op?status=Pending').then(res => {
      setStats(prev => ({ ...prev, op_pending: res.data.length }))
    }).catch(console.error)
    api.get('/lab-reports/op?status=Completed').then(res => {
      setStats(prev => ({ ...prev, op_completed: res.data.length }))
    }).catch(console.error)
    api.get('/lab-reports/ip?status=Pending').then(res => {
      setStats(prev => ({ ...prev, ip_pending: res.data.length }))
    }).catch(console.error)
    api.get('/lab-reports/ip?status=Completed').then(res => {
      setStats(prev => ({ ...prev, ip_completed: res.data.length }))
    }).catch(console.error)
  }, [])

  const total = stats.op_pending + stats.op_completed + stats.ip_pending + stats.ip_completed

  return (
    <div>
      <PageHeader title="Lab Dashboard" subtitle="Overview of lab reports" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-border rounded-sm p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-full">
              <Clock size={20} className="text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-ink/50">OP Pending</p>
              <p className="text-2xl font-semibold">{stats.op_pending}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-border rounded-sm p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-full">
              <CheckCircle size={20} className="text-green-500" />
            </div>
            <div>
              <p className="text-sm text-ink/50">OP Completed</p>
              <p className="text-2xl font-semibold">{stats.op_completed}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-border rounded-sm p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-full">
              <Clock size={20} className="text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-ink/50">IP Pending</p>
              <p className="text-2xl font-semibold">{stats.ip_pending}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-border rounded-sm p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-full">
              <CheckCircle size={20} className="text-green-500" />
            </div>
            <div>
              <p className="text-sm text-ink/50">IP Completed</p>
              <p className="text-2xl font-semibold">{stats.ip_completed}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-border rounded-sm p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-50 rounded-full">
            <FileBarChart size={20} className="text-teal-600" />
          </div>
          <div>
            <p className="text-sm text-ink/50">Total Reports</p>
            <p className="text-2xl font-semibold">{total}</p>
          </div>
        </div>
      </div>
    </div>
  )
}