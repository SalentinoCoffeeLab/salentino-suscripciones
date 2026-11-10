import { useState, useCallback } from 'react'
import { formatPrice, getMonthlyPrice, getPerShipmentPrice, getCheckoutUrl, getMpPlanKey, getPlanById, LINE_INFO, GRIND_OPTIONS, CITIES } from '../data/plans'
import { submitSubscription } from '../lib/submit'
import { MercadoPagoLogo } from './MercadoPagoLogo'
import { validateNit } from '../lib/nit'

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

  const nitResult = wantsBilling ? validateNit(billingNit) : null

  const valid = {
    email: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email),
    name: name.trim().length >= 3,
    phone: digits(phone).length >= 7,
    address: address.trim().length >= 5,
    city: city.trim().length >= 3,
    billingNit: !wantsBilling || (nitResult !== null && nitResult.valid),
  }

  const allValid = Object.values(valid).every(Boolean)

  const msgs: Record<string, string> = {
    email: 'Revisa tu email: nombre@correo.com',
    name: 'Escribe tu nombre completo.',
    phone: 'Al menos 7 dígitos.',
    address: 'Escribe calle y número, por ejemplo Calle 10 #40-20.',
    city: 'Escribe tu ciudad o municipio.',
    billingNit: nitResult && !nitResult.valid ? nitResult.error : 'Escribe tu NIT o cédula.',
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
          ...(wantsBilling && nitResult?.valid ? { billingNit: nitResult.formatted, billingName: billingName || name, billingEmail: billingEmail || email } : {}),
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
        <h1 className="h1-step" style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>
          Datos de <span style={{ color: 'var(--accent)' }}>entrega</span>
        </h1>
        <p className="p-step" style={{ margin: 0, maxWidth: 520, fontSize: 16, lineHeight: 1.5, color: 'var(--text)' }}>
          Dónde llega tu café. Usamos tu celular solo para avisarte cuando sale cada entrega.
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
            placeholder="Portería cerrada, timbre no funciona, dejar con el vigilante..."
            value={notes}
            onChange={e => { setNotes(e.target.value); startTyping() }}
            onBlur={() => onTypingChange(false)}
            style={{ resize: 'vertical', padding: '12px 16px' }}
          />
        </div>

        <span style={{ fontSize: 12, color: 'var(--text)' }}>
          Domicilio incluido en Medellín y el Área Metropolitana. Otras ciudades: envío estándar (2–3 días hábiles).
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
                  onBlur={() => { blur('billingNit') }}
                  aria-invalid={touched.billingNit && !valid.billingNit}
                  aria-describedby="e-nit"
                />
                <span id="e-nit" style={{ display: 'block', minHeight: 14, marginTop: 3, paddingLeft: 16, fontSize: 11, color: !valid.billingNit ? 'var(--error)' : 'var(--ok)' }}>
                  {touched.billingNit && !valid.billingNit ? msgs.billingNit : billingNit && valid.billingNit && nitResult?.valid ? `✓ ${nitResult.formatted}` : ''}
                </span>
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
                placeholder="contabilidad@empresa.com"
                value={billingEmail}
                onChange={e => { setBillingEmail(e.target.value); startTyping() }}
                onBlur={() => onTypingChange(false)}
              />
            </div>
          </div>
        )}
      </fieldset>

      {/* Authorizations */}
      <fieldset className="fs">
        <legend><b>D</b>AUTORIZACIONES</legend>
        <label style={{ display: 'flex', gap: 12, alignItems: 'flex-start', fontSize: 13.5, lineHeight: 1.5, cursor: 'pointer' }}>
          <input type="checkbox" checked disabled style={{ width: 20, height: 20, accentColor: 'var(--accent)', marginTop: 1, flexShrink: 0 }} />
          <span>Acepto la política de tratamiento de datos. <span style={{ color: 'var(--text)' }}>(obligatoria)</span></span>
        </label>
        <label style={{ display: 'flex', gap: 12, alignItems: 'flex-start', fontSize: 13.5, lineHeight: 1.5, cursor: 'pointer' }}>
          <input type="checkbox" style={{ width: 20, height: 20, accentColor: 'var(--accent)', marginTop: 1, flexShrink: 0 }} />
          <span>Quiero recibir lotes nuevos y novedades por WhatsApp. <span style={{ color: 'var(--text)' }}>(opcional)</span></span>
        </label>
      </fieldset>

      {/* What happens next */}
      <div style={{ background: 'var(--card)', borderRadius: 20, padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--accent)' }}>
          Qué pasa después
        </span>
        <ol style={{ margin: 0, padding: 0, listStyle: 'none', counterReset: 'n', display: 'grid', gap: 10 }}>
          {[
            { node: <><b>Agregas tu tarjeta en</b> <MercadoPagoLogo height={22} /><b>.</b> Ahí mismo autorizas el cobro mensual.</> },
            { node: <><b>Despachamos en 1–2 días hábiles.</b> Medellín: 24–48 h. Otras ciudades: 2–3 días hábiles.</> },
            ...(freqDays === 15 ? [{ node: <><b>La segunda entrega sale 15 días después.</b> Te avisamos por WhatsApp cada vez.</> }] : []),
          ].map((item, i) => (
            <li key={i} style={{ position: 'relative', paddingLeft: 32, fontSize: 13.5, lineHeight: 1.5 }}>
              <span style={{ position: 'absolute', left: 0, top: 0, color: 'var(--accent)', fontWeight: 700 }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              {item.node}
            </li>
          ))}
        </ol>
      </div>

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
        </button>
      </div>

      <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4, fontSize: 12, lineHeight: 1.5, color: 'var(--text)' }}>
        Se debitan {formatPrice(monthly)} una vez al mes con <MercadoPagoLogo height={26} />
        {freqDays === 15 ? ` y cubren tus 2 entregas (${freqLabel.toLowerCase()}).` : '.'} No guardamos datos de tu tarjeta.
      </span>

      {/* Trust badges */}
      <p style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', margin: 0, fontSize: 12, color: 'var(--text)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
          Cobro con <MercadoPagoLogo height={24} />
        </span>
        <span>Pausa o cancela por WhatsApp</span>
        <span>Sin penalidad</span>
      </p>
    </>
  )
}
