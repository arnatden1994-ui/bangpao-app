import React from 'react';
import { X, FileText, FileSpreadsheet, FileDown, ShieldCheck } from 'lucide-react';
import { LicenseRecord, SignerSettings, DEFAULT_SIGNER_SETTINGS } from '../types/index.ts';
import { DEFAULT_GAS_URL } from '../services/sheetsSync.ts';
import {
  generateLicenseHtml,
  printHtmlInNewWindow,
  exportHtmlAsWord,
} from '../services/officialDocGenerator.ts';

interface PrintLicenseOptionsModalProps {
  license: LicenseRecord | null;
  isOpen: boolean;
  onClose: () => void;
  signerSettings?: SignerSettings;
  gasUrl?: string;
  onOpenGoogleSheet: () => void;
  onEditBeforePrint?: () => void;
}

export const PrintLicenseOptionsModal: React.FC<PrintLicenseOptionsModalProps> = ({
  license,
  isOpen,
  onClose,
  signerSettings,
  gasUrl,
  onOpenGoogleSheet,
  onEditBeforePrint,
}) => {
  if (!isOpen || !license) return null;

  const signers = signerSettings || DEFAULT_SIGNER_SETTINGS;
  const effectiveGasUrl = gasUrl || DEFAULT_GAS_URL;

  const handlePrintGas = () => {
    onClose();
    const url = `${effectiveGasUrl}?view=license&shopName=${encodeURIComponent(license.businessName)}`;
    window.open(url, '_blank');
  };

  const handlePrintLocal = () => {
    onClose();
    const html = generateLicenseHtml(license, signers);
    printHtmlInNewWindow(html);
  };

  const handleExportWord = () => {
    onClose();
    const html = generateLicenseHtml(license, signers);
    exportHtmlAsWord(html, `ใบอนุญาต_${license.businessName.replace(/\s+/g, '_')}`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>ออกใบอนุญาต / พิมพ์ใบอนุญาต อภ.2</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 text-center space-y-4">
          <p className="text-xs text-slate-600">
            เลือกรูปแบบการพิมพ์/ส่งออกใบอนุญาต (แบบ 2 หน้า ตราครุฑ):
            <br />
            <strong className="text-base text-emerald-800 font-bold mt-1 inline-block">
              {license.businessName}
            </strong>
            <br />
            <span className="text-[11px] text-slate-500">เลขทะเบียน: {license.licenseNumber}</span>
          </p>

          <div className="space-y-2.5 pt-2">
            {/* Button 1: Live Apps Script */}
            <button
              onClick={handlePrintGas}
              className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-700/20 transition-all active:scale-98 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>📄 พิมพ์ PDF ผ่าน Google Apps Script (ต้นฉบับ)</span>
            </button>

            {/* Button 2: Direct Local Print */}
            <button
              onClick={handlePrintLocal}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98 cursor-pointer"
            >
              <span>🖨️ พิมพ์ทันทีในเครื่อง (ตราครุฑ 2 หน้า A4)</span>
            </button>

            {/* Button 3: Google Sheet */}
            <button
              onClick={() => {
                onClose();
                onOpenGoogleSheet();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-teal-500/20 transition-all active:scale-98 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>📊 เปิดใน Google Sheet</span>
            </button>

            {/* Button 4: Word */}
            <button
              onClick={handleExportWord}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all active:scale-98 cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              <span>📝 ส่งออกเป็น Word (.doc)</span>
            </button>

            {/* Optional Button 5: Edit before printing */}
            {onEditBeforePrint && (
              <button
                onClick={() => {
                  onClose();
                  onEditBeforePrint();
                }}
                className="w-full py-2 px-4 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-amber-200"
              >
                <span>✏️ แก้ไขข้อมูลใบอนุญาตก่อนพิมพ์</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
