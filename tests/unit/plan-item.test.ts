import { describe, expect, it } from 'vitest'
import { interpretPlanItems } from '../../src/lib/plan-item'
import { resolveRecipeIngredient } from '../../src/lib/recipe'
import { makeFood, makeRecipe } from './fixtures'

describe('Plan-item interpretation', () => {
  it('interprets Food Plan items in input order with scaled nutrition and contributions', () => {
    const first = makeFood({
      id: 'food-1',
      name: 'Shared name',
      calories: 100,
    })
    const second = makeFood({
      id: 'food-2',
      name: 'Shared name',
      calories: 250,
    })

    const interpretations = interpretPlanItems(
      [
        {
          id: 'item-2',
          target: { kind: 'food', id: second.id },
          quantity: 0.5,
        },
        {
          id: 'item-1',
          target: { kind: 'food', id: first.id },
          quantity: 2,
        },
      ],
      [first, second],
      [],
    )

    expect(interpretations).toMatchObject([
      {
        planItemId: 'item-2',
        target: { kind: 'food', id: 'food-2' },
        quantity: 0.5,
        available: true,
        label: 'Shared name',
        nutrition: { calories: 125 },
        contributions: [
          {
            kind: 'food',
            key: 'food-2',
            foodId: 'food-2',
            quantity: 0.5,
            available: true,
          },
        ],
      },
      {
        planItemId: 'item-1',
        target: { kind: 'food', id: 'food-1' },
        quantity: 2,
        available: true,
        label: 'Shared name',
        nutrition: { calories: 200 },
        contributions: [
          {
            kind: 'food',
            key: 'food-1',
            foodId: 'food-1',
            quantity: 2,
            available: true,
          },
        ],
      },
    ])
  })

  it('expands and scales Recipe contributions in Recipe source order', () => {
    const food = makeFood({ id: 'food-1', calories: 100 })
    const recipe = makeRecipe({
      id: 'recipe-1',
      ingredients: [
        { kind: 'food', foodId: food.id, quantity: 1.5 },
        {
          kind: 'recipe-only',
          id: 'first-recipe-only',
          name: 'Cocoa',
          weightGrams: 10,
          calories: 40,
          fat: 1,
          carbs: 5,
          protein: 2,
          fiber: null,
          sugar: 0,
          sodium: 5,
          potassium: null,
        },
        { kind: 'food', foodId: food.id, quantity: 0.25 },
        {
          kind: 'recipe-only',
          id: 'second-recipe-only',
          name: 'Salt',
          weightGrams: 2,
          calories: 0,
          fat: 0,
          carbs: 0,
          protein: 0,
          fiber: 0,
          sugar: 0,
          sodium: 700,
          potassium: 0,
        },
      ],
    })

    const [interpretation] = interpretPlanItems(
      [
        {
          id: 'recipe-placement',
          target: { kind: 'recipe', id: recipe.id },
          quantity: 2,
        },
      ],
      [food],
      [recipe],
    )

    expect(interpretation).toMatchObject({
      available: true,
      label: 'Trail bowl',
      complete: false,
      nutrition: {
        calories: 430,
        weightGrams: 123.22325,
        fiber: 7,
        sodium: 2110,
      },
      known: {
        calories: true,
        fiber: false,
        sugar: true,
        potassium: false,
      },
      contributions: [
        {
          kind: 'food',
          key: 'food-1',
          foodId: 'food-1',
          quantity: 3,
        },
        {
          kind: 'recipe-only',
          key: 'recipe-1:first-recipe-only',
          recipeId: 'recipe-1',
          ingredientId: 'first-recipe-only',
        },
        {
          kind: 'food',
          key: 'food-1',
          foodId: 'food-1',
          quantity: 0.5,
        },
        {
          kind: 'recipe-only',
          key: 'recipe-1:second-recipe-only',
          recipeId: 'recipe-1',
          ingredientId: 'second-recipe-only',
        },
      ],
    })
    expect(interpretation.contributions[1]).toMatchObject({
      name: 'Cocoa',
      weightGrams: 20,
      nutrition: {
        calories: 80,
        fiber: 0,
        sugar: 0,
      },
      known: {
        calories: true,
        fiber: false,
        sugar: true,
      },
    })
    expect(interpretation.contributions[3]).toMatchObject({
      name: 'Salt',
      weightGrams: 4,
      nutrition: {
        calories: 0,
        sodium: 1400,
      },
    })
  })

  it('uses the same Recipe-only nutrition rule as Recipe drafts before applying Plan-item scale', () => {
    const ingredient = {
      kind: 'recipe-only' as const,
      id: 'cocoa',
      name: 'Cocoa',
      weightGrams: 12,
      calories: 47,
      fat: 1,
      carbs: 7,
      protein: 2,
      fiber: 0,
      sugar: null,
      sodium: 0,
      potassium: null,
    }
    const draftSummary = resolveRecipeIngredient(ingredient, new Map())
    const recipe = makeRecipe({ ingredients: [ingredient] })

    const [interpretation] = interpretPlanItems(
      [{
        id: 'recipe-placement',
        target: { kind: 'recipe', id: recipe.id },
        quantity: 2.5,
      }],
      [],
      [recipe],
    )

    expect(draftSummary).toMatchObject({
      nutrition: {
        calories: 47,
        weightGrams: 12,
        fiber: 0,
        sugar: 0,
        sodium: 0,
        potassium: 0,
      },
      known: {
        fiber: true,
        sugar: false,
        sodium: true,
        potassium: false,
      },
    })
    expect(interpretation).toMatchObject({
      nutrition: {
        calories: 117.5,
        weightGrams: 30,
        fiber: 0,
        sugar: 0,
        sodium: 0,
        potassium: 0,
      },
      known: draftSummary.known,
      contributions: [{
        kind: 'recipe-only',
        nutrition: {
          calories: 117.5,
          weightGrams: 30,
        },
        known: draftSummary.known,
      }],
    })
  })

  it('preserves original unsafe quantities while scaling contributions safely to zero', () => {
    const food = makeFood()
    const quantities = [
      0,
      -1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ]

    const interpretations = interpretPlanItems(
      quantities.map((quantity, index) => ({
        id: `item-${index}`,
        target: { kind: 'food' as const, id: food.id },
        quantity,
      })),
      [food],
      [],
    )

    expect(interpretations.map(({ quantity }) => quantity)).toEqual(quantities)
    expect(
      interpretations.map((interpretation) => ({
        calories: interpretation.nutrition.calories,
        contributionQuantity:
          interpretation.contributions[0].kind === 'food'
            ? interpretation.contributions[0].quantity
            : null,
      })),
    ).toEqual([
      { calories: 0, contributionQuantity: 0 },
      { calories: 0, contributionQuantity: 0 },
      { calories: 0, contributionQuantity: 0 },
      { calories: 0, contributionQuantity: 0 },
    ])
  })

  it('returns explicit unavailable interpretations for missing Food and Recipe targets', () => {
    const interpretations = interpretPlanItems(
      [
        {
          id: 'missing-food-item',
          target: { kind: 'food', id: 'missing-food' },
          quantity: 2.5,
        },
        {
          id: 'missing-recipe-item',
          target: { kind: 'recipe', id: 'missing-recipe' },
          quantity: 3,
        },
      ],
      [],
      [],
    )

    expect(interpretations).toMatchObject([
      {
        planItemId: 'missing-food-item',
        target: { kind: 'food', id: 'missing-food' },
        quantity: 2.5,
        available: false,
        label: null,
        nutrition: { calories: 0 },
        known: { calories: false, protein: false },
        unavailableReferences: [
          { kind: 'food', id: 'missing-food', quantity: 2.5 },
        ],
      },
      {
        planItemId: 'missing-recipe-item',
        target: { kind: 'recipe', id: 'missing-recipe' },
        quantity: 3,
        available: false,
        label: null,
        nutrition: { calories: 0 },
        known: { calories: false, protein: false },
        unavailableReferences: [
          { kind: 'recipe', id: 'missing-recipe', quantity: 3 },
        ],
      },
    ])
  })

  it('dispatches by target kind when a Food and Recipe identity overlap', () => {
    const recipe = makeRecipe({ id: 'shared-id' })

    const [interpretation] = interpretPlanItems(
      [
        {
          id: 'missing-food-item',
          target: { kind: 'food', id: 'shared-id' },
          quantity: 1,
        },
      ],
      [],
      [recipe],
    )

    expect(interpretation).toMatchObject({
      target: { kind: 'food', id: 'shared-id' },
      available: false,
      label: null,
      unavailableReferences: [
        { kind: 'food', id: 'shared-id', quantity: 1 },
      ],
    })
  })

  it('preserves known Recipe subtotals and scaled diagnostics for unavailable Food ingredients', () => {
    const food = makeFood({ id: 'available-food' })
    const recipe = makeRecipe({
      id: 'partial-recipe',
      ingredients: [
        { kind: 'food', foodId: food.id, quantity: 1.5 },
        { kind: 'food', foodId: 'missing-food', quantity: 0.75 },
      ],
    })

    const [interpretation] = interpretPlanItems(
      [
        {
          id: 'partial-placement',
          target: { kind: 'recipe', id: recipe.id },
          quantity: 2,
        },
      ],
      [food],
      [recipe],
    )

    expect(interpretation).toMatchObject({
      available: true,
      complete: false,
      nutrition: {
        calories: 300,
        protein: 12,
      },
      known: {
        calories: false,
        protein: false,
      },
      contributions: [
        {
          kind: 'food',
          key: 'available-food',
          foodId: 'available-food',
          quantity: 3,
          available: true,
        },
        {
          kind: 'food',
          key: 'missing-food',
          foodId: 'missing-food',
          quantity: 1.5,
          available: false,
        },
      ],
      unavailableReferences: [
        {
          kind: 'food',
          id: 'missing-food',
          quantity: 1.5,
          recipeId: 'partial-recipe',
        },
      ],
    })
  })

  it('is deterministic and does not mutate Plan items, Foods, or Recipes', () => {
    const items = [
      {
        id: 'recipe-placement',
        target: { kind: 'recipe' as const, id: 'recipe-1' },
        quantity: 2,
      },
    ]
    const foods = [makeFood()]
    const recipes = [
      makeRecipe({
        ingredients: [
          {
            kind: 'recipe-only',
            id: 'first-salt',
            name: 'Salt',
            weightGrams: 1,
            calories: 0,
            fat: 0,
            carbs: 0,
            protein: 0,
            fiber: 0,
            sugar: 0,
            sodium: 100,
            potassium: 0,
          },
          {
            kind: 'recipe-only',
            id: 'second-salt',
            name: 'Salt',
            weightGrams: 2,
            calories: 0,
            fat: 0,
            carbs: 0,
            protein: 0,
            fiber: 0,
            sugar: 0,
            sodium: 200,
            potassium: 0,
          },
        ],
      }),
    ]
    const inputsBefore = structuredClone({ items, foods, recipes })

    const first = interpretPlanItems(items, foods, recipes)
    const second = interpretPlanItems(items, foods, recipes)

    expect(first).toEqual(second)
    expect({ items, foods, recipes }).toEqual(inputsBefore)
    expect(
      first[0].contributions.map(({ key }) => key),
    ).toEqual(['recipe-1:first-salt', 'recipe-1:second-salt'])
  })
})
