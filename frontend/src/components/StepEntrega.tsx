import { useState, useCallback } from 'react'
import { formatPrice, getMonthlyPrice, getPerShipmentPrice, getCheckoutUrl, getMpPlanKey, getPlanById, LINE_INFO, GRIND_OPTIONS, CITIES } from '../data/plans'
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
  const [notes, setNotes] = useState('')
  const [wantsBilling, setWantsBilling] = useState(false)
  const [billingNit, setBillingNit] = useState('')
  const [billingName, setBillingName] = useState('')
  const [billingEmail, setBillingEmail] = useState('')
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saveFailed, setSaveFailed] = useState(false)

  const plan = getPlanById(planId)
  const monthly = getMonthlyPrice(planId, freqDays) ?? 0
  const perShipment = getPerShipmentPrice(planId, freqDays) ?? 0
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
    setError('')

    try {
      const lineInfo = LINE_INFO[line]
      const result = await submitSubscription(
        {
          email,
          fullName: name,
          phone,
          address,
          city,
          deliveryNotes: notes,
          ...(wantsBilling ? { billingNit, billingName: billingName || name, billingEmail: billingEmail || email } : {}),
          subscriptionType: line === 'especial' ? 'Ediciones Especiales' : 'Café de Diario',
          plan: plan.name,
          coffee: lineInfo.coffee,
          grind: grindLabel,
          frequency: freqDays,
          price: perShipment,
          mpPlanId: planId,
        },
        appsScriptUrl
      )

      // Solo pasamos a Mercado Pago cuando el Sheet confirmó que guardó los datos.
      if (result.success) {
        window.location.href = result.checkoutUrl
        return
      }

      setLoading(false)
      setSaveFailed(true)
      setError(
        result.reason === 'rejected' && result.message
          ? `No pudimos guardar tus datos: ${result.message}. Revísalos e intenta de nuevo.`
          : 'No pudimos guardar tus datos de entrega. Revisa tu conexión e intenta de nuevo.'
      )
    } catch {
      setLoading(false)
      setError('Hubo un problema con el plan elegido. Vuelve al paso anterior y elígelo otra vez.')
    }
  }

  // Salida de emergencia si el guardado falla: el pago entra igual y el equipo
  // lo ve como "PAGO SIN PRE-REGISTRO" para pedir los datos por WhatsApp o email.
  const payWithoutSaving = () => {
    const checkoutUrl = getCheckoutUrl(planId, freqDays)
    if (checkoutUrl) window.location.href = checkoutUrl
  }

  const ctaText = loading
    ? 'Guardando tus datos…'
    : allValid
      ? `Agregar tarjeta y pagar ${formatPrice(monthly)}/mes`
      : 'Completa tus datos'

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>Datos de entrega</h1>
        <p style={{ margin: 0, maxWidth: 520, fontSize: 16, lineHeight: 1.5, color: 'var(--text)' }}>
          Dónde llega tu café. Usamos tu celular solo para avisarte cuando sale el pedido.
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
            <select
              id="x-city" className="inp"
              value={city}
              onChange={e => { setCity(e.target.value) }}
              onBlur={() => blur('city')}
              aria-invalid={touched.city && !valid.city}
              aria-describedby="e-city"
              style={{ appearance: 'none', paddingRight: 44 }}
            >
              <option value="">Selecciona tu ciudad</option>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {valid.city && <CheckIcon />}
          </div>
          <span id="e-city" style={{ display: 'block', minHeight: 14, marginTop: 3, paddingLeft: 16, fontSize: 11, color: 'var(--error)' }}>
            {touched.city && !valid.city ? msgs.city : ''}
          </span>
        </div>

        <div>
          <label className="lbl" htmlFor="x-notes">OBSERVACIONES</label>
          <textarea
            id="x-notes" className="inp" rows={3}
            placeholder="Ej. Portería cerrada después de las 6pm, timbre no funciona, dejar con el vigilante..."
            value={notes}
            onChange={e => { setNotes(e.target.value); startTyping() }}
            onBlur={() => onTypingChange(false)}
            style={{ resize: 'vertical', padding: '12px 16px' }}
          />
        </div>

        <span style={{ fontSize: 12, color: 'var(--text)' }}>
          Domicilio incluido en Medellín y el Área Metropolitana. Consulta cobertura para otras ciudades.
        </span>
      </fieldset>

      {/* Billing */}
      <fieldset className="fs">
        <legend><b>C</b>FACTURACIÓN ELECTRÓNICA</legend>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={wantsBilling}
            onChange={e => setWantsBilling(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: 'var(--accent)' }}
          />
          Necesito factura electrónica
        </label>

        {wantsBilling && (
          <div className="pop" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '0 10px' }}>
              <div>
                <label className="lbl" htmlFor="x-nit">NIT O CÉDULA <span style={{ color: 'var(--accent)' }}>*</span></label>
                <input
                  id="x-nit" className="inp" type="text" inputMode="numeric"
                  placeholder="900.123.456-7 o 1.234.567.890"
                  value={billingNit}
                  onChange={e => { setBillingNit(e.target.value); startTyping() }}
                  onBlur={() => onTypingChange(false)}
                />
              </div>
              <div>
                <label className="lbl" htmlFor="x-bname">RAZÓN SOCIAL O NOMBRE</label>
                <input
                  id="x-bname" className="inp" type="text"
                  placeholder="Empresa S.A.S. o tu nombre"
                  value={billingName}
                  onChange={e => { setBillingName(e.target.value); startTyping() }}
                  onBlur={() => onTypingChange(false)}
                />
              </div>
            </div>
            <div>
              <label className="lbl" htmlFor="x-bemail">EMAIL PARA FACTURA</label>
              <input
                id="x-bemail" className="inp" type="email"
                placeholder="contabilidad@empresa.com (si es diferente al de contacto)"
                value={billingEmail}
                onChange={e => { setBillingEmail(e.target.value); startTyping() }}
                onBlur={() => onTypingChange(false)}
              />
            </div>
          </div>
        )}
      </fieldset>

      {error && (
        <span role="alert" className="pop" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, fontSize: 13, color: 'var(--error)', fontWeight: 700 }}>
          {error}
          {saveFailed && (
            <button
              type="button"
              className="lnk"
              onClick={payWithoutSaving}
              style={{
                minHeight: 44, border: 0, background: 'transparent', padding: 0,
                fontFamily: 'inherit', fontSize: 13, fontWeight: 400, color: 'var(--ink)',
                textDecoration: 'underline', textAlign: 'left', cursor: 'pointer',
              }}
            >
              Ir a pagar de todas formas: te escribiremos para completar tus datos de entrega
            </button>
          )}
        </span>
      )}

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
          disabled={loading}
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

      {/* Trust badges */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 20px', alignItems: 'center' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Datos encriptados
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Cobro vía Mercado Pago
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          Pausa o cancela sin penalidad
        </span>
      </div>

      <span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text)' }}>
        {/* Los planes de MP cobran una vez al mes, también los quincenales (2 entregas por cobro). */}
        Se debitan {formatPrice(monthly)} una vez al mes con Mercado Pago
        {freqDays === 15 ? `, y cubren tus 2 entregas (${freqLabel.toLowerCase()}).` : '.'} No guardamos datos de tu tarjeta.
      </span>
      <span style={{ fontSize: 11, lineHeight: 1.5, color: 'var(--text)' }}>
        Al continuar aceptas el tratamiento de tus datos personales y recibir avisos de entrega por WhatsApp y email.
      </span>
    </>
  )
}
