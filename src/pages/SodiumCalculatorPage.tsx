import { AlertCircle, Droplets, FlaskConical, ThermometerSun } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge, ProgressBar, StatCard } from '../components/Ui'
import { ELECTROLYTES } from '../data'
import {
  addNutrition,
  nutritionForItems,
  round,
} from '../lib/nutrition'
import { interpretPlanDays } from '../lib/planner'
import { calculateSupplementScenario } from '../lib/supplements'
import type { Food, PlannerState } from '../types'
import { MEALS } from '../types'

export function SodiumCalculatorPage({
  state,
  foods,
}: {
  state: PlannerState
  foods: Food[]
}) {
  const [temperature, setTemperature] = useState(25)
  const [dayId, setDayId] = useState(state.days[0]?.id ?? '')
  const [electrolyteId, setElectrolyteId] = useState(
    ELECTROLYTES.find((item) => item.sodium && item.potassium)?.id ??
      ELECTROLYTES[0].id,
  )

  const day =
    state.days.find((candidate) => candidate.id === dayId) ?? state.days[0]
  const interpretations = useMemo(
    () => {
      if (!day) return []
      const grouped = interpretPlanDays([day], foods, state.recipes)
      return MEALS.map((meal) => grouped.get(day.id)?.[meal] ?? [])
    },
    [day, foods, state.recipes],
  )
  const diet = useMemo(
    () =>
      interpretations.length > 0
        ? addNutrition(
            ...interpretations.map((items) => nutritionForItems(items)),
          )
        : addNutrition(),
    [interpretations],
  )
  const totalsIncomplete = interpretations.some((items) =>
    items.some(
      (interpretation) =>
        !interpretation.available ||
        (interpretation.target.kind === 'recipe' &&
          !interpretation.complete),
    ),
  )

  const selected =
    ELECTROLYTES.find((item) => item.id === electrolyteId) ?? ELECTROLYTES[0]
  const {
    sodiumTarget,
    sweatSodium,
    sweatPotassium,
    potassiumTarget,
    sodiumGap,
    servings,
    servedPotassium,
    potassiumRemaining,
  } = calculateSupplementScenario(temperature, diet, selected)

  return (
    <div className="calculator-page">
      <section className="calculator-controls card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Conditions</span>
            <h2>Set the day you are planning</h2>
          </div>
          <ThermometerSun size={24} />
        </div>
        <label className="range-control">
          <div>
            <span>Expected high temperature</span>
            <strong>
              {temperature}°C · {round((temperature * 9) / 5 + 32)}°F
            </strong>
          </div>
          <input
            type="range"
            min="15"
            max="40"
            step="1"
            value={temperature}
            onChange={(event) => setTemperature(Number(event.target.value))}
          />
          <div className="range-labels">
            <span>15°C / 59°F</span>
            <span>40°C / 104°F</span>
          </div>
        </label>
        <div className="form-grid two-column">
          <label>
            Planned menu
            <select
              value={day?.id ?? ''}
              onChange={(event) => setDayId(event.target.value)}
            >
              {state.days.map((option) => (
                <option value={option.id} key={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Electrolyte product
            <select
              value={electrolyteId}
              onChange={(event) => setElectrolyteId(event.target.value)}
            >
              {ELECTROLYTES.filter((item) => (item.sodium ?? 0) > 0).map(
                (item) => (
                  <option value={item.id} key={item.id}>
                    {item.brand} {item.flavor ?? ''}
                  </option>
                ),
              )}
            </select>
          </label>
        </div>
      </section>

      {totalsIncomplete && (
        <div className="incomplete-warning" role="status">
          <AlertCircle size={18} />
          <p>
            <strong>Food sodium and totals are incomplete.</strong>{' '}
            <span>
              Replace or remove unavailable Foods before using a serving
              recommendation.
            </span>
          </p>
        </div>
      )}

      <section className="stat-grid stat-grid-four">
        <StatCard
          label="Sodium target"
          value={`${round(sodiumTarget).toLocaleString()} mg`}
          detail="Temperature-adjusted"
          accent="#e56f35"
        />
        <StatCard
          label="From food"
          value={`${round(diet.sodium).toLocaleString()} mg`}
          detail={
            totalsIncomplete
              ? 'Known Foods only · incomplete'
              : `${round((diet.sodium / sodiumTarget) * 100)}% of target`
          }
          accent="#227b62"
        />
        <StatCard
          label="Supplement gap"
          value={
            totalsIncomplete
              ? 'Incomplete'
              : `${round(sodiumGap).toLocaleString()} mg`
          }
          detail={
            totalsIncomplete
              ? 'Resolve unavailable Foods'
              : 'Additional sodium'
          }
          accent="#4779b8"
        />
        <StatCard
          label="Potassium target"
          value={`${round(potassiumTarget).toLocaleString()} mg`}
          detail="RDA + estimated sweat loss"
          accent="#9d6a35"
        />
      </section>

      <div className="calculator-grid">
        <section className="card balance-card">
          <div className="section-heading compact">
            <div>
              <span className="eyebrow">Daily balance</span>
              <h2>Food vs. estimated need</h2>
            </div>
            <Droplets size={22} />
          </div>
          <ProgressBar
            label={
              totalsIncomplete ? 'Sodium from known Foods' : 'Sodium from food'
            }
            value={diet.sodium}
            max={sodiumTarget}
            display={`${round(diet.sodium).toLocaleString()} / ${round(sodiumTarget).toLocaleString()} mg`}
            tone="green"
          />
          <ProgressBar
            label={
              totalsIncomplete
                ? 'Potassium from known Foods'
                : 'Potassium from food'
            }
            value={diet.potassium}
            max={potassiumTarget}
            display={`${round(diet.potassium).toLocaleString()} / ${round(potassiumTarget).toLocaleString()} mg`}
            tone="blue"
          />
          <div className="formula-breakdown">
            <div>
              <span>Baseline sodium allowance</span>
              <strong>1,500 mg</strong>
            </div>
            <div>
              <span>Estimated sweat sodium</span>
              <strong>{round(sweatSodium).toLocaleString()} mg</strong>
            </div>
            <div>
              <span>Estimated sweat potassium</span>
              <strong>{round(sweatPotassium).toLocaleString()} mg</strong>
            </div>
            <div>
              <span>Sweat Na : K assumption</span>
              <strong>4.5 : 1</strong>
            </div>
          </div>
        </section>

        <section className="card supplement-card">
          <div className="section-heading compact">
            <div>
              <span className="eyebrow">Supplement scenario</span>
              <h2>
                {selected.brand} {selected.flavor ?? ''}
              </h2>
            </div>
            <FlaskConical size={22} />
          </div>
          <div
            className={`serving-callout ${
              totalsIncomplete ? 'serving-callout-incomplete' : ''
            }`}
          >
            {totalsIncomplete ? (
              <>
                <span>Serving recommendation</span>
                <strong>Recommendation unavailable</strong>
                <small>Food sodium must be complete first.</small>
              </>
            ) : (
              <>
                <span>To fill the sodium gap</span>
                <strong>{round(servings, 1)} servings</strong>
                <small>
                  Adds{' '}
                  {round(
                    (selected.potassium ?? 0) * servings,
                  ).toLocaleString()}{' '}
                  mg potassium
                </small>
              </>
            )}
          </div>
          <div className="supplement-grid">
            <div>
              <span>Per serving</span>
              <strong>{round(selected.sodium ?? 0)} mg Na</strong>
              <small>{round(selected.potassium ?? 0)} mg K</small>
            </div>
            <div>
              <span>After supplement</span>
              {totalsIncomplete ? (
                <>
                  <strong>Unavailable</strong>
                  <small>Resolve unavailable Foods</small>
                </>
              ) : (
                <>
                  <strong>
                    {round(
                      diet.sodium + (selected.sodium ?? 0) * servings,
                    ).toLocaleString()}{' '}
                    mg Na
                  </strong>
                  <small>
                    {round(
                      diet.potassium + servedPotassium,
                    ).toLocaleString()}{' '}
                    mg K
                  </small>
                </>
              )}
            </div>
          </div>
          {!totalsIncomplete &&
            (potassiumRemaining > 0 ? (
              <div className="calculator-warning">
                <AlertCircle size={18} />
                <p>
                  This closes the sodium gap but leaves about{' '}
                  <strong>
                    {round(potassiumRemaining).toLocaleString()} mg
                  </strong>{' '}
                  of estimated potassium need. Adjust food choices or select a
                  more potassium-forward product.
                </p>
              </div>
            ) : (
              <Badge tone="green">
                Estimated sodium and potassium needs covered
              </Badge>
            ))}
        </section>
      </div>

      <p className="medical-note">
        This reproduces the workbook’s planning model and assumptions. Individual
        sweat rates vary widely; use personal testing and medical guidance for
        health decisions.
      </p>
    </div>
  )
}
