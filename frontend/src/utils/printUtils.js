// frontend/src/utils/printUtils.js

// ============================================================
// OP / IP Registration Print
// ============================================================
export function printPatientRegistration(data, type = 'OP') {
  const hospitalName = 'Siddharth Hospital';
  const hospitalAddress = 'Door No: 13-2-2, 1st line Gunturvari thota, Old club road, Guntur-522001';
  const hospitalPhone = 'Ph: 9613374999, 9613384999';

  const {
    title, first_name, last_name, gender, age, dob, mobile, alt_phone,
    email, aadhar_number, address, village, mandal, district, state, pincode,
    guardian_name, guardian_relation, guardian_mobile, occupation, blood_group,
    // OP specific
    visit_type, referral_type, referral_doctor_name, doctor_name,
    consultation_fee, registration_fee, appointment_date, appointment_time,
    payment_mode, mlc, booking_type,
    // IP specific
    admitted_date, floor, room_type, room_no, bed_no, symptoms,
    advance_amount, marital_status, mother_name, locality,
  } = data;

  const fullName = `${title || ''} ${first_name || ''} ${last_name || ''}`.trim();

  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) {
    alert('Please allow popups for printing');
    return;
  }

  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${type} Registration - ${fullName}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
        .header { text-align: center; border-bottom: 2px solid #2c3e50; padding-bottom: 15px; margin-bottom: 20px; }
        .hospital-name { font-size: 24px; font-weight: bold; color: #2c3e50; }
        .hospital-address { font-size: 13px; color: #666; margin-top: 5px; }
        .title { font-size: 20px; font-weight: bold; text-align: center; margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        td { padding: 8px 10px; border: 1px solid #ddd; vertical-align: top; }
        .label { font-weight: bold; background: #f5f5f5; width: 30%; }
        .section-title { font-weight: bold; font-size: 16px; margin: 15px 0 10px 0; background: #2c3e50; color: white; padding: 5px 10px; }
        .footer { text-align: center; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 15px; font-size: 12px; color: #888; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="hospital-name">${hospitalName}</div>
        <div class="hospital-address">${hospitalAddress}</div>
        <div class="hospital-address">${hospitalPhone}</div>
      </div>

      <div class="title">${type} PATIENT REGISTRATION</div>

      <table>
        <tr><td class="label">Patient Name</td><td>${fullName}</td></tr>
        <tr><td class="label">Gender / Age</td><td>${gender || '—'} / ${age || '—'}Y</td></tr>
        <tr><td class="label">Date of Birth</td><td>${dob || '—'}</td></tr>
        <tr><td class="label">Mobile</td><td>${mobile || '—'}</td></tr>
        <tr><td class="label">Alternate Phone</td><td>${alt_phone || '—'}</td></tr>
        <tr><td class="label">Email</td><td>${email || '—'}</td></tr>
        <tr><td class="label">Aadhar Number</td><td>${aadhar_number || '—'}</td></tr>
        <tr><td class="label">Occupation</td><td>${occupation || '—'}</td></tr>
        <tr><td class="label">Blood Group</td><td>${blood_group || '—'}</td></tr>
        <tr><td class="label">Marital Status</td><td>${marital_status || '—'}</td></tr>
      </table>

      <div class="section-title">Address</div>
      <table>
        <tr><td class="label">Address</td><td>${address || '—'}</td></tr>
        <tr><td class="label">Village</td><td>${village || '—'}</td></tr>
        <tr><td class="label">Mandal</td><td>${mandal || '—'}</td></tr>
        <tr><td class="label">District</td><td>${district || '—'}</td></tr>
        <tr><td class="label">State</td><td>${state || '—'}</td></tr>
        <tr><td class="label">Pincode</td><td>${pincode || '—'}</td></tr>
        <tr><td class="label">Locality</td><td>${locality || '—'}</td></tr>
      </table>

      ${guardian_name ? `
        <div class="section-title">Guardian Details</div>
        <table>
          <tr><td class="label">Guardian Name</td><td>${guardian_name}</td></tr>
          <tr><td class="label">Relationship</td><td>${guardian_relation || '—'}</td></tr>
          <tr><td class="label">Guardian Mobile</td><td>${guardian_mobile || '—'}</td></tr>
          ${mother_name ? `<tr><td class="label">Mother Name</td><td>${mother_name}</td></tr>` : ''}
        </table>
      ` : ''}

      ${type === 'OP' ? `
        <div class="section-title">Consultation Details</div>
        <table>
          <tr><td class="label">Visit Type</td><td>${visit_type || 'General'}</td></tr>
          <tr><td class="label">Doctor</td><td>${doctor_name || '—'}</td></tr>
          <tr><td class="label">Consultation Fee</td><td>₹${consultation_fee || 0}</td></tr>
          <tr><td class="label">Registration Fee</td><td>₹${registration_fee || 0}</td></tr>
          <tr><td class="label">Referral Type</td><td>${referral_type || 'Walkin'}</td></tr>
          ${referral_doctor_name ? `<tr><td class="label">Referring Doctor</td><td>${referral_doctor_name}</td></tr>` : ''}
          <tr><td class="label">Appointment Date</td><td>${appointment_date || '—'}</td></tr>
          <tr><td class="label">Appointment Time</td><td>${appointment_time || '—'}</td></tr>
          <tr><td class="label">Payment Mode</td><td>${payment_mode || 'Cash'}</td></tr>
          <tr><td class="label">Booking Type</td><td>${booking_type || 'Walk-in'}</td></tr>
          <tr><td class="label">MLC</td><td>${mlc ? 'Yes' : 'No'}</td></tr>
        </table>
      ` : ''}

      ${type === 'IP' ? `
        <div class="section-title">Admission Details</div>
        <table>
          <tr><td class="label">Admitted Date</td><td>${admitted_date || '—'}</td></tr>
          <tr><td class="label">Floor</td><td>${floor || '—'}</td></tr>
          <tr><td class="label">Room Type</td><td>${room_type || 'General'}</td></tr>
          <tr><td class="label">Room No</td><td>${room_no || '—'}</td></tr>
          <tr><td class="label">Bed No</td><td>${bed_no || '—'}</td></tr>
          <tr><td class="label">Symptoms</td><td>${symptoms || '—'}</td></tr>
          <tr><td class="label">Referral Type</td><td>${referral_type || 'Walkin'}</td></tr>
          ${referral_doctor_name ? `<tr><td class="label">Referring Doctor</td><td>${referral_doctor_name}</td></tr>` : ''}
          <tr><td class="label">Payment Mode</td><td>${payment_mode || 'Cash'}</td></tr>
          <tr><td class="label">Advance Amount</td><td>₹${advance_amount || 0}</td></tr>
          <tr><td class="label">Booking Type</td><td>${booking_type || 'Walk-in'}</td></tr>
        </table>
      ` : ''}

      <div class="footer">
        This is a computer generated document. &copy; ${new Date().getFullYear()} ${hospitalName}
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(printContent);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

// ============================================================
// NEW: Discharge Summary Print
// ============================================================
export function printDischargeSummary(data) {
  const hospitalName = 'Siddharth Hospital';
  const hospitalAddress = 'Door No: 13-2-2, 1st line Gunturvari thota, Old club road, Guntur-522001';
  const hospitalPhone = 'Ph: 9613374999, 9613384999';

  const {
    patient_name,
    ip_registration_id,
    gender,
    age,
    mobile,
    admit_date,
    discharge_date,
    surgery_date,
    doctor_name,
    department,
    diagnosis,
    procedure,
    complaint,
    past_history,
    drug_history,
    surgical_history,
    examination,
    investigations,
    course_hospitalization,
    condition_discharge,
    discharge_advise,
  } = data;

  // Helper to format date for display
  const formatDateDisplay = (dt) => {
    if (!dt) return '—';
    const d = new Date(dt);
    return d.toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Build examination table rows
  const examRows = [];
  const examFields = [
    ['Temp', examination?.temp],
    ['BP', examination?.bp],
    ['Pulse', examination?.pulse],
    ['RR', examination?.rr],
    ['SPO2', examination?.spo2],
    ['P/A', examination?.pa],
    ['CVS', examination?.cvs],
    ['CNS', examination?.cns],
    ['Blood Group', examination?.blood_group],
  ];
  for (const [label, value] of examFields) {
    if (value) examRows.push(`<tr><td style="padding:4px 8px;border:1px solid #ddd;"><strong>${label}</strong></td><td style="padding:4px 8px;border:1px solid #ddd;">${value}</td></tr>`);
  }

  // Build discharge advise items
  let adviseHtml = '';
  if (discharge_advise && discharge_advise.length) {
    adviseHtml = '<table style="width:100%;border-collapse:collapse;margin:10px 0;">';
    adviseHtml += `
      <thead>
        <tr>
          <th style="border:1px solid #ddd;padding:6px;text-align:left;">Label</th>
          <th style="border:1px solid #ddd;padding:6px;text-align:center;">MRG</th>
          <th style="border:1px solid #ddd;padding:6px;text-align:center;">Afternoon</th>
          <th style="border:1px solid #ddd;padding:6px;text-align:center;">Night</th>
          <th style="border:1px solid #ddd;padding:6px;text-align:center;">Days</th>
          <th style="border:1px solid #ddd;padding:6px;text-align:center;">A/F/B/F</th>
          <th style="border:1px solid #ddd;padding:6px;text-align:left;">Description</th>
        </tr>
      </thead>
      <tbody>
    `;
    for (const item of discharge_advise) {
      adviseHtml += `
        <tr>
          <td style="border:1px solid #ddd;padding:6px;">${item.label || ''}</td>
          <td style="border:1px solid #ddd;padding:6px;text-align:center;">${item.mrg ? '✓' : ''}</td>
          <td style="border:1px solid #ddd;padding:6px;text-align:center;">${item.afternoon ? '✓' : ''}</td>
          <td style="border:1px solid #ddd;padding:6px;text-align:center;">${item.night ? '✓' : ''}</td>
          <td style="border:1px solid #ddd;padding:6px;text-align:center;">${item.days || ''}</td>
          <td style="border:1px solid #ddd;padding:6px;text-align:center;">${item.afbf || ''}</td>
          <td style="border:1px solid #ddd;padding:6px;">${item.description || ''}</td>
        </tr>
      `;
    }
    adviseHtml += '</tbody></table>';
  }

  // Build the full print HTML
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) {
    alert('Please allow popups for printing');
    return;
  }

  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Discharge Summary - ${patient_name}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { 
          font-family: Arial, sans-serif; 
          padding: 40px; 
          color: #222; 
          line-height: 1.5;
          background: #fff;
        }
        .header { 
          text-align: center; 
          border-bottom: 2px solid #2c3e50; 
          padding-bottom: 15px; 
          margin-bottom: 20px;
        }
        .hospital-name { 
          font-size: 26px; 
          font-weight: bold; 
          color: #1a2a3a;
          letter-spacing: 1px;
        }
        .hospital-address { 
          font-size: 13px; 
          color: #555; 
          margin-top: 4px;
        }
        .hospital-phone { 
          font-size: 13px; 
          color: #555; 
        }
        .title { 
          font-size: 22px; 
          font-weight: bold; 
          text-align: center; 
          margin: 15px 0 20px 0;
          color: #1a2a3a;
          text-transform: uppercase;
          letter-spacing: 2px;
        }
        .logo {
          display: block;
          margin: 0 auto 10px auto;
          max-width: 120px;
          max-height: 80px;
        }
        .section-title {
          font-weight: bold;
          font-size: 16px;
          margin: 18px 0 8px 0;
          padding: 5px 10px;
          background: #eef2f5;
          border-left: 4px solid #2c3e50;
          color: #1a2a3a;
        }
        .section-content {
          padding: 0 10px 5px 10px;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        table { width: 100%; border-collapse: collapse; margin: 8px 0; }
        td, th { padding: 6px 10px; border: 1px solid #ddd; vertical-align: top; }
        .label-cell { font-weight: bold; background: #f5f7fa; width: 30%; }
        .signature {
          margin-top: 30px;
          border-top: 1px solid #ddd;
          padding-top: 15px;
          text-align: right;
          font-style: italic;
        }
        .signature strong {
          font-style: normal;
        }
        @media print {
          body { padding: 20px; }
          .no-print { display: none; }
        }
        .logo-container { text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo-container">
          <img src="/sgr.jpeg" alt="Hospital Logo" class="logo" onerror="this.style.display='none'" />
        </div>
        <div class="hospital-name">${hospitalName}</div>
        <div class="hospital-address">${hospitalAddress}</div>
        <div class="hospital-phone">${hospitalPhone}</div>
      </div>

      <div class="title">DISCHARGE SUMMARY</div>

      <!-- Patient Details -->
      <table>
        <tr>
          <td class="label-cell">Patient Reg. No.</td>
          <td>${ip_registration_id || '—'}</td>
          <td class="label-cell">Patient Name</td>
          <td>${patient_name || '—'}</td>
        </tr>
        <tr>
          <td class="label-cell">Age / Gender</td>
          <td>${age || '—'}Y / ${gender || '—'}</td>
          <td class="label-cell">Mobile</td>
          <td>${mobile || '—'}</td>
        </tr>
        <tr>
          <td class="label-cell">Admit Date</td>
          <td>${formatDateDisplay(admit_date)}</td>
          <td class="label-cell">Discharge Date</td>
          <td>${formatDateDisplay(discharge_date)}</td>
        </tr>
        <tr>
          <td class="label-cell">Surgery Date</td>
          <td colspan="3">${formatDateDisplay(surgery_date)}</td>
        </tr>
      </table>

      <!-- Doctor Info -->
      <table>
        <tr>
          <td class="label-cell">Doctor Name</td>
          <td>${doctor_name || '—'}</td>
          <td class="label-cell">Department</td>
          <td>${department || '—'}</td>
        </tr>
      </table>

      <!-- Sections -->
      <div class="section-title">Diagnosis</div>
      <div class="section-content">${diagnosis || '—'}</div>

      <div class="section-title">Procedure</div>
      <div class="section-content">${procedure || '—'}</div>

      <div class="section-title">Complaint Of Patient At The Time Of Admission</div>
      <div class="section-content">${complaint || '—'}</div>

      <div class="section-title">Past History</div>
      <div class="section-content">${past_history || '—'}</div>

      <div class="section-title">Drug History</div>
      <div class="section-content">${drug_history || '—'}</div>

      <div class="section-title">Surgical History</div>
      <div class="section-content">${surgical_history || '—'}</div>

      <div class="section-title">On Examination</div>
      <div style="padding:0 10px;">
        ${examRows.length ? `<table>${examRows.join('')}</table>` : '<p>—</p>'}
      </div>

      <div class="section-title">Investigations</div>
      <div class="section-content">${investigations || '—'}</div>

      <div class="section-title">Course During The Hospitalization / Treatment</div>
      <div class="section-content">${course_hospitalization || '—'}</div>

      <div class="section-title">Condition At The Time Of Discharge</div>
      <div class="section-content">${condition_discharge || '—'}</div>

      <div class="section-title">Discharge Advise</div>
      <div class="section-content">${adviseHtml || '—'}</div>

      <div class="signature">
        <strong>Authorized Signature</strong>
        <br />
        <span style="font-size:14px; color:#888;">(This is a computer generated document)</span>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(printContent);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}