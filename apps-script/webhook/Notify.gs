/**
 * Notification functions for the Webhook Handler.
 */

/**
 * Notify team about a new dispatch via email.
 * @param {Object} subscriber — Airtable subscriber record
 * @param {Object} payment — MP payment object
 */
function notifyTeam(subscriber, payment) {
  var fields = subscriber.fields;
  var subject = "NUEVO DESPACHO: " + fields["Nombre"] + " - " + fields["Plan"];
  var body = [
    "NUEVO DESPACHO SALENTINO",
    "",
    "Cliente: " + fields["Nombre"],
    "Plan: " + (fields["Tipo de suscripción"] || "") + " " + (fields["Plan"] || ""),
    "Café: " + (fields["Café elegido"] || "N/A"),
    "Molienda: " + (fields["Molienda"] || "N/A"),
    "Frecuencia: " + (fields["Frecuencia"] || "N/A"),
    "Dirección: " + (fields["Dirección"] || "") + ", " + (fields["Ciudad"] || ""),
    "Teléfono: " + (fields["Teléfono"] || ""),
    "Monto: $" + (payment.transaction_amount || 0).toLocaleString("es-CO"),
    "",
    "→ Ver en Airtable: https://airtable.com/" + AIRTABLE_BASE_ID,
  ].join("\n");

  MailApp.sendEmail({
    to: TEAM_EMAIL,
    subject: subject,
    body: body,
  });
}

/**
 * Notify team about an exception (payment without pre-registration).
 * @param {Object} payment — MP payment object
 */
function notifyException(payment) {
  var payerEmail = (payment.payer && payment.payer.email) || "desconocido";
  var amount = payment.transaction_amount || 0;

  MailApp.sendEmail({
    to: TEAM_EMAIL,
    subject: "EXCEPCIÓN: Pago sin pre-registro - " + payerEmail,
    body: "Pago de $" + amount.toLocaleString("es-CO")
      + " recibido de " + payerEmail
      + " pero no hay pre-registro en Airtable."
      + "\n\nMP Payment ID: " + payment.id
      + "\n\nRevisar en Airtable → vista \"Excepciones\".",
  });
}
