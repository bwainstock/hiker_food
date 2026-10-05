import { expect, test } from './fixtures'
import { launchClean } from './helpers'

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
