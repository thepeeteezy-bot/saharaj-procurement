/**
 * ระบบใบสั่งซื้อ–สั่งจ้าง งานพัสดุ โรงเรียนสหราษฎร์รังสฤษดิ์
 *
 * วิธีใช้
 * 1) สร้าง Google Sheet
 * 2) เปิด Extensions > Apps Script
 * 3) วางโค้ดนี้ใน Code.gs
 * 4) แก้ค่า SPREADSHEET_ID
 * 5) Deploy เป็น Web app
 */

const SPREADSHEET_ID = 'PASTE_YOUR_GOOGLE_SHEET_ID_HERE';
const SHEET_NAME = 'Documents';

const HEADERS = [
  'id',
  'type',
  'document_no',
  'date',
  'subject',
  'amount',
  'vendor',
  'tax_id',
  'project_no',
  'created_at'
];

function doGet(e) {
  try {
    const action = String((e && e.parameter && e.parameter.action) || 'list');

    if (action === 'list') {
      return jsonOutput({
        success: true,
        data: getAllDocuments()
      });
    }

    return jsonOutput({
      success: true,
      message: 'Procurement API is ready'
    });
  } catch (error) {
    return jsonOutput({
      success: false,
      message: error.message
    });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    const data = e && e.parameter ? e.parameter : {};
    validateInput(data);

    const sheet = getSheet();
    const type = String(data.type).trim();
    const documentNo = String(data.document_no || '').trim() || generateDocumentNo(sheet, type);
    const amount = Number(data.amount);

    const row = [
      Utilities.getUuid(),
      type,
      documentNo,
      String(data.date).trim(),
      sanitizeText(data.subject),
      amount,
      sanitizeText(data.vendor),
      String(data.tax_id).trim(),
      sanitizeText(data.project_no),
      new Date()
    ];

    sheet.appendRow(row);

    return jsonOutput({
      success: true,
      document_no: documentNo
    });
  } catch (error) {
    return jsonOutput({
      success: false,
      message: error.message
    });
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {}
  }
}

function getSheet() {
  if (!SPREADSHEET_ID || SPREADSHEET_ID.indexOf('PASTE_YOUR') === 0) {
    throw new Error('ยังไม่ได้กำหนด SPREADSHEET_ID ใน Code.gs');
  }

  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  const lastColumn = sheet.getLastColumn();
  const hasHeaders = sheet.getLastRow() > 0 && lastColumn >= HEADERS.length;

  if (!hasHeaders) {
    sheet.clear();
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length)
      .setFontWeight('bold')
      .setBackground('#12385b')
      .setFontColor('#ffffff');

    sheet.getRange('F:F').setNumberFormat('#,##0.00');
    sheet.getRange('D:D').setNumberFormat('@');
    sheet.getRange('H:H').setNumberFormat('@');
    sheet.getRange('I:I').setNumberFormat('@');
  }

  return sheet;
}

function getAllDocuments() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();

  return values
    .filter(function(row) {
      return row[0];
    })
    .map(function(row) {
      const item = {};
      HEADERS.forEach(function(header, index) {
        let value = row[index];

        if (value instanceof Date) {
          if (header === 'created_at') {
            value = Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
          } else {
            value = Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
          }
        }

        item[header] = value;
      });
      return item;
    })
    .sort(function(a, b) {
      return String(b.created_at).localeCompare(String(a.created_at));
    });
}

function generateDocumentNo(sheet, type) {
  const buddhistYear = new Date().getFullYear() + 543;
  const prefix = type === 'purchase' ? 'ซื้อ' : 'จ้าง';
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return prefix + '-001/' + buddhistYear;
  }

  const rows = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  let maxRunning = 0;

  rows.forEach(function(row) {
    const rowType = String(row[1] || '');
    const documentNo = String(row[2] || '');
    const pattern = new RegExp('^' + prefix + '-(\\d+)\\/' + buddhistYear + '$');
    const match = documentNo.match(pattern);

    if (rowType === type && match) {
      maxRunning = Math.max(maxRunning, Number(match[1]) || 0);
    }
  });

  return prefix + '-' + String(maxRunning + 1).padStart(3, '0') + '/' + buddhistYear;
}

function validateInput(data) {
  const required = ['type', 'date', 'subject', 'amount', 'vendor', 'tax_id', 'project_no'];

  required.forEach(function(field) {
    if (!String(data[field] || '').trim()) {
      throw new Error('ข้อมูลไม่ครบ: ' + field);
    }
  });

  if (['purchase', 'hire'].indexOf(String(data.type).trim()) === -1) {
    throw new Error('ประเภทเอกสารไม่ถูกต้อง');
  }

  const amount = Number(data.amount);
  if (!isFinite(amount) || amount < 0) {
    throw new Error('จำนวนเงินไม่ถูกต้อง');
  }

  if (!/^\d{13}$/.test(String(data.tax_id).trim())) {
    throw new Error('เลขประจำตัวผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก');
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data.date).trim())) {
    throw new Error('รูปแบบวันที่ไม่ถูกต้อง');
  }
}

function sanitizeText(value) {
  return String(value || '').trim().replace(/[<>]/g, '');
}

function jsonOutput(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
