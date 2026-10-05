import { describe, expect, it } from 'vitest'
import { createCustomFood } from '../../src/lib/customFood'
import { nutritionForFood } from '../../src/lib/nutrition'
import { plannerStateSchema } from '../../src/lib/schemas'
import {
  findUnresolvedPlanItems,
  parsePlannerStateText,
  serializePlannerState,
  statePreview,
} from '../../src/lib/state'
import { makeDay, makeFood, makeState } from './fixtures'

describe('persisted state validation and recovery classification', () => {
  it('accepts Recipes with Food and Recipe-only ingredients', () => {
    const state = {
      ...makeState(),
      recipes: [
        {
          id: 'recipe-couscous',
          name: 'Trail couscous',
          category: 'Dinner',
          instructions: 'Add hot water and rest for five minutes.',
          ingredients: [
            {
              kind: 'food',
              foodId: 'food-1',
              quantity: 1.2,
            },
            {
              kind: 'recipe-only',
              id: 'ingredient-spices',
              name: 'Spice blend',
              weightGrams: 5,
              calories: 10,
              fat: 0,
              carbs: 2,
              protein: 0,
            },
          ],
        },
      ],
    }

    expect(plannerStateSchema.parse(state).recipes[0]).toMatchObject({
      id: 'recipe-couscous',
      ingredients: [
        { kind: 'food', foodId: 'food-1', quantity: 1.2 },
        {
          kind: 'recipe-only',
          id: 'ingredient-spices',
          fiber: null,
          sugar: null,
          sodium: null,
          potassium: null,
        },
      ],
    })
  })

  it('accepts explicit Food and Recipe Plan-item targets', () => {
    const state = makeState()
    const currentShape = {
      ...state,
      recipes: [
        {
          id: 'recipe-1',
          name: 'Dinner',
          category: null,
          instructions: null,
          ingredients: [
            { kind: 'food', foodId: 'food-1', quantity: 1 },
          ],
        },
      ],
      days: [
        {
          ...state.days[0],
          meals: {
            ...state.days[0].meals,
            Breakfast: [
              {
                id: 'food-target',
                target: { kind: 'food', id: 'food-1' },
                quantity: 1,
              },
              {
                id: 'recipe-target',
                target: { kind: 'recipe', id: 'recipe-1' },
                quantity: 2,
              },
            ],
          },
        },
      ],
    }

    expect(plannerStateSchema.safeParse(currentShape).success).toBe(true)
  })

  it('rejects Recipe Plan-item targets that do not identify a Recipe', () => {
    const state = makeState()
    expect(
      plannerStateSchema.safeParse({
        ...state,
        days: [
          {
            ...state.days[0],
            meals: {
              ...state.days[0].meals,
              Dinner: [
                {
                  id: 'missing-recipe',
                  target: { kind: 'recipe', id: 'recipe-missing' },
                  quantity: 1,
                },
              ],
            },
          },
        ],
      }).success,
    ).toBe(false)
  })

  it('rejects malformed Recipe fields and nested Recipe ingredients', () => {
    const validRecipe = {
      id: 'recipe-1',
      name: 'Dinner',
      category: 'Dinner',
      instructions: null,
      ingredients: [
        {
          kind: 'recipe-only',
          id: 'ingredient-1',
          name: 'Seasoning',
          weightGrams: 2,
          calories: 0,
          fat: 0,
          carbs: 0,
          protein: 0,
        },
      ],
    }
    const invalidRecipes = [
      { ...validRecipe, name: '   ' },
      { ...validRecipe, category: 'Supper' },
      { ...validRecipe, ingredients: [] },
      {
        ...validRecipe,
        ingredients: [{ kind: 'recipe', recipeId: 'recipe-2', quantity: 1 }],
      },
      {
        ...validRecipe,
        ingredients: [
          { kind: 'food', foodId: 'food-1', quantity: 1.2345 },
        ],
      },
      {
        ...validRecipe,
        ingredients: [
          {
            ...validRecipe.ingredients[0],
            weightGrams: 0,
          },
        ],
      },
      {
        ...validRecipe,
        ingredients: [
          {
            ...validRecipe.ingredients[0],
            calories: Number.POSITIVE_INFINITY,
          },
        ],
      },
    ]

    for (const recipe of invalidRecipes) {
      expect(
        plannerStateSchema.safeParse({
          ...makeState(),
          recipes: [recipe],
        }).success,
      ).toBe(false)
    }
  })

  it('rejects duplicate Recipe, ingredient, and Food-reference IDs', () => {
    const recipe = {
      id: 'recipe-1',
      name: 'Dinner',
      category: null,
      instructions: null,
      ingredients: [
        { kind: 'food', foodId: 'food-1', quantity: 1 },
        { kind: 'food', foodId: 'food-1', quantity: 2 },
      ],
    }
    expect(
      plannerStateSchema.safeParse({
        ...makeState(),
        recipes: [recipe],
      }).success,
    ).toBe(false)

    const duplicateIngredients = {
      ...recipe,
      ingredients: [
        {
          kind: 'recipe-only',
          id: 'ingredient-1',
          name: 'Salt',
          weightGrams: 1,
          calories: 0,
          fat: 0,
          carbs: 0,
          protein: 0,
        },
        {
          kind: 'recipe-only',
          id: 'ingredient-1',
          name: 'Pepper',
          weightGrams: 1,
          calories: 0,
          fat: 0,
          carbs: 0,
          protein: 0,
        },
      ],
    }
    expect(
      plannerStateSchema.safeParse({
        ...makeState(),
        recipes: [duplicateIngredients],
      }).success,
    ).toBe(false)
    const validRecipe = {
      ...duplicateIngredients,
      ingredients: [duplicateIngredients.ingredients[0]],
    }
    expect(
      plannerStateSchema.safeParse({
        ...makeState(),
        recipes: [
          validRecipe,
          { ...validRecipe, name: 'Other' },
        ],
      }).success,
    ).toBe(false)
  })

  it('rejects malformed Plan-item targets', () => {
    for (const target of [
      { kind: 'food', id: '' },
      { kind: 'recipe', id: '   ' },
      { kind: 'meal', id: 'food-1' },
      { kind: 'food', id: 'food-1', extra: true },
    ]) {
      const state = makeState()
      expect(
        plannerStateSchema.safeParse({
          ...state,
          days: [
            {
              ...state.days[0],
              meals: {
                ...state.days[0].meals,
                Breakfast: [{ id: 'item-1', target, quantity: 1 }],
              },
            },
          ],
        }).success,
      ).toBe(false)
    }
  })

  it('accepts unresolved Food references as structurally valid state', () => {
    const state = makeState()
    state.days[0].meals.Breakfast.push({
      id: 'item-missing',
      target: { kind: 'food', id: 'food-no-longer-available' },
      quantity: 1.5,
    })
    expect(plannerStateSchema.safeParse(state).success).toBe(true)
    expect(findUnresolvedPlanItems(state, new Map())).toEqual([
      {
        dayId: 'day-1',
        dayName: 'Day 1',
        meal: 'Breakfast',
        itemId: 'item-missing',
        foodId: 'food-no-longer-available',
        quantity: 1.5,
      },
    ])
  })

  it('rejects a Plan with no Trail days or a non-positive quantity', () => {
    expect(
      plannerStateSchema.safeParse({ days: [], customFoods: [] }).success,
    ).toBe(false)
    const state = makeState()
    state.days[0].meals.Lunch.push({
      id: 'bad-quantity',
      target: { kind: 'food', id: 'food-1' },
      quantity: 0,
    })
    expect(plannerStateSchema.safeParse(state).success).toBe(false)
  })

  it('accepts only finite positive quantities in exact tenth steps', () => {
    for (const quantity of [0.1, 1.2, 2.3, 0.1 + 0.2]) {
      const state = makeState()
      state.days[0].meals.Lunch.push({
        id: `quantity-${quantity}`,
        target: { kind: 'food', id: 'food-1' },
        quantity,
      })
      expect(plannerStateSchema.safeParse(state).success).toBe(true)
    }

    for (const quantity of [1.25, Number.NaN, Number.POSITIVE_INFINITY]) {
      const state = makeState()
      state.days[0].meals.Lunch.push({
        id: `quantity-${quantity}`,
        target: { kind: 'food', id: 'food-1' },
        quantity,
      })
      expect(plannerStateSchema.safeParse(state).success).toBe(false)
    }

    const invalidImport = makeState()
    invalidImport.days[0].meals.Lunch.push({
      id: 'quantity-import',
      target: { kind: 'food', id: 'food-1' },
      quantity: 1.25,
    })
    expect(parsePlannerStateText(JSON.stringify(invalidImport))).toMatchObject({
      ok: false,
      kind: 'invalid-state',
    })
  })

  it('classifies invalid JSON without replacing its raw payload', () => {
    const raw = '{"days":'
    const result = parsePlannerStateText(raw)
    expect(result).toMatchObject({
      ok: false,
      kind: 'invalid-json',
      raw,
    })
  })

  it('classifies parseable invalid state with actionable paths', () => {
    const raw = JSON.stringify({ days: [], customFoods: [] })
    const result = parsePlannerStateText(raw)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.kind).toBe('invalid-state')
      expect(result.errors.join(' ')).toContain('days')
      expect(result.raw).toBe(raw)
    }
  })

  it('rejects invalid version 2 Recipe data without discarding the raw input', () => {
    const state = makeState()
    const raw = JSON.stringify({
      schemaVersion: 2,
      state: {
        ...state,
        recipes: [
          {
            id: 'invalid-recipe',
            name: 'Empty',
            category: null,
            instructions: null,
            ingredients: [],
          },
        ],
      },
    })
    const result = parsePlannerStateText(raw)
    expect(result).toMatchObject({
      ok: false,
      kind: 'invalid-state',
      raw,
    })
    if (!result.ok) {
      expect(result.errors.join(' ')).toContain('recipes[0].ingredients')
    }
  })
})

describe('backup compatibility', () => {
  it('parses legacy unversioned PlannerState', () => {
    const state = makeState()
    const legacyState = {
      days: [
        {
          ...state.days[0],
          meals: {
            ...state.days[0].meals,
            Breakfast: [
              { id: 'legacy-food', foodId: 'food-1', quantity: 1.5 },
            ],
          },
        },
      ],
      customFoods: [],
    }
    const result = parsePlannerStateText(JSON.stringify(legacyState))
    expect(result).toEqual({
      ok: true,
      source: 'legacy-v0',
      state: {
        ...state,
        days: [
          {
            ...state.days[0],
            meals: {
              ...state.days[0].meals,
              Breakfast: [
                {
                  id: 'legacy-food',
                  target: { kind: 'food', id: 'food-1' },
                  quantity: 1.5,
                },
              ],
            },
          },
        ],
      },
    })
  })

  it('migrates version 1 Plan items to Food targets and initializes Recipes', () => {
    const state = makeState()
    const version1 = {
      schemaVersion: 1,
      state: {
        days: [
          {
            ...state.days[0],
            meals: {
              ...state.days[0].meals,
              Lunch: [
                { id: 'v1-food', foodId: 'food-1', quantity: 2.3 },
              ],
            },
          },
        ],
        customFoods: [],
      },
    }

    expect(parsePlannerStateText(JSON.stringify(version1))).toEqual({
      ok: true,
      source: 'v1',
      state: {
        ...state,
        days: [
          {
            ...state.days[0],
            meals: {
              ...state.days[0].meals,
              Lunch: [
                {
                  id: 'v1-food',
                  target: { kind: 'food', id: 'food-1' },
                  quantity: 2.3,
                },
              ],
            },
          },
        ],
      },
    })
  })

  it('round-trips a version 2 backup including custom Foods and Recipes', () => {
    const state = makeState()
    state.customFoods.push(
      createCustomFood(
        {
          brand: 'Home',
          flavor: 'Couscous',
          category: 'Entrée',
          prep: 'hot',
          servingGrams: 100,
          calories: 400,
          fat: 10,
          sodium: 500,
          potassium: 250,
          carbs: 60,
          fiber: 5,
          sugar: 4,
          protein: 15,
        },
        'custom-couscous',
      ),
    )
    state.recipes.push({
      id: 'recipe-couscous',
      name: 'Trail couscous',
      category: 'Dinner',
      instructions: null,
      ingredients: [
        { kind: 'food', foodId: 'custom-couscous', quantity: 1 },
      ],
    })
    const serialized = serializePlannerState(state)
    expect(JSON.parse(serialized).schemaVersion).toBe(2)
    expect(parsePlannerStateText(serialized)).toEqual({
      ok: true,
      source: 'v2',
      state,
    })
  })

  it('exactly round-trips typed placements, optional Recipe values, and unavailable Food references', () => {
    const state = makeState()
    state.recipes.push({
      id: 'recipe-mixed',
      name: 'Mixed trail bowl',
      category: null,
      instructions: '',
      ingredients: [
        {
          kind: 'food',
          foodId: 'food-no-longer-available',
          quantity: 1.2,
        },
        {
          kind: 'recipe-only',
          id: 'ingredient-seasoning',
          name: 'Seasoning',
          weightGrams: 3,
          calories: 0,
          fat: 0,
          carbs: 0,
          protein: 0,
          fiber: 0,
          sugar: 0,
          sodium: 325,
          potassium: 0,
        },
      ],
    })
    state.days[0].meals.Dinner.push(
      {
        id: 'placed-recipe',
        target: { kind: 'recipe', id: 'recipe-mixed' },
        quantity: 2.3,
      },
      {
        id: 'unavailable-food',
        target: { kind: 'food', id: 'food-no-longer-available' },
        quantity: 0.4,
      },
    )

    const serialized = serializePlannerState(state)

    expect(JSON.parse(serialized)).toEqual({
      schemaVersion: 2,
      state,
    })
    expect(parsePlannerStateText(serialized)).toEqual({
      ok: true,
      source: 'v2',
      state,
    })
  })

  it('preserves legacy custom Foods with nullable labels and zero serving weight', () => {
    const legacyFood = makeFood({
      id: 'custom-legacy-zero-weight',
      brand: null,
      flavor: null,
      name: 'Legacy zero-weight ration',
      servingGrams: 0,
      servingOz: 0,
      calories: 450,
      caloriesPerGram: null,
      caloriesPerOz: null,
      custom: true,
    })
    const state = makeState()
    state.customFoods.push(legacyFood)
    state.days[0].meals.Dinner.push({
      id: 'legacy-dinner',
      target: { kind: 'food', id: legacyFood.id },
      quantity: 1.2,
    })

    const legacyResult = parsePlannerStateText(
      JSON.stringify({
        days: state.days.map((day) => ({
          ...day,
          meals: {
            ...day.meals,
            Dinner: day.meals.Dinner.map((item) => ({
              id: item.id,
              foodId: item.target.id,
              quantity: item.quantity,
            })),
          },
        })),
        customFoods: state.customFoods,
      }),
    )
    expect(legacyResult).toEqual({
      ok: true,
      source: 'legacy-v0',
      state,
    })
    if (!legacyResult.ok) return

    const serialized = serializePlannerState(legacyResult.state)
    expect(JSON.parse(serialized)).toEqual({
      schemaVersion: 2,
      state,
    })
    expect(parsePlannerStateText(serialized)).toEqual({
      ok: true,
      source: 'v2',
      state,
    })

    const nutrition = nutritionForFood(legacyFood, 1.2)
    expect(Object.values(nutrition).every(Number.isFinite)).toBe(true)
    expect(nutrition).toMatchObject({
      calories: 540,
      weightGrams: 0,
      weightOz: 0,
    })
  })

  it('rejects unsupported future versions', () => {
    const raw = JSON.stringify({ schemaVersion: 3, state: makeState() })
    const result = parsePlannerStateText(raw)
    expect(result).toMatchObject({
      ok: false,
      kind: 'unsupported-version',
      raw,
    })
  })

  it('reports an actionable path for an unavailable Recipe target', () => {
    const state = makeState()
    state.days[0].meals.Dinner.push({
      id: 'missing-recipe',
      target: { kind: 'recipe', id: 'recipe-missing' },
      quantity: 1,
    })
    const raw = JSON.stringify({ schemaVersion: 2, state })
    const result = parsePlannerStateText(raw)

    expect(result).toMatchObject({
      ok: false,
      kind: 'invalid-state',
      raw,
    })
    if (!result.ok) {
      expect(result.errors).toContain(
        'state.days[0].meals.Dinner[0].target.id: Recipe target "recipe-missing" is not available.',
      )
    }
  })

  it('previews unresolved counts against the available catalog', () => {
    const day = makeDay()
    day.meals.Breakfast.push(
      {
        id: 'known-item',
        target: { kind: 'food', id: 'known' },
        quantity: 1,
      },
      {
        id: 'missing-item',
        target: { kind: 'food', id: 'missing' },
        quantity: 2,
      },
    )
    const state = makeState(day)
    state.recipes.push({
      id: 'incomplete-recipe',
      name: 'Incomplete recipe',
      category: null,
      instructions: null,
      ingredients: [
        { kind: 'food', foodId: 'known', quantity: 1 },
        { kind: 'food', foodId: 'missing-ingredient', quantity: 1 },
      ],
    })
    expect(statePreview(state, [makeFood({ id: 'known' })])).toEqual({
      trailDays: 1,
      planItems: 2,
      customFoods: 0,
      unresolvedItems: 1,
      recipes: 1,
      incompleteRecipes: 1,
      unresolvedRecipeIngredients: 1,
    })
  })
})
