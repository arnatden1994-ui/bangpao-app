/**
 * Date helpers that always work in the user's LOCAL timezone (Asia/Bangkok).
 *
 * NOTE: `new Date().toISOString()` returns UTC — between 00:00 and 07:00 (Bangkok)
 * it yields *yesterday's* date. Every "today" comparison in the dashboard must use
 * `toLocalDateStr()` instead, otherwise statuses ("วันนี้", "เลยกำหนด") drift.
 */

export const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

export const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

export const THAI_DAY_NAMES = [
  'วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์',
];

/** YYYY-MM-DD of a Date in local time */
export function toLocalDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Parse many date formats used across the system into a local Date (midnight):
 *  - "2026-10-30" / "2026-10-30T09:00:00Z"
 *  - "30/10/2026" or "30/10/2569" (Buddhist Era, auto -543)
 *  - "30/10/2026 10:50"
 */
export function parseFlexibleDate(input?: string | null): Date | null {
  if (!input) return null;
  const s = String(input).trim();
  if (!s) return null;

  // ISO YYYY-MM-DD...
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    let y = Number(iso[1]);
    if (y > 2400) y -= 543;
    // Full ISO timestamp → keep exact instant
    if (s.length > 10 && s.includes('T')) {
      const dt = new Date(s);
      if (!isNaN(dt.getTime())) return dt;
    }
    return new Date(y, Number(iso[2]) - 1, Number(iso[3]));
  }

  // DD/MM/YYYY [HH:mm]
  const dmy = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (dmy) {
    let y = Number(dmy[3]);
    if (y > 2400) y -= 543;
    const hh = dmy[4] ? Number(dmy[4]) : 0;
    const mm = dmy[5] ? Number(dmy[5]) : 0;
    return new Date(y, Number(dmy[2]) - 1, Number(dmy[1]), hh, mm);
  }

  const fallback = new Date(s);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/** Whole days from today (local) until the given date. Negative = in the past. */
export function daysFromToday(input?: string | Date | null): number | null {
  const d = input instanceof Date ? input : parseFlexibleDate(input as string);
  if (!d) return null;
  const today = new Date();
  const a = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((b - a) / 86400000);
}

/** "30 ต.ค. 2569" */
export function formatThaiDateShort(input?: string | Date | null): string {
  const d = input instanceof Date ? input : parseFlexibleDate(input as string);
  if (!d) return '-';
  return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear() + 543}`;
}

/** "30 ตุลาคม 2569" */
export function formatThaiDateLong(input?: string | Date | null): string {
  const d = input instanceof Date ? input : parseFlexibleDate(input as string);
  if (!d) return '-';
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

/** "วันศุกร์ที่ 30 ตุลาคม 2569" */
export function formatThaiDateWithDay(input?: string | Date | null): string {
  const d = input instanceof Date ? input : parseFlexibleDate(input as string);
  if (!d) return '-';
  return `${THAI_DAY_NAMES[d.getDay()]}ที่ ${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

/** Relative Thai time label e.g. "5 นาทีที่แล้ว", "เมื่อวาน", "3 วันที่แล้ว", "12 ต.ค. 2569" */
export function formatRelativeThai(input?: string | Date | null): string {
  const d = input instanceof Date ? input : parseFlexibleDate(input as string);
  if (!d) return '-';
  const diffMs = Date.now() - d.getTime();
  const hasTime = !(d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0);

  if (hasTime && diffMs >= 0) {
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'เมื่อสักครู่';
    if (mins < 60) return `${mins} นาทีที่แล้ว`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} ชั่วโมงที่แล้ว`;
  }

  const days = daysFromToday(d);
  if (days === null) return '-';
  if (days === 0) return 'วันนี้';
  if (days === -1) return 'เมื่อวาน';
  if (days < -1 && days >= -30) return `${Math.abs(days)} วันที่แล้ว`;
  if (days === 1) return 'พรุ่งนี้';
  if (days > 1 && days <= 30) return `อีก ${days} วัน`;
  return formatThaiDateShort(d);
}

/** Human readable file size */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
