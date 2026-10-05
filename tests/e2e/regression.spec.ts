import { Buffer } from 'node:buffer'
import { createCustomFood } from '../../src/lib/customFood'
import {
  MAX_IMPORT_BYTES,
  PLANNER_STORAGE_KEY,
} from '../../src/lib/state'
import { expect, test } from './fixtures'
import {
  emptyState,
  fixedDay,
  launchWithRawState,
  launchWithState,
  navigateTo,
  readDownload,
  selectImportFile,
  stateWithRecipe,
  stateWithIncompleteRecipe,
  tabUntil,
} from './helpers'

test('incomplete Recipe stays placed, blocks new placement, and is repaired by keyboard', async ({
  page,
}) => {
  await launchWithState(page, stateWithIncompleteRecipe())

  await expect(page.getByText('Nutrition totals are incomplete.')).toBeVisible()
  await expect(page.getByText('Plan totals incomplete')).toBeVisible()
  const dinner = page.getByRole('article', { name: 'Dinner' })
  await expect(dinner).toContainText('Meal totals incomplete')
  await expect(dinner).toContainText('Incomplete trail bowl')
  await expect(dinner.getByLabel('Quantity for Incomplete trail bowl')).toHaveValue('2')

  const picker = dinner.getByRole('combobox')
  await picker.fill('Incomplete trail bowl')
  const option = dinner.getByRole('option', { name: /Incomplete trail bowl/ })
  await expect(option).toBeDisabled()
  await expect(option).toContainText(
    'Repair 1 unavailable Food ingredient in Recipes before adding.',
  )

  await navigateTo(page, 'Shopping list')
  await expect(
    page.getByText('Shopping and nutrition totals are incomplete.'),
  ).toBeVisible()
  const unavailable = page.getByText('retired-recipe-food').locator('..')
  await expect(page.getByText('3', { exact: true })).toBeVisible()
  await expect(unavailable).toContainText('From Recipe: Incomplete trail bowl')
  await expect(unavailable).toContainText('Day 1 · Dinner')

  await navigateTo(page, 'Recipes')
  const recipe = page.getByRole('article', { name: 'Incomplete trail bowl' })
  await expect(recipe).toContainText('Known totals only')
  await expect(recipe).toContainText('retired-recipe-food')
  await page.getByRole('button', { name: 'Edit Incomplete trail bowl' }).click()
  const dialog = page.getByRole('dialog', {
    name: 'Edit Incomplete trail bowl',
  })
  await expect(dialog).toContainText('Unavailable Food')
  await expect(dialog.getByLabel('Quantity for retired-recipe-food')).toHaveValue(
    '1.5',
  )
  const replace = dialog.getByRole('button', {
    name: 'Replace unavailable Food retired-recipe-food',
  })
  await replace.focus()
  await page.keyboard.press('Enter')
  const replacement = dialog.getByRole('combobox', {
    name: 'Choose replacement for retired-recipe-food',
  })
  await replacement.fill("Justin's Classic Peanut Butter")
  await dialog
    .getByRole('option', { name: /Justin's Classic Peanut Butter/ })
    .focus()
  await page.keyboard.press('Enter')
  await expect(
    dialog.getByLabel("Quantity for Justin's Classic Peanut Butter"),
  ).toHaveValue('2.5')
  await dialog.getByRole('button', { name: 'Save Recipe' }).click()

  await navigateTo(page, 'Meal planner')
  await expect(page.getByText('Nutrition totals are incomplete.')).toHaveCount(0)
  await navigateTo(page, 'Shopping list')
  await expect(page.getByText('retired-recipe-food')).toHaveCount(0)
  await expect(
    page.getByText('Shopping and nutrition totals are incomplete.'),
  ).toHaveCount(0)
})

test('Recipe quantity and saved edits update every projection', async ({
  page,
}) => {
  await launchWithState(page, stateWithRecipe({ placed: true }))
  await expect(page.getByRole('article', { name: 'Energy' })).toContainText(
    '500 kcal',
  )

  const quantity = page.getByRole('spinbutton', {
    name: 'Quantity for Trail bowl',
  })
  await quantity.fill('1.5')
  await quantity.press('Tab')
  await expect(page.getByRole('article', { name: 'Energy' })).toContainText(
    '375 kcal',
  )

  await navigateTo(page, 'Recipes')
  await page.getByRole('button', { name: 'Edit Trail bowl' }).click()
  const dialog = page.getByRole('dialog', { name: 'Edit Trail bowl' })
  await dialog
    .getByRole('spinbutton', {
      name: "Quantity for Justin's Classic Peanut Butter",
    })
    .fill('1.5')
  await dialog
    .getByRole('group', { name: 'Recipe-only ingredient 1' })
    .getByLabel('Calories')
    .fill('50')
  await dialog.getByRole('button', { name: 'Save Recipe' }).click()

  await navigateTo(page, 'Meal planner')
  await expect(page.getByRole('article', { name: 'Energy' })).toContainText(
    '548 kcal',
  )
  await navigateTo(page, 'Shopping list')
  await expect(
    page.getByRole('button', {
      name: /Justin's Classic Peanut Butter.*2.3.*servings/,
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', {
      name: /Cocoa powder.*From Trail bowl.*15 g.*75 kcal/,
    }),
  ).toBeVisible()
})

test('unused and placed Recipe deletion follows the confirmed impact', async ({
  page,
}) => {
  const state = stateWithRecipe({ placed: true })
  state.days[0].meals.Breakfast.push({
    id: 'second-recipe-placement',
    target: { kind: 'recipe', id: 'recipe-trail-bowl' },
    quantity: 1,
  })
  state.recipes.push({
    id: 'recipe-unused',
    name: 'Unused Recipe',
    category: null,
    instructions: null,
    ingredients: [
      {
        kind: 'food',
        foodId: 'justin-s-classic-peanut-butter-19',
        quantity: 1,
      },
    ],
  })
  await launchWithState(page, state)
  await navigateTo(page, 'Recipes')

  await page.getByRole('button', { name: 'Delete Unused Recipe' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(
    page.getByRole('article', { name: 'Unused Recipe' }),
  ).toHaveCount(0)

  const opener = page.getByRole('button', { name: 'Delete Trail bowl' })
  await opener.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Delete Trail bowl?' })
  await expect(dialog).toContainText('2 Plan items')
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(opener).toBeFocused()

  await page.keyboard.press('Enter')
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(
    page.getByRole('article', { name: 'Trail bowl' }),
  ).toBeVisible()
  await navigateTo(page, 'Meal planner')
  await expect(page.getByText('Trail bowl', { exact: true })).toHaveCount(2)

  await navigateTo(page, 'Recipes')
  await page.getByRole('button', { name: 'Delete Trail bowl' }).click()
  await dialog.getByRole('button', { name: 'Delete Recipe and 2 Plan items' }).click()
  await expect(
    page.getByRole('article', { name: 'Trail bowl' }),
  ).toHaveCount(0)
  await navigateTo(page, 'Meal planner')
  await expect(page.getByText('Trail bowl', { exact: true })).toHaveCount(0)
})

test('custom Food deletion separates direct and Recipe impact', async ({
  page,
}) => {
  const customFood = createCustomFood(
    {
      brand: 'Delete Test',
      flavor: 'Shared Food',
      category: 'Snack',
      prep: 'N/A',
      servingGrams: 30,
      calories: 120,
      fat: 4,
      sodium: 10,
      potassium: 20,
      carbs: 20,
      fiber: 2,
      sugar: 3,
      protein: 5,
    },
    'custom-delete-shared',
  )
  const state = emptyState(fixedDay(), [customFood])
  state.days[0].meals.Lunch.push({
    id: 'direct-custom-placement',
    target: { kind: 'food', id: customFood.id },
    quantity: 1,
  })
  state.recipes.push({
    id: 'recipe-custom-reference',
    name: 'Shared Food Recipe',
    category: 'Lunch',
    instructions: null,
    ingredients: [
      { kind: 'food', foodId: customFood.id, quantity: 1.5 },
    ],
  })
  await launchWithState(page, state)
  await navigateTo(page, 'Food library')
  await page.getByRole('textbox', { name: 'Search foods' }).fill('Delete Test')

  const opener = page.getByRole('button', {
    name: 'Delete Delete Test Shared Food',
  })
  await opener.click()
  const dialog = page.getByRole('dialog', {
    name: 'Delete Delete Test Shared Food?',
  })
  await expect(dialog).toContainText('1 direct Plan item')
  await expect(dialog).toContainText('1 Recipe Food ingredient')
  await expect(dialog).toContainText(
    'Direct placements will be removed. Recipe references will remain unavailable and repairable.',
  )
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused()
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(opener).toBeFocused()
  await expect(opener).toBeVisible()

  await navigateTo(page, 'Meal planner')
  await expect(
    page.getByText('Delete Test Shared Food', { exact: true }),
  ).toBeVisible()
  await navigateTo(page, 'Recipes')
  await page.getByRole('button', { name: 'Edit Shared Food Recipe' }).click()
  const editor = page.getByRole('dialog', { name: 'Edit Shared Food Recipe' })
  await expect(editor).toContainText('Delete Test Shared Food')
  await editor.getByRole('button', { name: 'Cancel' }).click()
  await navigateTo(page, 'Food library')
  await page.getByRole('textbox', { name: 'Search foods' }).fill('Delete Test')

  const restoredOpener = page.getByRole('button', {
    name: 'Delete Delete Test Shared Food',
  })
  await restoredOpener.click()
  await dialog
    .getByRole('button', {
      name: 'Delete Food and remove 1 direct Plan item',
    })
    .click()
  await expect(
    page.getByText('Delete Test Shared Food', { exact: true }),
  ).toHaveCount(0)
  await navigateTo(page, 'Meal planner')
  await expect(
    page.getByText('Delete Test Shared Food', { exact: true }),
  ).toHaveCount(0)
  await navigateTo(page, 'Recipes')
  const recipe = page.getByRole('article', { name: 'Shared Food Recipe' })
  await expect(recipe).toContainText(
    'Known totals only — this Recipe is incomplete.',
  )
  await expect(recipe).toContainText('custom-delete-shared (1.5 servings)')
  await page.getByRole('button', { name: 'Edit Shared Food Recipe' }).click()
  await expect(
    page.getByRole('dialog', { name: 'Edit Shared Food Recipe' }),
  ).toContainText('custom-delete-shared')
})

test('reset cancel/confirm, previous-state restore, and final-day invariant', async ({
  page,
}) => {
  const original = emptyState(fixedDay('original-day', 'Original menu'))
  original.days[0].meals.Breakfast.push({
    id: 'original-item',
    target: { kind: 'food', id: 'justin-s-classic-peanut-butter-19' },
    quantity: 1,
  })
  original.recipes.push({
    id: 'recipe-original',
    name: 'Original recovery Recipe',
    category: 'Dinner',
    instructions: null,
    ingredients: [
      {
        kind: 'food',
        foodId: 'justin-s-classic-peanut-butter-19',
        quantity: 1.2,
      },
    ],
  })
  original.days[0].meals.Dinner.push({
    id: 'original-recipe-item',
    target: { kind: 'recipe', id: 'recipe-original' },
    quantity: 2,
  })
  await launchWithState(page, original)

  await expect(
    page.getByRole('button', { name: 'Remove', exact: true }),
  ).toBeDisabled()
  await page.getByRole('button', { name: 'Reset' }).click()
  const resetDialog = page.getByRole('dialog', { name: 'Reset the Plan?' })
  await expect(resetDialog).toContainText('Trail days')
  await resetDialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByLabel('Day name')).toHaveValue('Original menu')

  await page.getByRole('button', { name: 'Reset' }).click()
  await page
    .getByRole('dialog', { name: 'Reset the Plan?' })
    .getByRole('button', { name: 'Reset Plan' })
    .click()
  await expect(page.getByLabel('Day name')).toHaveValue('Day 1')

  await page.getByRole('button', { name: 'Previous' }).click()
  const previousDialog = page.getByRole('dialog', {
    name: 'Previous valid state',
  })
  await expect(previousDialog.getByLabel('State preview')).toContainText(
    'Recipes1',
  )
  const [previousDownload] = await Promise.all([
    page.waitForEvent('download'),
    previousDialog.getByRole('button', { name: 'Download' }).click(),
  ])
  expect(JSON.parse(await readDownload(previousDownload))).toMatchObject({
    schemaVersion: 2,
    state: { days: [{ name: 'Original menu' }] },
  })
  await previousDialog
    .getByRole('button', { name: 'Restore and swap' })
    .click()
  await expect(page.getByLabel('Day name')).toHaveValue('Original menu')
  await expect(page.getByRole('article', { name: 'Energy' })).toContainText(
    '714 kcal',
  )
  expect(
    JSON.parse(
      (await page.evaluate(
        (key) => localStorage.getItem(key),
        PLANNER_STORAGE_KEY,
      )) ?? 'null',
    ),
  ).toEqual({ schemaVersion: 2, state: original })

  await page.getByRole('button', { name: 'Previous' }).click()
  await page
    .getByRole('dialog', { name: 'Previous valid state' })
    .getByRole('button', { name: 'Delete' })
    .click()
  await page.getByRole('button', { name: 'Delete previous state' }).click()
  await page.getByRole('button', { name: 'Previous' }).click()
  await expect(
    page.getByRole('dialog', { name: 'Previous valid state' }),
  ).toContainText('There is no previous valid state yet')
})

test('modal close paths restore focus to the connected opener', async ({
  page,
}) => {
  await launchWithState(page, emptyState())
  const opener = page.getByRole('button', { name: 'Reset', exact: true })

  await opener.click()
  const cancelDialog = page.getByRole('dialog', { name: 'Reset the Plan?' })
  await expect(
    cancelDialog.getByRole('button', { name: 'Cancel' }),
  ).toBeFocused()
  await cancelDialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(opener).toBeFocused()

  await opener.click()
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('dialog', { name: 'Reset the Plan?' }),
  ).toHaveCount(0)
  await expect(opener).toBeFocused()

  await opener.click()
  await page
    .getByRole('dialog', { name: 'Reset the Plan?' })
    .getByRole('button', { name: 'Reset Plan' })
    .click()
  await expect(opener).toBeFocused()
})

test('version 2 export, atomic import, invalid import, and Shopping-list restoration', async ({
  page,
}) => {
  const customFood = createCustomFood(
    {
      brand: 'Canyon Kitchen',
      flavor: 'Sesame Noodles',
      category: 'Entrée',
      prep: 'hot',
      servingGrams: 120,
      calories: 500,
      fat: 18,
      sodium: 800,
      potassium: 400,
      carbs: 70,
      fiber: 8,
      sugar: 6,
      protein: 20,
    },
    'custom-canyon-noodles',
  )
  const recognizable = emptyState(
    fixedDay('canyon-day', 'Canyon menu'),
    [customFood],
  )
  recognizable.days[0].meals.Dinner.push({
    id: 'canyon-dinner',
    target: { kind: 'food', id: customFood.id },
    quantity: 2,
  })
  recognizable.recipes.push({
    id: 'recipe-canyon-bowl',
    name: 'Canyon bowl',
    category: 'Dinner',
    instructions: '',
    ingredients: [
      { kind: 'food', foodId: customFood.id, quantity: 1.2 },
      {
        kind: 'food',
        foodId: 'retired-topping',
        quantity: 0.4,
      },
      {
        kind: 'recipe-only',
        id: 'ingredient-spice',
        name: 'Spice mix',
        weightGrams: 4,
        calories: 5,
        fat: 0,
        carbs: 1,
        protein: 0,
        fiber: 0,
        sugar: 0,
        sodium: 300,
        potassium: 0,
      },
    ],
  })
  recognizable.days[0].meals.Lunch.push({
    id: 'canyon-recipe-placement',
    target: { kind: 'recipe', id: 'recipe-canyon-bowl' },
    quantity: 2.3,
  })
  await launchWithState(page, recognizable)

  const [exportDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export' }).click(),
  ])
  expect(exportDownload.suggestedFilename()).toBe(
    'trail-rations-backup-v2.json',
  )
  const exported = await readDownload(exportDownload)
  expect(JSON.parse(exported)).toEqual({
    schemaVersion: 2,
    state: recognizable,
  })

  await page.getByRole('button', { name: 'Reset' }).click()
  await page.getByRole('button', { name: 'Reset Plan' }).click()
  await expect(page.getByLabel('Day name')).toHaveValue('Day 1')

  await selectImportFile(page, {
    name: 'canyon-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(exported),
  })
  const preview = page.getByRole('dialog', { name: 'Import this backup?' })
  await expect(preview).toContainText('version 2 backup')
  await expect(preview.getByLabel('State preview')).toContainText('Recipes1')
  await expect(preview.getByLabel('State preview')).toContainText(
    'Incomplete Recipes1',
  )
  await expect(preview.getByLabel('State preview')).toContainText(
    'Unavailable Recipe ingredients1',
  )
  await preview
    .getByRole('button', { name: 'Replace current state' })
    .click()
  await expect(page.getByLabel('Day name')).toHaveValue('Canyon menu')
  expect(
    JSON.parse(
      (await page.evaluate(
        (key) => localStorage.getItem(key),
        PLANNER_STORAGE_KEY,
      )) ?? 'null',
    ),
  ).toEqual({ schemaVersion: 2, state: recognizable })
  await expect(page.getByRole('article', { name: 'Energy' })).toContainText(
    '2,392 kcal',
  )

  await navigateTo(page, 'Shopping list')
  await expect(
    page.getByRole('button', {
      name: /Canyon Kitchen Sesame Noodles.*4.8.*servings/,
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', {
      name: /Spice mix.*From Canyon bowl.*9.2 g.*12 kcal/,
    }),
  ).toBeVisible()
  await expect(
    page.getByText(
      /Food ID: retired-topping.*Canyon menu · Lunch · Canyon bowl/,
    ),
  ).toBeVisible()

  await navigateTo(page, 'Meal planner')
  const invalidState = emptyState()
  invalidState.days[0].meals.Dinner.push({
    id: 'invalid-recipe-placement',
    target: { kind: 'recipe', id: 'missing-recipe' },
    quantity: 1,
  })
  const invalidRaw = JSON.stringify({
    schemaVersion: 2,
    state: invalidState,
  })
  await selectImportFile(page, {
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from(invalidRaw),
  })
  const invalidDialog = page.getByRole('dialog', {
    name: 'Backup could not be imported',
  })
  await expect(invalidDialog).toContainText('Current data was not changed')
  await expect(invalidDialog).toContainText(
    'state.days[0].meals.Dinner[0].target.id',
  )
  const [invalidDownload] = await Promise.all([
    page.waitForEvent('download'),
    invalidDialog
      .getByRole('button', { name: 'Download invalid file' })
      .click(),
  ])
  expect(await readDownload(invalidDownload)).toBe(invalidRaw)
  await invalidDialog
    .getByRole('button', { name: 'Keep current data' })
    .click()
  await expect(page.getByLabel('Day name')).toHaveValue('Canyon menu')

  const futureRaw = JSON.stringify({
    schemaVersion: 99,
    state: emptyState(fixedDay('future-day', 'Future menu')),
  })
  await selectImportFile(page, {
    name: 'future.json',
    mimeType: 'application/json',
    buffer: Buffer.from(futureRaw),
  })
  const futureDialog = page.getByRole('dialog', {
    name: 'Backup could not be imported',
  })
  await expect(futureDialog).toContainText(
    'Schema version 99 is not supported.',
  )
  const [futureDownload] = await Promise.all([
    page.waitForEvent('download'),
    futureDialog
      .getByRole('button', { name: 'Download invalid file' })
      .click(),
  ])
  expect(await readDownload(futureDownload)).toBe(futureRaw)
  await futureDialog
    .getByRole('button', { name: 'Keep current data' })
    .click()
  expect(
    JSON.parse(
      (await page.evaluate(
        (key) => localStorage.getItem(key),
        PLANNER_STORAGE_KEY,
      )) ?? 'null',
    ),
  ).toEqual({ schemaVersion: 2, state: recognizable })

  await selectImportFile(page, {
    name: 'too-large.json',
    mimeType: 'application/json',
    buffer: Buffer.alloc(MAX_IMPORT_BYTES + 1, 'x'),
  })
  await expect(
    page.getByRole('dialog', { name: 'Backup could not be imported' }),
  ).toContainText('larger than 5 MB')
  await page
    .getByRole('button', { name: 'Keep current data' })
    .click()
  await expect(page.getByLabel('Day name')).toHaveValue('Canyon menu')
})

test('legacy and version 1 imports are classified and migrate with no Recipes', async ({
  page,
}) => {
  await launchWithState(page, emptyState())

  for (const source of [
    {
      filename: 'legacy.json',
      description: 'legacy unversioned PlannerState',
      value: {
        days: [fixedDay('legacy-day', 'Legacy menu')],
        customFoods: [],
      },
    },
    {
      filename: 'version-1.json',
      description: 'version 1 backup',
      value: {
        schemaVersion: 1,
        state: {
          days: [fixedDay('v1-day', 'Version 1 menu')],
          customFoods: [],
        },
      },
    },
  ]) {
    await selectImportFile(page, {
      name: source.filename,
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(source.value)),
    })
    const preview = page.getByRole('dialog', {
      name: 'Import this backup?',
    })
    await expect(preview).toContainText(source.description)
    await expect(preview.getByLabel('State preview')).toContainText(
      'Recipes0',
    )
    await preview
      .getByRole('button', { name: 'Replace current state' })
      .click()
    const stored = JSON.parse(
      (await page.evaluate(
        (key) => localStorage.getItem(key),
        PLANNER_STORAGE_KEY,
      )) ?? 'null',
    )
    expect(stored.schemaVersion).toBe(2)
    expect(stored.state.recipes).toEqual([])
  }
})

test('legacy custom Foods load with safe labels and zero serving weight', async ({
  page,
}) => {
  const legacyFood = createCustomFood(
    {
      brand: 'Legacy',
      flavor: 'Ration',
      category: 'Entrée',
      prep: 'N/A',
      servingGrams: 100,
      calories: 450,
      fat: 12,
      sodium: 300,
      potassium: 200,
      carbs: 70,
      fiber: 5,
      sugar: 4,
      protein: 15,
    },
    'custom-legacy-zero-weight',
  )
  legacyFood.brand = null
  legacyFood.flavor = null
  legacyFood.name = 'Legacy zero-weight ration'
  legacyFood.servingGrams = 0
  legacyFood.servingOz = 0
  legacyFood.caloriesPerGram = null
  legacyFood.caloriesPerOz = null

  const state = emptyState(undefined, [legacyFood])
  state.days[0].meals.Dinner.push({
    id: 'legacy-dinner',
    target: { kind: 'food', id: legacyFood.id },
    quantity: 1.2,
  })
  await launchWithState(page, state)

  await expect(
    page.getByRole('heading', { name: 'Meal planner', level: 1 }),
  ).toBeVisible()
  await expect(
    page.getByRole('spinbutton', {
      name: 'Quantity for Legacy zero-weight ration',
    }),
  ).toHaveValue('1.2')
  await expect(page.getByText('null', { exact: true })).toHaveCount(0)

  await navigateTo(page, 'Food library')
  await page
    .getByRole('textbox', { name: 'Search foods' })
    .fill('Legacy zero-weight ration')
  await expect(
    page.getByText('Legacy zero-weight ration', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('row', { name: /Legacy zero-weight ration/ }),
  ).toContainText('0 g')
})

test('Food and electrolyte search, filter, and sort controls', async ({
  page,
}) => {
  await launchWithState(page, emptyState())
  await navigateTo(page, 'Food library')
  await page.getByRole('textbox', { name: 'Search foods' }).fill("Justin's")
  await page
    .getByRole('combobox', { name: 'Filter foods by category' })
    .selectOption('Nut Butter')
  await page
    .getByRole('combobox', { name: 'Sort foods' })
    .selectOption('name')
  await expect(page.getByText('10 foods')).toBeVisible()
  await expect(page.getByRole('row').nth(1)).toContainText(
    "Justin's Chocolate Hazelnut And Almond Butter",
  )
  await expect(
    page.getByText("Justin's Dark Chocolate Peanut Butter Cups", {
      exact: true,
    }),
  ).toHaveCount(0)

  await navigateTo(page, 'Electrolytes')
  await page
    .getByRole('textbox', { name: 'Search electrolyte products' })
    .fill('Liquid I.V.')
  await page
    .getByRole('combobox', { name: 'Sort electrolyte products' })
    .selectOption('potassium')
  const products = page.getByRole('article', { name: /Liquid I\.V\./ })
  await expect(products).toHaveCount(2)
  await expect(products.first()).toHaveAccessibleName(
    'Liquid I.V. Energy Multiplier',
  )
})

test('invalid quantity drafts do not commit or persist', async ({ page }) => {
  const state = emptyState()
  state.days[0].meals.Breakfast.push({
    id: 'quantity-item',
    target: { kind: 'food', id: 'justin-s-classic-peanut-butter-19' },
    quantity: 1,
  })
  await launchWithState(page, state)
  const quantity = page.getByRole('spinbutton', {
    name: "Quantity for Justin's Classic Peanut Butter",
  })

  for (const invalid of ['', '0', '-2']) {
    await quantity.fill(invalid)
    await quantity.press('Tab')
    await expect(page.getByRole('alert')).toContainText(
      'Enter a quantity greater than 0.',
    )
    await expect(page.getByRole('article', { name: 'Energy' })).toContainText(
      '210 kcal',
    )
  }

  await quantity.fill('1.2')
  await quantity.press('Tab')
  await expect(page.getByRole('article', { name: 'Energy' })).toContainText(
    '252 kcal',
  )

  await quantity.fill('1.25')
  await quantity.press('Tab')
  await expect(page.getByRole('alert')).toContainText(
    'Enter a quantity in increments of 0.1.',
  )
  await expect(page.getByRole('article', { name: 'Energy' })).toContainText(
    '252 kcal',
  )

  await page.reload()
  await expect(
    page.getByRole('spinbutton', {
      name: "Quantity for Justin's Classic Peanut Butter",
    }),
  ).toHaveValue('1.2')
})

test('custom Food form reports accessible field-level validation', async ({
  page,
}) => {
  await launchWithState(page, emptyState())
  await navigateTo(page, 'Food library')
  await page.getByRole('button', { name: 'Add food', exact: true }).click()
  await page.getByLabel('Brand').fill('   ')
  await page.getByLabel('Serving weight (g)').fill('0')
  await page.getByLabel('Calories').fill('-1')
  await page.getByRole('button', { name: 'Add to library' }).click()

  const dialog = page.getByRole('dialog', { name: 'Add a custom food' })
  await expect(dialog).toContainText(
    'Fix the highlighted fields before saving this custom Food.',
  )
  await expect(page.getByLabel(/Brand/)).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByLabel(/Food \/ flavor/)).toHaveAttribute(
    'aria-invalid',
    'true',
  )
  await expect(page.getByLabel(/Serving weight/)).toHaveAttribute(
    'aria-invalid',
    'true',
  )
  await expect(page.getByLabel(/Calories/)).toHaveAttribute(
    'aria-invalid',
    'true',
  )
})

for (const scenario of [
  {
    name: 'invalid JSON',
    raw: '{"days":',
    confirmReset: false,
  },
  {
    name: 'invalid parseable shape',
    raw: JSON.stringify({ days: [], customFoods: [] }),
    confirmReset: true,
  },
]) {
  test(`malformed startup recovery preserves ${scenario.name}`, async ({
    page,
  }) => {
    await launchWithRawState(page, scenario.raw)
    await expect(
      page.getByRole('heading', {
        name: 'Your saved Plan cannot be loaded',
      }),
    ).toBeVisible()
    expect(
      await page.evaluate((key) => localStorage.getItem(key), PLANNER_STORAGE_KEY),
    ).toBe(scenario.raw)

    if (scenario.name === 'invalid JSON') {
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: 'Download raw payload' }).click(),
      ])
      expect(await readDownload(download)).toBe(scenario.raw)
    }

    await page.getByRole('button', { name: 'Reset saved Plan' }).click()
    const dialog = page.getByRole('dialog', {
      name: 'Reset unreadable browser data?',
    })
    await expect(dialog.getByLabel('Reset preview')).toContainText('Recipes')
    await expect(dialog.getByLabel('Reset preview')).toContainText(
      'Incomplete Recipes',
    )
    await expect(dialog.getByLabel('Reset preview')).toContainText(
      'Unavailable Recipe ingredients',
    )
    if (scenario.confirmReset) {
      await dialog.getByRole('button', { name: 'Reset and continue' }).click()
      await expect(
        page.getByRole('heading', { name: 'Meal planner', level: 1 }),
      ).toBeVisible()
    } else {
      await dialog.getByRole('button', { name: 'Cancel' }).click()
      expect(
        await page.evaluate(
          (key) => localStorage.getItem(key),
          PLANNER_STORAGE_KEY,
        ),
      ).toBe(scenario.raw)
    }
  })
}

test('unresolved Plan items stay visible and can be replaced or removed', async ({
  page,
}) => {
  const day = fixedDay('unresolved-day', 'Unresolved menu')
  day.meals.Breakfast.push({
    id: 'missing-breakfast',
    target: { kind: 'food', id: 'retired-breakfast-food' },
    quantity: 2.3,
  })
  day.meals.Lunch.push({
    id: 'missing-lunch',
    target: { kind: 'food', id: 'retired-lunch-food' },
    quantity: 1.2,
  })
  await launchWithState(page, emptyState(day))

  await expect(page.getByText('Nutrition totals are incomplete.')).toBeVisible()
  await expect(page.getByRole('article', { name: 'Breakfast' })).toContainText(
    'Food ID: retired-breakfast-food',
  )

  await navigateTo(page, 'Shopping list')
  await expect(
    page.getByText('Shopping and nutrition totals are incomplete.'),
  ).toBeVisible()
  await expect(page.getByText('retired-breakfast-food')).toBeVisible()
  await expect(page.getByText('retired-lunch-food')).toBeVisible()

  await navigateTo(page, 'Meal planner')
  const breakfast = page.getByRole('article', { name: 'Breakfast' })
  await breakfast.getByRole('button', { name: 'Replace' }).click()
  const replacement = breakfast.getByRole('combobox', {
    name: /Choose replacement for retired-breakfast-food/,
  })
  await replacement.fill("Justin's Classic Peanut Butter")
  await breakfast
    .getByRole('option', { name: /Justin's Classic Peanut Butter/ })
    .click()
  await expect(
    page.getByRole('spinbutton', {
      name: "Quantity for Justin's Classic Peanut Butter",
    }),
  ).toHaveValue('2.3')

  const lunch = page.getByRole('article', { name: 'Lunch' })
  await lunch
    .getByRole('button', {
      name: 'Remove Unavailable food retired-lunch-food',
    })
    .click()
  await expect(
    page.getByText('Nutrition totals are incomplete.'),
  ).toHaveCount(0)

  await navigateTo(page, 'Shopping list')
  await expect(
    page.getByRole('button', {
      name: /Justin's Classic Peanut Butter.*2\.3.*servings/,
    }),
  ).toBeVisible()
  await expect(page.getByText('Unavailable food', { exact: true })).toHaveCount(
    0,
  )
})

test('sodium calculator withholds recommendations for unresolved Plan items', async ({
  page,
}) => {
  const day = fixedDay('sodium-unresolved-day', 'Incomplete sodium day')
  const completeDay = fixedDay('sodium-complete-day', 'Complete sodium day')
  day.meals.Lunch.push({
    id: 'missing-sodium-item',
    target: { kind: 'food', id: 'retired-sodium-food' },
    quantity: 1.2,
  })
  const state = emptyState(day)
  state.days.push(completeDay)
  await launchWithState(page, state)
  await navigateTo(page, 'Na/K calculator')

  await expect(
    page.getByText('Food sodium and totals are incomplete.', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText(
      'Replace or remove unavailable Foods before using a serving recommendation.',
      { exact: true },
    ),
  ).toBeVisible()
  await expect(
    page.getByText('Recommendation unavailable', { exact: true }),
  ).toBeVisible()
  await expect(page.getByText(/^\d+(?:\.\d+)? servings?$/)).toHaveCount(0)

  await page
    .getByLabel('Planned menu')
    .selectOption('sodium-complete-day')
  await expect(
    page.getByText('Food sodium and totals are incomplete.', { exact: true }),
  ).toHaveCount(0)
  await expect(
    page.getByText('Recommendation unavailable', { exact: true }),
  ).toHaveCount(0)
  await page
    .getByLabel('Electrolyte product')
    .selectOption({ label: 'Science in Sport GO Electrolyte' })
  await expect(page.getByText('10 servings', { exact: true })).toBeVisible()
})

test('Print invokes the browser and exposes print-media list semantics', async ({
  page,
}) => {
  const state = emptyState()
  state.days[0].meals.Breakfast.push({
    id: 'print-item',
    target: { kind: 'food', id: 'justin-s-classic-peanut-butter-19' },
    quantity: 2,
  })
  await launchWithState(page, state)
  await navigateTo(page, 'Shopping list')
  await page.evaluate(() => {
    window.print = () => sessionStorage.setItem('print-invoked', 'true')
  })
  await page.getByRole('button', { name: 'Print list' }).click()
  expect(
    await page.evaluate(() => sessionStorage.getItem('print-invoked')),
  ).toBe('true')

  await page.emulateMedia({ media: 'print' })
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Print list' })).toBeHidden()
  await expect(page.getByRole('article', { name: 'Total food weight' })).toBeVisible()
  const row = page.getByRole('button', {
    name: /Justin's Classic Peanut Butter/,
  })
  await expect(row).toBeVisible()
  await row.click()
  await expect(row).toHaveAttribute('aria-pressed', 'true')
  expect(await row.evaluate((element) => getComputedStyle(element).breakInside)).toBe(
    'avoid',
  )

  await page.emulateMedia({ media: 'screen' })
  await page.reload()
  await navigateTo(page, 'Shopping list')
  await expect(
    page.getByRole('button', { name: /Justin's Classic Peanut Butter/ }),
  ).toHaveAttribute('aria-pressed', 'false')
})

test('keyboard-only primary planning and navigation journey', async ({
  page,
}) => {
  await launchWithState(page, emptyState())
  await tabUntil(
    page,
    (active) => active.label.startsWith('Add Food or Recipe to breakfast'),
  )
  await page.keyboard.type("Justin's Classic Peanut Butter")
  await tabUntil(page, (active) => active.role === 'option')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('article', { name: 'Energy' })).toContainText(
    '210 kcal',
  )

  await tabUntil(
    page,
    (active) => active.text.startsWith('Shopping list'),
    'backward',
  )
  await page.keyboard.press('Enter')
  await expect(
    page.getByRole('heading', { name: 'Shopping list', level: 1 }),
  ).toBeVisible()
})

test('keyboard-only data recovery controls expose Recipe previews', async ({
  page,
}) => {
  const state = emptyState()
  state.recipes.push({
    id: 'keyboard-recipe',
    name: 'Keyboard Recipe',
    category: null,
    instructions: null,
    ingredients: [
      {
        kind: 'food',
        foodId: 'justin-s-classic-peanut-butter-19',
        quantity: 1,
      },
    ],
  })
  await launchWithState(page, state)

  await tabUntil(page, (active) => active.text === 'Reset')
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Reset the Plan?' })
  await expect(dialog.getByLabel('State preview')).toContainText('Recipes0')
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Reset' })).toBeFocused()
})
