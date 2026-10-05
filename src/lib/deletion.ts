import { MEALS, type PlannerState } from '../types'

export interface RecipeDeletionImpact {
  planItemCount: number
}

export interface CustomFoodDeletionImpact {
  planItemCount: number
  recipeIngredientCount: number
}

function countTargetedPlanItems(
  state: PlannerState,
  kind: 'food' | 'recipe',
  id: string,
) {
  return state.days.reduce(
    (dayTotal, day) =>
      dayTotal +
      MEALS.reduce(
        (mealTotal, meal) =>
          mealTotal +
          day.meals[meal].filter(
            (item) =>
              item.target.kind === kind && item.target.id === id,
          ).length,
        0,
      ),
    0,
  )
}

function removeTargetedPlanItems(
  state: PlannerState,
  kind: 'food' | 'recipe',
  id: string,
) {
  return state.days.map((day) => ({
    ...day,
    meals: Object.fromEntries(
      MEALS.map((meal) => [
        meal,
        day.meals[meal].filter(
          (item) =>
            item.target.kind !== kind || item.target.id !== id,
        ),
      ]),
    ) as typeof day.meals,
  }))
}

export function analyzeRecipeDeletion(
  state: PlannerState,
  recipeId: string,
): RecipeDeletionImpact {
  return {
    planItemCount: countTargetedPlanItems(state, 'recipe', recipeId),
  }
}

export function deleteRecipe(
  state: PlannerState,
  recipeId: string,
): PlannerState {
  return {
    ...state,
    days: removeTargetedPlanItems(state, 'recipe', recipeId),
    recipes: state.recipes.filter((recipe) => recipe.id !== recipeId),
  }
}

export function analyzeCustomFoodDeletion(
  state: PlannerState,
  foodId: string,
): CustomFoodDeletionImpact {
  return {
    planItemCount: countTargetedPlanItems(state, 'food', foodId),
    recipeIngredientCount: state.recipes.reduce(
      (total, recipe) =>
        total +
        recipe.ingredients.filter(
          (ingredient) =>
            ingredient.kind === 'food' && ingredient.foodId === foodId,
        ).length,
      0,
    ),
  }
}

export function deleteCustomFood(
  state: PlannerState,
  foodId: string,
): PlannerState {
  return {
    ...state,
    days: removeTargetedPlanItems(state, 'food', foodId),
    customFoods: state.customFoods.filter((food) => food.id !== foodId),
  }
}
