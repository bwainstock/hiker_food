import { createCustomFood } from '../../src/lib/customFood'
import { expect, test } from './fixtures'
import {
  addFood,
  emptyState,
  fixedDay,
  launchClean,
  launchWithState,
  navigateTo,
} from './helpers'

test('clean launch and desktop screen navigation @smoke', async ({ page }) => {
  await launchClean(page)
  await expect(
    page.getByRole('heading', { name: 'Meal planner', level: 1 }),
  ).toBeVisible()

  for (const screen of [
    ['Shopping list', 'Shopping list'],
    ['Food library', 'Food library'],
    ['Recipes', 'Recipes'],
    ['Electrolytes', 'Electrolytes'],
    ['Na/K calculator', 'Sodium & potassium'],
    ['Trail guide', 'Trail guide'],
    ['Meal planner', 'Meal planner'],
  ]) {
    await navigateTo(page, screen[0])
    await expect(
      page.getByRole('heading', { name: screen[1], level: 1 }),
    ).toBeVisible()
  }
})

test('Recipe create, reload, edit, Save, and Cancel @smoke', async ({
  page,
}) => {
  await launchWithState(page, emptyState())
  await navigateTo(page, 'Recipes')
  await expect(
    page.getByRole('heading', { name: 'No Recipes yet' }),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Create Recipe' }).click()
  const createDialog = page.getByRole('dialog', { name: 'Create Recipe' })
  await createDialog.getByRole('button', { name: 'Save Recipe' }).click()
  await expect(createDialog.getByText('Enter a Recipe name.')).toBeVisible()
  await expect(
    createDialog.getByText('Add at least one Food ingredient.'),
  ).toBeVisible()

  await createDialog.getByLabel('Recipe name').fill('Peanut butter bowl')
  const picker = createDialog.getByRole('combobox', {
    name: 'Add a Food ingredient',
  })
  await picker.fill("Justin's Classic Peanut Butter")
  await createDialog
    .getByRole('option', { name: /Justin's Classic Peanut Butter/ })
    .click()
  await createDialog.getByRole('button', { name: 'Save Recipe' }).click()

  const recipe = page.getByRole('article', { name: 'Peanut butter bowl' })
  await expect(recipe).toContainText('1 Food ingredient')
  await expect(recipe).toContainText('210 kcal')

  await page.reload()
  await navigateTo(page, 'Recipes')
  await expect(
    page.getByRole('article', { name: 'Peanut butter bowl' }),
  ).toBeVisible()

  await page
    .getByRole('button', { name: 'Edit Peanut butter bowl' })
    .click()
  const editDialog = page.getByRole('dialog', {
    name: 'Edit Peanut butter bowl',
  })
  await editDialog
    .getByRole('spinbutton', {
      name: "Quantity for Justin's Classic Peanut Butter",
    })
    .fill('1.5')
  await editDialog.getByRole('button', { name: 'Save Recipe' }).click()
  await expect(
    page.getByRole('article', { name: 'Peanut butter bowl' }),
  ).toContainText('315 kcal')

  await page
    .getByRole('button', { name: 'Edit Peanut butter bowl' })
    .click()
  const cancelDialog = page.getByRole('dialog', {
    name: 'Edit Peanut butter bowl',
  })
  await cancelDialog.getByLabel('Recipe name').fill('Discarded name')
  await cancelDialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(
    page.getByRole('article', { name: 'Peanut butter bowl' }),
  ).toBeVisible()
  await expect(page.getByText('Discarded name')).toHaveCount(0)
})

test('Plan totals, Trail days, Shopping list, and persistence @smoke', async ({
  page,
}) => {
  await launchWithState(page, emptyState())
  await addFood(page, 'Breakfast', "Justin's Classic Peanut Butter")
  await expect(page.getByRole('article', { name: 'Energy' })).toContainText(
    '210 kcal',
  )

  const quantity = page.getByRole('spinbutton', {
    name: "Quantity for Justin's Classic Peanut Butter",
  })
  await quantity.fill('2')
  await quantity.press('Tab')
  await expect(page.getByRole('article', { name: 'Energy' })).toContainText(
    '420 kcal',
  )

  await page.getByRole('button', { name: 'Duplicate' }).click()
  await expect(page.getByText('840 kcal', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Day', exact: true }).click()
  await expect(page.getByText('3 trail days')).toBeVisible()

  await navigateTo(page, 'Shopping list')
  await expect(
    page.getByRole('button', {
      name: /Justin's Classic Peanut Butter.*4.*servings/,
    }),
  ).toBeVisible()

  await page.reload()
  await expect(page.getByText('3 trail days')).toBeVisible()
  await expect(page.getByText('840 kcal', { exact: true })).toBeVisible()
})

test('custom Food creation and in-use deletion safety @smoke', async ({
  page,
}) => {
  await launchWithState(page, emptyState())
  await navigateTo(page, 'Food library')
  await page.getByRole('button', { name: 'Add food', exact: true }).click()
  await page.getByLabel('Brand').fill('Test Kitchen')
  await page.getByLabel('Food / flavor').fill('Cocoa Couscous')
  await page.getByLabel('Serving weight (g)').fill('100')
  await page.getByLabel('Calories').fill('500')
  await page.getByLabel('Protein (g)').fill('20')
  await page.getByRole('button', { name: 'Add to library' }).click()

  await navigateTo(page, 'Meal planner')
  await addFood(page, 'Breakfast', 'Test Kitchen Cocoa Couscous')
  await expect(page.getByRole('article', { name: 'Energy' })).toContainText(
    '500 kcal',
  )

  await navigateTo(page, 'Food library')
  await page.getByRole('textbox', { name: 'Search foods' }).fill('Test Kitchen')
  await page
    .getByRole('button', { name: 'Delete Test Kitchen Cocoa Couscous' })
    .click()
  const deleteDialog = page.getByRole('dialog', {
    name: 'Delete Test Kitchen Cocoa Couscous?',
  })
  await expect(deleteDialog).toContainText('1 Plan item')
  await expect(deleteDialog.getByRole('button', { name: 'Cancel' })).toBeFocused()
  await deleteDialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(
    page.getByText('Test Kitchen Cocoa Couscous', { exact: true }),
  ).toBeVisible()

  await page
    .getByRole('button', { name: 'Delete Test Kitchen Cocoa Couscous' })
    .click()
  await page
    .getByRole('button', { name: 'Delete Food and 1 reference' })
    .click()
  await expect(
    page.getByText('Test Kitchen Cocoa Couscous', { exact: true }),
  ).toHaveCount(0)

  await navigateTo(page, 'Meal planner')
  await expect(page.getByRole('article', { name: 'Breakfast' })).toContainText(
    'No food added',
  )
})

test('known sodium and potassium supplement scenario @smoke', async ({
  page,
}) => {
  await launchWithState(page, emptyState())
  await navigateTo(page, 'Na/K calculator')
  await page
    .getByLabel('Electrolyte product')
    .selectOption({ label: 'Science in Sport GO Electrolyte' })
  await expect(page.getByText('10 servings', { exact: true })).toBeVisible()
  await expect(page.getByRole('article', { name: 'Sodium target' })).toContainText(
    '5,000 mg',
  )
  await expect(
    page.getByRole('heading', {
      name: 'Science in Sport GO Electrolyte',
    }),
  ).toBeVisible()
})

test('unused custom Food deletes directly @smoke', async ({ page }) => {
  const customFood = createCustomFood(
    {
      brand: 'Unused',
      flavor: 'Food',
      category: 'Snack',
      prep: 'N/A',
      servingGrams: 50,
      calories: 200,
      fat: 10,
      sodium: 100,
      potassium: 100,
      carbs: 20,
      fiber: 2,
      sugar: 3,
      protein: 5,
    },
    'custom-unused',
  )
  await launchWithState(page, emptyState(fixedDay(), [customFood]))
  await navigateTo(page, 'Food library')
  await page.getByRole('textbox', { name: 'Search foods' }).fill('Unused Food')
  await page.getByRole('button', { name: 'Delete Unused Food' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByText('Unused Food', { exact: true })).toHaveCount(0)
})
