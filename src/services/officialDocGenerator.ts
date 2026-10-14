import { LicenseRecord, SignerSettings, EquipmentLoan } from '../types/index.ts';
import { GARUDA_BASE64 } from '../data/garudaBase64.ts';

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
  const docYear = yearMatch ? yearMatch[1] : (license.licenseYear || '2569');
  const lNo = lNoFull.includes('/') ? lNoFull.split('/')[0] : lNoFull;
  const bNo = license.licenseBookNo || '-';

  const owner = license.ownerName || '-';
  const nat = license.nationality || 'ไทย';
  const oAddrNo = license.ownerAddressNo || license.businessAddressNo || '-';
  const oMoo = license.ownerMoo || license.businessMoo || '-';
  const oTrok = (license.ownerTrokSoi && license.ownerTrokSoi !== '-') ? license.ownerTrokSoi : '-';
  const oRoad = (license.ownerRoad && license.ownerRoad !== '-') ? license.ownerRoad : '-';
  const oTumbon = license.ownerSubdistrict || license.businessSubdistrict || 'บางเป้า';
  const oAmphoe = license.ownerDistrict || license.businessDistrict || 'กันตัง';
  const oProv = license.ownerProvince || license.businessProvince || 'ตรัง';
  const oPhone = license.ownerPhone || license.businessPhone || '-';

  const bType = license.businessCategory || '-';
  const bName = license.businessName || '-';
  const bAddrNo = license.businessAddressNo || license.ownerAddressNo || '-';
  const bMoo = license.businessMoo || license.ownerMoo || '-';
  const bTrok = (license.businessTrokSoi && license.businessTrokSoi !== '-') ? license.businessTrokSoi : '-';
  const bRoad = (license.businessRoad && license.businessRoad !== '-') ? license.businessRoad : '-';
  const bTumbon = license.businessSubdistrict || 'บางเป้า';
  const bAmphoe = license.businessDistrict || 'กันตัง';
  const bProv = license.businessProvince || 'ตรัง';
  const bPhone = license.businessPhone || license.ownerPhone || '-';

  const fee = custom?.fee || (license.feeAmount ? String(license.feeAmount) : '200');
  const feeT = custom?.feeText || license.feeText || 'สองร้อยบาทถ้วน';
  const rBook = custom?.receiptBook || license.receiptBookNo || '-';
  const rNo = custom?.receiptNo || license.receiptNo || 'RCPT-00637/69';

  let sDate = formatThaiDateParts(license.approvalDate);
  let eDate = formatThaiDateParts(license.expireDate);
  if (!sDate.d) sDate = { d: '22', m: 'กรกฎาคม', y: '2569' };
  if (!eDate.d) eDate = { d: '22', m: 'กรกฎาคม', y: '2570' };
  const rDate = license.receiptDate ? formatThaiDateParts(license.receiptDate) : sDate;

  const exName = license.execName || signers.mayorName || 'นายนิติธรรม ดำสุด';
  const exPos = license.execPos || signers.mayorPos || 'รองนายกเทศมนตรี ปฏิบัติราชการแทน\nนายกเทศมนตรีตำบลบางเป้า';
  const formattedExPos = exPos.replace(/\n/g, '<br>');

  return `<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <meta charset="utf-8">
  <title>ใบอนุญาตประกอบกิจการที่เป็นอันตรายต่อสุขภาพ - ${bName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet">
  <style>
    @font-face {
      font-family: 'TH Sarabun PSK';
      src: local('TH Sarabun PSK'), local('THSarabunPSK');
    }
    @font-face {
      font-family: 'TH Sarabun New';
      src: local('TH Sarabun New'), local('THSarabunNew');
    }
    
    @page {
      size: A4 portrait;
      margin: 0;
    }
    
    body {
      font-family: 'TH Sarabun PSK', 'TH Sarabun New', 'Sarabun', sans-serif;
      font-size: 15pt;
      line-height: 1.25;
      color: #000;
      margin: 0;
      padding: 0;
      background: #e2e8f0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .page {
      background: white;
      width: 21cm;
      height: 29.7cm;
      box-sizing: border-box;
      padding: 1.2cm 2cm 0.8cm 2.5cm;
      margin: 1cm auto;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      position: relative;
      page-break-after: always;
      break-after: page;
      overflow: hidden;
    }
    
    .garuda {
      text-align: center;
      margin-bottom: 2px;
    }
    
    .garuda img {
      width: 82px;
      height: auto;
    }
    
    .title {
      text-align: center;
      font-weight: bold;
      font-size: 17.5pt;
      margin-bottom: 4px;
      line-height: 1.15;
    }
    
    .header-info {
      text-align: right;
      margin-bottom: 6px;
      padding-right: 0.5cm;
      font-size: 15pt;
    }
    
    .indent {
      text-indent: 1.5cm;
    }
    
    .doc-body {
      font-size: 15.5pt;
    }

    .doc-line {
      line-height: 1.5;
      margin-bottom: 2px;
      text-align: justify;
      text-justify: inter-word;
    }
    
    .signature-box {
      width: 55%;
      float: right;
      text-align: center;
      margin-top: 14px;
      margin-bottom: 10px;
      line-height: 1.35;
    }
    
    .footer-warning {
      clear: both;
      font-size: 13.5pt;
      margin-top: 18px;
      line-height: 1.35;
    }
    
    .fill {
      border-bottom: 1px dotted #000;
      display: inline-block;
      text-align: center;
      padding: 0 4px;
      font-weight: bold;
      vertical-align: bottom;
      margin-bottom: -2px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 25px;
      font-size: 14pt;
    }
    
    th, td {
      border: 1px solid #000;
      text-align: center;
      padding: 6px;
    }
    
    .page-break {
      page-break-before: always;
      break-before: page;
    }

    @media print {
      body {
        background: none;
        margin: 0;
        padding: 0;
      }
      .page {
        margin: 0;
        box-shadow: none;
        width: 21cm;
        height: 29.7cm;
        padding: 1.2cm 2cm 1cm 2.5cm;
        page-break-after: always;
        break-after: page;
        box-sizing: border-box;
      }
      .print-control-bar {
        display: none !important;
      }
    }
    
    .print-control-bar {
      position: fixed;
      top: 15px;
      right: 20px;
      display: flex;
      gap: 10px;
      z-index: 9999;
      background: rgba(15, 23, 42, 0.9);
      padding: 8px 12px;
      border-radius: 12px;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3);
      backdrop-filter: blur(8px);
    }
    
    .btn-action {
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-family: 'Sarabun', sans-serif;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      color: white;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }
    .btn-print { background: #059669; }
    .btn-print:hover { background: #047857; }
    .btn-word { background: #2563eb; }
    .btn-word:hover { background: #1d4ed8; }
    .btn-close { background: #64748b; }
    .btn-close:hover { background: #475569; }
  </style>
</head>
<body>

  <!-- Floating Action Bar (Hidden when printing) -->
  <div class="print-control-bar">
    <button class="btn-action btn-print" onclick="window.print()">
      🖨️ สั่งพิมพ์เอกสาร A4 (PDF)
    </button>
    <button class="btn-action btn-word" onclick="exportLicenseWord()">
      📝 ส่งออกเป็น Word (.doc)
    </button>
    <button class="btn-action btn-close" onclick="window.close()">
      ✕ ปิด
    </button>
  </div>

  <!-- Page 1: License Front -->
  <div class="page" id="licenseDocPage1">
    <div class="garuda">
      <img src="${GARUDA_BASE64}" alt="ตราครุฑ">
    </div>
    
    <div class="title">ใบอนุญาต<br>ประกอบกิจการที่เป็นอันตรายต่อสุขภาพ</div>
    
    <div class="header-info">
      <div>เล่มที่ <span class="fill" style="min-width: 60px;">${bNo}</span> เลขที่ <span class="fill" style="min-width: 60px;">${lNo}/${docYear}</span></div>
    </div>
    
    <div class="doc-body">
      <div class="doc-line indent">
        เจ้าพนักงานท้องถิ่นอนุญาตให้ <span class="fill" style="min-width: 250px;">${owner}</span> สัญชาติ <span class="fill" style="min-width: 80px;">${nat}</span>
      </div>
      <div class="doc-line">
        อยู่บ้านเลขที่ <span class="fill" style="min-width: 70px;">${oAddrNo}</span> หมู่ที่ <span class="fill" style="min-width: 40px;">${oMoo}</span> ตรอก/ซอย <span class="fill" style="min-width: 100px;">${oTrok}</span> ถนน <span class="fill" style="min-width: 100px;">${oRoad}</span>
      </div>
      <div class="doc-line">
        ตำบล/แขวง <span class="fill" style="min-width: 110px;">${oTumbon}</span> อำเภอ/เขต <span class="fill" style="min-width: 110px;">${oAmphoe}</span> จังหวัด <span class="fill" style="min-width: 110px;">${oProv}</span>
      </div>
      <div class="doc-line">
        หมายเลขโทรศัพท์ <span class="fill" style="min-width: 180px;">${oPhone}</span>
      </div>
      
      <div class="doc-line indent" style="margin-top: 6px;">
        ประกอบกิจการ <span class="fill" style="min-width: 450px;">${bType}</span>
      </div>
      <div class="doc-line">
        โดยใช้ชื่อสถานที่ <span class="fill" style="min-width: 450px;">${bName}</span>
      </div>
      <div class="doc-line">
        ตั้งอยู่อยู่บ้านเลขที่ <span class="fill" style="min-width: 60px;">${bAddrNo}</span> หมู่ที่ <span class="fill" style="min-width: 40px;">${bMoo}</span> ตรอก/ซอย <span class="fill" style="min-width: 80px;">${bTrok}</span> ถนน <span class="fill" style="min-width: 80px;">${bRoad}</span>
      </div>
      <div class="doc-line">
        ตำบล/แขวง <span class="fill" style="min-width: 100px;">${bTumbon}</span> อำเภอ/เขต <span class="fill" style="min-width: 100px;">${bAmphoe}</span> จังหวัด <span class="fill" style="min-width: 100px;">${bProv}</span>
      </div>
      <div class="doc-line">
        หมายเลขโทรศัพท์ <span class="fill" style="min-width: 180px;">${bPhone}</span>
      </div>
      
      <div class="doc-line indent" style="margin-top: 6px;">
        เสียค่าธรรมเนียมปีละ <span class="fill" style="min-width: 70px;">${fee}</span> บาท ( <span class="fill" style="min-width: 180px;">${feeT}</span> )
      </div>
      <div class="doc-line">
        ตามใบเสร็จรับเงินเล่มที่ <span class="fill" style="min-width: 50px;">${rBook}</span> เลขที่ <span class="fill" style="min-width: 100px;">${rNo}</span> ลงวันที่ <span class="fill" style="min-width: 30px;">${rDate.d}</span> เดือน <span class="fill" style="min-width: 80px;">${rDate.m}</span> พ.ศ. <span class="fill" style="min-width: 50px;">${rDate.y}</span>
      </div>
      
      <div class="doc-line indent" style="margin-top: 6px;">
        (1) ผู้รับใบอนุญาตต้องปฏิบัติตามหลักเกณฑ์ วิธีการ และเงื่อนไขที่กำหนดไว้ในข้อกำหนดของท้องถิ่น
      </div>
      <div class="doc-line indent">
        (2) หากปรากฏในภายหลังว่าการประกอบกิจการที่ได้รับอนุญาตนี้เป็นการขัดต่อกฎหมายอื่นที่เกี่ยวข้อง โดยมิอาจแก้ไขได้ เจ้าพนักงานท้องถิ่นอาจพิจารณาให้เพิกถอนการอนุญาตนี้ได้
      </div>
      <div class="doc-line indent">
        (3) ผู้รับใบอนุญาตต้องปฏิบัติตามเงื่อนไขเฉพาะดังต่อไปนี้อีกด้วย คือ
      </div>
      <div class="doc-line" style="padding-left: 2cm;">
        3.1 <span class="fill" style="min-width: 90%; text-align: left; padding-left: 8px;">${license.condition31 && license.condition31 !== '-' ? license.condition31 : ''}</span>
      </div>
      <div class="doc-line" style="padding-left: 2cm;">
        3.2 <span class="fill" style="min-width: 90%; text-align: left; padding-left: 8px;">${license.condition32 && license.condition32 !== '-' ? license.condition32 : ''}</span>
      </div>
      <div class="doc-line indent">
        (4) ใบอนุญาตฉบับนี้ออกให้เมื่อวันที่ <span class="fill" style="min-width: 30px;">${sDate.d}</span> เดือน <span class="fill" style="min-width: 80px;">${sDate.m}</span> พ.ศ. <span class="fill" style="min-width: 50px;">${sDate.y}</span>
      </div>
      <div class="doc-line indent">
        (5) ใบอนุญาตฉบับนี้สิ้นอายุวันที่ <span class="fill" style="min-width: 30px;">${eDate.d}</span> เดือน <span class="fill" style="min-width: 80px;">${eDate.m}</span> พ.ศ. <span class="fill" style="min-width: 50px;">${eDate.y}</span>
      </div>
    </div>
    
    <div class="signature-box">
      <div>(ลงชื่อ).......................................................</div>
      <div style="margin-top: 3px; font-weight: bold;">(${exName})</div>
      <div style="margin-top: 3px;">ตำแหน่ง ${formattedExPos}</div>
      <div style="margin-top: 3px;">เจ้าพนักงานท้องถิ่น</div>
    </div>
    
    <div class="footer-warning">
      <div>คำเตือน (1) ผู้รับใบอนุญาตต้องแสดงใบอนุญาตนี้ไว้โดยเปิดเผยและเห็นได้ง่าย ณ สถานที่ประกอบกิจการตลอดเวลาที่ประกอบกิจการ หากฝ่าฝืนมีโทษปรับไม่เกิน ห้าร้อยบาท</div>
      <div style="margin-top: 2px; text-indent: 1.1cm;">(2) หากประสงค์จะประกอบกิจการในปีต่อไปต้องยื่นคำขอต่ออายุใบอนุญาต<u>ก่อน</u>ใบอนุญาตสิ้นอายุ</div>
    </div>
  </div>
  </div>

  <!-- Page 2: License Back -->
  <div class="page page-break" id="licenseDocPage2">
    <div class="title" style="margin-top: 35px; font-size: 16pt; font-weight: bold;">รายการเสียค่าธรรมเนียมหนังสือรับรองการแจ้ง</div>
    
    <table style="width: 100%; border-collapse: collapse; margin-top: 25px; font-size: 14pt;">
      <thead>
        <tr>
          <th rowspan="2" style="width: 17%; border: 1px solid #000; padding: 6px;">วัน/เดือน/ปี<br>ที่ออกใบอนุญาต</th>
          <th rowspan="2" style="width: 17%; border: 1px solid #000; padding: 6px;">วัน/เดือน/ปี<br>ที่สิ้นอายุใบอนุญาต</th>
          <th colspan="3" style="width: 38%; border: 1px solid #000; padding: 6px;">ใบเสร็จรับเงิน</th>
          <th rowspan="2" style="width: 28%; border: 1px solid #000; padding: 6px;">(ลงชื่อ)<br>เจ้าพนักงานท้องถิ่น</th>
        </tr>
        <tr>
          <th style="width: 8%; border: 1px solid #000; padding: 6px;">เล่มที่</th>
          <th style="width: 17%; border: 1px solid #000; padding: 6px;">เลขที่</th>
          <th style="width: 13%; border: 1px solid #000; padding: 6px;">วัน/เดือน/ปี</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${sDate.d ? sDate.d + ' ' + sDate.m + ' ' + sDate.y : ''}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${eDate.d ? eDate.d + ' ' + eDate.m + ' ' + eDate.y : ''}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${rBook ? rBook : '-'}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${rNo ? rNo : ''}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${rDate.d ? rDate.d + ' ' + rDate.m + ' ' + rDate.y : ''}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center; line-height: 1.35;">
            <div style="font-weight: bold;">(${exName})</div>
            <div style="font-size: 12.5pt; margin-top: 3px;">${formattedExPos}</div>
          </td>
        </tr>
        <tr><td style="border: 1px solid #000; padding: 12px;"><br></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td></tr>
        <tr><td style="border: 1px solid #000; padding: 12px;"><br></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td></tr>
        <tr><td style="border: 1px solid #000; padding: 12px;"><br></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td></tr>
        <tr><td style="border: 1px solid #000; padding: 12px;"><br></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td></tr>
        <tr><td style="border: 1px solid #000; padding: 12px;"><br></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td></tr>
        <tr><td style="border: 1px solid #000; padding: 12px;"><br></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td></tr>
        <tr><td style="border: 1px solid #000; padding: 12px;"><br></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td></tr>
      </tbody>
    </table>
  </div>
  
  <script>
    function exportLicenseWord() {
      var header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>ใบอนุญาต_${bName}</title></head><body>";
      var footer = "</body></html>";
      var clone = document.documentElement.cloneNode(true);
      var noPrintEls = clone.querySelectorAll('.print-control-bar');
      noPrintEls.forEach(function(el) { el.parentNode.removeChild(el); });
      var sourceHTML = header + clone.innerHTML + footer;
      var source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
      var fileDownload = document.createElement("a");
      document.body.appendChild(fileDownload);
      fileDownload.href = source;
      fileDownload.download = 'ใบอนุญาต_${bName.replace(/\s+/g, '_')}.doc';
      fileDownload.click();
      document.body.removeChild(fileDownload);
    }

    window.onload = function() {
      // Auto trigger print after brief delay
      setTimeout(function(){
        window.print();
      }, 500);
    }
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
  const bName = license.businessName || '-';
  const owner = license.ownerName || '-';
  const phone = license.businessPhone || license.ownerPhone || '-';
  const bType = license.businessCategory || '-';
  const addrNo = license.businessAddressNo || '-';
  const moo = license.businessMoo || '-';
  const street = (license.ownerRoad && license.ownerRoad !== '-') ? license.ownerRoad : '-';
  const tumbon = license.businessSubdistrict || 'บางเป้า';
  const amphoe = license.businessDistrict || 'กันตัง';
  const changwat = license.businessProvince || 'ตรัง';
  const inspectorName = 'พันจ่าเอกอานัส เด่นหมาด';
  const inspectorPos = 'เจ้าพนักงานสาธารณสุขชำนาญงาน';
  const inspectDate = license.approvalDate || '23 กรกฎาคม 2569';

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
          <td id="v_business_type" class="dotted-cell" align="center" style="vertical-align: bottom; text-align: center; border-bottom: 1px dashed #000;">${bType}</td>
        </tr>
      </table>
      <table style="width: 100%; border-collapse: collapse; font-family: inherit; font-size: 13px; line-height: 1.2; margin-bottom: 6px;">
        <tr>
          <td style="width: 135px; white-space: nowrap; vertical-align: bottom;">2. ชื่อ-สกุลผู้ดำเนินกิจการ</td>
          <td id="v_owner_name" align="center" class="dotted-cell" style="width: 250px; vertical-align: bottom; text-align: center; border-bottom: 1px dashed #000;">${owner}</td>
          <td style="width: 50px; white-space: nowrap; vertical-align: bottom; padding-left: 10px;">โทรศัพท์</td>
          <td id="v_phone_owner" align="center" class="dotted-cell" style="vertical-align: bottom; text-align: center; border-bottom: 1px dashed #000;">${phone}</td>
        </tr>
      </table>
      <table style="width: 100%; border-collapse: collapse; font-family: inherit; font-size: 13px; line-height: 1.2; margin-bottom: 6px;">
        <tr>
          <td style="width: 120px; white-space: nowrap; vertical-align: bottom; padding-left: 15px;">ชื่อสถานประกอบกิจการ</td>
          <td id="v_shopName" align="center" class="dotted-cell" style="vertical-align: bottom; text-align: center; border-bottom: 1px dashed #000;">${bName}</td>
        </tr>
      </table>
      <table style="width: 100%; border-collapse: collapse; font-family: inherit; font-size: 13px; line-height: 1.2; margin-bottom: 6px;">
        <tr>
          <td style="width: 70px; white-space: nowrap; vertical-align: bottom; padding-left: 15px;">ตั้งอยู่เลขที่</td>
          <td id="v_address" align="center" class="dotted-cell" style="width: 80px; vertical-align: bottom; text-align: center; border-bottom: 1px dashed #000;">${addrNo}</td>
          <td style="width: 40px; white-space: nowrap; vertical-align: bottom; padding-left: 10px;">หมู่ที่</td>
          <td id="v_moo" align="center" class="dotted-cell" style="width: 70px; vertical-align: bottom; text-align: center; border-bottom: 1px dashed #000;">${moo}</td>
          <td style="width: 30px; white-space: nowrap; vertical-align: bottom; padding-left: 10px;">ถนน</td>
          <td id="v_street" align="center" class="dotted-cell" style="vertical-align: bottom; text-align: center; border-bottom: 1px dashed #000;">${street}</td>
        </tr>
      </table>
      <table style="width: 100%; border-collapse: collapse; font-family: inherit; font-size: 13px; line-height: 1.2; margin-bottom: 6px;">
        <tr>
          <td style="width: 40px; white-space: nowrap; vertical-align: bottom; padding-left: 15px;">ตำบล</td>
          <td id="v_tumbon" align="center" class="dotted-cell" style="vertical-align: bottom; text-align: center; border-bottom: 1px dashed #000;">${tumbon}</td>
          <td style="width: 40px; white-space: nowrap; vertical-align: bottom; padding-left: 10px;">อำเภอ</td>
          <td id="v_amphoe" align="center" class="dotted-cell" style="width: 150px; vertical-align: bottom; text-align: center; border-bottom: 1px dashed #000;">${amphoe}</td>
          <td style="width: 45px; white-space: nowrap; vertical-align: bottom; padding-left: 10px;">จังหวัด</td>
          <td id="v_changwat" align="center" class="dotted-cell" style="width: 150px; vertical-align: bottom; text-align: center; border-bottom: 1px dashed #000;">${changwat}</td>
        </tr>
      </table>
      <table style="width: 100%; border-collapse: collapse; font-family: inherit; font-size: 13px; line-height: 1.2; margin-bottom: 6px;">
        <tr>
          <td style="width: 70px; white-space: nowrap; vertical-align: bottom; padding-left: 15px;">โทรศัพท์ร้าน</td>
          <td id="v_phone_shop" align="center" class="dotted-cell" style="vertical-align: bottom; text-align: center; border-bottom: 1px dashed #000;">${phone}</td>
        </tr>
      </table>
      <table style="width: 100%; border-collapse: collapse; font-family: inherit; font-size: 13px; line-height: 1.2; margin-bottom: 6px;">
        <tr>
          <td style="width: 250px; white-space: nowrap; vertical-align: bottom;">3. กรณีประกอบกิจการเลี้ยงสัตว์ (ระบุ) ชนิดสัตว์</td>
          <td id="v_animal" align="center" class="dotted-cell" style="width: 200px; vertical-align: bottom; text-align: center; border-bottom: 1px dashed #000;">-</td>
          <td style="width: 40px; white-space: nowrap; vertical-align: bottom; padding-left: 10px;">จำนวน</td>
          <td id="v_animal_qty" align="center" class="dotted-cell" style="vertical-align: bottom; text-align: center; border-bottom: 1px dashed #000;">-</td>
          <td style="width: 20px; white-space: nowrap; vertical-align: bottom; padding-left: 5px;">ตัว</td>
        </tr>
      </table>
      
      <div style="margin-top: 8px;">4. ลักษณะอาคารประกอบกิจการ</div>
      <div style="padding-left: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;" id="bldgArea">
        <div class="checkbox-item"><span class="checkbox-icon">☐</span> อาคารโรงงาน/อาคารเอกเทศ จำนวน <span style="margin:0 4px;">...</span> ชั้น</div>
        <div class="checkbox-item"><span class="checkbox-icon">☑</span> อาคารพาณิชย์/พาณิชย์-พักอาศัย จำนวน <span style="margin:0 4px;">1</span> ชั้น</div>
        <div class="checkbox-item"><span class="checkbox-icon">☐</span> อาคารสำนักงาน จำนวน <span style="margin:0 4px;">...</span> ชั้น</div>
        <div class="checkbox-item"><span class="checkbox-icon">☐</span> โรงเรือน จำนวน <span style="margin:0 4px;">...</span> หลัง</div>
        <div class="checkbox-item"><span class="checkbox-icon">☐</span> โกดัง จำนวน <span style="margin:0 4px;">...</span> หลัง</div>
        <div class="checkbox-item"><span class="checkbox-icon">☐</span> อื่นๆ ...........................................</div>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-family: inherit; font-size: 13px; line-height: 1.2; margin-top: 8px; margin-bottom: 6px;">
        <tr>
          <td style="width: 100px; white-space: nowrap; vertical-align: bottom;">5. จำนวนเครื่องจักร</td>
          <td id="v_machQty" align="center" class="dotted-cell" style="width: 150px; vertical-align: bottom; text-align: center; border-bottom: 1px dashed #000;">1</td>
          <td style="width: 20px; white-space: nowrap; vertical-align: bottom; padding-left: 5px;">ตัว</td>
          <td style="width: 100px; white-space: nowrap; vertical-align: bottom; padding-left: 15px;">รวมจำนวนแรงม้า</td>
          <td id="v_machHp" align="center" class="dotted-cell" style="vertical-align: bottom; text-align: center; border-bottom: 1px dashed #000;">3</td>
          <td style="width: 40px; white-space: nowrap; vertical-align: bottom; padding-left: 5px;">แรงม้า</td>
        </tr>
      </table>
      <table style="width: 100%; border-collapse: collapse; font-family: inherit; font-size: 13px; line-height: 1.2; margin-bottom: 6px;">
        <tr>
          <td style="width: 120px; white-space: nowrap; vertical-align: bottom;">6. จำนวนพนักงานทั้งหมด</td>
          <td id="v_total" align="center" class="dotted-cell" style="width: 80px; vertical-align: bottom; text-align: center; border-bottom: 1px dashed #000;">1</td>
          <td style="width: 20px; white-space: nowrap; vertical-align: bottom; padding-left: 5px;">คน</td>
          <td style="width: 30px; white-space: nowrap; vertical-align: bottom; padding-left: 15px;">ชาย</td>
          <td id="v_male" align="center" class="dotted-cell" style="width: 100px; vertical-align: bottom; text-align: center; border-bottom: 1px dashed #000;">1</td>
          <td style="width: 20px; white-space: nowrap; vertical-align: bottom; padding-left: 5px;">คน</td>
          <td style="width: 30px; white-space: nowrap; vertical-align: bottom; padding-left: 15px;">หญิง</td>
          <td id="v_female" align="center" class="dotted-cell" style="vertical-align: bottom; text-align: center; border-bottom: 1px dashed #000;">0</td>
          <td style="width: 20px; white-space: nowrap; vertical-align: bottom; padding-left: 5px;">คน</td>
        </tr>
      </table>
      <table style="width: 100%; border-collapse: collapse; font-family: inherit; font-size: 13px; line-height: 1.2; margin-bottom: 6px;">
        <tr>
          <td style="width: 100px; white-space: nowrap; vertical-align: bottom;">7. ระยะเวลาการทำงาน</td>
          <td id="v_days" align="center" class="dotted-cell" style="width: 80px; vertical-align: bottom; text-align: center; border-bottom: 1px dashed #000;">6</td>
          <td style="width: 60px; white-space: nowrap; vertical-align: bottom; padding-left: 5px;">วัน/สัปดาห์</td>
          <td style="width: 60px; white-space: nowrap; vertical-align: bottom; padding-left: 10px;">ตั้งแต่เวลา</td>
          <td id="v_start" align="center" class="dotted-cell" style="width: 100px; vertical-align: bottom; text-align: center; border-bottom: 1px dashed #000;">08:00</td>
          <td style="width: 60px; white-space: nowrap; vertical-align: bottom; padding-left: 5px;">น. ถึงเวลา</td>
          <td id="v_end" align="center" class="dotted-cell" style="vertical-align: bottom; text-align: center; border-bottom: 1px dashed #000;">17:00</td>
          <td style="width: 20px; white-space: nowrap; vertical-align: bottom; padding-left: 5px;">น.</td>
        </tr>
      </table>
      <div style="margin-top: 8px;">8. ในรอบปีที่ผ่านมา สถานประกอบกิจการเคยถูกร้องเรียนก่อปัญหาเหตุรำคาญหรือมลพิษสิ่งแวดล้อม</div>
      <div style="padding-left: 20px; display: flex; gap: 20px;" id="compArea">
        <div class="checkbox-item"><span class="checkbox-icon">☑</span> ไม่เคยถูกร้องเรียน</div>
        <div class="checkbox-item"><span class="checkbox-icon">☐</span> เคยถูกร้องเรียน (ระบุ) ....................................................</div>
      </div>
    </div>

    <div class="section-title" style="margin-top: 20px;">ส่วนที่ 2 วัตถุดิบและสารเคมีที่ใช้ในกระบวนการผลิต (ระบุชนิดและปริมาณ/เดือน)</div>
    <div style="padding-left: 20px;" id="materialsTableWrapper">
      <table style="width: 100%; border-collapse: collapse; font-family: inherit; font-size: 12px; margin-top: 5px; border: none !important;">
        <tbody id="materialsTableBody">
          <tr style="height: 24px;">
            <td style="width: 25px; text-align: left; vertical-align: bottom; border: none !important;">1)</td>
            <td class="dotted-cell" align="center" style="padding: 0 5px; vertical-align: bottom; font-weight: normal; border-bottom: 1px dashed #000; text-align: center;">น้ำมันหล่อลื่น</td>
            <td style="width: 150px; text-align: right; padding-right: 5px; vertical-align: bottom; white-space: nowrap; color: #000; border: none !important;">ปริมาณที่ใช้ (ต่อปี/เดือน)</td>
            <td class="dotted-cell" style="width: 180px; padding: 0 5px; vertical-align: bottom; font-weight: normal; border-bottom: 1px dashed #000; text-align: center;">5 ลิตร/เดือน</td>
          </tr>
          <tr style="height: 24px;">
            <td style="width: 25px; text-align: left; vertical-align: bottom; border: none !important;">2)</td>
            <td class="dotted-cell" align="center" style="padding: 0 5px; vertical-align: bottom; font-weight: normal; border-bottom: 1px dashed #000; text-align: center;">น้ำยาล้างเครื่องมือ</td>
            <td style="width: 150px; text-align: right; padding-right: 5px; vertical-align: bottom; white-space: nowrap; color: #000; border: none !important;">ปริมาณที่ใช้ (ต่อปี/เดือน)</td>
            <td class="dotted-cell" style="width: 180px; padding: 0 5px; vertical-align: bottom; font-weight: normal; border-bottom: 1px dashed #000; text-align: center;">2 ลิตร/เดือน</td>
          </tr>
          <tr style="height: 24px;">
            <td style="width: 25px; text-align: left; vertical-align: bottom; border: none !important;">3)</td>
            <td class="dotted-cell" align="center" style="padding: 0 5px; vertical-align: bottom; font-weight: normal; border-bottom: 1px dashed #000; text-align: center;">-</td>
            <td style="width: 150px; text-align: right; padding-right: 5px; vertical-align: bottom; white-space: nowrap; color: #000; border: none !important;">ปริมาณที่ใช้ (ต่อปี/เดือน)</td>
            <td class="dotted-cell" style="width: 180px; padding: 0 5px; vertical-align: bottom; font-weight: normal; border-bottom: 1px dashed #000; text-align: center;">-</td>
          </tr>
          <tr style="height: 24px;">
            <td style="width: 25px; text-align: left; vertical-align: bottom; border: none !important;">4)</td>
            <td class="dotted-cell" align="center" style="padding: 0 5px; vertical-align: bottom; font-weight: normal; border-bottom: 1px dashed #000; text-align: center;">-</td>
            <td style="width: 150px; text-align: right; padding-right: 5px; vertical-align: bottom; white-space: nowrap; color: #000; border: none !important;">ปริมาณที่ใช้ (ต่อปี/เดือน)</td>
            <td class="dotted-cell" style="width: 180px; padding: 0 5px; vertical-align: bottom; font-weight: normal; border-bottom: 1px dashed #000; text-align: center;">-</td>
          </tr>
          <tr style="height: 24px;">
            <td style="width: 25px; text-align: left; vertical-align: bottom; border: none !important;">5)</td>
            <td class="dotted-cell" align="center" style="padding: 0 5px; vertical-align: bottom; font-weight: normal; border-bottom: 1px dashed #000; text-align: center;">-</td>
            <td style="width: 150px; text-align: right; padding-right: 5px; vertical-align: bottom; white-space: nowrap; color: #000; border: none !important;">ปริมาณที่ใช้ (ต่อปี/เดือน)</td>
            <td class="dotted-cell" style="width: 180px; padding: 0 5px; vertical-align: bottom; font-weight: normal; border-bottom: 1px dashed #000; text-align: center;">-</td>
          </tr>
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
        <!-- 1 -->
        <tr>
          <td style="text-align:left; line-height:1.35;">1 สถานที่ตั้งเหมาะสม ระยะห่างเป็นไปตามกฎหมาย</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;">✓</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
        </tr>
        <!-- 2 -->
        <tr>
          <td style="text-align:left; line-height:1.35;">2 อาคารมีความมั่นคง แข็งแรง</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;">✓</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="line-height:1.25; font-size:12.5px;">ลักษณะเป็นบ้านแถวติดกัน พื้นที่โล่ง</td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
        </tr>
        <!-- 3 -->
        <tr>
          <td style="text-align:left; line-height:1.35;">3 มีทางหนีไฟ บันไดหนีไฟ หรือทางออกฉุกเฉิน ไม่มีสิ่งกีดขวาง มีป้ายหรือเครื่องหมายแสดงชัดเจน เป็นไปตามกฎหมายว่าด้วยการควบคุมอาคาร</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;">✓</td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
        </tr>
        <!-- 4 -->
        <tr>
          <td style="text-align:left; line-height:1.35;">4 สถานประกอบกิจการมีการจัดแสงสว่างเหมาะสม เพียงพอ เป็นไปตามกฎหมายว่าด้วยการควบคุมอาคาร</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;">✓</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
        </tr>
        <!-- 5 -->
        <tr>
          <td style="text-align:left; line-height:1.35;">5 สถานประกอบกิจการมีการระบายอากาศเหมาะสม เพียงพอ เป็นไปตามกฎหมายว่าด้วยการควบคุมอาคาร</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;">✓</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
        </tr>
        <!-- 6 -->
        <tr>
          <td style="text-align:left; line-height:1.35;">6 สถานประกอบกิจการมีความสะอาด จัดวางสิ่งของเป็นระเบียบเรียบร้อย ปลอดภัย เป็นสัดส่วน และดูแลรักษาความสะอาดให้ถูกสุขลักษณะอย่างสม่ำเสมอ</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;">✓</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
        </tr>
        <!-- 7 -->
        <tr>
          <td style="text-align:left; line-height:1.35;">7 สถานประกอบกิจการมีห้องน้ำ ห้องส้วม อ่างหรือที่ล้างมือที่ สะอาด เพียงพอ ถูกสุขลักษณะ ดูแลรักษาความสะอาดเป็นประจำ</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;">✓</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
        </tr>
        <!-- 8 Header -->
        <tr>
          <td style="text-align:left; line-height:1.35; font-weight:bold;">8 สถานประกอบกิจการมีการเก็บ รวบรวม กำจัดมูลฝอย และของเสียอันตรายที่ถูกสุขลักษณะ ดังนี้</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
        </tr>
        <!-- 8.1 -->
        <tr>
          <td style="text-align:left; line-height:1.35; padding-left: 15px;">8.1 มีภาชนะบรรจุหรือภาชนะรองรับมูลฝอย สะอาด มีฝาปิด ไม่แตกหรือรั่วซึม และเพียงพอกับประเภทและปริมาณของมูลฝอย</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;">✓</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="line-height:1.25; font-size:12.5px;">รถขยะเทศบาลจัดเก็บ</td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
        </tr>
        <!-- 8.2 -->
        <tr>
          <td style="text-align:left; line-height:1.35; padding-left: 15px;">8.2 บริเวณที่เก็บวางภาชนะรองรับมูลฝอย หรือสถานที่พักรวมมูลฝอย สะอาด ไม่มีกลิ่นเหม็น ไม่มีน้ำขัง และไม่เป็นแหล่งเพาะพันธุ์สัตว์และแมลงนำโรค</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;">✓</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="line-height:1.25; font-size:12.5px;">รถขยะเทศบาลจัดเก็บ</td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
        </tr>
        <!-- 8.3 -->
        <tr>
          <td style="text-align:left; line-height:1.35; padding-left: 15px;">8.3 มีการกำจัดมูลฝอยอย่างถูกต้อง และเป็นไปตามข้อบัญญัติของท้องถิ่น</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;">✓</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
        </tr>
        <!-- 8.4 -->
        <tr>
          <td style="text-align:left; line-height:1.35; padding-left: 15px;">8.4 กรณีที่มีของเสียอันตราย วัตถุอันตราย มูลฝอยปนเปื้อนสารพิษ มูลฝอยอันตราย หรือมูลฝอยปนเปื้อนเลือดหรือสารคัดหลั่ง ดำเนินการเป็นไปตามกฎหมาย</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;">✓</td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
        </tr>
        <!-- 9 -->
        <tr>
          <td style="text-align:left; line-height:1.35;">9 สถานประกอบกิจการมีการป้องกัน ควบคุม กำจัดแมลงและสัตว์พาหะนำโรค มิให้เป็นแหล่งเพาะพันธุ์และแพร่ระบาดของโรค</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;">✓</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
        </tr>
        <!-- 10 -->
        <tr>
          <td style="text-align:left; line-height:1.35;">10 สถานประกอบกิจการมีการระบายน้ำที่เหมาะสม และดูแลมิให้มีน้ำท่วมขังบริเวณสถานประกอบกิจการ</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;">✓</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
        </tr>
        <!-- 11 -->
        <tr>
          <td style="text-align:left; line-height:1.35;">11 สถานประกอบกิจการที่มีโรงอาหารหรือห้องครัวที่จัดไว้เพื่อการปรุงประกอบอาหารสำหรับผู้ปฏิบัติงาน มีการดำเนินการอย่างถูกต้องตามหลักสุขาภิบาลอาหาร</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;">✓</td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
        </tr>
        <!-- 12 -->
        <tr>
          <td style="text-align:left; line-height:1.35;">12 สถานประกอบกิจการมีน้ำดื่มที่สะอาด เพียงพอสำหรับผู้ปฏิบัติงาน และมีภาชนะรองรับน้ำดื่มที่สะอาด</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;">✓</td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
        </tr>
        <!-- 13 -->
        <tr>
          <td style="text-align:left; line-height:1.35;">13 สถานประกอบกิจการมีระบบบำบัดน้ำเสียที่เหมาะสม สภาพใช้งานได้ดี และมีการจัดการน้ำเสียที่ถูกสุขลักษณะ หรือได้มาตรฐานตามที่กฎหมายกำหนด</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;">✓</td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
        </tr>
        <!-- 14 -->
        <tr>
          <td style="text-align:left; line-height:1.35;">14 สถานประกอบกิจการมีการป้องกันควบคุมระดับเสียงรบกวน เป็นไปตามประกาศกระทรวงสาธารณสุข หรือกฎหมายว่าด้วยโรงงาน</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;">✓</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
        </tr>
        <!-- 15 -->
        <tr>
          <td style="text-align:left; line-height:1.35;">15 สถานประกอบกิจการมีการป้องกันควบคุมฝุ่นละออง เป็นไปตามกฎหมายว่าด้วยโรงงาน หรือกฎหมายว่าด้วยการส่งเสริมและรักษาคุณภาพสิ่งแวดล้อม</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;">✓</td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
        </tr>
        <!-- 16 -->
        <tr>
          <td style="text-align:left; line-height:1.35;">16 สถานประกอบกิจการมีการป้องกันควบคุมกลิ่นหรือไอสารเคมี เป็นไปตามกฎหมายว่าด้วยโรงงาน</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;">✓</td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
        </tr>
        <!-- 17 -->
        <tr>
          <td style="text-align:left; line-height:1.35;">17 อุปกรณ์ เครื่องมือ เครื่องจักร สายไฟ มีสภาพปลอดภัยต่อการใช้งาน มีการติดตั้งในลักษณะที่แข็งแรง มั่นคง ปลอดภัย โดยมีคำแนะนำในการป้องกันอันตราย และกรณีชำรุดต้องมีป้ายเตือน</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;">✓</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
        </tr>
        <!-- 18 -->
        <tr>
          <td style="text-align:left; line-height:1.35;">18 มีการจัดวางหรือการจัดเก็บอุปกรณ์ เครื่องมือ เครื่องจักร หรือสายไฟ ต้องเป็นระเบียบ ไม่กีดขวางทางเดินและการปฏิบัติงาน และมีการดูแล ตรวจสอบ บำรุงรักษาให้อยู่ในสภาพดีตลอดเวลา</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;">✓</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
        </tr>
        <!-- 19 -->
        <tr>
          <td style="text-align:left; line-height:1.35;">19 สถานประกอบกิจการมีการติดตั้งอุปกรณ์หรือเครื่องดับเพลิงอย่างเพียงพอ เหมาะสม สภาพดี พร้อมใช้งาน มีการฝึกซ้อมดับเพลิงและอพยพหนีไฟ หรือซ้อมแผนฉุกเฉิน</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;">✓</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="line-height:1.25; font-size:12.5px;">มีถังดับเพลิง 1 ถัง</td>
          <td style="line-height:1.25; font-size:12.5px;">ควรตรวจสอบเป็นประจำ ตามวงรอบ</td>
        </tr>
        <!-- 20 -->
        <tr>
          <td style="text-align:left; line-height:1.35;">20 สถานประกอบกิจการที่มีสารเคมีหรือวัตถุอันตราย ต้องจัดสถานที่ที่ปลอดภัยสำหรับจัดเก็บสารเคมีหรือวัตถุอันตราย มีป้ายแสดงชนิดหรือประเภทของสารเคมีหรือวัตถุอันตราย และเอกสารข้อมูลความปลอดภัย</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;">✓</td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
        </tr>
        <!-- 21 -->
        <tr>
          <td style="text-align:left; line-height:1.35;">21 สถานประกอบกิจการที่มีความเสี่ยงจากการสัมผัสสารเคมี/วัตถุอันตราย ต้องจัดให้มีที่ชำระร่างกาย และที่ล้างตาฉุกเฉิน</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;">✓</td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
        </tr>
        <!-- 22 -->
        <tr>
          <td style="text-align:left; line-height:1.35;">22 สถานประกอบกิจการมีอุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคลสำหรับผู้ปฏิบัติงานที่เพียงพอ เหมาะสมตามลักษณะงาน</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;">✓</td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
        </tr>
        <!-- 23 -->
        <tr>
          <td style="text-align:left; line-height:1.35;">23 สถานประกอบกิจการมีการตรวจสุขภาพผู้ปฏิบัติงาน ตามกฎหมายว่าด้วยความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;">✓</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="line-height:1.25; font-size:12.5px;">ตรวจสุขภาพประจำปีล่าสุดปี 68</td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
        </tr>
        <!-- 24 -->
        <tr>
          <td style="text-align:left; line-height:1.35;">24 สถานประกอบกิจการมีมาตรการควบคุมและป้องกันปัญหาเหตุรำคาญแก่ชุมชนและประชาชนที่อยู่ใกล้เคียง</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;">✓</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
        </tr>
        <!-- 25 -->
        <tr>
          <td style="text-align:left; line-height:1.35;">25 สถานประกอบกิจการมีมาตรการป้องกันควบคุมโรคติดต่อตามหลักเกณฑ์ที่ราชการหรือกฎหมายกำหนด</td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;"></td>
          <td style="text-align:center; font-size:14px; vertical-align:middle;">✓</td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
          <td style="line-height:1.25; font-size:12.5px;"></td>
        </tr>
      </tbody>
    </table>

    <div style="margin-top: 20px;">
      <div class="line-row"><div class="line-label"><b>ข้อเสนอแนะ/สรุปผลการตรวจประเมิน:</b></div></div>
      <div id="v_extra_comment" class="lined-notes" style="width: 100%; padding-left: 10px;">
        สถานประกอบการผ่านเกณฑ์มาตรฐานการตรวจประเมินสุขลักษณะขั้นพื้นฐาน และมีมาตรการดูแลความปลอดภัยในการปฏิบัติงาน
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
            <td style="text-align: center; padding: 2px 0 0 0; line-height: 1.2;">( <span id="v_inspector_name" style="font-weight: normal;">${inspectorName}</span> )</td>
            <td style="padding: 0; line-height: 1.2;"></td>
          </tr>
          <tr>
            <td style="text-align: left; padding: 8px 0 0 0; vertical-align: bottom; line-height: 1.2;">ตำแหน่ง</td>
            <td id="v_inspector_position" style="text-align: center; padding: 8px 0 0 0; vertical-align: bottom; font-weight: normal; line-height: 1.2;">${inspectorPos}</td>
            <td style="padding: 0; line-height: 1.2;"></td>
          </tr>
          <tr>
            <td style="width: 100px; text-align: left; padding: 12px 0 0 0; vertical-align: bottom; line-height: 1.2; white-space: nowrap;">วันที่ตรวจประเมิน</td>
            <td style="padding: 12px 0 0 0; border-bottom: 1px dashed #000; line-height: 1.2; text-align: center;">${inspectDate}</td>
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
      var source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
      var fileDownload = document.createElement("a");
      document.body.appendChild(fileDownload);
      fileDownload.href = source;
      fileDownload.download = 'รายงานตรวจ_${bName.replace(/\\s+/g, '_')}.doc';
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
  const bName = loan.borrowerName || '-';
  const cId = loan.borrowerCitizenId || '-';
  const phone = loan.borrowerPhone || '-';
  const addr = loan.borrowerAddress || '-';
  const patient = loan.patientName || bName;
  const eqName = loan.equipmentName || 'เตียงผู้ป่วย';
  const eqCode = loan.equipmentCode || 'EQ-001';
  const bDate = loan.borrowDate || '1 สิงหาคม 2569';
  const dDate = loan.dueDate || '1 พฤศจิกายน 2569';

  return `<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <meta charset="utf-8">
  <title>บันทึกข้อตกลงการยืมอุปกรณ์การแพทย์ - ${bName}</title>
  <style>
    @font-face {
      font-family: 'TH Sarabun New';
      src: local('TH Sarabun New'), local('THSarabunNew');
    }
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap');
    
    @page {
      size: A4 portrait;
      margin: 1.5cm 1.5cm 1.5cm 2cm;
    }
    
    body {
      font-family: 'TH Sarabun New', 'Sarabun', sans-serif;
      font-size: 16pt;
      line-height: 1.6;
      color: #000;
      margin: 0;
      padding: 0;
      background: #f1f5f9;
    }
    
    .page {
      background: white;
      width: 21cm;
      min-height: 29.7cm;
      padding: 2cm 2cm 2cm 2.5cm;
      margin: 1cm auto;
      box-sizing: border-box;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      position: relative;
    }
    
    .garuda {
      text-align: center;
      margin-bottom: 12px;
    }
    .garuda img {
      width: 90px;
      height: auto;
    }
    
    .title {
      text-align: center;
      font-weight: bold;
      font-size: 18pt;
      margin-bottom: 15px;
      line-height: 1.3;
    }
    
    .indent {
      text-indent: 1.5cm;
      text-align: justify;
      margin-bottom: 10px;
      line-height: 2.1;
    }
    
    .fill {
      border-bottom: 1px dotted #000;
      display: inline-block;
      text-align: center;
      padding: 0 6px;
      font-weight: bold;
      vertical-align: bottom;
      margin-bottom: -2px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      font-size: 15pt;
    }
    th, td {
      border: 1px solid #000;
      padding: 6px;
      text-align: center;
    }
    th {
      background: #f8fafc;
    }

    .signature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-top: 40px;
      text-align: center;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .no-print {
      position: fixed;
      top: 15px;
      right: 20px;
      display: flex;
      gap: 10px;
      z-index: 9999;
      background: rgba(15, 23, 42, 0.9);
      padding: 8px 12px;
      border-radius: 12px;
      backdrop-filter: blur(8px);
    }
    
    .btn-action {
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-family: 'Sarabun', sans-serif;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      color: white;
    }

    @media print {
      body { background: white !important; }
      .page {
        margin: 0 !important;
        box-shadow: none !important;
        width: 100% !important;
        padding: 1.5cm 1.5cm 1.5cm 2cm !important;
      }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>

  <div class="no-print">
    <button class="btn-action" style="background:#059669;" onclick="window.print()">🖨️ สั่งพิมพ์สัญญา A4</button>
    <button class="btn-action" style="background:#2563eb;" onclick="exportLoanWord()">📝 ส่งออกเป็น Word</button>
    <button class="btn-action" style="background:#64748b;" onclick="window.close()">✕ ปิดหน้าต่าง</button>
  </div>

  <div class="page">
    <div class="garuda">
      <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Garuda_Emblem_of_Thailand.svg/150px-Garuda_Emblem_of_Thailand.svg.png" alt="ตราครุฑ">
    </div>

    <div class="title">
      แบบฟอร์มบันทึกข้อตกลงการยืม-คืนอุปกรณ์ทางการแพทย์<br>
      ศูนย์สาธิตและยืมอุปกรณ์เครื่องช่วยความพิการ เทศบาลตำบลบางเป้า
    </div>

    <p class="indent">
      บันทึกข้อตกลงฉบับนี้ทำขึ้น ณ เทศบาลตำบลบางเป้า อำเภอกันตัง จังหวัดตรัง เมื่อวันที่ <span class="fill" style="min-width:180px;">${bDate}</span>
      ระหว่าง เทศบาลตำบลบางเป้า โดยกองสาธารณสุขและสิ่งแวดล้อม ซึ่งต่อไปนี้เรียกว่า <b>"ผู้ให้ยืม"</b> ฝ่ายหนึ่ง
      กับ ข้าพเจ้า <span class="fill" style="min-width:260px;">${bName}</span>
      หมายเลขบัตรประจำตัวประชาชน <span class="fill" style="min-width:200px;">${cId}</span>
      อยู่บ้านเลขที่ <span class="fill" style="min-width:320px;">${addr}</span>
      หมายเลขโทรศัพท์ <span class="fill" style="min-width:160px;">${phone}</span>
      ซึ่งต่อไปนี้เรียกว่า <b>"ผู้ยืม"</b> อีกฝ่ายหนึ่ง
    </p>

    <p class="indent">
      คู่สัญญาตกลงทำบันทึกข้อตกลงไว้ต่อกัน โดยมีข้อความดังต่อไปนี้:
      <br>
      <b>ข้อ 1.</b> ผู้ให้ยืมตกลงให้ผู้ยืม ยืมอุปกรณ์ทางการแพทย์เพื่อนำไปใช้ดูแลผู้ป่วย/คนพิการ คือ <span class="fill" style="min-width:240px;">${patient}</span>
      มีรายละเอียดอุปกรณ์ ดังนี้:
    </p>

    <table>
      <thead>
        <tr>
          <th style="width: 10%;">ลำดับ</th>
          <th style="width: 45%;">รายการอุปกรณ์</th>
          <th style="width: 25%;">รหัสครุภัณฑ์</th>
          <th style="width: 20%;">สภาพอุปกรณ์</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td style="text-align: left; font-weight: bold;">${eqName}</td>
          <td>${eqCode}</td>
          <td>สภาพสมบูรณ์พร้อมใช้งาน</td>
        </tr>
      </tbody>
    </table>

    <p class="indent" style="margin-top: 15px;">
      <b>ข้อ 2.</b> กำหนดระยะเวลาการยืม ตั้งแต่วันที่ <span class="fill" style="min-width:140px;">${bDate}</span> ถึงวันที่ <span class="fill" style="min-width:140px;">${dDate}</span>
      และผู้ยืมสัญญาว่าจะนำอุปกรณ์ส่งคืนในสภาพเรียบร้อยเมื่อสิ้นสุดระยะเวลา หรือเมื่อหมดความจำเป็นในการใช้งาน
    </p>
    <p class="indent">
      <b>ข้อ 3.</b> ผู้ยืมจะต้องดูแลรักษาอุปกรณ์ดังกล่าวเสมือนเป็นทรัพย์สินของตนเอง หากเกิดความเสียหาย ชำรุด หรือสูญหาย อันเนื่องมาจากความประมาทเลินเล่อ ผู้ยืมยินยอมชดใช้ค่าเสียหายตามความเป็นจริง
    </p>

    <div class="signature-grid">
      <div>
        <div>(ลงชื่อ)....................................................... ผู้ยืม</div>
        <div style="margin-top: 5px; font-weight: bold;">( ${bName} )</div>
        <div style="margin-top: 5px;">ผู้ขอยืมอุปกรณ์</div>
      </div>
      <div>
        <div>(ลงชื่อ)....................................................... ผู้ให้ยืม</div>
        <div style="margin-top: 5px; font-weight: bold;">( ${signers.directorName || 'นางสาวปฐมาภรณ์ จันทร์แจ่ม'} )</div>
        <div style="margin-top: 5px;">${signers.directorPos || 'ผู้อำนวยการกองสาธารณสุขและสิ่งแวดล้อม'}</div>
      </div>
    </div>
  </div>

  <script>
    function exportLoanWord() {
      var header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>สัญญาขอยืมอุปกรณ์_${bName}</title></head><body>";
      var footer = "</body></html>";
      var clone = document.documentElement.cloneNode(true);
      var noPrintEls = clone.querySelectorAll('.no-print');
      noPrintEls.forEach(function(el) { el.parentNode.removeChild(el); });
      var sourceHTML = header + clone.innerHTML + footer;
      var source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
      var fileDownload = document.createElement("a");
      document.body.appendChild(fileDownload);
      fileDownload.href = source;
      fileDownload.download = 'สัญญายืมอุปกรณ์_${bName.replace(/\\s+/g, '_')}.doc';
      fileDownload.click();
      document.body.removeChild(fileDownload);
    }
  </script>
</body>
</html>`;
}

/**
 * Helper to open exact HTML document in a new window and trigger print
 */
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
  const header =
    "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>" +
    filename +
    '</title></head><body>';
  const footer = '</body></html>';

  // Strip no-print elements
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  const noPrints = tempDiv.querySelectorAll('.print-control-bar, .no-print, script');
  noPrints.forEach((el) => el.remove());

  const sourceHTML = header + tempDiv.innerHTML + footer;
  const blob = new Blob(['\ufeff' + sourceHTML], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.doc') ? filename : `${filename}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 100% Exact Word export matching GAS JavaScript.html exportToWord
 */
export function exportInspectionReportWord(license: LicenseRecord, signers: SignerSettings) {
  const shopName = license.businessName || '-';
  const ownerName = license.ownerName || '-';
  const ownerPhone = license.ownerPhone || license.businessPhone || '-';
  const shopPhone = license.businessPhone || license.ownerPhone || '-';
  const bType = license.businessCategory || '-';
  const addrNo = license.businessAddressNo || license.ownerAddressNo || '-';
  const moo = license.businessMoo || license.ownerMoo || '-';
  const road = license.ownerRoad || license.businessRoad || '-';
  const tumbon = license.businessSubdistrict || license.ownerSubdistrict || 'บางเป้า';
  const amphoe = license.businessDistrict || license.ownerDistrict || 'กันตัง';
  const prov = license.businessProvince || license.ownerProvince || 'ตรัง';
  const inspector = 'พันจ่าเอกอานัส เด่นหมาด';
  const inspectorPos = 'เจ้าพนักงานสาธารณสุขชำนาญงาน';
  const inspectDate = license.approvalDate || '23 กรกฎาคม 2569';

  const chk = (cond: boolean) => (cond ? '☑' : '☐');

  const ministryQuestions = [
    { type: 'heading', text: 'สถานที่ตั้งและลักษณะอาคาร' },
    { num: '1', id: '1', text: 'สถานที่ตั้งเหมาะสม ระยะห่างเป็นไปตามกฎหมาย' },
    { num: '2', id: '2', text: 'อาคารมีความมั่นคง แข็งแรง' },
    { num: '3', id: '3', text: 'มีทางหนีไฟ บันไดหนีไฟ หรือทางออกฉุกเฉิน ไม่มีสิ่งกีดขวาง มีป้ายหรือเครื่องหมายแสดงชัดเจน เป็นไปตามกฎหมายว่าด้วยการควบคุมอาคาร' },
    { num: '4', id: '4', text: 'สถานประกอบกิจการมีการจัดแสงสว่างเหมาะสม เพียงพอ เป็นไปตามกฎหมายว่าด้วยการควบคุมอาคาร' },
    { num: '5', id: '5', text: 'สถานประกอบกิจการมีการระบายอากาศเหมาะสม เพียงพอ เป็นไปตามกฎหมายว่าด้วยการควบคุมอาคาร' },
    { num: '6', id: '6', text: 'สถานประกอบกิจการมีความสะอาด จัดวางสิ่งของเป็นระเบียบเรียบร้อย ปลอดภัย เป็นสัดส่วน และดูแลรักษาความสะอาดให้ถูกสุขลักษณะอย่างสม่ำเสมอ' },
    { type: 'heading', text: 'การสุขาภิบาลสถานประกอบกิจการ' },
    { num: '7', id: '7', text: 'สถานประกอบกิจการมีห้องน้ำ ห้องส้วม อ่างหรือที่ล้างมือที่ สะอาด เพียงพอ ถูกสุขลักษณะ ดูแลรักษาความสะอาดเป็นประจำ' },
    { num: '8', id: '8', text: 'สถานประกอบกิจการมีการเก็บ รวบรวม กำจัดมูลฝอย และของเสียอันตรายที่ถูกสุขลักษณะ ดังนี้' },
    { num: '(1)', id: '9', text: 'มีภาชนะบรรจุหรือภาชนะรองรับมูลฝอย สะอาด มีฝาปิด ไม่แตกหรือรั่วซึม และเพียงพอกับประเภทและปริมาณของมูลฝอย' },
    { num: '(2)', id: '10', text: 'บริเวณที่เก็บวางภาชนะรองรับมูลฝอย หรือสถานที่พักรวมมูลฝอย สะอาด ไม่มีกลิ่นเหม็น ไม่มีน้ำขัง และไม่เป็นแหล่งเพาะพันธุ์สัตว์และแมลงนำโรค' },
    { num: '(3)', id: '11', text: 'มีการกำจัดมูลฝอยอย่างถูกต้อง และเป็นไปตามข้อบัญญัติของท้องถิ่น' },
    { num: '(4)', id: '12', text: 'กรณีที่มีของเสียอันตราย วัตถุอันตราย มูลฝอยปนเปื้อนสารพิษ มูลฝอยอันตราย หรือมูลฝอยปนเปื้อนเลือดหรือสารคัดหลั่ง ดำเนินการเป็นไปตามกฎหมาย' },
    { num: '9', id: '13', text: 'สถานประกอบกิจการมีการป้องกัน ควบคุม กำจัดแมลงและสัตว์พาหะนำโรค มิให้เป็นแหล่งเพาะพันธุ์และแพร่ระบาดของโรค' },
    { num: '10', id: '14', text: 'สถานประกอบกิจการมีการระบายน้ำที่เหมาะสม และดูแลมิให้มีน้ำท่วมขังบริเวณสถานประกอบกิจการ' },
    { num: '11', id: '15', text: 'สถานประกอบกิจการที่มีโรงอาหารหรือห้องครัวที่จัดไว้เพื่อการปรุงประกอบอาหารสำหรับผู้ปฏิบัติงาน มีการดำเนินการอย่างถูกต้องตามหลักสุขาภิบาลอาหาร' },
    { num: '12', id: '16', text: 'สถานประกอบกิจการมีน้ำดื่มที่สะอาด เพียงพอสำหรับผู้ปฏิบัติงาน และมีภาชนะรองรับน้ำดื่มที่สะอาด' },
    { type: 'heading', text: 'การควบคุมมลพิษ' },
    { num: '13', id: '17', text: 'สถานประกอบกิจการมีระบบบำบัดน้ำเสียที่เหมาะสม สภาพใช้งานได้ดี และมีการจัดการน้ำเสียที่ถูกสุขลักษณะ หรือได้มาตรฐานตามที่กฎหมายกำหนด' },
    { num: '14', id: '18', text: 'สถานประกอบกิจการมีการป้องกันควบคุมระดับเสียงรบกวน เป็นไปตามประกาศกระทรวงสาธารณสุข หรือกฎหมายว่าด้วยโรงงาน' },
    { num: '15', id: '19', text: 'สถานประกอบกิจการมีการป้องกันควบคุมฝุ่นละออง เป็นไปตามกฎหมายว่าด้วยโรงงาน หรือกฎหมายว่าด้วยการส่งเสริมและรักษาคุณภาพสิ่งแวดล้อม' },
    { num: '16', id: '20', text: 'สถานประกอบกิจการมีการป้องกันควบคุมกลิ่นหรือไอสารเคมี เป็นไปตามกฎหมายว่าด้วยโรงงาน' },
    { type: 'heading', text: 'ความปลอดภัยและอาชีวอนามัย' },
    { num: '17', id: '21', text: 'อุปกรณ์ เครื่องมือ เครื่องจักร สายไฟ มีสภาพปลอดภัยต่อการใช้งาน มีการติดตั้งในลักษณะที่แข็งแรง มั่นคง ปลอดภัย โดยมีคำแนะนำในการป้องกันอันตราย และกรณีชำรุดต้องมีป้ายเตือน' },
    { num: '18', id: '22', text: 'มีการจัดวางหรือการจัดเก็บอุปกรณ์ เครื่องมือ เครื่องจักร หรือสายไฟ ต้องเป็นระเบียบ ไม่กีดขวางทางเดินและการปฏิบัติงาน และมีการดูแล ตรวจสอบ บำรุงรักษาให้อยู่ในสภาพดีตลอดเวลา' },
    { num: '19', id: '23', text: 'สถานประกอบกิจการมีการติดตั้งอุปกรณ์หรือเครื่องดับเพลิงอย่างเพียงพอ เหมาะสม สภาพดี พร้อมใช้งาน มีการฝึกซ้อมดับเพลิงและอพยพหนีไฟ หรือซ้อมแผนฉุกเฉิน' },
    { num: '20', id: '24', text: 'สถานประกอบกิจการที่มีสารเคมีหรือวัตถุอันตราย ต้องจัดสถานที่ที่ปลอดภัยสำหรับจัดเก็บสารเคมีหรือวัตถุอันตราย มีป้ายแสดงชนิดหรือประเภทของสารเคมีหรือวัตถุอันตราย และเอกสารข้อมูลความปลอดภัย' },
    { num: '21', id: '25', text: 'สถานประกอบกิจการที่มีความเสี่ยงจากการสัมผัสสารเคมี/วัตถุอันตราย ต้องจัดให้มีที่ชำระร่างกาย และที่ล้างตาฉุกเฉิน' },
    { num: '22', id: '26', text: 'สถานประกอบกิจการมีอุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคลสำหรับผู้ปฏิบัติงานที่เพียงพอ เหมาะสมตามลักษณะงาน' },
    { num: '23', id: '27', text: 'สถานประกอบกิจการมีการตรวจสุขภาพผู้ปฏิบัติงาน ตามกฎหมายว่าด้วยความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน' },
    { type: 'heading', text: 'การป้องกันเหตุรำคาญ' },
    { num: '24', id: '28', text: 'สถานประกอบกิจการมีมาตรการควบคุมและป้องกันปัญหาเหตุรำคาญแก่ชุมชนและประชาชนที่อยู่ใกล้เคียง' },
    { type: 'heading', text: 'การป้องกันควบคุมโรค' },
    { num: '25', id: '29', text: 'สถานประกอบกิจการมีมาตรการป้องกันควบคุมโรคติดต่อตามหลักเกณฑ์ที่ราชการหรือกฎหมายกำหนด' },
  ];

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
      .chk { font-family: 'Segoe UI Symbol', 'Arial Unicode MS', sans-serif !important; }
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
          <td class="u" width="70%" valign="top">${bType}</td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-left: 15px;">
        <tr>
          <td width="22%">2. ชื่อ-สกุลผู้ดำเนินกิจการ</td>
          <td class="u" width="45%" align="center">${ownerName}</td>
          <td width="10%">โทรศัพท์</td>
          <td class="u" width="23%" align="center">${ownerPhone}</td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-left: 15px;">
        <tr>
          <td width="20%">ชื่อสถานประกอบกิจการ</td>
          <td class="u" width="80%" align="center">${shopName}</td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-left: 15px;">
        <tr>
          <td width="15%">ตั้งอยู่เลขที่</td>
          <td class="u" width="15%" align="center">${addrNo}</td>
          <td width="8%">หมู่ที่</td>
          <td class="u" width="12%" align="center">${moo}</td>
          <td width="8%">ถนน</td>
          <td class="u" width="42%" align="center">${road}</td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-left: 15px;">
        <tr>
          <td width="8%">ตำบล</td>
          <td class="u" width="22%" align="center">${tumbon}</td>
          <td width="8%">อำเภอ</td>
          <td class="u" width="22%" align="center">${amphoe}</td>
          <td width="8%">จังหวัด</td>
          <td class="u" width="32%" align="center">${prov}</td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-left: 15px;">
        <tr>
          <td width="25%">โทรศัพท์สถานประกอบการ</td>
          <td class="u" width="75%" align="center">${shopPhone}</td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-left: 15px; margin-top: 4pt;">
        <tr>
          <td width="25%">3. ลักษณะอาคาร</td>
          <td width="75%"><span class="chk">☑</span> อาคารโรงงาน/อาคารเอกเทศ &nbsp;&nbsp; <span class="chk">☐</span> อาคารพาณิชย์ &nbsp;&nbsp; <span class="chk">☐</span> อื่น ๆ</td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-left: 15px;">
        <tr>
          <td width="30%">4. จำนวนเครื่องจักร/อุปกรณ์</td>
          <td class="u" width="20%" align="center">1</td>
          <td width="5%">ตัว</td>
          <td width="20%">รวมกำลังแรงม้า</td>
          <td class="u" width="20%" align="center">5</td>
          <td width="5%">HP</td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-left: 15px;">
        <tr>
          <td width="28%">5. จำนวนวันทำงานต่อสัปดาห์</td>
          <td class="u" width="15%" align="center">6</td>
          <td width="57%">วัน/สัปดาห์</td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-left: 15px;">
        <tr>
          <td width="25%">6. จำนวนคนงานทั้งหมด</td>
          <td class="u" width="15%" align="center">2</td>
          <td width="10%">คน</td>
          <td width="15%">คนงานชาย</td>
          <td class="u" width="12%" align="center">2</td>
          <td width="8%">คน</td>
          <td width="15%">คนงานหญิง</td>
          <td class="u" width="12%" align="center">0</td>
          <td width="8%">คน</td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-left: 15px;">
        <tr>
          <td width="20%">7. ช่วงเวลาทำงาน</td>
          <td width="12%">ตั้งแต่เวลา</td>
          <td class="u" width="15%" align="center">08:00</td>
          <td width="8%">ถึงเวลา</td>
          <td class="u" width="15%" align="center">17:00</td>
          <td width="10%">น.</td>
        </tr>
      </table>

      <p style="margin-top: 6pt;">8. ในรอบปีที่ผ่านมา สถานประกอบกิจการเคยถูกร้องเรียนก่อปัญหาเหตุรำคาญหรือมลพิษสิ่งแวดล้อม</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-left: 20px;">
        <tr><td colspan="3"><span class="chk">☑</span> ไม่เคย</td></tr>
        <tr><td colspan="3"><span class="chk">☐</span> เคย จำนวน <span class="u">......</span> ครั้ง ระบุเรื่อง/ประเด็นที่ถูกร้องเรียน</td></tr>
      </table>

      <p class="bold" style="margin-top: 12pt;">ส่วนที่ 2 วัตถุดิบและสารเคมีที่ใช้ในกระบวนการผลิต (ระบุชนิดและปริมาณ/เดือน)</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-left: 20px; margin-bottom: 12pt;">
        <tr>
          <td width="5%">1)</td>
          <td class="u" width="32%" align="center">น้ำมันหล่อลื่น / จาระบี</td>
          <td width="28%" align="right">ปริมาณที่ใช้ (ต่อปี/เดือน)&nbsp;&nbsp;</td>
          <td class="u" width="35%" align="center">20 ลิตร</td>
        </tr>
        <tr>
          <td width="5%">2)</td>
          <td class="u" width="32%" align="center">-</td>
          <td width="28%" align="right">ปริมาณที่ใช้ (ต่อปี/เดือน)&nbsp;&nbsp;</td>
          <td class="u" width="35%" align="center">-</td>
        </tr>
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
  `;

  ministryQuestions.forEach((item) => {
    if (item.type === 'heading') {
      htmlContent += `<tr><td colspan="6" style="background:#fafafa; font-weight:bold;">${item.text}</td></tr>`;
    } else {
      const isHeader = item.num === '8';
      const chkYes = isHeader ? '' : '<span class="chk">✓</span>';
      htmlContent += `
        <tr>
          <td valign="top">${item.num}. ${item.text}</td>
          <td valign="middle" align="center">${chkYes}</td>
          <td valign="middle" align="center"></td>
          <td valign="middle" align="center"></td>
          <td valign="top"></td>
          <td valign="top"></td>
        </tr>`;
    }
  });

  htmlContent += `
      </table>

      <p class="bold" style="margin-top: 15pt;">ข้อเสนอแนะ/สรุปผลการตรวจประเมิน:</p>
      <div class="u" style="width: 100%; min-height: 40pt;">ผ่านเกณฑ์มาตรฐานการประเมินสุขลักษณะสถานประกอบกิจการ</div>
      
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
                <td align="center" style="padding-top: 5pt;">( ${inspector} )</td>
                <td></td>
              </tr>
              <tr>
                <td align="left" style="padding-top: 5pt;">ตำแหน่ง</td>
                <td align="center" style="padding-top: 5pt;">${inspectorPos}</td>
                <td></td>
              </tr>
              <tr>
                <td align="left" style="padding-top: 5pt;">วันที่ตรวจ</td>
                <td class="u" align="center" style="padding-top: 5pt;">${inspectDate}</td>
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
