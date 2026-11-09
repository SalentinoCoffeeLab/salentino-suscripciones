import { getCheckoutUrl } from '../data/plans'

export interface SubscriptionPayload {
  email: string
  fullName: string
  phone: string
  address: string
  city: string
  deliveryNotes: string
  subscriptionType: string
  plan: string
  coffee: string
  grind: string
  frequency: number
  price: number
  mpPlanId: string
}

const TIMEOUT_MS = 2500

export async function submitSubscription(
  payload: SubscriptionPayload,
  appsScriptUrl: string
): Promise<{ success: boolean; checkoutUrl: string }> {
  const checkoutUrl = getCheckoutUrl(payload.mpPlanId, payload.frequency)
  if (!checkoutUrl) {
    throw new Error('Invalid plan/frequency combination')
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (response.ok) {
      return { success: true, checkoutUrl }
    }

    saveBackup(payload)
    return { success: false, checkoutUrl }
  } catch {
    clearTimeout(timeoutId)
    saveBackup(payload)
    return { success: false, checkoutUrl }
  }
}

function saveBackup(payload: SubscriptionPayload): void {
  try {
    localStorage.setItem(
      `sub_backup_${payload.email}`,
      JSON.stringify({ ...payload, savedAt: new Date().toISOString() })
    )
  } catch {
    // localStorage might be full or unavailable — silent fail
  }
}
