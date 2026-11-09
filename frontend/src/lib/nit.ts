export type NitResult =
  | { valid: true; formatted: string }
  | { valid: false; error: string }

/**
 * Valida un NIT colombiano (con dígito de verificación) o una cédula (6–10 dígitos).
 *
 * Algoritmo del dígito de verificación:
 * Módulo 11 con primos [71, 67, 59, 53, 47, 43, 41, 37, 29, 23, 17, 13, 7, 3]
 * alineados de derecha a izquierda sobre los dígitos del NIT base.
 */
const PRIMES = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71]

function computeCheckDigit(base: string): number {
  let sum = 0
  for (let i = 0; i < base.length; i++) {
    sum += Number(base[base.length - 1 - i]) * PRIMES[i]
  }
  const remainder = sum % 11
  if (remainder === 0) return 0
  if (remainder === 1) return 1
  return 11 - remainder
}

export function validateNit(raw: string): NitResult {
  // Limpiar: quitar espacios y puntos
  const clean = raw.replace(/[\s.]/g, '')

  if (!clean) {
    return { valid: false, error: 'Escribe tu NIT o cédula.' }
  }

  // Solo dígitos y opcionalmente un guion seguido de un dígito al final
  const match = clean.match(/^(\d{6,10})(?:-(\d))?$/)
  if (!match) {
    return { valid: false, error: 'Formato inválido. Ej: 900.123.456-7 o 1234567890' }
  }

  const base = match[1]
  const checkStr = match[2]

  // Si tiene dígito de verificación, validarlo
  if (checkStr !== undefined) {
    const expected = computeCheckDigit(base)
    if (Number(checkStr) !== expected) {
      return { valid: false, error: `Dígito de verificación incorrecto. ¿Será ${base}-${expected}?` }
    }
    return { valid: true, formatted: `${base}-${checkStr}` }
  }

  // Cédula sin dígito de verificación
  return { valid: true, formatted: base }
}
