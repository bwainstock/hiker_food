import type {
  Food,
  FoodRecipeIngredient,
  Nutrition,
  PlannerState,
  Recipe,
} from '../types'
import { z } from 'zod'
import {
  EMPTY_NUTRITION,
  addNutrition,
  nutritionForFood,
} from './nutrition'
import { planItemQuantitySchema } from './schemas'

export interface ResolvedFoodRecipe {
  ingredientCount: number
  complete: boolean
  nutrition: Nutrition
}

export interface RecipeDraft {
  id: string | null
  name: string
  ingredients: FoodRecipeIngredient[]
}

const recipeDraftSchema = z
  .object({
    id: z.string().min(1).nullable(),
    name: z.string().trim().min(1, 'Enter a Recipe name.'),
    ingredients: z
      .array(
        z
          .object({
            kind: z.literal('food'),
            foodId: z.string().min(1),
            quantity: planItemQuantitySchema,
          })
          .strict(),
      )
      .min(1, 'Add at least one Food ingredient.'),
  })
  .strict()

export function validateRecipeDraft(draft: RecipeDraft) {
  return recipeDraftSchema.safeParse(draft)
}

export function createRecipeDraft(recipe?: Recipe): RecipeDraft {
  return {
    id: recipe?.id ?? null,
    name: recipe?.name ?? '',
    ingredients:
      recipe?.ingredients.flatMap((ingredient) =>
        ingredient.kind === 'food' ? [{ ...ingredient }] : [],
      ) ?? [],
  }
}

export function addFoodIngredient(
  draft: RecipeDraft,
  foodId: string,
): RecipeDraft {
  const existing = draft.ingredients.find(
    (ingredient) => ingredient.foodId === foodId,
  )
  return {
    ...draft,
    ingredients: existing
      ? draft.ingredients.map((ingredient) =>
          ingredient.foodId === foodId
            ? { ...ingredient, quantity: ingredient.quantity + 1 }
            : ingredient,
        )
      : [
          ...draft.ingredients,
          { kind: 'food', foodId, quantity: 1 },
        ],
  }
}

export function updateFoodIngredientQuantity(
  draft: RecipeDraft,
  foodId: string,
  quantity: number,
): RecipeDraft {
  return {
    ...draft,
    ingredients: draft.ingredients.map((ingredient) =>
      ingredient.foodId === foodId
        ? { ...ingredient, quantity }
        : ingredient,
    ),
  }
}

export function removeFoodIngredient(
  draft: RecipeDraft,
  foodId: string,
): RecipeDraft {
  return {
    ...draft,
    ingredients: draft.ingredients.filter(
      (ingredient) => ingredient.foodId !== foodId,
    ),
  }
}

export function saveRecipeDraft(
  state: PlannerState,
  draft: RecipeDraft,
  createId: () => string,
): PlannerState {
  const validDraft = recipeDraftSchema.parse(draft)
  const recipe: Recipe = {
    id: validDraft.id ?? createId(),
    name: validDraft.name,
    category: null,
    instructions: null,
    ingredients: validDraft.ingredients,
  }
  const existing = state.recipes.some(
    (candidate) => candidate.id === recipe.id,
  )
  return {
    ...state,
    recipes: existing
      ? state.recipes.map((candidate) =>
          candidate.id === recipe.id ? recipe : candidate,
        )
      : [...state.recipes, recipe],
  }
}

export function resolveFoodRecipe(
  recipe: Recipe,
  foodsById: ReadonlyMap<string, Food>,
): ResolvedFoodRecipe {
  const ingredients = recipe.ingredients.filter(
    (ingredient): ingredient is FoodRecipeIngredient =>
      ingredient.kind === 'food',
  )
  const resolved = ingredients.flatMap((ingredient) => {
    const food = foodsById.get(ingredient.foodId)
    return food
      ? [nutritionForFood(food, ingredient.quantity)]
      : []
  })

  return {
    ingredientCount: ingredients.length,
    complete: resolved.length === ingredients.length,
    nutrition:
      resolved.length === 0
        ? { ...EMPTY_NUTRITION }
        : addNutrition(...resolved),
  }
}
