import { describe, test, expect } from 'vitest'
import { validateNit } from '../lib/nit'

describe('validateNit', () => {
  test('accepts valid NIT with correct check digit', () => {
    expect(validateNit('900123456-8')).toEqual({ valid: true, formatted: '900123456-8' })
  })

  test('rejects NIT with wrong check digit', () => {
    expect(validateNit('900123456-0').valid).toBe(false)
  })

  test('accepts valid cédula (6–10 digits, no check digit)', () => {
    expect(validateNit('1234567890')).toEqual({ valid: true, formatted: '1234567890' })
  })

  test('accepts cédula with dots as separators', () => {
    expect(validateNit('1.234.567.890')).toEqual({ valid: true, formatted: '1234567890' })
  })

  test('accepts NIT with dots and dash', () => {
    expect(validateNit('900.123.456-8')).toEqual({ valid: true, formatted: '900123456-8' })
  })

  test('accepts NIT with spaces', () => {
    expect(validateNit(' 900 123 456 - 8 ')).toEqual({ valid: true, formatted: '900123456-8' })
  })

  test('rejects too short input (less than 6 digits)', () => {
    const result = validateNit('12345')
    expect(result.valid).toBe(false)
    expect(result.error).toBeTruthy()
  })

  test('rejects too long input (more than 10 digits before dash)', () => {
    const result = validateNit('12345678901-0')
    expect(result.valid).toBe(false)
  })

  test('rejects empty string', () => {
    expect(validateNit('').valid).toBe(false)
  })

  test('rejects letters', () => {
    expect(validateNit('ABC123').valid).toBe(false)
  })

  test('known NITs: Bancolombia 890903938-8', () => {
    expect(validateNit('890903938-8')).toEqual({ valid: true, formatted: '890903938-8' })
  })

  test('known NITs: DIAN 800197268-4', () => {
    expect(validateNit('800197268-4')).toEqual({ valid: true, formatted: '800197268-4' })
  })
})
