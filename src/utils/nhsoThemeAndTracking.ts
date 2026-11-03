import { NhsoProject } from '../types/index.ts';

export interface CategoryColorTheme {
  catNum: number;
  headerHex: string; // พื้นหลังหัวตารางและแถบรวม เช่น #a9d08e
  borderHex: string;
  textHex: string;
  badgeBgClass: string;
  badgeTextClass: string;
  badgeBorderClass: string;
  xlsxFillArgb: string; // สำหรับส่งออก Excel ARGB (เช่น FFA9D08E)
}

export const CATEGORY_COLOR_THEMES: Record<number, CategoryColorTheme> = {
  1: {
    catNum: 1,
    headerHex: '#a9d08e',
    borderHex: '#70ad47',
    textHex: '#000000',
    badgeBgClass: 'bg-[#a9d08e]',
    badgeTextClass: 'text-slate-950',
    badgeBorderClass: 'border-[#70ad47]',
    xlsxFillArgb: 'FFA9D08E',
  },
  2: {
    catNum: 2,
    headerHex: '#ffd966',
    borderHex: '#bf9000',
    textHex: '#000000',
    badgeBgClass: 'bg-[#ffd966]',
    badgeTextClass: 'text-slate-950',
    badgeBorderClass: 'border-[#bf9000]',
    xlsxFillArgb: 'FFFFD966',
  },
  3: {
    catNum: 3,
    headerHex: '#9bc2e6',
    borderHex: '#2f75b5',
    textHex: '#000000',
    badgeBgClass: 'bg-[#9bc2e6]',
    badgeTextClass: 'text-slate-950',
    badgeBorderClass: 'border-[#2f75b5]',
    xlsxFillArgb: 'FF9BC2E6',
  },
  4: {
    catNum: 4,
    headerHex: '#b4a7d6',
    borderHex: '#8e7cc3',
    textHex: '#000000',
    badgeBgClass: 'bg-[#b4a7d6]',
    badgeTextClass: 'text-slate-950',
    badgeBorderClass: 'border-[#8e7cc3]',
    xlsxFillArgb: 'FFB4A7D6',
  },
  5: {
    catNum: 5,
    headerHex: '#f8cbad',
    borderHex: '#c65911',
    textHex: '#000000',
    badgeBgClass: 'bg-[#f8cbad]',
    badgeTextClass: 'text-slate-950',
    badgeBorderClass: 'border-[#c65911]',
    xlsxFillArgb: 'FFF8CBAD',
  },
  6: {
    catNum: 6,
    headerHex: '#a2c4c9',
    borderHex: '#45818e',
    textHex: '#000000',
    badgeBgClass: 'bg-[#a2c4c9]',
    badgeTextClass: 'text-slate-950',
    badgeBorderClass: 'border-[#45818e]',
    xlsxFillArgb: 'FFA2C4C9',
  },
  7: {
    catNum: 7,
    headerHex: '#d5a6bd',
    borderHex: '#a64d79',
    textHex: '#000000',
    badgeBgClass: 'bg-[#d5a6bd]',
    badgeTextClass: 'text-slate-950',
    badgeBorderClass: 'border-[#a64d79]',
    xlsxFillArgb: 'FFD5A6BD',
  },
  8: {
    catNum: 8,
    headerHex: '#8ea9db',
    borderHex: '#305496',
    textHex: '#000000',
    badgeBgClass: 'bg-[#8ea9db]',
    badgeTextClass: 'text-slate-950',
    badgeBorderClass: 'border-[#305496]',
    xlsxFillArgb: 'FF8EA9DB',
  },
};

export function getCategoryColorTheme(catNum?: number): CategoryColorTheme {
  return CATEGORY_COLOR_THEMES[catNum || 1] || CATEGORY_COLOR_THEMES[1];
}

export interface OrgColorTheme {
  bgHex: string; // สีพื้นหลังช่องผู้ขอรับงบตามเอกสารแนบ 2
  textHex: string;
  borderHex: string;
  pillClass: string;
  xlsxFillArgb: string | null;
}

export function getOrgColorTheme(orgName?: string): OrgColorTheme {
  const name = (orgName || '').trim();
  if (name.includes('กองสาธารณสุข')) {
    return {
      bgHex: '#ffe699',
      textHex: '#000000',
      borderHex: '#d6b656',
      pillClass: 'bg-[#ffe699] text-slate-950 border-amber-400',
      xlsxFillArgb: 'FFFFE699',
    };
  }
  if (name.includes('โรงพยาบาลกันตัง')) {
    return {
      bgHex: '#b4decb',
      textHex: '#000000',
      borderHex: '#6db396',
      pillClass: 'bg-[#b4decb] text-slate-950 border-teal-400',
      xlsxFillArgb: 'FFB4DECB',
    };
  }
  if (name.includes('รพ.สต.บางเป้า')) {
    return {
      bgHex: '#d5a6bd',
      textHex: '#000000',
      borderHex: '#a64d79',
      pillClass: 'bg-[#d5a6bd] text-slate-950 border-pink-400',
      xlsxFillArgb: 'FFD5A6BD',
    };
  }
  if (name.includes('บ้านป่าเตียว')) {
    return {
      bgHex: '#9bc2e6',
      textHex: '#000000',
      borderHex: '#5b9bd5',
      pillClass: 'bg-[#9bc2e6] text-slate-950 border-sky-400',
      xlsxFillArgb: 'FF9BC2E6',
    };
  }
  if (name.includes('วัดสีหราษฎร์')) {
    return {
      bgHex: '#f8cbad',
      textHex: '#000000',
      borderHex: '#ed7d31',
      pillClass: 'bg-[#f8cbad] text-slate-950 border-orange-300',
      xlsxFillArgb: 'FFF8CBAD',
    };
  }
  if (name.includes('รร.บ้านบางเป้า') || name.includes('โรงเรียนบ้านบางเป้า')) {
    return {
      bgHex: '#d9d2e9',
      textHex: '#000000',
      borderHex: '#8e7cc3',
      pillClass: 'bg-[#d9d2e9] text-slate-950 border-purple-300',
      xlsxFillArgb: 'FFD9D2E9',
    };
  }
  if (name.includes('ควนทองสีห์')) {
    return {
      bgHex: '#b4decb',
      textHex: '#000000',
      borderHex: '#6db396',
      pillClass: 'bg-[#b4decb] text-slate-950 border-emerald-400',
      xlsxFillArgb: 'FFB4DECB',
    };
  }
  if (name.includes('อสม.')) {
    return {
      bgHex: '#ffffff',
      textHex: '#000000',
      borderHex: '#94a3b8',
      pillClass: 'bg-white text-slate-900 border-emerald-400',
      xlsxFillArgb: null,
    };
  }
  return {
    bgHex: '#ffffff',
    textHex: '#000000',
    borderHex: '#94a3b8',
    pillClass: 'bg-white text-slate-900 border-slate-300',
    xlsxFillArgb: null,
  };
}

export function isProjectTrackingCompleted(p: NhsoProject): boolean {
  if (typeof p.trackingCompleted === 'boolean') return p.trackingCompleted;
  return p.status === 'completed' || p.implementationStatus === 'completed_reported';
}

export function isProjectTrackingExtended(p: NhsoProject): boolean {
  if (typeof p.trackingExtended === 'boolean') return p.trackingExtended;
  return false;
}

export function isProjectTrackingRefunded(p: NhsoProject): boolean {
  if (typeof p.trackingRefunded === 'boolean') return p.trackingRefunded;
  return false;
}
