/**
 * Form Receiver — Google Apps Script Web App
 *
 * Receives POST from the Salentino subscription frontend,
 * writes/updates subscriber data in Airtable.
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
    };

    upsertSubscriber(record);

    return ContentService.createTextOutput(JSON.stringify({ status: "ok" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: "error", message: err.message })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle OPTIONS requests for CORS preflight.
 * @returns {TextOutput} Empty response with CORS headers
 */
function doOptions() {
  var output = ContentService.createTextOutput("");
  return output;
}

/**
 * Convert numeric frequency to label.
 * @param {number|string} freq
 * @returns {string}
 */
function _frequencyLabel(freq) {
  var map = { 7: "Semanal", 14: "Quincenal", 30: "Mensual" };
  return map[freq] || String(freq);
}
