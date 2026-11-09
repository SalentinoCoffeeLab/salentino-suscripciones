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
  'https://script.google.com/macros/s/AKfycbzWjrBEz-tU7xfNiwB9FP8-nC-2jjI6hVzIBmAQ4hMMP7bURAveYKs4N9WAsWfd_8FM/exec'

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
        step: 2 as const,
        // Reset config only when switching lines
        ...(changing ? { planId: null, freqId: null, freqDays: null, grind: null } : {}),
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

const STEPS = [
  { n: 1 as const, label: 'Café' },
  { n: 2 as const, label: 'Configura' },
  { n: 3 as const, label: 'Entrega' },
]

function Stepper({ current, canReach, onGo }: {
  current: number
  canReach: boolean[]
  onGo: (step: 1 | 2 | 3) => void
}) {
  return (
    <nav aria-label="Pasos" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {STEPS.map(({ n, label }, i) => {
        const isCurrent = n === current
        const done = n < current && canReach[i]
        const reachable = canReach[i] && n !== current

        return (
          <span key={n} style={{ display: 'flex', alignItems: 'center' }}>
            {i > 0 && (
              <span aria-hidden="true" style={{
                display: 'inline-block', width: 20, height: 1,
                background: done ? 'var(--ink)' : 'rgba(10,10,10,.12)', margin: '0 2px',
                transition: 'background .2s',
              }} />
            )}
            <button
              type="button"
              onClick={() => { if (reachable) onGo(n) }}
              disabled={!reachable && !isCurrent}
              className={isCurrent ? 'glass-pill' : undefined}
              style={{
                border: isCurrent ? undefined : 0,
                background: isCurrent ? undefined : 'transparent',
                padding: isCurrent ? '8px 16px' : '8px 12px', borderRadius: 40,
                fontFamily: 'inherit', fontSize: 11, fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                cursor: reachable ? 'pointer' : 'default',
                color: isCurrent ? 'var(--ink)' : done ? 'var(--ink)' : 'rgba(10,10,10,.3)',
                transition: 'color .15s, padding .15s',
              }}
            >
              {label}
            </button>
          </span>
        )
      })}
    </nav>
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

  const retailPrice = plan?.retailWithShipping ?? 0

  return (
    <aside
      className="only-d"
      aria-label="Tu plan"
      aria-live="polite"
      style={{
        position: 'sticky', top: 32,
        display: 'flex', flexDirection: 'column',
        background: 'var(--card)', color: 'var(--ink)',
        borderRadius: 16, overflow: 'hidden',
        border: '1px solid var(--line)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '20px 22px 16px',
        borderBottom: '1px solid var(--line)',
      }}>
        <span style={{
          display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'var(--text)', marginBottom: 8,
        }}>
          Tu suscripción
        </span>
        <span className="pop" style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
          {lineInfo ? lineInfo.name : 'Elige tu café'}
        </span>
        {lineInfo && (
          <span style={{ display: 'block', fontSize: 12, marginTop: 4, color: 'var(--text)', lineHeight: 1.4 }}>
            {state.line === 'diario' ? 'Caturra Lavado Tradicional' : 'Selección del tostador'}
          </span>
        )}
      </div>

      {/* Config details */}
      <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 14px', margin: 0, fontSize: 12 }}>
          {plan && <><dt style={{ color: 'var(--text)' }}>Cantidad</dt><dd style={{ margin: 0, textAlign: 'right', fontWeight: 700 }}>{plan.name}</dd></>}
          {grindObj && <><dt style={{ color: 'var(--text)' }}>Molienda</dt><dd style={{ margin: 0, textAlign: 'right', fontWeight: 700 }}>{grindObj.label}</dd></>}
          {freqLabel && <><dt style={{ color: 'var(--text)' }}>Frecuencia</dt><dd style={{ margin: 0, textAlign: 'right', fontWeight: 700 }}>{freqLabel}</dd></>}
        </dl>
      </div>

      {/* Divider */}
      <span aria-hidden="true" style={{
        display: 'block', height: 1,
        background: 'var(--line)', margin: '0 22px',
      }} />

      {/* Price breakdown */}
      <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 14px', margin: 0, fontSize: 12 }}>
          <dt style={{ color: 'var(--text)' }}>Por entrega</dt>
          <dd style={{ margin: 0, textAlign: 'right', fontWeight: 700 }}>{perShipment ? formatPrice(perShipment) : '—'}</dd>
          <dt style={{ color: 'var(--text)' }}>Domicilio</dt>
          <dd style={{ margin: 0, textAlign: 'right', fontWeight: 700, color: 'var(--ok)' }}>Incluido</dd>
          {retailPrice > 0 && (
            <><dt style={{ color: 'var(--text)' }}>Precio suelto</dt>
            <dd style={{ margin: 0, textAlign: 'right', fontWeight: 400, textDecoration: 'line-through', color: 'var(--text)' }}>{formatPrice(retailPrice)}</dd></>
          )}
        </dl>

        {/* Savings pill */}
        {retailPrice > 0 && perShipment > 0 && (
          <span style={{
            display: 'inline-flex', alignSelf: 'flex-start',
            padding: '4px 10px', borderRadius: 6,
            background: 'rgba(31,122,63,.08)', color: 'var(--ok)',
            fontSize: 11, fontWeight: 700, letterSpacing: '.04em',
          }}>
            Ahorras {formatPrice(retailPrice - perShipment)}/entrega
          </span>
        )}
      </div>

      {/* Total */}
      <div style={{
        padding: '16px 22px 20px',
        background: 'var(--ink)', color: 'var(--bg)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>Total/mes</span>
        <span className="pop" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em' }}>
          {monthly ? formatPrice(monthly) : '—'}
        </span>
      </div>

      {/* Fine print */}
      {monthly > 0 && (
        <span style={{ padding: '12px 22px 14px', fontSize: 11, lineHeight: 1.5, color: 'var(--text)', borderTop: '1px solid var(--line)' }}>
          {state.freqDays === 15
            ? 'Débito mensual vía Mercado Pago. Cubre 2 entregas.'
            : 'Débito mensual vía Mercado Pago.'}
        </span>
      )}
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
      className="only-m bar-glass"
      style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 5,
        flexDirection: 'column', gap: 6,
        borderRadius: '18px 18px 0 0', padding: '14px 18px 20px',
      }}
    >
      <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        {backLabel ? (
          <button
            type="button"
            onClick={onBack}
            style={{
              border: '1px solid var(--line)', background: 'transparent',
              color: 'var(--ink)', fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
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
          <span style={{ fontSize: 11, color: 'var(--text)' }}>Total/mes</span>
          <span className="pop" style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>
            {monthly ? formatPrice(monthly) : '—'}
          </span>
        </span>
      </span>
    </div>
  )
}

/* ── App ── */

function scrollTop() {
  try { window.scrollTo({ top: 0, behavior: 'instant' }) } catch { /* noop */ }
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
      <div className="app-container" style={{
        maxWidth: 1120, margin: '0 auto', padding: '24px 24px 140px',
        boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 28,
      }}>
        {/* Stepper — sticky nav */}
        <div className="stepper-nav" style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: 'rgba(249,244,237,.86)', backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          margin: '0 -24px', padding: '12px 24px',
        }}>
          <Stepper current={state.step} canReach={canReach} onGo={goStep} />
        </div>

        {/* Main content */}
        <div className="cols">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>
            <div key={`s1-${state.step}`} className={state.step === 1 ? 'step-enter' : undefined} style={{ display: state.step === 1 ? 'contents' : 'none' }}>
              <StepCafe
                selectedLine={state.line}
                onSelectLine={handleSelectLine}
              />
            </div>

            {state.line && (
              <div key={`s2-${state.step}`} className={state.step === 2 ? 'step-enter' : undefined} style={{ display: state.step === 2 ? 'contents' : 'none' }}>
                <StepConfigura
                  key={state.line}
                  line={state.line}
                  selectedPlanId={state.planId}
                  selectedFreqId={state.freqId}
                  selectedGrind={state.grind}
                  onUpdate={handleUpdatePlan}
                  onGrindChange={handleGrindChange}
                  onContinue={() => goStep(3)}
                />
              </div>
            )}

            {state.planId && state.freqDays && state.grind && state.line && (
              <div key={`s3-${state.step}`} className={state.step === 3 ? 'step-enter' : undefined} style={{ display: state.step === 3 ? 'contents' : 'none' }}>
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
