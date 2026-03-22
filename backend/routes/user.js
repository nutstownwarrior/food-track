const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/**
 * Scientifically-based calorie and protein goal calculation.
 * BMR: Mifflin-St Jeor (1990) — most validated for general population
 * or Katch-McArdle when body fat % is available.
 * TDEE = BMR × activity multiplier
 * Deficit/surplus based on 7700 kcal/kg fat (more accurate than 3500/lb rule)
 */
function calculateGoals(profile) {
  const {
    gender, birth_year, height_cm, weight_kg, body_fat_pct,
    activity_level, target_weight_kg, weekly_goal_kg, bmr_formula
  } = profile;

  if (!weight_kg || !height_cm || !birth_year) return null;

  const age = new Date().getFullYear() - birth_year;
  let bmr;

  if (bmr_formula === 'katch' && body_fat_pct != null) {
    // Katch-McArdle: best for lean individuals who know their body fat %
    const lbm = weight_kg * (1 - body_fat_pct / 100);
    bmr = 370 + 21.6 * lbm;
  } else {
    // Mifflin-St Jeor (default) — validated across obese and non-obese populations
    const base = 10 * weight_kg + 6.25 * height_cm - 5 * age;
    if (gender === 'männlich') bmr = base + 5;
    else if (gender === 'weiblich') bmr = base - 161;
    else bmr = base - 78; // divers: average of both formulas
  }

  const multiplier = ACTIVITY_MULTIPLIERS[activity_level] || 1.2;
  const tdee = Math.round(bmr * multiplier);

  // 1 kg adipose tissue ≈ 7700 kcal (Hall et al., 2012; more accurate than 3500/lb rule)
  const weeklyGoal = Math.min(Math.abs(weekly_goal_kg || 0.5), 1.0); // cap at 1 kg/week safety limit
  const goalDirection = (target_weight_kg && target_weight_kg < weight_kg) ? 1 : -1; // positive = loss
  const dailyAdjustment = Math.round((weeklyGoal * 7700) / 7) * goalDirection;

  let calorieGoal = tdee - dailyAdjustment;

  // Safety floors — never go below these minimums
  const minCalories = gender === 'männlich' ? 1500 : 1200;
  calorieGoal = Math.max(calorieGoal, minCalories, Math.round(bmr));

  // Protein goal: 2.0 g/kg for weight loss (muscle retention), 1.6–1.8 for others
  let proteinMultiplier = 1.6;
  if (target_weight_kg && target_weight_kg < weight_kg) proteinMultiplier = 2.0;
  else if (target_weight_kg && target_weight_kg > weight_kg) proteinMultiplier = 1.8;
  const proteinGoal = Math.round(weight_kg * proteinMultiplier);

  const deficit = tdee - calorieGoal;
  const warningHighDeficit = deficit > 1000; // > 1000 kcal deficit risks muscle loss

  return {
    bmr: Math.round(bmr),
    tdee,
    calorie_goal: calorieGoal,
    protein_goal_g: proteinGoal,
    deficit,
    warning_high_deficit: warningHighDeficit,
  };
}

// GET /api/user
router.get('/', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, username, email FROM users WHERE id = ?').get(req.userId);
  const profile = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' });

  const goals = profile ? calculateGoals(profile) : null;
  res.json({ user, profile: profile || {}, goals });
});

// PUT /api/user
router.put('/', requireAuth, (req, res) => {
  const {
    display_name, gender, birth_year, height_cm, weight_kg, body_fat_pct,
    activity_level, target_weight_kg, weekly_goal_kg, bmr_formula
  } = req.body;

  const stmt = db.prepare(`
    INSERT INTO user_profiles (user_id, display_name, gender, birth_year, height_cm, weight_kg,
      body_fat_pct, activity_level, target_weight_kg, weekly_goal_kg, bmr_formula, updated_at)
    VALUES (@user_id, @display_name, @gender, @birth_year, @height_cm, @weight_kg,
      @body_fat_pct, @activity_level, @target_weight_kg, @weekly_goal_kg, @bmr_formula, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      display_name = excluded.display_name,
      gender = excluded.gender,
      birth_year = excluded.birth_year,
      height_cm = excluded.height_cm,
      weight_kg = excluded.weight_kg,
      body_fat_pct = excluded.body_fat_pct,
      activity_level = excluded.activity_level,
      target_weight_kg = excluded.target_weight_kg,
      weekly_goal_kg = excluded.weekly_goal_kg,
      bmr_formula = excluded.bmr_formula,
      updated_at = datetime('now')
  `);

  const profileData = {
    user_id: req.userId, display_name, gender, birth_year, height_cm, weight_kg,
    body_fat_pct: body_fat_pct || null, activity_level: activity_level || 'sedentary',
    target_weight_kg, weekly_goal_kg: weekly_goal_kg || 0.5,
    bmr_formula: bmr_formula || 'mifflin'
  };

  stmt.run(profileData);

  // Recalculate and store goals
  const goals = calculateGoals(profileData);
  if (goals) {
    db.prepare('UPDATE user_profiles SET calorie_goal = ?, protein_goal_g = ?, updated_at = datetime(\'now\') WHERE user_id = ?')
      .run(goals.calorie_goal, goals.protein_goal_g, req.userId);
  }

  const updatedProfile = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?').get(req.userId);
  res.json({ profile: updatedProfile, goals });
});

module.exports = router;
