/**
 * Airtable API client for the Form Receiver.
 *
 * Script Properties required:
 *   AIRTABLE_PAT     — Personal Access Token
 *   AIRTABLE_BASE_ID — Base ID (starts with "app...")
 */

var PROPS = PropertiesService.getScriptProperties();
var AIRTABLE_PAT = PROPS.getProperty("AIRTABLE_PAT");
var AIRTABLE_BASE_ID = PROPS.getProperty("AIRTABLE_BASE_ID");
var BASE_URL = "https://api.airtable.com/v0/" + AIRTABLE_BASE_ID;

/**
 * Find a subscriber record by email.
 * @param {string} email
 * @returns {Object|null} Airtable record or null
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
 * Create or update a subscriber record.
 * If a record with the same email exists, update it. Otherwise, create a new one.
 * @param {Object} fields — Airtable field values
 */
function upsertSubscriber(fields) {
  var existing = findSubscriberByEmail(fields["Email"]);

  if (existing) {
    // Update existing record
    UrlFetchApp.fetch(BASE_URL + "/Suscriptores/" + existing.id, {
      method: "patch",
      headers: {
        "Authorization": "Bearer " + AIRTABLE_PAT,
        "Content-Type": "application/json",
      },
      payload: JSON.stringify({ fields: fields }),
      muteHttpExceptions: true,
    });
  } else {
    // Create new record
    fields["Fecha de registro"] = new Date().toISOString().split("T")[0];
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
}
