import { Search, Sparkles } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import type { Food } from '../types'
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

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return foods.slice(0, 8)
    const words = normalized.split(/\s+/)
    return foods
      .filter((food) => {
        const haystack =
          `${food.name} ${food.category ?? ''} ${food.prep ?? ''}`.toLowerCase()
        return words.every((word) => haystack.includes(word))
      })
      .slice(0, 12)
  }, [foods, query])

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
      />
      {open && (
        <div className="food-results">
          {results.map((food) => (
            <button
              type="button"
              key={food.id}
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
