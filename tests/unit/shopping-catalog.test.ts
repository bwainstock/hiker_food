import { describe, expect, it } from 'vitest'
import {
  filterAndSortElectrolytes,
  filterAndSortFoods,
} from '../../src/lib/catalog'
import { aggregateShoppingList } from '../../src/lib/shopping'
import {
  BUILT_IN_FOODS,
  ELECTROLYTES,
} from '../../src/data'
import {
  STARTER_PLAN_ITEMS,
  createStarterState,
  validateStarterFoodIds,
} from '../../src/lib/planner'
import {
  electrolyteCatalogSchema,
  foodCatalogSchema,
} from '../../src/lib/schemas'
import {
  makeDay,
  makeElectrolyte,
  makeFood,
  makeRecipe,
  makeState,
} from './fixtures'

describe('Shopping-list aggregation', () => {
  it('aggregates by stable Food ID rather than display name', () => {
    const sameNameA = makeFood({ id: 'food-a', name: 'Same Name' })
    const sameNameB = makeFood({ id: 'food-b', name: 'Same Name' })
    const day = makeDay()
    day.meals.Breakfast.push(
      { id: 'item-a1', target: { kind: 'food', id: 'food-a' }, quantity: 1 },
      { id: 'item-a2', target: { kind: 'food', id: 'food-a' }, quantity: 2 },
      { id: 'item-b1', target: { kind: 'food', id: 'food-b' }, quantity: 4 },
    )
    const result = aggregateShoppingList(
      makeState(day),
      [sameNameA, sameNameB],
    )
    expect(result.rows).toHaveLength(2)
    expect(
      result.rows.map(({ food, quantity }) => [food.id, quantity]),
    ).toEqual([
      ['food-a', 3],
      ['food-b', 4],
    ])
  })

  it('retains unresolved stable IDs in a separate aggregate', () => {
    const day = makeDay()
    day.meals.Lunch.push(
      {
        id: 'missing-1',
        target: { kind: 'food', id: 'missing' },
        quantity: 1.2,
      },
      {
        id: 'missing-2',
        target: { kind: 'food', id: 'missing' },
        quantity: 2.3,
      },
    )
    const result = aggregateShoppingList(makeState(day), [])
    expect(result.rows).toEqual([])
    expect(result.unresolved[0]).toMatchObject({
      foodId: 'missing',
      quantity: 3.5,
      itemCount: 2,
    })
  })

  it('expands Recipes and aggregates Food ingredients with direct placements', () => {
      const food = makeFood()
      const recipe = makeRecipe()
      const day = makeDay()
      day.meals.Breakfast.push(
        { id: 'direct', target: { kind: 'food', id: food.id }, quantity: 1 },
        { id: 'recipe-a', target: { kind: 'recipe', id: recipe.id }, quantity: 2 },
      )
      const state = makeState(day)
      state.recipes = [recipe]

      const result = aggregateShoppingList(
        state,
        [food],
      )

      expect(result.rows).toHaveLength(1)
      expect(result.rows[0]).toMatchObject({
        food: { id: food.id },
        quantity: 4,
        itemCount: 2,
      })
      expect(result.recipeOnlyRows).toEqual([
        expect.objectContaining({
          recipeId: recipe.id,
          ingredientId: 'spice-1',
          name: 'Spice blend',
          sourceRecipe: 'Trail bowl',
          placementQuantity: 2,
          weightGrams: 20,
          calories: 40,
        }),
      ])
  })

  it('keeps same-named Recipe-only ingredients separate by Recipe identity', () => {
      const recipeA = makeRecipe({
        id: 'recipe-a',
        name: 'Savory bowl',
        ingredients: [
          {
            kind: 'recipe-only',
            id: 'salt',
            name: 'Salt',
            weightGrams: 2,
            calories: 0,
            fat: 0,
            carbs: 0,
            protein: 0,
            fiber: 0,
            sugar: 0,
            sodium: 500,
            potassium: 0,
          },
        ],
      })
      const recipeB = makeRecipe({
        id: 'recipe-b',
        name: 'Sweet bowl',
        ingredients: [
          {
            kind: 'recipe-only',
            id: 'salt',
            name: 'Salt',
            weightGrams: 1,
            calories: 0,
            fat: 0,
            carbs: 0,
            protein: 0,
            fiber: 0,
            sugar: 0,
            sodium: 250,
            potassium: 0,
          },
        ],
      })
      const day = makeDay()
      day.meals.Dinner.push(
        { id: 'a-1', target: { kind: 'recipe', id: recipeA.id }, quantity: 1 },
        { id: 'a-2', target: { kind: 'recipe', id: recipeA.id }, quantity: 2 },
        { id: 'b-1', target: { kind: 'recipe', id: recipeB.id }, quantity: 4 },
      )
      const state = makeState(day)
      state.recipes = [recipeA, recipeB]

      const result = aggregateShoppingList(state, [])

      expect(
        result.recipeOnlyRows.map((row) => [
          row.sourceRecipe,
          row.placementQuantity,
          row.weightGrams,
        ]),
      ).toEqual([
        ['Savory bowl', 3, 6],
        ['Sweet bowl', 4, 4],
      ])
  })

  it('retains unavailable Food-ingredient quantity, Recipe source, and Plan locations', () => {
    const recipe = makeRecipe({
      id: 'recipe-incomplete',
      name: 'Partial bowl',
      ingredients: [
        { kind: 'food', foodId: 'retired-food', quantity: 1.5 },
      ],
    })
    const day = makeDay()
    day.meals.Dinner.push({
      id: 'recipe-placement',
      target: { kind: 'recipe', id: recipe.id },
      quantity: 2,
    })
    const state = makeState(day)
    state.recipes = [recipe]

    const result = aggregateShoppingList(state, [])

    expect(result.complete).toBe(false)
    expect(result.unresolved).toEqual([
      {
        foodId: 'retired-food',
        quantity: 3,
        itemCount: 1,
        directItemCount: 0,
        locations: ['Day 1 · Dinner'],
        recipeSources: [{ id: 'recipe-incomplete', name: 'Partial bowl' }],
      },
    ])
  })
})

describe('catalog contracts', () => {
  it('matches schemas and contains unique stable IDs', () => {
    expect(foodCatalogSchema.safeParse(BUILT_IN_FOODS).success).toBe(true)
    expect(electrolyteCatalogSchema.safeParse(ELECTROLYTES).success).toBe(true)
    expect(BUILT_IN_FOODS).toHaveLength(1653)
    expect(ELECTROLYTES).toHaveLength(138)
    expect(new Set(BUILT_IN_FOODS.map((food) => food.id)).size).toBe(
      BUILT_IN_FOODS.length,
    )
    expect(new Set(ELECTROLYTES.map((item) => item.id)).size).toBe(
      ELECTROLYTES.length,
    )
  })

  it('keeps representative Food and electrolyte records stable', () => {
    expect(
      BUILT_IN_FOODS.find(
        (food) => food.id === 'justin-s-classic-peanut-butter-19',
      ),
    ).toMatchObject({
      name: "Justin's Classic Peanut Butter",
      servingGrams: 32,
      calories: 210,
      protein: 7,
    })
    expect(
      ELECTROLYTES.find(
        (item) => item.id === 'science-in-sport-go-electrolyte-9',
      ),
    ).toMatchObject({
      brand: 'Science in Sport',
      flavor: 'GO Electrolyte',
      sodium: 500,
      potassium: 60,
    })
  })

  it('validates every stable starter Food ID', () => {
    expect(() => validateStarterFoodIds(BUILT_IN_FOODS)).not.toThrow()
    const state = createStarterState(BUILT_IN_FOODS)
    expect(
      state.days[0].meals.Breakfast[0].target.id,
    ).toBe('backpacker-s-pantry-granola-with-bananas-milk-399')
    expect(
      STARTER_PLAN_ITEMS.every(([, foodId]) =>
        BUILT_IN_FOODS.some((food) => food.id === foodId),
      ),
    ).toBe(true)
    expect(() =>
      validateStarterFoodIds(
        BUILT_IN_FOODS.filter(
          (food) => food.id !== STARTER_PLAN_ITEMS[0][1],
        ),
      ),
    ).toThrow(/missing Food IDs/)
  })
})

describe('pure catalog search, filter, and sort', () => {
  it('searches Food fields, filters categories, uses tie-breakers, and puts missing numbers last', () => {
    const foods = [
      makeFood({
        id: 'z',
        brand: 'Acme',
        flavor: 'Berry',
        name: 'Zulu',
        category: 'Bar',
        caloriesPerOz: null,
      }),
      makeFood({
        id: 'b',
        brand: 'Acme',
        flavor: 'Berry',
        name: 'Beta',
        category: 'Bar',
        caloriesPerOz: 150,
      }),
      makeFood({
        id: 'a',
        brand: 'Acme',
        flavor: 'Berry',
        name: 'Alpha',
        category: 'Bar',
        caloriesPerOz: 150,
      }),
      makeFood({
        id: 'other',
        brand: 'Other',
        name: 'Other',
        category: 'Entrée',
        caloriesPerOz: 300,
      }),
    ]
    expect(
      filterAndSortFoods(foods, {
        query: 'acme berry',
        category: 'Bar',
        sort: 'density',
      }).map((food) => food.id),
    ).toEqual(['a', 'b', 'z'])
  })

  it('sorts electrolyte null values last with deterministic text ties', () => {
    const items = [
      makeElectrolyte({
        id: 'null',
        brand: 'Null',
        sodium: null,
      }),
      makeElectrolyte({
        id: 'beta',
        brand: 'Beta',
        sodium: 500,
      }),
      makeElectrolyte({
        id: 'alpha',
        brand: 'Alpha',
        sodium: 500,
      }),
    ]
    expect(
      filterAndSortElectrolytes(items, '', 'sodium').map((item) => item.id),
    ).toEqual(['alpha', 'beta', 'null'])
  })
})
