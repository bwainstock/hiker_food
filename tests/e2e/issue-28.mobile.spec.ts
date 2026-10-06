import { createCustomFood } from '../../src/lib/customFood'
import { expect, test } from './fixtures'
import { emptyState, launchWithState } from './helpers'

const customFood = createCustomFood(
  {
    brand: 'Trail Test',
    flavor: 'Couscous',
    category: 'Entrée',
    prep: 'hot',
    servingGrams: 100,
    calories: 500,
    fat: 12.5,
    sodium: 640,
    potassium: 300,
    carbs: 60,
    fiber: 5,
    sugar: 4,
    protein: 20,
  },
  'custom-mobile-food',
)

const secondCustomFood = createCustomFood(
  {
    brand: 'Trail Test',
    flavor: 'Granola',
    category: 'Breakfast',
    prep: 'N/A',
    servingGrams: 80,
    calories: 360,
    fat: 14,
    sodium: 120,
    potassium: 200,
    carbs: 48,
    fiber: 6,
    sugar: 12,
    protein: 10,
  },
  'custom-mobile-granola',
)

test('Food results use complete compact cards at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await launchWithState(page, emptyState(undefined, [customFood]))
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('button', { name: /^Food library/ }).click()
  await page.getByRole('textbox', { name: 'Search foods' }).fill(customFood.name)

  const card = page.getByRole('article', { name: customFood.name })

  await expect(card).toBeVisible()
  await expect(page.getByRole('table')).toBeHidden()
  await expect(card).toContainText('Entrée')
  await expect(card).toContainText('hot')
  await expect(card).toContainText('Serving')
  await expect(card).toContainText('100 g')
  await expect(card).toContainText('3.53 oz')
  await expect(card).toContainText('Calories')
  await expect(card).toContainText('500')
  await expect(card).toContainText('Calorie density')
  await expect(card).toContainText('142 kcal / oz')
  await expect(card).toContainText('Fat')
  await expect(card).toContainText('12.5 g')
  await expect(card).toContainText('Carbohydrates')
  await expect(card).toContainText('60 g')
  await expect(card).toContainText('Protein')
  await expect(card).toContainText('20 g')
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  expect(
    await page
      .getByRole('region', { name: 'Food results' })
      .evaluate((element) => element.scrollWidth <= element.clientWidth),
  ).toBe(true)
})

test('Food card details expand independently and expose Custom Food deletion', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await launchWithState(
    page,
    emptyState(undefined, [customFood, secondCustomFood]),
  )
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('button', { name: /^Food library/ }).click()
  await page.getByRole('textbox', { name: 'Search foods' }).fill('Trail Test')

  const couscous = page.getByRole('article', { name: customFood.name })
  const granola = page.getByRole('article', { name: secondCustomFood.name })
  const couscousDetails = couscous.getByRole('button', {
    name: `Show details for ${customFood.name}`,
  })
  const granolaDetails = granola.getByRole('button', {
    name: `Show details for ${secondCustomFood.name}`,
  })

  await expect(couscous).not.toContainText('640 mg')
  await expect(granola).not.toContainText('120 mg')

  await couscousDetails.click()
  await granolaDetails.click()

  await expect(couscous).toContainText('Sodium')
  await expect(couscous).toContainText('640 mg')
  await expect(granola).toContainText('Sodium')
  await expect(granola).toContainText('120 mg')
  await expect(
    couscous.getByRole('button', { name: `Hide details for ${customFood.name}` }),
  ).toHaveAttribute('aria-expanded', 'true')
  await expect(
    granola.getByRole('button', {
      name: `Hide details for ${secondCustomFood.name}`,
    }),
  ).toHaveAttribute('aria-expanded', 'true')
  await expect(
    couscous.getByRole('button', { name: `Delete ${customFood.name}` }),
  ).toBeVisible()
})

test('Food cards preserve search, filtering, sorting, and the result limit', async ({
  page,
}) => {
  const limitedFoods = Array.from({ length: 301 }, (_, index) =>
    createCustomFood(
      {
        brand: 'Limit Test',
        flavor: `Food ${String(index).padStart(3, '0')}`,
        category: 'Entrée',
        prep: 'N/A',
        servingGrams: 100,
        calories: 400,
        fat: 10,
        sodium: 100,
        potassium: 100,
        carbs: 60,
        fiber: 5,
        sugar: 5,
        protein: 15,
      },
      `custom-limit-${index}`,
    ),
  )
  await page.setViewportSize({ width: 390, height: 844 })
  await launchWithState(page, emptyState(undefined, limitedFoods))
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('button', { name: /^Food library/ }).click()

  await page.getByRole('textbox', { name: 'Search foods' }).fill('Limit Test')
  await page
    .getByRole('combobox', { name: 'Filter foods by category' })
    .selectOption('Entrée')
  await page
    .getByRole('combobox', { name: 'Sort foods' })
    .selectOption('name')

  const results = page.getByRole('region', { name: 'Food results' })
  await expect(page.getByText('301 foods')).toBeVisible()
  await expect(results.getByRole('article')).toHaveCount(300)
  await expect(results.getByRole('article').first()).toHaveAccessibleName(
    'Limit Test Food 000',
  )
  await expect(results.getByRole('article').last()).toHaveAccessibleName(
    'Limit Test Food 299',
  )
  await expect(results).toContainText(
    'Showing the first 300 matches. Refine your search to narrow the list.',
  )
})

test('Food results retain the desktop table above 620px', async ({ page }) => {
  await page.setViewportSize({ width: 621, height: 844 })
  await launchWithState(page, emptyState(undefined, [customFood]))
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('button', { name: /^Food library/ }).click()
  await page.getByRole('textbox', { name: 'Search foods' }).fill(customFood.name)

  await expect(page.getByRole('table')).toBeVisible()
  await expect(
    page.getByRole('region', { name: 'Food results' }),
  ).toBeHidden()
})
