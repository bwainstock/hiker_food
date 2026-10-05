import { CookingPot, Pencil, Plus, Trash2 } from 'lucide-react'
import { useId, useState } from 'react'
import { FoodPicker } from '../components/FoodPicker'
import { EmptyState, Modal } from '../components/Ui'
import {
  addFoodIngredient,
  createRecipeDraft,
  removeFoodIngredient,
  resolveFoodRecipe,
  saveRecipeDraft,
  updateFoodIngredientQuantity,
  validateRecipeDraft,
} from '../lib/recipe'
import { formatWeight, round } from '../lib/nutrition'
import type {
  Food,
  PlannerState,
  PlannerStateUpdater,
  Recipe,
} from '../types'
import type { RecipeDraft } from '../lib/recipe'

interface RecipeErrors {
  name?: string
  ingredients?: string
  quantities: Record<string, string>
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

  const createRecipe = () =>
    setEditor({ title: 'Create Recipe', draft: createRecipeDraft() })
  const editRecipe = (recipe: Recipe) =>
    setEditor({
      title: `Edit ${recipe.name}`,
      draft: createRecipeDraft(recipe),
    })

  return (
    <div className="recipes-page">
      {state.recipes.length === 0 ? (
        <EmptyState
          icon={<CookingPot size={27} />}
          title="No Recipes yet"
          description="Combine Foods into a reusable one-serving Recipe with live nutrition totals."
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
      ) : (
        <>
          <div className="recipes-toolbar">
            <p>
              {state.recipes.length} saved Recipe
              {state.recipes.length === 1 ? '' : 's'}
            </p>
            <button
              className="button button-primary"
              type="button"
              onClick={createRecipe}
            >
              <Plus size={16} /> Create Recipe
            </button>
          </div>
          <section className="recipe-grid" aria-label="Saved Recipes">
            {state.recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                foodsById={foodsById}
                onEdit={() => editRecipe(recipe)}
              />
            ))}
          </section>
        </>
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
    ['Weight', `${formatWeight(nutrition.weightOz)} · ${round(nutrition.weightGrams, 1)} g`],
    ['Calories', `${round(nutrition.calories)} kcal`],
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
          <span className="eyebrow">One serving</span>
          <h2>{recipe.name}</h2>
          <p>
            {summary.ingredientCount} Food ingredient
            {summary.ingredientCount === 1 ? '' : 's'}
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
      {!summary.complete && (
        <p className="recipe-warning" role="status">
          Some Foods are unavailable, so these totals are incomplete.
        </p>
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
  const nameErrorId = useId()
  const ingredientErrorId = useId()
  const [errors, setErrors] = useState<RecipeErrors>({
    quantities: {},
  })

  const save = () => {
    const result = validateRecipeDraft(draft)
    if (result.success) {
      onSave(draft)
      return
    }

    const next: RecipeErrors = { quantities: {} }
    result.error.issues.forEach((issue) => {
      if (issue.path[0] === 'name') next.name = issue.message
      if (issue.path[0] !== 'ingredients') return
      if (typeof issue.path[1] === 'number' && issue.path[2] === 'quantity') {
        const ingredient = draft.ingredients[issue.path[1]]
        if (ingredient) next.quantities[ingredient.foodId] = issue.message
      } else {
        next.ingredients = issue.message
      }
    })
    setErrors(next)
  }

  return (
    <Modal title={title} onClose={onCancel}>
      <div className="recipe-form">
        <label className="recipe-name-field">
          <span>Recipe name</span>
          <input
            value={draft.name}
            onChange={(event) =>
              onDraftChange({ ...draft, name: event.target.value })
            }
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? nameErrorId : undefined}
            autoFocus
          />
          {errors.name && (
            <span className="field-error" id={nameErrorId} role="alert">
              {errors.name}
            </span>
          )}
        </label>

        <fieldset
          className="recipe-ingredients"
          aria-describedby={
            errors.ingredients ? ingredientErrorId : undefined
          }
        >
          <legend>Food ingredients</legend>
          {draft.ingredients.length > 0 && (
            <div className="recipe-ingredient-list">
              {draft.ingredients.map((ingredient) => {
                const food = foodsById.get(ingredient.foodId)
                const quantityError = errors.quantities[ingredient.foodId]
                const quantityErrorId = `${ingredientErrorId}-${ingredient.foodId}`
                return (
                  <div
                    className="recipe-ingredient"
                    key={ingredient.foodId}
                  >
                    <div>
                      <strong>{food?.name ?? 'Unavailable Food'}</strong>
                      <span>{food?.category ?? ingredient.foodId}</span>
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
                        aria-describedby={
                          quantityError ? quantityErrorId : undefined
                        }
                      />
                      {quantityError && (
                        <span
                          className="field-error"
                          id={quantityErrorId}
                          role="alert"
                        >
                          {quantityError}
                        </span>
                      )}
                    </label>
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
          {errors.ingredients && (
            <p
              className="field-error recipe-ingredient-error"
              id={ingredientErrorId}
              role="alert"
            >
              {errors.ingredients}
            </p>
          )}
        </fieldset>
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
