import type { ReactNode } from 'react'
import { LINE_INFO, getPlansForLine, getPerShipmentPrice, formatPrice } from '../data/plans'
import { MercadoPagoLogo } from './MercadoPagoLogo'

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

const FAQ: { q: string; a: ReactNode }[] = [
  { q: '¿Cómo pauso o cancelo?', a: <>Escríbenos por WhatsApp y la pausamos o cancelamos. También puedes cancelarla desde tu cuenta de <MercadoPagoLogo height={13} />. Sin penalidad.</> },
  { q: '¿Puedo cambiar la molienda o la cantidad?', a: 'Sí. Escríbenos antes de tu próxima entrega y la ajustamos.' },
  { q: '¿Cómo se cobra el plan cada 15 días?', a: <><MercadoPagoLogo height={13} /> cobra una vez al mes el valor de tus 2 entregas.</> },
  { q: '¿Cuándo llega la primera entrega?', a: 'Despachamos en 1–2 días hábiles. En Medellín y el Área Metropolitana llega en 24–48 h.' },
  { q: '¿Llegan a otras ciudades?', a: 'Por ahora el domicilio incluido es para Medellín y el Área Metropolitana. Si estás en otra ciudad, escríbenos.' },
]

export function StepCafe({ selectedLine, onSelectLine }: StepCafeProps) {
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h1 className="h1-step" style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>
          Elige tu <span style={{ color: 'var(--accent)' }}>café</span>
        </h1>
        <p className="p-step" style={{ margin: 0, maxWidth: 520, fontSize: 14, lineHeight: 1.5, color: 'var(--text)' }}>
          Dos líneas. Las dos llegan recién tostadas y con domicilio incluido.
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label="Tipo de café"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 20 }}
      >
        {LINES.map((key) => {
          const info = LINE_INFO[key]
          const isActive = selectedLine === key

          // Compute cheapest plan for this line and its best saving
          const plans = getPlansForLine(key)
          const cheapest = plans[0]
          const cheapestPerShipment = cheapest ? (getPerShipmentPrice(cheapest.id, 30) ?? cheapest.priceFrom) : 0
          const saving = cheapest ? cheapest.retailWithShipping - cheapestPerShipment : 0

          return (
            <button
              key={key}
              type="button"
              role="radio"
              className="line-card"
              onClick={() => onSelectLine(key)}
              aria-checked={isActive}
              style={{
                display: 'flex', flexDirection: 'column',
                padding: 0, borderRadius: 24, overflow: 'hidden',
                border: isActive ? '2.5px solid var(--ink)' : '1.5px solid var(--line)',
                background: 'var(--card)',
                color: 'var(--ink)', textAlign: 'left', cursor: 'pointer',
                transition: 'border-color .2s, box-shadow .3s ease-out, transform .3s ease-out',
              }}
            >
              {/* ── Header band ── */}
              <span className="line-card-header" style={{
                display: 'flex', flexDirection: 'column', gap: 6,
                padding: '24px 28px 20px',
                background: isActive
                  ? 'linear-gradient(135deg, #EC6E25 0%, #D45A18 100%)'
                  : key === 'especial'
                    ? 'linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 100%)'
                    : 'linear-gradient(135deg, var(--bg) 0%, var(--bg2) 100%)',
                color: isActive || key === 'especial' ? '#F9F4ED' : 'var(--ink)',
              }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                  opacity: isActive ? 0.9 : 0.6,
                }}>
                  {info.kicker}
                </span>
                <span style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                  {info.name}
                </span>
              </span>

              {/* ── Body ── */}
              <span className="line-card-body" style={{
                display: 'flex', flexDirection: 'column', gap: 16,
                padding: '20px 28px 24px',
                flex: 1,
              }}>
                {/* Description */}
                <span style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)' }}>
                  {DESCRIPTIONS[key]}
                </span>

                {/* Meta data — origin, notes, sizes */}
                <dl style={{
                  display: 'grid', gridTemplateColumns: '72px 1fr',
                  gap: '6px 12px', margin: 0,
                }}>
                  {info.meta.map((m) => {
                    const [label, value] = m.split(': ')
                    return (
                      <span key={m} style={{ display: 'contents' }}>
                        <dt style={{
                          fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                          textTransform: 'uppercase', color: 'var(--accent)', paddingTop: 2,
                        }}>
                          {label}
                        </dt>
                        <dd style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--ink)' }}>
                          {value}
                        </dd>
                      </span>
                    )
                  })}
                </dl>

                {/* ── Price + CTA row ── */}
                <span style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12,
                  marginTop: 'auto', paddingTop: 18,
                  borderTop: '1px solid var(--line)',
                }}>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                      <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1 }}>
                        {formatPrice(cheapest?.priceFrom ?? 0)}
                      </span>
                      <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 400 }}>/mes</span>
                    </span>
                    {saving > 0 ? (
                      <span style={{ fontSize: 12, lineHeight: 1.4, color: 'var(--text)' }}>
                        Ahorras <span style={{ fontWeight: 700, color: 'var(--ok)' }}>{formatPrice(saving)}</span> por entrega
                      </span>
                    ) : key === 'especial' ? (
                      <span style={{ fontSize: 12, lineHeight: 1.4, color: 'var(--text)' }}>
                        Nota de cata en cada entrega
                      </span>
                    ) : null}
                  </span>

                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap',
                    padding: '12px 26px', borderRadius: 40,
                    minHeight: 48,
                    background: isActive ? 'var(--ink)' : 'var(--accent)',
                    color: isActive ? '#F9F4ED' : 'var(--ink)',
                    transition: 'background .2s, color .2s',
                  }}>
                    {isActive ? 'Elegido' : 'Elegir'}
                  </span>
                </span>
              </span>
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
