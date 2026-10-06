import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import {
  expectMacronutrients,
  launchClean,
  launchWithState,
  stateWithRecipe,
} from './helpers'

async function expectTextEntryControlsPreventFocusZoom(page: Page) {
  const undersizedControls = await page
    .locator('input, select, textarea')
    .evaluateAll((elements) => {
      const textEntryTypes = new Set([
        'date',
        'datetime-local',
        'email',
        'month',
        'number',
        'password',
        'search',
        'tel',
        'text',
        'time',
        'url',
        'week',
      ])

      return elements.flatMap((element) => {
        const control = element as HTMLInputElement
        const visible =
          control.getClientRects().length > 0 &&
          getComputedStyle(control).visibility !== 'hidden'
        const isTextEntry =
          control.tagName !== 'INPUT' || textEntryTypes.has(control.type)
        const fontSize = Number.parseFloat(getComputedStyle(control).fontSize)

        return visible && isTextEntry && fontSize < 16
          ? [
              {
                label:
                  control.getAttribute('aria-label') ??
                  control.labels?.[0]?.textContent?.trim() ??
                  control.getAttribute('placeholder') ??
                  control.tagName.toLowerCase(),
                fontSize,
              },
            ]
          : []
      })
    })

  expect(undersizedControls).toEqual([])
}

async function navigateOnMobile(
  page: Page,
  name: string,
) {
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('button', { name: new RegExp(`^${name}`) }).click()
}

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
  await dinner.getByRole('option', { name: /Trail bowl.*Recipe/ }).click()
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

test('mobile text-entry controls prevent iOS focus zoom @smoke', async ({
  page,
}) => {
  await launchWithState(page, stateWithRecipe())
  await expectTextEntryControlsPreventFocusZoom(page)

  await navigateOnMobile(page, 'Food library')
  await expectTextEntryControlsPreventFocusZoom(page)
  await page.getByRole('button', { name: 'Add food', exact: true }).click()
  await expectTextEntryControlsPreventFocusZoom(page)
  await page
    .getByRole('dialog', { name: 'Add a custom food' })
    .getByRole('button', { name: 'Cancel' })
    .click()

  await navigateOnMobile(page, 'Recipes')
  await expectTextEntryControlsPreventFocusZoom(page)
  await page.getByRole('button', { name: 'Create Recipe' }).click()
  await page
    .getByRole('button', { name: 'Add Recipe-only ingredient' })
    .click()
  await expectTextEntryControlsPreventFocusZoom(page)
  await page
    .getByRole('dialog', { name: 'Create Recipe' })
    .getByRole('button', { name: 'Cancel' })
    .click()

  await navigateOnMobile(page, 'Electrolytes')
  await expectTextEntryControlsPreventFocusZoom(page)

  await navigateOnMobile(page, 'Na/K calculator')
  await expectTextEntryControlsPreventFocusZoom(page)
})
