import electrolyteData from './data/electrolytes.json'
import foodData from './data/foods.json'
import { EN_US_COLLATOR } from './lib/catalog'
import {
  electrolyteCatalogSchema,
  foodCatalogSchema,
} from './lib/schemas'

export const BUILT_IN_FOODS = foodCatalogSchema.parse(foodData)
export const ELECTROLYTES = electrolyteCatalogSchema.parse(electrolyteData)

export const FOOD_CATEGORIES = Array.from(
  new Set(
    BUILT_IN_FOODS.map((food) => food.category).filter(
      (category): category is string => Boolean(category),
    ),
  ),
).sort((a, b) => EN_US_COLLATOR.compare(a, b))
