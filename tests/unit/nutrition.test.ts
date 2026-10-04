import { describe, expect, it } from 'vitest'
import {
  addNutrition,
  calculateFoodMetrics,
  densityLabel,
  fatLabel,
  nutritionForFood,
  nutritionForItems,
  ratioLabel,
  sodiumLabel,
} from '../../src/lib/nutrition'
import {
  calculateElectrolyteTargets,
  calculateSupplementScenario,
} from '../../src/lib/supplements'
import { makeElectrolyte, makeFood, makeNutrition } from './fixtures'

describe('nutrition calculations', () => {
  it('scales Food nutrition by a serving multiplier', () => {
    expect(nutritionForFood(makeFood(), 2.5)).toMatchObject({
      calories: 250,
      weightOz: 2.5,
      fat: 12.5,
      sodium: 500,
      potassium: 250,
      carbs: 25,
      protein: 10,
    })
  })

  it('treats null nutrition values as unavailable zeroes during totals', () => {
    const food = makeFood({
      calories: null,
      servingOz: null,
      sodium: null,
      potassium: null,
    })
    expect(nutritionForFood(food, 3)).toMatchObject({
      calories: 0,
      weightOz: 0,
      sodium: 0,
      potassium: 0,
      carbs: 30,
    })
  })

  it('aggregates available items and ignores missing Food references', () => {
    const foods = new Map([['known', makeFood({ id: 'known' })]])
    const total = nutritionForItems(
      [
        { id: 'item-1', foodId: 'known', quantity: 2 },
        { id: 'item-2', foodId: 'missing', quantity: 9 },
      ],
      foods,
    )
    expect(total.calories).toBe(200)
    expect(addNutrition(total, total).calories).toBe(400)
  })

  it('keeps derived metrics finite for unsafe partial input', () => {
    const metrics = calculateFoodMetrics({
      calories: Number.POSITIVE_INFINITY,
      servingGrams: Number.NaN,
      servingOz: Number.NEGATIVE_INFINITY,
      fat: Number.NaN,
      carbs: Number.POSITIVE_INFINITY,
      protein: 0,
      sugar: Number.NaN,
      sodium: Number.POSITIVE_INFINITY,
    })
    expect(metrics).toEqual({
      servingOz: 0,
      caloriesPerOz: null,
      caloriesPerGram: null,
      carbProteinRatio: null,
      fatCalorieFraction: null,
      sugarCalorieFraction: null,
      sodiumPerCalorie: null,
    })
  })
})

describe('rating threshold boundaries', () => {
  it.each([
    [109.99, 'Heavy'],
    [110, 'Moderate'],
    [125, 'Lightweight'],
    [140, 'Very light'],
    [155, 'Ultralight'],
    [170, 'Hyperlight'],
  ])('classifies density %s as %s', (value, label) => {
    expect(densityLabel(value).label).toBe(label)
  })

  it.each([
    [2.49, 'Imbalanced'],
    [2.5, 'Good'],
    [3, 'Optimum'],
    [4, 'Optimum'],
    [4.5, 'Good'],
    [4.51, 'Imbalanced'],
  ])('classifies carb/protein %s as %s', (value, label) => {
    expect(ratioLabel(value).label).toBe(label)
  })

  it.each([
    [0.3999, 'Low'],
    [0.4, 'Moderate'],
    [0.5, 'Good'],
    [0.6, 'Very good'],
    [0.7, 'High'],
  ])('classifies fat fraction %s as %s', (value, label) => {
    expect(fatLabel(value).label).toBe(label)
  })

  it.each([
    [0.6399, 'Below allowance'],
    [0.64, 'Light'],
    [1, 'Medium'],
    [1.25, 'Heavy'],
  ])('classifies sodium density %s as %s', (value, label) => {
    expect(sodiumLabel(value).label).toBe(label)
  })
})

describe('sodium and potassium scenarios', () => {
  it('interpolates sodium and derived potassium targets and clamps bounds', () => {
    expect(calculateElectrolyteTargets(0)).toEqual({
      sodiumTarget: 3300,
      sweatSodium: 1800,
      sweatPotassium: 400,
      potassiumTarget: 3800,
    })
    expect(calculateElectrolyteTargets(17.5).sodiumTarget).toBe(3700)
    expect(calculateElectrolyteTargets(50).sodiumTarget).toBe(9500)
    expect(calculateElectrolyteTargets(50).potassiumTarget).toBeCloseTo(
      5177.777777,
    )
  })

  it('calculates a known supplement scenario', () => {
    const result = calculateSupplementScenario(
      25,
      makeNutrition({ sodium: 1000, potassium: 2000 }),
      makeElectrolyte({ sodium: 500, potassium: 125 }),
    )
    expect(result.sodiumTarget).toBe(5000)
    expect(result.servings).toBe(8)
    expect(result.servedPotassium).toBe(1000)
    expect(result.potassiumRemaining).toBeCloseTo(1177.777777)
  })
})
