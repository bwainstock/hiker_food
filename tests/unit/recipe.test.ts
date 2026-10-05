import { describe, expect, it } from 'vitest'
import {
  addFoodIngredient,
  createRecipeDraft,
  resolveFoodRecipe,
  saveRecipeDraft,
  updateFoodIngredientQuantity,
  validateRecipeDraft,
} from '../../src/lib/recipe'
import type { Recipe } from '../../src/types'
import { makeFood, makeState } from './fixtures'

describe('Food-based Recipe resolution', () => {
  it('calculates a Recipe summary from current Food data', () => {
    const recipe: Recipe = {
      id: 'recipe-1',
      name: 'Trail mix',
      category: null,
      instructions: null,
      ingredients: [
        { kind: 'food', foodId: 'food-1', quantity: 1.5 },
        { kind: 'food', foodId: 'food-2', quantity: 2 },
      ],
    }
    const foodsById = new Map([
      ['food-1', makeFood()],
      [
        'food-2',
        makeFood({
          id: 'food-2',
          servingOz: 2,
          servingGrams: 50,
          calories: 200,
          fat: 8,
          carbs: 30,
          protein: 6,
          fiber: 4,
          sugar: 5,
          sodium: 300,
          potassium: 150,
        }),
      ],
    ])

    expect(resolveFoodRecipe(recipe, foodsById)).toMatchObject({
      ingredientCount: 2,
      complete: true,
      nutrition: {
        weightOz: 5.5,
        weightGrams: 142.52425,
        calories: 550,
        fat: 23.5,
        carbs: 75,
        protein: 18,
        fiber: 11,
        sugar: 14.5,
        sodium: 900,
        potassium: 450,
      },
    })

    foodsById.set('food-1', makeFood({ calories: 120 }))
    expect(resolveFoodRecipe(recipe, foodsById).nutrition.calories).toBe(580)
  })

  it('merges repeated Food selections into one ingredient', () => {
    const first = addFoodIngredient(createRecipeDraft(), 'food-1')
    const second = addFoodIngredient(first, 'food-1')

    expect(second.ingredients).toEqual([
      { kind: 'food', foodId: 'food-1', quantity: 2 },
    ])
  })

  it('requires a name, an ingredient, and positive 0.1-serving quantities', () => {
    expect(validateRecipeDraft(createRecipeDraft()).success).toBe(false)

    const draft = {
      ...createRecipeDraft(),
      name: 'Dinner',
      ingredients: [
        { kind: 'food' as const, foodId: 'food-1', quantity: 1.25 },
      ],
    }
    expect(validateRecipeDraft(draft).success).toBe(false)
    expect(
      validateRecipeDraft({
        ...draft,
        ingredients: [{ ...draft.ingredients[0], quantity: 0 }],
      }).success,
    ).toBe(false)
    expect(
      validateRecipeDraft({
        ...draft,
        ingredients: [{ ...draft.ingredients[0], quantity: 0.1 }],
      }).success,
    ).toBe(true)
  })

  it('keeps edits in a draft until Save and uses stable IDs for identity', () => {
    const savedRecipe: Recipe = {
      id: 'recipe-1',
      name: 'Dinner',
      category: null,
      instructions: null,
      ingredients: [
        { kind: 'food', foodId: 'food-1', quantity: 1 },
      ],
    }
    const state = { ...makeState(), recipes: [savedRecipe] }
    const draft = updateFoodIngredientQuantity(
      createRecipeDraft(savedRecipe),
      'food-1',
      2,
    )

    expect(state.recipes[0].ingredients[0]).toMatchObject({ quantity: 1 })

    const edited = saveRecipeDraft(state, draft, () => 'unused')
    expect(edited.recipes[0]).toMatchObject({
      id: 'recipe-1',
      name: 'Dinner',
      ingredients: [{ foodId: 'food-1', quantity: 2 }],
    })

    const duplicateName = saveRecipeDraft(
      edited,
      {
        ...createRecipeDraft(),
        name: 'Dinner',
        ingredients: [
          { kind: 'food', foodId: 'food-1', quantity: 0.5 },
        ],
      },
      () => 'recipe-2',
    )
    expect(duplicateName.recipes.map(({ id, name }) => ({ id, name }))).toEqual([
      { id: 'recipe-1', name: 'Dinner' },
      { id: 'recipe-2', name: 'Dinner' },
    ])
  })
})
