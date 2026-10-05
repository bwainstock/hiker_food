# Testing Trail Rations

## Test layers

- **Static verification**: Oxlint and the TypeScript/Vite production build catch
  style, hook, type, and bundling failures. The Cloudflare configuration check
  verifies the static-assets, SPA fallback, and preview contracts, then runs a
  Wrangler dry run.
- **Fast tests**: Vitest covers deterministic domain rules, Recipe and Plan
  schemas, catalog contracts, version migration, parsing, aggregation,
  calculations, and pure search/filter/sort behavior.
- **Browser smoke**: Playwright runs the shortest critical journeys in Chromium
  desktop and one representative mobile viewport against the built Vite preview.
- **Full browser regression**: Playwright adds data recovery, import/export,
  unresolved references, print, accessibility, keyboard, and catalog behaviors
  in Chromium. Firefox and WebKit are diagnostic, manual-only runs.

## Critical journeys

The blocking browser suite protects:

1. clean launch and state-only navigation on desktop and mobile;
2. planning Foods, quantity edits, Trail-day add/duplicate behavior, daily
   carbohydrate/fat/protein totals, Shopping-list aggregation, and reload
   persistence;
3. live Recipe ingredient and whole-Recipe nutrition, proportional
   Recipe-only scaling, draft cancellation, persistence, and incomplete
   nutrition across Recipe and Plan surfaces;
4. custom-Food creation, use, validation, and safe in-use deletion;
5. a known sodium/potassium supplement scenario;
6. final-Trail-day, schema-version-2 Recipe-aware export/import, legacy and
   version-1 migration, reset, previous-valid-state, invalid/future backup
   rejection, and malformed-startup recovery contracts;
7. unresolved Plan-item visibility, incomplete totals, replacement, and removal;
8. Food and electrolyte search/filter/sort behavior;
9. print invocation and print-media semantics;
10. axe scans of every screen and new modal/recovery surfaces, plus a
   keyboard-only primary journey.

## Commands

```bash
npm run lint
npm run build
npm run verify:cloudflare
npm run test:unit
npm run test:e2e:smoke
npm run test:e2e
npm run test:e2e:cross-browser
npm run verify
```

`test:e2e:smoke`, `test:e2e`, and `test:e2e:cross-browser` build first, then
exercise the Vite preview. `verify:cloudflare` builds and validates the
deployment configuration without uploading it. `verify` runs lint,
build/type-check, the Cloudflare check, Vitest, and the Chromium smoke runner
against that already-built preview. The development server is a convenience
only and is not canonical verification.

## Data and fixtures

Every Playwright journey uses the real bundled Food and electrolyte catalogs.
Small deterministic data belongs in Vitest fixtures or seeded browser state, not
in a test-only catalog mode. Seeded state may use fixed IDs; tests that inspect
newly generated JSON must normalize generated IDs instead of replacing
`crypto.randomUUID` globally. Backups and imports must pass through the production
runtime schema.

## Locators

Prefer accessible roles with visible names, labels, and other user-observable
text. Use `data-testid` only when no stable user-facing semantic exists. Do not
couple assertions to component structure or CSS selectors when a user-observable
contract is available.

## Artifacts and flakes

Blocking smoke and full-regression runs have no retries. Failure screenshots,
video, and traces are retained and uploaded by CI. Tests fail on unhandled page
errors and unexpected `console.error`. The manual Firefox/WebKit workflow may
retry once to gather diagnostics. Fix flakes at their source; do not mask them
with waits, retries, quarantine, or weakened assertions.

## CI matrix

| Trigger | Check | Browser coverage | Blocking |
| --- | --- | --- | --- |
| Pull request and push to `main` | `Smoke / Chromium` | Desktop Chromium + mobile Chromium viewport | Yes |
| Pull request and push to `main` | `Full regression / Chromium` | Desktop Chromium + mobile Chromium viewport | Yes |
| `workflow_dispatch` | `Firefox + WebKit / Manual` | Desktop Firefox + desktop WebKit | No |

CI calls the canonical npm scripts; workflow YAML must not duplicate hidden test
logic. Repository branch protection is configured outside this codebase.

## Ongoing change policy

Every behavior change identifies the affected critical journeys and updates the
smallest correct test layer. Bug fixes add a regression test. Intentional contract
changes update tests and domain/testing documentation together. There are no
silent skips or quarantines: any temporary skip needs a linked issue and must not
make `npm run verify` green by omission.
