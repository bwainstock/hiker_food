import type {
  Food,
  PlannerState,
  RecipeOnlyIngredient,
} from '../types'
import { MEALS } from '../types'
import { EN_US_COLLATOR } from './catalog'
import { resolveFoodRecipe } from './recipe'

export interface ShoppingRow {
  food: Food
  quantity: number
  itemCount: number
}

export interface UnresolvedShoppingRow {
  foodId: string
  quantity: number
  itemCount: number
  locations: string[]
  recipeSources: string[]
}

export interface RecipeOnlyShoppingRow {
  recipeId: string
  ingredientId: string
  name: string
  sourceRecipe: string
  placementQuantity: number
  itemCount: number
  weightGrams: number
  calories: number
  ingredient: RecipeOnlyIngredient
}

export function aggregateShoppingList(
  state: PlannerState,
  foodsById: ReadonlyMap<string, Food>,
) {
  const quantities = new Map<
    string,
    {
      quantity: number
      itemCount: number
      locations: string[]
      recipeSources: string[]
    }
  >()
  const recipeOnly = new Map<
    string,
    Omit<RecipeOnlyShoppingRow, 'weightGrams' | 'calories'>
  >()
  const recipesById = new Map(state.recipes.map((recipe) => [recipe.id, recipe]))

  const addFoodContribution = (
    foodId: string,
    quantity: number,
    location: string,
    recipeSource?: string,
  ) => {
    const current = quantities.get(foodId) ?? {
      quantity: 0,
      itemCount: 0,
      locations: [],
      recipeSources: [],
    }
    current.quantity += quantity
    current.itemCount += 1
    if (!current.locations.includes(location)) current.locations.push(location)
    if (
      recipeSource &&
      !current.recipeSources.includes(recipeSource)
    ) {
      current.recipeSources.push(recipeSource)
    }
    quantities.set(foodId, current)
  }

  state.days.forEach((day) => {
    MEALS.forEach((meal) => {
      day.meals[meal].forEach((item) => {
        const location = `${day.name} · ${meal}`
        if (item.target.kind === 'food') {
          addFoodContribution(item.target.id, item.quantity, location)
          return
        }
        const recipe = recipesById.get(item.target.id)
        if (!recipe) return
        const resolved = resolveFoodRecipe(recipe, foodsById)
        resolved.foodContributions.forEach((ingredient) =>
          addFoodContribution(
            ingredient.foodId,
            ingredient.quantity * item.quantity,
            location,
            recipe.name,
          ),
        )
        resolved.recipeOnlyContributions.forEach((ingredient) => {
          const key = `${recipe.id}:${ingredient.id}`
          const current = recipeOnly.get(key) ?? {
            recipeId: recipe.id,
            ingredientId: ingredient.id,
            name: ingredient.name,
            sourceRecipe: recipe.name,
            placementQuantity: 0,
            itemCount: 0,
            ingredient,
          }
          current.placementQuantity += item.quantity
          current.itemCount += 1
          recipeOnly.set(key, current)
        })
      })
    })
  })

  const rows: ShoppingRow[] = []
  const unresolved: UnresolvedShoppingRow[] = []

  quantities.forEach((entry, foodId) => {
    const food = foodsById.get(foodId)
    if (food) {
      rows.push({ food, quantity: entry.quantity, itemCount: entry.itemCount })
    } else {
      unresolved.push({ foodId, ...entry })
    }
  })

  rows.sort(
    (a, b) =>
      EN_US_COLLATOR.compare(
        a.food.category ?? 'Uncategorized',
        b.food.category ?? 'Uncategorized',
      ) ||
      EN_US_COLLATOR.compare(a.food.name, b.food.name) ||
      EN_US_COLLATOR.compare(a.food.id, b.food.id),
  )
  unresolved.sort((a, b) => EN_US_COLLATOR.compare(a.foodId, b.foodId))
  const recipeOnlyRows = [...recipeOnly.values()]
    .map((row) => ({
      ...row,
      weightGrams: row.ingredient.weightGrams * row.placementQuantity,
      calories: row.ingredient.calories * row.placementQuantity,
    }))
    .sort(
      (a, b) =>
        EN_US_COLLATOR.compare(a.sourceRecipe, b.sourceRecipe) ||
        EN_US_COLLATOR.compare(a.name, b.name) ||
        EN_US_COLLATOR.compare(a.ingredientId, b.ingredientId),
    )

  return {
    complete: unresolved.length === 0,
    rows,
    recipeOnlyRows,
    unresolved,
  }
}
