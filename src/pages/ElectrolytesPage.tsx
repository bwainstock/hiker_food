import { ArrowDownUp, Droplets, Search, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge, StatCard } from '../components/Ui'
import { ELECTROLYTES } from '../data'
import { round } from '../lib/nutrition'

type SortKey = 'sodium' | 'potassium' | 'servingGrams' | 'ratio'

export function ElectrolytesPage() {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('sodium')

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return ELECTROLYTES.filter((item) =>
      `${item.brand} ${item.flavor ?? ''}`.toLowerCase().includes(normalized),
    ).sort((a, b) => {
      const key = sort === 'ratio' ? 'sodiumPotassiumRatio' : sort
      return (b[key] ?? 0) - (a[key] ?? 0)
    })
  }, [query, sort])

  const averageSodium =
    ELECTROLYTES.reduce((sum, item) => sum + (item.sodium ?? 0), 0) /
    ELECTROLYTES.length
  const caffeinated = ELECTROLYTES.filter((item) => (item.caffeine ?? 0) > 0)
    .length

  return (
    <div className="library-page">
      <section className="stat-grid stat-grid-three">
        <StatCard
          label="Products compared"
          value={ELECTROLYTES.length.toString()}
          detail="From the original workbook"
          accent="#2e88a5"
        />
        <StatCard
          label="Average sodium"
          value={`${round(averageSodium)} mg`}
          detail="Per listed serving"
          accent="#227b62"
        />
        <StatCard
          label="With caffeine"
          value={caffeinated.toString()}
          detail="Check dosage before combining"
          accent="#9d6a35"
        />
      </section>

      <section className="library-toolbar electrolyte-toolbar">
        <label className="search-field">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search brand or product…"
          />
        </label>
        <label className="select-field">
          <ArrowDownUp size={16} />
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
          >
            <option value="sodium">Highest sodium</option>
            <option value="potassium">Highest potassium</option>
            <option value="ratio">Highest Na:K ratio</option>
            <option value="servingGrams">Largest serving</option>
          </select>
        </label>
      </section>

      <section className="electrolyte-grid">
        {filtered.map((item) => (
          <article className="electrolyte-card" key={item.id}>
            <div className="electrolyte-card-head">
              <div className="electrolyte-icon">
                <Droplets size={20} />
              </div>
              <div>
                <span>{item.brand}</span>
                <h3>{item.flavor ?? 'Electrolyte mix'}</h3>
              </div>
              {(item.caffeine ?? 0) > 0 && (
                <Badge tone="amber">
                  <Zap size={11} /> {round(item.caffeine ?? 0)} mg
                </Badge>
              )}
            </div>
            <div className="electrolyte-metrics">
              <div>
                <strong>{round(item.sodium ?? 0)}</strong>
                <span>mg sodium</span>
              </div>
              <div>
                <strong>{round(item.potassium ?? 0)}</strong>
                <span>mg potassium</span>
              </div>
              <div>
                <strong>
                  {item.sodiumPotassiumRatio
                    ? round(item.sodiumPotassiumRatio, 1)
                    : '—'}
                </strong>
                <span>Na : K</span>
              </div>
            </div>
            <div className="mineral-row">
              <span>Serving {round(item.servingGrams ?? 0, 1)} g</span>
              <span>Mg {round(item.magnesium ?? 0)} mg</span>
              <span>Ca {round(item.calcium ?? 0)} mg</span>
            </div>
            {item.micros && <p className="micros">{item.micros}</p>}
          </article>
        ))}
      </section>
    </div>
  )
}
