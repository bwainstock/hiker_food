import { expect, test } from './fixtures'
import {
  expectMacronutrients,
  launchClean,
  launchWithState,
  stateWithRecipe,
} from './helpers'

test('mobile navigation at a representative small viewport @smoke', async ({
  page,
}) => {
  await launchClean(page)
  await expect(
    page.getByRole('heading', { name: 'Meal planner', level: 1 }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('button', { name: /^Recipes/ }).click()
  await expect(
    page.getByRole('heading', { name: 'Recipes', level: 1 }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Close navigation' }),
  ).not.toBeInViewport()
})

test('mobile Recipe planning and Shopping persistence @smoke', async ({
  page,
}) => {
  await launchWithState(page, stateWithRecipe())
  const dinner = page.getByRole('article', { name: 'Dinner' })
  await dinner.getByRole('combobox').fill('Trail bowl')
  await dinner.getByRole('option', { name: /Trail bowl.*Recipe/ }).tap()
  await expect(page.getByRole('article', { name: 'Energy' })).toContainText(
    '250 kcal',
  )
  await expectMacronutrients(page, {
    carbohydrates: '11 g',
    fat: '19 g',
    protein: '9 g',
  })

  await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('button', { name: /^Shopping list/ }).click()
  await expect(
    page.getByRole('button', {
      name: /Justin's Classic Peanut Butter.*1.*servings/,
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: /Cocoa powder.*From Trail bowl.*10 g/ }),
  ).toBeVisible()

  await page.reload()
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('button', { name: /^Meal planner/ }).click()
  await expect(page.getByRole('article', { name: 'Energy' })).toContainText(
    '250 kcal',
  )
})
