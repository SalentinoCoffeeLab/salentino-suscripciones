/**
 * Discount Code generator.
 *
 * Uses a generic code stored in Script Properties (DISCOUNT_CODE).
 * The code must be pre-created in Mercado Pago.
 *
 * Script Properties required:
 *   DISCOUNT_CODE — e.g. SUSCRIPTOR10
 */

/**
 * Get the discount code for a subscriber.
 * Returns the generic code from Script Properties.
 *
 * @param {string} _email — subscriber email (unused, kept for interface compatibility)
 * @returns {string} the discount code string
 */
function createDiscountCode(_email) {
  var code = PropertiesService.getScriptProperties().getProperty("DISCOUNT_CODE");
  if (!code) {
    throw new Error("DISCOUNT_CODE not configured in Script Properties");
  }
  return code;
}
