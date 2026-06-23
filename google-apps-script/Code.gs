/**
 * ระบบใบสั่งซื้อ–สั่งจ้าง งานพัสดุ โรงเรียนสหราษฎร์รังสฤษดิ์
 * เพิ่มช่อง "ฝ่ายงานที่รับผิดชอบ"
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
  'department',
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
    const documentNo =
      String(data.document_no || '').trim() ||
      generateDocumentNo(sheet, type);

    const record = {
      id: Utilities.getUuid(),
      type: type,
      document_no: documentNo,
      date: String(data.date).trim(),
      subject: sanitizeText(data.subject),
      amount: Number(data.amount),
      vendor: sanitizeText(data.vendor),
      tax_id: String(data.tax_id).trim(),
      department: sanitizeText(data.department),
      project_no: sanitizeText(data.project_no),
      created_at: new Date()
    };

    sheet.appendRow(
      HEADERS.map(function(header) {
        return record[header] !== undefined ? record[header] : '';
      })
    );

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

  ensureHeaders(sheet);
  applySheetFormatting(sheet);

  return sheet;
}

/**
 * เพิ่มคอลัมน์ที่ขาดและเรียงคอลัมน์ใหม่โดยไม่ลบข้อมูลเดิม
 */
function ensureHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    return;
  }

  const lastRow = Math.max(sheet.getLastRow(), 1);
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const values = sheet.getRange(1, 1, lastRow, lastColumn).getValues();

  const currentHeaders = values[0].map(function(value) {
    return String(value).trim();
  });

  const alreadyCorrect =
    currentHeaders.length >= HEADERS.length &&
    HEADERS.every(function(header, index) {
      return currentHeaders[index] === header;
    });

  if (alreadyCorrect) {
    return;
  }

  const headerIndexes = {};
  currentHeaders.forEach(function(header, index) {
    if (header) {
      headerIndexes[header] = index;
    }
  });

  const reordered = [HEADERS.slice()];

  for (let rowIndex = 1; rowIndex < values.length; rowIndex++) {
    reordered.push(
      HEADERS.map(function(header) {
        const sourceIndex = headerIndexes[header];
        return sourceIndex !== undefined
          ? values[rowIndex][sourceIndex]
          : '';
      })
    );
  }

  sheet.clearContents();
  sheet
    .getRange(1, 1, reordered.length, HEADERS.length)
    .setValues(reordered);
}

function applySheetFormatting(sheet) {
  sheet.setFrozenRows(1);

  sheet
    .getRange(1, 1, 1, HEADERS.length)
    .setFontWeight('bold')
    .setBackground('#b85c22')
    .setFontColor('#ffffff');

  sheet.getRange('D:D').setNumberFormat('@');
  sheet.getRange('F:F').setNumberFormat('#,##0.00');
  sheet.getRange('H:H').setNumberFormat('@');
  sheet.getRange('I:I').setNumberFormat('@');
  sheet.getRange('J:J').setNumberFormat('@');

  sheet.autoResizeColumns(1, HEADERS.length);
}

function getHeaderMap(sheet) {
  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getDisplayValues()[0];

  const map = {};

  headers.forEach(function(header, index) {
    map[String(header).trim()] = index;
  });

  return map;
}

function getAllDocuments() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  const headerMap = getHeaderMap(sheet);
  const values = sheet
    .getRange(2, 1, lastRow - 1, sheet.getLastColumn())
    .getValues();

  return values
    .filter(function(row) {
      return row[headerMap.id];
    })
    .map(function(row) {
      const item = {};

      HEADERS.forEach(function(header) {
        const index = headerMap[header];
        let value = index !== undefined ? row[index] : '';

        if (value instanceof Date) {
          if (header === 'created_at') {
            value = Utilities.formatDate(
              value,
              Session.getScriptTimeZone(),
              "yyyy-MM-dd'T'HH:mm:ss"
            );
          } else {
            value = Utilities.formatDate(
              value,
              Session.getScriptTimeZone(),
              'yyyy-MM-dd'
            );
          }
        }

        item[header] = value;
      });

      return item;
    })
    .sort(function(a, b) {
      return String(b.created_at).localeCompare(
        String(a.created_at)
      );
    });
}

function generateDocumentNo(sheet, type) {
  const buddhistYear = new Date().getFullYear() + 543;
  const prefix = type === 'purchase' ? 'ซื้อ' : 'จ้าง';
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return prefix + '-001/' + buddhistYear;
  }

  const headerMap = getHeaderMap(sheet);
  const rows = sheet
    .getRange(2, 1, lastRow - 1, sheet.getLastColumn())
    .getValues();

  let maxRunning = 0;

  rows.forEach(function(row) {
    const rowType = String(row[headerMap.type] || '');
    const documentNo = String(row[headerMap.document_no] || '');
    const pattern = new RegExp(
      '^' + prefix + '-(\\d+)\\/' + buddhistYear + '$'
    );
    const match = documentNo.match(pattern);

    if (rowType === type && match) {
      maxRunning = Math.max(
        maxRunning,
        Number(match[1]) || 0
      );
    }
  });

  return (
    prefix +
    '-' +
    String(maxRunning + 1).padStart(3, '0') +
    '/' +
    buddhistYear
  );
}

function validateInput(data) {
  const required = [
    'type',
    'date',
    'subject',
    'amount',
    'vendor',
    'tax_id',
    'department',
    'project_no'
  ];

  required.forEach(function(field) {
    if (!String(data[field] || '').trim()) {
      if (field === 'department') {
        throw new Error('กรุณากรอกฝ่ายงานที่รับผิดชอบ');
      }

      throw new Error('ข้อมูลไม่ครบ: ' + field);
    }
  });

  if (
    ['purchase', 'hire'].indexOf(
      String(data.type).trim()
    ) === -1
  ) {
    throw new Error('ประเภทเอกสารไม่ถูกต้อง');
  }

  const amount = Number(data.amount);

  if (!isFinite(amount) || amount < 0) {
    throw new Error('จำนวนเงินไม่ถูกต้อง');
  }

  if (!/^\d{13}$/.test(String(data.tax_id).trim())) {
    throw new Error(
      'เลขประจำตัวผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก'
    );
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      String(data.date).trim()
    )
  ) {
    throw new Error('รูปแบบวันที่ไม่ถูกต้อง');
  }
}

function sanitizeText(value) {
  return String(value || '')
    .trim()
    .replace(/[<>]/g, '');
}

function jsonOutput(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
