import { describe, expect, it } from 'vitest'
import {
  analyzeCustomFoodDeletion,
  analyzeRecipeDeletion,
  deleteCustomFood,
  deleteRecipe,
} from '../../src/lib/deletion'
import { makeFood, makeRecipe, makeState } from './fixtures'

describe('Recipe deletion', () => {
  it('reports no impact and removes an unused Recipe', () => {
    const recipe = makeRecipe()
    const state = { ...makeState(), recipes: [recipe] }

    expect(analyzeRecipeDeletion(state, recipe.id)).toEqual({
      planItemCount: 0,
    })
    expect(deleteRecipe(state, recipe.id)).toEqual({
      ...state,
      recipes: [],
    })
  })

  it('counts every placement and removes the Recipe and placements atomically', () => {
    const recipe = makeRecipe()
    const state = { ...makeState(), recipes: [recipe] }
    state.days[0].meals.Breakfast.push(
      {
        id: 'recipe-breakfast',
        target: { kind: 'recipe', id: recipe.id },
        quantity: 1,
      },
      {
        id: 'other-food',
        target: { kind: 'food', id: 'food-2' },
        quantity: 1,
      },
    )
    state.days[0].meals.Dinner.push({
      id: 'recipe-dinner',
      target: { kind: 'recipe', id: recipe.id },
      quantity: 2,
    })

    expect(analyzeRecipeDeletion(state, recipe.id)).toEqual({
      planItemCount: 2,
    })
    expect(deleteRecipe(state, recipe.id)).toMatchObject({
      recipes: [],
      days: [
        {
          meals: {
            Breakfast: [
              {
                id: 'other-food',
                target: { kind: 'food', id: 'food-2' },
              },
            ],
            Dinner: [],
          },
        },
      ],
    })
    expect(state.recipes).toEqual([recipe])
    expect(state.days[0].meals.Breakfast).toHaveLength(2)
  })
})

describe('custom Food deletion', () => {
  it('reports direct Plan-item and Recipe Food-ingredient references separately', () => {
    const customFood = makeFood({
      id: 'custom-food-1',
      custom: true,
    })
    const state = {
      ...makeState(),
      customFoods: [customFood],
      recipes: [
        makeRecipe({
          id: 'recipe-1',
          ingredients: [
            { kind: 'food', foodId: customFood.id, quantity: 1 },
          ],
        }),
        makeRecipe({
          id: 'recipe-2',
          ingredients: [
            { kind: 'food', foodId: customFood.id, quantity: 2 },
          ],
        }),
      ],
    }
    state.days[0].meals.Lunch.push(
      {
        id: 'direct-1',
        target: { kind: 'food', id: customFood.id },
        quantity: 1,
      },
      {
        id: 'unaffected',
        target: { kind: 'food', id: 'food-2' },
        quantity: 1,
      },
    )

    expect(analyzeCustomFoodDeletion(state, customFood.id)).toEqual({
      planItemCount: 1,
      recipeIngredientCount: 2,
    })
  })

  it('removes the custom Food and direct placements while preserving Recipe Food IDs', () => {
    const customFood = makeFood({
      id: 'custom-food-1',
      custom: true,
    })
    const recipe = makeRecipe({
      ingredients: [
        { kind: 'food', foodId: customFood.id, quantity: 1.5 },
      ],
    })
    const state = {
      ...makeState(),
      customFoods: [customFood],
      recipes: [recipe],
    }
    state.days[0].meals['Afternoon snacks'].push({
      id: 'direct',
      target: { kind: 'food', id: customFood.id },
      quantity: 1,
    })

    const next = deleteCustomFood(state, customFood.id)

    expect(next.customFoods).toEqual([])
    expect(next.days[0].meals['Afternoon snacks']).toEqual([])
    expect(next.recipes[0].ingredients).toEqual([
      { kind: 'food', foodId: customFood.id, quantity: 1.5 },
    ])
    expect(state.customFoods).toEqual([customFood])
    expect(state.days[0].meals['Afternoon snacks']).toHaveLength(1)
  })
})
