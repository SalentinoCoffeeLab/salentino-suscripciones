import { describe, test, expect, vi, beforeEach } from 'vitest'
import { submitSubscription, type SubscriptionPayload } from '../lib/submit'

const basePayload: SubscriptionPayload = {
  email: 'juan@test.com',
  fullName: 'Juan Pérez',
  phone: '+573001234567',
  address: 'Calle 10 #40-20',
  city: 'Medellín',
  deliveryNotes: '',
  subscriptionType: 'Café de Diario',
  plan: '454 g',
  coffee: 'Caturra Lavado Tradicional',
  grind: 'V60',
  frequency: 30,
  price: 72000,
  mpPlanId: 'diario-454',
}

function appsScriptReply(body: unknown) {
  return { ok: true, json: async () => body }
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('billing fields in submitSubscription', () => {
  test('payload without billing fields omits billingNit, billingName, billingEmail', async () => {
    const fetchMock = vi.fn().mockResolvedValue(appsScriptReply({ status: 'ok' }))
    global.fetch = fetchMock

    await submitSubscription(basePayload, 'https://script.google.com/test')

    const sent = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(sent.billingNit).toBeUndefined()
    expect(sent.billingName).toBeUndefined()
    expect(sent.billingEmail).toBeUndefined()
  })

  test('payload with billing fields sends billingNit, billingName, billingEmail', async () => {
    const fetchMock = vi.fn().mockResolvedValue(appsScriptReply({ status: 'ok' }))
    global.fetch = fetchMock

    const withBilling: SubscriptionPayload = {
      ...basePayload,
      billingNit: '900123456-7',
      billingName: 'Café Empresa S.A.S.',
      billingEmail: 'contabilidad@empresa.com',
    }

    const result = await submitSubscription(withBilling, 'https://script.google.com/test')

    const sent = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(sent.billingNit).toBe('900123456-7')
    expect(sent.billingName).toBe('Café Empresa S.A.S.')
    expect(sent.billingEmail).toBe('contabilidad@empresa.com')
    expect(result.success).toBe(true)
  })

  test('billing with cédula format works', async () => {
    const fetchMock = vi.fn().mockResolvedValue(appsScriptReply({ status: 'ok' }))
    global.fetch = fetchMock

    const withCedula: SubscriptionPayload = {
      ...basePayload,
      billingNit: '1234567890',
      billingName: 'Juan Pérez',
    }

    await submitSubscription(withCedula, 'https://script.google.com/test')

    const sent = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(sent.billingNit).toBe('1234567890')
    expect(sent.billingName).toBe('Juan Pérez')
    expect(sent.billingEmail).toBeUndefined()
  })

  test('billing fields fallback: billingName defaults to fullName, billingEmail defaults to email', async () => {
    // This tests the StepEntrega logic: when wantsBilling is true but
    // billingName/billingEmail are empty, it sends fullName/email as defaults.
    // We simulate that by passing the fallback values directly.
    const fetchMock = vi.fn().mockResolvedValue(appsScriptReply({ status: 'ok' }))
    global.fetch = fetchMock

    const withDefaults: SubscriptionPayload = {
      ...basePayload,
      billingNit: '900123456-7',
      billingName: 'Juan Pérez',      // same as fullName (fallback)
      billingEmail: 'juan@test.com',   // same as email (fallback)
    }

    await submitSubscription(withDefaults, 'https://script.google.com/test')

    const sent = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(sent.billingNit).toBe('900123456-7')
    expect(sent.billingName).toBe('Juan Pérez')
    expect(sent.billingEmail).toBe('juan@test.com')
  })

  test('billing data reaches Apps Script even when it rejects', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      appsScriptReply({ status: 'error', message: 'NIT inválido' })
    )
    global.fetch = fetchMock

    const withBilling: SubscriptionPayload = {
      ...basePayload,
      billingNit: 'INVALID',
      billingName: 'Test',
    }

    const result = await submitSubscription(withBilling, 'https://script.google.com/test')

    const sent = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(sent.billingNit).toBe('INVALID')
    expect(result.success).toBe(false)
    expect(result.reason).toBe('rejected')
    expect(result.message).toBe('NIT inválido')
  })
})
