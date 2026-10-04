import type { DayPlan, Food, MealName, PlannerState } from '../types'
import { MEALS } from '../types'

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

const starterFoods = [
  ['Breakfast', "Backpacker's Pantry Granola with Bananas & Milk", 1],
  ['Morning snacks', 'Honey Stinger Waffle, Short Stack with Maple', 2],
  ['Morning snacks', "Justin's Classic Peanut Butter", 2],
  ['Lunch', 'Open Nature Uncured Hot Italian Salami', 3],
  ['Lunch', 'Tillamook Cheese packet, Medium Cheddar', 3],
  ['Afternoon snacks', 'Safeway (bulk dispenser) Mountain Mix', 1],
  ['Afternoon snacks', 'Kind Salted Caramel Dark Chocolate Nut', 1],
  ['Recovery', 'Tailwind Nutrition Chocolate Recovery', 1],
  [
    'Dinner',
    'Pinnacle Foods Thai Peanut Curry, Roasted Vegetables, Rice Noodles',
    1,
  ],
] as const

export function createStarterState(foods: Food[]): PlannerState {
  const day = createDay(1)
  const byName = new Map(foods.map((food) => [food.name, food]))

  starterFoods.forEach(([meal, name, quantity]) => {
    const food = byName.get(name)
    if (food) {
      day.meals[meal].push({
        id: crypto.randomUUID(),
        foodId: food.id,
        quantity,
      })
    }
  })

  return { days: [day], customFoods: [] }
}
