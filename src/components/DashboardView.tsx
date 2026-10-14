import React from 'react';
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  Award,
  TrendingUp,
  Clock,
  ArrowRight,
  ClipboardCheck,
  Printer,
  ChevronRight,
  Sparkles,
  AlertOctagon,
  MessageSquareWarning,
  HeartPulse,
  Accessibility,
  Stethoscope,
  Users,
} from 'lucide-react';
import {
  Establishment,
  HazardousBusiness,
  InspectionRecord,
  LtcPatient,
  MedicalEquipment,
  EquipmentLoan,
  NhsoProject,
  PublicPetition,
  MainNavTab,
} from '../types/index.ts';
import { ESTABLISHMENT_TYPE_LABELS } from '../data/criteria.ts';

interface DashboardViewProps {
  establishments: Establishment[];
  hazardousBusinesses: HazardousBusiness[];
  petitions: PublicPetition[];
  nhsoProjects: NhsoProject[];
  ltcPatients: LtcPatient[];
  equipmentList: MedicalEquipment[];
  loans: EquipmentLoan[];
  inspections: InspectionRecord[];
  onStartInspect: (establishment: Establishment) => void;
  onViewCertificate: (establishment: Establishment) => void;
  onViewReport: (establishment: Establishment) => void;
  onNavigateTab: (tab: MainNavTab, filterStatus?: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  establishments,
  hazardousBusinesses,
  petitions,
  nhsoProjects,
  ltcPatients,
  equipmentList,
  loans,
  inspections,
  onStartInspect,
  onViewCertificate,
  onViewReport,
  onNavigateTab,
}) => {
  const total = establishments.length;
  const passed = establishments.filter((e) => e.status === 'passed').length;
  const excellent = establishments.filter((e) => e.latestRating === 'excellent').length;
  const good = establishments.filter((e) => e.latestRating === 'good').length;
  const fair = establishments.filter((e) => e.latestRating === 'fair').length;
  const needsReinspection = establishments.filter((e) => e.status === 'needs_reinspection').length;
  const inspectedTotal = establishments.filter((e) => e.latestScore > 0).length;
  const passRate = inspectedTotal > 0 ? Math.round((passed / inspectedTotal) * 100) : 0;

  // Hazardous businesses
  const hazardousTotal = hazardousBusinesses.length;
  const hazardousHighRisk = hazardousBusinesses.filter((h) => h.riskLevel === 'high').length;
  const hazardousExpired = hazardousBusinesses.filter((h) => h.licenseStatus === 'expired').length;

  // Petitions
  const totalPetitions = petitions.length;
  const resolvedPetitions = petitions.filter((p) => p.status === 'resolved').length;
  const pendingPetitions = petitions.filter((p) => p.status !== 'resolved').length;

  // NHSO Fund
  const totalNhsoBudget = nhsoProjects.reduce((acc, p) => acc + p.budgetApproved, 0);

  // LTC
  const bedriddenPatients = ltcPatients.filter((p) => p.adlGroup === 'group_4' || p.adlGroup === 'group_3').length;

  // Equipment Loans
  const activeLoansCount = loans.filter((l) => l.status === 'borrowed').length;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 text-xs font-semibold mb-3 border border-emerald-400/20">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>ระบบบูรณาการงานบริการกองสาธารณสุขและสิ่งแวดล้อม</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            ศูนย์ข้อมูลและแดชบอร์ดติดตามงานสาธารณสุข
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
            ติดตามสถานการณ์สุขลักษณะสถานประกอบการ, กิจการที่เป็นอันตรายต่อสุขภาพ, เรื่องร้องเรียนเหตุรำคาญ, โครงการกองทุน สปสช., ผู้ป่วยติดเตียง LTC และบริการยืมกายอุปกรณ์การแพทย์
          </p>
        </div>
      </div>

      {/* 6 Key Pillar Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* 1. Hygiene */}
        <div
          onClick={() => onNavigateTab('establishments')}
          className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold text-emerald-700">{passRate}% ผ่าน</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">{total}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">สถานประกอบการ</div>
        </div>

        {/* 2. Hazardous */}
        <div
          onClick={() => onNavigateTab('hazardous')}
          className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <AlertOctagon className="w-4 h-4" />
            </div>
            {hazardousExpired > 0 ? (
              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                หมดอายุ {hazardousExpired}
              </span>
            ) : (
              <span className="text-[10px] text-slate-400">ปกติ</span>
            )}
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">{hazardousTotal}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">กิจการอันตราย อภ.2</div>
        </div>

        {/* 3. Petitions */}
        <div
          onClick={() => onNavigateTab('petitions')}
          className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-cyan-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center">
              <MessageSquareWarning className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
              ค้าง {pendingPetitions}
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">{totalPetitions}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">คำร้อง & เหตุรำคาญ</div>
        </div>

        {/* 4. NHSO Fund */}
        <div
          onClick={() => onNavigateTab('nhso')}
          className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <HeartPulse className="w-4 h-4" />
            </div>
            <span className="text-[10px] text-blue-700 font-semibold">{nhsoProjects.length} โครงการ</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">
            ฿{(totalNhsoBudget / 1000).toFixed(0)}k
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">งบกองทุน สปสช.</div>
        </div>

        {/* 5. LTC */}
        <div
          onClick={() => onNavigateTab('ltc')}
          className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-rose-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <Accessibility className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
              ติดเตียง {bedriddenPatients}
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">{ltcPatients.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">ผู้ป่วย LTC ในแผน</div>
        </div>

        {/* 6. Medical Equipment */}
        <div
          onClick={() => onNavigateTab('equipment')}
          className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-teal-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <Stethoscope className="w-4 h-4" />
            </div>
            <span className="text-[10px] text-teal-700 font-semibold">{activeLoansCount} ยืมอยู่</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">
            {equipmentList.reduce((acc, eq) => acc + eq.totalQuantity, 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">กายอุปกรณ์การแพทย์</div>
        </div>
      </div>

      {/* Middle Section: Urgent Actions & Quick Access */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rating Breakdown */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-1">ผลตรวจสุขลักษณะสถานประกอบการ</h2>
            <p className="text-xs text-slate-500 mb-4">เกณฑ์มาตรฐานกรมอนามัย Clean Food Good Taste</p>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-emerald-700">🥇 ระดับดีเยี่ยม (90-100)</span>
                  <span className="font-semibold text-slate-800">{excellent} แห่ง</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${total ? (excellent / total) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-blue-700">🥈 ระดับดี (80-89)</span>
                  <span className="font-semibold text-slate-800">{good} แห่ง</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${total ? (good / total) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-amber-700">🥉 ผ่านเกณฑ์พื้นฐาน (70-79)</span>
                  <span className="font-semibold text-slate-800">{fair} แห่ง</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${total ? (fair / total) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-rose-700">⚠️ ต้องปรับปรุง (&lt; 70)</span>
                  <span className="font-semibold text-slate-800">{needsReinspection} แห่ง</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full"
                    style={{ width: `${total ? (needsReinspection / total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={() => onNavigateTab('establishments')}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center gap-1"
            >
              ดูรายละเอียดสุขลักษณะทั้งหมด <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Hazardous Businesses High-Risk Watchlist */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-amber-600" />
                <span>กิจการอันตรายที่ต้องเฝ้าระวัง</span>
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                {hazardousHighRisk} แห่ง
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3">กิจการกลุ่มเสี่ยงสูงที่ต้องตรวจมลพิษเป็นประจำ</p>

            <div className="space-y-2.5">
              {hazardousBusinesses.slice(0, 3).map((hz) => (
                <div key={hz.id} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 truncate">{hz.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-rose-100 text-rose-800 shrink-0">
                      เสี่ยงสูง
                    </span>
                  </div>
                  <div className="text-slate-500 text-[11px] mt-0.5 truncate">{hz.notes}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={() => onNavigateTab('hazardous')}
              className="text-xs text-amber-800 hover:text-amber-900 font-semibold inline-flex items-center gap-1"
            >
              จัดการกิจการอันตรายทั้งหมด <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Petitions & Complaints Quick Stream */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MessageSquareWarning className="w-4 h-4 text-teal-600" />
                <span>คำร้องเหตุรำคาญล่าสุด</span>
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800">
                รอแก้ {pendingPetitions}
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3">เรื่องร้องเรียนจากประชาชนในพื้นที่</p>

            <div className="space-y-2.5">
              {petitions.slice(0, 3).map((pt) => (
                <div key={pt.id} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 truncate">{pt.title}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-cyan-100 text-cyan-800 shrink-0">
                      {pt.status === 'resolved' ? 'เสร็จสิ้น' : 'รอตรวจสอบ'}
                    </span>
                  </div>
                  <div className="text-slate-500 text-[11px] mt-0.5">ผู้ยื่น: {pt.citizenName} ({pt.submissionDate})</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={() => onNavigateTab('petitions')}
              className="text-xs text-teal-700 hover:text-teal-800 font-semibold inline-flex items-center gap-1"
            >
              ตรวจสอบเรื่องร้องเรียนทั้งหมด <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
