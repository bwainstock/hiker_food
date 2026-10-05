import {
  AlertTriangle,
  CookingPot,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { FoodPicker } from '../components/FoodPicker'
import { EmptyState, Modal } from '../components/Ui'
import {
  analyzeRecipeDeletion,
  deleteRecipe,
} from '../lib/deletion'
import {
  addFoodIngredient,
  addRecipeOnlyIngredient,
  createRecipeDraft,
  filterRecipes,
  formatRecipeCalories,
  removeFoodIngredient,
  removeRecipeOnlyIngredient,
  replaceFoodIngredient,
  resolveRecipe,
  resolveRecipeDraft,
  saveRecipeDraft,
  updateFoodIngredientQuantity,
  updateRecipeOnlyIngredient,
  validateRecipeDraft,
} from '../lib/recipe'
import {
  formatKnownNutritionValue,
  formatWeight,
  round,
  type NutritionSummary,
} from '../lib/nutrition'
import {
  RECIPE_CATEGORIES,
  type Food,
  type PlannerState,
  type PlannerStateUpdater,
  type Recipe,
  type RecipeCategory,
  type RecipeOnlyIngredient,
} from '../types'
import type {
  RecipeDraft,
  ResolvedRecipeIngredient,
} from '../lib/recipe'

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
  const [pendingDelete, setPendingDelete] = useState<Recipe | null>(null)
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
  const requestDelete = (recipe: Recipe) => {
    const impact = analyzeRecipeDeletion(state, recipe.id)
    if (impact.planItemCount === 0) {
      setState((current) => deleteRecipe(current, recipe.id))
      return
    }
    setPendingDelete(recipe)
  }
  const pendingImpact = pendingDelete
    ? analyzeRecipeDeletion(state, pendingDelete.id)
    : null

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
              onDelete={() => requestDelete(recipe)}
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
      {pendingDelete && pendingImpact && (
        <Modal
          title={`Delete ${pendingDelete.name}?`}
          onClose={() => setPendingDelete(null)}
        >
          <div className="modal-content">
            <p>
              This Recipe is used by{' '}
              <strong>
                {pendingImpact.planItemCount} Plan item
                {pendingImpact.planItemCount === 1 ? '' : 's'}
              </strong>
              . Deleting it removes the Recipe and all of those placements.
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
                  deleteRecipe(current, pendingDelete.id),
                )
                setPendingDelete(null)
              }}
            >
              Delete Recipe and {pendingImpact.planItemCount} Plan item
              {pendingImpact.planItemCount === 1 ? '' : 's'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function RecipeCard({
  recipe,
  foodsById,
  onEdit,
  onDelete,
}: {
  recipe: Recipe
  foodsById: ReadonlyMap<string, Food>
  onEdit: () => void
  onDelete: () => void
}) {
  const summary = resolveRecipe(recipe, foodsById)
  const { nutrition, known } = summary
  const metrics = [
    [
      'Weight',
      `${formatKnownNutritionValue(
        formatWeight(nutrition.weightOz),
        known.weightOz,
      )} · ${formatKnownNutritionValue(
        `${round(nutrition.weightGrams, 1)} g`,
        known.weightGrams,
      )}`,
    ],
    ['Calories', formatNutritionValue(summary, 'calories')],
    ['Fat', formatNutritionValue(summary, 'fat')],
    ['Carbohydrates', formatNutritionValue(summary, 'carbs')],
    ['Protein', formatNutritionValue(summary, 'protein')],
    ['Fiber', formatNutritionValue(summary, 'fiber')],
    ['Sugar', formatNutritionValue(summary, 'sugar')],
    ['Sodium', formatNutritionValue(summary, 'sodium')],
    ['Potassium', formatNutritionValue(summary, 'potassium')],
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
        <div className="recipe-card-actions">
          <button
            className="button button-secondary"
            type="button"
            onClick={onEdit}
            aria-label={`Edit ${recipe.name}`}
          >
            <Pencil size={14} /> Edit
          </button>
          <button
            className="icon-button danger"
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${recipe.name}`}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
      {recipe.instructions && (
        <p className="recipe-instructions">{recipe.instructions}</p>
      )}
      {!summary.complete && (
        <div className="recipe-warning" role="status">
          <strong>Known totals only — this Recipe is incomplete.</strong>
          {summary.unavailableFoodReferences.length > 0 && (
            <span>
              Repair unavailable Food
              {summary.unavailableFoodReferences.length === 1 ? '' : 's'}:{' '}
              {summary.unavailableFoodReferences
                .map(
                  (ingredient) =>
                    `${ingredient.foodId} (${round(ingredient.quantity, 3)} servings)`,
                )
                .join(', ')}
            </span>
          )}
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
  const [recipeOnlyBaselines, setRecipeOnlyBaselines] = useState<
    Record<string, RecipeOnlyIngredient>
  >(() =>
    Object.fromEntries(
      draft.ingredients.flatMap((ingredient) =>
        ingredient.kind === 'recipe-only' &&
        isRecipeOnlyNutritionBaseline(ingredient)
          ? [[ingredient.id, ingredient]]
          : [],
      ),
    ),
  )

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
  const liveSummary = useMemo(
    () => resolveRecipeDraft(draft, foodsById),
    [draft, foodsById],
  )
  const contributionsByKey = useMemo(
    () =>
      new Map(
        liveSummary.contributions.map((contribution) => [
          contribution.key,
          contribution,
        ]),
      ),
    [liveSummary.contributions],
  )
  const changeRecipeOnlyIngredient = (
    ingredientId: string,
    updates: Partial<Omit<RecipeOnlyIngredient, 'kind' | 'id'>>,
  ) => {
    const nextDraft = updateRecipeOnlyIngredient(
      draft,
      ingredientId,
      updates,
      recipeOnlyBaselines[ingredientId],
    )
    const nextIngredient = nextDraft.ingredients.find(
      (ingredient): ingredient is RecipeOnlyIngredient =>
        ingredient.kind === 'recipe-only' &&
        ingredient.id === ingredientId,
    )
    if (nextIngredient && isRecipeOnlyNutritionBaseline(nextIngredient)) {
      setRecipeOnlyBaselines((current) => ({
        ...current,
        [ingredientId]: nextIngredient,
      }))
    }
    onDraftChange(nextDraft)
  }

  return (
    <Modal
      title={title}
      onClose={onCancel}
      className="recipe-editor-modal"
    >
      <div className="recipe-editor-layout">
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
                const contribution = contributionsByKey.get(
                  ingredient.foodId,
                )
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
                        min="0.001"
                        step="0.001"
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
                        aria-invalid={
                          Boolean(quantityError) ||
                          contribution?.valid === false
                        }
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
                    {contribution && (
                      <IngredientNutrition contribution={contribution} />
                    )}
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
                contribution={contributionsByKey.get(ingredient.id)}
                onChange={(updates) =>
                  changeRecipeOnlyIngredient(ingredient.id, updates)
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
        <RecipeNutritionSummary
          ingredientCount={draft.ingredients.length}
          summary={liveSummary}
          complete={liveSummary.complete}
        />
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

type DisplayNutritionKey =
  | 'calories'
  | 'fat'
  | 'carbs'
  | 'protein'
  | 'fiber'
  | 'sugar'
  | 'sodium'
  | 'potassium'

const CORE_NUTRITION_FIELDS = [
  ['Calories', 'calories'],
  ['Fat', 'fat'],
  ['Carbohydrates', 'carbs'],
  ['Protein', 'protein'],
] as const satisfies readonly (readonly [string, DisplayNutritionKey])[]

const DETAIL_NUTRITION_FIELDS = [
  ['Fiber', 'fiber'],
  ['Sugar', 'sugar'],
  ['Sodium', 'sodium'],
  ['Potassium', 'potassium'],
] as const satisfies readonly (readonly [string, DisplayNutritionKey])[]

function isRecipeOnlyNutritionBaseline(
  ingredient: RecipeOnlyIngredient,
) {
  const nutritionValues = [
    ingredient.calories,
    ingredient.fat,
    ingredient.carbs,
    ingredient.protein,
    ingredient.fiber,
    ingredient.sugar,
    ingredient.sodium,
    ingredient.potassium,
  ]
  return (
    Number.isFinite(ingredient.weightGrams) &&
    ingredient.weightGrams > 0 &&
    nutritionValues.every(
      (value) =>
        value === null ||
        (Number.isFinite(value) && value >= 0),
    )
  )
}

function formatNutritionValue(
  summary: NutritionSummary,
  key: DisplayNutritionKey,
) {
  const value = summary.nutrition[key]
  const formatted =
    key === 'calories'
      ? formatRecipeCalories(value)
      : key === 'sodium' || key === 'potassium'
        ? `${round(value)} mg`
        : `${round(value, 1)} g`
  return formatKnownNutritionValue(formatted, summary.known[key])
}

function NutritionMetricList({
  fields,
  summary,
  className,
}: {
  fields: readonly (readonly [string, DisplayNutritionKey])[]
  summary: NutritionSummary
  className: string
}) {
  return (
    <dl className={className}>
      {fields.map(([label, key]) => (
        <div key={key}>
          <dt>{label}</dt>
          <dd>{formatNutritionValue(summary, key)}</dd>
        </div>
      ))}
    </dl>
  )
}

function IngredientNutrition({
  contribution,
}: {
  contribution: ResolvedRecipeIngredient
}) {
  if (!contribution.valid || !contribution.available) {
    return (
      <div className="ingredient-nutrition ingredient-nutrition-incomplete">
        <AlertTriangle size={14} aria-hidden="true" />
        <span>
          {contribution.valid
            ? 'Unavailable Food — excluded from totals.'
            : 'Incomplete ingredient — excluded from totals.'}
        </span>
      </div>
    )
  }

  return (
    <div className="ingredient-nutrition">
      <NutritionMetricList
        fields={CORE_NUTRITION_FIELDS}
        summary={contribution}
        className="ingredient-core-nutrition"
      />
      <details>
        <summary>Fiber, sugar, sodium, and potassium</summary>
        <NutritionMetricList
          fields={DETAIL_NUTRITION_FIELDS}
          summary={contribution}
          className="ingredient-detail-nutrition"
        />
      </details>
      {!contribution.complete && (
        <span className="nutrition-incomplete-label">
          Some nutrition values are unknown.
        </span>
      )}
    </div>
  )
}

function RecipeNutritionSummary({
  ingredientCount,
  summary,
  complete,
}: {
  ingredientCount: number
  summary: NutritionSummary
  complete: boolean
}) {
  return (
    <aside
      className="recipe-live-summary"
      aria-label="Live Recipe nutrition"
      aria-live="polite"
    >
      <span className="eyebrow">Whole Recipe</span>
      <h3>Live nutrition</h3>
      {ingredientCount === 0 ? (
        <p>Add ingredients to see nutrition.</p>
      ) : (
        <>
          {!complete && (
            <div className="live-summary-warning">
              <AlertTriangle size={14} aria-hidden="true" />
              <span>Known totals shown; some values are incomplete.</span>
            </div>
          )}
          <NutritionMetricList
            fields={CORE_NUTRITION_FIELDS}
            summary={summary}
            className="live-summary-core"
          />
          <details>
            <summary>Fiber, sugar, sodium, and potassium</summary>
            <NutritionMetricList
              fields={DETAIL_NUTRITION_FIELDS}
              summary={summary}
              className="live-summary-details"
            />
          </details>
        </>
      )}
    </aside>
  )
}

function RecipeOnlyIngredientFields({
  ingredient,
  index,
  errors,
  contribution,
  onChange,
  onRemove,
}: {
  ingredient: RecipeOnlyIngredient
  index: number
  errors: Record<string, string>
  contribution?: ResolvedRecipeIngredient
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
              value={ingredient[field] ?? ''}
              onChange={(event) => {
                const value = event.target.value
                onChange({
                  [field]:
                    field === 'weightGrams'
                      ? Number(value)
                      : value === ''
                        ? null
                        : Number(value),
                })
              }}
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
      {contribution && (
        <IngredientNutrition contribution={contribution} />
      )}
    </fieldset>
  )
}
