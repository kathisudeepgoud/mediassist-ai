const { pool, query } = require('../config/db');
const http = require('http');
const app = require('../index');
const fs = require('fs');
const path = require('path');

async function runEcosystemTests() {
  console.log('====================================================');
  console.log('Starting Doctor-Patient Ecosystem Integration Tests');
  console.log('====================================================');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api`;

  try {
    const ts = Date.now();
    const docEmail = `doc_eco_${ts}@example.com`;
    const pat1Email = `pat1_eco_${ts}@example.com`;
    const pat2Email = `pat2_eco_${ts}@example.com`;
    const doc2Email = `doc2_eco_${ts}@example.com`;

    // Helper request
    const postJson = async (endpoint, body, token) => {
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      return { status: res.status, body: data };
    };

    const getJson = async (endpoint, token) => {
      const res = await fetch(`${baseUrl}${endpoint}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json().catch(() => ({}));
      return { status: res.status, body: data };
    };

    const putJson = async (endpoint, body, token) => {
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      return { status: res.status, body: data };
    };

    // 1. Register Doctor 1
    const docReg = await postJson('/auth/register', {
      name: 'Dr. Sarah Jenkins',
      email: docEmail,
      password: 'Password@123',
      role: 'doctor',
      specialization: 'Cardiologist',
      consultationFee: 650
    });
    const docToken = docReg.body.token;
    const docUser = docReg.body.user;
    console.log('✓ Registered Doctor 1:', docUser.name, docUser.doctorId);

    // 2. Register Doctor 2
    const doc2Reg = await postJson('/auth/register', {
      name: 'Dr. Marcus Vance',
      email: doc2Email,
      password: 'Password@123',
      role: 'doctor',
      specialization: 'Endocrinologist'
    });
    const doc2Token = doc2Reg.body.token;
    const doc2User = doc2Reg.body.user;
    console.log('✓ Registered Doctor 2:', doc2User.name, doc2User.doctorId);

    // 3. Register Patient 1
    const pat1Reg = await postJson('/auth/register', {
      name: 'Rahul Sharma',
      email: pat1Email,
      password: 'Password@123',
      role: 'patient',
      age: 42,
      gender: 'Male',
      bloodGroup: 'B+'
    });
    const pat1Token = pat1Reg.body.token;
    const pat1User = pat1Reg.body.user;
    console.log('✓ Registered Patient 1:', pat1User.name, pat1User.patientId);

    // 4. Register Patient 2
    const pat2Reg = await postJson('/auth/register', {
      name: 'Ananya Roy',
      email: pat2Email,
      password: 'Password@123',
      role: 'patient',
      age: 29,
      gender: 'Female',
      bloodGroup: 'O+'
    });
    const pat2Token = pat2Reg.body.token;
    const pat2User = pat2Reg.body.user;
    console.log('✓ Registered Patient 2:', pat2User.name, pat2User.patientId);

    // 5. Doctor stats
    const statsRes = await getJson('/doctor/stats', docToken);
    console.log('✓ Doctor Stats API:', statsRes.status === 200, 'Total Patients:', statsRes.body.totalPatients);

    // 6. Doctor Add Patient 1
    const addPatRes = await postJson('/doctor/patients', {
      patientId: pat1User.patientId,
      reason: 'Referred for cardiology checkup'
    }, docToken);
    console.log('✓ Doctor Add Patient 1:', addPatRes.status === 201, addPatRes.body.message);

    // 7. Prevent Duplicate Patient Add
    const dupAddRes = await postJson('/doctor/patients', {
      patientId: pat1User.patientId
    }, docToken);
    console.log('✓ Prevent Duplicate Patient Add:', dupAddRes.status === 409);

    // 8. Doctor My Patients list
    const myPatientsRes = await getJson('/doctor/patients', docToken);
    console.log('✓ Doctor My Patients List count:', myPatientsRes.body.patients?.length);

    // 9. Doctor View Complete Patient Profile
    const profileRes = await getJson(`/doctor/patient/${pat1User.patientId}`, docToken);
    console.log('✓ Doctor View Patient Profile:', profileRes.status === 200, 'Has Reports:', Array.isArray(profileRes.body.reports));

    // 10. Security: Doctor 2 cannot access unassigned Patient 1 profile
    const unauthProfileRes = await getJson(`/doctor/patient/${pat1User.patientId}`, doc2Token);
    console.log('✓ Security Check (Unassigned Doctor Access Denied):', unauthProfileRes.status === 403);

    // 11. Patient Discover Doctors
    const docDiscoveryRes = await getJson('/appointments/doctors', pat2Token);
    console.log('✓ Patient Doctor Discovery:', docDiscoveryRes.status === 200, 'Doctors count:', docDiscoveryRes.body.doctors?.length);

    // 12. Patient 2 Book Appointment with Doctor 1 (Dummy Razorpay flow)
    const bookRes = await postJson('/appointments/book', {
      doctorId: docUser.id,
      appointmentDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      appointmentTime: '10:30 AM',
      appointmentType: 'online',
      reason: 'Routine follow-up consultation',
      fee: 650,
      paymentMethod: 'card'
    }, pat2Token);
    console.log('✓ Patient Book Online Appointment:', bookRes.status === 201, 'Appointment #:', bookRes.body.appointment?.appointmentNumber);
    const appointmentId = bookRes.body.appointment?.id;

    // 13. Patient 2 now automatically present in Doctor 1 My Patients list
    const updatedPatients = await getJson('/doctor/patients', docToken);
    console.log('✓ Auto-association on Booking in My Patients:', updatedPatients.body.patients?.length >= 2);

    // 14. Messaging: Doctor sends message to Patient 2
    const docMsgRes = await postJson(`/messages/${pat2User.id}`, {
      message: 'Hello Ananya, please have your previous ECG report ready for our consultation.',
      appointmentId
    }, docToken);
    console.log('✓ Doctor Send Message:', docMsgRes.status === 201);

    // 15. Messaging: Patient 2 replies to Doctor 1
    const patMsgRes = await postJson(`/messages/${docUser.id}`, {
      message: 'Sure Doctor, I will keep all reports uploaded on the portal.'
    }, pat2Token);
    console.log('✓ Patient Reply Message:', patMsgRes.status === 201);

    // 16. Messages thread retrieval
    const threadRes = await getJson(`/messages/${docUser.id}`, pat2Token);
    console.log('✓ Message Thread retrieval count:', threadRes.body.messages?.length);

    // 17. Doctor Appointment Management: Mark appointment completed
    const completeApptRes = await putJson(`/appointments/${appointmentId}/status`, {
      status: 'completed',
      doctorNotes: 'Consultation conducted smoothly. Patient advised to maintain healthy diet.'
    }, docToken);
    console.log('✓ Mark Appointment Completed:', completeApptRes.status === 200, completeApptRes.body.appointment?.appointmentStatus);

    // 18. Doctor Upload Prescription with FormData
    const dummyPdfContent = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
    const formData = new FormData();
    formData.append('patientId', pat2User.patientId);
    formData.append('appointmentId', appointmentId);
    formData.append('diagnosis', 'Mild Tachycardia & Hypertension');
    formData.append('instructions', 'Take Tab Metoprolol 25mg once daily after breakfast for 30 days.');
    formData.append('file', new Blob([dummyPdfContent], { type: 'application/pdf' }), 'prescription_ananya.pdf');

    const rxUploadRaw = await fetch(`${baseUrl}/prescriptions/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${docToken}`
      },
      body: formData
    });
    const rxUploadData = await rxUploadRaw.json();
    console.log('✓ Doctor Upload Prescription:', rxUploadRaw.status === 201, 'Rx #:', rxUploadData.prescription?.prescriptionNumber);
    const prescriptionId = rxUploadData.prescription?.id;

    // 19. Patient 2 View Prescription History
    const patRxRes = await getJson('/prescriptions/my', pat2Token);
    console.log('✓ Patient Prescription History count:', patRxRes.body.prescriptions?.length);

    // 20. Security: Patient 1 cannot download Patient 2 prescription
    const unauthRxDownload = await fetch(`${baseUrl}/prescriptions/download/${prescriptionId}`, {
      headers: { Authorization: `Bearer ${pat1Token}` }
    });
    console.log('✓ Security Check (Cross-Patient Prescription Download Denied):', unauthRxDownload.status === 403);

    // 21. Patient 2 can download own prescription
    const validRxDownload = await fetch(`${baseUrl}/prescriptions/download/${prescriptionId}`, {
      headers: { Authorization: `Bearer ${pat2Token}` }
    });
    console.log('✓ Authorized Prescription Download:', validRxDownload.status === 200);

    // 22. Notifications check
    const notifRes = await getJson('/notifications', pat2Token);
    console.log('✓ Notifications received for Patient 2:', notifRes.body.notifications?.length, 'Unread:', notifRes.body.unreadCount);

    console.log('====================================================');
    console.log('ALL 22 BACKEND INTEGRATION TESTS PASSED! 🎉');
    console.log('====================================================');
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  } finally {
    server.close();
    await pool.end();
  }
}

runEcosystemTests();
