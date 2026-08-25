import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Printer, Save, XCircle, Eye, Plus, Trash2 } from 'lucide-react'
import api from '../../api/axios'
import { PageHeader, Section } from '../../components/PageHeader'
import DoctorSelect from '../../components/registration/DoctorSelect'
import RichTextEditor from '../../components/RichTextEditor'

function formatDate(dt) {
  if (!dt) return ''
  const d = new Date(dt)
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const emptySummary = {
  ip_registration_id: '',
  patient_name: '',
  gender: '',
  age: '',
  mobile: '',
  admit_date: '',
  discharge_date: '',
  surgery_date: '',
  doctor_id: '',
  department: '',
  diagnosis: '',
  procedure: '',
  complaint: '',
  past_history: '',
  drug_history: '',
  surgical_history: '',
  examination: {
    temp: '', bp: '', pulse: '', rr: '', spo2: '', pa: '', cvs: '', cns: '', blood_group: ''
  },
  investigations: '',
  course_hospitalization: '',
  condition_discharge: '',
  discharge_advise: [],
}

function AdmittedPatientList({ onSelect }) {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/ip-registrations', { params: { status: 'Admitted' } })
      .then(res => setPatients(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center">Loading admitted patients...</div>
  if (!patients.length) return <div className="p-8 text-center text-ink/50">No admitted patients found.</div>

  return (
    <div className="overflow-x-auto">
      <table className="table-base">
        <thead>
          <tr>
            <th>MR Number</th>
            <th>Patient Reg No</th>
            <th>Name</th>
            <th>Consultant</th>
            <th>Contact</th>
            <th>Gender / Age</th>
            <th>Room Type</th>
            <th>Room No</th>
            <th>Bed No</th>
            <th>Admit Date</th>
            <th>Discharge Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {patients.map(p => (
            <tr key={p.id}>
              <td>{p.mr_number || '—'}</td>
              <td>{p.ip_reg_no || '—'}</td>
              <td>{p.name}</td>
              <td>{p.doctor_name || '—'}</td>
              <td>{p.mobile || '—'}</td>
              <td>{p.gender} / {p.age}Y</td>
              <td>{p.room_type || '—'}</td>
              <td>{p.room_no || '—'}</td>
              <td>{p.bed_no || '—'}</td>
              <td>{formatDate(p.admitted_date)}</td>
              <td>{p.discharge_date ? formatDate(p.discharge_date) : '—'}</td>
              <td>
                <button onClick={() => onSelect(p.id)} className="text-teal-600 hover:underline flex items-center gap-1">
                  <Eye size={14} /> View / Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function DischargeSummary() {
  const { id } = useParams()
  const navigate = useNavigate()

  // All hooks must be called unconditionally
  const [summary, setSummary] = useState(emptySummary)
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    // Load doctors always
    api.get('/doctors')
      .then(res => setDoctors(res.data))
      .catch(err => console.error('Failed to load doctors', err))

    // If we have an id, load the patient and summary data
    if (id) {
      Promise.all([
        api.get(`/ip-registrations/${id}`),
        api.get(`/discharge-summary/${id}`).catch(() => ({ data: null }))
      ])
        .then(([admissionRes, summaryRes]) => {
          const adm = admissionRes.data
          const existing = summaryRes.data || {}
          setSummary({
            ip_registration_id: adm.id,
            patient_name: adm.name || '',
            gender: adm.gender || '',
            age: adm.age || '',
            mobile: adm.mobile || '',
            admit_date: adm.admitted_date || '',
            discharge_date: adm.discharge_date || '',
            surgery_date: existing.surgery_date || '',
            doctor_id: adm.doctor_id || existing.doctor_id || '',
            department: adm.department || existing.department || '',
            diagnosis: existing.diagnosis || '',
            procedure: existing.procedure || '',
            complaint: existing.complaint || '',
            past_history: existing.past_history || '',
            drug_history: existing.drug_history || '',
            surgical_history: existing.surgical_history || '',
            examination: {
              temp: existing.examination?.temp || '',
              bp: existing.examination?.bp || '',
              pulse: existing.examination?.pulse || '',
              rr: existing.examination?.rr || '',
              spo2: existing.examination?.spo2 || '',
              pa: existing.examination?.pa || '',
              cvs: existing.examination?.cvs || '',
              cns: existing.examination?.cns || '',
              blood_group: existing.examination?.blood_group || adm.blood_group || '',
            },
            investigations: existing.investigations || '',
            course_hospitalization: existing.course_hospitalization || '',
            condition_discharge: existing.condition_discharge || '',
            discharge_advise: existing.discharge_advise || [],
          })
          setLoading(false)
        })
        .catch(err => {
          setError('Failed to load patient data')
          console.error(err)
          setLoading(false)
        })
    } else {
      // No id, we are in list view, no need to load patient data
      setLoading(false)
    }
  }, [id])

  // If no id, render the list view (after hooks)
  if (!id) {
    return (
      <div>
        <PageHeader title="Discharge Summary" subtitle="Select an admitted patient to create/update discharge summary" />
        <AdmittedPatientList onSelect={(patientId) => navigate(`/executive/discharge-summary/${patientId}`)} />
      </div>
    )
  }

  // Now we are in detail view – define all handlers and return the detail form
  const setField = (field, value) => {
    setSummary(prev => ({ ...prev, [field]: value }))
  }

  const setExam = (field, value) => {
    setSummary(prev => ({
      ...prev,
      examination: { ...prev.examination, [field]: value }
    }))
  }

  const handleDoctorChange = (doctorId) => {
    const doc = doctors.find(d => String(d.id) === String(doctorId))
    setField('doctor_id', doctorId)
    if (doc) setField('department', doc.department || '')
  }

  const handleDoctorAdded = (doc) => {
    setDoctors(prev => [...prev, doc])
    setField('doctor_id', doc.id)
    if (doc.department) setField('department', doc.department)
  }

  const addAdviseItem = () => {
    setSummary(prev => ({
      ...prev,
      discharge_advise: [
        ...prev.discharge_advise,
        { id: Date.now(), label: '', mrg: false, afternoon: false, night: false, days: '', afbf: 'A/F', description: '' }
      ]
    }))
  }

  const updateAdviseItem = (index, field, value) => {
    setSummary(prev => {
      const updated = [...prev.discharge_advise]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, discharge_advise: updated }
    })
  }

  const removeAdviseItem = (index) => {
    setSummary(prev => ({
      ...prev,
      discharge_advise: prev.discharge_advise.filter((_, i) => i !== index)
    }))
  }

  const saveSummary = async (withLogo = false) => {
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      const payload = {
        ...summary,
        examination: JSON.stringify(summary.examination),
        discharge_advise: summary.discharge_advise,
      }
      await api.post('/discharge-summary', payload)
      setSuccess(`Discharge summary saved${withLogo ? ' with logo' : ''}`)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save discharge summary')
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) return <div className="p-8 text-center">Loading patient data...</div>

  return (
    <div>
      <PageHeader title="Discharge Summary" subtitle={`Patient: ${summary.patient_name}`} />
      {error && <div className="text-sm text-danger-500 bg-danger-50 border border-danger-200 rounded-sm px-3 py-2 mb-4">{error}</div>}
      {success && <div className="text-sm text-teal-700 bg-teal-50 border border-teal-100 rounded-sm px-3 py-2 mb-4">{success}</div>}

      <div className="space-y-6">
        {/* Patient Details */}
        <Section title="Patient Details">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div><label className="label">Patient Reg. No.</label>
              <input className="input bg-gray-50" value={summary.ip_registration_id || ''} readOnly /></div>
            <div><label className="label">Patient Name</label>
              <input className="input bg-gray-50" value={summary.patient_name} readOnly /></div>
            <div><label className="label">Gender / Age</label>
              <input className="input bg-gray-50" value={`${summary.gender} / ${summary.age}Y`} readOnly /></div>
            <div><label className="label">Mobile</label>
              <input className="input bg-gray-50" value={summary.mobile} readOnly /></div>
            <div><label className="label">Admit Date</label>
              <input className="input bg-gray-50" value={formatDate(summary.admit_date)} readOnly /></div>
            <div><label className="label">Discharge Date</label>
              <input type="date" className="input" value={summary.discharge_date || ''}
                onChange={(e) => setField('discharge_date', e.target.value)} /></div>
            <div><label className="label">Surgery Date</label>
              <input type="date" className="input" value={summary.surgery_date || ''}
                onChange={(e) => setField('surgery_date', e.target.value)} /></div>
          </div>
        </Section>

        {/* Doctor Info */}
        <Section title="Doctor Info">
          <div className="grid grid-cols-2 gap-4">
            <DoctorSelect
              label="Doctor Name"
              doctors={doctors}
              value={summary.doctor_id}
              onChange={handleDoctorChange}
              onDoctorAdded={handleDoctorAdded}
            />
            <div><label className="label">Department</label>
              <input className="input" value={summary.department} onChange={(e) => setField('department', e.target.value)} /></div>
          </div>
        </Section>

        {/* Rich Text Sections */}
        <Section title="Diagnosis">
          <RichTextEditor value={summary.diagnosis} onChange={(val) => setField('diagnosis', val)} />
        </Section>

        <Section title="Procedure">
          <RichTextEditor value={summary.procedure} onChange={(val) => setField('procedure', val)} />
        </Section>

        <Section title="Complaint Of Patient At The Time Of Admission">
          <RichTextEditor value={summary.complaint} onChange={(val) => setField('complaint', val)} />
        </Section>

        <Section title="Past History">
          <RichTextEditor value={summary.past_history} onChange={(val) => setField('past_history', val)} />
        </Section>

        <Section title="Drug History">
          <RichTextEditor value={summary.drug_history} onChange={(val) => setField('drug_history', val)} />
        </Section>

        <Section title="Surgical History">
          <RichTextEditor value={summary.surgical_history} onChange={(val) => setField('surgical_history', val)} />
        </Section>

        {/* On Examination */}
        <Section title="On Examination">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><label className="label">Temp</label><input className="input" value={summary.examination.temp} onChange={(e) => setExam('temp', e.target.value)} /></div>
            <div><label className="label">BP</label><input className="input" value={summary.examination.bp} onChange={(e) => setExam('bp', e.target.value)} /></div>
            <div><label className="label">Pulse</label><input className="input" value={summary.examination.pulse} onChange={(e) => setExam('pulse', e.target.value)} /></div>
            <div><label className="label">RR</label><input className="input" value={summary.examination.rr} onChange={(e) => setExam('rr', e.target.value)} /></div>
            <div><label className="label">SPO2</label><input className="input" value={summary.examination.spo2} onChange={(e) => setExam('spo2', e.target.value)} /></div>
            <div><label className="label">P/A</label><input className="input" value={summary.examination.pa} onChange={(e) => setExam('pa', e.target.value)} /></div>
            <div><label className="label">CVS</label><input className="input" value={summary.examination.cvs} onChange={(e) => setExam('cvs', e.target.value)} /></div>
            <div><label className="label">CNS</label><input className="input" value={summary.examination.cns} onChange={(e) => setExam('cns', e.target.value)} /></div>
            <div><label className="label">Blood Group</label>
              <select className="input" value={summary.examination.blood_group} onChange={(e) => setExam('blood_group', e.target.value)}>
                <option value="">--</option>
                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
          </div>
        </Section>

        <Section title="Investigations">
          <RichTextEditor value={summary.investigations} onChange={(val) => setField('investigations', val)} />
        </Section>

        <Section title="Course During The Hospitalization / Treatment">
          <RichTextEditor value={summary.course_hospitalization} onChange={(val) => setField('course_hospitalization', val)} />
        </Section>

        <Section title="Condition At The Time Of Discharge">
          <RichTextEditor value={summary.condition_discharge} onChange={(val) => setField('condition_discharge', val)} />
        </Section>

        {/* Discharge Advise - Structured */}
        <Section title="Discharge Advise">
          <div className="space-y-4">
            {summary.discharge_advise.map((item, index) => (
              <div key={item.id} className="border border-border p-4 rounded-sm relative">
                <button
                  type="button"
                  onClick={() => removeAdviseItem(index)}
                  className="absolute top-2 right-2 text-danger-500 hover:text-danger-700"
                >
                  <Trash2 size={16} />
                </button>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div className="md:col-span-2">
                    <label className="label">Label</label>
                    <input className="input" value={item.label} onChange={(e) => updateAdviseItem(index, 'label', e.target.value)} placeholder="e.g. TAB. ZEMCEF 200 MG – 1-0-1" />
                  </div>
                  <div>
                    <label className="label">MRG</label>
                    <input type="checkbox" className="mt-1 block" checked={item.mrg} onChange={(e) => updateAdviseItem(index, 'mrg', e.target.checked)} />
                  </div>
                  <div>
                    <label className="label">Afternoon</label>
                    <input type="checkbox" className="mt-1 block" checked={item.afternoon} onChange={(e) => updateAdviseItem(index, 'afternoon', e.target.checked)} />
                  </div>
                  <div>
                    <label className="label">Night</label>
                    <input type="checkbox" className="mt-1 block" checked={item.night} onChange={(e) => updateAdviseItem(index, 'night', e.target.checked)} />
                  </div>
                  <div>
                    <label className="label">No. of Days</label>
                    <input type="number" className="input" value={item.days} onChange={(e) => updateAdviseItem(index, 'days', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">A/F / B/F</label>
                    <select className="input" value={item.afbf} onChange={(e) => updateAdviseItem(index, 'afbf', e.target.value)}>
                      <option value="A/F">A/F</option>
                      <option value="B/F">B/F</option>
                    </select>
                  </div>
                  <div className="md:col-span-5">
                    <label className="label">Description</label>
                    <textarea className="input w-full" rows="2" value={item.description} onChange={(e) => updateAdviseItem(index, 'description', e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
            <button type="button" onClick={addAdviseItem} className="btn-secondary flex items-center gap-2">
              <Plus size={16} /> Add New +
            </button>
          </div>
        </Section>

        {/* Buttons */}
        <div className="flex flex-wrap gap-3">
          <button className="btn-primary flex items-center gap-2" onClick={() => saveSummary(false)} disabled={saving}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save'}
          </button>
          <button className="btn-primary flex items-center gap-2" onClick={() => saveSummary(true)} disabled={saving}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save & with logo'}
          </button>
          <button className="btn-secondary flex items-center gap-2" onClick={handlePrint}>
            <Printer size={16} /> Print
          </button>
          <button className="btn-secondary flex items-center gap-2" onClick={() => navigate(-1)}>
            <XCircle size={16} /> Cancel
          </button>
        </div>
      </div>
    </div>
  )
}