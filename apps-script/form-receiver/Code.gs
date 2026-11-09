/**
 * Form Receiver — Google Apps Script Web App
 *
 * Receives POST from the Salentino subscription frontend,
 * writes/updates subscriber data in Google Sheets.
 *
 * Deploy as: Web app → Execute as: Me → Access: Anyone
 */

/**
 * Handle POST requests from the subscription form.
 * @param {Object} e — Apps Script event object
 * @returns {TextOutput} JSON response
 */
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);

    // Server-side validation
    var validationError = _validatePayload(payload);
    if (validationError) {
      return ContentService.createTextOutput(
        JSON.stringify({ status: "error", message: validationError })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    var record = {
      "Nombre": payload.fullName || "",
      "Email": payload.email || "",
      "Teléfono": payload.phone || "",
      "Dirección": payload.address || "",
      "Ciudad": payload.city || "Medellín",
      "Notas de entrega": payload.deliveryNotes || "",
      "Tipo de suscripción": payload.subscriptionType || "",
      "Plan": payload.plan || "",
      "Café elegido": payload.coffee || "Selección del tostador",
      "Molienda": payload.grind || "",
      "Frecuencia": _frequencyLabel(payload.frequency),
      "Precio/envío": payload.price || 0,
      "Estado": "Pendiente de pago",
      "MP Plan ID": payload.mpPlanId || "",
      "NIT": payload.billingNit || "",
      "Razón social": payload.billingName || "",
      "Email factura": payload.billingEmail || "",
    };

    var isNew = findSubscriberByEmail(payload.email) === null;

    upsertSubscriber(record);

    if (isNew) {
      try {
        _notifyNewRegistration(record);
      } catch (mailErr) {
        console.error("Email notification failed: " + mailErr.message);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "ok" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    console.error("doPost error: " + err.message);
    return ContentService.createTextOutput(
      JSON.stringify({ status: "error", message: "Error procesando suscripción" })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Send email notification when a new subscriber registers (pre-payment).
 * @param {Object} record — Airtable-ready record object
 */
function _notifyNewRegistration(record) {
  var props = PropertiesService.getScriptProperties();
  var teamEmail = props.getProperty("TEAM_EMAIL");
  if (!teamEmail) {
    console.error("TEAM_EMAIL not configured in Script Properties");
    return;
  }

  var subject = "NUEVO PRE-REGISTRO: " + record["Nombre"] + " — " + record["Plan"];

  var body = [
    "Nuevo pre-registro de suscripción recibido:",
    "",
    "Nombre: " + record["Nombre"],
    "Plan: " + record["Plan"],
    "Tipo de suscripción: " + record["Tipo de suscripción"],
    "Café elegido: " + record["Café elegido"],
    "Molienda: " + record["Molienda"],
    "Frecuencia: " + record["Frecuencia"],
    "Precio: " + record["Precio/envío"],
    "Ciudad: " + record["Ciudad"],
    "Dirección: " + record["Dirección"],
    "Teléfono: " + record["Teléfono"],
    "Email: " + record["Email"],
    "",
    "---",
    "Este cliente aún no ha pagado. El despacho se crea cuando MercadoPago confirme el pago.",
  ].join("\n");

  MailApp.sendEmail(teamEmail, subject, body);
}

/**
 * Convert numeric frequency to label.
 * @param {number|string} freq
 * @returns {string}
 */
function _frequencyLabel(freq) {
  var map = { 15: "Quincenal", 30: "Mensual" };
  return map[freq] || String(freq);
}

/**
 * Validate incoming payload fields.
 * @param {Object} payload
 * @returns {string|null} Error message or null if valid
 */
function _validatePayload(payload) {
  if (!payload.email || payload.email.indexOf("@") === -1) {
    return "Email inválido";
  }
  if (!payload.fullName || payload.fullName.length < 3) {
    return "Nombre requerido (mínimo 3 caracteres)";
  }
  if (!payload.phone || payload.phone.length < 7) {
    return "Teléfono requerido (mínimo 7 dígitos)";
  }

  var validTypes = ["Café de Diario", "Ediciones Especiales"];
  if (validTypes.indexOf(payload.subscriptionType) === -1) {
    return "Tipo de suscripción inválido";
  }

  var validPlans = [
    "454 g",
    "1 kg",
    "1 bolsa",
    "2 bolsas",
  ];
  if (validPlans.indexOf(payload.plan) === -1) {
    return "Plan inválido";
  }

  var validGrinds = ["Grano entero", "Prensa", "Aeropress", "Cafetera", "V60 / filtro", "Espresso"];
  if (validGrinds.indexOf(payload.grind) === -1) {
    return "Molienda inválida";
  }

  var validFrequencies = [15, 30, "15", "30", "Quincenal", "Mensual"];
  if (validFrequencies.indexOf(payload.frequency) === -1) {
    return "Frecuencia inválida";
  }

  return null;
}
