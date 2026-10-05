import { Buffer } from 'node:buffer'
import { createCustomFood } from '../../src/lib/customFood'
import { expect, test } from './fixtures'
import {
  emptyState,
  expectNoAxeViolations,
  launchWithRawState,
  launchWithState,
  navigateTo,
  selectImportFile,
  stateWithIncompleteRecipe,
  stateWithRecipe,
} from './helpers'

test('axe scan on every screen', async ({ page }) => {
  await launchWithState(page, emptyState())
  await expectNoAxeViolations(page)

  for (const screen of [
    'Shopping list',
    'Food library',
    'Recipes',
    'Electrolytes',
    'Na/K calculator',
    'Trail guide',
  ]) {
    await navigateTo(page, screen)
    await expectNoAxeViolations(page)
  }
})

test('axe scan on Recipe editor and validation errors', async ({ page }) => {
  await launchWithState(page, emptyState())
  await navigateTo(page, 'Recipes')
  await page.getByRole('button', { name: 'Create Recipe' }).click()
  await expectNoAxeViolations(page)
  await page.getByRole('button', { name: 'Save Recipe' }).click()
  await expectNoAxeViolations(page)
  await page
    .getByRole('button', { name: 'Add Recipe-only ingredient' })
    .click()
  await page.getByRole('button', { name: 'Save Recipe' }).click()
  await expectNoAxeViolations(page)
})

test('axe scan on incomplete Recipe surfaces and repair editor', async ({
  page,
}) => {
  await launchWithState(page, stateWithIncompleteRecipe())
  await expectNoAxeViolations(page)
  await navigateTo(page, 'Shopping list')
  await expectNoAxeViolations(page)
  await navigateTo(page, 'Recipes')
  await expectNoAxeViolations(page)
  await page.getByRole('button', { name: 'Edit Incomplete trail bowl' }).click()
  await expectNoAxeViolations(page)
})

test('axe scan on data-management modal surfaces', async ({ page }) => {
  await launchWithState(page, emptyState())

  await page.getByRole('button', { name: 'Reset' }).click()
  await expectNoAxeViolations(page)
  await page.getByRole('button', { name: 'Cancel' }).click()

  await page.getByRole('button', { name: 'Previous' }).click()
  await expectNoAxeViolations(page)
  await page
    .getByRole('dialog', { name: 'Previous valid state' })
    .getByRole('button', { name: 'Close' })
    .filter({ hasText: /^Close$/ })
    .click()

  const backup = JSON.stringify({
    schemaVersion: 2,
    state: emptyState(),
  })
  await selectImportFile(page, {
    name: 'valid.json',
    mimeType: 'application/json',
    buffer: Buffer.from(backup),
  })
  await expectNoAxeViolations(page)
  await page
    .getByRole('dialog', { name: 'Import this backup?' })
    .getByRole('button', { name: 'Cancel' })
    .click()

  await selectImportFile(page, {
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{'),
  })
  await expectNoAxeViolations(page)
  await page
    .getByRole('dialog', { name: 'Backup could not be imported' })
    .getByRole('button', { name: 'Keep current data' })
    .click()

  await page.getByRole('button', { name: 'Reset' }).click()
  await page.getByRole('button', { name: 'Reset Plan' }).click()
  await page.getByRole('button', { name: 'Previous' }).click()
  await page.getByRole('button', { name: 'Delete' }).click()
  await expectNoAxeViolations(page)
})

test('axe scan on custom-Food form', async ({ page }) => {
  await launchWithState(page, emptyState())
  await navigateTo(page, 'Food library')

  await page.getByRole('button', { name: 'Add food', exact: true }).click()
  await expectNoAxeViolations(page)
})

test('axe scan on custom-Food validation errors', async ({ page }) => {
  await launchWithState(page, emptyState())
  await navigateTo(page, 'Food library')

  await page.getByRole('button', { name: 'Add food', exact: true }).click()
  await page.getByRole('button', { name: 'Add to library' }).click()
  await expectNoAxeViolations(page)
})

test('axe scan on in-use custom-Food delete confirmation', async ({ page }) => {
  const custom = createCustomFood(
    {
      brand: 'Accessible',
      flavor: 'Meal',
      category: 'Entrée',
      prep: 'hot',
      servingGrams: 100,
      calories: 400,
      fat: 12,
      sodium: 500,
      potassium: 300,
      carbs: 60,
      fiber: 6,
      sugar: 4,
      protein: 16,
    },
    'custom-accessible',
  )
  const state = emptyState(undefined, [custom])
  state.days[0].meals.Dinner.push({
    id: 'accessible-item',
    target: { kind: 'food', id: custom.id },
    quantity: 1,
  })
  state.recipes.push({
    id: 'recipe-accessible',
    name: 'Accessible Recipe',
    category: null,
    instructions: null,
    ingredients: [
      { kind: 'food', foodId: custom.id, quantity: 1 },
    ],
  })
  await launchWithState(page, state)
  await navigateTo(page, 'Food library')

  await page.getByRole('textbox', { name: 'Search foods' }).fill('Accessible Meal')
  await page.getByRole('button', { name: 'Delete Accessible Meal' }).click()
  await expectNoAxeViolations(page)
})

test('axe scan on placed Recipe delete confirmation', async ({ page }) => {
  await launchWithState(page, stateWithRecipe({ placed: true }))
  await navigateTo(page, 'Recipes')

  await page.getByRole('button', { name: 'Delete Trail bowl' }).click()
  await expectNoAxeViolations(page)
})

test('axe scan on malformed-state recovery and reset confirmation', async ({
  page,
}) => {
  await launchWithRawState(page, '{"days":')
  await expect(
    page.getByRole('heading', { name: 'Your saved Plan cannot be loaded' }),
  ).toBeVisible()
  await expectNoAxeViolations(page)
  await page.getByRole('button', { name: 'Reset saved Plan' }).click()
  await expectNoAxeViolations(page)
})
