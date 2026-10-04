import { useCallback, useEffect, useRef, useState } from 'react'
import type { PlannerState, PlannerStateUpdater } from '../types'
import { plannerStateSchema } from '../lib/schemas'
import {
  PLANNER_STORAGE_KEY,
  PREVIOUS_STATE_STORAGE_KEY,
  parsePlannerStateText,
  serializePlannerState,
} from '../lib/state'

interface ValidPreviousState {
  status: 'valid'
  state: PlannerState
}

interface InvalidPreviousState {
  status: 'invalid'
  raw: string
  summary: string
  errors: string[]
}

interface MissingPreviousState {
  status: 'none'
}

export type PreviousState =
  | ValidPreviousState
  | InvalidPreviousState
  | MissingPreviousState

interface ReadySnapshot {
  status: 'ready'
  state: PlannerState
  previous: PreviousState
  storageError: string | null
}

interface RecoverySnapshot {
  status: 'recovery'
  raw: string
  summary: string
  errors: string[]
  previous: PreviousState
  storageError: string | null
}

export type PlannerSnapshot = ReadySnapshot | RecoverySnapshot

function storageErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'The browser storage operation failed.'
}

function readPreviousState(): PreviousState {
  const raw = localStorage.getItem(PREVIOUS_STATE_STORAGE_KEY)
  if (raw === null) return { status: 'none' }
  const parsed = parsePlannerStateText(raw)
  return parsed.ok
    ? { status: 'valid', state: parsed.state }
    : {
        status: 'invalid',
        raw,
        summary: parsed.summary,
        errors: parsed.errors,
      }
}

function initializeSnapshot(createInitialState: () => PlannerState): PlannerSnapshot {
  let previous: PreviousState = { status: 'none' }
  try {
    previous = readPreviousState()
    const raw = localStorage.getItem(PLANNER_STORAGE_KEY)
    if (raw === null) {
      const state = plannerStateSchema.parse(createInitialState())
      try {
        localStorage.setItem(PLANNER_STORAGE_KEY, serializePlannerState(state))
        return { status: 'ready', state, previous, storageError: null }
      } catch (error) {
        return {
          status: 'ready',
          state,
          previous,
          storageError: storageErrorMessage(error),
        }
      }
    }

    const parsed = parsePlannerStateText(raw)
    if (parsed.ok) {
      return {
        status: 'ready',
        state: parsed.state,
        previous,
        storageError: null,
      }
    }
    return {
      status: 'recovery',
      raw,
      summary: parsed.summary,
      errors: parsed.errors,
      previous,
      storageError: null,
    }
  } catch (error) {
    return {
      status: 'recovery',
      raw: '',
      summary: 'The browser state could not be read.',
      errors: [storageErrorMessage(error)],
      previous,
      storageError: storageErrorMessage(error),
    }
  }
}

function restoreStorageValues(values: Map<string, string | null>) {
  values.forEach((value, key) => {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  })
}

function writeStorageTransaction(entries: [string, string | null][]) {
  const original = new Map(
    entries.map(([key]) => [key, localStorage.getItem(key)]),
  )
  try {
    entries.forEach(([key, value]) => {
      if (value === null) localStorage.removeItem(key)
      else localStorage.setItem(key, value)
    })
  } catch (error) {
    try {
      restoreStorageValues(original)
    } catch {
      // The original error remains the actionable failure.
    }
    throw error
  }
}

export function usePlannerState(createInitialState: () => PlannerState) {
  const [snapshot, setSnapshot] = useState<PlannerSnapshot>(() =>
    initializeSnapshot(createInitialState),
  )
  const snapshotRef = useRef(snapshot)
  useEffect(() => {
    snapshotRef.current = snapshot
  }, [snapshot])

  const publish = useCallback((next: PlannerSnapshot) => {
    snapshotRef.current = next
    setSnapshot(next)
  }, [])

  const setState: PlannerStateUpdater = useCallback(
    (updater) => {
      const current = snapshotRef.current
      if (current.status !== 'ready') return
      const nextState = plannerStateSchema.parse(updater(current.state))
      try {
        localStorage.setItem(
          PLANNER_STORAGE_KEY,
          serializePlannerState(nextState),
        )
        publish({ ...current, state: nextState, storageError: null })
      } catch (error) {
        publish({
          ...current,
          storageError: storageErrorMessage(error),
        })
      }
    },
    [publish],
  )

  const replaceState = useCallback(
    (next: PlannerState) => {
      const current = snapshotRef.current
      if (current.status !== 'ready') return false
      const nextState = plannerStateSchema.parse(next)
      try {
        writeStorageTransaction([
          [
            PREVIOUS_STATE_STORAGE_KEY,
            serializePlannerState(current.state),
          ],
          [PLANNER_STORAGE_KEY, serializePlannerState(nextState)],
        ])
        publish({
          status: 'ready',
          state: nextState,
          previous: { status: 'valid', state: current.state },
          storageError: null,
        })
        return true
      } catch (error) {
        publish({
          ...current,
          storageError: storageErrorMessage(error),
        })
        return false
      }
    },
    [publish],
  )

  const restorePrevious = useCallback(() => {
    const current = snapshotRef.current
    if (current.status !== 'ready' || current.previous.status !== 'valid') {
      return false
    }
    try {
      writeStorageTransaction([
        [PLANNER_STORAGE_KEY, serializePlannerState(current.previous.state)],
        [
          PREVIOUS_STATE_STORAGE_KEY,
          serializePlannerState(current.state),
        ],
      ])
      publish({
        status: 'ready',
        state: current.previous.state,
        previous: { status: 'valid', state: current.state },
        storageError: null,
      })
      return true
    } catch (error) {
      publish({
        ...current,
        storageError: storageErrorMessage(error),
      })
      return false
    }
  }, [publish])

  const deletePrevious = useCallback(() => {
    const current = snapshotRef.current
    try {
      localStorage.removeItem(PREVIOUS_STATE_STORAGE_KEY)
      publish({ ...current, previous: { status: 'none' }, storageError: null })
      return true
    } catch (error) {
      publish({
        ...current,
        storageError: storageErrorMessage(error),
      })
      return false
    }
  }, [publish])

  const recoverWithReset = useCallback(
    (next: PlannerState) => {
      const current = snapshotRef.current
      if (current.status !== 'recovery') return false
      const nextState = plannerStateSchema.parse(next)
      try {
        localStorage.setItem(
          PLANNER_STORAGE_KEY,
          serializePlannerState(nextState),
        )
        publish({
          status: 'ready',
          state: nextState,
          previous: current.previous,
          storageError: null,
        })
        return true
      } catch (error) {
        publish({
          ...current,
          storageError: storageErrorMessage(error),
        })
        return false
      }
    },
    [publish],
  )

  return {
    snapshot,
    setState,
    replaceState,
    restorePrevious,
    deletePrevious,
    recoverWithReset,
  }
}
