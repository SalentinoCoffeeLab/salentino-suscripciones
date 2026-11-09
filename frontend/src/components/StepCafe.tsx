import { LINE_INFO, getPlansForLine } from '../data/plans'

interface StepCafeProps {
  selectedLine: 'diario' | 'especial' | null
  onSelectLine: (line: 'diario' | 'especial') => void
  onContinue: () => void
}

const LINES = ['diario', 'especial'] as const

/* ── SVG Coffee Bag Icons ── */

function BagSingle({ color }: { color: string }) {
  return (
    <svg width="72" height="72" viewBox="0 0 80 80" fill="none" aria-hidden="true">
      {/* Bag body */}
      <path
        d="M22 28h36v38a6 6 0 0 1-6 6H28a6 6 0 0 1-6-6V28z"
        fill={color}
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Fold top */}
      <path
        d="M20 22h40a2 2 0 0 1 2 2v4H18v-4a2 2 0 0 1 2-2z"
        fill={color}
        stroke="currentColor"
        strokeWidth="2"
        opacity=".85"
      />
      {/* Label circle */}
      <circle cx="40" cy="48" r="12" fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".6" />
      {/* S logo */}
      <text
        x="40" y="53"
        textAnchor="middle"
        fontFamily="Georgia,'Times New Roman',serif"
        fontSize="16"
        fontWeight="bold"
        fontStyle="italic"
        fill="currentColor"
        opacity=".7"
      >S</text>
      {/* Steam lines */}
      <path d="M34 16c0-4 3-4 3-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".35" />
      <path d="M40 14c0-4 3-4 3-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".35" />
      <path d="M46 16c0-4 3-4 3-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".35" />
    </svg>
  )
}

function BagDouble({ color }: { color: string }) {
  return (
    <svg width="72" height="72" viewBox="0 0 96 80" fill="none" aria-hidden="true">
      {/* Back bag */}
      <g opacity=".55">
        <path
          d="M34 30h36v36a6 6 0 0 1-6 6H40a6 6 0 0 1-6-6V30z"
          fill={color}
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M32 24h40a2 2 0 0 1 2 2v4H30v-4a2 2 0 0 1 2-2z"
          fill={color}
          stroke="currentColor"
          strokeWidth="2"
        />
      </g>
      {/* Front bag */}
      <path
        d="M16 32h36v36a6 6 0 0 1-6 6H22a6 6 0 0 1-6-6V32z"
        fill={color}
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M14 26h40a2 2 0 0 1 2 2v4H12v-4a2 2 0 0 1 2-2z"
        fill={color}
        stroke="currentColor"
        strokeWidth="2"
        opacity=".85"
      />
      {/* Label */}
      <circle cx="34" cy="50" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".6" />
      <text
        x="34" y="55"
        textAnchor="middle"
        fontFamily="Georgia,'Times New Roman',serif"
        fontSize="14"
        fontWeight="bold"
        fontStyle="italic"
        fill="currentColor"
        opacity=".7"
      >S</text>
      {/* Star — curated */}
      <path
        d="M70 10l2.5 5 5.5.8-4 3.9.9 5.5L70 22.7l-4.9 2.5.9-5.5-4-3.9 5.5-.8z"
        fill="currentColor"
        opacity=".3"
      />
    </svg>
  )
}

/* ── Meta row helper ── */
function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ display: 'flex', gap: 6, fontSize: 13, lineHeight: 1.5 }}>
      <span style={{ fontWeight: 700, minWidth: 60, flexShrink: 0 }}>{label}</span>
      <span>{value}</span>
    </span>
  )
}

const META_LABELS: Record<string, string[]> = {
  diario: ['Café', 'Origen', 'Notas', 'Perfil'],
  especial: ['Café', 'Origen', 'Notas', 'Perfil'],
}

const META_VALUES: Record<string, string[]> = {
  diario: [
    'Caturra Lavado Tradicional',
    'Salento, Quindío',
    'Chocolate amargo, caramelo, panela',
    'El mismo en cada entrega',
  ],
  especial: [
    'Micro-lotes y varietales',
    'Rota entre los lotes disponibles',
    'Cada bolsa llega con su nota de cata',
    'Cambia en cada entrega',
  ],
}

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
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 20 }}
      >
        {LINES.map((key) => {
          const info = LINE_INFO[key]
          const isActive = selectedLine === key
          const plans = getPlansForLine(key)
          const minPerShipment = Math.min(...plans.map(p => p.priceFrom))
          void minPerShipment

          const bagColor = isActive ? '#D45A1A' : '#C9B99A'
          const labels = META_LABELS[key]
          const values = META_VALUES[key]

          return (
            <button
              key={key}
              type="button"
              role="radio"
              className="lab-card"
              onClick={() => onSelectLine(key)}
              aria-checked={isActive}
              style={{
                display: 'flex', flexDirection: 'column', gap: 14,
                padding: 24, borderRadius: 20,
                border: isActive ? '2px solid #0A0A0A' : '1.5px solid #0A0A0A',
                color: '#0A0A0A',
                background: isActive ? '#EC6E25' : '#F1E7D8',
              }}
            >
              {/* Header: icon + title */}
              <span style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{
                  flexShrink: 0,
                  filter: isActive ? 'drop-shadow(2px 4px 6px rgba(0,0,0,.2))' : 'drop-shadow(1px 2px 4px rgba(0,0,0,.1))',
                }}>
                  {key === 'diario' ? <BagSingle color={bagColor} /> : <BagDouble color={bagColor} />}
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{
                    fontSize: 28, fontWeight: 700, lineHeight: 1.05,
                    textTransform: 'uppercase',
                    textShadow: isActive ? '1px 2px 0 rgba(0,0,0,.08)' : 'none',
                  }}>
                    {info.name}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', opacity: 0.75 }}>
                    {info.kicker}
                  </span>
                </span>
              </span>

              {/* Meta details — structured rows */}
              <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {labels.map((label, i) => (
                  <MetaRow key={label} label={label} value={values[i]} />
                ))}
              </span>

              {/* Ticket divider */}
              <span
                aria-hidden="true"
                style={{
                  position: 'relative', display: 'block',
                  borderTop: '2px dashed currentColor',
                  margin: '2px -24px', opacity: 0.9,
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

              {/* Price + CTA */}
              <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: isActive ? '#0A0A0A' : '#EC6E25' }}>{info.from}</span>
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
