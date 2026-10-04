import type { Electrolyte, Food } from '../types'

export const EN_US_COLLATOR = new Intl.Collator('en-US', {
  numeric: true,
  sensitivity: 'base',
  usage: 'sort',
})

function compareText(a: string, b: string) {
  return EN_US_COLLATOR.compare(a, b)
}

function finiteOrNull(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function compareNullableNumbersDescending(
  left: number | null | undefined,
  right: number | null | undefined,
) {
  const a = finiteOrNull(left)
  const b = finiteOrNull(right)
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  return b - a
}

export type FoodSortKey = 'density' | 'calories' | 'protein' | 'name'

export function filterAndSortFoods(
  foods: readonly Food[],
  {
    query,
    category,
    sort,
  }: { query: string; category: string; sort: FoodSortKey },
) {
  const normalized = query.trim().toLocaleLowerCase('en-US')
  const words = normalized ? normalized.split(/\s+/) : []

  return foods
    .filter((food) => {
      if (category !== 'All' && food.category !== category) return false
      const haystack =
        `${food.brand ?? ''} ${food.flavor ?? ''} ${food.name} ${food.category ?? ''} ${food.prep ?? ''}`.toLocaleLowerCase(
          'en-US',
        )
      return words.every((word) => haystack.includes(word))
    })
    .sort((a, b) => {
      const numericKey =
        sort === 'density'
          ? 'caloriesPerOz'
          : sort === 'name'
            ? null
            : sort
      const primary = numericKey
        ? compareNullableNumbersDescending(a[numericKey], b[numericKey])
        : compareText(a.name, b.name)
      return (
        primary ||
        compareText(a.name, b.name) ||
        compareText(a.id, b.id)
      )
    })
}

export function searchFoods(foods: readonly Food[], query: string) {
  const normalized = query.trim().toLocaleLowerCase('en-US')
  if (!normalized) return foods.slice(0, 8)
  const words = normalized.split(/\s+/)
  return foods
    .filter((food) => {
      const haystack =
        `${food.brand ?? ''} ${food.flavor ?? ''} ${food.name} ${food.category ?? ''} ${food.prep ?? ''}`.toLocaleLowerCase(
          'en-US',
        )
      return words.every((word) => haystack.includes(word))
    })
    .slice(0, 12)
}

export type ElectrolyteSortKey =
  | 'sodium'
  | 'potassium'
  | 'servingGrams'
  | 'ratio'

export function filterAndSortElectrolytes(
  electrolytes: readonly Electrolyte[],
  query: string,
  sort: ElectrolyteSortKey,
) {
  const normalized = query.trim().toLocaleLowerCase('en-US')
  return electrolytes
    .filter((item) =>
      `${item.brand} ${item.flavor ?? ''}`
        .toLocaleLowerCase('en-US')
        .includes(normalized),
    )
    .sort((a, b) => {
      const key = sort === 'ratio' ? 'sodiumPotassiumRatio' : sort
      return (
        compareNullableNumbersDescending(a[key], b[key]) ||
        compareText(
          `${a.brand} ${a.flavor ?? ''}`,
          `${b.brand} ${b.flavor ?? ''}`,
        ) ||
        compareText(a.id, b.id)
      )
    })
}
