/**
 * Health Score Calculator
 * 
 * Calculates a Health Score out of 100 based on:
 * - Water intake (liters)
 * - Calories intake (kcal)
 * - Burned calories (kcal)
 * - Height (cm or meters)
 * - Weight (kg)
 * 
 * Scoring breakdown:
 * - Water Intake Score: 0-25 points
 * - Nutrition Score: 0-25 points
 * - Burned Calories Score: 0-25 points
 * - BMI Score: 0-25 points
 * 
 * Final score is the sum of all four, clamped between 0 and 100.
 */

/**
 * Calculate Health Score out of 100
 * 
 * @param waterIntake - Water intake in liters (can be null/undefined)
 * @param caloriesIntake - Calories intake in kcal (can be null/undefined)
 * @param burnedCalories - Burned calories in kcal (can be null/undefined)
 * @param height - Height in cm (can be null/undefined or string)
 * @param weight - Weight in kg (can be null/undefined or string)
 * @returns Health Score between 0 and 100
 */
export function calculateHealthScore(
  waterIntake: number | null | undefined,
  caloriesIntake: number | null | undefined,
  burnedCalories: number | null | undefined,
  height: string | number | null | undefined,
  weight: string | number | null | undefined
): number {
  // Parse height and weight (they might be strings from profile)
  const heightNum = parseHeight(height);
  const weightNum = parseWeight(weight);

  // Calculate individual scores
  const waterScore = calculateWaterScore(waterIntake, weightNum);
  const nutritionScore = calculateNutritionScore(caloriesIntake);
  const burnedScore = calculateBurnedCaloriesScore(burnedCalories);
  const bmiScore = calculateBMIScore(heightNum, weightNum);

  // Sum all scores and clamp between 0 and 100
  const totalScore = waterScore + nutritionScore + burnedScore + bmiScore;
  return Math.max(0, Math.min(100, Math.round(totalScore)));
}

/**
 * Calculate Water Intake Score (0-25 points)
 * Recommended water = weight × 0.033 liters
 * Score = (actualWater / recommendedWater) × 25, capped at 25
 */
function calculateWaterScore(
  waterIntake: number | null | undefined,
  weight: number | null
): number {
  if (!waterIntake || waterIntake <= 0 || !weight || weight <= 0) {
    return 0;
  }

  const recommendedWater = weight * 0.033; // liters per kg
  const score = (waterIntake / recommendedWater) * 25;
  return Math.min(25, Math.max(0, score));
}

/**
 * Calculate Nutrition Score (0-25 points)
 * Ideal daily calories = 2200 kcal
 * Score = 25 − (abs(actualCalories − 2200) / 2200 × 25)
 * Minimum score = 0
 */
function calculateNutritionScore(
  caloriesIntake: number | null | undefined
): number {
  if (!caloriesIntake || caloriesIntake <= 0) {
    return 0;
  }

  const idealCalories = 2200;
  const difference = Math.abs(caloriesIntake - idealCalories);
  const score = 25 - (difference / idealCalories) * 25;
  return Math.max(0, Math.min(25, score));
}

/**
 * Calculate Burned Calories Score (0-25 points)
 * Ideal burned calories = 300 kcal
 * Score = (burnedCalories / 300) × 25, capped at 25
 */
function calculateBurnedCaloriesScore(
  burnedCalories: number | null | undefined
): number {
  if (!burnedCalories || burnedCalories <= 0) {
    return 0;
  }

  const idealBurned = 300;
  const score = (burnedCalories / idealBurned) * 25;
  return Math.min(25, Math.max(0, score));
}

/**
 * Calculate BMI Score (0-25 points)
 * BMI = weight / (height × height) [in meters]
 * - If BMI is between 18.5–24.9 → 25 points
 * - If BMI is between 25–29.9 → 18 points
 * - Otherwise → 10 points
 */
function calculateBMIScore(
  height: number | null,
  weight: number | null
): number {
  if (!height || height <= 0 || !weight || weight <= 0) {
    return 0;
  }

  // Convert height from cm to meters if needed
  const heightInMeters = height > 10 ? height / 100 : height;
  
  // Calculate BMI
  const bmi = weight / (heightInMeters * heightInMeters);

  // Score based on BMI range
  if (bmi >= 18.5 && bmi <= 24.9) {
    return 25; // Normal weight
  } else if (bmi >= 25 && bmi <= 29.9) {
    return 18; // Overweight
  } else {
    return 10; // Underweight or obese
  }
}

/**
 * Parse height value (handles both cm and meters, strings and numbers)
 * Returns height in cm
 */
function parseHeight(height: string | number | null | undefined): number | null {
  if (height === null || height === undefined) {
    return null;
  }

  const num = typeof height === 'string' ? parseFloat(height) : height;
  
  if (isNaN(num) || num <= 0) {
    return null;
  }

  // If height is less than 10, assume it's in meters and convert to cm
  // Otherwise assume it's already in cm
  return num < 10 ? num * 100 : num;
}

/**
 * Parse weight value (handles strings and numbers)
 * Returns weight in kg
 */
function parseWeight(weight: string | number | null | undefined): number | null {
  if (weight === null || weight === undefined) {
    return null;
  }

  const num = typeof weight === 'string' ? parseFloat(weight) : weight;
  
  if (isNaN(num) || num <= 0) {
    return null;
  }

  return num;
}

/**
 * Get Health Score description based on score value
 */
export function getHealthScoreDescription(score: number): string {
  if (score >= 80) {
    return `Based on your overview health tracking, your score is ${score} and considered excellent. Keep up the great work!`;
  } else if (score >= 60) {
    return `Based on your overview health tracking, your score is ${score} and considered good. You're on the right track!`;
  } else if (score >= 40) {
    return `Based on your overview health tracking, your score is ${score} and considered fair. There's room for improvement.`;
  } else {
    return `Based on your overview health tracking, your score is ${score}. Focus on improving your daily health habits.`;
  }
}

