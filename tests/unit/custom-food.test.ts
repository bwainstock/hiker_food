import { describe, expect, it } from 'vitest'
import {
  createCustomFood,
  customFoodInputSchema,
} from '../../src/lib/customFood'

const validInput = {
  brand: 'Trail Kitchen',
  flavor: 'Peanut Noodles',
  category: 'Entrée',
  prep: 'hot',
  servingGrams: 100,
  calories: 500,
  fat: 20,
  sodium: 700,
  potassium: 300,
  carbs: 60,
  fiber: 8,
  sugar: 5,
  protein: 20,
}

describe('custom Food validation', () => {
  it.each([
    [{ ...validInput, brand: '   ' }, 'brand'],
    [{ ...validInput, brand: null }, 'brand'],
    [{ ...validInput, flavor: '' }, 'flavor'],
    [{ ...validInput, flavor: null }, 'flavor'],
    [{ ...validInput, servingGrams: 0 }, 'servingGrams'],
    [{ ...validInput, calories: -1 }, 'calories'],
    [{ ...validInput, sodium: Number.NaN }, 'sodium'],
  ])('rejects invalid input for %s', (input, field) => {
    const result = customFoodInputSchema.safeParse(input)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === field)).toBe(
        true,
      )
    }
  })

  it('trims identity fields and creates safe derived metrics', () => {
    const result = customFoodInputSchema.parse({
      ...validInput,
      brand: '  Trail Kitchen ',
      flavor: ' Peanut Noodles  ',
    })
    const food = createCustomFood(result, 'custom-fixed')
    expect(food).toMatchObject({
      id: 'custom-fixed',
      brand: 'Trail Kitchen',
      flavor: 'Peanut Noodles',
      name: 'Trail Kitchen Peanut Noodles',
      servingGrams: 100,
      servingOz: 100 / 28.3495,
      caloriesPerGram: 5,
      custom: true,
    })
    expect(food.caloriesPerOz).toBeTypeOf('number')
    expect(Number.isFinite(food.caloriesPerOz)).toBe(true)
  })
})
