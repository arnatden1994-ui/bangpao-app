import { OFFICIAL_DOCX_STATIC_ENTRIES, StaticZipEntry } from '../data/officialDocxTemplateBase64.ts';
import {
  OFFICIAL_XLSX_STATIC_ENTRIES,
  OFFICIAL_XLSX_SHEET11_XML,
  OFFICIAL_XLSX_SHARED_STRINGS_TEMPLATE,
} from '../data/officialXlsxTemplateData.ts';
import {
  DocxLicensePayload,
  cleanBoilerplateCondition,
  cleanSignerPosition,
  formatSignerPositionLines,
} from './docxTemplateExporter.ts';

export const GOOGLE_SHEET_TEMPLATE_URL =
  'https://docs.google.com/spreadsheets/d/1uyFaL2xxUouBM5CV-_WdWlNHWHZWQQ9XhrVldvV3DEY/edit?gid=2021842569#gid=2021842569';

function escapeXml(str: string): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function splitBizTypeForSheet(text: string, explicitLine2?: string): [string, string] {
  if (explicitLine2 !== undefined && explicitLine2.trim() !== '') {
    return [text.trim(), explicitLine2.trim()];
  }
  const clean = (text || '').trim();
  if (!clean) return ['', ''];
  if (clean.length <= 68) return [clean, ''];
  let splitIdx = clean.lastIndexOf(' ', 68);
  if (splitIdx <= 20) splitIdx = 68;
  return [clean.slice(0, splitIdx).trim(), clean.slice(splitIdx).trim()];
}

function formatShortThaiDate(day?: string, month?: string, year?: string): string {
  const d = (day || '').trim();
  const m = (month || '').trim();
  const y = (year || '').trim();
  const monthAbbr: Record<string, string> = {
    'มกราคม': 'ม.ค.',
    'กุมภาพันธ์': 'ก.พ.',
    'มีนาคม': 'มี.ค.',
    'เมษายน': 'เม.ย.',
    'พฤษภาคม': 'พ.ค.',
    'มิถุนายน': 'มิ.ย.',
    'กรกฎาคม': 'ก.ค.',
    'สิงหาคม': 'ส.ค.',
    'กันยายน': 'ก.ย.',
    'ตุลาคม': 'ต.ค.',
    'พฤศจิกายน': 'พ.ย.',
    'ธันวาคม': 'ธ.ค.',
  };
  const mShort = monthAbbr[m] || m;
  return [d, mShort, y].filter(Boolean).join(' ');
}

function buildLicenseDataSheetXml(data: DocxLicensePayload): string {
  const nowStr = new Date().toLocaleString('en-GB', { hour12: false });
  const issueFull = formatShortThaiDate(data.issueDay, data.issueMonth, data.issueYear);
  const expireFull = formatShortThaiDate(data.expireDay, data.expireMonth, data.expireYear);
  const headers = [
    'Timestamp',
    'ชื่อสถานประกอบกิจการ',
    'เลขที่ใบอนุญาต',
    'วันที่เริ่มอนุมัติ',
    'วันที่หมดวันที่',
    'หมายเหตุ',
    'ปี พ.ศ.',
    'ผู้รับใบอนุญาต',
    'ประเภทกิจการ',
    'ค่าธรรมเนียม (บาท)',
    'เลขที่ใบเสร็จ',
    'ผู้ลงนาม',
    'ตำแหน่งผู้ลงนาม',
  ];
  const values = [
    nowStr,
    data.bizName || '',
    data.docNo || '',
    issueFull,
    expireFull,
    `เล่มที่ ${data.bookNo || '-'} เลขที่ ${data.docNo || '-'}/${data.docYear || ''}`,
    data.docYear || '',
    data.applicantName || '',
    [data.bizType, data.bizTypeLine2].filter(Boolean).join(' '),
    data.feeAmount || '',
    data.receiptNo || '',
    data.signerName || '',
    cleanSignerPosition(data.signerTitle),
  ];

  const colLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
  const row1Cells = headers
    .map((h, i) => `<c r="${colLetters[i]}1" t="inlineStr"><is><t>${escapeXml(h)}</t></is></c>`)
    .join('');
  const row2Cells = values
    .map((v, i) => `<c r="${colLetters[i]}2" t="inlineStr"><is><t>${escapeXml(v)}</t></is></c>`)
    .join('');

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<cols>` +
    `<col min="1" max="1" width="20" customWidth="1"/>` +
    `<col min="2" max="2" width="28" customWidth="1"/>` +
    `<col min="3" max="3" width="16" customWidth="1"/>` +
    `<col min="4" max="5" width="18" customWidth="1"/>` +
    `<col min="6" max="6" width="26" customWidth="1"/>` +
    `<col min="7" max="7" width="12" customWidth="1"/>` +
    `<col min="8" max="9" width="28" customWidth="1"/>` +
    `<col min="10" max="11" width="18" customWidth="1"/>` +
    `<col min="12" max="13" width="28" customWidth="1"/>` +
    `</cols>` +
    `<sheetData>` +
    `<row r="1" ht="24" customHeight="1">${row1Cells}</row>` +
    `<row r="2" ht="22" customHeight="1">${row2Cells}</row>` +
    `</sheetData>` +
    `</worksheet>`
  );
}

/**
 * Generates an authentic OpenXML Spreadsheet (.xlsx) byte array matching the
 * exact Google Sheet template (1uyFaL2xxUouBM5CV-_WdWlNHWHZWQQ9XhrVldvV3DEY, gid=2021842569).
 */
export function generateOfficialXlsxBytes(
  data: DocxLicensePayload,
  options: { useTemplatePlaceholders?: boolean } = {}
): Uint8Array {
  const [bType1, bType2] = splitBizTypeForSheet(data.bizType || '', data.bizTypeLine2);
  const c1 = cleanBoilerplateCondition(data.cond1);
  const c2 = cleanBoilerplateCondition(data.cond2);

  const rawSignerName = (data.signerName || 'นายละดม  เชื้อช่วย').replace(/^\s*\(|\)\s*$/g, '').trim();
  const formattedSignerName = `(${rawSignerName})`;
  const posLines = formatSignerPositionLines(data.signerTitle);
  const formattedSignerPos = posLines.join('\n');

  const firstBack = (data.backRows && data.backRows[0]) || {
    issueDate: formatShortThaiDate(data.issueDay, data.issueMonth, data.issueYear),
    expireDate: formatShortThaiDate(data.expireDay, data.expireMonth, data.expireYear),
    book: data.receiptBook || '-',
    no: data.receiptNo || '',
    date: formatShortThaiDate(data.receiptDay, data.receiptMonth, data.receiptYear),
  };

  const tokenValues: Record<string, string> = {
    '<<bNo>>': data.bookNo || '-',
    '<<lNo>>': data.docNo || '',
    '<<docYear>>': data.docYear || '',
    '<<owner>>': data.applicantName || '',
    '<<nat>>': data.nationality || 'ไทย',
    '<<oAddrNo>>': data.houseNo || '',
    '<<oMoo>>': data.moo || '',
    '<<oSoi>>': data.soi || '-',
    '<<oRoad>>': data.road || '-',
    '<<oTumbon>>': data.subdistrict || 'บางเป้า',
    '<<oAmphoe>>': data.district || 'กันตัง',
    '<<oProv>>': data.province || 'ตรัง',
    '<<oPhone>>': data.phone || '-',
    '<<bType1>>': bType1,
    '<<bType2>>': bType2,
    '<<bName>>': data.bizName || '',
    '<<bAddrNo>>': data.bizHouseNo || data.houseNo || '',
    '<<bMoo>>': data.bizMoo || data.moo || '',
    '<<bSoi>>': data.bizSoi || '-',
    '<<bRoad>>': data.bizRoad || '-',
    '<<bTumbon>>': data.bizSubdistrict || 'บางเป้า',
    '<<bAmphoe>>': data.bizDistrict || 'กันตัง',
    '<<bProv>>': data.bizProvince || 'ตรัง',
    '<<bPhone>>': data.bizPhone || data.phone || '-',
    '<<fee>>': data.feeAmount || '',
    '<<feeT>>': (data.feeText || '').replace(/^-\s*|\s*-$/g, '').trim(),
    '<<rBook>>': data.receiptBook || '-',
    '<<rNo>>': data.receiptNo || '',
    '<<rDate.d>>': data.receiptDay || '',
    '<<rDate.m>>': data.receiptMonth || '',
    '<<rDate.y>>': data.receiptYear || '',
    '<<condition31>>': c1,
    '<<condition32>>': c2,
    '<<sDate.d>>': data.issueDay || '',
    '<<sDate.m>>': data.issueMonth || '',
    '<<sDate.y>>': data.issueYear || '',
    '<<eDate.d>>': data.expireDay || '',
    '<<eDate.m>>': data.expireMonth || '',
    '<<eDate.y>>': data.expireYear || '',
    '<<execName>>': formattedSignerName,
    '<<execPos>>': formattedSignerPos,
    '<<backExecName>>': formattedSignerName,
    '<<backExecPos>>': formattedSignerPos,
    '<<t0.sDate>>': firstBack.issueDate || '',
    '<<t0.eDate>>': firstBack.expireDate || '',
    '<<t0.rBook>>': firstBack.book || '',
    '<<t0.rNo>>': firstBack.no || '',
    '<<t0.rDate>>': firstBack.date || '',
  };

  for (let i = 1; i <= 6; i++) {
    const r = data.backRows && data.backRows[i];
    tokenValues[`<<t${i}.sDate>>`] = r?.issueDate || '';
    tokenValues[`<<t${i}.eDate>>`] = r?.expireDate || '';
    tokenValues[`<<t${i}.rBook>>`] = r?.book || '';
    tokenValues[`<<t${i}.rNo>>`] = r?.no || '';
    tokenValues[`<<t${i}.rDate>>`] = r?.date || '';
  }

  const resolvedSiList = OFFICIAL_XLSX_SHARED_STRINGS_TEMPLATE.map((siXml) => {
    if (options.useTemplatePlaceholders) {
      // Restore original tags for template mode
      return siXml
        .replace('&lt;&lt;bSoi&gt;&gt;', '-')
        .replace('&lt;&lt;bRoad&gt;&gt;', '-')
        .replace('&lt;&lt;t0.sDate&gt;&gt;', '&lt;&lt;sDate.full&gt;&gt;')
        .replace('&lt;&lt;t0.eDate&gt;&gt;', '&lt;&lt;eDate.full&gt;&gt;')
        .replace('&lt;&lt;t0.rBook&gt;&gt;', '&lt;&lt;rBook&gt;&gt;')
        .replace('&lt;&lt;t0.rNo&gt;&gt;', '&lt;&lt;rNo&gt;&gt;')
        .replace('&lt;&lt;t0.rDate&gt;&gt;', '&lt;&lt;rDate.full&gt;&gt;')
        .replace('&lt;&lt;backExecName&gt;&gt;', '&lt;&lt;execName&gt;&gt;')
        .replace('&lt;&lt;backExecPos&gt;&gt;', '&lt;&lt;execPos&gt;&gt;')
        .replace(/&lt;&lt;t[1-6]\.[a-zA-Z]+&gt;&gt;/g, '');
    }

    const m = siXml.match(/^<t>(?:&lt;&lt;([^&]+)&gt;&gt;)<\/t>$/);
    if (m) {
      const tokenKey = `<<${m[1]}>>`;
      const val = tokenValues[tokenKey] ?? '';
      return `<t xml:space="preserve">${escapeXml(val)}</t>`;
    }
    return siXml;
  });

  const sharedStringsXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${resolvedSiList.length}" uniqueCount="${resolvedSiList.length}">` +
    resolvedSiList.map((si) => `<si>${si}</si>`).join('') +
    `</sst>`;

  // Adjust row 34 and row 53 height if signer position has multiple lines
  let sheet1Xml = OFFICIAL_XLSX_SHEET11_XML;
  if (posLines.length > 1 && !options.useTemplatePlaceholders) {
    sheet1Xml = sheet1Xml
      .replace('<row r="34" ht="26.25"', '<row r="34" ht="42.0"')
      .replace('<row r="53" ht="31.5"', '<row r="53" ht="45.0"');
  }

  const sheet2Xml = buildLicenseDataSheetXml(data);

  const contentTypesXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default ContentType="application/xml" Extension="xml"/>` +
    `<Default ContentType="image/png" Extension="png"/>` +
    `<Default ContentType="application/vnd.openxmlformats-package.relationships+xml" Extension="rels"/>` +
    `<Override ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml" PartName="/xl/workbook.xml"/>` +
    `<Override ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml" PartName="/xl/worksheets/sheet1.xml"/>` +
    `<Override ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml" PartName="/xl/worksheets/sheet2.xml"/>` +
    `<Override ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml" PartName="/xl/styles.xml"/>` +
    `<Override ContentType="application/vnd.openxmlformats-officedocument.theme+xml" PartName="/xl/theme/theme1.xml"/>` +
    `<Override ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml" PartName="/xl/sharedStrings.xml"/>` +
    `<Override ContentType="application/vnd.openxmlformats-officedocument.drawing+xml" PartName="/xl/drawings/drawing11.xml"/>` +
    `</Types>`;

  const rootRelsXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
    `</Relationships>`;

  const workbookXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<workbookPr/>` +
    `<sheets>` +
    `<sheet state="visible" name="แบบฟอร์มใบอนุญาต" sheetId="1" r:id="rId4"/>` +
    `<sheet state="visible" name="LicenseData" sheetId="2" r:id="rId5"/>` +
    `</sheets>` +
    `<definedNames/>` +
    `<calcPr/>` +
    `</workbook>`;

  const workbookRelsXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>` +
    `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    `<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>` +
    `<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
    `<Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>` +
    `</Relationships>`;

  const sheet1RelsXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing11.xml"/>` +
    `</Relationships>`;

  // Reuse Garuda image entry from OFFICIAL_DOCX_STATIC_ENTRIES mapped to xl/media/image1.png
  const garudaDocxEntry = OFFICIAL_DOCX_STATIC_ENTRIES.find((e) => e.name === 'word/media/image1.png');
  const staticEntries: StaticZipEntry[] = [...OFFICIAL_XLSX_STATIC_ENTRIES];
  if (garudaDocxEntry) {
    staticEntries.push({
      ...garudaDocxEntry,
      name: 'xl/media/image1.png',
    });
  }

  return buildZipFromEntries(staticEntries, [
    { name: '[Content_Types].xml', data: stringToUint8Array(contentTypesXml) },
    { name: '_rels/.rels', data: stringToUint8Array(rootRelsXml) },
    { name: 'xl/workbook.xml', data: stringToUint8Array(workbookXml) },
    { name: 'xl/_rels/workbook.xml.rels', data: stringToUint8Array(workbookRelsXml) },
    { name: 'xl/sharedStrings.xml', data: stringToUint8Array(sharedStringsXml) },
    { name: 'xl/worksheets/sheet1.xml', data: stringToUint8Array(sheet1Xml) },
    { name: 'xl/worksheets/_rels/sheet1.xml.rels', data: stringToUint8Array(sheet1RelsXml) },
    { name: 'xl/worksheets/sheet2.xml', data: stringToUint8Array(sheet2Xml) },
  ]);
}

/**
 * Triggers a browser download of a genuine Excel / Google Sheets (.xlsx) file
 * matching https://docs.google.com/spreadsheets/d/1uyFaL2xxUouBM5CV-_WdWlNHWHZWQQ9XhrVldvV3DEY/edit?gid=2021842569
 */
export function exportOfficialLicenseXlsx(
  data: DocxLicensePayload,
  filename?: string,
  options: { useTemplatePlaceholders?: boolean } = {}
): void {
  const xlsxBytes = generateOfficialXlsxBytes(data, options);
  const blob = new Blob([xlsxBytes.buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const suffix = options.useTemplatePlaceholders ? '_แม่แบบ_Tag' : '';
  const rawName = filename || `ใบอนุญาต_${(data.bizName || 'อภ2').replace(/\s+/g, '_')}${suffix}`;
  const safeName = rawName.replace(/[\\/:*?"<>|]/g, '').replace(/\.xlsx?$/i, '').trim() || 'ใบอนุญาต_อภ2';
  a.download = `${safeName}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================================
// Pure TypeScript ZIP Builder
// ============================================================================

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function base64ToUint8Array(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function writeUInt16LE(buf: Uint8Array, val: number, offset: number) {
  buf[offset] = val & 0xff;
  buf[offset + 1] = (val >>> 8) & 0xff;
}

function writeUInt32LE(buf: Uint8Array, val: number, offset: number) {
  buf[offset] = val & 0xff;
  buf[offset + 1] = (val >>> 8) & 0xff;
  buf[offset + 2] = (val >>> 16) & 0xff;
  buf[offset + 3] = (val >>> 24) & 0xff;
}

function buildZipFromEntries(
  staticEntries: StaticZipEntry[],
  dynamicFiles: { name: string; data: Uint8Array }[]
): Uint8Array {
  interface PreparedEntry {
    nameBytes: Uint8Array;
    method: number;
    crc32: number;
    compSize: number;
    uncompSize: number;
    compData: Uint8Array;
  }

  const allEntries: PreparedEntry[] = [];

  for (const s of staticEntries) {
    allEntries.push({
      nameBytes: stringToUint8Array(s.name),
      method: s.method,
      crc32: s.crc32 >>> 0,
      compSize: s.compSize,
      uncompSize: s.uncompSize,
      compData: base64ToUint8Array(s.b64),
    });
  }

  for (const d of dynamicFiles) {
    allEntries.push({
      nameBytes: stringToUint8Array(d.name),
      method: 0, // STORE
      crc32: crc32(d.data),
      compSize: d.data.length,
      uncompSize: d.data.length,
      compData: d.data,
    });
  }

  let localTotalSize = 0;
  let cdTotalSize = 0;
  for (const e of allEntries) {
    localTotalSize += 30 + e.nameBytes.length + e.compData.length;
    cdTotalSize += 46 + e.nameBytes.length;
  }

  const out = new Uint8Array(localTotalSize + cdTotalSize + 22);
  let localOffset = 0;
  let cdOffset = localTotalSize;

  for (const e of allEntries) {
    const entryStart = localOffset;

    writeUInt32LE(out, 0x04034b50, localOffset);
    writeUInt16LE(out, 20, localOffset + 4);
    writeUInt16LE(out, 0, localOffset + 6);
    writeUInt16LE(out, e.method, localOffset + 8);
    writeUInt16LE(out, 0, localOffset + 10);
    writeUInt16LE(out, 0x0021, localOffset + 12);
    writeUInt32LE(out, e.crc32, localOffset + 14);
    writeUInt32LE(out, e.compSize, localOffset + 18);
    writeUInt32LE(out, e.uncompSize, localOffset + 22);
    writeUInt16LE(out, e.nameBytes.length, localOffset + 26);
    writeUInt16LE(out, 0, localOffset + 28);
    out.set(e.nameBytes, localOffset + 30);
    localOffset += 30 + e.nameBytes.length;

    out.set(e.compData, localOffset);
    localOffset += e.compData.length;

    writeUInt32LE(out, 0x02014b50, cdOffset);
    writeUInt16LE(out, 45, cdOffset + 4);
    writeUInt16LE(out, 20, cdOffset + 6);
    writeUInt16LE(out, 0, cdOffset + 8);
    writeUInt16LE(out, e.method, cdOffset + 10);
    writeUInt16LE(out, 0, cdOffset + 12);
    writeUInt16LE(out, 0x0021, cdOffset + 14);
    writeUInt32LE(out, e.crc32, cdOffset + 16);
    writeUInt32LE(out, e.compSize, cdOffset + 20);
    writeUInt32LE(out, e.uncompSize, cdOffset + 24);
    writeUInt16LE(out, e.nameBytes.length, cdOffset + 28);
    writeUInt16LE(out, 0, cdOffset + 30);
    writeUInt16LE(out, 0, cdOffset + 32);
    writeUInt16LE(out, 0, cdOffset + 34);
    writeUInt16LE(out, 0, cdOffset + 36);
    writeUInt32LE(out, 0, cdOffset + 38);
    writeUInt32LE(out, entryStart, cdOffset + 42);
    out.set(e.nameBytes, cdOffset + 46);
    cdOffset += 46 + e.nameBytes.length;
  }

  writeUInt32LE(out, 0x06054b50, cdOffset);
  writeUInt16LE(out, 0, cdOffset + 4);
  writeUInt16LE(out, 0, cdOffset + 6);
  writeUInt16LE(out, allEntries.length, cdOffset + 8);
  writeUInt16LE(out, allEntries.length, cdOffset + 10);
  writeUInt32LE(out, cdTotalSize, cdOffset + 12);
  writeUInt32LE(out, localTotalSize, cdOffset + 16);
  writeUInt16LE(out, 0, cdOffset + 20);

  return out;
}
