import { Search, Sparkles } from 'lucide-react'
import { useId, useMemo, useRef, useState } from 'react'
import type { Food } from '../types'
import { searchFoods } from '../lib/catalog'
import { round } from '../lib/nutrition'

export function FoodPicker({
  foods,
  onSelect,
  placeholder = 'Search 1,600+ foods…',
}: {
  foods: Food[]
  onSelect: (food: Food) => void
  placeholder?: string
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const container = useRef<HTMLDivElement>(null)
  const resultsId = useId()

  const results = useMemo(() => searchFoods(foods, query), [foods, query])

  return (
    <div
      className="food-picker"
      ref={container}
      onBlur={(event) => {
        if (!container.current?.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <Search size={17} />
      <input
        value={query}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        aria-label={placeholder}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? resultsId : undefined}
      />
      {open && (
        <div className="food-results" id={resultsId} role="listbox">
          {results.map((food) => (
            <button
              type="button"
              role="option"
              aria-selected="false"
              key={food.id}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => {
                onSelect(food)
                setQuery('')
                setOpen(false)
              }}
            >
              <span className="result-main">
                {food.custom && <Sparkles size={13} />}
                <strong>{food.name}</strong>
                <small>
                  {food.category ?? 'Uncategorized'} · {food.prep ?? 'No prep'}
                </small>
              </span>
              <span className="result-metric">
                <strong>{round(food.calories ?? 0)}</strong>
                <small>kcal</small>
              </span>
              <span className="result-metric">
                <strong>{round(food.caloriesPerOz ?? 0)}</strong>
                <small>kcal/oz</small>
              </span>
            </button>
          ))}
          {results.length === 0 && (
            <p className="no-results">No matching foods. Add one in Food library.</p>
          )}
        </div>
      )}
    </div>
  )
}
