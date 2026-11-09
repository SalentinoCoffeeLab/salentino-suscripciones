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
    <nav aria-label="Pasos" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {STEPS.map(({ n, label }, i) => {
        const isCurrent = n === current
        const done = n < current && canReach[i]
        const reachable = canReach[i] && n !== current

        return (
          <span key={n} style={{ display: 'flex', alignItems: 'center' }}>
            {i > 0 && (
              <span aria-hidden="true" style={{
                display: 'inline-block', width: 22, height: 1.5,
                background: 'rgba(10,10,10,.18)', margin: '0 2px',
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
                padding: '8px 14px', borderRadius: 40,
                fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700,
                letterSpacing: '0.06em', textTransform: 'uppercase' as const,
                cursor: reachable ? 'pointer' : 'default',
                color: isCurrent ? 'var(--accent)' : done ? 'var(--ink)' : 'rgba(10,10,10,.4)',
                textDecoration: done && reachable ? 'underline' : 'none',
                textDecorationColor: 'var(--accent)',
                textDecorationThickness: '2px',
                textUnderlineOffset: '4px',
              }}
            >
              {done ? `${String(n).padStart(2, '0')} ` : isCurrent ? `${String(n).padStart(2, '0')} ` : `${String(n).padStart(2, '0')} `}
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
        position: 'sticky', top: 20,
        display: 'flex', flexDirection: 'column', gap: 0,
        background: 'var(--bg)', color: 'var(--ink)',
        borderRadius: 20, overflow: 'hidden',
      }}
    >
      {/* Header band */}
      <span style={{
        display: 'flex', justifyContent: 'space-between', padding: '11px 22px',
        background: '#EC6E25', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
        textTransform: 'uppercase',
      }}>
        <span>Tu suscripción</span>
        <span>Medellín</span>
      </span>

      <div style={{ padding: '20px 22px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Plan name */}
        <div>
          <span className="pop" style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.1 }}>
            {lineInfo ? lineInfo.name : 'Tu café'}
          </span>
          {lineInfo && (
            <span style={{ display: 'block', fontSize: 12, marginTop: 3, color: 'var(--text)' }}>
              {state.line === 'diario' ? 'Caturra Lavado Tradicional' : 'Selección del tostador'}
            </span>
          )}
        </div>

        {/* Config rows */}
        <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '7px 14px', margin: 0, fontSize: 13 }}>
          {plan && <><dt style={{ color: 'var(--text)' }}>Cantidad</dt><dd style={{ margin: 0, textAlign: 'right', fontWeight: 700 }}>{plan.name} · ~{plan.cupsPerShipment} tazas</dd></>}
          {grindObj && <><dt style={{ color: 'var(--text)' }}>Molienda</dt><dd style={{ margin: 0, textAlign: 'right', fontWeight: 700 }}>{grindObj.label}</dd></>}
          {freqLabel && <><dt style={{ color: 'var(--text)' }}>Frecuencia</dt><dd style={{ margin: 0, textAlign: 'right', fontWeight: 700 }}>{freqLabel}{state.freqDays === 15 ? ' · 2 entregas' : ''}</dd></>}
        </dl>

        {/* Ticket perforation */}
        <span aria-hidden="true" style={{
          position: 'relative', display: 'block',
          borderTop: '1.5px dashed rgba(10,10,10,.2)',
          margin: '6px -22px',
        }}>
          <span style={{ position: 'absolute', left: -10, top: -10, width: 20, height: 20, borderRadius: '50%', background: 'var(--sand)' }} />
          <span style={{ position: 'absolute', right: -10, top: -10, width: 20, height: 20, borderRadius: '50%', background: 'var(--sand)' }} />
        </span>

        {/* Price breakdown */}
        <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '7px 14px', margin: 0, fontSize: 13 }}>
          <dt style={{ color: 'var(--text)' }}>Por entrega</dt>
          <dd style={{ margin: 0, textAlign: 'right', fontWeight: 700 }}>{perShipment ? formatPrice(perShipment) : '—'}</dd>
          <dt style={{ color: 'var(--text)' }}>Domicilio</dt>
          <dd style={{ margin: 0, textAlign: 'right', fontWeight: 700 }}>Incluido</dd>
          {retailPrice > 0 && (
            <><dt style={{ color: 'var(--text)' }}>Suelto con envío</dt>
            <dd style={{ margin: 0, textAlign: 'right', fontWeight: 400, textDecoration: 'line-through', color: 'var(--text)' }}>{formatPrice(retailPrice)}</dd></>
          )}
        </dl>

        {/* Savings */}
        {retailPrice > 0 && perShipment > 0 && (
          <span style={{ fontSize: 13 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: 'var(--accent)', marginRight: 4 }}>AHORRO</span>
            {formatPrice(retailPrice - perShipment)} por entrega
          </span>
        )}

        {/* Total */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontWeight: 700, fontSize: 16 }}>
          <span>Total al mes</span>
          <span className="pop" style={{ fontSize: 38, color: 'var(--accent)', letterSpacing: '-0.03em' }}>
            {monthly ? formatPrice(monthly) : '—'}
          </span>
        </div>

        {/* Fine print */}
        {monthly > 0 && (
          <span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text)' }}>
            {state.freqDays === 15
              ? 'Se debita una vez al mes con Mercado Pago y cubre tus 2 entregas.'
              : 'Se debita una vez al mes con Mercado Pago.'}
          </span>
        )}
      </div>
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
      <div style={{
        maxWidth: 1240, margin: '0 auto', padding: '24px 24px 140px',
        boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 26,
      }}>
        {/* Stepper — sticky nav */}
        <div style={{
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
