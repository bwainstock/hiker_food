import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PlannerPage } from '../../src/pages/PlannerPage'
import { SodiumCalculatorPage } from '../../src/pages/SodiumCalculatorPage'
import { makeDay, makeFood, makeRecipe, makeState } from './fixtures'

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
  const foods = [food]
  const recipes = [recipe]
  const state = {
    ...makeState(firstDay),
    days: [firstDay, secondDay],
    recipes,
  }
  return { food, foods, recipes, state }
}

describe('Plan page collection interpretation', () => {
  it('renders grouped Planner results in their Trail-day and meal-period context', () => {
    const { food, foods, state } = makePlanCollections()

    const markup = renderToStaticMarkup(createElement(PlannerPage, {
      state,
      setState: () => undefined,
      foods,
      foodsById: new Map([[food.id, food]]),
    }))

    expect(markup).toContain('Day 1')
    expect(markup).toContain('Breakfast')
    expect(markup).toContain(food.name)
    expect(markup).toContain('100 kcal')
  })

  it('renders Sodium-calculator totals from the selected Trail day grouping', () => {
    const { foods, state } = makePlanCollections()

    const markup = renderToStaticMarkup(createElement(SodiumCalculatorPage, {
      state,
      foods,
    }))

    expect(markup).toContain('Day 1')
    expect(markup).toContain('From food')
    expect(markup).toContain('200 mg')
  })
})
