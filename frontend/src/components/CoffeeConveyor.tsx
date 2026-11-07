import { useState, useRef, useEffect, useCallback } from 'react'
import type { CoffeePlan } from '../data/plans'

interface CoffeeConveyorProps {
  plans: CoffeePlan[]
  onSelectPlan: (plan: CoffeePlan) => void
  autoplay?: boolean
  speed?: number
}

const TIER_COLORS: Record<number, string> = {
  1: '#4a7c59',   // verde bosque
  2: '#c4a35a',   // dorado
  3: '#6b8e9b',   // azul gris
  4: '#8b5e3c',   // café oscuro
  5: '#2d2d2d',   // negro
}

const TRACK_WIDTH = 800
const TRACK_HEIGHT = 400
const PLATE_SIZE = 100

export function CoffeeConveyor({
  plans,
  onSelectPlan,
  autoplay = true,
  speed = 22,
}: CoffeeConveyorProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const animRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const animate = useCallback(
    (time: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = time
      const delta = time - lastTimeRef.current
      lastTimeRef.current = time
      setOffset((prev) => (prev + (speed * delta) / 1000) % (Math.PI * 2))
      animRef.current = requestAnimationFrame(animate)
    },
    [speed]
  )

  useEffect(() => {
    if (autoplay && !hoveredId) {
      lastTimeRef.current = 0
      animRef.current = requestAnimationFrame(animate)
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [autoplay, hoveredId, animate])

  const getPosition = (index: number, total: number) => {
    const angle = (index / total) * Math.PI * 2 + offset
    const rx = TRACK_WIDTH * 0.38
    const ry = TRACK_HEIGHT * 0.28
    const x = TRACK_WIDTH / 2 + rx * Math.cos(angle)
    const y = TRACK_HEIGHT / 2 + ry * Math.sin(angle)
    const scale = 0.7 + 0.3 * ((Math.sin(angle) + 1) / 2)
    const zIndex = Math.round(scale * 100)
    return { x, y, scale, zIndex }
  }

  return (
    <div
      style={{
        fontFamily: "'Space Mono', monospace",
        textAlign: 'center',
        padding: '2rem',
        background: '#faf8f5',
        minHeight: '100vh',
      }}
    >
      <p
        style={{
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          color: '#888',
          marginBottom: '0.5rem',
        }}
      >
        Suscripciones · Café en rotación
      </p>
      <h1
        style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: '#1a1a1a',
          marginBottom: '0.5rem',
        }}
      >
        Tu café favorito, siempre fresco, siempre a tiempo.
      </h1>
      <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '2rem' }}>
        {hoveredId
          ? (() => {
              const plan = plans.find((p) => p.id === hoveredId)
              return plan
                ? `${plan.name} · ${plan.price}`
                : 'Desliza la banda, elige tu plan, activa tu suscripción.'
            })()
          : 'Desliza la banda, elige tu plan, activa tu suscripción.'}
      </p>

      {/* Conveyor track */}
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: TRACK_WIDTH,
          height: TRACK_HEIGHT,
          margin: '0 auto',
          maxWidth: '100%',
        }}
        role="list"
        aria-label="Planes de suscripción"
      >
        {/* Track ellipse */}
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          viewBox={`0 0 ${TRACK_WIDTH} ${TRACK_HEIGHT}`}
          aria-hidden="true"
        >
          <ellipse
            cx={TRACK_WIDTH / 2}
            cy={TRACK_HEIGHT / 2}
            rx={TRACK_WIDTH * 0.38}
            ry={TRACK_HEIGHT * 0.28}
            fill="none"
            stroke="#ddd"
            strokeWidth={2}
            strokeDasharray="8 4"
          />
        </svg>

        {plans.map((plan, i) => {
          const pos = getPosition(i, plans.length)
          const isHovered = hoveredId === plan.id
          return (
            <button
              key={plan.id}
              role="listitem"
              style={{
                position: 'absolute',
                left: pos.x - PLATE_SIZE / 2,
                top: pos.y - PLATE_SIZE / 2,
                width: PLATE_SIZE,
                height: PLATE_SIZE,
                borderRadius: '50%',
                border: `4px solid ${TIER_COLORS[plan.tier]}`,
                background: '#fff',
                cursor: 'pointer',
                transform: `scale(${isHovered ? pos.scale * 1.15 : pos.scale})`,
                transition: 'transform 0.2s ease',
                zIndex: pos.zIndex + (isHovered ? 100 : 0),
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.5rem',
                boxShadow: isHovered
                  ? '0 8px 24px rgba(0,0,0,0.15)'
                  : '0 2px 8px rgba(0,0,0,0.08)',
              }}
              onMouseEnter={() => setHoveredId(plan.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onSelectPlan(plan)}
              aria-label={`${plan.name} - ${plan.price}`}
            >
              <span
                style={{
                  fontSize: '0.55rem',
                  fontWeight: 700,
                  textAlign: 'center',
                  lineHeight: 1.2,
                  color: '#1a1a1a',
                }}
              >
                {plan.name.replace('Suministro ', '').replace('Lab Series ', '')}
              </span>
              <span
                style={{
                  fontSize: '0.5rem',
                  color: TIER_COLORS[plan.tier],
                  marginTop: 2,
                }}
              >
                {plan.price.replace('/envío', '')}
              </span>
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '1.5rem',
          marginTop: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        {[
          { label: 'Suministro', tiers: [1, 2, 4] },
          { label: 'Lab Series', tiers: [3, 4, 5] },
        ].map((group) => (
          <div key={group.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#888' }}>{group.label}:</span>
            {group.tiers.map((t) => (
              <span
                key={t}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: TIER_COLORS[t],
                  display: 'inline-block',
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
