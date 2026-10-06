import type {
  Food,
  Nutrition,
  NutritionKnown,
} from '../types'
import type { PlanItemInterpretation } from './plan-item'

export const EMPTY_NUTRITION: Nutrition = {
  calories: 0,
  weightOz: 0,
  weightGrams: 0,
  fat: 0,
  sodium: 0,
  potassium: 0,
  carbs: 0,
  fiber: 0,
  sugar: 0,
  protein: 0,
}

export const ALL_NUTRITION_KNOWN: NutritionKnown = {
  calories: true,
  weightOz: true,
  weightGrams: true,
  fat: true,
  sodium: true,
  potassium: true,
  carbs: true,
  fiber: true,
  sugar: true,
  protein: true,
}

export const NO_NUTRITION_KNOWN: NutritionKnown = {
  calories: false,
  weightOz: false,
  weightGrams: false,
  fat: false,
  sodium: false,
  potassium: false,
  carbs: false,
  fiber: false,
  sugar: false,
  protein: false,
}

export interface NutritionSummary {
  nutrition: Nutrition
  known: NutritionKnown
}

export function formatKnownNutritionValue(
  value: string,
  known: boolean,
) {
  return known ? value : `${value} known`
}

const value = (input: number | null | undefined) =>
  typeof input === 'number' && Number.isFinite(input) ? input : 0

const isKnown = (input: number | null | undefined) =>
  typeof input === 'number' && Number.isFinite(input)

export function nutritionSummaryForFood(
  food: Food,
  quantity = 1,
): NutritionSummary {
  const safeQuantity =
    Number.isFinite(quantity) && quantity > 0 ? quantity : 0
  return {
    nutrition: {
      calories: value(food.calories) * safeQuantity,
      weightOz: value(food.servingOz) * safeQuantity,
      weightGrams: value(food.servingGrams) * safeQuantity,
      fat: value(food.fat) * safeQuantity,
      sodium: value(food.sodium) * safeQuantity,
      potassium: value(food.potassium) * safeQuantity,
      carbs: value(food.carbs) * safeQuantity,
      fiber: value(food.fiber) * safeQuantity,
      sugar: value(food.sugar) * safeQuantity,
      protein: value(food.protein) * safeQuantity,
    },
    known: {
      calories: isKnown(food.calories),
      weightOz: isKnown(food.servingOz),
      weightGrams: isKnown(food.servingGrams),
      fat: isKnown(food.fat),
      sodium: isKnown(food.sodium),
      potassium: isKnown(food.potassium),
      carbs: isKnown(food.carbs),
      fiber: isKnown(food.fiber),
      sugar: isKnown(food.sugar),
      protein: isKnown(food.protein),
    },
  }
}

export function nutritionForFood(food: Food, quantity = 1): Nutrition {
  return nutritionSummaryForFood(food, quantity).nutrition
}

export function addNutrition(...values: Nutrition[]): Nutrition {
  return values.reduce(
    (total, current) => ({
      calories: total.calories + current.calories,
      weightOz: total.weightOz + current.weightOz,
      weightGrams: total.weightGrams + current.weightGrams,
      fat: total.fat + current.fat,
      sodium: total.sodium + current.sodium,
      potassium: total.potassium + current.potassium,
      carbs: total.carbs + current.carbs,
      fiber: total.fiber + current.fiber,
      sugar: total.sugar + current.sugar,
      protein: total.protein + current.protein,
    }),
    { ...EMPTY_NUTRITION },
  )
}

export function addNutritionSummaries(
  ...values: NutritionSummary[]
): NutritionSummary {
  return {
    nutrition: addNutrition(...values.map(({ nutrition }) => nutrition)),
    known: values.reduce<NutritionKnown>(
      (known, current) =>
        Object.fromEntries(
          Object.keys(known).map((key) => [
            key,
            known[key as keyof Nutrition] &&
              current.known[key as keyof Nutrition],
          ]),
        ) as NutritionKnown,
      { ...ALL_NUTRITION_KNOWN },
    ),
  }
}

export function nutritionForItems(
  items: readonly PlanItemInterpretation[],
): Nutrition {
  return nutritionSummaryForItems(items).nutrition
}

export function nutritionSummaryForItems(
  items: readonly PlanItemInterpretation[],
): NutritionSummary {
  return addNutritionSummaries(
    ...items.map(({ nutrition, known }) => ({ nutrition, known })),
  )
}

export function getMetrics(nutrition: Nutrition) {
  const macroCalories =
    nutrition.fat * 9 + nutrition.carbs * 4 + nutrition.protein * 4

  return {
    caloriesPerOz:
      nutrition.weightOz > 0 ? nutrition.calories / nutrition.weightOz : 0,
    caloriesPerGram:
      nutrition.weightGrams > 0
        ? nutrition.calories / nutrition.weightGrams
        : 0,
    carbProteinRatio:
      nutrition.protein > 0 ? nutrition.carbs / nutrition.protein : 0,
    fatFraction: macroCalories > 0 ? (nutrition.fat * 9) / macroCalories : 0,
    sugarFraction:
      macroCalories > 0 ? (nutrition.sugar * 4) / macroCalories : 0,
    sodiumPerCalorie:
      nutrition.calories > 0 ? nutrition.sodium / nutrition.calories : 0,
  }
}

export function densityLabel(caloriesPerOz: number) {
  if (caloriesPerOz < 110) return { label: 'Heavy', tone: 'slate' }
  if (caloriesPerOz < 125) return { label: 'Moderate', tone: 'amber' }
  if (caloriesPerOz < 140) return { label: 'Lightweight', tone: 'lime' }
  if (caloriesPerOz < 155) return { label: 'Very light', tone: 'green' }
  if (caloriesPerOz < 170) return { label: 'Ultralight', tone: 'teal' }
  return { label: 'Hyperlight', tone: 'blue' }
}

export function ratioLabel(ratio: number) {
  if (ratio < 2.5 || ratio > 4.5) return { label: 'Imbalanced', tone: 'rose' }
  if (ratio >= 3 && ratio <= 4) return { label: 'Optimum', tone: 'green' }
  return { label: 'Good', tone: 'lime' }
}

export function fatLabel(fraction: number) {
  if (fraction < 0.4) return { label: 'Low', tone: 'slate' }
  if (fraction < 0.5) return { label: 'Moderate', tone: 'amber' }
  if (fraction < 0.6) return { label: 'Good', tone: 'lime' }
  if (fraction < 0.7) return { label: 'Very good', tone: 'green' }
  return { label: 'High', tone: 'teal' }
}

export function sodiumLabel(valuePerCalorie: number) {
  if (valuePerCalorie < 0.64)
    return { label: 'Below allowance', tone: 'slate' }
  if (valuePerCalorie < 1) return { label: 'Light', tone: 'lime' }
  if (valuePerCalorie < 1.25) return { label: 'Medium', tone: 'amber' }
  return { label: 'Heavy', tone: 'rose' }
}

export function round(value: number, digits = 0) {
  if (!Number.isFinite(value)) return 0
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function formatWeight(ounces: number) {
  if (ounces >= 16) {
    const pounds = Math.floor(ounces / 16)
    const remainder = round(ounces % 16, 1)
    return `${pounds} lb ${remainder} oz`
  }
  return `${round(ounces, 1)} oz`
}

export function calculateFoodMetrics(food: Partial<Food>) {
  const calories = value(food.calories)
  const grams = value(food.servingGrams)
  const ounces = grams > 0 ? grams / 28.3495 : value(food.servingOz)
  const fat = value(food.fat)
  const carbs = value(food.carbs)
  const sugar = value(food.sugar)
  const protein = value(food.protein)
  const macroCalories = fat * 9 + carbs * 4 + protein * 4

  const safeRatio = (numerator: number, denominator: number) => {
    if (denominator <= 0) return null
    const result = numerator / denominator
    return Number.isFinite(result) ? result : null
  }

  return {
    servingOz: ounces,
    caloriesPerOz: safeRatio(calories, ounces),
    caloriesPerGram: safeRatio(calories, grams),
    carbProteinRatio: safeRatio(carbs, protein),
    fatCalorieFraction: safeRatio(fat * 9, macroCalories),
    sugarCalorieFraction: safeRatio(sugar * 4, macroCalories),
    sodiumPerCalorie: safeRatio(value(food.sodium), calories),
  }
}

export function interpolateSodiumNeed(temperature: number) {
  const points = [
    [15, 3300],
    [20, 4100],
    [25, 5000],
    [30, 6100],
    [35, 7500],
    [40, 9500],
  ]
  if (!Number.isFinite(temperature)) return points[0][1]
  if (temperature <= points[0][0]) return points[0][1]
  if (temperature >= points.at(-1)![0]) return points.at(-1)![1]

  for (let index = 1; index < points.length; index += 1) {
    const [highTemp, highValue] = points[index]
    const [lowTemp, lowValue] = points[index - 1]
    if (temperature <= highTemp) {
      const progress = (temperature - lowTemp) / (highTemp - lowTemp)
      return lowValue + (highValue - lowValue) * progress
    }
  }
  return points.at(-1)![1]
}
