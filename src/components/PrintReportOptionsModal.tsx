import React, { useState } from 'react';
import { LicenseRecord, SignerSettings, DEFAULT_SIGNER_SETTINGS } from '../types/index.ts';
import { DEFAULT_GAS_URL, DEFAULT_SHEET_ID } from '../services/sheetsSync.ts';
import {
  exportInspectionReportWord,
  generateInspectionReportHtml,
  printHtmlInNewWindow,
} from '../services/officialDocGenerator.ts';
import {
  exportReportSheetViaGas,
  exportReportPdfViaGas,
} from '../services/gasExportService.ts';

interface PrintReportOptionsModalProps {
  license: LicenseRecord | null;
  isOpen: boolean;
  onClose: () => void;
  signerSettings?: SignerSettings;
  gasUrl?: string;
  sheetId?: string;
  onOpenGoogleSheet?: () => void;
}

export const PrintReportOptionsModal: React.FC<PrintReportOptionsModalProps> = ({
  license,
  isOpen,
  onClose,
  signerSettings,
  gasUrl,
  sheetId,
  onOpenGoogleSheet,
}) => {
  const [loadingStep, setLoadingStep] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
  const [loadingMessage, setLoadingMessage] = useState<string>('กรุณารอสักครู่ ระบบกำลังนำข้อมูลไปใส่ในแบบฟอร์ม');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultType, setResultType] = useState<'sheet' | 'pdf'>('sheet');
  const [errorMessage, setErrorMessage] = useState<string>('');

  if (!isOpen || !license) return null;

  const signers = signerSettings || DEFAULT_SIGNER_SETTINGS;
  const effectiveGasUrl = gasUrl || DEFAULT_GAS_URL;

  const handleClose = () => {
    setLoadingStep('idle');
    setResultUrl(null);
    setErrorMessage('');
    onClose();
  };

  // 1. 📄 พิมพ์เป็น PDF (ส่งออกผ่าน Google Apps Script Template โดยตรง เหมือน GAS 100%)
  const handlePrintPdf = async () => {
    setLoadingStep('generating');
    setResultType('pdf');
    setLoadingMessage('กรุณารอสักครู่ ระบบกำลังนำข้อมูลไปใส่ในแบบฟอร์มรายงานตรวจ...');

    try {
      const res = await exportReportPdfViaGas(license.businessName, license.licenseYear, effectiveGasUrl);
      if (res.success && res.pdfUrl) {
        setResultUrl(res.pdfUrl);
        setLoadingStep('success');
        window.open(res.pdfUrl, '_blank');
      } else {
        // Fallback: เปิดหน้าต่างพิมพ์เอกสารเบราว์เซอร์ทันที
        setErrorMessage(res.error || 'ไม่สามารถสร้าง PDF ผ่านคลาวด์ได้ กำลังสลับไปใช้โหมดพิมพ์ในเครื่อง');
        setTimeout(() => {
          handleClose();
          const html = generateInspectionReportHtml(license, signers);
          printHtmlInNewWindow(html);
        }, 1200);
      }
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      setErrorMessage(err);
      setTimeout(() => {
        handleClose();
        const html = generateInspectionReportHtml(license, signers);
        printHtmlInNewWindow(html);
      }, 1200);
    }
  };

  // 2. 📊 เปิดใน Google Sheet (สร้างสำเนาชีต 'แบบออกรายงานตรวจ' เฉพาะร้านค้า เหมือน GAS 100%)
  const handleOpenSheet = async () => {
    setLoadingStep('generating');
    setResultType('sheet');
    setLoadingMessage('กรุณารอสักครู่ ระบบกำลังนำข้อมูลไปใส่ในแบบฟอร์ม');

    try {
      const res = await exportReportSheetViaGas(license.businessName, license.licenseYear, effectiveGasUrl);
      if (res.success && (res.excelUrl || res.sheetUrl)) {
        const targetUrl = res.excelUrl || res.sheetUrl!;
        setResultUrl(targetUrl);
        setLoadingStep('success');
        window.open(targetUrl, '_blank');
      } else {
        // Fallback redirect URL
        const redirectUrl = `${effectiveGasUrl}?action=exportReportSheet&shopName=${encodeURIComponent(
          license.businessName
        )}&redirect=true`;
        setResultUrl(redirectUrl);
        setLoadingStep('success');
        window.open(redirectUrl, '_blank');
      }
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      setErrorMessage(err);
      setLoadingStep('error');
    }
  };

  // 3. 📝 ส่งออกเป็น Word (.doc)
  const handleExportWord = () => {
    handleClose();
    exportInspectionReportWord(license, signers);
  };

  // 4. 🖨️ พิมพ์ด่วนผ่านเบราว์เซอร์ (A4 ทันที ไม่ต้องรอคลาวด์)
  const handlePrintBrowser = () => {
    handleClose();
    const html = generateInspectionReportHtml(license, signers);
    printHtmlInNewWindow(html);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-150">
      {/* 1. Modal แสดงสถานะ Loading (ตรงตามรูปภาพ 2 ใน GAS เป๊ะ 100%) */}
      {loadingStep === 'generating' && (
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-7 text-center transform transition-all animate-in zoom-in-95 duration-150">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-200 shadow-inner">
            <span className="text-3xl animate-bounce">⏳</span>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">กำลังสร้างไฟล์...</h3>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">{loadingMessage}</p>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div className="bg-emerald-600 h-full rounded-full animate-pulse w-3/4"></div>
          </div>
        </div>
      )}

      {/* 2. Modal แสดงสถานะสำเร็จ (ตรงตาม SweetAlert ใน GAS) */}
      {loadingStep === 'success' && (
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center transform transition-all animate-in zoom-in-95 duration-150">
          <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-200">
            <span className="text-3xl">✅</span>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">สร้างไฟล์สำเร็จ!</h3>
          <p className="text-xs text-slate-500 mb-5">ระบบเปิดไฟล์ให้คุณในแท็บใหม่แล้ว หรือคลิกปุ่มด้านล่างเพื่อเปิดอีกครั้ง</p>
          <div className="flex flex-col gap-2">
            <a
              href={resultUrl || '#'}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm transition-all text-center"
            >
              {resultType === 'pdf' ? '⬇️ ดาวน์โหลด PDF' : '📄 เปิดใน Google Sheet'}
            </a>
            <button
              type="button"
              onClick={handleClose}
              className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
            >
              ปิด
            </button>
          </div>
        </div>
      )}

      {/* 3. Modal แสดงสถานะข้อผิดพลาด */}
      {loadingStep === 'error' && (
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center transform transition-all animate-in zoom-in-95 duration-150">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-red-200">
            <span className="text-3xl">⚠️</span>
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">ข้อผิดพลาดในการเชื่อมต่อ</h3>
          <p className="text-xs text-red-600 mb-4">{errorMessage}</p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handlePrintBrowser}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm"
            >
              🖨️ สลับไปพิมพ์ A4 ในเครื่องแทน
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* 4. Modal หลัก: เลือกรูปแบบไฟล์ที่ต้องการส่งออก (ตรงตาม Image 3 และ GAS Index.html บรรทัด 788-795) */}
      {loadingStep === 'idle' && (
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col transform transition-all">
          {/* Header */}
          <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="text-indigo-600">🖨️</span> พิมพ์รายงานการตรวจ
            </h3>
            <button
              type="button"
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-600 font-bold text-xl cursor-pointer"
            >
              &times;
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4 text-center">
            <p className="text-sm text-slate-600 font-medium mb-3">
              เลือกรูปแบบไฟล์ที่ต้องการส่งออกสำหรับร้าน: <br />
              <span className="font-bold text-indigo-700 text-base">{license.businessName}</span>
            </p>

            <div className="flex flex-col gap-3">
              {/* 1. พิมพ์เป็น PDF (GAS Template จริง) */}
              <button
                type="button"
                onClick={handlePrintPdf}
                className="w-full bg-indigo-600 text-white hover:bg-indigo-700 font-bold px-4 py-3 rounded-xl text-sm cursor-pointer shadow-sm transition-all flex items-center justify-center gap-2"
              >
                📄 พิมพ์เป็น PDF
              </button>

              {/* 2. เปิดใน Google Sheet (สร้างสำเนาชีต 'แบบออกรายงานตรวจ' เฉพาะร้านค้า) */}
              <button
                type="button"
                onClick={handleOpenSheet}
                className="w-full bg-green-600 text-white hover:bg-green-700 font-bold px-4 py-3 rounded-xl text-sm cursor-pointer shadow-sm transition-all flex items-center justify-center gap-2"
              >
                📊 เปิดใน Google Sheet
              </button>

              {/* 3. ส่งออกเป็น Word */}
              <button
                type="button"
                onClick={handleExportWord}
                className="w-full bg-blue-600 text-white hover:bg-blue-700 font-bold px-4 py-3 rounded-xl text-sm cursor-pointer shadow-sm transition-all flex items-center justify-center gap-2 mt-1"
              >
                📝 ส่งออกเป็น Word
              </button>

              {/* 4. พิมพ์ด่วนผ่านเบราว์เซอร์ */}
              <button
                type="button"
                onClick={handlePrintBrowser}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-2 rounded-xl text-xs cursor-pointer transition-all flex items-center justify-center gap-1.5 mt-1 border border-slate-200"
              >
                <span>🖨️ แสดงตัวอย่าง & พิมพ์ด่วน (A4 ในเครื่อง)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
