import type {
  Food,
  FoodIngredient,
  Nutrition,
  PlanItem,
  PlannerState,
  Recipe,
  RecipeCategory,
  RecipeIngredient,
  RecipeOnlyIngredient,
} from '../types'
import { z } from 'zod'
import {
  EMPTY_NUTRITION,
  ALL_NUTRITION_KNOWN,
  NO_NUTRITION_KNOWN,
  addNutritionSummaries,
  nutritionSummaryForFood,
  round,
  type NutritionSummary,
} from './nutrition'
import { recipeIngredientSchema } from './schemas'

export interface ResolvedRecipe extends NutritionSummary {
  ingredientCount: number
  complete: boolean
  unavailableFoodIds: string[]
  unavailableFoodReferences: FoodIngredient[]
  foodContributions: FoodIngredient[]
  recipeOnlyContributions: RecipeOnlyIngredient[]
}

export interface ResolvedPlanItem extends NutritionSummary {
  kind: PlanItem['target']['kind']
  id: string
  label: string
  complete: boolean
}

export interface ResolvedRecipeIngredient extends NutritionSummary {
  key: string
  kind: RecipeIngredient['kind']
  valid: boolean
  available: boolean
  complete: boolean
}

export interface ResolvedRecipeDraft extends NutritionSummary {
  complete: boolean
  contributions: ResolvedRecipeIngredient[]
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

export function replaceFoodIngredient(
  draft: RecipeDraft,
  oldFoodId: string,
  newFoodId: string,
): RecipeDraft {
  if (oldFoodId === newFoodId) return draft
  const replaced = draft.ingredients.find(
    (ingredient): ingredient is FoodIngredient =>
      ingredient.kind === 'food' && ingredient.foodId === oldFoodId,
  )
  if (!replaced) return draft
  const existing = draft.ingredients.find(
    (ingredient): ingredient is FoodIngredient =>
      ingredient.kind === 'food' && ingredient.foodId === newFoodId,
  )

  return {
    ...draft,
    ingredients: draft.ingredients.flatMap<RecipeIngredient>((ingredient) => {
      if (ingredient.kind !== 'food') return [ingredient]
      if (ingredient.foodId === oldFoodId) {
        return existing ? [] : [{ ...ingredient, foodId: newFoodId }]
      }
      if (ingredient.foodId === newFoodId && existing) {
        return [
          {
            ...ingredient,
            quantity: ingredient.quantity + replaced.quantity,
          },
        ]
      }
      return [ingredient]
    }),
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
        calories: null,
        fat: null,
        carbs: null,
        protein: null,
        fiber: null,
        sugar: null,
        sodium: null,
        potassium: null,
      },
    ],
  }
}

export function updateRecipeOnlyIngredient(
  draft: RecipeDraft,
  ingredientId: string,
  updates: Partial<Omit<RecipeOnlyIngredient, 'kind' | 'id'>>,
  baseline?: RecipeOnlyIngredient,
): RecipeDraft {
  return {
    ...draft,
    ingredients: draft.ingredients.map((ingredient) =>
      ingredient.kind === 'recipe-only' && ingredient.id === ingredientId
        ? updateRecipeOnlyIngredientValues(
            ingredient,
            updates,
            baseline,
          )
        : ingredient,
    ),
  }
}

function updateRecipeOnlyIngredientValues(
  ingredient: RecipeOnlyIngredient,
  updates: Partial<Omit<RecipeOnlyIngredient, 'kind' | 'id'>>,
  baseline = ingredient,
): RecipeOnlyIngredient {
  const nextWeight = updates.weightGrams
  if (
    nextWeight === undefined ||
    !Number.isFinite(nextWeight) ||
    nextWeight <= 0 ||
    !Number.isFinite(baseline.weightGrams) ||
    baseline.weightGrams <= 0
  ) {
    return { ...ingredient, ...updates }
  }

  const ratio = nextWeight / baseline.weightGrams
  const scale = (value: number | null) =>
    value === null ? null : value * ratio
  return {
    ...ingredient,
    calories: scale(baseline.calories),
    fat: scale(baseline.fat),
    carbs: scale(baseline.carbs),
    protein: scale(baseline.protein),
    fiber: scale(baseline.fiber),
    sugar: scale(baseline.sugar),
    sodium: scale(baseline.sodium),
    potassium: scale(baseline.potassium),
    ...updates,
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

export function resolveRecipeDraft(
  draft: RecipeDraft,
  foodsById: ReadonlyMap<string, Food>,
): ResolvedRecipeDraft {
  const contributions = draft.ingredients.map((ingredient) =>
    resolveRecipeIngredient(ingredient, foodsById),
  )
  if (contributions.length === 0) {
    return {
      complete: false,
      nutrition: { ...EMPTY_NUTRITION },
      known: { ...NO_NUTRITION_KNOWN },
      contributions,
    }
  }

  const summary = addNutritionSummaries(
    ...contributions.map(({ nutrition, known }) => ({
      nutrition,
      known,
    })),
  )
  return {
    complete:
      contributions.every((contribution) => contribution.complete) &&
      Object.values(summary.known).every(Boolean),
    nutrition: summary.nutrition,
    known: summary.known,
    contributions,
  }
}

export function resolveRecipeIngredient(
  ingredient: RecipeIngredient,
  foodsById: ReadonlyMap<string, Food>,
): ResolvedRecipeIngredient {
  const valid = recipeIngredientSchema.safeParse(ingredient).success
  const key =
    ingredient.kind === 'food' ? ingredient.foodId : ingredient.id
  if (!valid) {
    return {
      key,
      kind: ingredient.kind,
      valid: false,
      available:
        ingredient.kind === 'recipe-only' ||
        foodsById.has(ingredient.foodId),
      complete: false,
      nutrition: { ...EMPTY_NUTRITION },
      known: { ...NO_NUTRITION_KNOWN },
    }
  }

  if (ingredient.kind === 'food') {
    const food = foodsById.get(ingredient.foodId)
    if (!food) {
      return {
        key,
        kind: ingredient.kind,
        valid: true,
        available: false,
        complete: false,
        nutrition: { ...EMPTY_NUTRITION },
        known: { ...NO_NUTRITION_KNOWN },
      }
    }
    const summary = nutritionSummaryForFood(food, ingredient.quantity)
    return {
      key,
      kind: ingredient.kind,
      valid: true,
      available: true,
      complete: Object.values(summary.known).every(Boolean),
      ...summary,
    }
  }

  const summary = nutritionSummaryForRecipeOnlyIngredient(ingredient)
  return {
    key,
    kind: ingredient.kind,
    valid: true,
    available: true,
    complete: Object.values(summary.known).every(Boolean),
    ...summary,
  }
}

export function formatRecipeCalories(calories: number) {
  return `${round(calories)} kcal`
}

export function resolveRecipe(
  recipe: Recipe,
  foodsById: ReadonlyMap<string, Food>,
): ResolvedRecipe {
  const foodIngredients = recipe.ingredients.filter(
    (ingredient): ingredient is FoodIngredient =>
      ingredient.kind === 'food',
  )
  const resolvedFoods = foodIngredients.flatMap((ingredient) => {
    const food = foodsById.get(ingredient.foodId)
    return food
      ? [nutritionSummaryForFood(food, ingredient.quantity)]
      : []
  })
  const recipeOnlyNutrition = recipe.ingredients.flatMap((ingredient) =>
    ingredient.kind === 'recipe-only'
      ? [nutritionSummaryForRecipeOnlyIngredient(ingredient)]
      : [],
  )
  const resolved = [...resolvedFoods, ...recipeOnlyNutrition]
  const unavailableFoodIds = foodIngredients
    .filter((ingredient) => !foodsById.has(ingredient.foodId))
    .map((ingredient) => ingredient.foodId)
  const unavailableFoodReferences = foodIngredients.filter(
    (ingredient) => !foodsById.has(ingredient.foodId),
  )
  const summary =
    resolved.length === 0
      ? {
          nutrition: { ...EMPTY_NUTRITION },
          known: { ...ALL_NUTRITION_KNOWN },
        }
      : addNutritionSummaries(...resolved)
  if (unavailableFoodIds.length > 0) {
    Object.keys(summary.known).forEach((key) => {
      summary.known[key as keyof Nutrition] = false
    })
  }

  return {
    ingredientCount: recipe.ingredients.length,
    complete: Object.values(summary.known).every(Boolean),
    known: summary.known,
    unavailableFoodIds,
    unavailableFoodReferences,
    foodContributions: foodIngredients,
    recipeOnlyContributions: recipe.ingredients.filter(
      (ingredient): ingredient is RecipeOnlyIngredient =>
        ingredient.kind === 'recipe-only',
    ),
    nutrition: summary.nutrition,
  }
}

export function getRecipePlacementEligibility(
  recipe: Recipe,
  foodsById: ReadonlyMap<string, Food>,
) {
  const unavailableCount =
    resolveRecipe(recipe, foodsById).unavailableFoodReferences.length
  return unavailableCount === 0
    ? { eligible: true, reason: null }
    : {
        eligible: false,
        reason: `Repair ${unavailableCount} unavailable Food ingredient${
          unavailableCount === 1 ? '' : 's'
        } in Recipes before adding.`,
      }
}

export function resolvePlanItem(
  item: PlanItem,
  foodsById: ReadonlyMap<string, Food>,
  recipesById: ReadonlyMap<string, Recipe>,
): ResolvedPlanItem | null {
  if (item.target.kind === 'food') {
    const food = foodsById.get(item.target.id)
    if (!food) return null
    const summary = nutritionSummaryForFood(food, item.quantity)
    return {
      kind: 'food',
      id: food.id,
      label: food.name,
      complete: Object.values(summary.known).every(Boolean),
      ...summary,
    }
  }

  const recipe = recipesById.get(item.target.id)
  if (!recipe) return null
  const resolved = resolveRecipe(recipe, foodsById)
  return {
    kind: 'recipe',
    id: recipe.id,
    label: recipe.name,
    complete: resolved.complete,
    nutrition: scaleNutrition(resolved.nutrition, item.quantity),
    known: resolved.known,
  }
}

export function scaleNutrition(
  nutrition: Nutrition,
  quantity: number,
): Nutrition {
  const safeQuantity =
    Number.isFinite(quantity) && quantity > 0 ? quantity : 0
  return Object.fromEntries(
    Object.entries(nutrition).map(([key, value]) => [
      key,
      value * safeQuantity,
    ]),
  ) as unknown as Nutrition
}

export function nutritionForRecipeOnlyIngredient(
  ingredient: RecipeOnlyIngredient,
): Nutrition {
  return nutritionSummaryForRecipeOnlyIngredient(ingredient).nutrition
}

export function nutritionSummaryForRecipeOnlyIngredient(
  ingredient: RecipeOnlyIngredient,
) {
  return {
    nutrition: {
      calories: ingredient.calories ?? 0,
      weightOz: ingredient.weightGrams / 28.3495,
      weightGrams: ingredient.weightGrams,
      fat: ingredient.fat ?? 0,
      sodium: ingredient.sodium ?? 0,
      potassium: ingredient.potassium ?? 0,
      carbs: ingredient.carbs ?? 0,
      fiber: ingredient.fiber ?? 0,
      sugar: ingredient.sugar ?? 0,
      protein: ingredient.protein ?? 0,
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
