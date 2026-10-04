# Trail Rations

A local, browser-based backcountry meal planner recreated from `hiker_food.xlsx`.
It includes the workbook's food and electrolyte catalogs, multi-day meal planning,
live nutrition and weight calculations, shopping-list aggregation, color-key
ratings, custom foods, and the sodium/potassium calculator.

## Run locally

```bash
npm install
npm run dev
```

Open the URL printed by Vite (normally `http://localhost:5173`).

## Build

```bash
npm run build
npm run preview
```

Plans and custom foods are stored in the browser's local storage. Use **Export**
in the planner to download a versioned JSON backup. **Import**, **Reset**, and
**Previous** provide previewed, one-step recovery operations without merging
data.

## Verification

```bash
npm run verify
npm run test:e2e
```

See [the testing guide](docs/agents/testing.md) for all layers, browser coverage,
and change policy.

## Domain documentation

- [Canonical domain language](GLOSSARY.md)
- [Architecture decisions](docs/adr/)
- [Agent domain-doc conventions](docs/agents/domain.md)

## Workbook mapping

| Workbook sheet | Web tool |
| --- | --- |
| Multi-day planner | Meal planner with flexible days and meal items |
| Shopping List | Consolidated, checkable pack list |
| Hiker Food | Searchable food library with 1,653 entries |
| Color Keys | Live density, macro, fat, sugar, and sodium ratings |
| Electrolytes | Searchable comparison of 138 products |
| NaK Calculator | Temperature-adjusted sodium and potassium calculator |

The bundled catalogs are generated from the source workbook and require no
network connection.
