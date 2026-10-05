import {
  AlertTriangle,
  Check,
  PackageCheck,
  Printer,
  ShoppingBag,
  Trash2,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { FoodPicker } from '../components/FoodPicker'
import { Badge, EmptyState, StatCard } from '../components/Ui'
import {
  addNutrition,
  formatWeight,
  nutritionForFood,
  round,
} from '../lib/nutrition'
import {
  nutritionForRecipeOnlyIngredient,
  scaleNutrition,
} from '../lib/recipe'
import { aggregateShoppingList } from '../lib/shopping'
import {
  removeFoodReferences,
  replaceFoodReferences,
} from '../lib/state'
import type {
  Food,
  PlannerState,
  PlannerStateUpdater,
} from '../types'

export function ShoppingPage({
  state,
  setState,
  foods,
  foodsById,
}: {
  state: PlannerState
  setState: PlannerStateUpdater
  foods: Food[]
  foodsById: Map<string, Food>
}) {
  const [packed, setPacked] = useState<Set<string>>(new Set())
  const [replacingFoodId, setReplacingFoodId] = useState<string | null>(null)

  const { rows, recipeOnlyRows, unresolved } = useMemo(
    () => aggregateShoppingList(state, foodsById),
    [state, foodsById],
  )

  const total = addNutrition(
    ...rows.map(({ food, quantity }) => nutritionForFood(food, quantity)),
    ...recipeOnlyRows.map((row) =>
      scaleNutrition(
        nutritionForRecipeOnlyIngredient(row.ingredient),
        row.placementQuantity,
      ),
    ),
  )
  const categories = new Set(rows.map(({ food }) => food.category)).size
  const totalRows = rows.length + recipeOnlyRows.length
  const packedCount =
    rows.filter(({ food }) => packed.has(`food:${food.id}`)).length +
    recipeOnlyRows.filter((row) =>
      packed.has(`recipe-only:${row.recipeId}:${row.ingredientId}`),
    ).length

  if (totalRows === 0 && unresolved.length === 0) {
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
      <section className="stat-grid stat-grid-three print-totals">
        <StatCard
          label="Available foods"
          value={totalRows.toString()}
          detail={
            unresolved.length
              ? `${unresolved.length} unavailable reference${unresolved.length === 1 ? '' : 's'}`
              : `Across ${categories} categories`
          }
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
          value={`${packedCount} / ${totalRows}`}
          detail={`${round(
            totalRows ? (packedCount / totalRows) * 100 : 0,
          )}% complete`}
          accent="#e56f35"
        />
      </section>

      {unresolved.length > 0 && (
        <div className="incomplete-warning" role="status">
          <AlertTriangle size={18} />
          <p>
            <strong>Shopping and nutrition totals are incomplete.</strong>{' '}
            Unavailable Food references are listed separately and excluded from
            weight and nutrition totals.
          </p>
        </div>
      )}

      <section className="table-card">
        <div className="table-card-header">
          <div>
            <span className="eyebrow">Consolidated from every day</span>
            <h2>Pack list</h2>
          </div>
          <button
            className="button button-secondary print-hidden"
            type="button"
            onClick={() => window.print()}
          >
            <Printer size={16} /> Print list
          </button>
        </div>
        <div className="shopping-list">
          {rows.map(({ food, quantity }) => {
            const packedId = `food:${food.id}`
            const isPacked = packed.has(packedId)
            return (
              <button
                className={`shopping-row ${isPacked ? 'packed' : ''}`}
                type="button"
                key={food.id}
                aria-pressed={isPacked}
                onClick={() =>
                  setPacked((current) => {
                    const next = new Set(current)
                    if (next.has(packedId)) next.delete(packedId)
                    else next.add(packedId)
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
          {recipeOnlyRows.map((row) => {
            const packedId =
              `recipe-only:${row.recipeId}:${row.ingredientId}`
            const isPacked = packed.has(packedId)
            return (
              <button
                className={`shopping-row ${isPacked ? 'packed' : ''}`}
                type="button"
                key={packedId}
                aria-pressed={isPacked}
                onClick={() =>
                  setPacked((current) => {
                    const next = new Set(current)
                    if (next.has(packedId)) next.delete(packedId)
                    else next.add(packedId)
                    return next
                  })
                }
              >
                <span className="check-box">{isPacked && <Check size={15} />}</span>
                <span className="shopping-name">
                  <strong>{row.name}</strong>
                  <small>
                    Recipe-only · From {row.sourceRecipe} ·{' '}
                    {round(row.weightGrams, 1)} g · {round(row.calories)} kcal
                  </small>
                </span>
                <Badge tone="amber">Recipe-only</Badge>
                <span className="shopping-quantity">
                  <strong>{round(row.placementQuantity, 1)}</strong>
                  <small>Recipe servings</small>
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {unresolved.length > 0 && (
        <section className="table-card unresolved-shopping">
          <div className="table-card-header">
            <div>
              <span className="eyebrow">Needs attention</span>
              <h2>Unavailable food</h2>
            </div>
          </div>
          <div className="shopping-list">
            {unresolved.map((row) => (
              <div className="shopping-row unresolved-shopping-row" key={row.foodId}>
                <span className="unresolved-mark">
                  <AlertTriangle size={16} />
                </span>
                <span className="shopping-name">
                  <strong>Unavailable food</strong>
                  <small>
                    Food ID: {row.foodId} · {row.itemCount} Plan item
                    {row.itemCount === 1 ? '' : 's'} ·{' '}
                    {row.locations.join(', ')}
                  </small>
                </span>
                <span className="shopping-quantity">
                  <strong>{round(row.quantity, 1)}</strong>
                  <small>servings</small>
                </span>
                <span className="unresolved-actions print-hidden">
                  <button
                    className="button button-quiet item-action"
                    type="button"
                    aria-expanded={replacingFoodId === row.foodId}
                    onClick={() =>
                      setReplacingFoodId((current) =>
                        current === row.foodId ? null : row.foodId,
                      )
                    }
                  >
                    Replace
                  </button>
                  <button
                    className="icon-button danger"
                    type="button"
                    aria-label={`Remove unavailable food ${row.foodId}`}
                    onClick={() =>
                      setState((current) =>
                        removeFoodReferences(current, row.foodId),
                      )
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </span>
                {replacingFoodId === row.foodId && (
                  <div className="unresolved-replacement">
                    <FoodPicker
                      foods={foods}
                      placeholder={`Choose replacement for ${row.foodId}…`}
                      onSelect={(food) => {
                        setState((current) =>
                          replaceFoodReferences(current, row.foodId, food.id),
                        )
                        setReplacingFoodId(null)
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
      <div className="shopping-footer-note">
        <PackageCheck size={18} />
        Quantities are summed exactly like the workbook’s Shopping List pivot
        table. Checkmarks are for this session only.
      </div>
    </div>
  )
}
