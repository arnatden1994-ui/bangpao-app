import React from 'react';
import { X, Printer, FileText, CheckCircle2, AlertTriangle, Shield, Building } from 'lucide-react';
import { Establishment, InspectionRecord, CriteriaCategory } from '../types/index.ts';
import { INSPECTION_CRITERIA, ESTABLISHMENT_TYPE_LABELS, CATEGORY_LABELS } from '../data/criteria.ts';

interface PrintInspectionReportModalProps {
  establishment: Establishment | null;
  inspectionRecord?: InspectionRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PrintInspectionReportModal: React.FC<PrintInspectionReportModalProps> = ({
  establishment,
  inspectionRecord,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !establishment) return null;

  const handlePrint = () => {
    window.print();
  };

  const score = inspectionRecord ? inspectionRecord.totalScore : establishment.latestScore || 0;
  const rating = inspectionRecord ? inspectionRecord.rating : establishment.latestRating;
  const inspectionDate = inspectionRecord
    ? inspectionRecord.inspectionDate
    : establishment.latestInspectionDate || new Date().toISOString().slice(0, 10);
  const inspector = inspectionRecord
    ? inspectionRecord.inspectorName
    : establishment.inspectorName || 'เจ้าพนักงานสาธารณสุข';
  const recommendations = inspectionRecord
    ? inspectionRecord.recommendations
    : establishment.notes || 'รักษาสภาพความสะอาดและสุขอนามัยอย่างต่อเนื่อง';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:inset-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col print:shadow-none print:w-full print:max-w-none">
        {/* Top bar (Hidden on print) */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm sm:text-base">
              แบบรายงานผลการตรวจประเมินสุขลักษณะสถานประกอบการ (พิมพ์ A4)
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs sm:text-sm font-semibold shadow-xs transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์รายงาน (Print Report)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Document Body (A4 Portrait) */}
        <div className="p-4 sm:p-8 bg-slate-100 flex items-center justify-center overflow-x-auto print:p-0 print:bg-white">
          <div className="w-[800px] min-h-[1100px] bg-white p-10 relative shadow-lg text-slate-800 text-xs sm:text-sm font-sans flex flex-col justify-between print:shadow-none print:w-full print:p-6 print:border-0">
            {/* Header */}
            <div>
              <div className="text-center border-b-2 border-slate-900 pb-4 mb-4">
                <div className="w-12 h-12 mx-auto mb-1 text-slate-800 flex items-center justify-center">
                  <Shield className="w-9 h-9" />
                </div>
                <h1 className="text-base sm:text-lg font-bold text-slate-900">
                  แบบรายงานผลการตรวจประเมินสุขลักษณะและสุขาภิบาลสถานประกอบการ
                </h1>
                <p className="text-xs text-slate-600 mt-0.5">
                  ตามพระราชบัญญัติการสาธารณสุขและมาตรฐานสุขาภิบาลอาหาร กรมอนามัย
                </p>
                <div className="flex justify-between items-center text-[11px] text-slate-500 mt-2">
                  <span>เลขที่แบบรายงาน: REP-{establishment.code || establishment.id}</span>
                  <span>วันที่ตรวจประเมิน: {inspectionDate}</span>
                </div>
              </div>

              {/* Part 1: Establishment Info */}
              <div className="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="font-bold text-slate-900 text-xs mb-2 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-700" />
                  <span>ส่วนที่ 1: ข้อมูลทั่วไปของสถานประกอบการ</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div>
                    <span className="text-slate-500">ชื่อสถานประกอบการ:</span>{' '}
                    <strong className="text-slate-900">{establishment.name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">รหัสทะเบียน:</span>{' '}
                    <span className="font-mono text-slate-800">{establishment.code || establishment.id}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">ประเภทกิจการ:</span>{' '}
                    <span className="text-slate-800">{ESTABLISHMENT_TYPE_LABELS[establishment.type]}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">ผู้ขอรับการประเมิน / ผู้ดำเนินกิจการ:</span>{' '}
                    <span className="text-slate-800">{establishment.ownerName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">เบอร์โทรศัพท์:</span>{' '}
                    <span className="text-slate-800">{establishment.phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">สถานที่ตั้ง:</span>{' '}
                    <span className="text-slate-800">
                      {establishment.address} ต.{establishment.subdistrict} อ.{establishment.district} จ.
                      {establishment.province}
                    </span>
                  </div>
                </div>
              </div>

              {/* Part 2: Criteria Evaluation Table */}
              <div className="mb-4">
                <div className="font-bold text-slate-900 text-xs mb-2">
                  ส่วนที่ 2: สรุปผลการประเมินตามเกณฑ์มาตรฐาน 5 หมวด (เต็ม 100 คะแนน)
                </div>
                <table className="w-full border-collapse border border-slate-300 text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-semibold text-center">
                      <th className="border border-slate-300 p-1.5 text-left w-10">ลำดับ</th>
                      <th className="border border-slate-300 p-1.5 text-left">หมวดการประเมินสุขลักษณะ</th>
                      <th className="border border-slate-300 p-1.5 w-20">คะแนนเต็ม</th>
                      <th className="border border-slate-300 p-1.5 w-20">คะแนนที่ได้</th>
                      <th className="border border-slate-300 p-1.5 w-28">ผลการประเมิน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Object.entries(CATEGORY_LABELS) as [CriteriaCategory, (typeof CATEGORY_LABELS)[CriteriaCategory]][]).map(([catKey, val], index) => {
                      const catScores = inspectionRecord?.categoryScores?.[catKey];
                      const max = catScores ? catScores.max : catKey === 'environment' ? 25 : catKey === 'waste_and_pest' ? 15 : 20;
                      // Fallback proportional score if record not detailed
                      const itemScore = catScores
                        ? catScores.score
                        : Math.round((score / 100) * max);

                      const isCatPass = itemScore >= max * 0.7;

                      return (
                        <tr key={catKey} className="hover:bg-slate-50">
                          <td className="border border-slate-300 p-1.5 text-center font-bold">
                            {index + 1}
                          </td>
                          <td className="border border-slate-300 p-1.5">
                            <span className="font-semibold text-slate-800">{val.title}</span>
                          </td>
                          <td className="border border-slate-300 p-1.5 text-center">{max}</td>
                          <td className="border border-slate-300 p-1.5 text-center font-bold text-slate-900">
                            {itemScore}
                          </td>
                          <td className="border border-slate-300 p-1.5 text-center">
                            {isCatPass ? (
                              <span className="text-emerald-700 font-semibold">✓ ผ่านเกณฑ์</span>
                            ) : (
                              <span className="text-rose-600 font-semibold">✗ ต้องปรับปรุง</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Summary row */}
                    <tr className="bg-slate-100 font-bold">
                      <td colSpan={2} className="border border-slate-300 p-2 text-right">
                        รวมคะแนนทั้งสิ้น:
                      </td>
                      <td className="border border-slate-300 p-2 text-center">100</td>
                      <td className="border border-slate-300 p-2 text-center text-sm font-extrabold text-emerald-800">
                        {score}
                      </td>
                      <td className="border border-slate-300 p-2 text-center">
                        {score >= 70 ? (
                          <span className="text-emerald-700">ผ่านเกณฑ์</span>
                        ) : (
                          <span className="text-rose-600">ไม่ผ่านเกณฑ์</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Part 3: Official Assessment & Corrective Actions */}
              <div className="mb-4 border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                <div className="font-bold text-slate-900 text-xs mb-1.5">
                  ส่วนที่ 3: สรุปผลการประเมินและข้อสั่งการ
                </div>
                <div className="space-y-1.5 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">ระดับผลการประเมิน:</span>
                    {rating === 'excellent' && (
                      <strong className="text-emerald-700">ระดับดีเยี่ยม (90 - 100 คะแนน)</strong>
                    )}
                    {rating === 'good' && <strong className="text-blue-700">ระดับดี (80 - 89 คะแนน)</strong>}
                    {rating === 'fair' && (
                      <strong className="text-amber-700">ระดับผ่านเกณฑ์พื้นฐาน (70 - 79 คะแนน)</strong>
                    )}
                    {rating === 'poor' && (
                      <strong className="text-rose-700">
                        ไม่ผ่านเกณฑ์ / ต้องปรับปรุงแก้ไข (&lt; 70 คะแนน)
                      </strong>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-500">ข้อสั่งการ / ข้อเสนอแนะของเจ้าหน้าที่:</span>
                    <p className="mt-1 p-2 bg-white rounded border border-slate-200 text-slate-800">
                      {recommendations}
                    </p>
                  </div>

                  {establishment.status === 'needs_reinspection' && (
                    <div className="text-amber-800 font-semibold flex items-center gap-1.5 pt-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>
                        กำหนดนัดตรวจประเมินซ้ำภายในวันที่:{' '}
                        {establishment.nextInspectionDate || 'ภายใน 15-30 วัน'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Part 4: Signatures */}
            <div className="pt-6 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-xs">
              <div className="space-y-1">
                <p className="text-slate-600 mb-6">ลงชื่อ.......................................................ผู้รับการตรวจ</p>
                <p className="font-bold text-slate-800">( {establishment.ownerName} )</p>
                <p className="text-[11px] text-slate-500">เจ้าของ / ผู้จัดการสถานประกอบการ</p>
                <p className="text-[11px] text-slate-500">วันที่ {inspectionDate}</p>
              </div>

              <div className="space-y-1">
                <p className="text-slate-600 mb-6">ลงชื่อ.......................................................ผู้ตรวจประเมิน</p>
                <p className="font-bold text-slate-800">( {inspector} )</p>
                <p className="text-[11px] text-slate-500">
                  {inspectionRecord?.inspectorPosition || 'นักวิชาการสาธารณสุขชำนาญการ'}
                </p>
                <p className="text-[11px] text-slate-500">วันที่ {inspectionDate}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
