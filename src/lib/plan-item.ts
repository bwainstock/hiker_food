import type {
  Food,
  Nutrition,
  NutritionKnown,
  PlanItem,
  Recipe,
} from '../types'
import {
  EMPTY_NUTRITION,
  ALL_NUTRITION_KNOWN,
  NO_NUTRITION_KNOWN,
  addNutritionSummaries,
  nutritionSummaryForFood,
  type NutritionSummary,
} from './nutrition'

interface PlanItemFoodContribution {
  kind: 'food'
  key: string
  foodId: string
  quantity: number
  available: boolean
}

interface PlanItemRecipeOnlyContribution {
  kind: 'recipe-only'
  key: string
  recipeId: string
  ingredientId: string
  name: string
  weightGrams: number
  nutrition: Nutrition
  known: NutritionKnown
}

type PlanItemContribution =
  | PlanItemFoodContribution
  | PlanItemRecipeOnlyContribution

interface UnavailablePlanItemReference {
  kind: PlanItem['target']['kind']
  id: string
  quantity: number
  recipeId?: string
}

export interface PlanItemInterpretation {
  planItemId: string
  target: PlanItem['target']
  quantity: number
  available: boolean
  label: string | null
  complete: boolean
  nutrition: Nutrition
  known: NutritionKnown
  contributions: PlanItemContribution[]
  unavailableReferences: UnavailablePlanItemReference[]
}

export function interpretPlanItems(
  items: readonly PlanItem[],
  foods: readonly Food[],
  recipes: readonly Recipe[],
): PlanItemInterpretation[] {
  const foodsById = new Map(foods.map((food) => [food.id, food]))
  const recipesById = new Map(recipes.map((recipe) => [recipe.id, recipe]))

  return items.map((item) => {
    if (item.target.kind === 'food') {
      const food = foodsById.get(item.target.id)
      if (food) {
        const summary = nutritionSummaryForFood(food, item.quantity)
        return {
          planItemId: item.id,
          target: { ...item.target },
          quantity: item.quantity,
          available: true,
          label: food.name,
          complete: Object.values(summary.known).every(Boolean),
          ...summary,
          contributions: [
            {
              kind: 'food',
              key: food.id,
              foodId: food.id,
              quantity: safeQuantity(item.quantity),
              available: true,
            },
          ],
          unavailableReferences: [],
        }
      }
    }

    const recipe =
      item.target.kind === 'recipe'
        ? recipesById.get(item.target.id)
        : undefined
    if (recipe) {
      const quantity = safeQuantity(item.quantity)
      const contributions: PlanItemContribution[] = []
      const unavailableReferences: UnavailablePlanItemReference[] = []
      const summaries = recipe.ingredients.map<NutritionSummary>(
        (ingredient) => {
          if (ingredient.kind === 'food') {
            const contributionQuantity = ingredient.quantity * quantity
            const food = foodsById.get(ingredient.foodId)
            contributions.push({
              kind: 'food',
              key: ingredient.foodId,
              foodId: ingredient.foodId,
              quantity: contributionQuantity,
              available: Boolean(food),
            })
            if (!food) {
              unavailableReferences.push({
                kind: 'food',
                id: ingredient.foodId,
                quantity: contributionQuantity,
                recipeId: recipe.id,
              })
              return unknownNutritionSummary()
            }
            return nutritionSummaryForFood(food, contributionQuantity)
          }

          const summary = nutritionSummaryForRecipeOnlyIngredient(
            ingredient,
            quantity,
          )
          contributions.push({
            kind: 'recipe-only',
            key: `${recipe.id}:${ingredient.id}`,
            recipeId: recipe.id,
            ingredientId: ingredient.id,
            name: ingredient.name,
            weightGrams: summary.nutrition.weightGrams,
            ...summary,
          })
          return summary
        },
      )
      const summary =
        summaries.length === 0
          ? {
              nutrition: { ...EMPTY_NUTRITION },
              known: { ...ALL_NUTRITION_KNOWN },
            }
          : addNutritionSummaries(...summaries)

      return {
        planItemId: item.id,
        target: { ...item.target },
        quantity: item.quantity,
        available: true,
        label: recipe.name,
        complete: Object.values(summary.known).every(Boolean),
        ...summary,
        contributions,
        unavailableReferences,
      }
    }

    return {
      planItemId: item.id,
      target: { ...item.target },
      quantity: item.quantity,
      available: false,
      label: null,
      complete: false,
      nutrition: { ...EMPTY_NUTRITION },
      known: { ...NO_NUTRITION_KNOWN },
      contributions: [],
      unavailableReferences: [{
        kind: item.target.kind,
        id: item.target.id,
        quantity: item.quantity,
      }],
    }
  })
}

function safeQuantity(quantity: number) {
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 0
}

function unknownNutritionSummary(): NutritionSummary {
  return {
    nutrition: { ...EMPTY_NUTRITION },
    known: { ...NO_NUTRITION_KNOWN },
  }
}

function nutritionSummaryForRecipeOnlyIngredient(
  ingredient: Recipe['ingredients'][number] & { kind: 'recipe-only' },
  quantity: number,
): NutritionSummary {
  const scale = (value: number | null) => (value ?? 0) * quantity
  return {
    nutrition: {
      calories: scale(ingredient.calories),
      weightOz: (ingredient.weightGrams / 28.3495) * quantity,
      weightGrams: ingredient.weightGrams * quantity,
      fat: scale(ingredient.fat),
      sodium: scale(ingredient.sodium),
      potassium: scale(ingredient.potassium),
      carbs: scale(ingredient.carbs),
      fiber: scale(ingredient.fiber),
      sugar: scale(ingredient.sugar),
      protein: scale(ingredient.protein),
    },
    known: {
      calories: ingredient.calories !== null,
      weightOz: true,
      weightGrams: true,
      fat: ingredient.fat !== null,
      sodium: ingredient.sodium !== null,
      potassium: ingredient.potassium !== null,
      carbs: ingredient.carbs !== null,
      fiber: ingredient.fiber !== null,
      sugar: ingredient.sugar !== null,
      protein: ingredient.protein !== null,
    },
  }
}
