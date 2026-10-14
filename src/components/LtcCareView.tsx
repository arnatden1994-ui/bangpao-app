import React, { useState } from 'react';
import {
  Accessibility,
  Plus,
  Search,
  Calendar,
  Phone,
  MapPin,
  User,
  Heart,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  FileSpreadsheet,
} from 'lucide-react';
import { LtcPatient, UserRole } from '../types/index.ts';

interface LtcCareViewProps {
  patients: LtcPatient[];
  userRole: UserRole;
  onAddNew: () => void;
  onRecordVisit: (patient: LtcPatient) => void;
  onPrintCarePlan: (patient: LtcPatient) => void;
}

export const LtcCareView: React.FC<LtcCareViewProps> = ({
  patients,
  userRole,
  onAddNew,
  onRecordVisit,
  onPrintCarePlan,
}) => {
  const [search, setSearch] = useState('');
  const [adlFilter, setAdlFilter] = useState<string>('all');

  const filtered = patients.filter((p) => {
    const q = search.toLowerCase().trim();
    const matchSearch =
      !q ||
      p.fullName.toLowerCase().includes(q) ||
      p.hn.toLowerCase().includes(q) ||
      p.caregiverName.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q);

    const matchAdl = adlFilter === 'all' || p.adlGroup === adlFilter;
    return matchSearch && matchAdl;
  });

  const canEdit = userRole === 'admin' || userRole === 'inspector' || userRole === 'staff';

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-rose-900 via-pink-950 to-slate-900 text-white p-6 sm:p-7 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-200 text-xs font-semibold mb-2.5 border border-rose-400/20">
            <Accessibility className="w-3.5 h-3.5" />
            <span>ระบบดูแลระยะยาว (Long-Term Care: LTC)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold">
            ระบบบริหารจัดการผู้สูงอายุและผู้ป่วยภาวะพึ่งพิง (LTC)
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-rose-100/90 leading-relaxed">
            จัดทำแผนการดูแลรายบุคคล (Care Plan) ควบคุมการปฏิบัติงานของ Caregiver (CG) และ Care Manager (CM) ติดตามการเยี่ยมบ้านเชิงรุก
          </p>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อผู้ป่วย, HN, ชื่อผู้ดูแล (CG), ชุมชน..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-rose-500"
          />
        </div>

        {canEdit && (
          <button
            onClick={onAddNew}
            className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>ขึ้นทะเบียนผู้ป่วย LTC ใหม่</span>
          </button>
        )}
      </div>

      {/* ADL Filter */}
      <div className="flex flex-wrap gap-2 text-xs">
        <button
          onClick={() => setAdlFilter('all')}
          className={`px-3 py-1.5 rounded-full font-medium transition-colors ${
            adlFilter === 'all'
              ? 'bg-slate-800 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          ทั้งหมด ({patients.length})
        </button>
        <button
          onClick={() => setAdlFilter('group_4')}
          className={`px-3 py-1.5 rounded-full font-medium transition-colors ${
            adlFilter === 'group_4'
              ? 'bg-rose-600 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          🔴 กลุ่ม 4: ติดเตียงรุนแรง (ADL 0-4)
        </button>
        <button
          onClick={() => setAdlFilter('group_3')}
          className={`px-3 py-1.5 rounded-full font-medium transition-colors ${
            adlFilter === 'group_3'
              ? 'bg-orange-600 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          🟠 กลุ่ม 3: ติดเตียงปานกลาง (ADL 5-8)
        </button>
        <button
          onClick={() => setAdlFilter('group_2')}
          className={`px-3 py-1.5 rounded-full font-medium transition-colors ${
            adlFilter === 'group_2'
              ? 'bg-amber-600 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          🟡 กลุ่ม 2: ติดบ้าน (ADL 9-11)
        </button>
      </div>

      {/* Patient Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-rose-300 transition-all flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {item.hn}
                    </span>
                    <span className="text-xs text-slate-500">อายุ {item.age} ปี</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1">{item.fullName}</h3>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      item.adlGroup === 'group_4'
                        ? 'bg-rose-100 text-rose-800'
                        : item.adlGroup === 'group_3'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    ADL: {item.adlScore} / 20
                  </span>
                </div>
              </div>

              <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-1">
                <div>
                  <span className="text-slate-500">การวินิจฉัยโรค: </span>
                  <strong className="text-slate-800">{item.diagnosis}</strong>
                </div>
                <div>
                  <span className="text-slate-500">ที่อยู่: </span>
                  <span className="text-slate-700">{item.address} ต.{item.subdistrict} ({item.phone})</span>
                </div>
              </div>

              <div className="mt-3 text-xs space-y-1 text-slate-600">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>ผู้จัดการดูแล (CM): <strong>{item.careManagerName}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-500" />
                  <span>ผู้ดูแลประจำตัว (CG): <strong>{item.caregiverName}</strong></span>
                </div>
              </div>

              <div className="mt-3 p-2.5 rounded-lg bg-rose-50/50 border border-rose-100 text-xs text-rose-950">
                <strong>สรุปแผนการดูแล (Care Plan):</strong>
                <p className="mt-0.5 leading-relaxed">{item.carePlanSummary}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <div className="text-slate-400">
                เยี่ยมล่าสุด: {item.lastVisitDate} | นัดถัดไป: <strong className="text-slate-700">{item.nextVisitDate}</strong>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onPrintCarePlan(item)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                  title="พิมพ์แผนการดูแล Care Plan A4"
                >
                  <Printer className="w-4 h-4" />
                </button>

                {canEdit && (
                  <button
                    onClick={() => onRecordVisit(item)}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700 transition-colors"
                  >
                    บันทึกเยี่ยมบ้าน
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
