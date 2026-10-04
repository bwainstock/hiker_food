import electrolyteData from './data/electrolytes.json'
import foodData from './data/foods.json'
import type { Electrolyte, Food } from './types'

export const BUILT_IN_FOODS = foodData as Food[]
export const ELECTROLYTES = electrolyteData as Electrolyte[]

export const FOOD_CATEGORIES = Array.from(
  new Set(
    BUILT_IN_FOODS.map((food) => food.category).filter(
      (category): category is string => Boolean(category),
    ),
  ),
).sort((a, b) => a.localeCompare(b))
