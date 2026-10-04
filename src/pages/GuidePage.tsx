import {
  ArrowRight,
  BookOpen,
  Droplets,
  Gauge,
  Layers3,
  Scale,
  ShoppingBag,
  Utensils,
} from 'lucide-react'
import { Badge } from '../components/Ui'

const densityRows = [
  ['Heavy', 'Below 110 kcal/oz', 'slate'],
  ['Moderate', '110–125 kcal/oz', 'amber'],
  ['Lightweight', '125–140 kcal/oz', 'lime'],
  ['Very light', '140–155 kcal/oz', 'green'],
  ['Ultralight', '155–170 kcal/oz', 'teal'],
  ['Hyperlight', 'Above 170 kcal/oz', 'blue'],
]

export function GuidePage() {
  return (
    <div className="guide-page">
      <section className="guide-hero">
        <div>
          <Badge tone="green">Workbook faithfully reimagined</Badge>
          <h2>Build a lighter menu without losing sight of real nutrition.</h2>
          <p>
            Trail Rations turns the spreadsheet workflow into a guided planner:
            choose food, adjust servings, compare each meal and day, then pack the
            consolidated list.
          </p>
        </div>
        <div className="guide-hero-mark">
          <BookOpen size={38} />
        </div>
      </section>

      <section className="workflow-grid">
        <article>
          <span>01</span>
          <Utensils size={22} />
          <h3>Build each day</h3>
          <p>
            Add foods to seven meal periods. Every item is calculated from its
            listed serving size and quantity.
          </p>
        </article>
        <ArrowRight className="workflow-arrow" />
        <article>
          <span>02</span>
          <Gauge size={22} />
          <h3>Check the balance</h3>
          <p>
            Watch calorie density, carb-to-protein ratio, fat, sugar, and sodium
            shift as the menu changes.
          </p>
        </article>
        <ArrowRight className="workflow-arrow" />
        <article>
          <span>03</span>
          <ShoppingBag size={22} />
          <h3>Pack once</h3>
          <p>
            Identical items across every day are merged into one shopping and
            packing quantity.
          </p>
        </article>
      </section>

      <div className="guide-grid">
        <section className="card key-card">
          <div className="section-heading compact">
            <div>
              <span className="eyebrow">Weight characterization</span>
              <h2>Calories carried per ounce</h2>
            </div>
            <Scale size={22} />
          </div>
          <div className="key-list">
            {densityRows.map(([label, range, tone]) => (
              <div key={label}>
                <Badge tone={tone}>{label}</Badge>
                <span>{range}</span>
              </div>
            ))}
          </div>
          <p>
            Calorie density is the workbook’s main weight signal. Higher is
            lighter, but density alone does not make a nutritionally complete
            menu.
          </p>
        </section>

        <section className="card key-card">
          <div className="section-heading compact">
            <div>
              <span className="eyebrow">Macro balance</span>
              <h2>Carbohydrate to protein ratio</h2>
            </div>
            <Layers3 size={22} />
          </div>
          <div className="key-list">
            <div>
              <Badge tone="rose">Imbalanced</Badge>
              <span>Below 2.5 or above 4.5</span>
            </div>
            <div>
              <Badge tone="lime">Good</Badge>
              <span>2.5–2.9 or 4.1–4.5</span>
            </div>
            <div>
              <Badge tone="green">Optimum</Badge>
              <span>3.0–4.0</span>
            </div>
          </div>
          <p>
            This is a broad planning heuristic from the original spreadsheet,
            best read across a full day rather than as a rule for every snack.
          </p>
        </section>

        <section className="card key-card">
          <div className="section-heading compact">
            <div>
              <span className="eyebrow">Fat rating</span>
              <h2>Share of macro calories</h2>
            </div>
            <Gauge size={22} />
          </div>
          <div className="key-list">
            <div>
              <Badge tone="slate">Low</Badge>
              <span>Below 40%</span>
            </div>
            <div>
              <Badge tone="amber">Moderate</Badge>
              <span>40–50%</span>
            </div>
            <div>
              <Badge tone="lime">Good</Badge>
              <span>50–60%</span>
            </div>
            <div>
              <Badge tone="green">Very good</Badge>
              <span>60–70%</span>
            </div>
            <div>
              <Badge tone="teal">High</Badge>
              <span>70% or more</span>
            </div>
          </div>
        </section>

        <section className="card key-card">
          <div className="section-heading compact">
            <div>
              <span className="eyebrow">Sodium content</span>
              <h2>Milligrams per calorie</h2>
            </div>
            <Droplets size={22} />
          </div>
          <div className="key-list">
            <div>
              <Badge tone="slate">Below allowance</Badge>
              <span>Below 0.64 mg/kcal</span>
            </div>
            <div>
              <Badge tone="lime">Light</Badge>
              <span>0.64–1.00 mg/kcal</span>
            </div>
            <div>
              <Badge tone="amber">Medium</Badge>
              <span>1.00–1.25 mg/kcal</span>
            </div>
            <div>
              <Badge tone="rose">Heavy</Badge>
              <span>Above 1.25 mg/kcal</span>
            </div>
          </div>
        </section>
      </div>

      <section className="source-note">
        <strong>About the source</strong>
        <p>
          The workbook credits Gear Skeptic’s Hiker Food 2.5 research. This local
          tool preserves its food catalog, electrolyte catalog, ratings, sample
          menu, shopping aggregation, and Na/K calculator while replacing
          spreadsheet formulas with live browser calculations.
        </p>
      </section>
    </div>
  )
}
