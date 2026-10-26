import React, { useState, useEffect } from 'react';
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
  Send,
  Calendar,
  Sparkles,
  ArrowRight,
  Navigation,
  ExternalLink,
  Compass,
} from 'lucide-react';
import { PublicPetition, PetitionCategory, PetitionStatus } from '../types/index.ts';

interface CitizenPortalViewProps {
  petitions: PublicPetition[];
  onAddPetition: (petition: PublicPetition) => void;
  onExitCitizenMode: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', msg: string) => void;
}

interface VillagePreset {
  moo: string;
  name: string;
  landmark: string;
  lat: number;
  lng: number;
}

const BANGPAO_VILLAGES: VillagePreset[] = [
  { moo: '1', name: 'บ้านบางเป้า', landmark: 'ที่ทำการเทศบาล / วัดบางเป้า', lat: 7.3985, lng: 99.4920 },
  { moo: '2', name: 'บ้านคลองชีล้อม', landmark: 'ชุมชนท่าเรือ / ร้านค้า', lat: 7.3912, lng: 99.4880 },
  { moo: '3', name: 'บ้านปากปรน', landmark: 'ปากน้ำกันตัง / ชุมชนประมง', lat: 7.3820, lng: 99.4750 },
  { moo: '4', name: 'บ้านทุ่งค่าย', landmark: 'ถนนสายหลัก / สวนยางพารา', lat: 7.4100, lng: 99.5050 },
  { moo: '5', name: 'บ้านหลังควน', landmark: 'เชิงเขาควน / โรงเรียน', lat: 7.4050, lng: 99.4990 },
  { moo: '6', name: 'บ้านแหลมมะขาม', landmark: 'คลองบางเป้า / มัสยิด', lat: 7.3750, lng: 99.4650 },
  { moo: '7', name: 'บ้านควนโต๊ะพราน', landmark: 'เขตต่อเชื่อมตำบล / ศาลากลางหมู่บ้าน', lat: 7.4150, lng: 99.5120 },
];

export const CitizenPortalView: React.FC<CitizenPortalViewProps> = ({
  petitions,
  onAddPetition,
  onExitCitizenMode,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'sewage' | 'tracking'>('general');

  // Live Thai Clock & Date
  const [currentDateTime, setCurrentDateTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatThaiDate = (date: Date) => {
    const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    const dayName = thaiDays[date.getDay()];
    const dayNum = date.getDate();
    const monthName = thaiMonths[date.getMonth()];
    const yearBE = date.getFullYear() + 543;
    return `วัน${dayName}ที่ ${dayNum} ${monthName} พ.ศ. ${yearBE}`;
  };

  const formatThaiTime = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds} น.`;
  };

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

  // Location Pinning State (ปักหมุดที่อยู่)
  const [pinLat, setPinLat] = useState<number>(7.3985);
  const [pinLng, setPinLng] = useState<number>(99.4920);
  const [pinLandmark, setPinLandmark] = useState<string>('บ้านบางเป้า (หมู่ 1)');
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Tracking Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<PublicPetition[] | null>(null);

  // Handle GPS location capture
  const handleGetLiveGPS = () => {
    if (!navigator.geolocation) {
      onShowToast('error', 'อุปกรณ์ของคุณไม่รองรับการระบุพิกัด GPS อัตโนมัติ กรุณาเลือกหมู่บ้านแทน');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        setPinLat(lat);
        setPinLng(lng);
        setPinLandmark(`พิกัด GPS ปัจจุบันของผู้ยื่น (${lat}, ${lng})`);
        onShowToast('success', `ปักหมุดพิกัด GPS สำเร็จ: ${lat}, ${lng}`);
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err);
        onShowToast('info', 'ไม่สามารถดึงพิกัดอัตโนมัติได้ กรุณาคลิกเลือกหมู่บ้านที่ต้องการปักหมุดด้านล่าง');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSelectVillage = (v: VillagePreset) => {
    setPetitionerMoo(v.moo);
    setPinLat(v.lat);
    setPinLng(v.lng);
    setPinLandmark(`หมู่ ${v.moo} ${v.name} (${v.landmark})`);
    onShowToast('info', `ปักหมุดตำแหน่ง: หมู่ ${v.moo} ${v.name}`);
  };

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

    const locationText = `${petitionerAddress.trim() || '-'} หมู่ที่ ${petitionerMoo} ต.บางเป้า อ.กันตัง จ.ตรัง [พิกัดหมุด: ${pinLat}, ${pinLng} - ${pinLandmark}]`;

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
        ? `ขอบริการดูดส้วม ณ บ้านเลขที่: ${petitionerAddress.trim() || '-'} หมู่ที่ ${petitionerMoo} นัดหมายวันที่: ${desiredDate} | พิกัดหมุดแผนที่: ${pinLat}, ${pinLng}`
        : `${description.trim()} | พิกัดหมุดแผนที่: ${pinLat}, ${pinLng} (${pinLandmark})`,
      incidentLocation: locationText,
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
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <Clock className="w-4 h-4 text-amber-700" />
            <span>รอรับเรื่อง / ตรวจสอบเอกสาร</span>
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold bg-blue-100 text-blue-900 border border-blue-300">
            <Truck className="w-4 h-4 text-blue-700" />
            <span>กำลังดำเนินการ / มอบหมายทีมงาน</span>
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span>ดำเนินการเสร็จสิ้นเรียบร้อย</span>
          </span>
        );
      case 'rejected':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold bg-slate-100 text-slate-800 border border-slate-300">
            <span>ยุติเรื่อง</span>
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#04281f] via-[#063a2d] to-[#031d17] text-slate-100 font-sarabun flex flex-col justify-between selection:bg-emerald-500 selection:text-slate-950">
      {/* Public Header with Large Logo, Municipal Title, and Live Digital Clock */}
      <header className="bg-slate-950/70 backdrop-blur-md border-b border-emerald-500/30 sticky top-0 z-40 px-4 sm:px-8 py-4 shadow-xl">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 sm:gap-5 text-center md:text-left">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white p-1 ring-4 ring-emerald-400/50 shadow-xl flex items-center justify-center shrink-0">
              <img
                src="/images-Photoroom.png"
                alt="ตราเทศบาลตำบลบางเป้า"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap justify-center md:justify-start">
                <h1 className="font-black text-lg sm:text-2xl text-white leading-tight">
                  ศูนย์บริการประชาชนออนไลน์ (Citizen e-Service)
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/40">
                  เทศบาลตำบลบางเป้า
                </span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-300 font-medium mt-0.5">
                กองสาธารณสุขและสิ่งแวดล้อม อำเภอกันตัง จังหวัดตรัง
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Clock Badge */}
            <div className="hidden sm:flex flex-col items-end bg-slate-900/80 border border-emerald-500/30 px-4 py-2 rounded-2xl text-right shadow-md">
              <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatThaiDate(currentDateTime)}</span>
              </div>
              <div className="text-sm font-black text-white font-mono mt-0.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>{formatThaiTime(currentDateTime)}</span>
              </div>
            </div>

            {/* Back to Officer Login */}
            <button
              onClick={onExitCitizenMode}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-bold transition-all border border-white/25 cursor-pointer shadow-md shrink-0 active:scale-95"
              title="สำหรับเจ้าหน้าที่เทศบาลลงชื่อเข้าสู่ระบบ"
            >
              <LogOut className="w-4 h-4 text-emerald-300" />
              <span>เข้าสู่ระบบเจ้าหน้าที่</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 flex-1">
        {/* Welcome Message */}
        <div className="text-center mb-6 max-w-3xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-black text-white">
            ยินดีต้อนรับสู่ระบบยื่นคำร้องและบริการประชาชน เทศบาลตำบลบางเป้า
          </h2>
          <p className="text-xs sm:text-sm text-emerald-200/90 mt-1 font-medium">
            กรุณาเลือกประเภทบริการที่ต้องการด้านล่าง พร้อมปักหมุดตำแหน่งที่อยู่เพื่อให้เจ้าหน้าที่เข้าดำเนินการได้อย่างถูกต้อง
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2.5 mb-6 bg-slate-950/60 p-2 rounded-3xl border border-emerald-500/30 shadow-xl">
          <button
            onClick={() => {
              setActiveTab('general');
              setSubmittedCode(null);
            }}
            className={`flex-1 min-w-[160px] flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl text-xs sm:text-base font-black transition-all cursor-pointer ${
              activeTab === 'general'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/40'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span>1. ยื่นคำร้องทั่วไป & ร้องเรียน</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('sewage');
              setSubmittedCode(null);
            }}
            className={`flex-1 min-w-[160px] flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl text-xs sm:text-base font-black transition-all cursor-pointer ${
              activeTab === 'sewage'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Truck className="w-5 h-5" />
            <span>2. ขอบริการสูบสิ่งปฏิกูล (ดูดส้วม)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('tracking');
              setSubmittedCode(null);
            }}
            className={`flex-1 min-w-[160px] flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl text-xs sm:text-base font-black transition-all cursor-pointer ${
              activeTab === 'tracking'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/40'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Search className="w-5 h-5" />
            <span>3. ติดตามสถานะคำร้อง</span>
          </button>
        </div>

        {/* Success Modal / Banner after submission */}
        {submittedCode && (
          <div className="mb-8 p-7 rounded-3xl bg-emerald-900/95 border-2 border-emerald-400 text-white text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-400 text-slate-950 rounded-full flex items-center justify-center mx-auto mb-3.5 shadow-xl">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black mb-1">ส่งคำร้องและบันทึกพิกัดเรียบร้อยแล้ว!</h3>
            <p className="text-sm text-emerald-100 mb-4 font-medium">
              เจ้าหน้าที่กองสาธารณสุขจะตรวจสอบข้อมูลและเตรียมลงพื้นที่ตามตำแหน่งที่ท่านปักหมุดไว้
            </p>
            <div className="inline-block px-6 py-3 rounded-2xl bg-slate-950/70 border-2 border-emerald-400/60 text-emerald-300 font-mono text-xl sm:text-2xl font-black tracking-widest mb-5 shadow-inner">
              รหัสติดตามคำร้อง: {submittedCode}
            </div>
            <div>
              <button
                onClick={() => {
                  setSearchQuery(submittedCode);
                  setActiveTab('tracking');
                  setSubmittedCode(null);
                }}
                className="px-6 py-3 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-sm cursor-pointer shadow-lg inline-flex items-center gap-2 hover:scale-105 transition-all"
              >
                <span>คลิกเพื่อติดตามความคืบหน้าคำร้องนี้</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 1: ยื่นคำร้องทั่วไป & ร้องเรียนเหตุรำคาญ (พร้อมปักหมุดที่อยู่) */}
        {activeTab === 'general' && (
          <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-9 shadow-2xl border-2 border-emerald-100">
            <div className="flex items-center gap-3.5 pb-5 mb-6 border-b border-slate-200">
              <div className="w-12 h-12 rounded-2xl bg-emerald-800 text-white flex items-center justify-center shadow-md shrink-0">
                <FileText className="w-6 h-6 text-emerald-300" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  แบบฟอร์มยื่นคำร้องทั่วไป และร้องเรียนเหตุเดือดร้อนรำคาญ
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  กรอกข้อมูลพร้อมปักหมุดพิกัดจุดเกิดเหตุ เพื่อให้เจ้าหน้าที่ลงพื้นที่ตรวจสอบได้อย่างแม่นยำ
                </p>
              </div>
            </div>

            <form onSubmit={(e) => handleSubmitForm(e, 'general')} className="space-y-5 text-sm sm:text-base">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="font-bold text-slate-800 block mb-2">
                    ชื่อ-นามสกุล ผู้ยื่นคำร้อง *
                  </label>
                  <input
                    type="text"
                    value={petitionerName}
                    onChange={(e) => setPetitionerName(e.target.value)}
                    placeholder="กรอกชื่อและนามสกุลจริง"
                    className="w-full p-3.5 rounded-2xl border-2 border-slate-300 text-base font-semibold text-slate-900 bg-slate-50 focus:ring-2 focus:ring-emerald-600"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-800 block mb-2">
                    เบอร์โทรศัพท์ติดต่อ *
                  </label>
                  <input
                    type="tel"
                    value={petitionerPhone}
                    onChange={(e) => setPetitionerPhone(e.target.value)}
                    placeholder="กรอกเบอร์โทรศัพท์ เช่น 081-xxxxxxx"
                    className="w-full p-3.5 rounded-2xl border-2 border-slate-300 text-base font-semibold text-slate-900 bg-slate-50 focus:ring-2 focus:ring-emerald-600"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-2">
                  ประเภทเรื่องที่ร้องเรียน / ขอรับบริการ *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as PetitionCategory)}
                  className="w-full p-3.5 rounded-2xl border-2 border-slate-300 text-base font-semibold text-slate-900 bg-white focus:ring-2 focus:ring-emerald-600"
                >
                  <option value="nuisance_smell">กลิ่นเหม็น / มลพิษทางอากาศ / กลิ่นควันจากการเผา</option>
                  <option value="nuisance_noise">เสียงดังรบกวน / สถานประกอบการ / เสียงดนตรี</option>
                  <option value="waste_dumping">ทิ้งขยะไม่เป็นที่ / ขยะล้นถัง / ขยะตกค้าง</option>
                  <option value="water_pollution">น้ำเสีย / ท่อระบายน้ำอุดตัน / น้ำท่วมขังขวางทาง</option>
                  <option value="hazardous_biz">สถานประกอบกิจการอันตรายส่งผลกระทบต่อชุมชน</option>
                  <option value="general_health">คำร้องทั่วไปด้านการสาธารณสุขและสุขาภิบาล</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-2">
                  หัวข้อเรื่อง *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="เช่น ร้องเรียนกลิ่นเหม็น หรือ ขยะตกค้างบริเวณริมถนน"
                  className="w-full p-3.5 rounded-2xl border-2 border-slate-300 text-base font-semibold text-slate-900 bg-slate-50 focus:ring-2 focus:ring-emerald-600"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-2">
                  รายละเอียดข้อเท็จจริง และความเดือดร้อนที่ได้รับ
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="อธิบายรายละเอียด เช่น เกิดเหตุเวลาใด มีผลกระทบอย่างไรต่อชีวิตประจำวัน..."
                  className="w-full p-3.5 rounded-2xl border-2 border-slate-300 text-base font-semibold text-slate-900 bg-slate-50 focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              {/* 📍 ปักหมุดที่อยู่ / พิกัดจุดเกิดเหตุ (Location Pinning) */}
              <div className="p-5 sm:p-6 rounded-3xl bg-emerald-50/70 border-2 border-emerald-300 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-800 text-white flex items-center justify-center shrink-0">
                      <MapPin className="w-6 h-6 text-amber-300" />
                    </div>
                    <div>
                      <h3 className="font-black text-base sm:text-lg text-slate-900">
                        ระบบปักหมุดที่อยู่ / พิกัดจุดเกิดเหตุ (Location Pin)
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 font-medium">
                        เลือกหมู่บ้าน หรือกดดึงพิกัด GPS อัตโนมัติ เพื่อให้เจ้าหน้าที่นำทางไปถูกจุด
                      </p>
                    </div>
                  </div>

                  {/* Auto GPS Button */}
                  <button
                    type="button"
                    onClick={handleGetLiveGPS}
                    disabled={isLocating}
                    className="px-4 py-2.5 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer shadow-md shrink-0 active:scale-95 disabled:opacity-50"
                  >
                    <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
                    <span>{isLocating ? 'กำลังค้นหาพิกัด...' : '📍 ใช้พิกัดปัจจุบัน (GPS)'}</span>
                  </button>
                </div>

                {/* Village Quick Selector (7 Villages in Tambon Bangpao) */}
                <div>
                  <div className="text-xs sm:text-sm font-bold text-slate-700 mb-2">
                    หรือคลิกเลือกหมู่บ้านในตำบลบางเป้า เพื่อปักหมุดทันที:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                    {BANGPAO_VILLAGES.map((v) => {
                      const isSelected = petitionerMoo === v.moo;
                      return (
                        <button
                          key={v.moo}
                          type="button"
                          onClick={() => handleSelectVillage(v)}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-800 text-white border-emerald-900 shadow-md font-bold'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-500 font-semibold'
                          }`}
                        >
                          <div className="text-xs sm:text-sm font-black">หมู่ {v.moo}</div>
                          <div className="text-[11px] truncate mt-0.5">{v.name}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Address Detail Input */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="font-bold text-slate-800 block text-xs sm:text-sm mb-1">
                      บ้านเลขที่ / ซอย / จุดสังเกตใกล้เคียง
                    </label>
                    <input
                      type="text"
                      value={petitionerAddress}
                      onChange={(e) => setPetitionerAddress(e.target.value)}
                      placeholder="เช่น บ้านเลขที่ 45/1 ใกล้ศาลาหมู่บ้าน หรือตรงข้ามร้านค้า"
                      className="w-full p-3 rounded-xl border-2 border-slate-300 text-sm font-semibold text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-800 block text-xs sm:text-sm mb-1">
                      หมู่ที่ (ต.บางเป้า) *
                    </label>
                    <select
                      value={petitionerMoo}
                      onChange={(e) => {
                        const m = e.target.value;
                        setPetitionerMoo(m);
                        const v = BANGPAO_VILLAGES.find((x) => x.moo === m);
                        if (v) {
                          setPinLat(v.lat);
                          setPinLng(v.lng);
                          setPinLandmark(`หมู่ ${v.moo} ${v.name}`);
                        }
                      }}
                      className="w-full p-3 rounded-xl border-2 border-slate-300 text-sm font-semibold text-slate-900 bg-white"
                    >
                      {[1, 2, 3, 4, 5, 6, 7].map((m) => (
                        <option key={m} value={String(m)}>หมู่ที่ {m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Pin Status & Google Maps Link */}
                <div className="p-3.5 rounded-2xl bg-white border border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-950">หมุดที่เลือก:</span>
                    <span className="font-bold text-emerald-800">{pinLandmark}</span>
                    <span className="font-mono text-slate-500 font-semibold">
                      ({pinLat}, {pinLng})
                    </span>
                  </div>

                  <a
                    href={`https://www.google.com/maps?q=${pinLat},${pinLng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-emerald-800 hover:text-emerald-950 font-bold hover:underline"
                  >
                    <span>เปิดดูตำแหน่งบน Google Maps</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-800 to-teal-800 hover:from-emerald-900 hover:to-teal-900 text-white font-black text-base sm:text-lg shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.99]"
                >
                  <Send className="w-5 h-5" />
                  <span>ส่งคำร้องถึงกองสาธารณสุข เทศบาลตำบลบางเป้า</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: ขอบริการสูบสิ่งปฏิกูล (ดูดส้วม) (พร้อมปักหมุดที่อยู่) */}
        {activeTab === 'sewage' && (
          <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-9 shadow-2xl border-2 border-blue-100">
            <div className="flex items-center gap-3.5 pb-5 mb-6 border-b border-slate-200">
              <div className="w-12 h-12 rounded-2xl bg-blue-700 text-white flex items-center justify-center shadow-md shrink-0">
                <Truck className="w-6 h-6 text-blue-200" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  แบบฟอร์มขอบริการสูบสิ่งปฏิกูล (รถดูดส้วมเทศบาล)
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  บริการสูบสิ่งปฏิกูลตามเทศบัญญัติเทศบาลตำบลบางเป้า อัตราลูกบาศก์เมตรละ 250 บาท พร้อมปักหมุดตำแหน่งบ้าน
                </p>
              </div>
            </div>

            <form onSubmit={(e) => handleSubmitForm(e, 'sewage')} className="space-y-5 text-sm sm:text-base">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="font-bold text-slate-800 block mb-2">
                    ชื่อ-นามสกุล เจ้าของบ้าน / ผู้ขอรับบริการ *
                  </label>
                  <input
                    type="text"
                    value={petitionerName}
                    onChange={(e) => setPetitionerName(e.target.value)}
                    placeholder="กรอกชื่อ-นามสกุล ผู้ขอรับบริการ"
                    className="w-full p-3.5 rounded-2xl border-2 border-slate-300 text-base font-semibold text-slate-900 bg-slate-50 focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-800 block mb-2">
                    เบอร์โทรศัพท์ติดต่อ *
                  </label>
                  <input
                    type="tel"
                    value={petitionerPhone}
                    onChange={(e) => setPetitionerPhone(e.target.value)}
                    placeholder="กรอกเบอร์โทรศัพท์สำหรับนัดหมาย"
                    className="w-full p-3.5 rounded-2xl border-2 border-slate-300 text-base font-semibold text-slate-900 bg-slate-50 focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="font-bold text-slate-800 block mb-2">
                    วันที่ต้องการให้นัดหมายเข้าสูบ *
                  </label>
                  <input
                    type="date"
                    value={desiredDate}
                    onChange={(e) => setDesiredDate(e.target.value)}
                    className="w-full p-3.5 rounded-2xl border-2 border-slate-300 text-base font-semibold text-slate-900 bg-white focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-800 block mb-2">
                    ปริมาณโดยประมาณ (ลูกบาศก์เมตร / ลบ.ม.)
                  </label>
                  <select
                    value={sewageVolume}
                    onChange={(e) => setSewageVolume(e.target.value)}
                    className="w-full p-3.5 rounded-2xl border-2 border-slate-300 text-base font-semibold text-slate-900 bg-white focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="1">1 ลบ.ม. (ประมาณ 250 บาท)</option>
                    <option value="2">2 ลบ.ม. (ประมาณ 500 บาท)</option>
                    <option value="3">3 ลบ.ม. (ประมาณ 750 บาท)</option>
                    <option value="4">4 ลบ.ม. หรือเต็มคันรถ (ประมาณ 1,000 บาท)</option>
                  </select>
                </div>
              </div>

              {/* Fee Estimation Banner */}
              <div className="p-4 rounded-2xl bg-blue-50 border-2 border-blue-200 text-blue-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="text-xs sm:text-sm font-bold">
                  ประมาณการค่าธรรมเนียม:
                </div>
                <div className="text-xl sm:text-2xl font-black text-blue-700">
                  {Number(sewageVolume) * 250} บาท
                </div>
              </div>

              {/* 📍 ปักหมุดที่อยู่สำหรับรถดูดส้วม */}
              <div className="p-5 sm:p-6 rounded-3xl bg-blue-50/70 border-2 border-blue-300 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-blue-700 text-white flex items-center justify-center shrink-0">
                      <MapPin className="w-6 h-6 text-amber-300" />
                    </div>
                    <div>
                      <h3 className="font-black text-base sm:text-lg text-slate-900">
                        ปักหมุดตำแหน่งถังเกรอะ / ถังบำบัดของบ้าน (Location Pin)
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 font-medium">
                        เพื่อให้พนักงานขับรถบรรทุกสิ่งปฏิกูลเข้าถึงบ้านท่านได้อย่างรวดเร็ว
                      </p>
                    </div>
                  </div>

                  {/* Auto GPS Button */}
                  <button
                    type="button"
                    onClick={handleGetLiveGPS}
                    disabled={isLocating}
                    className="px-4 py-2.5 rounded-2xl bg-blue-700 hover:bg-blue-800 text-white text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer shadow-md shrink-0 active:scale-95 disabled:opacity-50"
                  >
                    <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
                    <span>{isLocating ? 'กำลังค้นหาพิกัด...' : '📍 ใช้พิกัดปัจจุบัน (GPS)'}</span>
                  </button>
                </div>

                {/* Village Quick Selector */}
                <div>
                  <div className="text-xs sm:text-sm font-bold text-slate-700 mb-2">
                    คลิกเลือกหมู่บ้านที่ต้องการรับบริการ:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                    {BANGPAO_VILLAGES.map((v) => {
                      const isSelected = petitionerMoo === v.moo;
                      return (
                        <button
                          key={v.moo}
                          type="button"
                          onClick={() => handleSelectVillage(v)}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-700 text-white border-blue-800 shadow-md font-bold'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-blue-500 font-semibold'
                          }`}
                        >
                          <div className="text-xs sm:text-sm font-black">หมู่ {v.moo}</div>
                          <div className="text-[11px] truncate mt-0.5">{v.name}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Address Detail Input */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="font-bold text-slate-800 block text-xs sm:text-sm mb-1">
                      บ้านเลขที่ / ตำแหน่งถังบำบัด
                    </label>
                    <input
                      type="text"
                      value={petitionerAddress}
                      onChange={(e) => setPetitionerAddress(e.target.value)}
                      placeholder="เช่น บ้านเลขที่ 124/2 หมู่ 3 ต.บางเป้า (ถังเกรอะอยู่หลังบ้าน)"
                      className="w-full p-3 rounded-xl border-2 border-slate-300 text-sm font-semibold text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-800 block text-xs sm:text-sm mb-1">
                      หมู่ที่ *
                    </label>
                    <select
                      value={petitionerMoo}
                      onChange={(e) => {
                        const m = e.target.value;
                        setPetitionerMoo(m);
                        const v = BANGPAO_VILLAGES.find((x) => x.moo === m);
                        if (v) {
                          setPinLat(v.lat);
                          setPinLng(v.lng);
                          setPinLandmark(`หมู่ ${v.moo} ${v.name}`);
                        }
                      }}
                      className="w-full p-3 rounded-xl border-2 border-slate-300 text-sm font-semibold text-slate-900 bg-white"
                    >
                      {[1, 2, 3, 4, 5, 6, 7].map((m) => (
                        <option key={m} value={String(m)}>หมู่ที่ {m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Pin Summary */}
                <div className="p-3.5 rounded-2xl bg-white border border-blue-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-blue-950">ตำแหน่งหมุด:</span>
                    <span className="font-bold text-blue-800">{pinLandmark}</span>
                    <span className="font-mono text-slate-500 font-semibold">
                      ({pinLat}, {pinLng})
                    </span>
                  </div>

                  <a
                    href={`https://www.google.com/maps?q=${pinLat},${pinLng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-blue-700 hover:text-blue-900 font-bold hover:underline"
                  >
                    <span>เปิดดูตำแหน่งบน Google Maps</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-base sm:text-lg shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.99]"
                >
                  <Send className="w-5 h-5" />
                  <span>ส่งคำร้องขอรับบริการสูบสิ่งปฏิกูล</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 3: ติดตามสถานะคำร้อง (Citizen Tracking) */}
        {activeTab === 'tracking' && (
          <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-9 shadow-2xl border-2 border-amber-100">
            <div className="flex items-center gap-3.5 pb-5 mb-6 border-b border-slate-200">
              <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-md shrink-0">
                <Search className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  ระบบตรวจสอบและติดตามสถานะคำร้องของประชาชน (Tracking Portal)
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  กรอกรหัสติดตามคำร้อง (เช่น REQ-2569-xxxx, SWG-2569-xxxx) หรือเบอร์โทรศัพท์ของท่าน
                </p>
              </div>
            </div>

            <form onSubmit={handleSearchTracking} className="mb-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="พิมพ์รหัสคำร้อง เช่น REQ-2569-0125 หรือ เบอร์โทรศัพท์"
                  className="flex-1 p-3.5 rounded-2xl border-2 border-slate-300 text-base font-semibold text-slate-900 bg-slate-50 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="px-8 py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-base shadow-md cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                >
                  <Search className="w-5 h-5" />
                  <span>ค้นหาคำร้อง</span>
                </button>
              </div>
            </form>

            {/* Results Display */}
            {searchResult && (
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-slate-600">
                  ผลการค้นหา ({searchResult.length} รายการ):
                </h3>

                {searchResult.length === 0 ? (
                  <div className="p-10 text-center bg-slate-50 rounded-3xl border border-slate-200 text-slate-500 text-sm font-medium">
                    ไม่พบข้อมูลคำร้องที่ตรงกับคำค้นหา กรุณาตรวจสอบรหัสคำร้องหรือเบอร์โทรศัพท์อีกครั้ง
                  </div>
                ) : (
                  searchResult.map((p) => (
                    <div
                      key={p.id}
                      className="p-6 rounded-3xl border-2 border-slate-200 bg-slate-50/70 hover:bg-white hover:border-amber-400 transition-all shadow-sm space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                        <div>
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono font-black text-base sm:text-lg text-slate-900">
                              {p.trackingCode}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                              ({new Date(p.createdAt).toLocaleDateString('th-TH')})
                            </span>
                          </div>
                          <div className="text-sm sm:text-base font-black text-slate-800 mt-1">
                            {p.title}
                          </div>
                        </div>

                        <div>{getStatusBadge(p.status)}</div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-slate-700">
                        <div>
                          <strong>ผู้ยื่นคำร้อง:</strong> {p.petitionerName} ({p.petitionerPhone})
                        </div>
                        <div>
                          <strong>สถานที่ / พิกัด:</strong> {p.incidentLocation || p.petitionerAddress}
                        </div>
                        <div>
                          <strong>ผู้รับผิดชอบงาน:</strong> {p.assignedTo || 'กองสาธารณสุขและสิ่งแวดล้อม'}
                        </div>
                        {p.targetDate && (
                          <div>
                            <strong>วันนัดหมายดำเนินการ:</strong> {p.targetDate}
                          </div>
                        )}
                      </div>

                      {p.resolutionNotes && (
                        <div className="p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-300 text-emerald-950 text-xs sm:text-sm font-medium">
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

      {/* Public Footer (NO phone numbers) */}
      <footer className="w-full bg-slate-950/80 border-t border-emerald-500/20 py-4 px-4 sm:px-8 text-center text-xs sm:text-sm text-emerald-300/80 font-medium">
        <div>
          © 2569 กองสาธารณสุขและสิ่งแวดล้อม เทศบาลตำบลบางเป้า อำเภอกันตัง จังหวัดตรัง
        </div>
      </footer>
    </div>
  );
};
