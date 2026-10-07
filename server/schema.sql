-- Database Schema for MedAssist AI (PostgreSQL)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(20) DEFAULT 'patient' CHECK (role IN ('patient', 'doctor')),
    patient_id VARCHAR(50) UNIQUE,
    doctor_id VARCHAR(50) UNIQUE,
    assigned_doctor_id VARCHAR(50),
    phone VARCHAR(50),
    age INT,
    gender VARCHAR(20) CHECK (gender IN ('Male', 'Female', 'Other')),
    blood_group VARCHAR(10),
    height_cm NUMERIC(5, 2),
    weight_kg NUMERIC(5, 2),
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'patient';
ALTER TABLE users ADD COLUMN IF NOT EXISTS patient_id VARCHAR(50) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS doctor_id VARCHAR(50) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_doctor_id VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS smoking_habit VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS activity_level VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS dietary_preference VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS allergies JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS existing_conditions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_gender_check;

-- 2. USER SETTINGS / PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'light',
    notifications_enabled BOOLEAN DEFAULT true,
    email_alerts BOOLEAN DEFAULT true,
    language VARCHAR(10) DEFAULT 'en',
    data_sharing BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_settings UNIQUE(user_id)
);

ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS data_sharing BOOLEAN DEFAULT false;

-- 3. MEDICAL REPORTS TABLE
CREATE TABLE IF NOT EXISTS medical_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_name VARCHAR(255) NOT NULL,
    age INT NOT NULL,
    gender VARCHAR(20) NOT NULL,
    report_date DATE NOT NULL,
    hospital VARCHAR(255) NOT NULL,
    doctor VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    summary TEXT,
    key_findings JSONB DEFAULT '[]'::jsonb,
    file_type VARCHAR(10),
    file_url TEXT,
    source VARCHAR(50) DEFAULT 'Uploaded PDF',
    extracted_text TEXT,
    original_filename VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE medical_reports ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'Uploaded PDF';
ALTER TABLE medical_reports ADD COLUMN IF NOT EXISTS extracted_text TEXT;
ALTER TABLE medical_reports ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255);
ALTER TABLE medical_reports DROP CONSTRAINT IF EXISTS medical_reports_file_type_check;

-- 4. VITAL READINGS TABLE
CREATE TABLE IF NOT EXISTS vital_readings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    report_id UUID NOT NULL REFERENCES medical_reports(id) ON DELETE CASCADE,
    label VARCHAR(100) NOT NULL,
    value NUMERIC(10, 2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('normal', 'borderline', 'high', 'low')),
    reference_range VARCHAR(100),
    source VARCHAR(50) DEFAULT 'OCR',
    raw_value TEXT,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE vital_readings ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'OCR';
ALTER TABLE vital_readings ADD COLUMN IF NOT EXISTS raw_value TEXT;


-- 5. DISEASE RISKS TABLE
CREATE TABLE IF NOT EXISTS disease_risks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    percentage NUMERIC(5, 2) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('Low', 'Moderate', 'High')),
    explanation TEXT,
    suggestions JSONB DEFAULT '[]'::jsonb,
    assessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. TREND METRICS & TREND POINTS TABLES
CREATE TABLE IF NOT EXISTS trend_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    color VARCHAR(20) DEFAULT '#3B82F6',
    normal_range_min NUMERIC(10, 2),
    normal_range_max NUMERIC(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trend_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_id UUID NOT NULL REFERENCES trend_metrics(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    value NUMERIC(10, 2) NOT NULL
);

-- 7. DIET PLANS & FOOD ITEMS TABLES (LEGACY + IFCT NORMALIZED)
CREATE TABLE IF NOT EXISTS food_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    benefits TEXT,
    calories INT NOT NULL,
    protein VARCHAR(50),
    category VARCHAR(100) NOT NULL,
    is_recommended BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS meal_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    day VARCHAR(20) NOT NULL,
    breakfast TEXT,
    lunch TEXT,
    dinner TEXT,
    snacks TEXT
);

CREATE TABLE IF NOT EXISTS diet_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    daily_calories INT DEFAULT 2000,
    protein_intake VARCHAR(50),
    vitamin_recommendations JSONB DEFAULT '[]'::jsonb,
    mineral_recommendations JSONB DEFAULT '[]'::jsonb,
    water_intake VARCHAR(50)
);

-- IFCT 2017 NORMALIZED TABLES
CREATE TABLE IF NOT EXISTS food_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_code VARCHAR(10) UNIQUE NOT NULL,
    group_name VARCHAR(255) NOT NULL,
    dietary_tags TEXT[] DEFAULT '{}',
    source VARCHAR(100) DEFAULT 'IFCT 2017',
    source_version VARCHAR(50) DEFAULT '2017',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS foods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    food_code VARCHAR(20) UNIQUE NOT NULL,
    food_name VARCHAR(255) NOT NULL,
    scientific_name VARCHAR(255),
    food_group_id UUID REFERENCES food_groups(id) ON DELETE SET NULL,
    dietary_tags TEXT[] DEFAULT '{}',
    local_names_raw TEXT,
    source VARCHAR(100) DEFAULT 'IFCT 2017',
    source_version VARCHAR(50) DEFAULT '2017',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS nutrients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nutrient_code VARCHAR(50) UNIQUE NOT NULL,
    nutrient_name VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    category VARCHAR(100),
    scale_factor NUMERIC(15, 6) DEFAULT 1.0,
    tags TEXT[] DEFAULT '{}',
    source VARCHAR(100) DEFAULT 'IFCT 2017',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS food_nutrients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    food_id UUID NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
    nutrient_id UUID NOT NULL REFERENCES nutrients(id) ON DELETE CASCADE,
    amount_per_100g NUMERIC(15, 6) NOT NULL DEFAULT 0.0,
    unit VARCHAR(50) NOT NULL,
    original_value NUMERIC(15, 6),
    original_unit VARCHAR(50),
    source VARCHAR(100) DEFAULT 'IFCT 2017',
    CONSTRAINT unique_food_nutrient UNIQUE (food_id, nutrient_id)
);

CREATE TABLE IF NOT EXISTS food_names (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    food_id UUID NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
    language VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    source VARCHAR(100) DEFAULT 'IFCT 2017'
);

CREATE TABLE IF NOT EXISTS diet_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    diet_type VARCHAR(50) DEFAULT 'Vegetarian' CHECK (diet_type IN ('Vegetarian', 'Eggetarian', 'Fishetarian', 'Non-Vegetarian', 'Vegan')),
    food_preference VARCHAR(100) DEFAULT 'All',
    activity_level VARCHAR(50) DEFAULT 'Moderately Active' CHECK (activity_level IN ('Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active')),
    meal_count INT DEFAULT 5 CHECK (meal_count IN (3, 4, 5)),
    allergies JSONB DEFAULT '[]'::jsonb,
    excluded_foods JSONB DEFAULT '[]'::jsonb,
    health_goal VARCHAR(100) DEFAULT 'Maintenance',
    calorie_target_override INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS diet_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_id VARCHAR(50),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    source_report_id UUID REFERENCES medical_reports(id) ON DELETE SET NULL,
    risk_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    plan_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    nutrition_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    reasons_json JSONB DEFAULT '{}'::jsonb,
    safety_status VARCHAR(50) DEFAULT 'SAFE',
    warnings JSONB DEFAULT '[]'::jsonb,
    rule_version VARCHAR(50) DEFAULT '1.0.0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. CHAT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. PATIENT ALERTS TABLE
CREATE TABLE IF NOT EXISTS patient_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id VARCHAR(50) UNIQUE NOT NULL,
    patient_id VARCHAR(50) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doctor_id VARCHAR(50) NOT NULL,
    report_id UUID REFERENCES medical_reports(id) ON DELETE CASCADE,
    disease VARCHAR(100) NOT NULL,
    risk_level VARCHAR(20) NOT NULL DEFAULT 'HIGH',
    risk_probability NUMERIC(5, 2),
    status VARCHAR(20) DEFAULT 'NEW' CHECK (status IN ('NEW', 'REVIEWED', 'RESOLVED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT unique_report_disease_alert UNIQUE (report_id, disease)
);

-- 11. DOCTOR-PATIENT RELATIONSHIPS TABLE
CREATE TABLE IF NOT EXISTS doctor_patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    reason TEXT,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_doctor_patient UNIQUE (doctor_id, patient_id)
);

-- 12. APPOINTMENTS TABLE
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_number VARCHAR(50) UNIQUE,
    doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    appointment_time VARCHAR(50) NOT NULL,
    appointment_type VARCHAR(20) NOT NULL CHECK (appointment_type IN ('online', 'offline')),
    reason TEXT,
    fee NUMERIC(10, 2) DEFAULT 500.00,
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'successful', 'failed', 'refunded')),
    appointment_status VARCHAR(20) DEFAULT 'confirmed' CHECK (appointment_status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    meeting_link TEXT,
    clinic_address TEXT,
    doctor_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    payment_provider VARCHAR(50) DEFAULT 'razorpay',
    payment_reference VARCHAR(100) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'successful' CHECK (payment_status IN ('pending', 'successful', 'failed', 'refunded')),
    payment_method VARCHAR(50) DEFAULT 'card',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. PRESCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prescription_number VARCHAR(50) UNIQUE,
    doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INT,
    diagnosis TEXT,
    instructions TEXT,
    medications JSONB DEFAULT '[]'::jsonb,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    link TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Extra columns for Doctor profiles on users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS specialization VARCHAR(255) DEFAULT 'General Physician';
ALTER TABLE users ADD COLUMN IF NOT EXISTS clinic_address TEXT DEFAULT 'MedAssist Health Center, Suite 302, Medical City';
ALTER TABLE users ADD COLUMN IF NOT EXISTS consultation_fee NUMERIC(10, 2) DEFAULT 500.00;
ALTER TABLE users ADD COLUMN IF NOT EXISTS experience_years INT DEFAULT 8;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT 'Experienced healthcare specialist dedicated to evidence-based medical consulting and personalized patient care.';
ALTER TABLE users ADD COLUMN IF NOT EXISTS availability JSONB DEFAULT '["09:00 AM", "10:30 AM", "11:45 AM", "02:00 PM", "03:30 PM", "05:00 PM"]'::jsonb;

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_users_assigned_doctor ON users(assigned_doctor_id);
CREATE INDEX IF NOT EXISTS idx_medical_reports_user ON medical_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_vital_readings_user ON vital_readings(user_id);
CREATE INDEX IF NOT EXISTS idx_vital_readings_report ON vital_readings(report_id);
CREATE INDEX IF NOT EXISTS idx_disease_risks_user ON disease_risks(user_id);
CREATE INDEX IF NOT EXISTS idx_trend_metrics_user ON trend_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_trend_points_metric ON trend_points(metric_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_patient_alerts_doctor ON patient_alerts(doctor_id);
CREATE INDEX IF NOT EXISTS idx_patient_alerts_status ON patient_alerts(status);
CREATE INDEX IF NOT EXISTS idx_patient_alerts_patient ON patient_alerts(patient_id);
CREATE INDEX IF NOT EXISTS idx_doctor_patients_doc ON doctor_patients(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_patients_pat ON doctor_patients(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doc ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_pat ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_payments_appt ON payments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_payments_pat ON payments(patient_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doc ON prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_pat ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);


