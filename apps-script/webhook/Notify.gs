/**
 * Notification functions for the Webhook Handler.
 */

/**
 * Notify team about a new dispatch via email.
 * @param {Object} subscriber — subscriber object from findSubscriberByEmail
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
    "→ Ver en Google Sheets",
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
      + " pero no hay pre-registro en Google Sheets."
      + "\n\nMP Payment ID: " + payment.id
      + "\n\nRevisar en Google Sheets → vista \"Excepciones\".",
  });
}

/**
 * Send welcome email to new subscriber with their discount code.
 * @param {Object} subscriber — subscriber object from findSubscriberByEmail
 * @param {string} discountCode — Shopify discount code
 */
function sendWelcomeEmail(subscriber, discountCode) {
  var fields = subscriber.fields;
  var name = String(fields["Nombre"] || "").split(" ")[0];
  var email = fields["Email"];
  var plan = fields["Plan"] || "";
  var frequency = fields["Frecuencia"] || "";

  var subject = name + ", tu suscripción Salentino está activa";

  var htmlBody = '<!DOCTYPE html>'
    + '<html><head><meta charset="utf-8"></head>'
    + '<body style="margin:0;padding:0;background:#f9f4ed;font-family:Arial,Helvetica,sans-serif;">'
    + '<div style="max-width:560px;margin:0 auto;padding:40px 24px;">'

    // Logo / header
    + '<div style="text-align:center;margin-bottom:32px;">'
    + '<h1 style="font-family:\'Courier New\',monospace;font-size:28px;color:#0a0a0a;margin:0;">'
    + 'SALENTINO'
    + '</h1>'
    + '<p style="font-size:11px;letter-spacing:3px;color:rgba(10,10,10,0.45);margin:4px 0 0;">COFFEE LAB</p>'
    + '</div>'

    // Greeting
    + '<p style="font-size:16px;color:#0a0a0a;line-height:1.6;">'
    + 'Hola ' + name + ','
    + '</p>'
    + '<p style="font-size:16px;color:#0a0a0a;line-height:1.6;">'
    + 'Tu suscripción <strong>' + plan + '</strong> (' + frequency + ') está confirmada. '
    + 'Estamos preparando tu primer envío.'
    + '</p>'

    // Discount code box
    + '<div style="background:#ffffff;border:2px dashed #ec6e25;border-radius:12px;padding:24px;margin:28px 0;text-align:center;">'
    + '<p style="font-size:12px;letter-spacing:2px;color:rgba(10,10,10,0.45);margin:0 0 8px;">TU CÓDIGO DE SUSCRIPTOR</p>'
    + '<p style="font-family:\'Courier New\',monospace;font-size:28px;font-weight:bold;color:#ec6e25;margin:0 0 8px;letter-spacing:2px;">'
    + discountCode
    + '</p>'
    + '<p style="font-size:14px;color:#0a0a0a;margin:0;">'
    + '<strong>10% de descuento</strong> en todas tus compras en salentino.co'
    + '</p>'
    + '</div>'

    + '<p style="font-size:14px;color:rgba(10,10,10,0.65);line-height:1.6;">'
    + 'Usa este código cada vez que compres en nuestra tienda. Es exclusivo para suscriptores y no tiene fecha de vencimiento.'
    + '</p>'

    // What's next
    + '<div style="background:#ffffff;border-radius:12px;padding:20px;margin:24px 0;">'
    + '<p style="font-size:12px;letter-spacing:2px;color:rgba(10,10,10,0.45);margin:0 0 12px;">QUÉ SIGUE</p>'
    + '<p style="font-size:14px;color:#0a0a0a;line-height:1.6;margin:0 0 8px;">'
    + '1. Tostamos tu café en los próximos días<br>'
    + '2. Te enviamos el número de guía por email<br>'
    + '3. Recibes tu café fresco en la puerta de tu casa'
    + '</p>'
    + '</div>'

    + '<p style="font-size:14px;color:rgba(10,10,10,0.65);line-height:1.6;">'
    + 'Si tienes alguna pregunta, responde a este correo.'
    + '</p>'

    + '<p style="font-size:14px;color:#0a0a0a;line-height:1.6;">'
    + 'Nos vemos pronto,<br><strong>Equipo Salentino</strong>'
    + '</p>'

    // Footer
    + '<div style="border-top:1px solid rgba(10,10,10,0.12);margin-top:32px;padding-top:16px;text-align:center;">'
    + '<p style="font-size:11px;color:rgba(10,10,10,0.35);">'
    + 'Salentino Coffee Lab · Medellín, Colombia'
    + '</p>'
    + '</div>'

    + '</div></body></html>';

  MailApp.sendEmail({
    to: email,
    subject: subject,
    htmlBody: htmlBody,
    replyTo: TEAM_EMAIL,
  });
}
