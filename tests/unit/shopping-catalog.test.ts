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
  makeState,
} from './fixtures'

describe('Shopping-list aggregation', () => {
  it('aggregates by stable Food ID rather than display name', () => {
    const sameNameA = makeFood({ id: 'food-a', name: 'Same Name' })
    const sameNameB = makeFood({ id: 'food-b', name: 'Same Name' })
    const day = makeDay()
    day.meals.Breakfast.push(
      { id: 'item-a1', foodId: 'food-a', quantity: 1 },
      { id: 'item-a2', foodId: 'food-a', quantity: 2 },
      { id: 'item-b1', foodId: 'food-b', quantity: 4 },
    )
    const result = aggregateShoppingList(
      makeState(day),
      new Map([
        [sameNameA.id, sameNameA],
        [sameNameB.id, sameNameB],
      ]),
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
      { id: 'missing-1', foodId: 'missing', quantity: 1.2 },
      { id: 'missing-2', foodId: 'missing', quantity: 2.3 },
    )
    const result = aggregateShoppingList(makeState(day), new Map())
    expect(result.rows).toEqual([])
    expect(result.unresolved[0]).toMatchObject({
      foodId: 'missing',
      quantity: 3.5,
      itemCount: 2,
    })
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
      state.days[0].meals.Breakfast[0].foodId,
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
