/**
 * Airtable API client for the Webhook Handler.
 *
 * Script Properties required:
 *   AIRTABLE_PAT     — Personal Access Token
 *   AIRTABLE_BASE_ID — Base ID (starts with "app...")
 *   TEAM_EMAIL       — Team notification email
 */

var PROPS = PropertiesService.getScriptProperties();
var AIRTABLE_PAT = PROPS.getProperty("AIRTABLE_PAT");
var AIRTABLE_BASE_ID = PROPS.getProperty("AIRTABLE_BASE_ID");
var BASE_URL = "https://api.airtable.com/v0/" + AIRTABLE_BASE_ID;
var TEAM_EMAIL = PROPS.getProperty("TEAM_EMAIL") || "team@salentino.co";

/**
 * Find a subscriber record by email.
 * @param {string} email
 * @returns {Object|null}
 */
function findSubscriberByEmail(email) {
  var safeEmail = String(email).replace(/'/g, "\\'");
  var url = BASE_URL + "/Suscriptores"
    + "?filterByFormula=" + encodeURIComponent("{Email}='" + safeEmail + "'")
    + "&maxRecords=1";

  var response = UrlFetchApp.fetch(url, {
    headers: { "Authorization": "Bearer " + AIRTABLE_PAT },
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() !== 200) return null;

  var data = JSON.parse(response.getContentText());
  return data.records && data.records.length > 0 ? data.records[0] : null;
}

/**
 * Find a dispatch record by MP Payment ID (idempotency check).
 * @param {string} paymentId
 * @returns {Object|null}
 */
function findDespachoByPaymentId(paymentId) {
  var safeId = String(paymentId).replace(/'/g, "\\'");
  var url = BASE_URL + "/Despachos"
    + "?filterByFormula=" + encodeURIComponent("{MP Payment ID}='" + safeId + "'")
    + "&maxRecords=1";

  var response = UrlFetchApp.fetch(url, {
    headers: { "Authorization": "Bearer " + AIRTABLE_PAT },
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() !== 200) return null;

  var data = JSON.parse(response.getContentText());
  return data.records && data.records.length > 0 ? data.records[0] : null;
}

/**
 * Create a dispatch record linked to a subscriber.
 * @param {Object} subscriber — Airtable subscriber record
 * @param {Object} payment — MP payment object
 */
function createDespacho(subscriber, payment) {
  var fields = {
    "Suscriptor": [subscriber.id],
    "Fecha de pago MP": new Date(payment.date_approved || payment.date_created).toISOString().split("T")[0],
    "Monto pagado": payment.transaction_amount,
    "MP Payment ID": String(payment.id),
    "Estado despacho": "Por despachar",
  };

  var response = UrlFetchApp.fetch(BASE_URL + "/Despachos", {
    method: "post",
    headers: {
      "Authorization": "Bearer " + AIRTABLE_PAT,
      "Content-Type": "application/json",
    },
    payload: JSON.stringify({ fields: fields }),
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() !== 200) {
    throw new Error("Failed to create despacho: " + response.getContentText());
  }
}

/**
 * Update subscriber status.
 * @param {string} recordId
 * @param {string} status
 */
function updateSubscriberStatus(recordId, status) {
  var response = UrlFetchApp.fetch(BASE_URL + "/Suscriptores/" + recordId, {
    method: "patch",
    headers: {
      "Authorization": "Bearer " + AIRTABLE_PAT,
      "Content-Type": "application/json",
    },
    payload: JSON.stringify({ fields: { "Estado": status } }),
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() !== 200) {
    console.error("Failed to update subscriber status: " + response.getContentText());
  }
}

/**
 * Log an exception: payment received but no matching subscriber.
 * Creates a subscriber record with exception note.
 * @param {Object} payment — MP payment object
 */
function logException(payment) {
  var fields = {
    "Nombre": (payment.payer.first_name || "") + " " + (payment.payer.last_name || ""),
    "Email": payment.payer.email || "desconocido@exception.local",
    "Estado": "Pendiente de pago",
    "Notas de entrega": "EXCEPCIÓN: Pago sin pre-registro. MP Payment ID: " + payment.id
      + ". Monto: $" + payment.transaction_amount,
    "Fecha de registro": new Date().toISOString().split("T")[0],
  };

  UrlFetchApp.fetch(BASE_URL + "/Suscriptores", {
    method: "post",
    headers: {
      "Authorization": "Bearer " + AIRTABLE_PAT,
      "Content-Type": "application/json",
    },
    payload: JSON.stringify({ fields: fields }),
    muteHttpExceptions: true,
  });
}
