-- Database Schema for IFCT 2017 & Personalized Diet Planner

-- 1. FOOD GROUPS TABLE
CREATE TABLE IF NOT EXISTS food_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_code VARCHAR(10) UNIQUE NOT NULL,
    group_name VARCHAR(255) NOT NULL,
    dietary_tags TEXT[] DEFAULT '{}',
    source VARCHAR(100) DEFAULT 'IFCT 2017',
    source_version VARCHAR(50) DEFAULT '2017',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. FOODS TABLE
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

-- 3. NUTRIENTS TABLE
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

-- 4. FOOD NUTRIENTS TABLE
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

-- 5. FOOD NAMES (MULTILINGUAL LOCAL NAMES)
CREATE TABLE IF NOT EXISTS food_names (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    food_id UUID NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
    language VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    source VARCHAR(100) DEFAULT 'IFCT 2017'
);

-- 6. PATIENT DIET PREFERENCES TABLE
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

-- 7. DIET PLANS TABLE
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

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_foods_code ON foods(food_code);
CREATE INDEX IF NOT EXISTS idx_foods_name ON foods(food_name);
CREATE INDEX IF NOT EXISTS idx_foods_group ON foods(food_group_id);
CREATE INDEX IF NOT EXISTS idx_nutrients_code ON nutrients(nutrient_code);
CREATE INDEX IF NOT EXISTS idx_food_nutrients_food ON food_nutrients(food_id);
CREATE INDEX IF NOT EXISTS idx_food_nutrients_nutrient ON food_nutrients(nutrient_id);
CREATE INDEX IF NOT EXISTS idx_food_names_food ON food_names(food_id);
CREATE INDEX IF NOT EXISTS idx_food_names_name ON food_names(name);
CREATE INDEX IF NOT EXISTS idx_diet_preferences_user ON diet_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_diet_plans_user ON diet_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_diet_plans_generated ON diet_plans(generated_at);
