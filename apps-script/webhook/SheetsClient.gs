/**
 * Google Sheets client for the Webhook Handler.
 *
 * Script Properties required:
 *   SPREADSHEET_ID — Google Sheet ID (from the URL)
 *   TEAM_EMAIL     — Team notification email
 *   MP_ACCESS_TOKEN — Mercado Pago access token
 *
 * Sheet structure:
 *   "Suscriptores" tab — headers in row 1, data from row 2
 *   "Despachos" tab — headers in row 1, data from row 2
 *     Columns: A=Suscriptor Email, B=Fecha de pago MP, C=Monto pagado,
 *              D=MP Payment ID, E=Estado despacho, F=Fecha de despacho,
 *              G=Lote enviado, H=Notas
 *
 *   "Suscriptores" tab includes "Código descuento" column for Shopify codes
 */

var _PROPS = PropertiesService.getScriptProperties();
var TEAM_EMAIL = _PROPS.getProperty("TEAM_EMAIL") || "team@salentino.co";

/**
 * Get a sheet by name.
 * Uses getActiveSpreadsheet() for bound scripts.
 * @param {string} name
 * @returns {Sheet}
 */
function _getSheet(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

/**
 * Find a subscriber row by email.
 * @param {string} email
 * @returns {Object|null} — { row: number, id: string, fields: Object } or null
 */
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
      // Use row number as ID (compatible with updateSubscriberStatus)
      return { row: i + 1, id: String(i + 1), fields: fields };
    }
  }

  return null;
}

/**
 * Find a dispatch record by MP Payment ID (idempotency check).
 * @param {string} paymentId
 * @returns {Object|null}
 */
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
 * Create a dispatch record linked to a subscriber.
 * @param {Object} subscriber — subscriber object from findSubscriberByEmail
 * @param {Object} payment — MP payment object
 */
function createDespacho(subscriber, payment) {
  var sheet = _getSheet("Despachos");
  if (!sheet) throw new Error("Sheet 'Despachos' not found");

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  var fields = {
    "Suscriptor Email": subscriber.fields["Email"],
    "Fecha de pago MP": new Date(payment.date_approved || payment.date_created).toISOString().split("T")[0],
    "Monto pagado": payment.transaction_amount,
    "MP Payment ID": String(payment.id),
    "Estado despacho": "Por despachar",
    "Fecha de despacho": "",
    "Lote enviado": "",
    "Notas": "",
  };

  var rowValues = headers.map(function (h) {
    return fields[h] !== undefined ? fields[h] : "";
  });

  sheet.appendRow(rowValues);
}

/**
 * Update subscriber status by row number.
 * @param {string} rowId — row number as string
 * @param {string} status
 */
function updateSubscriberStatus(rowId, status) {
  var sheet = _getSheet("Suscriptores");
  if (!sheet) return;

  var row = parseInt(rowId, 10);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var estadoCol = headers.indexOf("Estado");
  if (estadoCol === -1) return;

  sheet.getRange(row, estadoCol + 1).setValue(status);
}

/**
 * Log an exception: payment received but no matching subscriber.
 * Creates a subscriber row with exception note.
 * @param {Object} payment — MP payment object
 */
function logException(payment) {
  var sheet = _getSheet("Suscriptores");
  if (!sheet) return;

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  var fields = {
    "Nombre": ((payment.payer.first_name || "") + " " + (payment.payer.last_name || "")).trim(),
    "Email": payment.payer.email || "desconocido@exception.local",
    "Estado": "Pendiente de pago",
    "Notas de entrega": "EXCEPCIÓN: Pago sin pre-registro. MP Payment ID: " + payment.id
      + ". Monto: $" + payment.transaction_amount,
    "Fecha de registro": new Date().toISOString().split("T")[0],
  };

  var rowValues = headers.map(function (h) {
    return fields[h] !== undefined ? fields[h] : "";
  });

  sheet.appendRow(rowValues);
}

/**
 * Save discount code to subscriber row.
 * @param {string} rowId — row number as string
 * @param {string} code — Shopify discount code
 */
function saveDiscountCode(rowId, code) {
  var sheet = _getSheet("Suscriptores");
  if (!sheet) return;

  var row = parseInt(rowId, 10);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var codeCol = headers.indexOf("Código descuento");
  if (codeCol === -1) return;

  sheet.getRange(row, codeCol + 1).setValue(code);
}
