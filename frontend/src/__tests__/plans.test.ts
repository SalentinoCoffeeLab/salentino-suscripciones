import { describe, test, expect } from 'vitest'
import {
  SALENTINO_PLANS,
  getPlanById,
  getPlansForLine,
  getCheckoutUrl,
  getMonthlyPrice,
  formatPrice,
} from '../data/plans'

describe('SALENTINO_PLANS', () => {
  test('all 4 plans have required fields', () => {
    expect(SALENTINO_PLANS).toHaveLength(4)
    SALENTINO_PLANS.forEach(plan => {
      expect(plan.id).toBeTruthy()
      expect(plan.name).toBeTruthy()
      expect(plan.line).toMatch(/^(diario|especial)$/)
      expect(plan.code).toMatch(/^(SUM|LAB)-0[12]$/)
      expect(plan.priceFrom).toBeGreaterThan(0)
      expect(plan.frequencies.length).toBeGreaterThan(0)
      expect(plan.image).toBeTruthy()
    })
  })

  test('diario plans have quincenal + mensual, especial plans have one frequency each', () => {
    SALENTINO_PLANS.forEach(plan => {
      if (plan.line === 'diario') {
        expect(plan.frequencies).toEqual([15, 30])
      } else if (plan.id === 'especial-250') {
        expect(plan.frequencies).toEqual([15, 30])
      } else {
        expect(plan.frequencies).toEqual([30])
      }
    })
  })
})

describe('getPlanById', () => {
  test('returns correct plan for diario-454', () => {
    const plan = getPlanById('diario-454')
    expect(plan?.priceFrom).toBe(72000)
    expect(plan?.code).toBe('SUM-01')
  })

  test('returns correct plan for especial-500', () => {
    const plan = getPlanById('especial-500')
    expect(plan?.priceFrom).toBe(160000)
    expect(plan?.code).toBe('LAB-02')
  })

  test('returns undefined for unknown id', () => {
    expect(getPlanById('nonexistent')).toBeUndefined()
  })
})

describe('getPlansForLine', () => {
  test('returns 2 diario plans', () => {
    const plans = getPlansForLine('diario')
    expect(plans).toHaveLength(2)
    plans.forEach(p => expect(p.line).toBe('diario'))
  })

  test('returns 2 especial plans', () => {
    const plans = getPlansForLine('especial')
    expect(plans).toHaveLength(2)
    plans.forEach(p => expect(p.line).toBe('especial'))
  })
})

describe('getCheckoutUrl', () => {
  test('returns URL for valid diario combo', () => {
    const url = getCheckoutUrl('diario-1kg', 15)
    expect(url).toContain('mpago.la')
  })

  test('returns undefined for invalid frequency', () => {
    expect(getCheckoutUrl('especial-500', 15)).toBeUndefined()
  })

  test('returns URL for especial-250 quincenal', () => {
    const url = getCheckoutUrl('especial-250', 15)
    expect(url).toContain('mpago.la')
  })

  test('returns URL for especial-250 mensual', () => {
    const url = getCheckoutUrl('especial-250', 30)
    expect(url).toContain('mpago.la')
  })

  test('returns URL for especial-500 mensual', () => {
    const url = getCheckoutUrl('especial-500', 30)
    expect(url).toContain('mpago.la')
  })
})

describe('getMonthlyPrice', () => {
  test('454g quincenal costs 140000/month', () => {
    expect(getMonthlyPrice('diario-454', 15)).toBe(140000)
  })

  test('454g mensual costs 72000/month', () => {
    expect(getMonthlyPrice('diario-454', 30)).toBe(72000)
  })

  test('especial-250 mensual costs 80000/month', () => {
    expect(getMonthlyPrice('especial-250', 30)).toBe(80000)
  })

  test('returns undefined for invalid combo', () => {
    expect(getMonthlyPrice('especial-500', 15)).toBeUndefined()
  })
})

describe('formatPrice', () => {
  test('formats COP price', () => {
    const formatted = formatPrice(70000)
    expect(formatted).toContain('$')
    expect(formatted).toContain('70')
  })
})
