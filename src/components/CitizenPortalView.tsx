import React, { useState } from 'react';
import {
  FileText,
  Truck,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  LogOut,
  MapPin,
  Phone,
  User,
  ShieldCheck,
  Send,
  Calendar,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { PublicPetition, PetitionCategory, PetitionStatus } from '../types/index.ts';

interface CitizenPortalViewProps {
  petitions: PublicPetition[];
  onAddPetition: (petition: PublicPetition) => void;
  onExitCitizenMode: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const CitizenPortalView: React.FC<CitizenPortalViewProps> = ({
  petitions,
  onAddPetition,
  onExitCitizenMode,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'sewage' | 'tracking'>('general');

  // Form State
  const [petitionerName, setPetitionerName] = useState('');
  const [petitionerPhone, setPetitionerPhone] = useState('');
  const [petitionerAddress, setPetitionerAddress] = useState('');
  const [petitionerMoo, setPetitionerMoo] = useState('1');
  const [category, setCategory] = useState<PetitionCategory>('nuisance_smell');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [desiredDate, setDesiredDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [sewageVolume, setSewageVolume] = useState('1');
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);

  // Tracking Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<PublicPetition[] | null>(null);

  const handleSubmitForm = (e: React.FormEvent, formType: 'general' | 'sewage') => {
    e.preventDefault();

    if (!petitionerName.trim() || !petitionerPhone.trim()) {
      onShowToast('error', 'กรุณากรอกชื่อและเบอร์โทรศัพท์ติดต่อ');
      return;
    }

    const yearTh = '2569';
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const trackingCode = formType === 'sewage' 
      ? `SWG-${yearTh}-${randNum}` 
      : `REQ-${yearTh}-${randNum}`;

    const newPetition: PublicPetition = {
      id: `PET-${Date.now()}`,
      trackingCode,
      createdAt: new Date().toISOString(),
      petitionerName: petitionerName.trim(),
      petitionerPhone: petitionerPhone.trim(),
      petitionerIdCard: '',
      petitionerAddress: petitionerAddress.trim() || `หมู่ที่ ${petitionerMoo} ต.บางเป้า อ.กันตัง จ.ตรัง`,
      moo: petitionerMoo,
      category: formType === 'sewage' ? 'waste_sewage' : category,
      title: formType === 'sewage' 
        ? `คำร้องขอรับบริการสูบสิ่งปฏิกูล (ดูดส้วม) จำนวน ${sewageVolume} ลบ.ม.` 
        : (title.trim() || 'คำร้องทั่วไป'),
      description: formType === 'sewage'
        ? `ขอบริการดูดส้วม ณ บ้านเลขที่/สถานที่: ${petitionerAddress.trim() || '-'} หมู่ที่ ${petitionerMoo} นัดหมายวันที่: ${desiredDate}`
        : description.trim(),
      incidentLocation: `หมู่ที่ ${petitionerMoo} ต.บางเป้า อ.กันตัง จ.ตรัง`,
      urgency: 'medium',
      status: 'pending',
      assignedTo: formType === 'sewage' ? 'นายชนะ สุขด้วง (พนักงานขับรถบรรทุกสิ่งปฏิกูล)' : 'นายตรวจสุขลักษณะ กองสาธารณสุข',
      targetDate: desiredDate,
      feeAmount: formType === 'sewage' ? Number(sewageVolume) * 250 : 0,
      feeStatus: formType === 'sewage' ? 'pending' : 'not_applicable',
    };

    onAddPetition(newPetition);
    setSubmittedCode(trackingCode);
    onShowToast('success', `ส่งคำร้องสำเร็จ! รหัสติดตามของท่านคือ ${trackingCode}`);

    // Reset Form
    setTitle('');
    setDescription('');
  };

  const handleSearchTracking = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      setSearchResult(null);
      return;
    }

    const matched = petitions.filter(
      (p) =>
        p.trackingCode.toLowerCase().includes(query) ||
        p.petitionerPhone.includes(query) ||
        p.petitionerName.toLowerCase().includes(query)
    );

    setSearchResult(matched);
  };

  const getStatusBadge = (status: PetitionStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3.5 h-3.5" />
            <span>รอรับเรื่อง / ตรวจสอบเอกสาร</span>
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <Truck className="w-3.5 h-3.5" />
            <span>กำลังดำเนินการ / มอบหมายทีมงาน</span>
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>ดำเนินการเสร็จสิ้นเรียบร้อย</span>
          </span>
        );
      case 'rejected':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300">
            <span>ยุติเรื่อง / ไม่อนุมัติ</span>
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-950 via-teal-950 to-slate-900 text-slate-100 font-sarabun flex flex-col justify-between">
      {/* Public Header */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-emerald-500/30 sticky top-0 z-40 px-4 sm:px-8 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-white p-1 ring-2 ring-emerald-400/60 shadow-md flex items-center justify-center shrink-0">
              <img
                src="/images-Photoroom.png"
                alt="ตราเทศบาลตำบลบางเป้า"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg text-white leading-tight">
                  ศูนย์บริการประชาชนออนไลน์ (Citizen e-Service)
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                  เทศบาลตำบลบางเป้า
                </span>
              </div>
              <p className="text-xs text-emerald-300/80">
                กองสาธารณสุขและสิ่งแวดล้อม อ.กันตัง จ.ตรัง
              </p>
            </div>
          </div>

          <button
            onClick={onExitCitizenMode}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/20 cursor-pointer shadow-xs shrink-0"
            title="สำหรับเจ้าหน้าที่เทศบาลลงชื่อเข้าสู่ระบบ"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <span className="hidden sm:inline">สำหรับเจ้าหน้าที่เทศบาล</span>
            <span>(เข้าสู่ระบบ)</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 flex-1">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 bg-slate-900/60 p-1.5 rounded-2xl border border-emerald-500/20">
          <button
            onClick={() => {
              setActiveTab('general');
              setSubmittedCode(null);
            }}
            className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'general'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>1. ยื่นคำร้องทั่วไป & ร้องเรียน</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('sewage');
              setSubmittedCode(null);
            }}
            className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'sewage'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>2. ขอบริการสูบสิ่งปฏิกูล (ดูดส้วม)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('tracking');
              setSubmittedCode(null);
            }}
            className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'tracking'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>3. ติดตามสถานะคำร้อง</span>
          </button>
        </div>

        {/* Success Modal / Banner after submission */}
        {submittedCode && (
          <div className="mb-6 p-6 rounded-3xl bg-emerald-900/90 border-2 border-emerald-400 text-white text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-emerald-500 text-slate-950 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black mb-1">ส่งคำร้องเรียบร้อยแล้ว!</h3>
            <p className="text-xs text-emerald-200 mb-3">
              ระบบได้รับข้อมูลคำร้องของท่านเรียบร้อยแล้ว เจ้าหน้าที่จะดำเนินการตามขั้นตอนราชการ
            </p>
            <div className="inline-block px-5 py-2.5 rounded-2xl bg-slate-950/60 border border-emerald-400/50 text-emerald-300 font-mono text-base sm:text-lg font-bold tracking-wider mb-4">
              รหัสติดตามคำร้อง: {submittedCode}
            </div>
            <div>
              <button
                onClick={() => {
                  setSearchQuery(submittedCode);
                  setActiveTab('tracking');
                  setSubmittedCode(null);
                }}
                className="px-5 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs cursor-pointer shadow-md inline-flex items-center gap-1.5"
              >
                <span>คลิกเพื่อติดตามความคืบหน้าคำร้องนี้ทันที</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 1: ยื่นคำร้องทั่วไป & ร้องเรียนเหตุรำคาญ */}
        {activeTab === 'general' && (
          <div className="bg-white text-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl border border-emerald-100">
            <div className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  แบบฟอร์มยื่นคำร้องทั่วไป และร้องเรียนเหตุเดือดร้อนรำคาญ
                </h2>
                <p className="text-xs text-slate-500">
                  กรอกข้อมูลของท่านเพื่อให้เจ้าหน้าที่กองสาธารณสุขลงพื้นที่ตรวจสอบและแก้ไขปัญหา
                </p>
              </div>
            </div>

            <form onSubmit={(e) => handleSubmitForm(e, 'general')} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">ชื่อ-นามสกุล ผู้ยื่นคำร้อง *</label>
                  <input
                    type="text"
                    value={petitionerName}
                    onChange={(e) => setPetitionerName(e.target.value)}
                    placeholder="เช่น นายรักถิ่น บางเป้า"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">เบอร์โทรศัพท์ที่ติดต่อได้ *</label>
                  <input
                    type="tel"
                    value={petitionerPhone}
                    onChange={(e) => setPetitionerPhone(e.target.value)}
                    placeholder="เช่น 081-370-1841"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">ที่อยู่ / จุดเกิดเหตุ (บ้านเลขที่, ซอย, ถนน)</label>
                  <input
                    type="text"
                    value={petitionerAddress}
                    onChange={(e) => setPetitionerAddress(e.target.value)}
                    placeholder="เช่น 99/1 ซอยร่วมใจ ต.บางเป้า"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">หมู่ที่ (ต.บางเป้า) *</label>
                  <select
                    value={petitionerMoo}
                    onChange={(e) => setPetitionerMoo(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((m) => (
                      <option key={m} value={String(m)}>หมู่ที่ {m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">ประเภทเรื่องที่ร้องเรียน / ขอบริการ *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as PetitionCategory)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="nuisance_smell">กลิ่นเหม็น / มลพิษทางอากาศ / กลิ่นควัน</option>
                  <option value="nuisance_noise">เสียงดังรบกวน / สถานประกอบการ / เสียงเพลง</option>
                  <option value="waste_dumping">ทิ้งขยะไม่เป็นที่ / ขยะล้น / ขยะตกค้าง</option>
                  <option value="water_pollution">น้ำเสีย / ท่อระบายน้ำอุดตัน / น้ำท่วมขัง</option>
                  <option value="hazardous_biz">สถานประกอบกิจการอันตรายส่งผลกระทบ</option>
                  <option value="general_health">คำร้องทั่วไปด้านสาธารณสุข</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">หัวข้อเรื่อง *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="เช่น ร้องเรียนกลิ่นเหม็นจากการเลี้ยงสัตว์ หรือ ท่อระบายน้ำอุดตัน"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">รายละเอียดข้อเท็จจริง / ผลกระทบที่ได้รับ</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="ระบุรายละเอียดช่วงเวลาที่เกิดเหตุ ความเดือดร้อน และลักษณะที่ต้องการให้เทศบาลช่วยเหลือ..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full py-3.5 px-6 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>ส่งคำร้องถึงกองสาธารณสุข เทศบาลตำบลบางเป้า</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: ขอบริการสูบสิ่งปฏิกูล (ดูดส้วม) */}
        {activeTab === 'sewage' && (
          <div className="bg-white text-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl border border-blue-100">
            <div className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  แบบฟอร์มขอบริการสูบสิ่งปฏิกูล (รถดูดส้วมเทศบาล)
                </h2>
                <p className="text-xs text-slate-500">
                  บริการสูบสิ่งปฏิกูลตามเทศบัญญัติเทศบาลตำบลบางเป้า อัตราลูกบาศก์เมตรละ 250 บาท
                </p>
              </div>
            </div>

            <form onSubmit={(e) => handleSubmitForm(e, 'sewage')} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">ชื่อ-นามสกุล เจ้าของบ้าน / ผู้ขอรับบริการ *</label>
                  <input
                    type="text"
                    value={petitionerName}
                    onChange={(e) => setPetitionerName(e.target.value)}
                    placeholder="เช่น นายรักถิ่น บางเป้า"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">เบอร์โทรศัพท์ติดต่อ *</label>
                  <input
                    type="tel"
                    value={petitionerPhone}
                    onChange={(e) => setPetitionerPhone(e.target.value)}
                    placeholder="เช่น 081-370-1841"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">บ้านเลขที่ / สถานที่ตั้งถังเกรอะ-ถังบำบัด *</label>
                  <input
                    type="text"
                    value={petitionerAddress}
                    onChange={(e) => setPetitionerAddress(e.target.value)}
                    placeholder="เช่น บ้านเลขที่ 124/2 หมู่ 3 ต.บางเป้า"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">หมู่ที่ *</label>
                  <select
                    value={petitionerMoo}
                    onChange={(e) => setPetitionerMoo(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((m) => (
                      <option key={m} value={String(m)}>หมู่ที่ {m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">วันที่ต้องการให้นัดหมายเข้าสูบ *</label>
                  <input
                    type="date"
                    value={desiredDate}
                    onChange={(e) => setDesiredDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">ปริมาณโดยประมาณ (ลูกบาศก์เมตร / ลบ.ม.)</label>
                  <select
                    value={sewageVolume}
                    onChange={(e) => setSewageVolume(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="1">1 ลบ.ม. (ประมาณ 250 บาท)</option>
                    <option value="2">2 ลบ.ม. (ประมาณ 500 บาท)</option>
                    <option value="3">3 ลบ.ม. (ประมาณ 750 บาท)</option>
                    <option value="4">4 ลบ.ม. หรือเต็มคันรถ (ประมาณ 1,000 บาท)</option>
                  </select>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900">
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span>ประมาณการค่าธรรมเนียม:</span>
                  <span className="text-base text-blue-700 font-black">
                    {Number(sewageVolume) * 250} บาท
                  </span>
                </div>
                <div className="text-[11px] text-blue-800/80">
                  * คิดอัตรา 250 บาทต่อลูกบาศก์เมตรตามปริมาณจริงที่สูบได้ เจ้าหน้าที่จะออกใบเสร็จรับเงินทางราชการให้ทันทีหลังปฏิบัติงาน
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>ส่งคำร้องขอรับบริการสูบสิ่งปฏิกูล</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 3: ติดตามสถานะคำร้อง (Citizen Tracking) */}
        {activeTab === 'tracking' && (
          <div className="bg-white text-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl border border-amber-100">
            <div className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  ระบบติดตามสถานะคำร้องของประชาชน (Tracking Portal)
                </h2>
                <p className="text-xs text-slate-500">
                  กรอกรหัสติดตามคำร้อง (เช่น REQ-2569-xxxx, SWG-2569-xxxx) หรือเบอร์โทรศัพท์ของท่าน
                </p>
              </div>
            </div>

            <form onSubmit={handleSearchTracking} className="mb-6">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="พิมพ์รหัสคำร้อง หรือเบอร์โทรศัพท์ เช่น 081-370-1841"
                  className="flex-1 p-3 rounded-2xl border border-slate-300 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="px-6 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm shadow-md cursor-pointer flex items-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  <span>ค้นหา</span>
                </button>
              </div>
            </form>

            {/* Results Display */}
            {searchResult && (
              <div className="space-y-4">
                <h3 className="font-bold text-xs text-slate-500">
                  ผลการค้นหา ({searchResult.length} รายการ):
                </h3>

                {searchResult.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs">
                    ไม่พบข้อมูลคำร้องที่ตรงกับคำค้นหา กรุณาตรวจสอบรหัสคำร้องหรือเบอร์โทรศัพท์อีกครั้ง
                  </div>
                ) : (
                  searchResult.map((p) => (
                    <div
                      key={p.id}
                      className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-amber-400 transition-all shadow-2xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-slate-900">
                              {p.trackingCode}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              ({new Date(p.createdAt).toLocaleDateString('th-TH')})
                            </span>
                          </div>
                          <div className="text-xs font-bold text-slate-700 mt-0.5">
                            {p.title}
                          </div>
                        </div>

                        <div>{getStatusBadge(p.status)}</div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                        <div>
                          <strong>ผู้ยื่นคำร้อง:</strong> {p.petitionerName} ({p.petitionerPhone})
                        </div>
                        <div>
                          <strong>สถานที่:</strong> {p.petitionerAddress}
                        </div>
                        <div>
                          <strong>ผู้รับผิดชอบ:</strong> {p.assignedTo || 'กองสาธารณสุขและสิ่งแวดล้อม'}
                        </div>
                        {p.targetDate && (
                          <div>
                            <strong>วันนัดหมายดำเนินการ:</strong> {p.targetDate}
                          </div>
                        )}
                      </div>

                      {p.resolutionNotes && (
                        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-xs">
                          <strong>ผลการดำเนินงานของเจ้าหน้าที่:</strong> {p.resolutionNotes}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Public Footer */}
      <footer className="max-w-5xl mx-auto w-full px-4 py-4 text-center text-xs text-slate-400 border-t border-emerald-500/20">
        <div>
          กองสาธารณสุขและสิ่งแวดล้อม เทศบาลตำบลบางเป้า อ.กันตัง จ.ตรัง • โทร. 075-270569
        </div>
      </footer>
    </div>
  );
};
