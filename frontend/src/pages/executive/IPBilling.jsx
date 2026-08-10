import { useEffect, useMemo, useState } from 'react'
import { Receipt } from 'lucide-react'
import api from '../../api/axios'
import {
  PageHeader,
  Section,
  StatusBadge,
} from '../../components/PageHeader'


// ============================================================
// CHARGE ROWS
// ============================================================

const CHARGE_ROWS = [
  {
    key: 'admission_charge',
    label: 'Admission Charges',
  },
  {
    key: 'room_charge',
    label: 'Room Charges',
  },
  {
    key: 'doctor_visit_charge',
    label: 'Doctor Visit',
  },
  {
    key: 'lab_charge',
    label: 'Lab',
  },
  {
    key: 'radiology_charge',
    label: 'Radiology',
  },
  {
    key: 'ot_charge',
    label: 'OT Charges',
  },
  {
    key: 'procedure_charge',
    label: 'Procedures / Surgeries',
  },
  {
    key: 'medicine_charge',
    label: 'Medicines',
  },
  {
    key: 'nursing_charge',
    label: 'Nursing Services',
  },
  {
    key: 'service_charge',
    label: 'Services',
  },
  {
    key: 'food_charge',
    label: 'Food',
  },
  {
    key: 'misc_charge',
    label: 'Miscellaneous',
  },
]


const initCharges = Object.fromEntries(
  CHARGE_ROWS.map((c) => [
    c.key,
    0,
  ])
)


export default function IPBilling() {

  const [admissions, setAdmissions] = useState([])

  const [admissionId, setAdmissionId] =
    useState('')

  const [charges, setCharges] =
    useState(initCharges)

  const [discount, setDiscount] =
    useState(0)

  const [advanceAdjusted, setAdvanceAdjusted] =
    useState(0)

  const [paid, setPaid] =
    useState(0)

  const [bills, setBills] =
    useState([])

  const [saving, setSaving] =
    useState(false)

  const [error, setError] =
    useState('')


  // ==========================================================
  // LOAD BILLS
  // ==========================================================

  const loadBills = () => {

    api
      .get('/ip-billing')
      .then((r) => {
        setBills(r.data)
      })
      .catch((err) => {
        console.error(
          'Failed to load IP bills:',
          err
        )
      })
  }


  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {

    api
      .get('/admissions', {
        params: {
          status: 'Admitted',
        },
      })
      .then((r) => {
        setAdmissions(r.data)
      })
      .catch((err) => {
        console.error(
          'Failed to load admissions:',
          err
        )
      })


    loadBills()

  }, [])


  // ==========================================================
  // CALCULATIONS
  // ==========================================================

  const gross = useMemo(() => {

    return Object
      .values(charges)
      .reduce(
        (sum, value) =>
          sum + Number(value || 0),
        0
      )

  }, [charges])


  const discountedTotal = Math.max(
    0,
    gross - Number(discount || 0)
  )


  // No Tax

  const grandTotal = +discountedTotal.toFixed(2)


  const due = +Math.max(
    0,
    grandTotal -
      Number(advanceAdjusted || 0) -
      Number(paid || 0)
  ).toFixed(2)


  // ==========================================================
  // SUBMIT
  // ==========================================================

  const submit = async (e) => {

    e.preventDefault()


    if (!admissionId) {

      return setError(
        'Select an admitted patient first'
      )

    }


    setError('')
    setSaving(true)


    try {

      await api.post(
        '/ip-billing',
        {
          admission_id: admissionId,

          ...charges,

          discount,

          advance_adjusted:
            advanceAdjusted,

          paid_amount: paid,
        }
      )


      // Reset

      setAdmissionId('')

      setCharges(initCharges)

      setDiscount(0)

      setAdvanceAdjusted(0)

      setPaid(0)


      loadBills()

    } catch (err) {

      setError(
        err.response?.data?.error ||
        'Could not create bill'
      )

    } finally {

      setSaving(false)

    }

  }


  // ==========================================================
  // UI
  // ==========================================================

  return (

    <div>

      <PageHeader
        title="Inpatient Billing"
        subtitle="Create and manage IP bills"
      />


      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">


        {/* ====================================================
            NEW IP BILL
        ==================================================== */}

        <form
          onSubmit={submit}
          className="xl:col-span-1"
        >

          <Section title="New IP Bill">

            {error && (
              <p className="text-sm text-danger-500 mb-3">
                {error}
              </p>
            )}


            {/* Patient */}

            <label className="label">
              Admitted Patient
            </label>

            <select
              className="input mb-3"
              value={admissionId}
              onChange={(e) =>
                setAdmissionId(e.target.value)
              }
            >

              <option value="">
                Select admission
              </option>

              {admissions.map((a) => (

                <option
                  key={a.id}
                  value={a.id}
                >
                  {a.admission_no} —{' '}
                  {a.patient_name}{' '}
                  ({a.room_no}/{a.bed_no})
                </option>

              ))}

            </select>


            {/* Charges */}

            <div className="space-y-2 my-3 max-h-64 overflow-y-auto pr-1">

              {CHARGE_ROWS.map((c) => (

                <div
                  key={c.key}
                  className="flex items-center justify-between gap-3"
                >

                  <span className="text-sm text-ink/70">
                    {c.label}
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input w-28 text-right"
                    value={charges[c.key]}
                    onChange={(e) =>
                      setCharges((current) => ({
                        ...current,
                        [c.key]: e.target.value,
                      }))
                    }
                  />

                </div>

              ))}

            </div>


            {/* Discount */}

            <div className="mb-3">

              <label className="label">
                Discount
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                className="input"
                value={discount}
                onChange={(e) =>
                  setDiscount(e.target.value)
                }
              />

            </div>


            {/* Summary */}

            <div className="bg-teal-50 rounded-sm p-3 text-sm space-y-1 mb-3">

              <div className="flex justify-between">

                <span>
                  Gross Total
                </span>

                <span>
                  ₹{gross.toFixed(2)}
                </span>

              </div>


              <div className="flex justify-between">

                <span>
                  Discount
                </span>

                <span>
                  ₹{Number(
                    discount || 0
                  ).toFixed(2)}
                </span>

              </div>


              <div className="flex justify-between font-semibold">

                <span>
                  Grand Total
                </span>

                <span>
                  ₹{grandTotal.toFixed(2)}
                </span>

              </div>


              <div className="flex justify-between">

                <span>
                  Advance Adjusted
                </span>

                <span>
                  ₹{Number(
                    advanceAdjusted || 0
                  ).toFixed(2)}
                </span>

              </div>


              <div className="flex justify-between text-danger-500">

                <span>
                  Due
                </span>

                <span>
                  ₹{due.toFixed(2)}
                </span>

              </div>

            </div>


            {/* Payment */}

            <div className="grid grid-cols-2 gap-3 mb-4">

              <div>

                <label className="label">
                  Advance Adjusted
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input"
                  value={advanceAdjusted}
                  onChange={(e) =>
                    setAdvanceAdjusted(
                      e.target.value
                    )
                  }
                />

              </div>


              <div>

                <label className="label">
                  Paid Now
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input"
                  value={paid}
                  onChange={(e) =>
                    setPaid(e.target.value)
                  }
                />

              </div>

            </div>


            {/* Submit */}

            <button
              type="submit"
              className="btn-primary w-full flex items-center justify-center gap-2"
              disabled={saving}
            >

              <Receipt size={15} />

              {saving
                ? 'Generating…'
                : 'Generate IP Bill'}

            </button>

          </Section>

        </form>


        {/* ====================================================
            IP BILLS
        ==================================================== */}

        <div className="xl:col-span-2">

          <Section title="IP Bills">

            <div className="overflow-x-auto">

              <table className="table-base">

                <thead>

                  <tr>

                    <th>
                      Bill No
                    </th>

                    <th>
                      Admission
                    </th>

                    <th>
                      Patient
                    </th>

                    <th>
                      Grand Total
                    </th>

                    <th>
                      Paid
                    </th>

                    <th>
                      Due
                    </th>

                    <th>
                      Status
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {bills.map((b) => (

                    <tr key={b.id}>

                      <td>
                        {b.bill_no}
                      </td>

                      <td>
                        {b.admission_no}
                      </td>

                      <td>
                        {b.patient_name}
                      </td>

                      <td>
                        ₹{Number(
                          b.grand_total || 0
                        ).toFixed(2)}
                      </td>

                      <td>
                        ₹{Number(
                          b.paid_amount || 0
                        ).toFixed(2)}
                      </td>

                      <td>
                        ₹{Number(
                          b.due_amount || 0
                        ).toFixed(2)}
                      </td>

                      <td>
                        <StatusBadge
                          status={b.status}
                        />
                      </td>

                    </tr>

                  ))}


                  {!bills.length && (

                    <tr>

                      <td
                        colSpan={7}
                        className="text-center text-ink/40 py-8"
                      >
                        No IP bills yet
                      </td>

                    </tr>

                  )}

                </tbody>

              </table>

            </div>

          </Section>

        </div>

      </div>

    </div>

  )
}