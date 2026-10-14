import React, { useState } from 'react';
import {
  HeartPulse,
  Users,
  Navigation,
  Package,
  MapPin,
  CheckCircle2,
  Clock,
  Printer,
  Plus,
  FileSpreadsheet,
  AlertCircle,
  Truck,
  ExternalLink,
  ChevronRight,
  UserCheck,
  Search,
  Filter,
} from 'lucide-react';
import { NhsoProject, LtcPatient, UserRole } from '../types/index.ts';
import { NhsoFundView } from './NhsoFundView.tsx';
import { LtcCareView } from './LtcCareView.tsx';

interface NhsoLtcCombinedViewProps {
  projects: NhsoProject[];
  patients: LtcPatient[];
  userRole: UserRole;
  onAddNewProject: () => void;
  onApproveProject: (id: string, budget: number) => void;
  onAddNewPatient: () => void;
  onAddRegisteredPatient?: (patient: LtcPatient) => void;
  onRecordVisit: (patient: LtcPatient) => void;
  onPrintCarePlan: (patient: LtcPatient) => void;
  activeSubTab?: 'route' | 'register' | 'inventory' | 'nhso';
  onSubTabChange?: (tab: 'route' | 'register' | 'inventory' | 'nhso') => void;
}

// LTC Delivery Stop Mock Data based on Bangpao Tambon
interface DeliveryStop {
  id: string;
  patientId: string;
  patientName: string;
  moo: string;
  village: string;
  address: string;
  lat: number;
  lng: number;
  adlCategory: 'ติดเตียง' | 'ติดบ้าน';
  diaperSize: 'M' | 'L' | 'XL';
  diaperQuantity: number;
  underpadQuantity: number;
  airMattressNeeded: boolean;
  status: 'pending' | 'delivered';
  deliveredAt?: string;
  receiverName?: string;
  routeOrder: number;
  notes?: string;
}

export const BANGPAO_VILLAGES: Record<string, string> = {
  '1': 'บ้านท่าส้ม',
  '2': 'บ้านทุ่งค่าย',
  '3': 'บ้านบางเป้า',
  '4': 'บ้านคลองลุ',
  '5': 'บ้านไร่ออก',
  '6': 'บ้านในลุ่ม',
  '7': 'บ้านเกาะเคี่ยม',
};

const BANGPAO_COORDS: Record<string, { lat: number; lng: number }> = {
  '1': { lat: 7.3912, lng: 99.4932 },
  '2': { lat: 7.3854, lng: 99.5021 },
  '3': { lat: 7.4011, lng: 99.5105 },
  '4': { lat: 7.4125, lng: 99.5241 },
  '5': { lat: 7.3789, lng: 99.4811 },
  '6': { lat: 7.3880, lng: 99.5150 },
  '7': { lat: 7.4050, lng: 99.5290 },
};

const convertPatientsToDeliveryStops = (pts: LtcPatient[]): DeliveryStop[] => {
  return pts.map((p, idx) => {
    const mooNum = p.moo || '1';
    const village = BANGPAO_VILLAGES[mooNum] || `หมู่ ${mooNum}`;
    const base = BANGPAO_COORDS[mooNum] || { lat: 7.395, lng: 99.500 };
    const diaperSize = (p.equipmentNeeded?.includes('XL') ? 'XL' : p.equipmentNeeded?.includes('M') ? 'M' : 'L') as 'M' | 'L' | 'XL';

    return {
      id: `STOP-${String(idx + 1).padStart(2, '0')}`,
      patientId: p.id,
      patientName: p.fullName,
      moo: mooNum,
      village,
      address: p.address,
      lat: base.lat + ((idx % 3) * 0.002 - 0.002),
      lng: base.lng + (((idx * 2) % 3) * 0.002 - 0.002),
      adlCategory: (p.adlCategory === 'ติดบ้าน' ? 'ติดบ้าน' : 'ติดเตียง') as 'ติดเตียง' | 'ติดบ้าน',
      diaperSize,
      diaperQuantity: p.monthlyDiaperAllowance || 90,
      underpadQuantity: 60,
      airMattressNeeded: p.equipmentNeeded?.includes('ที่นอนลม') ?? false,
      status: p.receivedCarePack ? 'delivered' : 'pending',
      deliveredAt: p.receivedCarePack ? `${p.lastVisitDate} 10:00` : undefined,
      receiverName: p.receivedCarePack ? p.caregiverName : undefined,
      routeOrder: idx + 1,
      notes: p.diagnosis,
    };
  });
};

const INITIAL_DELIVERY_STOPS: DeliveryStop[] = [
  {
    id: 'STOP-01',
    patientId: 'LTC-6901',
    patientName: 'นางสายใจ อินทร์แก้ว',
    moo: '1',
    village: 'บ้านท่าส้ม',
    address: '45/1 หมู่ 1 ต.บางเป้า',
    lat: 7.3912,
    lng: 99.4932,
    adlCategory: 'ติดเตียง',
    diaperSize: 'L',
    diaperQuantity: 90,
    underpadQuantity: 60,
    airMattressNeeded: true,
    status: 'delivered',
    deliveredAt: '2026-10-06 09:30',
    receiverName: 'นางสาวสมศรี (ลูกสาว)',
    routeOrder: 1,
    notes: 'ส่งมอบเรียบร้อย แผลกดทับดีขึ้น',
  },
  {
    id: 'STOP-02',
    patientId: 'LTC-6902',
    patientName: 'นายประสิทธิ์ สุวรรณรัตน์',
    moo: '2',
    village: 'บ้านทุ่งค่าย',
    address: '12/4 หมู่ 2 ต.บางเป้า',
    lat: 7.3854,
    lng: 99.5021,
    adlCategory: 'ติดเตียง',
    diaperSize: 'XL',
    diaperQuantity: 90,
    underpadQuantity: 30,
    airMattressNeeded: false,
    status: 'pending',
    routeOrder: 2,
    notes: 'มีสุนัขในบ้าน ให้โทรแจ้งล่วงหน้า 081-332-1144',
  },
  {
    id: 'STOP-03',
    patientId: 'LTC-6903',
    patientName: 'นางสมจิตร ยอดระบำ',
    moo: '3',
    village: 'บ้านบางเป้า',
    address: '88 หมู่ 3 ต.บางเป้า',
    lat: 7.4011,
    lng: 99.5105,
    adlCategory: 'ติดเตียง',
    diaperSize: 'M',
    diaperQuantity: 90,
    underpadQuantity: 60,
    airMattressNeeded: false,
    status: 'pending',
    routeOrder: 3,
    notes: 'ส่งมอบพร้อมยาประจำตัว',
  },
  {
    id: 'STOP-04',
    patientId: 'LTC-6904',
    patientName: 'นายบัญชา รักษ์ดี',
    moo: '4',
    village: 'บ้านโคกมะขาม',
    address: '103 หมู่ 4 ต.บางเป้า',
    lat: 7.4125,
    lng: 99.5241,
    adlCategory: 'ติดบ้าน',
    diaperSize: 'L',
    diaperQuantity: 60,
    underpadQuantity: 30,
    airMattressNeeded: false,
    status: 'pending',
    routeOrder: 4,
    notes: 'ขอคำแนะนำเรื่องกายภาพบำบัดข้อเข่า',
  },
  {
    id: 'STOP-05',
    patientId: 'LTC-6905',
    patientName: 'นางกิมเอ็ง ตันติพาณิชย์',
    moo: '5',
    village: 'บ้านหาดยาว',
    address: '19 หมู่ 5 ต.บางเป้า',
    lat: 7.3789,
    lng: 99.4811,
    adlCategory: 'ติดเตียง',
    diaperSize: 'M',
    diaperQuantity: 90,
    underpadQuantity: 60,
    airMattressNeeded: true,
    status: 'pending',
    routeOrder: 5,
    notes: 'ต้องเปลี่ยนสายยางให้อาหารร่วมด้วย',
  },
];

interface LtcInventoryItem {
  id: string;
  name: string;
  specification: string;
  totalStock: number;
  allocatedStock: number;
  remainingStock: number;
  unit: string;
  monthlyRequirement: number;
  lotNo: string;
  expireDate: string;
  status: 'sufficient' | 'low' | 'critical';
}

const INITIAL_LTC_INVENTORY: LtcInventoryItem[] = [
  {
    id: 'INV-LTC-01',
    name: 'ผ้าอ้อมผู้ใหญ่แบบเทป (Size M)',
    specification: 'รอบสะโพก 29-46 นิ้ว ซึมซับดีเยี่ยมสำหรับผู้ป่วยติดเตียง',
    totalStock: 1200,
    allocatedStock: 540,
    remainingStock: 660,
    unit: 'ชิ้น',
    monthlyRequirement: 540,
    lotNo: 'LOT-NHSO-6901',
    expireDate: '2028-06-30',
    status: 'sufficient',
  },
  {
    id: 'INV-LTC-02',
    name: 'ผ้าอ้อมผู้ใหญ่แบบเทป (Size L)',
    specification: 'รอบสะโพก 40-55 นิ้ว มีแถบวัดความเปียกชื้น',
    totalStock: 1800,
    allocatedStock: 900,
    remainingStock: 900,
    unit: 'ชิ้น',
    monthlyRequirement: 900,
    lotNo: 'LOT-NHSO-6902',
    expireDate: '2028-08-31',
    status: 'sufficient',
  },
  {
    id: 'INV-LTC-03',
    name: 'ผ้าอ้อมผู้ใหญ่แบบเทป (Size XL)',
    specification: 'รอบสะโพก 50-65 นิ้ว สำหรับรูปร่างใหญ่พิเศษ',
    totalStock: 450,
    allocatedStock: 270,
    remainingStock: 180,
    unit: 'ชิ้น',
    monthlyRequirement: 270,
    lotNo: 'LOT-NHSO-6903',
    expireDate: '2028-05-15',
    status: 'low',
  },
  {
    id: 'INV-LTC-04',
    name: 'แผ่นรองซับสิ่งขับถ่าย (Underpads)',
    specification: 'ขนาด 45 x 70 ซม. ชั้นเจลซึมซับหนา 5 ชั้น ป้องกันการรั่วซึม',
    totalStock: 2400,
    allocatedStock: 960,
    remainingStock: 1440,
    unit: 'แผ่น',
    monthlyRequirement: 960,
    lotNo: 'LOT-NHSO-6904',
    expireDate: '2029-01-31',
    status: 'sufficient',
  },
  {
    id: 'INV-LTC-05',
    name: 'ที่นอนลมป้องกันแผลกดทับ (แบบรังผึ้ง/ลอน)',
    specification: 'ระบบปั๊มลมอัตโนมัติ สลับพองยุบ ป้องกันแผลกดทับระยะ 1-3',
    totalStock: 25,
    allocatedStock: 18,
    remainingStock: 7,
    unit: 'ชุด',
    monthlyRequirement: 5,
    lotNo: 'LOT-NHSO-6905',
    expireDate: '2031-12-31',
    status: 'low',
  },
];

export const NhsoLtcCombinedView: React.FC<NhsoLtcCombinedViewProps> = ({
  projects,
  patients,
  userRole,
  onAddNewProject,
  onApproveProject,
  onAddNewPatient,
  onAddRegisteredPatient,
  onRecordVisit,
  onPrintCarePlan,
  activeSubTab: controlledSubTab,
  onSubTabChange,
}) => {
  // 4 Sub-tabs requested by user:
  // 1) ระบบนำทาง สร้างเส้นทางสำหรับแจกจ่ายของ (Route Optimizer)
  // 2) หน้าลงทะเบียนผู้ป่วย LTC
  // 3) หน้าคลังอุปกรณ์ LTC
  // 4) โครงการ สปสช.
  const [internalSubTab, setInternalSubTab] = useState<'route' | 'register' | 'inventory' | 'nhso'>('route');
  const subTab = controlledSubTab || internalSubTab;
  const setSubTab = (tab: 'route' | 'register' | 'inventory' | 'nhso') => {
    if (onSubTabChange) onSubTabChange(tab);
    else setInternalSubTab(tab);
  };

  // Route Stops State
  const [stops, setStops] = useState<DeliveryStop[]>(() =>
    patients && patients.length > 0 ? convertPatientsToDeliveryStops(patients) : INITIAL_DELIVERY_STOPS
  );
  const [selectedMooFilter, setSelectedMooFilter] = useState<string>('all');
  const [activeStop, setActiveStop] = useState<DeliveryStop | null>(null);

  // Inventory State
  const [inventory, setInventory] = useState<LtcInventoryItem[]>(INITIAL_LTC_INVENTORY);

  // New Patient Registration Form State
  const [newReg, setNewReg] = useState({
    nationalId: '',
    fullName: '',
    gender: 'female' as 'male' | 'female',
    age: '',
    moo: '1',
    address: '',
    phone: '',
    adlScore: '5',
    adlCategory: 'ติดเตียง' as 'ติดเตียง' | 'ติดบ้าน' | 'ติดสังคม',
    caregiverName: '',
    caregiverPhone: '',
    diaperSize: 'L' as 'M' | 'L' | 'XL',
    diaperPerMonth: '90',
    underpadPerMonth: '60',
    airMattressNeeded: false,
    disease: 'โรคหลอดเลือดสมอง (Stroke) / อัมพาตครึ่งซีก',
  });

  const [regSuccessMsg, setRegSuccessMsg] = useState('');

  const handleMarkDelivered = (stopId: string) => {
    const receiver = window.prompt('ชื่อผู้รับมอบของ (ญาติ/ผู้ดูแล):', 'ผู้ดูแลผู้ป่วย');
    if (!receiver) return;

    setStops((prev) =>
      prev.map((s) =>
        s.id === stopId
          ? {
              ...s,
              status: 'delivered',
              deliveredAt: new Date().toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }),
              receiverName: receiver,
            }
          : s
      )
    );
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReg.fullName || !newReg.nationalId) {
      alert('กรุณากรอกชื่อ-นามสกุล และเลขประจำตัวประชาชน 13 หลัก');
      return;
    }

    const mooNum = newReg.moo;
    const village = BANGPAO_VILLAGES[mooNum] || `หมู่ ${mooNum}`;
    const base = BANGPAO_COORDS[mooNum] || { lat: 7.395, lng: 99.500 };
    const patientId = `LTC-${Date.now().toString().slice(-4)}`;

    const newStop: DeliveryStop = {
      id: `STOP-${String(stops.length + 1).padStart(2, '0')}`,
      patientId,
      patientName: newReg.fullName,
      moo: mooNum,
      village,
      address: `${newReg.address} ม.${mooNum} ${village} ต.บางเป้า`,
      lat: base.lat + (Math.random() - 0.5) * 0.004,
      lng: base.lng + (Math.random() - 0.5) * 0.004,
      adlCategory: newReg.adlCategory as 'ติดเตียง' | 'ติดบ้าน',
      diaperSize: newReg.diaperSize,
      diaperQuantity: parseInt(newReg.diaperPerMonth) || 90,
      underpadQuantity: parseInt(newReg.underpadPerMonth) || 60,
      airMattressNeeded: newReg.airMattressNeeded,
      status: 'pending',
      routeOrder: stops.length + 1,
      notes: newReg.disease,
    };

    setStops([...stops, newStop]);

    const newPatientRecord: LtcPatient = {
      id: patientId,
      hn: `HN-${Math.floor(10000 + Math.random() * 90000)}`,
      idCard: newReg.nationalId,
      fullName: newReg.fullName,
      age: parseInt(newReg.age) || 75,
      adlScore: parseInt(newReg.adlScore) || 5,
      adlGroup: (parseInt(newReg.adlScore) || 5) <= 4 ? 'group_4' : (parseInt(newReg.adlScore) || 5) <= 8 ? 'group_3' : 'group_2',
      adlCategory: newReg.adlCategory,
      moo: mooNum,
      address: `${newReg.address} ม.${mooNum} ${village} ต.บางเป้า อ.กันตัง จ.ตรัง`,
      subdistrict: 'บางเป้า',
      phone: newReg.phone || newReg.caregiverPhone,
      diagnosis: newReg.disease,
      careManagerName: 'น.ส. พิมลภัส ศรีสุข',
      caregiverName: newReg.caregiverName || 'ญาติผู้ดูแล',
      caregiverPhone: newReg.caregiverPhone,
      monthlyDiaperAllowance: parseInt(newReg.diaperPerMonth) || 90,
      equipmentNeeded: newReg.airMattressNeeded ? 'ที่นอนลมป้องกันแผลกดทับ' : 'แผ่นรองซับ',
      carePlanSummary: `สนับสนุนผ้าอ้อมผู้ใหญ่ ${newReg.diaperPerMonth} ชิ้น/เดือน, แผ่นรองซับ ${newReg.underpadPerMonth} แผ่น/เดือน`,
      lastVisitDate: new Date().toISOString().slice(0, 10),
      nextVisitDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      status: 'active',
      receivedCarePack: false,
    };

    if (onAddRegisteredPatient) {
      onAddRegisteredPatient(newPatientRecord);
    }

    setRegSuccessMsg(`✅ ขึ้นทะเบียนผู้ป่วย LTC "${newReg.fullName}" สำเร็จ และเพิ่มเข้าสู่เส้นทางแจกของแล้ว`);
    setTimeout(() => setRegSuccessMsg(''), 4000);

    // Reset Form
    setNewReg({
      nationalId: '',
      fullName: '',
      gender: 'female',
      age: '',
      moo: '1',
      address: '',
      phone: '',
      adlScore: '5',
      adlCategory: 'ติดเตียง',
      caregiverName: '',
      caregiverPhone: '',
      diaperSize: 'L',
      diaperPerMonth: '90',
      underpadPerMonth: '60',
      airMattressNeeded: false,
      disease: 'โรคหลอดเลือดสมอง (Stroke) / อัมพาตครึ่งซีก',
    });
  };

  const deliveredCount = stops.filter((s) => s.status === 'delivered').length;
  const pendingCount = stops.filter((s) => s.status === 'pending').length;

  const filteredStops = stops.filter((s) => {
    if (selectedMooFilter === 'all') return true;
    return s.moo === selectedMooFilter;
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Module Header Bar */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-100/80 text-teal-800 flex items-center justify-center shrink-0 shadow-xs">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg lg:text-xl font-black text-slate-900 tracking-tight">
                📦 ระบบแจกจ่ายโครงการ สปสช. & การดูแลระยะยาว (LTC)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-200">
                กองทุนหลักประกันสุขภาพ ทต.บางเป้า
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              บริหารแจกจ่ายผ้าอ้อมผู้ใหญ่/แผ่นรองซับ, คำนวณเส้นทางนำส่ง, ทะเบียนผู้ป่วยติดเตียง และโครงการ สปสช.
            </p>
          </div>
        </div>

        {/* 4 Main Sub-Navigation Pills */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200/90 w-full lg:w-auto overflow-x-auto no-scrollbar shadow-inner">
          <button
            onClick={() => setSubTab('route')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all whitespace-nowrap cursor-pointer ${
              subTab === 'route'
                ? 'bg-teal-700 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Navigation className="w-4 h-4" />
            <span>ระบบนำทางแจกจ่ายของ</span>
            {pendingCount > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-amber-400 text-amber-950 font-black">
                รอส่ง {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setSubTab('register')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all whitespace-nowrap cursor-pointer ${
              subTab === 'register'
                ? 'bg-teal-700 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>หน้าลงทะเบียน ({patients.length})</span>
          </button>

          <button
            onClick={() => setSubTab('inventory')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all whitespace-nowrap cursor-pointer ${
              subTab === 'inventory'
                ? 'bg-teal-700 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>หน้าคลังอุปกรณ์ LTC</span>
          </button>

          <button
            onClick={() => setSubTab('nhso')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all whitespace-nowrap cursor-pointer ${
              subTab === 'nhso'
                ? 'bg-teal-700 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <HeartPulse className="w-4 h-4" />
            <span>โครงการ สปสช. ({projects.length})</span>
          </button>
        </div>
      </div>

      {/* SUB-VIEW 1: ระบบนำทาง สร้างเส้นทางสำหรับแจกจ่ายของ (Route Optimizer) */}
      {subTab === 'route' && (
        <div className="space-y-4">
          {/* Top KPI Cards for Route */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500">จุดส่งมอบทั้งหมดรอบนี้</div>
              <div className="text-xl font-extrabold text-slate-800 mt-1">{stops.length} จุด</div>
              <div className="text-[10px] text-slate-400 mt-0.5">ครอบคลุม 7 หมู่บ้าน ต.บางเป้า</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-xs">
              <div className="text-[11px] font-bold text-emerald-700">ส่งมอบสำเร็จแล้ว</div>
              <div className="text-xl font-extrabold text-emerald-700 mt-1">{deliveredCount} จุด</div>
              <div className="text-[10px] text-emerald-600 mt-0.5">มีลายมือชื่อรับมอบครบถ้วน</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 shadow-xs">
              <div className="text-[11px] font-bold text-amber-700">อยู่ระหว่างนำส่ง</div>
              <div className="text-xl font-extrabold text-amber-700 mt-1">{pendingCount} จุด</div>
              <div className="text-[10px] text-amber-600 mt-0.5">ตามลำดับเส้นทางที่คำนวณ</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-teal-200 bg-teal-50/40 shadow-xs">
              <div className="text-[11px] font-bold text-teal-700">ยอดแจกผ้าอ้อมรวม</div>
              <div className="text-xl font-extrabold text-teal-800 mt-1">
                {stops.reduce((acc, s) => acc + s.diaperQuantity, 0)} ชิ้น
              </div>
              <div className="text-[10px] text-teal-600 mt-0.5">แผ่นรองซับ {stops.reduce((acc, s) => acc + s.underpadQuantity, 0)} แผ่น</div>
            </div>
          </div>

          {/* Interactive Route Map & Delivery Sequence */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: Interactive Simulated Map & Stop Details */}
            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-800">
                    <Navigation className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                      🗺️ แผนผังเส้นทางแจกของอัจฉริยะ (Route Optimization)
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      จุดปล่อยรถ: กองสาธารณสุข เทศบาลตำบลบางเป้า → ม.1 → ม.2 → ม.3 → ม.4 → ม.5
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const googleMapsUrl = `https://www.google.com/maps/dir/${stops
                      .map((s) => `${s.lat},${s.lng}`)
                      .join('/')}`;
                    window.open(googleMapsUrl, '_blank');
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>เปิด Google Maps นำทาง</span>
                </button>
              </div>

              {/* Visual Simulated Map Display */}
              <div className="relative w-full h-80 rounded-xl bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 border border-slate-700 overflow-hidden p-4 shadow-inner flex flex-col justify-between">
                {/* Map Grid Lines */}
                <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#2dd4bf_1px,transparent_1px)] [background-size:16px_16px]" />

                {/* Map Header Status */}
                <div className="relative z-10 flex items-center justify-between text-xs text-emerald-200 bg-slate-900/80 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-emerald-500/30">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="font-bold">พื้นที่: เทศบาลตำบลบางเป้า อ.กันตัง จ.ตรัง</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">GPS: 7.395° N, 99.505° E</span>
                </div>

                {/* Plot delivery stops on the visual canvas */}
                <div className="relative z-10 h-48 w-full flex items-center justify-around">
                  {stops.map((stop, idx) => (
                    <div
                      key={stop.id}
                      onClick={() => setActiveStop(stop)}
                      className={`cursor-pointer group flex flex-col items-center transition-all transform hover:scale-110 ${
                        activeStop?.id === stop.id ? 'scale-125 z-20' : ''
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-xs shadow-lg border-2 transition-all ${
                          stop.status === 'delivered'
                            ? 'bg-emerald-500 border-white text-white'
                            : 'bg-amber-500 border-white text-white animate-pulse'
                        }`}
                      >
                        {stop.status === 'delivered' ? '✓' : idx + 1}
                      </div>
                      <div className="mt-1 px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-700 text-[10px] text-white font-bold whitespace-nowrap shadow-sm">
                        ม.{stop.moo} {stop.patientName.split(' ')[0]}
                      </div>
                      <div className="text-[9px] text-teal-300 font-mono">
                        {stop.diaperQuantity} ชิ้น
                      </div>
                    </div>
                  ))}
                </div>

                {/* Map Bottom Legend */}
                <div className="relative z-10 flex items-center justify-between text-[11px] bg-slate-900/80 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> ส่งแล้ว
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> กำลังรอส่ง
                    </span>
                  </div>
                  <span className="text-teal-300">คลิกที่จุดเพื่อดูรายละเอียดผู้ป่วย</span>
                </div>
              </div>

              {/* Stop Quick Detail View */}
              {activeStop && (
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs space-y-1.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-teal-950 text-sm">
                      จุดส่งลำดับที่ {activeStop.routeOrder}: {activeStop.patientName}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        activeStop.status === 'delivered'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {activeStop.status === 'delivered' ? '✅ ส่งมอบแล้ว' : '⏳ รอส่ง'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-700">
                    <div>
                      📍 ที่อยู่: <strong>{activeStop.address}</strong>
                    </div>
                    <div>
                      🏥 ภาวะพึ่งพิง: <strong>{activeStop.adlCategory}</strong>
                    </div>
                    <div>
                      📦 ผ้าอ้อม: <strong>Size {activeStop.diaperSize} จำนวน {activeStop.diaperQuantity} ชิ้น</strong>
                    </div>
                    <div>
                      🛏️ แผ่นรองซับ: <strong>{activeStop.underpadQuantity} แผ่น</strong>
                    </div>
                  </div>
                  {activeStop.notes && (
                    <div className="text-[11px] text-slate-500 italic">หมายเหตุ: {activeStop.notes}</div>
                  )}
                  {activeStop.status === 'pending' && (
                    <button
                      onClick={() => handleMarkDelivered(activeStop.id)}
                      className="mt-2 w-full py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer"
                    >
                      ✓ บันทึกการส่งมอบสำเร็จ
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right: Sequence Delivery Stops Table */}
            <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-teal-700" />
                  <span>ลำดับจุดจอดและแจกของ ({filteredStops.length})</span>
                </h3>

                {/* Filter Moo */}
                <select
                  value={selectedMooFilter}
                  onChange={(e) => setSelectedMooFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-300 rounded-lg p-1.5 font-semibold text-slate-700"
                >
                  <option value="all">ทุกหมู่บ้าน (7 หมู่บ้าน)</option>
                  <option value="1">หมู่ 1 บ้านท่าส้ม</option>
                  <option value="2">หมู่ 2 บ้านทุ่งค่าย</option>
                  <option value="3">หมู่ 3 บ้านบางเป้า</option>
                  <option value="4">หมู่ 4 บ้านคลองลุ</option>
                  <option value="5">หมู่ 5 บ้านไร่ออก</option>
                  <option value="6">หมู่ 6 บ้านในลุ่ม</option>
                  <option value="7">หมู่ 7 บ้านเกาะเคี่ยม</option>
                </select>
              </div>

              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                {filteredStops.map((stop) => (
                  <div
                    key={stop.id}
                    onClick={() => setActiveStop(stop)}
                    className={`p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                      activeStop?.id === stop.id
                        ? 'border-teal-500 bg-teal-50/70 shadow-xs ring-1 ring-teal-400'
                        : stop.status === 'delivered'
                        ? 'border-slate-200 bg-slate-50/60 opacity-80'
                        : 'border-slate-200 hover:border-teal-300 bg-white hover:bg-teal-50/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-white font-extrabold text-[10px] flex items-center justify-center">
                          {stop.routeOrder}
                        </span>
                        <span className="font-bold text-slate-900">{stop.patientName}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          stop.status === 'delivered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {stop.status === 'delivered' ? 'ส่งแล้ว' : 'รอส่ง'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{stop.address}</span>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <div className="text-teal-900 font-semibold">
                        📦 ผ้าอ้อม Size {stop.diaperSize} ({stop.diaperQuantity} ชิ้น)
                      </div>
                      {stop.status === 'pending' ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkDelivered(stop.id);
                          }}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[10px] cursor-pointer"
                        >
                          ✓ ส่งมอบ
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400">
                          รับโดย: {stop.receiverName}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: หน้าลงทะเบียนผู้ป่วย LTC */}
      {subTab === 'register' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Form: Register New LTC Patient */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-800">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  📝 แบบฟอร์มขึ้นทะเบียนผู้มีภาวะพึ่งพิง (LTC)
                </h3>
                <p className="text-[11px] text-slate-500">
                  บันทึกข้อมูลเพื่อรับการสนับสนุนผ้าอ้อมผู้ใหญ่และชุดดูแลรายเดือน
                </p>
              </div>
            </div>

            {regSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold">
                {regSuccessMsg}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">เลขบัตร ปชช. 13 หลัก *</label>
                  <input
                    type="text"
                    required
                    maxLength={13}
                    placeholder="1929900xxxxxx"
                    value={newReg.nationalId}
                    onChange={(e) => setNewReg({ ...newReg, nationalId: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">เพศ</label>
                  <select
                    value={newReg.gender}
                    onChange={(e) => setNewReg({ ...newReg, gender: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="female">หญิง</option>
                    <option value="male">ชาย</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ชื่อ - สกุล ผู้ป่วย *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น นางสมบูรณ์ มงคลยิ่ง"
                  value={newReg.fullName}
                  onChange={(e) => setNewReg({ ...newReg, fullName: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">หมู่ที่ (ต.บางเป้า)</label>
                  <select
                    value={newReg.moo}
                    onChange={(e) => setNewReg({ ...newReg, moo: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500"
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
                <div>
                  <label className="block font-bold text-slate-700 mb-1">เลขที่บ้าน / ซอย</label>
                  <input
                    type="text"
                    placeholder="เช่น 12/1 ซอยร่วมใจ"
                    value={newReg.address}
                    onChange={(e) => setNewReg({ ...newReg, address: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">กลุ่มภาวะพึ่งพิง (ADL)</label>
                  <select
                    value={newReg.adlCategory}
                    onChange={(e) => setNewReg({ ...newReg, adlCategory: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold text-teal-800"
                  >
                    <option value="ติดเตียง">🔴 ติดเตียง (ADL 0-4 คะแนน)</option>
                    <option value="ติดบ้าน">🟡 ติดบ้าน (ADL 5-11 คะแนน)</option>
                    <option value="ติดสังคม">🟢 ติดสังคม (ADL 12+ คะแนน)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ไซส์ผ้าอ้อมที่ต้องการ</label>
                  <select
                    value={newReg.diaperSize}
                    onChange={(e) => setNewReg({ ...newReg, diaperSize: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="M">Size M (รอบสะโพก 29-46 นิ้ว)</option>
                    <option value="L">Size L (รอบสะโพก 40-55 นิ้ว)</option>
                    <option value="XL">Size XL (รอบสะโพก 50-65 นิ้ว)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ชื่อผู้ดูแล / ญาติ</label>
                  <input
                    type="text"
                    placeholder="เช่น นางสาววิภาดา (บุตรสาว)"
                    value={newReg.caregiverName}
                    onChange={(e) => setNewReg({ ...newReg, caregiverName: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">เบอร์โทรศัพท์ผู้ดูแล</label>
                  <input
                    type="text"
                    placeholder="081-xxxxxxx"
                    value={newReg.caregiverPhone}
                    onChange={(e) => setNewReg({ ...newReg, caregiverPhone: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  ✓ บันทึกขึ้นทะเบียนผู้ป่วย LTC
                </button>
              </div>
            </form>
          </div>

          {/* Right: Existing LTC Patients Table */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  📋 ทะเบียนผู้ป่วย LTC ในความดูแล ({patients.length} ราย)
                </h3>
                <p className="text-[11px] text-slate-500">
                  จำแนกตามภาวะพึ่งพิง และการสนับสนุนจากกองทุน สปสช.
                </p>
              </div>

              <button
                onClick={() => onAddNewPatient()}
                className="px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                + เพิ่มผู้ป่วย
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">ชื่อ-สกุล / ที่อยู่</th>
                    <th className="p-2.5 text-center">ระดับ ADL</th>
                    <th className="p-2.5">อุปกรณ์ที่ได้รับ</th>
                    <th className="p-2.5">ผู้ดูแล</th>
                    <th className="p-2.5 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {patients.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="p-2.5">
                        <div className="font-bold text-slate-900">{p.fullName}</div>
                        <div className="text-[11px] text-slate-500">{p.address}</div>
                      </td>
                      <td className="p-2.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.adlCategory === 'ติดเตียง'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {p.adlCategory} ({p.adlScore} คะแนน)
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-600">
                        <div>ผ้าอ้อม {p.monthlyDiaperAllowance} ชิ้น/ด.</div>
                        <div className="text-[10px] text-slate-400">{p.equipmentNeeded}</div>
                      </td>
                      <td className="p-2.5">
                        <div className="text-slate-800 font-medium">{p.caregiverName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{p.caregiverPhone}</div>
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          onClick={() => onRecordVisit(p)}
                          className="px-2 py-1 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded text-[11px] font-bold cursor-pointer"
                        >
                          เยี่ยมบ้าน
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: หน้าคลังอุปกรณ์ LTC */}
      {subTab === 'inventory' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-teal-700" />
                <span>คลังพัสดุและกายอุปกรณ์โครงการ สปสช. 10(7) & LTC</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                กองสาธารณสุขและสิ่งแวดล้อม เทศบาลตำบลบางเป้า • ตรวจสอบสต็อกคงคลังผ้าอ้อมผู้ใหญ่และอุปกรณ์ดูแล
              </p>
            </div>

            <button
              onClick={() => {
                alert('ระบบนำเข้าพัสดุใหม่ตามใบส่งของจากกองทุน สปสช.');
              }}
              className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
            >
              + บันทึกรับพัสดุเข้าคลัง
            </button>
          </div>

          {/* Inventory Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">รายการพัสดุ / สเปก</th>
                  <th className="p-3 text-center">สต็อกทั้งหมด</th>
                  <th className="p-3 text-center">จัดสรรแล้ว</th>
                  <th className="p-3 text-center">คงเหลือในคลัง</th>
                  <th className="p-3 text-center">ความต้องการ/เดือน</th>
                  <th className="p-3 text-center">สถานะ</th>
                  <th className="p-3 text-center">ล็อตผลิต</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{item.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{item.specification}</div>
                    </td>
                    <td className="p-3 text-center font-bold text-slate-700">
                      {item.totalStock.toLocaleString()} {item.unit}
                    </td>
                    <td className="p-3 text-center text-teal-700 font-bold">
                      {item.allocatedStock.toLocaleString()} {item.unit}
                    </td>
                    <td className="p-3 text-center">
                      <span className="text-sm font-extrabold text-emerald-700">
                        {item.remainingStock.toLocaleString()}
                      </span>{' '}
                      <span className="text-[10px] text-slate-400">{item.unit}</span>
                    </td>
                    <td className="p-3 text-center font-medium text-slate-600">
                      {item.monthlyRequirement.toLocaleString()} {item.unit}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'sufficient'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'low'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {item.status === 'sufficient' ? '🟢 เพียงพอ' : '🟡 สต็อกเริ่มต่ำ'}
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono text-[11px] text-slate-500">
                      {item.lotNo}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: โครงการ สปสช. (ยื่นเสนอ, มติกรรมการ, พิมพ์เอกสารแนบ 6) */}
      {subTab === 'nhso' && (
        <NhsoFundView
          projects={projects}
          userRole={userRole}
          onAddNew={onAddNewProject}
          onApproveProject={onApproveProject}
        />
      )}
    </div>
  );
};
