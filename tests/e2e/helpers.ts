import AxeBuilder from '@axe-core/playwright'
import type { Download, Page } from '@playwright/test'
import { expect } from './fixtures'
import { createEmptyMeals } from '../../src/lib/planner'
import {
  PLANNER_STORAGE_KEY,
  PREVIOUS_STATE_STORAGE_KEY,
} from '../../src/lib/state'
import type { DayPlan, Food, PlannerState } from '../../src/types'

const INIT_MARKER = 'trail-rations-e2e-initialized'

export function fixedDay(
  id = 'day-1',
  name = 'Day 1',
): DayPlan {
  return { id, name, meals: createEmptyMeals() }
}

export function emptyState(
  day = fixedDay(),
  customFoods: Food[] = [],
): PlannerState {
  return { days: [day], customFoods, recipes: [] }
}

export async function launchWithState(page: Page, state: PlannerState) {
  await page.addInitScript(
    ({ marker, currentKey, previousKey, serialized }) => {
      if (sessionStorage.getItem(marker)) return
      localStorage.clear()
      localStorage.setItem(currentKey, serialized)
      localStorage.removeItem(previousKey)
      sessionStorage.setItem(marker, 'true')
    },
    {
      marker: INIT_MARKER,
      currentKey: PLANNER_STORAGE_KEY,
      previousKey: PREVIOUS_STATE_STORAGE_KEY,
      serialized: JSON.stringify({ schemaVersion: 2, state }),
    },
  )
  await page.goto('/')
}

export async function launchWithRawState(page: Page, raw: string) {
  await page.addInitScript(
    ({ marker, currentKey, previousKey, rawValue }) => {
      if (sessionStorage.getItem(marker)) return
      localStorage.clear()
      localStorage.setItem(currentKey, rawValue)
      localStorage.removeItem(previousKey)
      sessionStorage.setItem(marker, 'true')
    },
    {
      marker: INIT_MARKER,
      currentKey: PLANNER_STORAGE_KEY,
      previousKey: PREVIOUS_STATE_STORAGE_KEY,
      rawValue: raw,
    },
  )
  await page.goto('/')
}

export async function launchClean(page: Page) {
  await page.addInitScript(
    ({ marker }) => {
      if (sessionStorage.getItem(marker)) return
      localStorage.clear()
      sessionStorage.setItem(marker, 'true')
    },
    { marker: INIT_MARKER },
  )
  await page.goto('/')
}

export async function navigateTo(page: Page, name: string) {
  await page.getByRole('button', { name: new RegExp(`^${name}`) }).click()
}

export async function selectImportFile(
  page: Page,
  file: { name: string; mimeType: string; buffer: Buffer },
) {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Import', exact: true }).click(),
  ])
  await chooser.setFiles(file)
}

export async function addFood(
  page: Page,
  meal: string,
  foodName: string,
) {
  const mealRegion = page.getByRole('article', { name: meal })
  const picker = mealRegion.getByRole('combobox')
  await picker.fill(foodName)
  await mealRegion.getByRole('option', { name: new RegExp(foodName) }).click()
}

export async function readDownload(download: Download) {
  const stream = await download.createReadStream()
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString('utf8')
}

export async function expectNoAxeViolations(page: Page) {
  const result = await new AxeBuilder({ page }).analyze()
  const summary = result.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    targets: violation.nodes.map((node) => node.target.join(' ')),
  }))
  expect(summary).toEqual([])
}

export async function tabUntil(
  page: Page,
  predicate: (active: {
    label: string
    text: string
    role: string
  }) => boolean,
  direction: 'forward' | 'backward' = 'forward',
  limit = 60,
) {
  for (let index = 0; index < limit; index += 1) {
    await page.keyboard.press(direction === 'forward' ? 'Tab' : 'Shift+Tab')
    const active = await page.evaluate(() => {
      const element = document.activeElement
      return {
        label: element?.getAttribute('aria-label') ?? '',
        text: element?.textContent?.trim() ?? '',
        role: element?.getAttribute('role') ?? '',
      }
    })
    if (predicate(active)) return active
  }
  throw new Error('Could not reach the requested control with the keyboard.')
}
