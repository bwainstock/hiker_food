import { describe, expect, it } from 'vitest'
import { interpretPlanDays } from '../../src/lib/planner'
import { MEALS } from '../../src/types'
import { makeDay, makeFood, makeRecipe } from './fixtures'

describe('Trail-day Plan-item interpretation', () => {
  it('preserves Trail-day, meal-period, and Plan-item ordering in grouped results', () => {
    const food = makeFood()
    const recipe = makeRecipe()
    const firstDay = makeDay('day-1', 'Day 1')
    firstDay.meals.Breakfast = [
      {
        id: 'food-placement',
        target: { kind: 'food', id: food.id },
        quantity: 1,
      },
      {
        id: 'missing-placement',
        target: { kind: 'food', id: 'missing-food' },
        quantity: 2,
      },
    ]
    const secondDay = makeDay('day-2', 'Day 2')
    secondDay.meals.Dinner = [{
      id: 'recipe-placement',
      target: { kind: 'recipe', id: recipe.id },
      quantity: 2,
    }]

    const grouped = interpretPlanDays(
      [firstDay, secondDay],
      [food],
      [recipe],
    )

    expect([...grouped.keys()]).toEqual(['day-1', 'day-2'])
    expect(grouped.get('day-1')?.Breakfast).toMatchObject([
      {
        planItemId: 'food-placement',
        label: food.name,
        nutrition: { calories: 100 },
      },
      {
        planItemId: 'missing-placement',
        available: false,
        target: { kind: 'food', id: 'missing-food' },
      },
    ])
    expect(grouped.get('day-2')?.Dinner).toMatchObject([
      {
        planItemId: 'recipe-placement',
        label: recipe.name,
        nutrition: { calories: 340, sodium: 700 },
      },
    ])
    expect(
      MEALS.filter((meal) => meal !== 'Dinner').every(
        (meal) => grouped.get('day-2')?.[meal].length === 0,
      ),
    ).toBe(true)
  })
})
