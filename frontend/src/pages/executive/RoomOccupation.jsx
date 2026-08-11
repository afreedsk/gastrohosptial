import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import api from '../../api/axios'
import { PageHeader, Section } from '../../components/PageHeader'

export default function RoomOccupation() {
  const [rooms, setRooms] = useState([])
  const [search, setSearch] = useState('')

  const load = (q = '') => api.get('/room-occupancy', { params: { search: q } }).then((r) => setRooms(r.data))
  useEffect(() => { load() }, [])

  return (
    <div>
      <PageHeader title="Room Occupation" subtitle="Live bed availability by floor and room" />

      <Section title="Rooms">
        <div className="flex justify-end mb-3">
          <div className="flex items-center gap-2 max-w-sm">
            <Search size={14} className="text-ink/40" />
            <input
              className="input"
              placeholder="Search floor / room no / category"
              value={search}
              onChange={(e) => { setSearch(e.target.value); load(e.target.value) }}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Floor Name</th><th>Room Number</th><th>Room Category</th>
                <th>Total Beds</th><th>Occupied Beds</th><th>Available Beds</th><th>Bed No</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((r) => (
                <tr key={r.room_id}>
                  <td>{r.floor_name}</td>
                  <td>{r.room_no}</td>
                  <td>{r.room_type}</td>
                  <td>{r.total_beds}</td>
                  <td>{r.occupied_beds}</td>
                  <td>{r.available_beds}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {r.beds.map((b) => (
                        <span
                          key={b.bed_no}
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            b.status === 'Occupied' ? 'bg-danger-400/10 text-danger-500'
                              : b.status === 'Maintenance' ? 'bg-amber-100 text-amber-700'
                              : 'bg-teal-50 text-teal-700'
                          }`}
                        >
                          {b.bed_no}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {!rooms.length && <tr><td colSpan={7} className="text-center text-ink/40 py-8">No rooms found</td></tr>}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}