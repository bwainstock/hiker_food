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
  foodId: string
  quantity: number
}

export interface DayPlan {
  id: string
  name: string
  meals: Record<MealName, PlanItem[]>
}

export interface PlannerState {
  days: DayPlan[]
  customFoods: Food[]
}

export interface PortableBackupV1 {
  schemaVersion: 1
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
  | 'electrolytes'
  | 'sodium'
  | 'guide'
