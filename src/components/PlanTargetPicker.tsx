import { CookingPot, Search, Sparkles } from 'lucide-react'
import { useId, useMemo, useRef, useState } from 'react'
import { searchFoods } from '../lib/catalog'
import {
  filterRecipes,
  getRecipePlacementEligibility,
  resolveRecipe,
} from '../lib/recipe'
import { round } from '../lib/nutrition'
import type { Food, PlanItem, Recipe } from '../types'

export function PlanTargetPicker({
  foods,
  foodsById,
  recipes,
  onSelect,
  placeholder,
}: {
  foods: Food[]
  foodsById: ReadonlyMap<string, Food>
  recipes: Recipe[]
  onSelect: (target: PlanItem['target']) => void
  placeholder: string
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const container = useRef<HTMLDivElement>(null)
  const resultsId = useId()
  const foodResults = useMemo(() => searchFoods(foods, query), [foods, query])
  const recipeResults = useMemo(
    () => filterRecipes(recipes, foodsById, query, null).slice(0, 12),
    [recipes, foodsById, query],
  )

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
          {recipeResults.map((recipe) => {
            const resolved = resolveRecipe(recipe, foodsById)
            const eligibility = getRecipePlacementEligibility(
              recipe,
              foodsById,
            )
            return (
              <button
                type="button"
                role="option"
                aria-selected="false"
                aria-disabled={!eligibility.eligible}
                disabled={!eligibility.eligible}
                key={`recipe:${recipe.id}`}
                onClick={() => {
                  onSelect({ kind: 'recipe', id: recipe.id })
                  setQuery('')
                  setOpen(false)
                }}
              >
                <span className="result-main">
                  <CookingPot size={13} />
                  <strong>{recipe.name}</strong>
                  <small>
                    Recipe · {recipe.category ?? 'Uncategorized'}
                    {!eligibility.eligible && ` · ${eligibility.reason}`}
                  </small>
                </span>
                <span className="result-metric">
                  <strong>{round(resolved.nutrition.calories)}</strong>
                  <small>{resolved.complete ? 'kcal' : 'known kcal'}</small>
                </span>
                <span className="result-metric">
                  <strong>{round(resolved.nutrition.weightOz, 1)}</strong>
                  <small>{resolved.complete ? 'oz' : 'known oz'}</small>
                </span>
              </button>
            )
          })}
          {foodResults.map((food) => (
            <button
              type="button"
              role="option"
              aria-selected="false"
              key={`food:${food.id}`}
              onClick={() => {
                onSelect({ kind: 'food', id: food.id })
                setQuery('')
                setOpen(false)
              }}
            >
              <span className="result-main">
                {food.custom && <Sparkles size={13} />}
                <strong>{food.name}</strong>
                <small>Food · {food.category ?? 'Uncategorized'}</small>
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
          {recipeResults.length === 0 && foodResults.length === 0 && (
            <p className="no-results">
              No matching Foods or Recipes. Add one in the library.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
