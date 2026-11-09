import { getCheckoutUrl } from '../data/plans'

export interface SubscriptionPayload {
  email: string
  fullName: string
  phone: string
  address: string
  city: string
  deliveryNotes: string
  billingNit?: string
  billingName?: string
  billingEmail?: string
  subscriptionType: string
  plan: string
  coffee: string
  grind: string
  frequency: number
  price: number
  mpPlanId: string
}

export type SubmitResult = {
  /** true solo si el Apps Script confirmó que guardó la fila ({ status: "ok" }). */
  success: boolean
  checkoutUrl: string
  reason?: 'timeout' | 'network' | 'rejected'
  /** Mensaje de validación del Apps Script cuando rechaza los datos. */
  message?: string
}

// Apps Script puede tardar varios segundos cuando lleva rato sin usarse.
const TIMEOUT_MS = 12000

export async function submitSubscription(
  payload: SubscriptionPayload,
  appsScriptUrl: string
): Promise<SubmitResult> {
  const checkoutUrl = getCheckoutUrl(payload.mpPlanId, payload.frequency)
  if (!checkoutUrl) {
    throw new Error('Invalid plan/frequency combination')
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    // text/plain y no application/json: con JSON el navegador hace una
    // verificación previa (OPTIONS) que Apps Script responde sin permiso CORS,
    // y cancela el envío. Apps Script lee el cuerpo igual en e.postData.contents.
    const response = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    if (!response.ok) {
      return { success: false, checkoutUrl, reason: 'network' }
    }

    // Apps Script responde 200 también cuando rechaza los datos: hay que leer el cuerpo.
    const data = await response.json().catch(() => null) as { status?: string; message?: string } | null
    if (data?.status === 'ok') {
      return { success: true, checkoutUrl }
    }
    return { success: false, checkoutUrl, reason: 'rejected', message: data?.message }
  } catch (err) {
    const aborted = err instanceof DOMException && err.name === 'AbortError'
    return { success: false, checkoutUrl, reason: aborted ? 'timeout' : 'network' }
  } finally {
    clearTimeout(timeoutId)
  }
}
