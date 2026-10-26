import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  Download,
  FileText,
  Truck,
  ExternalLink,
  Settings,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  User,
  MapPin,
} from 'lucide-react';
import { PublicPetition, SignerSettings, DEFAULT_SIGNER_SETTINGS } from '../types/index.ts';
import {
  generatePetitionHtml,
  openPetitionPrintWindow,
  exportPetitionDocx,
  exportPetitionRegisterCsv,
  petitionFileBaseName,
} from '../services/petitionDocGenerator.ts';
import { resolveFormType } from '../data/petitionMeta.ts';

interface PrintPetitionModalProps {
  petition: PublicPetition | null;
  isOpen: boolean;
  onClose: () => void;
  savedSignerSettings?: SignerSettings;
  onUpdateSignerSettings?: (s: SignerSettings) => void;
}

export const PrintPetitionModal: React.FC<PrintPetitionModalProps> = ({
  petition,
  isOpen,
  onClose,
  savedSignerSettings,
  onUpdateSignerSettings,
}) => {
  const [zoom, setZoom] = useState<number>(100);
  const [showSignerModal, setShowSignerModal] = useState<boolean>(false);
  const [signers, setSigners] = useState<SignerSettings>(
    savedSignerSettings || DEFAULT_SIGNER_SETTINGS
  );

  const formType = petition ? resolveFormType(petition) : 'general';
  const isSewage = formType === 'sewage';

  const htmlContent = useMemo(() => {
    if (!petition) return '';
    return generatePetitionHtml(petition, signers, { toolbar: false, autoPrint: false });
  }, [petition, signers]);

  if (!isOpen || !petition) return null;

  const handlePrint = () => {
    openPetitionPrintWindow(petition, signers);
  };

  const handleExportWord = () => {
    exportPetitionDocx(petition, signers);
  };

  const handleExportCsv = () => {
    exportPetitionRegisterCsv([petition], signers);
  };

  const handleSaveSigners = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateSignerSettings) {
      onUpdateSignerSettings(signers);
    }
    setShowSignerModal(false);
  };

  return (
    <div className="fixed inset-0 z-[99999] overflow-y-auto bg-slate-900/85 backdrop-blur-xs flex justify-center items-start p-2 sm:p-4 print:p-0 print:bg-white print:static print:inset-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-4 flex flex-col print:shadow-none print:w-full print:max-w-none print:m-0 print:rounded-none overflow-hidden">
        {/* Top Control Bar */}
        <div className="sticky top-0 z-30 bg-slate-900 text-white p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 print:hidden shrink-0 border-b border-slate-800 shadow-md">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-xs ${
                isSewage
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-teal-500/20 text-teal-300 border-teal-500/30'
              }`}
            >
              {isSewage ? <Truck className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div>
              <div className="font-extrabold text-sm sm:text-base flex items-center gap-2">
                <span>
                  {isSewage
                    ? 'คำร้องขอรับบริการกำจัดสิ่งปฏิกูล (แบบฟอร์ม A4 ทางการ)'
                    : 'แบบคำร้องทั่วไป (แบบฟอร์ม A4 ทางการ)'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isSewage
                      ? 'bg-amber-600/90 text-white'
                      : 'bg-teal-600/90 text-white'
                  }`}
                >
                  TH SarabunIT๙ ตรงแม่แบบ 100%
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                <span>เลขที่/รหัส: <strong className="text-white">{petition.trackingCode || petition.form?.docNo || '-'}</strong></span>
                <span>•</span>
                <span>ผู้ยื่น: <strong className="text-white">{petition.citizenName || '-'}</strong></span>
                <span>•</span>
                <span>โทร: {petition.phone || '-'}</span>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Zoom Controls */}
            <div className="hidden md:flex items-center bg-slate-800/80 rounded-xl p-1 border border-slate-700 text-slate-300 text-xs">
              <button
                onClick={() => setZoom((z) => Math.max(60, z - 10))}
                className="p-1.5 hover:text-white hover:bg-slate-700 rounded-lg cursor-pointer transition-all"
                title="ย่อขนาด"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 text-[11px] font-mono">{zoom}%</span>
              <button
                onClick={() => setZoom((z) => Math.min(140, z + 10))}
                className="p-1.5 hover:text-white hover:bg-slate-700 rounded-lg cursor-pointer transition-all"
                title="ขยายขนาด"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoom(100)}
                className="p-1.5 hover:text-white hover:bg-slate-700 rounded-lg cursor-pointer transition-all"
                title="ขนาดดั้งเดิม 100%"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>

            {/* Signers Settings Toggle */}
            <button
              onClick={() => setShowSignerModal(!showSignerModal)}
              className="flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              title="ตั้งค่ารายชื่อผู้ลงนาม / ผู้เสนออนุมัติ"
            >
              <Settings className="w-3.5 h-3.5 text-cyan-400" />
              <span>ผู้ลงนาม</span>
            </button>

            {/* Print Official A4 */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
              title="เปิดหน้าต่างพิมพ์และเรียกคำสั่งพิมพ์ A4 ทางการทันที"
            >
              <Printer className="w-4 h-4" />
              <span>🖨️ สั่งพิมพ์ผ่านระบบ (A4)</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </button>

            {/* Word Export (.docx) */}
            <button
              onClick={handleExportWord}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer active:scale-95"
              title="ส่งออกเอกสารราชการเป็นไฟล์ Microsoft Word (.docx)"
            >
              <Download className="w-4 h-4" />
              <span>Word (.docx)</span>
            </button>

            {/* CSV Export */}
            <button
              onClick={handleExportCsv}
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 bg-teal-700 hover:bg-teal-600 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer active:scale-95"
              title="ส่งออกรายการคำร้องเป็น Excel/CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer ml-1"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Signer Settings Sub-Panel (Collapsible) */}
        {showSignerModal && (
          <div className="bg-slate-800 text-white p-4 border-b border-slate-700 animate-in slide-in-from-top duration-200">
            <form onSubmit={handleSaveSigners} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5" />
                  <span>ตั้งค่าผู้ลงนามท้ายแบบฟอร์มคำร้อง (เทศบาลตำบลบางเป้า)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSignerModal(false)}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  ปิด
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">ผู้อำนวยการกองสาธารณสุขฯ</label>
                  <input
                    type="text"
                    value={signers.directorName}
                    onChange={(e) => setSigners({ ...signers, directorName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                  />
                  <input
                    type="text"
                    value={signers.directorPos || signers.directorPosition || ''}
                    onChange={(e) =>
                      setSigners({
                        ...signers,
                        directorPos: e.target.value,
                        directorPosition: e.target.value,
                      })
                    }
                    className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg px-2.5 py-1 text-[11px] text-slate-300 mt-1"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">ปลัดเทศบาล</label>
                  <input
                    type="text"
                    value={signers.clerkName}
                    onChange={(e) => setSigners({ ...signers, clerkName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                  />
                  <input
                    type="text"
                    value={signers.clerkPos}
                    onChange={(e) => setSigners({ ...signers, clerkPos: e.target.value })}
                    className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg px-2.5 py-1 text-[11px] text-slate-300 mt-1"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">ผู้มีอำนาจลงนามอนุมัติ (นายกเทศมนตรี/ผู้แทน)</label>
                  <input
                    type="text"
                    value={signers.actingMayorName || signers.mayorName}
                    onChange={(e) =>
                      setSigners({
                        ...signers,
                        mayorName: e.target.value,
                        actingMayorName: e.target.value,
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                  />
                  <input
                    type="text"
                    value={
                      signers.actingMayorPosition
                        ? `${signers.actingMayorPosition} ${signers.actingMayorFor || ''}`
                        : signers.mayorPos
                    }
                    onChange={(e) => setSigners({ ...signers, mayorPos: e.target.value })}
                    className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg px-2.5 py-1 text-[11px] text-slate-300 mt-1"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSigners(DEFAULT_SIGNER_SETTINGS)}
                  className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs"
                >
                  คืนค่าเริ่มต้น
                </button>
                <button
                  type="submit"
                  className="px-4 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold"
                >
                  บันทึกการตั้งค่า
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Printable Paper Area (Exact A4 Preview with High Fidelity) */}
        <div className="p-3 sm:p-6 bg-slate-200/90 overflow-auto flex flex-col items-center min-h-[600px] max-h-[82vh]">
          <div
            className="transition-all duration-200 origin-top shadow-2xl bg-white rounded-xs"
            style={{
              transform: `scale(${zoom / 100})`,
              width: '210mm',
              minHeight: '297mm',
              marginBottom: zoom !== 100 ? `${(zoom - 100) * 3}px` : '16px',
            }}
          >
            <iframe
              title="A4 Petition Preview"
              srcDoc={htmlContent}
              className="w-[210mm] h-[297mm] border-0 overflow-hidden bg-white"
              style={{
                display: 'block',
                width: '210mm',
                height: '297mm',
              }}
            />
          </div>
        </div>

        {/* Bottom Status / Quick Info Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 text-slate-700 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>พร้อมพิมพ์ขนาด A4 พอร์ตเทรต หน้าเดียวจบตรงระเบียบสารบรรณ</span>
            </span>
            <span className="hidden sm:inline text-slate-400">•</span>
            <span className="hidden sm:inline text-slate-500">
              ชื่อไฟล์ที่จะดาวน์โหลด: <code className="text-slate-700 bg-slate-200/70 px-1 py-0.5 rounded text-[11px]">{petitionFileBaseName(petition)}.docx</code>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์ A4</span>
            </button>
            <button
              onClick={handleExportWord}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ดาวน์โหลด DOCX</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs cursor-pointer font-medium"
            >
              ปิด
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
