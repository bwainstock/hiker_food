import { expect, test as base } from '@playwright/test'

export const test = base.extend({
  page: async ({ page }, run) => {
    const pageErrors: string[] = []
    const consoleErrors: string[] = []

    page.on('pageerror', (error) => pageErrors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })

    await run(page)

    expect(pageErrors, 'Unhandled page errors').toEqual([])
    expect(consoleErrors, 'Unexpected console.error messages').toEqual([])
  },
})

export { expect }
