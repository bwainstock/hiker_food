import {
  ArrowDownUp,
  ChevronDown,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Badge, Modal } from '../components/Ui'
import { FOOD_CATEGORIES } from '../data'
import { filterAndSortFoods } from '../lib/catalog'
import {
  createCustomFood,
  customFoodInputSchema,
} from '../lib/customFood'
import {
  analyzeCustomFoodDeletion,
  deleteCustomFood,
} from '../lib/deletion'
import { densityLabel, round } from '../lib/nutrition'
import type {
  Food,
  PlannerState,
  PlannerStateUpdater,
} from '../types'
import type { FoodSortKey } from '../lib/catalog'

export function FoodLibraryPage({
  state,
  foods,
  setState,
}: {
  state: PlannerState
  foods: Food[]
  setState: PlannerStateUpdater
}) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [sort, setSort] = useState<FoodSortKey>('density')
  const [showForm, setShowForm] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Food | null>(null)
  const isMobile = useMediaQuery('(max-width: 620px)')

  const filtered = useMemo(
    () => filterAndSortFoods(foods, { query, category, sort }),
    [foods, query, category, sort],
  )

  const pendingImpact = pendingDelete
    ? analyzeCustomFoodDeletion(state, pendingDelete.id)
    : null

  const requestCustomFoodDeletion = (food: Food) => {
    const impact = analyzeCustomFoodDeletion(state, food.id)
    if (
      impact.planItemCount === 0 &&
      impact.foodIngredientCount === 0
    ) {
      setState((current) => deleteCustomFood(current, food.id))
    } else {
      setPendingDelete(food)
    }
  }

  return (
    <div className="library-page">
      <section className="library-toolbar">
        <label className="search-field">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search brand, item, category…"
            aria-label="Search foods"
          />
        </label>
        <label className="select-field">
          <SlidersHorizontal size={16} />
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            aria-label="Filter foods by category"
          >
            <option>All</option>
            {FOOD_CATEGORIES.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className="select-field">
          <ArrowDownUp size={16} />
          <select
            value={sort}
            onChange={(event) =>
              setSort(event.target.value as FoodSortKey)
            }
            aria-label="Sort foods"
          >
            <option value="density">Highest calorie density</option>
            <option value="calories">Most calories / serving</option>
            <option value="protein">Most protein</option>
            <option value="name">Name A–Z</option>
          </select>
        </label>
        <button
          className="button button-primary"
          type="button"
          onClick={() => setShowForm(true)}
        >
          <Plus size={17} /> Add food
        </button>
      </section>

      <div className="results-summary">
        <span>
          <strong>{filtered.length.toLocaleString()}</strong> foods
        </span>
        <span>Source: Hiker Food workbook + your custom entries</span>
      </div>

      {!isMobile && (
        <section className="food-table-wrap">
          <table className="data-table food-table">
            <thead>
              <tr>
                <th>Food</th>
                <th>Prep</th>
                <th>Serving</th>
                <th>Calories</th>
                <th>kcal / oz</th>
                <th>Fat</th>
                <th>Carbs</th>
                <th>Protein</th>
                <th>Sodium</th>
                <th>
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 300).map((food) => {
                const display = foodDisplay(food)
                return (
                  <tr key={food.id}>
                    <td>
                      <div className="food-cell">
                        <strong>
                          {food.custom && <Sparkles size={13} />}
                          {food.name}
                        </strong>
                        <span>{display.category}</span>
                      </div>
                    </td>
                    <td>
                      {display.prep !== 'None' ? (
                        <Badge tone={display.prepTone}>
                          {display.prep}
                        </Badge>
                      ) : (
                        <span className="muted">None</span>
                      )}
                    </td>
                    <td>
                      {display.servingGrams}
                      <small>{display.servingOz}</small>
                    </td>
                    <td>{display.calories}</td>
                    <td>
                      <Badge tone={display.densityTone}>
                        {display.caloriesPerOz}
                      </Badge>
                    </td>
                    <td>{display.fat}</td>
                    <td>{display.carbs}</td>
                    <td>{display.protein}</td>
                    <td>{display.sodium}</td>
                    <td>
                      {food.custom && (
                        <button
                          className="icon-button danger"
                          type="button"
                          aria-label={`Delete ${food.name}`}
                          onClick={() => requestCustomFoodDeletion(food)}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length > 300 && (
            <p className="table-limit-note">
              Showing the first 300 matches. Refine your search to narrow the list.
            </p>
          )}
        </section>
      )}
      {isMobile && (
        <section className="food-card-list" aria-label="Food results">
          {filtered.slice(0, 300).map((food) => (
            <FoodCard
              key={food.id}
              food={food}
              onDelete={() => requestCustomFoodDeletion(food)}
            />
          ))}
          {filtered.length > 300 && (
            <p className="table-limit-note">
              Showing the first 300 matches. Refine your search to narrow the list.
            </p>
          )}
        </section>
      )}

      {showForm && (
        <FoodForm
          onClose={() => setShowForm(false)}
          onSave={(food) => {
            setState((current) => ({
              ...current,
              customFoods: [...current.customFoods, food],
            }))
            setShowForm(false)
          }}
        />
      )}
      {pendingDelete && pendingImpact && (
        <Modal
          title={`Delete ${pendingDelete.name}?`}
          onClose={() => setPendingDelete(null)}
        >
          <div className="modal-content">
            <p>
              <strong>
                {pendingImpact.planItemCount} direct Plan item
                {pendingImpact.planItemCount === 1 ? '' : 's'}
              </strong>{' '}
              and{' '}
              <strong>
                {pendingImpact.foodIngredientCount} Food ingredient
                {pendingImpact.foodIngredientCount === 1 ? '' : 's'}
              </strong>
              {' '}reference this custom Food.
            </p>
            <p>
              Direct placements will be removed. Recipe references will remain
              unavailable and repairable.
            </p>
          </div>
          <div className="modal-actions">
            <button
              className="button button-quiet"
              type="button"
              onClick={() => setPendingDelete(null)}
              autoFocus
            >
              Cancel
            </button>
            <button
              className="button button-primary danger-button"
              type="button"
              onClick={() => {
                setState((current) =>
                  deleteCustomFood(current, pendingDelete.id),
                )
                setPendingDelete(null)
              }}
            >
              Delete Food and remove {pendingImpact.planItemCount} direct Plan
              {' '}item{pendingImpact.planItemCount === 1 ? '' : 's'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    const update = () => setMatches(mediaQuery.matches)
    update()
    mediaQuery.addEventListener('change', update)
    return () => mediaQuery.removeEventListener('change', update)
  }, [query])

  return matches
}

function foodDisplay(food: Food) {
  const density = densityLabel(food.caloriesPerOz ?? 0)
  return {
    category: food.category ?? 'Uncategorized',
    prep: food.prep && food.prep !== 'N/A' ? food.prep : 'None',
    prepTone: food.prep === 'hot' ? 'rose' : 'blue',
    servingGrams: `${round(food.servingGrams ?? 0, 1)} g`,
    servingOz: `${round(food.servingOz ?? 0, 2)} oz`,
    calories: round(food.calories ?? 0),
    caloriesPerOz: round(food.caloriesPerOz ?? 0),
    densityTone: density.tone,
    fat: `${round(food.fat ?? 0, 1)} g`,
    carbs: `${round(food.carbs ?? 0, 1)} g`,
    protein: `${round(food.protein ?? 0, 1)} g`,
    sodium: `${round(food.sodium ?? 0)} mg`,
  }
}

function FoodCard({
  food,
  onDelete,
}: {
  food: Food
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const display = foodDisplay(food)
  const detailsId = `food-card-details-${food.id}`

  return (
    <article className="food-card" aria-label={food.name}>
      <div className="food-card-heading">
        <div className="food-cell">
          <strong>
            {food.custom && <Sparkles size={13} />}
            {food.name}
          </strong>
          <span>{display.category}</span>
        </div>
        <Badge tone={display.prepTone}>
          {display.prep}
        </Badge>
      </div>
      <dl className="food-card-metrics">
        <div>
          <dt>Serving</dt>
          <dd>
            {display.servingGrams}
            <small>{display.servingOz}</small>
          </dd>
        </div>
        <div>
          <dt>Calories</dt>
          <dd>{display.calories}</dd>
        </div>
        <div>
          <dt>Calorie density</dt>
          <dd>
            <Badge tone={display.densityTone}>
              {display.caloriesPerOz} kcal / oz
            </Badge>
          </dd>
        </div>
        <div>
          <dt>Fat</dt>
          <dd>{display.fat}</dd>
        </div>
        <div>
          <dt>Carbohydrates</dt>
          <dd>{display.carbs}</dd>
        </div>
        <div>
          <dt>Protein</dt>
          <dd>{display.protein}</dd>
        </div>
      </dl>
      <button
        className="food-card-disclosure"
        type="button"
        aria-expanded={expanded}
        aria-controls={detailsId}
        aria-label={`${expanded ? 'Hide' : 'Show'} details for ${food.name}`}
        onClick={() => setExpanded((current) => !current)}
      >
        Details
        <ChevronDown
          className={expanded ? 'rotated' : undefined}
          size={16}
        />
      </button>
      {expanded && (
        <div className="food-card-details" id={detailsId}>
          <div>
            <span>Sodium</span>
            <strong>{display.sodium}</strong>
          </div>
          {food.custom && (
            <button
              className="icon-button danger"
              type="button"
              aria-label={`Delete ${food.name}`}
              onClick={onDelete}
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      )}
    </article>
  )
}

function FoodForm({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (food: Food) => void
}) {
  type FormKey =
    | 'brand'
    | 'flavor'
    | 'category'
    | 'prep'
    | 'servingGrams'
    | 'calories'
    | 'fat'
    | 'sodium'
    | 'potassium'
    | 'carbs'
    | 'fiber'
    | 'sugar'
    | 'protein'

  const [form, setForm] = useState({
    brand: '',
    flavor: '',
    category: 'Entrée',
    prep: 'N/A',
    servingGrams: '28',
    calories: '150',
    fat: '5',
    sodium: '0',
    potassium: '0',
    carbs: '20',
    fiber: '0',
    sugar: '0',
    protein: '5',
  })
  const [errors, setErrors] = useState<Partial<Record<FormKey, string>>>({})

  const update = (key: FormKey, value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  const save = () => {
    const numberFrom = (value: string) =>
      value.trim() === '' ? Number.NaN : Number(value)
    const result = customFoodInputSchema.safeParse({
      brand: form.brand,
      flavor: form.flavor,
      category: form.category,
      prep: form.prep,
      servingGrams: numberFrom(form.servingGrams),
      calories: numberFrom(form.calories),
      fat: numberFrom(form.fat),
      sodium: numberFrom(form.sodium),
      potassium: numberFrom(form.potassium),
      carbs: numberFrom(form.carbs),
      fiber: numberFrom(form.fiber),
      sugar: numberFrom(form.sugar),
      protein: numberFrom(form.protein),
    })
    if (!result.success) {
      const nextErrors: Partial<Record<FormKey, string>> = {}
      result.error.issues.forEach((issue) => {
        const field = issue.path[0]
        if (typeof field === 'string' && !(field in nextErrors)) {
          nextErrors[field as FormKey] = issue.message
        }
      })
      setErrors(nextErrors)
      return
    }
    onSave(createCustomFood(result.data))
  }

  const errorFor = (key: FormKey) =>
    errors[key] ? (
      <span className="field-error" id={`custom-food-${key}-error`} role="alert">
        {errors[key]}
      </span>
    ) : null

  return (
    <Modal title="Add a custom food" onClose={onClose}>
      {Object.values(errors).some(Boolean) && (
        <p className="form-error-summary" role="alert">
          Fix the highlighted fields before saving this custom Food.
        </p>
      )}
      <div className="form-grid">
        <label>
          Brand
          <input
            value={form.brand}
            onChange={(event) => update('brand', event.target.value)}
            placeholder="Example: Trail Kitchen"
            aria-invalid={Boolean(errors.brand)}
            aria-describedby={
              errors.brand ? 'custom-food-brand-error' : undefined
            }
            autoFocus
          />
          {errorFor('brand')}
        </label>
        <label>
          Food / flavor
          <input
            value={form.flavor}
            onChange={(event) => update('flavor', event.target.value)}
            placeholder="Example: Peanut noodles"
            aria-invalid={Boolean(errors.flavor)}
            aria-describedby={
              errors.flavor ? 'custom-food-flavor-error' : undefined
            }
          />
          {errorFor('flavor')}
        </label>
        <label>
          Category
          <select
            value={form.category}
            onChange={(event) => update('category', event.target.value)}
          >
            {FOOD_CATEGORIES.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <label>
          Preparation
          <select
            value={form.prep}
            onChange={(event) => update('prep', event.target.value)}
          >
            <option value="N/A">No prep</option>
            <option value="hot">Hot water</option>
            <option value="cold">Cold soak</option>
            <option value="cook">Cook</option>
          </select>
        </label>
        {(
          [
            ['servingGrams', 'Serving weight (g)'],
            ['calories', 'Calories'],
            ['fat', 'Fat (g)'],
            ['carbs', 'Carbohydrates (g)'],
            ['fiber', 'Fiber (g)'],
            ['sugar', 'Sugar (g)'],
            ['protein', 'Protein (g)'],
            ['sodium', 'Sodium (mg)'],
            ['potassium', 'Potassium (mg)'],
          ] as const
        ).map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              type="number"
              min={key === 'servingGrams' ? '0.1' : '0'}
              step="0.1"
              value={form[key]}
              onChange={(event) => update(key, event.target.value)}
              aria-invalid={Boolean(errors[key])}
              aria-describedby={
                errors[key] ? `custom-food-${key}-error` : undefined
              }
            />
            {errorFor(key)}
          </label>
        ))}
      </div>
      <div className="modal-actions">
        <button className="button button-quiet" type="button" onClick={onClose}>
          Cancel
        </button>
        <button className="button button-primary" type="button" onClick={save}>
          <Plus size={16} /> Add to library
        </button>
      </div>
    </Modal>
  )
}
