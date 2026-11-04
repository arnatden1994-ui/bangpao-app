import React, { useState, useEffect, useMemo } from 'react';
import {
  Printer,
  FileText,
  X,
  Users,
  CheckCircle2,
  Edit3,
  RotateCcw,
  Sparkles,
  Calculator,
  Calendar,
  RefreshCw,
  Clock,
  HelpCircle,
  Check,
} from 'lucide-react';
import { LtcPatient, LtcRoundItem } from '../types/index.ts';

export interface LtcRegistrationRow {
  id: string;
  orderNo: number;
  fullName: string;
  shortAddress: string;
  allocationText: string;
  signature1: string;
  signature2: string;
  projectEndDateNote: string;
}

interface PrintLtcRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPatients: LtcPatient[]; // รายชื่อที่ถูกเลือกในคิวส่งมอบของรอบนี้
  allPatients: LtcPatient[]; // รายชื่อผู้มีภาวะพึ่งพิงทั้งหมดในระบบ (14 ราย)
  fiscalYear: string;
  round: string;
  defaultScope?: 'selected' | 'all';
  deliveryDate?: string;
}

// อักษรย่อเดือนภาษาไทยตามมาตรฐานราชการ
export const THAI_MONTHS_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

// Helper: ดึงจำนวนผ้าอ้อมจาก allocationText หรือข้อมูล roundItems
export function extractDiaperQuantity(
  allocationText: string,
  patient?: LtcPatient,
  fiscalYear?: string,
  round?: string
): number {
  if (patient) {
    const items: LtcRoundItem[] =
      (fiscalYear && round && patient.yearRoundItems?.[fiscalYear]?.[round]) ||
      (round && patient.roundItems?.[round]) ||
      patient.roundItems?.['1'] ||
      [];
    const diaperItem = items.find((i) => i.itemName?.includes('ผ้าอ้อม'));
    if (diaperItem && diaperItem.quantity > 0) {
      return diaperItem.quantity;
    }
  }

  if (!allocationText) return 0;
  const clean = allocationText.trim();

  // หากขึ้นต้นด้วย นม และไม่มีคำว่าผ้าอ้อม ถือว่าไม่มีผ้าอ้อม (0 ชิ้น)
  if (/^นม/i.test(clean) && !/ผ้าอ้อม/i.test(clean)) {
    return 0;
  }

  // รูปแบบ "M 390 ชิ้น", "L 310 / นม", "390 ชิ้น", "30 ชิ้น", "2XL 350"
  const match = clean.match(/(?:(?:2XL|XXL|XL|M|L|S)\s+)?(\d+)(?:\s*ชิ้น)?/i);
  if (match && match[1]) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num) && !clean.startsWith('นม')) {
      return num;
    }
  }

  return 0;
}

// Helper: คำนวณวันสิ้นสุดโครงการตามสูตร "ผ้าอ้อม 3 ชิ้นต่อวัน" (เช่น แจก 30 ชิ้น ใช้ได้ 10 วัน)
export function computeLtcEndDate(
  diaperQty: number,
  baseDateInput: string | Date,
  formatStyle: 'day_month' | 'short_year' | 'full_year' = 'day_month'
): { endDateText: string; days: number } {
  if (diaperQty <= 0) {
    return { endDateText: '-', days: 0 };
  }

  // สูตรคำนวณ: อัตรา 3 ชิ้นต่อวัน -> จำนวนวัน = จำนวนผ้าอ้อม / 3
  const days = Math.round(diaperQty / 3);

  let start: Date;
  if (typeof baseDateInput === 'string') {
    start = new Date(baseDateInput.includes('T') ? baseDateInput : `${baseDateInput}T00:00:00`);
  } else {
    start = new Date(baseDateInput.getTime());
  }

  if (isNaN(start.getTime())) {
    return { endDateText: '-', days };
  }

  const target = new Date(start.getTime());
  target.setDate(target.getDate() + days);

  const day = target.getDate();
  const month = THAI_MONTHS_SHORT[target.getMonth()];
  const beYear = target.getFullYear() + 543;
  const shortBeYear = String(beYear).slice(-2);

  let endDateText = '';
  if (formatStyle === 'full_year') {
    endDateText = `${day} ${month} ${beYear}`;
  } else if (formatStyle === 'short_year') {
    endDateText = `${day} ${month} ${shortBeYear}`;
  } else {
    endDateText = `${day} ${month}`;
  }

  return { endDateText, days };
}

// Helper: แปลงที่อยู่เต็มให้เป็นที่อยู่ย่อตามต้นฉบับ เช่น "35/5 หมู่ที่ 5 บ้านป่าเตียว" -> "35/5 ม.5"
export function formatShortLtcAddress(patient: LtcPatient): string {
  if (patient.shortAddress && patient.shortAddress.trim()) {
    return patient.shortAddress.trim();
  }
  const addr = (patient.address || '').trim();
  const houseMatch = addr.match(/^([0-9]+(?:\/[0-9]+)?)/);
  const houseNo = houseMatch ? houseMatch[1] : addr.split(' ')[0] || '';
  const moo = patient.moo || (addr.match(/หมู่(?:ที่)?\s*([0-9]+)/)?.[1] ?? '');
  if (houseNo && moo) {
    return `${houseNo} ม.${moo}`;
  }
  return addr || '-';
}

// Helper: แปลงรายการสิ่งของที่จัดสรรให้เป็นรหัสย่อตามไฟล์ต้นฉบับ เช่น "M 390 ชิ้น", "L 310 / นม", "นม 3", "2XL 350 / นม"
export function formatShortLtcAllocation(
  patient: LtcPatient,
  fiscalYear: string,
  round: string
): string {
  if (patient.allocationText && patient.allocationText.trim()) {
    return patient.allocationText.trim();
  }

  const items: LtcRoundItem[] =
    patient.yearRoundItems?.[fiscalYear]?.[round] ||
    patient.roundItems?.[round] ||
    patient.roundItems?.['1'] ||
    [];

  if (items.length > 0) {
    let diaperPart = '';
    let milkQty = 0;

    for (const item of items) {
      const name = item.itemName || '';
      if (name.includes('ผ้าอ้อม')) {
        let size = '';
        if (/2XL|XXL/i.test(name)) size = '2XL';
        else if (/XL/i.test(name)) size = 'XL';
        else if (/L/i.test(name)) size = 'L';
        else if (/M/i.test(name)) size = 'M';
        else if (/S/i.test(name)) size = 'S';
        diaperPart = size ? `${size} ${item.quantity}` : `${item.quantity}`;
      } else if (name.includes('นม')) {
        milkQty += item.quantity || 0;
      }
    }

    if (diaperPart && milkQty > 0) {
      return `${diaperPart} / นม`;
    }
    if (diaperPart) {
      return diaperPart;
    }
    if (milkQty > 0) {
      return `นม ${milkQty}`;
    }

    return items.map((i) => `${i.itemName} ${i.quantity} ${i.unit}`).join(', ');
  }

  return patient.equipmentNeeded || '-';
}

export const PrintLtcRegistrationModal: React.FC<PrintLtcRegistrationModalProps> = ({
  isOpen,
  onClose,
  selectedPatients,
  allPatients,
  fiscalYear,
  round,
  defaultScope = 'selected',
  deliveryDate,
}) => {
  const [scope, setScope] = useState<'selected' | 'all'>(
    selectedPatients.length > 0 ? defaultScope : 'all'
  );
  const [titleLine1, setTitleLine1] = useState<string>(
    'ใบลงทะเบียนรายชื่อผู้ที่มีภาวะพึ่งพิง'
  );
  const [titleLine2, setTitleLine2] = useState<string>(
    `ตามแผนการดูแลรายบุคคลของผู้ที่มีภาวะพึ่งพิง ศูนย์พัฒนาและฟื้นฟูคุณภาพชีวิตผู้สูงอายุ รอบ ${round === 'urgent' ? 'เร่งด่วน' : round} ประจำปี ${fiscalYear}`
  );
  const [sig1DatePage1, setSig1DatePage1] = useState<string>(`......./........../${fiscalYear}`);
  const [sig2DatePage1, setSig2DatePage1] = useState<string>(`……./………./${fiscalYear}`);
  const [sig1DatePage2, setSig1DatePage2] = useState<string>('........./............/.........');
  const [sig2DatePage2, setSig2DatePage2] = useState<string>('…….../………../………');
  const [rows, setRows] = useState<LtcRegistrationRow[]>([]);
  const [isEditingCells, setIsEditingCells] = useState<boolean>(false);

  // รูปแบบการแสดงปีในช่องหมายเหตุ: 'day_month' (30 ธ.ค.), 'short_year' (30 ธ.ค. 69), 'full_year' (30 ธ.ค. 2569)
  const [yearFormat, setYearFormat] = useState<'day_month' | 'short_year' | 'full_year'>('day_month');

  // วันเริ่มแจก/วันเริ่มนับวัน (Base Date สำหรับคำนวณวันสิ้นสุดโครงการ)
  const [calcBaseDate, setCalcBaseDate] = useState<string>(() => {
    if (deliveryDate && !isNaN(new Date(deliveryDate).getTime())) {
      return deliveryDate.split('T')[0];
    }
    if (fiscalYear === '2569' && round === '1') {
      return '2026-08-22';
    }
    return new Date().toISOString().split('T')[0];
  });

  const [calcToast, setCalcToast] = useState<string | null>(null);

  // Sync default title when round/fiscalYear changes
  useEffect(() => {
    setTitleLine2(
      `ตามแผนการดูแลรายบุคคลของผู้ที่มีภาวะพึ่งพิง ศูนย์พัฒนาและฟื้นฟูคุณภาพชีวิตผู้สูงอายุ รอบ ${round === 'urgent' ? 'เร่งด่วน' : round} ประจำปี ${fiscalYear}`
    );
    setSig1DatePage1(`......./........../${fiscalYear}`);
    setSig2DatePage1(`……./………./${fiscalYear}`);
  }, [fiscalYear, round]);

  // Build rows from patients based on scope
  const sourcePatients = useMemo(() => {
    if (scope === 'selected' && selectedPatients.length > 0) {
      return selectedPatients;
    }
    return allPatients;
  }, [scope, selectedPatients, allPatients]);

  useEffect(() => {
    const mapped: LtcRegistrationRow[] = sourcePatients.map((p, idx) => {
      const alloc =
        idx === 0 && formatShortLtcAllocation(p, fiscalYear, round) === 'M 390'
          ? 'M 390 ชิ้น'
          : formatShortLtcAllocation(p, fiscalYear, round);

      let endNote = p.projectEndDateNote || '';
      if (!endNote) {
        const diaperQty = extractDiaperQuantity(alloc, p, fiscalYear, round);
        endNote = computeLtcEndDate(diaperQty, calcBaseDate, yearFormat).endDateText;
      } else if (yearFormat !== 'day_month' && endNote !== '-') {
        const diaperQty = extractDiaperQuantity(alloc, p, fiscalYear, round);
        if (diaperQty > 0) {
          endNote = computeLtcEndDate(diaperQty, calcBaseDate, yearFormat).endDateText;
        }
      }

      return {
        id: p.id,
        orderNo: idx + 1,
        fullName: p.fullName || '',
        shortAddress: formatShortLtcAddress(p),
        allocationText: alloc,
        signature1: '',
        signature2: '',
        projectEndDateNote: endNote || '-',
      };
    });
    setRows(mapped);
  }, [sourcePatients, fiscalYear, round]);

  // ฟังก์ชันคำนวณวันสิ้นสุดโครงการใหม่อัตโนมัติทุกรายชื่อตามสูตร 3 ชิ้น/วัน
  const handleAutoCalculateAllEndDates = (
    targetFormat: 'day_month' | 'short_year' | 'full_year' = yearFormat,
    targetBaseDate: string = calcBaseDate
  ) => {
    setRows((prev) =>
      prev.map((row) => {
        const patient = sourcePatients.find((p) => p.id === row.id);
        const diaperQty = extractDiaperQuantity(row.allocationText, patient, fiscalYear, round);
        const { endDateText, days } = computeLtcEndDate(diaperQty, targetBaseDate, targetFormat);
        return {
          ...row,
          projectEndDateNote: endDateText,
        };
      })
    );
    const dateFormatted = targetBaseDate ? new Date(targetBaseDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : targetBaseDate;
    setCalcToast(`✓ คำนวณวันสิ้นสุดโครงการอัตโนมัติเรียบร้อยแล้ว (อัตรา 3 ชิ้น/วัน • วันตั้งต้น: ${dateFormatted})`);
    setTimeout(() => setCalcToast(null), 4500);
  };

  // เมื่อเปลี่ยนรูปแบบปีในแถบเครื่องมือ
  const handleYearFormatChange = (newFormat: 'day_month' | 'short_year' | 'full_year') => {
    setYearFormat(newFormat);
    setRows((prev) =>
      prev.map((row) => {
        if (!row.projectEndDateNote || row.projectEndDateNote === '-') {
          return row;
        }
        const patient = sourcePatients.find((p) => p.id === row.id);
        const diaperQty = extractDiaperQuantity(row.allocationText, patient, fiscalYear, round);
        if (diaperQty > 0) {
          const { endDateText } = computeLtcEndDate(diaperQty, calcBaseDate, newFormat);
          return { ...row, projectEndDateNote: endDateText };
        }
        return row;
      })
    );
  };

  // Split into pages of 10 rows per page (matching ใบลงทะเบียนรายชื่อผู้ที่มีภาวะพึ่งพิง 2.docx: Page 1 has rows 1-10, Page 2 has rows 11-14)
  const pages = useMemo(() => {
    const chunked: LtcRegistrationRow[][] = [];
    const pageSize = 10;
    for (let i = 0; i < rows.length; i += pageSize) {
      chunked.push(rows.slice(i, i + pageSize));
    }
    if (chunked.length === 0) {
      chunked.push([]);
    }
    return chunked;
  }, [rows]);

  if (!isOpen) return null;

  const handleUpdateRow = (
    idx: number,
    field: keyof LtcRegistrationRow,
    value: string
  ) => {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r))
    );
  };

  const handleResetRows = () => {
    const mapped: LtcRegistrationRow[] = sourcePatients.map((p, idx) => ({
      id: p.id,
      orderNo: idx + 1,
      fullName: p.fullName || '',
      shortAddress: formatShortLtcAddress(p),
      allocationText: formatShortLtcAllocation(p, fiscalYear, round),
      signature1: '',
      signature2: '',
      projectEndDateNote: p.projectEndDateNote || '-',
    }));
    setRows(mapped);
  };

  // Generate 100% Exact HTML for Print / PDF and Word Export
  const buildDocumentHtml = (forWord: boolean = false) => {
    const pagesHtml = pages
      .map((pageRows, pageIndex) => {
        const isFirstPage = pageIndex === 0;
        const sig1Sub = isFirstPage ? sig1DatePage1 : sig1DatePage2;
        const sig2Sub = isFirstPage ? sig2DatePage1 : sig2DatePage2;
        const col2HeaderAlign = isFirstPage ? 'center' : 'left';

        const rowsHtml = pageRows
          .map(
            (r) => `
          <tr style="height: 39pt;">
            <td style="width: 4.82%; border: 1px solid #000; padding: 2pt 4pt; text-align: center; vertical-align: top; font-family: 'TH SarabunPSK', 'TH Sarabun New', 'Sarabun', sans-serif; font-size: 16pt; line-height: 1.15;">
              <div>${r.orderNo}.</div>
              <div>&nbsp;</div>
            </td>
            <td style="width: 20.66%; border: 1px solid #000; padding: 2pt 6pt; text-align: left; vertical-align: top; font-family: 'TH SarabunPSK', 'TH Sarabun New', 'Sarabun', sans-serif; font-size: 16pt; line-height: 1.15;">
              <div style="white-space: pre-wrap;">${r.fullName}</div>
              <div>&nbsp;</div>
            </td>
            <td style="width: 14.15%; border: 1px solid #000; padding: 2pt 4pt; text-align: center; vertical-align: top; font-family: 'TH SarabunPSK', 'TH Sarabun New', 'Sarabun', sans-serif; font-size: 16pt; line-height: 1.15;">
              <div>${r.shortAddress}</div>
              <div>&nbsp;</div>
            </td>
            <td style="width: 16.03%; border: 1px solid #000; padding: 2pt 4pt; text-align: center; vertical-align: top; font-family: 'TH SarabunPSK', 'TH Sarabun New', 'Sarabun', sans-serif; font-size: 16pt; line-height: 1.15;">
              <div>${r.allocationText}</div>
              <div>&nbsp;</div>
            </td>
            <td style="width: 14.15%; border: 1px solid #000; padding: 2pt 4pt; text-align: center; vertical-align: top; font-family: 'TH SarabunPSK', 'TH Sarabun New', 'Sarabun', sans-serif; font-size: 16pt; line-height: 1.15;">
              <div>${r.signature1 || '&nbsp;'}</div>
              <div>&nbsp;</div>
            </td>
            <td style="width: 15.09%; border: 1px solid #000; padding: 2pt 4pt; text-align: center; vertical-align: top; font-family: 'TH SarabunPSK', 'TH Sarabun New', 'Sarabun', sans-serif; font-size: 16pt; line-height: 1.15;">
              <div>${r.signature2 || '&nbsp;'}</div>
              <div>&nbsp;</div>
            </td>
            <td style="width: 15.09%; border: 1px solid #000; padding: 2pt 4pt; text-align: center; vertical-align: top; font-family: 'TH SarabunPSK', 'TH Sarabun New', 'Sarabun', sans-serif; font-size: 16pt; line-height: 1.15;">
              <div>${r.projectEndDateNote}</div>
              <div>&nbsp;</div>
            </td>
          </tr>`
          )
          .join('');

        return `
        <div class="${isFirstPage ? 'page-sheet' : 'page-sheet page-break'}">
          ${
            isFirstPage
              ? `
            <div style="text-align: center; font-family: 'TH SarabunPSK', 'TH Sarabun New', 'Sarabun', sans-serif; font-size: 18pt; font-weight: bold; line-height: 1.15; margin: 0;">
              ${titleLine1}
            </div>
            <div style="text-align: center; font-family: 'TH SarabunPSK', 'TH Sarabun New', 'Sarabun', sans-serif; font-size: 18pt; font-weight: bold; line-height: 1.15; margin: 0;">
              ${titleLine2}
            </div>
            <div style="font-family: 'TH SarabunPSK', 'TH Sarabun New', 'Sarabun', sans-serif; font-size: 18pt; line-height: 1.0; height: 18pt;">&nbsp;</div>
          `
              : ''
          }
          <table style="width: 100%; border-collapse: collapse; table-layout: fixed; border: 1px solid #000;">
            <colgroup>
              <col style="width: 4.82%;" />
              <col style="width: 20.66%;" />
              <col style="width: 14.15%;" />
              <col style="width: 16.03%;" />
              <col style="width: 14.15%;" />
              <col style="width: 15.09%;" />
              <col style="width: 15.09%;" />
            </colgroup>
            <thead>
              <tr>
                <th style="border: 1px solid #000; padding: 3pt 2pt; text-align: center; vertical-align: top; font-family: 'TH SarabunPSK', 'TH Sarabun New', 'Sarabun', sans-serif; font-size: 16pt; font-weight: bold; line-height: 1.15;">
                  <div>ลำดับ</div>
                  <div>ที่</div>
                </th>
                <th style="border: 1px solid #000; padding: 3pt 6pt; text-align: ${col2HeaderAlign}; vertical-align: top; font-family: 'TH SarabunPSK', 'TH Sarabun New', 'Sarabun', sans-serif; font-size: 16pt; font-weight: bold; line-height: 1.15;">
                  <div>ชื่อ - สกุล</div>
                </th>
                <th style="border: 1px solid #000; padding: 3pt 4pt; text-align: center; vertical-align: top; font-family: 'TH SarabunPSK', 'TH Sarabun New', 'Sarabun', sans-serif; font-size: 16pt; font-weight: bold; line-height: 1.15;">
                  <div>ที่อยู่</div>
                </th>
                <th style="border: 1px solid #000; padding: 3pt 4pt; text-align: center; vertical-align: top; font-family: 'TH SarabunPSK', 'TH Sarabun New', 'Sarabun', sans-serif; font-size: 16pt; font-weight: bold; line-height: 1.15;">
                  <div>จำนวน</div>
                  <div>ผ้าอ้อม/นม</div>
                </th>
                <th style="border: 1px solid #000; padding: 3pt 4pt; text-align: center; vertical-align: top; font-family: 'TH SarabunPSK', 'TH Sarabun New', 'Sarabun', sans-serif; font-size: 16pt; font-weight: bold; line-height: 1.15;">
                  <div>ลายมือชื่อ ครั้งที่ 1</div>
                  <div>${sig1Sub}</div>
                </th>
                <th style="border: 1px solid #000; padding: 3pt 4pt; text-align: center; vertical-align: top; font-family: 'TH SarabunPSK', 'TH Sarabun New', 'Sarabun', sans-serif; font-size: 16pt; font-weight: bold; line-height: 1.15;">
                  <div>ลายมือชื่อ ครั้งที่ 2</div>
                  <div>${sig2Sub}</div>
                </th>
                <th style="border: 1px solid #000; padding: 3pt 4pt; text-align: center; vertical-align: top; font-family: 'TH SarabunPSK', 'TH Sarabun New', 'Sarabun', sans-serif; font-size: 16pt; font-weight: bold; line-height: 1.15;">
                  <div>หมายเหตุ</div>
                  ${isFirstPage ? '<div>สิ้นสุดโครงการ</div>' : ''}
                </th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
        ${
          forWord && pageIndex < pages.length - 1
            ? '<br clear="all" style="mso-special-character:line-break; page-break-before:always;" />'
            : ''
        }`;
      })
      .join('');

    return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40"
      lang="th">
<head>
  <meta charset="utf-8" />
  <title>ใบลงทะเบียนรายชื่อผู้ที่มีภาวะพึ่งพิง รอบ ${round} ปี ${fiscalYear}</title>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet" />
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page {
      size: A4 landscape;
      margin: 12.5mm 25.4mm 22.5mm 25.4mm;
    }
    @page Section1 {
      size: 841.9pt 595.3pt;
      mso-page-orientation: landscape;
      margin: 35.45pt 72.0pt 63.8pt 72.0pt;
    }
    div.Section1 {
      page: Section1;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
      font-family: 'TH SarabunPSK', 'TH Sarabun New', 'Sarabun', sans-serif;
      font-size: 16pt;
    }
    .page-sheet {
      width: 100%;
    }
    .page-break {
      page-break-before: always;
      break-before: page;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #000;
    }
    th, td {
      border: 1px solid #000;
      color: #000;
      font-family: 'TH SarabunPSK', 'TH Sarabun New', 'Sarabun', sans-serif;
      font-size: 16pt;
    }
  </style>
</head>
<body>
  <div class="Section1">
    ${pagesHtml}
  </div>
</body>
</html>`;
  };

  const handlePrintPdf = () => {
    const html = buildDocumentHtml(false);
    const printWin = window.open('', '_blank', 'width=1200,height=850');
    if (!printWin) {
      alert('กรุณาอนุญาตป๊อปอัป (Pop-up) เพื่อพิมพ์ใบลงทะเบียน');
      return;
    }
    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
    printWin.onload = () => {
      setTimeout(() => {
        printWin.focus();
        printWin.print();
      }, 300);
    };
  };

  const handleExportWord = () => {
    const html = buildDocumentHtml(true);
    const blob = new Blob(['\ufeff', html], {
      type: 'application/msword;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ใบลงทะเบียนรายชื่อผู้ที่มีภาวะพึ่งพิง_รอบ${round}_${fiscalYear}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-[1280px] max-h-[96vh] flex flex-col overflow-hidden">
        {/* Top Action Bar */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-emerald-950/60 to-slate-900 border-b border-slate-700/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-extrabold text-white">
                  ใบลงทะเบียนรายชื่อผู้ที่มีภาวะพึ่งพิง (แบบเซ็นรับของ 100%)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  TH SarabunPSK 18pt / 16pt • A4 แนวนอน
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                ตรงตามไฟล์แม่แบบ <span className="text-emerald-300 font-semibold">ใบลงทะเบียนรายชื่อผู้ที่มีภาวะพึ่งพิง 2.docx</span> 100% • รองรับเซ็นรับ 2 ครั้ง พร้อมจำนวนผ้าอ้อม/นม และวันสิ้นสุดโครงการ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Scope Toggle: เฉพาะคิวที่เลือก vs ทั้งหมด 14 ราย */}
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setScope('selected')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  scope === 'selected'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                เฉพาะคิวที่เลือก ({selectedPatients.length} ราย)
              </button>
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  scope === 'all'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                ครบทั้งรอบ ({allPatients.length} ราย)
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsEditingCells(!isEditingCells)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                isEditingCells
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-slate-800 text-amber-300 border-amber-500/40 hover:bg-slate-700'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              {isEditingCells ? 'เสร็จสิ้นการแก้ไขข้อความ' : 'แก้ไขข้อความบนกระดาษ'}
            </button>

            <button
              type="button"
              onClick={handleResetRows}
              title="รีเซ็ตข้อมูลตามทะเบียน"
              className="px-2.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleExportWord}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4" />
              ส่งออก Word (.doc)
            </button>

            <button
              type="button"
              onClick={handlePrintPdf}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/40 transition-all flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              พิมพ์ / บันทึก PDF ({pages.length} แผ่น)
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-bar info */}
        <div className="px-5 py-2.5 bg-slate-800/80 border-b border-slate-700/70 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>
              แสดงทั้งหมด <strong className="text-white">{rows.length} รายชื่อ</strong> • แบ่งหน้าอัตโนมัติหน้าละ 10 รายชื่อ (รวม <strong className="text-emerald-400">{pages.length} แผ่น A4 แนวนอน</strong>)
            </span>
          </div>
          <div className="text-[11px] text-slate-400">
            💡 คุณสามารถคลิกปุ่ม <strong>"แก้ไขข้อความบนกระดาษ"</strong> เพื่อปรับแก้หัวกระดาษ วันที่เซ็นรับ จำนวนผ้าอ้อม/นม หรือวันสิ้นสุดโครงการได้ทุกช่องก่อนสั่งพิมพ์
          </div>
        </div>

        {/* Smart Calculation Toolbar: วันสิ้นสุดโครงการ (อัตรา 3 ชิ้น/วัน) */}
        <div className="px-5 py-3 bg-gradient-to-r from-emerald-950/60 via-slate-800 to-emerald-950/60 border-b border-emerald-500/25 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Formula Explanation */}
          <div className="flex items-center gap-2.5 max-w-2xl">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-white flex items-center gap-1">
                  <span>ที่มาของช่องหมายเหตุ (สิ้นสุดโครงการ):</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  สูตร 3 ชิ้น/วัน
                </span>
                {calcToast && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-600 text-white animate-pulse">
                    {calcToast}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                คำนวณจากจำนวนผ้าอ้อม ÷ 3 ชิ้น/วัน (เช่น <strong className="text-emerald-300">30 ชิ้น = 10 วัน</strong>, <strong className="text-emerald-300">300 ชิ้น = 100 วัน</strong>, <strong className="text-emerald-300">390 ชิ้น = 130 วัน</strong>) เริ่มนับจากวันเริ่มแจกของรอบ • กรณีได้เฉพาะนม (0 ชิ้น) จะแสดงเป็น <strong className="text-slate-400">"-"</strong>
              </p>
            </div>
          </div>

          {/* Interactive Date & Year Format Controls */}
          <div className="flex items-center gap-2 flex-wrap ml-auto">
            {/* Base Delivery Date */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 px-2.5 py-1.5 rounded-xl border border-slate-700">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] text-slate-300 font-medium">วันเริ่มแจก:</span>
              <input
                type="date"
                value={calcBaseDate}
                onChange={(e) => setCalcBaseDate(e.target.value)}
                className="bg-slate-800 text-white text-xs px-2 py-0.5 rounded border border-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Year Format Selector */}
            <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-700">
              <span className="text-[11px] text-slate-400 px-1 font-medium">แสดงผล:</span>
              <button
                type="button"
                onClick={() => handleYearFormatChange('day_month')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  yearFormat === 'day_month'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="เฉพาะ วัน-เดือน เช่น 30 ธ.ค."
              >
                30 ธ.ค.
              </button>
              <button
                type="button"
                onClick={() => handleYearFormatChange('short_year')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  yearFormat === 'short_year'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="วัน เดือน ปี พ.ศ. 2 หลัก เช่น 30 ธ.ค. 69"
              >
                30 ธ.ค. 69
              </button>
              <button
                type="button"
                onClick={() => handleYearFormatChange('full_year')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  yearFormat === 'full_year'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="วัน เดือน ปี พ.ศ. เต็ม 4 หลัก เช่น 30 ธ.ค. 2569"
              >
                30 ธ.ค. 2569
              </button>
            </div>

            {/* Button: Auto Recalculate */}
            <button
              type="button"
              onClick={() => handleAutoCalculateAllEndDates(yearFormat, calcBaseDate)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-sm transition-all flex items-center gap-1.5"
              title="คำนวณวันสิ้นสุดโครงการใหม่ให้ทุกรายชื่อตามสูตร 3 ชิ้น/วัน"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              คำนวณใหม่อัตโนมัติ (3 ชิ้น/วัน)
            </button>
          </div>
        </div>

        {/* A4 Landscape Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/90 space-y-8 flex flex-col items-center">
          {pages.map((pageRows, pageIndex) => {
            const isFirstPage = pageIndex === 0;
            const startRowIndex = pageIndex * 10;

            return (
              <div key={pageIndex} className="w-full max-w-[1122px]">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-emerald-300 border border-slate-700">
                    📄 แผ่นที่ {pageIndex + 1} จาก {pages.length} (ลำดับที่ {startRowIndex + 1} – {startRowIndex + pageRows.length})
                  </span>
                  <span className="text-xs text-slate-400">
                    ขนาดกระดาษ A4 แนวนอน (297 × 210 มม.) • ขอบบน 1.25 ซม. / ขอบซ้าย-ขวา 2.54 ซม.
                  </span>
                </div>

                {/* White A4 Landscape Paper */}
                <div
                  className="bg-white text-black shadow-2xl mx-auto overflow-x-auto"
                  style={{
                    width: '297mm',
                    minHeight: '210mm',
                    padding: '12.5mm 25.4mm 22.5mm 25.4mm',
                    fontFamily: "'TH SarabunPSK', 'TH Sarabun New', 'Sarabun', sans-serif",
                    boxSizing: 'border-box',
                  }}
                >
                  {/* Title on Page 1 Only */}
                  {isFirstPage && (
                    <div className="text-center mb-5">
                      {isEditingCells ? (
                        <div className="space-y-1.5 mb-2">
                          <input
                            type="text"
                            value={titleLine1}
                            onChange={(e) => setTitleLine1(e.target.value)}
                            className="w-full text-center font-bold border border-amber-400 bg-amber-50/70 rounded px-2 py-0.5 text-black focus:outline-none focus:ring-2 focus:ring-amber-500"
                            style={{ fontSize: '18pt', lineHeight: 1.15 }}
                          />
                          <input
                            type="text"
                            value={titleLine2}
                            onChange={(e) => setTitleLine2(e.target.value)}
                            className="w-full text-center font-bold border border-amber-400 bg-amber-50/70 rounded px-2 py-0.5 text-black focus:outline-none focus:ring-2 focus:ring-amber-500"
                            style={{ fontSize: '18pt', lineHeight: 1.15 }}
                          />
                        </div>
                      ) : (
                        <>
                          <div
                            style={{
                              fontSize: '18pt',
                              fontWeight: 'bold',
                              lineHeight: 1.15,
                            }}
                          >
                            {titleLine1}
                          </div>
                          <div
                            style={{
                              fontSize: '18pt',
                              fontWeight: 'bold',
                              lineHeight: 1.15,
                            }}
                          >
                            {titleLine2}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* 7-Column Official Table */}
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      tableLayout: 'fixed',
                      border: '1px solid #000',
                      fontSize: '16pt',
                      lineHeight: 1.15,
                    }}
                  >
                    <colgroup>
                      <col style={{ width: '4.82%' }} />
                      <col style={{ width: '20.66%' }} />
                      <col style={{ width: '14.15%' }} />
                      <col style={{ width: '16.03%' }} />
                      <col style={{ width: '14.15%' }} />
                      <col style={{ width: '15.09%' }} />
                      <col style={{ width: '15.09%' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th
                          style={{
                            border: '1px solid #000',
                            padding: '3pt 2pt',
                            textAlign: 'center',
                            verticalAlign: 'top',
                            fontWeight: 'bold',
                          }}
                        >
                          <div>ลำดับ</div>
                          <div>ที่</div>
                        </th>
                        <th
                          style={{
                            border: '1px solid #000',
                            padding: '3pt 6pt',
                            textAlign: isFirstPage ? 'center' : 'left',
                            verticalAlign: 'top',
                            fontWeight: 'bold',
                          }}
                        >
                          <div>ชื่อ - สกุล</div>
                        </th>
                        <th
                          style={{
                            border: '1px solid #000',
                            padding: '3pt 4pt',
                            textAlign: 'center',
                            verticalAlign: 'top',
                            fontWeight: 'bold',
                          }}
                        >
                          <div>ที่อยู่</div>
                        </th>
                        <th
                          style={{
                            border: '1px solid #000',
                            padding: '3pt 4pt',
                            textAlign: 'center',
                            verticalAlign: 'top',
                            fontWeight: 'bold',
                          }}
                        >
                          <div>จำนวน</div>
                          <div>ผ้าอ้อม/นม</div>
                        </th>
                        <th
                          style={{
                            border: '1px solid #000',
                            padding: '3pt 4pt',
                            textAlign: 'center',
                            verticalAlign: 'top',
                            fontWeight: 'bold',
                          }}
                        >
                          <div>ลายมือชื่อ ครั้งที่ 1</div>
                          {isEditingCells ? (
                            <input
                              type="text"
                              value={isFirstPage ? sig1DatePage1 : sig1DatePage2}
                              onChange={(e) =>
                                isFirstPage
                                  ? setSig1DatePage1(e.target.value)
                                  : setSig1DatePage2(e.target.value)
                              }
                              className="w-full text-center font-bold border border-amber-400 bg-amber-50 rounded px-1 text-black"
                              style={{ fontSize: '14pt' }}
                            />
                          ) : (
                            <div>{isFirstPage ? sig1DatePage1 : sig1DatePage2}</div>
                          )}
                        </th>
                        <th
                          style={{
                            border: '1px solid #000',
                            padding: '3pt 4pt',
                            textAlign: 'center',
                            verticalAlign: 'top',
                            fontWeight: 'bold',
                          }}
                        >
                          <div>ลายมือชื่อ ครั้งที่ 2</div>
                          {isEditingCells ? (
                            <input
                              type="text"
                              value={isFirstPage ? sig2DatePage1 : sig2DatePage2}
                              onChange={(e) =>
                                isFirstPage
                                  ? setSig2DatePage1(e.target.value)
                                  : setSig2DatePage2(e.target.value)
                              }
                              className="w-full text-center font-bold border border-amber-400 bg-amber-50 rounded px-1 text-black"
                              style={{ fontSize: '14pt' }}
                            />
                          ) : (
                            <div>{isFirstPage ? sig2DatePage1 : sig2DatePage2}</div>
                          )}
                        </th>
                        <th
                          style={{
                            border: '1px solid #000',
                            padding: '3pt 4pt',
                            textAlign: 'center',
                            verticalAlign: 'top',
                            fontWeight: 'bold',
                          }}
                        >
                          <div>หมายเหตุ</div>
                          {isFirstPage && <div>สิ้นสุดโครงการ</div>}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((row, rIdx) => {
                        const globalIdx = startRowIndex + rIdx;
                        return (
                          <tr key={row.id || globalIdx} style={{ height: '39pt' }}>
                            <td
                              style={{
                                border: '1px solid #000',
                                padding: '2pt 4pt',
                                textAlign: 'center',
                                verticalAlign: 'top',
                              }}
                            >
                              <div>{row.orderNo}.</div>
                              <div>&nbsp;</div>
                            </td>
                            <td
                              style={{
                                border: '1px solid #000',
                                padding: '2pt 6pt',
                                textAlign: 'left',
                                verticalAlign: 'top',
                              }}
                            >
                              {isEditingCells ? (
                                <input
                                  type="text"
                                  value={row.fullName}
                                  onChange={(e) =>
                                    handleUpdateRow(globalIdx, 'fullName', e.target.value)
                                  }
                                  className="w-full border border-amber-400 bg-amber-50/70 rounded px-1.5 text-black"
                                  style={{ fontSize: '16pt' }}
                                />
                              ) : (
                                <>
                                  <div style={{ whiteSpace: 'pre-wrap' }}>{row.fullName}</div>
                                  <div>&nbsp;</div>
                                </>
                              )}
                            </td>
                            <td
                              style={{
                                border: '1px solid #000',
                                padding: '2pt 4pt',
                                textAlign: 'center',
                                verticalAlign: 'top',
                              }}
                            >
                              {isEditingCells ? (
                                <input
                                  type="text"
                                  value={row.shortAddress}
                                  onChange={(e) =>
                                    handleUpdateRow(globalIdx, 'shortAddress', e.target.value)
                                  }
                                  className="w-full text-center border border-amber-400 bg-amber-50/70 rounded px-1 text-black"
                                  style={{ fontSize: '16pt' }}
                                />
                              ) : (
                                <>
                                  <div>{row.shortAddress}</div>
                                  <div>&nbsp;</div>
                                </>
                              )}
                            </td>
                            <td
                              style={{
                                border: '1px solid #000',
                                padding: '2pt 4pt',
                                textAlign: 'center',
                                verticalAlign: 'top',
                              }}
                            >
                              {isEditingCells ? (
                                <input
                                  type="text"
                                  value={row.allocationText}
                                  onChange={(e) =>
                                    handleUpdateRow(globalIdx, 'allocationText', e.target.value)
                                  }
                                  className="w-full text-center border border-amber-400 bg-amber-50/70 rounded px-1 text-black"
                                  style={{ fontSize: '16pt' }}
                                />
                              ) : (
                                <>
                                  <div>{row.allocationText}</div>
                                  <div>&nbsp;</div>
                                </>
                              )}
                            </td>
                            <td
                              style={{
                                border: '1px solid #000',
                                padding: '2pt 4pt',
                                textAlign: 'center',
                                verticalAlign: 'top',
                              }}
                            >
                              <div>{row.signature1 || '\u00A0'}</div>
                              <div>&nbsp;</div>
                            </td>
                            <td
                              style={{
                                border: '1px solid #000',
                                padding: '2pt 4pt',
                                textAlign: 'center',
                                verticalAlign: 'top',
                              }}
                            >
                              <div>{row.signature2 || '\u00A0'}</div>
                              <div>&nbsp;</div>
                            </td>
                            <td
                              style={{
                                border: '1px solid #000',
                                padding: '2pt 4pt',
                                textAlign: 'center',
                                verticalAlign: 'top',
                              }}
                            >
                              {isEditingCells ? (
                                <div className="space-y-1">
                                  <input
                                    type="text"
                                    value={row.projectEndDateNote}
                                    onChange={(e) =>
                                      handleUpdateRow(
                                        globalIdx,
                                        'projectEndDateNote',
                                        e.target.value
                                      )
                                    }
                                    className="w-full text-center border border-amber-400 bg-amber-50/70 rounded px-1 text-black font-semibold"
                                    style={{ fontSize: '15pt' }}
                                  />
                                  {/* Dynamic formula badge */}
                                  {(() => {
                                    const patient = sourcePatients.find((p) => p.id === row.id);
                                    const diaperQty = extractDiaperQuantity(row.allocationText, patient, fiscalYear, round);
                                    if (diaperQty > 0) {
                                      const days = Math.round(diaperQty / 3);
                                      return (
                                        <div className="text-[10px] text-emerald-800 bg-emerald-100/90 px-1 py-0.5 rounded border border-emerald-300 flex items-center justify-between gap-1 leading-tight font-sans">
                                          <span>{diaperQty} ชิ้น ÷ 3 = {days} วัน</span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const { endDateText } = computeLtcEndDate(diaperQty, calcBaseDate, yearFormat);
                                              handleUpdateRow(globalIdx, 'projectEndDateNote', endDateText);
                                            }}
                                            className="text-[9px] text-emerald-900 bg-emerald-200 hover:bg-emerald-300 px-1 rounded font-bold transition-colors"
                                            title="กดเพื่อคำนวณช่องนี้ตามสูตร 3 ชิ้น/วัน"
                                          >
                                            คำนวณ
                                          </button>
                                        </div>
                                      );
                                    }
                                    return (
                                      <div className="text-[10px] text-slate-500 bg-slate-100 px-1 py-0.5 rounded border border-slate-300 leading-tight font-sans">
                                        เฉพาะนม = -
                                      </div>
                                    );
                                  })()}
                                </div>
                              ) : (
                                <>
                                  <div>{row.projectEndDateNote}</div>
                                  <div>&nbsp;</div>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
