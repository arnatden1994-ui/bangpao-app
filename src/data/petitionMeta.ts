import {
  PublicPetition,
  PetitionFormData,
  PetitionAddress,
  PetitionFormType,
  PetitionCategory,
  SewageZone,
  SignerSettings,
  DEFAULT_SIGNER_SETTINGS,
} from '../types/index.ts';
import { parseThaiAddressParts } from '../services/medicalLoanDocGenerator.ts';

// ---------------------------------------------------------------------------
// ค่าคงที่ของระบบที่ 5: ระบบยื่นคำร้อง & บริการประชาชน
// ---------------------------------------------------------------------------

export type PetitionStage = 'submitted' | 'accepted' | 'assigned' | 'resolved' | 'rejected';

export const PETITION_CATEGORY_LABELS: Record<PetitionCategory, string> = {
  nuisance_smell: 'กลิ่นเหม็น / มลพิษทางอากาศ / เผาขยะ',
  nuisance_noise: 'เสียงดังรบกวน / สถานบันเทิง / ก่อสร้าง',
  waste_sewage: 'น้ำเสีย / สิ่งปฏิกูล / ขยะมูลฝอยล้นทะลัก',
  license_request: 'ยื่นคำขอรับ / ขอต่ออายุใบอนุญาตประกอบกิจการ',
  fogging_spray: 'ขอรับบริการพ่นสารเคมีหมอกควันกำจัดยุงลาย',
  rabies_vaccine: 'ขอรับบริการฉีดวัคซีนป้องกันพิษสุนัขบ้า',
  stray_animals: 'จัดการปัญหาสุนัขและแมวจรจัดในชุมชน',
  other: 'คำร้องทั่วไปด้านสาธารณสุขและสิ่งแวดล้อม',
};

// หมวดหมู่ที่เลือกได้เมื่อยื่น "คำร้องทั่วไป" (ไม่รวมสูบสิ่งปฏิกูลซึ่งมีแบบฟอร์มเฉพาะ)
export const GENERAL_CATEGORY_OPTIONS: PetitionCategory[] = [
  'other',
  'nuisance_smell',
  'nuisance_noise',
  'license_request',
  'fogging_spray',
  'rabies_vaccine',
  'stray_animals',
];

export const FORM_TYPE_META: Record<
  PetitionFormType,
  { label: string; short: string; templateFile: string; emoji: string; desc: string }
> = {
  general: {
    label: 'แบบคำร้องทั่วไป',
    short: 'คำร้องทั่วไป',
    templateFile: 'คำร้องทั่วไปใหม่.docx',
    emoji: '📑',
    desc: 'ยื่นคำร้องต่อนายกเทศมนตรีตำบลบางเป้า เช่น เหตุรำคาญ ขอรับบริการ ขอความอนุเคราะห์',
  },
  sewage: {
    label: 'คำร้องขอรับบริการกำจัดสิ่งปฏิกูล',
    short: 'ขอสูบสิ่งปฏิกูล',
    templateFile: 'คำร้องขอรับบริการกำจัดสิ่งปฏิกูล.docx',
    emoji: '🚛',
    desc: 'ขอรับบริการรถสูบสิ่งปฏิกูล (ดูดส้วม) พร้อมคำนวณค่าธรรมเนียมตามข้อบัญญัติ',
  },
};

export const SEWAGE_ZONES: { id: SewageZone; label: string; area: string }[] = [
  { id: 'in_district', label: 'ในเขตเทศบาลตำบลบางเป้า (เหมาจ่าย)', area: 'ในเขตเทศบาล' },
  { id: 'out_10', label: 'นอกเขต ไม่เกิน 10 กิโลเมตร', area: 'นอกเขต ≤ 10 กม.' },
  { id: 'out_20', label: 'นอกเขต เกิน 10 กม. แต่ไม่เกิน 20 กม.', area: 'นอกเขต 10-20 กม.' },
  { id: 'out_30', label: 'นอกเขต เกิน 20 กม. แต่ไม่เกิน 30 กม.', area: 'นอกเขต 20-30 กม.' },
];

export const getSewageFee = (zone: SewageZone | undefined, signers?: SignerSettings): number => {
  const s = signers || DEFAULT_SIGNER_SETTINGS;
  const pick = (val: string | undefined, fallback: number) => {
    const n = Number(String(val ?? '').replace(/[^\d.]/g, ''));
    return n > 0 ? n : fallback;
  };
  switch (zone) {
    case 'out_10':
      return pick(s.feeOut10km, 700);
    case 'out_20':
      return pick(s.feeOut20km, 1000);
    case 'out_30':
      return pick(s.feeOut30km, 1300);
    case 'in_district':
    default:
      return pick(s.feeInDistrict, 250);
  }
};

export const TANK_TYPES = [
  'บ่อเกรอะ/บ่อซึมในบ้านพักอาศัย',
  'บ่อดักไขมัน',
  'ถังบำบัดน้ำเสียสำเร็จรูป',
  'ส้วมสาธารณะ / อาคารพาณิชย์',
  'อื่นๆ',
];

// ---------------------------------------------------------------------------
// สถานะ / ลำดับขั้นตอนการดำเนินงาน
// ---------------------------------------------------------------------------

export const normalizeStage = (status: PublicPetition['status']): PetitionStage => {
  switch (status) {
    case 'pending':
    case 'submitted':
      return 'submitted';
    case 'accepted':
      return 'accepted';
    case 'investigating':
    case 'assigned':
      return 'assigned';
    case 'resolved':
      return 'resolved';
    case 'rejected':
      return 'rejected';
    default:
      return 'submitted';
  }
};

export const STAGE_META: Record<
  PetitionStage,
  { label: string; short: string; badge: string; dot: string; pin: string }
> = {
  submitted: {
    label: 'ยื่นคำร้องแล้ว (รอรับเรื่อง)',
    short: 'รอรับเรื่อง',
    badge: 'bg-amber-50 text-amber-800 border-amber-300',
    dot: 'bg-amber-500',
    pin: '#f59e0b',
  },
  accepted: {
    label: 'รับเรื่องแล้ว (อยู่ระหว่างเสนออนุมัติ)',
    short: 'เสนออนุมัติ',
    badge: 'bg-sky-50 text-sky-800 border-sky-300',
    dot: 'bg-sky-500',
    pin: '#0284c7',
  },
  assigned: {
    label: 'อนุมัติแล้ว (รอดำเนินการ)',
    short: 'อนุมัติ-รอดำเนินการ',
    badge: 'bg-indigo-50 text-indigo-800 border-indigo-300',
    dot: 'bg-indigo-500',
    pin: '#4f46e5',
  },
  resolved: {
    label: 'ดำเนินการแล้ว',
    short: 'ดำเนินการแล้ว',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    dot: 'bg-emerald-500',
    pin: '#059669',
  },
  rejected: {
    label: 'ไม่อนุมัติ',
    short: 'ไม่อนุมัติ',
    badge: 'bg-rose-50 text-rose-800 border-rose-300',
    dot: 'bg-rose-500',
    pin: '#e11d48',
  },
};

export const isSewagePetition = (p: PublicPetition): boolean =>
  (p.form?.formType || (p.category === 'waste_sewage' ? 'sewage' : 'general')) === 'sewage';

export const resolveFormType = (p: PublicPetition): PetitionFormType =>
  isSewagePetition(p) ? 'sewage' : 'general';

// ---------------------------------------------------------------------------
// วันที่ภาษาไทย
// ---------------------------------------------------------------------------

export const THAI_MONTHS = [
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

export const todayIso = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export interface ThaiDateParts {
  day: string;
  month: string;
  year: string;
}

export const toThaiDateParts = (iso?: string): ThaiDateParts => {
  if (!iso) return { day: '', month: '', year: '' };
  const m = String(iso).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return { day: '', month: '', year: '' };
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  return {
    day: String(d),
    month: THAI_MONTHS[mo - 1] || '',
    year: String(y > 2400 ? y : y + 543),
  };
};

export const formatThaiDateLong = (iso?: string): string => {
  const p = toThaiDateParts(iso);
  if (!p.day) return '-';
  return `${p.day} ${p.month} ${p.year}`;
};

export const formatThaiDateShort = (iso?: string): string => {
  if (!iso) return '-';
  const m = String(iso).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return iso;
  const y = parseInt(m[1], 10);
  const short = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return `${parseInt(m[3], 10)} ${short[parseInt(m[2], 10) - 1]} ${String((y > 2400 ? y : y + 543) % 100).padStart(2, '0')}`;
};

// เลขอารบิก -> เลขไทย (ใช้ในแบบฟอร์มค่าธรรมเนียม)
export const toThaiDigits = (v: string | number): string =>
  String(v).replace(/\d/g, (d) => '๐๑๒๓๔๕๖๗๘๙'[Number(d)]);

export const formatMoney = (n: number): string => n.toLocaleString('th-TH');

// ---------------------------------------------------------------------------
// ที่อยู่
// ---------------------------------------------------------------------------

export const emptyAddress = (phone = '', moo = '1'): PetitionAddress => ({
  houseNo: '',
  soi: '',
  road: '',
  moo,
  subdistrict: 'บางเป้า',
  district: 'กันตัง',
  province: 'ตรัง',
  phone,
});

export const buildAddressLine = (a?: PetitionAddress): string => {
  if (!a) return '';
  return [
    a.houseNo ? `บ้านเลขที่ ${a.houseNo}` : '',
    a.moo ? `หมู่ ${a.moo}` : '',
    a.soi ? `ซอย/ตรอก ${a.soi}` : '',
    a.road ? `ถนน ${a.road}` : '',
    a.subdistrict ? `ต.${a.subdistrict}` : '',
    a.district ? `อ.${a.district}` : '',
    a.province ? `จ.${a.province}` : '',
  ]
    .filter(Boolean)
    .join(' ');
};

const addressFromLegacy = (raw: string, phone: string): PetitionAddress => {
  const parsed = parseThaiAddressParts(raw);
  return {
    houseNo: parsed.houseNo || '',
    soi: parsed.soi && parsed.soi !== '-' ? parsed.soi : '',
    road: '',
    moo: parsed.moo || '',
    subdistrict: parsed.subdistrict || 'บางเป้า',
    district: parsed.district || 'กันตัง',
    province: parsed.province || 'ตรัง',
    phone,
  };
};

// ---------------------------------------------------------------------------
// ดึงข้อมูลฟอร์มของคำร้อง (รองรับข้อมูลเดิมที่ยังไม่มี form)
// ---------------------------------------------------------------------------

export const getPetitionForm = (p: PublicPetition, signers?: SignerSettings): PetitionFormData => {
  if (p.form) return p.form;
  const formType = resolveFormType(p);
  const applicantAddress = addressFromLegacy(p.address || '', p.phone || '');
  const base: PetitionFormData = {
    formType,
    docNo: p.trackingCode,
    filedDate: (p.submissionDate || todayIso()).slice(0, 10),
    applicantAddress,
    attachIdCopy: true,
  };
  if (formType === 'sewage') {
    const desc = p.description || '';
    let zone: SewageZone = 'in_district';
    if (/700/.test(desc) || /ไม่เกิน\s*10/.test(desc)) zone = 'out_10';
    else if (/1,?000/.test(desc)) zone = 'out_20';
    else if (/1,?300/.test(desc)) zone = 'out_30';
    return {
      ...base,
      serviceAddress: applicantAddress,
      sewageZone: zone,
      feeAmount: getSewageFee(zone, signers),
      operation: p.status === 'resolved' ? { done: true, doneDate: p.resolvedDate } : undefined,
    };
  }
  return {
    ...base,
    subject: p.title,
    purpose: p.description,
    operation: p.status === 'resolved' ? { done: true, doneDate: p.resolvedDate } : undefined,
  };
};

// ---------------------------------------------------------------------------
// พิกัด / หมู่บ้าน
// ---------------------------------------------------------------------------

export const derivePetitionMoo = (p: PublicPetition): string => {
  if (p.moo) return String(p.moo);
  const f = p.form;
  const addr = f?.serviceAddress || f?.applicantAddress;
  if (addr?.moo) return String(addr.moo).replace(/\D/g, '') || '1';
  const m = (p.address || '').match(/หมู่(?:\s*ที่)?\s*([1-7])/);
  return m ? m[1] : '1';
};

// ---------------------------------------------------------------------------
// เลขรับ / รหัสติดตาม
// ---------------------------------------------------------------------------

export const generateTrackingCode = (type: PetitionFormType, existing: PublicPetition[]): string => {
  const be2 = String((new Date().getFullYear() + 543) % 100).padStart(2, '0');
  const prefix = type === 'sewage' ? `ST-${be2}` : `REQ-${be2}-`;
  let max = 0;
  existing.forEach((p) => {
    if (p.trackingCode && p.trackingCode.startsWith(prefix)) {
      const n = parseInt(p.trackingCode.slice(prefix.length), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  });
  const next = max + 1;
  return type === 'sewage'
    ? `${prefix}${String(next).padStart(3, '0')}`
    : `${prefix}${String(next).padStart(4, '0')}`;
};

// ---------------------------------------------------------------------------
// รูปแบบตรวจสอบข้อมูล
// ---------------------------------------------------------------------------

export const cleanDigits = (val?: string): string => (val || '').replace(/\D/g, '');

export const formatPhone10 = (val?: string): string => {
  const d = cleanDigits(val).slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
};

export const formatIdCard13 = (val?: string): string => {
  const d = cleanDigits(val).slice(0, 13);
  if (d.length <= 1) return d;
  if (d.length <= 5) return `${d.slice(0, 1)}-${d.slice(1)}`;
  if (d.length <= 10) return `${d.slice(0, 1)}-${d.slice(1, 5)}-${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 1)}-${d.slice(1, 5)}-${d.slice(5, 10)}-${d.slice(10)}`;
  return `${d.slice(0, 1)}-${d.slice(1, 5)}-${d.slice(5, 10)}-${d.slice(10, 12)}-${d.slice(12)}`;
};
