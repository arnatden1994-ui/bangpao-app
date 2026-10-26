import { OFFICIAL_DOCX_STATIC_ENTRIES, OFFICIAL_DOCX_XML_PARTS } from '../data/officialDocxTemplateBase64.ts';

export interface DocxBackRowItem {
  issueDate: string;
  expireDate: string;
  book: string;
  no: string;
  date: string;
  signer?: string;
}

export interface DocxLicensePayload {
  bookNo: string;
  docNo: string;
  docYear: string;
  applicantName: string;
  nationality: string;
  houseNo: string;
  moo: string;
  soi: string;
  road: string;
  subdistrict: string;
  district: string;
  province: string;
  phone: string;
  bizType: string;
  bizTypeLine2?: string;
  bizName: string;
  bizHouseNo: string;
  bizMoo: string;
  bizSoi?: string;
  bizRoad?: string;
  bizSubdistrict: string;
  bizDistrict: string;
  bizProvince: string;
  bizPhone: string;
  feeAmount: string;
  feeText: string;
  receiptBook: string;
  receiptNo: string;
  receiptDay: string;
  receiptMonth: string;
  receiptYear: string;
  cond1: string;
  cond2: string;
  issueDay: string;
  issueMonth: string;
  issueYear: string;
  expireDay: string;
  expireMonth: string;
  expireYear: string;
  signerName: string;
  signerTitle: string;
  backRows: DocxBackRowItem[];
}

export interface DocxLayoutOptions {
  fontSize?: number; // default 16pt
  dataBold?: boolean; // default false (matching official template)
  underlineStyle?: 'dotted' | 'dashed' | 'solid' | 'none'; // default 'dotted'
  marginTopCm?: number; // default 1.5
  marginBottomCm?: number; // default 0.9
  marginLeftCm?: number; // default 2.54
  marginRightCm?: number; // default 1.75
}

/**
 * Strips generic placeholder conditions so 3.1) and 3.2) stay blank dotted lines
 * matching the official Bangpao Municipality template unless custom text is entered.
 */
export function cleanBoilerplateCondition(txt?: string): string {
  if (!txt) return '';
  const trimmed = txt.replace(/^[0-9]+(\.[0-9]+)?[\.\)]\s*/, '').trim();
  if (
    !trimmed ||
    trimmed === '-' ||
    /^\.+$/.test(trimmed) ||
    trimmed.includes('ต้องปฏิบัติตาม พ.ร.บ.การสาธารณสุข พ.ศ. 2535') ||
    trimmed.includes('ต้องดูแลรักษาความสะอาด ความปลอดภัย')
  ) {
    return '';
  }
  return trimmed;
}

/**
 * Ensures signerTitle never has a duplicate "ตำแหน่ง" prefix.
 */
export function cleanSignerPosition(pos?: string): string {
  if (!pos) return 'นายกเทศมนตรีตำบลบางเป้า';
  const cleaned = pos.replace(/^(\s*ตำแหน่ง\s*)+/g, '').trim();
  return cleaned || 'นายกเทศมนตรีตำบลบางเป้า';
}

/**
 * Splits a signer position cleanly so "นายกเทศมนตรี..." is never split across lines.
 */
export function formatSignerPositionLines(pos?: string): string[] {
  const cleaned = cleanSignerPosition(pos);
  if (cleaned.includes('\n')) {
    return cleaned
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  const match = cleaned.match(/^(.*?(?:ป[ฏฎ]ิบัติราชการแทน|รักษาราชการแทน))\s*(.+)$/);
  if (match) {
    return [match[1].trim(), match[2].trim()];
  }
  return [cleaned];
}

function escXml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function vlen(str: string): number {
  return (str || '').replace(/[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/g, '').length;
}

interface RunOptions {
  sz?: number;
  bold?: boolean;
  strike?: boolean;
  singleU?: boolean;
  white?: boolean;
  uVal?: string;
  endOfLine?: boolean;
}

function rPlain(text: string, opts: RunOptions = {}): string {
  const sz = opts.sz || 32;
  const bold = opts.bold ? '<w:b/><w:bCs/>' : '';
  const strike = opts.strike ? '<w:strike/>' : '';
  const singleU = opts.singleU ? '<w:u w:val="single"/>' : '';
  const white = opts.white ? '<w:color w:val="FFFFFF" w:themeColor="background1"/>' : '';
  return `<w:r><w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" w:cs="TH SarabunPSK" w:hint="cs"/>${bold}${strike}${white}${singleU}<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/><w:cs/></w:rPr><w:t xml:space="preserve">${escXml(text)}</w:t></w:r>`;
}

function rTab(opts: { sz?: number; uVal?: string; white?: boolean } = {}): string {
  const sz = opts.sz || 32;
  const uXml = opts.uVal && opts.uVal !== 'none' ? `<w:u w:val="${opts.uVal}"/>` : '';
  const white = opts.white ? '<w:color w:val="FFFFFF" w:themeColor="background1"/>' : '';
  return `<w:r><w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" w:cs="TH SarabunPSK"/>${white}<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>${uXml}<w:cs/></w:rPr><w:tab/></w:r>`;
}

function rCenteredDotted(val: string, opts: RunOptions = {}): string {
  const sz = opts.sz || 32;
  const uVal = opts.uVal || 'dotted';
  const uXml = uVal !== 'none' ? `<w:u w:val="${uVal}"/>` : '';
  const bold = opts.bold ? '<w:b/><w:bCs/>' : '';
  const clean = (val || '').trim();
  let out = rTab({ sz, uVal });
  if (clean) {
    out += `<w:r><w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" w:cs="TH SarabunPSK" w:hint="cs"/>${bold}<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>${uXml}<w:cs/></w:rPr><w:t xml:space="preserve"> ${escXml(clean)} </w:t></w:r>`;
  }
  out += rTab({ sz, uVal });
  if (opts.endOfLine) {
    out += `<w:r><w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" w:cs="TH SarabunPSK" w:hint="cs"/><w:color w:val="FFFFFF" w:themeColor="background1"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>${uXml}<w:cs/></w:rPr><w:t>.</w:t></w:r>`;
  }
  return out;
}

function rLeftDotted(val: string, opts: RunOptions = {}): string {
  const sz = opts.sz || 32;
  const uVal = opts.uVal || 'dotted';
  const uXml = uVal !== 'none' ? `<w:u w:val="${uVal}"/>` : '';
  const bold = opts.bold ? '<w:b/><w:bCs/>' : '';
  const clean = (val || '').trim();
  let out = '';
  if (clean) {
    out += `<w:r><w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" w:cs="TH SarabunPSK" w:hint="cs"/>${bold}<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>${uXml}<w:cs/></w:rPr><w:t xml:space="preserve">  ${escXml(clean)}</w:t></w:r>`;
  }
  out += rTab({ sz, uVal });
  if (opts.endOfLine) {
    out += `<w:r><w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" w:cs="TH SarabunPSK" w:hint="cs"/><w:color w:val="FFFFFF" w:themeColor="background1"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>${uXml}<w:cs/></w:rPr><w:t>.</w:t></w:r>`;
  }
  return out;
}

function buildTabsSpec(tabs: Array<{ val?: 'left' | 'center' | 'right'; pos: number }>): string {
  return `<w:tabs>${tabs.map((t) => `<w:tab w:val="${t.val || 'left'}" w:pos="${t.pos}"/>`).join('')}</w:tabs>`;
}

export function splitBizCategoryForDocx(line1?: string, line2?: string): { b1: string; b2: string } {
  const l1 = (line1 || '').trim();
  const l2 = (line2 || '').trim();
  if (l2) {
    // Re-combine and split cleanly if l1 is still too long (>32 visual chars)
    if (vlen(l1) <= 32) return { b1: l1, b2: l2 };
    const full = `${l1} ${l2}`.trim();
    return splitBizCategoryForDocx(full, '');
  }
  if (vlen(l1) <= 32) return { b1: l1, b2: '' };
  let acc = 0;
  let splitIdx = -1;
  let lastSpace = -1;
  for (let i = 0; i < l1.length; i++) {
    if (l1[i] === ' ') lastSpace = i;
    if (!/[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/.test(l1[i])) acc++;
    if (acc >= 30) {
      splitIdx = lastSpace > 10 ? lastSpace : i + 1;
      break;
    }
  }
  if (splitIdx === -1) return { b1: l1, b2: '' };
  return {
    b1: l1.slice(0, splitIdx).trim(),
    b2: l1.slice(splitIdx).trim(),
  };
}

export function buildOfficialDocumentXml(d: DocxLicensePayload, options: DocxLayoutOptions = {}): string {
  const sz = Math.round((options.fontSize || 16) * 2);
  const dataBold = Boolean(options.dataBold);
  const uMap: Record<string, string> = {
    dotted: 'dotted',
    dashed: 'dash',
    solid: 'single',
    none: 'none',
  };
  const uVal = uMap[options.underlineStyle || 'dotted'] || 'dotted';

  const { docOpen, p0_to_p5, p12, p13, p14, p19, p22_to_p32, tblXml: rawTblXml, sectPr: rawSectPr } = OFFICIAL_DOCX_XML_PARTS;

  // P6: เล่มที่   -   เลขที่ ... / ... (exact match to official template แม่แบบ.docx)
  const bookDisplay = (d.bookNo && d.bookNo.trim()) ? d.bookNo.trim() : '-';
  const p6 =
    `<w:p><w:pPr><w:spacing w:before="120"/>${buildTabsSpec([
      { val: 'center', pos: 1650 },
      { val: 'left', pos: 2160 },
      { val: 'center', pos: 2550 },
      { val: 'left', pos: 2940 },
    ])}<w:ind w:left="0"/><w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" w:cs="TH SarabunPSK"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr></w:pPr>` +
    rPlain('เล่มที่', { sz }) +
    `<w:r><w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" w:cs="TH SarabunPSK" w:hint="cs"/>${dataBold ? '<w:b/><w:bCs/>' : ''}<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>${uVal !== 'none' ? `<w:u w:val="${uVal}"/>` : ''}<w:cs/></w:rPr><w:t xml:space="preserve">   ${escXml(bookDisplay)}   </w:t></w:r>` +
    rPlain('เลขที่', { sz }) +
    rCenteredDotted(d.docNo, { sz, bold: dataBold, uVal }) +
    rPlain('/', { sz }) +
    rCenteredDotted(d.docYear, { sz, bold: dataBold, uVal, endOfLine: true }) +
    `</w:p>`;

  // P7: (1) เจ้าพนักงานท้องถิ่นอนุญาตให้ ... สัญชาติ ...
  // Keep pos=567 first tab stop for the numbering list item (1)
  const p7 =
    `<w:p><w:pPr><w:pStyle w:val="a4"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="8"/></w:numPr>${buildTabsSpec([
      { val: 'left', pos: 567 },
      { val: 'center', pos: 4350 },
      { val: 'left', pos: 5760 },
      { val: 'center', pos: 7510 },
      { val: 'left', pos: 8640 },
    ])}<w:jc w:val="left"/><w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" w:cs="TH SarabunPSK"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr></w:pPr>` +
    rPlain('เจ้าพนักงานท้องถิ่นอนุญาตให้', { sz }) +
    rCenteredDotted(d.applicantName, { sz, bold: dataBold, uVal }) +
    rPlain('สัญชาติ', { sz }) +
    rCenteredDotted(d.nationality, { sz, bold: dataBold, uVal, endOfLine: true }) +
    `</w:p>`;

  // P8a: อยู่บ้านเลขที่ ... หมู่ที่ ... ตรอก/ซอย ... ถนน ...
  const p8a =
    `<w:p><w:pPr>${buildTabsSpec([
      { val: 'center', pos: 1612 },
      { val: 'left', pos: 2171 },
      { val: 'center', pos: 3084 },
      { val: 'left', pos: 3611 },
      { val: 'center', pos: 5513 },
      { val: 'left', pos: 6491 },
      { val: 'center', pos: 8124 },
      { val: 'left', pos: 9371 },
    ])}<w:ind w:left="0"/><w:jc w:val="left"/><w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" w:cs="TH SarabunPSK"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr></w:pPr>` +
    rPlain('อยู่บ้านเลขที่', { sz }) +
    rCenteredDotted(d.houseNo, { sz, bold: dataBold, uVal }) +
    rPlain('หมู่ที่', { sz }) +
    rCenteredDotted(d.moo, { sz, bold: dataBold, uVal }) +
    rPlain('ตรอก/ซอย', { sz }) +
    rCenteredDotted(d.soi || '-', { sz, bold: dataBold, uVal }) +
    rPlain('ถนน', { sz }) +
    rCenteredDotted(d.road || '-', { sz, bold: dataBold, uVal, endOfLine: true }) +
    `</w:p>`;

  // P8b: ตำบล/แขวง ... อำเภอ/เขต ... จังหวัด ...
  const p8b =
    `<w:p><w:pPr>${buildTabsSpec([
      { val: 'center', pos: 1945 },
      { val: 'left', pos: 2880 },
      { val: 'center', pos: 4793 },
      { val: 'left', pos: 5760 },
      { val: 'center', pos: 7855 },
      { val: 'left', pos: 9371 },
    ])}<w:ind w:left="0"/><w:jc w:val="left"/><w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" w:cs="TH SarabunPSK"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr></w:pPr>` +
    rPlain('ตำบล/', { sz }) +
    rPlain('แขวง', { sz, strike: true }) +
    rCenteredDotted(d.subdistrict, { sz, bold: dataBold, uVal }) +
    rPlain('อำเภอ/', { sz }) +
    rPlain('เขต', { sz, strike: true }) +
    rCenteredDotted(d.district, { sz, bold: dataBold, uVal }) +
    rPlain('จังหวัด', { sz }) +
    rCenteredDotted(d.province, { sz, bold: dataBold, uVal, endOfLine: true }) +
    `</w:p>`;

  // P8c: หมายเลขโทรศัพท์ ...
  const p8c =
    `<w:p><w:pPr>${buildTabsSpec([
      { val: 'left', pos: 9371 },
    ])}<w:ind w:left="0"/><w:jc w:val="left"/><w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" w:cs="TH SarabunPSK"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr></w:pPr>` +
    rPlain('หมายเลขโทรศัพท์', { sz }) +
    rLeftDotted(d.phone, { sz, bold: dataBold, uVal, endOfLine: true }) +
    `</w:p>`;

  const { b1, b2 } = splitBizCategoryForDocx(d.bizType, d.bizTypeLine2);

  // P9a: ชื่อสถานประกอบกิจการที่เป็นอันตรายต่อสุขภาพ ประเภท ...
  const p9a =
    `<w:p><w:pPr><w:spacing w:before="120"/>${buildTabsSpec([
      { val: 'left', pos: 9371 },
    ])}<w:ind w:left="0" w:firstLine="1440"/><w:jc w:val="left"/><w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" w:cs="TH SarabunPSK"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr></w:pPr>` +
    rPlain('ชื่อสถานประกอบกิจการที่เป็นอันตรายต่อสุขภาพ ประเภท', { sz }) +
    rLeftDotted(b1, { sz, bold: dataBold, uVal, endOfLine: true }) +
    `</w:p>`;

  // P9b: ... โดยใช้ชื่อ
  const p9b =
    `<w:p><w:pPr>${buildTabsSpec([
      { val: 'left', pos: 8640 },
    ])}<w:ind w:left="0"/><w:jc w:val="left"/><w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" w:cs="TH SarabunPSK"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr></w:pPr>` +
    rLeftDotted(b2, { sz, bold: dataBold, uVal }) +
    rPlain('โดยใช้ชื่อ', { sz }) +
    `</w:p>`;

  // P9c: สถานที่ ... ตั้งอยู่บ้านเลขที่ ... หมู่ที่ ... ตำบล ...
  const p9c =
    `<w:p><w:pPr>${buildTabsSpec([
      { val: 'center', pos: 2117 },
      { val: 'left', pos: 3611 },
      { val: 'center', pos: 5319 },
      { val: 'left', pos: 5760 },
      { val: 'center', pos: 6684 },
      { val: 'left', pos: 7200 },
      { val: 'center', pos: 8532 },
      { val: 'left', pos: 9371 },
    ])}<w:ind w:left="0"/><w:jc w:val="left"/><w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" w:cs="TH SarabunPSK"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr></w:pPr>` +
    rPlain('สถานที่', { sz }) +
    rCenteredDotted(d.bizName, { sz, bold: dataBold, uVal }) +
    rPlain('ตั้งอยู่บ้านเลขที่', { sz }) +
    rCenteredDotted(d.bizHouseNo, { sz, bold: dataBold, uVal }) +
    rPlain('หมู่ที่', { sz }) +
    rCenteredDotted(d.bizMoo, { sz, bold: dataBold, uVal }) +
    rPlain('ตำบล', { sz }) +
    rCenteredDotted(d.bizSubdistrict, { sz, bold: dataBold, uVal, endOfLine: true }) +
    `</w:p>`;

  // P9d: อำเภอ ... จังหวัด ... หมายเลขโทรศัพท์ ...
  const p9d =
    `<w:p><w:pPr>${buildTabsSpec([
      { val: 'center', pos: 1365 },
      { val: 'left', pos: 2171 },
      { val: 'center', pos: 3535 },
      { val: 'left', pos: 4320 },
      { val: 'center', pos: 7608 },
      { val: 'left', pos: 9371 },
    ])}<w:ind w:left="0"/><w:jc w:val="left"/><w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" w:cs="TH SarabunPSK"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr></w:pPr>` +
    rPlain('อำเภอ', { sz }) +
    rCenteredDotted(d.bizDistrict, { sz, bold: dataBold, uVal }) +
    rPlain('จังหวัด', { sz }) +
    rCenteredDotted(d.bizProvince, { sz, bold: dataBold, uVal }) +
    rPlain('หมายเลขโทรศัพท์', { sz }) +
    rCenteredDotted(d.bizPhone, { sz, bold: dataBold, uVal, endOfLine: true }) +
    `</w:p>`;

  // P10: เสียค่าธรรมเนียมปีละ ... บาท ( ... )
  const p10 =
    `<w:p><w:pPr><w:spacing w:before="120"/>${buildTabsSpec([
      { val: 'left', pos: 720 },
      { val: 'left', pos: 1440 },
      { val: 'center', pos: 4502 },
      { val: 'left', pos: 5760 },
      { val: 'center', pos: 7788 },
      { val: 'left', pos: 9300 },
    ])}<w:ind w:left="0"/><w:jc w:val="left"/><w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" w:cs="TH SarabunPSK"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr></w:pPr>` +
    rTab({ sz }) +
    rTab({ sz }) +
    rPlain('เสียค่าธรรมเนียมปีละ', { sz }) +
    rCenteredDotted(d.feeAmount, { sz, bold: dataBold, uVal }) +
    rPlain('บาท (', { sz }) +
    rCenteredDotted(d.feeText, { sz, bold: dataBold, uVal }) +
    rPlain(')', { sz }) +
    `</w:p>`;

  // P11: ตามใบเสร็จรับเงินเล่มที่ ... เลขที่ ... ลงวันที่ ... เดือน ... พ.ศ. ...
  const p11 =
    `<w:p><w:pPr>${buildTabsSpec([
      { val: 'center', pos: 2418 },
      { val: 'left', pos: 2880 },
      { val: 'center', pos: 4225 },
      { val: 'left', pos: 5051 },
      { val: 'center', pos: 5990 },
      { val: 'left', pos: 6350 },
      { val: 'center', pos: 7475 },
      { val: 'left', pos: 8150 },
      { val: 'center', pos: 8960 },
      { val: 'left', pos: 9371 },
    ])}<w:ind w:left="0"/><w:jc w:val="left"/><w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" w:cs="TH SarabunPSK"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr></w:pPr>` +
    rPlain('ตามใบเสร็จรับเงินเล่มที่', { sz }) +
    rCenteredDotted(d.receiptBook || '-', { sz, bold: dataBold, uVal }) +
    rPlain('เลขที่', { sz }) +
    rCenteredDotted(d.receiptNo, { sz, bold: dataBold, uVal }) +
    rPlain('ลงวันที่', { sz }) +
    rCenteredDotted(d.receiptDay, { sz, bold: dataBold, uVal }) +
    rPlain('เดือน', { sz }) +
    rCenteredDotted(d.receiptMonth, { sz, bold: dataBold, uVal }) +
    rPlain('พ.ศ.', { sz }) +
    rCenteredDotted(d.receiptYear, { sz, bold: dataBold, uVal, endOfLine: true }) +
    `</w:p>`;

  // P15 (3.1) and P16 (3.2)
  const cleanC1 = cleanBoilerplateCondition(d.cond1);
  const cleanC2 = cleanBoilerplateCondition(d.cond2);

  const p15 =
    `<w:p><w:pPr>${buildTabsSpec([
      { val: 'left', pos: 720 },
      { val: 'left', pos: 9371 },
    ])}<w:ind w:left="0"/><w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" w:cs="TH SarabunPSK"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr></w:pPr>` +
    rTab({ sz }) +
    rPlain('     3.1)', { sz }) +
    rLeftDotted(cleanC1, { sz, bold: dataBold, uVal, endOfLine: true }) +
    `</w:p>`;

  const p16 =
    `<w:p><w:pPr>${buildTabsSpec([
      { val: 'left', pos: 720 },
      { val: 'left', pos: 9371 },
    ])}<w:ind w:left="0"/><w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" w:cs="TH SarabunPSK"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr></w:pPr>` +
    rTab({ sz }) +
    rPlain('     3.2)', { sz }) +
    rLeftDotted(cleanC2, { sz, bold: dataBold, uVal, endOfLine: true }) +
    `</w:p>`;

  // P17: (4) ใบอนุญาตฉบับนี้ออกให้เมื่อวันที่ ... เดือน ... พ.ศ. ...
  const p17 =
    `<w:p><w:pPr><w:spacing w:before="120"/>${buildTabsSpec([
      { val: 'left', pos: 731 },
      { val: 'center', pos: 4374 },
      { val: 'left', pos: 5051 },
      { val: 'center', pos: 6340 },
      { val: 'left', pos: 7200 },
      { val: 'center', pos: 8468 },
      { val: 'left', pos: 9371 },
    ])}<w:ind w:left="0"/><w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" w:cs="TH SarabunPSK"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr></w:pPr>` +
    rPlain('(5ๆไก', { sz, white: true }) +
    rTab({ sz, white: true }) +
    rPlain('(4) ใบอนุญาตฉบับนี้ออกให้เมื่อวันที่', { sz }) +
    rCenteredDotted(d.issueDay, { sz, bold: dataBold, uVal }) +
    rPlain('เดือน', { sz }) +
    rCenteredDotted(d.issueMonth, { sz, bold: dataBold, uVal }) +
    rPlain('พ.ศ.', { sz }) +
    rCenteredDotted(d.issueYear, { sz, bold: dataBold, uVal, endOfLine: true }) +
    `</w:p>`;

  // P18: (5) ใบอนุญาตฉบับนี้สิ้นอายุวันที่ ... เดือน ... พ.ศ. ...
  const p18 =
    `<w:p><w:pPr><w:spacing w:before="120"/>${buildTabsSpec([
      { val: 'left', pos: 731 },
      { val: 'center', pos: 4223 },
      { val: 'left', pos: 5051 },
      { val: 'center', pos: 6340 },
      { val: 'left', pos: 7200 },
      { val: 'center', pos: 8468 },
      { val: 'left', pos: 9371 },
    ])}<w:ind w:left="0"/><w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" w:cs="TH SarabunPSK"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr></w:pPr>` +
    rTab({ sz, white: true }) +
    rPlain('(5) ใบอนุญาตฉบับนี้สิ้นอายุวันที่', { sz }) +
    rCenteredDotted(d.expireDay, { sz, bold: dataBold, uVal }) +
    rPlain('เดือน', { sz }) +
    rCenteredDotted(d.expireMonth, { sz, bold: dataBold, uVal }) +
    rPlain('พ.ศ.', { sz }) +
    rCenteredDotted(d.expireYear, { sz, bold: dataBold, uVal, endOfLine: true }) +
    `</w:p>`;

  // P20: ( นาย... )
  const cleanSigner = (d.signerName || 'นายละดม   เชื้อช่วย').replace(/^\s*\(+|\)+\s*$/g, '').trim();
  const p20 =
    `<w:p><w:pPr><w:spacing w:before="120"/><w:ind w:left="4321" w:firstLine="720"/><w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" w:cs="TH SarabunPSK"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr></w:pPr>` +
    rPlain('                (', { sz }) +
    `<w:r><w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" w:cs="TH SarabunPSK" w:hint="cs"/>${dataBold ? '<w:b/><w:bCs/>' : ''}<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>${uVal !== 'none' ? `<w:u w:val="${uVal}"/>` : ''}<w:cs/></w:rPr><w:t xml:space="preserve">   ${escXml(cleanSigner)}   )</w:t></w:r>` +
    `<w:r><w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" w:cs="TH SarabunPSK"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>${uVal !== 'none' ? `<w:u w:val="${uVal}"/>` : ''}<w:cs/></w:rPr><w:t xml:space="preserve">                                  </w:t></w:r>` +
    `</w:p>`;

  // P21: ตำแหน่ง ...
  const titleLines = formatSignerPositionLines(d.signerTitle);
  const firstTitleLine = titleLines[0] || 'นายกเทศมนตรีตำบลบางเป้า';
  const secondTitleLine = titleLines[1] || '';
  const p21 =
    `<w:p><w:pPr><w:ind w:left="0"/><w:jc w:val="left"/><w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" w:cs="TH SarabunPSK"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr></w:pPr>` +
    rPlain('             ', { sz: 28 }) +
    rTab({ sz: 28 }) +
    rTab({ sz: 28 }) +
    rTab({ sz: 28 }) +
    rTab({ sz: 28 }) +
    rTab({ sz: 28 }) +
    rPlain(`            ตำแหน่ง   ${firstTitleLine}`, { sz }) +
    `</w:p>` +
    (secondTitleLine
      ? `<w:p><w:pPr><w:ind w:left="4320" w:firstLine="720"/><w:jc w:val="left"/><w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" w:cs="TH SarabunPSK"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr></w:pPr>` +
        rPlain(`                ${secondTitleLine}`, { sz }) +
        `</w:p>`
      : '');

  // Populate Page 2 Table
  const r0 = (d.backRows && d.backRows[0]) || {
    issueDate: '',
    expireDate: '',
    book: '-',
    no: '',
    date: '',
  };
  const tableTitleDisplay = secondTitleLine ? `${firstTitleLine} ${secondTitleLine}` : firstTitleLine;
  let tblXml = rawTblXml
    .replace('   ก.พ. 2568', escXml(r0.issueDate || ''))
    .replace('   ก.พ. 2569', escXml(r0.expireDate || ''))
    .replace('     /2568', escXml(r0.no || ''))
    .replace('    ก.พ.2568', escXml(r0.date || ''))
    .replace('ละดม   เชื้อช่วย', escXml(cleanSigner.replace(/^นาย/, '')))
    .replace('(นาย', escXml(cleanSigner.startsWith('นาย') ? '(นาย' : '('))
    .replace('นายกเทศมนตรีตำบลบางเป้า', escXml(tableTitleDisplay));

  // If r0.book has an explicit value other than '-', inject it into Row 2 Col 2
  if (r0.book && r0.book.trim() && r0.book.trim() !== '-') {
    tblXml = tblXml.replace(
      '<w:pPr><w:pStyle w:val="a4"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="3"/></w:numPr><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" w:cs="TH SarabunPSK"/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr></w:pPr></w:p>',
      `<w:pPr><w:ind w:left="0"/><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" w:cs="TH SarabunPSK"/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" w:cs="TH SarabunPSK"/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr><w:t>${escXml(r0.book.trim())}</w:t></w:r></w:p>`
    );
  }

  // Page margins (1 cm = 567 dxa)
  let sectPr = rawSectPr;
  if (
    options.marginTopCm !== undefined ||
    options.marginRightCm !== undefined ||
    options.marginBottomCm !== undefined ||
    options.marginLeftCm !== undefined
  ) {
    const mTop = Math.round((options.marginTopCm ?? 1.5) * 567);
    const mRight = Math.round((options.marginRightCm ?? 1.75) * 567);
    const mBottom = Math.round((options.marginBottomCm ?? 0.9) * 567);
    const mLeft = Math.round((options.marginLeftCm ?? 2.54) * 567);
    sectPr = rawSectPr.replace(
      /<w:pgMar[^/]*\/>/,
      `<w:pgMar w:top="${mTop}" w:right="${mRight}" w:bottom="${mBottom}" w:left="${mLeft}" w:header="720" w:footer="720" w:gutter="0"/>`
    );
  }

  return (
    docOpen +
    p0_to_p5 +
    p6 +
    p7 +
    p8a +
    p8b +
    p8c +
    p9a +
    p9b +
    p9c +
    p9d +
    p10 +
    p11 +
    p12 +
    p13 +
    p14 +
    p15 +
    p16 +
    p17 +
    p18 +
    p19 +
    p20 +
    p21 +
    p22_to_p32 +
    tblXml +
    sectPr +
    `</w:body></w:document>`
  );
}

// CRC-32 Lookup Table
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

/**
 * Pure-JS RFC 1951 compliant synchronous raw DEFLATE block wrapper.
 * Decompresses natively in Microsoft Word, Windows Explorer, 7-Zip, and zlib.
 */
function deflateRawSync(data: Uint8Array): Uint8Array {
  const maxBlock = 65535;
  const numBlocks = Math.ceil(data.length / maxBlock) || 1;
  const out = new Uint8Array(data.length + numBlocks * 5);
  let pos = 0;
  for (let i = 0; i < numBlocks; i++) {
    const start = i * maxBlock;
    const end = Math.min(start + maxBlock, data.length);
    const len = end - start;
    const nlen = ~len & 0xffff;
    const isFinal = i === numBlocks - 1 ? 1 : 0;
    out[pos++] = isFinal;
    out[pos++] = len & 0xff;
    out[pos++] = (len >> 8) & 0xff;
    out[pos++] = nlen & 0xff;
    out[pos++] = (nlen >> 8) & 0xff;
    out.set(data.subarray(start, end), pos);
    pos += len;
  }
  return out;
}

function base64ToUint8Array(b64: string): Uint8Array {
  const binStr = atob(b64);
  const bytes = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) {
    bytes[i] = binStr.charCodeAt(i);
  }
  return bytes;
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

/**
 * Builds a complete, genuine OpenXML .docx binary (Uint8Array) from the official template.
 */
export function generateOfficialDocxBytes(
  data: DocxLicensePayload,
  options: DocxLayoutOptions = {}
): Uint8Array {
  const encoder = new TextEncoder();
  const docXmlStr = buildOfficialDocumentXml(data, options);
  const docXmlBytes = encoder.encode(docXmlStr);
  const docXmlCompressed = deflateRawSync(docXmlBytes);
  const docXmlCrc = crc32(docXmlBytes);

  interface ZipPart {
    nameBytes: Uint8Array;
    method: number;
    crc32: number;
    compSize: number;
    uncompSize: number;
    compData: Uint8Array;
  }

  const allEntries: ZipPart[] = OFFICIAL_DOCX_STATIC_ENTRIES.map((e) => ({
    nameBytes: encoder.encode(e.name),
    method: e.method,
    crc32: e.crc32,
    compSize: e.compSize,
    uncompSize: e.uncompSize,
    compData: base64ToUint8Array(e.b64),
  }));

  // Insert word/document.xml
  allEntries.push({
    nameBytes: encoder.encode('word/document.xml'),
    method: 8,
    crc32: docXmlCrc,
    compSize: docXmlCompressed.length,
    uncompSize: docXmlBytes.length,
    compData: docXmlCompressed,
  });

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

    // Local File Header (30 bytes + filename)
    writeUInt32LE(out, 0x04034b50, localOffset);
    writeUInt16LE(out, 20, localOffset + 4); // version needed
    writeUInt16LE(out, 0, localOffset + 6); // flags
    writeUInt16LE(out, e.method, localOffset + 8);
    writeUInt16LE(out, 0, localOffset + 10); // mod time
    writeUInt16LE(out, 0x0021, localOffset + 12); // mod date
    writeUInt32LE(out, e.crc32, localOffset + 14);
    writeUInt32LE(out, e.compSize, localOffset + 18);
    writeUInt32LE(out, e.uncompSize, localOffset + 22);
    writeUInt16LE(out, e.nameBytes.length, localOffset + 26);
    writeUInt16LE(out, 0, localOffset + 28);
    out.set(e.nameBytes, localOffset + 30);
    localOffset += 30 + e.nameBytes.length;

    // Compressed Data
    out.set(e.compData, localOffset);
    localOffset += e.compData.length;

    // Central Directory Header (46 bytes + filename)
    writeUInt32LE(out, 0x02014b50, cdOffset);
    writeUInt16LE(out, 45, cdOffset + 4); // version made by
    writeUInt16LE(out, 20, cdOffset + 6); // version needed
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

  // End of Central Directory Record (22 bytes)
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

/**
 * Triggers a browser download of a genuine Microsoft Word (.docx) file.
 */
export function exportOfficialLicenseDocx(
  data: DocxLicensePayload,
  filename?: string,
  options: DocxLayoutOptions = {}
): void {
  const docxBytes = generateOfficialDocxBytes(data, options);
  const blob = new Blob([docxBytes.buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const rawName = filename || `ใบอนุญาต_${(data.bizName || 'อภ2').replace(/\s+/g, '_')}`;
  const safeName = rawName.replace(/[\\/:*?"<>|]/g, '').replace(/\.docx?$/i, '').trim() || 'ใบอนุญาต_อภ2';
  a.download = `${safeName}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
