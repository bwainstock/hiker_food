import type { Food, PlannerState } from '../types'
import { MEALS } from '../types'
import { EN_US_COLLATOR } from './catalog'

export interface ShoppingRow {
  food: Food
  quantity: number
  itemCount: number
}

export interface UnresolvedShoppingRow {
  foodId: string
  quantity: number
  itemCount: number
  locations: string[]
}

export function aggregateShoppingList(
  state: PlannerState,
  foodsById: ReadonlyMap<string, Food>,
) {
  const quantities = new Map<
    string,
    { quantity: number; itemCount: number; locations: string[] }
  >()

  state.days.forEach((day) => {
    MEALS.forEach((meal) => {
      day.meals[meal].forEach((item) => {
        const current = quantities.get(item.foodId) ?? {
          quantity: 0,
          itemCount: 0,
          locations: [],
        }
        current.quantity += item.quantity
        current.itemCount += 1
        current.locations.push(`${day.name} · ${meal}`)
        quantities.set(item.foodId, current)
      })
    })
  })

  const rows: ShoppingRow[] = []
  const unresolved: UnresolvedShoppingRow[] = []

  quantities.forEach((entry, foodId) => {
    const food = foodsById.get(foodId)
    if (food) {
      rows.push({ food, quantity: entry.quantity, itemCount: entry.itemCount })
    } else {
      unresolved.push({ foodId, ...entry })
    }
  })

  rows.sort(
    (a, b) =>
      EN_US_COLLATOR.compare(
        a.food.category ?? 'Uncategorized',
        b.food.category ?? 'Uncategorized',
      ) ||
      EN_US_COLLATOR.compare(a.food.name, b.food.name) ||
      EN_US_COLLATOR.compare(a.food.id, b.food.id),
  )
  unresolved.sort((a, b) => EN_US_COLLATOR.compare(a.foodId, b.foodId))

  return { rows, unresolved }
}
