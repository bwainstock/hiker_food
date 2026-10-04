import {
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
import { useMemo, useState } from 'react'
import { FoodPicker } from '../components/FoodPicker'
import { Badge, EmptyState, ProgressBar, StatCard } from '../components/Ui'
import {
  addNutrition,
  densityLabel,
  fatLabel,
  formatWeight,
  getMetrics,
  nutritionForItems,
  ratioLabel,
  round,
  sodiumLabel,
} from '../lib/nutrition'
import { createDay } from '../lib/planner'
import type {
  DayPlan,
  Food,
  MealName,
  PlannerState,
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
  setState: (updater: (state: PlannerState) => PlannerState) => void
  foods: Food[]
  foodsById: Map<string, Food>
}) {
  const [activeDayId, setActiveDayId] = useState(state.days[0]?.id ?? '')
  const [expandedMeals, setExpandedMeals] = useState<Set<MealName>>(
    new Set(MEALS),
  )

  const activeDay =
    state.days.find((day) => day.id === activeDayId) ?? state.days[0]

  const dayNutrition = useMemo(() => {
    if (!activeDay) return addNutrition()
    return addNutrition(
      ...MEALS.map((meal) =>
        nutritionForItems(activeDay.meals[meal], foodsById),
      ),
    )
  }, [activeDay, foodsById])

  const tripNutrition = useMemo(
    () =>
      addNutrition(
        ...state.days.flatMap((day) =>
          MEALS.map((meal) => nutritionForItems(day.meals[meal], foodsById)),
        ),
      ),
    [state.days, foodsById],
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

  const metrics = getMetrics(dayNutrition)
  const density = densityLabel(metrics.caloriesPerOz)

  return (
    <div className="planner-stack">
      <section className="trip-strip">
        <div>
          <span>Trip overview</span>
          <strong>{state.days.length} trail days</strong>
        </div>
        <div>
          <span>Total energy</span>
          <strong>{round(tripNutrition.calories).toLocaleString()} kcal</strong>
        </div>
        <div>
          <span>Food weight</span>
          <strong>{formatWeight(tripNutrition.weightOz)}</strong>
        </div>
        <div>
          <span>Daily average</span>
          <strong>
            {round(tripNutrition.calories / state.days.length).toLocaleString()}{' '}
            kcal
          </strong>
        </div>
      </section>

      <section className="day-toolbar">
        <div className="day-tabs" role="tablist" aria-label="Trail days">
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
          value={`${round(dayNutrition.calories).toLocaleString()} kcal`}
          detail={`${round(metrics.caloriesPerOz)} kcal per ounce`}
          accent="#e56f35"
        />
        <StatCard
          label="Packed weight"
          value={formatWeight(dayNutrition.weightOz)}
          detail={`${round(dayNutrition.weightGrams)} grams`}
          accent="#227b62"
        />
        <StatCard
          label="Protein"
          value={`${round(dayNutrition.protein, 1)} g`}
          detail={`${round(dayNutrition.carbs, 1)} g carbohydrates`}
          accent="#4779b8"
        />
        <StatCard
          label="Sodium"
          value={`${round(dayNutrition.sodium).toLocaleString()} mg`}
          detail={`${round(dayNutrition.potassium).toLocaleString()} mg potassium`}
          accent="#9d6a35"
        />
      </section>

      <div className="planner-grid">
        <section className="meal-list">
          {MEALS.map((meal) => {
            const mealItems = activeDay.meals[meal]
            const nutrition = nutritionForItems(mealItems, foodsById)
            const isExpanded = expandedMeals.has(meal)
            return (
              <article className="meal-card" key={meal}>
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
                    <strong>{round(nutrition.calories)} kcal</strong>
                    <span>{round(nutrition.weightOz, 1)} oz</span>
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
                      {mealItems.map((item) => {
                        const food = foodsById.get(item.foodId)
                        if (!food) return null
                        return (
                          <div className="meal-item" key={item.id}>
                            <div className="food-avatar">
                              {(food.category ?? 'F').slice(0, 1)}
                            </div>
                            <div className="meal-item-name">
                              <strong>{food.name}</strong>
                              <span>
                                {round((food.calories ?? 0) * item.quantity)} kcal ·{' '}
                                {round((food.servingOz ?? 0) * item.quantity, 1)} oz
                              </span>
                            </div>
                            <label className="quantity-control">
                              <span>Qty</span>
                              <input
                                type="number"
                                min="0.1"
                                step="0.5"
                                value={item.quantity}
                                onChange={(event) => {
                                  const quantity = Math.max(
                                    0.1,
                                    Number(event.target.value) || 0.1,
                                  )
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
                                }}
                              />
                            </label>
                            <button
                              className="icon-button remove-item"
                              type="button"
                              aria-label={`Remove ${food.name}`}
                              onClick={() =>
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
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                    <FoodPicker
                      foods={foods}
                      onSelect={(food) =>
                        updateDay((day) => ({
                          ...day,
                          meals: {
                            ...day.meals,
                            [meal]: [
                              ...day.meals[meal],
                              {
                                id: crypto.randomUUID(),
                                foodId: food.id,
                                quantity: 1,
                              },
                            ],
                          },
                        }))
                      }
                      placeholder={`Add food to ${meal.toLowerCase()}…`}
                    />
                  </div>
                )}
              </article>
            )
          })}
        </section>

        <aside className="analysis-card">
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
