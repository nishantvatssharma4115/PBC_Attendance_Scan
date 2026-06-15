/**
 * PBC 2026 Attendance Scanner — Google Apps Script Backend
 *
 * This script is bound to a Google Spreadsheet that acts as the free cloud database.
 *
 * ── HOW TO DEPLOY ─────────────────────────────────────────────────────────────
 * 1. Create a new Google Spreadsheet (File → New → Google Sheets).
 * 2. Open Extensions → Apps Script (or go to script.google.com and bind to the sheet).
 * 3. Delete any default code in the editor, then paste this entire file.
 * 4. Save the project (Ctrl/Cmd + S).
 * 5. Click Deploy → New deployment.
 * 6. Click the gear icon next to "Select type" → choose "Web app".
 * 7. Set:
 *      Execute as: Me
 *      Who has access: Anyone
 * 8. Click Deploy → authorize when prompted → copy the Web App URL.
 * 9. Paste that URL into the PBC 2026 attendance app configuration.
 *
 * After code changes: Deploy → Manage deployments → Edit (pencil) → New version → Deploy.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const SESSIONS_SHEET = 'Sessions';
const SCANS_SHEET = 'Scans';

const SESSION_HEADERS = [
  'sessionId', 'day', 'sessionNum', 'title', 'speaker', 'cutoff', 'date', 'createdAt'
];

const SCAN_HEADERS = [
  'sessionId', 'delegateId', 'delegateName', 'status', 'timestamp', 'deviceId'
];

// ── HTTP handlers ────────────────────────────────────────────────────────────

function doGet(e) {
  ensureSheetsExist();
  e = e || { parameter: {} };
  const action = e.parameter.action;

  switch (action) {
    case 'getSessions':
      return jsonResponse(getSessions());
    case 'getScans':
      return jsonResponse(getScans(e.parameter.sessionId));
    case 'getFullData':
      return jsonResponse(getFullData());
    case 'ping':
      return jsonResponse({ ok: true, timestamp: new Date().toISOString() });
    default:
      return jsonResponse({ error: 'Unknown or missing action', action: action || null });
  }
}

function doPost(e) {
  ensureSheetsExist();
  e = e || { parameter: {} };
  const action = e.parameter.action;

  let body = {};
  try {
    if (e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
  } catch (err) {
    return jsonResponse({ error: 'Invalid JSON body', message: err.message });
  }

  switch (action) {
    case 'createSession':
      return jsonResponse(createSession(body));
    case 'addScan':
      return jsonResponse(addScan(body));
    default:
      return jsonResponse({ error: 'Unknown or missing action', action: action || null });
  }
}

// ── Actions ──────────────────────────────────────────────────────────────────

function createSession(data) {
  if (!data || data.sessionId == null || data.day == null || data.sessionNum == null) {
    return { error: 'Missing required fields: sessionId, day, sessionNum' };
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SESSIONS_SHEET);
  const rows = sheet.getDataRange().getValues();

  // Delete any existing row with the same day + sessionNum (bottom-up to keep indices stable)
  for (let i = rows.length - 1; i >= 1; i--) {
    const rowDay = rows[i][1];
    const rowSessionNum = rows[i][2];
    if (String(rowDay) === String(data.day) && String(rowSessionNum) === String(data.sessionNum)) {
      sheet.deleteRow(i + 1);
    }
  }

  sheet.appendRow([
    data.sessionId,
    data.day,
    data.sessionNum,
    data.title || '',
    data.speaker || '',
    data.cutoff || '',
    data.date || '',
    data.createdAt || new Date().toISOString()
  ]);

  return { success: true, sessionId: data.sessionId };
}

function addScan(data) {
  if (!data || !data.sessionId || !data.delegateId) {
    return { error: 'Missing required fields: sessionId, delegateId' };
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
  } catch (err) {
    return { error: 'Could not acquire lock', message: err.message };
  }

  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SCANS_SHEET);
    const rows = sheet.getDataRange().getValues();

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      // Column 1 = sessionId (index 0), column 2 = delegateId (index 1)
      if (String(row[0]) === String(data.sessionId) && String(row[1]) === String(data.delegateId)) {
        return { duplicate: true, existingStatus: row[3] };
      }
    }

    sheet.appendRow([
      data.sessionId,
      data.delegateId,
      data.delegateName || '',
      data.status || '',
      data.timestamp || new Date().toISOString(),
      data.deviceId || ''
    ]);

    return { success: true };
  } finally {
    lock.releaseLock();
  }
}

function getSessions() {
  return rowsToObjects(
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SESSIONS_SHEET),
    SESSION_HEADERS
  );
}

function getScans(sessionId) {
  if (!sessionId) {
    return { error: 'Missing required parameter: sessionId' };
  }

  const allScans = rowsToObjects(
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SCANS_SHEET),
    SCAN_HEADERS
  );

  return allScans.filter(function (scan) {
    return String(scan.sessionId) === String(sessionId);
  });
}

function getFullData() {
  return {
    sessions: getSessions(),
    scans: rowsToObjects(
      SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SCANS_SHEET),
      SCAN_HEADERS
    )
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function ensureSheetsExist() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheetWithHeaders(ss, SESSIONS_SHEET, SESSION_HEADERS);
  ensureSheetWithHeaders(ss, SCANS_SHEET, SCAN_HEADERS);
}

function ensureSheetWithHeaders(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }

  const firstCell = sheet.getRange(1, 1).getValue();
  if (firstCell !== headers[0]) {
    if (sheet.getLastRow() > 0) {
      sheet.insertRowBefore(1);
    }
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  sheet.setFrozenRows(1);
}

function rowsToObjects(sheet, headers) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const sheetHeaders = data[0];
  const results = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0] === '' || row[0] == null) continue;

    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      const key = sheetHeaders[j] || headers[j];
      obj[key] = row[j];
    }
    results.push(obj);
  }

  return results;
}

function jsonResponse(result) {
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
