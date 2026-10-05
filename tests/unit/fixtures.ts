import type {
  DayPlan,
  Electrolyte,
  Food,
  Nutrition,
  PlannerState,
  Recipe,
} from '../../src/types'
import { createEmptyMeals } from '../../src/lib/planner'

export function makeFood(overrides: Partial<Food> = {}): Food {
  return {
    id: 'food-1',
    brand: 'Trail Test',
    flavor: 'Original',
    name: 'Trail Test Original',
    category: 'Snack',
    prep: 'N/A',
    servings: 1,
    servingOz: 1,
    servingGrams: 28.3495,
    calories: 100,
    fat: 5,
    sodium: 200,
    potassium: 100,
    carbs: 10,
    fiber: 2,
    sugar: 3,
    otherCarbs: 5,
    protein: 4,
    caloriesPerOz: 100,
    caloriesPerGram: 100 / 28.3495,
    carbProteinRatio: 2.5,
    fatCalorieFraction: 45 / 101,
    sugarCalorieFraction: 12 / 101,
    sodiumPerCalorie: 2,
    caloriesPerContainer: 100,
    ...overrides,
  }
}

export function makeElectrolyte(
  overrides: Partial<Electrolyte> = {},
): Electrolyte {
  return {
    id: 'electrolyte-1',
    brand: 'Trail Salts',
    flavor: 'Lemon',
    fluidOz: 16,
    servingGrams: 10,
    calories: 20,
    fat: 0,
    carbs: 5,
    fiber: 0,
    sugar: 5,
    otherCarbs: 0,
    protein: 0,
    sodium: 500,
    potassium: 100,
    calcium: 0,
    magnesium: 0,
    chloride: 0,
    sodiumPotassiumRatio: 5,
    caffeine: 0,
    micros: null,
    ...overrides,
  }
}

export function makeDay(id = 'day-1', name = 'Day 1'): DayPlan {
  return { id, name, meals: createEmptyMeals() }
}

export function makeState(day = makeDay()): PlannerState {
  return { days: [day], customFoods: [], recipes: [] }
}

export function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'recipe-1',
    name: 'Trail bowl',
    category: 'Dinner',
    instructions: null,
    ingredients: [
      { kind: 'food', foodId: 'food-1', quantity: 1.5 },
      {
        kind: 'recipe-only',
        id: 'spice-1',
        name: 'Spice blend',
        weightGrams: 10,
        calories: 20,
        fat: 0,
        carbs: 4,
        protein: 1,
        fiber: 1,
        sugar: 0,
        sodium: 50,
        potassium: 25,
      },
    ],
    ...overrides,
  }
}

export function makeNutrition(
  overrides: Partial<Nutrition> = {},
): Nutrition {
  return {
    calories: 0,
    weightOz: 0,
    weightGrams: 0,
    fat: 0,
    sodium: 0,
    potassium: 0,
    carbs: 0,
    fiber: 0,
    sugar: 0,
    protein: 0,
    ...overrides,
  }
}
