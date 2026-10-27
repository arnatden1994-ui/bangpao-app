import React from 'react';
import { X, Printer, Award, ShieldCheck, QrCode } from 'lucide-react';
import { Establishment } from '../types/index.ts';
import { ESTABLISHMENT_TYPE_LABELS } from '../data/criteria.ts';

interface PrintCertificateModalProps {
  establishment: Establishment | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PrintCertificateModal: React.FC<PrintCertificateModalProps> = ({
  establishment,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !establishment) return null;

  const handlePrint = () => {
    window.print();
  };

  const isGold = establishment.latestRating === 'excellent';
  const issueDateFormatted = establishment.latestInspectionDate || new Date().toISOString().slice(0, 10);
  const expiryDateFormatted = establishment.certificateExpiryDate || establishment.nextInspectionDate;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:inset-auto">
      {/* Container */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col print:shadow-none print:w-full print:max-w-none">
        {/* Top Control Bar (Hidden on print) */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-sm sm:text-base">
              พิมพ์ใบรับรองมาตรฐานสุขลักษณะสถานประกอบการ
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs sm:text-sm font-semibold shadow-xs transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์ใบรับรอง (Print A4)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Certificate Page (A4 Landscape aspect) */}
        <div className="p-4 sm:p-8 bg-slate-100 flex items-center justify-center overflow-x-auto print:p-0 print:bg-white">
          <div className="w-[840px] h-[595px] bg-[#fdfbf7] p-8 relative rounded-lg shadow-lg border-[10px] border-double border-[#b38f4d] flex flex-col justify-between print:shadow-none print:border-[#b38f4d] print:w-full print:h-[100vh] print:rounded-none">
            {/* Corner Decorative Ornaments */}
            <div className="absolute top-2 left-2 w-10 h-10 border-t-2 border-l-2 border-[#b38f4d]" />
            <div className="absolute top-2 right-2 w-10 h-10 border-t-2 border-r-2 border-[#b38f4d]" />
            <div className="absolute bottom-2 left-2 w-10 h-10 border-b-2 border-l-2 border-[#b38f4d]" />
            <div className="absolute bottom-2 right-2 w-10 h-10 border-b-2 border-r-2 border-[#b38f4d]" />

            {/* Inner Border */}
            <div className="absolute inset-3 border border-[#d4af37]/40 pointer-events-none" />

            {/* Certificate Header */}
            <div className="text-center relative z-10 pt-2">
              <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-gradient-to-tr from-[#b38f4d] via-[#d4af37] to-[#f3e5ab] text-slate-900 flex items-center justify-center shadow-md">
                <ShieldCheck className="w-10 h-10 text-slate-900" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-wide text-[#73571d] font-serif">
                ใบรับรองมาตรฐานสุขลักษณะสถานประกอบการ
              </h2>
              <div className="text-xs uppercase tracking-widest text-[#947634] font-medium mt-0.5">
                CERTIFICATE OF FOOD HYGIENE & SANITATION STANDARDS
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                กลุ่มงานสุขาภิบาลสิ่งแวดล้อมและอาชีวอนามัย • กรมอนามัย
              </div>
            </div>

            {/* Certificate Body */}
            <div className="text-center my-auto space-y-3 relative z-10">
              <div className="text-xs sm:text-sm text-slate-600 font-serif">
                หนังสือฉบับนี้ให้ไว้เพื่อแสดงว่า
              </div>

              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif text-[#1e293b] tracking-normal">
                {establishment.name}
              </div>

              <div className="text-xs text-slate-600 max-w-lg mx-auto">
                ประเภท: <strong className="text-slate-800">{ESTABLISHMENT_TYPE_LABELS[establishment.type]}</strong>
                <br />
                ผู้ดำเนินกิจการ: <strong className="text-slate-800">{establishment.ownerName}</strong>
                <br />
                ที่ตั้ง: {establishment.address} แขวง/ตำบล {establishment.subdistrict} เขต/อำเภอ{' '}
                {establishment.district} {establishment.province}
              </div>

              <div className="py-2.5">
                <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full border-2 border-[#b38f4d] bg-amber-50/50">
                  <Award className="w-5 h-5 text-[#b38f4d]" />
                  <span className="text-sm font-bold text-[#73571d]">
                    ผ่านเกณฑ์มาตรฐานระดับ {isGold ? 'ดีเยี่ยม (Gold Standard)' : 'ดี (Silver Standard)'}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#b38f4d] text-white">
                    {establishment.latestScore} คะแนน
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-500 leading-relaxed max-w-xl mx-auto">
                ได้ผ่านการตรวจประเมินตามเกณฑ์มาตรฐานสุขลักษณะและสุขาภิบาลสถานประกอบการ 5 หมวด 20 ข้อ
                มีความสะอาด ปลอดภัย และถูกสุขอนามัยตามเกณฑ์ที่กฎหมายกำหนด
              </div>
            </div>

            {/* Certificate Footer / Signatures */}
            <div className="relative z-10 pt-4 border-t border-[#d4af37]/30 flex items-end justify-between text-xs text-slate-700">
              {/* Left: Certificate Meta & QR */}
              <div className="space-y-1 text-left">
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 bg-white border border-slate-300 p-1 rounded flex items-center justify-center">
                    <QrCode className="w-10 h-10 text-slate-700" />
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    <div>เลขที่: {establishment.certificateNo || 'HYG-BKK-69-00123'}</div>
                    <div>วันที่ออก: {issueDateFormatted}</div>
                    <div>ใช้ได้ถึง: {expiryDateFormatted || '1 ปีนับจากวันออก'}</div>
                  </div>
                </div>
              </div>

              {/* Center Stamp */}
              <div className="text-center">
                <div className="w-20 h-20 rounded-full border-2 border-red-700/60 text-red-700/80 flex flex-col items-center justify-center rotate-[-12deg] p-1 font-serif text-[9px] font-bold mx-auto">
                  <ShieldCheck className="w-5 h-5 mb-0.5" />
                  <span>รับรองมาตรฐาน</span>
                  <span>สุขลักษณะ</span>
                </div>
              </div>

              {/* Right Signature */}
              <div className="text-center space-y-1 w-56">
                <div className="font-serif italic text-base text-slate-800 border-b border-slate-400 pb-1 w-44 mx-auto">
                  {establishment.inspectorName ? establishment.inspectorName.split(' ')[0] : 'อานัส เด็นหมาด'}
                </div>
                <div className="text-[11px] font-bold text-slate-800">
                  ( {establishment.inspectorName || 'พันจ่าเอกอานัส เด็นหมาด'} )
                </div>
                <div className="text-[10px] text-slate-500">
                  นายตรวจ / เจ้าพนักงานสาธารณสุขชำนาญงาน
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
