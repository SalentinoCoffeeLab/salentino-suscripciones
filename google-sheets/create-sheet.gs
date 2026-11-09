/**
 * Run this function from the Apps Script editor to set up
 * the Salentino Suscripciones sheet with all headers,
 * validation, and formatting.
 *
 * Steps:
 *   1. Open your Google Sheet
 *   2. Extensions → Apps Script
 *   3. Paste this entire file
 *   4. Click Run → select setupSalentinoSheet
 *   5. Authorize when prompted
 */

function setupSalentinoSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // ── Tab 1: Suscriptores ──
  var sub = ss.getSheetByName("Suscriptores") || ss.getSheets()[0];
  sub.setName("Suscriptores");
  sub.clear();

  var subHeaders = [
    "Nombre", "Email", "Teléfono", "Dirección", "Ciudad",
    "Notas de entrega", "Tipo de suscripción", "Plan",
    "Café elegido", "Molienda", "Frecuencia",
    "Precio/envío", "Estado", "Fecha de registro", "MP Plan ID",
    "Lote enviado", "Código descuento",
  ];
  sub.getRange(1, 1, 1, subHeaders.length).setValues([subHeaders]);

  // Header formatting
  var headerRange = sub.getRange(1, 1, 1, subHeaders.length);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#f3f3f3");
  sub.setFrozenRows(1);

  // Column widths
  sub.setColumnWidth(1, 180);  // Nombre
  sub.setColumnWidth(2, 200);  // Email
  sub.setColumnWidth(3, 140);  // Teléfono
  sub.setColumnWidth(4, 250);  // Dirección
  sub.setColumnWidth(5, 120);  // Ciudad
  sub.setColumnWidth(6, 200);  // Notas
  sub.setColumnWidth(7, 160);  // Tipo
  sub.setColumnWidth(8, 180);  // Plan
  sub.setColumnWidth(9, 180);  // Café
  sub.setColumnWidth(10, 140); // Molienda
  sub.setColumnWidth(11, 120); // Frecuencia
  sub.setColumnWidth(12, 120); // Precio
  sub.setColumnWidth(13, 140); // Estado
  sub.setColumnWidth(14, 140); // Fecha
  sub.setColumnWidth(15, 180); // MP Plan ID
  sub.setColumnWidth(16, 140); // Lote
  sub.setColumnWidth(17, 160); // Código descuento

  // Data validation (rows 2-500)
  var maxRow = 500;

  // Tipo de suscripción (col G = 7)
  sub.getRange(2, 7, maxRow).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(["Café de Diario", "Ediciones Especiales"])
      .setAllowInvalid(false).build()
  );

  // Plan (col H = 8)
  sub.getRange(2, 8, maxRow).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(["454G", "1 KG", "250G · UN ORIGEN", "500G · DOS ORÍGENES"])
      .setAllowInvalid(false).build()
  );

  // Café elegido (col I = 9)
  sub.getRange(2, 9, maxRow).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(["Caturra Lavado Tradicional", "Selección del tostador"])
      .setAllowInvalid(false).build()
  );

  // Molienda (col J = 10)
  sub.getRange(2, 10, maxRow).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(["Grano", "V60", "Aeropress", "Espresso", "Prensa Francesa"])
      .setAllowInvalid(false).build()
  );

  // Frecuencia (col K = 11)
  sub.getRange(2, 11, maxRow).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(["Quincenal", "Mensual"])
      .setAllowInvalid(false).build()
  );

  // Precio/envío format (col L = 12)
  sub.getRange(2, 12, maxRow).setNumberFormat("$#,##0");

  // Estado (col M = 13)
  sub.getRange(2, 13, maxRow).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(["Pendiente de pago", "Activo", "Pausado", "Cancelado"])
      .setAllowInvalid(false).build()
  );

  // Fecha de registro format (col N = 14)
  sub.getRange(2, 14, maxRow).setNumberFormat("yyyy-mm-dd");

  // ── Tab 2: Despachos ──
  var desp = ss.getSheetByName("Despachos") || ss.insertSheet("Despachos");
  desp.clear();

  var despHeaders = [
    "Suscriptor Email", "Fecha de pago MP", "Monto pagado",
    "MP Payment ID", "Estado despacho", "Fecha de despacho",
    "Lote enviado", "Notas",
  ];
  desp.getRange(1, 1, 1, despHeaders.length).setValues([despHeaders]);

  // Header formatting
  var despHeaderRange = desp.getRange(1, 1, 1, despHeaders.length);
  despHeaderRange.setFontWeight("bold");
  despHeaderRange.setBackground("#f3f3f3");
  desp.setFrozenRows(1);

  // Column widths
  desp.setColumnWidth(1, 200);  // Email
  desp.setColumnWidth(2, 140);  // Fecha pago
  desp.setColumnWidth(3, 120);  // Monto
  desp.setColumnWidth(4, 180);  // MP Payment ID
  desp.setColumnWidth(5, 150);  // Estado
  desp.setColumnWidth(6, 140);  // Fecha despacho
  desp.setColumnWidth(7, 140);  // Lote
  desp.setColumnWidth(8, 250);  // Notas

  // Data validation
  desp.getRange(2, 5, maxRow).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(["Por despachar", "En preparación", "En camino", "Entregado"])
      .setAllowInvalid(false).build()
  );

  // Monto format (col C = 3)
  desp.getRange(2, 3, maxRow).setNumberFormat("$#,##0");

  // Date formats
  desp.getRange(2, 2, maxRow).setNumberFormat("yyyy-mm-dd");
  desp.getRange(2, 6, maxRow).setNumberFormat("yyyy-mm-dd");

  Logger.log("Sheet configured successfully!");
}
