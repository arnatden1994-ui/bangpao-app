import React, { useState } from 'react';
import {
  History,
  Search,
  Printer,
  Award,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  User,
  Building2,
  ClipboardList,
  Eye,
} from 'lucide-react';
import { Establishment, InspectionRecord } from '../types/index.ts';
import { ESTABLISHMENT_TYPE_LABELS } from '../data/criteria.ts';

interface InspectionHistoryViewProps {
  inspections: InspectionRecord[];
  establishments: Establishment[];
  onViewReport: (establishment: Establishment, record: InspectionRecord) => void;
  onViewCertificate: (establishment: Establishment) => void;
  onStartInspect: (establishment: Establishment) => void;
}

export const InspectionHistoryView: React.FC<InspectionHistoryViewProps> = ({
  inspections,
  establishments,
  onViewReport,
  onViewCertificate,
  onStartInspect,
}) => {
  const [search, setSearch] = useState('');

  const filtered = inspections.filter((ins) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      ins.establishmentName.toLowerCase().includes(q) ||
      ins.establishmentCode.toLowerCase().includes(q) ||
      ins.inspectorName.toLowerCase().includes(q) ||
      (ins.recommendations && ins.recommendations.toLowerCase().includes(q))
    );
  });

  const getEstById = (id: string) => establishments.find((e) => e.id === id);

  return (
    <div className="space-y-5">
      {/* Header and Search */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-600" />
            <span>ประวัติการตรวจประเมินสุขลักษณะ & ข้อสั่งการ</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            บันทึกการลงพื้นที่ตรวจสอบสุขาภิบาลและผลการประเมินย้อนหลังทั้งหมด
          </p>
        </div>

        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อร้าน, รหัส, ผู้ตรวจ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* History Items List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200 shadow-xs">
          <ClipboardList className="w-12 h-12 mx-auto text-slate-300 mb-2" />
          <h3 className="text-sm font-bold text-slate-700">ยังไม่มีประวัติการตรวจที่ตรงกับคำค้นหา</h3>
          <p className="text-xs text-slate-400 mt-1">
            คุณสามารถเริ่มตรวจสถานประกอบการได้จากเมนู &quot;ทะเบียนสถานประกอบการ&quot;
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => {
            const est = getEstById(item.establishmentId);
            const isPassed = item.status === 'passed';

            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {item.establishmentCode || item.establishmentId}
                    </span>
                    <h3 className="text-base font-bold text-slate-900">{item.establishmentName}</h3>
                    <span className="text-xs text-slate-500">
                      ({ESTABLISHMENT_TYPE_LABELS[item.establishmentType] || item.establishmentType})
                    </span>

                    {/* Badge */}
                    {isPassed ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5" /> ผ่านเกณฑ์ ({item.totalScore} คะแนน)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                        <AlertTriangle className="w-3.5 h-3.5" /> ต้องปรับปรุง/ตรวจซ้ำ (
                        {item.totalScore} คะแนน)
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs text-slate-600 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>วันที่ตรวจ: {item.inspectionDate}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        ผู้ตรวจ: {item.inspectorName} ({item.inspectorPosition || 'เจ้าพนักงาน'})
                      </span>
                    </div>
                    {item.reinspectionDueDate && (
                      <div className="flex items-center gap-1.5 text-amber-700 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>นัดตรวจซ้ำ: {item.reinspectionDueDate}</span>
                      </div>
                    )}
                  </div>

                  {/* Defects / Recommendations preview */}
                  {item.defectsSummary && item.defectsSummary.length > 0 && (
                    <div className="mt-2 p-2.5 rounded-lg bg-amber-50/60 border border-amber-200/60 text-xs text-amber-900">
                      <strong className="text-amber-950 font-semibold">ข้อบกพร่องที่ตรวจพบ:</strong>
                      <ul className="list-disc pl-4 mt-1 space-y-0.5">
                        {item.defectsSummary.map((def, idx) => (
                          <li key={idx}>{def}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {item.recommendations && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <strong>ข้อสั่งการ/คำแนะนำ:</strong> {item.recommendations}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center md:flex-col justify-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <button
                    onClick={() => est && onViewReport(est, item)}
                    disabled={!est}
                    className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    <span>พิมพ์รายงาน A4</span>
                  </button>

                  {isPassed && est && (
                    <button
                      onClick={() => onViewCertificate(est)}
                      className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors"
                    >
                      <Award className="w-3.5 h-3.5 text-amber-600" />
                      <span>ใบรับรอง</span>
                    </button>
                  )}

                  {!isPassed && est && (
                    <button
                      onClick={() => onStartInspect(est)}
                      className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                    >
                      <span>ตรวจประเมินซ้ำ</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
