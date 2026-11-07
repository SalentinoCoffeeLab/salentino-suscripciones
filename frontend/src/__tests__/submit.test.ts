import { describe, test, expect, vi, beforeEach } from 'vitest'
import { submitSubscription, type SubscriptionPayload } from '../lib/submit'

const validPayload: SubscriptionPayload = {
  email: 'juan@test.com',
  fullName: 'Juan Pérez',
  phone: '+573001234567',
  address: 'Calle 10 #40-20',
  city: 'Medellín',
  deliveryNotes: '',
  subscriptionType: 'Suministro',
  plan: 'Familiar',
  coffee: 'Caturra Lavado',
  grind: 'V60',
  frequency: 14,
  price: 105000,
  mpPlanId: 'suministro-familiar',
}

const mockStorage = new Map<string, string>()

beforeEach(() => {
  vi.restoreAllMocks()
  mockStorage.clear()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => mockStorage.get(key) ?? null,
    setItem: (key: string, value: string) => mockStorage.set(key, value),
    removeItem: (key: string) => mockStorage.delete(key),
    clear: () => mockStorage.clear(),
    get length() { return mockStorage.size },
    key: (index: number) => [...mockStorage.keys()][index] ?? null,
  })
})

describe('submitSubscription', () => {
  test('returns checkoutUrl on successful POST', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true })
    const result = await submitSubscription(validPayload, 'https://script.google.com/test')
    expect(result.checkoutUrl).toContain('mercadopago')
    expect(result.success).toBe(true)
  })

  test('saves to localStorage and returns URL on timeout', async () => {
    global.fetch = vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError'))
    const result = await submitSubscription(validPayload, 'https://script.google.com/test')
    expect(result.success).toBe(false)
    expect(result.checkoutUrl).toBeTruthy()
    expect(localStorage.getItem(`sub_backup_${validPayload.email}`)).toBeTruthy()
  })

  test('throws on invalid plan/frequency combo', async () => {
    const bad = { ...validPayload, mpPlanId: 'lab-discovery', frequency: 7 }
    await expect(submitSubscription(bad, 'https://script.google.com/test')).rejects.toThrow('Invalid plan/frequency')
  })
})
