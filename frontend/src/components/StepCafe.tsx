import { LINE_INFO, getPlansForLine, getPerShipmentPrice, formatPrice } from '../data/plans'

interface StepCafeProps {
  selectedLine: 'diario' | 'especial' | null
  onSelectLine: (line: 'diario' | 'especial') => void
}

// Especial primero: 8/10 marcas líderes posicionan "Roaster's Choice" como opción principal
const LINES = ['especial', 'diario'] as const

const DESCRIPTIONS: Record<string, string> = {
  diario: 'El mismo Caturra Lavado Tradicional en cada entrega. Consistente, sin sorpresas.',
  especial: 'Micro-lotes que elige el tostador. Cada entrega es un café distinto, con su nota de cata.',
}

const FAQ = [
  { q: '¿Cómo pauso o cancelo?', a: 'Escríbenos por WhatsApp y la pausamos o cancelamos. También puedes cancelarla desde tu cuenta de Mercado Pago. Sin penalidad.' },
  { q: '¿Puedo cambiar la molienda o la cantidad?', a: 'Sí. Escríbenos antes de tu próxima entrega y la ajustamos.' },
  { q: '¿Cómo se cobra el plan cada 15 días?', a: 'Mercado Pago cobra una vez al mes el valor de tus 2 entregas.' },
  { q: '¿Cuándo llega la primera entrega?', a: 'Despachamos en 1–2 días hábiles. En Medellín y el Área Metropolitana llega en 24–48 h.' },
  { q: '¿Llegan a otras ciudades?', a: 'Por ahora el domicilio incluido es para Medellín y el Área Metropolitana. Si estás en otra ciudad, escríbenos.' },
]

export function StepCafe({ selectedLine, onSelectLine }: StepCafeProps) {
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>
          Elige tu <span style={{ color: 'var(--accent)' }}>café</span>
        </h1>
        <p style={{ margin: 0, maxWidth: 520, fontSize: 14, lineHeight: 1.5, color: 'var(--text)' }}>
          Dos líneas. Las dos llegan recién tostadas y con domicilio incluido.
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
                padding: '28px 24px', borderRadius: 20,
                border: isActive ? '2px solid var(--ink)' : '1.5px solid var(--line)',
                background: isActive ? '#EC6E25' : 'var(--card)',
                color: 'var(--ink)', textAlign: 'left', cursor: 'pointer',
              }}
            >
              <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.6 }}>
                  {info.kicker}
                </span>
                <span style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>
                  {info.name}
                </span>
              </span>

              <span style={{ fontSize: 14, lineHeight: 1.55, opacity: 0.8 }}>
                {DESCRIPTIONS[key]}
              </span>

              {/* Meta data — origin, notes, sizes */}
              <dl style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '4px 10px', margin: 0, fontSize: 13 }}>
                {info.meta.map((m) => {
                  const [label, value] = m.split(': ')
                  return (
                    <span key={m} style={{ display: 'contents' }}>
                      <dt style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.5, paddingTop: 2 }}>{label}</dt>
                      <dd style={{ margin: 0 }}>{value}</dd>
                    </span>
                  )
                })}
              </dl>

              {/* Price row + button */}
              {(() => {
                // Compute cheapest plan for this line and its best saving
                const plans = getPlansForLine(key)
                const cheapest = plans[0] // plans are sorted by priceFrom
                const cheapestPerShipment = cheapest ? (getPerShipmentPrice(cheapest.id, 30) ?? cheapest.priceFrom) : 0
                const saving = cheapest ? cheapest.retailWithShipping - cheapestPerShipment : 0

                return (
                  <span style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
                    marginTop: 'auto', paddingTop: 16,
                    borderTop: '1.5px dashed rgba(10,10,10,.2)',
                  }}>
                    <span>
                      <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                        <span style={{ fontSize: 13, color: 'var(--text)' }}>Desde</span>
                        <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em' }}>
                          {formatPrice(cheapest?.priceFrom ?? 0)}
                        </span>
                        <span style={{ fontSize: 13, color: 'var(--text)' }}>/mes</span>
                      </span>
                      {saving > 0 ? (
                        <span style={{ fontSize: 13, marginTop: 2, display: 'block' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: 'var(--accent)', marginRight: 4 }}>AHORRO</span>
                          {formatPrice(saving)} por entrega vs. suelto con envío
                        </span>
                      ) : key === 'especial' ? (
                        <span style={{ fontSize: 13, marginTop: 2, display: 'block', color: 'var(--text)' }}>
                          Nota de cata en cada entrega
                        </span>
                      ) : null}
                    </span>
                    <span style={{
                      fontSize: 14, fontWeight: 700,
                      padding: '10px 22px', borderRadius: 40, whiteSpace: 'nowrap',
                      background: isActive ? 'var(--ink)' : 'var(--accent)',
                      color: isActive ? '#F9F4ED' : 'var(--ink)',
                    }}>
                      {isActive ? 'Elegido' : 'Elegir'}
                    </span>
                  </span>
                )
              })()}
            </button>
          )
        })}
      </div>

      {/* Fine print */}
      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--text)' }}>
        * Ahorro comparado con la misma bolsa en la tienda + envío estándar de $15.000 en Medellín (pedidos menores a $150.000).
      </p>

      {/* FAQ */}
      <div style={{ marginTop: 20 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--accent)' }}>
          Antes de suscribirte
        </span>
        <h2 style={{ margin: '6px 0 14px', fontSize: 28, fontWeight: 700 }}>
          Preguntas <span style={{ color: 'var(--accent)' }}>directas</span>
        </h2>
        <div className="faq-section">
          {FAQ.map((item) => (
            <details key={item.q} className="faq-details">
              <summary className="faq-summary">
                {item.q}
                <span className="faq-icon">+</span>
              </summary>
              <p className="faq-answer">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </>
  )
}
