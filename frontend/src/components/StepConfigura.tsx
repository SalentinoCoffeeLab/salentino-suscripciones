import { useState } from 'react'
import {
  GRIND_OPTIONS,
  getPlansForLine,
  getFrequencyOptions,
  getMonthlyPrice,
  formatPrice,
  type CoffeePlan,
  type FrequencyOption,
  type GrindOption,
} from '../data/plans'
import { GrindIcon } from './GrindIcon'

interface StepConfiguraProps {
  line: 'diario' | 'especial'
  selectedPlanId: string | null
  selectedFreqId: string | null
  selectedGrind: string | null
  onUpdate: (planId: string, freqId: string, freqDays: number) => void
  onGrindChange: (grindId: string) => void
  onContinue: () => void
}

function optStyle(active: boolean): React.CSSProperties {
  return {
    background: active ? 'var(--ink)' : 'var(--card)',
    color: active ? '#F9F4ED' : 'var(--ink)',
    border: active ? '2px solid var(--ink)' : '1.5px solid var(--line)',
  }
}

export function StepConfigura({
  line,
  selectedPlanId,
  selectedFreqId,
  selectedGrind,
  onUpdate,
  onGrindChange,
  onContinue,
}: StepConfiguraProps) {
  const [tried, setTried] = useState(false)

  const plans = getPlansForLine(line)
  const freqs = getFrequencyOptions(line)
  const selectedPlan = plans.find(p => p.id === selectedPlanId)
  const selectedFreq = freqs.find(f => f.id === selectedFreqId)
  const grindObj = GRIND_OPTIONS.find(g => g.id === selectedGrind)

  const monthly = selectedPlan && selectedFreq
    ? getMonthlyPrice(selectedPlan.id, selectedFreq.days) ?? 0
    : 0

  const handleQtyPick = (plan: CoffeePlan) => {
    const freq = selectedFreq ?? freqs[freqs.length - 1]
    const validFreq = plan.frequencies.includes(freq.days) ? freq : freqs.find(f => plan.frequencies.includes(f.days))
    if (validFreq) onUpdate(plan.id, validFreq.id, validFreq.days)
  }

  const handleFreqPick = (freq: FrequencyOption) => {
    const plan = selectedPlan ?? plans[0]
    const validPlan = plan.frequencies.includes(freq.days) ? plan : plans.find(p => p.frequencies.includes(freq.days))
    if (validPlan) onUpdate(validPlan.id, freq.id, freq.days)
  }

  const handleContinue = () => {
    if (selectedPlan && selectedFreq && grindObj) {
      onContinue()
    } else {
      setTried(true)
    }
  }

  const allReady = !!(selectedPlan && selectedFreq && grindObj)

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>
          Configura tu <span style={{ color: 'var(--accent)' }}>plan</span>
        </h1>
        <p style={{ margin: 0, maxWidth: 520, fontSize: 16, lineHeight: 1.5, color: 'var(--text)' }}>
          {line === 'especial'
            ? 'El tostador elige el café. Tú decides cuánto, cada cuánto y cómo lo molemos.'
            : 'Siempre nuestro Caturra Lavado Tradicional. Tú decides cuánto, cada cuánto y cómo lo molemos.'}
        </p>
      </div>

      {/* Quantity */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span className="sec-label">Cantidad por entrega</span>
        <div
          role="radiogroup"
          aria-label="Cantidad"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}
        >
          {plans.map((plan) => {
            const isActive = selectedPlanId === plan.id
            const price = getMonthlyPrice(plan.id, 30) ?? plan.priceFrom
            return (
              <button
                key={plan.id}
                type="button"
                role="radio"
                className="opt"
                onClick={() => handleQtyPick(plan)}
                aria-checked={isActive}
                style={optStyle(isActive)}
              >
                <span style={{ fontSize: 15, fontWeight: 700 }}>{plan.name}</span>
                <span style={{ fontSize: 12, opacity: 0.7, fontWeight: 400 }}>
                  {formatPrice(price)}/entrega
                </span>
              </button>
            )
          })}
        </div>
        {tried && !selectedPlan && (
          <span role="alert" style={{ fontSize: 12, color: 'var(--error)' }}>Elige una cantidad.</span>
        )}
      </div>

      {/* Frequency */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span className="sec-label">Frecuencia de entrega</span>
        <div
          role="radiogroup"
          aria-label="Frecuencia"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}
        >
          {freqs.map((freq) => {
            const isActive = selectedFreqId === freq.id
            const hasPlan = selectedPlan ? selectedPlan.frequencies.includes(freq.days) : true
            return (
              <button
                key={freq.id}
                type="button"
                role="radio"
                className="opt"
                onClick={() => handleFreqPick(freq)}
                aria-checked={isActive}
                disabled={!hasPlan}
                style={{
                  ...optStyle(isActive),
                  opacity: hasPlan ? 1 : 0.35,
                  cursor: hasPlan ? 'pointer' : 'not-allowed',
                }}
              >
                <span style={{ fontSize: 15, fontWeight: 700 }}>{freq.label}</span>
                <span style={{ fontSize: 12, opacity: 0.7, fontWeight: 400 }}>
                  {freq.deliveriesPerMonth} entrega{freq.deliveriesPerMonth > 1 ? 's' : ''} al mes
                </span>
              </button>
            )
          })}
        </div>
        {tried && !selectedFreq && (
          <span role="alert" style={{ fontSize: 12, color: 'var(--error)' }}>Elige la frecuencia.</span>
        )}
      </div>

      {/* Grind */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span className="sec-label">Molienda</span>
        <span style={{ fontSize: 13, color: 'var(--text)', marginTop: -4 }}>
          La molemos justo para tu método. Si tienes molino en casa, elige grano entero.
        </span>
        <div
          role="radiogroup"
          aria-label="Molienda"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}
        >
          {GRIND_OPTIONS.map((g: GrindOption) => {
            const isActive = selectedGrind === g.id
            return (
              <button
                key={g.id}
                type="button"
                role="radio"
                className="opt"
                onClick={() => onGrindChange(g.id)}
                aria-checked={isActive}
                style={optStyle(isActive)}
              >
                <span className="ic" aria-hidden="true" style={{ opacity: isActive ? 1 : 0.5 }}>
                  <GrindIcon id={g.id} />
                </span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{g.label}</span>
                <span style={{ fontSize: 11, opacity: 0.6, fontWeight: 400 }}>{g.sub}</span>
              </button>
            )
          })}
        </div>
        {tried && !grindObj && (
          <span role="alert" style={{ fontSize: 12, color: 'var(--error)' }}>Elige tu molienda.</span>
        )}
      </div>

      {/* Price summary */}
      {monthly > 0 && (
        <div
          className="step-enter"
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '14px 18px', borderRadius: 12,
            background: 'var(--ink)', color: '#F9F4ED',
          }}
        >
          <span style={{ fontSize: 14 }}>
            {selectedPlan!.name}, {selectedFreq!.label.toLowerCase()}
          </span>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#EC6E25' }}>
            {formatPrice(monthly)}/mes
          </span>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 14 }}>
        <button
          type="button"
          className="btn"
          onClick={handleContinue}
          disabled={!allReady}
          style={{ padding: '0 30px' }}
        >
          Continuar a entrega
        </button>
      </div>
    </>
  )
}
