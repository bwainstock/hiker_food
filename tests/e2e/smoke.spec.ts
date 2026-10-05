import { createCustomFood } from '../../src/lib/customFood'
import { expect, test } from './fixtures'
import {
  addFood,
  emptyState,
  expectMacronutrients,
  fixedDay,
  launchClean,
  launchWithState,
  navigateTo,
  stateWithRecipe,
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

test('mixed Recipe creation, discovery, editing, and persistence @smoke', async ({
  page,
}) => {
  await launchWithState(page, emptyState())
  await navigateTo(page, 'Recipes')
  await expect(
    page.getByRole('heading', { name: 'No Recipes yet' }),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Create Recipe' }).click()
  const createDialog = page.getByRole('dialog', { name: 'Create Recipe' })
  const liveSummary = createDialog.getByRole('complementary', {
    name: 'Live Recipe nutrition',
  })
  await expect(liveSummary).toContainText('Add ingredients to see nutrition.')
  await createDialog.getByRole('button', { name: 'Save Recipe' }).click()
  await expect(createDialog.getByText('Enter a Recipe name.')).toBeVisible()
  await expect(
    createDialog.getByText('Add at least one ingredient.'),
  ).toBeVisible()

  await createDialog.getByLabel('Recipe name').fill('Peanut butter bowl')
  await createDialog.getByLabel('Category').selectOption('Breakfast')
  await createDialog
    .getByLabel('Preparation instructions')
    .fill('Stir with cold water')
  const picker = createDialog.getByRole('combobox', {
    name: 'Add a Food ingredient',
  })
  await picker.fill("Justin's Classic Peanut Butter")
  await createDialog
    .getByRole('option', { name: /Justin's Classic Peanut Butter/ })
    .click()
  await expect(createDialog).toContainText('Serving size: 32 g · 1.13 oz')
  const foodQuantity = createDialog.getByRole('spinbutton', {
    name: "Quantity for Justin's Classic Peanut Butter",
  })
  await expect(liveSummary).toContainText('210 kcal')
  await foodQuantity.fill('1.25')
  await expect(liveSummary).toContainText('263 kcal')
  await foodQuantity.fill('1')
  await expect(liveSummary).toContainText('210 kcal')
  await createDialog
    .getByRole('button', { name: 'Add Recipe-only ingredient' })
    .press('Enter')
  const recipeOnly = createDialog.getByRole('group', {
    name: 'Recipe-only ingredient 1',
  })
  await expect(recipeOnly).toContainText(
    'Incomplete ingredient — excluded from totals.',
  )
  await recipeOnly.getByLabel('Name').fill('Cocoa powder')
  await recipeOnly.getByLabel('Weight (g)').fill('0')
  await createDialog.getByRole('button', { name: 'Save Recipe' }).click()
  await expect(
    recipeOnly.getByText('Enter a weight greater than 0.'),
  ).toBeVisible()
  await recipeOnly.getByLabel('Weight (g)').fill('10')
  await recipeOnly.getByLabel('Calories').fill('41.4')
  await recipeOnly.getByLabel('Fat (g)').fill('1')
  await recipeOnly.getByLabel('Carbohydrates (g)').fill('5')
  await recipeOnly.getByLabel('Protein (g)').fill('2')
  await expect(liveSummary).toContainText('251 kcal')
  await recipeOnly.getByLabel('Weight (g)').fill('5')
  await expect(liveSummary).toContainText('231 kcal')
  await recipeOnly.getByLabel('Weight (g)').fill('10')
  await expect(liveSummary).toContainText('251 kcal')
  await createDialog.getByRole('button', { name: 'Save Recipe' }).click()

  const recipe = page.getByRole('article', { name: 'Peanut butter bowl' })
  await expect(recipe).toContainText('2 ingredients')
  await expect(recipe).toContainText('251 kcal')
  await expect(recipe).toContainText(
    'Known totals only — this Recipe is incomplete.',
  )
  await expect(recipe).toContainText('Breakfast')
  await expect(recipe).toContainText('Stir with cold water')

  await page.reload()
  await navigateTo(page, 'Recipes')
  await expect(
    page.getByRole('article', { name: 'Peanut butter bowl' }),
  ).toBeVisible()
  await page.getByRole('searchbox', { name: 'Search Recipes' }).fill('cocoa')
  await expect(recipe).toBeVisible()
  await page.getByLabel('Recipe category').selectOption('Dinner')
  await expect(
    page.getByRole('heading', { name: 'No matching Recipes' }),
  ).toBeVisible()
  await page.getByLabel('Recipe category').selectOption('Breakfast')
  await expect(recipe).toBeVisible()
  await page.getByRole('searchbox', { name: 'Search Recipes' }).fill('')
  await page.getByLabel('Recipe category').selectOption('')

  await page
    .getByRole('button', { name: 'Edit Peanut butter bowl' })
    .click()
  let editDialog = page.getByRole('dialog', {
    name: 'Edit Peanut butter bowl',
  })
  await expect(editDialog).toContainText('Serving size: 32 g · 1.13 oz')
  await editDialog
    .getByRole('spinbutton', {
      name: "Quantity for Justin's Classic Peanut Butter",
    })
    .fill('1.25')
  await expect(
    editDialog.getByRole('complementary', {
      name: 'Live Recipe nutrition',
    }),
  ).toContainText('304 kcal')
  await editDialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(recipe).toContainText('251 kcal')

  await page
    .getByRole('button', { name: 'Edit Peanut butter bowl' })
    .click()
  editDialog = page.getByRole('dialog', {
    name: 'Edit Peanut butter bowl',
  })
  await editDialog
    .getByRole('spinbutton', {
      name: "Quantity for Justin's Classic Peanut Butter",
    })
    .fill('1.5')
  await editDialog
    .getByRole('group', { name: 'Recipe-only ingredient 1' })
    .getByLabel('Calories')
    .fill('50')
  await editDialog.getByRole('button', { name: 'Save Recipe' }).click()
  await expect(
    page.getByRole('article', { name: 'Peanut butter bowl' }),
  ).toContainText('365 kcal')

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
  await expectMacronutrients(page, {
    carbohydrates: '12 g',
    fat: '36 g',
    protein: '14 g',
  })

  await page.getByRole('button', { name: 'Duplicate' }).click()
  await expect(page.getByText('840 kcal', { exact: true })).toBeVisible()
  await expectMacronutrients(page, {
    carbohydrates: '12 g',
    fat: '36 g',
    protein: '14 g',
  })
  await page.getByRole('button', { name: 'Day', exact: true }).click()
  await expect(page.getByText('3 trail days')).toBeVisible()
  await expectMacronutrients(page, {
    carbohydrates: '0 g',
    fat: '0 g',
    protein: '0 g',
  })

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

test('Recipe planning, Shopping expansion, and persistence @smoke', async ({
  page,
}) => {
  await launchWithState(page, stateWithRecipe())
  const dinner = page.getByRole('article', { name: 'Dinner' })
  const picker = dinner.getByRole('combobox')
  await picker.fill('Trail bowl')
  await dinner.getByRole('option', { name: /Trail bowl.*Recipe/ }).click()
  await expect(dinner).toContainText('Recipe · 250 kcal')
  await expect(page.getByRole('article', { name: 'Energy' })).toContainText(
    '250 kcal',
  )

  const quantity = dinner.getByRole('spinbutton', {
    name: 'Quantity for Trail bowl',
  })
  await quantity.fill('2')
  await quantity.press('Tab')
  await expect(page.getByRole('article', { name: 'Energy' })).toContainText(
    '500 kcal',
  )

  await navigateTo(page, 'Shopping list')
  await expect(
    page.getByRole('button', {
      name: /Justin's Classic Peanut Butter.*2.*servings/,
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', {
      name: /Cocoa powder.*From Trail bowl.*20 g/,
    }),
  ).toBeVisible()

  await page.reload()
  await navigateTo(page, 'Meal planner')
  await expect(page.getByRole('article', { name: 'Energy' })).toContainText(
    '500 kcal',
  )
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
  await expect(deleteDialog).toContainText('1 direct Plan item')
  await expect(deleteDialog).toContainText('0 Food ingredients')
  await expect(deleteDialog.getByRole('button', { name: 'Cancel' })).toBeFocused()
  await deleteDialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(
    page.getByText('Test Kitchen Cocoa Couscous', { exact: true }),
  ).toBeVisible()

  await page
    .getByRole('button', { name: 'Delete Test Kitchen Cocoa Couscous' })
    .click()
  await page
    .getByRole('button', {
      name: 'Delete Food and remove 1 direct Plan item',
    })
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
