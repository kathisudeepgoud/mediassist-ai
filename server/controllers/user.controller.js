const { query } = require('../config/db');

/**
 * GET /api/user/profile
 * Get current user profile
 */
const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT id, name, email, role, patient_id as "patientId", doctor_id as "doctorId", phone, age, gender, 
              blood_group as "bloodGroup", height_cm as "heightCm", 
              weight_kg as "weightKg", smoking_habit as "smokingHabit", activity_level as "activityLevel",
              dietary_preference as "dietaryPreference", allergies, existing_conditions as "existingConditions",
              photo_url as "photoUrl", created_at as "createdAt", updated_at as "updatedAt"
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }

    return res.status(200).json({ profile: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/user/profile
 * Update user profile fields
 */
const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, phone, age, gender, photoUrl } = req.body;
    const bloodGroupVal = req.body.bloodGroup ?? req.body.blood_group ?? req.body.blood_type ?? null;
    const heightCmVal = req.body.heightCm ?? req.body.height_cm ?? null;
    const weightKgVal = req.body.weightKg ?? req.body.weight_kg ?? null;
    const smokingVal = req.body.smokingHabit ?? req.body.smoking_habit ?? null;
    const activityVal = req.body.activityLevel ?? req.body.activity_level ?? null;
    const dietaryVal = req.body.dietaryPreference ?? req.body.dietary_preference ?? null;
    const allergiesVal = req.body.allergies !== undefined ? JSON.stringify(req.body.allergies) : null;
    const conditionsVal = req.body.existingConditions !== undefined || req.body.existing_conditions !== undefined
      ? JSON.stringify(req.body.existingConditions ?? req.body.existing_conditions)
      : null;

    const result = await query(
      `UPDATE users
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           age = COALESCE($3, age),
           gender = COALESCE($4, gender),
           blood_group = COALESCE($5, blood_group),
           height_cm = COALESCE($6, height_cm),
           weight_kg = COALESCE($7, weight_kg),
           smoking_habit = COALESCE($8, smoking_habit),
           activity_level = COALESCE($9, activity_level),
           dietary_preference = COALESCE($10, dietary_preference),
           allergies = COALESCE($11::jsonb, allergies),
           existing_conditions = COALESCE($12::jsonb, existing_conditions),
           photo_url = COALESCE($13, photo_url),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $14
       RETURNING id, name, email, role, patient_id as "patientId", doctor_id as "doctorId", phone, age, gender, 
                 blood_group as "bloodGroup", height_cm as "heightCm", 
                 weight_kg as "weightKg", smoking_habit as "smokingHabit", activity_level as "activityLevel",
                 dietary_preference as "dietaryPreference", allergies, existing_conditions as "existingConditions",
                 photo_url as "photoUrl", updated_at as "updatedAt"`,
      [
        name,
        phone,
        age,
        gender,
        bloodGroupVal,
        heightCmVal,
        weightKgVal,
        smokingVal,
        activityVal,
        dietaryVal,
        allergiesVal,
        conditionsVal,
        photoUrl,
        userId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }

    return res.status(200).json({
      message: 'Profile updated successfully',
      profile: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/user/settings
 * Get current user preferences/settings
 */
const getSettings = async (req, res, next) => {
  try {
    const userId = req.user.id;

    let result = await query(
      `SELECT theme, notifications_enabled as "notificationsEnabled", 
              email_alerts as "emailAlerts", language, data_sharing as "dataSharing"
       FROM user_settings WHERE user_id = $1`,
      [userId]
    );

    // If no settings exist yet, insert defaults
    if (result.rows.length === 0) {
      result = await query(
        `INSERT INTO user_settings (user_id, theme, notifications_enabled, email_alerts, language, data_sharing)
         VALUES ($1, 'light', true, true, 'en', false)
         RETURNING theme, notifications_enabled as "notificationsEnabled", 
                   email_alerts as "emailAlerts", language, data_sharing as "dataSharing"`,
        [userId]
      );
    }

    return res.status(200).json({ settings: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/user/settings
 * Update user preferences/settings
 */
const updateSettings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { theme, notificationsEnabled, emailAlerts, language, dataSharing } = req.body;

    const result = await query(
      `INSERT INTO user_settings (user_id, theme, notifications_enabled, email_alerts, language, data_sharing)
       VALUES ($1, COALESCE($2, 'light'), COALESCE($3, true), COALESCE($4, true), COALESCE($5, 'en'), COALESCE($6, false))
       ON CONFLICT (user_id) DO UPDATE
       SET theme = COALESCE($2, user_settings.theme),
           notifications_enabled = COALESCE($3, user_settings.notifications_enabled),
           email_alerts = COALESCE($4, user_settings.email_alerts),
           language = COALESCE($5, user_settings.language),
           data_sharing = COALESCE($6, user_settings.data_sharing),
           updated_at = CURRENT_TIMESTAMP
       RETURNING theme, notifications_enabled as "notificationsEnabled", 
                 email_alerts as "emailAlerts", language, data_sharing as "dataSharing"`,
      [userId, theme, notificationsEnabled, emailAlerts, language, dataSharing]
    );

    return res.status(200).json({
      message: 'Settings updated successfully',
      settings: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getSettings,
  updateSettings
};
