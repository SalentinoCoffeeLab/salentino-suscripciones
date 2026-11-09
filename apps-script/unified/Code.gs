/**
 * Unified Apps Script — Form Receiver + MP Webhook
 *
 * Single doPost routes between:
 *   1. Subscription form submissions (from frontend)
 *   2. Mercado Pago payment webhooks
 *
 * Deploy as: Web app → Execute as: Me → Access: Anyone
 *
 * Script Properties required:
 *   TEAM_EMAIL      — Team notification email
 *   MP_ACCESS_TOKEN — Mercado Pago access token
 *   DISCOUNT_CODE   — Generic discount code (e.g. SUSCRIPTOR10)
 */

/* ══════════════════════════════════════════
   ROUTER
   ══════════════════════════════════════════ */

function doPost(e) {
  try {
    var body = {};
    if (e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }

    // MP webhooks have "action" or "type" with "payment" in them
    var action = body.action || body.type || "";
    if (action && action.indexOf("payment") !== -1) {
      return _handleWebhook(e, body);
    }

    // Everything else is a form submission
    return _handleForm(body);
  } catch (err) {
    console.error("doPost error: " + err.message);
    return ContentService.createTextOutput(
      JSON.stringify({ status: "error", message: "Error interno" })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput("OK")
    .setMimeType(ContentService.MimeType.TEXT);
}

/* ══════════════════════════════════════════
   FORM RECEIVER
   ══════════════════════════════════════════ */

function _handleForm(payload) {
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

  var existing = findSubscriberByEmail(payload.email);
  var currentStatus = existing ? String(existing.fields["Estado"] || "") : "";

  // Una fila que ya tiene un pago (Activo, Pausado o Excepción) nunca se reescribe
  // desde el formulario: el endpoint es público y cualquiera que conozca el email
  // podría cambiar la dirección o devolverla a "Pendiente de pago".
  // Se avisa al equipo con los datos nuevos para que decida.
  if (existing && PROTECTED_STATUSES.indexOf(currentStatus) !== -1) {
    try { _notifyChangeRequest(record, existing); }
    catch (mailErr) { console.error("Change request email failed: " + mailErr.message); }
    return ContentService.createTextOutput(JSON.stringify({ status: "ok" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  upsertSubscriber(record);

  if (!existing) {
    try { _notifyNewRegistration(record); }
    catch (mailErr) { console.error("Email notification failed: " + mailErr.message); }
  }

  return ContentService.createTextOutput(JSON.stringify({ status: "ok" }))
    .setMimeType(ContentService.MimeType.JSON);
}

var PROTECTED_STATUSES = ["Activo", "Pausado", "Excepción"];

function _notifyChangeRequest(record, existing) {
  var teamEmail = _PROPS.getProperty("TEAM_EMAIL");
  if (!teamEmail) return;

  var f = existing.fields;
  MailApp.sendEmail(teamEmail,
    "REVISAR: " + record["Email"] + " ya tiene una suscripción (" + f["Estado"] + ")",
    [
      "Alguien llenó el formulario con un email que ya tiene una suscripción en estado «" + f["Estado"] + "».",
      "La fila del Sheet NO se modificó. Si es un cambio real, actualízala a mano.",
      "Ojo: si además paga en Mercado Pago, quedará con DOS suscripciones activas.",
      "",
      "DATOS NUEVOS DEL FORMULARIO",
      "Nombre: " + record["Nombre"],
      "Teléfono: " + record["Teléfono"],
      "Dirección: " + record["Dirección"] + ", " + record["Ciudad"],
      "Plan: " + record["Tipo de suscripción"] + " / " + record["Plan"],
      "Molienda: " + record["Molienda"],
      "Frecuencia: " + record["Frecuencia"],
      "Notas: " + record["Notas de entrega"],
      "",
      "DATOS ACTUALES EN EL SHEET (fila " + existing.row + ")",
      "Nombre: " + (f["Nombre"] || ""),
      "Teléfono: " + (f["Teléfono"] || ""),
      "Dirección: " + (f["Dirección"] || "") + ", " + (f["Ciudad"] || ""),
      "Plan: " + (f["Tipo de suscripción"] || "") + " / " + (f["Plan"] || ""),
      "Molienda: " + (f["Molienda"] || ""),
      "Frecuencia: " + (f["Frecuencia"] || ""),
    ].join("\n")
  );
}

function _validatePayload(payload) {
  if (!payload.email || payload.email.indexOf("@") === -1) return "Email inválido";
  if (!payload.fullName || payload.fullName.length < 3) return "Nombre requerido (mínimo 3 caracteres)";
  if (!payload.phone || payload.phone.length < 7) return "Teléfono requerido (mínimo 7 dígitos)";

  var validTypes = ["Café de Diario", "Ediciones Especiales"];
  if (validTypes.indexOf(payload.subscriptionType) === -1) return "Tipo de suscripción inválido";

  var validPlans = ["454 g", "1 kg", "1 bolsa", "2 bolsas"];
  if (validPlans.indexOf(payload.plan) === -1) return "Plan inválido";

  var validGrinds = ["Grano entero", "Prensa", "Aeropress", "Cafetera", "V60 / filtro", "Espresso"];
  if (validGrinds.indexOf(payload.grind) === -1) return "Molienda inválida";

  var validFrequencies = [15, 30, "15", "30", "Quincenal", "Mensual"];
  if (validFrequencies.indexOf(payload.frequency) === -1) return "Frecuencia inválida";

  return null;
}

function _frequencyLabel(freq) {
  var map = { 15: "Quincenal", 30: "Mensual" };
  return map[freq] || String(freq);
}

function _notifyNewRegistration(record) {
  var teamEmail = _PROPS.getProperty("TEAM_EMAIL");
  if (!teamEmail) return;

  MailApp.sendEmail(teamEmail,
    "NUEVO PRE-REGISTRO: " + record["Nombre"] + " — " + record["Plan"],
    [
      "Nuevo pre-registro de suscripción:",
      "",
      "Nombre: " + record["Nombre"],
      "Plan: " + record["Plan"],
      "Tipo: " + record["Tipo de suscripción"],
      "Café: " + record["Café elegido"],
      "Molienda: " + record["Molienda"],
      "Frecuencia: " + record["Frecuencia"],
      "Precio/envío: $" + record["Precio/envío"],
      "Ciudad: " + record["Ciudad"],
      "Dirección: " + record["Dirección"],
      "Teléfono: " + record["Teléfono"],
      "Email: " + record["Email"],
      "",
      "---",
      "Pendiente de pago. El despacho se crea cuando MP confirme.",
    ].join("\n")
  );
}

/* ══════════════════════════════════════════
   MP WEBHOOK
   ══════════════════════════════════════════ */

function _handleWebhook(e, body) {
  var params = e.parameter || {};
  var paymentId = params["data.id"] || (body.data && body.data.id);
  if (!paymentId) return _ok();

  paymentId = String(paymentId);

  // Idempotency: skip if already processed
  if (findDespachoByPaymentId(paymentId)) return _ok();

  // Verify payment with MP API
  var payment = _fetchPayment(paymentId);
  if (!payment || payment.status !== "approved") return _ok();

  var payerEmail = payment.payer && payment.payer.email;
  if (!payerEmail) return _ok();

  var subscriber = findSubscriberByEmail(payerEmail);

  if (subscriber) {
    // Un cobro mensual de un plan quincenal paga DOS entregas: se crean dos filas
    // en Despachos (la segunda, 15 días después). Las dos llevan el mismo
    // MP Payment ID, así que un webhook repetido no las duplica.
    var schedule = _deliverySchedule(subscriber, payment);
    for (var i = 0; i < schedule.length; i++) {
      createDespacho(subscriber, payment, schedule[i]);
    }
    updateSubscriberStatus(subscriber.row, "Activo");
    _notifyTeamDespacho(subscriber, payment, schedule);

    // First payment: send welcome email with discount code
    if (!subscriber.fields["Código descuento"]) {
      try {
        var code = _PROPS.getProperty("DISCOUNT_CODE") || "SUSCRIPTOR10";
        saveDiscountCode(subscriber.row, code);
        _sendWelcomeEmail(subscriber, code);
      } catch (err) {
        console.error("Welcome email error: " + err.message);
      }
    }
  } else {
    // Payment without pre-registration
    _logException(payment);
    _notifyException(payment);
  }

  return _ok();
}

/**
 * Entregas que paga un cobro. Mensual: 1. Quincenal: 2 (hoy y +15 días),
 * porque los planes quincenales de MP cobran el mes completo de una vez.
 */
function _deliverySchedule(subscriber, payment) {
  var paid = new Date(payment.date_approved || payment.date_created);
  var freq = String(subscriber.fields["Frecuencia"] || "").toLowerCase();
  if (freq !== "quincenal" && freq !== "15") {
    return [{ date: paid, note: "" }];
  }
  var second = new Date(paid.getTime() + 15 * 24 * 60 * 60 * 1000);
  return [
    { date: paid, note: "Entrega 1 de 2 · despachar ya" },
    { date: second, withoutAmount: true,
      note: "Entrega 2 de 2 · NO despachar antes del " + _dateBogota(second) + " · pagada con el cobro del " + _dateBogota(paid) },
  ];
}

function _dateBogota(date) {
  return Utilities.formatDate(date, "America/Bogota", "yyyy-MM-dd");
}

function _fetchPayment(paymentId) {
  var token = _PROPS.getProperty("MP_ACCESS_TOKEN");
  if (!token) { console.error("MP_ACCESS_TOKEN not set"); return null; }

  var res = UrlFetchApp.fetch(
    "https://api.mercadopago.com/v1/payments/" + paymentId,
    { headers: { "Authorization": "Bearer " + token }, muteHttpExceptions: true }
  );
  if (res.getResponseCode() !== 200) return null;
  return JSON.parse(res.getContentText());
}

function _ok() {
  return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
}

/* ══════════════════════════════════════════
   WEBHOOK NOTIFICATIONS
   ══════════════════════════════════════════ */

function _notifyTeamDespacho(subscriber, payment, schedule) {
  var f = subscriber.fields;
  var teamEmail = _PROPS.getProperty("TEAM_EMAIL");
  if (!teamEmail) return;

  var deliveries = [];
  if (schedule && schedule.length > 1) {
    deliveries.push("", "ESTE COBRO PAGA " + schedule.length + " ENTREGAS:");
    for (var i = 0; i < schedule.length; i++) deliveries.push("· " + schedule[i].note);
  }

  MailApp.sendEmail({
    to: teamEmail,
    subject: "NUEVO DESPACHO: " + f["Nombre"] + " — " + f["Plan"],
    body: [
      "PAGO CONFIRMADO — DESPACHAR",
      "",
      "Cliente: " + f["Nombre"],
      "Plan: " + (f["Tipo de suscripción"] || "") + " / " + (f["Plan"] || ""),
      "Café: " + (f["Café elegido"] || "N/A"),
      "Molienda: " + (f["Molienda"] || "N/A"),
      "Frecuencia: " + (f["Frecuencia"] || "N/A"),
      "Dirección: " + (f["Dirección"] || "") + ", " + (f["Ciudad"] || ""),
      "Teléfono: " + (f["Teléfono"] || ""),
      "Monto pagado: $" + (payment.transaction_amount || 0),
      "MP Payment ID: " + payment.id,
    ].concat(deliveries, [
      "",
      "→ Abrir Google Sheet para marcar como despachado",
    ]).join("\n"),
  });
}

function _notifyException(payment) {
  var teamEmail = _PROPS.getProperty("TEAM_EMAIL");
  if (!teamEmail) return;

  var payerEmail = (payment.payer && payment.payer.email) || "desconocido";

  MailApp.sendEmail({
    to: teamEmail,
    subject: "⚠ PAGO SIN PRE-REGISTRO: " + payerEmail,
    body: "Pago de $" + (payment.transaction_amount || 0)
      + " de " + payerEmail
      + " pero NO hay pre-registro en el Sheet."
      + "\n\nMP Payment ID: " + payment.id
      + "\n\nRevisar manualmente.",
  });
}

function _sendWelcomeEmail(subscriber, discountCode) {
  var f = subscriber.fields;
  var name = String(f["Nombre"] || "").split(" ")[0];
  var email = f["Email"];
  var plan = f["Plan"] || "";
  var freq = f["Frecuencia"] || "";
  var teamEmail = _PROPS.getProperty("TEAM_EMAIL") || "";

  var html = '<!DOCTYPE html>'
    + '<html><head><meta charset="utf-8"></head>'
    + '<body style="margin:0;padding:0;background:#f9f4ed;font-family:Arial,Helvetica,sans-serif;">'
    + '<div style="max-width:560px;margin:0 auto;padding:40px 24px;">'

    + '<div style="text-align:center;margin-bottom:32px;">'
    + '<h1 style="font-family:\'Courier New\',monospace;font-size:28px;color:#0a0a0a;margin:0;">SALENTINO</h1>'
    + '<p style="font-size:11px;letter-spacing:3px;color:rgba(10,10,10,0.45);margin:4px 0 0;">COFFEE LAB</p>'
    + '</div>'

    + '<p style="font-size:16px;color:#0a0a0a;line-height:1.6;">Hola ' + name + ',</p>'
    + '<p style="font-size:16px;color:#0a0a0a;line-height:1.6;">'
    + 'Tu suscripción <strong>' + plan + '</strong> (' + freq + ') está confirmada. '
    + 'Estamos preparando tu primer envío.</p>'

    + '<div style="background:#ffffff;border:2px dashed #ec6e25;border-radius:12px;padding:24px;margin:28px 0;text-align:center;">'
    + '<p style="font-size:12px;letter-spacing:2px;color:rgba(10,10,10,0.45);margin:0 0 8px;">TU CÓDIGO DE SUSCRIPTOR</p>'
    + '<p style="font-family:\'Courier New\',monospace;font-size:28px;font-weight:bold;color:#ec6e25;margin:0 0 8px;letter-spacing:2px;">'
    + discountCode + '</p>'
    + '<p style="font-size:14px;color:#0a0a0a;margin:0;"><strong>10% de descuento</strong> en pedidos adicionales</p>'
    + '</div>'

    + '<p style="font-size:14px;color:rgba(10,10,10,0.65);line-height:1.6;">'
    + 'Usa este código en tus próximas compras. Es exclusivo para suscriptores.</p>'

    + '<div style="background:#ffffff;border-radius:12px;padding:20px;margin:24px 0;">'
    + '<p style="font-size:12px;letter-spacing:2px;color:rgba(10,10,10,0.45);margin:0 0 12px;">QUÉ SIGUE</p>'
    + '<p style="font-size:14px;color:#0a0a0a;line-height:1.6;margin:0;">'
    + '1. Tostamos tu café en los próximos días<br>'
    + '2. Te avisamos por WhatsApp cuando sale tu pedido<br>'
    + '3. Recibes café fresco en la puerta de tu casa</p>'
    + '</div>'

    + '<p style="font-size:14px;color:rgba(10,10,10,0.65);line-height:1.6;">'
    + 'Si tienes alguna pregunta, responde a este correo.</p>'
    + '<p style="font-size:14px;color:#0a0a0a;line-height:1.6;">'
    + 'Nos vemos pronto,<br><strong>Equipo Salentino</strong></p>'

    + '<div style="border-top:1px solid rgba(10,10,10,0.12);margin-top:32px;padding-top:16px;text-align:center;">'
    + '<p style="font-size:11px;color:rgba(10,10,10,0.35);">Salentino Coffee Lab · Medellín, Colombia</p>'
    + '</div>'

    + '</div></body></html>';

  MailApp.sendEmail({
    to: email,
    subject: name + ", tu suscripción Salentino está activa ☕",
    htmlBody: html,
    replyTo: teamEmail,
  });
}

function _logException(payment) {
  var sheet = _getSheet("Suscriptores");
  if (!sheet) return;

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var fields = {
    "Nombre": ((payment.payer.first_name || "") + " " + (payment.payer.last_name || "")).trim(),
    "Email": payment.payer.email || "desconocido",
    "Estado": "Excepción",
    "Notas de entrega": "PAGO SIN PRE-REGISTRO. MP ID: " + payment.id + ". Monto: $" + payment.transaction_amount,
    "Fecha de registro": new Date().toISOString().split("T")[0],
  };

  var row = headers.map(function(h) { return fields[h] !== undefined ? fields[h] : ""; });
  sheet.appendRow(row);
}
