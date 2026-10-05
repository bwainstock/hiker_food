import { Download, FileWarning, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { downloadText } from '../lib/download'
import { statePreview } from '../lib/state'
import type { Food, PlannerState } from '../types'
import { Modal } from './Ui'

export function RecoveryScreen({
  raw,
  summary,
  errors,
  storageError,
  builtInFoods,
  createStarterState,
  onReset,
}: {
  raw: string
  summary: string
  errors: string[]
  storageError: string | null
  builtInFoods: readonly Food[]
  createStarterState: () => PlannerState
  onReset: (state: PlannerState) => boolean
}) {
  const [resetTarget, setResetTarget] = useState<PlannerState | null>(null)
  const preview = resetTarget
    ? statePreview(resetTarget, builtInFoods)
    : null

  return (
    <main className="recovery-page">
      <section className="recovery-card" role="alert" aria-live="assertive">
        <div className="recovery-icon">
          <FileWarning size={30} />
        </div>
        <div>
          <span className="eyebrow">Data recovery</span>
          <h1>Your saved Plan cannot be loaded</h1>
          <p>
            {summary} The original browser payload has been preserved and will
            not be overwritten unless you explicitly reset.
          </p>
        </div>
        <ul className="validation-errors">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
        {storageError && <p className="field-error">{storageError}</p>}
        <div className="recovery-actions">
          <button
            className="button button-secondary"
            type="button"
            disabled={!raw}
            onClick={() =>
              downloadText(
                raw,
                'trail-rations-unreadable-browser-state.json',
                'application/octet-stream',
              )
            }
          >
            <Download size={16} /> Download raw payload
          </button>
          <button
            className="button button-primary"
            type="button"
            onClick={() => setResetTarget(createStarterState())}
          >
            <RotateCcw size={16} /> Reset saved Plan
          </button>
        </div>
      </section>

      {resetTarget && preview && (
        <Modal title="Reset unreadable browser data?" onClose={() => setResetTarget(null)}>
          <div className="modal-content">
            <p>
              Reset will replace the unreadable payload with a new starter Plan.
              Download the raw payload first if you may need it later.
            </p>
            <dl className="state-preview" aria-label="Reset preview">
              <div>
                <dt>Trail days</dt>
                <dd>{preview.trailDays}</dd>
              </div>
              <div>
                <dt>Plan items</dt>
                <dd>{preview.planItems}</dd>
              </div>
              <div>
                <dt>Custom foods</dt>
                <dd>{preview.customFoods}</dd>
              </div>
              <div>
                <dt>Recipes</dt>
                <dd>{preview.recipes}</dd>
              </div>
              <div>
                <dt>Unresolved items</dt>
                <dd>{preview.unresolvedItems}</dd>
              </div>
              <div>
                <dt>Incomplete Recipes</dt>
                <dd>{preview.incompleteRecipes}</dd>
              </div>
              <div>
                <dt>Unavailable Recipe ingredients</dt>
                <dd>{preview.unresolvedRecipeIngredients}</dd>
              </div>
            </dl>
          </div>
          <div className="modal-actions">
            <button
              className="button button-quiet"
              type="button"
              onClick={() => setResetTarget(null)}
              autoFocus
            >
              Cancel
            </button>
            <button
              className="button button-primary"
              type="button"
              onClick={() => onReset(resetTarget)}
            >
              Reset and continue
            </button>
          </div>
        </Modal>
      )}
    </main>
  )
}
