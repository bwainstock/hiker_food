import { useMemo, useState } from 'react'
import './App.css'
import { DataManagement } from './components/DataManagement'
import { Layout } from './components/Layout'
import { RecoveryScreen } from './components/RecoveryScreen'
import { BUILT_IN_FOODS } from './data'
import { usePlannerState } from './hooks/usePlannerState'
import { createStarterState } from './lib/planner'
import { ElectrolytesPage } from './pages/ElectrolytesPage'
import { FoodLibraryPage } from './pages/FoodLibraryPage'
import { GuidePage } from './pages/GuidePage'
import { PlannerPage } from './pages/PlannerPage'
import { RecipesPage } from './pages/RecipesPage'
import { ShoppingPage } from './pages/ShoppingPage'
import { SodiumCalculatorPage } from './pages/SodiumCalculatorPage'
import type { Route } from './types'

const NO_CUSTOM_FOODS = [] as const

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
  recipes: {
    title: 'Recipes',
    description: 'Build reusable one-serving Recipes from Foods in your library.',
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
  const createStarter = () => createStarterState(BUILT_IN_FOODS)
  const store = usePlannerState(createStarter)
  const { snapshot } = store
  const customFoods =
    snapshot.status === 'ready'
      ? snapshot.state.customFoods
      : NO_CUSTOM_FOODS
  const foods = useMemo(
    () => [...BUILT_IN_FOODS, ...customFoods],
    [customFoods],
  )
  const foodsById = useMemo(
    () => new Map(foods.map((food) => [food.id, food])),
    [foods],
  )

  if (snapshot.status === 'recovery') {
    return (
      <RecoveryScreen
        raw={snapshot.raw}
        summary={snapshot.summary}
        errors={snapshot.errors}
        storageError={snapshot.storageError}
        builtInFoods={BUILT_IN_FOODS}
        createStarterState={createStarter}
        onReset={store.recoverWithReset}
      />
    )
  }

  const state = snapshot.state
  const setState = store.setState
  const meta = PAGE_META[route]

  return (
    <Layout
      route={route}
      onRoute={setRoute}
      pageTitle={meta.title}
      pageDescription={meta.description}
      headerActions={
        route === 'planner' ? (
          <DataManagement
            state={state}
            previous={snapshot.previous}
            builtInFoods={BUILT_IN_FOODS}
            createStarterState={createStarter}
            replaceState={store.replaceState}
            restorePrevious={store.restorePrevious}
            deletePrevious={store.deletePrevious}
            onStateReplaced={() => setRoute('planner')}
          />
        ) : undefined
      }
    >
      {snapshot.storageError && (
        <div className="data-warning" role="alert">
          Browser storage could not be updated: {snapshot.storageError}
        </div>
      )}
      {route === 'planner' && (
        <PlannerPage
          state={state}
          setState={setState}
          foods={foods}
          foodsById={foodsById}
        />
      )}
      {route === 'shopping' && (
        <ShoppingPage
          state={state}
          setState={setState}
          foods={foods}
          foodsById={foodsById}
        />
      )}
      {route === 'foods' && (
        <FoodLibraryPage
          state={state}
          foods={foods}
          setState={setState}
        />
      )}
      {route === 'recipes' && (
        <RecipesPage
          state={state}
          setState={setState}
          foods={foods}
          foodsById={foodsById}
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
