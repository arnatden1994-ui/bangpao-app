import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Crosshair,
  Sparkles,
  X,
  RotateCcw,
  Maximize2,
  Minimize2,
  Copy,
  Trash2,
  Edit3,
  Save,
  LayoutDashboard,
  Check,
  Undo2,
  Calendar,
  Bell,
  Send,
  Download,
} from 'lucide-react';
import { NhsoProject, LtcPatient, LtcRoundItem, RoundDeliveryRecord, UserRole, SignerSettings } from '../types/index.ts';
import {
  buildLtcDeliveryQueueNotificationPayload,
  dispatchNotification,
  openAttachmentPrintableHtml,
  downloadAttachmentDocx,
  NotificationLogItem,
} from '../services/notificationService.ts';
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
  onUpdatePatient?: (patient: LtcPatient) => void;
  onDeletePatient?: (patientId: string) => void;
  onRecordVisit: (patient: LtcPatient) => void;
  onPrintCarePlan: (patient: LtcPatient) => void;
  activeSubTab?: 'route' | 'register' | 'inventory' | 'nhso';
  onSubTabChange?: (tab: 'route' | 'register' | 'inventory' | 'nhso') => void;
  signerSettings?: SignerSettings;
  gasUrl?: string;
  onShowToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

// LTC Delivery Stop Mock Data based on Bangpao Tambon
export interface DeliveryStop {
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
  createdAt?: string;
}

export const formatThaiDate = (dateStr?: string, includeTime: boolean = false): string => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const datePart = d.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
    });
    const hasTime = dateStr.includes('T') || (dateStr.includes(':') && dateStr.length > 10);
    if (includeTime && hasTime) {
      const timePart = d.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return `${datePart} ${timePart} น.`;
    }
    return datePart;
  } catch {
    return dateStr;
  }
};

export const BANGPAO_VILLAGES: Record<string, string> = {
  '1': 'บ้านชายวัด',
  '2': 'บ้านเกาะปอม',
  '3': 'บ้านตลาดใหม่',
  '4': 'บ้านแหลมม่วง',
  '5': 'บ้านป่าเตียว',
  '6': 'บ้านควนทองสีห์',
  '7': 'บ้านท่าเรือ',
};

export const BANGPAO_COORDS: Record<string, { lat: number; lng: number }> = {
  '1': { lat: 7.429578, lng: 99.525737 },
  '2': { lat: 7.421512, lng: 99.529104 },
  '3': { lat: 7.416288, lng: 99.519842 },
  '4': { lat: 7.411645, lng: 99.531215 },
  '5': { lat: 7.405812, lng: 99.524109 },
  '6': { lat: 7.419320, lng: 99.538410 },
  '7': { lat: 7.402190, lng: 99.514280 },
};

export const BANGPAO_MUNICIPALITY_COORDS = {
  lat: 7.429625,
  lng: 99.52522,
  name: 'สำนักงานเทศบาลตำบลบางเป้า (กองสาธารณสุข)',
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
      lat: p.latitude ?? (base.lat + ((idx % 3) * 0.002 - 0.002)),
      lng: p.longitude ?? (base.lng + (((idx * 2) % 3) * 0.002 - 0.002)),
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
      createdAt: p.createdAt || p.lastVisitDate || '2026-10-01',
    };
  });
};

const INITIAL_DELIVERY_STOPS: DeliveryStop[] = [
  {
    id: 'STOP-00',
    patientId: 'LTC-6900',
    patientName: 'นายเอกชัย สุขเกษม (นายเอ)',
    moo: '1',
    village: 'บ้านชายวัด',
    address: '15/2 หมู่ที่ 1 บ้านชายวัด ต.บางเป้า',
    lat: 7.42781,
    lng: 99.52495,
    adlCategory: 'ติดบ้าน',
    diaperSize: 'L',
    diaperQuantity: 45,
    underpadQuantity: 30,
    airMattressNeeded: false,
    status: 'pending',
    routeOrder: 1,
    createdAt: '2026-10-01',
    notes: 'แผนจ่ายอาหารเสริมโภชนาการ: รอบที่ 1 นม 10 กล่อง, รอบที่ 2 นม 5 กล่อง',
  },
  {
    id: 'STOP-01',
    patientId: 'LTC-6901',
    patientName: 'นางสายใจ อินทร์แก้ว',
    moo: '1',
    village: 'บ้านชายวัด',
    address: '45/1 หมู่ที่ 1 ต.บางเป้า',
    lat: 7.429578,
    lng: 99.525737,
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
    village: 'บ้านเกาะปอม',
    address: '12/4 หมู่ที่ 2 ต.บางเป้า',
    lat: 7.421512,
    lng: 99.529104,
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
    village: 'บ้านตลาดใหม่',
    address: '88 หมู่ที่ 3 ต.บางเป้า',
    lat: 7.416288,
    lng: 99.519842,
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
    village: 'บ้านแหลมม่วง',
    address: '103 หมู่ที่ 4 ต.บางเป้า',
    lat: 7.411645,
    lng: 99.531215,
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
    village: 'บ้านป่าเตียว',
    address: '19 หมู่ที่ 5 ต.บางเป้า',
    lat: 7.405812,
    lng: 99.524109,
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
  code: string;
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

interface StockTransactionLog {
  id: string;
  dateStr: string;
  itemName: string;
  type: 'in' | 'out';
  quantity: number;
}

const INITIAL_LTC_INVENTORY: LtcInventoryItem[] = [
  {
    id: 'INV-LTC-01',
    code: '2',
    name: 'ผ้าอ้อมผู้ใหญ่ (M)',
    specification: 'รอบสะโพก 29-46 นิ้ว ซึมซับดีเยี่ยมสำหรับผู้ป่วยติดเตียง',
    totalStock: 5000,
    allocatedStock: 1,
    remainingStock: 4999,
    unit: 'ชิ้น',
    monthlyRequirement: 540,
    lotNo: 'LOT-NHSO-6901',
    expireDate: '2028-06-30',
    status: 'sufficient',
  },
  {
    id: 'INV-LTC-03',
    code: '3',
    name: 'ผ้าอ้อมผู้ใหญ่ (XL)',
    specification: 'รอบสะโพก 50-65 นิ้ว สำหรับรูปร่างใหญ่พิเศษ',
    totalStock: 5000,
    allocatedStock: 0,
    remainingStock: 5000,
    unit: 'ชิ้น',
    monthlyRequirement: 270,
    lotNo: 'LOT-NHSO-6903',
    expireDate: '2028-05-15',
    status: 'sufficient',
  },
  {
    id: 'INV-LTC-02',
    code: '1',
    name: 'ผ้าอ้อมผู้ใหญ่ (L)',
    specification: 'รอบสะโพก 40-55 นิ้ว มีแถบวัดความเปียกชื้น',
    totalStock: 4000,
    allocatedStock: 0,
    remainingStock: 4000,
    unit: 'ชิ้น',
    monthlyRequirement: 900,
    lotNo: 'LOT-NHSO-6902',
    expireDate: '2028-08-31',
    status: 'sufficient',
  },
  {
    id: 'INV-LTC-04',
    code: '4',
    name: 'ผ้าอ้อมผู้ใหญ่ (XXL)',
    specification: 'ขนาดใหญ่พิเศษ รอบสะโพก 60 นิ้วขึ้นไป',
    totalStock: 3000,
    allocatedStock: 0,
    remainingStock: 3000,
    unit: 'ชิ้น',
    monthlyRequirement: 180,
    lotNo: 'LOT-NHSO-6904',
    expireDate: '2029-01-31',
    status: 'sufficient',
  },
  {
    id: 'INV-LTC-05',
    code: '5',
    name: 'นมผงสุขภาพ',
    specification: 'อาหารเสริมทางการแพทย์สูตรครบถ้วนสำหรับผู้สูงอายุ',
    totalStock: 50,
    allocatedStock: 0,
    remainingStock: 50,
    unit: 'กระป๋อง',
    monthlyRequirement: 20,
    lotNo: 'LOT-NHSO-6905',
    expireDate: '2031-12-31',
    status: 'sufficient',
  },
  {
    id: 'INV-LTC-06',
    code: '6',
    name: 'แผ่นรองซับสิ่งขับถ่าย (Underpads)',
    specification: 'ขนาด 45 x 70 ซม. ชั้นเจลซึมซับหนา 5 ชั้น ป้องกันการรั่วซึม',
    totalStock: 2400,
    allocatedStock: 960,
    remainingStock: 1440,
    unit: 'แผ่น',
    monthlyRequirement: 960,
    lotNo: 'LOT-NHSO-6906',
    expireDate: '2029-01-31',
    status: 'sufficient',
  },
  {
    id: 'INV-LTC-07',
    code: '7',
    name: 'นมกล่องสุขภาพ (UHT)',
    specification: 'นมเสริมโภชนาการทางการแพทย์พร้อมดื่มสูตรครบถ้วน สำหรับผู้สูงอายุและผู้ป่วย',
    totalStock: 1200,
    allocatedStock: 0,
    remainingStock: 1200,
    unit: 'กล่อง',
    monthlyRequirement: 240,
    lotNo: 'LOT-NHSO-6907',
    expireDate: '2028-12-31',
    status: 'sufficient',
  },
];

export const INITIAL_DELIVERY_RECORDS: Record<string, RoundDeliveryRecord> = {
  // Pre-seed delivery records for 2569 Round 1
  'LTC-6901_2569_1': {
    patientId: 'LTC-6901',
    year: '2569',
    round: '1',
    status: 'delivered',
    deliveredAt: '2026-10-06 09:30',
    receiverName: 'นางสาวสมศรี (ลูกสาว/CG)',
    deliveryNote: 'ส่งมอบเรียบร้อย แผลกดทับดีขึ้น',
    itemsDelivered: [
      { itemId: 'INV-LTC-02', itemName: 'ผ้าอ้อมผู้ใหญ่ (L)', quantity: 90, unit: 'ชิ้น' },
      { itemId: 'INV-LTC-06', itemName: 'แผ่นรองซับสิ่งขับถ่าย (Underpads)', quantity: 60, unit: 'แผ่น' },
    ],
  },
  'LTC-6903_2569_1': {
    patientId: 'LTC-6903',
    year: '2569',
    round: '1',
    status: 'delivered',
    deliveredAt: '2026-10-04 10:15',
    receiverName: 'นางอำไพ ชัยมงคล (ลูกสาว/CG)',
    deliveryNote: 'ส่งมอบพร้อมยาประจำตัว',
    itemsDelivered: [
      { itemId: 'INV-LTC-01', itemName: 'ผ้าอ้อมผู้ใหญ่ (M)', quantity: 90, unit: 'ชิ้น' },
      { itemId: 'INV-LTC-06', itemName: 'แผ่นรองซับสิ่งขับถ่าย (Underpads)', quantity: 60, unit: 'แผ่น' },
    ],
  },
};

const INITIAL_STOCK_LOGS: StockTransactionLog[] = [
  {
    id: 'LOG-01',
    dateStr: 'Wed',
    itemName: 'ผ้าอ้อมผู้ใหญ่ (M)',
    type: 'out',
    quantity: -1,
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
  onUpdatePatient,
  onDeletePatient,
  onRecordVisit,
  onPrintCarePlan,
  activeSubTab: controlledSubTab,
  onSubTabChange,
  signerSettings,
  gasUrl,
  onShowToast,
}) => {
  // 4 Sub-tabs requested by user:
  // 1) ระบบนำทาง สร้างเส้นทางสำหรับแจกจ่ายของ (Route Optimizer)
  // 2) ลงทะเบียนผู้มีภาวะพึ่งพิง
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
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('2569');
  const [selectedRoundFilter, setSelectedRoundFilter] = useState<string>('1');
  const [selectedMooFilter, setSelectedMooFilter] = useState<string>('all');
  const [adlFilter, setAdlFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dashboardSearch, setDashboardSearch] = useState<string>('');
  const [showPinLabels, setShowPinLabels] = useState<boolean>(true);
  const [isOverviewMapFullscreen, setIsOverviewMapFullscreen] = useState<boolean>(false);
  const [activeStop, setActiveStop] = useState<DeliveryStop | null>(null);

  // Overview Map Refs (for 'route' / แดชบอร์ดติดตาม subTab)
  const overviewMapContainerRef = useRef<HTMLDivElement | null>(null);
  const overviewMapInstanceRef = useRef<any>(null);
  const overviewMarkersLayerRef = useRef<any>(null);
  const overviewRouteLayerRef = useRef<any>(null);
  const overviewMarkerMapRef = useRef<Record<string, any>>({});

  // Route Drawing & Free Ordering State
  const [isRouteDrawn, setIsRouteDrawn] = useState<boolean>(false);
  const [isDrawingRouteLoading, setIsDrawingRouteLoading] = useState<boolean>(false);
  const [routeMetrics, setRouteMetrics] = useState<{ distanceKm: number; durationMin: number } | null>(null);
  const [draggedStopId, setDraggedStopId] = useState<string | null>(null);
  const [isShareRouteModalOpen, setIsShareRouteModalOpen] = useState<boolean>(false);
  const [shareCopyFeedback, setShareCopyFeedback] = useState<string | null>(null);
  const [isSendingLtcNotify, setIsSendingLtcNotify] = useState<boolean>(false);
  const [ltcNotifyResultLog, setLtcNotifyResultLog] = useState<NotificationLogItem | null>(null);

  // Sync stops when patients prop updates (e.g. added/edited/deleted)
  useEffect(() => {
    if (patients && patients.length > 0) {
      const converted = convertPatientsToDeliveryStops(patients);
      setStops((prev) => {
        const prevMap = new Map(prev.map((s) => [s.patientId, s]));
        const merged = converted.map((item, idx) => {
          const existing = prevMap.get(item.patientId);
          return existing
            ? {
                ...item,
                status: existing.status === 'delivered' || item.status === 'delivered' ? 'delivered' : 'pending',
                deliveredAt: existing.deliveredAt || item.deliveredAt,
                receiverName: existing.receiverName || item.receiverName,
                routeOrder: existing.routeOrder || idx + 1,
              }
            : { ...item, routeOrder: prev.length + idx + 1 };
        });
        return merged
          .sort((a, b) => a.routeOrder - b.routeOrder)
          .map((s, i) => ({ ...s, routeOrder: i + 1 }));
      });
      setSelectedStopIds((prevIds) => {
        const validIds = new Set(converted.map((s) => s.id));
        return prevIds.filter((id) => validIds.has(id));
      });
    }
  }, [patients]);

  // Delivery Route Selection (starts empty until stops are added via "+ ส่งไปจัดรอบ" or loaded from saved period queue)
  const [selectedStopIds, setSelectedStopIds] = useState<string[]>([]);

  // Delivery Handover Modal State (Replaces window.prompt)
  const [deliveryModalStop, setDeliveryModalStop] = useState<DeliveryStop | null>(null);
  const [deliveryReceiver, setDeliveryReceiver] = useState('');
  const [deliveryRelation, setDeliveryRelation] = useState('ผู้ดูแลผู้ป่วย');
  const [deliveryNote, setDeliveryNote] = useState('');

  // Inventory State
  const [inventory, setInventory] = useState<LtcInventoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('bangpao_ltc_inventory_v2');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_LTC_INVENTORY;
  });
  const [stockLogs, setStockLogs] = useState<StockTransactionLog[]>(() => {
    try {
      const saved = localStorage.getItem('bangpao_ltc_stock_logs_v2');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_STOCK_LOGS;
  });
  const [newStockForm, setNewStockForm] = useState({
    name: '',
    code: '',
    unit: '',
    quantity: '',
  });
  const [inventoryNotice, setInventoryNotice] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('bangpao_ltc_inventory_v2', JSON.stringify(inventory));
    } catch {}
  }, [inventory]);

  useEffect(() => {
    try {
      localStorage.setItem('bangpao_ltc_stock_logs_v2', JSON.stringify(stockLogs));
    } catch {}
  }, [stockLogs]);

  const handleAddStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const itemName = newStockForm.name.trim();
    const qty = parseInt(newStockForm.quantity, 10) || 0;
    if (!itemName || qty <= 0) return;

    const unitStr = newStockForm.unit.trim() || 'ชิ้น';
    const codeStr = newStockForm.code.trim();

    setInventory((prev) => {
      const existingIdx = prev.findIndex(
        (it) =>
          it.name.toLowerCase() === itemName.toLowerCase() ||
          (codeStr && it.code === codeStr)
      );
      if (existingIdx >= 0) {
        const updated = [...prev];
        const target = updated[existingIdx];
        updated[existingIdx] = {
          ...target,
          totalStock: target.totalStock + qty,
          remainingStock: target.remainingStock + qty,
          unit: unitStr || target.unit,
          status: 'sufficient',
        };
        return updated;
      } else {
        const nextCode = codeStr || String(prev.length + 1);
        const newItem: LtcInventoryItem = {
          id: `INV-LTC-${Date.now().toString().slice(-4)}`,
          code: nextCode,
          name: itemName,
          specification: `พัสดุดูแลผู้มีภาวะพึ่งพิง (${unitStr})`,
          totalStock: qty,
          allocatedStock: 0,
          remainingStock: qty,
          unit: unitStr,
          monthlyRequirement: qty,
          lotNo: `LOT-${new Date().getFullYear() + 543}`,
          expireDate: '2029-12-31',
          status: 'sufficient',
        };
        return [...prev, newItem];
      }
    });

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const nowDay = dayNames[new Date().getDay()];
    const newLog: StockTransactionLog = {
      id: `LOG-${Date.now()}`,
      dateStr: nowDay,
      itemName,
      type: 'in',
      quantity: qty,
    };
    setStockLogs((prev) => [newLog, ...prev.slice(0, 49)]);
    setNewStockForm({ name: '', code: '', unit: '', quantity: '' });
    setInventoryNotice(`✅ บันทึกรับพัสดุ "${itemName}" จำนวน +${qty} ${unitStr} เข้าคลังเรียบร้อยแล้ว`);
    setTimeout(() => setInventoryNotice(null), 3500);
  };

  // New Patient Registration Form State with GPS & Round Items (By Fiscal Year & Round)
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const regFormTopRef = useRef<HTMLDivElement | null>(null);
  const routeSequencerBoxRef = useRef<HTMLDivElement | null>(null);

  const [regFiscalYear, setRegFiscalYear] = useState<string>('2569');
  const [regActiveRound, setRegActiveRound] = useState<string>('1');
  const [autoQueueOnSave, setAutoQueueOnSave] = useState<boolean>(true);
  const [queueToastMsg, setQueueToastMsg] = useState<string | null>(null);

  // Configured rounds: defaults to 2 rounds ('1' and '2'). Dynamic add enabled if more needed.
  const [configuredRounds, setConfiguredRounds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('bangpao_ltc_configured_rounds_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return ['1', '2'];
  });

  const configuredYears = ['2569', '2570'];

  const createDefaultRoundsMap = (): Record<string, LtcRoundItem[]> => {
    const map: Record<string, LtcRoundItem[]> = {};
    configuredRounds.forEach((r) => {
      map[r] = [{ itemId: '', itemName: '', quantity: 0, unit: 'ชิ้น' }];
    });
    return map;
  };

  const handleAddNewRound = () => {
    const nextNum = configuredRounds.length + 1;
    const nextRoundKey = String(nextNum);
    if (!configuredRounds.includes(nextRoundKey)) {
      const updated = [...configuredRounds, nextRoundKey];
      setConfiguredRounds(updated);
      try {
        localStorage.setItem('bangpao_ltc_configured_rounds_v2', JSON.stringify(updated));
      } catch {}
      setRoundItems((prev) => ({
        ...prev,
        [nextRoundKey]: [{ itemId: '', itemName: '', quantity: 0, unit: 'ชิ้น' }],
      }));
      setYearRoundItems((prev) => {
        const nextMap = { ...prev };
        Object.keys(nextMap).forEach((yr) => {
          if (!nextMap[yr][nextRoundKey]) {
            nextMap[yr] = {
              ...nextMap[yr],
              [nextRoundKey]: [{ itemId: '', itemName: '', quantity: 0, unit: 'ชิ้น' }],
            };
          }
        });
        return nextMap;
      });
      setQueueToastMsg(`✅ เพิ่มวงรอบการส่งมอบ "รอบที่ ${nextRoundKey}" เรียบร้อยแล้ว`);
      setTimeout(() => setQueueToastMsg(null), 3500);
    }
  };

  const getRoundDisplayLabel = (rKey: string) => {
    if (rKey === 'all') return 'รวมทุกวงรอบ (ทั้งปี)';
    if (rKey === '1') return 'วงรอบที่ 1 (ต.ค. – มี.ค.)';
    if (rKey === '2') return 'วงรอบที่ 2 (เม.ย. – ก.ย.)';
    return `วงรอบที่ ${rKey}`;
  };

  const [roundItems, setRoundItems] = useState<Record<string, LtcRoundItem[]>>(createDefaultRoundsMap);
  const [yearRoundItems, setYearRoundItems] = useState<Record<string, Record<string, LtcRoundItem[]>>>({
    '2569': createDefaultRoundsMap(),
    '2570': createDefaultRoundsMap(),
  });

  // Per-(FiscalYear, Round) Delivery Queue Map so each Year + Round maintains its own queue
  const [periodQueues, setPeriodQueues] = useState<Record<string, string[]>>({});

  // Per-(Patient, Year, Round) Delivery Handover Records & Tracking
  const [deliveryRecords, setDeliveryRecords] = useState<Record<string, RoundDeliveryRecord>>(() => {
    try {
      const saved = localStorage.getItem('bangpao_ltc_round_deliveries_v1');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_DELIVERY_RECORDS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('bangpao_ltc_round_deliveries_v1', JSON.stringify(deliveryRecords));
    } catch {}
  }, [deliveryRecords]);

  // Tab filter inside the Round Recipient Table: 'all' | 'pending' | 'delivered'
  const [roundRecipientFilter, setRoundRecipientFilter] = useState<'all' | 'pending' | 'delivered'>('all');
  // Sort order inside Round Recipient Table: 'created_desc' (default - newest import date first) | 'queue_asc' | 'moo_asc' | 'name_asc'
  const [recipientSortOrder, setRecipientSortOrder] = useState<'created_desc' | 'queue_asc' | 'moo_asc' | 'name_asc'>('created_desc');

  // Helper to get delivery status for any patient in any year & round
  const getStopDeliveryStatus = (
    patientId: string,
    year: string = selectedYearFilter,
    round: string = selectedRoundFilter
  ) => {
    const effYear = year === 'all' ? '2569' : year;
    const effRound = round === 'all' ? '1' : round;
    const key = `${patientId}_${effYear}_${effRound}`;
    const rec = deliveryRecords[key];
    if (rec && rec.status === 'delivered') {
      return {
        status: 'delivered' as const,
        deliveredAt: rec.deliveredAt,
        receiverName: rec.receiverName,
        deliveryNote: rec.deliveryNote,
        itemsDelivered: rec.itemsDelivered || [],
      };
    }
    return {
      status: 'pending' as const,
      deliveredAt: undefined,
      receiverName: undefined,
      deliveryNote: undefined,
      itemsDelivered: [] as LtcRoundItem[],
    };
  };

  const [newReg, setNewReg] = useState({
    nationalId: '',
    fullName: '',
    gender: 'female' as 'male' | 'female',
    age: '',
    moo: '',
    address: '',
    phone: '',
    lat: BANGPAO_COORDS['1'].lat,
    lng: BANGPAO_COORDS['1'].lng,
    adlScore: '5',
    adlCategory: 'ติดเตียง' as 'ติดเตียง' | 'ติดบ้าน' | 'ติดสังคม',
    caregiverName: '',
    caregiverPhone: '',
    diaperSize: 'L' as 'M' | 'L' | 'XL',
    diaperPerMonth: '90',
    underpadPerMonth: '60',
    airMattressNeeded: false,
    disease: 'โรคหลอดเลือดสมอง (Stroke) / อัมพาตครึ่งซีก',
    createdAt: '2026-10-01',
  });

  const [regSuccessMsg, setRegSuccessMsg] = useState('');
  const [regErrorMsg, setRegErrorMsg] = useState<string | null>(null);
  const [isFetchingGps, setIsFetchingGps] = useState(false);

  // Leaflet Map Refs for Registration Pin Map
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);

  // Helper to update pin on map and state
  const updateMapPin = (lat: number, lng: number, panMap = true) => {
    const fixedLat = Number(lat.toFixed(6));
    const fixedLng = Number(lng.toFixed(6));
    setNewReg((prev) => ({ ...prev, lat: fixedLat, lng: fixedLng }));

    const L = (window as any).L;
    if (mapInstanceRef.current && L) {
      if (markerInstanceRef.current) {
        markerInstanceRef.current.setLatLng([fixedLat, fixedLng]);
      } else {
        const redPinIcon = L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        });
        const marker = L.marker([fixedLat, fixedLng], { draggable: true, icon: redPinIcon }).addTo(mapInstanceRef.current);
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          setNewReg((prev) => ({
            ...prev,
            lat: Number(pos.lat.toFixed(6)),
            lng: Number(pos.lng.toFixed(6)),
          }));
        });
        markerInstanceRef.current = marker;
      }
      if (panMap) {
        const currentZoom = mapInstanceRef.current.getZoom();
        mapInstanceRef.current.setView([fixedLat, fixedLng], currentZoom < 16 ? 17 : currentZoom);
      }
    }
  };

  // Fetch Current GPS Coordinates & Center Map
  const handleGetGPS = () => {
    if (!navigator.geolocation) {
      setRegErrorMsg('เบราว์เซอร์ไม่รองรับการดึงพิกัด Geolocation');
      return;
    }
    setIsFetchingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsFetchingGps(false);
        updateMapPin(pos.coords.latitude, pos.coords.longitude, true);
      },
      (err) => {
        setIsFetchingGps(false);
        console.warn('Geolocation warning:', err);
        const fallback = BANGPAO_COORDS[newReg.moo || '1'] || BANGPAO_COORDS['1'];
        updateMapPin(fallback.lat, fallback.lng, true);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Initialize Leaflet Google Satellite Hybrid Map when 'register' subTab is active
  useEffect(() => {
    if (subTab !== 'register') {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerInstanceRef.current = null;
      }
      return;
    }

    let timer = setTimeout(() => {
      const L = (window as any).L;
      const container = mapContainerRef.current as any;
      if (!L || !container) return;

      // Clean up stale Leaflet instance if container was remounted (e.g. HMR)
      if (mapInstanceRef.current && mapInstanceRef.current.getContainer() !== container) {
        try {
          mapInstanceRef.current.remove();
        } catch {}
        mapInstanceRef.current = null;
        markerInstanceRef.current = null;
      }

      if (!mapInstanceRef.current) {
        if (container._leaflet_id) {
          container._leaflet_id = null;
          container.innerHTML = '';
        }

        const initialLat = newReg.lat || BANGPAO_COORDS['1'].lat;
        const initialLng = newReg.lng || BANGPAO_COORDS['1'].lng;

        const map = L.map(container, {
          center: [initialLat, initialLng],
          zoom: 16,
        });

        L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
          maxZoom: 20,
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
          attribution: '© Google Maps',
        }).addTo(map);

        const redPinIcon = L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        });

        const marker = L.marker([initialLat, initialLng], { draggable: true, icon: redPinIcon }).addTo(map);
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          setNewReg((prev) => ({
            ...prev,
            lat: Number(pos.lat.toFixed(6)),
            lng: Number(pos.lng.toFixed(6)),
          }));
        });

        map.on('click', (e: any) => {
          const clickedLat = Number(e.latlng.lat.toFixed(6));
          const clickedLng = Number(e.latlng.lng.toFixed(6));
          marker.setLatLng([clickedLat, clickedLng]);
          setNewReg((prev) => ({
            ...prev,
            lat: clickedLat,
            lng: clickedLng,
          }));
        });

        mapInstanceRef.current = map;
        markerInstanceRef.current = marker;

        setTimeout(() => {
          map.invalidateSize({ animate: false });
        }, 100);
      } else {
        mapInstanceRef.current.invalidateSize({ animate: false });
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [subTab]);

  // Smoothly resize & recenter existing map when toggling fullscreen
  useEffect(() => {
    if (subTab !== 'register' || !mapInstanceRef.current) return;
    const syncSize = () => {
      if (!mapInstanceRef.current) return;
      mapInstanceRef.current.invalidateSize({ animate: false });
      const center = markerInstanceRef.current
        ? markerInstanceRef.current.getLatLng()
        : [newReg.lat || BANGPAO_COORDS['1'].lat, newReg.lng || BANGPAO_COORDS['1'].lng];
      mapInstanceRef.current.setView(center, mapInstanceRef.current.getZoom(), { animate: false });
    };
    syncSize();
    const timers = [30, 120, 280].map((ms) => setTimeout(syncSize, ms));
    return () => timers.forEach(clearTimeout);
  }, [isMapFullscreen, subTab]);

  // Auto-fetch current GPS once when entering the 'register' subTab (unless editing a patient)
  useEffect(() => {
    if (subTab === 'register' && !editingPatientId && navigator.geolocation) {
      setIsFetchingGps(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsFetchingGps(false);
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          setNewReg((prev) => ({ ...prev, lat, lng }));
          if (mapInstanceRef.current && markerInstanceRef.current) {
            markerInstanceRef.current.setLatLng([lat, lng]);
            mapInstanceRef.current.setView([lat, lng], 17);
          }
        },
        () => {
          setIsFetchingGps(false);
        },
        { timeout: 6000, enableHighAccuracy: true }
      );
    }
  }, [subTab]);

  useEffect(() => {
    if (subTab !== 'register' || !mapContainerRef.current) return;
    const handleResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };
    window.addEventListener('resize', handleResize);
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      });
      observer.observe(mapContainerRef.current);
    }
    return () => {
      window.removeEventListener('resize', handleResize);
      observer?.disconnect();
    };
  }, [subTab, isMapFullscreen]);

  // Helper to update both roundItems and yearRoundItems[regFiscalYear]
  const updateActiveYearRoundItems = (
    updater: (prev: Record<string, LtcRoundItem[]>) => Record<string, LtcRoundItem[]>
  ) => {
    setRoundItems((prev) => {
      const next = updater(prev);
      setYearRoundItems((prevYr) => ({
        ...prevYr,
        [regFiscalYear]: next,
      }));
      return next;
    });
  };

  // Switch Fiscal Year inside the Registration/Edit Form
  const handleSwitchRegFiscalYear = (targetYear: string) => {
    setYearRoundItems((prevYr) => ({
      ...prevYr,
      [regFiscalYear]: roundItems,
    }));
    setRegFiscalYear(targetYear);
    const savedForTarget = yearRoundItems[targetYear];
    if (savedForTarget && Object.keys(savedForTarget).length > 0) {
      setRoundItems(savedForTarget);
    } else {
      setRoundItems(createDefaultRoundsMap());
    }
  };

  // Add a new round tab (e.g. รอบที่ 3, รอบที่ 4, รอบที่ 5...)
  const handleAddNewRoundTab = () => {
    const existingNums = Object.keys(roundItems)
      .map((k) => parseInt(k, 10))
      .filter((n) => !isNaN(n));
    const nextRoundKey = String((existingNums.length > 0 ? Math.max(...existingNums) : 2) + 1);
    if (!configuredRounds.includes(nextRoundKey)) {
      const updated = [...configuredRounds, nextRoundKey];
      setConfiguredRounds(updated);
      try {
        localStorage.setItem('bangpao_ltc_configured_rounds_v2', JSON.stringify(updated));
      } catch {}
    }
    updateActiveYearRoundItems((prev) => ({
      ...prev,
      [nextRoundKey]: [{ itemId: '', itemName: '', quantity: 0, unit: 'ชิ้น' }],
    }));
    setRegActiveRound(nextRoundKey);
  };

  // Round Items Helpers
  const handleAddRoundItemRow = (roundKey: string) => {
    updateActiveYearRoundItems((prev) => ({
      ...prev,
      [roundKey]: [...(prev[roundKey] || []), { itemId: '', itemName: '', quantity: 0, unit: 'ชิ้น' }],
    }));
  };

  const handleRemoveRoundItemRow = (roundKey: string, rowIdx: number) => {
    updateActiveYearRoundItems((prev) => {
      const currentRows = prev[roundKey] || [];
      const updated = currentRows.filter((_, i) => i !== rowIdx);
      return {
        ...prev,
        [roundKey]: updated.length > 0 ? updated : [{ itemId: '', itemName: '', quantity: 0, unit: 'ชิ้น' }],
      };
    });
  };

  const handleUpdateRoundItemRow = (
    roundKey: string,
    rowIdx: number,
    field: 'itemId' | 'quantity',
    value: string | number
  ) => {
    updateActiveYearRoundItems((prev) => {
      const currentRows = [...(prev[roundKey] || [{ itemId: '', itemName: '', quantity: 0, unit: 'ชิ้น' }])];
      const row = { ...(currentRows[rowIdx] || { itemId: '', itemName: '', quantity: 0, unit: 'ชิ้น' }) };
      if (field === 'itemId') {
        const matchedInv = inventory.find((inv) => inv.id === value || inv.name === value);
        row.itemId = String(value);
        row.itemName = matchedInv ? matchedInv.name : String(value);
        row.unit = matchedInv ? matchedInv.unit : 'ชิ้น';
      } else {
        row.quantity = Number(value) || 0;
      }
      currentRows[rowIdx] = row;
      return { ...prev, [roundKey]: currentRows };
    });
  };

  const handleCopyRound1ToAll = () => {
    updateActiveYearRoundItems((prev) => {
      const r1 = prev['1'] || [{ itemId: '', itemName: '', quantity: 0, unit: 'ชิ้น' }];
      const next: Record<string, LtcRoundItem[]> = {};
      const keys = Array.from(new Set([...Object.keys(prev), ...configuredRounds]));
      keys.forEach((k) => {
        next[k] = r1.map((item) => ({ ...item }));
      });
      return next;
    });
  };

  const handleClearRegForm = () => {
    setEditingPatientId(null);
    setRegErrorMsg(null);
    const defaultCoords = BANGPAO_COORDS['1'];
    setNewReg({
      nationalId: '',
      fullName: '',
      gender: 'female',
      age: '',
      moo: '',
      address: '',
      phone: '',
      lat: defaultCoords.lat,
      lng: defaultCoords.lng,
      adlScore: '5',
      adlCategory: 'ติดเตียง',
      caregiverName: '',
      caregiverPhone: '',
      diaperSize: 'L',
      diaperPerMonth: '90',
      underpadPerMonth: '60',
      airMattressNeeded: false,
      disease: 'โรคหลอดเลือดสมอง (Stroke) / อัมพาตครึ่งซีก',
      createdAt: '2026-10-01',
    });
    const freshRounds = createDefaultRoundsMap();
    setRoundItems(freshRounds);
    setYearRoundItems({
      '2569': freshRounds,
      '2570': createDefaultRoundsMap(),
    });
    handleGetGPS();
  };

  const handleEditPatientInForm = (p: LtcPatient, preferredYear?: string, preferredRound?: string) => {
    setEditingPatientId(p.id);
    setRegErrorMsg(null);
    const mooNum = p.moo || '1';
    const baseCoords = BANGPAO_COORDS[mooNum] || BANGPAO_COORDS['1'];
    const lat = p.latitude ?? baseCoords.lat;
    const lng = p.longitude ?? baseCoords.lng;

    const targetYear =
      preferredYear ||
      p.fiscalYear ||
      (selectedYearFilter !== 'all' ? selectedYearFilter : '2569');
    const targetRound =
      preferredRound || (selectedRoundFilter !== 'all' ? selectedRoundFilter : '1');

    setRegFiscalYear(targetYear);
    setRegActiveRound(targetRound);
    setAutoQueueOnSave(true);

    // Extract clean house address if it contains village suffix
    const cleanAddr = p.address
      ? p.address.replace(/\s*หมู่ที่\s*\d+.*$/, '').replace(/\s*ม\.\d+.*$/, '').trim()
      : '';

    setNewReg({
      nationalId: p.idCard || '',
      fullName: p.fullName || '',
      gender: p.gender || (p.fullName.startsWith('นาย') ? 'male' : 'female'),
      age: String(p.age || 75),
      moo: mooNum,
      address: cleanAddr || p.address,
      phone: p.phone || '',
      lat,
      lng,
      adlScore: String(p.adlScore || 5),
      adlCategory: (p.adlCategory as any) || 'ติดเตียง',
      caregiverName: p.caregiverName || '',
      caregiverPhone: p.caregiverPhone || p.phone || '',
      diaperSize: 'L',
      diaperPerMonth: String(p.monthlyDiaperAllowance || 90),
      underpadPerMonth: '60',
      airMattressNeeded: false,
      disease: p.diagnosis || '',
      createdAt: p.createdAt || p.lastVisitDate || '2026-10-01',
    });

    const defaultInv =
      inventory.find((i) => p.equipmentNeeded?.includes(i.name.split(' ')[0])) || inventory[1];
    const fallbackRow: LtcRoundItem = {
      itemId: defaultInv?.id || 'INV-LTC-02',
      itemName: defaultInv?.name || 'ผ้าอ้อมผู้ใหญ่ (L)',
      quantity: p.monthlyDiaperAllowance || 90,
      unit: defaultInv?.unit || 'ชิ้น',
    };

    const baseRounds: Record<string, LtcRoundItem[]> =
      p.yearRoundItems?.[targetYear] ||
      p.roundItems || {
        '1': [{ ...fallbackRow }],
        '2': [{ ...fallbackRow }],
        '3': [{ ...fallbackRow }],
        '4': [{ ...fallbackRow }],
      };

    // Ensure at least rounds 1, 2, 3, 4 exist so user can freely switch between them
    const normalizedRounds: Record<string, LtcRoundItem[]> = {
      '1': baseRounds['1']?.length ? baseRounds['1'] : [{ ...fallbackRow }],
      '2': baseRounds['2']?.length ? baseRounds['2'] : [{ ...fallbackRow }],
      '3': baseRounds['3']?.length ? baseRounds['3'] : [{ ...fallbackRow }],
      '4': baseRounds['4']?.length ? baseRounds['4'] : [{ ...fallbackRow }],
      ...baseRounds,
    };

    setRoundItems(normalizedRounds);
    setYearRoundItems((prevYr) => ({
      ...prevYr,
      ...(p.yearRoundItems || {}),
      [targetYear]: normalizedRounds,
    }));

    updateMapPin(lat, lng, true);
    setTimeout(() => {
      regFormTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  // Helper to synchronize stops array order and routeOrder numbers, plus save queue for active (year, round)
  const getActivePeriodKey = (yr = selectedYearFilter, rd = selectedRoundFilter) =>
    `${yr === 'all' ? '2569' : yr}-${rd === 'all' ? '1' : rd}`;

  const updateSelectedQueueForPeriod = (
    nextIds: string[],
    yr = selectedYearFilter,
    rd = selectedRoundFilter
  ) => {
    setSelectedStopIds(nextIds);
    const pKey = getActivePeriodKey(yr, rd);
    setPeriodQueues((prev) => ({
      ...prev,
      [pKey]: nextIds,
    }));
  };

  // Sync selectedStopIds when user switches Year or Round filter on the dashboard
  useEffect(() => {
    const pKey = getActivePeriodKey(selectedYearFilter, selectedRoundFilter);
    if (periodQueues[pKey]) {
      // Filter out any stops that have already been delivered in this period
      const validPending = periodQueues[pKey].filter((id) => {
        const targetStop = stops.find((s) => s.id === id);
        if (!targetStop) return false;
        return getStopDeliveryStatus(targetStop.patientId, selectedYearFilter, selectedRoundFilter).status === 'pending';
      });
      setSelectedStopIds(validPending);
    } else {
      // Default: Route Sequencer staging area starts empty until user adds stops via "+ ส่งไปจัดรอบ"
      setSelectedStopIds([]);
    }
  }, [selectedYearFilter, selectedRoundFilter, deliveryRecords, stops]);

  // Send a stop directly to the delivery queue for the active Year & Round ("ส่งไปจัดรอบแจก")
  const sendStopToRoundQueue = (stop: DeliveryStop, scrollToSequencer = false) => {
    const nextSel = selectedStopIds.includes(stop.id)
      ? selectedStopIds
      : [...selectedStopIds, stop.id];

    const stopMap = new Map<string, DeliveryStop>(stops.map((s) => [s.id, s]));
    const pickedStops = nextSel
      .map((id) => stopMap.get(id))
      .filter((s): s is DeliveryStop => Boolean(s));
    const unpickedStops = stops.filter((s) => !nextSel.includes(s.id));
    const combined = [...pickedStops, ...unpickedStops].map((s, idx) => ({
      ...s,
      routeOrder: idx + 1,
    }));

    setStops(combined);
    updateSelectedQueueForPeriod(nextSel);
    const queueNo = nextSel.indexOf(stop.id) + 1;
    setQueueToastMsg(
      `✅ ส่ง "${stop.patientName}" (หมู่ที่ ${stop.moo}) เข้าคิวจัดรอบแจก #${queueNo} (${activeYearLabel} • ${activeRoundLabel}) เรียบร้อยแล้ว`
    );
    setTimeout(() => setQueueToastMsg(null), 4000);

    if (scrollToSequencer) {
      setTimeout(() => {
        routeSequencerBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 80);
    }
  };

  const applyNewStopsOrder = (orderedStops: DeliveryStop[], nextSelectedIds?: string[]) => {
    const updated = orderedStops.map((s, idx) => ({
      ...s,
      routeOrder: idx + 1,
    }));
    setStops(updated);
    const activeIds = nextSelectedIds ?? selectedStopIds;
    const syncedSelected = updated
      .map((s) => s.id)
      .filter((id) => activeIds.includes(id));
    updateSelectedQueueForPeriod(syncedSelected);
  };

  // Reorder Stops in Route Planner by index
  const moveStopOrder = (index: number, direction: 'up' | 'down') => {
    const newStops = [...stops];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newStops.length) return;
    const temp = newStops[index];
    newStops[index] = newStops[targetIndex];
    newStops[targetIndex] = temp;
    applyNewStopsOrder(newStops);
  };

  // Move a specific stop up or down freely by stopId
  const moveStopById = (stopId: string, direction: 'up' | 'down') => {
    const idx = stops.findIndex((s) => s.id === stopId);
    if (idx === -1) return;
    moveStopOrder(idx, direction);
  };

  // Jump a stop directly to a specific 1-based position (1 = บ้านแรก, 2 = บ้านที่ 2, ...)
  const changeStopPosition = (stopId: string, targetOneBasedPos: number) => {
    const currentIndex = stops.findIndex((s) => s.id === stopId);
    if (currentIndex === -1) return;
    const targetIndex = Math.max(0, Math.min(stops.length - 1, targetOneBasedPos - 1));
    if (currentIndex === targetIndex) return;
    const newStops = [...stops];
    const [moved] = newStops.splice(currentIndex, 1);
    newStops.splice(targetIndex, 0, moved);
    const nextSel = selectedStopIds.includes(stopId)
      ? selectedStopIds
      : [...selectedStopIds, stopId];
    applyNewStopsOrder(newStops, nextSel);
  };

  // Drag-and-drop reorder between two stop cards
  const reorderStopsByDrag = (sourceId: string, targetId: string) => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    const srcIdx = stops.findIndex((s) => s.id === sourceId);
    const tgtIdx = stops.findIndex((s) => s.id === targetId);
    if (srcIdx === -1 || tgtIdx === -1) return;
    const newStops = [...stops];
    const [moved] = newStops.splice(srcIdx, 1);
    newStops.splice(tgtIdx, 0, moved);
    applyNewStopsOrder(newStops);
  };

  // Auto Sort Route Order by Village Moo (1 -> 7)
  const autoSortStopsByMoo = () => {
    const newStops = [...stops].sort((a, b) => Number(a.moo) - Number(b.moo));
    applyNewStopsOrder(newStops);
  };

  // Auto Sort by Nearest Neighbor starting from Bangpao Municipality HQ (7.429625, 99.52522)
  const autoSortNearestFromHq = () => {
    const remaining = [...stops];
    const sorted: DeliveryStop[] = [];
    let curLat = BANGPAO_MUNICIPALITY_COORDS.lat;
    let curLng = BANGPAO_MUNICIPALITY_COORDS.lng;

    while (remaining.length > 0) {
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const dLat = remaining[i].lat - curLat;
        const dLng = remaining[i].lng - curLng;
        const dist = dLat * dLat + dLng * dLng;
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      }
      const [closest] = remaining.splice(bestIdx, 1);
      sorted.push(closest);
      curLat = closest.lat;
      curLng = closest.lng;
    }

    applyNewStopsOrder(sorted);
  };

  // Toggle Selection of a Stop for Route (Selecting appends to the end of queue and orders selected stops first)
  const toggleStopSelection = (stopId: string) => {
    let nextSelected: string[];
    if (selectedStopIds.includes(stopId)) {
      nextSelected = selectedStopIds.filter((id) => id !== stopId);
    } else {
      nextSelected = [...selectedStopIds, stopId];
    }

    // Reorder stops so selected stops appear in the exact sequence they were picked, followed by unselected stops
    const stopMap = new Map<string, DeliveryStop>(stops.map((s) => [s.id, s]));
    const pickedStops = nextSelected
      .map((id) => stopMap.get(id))
      .filter((s): s is DeliveryStop => Boolean(s));
    const unpickedStops = stops.filter((s) => !nextSelected.includes(s.id));
    const combined = [...pickedStops, ...unpickedStops].map((s, idx) => ({
      ...s,
      routeOrder: idx + 1,
    }));

    setStops(combined);
    updateSelectedQueueForPeriod(nextSelected);
  };

  // Clear queue so user can click houses one-by-one in desired order (1st, 2nd, 3rd...)
  const clearQueueToPickInOrder = () => {
    updateSelectedQueueForPeriod([]);
    setIsRouteDrawn(false);
    setRouteMetrics(null);
  };

  const selectAllStops = () => {
    updateSelectedQueueForPeriod(stops.map((s) => s.id));
  };

  const selectOnlyPendingStops = () => {
    const pendingIds = stops
      .filter((s) => getStopDeliveryStatus(s.patientId, selectedYearFilter, selectedRoundFilter).status === 'pending')
      .map((s) => s.id);
    const pendingFirst = [
      ...stops.filter((s) => getStopDeliveryStatus(s.patientId, selectedYearFilter, selectedRoundFilter).status === 'pending'),
      ...stops.filter((s) => getStopDeliveryStatus(s.patientId, selectedYearFilter, selectedRoundFilter).status !== 'pending'),
    ].map((s, idx) => ({ ...s, routeOrder: idx + 1 }));
    setStops(pendingFirst);
    updateSelectedQueueForPeriod(pendingIds);
  };

  // Open Delivery Handover Modal
  const openDeliveryModal = (stop: DeliveryStop) => {
    setDeliveryModalStop(stop);
    setDeliveryReceiver(stop.receiverName || 'ผู้ดูแลผู้ป่วย');
    setDeliveryRelation('ผู้ดูแลผู้ป่วย');
    setDeliveryNote(stop.notes || '');
  };

  // Confirm Handover for specific Year and Round
  const handleConfirmDelivery = () => {
    if (!deliveryModalStop) return;
    const receiver = deliveryReceiver.trim() || 'ผู้ดูแลผู้ป่วย';
    const noteText = deliveryNote.trim();
    const effYear = selectedYearFilter === 'all' ? '2569' : selectedYearFilter;
    const effRound = selectedRoundFilter === 'all' ? '1' : selectedRoundFilter;
    const roundData = getStopRoundInfo(deliveryModalStop, effRound, effYear);

    const deliveredItems: LtcRoundItem[] =
      roundData.itemsList && roundData.itemsList.length > 0
        ? roundData.itemsList
        : [
            {
              itemId: 'INV-LTC-02',
              itemName: `ผ้าอ้อม Size ${deliveryModalStop.diaperSize || 'L'}`,
              quantity: deliveryModalStop.diaperQuantity || 90,
              unit: 'ชิ้น',
            },
            {
              itemId: 'INV-LTC-06',
              itemName: 'แผ่นรองซับสิ่งขับถ่าย (Underpads)',
              quantity: deliveryModalStop.underpadQuantity || 60,
              unit: 'แผ่น',
            },
          ];

    const recordKey = `${deliveryModalStop.patientId}_${effYear}_${effRound}`;
    const newRecord: RoundDeliveryRecord = {
      patientId: deliveryModalStop.patientId,
      year: effYear,
      round: effRound,
      status: 'delivered',
      deliveredAt: new Date().toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }),
      receiverName: `${receiver} (${deliveryRelation})`,
      deliveryNote: noteText,
      itemsDelivered: deliveredItems,
    };

    setDeliveryRecords((prev) => ({
      ...prev,
      [recordKey]: newRecord,
    }));

    // CRITICAL: Filter out from delivery queue for this round immediately
    const nextQueue = selectedStopIds.filter((id) => id !== deliveryModalStop.id);
    updateSelectedQueueForPeriod(nextQueue, effYear, effRound);

    const matchedPatient = patients.find((p) => p.id === deliveryModalStop.patientId);
    if (matchedPatient && onRecordVisit) {
      onRecordVisit(matchedPatient);
    }

    // Deduct stock and append transaction log for each delivered item
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const nowDay = dayNames[new Date().getDay()];

    setInventory((prev) =>
      prev.map((item) => {
        const found = deliveredItems.find(
          (it) =>
            it.itemId === item.id ||
            it.itemName.toLowerCase() === item.name.toLowerCase() ||
            item.name.toLowerCase().includes(it.itemName.toLowerCase()) ||
            it.itemName.toLowerCase().includes(item.name.toLowerCase())
        );
        if (found && found.quantity > 0) {
          return {
            ...item,
            allocatedStock: item.allocatedStock + found.quantity,
            remainingStock: Math.max(0, item.remainingStock - found.quantity),
          };
        }
        return item;
      })
    );

    const newLogs: StockTransactionLog[] = deliveredItems.map((it, idx) => ({
      id: `LOG-${Date.now()}-${idx}`,
      dateStr: nowDay,
      itemName: `${it.itemName} (${deliveryModalStop.patientName} ปี ${effYear} รอบ ${effRound})`,
      type: 'out',
      quantity: -it.quantity,
    }));
    setStockLogs((prev) => [...newLogs, ...prev.slice(0, 45)]);

    const itemsSummary = deliveredItems.map((it) => `${it.itemName} ${it.quantity} ${it.unit}`).join(', ');
    setQueueToastMsg(
      `✅ ส่งมอบให้ "${deliveryModalStop.patientName}" (ปี ${effYear} • รอบ ${effRound}) สำเร็จแล้ว (${itemsSummary}) และกรองออกจากคิวจัดส่งรอบนี้เรียบร้อย`
    );
    setTimeout(() => setQueueToastMsg(null), 5000);

    setDeliveryModalStop(null);
  };

  // Revert / Cancel delivery status in case staff confirmed by accident
  const handleRevertDelivery = (stop: DeliveryStop) => {
    const effYear = selectedYearFilter === 'all' ? '2569' : selectedYearFilter;
    const effRound = selectedRoundFilter === 'all' ? '1' : selectedRoundFilter;
    const recordKey = `${stop.patientId}_${effYear}_${effRound}`;
    const prevRec = deliveryRecords[recordKey];

    setDeliveryRecords((prev) => {
      const next = { ...prev };
      delete next[recordKey];
      return next;
    });

    // Revert inventory stock
    if (prevRec && prevRec.itemsDelivered) {
      setInventory((prev) =>
        prev.map((item) => {
          const found = prevRec.itemsDelivered?.find(
            (it) =>
              it.itemId === item.id ||
              it.itemName.toLowerCase() === item.name.toLowerCase() ||
              item.name.toLowerCase().includes(it.itemName.toLowerCase())
          );
          if (found && found.quantity > 0) {
            return {
              ...item,
              allocatedStock: Math.max(0, item.allocatedStock - found.quantity),
              remainingStock: item.remainingStock + found.quantity,
            };
          }
          return item;
        })
      );
    }

    // Add back to queue
    const nextQueue = selectedStopIds.includes(stop.id) ? selectedStopIds : [...selectedStopIds, stop.id];
    updateSelectedQueueForPeriod(nextQueue, effYear, effRound);

    setQueueToastMsg(
      `↩️ ยกเลิกสถานะส่งมอบของ "${stop.patientName}" (ปี ${effYear} • รอบ ${effRound}) แล้ว และนำกลับเข้าสู่คิวรอส่งมอบ`
    );
    setTimeout(() => setQueueToastMsg(null), 4000);
  };

  // Ordered selected stops in the exact sequence chosen by the user (Excluding already-delivered persons in this round!)
  const orderedSelectedStops = selectedStopIds
    .map((id) => stops.find((s) => s.id === id))
    .filter((s): s is DeliveryStop => Boolean(s))
    .filter((s) => getStopDeliveryStatus(s.patientId, selectedYearFilter, selectedRoundFilter).status === 'pending');

  // Generate Turn-by-Turn Multi-Stop Google Maps Navigation URL following the exact user-chosen sequence
  const getGoogleMapsRouteUrl = () => {
    if (orderedSelectedStops.length === 0) {
      return `https://www.google.com/maps/search/?api=1&query=${BANGPAO_MUNICIPALITY_COORDS.lat},${BANGPAO_MUNICIPALITY_COORDS.lng}`;
    }

    const origin = `${BANGPAO_MUNICIPALITY_COORDS.lat},${BANGPAO_MUNICIPALITY_COORDS.lng}`;
    const lastStop = orderedSelectedStops[orderedSelectedStops.length - 1];
    const destination = `${lastStop.lat},${lastStop.lng}`;
    const intermediateStops = orderedSelectedStops.slice(0, -1);

    if (intermediateStops.length === 0) {
      return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
    }

    const waypoints = intermediateStops.map((s) => `${s.lat},${s.lng}`).join('|');
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${encodeURIComponent(
      waypoints
    )}&travelmode=driving`;
  };

  // Build formatted summary text with ordered coordinates & Google Maps link for sharing via LINE / clipboard
  const buildShareableRouteSummaryText = () => {
    const routeUrl = getGoogleMapsRouteUrl();
    const dateStr = new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const distInfo = routeMetrics
      ? ` (ระยะทางรวม ~${routeMetrics.distanceKm} กม. • ~${routeMetrics.durationMin} นาที)`
      : '';

    const stopLines = orderedSelectedStops.map((s, idx) => {
      const matchedPt = patients.find((p) => p.id === s.patientId);
      const eq =
        matchedPt?.equipmentNeeded ||
        `ผ้าอ้อม Size ${s.diaperSize} (${s.diaperQuantity} ชิ้น)`;
      return `คิวที่ #${idx + 1}: ${s.patientName} (ม.${s.moo} ${s.village} • ${s.address})\n   📦 สิ่งของ: ${eq}\n   📍 พิกัด: ${s.lat.toFixed(6)}, ${s.lng.toFixed(6)}`;
    });

    return [
      `🚑 แผนเส้นทางส่งมอบพัสดุ LTC เทศบาลตำบลบางเป้า (${dateStr})`,
      `🏢 จุดเริ่มต้น: ทต.บางเป้า (${BANGPAO_MUNICIPALITY_COORDS.lat}, ${BANGPAO_MUNICIPALITY_COORDS.lng})`,
      `🚩 จำนวนจุดส่งมอบตามลำดับคิว: ${orderedSelectedStops.length} จุด${distInfo}`,
      `----------------------------------------`,
      ...stopLines,
      `----------------------------------------`,
      `🗺️ คลิกเปิดแอป Google Maps นำทางเรียงตามคิวทั้ง ${orderedSelectedStops.length} จุด:`,
      routeUrl,
    ].join('\n');
  };

  const handleCopyRouteUrl = async () => {
    const url = getGoogleMapsRouteUrl();
    try {
      await navigator.clipboard.writeText(url);
      setShareCopyFeedback('✅ คัดลอกลิงก์นำทาง Google Maps เรียบร้อยแล้ว!');
      setTimeout(() => setShareCopyFeedback(null), 3000);
    } catch {}
  };

  const handleCopyFullRouteSummary = async () => {
    const text = buildShareableRouteSummaryText();
    try {
      await navigator.clipboard.writeText(text);
      setShareCopyFeedback('✅ คัดลอกแผนการส่งมอบพร้อมพิกัดและลิงก์ Google Maps เรียบร้อยแล้ว! (นำไปวางใน LINE ได้เลย)');
      setTimeout(() => setShareCopyFeedback(null), 3500);
    } catch {}
  };

  const handleShareRouteViaLine = () => {
    const text = buildShareableRouteSummaryText();
    const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
    window.open(lineUrl, '_blank');
  };

  const handleNativeWebShare = async () => {
    const url = getGoogleMapsRouteUrl();
    const text = buildShareableRouteSummaryText();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `แผนนำทางส่งมอบพัสดุ LTC (${orderedSelectedStops.length} จุด) - ทต.บางเป้า`,
          text,
          url,
        });
        return;
      } catch {}
    }
    handleCopyFullRouteSummary();
  };

  // Send Complete LTC Delivery Queue Notification (All Stops + Items + Multi-Stop Google Maps + A4 Manifest Form) to LINE Group & Official Email
  const handleSendLtcQueueNotification = async () => {
    setIsSendingLtcNotify(true);
    try {
      // Determine target stops in queue (if officer hasn't manually ticked stops yet, auto-load all pending stops in current filter)
      let queueStops: DeliveryStop[] = orderedSelectedStops;
      if (queueStops.length === 0) {
        const pendingTargetStops = filteredStops.filter(
          (s) => getStopDeliveryStatus(s.patientId, selectedYearFilter, selectedRoundFilter).status === 'pending'
        );
        queueStops = pendingTargetStops.length > 0 ? pendingTargetStops : filteredStops;
        if (queueStops.length > 0) {
          updateSelectedQueueForPeriod(queueStops.map((s) => s.id));
        }
      }

      if (queueStops.length === 0) {
        if (onShowToast) {
          onShowToast('error', 'ไม่พบรายชื่อผู้มีภาวะพึ่งพิงในคิวจัดส่ง กรุณาเลือกรอบหรือหมู่บ้านที่มีรายชื่อก่อน');
        }
        setIsSendingLtcNotify(false);
        return;
      }

      // Build Multi-Stop Google Maps Route URL for all stops in queueStops
      const origin = `${BANGPAO_MUNICIPALITY_COORDS.lat},${BANGPAO_MUNICIPALITY_COORDS.lng}`;
      const lastStop = queueStops[queueStops.length - 1];
      const destination = `${lastStop.lat},${lastStop.lng}`;
      const intermediateStops = queueStops.slice(0, -1);
      const multiStopRouteUrl =
        intermediateStops.length === 0
          ? `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`
          : `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${encodeURIComponent(
              intermediateStops.map((s) => `${s.lat},${s.lng}`).join('|')
            )}&travelmode=driving`;

      // Aggregate total supply summary across all queued stops
      const itemAggMap: Record<string, { itemName: string; totalQty: number; unit: string }> = {};
      const notifyStops = queueStops.map((s, idx) => {
        const matchedPt = patients.find((p) => p.id === s.patientId);
        const rInfo = getStopRoundInfo(s, selectedRoundFilter, selectedYearFilter);
        const rawItems =
          rInfo.itemsList && rInfo.itemsList.length > 0
            ? rInfo.itemsList.map((it) => ({
                itemName: it.itemName,
                quantity: Number(it.quantity) || 0,
                unit: it.unit || 'ชิ้น',
              }))
            : [
                {
                  itemName: `ผ้าอ้อมผู้ใหญ่ Size ${s.diaperSize || 'L'}`,
                  quantity: s.diaperQuantity || 90,
                  unit: 'ชิ้น',
                },
              ];

        rawItems.forEach((it) => {
          const k = it.itemName.trim();
          if (!itemAggMap[k]) {
            itemAggMap[k] = { itemName: it.itemName, totalQty: 0, unit: it.unit || 'ชิ้น' };
          }
          itemAggMap[k].totalQty += Number(it.quantity) || 0;
        });

        const itemsSummaryText = rawItems.map((it) => `${it.itemName} (${it.quantity} ${it.unit})`).join(', ');
        const phoneStr = matchedPt?.caregiverPhone || matchedPt?.phone || '075-251-xxx';

        return {
          queueNumber: idx + 1,
          patientId: s.patientId,
          patientName: s.patientName,
          age: matchedPt?.age,
          adlCategory: s.adlCategory,
          moo: s.moo,
          village: s.village || BANGPAO_VILLAGES[s.moo] || `หมู่ที่ ${s.moo}`,
          address: s.address,
          phone: phoneStr,
          itemsSummary: itemsSummaryText,
          itemsList: rawItems,
          lat: s.lat,
          lng: s.lng,
          googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`,
        };
      });

      const effYear = selectedYearFilter === 'all' ? '2569' : selectedYearFilter;
      const effRound = selectedRoundFilter === 'all' ? '1' : selectedRoundFilter;
      const villageLabel =
        selectedMooFilter === 'all'
          ? 'ทุกหมู่บ้าน (หมู่ที่ 1 – 7 ตำบลบางเป้า)'
          : `หมู่ที่ ${selectedMooFilter} ${BANGPAO_VILLAGES[selectedMooFilter] || ''}`;
      const distSummary = routeMetrics
        ? `ระยะทางรวม ~${routeMetrics.distanceKm} กม. • ~${routeMetrics.durationMin} นาที`
        : `จุดเริ่มต้น ทต.บางเป้า ➔ ครบทั้ง ${queueStops.length} บ้านตามลำดับคิว`;

      const payload = buildLtcDeliveryQueueNotificationPayload(
        {
          fiscalYear: effYear,
          roundKey: effRound,
          roundLabel: activeRoundLabel,
          villageFilterLabel: villageLabel,
          originLabel: `เทศบาลตำบลบางเป้า (${BANGPAO_MUNICIPALITY_COORDS.lat}, ${BANGPAO_MUNICIPALITY_COORDS.lng})`,
          multiStopGoogleMapsUrl: multiStopRouteUrl,
          distanceSummary: distSummary,
          preparedBy: 'ทีมงานดูแลผู้มีภาวะพึ่งพิง (LTC) กองสาธารณสุขและสิ่งแวดล้อม',
          totalSupplySummary: Object.values(itemAggMap),
          stops: notifyStops,
        },
        signerSettings
      );

      const res = await dispatchNotification(payload, undefined, gasUrl);
      setLtcNotifyResultLog(res.logItem);
      setQueueToastMsg(
        `🔔 ส่งแจ้งเตือนคิวส่งมอบพัสดุ LTC ครบทั้ง ${queueStops.length} ราย + ลิงก์นำทางแผนที่หลายจุด + ใบจัดส่ง A4 เข้ากลุ่ม LINE & อีเมลเรียบร้อยแล้ว!`
      );
      setTimeout(() => setQueueToastMsg(null), 6000);
      if (onShowToast) {
        onShowToast(
          'success',
          `ส่งแจ้งเตือนคิวจัดส่งพัสดุ LTC ครบทั้ง ${queueStops.length} ราย พร้อมแผนที่นำทางและใบเบิกจ่าย A4 เข้า LINE & อีเมลสำเร็จ!`
        );
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast('error', `เกิดข้อผิดพลาดในการส่งแจ้งเตือนคิว LTC: ${err?.message || String(err)}`);
      }
    } finally {
      setIsSendingLtcNotify(false);
    }
  };

  const savePatientAndQueueByPeriod = (jumpToDashboardQueue = false) => {
    if (!newReg.fullName.trim() || !newReg.nationalId.trim()) {
      setRegErrorMsg('กรุณาระบุชื่อ-นามสกุล และเลขประจำตัวประชาชน 13 หลัก');
      return;
    }
    if (!newReg.moo) {
      setRegErrorMsg('กรุณาเลือกโซน/หมู่บ้าน (หมู่ที่ 1 - 7 ตำบลบางเป้า)');
      return;
    }
    setRegErrorMsg(null);

    const mooNum = newReg.moo;
    const village = BANGPAO_VILLAGES[mooNum] || `หมู่ที่ ${mooNum}`;
    const patientId = editingPatientId || `LTC-${Date.now().toString().slice(-4)}`;
    const targetYear = regFiscalYear || '2569';
    const targetRound = regActiveRound === 'all' ? '1' : regActiveRound || '1';
    const periodKey = `${targetYear}-${targetRound}`;

    // Summarize round items for the active fiscal year
    const validRoundItems: Record<string, LtcRoundItem[]> = {};
    let totalDiaperQty = 0;
    let totalUnderpadQty = 0;
    let detectedSize: 'M' | 'L' | 'XL' = newReg.diaperSize;
    const summaryParts: string[] = [];

    Object.entries(roundItems).forEach(([rKey, list]) => {
      const filtered = list.filter((it) => it.itemName && it.quantity > 0);
      validRoundItems[rKey] = filtered;
      if (filtered.length > 0) {
        const itemsText = filtered
          .map((it) => `${it.itemName} (${it.quantity} ${it.unit || 'ชิ้น'})`)
          .join(', ');
        summaryParts.push(`รอบ ${rKey}: ${itemsText}`);
        filtered.forEach((it) => {
          if (it.itemName.includes('ผ้าอ้อม')) {
            totalDiaperQty += it.quantity;
            if (it.itemName.includes('XL')) detectedSize = 'XL';
            else if (it.itemName.includes('M')) detectedSize = 'M';
            else if (it.itemName.includes('L')) detectedSize = 'L';
          } else if (it.itemName.includes('แผ่นรองซับ')) {
            totalUnderpadQty += it.quantity;
          }
        });
      }
    });

    const equipmentSummary =
      summaryParts.length > 0
        ? `[ปี ${targetYear}] ${summaryParts.join(' | ')}`
        : `ผ้าอ้อม Size ${detectedSize} (${newReg.diaperPerMonth} ชิ้น/ด.)`;

    const fullAddressText = newReg.address.includes('หมู่')
      ? newReg.address
      : `${newReg.address} หมู่ที่ ${mooNum} ${village}`.trim();

    if (editingPatientId) {
      const existing = patients.find((p) => p.id === editingPatientId);
      const mergedYearRounds: Record<string, Record<string, LtcRoundItem[]>> = {
        ...(existing?.yearRoundItems || {}),
        ...yearRoundItems,
        [targetYear]: validRoundItems,
      };
      const nextQueuedPeriods = Array.from(
        new Set([...(existing?.queuedPeriods || []), ...(autoQueueOnSave ? [periodKey] : [])])
      );

      const updatedRecord: LtcPatient = {
        ...(existing || ({} as LtcPatient)),
        id: editingPatientId,
        hn: existing?.hn || `HN-${Math.floor(10000 + Math.random() * 90000)}`,
        idCard: newReg.nationalId,
        fullName: newReg.fullName,
        gender: newReg.gender,
        age: parseInt(newReg.age) || existing?.age || 75,
        adlScore: parseInt(newReg.adlScore) || existing?.adlScore || 5,
        adlGroup:
          (parseInt(newReg.adlScore) || 5) <= 4
            ? 'group_4'
            : (parseInt(newReg.adlScore) || 5) <= 8
            ? 'group_3'
            : 'group_2',
        adlCategory: newReg.adlCategory,
        moo: mooNum,
        address: fullAddressText,
        subdistrict: 'บางเป้า',
        phone: newReg.caregiverPhone || newReg.phone,
        diagnosis: newReg.disease || existing?.diagnosis || '',
        careManagerName: existing?.careManagerName || 'พันจ่าเอกอานัส เด่นหมาด',
        caregiverName: newReg.caregiverName || 'ญาติผู้ดูแล',
        caregiverPhone: newReg.caregiverPhone,
        monthlyDiaperAllowance: totalDiaperQty > 0 ? totalDiaperQty : parseInt(newReg.diaperPerMonth) || 90,
        equipmentNeeded: equipmentSummary,
        fiscalYear: targetYear,
        roundItems: validRoundItems,
        yearRoundItems: mergedYearRounds,
        queuedPeriods: nextQueuedPeriods,
        carePlanSummary: equipmentSummary,
        createdAt: existing?.createdAt || newReg.createdAt || '2026-10-01',
        lastVisitDate: existing?.lastVisitDate || new Date().toISOString().slice(0, 10),
        nextVisitDate:
          existing?.nextVisitDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        status: existing?.status || 'active',
        receivedCarePack: autoQueueOnSave ? false : existing?.receivedCarePack ?? false,
        latitude: newReg.lat,
        longitude: newReg.lng,
      };

      if (onUpdatePatient) {
        onUpdatePatient(updatedRecord);
      }

      const targetStop = stops.find((s) => s.patientId === editingPatientId);
      const targetStopId = targetStop ? targetStop.id : `STOP-${String(stops.length + 1).padStart(2, '0')}`;

      setStops((prev) =>
        prev.map((s) =>
          s.patientId === editingPatientId
            ? {
                ...s,
                patientName: newReg.fullName,
                moo: mooNum,
                village,
                address: fullAddressText,
                lat: newReg.lat,
                lng: newReg.lng,
                adlCategory: (newReg.adlCategory === 'ติดบ้าน' ? 'ติดบ้าน' : 'ติดเตียง') as 'ติดเตียง' | 'ติดบ้าน',
                diaperSize: detectedSize,
                diaperQuantity: totalDiaperQty > 0 ? totalDiaperQty : parseInt(newReg.diaperPerMonth) || 90,
                underpadQuantity: totalUnderpadQty > 0 ? totalUnderpadQty : 60,
                status: autoQueueOnSave ? 'pending' : s.status,
              }
            : s
        )
      );

      // Sync filter to the chosen Year & Round and place into the delivery queue for that Year & Round
      setSelectedYearFilter(targetYear);
      setSelectedRoundFilter(targetRound);
      if (autoQueueOnSave && targetStopId) {
        const baseQueue = periodQueues[periodKey] || selectedStopIds;
        const nextQueue = baseQueue.includes(targetStopId)
          ? baseQueue
          : [...baseQueue, targetStopId];
        setSelectedStopIds(nextQueue);
        setPeriodQueues((prev) => ({
          ...prev,
          [periodKey]: nextQueue,
        }));
      }

      setRegSuccessMsg(
        `✅ บันทึกการแก้ไข "${newReg.fullName}" และส่งเข้าคิวรอจัดรอบส่งมอบ (ปีงบประมาณ ${targetYear} • รอบที่ ${targetRound}) เรียบร้อยแล้ว`
      );
      setTimeout(() => setRegSuccessMsg(''), 5500);
      handleClearRegForm();

      if (jumpToDashboardQueue) {
        setSubTab('route');
        setTimeout(() => {
          routeSequencerBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 120);
      }
      return;
    }

    const newStop: DeliveryStop = {
      id: `STOP-${String(stops.length + 1).padStart(2, '0')}`,
      patientId,
      patientName: newReg.fullName,
      moo: mooNum,
      village,
      address: fullAddressText,
      lat: newReg.lat,
      lng: newReg.lng,
      adlCategory: (newReg.adlCategory === 'ติดบ้าน' ? 'ติดบ้าน' : 'ติดเตียง') as 'ติดเตียง' | 'ติดบ้าน',
      diaperSize: detectedSize,
      diaperQuantity: totalDiaperQty > 0 ? totalDiaperQty : parseInt(newReg.diaperPerMonth) || 90,
      underpadQuantity: totalUnderpadQty > 0 ? totalUnderpadQty : parseInt(newReg.underpadPerMonth) || 60,
      airMattressNeeded: newReg.airMattressNeeded,
      status: 'pending',
      routeOrder: stops.length + 1,
      notes: newReg.disease,
      createdAt: newReg.createdAt || '2026-10-01',
    };

    const nextStops = [...stops, newStop];
    const nextSelected = [...selectedStopIds, newStop.id];
    setStops(nextStops);
    setSelectedYearFilter(targetYear);
    setSelectedRoundFilter(targetRound);
    setSelectedStopIds(nextSelected);
    setPeriodQueues((prev) => ({
      ...prev,
      [periodKey]: nextSelected,
    }));

    const newPatientRecord: LtcPatient = {
      id: patientId,
      hn: `HN-${Math.floor(10000 + Math.random() * 90000)}`,
      idCard: newReg.nationalId,
      fullName: newReg.fullName,
      gender: newReg.gender,
      age: parseInt(newReg.age) || 75,
      adlScore: parseInt(newReg.adlScore) || 5,
      adlGroup:
        (parseInt(newReg.adlScore) || 5) <= 4
          ? 'group_4'
          : (parseInt(newReg.adlScore) || 5) <= 8
          ? 'group_3'
          : 'group_2',
      adlCategory: newReg.adlCategory,
      moo: mooNum,
      address: fullAddressText,
      subdistrict: 'บางเป้า',
      phone: newReg.caregiverPhone || newReg.phone,
      diagnosis: newReg.disease,
      careManagerName: 'พันจ่าเอกอานัส เด่นหมาด',
      caregiverName: newReg.caregiverName || 'ญาติผู้ดูแล',
      caregiverPhone: newReg.caregiverPhone,
      monthlyDiaperAllowance: totalDiaperQty > 0 ? totalDiaperQty : parseInt(newReg.diaperPerMonth) || 90,
      equipmentNeeded: equipmentSummary,
      fiscalYear: targetYear,
      roundItems: validRoundItems,
      yearRoundItems: {
        ...yearRoundItems,
        [targetYear]: validRoundItems,
      },
      queuedPeriods: [periodKey],
      carePlanSummary: equipmentSummary,
      createdAt: newReg.createdAt || '2026-10-01',
      lastVisitDate: new Date().toISOString().slice(0, 10),
      nextVisitDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      status: 'active',
      receivedCarePack: false,
      latitude: newReg.lat,
      longitude: newReg.lng,
    };

    if (onAddRegisteredPatient) {
      onAddRegisteredPatient(newPatientRecord);
    }

    setRegSuccessMsg(
      `✅ ขึ้นทะเบียน "${newReg.fullName}" สำเร็จ และส่งเข้าคิวรอจัดรอบส่งมอบ (ปีงบประมาณ ${targetYear} • รอบที่ ${targetRound}) เรียบร้อยแล้ว`
    );
    setTimeout(() => setRegSuccessMsg(''), 5500);

    handleClearRegForm();
    if (jumpToDashboardQueue) {
      setSubTab('route');
      setTimeout(() => {
        routeSequencerBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 120);
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    savePatientAndQueueByPeriod(false);
  };

  const ROUND_LABELS: Record<string, string> = {
    all: 'รวมทุกวงรอบ (ทั้งปี)',
    '1': 'วงรอบที่ 1 (ต.ค. – มี.ค.)',
    '2': 'วงรอบที่ 2 (เม.ย. – ก.ย.)',
    '3': 'วงรอบที่ 3',
    '4': 'วงรอบที่ 4',
  };

  const activeYearLabel =
    selectedYearFilter === 'all' ? 'ทุกปีงบประมาณ' : `ปีงบประมาณ ${selectedYearFilter}`;
  const activeRoundLabel = ROUND_LABELS[selectedRoundFilter] || `วงรอบที่ ${selectedRoundFilter}`;

  // Helper to get equipment description and quantities for a specific stop based on selectedYearFilter & selectedRoundFilter
  const getStopRoundInfo = (
    stop: DeliveryStop,
    roundKey: string = selectedRoundFilter,
    yearKey: string = selectedYearFilter
  ) => {
    const matchedPt = patients.find((p) => p.id === stop.patientId);
    const effectiveYear = yearKey === 'all' ? matchedPt?.fiscalYear || '2569' : yearKey;
    const roundMap =
      matchedPt?.yearRoundItems?.[effectiveYear] || matchedPt?.roundItems;

    if (roundMap && Object.keys(roundMap).length > 0) {
      if (roundKey !== 'all') {
        const itemsForRound = roundMap[roundKey] || roundMap['1'] || [];
        if (itemsForRound.length > 0) {
          const desc = itemsForRound
            .map((it) => `${it.itemName} (${it.quantity} ${it.unit})`)
            .join(', ');
          const diapers = itemsForRound
            .filter((it) => it.itemName.includes('ผ้าอ้อม'))
            .reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
          const underpads = itemsForRound
            .filter((it) => it.itemName.includes('แผ่นรองซับ'))
            .reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
          return {
            text: `รอบที่ ${roundKey}: ${desc}`,
            itemsList: itemsForRound,
            diapers: diapers || stop.diaperQuantity || 0,
            underpads: underpads || stop.underpadQuantity || 0,
          };
        }
      } else {
        // Sum across all configured rounds
        let totalD = 0;
        let totalU = 0;
        const allItems: LtcRoundItem[] = [];
        Object.values(roundMap).forEach((arr) => {
          arr.forEach((it) => {
            allItems.push(it);
            if (it.itemName.includes('ผ้าอ้อม')) totalD += Number(it.quantity) || 0;
            if (it.itemName.includes('แผ่นรองซับ')) totalU += Number(it.quantity) || 0;
          });
        });
        const roundsCount = Object.keys(roundMap).length;
        return {
          text: matchedPt?.equipmentNeeded || `ผ้าอ้อม Size ${stop.diaperSize} (${stop.diaperQuantity} ชิ้น/รอบ)`,
          itemsList: allItems,
          diapers: totalD > 0 ? totalD : (stop.diaperQuantity || 0) * Math.max(1, roundsCount),
          underpads: totalU > 0 ? totalU : (stop.underpadQuantity || 0) * Math.max(1, roundsCount),
        };
      }
    }

    const mult = roundKey === 'all' ? 4 : 1;
    const baseText =
      matchedPt?.equipmentNeeded ||
      `ผ้าอ้อม Size ${stop.diaperSize} (${stop.diaperQuantity} ชิ้น), แผ่นรองซับ ${stop.underpadQuantity} แผ่น`;
    return {
      text: roundKey === 'all' ? `รวมทั้งปี: ${baseText}` : `รอบที่ ${roundKey}: ${baseText}`,
      itemsList: [] as LtcRoundItem[],
      diapers: (stop.diaperQuantity || 0) * mult,
      underpads: (stop.underpadQuantity || 0) * mult,
    };
  };

  const filteredStops = stops.filter((s) => {
    if (selectedMooFilter !== 'all' && s.moo !== selectedMooFilter) return false;
    if (adlFilter !== 'all' && s.adlCategory !== adlFilter) return false;
    const currentDeliveryStatus = getStopDeliveryStatus(s.patientId, selectedYearFilter, selectedRoundFilter).status;
    if (statusFilter !== 'all' && currentDeliveryStatus !== statusFilter) return false;
    if (dashboardSearch.trim()) {
      const q = dashboardSearch.toLowerCase();
      const matchName = s.patientName.toLowerCase().includes(q);
      const matchAddr = s.address.toLowerCase().includes(q);
      const matchVillage = s.village.toLowerCase().includes(q);
      if (!matchName && !matchAddr && !matchVillage) return false;
    }
    return true;
  });

  // KPI metrics computed from the active filters & selected round/year
  const baseSummaryStops = selectedMooFilter === 'all' && adlFilter === 'all' ? stops : filteredStops;
  const deliveredCount = baseSummaryStops.filter(
    (s) => getStopDeliveryStatus(s.patientId, selectedYearFilter, selectedRoundFilter).status === 'delivered'
  ).length;
  const pendingCount = baseSummaryStops.filter(
    (s) => getStopDeliveryStatus(s.patientId, selectedYearFilter, selectedRoundFilter).status === 'pending'
  ).length;
  const deliveryRate =
    baseSummaryStops.length > 0 ? Math.round((deliveredCount / baseSummaryStops.length) * 100) : 0;

  const bedriddenCount = baseSummaryStops.filter((s) => s.adlCategory === 'ติดเตียง').length;
  const homeboundCount = baseSummaryStops.filter((s) => s.adlCategory === 'ติดบ้าน').length;
  const socialCount = Math.max(0, baseSummaryStops.length - bedriddenCount - homeboundCount);

  // Per-item breakdown of supplies needed vs delivered in the selected Round & Fiscal Year
  const roundSupplySummary = useMemo(() => {
    const itemMap: Record<
      string,
      { itemName: string; unit: string; totalQty: number; deliveredQty: number; pendingQty: number }
    > = {};

    baseSummaryStops.forEach((stop) => {
      const dInfo = getStopDeliveryStatus(stop.patientId, selectedYearFilter, selectedRoundFilter);
      const rInfo = getStopRoundInfo(stop, selectedRoundFilter, selectedYearFilter);
      const isDelivered = dInfo.status === 'delivered';

      const items =
        isDelivered && dInfo.itemsDelivered && dInfo.itemsDelivered.length > 0
          ? dInfo.itemsDelivered
          : rInfo.itemsList && rInfo.itemsList.length > 0
          ? rInfo.itemsList
          : [
              {
                itemId: 'diaper',
                itemName: `ผ้าอ้อมผู้ใหญ่ Size ${stop.diaperSize || 'L'}`,
                quantity: stop.diaperQuantity || 90,
                unit: 'ชิ้น',
              },
              {
                itemId: 'underpad',
                itemName: 'แผ่นรองซับสิ่งขับถ่าย',
                quantity: stop.underpadQuantity || 60,
                unit: 'แผ่น',
              },
            ];

      items.forEach((it) => {
        const key = it.itemName.trim();
        if (!itemMap[key]) {
          itemMap[key] = {
            itemName: it.itemName,
            unit: it.unit || 'ชิ้น',
            totalQty: 0,
            deliveredQty: 0,
            pendingQty: 0,
          };
        }
        const q = Number(it.quantity) || 0;
        itemMap[key].totalQty += q;
        if (isDelivered) {
          itemMap[key].deliveredQty += q;
        } else {
          itemMap[key].pendingQty += q;
        }
      });
    });

    return Object.values(itemMap);
  }, [baseSummaryStops, selectedYearFilter, selectedRoundFilter, deliveryRecords]);

  const totalDiapers = baseSummaryStops.reduce(
    (acc, s) => acc + getStopRoundInfo(s, selectedRoundFilter).diapers,
    0
  );
  const totalUnderpads = baseSummaryStops.reduce(
    (acc, s) => acc + getStopRoundInfo(s, selectedRoundFilter).underpads,
    0
  );
  const totalInventoryRemaining = inventory.reduce((acc, i) => acc + (i.remainingStock || 0), 0);

  // Sorted & Filtered Stops for the Recipient & Supply Table (Images 2 & 3)
  // Default sorting puts newest imported data on top ('created_desc')
  const tableStops = useMemo(() => {
    const list = filteredStops.filter((s) => {
      const st = getStopDeliveryStatus(
        s.patientId,
        selectedYearFilter,
        selectedRoundFilter
      ).status;
      if (roundRecipientFilter === 'pending') return st === 'pending';
      if (roundRecipientFilter === 'delivered') return st === 'delivered';
      return true;
    });

    const getStopCreatedDate = (s: DeliveryStop) => {
      if (s.createdAt) return s.createdAt;
      const matchedPt = patients.find((p) => p.id === s.patientId);
      return matchedPt?.createdAt || matchedPt?.lastVisitDate || '';
    };

    return [...list].sort((a, b) => {
      if (recipientSortOrder === 'created_desc') {
        const dateA = getStopCreatedDate(a);
        const dateB = getStopCreatedDate(b);
        const cmp = dateB.localeCompare(dateA);
        if (cmp !== 0) return cmp;
        return a.patientName.localeCompare(b.patientName, 'th');
      }
      if (recipientSortOrder === 'queue_asc') {
        const isQueuedA = selectedStopIds.includes(a.id);
        const isQueuedB = selectedStopIds.includes(b.id);
        if (isQueuedA && !isQueuedB) return -1;
        if (!isQueuedA && isQueuedB) return 1;
        if (isQueuedA && isQueuedB) {
          const qA = orderedSelectedStops.findIndex((s) => s.id === a.id);
          const qB = orderedSelectedStops.findIndex((s) => s.id === b.id);
          return qA - qB;
        }
        return a.routeOrder - b.routeOrder;
      }
      if (recipientSortOrder === 'moo_asc') {
        const mooA = parseInt(a.moo || '0', 10);
        const mooB = parseInt(b.moo || '0', 10);
        if (mooA !== mooB) return mooA - mooB;
        return a.patientName.localeCompare(b.patientName, 'th');
      }
      if (recipientSortOrder === 'name_asc') {
        return a.patientName.localeCompare(b.patientName, 'th');
      }
      return 0;
    });
  }, [
    filteredStops,
    roundRecipientFilter,
    recipientSortOrder,
    selectedYearFilter,
    selectedRoundFilter,
    selectedStopIds,
    orderedSelectedStops,
    deliveryRecords,
    patients,
  ]);

  // Helper to focus on a specific patient pin on the Overview Map
  const focusStopOnOverviewMap = (stop: DeliveryStop) => {
    setActiveStop(stop);
    const map = overviewMapInstanceRef.current;
    const marker = overviewMarkerMapRef.current[stop.id];
    if (map) {
      map.setView([stop.lat, stop.lng], 18, { animate: true });
      if (marker) {
        marker.openPopup();
      }
    }
  };

  // Fit bounds to all visible pins on the Overview Map
  const fitAllOverviewPins = () => {
    const L = (window as any).L;
    const map = overviewMapInstanceRef.current;
    if (!L || !map) return;
    const pts: [number, number][] = [
      [BANGPAO_MUNICIPALITY_COORDS.lat, BANGPAO_MUNICIPALITY_COORDS.lng],
      ...filteredStops.map((s) => [s.lat, s.lng] as [number, number]),
    ];
    if (pts.length > 1) {
      const bounds = L.latLngBounds(pts);
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 16 });
    } else if (pts.length === 1) {
      map.setView(pts[0], 15);
    }
  };

  // Initialize Overview Leaflet Google Satellite Map when 'route' (แดชบอร์ดติดตาม) subTab is active
  useEffect(() => {
    if (subTab !== 'route') {
      if (overviewMapInstanceRef.current) {
        try {
          overviewMapInstanceRef.current.remove();
        } catch {}
        overviewMapInstanceRef.current = null;
        overviewMarkersLayerRef.current = null;
        overviewRouteLayerRef.current = null;
        overviewMarkerMapRef.current = {};
      }
      return;
    }

    let timer = setTimeout(() => {
      const L = (window as any).L;
      const container = overviewMapContainerRef.current as any;
      if (!L || !container) return;

      if (overviewMapInstanceRef.current && overviewMapInstanceRef.current.getContainer() !== container) {
        try {
          overviewMapInstanceRef.current.remove();
        } catch {}
        overviewMapInstanceRef.current = null;
        overviewMarkersLayerRef.current = null;
        overviewRouteLayerRef.current = null;
        overviewMarkerMapRef.current = {};
      }

      if (!overviewMapInstanceRef.current) {
        if (container._leaflet_id) {
          container._leaflet_id = null;
          container.innerHTML = '';
        }

        const map = L.map(container, {
          center: [BANGPAO_MUNICIPALITY_COORDS.lat, BANGPAO_MUNICIPALITY_COORDS.lng],
          zoom: 14,
        });

        L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
          maxZoom: 20,
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
          attribution: '© Google Maps',
        }).addTo(map);

        const routeLayer = L.layerGroup().addTo(map);
        const markersLayer = L.layerGroup().addTo(map);
        overviewMapInstanceRef.current = map;
        overviewRouteLayerRef.current = routeLayer;
        overviewMarkersLayerRef.current = markersLayer;

        setTimeout(() => {
          map.invalidateSize({ animate: false });
          const initPts: [number, number][] = [
            [BANGPAO_MUNICIPALITY_COORDS.lat, BANGPAO_MUNICIPALITY_COORDS.lng],
            ...filteredStops.map((s) => [s.lat, s.lng] as [number, number]),
          ];
          if (initPts.length > 1) {
            map.fitBounds(L.latLngBounds(initPts), { padding: [42, 42], maxZoom: 16 });
          }
        }, 80);
      }
    }, 40);

    return () => clearTimeout(timer);
  }, [subTab]);

  // Render / Update all patient pins on the Overview Map whenever filters, stops, or queue order change
  useEffect(() => {
    if (subTab !== 'route') return;

    let timer = setTimeout(() => {
      const L = (window as any).L;
      const map = overviewMapInstanceRef.current;
      const layer = overviewMarkersLayerRef.current;
      if (!L || !map || !layer) return;

      layer.clearLayers();
      overviewMarkerMapRef.current = {};

      // 1. Municipality HQ Pin (Blue) - Starting Point
      const hqIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      const hqMarker = L.marker([BANGPAO_MUNICIPALITY_COORDS.lat, BANGPAO_MUNICIPALITY_COORDS.lng], {
        icon: hqIcon,
        zIndexOffset: 1000,
      }).addTo(layer);

      hqMarker.bindPopup(
        `<div style="font-family:'Prompt',sans-serif;font-size:12px;line-height:1.45;min-width:200px;">
          <div style="font-weight:800;color:#0f766e;margin-bottom:2px;">🏢 ${BANGPAO_MUNICIPALITY_COORDS.name}</div>
          <div style="color:#475569;font-size:11px;">จุดเริ่มต้นปล่อยรถส่งมอบพัสดุ LTC</div>
          <div style="color:#64748b;font-size:10px;font-family:monospace;margin-top:3px;">พิกัด: ${BANGPAO_MUNICIPALITY_COORDS.lat}, ${BANGPAO_MUNICIPALITY_COORDS.lng}</div>
        </div>`
      );
      if (showPinLabels) {
        hqMarker.bindTooltip('🏢 เริ่ม: ทต.บางเป้า', {
          permanent: true,
          direction: 'top',
          offset: [0, -36],
          className: 'ltc-pin-tooltip',
        });
      }

      // 2. Registered Dependent Persons Pins
      filteredStops.forEach((stop) => {
        const deliveryInfo = getStopDeliveryStatus(stop.patientId, selectedYearFilter, selectedRoundFilter);
        const isDelivered = deliveryInfo.status === 'delivered';
        const isBedridden = stop.adlCategory === 'ติดเตียง';
        const colorName = isDelivered ? 'green' : isBedridden ? 'red' : 'gold';
        // Only pending stops can have an active queue number
        const queueIndex = isDelivered ? -1 : orderedSelectedStops.findIndex((s) => s.id === stop.id);
        const queueNumber = queueIndex >= 0 ? queueIndex + 1 : null;

        const pinIcon = L.icon({
          iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${colorName}.png`,
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        });

        const marker = L.marker([stop.lat, stop.lng], {
          icon: pinIcon,
          zIndexOffset: queueNumber ? 500 - queueNumber : isDelivered ? 50 : 100,
        }).addTo(layer);

        const roundData = getStopRoundInfo(stop, selectedRoundFilter, selectedYearFilter);
        const deliveredItemsText =
          isDelivered && deliveryInfo.itemsDelivered && deliveryInfo.itemsDelivered.length > 0
            ? deliveryInfo.itemsDelivered
                .map((it) => `${it.itemName} (${it.quantity} ${it.unit})`)
                .join(', ')
            : roundData.text;

        const queueBadgeHtml = isDelivered
          ? `<span style="background:#059669;color:#ffffff;padding:1px 8px;border-radius:999px;font-size:10px;font-weight:800;">✅ กรองออกจากคิวแล้ว</span>`
          : queueNumber
          ? `<span style="background:#0f766e;color:#ffffff;padding:1px 8px;border-radius:999px;font-size:10px;font-weight:800;">🚩 คิวส่งที่ #${queueNumber}</span>`
          : `<span style="background:#f1f5f9;color:#64748b;padding:1px 7px;border-radius:999px;font-size:10px;font-weight:700;">รอจัดรอบส่งมอบ</span>`;

        const statusBadgeHtml = isDelivered
          ? `<span style="background:#dcfce7;color:#166534;padding:1px 7px;border-radius:999px;font-size:10px;font-weight:700;">✅ ส่งมอบแล้ว</span>`
          : `<span style="background:#fef3c7;color:#92400e;padding:1px 7px;border-radius:999px;font-size:10px;font-weight:700;">⏳ รอส่งมอบ</span>`;

        const adlBadgeHtml = isBedridden
          ? `<span style="background:#ffe4e6;color:#9f1239;padding:1px 7px;border-radius:999px;font-size:10px;font-weight:700;">🔴 ติดเตียง</span>`
          : `<span style="background:#ffedd5;color:#9a3412;padding:1px 7px;border-radius:999px;font-size:10px;font-weight:700;">🟠 ${stop.adlCategory}</span>`;

        const deliveredDetailsHtml = isDelivered
          ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:6px;margin-top:5px;font-size:11px;color:#166534;">
              <div><strong>📦 สิ่งของที่ส่งมอบ:</strong> ${deliveredItemsText}</div>
              <div><strong>👤 ผู้รับมอบ:</strong> ${deliveryInfo.receiverName || '-'}</div>
              <div><strong>🕒 วันที่เวลาส่ง:</strong> ${deliveryInfo.deliveredAt || '-'}</div>
              ${deliveryInfo.deliveryNote ? `<div><strong>📝 บันทึก:</strong> ${deliveryInfo.deliveryNote}</div>` : ''}
            </div>`
          : `<div style="color:#0f766e;font-size:11px;margin-top:3px;">📦 <strong>สิ่งของรอบนี้:</strong> ${deliveredItemsText}</div>`;

        marker.bindPopup(
          `<div style="font-family:'Prompt',sans-serif;font-size:12px;line-height:1.5;min-width:235px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:4px;">
              <strong style="font-size:13px;color:#0f172a;">${stop.patientName}</strong>
            </div>
            <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;">
              ${queueBadgeHtml}
              ${adlBadgeHtml}
              ${statusBadgeHtml}
            </div>
            <div style="color:#334155;font-size:11px;">📍 <strong>หมู่ที่ ${stop.moo} ${stop.village}</strong> • ${stop.address}</div>
            ${deliveredDetailsHtml}
            <div style="color:#64748b;font-size:10px;font-family:monospace;margin-top:4px;">GPS: ${stop.lat.toFixed(6)}, ${stop.lng.toFixed(6)}</div>
            <div style="margin-top:7px;padding-top:6px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">
              <a href="https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}" target="_blank" rel="noopener noreferrer" style="color:#2563eb;font-weight:700;font-size:11px;text-decoration:none;">🚗 เปิดนำทาง Google Maps ➔</a>
            </div>
          </div>`
        );

        if (showPinLabels) {
          const shortName = stop.patientName.split(' ')[0] || stop.patientName;
          const prefix = isDelivered ? '✅ ' : queueNumber ? `#${queueNumber} ` : '';
          marker.bindTooltip(`${prefix}ม.${stop.moo} ${shortName}`, {
            permanent: true,
            direction: 'top',
            offset: [0, -36],
            className: 'ltc-pin-tooltip',
          });
        }

        marker.on('click', () => {
          setActiveStop(stop);
        });

        overviewMarkerMapRef.current[stop.id] = marker;
      });
    }, 50);

    return () => clearTimeout(timer);
  }, [
    subTab,
    stops,
    patients,
    selectedStopIds,
    orderedSelectedStops,
    selectedMooFilter,
    adlFilter,
    statusFilter,
    dashboardSearch,
    showPinLabels,
    selectedYearFilter,
    selectedRoundFilter,
    deliveryRecords,
  ]);

  // Fit bounds when filter dropdowns change
  useEffect(() => {
    if (subTab !== 'route') return;
    const timer = setTimeout(() => {
      fitAllOverviewPins();
    }, 100);
    return () => clearTimeout(timer);
  }, [selectedMooFilter, adlFilter, statusFilter]);

  // Draw or update the delivery route path on the Overview Map according to the user's ordered queue
  useEffect(() => {
    if (subTab !== 'route') return;
    const L = (window as any).L;
    const map = overviewMapInstanceRef.current;
    const routeLayer = overviewRouteLayerRef.current;
    if (!L || !map || !routeLayer) return;

    routeLayer.clearLayers();

    if (!isRouteDrawn || orderedSelectedStops.length === 0) {
      setIsDrawingRouteLoading(false);
      return;
    }

    let isCancelled = false;
    const waypoints: { lat: number; lng: number; label: string }[] = [
      {
        lat: BANGPAO_MUNICIPALITY_COORDS.lat,
        lng: BANGPAO_MUNICIPALITY_COORDS.lng,
        label: 'ทต.บางเป้า',
      },
      ...orderedSelectedStops.map((s, idx) => ({
        lat: s.lat,
        lng: s.lng,
        label: `#${idx + 1} ${s.patientName}`,
      })),
    ];

    const directLatLngs: [number, number][] = waypoints.map((w) => [w.lat, w.lng]);

    // Helper to render numbered leg badges at the midpoint of each segment (ทต.บางเป้า -> #1 -> #2 ...)
    const renderLegSequenceBadges = () => {
      for (let i = 0; i < waypoints.length - 1; i++) {
        const p1 = waypoints[i];
        const p2 = waypoints[i + 1];
        const midLat = (p1.lat + p2.lat) / 2;
        const midLng = (p1.lng + p2.lng) / 2;
        const legIcon = L.divIcon({
          className: '',
          html: `<div style="background:#0f766e;color:#ffffff;font-family:'Prompt',sans-serif;font-size:10px;font-weight:800;padding:1px 6px;border-radius:999px;border:2px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.35);white-space:nowrap;transform:translate(-50%,-50%);">➔ คิว #${i + 1}</div>`,
          iconSize: [0, 0],
        });
        L.marker([midLat, midLng], { icon: legIcon, interactive: false }).addTo(routeLayer);
      }
    };

    // 1. Immediately draw direct high-contrast connector line as instant visual feedback
    L.polyline(directLatLngs, {
      color: '#ffffff',
      weight: 8,
      opacity: 0.85,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(routeLayer);

    L.polyline(directLatLngs, {
      color: '#0284c7',
      weight: 4.5,
      opacity: 0.95,
      dashArray: '10, 8',
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(routeLayer);

    renderLegSequenceBadges();

    // Calculate straight-line fallback distance
    let fallbackKm = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      const R = 6371;
      const dLat = ((waypoints[i + 1].lat - waypoints[i].lat) * Math.PI) / 180;
      const dLon = ((waypoints[i + 1].lng - waypoints[i].lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((waypoints[i].lat * Math.PI) / 180) *
          Math.cos((waypoints[i + 1].lat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      fallbackKm += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.28;
    }
    setRouteMetrics({
      distanceKm: Number(fallbackKm.toFixed(1)),
      durationMin: Math.max(3, Math.round((fallbackKm / 35) * 60)),
    });

    // 2. Fetch actual road geometry from OSRM Driving API
    setIsDrawingRouteLoading(true);
    const coordStr = waypoints.map((w) => `${w.lng},${w.lat}`).join(';');
    fetch(`https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`)
      .then((res) => res.json())
      .then((data) => {
        if (isCancelled || !overviewRouteLayerRef.current) return;
        if (data && data.code === 'Ok' && data.routes && data.routes[0]) {
          const route = data.routes[0];
          const roadCoords: [number, number][] = route.geometry.coordinates.map(
            (c: [number, number]) => [c[1], c[0]]
          );

          routeLayer.clearLayers();

          // Subtle dashed line connecting exact house pins to road
          L.polyline(directLatLngs, {
            color: '#fbbf24',
            weight: 2.5,
            opacity: 0.75,
            dashArray: '5, 6',
          }).addTo(routeLayer);

          // Road Outer White Casing
          L.polyline(roadCoords, {
            color: '#ffffff',
            weight: 9,
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(routeLayer);

          // Road Main Cyan/Teal Line
          L.polyline(roadCoords, {
            color: '#0ea5e9',
            weight: 5.5,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(routeLayer);

          // Road Inner Directional Dash
          L.polyline(roadCoords, {
            color: '#e0f2fe',
            weight: 2,
            opacity: 0.9,
            dashArray: '8, 12',
          }).addTo(routeLayer);

          renderLegSequenceBadges();

          const distKm = Number((route.distance / 1000).toFixed(1));
          const durMin = Math.max(2, Math.round(route.duration / 60));
          setRouteMetrics({ distanceKm: distKm, durationMin: durMin });
        }
      })
      .catch(() => {
        // Keep the instant direct polyline if offline or rate-limited
      })
      .finally(() => {
        if (!isCancelled) setIsDrawingRouteLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [subTab, isRouteDrawn, selectedStopIds, stops]);

  // Trigger drawing the route and fit the map bounds to all stops in the route
  const handleDrawRouteOnMap = () => {
    if (selectedStopIds.length === 0) return;
    setIsRouteDrawn(true);
    const L = (window as any).L;
    const map = overviewMapInstanceRef.current;
    if (L && map) {
      const pts: [number, number][] = [
        [BANGPAO_MUNICIPALITY_COORDS.lat, BANGPAO_MUNICIPALITY_COORDS.lng],
        ...orderedSelectedStops.map((s) => [s.lat, s.lng] as [number, number]),
      ];
      if (pts.length > 1) {
        map.fitBounds(L.latLngBounds(pts), { padding: [48, 48], maxZoom: 16 });
      }
    }
  };

  const handleClearDrawnRoute = () => {
    setIsRouteDrawn(false);
    setRouteMetrics(null);
    if (overviewRouteLayerRef.current) {
      overviewRouteLayerRef.current.clearLayers();
    }
  };

  // Smoothly resize Overview Map when toggling fullscreen
  useEffect(() => {
    if (subTab !== 'route' || !overviewMapInstanceRef.current) return;
    const syncOverviewSize = () => {
      const map = overviewMapInstanceRef.current;
      if (!map) return;
      map.invalidateSize({ animate: false });
    };
    syncOverviewSize();
    const timers = [30, 120, 280].map((ms) => setTimeout(syncOverviewSize, ms));
    return () => timers.forEach(clearTimeout);
  }, [isOverviewMapFullscreen, subTab]);

  return (
    <div className="space-y-5">
      {/* Module Header Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-teal-100/80 text-teal-800 flex items-center justify-center shrink-0 shadow-xs">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                ระบบแจกจ่ายโครงการ สปสช. & การดูแลระยะยาว (LTC)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                กองทุนหลักประกันสุขภาพ ทต.บางเป้า
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              แดชบอร์ดติดตามพิกัดผู้มีภาวะพึ่งพิง, บริหารการแจกจ่ายสิ่งของรายปี/รายวงรอบ และคลังอุปกรณ์ LTC
            </p>
          </div>
        </div>

        {/* 3 Main Sub-Navigation Pills (Always Single Row on Desktop) */}
        <div className="flex items-center flex-wrap sm:flex-nowrap gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/90 w-full xl:w-auto shrink-0 shadow-inner">
          <button
            onClick={() => setSubTab('route')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              subTab === 'route'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
            <span>แดชบอร์ดติดตาม</span>
            {pendingCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 text-[10px] rounded-full bg-amber-400 text-amber-950 font-black">
                รอส่ง {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setSubTab('register')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              subTab === 'register'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span>ลงทะเบียนผู้มีภาวะพึ่งพิง ({patients.length})</span>
          </button>

          <button
            onClick={() => setSubTab('inventory')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              subTab === 'inventory'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Package className="w-3.5 h-3.5 shrink-0" />
            <span>คลังอุปกรณ์</span>
          </button>
        </div>
      </div>

      {/* SUB-VIEW 1: แดชบอร์ดติดตาม (Overview Pin Map & Comprehensive LTC Monitoring Dashboard) */}
      {subTab === 'route' && (
        <div className="space-y-4">
          {/* 1. Clean Filter & Period Selector Toolbar (Year / Round / Village / ADL / Status / Search) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 text-xs font-extrabold">
                  📅 ข้อมูลสรุป: {activeYearLabel} • {activeRoundLabel}
                </span>
                <span className="text-[11px] text-slate-500">
                  เลือกกรองข้อมูลสรุปรายปีงบประมาณ วงรอบการแจกจ่าย หมู่บ้าน และกลุ่มผู้มีภาวะพึ่งพิง
                </span>
              </div>

              <div className="flex items-center gap-2">
                {(selectedYearFilter !== '2569' ||
                  selectedRoundFilter !== '1' ||
                  selectedMooFilter !== 'all' ||
                  adlFilter !== 'all' ||
                  statusFilter !== 'all' ||
                  dashboardSearch.trim() !== '') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedYearFilter('2569');
                      setSelectedRoundFilter('1');
                      setSelectedMooFilter('all');
                      setAdlFilter('all');
                      setStatusFilter('all');
                      setDashboardSearch('');
                    }}
                    className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                  >
                    รีเซ็ตตัวกรอง
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSubTab('register')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ลงทะเบียนรายใหม่</span>
                </button>
              </div>
            </div>

            {/* Single Balanced Grid Row for All 6 Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5">
              {/* 1. Fiscal Year Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  ปีงบประมาณ (รายปี)
                </label>
                <select
                  value={selectedYearFilter}
                  onChange={(e) => setSelectedYearFilter(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none cursor-pointer"
                >
                  <option value="2569">ปีงบประมาณ 2569 (ปัจจุบัน)</option>
                  <option value="2570">ปีงบประมาณ 2570</option>
                  <option value="all">ทุกปีงบประมาณ</option>
                </select>
              </div>

              {/* 2. Distribution Round Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  วงรอบการแจกจ่ายพัสดุ
                </label>
                <select
                  value={selectedRoundFilter}
                  onChange={(e) => setSelectedRoundFilter(e.target.value)}
                  className="w-full text-xs bg-teal-50/60 border border-teal-300 rounded-xl px-2.5 py-2 font-bold text-teal-900 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none cursor-pointer"
                >
                  {configuredRounds.map((r) => (
                    <option key={r} value={r}>
                      {getRoundDisplayLabel(r)}
                    </option>
                  ))}
                  <option value="all">รวมทุกวงรอบ (ทั้งปี)</option>
                </select>
              </div>

              {/* 3. Village Filter (Moo 1 - 7) */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  เขตพื้นที่หมู่บ้าน (ต.บางเป้า)
                </label>
                <select
                  value={selectedMooFilter}
                  onChange={(e) => setSelectedMooFilter(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none cursor-pointer"
                >
                  <option value="all">ทุกหมู่บ้าน (ม.1 – ม.7)</option>
                  <option value="1">หมู่ที่ 1 บ้านชายวัด</option>
                  <option value="2">หมู่ที่ 2 บ้านเกาะปอม</option>
                  <option value="3">หมู่ที่ 3 บ้านตลาดใหม่</option>
                  <option value="4">หมู่ที่ 4 บ้านแหลมม่วง</option>
                  <option value="5">หมู่ที่ 5 บ้านป่าเตียว</option>
                  <option value="6">หมู่ที่ 6 บ้านควนทองสีห์</option>
                  <option value="7">หมู่ที่ 7 บ้านท่าเรือ</option>
                </select>
              </div>

              {/* 4. ADL Group Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  กลุ่มภาวะพึ่งพิง (ADL)
                </label>
                <select
                  value={adlFilter}
                  onChange={(e) => setAdlFilter(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none cursor-pointer"
                >
                  <option value="all">ทุกกลุ่มภาวะพึ่งพิง</option>
                  <option value="ติดเตียง">กลุ่มติดเตียง (ADL 0–4)</option>
                  <option value="ติดบ้าน">กลุ่มติดบ้าน (ADL 5–8)</option>
                </select>
              </div>

              {/* 5. Delivery Status Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  สถานะการส่งมอบ
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none cursor-pointer"
                >
                  <option value="all">ทุกสถานะ ({baseSummaryStops.length} ราย)</option>
                  <option value="pending">รอส่งมอบ ({pendingCount} ราย)</option>
                  <option value="delivered">ส่งมอบแล้ว ({deliveredCount} ราย)</option>
                </select>
              </div>

              {/* 6. Search Input */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  ค้นหารายชื่อ / บ้านเลขที่
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={dashboardSearch}
                    onChange={(e) => setDashboardSearch(e.target.value)}
                    placeholder="พิมพ์ชื่อ, บ้านเลขที่..."
                    className="w-full pl-8 pr-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. Executive KPI Summary Cards (5 Boxes - Responsive to Selected Year & Round) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* Card 1: Total Registered Dependent Persons */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">ผู้มีภาวะพึ่งพิง ({activeYearLabel})</span>
                <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1.5">
                {baseSummaryStops.length} <span className="text-xs font-bold text-slate-500">ราย</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap mt-2 pt-2 border-t border-slate-100 text-[11px] font-semibold">
                <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700">
                  ติดเตียง {bedriddenCount}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700">
                  ติดบ้าน {homeboundCount}
                </span>
                {socialCount > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-700">
                    ติดสังคม {socialCount}
                  </span>
                )}
              </div>
            </div>

            {/* Card 2: Delivered Progress */}
            <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800">ส่งมอบสิ่งของแล้ว</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black">
                  {deliveryRate}%
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-700 mt-1.5">
                {deliveredCount}{' '}
                <span className="text-xs font-bold text-emerald-600">/ {baseSummaryStops.length} ราย</span>
              </div>
              <div className="mt-2 pt-1">
                <div className="w-full h-2 rounded-full bg-emerald-100 overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                    style={{ width: `${deliveryRate}%` }}
                  />
                </div>
                <div className="text-[10px] text-emerald-700 font-semibold mt-1 truncate">
                  {activeRoundLabel} • ตัดสต็อกอัตโนมัติ
                </div>
              </div>
            </div>

            {/* Card 3: Pending Delivery */}
            <div
              onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
              className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-xs flex flex-col justify-between cursor-pointer hover:border-amber-400 transition-colors"
              title="คลิกเพื่อกรองเฉพาะรายที่รอส่งมอบ"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800">รอลงพื้นที่ส่งมอบ</span>
                <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-amber-700 mt-1.5">
                {pendingCount} <span className="text-xs font-bold text-amber-600">จุดพิกัดบ้าน</span>
              </div>
              <div className="text-[11px] text-amber-700 font-semibold mt-2 pt-2 border-t border-amber-100 flex items-center justify-between">
                <span>{selectedMooFilter === 'all' ? 'ครบทั้ง 7 หมู่บ้าน' : `เฉพาะหมู่ที่ ${selectedMooFilter}`}</span>
                <span className="underline">คลิกกรอง</span>
              </div>
            </div>

            {/* Card 4: Round Care Items Allocation */}
            <div className="bg-white p-4 rounded-2xl border border-teal-200 bg-teal-50/30 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal-800 truncate">
                  ยอดจัดสรร ({selectedRoundFilter === 'all' ? 'รวมทั้งปี' : `รอบที่ ${selectedRoundFilter}`})
                </span>
                <span className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                  <Truck className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-teal-900 mt-1.5">
                {totalDiapers.toLocaleString()}{' '}
                <span className="text-xs font-bold text-teal-700">ชิ้น (ผ้าอ้อม)</span>
              </div>
              <div className="text-[11px] text-teal-700 font-semibold mt-2 pt-2 border-t border-teal-100">
                แผ่นรองซับรวม {totalUnderpads.toLocaleString()} แผ่น
              </div>
            </div>

            {/* Card 5: Inventory Stock Status */}
            <div
              onClick={() => setSubTab('inventory')}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between cursor-pointer hover:border-teal-400 transition-colors"
              title="คลิกเพื่อเปิดดูคลังอุปกรณ์"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">คลังอุปกรณ์ LTC</span>
                <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1.5">
                {totalInventoryRemaining.toLocaleString()}{' '}
                <span className="text-xs font-bold text-slate-500">ชิ้นคงคลัง</span>
              </div>
              <div className="text-[11px] text-emerald-700 font-semibold mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                <span>ทั้งหมด {inventory.length} รายการพัสดุ</span>
                <span className="text-teal-700 underline">ดูคลัง ➔</span>
              </div>
            </div>
          </div>

          {/* 3. Main Overview Pin Map (Left 7 Cols) & Route Sequencer / Patient Pin List (Right 5 Cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Left 7 Cols: Interactive Google Satellite Overview Map */}
            <div className="lg:col-span-7">
              {isOverviewMapFullscreen && (
                <div
                  onClick={() => setIsOverviewMapFullscreen(false)}
                  className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
                  style={{ zIndex: 9998 }}
                />
              )}
              <div
                className={
                  isOverviewMapFullscreen
                    ? 'fixed inset-2 sm:inset-5 bg-white rounded-2xl border-2 border-slate-300 p-4 sm:p-5 shadow-2xl flex flex-col'
                    : 'bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-3 h-full'
                }
                style={isOverviewMapFullscreen ? { zIndex: 9999 } : undefined}
              >
                {/* Clean Map Header: Only Map View Controls (No Duplicated Route Buttons) */}
                <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                        แผนที่ภาพรวมพิกัดผู้มีภาวะพึ่งพิง & เส้นทางส่งมอบ ({filteredStops.length} ราย)
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        {activeYearLabel} • {activeRoundLabel} • คลิกหมุดเพื่อดูข้อมูลหรือสั่งนำทางรายบ้าน
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowPinLabels((prev) => !prev)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        showPinLabels
                          ? 'bg-teal-50 text-teal-800 border-teal-300'
                          : 'bg-slate-50 text-slate-600 border-slate-300'
                      }`}
                    >
                      {showPinLabels ? 'ซ่อนชื่อบนหมุด' : 'แสดงชื่อบนหมุด'}
                    </button>

                    <button
                      type="button"
                      onClick={fitAllOverviewPins}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                      <span>ดูครบทุกหมุด</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsOverviewMapFullscreen((prev) => !prev)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                        isOverviewMapFullscreen
                          ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700 shadow-sm'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      {isOverviewMapFullscreen ? (
                        <>
                          <Minimize2 className="w-3.5 h-3.5" />
                          <span>ปิดเต็มจอ</span>
                        </>
                      ) : (
                        <>
                          <Maximize2 className="w-3.5 h-3.5" />
                          <span>เต็มจอ</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Pin Color Legend Bar */}
                <div className="flex items-center justify-between flex-wrap gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-700">
                  <div className="flex items-center flex-wrap gap-3">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block ring-2 ring-rose-200" />
                      <span>แดง: ติดเตียง (รอส่ง)</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block ring-2 ring-amber-200" />
                      <span>ส้ม: ติดบ้าน (รอส่ง)</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block ring-2 ring-emerald-200" />
                      <span>เขียว: ส่งมอบแล้ว</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block ring-2 ring-blue-200" />
                      <span>
                        น้ำเงิน: ทต.บางเป้า ({BANGPAO_MUNICIPALITY_COORDS.lat}, {BANGPAO_MUNICIPALITY_COORDS.lng})
                      </span>
                    </span>
                  </div>
                  {isRouteDrawn && routeMetrics && (
                    <span className="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-900 font-extrabold text-[11px]">
                      ระยะทางรวม ~{routeMetrics.distanceKm} กม. • ~{routeMetrics.durationMin} นาที
                      {isDrawingRouteLoading ? ' (คำนวณถนน...)' : ''}
                    </span>
                  )}
                </div>

                {/* Compact Ordered Route Sequence Chain Bar */}
                <div className="px-3 py-2 bg-teal-50/70 border border-teal-200 rounded-xl text-[11px]">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                    <span className="font-extrabold text-teal-950 shrink-0 mr-1">
                      ลำดับคิวส่ง ({orderedSelectedStops.length} บ้าน):
                    </span>
                    <span
                      onClick={() => {
                        const map = overviewMapInstanceRef.current;
                        if (map) {
                          map.setView(
                            [BANGPAO_MUNICIPALITY_COORDS.lat, BANGPAO_MUNICIPALITY_COORDS.lng],
                            17,
                            { animate: true }
                          );
                        }
                      }}
                      className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-bold text-[10px] shrink-0 cursor-pointer hover:bg-blue-700"
                      title={`จุดเริ่มต้น: ${BANGPAO_MUNICIPALITY_COORDS.lat}, ${BANGPAO_MUNICIPALITY_COORDS.lng}`}
                    >
                      เริ่ม: ทต.บางเป้า
                    </span>
                    {orderedSelectedStops.length === 0 ? (
                      <span className="text-slate-500 italic text-[11px] pl-1">
                        ยังไม่ได้เลือกบ้านในคิว — ติ๊กเลือกบ้านด้านขวาตามลำดับที่จะไปก่อน-หลัง
                      </span>
                    ) : (
                      orderedSelectedStops.map((s, qIdx) => (
                        <React.Fragment key={s.id}>
                          <ChevronRight className="w-3 h-3 text-teal-600 shrink-0" />
                          <div
                            onClick={() => focusStopOnOverviewMap(s)}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-md border font-bold text-[10px] shrink-0 cursor-pointer transition-colors ${
                              activeStop?.id === s.id
                                ? 'bg-teal-800 text-white border-teal-900'
                                : 'bg-white text-slate-800 border-teal-300 hover:bg-teal-100/70'
                            }`}
                          >
                            <span className="w-3.5 h-3.5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[9px] font-black">
                              {qIdx + 1}
                            </span>
                            <span>
                              ม.{s.moo} {s.patientName.split(' ')[0]}
                            </span>
                          </div>
                        </React.Fragment>
                      ))
                    )}
                  </div>
                </div>

                {/* Outer wrapper handles sizing so React never overwrites Leaflet's classes on overviewMapContainerRef */}
                <div
                  className={`relative w-full rounded-xl border border-slate-300 overflow-hidden shadow-inner bg-slate-100 ${
                    isOverviewMapFullscreen
                      ? 'flex-1 min-h-[420px]'
                      : 'h-[420px] sm:h-[500px] lg:h-[540px]'
                  }`}
                  style={{
                    height: isOverviewMapFullscreen ? 'calc(100vh - 230px)' : undefined,
                    zIndex: 10,
                  }}
                >
                  <div
                    ref={overviewMapContainerRef}
                    className="w-full h-full"
                    style={{ width: '100%', height: '100%', position: 'relative' }}
                  />
                </div>

                {/* Selected Pin Quick Detail Card below Map */}
                {activeStop ? (
                  <div className="p-3.5 bg-teal-50/90 border border-teal-200 rounded-xl text-xs space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-teal-800 text-white font-bold text-[11px]">
                          หมู่ที่ {activeStop.moo} {activeStop.village}
                        </span>
                        <span className="font-extrabold text-teal-950 text-sm">
                          {activeStop.patientName}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            activeStop.adlCategory === 'ติดเตียง'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {activeStop.adlCategory}
                        </span>
                      </div>
                      {(() => {
                        const activeStopDelivery = getStopDeliveryStatus(
                          activeStop.patientId,
                          selectedYearFilter,
                          selectedRoundFilter
                        );
                        const isDel = activeStopDelivery.status === 'delivered';
                        return (
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              isDel
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isDel ? '✅ ส่งมอบแล้วในรอบนี้' : '⏳ รอส่งมอบ'}
                          </span>
                        );
                      })()}
                    </div>

                    {(() => {
                      const activeStopDelivery = getStopDeliveryStatus(
                        activeStop.patientId,
                        selectedYearFilter,
                        selectedRoundFilter
                      );
                      const isDel = activeStopDelivery.status === 'delivered';
                      const roundData = getStopRoundInfo(activeStop, selectedRoundFilter, selectedYearFilter);
                      const deliveredItemsText =
                        isDel && activeStopDelivery.itemsDelivered && activeStopDelivery.itemsDelivered.length > 0
                          ? activeStopDelivery.itemsDelivered
                              .map((it) => `${it.itemName} (${it.quantity} ${it.unit})`)
                              .join(', ')
                          : roundData.text;

                      return (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-slate-700">
                            <div>
                              ที่อยู่: <strong>{activeStop.address}</strong>
                            </div>
                            <div className="font-mono text-teal-800">
                              พิกัด: <strong>{activeStop.lat.toFixed(6)}, {activeStop.lng.toFixed(6)}</strong>
                            </div>
                            <div className="sm:col-span-2">
                              {isDel ? 'ของที่ส่งมอบแล้ว:' : `สิ่งของที่ต้องได้รับ (${activeRoundLabel}):`}{' '}
                              <strong className={isDel ? 'text-emerald-800' : 'text-teal-900'}>
                                {deliveredItemsText}
                              </strong>
                            </div>
                            {isDel && (
                              <div className="sm:col-span-2 bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-[11px] text-emerald-900">
                                <div>
                                  ผู้รับมอบ: <strong>{activeStopDelivery.receiverName || '-'}</strong> • วันที่เวลา:{' '}
                                  <strong>{activeStopDelivery.deliveredAt || '-'}</strong>
                                </div>
                                {activeStopDelivery.deliveryNote && (
                                  <div className="text-emerald-700 italic mt-0.5">
                                    บันทึก: {activeStopDelivery.deliveryNote}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 pt-1 flex-wrap">
                            <button
                              type="button"
                              onClick={() => {
                                window.open(
                                  `https://www.google.com/maps/dir/?api=1&destination=${activeStop.lat},${activeStop.lng}`,
                                  '_blank'
                                );
                              }}
                              className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Navigation className="w-3.5 h-3.5" />
                              <span>นำทาง Google Maps ไปบ้านรายนี้</span>
                            </button>

                            {!isDel ? (
                              <button
                                type="button"
                                onClick={() => openDeliveryModal(activeStop)}
                                className="flex-1 py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>บันทึกส่งมอบสำเร็จ</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleRevertDelivery(activeStop)}
                                className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                title="ยกเลิกสถานะส่งมอบและนำกลับเข้าคิว"
                              >
                                <span>↩️ ยกเลิกส่งมอบ (ดึงกลับเข้าคิว)</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                const matchedPt = patients.find((p) => p.id === activeStop.patientId);
                                if (matchedPt) {
                                  setIsOverviewMapFullscreen(false);
                                  setSubTab('register');
                                  setTimeout(() => handleEditPatientInForm(matchedPt), 100);
                                }
                              }}
                              className="py-2 px-3 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>แก้ไขข้อมูล/พิกัด</span>
                            </button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span>คลิกที่หมุดบนแผนที่ หรือคลิกรายชื่อด้านขวา เพื่อดูรายละเอียดและซูมไปยังพิกัดบ้าน</span>
                    <span className="font-mono font-bold text-teal-800">แสดง {filteredStops.length} หมุด</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right 5 Cols: Clean, Symmetrical Route Sequencer & Patient Pin Directory */}
            <div
              ref={routeSequencerBoxRef}
              className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-3"
            >
              <div className="space-y-3 border-b border-slate-100 pb-3">
                {/* Header */}
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-teal-700 shrink-0" />
                      <span>จัดลำดับแผนการส่งมอบ (เลือกบ้านก่อน-หลังอิสระ)</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      คิวจัดรอบประจำ <strong className="text-teal-800">{activeYearLabel} • {activeRoundLabel}</strong> — เลื่อนขึ้น-ลง, เปลี่ยนลำดับ # หรือลากสลับการ์ด
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-[11px] font-extrabold shrink-0">
                    ในคิว {orderedSelectedStops.length} / {stops.length} บ้าน
                  </span>
                </div>

                {queueToastMsg && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-between gap-2">
                    <span>{queueToastMsg}</span>
                    <button
                      type="button"
                      onClick={() => setQueueToastMsg(null)}
                      className="text-emerald-700 hover:text-emerald-950 font-black px-1 cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                )}

                {/* Row 1: Unified Queue Ordering & Selection Toolbar (Clean, No Double Icons) */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={clearQueueToPickInOrder}
                    className="col-span-2 sm:col-span-2 flex items-center justify-center gap-1 px-2 py-1.5 font-bold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 transition-colors cursor-pointer"
                    title="ล้างคิวทั้งหมด เพื่อคลิกติ๊กเลือกบ้านที่จะไปเป็นคิวที่ 1, 2, 3... ตามลำดับ"
                  >
                    <RotateCcw className="w-3 h-3 shrink-0" />
                    <span className="truncate">เลือกทีละบ้านใหม่</span>
                  </button>

                  <button
                    type="button"
                    onClick={autoSortNearestFromHq}
                    className="flex items-center justify-center gap-1 px-2 py-1.5 font-bold rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 transition-colors cursor-pointer"
                    title="คำนวณเรียงลำดับจาก ทต.บางเป้า ไปบ้านที่ใกล้ที่สุดต่อๆ กันอัตโนมัติ"
                  >
                    <Sparkles className="w-3 h-3 shrink-0" />
                    <span className="truncate">เรียงใกล้สุด</span>
                  </button>

                  <button
                    type="button"
                    onClick={autoSortStopsByMoo}
                    className="flex items-center justify-center px-2 py-1.5 font-bold rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-colors cursor-pointer"
                    title="เรียงตามหมู่ที่ 1 ถึง หมู่ที่ 7"
                  >
                    <span className="truncate">เรียง ม.1➔ม.7</span>
                  </button>

                  <button
                    type="button"
                    onClick={
                      selectedStopIds.length === 0
                        ? selectOnlyPendingStops
                        : clearQueueToPickInOrder
                    }
                    className="flex items-center justify-center px-2 py-1.5 font-bold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors cursor-pointer"
                    title="สลับดึงผู้รอส่งทั้งหมดเข้าคิว หรือล้างคิว"
                  >
                    <span className="truncate">
                      {selectedStopIds.length === 0
                        ? `ดึงรอส่งทั้งหมด (${pendingCount})`
                        : `ล้างคิว (${orderedSelectedStops.length})`}
                    </span>
                  </button>
                </div>

                {/* Row 2: Primary Route Action Bar (3 Equal Columns - Draw Route / Google Maps App / Share Route) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={isRouteDrawn ? handleClearDrawnRoute : handleDrawRouteOnMap}
                    disabled={orderedSelectedStops.length === 0 && !isRouteDrawn}
                    className={`py-2 px-2.5 rounded-xl font-extrabold text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      isRouteDrawn
                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                        : 'bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white'
                    }`}
                  >
                    {isRouteDrawn ? (
                      <>
                        <X className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">ซ่อนเส้นทาง</span>
                      </>
                    ) : (
                      <>
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">วาดเส้นทาง ({orderedSelectedStops.length})</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => window.open(getGoogleMapsRouteUrl(), '_blank')}
                    disabled={orderedSelectedStops.length === 0}
                    className="py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-extrabold text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    title="ส่งพิกัดตามลำดับคิวไปยังแอป Google Maps เพื่อเริ่มนำทางทันที"
                  >
                    <Navigation className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">นำทาง Google Maps</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsShareRouteModalOpen(true)}
                    disabled={orderedSelectedStops.length === 0}
                    className="py-2 px-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-extrabold text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    title="แชร์ลิงก์เส้นทาง Google Maps, QR Code หรือส่งเข้า LINE ให้ทีมงาน"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">แชร์เส้นทาง / QR</span>
                  </button>
                </div>

                {/* Row 3: Prominent Send Complete Queue Notification to LINE Group & Official Email (All Stops + Multi-Stop Map + A4 Manifest) */}
                <button
                  type="button"
                  disabled={isSendingLtcNotify}
                  onClick={handleSendLtcQueueNotification}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 hover:from-amber-600 hover:via-orange-700 hover:to-rose-700 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all ring-2 ring-amber-200"
                  title="ส่งแจ้งเตือนคิวจัดส่งพัสดุ LTC ครบทุกคนตามลำดับคิว พร้อมรายการสิ่งของ พิกัดบ้าน ลิงก์นำทาง Google Maps แบบหลายจุด และแนบใบจัดส่ง A4 เข้ากลุ่ม LINE & อีเมลทันที"
                >
                  <Bell className="w-4 h-4 shrink-0 animate-bounce" />
                  <span className="truncate">
                    {isSendingLtcNotify
                      ? 'กำลังส่งแจ้งเตือนเข้า LINE กลุ่ม & อีเมล...'
                      : `🔔 แจ้งเตือนคิวจัดส่งเข้า LINE กลุ่ม & อีเมล (ครบทุกคน ${
                          orderedSelectedStops.length > 0 ? orderedSelectedStops.length : pendingCount
                        } ราย + นำทางแผนที่)`}
                  </span>
                </button>
              </div>

              {/* Delivered Status Banner & Pending Counter in Route Sequencer */}
              {(() => {
                const pendingSequencerStops = filteredStops.filter(
                  (s) =>
                    getStopDeliveryStatus(s.patientId, selectedYearFilter, selectedRoundFilter).status === 'pending'
                );
                const deliveredSequencerStops = filteredStops.filter(
                  (s) =>
                    getStopDeliveryStatus(s.patientId, selectedYearFilter, selectedRoundFilter).status === 'delivered'
                );

                return (
                  <>
                    <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-emerald-950 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          ส่งมอบแล้วในรอบนี้:{' '}
                          <strong className="text-emerald-700">{deliveredSequencerStops.length}</strong> ราย
                          <span className="text-[11px] text-emerald-600 font-medium ml-1">
                            (กรองออกจากคิวจัดส่งแล้ว)
                          </span>
                        </span>
                      </div>
                      <span className="text-[11px] font-extrabold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full">
                        ⏳ รอจัดส่ง: {pendingSequencerStops.length} ราย
                      </span>
                    </div>

                    {/* Scrollable Patient Pin Cards with Free Reordering Controls (Only Pending Stops in Queue) */}
                    <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1 flex-1">
                      {pendingSequencerStops.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-emerald-300 bg-emerald-50/40 rounded-xl space-y-1.5">
                          <div className="text-3xl">🎉</div>
                          <div className="font-extrabold text-emerald-800 text-sm">
                            ส่งมอบครบทุกรายแล้วในรอบนี้ ({deliveredSequencerStops.length} ราย)!
                          </div>
                          <div className="text-[11px] text-emerald-600">
                            ระบบได้กรองรายชื่อที่ส่งมอบสำเร็จออกจากคิวจัดส่งเรียบร้อยแล้ว
                            สามารถตรวจสอบประวัติการส่งมอบได้ที่ตารางด้านล่าง
                          </div>
                        </div>
                      ) : orderedSelectedStops.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-teal-300 bg-teal-50/30 rounded-2xl space-y-3">
                          <div className="text-3xl">📥</div>
                          <div className="font-extrabold text-teal-900 text-sm">
                            ยังไม่มีรายชื่อในคิวจัดรอบส่งมอบ ({activeYearLabel} • {activeRoundLabel})
                          </div>
                          <p className="text-[11px] text-slate-600 max-w-sm mx-auto leading-relaxed">
                            พื้นที่นี้ใช้สำหรับจัดลำดับส่งมอบ ให้กดปุ่ม <strong>&ldquo;+ ส่งไปจัดรอบ&rdquo;</strong> จากตารางรายชื่อด้านล่าง เพื่อนำผู้ป่วยเข้าสู่คิวจัดเส้นทาง หรือกดปุ่มด้านล่างเพื่อดึงทั้งหมด
                          </p>
                          <button
                            type="button"
                            onClick={selectOnlyPendingStops}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>ดึงรายชื่อรอส่งทั้งหมด ({pendingSequencerStops.length} ราย) เข้าคิว</span>
                          </button>
                        </div>
                      ) : (
                        orderedSelectedStops.map((stop, idx) => {
                          const queueNumber = idx + 1;
                          const roundInfo = getStopRoundInfo(stop, selectedRoundFilter, selectedYearFilter);

                          return (
                            <div
                              key={stop.id}
                              draggable
                              onDragStart={() => setDraggedStopId(stop.id)}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={() => {
                                if (draggedStopId && draggedStopId !== stop.id) {
                                  reorderStopsByDrag(draggedStopId, stop.id);
                                }
                                setDraggedStopId(null);
                              }}
                              onDragEnd={() => setDraggedStopId(null)}
                              onClick={() => focusStopOnOverviewMap(stop)}
                              className={`p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                                draggedStopId === stop.id
                                  ? 'opacity-50 border-dashed border-teal-500 bg-teal-50/40'
                                  : activeStop?.id === stop.id
                                  ? 'border-teal-500 bg-teal-50/70 shadow-xs ring-1 ring-teal-400'
                                  : 'border-teal-200 bg-white hover:border-teal-400'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full text-white font-extrabold text-[10px] flex items-center justify-center shrink-0 shadow-2xs ${
                                      stop.adlCategory === 'ติดเตียง'
                                        ? 'bg-rose-600'
                                        : 'bg-teal-700'
                                    }`}
                                  >
                                    คิว #{queueNumber}
                                  </span>
                                  <div className="min-w-0">
                                    <div className="font-bold text-slate-900 truncate">{stop.patientName}</div>
                                    <div className="text-[11px] text-slate-500 truncate">
                                      หมู่ที่ {stop.moo} {stop.village} • {stop.address}
                                    </div>
                                  </div>
                                </div>

                                {/* Free Order Controls: Queue Dropdown + Up/Down Buttons + Remove Button */}
                                <div
                                  className="flex items-center gap-1 shrink-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <select
                                    value={queueNumber}
                                    onChange={(e) => changeStopPosition(stop.id, Number(e.target.value))}
                                    title="เปลี่ยนลำดับคิวบ้านนี้โดยตรง"
                                    className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded px-1.5 py-0.5 cursor-pointer outline-none"
                                  >
                                    {orderedSelectedStops.map((_, posIdx) => (
                                      <option key={posIdx + 1} value={posIdx + 1}>
                                        ลำดับ {posIdx + 1}
                                      </option>
                                    ))}
                                  </select>

                                  <button
                                    type="button"
                                    onClick={() => moveStopById(stop.id, 'up')}
                                    disabled={idx <= 0}
                                    title="เลื่อนขึ้นไปส่งก่อนหน้า"
                                    className="p-1 rounded bg-slate-100 hover:bg-teal-100 text-slate-700 hover:text-teal-800 disabled:opacity-30 cursor-pointer"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveStopById(stop.id, 'down')}
                                    disabled={idx >= orderedSelectedStops.length - 1}
                                    title="เลื่อนลงไปส่งถัดไป"
                                    className="p-1 rounded bg-slate-100 hover:bg-teal-100 text-slate-700 hover:text-teal-800 disabled:opacity-30 cursor-pointer"
                                  >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => toggleStopSelection(stop.id)}
                                    title="นำออกจากคิวส่งมอบนี้"
                                    className="p-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-800 text-[10px] font-bold cursor-pointer transition-colors"
                                  >
                                    ✕ นำออก
                                  </button>
                                </div>
                              </div>

                              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                                      stop.adlCategory === 'ติดเตียง'
                                        ? 'bg-rose-100 text-rose-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    {stop.adlCategory}
                                  </span>
                                  <div className="text-teal-900 font-semibold truncate" title={roundInfo.text}>
                                    📦 {roundInfo.text}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => focusStopOnOverviewMap(stop)}
                                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded text-[10px] cursor-pointer"
                                    title="ซูมดูหมุดบนแผนที่"
                                  >
                                    ดูหมุด
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      window.open(
                                        `https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}`,
                                        '_blank'
                                      )
                                    }
                                    className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold rounded text-[10px] cursor-pointer"
                                    title="นำทาง Google Maps รายบ้าน"
                                  >
                                    นำทาง
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openDeliveryModal(stop)}
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[10px] cursor-pointer shadow-xs"
                                    title="บันทึกการส่งมอบสิ่งของรอบนี้"
                                  >
                                    🚚 ส่งมอบ
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* 3.5 NEW BOX (Requested in Image 4): รายชื่อผู้มีภาวะพึ่งพิง เชื่อมกับ วงรอบปี • วงรอบแจกของ • หมู่บ้าน • รายการสิ่งของ • ปุ่มส่งไปยังจัดรอบแจก */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-xs space-y-3">
            {/* Header: Title & Quick Year/Round Selectors */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
              <div className="flex items-start sm:items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                      📋 รายชื่อผู้มีภาวะพึ่งพิง & รายการสิ่งของที่แจกตามวงรอบ ({filteredStops.length} ราย)
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-xs font-extrabold">
                      {activeYearLabel} • {activeRoundLabel}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    แสดงรายชื่อผู้มีภาวะพึ่งพิงแยกตามหมู่บ้าน รายการสิ่งของที่ต้องได้รับในรอบนี้ และกดปุ่มเพื่อส่งรายชื่อเข้าคิว <strong>&ldquo;จัดรอบแจก&rdquo;</strong> ได้ทันที
                  </p>
                </div>
              </div>

              {/* Quick Year + Round Switcher */}
              <div className="flex items-center flex-wrap gap-1.5">
                {/* Quick Year Pills */}
                <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                  {configuredYears.map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => setSelectedYearFilter(yr)}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        selectedYearFilter === yr
                          ? 'bg-teal-700 text-white shadow-2xs font-extrabold'
                          : 'text-slate-600 hover:text-slate-900 font-bold'
                      }`}
                    >
                      ปี {yr}
                    </button>
                  ))}
                </div>

                {/* Quick Round Pills + Add Round Button */}
                <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                  {[...configuredRounds, 'all'].map((rd) => (
                    <button
                      key={rd}
                      type="button"
                      onClick={() => setSelectedRoundFilter(rd)}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        selectedRoundFilter === rd
                          ? 'bg-blue-600 text-white shadow-2xs font-extrabold'
                          : 'text-slate-600 hover:text-slate-900 font-bold'
                      }`}
                    >
                      {rd === 'all' ? 'ทุกรอบ' : `รอบ ${rd}`}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddNewRound}
                    title="เพิ่มวงรอบการส่งมอบใหม่ เช่น รอบที่ 3, 4"
                    className="ml-1 px-2 py-0.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-extrabold text-[11px] flex items-center gap-0.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3 h-3" />
                    <span>เพิ่มรอบ</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Toolbar Row 2: Status Tabs + Sort Selector + Send to Queue Button */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
              {/* Filter Tabs inside Round Recipient Table */}
              <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold shrink-0">
                <button
                  type="button"
                  onClick={() => setRoundRecipientFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    roundRecipientFilter === 'all'
                      ? 'bg-white text-teal-900 shadow-2xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900 font-bold'
                  }`}
                >
                  ทั้งหมด ({filteredStops.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRoundRecipientFilter('pending')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    roundRecipientFilter === 'pending'
                      ? 'bg-amber-500 text-white shadow-2xs font-extrabold'
                      : 'text-amber-800 hover:text-amber-950 font-bold'
                  }`}
                >
                  ⏳ รอส่ง ({pendingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setRoundRecipientFilter('delivered')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    roundRecipientFilter === 'delivered'
                      ? 'bg-emerald-600 text-white shadow-2xs font-extrabold'
                      : 'text-emerald-800 hover:text-emerald-950 font-bold'
                  }`}
                >
                  ✅ ส่งแล้ว ({deliveredCount})
                </button>
              </div>

              {/* Sorting Pills + Bulk Action */}
              <div className="flex items-center flex-wrap gap-2">
                {/* Sort Order Selector */}
                <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold gap-0.5">
                  <span className="text-slate-500 px-1.5 py-0.5 flex items-center gap-1 text-[11px]">
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-600" />
                    <span className="hidden sm:inline">เรียง:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setRecipientSortOrder('created_desc')}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-[11px] flex items-center gap-1 ${
                      recipientSortOrder === 'created_desc'
                        ? 'bg-teal-700 text-white shadow-2xs font-extrabold'
                        : 'text-slate-700 hover:text-slate-900 font-bold'
                    }`}
                    title="เรียงตามวันเวลานำเข้าข้อมูล ล่าสุดไว้บนสุด (ค่าเริ่มต้น)"
                  >
                    <span>📅 วันนำเข้าล่าสุด ⬇</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientSortOrder('queue_asc')}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-[11px] flex items-center gap-1 ${
                      recipientSortOrder === 'queue_asc'
                        ? 'bg-teal-700 text-white shadow-2xs font-extrabold'
                        : 'text-slate-700 hover:text-slate-900 font-bold'
                    }`}
                    title="เรียงตามลำดับคิวจัดส่ง (#1, #2...)"
                  >
                    <span>🚩 คิวจัดส่ง #1</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientSortOrder('moo_asc')}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-[11px] flex items-center gap-1 ${
                      recipientSortOrder === 'moo_asc'
                        ? 'bg-teal-700 text-white shadow-2xs font-extrabold'
                        : 'text-slate-700 hover:text-slate-900 font-bold'
                    }`}
                    title="เรียงตามหมู่บ้าน หมู่ 1 ถึง 7"
                  >
                    <span>🏘️ หมู่ 1➔7</span>
                  </button>
                </div>

                {/* Bulk Send to Queue */}
                <button
                  type="button"
                  onClick={() => {
                    const pendingTargetIds = filteredStops
                      .filter(
                        (s) =>
                          getStopDeliveryStatus(s.patientId, selectedYearFilter, selectedRoundFilter).status ===
                          'pending'
                      )
                      .map((s) => s.id);
                    const merged = Array.from(new Set([...selectedStopIds, ...pendingTargetIds]));
                    updateSelectedQueueForPeriod(merged);
                    setQueueToastMsg(
                      `✅ ส่งรายชื่อที่รอส่งมอบทั้ง ${pendingTargetIds.length} ราย เข้าสู่คิวจัดรอบแจก (${activeYearLabel} • ${activeRoundLabel}) เรียบร้อยแล้ว (กรองรายที่รับมอบแล้วออก)`
                    );
                    setTimeout(() => setQueueToastMsg(null), 3500);
                    routeSequencerBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-extrabold shadow-2xs transition-colors cursor-pointer"
                  title="ส่งเฉพาะรายชื่อที่ยังรอส่งมอบเข้าสู่คิวจัดรอบส่งมอบ"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ ส่งรอส่งไปจัดรอบ ({pendingCount})</span>
                </button>

                <button
                  type="button"
                  disabled={isSendingLtcNotify}
                  onClick={handleSendLtcQueueNotification}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer ring-1 ring-amber-300"
                  title="แจ้งเตือนรายชื่อผู้รับของครบทุกคน + สรุปยอดสิ่งของ + ลิงก์นำทาง Google Maps แบบครบทุกคน เข้ากลุ่ม LINE & อีเมลพร้อมใบจัดส่ง A4"
                >
                  <Bell className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {isSendingLtcNotify
                      ? 'กำลังส่งแจ้งเตือน...'
                      : `🔔 แจ้งเตือนคิวส่งของเข้า LINE & อีเมล (ครบทุกคน + นำทางแผนที่)`}
                  </span>
                </button>
              </div>
            </div>

            {/* Per-Item Supply Summary Cards in Selected Round & Year */}
            {roundSupplySummary.length > 0 && (
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                  <span className="flex items-center gap-1.5 text-teal-900 font-extrabold">
                    <Package className="w-4 h-4 text-teal-700" />
                    สรุปยอดสิ่งของแจกจ่ายในรอบนี้ ({activeYearLabel} • {activeRoundLabel}):
                  </span>
                  <span className="text-[11px] text-slate-500">
                    ส่งมอบสำเร็จ {deliveredCount} / {filteredStops.length} ราย ({deliveryRate}%)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {roundSupplySummary.map((item, idx) => {
                    const pct =
                      item.totalQty > 0 ? Math.round((item.deliveredQty / item.totalQty) * 100) : 0;
                    return (
                      <div
                        key={idx}
                        className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800 truncate" title={item.itemName}>
                            {item.itemName}
                          </span>
                          <span className="font-extrabold text-teal-800 shrink-0 ml-1">
                            {item.totalQty.toLocaleString()} {item.unit}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                          <span className="text-emerald-700 font-semibold">
                            ✅ ส่งแล้ว {item.deliveredQty.toLocaleString()}
                          </span>
                          <span className="text-amber-700 font-semibold">
                            ⏳ รอส่ง {item.pendingQty.toLocaleString()}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden mt-1">
                          <div
                            className="h-full bg-emerald-600 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recipient Table: Compact columns, phone under name, narrowed date/village/round to avoid horizontal scroll */}
            <div className="overflow-x-auto rounded-xl border border-slate-200/90 shadow-2xs bg-white">
              <table className="w-full text-left border-collapse min-w-[960px]">
                <thead className="bg-slate-50/90 text-slate-700 font-extrabold border-b border-slate-200 text-xs select-none">
                  <tr>
                    <th className="py-2.5 px-1.5 w-[80px] min-w-[80px] text-center whitespace-nowrap">คิว/สถานะ</th>
                    <th className="py-2.5 px-2 min-w-[170px] max-w-[210px]">ชื่อผู้ป่วย & เบอร์โทร</th>
                    <th className="py-2.5 px-1.5 w-[85px] min-w-[80px] text-center whitespace-nowrap">วันนำเข้า</th>
                    <th className="py-2.5 px-2 w-[110px] min-w-[100px]">หมู่บ้าน</th>
                    <th className="py-2.5 px-1.5 w-[85px] min-w-[80px] text-center whitespace-nowrap">ปีงบ/รอบ</th>
                    <th className="py-2.5 px-2 min-w-[160px] max-w-[200px]">สิ่งของรอบนี้</th>
                    <th className="py-2.5 px-1.5 w-[95px] min-w-[90px] text-center whitespace-nowrap">สถานะ</th>
                    <th className="py-2.5 px-2 w-[185px] min-w-[175px] text-right whitespace-nowrap">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-[13px]">
                  {tableStops.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 px-6 text-center text-slate-400">
                        <div className="text-2xl mb-1">🔍</div>
                        <div className="font-bold text-slate-600">ไม่พบรายชื่อผู้มีภาวะพึ่งพิงตามตัวกรองที่เลือก</div>
                        <div className="text-xs text-slate-400 mt-1">
                          (
                          {roundRecipientFilter === 'delivered'
                            ? 'ยังไม่มีรายการที่ส่งมอบแล้วในรอบนี้'
                            : roundRecipientFilter === 'pending'
                            ? 'ไม่มีผู้ที่รอส่งมอบในรอบนี้แล้ว'
                            : 'ไม่มีข้อมูล'}
                          )
                        </div>
                      </td>
                    </tr>
                  ) : (
                    tableStops.map((stop) => {
                      const matchedPt = patients.find((p) => p.id === stop.patientId);
                      const isQueued = selectedStopIds.includes(stop.id);
                      const queueNo = isQueued
                        ? orderedSelectedStops.findIndex((s) => s.id === stop.id) + 1
                        : null;
                      const deliveryInfo = getStopDeliveryStatus(
                        stop.patientId,
                        selectedYearFilter,
                        selectedRoundFilter
                      );
                      const isDelivered = deliveryInfo.status === 'delivered';
                      const roundData = getStopRoundInfo(stop, selectedRoundFilter, selectedYearFilter);
                      const displayYear =
                        selectedYearFilter === 'all'
                          ? matchedPt?.fiscalYear || '2569'
                          : selectedYearFilter;
                      const displayRound =
                        selectedRoundFilter === 'all' ? 'รวมทุกรอบ' : `รอบที่ ${selectedRoundFilter}`;

                      return (
                        <tr
                          key={stop.id}
                          className={`transition-colors ${
                            isDelivered
                              ? 'bg-emerald-50/25 hover:bg-emerald-50/50'
                              : isQueued
                              ? 'bg-teal-50/35 hover:bg-teal-50/70'
                              : 'hover:bg-slate-50/80'
                          }`}
                        >
                          {/* 1. Queue Badge */}
                          <td className="py-2.5 px-1.5 text-center whitespace-nowrap">
                            {isDelivered ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px] border border-emerald-300">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>ส่งแล้ว</span>
                              </span>
                            ) : queueNo && queueNo > 0 ? (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-teal-700 text-white font-extrabold text-[10px] shadow-2xs">
                                <span>🚩 คิว #{queueNo}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold text-[10px]">
                                รอจัดรอบ
                              </span>
                            )}
                          </td>

                          {/* 2. Patient Name & Phone moved underneath name */}
                          <td className="py-2.5 px-2">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-extrabold text-slate-900 text-sm whitespace-nowrap">
                                  {stop.patientName}
                                </span>
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold whitespace-nowrap ${
                                    stop.adlCategory === 'ติดเตียง'
                                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                                  }`}
                                >
                                  {stop.adlCategory}
                                </span>
                              </div>
                              {matchedPt?.caregiverName && (
                                <div className="text-[11px] text-slate-600 truncate max-w-[190px]" title={matchedPt.caregiverName}>
                                  ผู้ดูแล: <span className="font-medium text-slate-800">{matchedPt.caregiverName}</span>
                                </div>
                              )}
                              {(matchedPt?.caregiverPhone || matchedPt?.phone) && (
                                <div className="text-[11px] text-teal-700 font-mono font-bold flex items-center gap-1">
                                  <span className="text-[10px]">📞</span>
                                  <span>{matchedPt?.caregiverPhone || matchedPt?.phone}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* 3. วันนำเข้าข้อมูล (บีบแคบลง) */}
                          <td className="py-2.5 px-1.5 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 text-slate-700 font-semibold text-[11px] bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-md">
                              <Calendar className="w-3 h-3 text-teal-600 shrink-0" />
                              <span>{formatThaiDate(stop.createdAt || matchedPt?.createdAt || matchedPt?.lastVisitDate)}</span>
                            </span>
                          </td>

                          {/* 4. Village & Address (บีบแคบลง) */}
                          <td className="py-2.5 px-2">
                            <div className="inline-flex items-center px-1.5 py-0.5 rounded bg-teal-50 text-teal-900 border border-teal-200 font-bold text-[11px] whitespace-nowrap">
                              ม.{stop.moo} {stop.village}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[115px]" title={stop.address}>
                              {stop.address}
                            </div>
                          </td>

                          {/* 5. Fiscal Year & Round (บีบแคบลง) */}
                          <td className="py-2.5 px-1.5 text-center whitespace-nowrap">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200 font-extrabold text-[11px] whitespace-nowrap">
                              ปี {displayYear.slice(-2)} (ร.{selectedRoundFilter === 'all' ? 'รวม' : selectedRoundFilter})
                            </span>
                          </td>

                          {/* 6. Items to Distribute in this Round */}
                          <td className="py-2.5 px-2 max-w-[200px]">
                            {isDelivered && deliveryInfo.itemsDelivered && deliveryInfo.itemsDelivered.length > 0 ? (
                              <div className="flex items-center flex-wrap gap-1">
                                {deliveryInfo.itemsDelivered.map((it, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-950 border border-emerald-300 font-bold text-[10px]"
                                  >
                                    <span>✅ {it.itemName}</span>
                                    <span className="px-1 py-0.2 rounded bg-emerald-700 text-white text-[9px] font-extrabold">
                                      {it.quantity}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            ) : roundData.itemsList && roundData.itemsList.length > 0 ? (
                              <div className="flex items-center flex-wrap gap-1">
                                {roundData.itemsList.map((it, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-teal-50 text-teal-950 border border-teal-200 font-bold text-[10px]"
                                  >
                                    <span>📦 {it.itemName}</span>
                                    <span className="px-1 py-0.2 rounded bg-teal-700 text-white text-[9px] font-extrabold">
                                      {it.quantity}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <div className="font-semibold text-teal-900 text-[11px] truncate max-w-[180px]" title={roundData.text}>
                                📦 {roundData.text}
                              </div>
                            )}
                          </td>

                          {/* 7. Delivery Status & Proof */}
                          <td className="py-2.5 px-1.5 text-center whitespace-nowrap">
                            {isDelivered ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>ส่งสำเร็จ</span>
                                </span>
                                <div className="text-[9px] text-slate-500 font-medium">
                                  {deliveryInfo.deliveredAt || '-'}
                                </div>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px] border border-amber-200">
                                <Clock className="w-3 h-3 text-amber-700" />
                                <span>รอส่งมอบ</span>
                              </span>
                            )}
                          </td>

                          {/* 8. Action Buttons */}
                          <td className="py-2.5 px-2 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1">
                              {!isDelivered ? (
                                <>
                                  {!isQueued ? (
                                    <button
                                      type="button"
                                      onClick={() => sendStopToRoundQueue(stop, true)}
                                      className="px-2 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-[11px] shadow-2xs flex items-center gap-0.5 cursor-pointer transition-colors"
                                      title="ส่งรายชื่อนี้เข้าสู่คิวจัดรอบส่งมอบ"
                                    >
                                      <Plus className="w-3 h-3" />
                                      <span>จัดรอบ</span>
                                    </button>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          changeStopPosition(stop.id, 1);
                                          routeSequencerBoxRef.current?.scrollIntoView({
                                            behavior: 'smooth',
                                            block: 'center',
                                          });
                                        }}
                                        className="px-1.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-[10px] flex items-center gap-0.5 cursor-pointer transition-colors"
                                        title="อยู่ในคิวจัดรอบแล้ว (#1)"
                                      >
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        <span>ในคิว #{queueNo}</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => toggleStopSelection(stop.id)}
                                        className="px-1.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[10px] cursor-pointer transition-colors"
                                        title="นำออกจากคิวจัดรอบ"
                                      >
                                        ออก
                                      </button>
                                    </>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => openDeliveryModal(stop)}
                                    className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] shadow-2xs flex items-center gap-0.5 cursor-pointer transition-colors"
                                    title="บันทึกส่งมอบสิ่งของ"
                                  >
                                    <Truck className="w-3 h-3" />
                                    <span>ส่งมอบ</span>
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleRevertDelivery(stop)}
                                  className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[10px] flex items-center gap-0.5 cursor-pointer transition-colors"
                                  title="ยกเลิกส่งมอบ"
                                >
                                  <span>↩️ ยกเลิก</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  if (matchedPt) {
                                    setSubTab('register');
                                    setTimeout(
                                      () =>
                                        handleEditPatientInForm(
                                          matchedPt,
                                          displayYear,
                                          selectedRoundFilter === 'all' ? '1' : selectedRoundFilter
                                        ),
                                      80
                                    );
                                  }
                                }}
                                className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-[11px] flex items-center gap-0.5 cursor-pointer transition-colors"
                                title="แก้ไข"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>แก้ไข</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => focusStopOnOverviewMap(stop)}
                                className="px-1.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] cursor-pointer transition-colors"
                                title="ดูหมุดบ้านบนแผนที่"
                              >
                                📍
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Bottom Executive Summaries: Village Breakdown (Left 7 Cols) & Round/Year + Supply Breakdown (Right 5 Cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left 7 Cols: Village-by-Village Breakdown Table (Moo 1 - Moo 7) for Selected Year & Round */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                    🏘️ สรุปข้อมูลการแจกจ่ายรายหมู่บ้าน (ม.1 – ม.7) • {activeYearLabel} ({activeRoundLabel})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    คลิกที่แถวหมู่บ้านเพื่อกรองแผนที่และดูยอดจัดสรรผ้าอ้อมรายหมู่บ้านในวงรอบที่เลือก
                  </p>
                </div>
                {selectedMooFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSelectedMooFilter('all')}
                    className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold cursor-pointer"
                  >
                    แสดงครบทุกหมู่บ้าน
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">หมู่บ้าน (ต.บางเป้า)</th>
                      <th className="p-2.5 text-center">ผู้รับสิทธิ์</th>
                      <th className="p-2.5 text-center">ติดเตียง/ติดบ้าน</th>
                      <th className="p-2.5 text-center">ผ้าอ้อมรอบนี้</th>
                      <th className="p-2.5 text-center">ส่งแล้ว</th>
                      <th className="p-2.5 text-center">รอส่ง</th>
                      <th className="p-2.5 text-right">ความคืบหน้า</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.entries(BANGPAO_VILLAGES).map(([mooKey, villageName]) => {
                      const villageStops = stops.filter((s) => s.moo === mooKey);
                      const vTotal = villageStops.length;
                      const vBedridden = villageStops.filter((s) => s.adlCategory === 'ติดเตียง').length;
                      const vHomebound = villageStops.filter((s) => s.adlCategory === 'ติดบ้าน').length;
                      const vDiapers = villageStops.reduce(
                        (sum, s) => sum + getStopRoundInfo(s, selectedRoundFilter).diapers,
                        0
                      );
                      const vDelivered = villageStops.filter(
                        (s) =>
                          getStopDeliveryStatus(s.patientId, selectedYearFilter, selectedRoundFilter).status ===
                          'delivered'
                      ).length;
                      const vPending = villageStops.filter(
                        (s) =>
                          getStopDeliveryStatus(s.patientId, selectedYearFilter, selectedRoundFilter).status ===
                          'pending'
                      ).length;
                      const vPct = vTotal > 0 ? Math.round((vDelivered / vTotal) * 100) : 0;
                      const isActiveMoo = selectedMooFilter === mooKey;

                      return (
                        <tr
                          key={mooKey}
                          onClick={() =>
                            setSelectedMooFilter(selectedMooFilter === mooKey ? 'all' : mooKey)
                          }
                          className={`cursor-pointer transition-colors ${
                            isActiveMoo ? 'bg-teal-50/80 font-semibold' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="p-2.5 font-bold text-slate-800">
                            หมู่ที่ {mooKey} {villageName}
                          </td>
                          <td className="p-2.5 text-center font-extrabold text-slate-900">
                            {vTotal} ราย
                          </td>
                          <td className="p-2.5 text-center">
                            <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-bold mr-1">
                              {vBedridden}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-bold">
                              {vHomebound}
                            </span>
                          </td>
                          <td className="p-2.5 text-center font-bold text-teal-800">
                            {vDiapers.toLocaleString()} ชิ้น
                          </td>
                          <td className="p-2.5 text-center font-bold text-emerald-700">
                            {vDelivered}
                          </td>
                          <td className="p-2.5 text-center font-bold text-amber-700">
                            {vPending}
                          </td>
                          <td className="p-2.5 text-right">
                            <div className="inline-flex items-center gap-2 w-24 justify-end">
                              <div className="w-14 h-2 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className="h-full bg-teal-600 rounded-full"
                                  style={{ width: `${vPct}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-bold text-slate-700 w-8">
                                {vPct}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right 5 Cols: Summary by Distribution Round (Round 1 - 4) & Fiscal Year / Stock Overview */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                      📊 สรุปแผนการแจกจ่ายแยกตามวงรอบ ({activeYearLabel})
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      คลิกเลือกวงรอบเพื่อสลับดูข้อมูลสรุปและรายการสิ่งของในแต่ละรอบ
                    </p>
                  </div>
                </div>

                {/* Round-by-Round Comparison Table (Round 1 - 4) */}
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2">วงรอบการแจกจ่าย</th>
                        <th className="p-2 text-center">ผู้รับสิทธิ์</th>
                        <th className="p-2 text-center">ส่งแล้ว</th>
                        <th className="p-2 text-center">รอส่ง</th>
                        <th className="p-2 text-center">ผ้าอ้อม</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {configuredRounds.map((rKey) => {
                        const rDelivered = baseSummaryStops.filter(
                          (s) =>
                            getStopDeliveryStatus(s.patientId, selectedYearFilter, rKey).status === 'delivered'
                        ).length;
                        const rPending = baseSummaryStops.length - rDelivered;
                        const rDiapers = baseSummaryStops.reduce(
                          (acc, s) => acc + getStopRoundInfo(s, rKey).diapers,
                          0
                        );
                        const isCurrentRound = selectedRoundFilter === rKey;

                        return (
                          <tr
                            key={rKey}
                            onClick={() => setSelectedRoundFilter(rKey)}
                            className={`cursor-pointer transition-colors ${
                              isCurrentRound
                                ? 'bg-teal-50 font-bold text-teal-950'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <td className="p-2 flex items-center gap-1.5">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  isCurrentRound ? 'bg-teal-600' : 'bg-slate-300'
                                }`}
                              />
                              <span>{ROUND_LABELS[rKey] || `วงรอบที่ ${rKey}`}</span>
                            </td>
                            <td className="p-2 text-center font-bold">{baseSummaryStops.length}</td>
                            <td className="p-2 text-center font-extrabold text-emerald-700">
                              {rDelivered}
                            </td>
                            <td className="p-2 text-center font-extrabold text-amber-700">
                              {rPending}
                            </td>
                            <td className="p-2 text-center font-semibold text-teal-800">
                              {rDiapers.toLocaleString()} ชิ้น
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Inventory Stock Quick Summary */}
                <div className="pt-1 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-slate-800">
                      📦 พัสดุคงเหลือในคลังอุปกรณ์ LTC
                    </span>
                    <button
                      type="button"
                      onClick={() => setSubTab('inventory')}
                      className="font-bold text-teal-700 hover:underline cursor-pointer text-[11px]"
                    >
                      จัดการคลังอุปกรณ์ ➔
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {inventory.slice(0, 4).map((inv) => (
                      <div
                        key={inv.id}
                        className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <span className="font-semibold text-slate-700 truncate pr-2">
                          {inv.name}
                        </span>
                        <span className="font-extrabold text-teal-800 shrink-0">
                          {inv.remainingStock.toLocaleString()} {inv.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: ลงทะเบียนผู้มีภาวะพึ่งพิง */}
      {subTab === 'register' && (
        <div className="space-y-6">
          {/* Top Row: Left Registration Form & Right Google Satellite Pin Map */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Left Column: Registration Form */}
            <div
              ref={regFormTopRef}
              className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center text-teal-800 shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                      {editingPatientId
                        ? '✏️ แก้ไขข้อมูลผู้มีภาวะพึ่งพิง'
                        : '📝 ลงทะเบียนผู้มีภาวะพึ่งพิง'}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      บันทึกข้อมูล พิกัดบ้าน และกำหนดสิ่งของแยกตามปีงบประมาณและวงรอบการส่งมอบ
                    </p>
                  </div>
                </div>
                {editingPatientId && (
                  <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                    โหมดแก้ไข
                  </span>
                )}
              </div>

              {regSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center justify-between gap-2 flex-wrap">
                  <span>{regSuccessMsg}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSubTab('route');
                      setTimeout(() => {
                        routeSequencerBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }, 120);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-extrabold cursor-pointer shrink-0"
                  >
                    ดูคิวจัดรอบในแดชบอร์ด ➔
                  </button>
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-xs sm:text-[13px]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">เลขบัตร ปชช. 13 หลัก *</label>
                    <input
                      type="text"
                      required
                      maxLength={13}
                      placeholder="1929900xxxxxx"
                      value={newReg.nationalId}
                      onChange={(e) => setNewReg({ ...newReg, nationalId: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">เพศ</label>
                    <select
                      value={newReg.gender}
                      onChange={(e) => setNewReg({ ...newReg, gender: e.target.value as any })}
                      className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none bg-white font-semibold"
                    >
                      <option value="female">หญิง</option>
                      <option value="male">ชาย</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      📅 วันที่นำเข้าข้อมูล / วันที่ลงทะเบียน
                    </label>
                    <input
                      type="date"
                      value={newReg.createdAt || '2026-10-01'}
                      onChange={(e) => setNewReg({ ...newReg, createdAt: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-semibold text-slate-800 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">ชื่อ - สกุล ผู้ป่วย *</label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น นางสมบูรณ์ มงคลยิ่ง"
                      value={newReg.fullName}
                      onChange={(e) => setNewReg({ ...newReg, fullName: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">หมู่ที่ (ต.บางเป้า)</label>
                    <select
                      value={newReg.moo}
                      onChange={(e) => {
                        const m = e.target.value;
                        setNewReg((prev) => ({
                          ...prev,
                          moo: m,
                        }));
                        if (m && BANGPAO_COORDS[m]) {
                          updateMapPin(BANGPAO_COORDS[m].lat, BANGPAO_COORDS[m].lng, true);
                        }
                      }}
                      className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-bold text-slate-800 bg-white"
                    >
                      <option value="">-- เลือกโซน/หมู่บ้าน --</option>
                      <option value="1">หมู่ที่ 1 บ้านชายวัด</option>
                      <option value="2">หมู่ที่ 2 บ้านเกาะปอม</option>
                      <option value="3">หมู่ที่ 3 บ้านตลาดใหม่</option>
                      <option value="4">หมู่ที่ 4 บ้านแหลมม่วง</option>
                      <option value="5">หมู่ที่ 5 บ้านป่าเตียว</option>
                      <option value="6">หมู่ที่ 6 บ้านควนทองสีห์</option>
                      <option value="7">หมู่ที่ 7 บ้านท่าเรือ</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">เลขที่บ้าน / ซอย</label>
                    <input
                      type="text"
                      placeholder="เช่น 12/1 ซอยร่วมใจ"
                      value={newReg.address}
                      onChange={(e) => setNewReg({ ...newReg, address: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>
                </div>

                {/* GPS Coordinates Box */}
                <div className="bg-teal-50/70 border border-teal-200/90 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-teal-900 text-xs flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-teal-700 shrink-0" />
                      <span>พิกัดตำแหน่งบ้านผู้ป่วย (GPS Coordinates)</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleGetGPS}
                      disabled={isFetchingGps}
                      className="flex items-center gap-1 px-2.5 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      <Crosshair className={`w-3.5 h-3.5 ${isFetchingGps ? 'animate-spin' : ''}`} />
                      <span>{isFetchingGps ? 'กำลังดึงพิกัด...' : '🎯 ตำแหน่งปัจจุบัน'}</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">ละติจูด (Latitude)</label>
                      <input
                        type="number"
                        step="0.000001"
                        value={newReg.lat}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          updateMapPin(val, newReg.lng, false);
                        }}
                        className="w-full p-2 border border-slate-300 rounded-lg font-mono text-xs bg-white"
                        placeholder="7.429578"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">ลองจิจูด (Longitude)</label>
                      <input
                        type="number"
                        step="0.000001"
                        value={newReg.lng}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          updateMapPin(newReg.lat, val, false);
                        }}
                        className="w-full p-2 border border-slate-300 rounded-lg font-mono text-xs bg-white"
                        placeholder="99.525737"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-teal-700">
                    คลิกบนแผนที่ด้านขวา หรือลากหมุดสีแดงเพื่อเลือกพิกัดบ้านผู้ป่วยได้โดยตรง
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">กลุ่มภาวะพึ่งพิง (ADL)</label>
                  <select
                    value={newReg.adlCategory}
                    onChange={(e) => setNewReg({ ...newReg, adlCategory: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-teal-900 bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                  >
                    <option value="ติดเตียง">🔴 ติดเตียง (ADL 0-4 คะแนน)</option>
                    <option value="ติดบ้าน">🟡 ติดบ้าน (ADL 5-11 คะแนน)</option>
                    <option value="ติดสังคม">🟢 ติดสังคม (ADL 12+ คะแนน)</option>
                  </select>
                </div>

                {/* กำหนดสิ่งของในแต่ละรอบ (เพิ่มปุ่มเลือกปี เลือกวงรอบ และนำข้อมูลไปเข้าคิวรอจัดรอบ ตามปี ตามรอบ ในการส่งมอบของ) */}
                <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-200/80 pb-2.5">
                    <div>
                      <label className="font-extrabold text-slate-800 text-xs sm:text-sm flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>กำหนดสิ่งของในแต่ละรอบ (แยกตามปีงบประมาณ & วงรอบ)</span>
                      </label>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        เลือกปีงบประมาณและวงรอบที่ต้องการกำหนดสิ่งของ แล้วบันทึกเพื่อส่งเข้าคิวรอจัดรอบส่งมอบ
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyRound1ToAll}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200/80 hover:bg-slate-300/80 text-slate-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5 text-slate-600" />
                      <span>คัดลอกรอบ 1 ไปทุกรอบ</span>
                    </button>
                  </div>

                  {/* Step 1: ปุ่มเลือกปีงบประมาณ (เลือกปี) */}
                  <div className="bg-white border border-slate-200 rounded-xl p-2.5 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[11px] font-extrabold text-slate-700">
                        📅 1. เลือกปีงบประมาณ:
                      </span>
                      <div className="flex items-center flex-wrap gap-1.5">
                        {configuredYears.map((yr) => (
                          <button
                            key={yr}
                            type="button"
                            onClick={() => handleSwitchRegFiscalYear(yr)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-extrabold border transition-all cursor-pointer ${
                              regFiscalYear === yr
                                ? 'bg-teal-700 text-white border-teal-800 shadow-2xs'
                                : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            ปี {yr} {yr === '2569' ? '(ปัจจุบัน)' : ''}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Step 2: ปุ่มเลือกวงรอบแจกของ (เลือกวงรอบ) */}
                    <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-slate-100">
                      <span className="text-[11px] font-extrabold text-slate-700">
                        🔄 2. เลือกวงรอบการส่งมอบ:
                      </span>
                      <div className="flex items-center flex-wrap gap-1.5">
                        {Object.keys(roundItems).map((rKey) => {
                          const validCount = (roundItems[rKey] || []).filter(
                            (it) => it.itemName && it.quantity > 0
                          ).length;
                          const isRoundActive = regActiveRound === rKey;
                          return (
                            <button
                              key={rKey}
                              type="button"
                              onClick={() => setRegActiveRound(rKey)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-extrabold border transition-all cursor-pointer flex items-center gap-1 ${
                                isRoundActive
                                  ? 'bg-blue-600 text-white border-blue-700 shadow-2xs'
                                  : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                              }`}
                            >
                              <span>รอบที่ {rKey}</span>
                              {validCount > 0 && (
                                <span
                                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                                    isRoundActive
                                      ? 'bg-white text-blue-700'
                                      : 'bg-blue-100 text-blue-800'
                                  }`}
                                >
                                  {validCount}
                                </span>
                              )}
                            </button>
                          );
                        })}

                        <button
                          type="button"
                          onClick={() =>
                            setRegActiveRound(regActiveRound === 'all' ? '1' : 'all')
                          }
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                            regActiveRound === 'all'
                              ? 'bg-indigo-600 text-white border-indigo-700'
                              : 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {regActiveRound === 'all' ? 'แสดงเฉพาะรอบเดียว' : 'แสดงครบทุกรอบ'}
                        </button>

                        <button
                          type="button"
                          onClick={handleAddNewRoundTab}
                          className="px-2 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 transition-colors cursor-pointer"
                          title="เพิ่มวงรอบใหม่"
                        >
                          + เพิ่มรอบ
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Step 3: รายการสิ่งของในรอบที่เลือก (หรือทุกรอบหากเลือก 'all') */}
                  <div className="space-y-3">
                    {Object.entries(roundItems)
                      .filter(([roundKey]) =>
                        regActiveRound === 'all' ? true : roundKey === regActiveRound
                      )
                      .map(([roundKey, rows]) => (
                        <div
                          key={roundKey}
                          className="bg-white border-2 border-blue-200/90 rounded-xl p-3.5 space-y-2.5 shadow-2xs"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="font-extrabold text-blue-700 text-xs sm:text-sm flex items-center gap-2">
                              <span>ปีงบประมาณ {regFiscalYear} • รอบที่ {roundKey}</span>
                              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                                {ROUND_LABELS[roundKey] || `วงรอบที่ ${roundKey}`}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {rows.map((row, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <select
                                  value={row.itemId}
                                  onChange={(e) =>
                                    handleUpdateRoundItemRow(roundKey, idx, 'itemId', e.target.value)
                                  }
                                  className="flex-1 min-w-0 p-2 border border-slate-300 rounded-lg text-xs font-medium bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                                >
                                  <option value="">-- เลือกสิ่งของ --</option>
                                  {inventory.map((inv) => (
                                    <option key={inv.id} value={inv.id}>
                                      {inv.name} (คงเหลือ {inv.remainingStock} {inv.unit})
                                    </option>
                                  ))}
                                </select>

                                <input
                                  type="number"
                                  min={1}
                                  placeholder="จำนวน"
                                  value={row.quantity > 0 ? row.quantity : ''}
                                  onChange={(e) =>
                                    handleUpdateRoundItemRow(roundKey, idx, 'quantity', e.target.value)
                                  }
                                  className="w-20 sm:w-24 p-2 border border-slate-300 rounded-lg text-xs font-bold text-center bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                                />

                                <button
                                  type="button"
                                  onClick={() => handleRemoveRoundItemRow(roundKey, idx)}
                                  className="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center font-bold text-sm shrink-0 cursor-pointer transition-colors"
                                  title="ลบรายการนี้"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>

                          <div>
                            <button
                              type="button"
                              onClick={() => handleAddRoundItemRow(roundKey)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-blue-400 text-blue-600 hover:bg-blue-50 text-xs font-bold transition-colors cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>เพิ่มรายการ</span>
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Step 4: ตัวเลือกส่งเข้าคิวรอจัดรอบตามปี • ตามรอบ ในการส่งมอบของ */}
                  <div className="p-3 bg-teal-50/90 border border-teal-300 rounded-xl space-y-2">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoQueueOnSave}
                        onChange={(e) => setAutoQueueOnSave(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded text-teal-700 focus:ring-teal-500 cursor-pointer shrink-0"
                      />
                      <span className="text-xs font-bold text-teal-950 leading-snug">
                        นำข้อมูลที่แก้ไขไปเข้าคิวรอจัดรอบส่งมอบของ:{' '}
                        <span className="underline text-teal-800 font-black">
                          ปีงบประมาณ {regFiscalYear} • รอบที่{' '}
                          {regActiveRound === 'all' ? '1' : regActiveRound}
                        </span>
                      </span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">ชื่อผู้ดูแล / ญาติ</label>
                    <input
                      type="text"
                      placeholder="เช่น นางสาววิภาดา (บุตรสาว)"
                      value={newReg.caregiverName}
                      onChange={(e) => setNewReg({ ...newReg, caregiverName: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">เบอร์โทรศัพท์ผู้ดูแล</label>
                    <input
                      type="text"
                      placeholder="081-xxxxxxx"
                      value={newReg.caregiverPhone}
                      onChange={(e) => setNewReg({ ...newReg, caregiverPhone: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>
                </div>

                {/* Validation Alert */}
                {regErrorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{regErrorMsg}</span>
                  </div>
                )}

                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 px-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5 text-xs"
                  >
                    <Save className="w-4 h-4 shrink-0" />
                    <span>
                      {editingPatientId
                        ? `บันทึกแก้ไข & เข้าคิว (ปี ${regFiscalYear} รอบ ${
                            regActiveRound === 'all' ? '1' : regActiveRound
                          })`
                        : `บันทึกข้อมูล & เข้าคิว (ปี ${regFiscalYear} รอบ ${
                            regActiveRound === 'all' ? '1' : regActiveRound
                          })`}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => savePatientAndQueueByPeriod(true)}
                    className="py-2.5 px-3.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5 text-xs"
                    title="บันทึกแล้วสลับไปหน้าแดชบอร์ดจัดรอบส่งมอบของปีและรอบนี้ทันที"
                  >
                    <Truck className="w-4 h-4 shrink-0" />
                    <span>บันทึก & ไปหน้าจัดรอบแจกทันที</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearRegForm}
                    className="py-2.5 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer text-xs"
                  >
                    ล้างฟอร์ม
                  </button>
                </div>
              </form>
            </div>

            {/* Right Column: Interactive Google Satellite Pin Map */}
            <div className="lg:col-span-7">
              {isMapFullscreen && (
                <div
                  onClick={() => setIsMapFullscreen(false)}
                  className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
                  style={{ zIndex: 9998 }}
                />
              )}
              <div
                className={
                  isMapFullscreen
                    ? 'fixed inset-2 sm:inset-5 bg-white rounded-2xl border-2 border-slate-300 p-4 sm:p-5 shadow-2xl flex flex-col'
                    : 'bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-3 h-full'
                }
                style={isMapFullscreen ? { zIndex: 9999 } : undefined}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg shrink-0">🗺️</span>
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                        แผนที่ปักหมุดบ้าน (Google Satellite Map)
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        คลิกบนแผนที่หรือลากหมุดสีแดงเพื่อระบุตำแหน่งบ้านผู้ป่วย (เริ่มต้นที่ตำแหน่งปัจจุบันอัตโนมัติ)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleGetGPS}
                      disabled={isFetchingGps}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Crosshair className={`w-3.5 h-3.5 ${isFetchingGps ? 'animate-spin' : ''}`} />
                      <span>ตำแหน่งปัจจุบัน</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsMapFullscreen((prev) => !prev)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                        isMapFullscreen
                          ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700 shadow-sm'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      {isMapFullscreen ? (
                        <>
                          <Minimize2 className="w-3.5 h-3.5" />
                          <span>ปิดเต็มจอ (ย่อแผนที่)</span>
                        </>
                      ) : (
                        <>
                          <Maximize2 className="w-3.5 h-3.5" />
                          <span>เต็มจอ</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Outer wrapper handles responsive & fullscreen sizing so React never overwrites Leaflet's classes on mapContainerRef */}
                <div
                  className={`relative w-full rounded-xl border border-slate-300 overflow-hidden shadow-inner bg-slate-100 ${
                    isMapFullscreen
                      ? 'flex-1 min-h-[420px]'
                      : 'h-[380px] sm:h-[480px] lg:h-[600px]'
                  }`}
                  style={{
                    height: isMapFullscreen ? 'calc(100vh - 165px)' : undefined,
                    zIndex: 10,
                  }}
                >
                  <div
                    ref={mapContainerRef}
                    className="w-full h-full"
                    style={{ width: '100%', height: '100%', position: 'relative' }}
                  />
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-slate-600 pt-1">
                  <div className="font-mono font-bold text-teal-800">
                    📍 พิกัดที่เลือก: {Number(newReg.lat).toFixed(6)}, {Number(newReg.lng).toFixed(6)}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      window.open(
                        `https://www.google.com/maps/search/?api=1&query=${newReg.lat},${newReg.lng}`,
                        '_blank'
                      )
                    }
                    className="text-blue-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>เปิดดูใน Google Maps</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Full-Width Table: จัดการรายชื่อผู้ป่วย (แก้ไข/ลบ) */}
          {(() => {
            const filteredPatients = patients
              .filter((p) => {
                if (!patientSearchQuery.trim()) return true;
                const q = patientSearchQuery.toLowerCase();
                const villageName = p.moo ? BANGPAO_VILLAGES[p.moo] || '' : '';
                return (
                  p.fullName.toLowerCase().includes(q) ||
                  (p.address && p.address.toLowerCase().includes(q)) ||
                  (p.idCard && p.idCard.toLowerCase().includes(q)) ||
                  villageName.toLowerCase().includes(q)
                );
              })
              .sort((a, b) => {
                const dateA = a.createdAt || a.lastVisitDate || '';
                const dateB = b.createdAt || b.lastVisitDate || '';
                const cmp = dateB.localeCompare(dateA);
                if (cmp !== 0) return cmp;
                return a.fullName.localeCompare(b.fullName, 'th');
              });

            const renderPatientEquipments = (eqText?: string, monthlyAllowance?: number) => {
              const raw = eqText || (monthlyAllowance ? `ผ้าอ้อม ${monthlyAllowance} ชิ้น/เดือน` : '');
              if (!raw) {
                return <span className="text-slate-400 text-xs italic">ไม่มีข้อมูลพัสดุ</span>;
              }
              let text = raw.trim();
              let year = '';
              const yMatch = text.match(/^\[(ปี\s*\d+)\]\s*(.*)$/);
              if (yMatch) {
                year = yMatch[1];
                text = yMatch[2];
              }
              const rounds = text
                .split('|')
                .map((r) => r.trim())
                .filter(Boolean);

              if (rounds.length === 0) {
                return <div className="text-xs text-slate-700">{raw}</div>;
              }

              return (
                <div className="space-y-1.5 py-0.5">
                  {year && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-900 border border-blue-200 text-xs font-extrabold shadow-2xs">
                      {year}
                    </span>
                  )}
                  <div className="flex flex-col gap-1.5">
                    {rounds.map((rd, i) => (
                      <div
                        key={i}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50/90 text-teal-950 border border-teal-200/80 text-xs font-semibold leading-relaxed shadow-2xs"
                        title={rd}
                      >
                        <span className="text-xs shrink-0">📦</span>
                        <span>{rd}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            };

            return (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                          จัดการรายชื่อผู้มีภาวะพึ่งพิง (แก้ไข/ลบ)
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-xs font-extrabold">
                          {patientSearchQuery
                            ? `พบ ${filteredPatients.length} จาก ${patients.length} ราย`
                            : `ทั้งหมด ${patients.length} ราย`}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        คลิกปุ่มแก้ไขเพื่อดึงข้อมูลและพิกัดขึ้นไปแก้ไขบนแบบฟอร์มและแผนที่ด้านบน หรือคลิกพิกัดเพื่อดูตำแหน่งบ้าน
                      </p>
                    </div>
                  </div>

                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={patientSearchQuery}
                      onChange={(e) => setPatientSearchQuery(e.target.value)}
                      placeholder="ค้นหารายชื่อ, หมู่บ้าน, เลขบัตร..."
                      className="w-full pl-9 pr-8 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                    {patientSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setPatientSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                        title="ล้างคำค้นหา"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200/90 shadow-2xs bg-white">
                  <table className="w-full text-left text-xs sm:text-[13px] min-w-[1050px] border-collapse">
                    <thead className="bg-slate-50/90 text-slate-700 font-extrabold border-b border-slate-200 text-xs tracking-wider select-none">
                      <tr>
                        <th className="py-3 px-3.5 w-[240px] min-w-[220px]">ผู้มีภาวะพึ่งพิง & ระดับ ADL</th>
                        <th className="py-3 px-3 w-[160px] min-w-[150px] whitespace-nowrap">โซน/หมู่บ้าน</th>
                        <th className="py-3 px-4 min-w-[340px]">สิ่งของที่ได้รับในแต่ละรอบ</th>
                        <th className="py-3 px-3.5 w-[220px] min-w-[200px]">ผู้ดูแล, เบอร์โทร & พิกัด</th>
                        <th className="py-3 px-3.5 w-[150px] min-w-[145px] text-right whitespace-nowrap">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredPatients.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 px-6 text-center text-slate-400">
                            <div className="text-2xl mb-1">🔍</div>
                            <div className="font-bold text-slate-600">
                              ไม่พบรายชื่อผู้มีภาวะพึ่งพิงตามคำค้นหา &ldquo;{patientSearchQuery}&rdquo;
                            </div>
                            <div className="text-xs text-slate-400 mt-1">ลองตรวจสอบตัวสะกด หรือล้างคำค้นหา</div>
                          </td>
                        </tr>
                      ) : (
                        filteredPatients.map((p) => {
                          const mooNum = p.moo || '1';
                          const villageName = BANGPAO_VILLAGES[mooNum]
                            ? `หมู่ที่ ${mooNum} ${BANGPAO_VILLAGES[mooNum]}`
                            : `หมู่ที่ ${mooNum}`;
                          const baseCoords = BANGPAO_COORDS[mooNum] || BANGPAO_COORDS['1'];
                          const lat = p.latitude ?? baseCoords.lat;
                          const lng = p.longitude ?? baseCoords.lng;

                          return (
                            <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                              {/* 1. วันนำเข้าข้อมูล (บน) -> ชื่อ-นามสกุล -> ที่อยู่ -> ระดับ ADL (ล่าง) */}
                              <td className="py-3.5 px-3.5">
                                <div className="space-y-1">
                                  {/* วันนำเข้าข้อมูล อยู่บนชื่อ-นามสกุล */}
                                  <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80 whitespace-nowrap shadow-2xs">
                                    <Calendar className="w-3 h-3 text-teal-600 shrink-0" />
                                    <span>นำเข้า: {formatThaiDate(p.createdAt || p.lastVisitDate, true)}</span>
                                  </div>

                                  {/* ชื่อ-นามสกุล */}
                                  <div className="font-extrabold text-slate-900 text-sm whitespace-nowrap pt-0.5">
                                    {p.fullName}
                                  </div>

                                  {/* ที่อยู่ */}
                                  <div className="text-xs text-slate-500 leading-snug">
                                    {p.address}
                                  </div>

                                  {/* ระดับ ADL อยู่ล่างชื่อ-นามสกุล */}
                                  <div className="pt-0.5">
                                    <span
                                      className={`inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold whitespace-nowrap shadow-2xs border ${
                                        p.adlCategory === 'ติดเตียง'
                                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                                          : 'bg-amber-50 text-amber-800 border-amber-200'
                                      }`}
                                    >
                                      <span>{p.adlCategory === 'ติดเตียง' ? '🔴' : '🟡'}</span>
                                      <span>{p.adlCategory} ({p.adlScore} คะแนน)</span>
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* 2. โซน/หมู่บ้าน */}
                              <td className="py-3.5 px-3 whitespace-nowrap">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-teal-50 text-teal-900 border border-teal-200/80 font-bold text-xs whitespace-nowrap shadow-2xs">
                                  {villageName}
                                </span>
                              </td>

                              {/* 3. สิ่งของที่ได้รับในแต่ละรอบ (แสดงเต็มๆ ทุกรอบ) */}
                              <td className="py-3.5 px-4">
                                {renderPatientEquipments(p.equipmentNeeded, p.monthlyDiaperAllowance)}
                              </td>

                              {/* 4. ผู้ดูแล / เบอร์โทร / พิกัดบ้าน (พิกัดอยู่ใต้เบอร์โทร) */}
                              <td className="py-3.5 px-3.5">
                                <div className="space-y-1">
                                  {/* ชื่อผู้ดูแล */}
                                  <div className="font-extrabold text-slate-900 text-xs whitespace-nowrap">
                                    {p.caregiverName || 'ญาติผู้ดูแล'}
                                  </div>

                                  {/* เบอร์โทร */}
                                  {(p.caregiverPhone || p.phone) ? (
                                    <div className="text-[11px] text-teal-700 font-mono font-bold flex items-center gap-1 whitespace-nowrap">
                                      <span className="text-[10px]">📞</span>
                                      <span>{p.caregiverPhone || p.phone}</span>
                                    </div>
                                  ) : (
                                    <div className="text-[11px] text-slate-400">-</div>
                                  )}

                                  {/* พิกัดบ้าน อยู่ใต้เบอร์โทร */}
                                  <div className="pt-0.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        updateMapPin(lat, lng, true);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                      }}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-slate-200 hover:border-teal-300 font-mono text-[11px] font-semibold whitespace-nowrap shadow-2xs cursor-pointer transition-colors"
                                      title="คลิกเพื่อปักหมุดและดูตำแหน่งบนแผนที่ด้านบน"
                                    >
                                      <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                                      <span>{Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}</span>
                                    </button>
                                  </div>
                                </div>
                              </td>

                              {/* 5. จัดการ */}
                              <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                                <div className="inline-flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => onRecordVisit(p)}
                                    className="px-2.5 py-1.5 bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200 rounded-lg text-xs font-extrabold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                    title="บันทึกการเยี่ยมบ้าน"
                                  >
                                    <span>🩺</span>
                                    <span>เยี่ยมบ้าน</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleEditPatientInForm(p);
                                      window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg cursor-pointer transition-colors shadow-2xs"
                                    title="แก้ไขข้อมูลและพิกัดผู้ป่วย"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  {onDeletePatient && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (window.confirm(`ยืนยันการลบข้อมูลผู้ป่วย "${p.fullName}" หรือไม่?`)) {
                                          onDeletePatient(p.id);
                                        }
                                      }}
                                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg cursor-pointer transition-colors shadow-2xs"
                                      title="ลบรายชื่อผู้ป่วย"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* SUB-VIEW 3: คลังอุปกรณ์ (Matches Image 4) */}
      {subTab === 'inventory' && (
        <div className="space-y-4">
          {/* Header Title */}
          <div className="flex items-center gap-2.5 px-1">
            <span className="text-xl">🏪</span>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
              คลังพัสดุ / คลังอุปกรณ์
            </h3>
          </div>

          {inventoryNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-between animate-in fade-in">
              <span>{inventoryNotice}</span>
              <button
                onClick={() => setInventoryNotice(null)}
                className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-2 py-0.5 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* 2-Column Layout matching Image 4 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column (7 cols): Stock Table */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50/90 text-slate-800 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3.5 w-20">รหัส</th>
                    <th className="py-3 px-3.5">รายการ</th>
                    <th className="py-3 px-3.5">คงเหลือ</th>
                    <th className="py-3 px-3.5">หน่วย</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inventory.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-3.5 text-slate-700 font-medium">
                        {item.code || idx + 1}
                      </td>
                      <td className="py-3.5 px-3.5 font-semibold text-slate-800">
                        {item.name}
                      </td>
                      <td className="py-3.5 px-3.5 font-extrabold text-slate-900">
                        {item.remainingStock}
                      </td>
                      <td className="py-3.5 px-3.5 text-slate-600">
                        {item.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Right Column (5 cols): Add Stock Box + Recent History Box */}
            <div className="lg:col-span-5 space-y-5">
              {/* Top Right Card: รับพัสดุเข้าคลัง */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3.5">
                <h4 className="text-sm sm:text-base font-extrabold text-slate-900">
                  รับพัสดุเข้าคลัง
                </h4>

                <form onSubmit={handleAddStockSubmit} className="space-y-3 text-xs sm:text-sm">
                  <div>
                    <input
                      type="text"
                      required
                      placeholder="ชื่อพัสดุ (เช่น ผ้าอ้อม M)"
                      value={newStockForm.name}
                      onChange={(e) => setNewStockForm({ ...newStockForm, name: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <input
                        type="text"
                        placeholder="รหัส"
                        value={newStockForm.code}
                        onChange={(e) => setNewStockForm({ ...newStockForm, code: e.target.value })}
                        className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        required
                        placeholder="หน่วย (ชิ้น/แพ็ค)"
                        value={newStockForm.unit}
                        onChange={(e) => setNewStockForm({ ...newStockForm, unit: e.target.value })}
                        className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <input
                      type="number"
                      min={1}
                      required
                      placeholder="จำนวน"
                      value={newStockForm.quantity}
                      onChange={(e) => setNewStockForm({ ...newStockForm, quantity: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    บันทึกรับเข้า
                  </button>
                </form>
              </div>

              {/* Bottom Right Card: ประวัติการเข้า-ออกคลัง (50 รายการล่าสุด) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-slate-500" />
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                    ประวัติการเข้า-ออกคลัง (50 รายการล่าสุด)
                  </h4>
                </div>

                <div className="overflow-x-auto max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">ว/ด/ป</th>
                        <th className="py-2.5 px-3">รายการ</th>
                        <th className="py-2.5 px-3 text-center">เข้า/ออก</th>
                        <th className="py-2.5 px-3 text-right">จำนวน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stockLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 text-slate-500 font-medium">
                            {log.dateStr}
                          </td>
                          <td className="py-2.5 px-3 text-slate-800 font-medium">
                            {log.itemName}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold text-white ${
                                log.type === 'in' ? 'bg-emerald-600' : 'bg-rose-600'
                              }`}
                            >
                              {log.type === 'in' ? 'รับเข้า' : 'จ่ายออก'}
                            </span>
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-bold ${
                              log.type === 'in' ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {log.type === 'in' && log.quantity > 0 ? `+${log.quantity}` : log.quantity}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
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

      {/* Delivery Handover Confirmation Modal (replaces window.prompt) */}
      {deliveryModalStop && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-teal-700 to-emerald-700 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-teal-200" />
                <h3 className="font-bold text-sm sm:text-base">ยืนยันการส่งมอบชุดดูแล LTC</h3>
              </div>
              <button
                onClick={() => setDeliveryModalStop(null)}
                className="p-1 text-teal-100 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">ผู้ป่วยผู้รับของ:</span>
                  <span className="font-bold text-slate-900">{deliveryModalStop.patientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ที่อยู่จัดส่ง:</span>
                  <span className="font-medium text-slate-700 truncate max-w-[240px]">{deliveryModalStop.address}</span>
                </div>
                {(() => {
                  const modalEffYear = selectedYearFilter === 'all' ? '2569' : selectedYearFilter;
                  const modalEffRound = selectedRoundFilter === 'all' ? '1' : selectedRoundFilter;
                  const roundData = getStopRoundInfo(deliveryModalStop, modalEffRound, modalEffYear);

                  return (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">ปีและวงรอบ:</span>
                        <span className="font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          ปีงบประมาณ {modalEffYear} • รอบที่ {modalEffRound}
                        </span>
                      </div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-slate-500 shrink-0">รายการของที่ส่งมอบ:</span>
                        <div className="text-right">
                          {roundData.itemsList && roundData.itemsList.length > 0 ? (
                            <div className="flex flex-col items-end gap-1">
                              {roundData.itemsList.map((it, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-teal-50 border border-teal-200 font-bold text-teal-900"
                                >
                                  <span>📦 {it.itemName}:</span>
                                  <span className="text-teal-700 font-black">
                                    {it.quantity} {it.unit}
                                  </span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="font-bold text-teal-800">{roundData.text}</span>
                          )}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ชื่อผู้รับมอบของ (ญาติ/ผู้ดูแล/ผู้ป่วย) *
                </label>
                <input
                  type="text"
                  required
                  value={deliveryReceiver}
                  onChange={(e) => setDeliveryReceiver(e.target.value)}
                  placeholder="เช่น นางสาวสมศรี (ลูกสาว)"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ความสัมพันธ์กับผู้ป่วย
                </label>
                <select
                  value={deliveryRelation}
                  onChange={(e) => setDeliveryRelation(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-medium"
                >
                  <option value="ผู้ป่วยรับมอบเอง">ผู้ป่วยรับมอบเอง</option>
                  <option value="บุตร/ธิดา">บุตร / ธิดา</option>
                  <option value="คู่สมรส">คู่สมรส</option>
                  <option value="ญาติผู้ดูแล">ญาติผู้ดูแล</option>
                  <option value="อสม. ผู้ดูแล">อสม. ประจำหมู่บ้าน</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  บันทึกสภาพผู้ป่วย / หมายเหตุการส่งมอบ
                </label>
                <textarea
                  rows={2}
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  placeholder="เช่น สัญญาณชีพคงที่ แผลกดทับดีขึ้น ผู้ป่วยรู้สึกตัวดี"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeliveryModalStop(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelivery}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer active:scale-98"
                >
                  ✓ บันทึกยืนยันส่งมอบสำเร็จ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Planned Route & Send to Google Maps App Modal */}
      {isShareRouteModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
          style={{ zIndex: 10000 }}
        >
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-700 via-teal-700 to-emerald-700 text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                  <Navigation className="w-5 h-5 text-emerald-200" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">
                    📤 ส่งพิกัดนำทางไปยัง Google Maps & แชร์เส้นทางให้ทีมงาน
                  </h3>
                  <p className="text-[11px] text-teal-100">
                    เส้นทางเรียงตามคิวที่วางแผนไว้ ({orderedSelectedStops.length} จุดส่งมอบ) เริ่มจาก ทต.บางเป้า
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsShareRouteModalOpen(false)}
                className="p-1.5 text-teal-100 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto">
              {shareCopyFeedback && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold text-xs flex items-center justify-between">
                  <span>{shareCopyFeedback}</span>
                </div>
              )}

              {/* Top Section: QR Code for Mobile Google Maps App + Direct Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 items-center">
                <div className="sm:col-span-4 flex flex-col items-center justify-center bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                      getGoogleMapsRouteUrl()
                    )}`}
                    alt="QR Code เส้นทาง Google Maps"
                    className="w-32 h-32 sm:w-36 sm:h-36 object-contain"
                  />
                  <span className="text-[10px] font-bold text-slate-600 mt-1.5 text-center">
                    📱 สแกนด้วยมือถือเพื่อเปิดแอป Google Maps นำทางตามคิวทันที
                  </span>
                </div>

                <div className="sm:col-span-8 space-y-2.5">
                  <div className="font-extrabold text-slate-900 text-sm">
                    เลือกวิธีส่งต่อหรือเปิดนำทาง ({orderedSelectedStops.length} จุดตามลำดับคิว)
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    ลิงก์ด้านล่างได้ผูกพิกัด <strong>จุดเริ่มต้น (ทต.บางเป้า)</strong> และ <strong>จุดแวะส่งมอบคิวที่ #1 ถึง #{orderedSelectedStops.length}</strong> เรียงตามลำดับที่คุณจัดไว้เรียบร้อยแล้ว เมื่อเปิดบนมือถือจะเด้งเข้าแอป <strong>Google Maps</strong> พร้อมกดเริ่มนำทางได้ทันที
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => window.open(getGoogleMapsRouteUrl(), '_blank')}
                      className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Navigation className="w-4 h-4" />
                      <span>🚀 เปิดแอป Google Maps นำทาง</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleShareRouteViaLine}
                      className="py-2.5 px-3 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white font-extrabold text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>💬 แชร์เส้นทางเข้า LINE</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyRouteUrl}
                      className="py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                      <span>📋 คัดลอกเฉพาะลิงก์ Google Maps</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleNativeWebShare}
                      className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>📲 แชร์ผ่านระบบมือถือ / แอปอื่น</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Google Maps Direct URL Box */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-700">
                  🔗 ลิงก์นำทาง Google Maps แบบหลายจุดตามลำดับคิว:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getGoogleMapsRouteUrl()}
                    className="flex-1 p-2 bg-slate-50 border border-slate-300 rounded-lg text-[11px] font-mono text-slate-700 select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyRouteUrl}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs cursor-pointer shrink-0 flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>คัดลอกลิงก์</span>
                  </button>
                </div>
              </div>

              {/* Full Route Summary Text Box for LINE / Messenger */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-700">
                    📝 ข้อความสรุปแผนการส่งมอบ + รายการสิ่งของ + ลิงก์นำทาง (สำหรับส่งให้คนขับรถ/ทีมงาน):
                  </label>
                  <button
                    type="button"
                    onClick={handleCopyFullRouteSummary}
                    className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-[11px] cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <Copy className="w-3 h-3" />
                    <span>คัดลอกข้อความทั้งหมด</span>
                  </button>
                </div>
                <textarea
                  rows={7}
                  readOnly
                  value={buildShareableRouteSummaryText()}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-mono text-slate-800 leading-relaxed"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500">
                💡 เคล็ดลับ: ส่งข้อความเข้ากลุ่ม LINE เพื่อให้เจ้าหน้าที่ภาคสนามกดลิงก์เปิดนำทางได้ทันที
              </span>
              <button
                type="button"
                onClick={() => setIsShareRouteModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: LTC Delivery Queue Notification Dispatched Confirmation & Direct Actions */}
      {ltcNotifyResultLog && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in"
          style={{ zIndex: 10005 }}
        >
          <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-gradient-to-r from-teal-900 via-emerald-800 to-teal-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-sm">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-emerald-200">
                    รหัสใบงานจัดส่ง: {ltcNotifyResultLog.referenceCode}
                  </div>
                  <h3 className="font-extrabold text-sm sm:text-base">
                    ✅ ส่งแจ้งเตือนคิวส่งมอบพัสดุ LTC เข้ากลุ่ม LINE & อีเมลเรียบร้อยแล้ว!
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLtcNotifyResultLog(null)}
                className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-bold cursor-pointer"
              >
                ✕ ปิด
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 space-y-1">
                <div className="font-extrabold text-sm flex items-center gap-1.5 text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{ltcNotifyResultLog.statusMessage}</span>
                </div>
                <div className="text-[11px] text-emerald-800">
                  ส่งข้อมูลครบถ้วนทุกสิ่ง: <strong>รายชื่อผู้รับของเรียงตามคิวครบทุกคน, กลุ่มภาวะพึ่งพิง (ADL), หมู่บ้าน/บ้านเลขที่, เบอร์โทร, รายการสิ่งของรายคน + สรุปยอดรวมรอบนี้, พิกัด GPS รายบ้าน และลิงก์นำทาง Google Maps แบบหลายจุดครบทุกคน</strong>
                </div>
              </div>

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => window.open(getGoogleMapsRouteUrl(), '_blank')}
                  className="py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Navigation className="w-4 h-4 shrink-0" />
                  <span>🗺️ เปิด Google Maps นำทางครบทุกคนตามคิว</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const code = ltcNotifyResultLog.referenceCode;
                    setLtcNotifyResultLog(null);
                    window.dispatchEvent(new CustomEvent('bangpao:open-field-job', { detail: code }));
                  }}
                  className="py-3 px-4 rounded-2xl bg-blue-700 hover:bg-blue-800 text-white font-extrabold text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Truck className="w-4 h-4 shrink-0" />
                  <span>👷 เปิดหน้าใบสั่งงานภาคสนาม (รับงาน / จบงาน • ติดขัด)</span>
                </button>

                {ltcNotifyResultLog.attachments?.map((att) => (
                  <React.Fragment key={att.id}>
                    <button
                      type="button"
                      onClick={() => openAttachmentPrintableHtml(att)}
                      className="py-3 px-4 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Printer className="w-4 h-4 shrink-0" />
                      <span>🖨️ เปิดพิมพ์ใบจัดส่งพัสดุ A4 (.PDF)</span>
                    </button>
                    {att.docxBase64 && (
                      <button
                        type="button"
                        onClick={() => downloadAttachmentDocx(att)}
                        className="py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Download className="w-4 h-4 shrink-0" />
                        <span>📥 ดาวน์โหลดใบจัดส่ง Word (.DOCX)</span>
                      </button>
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Preview Summary Text Sent to LINE */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-800">
                    📋 รายละเอียดข้อความที่ส่งแจ้งเตือนเข้ากลุ่ม LINE (ครบทุกคน + ลิงก์นำทางแผนที่):
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(ltcNotifyResultLog.lineTextSummary);
                        if (onShowToast) onShowToast('success', 'คัดลอกข้อความแจ้งเตือนคิว LTC เรียบร้อยแล้ว');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>คัดลอกข้อความ</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(
                          ltcNotifyResultLog.lineTextSummary
                        )}`;
                        window.open(lineUrl, '_blank');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#06C755] hover:bg-[#05b34c] text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>ส่งต่อผ่านแอป LINE</span>
                    </button>
                  </div>
                </div>
                <textarea
                  readOnly
                  rows={9}
                  value={ltcNotifyResultLog.lineTextSummary}
                  className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-300 font-mono text-[11px] text-slate-800 leading-relaxed"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
