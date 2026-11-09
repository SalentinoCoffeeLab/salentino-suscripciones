/**
 * Google Sheets client — shared by Form Receiver + Webhook.
 *
 * Uses getActiveSpreadsheet() (bound script).
 *
 * Tabs:
 *   "Suscriptores" — subscriber records
 *   "Despachos"    — dispatch records (one per payment)
 */

var _PROPS = PropertiesService.getScriptProperties();

function _getSheet(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

/* ── Suscriptores ── */

function findSubscriberByEmail(email) {
  var sheet = _getSheet("Suscriptores");
  if (!sheet) return null;

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return null;

  var headers = data[0];
  var emailCol = headers.indexOf("Email");
  if (emailCol === -1) return null;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][emailCol]).toLowerCase() === String(email).toLowerCase()) {
      var fields = {};
      for (var j = 0; j < headers.length; j++) {
        fields[headers[j]] = data[i][j];
      }
      return { row: i + 1, fields: fields };
    }
  }
  return null;
}

function upsertSubscriber(fields) {
  var sheet = _getSheet("Suscriptores");
  if (!sheet) throw new Error("Sheet 'Suscriptores' not found");

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var existing = findSubscriberByEmail(fields["Email"]);

  if (existing) {
    var rowValues = headers.map(function(h) {
      return fields[h] !== undefined ? fields[h] : existing.fields[h];
    });
    sheet.getRange(existing.row, 1, 1, headers.length).setValues([rowValues]);
  } else {
    fields["Fecha de registro"] = new Date().toISOString().split("T")[0];
    var rowValues = headers.map(function(h) {
      return fields[h] !== undefined ? fields[h] : "";
    });
    sheet.appendRow(rowValues);
  }
}

function updateSubscriberStatus(row, status) {
  var sheet = _getSheet("Suscriptores");
  if (!sheet) return;

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var col = headers.indexOf("Estado");
  if (col === -1) return;

  sheet.getRange(row, col + 1).setValue(status);
}

function saveDiscountCode(row, code) {
  var sheet = _getSheet("Suscriptores");
  if (!sheet) return;

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var col = headers.indexOf("Código descuento");
  if (col === -1) return;

  sheet.getRange(row, col + 1).setValue(code);
}

/* ── Despachos ── */

function findDespachoByPaymentId(paymentId) {
  var sheet = _getSheet("Despachos");
  if (!sheet) return null;

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return null;

  var headers = data[0];
  var pidCol = headers.indexOf("MP Payment ID");
  if (pidCol === -1) return null;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][pidCol]) === String(paymentId)) {
      return { row: i + 1 };
    }
  }
  return null;
}

/**
 * @param delivery {date, note} — fecha desde la que se despacha y nota visible
 *   para el equipo ("Entrega 2 de 2 · NO despachar antes del …"). Opcional.
 */
function createDespacho(subscriber, payment, delivery) {
  var sheet = _getSheet("Despachos");
  if (!sheet) throw new Error("Sheet 'Despachos' not found");

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var paidOn = _dateBogota(new Date(payment.date_approved || payment.date_created));
  var note = (delivery && delivery.note) || "";

  // Solo se escriben las columnas que existan en la hoja. "Fecha de pago" y
  // "Fecha de pago MP" van las dos porque la guía de montaje usa la segunda.
  var fields = {
    "Suscriptor Email": subscriber.fields["Email"],
    "Nombre": subscriber.fields["Nombre"],
    "Plan": subscriber.fields["Plan"],
    "Molienda": subscriber.fields["Molienda"],
    "Dirección": (subscriber.fields["Dirección"] || "") + ", " + (subscriber.fields["Ciudad"] || ""),
    "Teléfono": subscriber.fields["Teléfono"],
    "Fecha de pago": paidOn,
    "Fecha de pago MP": paidOn,
    // La 2.ª entrega del quincenal va sin monto: el cobro ya está en la 1.ª fila
    // y así la suma de la columna sigue cuadrando con lo cobrado.
    "Monto pagado": (delivery && delivery.withoutAmount) ? "" : payment.transaction_amount,
    "MP Payment ID": String(payment.id),
    "Estado despacho": "Por despachar",
    "Notas": note,
  };

  var row = headers.map(function(h) { return fields[h] !== undefined ? fields[h] : ""; });
  sheet.appendRow(row);
}
