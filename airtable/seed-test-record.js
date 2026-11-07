/**
 * Seed script to verify Airtable schema.
 * Creates a test record in Suscriptores, reads it back, asserts all fields, then deletes it.
 *
 * Usage:
 *   AIRTABLE_PAT=patXXX AIRTABLE_BASE_ID=appXXX node airtable/seed-test-record.js
 */

const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_PAT || !AIRTABLE_BASE_ID) {
  console.error("Missing env vars: AIRTABLE_PAT and AIRTABLE_BASE_ID are required.");
  process.exit(1);
}

const BASE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;
const TABLE = "Suscriptores";
const HEADERS = {
  Authorization: `Bearer ${AIRTABLE_PAT}`,
  "Content-Type": "application/json",
};

const EXPECTED_FIELDS = [
  "Nombre",
  "Email",
  "Teléfono",
  "Dirección",
  "Ciudad",
  "Notas de entrega",
  "Tipo de suscripción",
  "Plan",
  "Café elegido",
  "Molienda",
  "Frecuencia",
  "Precio/envío",
  "Estado",
  "Fecha de registro",
  "MP Plan ID",
  "Lote enviado",
];

const TEST_RECORD = {
  Nombre: "Test Seed Script",
  Email: "test@salentino.co",
  "Teléfono": "+573000000000",
  "Dirección": "Test Address 123",
  Ciudad: "Medellín",
  "Notas de entrega": "Test delivery notes",
  "Tipo de suscripción": "Suministro",
  Plan: "Familiar",
  "Café elegido": "Caturra Lavado",
  Molienda: "V60",
  Frecuencia: "Quincenal",
  "Precio/envío": 105000,
  Estado: "Pendiente de pago",
  "Fecha de registro": new Date().toISOString().split("T")[0],
  "MP Plan ID": "suministro_1000_14",
  "Lote enviado": "",
};

async function request(path, options = {}) {
  const url = `${BASE_URL}/${encodeURIComponent(path)}`;
  const response = await fetch(url, { headers: HEADERS, ...options });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Airtable API error ${response.status}: ${body}`);
  }
  return response.json();
}

async function createRecord(fields) {
  const data = await request(TABLE, {
    method: "POST",
    body: JSON.stringify({ fields }),
  });
  return data;
}

async function getRecord(recordId) {
  const data = await request(`${TABLE}/${recordId}`);
  return data;
}

async function deleteRecord(recordId) {
  await request(`${TABLE}/${recordId}`, { method: "DELETE" });
}

async function main() {
  console.log("Creating test record...");
  const created = await createRecord(TEST_RECORD);
  const recordId = created.id;
  console.log(`  Record created: ${recordId}`);

  console.log("Reading record back...");
  const fetched = await getRecord(recordId);

  console.log("Verifying fields...");
  const missing = [];
  for (const field of EXPECTED_FIELDS) {
    if (!(field in fetched.fields) && !(field in TEST_RECORD && TEST_RECORD[field] === "")) {
      // Airtable omits empty string fields from response
      if (TEST_RECORD[field] !== "") {
        missing.push(field);
      }
    }
  }

  if (missing.length > 0) {
    console.error(`  Missing fields: ${missing.join(", ")}`);
    await deleteRecord(recordId);
    process.exit(1);
  }

  // Verify key values
  const fields = fetched.fields;
  const assertions = [
    [fields.Email, "test@salentino.co", "Email"],
    [fields.Plan, "Familiar", "Plan"],
    [fields.Estado, "Pendiente de pago", "Estado"],
    [fields["Tipo de suscripción"], "Suministro", "Tipo de suscripción"],
    [fields.Molienda, "V60", "Molienda"],
  ];

  for (const [actual, expected, name] of assertions) {
    if (actual !== expected) {
      console.error(`  Assertion failed: ${name} = "${actual}", expected "${expected}"`);
      await deleteRecord(recordId);
      process.exit(1);
    }
  }

  console.log("Deleting test record...");
  await deleteRecord(recordId);

  console.log("\nSchema verified. Test record created and deleted.");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
