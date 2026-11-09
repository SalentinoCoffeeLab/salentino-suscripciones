/**
 * Shopify Admin API client for creating discount codes.
 *
 * Script Properties required:
 *   SHOPIFY_DOMAIN        — e.g. b0f1cf-3a.myshopify.com
 *   SHOPIFY_ACCESS_TOKEN  — Admin API access token
 */

/**
 * Create a unique 10% discount code for a subscriber.
 * Code format: SUB-XXXX-XXXX (random alphanumeric, uppercase).
 * Valid for unlimited uses by that customer, no expiration.
 *
 * @param {string} email — subscriber email
 * @returns {string} the discount code string
 */
function createDiscountCode(email) {
  var props = PropertiesService.getScriptProperties();
  var domain = props.getProperty("SHOPIFY_DOMAIN");
  var token = props.getProperty("SHOPIFY_ACCESS_TOKEN");

  if (!domain || !token) {
    throw new Error("SHOPIFY_DOMAIN or SHOPIFY_ACCESS_TOKEN not configured");
  }

  var code = _generateCode();

  // Step 1: Create a Price Rule (10% off, single-use per order)
  var priceRulePayload = {
    price_rule: {
      title: "Suscriptor " + email,
      target_type: "line_item",
      target_selection: "all",
      allocation_method: "across",
      value_type: "percentage",
      value: "-10.0",
      customer_selection: "all",
      usage_limit: null,
      starts_at: new Date().toISOString(),
    },
  };

  var priceRuleRes = UrlFetchApp.fetch(
    "https://" + domain + "/admin/api/2024-01/price_rules.json",
    {
      method: "post",
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json",
      },
      payload: JSON.stringify(priceRulePayload),
      muteHttpExceptions: true,
    }
  );

  if (priceRuleRes.getResponseCode() !== 201) {
    console.error("Shopify price rule error: " + priceRuleRes.getContentText());
    throw new Error("Failed to create Shopify price rule");
  }

  var priceRuleId = JSON.parse(priceRuleRes.getContentText()).price_rule.id;

  // Step 2: Create a Discount Code linked to the Price Rule
  var discountPayload = {
    discount_code: {
      code: code,
    },
  };

  var discountRes = UrlFetchApp.fetch(
    "https://" + domain + "/admin/api/2024-01/price_rules/" + priceRuleId + "/discount_codes.json",
    {
      method: "post",
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json",
      },
      payload: JSON.stringify(discountPayload),
      muteHttpExceptions: true,
    }
  );

  if (discountRes.getResponseCode() !== 201) {
    console.error("Shopify discount code error: " + discountRes.getContentText());
    throw new Error("Failed to create Shopify discount code");
  }

  return code;
}

/**
 * Generate a random code in format SUB-XXXX-XXXX.
 * @returns {string}
 */
function _generateCode() {
  var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  var part1 = "";
  var part2 = "";
  for (var i = 0; i < 4; i++) {
    part1 += chars.charAt(Math.floor(Math.random() * chars.length));
    part2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return "SUB-" + part1 + "-" + part2;
}
