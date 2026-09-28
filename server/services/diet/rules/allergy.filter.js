/**
 * Allergy & Food Intolerance Filtering Layer
 * Handles common Indian and global allergens: Peanuts, Tree nuts, Gluten/Wheat, Dairy/Milk,
 * Eggs, Fish, Crustaceans/Shellfish, Soy, Sesame, Mustard, and custom patient dislikes/exclusions.
 */

const ALLERGEN_KEYWORD_MAP = {
  peanut: ['peanut', 'groundnut', 'singdana', 'mungphali', 'shenga', 'verkadalai', 'pallilu'],
  treenut: ['almond', 'walnut', 'cashew', 'pistachio', 'badam', 'akhrot', 'kaju', 'pista'],
  dairy: ['milk', 'curd', 'yogurt', 'paneer', 'cheese', 'butter', 'ghee', 'whey', 'dahi', 'chhena', 'khoya', 'mava', 'paalu', 'haalu'],
  gluten: ['wheat', 'atta', 'maida', 'suji', 'rava', 'semolina', 'dalia', 'vermicelli', 'sewai', 'barley', 'jau', 'gehun', 'godhumai', 'godhuma'],
  egg: ['egg', 'anda', 'muttai', 'guddu', 'eeg'],
  fish: ['fish', 'macha', 'meen', 'chepa', 'surmai', 'pomfret', 'rohu', 'catla', 'hilsa', 'sardine', 'mackerel', 'tuna', 'salmon'],
  shellfish: ['prawn', 'shrimp', 'crab', 'lobster', 'clam', 'mussel', 'oyster', 'jhinga', 'yera', 'royyalu', 'nandu', 'kekda'],
  soy: ['soy', 'soya', 'soybean', 'tofu', 'edamame'],
  sesame: ['sesame', 'til', 'ellu', 'nuvvulu'],
  mustard: ['mustard', 'sarson', 'rai', 'kadugu', 'aavalu']
};

function isFoodAllergenConflict(foodName, localNamesRaw, allergies = [], excludedFoods = [], foodGroupCode = '') {
  if (!foodName && !foodGroupCode) return false;
  const targetText = `${foodName || ''} ${localNamesRaw || ''}`.toLowerCase();
  const group = (foodGroupCode || '').toUpperCase();

  // 1. Check mapped allergies
  for (const allergy of allergies) {
    const cleanAllergy = (allergy || '').toString().toLowerCase().trim();
    if (!cleanAllergy) continue;

    // Check food group code for Fish & Marine (P, Q, R, S)
    if (cleanAllergy.includes('fish') || cleanAllergy.includes('seafood') || cleanAllergy.includes('prawn') || cleanAllergy.includes('shellfish')) {
      if (['P', 'Q', 'R', 'S'].includes(group)) return true;
    }

    // Check direct substring
    if (targetText.includes(cleanAllergy)) return true;

    // Check keyword map
    for (const [key, keywords] of Object.entries(ALLERGEN_KEYWORD_MAP)) {
      if (cleanAllergy.includes(key)) {
        for (const kw of keywords) {
          // Match whole word or clear substring
          const regex = new RegExp(`\\b${kw}\\b`, 'i');
          if (regex.test(targetText) || targetText.includes(kw)) return true;
        }
      }
    }
  }

  // 2. Check patient custom excluded/disliked foods
  for (const excl of excludedFoods) {
    const cleanExcl = (excl || '').toString().toLowerCase().trim();
    if (cleanExcl && targetText.includes(cleanExcl)) {
      return true;
    }
  }

  return false;
}

function isDietTypeCompliant(foodGroupCode, dietaryTags = [], dietType = 'Vegetarian') {
  const dt = (dietType || 'Vegetarian').toLowerCase();
  const group = (foodGroupCode || '').toUpperCase();

  if (dt === 'vegetarian' || dt === 'veg') {
    // Exclude eggs (M), meat (N, O), seafood (P, Q, R, S)
    if (['M', 'N', 'O', 'P', 'Q', 'R', 'S'].includes(group)) return false;
    return true;
  }

  if (dt === 'eggetarian') {
    // Include eggs (M), exclude meat (N, O), seafood (P, Q, R, S)
    if (['N', 'O', 'P', 'Q', 'R', 'S'].includes(group)) return false;
    return true;
  }

  // Non-Vegetarian: all groups permitted
  return true;
}

module.exports = {
  isFoodAllergenConflict,
  isDietTypeCompliant,
  ALLERGEN_KEYWORD_MAP
};
