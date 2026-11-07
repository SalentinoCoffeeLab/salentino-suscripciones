/**
 * Webhook Handler — Google Apps Script Web App
 *
 * Receives Mercado Pago payment webhooks, matches subscriber by email,
 * creates dispatch record in Airtable, and notifies the team.
 *
 * Deploy as: Web app → Execute as: Me → Access: Anyone
 *
 * Script Properties required:
 *   MP_ACCESS_TOKEN  — Mercado Pago access token
 *   AIRTABLE_PAT     — Airtable Personal Access Token
 *   AIRTABLE_BASE_ID — Airtable Base ID
 *   TEAM_EMAIL       — Team notification email
 */

/**
 * Handle POST requests from Mercado Pago webhooks.
 * @param {Object} e — Apps Script event object
 * @returns {TextOutput} HTTP 200 response
 */
function doPost(e) {
  try {
    var params = e.parameter || {};
    var body = {};

    if (e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }

    var action = body.action || body.type || "";

    // Only process payment events
    if (!action || action.indexOf("payment") === -1) {
      return _ok();
    }

    var paymentId = params["data.id"] || (body.data && body.data.id);
    if (!paymentId) return _ok();

    paymentId = String(paymentId);

    // Idempotency check: if dispatch already exists, skip
    if (findDespachoByPaymentId(paymentId)) {
      return _ok();
    }

    // Fetch payment details from MP API
    var payment = fetchPayment(paymentId);
    if (!payment || payment.status !== "approved") {
      return _ok();
    }

    // Match subscriber by payer email
    var payerEmail = payment.payer && payment.payer.email;
    if (!payerEmail) return _ok();

    var subscriber = findSubscriberByEmail(payerEmail);

    if (subscriber) {
      createDespacho(subscriber, payment);
      updateSubscriberStatus(subscriber.id, "Activo");
      notifyTeam(subscriber, payment);
    } else {
      logException(payment);
      notifyException(payment);
    }
  } catch (err) {
    // Log error but always return 200 to prevent MP retries
    console.error("Webhook error: " + err.message);
  }

  return _ok();
}

/**
 * Fetch payment details from Mercado Pago API.
 * @param {string} paymentId
 * @returns {Object|null}
 */
function fetchPayment(paymentId) {
  var token = PropertiesService.getScriptProperties().getProperty("MP_ACCESS_TOKEN");
  var response = UrlFetchApp.fetch(
    "https://api.mercadopago.com/v1/payments/" + paymentId,
    {
      headers: { "Authorization": "Bearer " + token },
      muteHttpExceptions: true,
    }
  );

  if (response.getResponseCode() !== 200) return null;
  return JSON.parse(response.getContentText());
}

/**
 * Return HTTP 200 OK response.
 * @returns {TextOutput}
 */
function _ok() {
  return ContentService.createTextOutput("OK")
    .setMimeType(ContentService.MimeType.TEXT);
}
