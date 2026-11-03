import { NhsoProject, NhsoFundSettings } from '../types/index.ts';
import {
  isProjectTrackingCompleted,
  isProjectTrackingExtended,
  isProjectTrackingRefunded,
} from './nhsoThemeAndTracking.ts';

// Exact styles.xml from the official master_nhso.xlsx (TH SarabunPSK fonts, borders, alignments, number formats)
const MASTER_STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:x14ac="http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"><fonts count="9"><font><sz val="10.0"/><color rgb="FF000000"/><name val="Arial"/><scheme val="minor"/></font><font><b/><sz val="18.0"/><color theme="1"/><name val="TH SarabunPSK"/></font><font><sz val="18.0"/><color theme="1"/><name val="TH SarabunPSK"/></font><font><sz val="20.0"/><color theme="1"/><name val="TH SarabunPSK"/></font><font><b/><sz val="20.0"/><color theme="1"/><name val="TH SarabunPSK"/></font><font/><font><b/><sz val="16.0"/><color theme="1"/><name val="TH SarabunPSK"/></font><font><sz val="20.0"/><color rgb="FFFF0000"/><name val="TH SarabunPSK"/></font><font><sz val="20.0"/><color rgb="FF000000"/><name val="TH SarabunPSK"/></font></fonts><fills count="11"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="lightGray"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFCE5CD"/><bgColor rgb="FFFCE5CD"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF93C47D"/><bgColor rgb="FF93C47D"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFB6D7A8"/><bgColor rgb="FFB6D7A8"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFD966"/><bgColor rgb="FFFFD966"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF9FC5E8"/><bgColor rgb="FF9FC5E8"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFD5A6BD"/><bgColor rgb="FFD5A6BD"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF6AA84F"/><bgColor rgb="FF6AA84F"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/><bgColor rgb="FFFFFFFF"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFFF00"/><bgColor rgb="FFFFFF00"/></patternFill></fill></fills><borders count="14"><border/><border><left style="thin"><color rgb="FF000000"/></left><right style="thin"><color rgb="FF000000"/></right><top style="thin"><color rgb="FF000000"/></top></border><border><left style="thin"><color rgb="FF000000"/></left><top style="thin"><color rgb="FF000000"/></top><bottom style="thin"><color rgb="FF000000"/></bottom></border><border><right style="thin"><color rgb="FF000000"/></right><top style="thin"><color rgb="FF000000"/></top><bottom style="thin"><color rgb="FF000000"/></bottom></border><border><left style="thin"><color rgb="FF000000"/></left><right style="thin"><color rgb="FF000000"/></right><bottom style="thin"><color rgb="FF000000"/></bottom></border><border><left style="thin"><color rgb="FF000000"/></left><right style="thin"><color rgb="FF000000"/></right><top style="thin"><color rgb="FF000000"/></top><bottom style="thin"><color rgb="FF000000"/></bottom></border><border><top style="thin"><color rgb="FF000000"/></top><bottom style="thin"><color rgb="FF000000"/></bottom></border><border><left style="thin"><color rgb="FF000000"/></left><right style="thin"><color rgb="FF000000"/></right></border><border><left style="thin"><color rgb="FF000000"/></left><top style="thin"><color rgb="FF000000"/></top></border><border><right style="thin"><color rgb="FF000000"/></right><top style="thin"><color rgb="FF000000"/></top></border><border><left style="thin"><color rgb="FF000000"/></left></border><border><right style="thin"><color rgb="FF000000"/></right></border><border><left style="thin"><color rgb="FF000000"/></left><bottom style="thin"><color rgb="FF000000"/></bottom></border><border><right style="thin"><color rgb="FF000000"/></right><bottom style="thin"><color rgb="FF000000"/></bottom></border></borders><cellStyleXfs count="1"><xf borderId="0" fillId="0" fontId="0" numFmtId="0" applyAlignment="1" applyFont="1"/></cellStyleXfs><cellXfs count="61"><xf borderId="0" fillId="0" fontId="3" numFmtId="0" xfId="0" applyAlignment="1" applyFont="1"><alignment readingOrder="0" shrinkToFit="0" vertical="top" wrapText="0"/></xf><xf borderId="0" fillId="2" fontId="1" numFmtId="0" xfId="0" applyAlignment="1" applyFill="1" applyFont="1"><alignment horizontal="center" readingOrder="0" vertical="top"/></xf><xf borderId="0" fillId="0" fontId="2" numFmtId="0" xfId="0" applyAlignment="1" applyFont="1"><alignment vertical="top"/></xf><xf borderId="0" fillId="0" fontId="2" numFmtId="0" xfId="0" applyAlignment="1" applyFont="1"><alignment shrinkToFit="0" vertical="top" wrapText="1"/></xf><xf borderId="0" fillId="0" fontId="1" numFmtId="0" xfId="0" applyAlignment="1" applyFont="1"><alignment readingOrder="0" vertical="top"/></xf><xf borderId="0" fillId="0" fontId="3" numFmtId="0" xfId="0" applyAlignment="1" applyFont="1"><alignment vertical="top"/></xf><xf borderId="0" fillId="3" fontId="2" numFmtId="0" xfId="0" applyAlignment="1" applyFill="1" applyFont="1"><alignment readingOrder="0" vertical="top"/></xf><xf borderId="0" fillId="0" fontId="3" numFmtId="0" xfId="0" applyAlignment="1" applyFont="1"><alignment shrinkToFit="0" vertical="top" wrapText="1"/></xf><xf borderId="0" fillId="0" fontId="2" numFmtId="0" xfId="0" applyAlignment="1" applyFont="1"><alignment readingOrder="0" vertical="top"/></xf><xf borderId="0" fillId="0" fontId="3" numFmtId="3" xfId="0" applyAlignment="1" applyFont="1" applyNumberFormat="1"><alignment vertical="top"/></xf><xf borderId="0" fillId="0" fontId="4" numFmtId="0" xfId="0" applyAlignment="1" applyFont="1"><alignment readingOrder="0" vertical="top"/></xf><xf borderId="1" fillId="3" fontId="1" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFill="1" applyFont="1"><alignment horizontal="center" readingOrder="0" vertical="center"/></xf><xf borderId="1" fillId="3" fontId="1" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFill="1" applyFont="1"><alignment horizontal="center" readingOrder="0" shrinkToFit="0" vertical="center" wrapText="1"/></xf><xf borderId="2" fillId="3" fontId="1" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFill="1" applyFont="1"><alignment horizontal="center" readingOrder="0" vertical="top"/></xf><xf borderId="3" fillId="0" fontId="3" numFmtId="0" xfId="0" applyBorder="1" applyFont="1"/><xf borderId="1" fillId="0" fontId="4" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFont="1"><alignment horizontal="center" vertical="center"/></xf><xf borderId="4" fillId="0" fontId="3" numFmtId="0" xfId="0" applyBorder="1" applyFont="1"/><xf borderId="5" fillId="3" fontId="1" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFill="1" applyFont="1"><alignment horizontal="center" readingOrder="0" vertical="top"/></xf><xf borderId="5" fillId="0" fontId="2" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFont="1"><alignment horizontal="center" readingOrder="0" vertical="top"/></xf><xf borderId="5" fillId="0" fontId="2" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFont="1"><alignment readingOrder="0" shrinkToFit="0" vertical="top" wrapText="1"/></xf><xf borderId="1" fillId="0" fontId="4" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFont="1"><alignment horizontal="center" shrinkToFit="0" vertical="center" wrapText="1"/></xf><xf borderId="5" fillId="0" fontId="2" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFont="1"><alignment readingOrder="0" vertical="top"/></xf><xf borderId="2" fillId="0" fontId="4" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFont="1"><alignment horizontal="center" readingOrder="0" shrinkToFit="0" vertical="center" wrapText="1"/></xf><xf borderId="6" fillId="0" fontId="3" numFmtId="0" xfId="0" applyBorder="1" applyFont="1"/><xf borderId="5" fillId="0" fontId="6" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFont="1"><alignment horizontal="center" readingOrder="0" shrinkToFit="0" vertical="center" wrapText="1"/></xf><xf borderId="5" fillId="0" fontId="2" numFmtId="3" xfId="0" applyAlignment="1" applyBorder="1" applyFont="1" applyNumberFormat="1"><alignment readingOrder="0" vertical="top"/></xf><xf borderId="5" fillId="0" fontId="6" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFont="1"><alignment horizontal="center" readingOrder="0" vertical="center"/></xf><xf borderId="5" fillId="0" fontId="6" numFmtId="3" xfId="0" applyAlignment="1" applyBorder="1" applyFont="1" applyNumberFormat="1"><alignment horizontal="center" readingOrder="0" vertical="center"/></xf><xf borderId="5" fillId="0" fontId="3" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFont="1"><alignment readingOrder="0" shrinkToFit="0" vertical="top" wrapText="1"/></xf><xf borderId="5" fillId="0" fontId="2" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFont="1"><alignment readingOrder="0" vertical="center"/></xf><xf borderId="5" fillId="0" fontId="2" numFmtId="3" xfId="0" applyAlignment="1" applyBorder="1" applyFont="1" applyNumberFormat="1"><alignment readingOrder="0" vertical="center"/></xf><xf borderId="5" fillId="0" fontId="3" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFont="1"><alignment horizontal="left" readingOrder="0" shrinkToFit="0" vertical="top" wrapText="1"/></xf><xf borderId="2" fillId="0" fontId="3" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFont="1"><alignment readingOrder="0" shrinkToFit="0" vertical="top" wrapText="1"/></xf><xf borderId="5" fillId="0" fontId="3" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFont="1"><alignment horizontal="center" readingOrder="0" shrinkToFit="0" vertical="top" wrapText="1"/></xf><xf borderId="7" fillId="0" fontId="3" numFmtId="0" xfId="0" applyBorder="1" applyFont="1"/><xf borderId="5" fillId="0" fontId="3" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFont="1"><alignment readingOrder="0" shrinkToFit="0" vertical="top" wrapText="1"/></xf><xf borderId="5" fillId="0" fontId="3" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFont="1"><alignment horizontal="center" readingOrder="0" shrinkToFit="0" vertical="top" wrapText="1"/></xf><xf borderId="5" fillId="0" fontId="3" numFmtId="3" xfId="0" applyAlignment="1" applyBorder="1" applyFont="1" applyNumberFormat="1"><alignment horizontal="center" readingOrder="0" shrinkToFit="0" vertical="top" wrapText="1"/></xf><xf borderId="5" fillId="0" fontId="3" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFont="1"><alignment horizontal="center" readingOrder="0" vertical="top"/></xf><xf borderId="5" fillId="4" fontId="2" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFill="1" applyFont="1"><alignment horizontal="center" readingOrder="0" vertical="top"/></xf><xf borderId="5" fillId="0" fontId="3" numFmtId="3" xfId="0" applyAlignment="1" applyBorder="1" applyFont="1" applyNumberFormat="1"><alignment horizontal="center" readingOrder="0" vertical="top"/></xf><xf borderId="5" fillId="4" fontId="2" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFill="1" applyFont="1"><alignment horizontal="center" readingOrder="0" shrinkToFit="0" vertical="top" wrapText="1"/></xf><xf borderId="5" fillId="4" fontId="2" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFill="1" applyFont="1"><alignment vertical="top"/></xf><xf borderId="7" fillId="0" fontId="3" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFont="1"><alignment readingOrder="0" shrinkToFit="0" vertical="top" wrapText="1"/></xf><xf borderId="5" fillId="4" fontId="2" numFmtId="3" xfId="0" applyAlignment="1" applyBorder="1" applyFill="1" applyFont="1" applyNumberFormat="1"><alignment horizontal="center" vertical="top"/></xf><xf borderId="5" fillId="0" fontId="2" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFont="1"><alignment vertical="top"/></xf><xf borderId="0" fillId="5" fontId="2" numFmtId="0" xfId="0" applyAlignment="1" applyFill="1" applyFont="1"><alignment readingOrder="0" vertical="top"/></xf><xf borderId="1" fillId="5" fontId="1" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFill="1" applyFont="1"><alignment horizontal="center" readingOrder="0" vertical="center"/></xf><xf borderId="1" fillId="5" fontId="1" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFill="1" applyFont="1"><alignment horizontal="center" readingOrder="0" shrinkToFit="0" vertical="center" wrapText="1"/></xf><xf borderId="1" fillId="5" fontId="1" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFill="1" applyFont="1"><alignment horizontal="center" readingOrder="0" vertical="top"/></xf><xf borderId="2" fillId="5" fontId="1" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFill="1" applyFont="1"><alignment horizontal="center" readingOrder="0" vertical="top"/></xf><xf borderId="5" fillId="5" fontId="1" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFill="1" applyFont="1"><alignment horizontal="center" readingOrder="0" vertical="top"/></xf><xf borderId="2" fillId="0" fontId="3" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFont="1"><alignment horizontal="right" readingOrder="0" vertical="top"/></xf><xf borderId="4" fillId="0" fontId="3" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFont="1"><alignment readingOrder="0" shrinkToFit="0" vertical="top" wrapText="1"/></xf><xf borderId="4" fillId="0" fontId="3" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFont="1"><alignment horizontal="left" readingOrder="0" shrinkToFit="0" vertical="top" wrapText="1"/></xf><xf borderId="5" fillId="0" fontId="4" numFmtId="3" xfId="0" applyAlignment="1" applyBorder="1" applyFont="1" applyNumberFormat="1"><alignment horizontal="center" vertical="top"/></xf><xf borderId="5" fillId="0" fontId="3" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFont="1"><alignment vertical="top"/></xf><xf borderId="7" fillId="0" fontId="3" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFont="1"><alignment horizontal="left" readingOrder="0" shrinkToFit="0" vertical="top" wrapText="1"/></xf><xf borderId="5" fillId="0" fontId="2" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFont="1"><alignment horizontal="center" readingOrder="0" shrinkToFit="0" vertical="top" wrapText="1"/></xf><xf borderId="0" fillId="0" fontId="3" numFmtId="0" xfId="0" applyAlignment="1" applyFont="1"><alignment readingOrder="0" vertical="top"/></xf><xf borderId="0" fillId="0" fontId="3" numFmtId="0" xfId="0" applyAlignment="1" applyFont="1"><alignment horizontal="center" readingOrder="0" vertical="top"/></xf></cellXfs><cellStyles count="1"><cellStyle xfId="0" name="Normal" builtinId="0"/></cellStyles></styleSheet>`;

// Pure TypeScript uncompressed ZIP builder (STORE method = 0, with CRC32) for generating valid .xlsx files
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
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

interface ZipEntry {
  name: string;
  data: Uint8Array;
}

function buildZip(entries: ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const localHeaders: Uint8Array[] = [];
  const centralHeaders: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes = entry.data;
    const crc = crc32(dataBytes);
    const size = dataBytes.length;

    // Local file header (30 + nameBytes.length)
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true); // signature
    lv.setUint16(4, 20, true); // version needed
    lv.setUint16(6, 0x0800, true); // UTF-8 flag
    lv.setUint16(8, 0, true); // method = 0 (STORE)
    lv.setUint16(10, 0, true); // mod time
    lv.setUint16(12, 0x5421, true); // mod date
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    localHeaders.push(localHeader, dataBytes);

    // Central directory header (46 + nameBytes.length)
    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralHeader.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true); // version made by
    cv.setUint16(6, 20, true); // version needed
    cv.setUint16(8, 0x0800, true); // UTF-8 flag
    cv.setUint16(10, 0, true); // method = 0 (STORE)
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0x5421, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);

    centralHeaders.push(centralHeader);
    offset += localHeader.length + dataBytes.length;
  }

  const centralDirSize = centralHeaders.reduce((acc, b) => acc + b.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralDirSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const totalSize = offset + centralDirSize + eocd.length;
  const result = new Uint8Array(totalSize);
  let pos = 0;
  for (const b of localHeaders) {
    result.set(b, pos);
    pos += b.length;
  }
  for (const b of centralHeaders) {
    result.set(b, pos);
    pos += b.length;
  }
  result.set(eocd, pos);
  return result;
}

const xmlEscape = (str?: string): string => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

export interface ExportFlattenedRow {
  type: 'activity_header' | 'budget_line' | 'empty_line';
  headerText?: string;
  groupIndex: number;
  line?: {
    name?: string;
    quantity?: number;
    unit?: string;
    unitPrice?: number;
    total?: number;
  };
}

export async function exportSingleProjectToMasterXlsx(params: {
  project: NhsoProject;
  categoryTitle: string;
  activityGroups: Array<{
    activityName?: string;
    activities?: string;
    objectives?: string;
    targetGroup?: string;
    kpi?: string;
    location?: string;
    duration?: string;
  }>;
  flattenedRows: ExportFlattenedRow[];
  settings: NhsoFundSettings;
  filename: string;
}): Promise<void> {
  const { project, categoryTitle, activityGroups, flattenedRows, settings, filename } = params;
  const encoder = new TextEncoder();

  // Fetch official NHSO Master Logo binary if available
  let logoBytes: Uint8Array | null = null;
  try {
    const res = await fetch('/Logo_NHSO_MASTER_Thai_2.jpg');
    if (res.ok) {
      const buf = await res.arrayBuffer();
      logoBytes = new Uint8Array(buf);
    }
  } catch (_) {
    logoBytes = null;
  }

  // Build SharedStrings table
  const sharedStrings: string[] = [];
  const ssMap = new Map<string, number>();
  const addStr = (s: string): number => {
    const val = s ?? '';
    const existing = ssMap.get(val);
    if (existing !== undefined) return existing;
    const idx = sharedStrings.length;
    sharedStrings.push(val);
    ssMap.set(val, idx);
    return idx;
  };

  const strCell = (ref: string, style: number, text: string) => {
    const idx = addStr(text);
    return `<c r="${ref}" s="${style}" t="s"><v>${idx}</v></c>`;
  };
  const numCell = (ref: string, style: number, num: number) => {
    return `<c r="${ref}" s="${style}"><v>${Number(num || 0)}</v></c>`;
  };
  const emptyCell = (ref: string, style: number) => `<c r="${ref}" s="${style}"/>`;

  const merges: string[] = [
    'A4:A5',
    'B4:B5',
    'C4:C5',
    'D4:D5',
    'E4:E5',
    'F4:F5',
    'G4:G5',
    'H4:L4',
    'M4:M5',
  ];

  const rowsXml: string[] = [];

  // Row 1: Top spacer row (height for top part of NHSO logo)
  rowsXml.push(
    `<row r="1" ht="20.0" customHeight="1">${emptyCell('A1', 5)}${emptyCell('B1', 5)}${emptyCell('C1', 5)}${emptyCell('D1', 5)}${emptyCell('E1', 5)}${emptyCell('F1', 5)}${emptyCell('G1', 5)}${emptyCell('H1', 7)}${emptyCell('I1', 5)}${emptyCell('J1', 5)}${emptyCell('K1', 9)}${emptyCell('L1', 9)}${emptyCell('M1', 5)}</row>`
  );

  // Row 2: Category Title in A2 (s=10: TH SarabunPSK 20pt Bold)
  rowsXml.push(
    `<row r="2" ht="24.0" customHeight="1">${strCell('A2', 10, categoryTitle)}${emptyCell('B2', 5)}${emptyCell('C2', 5)}${emptyCell('D2', 5)}${emptyCell('E2', 5)}${emptyCell('F2', 5)}${emptyCell('G2', 5)}${emptyCell('H2', 7)}${emptyCell('I2', 5)}${emptyCell('J2', 5)}${emptyCell('K2', 9)}${emptyCell('L2', 9)}${emptyCell('M2', 5)}</row>`
  );

  // Row 3: Thin spacer row below logo / category header
  rowsXml.push(
    `<row r="3" ht="8.0" customHeight="1">${emptyCell('A3', 5)}${emptyCell('B3', 5)}${emptyCell('C3', 5)}${emptyCell('D3', 5)}${emptyCell('E3', 5)}${emptyCell('F3', 5)}${emptyCell('G3', 5)}${emptyCell('H3', 7)}${emptyCell('I3', 5)}${emptyCell('J3', 5)}${emptyCell('K3', 9)}${emptyCell('L3', 9)}${emptyCell('M3', 5)}</row>`
  );

  // Row 4 & Row 5: 13-Column Table Headers (exact styles from sheet3.xml)
  rowsXml.push(
    `<row r="4" ht="29.25" customHeight="1">` +
      strCell('A4', 15, 'แผนงาน/โครงการ') +
      strCell('B4', 15, 'กิจกรรม') +
      strCell('C4', 15, 'วัตถุประสงค์') +
      strCell('D4', 15, 'กลุ่มเป้าหมาย') +
      strCell('E4', 15, 'ตัวชี้วัด (KPI)') +
      strCell('F4', 15, 'พื้นที่ดำเนินการ') +
      strCell('G4', 20, 'ระยะเวลาดำเนินการ') +
      strCell('H4', 22, 'งบประมาณ') +
      emptyCell('I4', 23) +
      emptyCell('J4', 23) +
      emptyCell('K4', 23) +
      emptyCell('L4', 14) +
      strCell('M4', 15, 'ผู้รับผิดชอบ') +
      `</row>`
  );

  rowsXml.push(
    `<row r="5" ht="29.25" customHeight="1">` +
      emptyCell('A5', 16) +
      emptyCell('B5', 16) +
      emptyCell('C5', 16) +
      emptyCell('D5', 16) +
      emptyCell('E5', 16) +
      emptyCell('F5', 16) +
      emptyCell('G5', 16) +
      strCell('H5', 24, 'รายการค่าใช้จ่าย') +
      strCell('I5', 26, 'จำนวน') +
      strCell('J5', 26, 'หน่วย') +
      strCell('K5', 27, 'ราคาต่อหน่วย') +
      strCell('L5', 27, 'รวมเงิน (บาท)') +
      emptyCell('M5', 16) +
      `</row>`
  );

  // Data rows start at Row 6
  const startRow = 6;
  const totalDataRows = Math.max(1, flattenedRows.length);
  const lastDataRow = startRow + totalDataRows - 1;
  const totalRow = lastDataRow + 1;

  // Merge Column A (Project Name) across all data rows
  if (lastDataRow > startRow) {
    merges.push(`A${startRow}:A${lastDataRow}`);
  }
  // Merge Column M (Responsible Person) from startRow through totalRow (matching M6:M16 in sheet3.xml)
  merges.push(`M${startRow}:M${totalRow}`);

  // Group row ranges for merging Columns B..G per activityGroup
  activityGroups.forEach((_, gIdx) => {
    const indices = flattenedRows
      .map((r, idx) => (r.groupIndex === gIdx ? idx : -1))
      .filter((idx) => idx !== -1);
    if (indices.length > 1) {
      const r1 = startRow + indices[0];
      const r2 = startRow + indices[indices.length - 1];
      ['B', 'C', 'D', 'E', 'F', 'G'].forEach((col) => {
        merges.push(`${col}${r1}:${col}${r2}`);
      });
    }
  });

  flattenedRows.forEach((rowItem, idx) => {
    const rNum = startRow + idx;
    const grp = activityGroups[rowItem.groupIndex] || {};
    const isFirstInProject = idx === 0;
    const isFirstInGroup =
      idx === 0 || flattenedRows[idx - 1].groupIndex !== rowItem.groupIndex;

    let cells = '';

    // Col A: Project Name
    if (isFirstInProject) {
      cells += strCell(`A${rNum}`, 28, project.projectName || '');
    } else {
      cells += emptyCell(`A${rNum}`, 28);
    }

    // Cols B..G: Group metadata
    if (isFirstInGroup) {
      cells += strCell(`B${rNum}`, 28, grp.activities || '');
      cells += strCell(`C${rNum}`, 28, grp.objectives || '');
      cells += strCell(`D${rNum}`, 28, grp.targetGroup || '');
      cells += strCell(`E${rNum}`, 28, grp.kpi || '');
      cells += strCell(`F${rNum}`, 28, grp.location || '');
      cells += strCell(`G${rNum}`, 33, grp.duration || '');
    } else {
      cells +=
        emptyCell(`B${rNum}`, 28) +
        emptyCell(`C${rNum}`, 28) +
        emptyCell(`D${rNum}`, 28) +
        emptyCell(`E${rNum}`, 28) +
        emptyCell(`F${rNum}`, 28) +
        emptyCell(`G${rNum}`, 33);
    }

    // Cols H..L: Budget header or line
    if (rowItem.type === 'activity_header') {
      merges.push(`H${rNum}:L${rNum}`);
      cells +=
        strCell(`H${rNum}`, 32, rowItem.headerText || grp.activityName || '') +
        emptyCell(`I${rNum}`, 23) +
        emptyCell(`J${rNum}`, 23) +
        emptyCell(`K${rNum}`, 23) +
        emptyCell(`L${rNum}`, 14);
    } else if (rowItem.line) {
      cells +=
        strCell(`H${rNum}`, 35, rowItem.line.name || '') +
        numCell(`I${rNum}`, 36, Number(rowItem.line.quantity || 0)) +
        strCell(`J${rNum}`, 36, rowItem.line.unit || '') +
        numCell(`K${rNum}`, 37, Number(rowItem.line.unitPrice || 0)) +
        numCell(`L${rNum}`, 37, Number(rowItem.line.total || 0));
    } else {
      merges.push(`H${rNum}:K${rNum}`);
      cells +=
        emptyCell(`H${rNum}`, 35) +
        emptyCell(`I${rNum}`, 35) +
        emptyCell(`J${rNum}`, 35) +
        emptyCell(`K${rNum}`, 35) +
        numCell(`L${rNum}`, 37, 0);
    }

    // Col M: Responsible Person
    if (isFirstInProject) {
      cells += strCell(`M${rNum}`, 33, project.responsiblePerson || project.proposingOrg || '');
    } else {
      cells += emptyCell(`M${rNum}`, 33);
    }

    rowsXml.push(`<row r="${rNum}">${cells}</row>`);
  });

  // Total Row: A{totalRow}:K{totalRow} merged right-aligned (s=52), L{totalRow} bold total (s=55), M{totalRow} empty border (s=16)
  merges.push(`A${totalRow}:K${totalRow}`);
  rowsXml.push(
    `<row r="${totalRow}" ht="26.0" customHeight="1">` +
      strCell(`A${totalRow}`, 52, 'รวมเป็นเงินทั้งสิ้น (บาท)') +
      emptyCell(`B${totalRow}`, 23) +
      emptyCell(`C${totalRow}`, 23) +
      emptyCell(`D${totalRow}`, 23) +
      emptyCell(`E${totalRow}`, 23) +
      emptyCell(`F${totalRow}`, 23) +
      emptyCell(`G${totalRow}`, 23) +
      emptyCell(`H${totalRow}`, 23) +
      emptyCell(`I${totalRow}`, 23) +
      emptyCell(`J${totalRow}`, 23) +
      emptyCell(`K${totalRow}`, 14) +
      numCell(`L${totalRow}`, 55, Number(project.budgetRequested || 0)) +
      emptyCell(`M${totalRow}`, 16) +
      `</row>`
  );

  // 3 Signer Rows placed at totalRow + 3 (matching R20..R22 in sheet3.xml)
  const sigRow1 = totalRow + 3;
  const sigRow2 = totalRow + 4;
  const sigRow3 = totalRow + 5;

  const proposerName = project.signers?.proposerName || '................................................';
  const proposerTitle = project.signers?.proposerTitle || 'ผู้เสนอโครงการ';
  const endorserName = project.signers?.endorserName || settings.defaultEndorserName;
  const endorserTitle = project.signers?.endorserTitle || settings.defaultEndorserTitle;
  const approverName = project.signers?.approverName || settings.defaultApproverName;
  const approverTitle = project.signers?.approverTitle || settings.defaultApproverTitle;

  rowsXml.push(
    `<row r="${sigRow1}" ht="24.0" customHeight="1">` +
      strCell(`B${sigRow1}`, 59, 'ผู้เสนอ ........................................................') +
      strCell(`E${sigRow1}`, 59, 'ผู้เห็นชอบ ..................................................') +
      strCell(`I${sigRow1}`, 59, 'ผู้อนุมัติ ........................................................') +
      `</row>`
  );
  rowsXml.push(
    `<row r="${sigRow2}" ht="24.0" customHeight="1">` +
      strCell(`B${sigRow2}`, 59, `        (${proposerName})`) +
      strCell(`E${sigRow2}`, 59, `                  (${endorserName})`) +
      strCell(`I${sigRow2}`, 59, `                   (${approverName})`) +
      `</row>`
  );
  rowsXml.push(
    `<row r="${sigRow3}" ht="24.0" customHeight="1">` +
      strCell(`B${sigRow3}`, 59, proposerTitle) +
      strCell(`E${sigRow3}`, 59, `              ${endorserTitle}`) +
      strCell(`I${sigRow3}`, 59, `               ${approverTitle}`) +
      `</row>`
  );

  const mergeXml = `<mergeCells count="${merges.length}">${merges
    .map((m) => `<mergeCell ref="${m}"/>`)
    .join('')}</mergeCells>`;

  const sheetXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>` +
    `<sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews>` +
    `<sheetFormatPr defaultRowHeight="21.0"/>` +
    `<cols>` +
    `<col customWidth="1" min="1" max="1" width="17.38"/>` +
    `<col customWidth="1" min="2" max="3" width="24.0"/>` +
    `<col customWidth="1" min="4" max="4" width="17.63"/>` +
    `<col customWidth="1" min="5" max="5" width="22.25"/>` +
    `<col customWidth="1" min="6" max="6" width="14.13"/>` +
    `<col customWidth="1" min="7" max="7" width="15.25"/>` +
    `<col customWidth="1" min="8" max="8" width="16.75"/>` +
    `<col customWidth="1" min="9" max="9" width="6.25"/>` +
    `<col customWidth="1" min="10" max="10" width="6.5"/>` +
    `<col customWidth="1" min="11" max="11" width="10.88"/>` +
    `<col customWidth="1" min="12" max="12" width="11.5"/>` +
    `<col customWidth="1" min="13" max="13" width="12.0"/>` +
    `</cols>` +
    `<sheetData>${rowsXml.join('')}</sheetData>` +
    mergeXml +
    `<printOptions horizontalCentered="1"/>` +
    `<pageMargins bottom="0.3937" footer="0.0" header="0.0" left="0.25" right="0.25" top="0.3937"/>` +
    `<pageSetup fitToHeight="0" fitToWidth="1" paperSize="9" orientation="landscape" pageOrder="overThenDown"/>` +
    (logoBytes ? `<drawing r:id="rId1"/>` : '') +
    `</worksheet>`;

  const sstXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${sharedStrings.length}" uniqueCount="${sharedStrings.length}">` +
    sharedStrings.map((s) => `<si><t xml:space="preserve">${xmlEscape(s)}</t></si>`).join('') +
    `</sst>`;

  const workbookXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheets><sheet name="แบบเสนอโครงการ" sheetId="1" r:id="rId1"/></sheets>` +
    `<definedNames><definedName localSheetId="0" name="_xlnm.Print_Titles">'แบบเสนอโครงการ'!$1:$5</definedName></definedNames>` +
    `</workbook>`;

  const workbookRelsXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
    `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    `<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>` +
    `</Relationships>`;

  const rootRelsXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
    `</Relationships>`;

  const contentTypesXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    (logoBytes ? `<Default Extension="jpg" ContentType="image/jpeg"/>` : '') +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
    `<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>` +
    (logoBytes
      ? `<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`
      : '') +
    `</Types>`;

  const entries: ZipEntry[] = [
    { name: '[Content_Types].xml', data: encoder.encode(contentTypesXml) },
    { name: '_rels/.rels', data: encoder.encode(rootRelsXml) },
    { name: 'xl/workbook.xml', data: encoder.encode(workbookXml) },
    { name: 'xl/_rels/workbook.xml.rels', data: encoder.encode(workbookRelsXml) },
    { name: 'xl/styles.xml', data: encoder.encode(MASTER_STYLES_XML) },
    { name: 'xl/sharedStrings.xml', data: encoder.encode(sstXml) },
    { name: 'xl/worksheets/sheet1.xml', data: encoder.encode(sheetXml) },
  ];

  if (logoBytes) {
    const sheetRelsXml =
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>` +
      `</Relationships>`;

    // Exact drawing2.xml anchor from master_nhso.xlsx (Col 11 [L], colOff=342900, Row 0, cx=1428750, cy=619125)
    const drawingXml =
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
      `<xdr:oneCellAnchor>` +
      `<xdr:from><xdr:col>11</xdr:col><xdr:colOff>342900</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>` +
      `<xdr:ext cx="1428750" cy="619125"/>` +
      `<xdr:pic>` +
      `<xdr:nvPicPr><xdr:cNvPr id="0" name="image1.jpg" title="สปสช."/><xdr:cNvPicPr preferRelativeResize="0"/></xdr:nvPicPr>` +
      `<xdr:blipFill><a:blip cstate="print" r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>` +
      `<xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></xdr:spPr>` +
      `</xdr:pic>` +
      `<xdr:clientData fLocksWithSheet="0"/>` +
      `</xdr:oneCellAnchor>` +
      `</xdr:wsDr>`;

    const drawingRelsXml =
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.jpg"/>` +
      `</Relationships>`;

    entries.push(
      { name: 'xl/worksheets/_rels/sheet1.xml.rels', data: encoder.encode(sheetRelsXml) },
      { name: 'xl/drawings/drawing1.xml', data: encoder.encode(drawingXml) },
      { name: 'xl/drawings/_rels/drawing1.xml.rels', data: encoder.encode(drawingRelsXml) },
      { name: 'xl/media/image1.jpg', data: logoBytes }
    );
  }

  const zipBytes = buildZip(entries);
  const blob = new Blob([zipBytes as unknown as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportSummaryToMasterXlsx(params: {
  targetYear: string;
  summaryProjects: NhsoProject[];
  groupedByCategory: Record<number, NhsoProject[]>;
  totalSummaryBudget: number;
  filename: string;
}): Promise<void> {
  const { targetYear, summaryProjects, groupedByCategory, totalSummaryBudget, filename } = params;
  const encoder = new TextEncoder();

  const sharedStrings: string[] = [];
  const ssMap = new Map<string, number>();
  const addStr = (s: string): number => {
    const val = s ?? '';
    const existing = ssMap.get(val);
    if (existing !== undefined) return existing;
    const idx = sharedStrings.length;
    sharedStrings.push(val);
    ssMap.set(val, idx);
    return idx;
  };

  const strCell = (ref: string, style: number, text: string) => {
    const idx = addStr(text);
    return `<c r="${ref}" s="${style}" t="s"><v>${idx}</v></c>`;
  };
  const numCell = (ref: string, style: number, num: number) =>
    `<c r="${ref}" s="${style}"><v>${Number(num || 0)}</v></c>`;
  const emptyCell = (ref: string, style: number) => `<c r="${ref}" s="${style}"/>`;

  const merges: string[] = ['A1:F1', 'A2:F2'];
  const rowsXml: string[] = [];

  rowsXml.push(
    `<row r="1" ht="27.75" customHeight="1">${strCell(
      'A1',
      15,
      'สรุปโครงการที่ขอรับการสนับสนุนงบประมาณกองทุนหลักประกันสุขภาพระดับท้องถิ่น เทศบาลตำบลบางเป้า'
    )}</row>`
  );
  rowsXml.push(
    `<row r="2" ht="24.0" customHeight="1">${strCell(
      'A2',
      15,
      `ครั้งที่ 1 ประจำปีงบประมาณ ${targetYear}`
    )}</row>`
  );
  rowsXml.push(
    `<row r="4" ht="22.0" customHeight="1">${strCell(
      'A4',
      10,
      `จำนวน ${summaryProjects.length} โครงการ`
    )}</row>`
  );

  let r = 5;
  for (const [catNumStr, projectsInCat] of Object.entries(groupedByCategory)) {
    const cNum = Number(catNumStr);
    const subtotal = projectsInCat.reduce((s, p) => s + p.budgetRequested, 0);

    merges.push(`A${r}:C${r}`);
    rowsXml.push(
      `<row r="${r}" ht="22.0" customHeight="1">${strCell(
        `A${r}`,
        1,
        `ประเภทที่ ${cNum}     จำนวน  ${projectsInCat.length}  โครงการ`
      )}</row>`
    );
    r += 2;

    const h1 = r;
    const h2 = r + 1;
    merges.push(`A${h1}:A${h2}`, `B${h1}:B${h2}`, `C${h1}:C${h2}`, `D${h1}:D${h2}`, `E${h1}:F${h1}`);
    rowsXml.push(
      `<row r="${h1}" ht="22.0" customHeight="1">` +
        strCell(`A${h1}`, 15, 'ลำดับที่') +
        strCell(`B${h1}`, 15, 'ชื่อโครงการ') +
        strCell(`C${h1}`, 15, 'ผู้ขอรับงบ') +
        strCell(`D${h1}`, 20, 'งบประมาณ \n(บาท)') +
        strCell(`E${h1}`, 22, 'ความเห็นกรรมการฯ') +
        emptyCell(`F${h1}`, 14) +
        `</row>`
    );
    rowsXml.push(
      `<row r="${h2}" ht="22.0" customHeight="1">` +
        emptyCell(`A${h2}`, 16) +
        emptyCell(`B${h2}`, 16) +
        emptyCell(`C${h2}`, 16) +
        emptyCell(`D${h2}`, 16) +
        strCell(`E${h2}`, 26, 'อนุมัติ') +
        strCell(`F${h2}`, 26, 'ไม่อนุมัติ') +
        `</row>`
    );
    r += 2;

    projectsInCat.forEach((p, idx) => {
      const approvedMark =
        p.status === 'approved' || p.committeeDecision === 'approve' ? '✓' : '';
      const rejectedMark =
        p.status === 'rejected' || p.committeeDecision === 'reject' ? '✗' : '';
      rowsXml.push(
        `<row r="${r}">` +
          numCell(`A${r}`, 36, Number(p.orderNumber || idx + 1)) +
          strCell(`B${r}`, 35, p.projectName || '') +
          strCell(`C${r}`, 36, p.proposingOrg || '') +
          numCell(`D${r}`, 37, Number(p.budgetRequested || 0)) +
          strCell(`E${r}`, 36, approvedMark) +
          strCell(`F${r}`, 36, rejectedMark) +
          `</row>`
      );
      r += 1;
    });

    rowsXml.push(
      `<row r="${r}" ht="24.0" customHeight="1">` +
        strCell(`A${r}`, 55, 'รวม') +
        strCell(`B${r}`, 55, `${projectsInCat.length} โครงการ`) +
        emptyCell(`C${r}`, 35) +
        numCell(`D${r}`, 55, subtotal) +
        emptyCell(`E${r}`, 35) +
        emptyCell(`F${r}`, 35) +
        `</row>`
    );
    r += 2;
  }

  merges.push(`A${r}:B${r}`, `C${r}:D${r}`);
  rowsXml.push(
    `<row r="${r}" ht="28.0" customHeight="1">` +
      strCell(`A${r}`, 10, `รวมทั้งหมด ${summaryProjects.length} โครงการ`) +
      emptyCell(`B${r}`, 5) +
      numCell(`C${r}`, 55, totalSummaryBudget) +
      emptyCell(`D${r}`, 5) +
      `</row>`
  );

  const mergeXml = `<mergeCells count="${merges.length}">${merges
    .map((m) => `<mergeCell ref="${m}"/>`)
    .join('')}</mergeCells>`;

  const sheetXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>` +
    `<sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews>` +
    `<sheetFormatPr defaultRowHeight="21.0"/>` +
    `<cols>` +
    `<col customWidth="1" min="1" max="1" width="7.75"/>` +
    `<col customWidth="1" min="2" max="2" width="69.5"/>` +
    `<col customWidth="1" min="3" max="3" width="20.25"/>` +
    `<col customWidth="1" min="4" max="5" width="10.25"/>` +
    `<col customWidth="1" min="6" max="6" width="10.5"/>` +
    `</cols>` +
    `<sheetData>${rowsXml.join('')}</sheetData>` +
    mergeXml +
    `<printOptions horizontalCentered="1"/>` +
    `<pageMargins bottom="0.3937" footer="0.0" header="0.0" left="0.25" right="0.25" top="0.3937"/>` +
    `<pageSetup fitToHeight="0" fitToWidth="1" paperSize="9" orientation="landscape"/>` +
    `</worksheet>`;

  const sstXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${sharedStrings.length}" uniqueCount="${sharedStrings.length}">` +
    sharedStrings.map((s) => `<si><t xml:space="preserve">${xmlEscape(s)}</t></si>`).join('') +
    `</sst>`;

  const workbookXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheets><sheet name="ภาพรวม" sheetId="1" r:id="rId1"/></sheets>` +
    `</workbook>`;

  const workbookRelsXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
    `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    `<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>` +
    `</Relationships>`;

  const rootRelsXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
    `</Relationships>`;

  const contentTypesXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
    `<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>` +
    `</Types>`;

  const entries: ZipEntry[] = [
    { name: '[Content_Types].xml', data: encoder.encode(contentTypesXml) },
    { name: '_rels/.rels', data: encoder.encode(rootRelsXml) },
    { name: 'xl/workbook.xml', data: encoder.encode(workbookXml) },
    { name: 'xl/_rels/workbook.xml.rels', data: encoder.encode(workbookRelsXml) },
    { name: 'xl/styles.xml', data: encoder.encode(MASTER_STYLES_XML) },
    { name: 'xl/sharedStrings.xml', data: encoder.encode(sstXml) },
    { name: 'xl/worksheets/sheet1.xml', data: encoder.encode(sheetXml) },
  ];

  const zipBytes = buildZip(entries);
  const blob = new Blob([zipBytes as unknown as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const ATTACHMENT2_STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="5">
    <font><sz val="16.0"/><color rgb="FF000000"/><name val="TH SarabunPSK"/></font>
    <font><b/><sz val="16.0"/><color rgb="FF000000"/><name val="TH SarabunPSK"/></font>
    <font><b/><sz val="18.0"/><color rgb="FF000000"/><name val="TH SarabunPSK"/></font>
    <font><b/><sz val="16.0"/><color rgb="FFFFFFFF"/><name val="TH SarabunPSK"/></font>
    <font><sz val="15.0"/><color rgb="FF000000"/><name val="TH SarabunPSK"/></font>
  </fonts>
  <fills count="15">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFCE4D6"/><bgColor rgb="FFFCE4D6"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFA9D08E"/><bgColor rgb="FFA9D08E"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFD966"/><bgColor rgb="FFFFD966"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF9BC2E6"/><bgColor rgb="FF9BC2E6"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFD5A6BD"/><bgColor rgb="FFD5A6BD"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF4472C4"/><bgColor rgb="FF4472C4"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF70AD47"/><bgColor rgb="FF70AD47"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFE699"/><bgColor rgb="FFFFE699"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFB4DECB"/><bgColor rgb="FFB4DECB"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF8CBAD"/><bgColor rgb="FFF8CBAD"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFD9D2E9"/><bgColor rgb="FFD9D2E9"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFB4A7D6"/><bgColor rgb="FFB4A7D6"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFA2C4C9"/><bgColor rgb="FFA2C4C9"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border/>
    <border>
      <left style="thin"><color rgb="FF000000"/></left>
      <right style="thin"><color rgb="FF000000"/></right>
      <top style="thin"><color rgb="FF000000"/></top>
      <bottom style="thin"><color rgb="FF000000"/></bottom>
    </border>
  </borders>
  <cellStyleXfs count="1"><xf borderId="0" fillId="0" fontId="0" numFmtId="0"/></cellStyleXfs>
  <cellXfs count="30">
    <!-- 0: Normal unbordered -->
    <xf borderId="0" fillId="0" fontId="0" numFmtId="0" xfId="0" applyAlignment="1" applyFont="1"><alignment vertical="center"/></xf>
    <!-- 1: Peach Title Banner centered bold 18pt -->
    <xf borderId="0" fillId="2" fontId="2" numFmtId="0" xfId="0" applyAlignment="1" applyFill="1" applyFont="1"><alignment horizontal="center" vertical="center"/></xf>
    <!-- 2: Bold unbordered left 16pt -->
    <xf borderId="0" fillId="0" fontId="1" numFmtId="0" xfId="0" applyAlignment="1" applyFont="1"><alignment horizontal="left" vertical="center"/></xf>
    <!-- 3..6: Category Banner unbordered (Cat1=3, Cat2=4, Cat3=5, Cat7=6) -->
    <xf borderId="0" fillId="3" fontId="1" numFmtId="0" xfId="0" applyAlignment="1" applyFill="1" applyFont="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf borderId="0" fillId="4" fontId="1" numFmtId="0" xfId="0" applyAlignment="1" applyFill="1" applyFont="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf borderId="0" fillId="5" fontId="1" numFmtId="0" xfId="0" applyAlignment="1" applyFill="1" applyFont="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf borderId="0" fillId="6" fontId="1" numFmtId="0" xfId="0" applyAlignment="1" applyFill="1" applyFont="1"><alignment horizontal="left" vertical="center"/></xf>
    <!-- 7..10: Category Header / Subtotal bordered centered bold (Cat1=7, Cat2=8, Cat3=9, Cat7=10) -->
    <xf borderId="1" fillId="3" fontId="1" numFmtId="3" xfId="0" applyAlignment="1" applyBorder="1" applyFill="1" applyFont="1" applyNumberFormat="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf borderId="1" fillId="4" fontId="1" numFmtId="3" xfId="0" applyAlignment="1" applyBorder="1" applyFill="1" applyFont="1" applyNumberFormat="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf borderId="1" fillId="5" fontId="1" numFmtId="3" xfId="0" applyAlignment="1" applyBorder="1" applyFill="1" applyFont="1" applyNumberFormat="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf borderId="1" fillId="6" fontId="1" numFmtId="3" xfId="0" applyAlignment="1" applyBorder="1" applyFill="1" applyFont="1" applyNumberFormat="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <!-- 11: Data cell centered bordered -->
    <xf borderId="1" fillId="0" fontId="0" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFont="1"><alignment horizontal="center" vertical="center"/></xf>
    <!-- 12: Data cell left bordered wrap -->
    <xf borderId="1" fillId="0" fontId="0" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFont="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
    <!-- 13: Data cell number right/center bordered -->
    <xf borderId="1" fillId="0" fontId="0" numFmtId="3" xfId="0" applyAlignment="1" applyBorder="1" applyFont="1" applyNumberFormat="1"><alignment horizontal="right" vertical="center"/></xf>
    <!-- 14: Data cell checkmark centered bold -->
    <xf borderId="1" fillId="0" fontId="1" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFont="1"><alignment horizontal="center" vertical="center"/></xf>
    <!-- 15..20: Org colored cells bordered left (15=Yellow, 16=Mint, 17=Pink, 18=Blue, 19=Peach, 20=Lavender) -->
    <xf borderId="1" fillId="9" fontId="0" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFill="1" applyFont="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf borderId="1" fillId="10" fontId="0" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFill="1" applyFont="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf borderId="1" fillId="6" fontId="0" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFill="1" applyFont="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf borderId="1" fillId="5" fontId="0" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFill="1" applyFont="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf borderId="1" fillId="11" fontId="0" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFill="1" applyFont="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf borderId="1" fillId="12" fontId="0" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFill="1" applyFont="1"><alignment horizontal="left" vertical="center"/></xf>
    <!-- 21: Grand Total Blue Header (white bold text) -->
    <xf borderId="1" fillId="7" fontId="3" numFmtId="0" xfId="0" applyAlignment="1" applyBorder="1" applyFill="1" applyFont="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <!-- 22: Grand Total Green Data (white bold text, number format) -->
    <xf borderId="1" fillId="8" fontId="3" numFmtId="3" xfId="0" applyAlignment="1" applyBorder="1" applyFill="1" applyFont="1" applyNumberFormat="1"><alignment horizontal="center" vertical="center"/></xf>
    <!-- 23..26: Cat 4,5,6,8 Banners & Headers -->
    <xf borderId="0" fillId="13" fontId="1" numFmtId="0" xfId="0" applyAlignment="1" applyFill="1" applyFont="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf borderId="1" fillId="13" fontId="1" numFmtId="3" xfId="0" applyAlignment="1" applyBorder="1" applyFill="1" applyFont="1" applyNumberFormat="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf borderId="0" fillId="14" fontId="1" numFmtId="0" xfId="0" applyAlignment="1" applyFill="1" applyFont="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf borderId="1" fillId="14" fontId="1" numFmtId="3" xfId="0" applyAlignment="1" applyBorder="1" applyFill="1" applyFont="1" applyNumberFormat="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle xfId="0" name="Normal" builtinId="0"/></cellStyles>
</styleSheet>`;

function getAttachment2CatStyleIds(cNum: number): { bannerStyle: number; headerStyle: number } {
  if (cNum === 1) return { bannerStyle: 3, headerStyle: 7 };
  if (cNum === 2) return { bannerStyle: 4, headerStyle: 8 };
  if (cNum === 3) return { bannerStyle: 5, headerStyle: 9 };
  if (cNum === 7) return { bannerStyle: 6, headerStyle: 10 };
  if (cNum === 4 || cNum === 8) return { bannerStyle: 23, headerStyle: 24 };
  return { bannerStyle: 25, headerStyle: 26 };
}

function getAttachment2OrgStyleId(orgName?: string): number {
  const n = (orgName || '').trim();
  if (n.includes('กองสาธารณสุข')) return 15;
  if (n.includes('โรงพยาบาลกันตัง') || n.includes('ควนทองสีห์')) return 16;
  if (n.includes('รพ.สต.บางเป้า')) return 17;
  if (n.includes('บ้านป่าเตียว')) return 18;
  if (n.includes('วัดสีหราษฎร์')) return 19;
  if (n.includes('รร.บ้านบางเป้า') || n.includes('โรงเรียนบ้านบางเป้า')) return 20;
  return 12;
}

export async function exportAttachment2ToMasterXlsx(params: {
  targetYear: string;
  summaryProjects: NhsoProject[];
  groupedByCategory: Record<number, NhsoProject[]>;
  totalSummaryBudget: number;
  filename: string;
}): Promise<void> {
  const { targetYear, summaryProjects, groupedByCategory, totalSummaryBudget, filename } = params;
  const encoder = new TextEncoder();

  const sharedStrings: string[] = [];
  const ssMap = new Map<string, number>();
  const addStr = (s: string): number => {
    const val = s ?? '';
    const existing = ssMap.get(val);
    if (existing !== undefined) return existing;
    const idx = sharedStrings.length;
    sharedStrings.push(val);
    ssMap.set(val, idx);
    return idx;
  };

  const strCell = (ref: string, style: number, text: string) => {
    const idx = addStr(text);
    return `<c r="${ref}" s="${style}" t="s"><v>${idx}</v></c>`;
  };
  const numCell = (ref: string, style: number, num: number) =>
    `<c r="${ref}" s="${style}"><v>${Number(num || 0)}</v></c>`;
  const emptyCell = (ref: string, style: number) => `<c r="${ref}" s="${style}"/>`;

  const merges: string[] = ['A1:G1', 'A2:G2'];
  const rowsXml: string[] = [];

  // Row 1 & Row 2: Peach Banner (เอกสารแนบ 2)
  rowsXml.push(
    `<row r="1" ht="26.0" customHeight="1">` +
      strCell(
        'A1',
        1,
        'สรุปโครงการที่ขอรับการสนับสนุนงบประมาณจากกองทุนหลักประกันสุขภาพเทศบาลตำบลบางเป้า   (เอกสารแนบ 2)'
      ) +
      emptyCell('B1', 1) +
      emptyCell('C1', 1) +
      emptyCell('D1', 1) +
      emptyCell('E1', 1) +
      emptyCell('F1', 1) +
      emptyCell('G1', 1) +
      `</row>`
  );
  rowsXml.push(
    `<row r="2" ht="24.0" customHeight="1">` +
      strCell('A2', 1, `ประจำปีงบประมาณ ${targetYear}`) +
      emptyCell('B2', 1) +
      emptyCell('C2', 1) +
      emptyCell('D2', 1) +
      emptyCell('E2', 1) +
      emptyCell('F2', 1) +
      emptyCell('G2', 1) +
      `</row>`
  );

  // Row 4: จำนวน X โครงการ
  rowsXml.push(
    `<row r="4" ht="22.0" customHeight="1">${strCell(
      'A4',
      2,
      `จำนวน ${summaryProjects.length} โครงการ`
    )}</row>`
  );

  let r = 5;
  for (const [catNumStr, projectsInCat] of Object.entries(groupedByCategory)) {
    const cNum = Number(catNumStr);
    const { bannerStyle, headerStyle } = getAttachment2CatStyleIds(cNum);
    const subtotal = projectsInCat.reduce((s, p) => s + p.budgetRequested, 0);
    const completedInCat = projectsInCat.filter((p) => isProjectTrackingCompleted(p)).length;
    const extendedInCat = projectsInCat.filter((p) => isProjectTrackingExtended(p)).length;
    const refundedInCat = projectsInCat.filter((p) => isProjectTrackingRefunded(p)).length;

    merges.push(`A${r}:B${r}`);
    rowsXml.push(
      `<row r="${r}" ht="23.0" customHeight="1">` +
        strCell(`A${r}`, bannerStyle, `ประเภทที่ ${cNum}     จำนวน  ${projectsInCat.length}  โครงการ`) +
        emptyCell(`B${r}`, bannerStyle) +
        `</row>`
    );
    r += 2;

    const h1 = r;
    const h2 = r + 1;
    merges.push(
      `A${h1}:A${h2}`,
      `B${h1}:B${h2}`,
      `C${h1}:C${h2}`,
      `D${h1}:D${h2}`,
      `E${h1}:G${h1}`
    );

    rowsXml.push(
      `<row r="${h1}" ht="22.0" customHeight="1">` +
        strCell(`A${h1}`, headerStyle, 'ลำดับที่') +
        strCell(`B${h1}`, headerStyle, 'ชื่อโครงการ') +
        strCell(`C${h1}`, headerStyle, 'ผู้ขอรับงบ') +
        strCell(`D${h1}`, headerStyle, 'งบประมาณ\n(บาท)') +
        strCell(`E${h1}`, headerStyle, 'ผลการติดตามโครงการ') +
        emptyCell(`F${h1}`, headerStyle) +
        emptyCell(`G${h1}`, headerStyle) +
        `</row>`
    );
    rowsXml.push(
      `<row r="${h2}" ht="22.0" customHeight="1">` +
        emptyCell(`A${h2}`, headerStyle) +
        emptyCell(`B${h2}`, headerStyle) +
        emptyCell(`C${h2}`, headerStyle) +
        emptyCell(`D${h2}`, headerStyle) +
        strCell(`E${h2}`, headerStyle, 'ดำเนินการแล้ว') +
        strCell(`F${h2}`, headerStyle, 'ขอขยายเวลา') +
        strCell(`G${h2}`, headerStyle, 'คืนเงิน') +
        `</row>`
    );
    r += 2;

    projectsInCat.forEach((p, idx) => {
      const orgStyle = getAttachment2OrgStyleId(p.proposingOrg);
      const isComp = isProjectTrackingCompleted(p);
      const isExt = isProjectTrackingExtended(p);
      const isRef = isProjectTrackingRefunded(p);

      rowsXml.push(
        `<row r="${r}" ht="23.0" customHeight="1">` +
          numCell(`A${r}`, 11, Number(p.orderNumber || idx + 1)) +
          strCell(`B${r}`, 12, p.projectName || '') +
          strCell(`C${r}`, orgStyle, p.proposingOrg || '') +
          numCell(`D${r}`, 13, Number(p.budgetRequested || 0)) +
          strCell(`E${r}`, 14, isComp ? '☑' : '') +
          strCell(`F${r}`, 14, isExt ? '☑' : '') +
          strCell(`G${r}`, 14, isRef ? '☑' : '') +
          `</row>`
      );
      r += 1;
    });

    rowsXml.push(
      `<row r="${r}" ht="24.0" customHeight="1">` +
        strCell(`A${r}`, headerStyle, 'รวม') +
        strCell(`B${r}`, headerStyle, `${projectsInCat.length} โครงการ`) +
        emptyCell(`C${r}`, headerStyle) +
        numCell(`D${r}`, headerStyle, subtotal) +
        strCell(`E${r}`, headerStyle, completedInCat > 0 ? `${completedInCat}` : '-') +
        strCell(`F${r}`, headerStyle, extendedInCat > 0 ? `${extendedInCat}` : '-') +
        strCell(`G${r}`, headerStyle, refundedInCat > 0 ? `${refundedInCat} โครงการ` : '-') +
        `</row>`
    );
    r += 2;
  }

  // Bottom Grand Total Table (Royal Blue #4472c4 header + Green #70ad47 values)
  const grandComp = summaryProjects.filter((p) => isProjectTrackingCompleted(p)).length;
  const grandExt = summaryProjects.filter((p) => isProjectTrackingExtended(p)).length;
  const grandNotExec = summaryProjects.filter(
    (p) => !isProjectTrackingCompleted(p) && !isProjectTrackingExtended(p) && isProjectTrackingRefunded(p)
  ).length;

  const gt1 = r;
  const gt2 = r + 1;
  merges.push(`A${gt1}:A${gt2}`);

  rowsXml.push(
    `<row r="${gt1}" ht="24.0" customHeight="1">` +
      strCell(`A${gt1}`, 21, 'รวมทั้งหมด') +
      strCell(`B${gt1}`, 21, 'จำนวนโครงการ') +
      strCell(`C${gt1}`, 21, '') +
      strCell(`D${gt1}`, 21, 'งบประมาณ') +
      strCell(`E${gt1}`, 21, 'ดำเนินการแล้ว') +
      strCell(`F${gt1}`, 21, 'ขอขยายเวลา') +
      strCell(`G${gt1}`, 21, 'ไม่ได้ดำเนินการ') +
      `</row>`
  );
  rowsXml.push(
    `<row r="${gt2}" ht="25.0" customHeight="1">` +
      emptyCell(`A${gt2}`, 21) +
      strCell(`B${gt2}`, 22, `${summaryProjects.length} โครงการ`) +
      emptyCell(`C${gt2}`, 22) +
      numCell(`D${gt2}`, 22, totalSummaryBudget) +
      numCell(`E${gt2}`, 22, grandComp) +
      numCell(`F${gt2}`, 22, grandExt) +
      numCell(`G${gt2}`, 22, grandNotExec) +
      `</row>`
  );

  const mergeXml = `<mergeCells count="${merges.length}">${merges
    .map((m) => `<mergeCell ref="${m}"/>`)
    .join('')}</mergeCells>`;

  const sheetXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>` +
    `<sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews>` +
    `<sheetFormatPr defaultRowHeight="22.0"/>` +
    `<cols>` +
    `<col customWidth="1" min="1" max="1" width="8.5"/>` +
    `<col customWidth="1" min="2" max="2" width="58.0"/>` +
    `<col customWidth="1" min="3" max="3" width="22.0"/>` +
    `<col customWidth="1" min="4" max="4" width="12.5"/>` +
    `<col customWidth="1" min="5" max="7" width="13.5"/>` +
    `</cols>` +
    `<sheetData>${rowsXml.join('')}</sheetData>` +
    mergeXml +
    `<printOptions horizontalCentered="1"/>` +
    `<pageMargins bottom="0.35" footer="0.0" header="0.0" left="0.25" right="0.25" top="0.35"/>` +
    `<pageSetup fitToHeight="0" fitToWidth="1" paperSize="9" orientation="landscape"/>` +
    `</worksheet>`;

  const sstXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${sharedStrings.length}" uniqueCount="${sharedStrings.length}">` +
    sharedStrings.map((s) => `<si><t xml:space="preserve">${xmlEscape(s)}</t></si>`).join('') +
    `</sst>`;

  const workbookXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheets><sheet name="เอกสารแนบ 2" sheetId="1" r:id="rId1"/></sheets>` +
    `</workbook>`;

  const workbookRelsXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
    `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    `<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>` +
    `</Relationships>`;

  const rootRelsXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
    `</Relationships>`;

  const contentTypesXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
    `<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>` +
    `</Types>`;

  const entries: ZipEntry[] = [
    { name: '[Content_Types].xml', data: encoder.encode(contentTypesXml) },
    { name: '_rels/.rels', data: encoder.encode(rootRelsXml) },
    { name: 'xl/workbook.xml', data: encoder.encode(workbookXml) },
    { name: 'xl/_rels/workbook.xml.rels', data: encoder.encode(workbookRelsXml) },
    { name: 'xl/styles.xml', data: encoder.encode(ATTACHMENT2_STYLES_XML) },
    { name: 'xl/sharedStrings.xml', data: encoder.encode(sstXml) },
    { name: 'xl/worksheets/sheet1.xml', data: encoder.encode(sheetXml) },
  ];

  const zipBytes = buildZip(entries);
  const blob = new Blob([zipBytes as unknown as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
