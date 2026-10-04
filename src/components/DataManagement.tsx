import {
  Download,
  FileWarning,
  History,
  RotateCcw,
  Upload,
} from 'lucide-react'
import { useRef, useState } from 'react'
import type { PreviousState } from '../hooks/usePlannerState'
import { downloadBlob, downloadText } from '../lib/download'
import {
  MAX_IMPORT_BYTES,
  parsePlannerStateText,
  serializePlannerState,
  statePreview,
} from '../lib/state'
import type { Food, PlannerState } from '../types'
import { Modal } from './Ui'

type Dialog =
  | { type: 'reset'; target: PlannerState }
  | {
      type: 'import-preview'
      target: PlannerState
      filename: string
      source: 'legacy-v0' | 'v1'
    }
  | {
      type: 'import-error'
      raw: Blob
      filename: string
      summary: string
      errors: string[]
    }
  | { type: 'previous' }
  | { type: 'delete-previous' }
  | null

function Preview({
  state,
  builtInFoods,
}: {
  state: PlannerState
  builtInFoods: readonly Food[]
}) {
  const preview = statePreview(state, builtInFoods)
  return (
    <dl className="state-preview" aria-label="State preview">
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
        <dt>Unresolved items</dt>
        <dd>{preview.unresolvedItems}</dd>
      </div>
    </dl>
  )
}

export function DataManagement({
  state,
  previous,
  builtInFoods,
  createStarterState,
  replaceState,
  restorePrevious,
  deletePrevious,
  onStateReplaced,
}: {
  state: PlannerState
  previous: PreviousState
  builtInFoods: readonly Food[]
  createStarterState: () => PlannerState
  replaceState: (state: PlannerState) => boolean
  restorePrevious: () => boolean
  deletePrevious: () => boolean
  onStateReplaced: () => void
}) {
  const [dialog, setDialog] = useState<Dialog>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const exportCurrent = () => {
    downloadText(
      serializePlannerState(state),
      'trail-rations-backup-v1.json',
    )
  }

  const chooseImport = () => {
    fileInput.current?.click()
  }

  const readImport = async (file: File) => {
    if (file.size > MAX_IMPORT_BYTES) {
      setDialog({
        type: 'import-error',
        raw: file,
        filename: file.name,
        summary: 'The selected file is larger than 5 MB.',
        errors: ['Choose a Trail Rations backup no larger than 5 MB.'],
      })
      return
    }

    const raw = await file.text()
    const result = parsePlannerStateText(raw)
    if (!result.ok) {
      setDialog({
        type: 'import-error',
        raw: new Blob([raw], { type: file.type || 'application/json' }),
        filename: file.name,
        summary: result.summary,
        errors: result.errors,
      })
      return
    }
    setDialog({
      type: 'import-preview',
      target: result.state,
      filename: file.name,
      source: result.source,
    })
  }

  const confirmReplacement = (target: PlannerState) => {
    if (replaceState(target)) {
      setDialog(null)
      onStateReplaced()
    }
  }

  return (
    <>
      <input
        ref={fileInput}
        hidden
        type="file"
        accept="application/json,.json"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void readImport(file)
        }}
      />
      <button
        className="button button-quiet desktop-action"
        type="button"
        onClick={() =>
          setDialog({ type: 'reset', target: createStarterState() })
        }
      >
        <RotateCcw size={16} /> Reset
      </button>
      <button
        className="button button-quiet desktop-action"
        type="button"
        onClick={() => setDialog({ type: 'previous' })}
      >
        <History size={16} /> Previous
      </button>
      <button
        className="button button-secondary"
        type="button"
        onClick={chooseImport}
      >
        <Upload size={16} /> Import
      </button>
      <button
        className="button button-secondary"
        type="button"
        onClick={exportCurrent}
      >
        <Download size={16} /> Export
      </button>

      {dialog?.type === 'reset' && (
        <Modal title="Reset the Plan?" onClose={() => setDialog(null)}>
          <div className="modal-content">
            <p>
              Reset replaces the current Plan with the starter Plan. The current
              valid state becomes the one previous valid state.
            </p>
            <Preview state={dialog.target} builtInFoods={builtInFoods} />
          </div>
          <div className="modal-actions">
            <button
              className="button button-quiet"
              type="button"
              onClick={() => setDialog(null)}
              autoFocus
            >
              Cancel
            </button>
            <button
              className="button button-primary"
              type="button"
              onClick={() => confirmReplacement(dialog.target)}
            >
              Reset Plan
            </button>
          </div>
        </Modal>
      )}

      {dialog?.type === 'import-preview' && (
        <Modal title="Import this backup?" onClose={() => setDialog(null)}>
          <div className="modal-content">
            <p>
              <strong>{dialog.filename}</strong> is a{' '}
              {dialog.source === 'v1'
                ? 'version 1 backup'
                : 'legacy unversioned PlannerState'}
              . Import replaces, rather than merges with, the current Plan. The
              current valid state becomes the one previous valid state.
            </p>
            <Preview state={dialog.target} builtInFoods={builtInFoods} />
          </div>
          <div className="modal-actions">
            <button
              className="button button-quiet"
              type="button"
              onClick={() => setDialog(null)}
              autoFocus
            >
              Cancel
            </button>
            <button
              className="button button-primary"
              type="button"
              onClick={() => confirmReplacement(dialog.target)}
            >
              Replace current state
            </button>
          </div>
        </Modal>
      )}

      {dialog?.type === 'import-error' && (
        <Modal title="Backup could not be imported" onClose={() => setDialog(null)}>
          <div className="modal-content" role="alert">
            <div className="recovery-heading">
              <FileWarning size={22} />
              <p>
                <strong>{dialog.summary}</strong> Current data was not changed.
              </p>
            </div>
            <ul className="validation-errors">
              {dialog.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
          <div className="modal-actions">
            <button
              className="button button-secondary"
              type="button"
              onClick={() =>
                downloadBlob(dialog.raw, `invalid-${dialog.filename}`)
              }
            >
              <Download size={16} /> Download invalid file
            </button>
            <button
              className="button button-primary"
              type="button"
              onClick={() => setDialog(null)}
              autoFocus
            >
              Keep current data
            </button>
          </div>
        </Modal>
      )}

      {dialog?.type === 'previous' && (
        <Modal title="Previous valid state" onClose={() => setDialog(null)}>
          <div className="modal-content">
            {previous.status === 'valid' ? (
              <>
                <p>
                  Restore swaps the current and previous valid states, providing
                  one level of undo or redo.
                </p>
                <Preview state={previous.state} builtInFoods={builtInFoods} />
              </>
            ) : previous.status === 'invalid' ? (
              <div role="alert">
                <p>
                  <strong>The previous-state slot is not valid.</strong>{' '}
                  {previous.summary}
                </p>
                <ul className="validation-errors">
                  {previous.errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p>
                There is no previous valid state yet. Importing or resetting a
                valid Plan creates one.
              </p>
            )}
          </div>
          <div className="modal-actions modal-actions-split">
            <div>
              {previous.status !== 'none' && (
                <>
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => {
                      const raw =
                        previous.status === 'valid'
                          ? serializePlannerState(previous.state)
                          : previous.raw
                      downloadText(raw, 'trail-rations-previous-state.json')
                    }}
                  >
                    <Download size={16} /> Download
                  </button>
                  <button
                    className="button button-quiet danger"
                    type="button"
                    onClick={() => setDialog({ type: 'delete-previous' })}
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
            <div>
              <button
                className="button button-quiet"
                type="button"
                onClick={() => setDialog(null)}
                autoFocus
              >
                Close
              </button>
              {previous.status === 'valid' && (
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => {
                    if (restorePrevious()) {
                      setDialog(null)
                      onStateReplaced()
                    }
                  }}
                >
                  Restore and swap
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {dialog?.type === 'delete-previous' && (
        <Modal title="Delete the previous state?" onClose={() => setDialog(null)}>
          <div className="modal-content">
            <p>
              This permanently removes the one recovery slot. The current Plan
              is not changed.
            </p>
          </div>
          <div className="modal-actions">
            <button
              className="button button-quiet"
              type="button"
              onClick={() => setDialog({ type: 'previous' })}
              autoFocus
            >
              Cancel
            </button>
            <button
              className="button button-primary danger-button"
              type="button"
              onClick={() => {
                if (deletePrevious()) setDialog(null)
              }}
            >
              Delete previous state
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
