/**
 * Google Sheets client for the Form Receiver.
 *
 * Script Properties required:
 *   SPREADSHEET_ID — Google Sheet ID (from the URL)
 *   TEAM_EMAIL     — Team notification email
 *
 * Sheet structure:
 *   "Suscriptores" tab — headers in row 1, data from row 2
 *   Columns: A=Nombre, B=Email, C=Teléfono, D=Dirección, E=Ciudad,
 *            F=Notas de entrega, G=Tipo de suscripción, H=Plan,
 *            I=Café elegido, J=Molienda, K=Frecuencia,
 *            L=Precio/envío, M=Estado, N=Fecha de registro, O=MP Plan ID,
 *            P=NIT, Q=Razón social, R=Email factura, S=Lote enviado
 */

var _SHEET_ID = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");

/**
 * Get the Suscriptores sheet.
 * @returns {Sheet}
 */
function _getSuscriptoresSheet() {
  return SpreadsheetApp.openById(_SHEET_ID).getSheetByName("Suscriptores");
}

/**
 * Find a subscriber row by email.
 * @param {string} email
 * @returns {Object|null} — { row: number, fields: Object } or null
 */
function findSubscriberByEmail(email) {
  var sheet = _getSuscriptoresSheet();
  if (!sheet) return null;

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return null; // Only headers

  var headers = data[0];
  var emailCol = headers.indexOf("Email");
  if (emailCol === -1) return null;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][emailCol]).toLowerCase() === String(email).toLowerCase()) {
      var fields = {};
      for (var j = 0; j < headers.length; j++) {
        fields[headers[j]] = data[i][j];
      }
      return { row: i + 1, fields: fields }; // row is 1-indexed for Sheet API
    }
  }

  return null;
}

/**
 * Create or update a subscriber record.
 * If a record with the same email exists, update it. Otherwise, create a new one.
 * @param {Object} fields — field name → value map
 */
function upsertSubscriber(fields) {
  var sheet = _getSuscriptoresSheet();
  if (!sheet) throw new Error("Sheet 'Suscriptores' not found");

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var existing = findSubscriberByEmail(fields["Email"]);

  if (existing) {
    // Update existing row
    var rowValues = headers.map(function (h) {
      return fields[h] !== undefined ? fields[h] : existing.fields[h];
    });
    sheet.getRange(existing.row, 1, 1, headers.length).setValues([rowValues]);
  } else {
    // Append new row
    fields["Fecha de registro"] = new Date().toISOString().split("T")[0];
    var rowValues = headers.map(function (h) {
      return fields[h] !== undefined ? fields[h] : "";
    });
    sheet.appendRow(rowValues);
  }
}
