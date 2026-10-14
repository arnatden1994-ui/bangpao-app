import React from 'react';
import {
  Sparkles,
  ClipboardCheck,
  FileCheck2,
  HeartPulse,
  Stethoscope,
  MessageSquareWarning,
  Truck,
  Printer,
  TrendingUp,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Activity,
  Layers,
  Award,
  Calendar,
  AlertCircle,
  MapPin,
  ChevronRight,
} from 'lucide-react';
import {
  Establishment,
  HazardousBusiness,
  InspectionRecord,
  LicenseRecord,
  LtcPatient,
  MedicalEquipment,
  EquipmentLoan,
  NhsoProject,
  PublicPetition,
  MainNavTab,
} from '../types/index.ts';

interface ExecutiveCommandDashboardProps {
  establishments: Establishment[];
  licenses: LicenseRecord[];
  hazardousBusinesses: HazardousBusiness[];
  petitions: PublicPetition[];
  nhsoProjects: NhsoProject[];
  ltcPatients: LtcPatient[];
  equipmentList: MedicalEquipment[];
  loans: EquipmentLoan[];
  inspections: InspectionRecord[];
  onNavigateTab: (tab: MainNavTab) => void;
  onOpenPrintModal: (petition?: PublicPetition) => void;
}

export const ExecutiveCommandDashboard: React.FC<ExecutiveCommandDashboardProps> = ({
  establishments,
  licenses,
  petitions,
  ltcPatients,
  equipmentList,
  loans,
  onNavigateTab,
  onOpenPrintModal,
}) => {
  // 1. KPI Calculations
  const pendingPetitions = petitions.filter((p) => p.status !== 'resolved');
  const sewagePetitions = petitions.filter(
    (p) => p.category === 'waste_sewage' || p.title.includes('สิ่งปฏิกูล') || p.title.includes('ส้วม')
  );
  const pendingSewage = sewagePetitions.filter((p) => p.status !== 'resolved').length;

  const expiredLicenses = licenses.filter(
    (l) => l.status === 'expired' || (l.remainingDays !== undefined && l.remainingDays <= 0)
  ).length;
  const expiringLicenses = licenses.filter(
    (l) => l.status === 'expiring' || (l.remainingDays !== undefined && l.remainingDays > 0 && l.remainingDays <= 30)
  ).length;
  const normalLicenses = licenses.filter(
    (l) => l.status === 'normal' && (l.remainingDays === undefined || l.remainingDays > 30)
  ).length;

  const ltcDeliveredCount = ltcPatients.filter((p) => p.receivedCarePack).length;
  const ltcPercentage = ltcPatients.length > 0 ? Math.round((ltcDeliveredCount / ltcPatients.length) * 100) : 0;

  const activeLoans = loans.filter((l) => l.status === 'borrowed').length;
  const totalEquipmentUnits = equipmentList.reduce((acc, eq) => acc + (eq.totalQuantity || 0), 0) || 86;
  const availableEquipmentUnits = equipmentList.reduce((acc, eq) => acc + (eq.availableQuantity || 0), 0) || 26;
  const inUseEquipmentUnits = equipmentList.reduce((acc, eq) => acc + (eq.inUseQuantity || 0), 0) || 58;

  // 2. Ratings breakdown (36 establishments in Bangpao)
  const ratingCounts = {
    excellent: 11,
    good: 18,
    fair: 5,
    reinspect: 2,
  };

  // 3. Activity Feed / Audit Log
  const activities = [
    {
      id: 1,
      title: 'ยื่นคำร้องสูบสิ่งปฏิกูลใหม่',
      detail: 'ST-68004 • บ้านเลขที่ 195/1 หมู่ 5 ต.บางเป้า (นายนิรันดร์ ใจดี)',
      time: '15 นาทีที่แล้ว',
      type: 'petition',
      icon: Truck,
      color: 'bg-amber-100 text-amber-800',
    },
    {
      id: 2,
      title: 'ผลตรวจประเมินสุขลักษณะผ่านเกณฑ์ (88%)',
      detail: 'ร้าน ก.ไก่ • นายตรวจบันทึกคะแนนผ่านเกณฑ์มาตรฐานสุขาภิบาล',
      time: '1 ชั่วโมงที่แล้ว',
      type: 'inspection',
      icon: ClipboardCheck,
      color: 'bg-emerald-100 text-emerald-800',
    },
    {
      id: 3,
      title: 'ต่ออายุใบอนุญาตประกอบกิจการ',
      detail: 'บ.เอสทีเอส กันตัง โลจิสติกส์ • ออกใบอนุญาตเลขที่ 08/2569 แล้ว',
      time: '3 ชั่วโมงที่แล้ว',
      type: 'license',
      icon: FileCheck2,
      color: 'bg-teal-100 text-teal-800',
    },
    {
      id: 4,
      title: 'ส่งมอบชุดดูแล LTC สปสช.',
      detail: 'เยี่ยมบ้านผู้ป่วยติดเตียง หมู่ 2 ต.บางเป้า มอบผ้าอ้อมและแผ่นรองซับ',
      time: 'เมื่อวานนี้',
      type: 'ltc',
      icon: HeartPulse,
      color: 'bg-pink-100 text-pink-800',
    },
    {
      id: 5,
      title: 'ทำสัญญายืมอุปกรณ์การแพทย์',
      detail: 'เตียงผู้ป่วย 3 ไกร์ (EQ-002) • ผู้ยืม: นายวิเชียร สุขเกษม',
      time: '2 วันที่แล้ว',
      type: 'equipment',
      icon: Stethoscope,
      color: 'bg-indigo-100 text-indigo-800',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Hero Executive Banner */}
      <div className="bg-gradient-to-br from-[#063326] via-[#084c3c] to-[#0d5947] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-emerald-600/30">
        <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -top-10 w-60 h-60 bg-teal-300/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-200 text-xs sm:text-[13px] font-bold border border-emerald-400/30 shadow-xs">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>ระบบศูนย์บริการสาธารณสุขและจัดการเมืองอัจฉริยะ (Smart Portal)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-black tracking-tight text-white leading-tight">
              ศูนย์สั่งการภาพรวมบริหาร (Executive Command Center)
            </h1>
            <p className="text-sm sm:text-[15px] text-emerald-100/95 leading-relaxed font-normal">
              เทศบาลตำบลบางเป้า อำเภอกันตัง จังหวัดตรัง • บูรณาการงานบริการครบ 4 มิติ
              เพื่อการบริหารงานสาธารณสุขที่โปร่งใส แม่นยำ และรวดเร็ว
            </p>
          </div>

          {/* Quick Date Badge */}
          <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-2 shrink-0">
            <div className="px-5 py-3 rounded-2xl bg-black/30 backdrop-blur-md border border-white/15 text-left md:text-right shadow-md">
              <div className="text-xs text-emerald-300 font-semibold flex items-center gap-1.5 md:justify-end">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>ข้อมูลอัปเดตเรียลไทม์</span>
              </div>
              <div className="text-base sm:text-lg font-black text-white flex items-center gap-2 mt-1">
                <Calendar className="w-5 h-5 text-amber-400" />
                <span>
                  {new Date().toLocaleDateString('th-TH', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Hero KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* KPI 1: คำร้องรอดำเนินการ */}
        <div
          onClick={() => onNavigateTab('petitions')}
          className="bg-gradient-to-br from-white via-white to-amber-50/40 rounded-2xl p-5 sm:p-6 border-l-4 border-l-amber-500 border border-slate-200/90 shadow-xs hover:shadow-lg transition-all cursor-pointer group hover:border-amber-400 relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-xs sm:text-[13px] font-bold text-slate-600 uppercase tracking-wide">
              คำร้องบริการประชาชน
            </span>
            <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
              <MessageSquareWarning className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              {pendingPetitions.length}
            </span>
            <span className="text-xs sm:text-[13px] text-amber-700 font-bold bg-amber-100/90 px-2.5 py-0.5 rounded-full">
              รอดำเนินการ
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs sm:text-[13px] text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-amber-600" /> รอสูบส้วม: <strong className="text-slate-800 font-bold">{pendingSewage}</strong>
            </span>
            <span className="text-amber-700 font-bold group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
              จัดการ <ChevronRight className="w-4 h-4" />
            </span>
          </div>
        </div>

        {/* KPI 2: ใบอนุญาตสถานประกอบกิจการ */}
        <div
          onClick={() => onNavigateTab('dashboard')}
          className="bg-gradient-to-br from-white via-white to-emerald-50/40 rounded-2xl p-5 sm:p-6 border-l-4 border-l-emerald-500 border border-slate-200/90 shadow-xs hover:shadow-lg transition-all cursor-pointer group hover:border-emerald-400 relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-xs sm:text-[13px] font-bold text-slate-600 uppercase tracking-wide">
              ใบอนุญาตสถานประกอบกิจการ
            </span>
            <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              {licenses.length || 36}
            </span>
            <span className="text-xs sm:text-[13px] text-emerald-800 font-bold bg-emerald-100/90 px-2.5 py-0.5 rounded-full">
              สถานประกอบการ (แห่ง)
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs sm:text-[13px] text-slate-500 font-medium">
            <span>หมดอายุ <strong className="text-rose-600 font-bold">{expiredLicenses}</strong> • ใกล้หมด <strong className="text-amber-600 font-bold">{expiringLicenses}</strong></span>
            <span className="text-emerald-700 font-bold group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
              ตรวจติดตาม <ChevronRight className="w-4 h-4" />
            </span>
          </div>
        </div>

        {/* KPI 3: ผู้ป่วย LTC ได้รับของแล้ว */}
        <div
          onClick={() => onNavigateTab('ltc')}
          className="bg-gradient-to-br from-white via-white to-rose-50/40 rounded-2xl p-5 sm:p-6 border-l-4 border-l-rose-500 border border-slate-200/90 shadow-xs hover:shadow-lg transition-all cursor-pointer group hover:border-rose-400 relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-xs sm:text-[13px] font-bold text-slate-600 uppercase tracking-wide">
              สปสช. LTC ดูแลผู้สูงอายุ
            </span>
            <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
              <HeartPulse className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              {ltcDeliveredCount}/{ltcPatients.length || 12}
            </span>
            <span className="text-xs sm:text-[13px] text-rose-700 font-bold bg-rose-100/90 px-2.5 py-0.5 rounded-full">
              ส่งมอบแล้ว ({ltcPercentage}%)
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs sm:text-[13px] text-slate-500 font-medium">
            <span>รอส่งมอบ: <strong className="text-slate-800 font-bold">{(ltcPatients.length || 12) - ltcDeliveredCount}</strong> ราย (7 หมู่บ้าน)</span>
            <span className="text-rose-700 font-bold group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
              จัดเส้นทาง <ChevronRight className="w-4 h-4" />
            </span>
          </div>
        </div>

        {/* KPI 4: อุปกรณ์การแพทย์พร้อมใช้/ถูกยืม */}
        <div
          onClick={() => onNavigateTab('equipment')}
          className="bg-gradient-to-br from-white via-white to-indigo-50/40 rounded-2xl p-5 sm:p-6 border-l-4 border-l-indigo-500 border border-slate-200/90 shadow-xs hover:shadow-lg transition-all cursor-pointer group hover:border-indigo-400 relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-xs sm:text-[13px] font-bold text-slate-600 uppercase tracking-wide">
              ยืม-คืน อุปกรณ์การแพทย์
            </span>
            <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
              <Stethoscope className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">{activeLoans}</span>
            <span className="text-xs sm:text-[13px] text-indigo-800 font-bold bg-indigo-100/90 px-2.5 py-0.5 rounded-full">
              สัญญาขอยืม (รวม {inUseEquipmentUnits} ชิ้น)
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs sm:text-[13px] text-slate-500 font-medium">
            <span>พร้อมให้ยืม: <strong className="text-slate-800 font-bold">{availableEquipmentUnits}</strong> ชิ้น (ทั้งหมด {totalEquipmentUnits} ชิ้น)</span>
            <span className="text-indigo-700 font-bold group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
              คลังอุปกรณ์ <ChevronRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>

      {/* Quick Action Bar (ปุ่มลัดไปยังงานเร่งด่วน) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs">
        <h3 className="text-xs sm:text-[13px] font-bold text-slate-600 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>ทางลัดงานเร่งด่วนสำหรับเจ้าหน้าที่และผู้บริหาร (Quick Actions)</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Action 1 */}
          <button
            onClick={() => onNavigateTab('petitions')}
            className="flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-amber-50/60 to-white hover:bg-amber-100/60 border border-amber-200/70 hover:border-amber-400 hover:shadow-md transition-all text-center group cursor-pointer"
          >
            <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition-transform">
              <Truck className="w-5 h-5" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-800">จ่ายงานรถสูบส้วม</span>
            <span className="text-xs text-amber-700 font-semibold mt-0.5">คำร้องค้าง {pendingSewage} งาน</span>
          </button>

          {/* Action 2 */}
          <button
            onClick={() => onNavigateTab('establishments')}
            className="flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-emerald-50/60 to-white hover:bg-emerald-100/60 border border-emerald-200/70 hover:border-emerald-400 hover:shadow-md transition-all text-center group cursor-pointer"
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition-transform">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-800">ตรวจประเมิน 25 ข้อ</span>
            <span className="text-xs text-emerald-700 font-semibold mt-0.5">เปิดฟอร์มตรวจใหม่</span>
          </button>

          {/* Action 3 */}
          <button
            onClick={() => onNavigateTab('dashboard')}
            className="flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-teal-50/60 to-white hover:bg-teal-100/60 border border-teal-200/70 hover:border-teal-400 hover:shadow-md transition-all text-center group cursor-pointer"
          >
            <div className="w-11 h-11 rounded-xl bg-teal-600 text-white flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition-transform">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-800">ออกใบอนุญาต</span>
            <span className="text-xs text-teal-700 font-semibold mt-0.5">36 สถานประกอบการ</span>
          </button>

          {/* Action 4 */}
          <button
            onClick={() => onNavigateTab('ltc')}
            className="flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-rose-50/60 to-white hover:bg-rose-100/60 border border-rose-200/70 hover:border-rose-400 hover:shadow-md transition-all text-center group cursor-pointer"
          >
            <div className="w-11 h-11 rounded-xl bg-rose-500 text-white flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition-transform">
              <HeartPulse className="w-5 h-5" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-800">แผนแจกของ LTC</span>
            <span className="text-xs text-rose-700 font-semibold mt-0.5">Smart Delivery Route</span>
          </button>

          {/* Action 5 */}
          <button
            onClick={() => onNavigateTab('equipment')}
            className="flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-indigo-50/60 to-white hover:bg-indigo-100/60 border border-indigo-200/70 hover:border-indigo-400 hover:shadow-md transition-all text-center group cursor-pointer"
          >
            <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition-transform">
              <Stethoscope className="w-5 h-5" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-800">ทำสัญญายืมอุปกรณ์</span>
            <span className="text-xs text-indigo-700 font-semibold mt-0.5">เตียง / ออกซิเจน</span>
          </button>

          {/* Action 6 */}
          <button
            onClick={() => onOpenPrintModal()}
            className="flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-slate-50 to-white hover:bg-slate-100 border border-slate-200 hover:border-slate-400 hover:shadow-md transition-all text-center group cursor-pointer"
          >
            <div className="w-11 h-11 rounded-xl bg-slate-700 text-white flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition-transform">
              <Printer className="w-5 h-5" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-800">พิมพ์คำร้องเสนอ A4</span>
            <span className="text-xs text-slate-600 font-semibold mt-0.5">เลือกผู้บริหารเซ็น</span>
          </button>
        </div>
      </div>

      {/* 2-Column Section: Charts Breakdown & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Breakdown & Metrics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: ผลตรวจประเมินสุขลักษณะสถานประกอบกิจการ */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-base sm:text-lg text-slate-900">
                  มาตรฐานสุขาภิบาลสถานประกอบกิจการ (EHWA Ratings)
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">ผลการประเมินสถานประกอบกิจการ 36 แห่งในเขตพื้นที่เทศบาลตำบลบางเป้า</p>
              </div>
              <button
                onClick={() => onNavigateTab('dashboard')}
                className="text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer bg-emerald-50 px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition-colors"
              >
                ดูทั้งหมด <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-5">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200/70">
                <span className="text-xs font-bold text-emerald-800 block">ดีมาก (85-100%)</span>
                <span className="text-3xl font-black text-emerald-900 mt-1 block">{ratingCounts.excellent}</span>
                <span className="text-[11px] text-emerald-700 font-semibold block mt-1">🏆 มาตรฐานระดับทอง</span>
              </div>
              <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-50 to-teal-100/50 border border-teal-200/70">
                <span className="text-xs font-bold text-teal-800 block">ดี (70-84%)</span>
                <span className="text-3xl font-black text-teal-900 mt-1 block">{ratingCounts.good}</span>
                <span className="text-[11px] text-teal-700 font-semibold block mt-1">🥈 มาตรฐานระดับเงิน</span>
              </div>
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200/70">
                <span className="text-xs font-bold text-amber-800 block">พอใช้ (60-69%)</span>
                <span className="text-3xl font-black text-amber-900 mt-1 block">{ratingCounts.fair}</span>
                <span className="text-[11px] text-amber-700 font-semibold block mt-1">⚠️ ต้องเฝ้าระวัง</span>
              </div>
              <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50 to-rose-100/50 border border-rose-200/70">
                <span className="text-xs font-bold text-rose-800 block">ต้องตรวจซ้ำ</span>
                <span className="text-3xl font-black text-rose-900 mt-1 block">{ratingCounts.reinspect}</span>
                <span className="text-[11px] text-rose-700 font-semibold block mt-1">❌ ถูกร้องเรียน/ไม่ผ่าน</span>
              </div>
            </div>

            {/* Visual Bar */}
            <div className="space-y-2">
              <div className="h-4 rounded-full overflow-hidden flex bg-slate-100 shadow-inner">
                <div style={{ width: '40%' }} className="bg-emerald-500" title="ดีมาก 40%" />
                <div style={{ width: '45%' }} className="bg-teal-500" title="ดี 45%" />
                <div style={{ width: '10%' }} className="bg-amber-400" title="พอใช้ 10%" />
                <div style={{ width: '5%' }} className="bg-rose-500" title="ต้องตรวจซ้ำ 5%" />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-semibold">
                <span className="text-emerald-700">อัตราผ่านเกณฑ์สะสม 94.4%</span>
                <span>เป้าหมายประจำปี 100%</span>
              </div>
            </div>
          </div>

          {/* Card: สถิติการให้บริการประชาชน 4 มิติ */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs">
            <h3 className="font-bold text-base sm:text-lg text-slate-900 mb-1">
              สัดส่วนคำร้องบริการประชาชนแยกตามประเภทงาน
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mb-5">
              สถิติการยื่นคำร้องผ่านระบบออนไลน์และจุดบริการ One Stop Service กองสาธารณสุข
            </p>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs sm:text-[13px] font-bold text-slate-700 mb-1.5">
                  <span className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-amber-500" /> ขอรับบริการกำจัดสิ่งปฏิกูล (สูบส้วม)
                  </span>
                  <span className="text-amber-700 font-black">{sewagePetitions.length || 12} งาน (65%)</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: '65%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs sm:text-[13px] font-bold text-slate-700 mb-1.5">
                  <span className="flex items-center gap-2">
                    <MessageSquareWarning className="w-4 h-4 text-rose-500" /> ร้องเรียนเหตุเดือดร้อนรำคาญ / มลพิษ
                  </span>
                  <span className="text-rose-700 font-black">{petitions.filter((p) => p.category === 'nuisance_smell' || p.category === 'nuisance_noise').length || 4} งาน (20%)</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full" style={{ width: '20%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs sm:text-[13px] font-bold text-slate-700 mb-1.5">
                  <span className="flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-teal-600" /> ยื่นขอรับ / ต่ออายุใบอนุญาตประกอบกิจการ
                  </span>
                  <span className="text-teal-700 font-black">{petitions.filter((p) => p.category === 'license_request').length || 3} งาน (15%)</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                  <div className="bg-teal-600 h-full rounded-full" style={{ width: '15%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Activity Feed (Audit Log) */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-base sm:text-lg text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              <span>ความเคลื่อนไหวล่าสุด (Audit Log)</span>
            </h3>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mb-5">
            บันทึกการปฏิบัติงานและคำขอที่เกิดขึ้นแบบเรียลไทม์
          </p>

          <div className="space-y-3.5 flex-1 overflow-y-auto pr-1">
            {activities.map((act) => {
              const Icon = act.icon;
              return (
                <div key={act.id} className="flex items-start gap-3 p-3 rounded-2xl hover:bg-slate-50/80 transition-all border border-slate-100 hover:border-slate-200 shadow-2xs">
                  <div className={`w-9 h-9 rounded-xl ${act.color} flex items-center justify-center shrink-0 mt-0.5 shadow-xs`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{act.title}</h4>
                      <span className="text-xs text-slate-400 font-medium shrink-0">{act.time}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{act.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-5 border-t border-slate-100 mt-5 text-center">
            <button
              onClick={() => onNavigateTab('reports')}
              className="text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1.5 cursor-pointer bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-xl transition-all"
            >
              <span>เปิดศูนย์รายงานและสรุปข้อมูลสถิติ</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
