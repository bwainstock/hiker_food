import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { parse, printParseErrorCode } from 'jsonc-parser'

const configPath = resolve(process.argv[2] ?? 'wrangler.jsonc')
const source = await readFile(configPath, 'utf8')
const parseErrors = []
const config = parse(source, parseErrors, { allowTrailingComma: true })

if (parseErrors.length > 0) {
  const details = parseErrors
    .map(
      ({ error, offset }) =>
        `${printParseErrorCode(error)} at character ${offset}`,
    )
    .join('\n')
  throw new Error(`Unable to parse ${configPath}:\n${details}`)
}

const violations = []
const isObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

if (!isObject(config)) {
  violations.push('the root value must be an object')
} else {
  if (!isObject(config.assets)) {
    violations.push('"assets" must be an object')
  } else {
    const configuredAssets = config.assets.directory
    const expectedAssets = resolve(dirname(configPath), 'dist')
    if (
      typeof configuredAssets !== 'string' ||
      resolve(dirname(configPath), configuredAssets) !== expectedAssets
    ) {
      violations.push('"assets.directory" must point to "./dist"')
    }

    if (config.assets.not_found_handling !== 'single-page-application') {
      violations.push(
        '"assets.not_found_handling" must be "single-page-application"',
      )
    }
  }

  if (config.preview_urls !== true) {
    violations.push('"preview_urls" must be true')
  }

  if (!Object.hasOwn(config, 'previews') || !isObject(config.previews)) {
    violations.push(
      '"previews" must be a top-level object because Workers Builds runs "wrangler preview"',
    )
  }
}

if (violations.length > 0) {
  throw new Error(
    `Invalid Cloudflare deployment config:\n${violations
      .map((violation) => `- ${violation}`)
      .join('\n')}`,
  )
}

console.log(`Cloudflare config verified: ${configPath}`)
