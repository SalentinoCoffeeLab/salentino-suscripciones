import { useState } from 'react'
import {
  CUPS_OPTIONS,
  GRIND_OPTIONS,
  getPlansForLine,
  getFrequencyOptions,
  getMonthlyPrice,
  recommendPlan,
  formatPrice,
  type CoffeePlan,
  type FrequencyOption,
  type GrindOption,
} from '../data/plans'
import { GrindIcon } from './GrindIcon'

function BagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 8h10v12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V8z" />
      <path d="M6 5h12a1 1 0 0 1 1 1v2H5V6a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="15" r="3" opacity=".5" />
    </svg>
  )
}

function CupIcon({ count }: { count: number }) {
  const props = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (count <= 1) {
    return (
      <svg {...props}>
        <path d="M5.5 9h10v5.5a4.5 4.5 0 0 1-4.5 4.5h-1a4.5 4.5 0 0 1-4.5-4.5z" />
        <path d="M15.5 10.5h1.5a2 2 0 0 1 0 4h-1.5" />
        <path d="M4 21h13" />
      </svg>
    )
  }
  return (
    <svg {...props} viewBox="0 0 32 24">
      <path d="M3.5 9h10v5.5a4.5 4.5 0 0 1-4.5 4.5h-1a4.5 4.5 0 0 1-4.5-4.5z" />
      <path d="M13.5 10.5h1.2a1.8 1.8 0 0 1 0 3.6h-1.2" />
      <path d="M16.5 9h10v5.5a4.5 4.5 0 0 1-4.5 4.5h-1a4.5 4.5 0 0 1-4.5-4.5z" />
      <path d="M26.5 10.5h1.2a1.8 1.8 0 0 1 0 3.6h-1.2" />
      <path d="M2 21h28" />
    </svg>
  )
}

interface StepConfiguraProps {
  line: 'diario' | 'especial'
  selectedPlanId: string | null
  selectedFreqId: string | null
  selectedGrind: string | null
  onUpdate: (planId: string, freqId: string, freqDays: number) => void
  onGrindChange: (grindId: string) => void
  onBack: () => void
  onContinue: () => void
}

function pillStyle(active: boolean): React.CSSProperties {
  return {
    background: active ? '#0A0A0A' : 'transparent',
    color: active ? '#F9F4ED' : '#0A0A0A',
    boxShadow: active ? 'inset 0 -5px 0 #EC6E25' : 'none',
  }
}

export function StepConfigura({
  line,
  selectedPlanId,
  selectedFreqId,
  selectedGrind,
  onUpdate,
  onGrindChange,
  onBack,
  onContinue,
}: StepConfiguraProps) {
  const [cups, setCups] = useState<string | null>(null)
  const [showCustom, setShowCustom] = useState(false)
  const [tried, setTried] = useState(false)

  const plans = getPlansForLine(line)
  const freqs = getFrequencyOptions(line)
  const selectedPlan = plans.find(p => p.id === selectedPlanId)
  const selectedFreq = freqs.find(f => f.id === selectedFreqId)
  const grindObj = GRIND_OPTIONS.find(g => g.id === selectedGrind)

  const monthly = selectedPlan && selectedFreq
    ? getMonthlyPrice(selectedPlan.id, selectedFreq.days) ?? 0
    : 0

  const handleCupsPick = (cupId: string) => {
    const cupsOpt = CUPS_OPTIONS.find(c => c.id === cupId)
    if (!cupsOpt) return
    setCups(cupId)
    const rec = recommendPlan(line, cupsOpt.cupsPerMonth)
    const freq = freqs.find(f => f.days === rec.frequency.days)
    if (freq) onUpdate(rec.plan.id, freq.id, freq.days)
  }

  const handleQtyPick = (plan: CoffeePlan) => {
    setCups('custom')
    const freq = selectedFreq ?? freqs[freqs.length - 1]
    const validFreq = plan.frequencies.includes(freq.days) ? freq : freqs.find(f => plan.frequencies.includes(f.days))
    if (validFreq) onUpdate(plan.id, validFreq.id, validFreq.days)
  }

  const handleFreqPick = (freq: FrequencyOption) => {
    setCups('custom')
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

  const isLab = line === 'especial'
  const hasRec = !!(selectedPlan && selectedFreq)

  const rec = cups && cups !== 'custom'
    ? recommendPlan(line, CUPS_OPTIONS.find(c => c.id === cups)!.cupsPerMonth)
    : null

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h1 className="ttl">
          <span style={{ color: '#EC6E25' }}>02</span> Configura
        </h1>
        <p style={{ margin: 0, maxWidth: 620, fontSize: 18, lineHeight: 1.5, color: 'var(--text)' }}>
          {isLab
            ? 'El tostador elige el lote de cada entrega. Tú decides cuánto, cada cuánto y cómo lo preparas.'
            : 'Siempre nuestro Caturra Lavado Tradicional. Tú decides cuánto, cada cuánto y cómo lo preparas.'}
        </p>
      </div>

      {/* Section A: cups/plan */}
      <fieldset className="fs">
        <legend><b>A</b>¿CUÁNTAS TAZAS TOMAS AL DÍA?</legend>
        <div
          role="radiogroup"
          aria-label="Tazas al día"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}
        >
          {CUPS_OPTIONS.map((c) => {
            const r = recommendPlan(line, c.cupsPerMonth)
            const isActive = cups === c.id
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                className="pill2"
                onClick={() => handleCupsPick(c.id)}
                aria-checked={isActive}
                style={pillStyle(isActive)}
              >
                <span className="ic" aria-hidden="true">
                  {c.id === 'bolsa' ? <BagIcon /> : <CupIcon count={c.id === '2' || c.id === '3' ? 2 : 1} />}
                </span>
                <span>{c.label}</span>
                <span style={{ fontSize: 10, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                  {r.plan.name}, {r.frequency.label.toLowerCase()}
                </span>
              </button>
            )
          })}
        </div>

        {hasRec && (
          <div
            className="pop"
            style={{
              display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center',
              gap: 10, borderRadius: 12, background: '#F1E7D8', border: '1px dashed #0A0A0A',
              padding: '12px 14px', fontSize: 13, lineHeight: 1.5,
            }}
          >
            <span>
              {rec ? 'Te recomendamos ' : 'Elegiste '}
              {selectedPlan!.name}, {selectedFreq!.label.toLowerCase()}.
            </span>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#EC6E25' }}>{formatPrice(monthly)}/mes</span>
          </div>
        )}

        {rec?.isShort && (
          <span style={{ fontSize: 12, color: 'var(--text)' }}>
            Es el plan más grande de Ediciones especiales. Para más café, súmale Café de diario.
          </span>
        )}

        <button
          type="button"
          className="lnk"
          onClick={() => setShowCustom(!showCustom)}
          aria-expanded={showCustom}
          style={{
            alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 4,
            minHeight: 44, fontSize: 12, fontWeight: 700, textDecoration: 'underline',
            border: 0, background: 'transparent', cursor: 'pointer', padding: 0,
          }}
        >
          {showCustom ? 'Ocultar cantidad y frecuencia' : 'Prefiero elegir cantidad y frecuencia'}
          <span className="ic" aria-hidden="true">→</span>
        </button>

        {showCustom && (
          <div className="pop" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em' }}>CANTIDAD POR ENTREGA</span>
            <div
              role="radiogroup"
              aria-label="Cantidad"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}
            >
              {plans.map((plan) => {
                const isActive = selectedPlanId === plan.id
                const perShipment = plan.line === 'diario'
                  ? formatPrice(getMonthlyPrice(plan.id, 30) ?? plan.priceFrom)
                  : formatPrice(plan.priceFrom)
                return (
                  <button
                    key={plan.id}
                    type="button"
                    role="radio"
                    className="pill2"
                    onClick={() => handleQtyPick(plan)}
                    aria-checked={isActive}
                    style={pillStyle(isActive)}
                  >
                    <span>{plan.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'none', letterSpacing: 0, color: isActive ? '#EC6E25' : 'inherit' }}>
                      {perShipment}/entrega
                    </span>
                  </button>
                )
              })}
            </div>

            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em' }}>FRECUENCIA</span>
            <div
              role="radiogroup"
              aria-label="Frecuencia"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}
            >
              {freqs.map((freq) => {
                const isActive = selectedFreqId === freq.id
                const hasPlan = selectedPlan ? selectedPlan.frequencies.includes(freq.days) : true
                return (
                  <button
                    key={freq.id}
                    type="button"
                    role="radio"
                    className="pill2"
                    onClick={() => handleFreqPick(freq)}
                    aria-checked={isActive}
                    disabled={!hasPlan}
                    style={{
                      ...pillStyle(isActive),
                      opacity: hasPlan ? 1 : 0.4,
                      cursor: hasPlan ? 'pointer' : 'not-allowed',
                    }}
                  >
                    <span>{freq.label}</span>
                    <span style={{ fontSize: 10, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                      {freq.deliveriesPerMonth} entrega{freq.deliveriesPerMonth > 1 ? 's' : ''} al mes
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {tried && !hasRec && (
          <span role="alert" style={{ fontSize: 12, color: 'var(--error)' }}>
            Elige cuántas tazas tomas al día.
          </span>
        )}
      </fieldset>

      {/* Section B: grind */}
      <fieldset className="fs">
        <legend><b>B</b>¿CÓMO LO PREPARAS?</legend>
        <span style={{ fontSize: 13, color: 'var(--text)' }}>
          Lo molemos justo para tu método. Si tienes molino en casa, elige Grano entero.
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
                className="pill2"
                onClick={() => onGrindChange(g.id)}
                aria-checked={isActive}
                style={pillStyle(isActive)}
              >
                <span className="ic" aria-hidden="true">
                  <GrindIcon id={g.id} />
                </span>
                <span>{g.label}</span>
                <span style={{ fontSize: 10, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                  {g.sub}
                </span>
              </button>
            )
          })}
        </div>
        {tried && !grindObj && (
          <span role="alert" style={{ fontSize: 12, color: 'var(--error)' }}>
            Elige cómo preparas tu café para molerlo bien.
          </span>
        )}
      </fieldset>

      {/* Navigation */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 14 }}>
        <button
          type="button"
          className="lnk"
          onClick={onBack}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            minHeight: 44, border: 0, background: 'transparent',
            fontSize: 15, fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', padding: 0,
          }}
        >
          ← Cambiar café
        </button>
        <button
          type="button"
          className="btn"
          onClick={handleContinue}
          disabled={!selectedPlan || !selectedFreq || !grindObj}
          style={{ gap: 10, padding: '0 30px' }}
        >
          {selectedPlan && selectedFreq && grindObj ? 'Continuar a entrega' : 'Elige tazas y molienda'}
          <span className="ic" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </button>
      </div>
    </>
  )
}
