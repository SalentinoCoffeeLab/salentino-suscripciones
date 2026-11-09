import { LINE_INFO, getPlansForLine } from '../data/plans'

interface StepCafeProps {
  selectedLine: 'diario' | 'especial' | null
  onSelectLine: (line: 'diario' | 'especial') => void
  onContinue: () => void
}

const LINES = ['diario', 'especial'] as const

export function StepCafe({ selectedLine, onSelectLine, onContinue }: StepCafeProps) {
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h1 className="ttl">
          <span style={{ color: '#EC6E25' }}>01</span> Elige tu café
        </h1>
        <p style={{ margin: 0, maxWidth: 620, fontSize: 18, lineHeight: 1.5, color: 'var(--text)' }}>
          Dos formas de suscribirte. Las dos llegan recién tostadas y con domicilio incluido.
        </p>
      </div>

      <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em' }}>CAFÉ</span>

      <div
        role="radiogroup"
        aria-label="Tipo de café"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 18 }}
      >
        {LINES.map((key) => {
          const info = LINE_INFO[key]
          const isActive = selectedLine === key
          const plans = getPlansForLine(key)
          const minPerShipment = Math.min(...plans.map(p => p.priceFrom))
          void minPerShipment

          return (
            <button
              key={key}
              type="button"
              role="radio"
              className="lab-card"
              onClick={() => onSelectLine(key)}
              aria-checked={isActive}
              style={{
                display: 'flex', flexDirection: 'column', gap: 12,
                padding: 22, borderRadius: 18,
                border: '1px solid #0A0A0A',
                color: '#0A0A0A',
                background: isActive ? '#EC6E25' : '#F1E7D8',
              }}
            >
              <span style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.05, textTransform: 'uppercase' }}>
                {info.name}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em' }}>
                {info.kicker}
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, lineHeight: 1.5 }}>
                {info.meta.map((m) => (
                  <span key={m}>{m}</span>
                ))}
              </span>

              {/* Ticket divider */}
              <span
                aria-hidden="true"
                style={{
                  position: 'relative', display: 'block',
                  borderTop: '2px dashed currentColor',
                  margin: '4px -22px', opacity: 0.9,
                }}
              >
                <span style={{
                  position: 'absolute', left: -11, top: -10,
                  width: 18, height: 18, borderRadius: '50%',
                  background: '#F9F4ED', border: '1px solid #0A0A0A',
                  clipPath: 'inset(0 0 0 50%)',
                }} />
                <span style={{
                  position: 'absolute', right: -11, top: -10,
                  width: 18, height: 18, borderRadius: '50%',
                  background: '#F9F4ED', border: '1px solid #0A0A0A',
                  clipPath: 'inset(0 50% 0 0)',
                }} />
              </span>

              <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20, fontWeight: 700 }}>{info.from}</span>
                <span style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontSize: 13, fontWeight: 700, letterSpacing: '0.06em',
                  background: isActive ? '#0A0A0A' : 'transparent',
                  color: isActive ? '#F9F4ED' : '#0A0A0A',
                  border: '1.5px solid #0A0A0A',
                  borderRadius: 40, padding: '8px 16px',
                }}>
                  <span className="ic">
                    <span style={{
                      display: 'inline-block', width: 14, height: 14, borderRadius: '50%',
                      border: `2px solid ${isActive ? '#EC6E25' : '#0A0A0A'}`,
                      background: isActive ? '#EC6E25' : 'transparent',
                    }} />
                  </span>
                  {isActive ? 'SELECCIONADO' : 'ELEGIR'}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <p style={{ margin: 0, fontSize: 13, color: 'var(--text)' }}>
        ¿No sabes cuál? Empieza con Café de diario: es nuestro café de todos los días.
      </p>

      {selectedLine && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn pop"
            onClick={onContinue}
            style={{ gap: 10, padding: '0 30px' }}
          >
            Continuar a configurar
            <span className="ic" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
          </button>
        </div>
      )}
    </>
  )
}
