import { useReducer, useCallback, useState } from 'react'
import {
  getPlanById,
  getMonthlyPrice,
  getPerShipmentPrice,
  formatPrice,
  LINE_INFO,
  GRIND_OPTIONS,
} from './data/plans'
import { StepCafe } from './components/StepCafe'
import { StepConfigura } from './components/StepConfigura'
import { StepEntrega } from './components/StepEntrega'

const APPS_SCRIPT_URL =
  import.meta.env.VITE_APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbxByZJX2nvM-nUBoVyAKPM3gN2zSAghVmCcu3zRcbLLFnWMRZhaKasH7PGs5aJduUBfBA/exec'

/* ── State ── */

type FlowState = {
  step: 1 | 2 | 3
  line: 'diario' | 'especial' | null
  planId: string | null
  freqId: string | null
  freqDays: number | null
  grind: string | null
}

type FlowAction =
  | { type: 'SELECT_LINE'; line: 'diario' | 'especial' }
  | { type: 'UPDATE_PLAN'; planId: string; freqId: string; freqDays: number }
  | { type: 'SET_GRIND'; grindId: string }
  | { type: 'GO_STEP'; step: 1 | 2 | 3 }

const initial: FlowState = {
  step: 1,
  line: null,
  planId: null,
  freqId: null,
  freqDays: null,
  grind: null,
}

function reducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case 'SELECT_LINE': {
      const changing = state.line !== action.line
      return {
        ...state,
        line: action.line,
        // Only auto-advance when picking a new line (not re-clicking the same one)
        ...(changing ? { step: 2 as const, planId: null, freqId: null, freqDays: null, grind: null } : {}),
      }
    }
    case 'UPDATE_PLAN':
      return { ...state, planId: action.planId, freqId: action.freqId, freqDays: action.freqDays }
    case 'SET_GRIND':
      return { ...state, grind: action.grindId }
    case 'GO_STEP':
      return { ...state, step: action.step }
  }
}

/* ── Stepper ── */

const STEP_LABELS = ['01 CAFÉ', '02 CONFIGURA', '03 ENTREGA']

function Stepper({ current, canReach, onGo }: {
  current: number
  canReach: boolean[]
  onGo: (step: 1 | 2 | 3) => void
}) {
  return (
    <ol
      aria-label="Pasos"
      style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}
    >
      {STEP_LABELS.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3
        const isCurrent = n === current
        const reachable = canReach[i]
        // A step is "done" only if it's before the current step and its data is complete
        const done = n < current && canReach[i]
        return (
          <li key={n} aria-current={isCurrent ? 'step' : undefined} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span
              aria-hidden="true"
              style={{ display: 'block', height: 4, borderRadius: 4, background: isCurrent ? '#EC6E25' : done ? '#0A0A0A' : '#D9D2C8' }}
            />
            <button
              type="button"
              onClick={() => { if (reachable && n !== current) onGo(n) }}
              disabled={!reachable}
              className={reachable && n !== current ? 'step-link' : undefined}
              style={{
                textAlign: 'left', border: 0, background: 'transparent', padding: 0,
                minHeight: 28, fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                letterSpacing: '0.06em',
                cursor: reachable && n !== current ? 'pointer' : 'default',
                color: isCurrent || done ? '#0A0A0A' : '#8C8279',
              }}
            >
              {label}{done ? ' ✓ editar' : ''}
            </button>
          </li>
        )
      })}
    </ol>
  )
}

/* ── Sidebar ── */

function Sidebar({ state }: { state: FlowState }) {
  const lineInfo = state.line ? LINE_INFO[state.line] : null
  const plan = state.planId ? getPlanById(state.planId) : null
  const grindObj = state.grind ? GRIND_OPTIONS.find(g => g.id === state.grind) : null

  const freqLabel = state.freqDays === 15 ? 'Cada 15 días' : state.freqDays === 30 ? 'Cada mes' : null
  const monthly = plan && state.freqDays ? getMonthlyPrice(plan.id, state.freqDays) ?? 0 : 0
  const perShipment = plan && state.freqDays ? getPerShipmentPrice(plan.id, state.freqDays) ?? 0 : 0

  const rows: Array<{ k: string; v: string | null }> = [
    { k: 'CAFÉ', v: lineInfo ? (state.line === 'diario' ? 'Caturra Lavado Tradicional' : 'Rota en cada entrega') : null },
    { k: 'CANTIDAD', v: plan?.name ?? null },
    { k: 'MOLIENDA', v: grindObj?.label ?? null },
    { k: 'FRECUENCIA', v: freqLabel },
  ]

  return (
    <aside
      className="only-d"
      aria-label="Tu plan"
      aria-live="polite"
      style={{
        position: 'sticky', top: 20,
        display: 'flex', flexDirection: 'column', gap: 14,
        background: '#0A0A0A', color: '#F9F4ED',
        borderRadius: 18, padding: '0 28px 24px', overflow: 'hidden',
      }}
    >
      {/* Header band */}
      <span style={{
        display: 'flex', justifyContent: 'space-between', margin: '0 -28px', padding: '10px 28px',
        background: '#EC6E25', color: '#0A0A0A', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
      }}>
        <span>SALENTINO® C/LAB</span>
        <span>MDE — COL</span>
      </span>

      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em' }}>
        TU PLAN · {lineInfo ? lineInfo.name.toUpperCase() : 'SIN ELEGIR'} / {plan ? plan.name.toUpperCase() : '—'}
      </span>

      <span className="pop" style={{ fontSize: 36, lineHeight: 1, fontWeight: 700, textTransform: 'uppercase' }}>
        {plan ? plan.name : (lineInfo ? lineInfo.name : 'Tu café')}
      </span>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, lineHeight: 1.5 }}>
        {rows.map(r => (
          <span key={r.k} style={{ opacity: r.v ? 1 : 0.5 }}>
            {r.k}: {r.v ?? 'por elegir'}
          </span>
        ))}
      </div>

      {/* Ticket divider */}
      <span aria-hidden="true" style={{
        position: 'relative', display: 'block', borderTop: '1.5px dashed #F9F4ED',
        opacity: 0.7, margin: '4px -28px',
      }}>
        <span style={{ position: 'absolute', left: -10, top: -10, width: 20, height: 20, borderRadius: '50%', background: '#F9F4ED' }} />
        <span style={{ position: 'absolute', right: -10, top: -10, width: 20, height: 20, borderRadius: '50%', background: '#F9F4ED' }} />
      </span>

      <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
        <span>Por entrega</span>
        <span>{perShipment ? formatPrice(perShipment) : '—'}</span>
      </span>
      <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
        <span>Domicilio</span>
        <span>Incluido</span>
      </span>
      <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
        <span style={{ fontSize: 18, fontWeight: 700 }}>Total al mes</span>
        <span className="pop" style={{ fontSize: 26, fontWeight: 700, color: '#EC6E25' }}>
          {monthly ? formatPrice(monthly) : '—'}
        </span>
      </span>

      <span style={{ fontSize: 12, lineHeight: 1.5, opacity: 0.85 }}>
        {state.line === 'especial'
          ? 'Cada entrega llega con su nota de cata. 10% en pedidos adicionales con tu código.'
          : '10% en pedidos adicionales con tu código.'}
      </span>

      {/* Bottom divider */}
      <span aria-hidden="true" style={{
        position: 'relative', display: 'block', borderTop: '1.5px dashed #F9F4ED',
        opacity: 0.7, margin: '4px -28px',
      }}>
        <span style={{ position: 'absolute', left: -10, top: -10, width: 20, height: 20, borderRadius: '50%', background: '#F9F4ED' }} />
        <span style={{ position: 'absolute', right: -10, top: -10, width: 20, height: 20, borderRadius: '50%', background: '#F9F4ED' }} />
      </span>

      <span aria-hidden="true" style={{
        display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700,
        letterSpacing: '0.1em', color: '#EC6E25',
      }}>
        <span>SEARCH</span><span>TEST</span><span>ROAST</span><span>REFINE</span>
      </span>
    </aside>
  )
}

/* ── Mobile Bottom Bar ── */

function MobileBar({ state, show, onBack }: { state: FlowState; show: boolean; onBack: () => void }) {
  if (!show) return null

  const plan = state.planId ? getPlanById(state.planId) : null
  const monthly = plan && state.freqDays ? getMonthlyPrice(plan.id, state.freqDays) ?? 0 : 0

  const backLabel =
    state.step === 2 ? '← Café'
    : state.step === 3 ? '← Configura'
    : null

  return (
    <div
      className="only-m"
      style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 5,
        flexDirection: 'column', gap: 6,
        background: '#0A0A0A', color: '#FFFFFF',
        borderRadius: '18px 18px 0 0', padding: '14px 18px 20px',
      }}
    >
      <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        {backLabel ? (
          <button
            type="button"
            onClick={onBack}
            style={{
              border: '1px solid rgba(255,255,255,.3)', background: 'transparent',
              color: '#FFFFFF', fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
              letterSpacing: '0.04em', borderRadius: 20, padding: '5px 12px',
              cursor: 'pointer',
            }}
          >
            {backLabel}
          </button>
        ) : (
          <span style={{ fontSize: 12, fontWeight: 700 }}>
            {plan ? plan.name : 'Tu café'}
          </span>
        )}
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 11, opacity: 0.7 }}>Total/mes</span>
          <span className="pop" style={{ fontSize: 20, fontWeight: 700, color: '#EC6E25' }}>
            {monthly ? formatPrice(monthly) : '—'}
          </span>
        </span>
      </span>
    </div>
  )
}

/* ── App ── */

function scrollTop() {
  setTimeout(() => {
    try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch { /* noop */ }
  }, 30)
}

function App() {
  const [state, dispatch] = useReducer(reducer, initial)
  const [typing, setTyping] = useState(false)

  const plan = state.planId ? getPlanById(state.planId) : null
  const grindObj = state.grind ? GRIND_OPTIONS.find(g => g.id === state.grind) : null
  const canReach = [
    true,
    !!state.line,
    !!(state.line && plan && state.freqDays && grindObj),
  ]

  const goStep = useCallback((step: 1 | 2 | 3) => {
    dispatch({ type: 'GO_STEP', step })
    scrollTop()
  }, [])

  const handleSelectLine = useCallback((line: 'diario' | 'especial') => {
    dispatch({ type: 'SELECT_LINE', line })
    scrollTop()
  }, [])

  const handleUpdatePlan = useCallback((planId: string, freqId: string, freqDays: number) => {
    dispatch({ type: 'UPDATE_PLAN', planId, freqId, freqDays })
  }, [])

  const handleGrindChange = useCallback((grindId: string) => {
    dispatch({ type: 'SET_GRIND', grindId })
  }, [])

  const freqLabel = state.freqDays === 15 ? 'Cada 15 días' : 'Cada mes'

  return (
    <div style={{ minHeight: '100%', background: 'var(--bg)', color: 'var(--ink)', fontFamily: 'var(--font)' }}>
      <div style={{
        maxWidth: 1240, margin: '0 auto', padding: '24px 24px 140px',
        boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 26,
      }}>
        {/* Stepper — sticky so user can always navigate */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: 'var(--bg)', margin: '0 -24px', padding: '16px 24px 12px',
          borderBottom: '1px solid var(--line)',
        }}>
          <Stepper current={state.step} canReach={canReach} onGo={goStep} />
        </div>

        {/* Main content */}
        <div className="cols">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>
            {/* Always mount all steps, hide inactive with display:none to preserve state */}
            <div style={{ display: state.step === 1 ? 'contents' : 'none' }}>
              <StepCafe
                selectedLine={state.line}
                onSelectLine={handleSelectLine}
                onContinue={() => goStep(2)}
              />
            </div>

            {state.line && (
              <div style={{ display: state.step === 2 ? 'contents' : 'none' }}>
                <StepConfigura
                  key={state.line}
                  line={state.line}
                  selectedPlanId={state.planId}
                  selectedFreqId={state.freqId}
                  selectedGrind={state.grind}
                  onUpdate={handleUpdatePlan}
                  onGrindChange={handleGrindChange}
                  onBack={() => goStep(1)}
                  onContinue={() => goStep(3)}
                />
              </div>
            )}

            {state.planId && state.freqDays && state.grind && state.line && (
              <div style={{ display: state.step === 3 ? 'contents' : 'none' }}>
                <StepEntrega
                  planId={state.planId}
                  freqDays={state.freqDays}
                  freqLabel={freqLabel}
                  grindId={state.grind}
                  line={state.line}
                  appsScriptUrl={APPS_SCRIPT_URL}
                  onBack={() => goStep(2)}
                  onTypingChange={setTyping}
                />
              </div>
            )}
          </div>

          {/* Desktop sidebar */}
          <Sidebar state={state} />
        </div>
      </div>

      {/* Mobile bottom bar */}
      <MobileBar
        state={state}
        show={!typing}
        onBack={() => { if (state.step > 1) goStep((state.step - 1) as 1 | 2 | 3) }}
      />
    </div>
  )
}

export default App
