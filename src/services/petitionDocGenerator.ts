/**
 * Official Municipal Petition Document Generator (System 5)
 * Dual Engine:
 * 1. Native OpenXML (.docx) Generator using the municipality's genuine templates:
 *    - คำร้องขอรับบริการกำจัดสิ่งปฏิกูล.docx
 *    - คำร้องทั่วไปใหม่.docx
 *    Guarantees 100% identical styling, TH SarabunIT๙ 15pt/16pt, zero unwanted line wraps,
 *    and strict 1-page A4 constraint in Microsoft Word.
 *
 * 2. High-Fidelity A4 HTML Renderer:
 *    Embeds the genuine THSarabunIT๙.ttf font and renders the exact single-page A4 layout
 *    matching the original Word templates for browser live preview and A4 printing.
 */

import {
  PublicPetition,
  SignerSettings,
  DEFAULT_SIGNER_SETTINGS,
} from '../types/index.ts';
import {
  SEWAGE_STATIC_ENTRIES,
  GENERAL_STATIC_ENTRIES,
  RAW_SEWAGE_DOCUMENT_XML,
  RAW_GENERAL_DOCUMENT_XML,
} from '../data/petitionTemplatesData.ts';
import { buildZip } from './zipBuilder.ts';
import {
  getPetitionForm,
  resolveFormType,
  toThaiDateParts,
  toThaiDigits,
  getSewageFee,
  normalizeStage,
} from '../data/petitionMeta.ts';

function b64ToUint8(b64: string): Uint8Array {
  if (typeof atob === 'function') {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    return bytes;
  }
  const buf = Buffer.from(b64, 'base64');
  return new Uint8Array(buf);
}

const esc = (s: string): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export function sanitizePersonText(raw?: string): string {
  if (!raw) return '';
  let s = String(raw).trim();
  if (s === '-') return '';
  s = s
    .replace(/ศรีสุวรรร+ณ/g, 'ศรีสุวรรณ')
    .replace(/ปัทมาภรณ์/g, 'ปฐมาภรณ์')
    .replace(/เด่นหมาด/g, 'เด็นหมาด')
    .replace(/นางสาวกัญจนณัฏฐ์\s*หริรักษ์/g, 'นางสาวปฐมาภรณ์ จันทร์แจ่ม')
    .replace(/น\.ส\.\s*พิมลภัส\s*ศรีสุข/g, 'พันจ่าเอกอานัส เด็นหมาด')
    .replace(/นางสาวจิราภรณ์\s*จันทร์ดี/g, 'พันจ่าเอกอานัส เด็นหมาด')
    .replace(/นางสาวอรัญญา\s*สุขสวัสดิ์/g, 'พันจ่าเอกอานัส เด็นหมาด');
  return s;
}

export function normalizeSigners(saved?: SignerSettings): SignerSettings {
  const base = saved || DEFAULT_SIGNER_SETTINGS;
  const clerkPosRaw = (base.clerkPos || 'ปลัดเทศบาล').trim();
  return {
    ...base,
    directorName: sanitizePersonText(base.directorName) || 'นางสาวปฐมาภรณ์ จันทร์แจ่ม',
    directorPos: (base.directorPos || base.directorPosition || 'ผู้อำนวยการกองสาธารณสุขและสิ่งแวดล้อม').trim(),
    clerkName: sanitizePersonText(base.clerkName) || 'นายจตุพร ศรีสุวรรณ',
    clerkPos: clerkPosRaw === 'ปลัดเทศบาลตำบลบางเป้า' ? 'ปลัดเทศบาล' : clerkPosRaw,
    mayorName: sanitizePersonText(base.mayorName) || 'นายนิติธรรม ดำสุด',
    actingMayorName: sanitizePersonText(base.actingMayorName || base.mayorName) || 'นายนิติธรรม ดำสุด',
    actingMayorPosition: (base.actingMayorPosition || 'รองนายกเทศมนตรี ปฏิบัติราชการแทน').trim(),
    actingMayorFor: (base.actingMayorFor || 'นายกเทศมนตรีตำบลบางเป้า').trim(),
    driverName: sanitizePersonText(base.driverName) || 'นายชนะ สุขด้วง',
  };
}

export function parseThaiAddressParts(addr?: string) {
  if (!addr) {
    return {
      houseNo: '',
      moo: '',
      soi: '',
      road: '',
      subdistrict: 'บางเป้า',
      district: 'กันตัง',
      province: 'ตรัง',
      full: '',
    };
  }
  const trimmed = addr.trim();

  // Extract moo
  const mooMatch = trimmed.match(/หมู่(?:\s*ที่)?\s*([0-9๐-๙]+)/);
  const moo = mooMatch ? mooMatch[1] : '';

  // Extract houseNo ONLY if it starts with digits or บ้านเลขที่/เลขที่ followed by digits
  let houseNo = '';
  const houseMatch = trimmed.match(/^(?:บ้านเลขที่|เลขที่)\s*([0-9๐-๙]+(?:\/[0-9๐-๙]+)?)/);
  if (houseMatch) {
    houseNo = houseMatch[1];
  } else {
    const firstToken = trimmed.split(/[\s,]+/)[0] || '';
    if (/^[0-9๐-๙]+(?:\/[0-9๐-๙]+)?$/.test(firstToken)) {
      houseNo = firstToken;
    }
  }

  // Extract soi
  let soi = '';
  const soiMatch = trimmed.match(/(?:ตรอก\/ซอย|ซอย|ตรอก)\s*([^\s,]+(?:\s+[^\s,]+)?)/);
  if (soiMatch) {
    soi = soiMatch[1]
      .replace(/\s*(?:ถนน|หมู่|ต\.|ตำบล|อ\.|อำเภอ|จ\.|จังหวัด).*$/, '')
      .trim();
  }

  // Extract road
  let road = '';
  const roadMatch = trimmed.match(/ถนน\s*([^\s,]+)/);
  if (roadMatch) {
    road = roadMatch[1]
      .replace(/\s*(?:หมู่|ต\.|ตำบล|อ\.|อำเภอ|จ\.|จังหวัด).*$/, '')
      .trim();
  }

  // Extract subdistrict (ตำบล / ต.)
  let subdistrict = 'บางเป้า';
  const subMatch = trimmed.match(/(?:ตำบล|ต\.)\s*([^\s,]+)/);
  if (subMatch) subdistrict = subMatch[1];

  // Extract district (อำเภอ / อ.)
  let district = 'กันตัง';
  const distMatch = trimmed.match(/(?:อำเภอ|อ\.)\s*([^\s,]+)/);
  if (distMatch) district = distMatch[1];

  // Extract province (จังหวัด / จ.)
  let province = 'ตรัง';
  const provMatch = trimmed.match(/(?:จังหวัด|จ\.)\s*([^\s,]+)/);
  if (provMatch) province = provMatch[1];

  return {
    houseNo: houseNo || '',
    moo: moo || '',
    soi: soi || '',
    road: road || '',
    subdistrict,
    district,
    province,
    full: trimmed,
  };
}

export function resolvePetitionAddress(p: PublicPetition, form?: any) {
  const parsed = parseThaiAddressParts(p.address || '');
  const app = form?.applicantAddress;
  const srv = form?.serviceAddress;

  const cleanVal = (v?: string) => {
    if (!v) return '';
    const t = String(v).trim();
    return t === '-' ? '' : t;
  };

  let houseNo = cleanVal(app?.houseNo) || cleanVal((form as any)?.houseNo) || cleanVal(parsed.houseNo);
  let soi = cleanVal(app?.soi) || cleanVal(parsed.soi);
  let road = cleanVal(app?.road) || cleanVal(parsed.road);

  // Guard against legacy localStorage where "ซอยข้างโรงเรียนบ้านบางเป้า" or "หมู่" was stored in houseNo
  if (houseNo && !/[0-9๐-๙]/.test(houseNo)) {
    if (/^(?:ตรอก\/ซอย|ซอย|ตรอก)/.test(houseNo)) {
      const stripped = houseNo.replace(/^(?:ตรอก\/ซอย|ซอย|ตรอก)\s*/, '').trim();
      if (!soi) soi = stripped;
    }
    houseNo = '';
  }

  const moo = cleanVal(app?.moo) || cleanVal((form as any)?.moo) || cleanVal(p.moo) || cleanVal(parsed.moo);
  const subdistrict = cleanVal(app?.subdistrict) || cleanVal((form as any)?.subdistrict) || cleanVal(parsed.subdistrict) || 'บางเป้า';
  const district = cleanVal(app?.district) || cleanVal((form as any)?.district) || cleanVal(parsed.district) || 'กันตัง';
  const province = cleanVal(app?.province) || cleanVal((form as any)?.province) || cleanVal(parsed.province) || 'ตรัง';
  const phone = cleanVal(app?.phone) || cleanVal((form as any)?.phone) || cleanVal(p.phone);

  let srvHouseNo = cleanVal(srv?.houseNo) || houseNo;
  let srvSoi = cleanVal(srv?.soi) || soi;
  if (srvHouseNo && !/[0-9๐-๙]/.test(srvHouseNo)) {
    if (/^(?:ตรอก\/ซอย|ซอย|ตรอก)/.test(srvHouseNo)) {
      const stripped = srvHouseNo.replace(/^(?:ตรอก\/ซอย|ซอย|ตรอก)\s*/, '').trim();
      if (!srvSoi) srvSoi = stripped;
    }
    srvHouseNo = '';
  }
  const srvRoad = cleanVal(srv?.road) || road;
  const srvMoo = cleanVal(srv?.moo) || moo;
  const srvSubdistrict = cleanVal(srv?.subdistrict) || subdistrict;
  const srvDistrict = cleanVal(srv?.district) || district;
  const srvProvince = cleanVal(srv?.province) || province;
  const srvPhone = cleanVal(srv?.phone) || phone;

  return {
    citizenName: sanitizePersonText(p.citizenName || (form as any)?.citizenName || ''),
    houseNo,
    moo,
    soi,
    road,
    subdistrict,
    district,
    province,
    phone,
    srvHouseNo,
    srvMoo,
    srvSoi,
    srvRoad,
    srvSubdistrict,
    srvDistrict,
    srvProvince,
    srvPhone,
  };
}

// ===========================================================================
// 1. GENUINE MICROSOFT WORD (.DOCX) GENERATOR
// ===========================================================================

const THAI_COMBINING_RE = /[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/g;

function visualLen(s: string): number {
  return String(s || '').replace(THAI_COMBINING_RE, '').length;
}

/**
 * Builds an OpenXML <w:r> run that either:
 * - Renders exact original dots when value is empty, OR
 * - Renders centered value with dotted underline (<w:u w:val="dotted"/>) padded with spaces
 *   matching the exact width of `totalDots` in TH SarabunIT๙.
 */
function fillDotsXml(val: string | undefined, totalDots: number, sz = '30', align: 'center' | 'left' = 'center'): string {
  const clean = String(val ?? '').trim();
  const rPrDots = `<w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙" w:hint="cs"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/><w:cs/></w:rPr>`;
  const rPrVal = `<w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙" w:hint="cs"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/><w:u w:val="dotted"/><w:cs/></w:rPr>`;
  if (!clean || clean === '-') {
    return `<w:r>${rPrDots}<w:t>${'.'.repeat(totalDots)}</w:t></w:r>`;
  }
  const vLen = visualLen(clean);
  // In TH SarabunIT๙, 1 Thai character is ~2.8x the width of '.', and ' ' is ~1.5x '.'
  const usedDots = Math.ceil(vLen * 2.9) + 4;
  const remain = Math.max(0, totalDots - usedDots);
  const leftCount = align === 'left' ? Math.min(2, remain) : Math.floor(remain / 2);
  const rightCount = Math.max(0, remain - leftCount);
  const leftRun = leftCount > 0 ? `<w:r>${rPrDots}<w:t>${'.'.repeat(leftCount)}</w:t></w:r>` : '';
  const rightRun = rightCount > 0 ? `<w:r>${rPrDots}<w:t>${'.'.repeat(rightCount)}</w:t></w:r>` : '';
  return `${leftRun}<w:r>${rPrVal}<w:t xml:space="preserve"> ${esc(clean)} </w:t></w:r>${rightRun}`;
}

function textRunXml(text: string, sz = '30', extraRPr = ''): string {
  return `<w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙" w:hint="cs"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>${extraRPr}<w:cs/></w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
}

const CHECKED_BOX_INNER_XML = `<w:rPr><w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:cs="Wingdings"/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr><w:sym w:font="Wingdings" w:char="F0FE"/>`;
const UNCHECKED_BOX_INNER_XML = `<w:rPr><w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:cs="Wingdings"/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr><w:sym w:font="Wingdings" w:char="F0A8"/>`;

export function generatePetitionDocxBytes(
  p: PublicPetition,
  savedSigners?: SignerSettings
): Uint8Array {
  const signers = normalizeSigners(savedSigners);
  const form = getPetitionForm(p, signers);
  const formType = resolveFormType(p);

  if (formType === 'sewage') {
    return generateSewageDocx(p, form, signers);
  } else {
    return generateGeneralDocx(p, form, signers);
  }
}

function generateSewageDocx(
  p: PublicPetition,
  form: ReturnType<typeof getPetitionForm>,
  signers: SignerSettings
): Uint8Array {
  let xml = RAW_SEWAGE_DOCUMENT_XML;
  const dParts = toThaiDateParts(form.filedDate);
  const doneDateParts = form.operation?.doneDate
    ? toThaiDateParts(form.operation.doneDate)
    : p.resolvedDate
    ? toThaiDateParts(p.resolvedDate)
    : dParts;

  const zone = form.sewageZone || (form as any).zone || 'in_district';
  const stage = normalizeStage(p.status);
  const isApproved = form.mayorDecision
    ? form.mayorDecision === 'approve'
    : stage === 'assigned' || stage === 'resolved';
  const isRejected = form.mayorDecision
    ? form.mayorDecision === 'reject'
    : stage === 'rejected';
  const isDone = form.operation?.done ?? (stage === 'resolved');

  const addr = resolvePetitionAddress(p, form);
  const citizenName = addr.citizenName;
  const houseNo = addr.houseNo ? toThaiDigits(addr.houseNo) : '';
  const soi = addr.soi ? toThaiDigits(addr.soi) : '';
  const road = addr.road ? toThaiDigits(addr.road) : '';
  const moo = addr.moo ? toThaiDigits(addr.moo) : '';
  const subdistrict = addr.subdistrict ? toThaiDigits(addr.subdistrict) : '';
  const district = addr.district ? toThaiDigits(addr.district) : '';
  const province = addr.province ? toThaiDigits(addr.province) : '';
  const phone = addr.phone ? toThaiDigits(addr.phone) : '';

  const srvHouseNo = addr.srvHouseNo ? toThaiDigits(addr.srvHouseNo) : '';
  const srvSoi = addr.srvSoi ? toThaiDigits(addr.srvSoi) : '';
  const srvRoad = addr.srvRoad ? toThaiDigits(addr.srvRoad) : '';
  const srvMoo = addr.srvMoo ? toThaiDigits(addr.srvMoo) : '';
  const srvSubdistrict = addr.srvSubdistrict ? toThaiDigits(addr.srvSubdistrict) : '';
  const srvDistrict = addr.srvDistrict ? toThaiDigits(addr.srvDistrict) : '';
  const srvProvince = addr.srvProvince ? toThaiDigits(addr.srvProvince) : '';
  const srvPhone = addr.srvPhone ? toThaiDigits(addr.srvPhone) : '';

  // 1. Date (S_P3 - 4B9119BD): "     วันที่................เดือน..........................พ.ศ..........."
  xml = xml.replace(
    /<w:p[^>]*w14:paraId="4B9119BD"[\s\S]*?<\/w:p>/,
    `<w:p w14:paraId="4B9119BD" w14:textId="4E472326" w:rsidR="00647EF6" w:rsidRPr="00233D4B" w:rsidRDefault="00647EF6" w:rsidP="000D66AD"><w:pPr><w:spacing w:after="0"/><w:ind w:right="-23"/><w:jc w:val="right"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:pPr>${textRunXml('     วันที่', '30')}${fillDotsXml(dParts.day ? toThaiDigits(dParts.day) : '', 16, '30')}${textRunXml('เดือน', '30')}${fillDotsXml(dParts.month || '', 26, '30')}${textRunXml('พ.ศ.', '30')}${fillDotsXml(dParts.year ? toThaiDigits(dParts.year) : '', 11, '30')}</w:p>`
  );

  // 2. Applicant Name & House No (S_P5 - 24AD9869): 93 dots, 23 dots
  xml = xml.replace(
    /<w:p[^>]*w14:paraId="24AD9869"[\s\S]*?<\/w:p>/,
    `<w:p w14:paraId="24AD9869" w14:textId="3CD8E48E" w:rsidR="00647EF6" w:rsidRPr="00233D4B" w:rsidRDefault="00647EF6" w:rsidP="000D66AD"><w:pPr><w:tabs><w:tab w:val="left" w:pos="709"/><w:tab w:val="left" w:pos="851"/></w:tabs><w:spacing w:after="0"/><w:ind w:right="-23"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:pPr>${textRunXml('          ข้าพเจ้า (นาย/นาง/นางสาว)', '30')}${fillDotsXml(citizenName, 93, '30')}${textRunXml('อยู่บ้านเลขที่', '30')}${fillDotsXml(houseNo, 23, '30')}</w:p>`
  );

  // 3. Applicant Soi, Road, Moo, Subdistrict (S_P6 - 764AFE03): 33, 55, 23, 31 dots
  xml = xml.replace(
    /<w:p[^>]*w14:paraId="764AFE03"[\s\S]*?<\/w:p>/,
    `<w:p w14:paraId="764AFE03" w14:textId="68E2C739" w:rsidR="00647EF6" w:rsidRPr="00233D4B" w:rsidRDefault="00647EF6" w:rsidP="00D526C2"><w:pPr><w:spacing w:after="0"/><w:ind w:right="-472"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:pPr>${textRunXml('ตรอก/ซอย', '30')}${fillDotsXml(soi, 33, '30')}${textRunXml('ถนน', '30')}${fillDotsXml(road, 55, '30')}${textRunXml('หมู่ที่', '30')}${fillDotsXml(moo, 23, '30')}${textRunXml('ตำบล/แขวง', '30')}${fillDotsXml(subdistrict, 31, '30')}</w:p>`
  );

  // 4. Applicant District, Province, Phone (S_P7 - 7ACFFCBC): 45, 44, 63 dots
  xml = xml.replace(
    /<w:p[^>]*w14:paraId="7ACFFCBC"[\s\S]*?<\/w:p>/,
    `<w:p w14:paraId="7ACFFCBC" w14:textId="6ECE555F" w:rsidR="00647EF6" w:rsidRPr="00233D4B" w:rsidRDefault="00647EF6" w:rsidP="00D526C2"><w:pPr><w:spacing w:after="0"/><w:ind w:right="-472"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:pPr>${textRunXml('อำเภอ/เขต', '30')}${fillDotsXml(district, 45, '30')}${textRunXml('จังหวัด', '30')}${fillDotsXml(province, 44, '30')}${textRunXml('โทรศัพท์', '30')}${fillDotsXml(phone, 63, '30')}</w:p>`
  );

  // 5. Service House No (S_P8 - 12EC7A4B): 29 dots
  xml = xml.replace(
    /<w:p[^>]*w14:paraId="12EC7A4B"[\s\S]*?<\/w:p>/,
    `<w:p w14:paraId="12EC7A4B" w14:textId="2260FBD9" w:rsidR="00606029" w:rsidRPr="00233D4B" w:rsidRDefault="00606029" w:rsidP="00D526C2"><w:pPr><w:spacing w:after="0"/><w:ind w:right="-472"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:pPr>${textRunXml('          มีความประสงค์จะขอรับบริการกำจัดสิ่งปฏิกูล จากสำนักงานเทศบาลตำบลบางเป้า ณ บ้านเลขที่', '30')}${fillDotsXml(srvHouseNo, 29, '30')}</w:p>`
  );

  // 6. Service Soi, Road, Moo, Subdistrict (S_P9 - 41933E49): 34, 53, 24, 30 dots
  xml = xml.replace(
    /<w:p[^>]*w14:paraId="41933E49"[\s\S]*?<\/w:p>/,
    `<w:p w14:paraId="41933E49" w14:textId="2B494226" w:rsidR="00606029" w:rsidRPr="00233D4B" w:rsidRDefault="00606029" w:rsidP="00D526C2"><w:pPr><w:spacing w:after="0"/><w:ind w:right="-472"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:pPr>${textRunXml('ตรอก/ซอย', '30')}${fillDotsXml(srvSoi, 34, '30')}${textRunXml('ถนน', '30')}${fillDotsXml(srvRoad, 53, '30')}${textRunXml('หมู่ที่', '30')}${fillDotsXml(srvMoo, 24, '30')}${textRunXml('ตำบล/แขวง', '30')}${fillDotsXml(srvSubdistrict, 30, '30')}</w:p>`
  );

  // 7. Service District, Province, Phone (S_P10 - 51A96CAB): 44, 45, 62 dots
  xml = xml.replace(
    /<w:p[^>]*w14:paraId="51A96CAB"[\s\S]*?<\/w:p>/,
    `<w:p w14:paraId="51A96CAB" w14:textId="76362779" w:rsidR="00606029" w:rsidRPr="00233D4B" w:rsidRDefault="00606029" w:rsidP="00D526C2"><w:pPr><w:spacing w:after="0"/><w:ind w:right="-472"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:cs/></w:rPr></w:pPr>${textRunXml('อำเภอ/เขต', '30')}${fillDotsXml(srvDistrict, 44, '30')}${textRunXml('จังหวัด', '30')}${fillDotsXml(srvProvince, 45, '30')}${textRunXml('โทรศัพท์', '30')}${fillDotsXml(srvPhone, 62, '30')}</w:p>`
  );

  // 8. Checkboxes for Sewage Fee Zones — preserve exact original <w:p> and leading spaces!
  const DRAWING_BOX_RE = /<w:rPr>(?:(?!<\/w:rPr>)[\s\S])*?<w:noProof\/>[\s\S]*?<\/w:rPr>\s*<w:drawing>[\s\S]*?<\/w:drawing>/;
  if (zone === 'in_district') {
    xml = xml.replace(
      /<w:p[^>]*w14:paraId="2CBB71F2"[\s\S]*?<\/w:p>/,
      (m) => m.replace(DRAWING_BOX_RE, CHECKED_BOX_INNER_XML)
    );
  }
  if (zone === 'out_10') {
    xml = xml.replace(
      /<w:p[^>]*w14:paraId="473680E0"[\s\S]*?<\/w:p>/,
      (m) => m.replace(DRAWING_BOX_RE, CHECKED_BOX_INNER_XML)
    );
  }
  if (zone === 'out_20') {
    xml = xml.replace(
      /<w:p[^>]*w14:paraId="7F1951A3"[\s\S]*?<\/w:p>/,
      (m) => m.replace(/<w:pict[\s\S]*?<\/w:pict>/, CHECKED_BOX_INNER_XML)
    );
  }
  if (zone === 'out_30') {
    xml = xml.replace(
      /<w:p[^>]*w14:paraId="30BA2199"[\s\S]*?<\/w:p>/,
      (m) => m.replace(DRAWING_BOX_RE, CHECKED_BOX_INNER_XML)
    );
  }

  // 9. Director Name & Applicant Signature Name (S_P21 - 669C0656)
  xml = xml.replace(
    /<w:p[^>]*w14:paraId="669C0656"[\s\S]*?<\/w:p>/,
    `<w:p w14:paraId="669C0656" w14:textId="5E8A65A7" w:rsidR="004D0238" w:rsidRPr="00233D4B" w:rsidRDefault="004D0238" w:rsidP="00031245"><w:pPr><w:tabs><w:tab w:val="left" w:pos="709"/><w:tab w:val="left" w:pos="4820"/></w:tabs><w:spacing w:after="0"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:pPr>${textRunXml(`         (${signers.directorName})                                  (`, '30')}${fillDotsXml(citizenName, 58, '30')}${textRunXml(')', '30')}</w:p>`
  );

  // 10. Mayor Approval Checkboxes (S_P23 - 38E70E86) — keep exact original paragraph & leading spaces!
  if (isApproved || isRejected) {
    xml = xml.replace(
      /<w:p[^>]*w14:paraId="38E70E86"[\s\S]*?<\/w:p>/,
      (match) => {
        let idx = 0;
        return match.replace(
          /<w:rPr>(?:(?!<\/w:rPr>)[\s\S])*?<w:noProof\/>[\s\S]*?<\/w:rPr>\s*<w:drawing>[\s\S]*?<\/w:drawing>/g,
          (rMatch) => {
            idx++;
            if (idx === 1 && isApproved) return CHECKED_BOX_INNER_XML;
            if (idx === 2 && isRejected) return CHECKED_BOX_INNER_XML;
            return rMatch;
          }
        );
      }
    );
  }

  // 11. Clerk & Acting Mayor Names (S_P27 - 76891812)
  xml = xml.replace(
    /<w:p[^>]*w14:paraId="76891812"[\s\S]*?<\/w:p>/,
    `<w:p w14:paraId="76891812" w14:textId="2AA04BB7" w:rsidR="00233D4B" w:rsidRDefault="00331F3A" w:rsidP="00331F3A"><w:pPr><w:tabs><w:tab w:val="left" w:pos="709"/></w:tabs><w:spacing w:after="0"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:pPr>${textRunXml(`               (${signers.clerkName})                                         (${signers.actingMayorName || signers.mayorName})`, '30')}</w:p>`
  );

  // 12. Driver Result (S_P31 - 7372C120 & S_P33 - 4EFE1805)
  const rawDriver = sanitizePersonText(form.assignedDriver || p.assignedOfficer || signers.driverName || 'นายชนะ สุขด้วง');
  const driverName = rawDriver.replace(/\s*\([^)]*\)\s*/g, ' ').trim() || 'นายชนะ สุขด้วง';
  xml = xml.replace(
    /<w:p[^>]*w14:paraId="7372C120"[\s\S]*?<\/w:p>/,
    (match) => {
      const pictMatch = match.match(/<w:r>\s*<w:rPr>[\s\S]*?<\/w:rPr>\s*<w:pict[\s\S]*?<\/w:pict>\s*<\/w:r>/);
      const boxXml = isDone
        ? `<w:r>${CHECKED_BOX_INNER_XML}</w:r>`
        : pictMatch
        ? pictMatch[0]
        : `<w:r>${UNCHECKED_BOX_INNER_XML}</w:r>`;
      return `<w:p w14:paraId="7372C120" w14:textId="5F2CA25A" w:rsidR="00A023B3" w:rsidRPr="00233D4B" w:rsidRDefault="00F73B4C" w:rsidP="00AF1507"><w:pPr><w:tabs><w:tab w:val="left" w:pos="709"/></w:tabs><w:spacing w:after="0"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:pPr>${boxXml}${textRunXml(' ดำเนินการแล้ว เมื่อวันที่', '30')}${fillDotsXml(isDone && doneDateParts.day ? toThaiDigits(doneDateParts.day) : '', 17, '30')}${textRunXml('เดือน', '30')}${fillDotsXml(isDone ? doneDateParts.month : '', 32, '30')}${textRunXml('พ.ศ.', '30')}${fillDotsXml(isDone && doneDateParts.year ? toThaiDigits(doneDateParts.year) : '', 19, '30')}</w:p>`;
    }
  );
  xml = xml.replace(
    /\(นายชนะ สุขด้วง\)/,
    `(${esc(driverName)})`
  );

  // 13. Bottom Table Left Cell: Intake Date (S_P36 - 5B49BCC9) & Officer Name (S_P38 - 1E07EB25)
  const intakeOfficer = sanitizePersonText(form.officerNote?.officerName || (form as any).intakeOfficer || '');
  xml = xml.replace(
    /<w:p[^>]*w14:paraId="5B49BCC9"[\s\S]*?<\/w:p>/,
    `<w:p w14:paraId="5B49BCC9" w14:textId="77777777" w:rsidR="00296703" w:rsidRPr="00233D4B" w:rsidRDefault="00296703" w:rsidP="00296703"><w:pPr><w:tabs><w:tab w:val="left" w:pos="709"/></w:tabs><w:spacing w:line="276" w:lineRule="auto"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:pPr>${textRunXml('เมื่อวันที่', '30')}${fillDotsXml(dParts.day ? toThaiDigits(dParts.day) : '', 11, '30')}${textRunXml('เดือน', '30')}${fillDotsXml(dParts.month || '', 26, '30')}${textRunXml('พ.ศ.', '30')}${fillDotsXml(dParts.year ? toThaiDigits(dParts.year) : '', 17, '30')}</w:p>`
  );
  if (intakeOfficer) {
    xml = xml.replace(
      /<w:p[^>]*w14:paraId="1E07EB25"[\s\S]*?<\/w:p>/,
      `<w:p w14:paraId="1E07EB25" w14:textId="3719E2CA" w:rsidR="00296703" w:rsidRPr="00233D4B" w:rsidRDefault="00296703" w:rsidP="00296703"><w:pPr><w:tabs><w:tab w:val="left" w:pos="709"/></w:tabs><w:spacing w:line="276" w:lineRule="auto"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:cs/></w:rPr></w:pPr>${textRunXml('              (', '30')}${fillDotsXml(intakeOfficer, 46, '30')}${textRunXml(')', '30')}</w:p>`
    );
  }

  // 14. Bottom Table Right Cell: Fee & Receipt (S_P40 - 59C3E62E, S_P41 - 7E6323D9, S_P43 - 6EC75748)
  const rawFee = form.feeAmount ?? getSewageFee(zone, signers);
  const feeStr = rawFee ? toThaiDigits(rawFee) : '';
  const receiptBook = (form.receipt?.bookNo || (form as any).receiptBook)
    ? toThaiDigits(form.receipt?.bookNo || (form as any).receiptBook)
    : '';
  const receiptNo = (form.receipt?.receiptNo || (form as any).receiptNumber)
    ? toThaiDigits(form.receipt?.receiptNo || (form as any).receiptNumber)
    : '';
  const receiptDateStr = dParts.day ? `${toThaiDigits(dParts.day)} ${dParts.month} ${toThaiDigits(dParts.year)}` : '';
  const collectorName = sanitizePersonText(form.receipt?.collectorName || intakeOfficer);

  xml = xml.replace(
    /<w:p[^>]*w14:paraId="59C3E62E"[\s\S]*?<\/w:p>/,
    `<w:p w14:paraId="59C3E62E" w14:textId="22BC480F" w:rsidR="00296703" w:rsidRPr="00233D4B" w:rsidRDefault="00296703" w:rsidP="00296703"><w:pPr><w:tabs><w:tab w:val="left" w:pos="709"/></w:tabs><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:pPr>${textRunXml('    ได้รับค่าธรรมเนียม จำนวน', '30')}${fillDotsXml(feeStr, 27, '30')}${textRunXml('บาท และออกใบเสร็จรับเงินแล้วเล่มที่', '30')}${fillDotsXml(receiptBook, 26, '30')}${textRunXml('เลขที่', '30')}${fillDotsXml(receiptNo, 25, '30')}</w:p>`
  );

  xml = xml.replace(
    /<w:p[^>]*w14:paraId="7E6323D9"[\s\S]*?<\/w:p>/,
    `<w:p w14:paraId="7E6323D9" w14:textId="7105608D" w:rsidR="00296703" w:rsidRPr="00233D4B" w:rsidRDefault="00296703" w:rsidP="00296703"><w:pPr><w:tabs><w:tab w:val="left" w:pos="709"/></w:tabs><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:pPr>${textRunXml('ลงวันที่', '30')}${fillDotsXml(receiptDateStr, 38, '30')}${textRunXml('ให้ผู้ขอรับบริการเรียบร้อยแล้ว', '30')}</w:p>`
  );

  if (collectorName) {
    xml = xml.replace(
      /<w:p[^>]*w14:paraId="6EC75748"[\s\S]*?<\/w:p>/,
      `<w:p w14:paraId="6EC75748" w14:textId="5260F907" w:rsidR="00296703" w:rsidRPr="00233D4B" w:rsidRDefault="00296703" w:rsidP="00296703"><w:pPr><w:tabs><w:tab w:val="left" w:pos="709"/></w:tabs><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:cs/></w:rPr></w:pPr>${textRunXml('            (', '30')}${fillDotsXml(collectorName, 40, '30')}${textRunXml(')', '30')}</w:p>`
    );
  }

  // 15. Prevent page 2 spill by removing trailing empty paragraph S_P44 (30D499A6) inside Cell 2 and shrinking S_P45 (7D49A4BB)
  xml = xml.replace(/<w:p[^>]*w14:paraId="30D499A6"[\s\S]*?<\/w:p>/, '');
  xml = xml.replace(
    /<w:p[^>]*w14:paraId="7D49A4BB"[\s\S]*?<\/w:p>/,
    `<w:p w14:paraId="7D49A4BB" w14:textId="77777777" w:rsidR="00A023B3" w:rsidRPr="00233D4B" w:rsidRDefault="00A023B3" w:rsidP="00A023B3"><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/><w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr></w:pPr></w:p>`
  );

  const zipEntries = SEWAGE_STATIC_ENTRIES.map((e) => ({
    name: e.name,
    data: b64ToUint8(e.b64),
  }));

  zipEntries.push({
    name: 'word/document.xml',
    data: new TextEncoder().encode(xml),
  });

  return buildZip(zipEntries);
}

function generateGeneralDocx(
  p: PublicPetition,
  form: ReturnType<typeof getPetitionForm>,
  signers: SignerSettings
): Uint8Array {
  let xml = RAW_GENERAL_DOCUMENT_XML;
  const dParts = toThaiDateParts(form.filedDate);
  const doneDateParts = form.operation?.doneDate
    ? toThaiDateParts(form.operation.doneDate)
    : p.resolvedDate
    ? toThaiDateParts(p.resolvedDate)
    : dParts;

  const stage = normalizeStage(p.status);
  const isApproved = form.mayorDecision
    ? form.mayorDecision === 'approve'
    : stage === 'assigned' || stage === 'resolved';
  const isRejected = form.mayorDecision
    ? form.mayorDecision === 'reject'
    : stage === 'rejected';
  const isDone = form.operation?.done ?? (stage === 'resolved');

  const addr = resolvePetitionAddress(p, form);
  const citizenName = addr.citizenName;
  const houseNo = addr.houseNo ? toThaiDigits(addr.houseNo) : '';
  const soi = addr.soi ? toThaiDigits(addr.soi) : '';
  const road = addr.road ? toThaiDigits(addr.road) : '';
  const moo = addr.moo ? toThaiDigits(addr.moo) : '';
  const subdistrict = addr.subdistrict ? toThaiDigits(addr.subdistrict) : '';
  const district = addr.district ? toThaiDigits(addr.district) : '';
  const province = addr.province ? toThaiDigits(addr.province) : '';
  const phone = addr.phone ? toThaiDigits(addr.phone) : '';

  const rawSubject = (form.subject || p.title || '').trim();
  const subject = rawSubject && rawSubject !== '-' ? toThaiDigits(rawSubject) : '';
  const rawPurpose = (form.purpose || p.description || '').trim();
  const purpose = rawPurpose && rawPurpose !== '-' ? toThaiDigits(rawPurpose) : '';

  // 1. Date (G_P3 - 4B9119BD): 16, 26, 11 dots
  xml = xml.replace(
    /<w:p[^>]*w14:paraId="4B9119BD"[\s\S]*?<\/w:p>/,
    `<w:p w14:paraId="4B9119BD" w14:textId="4E472326" w:rsidR="00647EF6" w:rsidRPr="00233D4B" w:rsidRDefault="00647EF6" w:rsidP="000D66AD"><w:pPr><w:spacing w:after="0"/><w:ind w:right="-23"/><w:jc w:val="right"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:pPr>${textRunXml('     วันที่', '30')}${fillDotsXml(dParts.day ? toThaiDigits(dParts.day) : '', 16, '30')}${textRunXml('เดือน', '30')}${fillDotsXml(dParts.month || '', 26, '30')}${textRunXml('พ.ศ.', '30')}${fillDotsXml(dParts.year ? toThaiDigits(dParts.year) : '', 11, '30')}</w:p>`
  );

  // 2. Subject (G_P5 - 32FE4F70)
  if (subject) {
    xml = xml.replace(
      /<w:p[^>]*w14:paraId="32FE4F70"[\s\S]*?<\/w:p>/,
      `<w:p w14:paraId="32FE4F70" w14:textId="01C2894F" w:rsidR="00F228C4" w:rsidRPr="00F228C4" w:rsidRDefault="00F228C4" w:rsidP="00A36206"><w:pPr><w:tabs><w:tab w:val="left" w:pos="709"/><w:tab w:val="right" w:pos="9475"/></w:tabs><w:spacing w:after="0"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="32"/><w:szCs w:val="32"/><w:u w:val="dotted"/></w:rPr></w:pPr>${textRunXml('เรื่อง', '32')}<w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙" w:hint="cs"/><w:sz w:val="32"/><w:szCs w:val="32"/><w:u w:val="dotted"/><w:cs/></w:rPr><w:t xml:space="preserve">   ${esc(subject)}   </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="32"/><w:szCs w:val="32"/><w:u w:val="dotted"/><w:cs/></w:rPr><w:tab/></w:r></w:p>`
    );
  }

  // 3. Citizen Name & House No (G_P7 - 24AD9869): 79, 23 dots (sz=32)
  xml = xml.replace(
    /<w:p[^>]*w14:paraId="24AD9869"[\s\S]*?<\/w:p>/,
    `<w:p w14:paraId="24AD9869" w14:textId="3C4EBC9E" w:rsidR="00647EF6" w:rsidRPr="00F228C4" w:rsidRDefault="00647EF6" w:rsidP="000D66AD"><w:pPr><w:tabs><w:tab w:val="left" w:pos="709"/><w:tab w:val="left" w:pos="851"/></w:tabs><w:spacing w:after="0"/><w:ind w:right="-23"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr></w:pPr>${textRunXml('          ข้าพเจ้า (นาย/นาง/นางสาว)', '32')}${fillDotsXml(citizenName, 79, '32')}${textRunXml('อยู่บ้านเลขที่', '32')}${fillDotsXml(houseNo, 23, '32')}</w:p>`
  );

  // 4. Soi, Road, Moo, Subdistrict (G_P8 - 764AFE03): 33, 42, 23, 31 dots (sz=32)
  xml = xml.replace(
    /<w:p[^>]*w14:paraId="764AFE03"[\s\S]*?<\/w:p>/,
    `<w:p w14:paraId="764AFE03" w14:textId="5C3631C8" w:rsidR="00647EF6" w:rsidRPr="00F228C4" w:rsidRDefault="00647EF6" w:rsidP="00D526C2"><w:pPr><w:spacing w:after="0"/><w:ind w:right="-472"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr></w:pPr>${textRunXml('ตรอก/ซอย', '32')}${fillDotsXml(soi, 33, '32')}${textRunXml('ถนน', '32')}${fillDotsXml(road, 42, '32')}${textRunXml('หมู่ที่', '32')}${fillDotsXml(moo, 23, '32')}${textRunXml('ตำบล/แขวง', '32')}${fillDotsXml(subdistrict, 31, '32')}</w:p>`
  );

  // 5. District, Province, Phone (G_P9 - 7ACFFCBC): 45, 30, 63 dots (sz=32)
  xml = xml.replace(
    /<w:p[^>]*w14:paraId="7ACFFCBC"[\s\S]*?<\/w:p>/,
    `<w:p w14:paraId="7ACFFCBC" w14:textId="3EFF60DC" w:rsidR="00647EF6" w:rsidRPr="00F228C4" w:rsidRDefault="00647EF6" w:rsidP="00D526C2"><w:pPr><w:spacing w:after="0"/><w:ind w:right="-472"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr></w:pPr>${textRunXml('อำเภอ/เขต', '32')}${fillDotsXml(district, 45, '32')}${textRunXml('จังหวัด', '32')}${fillDotsXml(province, 30, '32')}${textRunXml('โทรศัพท์', '32')}${fillDotsXml(phone, 63, '32')}</w:p>`
  );

  // 6. Purpose (G_P12 - 6F60D5E5): 3 dotted lines (38 tab stops when empty)
  if (purpose) {
    const pVisLen = visualLen(purpose);
    // Keep enough trailing tabs so total spans at most 3 lines without spilling to a 4th line.
    const tabsUsed = Math.ceil((pVisLen + 6) / 3.8);
    const remainTabs = Math.max(2, 30 - tabsUsed);
    const tabRuns = '<w:r w:rsidR="00F228C4"><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:u w:val="dotted"/></w:rPr><w:tab/></w:r>'.repeat(remainTabs);
    xml = xml.replace(
      /<w:p[^>]*w14:paraId="6F60D5E5"[\s\S]*?<\/w:p>/,
      `<w:p w14:paraId="6F60D5E5" w14:textId="4AB534FF" w:rsidR="00647EF6" w:rsidRPr="00F228C4" w:rsidRDefault="002127C2" w:rsidP="002127C2"><w:pPr><w:tabs><w:tab w:val="left" w:pos="709"/></w:tabs><w:spacing w:after="0"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:u w:val="dotted"/></w:rPr></w:pPr>${textRunXml('          ', '30')}${textRunXml('ข้าพเจ้ามีความประสงค์', '32')}<w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙" w:hint="cs"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:u w:val="dotted"/><w:cs/></w:rPr><w:t xml:space="preserve">  ${esc(purpose)}  </w:t></w:r>${tabRuns}</w:p>`
    );
  }

  // 7. Keep G_P15 (52007ABA) intact, and in G_P16 (669C0656) preserve "- เพื่อโปรดทราบและพิจารณา" on left while filling citizenName on right!
  if (citizenName) {
    xml = xml.replace(
      /<w:p[^>]*w14:paraId="669C0656"[\s\S]*?<\/w:p>/,
      `<w:p w14:paraId="669C0656" w14:textId="24ADC9B6" w:rsidR="004D0238" w:rsidRPr="00233D4B" w:rsidRDefault="00F228C4" w:rsidP="00031245"><w:pPr><w:tabs><w:tab w:val="left" w:pos="709"/><w:tab w:val="left" w:pos="4820"/></w:tabs><w:spacing w:after="0"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:pPr>${textRunXml('   - เพื่อโปรดทราบและพิจารณา                                    ', '32')}${textRunXml('(', '30')}${fillDotsXml(citizenName, 58, '30')}${textRunXml(')', '30')}</w:p>`
    );
  }

  // 8. Director Name in G_P21 (5E79AD19)
  if (signers.directorName && signers.directorName !== 'นางสาวปฐมาภรณ์ จันทร์แจ่ม') {
    xml = xml.replace('(นางสาวปฐมาภรณ์ จันทร์แจ่ม)', `(${esc(signers.directorName)})`);
  }

  // 9. Mayor Approval Checkboxes (G_P23 - 38E70E86) — preserve original paragraph & leading spaces!
  if (isApproved || isRejected) {
    xml = xml.replace(
      /<w:p[^>]*w14:paraId="38E70E86"[\s\S]*?<\/w:p>/,
      (match) => {
        let idx = 0;
        return match.replace(
          /<w:rPr>(?:(?!<\/w:rPr>)[\s\S])*?<w:noProof\/>[\s\S]*?<\/w:rPr>\s*<w:drawing>[\s\S]*?<\/w:drawing>/g,
          (rMatch) => {
            idx++;
            if (idx === 1 && isApproved) return CHECKED_BOX_INNER_XML;
            if (idx === 2 && isRejected) return CHECKED_BOX_INNER_XML;
            return rMatch;
          }
        );
      }
    );
  }

  // 10. Clerk & Acting Mayor Names in G_P27 (662FD985)
  if (signers.clerkName && signers.clerkName !== 'นายจตุพร ศรีสุวรรณ') {
    xml = xml.replace('(นายจตุพร ศรีสุวรรณ)', `(${esc(signers.clerkName)})`);
  }
  const actingMayor = signers.actingMayorName || signers.mayorName;
  if (actingMayor && actingMayor !== 'นายนิติธรรม ดำสุด') {
    xml = xml.replace('(นายนิติธรรม ดำสุด)', `(${esc(actingMayor)})`);
  }

  // 11. Bottom Table Left Cell: Subject (G_P32 - 39D7404E), Date (G_P33 - 5B49BCC9), Intake Officer (G_P36 - 1E07EB25)
  const intakeOfficer = sanitizePersonText(form.officerNote?.officerName || (form as any).intakeOfficer || '');
  const shortSubj = subject.length > 28 ? subject.slice(0, 28) + '...' : subject;
  if (shortSubj) {
    xml = xml.replace(
      /<w:p[^>]*w14:paraId="39D7404E"[\s\S]*?<\/w:p>/,
      `<w:p w14:paraId="39D7404E" w14:textId="410AD15F" w:rsidR="00296703" w:rsidRPr="00233D4B" w:rsidRDefault="00296703" w:rsidP="00296703"><w:pPr><w:tabs><w:tab w:val="left" w:pos="709"/></w:tabs><w:spacing w:line="276" w:lineRule="auto"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:pPr>${textRunXml('  ได้รับคำร้องเรื่อง', '30')}${fillDotsXml(shortSubj, 48, '30')}${textRunXml('แล้ว', '30')}</w:p>`
    );
  }
  xml = xml.replace(
    /<w:p[^>]*w14:paraId="5B49BCC9"[\s\S]*?<\/w:p>/,
    `<w:p w14:paraId="5B49BCC9" w14:textId="05AD4356" w:rsidR="00296703" w:rsidRDefault="00296703" w:rsidP="00296703"><w:pPr><w:tabs><w:tab w:val="left" w:pos="709"/></w:tabs><w:spacing w:line="276" w:lineRule="auto"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:pPr>${textRunXml('เมื่อวันที่', '30')}${fillDotsXml(dParts.day ? toThaiDigits(dParts.day) : '', 11, '30')}${textRunXml('เดือน', '30')}${fillDotsXml(dParts.month || '', 30, '30')}${textRunXml('พ.ศ.', '30')}${fillDotsXml(dParts.year ? toThaiDigits(dParts.year) : '', 25, '30')}</w:p>`
  );
  if (intakeOfficer) {
    xml = xml.replace(
      /<w:p[^>]*w14:paraId="1E07EB25"[\s\S]*?<\/w:p>/,
      `<w:p w14:paraId="1E07EB25" w14:textId="0473E18F" w:rsidR="00296703" w:rsidRPr="00233D4B" w:rsidRDefault="00296703" w:rsidP="00296703"><w:pPr><w:tabs><w:tab w:val="left" w:pos="709"/></w:tabs><w:spacing w:line="276" w:lineRule="auto"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:cs/></w:rPr></w:pPr>${textRunXml('              (', '30')}${fillDotsXml(intakeOfficer, 57, '30')}${textRunXml(')', '30')}</w:p>`
    );
  }

  // 12. Bottom Table Right Cell: Operation Result (G_P38 - 233771C2, G_P39 - 7972F313, G_P43 - 4AF8D362)
  if (isDone) {
    xml = xml.replace(
      /<w:p[^>]*w14:paraId="233771C2"[\s\S]*?<\/w:p>/,
      `<w:p w14:paraId="233771C2" w14:textId="3DCFB101" w:rsidR="007C1AA7" w:rsidRDefault="007C1AA7" w:rsidP="007C1AA7"><w:pPr><w:tabs><w:tab w:val="left" w:pos="709"/></w:tabs><w:ind w:left="360"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:pPr><w:r>${CHECKED_BOX_INNER_XML}</w:r>${textRunXml('  ดำเนินการแล้ว ', '30')}</w:p>`
    );
    xml = xml.replace(
      /<w:p[^>]*w14:paraId="7972F313"[\s\S]*?<\/w:p>/,
      `<w:p w14:paraId="7972F313" w14:textId="4C90465D" w:rsidR="007C1AA7" w:rsidRPr="007C1AA7" w:rsidRDefault="007C1AA7" w:rsidP="007C1AA7"><w:pPr><w:tabs><w:tab w:val="left" w:pos="709"/></w:tabs><w:ind w:left="360"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙" w:hint="cs"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:pPr>${textRunXml('เมื่อวันที่', '30')}${fillDotsXml(doneDateParts.day ? toThaiDigits(doneDateParts.day) : '', 16, '30')}${textRunXml('เดือน', '30')}${fillDotsXml(doneDateParts.month || '', 24, '30')}${textRunXml('พ.ศ.', '30')}${fillDotsXml(doneDateParts.year ? toThaiDigits(doneDateParts.year) : '', 21, '30')}</w:p>`
    );
  }
  const opOfficer = sanitizePersonText(form.operation?.operatorName || p.assignedOfficer || intakeOfficer);
  if (opOfficer) {
    xml = xml.replace(
      /<w:p[^>]*w14:paraId="4AF8D362"[\s\S]*?<\/w:p>/,
      `<w:p w14:paraId="4AF8D362" w14:textId="702B4FBD" w:rsidR="007C1AA7" w:rsidRPr="00233D4B" w:rsidRDefault="007C1AA7" w:rsidP="007C1AA7"><w:pPr><w:tabs><w:tab w:val="left" w:pos="709"/></w:tabs><w:ind w:right="-472"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:cs/></w:rPr></w:pPr>${textRunXml('     (', '30')}${fillDotsXml(opOfficer, 48, '30')}${textRunXml(')', '30')}</w:p>`
    );
  }

  // 13. Remove trailing empty paragraph G_P44 (30D499A6) inside Cell 2 and shrink G_P45 (7D49A4BB) after </w:tbl>
  // so that Word strictly fits everything onto 1 single A4 page without spilling an empty page 2!
  xml = xml.replace(/<w:p[^>]*w14:paraId="30D499A6"[\s\S]*?<\/w:p>/, '');
  xml = xml.replace(
    /<w:p[^>]*w14:paraId="7D49A4BB"[\s\S]*?<\/w:p>/,
    `<w:p w14:paraId="7D49A4BB" w14:textId="77777777" w:rsidR="00A023B3" w:rsidRPr="00233D4B" w:rsidRDefault="00A023B3" w:rsidP="00A023B3"><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/><w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr></w:pPr></w:p>`
  );

  const zipEntries = GENERAL_STATIC_ENTRIES.map((e) => ({
    name: e.name,
    data: b64ToUint8(e.b64),
  }));

  zipEntries.push({
    name: 'word/document.xml',
    data: new TextEncoder().encode(xml),
  });

  return buildZip(zipEntries);
}

export function exportPetitionDocx(
  p: PublicPetition,
  signers?: SignerSettings
): void {
  const bytes = generatePetitionDocxBytes(p, signers);
  const blob = new Blob([bytes as unknown as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const typeStr = resolveFormType(p) === 'sewage' ? 'คำร้องขอรับบริการกำจัดสิ่งปฏิกูล' : 'แบบคำร้องทั่วไป';
  const docNo = p.form?.docNo || p.trackingCode || 'REQ';
  const name = (sanitizePersonText(p.citizenName) || 'ผู้ยื่น').replace(/\s+/g, '_');
  const filename = `${typeStr}_${docNo}_${name}.docx`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ===========================================================================
// 2. HIGH-FIDELITY SINGLE-PAGE A4 HTML RENDERER (GENUINE TH SARABUN IT๙ TTF)
// ===========================================================================

export const TH_SARABUN_IT9_TTF_BASE64 = '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//cBMAJUAiYAQgAAACYAzxYAAA8B5wFBAHo5mv//AAAAAAGQAqwCJgAiAAAAJwDPADIAiAAHAegBMADo//8AGv/3ATACIgImAEIAAAAmAM8WAAAHAegBFABeAAD//wAA/5YBkAJNAiYAIgAAACcB6gEWAAAABwDPADIAiP//ABr/lgEwAcUCJgBCAAAAJwHqAPoAAAAGAM8WAAAA//8ANv+WATkB3AImACYAAAAHAeoA/QAA//8AG/+WAVcBWwImAEYAAAAHAeoBCQAA//8ANgAAATkClwImACYAAAAHAecBWwCI//8AG//3AVcCAAImAEYAAAAPAecBTwAmOZoAAP//ADYAAAE5AkwCJgAmAAAABwHoARgAiP//ABv/2QFXAaYCJgBGAOIABwHoASP/4v//ADYAAAFHApYCJgAmAAAAJwDNAEUAiAAPAekBggDlOZoAAP//ABv/9wFdAhACJgBGAAAAJgDNUQAADwHpAZgAXzma//8ANgAAATkClgImACYAAAAnAM0ARQCIAA8B6wFcAOU5mgAA//8AG//3AVcCEAImAEYAAAAmAM1RAAAHAesBeQAvAAD//wA2AAABVgLCAiYAJgAAACcAzQBFAIgADwHnAa8A6DmaAAD//wAb//cBXgJIAiYARgAAACYAzVEAAA8B5wG3AG45mv//ADYAAAE5ArYCJgAmAAAAJwDNAEUAiAAHAegBFwDy//8AG//3AVcCLQImAEYAAAAmAM1RAAAHAegBIwBpAAD//wA2/5YBOQJeAiYAJgAAACcB6gD9AAAABwDNAEUAiP//ABv/lgFXAdYCJgBGAAAAJwHqAQkAAAAGAM1RAAAA//8AEAAAAJIClwImACoAAAAHAecA9QCI//8ADgAAAJACDwAnAecA8wAAAAYAwgAA//8ALf+WAGcB3AImACoAAAAHAeoAmAAA//8AJ/+WAGYB2wImAEoAAAAHAeoAlgAA//8AFv+WAdAB5AImADAAAAAHAeoBQQAA//8AHP+WAXIBWwImAFAAAAAHAeoBFQAA//8AFv/2AdAClwImADAAAAAHAecBngCI//8AHP/2AXICDwImAFAAAAAHAecBcgAA//8AFv/2AdAClgImADAAAAAnAM0AiQCIAA8B6QHbAOU5mgAA//8AHP/2AXICEAImAFAAAAAmAM1dAAAPAekBpwBfOZr//wAW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DB8aIBIvLRskJBsaIiLiLzocGQoKJiEZHBQBlR9BAjMAAAABAAAhOAABBYcYAAAKCSoAIgA1/9gAIgA3/84AIgA4/9MAIgA6/9gAIgBa//EAIgCf/9gAIgC///EAIgDB//EAIgDJ/9gAIgHI/9gAIgHJ//EAIgHK/9gAIgHL//EAIgHM/9gAIgHN//EAIgHO/9gAIgHP//EAJwAi/9gAJwCC/9gAJwCD/9gAJwCE/9gAJwCF/9gAJwCG/9gAJwCH/9gAJwCI/84AJwF2/9gAJwF4/9gAJwF6/9gAJwF8/9gAJwF+/9gAJwGA/9gAJwGC/9gAJwGE/9gAJwGG/9gAJwGI/9gAJwGK/9gAJwGM/9gAJwHS/9gALQA1/7AALQA3/7AALQA4/7oALQA6/7oALQCf/7oALQDJ/7oALQHI/7oALQHK/7oALQHM/7oALQHO/7oAMQAi/84AMQAr/8QAMQCC/84AMQCD/84AMQCE/84AMQCF/84AMQCG/84AMQCH/84AMQF2/84AMQF4/84AMQF6/84AMQF8/84AMQF+/84AMQGA/84AMQGC/84AMQGE/84AMQGG/84AMQGI/84AMQGK/84AMQGM/84AMQHS/84ANQAi/9gANQAr/9gANQBC/+IANQBE/+IANQBG/+IANQBI/90ANQBO/+IANQBP/+IANQBQ/+IANQBR/+IANQBS/+IANQBT/+IANQBU/+IANQBW/+IANQBX/+IANQBY/+IANQBZ/+IANQBa/+IANQBb/+IANQCC/9gANQCD/9gANQCE/9gANQCF/9gANQCG/9gANQCH/9gANQCi/+IANQCj/+IANQCk/+IANQCl/+IANQCm/+IANQCn/+IANQCo/+IANQCp/+IANQCq/+IANQCr/+IANQCs/+IANQCt/+IANQCy/+IANQCz/+IANQC0/+IANQC1/+IANQC2/+IANQC3/+IANQC4/+IANQC6/+IANQC7/+IANQC8/+IANQC9/+IANQC+/+IANQC//+IANQDB/+IANQDG/+IANQDI/+IANQF2/9gANQF3/+IANQF4/9gANQF5/+IANQF6/9gANQF7/+IANQF8/9gANQF9/+IANQF+/9gANQF//+IANQGA/9gANQGB/+IANQGC/9gANQGD/+IANQGE/9gANQGF/+IANQGG/9gANQGH/+IANQGI/9gANQGJ/+IANQGK/9gANQGL/+IANQGM/9gANQGN/+IANQGP/+IANQGR/+IANQGT/+IANQGV/+IANQGX/+IANQGZ/+IANQGb/+IANQGd/+IANQGj/+IANQGl/+IANQGn/+IANQGp/+IANQGr/+IANQGt/+IANQGv/+IANQGx/+IANQGz/+IANQG1/+IANQG3/+IANQG5/+IANQG7/+IANQG9/+IANQG//+IANQHB/+IANQHD/+IANQHF/+IANQHH/+IANQHJ/+IANQHL/+IANQHN/+IANQHP/+IANQHS/9gANQHT/+IANQHV/+IANQHX/+IANQHb/90ANQHg/+IANQHi/+IANQHk/+IANQHm/+IANwAi/84ANwAr/9gANwBE/+IANwBG/+IANwBI/+IANwBQ/+IANwBS/+IANwBU/+wANwCC/84ANwCD/84ANwCE/84ANwCF/84ANwCG/84ANwCH/84ANwCp/+IANwCq/+IANwCr/+IANwCs/+IANwCt/+IANwCy/+IANwC0/+IANwC1/+IANwC2/+IANwC3/+IANwC4/+IANwC6/+IANwDG/+IANwDI/+wANwF2/84ANwF4/84ANwF6/84ANwF8/84ANwF+/84ANwGA/84ANwGC/84ANwGE/84ANwGG/84ANwGI/84ANwGK/84ANwGM/84ANwGP/+IANwGR/+IANwGT/+IANwGV/+IANwGX/+IANwGZ/+IANwGb/+IANwGd/+IANwGj/+IANwGl/+IANwGn/+IANwGp/+IANwGr/+IANwGt/+IANwGv/+IANwGx/+IANwGz/+IANwG1/+IANwG3/+IANwG5/+IANwHS/84ANwHV/+IANwHX/+IANwHb/+IANwHg/+wANwHk/+IAOAAi/9MAOABE/+wAOABG/+wAOABI/+wAOABQ/+wAOABS/+wAOABU/+wAOACC/9MAOACD/9MAOACE/9MAOACF/9MAOACG/9MAOACH/9MAOACp/+wAOACq/+wAOACr/+wAOACs/+wAOACt/+wAOACy/+wAOAC0/+wAOAC1/+wAOAC2/+wAOAC3/+wAOAC4/+wAOAC6/+wAOADG/+wAOADI/+wAOAF2/9MAOAF4/9MAOAF6/9MAOAF8/9MAOAF+/9MAOAGA/9MAOAGC/9MAOAGE/9MAOAGG/9MAOAGI/9MAOAGK/9MAOAGM/9MAOAGP/+wAOAGR/+wAOAGT/+wAOAGV/+wAOAGX/+wAOAGZ/+wAOAGb/+wAOAGd/+wAOAGj/+wAOAGl/+wAOAGn/+wAOAGp/+wAOAGr/+wAOAGt/+wAOAGv/+wAOAGx/+wAOAGz/+wAOAG1/+wAOAG3/+wAOAG5/+wAOAHS/9MAOAHV/+wAOAHX/+wAOAHb/+wAOAHg/+wAOAHk/+wAOgAi/9gAOgBC/+wAOgBE/+cAOgBG/+cAOgBI/+cAOgBO/+wAOgBP/+wAOgBQ/+cAOgBR/+wAOgBS/+cAOgBT/+wAOgBU/+cAOgBW/+wAOgCC/9gAOgCD/9gAOgCE/9gAOgCF/9gAOgCG/9gAOgCH/9gAOgCi/+wAOgCj/+wAOgCk/+wAOgCl/+wAOgCm/+wAOgCn/+wAOgCo/+wAOgCp/+cAOgCq/+cAOgCr/+cAOgCs/+cAOgCt/+cAOgCy/+cAOgCz/+wAOgC0/+cAOgC1/+cAOgC2/+cAOgC3/+cAOgC4/+cAOgC6/+cAOgC7/+wAOgC8/+wAOgC9/+wAOgC+/+wAOgDG/+cAOgDI/+cAOgF2/9gAOgF3/+wAOgF4/9gAOgF5/+wAOgF6/9gAOgF7/+wAOgF8/9gAOgF9/+wAOgF+/9gAOgF//+wAOgGA/9gAOgGB/+wAOgGC/9gAOgGD/+wAOgGE/9gAOgGF/+wAOgGG/9gAOgGH/+wAOgGI/9gAOgGJ/+wAOgGK/9gAOgGL/+wAOgGM/9gAOgGN/+wAOgGP/+cAOgGR/+cAOgGT/+cAOgGV/+cAOgGX/+cAOgGZ/+cAOgGb/+cAOgGd/+cAOgGj/+cAOgGl/+cAOgGn/+cAOgGp/+cAOgGr/+cAOgGt/+cAOgGv/+cAOgGx/+cAOgGz/+cAOgG1/+cAOgG3/+cAOgG5/+cAOgG7/+wAOgG9/+wAOgG//+wAOgHB/+wAOgHD/+wAOgHF/+wAOgHH/+wAOgHS/9gAOgHT/+wAOgHV/+cAOgHX/+cAOgHb/+cAOgHg/+cAOgHi/+wAOgHk/+cAOgHm/+wAggA1/9gAggA3/84AggA4/9MAggA6/9gAggBa//EAggCf/9gAggC///EAggDB//EAggDJ/9gAggHI/9gAggHJ//EAggHK/9gAggHL//EAggHM/9gAggHN//EAggHO/9gAggHP//EAgwA1/9gAgwA3/84AgwA4/9MAgwA6/9gAgwBa//EAgwCf/9gAgwC///EAgwDB//EAgwDJ/9gAgwHI/9gAgwHJ//EAgwHK/9gAgwHL//EAgwHM/9gAgwHN//EAgwHO/9gAgwHP//EAhAA1/9gAhAA3/84AhAA4/9MAhAA6/9gAhABa//EAhACf/9gAhAC///EAhADB//EAhADJ/9gAhAHI/9gAhAHJ//EAhAHK/9gAhAHL//EAhAHM/9gAhAHN//EAhAHO/9gAhAHP//EAhQA1/9gAhQA3/84AhQA4/9MAhQA6/9gAhQBa//EAhQCf/9gAhQC///EAhQDB//EAhQDJ/9gAhQHI/9gAhQHJ//EAhQHK/9gAhQHL//EAhQHM/9gAhQHN//EAhQHO/9gAhQHP//EAhgA1/9gAhgA3/84AhgA4/9MAhgA6/9gAhgBa//EAhgCf/9gAhgC///EAhgDB//EAhgDJ/9gAhgHI/9gAhgHJ//EAhgHK/9gAhgHL//EAhgHM/9gAhgHN//EAhgHO/9gAhgHP//EAhwA1/9gAhwA3/84AhwA4/9MAhwA6/9gAhwBa//EAhwCf/9gAhwC///EAhwDB//EAhwDJ/9gAhwHI/9gAhwHJ//EAhwHK/9gAhwHL//EAhwHM/9gAhwHN//EAhwHO/9gAhwHP//EAnwAi/9gAnwBC/+wAnwBE/+cAnwBG/+cAnwBI/+cAnwBO/+wAnwBP/+wAnwBQ/+cAnwBR/+wAnwBS/+cAnwBT/+wAnwBU/+cAnwBW/+wAnwCC/9gAnwCD/9gAnwCE/9gAnwCF/9gAnwCG/9gAnwCH/9gAnwCi/+wAnwCj/+wAnwCk/+wAnwCl/+wAnwCm/+wAnwCn/+wAnwCo/+wAnwCp/+cAnwCq/+cAnwCr/+cAnwCs/+cAnwCt/+cAnwCy/+cAnwCz/+wAnwC0/+cAnwC1/+cAnwC2/+cAnwC3/+cAnwC4/+cAnwC6/+cAnwC7/+wAnwC8/+wAnwC9/+wAnwC+/+wAnwDG/+cAnwDI/+cAnwF2/9gAnwF3/+wAnwF4/9gAnwF5/+wAnwF6/9gAnwF7/+wAnwF8/9gAnwF9/+wAnwF+/9gAnwF//+wAnwGA/9gAnwGB/+wAnwGC/9gAnwGD/+wAnwGE/9gAnwGF/+wAnwGG/9gAnwGH/+wAnwGI/9gAnwGJ/+wAnwGK/9gAnwGL/+wAnwGM/9gAnwGN/+wAnwGP/+cAnwGR/+cAnwGT/+cAnwGV/+cAnwGX/+cAnwGZ/+cAnwGb/+cAnwGd/+cAnwGj/+cAnwGl/+cAnwGn/+cAnwGp/+cAnwGr/+cAnwGt/+cAnwGv/+cAnwGx/+cAnwGz/+cAnwG1/+cAnwG3/+cAnwG5/+cAnwG7/+wAnwG9/+wAnwG//+wAnwHB/+wAnwHD/+wAnwHF/+wAnwHH/+wAnwHS/9gAnwHT/+wAnwHV/+cAnwHX/+cAnwHb/+cAnwHg/+cAnwHi/+wAnwHk/+cAnwHm/+wAyQAi/9gAyQBC/+wAyQBE/+cAyQBG/+cAyQBI/+cAyQBO/+wAyQBP/+wAyQBQ/+cAyQBR/+wAyQBS/+cAyQBT/+wAyQBU/+cAyQBW/+wAyQCC/9gAyQCD/9gAyQCE/9gAyQCF/9gAyQCG/9gAyQCH/9gAyQCi/+wAyQCj/+wAyQCk/+wAyQCl/+wAyQCm/+wAyQCn/+wAyQCo/+wAyQCp/+cAyQCq/+cAyQCr/+cAyQCs/+cAyQCt/+cAyQCy/+cAyQCz/+wAyQC0/+cAyQC1/+cAyQC2/+cAyQC3/+cAyQC4/+cAyQC6/+cAyQC7/+wAyQC8/+wAyQC9/+wAyQC+/+wAyQDG/+cAyQDI/+cAyQF2/9gAyQF3/+wAyQF4/9gAyQF5/+wAyQF6/9gAyQF7/+wAyQF8/9gAyQF9/+wAyQF+/9gAyQF//+wAyQGA/9gAyQGB/+wAyQGC/9gAyQGD/+wAyQGE/9gAyQGF/+wAyQGG/9gAyQGH/+wAyQGI/9gAyQGJ/+wAyQGK/9gAyQGL/+wAyQGM/9gAyQGN/+wAyQGP/+cAyQGR/+cAyQGT/+cAyQGV/+cAyQGX/+cAyQGZ/+cAyQGb/+cAyQGd/+cAyQGj/+cAyQGl/+cAyQGn/+cAyQGp/+cAyQGr/+cAyQGt/+cAyQGv/+cAyQGx/+cAyQGz/+cAyQG1/+cAyQG3/+cAyQG5/+cAyQG7/+wAyQG9/+wAyQG//+wAyQHB/+wAyQHD/+wAyQHF/+wAyQHH/+wAyQHS/9gAyQHT/+wAyQHV/+cAyQHX/+cAyQHb/+cAyQHg/+cAyQHi/+wAyQHk/+cAyQHm/+wBEQDX/+IBEQDY/+IBEQDd/+wBEQDf/+IBEQDg/+IBEQDm/+IBEQD4/+cBEQD8/+wBEgDX/+IBEgDY/+IBEgDd/+wBEgDf/+IBEgDg/+IBEgDm/+wBEgD4/+cBEgD8/+wBEwDX/+IBEwDY/+IBEwDd/+wBEwDf/+IBEwDg/+IBEwDm/+IBEwD4/+cBEwD8/+wBFADX/+IBFADY/+IBFADd/+wBFADf/+IBFADg/+IBFADm/+IBFAD4/+cBFAD8/+wBFQDX/+IBFQDY/+IBFQDd/+wBFQDf/+IBFQDg/+IBFQDm/+IBFQD4/+cBFQD8/+wBdgA1/9gBdgA3/84BdgA4/9MBdgA6/9gBdgBa//EBdgCf/9gBdgC///EBdgDB//EBdgDJ/9gBdgHI/9gBdgHJ//EBdgHK/9gBdgHL//EBdgHM/9gBdgHN//EBdgHO/9gBdgHP//EBeAA1/9gBeAA3/84BeAA4/9MBeAA6/9gBeABa//EBeACf/9gBeAC///EBeADB//EBeADJ/9gBeAHI/9gBeAHJ//EBeAHK/9gBeAHL//EBeAHM/9gBeAHN//EBeAHO/9gBeAHP//EBegA1/9gBegA3/84BegA4/9MBegA6/9gBegBa//EBegCf/9gBegC///EBegDB//EBegDJ/9gBegHI/9gBegHJ//EBegHK/9gBegHL//EBegHM/9gBegHN//EBegHO/9gBegHP//EBfAA1/9gBfAA3/84BfAA4/9MBfAA6/9gBfABa//EBfACf/9gBfAC///EBfADB//EBfADJ/9gBfAHI/9gBfAHJ//EBfAHK/9gBfAHL//EBfAHM/9gBfAHN//EBfAHO/9gBfAHP//EBfgA1/9gBfgA3/84BfgA4/9MBfgA6/9gBfgBa//EBfgCf/9gBfgC///EBfgDB//EBfgDJ/9gBfgHI/9gBfgHJ//EBfgHK/9gBfgHL//EBfgHM/9gBfgHN//EBfgHO/9gBfgHP//EBgAA1/9gBgAA3/84BgAA4/9MBgAA6/9gBgABa//EBgACf/9gBgAC///EBgADB//EBgADJ/9gBgAHI/9gBgAHJ//EBgAHK/9gBgAHL//EBgAHM/9gBgAHN//EBgAHO/9gBgAHP//EBggA1/9gBggA3/84BggA4/9MBggA6/9gBggBa//EBggCf/9gBggC///EBggDB//EBggDJ/9gBggHI/9gBggHJ//EBggHK/9gBggHL//EBggHM/9gBggHN//EBggHO/9gBggHP//EBhAA1/9gBhAA3/84BhAA4/9MBhAA6/9gBhABa//EBhACf/9gBhAC///EBhADB//EBhADJ/9gBhAHI/9gBhAHJ//EBhAHK/9gBhAHL//EBhAHM/9gBhAHN//EBhAHO/9gBhAHP//EBhgA1/9gBhgA3/84BhgA4/9MBhgA6/9gBhgBa//EBhgCf/9gBhgC///EBhgDB//EBhgDJ/9gBhgHI/9gBhgHJ//EBhgHK/9gBhgHL//EBhgHM/9gBhgHN//EBhgHO/9gBhgHP//EBiAA1/9gBiAA3/84BiAA4/9MBiAA6/9gBiABa//EBiACf/9gBiAC///EBiADB//EBiADJ/9gBiAHI/9gBiAHJ//EBiAHK/9gBiAHL//EBiAHM/9gBiAHN//EBiAHO/9gBiAHP//EBigA1/9gBigA3/84BigA4/9MBigA6/9gBigBa//EBigCf/9gBigC///EBigDB//EBigDJ/9gBigHI/9gBigHJ//EBigHK/9gBigHL//EBigHM/9gBigHN//EBigHO/9gBigHP//EBjAA1/9gBjAA3/84BjAA4/9MBjAA6/9gBjABa//EBjACf/9gBjAC///EBjADB//EBjADJ/9gBjAHI/9gBjAHJ//EBjAHK/9gBjAHL//EBjAHM/9gBjAHN//EBjAHO/9gBjAHP//EByAAi/9gByABC/+wByABE/+cByABG/+cByABI/+cByABO/+wByABP/+wByABQ/+cByABR/+wByABS/+cByABT/+wByABU/+cByABW/+wByACC/9gByACD/9gByACE/9gByACF/9gByACG/9gByACH/9gByACi/+wByACj/+wByACk/+wByACl/+wByACm/+wByACn/+wByACo/+wByACp/+cByACq/+cByACr/+cByACs/+cByACt/+cByACy/+cByACz/+wByAC0/+cByAC1/+cByAC2/+cByAC3/+cByAC4/+cByAC6/+cByAC7/+wByAC8/+wByAC9/+wByAC+/+wByADG/+cByADI/+cByAF2/9gByAF3/+wByAF4/9gByAF5/+wByAF6/9gByAF7/+wByAF8/9gByAF9/+wByAF+/9gByAF//+wByAGA/9gByAGB/+wByAGC/9gByAGD/+wByAGE/9gByAGF/+wByAGG/9gByAGH/+wByAGI/9gByAGJ/+wByAGK/9gByAGL/+wByAGM/9gByAGN/+wByAGP/+cByAGR/+cByAGT/+cByAGV/+cByAGX/+cByAGZ/+cByAGb/+cByAGd/+cByAGj/+cByAGl/+cByAGn/+cByAGp/+cByAGr/+cByAGt/+cByAGv/+cByAGx/+cByAGz/+cByAG1/+cByAG3/+cByAG5/+cByAG7/+wByAG9/+wByAG//+wByAHB/+wByAHD/+wByAHF/+wByAHH/+wByAHS/9gByAHT/+wByAHV/+cByAHX/+cByAHb/+cByAHg/+cByAHi/+wByAHk/+cByAHm/+wBygAi/9gBygBC/+wBygBE/+cBygBG/+cBygBI/+cBygBO/+wBygBP/+wBygBQ/+cBygBR/+wBygBS/+cBygBT/+wBygBU/+cBygBW/+wBygCC/9gBygCD/9gBygCE/9gBygCF/9gBygCG/9gBygCH/9gBygCi/+wBygCj/+wBygCk/+wBygCl/+wBygCm/+wBygCn/+wBygCo/+wBygCp/+cBygCq/+cBygCr/+cBygCs/+cBygCt/+cBygCy/+cBygCz/+wBygC0/+cBygC1/+cBygC2/+cBygC3/+cBygC4/+cBygC6/+cBygC7/+wBygC8/+wBygC9/+wBygC+/+wBygDG/+cBygDI/+cBygF2/9gBygF3/+wBygF4/9gBygF5/+wBygF6/9gBygF7/+wBygF8/9gBygF9/+wBygF+/9gBygF//+wBygGA/9gBygGB/+wBygGC/9gBygGD/+wBygGE/9gBygGF/+wBygGG/9gBygGH/+wBygGI/9gBygGJ/+wBygGK/9gBygGL/+wBygGM/9gBygGN/+wBygGP/+cBygGR/+cBygGT/+cBygGV/+cBygGX/+cBygGZ/+cBygGb/+cBygGd/+cBygGj/+cBygGl/+cBygGn/+cBygGp/+cBygGr/+cBygGt/+cBygGv/+cBygGx/+cBygGz/+cBygG1/+cBygG3/+cBygG5/+cBygG7/+wBygG9/+wBygG//+wBygHB/+wBygHD/+wBygHF/+wBygHH/+wBygHS/9gBygHT/+wBygHV/+cBygHX/+cBygHb/+cBygHg/+cBygHi/+wBygHk/+cBygHm/+wBzAAi/9gBzABC/+wBzABE/+cBzABG/+cBzABI/+cBzABO/+wBzABP/+wBzABQ/+cBzABR/+wBzABS/+cBzABT/+wBzABU/+cBzABW/+wBzACC/9gBzACD/9gBzACE/9gBzACF/9gBzACG/9gBzACH/9gBzACi/+wBzACj/+wBzACk/+wBzACl/+wBzACm/+wBzACn/+wBzACo/+wBzACp/+cBzACq/+cBzACr/+cBzACs/+cBzACt/+cBzACy/+cBzACz/+wBzAC0/+cBzAC1/+cBzAC2/+cBzAC3/+cBzAC4/+cBzAC6/+cBzAC7/+wBzAC8/+wBzAC9/+wBzAC+/+wBzADG/+cBzADI/+cBzAF2/9gBzAF3/+wBzAF4/9gBzAF5/+wBzAF6/9gBzAF7/+wBzAF8/9gBzAF9/+wBzAF+/9gBzAF//+wBzAGA/9gBzAGB/+wBzAGC/9gBzAGD/+wBzAGE/9gBzAGF/+wBzAGG/9gBzAGH/+wBzAGI/9gBzAGJ/+wBzAGK/9gBzAGL/+wBzAGM/9gBzAGN/+wBzAGP/+cBzAGR/+cBzAGT/+cBzAGV/+cBzAGX/+cBzAGZ/+cBzAGb/+cBzAGd/+cBzAGj/+cBzAGl/+cBzAGn/+cBzAGp/+cBzAGr/+cBzAGt/+cBzAGv/+cBzAGx/+cBzAGz/+cBzAG1/+cBzAG3/+cBzAG5/+cBzAG7/+wBzAG9/+wBzAG//+wBzAHB/+wBzAHD/+wBzAHF/+wBzAHH/+wBzAHS/9gBzAHT/+wBzAHV/+cBzAHX/+cBzAHb/+cBzAHg/+cBzAHi/+wBzAHk/+cBzAHm/+wBzgAi/9gBzgBC/+wBzgBE/+cBzgBG/+cBzgBI/+cBzgBO/+wBzgBP/+wBzgBQ/+cBzgBR/+wBzgBS/+cBzgBT/+wBzgBU/+cBzgBW/+wBzgCC/9gBzgCD/9gBzgCE/9gBzgCF/9gBzgCG/9gBzgCH/9gBzgCi/+wBzgCj/+wBzgCk/+wBzgCl/+wBzgCm/+wBzgCn/+wBzgCo/+wBzgCp/+cBzgCq/+cBzgCr/+cBzgCs/+cBzgCt/+cBzgCy/+cBzgCz/+wBzgC0/+cBzgC1/+cBzgC2/+cBzgC3/+cBzgC4/+cBzgC6/+cBzgC7/+wBzgC8/+wBzgC9/+wBzgC+/+wBzgDG/+cBzgDI/+cBzgF2/9gBzgF3/+wBzgF4/9gBzgF5/+wBzgF6/9gBzgF7/+wBzgF8/9gBzgF9/+wBzgF+/9gBzgF//+wBzgGA/9gBzgGB/+wBzgGC/9gBzgGD/+wBzgGE/9gBzgGF/+wBzgGG/9gBzgGH/+wBzgGI/9gBzgGJ/+wBzgGK/9gBzgGL/+wBzgGM/9gBzgGN/+wBzgGP/+cBzgGR/+cBzgGT/+cBzgGV/+cBzgGX/+cBzgGZ/+cBzgGb/+cBzgGd/+cBzgGj/+cBzgGl/+cBzgGn/+cBzgGp/+cBzgGr/+cBzgGt/+cBzgGv/+cBzgGx/+cBzgGz/+cBzgG1/+cBzgG3/+cBzgG5/+cBzgG7/+wBzgG9/+wBzgG//+wBzgHB/+wBzgHD/+wBzgHF/+wBzgHH/+wBzgHS/9gBzgHT/+wBzgHV/+cBzgHX/+cBzgHb/+cBzgHg/+cBzgHi/+wBzgHk/+cBzgHm/+wB0gA1/9gB0gA3/84B0gA4/9MB0gA6/9gB0gBa//EB0gCf/9gB0gC///EB0gDB//EB0gDJ/9gB0gHI/9gB0gHJ//EB0gHK/9gB0gHL//EB0gHM/9gB0gHN//EB0gHO/9gB0gHP//EAAAAbAUoAAQAAAAAAAADTAAAAAQAAAAAAAQANAPcAAQAAAAAAAgAHCuEAAQAAAAAAAwA3ANMAAQAAAAAABAANAPcAAQAAAAAABQANAQoAAQAAAAAABgAMARcAAQAAAAAACAApASMAAQAAAAAACQAXAUwAAQAAAAAADAAYAWMAAQAAAAAADQlmAXsAAQAAAAAAEAANAPcAAQAAAAAAEQAHCuEAAQAAAAAAEgANAPcAAwABBAkAAAGmCugAAwABBAkAAQAaDI4AAwABBAkAAgAOIMQAAwABBAkAAwBuDKgAAwABBAkABAAYDRYAAwABBAkABQAaDS4AAwABBAkABgAYDRYAAwABBAkACABSDUgAAwABBAkACQAuDZoAAwABBAkADAAwDcgAAwABBAkADRLMDfgAAwABBAkAEAAaDPAAAwABBAkAEQAOIMRDb3B5cmlnaHQgKGMpIDIwMDYgYnkgRGVwYXJ0bWVudCBvZiBJbnRlbGxlY3R1YWwgUHJvcGVydHkgKERJUCksIE1pbmlzdHJ5IG9mIENvbW1lcmNlIGFuZCBTb2Z0d2FyZSBJbmR1c3RyeSBQcm9tb3Rpb24gQWdlbmN5IChQdWJsaWMgT3JnYW5pemF0aW9uKSAoU0lQQSkuIEFsbCByaWdodHMgcmVzZXJ2ZWQuDQpDcmVhdGVkIGJ5IDogU3VwcGFraXQgQ0hBTEVSTUxBUlAuU3VwcGFraXRDaGFsZXJtbGFycC5QU0suRGVzaWduTFRELjogVEggU2FyYWJ1blBTSzogMjAwNlZlcnNpb24gMS4wMDBUSFNhcmFidW5QU0tNci5TdXBwYWtpdCBDaGFsZXJtbGFycCwgUFNLLiBEZXNpZ24gTFRELk1yLlN1cHBha2l0IENIQUxFUk1MQVJQbWFpbHRvOnBza2ZvbnRAeWFob28uY29tRm9udCBDb21wdXRlciBQcm9ncmFtIExpY2Vuc2UgQWdyZWVtZW50DQ1SZXNlcnZlZCBGb250IE5hbWVzIGZvciB0aGlzIEZvbnQgQ29tcHV0ZXIgUHJvZ3JhbToNVEggS3J1YiwgVEggS3J1YiBJdGFsaWMsIFRIIEtydWIgQm9sZCwgVEggS3J1YiBCb2xkIEl0YWxpYywNVEggTmlyYW1pdCBBUywgVEggTmlyYW1pdCBBUyBJdGFsaWMsIFRIIE5pcmFtaXQgQVMgQm9sZCwgVEggTmlyYW1pdCBBUyBCb2xkIEl0YWxpYywNVEggS29kY2hhc2FsLCBUSCBLb2RjaGFzYWwgSXRhbGljLCBUSCBLb2RjaGFzYWwgQm9sZCwgVEggS29kY2hhc2FsIEJvbGQgSXRhbGljLA1USCBTYXJhYnVuIFBTSywgVEggU2FyYWJ1biBQU0sgSXRhbGljLCBUSCBTYXJhYnVuIFBTSyBCb2xkLCBUSCBTYXJhYnVuIFBTSyBCb2xkIEl0YWxpYywNVEggSzJEIEp1bHk4LCBUSCBLMkQgSnVseTggSXRhbGljLCBUSCBLMkQgSnVseTggQm9sZCwgVEggSzJEIEp1bHk4IEJvbGQgSXRhbGljLA1USCBNYWxpIEdyYWRlIDYsIFRIIE1hbGkgR3JhZGUgNiBJdGFsaWMsIFRIIE1hbGkgR3JhZGUgNiBCb2xkLCBUSCBNYWxpIEdyYWRlIDYgQm9sZCBJdGFsaWMsDVRIIENoYWtyYSBQZXRjaCwgVEggQ2hha3JhIFBldGNoIEl0YWxpYywgVEggQ2hha3JhIFBldGNoIEJvbGQsIFRIIENoYWtyYSBQZXRjaCBCb2xkIEl0YWxpYywNVEggQmFpamFtLCBUSCBCYWlqYW0gSXRhbGljLCBUSCBCYWlqYW0gQm9sZCwgVEggQmFpamFtIEJvbGQgSXRhbGljLA1USCBLb0hvLCBUSCBLb0hvIEl0YWxpYywgVEggS29IbyBCb2xkLCBUSCBLb0hvIEJvbGQgSXRhbGljLA1USCBGYWggS3dhbmcsIFRIIEZhaCBLd2FuZyBJdGFsaWMsIFRIIEZhaCBLd2FuZyBCb2xkLCBUSCBGYWggS3dhbmcgQm9sZCBJdGFsaWMuDQ1UaGlzIEZvbnQgQ29tcHV0ZXIgUHJvZ3JhbSBpcyB0aGUgY29weXJpZ2h0IG9mIHRoZSBEZXBhcnRtZW50IG9mIEludGVsbGVjdHVhbCBQcm9wZXJ0eSAoRElQKSwgTWluaXN0cnkgb2YgQ29tbWVyY2UgYW5kIHRoZSBTb2Z0d2FyZSBJbmR1c3RyeSBQcm9tb3Rpb24gQWdlbmN5IChQdWJsaWMgT3JnYW5pemF0aW9uKSAoU0lQQSkgDQ1UaGUgcHVycG9zZXMgb2YgdGhpcyBGb250IENvbXB1dGVyIFByb2dyYW0gTGljZW5zZSBhcmUgdG8gc3RpbXVsYXRlIHdvcmxkd2lkZSBkZXZlbG9wbWVudCBvZiBjb29wZXJhdGl2ZSBmb250IGNyZWF0aW9uLCB0byBiZW5lZml0IGZvciBhY2FkZW1pYywgdG8gc2hhcmUgYW5kIHRvIGRldmVsb3AgaW4gcGFydG5lcnNoaXAgd2l0aCBvdGhlcnMuDQ1UZXJtIGFuZCBDb25kaXRpb24gb2YgdGhlIEZvbnQgQ29tcHV0ZXIgUHJvZ3JhbQ0NKDEpIEFsbG93IHRvIHVzZSB3aXRob3V0IGFueSBjaGFyZ2VzIGFuZCBhbGxvdyB0byByZXByb2R1Y2UsIHN0dWR5LCBhZGFwdCBhbmQgZGlzdHJpYnV0ZSB0aGlzIEZvbnQgQ29tcHV0ZXIgUHJvZ3JhbS4gTmVpdGhlciB0aGUgb3JpZ2luYWwgdmVyc2lvbiBub3IgYWRhcHRlZCB2ZXJzaW9uIG9mIEZvbnQgQ29tcHV0ZXIgUHJvZ3JhbSBtYXkgYmUgc29sZCBieSBpdHNlbGYsIGV4Y2VwdCBidW5kbGVkIGFuZC9vciBzb2xkIHdpdGggYW55IGNvbXB1dGVyIHByb2dyYW0uDQ0oMikgSWYgeW91IHdpc2ggdG8gYWRhcHQgdGhpcyBGb250IENvbXB1dGVyIFByb2dyYW0sIHlvdSBtdXN0IG5vdGlmeSBjb3B5cmlnaHQgb3duZXJzIChESVAgJiBTSVBBKSBpbiB3cml0aW5nLg0NKDMpIE5vIGFkYXB0ZWQgdmVyc2lvbiBvZiBGb250IENvbXB1dGVyIFByb2dyYW0gbWF5IHVzZSB0aGUgUmVzZXJ2ZWQgRm9udCBOYW1lKHMpLCB0aGUgbmFtZShzKSBvZiB0aGUgY29weXJpZ2h0IG93bmVycyBhbmQgdGhlIGF1dGhvcihzKSBvZiB0aGUgRm9udCBDb21wdXRlciBQcm9ncmFtIG11c3Qgbm90IGJlIHVzZWQgdG8gcHJvbW90ZSBvciBhZHZlcnRpc2UgYW55IGFkYXB0ZWQgdmVyc2lvbiwgZXhjZXB0IG9idGFpbmluZyB3cml0dGVuIHBlcm1pc3Npb24gZnJvbSBjb3B5cmlnaHQgb3duZXJzIGFuZCB0aGUgYXV0aG9yKHMpLg0NKDQpIFRoZSBhZGFwdGVkIHZlcnNpb24gb2YgRm9udCBDb21wdXRlciBQcm9ncmFtIG11c3QgYmUgcmVsZWFzZWQgdW5kZXIgdGhlIHRlcm0gYW5kIGNvbmRpdGlvbiBvZiB0aGlzIGxpY2Vuc2UuDQ1ESVNDTEFJTUVSDVRIRSBGT05UIENPTVBVVEVSIFBST0dSQU0gQU5EIFJFTEFURUQgRklMRVMgQVJFIFBST1ZJREVEID9BUyBJUz8gQU5EIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQuICBOTyBHVUFSQU5URUVTIEFSRSBNQURFIFRIQVQgVEhJUyBGT05UIENPTVBVVEVSIFBST0dSQU0gV0lMTCBXT1JLIEFTIEVYUEVDVEVEIE9SIFdJTEwgQkUgREVWRUxPUEVEIEZVUlRIVVIgSU4gQU5ZIFNQRUNJRklDIFdBWS4gIFRIRVJFIElTIE5PIE9GRkVSIE9SIEdVQVJBTlRFRSBPRiBURUNITklDQUwgU1VQUE9SVC4gUmVndWxhcgBDAG8AcAB5AHIAaQBnAGgAdAAgACgAYwApACAAMgAwADAANgAgAGIAeQAgAEQAZQBwAGEAcgB0AG0AZQBuAHQAIABvAGYAIABJAG4AdABlAGwAbABlAGMAdAB1AGEAbAAgAFAAcgBvAHAAZQByAHQAeQAgACgARABJAFAAKQAsACAATQBpAG4AaQBzAHQAcgB5ACAAbwBmACAAQwBvAG0AbQBlAHIAYwBlACAAYQBuAGQAIABTAG8AZgB0AHcAYQByAGUAIABJAG4AZAB1AHMAdAByAHkAIABQAHIAbwBtAG8AdABpAG8AbgAgAEEAZwBlAG4AYwB5ACAAKABQAHUAYgBsAGkAYwAgAE8AcgBnAGEAbgBpAHoAYQB0AGkAbwBuACkAIAAoAFMASQBQAEEAKQAuACAAQQBsAGwAIAByAGkAZwBoAHQAcwAgAHIAZQBzAGUAcgB2AGUAZAAuAA0ACgBDAHIAZQBhAHQAZQBkACAAYgB5ACAAOgAgAFMAdQBwAHAAYQBrAGkAdAAgAEMASABBAEwARQBSAE0ATABBAFIAUAAuAFQASAAgAFMAYQByAGEAYgB1AG4ASQBUDlkAUwB1AHAAcABhAGsAaQB0AEMAaABhAGwAZQByAG0AbABhAHIAcAAuAFAAUwBLAC4ARABlAHMAaQBnAG4ATABUAEQALgA6ACAAVABIACAAUwBhAHIAYQBiAHUAbgBQAFMASwA6ACAAMgAwADAANgBUAEgAUwBhAHIAYQBiAHUAbgBJAFQOWQBWAGUAcgBzAGkAbwBuACAAMQAuADAAMAAwAE0AcgAuAFMAdQBwAHAAYQBrAGkAdAAgAEMAaABhAGwAZQByAG0AbABhAHIAcAAsACAAUABTAEsALgAgAEQAZQBzAGkAZwBuACAATABUAEQALgBNAHIALgBTAHUAcABwAGEAawBpAHQAIABDAEgAQQBMAEUAUgBNAEwAQQBSAFAAbQBhAGkAbAB0AG8AOgBwAHMAawBmAG8AbgB0AEAAeQBhAGgAbwBvAC4AYwBvAG0ARgBvAG4AdAAgAEMAbwBtAHAAdQB0AGUAcgAgAFAAcgBvAGcAcgBhAG0AIABMAGkAYwBlAG4AcwBlACAAQQBnAHIAZQBlAG0AZQBuAHQADQANAFIAZQBzAGUAcgB2AGUAZAAgAEYAbwBuAHQAIABOAGEAbQBlAHMAIABmAG8AcgAgAHQAaABpAHMAIABGAG8AbgB0ACAAQwBvAG0AcAB1AHQAZQByACAAUAByAG8AZwByAGEAbQA6AA0AVABIACAASwByAHUAYgAsACAAVABIACAASwByAHUAYgAgAEkAdABhAGwAaQBjACwAIABUAEgAIABLAHIAdQBiACAAQgBvAGwAZAAsACAAVABIACAASwByAHUAYgAgAEIAbwBsAGQAIABJAHQAYQBsAGkAYwAsAA0AVABIACAATgBpAHIAYQBtAGkAdAAgAEEAUwAsACAAVABIACAATgBpAHIAYQBtAGkAdAAgAEEAUwAgAEkAdABhAGwAaQBjACwAIABUAEgAIABOAGkAcgBhAG0AaQB0ACAAQQBTACAAQgBvAGwAZAAsACAAVABIACAATgBpAHIAYQBtAGkAdAAgAEEAUwAgAEIAbwBsAGQAIABJAHQAYQBsAGkAYwAsAA0AVABIACAASwBvAGQAYwBoAGEAcwBhAGwALAAgAFQASAAgAEsAbwBkAGMAaABhAHMAYQBsACAASQB0AGEAbABpAGMALAAgAFQASAAgAEsAbwBkAGMAaABhAHMAYQBsACAAQgBvAGwAZAAsACAAVABIACAASwBvAGQAYwBoAGEAcwBhAGwAIABCAG8AbABkACAASQB0AGEAbABpAGMALAANAFQASAAgAFMAYQByAGEAYgB1AG4AIABQAFMASwAsACAAVABIACAAUwBhAHIAYQBiAHUAbgAgAFAAUwBLACAASQB0AGEAbABpAGMALAAgAFQASAAgAFMAYQByAGEAYgB1AG4AIABQAFMASwAgAEIAbwBsAGQALAAgAFQASAAgAFMAYQByAGEAYgB1AG4AIABQAFMASwAgAEIAbwBsAGQAIABJAHQAYQBsAGkAYwAsAA0AVABIACAASwAyAEQAIABKAHUAbAB5ADgALAAgAFQASAAgAEsAMgBEACAASgB1AGwAeQA4ACAASQB0AGEAbABpAGMALAAgAFQASAAgAEsAMgBEACAASgB1AGwAeQA4ACAAQgBvAGwAZAAsACAAVABIACAASwAyAEQAIABKAHUAbAB5ADgAIABCAG8AbABkACAASQB0AGEAbABpAGMALAANAFQASAAgAE0AYQBsAGkAIABHAHIAYQBkAGUAIAA2ACwAIABUAEgAIABNAGEAbABpACAARwByAGEAZABlACAANgAgAEkAdABhAGwAaQBjACwAIABUAEgAIABNAGEAbABpACAARwByAGEAZABlACAANgAgAEIAbwBsAGQALAAgAFQASAAgAE0AYQBsAGkAIABHAHIAYQBkAGUAIAA2ACAAQgBvAGwAZAAgAEkAdABhAGwAaQBjACwADQBUAEgAIABDAGgAYQBrAHIAYQAgAFAAZQB0AGMAaAAsACAAVABIACAAQwBoAGEAawByAGEAIABQAGUAdABjAGgAIABJAHQAYQBsAGkAYwAsACAAVABIACAAQwBoAGEAawByAGEAIABQAGUAdABjAGgAIABCAG8AbABkACwAIABUAEgAIABDAGgAYQBrAHIAYQAgAFAAZQB0AGMAaAAgAEIAbwBsAGQAIABJAHQAYQBsAGkAYwAsAA0AVABIACAAQgBhAGkAagBhAG0ALAAgAFQASAAgAEIAYQBpAGoAYQBtACAASQB0AGEAbABpAGMALAAgAFQASAAgAEIAYQBpAGoAYQBtACAAQgBvAGwAZAAsACAAVABIACAAQgBhAGkAagBhAG0AIABCAG8AbABkACAASQB0AGEAbABpAGMALAANAFQASAAgAEsAbwBIAG8ALAAgAFQASAAgAEsAbwBIAG8AIABJAHQAYQBsAGkAYwAsACAAVABIACAASwBvAEgAbwAgAEIAbwBsAGQALAAgAFQASAAgAEsAbwBIAG8AIABCAG8AbABkACAASQB0AGEAbABpAGMALAANAFQASAAgAEYAYQBoACAASwB3AGEAbgBnACwAIABUAEgAIABGAGEAaAAgAEsAdwBhAG4AZwAgAEkAdABhAGwAaQBjACwAIABUAEgAIABGAGEAaAAgAEsAdwBhAG4AZwAgAEIAbwBsAGQALAAgAFQASAAgAEYAYQBoACAASwB3AGEAbgBnACAAQgBvAGwAZAAgAEkAdABhAGwAaQBjAC4ADQANAFQAaABpAHMAIABGAG8AbgB0ACAAQwBvAG0AcAB1AHQAZQByACAAUAByAG8AZwByAGEAbQAgAGkAcwAgAHQAaABlACAAYwBvAHAAeQByAGkAZwBoAHQAIABvAGYAIAB0AGgAZQAgAEQAZQBwAGEAcgB0AG0AZQBuAHQAIABvAGYAIABJAG4AdABlAGwAbABlAGMAdAB1AGEAbAAgAFAAcgBvAHAAZQByAHQAeQAgACgARABJAFAAKQAsACAATQBpAG4AaQBzAHQAcgB5ACAAbwBmACAAQwBvAG0AbQBlAHIAYwBlACAAYQBuAGQAIAB0AGgAZQAgAFMAbwBmAHQAdwBhAHIAZQAgAEkAbgBkAHUAcwB0AHIAeQAgAFAAcgBvAG0AbwB0AGkAbwBuACAAQQBnAGUAbgBjAHkAIAAoAFAAdQBiAGwAaQBjACAATwByAGcAYQBuAGkAegBhAHQAaQBvAG4AKQAgACgAUwBJAFAAQQApACAADQANAFQAaABlACAAcAB1AHIAcABvAHMAZQBzACAAbwBmACAAdABoAGkAcwAgAEYAbwBuAHQAIABDAG8AbQBwAHUAdABlAHIAIABQAHIAbwBnAHIAYQBtACAATABpAGMAZQBuAHMAZQAgAGEAcgBlACAAdABvACAAcwB0AGkAbQB1AGwAYQB0AGUAIAB3AG8AcgBsAGQAdwBpAGQAZQAgAGQAZQB2AGUAbABvAHAAbQBlAG4AdAAgAG8AZgAgAGMAbwBvAHAAZQByAGEAdABpAHYAZQAgAGYAbwBuAHQAIABjAHIAZQBhAHQAaQBvAG4ALAAgAHQAbwAgAGIAZQBuAGUAZgBpAHQAIABmAG8AcgAgAGEAYwBhAGQAZQBtAGkAYwAsACAAdABvACAAcwBoAGEAcgBlACAAYQBuAGQAIAB0AG8AIABkAGUAdgBlAGwAbwBwACAAaQBuACAAcABhAHIAdABuAGUAcgBzAGgAaQBwACAAdwBpAHQAaAAgAG8AdABoAGUAcgBzAC4ADQANAFQAZQByAG0AIABhAG4AZAAgAEMAbwBuAGQAaQB0AGkAbwBuACAAbwBmACAAdABoAGUAIABGAG8AbgB0ACAAQwBvAG0AcAB1AHQAZQByACAAUAByAG8AZwByAGEAbQANAA0AKAAxACkAIABBAGwAbABvAHcAIAB0AG8AIAB1AHMAZQAgAHcAaQB0AGgAbwB1AHQAIABhAG4AeQAgAGMAaABhAHIAZwBlAHMAIABhAG4AZAAgAGEAbABsAG8AdwAgAHQAbwAgAHIAZQBwAHIAbwBkAHUAYwBlACwAIABzAHQAdQBkAHkALAAgAGEAZABhAHAAdAAgAGEAbgBkACAAZABpAHMAdAByAGkAYgB1AHQAZQAgAHQAaABpAHMAIABGAG8AbgB0ACAAQwBvAG0AcAB1AHQAZQByACAAUAByAG8AZwByAGEAbQAuACAATgBlAGkAdABoAGUAcgAgAHQAaABlACAAbwByAGkAZwBpAG4AYQBsACAAdgBlAHIAcwBpAG8AbgAgAG4AbwByACAAYQBkAGEAcAB0AGUAZAAgAHYAZQByAHMAaQBvAG4AIABvAGYAIABGAG8AbgB0ACAAQwBvAG0AcAB1AHQAZQByACAAUAByAG8AZwByAGEAbQAgAG0AYQB5ACAAYgBlACAAcwBvAGwAZAAgAGIAeQAgAGkAdABzAGUAbABmACwAIABlAHgAYwBlAHAAdAAgAGIAdQBuAGQAbABlAGQAIABhAG4AZAAvAG8AcgAgAHMAbwBsAGQAIAB3AGkAdABoACAAYQBuAHkAIABjAG8AbQBwAHUAdABlAHIAIABwAHIAbwBnAHIAYQBtAC4ADQANACgAMgApACAASQBmACAAeQBvAHUAIAB3AGkAcwBoACAAdABvACAAYQBkAGEAcAB0ACAAdABoAGkAcwAgAEYAbwBuAHQAIABDAG8AbQBwAHUAdABlAHIAIABQAHIAbwBnAHIAYQBtACwAIAB5AG8AdQAgAG0AdQBzAHQAIABuAG8AdABpAGYAeQAgAGMAbwBwAHkAcgBpAGcAaAB0ACAAbwB3AG4AZQByAHMAIAAoAEQASQBQACAAJgAgAFMASQBQAEEAKQAgAGkAbgAgAHcAcgBpAHQAaQBuAGcALgANAA0AKAAzACkAIABOAG8AIABhAGQAYQBwAHQAZQBkACAAdgBlAHIAcwBpAG8AbgAgAG8AZgAgAEYAbwBuAHQAIABDAG8AbQBwAHUAdABlAHIAIABQAHIAbwBnAHIAYQBtACAAbQBhAHkAIAB1AHMAZQAgAHQAaABlACAAUgBlAHMAZQByAHYAZQBkACAARgBvAG4AdAAgAE4AYQBtAGUAKABzACkALAAgAHQAaABlACAAbgBhAG0AZQAoAHMAKQAgAG8AZgAgAHQAaABlACAAYwBvAHAAeQByAGkAZwBoAHQAIABvAHcAbgBlAHIAcwAgAGEAbgBkACAAdABoAGUAIABhAHUAdABoAG8AcgAoAHMAKQAgAG8AZgAgAHQAaABlACAARgBvAG4AdAAgAEMAbwBtAHAAdQB0AGUAcgAgAFAAcgBvAGcAcgBhAG0AIABtAHUAcwB0ACAAbgBvAHQAIABiAGUAIAB1AHMAZQBkACAAdABvACAAcAByAG8AbQBvAHQAZQAgAG8AcgAgAGEAZAB2AGUAcgB0AGkAcwBlACAAYQBuAHkAIABhAGQAYQBwAHQAZQBkACAAdgBlAHIAcwBpAG8AbgAsACAAZQB4AGMAZQBwAHQAIABvAGIAdABhAGkAbgBpAG4AZwAgAHcAcgBpAHQAdABlAG4AIABwAGUAcgBtAGkAcwBzAGkAbwBuACAAZgByAG8AbQAgAGMAbwBwAHkAcgBpAGcAaAB0ACAAbwB3AG4AZQByAHMAIABhAG4AZAAgAHQAaABlACAAYQB1AHQAaABvAHIAKABzACkALgANAA0AKAA0ACkAIABUAGgAZQAgAGEAZABhAHAAdABlAGQAIAB2AGUAcgBzAGkAbwBuACAAbwBmACAARgBvAG4AdAAgAEMAbwBtAHAAdQB0AGUAcgAgAFAAcgBvAGcAcgBhAG0AIABtAHUAcwB0ACAAYgBlACAAcgBlAGwAZQBhAHMAZQBkACAAdQBuAGQAZQByACAAdABoAGUAIAB0AGUAcgBtACAAYQBuAGQAIABjAG8AbgBkAGkAdABpAG8AbgAgAG8AZgAgAHQAaABpAHMAIABsAGkAYwBlAG4AcwBlAC4ADQANAEQASQBTAEMATABBAEkATQBFAFIADQBUAEgARQAgAEYATwBOAFQAIABDAE8ATQBQAFUAVABFAFIAIABQAFIATwBHAFIAQQBNACAAQQBOAEQAIABSAEUATABBAFQARQBEACAARgBJAEwARQBTACAAQQBSAEUAIABQAFIATwBWAEkARABFAEQAIADSAEEAUwAgAEkAUwDTACAAQQBOAEQAIABXAEkAVABIAE8AVQBUACAAVwBBAFIAUgBBAE4AVABZACAATwBGACAAQQBOAFkAIABLAEkATgBEAC4AIAAgAE4ATwAgAEcAVQBBAFIAQQBOAFQARQBFAFMAIABBAFIARQAgAE0AQQBEAEUAIABUAEgAQQBUACAAVABIAEkAUwAgAEYATwBOAFQAIABDAE8ATQBQAFUAVABFAFIAIABQAFIATwBHAFIAQQBNACAAVwBJAEwATAAgAFcATwBSAEsAIABBAFMAIABFAFgAUABFAEMAVABFAEQAIABPAFIAIABXAEkATABMACAAQgBFACAARABFAFYARQBMAE8AUABFAEQAIABGAFUAUgBUAEgAVQBSACAASQBOACAAQQBOAFkAIABTAFAARQBDAEkARgBJAEMAIABXAEEAWQAuACAAIABUAEgARQBSAEUAIABJAFMAIABOAE8AIABPAEYARgBFAFIAIABPAFIAIABHAFUAQQBSAEEATgBUAEUARQAgAE8ARgAgAFQARQBDAEgATgBJAEMAQQBMACAAUwBVAFAAUABPAFIAVAAuACAAUgBlAGcAdQBsAGEAcgACAAAAAAAA/90AHgAAAAAAAAAAAAAAAAAAAAAAAAAAAf0AAACsAAQABQAGAAcACAAJAAoACwAMAA0ADgAPABAAEQASABMAFAAVABYAFwAYABkAGgAbABwAHQAeAB8AIAAhACIAIwAkACUAJgAnACgAKQAqACsALAAtAC4ALwAwADEAMgAzADQANQA2ADcAOAA5ADoAOwA8AD0APgA/AEAAQQBCAEMARABFAEYARwBIAEkASgBLAEwATQBOAE8AUABRAFIAUwBUAFUAVgBXAFgAWQBaAFsAXABdAF4AXwBgAGEBAgABAAIBAwCjAIQAhQC9AJYA6ACGAI4AiwCdAKkApACKANoAgwCTAPIA8wCNAJcAiADDAN4A8QCeAKoA9QD0APYAogCtAMkAxwCuAGIAYwCQAGQAywBlAMgAygDPAMwAzQDOAOkAZgDTANAA0QCvAGcA8ACRANYA1ADVAGgA6wDtAIkAagBpAGsAbQBsAG4AoABvAHEAcAByAHMAdQB0AHYAdwDqAHgAegB5AHsAfQB8ALgAoQB/AH4AgACBAOwA7gC6ANcA4gDjALAAsQDkAOUAuwDmAOcApgDYAOEA2wDcAN0A4ADZAN8BBAEFAQYBBwEIAQkBCgELAQwBDQEOAQ8BEAERARIBEwEUARUBFgEXARgBGQEaARsBHAEdAR4BHwEgASEBIgEjASQBJQEmAScBKAEpASoBKwEsAS0BLgEvATABMQEyATMBNAE1ATYBNwE4ATkBOgE7ATwBPQE+AT8BQAFBAUIBQwFEAUUBRgFHAUgBSQFKAUsBTAFNAU4BTwFQAVEBUgFTAVQBVQFWAVcBWAFZAVoBWwFcAV0BXgFfALIAswC2ALcAxAC0ALUAxQCCAMIAhwCrAMYBYAFhAL4AvwC8AWIBYwCMAWQBZQCYAKgAmgCZAO8ApQCSAJwApwCPAJQAlQC5AWYBZwFoAWkBagFrAWwBbQFuAW8BcAFxAXIBcwF0AXUBdgF3AXgBeQF6AXsBfAF9AX4BfwGAAYEBggGDAMAAwQGEAYUBhgGHAYgBiQGKAYsBjAGNAY4BjwGQAZEBkgGTAZQBlQGWAZcBmAGZAZoBmwGcAZ0BngGfAaABoQGiAaMBpAGlAaYBpwGoAakBqgGrAawBrQGuAa8BsAGxAbIBswG0AbUBtgG3AbgBuQG6AbsBvAG9Ab4BvwHAAcEBwgHDAcQBxQHGAccByAHJAcoBywHMAc0BzgHPAdAB0QHSAdMB1AHVAdYB1wHYAdkB2gHbAdwB3QHeAPcB3wHgAeEA/QD+AP8BAAHiAQEA+AD5AeMB5AD6APsA/AHlAeYB5wHoAekB6gHrAewB7QHuAe8B8AHxAfIB8wADAfQB9QH2AfcB+AH5AfoB+wH8Af0B/gH/DHVuaTBFMzMuYWx0MQx1bmkwRTRFLmFsdDEHdW5pMEUwMAd1bmkwRTAxB3VuaTBFMDIHdW5pMEUwMwd1bmkwRTA0B3VuaTBFMDUHdW5pMEUwNgd1bmkwRTA3B3VuaTBFMDgHdW5pMEUwOQd1bmkwRTBBB3VuaTBFMEIHdW5pMEUwQwd1bmkwRTBEB3VuaTBFMEUHdW5pMEUwRgd1bmkwRTEwB3VuaTBFMTEHdW5pMEUxMgd1bmkwRTEzB3VuaTBFMTQHdW5pMEUxNQd1bmkwRTE2B3VuaTBFMTcHdW5pMEUxOAd1bmkwRTE5B3VuaTBFMUEHdW5pMEUxQgd1bmkwRTFDB3VuaTBFMUQHdW5pMEUxRQd1bmkwRTFGB3VuaTBFMjAHdW5pMEUyMQd1bmkwRTIyB3VuaTBFMjMHdW5pMEUyNAd1bmkwRTI1B3VuaTBFMjYHdW5pMEUyNwd1bmkwRTI4B3VuaTBFMjkHdW5pMEUyQQd1bmkwRTJCB3VuaTBFMkMHdW5pMEUyRAd1bmkwRTJFB3VuaTBFMkYHdW5pMEUzMAd1bmkwRTMxB3VuaTBFMzIHdW5pMEUzMwd1bmkwRTM0B3VuaTBFMzUHdW5pMEUzNgd1bmkwRTM3B3VuaTBFMzgHdW5pMEUzOQd1bmkwRTNBB3VuaTBFM0YHdW5pMEU0MAd1bmkwRTQxB3VuaTBFNDIHdW5pMEU0Mwd1bmkwRTQ0B3VuaTBFNDUHdW5pMEU0Ngd1bmkwRTQ3B3VuaTBFNDgHdW5pMEU0OQd1bmkwRTRBB3VuaTBFNEIHdW5pMEU0Qwd1bmkwRTREB3VuaTBFNEUHdW5pMEU0Rgd1bmkwRTUwB3VuaTBFNTEHdW5pMEU1Mgd1bmkwRTUzB3VuaTBFNTQHdW5pMEU1NQd1bmkwRTU2B3VuaTBFNTcHdW5pMEU1OAd1bmkwRTU5B3VuaTBFNUEHdW5pMEU1QhJ6ZXJvd2lkdGhub25qb2luZXIPemVyb3dpZHRoam9pbmVyD2xlZnR0b3JpZ2h0bWFyaw9yaWdodHRvbGVmdG1hcmsGbWludXRlBnNlY29uZARFdXJvB3VuaTIxMTMDT2htCWVzdGltYXRlZAxkb3R0ZWRjaXJjbGUMdW5pMEUxMC5hbHQxDHVuaTBFMzQuYWx0MQx1bmkwRTM1LmFsdDEMdW5pMEUzNi5hbHQxDHVuaTBFMzcuYWx0MQx1bmkwRTQ4LmFsdDEMdW5pMEU0OS5hbHQxDHVuaTBFNEEuYWx0MQx1bmkwRTRCLmFsdDEMdW5pMEU0Qy5hbHQxDHVuaTBFNDguYWx0Mgx1bmkwRTQ5LmFsdDIMdW5pMEU0QS5hbHQyDHVuaTBFNEIuYWx0Mgx1bmkwRTRDLmFsdDIMdW5pMEUwRC5hbHQxDHVuaTBFMzEuYWx0MQx1bmkwRTRELmFsdDEMdW5pMEU0Ny5hbHQxDHVuaTBFNDguYWx0Mwx1bmkwRTQ5LmFsdDMMdW5pMEU0QS5hbHQzDHVuaTBFNEIuYWx0Mwx1bmkwRTRDLmFsdDMMdW5pMEUzOC5hbHQxDHVuaTBFMzkuYWx0MQx1bmkwRTNBLmFsdDEMdW5pMEUwRi5hbHQxDHVuaTBFMkMuYWx0MQNQU0sHdW5pMUVBMAd1bmkxRUExB3VuaTFFQTIHdW5pMUVBMwd1bmkxRUE0B3VuaTFFQTUHdW5pMUVBNgd1bmkxRUE3B3VuaTFFQTgHdW5pMUVBOQd1bmkxRUFBB3VuaTFFQUIHdW5pMUVBQwd1bmkxRUFEB3VuaTFFQUUHdW5pMUVBRgd1bmkxRUIwB3VuaTFFQjEHdW5pMUVCMgd1bmkxRUIzB3VuaTFFQjQHdW5pMUVCNQd1bmkxRUI2B3VuaTFFQjcHdW5pMUVCOAd1bmkxRUI5B3VuaTFFQkEHdW5pMUVCQgd1bmkxRUJDB3VuaTFFQkQHdW5pMUVCRQd1bmkxRUJGB3VuaTFFQzAHdW5pMUVDMQd1bmkxRUMyB3VuaTFFQzMHdW5pMUVDNAd1bmkxRUM1B3VuaTFFQzYHdW5pMUVDNwd1bmkxRUM4B3VuaTFFQzkHdW5pMUVDQQd1bmkxRUNCB3VuaTFFQ0MHdW5pMUVDRAd1bmkxRUNFB3VuaTFFQ0YHdW5pMUVEMAd1bmkxRUQxB3VuaTFFRDIHdW5pMUVEMwd1bmkxRUQ0B3VuaTFFRDUHdW5pMUVENgd1bmkxRUQ3B3VuaTFFRDgHdW5pMUVEOQd1bmkxRURBB3VuaTFFREIHdW5pMUVEQwd1bmkxRUREB3VuaTFFREUHdW5pMUVERgd1bmkxRUUwB3VuaTFFRTEHdW5pMUVFMgd1bmkxRUUzB3VuaTFFRTQHdW5pMUVFNQd1bmkxRUU2B3VuaTFFRTcHdW5pMUVFOAd1bmkxRUU5B3VuaTFFRUEHdW5pMUVFQgd1bmkxRUVDB3VuaTFFRUQHdW5pMUVFRQd1bmkxRUVGB3VuaTFFRjAHdW5pMUVGMQZZZ3JhdmUGeWdyYXZlB3VuaTFFRjQHdW5pMUVGNQd1bmkxRUY2B3VuaTFFRjcHdW5pMUVGOAd1bmkxRUY5BGRvbmcGQWJyZXZlBmFicmV2ZQZEY3JvYXQGSXRpbGRlBml0aWxkZQZVdGlsZGUGdXRpbGRlBU9ob3JuBW9ob3JuBVVob3JuBXVob3JuDWhvb2thYm92ZWNvbWIJdGlsZGVjb21iCWFjdXRlY29tYgxkb3RiZWxvd2NvbWIJZ3JhdmVjb21iCW9uZWVpZ2h0aAx0aHJlZWVpZ2h0aHMLZml2ZWVpZ2h0aHMMc2V2ZW5laWdodGhzDHVuaTBFNEYubGlnYQx1bmkwRTI0LmxpZ2EMdW5pMEUyNi5saWdhDHVuaTBFMEUuYWx0MQhvbmV0aGlyZAl0d290aGlyZHMHdW5pMjE1NQd1bmkyMTU2B3VuaTIxNTcHdW5pMjE1OAd1bmkyMTU5B3VuaTIxNUEAAAADAAgAAgAQAAH//wADAAEAAFAAAAAA1AE/AAAAAAHFABRUSCBTYXJhYnVuUFMgICAgAAAAAAAAAABUSFNSMDAAAEAAAAAAAQAAAAoAAAAaAAIAAgFzAXQAAgHyAfMAAgAMAAQAGAAgACgAMAABAAQBcwF0AfIB8wABAAQAAQDLAAEABAABAMsAAQAEAAEBcwABAAQAAQGiAAAAAQAAAAoAHgAsAAFsYXRuAAgABAAAAAD//wABAAAAAWtlcm4ACAAAAAEAAAABAAQAAgAAAAEACAABFr4ABAAAACYAVgCcAPIBHAFyA0gEUgVYBv4HRAeKB9AIFghcCKIKSAvuDBAMMgxUDHYMmAzeDSQNag2wDfYOPA6CDsgPDg9UD5oP4BGGEywU0hZ4ABEANf/YADf/zgA4/9MAOv/YAFr/8QCf/9gAv//xAMH/8QDJ/9gByP/YAcn/8QHK/9gBy//xAcz/2AHN//EBzv/YAc//8QAVACL/2ACC/9gAg//YAIT/2ACF/9gAhv/YAIf/2ACI/84Bdv/YAXj/2AF6/9gBfP/YAX7/2AGA/9gBgv/YAYT/2AGG/9gBiP/YAYr/2AGM/9gB0v/YAAoANf+wADf/sAA4/7oAOv+6AJ//ugDJ/7oByP+6Acr/ugHM/7oBzv+6ABUAIv/OACv/xACC/84Ag//OAIT/zgCF/84Ahv/OAIf/zgF2/84BeP/OAXr/zgF8/84Bfv/OAYD/zgGC/84BhP/OAYb/zgGI/84Biv/OAYz/zgHS/84AdQAi/9gAK//YAEL/4gBE/+IARv/iAEj/3QBO/+IAT//iAFD/4gBR/+IAUv/iAFP/4gBU/+IAVv/iAFf/4gBY/+IAWf/iAFr/4gBb/+IAgv/YAIP/2ACE/9gAhf/YAIb/2ACH/9gAov/iAKP/4gCk/+IApf/iAKb/4gCn/+IAqP/iAKn/4gCq/+IAq//iAKz/4gCt/+IAsv/iALP/4gC0/+IAtf/iALb/4gC3/+IAuP/iALr/4gC7/+IAvP/iAL3/4gC+/+IAv//iAMH/4gDG/+IAyP/iAXb/2AF3/+IBeP/YAXn/4gF6/9gBe//iAXz/2AF9/+IBfv/YAX//4gGA/9gBgf/iAYL/2AGD/+IBhP/YAYX/4gGG/9gBh//iAYj/2AGJ/+IBiv/YAYv/4gGM/9gBjf/iAY//4gGR/+IBk//iAZX/4gGX/+IBmf/iAZv/4gGd/+IBo//iAaX/4gGn/+IBqf/iAav/4gGt/+IBr//iAbH/4gGz/+IBtf/iAbf/4gG5/+IBu//iAb3/4gG//+IBwf/iAcP/4gHF/+IBx//iAcn/4gHL/+IBzf/iAc//4gHS/9gB0//iAdX/4gHX/+IB2//dAeD/4gHi/+IB5P/iAeb/4gBCACL/zgAr/9gARP/iAEb/4gBI/+IAUP/iAFL/4gBU/+wAgv/OAIP/zgCE/84Ahf/OAIb/zgCH/84Aqf/iAKr/4gCr/+IArP/iAK3/4gCy/+IAtP/iALX/4gC2/+IAt//iALj/4gC6/+IAxv/iAMj/7AF2/84BeP/OAXr/zgF8/84Bfv/OAYD/zgGC/84BhP/OAYb/zgGI/84Biv/OAYz/zgGP/+IBkf/iAZP/4gGV/+IBl//iAZn/4gGb/+IBnf/iAaP/4gGl/+IBp//iAan/4gGr/+IBrf/iAa//4gGx/+IBs//iAbX/4gG3/+IBuf/iAdL/zgHV/+IB1//iAdv/4gHg/+wB5P/iAEEAIv/TAET/7ABG/+wASP/sAFD/7ABS/+wAVP/sAIL/0wCD/9MAhP/TAIX/0wCG/9MAh//TAKn/7ACq/+wAq//sAKz/7ACt/+wAsv/sALT/7AC1/+wAtv/sALf/7AC4/+wAuv/sAMb/7ADI/+wBdv/TAXj/0wF6/9MBfP/TAX7/0wGA/9MBgv/TAYT/0wGG/9MBiP/TAYr/0wGM/9MBj//sAZH/7AGT/+wBlf/sAZf/7AGZ/+wBm//sAZ3/7AGj/+wBpf/sAaf/7AGp/+wBq//sAa3/7AGv/+wBsf/sAbP/7AG1/+wBt//sAbn/7AHS/9MB1f/sAdf/7AHb/+wB4P/sAeT/7ABpACL/2ABC/+wARP/nAEb/5wBI/+cATv/sAE//7ABQ/+cAUf/sAFL/5wBT/+wAVP/nAFb/7ACC/9gAg//YAIT/2ACF/9gAhv/YAIf/2ACi/+wAo//sAKT/7ACl/+wApv/sAKf/7ACo/+wAqf/nAKr/5wCr/+cArP/nAK3/5wCy/+cAs//sALT/5wC1/+cAtv/nALf/5wC4/+cAuv/nALv/7AC8/+wAvf/sAL7/7ADG/+cAyP/nAXb/2AF3/+wBeP/YAXn/7AF6/9gBe//sAXz/2AF9/+wBfv/YAX//7AGA/9gBgf/sAYL/2AGD/+wBhP/YAYX/7AGG/9gBh//sAYj/2AGJ/+wBiv/YAYv/7AGM/9gBjf/sAY//5wGR/+cBk//nAZX/5wGX/+cBmf/nAZv/5wGd/+cBo//nAaX/5wGn/+cBqf/nAav/5wGt/+cBr//nAbH/5wGz/+cBtf/nAbf/5wG5/+cBu//sAb3/7AG//+wBwf/sAcP/7AHF/+wBx//sAdL/2AHT/+wB1f/nAdf/5wHb/+cB4P/nAeL/7AHk/+cB5v/sABEANf/YADf/zgA4/9MAOv/YAFr/8QCf/9gAv//xAMH/8QDJ/9gByP/YAcn/8QHK/9gBy//xAcz/2AHN//EBzv/YAc//8QARADX/2AA3/84AOP/TADr/2ABa//EAn//YAL//8QDB//EAyf/YAcj/2AHJ//EByv/YAcv/8QHM/9gBzf/xAc7/2AHP//EAEQA1/9gAN//OADj/0wA6/9gAWv/xAJ//2AC///EAwf/xAMn/2AHI/9gByf/xAcr/2AHL//EBzP/YAc3/8QHO/9gBz//xABEANf/YADf/zgA4/9MAOv/YAFr/8QCf/9gAv//xAMH/8QDJ/9gByP/YAcn/8QHK/9gBy//xAcz/2AHN//EBzv/YAc//8QARADX/2AA3/84AOP/TADr/2ABa//EAn//YAL//8QDB//EAyf/YAcj/2AHJ//EByv/YAcv/8QHM/9gBzf/xAc7/2AHP//EAEQA1/9gAN//OADj/0wA6/9gAWv/xAJ//2AC///EAwf/xAMn/2AHI/9gByf/xAcr/2AHL//EBzP/YAc3/8QHO/9gBz//xAGkAIv/YAEL/7ABE/+cARv/nAEj/5wBO/+wAT//sAFD/5wBR/+wAUv/nAFP/7ABU/+cAVv/sAIL/2ACD/9gAhP/YAIX/2ACG/9gAh//YAKL/7ACj/+wApP/sAKX/7ACm/+wAp//sAKj/7ACp/+cAqv/nAKv/5wCs/+cArf/nALL/5wCz/+wAtP/nALX/5wC2/+cAt//nALj/5wC6/+cAu//sALz/7AC9/+wAvv/sAMb/5wDI/+cBdv/YAXf/7AF4/9gBef/sAXr/2AF7/+wBfP/YAX3/7AF+/9gBf//sAYD/2AGB/+wBgv/YAYP/7AGE/9gBhf/sAYb/2AGH/+wBiP/YAYn/7AGK/9gBi//sAYz/2AGN/+wBj//nAZH/5wGT/+cBlf/nAZf/5wGZ/+cBm//nAZ3/5wGj/+cBpf/nAaf/5wGp/+cBq//nAa3/5wGv/+cBsf/nAbP/5wG1/+cBt//nAbn/5wG7/+wBvf/sAb//7AHB/+wBw//sAcX/7AHH/+wB0v/YAdP/7AHV/+cB1//nAdv/5wHg/+cB4v/sAeT/5wHm/+wAaQAi/9gAQv/sAET/5wBG/+cASP/nAE7/7ABP/+wAUP/nAFH/7ABS/+cAU//sAFT/5wBW/+wAgv/YAIP/2ACE/9gAhf/YAIb/2ACH/9gAov/sAKP/7ACk/+wApf/sAKb/7ACn/+wAqP/sAKn/5wCq/+cAq//nAKz/5wCt/+cAsv/nALP/7AC0/+cAtf/nALb/5wC3/+cAuP/nALr/5wC7/+wAvP/sAL3/7AC+/+wAxv/nAMj/5wF2/9gBd//sAXj/2AF5/+wBev/YAXv/7AF8/9gBff/sAX7/2AF//+wBgP/YAYH/7AGC/9gBg//sAYT/2AGF/+wBhv/YAYf/7AGI/9gBif/sAYr/2AGL/+wBjP/YAY3/7AGP/+cBkf/nAZP/5wGV/+cBl//nAZn/5wGb/+cBnf/nAaP/5wGl/+cBp//nAan/5wGr/+cBrf/nAa//5wGx/+cBs//nAbX/5wG3/+cBuf/nAbv/7AG9/+wBv//sAcH/7AHD/+wBxf/sAcf/7AHS/9gB0//sAdX/5wHX/+cB2//nAeD/5wHi/+wB5P/nAeb/7AAIANf/4gDY/+IA3f/sAN//4gDg/+IA5v/iAPj/5wD8/+wACADX/+IA2P/iAN3/7ADf/+IA4P/iAOb/7AD4/+cA/P/sAAgA1//iANj/4gDd/+wA3//iAOD/4gDm/+IA+P/nAPz/7AAIANf/4gDY/+IA3f/sAN//4gDg/+IA5v/iAPj/5wD8/+wACADX/+IA2P/iAN3/7ADf/+IA4P/iAOb/4gD4/+cA/P/sABEANf/YADf/zgA4/9MAOv/YAFr/8QCf/9gAv//xAMH/8QDJ/9gByP/YAcn/8QHK/9gBy//xAcz/2AHN//EBzv/YAc//8QARADX/2AA3/84AOP/TADr/2ABa//EAn//YAL//8QDB//EAyf/YAcj/2AHJ//EByv/YAcv/8QHM/9gBzf/xAc7/2AHP//EAEQA1/9gAN//OADj/0wA6/9gAWv/xAJ//2AC///EAwf/xAMn/2AHI/9gByf/xAcr/2AHL//EBzP/YAc3/8QHO/9gBz//xABEANf/YADf/zgA4/9MAOv/YAFr/8QCf/9gAv//xAMH/8QDJ/9gByP/YAcn/8QHK/9gBy//xAcz/2AHN//EBzv/YAc//8QARADX/2AA3/84AOP/TADr/2ABa//EAn//YAL//8QDB//EAyf/YAcj/2AHJ//EByv/YAcv/8QHM/9gBzf/xAc7/2AHP//EAEQA1/9gAN//OADj/0wA6/9gAWv/xAJ//2AC///EAwf/xAMn/2AHI/9gByf/xAcr/2AHL//EBzP/YAc3/8QHO/9gBz//xABEANf/YADf/zgA4/9MAOv/YAFr/8QCf/9gAv//xAMH/8QDJ/9gByP/YAcn/8QHK/9gBy//xAcz/2AHN//EBzv/YAc//8QARADX/2AA3/84AOP/TADr/2ABa//EAn//YAL//8QDB//EAyf/YAcj/2AHJ//EByv/YAcv/8QHM/9gBzf/xAc7/2AHP//EAEQA1/9gAN//OADj/0wA6/9gAWv/xAJ//2AC///EAwf/xAMn/2AHI/9gByf/xAcr/2AHL//EBzP/YAc3/8QHO/9gBz//xABEANf/YADf/zgA4/9MAOv/YAFr/8QCf/9gAv//xAMH/8QDJ/9gByP/YAcn/8QHK/9gBy//xAcz/2AHN//EBzv/YAc//8QARADX/2AA3/84AOP/TADr/2ABa//EAn//YAL//8QDB//EAyf/YAcj/2AHJ//EByv/YAcv/8QHM/9gBzf/xAc7/2AHP//EAEQA1/9gAN//OADj/0wA6/9gAWv/xAJ//2AC///EAwf/xAMn/2AHI/9gByf/xAcr/2AHL//EBzP/YAc3/8QHO/9gBz//xAGkAIv/YAEL/7ABE/+cARv/nAEj/5wBO/+wAT//sAFD/5wBR/+wAUv/nAFP/7ABU/+cAVv/sAIL/2ACD/9gAhP/YAIX/2ACG/9gAh//YAKL/7ACj/+wApP/sAKX/7ACm/+wAp//sAKj/7ACp/+cAqv/nAKv/5wCs/+cArf/nALL/5wCz/+wAtP/nALX/5wC2/+cAt//nALj/5wC6/+cAu//sALz/7AC9/+wAvv/sAMb/5wDI/+cBdv/YAXf/7AF4/9gBef/sAXr/2AF7/+wBfP/YAX3/7AF+/9gBf//sAYD/2AGB/+wBgv/YAYP/7AGE/9gBhf/sAYb/2AGH/+wBiP/YAYn/7AGK/9gBi//sAYz/2AGN/+wBj//nAZH/5wGT/+cBlf/nAZf/5wGZ/+cBm//nAZ3/5wGj/+cBpf/nAaf/5wGp/+cBq//nAa3/5wGv/+cBsf/nAbP/5wG1/+cBt//nAbn/5wG7/+wBvf/sAb//7AHB/+wBw//sAcX/7AHH/+wB0v/YAdP/7AHV/+cB1//nAdv/5wHg/+cB4v/sAeT/5wHm/+wAaQAi/9gAQv/sAET/5wBG/+cASP/nAE7/7ABP/+wAUP/nAFH/7ABS/+cAU//sAFT/5wBW/+wAgv/YAIP/2ACE/9gAhf/YAIb/2ACH/9gAov/sAKP/7ACk/+wApf/sAKb/7ACn/+wAqP/sAKn/5wCq/+cAq//nAKz/5wCt/+cAsv/nALP/7AC0/+cAtf/nALb/5wC3/+cAuP/nALr/5wC7/+wAvP/sAL3/7AC+/+wAxv/nAMj/5wF2/9gBd//sAXj/2AF5/+wBev/YAXv/7AF8/9gBff/sAX7/2AF//+wBgP/YAYH/7AGC/9gBg//sAYT/2AGF/+wBhv/YAYf/7AGI/9gBif/sAYr/2AGL/+wBjP/YAY3/7AGP/+cBkf/nAZP/5wGV/+cBl//nAZn/5wGb/+cBnf/nAaP/5wGl/+cBp//nAan/5wGr/+cBrf/nAa//5wGx/+cBs//nAbX/5wG3/+cBuf/nAbv/7AG9/+wBv//sAcH/7AHD/+wBxf/sAcf/7AHS/9gB0//sAdX/5wHX/+cB2//nAeD/5wHi/+wB5P/nAeb/7ABpACL/2ABC/+wARP/nAEb/5wBI/+cATv/sAE//7ABQ/+cAUf/sAFL/5wBT/+wAVP/nAFb/7ACC/9gAg//YAIT/2ACF/9gAhv/YAIf/2ACi/+wAo//sAKT/7ACl/+wApv/sAKf/7ACo/+wAqf/nAKr/5wCr/+cArP/nAK3/5wCy/+cAs//sALT/5wC1/+cAtv/nALf/5wC4/+cAuv/nALv/7AC8/+wAvf/sAL7/7ADG/+cAyP/nAXb/2AF3/+wBeP/YAXn/7AF6/9gBe//sAXz/2AF9/+wBfv/YAX//7AGA/9gBgf/sAYL/2AGD/+wBhP/YAYX/7AGG/9gBh//sAYj/2AGJ/+wBiv/YAYv/7AGM/9gBjf/sAY//5wGR/+cBk//nAZX/5wGX/+cBmf/nAZv/5wGd/+cBo//nAaX/5wGn/+cBqf/nAav/5wGt/+cBr//nAbH/5wGz/+cBtf/nAbf/5wG5/+cBu//sAb3/7AG//+wBwf/sAcP/7AHF/+wBx//sAdL/2AHT/+wB1f/nAdf/5wHb/+cB4P/nAeL/7AHk/+cB5v/sAGkAIv/YAEL/7ABE/+cARv/nAEj/5wBO/+wAT//sAFD/5wBR/+wAUv/nAFP/7ABU/+cAVv/sAIL/2ACD/9gAhP/YAIX/2ACG/9gAh//YAKL/7ACj/+wApP/sAKX/7ACm/+wAp//sAKj/7ACp/+cAqv/nAKv/5wCs/+cArf/nALL/5wCz/+wAtP/nALX/5wC2/+cAt//nALj/5wC6/+cAu//sALz/7AC9/+wAvv/sAMb/5wDI/+cBdv/YAXf/7AF4/9gBef/sAXr/2AF7/+wBfP/YAX3/7AF+/9gBf//sAYD/2AGB/+wBgv/YAYP/7AGE/9gBhf/sAYb/2AGH/+wBiP/YAYn/7AGK/9gBi//sAYz/2AGN/+wBj//nAZH/5wGT/+cBlf/nAZf/5wGZ/+cBm//nAZ3/5wGj/+cBpf/nAaf/5wGp/+cBq//nAa3/5wGv/+cBsf/nAbP/5wG1/+cBt//nAbn/5wG7/+wBvf/sAb//7AHB/+wBw//sAcX/7AHH/+wB0v/YAdP/7AHV/+cB1//nAdv/5wHg/+cB4v/sAeT/5wHm/+wAEQA1/9gAN//OADj/0wA6/9gAWv/xAJ//2AC///EAwf/xAMn/2AHI/9gByf/xAcr/2AHL//EBzP/YAc3/8QHO/9gBz//xAAEAJgAiACcALQAxADUANwA4ADoAggCDAIQAhQCGAIcAnwDJAREBEgETARQBFQF2AXgBegF8AX4BgAGCAYQBhgGIAYoBjAHIAcoBzAHOAdIAAAABAAAACgAkALwAAWxhdG4ACAAEAAAAAP//AAQAAAABAAIAAwAEY2NtcAAaZnJhYwAmbGlnYQAscmxpZwBiAAAABAAzADQANQA2AAAAAQAAAAAAGQAaABsAHAAdAB4AHwAgACEAIgAjACQAJQAmACcAKAApACoAKwAsAC0ALgAvADAAMQAyAAAAGQABAAIAAwAEAAUABgAHAAgACQAKAAsADAANAA4ADwAQABEAEgATABQAFQAWABcAGAAZADoAdgB+AIYAjgCWAJ4ApgCuALYAvgDGAM4A1gDeAOgA8gD6AQIBCgESARoBIgEqATIBOgFCAUoBUgFaAWIBagFyAXoBggGKAZIBmgGiAaoBtAG+AcYBzgHWAd4B5gHuAfYB/gIGAg4CFgIeAiYCLgI2Aj4CRgAE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DgoAAQAAADcAAwABDgYAAQ4MAAAAAQAAADcAAwAAAAENZAABDa4AAQAAADgAAQ3uAAEACAABAAQBdQANADQALAAPACUARgBUAEoASABPAAkARAAKAAENzAAGABIAPABmAJAAugDkAAUADAASABgAHgAkAXgAAgHnAIUAAgHoAIMAAgHpAXYAAgHqAIIAAgHrAAUADAASABgAHgAkAXkAAgHnAKUAAgHoAKMAAgHpAXcAAgHqAKIAAgHrAAUADAASABgAHgAkAX4AAgHnAYAAAgHoAXoAAgHpAYIAAgHqAXwAAgHrAAUADAASABgAHgAkAX8AAgHnAYEAAgHoAXsAAgHpAYMAAgHqAX0AAgHrAAUADAASABgAHgAkAYgAAgHnAYoAAgHoAYQAAgHpAYwAAgHqAYYAAgHrAAUADAASABgAHgAkAYkAAgHnAYsAAgHoAYUAAgHpAY0AAgHqAYcAAgHrAAEMzgAEAA4AOABiAIwABQAMABIAGAAeACQBkAACAecBkgACAegAiwACAekBjgACAeoAigACAesABQAMABIAGAAeACQBkQACAecBkwACAegAqwACAekBjwACAeoAqgACAesABQAMABIAGAAeACQBmAACAecBmgACAegBlAACAekBnAACAeoBlgACAesABQAMABIAGAAeACQBmQACAecBmwACAegBlQACAekBnQACAeoBlwACAesAAQwkAAIACgA0AAUADAASABgAHgAkAZ4AAgHnAdwAAgHoAI8AAgHpAaAAAgHqAI4AAgHrAAUADAASABgAHgAkAZ8AAgHnAd0AAgHoAK8AAgHpAaEAAgHqAK4AAgHrAAELzgAGABIAPABmAJAAugDkAAUADAASABgAHgAkAaQAAgHnAJcAAgHoAJUAAgHpAaIAAgHqAJQAAgHrAAUADAASABgAHgAkAaUAAgHnALcAAgHoALUAAgHpAaMAAgHqALQAAgHrAAUADAASABgAHgAkAaoAAgHnAawAAgHoAaYAAgHpAa4AAgHqAagAAgHrAAUADAASABgAHgAkAasAAgHnAa0AAgHoAacAAgHpAa8AAgHqAakAAgHrAAUADAASABgAHgAkAbQAAgHnAbYAAgHoAbAAAgHpAbgAAgHqAbIAAgHrAAUADAASABgAHgAkAbUAAgHnAbcAAgHoAbEAAgHpAbkAAgHqAbMAAgHrAAEK0AAEAA4AOABiAIwABQAMABIAGAAeACQBvAACAecB4QACAegAnAACAekBugACAeoAmwACAesABQAMABIAGAAeACQBvQACAecB4gACAegAvAACAekBuwACAeoAuwACAesABQAMABIAGAAeACQBwgACAecBxAACAegBvgACAekBxgACAeoBwAACAesABQAMABIAGAAeACQBwwACAecBxQACAegBvwACAekBxwACAeoBwQACAesAAQomAAIACgA0AAUADAASABgAHgAkAcwAAgHnAc4AAgHoAJ8AAgHpAcoAAgHqAcgAAgHrAAUADAASABgAHgAkAc0AAgHnAc8AAgHoAL8AAgHpAcsAAgHqAckAAgHrAAEJ0AAQACYAUABaAIQArgC4AOIBDAE2AWABagGUAb4ByAHyAhwABQAMABIAGAAeACQBeAACAecAhQACAegAgwACAekBdgACAeoAggACAesAAQAEAdQAAgHpAAUADAASABgAHgAkAZAAAgHnAZIAAgHoAIsAAgHpAY4AAgHqAIoAAgHrAAUADAASABgAHgAkAZ4AAgHnAdwAAgHoAI8AAgHpAaAAAgHqAI4AAgHrAAEABACTAAIB6AAFAAwAEgAYAB4AJAGkAAIB5wCXAAIB6ACVAAIB6QGiAAIB6gCUAAIB6wAFAAwAEgAYAB4AJAG8AAIB5wHhAAIB6ACcAAIB6QG6AAIB6gCbAAIB6wAFAAwAEgAYAB4AJAHMAAIB5wHOAAIB6ACfAAIB6QHKAAIB6gHIAAIB6wAFAAwAEgAYAB4AJAF5AAIB5wClAAIB6ACjAAIB6QF3AAIB6gCiAAIB6wABAAQB1QACAekABQAMABIAGAAeACQBkQACAecBkwACAegAqwACAekBjwACAeoAqgACAesABQAMABIAGAAeACQBnwACAecB3QACAegArwACAekBoQACAeoArgACAesAAQAEALMAAgHoAAUADAASABgAHgAkAaUAAgHnALcAAgHoALUAAgHpAaMAAgHqALQAAgHrAAUADAASABgAHgAkAb0AAgHnAeIAAgHoALwAAgHpAbsAAgHqALsAAgHrAAUADAASABgAHgAkAc0AAgHnAc8AAgHoAL8AAgHpAcsAAgHqAckAAgHrAAEHrgAMAB4AQABiAIQApgDIAOoBDAEuAVgBggGsAAQACgAQABYAHAF+AAIB5wGAAAIB6AF6AAIB6QF8AAIB6wAEAAoAEAAWABwBmAACAecBmgACAegBlAACAekBlgACAesABAAKABAAFgAcAaoAAgHnAawAAgHoAaYAAgHpAagAAgHrAAQACgAQABYAHAF/AAIB5wGBAAIB6AF7AAIB6QF9AAIB6wAEAAoAEAAWABwBmQACAecBmwACAegBlQACAekBlwACAesABAAKABAAFgAcAasAAgHnAa0AAgHoAacAAgHpAakAAgHrAAQACgAQABYAHAGIAAIB5wGKAAIB6AGEAAIB6QGGAAIB6wAEAAoAEAAWABwBiQACAecBiwACAegBhQACAekBhwACAesABQAMABIAGAAeACQBtAACAecBtgACAegBsAACAekBuAACAeoBsgACAesABQAMABIAGAAeACQBtQACAecBtwACAegBsQACAekBuQACAeoBswACAesABQAMABIAGAAeACQBwgACAecBxAACAegBvgACAekBxgACAeoBwAACAesABQAMABIAGAAeACQBwwACAecBxQACAegBvwACAekBxwACAeoBwQACAesAAQW0ABAAJgBQAFoAhACuALgA4gEMATYBYAFqAZQBvgHIAfICHAAFAAwAEgAYAB4AJAF4AAIB5wCFAAIB6ACDAAIB6QF2AAIB6gCCAAIB6wABAAQB1AACAekABQAMABIAGAAeACQBkAACAecBkgACAegAiwACAekBjgACAeoAigACAesABQAMABIAGAAeACQBngACAecB3AACAegAjwACAekBoAACAeoAjgACAesAAQAEAJMAAgHoAAUADAASABgAHgAkAaQAAgHnAJcAAgHoAJUAAgHpAaIAAgHqAJQAAgHrAAUADAASABgAHgAkAbwAAgHnAeEAAgHoAJwAAgHpAboAAgHqAJsAAgHrAAUADAASABgAHgAkAcwAAgHnAc4AAgHoAJ8AAgHpAcoAAgHqAcgAAgHrAAUADAASABgAHgAkAXkAAgHnAKUAAgHoAKMAAgHpAXcAAgHqAKIAAgHrAAEABAHVAAIB6QAFAAwAEgAYAB4AJAGRAAIB5wGTAAIB6ACrAAIB6QGPAAIB6gCqAAIB6wAFAAwAEgAYAB4AJAGfAAIB5wHdAAIB6ACvAAIB6QGhAAIB6gCuAAIB6wABAAQAswACAegABQAMABIAGAAeACQBpQACAecAtwACAegAtQACAekBowACAeoAtAACAesABQAMABIAGAAeACQBvQACAecB4gACAegAvAACAekBuwACAeoAuwACAesABQAMABIAGAAeACQBzQACAecBzwACAegAvwACAekBywACAeoByQACAesAAQOSAAwAHgBAAGIAhACmAMgA6gEMAS4BWAGCAawABAAKABAAFgAcAX4AAgHnAYAAAgHoAXoAAgHpAXwAAgHrAAQACgAQABYAHAGYAAIB5wGaAAIB6AGUAAIB6QGWAAIB6wAEAAoAEAAWABwBqgACAecBrAACAegBpgACAekBqAACAesABAAKABAAFgAcAX8AAgHnAYEAAgHoAXsAAgHpAX0AAgHrAAQACgAQABYAHAGZAAIB5wGbAAIB6AGVAAIB6QGXAAIB6wAEAAoAEAAWABwBqwACAecBrQACAegBpwACAekBqQACAesABAAKABAAFgAcAYgAAgHnAYoAAgHoAYQAAgHpAYYAAgHrAAQACgAQABYAHAGJAAIB5wGLAAIB6AGFAAIB6QGHAAIB6wAFAAwAEgAYAB4AJAG0AAIB5wG2AAIB6AGwAAIB6QG4AAIB6gGyAAIB6wAFAAwAEgAYAB4AJAG1AAIB5wG3AAIB6AGxAAIB6QG5AAIB6gGzAAIB6wAFAAwAEgAYAB4AJAHCAAIB5wHEAAIB6AG+AAIB6QHGAAIB6gHAAAIB6wAFAAwAEgAYAB4AJAHDAAIB5wHFAAIB6AG/AAIB6QHHAAIB6gHBAAIB6wACAdgAIwENAQ4BDwFlAfQBcQFWAXIBZgBgAVcBWAFZAVoBbgFvAXABaAFgAWEBYgFjAWQBZwBjAWkBagFrAWwBbQFbAVwBXQFeAV8AAgG6AAgAQgBDAEQBGQEaARsBHAEdAAEATAAJAAIAAgASABYAAAAYABgABQABAAEARwABAAMA+QD7ASAAAQACAOIA5QACAAEBDQEPAAAAAgABARkBHQAAAAEAAwDwAPIA9AACAAEBYAFkAAAAAQAIAQYBCQEKAQsBDAEYAR4BHwABAAYBBgEJAQoBCwEMAR4AAgACAVcBWgAAAWYBZwAEAAEABADjAOQA+QD7AAEAAQEIAAIAAQFbAV8AAAABAAEAYAACAAEAQgBEAAAAAQACAOMA5AACAAEBbgFwAAAAAQABAQEAAQAFAQkBCgELAQwBGAABAAEBcgABAAEBGAABAAEAMQABAAYAIgBCAIQApAHSAdMAAQAEACYARgCMAKwAAQACACoASgABAAYAMABQAJYAtgHjAeQAAQAEADYAVgHlAeYAAQACADoAWgABABAAIgAkACYAKgAvADAANgA6AEIARABGAEoATwBQAFYAWgABAAwAhACMAJYApACsALYB0gHTAeMB5AHlAeYAAgAHAEIARAAAAOIA5QADAQEBAQAHAQYBBgAIAQgBDwAJARgBHwARAVsBZAAZAAIAAgENAQ8AAAFgAWQAAwAAAAEAAAACAAAAAAAAAAAAAQAAACQAAAEAAAEAAQAAACgAAAEEAAABAQACAQQAAgAAAAAAAQAAAA8AACYQAAAACQAAAAgAGwAAAAAAAf////8AGwABAAAAAP////4AAQACAAAAAv////8AAQADAAAAAP////0AGwACAAAABP////8AGwADAAAAAP////sAFwAAAAAAAP////cAFz6AAAAACP////8AAAABAAAAAAAAAAAAAAs0IAAAAgAAAAEAAAAZAAAAHAAAA7YAAAc6AAAJiAAACggAAAqoAAgAIgHKAAQAAQAKAAEACwABAAEAAQAMAAEAAQABAAEADQAOAAEAAQABAAEAAQAPAAEAAQABABAAAQABAAEAAQABAAEAAQARAAEAEgABABMAAQABAAEAFAABAAEAAQABABUAFgABAAEAAQABAAEAFwABAAEAAQAYAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAUABgAHAAgACQAAAAAAAAAAAAIAAAAAAAAAAAAAAAMABAAFAAYABwAIAAkACgALAAwADQAOAA8AEAARAAAAAAAAAAAAAgAAAAAAAAAAAAAAAwAEAAUABgAHAAgACQAKAAsADAANAA4ADwAQABEAAQABABIAAQABABMAFAAVABYAFwABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAGAABAAEAAQABABkAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAaAAEAAQAbABwAHQAeAB8AAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABACAAAQABACEAIgAjACQAJQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAJgABAAEAAQAnAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAoAAEAAQApACoAKwAsAC0AAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAC4AAQABAC8AMAAxADIAMwABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEANAABAAEANQA2ADcAOAA5AAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQA6AAEAAQA7ADwAPQA+AD8AAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAEAAAQABAAEAAQBBAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAQgABAAEAQwBEAEUARgBHAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQBIAAEAAQBJAEoASwBMAE0AAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAE4AAQABAAEATwABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAUAABAAEAUQBSAFMAVABVAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQBWAAEAAQBXAFgAWQBaAFsAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAFwAAQABAF0AXgBfAGAAYQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAAAAAAAAAAQAAAAAACgAAAAAADgAAAAAAEgAAAAAAFgAAAAAAGgAAAAAAHgAAAAAAIgAAAAAAJgAAAAAAKgAAAAAALgAAAAAAMgAAAAAANgAAAAAAOgAAAAAAPgAAAAAAQgAAAAAARgAAAAAACAAAAAAAAoAAAAAAAoAAAAAAAoAAAAAAAoAAAAAAAoAAAAAADAAAAAAAAoAAAAgAEAAAAAAAAoAAABAAAoAAABAAAoAAABAAAoAAABAAAoAAABAAFAAAAAAAAoAAABgAAoAAABgAAoAAABgAAoAAABgAAoAAABgAGAAAAAAAAoAAACAAHAAAAAAAAoAAACgAAoAAACgAAoAAACgAAoAAACgAAoAAACgAIAAAAAAAAoAAADAAAoAAADAAAoAAADAAAoAAADAAAoAAADAAJAAAAAAAAoAAADgAAoAAADgAAoAAADgAAoAAADgAAoAAADgAKAAAAAAAAoAAAEAAAoAAAEAAAoAAAEAAAoAAAEAAAoAAAEAALAAAAAAAAoAAAEgAMAAAAAAAAoAAAFAAAoAAAFAAAoAAAFAAAoAAAFAAAoAAAFAANAAAAAAAAoAAAFgAAoAAAFgAAoAAAFgAAoAAAFgAAoAAAFgAOAAAAAAAAoAAAGAAPAAAAAAAAoAAAGgAAoAAAGgAAoAAAGgAAoAAAGgAAoAAAGgAQAAAAAAAAoAAAHAAAoAAAHAAAoAAAHAACoAAAHAAAoAAAHAARAAAAAAAAoAAAHgAAoAAAHgAAoAAAHgAAoAAAHgACoAAAHgAAP//+Gb///+M///4dv///4z///iG////nP//+J7///+k///4sv///5j///i+////rP//+Nb///+s///47v///7T///kG////rP//+Rb///+s///5Jv///7z///k+////xP//+VL///+4///5Xv///8z///l2////zP//+Y7////UAAAABAAIAAwAEAAAAAAAFAAAAAQACAAMABAAGAAAAAQACAAMABAALAAAAEAAAAAEAAgADAAQAEQAAAAEAAgADAAQAFgAAAAEAAgADAAQAGwAAAAEAAgADAAQAIAAAACUAAAABAAIAAwAEACYAAAABAAIAAwAEACsAAAAwAAAAAQACAAMABAAxAAAAAQACAAMABAA2AAAAAQACAAMABAA7AXgAhQCDAXYAggHUAZABkgCLAY4AigGeAdwAjwGgAI4AkwGkAJcAlQGiAJQBvAHhAJwBugCbAcwBzgCfAcoByAF5AKUAowF3AKIB1QGRAZMAqwGPAKoBnwHdAK8BoQCuALMBpQC3ALUBowC0Ab0B4gC8AbsAuwHNAc8AvwHLAckAAAh4IAAAAgAAAAEAAAAVAAAAHAAAAvIAAAU+AAAHFAAAB3QAAAgEAAgAhAFoAAQAAQABAAEAAQABAAEAAQAJAAEAAQABAAEAAQABAAEAAQABAAoAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQALAAEAAQABAAEAAQABAAEADAABAAEAAQABAAEAAQABAAEAAQANAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEADgAPAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABAAEgATABQABQAGAAcAEQAIAAAAAAAAAAAAAgAAAAAAAAAAAAMABAAFAAYABwAIAAkACgAAAAsADAANAAAAAAAAAAAAAgAAAAAAAAAAAAMABAAFAAYABwAIAAkACgAAAAsADAANAAEAAQAOAAEAAQAPABAAEQASAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQATAAEAAQAUABUAFgAXAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAYAAEAAQAZABoAGwAcAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAdAAEAAQAeAB8AIAAhAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAiAAEAAQAjACQAJQAmAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAnAAEAAQAoACkAKgArAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAsAAEAAQAtAC4ALwAwAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAxAAEAAQAyADMANAA1AAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQA2AAEAAQA3ADgAOQA7AAEAAQABAAEAAQABAAEAAQA6AAEAAQABAAEAAQA8AAEAAQA9AD4APwBBAAEAAQABAAEAAQABAAEAAQBAAAEAAQABAAEAAQBCAAEAAQBDAEQARQBHAAEAAQABAAEAAQABAAEAAQBGAAEAAQABAAEAAQBIAAEAAQBJAEoASwBNAAEAAQABAAEAAQABAAEAAQBMAAEAAQABAAAAAAAAAABAAAAAAAKAAAAAAAOAAAAAAASAAAAAAAWAAAAAAAaAAAAAAAeAAAAAAAiAAAAAAAmAAAAAAAqAAAAAAAuAAAAAAAyAAAAAAA2AAAAAAAIAAAAAAACgAAAAAACgAAAAAACgAAAAAACgAAAAAAMAAAAAAACgAAACAACgAAACAACgAAACAACgAAACAAQAAAAAAACgAAAEAACgAAAEAACgAAAEAACgAAAEAAUAAAAAAACgAAAGAACgAAAGAACgAAAGAACgAAAGAAYAAAAAAACgAAAIAACgAAAIAACgAAAIAACgAAAIAAcAAAAAAACgAAAKAACgAAAKAACgAAAKAACgAAAKAAgAAAAAAACgAAAMAACgAAAMAACgAAAMAACgAAAMAAkAAAAAAACgAAAOAACgAAAOAACgAAAOAACgAAAOAAoAAAAAAACgAAAQAACgAAAQAACgAAAQAACgAAAQAACgAAAQAAsAAAAAAACgAAASAACgAAASAACgAAASAACgAAASAACgAAASAAwAAAAAAACgAAAUAACgAAAUAACgAAAUAACgAAAUAACgAAAUAA0AAAAAAACgAAAWAACgAAAWAACgAAAWAACgAAAWAACgAAAWAAA///4Zv///gT///h+///9/P//+Jb///3s///4rv///cz///jG///9xP//+N7///20///49v//+Vz///kO///5cP//+Sb///lI///5Pv//+Vz///lW///5cP//+W7///mEAAAABAAIAAAADAAAAAAABAAIAAAADAAQAAAABAAIAAAADAAgAAAABAAIAAAADAAwAAAABAAIAAAADABAAAAABAAIAAAADABQAAAABAAIAAAADABgAAAABAAIAAAADABwAAAABAAIAAwAEACAAAAABAAIAAwAEACUAAAABAAIAAwAEACoAAAABAAIAAwAEAC8BfgGAAXoBfAGYAZoBlAGWAaoBrAGmAagBfwGBAXsBfQGZAZsBlQGXAasBrQGnAakBiAGKAYQBhgGJAYsBhQGHAbQBtgGwAbgBsgG1AbcBsQG5AbMBwgHEAb4BxgHAAcMBxQG/AccBwQAAA+wAAAACAAAAAgAAAA0AAAAcAAACXgAAAvoAAANgAAADgAAAA9IACAADAR4ADAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAQAAQABAAUAAQABAAYAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEABwABAAoAAQABAAEAAQABAAEAAQABAAEAAQABAAgAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAkAAQABAAEAAQABAAEAAQABAAEACwAAAAAAAAAAAAIAAAAAAAMAAAAAAAQABQAAAAAAAAAAAAAAAgAAAAAAAwAAAAAABAAFAAAAAQABAAYAAQABAAcACAABAAEAAQABAAEAAQABAAEACQABAAEAAQABAAEACgALAAEAAQABAAEAAQAMAAEAAQABAAEAAQANAA4AAQABAAEAAQABAA8AAQABAAEAAQABAAEAAQABAAEAEAAAAAAAAAAAQAAAAAACgAAAAAADgAAAAAAEgAAAAAAFgAAAAAACAAAAAAAAoAAAAAAAoAAAAAADAAAAAAAAoAAAAgAAoAAAAgAEAAAAAAAAoAAABAAAoAAABAAFAAAAAAAAoAAABj///7a///+9P//+/r///xw///8Pv///KwAAACS///8IAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAEAAAABgFzAXQB8gHyAfMB8wHxAAAEzAAAAAIAAAAEAAAADgAAABwAAAJ6AAADkgAABCgAAARYAAAEsgAIAAMBLAANAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEABAABAAEABgABAAEABwABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAIAAEACwABAAEAAQABAAEAAQABAAEAAQABAAEACQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEACgABAAEAAQABAAEAAQABAAEAAQAMAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEABQAAAAAAAAAAAAIAAAAAAAAAAwAAAAAABAAFAAAAAAAAAAAAAAACAAAAAAAAAAMAAAAAAAQABQAAAAEAAQAGAAEAAQABAAcACAABAAEAAQABAAEAAQABAAEACQABAAEACgABAAEAAQABAAEAAQABAAEAAQABAAsAAQABAAEAAQABAAEADAANAAEAAQABAAEAAQAOAAEAAQAPAAEAAQABAAEAAQABAAEAAQABAAEAEAABAAEAAQABAAEAAQARABIAAQABAAEAAQABABMAAQABABQAAQABAAEAAQABAAEAAQABAAEAAQAVAAEAAQABAAEAAQABAAEAAQABAAEAFgABAAEAFwABAAEAGAABAAEAAQABAAEAAQABAAEAAAAAAAAAAEAAAAAAA4AAAAAABYAAAAAAB4AAAAAACYAAAAAAAgAAAAAAAKAAAAAAAKAAAAAAAwAAAAAAAoAAAAAABAAAAAAAAKAAAAMAAKAAAAMABQAAAAAABIAAAAAABgAAAAAAAKAAAAYAAKAAAAYABwAAAAAABoAAAAAACAAAAAAAAKAAAAkACQAAAAAACIAAAAA///+2P//+1r///74///7/P//+6L///x4///8RP//++r///y4AAAAnP//+/b///wwAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAQAAAAAAAYBcwF0AfIB8gHzAfMB8QAAAIQgAAAAAAAACAAAAAYAAAAQAAAAQgAAAGYACAEIABYABAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAUABQAFAAUABQAAAAAAAAAAAAEAAAAAAAAAAAAAAAEAAAAAAAAAAgAAAAEAAwAAAAAAAoAAAAIAAAAAIAMAAAAABIwgAAABAAAACAAAAA4AAAAUAAAAlgAAAo4AAAOwAAgA4gA+AAsABQAFAAwAAQABAAEAAQABAAEAAQABAAEAAQAEAAEABAABAAQAAQABAAEAAQANAAEADQABAAEAAQABAAEABAABAAEAAQABAAYACAAJAAYABgAGAAYABwAHAAcAAQABAAEAAQABAAEAAQABAAYACgAKAAoACgAKAAYABgAAAAEAAAAAAAYADgAAAAAAAQALAAAAFQAVABsAAAABAAAAAAAGAA4AAAAAAAEACwAAABUAFQAbAAAAAQAAAAAABgAOAAIAAQABAAIAAwAVABUAGwAAAAEAAAAAAAYADgACAAIAAQACAAIAFQAVABsAAAABAAAAAAAGAA4ABAAFAAEABAADABUAFQAbAAAAAQAAAAAABgAOAAcABgABAAcACQAVABUAGwAAAAEAAAAAAAYADgAHAAgAAQAHAAwAFQAVABsAAAABAAAAAAAGAA4ACgANAAEACgAJABUAFQAbAAAAAQAAAAAABgAOABAADwAjABAAEgAVABUAGwAAAAEAAAAAAAYADgAQABEAIwAQABAAFQAVABsAAAABAAAAAAAGAA4AFAATACMAFAASABUAFQAbAAAAAQAAAAAABgAOABYAFwABABYAAwAVABUAGwAAAAEAAAAAAAYADgAWABoAAQAWABYAFQAVABsAAAABAAAAAAAGAA4AGQAYAAEAGQADABUAFQAbAAAAAQAAAAAABgAOABkAGQABABkAGQAVABUAGwAAAAEAAAAAAAYADgAeABwAHQAeACEAFQAVABsAAAABAAAAAAAGAA4AHgAfAB0AHgAeABUAFQAbAAAAAQAAAAAABgAOACAAIgAdACAAIQAVABUAGwAAAAD/////AAIAAP////8AAwAA/////wAEgAD//wAAAAMAAAAB//8ABAAA/////wAFAAD/////AAYAAP//AAIABgAA/////wAHgAD//wADAAYAAAAEAAIAAgAA/////wAGAAD//wAFAAcAAP////8ACAAA/////wAIAAD//wAGAAkAAP////8ACQAA//8ABgAKgAD//wAAAAoAAP//AAYACQAAAAH//wALgAD/////AAwAAP////8ADQAAAAf//wANAAD/////AA4AAP////8ADgAAAAf//wAPAAD/////AA8AAP//AAYAAgAA//8ACAAQAAD/////ABAAAP//AAYAEAAAAAH//wARgAD//wAAABEAAP//AAYAAgAA/////wAAAAAAJAAAADQAAAB0AAAARAAAAFQAAABkAAAArgAAAMIAAAC6AAgBGQAFAWABYQFiAWMBZAAIAWAABQEZARoBGwEcAR0ACAEZAAUBWwFcAV0BXgFfAAgBWwAFAWkBagFrAWwBbQAIARkABQFpAWoBawFsAW0ACAEGABoBZgAAAGABVwFYAVkBWgAAAAAAAAAAAAAAAAAAAAAAAAAAAAABaAFpAWoBawFsAW0BZwBjAAgBDQADAW4BbwFwAAgBBwABARYACADiAAQBZQAAAAABVgAAAZggAAABAAAACAAAAAYAAAAUAAABNgAAAVoAAAF8AAgA4wCOAAQABAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEABQAFAAUAAAAAAAAAAAABAAAAAAAAAAAAAAABAAAAAAAAAAIAAAABAAMAAAAA/////wACgAD/////AAIAAP////8AAAAAAAD//wAAAAAABAAIAOMAAgH0AXEAAAAAAoggAAABAAAACAAAAAYAAAAUAAACLAAAAlAAAAJwAAgAYAEJAAUAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAEAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEABQAFAAUABQABAAEAAQABAAEAAQABAAEAAQABAAEABQAFAAUAAAAAAAAAAAABAAAAAAAAAAAAAAABAAAAAAAAAAIAAAABAAMAAAAA/////wACgAD/////AAIAAP////8AAAAAAAD//wAAAAQACAEBAAEBcg==';
export const SARABUN_WOFF2_BASE64 = TH_SARABUN_IT9_TTF_BASE64;

export function generatePetitionHtml(
  p: PublicPetition,
  savedSigners?: SignerSettings,
  opts: { toolbar?: boolean; autoPrint?: boolean } = {}
): string {
  const signers = normalizeSigners(savedSigners);
  const form = getPetitionForm(p, signers);
  const formType = resolveFormType(p);
  const dParts = toThaiDateParts(form.filedDate);
  const doneDateParts = form.operation?.doneDate
    ? toThaiDateParts(form.operation.doneDate)
    : p.resolvedDate
    ? toThaiDateParts(p.resolvedDate)
    : dParts;

  const addr = resolvePetitionAddress(p, form);
  const citizenName = addr.citizenName;
  const houseNo = addr.houseNo ? toThaiDigits(addr.houseNo) : '';
  const soi = addr.soi ? toThaiDigits(addr.soi) : '';
  const road = addr.road ? toThaiDigits(addr.road) : '';
  const moo = addr.moo ? toThaiDigits(addr.moo) : '';
  const subdistrict = addr.subdistrict ? toThaiDigits(addr.subdistrict) : '';
  const district = addr.district ? toThaiDigits(addr.district) : '';
  const province = addr.province ? toThaiDigits(addr.province) : '';
  const phone = addr.phone ? toThaiDigits(addr.phone) : '';

  const srvHouseNo = addr.srvHouseNo ? toThaiDigits(addr.srvHouseNo) : '';
  const srvSoi = addr.srvSoi ? toThaiDigits(addr.srvSoi) : '';
  const srvRoad = addr.srvRoad ? toThaiDigits(addr.srvRoad) : '';
  const srvMoo = addr.srvMoo ? toThaiDigits(addr.srvMoo) : '';
  const srvSubdistrict = addr.srvSubdistrict ? toThaiDigits(addr.srvSubdistrict) : '';
  const srvDistrict = addr.srvDistrict ? toThaiDigits(addr.srvDistrict) : '';
  const srvProvince = addr.srvProvince ? toThaiDigits(addr.srvProvince) : '';
  const srvPhone = addr.srvPhone ? toThaiDigits(addr.srvPhone) : '';

  const zone = form.sewageZone || (form as any).zone || 'in_district';
  const stage = normalizeStage(p.status);
  const isApproved = form.mayorDecision
    ? form.mayorDecision === 'approve'
    : stage === 'assigned' || stage === 'resolved';
  const isRejected = form.mayorDecision
    ? form.mayorDecision === 'reject'
    : stage === 'rejected';
  const isDone = form.operation?.done ?? (stage === 'resolved');

  const rawDriver = sanitizePersonText(form.assignedDriver || p.assignedOfficer || signers.driverName || 'นายชนะ สุขด้วง');
  const driverName = rawDriver.replace(/\s*\([^)]*\)\s*/g, ' ').trim() || 'นายชนะ สุขด้วง';

  const feeAmount = form.feeAmount ?? getSewageFee(zone, signers);
  const receiptBook = (form.receipt?.bookNo || (form as any).receiptBook)
    ? toThaiDigits(form.receipt?.bookNo || (form as any).receiptBook)
    : '';
  const receiptNumber = (form.receipt?.receiptNo || (form as any).receiptNumber)
    ? toThaiDigits(form.receipt?.receiptNo || (form as any).receiptNumber)
    : '';
  const intakeOfficer = sanitizePersonText(form.officerNote?.officerName || (form as any).intakeOfficer || '');
  const collectorOfficer = sanitizePersonText(form.receipt?.collectorName || intakeOfficer);
  const opOfficer = sanitizePersonText(form.operation?.operatorName || p.assignedOfficer || intakeOfficer).replace(/\s*\([^)]*\)\s*/g, ' ').trim();

  // Matches the exact rectangle checkbox shape in original Word templates (width ~10.5pt, height ~12pt)
  const chk = (on: boolean) =>
    `<span class="chk-box">${on ? '&#10003;' : ''}</span>`;

  let bodyContent = '';

  if (formType === 'sewage') {
    bodyContent = `
      <!-- P1: Title (18pt regular underlined) -->
      <div class="doc-title">คำร้องขอรับบริการกำจัดสิ่งปฏิกูล</div>

      <!-- P2 & P3: เขียนที่ & วันที่ (Right-aligned 15pt) -->
      <div class="p-line" style="text-align:right;">
        <span>เขียนที่ </span><span style="border-bottom:1px dotted #000;padding-right:6px;">สำนักงานเทศบาลตำบลบางเป้า</span>
      </div>
      <div class="p-line" style="display:flex;justify-content:flex-end;align-items:baseline;">
        <span>วันที่</span>
        <span class="fill-dots" style="width:17mm;">${dParts.day ? toThaiDigits(dParts.day) : ''}</span>
        <span>เดือน</span>
        <span class="fill-dots" style="width:28mm;">${esc(dParts.month || '')}</span>
        <span>พ.ศ.</span>
        <span class="fill-dots" style="width:14mm;">${dParts.year ? toThaiDigits(dParts.year) : ''}</span>
      </div>

      <!-- P4: เรียน -->
      <div class="p-line">เรียน&nbsp;&nbsp;&nbsp;&nbsp;นายกเทศมนตรีตำบลบางเป้า</div>

      <!-- P5-P7: Applicant Address Block -->
      <div class="p-row">
        <span style="padding-left:12.5mm;">ข้าพเจ้า (นาย/นาง/นางสาว)</span>
        <span class="fill-dots" style="flex:1;">${esc(citizenName)}</span>
        <span>อยู่บ้านเลขที่</span>
        <span class="fill-dots" style="width:25mm;">${esc(houseNo)}</span>
      </div>
      <div class="p-row">
        <span>ตรอก/ซอย</span>
        <span class="fill-dots" style="width:35mm;">${esc(soi)}</span>
        <span>ถนน</span>
        <span class="fill-dots" style="flex:1;">${esc(road)}</span>
        <span>หมู่ที่</span>
        <span class="fill-dots" style="width:24mm;">${esc(moo)}</span>
        <span>ตำบล/แขวง</span>
        <span class="fill-dots" style="width:33mm;">${esc(subdistrict)}</span>
      </div>
      <div class="p-row">
        <span>อำเภอ/เขต</span>
        <span class="fill-dots" style="width:46mm;">${esc(district)}</span>
        <span>จังหวัด</span>
        <span class="fill-dots" style="width:45mm;">${esc(province)}</span>
        <span>โทรศัพท์</span>
        <span class="fill-dots" style="flex:1;">${esc(phone)}</span>
      </div>

      <!-- P8-P10: Service Location Block -->
      <div class="p-row">
        <span style="padding-left:12.5mm;">มีความประสงค์จะขอรับบริการกำจัดสิ่งปฏิกูล จากสำนักงานเทศบาลตำบลบางเป้า ณ บ้านเลขที่</span>
        <span class="fill-dots" style="flex:1;">${esc(srvHouseNo)}</span>
      </div>
      <div class="p-row">
        <span>ตรอก/ซอย</span>
        <span class="fill-dots" style="width:35mm;">${esc(srvSoi)}</span>
        <span>ถนน</span>
        <span class="fill-dots" style="flex:1;">${esc(srvRoad)}</span>
        <span>หมู่ที่</span>
        <span class="fill-dots" style="width:24mm;">${esc(srvMoo)}</span>
        <span>ตำบล/แขวง</span>
        <span class="fill-dots" style="width:33mm;">${esc(srvSubdistrict)}</span>
      </div>
      <div class="p-row">
        <span>อำเภอ/เขต</span>
        <span class="fill-dots" style="width:46mm;">${esc(srvDistrict)}</span>
        <span>จังหวัด</span>
        <span class="fill-dots" style="width:45mm;">${esc(srvProvince)}</span>
        <span>โทรศัพท์</span>
        <span class="fill-dots" style="flex:1;">${esc(srvPhone)}</span>
      </div>

      <!-- P11-P18: Fee Agreement & Checkboxes -->
      <div class="p-line">โดยข้าพเจ้า ยินยอมชำระค่าธรรมเนียมในการบริการกำจัดสิ่งปฏิกูล ตามข้อบัญญัติของเทศบาลตำบลบางเป้าดังนี้</div>
      <div class="p-line" style="padding-left:12.5mm;">ในเขตเทศบาลตำบลบางเป้า</div>
      <div class="p-line" style="padding-left:14mm;display:flex;align-items:center;">
        ${chk(zone === 'in_district')}
        <span>เหมาจ่าย ครั้งละ ๒๕๐ บาท /บ่อ</span>
      </div>
      <div class="p-line" style="padding-left:12.5mm;">นอกเขตเทศบาลตำบลบางเป้า</div>
      <div class="p-line" style="padding-left:14mm;display:flex;align-items:center;">
        <span style="display:inline-flex;align-items:center;width:67mm;">
          ${chk(zone === 'out_10')}
          <span>ไม่เกิน ๑๐ กิโลเมตร</span>
        </span>
        <span>ครั้งละ &nbsp;&nbsp;&nbsp;๗๐๐ บาท / ๑ บ่อ</span>
      </div>
      <div class="p-line" style="padding-left:14mm;display:flex;align-items:center;">
        <span style="display:inline-flex;align-items:center;width:67mm;">
          ${chk(zone === 'out_20')}
          <span>เกิน ๑๐ กิโลเมตร แต่ไม่เกิน ๒๐ กิโลเมตร</span>
        </span>
        <span>ครั้งละ ๑,๐๐๐ บาท / ๑ บ่อ</span>
      </div>
      <div class="p-line" style="padding-left:14mm;display:flex;align-items:center;">
        <span style="display:inline-flex;align-items:center;width:67mm;">
          ${chk(zone === 'out_30')}
          <span>เกิน ๒๐ กิโลเมตร แต่ไม่เกิน ๓๐ กิโลเมตร</span>
        </span>
        <span>ครั้งละ ๑,๓๐๐ บาท / ๑ บ่อ</span>
      </div>
      <div class="p-line" style="padding-left:12.5mm;">พร้อมคำขอนี้ ข้าพเจ้าได้แนบบัตรประจำตัวประชาชน มาเพื่อเป็นหลักฐาน จำนวน ๑ ฉบับ</div>

      <!-- P19: Blank space before signatures -->
      <div style="height:14px;"></div>

      <!-- P20-P23: Signers Row 1 -->
      <div style="display:flex;align-items:flex-start;">
        <div style="width:45%;">
          <div class="p-line" style="padding-left:14mm;">..........................................</div>
          <div class="p-line" style="padding-left:11mm;">(${esc(signers.directorName)})</div>
          <div class="p-line" style="padding-left:3mm;">${esc(signers.directorPos)}</div>
        </div>
        <div style="width:55%;">
          <div class="p-row" style="padding-left:2mm;">
            <span>ลงชื่อ</span>
            <span class="fill-dots" style="flex:1;">&nbsp;</span>
            <span>ผู้ขอรับบริการ</span>
          </div>
          <div class="p-row" style="padding-left:8mm;padding-right:10mm;">
            <span>(</span>
            <span class="fill-dots" style="flex:1;">${esc(citizenName)}</span>
            <span>)</span>
          </div>
          <div class="p-line" style="padding-left:4mm;">ความคิดเห็นนายกเทศมนตรีตำบลบางเป้า/ผู้แทน</div>
          <div class="p-line" style="padding-left:6mm;display:flex;align-items:center;">
            ${chk(isApproved)}
            <span style="margin-right:14px;">อนุมัติ</span>
            ${chk(isRejected)}
            <span>ไม่อนุมัติ &nbsp;เพราะ</span>
            <span class="fill-dots" style="flex:1;margin-left:2px;">${isRejected && form.mayorNote ? esc(form.mayorNote) : ''}</span>
          </div>
        </div>
      </div>

      <!-- P24-P25: Blank space for signatures -->
      <div style="height:24px;"></div>

      <!-- P26-P29: Signers Row 2 -->
      <div style="display:flex;align-items:flex-start;">
        <div style="width:45%;">
          <div class="p-line" style="padding-left:14mm;">..............................................</div>
          <div class="p-line" style="padding-left:17mm;">(${esc(signers.clerkName)})</div>
          <div class="p-line" style="padding-left:24mm;">${esc(signers.clerkPos)}</div>
        </div>
        <div style="width:55%;">
          <div class="p-row" style="padding-left:0mm;">
            <span>ลงชื่อ</span>
            <span class="fill-dots" style="flex:1;">&nbsp;</span>
            <span>นายก ทต.บางเป้า/ผู้แทน</span>
          </div>
          <div class="p-line" style="padding-left:14mm;">(${esc(signers.actingMayorName || signers.mayorName)})</div>
          <div class="p-line" style="padding-left:4mm;">${esc(signers.actingMayorPosition || 'รองนายกเทศมนตรี ปฏิบัติราชการแทน')}</div>
          <div class="p-line" style="padding-left:10mm;">${esc(signers.actingMayorFor || 'นายกเทศมนตรีตำบลบางเป้า')}</div>
        </div>
      </div>

      <!-- P30-P33: ผลการปฏิบัติงาน (Flush Left as in original .docx!) -->
      <div class="p-line">ผลการปฏิบัติงาน</div>
      <div class="p-line" style="display:flex;align-items:center;">
        ${chk(isDone)}
        <span>ดำเนินการแล้ว เมื่อวันที่</span>
        <span class="fill-dots" style="width:18mm;">${isDone && doneDateParts.day ? toThaiDigits(doneDateParts.day) : ''}</span>
        <span>เดือน</span>
        <span class="fill-dots" style="width:34mm;">${isDone ? esc(doneDateParts.month || '') : ''}</span>
        <span>พ.ศ.</span>
        <span class="fill-dots" style="width:20mm;">${isDone && doneDateParts.year ? toThaiDigits(doneDateParts.year) : ''}</span>
      </div>
      <div class="p-row" style="width:92mm;">
        <span>ลงชื่อ</span>
        <span class="fill-dots" style="flex:1;">&nbsp;</span>
        <span>พนักงานขับรถดูดสิ่งปฏิกูล</span>
      </div>
      <div class="p-line" style="padding-left:12.5mm;margin-bottom:4px;">(${esc(driverName)})</div>

      <!-- P34-P43: Bottom 2-Box Table -->
      <table class="bottom-tbl">
        <tr>
          <td style="width:47.5%;">
            <div class="p-line">บันทึกเจ้าหน้าที่ผู้รับคำขอ</div>
            <div class="p-line" style="padding-left:3mm;">ได้รับคำร้องขอรับบริการกำจัดสิ่งปฏิกูล แล้ว</div>
            <div class="p-row">
              <span>เมื่อวันที่</span>
              <span class="fill-dots" style="width:12mm;">${dParts.day ? toThaiDigits(dParts.day) : ''}</span>
              <span>เดือน</span>
              <span class="fill-dots" style="flex:1;">${esc(dParts.month || '')}</span>
              <span>พ.ศ.</span>
              <span class="fill-dots" style="width:16mm;">${dParts.year ? toThaiDigits(dParts.year) : ''}</span>
            </div>
            <div class="p-row" style="padding-left:9mm;">
              <span>ลงชื่อ</span>
              <span class="fill-dots" style="flex:1;">&nbsp;</span>
              <span>เจ้าหน้าที่</span>
            </div>
            <div class="p-row" style="padding-left:15mm;padding-right:4mm;">
              <span>(</span>
              <span class="fill-dots" style="flex:1;">${esc(intakeOfficer)}</span>
              <span>)</span>
            </div>
          </td>
          <td style="width:52.5%;">
            <div class="p-line">บันทึกเจ้าหน้าที่เก็บค่าธรรมเนียม</div>
            <div class="p-row" style="padding-left:5mm;">
              <span>ได้รับค่าธรรมเนียม จำนวน</span>
              <span class="fill-dots" style="flex:1;">${feeAmount ? toThaiDigits(feeAmount) : ''}</span>
              <span>บาท และออก</span>
            </div>
            <div class="p-row">
              <span>ใบเสร็จรับเงินแล้วเล่มที่</span>
              <span class="fill-dots" style="flex:1;">${esc(receiptBook)}</span>
              <span>เลขที่</span>
              <span class="fill-dots" style="flex:1;">${esc(receiptNumber)}</span>
            </div>
            <div class="p-row">
              <span>ลงวันที่</span>
              <span class="fill-dots" style="flex:1;">${dParts.day ? `${toThaiDigits(dParts.day)} ${esc(dParts.month)} ${toThaiDigits(dParts.year)}` : ''}</span>
              <span>ให้ผู้ขอรับบริการเรียบร้อยแล้ว</span>
            </div>
            <div class="p-row" style="padding-left:7mm;">
              <span>ลงชื่อ</span>
              <span class="fill-dots" style="flex:1;">&nbsp;</span>
              <span>เจ้าพนักงานจัดเก็บรายได้</span>
            </div>
            <div class="p-row" style="padding-left:14mm;padding-right:8mm;">
              <span>(</span>
              <span class="fill-dots" style="flex:1;">${esc(collectorOfficer)}</span>
              <span>)</span>
            </div>
          </td>
        </tr>
      </table>
    `;
  } else {
    // General Petition (คำร้องทั่วไปใหม่.docx)
    const rawSubject = (form.subject || p.title || '').trim();
    const subject = rawSubject && rawSubject !== '-' ? toThaiDigits(rawSubject) : '';
    const rawPurpose = (form.purpose || p.description || '').trim();
    const purpose = rawPurpose && rawPurpose !== '-' ? toThaiDigits(rawPurpose) : '';

    bodyContent = `
      <!-- G_P1: Title (18pt regular underlined) -->
      <div class="doc-title">แบบคำร้องทั่วไป</div>

      <!-- G_P2 & G_P3: เขียนที่ & วันที่ -->
      <div class="p-line" style="text-align:right;">
        <span>เขียนที่ </span><span style="border-bottom:1px dotted #000;padding-right:6px;">สำนักงานเทศบาลตำบลบางเป้า</span>
      </div>
      <div class="p-line" style="display:flex;justify-content:flex-end;align-items:baseline;">
        <span>วันที่</span>
        <span class="fill-dots" style="width:17mm;">${dParts.day ? toThaiDigits(dParts.day) : ''}</span>
        <span>เดือน</span>
        <span class="fill-dots" style="width:28mm;">${esc(dParts.month || '')}</span>
        <span>พ.ศ.</span>
        <span class="fill-dots" style="width:14mm;">${dParts.year ? toThaiDigits(dParts.year) : ''}</span>
      </div>

      <!-- G_P4: Blank line -->
      <div style="height:14px;"></div>

      <!-- G_P5: เรื่อง (16pt) -->
      <div class="p-row sz-16">
        <span>เรื่อง</span>
        <span class="fill-dots" style="flex:1;text-align:left;padding-left:6px;">${esc(subject)}</span>
      </div>

      <!-- G_P6: เรียน (16pt) -->
      <div class="p-line sz-16">เรียน&nbsp;&nbsp;&nbsp;&nbsp;นายกเทศมนตรีตำบลบางเป้า</div>

      <!-- G_P7-G_P9: Applicant Info (16pt) -->
      <div class="p-row sz-16">
        <span style="padding-left:12.5mm;">ข้าพเจ้า (นาย/นาง/นางสาว)</span>
        <span class="fill-dots" style="flex:1;">${esc(citizenName)}</span>
        <span>อยู่บ้านเลขที่</span>
        <span class="fill-dots" style="width:25mm;">${esc(houseNo)}</span>
      </div>
      <div class="p-row sz-16">
        <span>ตรอก/ซอย</span>
        <span class="fill-dots" style="width:35mm;">${esc(soi)}</span>
        <span>ถนน</span>
        <span class="fill-dots" style="flex:1;">${esc(road)}</span>
        <span>หมู่ที่</span>
        <span class="fill-dots" style="width:24mm;">${esc(moo)}</span>
        <span>ตำบล/แขวง</span>
        <span class="fill-dots" style="width:33mm;">${esc(subdistrict)}</span>
      </div>
      <div class="p-row sz-16">
        <span>อำเภอ/เขต</span>
        <span class="fill-dots" style="width:46mm;">${esc(district)}</span>
        <span>จังหวัด</span>
        <span class="fill-dots" style="width:34mm;">${esc(province)}</span>
        <span>โทรศัพท์</span>
        <span class="fill-dots" style="flex:1;">${esc(phone)}</span>
      </div>

      <!-- G_P10: Small spacer (sz=10) -->
      <div style="height:4px;"></div>

      <!-- G_P11: ขอยื่นคำร้องต่อนายกเทศมนตรีตำบลบางเป้า ดังต่อไปนี้ -->
      <div class="p-line sz-16">ขอยื่นคำร้องต่อนายกเทศมนตรีตำบลบางเป้า ดังต่อไปนี้</div>

      <!-- G_P12: ข้าพเจ้ามีความประสงค์ (3 dotted lines that wrap long text cleanly!) -->
      <div class="purpose-3lines sz-16">
        <div class="purpose-dotline" style="top:21.5px;"></div>
        <div class="purpose-dotline" style="top:44px;"></div>
        <div class="purpose-dotline" style="top:66.5px;"></div>
        <span class="purpose-label">ข้าพเจ้ามีความประสงค์</span>
        <span class="purpose-text">${esc(purpose)}</span>
      </div>

      <!-- G_P13: จึงเรียนมาเพื่อโปรดทราบและพิจารณาดำเนินการต่อไป -->
      <div class="p-line sz-16" style="padding-left:12.5mm;">จึงเรียนมาเพื่อโปรดทราบและพิจารณาดำเนินการต่อไป</div>

      <!-- G_P14: Blank line -->
      <div style="height:16px;"></div>

      <!-- G_P15-G_P18: Routing & Applicant Signature -->
      <div style="display:flex;align-items:flex-start;">
        <div style="width:48%;">
          <div class="p-line sz-16">เรียนนายกเทศมนตรีตำบลบางเป้า</div>
          <div class="p-line sz-16" style="padding-left:4mm;">- เพื่อโปรดทราบและพิจารณา</div>
          <div class="p-row" style="padding-left:5mm;width:68mm;height:21px;">
            <span class="fill-dots" style="flex:1;">${esc(form.directorComment || '')}</span>
          </div>
        </div>
        <div style="width:52%;">
          <div class="p-row" style="padding-left:2mm;">
            <span>ลงชื่อ</span>
            <span class="fill-dots" style="flex:1;">&nbsp;</span>
            <span>ผู้ยื่นคำร้อง</span>
          </div>
          <div class="p-row" style="padding-left:8mm;padding-right:10mm;">
            <span>(</span>
            <span class="fill-dots" style="flex:1;">${esc(citizenName)}</span>
            <span>)</span>
          </div>
        </div>
      </div>

      <!-- G_P19-G_P24: Director Signature (Left) & คำสั่ง + Mayor Opinion (Right) -->
      <div style="display:flex;align-items:flex-start;">
        <div style="width:48%;">
          <div style="height:22px;"></div>
          <div class="p-row sz-16" style="width:68mm;">
            <span>(ลงชื่อ)</span>
            <span class="fill-dots" style="flex:1;">&nbsp;</span>
          </div>
          <div class="p-line sz-16" style="padding-left:8mm;">(${esc(signers.directorName)})</div>
          <div class="p-line sz-16">${esc(signers.directorPos)}</div>
        </div>
        <div style="width:52%;">
          <div class="p-line sz-16" style="padding-left:32mm;">คำสั่ง</div>
          <div class="p-row" style="padding-left:2mm;height:21px;">
            <span class="fill-dots" style="flex:1;">${esc(form.clerkOrder || '')}</span>
          </div>
          <div class="p-row" style="padding-left:2mm;height:21px;">
            <span class="fill-dots" style="flex:1;">&nbsp;</span>
          </div>
          <div class="p-row" style="padding-left:2mm;height:21px;">
            <span class="fill-dots" style="flex:1;">&nbsp;</span>
          </div>
          <div class="p-line" style="padding-left:2mm;">ความคิดเห็นนายกเทศมนตรีตำบลบางเป้า/ผู้แทน</div>
          <div class="p-line" style="padding-left:6mm;display:flex;align-items:center;">
            ${chk(isApproved)}
            <span style="margin-right:14px;">อนุมัติ</span>
            ${chk(isRejected)}
            <span>ไม่อนุมัติ &nbsp;เพราะ</span>
            <span class="fill-dots" style="flex:1;margin-left:2px;">${isRejected && form.mayorNote ? esc(form.mayorNote) : ''}</span>
          </div>
        </div>
      </div>

      <!-- G_P25: Blank space before Clerk & Acting Mayor signatures -->
      <div style="height:22px;"></div>

      <!-- G_P26-G_P29: Clerk Signature (Left) & Acting Mayor Signature (Right) -->
      <div style="display:flex;align-items:flex-start;">
        <div style="width:48%;">
          <div class="p-row sz-16" style="width:68mm;">
            <span>(ลงชื่อ)</span>
            <span class="fill-dots" style="flex:1;">&nbsp;</span>
          </div>
          <div class="p-line sz-16" style="padding-left:12.5mm;">(${esc(signers.clerkName)})</div>
          <div class="p-line sz-16" style="padding-left:18mm;">${esc(signers.clerkPos)}</div>
        </div>
        <div style="width:52%;">
          <div class="p-row sz-16" style="padding-left:2mm;">
            <span>(ลงชื่อ)</span>
            <span class="fill-dots" style="flex:1;">&nbsp;</span>
          </div>
          <div class="p-line sz-16" style="padding-left:18mm;">(${esc(signers.actingMayorName || signers.mayorName)})</div>
          <div class="p-line sz-16" style="padding-left:7mm;">${esc(signers.actingMayorPosition || 'รองนายกเทศมนตรี ปฏิบัติราชการแทน')}</div>
          <div class="p-line sz-16" style="padding-left:15mm;">${esc(signers.actingMayorFor || 'นายกเทศมนตรีตำบลบางเป้า')}</div>
        </div>
      </div>

      <!-- G_P30: Horizontal rule above Bottom Table -->
      <div style="border-top:1px solid #000;margin:6px -4mm 4px -4mm;"></div>

      <!-- G_P31-G_P43: Bottom 2-Box Table -->
      <table class="bottom-tbl">
        <tr>
          <td style="width:50.7%;">
            <div class="p-line">บันทึกเจ้าหน้าที่ผู้รับคำขอ</div>
            <div class="p-row" style="padding-left:2mm;">
              <span>ได้รับคำร้องเรื่อง</span>
              <span class="fill-dots" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(subject)}</span>
              <span>แล้ว</span>
            </div>
            <div class="p-row">
              <span>เมื่อวันที่</span>
              <span class="fill-dots" style="width:12mm;">${dParts.day ? toThaiDigits(dParts.day) : ''}</span>
              <span>เดือน</span>
              <span class="fill-dots" style="flex:1;">${esc(dParts.month || '')}</span>
              <span>พ.ศ.</span>
              <span class="fill-dots" style="width:18mm;">${dParts.year ? toThaiDigits(dParts.year) : ''}</span>
            </div>
            <div style="height:18px;"></div>
            <div class="p-row" style="padding-left:8mm;">
              <span>ลงชื่อ</span>
              <span class="fill-dots" style="flex:1;">&nbsp;</span>
              <span>เจ้าหน้าที่</span>
            </div>
            <div class="p-row" style="padding-left:14mm;padding-right:4mm;">
              <span>(</span>
              <span class="fill-dots" style="flex:1;">${esc(intakeOfficer)}</span>
              <span>)</span>
            </div>
          </td>
          <td style="width:49.3%;">
            <div class="p-line" style="padding-left:1mm;">ผลการปฏิบัติงาน</div>
            <div class="p-line" style="padding-left:6mm;display:flex;align-items:center;">
              ${chk(isDone)}
              <span>ดำเนินการแล้ว</span>
            </div>
            <div class="p-row" style="padding-left:6mm;">
              <span>เมื่อวันที่</span>
              <span class="fill-dots" style="width:13mm;">${isDone && doneDateParts.day ? toThaiDigits(doneDateParts.day) : ''}</span>
              <span>เดือน</span>
              <span class="fill-dots" style="flex:1;">${isDone ? esc(doneDateParts.month || '') : ''}</span>
              <span>พ.ศ.</span>
              <span class="fill-dots" style="width:16mm;">${isDone && doneDateParts.year ? toThaiDigits(doneDateParts.year) : ''}</span>
            </div>
            <div class="p-row" style="padding-left:6mm;align-items:center;">
              ${chk(!isDone && !isRejected && stage !== 'submitted')}
              <span>รอดำเนินการ เนื่องจาก</span>
              <span class="fill-dots" style="flex:1;">${!isDone && form.operation?.pendingReason ? esc(form.operation.pendingReason) : ''}</span>
            </div>
            <div class="p-row" style="padding-left:6mm;height:20px;">
              <span class="fill-dots" style="flex:1;">&nbsp;</span>
            </div>
            <div class="p-row">
              <span>ลงชื่อ</span>
              <span class="fill-dots" style="flex:1.2;">&nbsp;</span>
              <span>ตำแหน่ง</span>
              <span class="fill-dots" style="flex:1;">${esc(form.operation?.operatorPosition || '')}</span>
            </div>
            <div class="p-row" style="padding-left:5mm;padding-right:12mm;">
              <span>(</span>
              <span class="fill-dots" style="flex:1;">${esc(opOfficer)}</span>
              <span>)</span>
            </div>
          </td>
        </tr>
      </table>
    `;
  }

  const toolbar = opts.toolbar
    ? `<div class="no-print">
        <button onclick="window.print()">🖨️ พิมพ์เอกสาร A4</button>
        <button class="gray" onclick="window.close()">ปิดหน้าต่าง</button>
      </div>`
    : '';

  const pageTopPad = formType === 'sewage' ? '10mm' : '12.5mm';

  return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8"/>
<title>${esc(p.title || 'แบบคำร้อง')}</title>
<style>
  @font-face {
    font-family: 'TH SarabunIT๙';
    src: local('TH SarabunIT๙'), local('THSarabunIT๙'), url('data:font/ttf;base64,${TH_SARABUN_IT9_TTF_BASE64}') format('truetype');
    font-weight: normal;
    font-style: normal;
  }
  @font-face {
    font-family: 'TH SarabunIT๙';
    src: local('TH SarabunIT๙'), local('THSarabunIT๙'), url('data:font/ttf;base64,${TH_SARABUN_IT9_TTF_BASE64}') format('truetype');
    font-weight: bold;
    font-style: normal;
  }

  @page {
    size: A4 portrait;
    margin: 0;
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    font-family: 'TH SarabunIT๙', sans-serif;
    font-weight: normal;
    color: #000;
    -webkit-font-smoothing: antialiased;
  }
  .page {
    width: 210mm;
    height: 297mm;
    max-height: 297mm;
    padding: ${pageTopPad} 17.5mm 4mm 25.4mm;
    margin: 0 auto;
    background: #fff;
    box-sizing: border-box;
    font-size: 15pt;
    line-height: 1.13;
    position: relative;
    overflow: hidden;
  }
  .doc-title {
    text-align: center;
    font-size: 18pt;
    font-weight: normal;
    text-decoration: underline;
    text-underline-offset: 3px;
    line-height: 1.15;
    margin-bottom: 1px;
  }
  .sz-16 {
    font-size: 16pt;
  }
  .p-line {
    white-space: nowrap;
    line-height: 1.13;
  }
  .p-row {
    display: flex;
    align-items: baseline;
    white-space: nowrap;
    line-height: 1.13;
  }
  .fill-dots {
    display: inline-block;
    border-bottom: 1px dotted #000;
    text-align: center;
    font-weight: normal;
    padding: 0 3px;
    margin: 0 1px;
    line-height: 1.02;
    min-height: 0.92em;
  }
  .chk-box {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 16px;
    border: 1.3px solid #000;
    margin: 0 6px 0 2px;
    font-size: 12px;
    font-weight: bold;
    line-height: 1;
    vertical-align: middle;
    flex-shrink: 0;
  }
  .purpose-3lines {
    position: relative;
    line-height: 22.5px;
    min-height: 67.5px;
    max-height: 67.5px;
    overflow: hidden;
    margin-bottom: 1px;
  }
  .purpose-dotline {
    position: absolute;
    left: 0;
    right: 0;
    border-bottom: 1px dotted #000;
    pointer-events: none;
  }
  .purpose-label {
    padding-left: 12.5mm;
    padding-right: 4px;
    background: #fff;
    position: relative;
    z-index: 1;
  }
  .purpose-text {
    word-break: break-word;
    white-space: normal;
  }
  .bottom-tbl {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid #000;
    font-size: 15pt;
    line-height: 1.12;
  }
  .bottom-tbl td {
    border: 1px solid #000;
    padding: 2px 7px 6px 7px;
    vertical-align: top;
  }
  .no-print {
    position: fixed;
    top: 12px;
    right: 20px;
    display: flex;
    gap: 8px;
    z-index: 9999;
    background: rgba(15,23,42,.92);
    padding: 8px 14px;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,.25);
  }
  .no-print button {
    border: 0;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 700;
    color: #fff;
    background: #059669;
    cursor: pointer;
    font-family: 'TH SarabunIT๙', sans-serif;
  }
  .no-print button.gray { background: #475569; }
  @media print {
    html, body {
      width: 210mm;
      height: 297mm;
      background: #fff;
    }
    .page {
      margin: 0;
      width: 210mm;
      height: 297mm;
      max-height: 297mm;
      box-shadow: none;
      page-break-after: avoid;
      break-after: avoid;
    }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
${toolbar}
<div class="page">
  ${bodyContent}
</div>
${opts.autoPrint ? `<script>window.addEventListener('load', function(){ setTimeout(function(){ window.print(); }, 400); });</script>` : ''}
</body>
</html>`;
}

export function openPetitionPrintWindow(
  p: PublicPetition,
  signers?: SignerSettings
): void {
  const html = generatePetitionHtml(p, signers, { toolbar: true, autoPrint: true });
  const w = window.open('', '_blank');
  if (w) {
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
  }
}

export const exportPetitionRegisterCsv = (
  items: PublicPetition[],
  signers?: SignerSettings
): void => {
  const header = [
    'ลำดับ',
    'เลขรับ/รหัสติดตาม',
    'ประเภทแบบฟอร์ม',
    'วันที่ยื่น',
    'ชื่อผู้ยื่นคำร้อง',
    'เลขบัตรประชาชน',
    'โทรศัพท์',
    'ที่อยู่',
    'เรื่อง/รายละเอียด',
    'ค่าธรรมเนียม (บาท)',
    'สถานะ',
    'ผู้รับผิดชอบ',
  ];
  const stageLabel: Record<string, string> = {
    submitted: 'รอรับเรื่อง',
    accepted: 'เสนออนุมัติ',
    assigned: 'อนุมัติ-จ่ายงาน',
    resolved: 'ดำเนินการแล้วเสร็จ',
    rejected: 'ไม่อนุมัติ',
  };
  const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = items.map((p, i) => {
    const f = getPetitionForm(p, signers);
    return [
      i + 1,
      p.trackingCode,
      resolveFormType(p) === 'sewage' ? 'คำร้องขอรับบริการกำจัดสิ่งปฏิกูล' : 'แบบคำร้องทั่วไป',
      f.filedDate,
      sanitizePersonText(p.citizenName),
      p.citizenIdCard || '',
      p.phone,
      p.address,
      resolveFormType(p) === 'sewage' ? p.description : `${f.subject || p.title} : ${f.purpose || p.description}`,
      f.feeAmount ?? '',
      stageLabel[normalizeStage(p.status)] || p.status,
      sanitizePersonText(p.assignedOfficer) || '-',
    ]
      .map(cell)
      .join(',');
  });
  const csv = '\ufeff' + [header.map(cell).join(','), ...rows].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ทะเบียนคุมคำร้อง_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const petitionFileBaseName = (p: PublicPetition): string => {
  const type = resolveFormType(p) === 'sewage' ? 'คำร้องขอรับบริการกำจัดสิ่งปฏิกูล' : 'แบบคำร้องทั่วไป';
  const docNo = p.form?.docNo || p.trackingCode || 'ร่าง';
  const name = (sanitizePersonText(p.citizenName) || 'ผู้ยื่น').replace(/\s+/g, '_');
  return `${type}_${docNo}_${name}`;
};
