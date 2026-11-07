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
  // SUMINISTRO: 3 gramajes × 3 frecuencias = 9 planes
  { key: "suministro_454_7", reason: "Salentino Suministro 454g Semanal", price: 60000, frequency: 7 },
  { key: "suministro_454_14", reason: "Salentino Suministro 454g Quincenal", price: 60000, frequency: 14 },
  { key: "suministro_454_30", reason: "Salentino Suministro 454g Mensual", price: 60000, frequency: 30 },
  { key: "suministro_1000_7", reason: "Salentino Suministro 1kg Semanal", price: 105000, frequency: 7 },
  { key: "suministro_1000_14", reason: "Salentino Suministro 1kg Quincenal", price: 105000, frequency: 14 },
  { key: "suministro_1000_30", reason: "Salentino Suministro 1kg Mensual", price: 105000, frequency: 30 },
  { key: "suministro_2000_7", reason: "Salentino Suministro 2kg Semanal", price: 195000, frequency: 7 },
  { key: "suministro_2000_14", reason: "Salentino Suministro 2kg Quincenal", price: 195000, frequency: 14 },
  { key: "suministro_2000_30", reason: "Salentino Suministro 2kg Mensual", price: 195000, frequency: 30 },
  // LAB SERIES: 3 opciones × 2 frecuencias = 6 planes
  { key: "lab_discovery_14", reason: "Salentino Lab Series Discovery Quincenal", price: 68000, frequency: 14 },
  { key: "lab_discovery_30", reason: "Salentino Lab Series Discovery Mensual", price: 68000, frequency: 30 },
  { key: "lab_ritual_14", reason: "Salentino Lab Series Ritual Quincenal", price: 110000, frequency: 14 },
  { key: "lab_ritual_30", reason: "Salentino Lab Series Ritual Mensual", price: 110000, frequency: 30 },
  { key: "lab_contraste_14", reason: "Salentino Lab Series Contraste Quincenal", price: 125000, frequency: 14 },
  { key: "lab_contraste_30", reason: "Salentino Lab Series Contraste Mensual", price: 125000, frequency: 30 },
  // MIGRACIÓN
  { key: "migration_podio_ritual", reason: "Salentino Migración Podio → Ritual Mensual", price: 90000, frequency: 30 },
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

    // Small delay to avoid rate limiting
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
