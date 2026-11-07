import { useState, useEffect, type FormEvent } from 'react'
import type { CoffeePlan } from '../data/plans'
import { getFrequencies, getMpPlanKey } from '../data/plans'
import { submitSubscription } from '../lib/submit'

interface SubscriptionDialogProps {
  plan: CoffeePlan
  onClose: () => void
  appsScriptUrl: string
}

const COFFEES = ['Caturra Lavado', 'Blend Regional']
const GRINDS = ['Grano', 'V60', 'Aeropress', 'Espresso', 'Prensa Francesa']
const FREQUENCY_LABELS: Record<number, string> = {
  7: 'Semanal',
  14: 'Quincenal',
  30: 'Mensual',
}

const MOBILE_BREAKPOINT = 640

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false
  )
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return isMobile
}

export function SubscriptionDialog({ plan, onClose, appsScriptUrl }: SubscriptionDialogProps) {
  const isLabSeries = plan.id.startsWith('lab-')
  const frequencies = getFrequencies(plan.id)
  const isMobile = useIsMobile()

  const [coffee, setCoffee] = useState(isLabSeries ? 'Selección del tostador' : COFFEES[0])
  const [grind, setGrind] = useState('Grano')
  const [frequency, setFrequency] = useState(frequencies[0])
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('Medellín')
  const [deliveryNotes, setDeliveryNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Lock body scroll on mobile
  useEffect(() => {
    if (isMobile) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [isMobile])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (fullName.length < 3) { setError('Nombre debe tener al menos 3 caracteres'); return }
    if (!email.includes('@')) { setError('Email inválido'); return }
    if (phone.length < 7) { setError('Teléfono debe tener al menos 7 dígitos'); return }
    if (address.length < 5) { setError('Dirección debe tener al menos 5 caracteres'); return }

    setSubmitting(true)

    const mpPlanKey = getMpPlanKey(plan.id, frequency)
    if (!mpPlanKey) {
      setError('Combinación de plan/frecuencia inválida')
      setSubmitting(false)
      return
    }

    const numericPrice = parseInt(plan.price.replace(/[^0-9]/g, ''), 10)

    try {
      const result = await submitSubscription(
        {
          email,
          fullName,
          phone,
          address,
          city,
          deliveryNotes,
          subscriptionType: isLabSeries ? 'Lab Series' : 'Suministro',
          plan: plan.name.replace('Suministro ', '').replace('Lab Series ', ''),
          coffee,
          grind,
          frequency,
          price: numericPrice,
          mpPlanId: plan.id,
        },
        appsScriptUrl
      )

      window.location.href = result.checkoutUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar')
      setSubmitting(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: isMobile ? '0.65rem' : '0.5rem',
    border: '1px solid #ccc',
    borderRadius: 4,
    fontFamily: "'Space Mono', monospace",
    fontSize: isMobile ? '1rem' : '0.8rem',
    boxSizing: 'border-box',
    WebkitAppearance: 'none',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: isMobile ? '0.7rem' : '0.7rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: '#555',
    display: 'block',
    marginBottom: '0.25rem',
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: isMobile ? '#fff' : 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: isMobile ? 'stretch' : 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: isMobile ? 0 : '1rem',
      }}
      onClick={(e) => { if (!isMobile && e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label={`Suscripción ${plan.name}`}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: isMobile ? 0 : 12,
          maxWidth: isMobile ? '100%' : 520,
          width: '100%',
          height: isMobile ? '100%' : 'auto',
          maxHeight: isMobile ? '100%' : '90vh',
          overflow: 'auto',
          padding: isMobile ? '1rem 1.25rem 2rem' : '2rem',
          fontFamily: "'Space Mono', monospace",
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: isMobile ? '1.1rem' : '1.2rem' }}>{plan.name}</h2>
            <p style={{ margin: '0.25rem 0', color: '#666', fontSize: isMobile ? '0.75rem' : '0.8rem' }}>
              {plan.description}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#999',
              padding: '0.25rem 0 0.25rem 0.5rem',
              flexShrink: 0,
            }}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        {/* Details chips */}
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', margin: '0.75rem 0' }}>
          {plan.details.map((d) => (
            <span
              key={d}
              style={{
                background: '#f0ede8',
                padding: '0.2rem 0.6rem',
                borderRadius: 20,
                fontSize: '0.65rem',
              }}
            >
              {d}
            </span>
          ))}
        </div>

        <p style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 1rem' }}>
          {plan.price}
        </p>

        <form onSubmit={handleSubmit} style={{ flex: 1 }}>
          {/* Plan configuration */}
          <h3 style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#888', borderBottom: '1px solid #eee', paddingBottom: '0.5rem', marginTop: 0 }}>
            Configura tu plan
          </h3>

          {!isLabSeries && (
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={labelStyle}>Café</label>
              <select style={inputStyle} value={coffee} onChange={(e) => setCoffee(e.target.value)}>
                {COFFEES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>Molienda</label>
            <select style={inputStyle} value={grind} onChange={(e) => setGrind(e.target.value)}>
              {GRINDS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>Frecuencia</label>
            <select style={inputStyle} value={frequency} onChange={(e) => setFrequency(Number(e.target.value))}>
              {frequencies.map((f) => <option key={f} value={f}>{FREQUENCY_LABELS[f]}</option>)}
            </select>
          </div>

          {/* Shipping data */}
          <h3 style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#888', borderBottom: '1px solid #eee', paddingBottom: '0.5rem', marginTop: 0 }}>
            Datos de envío
          </h3>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>Nombre</label>
            <input style={inputStyle} type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={3} placeholder="Tu nombre completo" autoComplete="name" />
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="tu@email.com" autoComplete="email" />
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>Teléfono</label>
            <input style={inputStyle} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required minLength={7} placeholder="+573001234567" autoComplete="tel" />
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>Dirección</label>
            <input style={inputStyle} type="text" value={address} onChange={(e) => setAddress(e.target.value)} required minLength={5} placeholder="Calle 10 #40-20, Apto 601" autoComplete="street-address" />
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>Ciudad</label>
            <input style={inputStyle} type="text" value={city} onChange={(e) => setCity(e.target.value)} required autoComplete="address-level2" />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>Notas de entrega</label>
            <textarea style={{ ...inputStyle, minHeight: 50, resize: 'vertical' }} value={deliveryNotes} onChange={(e) => setDeliveryNotes(e.target.value)} placeholder="Portería, dejar con vigilante..." />
          </div>

          {error && (
            <p style={{ color: '#d32f2f', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              padding: isMobile ? '0.85rem' : '0.75rem',
              background: submitting ? '#999' : '#1a1a1a',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontFamily: "'Space Mono', monospace",
              fontSize: isMobile ? '0.9rem' : '0.85rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              cursor: submitting ? 'wait' : 'pointer',
              marginBottom: isMobile ? 'env(safe-area-inset-bottom, 0)' : 0,
            }}
          >
            {submitting ? 'Procesando...' : 'Activar suscripción'}
          </button>
        </form>
      </div>
    </div>
  )
}
