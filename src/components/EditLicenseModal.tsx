import React, { useState, useEffect } from 'react';
import { X, Save, FileText, FileSpreadsheet, Calculator, Calendar, UserCheck, ShieldAlert, FileDown, CheckCircle2 } from 'lucide-react';
import { LicenseRecord, SignerSettings, DEFAULT_SIGNER_SETTINGS } from '../types/index.ts';
import { generateLicenseHtml, exportHtmlAsWord, printHtmlInNewWindow } from '../services/officialDocGenerator.ts';
import {
  exportLicenseSheetViaGas,
  exportLicensePdfViaGas,
  updateLicenseRecordInGas,
} from '../services/gasExportService.ts';
import { DEFAULT_GAS_URL } from '../services/sheetsSync.ts';

interface EditLicenseModalProps {
  license: LicenseRecord | null;
  isOpen: boolean;
  onClose: () => void;
  signerSettings?: SignerSettings;
  gasUrl?: string;
  onSaveOnly: (updated: LicenseRecord) => void;
  onSaveAndExportPdf: (updated: LicenseRecord) => void;
  onSaveAndOpenGoogleSheet: (updated: LicenseRecord) => void;
}

// อัตโนมัติแปลงเลขเป็นตัวอักษรภาษาไทยบาท ตามมาตรฐานราชการไทย (เช่น 500 -> ห้าร้อยบาทถ้วน)
export function thaiBahtText(num: number | string): string {
  if (num === null || num === undefined) return '';
  const numStr = num.toString().replace(/,/g, '').trim();
  if (isNaN(Number(numStr)) || numStr === '') return '';
  const parts = parseFloat(numStr).toFixed(2).split('.');
  const baht = parts[0];
  const satang = parts[1];

  let result = '';
  const thaiNum = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const thaiPos = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

  const bahtLen = baht.length;
  if (parseInt(baht, 10) === 0) {
    result = 'ศูนย์';
  } else {
    for (let i = 0; i < bahtLen; i++) {
      const digit = parseInt(baht.charAt(i), 10);
      const pos = bahtLen - i - 1;
      const posInGroup = pos % 6;

      if (digit !== 0) {
        if (posInGroup === 1 && digit === 2) {
          result += 'ยี่';
        } else if (posInGroup === 1 && digit === 1) {
          result += '';
        } else if (posInGroup === 0 && digit === 1 && i > 0 && baht.charAt(i - 1) !== '0') {
          result += 'เอ็ด';
        } else {
          result += thaiNum[digit];
        }
        result += thaiPos[posInGroup];
      }
      if (posInGroup === 0 && pos > 0) {
        result += 'ล้าน';
      }
    }
  }

  result += 'บาท';

  if (parseInt(satang, 10) === 0) {
    result += 'ถ้วน';
  } else {
    const satangLen = satang.length;
    for (let i = 0; i < satangLen; i++) {
      const digit = parseInt(satang.charAt(i), 10);
      const pos = satangLen - i - 1;
      if (digit !== 0) {
        if (pos === 0 && digit === 1 && satang.charAt(0) !== '0') {
          result += 'เอ็ด';
        } else if (pos === 1 && digit === 2) {
          result += 'ยี่';
        } else if (pos === 1 && digit === 1) {
          result += '';
        } else {
          result += thaiNum[digit];
        }
        result += pos === 1 ? 'สิบ' : '';
      }
    }
    result += 'สตางค์';
  }
  return result;
}

// แปลงรูปแบบวันที่ระหว่าง YYYY-MM-DD (สำหรับ date input) กับ วัน/เดือน/ปี พ.ศ. (สำหรับระบบไทย)
function toIsoDate(dateStr?: string): string {
  if (!dateStr || dateStr === '-' || dateStr === '.......') return '';
  if (dateStr.includes('T')) {
    dateStr = dateStr.split('T')[0];
  }
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      let y = parseInt(parts[0], 10);
      if (y > 2400) y -= 543;
      return `${y}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
  }
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      let y = parseInt(parts[2], 10);
      if (y < 100) y += 2000;
      if (y > 2400) y -= 543;
      return `${y}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  return '';
}

function toThaiDisplayDate(isoDateStr?: string): string {
  if (!isoDateStr) return '';
  if (isoDateStr.includes('-')) {
    const parts = isoDateStr.split('-');
    if (parts.length === 3) {
      let y = parseInt(parts[0], 10);
      if (y < 2400) y += 543;
      return `${parts[2]}/${parts[1]}/${y}`;
    }
  }
  return isoDateStr;
}

export const EditLicenseModal: React.FC<EditLicenseModalProps> = ({
  license,
  isOpen,
  onClose,
  signerSettings,
  gasUrl,
  onSaveOnly,
  onSaveAndExportPdf,
  onSaveAndOpenGoogleSheet,
}) => {
  if (!isOpen || !license) return null;

  const effectiveGasUrl = gasUrl || DEFAULT_GAS_URL;
  const [isProcessing, setIsProcessing] = useState(false);
  const [processMessage, setProcessMessage] = useState('กรุณารอสักครู่ ระบบกำลังนำข้อมูลไปใส่ในแบบฟอร์ม');

  // 1. ข้อมูลควบคุมใบอนุญาต
  const [bookNo, setBookNo] = useState(license.licenseBookNo || '-');
  const [licenseNo, setLicenseNo] = useState(license.licenseNumber.split('/')[0] || '11');
  const [docYear, setDocYear] = useState(license.licenseYear || '2569');

  // 2. เจ้าของกิจการ
  const [ownerName, setOwnerName] = useState(license.ownerName || '');
  const [nationality, setNationality] = useState(license.nationality || 'ไทย');
  const [ownerAddressNo, setOwnerAddressNo] = useState(license.ownerAddressNo || '');
  const [ownerMoo, setOwnerMoo] = useState(license.ownerMoo || '');
  const [ownerTrokSoi, setOwnerTrokSoi] = useState(license.ownerTrokSoi || '');
  const [ownerRoad, setOwnerRoad] = useState(license.ownerRoad || '');
  const [ownerSubdistrict, setOwnerSubdistrict] = useState(license.ownerSubdistrict || 'คลองชีล้อม');
  const [ownerDistrict, setOwnerDistrict] = useState(license.ownerDistrict || 'กันตัง');
  const [ownerProvince, setOwnerProvince] = useState(license.ownerProvince || 'ตรัง');
  const [ownerPhone, setOwnerPhone] = useState(license.ownerPhone || '0812736558');

  // 3. ข้อมูลสถานประกอบการ
  const [businessName, setBusinessName] = useState(license.businessName || '');
  const [businessCategory, setBusinessCategory] = useState(
    license.businessCategory || '7. กิจการเกี่ยวกับยานยนต์ เครื่องจักรหรือเครื่องกล'
  );
  const [useSameAddress, setUseSameAddress] = useState(license.useSameAddress || false);
  const [bizAddressNo, setBizAddressNo] = useState(license.businessAddressNo || '195/1');
  const [bizMoo, setBizMoo] = useState(license.businessMoo || '5');
  const [bizSubdistrict, setBizSubdistrict] = useState(license.businessSubdistrict || 'บางเป้า');
  const [bizDistrict, setBizDistrict] = useState(license.businessDistrict || 'กันตัง');
  const [bizProvince, setBizProvince] = useState(license.businessProvince || 'ตรัง');
  const [bizPhone, setBizPhone] = useState(license.businessPhone || '0812736558');

  // 4. การเงินและใบเสร็จรับเงิน
  const [feeAmount, setFeeAmount] = useState<string>(
    license.feeAmount ? String(license.feeAmount) : '500'
  );
  const [feeText, setFeeText] = useState<string>(
    license.feeText || thaiBahtText(license.feeAmount || 500)
  );
  const [receiptBookNo, setReceiptBookNo] = useState<string>(license.receiptBookNo || '-');
  const [receiptNo, setReceiptNo] = useState<string>(license.receiptNo || 'RCPT-00637/69');
  const [receiptDateIso, setReceiptDateIso] = useState<string>(
    toIsoDate(license.receiptDate || license.approvalDate || '2026-07-22')
  );

  // 5. ระยะเวลาอนุญาตและผู้ลงนาม
  const [startDateIso, setStartDateIso] = useState<string>(
    toIsoDate(license.approvalDate || '2026-07-22')
  );
  const [endDateIso, setEndDateIso] = useState<string>(
    toIsoDate(license.expireDate || '2027-07-22')
  );
  const [execName, setExecName] = useState<string>(
    license.execName && license.execName !== '(นายสะดม เชื้อช่วย)'
      ? license.execName
      : '(นายละดม เชื้อช่วย)'
  );
  const [execPos, setExecPos] = useState<string>(
    license.execPos || 'นายกเทศมนตรีตำบลบางเป้า'
  );

  // 6. เงื่อนไขเฉพาะท้ายใบอนุญาต (ข้อ 3)
  const [condition31, setCondition31] = useState<string>(
    license.condition31 || 'ติดตั้งระบบระบายอากาศและบำบัดน้ำเสียให้ถูกสุขลักษณะ'
  );
  const [condition32, setCondition32] = useState<string>(
    license.condition32 || 'จัดให้มีอุปกรณ์ป้องกันอัคคีภัยพร้อมใช้งานตลอดเวลา'
  );

  // Re-sync all state fields whenever a different license is passed in
  useEffect(() => {
    if (license) {
      setBookNo(license.licenseBookNo || '-');
      setLicenseNo(license.licenseNumber ? license.licenseNumber.split('/')[0].replace('เลขที่', '').trim() : '11');
      setDocYear(license.licenseYear || '2569');

      setOwnerName(license.ownerName || '');
      setNationality(license.nationality || 'ไทย');
      setOwnerAddressNo(license.ownerAddressNo || '');
      setOwnerMoo(license.ownerMoo || '');
      setOwnerTrokSoi(license.ownerTrokSoi || '');
      setOwnerRoad(license.ownerRoad || '');
      setOwnerSubdistrict(license.ownerSubdistrict || 'คลองชีล้อม');
      setOwnerDistrict(license.ownerDistrict || 'กันตัง');
      setOwnerProvince(license.ownerProvince || 'ตรัง');
      setOwnerPhone(license.ownerPhone || '0812736558');

      setBusinessName(license.businessName || '');
      setBusinessCategory(license.businessCategory || '7. กิจการเกี่ยวกับยานยนต์ เครื่องจักรหรือเครื่องกล');
      setUseSameAddress(license.useSameAddress || false);
      setBizAddressNo(license.businessAddressNo || '195/1');
      setBizMoo(license.businessMoo || '5');
      setBizSubdistrict(license.businessSubdistrict || 'บางเป้า');
      setBizDistrict(license.businessDistrict || 'กันตัง');
      setBizProvince(license.businessProvince || 'ตรัง');
      setBizPhone(license.businessPhone || '0812736558');

      const initialFee = license.feeAmount ? String(license.feeAmount) : '500';
      setFeeAmount(initialFee);
      setFeeText(license.feeText || thaiBahtText(initialFee));
      setReceiptBookNo(license.receiptBookNo || '-');
      setReceiptNo(license.receiptNo || 'RCPT-00637/69');
      setReceiptDateIso(toIsoDate(license.receiptDate || license.approvalDate || '2026-07-22'));

      setStartDateIso(toIsoDate(license.approvalDate || '2026-07-22'));
      setEndDateIso(toIsoDate(license.expireDate || '2027-07-22'));
      
      const ex = license.execName && license.execName !== '(นายสะดม เชื้อช่วย)' ? license.execName : '(นายละดม เชื้อช่วย)';
      setExecName(ex);
      setExecPos(license.execPos || 'นายกเทศมนตรีตำบลบางเป้า');

      setCondition31(license.condition31 || 'ติดตั้งระบบระบายอากาศและบำบัดน้ำเสียให้ถูกสุขลักษณะ');
      setCondition32(license.condition32 || 'จัดให้มีอุปกรณ์ป้องกันอัคคีภัยพร้อมใช้งานตลอดเวลา');
    }
  }, [license]);

  // Handle checkbox "ใช้ข้อมูลที่อยู่เดียวกับเจ้าของกิจการ" (copyOwnerToShop matching GAS line 1664)
  const handleCheckboxSameAddress = (checked: boolean) => {
    setUseSameAddress(checked);
    if (checked) {
      setBizAddressNo(ownerAddressNo || '');
      setBizMoo(ownerMoo || '');
      setBizSubdistrict(ownerSubdistrict || 'บางเป้า');
      setBizDistrict(ownerDistrict || 'กันตัง');
      setBizProvince(ownerProvince || 'ตรัง');
      setBizPhone(ownerPhone || '');
    } else {
      setBizAddressNo('');
      setBizMoo('');
      setBizSubdistrict('บางเป้า');
      setBizDistrict('กันตัง');
      setBizProvince('ตรัง');
    }
  };

  // Handle fee change with auto Thai Baht conversion
  const handleFeeChange = (val: string) => {
    setFeeAmount(val);
    if (val && !isNaN(Number(val))) {
      setFeeText(thaiBahtText(val));
    }
  };

  // Build the complete updated LicenseRecord
  const getUpdatedRecord = (): LicenseRecord => {
    const formattedStart = toThaiDisplayDate(startDateIso) || license.approvalDate;
    const formattedEnd = toThaiDisplayDate(endDateIso) || license.expireDate;
    const formattedReceipt = toThaiDisplayDate(receiptDateIso) || license.receiptDate || formattedStart;

    return {
      ...license,
      licenseBookNo: bookNo,
      licenseNumber: `${licenseNo}/${docYear}`,
      licenseYear: docYear,
      roundYear: `รอบปี ${docYear}`,
      approvalDate: formattedStart,
      expireDate: formattedEnd,
      ownerName,
      nationality,
      ownerAddressNo,
      ownerMoo,
      ownerTrokSoi,
      ownerRoad,
      ownerSubdistrict,
      ownerDistrict,
      ownerProvince,
      ownerPhone,
      businessName,
      businessCategory,
      useSameAddress,
      businessAddressNo: bizAddressNo,
      businessMoo: bizMoo,
      businessSubdistrict: bizSubdistrict,
      businessDistrict: bizDistrict,
      businessProvince: bizProvince,
      businessPhone: bizPhone,
      feeAmount,
      feeText,
      receiptBookNo,
      receiptNo,
      receiptDate: formattedReceipt,
      execName,
      execPos,
      condition31,
      condition32,
    };
  };

  const handleSave = async () => {
    const updated = getUpdatedRecord();
    onSaveOnly(updated);
    setIsProcessing(true);
    setProcessMessage('กำลังบันทึกข้อมูลใบอนุญาตลงฐานข้อมูล...');
    try {
      await updateLicenseRecordInGas(updated, effectiveGasUrl);
    } catch (e) {
      console.warn('Sync license warning:', e);
    } finally {
      setIsProcessing(false);
      onClose();
    }
  };

  const handleExportPdf = async () => {
    const updated = getUpdatedRecord();
    onSaveOnly(updated);
    setIsProcessing(true);
    setProcessMessage('กรุณารอสักครู่ ระบบกำลังนำข้อมูลไปใส่ในแบบฟอร์มใบอนุญาต (PDF)...');
    try {
      await updateLicenseRecordInGas(updated, effectiveGasUrl);
      const res = await exportLicensePdfViaGas(updated.businessName, effectiveGasUrl);
      if (res.success && res.pdfUrl) {
        window.open(res.pdfUrl, '_blank');
      } else {
        const html = generateLicenseHtml(updated, signerSettings || DEFAULT_SIGNER_SETTINGS);
        printHtmlInNewWindow(html);
      }
    } catch {
      const html = generateLicenseHtml(updated, signerSettings || DEFAULT_SIGNER_SETTINGS);
      printHtmlInNewWindow(html);
    } finally {
      setIsProcessing(false);
      onClose();
    }
  };

  const handleExportWord = () => {
    const updated = getUpdatedRecord();
    onSaveOnly(updated);
    const html = generateLicenseHtml(updated, signerSettings || DEFAULT_SIGNER_SETTINGS);
    exportHtmlAsWord(html, `ใบอนุญาต_${businessName.replace(/\s+/g, '_')}`);
    onClose();
  };

  const handleOpenSheet = async () => {
    const updated = getUpdatedRecord();
    onSaveOnly(updated);
    setIsProcessing(true);
    setProcessMessage('กรุณารอสักครู่ ระบบกำลังนำข้อมูลไปใส่ในแบบฟอร์มใบอนุญาต (Google Sheet)...');
    try {
      await updateLicenseRecordInGas(updated, effectiveGasUrl);
      const res = await exportLicenseSheetViaGas(updated.businessName, effectiveGasUrl);
      if (res.success && (res.excelUrl || res.sheetUrl)) {
        window.open(res.excelUrl || res.sheetUrl, '_blank');
      } else {
        const redirectUrl = `${effectiveGasUrl}?action=exportLicenseSheet&shopName=${encodeURIComponent(
          updated.businessName
        )}&redirect=true`;
        window.open(redirectUrl, '_blank');
      }
    } catch {
      const redirectUrl = `${effectiveGasUrl}?action=exportLicenseSheet&shopName=${encodeURIComponent(
        updated.businessName
      )}&redirect=true`;
      window.open(redirectUrl, '_blank');
    } finally {
      setIsProcessing(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      {/* Loading Overlay (ตรงตาม Image 2 ใน GAS เป๊ะ 100%) */}
      {isProcessing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-7 text-center transform transition-all animate-in zoom-in-95 duration-150">
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-200 shadow-inner">
              <span className="text-3xl animate-bounce">⏳</span>
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">กำลังสร้างไฟล์...</h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">{processMessage}</p>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div className="bg-emerald-600 h-full rounded-full animate-pulse w-3/4"></div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 relative">
        
        {/* Header (Matching GAS Index.html line 536) */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>📄 ตรวจสอบและแก้ไขข้อมูลใบอนุญาต</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              คุณสามารถปรับแต่งข้อความและข้อมูลบนใบอนุญาตได้อย่างอิสระก่อนที่จะทำการสั่งพิมพ์หรือส่งออก ({businessName})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-2xl cursor-pointer p-1 transition-colors leading-none"
          >
            &times;
          </button>
        </div>

        {/* Body (Scrollable, 6 Sections matching GAS lines 550-745) */}
        <div className="p-6 overflow-y-auto space-y-6 text-left flex-1 text-xs">
          
          {/* Section 1: ข้อมูลควบคุมใบอนุญาต */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-teal-700 border-b border-teal-100 pb-1.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-600"></span>
              1. ข้อมูลควบคุมใบอนุญาต
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600">เล่มที่</label>
                <input
                  type="text"
                  value={bookNo}
                  onChange={(e) => setBookNo(e.target.value)}
                  className="w-full p-2.5 rounded-lg text-xs font-bold border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white"
                  placeholder="-"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600">เลขที่ใบอนุญาต</label>
                <input
                  type="text"
                  value={licenseNo}
                  onChange={(e) => setLicenseNo(e.target.value)}
                  className="w-full p-2.5 rounded-lg text-xs font-bold border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white"
                  placeholder="11"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600">ปี พ.ศ. เอกสาร</label>
                <input
                  type="text"
                  value={docYear}
                  onChange={(e) => setDocYear(e.target.value)}
                  className="w-full p-2.5 rounded-lg text-xs font-bold border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white"
                  placeholder="2569"
                />
              </div>
            </div>
          </div>

          {/* Section 2: ข้อมูลเจ้าของกิจการ */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-teal-700 border-b border-teal-100 pb-1.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-600"></span>
              2. ข้อมูลเจ้าของกิจการ
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1 sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600">ชื่อผู้ได้รับอนุญาต</label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full p-2.5 rounded-lg text-xs border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white"
                  placeholder="นายโกวิทย์ กุ้งฮุย"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600">สัญชาติ</label>
                <input
                  type="text"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className="w-full p-2.5 rounded-lg text-xs border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white"
                  placeholder="ไทย"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600">บ้านเลขที่</label>
                <input
                  type="text"
                  value={ownerAddressNo}
                  onChange={(e) => setOwnerAddressNo(e.target.value)}
                  className="w-full p-2.5 rounded-lg text-xs border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white"
                  placeholder="4/3"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600">หมู่ที่</label>
                <input
                  type="text"
                  value={ownerMoo}
                  onChange={(e) => setOwnerMoo(e.target.value)}
                  className="w-full p-2.5 rounded-lg text-xs border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white"
                  placeholder="1"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600">ตรอก/ซอย</label>
                <input
                  type="text"
                  value={ownerTrokSoi}
                  onChange={(e) => setOwnerTrokSoi(e.target.value)}
                  className="w-full p-2.5 rounded-lg text-xs border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white"
                  placeholder="-"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600">ถนน</label>
                <input
                  type="text"
                  value={ownerRoad}
                  onChange={(e) => setOwnerRoad(e.target.value)}
                  className="w-full p-2.5 rounded-lg text-xs border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white"
                  placeholder="-"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600">ตำบล</label>
                <input
                  type="text"
                  value={ownerSubdistrict}
                  onChange={(e) => setOwnerSubdistrict(e.target.value)}
                  className="w-full p-2.5 rounded-lg text-xs border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white"
                  placeholder="คลองชีล้อม"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600">อำเภอ</label>
                <input
                  type="text"
                  value={ownerDistrict}
                  onChange={(e) => setOwnerDistrict(e.target.value)}
                  className="w-full p-2.5 rounded-lg text-xs border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white"
                  placeholder="กันตัง"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600">จังหวัด</label>
                <input
                  type="text"
                  value={ownerProvince}
                  onChange={(e) => setOwnerProvince(e.target.value)}
                  className="w-full p-2.5 rounded-lg text-xs border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white"
                  placeholder="ตรัง"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600">เบอร์โทรศัพท์</label>
                <input
                  type="text"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  className="w-full p-2.5 rounded-lg text-xs border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white"
                  placeholder="0812736558"
                />
              </div>
            </div>
          </div>

          {/* Section 3: ข้อมูลสถานประกอบการ */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-teal-700 border-b border-teal-100 pb-1.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-600"></span>
              3. ข้อมูลสถานประกอบการ
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600">ชื่อสถานประกอบการ</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full p-2.5 rounded-lg text-xs font-bold border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white"
                  placeholder="ร้าน ช่างกุย"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600">ประเภทกิจการ</label>
                <input
                  type="text"
                  value={businessCategory}
                  onChange={(e) => setBusinessCategory(e.target.value)}
                  className="w-full p-2.5 rounded-lg text-xs border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white"
                  placeholder="7. กิจการเกี่ยวกับยานยนต์ เครื่องจักรหรือเครื่องกล"
                />
              </div>
            </div>

            {/* Checkbox copyOwnerToShop */}
            <div className="mb-2 mt-3">
              <label className="inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={useSameAddress}
                  onChange={(e) => handleCheckboxSameAddress(e.target.checked)}
                  className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                />
                <span className="ml-2 text-xs font-semibold text-slate-700">ใช้ข้อมูลที่อยู่ เดียวกับเจ้าของกิจการ</span>
              </label>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600">ตั้งอยู่บ้านเลขที่</label>
                <input
                  type="text"
                  value={bizAddressNo}
                  onChange={(e) => setBizAddressNo(e.target.value)}
                  className="w-full p-2.5 rounded-lg text-xs border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white"
                  placeholder="195/1"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600">หมู่ที่</label>
                <input
                  type="text"
                  value={bizMoo}
                  onChange={(e) => setBizMoo(e.target.value)}
                  className="w-full p-2.5 rounded-lg text-xs border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white"
                  placeholder="5"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600">ตำบล</label>
                <input
                  type="text"
                  value={bizSubdistrict}
                  onChange={(e) => setBizSubdistrict(e.target.value)}
                  className="w-full p-2.5 rounded-lg text-xs border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white"
                  placeholder="บางเป้า"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600">อำเภอ</label>
                <input
                  type="text"
                  value={bizDistrict}
                  onChange={(e) => setBizDistrict(e.target.value)}
                  className="w-full p-2.5 rounded-lg text-xs border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white"
                  placeholder="กันตัง"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600">จังหวัด</label>
                <input
                  type="text"
                  value={bizProvince}
                  onChange={(e) => setBizProvince(e.target.value)}
                  className="w-full p-2.5 rounded-lg text-xs border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white"
                  placeholder="ตรัง"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600">เบอร์โทรศัพท์สถานประกอบการ</label>
                <input
                  type="text"
                  value={bizPhone}
                  onChange={(e) => setBizPhone(e.target.value)}
                  className="w-full p-2.5 rounded-lg text-xs border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white"
                  placeholder="0812736558"
                />
              </div>
            </div>
          </div>

          {/* Section 4: ค่าธรรมเนียม & ใบเสร็จรับเงิน */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-teal-700 border-b border-teal-100 pb-1.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-600"></span>
              4. ค่าธรรมเนียม & ใบเสร็จรับเงิน
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600">ค่าธรรมเนียมปีละ (บาท)</label>
                <input
                  type="text"
                  value={feeAmount}
                  onChange={(e) => handleFeeChange(e.target.value)}
                  className="w-full p-2.5 rounded-lg text-xs font-bold border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white"
                  placeholder="500"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600">ค่าธรรมเนียมตัวอักษร</label>
                <input
                  type="text"
                  value={feeText}
                  onChange={(e) => setFeeText(e.target.value)}
                  className="w-full p-2.5 rounded-lg text-xs font-medium border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white"
                  placeholder="ห้าร้อยบาทถ้วน"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600">เล่มที่ใบเสร็จ</label>
                <input
                  type="text"
                  value={receiptBookNo}
                  onChange={(e) => setReceiptBookNo(e.target.value)}
                  className="w-full p-2.5 rounded-lg text-xs border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white"
                  placeholder="-"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600">เลขที่ใบเสร็จ</label>
                <input
                  type="text"
                  value={receiptNo}
                  onChange={(e) => setReceiptNo(e.target.value)}
                  className="w-full p-2.5 rounded-lg text-xs font-mono border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white"
                  placeholder="RCPT-00637/69"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600">วันที่ใบเสร็จ</label>
                <input
                  type="date"
                  value={receiptDateIso}
                  onChange={(e) => setReceiptDateIso(e.target.value)}
                  className="w-full p-2.5 rounded-lg text-xs font-mono border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 5: ระยะเวลาการอนุญาต & ผู้ลงนาม */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-teal-700 border-b border-teal-100 pb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                5. อายุใบอนุญาต & ผู้ลงนาม
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setExecName('(นายละดม เชื้อช่วย)');
                    setExecPos('นายกเทศมนตรีตำบลบางเป้า');
                  }}
                  className="px-2.5 py-1 rounded-md bg-teal-50 hover:bg-teal-100 text-teal-800 text-[11px] font-bold cursor-pointer transition-colors border border-teal-200"
                >
                  นายกฯ ละดม
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExecName('(นายนิติธรรม ดำสุด)');
                    setExecPos('รองนายกเทศมนตรี ปฏิบัติราชการแทน\nนายกเทศมนตรีตำบลบางเป้า');
                  }}
                  className="px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold cursor-pointer transition-colors border border-emerald-200"
                >
                  รองนายกฯ นิติธรรม
                </button>
              </div>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600">วันที่เริ่มอนุญาต</label>
                <input
                  type="date"
                  value={startDateIso}
                  onChange={(e) => setStartDateIso(e.target.value)}
                  className="w-full p-2.5 rounded-lg text-xs font-mono border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600">วันที่สิ้นสุดอนุญาต</label>
                <input
                  type="date"
                  value={endDateIso}
                  onChange={(e) => setEndDateIso(e.target.value)}
                  className="w-full p-2.5 rounded-lg text-xs font-mono border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600">ชื่อผู้ลงนาม (เจ้าพนักงานท้องถิ่น)</label>
                <input
                  type="text"
                  value={execName}
                  onChange={(e) => setExecName(e.target.value)}
                  className="w-full p-2.5 rounded-lg text-xs font-bold border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white"
                  placeholder="(นายละดม เชื้อช่วย)"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600">ตำแหน่ง</label>
                <textarea
                  rows={2}
                  value={execPos}
                  onChange={(e) => setExecPos(e.target.value)}
                  className="w-full p-2.5 rounded-lg text-xs font-bold border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white resize-none"
                  placeholder="นายกเทศมนตรีตำบลบางเป้า"
                />
              </div>
            </div>
          </div>

          {/* Section 6: เงื่อนไขเฉพาะท้ายใบอนุญาต (ข้อ 3) */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-teal-700 border-b border-teal-100 pb-1.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-600"></span>
              6. เงื่อนไขเฉพาะท้ายใบอนุญาต (ข้อ 3)
            </h4>
            <div className="space-y-2">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600">ข้อ 3.1</label>
                <input
                  type="text"
                  value={condition31}
                  onChange={(e) => setCondition31(e.target.value)}
                  placeholder="ระบุเงื่อนไขเฉพาะข้อ 3.1 (ถ้ามี)"
                  className="w-full p-2.5 rounded-lg text-xs border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600">ข้อ 3.2</label>
                <input
                  type="text"
                  value={condition32}
                  onChange={(e) => setCondition32(e.target.value)}
                  placeholder="ระบุเงื่อนไขเฉพาะข้อ 3.2 (ถ้ามี)"
                  className="w-full p-2.5 rounded-lg text-xs border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Footer Actions (Matching GAS lines 747-757 & User screenshot) */}
        <div className="p-5 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between gap-3 rounded-b-2xl shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl transition-colors cursor-pointer text-center"
          >
            ยกเลิก
          </button>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {/* 1. บันทึกอย่างเดียว */}
            <button
              type="button"
              onClick={handleSave}
              className="text-xs font-bold px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all shadow-sm cursor-pointer text-center flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>💾 บันทึกอย่างเดียว</span>
            </button>

            {/* 2. ส่งออกเป็น Word */}
            <button
              type="button"
              onClick={handleExportWord}
              className="text-xs font-bold px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-sm cursor-pointer text-center flex items-center gap-1.5"
              title="ส่งออกใบอนุญาต อภ.2 เป็นไฟล์ Word (.doc)"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>📝 ส่งออกเป็น Word</span>
            </button>

            {/* 3. บันทึก & ส่งออก PDF (แบบฟอร์ม) */}
            <button
              type="button"
              onClick={handleExportPdf}
              className="text-xs font-bold px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all shadow-sm cursor-pointer text-center flex items-center gap-1.5"
              title="บันทึกและเปิดหน้าพิมพ์/บันทึก PDF ทันที (ตราครุฑ 2 หน้า A4)"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>🖨️ บันทึก & ส่งออก PDF (แบบฟอร์ม)</span>
            </button>

            {/* 4. บันทึก & เปิด Google Sheet (แบบฟอร์ม) */}
            <button
              type="button"
              onClick={handleOpenSheet}
              className="text-xs font-bold px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all shadow-sm cursor-pointer text-center flex items-center gap-1.5"
              title="บันทึกและเปิด Google Sheet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>📊 บันทึก & เปิด Google Sheet (แบบฟอร์ม)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
