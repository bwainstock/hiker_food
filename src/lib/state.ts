import type { Food, PlannerState, PortableBackupV1 } from '../types'
import { MEALS } from '../types'
import { plannerStateSchema, portableBackupV1Schema } from './schemas'

export const PLANNER_STORAGE_KEY = 'trail-rations-plan-v1'
export const PREVIOUS_STATE_STORAGE_KEY =
  'trail-rations-plan-previous-valid-v1'
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024

export type ParsedStateSource = 'legacy-v0' | 'v1'

export interface StateParseSuccess {
  ok: true
  source: ParsedStateSource
  state: PlannerState
}

export interface StateParseFailure {
  ok: false
  kind: 'invalid-json' | 'invalid-state' | 'unsupported-version'
  summary: string
  errors: string[]
  raw: string
}

export type StateParseResult = StateParseSuccess | StateParseFailure

function describePath(path: PropertyKey[]) {
  if (path.length === 0) return 'root'
  return path
    .map((part, index) =>
      typeof part === 'number'
        ? `[${part}]`
        : `${index === 0 ? '' : '.'}${String(part)}`,
    )
    .join('')
}

function validationErrors(
  issues: { path: PropertyKey[]; message: string }[],
) {
  return issues.map((issue) => `${describePath(issue.path)}: ${issue.message}`)
}

export function parsePlannerStateText(raw: string): StateParseResult {
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch (error) {
    return {
      ok: false,
      kind: 'invalid-json',
      summary: 'The data is not valid JSON.',
      errors: [
        error instanceof Error ? error.message : 'JSON parsing failed.',
      ],
      raw,
    }
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'schemaVersion' in value
  ) {
    const version = (value as { schemaVersion?: unknown }).schemaVersion
    if (version !== 1) {
      return {
        ok: false,
        kind: 'unsupported-version',
        summary: `Schema version ${String(version)} is not supported.`,
        errors: [
          'This app can import schema version 1 and legacy unversioned PlannerState files.',
        ],
        raw,
      }
    }

    const result = portableBackupV1Schema.safeParse(value)
    if (!result.success) {
      return {
        ok: false,
        kind: 'invalid-state',
        summary: 'The version 1 backup is structurally invalid.',
        errors: validationErrors(result.error.issues),
        raw,
      }
    }
    return { ok: true, source: 'v1', state: result.data.state }
  }

  const result = plannerStateSchema.safeParse(value)
  if (!result.success) {
    return {
      ok: false,
      kind: 'invalid-state',
      summary: 'The legacy PlannerState is structurally invalid.',
      errors: validationErrors(result.error.issues),
      raw,
    }
  }
  return { ok: true, source: 'legacy-v0', state: result.data }
}

export function serializePlannerState(state: PlannerState) {
  const validState = plannerStateSchema.parse(state)
  const backup: PortableBackupV1 = {
    schemaVersion: 1,
    state: validState,
  }
  return JSON.stringify(backup, null, 2)
}

export function countPlanItems(state: PlannerState) {
  return state.days.reduce(
    (dayTotal, day) =>
      dayTotal +
      MEALS.reduce(
        (mealTotal, meal) => mealTotal + day.meals[meal].length,
        0,
      ),
    0,
  )
}

export interface UnresolvedPlanItem {
  dayId: string
  dayName: string
  meal: (typeof MEALS)[number]
  itemId: string
  foodId: string
  quantity: number
}

export function findUnresolvedPlanItems(
  state: PlannerState,
  foodsById: ReadonlyMap<string, Food>,
) {
  return state.days.flatMap((day) =>
    MEALS.flatMap((meal) =>
      day.meals[meal].flatMap((item): UnresolvedPlanItem[] =>
        foodsById.has(item.foodId)
          ? []
          : [
              {
                dayId: day.id,
                dayName: day.name,
                meal,
                itemId: item.id,
                foodId: item.foodId,
                quantity: item.quantity,
              },
            ],
      ),
    ),
  )
}

export function foodsByIdForState(
  state: PlannerState,
  builtInFoods: readonly Food[],
) {
  return new Map(
    [...builtInFoods, ...state.customFoods].map((food) => [food.id, food]),
  )
}

export function statePreview(
  state: PlannerState,
  builtInFoods: readonly Food[],
) {
  const foodsById = foodsByIdForState(state, builtInFoods)
  return {
    trailDays: state.days.length,
    planItems: countPlanItems(state),
    customFoods: state.customFoods.length,
    unresolvedItems: findUnresolvedPlanItems(state, foodsById).length,
  }
}

export function replaceFoodReferences(
  state: PlannerState,
  oldFoodId: string,
  newFoodId: string,
) {
  return {
    ...state,
    days: state.days.map((day) => ({
      ...day,
      meals: Object.fromEntries(
        MEALS.map((meal) => [
          meal,
          day.meals[meal].map((item) =>
            item.foodId === oldFoodId
              ? { ...item, foodId: newFoodId }
              : item,
          ),
        ]),
      ) as typeof day.meals,
    })),
  }
}

export function removeFoodReferences(
  state: PlannerState,
  foodId: string,
) {
  return {
    ...state,
    days: state.days.map((day) => ({
      ...day,
      meals: Object.fromEntries(
        MEALS.map((meal) => [
          meal,
          day.meals[meal].filter((item) => item.foodId !== foodId),
        ]),
      ) as typeof day.meals,
    })),
  }
}

export function countFoodReferences(state: PlannerState, foodId: string) {
  return state.days.reduce(
    (total, day) =>
      total +
      MEALS.reduce(
        (mealTotal, meal) =>
          mealTotal +
          day.meals[meal].filter((item) => item.foodId === foodId).length,
        0,
      ),
    0,
  )
}
