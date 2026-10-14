import React, { useState } from 'react';
import {
  MessageSquareWarning,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Phone,
  MapPin,
  Calendar,
  User,
  ArrowRight,
  Filter,
  Printer,
  Truck,
  FileText,
  FileCheck,
  Check,
} from 'lucide-react';
import { PetitionCategory, PublicPetition, UserRole } from '../types/index.ts';

interface PublicPetitionsViewProps {
  petitions: PublicPetition[];
  userRole: UserRole;
  onAddNew: () => void;
  onUpdateStatus: (id: string, status: PublicPetition['status'], notes?: string) => void;
  onPrintPetition?: (petition: PublicPetition) => void;
  onAddSewagePetition?: (petition: PublicPetition) => void;
  activeSubTab?: 'general' | 'sewage' | 'print' | 'tracking';
  onSubTabChange?: (tab: 'general' | 'sewage' | 'print' | 'tracking') => void;
}

export const PETITION_CATEGORY_LABELS: Record<PetitionCategory, string> = {
  nuisance_smell: 'กลิ่นเหม็น / มลพิษทางอากาศ / เผาขยะ',
  nuisance_noise: 'เสียงดังรบกวน / สถานบันเทิง / ก่อสร้าง',
  waste_sewage: 'น้ำเสีย / สิ่งปฏิกูล / ขยะมูลฝอยล้นทะลัก',
  license_request: 'ยื่นคำขอรับ / ขอต่ออายุใบอนุญาตประกอบกิจการ',
  fogging_spray: 'ขอรับบริการพ่นสารเคมีหมอกควันกำจัดยุงลาย',
  rabies_vaccine: 'ขอรับบริการฉีดวัคซีนป้องกันพิษสุนัขบ้า',
  stray_animals: 'จัดการปัญหาสุนัขและแมวจรจัดในชุมชน',
  other: 'คำร้องทั่วไปด้านสาธารณสุขและสิ่งแวดล้อม',
};

export const PublicPetitionsView: React.FC<PublicPetitionsViewProps> = ({
  petitions,
  userRole,
  onAddNew,
  onUpdateStatus,
  onPrintPetition,
  onAddSewagePetition,
  activeSubTab: controlledSubTab,
  onSubTabChange,
}) => {
  // 4 Sub-tabs requested by user:
  // 1) คำร้องทั่วไป & เหตุรำคาญ
  // 2) คำร้องขอดูดส้วม (บริการสิ่งปฏิกูล)
  // 3) หน้าปริ้นแบบฟอร์มเสนอผู้บริหาร
  // 4) หน้าติดตามผล
  const [internalSubTab, setInternalSubTab] = useState<'general' | 'sewage' | 'print' | 'tracking'>('general');
  const subTab = controlledSubTab || internalSubTab;
  const setSubTab = (t: 'general' | 'sewage' | 'print' | 'tracking') => {
    if (onSubTabChange) onSubTabChange(t);
    else setInternalSubTab(t);
  };

  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [trackingQuery, setTrackingQuery] = useState('');

  // Form State for Sewage / Septic Suction Request
  const [sewageForm, setSewageForm] = useState({
    citizenName: '',
    phone: '',
    addressNo: '',
    moo: '1',
    zone: 'in_district', // 'in_district' | 'out_10' | 'out_20' | 'out_30'
    tankType: 'บ่อเกรอะ/บ่อซึมในบ้านพักอาศัย',
    estimatedVolume: '1 เที่ยวรถสูบ (ประมาณ 3-4 ลบ.ม.)',
    preferredDate: new Date().toISOString().slice(0, 10),
    driverName: 'นายชนะ สุขด้วง (พนักงานขับรถบรรทุกสิ่งปฏิกูล)',
    notes: 'ส้วมเต็ม ราดน้ำไม่ลง ขอรับบริการด่วน',
  });

  const [sewageSuccessMsg, setSewageSuccessMsg] = useState('');

  // Calculate Fee for Sewage based on Bangpao Tambon By-Law
  const getSewageFee = (zone: string) => {
    switch (zone) {
      case 'in_district':
        return 250;
      case 'out_10':
        return 700;
      case 'out_20':
        return 1000;
      case 'out_30':
        return 1300;
      default:
        return 250;
    }
  };

  const handleSewageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sewageForm.citizenName || !sewageForm.phone) {
      alert('กรุณากรอกชื่อผู้ยื่นคำร้องและเบอร์โทรศัพท์');
      return;
    }

    const fee = getSewageFee(sewageForm.zone);
    const trackingNo = `REQ-69-SW${Math.floor(100 + Math.random() * 900)}`;

    const newSewagePetition: PublicPetition = {
      id: `PET-${Date.now().toString().slice(-4)}`,
      trackingCode: trackingNo,
      title: `คำร้องขอรับบริการกำจัดสิ่งปฏิกูล (ดูดส้วม) - ม.${sewageForm.moo}`,
      category: 'waste_sewage',
      citizenName: sewageForm.citizenName,
      phone: sewageForm.phone,
      address: `บ้านเลขที่ ${sewageForm.addressNo} หมู่ที่ ${sewageForm.moo} ต.บางเป้า อ.กันตัง จ.ตรัง`,
      description: `${sewageForm.tankType} ${sewageForm.estimatedVolume} ค่าธรรมเนียม ${fee} บาท (นัดหมาย ${sewageForm.preferredDate}) หมายเหตุ: ${sewageForm.notes}`,
      status: 'assigned',
      assignedOfficer: sewageForm.driverName,
      submissionDate: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (onAddSewagePetition) {
      onAddSewagePetition(newSewagePetition);
    }

    setSewageSuccessMsg(`✅ บันทึกคำร้องขอดูดส้วมสำเร็จ! รหัสติดตาม [${trackingNo}] อัตราค่าบริการ ${fee} บาท`);
    setTimeout(() => setSewageSuccessMsg(''), 5000);
    setSubTab('sewage');
  };

  const generalPetitions = petitions.filter((p) => p.category !== 'waste_sewage');
  const sewagePetitions = petitions.filter((p) => p.category === 'waste_sewage');

  const pendingPetitions = petitions.filter((p) => p.status === 'pending' || p.status === 'submitted' || p.status === 'accepted');
  const inProgressPetitions = petitions.filter((p) => p.status === 'investigating' || p.status === 'assigned');
  const resolvedPetitions = petitions.filter((p) => p.status === 'resolved');

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-cyan-950 to-slate-900 text-white p-6 sm:p-7 rounded-3xl shadow-lg relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-5 border border-teal-700/40">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-200 text-xs sm:text-[13px] font-bold mb-2 border border-cyan-400/30">
            <MessageSquareWarning className="w-4 h-4 text-cyan-300" />
            <span>ศูนย์บริการเบ็ดเสร็จ (One Stop Service) กองสาธารณสุขและสิ่งแวดล้อม</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight">
            📋 ระบบยื่นคำร้องและบริการประชาชน (ทต.บางเป้า)
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-cyan-100/95 leading-relaxed font-normal">
            รับเรื่องร้องเรียนเหตุรำคาญ, บริการสูบสิ่งปฏิกูล (ดูดส้วม), พิมพ์บันทึกข้อความเสนอผู้บริหาร และติดตามผลแบบเรียลไทม์
          </p>
        </div>

        {/* 4 Main Sub-Navigation Pills */}
        <div className="flex items-center bg-cyan-950/80 p-1.5 rounded-2xl border border-cyan-700/50 shrink-0 overflow-x-auto no-scrollbar shadow-inner">
          <button
            onClick={() => setSubTab('general')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all whitespace-nowrap cursor-pointer ${
              subTab === 'general' ? 'bg-teal-600 text-white shadow-md' : 'text-cyan-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <MessageSquareWarning className="w-4 h-4" />
            <span>คำร้องทั่วไป ({generalPetitions.length})</span>
          </button>

          <button
            onClick={() => setSubTab('sewage')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all whitespace-nowrap cursor-pointer ${
              subTab === 'sewage' ? 'bg-teal-600 text-white shadow-md' : 'text-cyan-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>คำร้องขอดูดส้วม ({sewagePetitions.length})</span>
          </button>

          <button
            onClick={() => setSubTab('print')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all whitespace-nowrap cursor-pointer ${
              subTab === 'print' ? 'bg-teal-600 text-white shadow-md' : 'text-cyan-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์เสนอผู้บริหาร</span>
          </button>

          <button
            onClick={() => setSubTab('tracking')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all whitespace-nowrap cursor-pointer ${
              subTab === 'tracking' ? 'bg-teal-600 text-white shadow-md' : 'text-cyan-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>หน้าติดตามผล</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="text-xs sm:text-[13px] font-bold text-slate-500">คำร้องทั้งหมด</div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{petitions.length} เรื่อง</div>
          <div className="text-xs text-slate-400 mt-1">ปีงบประมาณ 2569</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-amber-200 bg-amber-50/40 shadow-xs">
          <div className="text-xs sm:text-[13px] font-bold text-amber-700">รอดำเนินการ</div>
          <div className="text-2xl sm:text-3xl font-black text-amber-800 mt-1">{pendingPetitions.length} เรื่อง</div>
          <div className="text-xs text-amber-600 mt-1">รอส่งนายตรวจลงพื้นที่</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-blue-200 bg-blue-50/30 shadow-xs">
          <div className="text-[11px] font-bold text-blue-700">กำลังตรวจสอบ/แก้ไข</div>
          <div className="text-xl font-extrabold text-blue-700 mt-1">{inProgressPetitions.length} เรื่อง</div>
          <div className="text-[10px] text-blue-600 mt-0.5">เจ้าหน้าที่เข้าปฏิบัติการ</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-700">แก้ไขแล้วเสร็จ</div>
          <div className="text-xl font-extrabold text-emerald-700 mt-1">{resolvedPetitions.length} เรื่อง</div>
          <div className="text-[10px] text-emerald-600 mt-0.5">รายงานผลเรียบร้อย</div>
        </div>
      </div>

      {/* SUB-VIEW 1: คำร้องทั่วไป & เหตุรำคาญ */}
      {subTab === 'general' && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาเลขที่คำร้อง (REQ-...), หัวข้อเรื่อง, ผู้ยื่น, หรือที่อยู่..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 font-semibold text-slate-700"
              >
                <option value="all">สถานะทั้งหมด</option>
                <option value="pending">รอดำเนินการ</option>
                <option value="investigating">กำลังตรวจสอบ</option>
                <option value="assigned">มอบหมายแล้ว</option>
                <option value="resolved">เสร็จสิ้น</option>
              </select>

              <button
                onClick={onAddNew}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-teal-700 hover:bg-teal-800 text-white transition-all shadow-xs shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ ยื่นคำร้องทั่วไป</span>
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {generalPetitions
              .filter((p) => {
                const q = search.toLowerCase();
                const matchSearch =
                  !q ||
                  p.trackingCode.toLowerCase().includes(q) ||
                  p.title.toLowerCase().includes(q) ||
                  p.citizenName.toLowerCase().includes(q) ||
                  p.address.toLowerCase().includes(q);
                const matchStatus =
                  selectedStatus === 'all' ||
                  (selectedStatus === 'pending'
                    ? p.status === 'pending' || p.status === 'submitted' || p.status === 'accepted'
                    : p.status === selectedStatus);
                return matchSearch && matchStatus;
              })
              .map((p) => {
                const isPending = p.status === 'pending' || p.status === 'submitted' || p.status === 'accepted';
                return (
                <div key={p.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 p-2 rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        {p.trackingCode}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">{p.title}</h4>
                      <span className="text-[10px] text-slate-400">({PETITION_CATEGORY_LABELS[p.category] || p.category})</span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-1">{p.description}</p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                      <span>👤 {p.citizenName} ({p.phone})</span>
                      <span>📍 {p.address}</span>
                      <span>⏱️ วันที่ยื่น: {p.submissionDate}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        isPending
                          ? 'bg-amber-100 text-amber-800'
                          : p.status === 'investigating'
                          ? 'bg-blue-100 text-blue-800'
                          : p.status === 'resolved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {isPending
                        ? '⏳ รอดำเนินการ'
                        : p.status === 'investigating'
                        ? '🔍 กำลังตรวจสอบ'
                        : p.status === 'resolved'
                        ? '✅ เสร็จสิ้น'
                        : '📋 มอบหมายแล้ว'}
                    </span>

                    {onPrintPetition && (
                      <button
                        onClick={() => onPrintPetition(p)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-bold cursor-pointer"
                        title="พิมพ์บันทึกข้อความสรุปเสนอผู้บริหาร A4"
                      >
                        🖨️ พิมพ์ A4
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: คำร้องขอดูดส้วม / สูบสิ่งปฏิกูล */}
      {subTab === 'sewage' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Form: Sewage Suction Request */}
          <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-800">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  🚛 แบบฟอร์มคำร้องขอรับบริการกำจัดสิ่งปฏิกูล (สูบส้วม)
                </h3>
                <p className="text-[11px] text-slate-500">
                  อ้างอิงระเบียบเทศบาลตำบลบางเป้า อ.กันตัง จ.ตรัง • คำนวณค่าธรรมเนียมและมอบหมายรถสูบสิ่งปฏิกูล
                </p>
              </div>
            </div>

            {sewageSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold">
                {sewageSuccessMsg}
              </div>
            )}

            <form onSubmit={handleSewageSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ชื่อ-สกุล ผู้ยื่นคำร้อง *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น นายบุญส่ง ทองคำ"
                    value={sewageForm.citizenName}
                    onChange={(e) => setSewageForm({ ...sewageForm, citizenName: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">เบอร์โทรศัพท์ติดต่อ *</label>
                  <input
                    type="text"
                    required
                    placeholder="081-xxxxxxx"
                    value={sewageForm.phone}
                    onChange={(e) => setSewageForm({ ...sewageForm, phone: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">บ้านเลขที่ / ซอย / ถนน</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น 45/2 ซอยท่าส้ม"
                    value={sewageForm.addressNo}
                    onChange={(e) => setSewageForm({ ...sewageForm, addressNo: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">หมู่ที่ (ต.บางเป้า)</label>
                  <select
                    value={sewageForm.moo}
                    onChange={(e) => setSewageForm({ ...sewageForm, moo: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500 font-bold"
                  >
                    <option value="1">หมู่ 1 บ้านท่าส้ม</option>
                    <option value="2">หมู่ 2 บ้านทุ่งค่าย</option>
                    <option value="3">หมู่ 3 บ้านบางเป้า</option>
                    <option value="4">หมู่ 4 บ้านคลองลุ</option>
                    <option value="5">หมู่ 5 บ้านไร่ออก</option>
                    <option value="6">หมู่ 6 บ้านในลุ่ม</option>
                    <option value="7">หมู่ 7 บ้านเกาะเคี่ยม</option>
                  </select>
                </div>
              </div>

              {/* อัตราค่าบริการตามเทศบัญญัติ */}
              <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl space-y-2">
                <label className="block font-bold text-teal-950">
                  พิกัดพื้นที่ให้บริการ (อัตราค่าธรรมเนียมตามเทศบัญญัติ ทต.บางเป้า)
                </label>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                    <input
                      type="radio"
                      name="zone"
                      checked={sewageForm.zone === 'in_district'}
                      onChange={() => setSewageForm({ ...sewageForm, zone: 'in_district' })}
                      className="text-teal-600"
                    />
                    <span>ในเขตเทศบาลตำบลบางเป้า: <strong>250 บาท / คัน / เที่ยว</strong></span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                    <input
                      type="radio"
                      name="zone"
                      checked={sewageForm.zone === 'out_10'}
                      onChange={() => setSewageForm({ ...sewageForm, zone: 'out_10' })}
                      className="text-teal-600"
                    />
                    <span>นอกเขตเทศบาล ระยะทางไม่เกิน 10 กิโลเมตร: <strong>700 บาท</strong></span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                    <input
                      type="radio"
                      name="zone"
                      checked={sewageForm.zone === 'out_20'}
                      onChange={() => setSewageForm({ ...sewageForm, zone: 'out_20' })}
                      className="text-teal-600"
                    />
                    <span>นอกเขตเทศบาล ระยะทางไม่เกิน 20 กิโลเมตร: <strong>1,000 บาท</strong></span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                    <input
                      type="radio"
                      name="zone"
                      checked={sewageForm.zone === 'out_30'}
                      onChange={() => setSewageForm({ ...sewageForm, zone: 'out_30' })}
                      className="text-teal-600"
                    />
                    <span>นอกเขตเทศบาล ระยะทางไม่เกิน 30 กิโลเมตร: <strong>1,300 บาท</strong></span>
                  </label>
                </div>

                <div className="mt-2 pt-2 border-t border-teal-200/80 flex items-center justify-between font-extrabold text-teal-900">
                  <span>ยอดค่าธรรมเนียมที่ต้องชำระ:</span>
                  <span className="text-base text-emerald-700">{getSewageFee(sewageForm.zone)} บาท</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">วันที่ต้องการรับบริการ</label>
                  <input
                    type="date"
                    value={sewageForm.preferredDate}
                    onChange={(e) => setSewageForm({ ...sewageForm, preferredDate: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">พนักงานขับรถสูบสิ่งปฏิกูล</label>
                  <input
                    type="text"
                    disabled
                    value={sewageForm.driverName}
                    className="w-full p-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-600 font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                ✓ ส่งคำร้องขอดูดส้วม และออกเลขรับ
              </button>
            </form>
          </div>

          {/* Right: Sewage Petitions History */}
          <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Truck className="w-4 h-4 text-teal-700" />
              <span>ประวัติคำร้องขอดูดส้วม / สูบสิ่งปฏิกูล ({sewagePetitions.length} รายการ)</span>
            </h3>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {sewagePetitions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  ยังไม่มีคำร้องขอดูดส้วมในระบบ
                </div>
              ) : (
                sewagePetitions.map((p) => (
                  <div key={p.id} className="p-3 border border-slate-200 rounded-xl hover:border-teal-300 bg-slate-50/40 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded">
                          {p.trackingCode}
                        </span>
                        <span className="font-bold text-slate-900">{p.citizenName}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                        {p.status === 'resolved' ? '✅ ให้บริการแล้ว' : '🚛 มอบหมายรถแล้ว'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{p.address}</span>
                    </div>

                    <div className="text-[11px] text-slate-500">{p.description}</div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">ผู้รับผิดชอบ: <strong>{p.assignedOfficer}</strong></span>
                      {onPrintPetition && (
                        <button
                          onClick={() => onPrintPetition(p)}
                          className="px-2 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold rounded cursor-pointer"
                        >
                          🖨️ พิมพ์ใบเสร็จ/คำร้อง A4
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: หน้าปริ้นแบบฟอร์มเสนอผู้บริหาร */}
      {subTab === 'print' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Printer className="w-4 h-4 text-teal-700" />
                <span>หน้าพิมพ์แบบฟอร์มสรุปคำร้องเสนอผู้บริหาร (A4 ราชการ ตราครุฑ)</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                เอกสารบันทึกข้อความสรุปผลการตรวจสอบของเจ้าพนักงานสาธารณสุข เสนอ ผอ.กอง → ปลัดเทศบาล → นายกเทศมนตรี
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">เลขที่คำร้อง</th>
                  <th className="p-3">หัวข้อเรื่องที่เสนอ</th>
                  <th className="p-3">ผู้ยื่นคำร้อง</th>
                  <th className="p-3">สถานะ</th>
                  <th className="p-3 text-center">ตัวอย่างเอกสารและพิมพ์</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {petitions.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-teal-800">{p.trackingCode}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{p.title}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{p.description}</div>
                    </td>
                    <td className="p-3">
                      <div className="text-slate-800 font-medium">{p.citizenName}</div>
                      <div className="text-[11px] text-slate-400">{p.address}</div>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => onPrintPetition && onPrintPetition(p)}
                        className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>พิมพ์บันทึกข้อความ A4</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: หน้าติดตามผล */}
      {subTab === 'tracking' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-5">
          <div className="max-w-xl mx-auto text-center space-y-2">
            <h3 className="text-base font-extrabold text-slate-900">
              🔍 ระบบติดตามสถานะคำร้องประชาชนแบบเรียลไทม์
            </h3>
            <p className="text-xs text-slate-500">
              กรอกรหัสติดตามคำร้อง (เช่น REQ-69-0012) เพื่อตรวจสอบขั้นตอนการปฏิบัติงานของเจ้าหน้าที่
            </p>

            <div className="flex items-center gap-2 mt-3">
              <input
                type="text"
                placeholder="กรอกรหัสติดตาม เช่น REQ-69-0012"
                value={trackingQuery}
                onChange={(e) => setTrackingQuery(e.target.value)}
                className="flex-1 p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono focus:ring-1 focus:ring-teal-500"
              />
              <button
                onClick={() => {}}
                className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer"
              >
                ค้นหา
              </button>
            </div>
          </div>

          {/* Timeline Display for All or Filtered Petitions */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            {petitions
              .filter((p) => !trackingQuery || p.trackingCode.toLowerCase().includes(trackingQuery.toLowerCase()))
              .map((p) => (
                <div key={p.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-sm text-teal-800">
                        {p.trackingCode}
                      </span>
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">{p.title}</span>
                    </div>
                    <span className="text-[11px] text-slate-500">ยื่นเมื่อ: {p.submissionDate}</span>
                  </div>

                  {/* 4-Step Progress Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <div className="font-bold text-emerald-950 text-[11px]">1. รับเรื่องในระบบ</div>
                        <div className="text-[10px] text-emerald-700">{p.submissionDate}</div>
                      </div>
                    </div>

                    <div className={`p-2.5 rounded-lg border flex items-center gap-2 ${
                      p.status !== 'pending' ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-100 border-slate-200 opacity-60'
                    }`}>
                      <CheckCircle2 className={`w-4 h-4 shrink-0 ${p.status !== 'pending' ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <div>
                        <div className="font-bold text-slate-800 text-[11px]">2. ส่งต่อเจ้าพนักงาน</div>
                        <div className="text-[10px] text-slate-500">{p.assignedOfficer || 'กองสาธารณสุข'}</div>
                      </div>
                    </div>

                    <div className={`p-2.5 rounded-lg border flex items-center gap-2 ${
                      p.status === 'investigating' || p.status === 'resolved' ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-100 border-slate-200 opacity-60'
                    }`}>
                      <Clock className={`w-4 h-4 shrink-0 ${p.status === 'investigating' || p.status === 'resolved' ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <div>
                        <div className="font-bold text-slate-800 text-[11px]">3. ตรวจสอบ/แก้ไข</div>
                        <div className="text-[10px] text-slate-500">{p.status === 'resolved' ? 'ดำเนินการแล้ว' : 'กำลังดำเนินการ'}</div>
                      </div>
                    </div>

                    <div className={`p-2.5 rounded-lg border flex items-center gap-2 ${
                      p.status === 'resolved' ? 'bg-emerald-100 border-emerald-300' : 'bg-slate-100 border-slate-200 opacity-60'
                    }`}>
                      <Check className={`w-4 h-4 shrink-0 ${p.status === 'resolved' ? 'text-emerald-700' : 'text-slate-400'}`} />
                      <div>
                        <div className="font-bold text-slate-800 text-[11px]">4. ยุติเรื่อง/รายงาน</div>
                        <div className="text-[10px] text-slate-500">{p.resolvedDate || 'รอผลการปฏิบัติ'}</div>
                      </div>
                    </div>
                  </div>

                  {p.resolutionNotes && (
                    <div className="p-2.5 bg-white border border-emerald-200 rounded-lg text-xs text-slate-700">
                      <strong>ผลการดำเนินการ:</strong> {p.resolutionNotes}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
