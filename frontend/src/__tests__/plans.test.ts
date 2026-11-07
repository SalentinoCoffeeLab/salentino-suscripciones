import { describe, test, expect } from 'vitest'
import { SALENTINO_PLANS, getPlanById, getCheckoutUrl } from '../data/plans'

describe('SALENTINO_PLANS', () => {
  test('all 6 plans have required fields', () => {
    expect(SALENTINO_PLANS).toHaveLength(6)
    SALENTINO_PLANS.forEach(plan => {
      expect(plan.id).toBeTruthy()
      expect(plan.name).toBeTruthy()
      expect(plan.price).toBeTruthy()
      expect(plan.tier).toBeGreaterThanOrEqual(1)
      expect(plan.tier).toBeLessThanOrEqual(5)
      expect(plan.image).toBeTruthy()
    })
  })
})

describe('getPlanById', () => {
  test('returns correct plan for suministro-familiar', () => {
    const plan = getPlanById('suministro-familiar')
    expect(plan?.price).toBe('$105,000/envío')
    expect(plan?.tier).toBe(2)
  })

  test('returns undefined for unknown id', () => {
    expect(getPlanById('nonexistent')).toBeUndefined()
  })
})

describe('getCheckoutUrl', () => {
  test('returns URL for valid suministro combo', () => {
    const url = getCheckoutUrl('suministro-familiar', 14)
    expect(url).toContain('mercadopago')
  })

  test('returns undefined for Lab Series weekly (invalid combo)', () => {
    expect(getCheckoutUrl('lab-discovery', 7)).toBeUndefined()
  })

  test('returns URL for Lab Series quincenal (valid combo)', () => {
    const url = getCheckoutUrl('lab-discovery', 14)
    expect(url).toContain('mercadopago')
  })
})
