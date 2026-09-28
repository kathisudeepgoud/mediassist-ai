/**
 * Server Entity Definitions matching src/types/index.ts
 */

/**
 * @typedef {Object} UserProfile
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {string} [phone]
 * @property {number} [age]
 * @property {'Male'|'Female'|'Other'} [gender]
 * @property {string} [bloodGroup]
 * @property {number} [heightCm]
 * @property {number} [weightKg]
 * @property {string} [photoUrl]
 */

/**
 * @typedef {Object} VitalReading
 * @property {string} [id]
 * @property {string} label
 * @property {number} value
 * @property {string} unit
 * @property {'normal'|'borderline'|'high'|'low'} status
 * @property {string} referenceRange
 */

/**
 * @typedef {Object} MedicalReport
 * @property {string} id
 * @property {string} patientName
 * @property {number} age
 * @property {string} gender
 * @property {string} reportDate
 * @property {string} hospital
 * @property {string} doctor
 * @property {string} type
 * @property {string} summary
 * @property {string[]} keyFindings
 * @property {VitalReading[]} vitals
 * @property {'PDF'|'PNG'|'JPG'} fileType
 */

/**
 * @typedef {Object} DiseaseRisk
 * @property {string} id
 * @property {string} name
 * @property {number} percentage
 * @property {'Low'|'Moderate'|'High'} status
 * @property {string} explanation
 * @property {string[]} suggestions
 */

/**
 * @typedef {Object} TrendPoint
 * @property {string} date
 * @property {number} value
 */

/**
 * @typedef {Object} TrendMetric
 * @property {string} id
 * @property {string} name
 * @property {string} unit
 * @property {string} color
 * @property {TrendPoint[]} data
 * @property {[number, number]} normalRange
 */

/**
 * @typedef {Object} FoodItem
 * @property {string} id
 * @property {string} name
 * @property {string} benefits
 * @property {number} calories
 * @property {string} protein
 * @property {string} category
 */

/**
 * @typedef {Object} MealPlanDay
 * @property {string} day
 * @property {string} breakfast
 * @property {string} lunch
 * @property {string} dinner
 * @property {string} snacks
 */

/**
 * @typedef {Object} ChatMessage
 * @property {string} id
 * @property {'user'|'assistant'} role
 * @property {string} content
 * @property {string} timestamp
 */

/**
 * @typedef {Object} UserSettings
 * @property {string} [theme]
 * @property {boolean} [notificationsEnabled]
 * @property {boolean} [emailAlerts]
 * @property {string} [language]
 */
