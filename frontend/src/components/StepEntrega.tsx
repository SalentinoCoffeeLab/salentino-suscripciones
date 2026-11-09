import { useState, useCallback } from 'react'
import { formatPrice, getMonthlyPrice, getCheckoutUrl, getMpPlanKey, getPlanById, LINE_INFO, GRIND_OPTIONS } from '../data/plans'
import { submitSubscription } from '../lib/submit'

interface StepEntregaProps {
  planId: string
  freqDays: number
  freqLabel: string
  grindId: string
  line: 'diario' | 'especial'
  appsScriptUrl: string
  onBack: () => void
  onTypingChange: (typing: boolean) => void
}

const TYPOS: Record<string, string> = {
  'gmial.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmail.co': 'hotmail.com',
  'outlok.com': 'outlook.com',
}

function digits(s: string): string {
  return s.replace(/\D/g, '')
}

const CheckIcon = () => (
  <span
    className="pop"
    aria-hidden="true"
    style={{
      position: 'absolute', right: 14, top: '50%', marginTop: -10,
      width: 20, height: 20, borderRadius: '50%', background: 'var(--ok)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
  >
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3">
      <path d="M5 12l5 5 9-10" />
    </svg>
  </span>
)

export function StepEntrega({
  planId,
  freqDays,
  freqLabel,
  grindId,
  line,
  appsScriptUrl,
  onBack,
  onTypingChange,
}: StepEntregaProps) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)

  const plan = getPlanById(planId)
  const monthly = getMonthlyPrice(planId, freqDays) ?? 0
  const grindLabel = GRIND_OPTIONS.find(g => g.id === grindId)?.label ?? grindId

  const valid = {
    email: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email),
    name: name.trim().length >= 3,
    phone: digits(phone).length >= 7,
    address: address.trim().length >= 5,
    city: city.trim().length >= 3,
  }

  const allValid = Object.values(valid).every(Boolean)

  const msgs: Record<string, string> = {
    email: 'Revisa tu email: nombre@correo.com',
    name: 'Escribe tu nombre completo.',
    phone: 'Al menos 7 dígitos.',
    address: 'Escribe calle y número, por ejemplo Calle 10 #40-20.',
    city: 'Escribe tu ciudad o municipio.',
  }

  const dom = (email.split('@')[1] || '').toLowerCase()
  const fix = TYPOS[dom]

  const blur = useCallback((field: string) => {
    setTouched(t => ({ ...t, [field]: true }))
    onTypingChange(false)
  }, [onTypingChange])

  const startTyping = useCallback(() => {
    onTypingChange(true)
  }, [onTypingChange])

  const handlePay = async () => {
    if (!allValid) {
      const t: Record<string, boolean> = {}
      Object.keys(valid).forEach(k => { t[k] = true })
      setTouched(t)
      return
    }

    if (!plan) return
    const mpPlanKey = getMpPlanKey(planId, freqDays)
    if (!mpPlanKey) return

    setLoading(true)

    try {
      const lineInfo = LINE_INFO[line]
      const result = await submitSubscription(
        {
          email,
          fullName: name,
          phone,
          address,
          city,
          deliveryNotes: '',
          subscriptionType: line === 'especial' ? 'Ediciones Especiales' : 'Café de Diario',
          plan: plan.name,
          coffee: lineInfo.coffee,
          grind: grindLabel,
          frequency: freqDays,
          price: monthly,
          mpPlanId: planId,
        },
        appsScriptUrl
      )

      window.location.href = result.checkoutUrl
    } catch {
      setLoading(false)
      const checkoutUrl = getCheckoutUrl(planId, freqDays)
      if (checkoutUrl) window.location.href = checkoutUrl
    }
  }

  const ctaText = loading
    ? 'Abriendo Mercado Pago…'
    : allValid
      ? `Agregar tarjeta y pagar ${formatPrice(monthly)}`
      : 'Completa tus datos'

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h1 className="ttl">
          <span style={{ color: '#EC6E25' }}>03</span> Entrega
        </h1>
        <p style={{ margin: 0, maxWidth: 620, fontSize: 18, lineHeight: 1.5, color: 'var(--text)' }}>
          Dónde llega cada entrega. Usamos tu celular solo para avisarte cuando sale tu pedido.
        </p>
      </div>

      {/* Contact */}
      <fieldset className="fs">
        <legend><b>A</b>CONTACTO</legend>

        <div>
          <label className="lbl" htmlFor="x-email">EMAIL <span style={{ color: 'var(--accent)' }}>*</span></label>
          <div style={{ position: 'relative' }}>
            <input
              id="x-email" className="inp" type="email" autoComplete="email"
              placeholder="tu@email.com" value={email}
              onChange={e => { setEmail(e.target.value); startTyping() }}
              onBlur={() => blur('email')}
              aria-invalid={touched.email && !valid.email}
              aria-describedby="e-email"
            />
            {valid.email && <CheckIcon />}
          </div>
          <span id="e-email" style={{ display: 'block', minHeight: 14, marginTop: 3, paddingLeft: 16, fontSize: 11, color: 'var(--error)' }}>
            {touched.email && !valid.email ? msgs.email : ''}
          </span>
          {fix && (
            <button
              type="button"
              className="pop"
              onClick={() => setEmail(email.split('@')[0] + '@' + fix)}
              style={{ marginLeft: 16, minHeight: 36, padding: '0 12px', borderRadius: 40, border: '1px solid var(--line)', background: 'var(--card)', fontSize: 12, cursor: 'pointer' }}
            >
              ¿Quisiste decir {email.split('@')[0]}@{fix}?
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '0 10px' }}>
          <div>
            <label className="lbl" htmlFor="x-name">NOMBRE <span style={{ color: 'var(--accent)' }}>*</span></label>
            <div style={{ position: 'relative' }}>
              <input
                id="x-name" className="inp" type="text" autoComplete="name"
                placeholder="Tu nombre completo" value={name}
                onChange={e => { setName(e.target.value); startTyping() }}
                onBlur={() => blur('name')}
                aria-invalid={touched.name && !valid.name}
                aria-describedby="e-name"
              />
              {valid.name && <CheckIcon />}
            </div>
            <span id="e-name" style={{ display: 'block', minHeight: 14, marginTop: 3, paddingLeft: 16, fontSize: 11, color: 'var(--error)' }}>
              {touched.name && !valid.name ? msgs.name : ''}
            </span>
          </div>
          <div>
            <label className="lbl" htmlFor="x-phone">CELULAR <span style={{ color: 'var(--accent)' }}>*</span></label>
            <div style={{ position: 'relative' }}>
              <input
                id="x-phone" className="inp" type="tel" autoComplete="tel" inputMode="numeric"
                placeholder="300 123 4567" value={phone}
                onChange={e => { setPhone(e.target.value); startTyping() }}
                onBlur={() => blur('phone')}
                aria-invalid={touched.phone && !valid.phone}
                aria-describedby="e-phone"
              />
              {valid.phone && <CheckIcon />}
            </div>
            <span id="e-phone" style={{ display: 'block', minHeight: 14, marginTop: 3, paddingLeft: 16, fontSize: 11, color: 'var(--error)' }}>
              {touched.phone && !valid.phone ? msgs.phone : ''}
            </span>
          </div>
        </div>
      </fieldset>

      {/* Address */}
      <fieldset className="fs">
        <legend><b>B</b>DIRECCIÓN</legend>

        <div>
          <label className="lbl" htmlFor="x-address">DIRECCIÓN <span style={{ color: 'var(--accent)' }}>*</span></label>
          <div style={{ position: 'relative' }}>
            <input
              id="x-address" className="inp" type="text" autoComplete="street-address"
              placeholder="Calle 10 #40-20, Apto 601" value={address}
              onChange={e => { setAddress(e.target.value); startTyping() }}
              onBlur={() => blur('address')}
              aria-invalid={touched.address && !valid.address}
              aria-describedby="e-address"
            />
            {valid.address && <CheckIcon />}
          </div>
          <span id="e-address" style={{ display: 'block', minHeight: 14, marginTop: 3, paddingLeft: 16, fontSize: 11, color: 'var(--error)' }}>
            {touched.address && !valid.address ? msgs.address : ''}
          </span>
        </div>

        <div>
          <label className="lbl" htmlFor="x-city">CIUDAD O MUNICIPIO <span style={{ color: 'var(--accent)' }}>*</span></label>
          <div style={{ position: 'relative' }}>
            <input
              id="x-city" className="inp" type="text" autoComplete="address-level2"
              placeholder="Ej. Medellín" value={city}
              onChange={e => { setCity(e.target.value); startTyping() }}
              onBlur={() => blur('city')}
              aria-invalid={touched.city && !valid.city}
              aria-describedby="e-city"
            />
            {valid.city && <CheckIcon />}
          </div>
          <span id="e-city" style={{ display: 'block', minHeight: 14, marginTop: 3, paddingLeft: 16, fontSize: 11, color: 'var(--error)' }}>
            {touched.city && !valid.city ? msgs.city : ''}
          </span>
        </div>

        <span style={{ fontSize: 12, color: 'var(--text)' }}>
          Domicilio incluido en Medellín y el Área Metropolitana. Consulta cobertura para otras ciudades.
        </span>
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
          ← Volver
        </button>
        <button
          type="button"
          className="btn"
          onClick={handlePay}
          disabled={loading || !allValid}
          aria-busy={loading}
          style={{ gap: 10, padding: '0 30px' }}
        >
          {ctaText}
          <span className="ic" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </button>
      </div>

      <span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text)' }}>
        Te llevamos a Mercado Pago para agregar tu tarjeta. Cobro automático {freqLabel.toLowerCase()}. Pausa o cancela cuando quieras.
      </span>
      <span style={{ fontSize: 11, lineHeight: 1.5, color: 'var(--text)' }}>
        Al continuar, autorizas el tratamiento de tus datos según nuestra política de tratamiento de datos y aceptas recibir avisos de tus entregas por WhatsApp y email.
      </span>
    </>
  )
}
