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
  it('accepts unresolved Food references as structurally valid state', () => {
    const state = makeState()
    state.days[0].meals.Breakfast.push({
      id: 'item-missing',
      foodId: 'food-no-longer-available',
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
      foodId: 'food-1',
      quantity: 0,
    })
    expect(plannerStateSchema.safeParse(state).success).toBe(false)
  })

  it('accepts only finite positive quantities in exact tenth steps', () => {
    for (const quantity of [0.1, 1.2, 2.3, 0.1 + 0.2]) {
      const state = makeState()
      state.days[0].meals.Lunch.push({
        id: `quantity-${quantity}`,
        foodId: 'food-1',
        quantity,
      })
      expect(plannerStateSchema.safeParse(state).success).toBe(true)
    }

    for (const quantity of [1.25, Number.NaN, Number.POSITIVE_INFINITY]) {
      const state = makeState()
      state.days[0].meals.Lunch.push({
        id: `quantity-${quantity}`,
        foodId: 'food-1',
        quantity,
      })
      expect(plannerStateSchema.safeParse(state).success).toBe(false)
    }

    const invalidImport = makeState()
    invalidImport.days[0].meals.Lunch.push({
      id: 'quantity-import',
      foodId: 'food-1',
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
})

describe('backup compatibility', () => {
  it('parses legacy unversioned PlannerState', () => {
    const state = makeState()
    const result = parsePlannerStateText(JSON.stringify(state))
    expect(result).toEqual({ ok: true, source: 'legacy-v0', state })
  })

  it('round-trips a version 1 backup including custom Foods', () => {
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
    const serialized = serializePlannerState(state)
    expect(JSON.parse(serialized).schemaVersion).toBe(1)
    expect(parsePlannerStateText(serialized)).toEqual({
      ok: true,
      source: 'v1',
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
      foodId: legacyFood.id,
      quantity: 1.2,
    })

    const legacyResult = parsePlannerStateText(JSON.stringify(state))
    expect(legacyResult).toEqual({
      ok: true,
      source: 'legacy-v0',
      state,
    })
    if (!legacyResult.ok) return

    const serialized = serializePlannerState(legacyResult.state)
    expect(JSON.parse(serialized)).toEqual({
      schemaVersion: 1,
      state,
    })
    expect(parsePlannerStateText(serialized)).toEqual({
      ok: true,
      source: 'v1',
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
    const result = parsePlannerStateText(
      JSON.stringify({ schemaVersion: 2, state: makeState() }),
    )
    expect(result).toMatchObject({
      ok: false,
      kind: 'unsupported-version',
    })
  })

  it('previews unresolved counts against the available catalog', () => {
    const day = makeDay()
    day.meals.Breakfast.push(
      { id: 'known-item', foodId: 'known', quantity: 1 },
      { id: 'missing-item', foodId: 'missing', quantity: 2 },
    )
    expect(statePreview(makeState(day), [makeFood({ id: 'known' })])).toEqual({
      trailDays: 1,
      planItems: 2,
      customFoods: 0,
      unresolvedItems: 1,
    })
  })
})
