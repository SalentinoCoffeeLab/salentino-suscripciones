import { useState } from 'react'
import { SALENTINO_PLANS, type CoffeePlan } from './data/plans'
import { CoffeeConveyor } from './components/CoffeeConveyor'
import { SubscriptionDialog } from './components/SubscriptionDialog'

// Replace with deployed Apps Script URL
const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || 'https://script.google.com/macros/s/PENDING/exec'

function App() {
  const [selectedPlan, setSelectedPlan] = useState<CoffeePlan | null>(null)

  return (
    <>
      <CoffeeConveyor
        plans={SALENTINO_PLANS}
        onSelectPlan={setSelectedPlan}
        autoplay
        speed={22}
      />
      {selectedPlan && (
        <SubscriptionDialog
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
          appsScriptUrl={APPS_SCRIPT_URL}
        />
      )}
    </>
  )
}

export default App
