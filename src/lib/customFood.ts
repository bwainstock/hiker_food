import { z } from 'zod'
import type { Food } from '../types'
import { calculateFoodMetrics } from './nutrition'

export const customFoodInputSchema = z.object({
  brand: z.string().trim().min(1, 'Enter a brand.'),
  flavor: z.string().trim().min(1, 'Enter a food or flavor.'),
  category: z.string(),
  prep: z.string(),
  servingGrams: z.number().finite().positive('Enter a value greater than 0.'),
  calories: z.number().finite().nonnegative('Enter 0 or more.'),
  fat: z.number().finite().nonnegative('Enter 0 or more.'),
  sodium: z.number().finite().nonnegative('Enter 0 or more.'),
  potassium: z.number().finite().nonnegative('Enter 0 or more.'),
  carbs: z.number().finite().nonnegative('Enter 0 or more.'),
  fiber: z.number().finite().nonnegative('Enter 0 or more.'),
  sugar: z.number().finite().nonnegative('Enter 0 or more.'),
  protein: z.number().finite().nonnegative('Enter 0 or more.'),
})

export type CustomFoodInput = z.infer<typeof customFoodInputSchema>

export function createCustomFood(
  input: CustomFoodInput,
  id = `custom-${crypto.randomUUID()}`,
): Food {
  const valid = customFoodInputSchema.parse(input)
  const metrics = calculateFoodMetrics(valid)
  return {
    id,
    name: `${valid.brand} ${valid.flavor}`,
    brand: valid.brand,
    flavor: valid.flavor,
    category: valid.category || null,
    prep: valid.prep || null,
    servings: 1,
    servingOz: metrics.servingOz,
    servingGrams: valid.servingGrams,
    calories: valid.calories,
    fat: valid.fat,
    sodium: valid.sodium,
    potassium: valid.potassium,
    carbs: valid.carbs,
    fiber: valid.fiber,
    sugar: valid.sugar,
    otherCarbs: Math.max(0, valid.carbs - valid.fiber - valid.sugar),
    protein: valid.protein,
    caloriesPerOz: metrics.caloriesPerOz,
    caloriesPerGram: metrics.caloriesPerGram,
    carbProteinRatio: metrics.carbProteinRatio,
    fatCalorieFraction: metrics.fatCalorieFraction,
    sugarCalorieFraction: metrics.sugarCalorieFraction,
    sodiumPerCalorie: metrics.sodiumPerCalorie,
    caloriesPerContainer: valid.calories,
    custom: true,
  }
}
