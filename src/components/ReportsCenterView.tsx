import React, { useState } from 'react';
import {
  FileText,
  Printer,
  Award,
  Search,
  CheckCircle,
  FileCheck,
  Building2,
  Calendar,
} from 'lucide-react';
import { Establishment, InspectionRecord } from '../types/index.ts';
import { ESTABLISHMENT_TYPE_LABELS } from '../data/criteria.ts';

interface ReportsCenterViewProps {
  establishments: Establishment[];
  inspections: InspectionRecord[];
  onViewCertificate: (establishment: Establishment) => void;
  onViewReport: (establishment: Establishment) => void;
}

export const ReportsCenterView: React.FC<ReportsCenterViewProps> = ({
  establishments,
  inspections,
  onViewCertificate,
  onViewReport,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'certificate' | 'inspection_report'>('all');
  const [search, setSearch] = useState('');

  const passedEstablishments = establishments.filter((e) => e.status === 'passed');
  const inspectedEstablishments = establishments.filter((e) => e.latestScore > 0);

  const displayList =
    filterType === 'certificate'
      ? passedEstablishments
      : filterType === 'inspection_report'
      ? inspectedEstablishments
      : establishments;

  const filtered = displayList.filter((e) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      e.name.toLowerCase().includes(q) ||
      (e.code && e.code.toLowerCase().includes(q)) ||
      (e.certificateNo && e.certificateNo.toLowerCase().includes(q)) ||
      e.subdistrict.toLowerCase().includes(q)
    );
  });

  const handlePrintBatchSummary = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-600" />
            <span>ศูนย์พิมพ์เอกสารและรายงานมาตรฐานสุขลักษณะ</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            พิมพ์ใบรับรองมาตรฐานทอง/เงิน (Certificate A4) และแบบรายงานผลการตรวจราชการ
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintBatchSummary}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-900 text-white transition-colors shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์รายงานสรุปผลภาพรวม A4</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filterType === 'all'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ทั้งหมด ({establishments.length})
          </button>
          <button
            onClick={() => setFilterType('certificate')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 ${
              filterType === 'certificate'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>พร้อมออกใบรับรอง ({passedEstablishments.length})</span>
          </button>
          <button
            onClick={() => setFilterType('inspection_report')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 ${
              filterType === 'inspection_report'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>แบบรายงานการตรวจ ({inspectedEstablishments.length})</span>
          </button>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อร้าน, เลขที่ใบรับรอง..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Grid of Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-mono text-slate-400">{item.code || item.id}</span>
                  <h3 className="text-sm font-bold text-slate-900 mt-0.5 line-clamp-1">
                    {item.name}
                  </h3>
                </div>
                {item.status === 'passed' ? (
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                    {item.latestScore} คะแนน
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 shrink-0">
                    {item.latestScore ? `${item.latestScore} คะแนน` : 'ยังไม่ตรวจ'}
                  </span>
                )}
              </div>

              <div className="mt-3 space-y-1 text-xs text-slate-500">
                <div>
                  ประเภท: <strong>{ESTABLISHMENT_TYPE_LABELS[item.type] || item.type}</strong>
                </div>
                <div>
                  เจ้าของ: <strong>{item.ownerName}</strong>
                </div>
                {item.certificateNo && (
                  <div className="text-amber-800 font-mono text-[11px]">
                    เลขที่ใบรับรอง: {item.certificateNo}
                  </div>
                )}
                {item.latestInspectionDate && (
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Calendar className="w-3 h-3" />
                    <span>ตรวจเมื่อ: {item.latestInspectionDate}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
              {item.status === 'passed' && (
                <button
                  onClick={() => onViewCertificate(item)}
                  className="flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors flex items-center justify-center gap-1 shadow-xs"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>พิมพ์ใบรับรอง</span>
                </button>
              )}

              <button
                onClick={() => onViewReport(item)}
                className={`py-1.5 px-3 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 ${
                  item.status === 'passed'
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    : 'flex-1 bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>พิมพ์รายงาน A4</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
