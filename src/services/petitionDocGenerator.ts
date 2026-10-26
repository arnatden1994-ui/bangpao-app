/**
 * Official Municipal Petition Document Generator (System 5)
 * Dual Engine:
 * 1. Native OpenXML (.docx) Generator using the municipality's genuine templates:
 *    - คำร้องขอรับบริการกำจัดสิ่งปฏิกูล.docx
 *    - คำร้องทั่วไปใหม่.docx
 *    Guarantees 100% identical styling, TH SarabunIT๙ 15pt, zero unwanted line wraps,
 *    and strict 1-page A4 constraint in Microsoft Word.
 *
 * 2. High-Fidelity A4 HTML Renderer:
 *    Renders the exact single-page A4 layout for browser live preview and print dialog.
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
  formatMoney,
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
  const mooMatch = trimmed.match(/หมู่(?:\s*ที่)?\s*([0-9]+|[^\s,]+)/);
  const moo = mooMatch ? mooMatch[1] : '';

  // Extract houseNo
  let houseNo = '';
  const houseMatch = trimmed.match(/^(?:เลขที่|บ้านเลขที่)?\s*([0-9]+(?:\/[0-9]+)?)/);
  if (houseMatch) {
    houseNo = houseMatch[1];
  } else {
    const firstToken = trimmed.split(/[\s,]+/)[0];
    if (/^[0-9]+(\child[0-9]+)?$/.test(firstToken) || /^[0-9]+(\/[0-9]+)?$/.test(firstToken)) {
      houseNo = firstToken;
    }
  }

  // Extract soi
  let soi = '';
  const soiMatch = trimmed.match(/(?:ซอย|ตรอก)\s*([^\s,]+)/);
  if (soiMatch) soi = soiMatch[1];

  // Extract road
  let road = '';
  const roadMatch = trimmed.match(/ถนน\s*([^\s,]+)/);
  if (roadMatch) road = roadMatch[1];

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
    soi: soi || '-',
    road: road || '-',
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

  const houseNo = app?.houseNo || (form as any)?.houseNo || parsed.houseNo || '-';
  const moo = app?.moo || (form as any)?.moo || p.moo || parsed.moo || '1';
  const soi = app?.soi && app.soi !== '-' ? app.soi : (parsed.soi && parsed.soi !== '-' ? parsed.soi : '-');
  const road = app?.road && app.road !== '-' ? app.road : (parsed.road && parsed.road !== '-' ? parsed.road : '-');
  const subdistrict = app?.subdistrict || (form as any)?.subdistrict || parsed.subdistrict || 'บางเป้า';
  const district = app?.district || (form as any)?.district || parsed.district || 'กันตัง';
  const province = app?.province || (form as any)?.province || parsed.province || 'ตรัง';
  const phone = app?.phone || (form as any)?.phone || p.phone || '-';

  const srvHouseNo = srv?.houseNo || houseNo;
  const srvMoo = srv?.moo || moo;
  const srvSoi = srv?.soi && srv.soi !== '-' ? srv.soi : soi;
  const srvRoad = srv?.road && srv.road !== '-' ? srv.road : road;
  const srvSubdistrict = srv?.subdistrict || subdistrict;
  const srvDistrict = srv?.district || district;
  const srvProvince = srv?.province || province;
  const srvPhone = srv?.phone || phone;

  return {
    citizenName: p.citizenName || (form as any)?.citizenName || '',
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
const esc = (s: string): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// ===========================================================================
// 1. GENUINE MICROSOFT WORD (.DOCX) GENERATOR
// ===========================================================================

export function generatePetitionDocxBytes(
  p: PublicPetition,
  savedSigners?: SignerSettings
): Uint8Array {
  const form = getPetitionForm(p, savedSigners);
  const signers = savedSigners || DEFAULT_SIGNER_SETTINGS;
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
  const zone = form.sewageZone || 'in_district';
  const isApproved = p.status === 'assigned' || p.status === 'resolved';
  const isRejected = p.status === 'rejected';
  const isDone = p.status === 'resolved';

  const addr = resolvePetitionAddress(p, form);
  const citizenName = addr.citizenName || '...................................................';
  const houseNo = addr.houseNo;
  const soi = addr.soi;
  const road = addr.road;
  const moo = addr.moo;
  const subdistrict = addr.subdistrict;
  const district = addr.district;
  const province = addr.province;
  const phone = addr.phone;
  const srvHouseNo = addr.srvHouseNo;
  const srvMoo = addr.srvMoo;

  // 1. Date (P3 - 4B9119BD)
  xml = xml.replace(
    /<w:p[^>]*w14:paraId="4B9119BD"[\s\S]*?<\/w:p>/,
    `<w:p w14:paraId="4B9119BD" w14:textId="4E472326" w:rsidR="00647EF6" w:rsidRPr="00233D4B" w:rsidRDefault="00647EF6" w:rsidP="000D66AD"><w:pPr><w:spacing w:after="0"/><w:ind w:right="-23"/><w:jc w:val="right"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:cs/></w:rPr><w:t xml:space="preserve">วันที่ </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:u w:val="dotted"/><w:cs/></w:rPr><w:t xml:space="preserve"> ${dParts.day ? toThaiDigits(dParts.day) : '........'} </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:cs/></w:rPr><w:t xml:space="preserve"> เดือน </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:u w:val="dotted"/><w:cs/></w:rPr><w:t xml:space="preserve"> ${dParts.month || '....................'} </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:cs/></w:rPr><w:t xml:space="preserve"> พ.ศ. </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:u w:val="dotted"/><w:cs/></w:rPr><w:t xml:space="preserve"> ${dParts.year ? toThaiDigits(dParts.year) : '..........'} </w:t></w:r></w:p>`
  );

  // 2. Applicant Name & House No (P4 - 24AD9869)
  xml = xml.replace(
    /<w:p[^>]*w14:paraId="24AD9869"[\s\S]*?<\/w:p>/,
    `<w:p w14:paraId="24AD9869" w14:textId="3CD8E48E" w:rsidR="00647EF6" w:rsidRPr="00233D4B" w:rsidRDefault="00647EF6" w:rsidP="000D66AD"><w:pPr><w:tabs><w:tab w:val="left" w:pos="709"/><w:tab w:val="left" w:pos="851"/></w:tabs><w:spacing w:after="0"/><w:ind w:right="-23"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:cs/></w:rPr><w:t xml:space="preserve">          ข้าพเจ้า (นาย/นาง/นางสาว) </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:u w:val="dotted"/><w:cs/></w:rPr><w:t xml:space="preserve"> ${esc(citizenName)} </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:cs/></w:rPr><w:t xml:space="preserve"> อยู่บ้านเลขที่ </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:u w:val="dotted"/><w:cs/></w:rPr><w:t xml:space="preserve"> ${esc(srvHouseNo ? toThaiDigits(srvHouseNo) : '-')} </w:t></w:r></w:p>`
  );

  // 3. Soi, Road, Moo, Subdistrict (P5 - 764AFE03)
  xml = xml.replace(
    /<w:p[^>]*w14:paraId="764AFE03"[\s\S]*?<\/w:p>/,
    `<w:p w14:paraId="764AFE03" w14:textId="68E2C739" w:rsidR="00647EF6" w:rsidRPr="00233D4B" w:rsidRDefault="00647EF6" w:rsidP="00D526C2"><w:pPr><w:spacing w:after="0"/><w:ind w:right="-472"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:cs/></w:rPr><w:t>ตรอก/ซอย </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:u w:val="dotted"/><w:cs/></w:rPr><w:t xml:space="preserve"> ${esc(soi)} </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:cs/></w:rPr><w:t> ถนน </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:u w:val="dotted"/><w:cs/></w:rPr><w:t xml:space="preserve"> ${esc(road)} </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:cs/></w:rPr><w:t> หมู่ที่ </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:u w:val="dotted"/><w:cs/></w:rPr><w:t xml:space="preserve"> ${esc(moo ? toThaiDigits(moo) : '๑')} </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:cs/></w:rPr><w:t> ตำบล/แขวง </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:u w:val="dotted"/><w:cs/></w:rPr><w:t xml:space="preserve"> ${esc(subdistrict)} </w:t></w:r></w:p>`
  );

  // 4. District, Province, Phone (P6 - 7ACFFCBC)
  xml = xml.replace(
    /<w:p[^>]*w14:paraId="7ACFFCBC"[\s\S]*?<\/w:p>/,
    `<w:p w14:paraId="7ACFFCBC" w14:textId="6ECE555F" w:rsidR="00647EF6" w:rsidRPr="00233D4B" w:rsidRDefault="00647EF6" w:rsidP="00D526C2"><w:pPr><w:spacing w:after="0"/><w:ind w:right="-472"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:cs/></w:rPr><w:t>อำเภอ/เขต </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:u w:val="dotted"/><w:cs/></w:rPr><w:t xml:space="preserve"> ${esc(district)} </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:cs/></w:rPr><w:t> จังหวัด </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:u w:val="dotted"/><w:cs/></w:rPr><w:t xml:space="preserve"> ${esc(province)} </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:cs/></w:rPr><w:t> โทรศัพท์ </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:u w:val="dotted"/><w:cs/></w:rPr><w:t xml:space="preserve"> ${esc(phone ? toThaiDigits(phone) : '-')} </w:t></w:r></w:p>`
  );

  // 5. Destination House No (P7 - 12EC7A4B)
  xml = xml.replace(
    /<w:p[^>]*w14:paraId="12EC7A4B"[\s\S]*?<\/w:p>/,
    `<w:p w14:paraId="12EC7A4B" w14:textId="2260FBD9" w:rsidR="00606029" w:rsidRPr="00233D4B" w:rsidRDefault="00606029" w:rsidP="00D526C2"><w:pPr><w:spacing w:after="0"/><w:ind w:right="-472"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:cs/></w:rPr><w:t xml:space="preserve">          มีความประสงค์จะขอรับบริการกำจัดสิ่งปฏิกูล จากสำนักงานเทศบาลตำบลบางเป้า ณ บ้านเลขที่ </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:u w:val="dotted"/><w:cs/></w:rPr><w:t xml:space="preserve"> ${esc(houseNo ? toThaiDigits(houseNo) : '-')} </w:t></w:r></w:p>`
  );

  // 6. Destination Soi, Road, Moo, Subdistrict (P8 - 41933E49)
  xml = xml.replace(
    /<w:p[^>]*w14:paraId="41933E49"[\s\S]*?<\/w:p>/,
    `<w:p w14:paraId="41933E49" w14:textId="2B494226" w:rsidR="00606029" w:rsidRPr="00233D4B" w:rsidRDefault="00606029" w:rsidP="00D526C2"><w:pPr><w:spacing w:after="0"/><w:ind w:right="-472"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:cs/></w:rPr><w:t>ตรอก/ซอย </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:u w:val="dotted"/><w:cs/></w:rPr><w:t xml:space="preserve"> ${esc(soi)} </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:cs/></w:rPr><w:t> ถนน </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:u w:val="dotted"/><w:cs/></w:rPr><w:t xml:space="preserve"> ${esc(road)} </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:cs/></w:rPr><w:t> หมู่ที่ </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:u w:val="dotted"/><w:cs/></w:rPr><w:t xml:space="preserve"> ${esc(moo ? toThaiDigits(moo) : '๑')} </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:cs/></w:rPr><w:t> ตำบล/แขวง </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:u w:val="dotted"/><w:cs/></w:rPr><w:t xml:space="preserve"> ${esc(subdistrict)} </w:t></w:r></w:p>`
  );

  // 7. Destination District, Province, Phone (P9 - 51A96CAB)
  xml = xml.replace(
    /<w:p[^>]*w14:paraId="51A96CAB"[\s\S]*?<\/w:p>/,
    `<w:p w14:paraId="51A96CAB" w14:textId="76362779" w:rsidR="00606029" w:rsidRPr="00233D4B" w:rsidRDefault="00606029" w:rsidP="00D526C2"><w:pPr><w:spacing w:after="0"/><w:ind w:right="-472"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:cs/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:cs/></w:rPr><w:t>อำเภอ/เขต </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:u w:val="dotted"/><w:cs/></w:rPr><w:t xml:space="preserve"> ${esc(district)} </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:cs/></w:rPr><w:t> จังหวัด </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:u w:val="dotted"/><w:cs/></w:rPr><w:t xml:space="preserve"> ${esc(province)} </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:cs/></w:rPr><w:t> โทรศัพท์ </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:u w:val="dotted"/><w:cs/></w:rPr><w:t xml:space="preserve"> ${esc(phone ? toThaiDigits(phone) : '-')} </w:t></w:r></w:p>`
  );

  // 8. Checkboxes: In District 250 (P12 - 2CBB71F2)
  xml = xml.replace(
    /<w:p[^>]*w14:paraId="2CBB71F2"[\s\S]*?<\/w:p>/,
    `<w:p w14:paraId="2CBB71F2" w14:textId="57A97889" w:rsidR="00A36206" w:rsidRPr="00233D4B" w:rsidRDefault="00A36206" w:rsidP="00A36206"><w:pPr><w:tabs><w:tab w:val="left" w:pos="709"/><w:tab w:val="left" w:pos="993"/></w:tabs><w:spacing w:after="0"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr><w:t xml:space="preserve">           </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:cs="Wingdings"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr><w:sym w:font="Wingdings" w:char="${zone === 'in_district' ? 'F0FE' : 'F0A8'}"/></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr><w:t xml:space="preserve"> เหมาจ่าย ครั้งละ ๒๕๐ บาท /บ่อ</w:t></w:r></w:p>`
  );

  // Out 10km 700 (P14 - 473680E0)
  xml = xml.replace(
    /<w:p[^>]*w14:paraId="473680E0"[\s\S]*?<\/w:p>/,
    `<w:p w14:paraId="473680E0" w14:textId="5B8288E7" w:rsidR="00A36206" w:rsidRPr="00233D4B" w:rsidRDefault="00A36206" w:rsidP="00A36206"><w:pPr><w:tabs><w:tab w:val="left" w:pos="709"/></w:tabs><w:spacing w:after="0"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr><w:t xml:space="preserve">           </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:cs="Wingdings"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr><w:sym w:font="Wingdings" w:char="${zone === 'out_10' ? 'F0FE' : 'F0A8'}"/></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr><w:t xml:space="preserve"> ไม่เกิน ๑๐ กิโลเมตร                            ครั้งละ    ๗๐๐ บาท / ๑ บ่อ</w:t></w:r></w:p>`
  );

  // Out 20km 1,000 (P15 - 7F1951A3)
  xml = xml.replace(
    /<w:p[^>]*w14:paraId="7F1951A3"[\s\S]*?<\/w:p>/,
    `<w:p w14:paraId="7F1951A3" w14:textId="19989EC0" w:rsidR="00A36206" w:rsidRPr="00233D4B" w:rsidRDefault="00A36206" w:rsidP="00A36206"><w:pPr><w:tabs><w:tab w:val="left" w:pos="709"/></w:tabs><w:spacing w:after="0"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr><w:t xml:space="preserve">           </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:cs="Wingdings"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr><w:sym w:font="Wingdings" w:char="${zone === 'out_20' ? 'F0FE' : 'F0A8'}"/></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr><w:t xml:space="preserve"> เกิน ๑๐ กิโลเมตร แต่ไม่เกิน ๒๐ กิโลเมตร  ครั้งละ ๑,๐๐๐ บาท / ๑ บ่อ</w:t></w:r></w:p>`
  );

  // Out 30km 1,300 (P16 - 30BA2199)
  xml = xml.replace(
    /<w:p[^>]*w14:paraId="30BA2199"[\s\S]*?<\/w:p>/,
    `<w:p w14:paraId="30BA2199" w14:textId="763F7DDD" w:rsidR="00A36206" w:rsidRPr="00233D4B" w:rsidRDefault="00A36206" w:rsidP="004D0238"><w:pPr><w:tabs><w:tab w:val="left" w:pos="709"/><w:tab w:val="left" w:pos="993"/></w:tabs><w:spacing w:after="0"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr><w:t xml:space="preserve">           </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:cs="Wingdings"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr><w:sym w:font="Wingdings" w:char="${zone === 'out_30' ? 'F0FE' : 'F0A8'}"/></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr><w:t xml:space="preserve"> เกิน ๒๐ กิโลเมตร แต่ไม่เกิน ๓๐ กิโลเมตร  ครั้งละ ๑,๓๐๐ บาท / ๑ บ่อ</w:t></w:r></w:p>`
  );

  // 9. Signatures: Applicant Signature (replace dots in P20)
  xml = xml.replace(
    /\(..........................................................\)/,
    `( ${esc(citizenName)} )`
  );

  // 10. Mayor Approval Options (P22 - 38E70E86)
  xml = xml.replace(
    /<w:p[^>]*w14:paraId="38E70E86"[\s\S]*?<\/w:p>/,
    `<w:p w14:paraId="38E70E86" w14:textId="24AC0F86" w:rsidR="004D0238" w:rsidRPr="00233D4B" w:rsidRDefault="00A93491" w:rsidP="00A93491"><w:pPr><w:tabs><w:tab w:val="left" w:pos="4962"/></w:tabs><w:spacing w:after="0"/><w:ind w:left="4500"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:cs="Wingdings"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr><w:sym w:font="Wingdings" w:char="${isApproved ? 'F0FE' : 'F0A8'}"/></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr><w:t xml:space="preserve"> อนุมัติ      </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:cs="Wingdings"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr><w:sym w:font="Wingdings" w:char="${isRejected ? 'F0FE' : 'F0A8'}"/></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr><w:t xml:space="preserve"> ไม่อนุมัติ  เพราะ......................</w:t></w:r></w:p>`
  );

  // 11. Driver Result (P30 & P32)
  const driverName = form.assignedDriver || p.assignedOfficer || 'นายชนะ สุขด้วง';
  xml = xml.replace(
    /<w:p[^>]*w14:paraId="7372C120"[\s\S]*?<\/w:p>/,
    `<w:p w14:paraId="7372C120" w14:textId="55F1B56E" w:rsidR="004D0238" w:rsidRPr="00233D4B" w:rsidRDefault="00331F3A" w:rsidP="00D526C2"><w:pPr><w:spacing w:after="0"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:cs="Wingdings"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr><w:sym w:font="Wingdings" w:char="${isDone ? 'F0FE' : 'F0A8'}"/></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr><w:t xml:space="preserve"> ดำเนินการแล้ว เมื่อวันที่ ${isDone ? toThaiDigits(dParts.day) : '.................'} เดือน ${isDone ? dParts.month : '................................'} พ.ศ. ${isDone ? toThaiDigits(dParts.year) : '...................'}</w:t></w:r></w:p>`
  );

  if (driverName) {
    xml = xml.replace(
      /\(นายชนะ สุขด้วง\)/,
      `(${esc(driverName)})`
    );
  }

  // 12. Bottom Table: Receipt & Intake Record (TBL34)
  const rawFee = form.feeAmount || getSewageFee(zone);
  const feeDigits = rawFee ? toThaiDigits(rawFee) : '...............';
  const receiptBook = form.receipt?.bookNo ? toThaiDigits(form.receipt.bookNo) : '...............';
  const receiptNumber = form.receipt?.receiptNo ? toThaiDigits(form.receipt.receiptNo) : '...............';
  const intakeOfficer = form.officerNote?.officerName || 'นางสาวอรัญญา สุขสวัสดิ์';

  xml = xml.replace(
    /เมื่อวันที่\.\.\.\.\.\.\.\.\.\.\.เดือน\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.พ\.ศ\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\./,
    `เมื่อวันที่ ${toThaiDigits(dParts.day)} เดือน ${dParts.month} พ.ศ. ${toThaiDigits(dParts.year)}`
  );

  xml = xml.replace(
    /\(นางสาวอรัญญา สุขสวัสดิ์\)/g,
    `(${esc(intakeOfficer)})`
  );

  xml = xml.replace(
    /ได้รับค่าธรรมเนียม จำนวน[\s\S]*?บาท และออก/,
    `ได้รับค่าธรรมเนียม จำนวน ${feeDigits} บาท และออก`
  );

  xml = xml.replace(
    /เล่มที่[\s\S]*?เลขที่[\s\S]*?<\/w:t>/,
    `เล่มที่ ${receiptBook} เลขที่ ${receiptNumber}</w:t>`
  );

  xml = xml.replace(
    /ลงวันที่[\s\S]*?ให้ผู้ขอรับบริการเรียบร้อยแล้ว/,
    `ลงวันที่ ${toThaiDigits(dParts.day)} ${dParts.month} ${toThaiDigits(dParts.year)} ให้ผู้ขอรับบริการเรียบร้อยแล้ว`
  );

  // Assemble full Zip entries
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
  const addr = resolvePetitionAddress(p, form);
  const citizenName = addr.citizenName || '...................................................';
  const houseNo = addr.houseNo;
  const soi = addr.soi;
  const road = addr.road;
  const moo = addr.moo;
  const subdistrict = addr.subdistrict;
  const district = addr.district;
  const province = addr.province;
  const phone = addr.phone;
  const subject = form.subject || p.title || 'คำร้องทั่วไปด้านสาธารณสุขและสิ่งแวดล้อม';
  const purpose = form.purpose || p.description || '-';

  // 1. Date (P3 - 4B9119BD)
  xml = xml.replace(
    /<w:p[^>]*w14:paraId="4B9119BD"[\s\S]*?<\/w:p>/,
    `<w:p w14:paraId="4B9119BD" w14:textId="4E472326" w:rsidR="00647EF6" w:rsidRPr="00233D4B" w:rsidRDefault="00647EF6" w:rsidP="000D66AD"><w:pPr><w:spacing w:after="0"/><w:ind w:right="-23"/><w:jc w:val="right"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:cs/></w:rPr><w:t xml:space="preserve">     วันที่ </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:u w:val="dotted"/><w:cs/></w:rPr><w:t xml:space="preserve"> ${dParts.day} </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:cs/></w:rPr><w:t xml:space="preserve"> เดือน </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:u w:val="dotted"/><w:cs/></w:rPr><w:t xml:space="preserve"> ${dParts.month} </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:cs/></w:rPr><w:t xml:space="preserve"> พ.ศ. </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:u w:val="dotted"/><w:cs/></w:rPr><w:t xml:space="preserve"> ${dParts.year} </w:t></w:r></w:p>`
  );

  // 2. Subject (P5)
  xml = xml.replace(
    /<w:p[^>]*w14:paraId="6B7D5C43"[\s\S]*?<\/w:p>/,
    `<w:p w14:paraId="6B7D5C43" w14:textId="77777777" w:rsidR="00647EF6" w:rsidRDefault="00647EF6" w:rsidP="00A36206"><w:pPr><w:spacing w:after="0"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:b/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:b/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr><w:t xml:space="preserve">เรื่อง  </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:u w:val="dotted"/></w:rPr><w:t xml:space="preserve"> ${esc(subject)} </w:t></w:r></w:p>`
  );

  // 3. Citizen Name & House No (P7 - 24AD9869)
  xml = xml.replace(
    /<w:p[^>]*w14:paraId="24AD9869"[\s\S]*?<\/w:p>/,
    `<w:p w14:paraId="24AD9869" w14:textId="3CD8E48E" w:rsidR="00647EF6" w:rsidRPr="00233D4B" w:rsidRDefault="00647EF6" w:rsidP="000D66AD"><w:pPr><w:tabs><w:tab w:val="left" w:pos="709"/><w:tab w:val="left" w:pos="851"/></w:tabs><w:spacing w:after="0"/><w:ind w:right="-23"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:cs/></w:rPr><w:t xml:space="preserve">          ข้าพเจ้า (นาย/นาง/นางสาว) </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:u w:val="dotted"/><w:cs/></w:rPr><w:t xml:space="preserve"> ${esc(citizenName)} </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:cs/></w:rPr><w:t xml:space="preserve"> อยู่บ้านเลขที่ </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:u w:val="dotted"/><w:cs/></w:rPr><w:t xml:space="preserve"> ${esc(houseNo)} </w:t></w:r></w:p>`
  );

  // 4. Soi, Road, Moo, Subdistrict (P8 - 764AFE03)
  xml = xml.replace(
    /<w:p[^>]*w14:paraId="764AFE03"[\s\S]*?<\/w:p>/,
    `<w:p w14:paraId="764AFE03" w14:textId="68E2C739" w:rsidR="00647EF6" w:rsidRPr="00233D4B" w:rsidRDefault="00647EF6" w:rsidP="00D526C2"><w:pPr><w:spacing w:after="0"/><w:ind w:right="-472"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:cs/></w:rPr><w:t>ตรอก/ซอย </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:u w:val="dotted"/><w:cs/></w:rPr><w:t xml:space="preserve"> ${esc(soi)} </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:cs/></w:rPr><w:t> ถนน </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:u w:val="dotted"/><w:cs/></w:rPr><w:t xml:space="preserve"> ${esc(road)} </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:cs/></w:rPr><w:t> หมู่ที่ </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:u w:val="dotted"/><w:cs/></w:rPr><w:t xml:space="preserve"> ${esc(moo)} </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:cs/></w:rPr><w:t> ตำบล/แขวง </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:u w:val="dotted"/><w:cs/></w:rPr><w:t xml:space="preserve"> ${esc(subdistrict)} </w:t></w:r></w:p>`
  );

  // 5. District, Province, Phone (P9 - 7ACFFCBC)
  xml = xml.replace(
    /<w:p[^>]*w14:paraId="7ACFFCBC"[\s\S]*?<\/w:p>/,
    `<w:p w14:paraId="7ACFFCBC" w14:textId="6ECE555F" w:rsidR="00647EF6" w:rsidRPr="00233D4B" w:rsidRDefault="00647EF6" w:rsidP="00D526C2"><w:pPr><w:spacing w:after="0"/><w:ind w:right="-472"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:cs/></w:rPr><w:t>อำเภอ/เขต </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:u w:val="dotted"/><w:cs/></w:rPr><w:t xml:space="preserve"> ${esc(district)} </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:cs/></w:rPr><w:t> จังหวัด </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:u w:val="dotted"/><w:cs/></w:rPr><w:t xml:space="preserve"> ${esc(province)} </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:cs/></w:rPr><w:t> โทรศัพท์ </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:u w:val="dotted"/><w:cs/></w:rPr><w:t xml:space="preserve"> ${esc(phone)} </w:t></w:r></w:p>`
  );

  // 6. Purpose (P12 - 76F6D43B)
  xml = xml.replace(
    /<w:p[^>]*w14:paraId="76F6D43B"[\s\S]*?<\/w:p>/,
    `<w:p w14:paraId="76F6D43B" w14:textId="77777777" w:rsidR="00647EF6" w:rsidRDefault="00647EF6" w:rsidP="00A36206"><w:pPr><w:spacing w:after="0"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr><w:t xml:space="preserve">          ข้าพเจ้ามีความประสงค์ </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:u w:val="dotted"/></w:rPr><w:t xml:space="preserve"> ${esc(purpose)} </w:t></w:r></w:p>`
  );

  // 7. Applicant Signature (P15 & P16)
  xml = xml.replace(
    /<w:p[^>]*w14:paraId="52007ABA"[\s\S]*?<\/w:p>/,
    `<w:p w14:paraId="52007ABA" w14:textId="0829B760" w:rsidR="004D0238" w:rsidRPr="00233D4B" w:rsidRDefault="000F001D" w:rsidP="00D41E87"><w:pPr><w:spacing w:after="0"/><w:ind w:right="-472"/><w:jc w:val="right"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr><w:t xml:space="preserve">ลงชื่อ </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:u w:val="dotted"/></w:rPr><w:t xml:space="preserve">.............................................................</w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr><w:t xml:space="preserve"> ผู้ยื่นคำร้อง        </w:t></w:r></w:p>`
  );

  xml = xml.replace(
    /<w:p[^>]*w14:paraId="669C0656"[\s\S]*?<\/w:p>/,
    `<w:p w14:paraId="669C0656" w14:textId="5E8A65A7" w:rsidR="004D0238" w:rsidRPr="00233D4B" w:rsidRDefault="004D0238" w:rsidP="00031245"><w:pPr><w:spacing w:after="0"/><w:ind w:right="-472"/><w:jc w:val="right"/><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr><w:t xml:space="preserve">( </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/><w:u w:val="dotted"/></w:rPr><w:t xml:space="preserve"> ${esc(citizenName)} </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr><w:t xml:space="preserve"> )                      </w:t></w:r></w:p>`
  );

  // Assemble full Zip entries
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
  const typeStr = resolveFormType(p) === 'sewage' ? 'คำร้องขอสูบสิ่งปฏิกูล' : 'แบบคำร้องทั่วไป';
  const docNo = p.form?.docNo || p.trackingCode || 'REQ';
  const name = (p.citizenName || 'ผู้ยื่น').replace(/\s+/g, '_');
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
// 2. HIGH-FIDELITY SINGLE-PAGE A4 HTML RENDERER (OFFLINE BASE64 TH SARABUN)
// ===========================================================================

export const SARABUN_WOFF2_BASE64 = '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';

export function generatePetitionHtml(
  p: PublicPetition,
  savedSigners?: SignerSettings,
  opts: { toolbar?: boolean; autoPrint?: boolean } = {}
): string {
  const form = getPetitionForm(p, savedSigners);
  const signers = savedSigners || DEFAULT_SIGNER_SETTINGS;
  const formType = resolveFormType(p);
  const dParts = toThaiDateParts(form.filedDate);

  const addr = resolvePetitionAddress(p, form);
  const citizenName = addr.citizenName;
  const houseNo = addr.houseNo;
  const soi = addr.soi;
  const road = addr.road;
  const moo = addr.moo;
  const subdistrict = addr.subdistrict;
  const district = addr.district;
  const province = addr.province;
  const phone = addr.phone;

  const srvHouseNo = addr.srvHouseNo;
  const srvSoi = addr.srvSoi;
  const srvRoad = addr.srvRoad;
  const srvMoo = addr.srvMoo;
  const srvSubdistrict = addr.srvSubdistrict;
  const srvDistrict = addr.srvDistrict;
  const srvProvince = addr.srvProvince;
  const srvPhone = addr.srvPhone;

  const zone = form.sewageZone || 'in_district';
  const isApproved = p.status === 'assigned' || p.status === 'resolved' || (p as any).stage === 'assigned' || (p as any).stage === 'resolved';
  const isRejected = p.status === 'rejected' || (p as any).stage === 'rejected';
  const isDone = p.status === 'resolved' || (p as any).stage === 'resolved';

  const rawDriver = form.assignedDriver || p.assignedOfficer || 'นายชนะ สุขด้วง';
  const driverName = rawDriver.replace(/\s*\([^)]*\)\s*/g, ' ').trim() || 'นายชนะ สุขด้วง';

  const feeAmount = form.feeAmount || getSewageFee(zone);
  const receiptBook = form.receipt?.bookNo || '.......';
  const receiptNumber = form.receipt?.receiptNo || '.......';
  const intakeOfficer = form.officerNote?.officerName || 'นางสาวอรัญญา สุขสวัสดิ์';

  const chk = (on: boolean) =>
    `<span style="display:inline-flex;align-items:center;justify-content:center;width:12px;height:12px;border:1.3px solid #000;margin:0 4px 0 2px;font-size:10px;font-weight:bold;line-height:1;vertical-align:middle;box-sizing:border-box;">${
      on ? '&#10003;' : ''
    }</span>`;

  let bodyContent = '';

  if (formType === 'sewage') {
    bodyContent = `
      <div style="text-align:center;font-size:16.5pt;font-weight:bold;text-decoration:underline;margin-bottom:6px;">
        คำร้องขอรับบริการกำจัดสิ่งปฏิกูล
      </div>

      <div style="display:flex;justify-content:flex-end;margin-bottom:4px;">
        <div style="width:48%;text-align:left;">
          <div style="display:flex;align-items:baseline;white-space:nowrap;">
            <span>เขียนที่</span>
            <span class="fill-dots" style="flex:1;margin-left:4px;">สำนักงานเทศบาลตำบลบางเป้า</span>
          </div>
          <div style="display:flex;align-items:baseline;white-space:nowrap;margin-top:2px;">
            <span style="width:2em;"></span>
            <span>วันที่</span>
            <span class="fill-dots" style="width:36px;margin:0 4px;">${toThaiDigits(dParts.day)}</span>
            <span>เดือน</span>
            <span class="fill-dots" style="flex:1;margin:0 4px;">${dParts.month}</span>
            <span>พ.ศ.</span>
            <span class="fill-dots" style="width:45px;margin-left:4px;">${toThaiDigits(dParts.year)}</span>
          </div>
        </div>
      </div>

      <div style="text-align:left;margin-bottom:3px;">
        <strong>เรียน</strong>&nbsp;&nbsp;&nbsp;&nbsp;นายกเทศมนตรีตำบลบางเป้า
      </div>

      <div style="display:flex;align-items:baseline;white-space:nowrap;margin-bottom:2px;">
        <span style="width:2.5em;"></span>
        <span>ข้าพเจ้า (นาย/นาง/นางสาว)</span>
        <span class="fill-dots" style="flex:1;">${citizenName}</span>
        <span>อยู่บ้านเลขที่</span>
        <span class="fill-dots" style="width:90px;margin-left:4px;">${toThaiDigits(houseNo)}</span>
      </div>
      <div style="display:flex;align-items:baseline;white-space:nowrap;margin-bottom:2px;">
        <span>ตรอก/ซอย</span>
        <span class="fill-dots" style="flex:1;">${soi}</span>
        <span>ถนน</span>
        <span class="fill-dots" style="flex:1.4;">${road}</span>
        <span>หมู่ที่</span>
        <span class="fill-dots" style="width:60px;margin:0 4px;">${toThaiDigits(moo)}</span>
        <span>ตำบล/แขวง</span>
        <span class="fill-dots" style="flex:1;">${subdistrict}</span>
      </div>
      <div style="display:flex;align-items:baseline;white-space:nowrap;margin-bottom:3px;">
        <span>อำเภอ/เขต</span>
        <span class="fill-dots" style="flex:1;">${district}</span>
        <span>จังหวัด</span>
        <span class="fill-dots" style="flex:1;">${province}</span>
        <span>โทรศัพท์</span>
        <span class="fill-dots" style="flex:1.3;">${toThaiDigits(phone)}</span>
      </div>

      <div style="display:flex;align-items:baseline;white-space:nowrap;margin-bottom:2px;">
        <span style="width:2.5em;"></span>
        <span>มีความประสงค์จะขอรับบริการกำจัดสิ่งปฏิกูล จากสำนักงานเทศบาลตำบลบางเป้า ณ บ้านเลขที่</span>
        <span class="fill-dots" style="flex:1;margin-left:4px;">${toThaiDigits(srvHouseNo)}</span>
      </div>
      <div style="display:flex;align-items:baseline;white-space:nowrap;margin-bottom:2px;">
        <span>ตรอก/ซอย</span>
        <span class="fill-dots" style="flex:1;">${srvSoi}</span>
        <span>ถนน</span>
        <span class="fill-dots" style="flex:1.4;">${srvRoad}</span>
        <span>หมู่ที่</span>
        <span class="fill-dots" style="width:60px;margin:0 4px;">${toThaiDigits(srvMoo)}</span>
        <span>ตำบล/แขวง</span>
        <span class="fill-dots" style="flex:1;">${srvSubdistrict}</span>
      </div>
      <div style="display:flex;align-items:baseline;white-space:nowrap;margin-bottom:3px;">
        <span>อำเภอ/เขต</span>
        <span class="fill-dots" style="flex:1;">${srvDistrict}</span>
        <span>จังหวัด</span>
        <span class="fill-dots" style="flex:1;">${srvProvince}</span>
        <span>โทรศัพท์</span>
        <span class="fill-dots" style="flex:1.3;">${toThaiDigits(srvPhone)}</span>
      </div>

      <div style="margin-bottom:2px;white-space:nowrap;letter-spacing:-0.2px;">
        โดยข้าพเจ้า ยินยอมชำระค่าธรรมเนียมในการบริการกำจัดสิ่งปฏิกูล ตามข้อบัญญัติของเทศบาลตำบลบางเป้าดังนี้
      </div>

      <div style="padding-left:2.5em;margin-bottom:1px;">
        ในเขตเทศบาลตำบลบางเป้า
      </div>
      <div style="padding-left:4em;display:flex;align-items:center;margin-bottom:2px;">
        ${chk(zone === 'in_district')}
        <span style="margin-left:6px;">เหมาจ่าย ครั้งละ ๒๕๐ บาท /บ่อ</span>
      </div>

      <div style="padding-left:2.5em;margin-bottom:1px;">
        นอกเขตเทศบาลตำบลบางเป้า
      </div>
      <div style="padding-left:4em;display:flex;justify-content:space-between;max-width:630px;margin-bottom:1px;">
        <div style="display:flex;align-items:center;white-space:nowrap;">
          ${chk(zone === 'out_10')}
          <span style="margin-left:6px;">ไม่เกิน ๑๐ กิโลเมตร</span>
        </div>
        <span style="white-space:nowrap;">ครั้งละ &nbsp;&nbsp;๗๐๐ บาท / ๑ บ่อ</span>
      </div>
      <div style="padding-left:4em;display:flex;justify-content:space-between;max-width:630px;margin-bottom:1px;">
        <div style="display:flex;align-items:center;white-space:nowrap;">
          ${chk(zone === 'out_20')}
          <span style="margin-left:6px;">เกิน ๑๐ กิโลเมตร แต่ไม่เกิน ๒๐ กิโลเมตร</span>
        </div>
        <span style="white-space:nowrap;">ครั้งละ ๑,๐๐๐ บาท / ๑ บ่อ</span>
      </div>
      <div style="padding-left:4em;display:flex;justify-content:space-between;max-width:630px;margin-bottom:2px;">
        <div style="display:flex;align-items:center;white-space:nowrap;">
          ${chk(zone === 'out_30')}
          <span style="margin-left:6px;">เกิน ๒๐ กิโลเมตร แต่ไม่เกิน ๓๐ กิโลเมตร</span>
        </div>
        <span style="white-space:nowrap;">ครั้งละ ๑,๓๐๐ บาท / ๑ บ่อ</span>
      </div>

      <div style="margin-bottom:4px;white-space:nowrap;">
        พร้อมคำขอนี้ ข้าพเจ้าได้แนบสำเนาบัตรประจำตัวประชาชน เพื่อเป็นหลักฐาน จำนวน ๑ ฉบับ
      </div>

      <!-- Signatures Row 1 -->
      <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
        <div style="width:46%;text-align:center;">
          <div style="margin-bottom:2px;">..........................................</div>
          <div>( ${signers.directorName || 'นางสาวปัทมาภรณ์ จันทร์แจ่ม'} )</div>
          <div>${signers.directorPos || signers.directorPosition || 'ผู้อำนวยการกองสาธารณสุขและสิ่งแวดล้อม'}</div>
        </div>

        <div style="width:54%;text-align:left;padding-left:5px;">
          <div style="text-align:center;">
            ลงชื่อ <span style="border-bottom:1px dotted #000;display:inline-block;text-align:center;min-width:130px;padding:0 2px;">&nbsp;</span> ผู้ขอรับบริการ
          </div>
          <div style="text-align:center;margin-top:1px;">
            ( ${citizenName ? citizenName : '...................................................'} )
          </div>
          <div style="margin-top:3px;padding-left:10px;font-weight:bold;white-space:nowrap;">
            ความคิดเห็นนายกเทศมนตรีตำบลบางเป้า/ผู้แทน
          </div>
          <div style="display:flex;align-items:center;padding-left:20px;margin-top:1px;">
            <span style="display:inline-flex;align-items:center;margin-right:20px;">
              ${chk(isApproved)} <span style="margin-left:4px;">อนุมัติ</span>
            </span>
            <span style="display:inline-flex;align-items:center;">
              ${chk(isRejected)} <span style="margin-left:4px;">ไม่อนุมัติ &nbsp;เพราะ......................</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Signatures Row 2 -->
      <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
        <div style="width:46%;text-align:center;">
          <div style="margin-bottom:2px;">..............................................</div>
          <div>( ${signers.clerkName || 'นายจตุพร ศรีสุวรรณ'} )</div>
          <div>${signers.clerkPos || 'ปลัดเทศบาล'}</div>
        </div>

        <div style="width:54%;text-align:center;padding-left:5px;">
          <div style="white-space:nowrap;">ลงชื่อ................................นายก ทต.บางเป้า/ผู้แทน</div>
          <div>( ${signers.actingMayorName || signers.mayorName || 'นายนิติธรรม ดำสุด'} )</div>
          <div>${signers.actingMayorPosition || signers.mayorPos || 'รองนายกเทศมนตรี ปฏิบัติราชการแทน'}</div>
          <div>${signers.actingMayorFor || 'นายกเทศมนตรีตำบลบางเป้า'}</div>
        </div>
      </div>

      <!-- Driver Section -->
      <div style="margin-bottom:3px;">
        <div style="font-weight:bold;">ผลการปฏิบัติงาน</div>
        <div style="display:flex;align-items:center;margin-top:1px;">
          ${chk(isDone)}
          <span style="margin-left:6px;">ดำเนินการแล้ว เมื่อวันที่</span>
          <span class="fill-dots" style="width:36px;margin:0 4px;">${isDone ? toThaiDigits(dParts.day) : ''}</span>
          <span>เดือน</span>
          <span class="fill-dots" style="width:110px;margin:0 4px;">${isDone ? dParts.month : ''}</span>
          <span>พ.ศ.</span>
          <span class="fill-dots" style="width:50px;margin-left:4px;">${isDone ? toThaiDigits(dParts.year) : ''}</span>
        </div>
        <div style="text-align:right;margin-right:20px;margin-top:1px;">
          ลงชื่อ..................................................พนักงานขับรถดูดสิ่งปฏิกูล
        </div>
        <div style="text-align:right;margin-right:75px;margin-top:1px;">
          ( ${driverName} )
        </div>
      </div>

      <!-- Bottom 2-Box Table -->
      <table style="width:100%;border-collapse:collapse;border:1.4px solid #000;margin-top:2px;font-size:12.2pt;line-height:1.2;">
        <tr>
          <td style="width:50%;border:1.4px solid #000;padding:3px 6px;vertical-align:top;">
            <div style="font-weight:bold;">บันทึกเจ้าหน้าที่ผู้รับคำขอ</div>
            <div style="padding-left:1em;">ได้รับคำร้องขอรับบริการกำจัดสิ่งปฏิกูล แล้ว</div>
            <div>เมื่อวันที่ <span style="display:inline-block;width:30px;border-bottom:1px dotted #000;text-align:center;">${toThaiDigits(dParts.day)}</span> เดือน <span style="display:inline-block;width:75px;border-bottom:1px dotted #000;text-align:center;">${dParts.month}</span> พ.ศ. <span style="display:inline-block;width:35px;border-bottom:1px dotted #000;text-align:center;">${toThaiDigits(dParts.year)}</span></div>
            <div style="text-align:center;margin-top:5px;white-space:nowrap;">ลงชื่อ.................................เจ้าหน้าที่</div>
            <div style="text-align:center;margin-top:1px;">( ${intakeOfficer} )</div>
          </td>
          <td style="width:50%;border:1.4px solid #000;padding:3px 6px;vertical-align:top;">
            <div style="font-weight:bold;">บันทึกเจ้าหน้าที่เก็บค่าธรรมเนียม</div>
            <div style="padding-left:1em;white-space:nowrap;">ได้รับค่าธรรมเนียม จำนวน <span style="display:inline-block;min-width:40px;border-bottom:1px dotted #000;text-align:center;">${feeAmount ? toThaiDigits(feeAmount) : '.........'}</span> บาท และออก </div>
            <div style="white-space:nowrap;">ใบเสร็จรับเงินแล้วเล่มที่ <span style="display:inline-block;min-width:30px;border-bottom:1px dotted #000;text-align:center;">${receiptBook !== '.......' ? toThaiDigits(receiptBook) : '.......'}</span> เลขที่ <span style="display:inline-block;min-width:30px;border-bottom:1px dotted #000;text-align:center;">${receiptNumber !== '.......' ? toThaiDigits(receiptNumber) : '.......'}</span></div>
            <div style="white-space:nowrap;">ลงวันที่ <span style="display:inline-block;min-width:70px;border-bottom:1px dotted #000;text-align:center;">${dParts.day ? `${toThaiDigits(dParts.day)} ${dParts.month} ${toThaiDigits(dParts.year)}` : '......................................'}</span> ให้ผู้ขอรับบริการเรียบร้อยแล้ว</div>
            <div style="text-align:center;margin-top:3px;white-space:nowrap;">ลงชื่อ......................................เจ้าพนักงานจัดเก็บรายได้</div>
            <div style="text-align:center;margin-top:1px;">( ${intakeOfficer} )</div>
          </td>
        </tr>
      </table>
    `;
  } else {
    // General Petition
    const subject = form.subject || p.title || 'คำร้องทั่วไปด้านสาธารณสุขและสิ่งแวดล้อม';
    const purpose = form.purpose || p.description || '-';

    bodyContent = `
      <div style="text-align:center;font-size:16.5pt;font-weight:bold;text-decoration:underline;margin-bottom:6px;">
        แบบคำร้องทั่วไป
      </div>

      <div style="display:flex;justify-content:flex-end;margin-bottom:4px;">
        <div style="width:48%;text-align:left;">
          <div style="display:flex;align-items:baseline;white-space:nowrap;">
            <span>เขียนที่</span>
            <span class="fill-dots" style="flex:1;margin-left:4px;">สำนักงานเทศบาลตำบลบางเป้า</span>
          </div>
          <div style="display:flex;align-items:baseline;white-space:nowrap;margin-top:2px;">
            <span style="width:2em;"></span>
            <span>วันที่</span>
            <span class="fill-dots" style="width:36px;margin:0 4px;">${toThaiDigits(dParts.day)}</span>
            <span>เดือน</span>
            <span class="fill-dots" style="flex:1;margin:0 4px;">${dParts.month}</span>
            <span>พ.ศ.</span>
            <span class="fill-dots" style="width:45px;margin-left:4px;">${toThaiDigits(dParts.year)}</span>
          </div>
        </div>
      </div>

      <div style="display:flex;align-items:baseline;white-space:nowrap;margin-bottom:3px;">
        <strong>เรื่อง</strong>
        <span class="fill-dots" style="flex:1;margin-left:6px;text-align:left;padding-left:8px;">${subject}</span>
      </div>

      <div style="text-align:left;margin-bottom:3px;">
        <strong>เรียน</strong>&nbsp;&nbsp;&nbsp;&nbsp;นายกเทศมนตรีตำบลบางเป้า
      </div>

      <div style="display:flex;align-items:baseline;white-space:nowrap;margin-bottom:2px;">
        <span style="width:2.5em;"></span>
        <span>ข้าพเจ้า (นาย/นาง/นางสาว)</span>
        <span class="fill-dots" style="flex:1;">${citizenName}</span>
        <span>อยู่บ้านเลขที่</span>
        <span class="fill-dots" style="width:90px;margin-left:4px;">${toThaiDigits(houseNo)}</span>
      </div>
      <div style="display:flex;align-items:baseline;white-space:nowrap;margin-bottom:2px;">
        <span>ตรอก/ซอย</span>
        <span class="fill-dots" style="flex:1;">${soi}</span>
        <span>ถนน</span>
        <span class="fill-dots" style="flex:1.4;">${road}</span>
        <span>หมู่ที่</span>
        <span class="fill-dots" style="width:60px;margin:0 4px;">${toThaiDigits(moo)}</span>
        <span>ตำบล/แขวง</span>
        <span class="fill-dots" style="flex:1;">${subdistrict}</span>
      </div>
      <div style="display:flex;align-items:baseline;white-space:nowrap;margin-bottom:3px;">
        <span>อำเภอ/เขต</span>
        <span class="fill-dots" style="flex:1;">${district}</span>
        <span>จังหวัด</span>
        <span class="fill-dots" style="flex:1;">${province}</span>
        <span>โทรศัพท์</span>
        <span class="fill-dots" style="flex:1.3;">${toThaiDigits(phone)}</span>
      </div>

      <div style="margin-bottom:3px;">
        ขอยื่นคำร้องต่อนายกเทศมนตรีตำบลบางเป้า ดังต่อไปนี้
      </div>

      <div style="display:flex;align-items:baseline;white-space:nowrap;margin-bottom:4px;">
        <span style="width:2.5em;"></span>
        <span>ข้าพเจ้ามีความประสงค์</span>
        <span class="fill-dots" style="flex:1;margin-left:4px;text-align:left;padding-left:8px;">${purpose}</span>
      </div>

      <div style="padding-left:2.5em;margin-bottom:12px;">
        จึงเรียนมาเพื่อโปรดทราบและพิจารณาดำเนินการต่อไป
      </div>

      <!-- Signatures Row 1 -->
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <div style="width:46%;text-align:left;padding-left:10px;">
          <div>เรียนนายกเทศมนตรีตำบลบางเป้า</div>
          <div style="padding-left:1.5em;">- เพื่อโปรดทราบและพิจารณา</div>
          <div style="margin-top:8px;text-align:center;">
            (ลงชื่อ).................................................
          </div>
          <div style="text-align:center;margin-top:1px;">
            ( ${signers.directorName || 'นางสาวปัทมาภรณ์ จันทร์แจ่ม'} )
          </div>
          <div style="text-align:center;font-size:12.5pt;">
            ${signers.directorPos || signers.directorPosition || 'ผู้อำนวยการกองสาธารณสุขและสิ่งแวดล้อม'}
          </div>
        </div>

        <div style="width:54%;text-align:center;">
          <div>ลงชื่อ <span style="border-bottom:1px dotted #000;display:inline-block;text-align:center;min-width:130px;padding:0 2px;">&nbsp;</span> ผู้ยื่นคำร้อง</div>
          <div style="margin-top:1px;">( ${citizenName ? citizenName : '...................................................'} )</div>
          <div style="margin-top:6px;text-align:left;padding-left:15px;font-weight:bold;">
            ความคิดเห็นนายกเทศมนตรีตำบลบางเป้า/ผู้แทน
          </div>
          <div style="display:flex;align-items:center;padding-left:20px;margin-top:1px;">
            <span style="display:inline-flex;align-items:center;margin-right:20px;">
              ${chk(isApproved)} <span style="margin-left:4px;">อนุมัติ</span>
            </span>
            <span style="display:inline-flex;align-items:center;">
              ${chk(isRejected)} <span style="margin-left:4px;">ไม่อนุมัติ &nbsp;เพราะ......................</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Signatures Row 2 -->
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
        <div style="width:46%;text-align:center;">
          <div>(ลงชื่อ).................................................</div>
          <div style="margin-top:1px;">( ${signers.clerkName || 'นายจตุพร ศรีสุวรรณ'} )</div>
          <div>${signers.clerkPos || 'ปลัดเทศบาล'}</div>
        </div>

        <div style="width:54%;text-align:center;">
          <div>(ลงชื่อ).................................................</div>
          <div style="margin-top:1px;">( ${signers.actingMayorName || signers.mayorName || 'นายนิติธรรม ดำสุด'} )</div>
          <div>${signers.actingMayorPosition || signers.mayorPos || 'รองนายกเทศมนตรี ปฏิบัติราชการแทน'}</div>
          <div>${signers.actingMayorFor || 'นายกเทศมนตรีตำบลบางเป้า'}</div>
        </div>
      </div>

      <!-- Bottom Table: 2 Boxes -->
      <table style="width:100%;border-collapse:collapse;border:1.4px solid #000;margin-top:4px;font-size:12.2pt;line-height:1.2;">
        <tr>
          <td style="width:50%;border:1.4px solid #000;padding:4px 8px;vertical-align:top;">
            <div style="font-weight:bold;margin-bottom:2px;">บันทึกเจ้าหน้าที่ผู้รับคำขอ</div>
            <div>ได้รับคำร้องเรื่อง <span style="border-bottom:1px dotted #000;">${subject}</span> แล้ว</div>
            <div>เมื่อวันที่ <span style="display:inline-block;width:30px;border-bottom:1px dotted #000;text-align:center;">${toThaiDigits(dParts.day)}</span> เดือน <span style="display:inline-block;width:75px;border-bottom:1px dotted #000;text-align:center;">${dParts.month}</span> พ.ศ. <span style="display:inline-block;width:35px;border-bottom:1px dotted #000;text-align:center;">${toThaiDigits(dParts.year)}</span></div>
            <div style="margin-top:8px;text-align:center;">
              ลงชื่อ.........................................................เจ้าหน้าที่
            </div>
            <div style="text-align:center;margin-top:1px;">
              ( ${intakeOfficer} )
            </div>
          </td>

          <td style="width:50%;border:1.4px solid #000;padding:4px 8px;vertical-align:top;">
            <div style="font-weight:bold;margin-bottom:2px;">ผลการปฏิบัติงาน</div>
            <div style="display:flex;align-items:center;margin-top:2px;">
              ${chk(isDone)}
              <span style="margin-left:6px;">ดำเนินการแล้ว เมื่อวันที่ <span style="display:inline-block;width:30px;border-bottom:1px dotted #000;text-align:center;">${isDone ? toThaiDigits(dParts.day) : ''}</span> เดือน <span style="display:inline-block;width:75px;border-bottom:1px dotted #000;text-align:center;">${isDone ? dParts.month : ''}</span> พ.ศ. <span style="display:inline-block;width:35px;border-bottom:1px dotted #000;text-align:center;">${isDone ? toThaiDigits(dParts.year) : ''}</span></span>
            </div>
            <div style="display:flex;align-items:center;margin-top:2px;">
              ${chk(!isDone && !isRejected)}
              <span style="margin-left:6px;">รอดำเนินการ เนื่องจาก............................................</span>
            </div>
            <div style="margin-top:6px;text-align:center;">
              ลงชื่อ.............................................ตำแหน่ง.............................
            </div>
            <div style="text-align:center;margin-top:1px;">
              ( ${p.assignedOfficer || intakeOfficer} )
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

  return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8"/>
<title>${esc(p.title || 'แบบคำร้อง')}</title>
<style>
  @font-face {
    font-family: 'TH SarabunIT๙';
    src: url('data:font/woff2;base64,${SARABUN_WOFF2_BASE64}') format('woff2');
    font-weight: normal;
    font-style: normal;
  }
  @font-face {
    font-family: 'TH Sarabun New';
    src: url('data:font/woff2;base64,${SARABUN_WOFF2_BASE64}') format('woff2');
    font-weight: normal;
    font-style: normal;
  }
  @font-face {
    font-family: 'Sarabun';
    src: url('data:font/woff2;base64,${SARABUN_WOFF2_BASE64}') format('woff2');
    font-weight: normal;
    font-style: normal;
  }

  @page {
    size: A4 portrait;
    margin: 8mm 10mm 6mm 12mm;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0;
    background: #fff;
    font-family: 'TH SarabunIT๙', 'TH Sarabun New', 'Sarabun', sans-serif;
    color: #000;
    -webkit-font-smoothing: antialiased;
  }
  .page {
    width: 210mm;
    min-height: 297mm;
    padding: 6mm 10mm 6mm 12mm;
    margin: 0 auto;
    background: #fff;
    box-sizing: border-box;
    font-size: 12.4pt;
    line-height: 1.22;
    letter-spacing: -0.25px;
    position: relative;
  }
  .fill-dots {
    border-bottom: 1px dotted #000;
    text-align: center;
    font-weight: normal;
    padding: 0 2px;
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
    font-family: 'Sarabun', 'TH Sarabun New', sans-serif;
  }
  .no-print button.gray { background: #475569; }
  @media print {
    body { background: #fff; }
    .page {
      margin: 0;
      padding: 6mm 10mm 6mm 12mm;
      width: 100%;
      height: 100%;
      min-height: auto;
      max-height: none;
      box-shadow: none;
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
      p.citizenName,
      p.citizenIdCard || '',
      p.phone,
      p.address,
      resolveFormType(p) === 'sewage' ? p.description : `${f.subject || p.title} : ${f.purpose || p.description}`,
      f.feeAmount ?? '',
      stageLabel[normalizeStage(p.status)] || p.status,
      p.assignedOfficer || '-',
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
  const type = resolveFormType(p) === 'sewage' ? 'คำร้องขอสูบสิ่งปฏิกูล' : 'คำร้องทั่วไป';
  const docNo = p.form?.docNo || p.trackingCode || 'ร่าง';
  const name = (p.citizenName || 'ผู้ยื่น').replace(/\s+/g, '_');
  return `${type}_${docNo}_${name}`;
};
