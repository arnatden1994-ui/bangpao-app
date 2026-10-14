import React, { useState, useEffect } from 'react';
import { X, Save, FileText, FileSpreadsheet, Calculator, Calendar, UserCheck, ShieldAlert, FileDown } from 'lucide-react';
import { LicenseRecord, SignerSettings, DEFAULT_SIGNER_SETTINGS } from '../types/index.ts';
import { generateLicenseHtml, exportHtmlAsWord } from '../services/officialDocGenerator.ts';

interface EditLicenseModalProps {
  license: LicenseRecord | null;
  isOpen: boolean;
  onClose: () => void;
  signerSettings?: SignerSettings;
  onSaveOnly: (updated: LicenseRecord) => void;
  onSaveAndExportPdf: (updated: LicenseRecord) => void;
  onSaveAndOpenGoogleSheet: (updated: LicenseRecord) => void;
}

// อัตโนมัติแปลงเลขเป็นตัวอักษรภาษาไทยบาท (เช่น 500 -> -ห้าร้อยบาทถ้วน-)
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
  return '-' + result + '-';
}

export const EditLicenseModal: React.FC<EditLicenseModalProps> = ({
  license,
  isOpen,
  onClose,
  signerSettings,
  onSaveOnly,
  onSaveAndExportPdf,
  onSaveAndOpenGoogleSheet,
}) => {
  if (!isOpen || !license) return null;

  // 1. ข้อมูลควบคุมใบอนุญาต
  const [bookNo, setBookNo] = useState(license.licenseBookNo || '-');
  const [licenseNo, setLicenseNo] = useState(license.licenseNumber.split('/')[0] || '11');
  const [docYear, setDocYear] = useState(license.licenseYear || '2569');

  // 2. เจ้าของกิจการ
  const [ownerName, setOwnerName] = useState(license.ownerName);
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
  const [businessName, setBusinessName] = useState(license.businessName);
  const [businessCategory, setBusinessCategory] = useState(
    license.businessCategory || '7. กิจการเกี่ยวกับยานยนต์ เครื่องจักรหรือเครื่องกล'
  );
  const [useSameAddress, setUseSameAddress] = useState(license.useSameAddress);
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
  const [receiptDate, setReceiptDate] = useState<string>(
    license.receiptDate || license.approvalDate || '22/07/2569'
  );

  // 5. ระยะเวลาอนุญาตและผู้ลงนาม
  const [startDate, setStartDate] = useState<string>(license.approvalDate || '22/07/2569');
  const [endDate, setEndDate] = useState<string>(license.expireDate || '22/07/2570');
  const [condition31, setCondition31] = useState<string>(
    license.condition31 || 'ติดตั้งระบบระบายอากาศและบำบัดน้ำเสียให้ถูกสุขลักษณะ'
  );
  const [condition32, setCondition32] = useState<string>(
    license.condition32 || 'จัดให้มีอุปกรณ์ป้องกันอัคคีภัยพร้อมใช้งานตลอดเวลา'
  );
  const [execName, setExecName] = useState<string>(
    license.execName || '(นายสะดม เชื้อช่วย)'
  );
  const [execPos, setExecPos] = useState<string>(
    license.execPos || 'นายกเทศมนตรีตำบลบางเป้า'
  );

  // Sync address if checkbox is checked
  useEffect(() => {
    if (useSameAddress) {
      setBizAddressNo(ownerAddressNo);
      setBizMoo(ownerMoo);
      setBizSubdistrict(ownerSubdistrict);
      setBizDistrict(ownerDistrict);
      setBizProvince(ownerProvince);
      setBizPhone(ownerPhone);
    }
  }, [useSameAddress, ownerAddressNo, ownerMoo, ownerSubdistrict, ownerDistrict, ownerProvince, ownerPhone]);

  // Handle fee amount change with auto Thai Baht Text calculation
  const handleFeeAmountChange = (val: string) => {
    setFeeAmount(val);
    if (val && !isNaN(Number(val))) {
      setFeeText(thaiBahtText(val));
    }
  };

  const getUpdatedRecord = (): LicenseRecord => {
    return {
      ...license,
      licenseBookNo: bookNo,
      licenseNumber: `${licenseNo}/${docYear}`,
      licenseYear: docYear,
      approvalDate: startDate,
      expireDate: endDate,
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
      receiptDate,
      execName,
      execPos,
      condition31,
      condition32,
    };
  };

  const handleSave = () => {
    const updated = getUpdatedRecord();
    onSaveOnly(updated);
    onClose();
  };

  const handleExportPdf = () => {
    const updated = getUpdatedRecord();
    onSaveAndExportPdf(updated);
    onClose();
  };

  const handleExportWord = () => {
    const updated = getUpdatedRecord();
    onSaveOnly(updated);
    const html = generateLicenseHtml(updated, signerSettings || DEFAULT_SIGNER_SETTINGS);
    exportHtmlAsWord(html, `ใบอนุญาต_${businessName.replace(/\s+/g, '_')}`);
    onClose();
  };

  const handleOpenSheet = () => {
    const updated = getUpdatedRecord();
    onSaveAndOpenGoogleSheet(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-100">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-teal-900 text-white">
          <div>
            <h2 className="text-sm sm:text-base font-bold flex items-center gap-2">
              <span>📄 ตรวจสอบและแก้ไขข้อมูลใบอนุญาตประกอบกิจการอันตรายต่อสุขภาพ (อภ.2)</span>
            </h2>
            <p className="text-xs text-teal-100/90 mt-0.5">
              สถานประกอบกิจการ: <strong className="text-white">{businessName}</strong> (ฐานข้อมูลทะเบียน 35 คอลัมน์)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-teal-200 hover:text-white hover:bg-teal-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-6 flex-1 text-xs">
          {/* Section 1: ข้อมูลควบคุมใบอนุญาต */}
          <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
            <h3 className="font-bold text-teal-900 text-xs sm:text-sm border-b border-teal-200 pb-1.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-600"></span>
              1. ข้อมูลควบคุมใบอนุญาต
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">เล่มที่</label>
                <input
                  type="text"
                  value={bookNo}
                  onChange={(e) => setBookNo(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                  placeholder="-"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">เลขที่ใบอนุญาต</label>
                <input
                  type="text"
                  value={licenseNo}
                  onChange={(e) => setLicenseNo(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white font-bold text-slate-900"
                  placeholder="11"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">ปี พ.ศ. เอกสาร</label>
                <input
                  type="text"
                  value={docYear}
                  onChange={(e) => setDocYear(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white font-bold"
                  placeholder="2569"
                />
              </div>
            </div>
          </div>

          {/* Section 2: ข้อมูลเจ้าของกิจการ */}
          <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
            <h3 className="font-bold text-teal-900 text-xs sm:text-sm border-b border-teal-200 pb-1.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-600"></span>
              2. ข้อมูลเจ้าของกิจการ (ผู้รับใบอนุญาต)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-semibold mb-1">ชื่อผู้ได้รับอนุญาต</label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">สัญชาติ</label>
                <input
                  type="text"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">บ้านเลขที่</label>
                <input
                  type="text"
                  value={ownerAddressNo}
                  onChange={(e) => setOwnerAddressNo(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">หมู่ที่</label>
                <input
                  type="text"
                  value={ownerMoo}
                  onChange={(e) => setOwnerMoo(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">ตรอก/ซอย</label>
                <input
                  type="text"
                  value={ownerTrokSoi}
                  onChange={(e) => setOwnerTrokSoi(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                  placeholder="-"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">ถนน</label>
                <input
                  type="text"
                  value={ownerRoad}
                  onChange={(e) => setOwnerRoad(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                  placeholder="-"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">ตำบล</label>
                <input
                  type="text"
                  value={ownerSubdistrict}
                  onChange={(e) => setOwnerSubdistrict(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">อำเภอ</label>
                <input
                  type="text"
                  value={ownerDistrict}
                  onChange={(e) => setOwnerDistrict(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">จังหวัด</label>
                <input
                  type="text"
                  value={ownerProvince}
                  onChange={(e) => setOwnerProvince(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">เบอร์โทรศัพท์</label>
                <input
                  type="tel"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 3: ข้อมูลสถานประกอบการ */}
          <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
            <h3 className="font-bold text-teal-900 text-xs sm:text-sm border-b border-teal-200 pb-1.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-600"></span>
              3. ข้อมูลสถานประกอบการ
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">ชื่อสถานประกอบการ</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">ประเภทกิจการ</label>
                <input
                  type="text"
                  value={businessCategory}
                  onChange={(e) => setBusinessCategory(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                />
              </div>
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={useSameAddress}
                  onChange={(e) => setUseSameAddress(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span className="text-teal-900 font-semibold">ใช้ข้อมูลที่อยู่ เดียวกับเจ้าของกิจการ</span>
              </label>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">ตั้งอยู่บ้านเลขที่</label>
                <input
                  type="text"
                  value={bizAddressNo}
                  onChange={(e) => setBizAddressNo(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">หมู่ที่</label>
                <input
                  type="text"
                  value={bizMoo}
                  onChange={(e) => setBizMoo(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">ตำบล</label>
                <input
                  type="text"
                  value={bizSubdistrict}
                  onChange={(e) => setBizSubdistrict(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">อำเภอ</label>
                <input
                  type="text"
                  value={bizDistrict}
                  onChange={(e) => setBizDistrict(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">จังหวัด</label>
                <input
                  type="text"
                  value={bizProvince}
                  onChange={(e) => setBizProvince(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                เบอร์โทรศัพท์สถานประกอบการ
              </label>
              <input
                type="tel"
                value={bizPhone}
                onChange={(e) => setBizPhone(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 bg-white font-mono"
              />
            </div>
          </div>

          {/* Section 4: การเงินและใบเสร็จรับเงิน */}
          <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
            <h3 className="font-bold text-teal-900 text-xs sm:text-sm border-b border-teal-200 pb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                4. ข้อมูลการเงินและใบเสร็จรับเงิน
              </span>
              <span className="text-[11px] font-normal text-slate-500 flex items-center gap-1">
                <Calculator className="w-3.5 h-3.5 text-teal-600" />
                แปลงตัวอักษรบาทอัตโนมัติ
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">ค่าธรรมเนียมปีละ (บาท)</label>
                <input
                  type="number"
                  value={feeAmount}
                  onChange={(e) => handleFeeAmountChange(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white font-bold text-teal-800"
                  placeholder="500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  ค่าธรรมเนียม (ตัวอักษร)
                </label>
                <input
                  type="text"
                  value={feeText}
                  onChange={(e) => setFeeText(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium"
                  placeholder="-ห้าร้อยบาทถ้วน-"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">เล่มที่ใบเสร็จ</label>
                <input
                  type="text"
                  value={receiptBookNo}
                  onChange={(e) => setReceiptBookNo(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                  placeholder="-"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">เลขที่ใบเสร็จ</label>
                <input
                  type="text"
                  value={receiptNo}
                  onChange={(e) => setReceiptNo(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white font-mono"
                  placeholder="RCPT-00637/69"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">วันที่ออกใบเสร็จ</label>
                <input
                  type="text"
                  value={receiptDate}
                  onChange={(e) => setReceiptDate(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                  placeholder="22/07/2569"
                />
              </div>
            </div>
          </div>

          {/* Section 5: ระยะเวลาอนุญาตและเงื่อนไข/ผู้ลงนาม */}
          <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
            <h3 className="font-bold text-teal-900 text-xs sm:text-sm border-b border-teal-200 pb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                5. ระยะเวลาอนุญาต, เงื่อนไขเฉพาะ และเจ้าพนักงานท้องถิ่นผู้ลงนาม
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  (4) วันที่ออกใบอนุญาต (วันเริ่มต้น)
                </label>
                <input
                  type="text"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                  placeholder="22/07/2569"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  (5) วันที่สิ้นอายุใบอนุญาต
                </label>
                <input
                  type="text"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                  placeholder="22/07/2570"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  เงื่อนไขเฉพาะข้อ 3.1
                </label>
                <input
                  type="text"
                  value={condition31}
                  onChange={(e) => setCondition31(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                  placeholder="เช่น ติดตั้งระบบบำบัดน้ำเสียให้ถูกสุขลักษณะ"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  เงื่อนไขเฉพาะข้อ 3.2
                </label>
                <input
                  type="text"
                  value={condition32}
                  onChange={(e) => setCondition32(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                  placeholder="เช่น จัดให้มีอุปกรณ์ป้องกันอัคคีภัยพร้อมใช้งาน"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-800">เจ้าพนักงานท้องถิ่นผู้ลงนาม:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setExecName('(นายสะดม เชื้อช่วย)');
                      setExecPos('นายกเทศมนตรีตำบลบางเป้า');
                    }}
                    className="px-2 py-0.5 rounded bg-teal-100 hover:bg-teal-200 text-teal-900 text-[10px] font-bold cursor-pointer transition-colors"
                  >
                    นายกฯ สะดม
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExecName('(นายนิติธรรม ดำสุด)');
                      setExecPos('รองนายกเทศมนตรี ปฏิบัติราชการแทน\nนายกเทศมนตรีตำบลบางเป้า');
                    }}
                    className="px-2 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-[10px] font-bold cursor-pointer transition-colors"
                  >
                    รองนายกฯ นิติธรรม
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">ชื่อ-สกุลผู้ลงนาม</label>
                  <input
                    type="text"
                    value={execName}
                    onChange={(e) => setExecName(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">ตำแหน่ง</label>
                  <textarea
                    rows={2}
                    value={execPos}
                    onChange={(e) => setExecPos(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors cursor-pointer"
          >
            ยกเลิก
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {/* 1. บันทึกอย่างเดียว */}
            <button
              type="button"
              onClick={handleSave}
              className="px-3.5 py-2 text-xs font-bold rounded-lg bg-slate-900 hover:bg-black text-white shadow-xs transition-all active:scale-98 flex items-center gap-1.5 cursor-pointer"
            >
              <span>💾 บันทึกอย่างเดียว</span>
            </button>

            {/* 2. ส่งออกเป็น Word */}
            <button
              type="button"
              onClick={handleExportWord}
              className="px-3.5 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all active:scale-98 flex items-center gap-1.5 cursor-pointer"
              title="ส่งออกใบอนุญาต อภ.2 เป็นไฟล์ Word (.doc)"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>📝 ส่งออก Word</span>
            </button>

            {/* 3. บันทึก & ส่งออก PDF */}
            <button
              type="button"
              onClick={handleExportPdf}
              className="px-3.5 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-all active:scale-98 flex items-center gap-1.5 cursor-pointer"
              title="บันทึกและเปิดหน้าพิมพ์/บันทึก PDF ทันที (ตราครุฑ 2 หน้า A4)"
            >
              <span>📄 พิมพ์เป็น PDF (ตราครุฑ 2 หน้า)</span>
            </button>

            {/* 4. บันทึก & เปิด Google Sheet */}
            <button
              type="button"
              onClick={handleOpenSheet}
              className="px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition-all active:scale-98 flex items-center gap-1.5 cursor-pointer"
              title="บันทึกและเปิด Google Sheet ต้นฉบับ"
            >
              <span>📊 เปิดใน Google Sheet</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
