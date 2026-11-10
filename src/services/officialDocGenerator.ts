import { generateOfficialMedicalLoanHtml } from './medicalLoanDocGenerator.ts';
import { LicenseRecord, SignerSettings, EquipmentLoan } from '../types/index.ts';
import { GARUDA_BASE64 } from '../data/garudaBase64.ts';
import { OFFICIAL_25_CRITERIA } from '../data/officialCriteria.ts';
import {
  exportOfficialLicenseDocx,
  cleanBoilerplateCondition,
  cleanSignerPosition,
  formatSignerPositionLines,
  splitBizCategoryForDocx,
  DocxLicensePayload,
} from './docxTemplateExporter.ts';

function escapeHtml(text?: string | null): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Helper for Thai short months
export function shortThaiMonth(m: string): string {
  const shortMonths: Record<string, string> = {
    'มกราคม': 'ม.ค.',
    'กุมภาพันธ์': 'ก.พ.',
    'มีนาคม': 'มี.ค.',
    'เมษายน': 'เม.ย.',
    'พฤษภาคม': 'พ.ค.',
    'มิถุนายน': 'มิ.ย.',
    'กรกฎาคม': 'ก.ค.',
    'สิงหาคม': 'ส.ค.',
    'กันยายน': 'ก.ย.',
    'ตุลาคม': 'ต.ค.',
    'พฤศจิกายน': 'พ.ย.',
    'ธันวาคม': 'ธ.ค.',
  };
  return shortMonths[m] || m || '';
}

// Helper for formatting Thai dates: dd MMMM yyyy
export function formatThaiDateParts(dateStr: string) {
  if (!dateStr || dateStr === '-' || dateStr === '.......') {
    return { d: '', m: '', y: '' };
  }
  // Try YYYY-MM-DD
  const parts = dateStr.split('T')[0].split('-');
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

  if (parts.length === 3 && parts[0].length === 4) {
    let y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (y > 4000) y = (y - 2500) + 543;
    if (y < 2400) y += 543;
    return {
      d: String(d),
      m: thaiMonths[m] || '',
      y: String(y),
    };
  }

  // Try DD/MM/YYYY
  if (dateStr.includes('/')) {
    const slashParts = dateStr.split('/');
    if (slashParts.length === 3) {
      const d = parseInt(slashParts[0], 10);
      const m = parseInt(slashParts[1], 10);
      let y = parseInt(slashParts[2], 10);
      if (y > 4000) y = (y - 2500) + 543;
      if (y < 2400) y += 543;
      return {
        d: String(d),
        m: thaiMonths[m] || '',
        y: String(y),
      };
    }
  }

  // Fallback: If it's already Thai string like "22 กรกฎาคม 2569"
  const spaceParts = dateStr.trim().split(/\s+/);
  if (spaceParts.length === 3) {
    let y = parseInt(spaceParts[2], 10);
    if (y > 4000) y = (y - 2500) + 543;
    return {
      d: spaceParts[0],
      m: spaceParts[1],
      y: isNaN(y) ? spaceParts[2] : String(y),
    };
  }

  return { d: dateStr, m: '', y: '' };
}

/**
 * 1. Generates 100% exact HTML replica of LicenseTemplate.html (2 pages A4 Thai government license)
 */
export function generateLicenseHtml(
  license: LicenseRecord,
  signers: SignerSettings,
  custom?: { fee?: string; feeText?: string; receiptBook?: string; receiptNo?: string }
): string {
  const lNoFull = (license.licenseNumber || '').replace('เลขที่', '').trim();
  const yearMatch = lNoFull.match(/\/(25\d{2})/);
  const docYear = yearMatch ? yearMatch[1] : (license.licenseYear || '2568');
  const lNo = lNoFull.includes('/') ? lNoFull.split('/')[0] : (lNoFull || '');
  const rawBookNo = (license.licenseBookNo || '').trim();
  const bNo = rawBookNo && !rawBookNo.includes('/') ? rawBookNo : '-';

  const owner = license.ownerName || '';
  const nat = license.nationality || 'ไทย';
  const oAddrNo = license.ownerAddressNo || license.businessAddressNo || '';
  const oMoo = license.ownerMoo || license.businessMoo || '';
  const oTrok = (license.ownerTrokSoi && license.ownerTrokSoi !== '-') ? license.ownerTrokSoi : '-';
  const oRoad = (license.ownerRoad && license.ownerRoad !== '-') ? license.ownerRoad : '-';
  const oTumbon = license.ownerSubdistrict || license.businessSubdistrict || 'บางเป้า';
  const oAmphoe = license.ownerDistrict || license.businessDistrict || 'กันตัง';
  const oProv = license.ownerProvince || license.businessProvince || 'ตรัง';
  const oPhone = license.ownerPhone || license.businessPhone || '';

  const bType = license.businessCategory || '';
  const bName = license.businessName || '';
  const bAddrNo = license.businessAddressNo || license.ownerAddressNo || '';
  const bMoo = license.businessMoo || license.ownerMoo || '';
  const bTrok = (license.businessTrokSoi && license.businessTrokSoi !== '-') ? license.businessTrokSoi : '-';
  const bRoad = (license.businessRoad && license.businessRoad !== '-') ? license.businessRoad : '-';
  const bTumbon = license.businessSubdistrict || 'บางเป้า';
  const bAmphoe = license.businessDistrict || 'กันตัง';
  const bProv = license.businessProvince || 'ตรัง';
  const bPhone = license.businessPhone || license.ownerPhone || '';

  const fee = custom?.fee || (license.feeAmount ? `${license.feeAmount}.-` : '500.-');
  const feeT = custom?.feeText || (license.feeText ? `- ${license.feeText.replace(/^\s*-\s*|\s*-\s*$/g, '')} -` : '- ห้าร้อยบาทถ้วน -');
  const rawReceiptBook = (custom?.receiptBook || license.receiptBookNo || '').trim();
  const rBook = rawReceiptBook && !rawReceiptBook.includes('/') ? rawReceiptBook : '-';
  const rNo = custom?.receiptNo || license.receiptNo || '/2568';

  const sDate = formatThaiDateParts(license.approvalDate);
  const eDate = formatThaiDateParts(license.expireDate);
  const rDate = license.receiptDate ? formatThaiDateParts(license.receiptDate) : sDate;

  const rawExName = license.execName || signers.actingMayorName || signers.mayorName || 'นายละดม  เชื้อช่วย';
  const cleanExName = rawExName.replace(/^\s*\(+|\)+\s*$/g, '').trim();
  const formattedExName = cleanExName ? `(&nbsp;${cleanExName}&nbsp;)` : '(&nbsp;นายละดม  เชื้อช่วย&nbsp;)';
  const rawExPos = license.execPos || (signers.actingMayorPosition ? `${signers.actingMayorPosition} ${signers.actingMayorFor || 'นายกเทศมนตรีตำบลบางเป้า'}` : signers.mayorPos) || 'นายกเทศมนตรีตำบลบางเป้า';
  const cleanExPos = cleanSignerPosition(rawExPos);
  const posLines = formatSignerPositionLines(rawExPos);
  const posLinesHtml = posLines.map((l) => `<div>${l}</div>`).join('');
  const exPos = `ตำแหน่ง ${cleanExPos}`;

  const cond31 = cleanBoilerplateCondition(license.condition31);
  const cond32 = cleanBoilerplateCondition(license.condition32);

  const { b1: bType1, b2: bType2 } = splitBizCategoryForDocx(bType, '');

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>ใบอนุญาตประกอบกิจการที่เป็นอันตรายต่อสุขภาพ - ${bName || 'แบบฟอร์ม อภ.2'}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/gh/lazywasabi/thai-web-fonts@7/fonts/THSarabunNew/THSarabunNew.css" rel="stylesheet">
  <style>
    @font-face {
      font-family: 'TH Sarabun PSK';
      src: local('TH Sarabun PSK'), local('THSarabunPSK'), local('TH Sarabun New'), local('THSarabunNew'),
           url('https://cdn.jsdelivr.net/gh/lazywasabi/thai-web-fonts@7/fonts/THSarabunNew/THSarabunNew.woff2') format('woff2');
      font-weight: normal;
      font-style: normal;
    }
    @font-face {
      font-family: 'TH Sarabun PSK';
      src: local('TH Sarabun PSK Bold'), local('THSarabunPSK-Bold'), local('TH Sarabun New Bold'), local('THSarabunNew-Bold'),
           url('https://cdn.jsdelivr.net/gh/lazywasabi/thai-web-fonts@7/fonts/THSarabunNew/THSarabunNew-Bold.woff2') format('woff2');
      font-weight: bold;
      font-style: normal;
    }
    @font-face {
      font-family: 'TH Sarabun New';
      src: local('TH Sarabun New'), local('THSarabunNew'), local('TH Sarabun PSK'), local('THSarabunPSK'),
           url('https://cdn.jsdelivr.net/gh/lazywasabi/thai-web-fonts@7/fonts/THSarabunNew/THSarabunNew.woff2') format('woff2');
      font-weight: normal;
      font-style: normal;
    }
    @font-face {
      font-family: 'TH Sarabun New';
      src: local('TH Sarabun New Bold'), local('THSarabunNew-Bold'), local('TH Sarabun PSK Bold'), local('THSarabunPSK-Bold'),
           url('https://cdn.jsdelivr.net/gh/lazywasabi/thai-web-fonts@7/fonts/THSarabunNew/THSarabunNew-Bold.woff2') format('woff2');
      font-weight: bold;
      font-style: normal;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    @page {
      size: A4;
      margin: 0;
    }

    body {
      font-family: 'TH Sarabun PSK', 'TH Sarabun New', 'Sarabun', sans-serif;
      font-size: 16pt;
      line-height: 1.6;
      color: #000;
      margin: 0;
      padding: 0;
      background: #e2e8f0;
      -webkit-font-smoothing: antialiased;
    }

    /* MS Word Interactive Mode Styles */
    [contenteditable="true"] {
      outline: none;
      transition: background-color 0.15s, outline 0.15s;
    }
    .word-edit-mode [contenteditable="true"]:hover {
      outline: 1px dashed rgba(59, 130, 246, 0.45);
      outline-offset: 1px;
      cursor: text;
    }
    .word-edit-mode [contenteditable="true"]:focus {
      outline: 1.5px solid #2563eb !important;
      outline-offset: 1px;
      background-color: #eff6ff !important;
    }

    .a4-sheet, .page {
      background: white;
      width: 21cm;
      height: 29.7cm;
      min-height: 29.7cm;
      padding: 1.5cm 1.75cm 0.9cm 2.54cm;
      margin: 1cm auto;
      box-sizing: border-box;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      position: relative;
      overflow: hidden;
    }

    .garuda {
      text-align: center;
      margin-bottom: 5px;
    }
    .garuda img {
      width: 100px;
      height: auto;
      display: inline-block;
    }
    .title {
      text-align: center;
      font-weight: bold;
      font-size: 18pt;
      margin-bottom: 5px;
      line-height: 1.2;
    }

    .official-row {
      display: flex;
      align-items: baseline;
      width: 100%;
      min-height: 7.0mm;
      line-height: 7.0mm;
    }
    .official-row > span {
      flex-shrink: 0;
      white-space: nowrap;
    }
    .fill-dot {
      border-bottom: 1.5px dotted #1e293b;
      display: inline-block;
      text-align: center;
      padding: 0 5px;
      font-weight: bold;
      vertical-align: bottom;
      height: 6.0mm;
      line-height: 6.0mm;
      outline: none;
      white-space: nowrap;
    }
    .fill-dot:empty::after {
      content: "\\00a0";
      visibility: hidden;
    }
    .fill-dot:focus, .fill-dot-left:focus {
      background-color: #fef9c3;
      border-bottom: 1.5px solid #2563eb !important;
    }
    .fill-dot-left {
      border-bottom: 1.5px dotted #1e293b;
      display: inline-block;
      text-align: left;
      padding: 0 5px;
      font-weight: bold;
      vertical-align: bottom;
      height: 6.0mm;
      line-height: 6.0mm;
      outline: none;
      white-space: nowrap;
    }
    .fill-dot-left:empty::after {
      content: "\\00a0";
      visibility: hidden;
    }
    .fill-grow {
      flex: 1 1 0% !important;
      flex-shrink: 1 !important;
    }

    .underline-dotted .fill-dot, .underline-dotted .fill-dot-left { border-bottom: 1.5px dotted #1e293b; }
    .underline-dashed .fill-dot, .underline-dashed .fill-dot-left { border-bottom: 1.2px dashed #334155; }
    .underline-solid .fill-dot, .underline-solid .fill-dot-left { border-bottom: 1px solid #000000; }
    .underline-none .fill-dot, .underline-none .fill-dot-left { border-bottom: 1px solid transparent; }
    .data-weight-normal .fill-dot, .data-weight-normal .fill-dot-left { font-weight: normal !important; }

    table.fee-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      font-size: 14pt;
    }
    table.fee-table th, table.fee-table td {
      border: 1px solid #000;
      text-align: center;
      padding: 6px;
    }
    table.fee-table th {
      font-weight: normal;
    }

    .page-break {
      page-break-before: always;
      break-before: page;
    }

    .no-print {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: #0f172a;
      color: #fff;
      padding: 10px 20px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-family: 'Sarabun', sans-serif;
    }
    .btn {
      padding: 8px 16px;
      font-size: 14px;
      font-family: 'Sarabun', sans-serif;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.2s;
    }
    .btn-primary { background: #2563eb; color: white; }
    .btn-primary:hover { background: #1d4ed8; }
    .btn-success { background: #059669; color: white; }
    .btn-success:hover { background: #047857; }
    .btn-close { background: #475569; color: white; }
    .btn-close:hover { background: #334155; }

    .word-toolbar-box {
      width: 21cm;
      margin: 12px auto;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      font-family: 'Sarabun', sans-serif;
      position: sticky;
      top: 56px;
      z-index: 990;
    }
    .word-toolbar-header {
      background: #0f172a;
      color: #ffffff;
      padding: 6px 12px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
    }
    .word-toolbar-body {
      background: #f8fafc;
      padding: 8px 12px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 12px;
    }
    .word-tool-btn {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 12px;
      font-weight: bold;
      color: #1e293b;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .word-tool-btn:hover {
      background: #f1f5f9;
      border-color: #94a3b8;
    }
    .word-tool-select {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 4px 6px;
      font-size: 12px;
      font-weight: 500;
      color: #1e293b;
      cursor: pointer;
    }

    @media print {
      body {
        background: none;
        margin: 0;
        padding: 0;
      }
      .a4-sheet, .page {
        margin: 0;
        box-shadow: none;
        width: 21cm;
        height: 29.7cm;
        page-break-after: always;
        break-after: page;
        box-sizing: border-box;
      }
      .no-print, .word-toolbar-box {
        display: none !important;
      }
      .word-edit-mode [contenteditable="true"]:hover,
      .word-edit-mode [contenteditable="true"]:focus {
        outline: none !important;
        background-color: transparent !important;
      }
    }
  </style>
</head>
<body>
  <!-- แถบเมนูคำสั่ง -->
  <div class="no-print">
    <div style="display:flex; align-items:center; gap:10px;">
      <span style="font-weight:bold; font-size:15px;">🏛️ ใบอนุญาต อภ.2 (ปรับแต่งอิสระเสมือน MS Word 100%)</span>
      <span style="color:#94a3b8; font-size:13px;">💡 คลิกแก้ไขได้ทุกจุด • ปรับขนาดครุฑ หัวเรื่อง ย่อหน้า ลายเซ็น ตาราง ได้อิสระ</span>
    </div>
    <div style="display:flex; align-items:center; gap:8px;">
      <button class="btn btn-primary" onclick="window.print()">🖨️ สั่งพิมพ์เอกสาร (Print A4)</button>
      <button class="btn btn-success" onclick="exportLicenseWord()">📝 ส่งออกเป็น Word (.doc)</button>
      <button class="btn btn-close" onclick="window.close()">✕ ปิดหน้าต่าง</button>
    </div>
  </div>

  <!-- MS Word Ribbon Toolbar -->
  <div class="word-toolbar-box no-print" id="wordToolbar">
    <div class="word-toolbar-header">
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="background:#2563eb; color:#fff; padding:2px 6px; border-radius:4px; font-weight:bold; font-size:11px;">MS WORD STUDIO</span>
        <span style="font-weight:600;">เครื่องมือจัดหน้า & ปรับแต่งทุกส่วนอิสระเสมือน Microsoft Word</span>
      </div>
      <div style="display:flex; align-items:center; gap:10px;">
        <label style="display:flex; align-items:center; gap:5px; cursor:pointer; font-size:11px;">
          <input type="checkbox" id="chkDirectEdit" checked onchange="toggleDirectEdit(this)">
          <span>โหมดคลิกพิมพ์แก้ได้ทุกจุด (Direct Edit)</span>
        </label>
        <button type="button" class="word-tool-btn" style="background:#1e293b; color:#fff; border-color:#334155; font-size:11px;" onclick="resetLayout()">
          🔄 คืนค่ามาตรฐานราชการ
        </button>
      </div>
    </div>
    
    <div class="word-toolbar-body">
      <!-- Font Family -->
      <div style="display:flex; align-items:center; gap:5px; padding-right:8px; border-right:1px solid #cbd5e1;">
        <span style="color:#64748b; font-weight:bold;">ฟอนต์:</span>
        <select id="selDocFont" class="word-tool-select" onchange="setDocFont(this.value)">
          <option value="'TH Sarabun PSK', 'TH Sarabun New', 'Sarabun', sans-serif">TH SarabunPSK (ราชการ)</option>
          <option value="'TH Sarabun New', 'TH Sarabun PSK', 'Sarabun', sans-serif">TH Sarabun New</option>
          <option value="'Sarabun', 'TH Sarabun New', sans-serif">Sarabun (Google Font)</option>
          <option value="'Angsana New', 'AngsanaUPC', 'Sarabun', sans-serif">Angsana New (อังสนา)</option>
          <option value="'Cordia New', 'CordiaUPC', 'Sarabun', sans-serif">Cordia New (คอร์เดีย)</option>
          <option value="'Browallia New', 'BrowalliaUPC', 'Sarabun', sans-serif">Browallia New (บราววาเลีย)</option>
        </select>
      </div>

      <!-- Font Size -->
      <div style="display:flex; align-items:center; gap:4px; padding-right:8px; border-right:1px solid #cbd5e1;">
        <span style="color:#64748b; font-weight:bold;">ขนาด:</span>
        <select id="selDocFontSize" class="word-tool-select" onchange="setDocFontSize(this.value)">
          <option value="13">13 pt</option>
          <option value="14">14 pt</option>
          <option value="15">15 pt</option>
          <option value="16" selected>16 pt (มาตรฐาน)</option>
          <option value="17">17 pt</option>
          <option value="18">18 pt</option>
          <option value="20">20 pt</option>
        </select>
        <button type="button" class="word-tool-btn" onclick="stepFontSize(-1)" title="ลดขนาดตัวอักษร">A-</button>
        <button type="button" class="word-tool-btn" onclick="stepFontSize(1)" title="เพิ่มขนาดตัวอักษร">A+</button>
      </div>

      <!-- B, I, U, Align, Undo, Redo -->
      <div style="display:flex; align-items:center; gap:3px; padding-right:8px; border-right:1px solid #cbd5e1;">
        <button type="button" class="word-tool-btn" onclick="execFormat('bold')" title="ตัวหนา"><b>B</b></button>
        <button type="button" class="word-tool-btn" onclick="execFormat('italic')" title="ตัวเอียง"><i>I</i></button>
        <button type="button" class="word-tool-btn" onclick="execFormat('underline')" title="ขีดเส้นใต้"><u>U</u></button>
        <button type="button" class="word-tool-btn" onclick="execFormat('justifyLeft')" title="ชิดซ้าย">⬅</button>
        <button type="button" class="word-tool-btn" onclick="execFormat('justifyCenter')" title="กึ่งกลาง">↔</button>
        <button type="button" class="word-tool-btn" onclick="execFormat('justifyRight')" title="ชิดขวา">➡</button>
        <button type="button" class="word-tool-btn" onclick="execFormat('undo')" title="เลิกทำ (Undo)">↶</button>
        <button type="button" class="word-tool-btn" onclick="execFormat('redo')" title="ทำซ้ำ (Redo)">↷</button>
      </div>

      <!-- Line Style -->
      <div style="display:flex; align-items:center; gap:4px; padding-right:8px; border-right:1px solid #cbd5e1;">
        <span style="color:#64748b; font-weight:bold;">เส้นช่องกรอก:</span>
        <select id="selUnderlineStyle" class="word-tool-select" onchange="setUnderlineStyle(this.value)">
          <option value="dotted" selected>เส้นประจุด (..)</option>
          <option value="dashed">เส้นประขีด (--)</option>
          <option value="solid">เส้นทึบ (__)</option>
          <option value="none">ซ่อนเส้น (พิมพ์ฟอร์มเปล่า)</option>
        </select>
      </div>

      <!-- Independent Drawers -->
      <div style="display:flex; align-items:center; gap:5px;">
        <button type="button" class="word-tool-btn" style="color:#4f46e5; border-color:#c7d2fe; background:#eef2ff;" onclick="toggleElementsCustom()">🦅 ปรับแยกแต่ละส่วน (ครุฑ/หัวเรื่อง/ลายเซ็น)</button>
        <button type="button" class="word-tool-btn" style="color:#1d4ed8;" onclick="toggleCustomMargins()">📏 ขอบกระดาษ</button>
        <button type="button" class="word-tool-btn" style="color:#047857;" onclick="toggleTableCustom()">📐 ปรับตาราง (หน้า 2)</button>
      </div>
    </div>

    <!-- Drawer: Independent Element Controls -->
    <div id="drawerElementsCustom" style="display:none; background:#eef2ff; padding:8px 12px; border-bottom:1px solid #c7d2fe; flex-wrap:wrap; align-items:center; gap:12px; font-size:12px;">
      <span style="font-weight:bold; color:#3730a3;">ปรับแยกอิสระ:</span>
      <label>ขนาดครุฑ: <input type="number" id="el_garuda" min="50" max="150" value="100" style="width:52px; text-align:center;" onchange="onElementCustomChange()"> px</label>
      <label>ฟอนต์หัวเรื่อง: <input type="number" id="el_titleSize" min="14" max="26" value="18" style="width:48px; text-align:center;" onchange="onElementCustomChange()"> pt</label>
      <label>ย่อหน้าหลัก: <input type="number" id="el_indent" step="0.1" min="0" max="4" value="1.5" style="width:48px; text-align:center;" onchange="onElementCustomChange()"> ซม.</label>
      <label>ความสูงแถว: <input type="number" id="el_rowH" step="0.5" min="5.5" max="9.5" value="7.0" style="width:48px; text-align:center;" onchange="onElementCustomChange()"> มม.</label>
      <label>ความกว้างลายเซ็น: <input type="number" id="el_sigW" min="35" max="100" value="55" style="width:48px; text-align:center;" onchange="onElementCustomChange()"> %</label>
      <label>ระยะห่างลายเซ็น: <input type="number" id="el_sigTop" min="0" max="80" value="12" style="width:48px; text-align:center;" onchange="onElementCustomChange()"> px</label>
      <label>ฟอนต์คำเตือน: <input type="number" id="el_warnSize" min="10" max="18" value="14" style="width:48px; text-align:center;" onchange="onElementCustomChange()"> pt</label>
    </div>

    <!-- Drawer: Margins Custom -->
    <div id="drawerCustomMargins" style="display:none; background:#eff6ff; padding:8px 12px; border-bottom:1px solid #bfdbfe; flex-wrap:wrap; align-items:center; gap:12px; font-size:12px;">
      <span style="font-weight:bold; color:#1e40af;">กำหนดระยะขอบกระดาษ A4 (ซม.):</span>
      <select class="word-tool-select" onchange="setMarginPreset(this.value)">
        <option value="official">มาตรฐานราชการ (1.5 / 2.54 / 1.75 / 0.9 ซม.)</option>
        <option value="compact">กะทัดรัด (1.2 / 2.0 / 1.5 / 0.6 ซม.)</option>
        <option value="normal">สมดุล (2.0 / 2.5 / 2.0 / 1.5 ซม.)</option>
      </select>
      <label>บน: <input type="number" id="m_top" step="0.1" value="1.5" style="width:50px; text-align:center;" onchange="onCustomMarginChange()"> ซม.</label>
      <label>ล่าง: <input type="number" id="m_bottom" step="0.1" value="0.9" style="width:50px; text-align:center;" onchange="onCustomMarginChange()"> ซม.</label>
      <label>ซ้าย: <input type="number" id="m_left" step="0.1" value="2.54" style="width:50px; text-align:center;" onchange="onCustomMarginChange()"> ซม.</label>
      <label>ขวา: <input type="number" id="m_right" step="0.1" value="1.75" style="width:50px; text-align:center;" onchange="onCustomMarginChange()"> ซม.</label>
    </div>

    <!-- Drawer: Table Custom -->
    <div id="drawerTableCustom" style="display:none; background:#f0fdf4; padding:8px 12px; border-bottom:1px solid #bbf7d0; flex-wrap:wrap; align-items:center; gap:12px; font-size:12px;">
      <span style="font-weight:bold; color:#166534;">ปรับแต่งตารางค่าธรรมเนียม:</span>
      <label>ความสูงช่อง:
        <select class="word-tool-select" onchange="setTablePadding(this.value)">
          <option value="4">4px (แน่น)</option>
          <option value="6" selected>6px (มาตรฐาน)</option>
          <option value="8">8px (โปร่ง)</option>
          <option value="10">10px (กว้าง)</option>
          <option value="14">14px (กว้างมาก)</option>
        </select>
      </label>
      <label>ฟอนต์ตาราง:
        <select class="word-tool-select" onchange="setTableFontSize(this.value)">
          <option value="12">12 pt</option>
          <option value="13">13 pt</option>
          <option value="14" selected>14 pt (มาตรฐาน)</option>
          <option value="15">15 pt</option>
          <option value="16">16 pt</option>
        </select>
      </label>
      <label>สัดส่วนคอลัมน์:
        <select class="word-tool-select" onchange="setTableColPreset(this.value)">
          <option value="standard">มาตรฐานราชการ</option>
          <option value="wideSigner">ขยายช่องผู้ลงนาม (32%)</option>
          <option value="wideReceipt">ขยายช่องใบเสร็จ (24%)</option>
          <option value="equal">เฉลี่ยคอลัมน์เท่ากัน</option>
        </select>
      </label>
      <button type="button" class="word-tool-btn" style="background:#059669; color:#fff;" onclick="addFeeRow()">➕ เพิ่มแถว</button>
      <button type="button" class="word-tool-btn" style="background:#e11d48; color:#fff;" onclick="deleteFeeRow()">➖ ลบแถวล่าสุด</button>
    </div>
  </div>

  <!-- หน้าที่ 1: ด้านหน้า (Exact Image 2 Structure + Full Independent Editable) -->
  <div class="page word-edit-mode underline-dotted" id="licenseDocPage1" style="position: relative;">
    <div class="garuda" id="garudaBox">
      <img id="garudaImg" src="${GARUDA_BASE64}" alt="ตราครุฑ">
    </div>
    
    <div class="title" id="docTitleBox" contenteditable="true">
      <div>ใบอนุญาต</div>
      <div>ประกอบกิจการที่เป็นอันตรายต่อสุขภาพ</div>
    </div>
    
    <!-- Header Info (Compact on left matching แม่แบบ.docx & Image 4) -->
    <div class="official-row" style="margin-bottom: 6px;">
      <span contenteditable="true">เล่มที่</span>
      <span id="v_bNo" class="fill-dot" style="min-width: 28px; padding: 0 4px;" contenteditable="true">${bNo}</span>
      <span contenteditable="true">เลขที่</span>
      <span id="v_lNo" class="fill-dot" style="min-width: 52px; padding: 0 4px;" contenteditable="true">${lNo}</span>
      <span contenteditable="true">/</span>
      <span id="v_docYear" class="fill-dot" style="min-width: 55px; padding: 0 4px;" contenteditable="true">${docYear}</span><span>.</span>
    </div>

    <!-- Section (1) Permitted Person Details: Exact 4 Lines matching Image 2 -->
    <div style="margin-bottom: 4px;">
      <div class="official-row">
        <span class="doc-indent" style="width: 1.5cm;"></span>
        <span contenteditable="true">(1) เจ้าพนักงานท้องถิ่นอนุญาตให้&nbsp;</span>
        <span id="v_owner" class="fill-dot fill-grow" style="min-width: 150px;" contenteditable="true">${owner}</span>
        <span contenteditable="true">&nbsp;สัญชาติ&nbsp;</span>
        <span id="v_nat" class="fill-dot" style="min-width: 110px;" contenteditable="true">${nat}</span>
      </div>

      <div class="official-row">
        <span contenteditable="true">อยู่บ้านเลขที่&nbsp;</span>
        <span id="v_oAddrNo" class="fill-dot" style="min-width: 85px;" contenteditable="true">${oAddrNo}</span>
        <span contenteditable="true">&nbsp;หมู่ที่&nbsp;</span>
        <span id="v_oMoo" class="fill-dot" style="min-width: 55px;" contenteditable="true">${oMoo}</span>
        <span contenteditable="true">&nbsp;ตรอก/ซอย&nbsp;</span>
        <span id="v_oTrok" class="fill-dot fill-grow" style="min-width: 75px;" contenteditable="true">${oTrok}</span>
        <span contenteditable="true">&nbsp;ถนน&nbsp;</span>
        <span id="v_oRoad" class="fill-dot fill-grow" style="min-width: 90px;" contenteditable="true">${oRoad}</span>
      </div>

      <div class="official-row">
        <span contenteditable="true">ตำบล/<del>แขวง</del>&nbsp;</span>
        <span id="v_oTumbon" class="fill-dot fill-grow" style="min-width: 95px;" contenteditable="true">${oTumbon}</span>
        <span contenteditable="true">&nbsp;อำเภอ/<del>เขต</del>&nbsp;</span>
        <span id="v_oAmphoe" class="fill-dot fill-grow" style="min-width: 95px;" contenteditable="true">${oAmphoe}</span>
        <span contenteditable="true">&nbsp;จังหวัด&nbsp;</span>
        <span id="v_oProv" class="fill-dot fill-grow" style="min-width: 95px;" contenteditable="true">${oProv}</span>
      </div>

      <div class="official-row">
        <span contenteditable="true">หมายเลขโทรศัพท์&nbsp;</span>
        <span id="v_oPhone" class="fill-dot-left fill-grow" style="padding-left: 8px;" contenteditable="true">${oPhone}</span>
      </div>
    </div>

    <!-- Establishment Section: Exact 4 Lines matching Image 2 -->
    <div style="margin-bottom: 4px;">
      <div class="official-row">
        <span class="doc-subindent" style="width: 2.0cm;"></span>
        <span contenteditable="true">ชื่อสถานประกอบกิจการที่เป็นอันตรายต่อสุขภาพ ประเภท&nbsp;</span>
        <span id="v_bType" class="fill-dot-left fill-grow" style="padding-left: 6px;" contenteditable="true">${bType1}</span>
      </div>

      <div class="official-row">
        <span id="v_bTypeLine2" class="fill-dot-left fill-grow" style="padding-left: 6px;" contenteditable="true">${bType2}</span>
        <span contenteditable="true">&nbsp;โดยใช้ชื่อ</span>
      </div>

      <div class="official-row">
        <span contenteditable="true">สถานที่&nbsp;</span>
        <span id="v_bName" class="fill-dot fill-grow" style="min-width: 120px;" contenteditable="true">${bName}</span>
        <span contenteditable="true">&nbsp;ตั้งอยู่บ้านเลขที่&nbsp;</span>
        <span id="v_bAddrNo" class="fill-dot" style="min-width: 65px;" contenteditable="true">${bAddrNo}</span>
        <span contenteditable="true">&nbsp;หมู่ที่&nbsp;</span>
        <span id="v_bMoo" class="fill-dot" style="min-width: 45px;" contenteditable="true">${bMoo}</span>
        <span contenteditable="true">&nbsp;ตำบล&nbsp;</span>
        <span id="v_bTumbon" class="fill-dot fill-grow" style="min-width: 80px;" contenteditable="true">${bTumbon}</span>
      </div>

      <div class="official-row">
        <span contenteditable="true">อำเภอ&nbsp;</span>
        <span id="v_bAmphoe" class="fill-dot fill-grow" style="min-width: 80px;" contenteditable="true">${bAmphoe}</span>
        <span contenteditable="true">&nbsp;จังหวัด&nbsp;</span>
        <span id="v_bProv" class="fill-dot fill-grow" style="min-width: 80px;" contenteditable="true">${bProv}</span>
        <span contenteditable="true">&nbsp;หมายเลขโทรศัพท์&nbsp;</span>
        <span id="v_bPhone" class="fill-dot-left fill-grow" style="min-width: 110px; padding-left: 8px;" contenteditable="true">${bPhone}</span>
      </div>
    </div>

    <!-- Fee & Receipt Section: Exact 3 Lines matching Image 2 -->
    <div style="margin-bottom: 4px;">
      <div class="official-row">
        <span class="doc-subindent" style="width: 2.0cm;"></span>
        <span contenteditable="true">เสียค่าธรรมเนียมปีละ&nbsp;</span>
        <span id="v_fee" class="fill-dot" style="min-width: 90px;" contenteditable="true">${fee}</span>
        <span contenteditable="true">&nbsp;บาท (&nbsp;</span>
        <span id="v_feeT" class="fill-dot fill-grow" style="min-width: 140px;" contenteditable="true">${feeT}</span>
        <span contenteditable="true">&nbsp;)</span>
      </div>

      <div class="official-row">
        <span contenteditable="true">ตามใบเสร็จรับเงินเล่มที่&nbsp;</span>
        <span id="v_rBook" class="fill-dot" style="min-width: 45px; padding: 0 3px;" contenteditable="true">${rBook}</span>
        <span contenteditable="true">&nbsp;เลขที่&nbsp;</span>
        <span id="v_rNo" class="fill-dot fill-grow" style="min-width: 65px; padding: 0 4px;" contenteditable="true">${rNo}</span>
        <span contenteditable="true">&nbsp;ลงวันที่&nbsp;</span>
        <span id="v_rDay" class="fill-dot" style="min-width: 32px; padding: 0 3px;" contenteditable="true">${rDate.d || ''}</span>
        <span contenteditable="true">&nbsp;เดือน&nbsp;</span>
        <span id="v_rMonth" class="fill-dot" style="min-width: 75px; padding: 0 4px;" contenteditable="true">${rDate.m || ''}</span>
        <span contenteditable="true">&nbsp;พ.ศ.&nbsp;</span>
        <span id="v_rYear" class="fill-dot fill-grow" style="min-width: 45px; padding: 0 3px;" contenteditable="true">${rDate.y || ''}</span>
      </div>

      <div class="official-row">
        <span contenteditable="true">ผู้รับใบอนุญาตต้องปฏิบัติตามหลักเกณฑ์ วิธีการและเงื่อนไขที่กำหนดในข้อกำหนดของท้องถิ่น</span>
      </div>
    </div>

    <!-- Clause (2): Legal Notice matching Image 2 (2 lines) -->
    <div style="margin-bottom: 4px;">
      <div class="official-row">
        <span class="doc-indent" style="width: 1.5cm;"></span>
        <span contenteditable="true">(2) หากปรากฏในภายหลังว่าการประกอบกิจการที่ได้รับอนุญาตนี้เป็นการขัดต่อกฎหมายอื่นที่เกี่ยวข้อง</span>
      </div>
      <div class="official-row">
        <span contenteditable="true">โดยมิอาจแก้ไขได้ เจ้าพนักงานท้องถิ่นอาจพิจารณาให้เพิกถอนการอนุญาตนี้ได้</span>
      </div>
    </div>

    <!-- Clause (3): Specific Conditions matching Image 2 (3 lines) -->
    <div style="margin-bottom: 4px;">
      <div class="official-row">
        <span class="doc-indent" style="width: 1.5cm;"></span>
        <span contenteditable="true">(3) ผู้รับใบอนุญาตต้องปฏิบัติตามเงื่อนไขเฉพาะดังต่อไปนี้อีกด้วย คือ</span>
      </div>
      <div class="official-row">
        <span class="doc-subindent" style="width: 2.0cm;"></span>
        <span contenteditable="true">3.1)&nbsp;</span>
        <span id="v_cond31" class="fill-dot-left fill-grow" style="padding-left: 6px;" contenteditable="true">${cond31}</span>
      </div>
      <div class="official-row">
        <span class="doc-subindent" style="width: 2.0cm;"></span>
        <span contenteditable="true">3.2)&nbsp;</span>
        <span id="v_cond32" class="fill-dot-left fill-grow" style="padding-left: 6px;" contenteditable="true">${cond32}</span>
      </div>
    </div>

    <!-- Clauses (4) & (5): Issue Date & Expire Date matching แม่แบบ.docx & Image 4 -->
    <div style="margin-bottom: 4px;">
      <div class="official-row">
        <span style="display: inline-flex; align-items: baseline; width: 54%; flex-shrink: 0;">
          <span class="doc-indent" style="width: 1.25cm; flex-shrink: 0;"></span>
          <span style="flex-shrink: 0;" contenteditable="true">(4) ใบอนุญาตฉบับนี้ออกให้เมื่อวันที่&nbsp;</span>
          <span id="v_sDay" class="fill-dot fill-grow" style="min-width: 35px;" contenteditable="true">${sDate.d || ''}</span>
        </span>
        <span style="display: inline-flex; align-items: baseline; width: 25%; flex-shrink: 0;">
          <span style="flex-shrink: 0;" contenteditable="true">&nbsp;เดือน&nbsp;</span>
          <span id="v_sMonth" class="fill-dot fill-grow" style="min-width: 65px;" contenteditable="true">${sDate.m || ''}</span>
        </span>
        <span style="display: inline-flex; align-items: baseline; width: 21%; flex-shrink: 0;">
          <span style="flex-shrink: 0;" contenteditable="true">&nbsp;พ.ศ.&nbsp;</span>
          <span id="v_sYear" class="fill-dot fill-grow" style="min-width: 45px;" contenteditable="true">${sDate.y || ''}</span><span>.</span>
        </span>
      </div>

      <div class="official-row">
        <span style="display: inline-flex; align-items: baseline; width: 54%; flex-shrink: 0;">
          <span class="doc-indent" style="width: 1.25cm; flex-shrink: 0;"></span>
          <span style="flex-shrink: 0;" contenteditable="true">(5) ใบอนุญาตฉบับนี้สิ้นอายุวันที่&nbsp;</span>
          <span id="v_eDay" class="fill-dot fill-grow" style="min-width: 35px;" contenteditable="true">${eDate.d || ''}</span>
        </span>
        <span style="display: inline-flex; align-items: baseline; width: 25%; flex-shrink: 0;">
          <span style="flex-shrink: 0;" contenteditable="true">&nbsp;เดือน&nbsp;</span>
          <span id="v_eMonth" class="fill-dot fill-grow" style="min-width: 65px;" contenteditable="true">${eDate.m || ''}</span>
        </span>
        <span style="display: inline-flex; align-items: baseline; width: 21%; flex-shrink: 0;">
          <span style="flex-shrink: 0;" contenteditable="true">&nbsp;พ.ศ.&nbsp;</span>
          <span id="v_eYear" class="fill-dot fill-grow" style="min-width: 45px;" contenteditable="true">${eDate.y || ''}</span><span>.</span>
        </span>
      </div>
    </div>

    <!-- Signature Box (Aligned to match แม่แบบ.docx & Image 4) -->
    <div id="sigBox" style="float: right; width: 54%; margin-top: 8px; margin-bottom: 6px; line-height: 1.35;">
      <div style="display: flex; align-items: baseline;">
        <span style="width: 52px; flex-shrink: 0;" contenteditable="true">(ลงชื่อ)</span>
        <span class="fill-dot" style="display: inline-block; width: 195px;"></span>
      </div>
      <div style="display: flex; align-items: baseline; margin-top: 3px;">
        <span style="width: 52px; flex-shrink: 0;"></span>
        <span style="width: 195px; text-align: center; white-space: nowrap;">(<span id="v_exName" class="fill-dot" style="min-width: 150px; padding: 0 8px;" contenteditable="true">${cleanExName || 'นายละดม  เชื้อช่วย'}</span>)</span>
      </div>
      <div style="display: flex; align-items: flex-start; margin-top: 2px;">
        <span style="width: 52px; flex-shrink: 0;" contenteditable="true">ตำแหน่ง</span>
        <div id="v_exPos" style="width: 195px; text-align: center; white-space: nowrap;" contenteditable="true">${posLinesHtml}</div>
      </div>
      <div style="display: flex; align-items: baseline; margin-top: 2px;">
        <span style="width: 52px; flex-shrink: 0;"></span>
        <span style="width: 195px; text-align: center;" contenteditable="true">เจ้าพนักงานท้องถิ่น</span>
      </div>
    </div>

    <!-- Warnings Footer matching แม่แบบ.docx & Image 4 -->
    <div id="warnBox" style="clear: both; font-size: 16pt; margin-top: 8px; line-height: 1.3;" contenteditable="true">
      <div class="official-row" style="align-items: baseline; margin-bottom: 1px;">
        <span>คำเตือน</span>
        <span style="margin-left: 0.8cm;">(1) ผู้รับใบอนุญาตต้องแสดงใบอนุญาตนี้ไว้โดยเปิดเผยและเห็นได้ง่าย ณ สถานที่ประกอบกิจการ</span>
      </div>
      <div style="line-height: 1.3;">ตลอดเวลาที่ประกอบกิจการ หากฝ่าฝืนมีโทษปรับไม่เกิน ห้าร้อยบาท</div>
      <div style="margin-top: 2px; margin-left: 1.65cm; line-height: 1.3;">(2) หากประสงค์จะประกอบกิจการในปีต่อไปต้องยื่นคำขอต่ออายุใบอนุญาต<u><b>ก่อน</b></u>ใบอนุญาตสิ้นอายุ</div>
    </div>
  </div>

  <!-- หน้าที่ 2: ด้านหลัง -->
  <div class="page page-break word-edit-mode" id="licenseDocPage2" style="position: relative; padding-left: 1.25cm; padding-right: 1.25cm;">
    <div class="title" id="docPage2TitleBox" style="margin-top: 20px; font-size: 16pt;" contenteditable="true">รายการเสียค่าธรรมเนียมหนังสือรับรองการแจ้ง</div>
    
    <table class="fee-table">
      <thead>
        <tr>
          <th rowspan="2" style="width: 16.5%; white-space: nowrap; line-height: 1.3;" contenteditable="true">วัน/เดือน/ปี<br>ที่ออกใบอนุญาต</th>
          <th rowspan="2" style="width: 18.5%; white-space: nowrap; line-height: 1.3;" contenteditable="true">วัน/เดือน/ปี<br>ที่สิ้นอายุใบอนุญาต</th>
          <th colspan="3" style="width: 40.0%; line-height: 1.3;" contenteditable="true">ใบเสร็จรับเงิน</th>
          <th rowspan="2" style="width: 25.0%; white-space: nowrap; line-height: 1.3;" contenteditable="true">(ลงชื่อ)<br>เจ้าพนักงานท้องถิ่น</th>
        </tr>
        <tr>
          <th style="width: 8.0%;" contenteditable="true">เล่มที่</th>
          <th style="width: 17.5%;" contenteditable="true">เลขที่</th>
          <th style="width: 14.5%;" contenteditable="true">วัน/เดือน/ปี</th>
        </tr>
      </thead>
      <tbody id="backTableBody">
        <tr style="height: 40px;">
          <td id="tbl_sDate" contenteditable="true">${sDate.d ? sDate.d + ' ' + shortThaiMonth(sDate.m) + ' ' + sDate.y : (shortThaiMonth(sDate.m) + ' ' + sDate.y).trim()}</td>
          <td id="tbl_eDate" contenteditable="true">${eDate.d ? eDate.d + ' ' + shortThaiMonth(eDate.m) + ' ' + eDate.y : (shortThaiMonth(eDate.m) + ' ' + eDate.y).trim()}</td>
          <td id="tbl_rBook" contenteditable="true">${rBook && rBook !== '-' ? rBook : '-'}</td>
          <td id="tbl_rNo" contenteditable="true">${rNo && rNo !== '-' ? rNo : ''}</td>
          <td id="tbl_rDate" contenteditable="true">${rDate.d ? rDate.d + ' ' + shortThaiMonth(rDate.m) + ' ' + rDate.y : (shortThaiMonth(rDate.m) + ' ' + rDate.y).trim()}</td>
          <td id="tbl_signer" rowspan="6" style="vertical-align: bottom; padding-bottom: 10px; line-height: 1.4;" contenteditable="true">
            <div>${cleanExName ? '(' + cleanExName + ')' : ''}</div>
            ${posLinesHtml}
          </td>
        </tr>
        <tr style="height: 44px;"><td contenteditable="true"><br></td><td contenteditable="true"></td><td contenteditable="true"></td><td contenteditable="true"></td><td contenteditable="true"></td></tr>
        <tr style="height: 44px;"><td contenteditable="true"><br></td><td contenteditable="true"></td><td contenteditable="true"></td><td contenteditable="true"></td><td contenteditable="true"></td></tr>
        <tr style="height: 44px;"><td contenteditable="true"><br></td><td contenteditable="true"></td><td contenteditable="true"></td><td contenteditable="true"></td><td contenteditable="true"></td></tr>
        <tr style="height: 44px;"><td contenteditable="true"><br></td><td contenteditable="true"></td><td contenteditable="true"></td><td contenteditable="true"></td><td contenteditable="true"></td></tr>
        <tr style="height: 44px;"><td contenteditable="true"><br></td><td contenteditable="true"></td><td contenteditable="true"></td><td contenteditable="true"></td><td contenteditable="true"></td></tr>
      </tbody>
    </table>
  </div>

  <script>
    var currentDocLayout = {
      fontFamily: "'TH Sarabun PSK', 'TH Sarabun New', 'Sarabun', sans-serif",
      fontSize: 16,
      titleFontSize: 20,
      garudaSize: 100,
      indentSize: 1.25,
      lineHeight: 1.15,
      rowMinHeight: 6.2,
      sigWidth: 54,
      sigMarginTop: 8,
      warningFontSize: 16,
      underlineStyle: 'dotted',
      marginTop: 1.5,
      marginBottom: 0.9,
      marginLeft: 2.54,
      marginRight: 1.75,
      tablePadding: 6,
      tableFontSize: 16,
      tableColWidths: [16.5, 18.5, 8.0, 17.5, 14.5, 25.0],
      isFullEditMode: true
    };

    function applyDocLayout() {
      var p1 = document.getElementById('licenseDocPage1');
      var p2 = document.getElementById('licenseDocPage2');
      var pages = [p1, p2].filter(Boolean);
      
      pages.forEach(function(p) {
        p.style.fontFamily = currentDocLayout.fontFamily;
        p.style.fontSize = currentDocLayout.fontSize + 'pt';
        p.style.lineHeight = currentDocLayout.lineHeight;
        if (p.id === 'licenseDocPage2') {
          p.style.padding = currentDocLayout.marginTop + 'cm 1.25cm ' +
                            currentDocLayout.marginBottom + 'cm 1.25cm';
        } else {
          p.style.padding = currentDocLayout.marginTop + 'cm ' +
                            currentDocLayout.marginRight + 'cm ' +
                            currentDocLayout.marginBottom + 'cm ' +
                            currentDocLayout.marginLeft + 'cm';
        }
        p.classList.remove('underline-dotted', 'underline-dashed', 'underline-solid', 'underline-none');
        p.classList.add('underline-' + currentDocLayout.underlineStyle);
        if (currentDocLayout.isFullEditMode) {
          p.classList.add('word-edit-mode');
        } else {
          p.classList.remove('word-edit-mode');
        }
      });

      var gImg = document.getElementById('garudaImg');
      if (gImg) gImg.style.width = currentDocLayout.garudaSize + 'px';

      var tBox = document.getElementById('docTitleBox');
      if (tBox) tBox.style.fontSize = currentDocLayout.titleFontSize + 'pt';

      var indents = document.querySelectorAll('.doc-indent');
      indents.forEach(function(el) { el.style.width = currentDocLayout.indentSize + 'cm'; });

      var sigBox = document.getElementById('sigBox');
      if (sigBox) {
        sigBox.style.width = currentDocLayout.sigWidth + '%';
        sigBox.style.marginTop = currentDocLayout.sigMarginTop + 'px';
      }

      var warnBox = document.getElementById('warnBox');
      if (warnBox) warnBox.style.fontSize = currentDocLayout.warningFontSize + 'pt';

      var rows = document.querySelectorAll('.official-row');
      rows.forEach(function(r) {
        r.style.minHeight = currentDocLayout.rowMinHeight + 'mm';
        r.style.lineHeight = currentDocLayout.rowMinHeight + 'mm';
      });

      var tbl = document.querySelector('table.fee-table');
      if (tbl) {
        tbl.style.fontSize = currentDocLayout.tableFontSize + 'pt';
        var ths = tbl.querySelectorAll('th, td');
        ths.forEach(function(c) {
          c.style.padding = currentDocLayout.tablePadding + 'px';
        });
      }
    }

    function setDocFont(val) {
      currentDocLayout.fontFamily = val;
      applyDocLayout();
    }

    function setDocFontSize(val) {
      currentDocLayout.fontSize = Number(val);
      applyDocLayout();
    }

    function stepFontSize(delta) {
      currentDocLayout.fontSize = Math.max(12, Math.min(24, currentDocLayout.fontSize + delta));
      var sel = document.getElementById('selDocFontSize');
      if (sel) sel.value = currentDocLayout.fontSize;
      applyDocLayout();
    }

    function setUnderlineStyle(val) {
      currentDocLayout.underlineStyle = val;
      applyDocLayout();
    }

    function execFormat(cmd) {
      try {
        document.execCommand(cmd, false, null);
      } catch (e) {
        console.error(e);
      }
    }

    function toggleElementsCustom() {
      var el = document.getElementById('drawerElementsCustom');
      if (el) el.style.display = (el.style.display === 'none' || !el.style.display) ? 'flex' : 'none';
    }

    function onElementCustomChange() {
      currentDocLayout.garudaSize = parseFloat(document.getElementById('el_garuda').value) || 100;
      currentDocLayout.titleFontSize = parseFloat(document.getElementById('el_titleSize').value) || 18;
      currentDocLayout.indentSize = parseFloat(document.getElementById('el_indent').value) || 1.5;
      currentDocLayout.rowMinHeight = parseFloat(document.getElementById('el_rowH').value) || 7.0;
      currentDocLayout.sigWidth = parseFloat(document.getElementById('el_sigW').value) || 55;
      currentDocLayout.sigMarginTop = parseFloat(document.getElementById('el_sigTop').value) || 12;
      currentDocLayout.warningFontSize = parseFloat(document.getElementById('el_warnSize').value) || 14;
      applyDocLayout();
    }

    function setMarginPreset(val) {
      if (val === 'official') {
        currentDocLayout.marginTop = 1.5;
        currentDocLayout.marginBottom = 0.9;
        currentDocLayout.marginLeft = 2.54;
        currentDocLayout.marginRight = 1.75;
      } else if (val === 'compact') {
        currentDocLayout.marginTop = 1.2;
        currentDocLayout.marginBottom = 0.6;
        currentDocLayout.marginLeft = 2.0;
        currentDocLayout.marginRight = 1.5;
      } else if (val === 'normal') {
        currentDocLayout.marginTop = 2.0;
        currentDocLayout.marginBottom = 1.5;
        currentDocLayout.marginLeft = 2.5;
        currentDocLayout.marginRight = 2.0;
      }
      updateCustomMarginInputs();
      applyDocLayout();
    }

    function toggleCustomMargins() {
      var el = document.getElementById('drawerCustomMargins');
      if (el) el.style.display = (el.style.display === 'none' || !el.style.display) ? 'flex' : 'none';
    }

    function updateCustomMarginInputs() {
      var t = document.getElementById('m_top');
      var b = document.getElementById('m_bottom');
      var l = document.getElementById('m_left');
      var r = document.getElementById('m_right');
      if (t) t.value = currentDocLayout.marginTop;
      if (b) b.value = currentDocLayout.marginBottom;
      if (l) l.value = currentDocLayout.marginLeft;
      if (r) r.value = currentDocLayout.marginRight;
    }

    function onCustomMarginChange() {
      var t = parseFloat(document.getElementById('m_top').value) || 1.5;
      var b = parseFloat(document.getElementById('m_bottom').value) || 0.9;
      var l = parseFloat(document.getElementById('m_left').value) || 2.54;
      var r = parseFloat(document.getElementById('m_right').value) || 1.75;
      currentDocLayout.marginTop = t;
      currentDocLayout.marginBottom = b;
      currentDocLayout.marginLeft = l;
      currentDocLayout.marginRight = r;
      applyDocLayout();
    }

    function toggleTableCustom() {
      var el = document.getElementById('drawerTableCustom');
      if (el) el.style.display = (el.style.display === 'none' || !el.style.display) ? 'flex' : 'none';
    }

    function setTablePadding(val) {
      currentDocLayout.tablePadding = Number(val);
      applyDocLayout();
    }

    function setTableFontSize(val) {
      currentDocLayout.tableFontSize = Number(val);
      applyDocLayout();
    }

    function setTableColPreset(val) {
      if (val === 'standard') {
        currentDocLayout.tableColWidths = [16.2, 18.9, 8.1, 17.6, 14.9, 24.3];
      } else if (val === 'wideSigner') {
        currentDocLayout.tableColWidths = [14.0, 16.0, 8.0, 16.0, 14.0, 32.0];
      } else if (val === 'wideReceipt') {
        currentDocLayout.tableColWidths = [13.0, 15.0, 10.0, 24.0, 18.0, 20.0];
      } else if (val === 'equal') {
        currentDocLayout.tableColWidths = [16.6, 16.6, 16.6, 16.6, 16.6, 17.0];
      }
      applyColWidths();
    }

    function applyColWidths() {
      var tbl = document.querySelector('table.fee-table');
      if (!tbl) return;
      var ths = tbl.querySelectorAll('thead tr:first-child th');
      if (ths.length >= 4) {
        ths[0].style.width = currentDocLayout.tableColWidths[0] + '%';
        ths[1].style.width = currentDocLayout.tableColWidths[1] + '%';
        ths[2].style.width = (currentDocLayout.tableColWidths[2] + currentDocLayout.tableColWidths[3] + currentDocLayout.tableColWidths[4]) + '%';
        ths[3].style.width = currentDocLayout.tableColWidths[5] + '%';
      }
      var ths2 = tbl.querySelectorAll('thead tr:nth-child(2) th');
      if (ths2.length >= 3) {
        ths2[0].style.width = currentDocLayout.tableColWidths[2] + '%';
        ths2[1].style.width = currentDocLayout.tableColWidths[3] + '%';
        ths2[2].style.width = currentDocLayout.tableColWidths[4] + '%';
      }
    }

    function addFeeRow() {
      var tbody = document.getElementById('backTableBody');
      if (!tbody) return;
      var tr = document.createElement('tr');
      tr.innerHTML = '<td contenteditable="true"></td><td contenteditable="true"></td><td contenteditable="true"></td><td contenteditable="true"></td><td contenteditable="true"></td><td contenteditable="true"></td>';
      tbody.appendChild(tr);
      applyDocLayout();
    }

    function deleteFeeRow() {
      var tbody = document.getElementById('backTableBody');
      if (!tbody || tbody.children.length <= 1) return;
      tbody.removeChild(tbody.lastElementChild);
    }

    function toggleDirectEdit(cb) {
      currentDocLayout.isFullEditMode = cb.checked;
      applyDocLayout();
    }

    function resetLayout() {
      currentDocLayout = {
        fontFamily: "'TH Sarabun PSK', 'TH Sarabun New', 'Sarabun', sans-serif",
        fontSize: 16,
        titleFontSize: 18,
        garudaSize: 100,
        indentSize: 1.5,
        lineHeight: 1.25,
        rowMinHeight: 7.0,
        sigWidth: 55,
        sigMarginTop: 12,
        warningFontSize: 14,
        underlineStyle: 'dotted',
        marginTop: 1.5,
        marginBottom: 0.9,
        marginLeft: 2.54,
        marginRight: 1.75,
        tablePadding: 6,
        tableFontSize: 14,
        tableColWidths: [16.2, 18.9, 8.1, 17.6, 14.9, 24.3],
        isFullEditMode: true
      };
      var fontSel = document.getElementById('selDocFont');
      if (fontSel) fontSel.value = currentDocLayout.fontFamily;
      var sizeSel = document.getElementById('selDocFontSize');
      if (sizeSel) sizeSel.value = 16;
      updateCustomMarginInputs();
      applyDocLayout();
      applyColWidths();
    }

    function getVal(id) {
      var el = document.getElementById(id);
      return el ? (el.textContent || '').trim() : '';
    }

    function exportLicenseWord() {
      var bNo = getVal('v_bNo');
      var lNo = getVal('v_lNo');
      var docYear = getVal('v_docYear') || '2568';
      var owner = getVal('v_owner');
      var nat = getVal('v_nat') || 'ไทย';
      var oAddrNo = getVal('v_oAddrNo');
      var oMoo = getVal('v_oMoo');
      var oTrok = getVal('v_oTrok') || '-';
      var oRoad = getVal('v_oRoad') || '-';
      var oTumbon = getVal('v_oTumbon') || 'บางเป้า';
      var oAmphoe = getVal('v_oAmphoe') || 'กันตัง';
      var oProv = getVal('v_oProv') || 'ตรัง';
      var oPhone = getVal('v_oPhone');
      
      var bType = getVal('v_bType');
      var bType2 = getVal('v_bTypeLine2');
      var bName = getVal('v_bName');
      var bAddrNo = getVal('v_bAddrNo') || oAddrNo;
      var bMoo = getVal('v_bMoo') || oMoo;
      var bTumbon = getVal('v_bTumbon') || oTumbon;
      var bAmphoe = getVal('v_bAmphoe') || oAmphoe;
      var bProv = getVal('v_bProv') || oProv;
      var bPhone = getVal('v_bPhone') || oPhone;
      
      var fee = getVal('v_fee');
      var feeT = getVal('v_feeT');
      var rBook = getVal('v_rBook');
      var rNo = getVal('v_rNo');
      var rDay = getVal('v_rDay');
      var rMonth = getVal('v_rMonth');
      var rYear = getVal('v_rYear');
      
      var cond31 = getVal('v_cond31');
      var cond32 = getVal('v_cond32');
      if (!cond31 || cond31 === '-') cond31 = '...............................................................................................................................';
      if (!cond32 || cond32 === '-') cond32 = '...............................................................................................................................';
      
      var sDay = getVal('v_sDay');
      var sMonth = getVal('v_sMonth');
      var sYear = getVal('v_sYear');
      var eDay = getVal('v_eDay');
      var eMonth = getVal('v_eMonth');
      var eYear = getVal('v_eYear');
      
      var exName = getVal('v_exName') || '(นายละดม  เชื้อช่วย)';
      var exPos = getVal('v_exPos') || 'ตำแหน่ง นายกเทศมนตรีตำบลบางเป้า';

      var tbody = document.getElementById('backTableBody');
      var trs = tbody ? tbody.getElementsByTagName('tr') : [];
      var rowsHtml = '';
      for (var i = 0; i < trs.length; i++) {
        var tds = trs[i].getElementsByTagName('td');
        if (tds.length >= 6) {
          rowsHtml += '<tr style="height: 45pt;">' +
            '<td>' + tds[0].textContent.trim() + '</td>' +
            '<td>' + tds[1].textContent.trim() + '</td>' +
            '<td>' + tds[2].textContent.trim() + '</td>' +
            '<td>' + tds[3].textContent.trim() + '</td>' +
            '<td>' + tds[4].textContent.trim() + '</td>' +
            '<td>' + tds[5].textContent.trim() + '</td>' +
          '</tr>';
        }
      }

      var garudaImg = document.querySelector('.garuda img');
      var garudaSrc = garudaImg ? garudaImg.src : '';
      var gWidth = currentDocLayout.garudaSize || 95;

      var wordHtml = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">' +
'<head><meta charset="utf-8"><title>License</title><style>' +
'@page WordSection1 { size: 21cm 29.7cm; margin: ' + currentDocLayout.marginTop + 'cm ' + currentDocLayout.marginRight + 'cm ' + currentDocLayout.marginBottom + 'cm ' + currentDocLayout.marginLeft + 'cm; mso-page-orientation: portrait; }' +
'div.WordSection1 { page: WordSection1; }' +
'body, p, table, tr, td, th { font-family: ' + currentDocLayout.fontFamily + '; }' +
'body { font-size: ' + currentDocLayout.fontSize + 'pt; line-height: ' + currentDocLayout.lineHeight + '; color: #000; }' +
'p { margin: 0 0 4pt 0; text-align: justify; }' +
'.center { text-align: center; } .bold { font-weight: bold; } .indent { text-indent: ' + currentDocLayout.indentSize + 'cm; }' +
'table.border { width: 100%; border-collapse: collapse; font-size: ' + currentDocLayout.tableFontSize + 'pt; }' +
'table.border th, table.border td { border: 1pt solid windowtext; padding: ' + currentDocLayout.tablePadding + 'pt; text-align: center; vertical-align: middle; font-weight: normal; }' +
'</style></head><body><div class="WordSection1">' +
'<p class="center" style="margin-top: 0; margin-bottom: 5pt;"><img src="' + garudaSrc + '" width="' + gWidth + '" height="' + gWidth + '"></p>' +
'<p class="center bold" style="font-size: ' + currentDocLayout.titleFontSize + 'pt; margin-top: 0pt; margin-bottom: 2pt;">ใบอนุญาต</p>' +
'<p class="center bold" style="font-size: ' + currentDocLayout.titleFontSize + 'pt; margin-bottom: 12pt;">ประกอบกิจการที่เป็นอันตรายต่อสุขภาพ</p>' +
'<p align="left" style="margin-top: 10pt; margin-bottom: 5pt; text-align: left;">เล่มที่ <u>&nbsp;&nbsp;' + (bNo && bNo !== '-' ? bNo : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;') + '&nbsp;&nbsp;</u> เลขที่ <u>&nbsp;&nbsp;' + (lNo && lNo !== '-' ? lNo : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;') + '&nbsp;&nbsp;</u> / <u>&nbsp;&nbsp;' + (docYear && docYear !== '-' ? docYear : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;') + '&nbsp;&nbsp;</u></p>' +
'<p class="indent" align="justify" style="text-align: justify; margin-top: 5pt;">(1) เจ้าพนักงานท้องถิ่นอนุญาตให้ <u>&nbsp;&nbsp;' + owner + '&nbsp;&nbsp;</u> สัญชาติ <u>&nbsp;&nbsp;' + nat + '&nbsp;&nbsp;</u></p>' +
'<p align="justify" style="text-align: justify; margin-top: 4pt;">อยู่บ้านเลขที่ <u>&nbsp;&nbsp;' + oAddrNo + '&nbsp;&nbsp;</u> หมู่ที่ <u>&nbsp;&nbsp;' + oMoo + '&nbsp;&nbsp;</u> ตรอก/ซอย <u>&nbsp;&nbsp;' + oTrok + '&nbsp;&nbsp;</u> ถนน <u>&nbsp;&nbsp;' + oRoad + '&nbsp;&nbsp;</u></p>' +
'<p align="justify" style="text-align: justify; margin-top: 4pt;">ตำบล/แขวง <u>&nbsp;&nbsp;' + oTumbon + '&nbsp;&nbsp;</u> อำเภอ/เขต <u>&nbsp;&nbsp;' + oAmphoe + '&nbsp;&nbsp;</u> จังหวัด <u>&nbsp;&nbsp;' + oProv + '&nbsp;&nbsp;</u></p>' +
'<p align="justify" style="text-align: justify; margin-top: 4pt;">หมายเลขโทรศัพท์ <u>&nbsp;&nbsp;' + oPhone + '&nbsp;&nbsp;</u></p>' +
'<p class="indent" style="margin-top: 8pt; text-align: justify;">ชื่อสถานประกอบกิจการที่เป็นอันตรายต่อสุขภาพ ประเภท <u>&nbsp;&nbsp;' + bType + '&nbsp;&nbsp;</u></p>' +
'<p style="margin-top: 4pt; text-align: justify;"><u>&nbsp;&nbsp;' + (bType2 || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;') + '&nbsp;&nbsp;</u> โดยใช้ชื่อ</p>' +
'<p style="margin-top: 4pt; text-align: justify;">สถานที่ <u>&nbsp;&nbsp;' + bName + '&nbsp;&nbsp;</u> ตั้งอยู่บ้านเลขที่ <u>&nbsp;&nbsp;' + bAddrNo + '&nbsp;&nbsp;</u> หมู่ที่ <u>&nbsp;&nbsp;' + bMoo + '&nbsp;&nbsp;</u> ตำบล <u>&nbsp;&nbsp;' + bTumbon + '&nbsp;&nbsp;</u></p>' +
'<p style="margin-top: 4pt; text-align: justify;">อำเภอ <u>&nbsp;&nbsp;' + bAmphoe + '&nbsp;&nbsp;</u> จังหวัด <u>&nbsp;&nbsp;' + bProv + '&nbsp;&nbsp;</u> หมายเลขโทรศัพท์ <u>&nbsp;&nbsp;' + bPhone + '&nbsp;&nbsp;</u></p>' +
'<p class="indent" style="margin-top: 8pt; text-align: justify;">เสียค่าธรรมเนียมปีละ <u>&nbsp;&nbsp;' + fee + '&nbsp;&nbsp;</u> บาท ( <u>&nbsp;&nbsp;' + feeT + '&nbsp;&nbsp;</u> )</p>' +
'<p style="margin-top: 4pt; text-align: justify;">ตามใบเสร็จรับเงินเล่มที่ <u>&nbsp;&nbsp;' + rBook + '&nbsp;&nbsp;</u> เลขที่ <u>&nbsp;&nbsp;' + rNo + '&nbsp;&nbsp;</u> ลงวันที่ <u>&nbsp;&nbsp;' + rDay + '&nbsp;&nbsp;</u> เดือน <u>&nbsp;&nbsp;' + rMonth + '&nbsp;&nbsp;</u> พ.ศ. <u>&nbsp;&nbsp;' + rYear + '&nbsp;&nbsp;</u></p>' +
'<p style="margin-top: 4pt; text-align: justify;">ผู้รับใบอนุญาตต้องปฏิบัติตามหลักเกณฑ์ วิธีการและเงื่อนไขที่กำหนดในข้อกำหนดของท้องถิ่น</p>' +
'<p class="indent" style="margin-top: 8pt;">(2) หากปรากฏในภายหลังว่าการประกอบกิจการที่ได้รับอนุญาตนี้เป็นการขัดต่อกฎหมายอื่นที่เกี่ยวข้อง</p>' +
'<p style="margin-top: 2pt;">โดยมิอาจแก้ไขได้ เจ้าพนักงานท้องถิ่นอาจพิจารณาให้เพิกถอนการอนุญาตนี้ได้</p>' +
'<p class="indent" style="margin-top: 6pt;">(3) ผู้รับใบอนุญาตต้องปฏิบัติตามเงื่อนไขเฉพาะดังต่อไปนี้อีกด้วย คือ</p>' +
'<p style="padding-left: 2.0cm; margin-top: 3pt;">3.1) <u>&nbsp;&nbsp;' + cond31 + '&nbsp;&nbsp;</u></p>' +
'<p style="padding-left: 2.0cm; margin-top: 3pt;">3.2) <u>&nbsp;&nbsp;' + cond32 + '&nbsp;&nbsp;</u></p>' +
'<p class="indent" style="margin-top: 6pt;">(4) ใบอนุญาตฉบับนี้ออกให้เมื่อวันที่ <u>&nbsp;&nbsp;' + sDay + '&nbsp;&nbsp;</u> เดือน <u>&nbsp;&nbsp;' + sMonth + '&nbsp;&nbsp;</u> พ.ศ. <u>&nbsp;&nbsp;' + sYear + '&nbsp;&nbsp;</u></p>' +
'<p class="indent" style="margin-top: 3pt;">(5) ใบอนุญาตฉบับนี้สิ้นอายุวันที่ <u>&nbsp;&nbsp;' + eDay + '&nbsp;&nbsp;</u> เดือน <u>&nbsp;&nbsp;' + eMonth + '&nbsp;&nbsp;</u> พ.ศ. <u>&nbsp;&nbsp;' + eYear + '&nbsp;&nbsp;</u></p>' +
'<table width="100%" cellpadding="0" cellspacing="0" style="margin-top: ' + currentDocLayout.sigMarginTop + 'pt; border: none;"><tr><td width="' + (100 - currentDocLayout.sigWidth) + '%" style="border: none;"></td><td width="' + currentDocLayout.sigWidth + '%" align="center" style="border: none; line-height: 1.45;">(ลงชื่อ)................................................................<br>(&nbsp;' + exName.replace(/^\s*\(+|\)+\s*$/g, '') + '&nbsp;)<br>' + exPos + '<br>เจ้าพนักงานท้องถิ่น</td></tr></table>' +
'<div style="margin-top: 15pt; font-size: ' + currentDocLayout.warningFontSize + 'pt; line-height: 1.35;"><p style="margin: 0;">คำเตือน &nbsp;&nbsp;&nbsp;&nbsp; (1) ผู้รับใบอนุญาตต้องแสดงใบอนุญาตนี้ไว้โดยเปิดเผยและเห็นได้ง่าย ณ สถานที่ประกอบกิจการ</p><p style="margin: 0; padding-left: 1.8cm;">ตลอดเวลาที่ประกอบกิจการ หากฝ่าฝืนมีโทษปรับไม่เกิน ห้าร้อยบาท</p><p style="margin-top: 2pt; padding-left: 1.8cm;">(2) หากประสงค์จะประกอบกิจการในปีต่อไปต้องยื่นคำขอต่ออายุใบอนุญาต<u>ก่อน</u>ใบอนุญาตสิ้นอายุ</p></div>' +
'<br clear="all" style="page-break-before:always" />' +
'<p class="center bold" style="margin-top: 30pt; margin-bottom: 15pt; font-size: 16pt;">รายการเสียค่าธรรมเนียมหนังสือรับรองการแจ้ง</p>' +
'<table class="border" style="margin-top: 20pt;"><thead><tr><th rowspan="2" style="width: ' + currentDocLayout.tableColWidths[0] + '%;">วัน/เดือน/ปี<br>ที่ออกใบอนุญาต</th><th rowspan="2" style="width: ' + currentDocLayout.tableColWidths[1] + '%;">วัน/เดือน/ปี<br>ที่สิ้นอายุใบอนุญาต</th><th colspan="3" style="width: ' + (currentDocLayout.tableColWidths[2] + currentDocLayout.tableColWidths[3] + currentDocLayout.tableColWidths[4]) + '%;">ใบเสร็จรับเงิน</th><th rowspan="2" style="width: ' + currentDocLayout.tableColWidths[5] + '%;">(ลงชื่อ)<br>เจ้าพนักงานท้องถิ่น</th></tr><tr><th style="width: ' + currentDocLayout.tableColWidths[2] + '%;">เล่มที่</th><th style="width: ' + currentDocLayout.tableColWidths[3] + '%;">เลขที่</th><th style="width: ' + currentDocLayout.tableColWidths[4] + '%;">วัน/เดือน/ปี</th></tr></thead><tbody>' +
rowsHtml +
'</tbody></table></div></body></html>';

      var bom = "\uFEFF";
      var blob = new Blob([bom + wordHtml], { type: 'application/msword;charset=utf-8;' });
      var link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      var safeName = (bName || 'อภ2').replace(/[\\/:*?"<>|]/g, '').trim();
      link.setAttribute("download", "ใบอนุญาต_" + safeName + ".doc");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    window.onload = function() {
      applyDocLayout();
    };
  </script>
</body>
</html>`;
}

/**
 * 2. Generates 100% exact HTML replica of ReportTemplate.html (Official 25-criteria inspection report)
 */
export function generateInspectionReportHtml(
  license: LicenseRecord,
  signers: SignerSettings
): string {
  const insp = license.inspectionData;
  const bName = insp?.businessName || license.businessName || '-';
  const owner = insp?.ownerName || license.ownerName || '-';
  const phone = insp?.ownerPhone || insp?.businessPhone || license.businessPhone || license.ownerPhone || '-';
  const phoneShop = insp?.businessPhone || license.businessPhone || phone;
  const bType = (insp?.selectedCategories && insp.selectedCategories.length > 0)
    ? insp.selectedCategories.join(', ')
    : (license.businessCategory || '-');
  const addrNo = insp?.addressNo || license.businessAddressNo || license.ownerAddressNo || '-';
  const moo = insp?.moo || license.businessMoo || license.ownerMoo || '-';
  const street = insp?.road || ((license.ownerRoad && license.ownerRoad !== '-') ? license.ownerRoad : '-');
  const tumbon = insp?.subdistrict || license.businessSubdistrict || 'บางเป้า';
  const amphoe = insp?.district || license.businessDistrict || 'กันตัง';
  const changwat = insp?.province || license.businessProvince || 'ตรัง';
  const animalType = insp?.animalType || '-';
  const animalCount = (insp?.animalCount !== undefined && insp.animalCount !== null && insp.animalCount !== 0) ? String(insp.animalCount) : '-';

  // Building Type checkboxes & details
  const bldgType = insp?.buildingType || '';
  const bldgDetails = insp?.buildingDetails || '';
  const isFactory = bldgType.includes('โรงงาน') || bldgType.includes('เอกเทศ');
  const isCommercial = bldgType.includes('พาณิชย์') || bldgType.includes('ตึกแถว');
  const isOffice = bldgType.includes('สำนักงาน');
  const isShed = bldgType.includes('โรงเรือน');
  const isWarehouse = bldgType.includes('โกดัง') || bldgType.includes('คลัง');
  const isOther = !isFactory && !isCommercial && !isOffice && !isShed && !isWarehouse && bldgType !== '';

  const factoryFloors = isFactory && bldgDetails ? bldgDetails : '...';
  const commFloors = isCommercial && bldgDetails ? bldgDetails : (isCommercial ? '1' : '...');
  const officeFloors = isOffice && bldgDetails ? bldgDetails : '...';
  const shedQty = isShed && bldgDetails ? bldgDetails : '...';
  const warehouseQty = isWarehouse && bldgDetails ? bldgDetails : '...';
  const otherText = isOther ? (bldgDetails || bldgType) : '...........................................';

  // Machines, workers, hours
  const machQty = insp?.machineCount !== undefined ? String(insp.machineCount) : '0';
  const machHp = insp?.horsepower !== undefined ? String(insp.horsepower) : '0';
  const maleWorkers = insp?.maleWorkers ?? 0;
  const femaleWorkers = insp?.femaleWorkers ?? 0;
  const totalWorkers = maleWorkers + femaleWorkers;
  const workingDays = insp?.workingDaysPerWeek !== undefined ? String(insp.workingDaysPerWeek) : '6';
  const startTime = insp?.startTime || '08:00';
  const endTime = insp?.endTime || '17:00';

  // Complaints
  const hadComplaints = insp?.hadComplaints === true;
  const complaintDetail = hadComplaints
    ? [(insp?.complaintCount ? (insp.complaintCount + ' ครั้ง') : ''), (insp?.complaintIssues?.join(', ') || '')].filter(Boolean).join(' ') || 'มีข้อร้องเรียน'
    : '....................................................';

  // Raw materials (5 rows)
  const rawMaterials = insp?.rawMaterials || [];
  const rawRowsCount = Math.max(5, rawMaterials.length);
  let rawMatHtml = '';
  for (let i = 0; i < rawRowsCount; i++) {
    const item = rawMaterials[i];
    const name = item?.name || '-';
    const qty = item?.monthlyQuantity || '-';
    rawMatHtml += `
      <tr style="height: 24px;">
        <td style="width: 25px; text-align: left; vertical-align: bottom; border: none !important;">${i + 1})</td>
        <td class="dotted-cell" align="center" style="padding: 0 5px; vertical-align: bottom; font-weight: normal; border-bottom: 1px dashed #000; text-align: center;">${escapeHtml(name)}</td>
        <td style="width: 150px; text-align: right; padding-right: 5px; vertical-align: bottom; white-space: nowrap; color: #000; border: none !important;">ปริมาณที่ใช้ (ต่อปี/เดือน)</td>
        <td class="dotted-cell" style="width: 180px; padding: 0 5px; vertical-align: bottom; font-weight: normal; border-bottom: 1px dashed #000; text-align: center;">${escapeHtml(qty)}</td>
      </tr>
    `;
  }

  // Criteria rows (25 items)
  let criteriaRowsHtml = '';
  OFFICIAL_25_CRITERIA.forEach((crit) => {
    if (crit.isSubItemHeader) {
      criteriaRowsHtml += `
        <!-- ${crit.itemNumber} Header -->
        <tr style="background-color: #fafafa;">
          <td colspan="6" style="text-align:left; line-height:1.35; font-weight:bold; padding: 5px 6px;">${crit.itemNumber.replace('ข้อ ', '')} ${crit.title}</td>
        </tr>
      `;
    } else {
      const ans = insp?.criteriaAnswers ? insp.criteriaAnswers[crit.id] : null;
      const isYes = ans?.answer === 'yes';
      const isNo = ans?.answer === 'no';
      const isNa = ans?.answer === 'na';
      const findings = ans?.findings || '';
      const recommendations = ans?.recommendations || '';
      const isSub = crit.itemNumber.includes('.');
      const paddingLeft = isSub ? 'padding-left: 15px;' : '';
      const num = crit.itemNumber.replace('ข้อ ', '');

      criteriaRowsHtml += `
        <!-- ${crit.itemNumber} -->
        <tr>
          <td style="text-align:left; line-height:1.35; ${paddingLeft}">${num} ${crit.title}</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle; font-weight:bold; color: #166534;">${isYes ? '✓' : ''}</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle; font-weight:bold; color: #991b1b;">${isNo ? '✓' : ''}</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle; font-weight:bold; color: #475569;">${isNa ? '✓' : ''}</td>
          <td style="line-height:1.25; font-size:12.5px;">${escapeHtml(findings)}</td>
          <td style="line-height:1.25; font-size:12.5px;">${escapeHtml(recommendations)}</td>
        </tr>
      `;
    }
  });

  // Summary & Signers
  const additionalNotes = insp?.additionalNotes || 
    (insp?.overallResult === 'passed' 
      ? 'สถานประกอบการผ่านเกณฑ์มาตรฐานการตรวจประเมินสุขลักษณะขั้นพื้นฐาน และมีมาตรการดูแลความปลอดภัยในการปฏิบัติงาน' 
      : (insp?.overallResult === 'needs_improvement' ? 'ควรปรับปรุงตามข้อเสนอแนะที่ระบุไว้ข้างต้น' : '-'));
  const inspectorName = insp?.inspectorName || signers.inspectorName || 'พันจ่าเอกอานัส เด็นหมาด';
  const inspectorPos = insp?.inspectorPosition || signers.inspectorPos || 'เจ้าพนักงานสาธารณสุขชำนาญงาน';
  const inspectDate = license.approvalDate || new Date().toLocaleDateString('th-TH');

  return `<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <meta charset="UTF-8">
  <title>แบบประเมินมาตรฐานสุขลักษณะ - ${bName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&display=swap');
    
    @media print {
      body { background: #fff !important; }
      .page-container { margin: 0 !important; padding: 0 !important; width: 100% !important; }
      .no-print { display: none !important; }
    }
    @page { size: A4 portrait; margin: 10mm; }

    body {
      font-family: 'TH Sarabun PSK', 'TH Sarabun New', 'Sarabun', sans-serif;
      font-size: 13px;
      line-height: 1.4;
      color: #000;
      margin: 0;
      padding: 0;
      background: #f1f5f9;
    }
    .report-container {
      width: 190mm;
      margin: 20px auto;
      padding: 10mm;
      background: #fff;
      box-sizing: border-box;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .header-title {
      font-size: 15px;
      font-weight: bold;
      text-align: center;
      margin-bottom: 12px;
      line-height: 1.35;
    }
    .section-title {
      font-weight: bold;
      margin-top: 12px;
      margin-bottom: 4px;
      font-size: 13px;
    }
    
    .line-row { display: flex; width: 100%; margin-bottom: 6px; align-items: flex-end; }
    .line-label { font-weight: normal; white-space: nowrap; padding-right: 4px; }
    .line-value { flex-grow: 1; padding: 0 4px 1px 4px; font-weight: normal; min-height: 18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center; border-bottom: 1px dashed #000; }
    .dotted-underline { border-bottom: 1px dashed #000; }
    .dotted-cell { border: none !important; border-bottom: 1px dashed #000 !important; padding-bottom: 2px; }
    
    .lined-notes { 
      background-image: 
        linear-gradient(to right, #000 50%, transparent 50%),
        linear-gradient(to right, #000 50%, transparent 50%),
        linear-gradient(to right, #000 50%, transparent 50%),
        linear-gradient(to right, #000 50%, transparent 50%);
      background-size: 8px 1px;
      background-repeat: repeat-x;
      background-position: 0 23px, 0 47px, 0 71px, 0 95px;
      line-height: 24px; min-height: 72px; font-weight: normal; 
    }
    
    .checkbox-item { display: flex; align-items: center; margin-bottom: 3px; }
    .checkbox-icon { font-size: 15px; margin-right: 4px; line-height: 1; }

    .main-table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; table-layout: fixed; }
    .main-table th, .main-table td { border: 1px solid #000; padding: 3px 4px; vertical-align: top; word-wrap: break-word; }
    .main-table th { background-color: #f2f2f2; text-align: center; font-weight: bold; }
    
    .sign-table-wrapper { width: 100%; margin-top: 25px; display: flex; justify-content: flex-end; page-break-inside: avoid; break-inside: avoid; }

    .no-print {
      margin-bottom: 15px;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
    .btn-action {
      padding: 6px 14px;
      color: white;
      border: none;
      cursor: pointer;
      font-weight: bold;
      font-family: inherit;
      font-size: 13px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
  </style>
</head>
<body>

  <div class="report-container">
    <div class="no-print">
      <button onclick="exportToWord();" class="btn-action" style="background-color: #0056b3;">
        📝 ส่งออก Word
      </button>
      <button onclick="exportToExcel();" class="btn-action" style="background-color: #059669;">
        📊 ส่งออก Excel
      </button>
      <button onclick="window.print();" class="btn-action" style="background-color: #28a745;">
        🖨️ สั่งพิมพ์รายงาน
      </button>
      <button onclick="window.close();" class="btn-action" style="background-color: #6c757d;">
        ✕ ปิดหน้าต่าง
      </button>
    </div>

    <div class="header-title">แบบประเมินมาตรฐานการจัดการอนามัยสิ่งแวดล้อมสำหรับสถานประกอบกิจการ<br>ที่เป็นอันตรายต่อสุขภาพ ตามกฎกระทรวงควบคุมสถานประกอบกิจการ</div>

    <div class="section-title">ส่วนที่ 1 ข้อมูลทั่วไป</div>
    <div style="padding-left: 5px;">
      <table style="width: 100%; border-collapse: collapse; font-family: inherit; font-size: 13px; line-height: 1.2; margin-bottom: 6px;">
        <tr>
          <td style="width: 140px; white-space: nowrap; vertical-align: bottom;">1. สถานประกอบกิจการประเภท</td>
          <td id="v_business_type" class="dotted-cell" align="center" style="vertical-align: bottom; text-align: center; border-bottom: 1px dashed #000;">${escapeHtml(bType)}</td>
        </tr>
      </table>
      <table style="width: 100%; border-collapse: collapse; font-family: inherit; font-size: 13px; line-height: 1.2; margin-bottom: 6px;">
        <tr>
          <td style="width: 135px; white-space: nowrap; vertical-align: bottom;">2. ชื่อ-สกุลผู้ดำเนินกิจการ</td>
          <td id="v_owner_name" align="center" class="dotted-cell" style="width: 250px; vertical-align: bottom; text-align: center; border-bottom: 1px dashed #000;">${escapeHtml(owner)}</td>
          <td style="width: 50px; white-space: nowrap; vertical-align: bottom; padding-left: 10px;">โทรศัพท์</td>
          <td id="v_phone_owner" align="center" class="dotted-cell" style="vertical-align: bottom; text-align: center; border-bottom: 1px dashed #000;">${escapeHtml(phone)}</td>
        </tr>
      </table>
      <table style="width: 100%; border-collapse: collapse; font-family: inherit; font-size: 13px; line-height: 1.2; margin-bottom: 6px;">
        <tr>
          <td style="width: 120px; white-space: nowrap; vertical-align: bottom; padding-left: 15px;">ชื่อสถานประกอบกิจการ</td>
          <td id="v_shopName" align="center" class="dotted-cell" style="vertical-align: bottom; text-align: center; border-bottom: 1px dashed #000;">${escapeHtml(bName)}</td>
        </tr>
      </table>
      <table style="width: 100%; border-collapse: collapse; font-family: inherit; font-size: 13px; line-height: 1.2; margin-bottom: 6px;">
        <tr>
          <td style="width: 70px; white-space: nowrap; vertical-align: bottom; padding-left: 15px;">ตั้งอยู่เลขที่</td>
          <td id="v_address" align="center" class="dotted-cell" style="width: 80px; vertical-align: bottom; text-align: center; border-bottom: 1px dashed #000;">${escapeHtml(addrNo)}</td>
          <td style="width: 40px; white-space: nowrap; vertical-align: bottom; padding-left: 10px;">หมู่ที่</td>
          <td id="v_moo" align="center" class="dotted-cell" style="width: 70px; vertical-align: bottom; text-align: center; border-bottom: 1px dashed #000;">${escapeHtml(moo)}</td>
          <td style="width: 30px; white-space: nowrap; vertical-align: bottom; padding-left: 10px;">ถนน</td>
          <td id="v_street" align="center" class="dotted-cell" style="vertical-align: bottom; text-align: center; border-bottom: 1px dashed #000;">${escapeHtml(street)}</td>
        </tr>
      </table>
      <table style="width: 100%; border-collapse: collapse; font-family: inherit; font-size: 13px; line-height: 1.2; margin-bottom: 6px;">
        <tr>
          <td style="width: 40px; white-space: nowrap; vertical-align: bottom; padding-left: 15px;">ตำบล</td>
          <td id="v_tumbon" align="center" class="dotted-cell" style="vertical-align: bottom; text-align: center; border-bottom: 1px dashed #000;">${escapeHtml(tumbon)}</td>
          <td style="width: 40px; white-space: nowrap; vertical-align: bottom; padding-left: 10px;">อำเภอ</td>
          <td id="v_amphoe" align="center" class="dotted-cell" style="width: 150px; vertical-align: bottom; text-align: center; border-bottom: 1px dashed #000;">${escapeHtml(amphoe)}</td>
          <td style="width: 45px; white-space: nowrap; vertical-align: bottom; padding-left: 10px;">จังหวัด</td>
          <td id="v_changwat" align="center" class="dotted-cell" style="width: 150px; vertical-align: bottom; text-align: center; border-bottom: 1px dashed #000;">${escapeHtml(changwat)}</td>
        </tr>
      </table>
      <table style="width: 100%; border-collapse: collapse; font-family: inherit; font-size: 13px; line-height: 1.2; margin-bottom: 6px;">
        <tr>
          <td style="width: 70px; white-space: nowrap; vertical-align: bottom; padding-left: 15px;">โทรศัพท์ร้าน</td>
          <td id="v_phone_shop" align="center" class="dotted-cell" style="vertical-align: bottom; text-align: center; border-bottom: 1px dashed #000;">${escapeHtml(phoneShop)}</td>
        </tr>
      </table>
      <table style="width: 100%; border-collapse: collapse; font-family: inherit; font-size: 13px; line-height: 1.2; margin-bottom: 6px;">
        <tr>
          <td style="width: 250px; white-space: nowrap; vertical-align: bottom;">3. กรณีประกอบกิจการเลี้ยงสัตว์ (ระบุ) ชนิดสัตว์</td>
          <td id="v_animal" align="center" class="dotted-cell" style="width: 200px; vertical-align: bottom; text-align: center; border-bottom: 1px dashed #000;">${escapeHtml(animalType)}</td>
          <td style="width: 40px; white-space: nowrap; vertical-align: bottom; padding-left: 10px;">จำนวน</td>
          <td id="v_animal_qty" align="center" class="dotted-cell" style="vertical-align: bottom; text-align: center; border-bottom: 1px dashed #000;">${escapeHtml(animalCount)}</td>
          <td style="width: 20px; white-space: nowrap; vertical-align: bottom; padding-left: 5px;">ตัว</td>
        </tr>
      </table>
      
      <div style="margin-top: 8px;">4. ลักษณะอาคารประกอบกิจการ</div>
      <div style="padding-left: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;" id="bldgArea">
        <div class="checkbox-item"><span class="checkbox-icon">${isFactory ? '☑' : '☐'}</span> อาคารโรงงาน/อาคารเอกเทศ จำนวน <span style="margin:0 4px;">${escapeHtml(factoryFloors)}</span> ชั้น</div>
        <div class="checkbox-item"><span class="checkbox-icon">${isCommercial ? '☑' : '☐'}</span> อาคารพาณิชย์/พาณิชย์-พักอาศัย จำนวน <span style="margin:0 4px;">${escapeHtml(commFloors)}</span> ชั้น</div>
        <div class="checkbox-item"><span class="checkbox-icon">${isOffice ? '☑' : '☐'}</span> อาคารสำนักงาน จำนวน <span style="margin:0 4px;">${escapeHtml(officeFloors)}</span> ชั้น</div>
        <div class="checkbox-item"><span class="checkbox-icon">${isShed ? '☑' : '☐'}</span> โรงเรือน จำนวน <span style="margin:0 4px;">${escapeHtml(shedQty)}</span> หลัง</div>
        <div class="checkbox-item"><span class="checkbox-icon">${isWarehouse ? '☑' : '☐'}</span> โกดัง จำนวน <span style="margin:0 4px;">${escapeHtml(warehouseQty)}</span> หลัง</div>
        <div class="checkbox-item"><span class="checkbox-icon">${isOther ? '☑' : '☐'}</span> อื่นๆ <span style="margin:0 4px;">${escapeHtml(otherText)}</span></div>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-family: inherit; font-size: 13px; line-height: 1.2; margin-top: 8px; margin-bottom: 6px;">
        <tr>
          <td style="width: 100px; white-space: nowrap; vertical-align: bottom;">5. จำนวนเครื่องจักร</td>
          <td id="v_machQty" align="center" class="dotted-cell" style="width: 150px; vertical-align: bottom; text-align: center; border-bottom: 1px dashed #000;">${machQty}</td>
          <td style="width: 20px; white-space: nowrap; vertical-align: bottom; padding-left: 5px;">ตัว</td>
          <td style="width: 100px; white-space: nowrap; vertical-align: bottom; padding-left: 15px;">รวมจำนวนแรงม้า</td>
          <td id="v_machHp" align="center" class="dotted-cell" style="vertical-align: bottom; text-align: center; border-bottom: 1px dashed #000;">${machHp}</td>
          <td style="width: 40px; white-space: nowrap; vertical-align: bottom; padding-left: 5px;">แรงม้า</td>
        </tr>
      </table>
      <table style="width: 100%; border-collapse: collapse; font-family: inherit; font-size: 13px; line-height: 1.2; margin-bottom: 6px;">
        <tr>
          <td style="width: 120px; white-space: nowrap; vertical-align: bottom;">6. จำนวนพนักงานทั้งหมด</td>
          <td id="v_total" align="center" class="dotted-cell" style="width: 80px; vertical-align: bottom; text-align: center; border-bottom: 1px dashed #000;">${totalWorkers}</td>
          <td style="width: 20px; white-space: nowrap; vertical-align: bottom; padding-left: 5px;">คน</td>
          <td style="width: 30px; white-space: nowrap; vertical-align: bottom; padding-left: 15px;">ชาย</td>
          <td id="v_male" align="center" class="dotted-cell" style="width: 100px; vertical-align: bottom; text-align: center; border-bottom: 1px dashed #000;">${maleWorkers}</td>
          <td style="width: 20px; white-space: nowrap; vertical-align: bottom; padding-left: 5px;">คน</td>
          <td style="width: 30px; white-space: nowrap; vertical-align: bottom; padding-left: 15px;">หญิง</td>
          <td id="v_female" align="center" class="dotted-cell" style="vertical-align: bottom; text-align: center; border-bottom: 1px dashed #000;">${femaleWorkers}</td>
          <td style="width: 20px; white-space: nowrap; vertical-align: bottom; padding-left: 5px;">คน</td>
        </tr>
      </table>
      <table style="width: 100%; border-collapse: collapse; font-family: inherit; font-size: 13px; line-height: 1.2; margin-bottom: 6px;">
        <tr>
          <td style="width: 100px; white-space: nowrap; vertical-align: bottom;">7. ระยะเวลาการทำงาน</td>
          <td id="v_days" align="center" class="dotted-cell" style="width: 80px; vertical-align: bottom; text-align: center; border-bottom: 1px dashed #000;">${workingDays}</td>
          <td style="width: 60px; white-space: nowrap; vertical-align: bottom; padding-left: 5px;">วัน/สัปดาห์</td>
          <td style="width: 60px; white-space: nowrap; vertical-align: bottom; padding-left: 10px;">ตั้งแต่เวลา</td>
          <td id="v_start" align="center" class="dotted-cell" style="width: 100px; vertical-align: bottom; text-align: center; border-bottom: 1px dashed #000;">${startTime}</td>
          <td style="width: 60px; white-space: nowrap; vertical-align: bottom; padding-left: 5px;">น. ถึงเวลา</td>
          <td id="v_end" align="center" class="dotted-cell" style="vertical-align: bottom; text-align: center; border-bottom: 1px dashed #000;">${endTime}</td>
          <td style="width: 20px; white-space: nowrap; vertical-align: bottom; padding-left: 5px;">น.</td>
        </tr>
      </table>
      <div style="margin-top: 8px;">8. ในรอบปีที่ผ่านมา สถานประกอบกิจการเคยถูกร้องเรียนก่อปัญหาเหตุรำคาญหรือมลพิษสิ่งแวดล้อม</div>
      <div style="padding-left: 20px; display: flex; gap: 20px;" id="compArea">
        <div class="checkbox-item"><span class="checkbox-icon">${!hadComplaints ? '☑' : '☐'}</span> ไม่เคยถูกร้องเรียน</div>
        <div class="checkbox-item"><span class="checkbox-icon">${hadComplaints ? '☑' : '☐'}</span> เคยถูกร้องเรียน (ระบุ) ${escapeHtml(complaintDetail)}</div>
      </div>
    </div>

    <div class="section-title" style="margin-top: 20px;">ส่วนที่ 2 วัตถุดิบและสารเคมีที่ใช้ในกระบวนการผลิต (ระบุชนิดและปริมาณ/เดือน)</div>
    <div style="padding-left: 20px;" id="materialsTableWrapper">
      <table style="width: 100%; border-collapse: collapse; font-family: inherit; font-size: 12px; margin-top: 5px; border: none !important;">
        <tbody id="materialsTableBody">
          ${rawMatHtml}
        </tbody>
      </table>
    </div>

    <div class="section-title" style="margin-top: 20px;">ส่วนที่ 3 รายการตรวจสอบสุขลักษณะสถานประกอบกิจการ</div>
    <table class="main-table">
      <thead>
        <tr>
          <th rowspan="2" style="width: 41%; vertical-align: middle;">รายการตรวจสอบสุขลักษณะ</th>
          <th colspan="3" style="width: 29%; vertical-align: middle;">ผลการตรวจสอบ</th>
          <th rowspan="2" style="width: 15%; vertical-align: middle;">ข้อเท็จจริงที่พบ</th>
          <th rowspan="2" style="width: 15%; vertical-align: middle;">คำแนะนำ</th>
        </tr>
        <tr>
          <th style="font-size: 11px; width: 6%; text-align: center; vertical-align: middle; white-space: nowrap; padding: 4px 1px;">ใช่</th>
          <th style="font-size: 11px; width: 6.5%; text-align: center; vertical-align: middle; white-space: nowrap; padding: 4px 1px;">ไม่ใช่</th>
          <th style="font-size: 11px; width: 16.5%; text-align: center; vertical-align: middle; white-space: nowrap; padding: 4px 4px; font-weight: bold;">ไม่เกี่ยวข้อง</th>
        </tr>
      </thead>
      <tbody>
        ${criteriaRowsHtml}
      </tbody>
    </table>

    <div style="margin-top: 20px;">
      <div class="line-row"><div class="line-label"><b>ข้อเสนอแนะ/สรุปผลการตรวจประเมิน:</b></div></div>
      <div id="v_extra_comment" class="lined-notes" style="width: 100%; padding-left: 10px;">
        ${escapeHtml(additionalNotes)}
      </div>
      
      <div class="sign-table-wrapper">
        <table style="width: 400px; border-collapse: collapse; font-family: inherit; font-size: 13px; margin-top: 20px;">
          <tr>
            <td style="white-space: nowrap; text-align: left; padding: 0; vertical-align: bottom; line-height: 1.2;">ลงชื่อ</td>
            <td style="padding: 0; border-bottom: 1px dashed #000; line-height: 1.2;"></td>
            <td style="width: 100px; text-align: right; padding: 0; vertical-align: bottom; line-height: 1.2;">ผู้ตรวจประเมิน</td>
          </tr>
          <tr>
            <td style="padding: 0; line-height: 1.2;"></td>
            <td style="text-align: center; padding: 2px 0 0 0; line-height: 1.2;">( <span id="v_inspector_name" style="font-weight: normal;">${escapeHtml(inspectorName)}</span> )</td>
            <td style="padding: 0; line-height: 1.2;"></td>
          </tr>
          <tr>
            <td style="text-align: left; padding: 8px 0 0 0; vertical-align: bottom; line-height: 1.2;">ตำแหน่ง</td>
            <td id="v_inspector_position" style="text-align: center; padding: 8px 0 0 0; vertical-align: bottom; font-weight: normal; line-height: 1.2;">${escapeHtml(inspectorPos)}</td>
            <td style="padding: 0; line-height: 1.2;"></td>
          </tr>
          <tr>
            <td style="width: 100px; text-align: left; padding: 12px 0 0 0; vertical-align: bottom; line-height: 1.2; white-space: nowrap;">วันที่ตรวจประเมิน</td>
            <td style="padding: 12px 0 0 0; border-bottom: 1px dashed #000; line-height: 1.2; text-align: center;">${escapeHtml(inspectDate)}</td>
            <td style="padding: 0; line-height: 1.2;"></td>
          </tr>
        </table>
      </div>
    </div>
  </div>

  <script>
    function exportToWord() {
      var header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>รายงานการตรวจ_${bName}</title></head><body>";
      var footer = "</body></html>";
      var clone = document.documentElement.cloneNode(true);
      var noPrintElements = clone.querySelectorAll('.no-print');
      noPrintElements.forEach(function(el) { el.parentNode.removeChild(el); });
      var sourceHTML = header + clone.innerHTML + footer;
      var blob = new Blob(['\uFEFF' + sourceHTML], { type: 'application/msword;charset=utf-8;' });
      var fileDownload = document.createElement("a");
      document.body.appendChild(fileDownload);
      fileDownload.href = URL.createObjectURL(blob);
      fileDownload.download = 'รายงานตรวจ_${bName.replace(/\\s+/g, '_')}.doc';
      fileDownload.click();
      document.body.removeChild(fileDownload);
    }

    function exportToExcel() {
      var header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:x='urn:schemas-microsoft-com:office:excel' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>รายงานการตรวจ_${bName}</title></head><body>";
      var footer = "</body></html>";
      var clone = document.documentElement.cloneNode(true);
      var noPrintElements = clone.querySelectorAll('.no-print');
      noPrintElements.forEach(function(el) { el.parentNode.removeChild(el); });
      var sourceHTML = header + clone.innerHTML + footer;
      var blob = new Blob(['\uFEFF' + sourceHTML], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      var fileDownload = document.createElement("a");
      document.body.appendChild(fileDownload);
      fileDownload.href = URL.createObjectURL(blob);
      fileDownload.download = 'รายงานตรวจ_${bName.replace(/\\s+/g, '_')}.xls';
      fileDownload.click();
      document.body.removeChild(fileDownload);
    }

    window.onload = function() {
      setTimeout(function(){
        window.print();
      }, 500);
    }
  </script>
</body>
</html>`;
}

/**
 * 3. Generates 100% exact HTML replica of Medical Equipment Loan Contract (doc_text_utf8.txt)
 */
export function generateEquipmentLoanHtml(
  loan: EquipmentLoan,
  signers: SignerSettings
): string {
  return generateOfficialMedicalLoanHtml(loan, signers);
}

export function printHtmlInNewWindow(html: string) {
  const win = window.open('', '_blank');
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      try {
        win.print();
      } catch (e) {
        console.warn('Auto print trigger note:', e);
      }
    }, 700);
  }
}

/**
 * Helper to export any HTML as Word .doc
 */
export function exportHtmlAsWord(html: string, filename: string) {
  let sourceHTML = html;

  // If the input is not already a complete MSO Word HTML document with <head>, wrap it properly
  if (!html.trim().toLowerCase().startsWith('<html') || !html.includes('WordSection1')) {
    const header =
      "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>" +
      filename +
      '</title></head><body>';
    const footer = '</body></html>';

    // Strip no-print elements
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const noPrints = tempDiv.querySelectorAll('.print-control-bar, .no-print, .word-toolbar-box, script');
    noPrints.forEach((el) => el.remove());

    sourceHTML = header + tempDiv.innerHTML + footer;
  }

  const blob = new Blob(['\ufeff' + sourceHTML], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeFilename = filename.replace(/[\\/:*?"<>|]/g, '').trim() || 'document';
  a.download = safeFilename.endsWith('.doc') ? safeFilename : `${safeFilename}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Direct Microsoft Word (.docx) export for LicenseRecord built directly from the official Bangpao Municipality .docx template
 */
export function exportLicenseWordDoc(license: LicenseRecord, signers: SignerSettings) {
  const lNoFull = (license.licenseNumber || '').replace('เลขที่', '').trim();
  const yearMatch = lNoFull.match(/\/(25\d{2})/);
  const docYear = yearMatch ? yearMatch[1] : (license.licenseYear || '2568');
  const lNo = lNoFull.includes('/') ? lNoFull.split('/')[0].trim() : (lNoFull || '04');
  const rawBookNo = (license.licenseBookNo || '').trim();
  const bNo = rawBookNo && !rawBookNo.includes('/') ? rawBookNo : '-';

  const owner = license.ownerName || '';
  const nat = license.nationality || 'ไทย';
  const oAddrNo = license.ownerAddressNo || license.businessAddressNo || '';
  const oMoo = license.ownerMoo || license.businessMoo || '';
  const oTrok = (license.ownerTrokSoi && license.ownerTrokSoi !== '-') ? license.ownerTrokSoi : '-';
  const oRoad = (license.ownerRoad && license.ownerRoad !== '-') ? license.ownerRoad : '-';
  const oTumbon = license.ownerSubdistrict || license.businessSubdistrict || 'บางเป้า';
  const oAmphoe = license.ownerDistrict || license.businessDistrict || 'กันตัง';
  const oProv = license.ownerProvince || license.businessProvince || 'ตรัง';
  const oPhone = license.ownerPhone || license.businessPhone || '';

  const bType = license.businessCategory || '';
  const { b1: bType1, b2: bType2 } = splitBizCategoryForDocx(bType, '');

  const bName = license.businessName || '';
  const bAddrNo = license.businessAddressNo || license.ownerAddressNo || '';
  const bMoo = license.businessMoo || license.ownerMoo || '';
  const bTumbon = license.businessSubdistrict || 'บางเป้า';
  const bAmphoe = license.businessDistrict || 'กันตัง';
  const bProv = license.businessProvince || 'ตรัง';
  const bPhone = license.businessPhone || license.ownerPhone || '';

  const fee = license.feeAmount ? `${String(license.feeAmount).replace(/[^0-9]/g, '')}.-` : '500.-';
  const feeT = license.feeText ? `- ${license.feeText.replace(/^\s*-\s*|\s*-\s*$/g, '')} -` : '- ห้าร้อยบาทถ้วน -';
  const rawReceiptBook = (license.receiptBookNo || '').trim();
  const rBook = rawReceiptBook && !rawReceiptBook.includes('/') ? rawReceiptBook : '-';
  const rNo = license.receiptNo || '/2568';

  const sDate = formatThaiDateParts(license.approvalDate);
  const eDate = formatThaiDateParts(license.expireDate);
  const rDate = license.receiptDate ? formatThaiDateParts(license.receiptDate) : sDate;

  const rawExName = license.execName || signers.actingMayorName || signers.mayorName || 'นายละดม  เชื้อช่วย';
  const cleanExName = rawExName.replace(/^\s*\(+|\)+\s*$/g, '').trim() || 'นายละดม  เชื้อช่วย';
  const rawExPos = license.execPos || (signers.actingMayorPosition ? `${signers.actingMayorPosition} ${signers.actingMayorFor || 'นายกเทศมนตรีตำบลบางเป้า'}` : signers.mayorPos) || 'นายกเทศมนตรีตำบลบางเป้า';
  const cleanExPos = cleanSignerPosition(rawExPos);

  const cond31 = cleanBoilerplateCondition(license.condition31);
  const cond32 = cleanBoilerplateCondition(license.condition32);

  const row1Issue = `${sDate.d ? sDate.d + ' ' : ''}${shortThaiMonth(sDate.m) || sDate.m} ${sDate.y}`.trim();
  const row1Expire = `${eDate.d ? eDate.d + ' ' : ''}${shortThaiMonth(eDate.m) || eDate.m} ${eDate.y}`.trim();
  const row1ReceiptDate = `${rDate.d ? rDate.d + ' ' : ''}${shortThaiMonth(rDate.m) || rDate.m} ${rDate.y}`.trim();

  const payload: DocxLicensePayload = {
    bookNo: bNo,
    docNo: lNo,
    docYear,
    applicantName: owner,
    nationality: nat,
    houseNo: oAddrNo,
    moo: oMoo,
    soi: oTrok,
    road: oRoad,
    subdistrict: oTumbon,
    district: oAmphoe,
    province: oProv,
    phone: oPhone,
    bizType: bType1,
    bizTypeLine2: bType2,
    bizName: bName,
    bizHouseNo: bAddrNo,
    bizMoo: bMoo,
    bizSubdistrict: bTumbon,
    bizDistrict: bAmphoe,
    bizProvince: bProv,
    bizPhone: bPhone,
    feeAmount: fee,
    feeText: feeT,
    receiptBook: rBook,
    receiptNo: rNo,
    receiptDay: rDate.d || '',
    receiptMonth: rDate.m || 'กุมภาพันธ์',
    receiptYear: rDate.y || docYear,
    cond1: cond31,
    cond2: cond32,
    issueDay: sDate.d || '',
    issueMonth: sDate.m || 'กุมภาพันธ์',
    issueYear: sDate.y || docYear,
    expireDay: eDate.d || '',
    expireMonth: eDate.m || 'กุมภาพันธ์',
    expireYear: eDate.y || String((parseInt(docYear, 10) || 2568) + 1),
    signerName: cleanExName,
    signerTitle: cleanExPos,
    backRows: [
      { issueDate: row1Issue, expireDate: row1Expire, book: rBook, no: rNo, date: row1ReceiptDate, signer: `(${cleanExName})` },
      { issueDate: '', expireDate: '', book: '', no: '', date: '', signer: '' },
      { issueDate: '', expireDate: '', book: '', no: '', date: '', signer: '' },
      { issueDate: '', expireDate: '', book: '', no: '', date: '', signer: '' },
      { issueDate: '', expireDate: '', book: '', no: '', date: '', signer: '' },
      { issueDate: '', expireDate: '', book: '', no: '', date: '', signer: '' },
    ],
  };

  exportOfficialLicenseDocx(payload, `ใบอนุญาต_${(bName || 'อภ2').replace(/\s+/g, '_')}.docx`);
}

/**
 * 100% Dynamic Word export with full 25-criteria inspection data
 */
export function exportInspectionReportWord(license: LicenseRecord, signers: SignerSettings) {
  const insp = license.inspectionData;
  const shopName = insp?.businessName || license.businessName || '-';
  const ownerName = insp?.ownerName || license.ownerName || '-';
  const ownerPhone = insp?.ownerPhone || insp?.businessPhone || license.ownerPhone || license.businessPhone || '-';
  const shopPhone = insp?.businessPhone || license.businessPhone || ownerPhone;
  const bType = (insp?.selectedCategories && insp.selectedCategories.length > 0)
    ? insp.selectedCategories.join(', ')
    : (license.businessCategory || '-');
  const addrNo = insp?.addressNo || license.businessAddressNo || license.ownerAddressNo || '-';
  const moo = insp?.moo || license.businessMoo || license.ownerMoo || '-';
  const road = insp?.road || license.businessRoad || ((license.ownerRoad && license.ownerRoad !== '-') ? license.ownerRoad : '-');
  const tumbon = insp?.subdistrict || license.businessSubdistrict || 'บางเป้า';
  const amphoe = insp?.district || license.businessDistrict || 'กันตัง';
  const prov = insp?.province || license.businessProvince || 'ตรัง';

  // Building Type checkboxes & details
  const bldgType = insp?.buildingType || '';
  const isFactory = bldgType.includes('โรงงาน') || bldgType.includes('เอกเทศ');
  const isCommercial = bldgType.includes('พาณิชย์') || bldgType.includes('ตึกแถว');
  const isOther = !isFactory && !isCommercial && bldgType !== '';

  const machQty = insp?.machineCount !== undefined ? String(insp.machineCount) : '0';
  const horsepower = insp?.horsepower !== undefined ? String(insp.horsepower) : '0';
  const workingDays = insp?.workingDaysPerWeek !== undefined ? String(insp.workingDaysPerWeek) : '6';
  const maleWorkers = insp?.maleWorkers ?? 0;
  const femaleWorkers = insp?.femaleWorkers ?? 0;
  const totalWorkers = maleWorkers + femaleWorkers;
  const startTime = insp?.startTime || '08:00';
  const endTime = insp?.endTime || '17:00';

  const hadComplaints = insp?.hadComplaints === true;
  const complaintCount = insp?.complaintCount ? (insp.complaintCount + ' ครั้ง') : '';
  const complaintIssues = (insp?.complaintIssues && insp.complaintIssues.length > 0)
    ? insp.complaintIssues.join(', ')
    : '';
  const complaintDetail = [complaintCount, complaintIssues].filter(Boolean).join(' ') || '......';

  // Raw materials
  const rawMaterials = insp?.rawMaterials || [];
  const rawMatRows = Array.from({ length: Math.max(2, rawMaterials.length) }).map((_, i) => {
    const item = rawMaterials[i];
    return `
      <tr>
        <td width="5%">${i + 1})</td>
        <td class="u" width="32%" align="center">${escapeHtml(item?.name || '-')}</td>
        <td width="28%" align="right">ปริมาณที่ใช้ (ต่อปี/เดือน)&nbsp;&nbsp;</td>
        <td class="u" width="35%" align="center">${escapeHtml(item?.monthlyQuantity || '-')}</td>
      </tr>
    `;
  }).join('');

  // Criteria Table
  let criteriaRows = '';
  OFFICIAL_25_CRITERIA.forEach((crit) => {
    if (crit.isSubItemHeader) {
      criteriaRows += `<tr><td colspan="6" style="background:#fafafa; font-weight:bold;">${crit.itemNumber} ${crit.title}</td></tr>`;
    } else {
      const ans = insp?.criteriaAnswers ? insp.criteriaAnswers[crit.id] : null;
      const isYes = ans?.answer === 'yes';
      const isNo = ans?.answer === 'no';
      const isNa = ans?.answer === 'na';
      const findings = ans?.findings || '';
      const recommendations = ans?.recommendations || '';
      const isSub = crit.itemNumber.includes('.');
      const prefix = isSub ? '&nbsp;&nbsp;&nbsp;&nbsp;' : '';

      criteriaRows += `
        <tr>
          <td valign="top">${prefix}${crit.itemNumber.replace('ข้อ ', '')}. ${crit.title}</td>
          <td valign="middle" align="center">${isYes ? '<span class="chk">✓</span>' : ''}</td>
          <td valign="middle" align="center">${isNo ? '<span class="chk">✓</span>' : ''}</td>
          <td valign="middle" align="center">${isNa ? '<span class="chk">✓</span>' : ''}</td>
          <td valign="top">${escapeHtml(findings)}</td>
          <td valign="top">${escapeHtml(recommendations)}</td>
        </tr>`;
    }
  });

  const additionalNotes = insp?.additionalNotes || 
    (insp?.overallResult === 'passed' ? 'ผ่านเกณฑ์มาตรฐานการประเมินสุขลักษณะสถานประกอบกิจการ' : (insp?.overallResult === 'needs_improvement' ? 'ควรปรับปรุงตามข้อเสนอแนะที่ระบุไว้ข้างต้น' : '-'));
  const inspector = insp?.inspectorName || signers.inspectorName || 'พันจ่าเอกอานัส เด็นหมาด';
  const inspectorPos = insp?.inspectorPosition || signers.inspectorPos || 'เจ้าพนักงานสาธารณสุขชำนาญงาน';
  const inspectDate = license.approvalDate || new Date().toLocaleDateString('th-TH');

  let htmlContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
    <meta charset="utf-8">
    <title>แบบประเมินมาตรฐานสุขลักษณะ</title>
    <style>
      @page WordSection1 { size: 21cm 29.7cm; margin: 1cm 1.5cm 1cm 1.5cm; mso-page-orientation: portrait; }
      div.WordSection1 { page: WordSection1; }
      body, p, table, tr, td, th, span, div {
        font-family: 'TH SarabunPSK', 'TH Sarabun New', 'Sarabun', sans-serif !important;
        font-size: 16pt;
        color: #000000;
        line-height: 1.1;
      }
      p { margin: 0 0 4pt 0; text-align: left; }
      .chk { font-family: 'Segoe UI Symbol', 'Arial Unicode MS', sans-serif !important; font-weight: bold; }
      .u { border-bottom: 1pt dotted #000; display: inline-block; padding: 0 5px; }
      .bold { font-weight: bold; }
    </style>
    </head>
    <body>
    <div class="WordSection1">
      <p style="text-align: center; font-weight: bold; font-size: 18pt;">แบบประเมินมาตรฐานการจัดการอนามัยสิ่งแวดล้อมสำหรับสถานประกอบกิจการ</p>
      <p style="text-align: center; font-weight: bold; font-size: 16pt; margin-bottom: 12pt;">ที่เป็นอันตรายต่อสุขภาพ ตามกฎกระทรวงควบคุมสถานประกอบกิจการ</p>
      
      <p class="bold">ส่วนที่ 1 ข้อมูลทั่วไป</p>
      
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-left: 15px;">
        <tr>
          <td width="30%" valign="top">1. สถานประกอบกิจการประเภท</td>
          <td class="u" width="70%" valign="top">${escapeHtml(bType)}</td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-left: 15px;">
        <tr>
          <td width="22%">2. ชื่อ-สกุลผู้ดำเนินกิจการ</td>
          <td class="u" width="45%" align="center">${escapeHtml(ownerName)}</td>
          <td width="10%">โทรศัพท์</td>
          <td class="u" width="23%" align="center">${escapeHtml(ownerPhone)}</td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-left: 15px;">
        <tr>
          <td width="20%">ชื่อสถานประกอบกิจการ</td>
          <td class="u" width="80%" align="center">${escapeHtml(shopName)}</td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-left: 15px;">
        <tr>
          <td width="15%">ตั้งอยู่เลขที่</td>
          <td class="u" width="15%" align="center">${escapeHtml(addrNo)}</td>
          <td width="8%">หมู่ที่</td>
          <td class="u" width="12%" align="center">${escapeHtml(moo)}</td>
          <td width="8%">ถนน</td>
          <td class="u" width="42%" align="center">${escapeHtml(road)}</td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-left: 15px;">
        <tr>
          <td width="8%">ตำบล</td>
          <td class="u" width="22%" align="center">${escapeHtml(tumbon)}</td>
          <td width="8%">อำเภอ</td>
          <td class="u" width="22%" align="center">${escapeHtml(amphoe)}</td>
          <td width="8%">จังหวัด</td>
          <td class="u" width="32%" align="center">${escapeHtml(prov)}</td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-left: 15px;">
        <tr>
          <td width="25%">โทรศัพท์สถานประกอบการ</td>
          <td class="u" width="75%" align="center">${escapeHtml(shopPhone)}</td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-left: 15px; margin-top: 4pt;">
        <tr>
          <td width="25%">3. ลักษณะอาคาร</td>
          <td width="75%"><span class="chk">${isFactory ? '☑' : '☐'}</span> อาคารโรงงาน/อาคารเอกเทศ &nbsp;&nbsp; <span class="chk">${isCommercial ? '☑' : '☐'}</span> อาคารพาณิชย์ &nbsp;&nbsp; <span class="chk">${isOther ? '☑' : '☐'}</span> อื่น ๆ</td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-left: 15px;">
        <tr>
          <td width="30%">4. จำนวนเครื่องจักร/อุปกรณ์</td>
          <td class="u" width="20%" align="center">${machQty}</td>
          <td width="5%">ตัว</td>
          <td width="20%">รวมกำลังแรงม้า</td>
          <td class="u" width="20%" align="center">${horsepower}</td>
          <td width="5%">HP</td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-left: 15px;">
        <tr>
          <td width="28%">5. จำนวนวันทำงานต่อสัปดาห์</td>
          <td class="u" width="15%" align="center">${workingDays}</td>
          <td width="57%">วัน/สัปดาห์</td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-left: 15px;">
        <tr>
          <td width="25%">6. จำนวนคนงานทั้งหมด</td>
          <td class="u" width="15%" align="center">${totalWorkers}</td>
          <td width="10%">คน</td>
          <td width="15%">คนงานชาย</td>
          <td class="u" width="12%" align="center">${maleWorkers}</td>
          <td width="8%">คน</td>
          <td width="15%">คนงานหญิง</td>
          <td class="u" width="12%" align="center">${femaleWorkers}</td>
          <td width="8%">คน</td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-left: 15px;">
        <tr>
          <td width="20%">7. ช่วงเวลาทำงาน</td>
          <td width="12%">ตั้งแต่เวลา</td>
          <td class="u" width="15%" align="center">${startTime}</td>
          <td width="8%">ถึงเวลา</td>
          <td class="u" width="15%" align="center">${endTime}</td>
          <td width="10%">น.</td>
        </tr>
      </table>

      <p style="margin-top: 6pt;">8. ในรอบปีที่ผ่านมา สถานประกอบกิจการเคยถูกร้องเรียนก่อปัญหาเหตุรำคาญหรือมลพิษสิ่งแวดล้อม</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-left: 20px;">
        <tr><td colspan="3"><span class="chk">${!hadComplaints ? '☑' : '☐'}</span> ไม่เคย</td></tr>
        <tr><td colspan="3"><span class="chk">${hadComplaints ? '☑' : '☐'}</span> เคย จำนวน <span class="u">${escapeHtml(complaintDetail)}</span></td></tr>
      </table>

      <p class="bold" style="margin-top: 12pt;">ส่วนที่ 2 วัตถุดิบและสารเคมีที่ใช้ในกระบวนการผลิต (ระบุชนิดและปริมาณ/เดือน)</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-left: 20px; margin-bottom: 12pt;">
        ${rawMatRows}
      </table>
      
      <p class="bold">ส่วนที่ 3 รายการตรวจสอบสุขลักษณะสถานประกอบกิจการ</p>
      <table border="1" cellpadding="3" cellspacing="0" width="100%" style="border-collapse: collapse; margin-top: 6pt;">
        <tr>
          <th rowspan="2" width="50%" style="background:#f2f2f2; text-align:center;">รายการตรวจสอบสุขลักษณะ</th>
          <th colspan="3" width="20%" style="background:#f2f2f2; text-align:center;">ผลการตรวจสอบ</th>
          <th rowspan="2" width="15%" style="background:#f2f2f2; text-align:center;">ข้อเท็จจริงที่พบ</th>
          <th rowspan="2" width="15%" style="background:#f2f2f2; text-align:center;">คำแนะนำ</th>
        </tr>
        <tr>
          <th width="6%" style="background:#f2f2f2; text-align:center;">ใช่</th>
          <th width="7%" style="background:#f2f2f2; text-align:center;">ไม่ใช่</th>
          <th width="7%" style="background:#f2f2f2; text-align:center; font-size:12pt;">ไม่เกี่ยวข้อง</th>
        </tr>
        ${criteriaRows}
      </table>

      <p class="bold" style="margin-top: 15pt;">ข้อเสนอแนะ/สรุปผลการตรวจประเมิน:</p>
      <div class="u" style="width: 100%; min-height: 40pt;">${escapeHtml(additionalNotes)}</div>
      
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 40pt;">
        <tr>
          <td width="50%"></td>
          <td width="50%">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="25%" align="left">ลงชื่อ</td>
                <td class="u" width="55%" align="center"></td>
                <td width="20%" align="left">&nbsp;ผู้ตรวจประเมิน</td>
              </tr>
              <tr>
                <td></td>
                <td align="center" style="padding-top: 5pt;">( ${escapeHtml(inspector)} )</td>
                <td></td>
              </tr>
              <tr>
                <td align="left" style="padding-top: 5pt;">ตำแหน่ง</td>
                <td align="center" style="padding-top: 5pt;">${escapeHtml(inspectorPos)}</td>
                <td></td>
              </tr>
              <tr>
                <td align="left" style="padding-top: 5pt;">วันที่ตรวจ</td>
                <td class="u" align="center" style="padding-top: 5pt;">${escapeHtml(inspectDate)}</td>
                <td></td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

    </div>
    </body>
    </html>`;

  const bom = '\uFEFF';
  const blob = new Blob([bom + htmlContent], {
    type: 'application/msword;charset=utf-8;',
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  const safeName = shopName.replace(/[\\/:"*?<>|]/g, '');
  link.setAttribute('download', `แบบพิมพ์รายงาน_${safeName.trim()}.doc`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Direct Excel (.xls) export of 25-criteria Inspection Report
 */
export function exportInspectionReportExcel(license: LicenseRecord, signers: SignerSettings) {
  const insp = license.inspectionData;
  const bName = insp?.businessName || license.businessName || '-';
  const owner = insp?.ownerName || license.ownerName || '-';
  const phone = insp?.ownerPhone || insp?.businessPhone || license.businessPhone || license.ownerPhone || '-';
  const bType = (insp?.selectedCategories && insp.selectedCategories.length > 0)
    ? insp.selectedCategories.join(', ')
    : (license.businessCategory || '-');
  const addrNo = insp?.addressNo || license.businessAddressNo || license.ownerAddressNo || '-';
  const moo = insp?.moo || license.businessMoo || license.ownerMoo || '-';
  const road = insp?.road || license.businessRoad || ((license.ownerRoad && license.ownerRoad !== '-') ? license.ownerRoad : '-');
  const tumbon = insp?.subdistrict || license.businessSubdistrict || 'บางเป้า';
  const amphoe = insp?.district || license.businessDistrict || 'กันตัง';
  const changwat = insp?.province || license.businessProvince || 'ตรัง';
  const inspector = insp?.inspectorName || signers.inspectorName || 'พันจ่าเอกอานัส เด็นหมาด';
  const inspectorPos = insp?.inspectorPosition || signers.inspectorPos || 'เจ้าพนักงานสาธารณสุขชำนาญงาน';
  const inspectDate = license.approvalDate || new Date().toLocaleDateString('th-TH');

  const criteriaRows = OFFICIAL_25_CRITERIA.map((crit) => {
    if (crit.isSubItemHeader) {
      return `
        <tr style="background-color: #f1f5f9; font-weight: bold;">
          <td colspan="7" style="padding: 6px 8px; border: 1px solid #cbd5e1;">${crit.itemNumber} ${crit.title}</td>
        </tr>
      `;
    }
    const ans = insp?.criteriaAnswers ? insp.criteriaAnswers[crit.id] : null;
    const isYes = ans?.answer === 'yes' ? '✓' : '';
    const isNo = ans?.answer === 'no' ? '✓' : '';
    const isNa = ans?.answer === 'na' ? '✓' : '';
    const findings = ans?.findings || '';
    const recommendations = ans?.recommendations || '';
    return `
      <tr>
        <td style="text-align: center; border: 1px solid #cbd5e1; font-weight: bold;">${crit.itemNumber}</td>
        <td style="border: 1px solid #cbd5e1;">${crit.title}</td>
        <td style="text-align: center; font-weight: bold; border: 1px solid #cbd5e1; color: #166534;">${isYes}</td>
        <td style="text-align: center; font-weight: bold; border: 1px solid #cbd5e1; color: #991b1b;">${isNo}</td>
        <td style="text-align: center; font-weight: bold; border: 1px solid #cbd5e1; color: #475569;">${isNa}</td>
        <td style="border: 1px solid #cbd5e1;">${escapeHtml(findings)}</td>
        <td style="border: 1px solid #cbd5e1;">${escapeHtml(recommendations)}</td>
      </tr>
    `;
  }).join('');

  const rawMaterials = insp?.rawMaterials || [];
  const rawMatRows = rawMaterials.length > 0 
    ? rawMaterials.map((m, idx) => `
        <tr>
          <td style="border: 1px solid #cbd5e1; text-align: center;">${idx + 1}</td>
          <td colspan="3" style="border: 1px solid #cbd5e1;">${escapeHtml(m.name || '-')}</td>
          <td colspan="3" style="border: 1px solid #cbd5e1;">${escapeHtml(m.monthlyQuantity || '-')}</td>
        </tr>
      `).join('')
    : `<tr><td colspan="7" style="border: 1px solid #cbd5e1; text-align: center; color: #94a3b8;">- ไม่มีข้อมูลวัตถุดิบและสารเคมี -</td></tr>`;

  const excelContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>รายงานผลการตรวจสุขลักษณะ</x:Name>
              <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        body, table, td, th { font-family: 'Sarabun', 'TH SarabunPSK', sans-serif; font-size: 13px; }
        .title { font-size: 16px; font-weight: bold; text-align: center; color: #0f172a; }
        .section-header { background-color: #047857; color: #ffffff; font-weight: bold; font-size: 14px; }
        .table-header { background-color: #e2e8f0; font-weight: bold; text-align: center; }
      </style>
    </head>
    <body>
      <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
        <tr>
          <td colspan="7" class="title" style="padding: 12px; background-color: #ecfdf5; border: 1px solid #059669;">
            แบบประเมินมาตรฐานการจัดการอนามัยสิ่งแวดล้อมสำหรับสถานประกอบกิจการที่เป็นอันตรายต่อสุขภาพ<br>
            เทศบาลตำบลบางเป้า อำเภอกันตัง จังหวัดตรัง
          </td>
        </tr>
        <tr><td colspan="7" style="border: none; height: 10px;"></td></tr>
        <tr class="section-header">
          <td colspan="7" style="padding: 8px;">ส่วนที่ 1 ข้อมูลทั่วไปของสถานประกอบกิจการ</td>
        </tr>
        <tr>
          <td style="font-weight: bold; background: #f8fafc; border: 1px solid #cbd5e1;">ชื่อสถานประกอบการ</td>
          <td colspan="3" style="border: 1px solid #cbd5e1;">${escapeHtml(bName)}</td>
          <td style="font-weight: bold; background: #f8fafc; border: 1px solid #cbd5e1;">ประเภทกิจการ</td>
          <td colspan="2" style="border: 1px solid #cbd5e1;">${escapeHtml(bType)}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; background: #f8fafc; border: 1px solid #cbd5e1;">ผู้ดำเนินกิจการ</td>
          <td colspan="3" style="border: 1px solid #cbd5e1;">${escapeHtml(owner)}</td>
          <td style="font-weight: bold; background: #f8fafc; border: 1px solid #cbd5e1;">โทรศัพท์</td>
          <td colspan="2" style="border: 1px solid #cbd5e1;">${escapeHtml(phone)}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; background: #f8fafc; border: 1px solid #cbd5e1;">ที่ตั้ง</td>
          <td colspan="6" style="border: 1px solid #cbd5e1;">เลขที่ ${escapeHtml(addrNo)} หมู่ที่ ${escapeHtml(moo)} ถนน ${escapeHtml(road)} ตำบล ${escapeHtml(tumbon)} อำเภอ ${escapeHtml(amphoe)} จังหวัด ${escapeHtml(changwat)}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; background: #f8fafc; border: 1px solid #cbd5e1;">ลักษณะอาคาร</td>
          <td colspan="3" style="border: 1px solid #cbd5e1;">${escapeHtml(insp?.buildingType || '-')} ${escapeHtml(insp?.buildingDetails || '')}</td>
          <td style="font-weight: bold; background: #f8fafc; border: 1px solid #cbd5e1;">เครื่องจักร/แรงม้า</td>
          <td colspan="2" style="border: 1px solid #cbd5e1;">${insp?.machineCount || 0} เครื่อง / ${insp?.horsepower || 0} แรงม้า</td>
        </tr>
        <tr>
          <td style="font-weight: bold; background: #f8fafc; border: 1px solid #cbd5e1;">จำนวนคนงาน</td>
          <td colspan="3" style="border: 1px solid #cbd5e1;">รวม ${(insp?.maleWorkers || 0) + (insp?.femaleWorkers || 0)} คน (ชาย ${insp?.maleWorkers || 0}, หญิง ${insp?.femaleWorkers || 0})</td>
          <td style="font-weight: bold; background: #f8fafc; border: 1px solid #cbd5e1;">วันเวลาทำงาน</td>
          <td colspan="2" style="border: 1px solid #cbd5e1;">${insp?.workingDaysPerWeek || 6} วัน/สัปดาห์ (${insp?.startTime || '08:00'} - ${insp?.endTime || '17:00'} น.)</td>
        </tr>

        <tr><td colspan="7" style="border: none; height: 10px;"></td></tr>
        <tr class="section-header">
          <td colspan="7" style="padding: 8px;">ส่วนที่ 2 วัตถุดิบและสารเคมีที่ใช้ในกระบวนการผลิต</td>
        </tr>
        <tr class="table-header">
          <th style="width: 8%; border: 1px solid #cbd5e1;">ลำดับ</th>
          <th colspan="3" style="width: 52%; border: 1px solid #cbd5e1;">ชนิดวัตถุดิบ/สารเคมี</th>
          <th colspan="3" style="width: 40%; border: 1px solid #cbd5e1;">ปริมาณที่ใช้ (ต่อปี/เดือน)</th>
        </tr>
        ${rawMatRows}

        <tr><td colspan="7" style="border: none; height: 10px;"></td></tr>
        <tr class="section-header">
          <td colspan="7" style="padding: 8px;">ส่วนที่ 3 รายการตรวจสอบสุขลักษณะสถานประกอบกิจการ (25 ข้อ)</td>
        </tr>
        <tr class="table-header">
          <th style="width: 8%; border: 1px solid #cbd5e1;">ข้อที่</th>
          <th style="width: 42%; border: 1px solid #cbd5e1;">รายการประเมินสุขลักษณะ</th>
          <th style="width: 8%; border: 1px solid #cbd5e1;">ใช่</th>
          <th style="width: 8%; border: 1px solid #cbd5e1;">ไม่ใช่</th>
          <th style="width: 10%; border: 1px solid #cbd5e1;">ไม่เกี่ยวข้อง</th>
          <th style="width: 12%; border: 1px solid #cbd5e1;">ข้อเท็จจริงที่พบ</th>
          <th style="width: 12%; border: 1px solid #cbd5e1;">คำแนะนำ</th>
        </tr>
        ${criteriaRows}

        <tr><td colspan="7" style="border: none; height: 10px;"></td></tr>
        <tr class="section-header">
          <td colspan="7" style="padding: 8px;">ข้อเสนอแนะ / สรุปผลการประเมิน</td>
        </tr>
        <tr>
          <td colspan="7" style="padding: 10px; border: 1px solid #cbd5e1; background-color: #fafafa;">
            ${escapeHtml(insp?.additionalNotes || (insp?.overallResult === 'passed' ? 'สถานประกอบการผ่านเกณฑ์มาตรฐานการตรวจประเมินสุขลักษณะขั้นพื้นฐาน' : '-'))}
          </td>
        </tr>
        <tr>
          <td colspan="4" style="border: none;"></td>
          <td colspan="3" style="border: 1px solid #cbd5e1; padding: 10px; background-color: #f8fafc; text-align: center;">
            ลงชื่อ ..................................................... ผู้ตรวจประเมิน<br>
            ( ${escapeHtml(inspector)} )<br>
            ตำแหน่ง ${escapeHtml(inspectorPos)}<br>
            วันที่ตรวจ ${escapeHtml(inspectDate)}
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const bom = '\uFEFF';
  const blob = new Blob([bom + excelContent], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeName = bName.replace(/[\\/:"*?<>|]/g, '').trim();
  link.setAttribute('download', `รายงานผลตรวจ_${safeName}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
