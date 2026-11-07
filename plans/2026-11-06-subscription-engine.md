# Salentino Subscription Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a subscription system for Salentino Coffee Lab: a React conveyor-belt configurator on Shopify, Airtable as operations DB, Mercado Pago for recurring payments, and a Google Apps Script webhook that notifies the team on WhatsApp/email when a payment lands.

**Architecture:** The frontend is a standalone React app (adapted SushiConveyorMenu) embedded in a Shopify page. It collects subscriber data, POSTs to a Google Apps Script web app that writes to Airtable, then redirects the user to a static Mercado Pago checkout link. A second Apps Script endpoint receives MP webhooks, matches the payer to Airtable by email, creates a dispatch record, and sends a notification.

**Tech Stack:** React 18+ (Vite build), Google Apps Script (clasp for local dev), Airtable REST API, Mercado Pago preapproval_plan API, Shopify (page embed via iframe or custom HTML block).

**Spec:** `docs/salentino-subscriptions/2026-11-06-subscription-engine-design.md`

## Global Constraints

- All prices in COP. Suministro: $60,000 / $105,000 / $195,000. Lab Series: $68,000 / $110,000 / $125,000.
- Molienda options: Grano, V60, Aeropress, Espresso, Prensa Francesa.
- Suministro frequencies: Semanal (7), Quincenal (14), Mensual (30). Lab Series: Quincenal (14), Mensual (30) only.
- Suministro coffees: Caturra Lavado, Blend Regional. Lab Series: tostador selects (no coffee picker in form).
- Tipografía: Space Mono (monospace). Layout: industrial grid, alto contraste.
- Airtable free tier: max 1,000 records. No external paid services.
- Form POST timeout: 2.5s max; fallback to localStorage then redirect anyway.
- MP webhook must return HTTP 200 within 5s. Idempotency by MP Payment ID uniqueness.

## Review Focus

1. **User submits form but closes browser before redirect completes** — form data persists in Airtable, subscription status stays "Pendiente de pago", no orphan payment possible since MP hasn't charged yet. Covered by Task 3 localStorage fallback test.
2. **MP webhook arrives before the form POST finishes writing to Airtable** — race condition where email lookup finds nothing. Webhook must create an exception record, not fail silently. Covered by Task 5 "no match" test.
3. **User selects Lab Series plan but Suministro-only frequency (Semanal)** — the form must not allow this combination. Covered by Task 3 frequency filtering test.
4. **MP sends webhook with status "rejected" or "refunded"** — script must ignore and return 200, not create a dispatch. Covered by Task 5 rejected-status test.
5. **Duplicate MP Payment ID arrives on retry** — second call must be idempotent (no duplicate dispatch created, still returns 200). Covered by Task 5 idempotency test.

---

### Task 1: Airtable Base Setup

**Files:**
- Create: `airtable/README-setup.md` (step-by-step guide with screenshots references)
- Create: `airtable/seed-test-record.js` (Node script using Airtable API to verify the schema)

**Interfaces:**
- Consumes: nothing
- Produces: Airtable base URL, API key (stored as env var `AIRTABLE_PAT`), Base ID (`AIRTABLE_BASE_ID`), table names `Suscriptores` and `Despachos` with exact field names from spec section 6.3.

- [ ] **Step 1: Create Airtable base "Salentino Suscripciones"**

In Airtable web UI, create base with two tables:

**Tabla Suscriptores** — fields exactly as spec section 6.3:
`Nombre` (text), `Email` (email), `Teléfono` (phone), `Dirección` (long text), `Ciudad` (text, default "Medellín"), `Notas de entrega` (long text), `Tipo de suscripción` (single select: Suministro, Lab Series), `Plan` (single select: Medio, Familiar, Abastecimiento, Discovery, Ritual, Contraste), `Café elegido` (single select: Caturra Lavado, Blend Regional, Selección del tostador), `Molienda` (single select: Grano, V60, Aeropress, Espresso, Prensa Francesa), `Frecuencia` (single select: Semanal, Quincenal, Mensual), `Precio/envío` (currency COP), `Estado` (single select: Pendiente de pago, Activo, Pausado, Cancelado), `Fecha de registro` (date), `MP Plan ID` (text), `Lote enviado` (text — for Lab Series traceability per dispatch).

**Tabla Despachos** — fields:
`Suscriptor` (link to Suscriptores), `Fecha de pago MP` (date), `Monto pagado` (currency COP), `MP Payment ID` (text), `Estado despacho` (single select: Por despachar, En preparación, En camino, Entregado), `Fecha de despacho` (date), `Lote enviado` (text), `Notas` (long text).

- [ ] **Step 2: Create views**

- Kanban "Despachos": grouped by `Estado despacho`
- Calendar "Próximos despachos": by `Fecha de despacho`
- Grid "Suscriptores activos": filtered `Estado` = "Activo"
- Grid "Excepciones": filtered `Estado` = "Pendiente de pago" AND `Fecha de registro` older than 24h

- [ ] **Step 3: Generate Personal Access Token**

Airtable → Account → Developer hub → Personal access tokens. Scopes: `data.records:read`, `data.records:write`. Store as `AIRTABLE_PAT`. Note the Base ID from the URL (`app...`), store as `AIRTABLE_BASE_ID`.

- [ ] **Step 4: Write and run seed script to verify schema**

Create `airtable/seed-test-record.js`: inserts one test record into Suscriptores (`email: test@salentino.co`, `Plan: Familiar`, `Estado: Pendiente de pago`), reads it back, asserts all fields present, then deletes it.

```bash
AIRTABLE_PAT=xxx AIRTABLE_BASE_ID=xxx node airtable/seed-test-record.js
```

Expected: "Schema verified. Test record created and deleted."

- [ ] **Step 5: Commit**

```bash
git add airtable/
git commit -m "feat: airtable base setup guide and schema verification script"
```

---

### Task 2: Mercado Pago Plans Creation

**Files:**
- Create: `mercadopago/create-plans.js` (Node script using MP API to create all 16 plans)
- Create: `mercadopago/plans-catalog.json` (output: plan IDs + checkout URLs)

**Interfaces:**
- Consumes: MP API credentials (`MP_ACCESS_TOKEN` env var)
- Produces: `plans-catalog.json` with structure `{ [lookupKey: string]: { planId: string, checkoutUrl: string, price: number } }` — consumed by Task 3 frontend lookup table.

- [ ] **Step 1: Write plan creation script**

Create `mercadopago/create-plans.js` that calls `POST https://api.mercadopago.com/preapproval_plan` for each of the 16 plans. Each plan needs: `reason` (e.g. "Salentino Suministro 454g Semanal"), `auto_recurring.frequency` (7/14/30), `auto_recurring.frequency_type` ("days"), `auto_recurring.transaction_amount` (price in COP), `auto_recurring.currency_id` ("COP"). Script outputs `plans-catalog.json`.

Plan keys match spec section 5.2:
```
suministro_454_7, suministro_454_14, suministro_454_30,
suministro_1000_7, suministro_1000_14, suministro_1000_30,
suministro_2000_7, suministro_2000_14, suministro_2000_30,
lab_discovery_14, lab_discovery_30,
lab_ritual_14, lab_ritual_30,
lab_contraste_14, lab_contraste_30,
migration_podio_ritual
```

- [ ] **Step 2: Run script against MP sandbox**

```bash
MP_ACCESS_TOKEN=TEST-xxx node mercadopago/create-plans.js
```

Expected: `plans-catalog.json` created with 16 entries, each containing `planId` and `checkoutUrl`.

- [ ] **Step 3: Verify one plan manually**

Open one `checkoutUrl` in browser. Verify it shows MP subscription checkout with correct amount.

- [ ] **Step 4: Commit**

```bash
git add mercadopago/
git commit -m "feat: mercado pago plan creation script and catalog"
```

---

### Task 3: React Conveyor Belt Configurator

**Files:**
- Create: `frontend/` (Vite + React project)
- Create: `frontend/src/data/plans.ts` (SALENTINO_PLANS array + MP_LOOKUP table)
- Create: `frontend/src/components/CoffeeConveyor.tsx` (adapted SushiConveyorMenu)
- Create: `frontend/src/components/SubscriptionDialog.tsx` (extended dialog with form)
- Create: `frontend/src/lib/submit.ts` (form submission + localStorage fallback)
- Create: `frontend/src/App.tsx` (composition root)
- Test: `frontend/src/__tests__/plans.test.ts`
- Test: `frontend/src/__tests__/submit.test.ts`

**Interfaces:**
- Consumes: `plans-catalog.json` from Task 2 (checkout URLs injected into `MP_LOOKUP`)
- Produces: Deployed static bundle embedded in Shopify page. POST payload to Apps Script (Task 4): `{ email, fullName, phone, address, city, deliveryNotes, subscriptionType, plan, coffee, grind, frequency, price, mpPlanId }`

- [ ] **Step 1: Scaffold Vite + React project**

```bash
cd frontend && npm create vite@latest . -- --template react-ts
npm install
```

- [ ] **Step 2: Write plans data module with tests**

Create `frontend/src/data/plans.ts` with `SALENTINO_PLANS` array (6 items, exact data from spec section 7.3) and `MP_LOOKUP` record (16 entries from Task 2 output). Export `getPlanById(id: string): CoffeePlan | undefined` and `getCheckoutUrl(planId: string, frequency: number): string | undefined`.

Create `frontend/src/__tests__/plans.test.ts`:

```typescript
test("getPlanById returns correct plan", () => {
  const plan = getPlanById("suministro-familiar");
  expect(plan?.price).toBe("$105,000/envío");
  expect(plan?.tier).toBe(2);
});

test("getCheckoutUrl returns URL for valid combo", () => {
  const url = getCheckoutUrl("suministro-familiar", 14);
  expect(url).toContain("mercadopago.com");
});

test("getCheckoutUrl returns undefined for Lab Series weekly", () => {
  expect(getCheckoutUrl("lab-discovery", 7)).toBeUndefined();
});

test("all 6 plans have required fields", () => {
  SALENTINO_PLANS.forEach(plan => {
    expect(plan.id).toBeTruthy();
    expect(plan.name).toBeTruthy();
    expect(plan.price).toBeTruthy();
    expect(plan.tier).toBeGreaterThanOrEqual(1);
    expect(plan.tier).toBeLessThanOrEqual(5);
    expect(plan.image).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd frontend && npx vitest run src/__tests__/plans.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 4: Adapt SushiConveyorMenu as CoffeeConveyor**

Copy the SushiConveyorMenu component into `frontend/src/components/CoffeeConveyor.tsx`. Rename types: `ConveyorDish` → `CoffeePlan` (use interface from spec). Change labels:
- `eyebrow`: "Suscripciones · Café en rotación"
- `heading`: "Tu café favorito, siempre fresco, siempre a tiempo."
- `caption`: "Desliza la banda, elige tu plan, activa tu suscripción."
- `labels.add`: "Activar suscripción"
- `labels.close`: "Cerrar"

Remove `onAdd` from conveyor level — the dialog handles subscription activation.

- [ ] **Step 5: Build SubscriptionDialog**

Create `frontend/src/components/SubscriptionDialog.tsx`. Extend the original `DishDialog` to include, below the plan details:

**Section "Configura tu plan":**
- `Café` select — only for Suministro plans (options: "Caturra Lavado", "Blend Regional"). Hidden for Lab Series.
- `Molienda` select — always shown (options: "Grano", "V60", "Aeropress", "Espresso", "Prensa Francesa").
- `Frecuencia` select — Suministro: "Semanal", "Quincenal", "Mensual". Lab Series: "Quincenal", "Mensual" only.

**Section "Datos de envío":**
- `Nombre` text input (required, min 3 chars)
- `Email` email input (required)
- `Teléfono` tel input (required, min 7 chars)
- `Dirección` text input (required, min 5 chars)
- `Ciudad` text input (default "Medellín")
- `Notas` textarea (optional)

**Button:** "Activar suscripción" — calls `submitSubscription()` from `submit.ts`.

- [ ] **Step 6: Write submit module with tests**

Create `frontend/src/lib/submit.ts`:

```typescript
export async function submitSubscription(
  payload: SubscriptionPayload,
  appsScriptUrl: string
): Promise<{ success: boolean; checkoutUrl: string }>
```

Logic:
1. Resolve `checkoutUrl` from `MP_LOOKUP` using `payload.mpPlanId` + `payload.frequency`.
2. If no URL found, throw `Error("Invalid plan/frequency combination")`.
3. POST to `appsScriptUrl` with AbortController timeout of 2500ms.
4. On success or timeout: return `{ success: true/false, checkoutUrl }`.
5. On failure: save payload to `localStorage` key `sub_backup_${payload.email}`, still return the checkoutUrl.

Create `frontend/src/__tests__/submit.test.ts`:

```typescript
test("returns checkoutUrl on successful POST", async () => {
  global.fetch = vi.fn().mockResolvedValue({ ok: true });
  const result = await submitSubscription(validPayload, "https://script.google.com/...");
  expect(result.checkoutUrl).toContain("mercadopago");
  expect(result.success).toBe(true);
});

test("saves to localStorage and returns URL on timeout", async () => {
  global.fetch = vi.fn().mockRejectedValue(new DOMException("Aborted"));
  const result = await submitSubscription(validPayload, "https://script.google.com/...");
  expect(result.success).toBe(false);
  expect(result.checkoutUrl).toBeTruthy();
  expect(localStorage.getItem(`sub_backup_${validPayload.email}`)).toBeTruthy();
});

test("throws on invalid plan/frequency combo", async () => {
  const bad = { ...validPayload, mpPlanId: "lab-discovery", frequency: 7 };
  await expect(submitSubscription(bad, "...")).rejects.toThrow("Invalid plan/frequency");
});
```

- [ ] **Step 7: Run all tests**

```bash
cd frontend && npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 8: Compose App.tsx**

Wire `CoffeeConveyor` with `SALENTINO_PLANS`, pass `SubscriptionDialog` as the detail view. Configure `autoplay={true}`, `speed={22}`. Add Google Fonts `Space Mono` in `index.html`.

- [ ] **Step 9: Build and verify locally**

```bash
cd frontend && npm run build && npm run preview
```

Open in browser. Verify: belt rotates, plans show correct names/prices/tiers, clicking opens dialog with form, form validation works, submit logs to console (no real backend yet).

- [ ] **Step 10: Commit**

```bash
git add frontend/
git commit -m "feat: conveyor belt subscription configurator with form and MP redirect"
```

---

### Task 4: Google Apps Script — Form Receiver

**Files:**
- Create: `apps-script/form-receiver/Code.gs` (doPost handler)
- Create: `apps-script/form-receiver/AirtableClient.gs` (Airtable API wrapper)
- Create: `apps-script/form-receiver/appsscript.json` (manifest)

**Interfaces:**
- Consumes: POST payload from Task 3 frontend: `{ email, fullName, phone, address, city, deliveryNotes, subscriptionType, plan, coffee, grind, frequency, price, mpPlanId }`
- Produces: Record in Airtable `Suscriptores` table with `Estado: "Pendiente de pago"`. Returns `{ status: "ok" }` as JSON.

- [ ] **Step 1: Write AirtableClient.gs**

Two functions:
- `findSubscriberByEmail(email: string)` — `GET /v0/{baseId}/Suscriptores?filterByFormula={Email}='{email}'`. Returns record or null.
- `upsertSubscriber(data: object)` — If subscriber exists by email, PATCH to update. If not, POST to create. Sets `Estado` to "Pendiente de pago", `Fecha de registro` to today.

Uses Script Properties for `AIRTABLE_PAT` and `AIRTABLE_BASE_ID`.

- [ ] **Step 2: Write doPost handler in Code.gs**

```javascript
function doPost(e) {
  const payload = JSON.parse(e.postData.contents);
  const record = {
    "Nombre": payload.fullName,
    "Email": payload.email,
    "Teléfono": payload.phone,
    "Dirección": payload.address,
    "Ciudad": payload.city || "Medellín",
    "Notas de entrega": payload.deliveryNotes || "",
    "Tipo de suscripción": payload.subscriptionType,
    "Plan": payload.plan,
    "Café elegido": payload.coffee || "Selección del tostador",
    "Molienda": payload.grind,
    "Frecuencia": payload.frequency,
    "Precio/envío": payload.price,
    "Estado": "Pendiente de pago",
    "MP Plan ID": payload.mpPlanId
  };
  upsertSubscriber(record);
  return ContentService.createTextOutput(JSON.stringify({ status: "ok" }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

Add CORS headers via `doOptions` for the Shopify-hosted frontend.

- [ ] **Step 3: Deploy as web app**

In Apps Script editor: Deploy → New deployment → Web app → Execute as: Me → Who has access: Anyone. Copy the deployment URL.

- [ ] **Step 4: Test with curl**

```bash
curl -X POST "https://script.google.com/macros/s/.../exec" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@salentino.co","fullName":"Test User","phone":"+573001234567","address":"Calle Test 123","city":"Medellín","subscriptionType":"Suministro","plan":"Familiar","coffee":"Caturra Lavado","grind":"V60","frequency":"Quincenal","price":105000,"mpPlanId":"suministro_1000_14"}'
```

Expected: `{"status":"ok"}`. Verify record appears in Airtable Suscriptores with `Estado: Pendiente de pago`.

- [ ] **Step 5: Wire frontend to Apps Script URL**

In `frontend/src/App.tsx`, set `APPS_SCRIPT_URL` to the deployed URL. Rebuild frontend. Test full flow: fill form → submit → record appears in Airtable → redirect to MP checkout URL.

- [ ] **Step 6: Commit**

```bash
git add apps-script/form-receiver/
git commit -m "feat: apps script form receiver - shopify to airtable"
```

---

### Task 5: Google Apps Script — MP Webhook Handler

**Files:**
- Create: `apps-script/webhook/Code.gs` (doPost handler for MP webhooks)
- Create: `apps-script/webhook/AirtableClient.gs` (reuse from Task 4 with additions)
- Create: `apps-script/webhook/Notify.gs` (email notification sender)
- Create: `apps-script/webhook/appsscript.json`

**Interfaces:**
- Consumes: MP webhook POST with `action: "payment.created"`, query param `data.id` (payment ID). MP REST API `GET /v1/payments/{id}` to fetch payment details.
- Produces: Record in Airtable `Despachos` table. Updates subscriber `Estado` to "Activo". Sends email notification to team.

- [ ] **Step 1: Write doPost handler**

```javascript
function doPost(e) {
  // 1. Parse webhook
  const params = e.parameter;
  const body = JSON.parse(e.postData.contents);
  const action = body.action || body.type;

  // Only process payment events
  if (!action || !action.includes("payment")) {
    return ok();
  }

  const paymentId = params["data.id"] || body.data?.id;
  if (!paymentId) return ok();

  // 2. Check idempotency: search Despachos for this MP Payment ID
  if (findDespachoByPaymentId(paymentId)) return ok();

  // 3. Fetch payment from MP API
  const payment = fetchPayment(paymentId);
  if (!payment || payment.status !== "approved") return ok();

  // 4. Match subscriber by email
  const subscriber = findSubscriberByEmail(payment.payer.email);

  if (subscriber) {
    createDespacho(subscriber, payment);
    updateSubscriberStatus(subscriber.id, "Activo");
    notifyTeam(subscriber, payment);
  } else {
    logException(payment);
    notifyException(payment);
  }

  return ok();
}
```

- [ ] **Step 2: Write AirtableClient.gs functions**

- `findDespachoByPaymentId(paymentId: string)` — search Despachos table by `MP Payment ID` field. Returns record or null.
- `createDespacho(subscriber, payment)` — POST to Despachos: link to subscriber, `Fecha de pago MP`, `Monto pagado`, `MP Payment ID`, `Estado despacho: "Por despachar"`.
- `updateSubscriberStatus(recordId, status)` — PATCH subscriber record's `Estado` field.
- `logException(payment)` — Create a Suscriptores record with `Estado: "Pendiente de pago"`, `Email` from payer, `Nombre` from payer name, `Notas de entrega: "EXCEPCIÓN: Pago sin pre-registro. MP Payment ID: {id}"`.

- [ ] **Step 3: Write fetchPayment function**

```javascript
function fetchPayment(paymentId) {
  const token = PropertiesService.getScriptProperties().getProperty("MP_ACCESS_TOKEN");
  const response = UrlFetchApp.fetch(
    `https://api.mercadopago.com/v1/payments/${paymentId}`,
    { headers: { "Authorization": `Bearer ${token}` }, muteHttpExceptions: true }
  );
  if (response.getResponseCode() !== 200) return null;
  return JSON.parse(response.getContentText());
}
```

- [ ] **Step 4: Write Notify.gs**

```javascript
function notifyTeam(subscriber, payment) {
  const fields = subscriber.fields;
  const subject = `NUEVO DESPACHO: ${fields["Nombre"]} - ${fields["Plan"]}`;
  const body = [
    "NUEVO DESPACHO SALENTINO",
    "",
    `Cliente: ${fields["Nombre"]}`,
    `Plan: ${fields["Tipo de suscripción"]} ${fields["Plan"]}`,
    `Molienda: ${fields["Molienda"]}`,
    `Dirección: ${fields["Dirección"]}, ${fields["Ciudad"]}`,
    `Teléfono: ${fields["Teléfono"]}`,
    `Monto: $${payment.transaction_amount.toLocaleString("es-CO")}`,
    "",
    `→ Ver en Airtable: https://airtable.com/${AIRTABLE_BASE_ID}`
  ].join("\n");

  MailApp.sendEmail({
    to: TEAM_EMAIL,
    subject: subject,
    body: body
  });
}

function notifyException(payment) {
  MailApp.sendEmail({
    to: TEAM_EMAIL,
    subject: `⚠ EXCEPCIÓN: Pago sin pre-registro - ${payment.payer.email}`,
    body: `Pago de $${payment.transaction_amount} recibido de ${payment.payer.email} pero no hay pre-registro en Airtable.\n\nMP Payment ID: ${payment.id}\n\nRevisar en Airtable → vista "Excepciones".`
  });
}
```

- [ ] **Step 5: Deploy as web app**

Separate Apps Script project for webhook (different from form receiver). Deploy → Web app → Execute as: Me → Who has access: Anyone. Copy URL.

- [ ] **Step 6: Configure MP webhook URL**

In Mercado Pago dashboard → Tus integraciones → Webhooks: add the Apps Script deployment URL. Select events: `payment`.

- [ ] **Step 7: Test idempotency manually**

Send the same curl request twice with the same `data.id`:

```bash
curl -X POST "https://script.google.com/.../exec?data.id=TEST123" \
  -H "Content-Type: application/json" \
  -d '{"action":"payment.created","data":{"id":"TEST123"}}'
```

First call: creates despacho + sends email. Second call: returns 200, no duplicate despacho.

- [ ] **Step 8: Commit**

```bash
git add apps-script/webhook/
git commit -m "feat: mp webhook handler with airtable dispatch and email notification"
```

---

### Task 6: Shopify Integration & End-to-End Test

**Files:**
- Modify: `frontend/src/App.tsx` (final APPS_SCRIPT_URL, production MP plan URLs)
- Create: `frontend/deploy.sh` (build + upload to Shopify or hosting)

**Interfaces:**
- Consumes: All outputs from Tasks 1–5 (Airtable base, MP plans, React app, both Apps Scripts)
- Produces: Live subscription page on salentino.co

- [ ] **Step 1: Build production frontend**

Update `frontend/src/data/plans.ts` with real `checkoutUrl` values from `mercadopago/plans-catalog.json`. Update `APPS_SCRIPT_URL` with production form receiver URL.

```bash
cd frontend && npm run build
```

- [ ] **Step 2: Embed in Shopify**

Option A (recommended for simplicity): Create a Shopify page "Suscripciones". In the page editor, add a Custom HTML block or Custom Liquid section with an iframe pointing to the hosted React app (deploy `dist/` to Vercel, Netlify, or Cloudflare Pages — all free tier).

Option B: Upload the built `dist/` assets to Shopify's Files section and reference them in a custom Liquid template.

- [ ] **Step 3: End-to-end test with real payment**

Full flow with a real (small amount) test plan:

1. Open salentino.co/suscripciones
2. Belt rotates, select "Suministro Medio"
3. Fill form: test name, real email, real phone, address
4. Click "Activar suscripción"
5. Verify: record appears in Airtable with "Pendiente de pago"
6. Complete MP checkout with test card
7. Verify: webhook fires, Airtable record updates to "Activo", dispatch card appears in kanban "Por despachar", email notification arrives

- [ ] **Step 4: Migrate existing clients**

- Contact GRID client: inform price improvement ($72K → $60K). Create their Airtable record. Cancel old MP plan, subscribe to `suministro_454_30` (or their current frequency).
- Contact Podio client: inform upgrade (340g → 454g, same price $90K for 3 months). Create `migration_podio_ritual` plan record. Set calendar reminder for 3-month price update.

- [ ] **Step 5: Commit final configuration**

```bash
git add frontend/ mercadopago/plans-catalog.json
git commit -m "feat: production deployment with real MP plans and shopify embed"
```

---

### Task 7: Product Photography & Brand Assets

**Files:**
- Create: `frontend/public/assets/plan-454g.webp`
- Create: `frontend/public/assets/plan-1kg.webp`
- Create: `frontend/public/assets/plan-2kg.webp`
- Create: `frontend/public/assets/plan-lab-250g.webp`
- Create: `frontend/public/assets/plan-lab-454g.webp`
- Create: `frontend/public/assets/plan-lab-2x250g.webp`

**Interfaces:**
- Consumes: Physical coffee bags/packaging
- Produces: 6 WebP images (800×800px, transparent background, top-down view) referenced by `SALENTINO_PLANS[].image`

- [ ] **Step 1: Photograph 6 product presentations**

Top-down (cenital) photo of each bag/presentation on white background. Each image should show the bag centered, filling ~70% of the frame.

- [ ] **Step 2: Edit to transparent background**

Remove background (remove.bg or Photoshop). Export as WebP, 800×800px, transparent canvas. Name files exactly as referenced in `plans.ts`.

- [ ] **Step 3: Replace placeholder images in frontend**

Drop files into `frontend/public/assets/`. Rebuild and verify belt shows real product photos.

- [ ] **Step 4: Commit**

```bash
git add frontend/public/assets/
git commit -m "feat: product photography for conveyor belt plans"
```
