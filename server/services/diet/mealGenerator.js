/**
 * Authentic Indian Meal Generation & Nutrition Calculation Engine
 *
 * Generates structured 5-meal (or 3-meal) daily plans following traditional
 * Indian meal pairing principles (Grain staple + Protein/Dal/Meat/Fish/Egg + Veg/Salad + Dairy/Snack)
 * with exact nutrient summation from IFCT 2017 values per portion size,
 * user-personalized seeding, non-veg rotation, and anti-repetition variety.
 */

// Configurable baseline Indian serving portions (in grams)
const SERVING_SIZES = {
  staple_cereal_main: 80,      // Flour/Rice dry weight ~2 rotis or 1 bowl cooked rice
  staple_cereal_breakfast: 60, // Poha/Oats/Upma/Idli dry equivalent
  pulse_dal_main: 45,          // Dry dal/legume equivalent for 1 medium bowl cooked
  non_veg_main: 120,           // Cooked poultry / fish / meat portion (~120g)
  egg_serving: 100,            // 2 medium boiled/cooked eggs (~100g)
  vegetable_sabzi: 120,        // Cooked sabzi vegetable portion
  leafy_vegetable: 100,        // GLV portion
  salad_veg: 80,               // Sliced cucumber/carrot/tomato
  snack_fruit: 120,            // 1 medium fruit (Apple/Guava/Orange/Papaya)
  snack_nuts: 20,              // Handful of almonds/walnuts/seeds
  dairy_curd_milk: 150,        // 1 bowl curd / cup low-fat milk
  oil_cooking: 10              // Approx. 2 tsp healthy cooking oil
};

function calculateNutrientTotals(items = []) {
  const totals = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sodium: 0,
    potassium: 0,
    calcium: 0,
    iron: 0,
    vitaminC: 0
  };

  for (const item of items) {
    const qtyGrams = item.quantityGrams || 100;
    const factor = qtyGrams / 100.0;
    const n = item.foodNutrients || {};

    // In IFCT: enerc in kJ -> convert to kcal (kJ / 4.184)
    const rawKj = n.enerc || 0;
    const calFromKj = Math.round(rawKj / 4.184);

    totals.calories += Math.round(calFromKj * factor);
    totals.protein += Number(((n.protcnt || 0) * factor).toFixed(2));
    totals.carbs += Number(((n.choavldf || 0) * factor).toFixed(2));
    totals.fat += Number(((n.fatce || 0) * factor).toFixed(2));
    totals.fiber += Number(((n.fibtg || 0) * factor).toFixed(2));
    totals.sodium += Number(((n.na || 0) * factor).toFixed(1));
    totals.potassium += Number(((n.k || 0) * factor).toFixed(1));
    totals.calcium += Number(((n.ca || 0) * factor).toFixed(1));
    totals.iron += Number(((n.fe || 0) * factor).toFixed(2));
    totals.vitaminC += Number(((n.vitc || 0) * factor).toFixed(1));
  }

  // Round macro totals for clean display
  totals.protein = Number(totals.protein.toFixed(1));
  totals.carbs = Number(totals.carbs.toFixed(1));
  totals.fat = Number(totals.fat.toFixed(1));
  totals.fiber = Number(totals.fiber.toFixed(1));
  totals.sodium = Math.round(totals.sodium);
  totals.potassium = Math.round(totals.potassium);
  totals.calcium = Math.round(totals.calcium);
  totals.iron = Number(totals.iron.toFixed(1));
  totals.vitaminC = Number(totals.vitaminC.toFixed(1));

  return totals;
}

/**
 * Clean and format food presentation name for Indian culinary context
 */
function formatCulinaryFoodName(food, mealSlot = 'lunch') {
  if (!food) return 'Healthy Food Item';
  const name = food.food_name || '';
  const group = food.group_code || '';

  // Specific formatters by group
  if (group === 'A') {
    if (/wheat|gehun/i.test(name)) return `${name} (Whole Wheat Rotis / Phulkas)`;
    if (/rice/i.test(name)) return `${name} (Steamed Brown / Parboiled Rice)`;
    if (/bajra|pearl/i.test(name)) return `${name} (Bajra Roti)`;
    if (/jowar|sorghum/i.test(name)) return `${name} (Jowar Bhakri)`;
    if (/ragi|finger/i.test(name)) return `${name} (Ragi Dosa / Porridge)`;
    if (/oat/i.test(name)) return `${name} (Oats Porridge / Upma)`;
    if (/barley|jau/i.test(name)) return `${name} (Barley / Jau Khichdi)`;
    return `${name} (Whole Grain Staple)`;
  }

  if (group === 'B') {
    if (/moong/i.test(name)) return `${name} (Yellow Moong Dal Tadka)`;
    if (/toor|arhar/i.test(name)) return `${name} (Toor Dal / Sambar)`;
    if (/chana|bengal|chickpea/i.test(name)) return `${name} (Chana Masala / Boiled Chana)`;
    if (/rajma|kidney/i.test(name)) return `${name} (Homestyle Rajma Curry)`;
    if (/masoor|lentil/i.test(name)) return `${name} (Masoor Dal Curry)`;
    if (/soya|soy/i.test(name)) return `${name} (Soya Chunk / Tofu Curry)`;
    return `${name} (Cooked Dal / Legume Curry)`;
  }

  if (group === 'M') {
    if (/boiled/i.test(name)) return `${name} (2 Hard-Boiled Eggs)`;
    if (/omlet/i.test(name)) return `${name} (Vegetable Egg Omelette / Bhurji)`;
    return `${name} (Egg Preparation / Curry)`;
  }

  if (group === 'N') {
    if (/breast/i.test(name)) return `${name} (Grilled Chicken Breast / Mild Curry)`;
    return `${name} (Homestyle Chicken Curry)`;
  }

  if (['P', 'Q', 'R', 'S'].includes(group)) {
    return `${name} (Steamed / Grilled Fish Curry)`;
  }

  if (group === 'O') {
    return `${name} (Lean Meat Stew / Curry)`;
  }

  if (group === 'C') {
    return `${name} (Steamed / Stir-fried Saag)`;
  }

  if (group === 'D' || group === 'F') {
    if (mealSlot === 'salad') return `${name} (Fresh Sliced Salad)`;
    return `${name} (Steamed Sabzi)`;
  }

  if (group === 'E') {
    return `${name} (Fresh Sliced Fruit Bowl)`;
  }

  if (group === 'H') {
    return `${name} (Handful of Soaked / Roasted Nuts)`;
  }

  if (group === 'L') {
    return `${name} (Fresh Curd / Low-Fat Milk)`;
  }

  return name;
}

/**
 * Smart diversity picker that prevents repeating foods across meals on the same day
 * and rotates variety across the week with user-specific seeding.
 */
function pickDiverseFood(pool = [], usedInDay = new Set(), usedInWeek = new Map(), seed = 0) {
  if (!pool || pool.length === 0) return null;

  // 1. Filter out foods already used in today's meals
  let candidates = pool.filter(f => !usedInDay.has(f.food_code));
  if (candidates.length === 0) {
    candidates = pool; // fallback if pool exhausted
  }

  // 2. Sort candidates prioritizing:
  //    a) Least used across the 7-day week
  //    b) Clinical suitability score (higher is better)
  candidates.sort((a, b) => {
    const countA = usedInWeek.get(a.food_code) || 0;
    const countB = usedInWeek.get(b.food_code) || 0;
    if (countA !== countB) return countA - countB;
    return b.score - a.score;
  });

  // 3. Pick from top 3 candidates with user seed rotation
  const topSlice = candidates.slice(0, Math.min(3, candidates.length));
  const selected = topSlice[Math.abs(seed) % topSlice.length] || candidates[0];

  // 4. Mark as used
  usedInDay.add(selected.food_code);
  usedInWeek.set(selected.food_code, (usedInWeek.get(selected.food_code) || 0) + 1);

  return selected;
}

/**
 * Generate a single day's structured meal plan
 */
function generateDailyMealPlan({
  rankedFoods = [],
  resolution = {},
  preferences = {},
  dayOffset = 0,
  dayName = 'Monday',
  targetDate = null,
  userSeed = 0,
  usedInWeek = new Map()
}) {
  const mealCount = preferences.meal_count === 3 ? 3 : 5;
  const targetCalories = resolution.unifiedConstraints?.targetCalories || 1800;
  const dietType = (preferences.diet_type || 'Vegetarian').toLowerCase();

  // Dynamic scaling factor based on calorie target (normalized to 1800 baseline)
  const portionScale = Math.max(0.75, Math.min(1.35, targetCalories / 1800));

  // Partition foods into category pools
  const pool = {
    cereals: rankedFoods.filter(f => f.group_code === 'A'),
    legumes: rankedFoods.filter(f => f.group_code === 'B'),
    leafyVeg: rankedFoods.filter(f => f.group_code === 'C'),
    otherVeg: rankedFoods.filter(f => f.group_code === 'D'),
    fruits: rankedFoods.filter(f => f.group_code === 'E'),
    roots: rankedFoods.filter(f => f.group_code === 'F'),
    nuts: rankedFoods.filter(f => f.group_code === 'H'),
    dairy: rankedFoods.filter(f => f.group_code === 'L'),
    eggs: rankedFoods.filter(f => f.group_code === 'M'),
    poultry: rankedFoods.filter(f => f.group_code === 'N'),
    meat: rankedFoods.filter(f => f.group_code === 'O'),
    fish: rankedFoods.filter(f => ['P', 'Q', 'R', 'S'].includes(f.group_code))
  };

  const usedInDay = new Set();
  const daySeed = userSeed + dayOffset * 23;

  const isNonVeg = ['non-vegetarian', 'non-veg'].includes(dietType);
  const isEggetarian = dietType === 'eggetarian';
  const isFishetarian = ['fishetarian', 'pescatarian'].includes(dietType);

  // --------------------------------------------------------------------------
  // 1. BREAKFAST ASSEMBLY
  // --------------------------------------------------------------------------
  let bfStaple = pickDiverseFood(pool.cereals, usedInDay, usedInWeek, daySeed + 1);
  let bfProtein = null;

  if (isNonVeg || isEggetarian) {
    // Alternate egg breakfast on even days, plant protein on odd days
    if (dayOffset % 2 === 0 && pool.eggs.length > 0) {
      bfProtein = pickDiverseFood(pool.eggs, usedInDay, usedInWeek, daySeed + 2);
    } else {
      bfProtein = pickDiverseFood(pool.legumes, usedInDay, usedInWeek, daySeed + 2) ||
                  pickDiverseFood(pool.dairy, usedInDay, usedInWeek, daySeed + 2);
    }
  } else {
    bfProtein = pickDiverseFood(pool.legumes, usedInDay, usedInWeek, daySeed + 2) ||
                pickDiverseFood(pool.dairy, usedInDay, usedInWeek, daySeed + 2);
  }

  const bfFruit = pickDiverseFood(pool.fruits, usedInDay, usedInWeek, daySeed + 3);

  const breakfastItems = [];
  if (bfStaple) {
    const qty = Math.round(SERVING_SIZES.staple_cereal_breakfast * portionScale);
    breakfastItems.push({
      foodId: bfStaple.id,
      foodCode: bfStaple.food_code,
      name: formatCulinaryFoodName(bfStaple, 'breakfast'),
      portion: `1 bowl / 2 portions (~${qty}g dry equivalent)`,
      quantityGrams: qty,
      foodNutrients: bfStaple.nutrients,
      reasons: bfStaple.reasons
    });
  }
  if (bfProtein) {
    const isEgg = bfProtein.group_code === 'M';
    const qty = isEgg ? SERVING_SIZES.egg_serving : Math.round(SERVING_SIZES.pulse_dal_main * portionScale);
    breakfastItems.push({
      foodId: bfProtein.id,
      foodCode: bfProtein.food_code,
      name: formatCulinaryFoodName(bfProtein, 'breakfast'),
      portion: isEgg ? '2 boiled eggs / 1 omelette' : `1 small bowl (~${qty}g)`,
      quantityGrams: qty,
      foodNutrients: bfProtein.nutrients,
      reasons: bfProtein.reasons
    });
  }

  // --------------------------------------------------------------------------
  // 2. MID-MORNING SNACK ASSEMBLY
  // --------------------------------------------------------------------------
  const mmItems = [];
  if (bfFruit) {
    const qty = SERVING_SIZES.snack_fruit;
    mmItems.push({
      foodId: bfFruit.id,
      foodCode: bfFruit.food_code,
      name: formatCulinaryFoodName(bfFruit, 'fruit'),
      portion: `1 whole fresh fruit / bowl (~${qty}g)`,
      quantityGrams: qty,
      foodNutrients: bfFruit.nutrients,
      reasons: bfFruit.reasons
    });
  }

  // --------------------------------------------------------------------------
  // 3. LUNCH ASSEMBLY
  // --------------------------------------------------------------------------
  const lunchCereal = pickDiverseFood(pool.cereals, usedInDay, usedInWeek, daySeed + 4);
  let lunchProtein = null;

  if (isNonVeg) {
    // Non-veg rotation throughout the 7 days:
    // Days 0, 3: Poultry (Chicken)
    // Days 1, 4: Fish / Seafood
    // Days 2: Legumes (Dal / Chana / Rajma)
    // Days 5: Animal Meat (if available & permitted) or Poultry
    // Days 6: Egg Curry or Fish
    if ((dayOffset === 0 || dayOffset === 3) && pool.poultry.length > 0) {
      lunchProtein = pickDiverseFood(pool.poultry, usedInDay, usedInWeek, daySeed + 5);
    } else if ((dayOffset === 1 || dayOffset === 4) && pool.fish.length > 0) {
      lunchProtein = pickDiverseFood(pool.fish, usedInDay, usedInWeek, daySeed + 5);
    } else if (dayOffset === 5 && pool.meat.length > 0) {
      lunchProtein = pickDiverseFood(pool.meat, usedInDay, usedInWeek, daySeed + 5);
    } else if (pool.legumes.length > 0) {
      lunchProtein = pickDiverseFood(pool.legumes, usedInDay, usedInWeek, daySeed + 5);
    } else {
      lunchProtein = pickDiverseFood(pool.poultry.length > 0 ? pool.poultry : pool.fish, usedInDay, usedInWeek, daySeed + 5);
    }
  } else if (isFishetarian) {
    if (dayOffset % 2 === 0 && pool.fish.length > 0) {
      lunchProtein = pickDiverseFood(pool.fish, usedInDay, usedInWeek, daySeed + 5);
    } else {
      lunchProtein = pickDiverseFood(pool.legumes, usedInDay, usedInWeek, daySeed + 5);
    }
  } else if (isEggetarian) {
    if (dayOffset % 2 === 1 && pool.eggs.length > 0) {
      lunchProtein = pickDiverseFood(pool.eggs, usedInDay, usedInWeek, daySeed + 5);
    } else {
      lunchProtein = pickDiverseFood(pool.legumes, usedInDay, usedInWeek, daySeed + 5);
    }
  } else {
    // Vegetarian / Vegan
    lunchProtein = pickDiverseFood(pool.legumes, usedInDay, usedInWeek, daySeed + 5);
  }

  const lunchSabzi = pickDiverseFood(pool.leafyVeg.length > 0 ? pool.leafyVeg : pool.otherVeg, usedInDay, usedInWeek, daySeed + 6);
  const lunchSalad = pickDiverseFood(pool.otherVeg, usedInDay, usedInWeek, daySeed + 7) ||
                     pickDiverseFood(pool.dairy, usedInDay, usedInWeek, daySeed + 7);

  const lunchItems = [];
  if (lunchCereal) {
    const qty = Math.round(SERVING_SIZES.staple_cereal_main * portionScale);
    lunchItems.push({
      foodId: lunchCereal.id,
      foodCode: lunchCereal.food_code,
      name: formatCulinaryFoodName(lunchCereal, 'lunch'),
      portion: `2-3 medium rotis / 1 bowl (~${qty}g)`,
      quantityGrams: qty,
      foodNutrients: lunchCereal.nutrients,
      reasons: lunchCereal.reasons
    });
  }
  if (lunchProtein) {
    const isMeatOrFish = ['N', 'O', 'P', 'Q', 'R', 'S'].includes(lunchProtein.group_code);
    const isEgg = lunchProtein.group_code === 'M';
    const qty = isMeatOrFish ? SERVING_SIZES.non_veg_main : (isEgg ? SERVING_SIZES.egg_serving : Math.round(SERVING_SIZES.pulse_dal_main * portionScale));
    const portionDesc = isMeatOrFish ? `1 medium portion (~${qty}g)` : (isEgg ? '2 boiled eggs / egg curry' : `1 katori / bowl (~${qty}g dry)`);

    lunchItems.push({
      foodId: lunchProtein.id,
      foodCode: lunchProtein.food_code,
      name: formatCulinaryFoodName(lunchProtein, 'lunch'),
      portion: portionDesc,
      quantityGrams: qty,
      foodNutrients: lunchProtein.nutrients,
      reasons: lunchProtein.reasons
    });
  }
  if (lunchSabzi) {
    const qty = SERVING_SIZES.vegetable_sabzi;
    lunchItems.push({
      foodId: lunchSabzi.id,
      foodCode: lunchSabzi.food_code,
      name: formatCulinaryFoodName(lunchSabzi, 'sabzi'),
      portion: `1 bowl (~${qty}g)`,
      quantityGrams: qty,
      foodNutrients: lunchSabzi.nutrients,
      reasons: lunchSabzi.reasons
    });
  }
  if (lunchSalad) {
    const qty = SERVING_SIZES.salad_veg;
    lunchItems.push({
      foodId: lunchSalad.id,
      foodCode: lunchSalad.food_code,
      name: formatCulinaryFoodName(lunchSalad, 'salad'),
      portion: `1 small plate / side (~${qty}g)`,
      quantityGrams: qty,
      foodNutrients: lunchSalad.nutrients,
      reasons: lunchSalad.reasons
    });
  }

  // --------------------------------------------------------------------------
  // 4. EVENING SNACK ASSEMBLY
  // --------------------------------------------------------------------------
  const eveNuts = pickDiverseFood(pool.nuts, usedInDay, usedInWeek, daySeed + 8) ||
                 pickDiverseFood(pool.fruits, usedInDay, usedInWeek, daySeed + 8);
  const eveningItems = [];
  if (eveNuts) {
    const qty = SERVING_SIZES.snack_nuts;
    eveningItems.push({
      foodId: eveNuts.id,
      foodCode: eveNuts.food_code,
      name: formatCulinaryFoodName(eveNuts, 'snack'),
      portion: `Handful of soaked/roasted nuts (~${qty}g)`,
      quantityGrams: qty,
      foodNutrients: eveNuts.nutrients,
      reasons: eveNuts.reasons
    });
  }

  // --------------------------------------------------------------------------
  // 5. DINNER ASSEMBLY
  // --------------------------------------------------------------------------
  const dinnerCereal = pickDiverseFood(pool.cereals, usedInDay, usedInWeek, daySeed + 9);
  let dinnerProtein = null;

  if (isNonVeg) {
    // Non-veg dinner rotation:
    // Days 1, 4: Fish (Light grilled / steamed fish)
    // Days 0, 5: Poultry / Egg curry
    // Days 2, 3, 6: Light Yellow Dal / Paneer / Tofu
    if ((dayOffset === 1 || dayOffset === 4) && pool.fish.length > 0) {
      dinnerProtein = pickDiverseFood(pool.fish, usedInDay, usedInWeek, daySeed + 10);
    } else if ((dayOffset === 0 || dayOffset === 5) && pool.eggs.length > 0) {
      dinnerProtein = pickDiverseFood(pool.eggs, usedInDay, usedInWeek, daySeed + 10);
    } else if (pool.legumes.length > 0) {
      dinnerProtein = pickDiverseFood(pool.legumes, usedInDay, usedInWeek, daySeed + 10);
    } else {
      dinnerProtein = pickDiverseFood(pool.dairy, usedInDay, usedInWeek, daySeed + 10);
    }
  } else if (isFishetarian) {
    if (dayOffset % 2 === 1 && pool.fish.length > 0) {
      dinnerProtein = pickDiverseFood(pool.fish, usedInDay, usedInWeek, daySeed + 10);
    } else {
      dinnerProtein = pickDiverseFood(pool.legumes, usedInDay, usedInWeek, daySeed + 10);
    }
  } else if (isEggetarian) {
    if (dayOffset % 2 === 0 && pool.eggs.length > 0) {
      dinnerProtein = pickDiverseFood(pool.eggs, usedInDay, usedInWeek, daySeed + 10);
    } else {
      dinnerProtein = pickDiverseFood(pool.legumes, usedInDay, usedInWeek, daySeed + 10);
    }
  } else {
    // Vegetarian / Vegan
    dinnerProtein = pickDiverseFood(pool.legumes, usedInDay, usedInWeek, daySeed + 10) ||
                    pickDiverseFood(pool.dairy, usedInDay, usedInWeek, daySeed + 10);
  }

  const dinnerVeg = pickDiverseFood(pool.otherVeg, usedInDay, usedInWeek, daySeed + 11) ||
                    pickDiverseFood(pool.leafyVeg, usedInDay, usedInWeek, daySeed + 11);

  const dinnerItems = [];
  if (dinnerCereal) {
    const qty = Math.round(70 * portionScale);
    dinnerItems.push({
      foodId: dinnerCereal.id,
      foodCode: dinnerCereal.food_code,
      name: formatCulinaryFoodName(dinnerCereal, 'dinner'),
      portion: `2 phulkas or 1 bowl (~${qty}g)`,
      quantityGrams: qty,
      foodNutrients: dinnerCereal.nutrients,
      reasons: dinnerCereal.reasons
    });
  }
  if (dinnerProtein) {
    const isMeatOrFish = ['N', 'O', 'P', 'Q', 'R', 'S'].includes(dinnerProtein.group_code);
    const isEgg = dinnerProtein.group_code === 'M';
    const qty = isMeatOrFish ? SERVING_SIZES.non_veg_main : (isEgg ? SERVING_SIZES.egg_serving : Math.round(40 * portionScale));
    const portionDesc = isMeatOrFish ? `1 portion (~${qty}g)` : (isEgg ? '2 boiled eggs / egg bhurji' : `1 katori (~${qty}g dry)`);

    dinnerItems.push({
      foodId: dinnerProtein.id,
      foodCode: dinnerProtein.food_code,
      name: formatCulinaryFoodName(dinnerProtein, 'dinner'),
      portion: portionDesc,
      quantityGrams: qty,
      foodNutrients: dinnerProtein.nutrients,
      reasons: dinnerProtein.reasons
    });
  }
  if (dinnerVeg) {
    const qty = 100;
    dinnerItems.push({
      foodId: dinnerVeg.id,
      foodCode: dinnerVeg.food_code,
      name: formatCulinaryFoodName(dinnerVeg, 'sabzi'),
      portion: `1 medium bowl (~${qty}g)`,
      quantityGrams: qty,
      foodNutrients: dinnerVeg.nutrients,
      reasons: dinnerVeg.reasons
    });
  }

  // Calculate nutrition totals
  const breakfastNutrition = calculateNutrientTotals(breakfastItems);
  const midMorningNutrition = calculateNutrientTotals(mmItems);
  const lunchNutrition = calculateNutrientTotals(lunchItems);
  const eveningNutrition = calculateNutrientTotals(eveningItems);
  const dinnerNutrition = calculateNutrientTotals(dinnerItems);

  const allItems = [
    ...breakfastItems,
    ...(mealCount === 5 ? mmItems : []),
    ...lunchItems,
    ...(mealCount === 5 ? eveningItems : []),
    ...dinnerItems
  ];

  const dailyNutrition = calculateNutrientTotals(allItems);

  const meals = {
    breakfast: { title: 'Breakfast (7:30 - 8:30 AM)', items: breakfastItems, nutrition: breakfastNutrition },
    ...(mealCount === 5 ? { mid_morning: { title: 'Mid-Morning Snack (11:00 AM)', items: mmItems, nutrition: midMorningNutrition } } : {}),
    lunch: { title: 'Lunch (1:00 - 2:00 PM)', items: lunchItems, nutrition: lunchNutrition },
    ...(mealCount === 5 ? { evening_snack: { title: 'Evening Snack (5:00 PM)', items: eveningItems, nutrition: eveningNutrition } } : {}),
    dinner: { title: 'Dinner (7:30 - 8:30 PM)', items: dinnerItems, nutrition: dinnerNutrition }
  };

  return {
    day: dayName,
    date: targetDate || new Date().toISOString().split('T')[0],
    mealCount,
    targetCalories,
    meals,
    dailyNutrition
  };
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/**
 * Generate a complete 7-day personalized weekly diet plan
 */
function generateWeeklyDietPlan(rankedFoods = [], resolution = {}, preferences = {}, patientProfile = {}) {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sun, 1 = Mon, ...
  const distanceToMonday = (dayOfWeek + 6) % 7;
  const mondayDate = new Date(today);
  mondayDate.setDate(today.getDate() - distanceToMonday);

  // Derive unique user seed to differentiate plans between different patients
  let userSeed = 42;
  const seedString = `${patientProfile.id || ''}_${patientProfile.patientId || ''}_${patientProfile.name || ''}_${patientProfile.age || ''}`;
  for (let i = 0; i < seedString.length; i++) {
    userSeed = ((userSeed << 5) - userSeed) + seedString.charCodeAt(i);
    userSeed |= 0;
  }

  const usedInWeek = new Map();

  const weeklyPlan = DAYS_OF_WEEK.map((dayName, idx) => {
    const currentDayDate = new Date(mondayDate);
    currentDayDate.setDate(mondayDate.getDate() + idx);
    const dateStr = currentDayDate.toISOString().split('T')[0];

    const dayPlan = generateDailyMealPlan({
      rankedFoods,
      resolution,
      preferences,
      dayOffset: idx,
      dayName,
      targetDate: dateStr,
      userSeed: Math.abs(userSeed),
      usedInWeek
    });

    return {
      day: dayName,
      dayNumber: idx + 1,
      dayName,
      date: dateStr,
      targetCalories: dayPlan.targetCalories,
      nutrition: dayPlan.dailyNutrition,
      dailyNutrition: dayPlan.dailyNutrition,
      meals: dayPlan.meals
    };
  });

  const totalSodium = weeklyPlan.reduce((acc, d) => acc + (d.dailyNutrition?.sodium || 0), 0);
  const totalPotassium = weeklyPlan.reduce((acc, d) => acc + (d.dailyNutrition?.potassium || 0), 0);
  const totalCalcium = weeklyPlan.reduce((acc, d) => acc + (d.dailyNutrition?.calcium || 0), 0);
  const totalIron = weeklyPlan.reduce((acc, d) => acc + (d.dailyNutrition?.iron || 0), 0);
  const totalVitC = weeklyPlan.reduce((acc, d) => acc + (d.dailyNutrition?.vitaminC || 0), 0);

  const avgNutrition = {
    calories: Math.round(weeklyPlan.reduce((acc, d) => acc + (d.dailyNutrition?.calories || 0), 0) / 7),
    protein: Number((weeklyPlan.reduce((acc, d) => acc + (d.dailyNutrition?.protein || 0), 0) / 7).toFixed(1)),
    carbs: Number((weeklyPlan.reduce((acc, d) => acc + (d.dailyNutrition?.carbs || 0), 0) / 7).toFixed(1)),
    fat: Number((weeklyPlan.reduce((acc, d) => acc + (d.dailyNutrition?.fat || 0), 0) / 7).toFixed(1)),
    fiber: Number((weeklyPlan.reduce((acc, d) => acc + (d.dailyNutrition?.fiber || 0), 0) / 7).toFixed(1)),
    sodium: Math.round(totalSodium / 7),
    potassium: Math.round(totalPotassium / 7),
    calcium: Math.round(totalCalcium / 7),
    iron: Number((totalIron / 7).toFixed(1)),
    vitaminC: Number((totalVitC / 7).toFixed(1))
  };

  const mealCount = preferences.meal_count === 3 ? 3 : 5;

  return {
    weekRange: `${weeklyPlan[0].date} to ${weeklyPlan[6].date}`,
    mealCount,
    targetCalories: resolution.unifiedConstraints?.targetCalories || 1800,
    weeklyPlan,
    dailyNutrition: avgNutrition,
    meals: weeklyPlan[0].meals // Day 1 fallback for legacy single-day consumers
  };
}

module.exports = {
  generateDailyMealPlan,
  generateWeeklyDietPlan,
  calculateNutrientTotals,
  SERVING_SIZES
};
