import { useState, useRef, useEffect, useCallback } from 'react'
import type { CoffeePlan } from '../data/plans'

interface CoffeeConveyorProps {
  plans: CoffeePlan[]
  onSelectPlan: (plan: CoffeePlan) => void
  autoplay?: boolean
  speed?: number
}

const TIER_COLORS: Record<number, string> = {
  1: '#4a7c59',
  2: '#c4a35a',
  3: '#6b8e9b',
  4: '#8b5e3c',
  5: '#2d2d2d',
}

const MOBILE_BREAKPOINT = 640

function useWindowWidth() {
  const [width, setWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  )
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return width
}

// ─── Desktop: oval conveyor belt ───

function DesktopConveyor({
  plans,
  onSelectPlan,
  autoplay,
  speed,
  containerWidth,
}: CoffeeConveyorProps & { containerWidth: number }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const animRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)

  // Scale all dimensions to container
  const scale = Math.min(containerWidth / 800, 1)
  const trackW = 800 * scale
  const trackH = 400 * scale
  const plateSize = 100 * scale

  const animate = useCallback(
    (time: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = time
      const delta = time - lastTimeRef.current
      lastTimeRef.current = time
      setOffset((prev) => (prev + ((speed ?? 22) * delta) / 1000) % (Math.PI * 2))
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
    const rx = trackW * 0.38
    const ry = trackH * 0.28
    const x = trackW / 2 + rx * Math.cos(angle)
    const y = trackH / 2 + ry * Math.sin(angle)
    const s = 0.7 + 0.3 * ((Math.sin(angle) + 1) / 2)
    const zIndex = Math.round(s * 100)
    return { x, y, scale: s, zIndex }
  }

  return (
    <div
      style={{
        position: 'relative',
        width: trackW,
        height: trackH,
        margin: '0 auto',
      }}
      role="list"
      aria-label="Planes de suscripción"
    >
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        viewBox={`0 0 ${trackW} ${trackH}`}
        aria-hidden="true"
      >
        <ellipse
          cx={trackW / 2}
          cy={trackH / 2}
          rx={trackW * 0.38}
          ry={trackH * 0.28}
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
              left: pos.x - plateSize / 2,
              top: pos.y - plateSize / 2,
              width: plateSize,
              height: plateSize,
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
                fontSize: `${0.55 * scale}rem`,
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
                fontSize: `${0.5 * scale}rem`,
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
  )
}

// ─── Mobile: horizontal scrollable cards ───

function MobileCarousel({
  plans,
  onSelectPlan,
}: Pick<CoffeeConveyorProps, 'plans' | 'onSelectPlan'>) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const cardWidth = el.scrollWidth / plans.length
    const index = Math.round(el.scrollLeft / cardWidth)
    setActiveIndex(Math.min(index, plans.length - 1))
  }

  return (
    <div>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          display: 'flex',
          gap: '1rem',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          padding: '1rem 1.5rem',
          margin: '0 -1rem',
        }}
        role="list"
        aria-label="Planes de suscripción"
      >
        {plans.map((plan) => (
          <button
            key={plan.id}
            role="listitem"
            onClick={() => onSelectPlan(plan)}
            style={{
              flex: '0 0 260px',
              scrollSnapAlign: 'center',
              background: '#fff',
              border: `3px solid ${TIER_COLORS[plan.tier]}`,
              borderRadius: 16,
              padding: '1.25rem',
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: "'Space Mono', monospace",
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
            aria-label={`${plan.name} - ${plan.price}`}
          >
            {/* Tier dot + category */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: TIER_COLORS[plan.tier],
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#999' }}>
                {plan.id.startsWith('lab-') ? 'Lab Series' : 'Suministro'}
              </span>
            </div>

            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1a1a1a' }}>
              {plan.name.replace('Suministro ', '').replace('Lab Series ', '')}
            </h3>

            <p style={{ margin: 0, fontSize: '0.75rem', color: '#666', lineHeight: 1.4 }}>
              {plan.description}
            </p>

            {/* Detail chips */}
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {plan.details.map((d) => (
                <span
                  key={d}
                  style={{
                    background: '#f0ede8',
                    padding: '0.15rem 0.5rem',
                    borderRadius: 12,
                    fontSize: '0.6rem',
                    color: '#555',
                  }}
                >
                  {d}
                </span>
              ))}
            </div>

            <p style={{ margin: '0.25rem 0 0', fontSize: '1rem', fontWeight: 700, color: TIER_COLORS[plan.tier] }}>
              {plan.price}
            </p>
          </button>
        ))}
      </div>

      {/* Dots indicator */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', marginTop: '0.75rem' }}>
        {plans.map((_, i) => (
          <span
            key={i}
            style={{
              width: i === activeIndex ? 18 : 6,
              height: 6,
              borderRadius: 3,
              background: i === activeIndex ? '#1a1a1a' : '#ccc',
              transition: 'all 0.2s ease',
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Main component ───

export function CoffeeConveyor({
  plans,
  onSelectPlan,
  autoplay = true,
  speed = 22,
}: CoffeeConveyorProps) {
  const windowWidth = useWindowWidth()
  const isMobile = windowWidth < MOBILE_BREAKPOINT
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const hoveredPlan = hoveredId ? plans.find((p) => p.id === hoveredId) : null

  return (
    <div
      style={{
        fontFamily: "'Space Mono', monospace",
        textAlign: 'center',
        padding: isMobile ? '1.5rem 1rem' : '2rem',
        background: '#faf8f5',
        minHeight: '100vh',
      }}
    >
      <p
        style={{
          fontSize: '0.7rem',
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
          fontSize: isMobile ? '1.15rem' : '1.5rem',
          fontWeight: 700,
          color: '#1a1a1a',
          marginBottom: '0.5rem',
          lineHeight: 1.3,
        }}
      >
        Tu café favorito, siempre fresco, siempre a tiempo.
      </h1>
      <p style={{ fontSize: isMobile ? '0.75rem' : '0.85rem', color: '#666', marginBottom: isMobile ? '1rem' : '2rem' }}>
        {!isMobile && hoveredPlan
          ? `${hoveredPlan.name} · ${hoveredPlan.price}`
          : isMobile
            ? 'Desliza para explorar los planes.'
            : 'Desliza la banda, elige tu plan, activa tu suscripción.'}
      </p>

      {isMobile ? (
        <MobileCarousel plans={plans} onSelectPlan={onSelectPlan} />
      ) : (
        <div
          onMouseLeave={() => setHoveredId(null)}
        >
          <DesktopConveyor
            plans={plans}
            onSelectPlan={onSelectPlan}
            autoplay={autoplay}
            speed={speed}
            containerWidth={Math.min(windowWidth - 64, 800)}
          />
        </div>
      )}

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: isMobile ? '1rem' : '1.5rem',
          marginTop: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        {[
          { label: 'Suministro', tiers: [1, 2, 4] },
          { label: 'Lab Series', tiers: [3, 4, 5] },
        ].map((group) => (
          <div key={group.label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.65rem', color: '#888' }}>{group.label}:</span>
            {group.tiers.map((t) => (
              <span
                key={t}
                style={{
                  width: 10,
                  height: 10,
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
