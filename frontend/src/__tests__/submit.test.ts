import { describe, test, expect, vi, beforeEach } from 'vitest'
import { submitSubscription, type SubscriptionPayload } from '../lib/submit'

const validPayload: SubscriptionPayload = {
  email: 'juan@test.com',
  fullName: 'Juan Pérez',
  phone: '+573001234567',
  address: 'Calle 10 #40-20',
  city: 'Medellín',
  deliveryNotes: '',
  subscriptionType: 'Café de Diario',
  plan: '1 KG',
  coffee: 'Caturra Lavado Tradicional',
  grind: 'V60',
  frequency: 15,
  price: 230000,
  mpPlanId: 'diario-1kg',
}

/** Respuesta como la de Apps Script: siempre 200, el resultado va en el cuerpo. */
function appsScriptReply(body: unknown) {
  return { ok: true, json: async () => body }
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('submitSubscription', () => {
  test('sends text/plain so the browser skips the CORS preflight', async () => {
    const fetchMock = vi.fn().mockResolvedValue(appsScriptReply({ status: 'ok' }))
    global.fetch = fetchMock
    await submitSubscription(validPayload, 'https://script.google.com/test')
    const [, init] = fetchMock.mock.calls[0]
    expect(init.method).toBe('POST')
    expect(init.headers['Content-Type']).toMatch(/^text\/plain/)
    expect(JSON.parse(init.body).email).toBe(validPayload.email)
  })

  test('success only when Apps Script answers status ok', async () => {
    global.fetch = vi.fn().mockResolvedValue(appsScriptReply({ status: 'ok' }))
    const result = await submitSubscription(validPayload, 'https://script.google.com/test')
    expect(result.checkoutUrl).toContain('mpago.la')
    expect(result.success).toBe(true)
  })

  test('reports rejected data with the Apps Script message', async () => {
    global.fetch = vi.fn().mockResolvedValue(appsScriptReply({ status: 'error', message: 'Molienda inválida' }))
    const result = await submitSubscription(validPayload, 'https://script.google.com/test')
    expect(result.success).toBe(false)
    expect(result.reason).toBe('rejected')
    expect(result.message).toBe('Molienda inválida')
    expect(result.checkoutUrl).toContain('mpago.la')
  })

  test('reports a network error (e.g. blocked by CORS) as not saved', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    const result = await submitSubscription(validPayload, 'https://script.google.com/test')
    expect(result.success).toBe(false)
    expect(result.reason).toBe('network')
  })

  test('reports a timeout as not saved', async () => {
    global.fetch = vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError'))
    const result = await submitSubscription(validPayload, 'https://script.google.com/test')
    expect(result.success).toBe(false)
    expect(result.reason).toBe('timeout')
    expect(result.checkoutUrl).toBeTruthy()
  })

  test('throws on invalid plan/frequency combo', async () => {
    const bad = { ...validPayload, mpPlanId: 'especial-500', frequency: 15 }
    await expect(submitSubscription(bad, 'https://script.google.com/test')).rejects.toThrow('Invalid plan/frequency')
  })

  test('especial-250 mensual returns checkout URL', async () => {
    global.fetch = vi.fn().mockResolvedValue(appsScriptReply({ status: 'ok' }))
    const payload = { ...validPayload, mpPlanId: 'especial-250', frequency: 30, price: 80000 }
    const result = await submitSubscription(payload, 'https://script.google.com/test')
    expect(result.checkoutUrl).toContain('mpago.la')
    expect(result.success).toBe(true)
  })
})
