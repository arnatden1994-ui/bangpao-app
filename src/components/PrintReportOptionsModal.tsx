import React from 'react';
import { LicenseRecord, SignerSettings, DEFAULT_SIGNER_SETTINGS } from '../types/index.ts';
import { DEFAULT_GAS_URL, DEFAULT_SHEET_ID } from '../services/sheetsSync.ts';
import {
  exportInspectionReportWord,
  generateInspectionReportHtml,
  printHtmlInNewWindow,
} from '../services/officialDocGenerator.ts';

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
  if (!isOpen || !license) return null;

  const signers = signerSettings || DEFAULT_SIGNER_SETTINGS;
  const effectiveGasUrl = gasUrl || DEFAULT_GAS_URL;
  const effectiveSheetId = sheetId || DEFAULT_SHEET_ID;

  // 1. 📄 พิมพ์เป็น PDF (เรนเดอร์เทมเพลต A4 ฉบับจริงและเปิดหน้าพิมพ์/บันทึก PDF ทันที)
  const handlePrintPdf = () => {
    onClose();
    const html = generateInspectionReportHtml(license, signers);
    printHtmlInNewWindow(html);
  };

  // 2. 📊 เปิดใน Google Sheet
  const handleOpenSheet = () => {
    onClose();
    if (onOpenGoogleSheet) {
      onOpenGoogleSheet();
    } else {
      window.open(`https://docs.google.com/spreadsheets/d/${effectiveSheetId}/edit`, '_blank');
    }
  };

  // 3. 📝 ส่งออกเป็น Word (.doc)
  const handleExportWord = () => {
    onClose();
    exportInspectionReportWord(license, signers);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col transform transition-all">
        {/* Header */}
        <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="text-indigo-600">🖨️</span> พิมพ์รายงานการตรวจ
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-xl cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-center">
          <p className="text-sm text-slate-600 font-medium mb-4">
            เลือกรุปแบบไฟล์ที่ต้องการส่งออกสำหรับร้าน: <br />
            <span className="font-bold text-indigo-700 text-base">{license.businessName}</span>
          </p>

          <div className="flex flex-col gap-3">
            {/* 1. พิมพ์เป็น PDF */}
            <button
              type="button"
              onClick={handlePrintPdf}
              className="w-full bg-indigo-600 text-white hover:bg-indigo-700 font-bold px-4 py-3 rounded-xl text-sm cursor-pointer shadow-sm transition-all flex items-center justify-center gap-2"
            >
              📄 พิมพ์เป็น PDF
            </button>

            {/* 2. เปิดใน Google Sheet */}
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
              className="w-full bg-blue-600 text-white hover:bg-blue-700 font-bold px-4 py-3 rounded-xl text-sm cursor-pointer shadow-sm transition-all flex items-center justify-center gap-2 mt-2"
            >
              📝 ส่งออกเป็น Word
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
