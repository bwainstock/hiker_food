import type {
  Food,
  Nutrition,
  PlannerState,
} from '../types'
import { MEALS } from '../types'
import { EN_US_COLLATOR } from './catalog'
import { EMPTY_NUTRITION, addNutrition } from './nutrition'
import { interpretPlanItems } from './plan-item'

export interface ShoppingRow {
  food: Food
  quantity: number
  itemCount: number
}

export interface UnresolvedShoppingRow {
  foodId: string
  quantity: number
  itemCount: number
  directItemCount: number
  locations: string[]
  recipeSources: {
    id: string
    name: string
  }[]
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
  nutrition: Nutrition
}

export function aggregateShoppingList(
  state: PlannerState,
  foods: readonly Food[],
) {
  const foodsById = new Map(foods.map((food) => [food.id, food]))
  const quantities = new Map<
    string,
    {
      quantity: number
      itemCount: number
      directItemCount: number
      locations: string[]
      recipeSources: {
        id: string
        name: string
      }[]
    }
  >()
  const recipeOnly = new Map<string, RecipeOnlyShoppingRow>()

  const addFoodContribution = (
    foodId: string,
    quantity: number,
    location: string,
    recipeSource?: { id: string; name: string },
  ) => {
    const current = quantities.get(foodId) ?? {
      quantity: 0,
      itemCount: 0,
      directItemCount: 0,
      locations: [],
      recipeSources: [],
    }
    current.quantity += quantity
    current.itemCount += 1
    if (!recipeSource) current.directItemCount += 1
    if (!current.locations.includes(location)) current.locations.push(location)
    if (
      recipeSource &&
      !current.recipeSources.some(({ id }) => id === recipeSource.id)
    ) {
      current.recipeSources.push(recipeSource)
    }
    quantities.set(foodId, current)
  }

  const placements = state.days.flatMap((day) =>
    MEALS.flatMap((meal) =>
      day.meals[meal].map((item) => ({
        item,
        location: `${day.name} · ${meal}`,
      })),
    ),
  )
  const interpretations = interpretPlanItems(
    placements.map(({ item }) => item),
    foods,
    state.recipes,
  )

  interpretations.forEach((interpretation, index) => {
    const { location } = placements[index]
    const recipeSource =
      interpretation.target.kind === 'recipe' && interpretation.label
        ? {
            id: interpretation.target.id,
            name: interpretation.label,
          }
        : undefined

    interpretation.contributions.forEach((contribution) => {
      if (contribution.kind === 'food') {
        addFoodContribution(
          contribution.foodId,
          contribution.quantity,
          location,
          recipeSource,
        )
        return
      }

      const current = recipeOnly.get(contribution.key) ?? {
        recipeId: contribution.recipeId,
        ingredientId: contribution.ingredientId,
        name: contribution.name,
        sourceRecipe: interpretation.label ?? '',
        placementQuantity: 0,
        itemCount: 0,
        weightGrams: 0,
        calories: 0,
        nutrition: { ...EMPTY_NUTRITION },
      }
      current.placementQuantity += interpretation.quantity
      current.itemCount += 1
      current.weightGrams += contribution.weightGrams
      current.calories += contribution.nutrition.calories
      current.nutrition = addNutrition(
        current.nutrition,
        contribution.nutrition,
      )
      recipeOnly.set(contribution.key, current)
    })

    if (
      interpretation.target.kind === 'food' &&
      !interpretation.available
    ) {
      addFoodContribution(
        interpretation.target.id,
        interpretation.quantity,
        location,
      )
    }
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
  const recipeOnlyRows = [...recipeOnly.values()].sort(
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
