import { useState } from 'react'
import { PageHeader } from '../../components/PageHeader'
import OPRegistrationForm from '../../components/registration/OPRegistrationForm'
import IPRegistrationForm from '../../components/registration/IPRegistrationForm'

export default function PatientRegistration() {
  const [type, setType] = useState('OP')

  return (
    <div>
      <PageHeader title="Patient Registration" subtitle="Register a new outpatient or inpatient" />

      <div className="flex items-center gap-6 mb-4 px-1">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="radio" name="regType" checked={type === 'OP'} onChange={() => setType('OP')} />
          Out Patient
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="radio" name="regType" checked={type === 'IP'} onChange={() => setType('IP')} />
          In Patient
        </label>
      </div>

      {type === 'OP' ? <OPRegistrationForm /> : <IPRegistrationForm />}
    </div>
  )
}