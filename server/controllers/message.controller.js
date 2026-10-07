const { query } = require('../config/db');
const { createNotification } = require('../services/notification.service');

/**
 * Check if sender and receiver are authorized for communication.
 * Patient can only communicate with a registered doctor (role = 'doctor').
 * Patient-to-patient and patient-to-unregistered doctor communication is strictly restricted.
 */
const verifyDoctorPatientRelationship = async (userId1, userId2) => {
  const usersRes = await query(
    `SELECT id, name, role, doctor_id as "doctorId", patient_id as "patientId" FROM users WHERE id IN ($1, $2)`,
    [userId1, userId2]
  );
  if (usersRes.rows.length < 2) {
    return { authorized: false, reason: 'One or more users not found.' };
  }

  const user1 = usersRes.rows.find(u => u.id === userId1);
  const user2 = usersRes.rows.find(u => u.id === userId2);

  const role1 = (user1?.role || '').toLowerCase();
  const role2 = (user2?.role || '').toLowerCase();

  // Restriction 1: Patient-to-patient is blocked
  if (role1 !== 'doctor' && role2 !== 'doctor') {
    return {
      authorized: false,
      reason: 'Patient-to-patient messaging is restricted. Patients can only communicate with registered doctors.'
    };
  }

  // Restriction 2: Unregistered doctor or non-doctor is blocked
  const doctorUser = role1 === 'doctor' ? user1 : (role2 === 'doctor' ? user2 : null);
  if (!doctorUser || (doctorUser.role || '').toLowerCase() !== 'doctor') {
    return {
      authorized: false,
      reason: 'Access restricted. You can only communicate with registered doctors.'
    };
  }

  return { authorized: true, doctorUser, patientUser: role1 === 'doctor' ? user2 : user1 };
};

/**
 * GET /api/messages/conversations
 * Get list of available conversation partners with latest message and unread counts.
 * For patients: strictly only registered doctors (role = 'doctor').
 */
const getConversations = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const isDoctor = (req.user.role || '').toLowerCase() === 'doctor';

    let partnersQuery;
    if (isDoctor) {
      partnersQuery = `
        SELECT DISTINCT u.id, u.name, u.email, u.role, u.patient_id as "patientId", 
                        u.gender, u.age, u.phone, u.photo_url as "photoUrl",
                        dp.status as "relationshipStatus", dp.added_at as "relationshipSince"
        FROM users u
        LEFT JOIN doctor_patients dp ON dp.patient_id = u.id AND dp.doctor_id = $1
        LEFT JOIN appointments a ON a.patient_id = u.id AND a.doctor_id = $1
        WHERE ((dp.doctor_id = $1 AND dp.status = 'active') OR a.doctor_id = $1)
          AND u.role != 'doctor'
        ORDER BY u.name ASC
      `;
    } else {
      // For patients: only registered doctors
      partnersQuery = `
        SELECT DISTINCT u.id, u.name, u.email, u.role, u.doctor_id as "doctorId", 
                        u.specialization, u.phone, u.photo_url as "photoUrl",
                        dp.status as "relationshipStatus", dp.added_at as "relationshipSince"
        FROM users u
        LEFT JOIN doctor_patients dp ON dp.doctor_id = u.id AND dp.patient_id = $1
        LEFT JOIN appointments a ON a.doctor_id = u.id AND a.patient_id = $1
        WHERE u.role = 'doctor'
        ORDER BY u.name ASC
      `;
    }

    const partnersRes = await query(partnersQuery, [currentUserId]);
    const conversations = [];

    for (const partner of partnersRes.rows) {
      // Get latest message between current user and partner
      const latestMsgRes = await query(
        `SELECT id, message, sender_id as "senderId", receiver_id as "receiverId", is_read as "isRead", created_at as "createdAt"
         FROM messages
         WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
         ORDER BY created_at DESC
         LIMIT 1`,
        [currentUserId, partner.id]
      );

      // Get unread count from this partner
      const unreadRes = await query(
        `SELECT COUNT(*)::int as count
         FROM messages
         WHERE sender_id = $1 AND receiver_id = $2 AND is_read = false`,
        [partner.id, currentUserId]
      );

      conversations.push({
        partner,
        latestMessage: latestMsgRes.rows[0] || null,
        unreadCount: unreadRes.rows[0]?.count || 0,
        lastActivity: latestMsgRes.rows[0]?.createdAt || partner.relationshipSince || new Date().toISOString()
      });
    }

    // Sort: conversations with messages first by latest message time, then alphabetically
    conversations.sort((a, b) => {
      if (a.latestMessage && !b.latestMessage) return -1;
      if (!a.latestMessage && b.latestMessage) return 1;
      return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
    });

    return res.status(200).json({ conversations });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/messages/:otherUserId
 * Get message thread with a specific doctor/patient
 */
const getMessageThread = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const { otherUserId } = req.params;

    if (!otherUserId) {
      return res.status(400).json({ error: { message: 'Recipient user ID is required.' } });
    }

    // Check relationship authorization
    const authCheck = await verifyDoctorPatientRelationship(currentUserId, otherUserId);
    if (!authCheck.authorized) {
      return res.status(403).json({
        error: { message: authCheck.reason || 'Access denied. You can only communicate with registered doctors.' }
      });
    }

    // Fetch partner details
    const partnerRes = await query(
      `SELECT id, name, email, role, patient_id as "patientId", doctor_id as "doctorId", specialization, phone, photo_url as "photoUrl"
       FROM users WHERE id = $1`,
      [otherUserId]
    );

    if (partnerRes.rows.length === 0) {
      return res.status(404).json({ error: { message: 'User not found.' } });
    }

    // Mark received unread messages as read
    await query(
      `UPDATE messages
       SET is_read = true
       WHERE sender_id = $1 AND receiver_id = $2 AND is_read = false`,
      [otherUserId, currentUserId]
    );

    // Fetch message history
    const messagesRes = await query(
      `SELECT id, sender_id as "senderId", receiver_id as "receiverId", appointment_id as "appointmentId", 
              message, is_read as "isRead", created_at as "createdAt"
       FROM messages
       WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY created_at ASC`,
      [currentUserId, otherUserId]
    );

    return res.status(200).json({
      partner: partnerRes.rows[0],
      messages: messagesRes.rows
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/messages/:otherUserId
 * Send a message to authorized doctor or patient
 */
const sendMessage = async (req, res, next) => {
  try {
    const senderId = req.user.id;
    const { otherUserId } = req.params;
    const { message, appointmentId } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: { message: 'Message content cannot be empty.' } });
    }

    // Check relationship authorization
    const authCheck = await verifyDoctorPatientRelationship(senderId, otherUserId);
    if (!authCheck.authorized) {
      return res.status(403).json({
        error: { message: authCheck.reason || 'Access denied. Cannot send message to an unauthorized user.' }
      });
    }

    // Verify recipient exists
    const recipientRes = await query(`SELECT id, name, role FROM users WHERE id = $1`, [otherUserId]);
    if (recipientRes.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Recipient not found.' } });
    }
    const recipient = recipientRes.rows[0];

    // Insert message into database
    const insertRes = await query(
      `INSERT INTO messages (sender_id, receiver_id, appointment_id, message, is_read)
       VALUES ($1, $2, $3, $4, false)
       RETURNING id, sender_id as "senderId", receiver_id as "receiverId", appointment_id as "appointmentId", 
                 message, is_read as "isRead", created_at as "createdAt"`,
      [senderId, otherUserId, appointmentId || null, message.trim()]
    );

    const savedMessage = insertRes.rows[0];

    // Send notification to recipient
    const senderName = req.user.name || (req.user.role === 'doctor' ? 'Your Doctor' : 'Your Patient');
    await createNotification({
      userId: otherUserId,
      title: `New message from ${senderName}`,
      message: message.trim().length > 60 ? `${message.trim().slice(0, 60)}...` : message.trim(),
      type: 'message',
      link: req.user.role === 'doctor' ? '/messages' : '/messages'
    });

    return res.status(201).json({
      message: 'Message sent successfully',
      data: savedMessage
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/messages/read/:otherUserId
 * Explicitly mark all messages from other user as read
 */
const markThreadRead = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const { otherUserId } = req.params;

    await query(
      `UPDATE messages
       SET is_read = true
       WHERE sender_id = $1 AND receiver_id = $2 AND is_read = false`,
      [otherUserId, currentUserId]
    );

    return res.status(200).json({ message: 'Messages marked as read' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getConversations,
  getMessageThread,
  sendMessage,
  markThreadRead
};
