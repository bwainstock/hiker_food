import {
  ArrowDownUp,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge, Modal } from '../components/Ui'
import { FOOD_CATEGORIES } from '../data'
import {
  calculateFoodMetrics,
  densityLabel,
  round,
} from '../lib/nutrition'
import type { Food, PlannerState } from '../types'

type SortKey = 'density' | 'calories' | 'protein' | 'name'

export function FoodLibraryPage({
  foods,
  setState,
}: {
  foods: Food[]
  setState: (updater: (state: PlannerState) => PlannerState) => void
}) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [sort, setSort] = useState<SortKey>('density')
  const [showForm, setShowForm] = useState(false)

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return foods
      .filter(
        (food) =>
          (category === 'All' || food.category === category) &&
          (!normalized ||
            `${food.name} ${food.category ?? ''} ${food.prep ?? ''}`
              .toLowerCase()
              .includes(normalized)),
      )
      .sort((a, b) => {
        if (sort === 'name') return a.name.localeCompare(b.name)
        return (b[sort === 'density' ? 'caloriesPerOz' : sort] ?? 0) -
          (a[sort === 'density' ? 'caloriesPerOz' : sort] ?? 0)
      })
  }, [foods, query, category, sort])

  return (
    <div className="library-page">
      <section className="library-toolbar">
        <label className="search-field">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search brand, item, category…"
          />
        </label>
        <label className="select-field">
          <SlidersHorizontal size={16} />
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
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
            onChange={(event) => setSort(event.target.value as SortKey)}
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
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 300).map((food) => {
              const density = densityLabel(food.caloriesPerOz ?? 0)
              return (
                <tr key={food.id}>
                  <td>
                    <div className="food-cell">
                      <strong>
                        {food.custom && <Sparkles size={13} />}
                        {food.name}
                      </strong>
                      <span>{food.category ?? 'Uncategorized'}</span>
                    </div>
                  </td>
                  <td>
                    {food.prep && food.prep !== 'N/A' ? (
                      <Badge tone={food.prep === 'hot' ? 'rose' : 'blue'}>
                        {food.prep}
                      </Badge>
                    ) : (
                      <span className="muted">None</span>
                    )}
                  </td>
                  <td>
                    {round(food.servingGrams ?? 0, 1)} g
                    <small>{round(food.servingOz ?? 0, 2)} oz</small>
                  </td>
                  <td>{round(food.calories ?? 0)}</td>
                  <td>
                    <Badge tone={density.tone}>
                      {round(food.caloriesPerOz ?? 0)}
                    </Badge>
                  </td>
                  <td>{round(food.fat ?? 0, 1)} g</td>
                  <td>{round(food.carbs ?? 0, 1)} g</td>
                  <td>{round(food.protein ?? 0, 1)} g</td>
                  <td>{round(food.sodium ?? 0)} mg</td>
                  <td>
                    {food.custom && (
                      <button
                        className="icon-button danger"
                        type="button"
                        aria-label={`Delete ${food.name}`}
                        onClick={() =>
                          setState((current) => ({
                            ...current,
                            customFoods: current.customFoods.filter(
                              (candidate) => candidate.id !== food.id,
                            ),
                            days: current.days.map((day) => ({
                              ...day,
                              meals: Object.fromEntries(
                                Object.entries(day.meals).map(([meal, items]) => [
                                  meal,
                                  items.filter((item) => item.foodId !== food.id),
                                ]),
                              ) as typeof day.meals,
                            })),
                          }))
                        }
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
    </div>
  )
}

function FoodForm({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (food: Food) => void
}) {
  const [form, setForm] = useState({
    brand: '',
    flavor: '',
    category: 'Entrée',
    prep: 'N/A',
    servingGrams: 28,
    calories: 150,
    fat: 5,
    sodium: 0,
    potassium: 0,
    carbs: 20,
    fiber: 0,
    sugar: 0,
    protein: 5,
  })

  const update = (key: keyof typeof form, value: string) => {
    setForm((current) => ({
      ...current,
      [key]:
        key === 'brand' ||
        key === 'flavor' ||
        key === 'category' ||
        key === 'prep'
          ? value
          : Number(value),
    }))
  }

  const save = () => {
    const name = `${form.brand} ${form.flavor}`.trim()
    if (!name) return
    const metrics = calculateFoodMetrics(form)
    onSave({
      id: `custom-${crypto.randomUUID()}`,
      name,
      brand: form.brand || null,
      flavor: form.flavor || null,
      category: form.category || null,
      prep: form.prep || null,
      servings: 1,
      servingOz: metrics.servingOz,
      servingGrams: form.servingGrams,
      calories: form.calories,
      fat: form.fat,
      sodium: form.sodium,
      potassium: form.potassium,
      carbs: form.carbs,
      fiber: form.fiber,
      sugar: form.sugar,
      otherCarbs: Math.max(0, form.carbs - form.fiber - form.sugar),
      protein: form.protein,
      caloriesPerOz: metrics.caloriesPerOz,
      caloriesPerGram: metrics.caloriesPerGram,
      carbProteinRatio: metrics.carbProteinRatio,
      fatCalorieFraction: metrics.fatCalorieFraction,
      sugarCalorieFraction: metrics.sugarCalorieFraction,
      sodiumPerCalorie: metrics.sodiumPerCalorie,
      caloriesPerContainer: form.calories,
      custom: true,
    })
  }

  return (
    <Modal title="Add a custom food" onClose={onClose}>
      <div className="form-grid">
        <label>
          Brand
          <input
            value={form.brand}
            onChange={(event) => update('brand', event.target.value)}
            placeholder="Example: Trail Kitchen"
            autoFocus
          />
        </label>
        <label>
          Food / flavor
          <input
            value={form.flavor}
            onChange={(event) => update('flavor', event.target.value)}
            placeholder="Example: Peanut noodles"
          />
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
              min="0"
              step="0.1"
              value={form[key]}
              onChange={(event) => update(key, event.target.value)}
            />
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
