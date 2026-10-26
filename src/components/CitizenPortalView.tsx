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
  Stethoscope,
  HeartPulse,
  Camera,
  Upload,
  X,
  ChevronRight,
  Image as ImageIcon,
  FileCheck,
  Check,
  Copy,
  Info,
  Layers,
  PhoneCall,
  User,
  ShieldCheck,
  HelpCircle,
  RotateCcw,
} from 'lucide-react';
import {
  PublicPetition,
  PetitionCategory,
  PetitionStatus,
  EquipmentLoan,
  MedicalEquipment,
} from '../types/index.ts';
import { INITIAL_MEDICAL_EQUIPMENT } from '../data/mockData.ts';

interface CitizenPortalViewProps {
  petitions: PublicPetition[];
  loans?: EquipmentLoan[];
  equipmentList?: MedicalEquipment[];
  onAddPetition: (petition: PublicPetition) => void;
  onAddEquipmentLoan?: (loan: EquipmentLoan) => void;
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
  loans = [],
  equipmentList = INITIAL_MEDICAL_EQUIPMENT,
  onAddPetition,
  onAddEquipmentLoan,
  onExitCitizenMode,
  onShowToast,
}) => {
  // Read initial tab from URL query params (e.g. ?portal=citizen&tab=med_loan)
  const [activeTab, setActiveTab] = useState<'general' | 'sewage' | 'med_loan' | 'tracking'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const t = params.get('tab') || params.get('service');
      if (t === 'med_loan' || t === 'equipment') return 'med_loan';
      if (t === 'sewage') return 'sewage';
      if (t === 'tracking') return 'tracking';
    }
    return 'general';
  });

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

  // Helper formatters
  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const formatIdCard = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 13);
    if (digits.length <= 1) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 1)}-${digits.slice(1)}`;
    if (digits.length <= 10) return `${digits.slice(0, 1)}-${digits.slice(1, 5)}-${digits.slice(5)}`;
    if (digits.length <= 12) return `${digits.slice(0, 1)}-${digits.slice(1, 5)}-${digits.slice(5, 10)}-${digits.slice(10)}`;
    return `${digits.slice(0, 1)}-${digits.slice(1, 5)}-${digits.slice(5, 10)}-${digits.slice(10, 12)}-${digits.slice(12)}`;
  };

  // ===================== GENERAL & SEWAGE PETITION FORM STATE =====================
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

  // General Pinning State
  const [pinLat, setPinLat] = useState<number>(7.3985);
  const [pinLng, setPinLng] = useState<number>(99.4920);
  const [pinLandmark, setPinLandmark] = useState<string>('บ้านบางเป้า (หมู่ 1)');
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // ===================== MEDICAL EQUIPMENT LOAN FORM STATE =====================
  const [medCategoryFilter, setMedCategoryFilter] = useState<string>('all');
  const [selectedEquipment, setSelectedEquipment] = useState<MedicalEquipment | null>(null);
  const [isQueueBooking, setIsQueueBooking] = useState<boolean>(false);

  const [medBorrowerPrefix, setMedBorrowerPrefix] = useState('นาย');
  const [medBorrowerName, setMedBorrowerName] = useState('');
  const [medBorrowerIdCard, setMedBorrowerIdCard] = useState('');
  const [medBorrowerPhone, setMedBorrowerPhone] = useState('');
  const [medBorrowerRelation, setMedBorrowerRelation] = useState('บุตร/ธิดา');

  const [isPatientSameAsBorrower, setIsPatientSameAsBorrower] = useState(false);
  const [medPatientPrefix, setMedPatientPrefix] = useState('นาย');
  const [medPatientName, setMedPatientName] = useState('');
  const [medPatientIdCard, setMedPatientIdCard] = useState('');
  const [medPatientAge, setMedPatientAge] = useState('');
  const [medPatientDiagnosis, setMedPatientDiagnosis] = useState('');

  const [medDeliveryAddress, setMedDeliveryAddress] = useState('');
  const [medMoo, setMedMoo] = useState('1');
  const [medLandmark, setMedLandmark] = useState('บ้านบางเป้า (หมู่ 1)');
  const [medPinLat, setMedPinLat] = useState<number>(7.3985);
  const [medPinLng, setMedPinLng] = useState<number>(99.4920);
  const [isMedLocating, setIsMedLocating] = useState<boolean>(false);

  const [medDocPhoto1, setMedDocPhoto1] = useState<string | null>(null);
  const [medDocPhoto2, setMedDocPhoto2] = useState<string | null>(null);
  const [medNotes, setMedNotes] = useState('');
  const [medSubmittedCode, setMedSubmittedCode] = useState<string | null>(null);
  const [medSubmittedItem, setMedSubmittedItem] = useState<MedicalEquipment | null>(null);

  // ===================== TRACKING SEARCH STATE =====================
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<PublicPetition[] | null>(null);
  const [loanSearchResult, setLoanSearchResult] = useState<EquipmentLoan[] | null>(null);

  // Handle GPS location capture (General)
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

  // Handle GPS location capture (Medical Loan)
  const handleGetMedLiveGPS = () => {
    if (!navigator.geolocation) {
      onShowToast('error', 'อุปกรณ์ของคุณไม่รองรับการระบุพิกัด GPS อัตโนมัติ กรุณาเลือกหมู่บ้านแทน');
      return;
    }
    setIsMedLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsMedLocating(false);
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        setMedPinLat(lat);
        setMedPinLng(lng);
        setMedLandmark(`พิกัด GPS ปัจจุบัน (${lat}, ${lng})`);
        onShowToast('success', `ปักหมุดพิกัดส่งอุปกรณ์สำเร็จ: ${lat}, ${lng}`);
      },
      (err) => {
        setIsMedLocating(false);
        console.warn('Geolocation error:', err);
        onShowToast('info', 'ไม่สามารถดึงพิกัดอัตโนมัติได้ กรุณาเลือกหมู่บ้านด้านล่าง');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSelectMedVillage = (v: VillagePreset) => {
    setMedMoo(v.moo);
    setMedPinLat(v.lat);
    setMedPinLng(v.lng);
    setMedLandmark(`หมู่ ${v.moo} ${v.name} (${v.landmark})`);
    onShowToast('info', `ปักหมุดพิกัด: หมู่ ${v.moo} ${v.name}`);
  };

  // Handle Photo Attachments (Base64)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'idCard' | 'house') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      onShowToast('error', 'ขนาดไฟล์เกิน 5MB กรุณาเลือกไฟล์ที่ขนาดเล็กลง');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      if (field === 'idCard') {
        setMedDocPhoto1(base64);
        onShowToast('success', 'แนบรูปภาพบัตรประชาชนเรียบร้อย');
      } else {
        setMedDocPhoto2(base64);
        onShowToast('success', 'แนบรูปภาพหน้าบ้านเรียบร้อย');
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit General or Sewage Petition
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

  // Submit Medical Equipment Loan Form
  const handleSubmitMedLoan = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEquipment) {
      onShowToast('error', 'กรุณาเลือกอุปกรณ์ที่ต้องการยืม');
      return;
    }

    if (!medBorrowerName.trim()) {
      onShowToast('error', 'กรุณากรอกชื่อ-นามสกุลของผู้ขอยืม');
      return;
    }

    if (!medBorrowerPhone.trim()) {
      onShowToast('error', 'กรุณากรอกเบอร์โทรศัพท์ติดต่อ');
      return;
    }

    const patientFullName = isPatientSameAsBorrower 
      ? `${medBorrowerPrefix} ${medBorrowerName.trim()}`
      : `${medPatientPrefix} ${medPatientName.trim() || medBorrowerName.trim()}`;

    const patientId = isPatientSameAsBorrower 
      ? medBorrowerIdCard.trim() 
      : (medPatientIdCard.trim() || medBorrowerIdCard.trim());

    const borrowerFullName = `${medBorrowerPrefix} ${medBorrowerName.trim()}`;
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const trackingCode = `MED-2569-${randNum}`;

    const fullDeliveryAddress = `${medDeliveryAddress.trim() || '-'} หมู่ ${medMoo} ต.บางเป้า อ.กันตัง จ.ตรัง`;

    const newLoan: EquipmentLoan = {
      id: `LOAN-${Date.now()}`,
      loanCode: trackingCode,
      docNo: trackingCode,
      contractNumber: `LN-69/${randNum}`,
      equipmentId: selectedEquipment.id,
      equipmentCode: selectedEquipment.assetCode,
      equipmentName: selectedEquipment.name,
      equipmentCategory: selectedEquipment.category,
      borrowerName: borrowerFullName,
      borrowerIdCard: medBorrowerIdCard.trim() || '-',
      borrowerNationalId: medBorrowerIdCard.trim() || '-',
      borrowerPhone: medBorrowerPhone.trim(),
      phone: medBorrowerPhone.trim(),
      borrowerAddress: fullDeliveryAddress,
      address: fullDeliveryAddress,
      borrowerRelation: isPatientSameAsBorrower ? 'ตนเอง (ผู้ป่วยยืมเอง)' : medBorrowerRelation,
      relationshipWithPatient: isPatientSameAsBorrower ? 'ตนเอง' : medBorrowerRelation,
      patientName: patientFullName,
      patientIdCard: patientId || '-',
      patientNationalId: patientId || '-',
      patientAge: medPatientAge ? parseInt(medPatientAge, 10) : undefined,
      patientDiagnosis: medPatientDiagnosis.trim() || 'ผู้ป่วยพักฟื้นที่บ้าน',
      patientAddress: fullDeliveryAddress,
      patientPhone: medBorrowerPhone.trim(),
      loanDate: new Date().toISOString().split('T')[0],
      borrowDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 6 เดือน
      status: 'pending',
      officerInCharge: 'กองสาธารณสุขและสิ่งแวดล้อม เทศบาลตำบลบางเป้า',
      notes: `[คำขอออนไลน์จากประชาชน] ${isQueueBooking ? '*(ลงชื่อเข้าคิวจอง)* ' : ''}จุดสังเกต: ${medLandmark || '-'} | อาการ: ${medPatientDiagnosis || '-'}`,
      latitude: medPinLat,
      longitude: medPinLng,
      moo: medMoo,
      isPublicCitizenRequest: true,
    };

    if (onAddEquipmentLoan) {
      onAddEquipmentLoan(newLoan);
    }

    setMedSubmittedCode(trackingCode);
    setMedSubmittedItem(selectedEquipment);
    onShowToast('success', `ส่งคำขอยืม ${selectedEquipment.name} เรียบร้อยแล้ว รหัสติดตามคือ ${trackingCode}`);
  };

  // Search Tracking for both Petitions & Equipment Loans
  const handleSearchTracking = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      setSearchResult(null);
      setLoanSearchResult(null);
      return;
    }

    // 1. Search Petitions
    const matchedPetitions = petitions.filter(
      (p) =>
        p.trackingCode.toLowerCase().includes(query) ||
        p.petitionerPhone.includes(query) ||
        p.petitionerName.toLowerCase().includes(query)
    );
    setSearchResult(matchedPetitions);

    // 2. Search Equipment Loans
    const matchedLoans = loans.filter(
      (l) =>
        (l.loanCode && l.loanCode.toLowerCase().includes(query)) ||
        (l.contractNumber && l.contractNumber.toLowerCase().includes(query)) ||
        (l.docNo && l.docNo.toLowerCase().includes(query)) ||
        (l.phone && l.phone.includes(query)) ||
        (l.borrowerPhone && l.borrowerPhone.includes(query)) ||
        (l.borrowerName && l.borrowerName.toLowerCase().includes(query)) ||
        (l.patientName && l.patientName.toLowerCase().includes(query))
    );
    setLoanSearchResult(matchedLoans);
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
            <Clock className="w-4 h-4 text-blue-700 animate-spin" />
            <span>กำลังดำเนินการ / ลงพื้นที่</span>
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

  const getLoanStatusBadge = (status: EquipmentLoan['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
            <Clock className="w-4 h-4 text-amber-700" />
            <span>1. รับคำขอแล้ว (รอเจ้าหน้าที่ตรวจสอบสต็อก)</span>
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold bg-blue-100 text-blue-900 border border-blue-300 shadow-2xs">
            <FileCheck className="w-4 h-4 text-blue-700" />
            <span>2. อนุมัติแล้ว (เตรียมจัดส่ง & ปริ้นสัญญา)</span>
          </span>
        );
      case 'borrowed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span>3. ส่งมอบเรียบร้อย (อยู่ระหว่างการยืมใช้งาน)</span>
          </span>
        );
      case 'returned':
        return (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs">
            <RotateCcw className="w-4 h-4 text-purple-700" />
            <span>4. ส่งคืนอุปกรณ์เข้าคลังเรียบร้อย</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold bg-slate-100 text-slate-800 border border-slate-300">
            <span>อยู่ระหว่างดำเนินการ</span>
          </span>
        );
    }
  };

  // Filtered Equipment List for Catalog
  const filteredEquipment = equipmentList.filter((item) => {
    if (medCategoryFilter === 'all') return true;
    return item.category === medCategoryFilter;
  });

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
            ยินดีต้อนรับสู่ระบบบริการประชาชนออนไลน์ เทศบาลตำบลบางเป้า
          </h2>
          <p className="text-xs sm:text-sm text-emerald-200/90 mt-1 font-medium">
            บริการยื่นคำร้อง ดูดสิ่งปฏิกูล และขอยืมอุปกรณ์ทางการแพทย์ส่งตรงถึงบ้านผู้ป่วย พร้อมปักหมุด GPS นำทาง
          </p>
        </div>

        {/* Navigation Tabs (4 Tabs) */}
        <div className="flex flex-wrap gap-2 sm:gap-2.5 mb-6 bg-slate-950/60 p-2 rounded-3xl border border-emerald-500/30 shadow-xl">
          <button
            onClick={() => {
              setActiveTab('general');
              setSubmittedCode(null);
            }}
            className={`flex-1 min-w-[140px] sm:min-w-[160px] flex items-center justify-center gap-2 py-3 px-3 sm:px-4 rounded-2xl text-xs sm:text-sm md:text-base font-black transition-all cursor-pointer ${
              activeTab === 'general'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/40'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span>1. คำร้องทั่วไป & ร้องเรียน</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('sewage');
              setSubmittedCode(null);
            }}
            className={`flex-1 min-w-[140px] sm:min-w-[160px] flex items-center justify-center gap-2 py-3 px-3 sm:px-4 rounded-2xl text-xs sm:text-sm md:text-base font-black transition-all cursor-pointer ${
              activeTab === 'sewage'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Truck className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span>2. ขอดูดสิ่งปฏิกูล (ส้วม)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('med_loan');
              setSubmittedCode(null);
            }}
            className={`flex-1 min-w-[140px] sm:min-w-[160px] flex items-center justify-center gap-2 py-3 px-3 sm:px-4 rounded-2xl text-xs sm:text-sm md:text-base font-black transition-all cursor-pointer ${
              activeTab === 'med_loan'
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/40 ring-2 ring-teal-400'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Stethoscope className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-teal-300" />
            <span>3. ยืมอุปกรณ์การแพทย์</span>
            <span className="hidden lg:inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-teal-400 text-slate-950 font-bold">
              ฟรี
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('tracking');
              setSubmittedCode(null);
            }}
            className={`flex-1 min-w-[140px] sm:min-w-[160px] flex items-center justify-center gap-2 py-3 px-3 sm:px-4 rounded-2xl text-xs sm:text-sm md:text-base font-black transition-all cursor-pointer ${
              activeTab === 'tracking'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/40'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Search className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span>4. ติดตามสถานะ</span>
          </button>
        </div>

        {/* Success Modal / Banner after Petition submission */}
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

        {/* ==================== TAB 1: GENERAL PETITION ==================== */}
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
                    onChange={(e) => setPetitionerPhone(formatPhone(e.target.value))}
                    placeholder="เช่น 081-234-5678"
                    className="w-full p-3.5 rounded-2xl border-2 border-slate-300 text-base font-semibold text-slate-900 bg-slate-50 focus:ring-2 focus:ring-emerald-600 font-mono"
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
                  หัวข้อเรื่องที่ร้องเรียน / ความประสงค์ *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="เช่น มีกลิ่นควันรบกวนในเวลากลางคืน, ขอให้ช่วยตรวจสอบน้ำเสีย"
                  className="w-full p-3.5 rounded-2xl border-2 border-slate-300 text-base font-semibold text-slate-900 bg-slate-50 focus:ring-2 focus:ring-emerald-600"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-2">
                  รายละเอียดเหตุการณ์ / ข้อมูลเพิ่มเติม *
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="ระบุรายละเอียดของปัญหา ช่วงเวลาที่เกิดเหตุ หรือบุคคลที่เกี่ยวข้อง..."
                  className="w-full p-3.5 rounded-2xl border-2 border-slate-300 text-base font-normal text-slate-900 bg-slate-50 focus:ring-2 focus:ring-emerald-600"
                  required
                />
              </div>

              {/* Location & GPS Mapping */}
              <div className="p-5 rounded-2xl bg-emerald-50/70 border-2 border-emerald-200 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="font-black text-emerald-950 flex items-center gap-2 text-base">
                    <MapPin className="w-5 h-5 text-emerald-700" />
                    <span>ระบุตำแหน่งสถานที่เกิดเหตุ & ปักหมุดแผนที่ GPS *</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleGetLiveGPS}
                    disabled={isLocating}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                  >
                    <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                    <span>{isLocating ? 'กำลังดึงพิกัด GPS...' : '📍 ใช้ตำแหน่งปัจจุบันของฉัน'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="font-bold text-slate-700 block mb-1 text-sm">
                      บ้านเลขที่ / ซอย / ถนน / จุดสังเกต
                    </label>
                    <input
                      type="text"
                      value={petitionerAddress}
                      onChange={(e) => setPetitionerAddress(e.target.value)}
                      placeholder="เช่น 123/4 ซอยร่วมใจ ถนนบางเป้า-กันตัง"
                      className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1 text-sm">หมู่ที่ (ต.บางเป้า) *</label>
                    <select
                      value={petitionerMoo}
                      onChange={(e) => setPetitionerMoo(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 bg-white"
                    >
                      {BANGPAO_VILLAGES.map((v) => (
                        <option key={v.moo} value={v.moo}>
                          หมู่ {v.moo} {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Village Quick Select Buttons */}
                <div>
                  <div className="text-xs font-bold text-slate-600 mb-2">
                    หรือคลิกเลือกหมู่บ้านเพื่อปักหมุดด่วน:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {BANGPAO_VILLAGES.map((v) => (
                      <button
                        key={v.moo}
                        type="button"
                        onClick={() => {
                          setPetitionerMoo(v.moo);
                          setPinLat(v.lat);
                          setPinLng(v.lng);
                          setPinLandmark(`หมู่ ${v.moo} ${v.name} (${v.landmark})`);
                          onShowToast('info', `ปักหมุดตำแหน่ง: หมู่ ${v.moo} ${v.name}`);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          petitionerMoo === v.moo
                            ? 'bg-emerald-700 text-white shadow-xs'
                            : 'bg-white text-slate-700 hover:bg-emerald-100 border border-slate-200'
                        }`}
                      >
                        ม.{v.moo} {v.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Coordinate badge */}
                <div className="p-3 bg-white rounded-xl border border-emerald-300 flex items-center justify-between text-xs text-emerald-950 font-mono font-bold">
                  <span>พิกัด GPS: {pinLat.toFixed(6)}, {pinLng.toFixed(6)}</span>
                  <span className="text-[11px] font-sans font-semibold text-slate-500">{pinLandmark}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-lg shadow-xl cursor-pointer hover:shadow-2xl transition-all flex items-center justify-center gap-2 active:scale-98"
                >
                  <Send className="w-5 h-5" />
                  <span>ส่งคำร้องถึงเทศบาลตำบลบางเป้า</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ==================== TAB 2: SEWAGE PETITION ==================== */}
        {activeTab === 'sewage' && (
          <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-9 shadow-2xl border-2 border-blue-100">
            <div className="flex items-center gap-3.5 pb-5 mb-6 border-b border-slate-200">
              <div className="w-12 h-12 rounded-2xl bg-blue-800 text-white flex items-center justify-center shadow-md shrink-0">
                <Truck className="w-6 h-6 text-blue-300" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  แบบฟอร์มขอรับบริการสูบสิ่งปฏิกูล (ดูดส้วม)
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  อัตราค่าธรรมเนียมตามเทศบัญญัติ 250 บาท ต่อ 1 ลูกบาศก์เมตร (ลบ.ม.)
                </p>
              </div>
            </div>

            <form onSubmit={(e) => handleSubmitForm(e, 'sewage')} className="space-y-5 text-sm sm:text-base">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="font-bold text-slate-800 block mb-2">
                    ชื่อ-นามสกุล ผู้ขอรับบริการ *
                  </label>
                  <input
                    type="text"
                    value={petitionerName}
                    onChange={(e) => setPetitionerName(e.target.value)}
                    placeholder="กรอกชื่อและนามสกุลจริง"
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
                    onChange={(e) => setPetitionerPhone(formatPhone(e.target.value))}
                    placeholder="เช่น 081-234-5678"
                    className="w-full p-3.5 rounded-2xl border-2 border-slate-300 text-base font-semibold text-slate-900 bg-slate-50 focus:ring-2 focus:ring-blue-600 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="font-bold text-slate-800 block mb-2">
                    ปริมาณสิ่งปฏิกูลโดยประมาณ (ลูกบาศก์เมตร) *
                  </label>
                  <select
                    value={sewageVolume}
                    onChange={(e) => setSewageVolume(e.target.value)}
                    className="w-full p-3.5 rounded-2xl border-2 border-slate-300 text-base font-bold text-slate-900 bg-white focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="1">1 ลบ.ม. (250 บาท)</option>
                    <option value="2">2 ลบ.ม. (500 บาท)</option>
                    <option value="3">3 ลบ.ม. (750 บาท)</option>
                    <option value="4">4 ลบ.ม. (1,000 บาท)</option>
                    <option value="5">5 ลบ.ม. ขึ้นไป (ตามวัดจริง)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-800 block mb-2">
                    วันที่สะดวกให้เข้าดำเนินการเบื้องต้น *
                  </label>
                  <input
                    type="date"
                    value={desiredDate}
                    onChange={(e) => setDesiredDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full p-3.5 rounded-2xl border-2 border-slate-300 text-base font-bold text-slate-900 bg-slate-50 focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>
              </div>

              {/* Location & GPS Mapping */}
              <div className="p-5 rounded-2xl bg-blue-50/70 border-2 border-blue-200 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="font-black text-blue-950 flex items-center gap-2 text-base">
                    <MapPin className="w-5 h-5 text-blue-700" />
                    <span>ระบุตำแหน่งบ้านที่ต้องการให้รถดูดส้วมเข้าบริการ *</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleGetLiveGPS}
                    disabled={isLocating}
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                  >
                    <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                    <span>{isLocating ? 'กำลังดึงพิกัด GPS...' : '📍 ใช้ตำแหน่งปัจจุบันของฉัน'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="font-bold text-slate-700 block mb-1 text-sm">
                      บ้านเลขที่ / ซอย / ถนน / จุดสังเกต
                    </label>
                    <input
                      type="text"
                      value={petitionerAddress}
                      onChange={(e) => setPetitionerAddress(e.target.value)}
                      placeholder="เช่น 45/1 หมู่ 2 ซอยท่าเรือ ตรงข้ามร้านชำ"
                      className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1 text-sm">หมู่ที่ (ต.บางเป้า) *</label>
                    <select
                      value={petitionerMoo}
                      onChange={(e) => setPetitionerMoo(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 bg-white"
                    >
                      {BANGPAO_VILLAGES.map((v) => (
                        <option key={v.moo} value={v.moo}>
                          หมู่ {v.moo} {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Coordinate badge */}
                <div className="p-3 bg-white rounded-xl border border-blue-300 flex items-center justify-between text-xs text-blue-950 font-mono font-bold">
                  <span>พิกัด GPS สำหรับรถบรรทุก: {pinLat.toFixed(6)}, {pinLng.toFixed(6)}</span>
                  <span className="text-[11px] font-sans font-semibold text-slate-500">{pinLandmark}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-4 rounded-2xl bg-blue-700 hover:bg-blue-800 text-white font-black text-lg shadow-xl cursor-pointer hover:shadow-2xl transition-all flex items-center justify-center gap-2 active:scale-98"
                >
                  <Send className="w-5 h-5" />
                  <span>ส่งคำร้องขอรับบริการดูดส้วม</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ==================== TAB 3: MEDICAL EQUIPMENT LOAN ==================== */}
        {activeTab === 'med_loan' && (
          <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-9 shadow-2xl border-2 border-teal-100 space-y-7">
            {/* Header */}
            <div className="flex items-center gap-3.5 pb-5 border-b border-slate-200">
              <div className="w-12 h-12 rounded-2xl bg-teal-800 text-white flex items-center justify-center shadow-md shrink-0">
                <Stethoscope className="w-6 h-6 text-teal-300" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                    บริการยืม-คืนอุปกรณ์ทางการแพทย์เพื่อการฟื้นฟูสุขภาพที่บ้าน
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-900 border border-teal-300">
                    ไม่มีค่าใช้จ่าย
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                  เทศบาลตำบลบางเป้าจัดส่งอุปกรณ์ถึงบ้านผู้ป่วย พร้อมนำเอกสารสัญญาไปให้ลงนามถึงที่บ้าน
                </p>
              </div>
            </div>

            {/* Success Banner if submitted */}
            {medSubmittedCode ? (
              <div className="p-7 rounded-3xl bg-teal-900 border-2 border-teal-400 text-white text-center shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 bg-teal-400 text-slate-950 rounded-full flex items-center justify-center mx-auto shadow-xl">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black">
                  {isQueueBooking ? 'ลงชื่อเข้าคิวจองอุปกรณ์เรียบร้อยแล้ว!' : 'ส่งคำขอยืมอุปกรณ์ทางการแพทย์เรียบร้อยแล้ว!'}
                </h3>
                <p className="text-sm text-teal-100 max-w-xl mx-auto leading-relaxed">
                  อุปกรณ์: <strong className="text-white text-base">{medSubmittedItem?.name}</strong>
                  <br />
                  เจ้าหน้าที่จะตรวจสอบข้อมูล และเป็นผู้โทรประสานนัดหมายวันเวลาส่งมอบอุปกรณ์ถึงบ้านท่าน พร้อมนำเอกสารสัญญาไปให้ลงนามถึงที่บ้าน (ลักษณะเหมือนระบบส่งพัสดุ)
                </p>

                <div className="inline-block px-6 py-3 rounded-2xl bg-slate-950/70 border-2 border-teal-400/60 text-teal-300 font-mono text-xl sm:text-2xl font-black tracking-widest shadow-inner">
                  รหัสคำขอ: {medSubmittedCode}
                </div>

                {/* Remind documents */}
                <div className="p-4 bg-teal-950/80 rounded-2xl border border-teal-500/40 text-left max-w-lg mx-auto text-xs sm:text-sm text-teal-100 space-y-1.5">
                  <div className="font-bold text-amber-300 flex items-center gap-1.5">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>เอกสารที่ต้องเตรียมไว้รอเจ้าหน้าที่นำส่งของ:</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-slate-200 text-xs">
                    <li>สำเนาบัตรประจำตัวประชาชนของผู้ขอยืม 1 ฉบับ</li>
                    <li>สำเนาบัตรประจำตัวประชาชนของผู้ป่วย 1 ฉบับ</li>
                    <li>สำเนาทะเบียนบ้าน 1 ฉบับ</li>
                    <li>ใบรับรองแพทย์หรือสมุดประจำตัวคนพิการ (ถ้ามี)</li>
                  </ul>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(medSubmittedCode || '');
                      onShowToast('success', 'คัดลอกรหัสคำขอแล้ว');
                    }}
                    className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5 shadow-md"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>คัดลอกรหัส</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery(medSubmittedCode || '');
                      setActiveTab('tracking');
                      setMedSubmittedCode(null);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-black text-xs cursor-pointer flex items-center gap-1.5 shadow-md"
                  >
                    <span>ติดตามสถานะคำขอนี้</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMedSubmittedCode(null);
                      setSelectedEquipment(null);
                      setIsQueueBooking(false);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs cursor-pointer"
                  >
                    ขอยืมอุปกรณ์รายการอื่น
                  </button>
                </div>
              </div>
            ) : !selectedEquipment ? (
              /* STEP 1: Equipment Catalog */
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                    <h3 className="text-base sm:text-lg font-black text-slate-800 flex items-center gap-2">
                      <Layers className="w-5 h-5 text-teal-700" />
                      <span>ขั้นตอนที่ 1: เลือกอุปกรณ์ทางการแพทย์ที่ต้องการยืม</span>
                    </h3>
                    <span className="text-xs text-slate-500 font-semibold">
                      แสดง {filteredEquipment.length} รายการ
                    </span>
                  </div>

                  {/* Category Pills */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'all', label: 'ทั้งหมด' },
                      { id: 'bed', label: '🛏️ เตียงผู้ป่วย' },
                      { id: 'wheelchair', label: '♿ รถเข็นวีลแชร์' },
                      { id: 'oxygen_concentrator', label: '🧪 ผลิตออกซิเจน' },
                      { id: 'air_mattress', label: '💨 ที่นอนลม' },
                      { id: 'suction_machine', label: '🫁 เครื่องดูดเสมหะ' },
                      { id: 'walker', label: '🦯 ไม้เท้า/โครงช่วยเดิน' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setMedCategoryFilter(cat.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          medCategoryFilter === cat.id
                            ? 'bg-teal-800 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-teal-50 border border-slate-200'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Catalog Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredEquipment.map((eq) => {
                    const isAvailable = eq.availableQuantity > 0;
                    return (
                      <div
                        key={eq.id}
                        className={`rounded-2xl border-2 transition-all flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md ${
                          isAvailable
                            ? 'border-teal-200 bg-white hover:border-teal-500'
                            : 'border-amber-200 bg-amber-50/30 hover:border-amber-400'
                        }`}
                      >
                        <div>
                          {/* Image */}
                          <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                            <img
                              src={eq.imageUrl || 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=400&auto=format&fit=crop&q=80'}
                              alt={eq.name}
                              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                            />
                            <div className="absolute top-2.5 right-2.5">
                              {isAvailable ? (
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-600 text-white shadow-md inline-flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  <span>ว่าง {eq.availableQuantity} ชิ้น</span>
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-600 text-white shadow-md inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>มีผู้ยืมครบแล้ว</span>
                                </span>
                              )}
                            </div>
                            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-black/60 text-white text-[10px] font-mono">
                              รหัส: {eq.assetCode}
                            </div>
                          </div>

                          {/* Content */}
                          <div className="p-4 space-y-2">
                            <h4 className="font-black text-slate-900 text-base leading-snug line-clamp-2">
                              {eq.name}
                            </h4>
                            <p className="text-xs text-slate-500 font-medium">
                              คลัง: {eq.storageLocation}
                            </p>
                          </div>
                        </div>

                        {/* Card Footer Button */}
                        <div className="p-4 pt-0">
                          {isAvailable ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedEquipment(eq);
                                setIsQueueBooking(false);
                              }}
                              className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs sm:text-sm font-black shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>เลือกขอยืมอุปกรณ์นี้</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedEquipment(eq);
                                setIsQueueBooking(true);
                              }}
                              className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs sm:text-sm font-black shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                              title="ขณะนี้อุปกรณ์หมด สามารถลงชื่อเข้าคิวจองไว้ได้ เมื่อมีของส่งคืนเจ้าหน้าที่จะติดต่อกลับทันที"
                            >
                              <Clock className="w-4 h-4" />
                              <span>ลงชื่อเข้าคิวจองไว้ก่อน</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* STEP 2: Application Form */
              <form onSubmit={handleSubmitMedLoan} className="space-y-6 text-sm sm:text-base">
                {/* Selected Equipment Bar */}
                <div className="p-4 rounded-2xl bg-teal-50 border-2 border-teal-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={selectedEquipment.imageUrl}
                      alt={selectedEquipment.name}
                      className="w-16 h-16 rounded-xl object-cover border border-teal-300 shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-md">
                          {selectedEquipment.assetCode}
                        </span>
                        {isQueueBooking ? (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                            ⏳ บันทึกเข้าคิวจอง
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                            🟢 มีของพร้อมให้บริการ
                          </span>
                        )}
                      </div>
                      <div className="font-black text-slate-900 text-base sm:text-lg mt-0.5">
                        {selectedEquipment.name}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEquipment(null);
                      setIsQueueBooking(false);
                    }}
                    className="px-4 py-2 bg-white hover:bg-slate-100 text-teal-800 border border-teal-300 rounded-xl text-xs font-bold cursor-pointer shrink-0 transition-all shadow-2xs"
                  >
                    ← เลือกอุปกรณ์อื่น
                  </button>
                </div>

                {/* Section 1: ข้อมูลผู้ขอยืม (ญาติ / ผู้ดูแล) */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                  <div className="font-black text-slate-800 flex items-center gap-2 text-base border-b border-slate-200 pb-2">
                    <User className="w-5 h-5 text-teal-700" />
                    <span>ส่วนที่ 1: ข้อมูลผู้ขอยืม (ญาติผู้ดูแล หรือผู้ยืม)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1 text-xs">คำนำหน้า *</label>
                      <select
                        value={medBorrowerPrefix}
                        onChange={(e) => setMedBorrowerPrefix(e.target.value)}
                        className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold bg-white"
                      >
                        <option value="นาย">นาย</option>
                        <option value="นาง">นาง</option>
                        <option value="นางสาว">นางสาว</option>
                        <option value="คุณ">คุณ</option>
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="font-bold text-slate-700 block mb-1 text-xs">ชื่อ-นามสกุล ผู้ขอยืม *</label>
                      <input
                        type="text"
                        value={medBorrowerName}
                        onChange={(e) => setMedBorrowerName(e.target.value)}
                        placeholder="เช่น นายสมชาย ใจดี"
                        className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold bg-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1 text-xs">
                        เลขบัตรประจำตัวประชาชน 13 หลัก *
                      </label>
                      <input
                        type="text"
                        value={medBorrowerIdCard}
                        onChange={(e) => setMedBorrowerIdCard(formatIdCard(e.target.value))}
                        placeholder="x-xxxx-xxxxx-xx-x"
                        className="w-full p-3 rounded-xl border border-slate-300 text-sm font-mono font-semibold bg-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1 text-xs">
                        เบอร์โทรศัพท์ที่ติดต่อได้สะดวก *
                      </label>
                      <input
                        type="tel"
                        value={medBorrowerPhone}
                        onChange={(e) => setMedBorrowerPhone(formatPhone(e.target.value))}
                        placeholder="08x-xxx-xxxx"
                        className="w-full p-3 rounded-xl border border-slate-300 text-sm font-mono font-semibold bg-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1 text-xs">
                        ความสัมพันธ์กับผู้ป่วย *
                      </label>
                      <select
                        value={medBorrowerRelation}
                        onChange={(e) => setMedBorrowerRelation(e.target.value)}
                        className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold bg-white"
                      >
                        <option value="บุตร/ธิดา">บุตร / ธิดา</option>
                        <option value="คู่สมรส">คู่สมรส (สามี/ภรรยา)</option>
                        <option value="บิดา/มารดา">บิดา / มารดา</option>
                        <option value="พี่น้อง">พี่น้อง</option>
                        <option value="ญาติผู้ดูแล">ญาติผู้ดูแล</option>
                        <option value="อสม./ผู้ดูแล">อสม. / ผู้ดูแล (CG)</option>
                        <option value="ตนเอง">ตนเอง (ผู้ป่วยขอยืมเอง)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 2: ข้อมูลผู้ป่วย */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-200 pb-2">
                    <div className="font-black text-slate-800 flex items-center gap-2 text-base">
                      <HeartPulse className="w-5 h-5 text-teal-700" />
                      <span>ส่วนที่ 2: ข้อมูลผู้ป่วยที่จำเป็นต้องใช้อุปกรณ์</span>
                    </div>

                    <label className="flex items-center gap-2 text-xs font-bold text-teal-900 cursor-pointer bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-200">
                      <input
                        type="checkbox"
                        checked={isPatientSameAsBorrower}
                        onChange={(e) => setIsPatientSameAsBorrower(e.target.checked)}
                        className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                      />
                      <span>ผู้ป่วยคือคนเดียวกับผู้ขอยืม (ไม่ต้องกรอกซ้ำ)</span>
                    </label>
                  </div>

                  {!isPatientSameAsBorrower && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1 text-xs">คำนำหน้า *</label>
                          <select
                            value={medPatientPrefix}
                            onChange={(e) => setMedPatientPrefix(e.target.value)}
                            className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold bg-white"
                          >
                            <option value="นาย">นาย</option>
                            <option value="นาง">นาง</option>
                            <option value="นางสาว">นางสาว</option>
                            <option value="เด็กชาย">เด็กชาย</option>
                            <option value="เด็กหญิง">เด็กหญิง</option>
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="font-bold text-slate-700 block mb-1 text-xs">
                            ชื่อ-นามสกุล ผู้ป่วย *
                          </label>
                          <input
                            type="text"
                            value={medPatientName}
                            onChange={(e) => setMedPatientName(e.target.value)}
                            placeholder="ระบุชื่อผู้ป่วย"
                            className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold bg-white"
                            required={!isPatientSameAsBorrower}
                          />
                        </div>

                        <div>
                          <label className="font-bold text-slate-700 block mb-1 text-xs">อายุ (ปี)</label>
                          <input
                            type="number"
                            value={medPatientAge}
                            onChange={(e) => setMedPatientAge(e.target.value)}
                            placeholder="เช่น 75"
                            className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1 text-xs">
                            เลขประจำตัวประชาชนผู้ป่วย 13 หลัก
                          </label>
                          <input
                            type="text"
                            value={medPatientIdCard}
                            onChange={(e) => setMedPatientIdCard(formatIdCard(e.target.value))}
                            placeholder="x-xxxx-xxxxx-xx-x"
                            className="w-full p-3 rounded-xl border border-slate-300 text-sm font-mono font-semibold bg-white"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-slate-700 block mb-1 text-xs">
                            อาการป่วย / โรคประจำตัว / สาเหตุความจำเป็น *
                          </label>
                          <input
                            type="text"
                            value={medPatientDiagnosis}
                            onChange={(e) => setMedPatientDiagnosis(e.target.value)}
                            placeholder="เช่น ผู้ป่วยติดเตียง, โรคหลอดเลือดสมองอัมพฤกษ์, ขาหักหลังผ่าตัด"
                            className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold bg-white"
                            required
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {isPatientSameAsBorrower && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1 text-xs">อายุ (ปี)</label>
                        <input
                          type="number"
                          value={medPatientAge}
                          onChange={(e) => setMedPatientAge(e.target.value)}
                          placeholder="เช่น 65"
                          className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold bg-white"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1 text-xs">
                          อาการป่วย / โรคประจำตัว / สาเหตุความจำเป็น *
                        </label>
                        <input
                          type="text"
                          value={medPatientDiagnosis}
                          onChange={(e) => setMedPatientDiagnosis(e.target.value)}
                          placeholder="เช่น พักฟื้นหลังผ่าตัด, เดินลำบาก"
                          className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold bg-white"
                          required
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 3: ที่อยู่จัดส่งและพิกัดแผนที่ GPS */}
                <div className="p-5 rounded-2xl bg-teal-50/70 border-2 border-teal-200 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="font-black text-teal-950 flex items-center gap-2 text-base">
                      <MapPin className="w-5 h-5 text-teal-700" />
                      <span>ส่วนที่ 3: ที่อยู่สำหรับจัดส่งอุปกรณ์ & ปักหมุดแผนที่ GPS *</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleGetMedLiveGPS}
                      disabled={isMedLocating}
                      className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                    >
                      <Navigation className={`w-3.5 h-3.5 ${isMedLocating ? 'animate-spin' : ''}`} />
                      <span>{isMedLocating ? 'กำลังดึงพิกัด GPS...' : '📍 ใช้ตำแหน่งปัจจุบันของฉัน'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="font-bold text-slate-700 block mb-1 text-xs">
                        บ้านเลขที่ / ถนน / ซอย / จุดสังเกตใกล้บ้าน *
                      </label>
                      <input
                        type="text"
                        value={medDeliveryAddress}
                        onChange={(e) => setMedDeliveryAddress(e.target.value)}
                        placeholder="เช่น 99/1 หมู่ 3 ซอยวัดบางเป้า เยื้องศาลเจ้า"
                        className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold bg-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1 text-xs">หมู่ที่ (ต.บางเป้า) *</label>
                      <select
                        value={medMoo}
                        onChange={(e) => setMedMoo(e.target.value)}
                        className="w-full p-3 rounded-xl border border-slate-300 text-sm font-bold bg-white"
                      >
                        {BANGPAO_VILLAGES.map((v) => (
                          <option key={v.moo} value={v.moo}>
                            หมู่ {v.moo} {v.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Village Preset Pills */}
                  <div>
                    <div className="text-xs font-bold text-slate-600 mb-2">
                      หรือคลิกเลือกหมู่บ้านเพื่อปักหมุดด่วน:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {BANGPAO_VILLAGES.map((v) => (
                        <button
                          key={v.moo}
                          type="button"
                          onClick={() => handleSelectMedVillage(v)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            medMoo === v.moo
                              ? 'bg-teal-700 text-white shadow-xs'
                              : 'bg-white text-slate-700 hover:bg-teal-100 border border-slate-200'
                          }`}
                        >
                          ม.{v.moo} {v.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Lat Lng display */}
                  <div className="p-3 bg-white rounded-xl border border-teal-300 flex items-center justify-between text-xs text-teal-950 font-mono font-bold">
                    <span>พิกัด GPS สำหรับรถส่งของ: {medPinLat.toFixed(6)}, {medPinLng.toFixed(6)}</span>
                    <span className="text-[11px] font-sans font-semibold text-slate-500">{medLandmark}</span>
                  </div>
                </div>

                {/* Section 4: แนบรูปถ่ายเอกสาร (ทางเลือก - ไม่บังคับ) */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="font-black text-slate-800 flex items-center gap-2 text-base">
                      <Camera className="w-5 h-5 text-teal-700" />
                      <span>ส่วนที่ 4: แนบรูปถ่ายเอกสารหรือรูปบ้าน (ทางเลือก - ไม่บังคับ)</span>
                    </div>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
                      ไม่บังคับแนบ
                    </span>
                  </div>

                  <p className="text-xs text-slate-500">
                    หากสะดวก ท่านสามารถถ่ายรูปบัตรประชาชนหรือรูปหน้าบ้านแนบมาได้ เพื่อให้เจ้าหน้าที่เตรียมความพร้อมล่วงหน้า 
                    <em> (หากไม่สะดวก สามารถเตรียมเอกสารตัวจริงไว้รอเจ้าหน้าที่ไปเก็บที่บ้านได้ครับ)</em>
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    {/* Photo 1: ID Card */}
                    <div className="p-3.5 bg-white rounded-xl border-2 border-dashed border-slate-300 hover:border-teal-500 text-center space-y-2">
                      <label className="cursor-pointer block">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handlePhotoUpload(e, 'idCard')}
                          className="hidden"
                        />
                        {medDocPhoto1 ? (
                          <div className="relative">
                            <img
                              src={medDocPhoto1}
                              alt="สำเนาบัตรประชาชน"
                              className="h-28 mx-auto rounded-lg object-contain border"
                            />
                            <span className="inline-block mt-1 text-[11px] text-teal-700 font-bold">
                              ✓ แนบรูปบัตรประชาชนแล้ว (คลิกเพื่อเปลี่ยน)
                            </span>
                          </div>
                        ) : (
                          <div className="py-3 text-slate-500 hover:text-teal-700">
                            <Camera className="w-6 h-6 mx-auto mb-1 text-slate-400" />
                            <div className="text-xs font-bold text-slate-700">ถ่ายรูปบัตรประชาชนผู้ยืม/ผู้ป่วย</div>
                            <div className="text-[10px] text-slate-400">แตะที่นี่เพื่อถ่ายรูปหรือเลือกจากคลัง</div>
                          </div>
                        )}
                      </label>
                    </div>

                    {/* Photo 2: House Photo */}
                    <div className="p-3.5 bg-white rounded-xl border-2 border-dashed border-slate-300 hover:border-teal-500 text-center space-y-2">
                      <label className="cursor-pointer block">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handlePhotoUpload(e, 'house')}
                          className="hidden"
                        />
                        {medDocPhoto2 ? (
                          <div className="relative">
                            <img
                              src={medDocPhoto2}
                              alt="รูปหน้าบ้าน"
                              className="h-28 mx-auto rounded-lg object-contain border"
                            />
                            <span className="inline-block mt-1 text-[11px] text-teal-700 font-bold">
                              ✓ แนบรูปหน้าบ้านแล้ว (คลิกเพื่อเปลี่ยน)
                            </span>
                          </div>
                        ) : (
                          <div className="py-3 text-slate-500 hover:text-teal-700">
                            <ImageIcon className="w-6 h-6 mx-auto mb-1 text-slate-400" />
                            <div className="text-xs font-bold text-slate-700">ถ่ายรูปหน้าบ้าน / ทางเข้า</div>
                            <div className="text-[10px] text-slate-400">ช่วยให้รถส่งของมองเห็นบ้านได้ง่าย</div>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                </div>

                {/* Important Notice Box */}
                <div className="p-4 bg-teal-50 rounded-2xl border-2 border-teal-300 space-y-2 text-xs sm:text-sm text-teal-950">
                  <div className="font-black text-teal-900 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0" />
                    <span>ข้อแนะนำขั้นตอนการส่งมอบอุปกรณ์:</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-slate-700 leading-relaxed text-xs">
                    <li>
                      <strong>เจ้าหน้าที่จะเป็นผู้โทรประสานนัดวันเวลาส่งของ:</strong> เพื่อให้มั่นใจว่ามีญาติอยู่รอรับและทดสอบอุปกรณ์
                    </li>
                    <li>
                      <strong>นำเอกสารสัญญาไปให้เซ็นถึงที่บ้าน:</strong> เจ้าหน้าที่จะพิมพ์สัญญายืมมาตรฐาน A4 2 หน้า นำไปให้ท่านลงลายมือชื่อถึงบ้าน
                    </li>
                    <li>
                      <strong>เอกสารที่ต้องเตรียม:</strong> สำเนาบัตรประชาชนผู้ยืม 1 ฉบับ, ผู้ป่วย 1 ฉบับ และสำเนาทะเบียนบ้าน 1 ฉบับ
                    </li>
                  </ul>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-4 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-black text-lg shadow-xl cursor-pointer hover:shadow-2xl transition-all flex items-center justify-center gap-2 active:scale-98"
                  >
                    <Send className="w-5 h-5" />
                    <span>
                      {isQueueBooking ? 'ยืนยันการลงชื่อเข้าคิวจองอุปกรณ์' : 'ยืนยันการส่งคำขอยืมอุปกรณ์ทางการแพทย์'}
                    </span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ==================== TAB 4: TRACKING STATUS ==================== */}
        {activeTab === 'tracking' && (
          <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-9 shadow-2xl border-2 border-amber-100 space-y-6">
            <div className="flex items-center gap-3.5 pb-5 border-b border-slate-200">
              <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-md shrink-0">
                <Search className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  ตรวจสอบและติดตามสถานะคำร้อง & อุปกรณ์การแพทย์
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  กรอกเบอร์โทรศัพท์ที่ใช้ลงทะเบียน หรือรหัสคำขอ เพื่อตรวจสอบความคืบหน้าการดำเนินงาน
                </p>
              </div>
            </div>

            {/* Search Input Bar */}
            <form onSubmit={handleSearchTracking} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="กรอกเบอร์โทรศัพท์ หรือรหัสคำขอ เช่น 081-xxxxxxx, REQ-..., SWG-..., MED-..."
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-slate-300 text-base font-semibold text-slate-900 bg-slate-50 focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-sm sm:text-base rounded-2xl cursor-pointer shadow-md transition-all active:scale-95 shrink-0"
              >
                ค้นหา
              </button>
            </form>

            {/* Display Results */}
            {searchResult !== null && (
              <div className="space-y-4 pt-2">
                {searchResult.length === 0 && (!loanSearchResult || loanSearchResult.length === 0) ? (
                  <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
                    <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <div className="font-bold text-base text-slate-700">ไม่พบข้อมูลคำร้องจากคำค้นหาดังกล่าว</div>
                    <div className="text-xs text-slate-400 mt-1">
                      กรุณาตรวจสอบเบอร์โทรศัพท์หรือรหัสคำขออีกครั้ง
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Petitions Results */}
                    {searchResult.map((p) => (
                      <div
                        key={p.id}
                        className="p-5 sm:p-6 rounded-2xl border-2 border-slate-200 bg-white hover:border-emerald-300 shadow-xs transition-all space-y-3"
                      >
                        <div className="flex items-start justify-between flex-wrap gap-2">
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
                    ))}

                    {/* Medical Equipment Loan Results */}
                    {loanSearchResult && loanSearchResult.map((loan) => (
                      <div
                        key={loan.id}
                        className="p-5 sm:p-6 rounded-2xl border-2 border-teal-200 bg-teal-50/30 hover:border-teal-400 shadow-xs transition-all space-y-4"
                      >
                        <div className="flex items-start justify-between flex-wrap gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded-md bg-teal-700 text-white font-bold text-xs flex items-center gap-1">
                                <Stethoscope className="w-3 h-3" />
                                <span>ขอยืมอุปกรณ์</span>
                              </span>
                              <span className="font-mono font-black text-base sm:text-lg text-slate-900">
                                {loan.loanCode || loan.contractNumber || loan.docNo}
                              </span>
                              <span className="text-xs text-slate-500 font-medium">
                                ({new Date(loan.loanDate || loan.createdAt || Date.now()).toLocaleDateString('th-TH')})
                              </span>
                            </div>
                            <div className="text-base sm:text-lg font-black text-teal-950 mt-1">
                              {loan.equipmentName}
                            </div>
                          </div>

                          <div>{getLoanStatusBadge(loan.status)}</div>
                        </div>

                        {/* Progress Stepper */}
                        <div className="p-3 bg-white rounded-xl border border-teal-200">
                          <div className="text-[11px] font-bold text-slate-500 mb-2">ขั้นตอนความคืบหน้า:</div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-900 font-bold border border-emerald-300">
                              ✓ 1. ยื่นคำขอแล้ว
                            </div>
                            <div className={`p-2 rounded-lg font-bold border ${
                              loan.status === 'approved' || loan.status === 'borrowed' || loan.status === 'returned'
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : 'bg-slate-100 text-slate-400 border-slate-200'
                            }`}>
                              2. ตรวจสอบสต็อก
                            </div>
                            <div className={`p-2 rounded-lg font-bold border ${
                              loan.status === 'borrowed' || loan.status === 'returned'
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : loan.status === 'approved'
                                ? 'bg-blue-100 text-blue-900 border-blue-300 animate-pulse'
                                : 'bg-slate-100 text-slate-400 border-slate-200'
                            }`}>
                              3. โทรนัด & ส่งถึงบ้าน
                            </div>
                            <div className={`p-2 rounded-lg font-bold border ${
                              loan.status === 'borrowed' || loan.status === 'returned'
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : 'bg-slate-100 text-slate-400 border-slate-200'
                            }`}>
                              4. ส่งมอบ & เซ็นสัญญา
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-slate-700 bg-white p-4 rounded-xl border border-slate-100">
                          <div>
                            <strong>ผู้ป่วย:</strong> {loan.patientName} {loan.patientAge ? `(${loan.patientAge} ปี)` : ''}
                          </div>
                          <div>
                            <strong>ผู้ขอยืม/ผู้ดูแล:</strong> {loan.borrowerName} ({loan.phone || loan.borrowerPhone})
                          </div>
                          <div>
                            <strong>สถานที่ส่งมอบ:</strong> {loan.address || loan.borrowerAddress}
                          </div>
                          <div>
                            <strong>อาการเบื้องต้น:</strong> {loan.patientDiagnosis || '-'}
                          </div>
                        </div>

                        {loan.notes && (
                          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-950 text-xs">
                            <strong>หมายเหตุจากเจ้าหน้าที่:</strong> {loan.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Public Footer */}
      <footer className="w-full bg-slate-950/80 border-t border-emerald-500/20 py-4 px-4 sm:px-8 text-center text-xs sm:text-sm text-emerald-300/80 font-medium">
        <div>
          © 2569 กองสาธารณสุขและสิ่งแวดล้อม เทศบาลตำบลบางเป้า อำเภอกันตัง จังหวัดตรัง
        </div>
      </footer>
    </div>
  );
};
