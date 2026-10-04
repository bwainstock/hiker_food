import type { Electrolyte, Nutrition } from '../types'
import { interpolateSodiumNeed } from './nutrition'

export function calculateElectrolyteTargets(temperature: number) {
  const sodiumTarget = interpolateSodiumNeed(temperature)
  const sweatSodium = Math.max(0, sodiumTarget - 1500)
  const sweatPotassium = sweatSodium / 4.5
  return {
    sodiumTarget,
    sweatSodium,
    sweatPotassium,
    potassiumTarget: 3400 + sweatPotassium,
  }
}

export function calculateSupplementScenario(
  temperature: number,
  diet: Nutrition,
  product: Electrolyte,
) {
  const targets = calculateElectrolyteTargets(temperature)
  const sodiumGap = Math.max(0, targets.sodiumTarget - diet.sodium)
  const potassiumGap = Math.max(0, targets.potassiumTarget - diet.potassium)
  const servings =
    (product.sodium ?? 0) > 0 ? sodiumGap / (product.sodium ?? 1) : 0
  const servedPotassium = (product.potassium ?? 0) * servings
  return {
    ...targets,
    sodiumGap,
    potassiumGap,
    servings,
    servedPotassium,
    potassiumRemaining: Math.max(0, potassiumGap - servedPotassium),
  }
}
