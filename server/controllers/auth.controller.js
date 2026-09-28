const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_12345';
const TOKEN_EXPIRY = '7d';

/**
 * Helper to generate sequential Patient ID (P000001) or Doctor ID (D000001)
 */
const generateUniqueUserCode = async (role) => {
  const prefix = role === 'doctor' ? 'D' : 'P';
  const column = role === 'doctor' ? 'doctor_id' : 'patient_id';

  const result = await query(
    `SELECT ${column} FROM users WHERE ${column} ~ $1`,
    [`^${prefix}[0-9]+$`]
  );

  let maxNum = 0;
  for (const row of result.rows) {
    const val = row[column];
    if (val) {
      const num = parseInt(val.slice(1), 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  let nextNum = maxNum + 1;
  let code = `${prefix}${String(nextNum).padStart(6, '0')}`;

  let exists = await query(`SELECT 1 FROM users WHERE ${column} = $1`, [code]);
  while (exists.rows.length > 0) {
    nextNum++;
    code = `${prefix}${String(nextNum).padStart(6, '0')}`;
    exists = await query(`SELECT 1 FROM users WHERE ${column} = $1`, [code]);
  }

  return code;
};

/**
 * Register a new user
 */
const register = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      role,
      phone,
      bloodGroup
    } = req.body;

    const rawAge = req.body.age;
    const rawGender = req.body.gender;
    const rawHeight = req.body.heightCm ?? req.body.height_cm;
    const rawWeight = req.body.weightKg ?? req.body.weight_kg;
    const rawSmoking = req.body.smokingHabit ?? req.body.smoking_habit;
    const rawActivity = req.body.activityLevel ?? req.body.activity_level;
    const rawDietary = req.body.dietaryPreference ?? req.body.dietary_preference;
    const rawAllergies = req.body.allergies;
    const rawConditions = req.body.existingConditions ?? req.body.existing_conditions;

    if (!name || !email || !password) {
      return res.status(400).json({
        error: { message: 'Name, email, and password are required fields.' }
      });
    }

    // Age validation
    let parsedAge = null;
    if (rawAge !== undefined && rawAge !== null && rawAge !== '') {
      const numAge = Number(rawAge);
      if (isNaN(numAge) || numAge < 1 || numAge > 120) {
        return res.status(400).json({
          error: { message: 'Please enter a realistic age between 1 and 120 years.' }
        });
      }
      parsedAge = Math.round(numAge);
    }

    // Height validation
    let parsedHeight = null;
    if (rawHeight !== undefined && rawHeight !== null && rawHeight !== '') {
      const numHeight = Number(rawHeight);
      if (isNaN(numHeight) || numHeight < 30 || numHeight > 300) {
        return res.status(400).json({
          error: { message: 'Please enter a valid height in cm (between 30 and 300 cm).' }
        });
      }
      parsedHeight = Number(numHeight.toFixed(2));
    }

    // Weight validation
    let parsedWeight = null;
    if (rawWeight !== undefined && rawWeight !== null && rawWeight !== '') {
      const numWeight = Number(rawWeight);
      if (isNaN(numWeight) || numWeight < 1 || numWeight > 500) {
        return res.status(400).json({
          error: { message: 'Please enter a valid weight in kg (between 1 and 500 kg).' }
        });
      }
      parsedWeight = Number(numWeight.toFixed(2));
    }

    // Gender validation & normalization
    let parsedGender = null;
    if (rawGender) {
      const gStr = String(rawGender).trim();
      const validGenders = ['Male', 'Female', 'Other', 'Prefer not to say'];
      const matched = validGenders.find(g => g.toLowerCase() === gStr.toLowerCase());
      parsedGender = matched || gStr;
    }

    // Smoking habit validation & normalization
    let parsedSmoking = null;
    if (rawSmoking) {
      const sStr = String(rawSmoking).trim();
      const validSmoking = ['Never', 'Former smoker', 'Current smoker', 'Prefer not to say'];
      const matched = validSmoking.find(s => s.toLowerCase() === sStr.toLowerCase());
      parsedSmoking = matched || sStr;
    }

    // Activity level validation & normalization
    let parsedActivity = null;
    if (rawActivity) {
      const aStr = String(rawActivity).trim();
      const validActivities = ['Sedentary', 'Lightly active', 'Moderately active', 'Very active'];
      const matched = validActivities.find(a => a.toLowerCase() === aStr.toLowerCase());
      parsedActivity = matched || aStr;
    }

    // Dietary preference normalization
    let parsedDietary = null;
    if (rawDietary) {
      const dStr = String(rawDietary).trim();
      const validDiets = ['Vegetarian', 'Eggetarian', 'Non-Vegetarian', 'Other'];
      const matched = validDiets.find(d => d.toLowerCase() === dStr.toLowerCase());
      parsedDietary = matched || dStr;
    }

    // Allergies & conditions formatting
    const parsedAllergies = Array.isArray(rawAllergies)
      ? rawAllergies.map(a => String(a).trim()).filter(Boolean)
      : rawAllergies ? [String(rawAllergies).trim()] : [];

    const parsedConditions = Array.isArray(rawConditions)
      ? rawConditions.map(c => String(c).trim()).filter(Boolean)
      : rawConditions ? [String(rawConditions).trim()] : [];

    const cleanRole = (role || 'patient').toString().toLowerCase().trim() === 'doctor' ? 'doctor' : 'patient';

    // Check if user already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: { message: 'A user with this email address already exists.' }
      });
    }

    // Generate unique Patient or Doctor ID
    const generatedIdCode = await generateUniqueUserCode(cleanRole);
    const patientId = cleanRole === 'patient' ? generatedIdCode : null;
    const doctorId = cleanRole === 'doctor' ? generatedIdCode : null;

    // Determine assigned_doctor_id for patient
    let assignedDoctorId = null;
    if (cleanRole === 'patient') {
      if (req.body.assignedDoctorId) {
        assignedDoctorId = req.body.assignedDoctorId.toString().trim();
      } else {
        const firstDoc = await query(`SELECT doctor_id FROM users WHERE role = 'doctor' AND doctor_id IS NOT NULL ORDER BY created_at ASC LIMIT 1`);
        assignedDoctorId = firstDoc.rows.length > 0 ? firstDoc.rows[0].doctor_id : 'D000001';
      }
    }

    // Hash password with bcrypt
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert user into database
    const newUserResult = await query(
      `INSERT INTO users 
       (name, email, password_hash, role, patient_id, doctor_id, assigned_doctor_id, phone, age, gender, blood_group, height_cm, weight_kg, smoking_habit, activity_level, dietary_preference, allergies, existing_conditions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING id, name, email, role, patient_id as "patientId", doctor_id as "doctorId", assigned_doctor_id as "assignedDoctorId", 
                 phone, age, gender, blood_group as "bloodGroup", height_cm as "heightCm", weight_kg as "weightKg", 
                 smoking_habit as "smokingHabit", activity_level as "activityLevel", dietary_preference as "dietaryPreference", 
                 allergies, existing_conditions as "existingConditions", photo_url as "photoUrl", created_at as "createdAt"`,
      [
        name,
        email.toLowerCase().trim(),
        passwordHash,
        cleanRole,
        patientId,
        doctorId,
        assignedDoctorId,
        phone || null,
        parsedAge,
        parsedGender,
        bloodGroup || null,
        parsedHeight,
        parsedWeight,
        parsedSmoking,
        parsedActivity,
        parsedDietary,
        JSON.stringify(parsedAllergies),
        JSON.stringify(parsedConditions)
      ]
    );

    const user = newUserResult.rows[0];

    // Create default user settings
    await query(
      `INSERT INTO user_settings (user_id, theme, notifications_enabled, email_alerts, language)
       VALUES ($1, 'light', true, true, 'en')
       ON CONFLICT (user_id) DO NOTHING`,
      [user.id]
    );

    // If patient entered dietary preferences or allergies, synchronize with diet_preferences table
    if (cleanRole === 'patient' && (parsedDietary || parsedActivity || parsedAllergies.length > 0)) {
      await query(
        `INSERT INTO diet_preferences (user_id, diet_type, activity_level, allergies)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id) DO UPDATE
         SET diet_type = COALESCE($2, diet_preferences.diet_type),
             activity_level = COALESCE($3, diet_preferences.activity_level),
             allergies = COALESCE($4, diet_preferences.allergies),
             updated_at = CURRENT_TIMESTAMP`,
        [
          user.id,
          parsedDietary || 'Vegetarian',
          parsedActivity || 'Moderately Active',
          JSON.stringify(parsedAllergies)
        ]
      ).catch(() => {});
    }

    // Sign JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, patientId: user.patientId, doctorId: user.doctorId },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    return res.status(201).json({
      message: 'Registration successful',
      user,
      token
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Login existing user
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: { message: 'Email and password are required.' }
      });
    }

    // Find user by email
    const userResult = await query(
      `SELECT id, name, email, password_hash, role, patient_id as "patientId", doctor_id as "doctorId", assigned_doctor_id as "assignedDoctorId", 
              phone, age, gender, blood_group as "bloodGroup", height_cm as "heightCm", weight_kg as "weightKg", 
              smoking_habit as "smokingHabit", activity_level as "activityLevel", dietary_preference as "dietaryPreference", 
              allergies, existing_conditions as "existingConditions", photo_url as "photoUrl"
       FROM users WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        error: { message: 'Invalid email or password.' }
      });
    }

    const user = userResult.rows[0];

    // Verify password hash
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: { message: 'Invalid email or password.' }
      });
    }

    // Remove password_hash from response object
    delete user.password_hash;

    // Ensure user has role and ID if created prior to role migration
    if (!user.role) user.role = 'patient';

    // Sign JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, patientId: user.patientId, doctorId: user.doctorId },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    return res.status(200).json({
      message: 'Login successful',
      user,
      token
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get profile of currently logged-in user
 */
const getMe = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const userResult = await query(
      `SELECT id, name, email, role, patient_id as "patientId", doctor_id as "doctorId", assigned_doctor_id as "assignedDoctorId", 
              phone, age, gender, blood_group as "bloodGroup", height_cm as "heightCm", weight_kg as "weightKg", 
              smoking_habit as "smokingHabit", activity_level as "activityLevel", dietary_preference as "dietaryPreference", 
              allergies, existing_conditions as "existingConditions", photo_url as "photoUrl", created_at as "createdAt"
       FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: { message: 'User not found.' }
      });
    }

    return res.status(200).json({
      user: userResult.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  getMe
};
