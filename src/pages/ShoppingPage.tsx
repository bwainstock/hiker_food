import { Check, PackageCheck, Printer, ShoppingBag } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge, EmptyState, StatCard } from '../components/Ui'
import {
  addNutrition,
  formatWeight,
  nutritionForFood,
  round,
} from '../lib/nutrition'
import type { Food, PlannerState } from '../types'
import { MEALS } from '../types'

export function ShoppingPage({
  state,
  foodsById,
}: {
  state: PlannerState
  foodsById: Map<string, Food>
}) {
  const [packed, setPacked] = useState<Set<string>>(new Set())

  const rows = useMemo(() => {
    const quantities = new Map<string, number>()
    state.days.forEach((day) =>
      MEALS.forEach((meal) =>
        day.meals[meal].forEach((item) =>
          quantities.set(
            item.foodId,
            (quantities.get(item.foodId) ?? 0) + item.quantity,
          ),
        ),
      ),
    )
    return Array.from(quantities)
      .flatMap(([foodId, quantity]) => {
        const food = foodsById.get(foodId)
        return food ? [{ food, quantity }] : []
      })
      .sort((a, b) =>
        (a.food.category ?? '').localeCompare(b.food.category ?? '') ||
        a.food.name.localeCompare(b.food.name),
      )
  }, [state.days, foodsById])

  const total = addNutrition(
    ...rows.map(({ food, quantity }) => nutritionForFood(food, quantity)),
  )
  const categories = new Set(rows.map(({ food }) => food.category)).size

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag />}
        title="Your shopping list is empty"
        description="Foods added in the meal planner are automatically grouped here."
      />
    )
  }

  return (
    <div className="shopping-page">
      <section className="stat-grid stat-grid-three">
        <StatCard
          label="Unique foods"
          value={rows.length.toString()}
          detail={`Across ${categories} categories`}
          accent="#227b62"
        />
        <StatCard
          label="Total food weight"
          value={formatWeight(total.weightOz)}
          detail={`${round(total.weightGrams).toLocaleString()} grams`}
          accent="#4779b8"
        />
        <StatCard
          label="Packed"
          value={`${packed.size} / ${rows.length}`}
          detail={`${round((packed.size / rows.length) * 100)}% complete`}
          accent="#e56f35"
        />
      </section>

      <section className="table-card">
        <div className="table-card-header">
          <div>
            <span className="eyebrow">Consolidated from every day</span>
            <h2>Pack list</h2>
          </div>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => window.print()}
          >
            <Printer size={16} /> Print list
          </button>
        </div>
        <div className="shopping-list">
          {rows.map(({ food, quantity }) => {
            const isPacked = packed.has(food.id)
            return (
              <button
                className={`shopping-row ${isPacked ? 'packed' : ''}`}
                type="button"
                key={food.id}
                onClick={() =>
                  setPacked((current) => {
                    const next = new Set(current)
                    if (next.has(food.id)) next.delete(food.id)
                    else next.add(food.id)
                    return next
                  })
                }
              >
                <span className="check-box">{isPacked && <Check size={15} />}</span>
                <span className="shopping-name">
                  <strong>{food.name}</strong>
                  <small>
                    {food.category ?? 'Uncategorized'} ·{' '}
                    {round((food.servingOz ?? 0) * quantity, 1)} oz ·{' '}
                    {round((food.calories ?? 0) * quantity)} kcal
                  </small>
                </span>
                {food.prep && food.prep !== 'N/A' && (
                  <Badge tone={food.prep === 'hot' ? 'rose' : 'blue'}>
                    {food.prep}
                  </Badge>
                )}
                <span className="shopping-quantity">
                  <strong>{round(quantity, 1)}</strong>
                  <small>servings</small>
                </span>
              </button>
            )
          })}
        </div>
      </section>
      <div className="shopping-footer-note">
        <PackageCheck size={18} />
        Quantities are summed exactly like the workbook’s Shopping List pivot
        table. Checkmarks are for this session only.
      </div>
    </div>
  )
}
