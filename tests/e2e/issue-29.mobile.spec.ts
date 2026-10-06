import { expect, test } from './fixtures'
import { emptyState, launchWithState } from './helpers'

const LONG_FOOD_NAME =
  "Backpacker's Pantry Organic Hot Blueberry, Walnut, Oats & Quinoa Cereal"
const LONG_RECIPE_NAME =
  'Peanut butter couscous breakfast with dried blueberries and walnuts'

test('long Food Plan item stays readable with usable controls at 390px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const state = emptyState()
  state.days[0].meals.Breakfast.push({
    id: 'long-food',
    target: {
      kind: 'food',
      id: 'backpacker-s-pantry-organic-hot-blueberry-walnut-oats-quinoa-1180',
    },
    quantity: 1,
  })
  await launchWithState(page, state)

  const breakfast = page.getByRole('article', { name: 'Breakfast' })
  const name = breakfast.getByText(LONG_FOOD_NAME, { exact: true })
  const quantity = breakfast.getByRole('spinbutton', {
    name: `Quantity for ${LONG_FOOD_NAME}`,
  })
  const remove = breakfast.getByRole('button', {
    name: `Remove ${LONG_FOOD_NAME}`,
  })

  await expect(name).toBeVisible()
  await expect(quantity).toBeVisible()
  await expect(remove).toBeVisible()
  expect((await name.boundingBox())?.width).toBeGreaterThanOrEqual(240)
  for (const control of [quantity, remove]) {
    const box = await control.boundingBox()
    expect(box?.x).toBeGreaterThanOrEqual(0)
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390)
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)

  await remove.click()
  await expect(name).toHaveCount(0)
})

test('long Recipe Plan item stays readable with usable controls at 390px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const state = emptyState()
  state.recipes.push({
    id: 'long-recipe',
    name: LONG_RECIPE_NAME,
    category: 'Breakfast',
    instructions: '',
    ingredients: [
      {
        kind: 'food',
        foodId: 'justin-s-classic-peanut-butter-19',
        quantity: 1,
      },
    ],
  })
  state.days[0].meals.Breakfast.push({
    id: 'long-recipe-placement',
    target: { kind: 'recipe', id: 'long-recipe' },
    quantity: 1,
  })
  await launchWithState(page, state)

  const breakfast = page.getByRole('article', { name: 'Breakfast' })
  const name = breakfast.getByText(LONG_RECIPE_NAME, { exact: true })
  const quantity = breakfast.getByRole('spinbutton', {
    name: `Quantity for ${LONG_RECIPE_NAME}`,
  })
  const remove = breakfast.getByRole('button', {
    name: `Remove ${LONG_RECIPE_NAME}`,
  })

  await expect(name).toBeVisible()
  await expect(quantity).toBeVisible()
  await expect(remove).toBeVisible()
  expect((await name.boundingBox())?.width).toBeGreaterThanOrEqual(240)
  for (const control of [quantity, remove]) {
    const box = await control.boundingBox()
    expect(box?.x).toBeGreaterThanOrEqual(0)
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390)
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)

  await remove.click()
  await expect(name).toHaveCount(0)
})

test('unresolved Plan items keep usable Replace and Remove actions at 390px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const state = emptyState()
  state.days[0].meals.Breakfast.push({
    id: 'missing-breakfast',
    target: {
      kind: 'food',
      id: 'retired-breakfast-food-with-a-long-catalog-identifier',
    },
    quantity: 2.3,
  })
  state.days[0].meals.Lunch.push({
    id: 'missing-lunch',
    target: { kind: 'food', id: 'retired-lunch-food' },
    quantity: 1.2,
  })
  await launchWithState(page, state)

  const breakfast = page.getByRole('article', { name: 'Breakfast' })
  const unavailableName = breakfast.getByText('Unavailable Food', {
    exact: true,
  })
  const quantity = breakfast.getByRole('spinbutton', {
    name: /Quantity for Unavailable food retired-breakfast/,
  })
  const replace = breakfast.getByRole('button', { name: 'Replace' })
  const remove = breakfast.getByRole('button', {
    name: /Remove Unavailable food retired-breakfast/,
  })

  await expect(unavailableName).toBeVisible()
  await expect(quantity).toBeVisible()
  await expect(replace).toBeVisible()
  await expect(remove).toBeVisible()
  expect((await unavailableName.boundingBox())?.width).toBeGreaterThanOrEqual(
    240,
  )
  for (const control of [quantity, replace, remove]) {
    const box = await control.boundingBox()
    expect(box?.x).toBeGreaterThanOrEqual(0)
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390)
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)

  await replace.click()
  const replacement = breakfast.getByRole('combobox', {
    name: /Choose replacement for retired-breakfast/,
  })
  await replacement.fill("Justin's Classic Peanut Butter")
  await breakfast
    .getByRole('option', { name: /Justin's Classic Peanut Butter/ })
    .click()
  await expect(
    breakfast.getByRole('spinbutton', {
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
    lunch.getByText('Food ID: retired-lunch-food', { exact: true }),
  ).toHaveCount(0)
})

test('quantity validation and blur or Enter commits are unchanged at 390px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
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
  const energy = page.getByRole('article', { name: 'Energy' })

  await quantity.fill('1.25')
  await quantity.press('Enter')
  await expect(page.getByRole('alert')).toContainText(
    'Enter a quantity in increments of 0.1.',
  )
  await expect(energy).toContainText('210 kcal')
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)

  await quantity.fill('1.2')
  await quantity.press('Enter')
  await expect(energy).toContainText('252 kcal')

  await quantity.fill('1.3')
  await quantity.press('Tab')
  await expect(energy).toContainText('273 kcal')

  await page.reload()
  await expect(
    page.getByRole('spinbutton', {
      name: "Quantity for Justin's Classic Peanut Butter",
    }),
  ).toHaveValue('1.3')
})
