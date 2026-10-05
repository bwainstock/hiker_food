import {
  AlertTriangle,
  CalendarPlus,
  ChevronDown,
  Copy,
  Flame,
  Plus,
  Scale,
  Trash2,
  Utensils,
  Wheat,
} from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { FoodPicker } from '../components/FoodPicker'
import { PlanTargetPicker } from '../components/PlanTargetPicker'
import { Badge, EmptyState, ProgressBar, StatCard } from '../components/Ui'
import {
  addNutritionSummaries,
  densityLabel,
  fatLabel,
  formatKnownNutritionValue,
  formatWeight,
  getMetrics,
  nutritionSummaryForItems,
  ratioLabel,
  round,
  sodiumLabel,
} from '../lib/nutrition'
import {
  interpretPlanItems,
  type PlanItemInterpretation,
} from '../lib/plan-item'
import { isTenthStepQuantity } from '../lib/schemas'
import { createDay } from '../lib/planner'
import type {
  DayPlan,
  Food,
  MealName,
  PlanItem,
  PlannerState,
  PlannerStateUpdater,
} from '../types'
import { MEALS } from '../types'

const MEAL_TIPS: Partial<Record<MealName, string>> = {
  Breakfast:
    'A little more sugar can help jump-start the day; pair it with fat for sustained energy.',
  'Morning snacks':
    'Favor lower-sugar, calorie-dense foods when you plan to graze consistently.',
  'Afternoon snacks':
    'Nut butters and bars are easy ways to keep calories steady between meals.',
  Recovery:
    'The original workbook targets about 15 g protein with fast carbohydrates.',
  Dinner:
    'Aim for roughly 20–30 g protein; beyond that, one sitting offers diminishing returns.',
}

export function PlannerPage({
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
  const [activeDayId, setActiveDayId] = useState(state.days[0]?.id ?? '')
  const [expandedMeals, setExpandedMeals] = useState<Set<MealName>>(
    new Set(MEALS),
  )

  const activeDay =
    state.days.find((day) => day.id === activeDayId) ?? state.days[0]
  const interpretationsByDay = useMemo(
    () => {
      const interpretations = interpretPlanItems(
        state.days.flatMap((day) =>
          MEALS.flatMap((meal) => day.meals[meal]),
        ),
        foods,
        state.recipes,
      )
      const interpretationIterator = interpretations.values()
      return new Map(
        state.days.map((day) => [
          day.id,
          Object.fromEntries(
            MEALS.map((meal) => [
              meal,
              day.meals[meal].map(
                () => interpretationIterator.next().value!,
              ),
            ]),
          ) as Record<MealName, PlanItemInterpretation[]>,
        ]),
      )
    },
    [state.days, state.recipes, foods],
  )
  const unresolvedItems = useMemo(
    () =>
      state.days.flatMap((day) =>
        MEALS.flatMap((meal) =>
          (interpretationsByDay.get(day.id)?.[meal] ?? []).flatMap(
            (interpretation) =>
              !interpretation.available ||
              (interpretation.target.kind === 'recipe' &&
                !interpretation.complete)
                ? [{ dayId: day.id, meal }]
                : [],
          ),
        ),
      ),
    [state.days, interpretationsByDay],
  )
  const activeDayUnresolved = activeDay
    ? unresolvedItems.filter((item) => item.dayId === activeDay.id)
    : []

  const dayNutrition = useMemo(() => {
    if (!activeDay) return addNutritionSummaries()
    return addNutritionSummaries(
      ...MEALS.map((meal) =>
        nutritionSummaryForItems(
          interpretationsByDay.get(activeDay.id)?.[meal] ?? [],
        ),
      ),
    )
  }, [activeDay, interpretationsByDay])

  const tripNutrition = useMemo(
    () =>
      addNutritionSummaries(
        ...state.days.flatMap((day) =>
          MEALS.map((meal) =>
            nutritionSummaryForItems(
              interpretationsByDay.get(day.id)?.[meal] ?? [],
            ),
          ),
        ),
      ),
    [state.days, interpretationsByDay],
  )

  const updateDay = (updater: (day: DayPlan) => DayPlan) => {
    if (!activeDay) return
    setState((current) => ({
      ...current,
      days: current.days.map((day) =>
        day.id === activeDay.id ? updater(day) : day,
      ),
    }))
  }

  const addDay = () => {
    const day = createDay(state.days.length + 1)
    setState((current) => ({ ...current, days: [...current.days, day] }))
    setActiveDayId(day.id)
  }

  const duplicateDay = () => {
    if (!activeDay) return
    const day: DayPlan = {
      ...structuredClone(activeDay),
      id: crypto.randomUUID(),
      name: `Day ${state.days.length + 1}`,
      meals: Object.fromEntries(
        MEALS.map((meal) => [
          meal,
          activeDay.meals[meal].map((item) => ({
            ...item,
            id: crypto.randomUUID(),
          })),
        ]),
      ) as DayPlan['meals'],
    }
    setState((current) => ({ ...current, days: [...current.days, day] }))
    setActiveDayId(day.id)
  }

  const removeDay = () => {
    if (!activeDay || state.days.length === 1) return
    const index = state.days.findIndex((day) => day.id === activeDay.id)
    const remaining = state.days.filter((day) => day.id !== activeDay.id)
    setState((current) => ({ ...current, days: remaining }))
    setActiveDayId(remaining[Math.max(0, index - 1)].id)
  }

  if (!activeDay) {
    return (
      <EmptyState
        icon={<CalendarPlus />}
        title="Start your first trail day"
        description="Add a day, then fill each meal with foods from the workbook catalog."
        action={
          <button className="button button-primary" type="button" onClick={addDay}>
            <Plus size={17} /> Add day
          </button>
        }
      />
    )
  }

  const metrics = getMetrics(dayNutrition.nutrition)
  const density = densityLabel(metrics.caloriesPerOz)

  return (
    <div className="planner-stack">
      <section className="trip-strip">
        <div>
          <span>Trip overview</span>
          <strong>
            {state.days.length} trail day{state.days.length === 1 ? '' : 's'}
          </strong>
        </div>
        <div>
          <span>Total energy</span>
          <strong>
            {formatKnownNutritionValue(
              `${round(tripNutrition.nutrition.calories).toLocaleString()} kcal`,
              tripNutrition.known.calories,
            )}
          </strong>
          {unresolvedItems.length > 0 && <small>Plan totals incomplete</small>}
        </div>
        <div>
          <span>Food weight</span>
          <strong>
            {formatKnownNutritionValue(
              formatWeight(tripNutrition.nutrition.weightOz),
              tripNutrition.known.weightOz,
            )}
          </strong>
        </div>
        <div>
          <span>Daily average</span>
          <strong>
            {formatKnownNutritionValue(
              `${round(
                tripNutrition.nutrition.calories / state.days.length,
              ).toLocaleString()} kcal`,
              tripNutrition.known.calories,
            )}
          </strong>
        </div>
      </section>

      {unresolvedItems.length > 0 && (
        <div className="incomplete-warning" role="status">
          <AlertTriangle size={18} />
          <p>
            <strong>Nutrition totals are incomplete.</strong>{' '}
            {unresolvedItems.length} Plan item
            {unresolvedItems.length === 1 ? '' : 's'}                         reference unavailable or incomplete targets. Known values are
            included and affected totals are marked incomplete.
          </p>
        </div>
      )}

      <section className="day-toolbar">
        <div className="day-tabs">
          <div className="day-tabs-list" role="tablist" aria-label="Trail days">
            {state.days.map((day) => (
              <button
                className={day.id === activeDay.id ? 'active' : ''}
                type="button"
                role="tab"
                aria-selected={day.id === activeDay.id}
                key={day.id}
                onClick={() => setActiveDayId(day.id)}
              >
                {day.name}
              </button>
            ))}
          </div>
          <button className="day-add" type="button" onClick={addDay}>
            <Plus size={16} /> Day
          </button>
        </div>
        <div className="day-actions">
          <button className="button button-quiet" type="button" onClick={duplicateDay}>
            <Copy size={16} /> Duplicate
          </button>
          <button
            className="button button-quiet danger"
            type="button"
            onClick={removeDay}
            disabled={state.days.length === 1}
          >
            <Trash2 size={16} /> Remove
          </button>
        </div>
      </section>

      <section className="day-title-row">
        <div>
          <span className="eyebrow">Planning</span>
          <input
            className="day-name-input"
            value={activeDay.name}
            onChange={(event) =>
              updateDay((day) => ({ ...day, name: event.target.value }))
            }
            aria-label="Day name"
          />
        </div>
        <Badge tone={density.tone}>{density.label} menu</Badge>
      </section>

      <section className="stat-grid stat-grid-four">
        <StatCard
          label="Energy"
          value={formatKnownNutritionValue(
            `${round(dayNutrition.nutrition.calories).toLocaleString()} kcal`,
            dayNutrition.known.calories,
          )}
          detail={`${round(metrics.caloriesPerOz)} kcal per ounce`}
          accent="#e56f35"
        />
        <StatCard
          label="Packed weight"
          value={formatKnownNutritionValue(
            formatWeight(dayNutrition.nutrition.weightOz),
            dayNutrition.known.weightOz,
          )}
          detail={formatKnownNutritionValue(
            `${round(dayNutrition.nutrition.weightGrams)} grams`,
            dayNutrition.known.weightGrams,
          )}
          accent="#227b62"
        />
        <article
          className="stat-card macro-stat-card"
          aria-label="Macronutrients"
          style={{ '--stat-accent': '#4779b8' } as never}
        >
          <span>Macronutrients</span>
          <dl className="macro-breakdown">
            <div>
              <dt>Carbohydrates</dt>
              <dd>
                {formatKnownNutritionValue(
                  `${round(dayNutrition.nutrition.carbs, 1)} g`,
                  dayNutrition.known.carbs,
                )}
              </dd>
            </div>
            <div>
              <dt>Fat</dt>
              <dd>
                {formatKnownNutritionValue(
                  `${round(dayNutrition.nutrition.fat, 1)} g`,
                  dayNutrition.known.fat,
                )}
              </dd>
            </div>
            <div>
              <dt>Protein</dt>
              <dd>
                {formatKnownNutritionValue(
                  `${round(dayNutrition.nutrition.protein, 1)} g`,
                  dayNutrition.known.protein,
                )}
              </dd>
            </div>
          </dl>
        </article>
        <StatCard
          label="Sodium"
          value={formatKnownNutritionValue(
            `${round(dayNutrition.nutrition.sodium).toLocaleString()} mg`,
            dayNutrition.known.sodium,
          )}
          detail={formatKnownNutritionValue(
            `${round(dayNutrition.nutrition.potassium).toLocaleString()} mg potassium`,
            dayNutrition.known.potassium,
          )}
          accent="#9d6a35"
        />
      </section>
      {activeDayUnresolved.length > 0 && (
        <p className="recipe-warning" role="status">
          Trail-day totals incomplete — showing nutrition from available Foods
          and Recipe ingredients only.
        </p>
      )}

      <div className="planner-grid">
        <section className="meal-list">
          {MEALS.map((meal) => {
            const mealItems = activeDay.meals[meal]
            const mealInterpretations =
              interpretationsByDay.get(activeDay.id)?.[meal] ?? []
            const mealIncomplete = activeDayUnresolved.some(
              (item) => item.meal === meal,
            )
            const nutrition = nutritionSummaryForItems(mealInterpretations)
            const isExpanded = expandedMeals.has(meal)
            return (
              <article className="meal-card" key={meal} aria-label={meal}>
                <button
                  className="meal-header"
                  type="button"
                  onClick={() =>
                    setExpandedMeals((current) => {
                      const next = new Set(current)
                      if (next.has(meal)) next.delete(meal)
                      else next.add(meal)
                      return next
                    })
                  }
                >
                  <div className="meal-icon">
                    <Utensils size={18} />
                  </div>
                  <div className="meal-heading">
                    <strong>{meal}</strong>
                    <span>
                      {mealItems.length
                        ? `${mealItems.length} item${mealItems.length === 1 ? '' : 's'}`
                        : 'No food added'}
                    </span>
                  </div>
                  <div className="meal-summary">
                    <strong>
                      {formatKnownNutritionValue(
                        `${round(nutrition.nutrition.calories)} kcal`,
                        nutrition.known.calories,
                      )}
                    </strong>
                    <span>
                      {formatKnownNutritionValue(
                        `${round(nutrition.nutrition.weightOz, 1)} oz`,
                        nutrition.known.weightOz,
                      )}
                      {mealIncomplete && ' · Meal totals incomplete'}
                    </span>
                  </div>
                  <ChevronDown
                    className={isExpanded ? 'rotated' : ''}
                    size={18}
                  />
                </button>
                {isExpanded && (
                  <div className="meal-body">
                    {MEAL_TIPS[meal] && (
                      <p className="meal-tip">{MEAL_TIPS[meal]}</p>
                    )}
                    <div className="meal-items">
                      {mealItems.map((item, index) => {
                        return (
                          <MealPlanItem
                            key={`${item.id}:${item.quantity}`}
                            item={item}
                            interpretation={mealInterpretations[index]}
                            foods={foods}
                            onQuantity={(quantity) =>
                              updateDay((day) => ({
                                ...day,
                                meals: {
                                  ...day.meals,
                                  [meal]: day.meals[meal].map((candidate) =>
                                    candidate.id === item.id
                                      ? { ...candidate, quantity }
                                      : candidate,
                                  ),
                                },
                              }))
                            }
                            onReplace={(foodId) =>
                              updateDay((day) => ({
                                ...day,
                                meals: {
                                  ...day.meals,
                                  [meal]: day.meals[meal].map((candidate) =>
                                    candidate.id === item.id
                                      ? {
                                          ...candidate,
                                          target: {
                                            kind: 'food',
                                            id: foodId,
                                          },
                                        }
                                      : candidate,
                                  ),
                                },
                              }))
                            }
                            onRemove={() =>
                              updateDay((day) => ({
                                ...day,
                                meals: {
                                  ...day.meals,
                                  [meal]: day.meals[meal].filter(
                                    (candidate) => candidate.id !== item.id,
                                  ),
                                },
                              }))
                            }
                          />
                        )
                      })}
                    </div>
                    <PlanTargetPicker
                      foods={foods}
                      foodsById={foodsById}
                      recipes={state.recipes}
                      onSelect={(target) =>
                        updateDay((day) => ({
                          ...day,
                          meals: {
                            ...day.meals,
                            [meal]: [
                              ...day.meals[meal],
                              {
                                id: crypto.randomUUID(),
                                target,
                                quantity: 1,
                              },
                            ],
                          },
                        }))
                      }
                      placeholder={`Add Food or Recipe to ${meal.toLowerCase()}…`}
                    />
                  </div>
                )}
              </article>
            )
          })}
        </section>

        <aside className="analysis-card" aria-label="Day nutrition analysis">
          <div className="section-heading compact">
            <div>
              <span className="eyebrow">Day analysis</span>
              <h2>Nutrition balance</h2>
            </div>
          </div>
          <ProgressBar
            label="Calories / ounce"
            value={metrics.caloriesPerOz}
            max={180}
            display={`${round(metrics.caloriesPerOz)}`}
            tone="green"
          />
          <ProgressBar
            label="Calories / gram"
            value={metrics.caloriesPerGram}
            max={7}
            display={`${round(metrics.caloriesPerGram, 2)}`}
            tone="teal"
          />
          <ProgressBar
            label="Carb : protein"
            value={metrics.carbProteinRatio}
            max={5}
            display={`${round(metrics.carbProteinRatio, 1)} : 1`}
            tone="blue"
          />
          <ProgressBar
            label="Calories from fat"
            value={metrics.fatFraction}
            max={0.8}
            display={`${round(metrics.fatFraction * 100)}%`}
            tone="amber"
          />
          <ProgressBar
            label="Calories from sugar"
            value={metrics.sugarFraction}
            max={0.3}
            display={`${round(metrics.sugarFraction * 100)}%`}
            tone="rose"
          />
          <div className="rating-list">
            <div>
              <Flame size={16} />
              <span>Weight efficiency</span>
              <Badge tone={density.tone}>{density.label}</Badge>
            </div>
            <div>
              <Wheat size={16} />
              <span>Carb / protein</span>
              <Badge tone={ratioLabel(metrics.carbProteinRatio).tone}>
                {ratioLabel(metrics.carbProteinRatio).label}
              </Badge>
            </div>
            <div>
              <Scale size={16} />
              <span>Fat balance</span>
              <Badge tone={fatLabel(metrics.fatFraction).tone}>
                {fatLabel(metrics.fatFraction).label}
              </Badge>
            </div>
            <div>
              <span className="na-symbol">Na</span>
              <span>Sodium density</span>
              <Badge tone={sodiumLabel(metrics.sodiumPerCalorie).tone}>
                {sodiumLabel(metrics.sodiumPerCalorie).label}
              </Badge>
            </div>
          </div>
          <p className="analysis-note">
            Ratings use the same thresholds as the workbook’s Color Keys sheet.
            They are planning signals, not medical advice.
          </p>
        </aside>
      </div>
    </div>
  )
}

function MealPlanItem({
  item,
  interpretation,
  foods,
  onQuantity,
  onReplace,
  onRemove,
}: {
  item: PlanItem
  interpretation: PlanItemInterpretation
  foods: Food[]
  onQuantity: (quantity: number) => void
  onReplace: (foodId: string) => void
  onRemove: () => void
}) {
  const [replacing, setReplacing] = useState(false)
  const targetId = item.target.id
  const isFoodTarget = item.target.kind === 'food'
  const label = interpretation.label ??
    `${isFoodTarget ? 'Unavailable food' : 'Recipe'} ${targetId}`

  return (
    <>
      <div
        className={`meal-item ${
          interpretation.complete ? '' : 'unresolved-item'
        }`}
      >
        <div className="food-avatar">
          {interpretation.available
            ? interpretation.target.kind.slice(0, 1).toUpperCase()
            : <AlertTriangle size={14} />}
        </div>
        <div className="meal-item-name">
          <strong>{interpretation.label ?? `Unavailable ${isFoodTarget ? 'Food' : 'Recipe'}`}</strong>
          <span>
            {interpretation.available
              ? `${interpretation.target.kind === 'recipe' ? 'Recipe · ' : ''}${formatKnownNutritionValue(
                  `${round(interpretation.nutrition.calories)} kcal`,
                  interpretation.known.calories,
                )} · ${formatKnownNutritionValue(
                  `${round(interpretation.nutrition.weightOz, 1)} oz`,
                  interpretation.known.weightOz,
                )}${
                  interpretation.complete ? '' : ' · Incomplete'
                }`
              : `${isFoodTarget ? 'Food' : 'Recipe'} ID: ${targetId}`}
          </span>
        </div>
        <QuantityInput
          label={label}
          value={item.quantity}
          onCommit={onQuantity}
        />
        <div className="meal-item-actions">
          {!interpretation.available && isFoodTarget && (
            <button
              className="button button-quiet item-action"
              type="button"
              onClick={() => setReplacing((current) => !current)}
              aria-expanded={replacing}
            >
              Replace
            </button>
          )}
          <button
            className="icon-button remove-item"
            type="button"
            aria-label={`Remove ${label}`}
            onClick={onRemove}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      {!interpretation.available && isFoodTarget && replacing && (
        <div className="replacement-picker">
          <FoodPicker
            foods={foods}
            placeholder={`Choose replacement for ${targetId}…`}
            onSelect={(replacement) => {
              onReplace(replacement.id)
              setReplacing(false)
            }}
          />
        </div>
      )}
    </>
  )
}

function QuantityInput({
  label,
  value,
  onCommit,
}: {
  label: string
  value: number
  onCommit: (quantity: number) => void
}) {
  const [draft, setDraft] = useState(String(value))
  const [error, setError] = useState('')
  const errorId = useId()

  const parseQuantity = (next: string) => {
    const quantity = next.trim() === '' ? Number.NaN : Number(next)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError('Enter a quantity greater than 0.')
      return null
    }
    if (!isTenthStepQuantity(quantity)) {
      setError('Enter a quantity in increments of 0.1.')
      return null
    }
    setError('')
    return quantity
  }

  const commit = () => {
    const quantity = parseQuantity(draft)
    if (quantity !== null) onCommit(quantity)
  }

  return (
    <label className="quantity-control">
      <span>Qty</span>
      <input
        type="number"
        min="0.1"
        step="0.1"
        value={draft}
        aria-label={`Quantity for ${label}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => {
          const next = event.target.value
          setDraft(next)
          parseQuantity(next)
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commit()
            event.currentTarget.blur()
          }
        }}
      />
      {error && (
        <span className="quantity-error" id={errorId} role="alert">
          {error}
        </span>
      )}
    </label>
  )
}
