export type NullableNumber = number | null

export interface Food {
  id: string
  brand: string | null
  flavor: string | null
  name: string
  category: string | null
  prep: string | null
  servings: NullableNumber
  servingOz: NullableNumber
  servingGrams: NullableNumber
  calories: NullableNumber
  fat: NullableNumber
  sodium: NullableNumber
  potassium: NullableNumber
  carbs: NullableNumber
  fiber: NullableNumber
  sugar: NullableNumber
  otherCarbs: NullableNumber
  protein: NullableNumber
  caloriesPerOz: NullableNumber
  caloriesPerGram: NullableNumber
  carbProteinRatio: number | string | null
  fatCalorieFraction: number | string | null
  sugarCalorieFraction: number | string | null
  sodiumPerCalorie: number | string | null
  caloriesPerContainer: NullableNumber
  custom?: boolean
}

export interface Electrolyte {
  id: string
  brand: string
  flavor: string | number | null
  fluidOz: NullableNumber
  servingGrams: NullableNumber
  calories: NullableNumber
  fat: NullableNumber
  carbs: NullableNumber
  fiber: NullableNumber
  sugar: NullableNumber
  otherCarbs: NullableNumber
  protein: NullableNumber
  sodium: NullableNumber
  potassium: NullableNumber
  calcium: NullableNumber
  magnesium: NullableNumber
  chloride: NullableNumber
  sodiumPotassiumRatio: NullableNumber
  caffeine: NullableNumber
  micros: string | null
}

export const MEALS = [
  'Breakfast',
  'Morning snacks',
  'Lunch',
  'Afternoon snacks',
  'Recovery',
  'Dinner',
  'Dessert',
] as const

export type MealName = (typeof MEALS)[number]

export interface PlanItem {
  id: string
  target:
    | { kind: 'food'; id: string }
    | { kind: 'recipe'; id: string }
  quantity: number
}

export interface DayPlan {
  id: string
  name: string
  meals: Record<MealName, PlanItem[]>
}

export const RECIPE_CATEGORIES = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Snack',
  'Dessert',
  'Other',
] as const

export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number]

export interface FoodRecipeIngredient {
  kind: 'food'
  foodId: string
  quantity: number
}

export interface RecipeOnlyIngredient {
  kind: 'recipe-only'
  id: string
  name: string
  weightGrams: number
  calories: number
  fat: number
  carbs: number
  protein: number
  fiber: number
  sugar: number
  sodium: number
  potassium: number
}

export type RecipeIngredient =
  | FoodRecipeIngredient
  | RecipeOnlyIngredient

export interface Recipe {
  id: string
  name: string
  category: RecipeCategory | null
  instructions: string | null
  ingredients: RecipeIngredient[]
}

export interface PlannerState {
  days: DayPlan[]
  customFoods: Food[]
  recipes: Recipe[]
}

export interface PortableBackupV2 {
  schemaVersion: 2
  state: PlannerState
}

export interface Nutrition {
  calories: number
  weightOz: number
  weightGrams: number
  fat: number
  sodium: number
  potassium: number
  carbs: number
  fiber: number
  sugar: number
  protein: number
}

export type PlannerStateUpdater = (
  updater: (state: PlannerState) => PlannerState,
) => void

export type Route =
  | 'planner'
  | 'shopping'
  | 'foods'
  | 'recipes'
  | 'electrolytes'
  | 'sodium'
  | 'guide'
