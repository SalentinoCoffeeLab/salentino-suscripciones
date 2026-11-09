import { LINE_INFO } from '../data/plans'

interface StepCafeProps {
  selectedLine: 'diario' | 'especial' | null
  onSelectLine: (line: 'diario' | 'especial') => void
}

// Especial primero: 8/10 marcas líderes posicionan "Roaster's Choice" como opción principal
const LINES = ['especial', 'diario'] as const

const DESCRIPTIONS: Record<string, string> = {
  diario: 'Nuestro Caturra Lavado Tradicional de Salento, Quindío. El mismo café en cada entrega.',
  especial: 'Micro-lotes y varietales que el tostador cura para ti. Cada entrega es un café diferente.',
}

export function StepCafe({ selectedLine, onSelectLine }: StepCafeProps) {
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>Elige tu café</h1>
        <p style={{ margin: 0, maxWidth: 520, fontSize: 14, lineHeight: 1.5, color: 'var(--text)' }}>
          Dos líneas, recién tostadas, con domicilio incluido. Sin permanencia.
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label="Tipo de café"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 16 }}
      >
        {LINES.map((key) => {
          const info = LINE_INFO[key]
          const isActive = selectedLine === key

          return (
            <button
              key={key}
              type="button"
              role="radio"
              className="line-card"
              onClick={() => onSelectLine(key)}
              aria-checked={isActive}
              style={{
                display: 'flex', flexDirection: 'column', gap: 16,
                padding: '28px 24px', borderRadius: 16,
                border: isActive ? '2px solid var(--ink)' : '1.5px solid var(--line)',
                background: isActive ? '#EC6E25' : 'var(--card)',
                color: 'var(--ink)', textAlign: 'left', cursor: 'pointer',
              }}
            >
              <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>
                  {info.name}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', opacity: 0.6 }}>
                  {info.kicker}
                </span>
              </span>

              <span style={{ fontSize: 14, lineHeight: 1.5, opacity: 0.8 }}>
                {DESCRIPTIONS[key]}
              </span>

              <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{info.from}</span>
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
                  padding: '6px 16px', borderRadius: 40, whiteSpace: 'nowrap',
                  background: isActive ? 'var(--ink)' : 'transparent',
                  color: isActive ? '#F9F4ED' : 'var(--ink)',
                  border: '1.5px solid var(--ink)',
                }}>
                  {isActive ? 'Elegido' : 'Elegir'}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}
