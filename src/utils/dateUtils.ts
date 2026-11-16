import { LicenseRecord } from '../types/index.ts';

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
 *  - "2026-10-30" / "2569-10-30" / "2026-10-30T09:00:00Z"
 *  - "30/10/2026" or "30/10/2569" or "30/10/69" (Buddhist Era, auto -543)
 *  - "30/10/2026 10:50"
 *  - "11 พฤศจิกายน 2569" / "11 พฤศจิกายน 2570" / "11 พ.ย. 2569" / "11 พ.ย. 69"
 */
export function parseFlexibleDate(input?: string | null): Date | null {
  if (!input) return null;
  const s = String(input).trim();
  if (!s || s === '-' || s.startsWith('...')) return null;

  const normalizeYear = (rawY: number): number => {
    let y = rawY;
    if (y < 100) {
      // 2-digit year: 40..99 => 2540..2599 BE; 0..39 => 2000..2039 CE
      y = y >= 40 ? y + 2500 - 543 : y + 2000;
    } else if (y > 2400) {
      if (y > 2900) y -= 543;
      y -= 543;
    }
    return y;
  };

  // 1. ISO YYYY-MM-DD...
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const y = normalizeYear(Number(iso[1]));
    // Full ISO timestamp → keep exact instant if CE year
    if (s.length > 10 && s.includes('T') && Number(iso[1]) < 2400) {
      const dt = new Date(s);
      if (!isNaN(dt.getTime())) return dt;
    }
    return new Date(y, Number(iso[2]) - 1, Number(iso[3]));
  }

  // 2. DD/MM/YYYY or DD/MM/YY [HH:mm]
  const dmy = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (dmy) {
    const y = normalizeYear(Number(dmy[3]));
    const hh = dmy[4] ? Number(dmy[4]) : 0;
    const mm = dmy[5] ? Number(dmy[5]) : 0;
    return new Date(y, Number(dmy[2]) - 1, Number(dmy[1]), hh, mm);
  }

  // 3. Thai month names (full or short), e.g. "11 พฤศจิกายน 2570", "11 พ.ย. 69"
  for (let mIdx = 0; mIdx < 12; mIdx++) {
    const fullM = THAI_MONTHS[mIdx];
    const shortM = THAI_MONTHS_SHORT[mIdx];
    const shortMNoDot = shortM.replace(/\./g, '');
    if (s.includes(fullM) || s.includes(shortM) || s.includes(shortMNoDot)) {
      const nums = s.match(/\d+/g);
      if (nums && nums.length >= 2) {
        const day = Number(nums[0]);
        const y = normalizeYear(Number(nums[nums.length - 1]));
        if (day >= 1 && day <= 31 && y >= 1900 && y <= 2200) {
          return new Date(y, mIdx, day);
        }
      } else if (nums && nums.length === 1) {
        const y = normalizeYear(Number(nums[0]));
        if (y >= 1900 && y <= 2200) {
          return new Date(y, mIdx, 1);
        }
      }
    }
  }

  const fallback = new Date(s);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/** Convert any flexible date string into YYYY-MM-DD (CE) for <input type="date"> */
export function toIsoDateStr(input?: string | null): string {
  const d = parseFlexibleDate(input);
  if (!d) return '';
  return toLocalDateStr(d);
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

/**
 * Dynamically calculate remainingDays, daysRemaining, and status from expireDate vs today's date,
 * and ensure roundYear & licenseYear are synchronized.
 */
export function computeLiveLicenseRecord(lic: LicenseRecord): LicenseRecord {
  const isWaitingForNumber =
    lic.status === 'pending' ||
    !lic.licenseNumber ||
    lic.licenseNumber.includes('รอออกเลข');

  // Synchronize licenseYear and roundYear if one was updated
  let syncedYear = (lic.licenseYear || '').trim();
  const numYearMatch = (lic.licenseNumber || '').match(/\/\s*(25\d{2})/);
  if (numYearMatch && numYearMatch[1]) {
    syncedYear = numYearMatch[1];
  } else if (!syncedYear && lic.roundYear) {
    const rMatch = lic.roundYear.match(/25\d{2}/);
    if (rMatch) syncedYear = rMatch[0];
  }
  const syncedRoundYear = syncedYear ? `รอบปี ${syncedYear}` : (lic.roundYear || 'รอบปี 2569');

  if (isWaitingForNumber) {
    return {
      ...lic,
      licenseYear: syncedYear || lic.licenseYear || '2569',
      roundYear: syncedRoundYear,
      status: 'pending',
    };
  }

  const expDays = daysFromToday(lic.expireDate);
  if (expDays === null) {
    return {
      ...lic,
      licenseYear: syncedYear || lic.licenseYear || '2569',
      roundYear: syncedRoundYear,
    };
  }

  let computedStatus: LicenseRecord['status'] = lic.status;
  let computedRemaining = Math.max(0, expDays);

  if (expDays <= 0) {
    computedStatus = 'expired';
    computedRemaining = 0;
  } else if (expDays <= 30) {
    computedStatus = 'expiring';
    computedRemaining = expDays;
  } else {
    computedStatus = 'normal';
    computedRemaining = expDays;
  }

  return {
    ...lic,
    licenseYear: syncedYear || lic.licenseYear || '2569',
    roundYear: syncedRoundYear,
    status: computedStatus,
    remainingDays: computedRemaining,
    daysRemaining: computedRemaining,
  };
}

export function computeLiveLicenseList(list: LicenseRecord[]): LicenseRecord[] {
  return (list || []).map(computeLiveLicenseRecord);
}
