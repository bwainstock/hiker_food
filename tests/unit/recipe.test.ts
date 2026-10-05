import { describe, expect, it } from 'vitest'
import {
  addFoodIngredient,
  addRecipeOnlyIngredient,
  createRecipeDraft,
  filterRecipes,
  formatRecipeCalories,
  getRecipePlacementEligibility,
  removeFoodIngredient,
  removeRecipeOnlyIngredient,
  replaceFoodIngredient,
  resolveRecipe,
  resolveRecipeDraft,
  saveRecipeDraft,
  updateRecipeOnlyIngredient,
  updateFoodIngredientQuantity,
  validateRecipeDraft,
} from '../../src/lib/recipe'
import { recipeIngredientSchema } from '../../src/lib/schemas'
import type { Recipe, RecipeOnlyIngredient } from '../../src/types'
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
        {
          kind: 'recipe-only',
          id: 'ingredient-1',
          name: 'Cocoa',
          weightGrams: 10,
          calories: 41.4,
          fat: 1,
          carbs: 5,
          protein: 2,
          fiber: 3,
          sugar: 1,
          sodium: 4,
          potassium: 75,
        },
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

    expect(resolveRecipe(recipe, foodsById)).toMatchObject({
      ingredientCount: 3,
      complete: true,
      nutrition: {
        weightOz: 5.852739907229404,
        weightGrams: 152.52425,
        calories: 591.4,
        fat: 24.5,
        carbs: 80,
        protein: 20,
        fiber: 14,
        sugar: 15.5,
        sodium: 904,
        potassium: 525,
      },
    })

    foodsById.set('food-1', makeFood({ calories: 120 }))
    expect(resolveRecipe(recipe, foodsById).nutrition.calories).toBe(621.4)
  })

  it('returns known totals and unavailable-reference details for an incomplete Recipe', () => {
    const recipe: Recipe = {
      id: 'recipe-incomplete',
      name: 'Partial bowl',
      category: 'Dinner',
      instructions: null,
      ingredients: [
        { kind: 'food', foodId: 'food-1', quantity: 1.5 },
        { kind: 'food', foodId: 'retired-food', quantity: 2.5 },
      ],
    }

    expect(
      resolveRecipe(recipe, new Map([['food-1', makeFood()]])),
    ).toMatchObject({
      complete: false,
      nutrition: { calories: 150, sodium: 300 },
      unavailableFoodReferences: [
        { foodId: 'retired-food', quantity: 2.5 },
      ],
    })
    expect(
      getRecipePlacementEligibility(
        recipe,
        new Map([['food-1', makeFood()]]),
      ),
    ).toEqual({
      eligible: false,
      reason: 'Repair 1 unavailable Food ingredient in Recipes before adding.',
    })
  })

  it('marks only nutrients with missing source data as unknown', () => {
    const recipe: Recipe = {
      id: 'recipe-partial-nutrition',
      name: 'Partially labeled snack',
      category: null,
      instructions: null,
      ingredients: [
        { kind: 'food', foodId: 'food-1', quantity: 2 },
      ],
    }

    expect(
      resolveRecipe(
        recipe,
        new Map([
          [
            'food-1',
            makeFood({
              calories: null,
              fiber: null,
              protein: 4,
            }),
          ],
        ]),
      ),
    ).toMatchObject({
      complete: false,
      nutrition: {
        calories: 0,
        fiber: 0,
        protein: 8,
      },
      known: {
        calories: false,
        fiber: false,
        protein: true,
      },
    })
  })

  it('replaces an unavailable Food while retaining quantity and restores completeness', () => {
    const recipe: Recipe = {
      id: 'recipe-incomplete',
      name: 'Partial bowl',
      category: null,
      instructions: null,
      ingredients: [
        { kind: 'food', foodId: 'retired-food', quantity: 2.5 },
      ],
    }
    const draft = replaceFoodIngredient(
      createRecipeDraft(recipe),
      'retired-food',
      'food-1',
    )

    expect(draft.ingredients).toEqual([
      { kind: 'food', foodId: 'food-1', quantity: 2.5 },
    ])
    expect(
      resolveRecipe(
        { ...recipe, ingredients: draft.ingredients },
        new Map([['food-1', makeFood()]]),
      ).complete,
    ).toBe(true)
  })

  it('removes an unavailable Food only into a nonempty valid repair', () => {
    const recipe: Recipe = {
      id: 'recipe-incomplete',
      name: 'Partial bowl',
      category: null,
      instructions: null,
      ingredients: [
        { kind: 'food', foodId: 'food-1', quantity: 1 },
        { kind: 'food', foodId: 'retired-food', quantity: 2.5 },
      ],
    }

    const repaired = removeFoodIngredient(
      createRecipeDraft(recipe),
      'retired-food',
    )
    expect(repaired.ingredients).toEqual([
      { kind: 'food', foodId: 'food-1', quantity: 1 },
    ])
    expect(validateRecipeDraft(repaired).success).toBe(true)
    expect(
      validateRecipeDraft(removeFoodIngredient(repaired, 'food-1')).success,
    ).toBe(false)
  })

  it('merges repeated Food selections into one ingredient', () => {
    const first = addFoodIngredient(createRecipeDraft(), 'food-1')
    const second = addFoodIngredient(first, 'food-1')

    expect(second.ingredients).toEqual([
      { kind: 'food', foodId: 'food-1', quantity: 2 },
    ])
  })

  it('accepts Recipe Food quantities to three decimal places', () => {
    expect(validateRecipeDraft(createRecipeDraft()).success).toBe(false)

    const draft = {
      ...createRecipeDraft(),
      name: 'Dinner',
      ingredients: [
        { kind: 'food' as const, foodId: 'food-1', quantity: 1.25 },
      ],
    }
    expect(validateRecipeDraft(draft).success).toBe(true)
    expect(
      validateRecipeDraft({
        ...draft,
        ingredients: [{ ...draft.ingredients[0], quantity: 0.125 }],
      }).success,
    ).toBe(true)
    expect(
      validateRecipeDraft({
        ...draft,
        ingredients: [{ ...draft.ingredients[0], quantity: 0.1255 }],
      }).success,
    ).toBe(false)
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

  it('preserves unknown Recipe-only nutrition separately from known zero', () => {
    expect(
      recipeIngredientSchema.parse({
        kind: 'recipe-only',
        id: 'defaults',
        name: 'Olive oil',
        weightGrams: 10,
        calories: 90,
        fat: 10,
        carbs: 0,
        protein: 0,
      }),
    ).toMatchObject({
      fiber: null,
      sugar: null,
      sodium: null,
      potassium: null,
    })

    const draft = addRecipeOnlyIngredient(
      {
        ...createRecipeDraft(),
        name: 'Cocoa oats',
      },
      () => 'ingredient-1',
    )
    const edited = updateRecipeOnlyIngredient(draft, 'ingredient-1', {
      name: 'Cocoa',
      weightGrams: 12,
      calories: 47,
      fat: 1,
      carbs: 7,
      protein: 2,
      fiber: 0,
    })

    const result = validateRecipeDraft(edited)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.ingredients[0]).toEqual({
      kind: 'recipe-only',
      id: 'ingredient-1',
      name: 'Cocoa',
      weightGrams: 12,
      calories: 47,
      fat: 1,
      carbs: 7,
      protein: 2,
      fiber: 0,
      sugar: null,
      sodium: null,
      potassium: null,
    })
    expect(
      resolveRecipe(
        {
          id: 'recipe-unknown-details',
          name: 'Cocoa oats',
          category: null,
          instructions: null,
          ingredients: result.data.ingredients,
        },
        new Map(),
      ),
    ).toMatchObject({
      complete: false,
      known: {
        fiber: true,
        sugar: false,
        sodium: false,
        potassium: false,
      },
    })
    expect(formatRecipeCalories(47.5)).toBe('48 kcal')
  })

  it('keeps same-named Recipe-only ingredients distinct by stable identity', () => {
    const first = addRecipeOnlyIngredient(createRecipeDraft(), () => 'first')
    const second = addRecipeOnlyIngredient(first, () => 'second')
    const named = updateRecipeOnlyIngredient(
      updateRecipeOnlyIngredient(second, 'first', { name: 'Salt' }),
      'second',
      { name: 'Salt' },
    )

    expect(
      named.ingredients.flatMap((ingredient) =>
        ingredient.kind === 'recipe-only' ? [ingredient.id] : [],
      ),
    ).toEqual(['first', 'second'])
    expect(removeRecipeOnlyIngredient(named, 'first').ingredients).toHaveLength(1)
  })

  it('scales Recipe-only nutrition from the latest valid weight baseline', () => {
    const draft = {
      ...createRecipeDraft(),
      name: 'Cocoa',
      ingredients: [
        {
          kind: 'recipe-only' as const,
          id: 'cocoa',
          name: 'Cocoa',
          weightGrams: 100,
          calories: 500,
          fat: 20,
          carbs: 50,
          protein: 10,
          fiber: null,
          sugar: 5,
          sodium: 0,
          potassium: null,
        },
      ],
    }

    const halved = updateRecipeOnlyIngredient(draft, 'cocoa', {
      weightGrams: 50,
    })
    expect(halved.ingredients[0]).toMatchObject({
      weightGrams: 50,
      calories: 250,
      fat: 10,
      carbs: 25,
      protein: 5,
      fiber: null,
      sugar: 2.5,
      sodium: 0,
      potassium: null,
    })

    const rebased = updateRecipeOnlyIngredient(halved, 'cocoa', {
      calories: 300,
    })
    const quartered = updateRecipeOnlyIngredient(rebased, 'cocoa', {
      weightGrams: 25,
    })
    expect(quartered.ingredients[0]).toMatchObject({
      weightGrams: 25,
      calories: 150,
      fat: 5,
      carbs: 12.5,
      protein: 2.5,
    })

    const invalid = updateRecipeOnlyIngredient(rebased, 'cocoa', {
      weightGrams: 0,
    })
    const restoredFromLatestValid = updateRecipeOnlyIngredient(
      invalid,
      'cocoa',
      { weightGrams: 25 },
      rebased.ingredients[0] as RecipeOnlyIngredient,
    )
    expect(restoredFromLatestValid.ingredients[0]).toMatchObject({
      weightGrams: 25,
      calories: 150,
      fat: 5,
      carbs: 12.5,
      protein: 2.5,
    })
  })

  it('keeps live draft totals useful while one ingredient row is invalid', () => {
    const draft = {
      ...createRecipeDraft(),
      name: 'Mixed snack',
      ingredients: [
        { kind: 'food' as const, foodId: 'food-1', quantity: 1.25 },
        {
          kind: 'recipe-only' as const,
          id: 'unfinished',
          name: '',
          weightGrams: 0,
          calories: null,
          fat: null,
          carbs: null,
          protein: null,
          fiber: null,
          sugar: null,
          sodium: null,
          potassium: null,
        },
      ],
    }

    expect(
      resolveRecipeDraft(draft, new Map([['food-1', makeFood()]])),
    ).toMatchObject({
      complete: false,
      nutrition: {
        calories: 125,
        protein: 5,
      },
      contributions: [
        {
          key: 'food-1',
          valid: true,
          nutrition: { calories: 125 },
        },
        {
          key: 'unfinished',
          valid: false,
          nutrition: { calories: 0 },
        },
      ],
    })
  })

  it('rejects nested Recipes at the ingredient schema boundary', () => {
    expect(
      recipeIngredientSchema.safeParse({
        kind: 'recipe',
        recipeId: 'recipe-2',
        quantity: 1,
      }).success,
    ).toBe(false)
  })

  it('searches remembered Recipe details and combines category filtering', () => {
    const recipes: Recipe[] = [
      {
        id: 'recipe-1',
        name: 'Morning oats',
        category: 'Breakfast',
        instructions: 'Add cold water',
        ingredients: [
          { kind: 'food', foodId: 'food-1', quantity: 1 },
          {
            kind: 'recipe-only',
            id: 'ingredient-1',
            name: 'Cocoa powder',
            weightGrams: 10,
            calories: 40,
            fat: 1,
            carbs: 5,
            protein: 2,
            fiber: 0,
            sugar: 0,
            sodium: 0,
            potassium: 0,
          },
        ],
      },
      {
        id: 'recipe-2',
        name: 'Missing meal',
        category: 'Dinner',
        instructions: null,
        ingredients: [
          { kind: 'food', foodId: 'unavailable-food-42', quantity: 1 },
        ],
      },
    ]
    const foodsById = new Map([['food-1', makeFood({ name: 'Rolled Oats' })]])

    expect(filterRecipes(recipes, foodsById, 'CoCoA', null)).toEqual([
      recipes[0],
    ])
    expect(filterRecipes(recipes, foodsById, 'rolled', 'Breakfast')).toEqual([
      recipes[0],
    ])
    expect(
      filterRecipes(recipes, foodsById, 'UNAVAILABLE-FOOD-42', 'Dinner'),
    ).toEqual([recipes[1]])
    expect(filterRecipes(recipes, foodsById, 'water', 'Dinner')).toEqual([])
  })
})
