import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PlannerPage } from '../../src/pages/PlannerPage'
import { SodiumCalculatorPage } from '../../src/pages/SodiumCalculatorPage'
import type { Food, Recipe } from '../../src/types'
import { makeDay, makeFood, makeRecipe, makeState } from './fixtures'

class MapCountingArray<T> extends Array<T> {
  mapCalls = 0

  override map<U>(
    callbackfn: (value: T, index: number, array: T[]) => U,
    thisArg?: unknown,
  ): U[] {
    this.mapCalls += 1
    return super.map(callbackfn, thisArg)
  }
}

function makePlanCollections() {
  const food = makeFood()
  const recipe = makeRecipe()
  const firstDay = makeDay('day-1', 'Day 1')
  firstDay.meals.Breakfast = [{
    id: 'food-placement',
    target: { kind: 'food', id: food.id },
    quantity: 1,
  }]
  const secondDay = makeDay('day-2', 'Day 2')
  secondDay.meals.Dinner = [{
    id: 'recipe-placement',
    target: { kind: 'recipe', id: recipe.id },
    quantity: 2,
  }]
  const foods = new MapCountingArray<Food>(food)
  const recipes = new MapCountingArray<Recipe>(recipe)
  const state = {
    ...makeState(firstDay),
    days: [firstDay, secondDay],
    recipes,
  }
  return { food, foods, recipes, state }
}

describe('Plan page collection interpretation', () => {
  it('builds Planner collection indexes once while preserving rendered Plan details', () => {
    const { food, foods, recipes, state } = makePlanCollections()

    const markup = renderToStaticMarkup(createElement(PlannerPage, {
      state,
      setState: () => undefined,
      foods,
      foodsById: new Map([[food.id, food]]),
    }))

    expect(markup).toContain('Day 1')
    expect(markup).toContain(food.name)
    expect(foods.mapCalls).toBe(1)
    expect(recipes.mapCalls).toBe(1)
  })

  it('builds Sodium-calculator collection indexes once for the selected Trail day', () => {
    const { foods, recipes, state } = makePlanCollections()

    const markup = renderToStaticMarkup(createElement(SodiumCalculatorPage, {
      state,
      foods,
    }))

    expect(markup).toContain('Day 1')
    expect(foods.mapCalls).toBe(1)
    expect(recipes.mapCalls).toBe(1)
  })
})
