import { expect, test } from './fixtures'
import {
  emptyState,
  launchWithState,
  stateWithIncompleteRecipe,
  stateWithRecipe,
} from './helpers'

test('a Food result tap adds exactly one Plan item', async ({ page }) => {
  await launchWithState(page, emptyState())
  const breakfast = page.getByRole('article', { name: 'Breakfast' })

  await breakfast.getByRole('combobox').fill("Justin's Classic Peanut Butter")
  await breakfast
    .getByRole('option', { name: /Justin's Classic Peanut Butter/ })
    .tap()

  await expect(
    breakfast.getByRole('spinbutton', {
      name: "Quantity for Justin's Classic Peanut Butter",
    }),
  ).toHaveCount(1)
})

test('a disabled Recipe result cannot be selected by touch', async ({ page }) => {
  const state = stateWithIncompleteRecipe()
  state.days[0].meals.Dinner = []
  await launchWithState(page, state)
  const dinner = page.getByRole('article', { name: 'Dinner' })

  await dinner.getByRole('combobox').fill('Incomplete trail bowl')
  const option = dinner.getByRole('option', {
    name: /Incomplete trail bowl/,
  })
  await expect(option).toBeDisabled()
  await option.tap({ force: true })

  await expect(
    dinner.getByRole('spinbutton', {
      name: 'Quantity for Incomplete trail bowl',
    }),
  ).toHaveCount(0)
})

test('a Food result tap replaces an unavailable Food exactly once', async ({
  page,
}) => {
  const state = emptyState()
  state.days[0].meals.Dinner.push({
    id: 'unavailable-food',
    target: { kind: 'food', id: 'retired-food' },
    quantity: 2,
  })
  await launchWithState(page, state)
  const dinner = page.getByRole('article', { name: 'Dinner' })

  await dinner.getByRole('button', { name: 'Replace' }).click()
  await dinner
    .getByRole('combobox', { name: /Choose replacement for retired-food/ })
    .fill("Justin's Classic Peanut Butter")
  await dinner
    .getByRole('option', { name: /Justin's Classic Peanut Butter/ })
    .tap()

  const replacementQuantity = dinner.getByRole('spinbutton', {
    name: "Quantity for Justin's Classic Peanut Butter",
  })
  await expect(replacementQuantity).toHaveCount(1)
  await expect(replacementQuantity).toHaveValue('2')
  await expect(dinner.getByText('retired-food')).toHaveCount(0)
})

test('mouse selection still adds exactly one Food Plan item', async ({ page }) => {
  await launchWithState(page, emptyState())
  const breakfast = page.getByRole('article', { name: 'Breakfast' })

  await breakfast.getByRole('combobox').fill("Justin's Classic Peanut Butter")
  await breakfast
    .getByRole('option', { name: /Justin's Classic Peanut Butter/ })
    .click()

  await expect(
    breakfast.getByRole('spinbutton', {
      name: "Quantity for Justin's Classic Peanut Butter",
    }),
  ).toHaveCount(1)
})

test('keyboard selection still adds exactly one Food Plan item', async ({
  page,
}) => {
  await launchWithState(page, emptyState())
  const breakfast = page.getByRole('article', { name: 'Breakfast' })

  await breakfast.getByRole('combobox').fill("Justin's Classic Peanut Butter")
  await breakfast
    .getByRole('option', { name: /Justin's Classic Peanut Butter/ })
    .focus()
  await page.keyboard.press('Enter')

  await expect(
    breakfast.getByRole('spinbutton', {
      name: "Quantity for Justin's Classic Peanut Butter",
    }),
  ).toHaveCount(1)
})

test('moving focus outside the picker still dismisses results', async ({
  page,
}) => {
  await launchWithState(page, emptyState())
  const breakfast = page.getByRole('article', { name: 'Breakfast' })
  const option = breakfast.getByRole('option', {
    name: /Justin's Classic Peanut Butter/,
  })

  await breakfast.getByRole('combobox').fill("Justin's Classic Peanut Butter")
  await expect(option).toBeVisible()
  await page.getByRole('button', { name: 'Duplicate' }).focus()

  await expect(option).toHaveCount(0)
  await expect(
    breakfast.getByRole('spinbutton', {
      name: "Quantity for Justin's Classic Peanut Butter",
    }),
  ).toHaveCount(0)
})

test('an eligible Recipe result tap adds exactly one Plan item', async ({
  page,
}) => {
  await launchWithState(page, stateWithRecipe())
  const dinner = page.getByRole('article', { name: 'Dinner' })

  await dinner.getByRole('combobox').fill('Trail bowl')
  await dinner.getByRole('option', { name: /Trail bowl.*Recipe/ }).tap()

  await expect(
    dinner.getByRole('spinbutton', { name: 'Quantity for Trail bowl' }),
  ).toHaveCount(1)
})
