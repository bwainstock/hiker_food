import { Download, RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'
import './App.css'
import { Layout } from './components/Layout'
import { BUILT_IN_FOODS } from './data'
import { useLocalStorage } from './hooks/useLocalStorage'
import { createStarterState } from './lib/planner'
import { ElectrolytesPage } from './pages/ElectrolytesPage'
import { FoodLibraryPage } from './pages/FoodLibraryPage'
import { GuidePage } from './pages/GuidePage'
import { PlannerPage } from './pages/PlannerPage'
import { ShoppingPage } from './pages/ShoppingPage'
import { SodiumCalculatorPage } from './pages/SodiumCalculatorPage'
import type { Route } from './types'

const PAGE_META: Record<Route, { title: string; description: string }> = {
  planner: {
    title: 'Meal planner',
    description: 'Design each day and see the weight, energy, and nutrition live.',
  },
  shopping: {
    title: 'Shopping list',
    description: 'One consolidated pack list across your entire trip.',
  },
  foods: {
    title: 'Food library',
    description: 'Explore the workbook catalog or add your own trail staples.',
  },
  electrolytes: {
    title: 'Electrolytes',
    description: 'Compare sodium, potassium, minerals, caffeine, and serving weight.',
  },
  sodium: {
    title: 'Sodium & potassium',
    description: 'Estimate hot-weather needs against a planned day of food.',
  },
  guide: {
    title: 'Trail guide',
    description: 'Understand the workflow and the workbook’s nutrition color keys.',
  },
}

function App() {
  const [route, setRoute] = useState<Route>('planner')
  const [state, setState] = useLocalStorage('trail-rations-plan-v1', () =>
    createStarterState(BUILT_IN_FOODS),
  )
  const foods = useMemo(
    () => [...state.customFoods, ...BUILT_IN_FOODS],
    [state.customFoods],
  )
  const foodsById = useMemo(
    () => new Map(foods.map((food) => [food.id, food])),
    [foods],
  )
  const meta = PAGE_META[route]

  const exportPlan = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'trail-rations-plan.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const resetPlan = () => {
    if (
      window.confirm(
        'Reset the planner to the workbook sample day? Your current plan and custom foods will be replaced.',
      )
    ) {
      setState(createStarterState(BUILT_IN_FOODS))
      setRoute('planner')
    }
  }

  return (
    <Layout
      route={route}
      onRoute={setRoute}
      pageTitle={meta.title}
      pageDescription={meta.description}
      headerActions={
        route === 'planner' ? (
          <>
            <button
              className="button button-quiet desktop-action"
              type="button"
              onClick={resetPlan}
            >
              <RotateCcw size={16} /> Reset
            </button>
            <button
              className="button button-secondary"
              type="button"
              onClick={exportPlan}
            >
              <Download size={16} /> Export
            </button>
          </>
        ) : undefined
      }
    >
      {route === 'planner' && (
        <PlannerPage
          state={state}
          setState={setState}
          foods={foods}
          foodsById={foodsById}
        />
      )}
      {route === 'shopping' && (
        <ShoppingPage state={state} foodsById={foodsById} />
      )}
      {route === 'foods' && (
        <FoodLibraryPage
          foods={foods}
          setState={setState}
        />
      )}
      {route === 'electrolytes' && <ElectrolytesPage />}
      {route === 'sodium' && (
        <SodiumCalculatorPage state={state} foodsById={foodsById} />
      )}
      {route === 'guide' && <GuidePage />}
    </Layout>
  )
}

export default App
