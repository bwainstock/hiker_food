import { z } from 'zod'
import { MEALS, RECIPE_CATEGORIES } from '../types'

const finiteNumber = z.number().finite()
const nullableFiniteNumber = finiteNumber.nullable()
const nullableNonnegativeNumber = finiteNumber.nonnegative().nullable()
const nonemptyString = z
  .string()
  .min(1)
  .refine((value) => value.trim().length > 0, 'Must not be blank.')
const trimmedNonemptyString = z.string().trim().min(1)
const ratioValue = z.union([finiteNumber, z.string(), z.null()])

export const foodSchema = z
  .object({
    id: nonemptyString,
    brand: z.string().nullable(),
    flavor: z.string().nullable(),
    name: nonemptyString,
    category: z.string().nullable(),
    prep: z.string().nullable(),
    servings: nullableFiniteNumber,
    servingOz: nullableFiniteNumber,
    servingGrams: nullableFiniteNumber,
    calories: nullableFiniteNumber,
    fat: nullableFiniteNumber,
    sodium: nullableFiniteNumber,
    potassium: nullableFiniteNumber,
    carbs: nullableFiniteNumber,
    fiber: nullableFiniteNumber,
    sugar: nullableFiniteNumber,
    otherCarbs: nullableFiniteNumber,
    protein: nullableFiniteNumber,
    caloriesPerOz: nullableFiniteNumber,
    caloriesPerGram: nullableFiniteNumber,
    carbProteinRatio: ratioValue,
    fatCalorieFraction: ratioValue,
    sugarCalorieFraction: ratioValue,
    sodiumPerCalorie: ratioValue,
    caloriesPerContainer: nullableFiniteNumber,
    custom: z.boolean().optional(),
  })
  .strict()

export const electrolyteSchema = z
  .object({
    id: nonemptyString,
    brand: nonemptyString,
    flavor: z.union([z.string(), finiteNumber, z.null()]),
    fluidOz: nullableFiniteNumber,
    servingGrams: nullableFiniteNumber,
    calories: nullableFiniteNumber,
    fat: nullableFiniteNumber,
    carbs: nullableFiniteNumber,
    fiber: nullableFiniteNumber,
    sugar: nullableFiniteNumber,
    otherCarbs: nullableFiniteNumber,
    protein: nullableFiniteNumber,
    sodium: nullableFiniteNumber,
    potassium: nullableFiniteNumber,
    calcium: nullableFiniteNumber,
    magnesium: nullableFiniteNumber,
    chloride: nullableFiniteNumber,
    sodiumPotassiumRatio: nullableFiniteNumber,
    caffeine: nullableFiniteNumber,
    micros: z.string().nullable(),
  })
  .strict()

// Legacy custom-Food drafts allowed either label to be absent and serving
// weight to be zero. Persisted v0/v1 state keeps that narrow compatibility
// contract verbatim; new drafts remain strict in customFoodInputSchema.
const persistedCustomFoodCompatibilitySchema = foodSchema.extend({
  id: nonemptyString.startsWith(
    'custom-',
    'Custom Food IDs must start with "custom-".',
  ),
  brand: trimmedNonemptyString.nullable(),
  flavor: trimmedNonemptyString.nullable(),
  servings: finiteNumber.positive(),
  servingOz: finiteNumber.nonnegative(),
  servingGrams: finiteNumber.nonnegative(),
  calories: finiteNumber.nonnegative(),
  fat: finiteNumber.nonnegative(),
  sodium: finiteNumber.nonnegative(),
  potassium: finiteNumber.nonnegative(),
  carbs: finiteNumber.nonnegative(),
  fiber: finiteNumber.nonnegative(),
  sugar: finiteNumber.nonnegative(),
  otherCarbs: finiteNumber.nonnegative(),
  protein: finiteNumber.nonnegative(),
  caloriesPerOz: nullableNonnegativeNumber,
  caloriesPerGram: nullableNonnegativeNumber,
  carbProteinRatio: nullableNonnegativeNumber,
  fatCalorieFraction: nullableNonnegativeNumber,
  sugarCalorieFraction: nullableNonnegativeNumber,
  sodiumPerCalorie: nullableNonnegativeNumber,
  caloriesPerContainer: finiteNumber.nonnegative(),
  custom: z.literal(true),
})

export function isTenthStepQuantity(quantity: number) {
  if (!Number.isFinite(quantity)) return false
  const scaled = quantity * 10
  return Math.abs(scaled - Math.round(scaled)) <= 1e-9
}

export const planItemQuantitySchema = finiteNumber
  .positive('Enter a quantity greater than 0.')
  .refine(
    isTenthStepQuantity,
    'Enter a quantity in increments of 0.1.',
  )

const foodIngredientSchema = z
  .object({
    kind: z.literal('food'),
    foodId: nonemptyString,
    quantity: planItemQuantitySchema,
  })
  .strict()

const recipeOnlyIngredientSchema = z
  .object({
    kind: z.literal('recipe-only'),
    id: nonemptyString,
    name: nonemptyString,
    weightGrams: finiteNumber.positive('Enter a weight greater than 0.'),
    calories: finiteNumber.nonnegative(),
    fat: finiteNumber.nonnegative(),
    carbs: finiteNumber.nonnegative(),
    protein: finiteNumber.nonnegative(),
    fiber: finiteNumber.nonnegative().default(0),
    sugar: finiteNumber.nonnegative().default(0),
    sodium: finiteNumber.nonnegative().default(0),
    potassium: finiteNumber.nonnegative().default(0),
  })
  .strict()

export const recipeIngredientSchema = z.discriminatedUnion('kind', [
  foodIngredientSchema,
  recipeOnlyIngredientSchema,
])

export const recipeSchema = z
  .object({
    id: nonemptyString,
    name: nonemptyString,
    category: z.enum(RECIPE_CATEGORIES).nullable().default(null),
    instructions: z.string().nullable().default(null),
    ingredients: z.array(recipeIngredientSchema).min(1),
  })
  .strict()
  .superRefine((recipe, context) => {
    const foodIds = new Set<string>()
    const recipeOnlyIds = new Set<string>()
    recipe.ingredients.forEach((ingredient, ingredientIndex) => {
      if (ingredient.kind === 'food') {
        if (foodIds.has(ingredient.foodId)) {
          context.addIssue({
            code: 'custom',
            path: ['ingredients', ingredientIndex, 'foodId'],
            message: `Duplicate Food ingredient ID "${ingredient.foodId}".`,
          })
        }
        foodIds.add(ingredient.foodId)
        return
      }

      if (recipeOnlyIds.has(ingredient.id)) {
        context.addIssue({
          code: 'custom',
          path: ['ingredients', ingredientIndex, 'id'],
          message: `Duplicate Recipe-only ingredient ID "${ingredient.id}".`,
        })
      }
      recipeOnlyIds.add(ingredient.id)
    })
  })

export const planItemSchema = z
  .object({
    id: nonemptyString,
    target: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('food'), id: nonemptyString }).strict(),
      z.object({ kind: z.literal('recipe'), id: nonemptyString }).strict(),
    ]),
    quantity: planItemQuantitySchema,
  })
  .strict()

const mealShape = Object.fromEntries(
  MEALS.map((meal) => [meal, z.array(planItemSchema)]),
) as Record<(typeof MEALS)[number], z.ZodArray<typeof planItemSchema>>

export const dayPlanSchema = z
  .object({
    id: nonemptyString,
    name: z.string(),
    meals: z.object(mealShape).strict(),
  })
  .strict()

const legacyPlanItemSchema = z
  .object({
    id: nonemptyString,
    foodId: nonemptyString,
    quantity: planItemQuantitySchema,
  })
  .strict()

const legacyMealShape = Object.fromEntries(
  MEALS.map((meal) => [meal, z.array(legacyPlanItemSchema)]),
) as Record<
  (typeof MEALS)[number],
  z.ZodArray<typeof legacyPlanItemSchema>
>

const legacyDayPlanSchema = z
  .object({
    id: nonemptyString,
    name: z.string(),
    meals: z.object(legacyMealShape).strict(),
  })
  .strict()

export const legacyPlannerStateSchema = z
  .object({
    days: z.array(legacyDayPlanSchema).min(1),
    customFoods: z.array(persistedCustomFoodCompatibilitySchema),
  })
  .strict()
  .superRefine((state, context) => {
    const dayIds = new Set<string>()
    const itemIds = new Set<string>()
    const customFoodIds = new Set<string>()

    state.days.forEach((day, dayIndex) => {
      if (dayIds.has(day.id)) {
        context.addIssue({
          code: 'custom',
          path: ['days', dayIndex, 'id'],
          message: `Duplicate Trail day ID "${day.id}".`,
        })
      }
      dayIds.add(day.id)

      MEALS.forEach((meal) => {
        day.meals[meal].forEach((item, itemIndex) => {
          if (itemIds.has(item.id)) {
            context.addIssue({
              code: 'custom',
              path: ['days', dayIndex, 'meals', meal, itemIndex, 'id'],
              message: `Duplicate Plan item ID "${item.id}".`,
            })
          }
          itemIds.add(item.id)
        })
      })
    })

    state.customFoods.forEach((food, foodIndex) => {
      if (customFoodIds.has(food.id)) {
        context.addIssue({
          code: 'custom',
          path: ['customFoods', foodIndex, 'id'],
          message: `Duplicate custom Food ID "${food.id}".`,
        })
      }
      customFoodIds.add(food.id)
    })
  })

export const plannerStateSchema = z
  .object({
    days: z.array(dayPlanSchema).min(1, 'A plan must have at least one Trail day.'),
    customFoods: z.array(persistedCustomFoodCompatibilitySchema),
    recipes: z.array(recipeSchema),
  })
  .strict()
  .superRefine((state, context) => {
    const dayIds = new Set<string>()
    const itemIds = new Set<string>()
    const customFoodIds = new Set<string>()
    const recipeIds = new Set<string>()

    state.days.forEach((day, dayIndex) => {
      if (dayIds.has(day.id)) {
        context.addIssue({
          code: 'custom',
          path: ['days', dayIndex, 'id'],
          message: `Duplicate Trail day ID "${day.id}".`,
        })
      }
      dayIds.add(day.id)

      MEALS.forEach((meal) => {
        day.meals[meal].forEach((item, itemIndex) => {
          if (itemIds.has(item.id)) {
            context.addIssue({
              code: 'custom',
              path: ['days', dayIndex, 'meals', meal, itemIndex, 'id'],
              message: `Duplicate Plan item ID "${item.id}".`,
            })
          }
          itemIds.add(item.id)
        })
      })
    })

    state.customFoods.forEach((food, foodIndex) => {
      if (customFoodIds.has(food.id)) {
        context.addIssue({
          code: 'custom',
          path: ['customFoods', foodIndex, 'id'],
          message: `Duplicate custom Food ID "${food.id}".`,
        })
      }
      customFoodIds.add(food.id)
    })

    state.recipes.forEach((recipe, recipeIndex) => {
      if (recipeIds.has(recipe.id)) {
        context.addIssue({
          code: 'custom',
          path: ['recipes', recipeIndex, 'id'],
          message: `Duplicate Recipe ID "${recipe.id}".`,
        })
      }
      recipeIds.add(recipe.id)
    })

    state.days.forEach((day, dayIndex) => {
      MEALS.forEach((meal) => {
        day.meals[meal].forEach((item, itemIndex) => {
          if (
            item.target.kind === 'recipe' &&
            !recipeIds.has(item.target.id)
          ) {
            context.addIssue({
              code: 'custom',
              path: [
                'days',
                dayIndex,
                'meals',
                meal,
                itemIndex,
                'target',
                'id',
              ],
              message: `Recipe target "${item.target.id}" is not available.`,
            })
          }
        })
      })
    })
  })

export const portableBackupV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    state: legacyPlannerStateSchema,
  })
  .strict()

export const portableBackupV2Schema = z
  .object({
    schemaVersion: z.literal(2),
    state: plannerStateSchema,
  })
  .strict()

function uniqueCatalogIds<T extends { id: string }>(
  values: T[],
  context: z.RefinementCtx,
) {
  const ids = new Set<string>()
  values.forEach((value, index) => {
    if (ids.has(value.id)) {
      context.addIssue({
        code: 'custom',
        path: [index, 'id'],
        message: `Duplicate catalog ID "${value.id}".`,
      })
    }
    ids.add(value.id)
  })
}

export const foodCatalogSchema = z
  .array(foodSchema)
  .superRefine(uniqueCatalogIds)
export const electrolyteCatalogSchema = z
  .array(electrolyteSchema)
  .superRefine(uniqueCatalogIds)
