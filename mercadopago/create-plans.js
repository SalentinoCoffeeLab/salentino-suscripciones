/**
 * Creates all Salentino subscription plans in Mercado Pago.
 * Outputs plans-catalog.json with plan IDs and checkout URLs.
 *
 * Usage:
 *   MP_ACCESS_TOKEN=TEST-xxx node mercadopago/create-plans.js
 *
 * For production:
 *   MP_ACCESS_TOKEN=APP_USR-xxx node mercadopago/create-plans.js
 */

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;

if (!MP_ACCESS_TOKEN) {
  console.error("Missing env var: MP_ACCESS_TOKEN is required.");
  process.exit(1);
}

const fs = require("fs");
const path = require("path");

const API_URL = "https://api.mercadopago.com/preapproval_plan";

const PLANS = [
  // CAFÉ DE DIARIO: 2 gramajes × 2 frecuencias = 4 planes
  { key: "diario_454_15", reason: "Salentino Café de Diario 454g Quincenal", price: 140000, frequency: 30 },
  { key: "diario_454_30", reason: "Salentino Café de Diario 454g Mensual", price: 72000, frequency: 30 },
  { key: "diario_1kg_15", reason: "Salentino Café de Diario 1kg Quincenal", price: 230000, frequency: 30 },
  { key: "diario_1kg_30", reason: "Salentino Café de Diario 1kg Mensual", price: 115000, frequency: 30 },
  // EDICIONES ESPECIALES: 1 frecuencia por plan = 2 planes
  { key: "especial_250_15", reason: "Salentino Ediciones Especiales 250g Quincenal", price: 180000, frequency: 30 },
  { key: "especial_500_30", reason: "Salentino Ediciones Especiales 500g Mensual", price: 160000, frequency: 30 },
];

async function createPlan(plan) {
  const body = {
    reason: plan.reason,
    auto_recurring: {
      frequency: plan.frequency,
      frequency_type: "days",
      transaction_amount: plan.price,
      currency_id: "COP",
    },
    back_url: "https://salentino.co/pages/suscripciones-confirmacion",
  };

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create plan "${plan.key}": ${response.status} ${error}`);
  }

  const data = await response.json();
  return {
    planId: data.id,
    checkoutUrl: data.init_point,
    price: plan.price,
  };
}

async function main() {
  const catalog = {};
  let created = 0;

  for (const plan of PLANS) {
    process.stdout.write(`Creating ${plan.key}...`);
    const result = await createPlan(plan);
    catalog[plan.key] = result;
    created++;
    console.log(` OK (${result.planId})`);

    if (created < PLANS.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  const outputPath = path.join(__dirname, "plans-catalog.json");
  fs.writeFileSync(outputPath, JSON.stringify(catalog, null, 2));

  console.log(`\n${created} plans created. Catalog saved to ${outputPath}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
