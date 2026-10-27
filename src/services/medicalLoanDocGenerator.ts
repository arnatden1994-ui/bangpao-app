import { EquipmentLoan, SignerSettings, DEFAULT_SIGNER_SETTINGS } from '../types/index.ts';
import {
  MED_LOAN_DOCX_STATIC_ENTRIES,
  MED_LOAN_DOCUMENT_XML_BASE,
  MED_LOAN_IMG_LEFT,
  MED_LOAN_IMG_CENTER,
  MED_LOAN_IMG_RIGHT,
  MED_LOAN_IMG_BOX,
  MED_LOAN_IMG_BOX_CHECKED,
} from '../data/medLoanTemplate.ts';

export interface ParsedThaiDate {
  day: string;
  month: string;
  year: string;
}

export function parseThaiLoanDate(dateStr?: string): ParsedThaiDate {
  const thaiMonths = [
    '',
    'มกราคม',
    'กุมภาพันธ์',
    'มีนาคม',
    'เมษายน',
    'พฤษภาคม',
    'มิถุนายน',
    'กรกฎาคม',
    'สิงหาคม',
    'กันยายน',
    'ตุลาคม',
    'พฤศจิกายน',
    'ธันวาคม',
  ];

  if (!dateStr || dateStr === '-' || dateStr === '.......') {
    const now = new Date();
    return {
      day: String(now.getDate()),
      month: thaiMonths[now.getMonth() + 1],
      year: String(now.getFullYear() + 543),
    };
  }

  // 1. Try ISO or YYYY-MM-DD
  const ymdMatch = dateStr.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    const y = parseInt(ymdMatch[1], 10);
    const m = parseInt(ymdMatch[2], 10);
    const d = parseInt(ymdMatch[3], 10);
    return {
      day: String(d),
      month: thaiMonths[m] || '',
      year: String(y > 2400 ? y : y + 543),
    };
  }

  // 2. Try DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = dateStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10);
    const y = parseInt(dmyMatch[3], 10);
    return {
      day: String(d),
      month: thaiMonths[m] || '',
      year: String(y > 2400 ? y : y + 543),
    };
  }

  // 3. Try "D MMMM YYYY" Thai string
  for (let i = 1; i <= 12; i++) {
    if (dateStr.includes(thaiMonths[i])) {
      const parts = dateStr.split(thaiMonths[i]);
      const day = parts[0].replace(/\D/g, '').trim() || '1';
      const year = parts[1].replace(/\D/g, '').trim() || '2569';
      return {
        day,
        month: thaiMonths[i],
        year,
      };
    }
  }

  const now = new Date();
  return {
    day: String(now.getDate()),
    month: thaiMonths[now.getMonth() + 1],
    year: String(now.getFullYear() + 543),
  };
}

export function parseThaiNameParts(name?: string) {
  if (!name) return { prefix: '', first: '', last: '', full: '' };
  const trimmed = name.trim();
  const m = trimmed.match(/^(นาย|นางสาว|นาง|ด\.ช\.|ด\.ญ\.|น\.ส\.|คุณ)\s*(.*)$/);
  let prefix = '';
  let rest = trimmed;
  if (m) {
    prefix = m[1];
    rest = m[2].trim();
  }
  const parts = rest.split(/\s+/);
  const first = parts[0] || '';
  const last = parts.slice(1).join(' ') || '';
  return { prefix, first, last, full: trimmed };
}

export function parseThaiAddressParts(addr?: string) {
  if (!addr) {
    return {
      houseNo: '',
      moo: '',
      soi: '',
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
    if (/^[0-9]+(\/[0-9]+)?$/.test(firstToken)) {
      houseNo = firstToken;
    }
  }

  // Extract soi/road
  let soi = '';
  const soiMatch = trimmed.match(/(?:ซอย|ตรอก|ถนน)\s*([^\s,]+)/);
  if (soiMatch) {
    soi = soiMatch[1];
  }

  // Extract subdistrict (ตำบล / ต.)
  let subdistrict = 'บางเป้า';
  const subMatch = trimmed.match(/(?:ตำบล|ต\.)\s*([^\s,]+)/);
  if (subMatch) {
    subdistrict = subMatch[1];
  }

  // Extract district (อำเภอ / อ.)
  let district = 'กันตัง';
  const distMatch = trimmed.match(/(?:อำเภอ|อ\.)\s*([^\s,]+)/);
  if (distMatch) {
    district = distMatch[1];
  }

  // Extract province (จังหวัด / จ.)
  let province = 'ตรัง';
  const provMatch = trimmed.match(/(?:จังหวัด|จ\.)\s*([^\s,]+)/);
  if (provMatch) {
    province = provMatch[1];
  }

  return {
    houseNo: houseNo || trimmed.split(' ')[0] || '',
    moo: moo || '',
    soi: soi || '-',
    subdistrict,
    district,
    province,
    full: trimmed,
  };
}

export function getEquipmentChecklist(loan: EquipmentLoan) {
  const eqName = ((loan.itemsSummary || '') + ' ' + (loan.equipmentName || '')).toLowerCase();
  const eqCat = (loan.equipmentCategory || '').toLowerCase();
  const code = loan.equipmentCode || 'EQ-001';

  const isBed = eqName.includes('เตียง') || eqCat === 'bed';
  const isOxygen = eqName.includes('ออกซิเจน') || eqCat === 'oxygen_concentrator';
  const isWheelchair =
    eqName.includes('รถนั่ง') ||
    eqName.includes('วีลแชร์') ||
    eqName.includes('wheelchair') ||
    eqName.includes('รถเข็น') ||
    eqCat === 'wheelchair';
  const isSuction = eqName.includes('เสมหะ') || eqName.includes('suction') || eqCat === 'suction_machine';
  const isAirMattress = eqName.includes('ที่นอน') || eqName.includes('mattress') || eqCat === 'air_mattress';

  const hasOtherKeyword =
    eqName.includes('ไม้เท้า') ||
    eqName.includes('ไม้ค้ำ') ||
    eqName.includes('เก้าอี้นั่งถ่าย') ||
    eqName.includes('วอล์คเกอร์') ||
    eqCat === 'other';
  const isOther = hasOtherKeyword || (!isBed && !isOxygen && !isWheelchair && !isSuction && !isAirMattress);

  return {
    isBed,
    isOxygen,
    isWheelchair,
    isSuction,
    isAirMattress,
    isOther,
    code,
  };
}

// CRC-32 Lookup Table for fast OpenXML ZIP building
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
 * Pure-JS synchronous RFC 1951 compliant raw DEFLATE wrapper.
 * Stored blocks (BTYPE=00) decompresses natively in Microsoft Word, Windows Explorer, etc.
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
 * Generates genuine OpenXML .docx bytes based on the official template
 * "บันทึกข้อตกลงศูนย์สาธิตและยืมอุปกรณ์(แก้).docx"
 * with ALL form data dynamically populated into Microsoft Word XML runs.
 */
export function generateOfficialMedicalLoanDocxBytes(
  loan: EquipmentLoan,
  signers?: SignerSettings
): Uint8Array {
  const activeSigners = signers || DEFAULT_SIGNER_SETTINGS;
  const dateObj = parseThaiLoanDate(loan.borrowDate || loan.loanDate || loan.createdAt);
  const chk = getEquipmentChecklist(loan);

  const docNo = loan.contractNumber || loan.docNo || loan.loanCode || '';
  const borrowerRaw = loan.borrowerName || '';
  const bParts = parseThaiNameParts(borrowerRaw);
  const bAddr = parseThaiAddressParts(loan.borrowerAddress || loan.address);
  const phone = loan.borrowerPhone || loan.phone || '';

  const patientRaw = loan.patientName || borrowerRaw;
  const pParts = parseThaiNameParts(patientRaw);
  const pAddr = parseThaiAddressParts(loan.patientAddress || loan.address || loan.borrowerAddress);
  const relation = loan.relationshipWithPatient || loan.borrowerRelation || 'ตนเอง';

  const mayorName = activeSigners.actingMayorName || 'นายนิติธรรม ดำสุด';
  const mayorPos = activeSigners.actingMayorPosition || 'รองนายกเทศมนตรี ปฏิบัติราชการแทน';
  const mayorFor = activeSigners.actingMayorFor || 'นายกเทศมนตรีตำบลบางเป้า';

  // Format borrower and patient names
  const bNameFormatted = bParts.first
    ? `${bParts.prefix ? bParts.prefix + ' ' : ''}${bParts.first}  นามสกุล  ${bParts.last || '-'}`
    : borrowerRaw;

  const pNameFormatted = pParts.first
    ? `${pParts.prefix ? pParts.prefix + ' ' : ''}${pParts.first}  นามสกุล  ${pParts.last || '-'}`
    : patientRaw;

  // Start with template base XML from บันทึกข้อตกลงศูนย์สาธิตและยืมอุปกรณ์(แก้.docx
  let docXml = MED_LOAN_DOCUMENT_XML_BASE;

  // 1. Doc Number (P6): reduce spaces between title and doc number to prevent long numbers from wrapping
  docXml = docXml
    .replace('<w:t xml:space="preserve">               </w:t>', '<w:t xml:space="preserve">   </w:t>')
    .replace('<w:t xml:space="preserve">  </w:t>', '<w:t></w:t>')
    .replace('<w:t xml:space="preserve">       </w:t>', '<w:t xml:space="preserve"> </w:t>')
    .replace(
      /<w:t>เลขที่\.\.\.\.\.\.\.\.\.\.\.<\/w:t>[\s\S]*?<w:t>\.\.\.\.\.\.\.<\/w:t>/,
      `<w:t xml:space="preserve">เลขที่  ${docNo || '.......................'}</w:t>`
    );

  // 2. Date (P7)
  docXml = docXml.replace(
    '<w:t>วันที่...........เดือน...................................พ.ศ................</w:t>',
    `<w:t xml:space="preserve">วันที่  ${dateObj.day}  เดือน  ${dateObj.month}  พ.ศ.  ${dateObj.year}</w:t>`
  );

  // 3. Borrower Line 1 (P8)
  docXml = docXml.replace(
    '<w:t>นาง/นางสาว)............................................นามสกุล.............................................</w:t>',
    `<w:t xml:space="preserve">นาง/นางสาว)  ${bNameFormatted}</w:t>`
  );
  docXml = docXml.replace(
    /<w:t>\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.<\/w:t>[\s\S]*?<w:t>\.\.\.\.\.\.\.\.\.<\/w:t>/,
    `<w:t xml:space="preserve">  ${bAddr.houseNo || '-'}</w:t>`
  );

  // Helper function for Address Line 2 (fits strictly on single line with perfect dotted tab stops)
  function createAddressLine2Xml(paraId: string, moo: string, soi: string, subdistrict: string, district: string) {
    return `<w:p w14:paraId="${paraId}" w14:textId="29027FE7" w:rsidR="00355F37" w:rsidRDefault="00906EB9" w:rsidP="00355F37">
<w:pPr>
<w:tabs>
<w:tab w:val="left" w:pos="1200"/>
<w:tab w:val="left" w:pos="4200"/>
<w:tab w:val="left" w:pos="6600"/>
<w:tab w:val="left" w:pos="9400"/>
</w:tabs>
<w:spacing w:after="0"/>
<w:ind w:left="-567" w:right="-23"/>
<w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="32"/><w:szCs w:val="32"/><w:u w:val="dotted"/></w:rPr>
</w:pPr>
<w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="32"/><w:szCs w:val="32"/><w:cs/></w:rPr><w:t>หมู่ที่</w:t></w:r>
<w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="32"/><w:szCs w:val="32"/><w:u w:val="dotted"/><w:cs/></w:rPr><w:t xml:space="preserve"> ${moo || '-'} </w:t><w:tab/></w:r>
<w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙" w:hint="cs"/><w:sz w:val="32"/><w:szCs w:val="32"/><w:cs/></w:rPr><w:t>(ถนน/ตรอก/ซอย)</w:t></w:r>
<w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="32"/><w:szCs w:val="32"/><w:u w:val="dotted"/><w:cs/></w:rPr><w:t xml:space="preserve"> ${soi || '-'} </w:t><w:tab/></w:r>
<w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="32"/><w:szCs w:val="32"/><w:cs/></w:rPr><w:t>ตำบล</w:t></w:r>
<w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="32"/><w:szCs w:val="32"/><w:u w:val="dotted"/><w:cs/></w:rPr><w:t xml:space="preserve"> ${subdistrict || 'บางเป้า'} </w:t><w:tab/></w:r>
<w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="32"/><w:szCs w:val="32"/><w:cs/></w:rPr><w:t>อำเภอ</w:t></w:r>
<w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="32"/><w:szCs w:val="32"/><w:u w:val="dotted"/><w:cs/></w:rPr><w:t xml:space="preserve"> ${district || 'กันตัง'} </w:t><w:tab/></w:r>
</w:p>`;
  }

  // 4. Borrower Line 2 (P9)
  docXml = docXml.replace(
    /(<w:p[^>]*w14:paraId="1A8CDCE2"[\s\S]*?<\/w:p>)/,
    createAddressLine2Xml('1A8CDCE2', bAddr.moo, bAddr.soi, bAddr.subdistrict, bAddr.district)
  );

  // 5. Borrower Line 3 (P10)
  function createAddressLine3BorrowerXml(paraId: string, province: string, phoneStr: string) {
    return `<w:p w14:paraId="${paraId}" w14:textId="064F8215" w:rsidR="00906EB9" w:rsidRPr="00355F37" w:rsidRDefault="0040420B" w:rsidP="00355F37">
<w:pPr>
<w:tabs>
<w:tab w:val="left" w:pos="3828"/>
<w:tab w:val="left" w:pos="9498"/>
</w:tabs>
<w:spacing w:after="0"/>
<w:ind w:left="-567" w:right="-23"/>
<w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="32"/><w:szCs w:val="32"/><w:u w:val="dotted"/></w:rPr>
</w:pPr>
<w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="32"/><w:szCs w:val="32"/><w:cs/></w:rPr><w:t>จังหวัด</w:t></w:r>
<w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="32"/><w:szCs w:val="32"/><w:u w:val="dotted"/><w:cs/></w:rPr><w:t xml:space="preserve"> ${province || 'ตรัง'} </w:t><w:tab/></w:r>
<w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="32"/><w:szCs w:val="32"/><w:cs/></w:rPr><w:t>เบอร์โทรศัพท์</w:t></w:r>
<w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="32"/><w:szCs w:val="32"/><w:u w:val="dotted"/><w:cs/></w:rPr><w:t xml:space="preserve"> ${phoneStr || '-'} </w:t><w:tab/></w:r>
</w:p>`;
  }
  docXml = docXml.replace(
    /(<w:p[^>]*w14:paraId="4FA3EA01"[\s\S]*?<\/w:p>)/,
    createAddressLine3BorrowerXml('4FA3EA01', bAddr.province, phone)
  );

  // 6. Patient Line 1 (P11)
  docXml = docXml.replace(
    /(<w:p[^>]*w14:paraId="4B999B67"[\s\S]*?<\/w:p>)/,
    (match) => {
      return match
        .replace(
          '<w:t>นาง/นางสาว)............................................นามสกุล.............................................</w:t>',
          `<w:t xml:space="preserve">นาง/นางสาว)  ${pNameFormatted}</w:t>`
        )
        .replace(
          /<w:t>\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.<\/w:t>[\s\S]*?<w:t>\.<\/w:t>/,
          `<w:t xml:space="preserve">  ${pAddr.houseNo || '-'}</w:t>`
        );
    }
  );

  // 7. Patient Line 2 (P12)
  docXml = docXml.replace(
    /(<w:p[^>]*w14:paraId="3BB9CD6F"[\s\S]*?<\/w:p>)/,
    createAddressLine2Xml('3BB9CD6F', pAddr.moo, pAddr.soi, pAddr.subdistrict, pAddr.district)
  );

  // 8. Patient Line 3 (P13)
  function createAddressLine3PatientXml(paraId: string, province: string, rel: string) {
    return `<w:p w14:paraId="${paraId}" w14:textId="5815094C" w:rsidR="0040420B" w:rsidRDefault="00355F37" w:rsidP="00355F37">
<w:pPr>
<w:tabs>
<w:tab w:val="left" w:pos="3828"/>
<w:tab w:val="left" w:pos="9498"/>
</w:tabs>
<w:ind w:left="-567" w:right="-613"/>
<w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="32"/><w:szCs w:val="32"/><w:u w:val="dotted"/></w:rPr>
</w:pPr>
<w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="32"/><w:szCs w:val="32"/><w:cs/></w:rPr><w:t>จังหวัด</w:t></w:r>
<w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="32"/><w:szCs w:val="32"/><w:u w:val="dotted"/><w:cs/></w:rPr><w:t xml:space="preserve"> ${province || 'ตรัง'} </w:t><w:tab/></w:r>
<w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="32"/><w:szCs w:val="32"/><w:cs/></w:rPr><w:t>มีความสัมพันธ์กับผู้ป่วย</w:t></w:r>
<w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="32"/><w:szCs w:val="32"/><w:u w:val="dotted"/><w:cs/></w:rPr><w:t xml:space="preserve"> ${rel || 'ตนเอง'} </w:t><w:tab/></w:r>
</w:p>`;
  }
  docXml = docXml.replace(
    /(<w:p[^>]*w14:paraId="1E824765"[\s\S]*?<\/w:p>)/,
    createAddressLine3PatientXml('1E824765', pAddr.province, relation)
  );

  // 9. Equipment Checklist (All 6 rows in Table + Floating Checkbox Anchors)
  // Row 0: bed -> AnchorId 2416939B
  // Row 1: oxygen -> AnchorId 7E69D3C8
  // Row 2: wheelchair -> AnchorId 3D95DEDF
  // Row 3: suction -> AnchorId 786F3857
  // Row 4: air mattress -> AnchorId 70C5236F
  // Row 5: other -> AnchorId 0B96788E
  let targetRow = 0;
  let targetAnchorId = '2416939B';

  if (chk.isBed) {
    targetRow = 0;
    targetAnchorId = '2416939B';
  } else if (chk.isOxygen) {
    targetRow = 1;
    targetAnchorId = '7E69D3C8';
  } else if (chk.isWheelchair) {
    targetRow = 2;
    targetAnchorId = '3D95DEDF';
  } else if (chk.isSuction) {
    targetRow = 3;
    targetAnchorId = '786F3857';
  } else if (chk.isAirMattress) {
    targetRow = 4;
    targetAnchorId = '70C5236F';
  } else {
    targetRow = 5;
    targetAnchorId = '0B96788E';
  }

  // Check the corresponding checkbox (replace rId8 with rId9)
  docXml = docXml.replace(
    new RegExp(`(<wp:anchor[^>]*wp14:anchorId="${targetAnchorId}"[\\s\\S]*?r:embed=")rId8(")`),
    '$1rId9$2'
  );

  // Update table row with quantity and asset code
  docXml = docXml.replace(/(<w:tbl[\s\S]*?<\/w:tbl>)/, (tblXml) => {
    const rows = tblXml.split('</w:tr>');
    if (rows[targetRow]) {
      if (targetRow === 5 && (loan.equipmentName || chk.isOther)) {
        rows[targetRow] = rows[targetRow].replace(
          '<w:t>อื่นๆ ระบุ</w:t>',
          `<w:t xml:space="preserve">อื่นๆ ระบุ  ${loan.equipmentName || ''}</w:t>`
        );
      }
      // Cell 2: Quantity
      rows[targetRow] = rows[targetRow].replace(
        /(<w:tc><w:tcPr><w:tcW w:w="561"[\s\S]*?<w:p[^>]*><w:pPr>[\s\S]*?<\/w:pPr>)(<\/w:p><\/w:tc>)/,
        `$1<w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="32"/><w:szCs w:val="32"/><w:jc w:val="center"/><w:cs/></w:rPr><w:t>  1</w:t></w:r>$2`
      );
      // Cell 5: Asset Code
      rows[targetRow] = rows[targetRow].replace(
        /(<w:tc><w:tcPr><w:tcW w:w="1926"[\s\S]*?<w:p[^>]*><w:pPr>[\s\S]*?<\/w:pPr>)(<\/w:p><\/w:tc>)/,
        `$1<w:r><w:rPr><w:rFonts w:ascii="TH SarabunIT๙" w:hAnsi="TH SarabunIT๙" w:cs="TH SarabunIT๙"/><w:sz w:val="32"/><w:szCs w:val="32"/><w:cs/></w:rPr><w:t>  ${chk.code || '-'}</w:t></w:r>$2`
      );
    }
    return rows.join('</w:tr>');
  });

  // 10. Borrower Signatures (P68, P69)
  docXml = docXml.replace(
    '<w:t>(.................................................)                                         (.......................................</w:t>',
    `<w:t xml:space="preserve">(  ${borrowerRaw || '.................................................'}  )                                         (.......................................</w:t>`
  );
  docXml = docXml.replace(
    '<w:t>วันที่.....................................................                                   วันที่......................................................</w:t>',
    `<w:t xml:space="preserve">วันที่  ${dateObj.day} ${dateObj.month} ${dateObj.year}                                   วันที่......................................................</w:t>`
  );

  // 11. Approval Checkmark (P70)
  const isApproved =
    loan.status === 'approved' ||
    loan.status === 'borrowed' ||
    loan.status === 'returned' ||
    !!loan.approvedBy;
  if (!isApproved && loan.status === 'overdue') {
    // Check "ไม่อนุมัติ" instead (Anchor 9: 4056AB8D)
    docXml = docXml.replace(
      /(<wp:anchor[^>]*wp14:anchorId="5E11F256"[\s\S]*?r:embed=")rId9(")/,
      '$1rId8$2'
    );
  }

  // 12. Mayor Name & Positions (P74, P75, P76)
  if (mayorName && mayorName !== 'นายนิติธรรม ดำสุด') {
    const cleanMayor = mayorName.replace(/^(นาย|นางสาว|นาง)\s*/, '');
    docXml = docXml.replace('<w:t>นิติธรรม ดำสุด</w:t>', `<w:t>${cleanMayor}</w:t>`);
  }
  if (mayorPos && mayorPos !== 'รองนายกเทศมนตรี ปฏิบัติราชการแทน') {
    docXml = docXml.replace('รองนายกเทศมนตรี ปฏิบัติราชการแทน  ', `${mayorPos}  `);
  }
  if (mayorFor && mayorFor !== 'นายกเทศมนตรีตำบลบางเป้า') {
    docXml = docXml.replace('นายกเทศมนตรีตำบลบางเป้า', `${mayorFor}`);
  }

  // 13. Return Section Checkmarks (P80, P81)
  if (loan.status === 'returned') {
    if (loan.returnCondition === 'damaged') {
      // Check Anchor 11 (291F34D7) instead of Anchor 12
      docXml = docXml.replace(
        /(<wp:anchor[^>]*wp14:anchorId="719C1D76"[\s\S]*?r:embed=")rId9(")/,
        '$1rId8$2'
      );
      docXml = docXml.replace(
        /(<wp:anchor[^>]*wp14:anchorId="291F34D7"[\s\S]*?r:embed=")rId8(")/,
        '$1rId9$2'
      );
    }
  }

  // Build the complete genuine OpenXML ZIP binary
  const encoder = new TextEncoder();
  const docXmlBytes = encoder.encode(docXml);
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

  const allEntries: ZipPart[] = MED_LOAN_DOCX_STATIC_ENTRIES.map((e) => ({
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

/**
 * Download genuine Microsoft Word .docx file directly to user's computer.
 */
export function exportOfficialMedicalLoanDocx(
  loan: EquipmentLoan,
  signers?: SignerSettings,
  customFilename?: string
): void {
  const bytes = generateOfficialMedicalLoanDocxBytes(loan, signers);
  const blob = new Blob([bytes as unknown as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const docNo = loan.contractNumber || loan.docNo || loan.loanCode || 'ขอยืม';
  const borrowerName = (loan.borrowerName || 'ผู้ยืม').replace(/\s+/g, '_');
  const filename = customFilename || `บันทึกข้อตกลงศูนย์สาธิตและยืมอุปกรณ์_${docNo}_${borrowerName}.docx`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Open official 2-Page A4 Contract in clean dedicated window and trigger system print dialog immediately.
 */
export function openOfficialMedicalLoanPrintWindow(
  loan: EquipmentLoan,
  signers?: SignerSettings
): void {
  const html = generateOfficialMedicalLoanHtml(loan, signers);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 450);
  }
}

/**
 * Generate 100% exact 2-PAGE A4 Official Medical Equipment Loan Contract HTML
 * Perfectly matching the official template "บันทึกข้อตกลงศูนย์สาธิตและยืมอุปกรณ์(แก้).docx"
 * with page borders, TH SarabunIT๙ font, 18pt title, 16pt body, and exact checkbox states.
 */
export function generateOfficialMedicalLoanHtml(
  loan: EquipmentLoan,
  signers?: SignerSettings
): string {
  const activeSigners = signers || DEFAULT_SIGNER_SETTINGS;
  const dateObj = parseThaiLoanDate(loan.borrowDate || loan.loanDate || loan.createdAt);
  const chk = getEquipmentChecklist(loan);

  const docNo = loan.contractNumber || loan.docNo || loan.loanCode || '';
  const borrowerName = loan.borrowerName || '';
  const bNameParts = parseThaiNameParts(borrowerName);
  const bAddr = parseThaiAddressParts(loan.borrowerAddress || loan.address);
  const phone = loan.borrowerPhone || loan.phone || '';

  const patientName = loan.patientName || borrowerName;
  const pNameParts = parseThaiNameParts(patientName);
  const pAddr = parseThaiAddressParts(loan.patientAddress || loan.address || loan.borrowerAddress);
  const relation = loan.relationshipWithPatient || loan.borrowerRelation || 'ตนเอง';

  const mayorName = activeSigners.actingMayorName || 'นายนิติธรรม ดำสุด';
  const mayorPos = activeSigners.actingMayorPosition || 'รองนายกเทศมนตรี ปฏิบัติราชการแทน';
  const mayorFor = activeSigners.actingMayorFor || 'นายกเทศมนตรีตำบลบางเป้า';

  const isApproved =
    loan.status === 'approved' ||
    loan.status === 'borrowed' ||
    loan.status === 'returned' ||
    !!loan.approvedBy;

  const bNameStr = bNameParts.first
    ? `${bNameParts.prefix ? bNameParts.prefix + ' ' : ''}${bNameParts.first} &nbsp;นามสกุล&nbsp; ${bNameParts.last || '-'}`
    : borrowerName;

  const pNameStr = pNameParts.first
    ? `${pNameParts.prefix ? pNameParts.prefix + ' ' : ''}${pNameParts.first} &nbsp;นามสกุล&nbsp; ${pNameParts.last || '-'}`
    : patientName;

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <title>บันทึกข้อตกลง_${docNo}_${borrowerName.split(' ')[0] || 'ผู้ยืม'}</title>
  <style>
    @font-face {
      font-family: 'TH SarabunIT๙';
      src: local('TH SarabunIT๙'), local('THSarabunIT9'), local('TH Sarabun New'), local('THSarabunNew'), local('TH SarabunPSK');
    }
    @font-face {
      font-family: 'TH Sarabun New';
      src: local('TH Sarabun New'), local('THSarabunNew'), local('TH SarabunIT๙'), local('TH SarabunPSK');
    }
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap');

    @page {
      size: A4 portrait;
      margin: 0;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      font-family: 'TH SarabunIT๙', 'TH Sarabun New', 'TH SarabunPSK', 'Sarabun', sans-serif;
      font-size: 15pt;
      line-height: 1.2;
      color: #000;
      margin: 0;
      padding: 0;
      background: #f1f5f9;
    }

    .no-print {
      position: fixed;
      top: 12px;
      right: 20px;
      display: flex;
      gap: 10px;
      z-index: 9999;
      background: rgba(15, 23, 42, 0.94);
      padding: 8px 16px;
      border-radius: 12px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(8px);
    }

    .btn-action {
      border: none;
      padding: 8px 18px;
      border-radius: 8px;
      font-family: 'Sarabun', sans-serif;
      font-size: 13.5px;
      font-weight: 700;
      cursor: pointer;
      color: #fff;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }
    .btn-action:hover {
      opacity: 0.92;
      transform: translateY(-1px);
    }

    /* Exact A4 dimensions with fixed absolute border frame */
    .a4-page {
      background: #fff;
      width: 210mm;
      height: 297mm;
      max-height: 297mm;
      margin: 15px auto;
      box-shadow: 0 4px 15px rgba(0,0,0,0.18);
      position: relative;
      overflow: hidden;
      box-sizing: border-box;
    }

    /* Fixed absolute border frame: ALWAYS covers the entire A4 page, never breaks in half! */
    .page-border-frame {
      position: absolute;
      top: 8.5mm;
      left: 8.5mm;
      right: 8.5mm;
      bottom: 8.5mm;
      border: 1px solid #000;
      pointer-events: none;
      z-index: 10;
      box-sizing: border-box;
    }

    .page-content {
      padding: 13mm 15mm 15mm 22mm;
      height: 297mm;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      z-index: 1;
    }

    .logos-header {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 40px;
      margin-bottom: 4px;
    }
    .logo-item {
      height: 56px;
      width: auto;
      object-fit: contain;
    }
    .logo-center {
      height: 62px;
    }

    .header-text {
      text-align: center;
      font-weight: 700;
      font-size: 17pt;
      line-height: 1.18;
      margin-bottom: 2px;
    }

    .sub-header-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-top: 1px;
      margin-bottom: 1px;
      font-size: 15pt;
    }

    .doc-date-row {
      text-align: right;
      margin-bottom: 2px;
      font-size: 15pt;
    }

    .dot-val {
      border-bottom: 1px dotted #000;
      padding: 0 4px;
      font-weight: 700;
      display: inline-block;
    }

    .info-line {
      margin-bottom: 1px;
      line-height: 1.25;
      font-size: 15pt;
      white-space: nowrap;
    }

    .equip-section-title {
      font-weight: 700;
      margin-top: 4px;
      margin-bottom: 2px;
      font-size: 15pt;
    }

    .equip-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 3px;
      font-size: 15pt;
      line-height: 1.22;
    }
    .equip-table td {
      padding: 1px 0;
      vertical-align: baseline;
    }

    .chk-icon {
      display: inline-block;
      width: 13pt;
      height: 13pt;
      border: 1px solid #000;
      vertical-align: -2px;
      margin-right: 6px;
      text-align: center;
      line-height: 13pt;
      font-size: 11pt;
      font-weight: 700;
    }

    .terms-title {
      text-align: center;
      font-weight: 700;
      font-size: 15pt;
      margin-top: 3px;
      margin-bottom: 2px;
    }

    .terms-body {
      font-size: 14.5pt;
      line-height: 1.2;
      text-align: justify;
      text-justify: inter-cluster;
    }
    .terms-body p {
      margin: 1.5px 0;
    }
    .terms-sublist {
      margin: 1px 0 1px 22px;
      line-height: 1.2;
    }

    .sign-table {
      width: 100%;
      margin-top: 10px;
      font-size: 15pt;
      text-align: center;
    }
    .sign-table td {
      padding: 2px 6px;
      vertical-align: top;
      line-height: 1.28;
    }

    .return-box {
      border-top: 1px dashed #000;
      margin-top: 10px;
      padding-top: 4px;
      font-size: 15pt;
    }

    @media print {
      body {
        background: #fff !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .no-print {
        display: none !important;
      }
      .a4-page {
        margin: 0 !important;
        box-shadow: none !important;
        width: 210mm !important;
        height: 297mm !important;
        max-height: 297mm !important;
        page-break-inside: avoid !important;
        overflow: hidden !important;
      }
      .page-1 {
        page-break-after: always !important;
        break-after: page !important;
      }
      .page-2 {
        page-break-before: always !important;
        break-before: page !important;
      }
    }
  </style>
</head>
<body>

  <!-- Floating Toolbar -->
  <div class="no-print">
    <button type="button" class="btn-action" style="background:#059669;" onclick="window.print()">
      🖨️ สั่งพิมพ์ A4 (2 หน้าตรงต้นแบบ)
    </button>
    <button type="button" class="btn-action" style="background:#2563eb;" onclick="downloadOfficialDocx()">
      📥 ดาวน์โหลด Word (.docx ต้นแบบ)
    </button>
    <button type="button" class="btn-action" style="background:#64748b;" onclick="window.close()">
      ✕ ปิดหน้าต่าง
    </button>
  </div>

  <!-- ================= PAGE 1 ================= -->
  <div class="a4-page page-1">
    <div class="page-border-frame"></div>
    <div class="page-content">
      <div>
        <!-- 3 Logos Header -->
        <div class="logos-header">
          <img src="${MED_LOAN_IMG_LEFT}" alt="อบจ.ตรัง" class="logo-item" />
          <img src="${MED_LOAN_IMG_CENTER}" alt="เทศบาลตำบลบางเป้า" class="logo-item logo-center" />
          <img src="${MED_LOAN_IMG_RIGHT}" alt="กองทุนฟื้นฟูสมรรถภาพจังหวัดตรัง" class="logo-item" />
        </div>

        <div class="header-text">
          ศูนย์สาธิตและยืมอุปกรณ์เครื่องช่วยความพิการฟื้นฟูสมรรถภาพที่บ้าน<br>
          เทศบาลตำบลบางเป้า
        </div>

        <div class="sub-header-row">
          <div style="font-weight:700; width:65%; text-align:right; padding-right:15px;">
            แบบฟอร์มขอยืมอุปกรณ์การแพทย์
          </div>
          <div style="width:35%; text-align:right;">
            เลขที่ <span class="dot-val" style="min-width:110px; text-align:center;">${docNo || '.......................'}</span>
          </div>
        </div>

        <div class="doc-date-row">
          วันที่ <span class="dot-val" style="min-width:35px; text-align:center;">${dateObj.day}</span>
          เดือน <span class="dot-val" style="min-width:60px; text-align:center;">${dateObj.month}</span>
          พ.ศ. <span class="dot-val" style="min-width:50px; text-align:center;">${dateObj.year}</span>
        </div>

        <!-- Borrower Information (3 Distinct Lines matching template) -->
        <div class="info-line">
          ชื่อผู้ขอยืม(นาย/นาง/นางสาว) <span class="dot-val" style="min-width:135px; text-align:center;">${bNameParts.prefix ? bNameParts.prefix + ' ' : ''}${bNameParts.first || '-'}</span>
          นามสกุล <span class="dot-val" style="min-width:135px; text-align:center;">${bNameParts.last || '-'}</span>
          ที่อยู่ เลขที่ <span class="dot-val" style="min-width:60px; text-align:center;">${bAddr.houseNo || '-'}</span>
        </div>
        <div class="info-line">
          หมู่ที่ <span class="dot-val" style="min-width:35px; text-align:center;">${bAddr.moo || '-'}</span>
          (ถนน/ตรอก/ซอย) <span class="dot-val" style="min-width:95px; text-align:center;">${bAddr.soi || '-'}</span>
          ตำบล <span class="dot-val" style="min-width:95px; text-align:center;">${bAddr.subdistrict || 'บางเป้า'}</span>
          อำเภอ <span class="dot-val" style="min-width:95px; text-align:center;">${bAddr.district || 'กันตัง'}</span>
        </div>
        <div class="info-line">
          จังหวัด <span class="dot-val" style="min-width:135px; text-align:center;">${bAddr.province || 'ตรัง'}</span>
          เบอร์โทรศัพท์ <span class="dot-val" style="min-width:135px; text-align:center;">${phone || '.............................'}</span>
        </div>

        <!-- Patient Information (3 Distinct Lines matching template) -->
        <div class="info-line">
          เพื่อให้ผู้ป่วยชื่อ(นาย/นาง/นางสาว) <span class="dot-val" style="min-width:135px; text-align:center;">${pNameParts.prefix ? pNameParts.prefix + ' ' : ''}${pNameParts.first || '-'}</span>
          นามสกุล <span class="dot-val" style="min-width:135px; text-align:center;">${pNameParts.last || '-'}</span>
          ที่อยู่ เลขที่ <span class="dot-val" style="min-width:60px; text-align:center;">${pAddr.houseNo || '-'}</span>
        </div>
        <div class="info-line">
          หมู่ที่ <span class="dot-val" style="min-width:35px; text-align:center;">${pAddr.moo || '-'}</span>
          (ถนน/ตรอก/ซอย) <span class="dot-val" style="min-width:95px; text-align:center;">${pAddr.soi || '-'}</span>
          ตำบล <span class="dot-val" style="min-width:95px; text-align:center;">${pAddr.subdistrict || 'บางเป้า'}</span>
          อำเภอ <span class="dot-val" style="min-width:95px; text-align:center;">${pAddr.district || 'กันตัง'}</span>
        </div>
        <div class="info-line">
          จังหวัด <span class="dot-val" style="min-width:135px; text-align:center;">${pAddr.province || 'ตรัง'}</span>
          มีความสัมพันธ์กับผู้ป่วย <span class="dot-val" style="min-width:135px; text-align:center;">${relation}</span>
        </div>

        <!-- Equipment List (6 Items matching template) -->
        <div class="equip-section-title">ประเภทอุปกรณ์ที่ยืม</div>
        <table class="equip-table">
          <tbody>
            <tr>
              <td style="width:44%; white-space:nowrap;">
                <span class="chk-icon">${chk.isBed ? '✓' : '&nbsp;'}</span>เตียงเฟาว์เลอร์ชนิดมือหมุน
              </td>
              <td style="width:20%; white-space:nowrap;">
                จำนวน <span class="dot-val" style="min-width:32px; text-align:center;">${chk.isBed ? '1' : '.....'}</span> เตียง
              </td>
              <td style="width:36%; white-space:nowrap;">
                หมายเลขครุภัณฑ์ <span class="dot-val" style="min-width:120px; text-align:center;">${chk.isBed ? chk.code : '.................................'}</span>
              </td>
            </tr>
            <tr>
              <td style="white-space:nowrap;">
                <span class="chk-icon">${chk.isOxygen ? '✓' : '&nbsp;'}</span>ถังออกซิเจนพร้อมอุปกรณ์การใช้ครบชุด
              </td>
              <td style="white-space:nowrap;">
                จำนวน <span class="dot-val" style="min-width:32px; text-align:center;">${chk.isOxygen ? '1' : '.....'}</span> ถัง
              </td>
              <td style="white-space:nowrap;">
                หมายเลขครุภัณฑ์ <span class="dot-val" style="min-width:120px; text-align:center;">${chk.isOxygen ? chk.code : '................................'}</span>
              </td>
            </tr>
            <tr>
              <td style="white-space:nowrap;">
                <span class="chk-icon">${chk.isWheelchair ? '✓' : '&nbsp;'}</span>รถนั่งคนพิการชนิดพับได้ทำด้วยโลหะ
              </td>
              <td style="white-space:nowrap;">
                จำนวน <span class="dot-val" style="min-width:32px; text-align:center;">${chk.isWheelchair ? '1' : '.....'}</span> คัน
              </td>
              <td style="white-space:nowrap;">
                หมายเลขครุภัณฑ์ <span class="dot-val" style="min-width:120px; text-align:center;">${chk.isWheelchair ? chk.code : '.................................'}</span>
              </td>
            </tr>
            <tr>
              <td style="white-space:nowrap;">
                <span class="chk-icon">${chk.isSuction ? '✓' : '&nbsp;'}</span>เครื่องดูดเสมหะ
              </td>
              <td style="white-space:nowrap;">
                จำนวน <span class="dot-val" style="min-width:32px; text-align:center;">${chk.isSuction ? '1' : '.....'}</span> เครื่อง
              </td>
              <td style="white-space:nowrap;">
                หมายเลขครุภัณฑ์ <span class="dot-val" style="min-width:120px; text-align:center;">${chk.isSuction ? chk.code : '.................................'}</span>
              </td>
            </tr>
            <tr>
              <td style="white-space:nowrap;">
                <span class="chk-icon">${chk.isAirMattress ? '✓' : '&nbsp;'}</span>ที่นอนลม
              </td>
              <td style="white-space:nowrap;">
                จำนวน <span class="dot-val" style="min-width:32px; text-align:center;">${chk.isAirMattress ? '1' : '.....'}</span> ชุด
              </td>
              <td style="white-space:nowrap;">
                หมายเลขครุภัณฑ์ <span class="dot-val" style="min-width:120px; text-align:center;">${chk.isAirMattress ? chk.code : '.................................'}</span>
              </td>
            </tr>
            <tr>
              <td style="white-space:nowrap;">
                <span class="chk-icon">${chk.isOther ? '✓' : '&nbsp;'}</span>อื่นๆ ระบุ <span class="dot-val" style="min-width:110px; text-align:center;">${chk.isOther ? (loan.equipmentName || '') : '.........................'}</span>
              </td>
              <td style="white-space:nowrap;">
                จำนวน <span class="dot-val" style="min-width:32px; text-align:center;">${chk.isOther ? '1' : '.....'}</span> &nbsp;&nbsp;&nbsp;&nbsp;
              </td>
              <td style="white-space:nowrap;">
                หมายเลขครุภัณฑ์ <span class="dot-val" style="min-width:120px; text-align:center;">${chk.isOther ? chk.code : '.................................'}</span>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Agreement Terms (Page 1: Clauses 1 to 4) -->
        <div class="terms-title">
          ข้อตกลง เกี่ยวกับการยืมอุปกรณ์เครื่องช่วยความพิการฟื้นฟูสมรรถภาพที่บ้าน
        </div>
        <div class="terms-body">
          <p>
            (๑) เมื่อผู้ยื่นคำร้องขอยืม ได้ยืมอุปกรณ์ไปแล้ว ผู้ยืมจะต้องจัดซื้อวัสดุสิ้นเปลืองเพื่อประกอบการใช้งานอุปกรณ์ด้วยตนเอง อาทิ สายดูดเสมหะ สายออกซิเจน (Nasal Cannula) น้ำกลั่นสำหรับเครื่องผลิตออกซิเจน ฯลฯ
          </p>
          <p>
            (๒) ระหว่างการใช้อุปกรณ์ฯผู้ป่วย หรือผู้ที่ยื่นคำร้อง จะต้องรักษาความสะอาดของอุปกรณ์ทุกชิ้นที่ยืมไป และก่อนจะนำส่งคืนเทศบาลตำบลบางเป้า จะต้องทำความสะอาดอุปกรณ์ที่ยืมไปให้เรียบร้อย (กรณีอุปกรณ์ฯชำรุดเสียหายที่ไม่ใช่จากการเสื่อมสภาพของอุปกรณ์ฯผู้ป่วย หรือผู้ที่ยื่นคำร้อง จะต้องเป็นผู้รับผิดชอบค่าเสียหายทั้งหมด)
          </p>
          <p>
            (๓) หลังจากที่ได้รับมอบอุปกรณ์เครื่องช่วยความพิการฟื้นฟูสมรรถภาพที่บ้านจากทางเทศบาลตำบลบางเป้า จะมีเจ้าหน้าที่ลงตรวจเยี่ยม ติดตามอาการ เพื่อทำการประเมินกิจวัตรประจำวัน ดัชนีบาร์เธลเอดีแอล (Barthel Activities of Daily Living : ADL)
          </p>
          <p>
            (๔) ในกรณีที่ผลการประเมินกิจวัตรประจำวัน ดัชนีบาร์เธลเอดีแอล (Barthel Activities of Daily Living : ADL) ของผู้ป่วยต่ำกว่าเกณฑ์หรือไม่มีความจำเป็นต้องใช้อุปกรณ์ที่ได้ยืมกับทางเทศบาลตำบลบางเป้าแล้ว นั้น
          </p>
          <div class="terms-sublist">
            <div>- ให้ผู้ที่ยื่นคำร้อง จะต้องทำการส่งคืนอุปกรณ์ทั้งหมดให้แก่เทศบาลตำบลบางเป้า ภายในระยะเวลา 7 วัน</div>
            <div>- โดยจะต้องแจ้งให้เจ้าหน้าที่เทศบาลตำบลบางเป้าทราบก่อนส่งคืนทุกครั้ง เพื่อทำการตรวจ สภาพอุปกรณ์ก่อน ส่งคืน</div>
          </div>
        </div>
      </div>

      <!-- Bottom of Page 1 -->
      <div style="text-align:right; font-size:14pt; margin-top:2px;">/- ห้ามส่ง…</div>
    </div>
  </div>

  <!-- ================= PAGE 2 ================= -->
  <div class="a4-page page-2">
    <div class="page-border-frame"></div>
    <div class="page-content">
      <div>
        <div style="text-align: center; font-weight: 700; font-size: 15pt; margin-bottom: 3px;">-๒-</div>
        <div class="terms-body">
          <div class="terms-sublist" style="margin-left: 0;">
            <div>- ห้ามส่งมอบอุปกรณ์ที่ขอยืมกับทางเทศบาลตำบลบางเป้าให้บุคคลอื่นต่อ โดยไม่ได้รับอนุญาต โดยเด็ดขาด หากทรัพย์สินเกิดการชำรุดหรือสูญหาย ผู้ที่ลงชื่อขอยืมจะต้องรับผิดชอบต่อทรัพย์สิน นั้น</div>
            <div style="margin-top: 2px;">- ผู้ที่ยื่นคำร้องขอยืมอุปกรณ์ เมื่อต้องการนำส่งอุปกรณ์คืน จะต้องมาลงลายมือชื่อต่อเจ้าหน้าที่ ณ กองสาธารณสุขและสิ่งแวดล้อม เทศบาลตำบลบางเป้า เท่านั้น</div>
          </div>
          <p style="margin-top: 3px;">
            (๕) ห้ามผู้ใดทำการขีดฆ่า หรือลบ ทำลายเลขครุภัณฑ์ที่เขียนกำกับไว้ หรือสลับอุปกรณ์กับอุปกรณ์อื่น โดยเด็ดขาดเนื่องจากเป็นทรัพย์สินของทางราชการ (การทำลายทรัพย์สินของทางราชการหรือพยายามเก็บไว้เป็นของตน มีความผิดตามกฎหมาย)
          </p>

          <p style="text-indent: 32px; margin-top: 6px; font-weight: 700;">
            ข้าพเจ้าได้อ่าน เข้าใจ ในรายละเอียด และยอมรับข้อตกลงข้างต้นแล้ว จึงขอรับรองว่า จะดูแลรักษาอุปกรณ์ที่ยืมเป็นอย่างดี โดยหากมีความเสียหายใดๆ หรือมีการสูญหายเกิดขึ้น ข้าพเจ้าจะขอรับผิดชอบทั้งหมดทุกกรณีโดยไม่มีเงื่อนไข
          </p>
        </div>

        <!-- Borrower and Lender Signature Table -->
        <table class="sign-table">
          <tbody>
            <tr>
              <td style="width: 50%;">
                ลงชื่อ.........................................................ผู้ยืม<br>
                (&nbsp;<span style="font-weight:700;">${borrowerName || '.................................................'}</span>&nbsp;)<br>
                วันที่.........................................................
              </td>
              <td style="width: 50%;">
                ลงชื่อ.........................................................ผู้ให้ยืม<br>
                (&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)<br>
                วันที่.........................................................
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Approval Section -->
        <div style="margin-top: 10px; font-size: 15pt; padding-left: 20px;">
          <span class="chk-icon">${isApproved ? '✓' : '&nbsp;'}</span> อนุมัติ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          <span class="chk-icon">${loan.status === 'overdue' ? '✓' : '&nbsp;'}</span> ไม่อนุมัติ
        </div>

        <!-- Second Signatures Row: Executive (Left) & Witness/Recipient (Right) -->
        <table class="sign-table" style="margin-top: 8px;">
          <tbody>
            <tr>
              <td style="width: 50%; vertical-align: top;">
                ลงชื่อ.........................................................<br>
                (&nbsp;<span style="font-weight:700;">${mayorName}</span>&nbsp;)<br>
                ${mayorPos}<br>
                ${mayorFor}
              </td>
              <td style="width: 50%; vertical-align: top;">
                ลงชื่อ.........................................................<br>
                (&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)<br>
                วันที่.........................................................
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Return Section -->
        <div class="return-box">
          <div style="font-weight: 700; margin-bottom: 2px;">ส่งคืนอุปกรณ์</div>
          <div style="padding-left: 20px; margin-bottom: 3px; font-size: 15pt;">
            <span class="chk-icon">${loan.status === 'returned' && loan.returnCondition === 'complete' ? '✓' : '&nbsp;'}</span> อุปกรณ์ครบถ้วน &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            <span class="chk-icon">${loan.status === 'returned' && loan.returnCondition === 'damaged' ? '✓' : '&nbsp;'}</span> อุปกรณ์ชำรุด เนื่องจาก...........................................................................................
          </div>

          <table class="sign-table" style="margin-top: 6px;">
            <tbody>
              <tr>
                <td style="width: 50%;">
                  ลงชื่อ.........................................................ผู้ส่งคืน<br>
                  (&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)<br>
                  วันที่.........................................................
                </td>
                <td style="width: 50%;">
                  ลงชื่อ.........................................................ผู้ตรวจสอบ<br>
                  (&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)<br>
                  วันที่.........................................................
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <script>
    function downloadOfficialDocx() {
      if (window.opener && window.opener.exportMedicalLoanDocxDirect) {
        window.opener.exportMedicalLoanDocxDirect();
      } else {
        alert('กรุณาดาวน์โหลดผ่านปุ่ม Word บนหน้าจอระบบหลัก หรือใช้คำสั่งพิมพ์ A4 / บันทึกเป็น PDF');
      }
    }
  </script>
</body>
</html>`;
}
