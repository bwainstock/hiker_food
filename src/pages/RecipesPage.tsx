import { CookingPot, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { FoodPicker } from '../components/FoodPicker'
import { EmptyState, Modal } from '../components/Ui'
import {
  addFoodIngredient,
  addRecipeOnlyIngredient,
  createRecipeDraft,
  filterRecipes,
  formatRecipeCalories,
  removeFoodIngredient,
  removeRecipeOnlyIngredient,
  replaceFoodIngredient,
  resolveFoodRecipe,
  saveRecipeDraft,
  updateFoodIngredientQuantity,
  updateRecipeOnlyIngredient,
  validateRecipeDraft,
} from '../lib/recipe'
import { formatWeight, round } from '../lib/nutrition'
import {
  RECIPE_CATEGORIES,
  type Food,
  type PlannerState,
  type PlannerStateUpdater,
  type Recipe,
  type RecipeCategory,
  type RecipeOnlyIngredient,
} from '../types'
import type { RecipeDraft } from '../lib/recipe'

interface RecipeErrors {
  name?: string
  ingredients?: string
  fields: Record<string, Record<string, string>>
}

interface RecipeEditor {
  title: string
  draft: RecipeDraft
}

export function RecipesPage({
  state,
  setState,
  foods,
  foodsById,
}: {
  state: PlannerState
  setState: PlannerStateUpdater
  foods: Food[]
  foodsById: ReadonlyMap<string, Food>
}) {
  const [editor, setEditor] = useState<RecipeEditor | null>(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<RecipeCategory | null>(null)
  const filteredRecipes = useMemo(
    () => filterRecipes(state.recipes, foodsById, query, category),
    [state.recipes, foodsById, query, category],
  )

  const createRecipe = () =>
    setEditor({ title: 'Create Recipe', draft: createRecipeDraft() })
  const editRecipe = (recipe: Recipe) =>
    setEditor({
      title: `Edit ${recipe.name}`,
      draft: createRecipeDraft(recipe),
    })

  if (state.recipes.length === 0 && !editor) {
    return (
      <div className="recipes-page">
        <EmptyState
          icon={<CookingPot size={27} />}
          title="No Recipes yet"
          description="Combine Foods and Recipe-only ingredients into a reusable one-serving Recipe."
          action={
            <button
              className="button button-primary"
              type="button"
              onClick={createRecipe}
            >
              <Plus size={16} /> Create Recipe
            </button>
          }
        />
      </div>
    )
  }

  return (
    <div className="recipes-page">
      <div className="recipes-toolbar">
        <div className="recipe-search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search Recipes"
            placeholder="Search Recipes"
          />
        </div>
        <label className="recipe-category-filter">
          <span>Category</span>
          <select
            aria-label="Recipe category"
            value={category ?? ''}
            onChange={(event) =>
              setCategory(
                (event.target.value || null) as RecipeCategory | null,
              )
            }
          >
            <option value="">All categories</option>
            {RECIPE_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <button
          className="button button-primary"
          type="button"
          onClick={createRecipe}
        >
          <Plus size={16} /> Create Recipe
        </button>
      </div>

      {filteredRecipes.length === 0 ? (
        <div role="status" aria-live="polite">
          <EmptyState
            icon={<Search size={27} />}
            title="No matching Recipes"
            description="Try another search or choose All categories."
          />
        </div>
      ) : (
        <section className="recipe-grid" aria-label="Saved Recipes">
          {filteredRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              foodsById={foodsById}
              onEdit={() => editRecipe(recipe)}
            />
          ))}
        </section>
      )}

      {editor && (
        <RecipeForm
          title={editor.title}
          draft={editor.draft}
          foods={foods}
          foodsById={foodsById}
          onDraftChange={(draft) =>
            setEditor((current) =>
              current ? { ...current, draft } : current,
            )
          }
          onCancel={() => setEditor(null)}
          onSave={(draft) => {
            setState((current) =>
              saveRecipeDraft(
                current,
                draft,
                () => `recipe-${crypto.randomUUID()}`,
              ),
            )
            setEditor(null)
          }}
        />
      )}
    </div>
  )
}

function RecipeCard({
  recipe,
  foodsById,
  onEdit,
}: {
  recipe: Recipe
  foodsById: ReadonlyMap<string, Food>
  onEdit: () => void
}) {
  const summary = resolveFoodRecipe(recipe, foodsById)
  const { nutrition } = summary
  const metrics = [
    [
      'Weight',
      `${formatWeight(nutrition.weightOz)} · ${round(nutrition.weightGrams, 1)} g`,
    ],
    ['Calories', formatRecipeCalories(nutrition.calories)],
    ['Fat', `${round(nutrition.fat, 1)} g`],
    ['Carbohydrates', `${round(nutrition.carbs, 1)} g`],
    ['Protein', `${round(nutrition.protein, 1)} g`],
    ['Fiber', `${round(nutrition.fiber, 1)} g`],
    ['Sugar', `${round(nutrition.sugar, 1)} g`],
    ['Sodium', `${round(nutrition.sodium)} mg`],
    ['Potassium', `${round(nutrition.potassium)} mg`],
  ]

  return (
    <article className="recipe-card" aria-label={recipe.name}>
      <div className="recipe-card-header">
        <div>
          <span className="eyebrow">{recipe.category ?? 'Uncategorized'}</span>
          <h2>{recipe.name}</h2>
          <p>
            {summary.ingredientCount} ingredient
            {summary.ingredientCount === 1 ? '' : 's'} · One serving
          </p>
        </div>
        <button
          className="button button-secondary"
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${recipe.name}`}
        >
          <Pencil size={14} /> Edit
        </button>
      </div>
      {recipe.instructions && (
        <p className="recipe-instructions">{recipe.instructions}</p>
      )}
      {!summary.complete && (
        <div className="recipe-warning" role="status">
          <strong>Known totals only — this Recipe is incomplete.</strong>
          <span>
            Repair unavailable Food
            {summary.unavailableFoodReferences.length === 1 ? '' : 's'}:{' '}
            {summary.unavailableFoodReferences
              .map(
                (ingredient) =>
                  `${ingredient.foodId} (${round(ingredient.quantity, 1)} servings)`,
              )
              .join(', ')}
          </span>
        </div>
      )}
      <dl className="recipe-metrics">
        {metrics.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </article>
  )
}

function RecipeForm({
  title,
  draft,
  foods,
  foodsById,
  onDraftChange,
  onCancel,
  onSave,
}: {
  title: string
  draft: RecipeDraft
  foods: Food[]
  foodsById: ReadonlyMap<string, Food>
  onDraftChange: (draft: RecipeDraft) => void
  onCancel: () => void
  onSave: (draft: RecipeDraft) => void
}) {
  const errorId = useId()
  const [errors, setErrors] = useState<RecipeErrors>({ fields: {} })
  const [replacingFoodId, setReplacingFoodId] = useState<string | null>(null)

  const save = () => {
    const result = validateRecipeDraft(draft)
    if (result.success) {
      onSave(result.data)
      return
    }

    const next: RecipeErrors = { fields: {} }
    result.error.issues.forEach((issue) => {
      if (issue.path[0] === 'name') {
        next.name = issue.message
        return
      }
      if (issue.path[0] !== 'ingredients') return
      const index = issue.path[1]
      const field = issue.path[2]
      const ingredient =
        typeof index === 'number' ? draft.ingredients[index] : undefined
      if (ingredient && typeof field === 'string') {
        const key =
          ingredient.kind === 'food' ? ingredient.foodId : ingredient.id
        next.fields[key] = {
          ...next.fields[key],
          [field]: issue.message,
        }
      } else {
        next.ingredients = issue.message
      }
    })
    setErrors(next)
  }

  const foodIngredients = draft.ingredients.filter(
    (ingredient) => ingredient.kind === 'food',
  )
  const recipeOnlyIngredients = draft.ingredients.filter(
    (ingredient): ingredient is RecipeOnlyIngredient =>
      ingredient.kind === 'recipe-only',
  )

  return (
    <Modal title={title} onClose={onCancel}>
      <div className="recipe-form">
        <div className="recipe-basics">
          <label className="recipe-name-field">
            <span>Recipe name</span>
            <input
              value={draft.name}
              onChange={(event) =>
                onDraftChange({ ...draft, name: event.target.value })
              }
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? `${errorId}-name` : undefined}
              autoFocus
            />
            {errors.name && (
              <span
                className="field-error"
                id={`${errorId}-name`}
                role="alert"
              >
                {errors.name}
              </span>
            )}
          </label>
          <label className="recipe-name-field">
            <span>Category</span>
            <select
              value={draft.category ?? ''}
              onChange={(event) =>
                onDraftChange({
                  ...draft,
                  category:
                    (event.target.value as RecipeCategory) || null,
                })
              }
            >
              <option value="">Uncategorized</option>
              {RECIPE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="recipe-name-field">
          <span>Preparation instructions</span>
          <textarea
            value={draft.instructions}
            onChange={(event) =>
              onDraftChange({
                ...draft,
                instructions: event.target.value,
              })
            }
            rows={3}
          />
        </label>

        <fieldset
          className="recipe-ingredients"
          aria-describedby={
            errors.ingredients ? `${errorId}-ingredients` : undefined
          }
        >
          <legend>Food ingredients</legend>
          {foodIngredients.length > 0 && (
            <div className="recipe-ingredient-list">
              {foodIngredients.map((ingredient) => {
                const food = foodsById.get(ingredient.foodId)
                const quantityError =
                  errors.fields[ingredient.foodId]?.quantity
                return (
                  <div className="recipe-ingredient" key={ingredient.foodId}>
                    <div>
                      <strong>{food?.name ?? 'Unavailable Food'}</strong>
                      <span>
                        {food?.category ??
                          `Food ID: ${ingredient.foodId} · Repair required`}
                      </span>
                    </div>
                    <label>
                      <span>Servings</span>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={ingredient.quantity}
                        onChange={(event) =>
                          onDraftChange(
                            updateFoodIngredientQuantity(
                              draft,
                              ingredient.foodId,
                              Number(event.target.value),
                            ),
                          )
                        }
                        aria-label={`Quantity for ${food?.name ?? ingredient.foodId}`}
                        aria-invalid={Boolean(quantityError)}
                      />
                      {quantityError && (
                        <span className="field-error" role="alert">
                          {quantityError}
                        </span>
                      )}
                    </label>
                    <div className="unresolved-actions">
                      {!food && (
                        <button
                          className="button button-quiet item-action"
                          type="button"
                          aria-expanded={replacingFoodId === ingredient.foodId}
                          onClick={() =>
                            setReplacingFoodId((current) =>
                              current === ingredient.foodId
                                ? null
                                : ingredient.foodId,
                            )
                          }
                          aria-label={`Replace unavailable Food ${ingredient.foodId}`}
                        >
                          Replace
                        </button>
                      )}
                      <button
                        className="icon-button danger"
                        type="button"
                        onClick={() =>
                          onDraftChange(
                            removeFoodIngredient(draft, ingredient.foodId),
                          )
                        }
                        aria-label={`Remove ${food?.name ?? ingredient.foodId}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    {!food && replacingFoodId === ingredient.foodId && (
                      <div className="unresolved-replacement">
                        <FoodPicker
                          foods={foods}
                          placeholder={`Choose replacement for ${ingredient.foodId}`}
                          onSelect={(replacement) => {
                            onDraftChange(
                              replaceFoodIngredient(
                                draft,
                                ingredient.foodId,
                                replacement.id,
                              ),
                            )
                            setReplacingFoodId(null)
                          }}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          <FoodPicker
            foods={foods}
            onSelect={(food) =>
              onDraftChange(addFoodIngredient(draft, food.id))
            }
            placeholder="Add a Food ingredient"
          />
        </fieldset>

        <fieldset className="recipe-ingredients">
          <legend>Recipe-only ingredients</legend>
          <div className="recipe-only-list">
            {recipeOnlyIngredients.map((ingredient, index) => (
              <RecipeOnlyIngredientFields
                key={ingredient.id}
                ingredient={ingredient}
                index={index}
                errors={errors.fields[ingredient.id] ?? {}}
                onChange={(updates) =>
                  onDraftChange(
                    updateRecipeOnlyIngredient(
                      draft,
                      ingredient.id,
                      updates,
                    ),
                  )
                }
                onRemove={() =>
                  onDraftChange(
                    removeRecipeOnlyIngredient(draft, ingredient.id),
                  )
                }
              />
            ))}
          </div>
          <button
            className="button button-secondary"
            type="button"
            onClick={() =>
              onDraftChange(
                addRecipeOnlyIngredient(
                  draft,
                  () => `recipe-ingredient-${crypto.randomUUID()}`,
                ),
              )
            }
          >
            <Plus size={15} /> Add Recipe-only ingredient
          </button>
        </fieldset>

        {errors.ingredients && (
          <p
            className="field-error recipe-ingredient-error"
            id={`${errorId}-ingredients`}
            role="alert"
          >
            {errors.ingredients}
          </p>
        )}
      </div>
      <div className="modal-actions">
        <button
          className="button button-quiet"
          type="button"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className="button button-primary"
          type="button"
          onClick={save}
        >
          Save Recipe
        </button>
      </div>
    </Modal>
  )
}

function RecipeOnlyIngredientFields({
  ingredient,
  index,
  errors,
  onChange,
  onRemove,
}: {
  ingredient: RecipeOnlyIngredient
  index: number
  errors: Record<string, string>
  onChange: (
    updates: Partial<Omit<RecipeOnlyIngredient, 'kind' | 'id'>>,
  ) => void
  onRemove: () => void
}) {
  const numericFields = [
    ['Weight (g)', 'weightGrams'],
    ['Calories', 'calories'],
    ['Fat (g)', 'fat'],
    ['Carbohydrates (g)', 'carbs'],
    ['Protein (g)', 'protein'],
    ['Fiber (g)', 'fiber'],
    ['Sugar (g)', 'sugar'],
    ['Sodium (mg)', 'sodium'],
    ['Potassium (mg)', 'potassium'],
  ] as const

  return (
    <fieldset className="recipe-only-ingredient">
      <legend>Recipe-only ingredient {index + 1}</legend>
      <div className="recipe-only-heading">
        <label>
          <span>Name</span>
          <input
            value={ingredient.name}
            onChange={(event) => onChange({ name: event.target.value })}
            aria-invalid={Boolean(errors.name)}
          />
          {errors.name && (
            <span className="field-error" role="alert">
              {errors.name}
            </span>
          )}
        </label>
        <button
          className="icon-button danger"
          type="button"
          onClick={onRemove}
          aria-label={`Remove Recipe-only ingredient ${index + 1}`}
        >
          <Trash2 size={15} />
        </button>
      </div>
      <div className="recipe-only-nutrition">
        {numericFields.map(([label, field]) => (
          <label key={field}>
            <span>{label}</span>
            <input
              type="number"
              min={field === 'weightGrams' ? '0.01' : '0'}
              step="any"
              value={ingredient[field]}
              onChange={(event) =>
                onChange({ [field]: Number(event.target.value) })
              }
              aria-invalid={Boolean(errors[field])}
            />
            {errors[field] && (
              <span className="field-error" role="alert">
                {errors[field]}
              </span>
            )}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
