import type { DayPlan, Food, MealName, PlannerState } from '../types'
import { MEALS } from '../types'
import { plannerStateSchema } from './schemas'

export const createEmptyMeals = () =>
  MEALS.reduce(
    (meals, meal) => {
      meals[meal] = []
      return meals
    },
    {} as Record<MealName, DayPlan['meals'][MealName]>,
  )

export const createDay = (number: number): DayPlan => ({
  id: crypto.randomUUID(),
  name: `Day ${number}`,
  meals: createEmptyMeals(),
})

export const STARTER_PLAN_ITEMS = [
  ['Breakfast', 'backpacker-s-pantry-granola-with-bananas-milk-399', 1],
  ['Morning snacks', 'honey-stinger-waffle-short-stack-with-maple-235', 2],
  ['Morning snacks', 'justin-s-classic-peanut-butter-19', 2],
  ['Lunch', 'open-nature-uncured-hot-italian-salami-679', 3],
  ['Lunch', 'tillamook-cheese-packet-medium-cheddar-514', 3],
  ['Afternoon snacks', 'safeway-bulk-dispenser-mountain-mix-334', 1],
  ['Afternoon snacks', 'kind-salted-caramel-dark-chocolate-nut-335', 1],
  ['Recovery', 'tailwind-nutrition-chocolate-recovery-782', 1],
  [
    'Dinner',
    'pinnacle-foods-thai-peanut-curry-roasted-vegetables-rice-noo-1584',
    1,
  ],
] as const

export function validateStarterFoodIds(foods: readonly Food[]) {
  const available = new Set(foods.map((food) => food.id))
  const missing = STARTER_PLAN_ITEMS.map(([, foodId]) => foodId).filter(
    (foodId) => !available.has(foodId),
  )
  if (missing.length > 0) {
    throw new Error(`Starter state references missing Food IDs: ${missing.join(', ')}`)
  }
}

export function createStarterState(foods: Food[]): PlannerState {
  validateStarterFoodIds(foods)
  const day = createDay(1)
  STARTER_PLAN_ITEMS.forEach(([meal, foodId, quantity]) => {
    day.meals[meal].push({
      id: crypto.randomUUID(),
      target: { kind: 'food', id: foodId },
      quantity,
    })
  })

  return plannerStateSchema.parse({ days: [day], customFoods: [], recipes: [] })
}
