import type {
  Food,
  FoodRecipeIngredient,
  Nutrition,
  PlannerState,
  Recipe,
  RecipeCategory,
  RecipeIngredient,
  RecipeOnlyIngredient,
} from '../types'
import { z } from 'zod'
import {
  EMPTY_NUTRITION,
  addNutrition,
  nutritionForFood,
  round,
} from './nutrition'
import { recipeIngredientSchema } from './schemas'

export interface ResolvedFoodRecipe {
  ingredientCount: number
  complete: boolean
  nutrition: Nutrition
}

export interface RecipeDraft {
  id: string | null
  name: string
  category: RecipeCategory | null
  instructions: string
  ingredients: RecipeIngredient[]
}

const recipeDraftSchema = z
  .object({
    id: z.string().min(1).nullable(),
    name: z.string().trim().min(1, 'Enter a Recipe name.'),
    category: z.enum([
      'Breakfast',
      'Lunch',
      'Dinner',
      'Snack',
      'Dessert',
      'Other',
    ]).nullable(),
    instructions: z.string(),
    ingredients: z
      .array(recipeIngredientSchema)
      .min(1, 'Add at least one ingredient.'),
  })
  .strict()

export function validateRecipeDraft(draft: RecipeDraft) {
  return recipeDraftSchema.safeParse(draft)
}

export function createRecipeDraft(recipe?: Recipe): RecipeDraft {
  return {
    id: recipe?.id ?? null,
    name: recipe?.name ?? '',
    category: recipe?.category ?? null,
    instructions: recipe?.instructions ?? '',
    ingredients: recipe?.ingredients.map((ingredient) => ({ ...ingredient })) ?? [],
  }
}

export function addFoodIngredient(
  draft: RecipeDraft,
  foodId: string,
): RecipeDraft {
  const existing = draft.ingredients.find(
    (ingredient) =>
      ingredient.kind === 'food' && ingredient.foodId === foodId,
  )
  return {
    ...draft,
    ingredients: existing
      ? draft.ingredients.map((ingredient) =>
          ingredient.kind === 'food' && ingredient.foodId === foodId
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
      ingredient.kind === 'food' && ingredient.foodId === foodId
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
      (ingredient) =>
        ingredient.kind !== 'food' || ingredient.foodId !== foodId,
    ),
  }
}

export function addRecipeOnlyIngredient(
  draft: RecipeDraft,
  createId: () => string,
): RecipeDraft {
  return {
    ...draft,
    ingredients: [
      ...draft.ingredients,
      {
        kind: 'recipe-only',
        id: createId(),
        name: '',
        weightGrams: 0,
        calories: 0,
        fat: 0,
        carbs: 0,
        protein: 0,
        fiber: 0,
        sugar: 0,
        sodium: 0,
        potassium: 0,
      },
    ],
  }
}

export function updateRecipeOnlyIngredient(
  draft: RecipeDraft,
  ingredientId: string,
  updates: Partial<Omit<RecipeOnlyIngredient, 'kind' | 'id'>>,
): RecipeDraft {
  return {
    ...draft,
    ingredients: draft.ingredients.map((ingredient) =>
      ingredient.kind === 'recipe-only' && ingredient.id === ingredientId
        ? { ...ingredient, ...updates }
        : ingredient,
    ),
  }
}

export function removeRecipeOnlyIngredient(
  draft: RecipeDraft,
  ingredientId: string,
): RecipeDraft {
  return {
    ...draft,
    ingredients: draft.ingredients.filter(
      (ingredient) =>
        ingredient.kind !== 'recipe-only' ||
        ingredient.id !== ingredientId,
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
    category: validDraft.category,
    instructions: validDraft.instructions.trim() || null,
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

export function filterRecipes(
  recipes: Recipe[],
  foodsById: ReadonlyMap<string, Food>,
  query: string,
  category: RecipeCategory | null,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase('en-US')
  return recipes.filter((recipe) => {
    if (category && recipe.category !== category) return false
    if (!normalizedQuery) return true
    const searchable = [
      recipe.name,
      recipe.category ?? '',
      recipe.instructions ?? '',
      ...recipe.ingredients.map((ingredient) =>
        ingredient.kind === 'food'
          ? foodsById.get(ingredient.foodId)?.name ?? ingredient.foodId
          : ingredient.name,
      ),
    ]
    return searchable.some((value) =>
      value.toLocaleLowerCase('en-US').includes(normalizedQuery),
    )
  })
}

export function formatRecipeCalories(calories: number) {
  return `${round(calories)} kcal`
}

export function resolveFoodRecipe(
  recipe: Recipe,
  foodsById: ReadonlyMap<string, Food>,
): ResolvedFoodRecipe {
  const foodIngredients = recipe.ingredients.filter(
    (ingredient): ingredient is FoodRecipeIngredient =>
      ingredient.kind === 'food',
  )
  const resolvedFoods = foodIngredients.flatMap((ingredient) => {
    const food = foodsById.get(ingredient.foodId)
    return food
      ? [nutritionForFood(food, ingredient.quantity)]
      : []
  })
  const recipeOnlyNutrition = recipe.ingredients.flatMap((ingredient) =>
    ingredient.kind === 'recipe-only'
      ? [nutritionForRecipeOnlyIngredient(ingredient)]
      : [],
  )
  const resolved = [...resolvedFoods, ...recipeOnlyNutrition]

  return {
    ingredientCount: recipe.ingredients.length,
    complete: resolvedFoods.length === foodIngredients.length,
    nutrition:
      resolved.length === 0
        ? { ...EMPTY_NUTRITION }
        : addNutrition(...resolved),
  }
}

function nutritionForRecipeOnlyIngredient(
  ingredient: RecipeOnlyIngredient,
): Nutrition {
  return {
    calories: ingredient.calories,
    weightOz: ingredient.weightGrams / 28.3495,
    weightGrams: ingredient.weightGrams,
    fat: ingredient.fat,
    sodium: ingredient.sodium,
    potassium: ingredient.potassium,
    carbs: ingredient.carbs,
    fiber: ingredient.fiber,
    sugar: ingredient.sugar,
    protein: ingredient.protein,
  }
}
