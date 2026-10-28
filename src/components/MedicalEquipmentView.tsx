import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Stethoscope,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  Calendar,
  User,
  Phone,
  FileText,
  RotateCcw,
  ClipboardList,
  Building2,
  Check,
  MapPin,
  Crosshair,
  ExternalLink,
  Navigation,
  Share2,
  Copy,
  Truck,
  CheckCircle,
  XCircle,
  HelpCircle,
  Eye,
  SlidersHorizontal,
  ChevronRight,
  UserCheck,
  Filter,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Sparkles,
  X,
  Maximize2,
  Minimize2,
  Trash2,
  Edit3,
  Save,
  LayoutDashboard,
  Undo2,
  Download,
  Package,
  Camera,
  Info,
  ShoppingCart,
  ArrowRight,
  ArrowLeft,
  CheckSquare,
  Square,
  Tag,
  Home,
  Wrench,
  Layers,
  List,
  QrCode,
  History,
} from 'lucide-react';
import {
  EquipmentLoan,
  MedicalEquipment,
  MedicalEquipmentUnit,
  UserRole,
  SignerSettings,
  DEFAULT_SIGNER_SETTINGS,
} from '../types/index.ts';
import {
  getStoredEquipmentUnits,
  saveStoredEquipmentUnits,
} from '../services/sheetsSync.ts';
import {
  BANGPAO_COORDS,
  BANGPAO_VILLAGES,
  BANGPAO_MUNICIPALITY_COORDS,
  formatThaiDate,
} from './NhsoLtcCombinedView.tsx';
import { PrintEquipmentLoanModal } from './PrintEquipmentLoanModal.tsx';
import {
  exportOfficialMedicalLoanDocx,
  generateOfficialMedicalLoanHtml,
} from '../services/medicalLoanDocGenerator.ts';

import { THAI_ADMIN_DIVISIONS } from '../data/thaiAdministrativeDivisions.ts';

// List of all 77 provinces with Trang first, followed by Thai alphabetical order
const ALL_THAI_PROVINCES = [
  'ตรัง',
  ...Object.keys(THAI_ADMIN_DIVISIONS)
    .filter((p) => p !== 'ตรัง')
    .sort((a, b) => a.localeCompare(b, 'th')),
];

const BORROWER_RELATIONS = [
  'บุตร/ธิดา',
  'คู่สมรส',
  'บิดา/มารดา',
  'พี่น้อง',
  'ญาติผู้ดูแล',
  'ตนเอง (ผู้ป่วยยืมเอง)',
  'ผู้ดูแล/อสม.',
  'อื่นๆ',
];

// Helper functions for 10-digit phone and 13-digit Thai National ID formatting
const cleanDigits = (val?: string): string => (val || '').replace(/\D/g, '');

const formatPhone10 = (val?: string): string => {
  const digits = cleanDigits(val).slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
};

const formatIdCard13 = (val?: string): string => {
  const digits = cleanDigits(val).slice(0, 13);
  if (digits.length <= 1) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 1)}-${digits.slice(1)}`;
  if (digits.length <= 10) return `${digits.slice(0, 1)}-${digits.slice(1, 5)}-${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 1)}-${digits.slice(1, 5)}-${digits.slice(5, 10)}-${digits.slice(10)}`;
  return `${digits.slice(0, 1)}-${digits.slice(1, 5)}-${digits.slice(5, 10)}-${digits.slice(10, 12)}-${digits.slice(12)}`;
};

// High-contrast SVG status pins with sharp drop-shadow for satellite maps
const createStatusPinIcon = (
  status: 'borrowed' | 'returned' | 'pending' | 'hq',
  queueNumber?: number | null,
  isActive?: boolean
) => {
  const L = (window as any).L;
  if (!L) return null;

  if (status === 'hq') {
    return L.divIcon({
      className: 'custom-hq-pin-icon',
      html: `
        <div style="position:relative;width:40px;height:48px;filter:drop-shadow(0 4px 7px rgba(0,0,0,0.55));cursor:pointer;">
          <svg viewBox="0 0 24 32" width="40" height="48">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 20 12 20s12-11 12-20c0-6.63-5.37-12-12-12z" fill="#0284c7" stroke="#ffffff" stroke-width="2.2"/>
            <circle cx="12" cy="11" r="7.5" fill="#ffffff"/>
            <text x="12" y="15" font-size="10" text-anchor="middle" font-family="'Prompt',sans-serif">🏢</text>
          </svg>
        </div>
      `,
      iconSize: [40, 48],
      iconAnchor: [20, 48],
      popupAnchor: [0, -48],
    });
  }

  let pinColor = '#059669'; // Emerald green for borrowed (ยืมใช้งานอยู่)
  let centerText = 'ยืม';
  let centerColor = '#059669';

  if (status === 'returned') {
    pinColor = '#7c3aed'; // Vibrant Purple for returned (ส่งคืนแล้ว)
    centerText = 'คืน';
    centerColor = '#7c3aed';
  } else if (status === 'pending') {
    pinColor = '#ea580c'; // Amber / Orange for pending (รอนำส่ง)
    centerText = queueNumber ? `#${queueNumber}` : 'รอ';
    centerColor = '#ea580c';
  }

  const activeRing = isActive
    ? `<div style="position:absolute;top:-4px;left:-4px;right:-4px;bottom:0px;border-radius:999px;border:3px solid #38bdf8;box-shadow:0 0 12px #38bdf8;pointer-events:none;"></div>`
    : '';

  const scaleStyle = isActive ? 'transform:scale(1.22);transform-origin:bottom center;' : '';

  return L.divIcon({
    className: 'custom-status-pin-icon',
    html: `
      <div style="position:relative;width:34px;height:44px;filter:drop-shadow(0 4px 6px rgba(0,0,0,0.55));cursor:pointer;${scaleStyle}transition:transform 0.15s ease;">
        ${activeRing}
        <svg viewBox="0 0 24 32" width="34" height="44">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 20 12 20s12-11 12-20c0-6.63-5.37-12-12-12z" fill="${pinColor}" stroke="#ffffff" stroke-width="2.4"/>
          <circle cx="12" cy="11" r="7.2" fill="#ffffff"/>
          <text x="12" y="14.3" font-size="${centerText.length > 2 ? '7' : '8.5'}" text-anchor="middle" font-family="'Prompt',sans-serif" font-weight="900" fill="${centerColor}">${centerText}</text>
        </svg>
      </div>
    `,
    iconSize: [34, 44],
    iconAnchor: [17, 44],
    popupAnchor: [0, -44],
  });
};

interface MedicalEquipmentViewProps {
  equipmentList: MedicalEquipment[];
  equipmentUnits?: MedicalEquipmentUnit[];
  loans: EquipmentLoan[];
  userRole: UserRole;
  onNewLoan?: () => void;
  onReturnEquipment: (loanId: string, returnCondition?: 'complete' | 'damaged', notes?: string) => void;
  onPrintContract: (loan: EquipmentLoan) => void;
  onAddRegisteredLoan?: (loan: EquipmentLoan) => void;
  onUpdateLoanStatus?: (loanId: string, status: EquipmentLoan['status'], extra?: Partial<EquipmentLoan>) => void;
  onDeleteLoan?: (loanId: string) => void;
  onAddEquipment?: (item: MedicalEquipment) => void;
  onUpdateEquipment?: (item: MedicalEquipment) => void;
  onAddEquipmentUnit?: (unit: MedicalEquipmentUnit) => void;
  onUpdateEquipmentUnit?: (unit: MedicalEquipmentUnit) => void;
  onDeleteEquipmentUnit?: (unitId: string) => void;
  activeSubTab?: 'route' | 'register' | 'inventory' | 'loans' | 'map';
  onSubTabChange?: (tab: 'route' | 'register' | 'inventory') => void;
  savedSignerSettings?: SignerSettings;
}

export const MedicalEquipmentView: React.FC<MedicalEquipmentViewProps> = ({
  equipmentList,
  equipmentUnits: propUnits,
  loans,
  userRole,
  onNewLoan,
  onReturnEquipment,
  onPrintContract,
  onAddRegisteredLoan,
  onUpdateLoanStatus,
  onDeleteLoan,
  onAddEquipment,
  onUpdateEquipment,
  onAddEquipmentUnit,
  onUpdateEquipmentUnit,
  onDeleteEquipmentUnit,
  activeSubTab: controlledTab,
  onSubTabChange,
  savedSignerSettings,
}) => {
  // Normalize Sub-Tabs:
  // 'route' = 📊 แดชบอร์ดติดตาม (รอบส่ง/ยืม-คืน) + แผนที่ดาวเทียม GIS
  // 'register' = 📝 ลงทะเบียนขอยืมอุปกรณ์ (4 ขั้นตอน)
  // 'inventory' = 📦 คลังอุปกรณ์การแพทย์
  const resolveTab = (t?: string): 'route' | 'register' | 'inventory' => {
    if (t === 'register') return 'register';
    if (t === 'inventory') return 'inventory';
    return 'route';
  };

  const [internalTab, setInternalTab] = useState<'route' | 'register' | 'inventory'>('route');
  const subTab = resolveTab(controlledTab || internalTab);
  const setSubTab = (t: 'route' | 'register' | 'inventory') => {
    if (onSubTabChange) onSubTabChange(t);
    else setInternalTab(t);
    if (t === 'register') setRegStep(1);
  };

  // Filters State
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('2569');
  const [selectedRoundFilter, setSelectedRoundFilter] = useState<string>('all');
  const [selectedMooFilter, setSelectedMooFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Queue State for Delivery Planner (Stop IDs in Delivery Order)
  const [selectedStopIds, setSelectedStopIds] = useState<string[]>([]);
  const [isRouteDrawn, setIsRouteDrawn] = useState(false);
  const [showPinLabels, setShowPinLabels] = useState(true);
  const [isOverviewMapFullscreen, setIsOverviewMapFullscreen] = useState(false);
  const [activeLoanPin, setActiveLoanPin] = useState<EquipmentLoan | null>(null);
  const [queueToastMsg, setQueueToastMsg] = useState<string | null>(null);
  const [tableTabMode, setTableTabMode] = useState<'borrowed' | 'returned' | 'queue' | 'online' | 'all'>('borrowed');

  const onlineRequestsCount = useMemo(() => {
    return loans.filter((l) => l.isPublicCitizenRequest || l.status === 'pending').length;
  }, [loans]);
  const [mapPinStatusFilter, setMapPinStatusFilter] = useState<'all' | 'borrowed' | 'returned' | 'pending'>('all');

  // Leaflet Map Refs
  const overviewMapContainerRef = useRef<HTMLDivElement | null>(null);
  const overviewMapInstanceRef = useRef<any>(null);
  const overviewMarkersLayerRef = useRef<any>(null);
  const overviewRouteLayerRef = useRef<any>(null);
  const overviewMarkerMapRef = useRef<Record<string, any>>({});

  // Registration Pin Map Refs
  const regMapContainerRef = useRef<HTMLDivElement | null>(null);
  const regMapInstanceRef = useRef<any>(null);
  const regMarkerRef = useRef<any>(null);

  // Modals State
  const [printModalLoan, setPrintModalLoan] = useState<EquipmentLoan | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isShareCitizenFormOpen, setIsShareCitizenFormOpen] = useState(false);
  const [isCopiedShareLink, setIsCopiedShareLink] = useState(false);
  const [isCopiedRouteText, setIsCopiedRouteText] = useState(false);

  // Delivery Appointment Modal
  const [appointmentLoan, setAppointmentLoan] = useState<EquipmentLoan | null>(null);
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryStaff, setDeliveryStaff] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  const handleOpenAppointmentModal = (loan: EquipmentLoan) => {
    setAppointmentLoan(loan);
    setDeliveryDate(loan.deliveryDate || new Date().toISOString().split('T')[0]);
    setDeliveryStaff(loan.deliveryStaff || '');
    setDeliveryNotes('');
  };

  // Return Inspection Modal
  const [returnModalLoan, setReturnModalLoan] = useState<EquipmentLoan | null>(null);
  const [returnCondition, setReturnCondition] = useState<'complete' | 'damaged'>('complete');
  const [damageNotes, setDamageNotes] = useState('');

  // Add Equipment Modal
  const [isAddEquipModalOpen, setIsAddEquipModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<MedicalEquipment | null>(null);
  const [isEditEquipModalOpen, setIsEditEquipModalOpen] = useState(false);
  const [newEquipForm, setNewEquipForm] = useState({
    assetCode: `EQ-${Date.now().toString().slice(-4)}`,
    name: '',
    category: 'bed' as MedicalEquipment['category'],
    totalQuantity: 1,
    storageLocation: 'ห้องคลังอุปกรณ์ชั้น 1 กองสาธารณสุข',
  });

  // Unit-Level Inventory State (คลังอุปกรณ์รายชิ้น / รายทะเบียน)
  const [internalUnits, setInternalUnits] = useState<MedicalEquipmentUnit[]>(() =>
    propUnits && propUnits.length > 0 ? propUnits : getStoredEquipmentUnits()
  );

  useEffect(() => {
    if (propUnits && propUnits.length > 0) {
      setInternalUnits(propUnits);
    }
  }, [propUnits]);

  const units = propUnits || internalUnits;

  const [invViewMode, setInvViewMode] = useState<'grouped' | 'list'>('grouped');
  const [invSearchQuery, setInvSearchQuery] = useState('');
  const [invCategoryFilter, setInvCategoryFilter] = useState<string>('all');
  const [invStatusFilter, setInvStatusFilter] = useState<'all' | 'available' | 'borrowed' | 'maintenance'>('all');
  const [invMooFilter, setInvMooFilter] = useState<string>('all');
  const [editingUnit, setEditingUnit] = useState<MedicalEquipmentUnit | null>(null);
  const [isAddUnitModalOpen, setIsAddUnitModalOpen] = useState(false);
  const [newUnitForm, setNewUnitForm] = useState<{
    category: MedicalEquipment['category'];
    equipmentId: string;
    name: string;
    assetCode: string;
    brandModel: string;
    serialNumber: string;
    condition: 'good' | 'fair' | 'damaged' | 'repair_needed';
    status: 'available' | 'borrowed' | 'maintenance' | 'disposed';
    storageLocation: string;
    imageUrl: string;
    notes: string;
  }>({
    category: 'bed',
    equipmentId: 'EQ-001',
    name: 'เตียงผู้ป่วยมือหมุน 2 ไกร์ พร้อมเบาะรองนอน',
    assetCode: 'ทต.บป.BED-016',
    brandModel: 'Paramount Bed 2-Crank',
    serialNumber: '',
    condition: 'good',
    status: 'available',
    storageLocation: 'ห้องคลังอุปกรณ์ชั้น 1 กองสาธารณสุข',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Hospital_bed.jpg',
    notes: '',
  });

  const handleUpdateUnit = (updatedUnit: MedicalEquipmentUnit) => {
    if (onUpdateEquipmentUnit) {
      onUpdateEquipmentUnit(updatedUnit);
    }
    setInternalUnits((prev) => {
      const next = prev.map((u) => (u.id === updatedUnit.id ? updatedUnit : u));
      saveStoredEquipmentUnits(next);
      return next;
    });
  };

  const handleAddUnit = (unit: MedicalEquipmentUnit) => {
    if (onAddEquipmentUnit) {
      onAddEquipmentUnit(unit);
    }
    setInternalUnits((prev) => {
      const next = [unit, ...prev];
      saveStoredEquipmentUnits(next);
      return next;
    });
  };

  const handleDeleteUnit = (unitId: string) => {
    if (onDeleteEquipmentUnit) {
      onDeleteEquipmentUnit(unitId);
    }
    setInternalUnits((prev) => {
      const next = prev.filter((u) => u.id !== unitId);
      saveStoredEquipmentUnits(next);
      return next;
    });
  };

  // -------------------------------------------------------------
  // Multi-step Registration Wizard State (4 Steps as in Screenshots)
  // -------------------------------------------------------------
  const [regStep, setRegStep] = useState<number>(1);
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([]);
  const [queuedEquipmentIds, setQueuedEquipmentIds] = useState<string[]>([]);
  const [selectedEquipmentToAdd, setSelectedEquipmentToAdd] = useState<string>('');
  const [queueConfirmItem, setQueueConfirmItem] = useState<MedicalEquipment | null>(null);
  const [loanDurationType, setLoanDurationType] = useState<'open_ended' | 'fixed_term'>('open_ended');
  const [loanFixedMonths, setLoanFixedMonths] = useState<number>(6);
  const [fixedReturnDate, setFixedReturnDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toISOString().split('T')[0];
  });
  const [sameAddressChecked, setSameAddressChecked] = useState<boolean>(false);
  const [acceptedTerms, setAcceptedTerms] = useState<boolean>(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState<boolean>(false);

  // Form State for Borrower & Patient (Dropdowns not pre-filled by default)
  const [borrowerForm, setBorrowerForm] = useState({
    borrowerName: '',
    borrowerIdCard: '',
    borrowerPhone: '',
    borrowerAddress: '',
    borrowerProvince: '',
    borrowerDistrict: '',
    borrowerSubdistrict: '',
    borrowerRelation: '',
    patientName: '',
    patientIdCard: '',
    patientAge: '',
    patientDisease: 'พักฟื้นติดบ้าน / ผู้ป่วยติดเตียง',
    patientAddress: '',
    patientProvince: '',
    patientDistrict: '',
    patientSubdistrict: '',
    moo: '1',
    lat: BANGPAO_COORDS['1'].lat,
    lng: BANGPAO_COORDS['1'].lng,
    adlCategory: 'ติดเตียง',
    reason: 'เพื่อใช้ฟื้นฟูสมรรถภาพร่างกายที่บ้าน',
  });

  const [isFetchingGps, setIsFetchingGps] = useState(false);
  const [registerSuccessMsg, setRegisterSuccessMsg] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Registration Bottom Summary Table States (Image 2 style)
  const [regTableSearch, setRegTableSearch] = useState<string>('');
  const [regTableMooFilter, setRegTableMooFilter] = useState<string>('all');
  const [regTableStatusFilter, setRegTableStatusFilter] = useState<string>('all');

  // Helper to extract accurate timestamp for sorting newest loan requests first
  const getLoanSortTimestamp = (loan: EquipmentLoan): number => {
    // 1. Check createdAt ISO string if present
    if (loan.createdAt) {
      const t = new Date(loan.createdAt).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
    // 2. Check 13-digit epoch timestamp inside id / loanCode / contractNumber (e.g., TR_1793075002129)
    const idCandidates = [loan.id, loan.loanCode, loan.contractNumber, loan.docNo].filter(Boolean).join(' ');
    const epochMatch = idCandidates.match(/17\d{11}/);
    const dateStr = loan.borrowDate || loan.loanDate || '';
    const dateMs = dateStr ? new Date(dateStr).getTime() : 0;

    if (epochMatch) {
      const epochMs = Number(epochMatch[0]);
      // Combine dateMs and epochMs so newest date + newest creation timestamp always wins
      if (!isNaN(dateMs) && dateMs > 0) {
        return Math.max(dateMs, epochMs);
      }
      return epochMs;
    }

    if (!isNaN(dateMs) && dateMs > 0) return dateMs;
    return 0;
  };

  // Normalized Loans with Coords (Sorted Newest First!)
  const normalizedLoans = useMemo(() => {
    const mapped = loans.map((loan, idx) => {
      let mooStr = loan.moo ? String(loan.moo).trim() : '';
      if (!mooStr || !BANGPAO_COORDS[mooStr]) {
        const match = (loan.address || loan.borrowerAddress || '').match(/หมู่\s*([1-7])/);
        mooStr = match ? match[1] : String((idx % 7) + 1);
      }
      const defaultCoord = BANGPAO_COORDS[mooStr] || BANGPAO_COORDS['1'];
      const lat = loan.latitude && !isNaN(Number(loan.latitude)) ? Number(loan.latitude) : defaultCoord.lat + (idx * 0.0006 - 0.0018);
      const lng = loan.longitude && !isNaN(Number(loan.longitude)) ? Number(loan.longitude) : defaultCoord.lng + (idx * 0.0007 - 0.0021);
      return {
        ...loan,
        moo: mooStr,
        latitude: lat,
        longitude: lng,
      };
    });

    return mapped.sort((a, b) => getLoanSortTimestamp(b) - getLoanSortTimestamp(a));
  }, [loans]);

  // Sync selectedStopIds initially
  useEffect(() => {
    if (selectedStopIds.length === 0 && normalizedLoans.length > 0) {
      const defaultQueue = normalizedLoans
        .filter((l) => l.status === 'pending' || l.status === 'approved')
        .map((l) => l.id);
      if (defaultQueue.length > 0) {
        setSelectedStopIds(defaultQueue);
      } else {
        setSelectedStopIds(normalizedLoans.slice(0, 5).map((l) => l.id));
      }
    }
  }, [normalizedLoans]);

  // Filtered Loans for Dashboard
  const filteredLoans = useMemo(() => {
    return normalizedLoans.filter((loan) => {
      if (selectedMooFilter !== 'all' && String(loan.moo) !== selectedMooFilter) return false;

      if (selectedCategoryFilter !== 'all') {
        const cat = loan.equipmentCategory || '';
        const eqName = loan.equipmentName || '';
        if (selectedCategoryFilter === 'bed' && !cat.includes('bed') && !eqName.includes('เตียง')) return false;
        if (selectedCategoryFilter === 'wheelchair' && !cat.includes('wheelchair') && !eqName.includes('รถเข็น') && !eqName.includes('วีลแชร์')) return false;
        if (selectedCategoryFilter === 'oxygen' && !cat.includes('oxygen') && !eqName.includes('ออกซิเจน')) return false;
        if (selectedCategoryFilter === 'mattress' && !cat.includes('mattress') && !eqName.includes('ที่นอนลม')) return false;
        if (selectedCategoryFilter === 'suction' && !cat.includes('suction') && !eqName.includes('ดูดเสมหะ')) return false;
        if (selectedCategoryFilter === 'other' && (cat.includes('bed') || cat.includes('wheelchair') || cat.includes('oxygen') || cat.includes('mattress') || cat.includes('suction'))) return false;
      }

      if (selectedStatusFilter !== 'all') {
        if (selectedStatusFilter === 'pending' && loan.status !== 'pending' && loan.status !== 'approved') return false;
        if (selectedStatusFilter === 'borrowed' && loan.status !== 'borrowed') return false;
        if (selectedStatusFilter === 'returned' && loan.status !== 'returned') return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const pName = (loan.patientName || '').toLowerCase();
        const bName = (loan.borrowerName || '').toLowerCase();
        const phone = (loan.phone || loan.borrowerPhone || '').toLowerCase();
        const code = (loan.loanCode || loan.contractNumber || loan.docNo || '').toLowerCase();
        const addr = (loan.address || loan.borrowerAddress || '').toLowerCase();
        const eqName = (loan.equipmentName || '').toLowerCase();
        const match =
          pName.includes(q) ||
          bName.includes(q) ||
          phone.includes(q) ||
          code.includes(q) ||
          addr.includes(q) ||
          eqName.includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [normalizedLoans, selectedMooFilter, selectedCategoryFilter, selectedStatusFilter, searchQuery]);

  // Filtered Loans for Registration Bottom Summary Table (Image 2 style)
  const filteredRegLoans = useMemo(() => {
    return normalizedLoans.filter((loan) => {
      if (regTableMooFilter !== 'all' && String(loan.moo) !== regTableMooFilter) return false;

      if (regTableStatusFilter !== 'all') {
        if (regTableStatusFilter === 'pending' && loan.status !== 'pending') return false;
        if (regTableStatusFilter === 'approved' && loan.status !== 'approved') return false;
        if (regTableStatusFilter === 'borrowed' && loan.status !== 'borrowed') return false;
        if (regTableStatusFilter === 'returned' && loan.status !== 'returned') return false;
      }

      if (regTableSearch.trim()) {
        const q = regTableSearch.toLowerCase().trim();
        const pName = (loan.patientName || '').toLowerCase();
        const bName = (loan.borrowerName || '').toLowerCase();
        const phone = cleanDigits(loan.phone || loan.borrowerPhone || '');
        const searchDigits = cleanDigits(q);
        const code = (loan.loanCode || loan.contractNumber || loan.docNo || '').toLowerCase();
        const addr = (loan.address || loan.borrowerAddress || loan.patientAddress || '').toLowerCase();
        const eqName = (loan.equipmentName || '').toLowerCase();
        const pId = cleanDigits(loan.patientIdCard || loan.patientNationalId || '');
        const bId = cleanDigits(loan.borrowerIdCard || loan.borrowerNationalId || '');
        const match =
          pName.includes(q) ||
          bName.includes(q) ||
          code.includes(q) ||
          addr.includes(q) ||
          eqName.includes(q) ||
          (searchDigits && phone.includes(searchDigits)) ||
          (searchDigits && pId.includes(searchDigits)) ||
          (searchDigits && bId.includes(searchDigits));
        if (!match) return false;
      }

      return true;
    });
  }, [normalizedLoans, regTableMooFilter, regTableStatusFilter, regTableSearch]);

  const orderedSelectedLoans = useMemo(() => {
    const list: EquipmentLoan[] = [];
    selectedStopIds.forEach((id) => {
      const found = normalizedLoans.find((l) => l.id === id);
      if (found) list.push(found);
    });
    return list;
  }, [selectedStopIds, normalizedLoans]);

  // KPI Statistics
  const totalLoanCount = normalizedLoans.length;
  const activeBorrowedCount = normalizedLoans.filter((l) => l.status === 'borrowed').length;
  const pendingDispatchCount = normalizedLoans.filter((l) => l.status === 'pending' || l.status === 'approved').length;
  const returnedCount = normalizedLoans.filter((l) => l.status === 'returned').length;
  const deliveredPercent = totalLoanCount > 0 ? Math.round((activeBorrowedCount / totalLoanCount) * 100) : 0;

  const totalAssetsInStock = equipmentList.reduce((acc, eq) => acc + (eq.totalQuantity || 0), 0);
  const totalAssetsInUse = equipmentList.reduce((acc, eq) => acc + (eq.inUseQuantity || 0), 0);
  const totalAssetsAvailable = equipmentList.reduce((acc, eq) => acc + (eq.availableQuantity || 0), 0);

  // Helper to resolve live custodian & location for an individual unit
  const resolveUnitDetails = (unit: MedicalEquipmentUnit) => {
    // Check if there is an active loan matching this unit
    const activeLoan = loans.find(
      (l) =>
        (unit.currentLoanId && l.id === unit.currentLoanId) ||
        (l.equipmentCode &&
          (l.equipmentCode === unit.assetCode ||
            unit.assetCode.toLowerCase().includes(l.equipmentCode.toLowerCase()) ||
            l.equipmentCode.toLowerCase().includes(unit.assetCode.toLowerCase())) &&
          (l.status === 'borrowed' || l.status === 'approved'))
    );

    const isBorrowed = unit.status === 'borrowed' || (activeLoan && activeLoan.status === 'borrowed');
    const isMaintenance = unit.status === 'maintenance';
    const isAvailable = !isBorrowed && !isMaintenance;

    const patientName = activeLoan?.patientName || unit.currentPatientName || '-';
    const borrowerName = activeLoan?.borrowerName || unit.currentBorrowerName || '-';
    const address = activeLoan?.address || activeLoan?.patientAddress || activeLoan?.borrowerAddress || unit.currentAddress || '-';
    const moo = activeLoan?.moo || unit.currentMoo || '';
    const phone = activeLoan?.phone || activeLoan?.borrowerPhone || unit.currentBorrowerPhone || '-';
    const borrowDate = activeLoan?.borrowDate || activeLoan?.loanDate || unit.borrowDate || '-';
    const dueDate = activeLoan?.dueDate || unit.dueDate || '-';
    const contractNo = activeLoan?.contractNumber || activeLoan?.loanCode || unit.currentLoanCode || '-';

    return {
      ...unit,
      resolvedStatus: isBorrowed ? ('borrowed' as const) : isMaintenance ? ('maintenance' as const) : ('available' as const),
      activeLoan,
      patientName,
      borrowerName,
      address,
      moo,
      phone,
      borrowDate,
      dueDate,
      contractNo,
    };
  };

  const resolvedUnits = useMemo(() => {
    return units.map(resolveUnitDetails);
  }, [units, loans]);

  const totalUnitsCount = resolvedUnits.length;
  const availableUnitsCount = resolvedUnits.filter((u) => u.resolvedStatus === 'available').length;
  const borrowedUnitsCount = resolvedUnits.filter((u) => u.resolvedStatus === 'borrowed').length;
  const maintenanceUnitsCount = resolvedUnits.filter((u) => u.resolvedStatus === 'maintenance').length;

  const filteredUnits = useMemo(() => {
    return resolvedUnits.filter((u) => {
      // Category filter
      if (invCategoryFilter !== 'all') {
        if (invCategoryFilter === 'bed' && u.category !== 'bed') return false;
        if (invCategoryFilter === 'wheelchair' && u.category !== 'wheelchair') return false;
        if (invCategoryFilter === 'oxygen' && u.category !== 'oxygen_concentrator') return false;
        if (invCategoryFilter === 'mattress' && u.category !== 'air_mattress') return false;
        if (invCategoryFilter === 'suction' && u.category !== 'suction_machine') return false;
        if (invCategoryFilter === 'walker' && u.category !== 'walker') return false;
      }

      // Status filter
      if (invStatusFilter !== 'all' && u.resolvedStatus !== invStatusFilter) return false;

      // Moo filter
      if (invMooFilter !== 'all') {
        if (u.resolvedStatus === 'borrowed') {
          if (u.moo !== invMooFilter && !u.address.includes(`หมู่ ${invMooFilter}`) && !u.address.includes(`หมู่ที่ ${invMooFilter}`)) {
            return false;
          }
        } else {
          return false;
        }
      }

      // Search query
      if (invSearchQuery.trim()) {
        const q = invSearchQuery.trim().toLowerCase();
        const matchCode = u.assetCode.toLowerCase().includes(q);
        const matchName = u.name.toLowerCase().includes(q);
        const matchBrand = (u.brandModel || '').toLowerCase().includes(q);
        const matchPatient = (u.patientName || '').toLowerCase().includes(q);
        const matchBorrower = (u.borrowerName || '').toLowerCase().includes(q);
        const matchAddr = (u.address || '').toLowerCase().includes(q);
        const matchSerial = (u.serialNumber || '').toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchBrand && !matchPatient && !matchBorrower && !matchAddr && !matchSerial) {
          return false;
        }
      }

      return true;
    });
  }, [resolvedUnits, invCategoryFilter, invStatusFilter, invMooFilter, invSearchQuery]);

  const groupedCategories = useMemo(() => {
    return equipmentList.map((eq) => {
      const categoryUnits = filteredUnits.filter((u) => u.equipmentId === eq.id || u.category === eq.category);
      const allCategoryUnits = resolvedUnits.filter((u) => u.equipmentId === eq.id || u.category === eq.category);
      const availCount = allCategoryUnits.filter((u) => u.resolvedStatus === 'available').length;
      const borrowCount = allCategoryUnits.filter((u) => u.resolvedStatus === 'borrowed').length;
      const maintCount = allCategoryUnits.filter((u) => u.resolvedStatus === 'maintenance').length;

      return {
        equipment: eq,
        units: categoryUnits,
        totalCount: allCategoryUnits.length,
        availCount,
        borrowCount,
        maintCount,
      };
    });
  }, [equipmentList, filteredUnits, resolvedUnits]);

  // Initialize Overview Leaflet Satellite Map on Dashboard
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

    const timer = setTimeout(() => {
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
          attribution: '© Google Maps Satellite',
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
            ...filteredLoans.map((l) => [Number(l.latitude), Number(l.longitude)] as [number, number]),
          ];
          if (initPts.length > 1) {
            map.fitBounds(L.latLngBounds(initPts), { padding: [42, 42], maxZoom: 16 });
          }
        }, 80);
      }
    }, 40);

    return () => clearTimeout(timer);
  }, [subTab]);

  // Render & Update Pins on Dashboard Map
  useEffect(() => {
    if (subTab !== 'route') return;

    const timer = setTimeout(() => {
      const L = (window as any).L;
      const map = overviewMapInstanceRef.current;
      const layer = overviewMarkersLayerRef.current;
      if (!L || !map || !layer) return;

      layer.clearLayers();
      overviewMarkerMapRef.current = {};

      // 1. Center HQ Marker (ทต.บางเป้า)
      const hqIcon = createStatusPinIcon('hq');
      const hqMarker = L.marker([BANGPAO_MUNICIPALITY_COORDS.lat, BANGPAO_MUNICIPALITY_COORDS.lng], {
        icon: hqIcon,
        zIndexOffset: 1000,
      }).addTo(layer);

      hqMarker.bindPopup(`
        <div style="font-family:'Prompt',sans-serif;font-size:12px;line-height:1.5;min-width:210px;">
          <div style="font-weight:800;font-size:13px;color:#0f172a;margin-bottom:3px;">🏢 เทศบาลตำบลบางเป้า (ศูนย์กลาง)</div>
          <div style="color:#475569;font-size:11px;">จุดเริ่มต้นคลังอุปกรณ์การแพทย์ & ออกเดินทางส่งมอบ</div>
          <div style="color:#0f766e;font-size:11px;font-weight:700;margin-top:4px;">คลังอุปกรณ์พร้อมจ่าย: ${totalAssetsAvailable} ชิ้น</div>
        </div>
      `);
      hqMarker.bindTooltip(`
        <div style="background:#0284c7;color:#ffffff;padding:2px 7px;border-radius:6px;font-family:'Prompt',sans-serif;font-size:11px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,0.5);border:1.5px solid #ffffff;white-space:nowrap;display:flex;align-items:center;gap:4px;">
          <span style="font-size:10px;">🏢</span>
          <span>ทต.บางเป้า (คลังอุปกรณ์)</span>
        </div>
      `, {
        permanent: true,
        direction: 'bottom',
        offset: [0, 8],
        className: 'custom-status-tooltip',
      });

      // 2. Filter loans according to mapPinStatusFilter
      const loansForMap = filteredLoans.filter((loan) => {
        if (mapPinStatusFilter === 'all') return true;
        if (mapPinStatusFilter === 'borrowed') return loan.status === 'borrowed';
        if (mapPinStatusFilter === 'returned') return loan.status === 'returned';
        if (mapPinStatusFilter === 'pending') return loan.status === 'pending' || loan.status === 'approved';
        return true;
      });

      // 3. Render Status Pins
      loansForMap.forEach((loan) => {
        const isDelivered = loan.status === 'borrowed';
        const isReturned = loan.status === 'returned';
        const queueIndex = isDelivered || isReturned ? -1 : orderedSelectedLoans.findIndex((l) => l.id === loan.id);
        const queueNumber = queueIndex >= 0 ? queueIndex + 1 : null;
        const statusType: 'borrowed' | 'returned' | 'pending' = isReturned ? 'returned' : isDelivered ? 'borrowed' : 'pending';
        const isActive = activeLoanPin?.id === loan.id;

        const pinIcon = createStatusPinIcon(statusType, queueNumber, isActive);
        if (!pinIcon) return;

        const lat = Number(loan.latitude);
        const lng = Number(loan.longitude);
        if (isNaN(lat) || isNaN(lng)) return;

        const marker = L.marker([lat, lng], {
          icon: pinIcon,
          zIndexOffset: isActive ? 1000 : queueNumber ? 500 - queueNumber : isDelivered ? 120 : isReturned ? 80 : 100,
        }).addTo(layer);

        const queueBadgeHtml = queueNumber
          ? `<span style="background:#ea580c;color:#ffffff;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:800;">🚩 คิวส่งที่ #${queueNumber}</span>`
          : isDelivered
          ? `<span style="background:#059669;color:#ffffff;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:800;">🟢 ยืมใช้งานอยู่</span>`
          : isReturned
          ? `<span style="background:#7c3aed;color:#ffffff;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:800;">🔄 ส่งคืนแล้ว</span>`
          : `<span style="background:#f1f5f9;color:#64748b;padding:2px 7px;border-radius:999px;font-size:10px;font-weight:700;">รอจัดรอบส่งมอบ</span>`;

        const statusBadgeHtml = isDelivered
          ? `<span style="background:#dcfce7;color:#166534;padding:2px 7px;border-radius:999px;font-size:10px;font-weight:800;border:1px solid #86efac;">🟢 ยืมใช้งานอยู่</span>`
          : isReturned
          ? `<span style="background:#f3e8ff;color:#6b21a8;padding:2px 7px;border-radius:999px;font-size:10px;font-weight:800;border:1px solid #d8b4fe;">🔄 ส่งคืนแล้ว</span>`
          : `<span style="background:#fef3c7;color:#92400e;padding:2px 7px;border-radius:999px;font-size:10px;font-weight:800;border:1px solid #fde68a;">⏳ รอส่งมอบ</span>`;

        marker.bindPopup(`
          <div style="font-family:'Prompt',sans-serif;font-size:12px;line-height:1.5;min-width:240px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:4px;">
              <strong style="font-size:13px;color:#0f172a;">${loan.patientName}</strong>
            </div>
            <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;">
              ${queueBadgeHtml}
              ${statusBadgeHtml}
            </div>
            <div style="color:#0f766e;font-weight:700;font-size:11px;margin-bottom:3px;">
              🦼 <strong>อุปกรณ์:</strong> ${loan.equipmentName}
            </div>
            <div style="color:#334155;font-size:11px;">
              📍 <strong>หมู่ที่ ${loan.moo} ${BANGPAO_VILLAGES[loan.moo || '1'] || ''}</strong> • ${loan.address || loan.borrowerAddress || ''}
            </div>
            <div style="color:#475569;font-size:11px;margin-top:2px;">
              👤 <strong>ผู้ขอยืม:</strong> ${loan.borrowerName} (${loan.phone || loan.borrowerPhone || '-'})
            </div>
            <div style="color:#64748b;font-size:10px;font-family:monospace;margin-top:4px;">
              GPS: ${lat.toFixed(6)}, ${lng.toFixed(6)}
            </div>
            <div style="margin-top:8px;padding-top:6px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;gap:6px;">
              <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank" rel="noopener noreferrer" style="color:#2563eb;font-weight:700;font-size:11px;text-decoration:none;">
                🚗 นำทาง Google Maps ➔
              </a>
            </div>
          </div>
        `);

        if (showPinLabels) {
          const shortName = (loan.patientName || '').split(' ')[0];
          let tooltipBg = '#059669';
          let statusTag = '🟢 ยืมอยู่';
          if (isReturned) {
            tooltipBg = '#7c3aed';
            statusTag = '🟣 ส่งคืนแล้ว';
          } else if (!isDelivered) {
            tooltipBg = '#ea580c';
            statusTag = queueNumber ? `🟡 คิว #${queueNumber}` : '🟡 รอนำส่ง';
          }

          const tooltipHtml = `
            <div style="background:${tooltipBg};color:#ffffff;padding:2px 7px;border-radius:6px;font-family:'Prompt',sans-serif;font-size:11px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,0.5);border:1.5px solid #ffffff;white-space:nowrap;display:flex;align-items:center;gap:4px;">
              <span style="font-size:9.5px;background:#ffffff;color:${tooltipBg};border-radius:4px;padding:0 3.5px;font-weight:900;">${statusTag}</span>
              <span>ม.${loan.moo} ${shortName}</span>
            </div>
          `;

          marker.bindTooltip(tooltipHtml, {
            permanent: true,
            direction: 'top',
            offset: [0, -42],
            className: 'custom-status-tooltip',
          });
        }

        marker.on('click', () => {
          setActiveLoanPin(loan);
        });

        overviewMarkerMapRef.current[loan.id] = marker;
      });
    }, 50);

    return () => clearTimeout(timer);
  }, [subTab, filteredLoans, mapPinStatusFilter, orderedSelectedLoans, showPinLabels, activeLoanPin?.id, totalAssetsAvailable]);

  // Route Polyline on Leaflet
  useEffect(() => {
    if (subTab !== 'route') return;
    const L = (window as any).L;
    const layer = overviewRouteLayerRef.current;
    if (!L || !layer) return;

    layer.clearLayers();
    if (!isRouteDrawn || orderedSelectedLoans.length === 0) return;

    const latlngs: [number, number][] = [
      [BANGPAO_MUNICIPALITY_COORDS.lat, BANGPAO_MUNICIPALITY_COORDS.lng],
      ...orderedSelectedLoans.map((l) => [Number(l.latitude), Number(l.longitude)] as [number, number]),
    ];

    L.polyline(latlngs, {
      color: '#38bdf8',
      weight: 8,
      opacity: 0.45,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(layer);

    L.polyline(latlngs, {
      color: '#0284c7',
      weight: 4,
      opacity: 0.95,
      dashArray: '8, 8',
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(layer);

    orderedSelectedLoans.forEach((loan, idx) => {
      const lat = Number(loan.latitude);
      const lng = Number(loan.longitude);
      const legIcon = L.divIcon({
        className: 'custom-route-step-icon',
        html: `
          <div style="background:#0369a1;color:#ffffff;border:2px solid #ffffff;border-radius:999px;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;box-shadow:0 2px 4px rgba(0,0,0,0.35);">
            ${idx + 1}
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      L.marker([lat, lng], { icon: legIcon, interactive: false, zIndexOffset: 700 }).addTo(layer);
    });
  }, [subTab, isRouteDrawn, orderedSelectedLoans]);

  // -------------------------------------------------------------
  // Step 1 Map Picker Initialization (Identical to LTC Map System)
  // -------------------------------------------------------------
  useEffect(() => {
    if (subTab !== 'register') {
      if (regMapInstanceRef.current) {
        try {
          regMapInstanceRef.current.remove();
        } catch {}
        regMapInstanceRef.current = null;
        regMarkerRef.current = null;
      }
      return;
    }

    const timer = setTimeout(() => {
      const L = (window as any).L;
      const container = regMapContainerRef.current as any;
      if (!L || !container) return;

      // Clean up stale Leaflet instance if container was remounted
      if (regMapInstanceRef.current && regMapInstanceRef.current.getContainer() !== container) {
        try {
          regMapInstanceRef.current.remove();
        } catch {}
        regMapInstanceRef.current = null;
        regMarkerRef.current = null;
      }

      if (!regMapInstanceRef.current) {
        if (container._leaflet_id) {
          container._leaflet_id = null;
          container.innerHTML = '';
        }

        const initialLat = Number(borrowerForm.lat) || BANGPAO_COORDS[borrowerForm.moo]?.lat || BANGPAO_COORDS['1'].lat;
        const initialLng = Number(borrowerForm.lng) || BANGPAO_COORDS[borrowerForm.moo]?.lng || BANGPAO_COORDS['1'].lng;

        const map = L.map(container, {
          center: [initialLat, initialLng],
          zoom: 16,
        });

        // Google Hybrid Satellite Map layer (Identical to LTC system)
        L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
          maxZoom: 20,
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
          attribution: '© Google Maps Satellite Hybrid',
        }).addTo(map);

        const markerIcon = L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        });

        const marker = L.marker([initialLat, initialLng], {
          icon: markerIcon,
          draggable: true,
        }).addTo(map);

        marker.bindTooltip('📍 จุดติดตั้งอุปกรณ์ / บ้านผู้ป่วย (ลากเพื่อย้ายพิกัด)', {
          permanent: true,
          direction: 'top',
          offset: [0, -36],
        });

        marker.on('dragend', () => {
          const pt = marker.getLatLng();
          const lat = Number(pt.lat.toFixed(6));
          const lng = Number(pt.lng.toFixed(6));
          setBorrowerForm((prev) => ({ ...prev, lat, lng }));
        });

        map.on('click', (e: any) => {
          const lat = Number(e.latlng.lat.toFixed(6));
          const lng = Number(e.latlng.lng.toFixed(6));
          marker.setLatLng([lat, lng]);
          setBorrowerForm((prev) => ({ ...prev, lat, lng }));
        });

        regMapInstanceRef.current = map;
        regMarkerRef.current = marker;

        setTimeout(() => {
          map.invalidateSize();
        }, 120);
      } else {
        regMapInstanceRef.current.invalidateSize();
      }
    }, 60);

    return () => clearTimeout(timer);
  }, [subTab]);

  // Smoothly resize & recenter existing map when toggling fullscreen
  useEffect(() => {
    if (subTab !== 'register' || !regMapInstanceRef.current) return;
    const syncSize = () => {
      if (!regMapInstanceRef.current) return;
      regMapInstanceRef.current.invalidateSize({ animate: false });
      const center = regMarkerRef.current
        ? regMarkerRef.current.getLatLng()
        : [borrowerForm.lat || BANGPAO_COORDS['1'].lat, borrowerForm.lng || BANGPAO_COORDS['1'].lng];
      regMapInstanceRef.current.setView(center, regMapInstanceRef.current.getZoom(), { animate: false });
    };
    syncSize();
    const timers = [30, 120, 280].map((ms) => setTimeout(syncSize, ms));
    return () => timers.forEach(clearTimeout);
  }, [isMapFullscreen, subTab]);

  // Window resize observer for regMap
  useEffect(() => {
    if (subTab !== 'register' || !regMapContainerRef.current) return;
    const handleResize = () => {
      if (regMapInstanceRef.current) {
        regMapInstanceRef.current.invalidateSize();
      }
    };
    window.addEventListener('resize', handleResize);
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && regMapContainerRef.current) {
      observer = new ResizeObserver(() => {
        if (regMapInstanceRef.current) {
          regMapInstanceRef.current.invalidateSize();
        }
      });
      observer.observe(regMapContainerRef.current);
    }
    return () => {
      window.removeEventListener('resize', handleResize);
      if (observer) observer.disconnect();
    };
  }, [subTab]);

  const updateRegMapPin = (lat: number, lng: number, recenter = true) => {
    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
      setBorrowerForm((prev) => ({
        ...prev,
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
      }));
      if (regMarkerRef.current) {
        regMarkerRef.current.setLatLng([lat, lng]);
      }
      if (recenter && regMapInstanceRef.current) {
        regMapInstanceRef.current.setView([lat, lng], 17, { animate: true });
      }
    }
  };

  const handleMooChange = (m: string) => {
    const coord = BANGPAO_COORDS[m] || BANGPAO_COORDS['1'];
    setBorrowerForm((prev) => ({
      ...prev,
      moo: m,
      lat: coord.lat,
      lng: coord.lng,
    }));
    if (regMapInstanceRef.current) {
      regMapInstanceRef.current.setView([coord.lat, coord.lng], 16, { animate: true });
      if (regMarkerRef.current) {
        regMarkerRef.current.setLatLng([coord.lat, coord.lng]);
      }
    }
  };

  const handleGetGps = () => {
    if (!navigator.geolocation) {
      setFormError('เบราว์เซอร์ไม่รองรับ GPS Geolocation');
      return;
    }
    setIsFetchingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsFetchingGps(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setBorrowerForm((prev) => ({ ...prev, lat, lng }));
        if (regMapInstanceRef.current) {
          regMapInstanceRef.current.setView([lat, lng], 17, { animate: true });
          if (regMarkerRef.current) {
            regMarkerRef.current.setLatLng([lat, lng]);
          }
        }
      },
      (err) => {
        setIsFetchingGps(false);
        console.warn('GPS Geolocation warning:', err);
        const fallback = BANGPAO_COORDS[borrowerForm.moo] || BANGPAO_COORDS['1'];
        setBorrowerForm((prev) => ({ ...prev, lat: fallback.lat, lng: fallback.lng }));
        if (regMapInstanceRef.current) {
          regMapInstanceRef.current.setView([fallback.lat, fallback.lng], 16);
          if (regMarkerRef.current) regMarkerRef.current.setLatLng([fallback.lat, fallback.lng]);
        }
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleToggleSameAddress = (checked: boolean) => {
    setSameAddressChecked(checked);
    if (checked) {
      setBorrowerForm((prev) => ({
        ...prev,
        patientAddress: prev.borrowerAddress,
        patientProvince: prev.borrowerProvince,
        patientDistrict: prev.borrowerDistrict,
        patientSubdistrict: prev.borrowerSubdistrict,
      }));
    }
  };

  // Equipment Selection Handlers
  const handleToggleEquipment = (eq: MedicalEquipment) => {
    if (eq.availableQuantity > 0) {
      setSelectedEquipmentIds((prev) => {
        if (prev.includes(eq.id)) {
          return prev.filter((id) => id !== eq.id);
        } else {
          return [...prev, eq.id];
        }
      });
    } else {
      if (queuedEquipmentIds.includes(eq.id)) {
        setQueuedEquipmentIds((prev) => prev.filter((id) => id !== eq.id));
      } else {
        setQueueConfirmItem(eq);
      }
    }
  };

  const handleAddEquipmentToList = () => {
    if (!selectedEquipmentToAdd) {
      alert('กรุณาเลือกอุปกรณ์ทางการแพทย์ที่ต้องการยืมจากรายการดรอปดาวน์');
      return;
    }
    if (selectedEquipmentIds.includes(selectedEquipmentToAdd) || queuedEquipmentIds.includes(selectedEquipmentToAdd)) {
      alert('อุปกรณ์รายการนี้ถูกเลือกไว้ในรายการแล้ว');
      return;
    }
    const eq = equipmentList.find((e) => e.id === selectedEquipmentToAdd);
    if (!eq) return;

    if (eq.availableQuantity > 0) {
      setSelectedEquipmentIds((prev) => [...prev, eq.id]);
      setSelectedEquipmentToAdd('');
      setFormError(null);
    } else {
      setQueueConfirmItem(eq);
    }
  };

  const handleConfirmQueueItem = () => {
    if (queueConfirmItem) {
      setQueuedEquipmentIds((prev) => [...prev, queueConfirmItem.id]);
      setSelectedEquipmentToAdd('');
      setQueueConfirmItem(null);
      setFormError(null);
    }
  };

  const handleRemoveEquipment = (id: string) => {
    setSelectedEquipmentIds((prev) => prev.filter((i) => i !== id));
    setQueuedEquipmentIds((prev) => prev.filter((i) => i !== id));
  };

  // Step 1 Validation -> Next (if wizard used)
  const handleStep1Next = () => {
    if (!borrowerForm.borrowerName.trim()) {
      setFormError('กรุณากรอกชื่อ-สกุล ผู้ขอยืม (ผู้ยื่นคำขอ)');
      return;
    }
    const phoneDigits = cleanDigits(borrowerForm.borrowerPhone);
    if (!phoneDigits) {
      setFormError('กรุณากรอกเบอร์โทรศัพท์ติดต่อของผู้ขอยืม');
      return;
    }
    if (phoneDigits.length !== 10) {
      setFormError(`เบอร์โทรศัพท์ต้องมีครบ 10 หลัก (ปัจจุบันกรอก ${phoneDigits.length} หลัก)`);
      return;
    }
    if (borrowerForm.borrowerIdCard) {
      const bIdDigits = cleanDigits(borrowerForm.borrowerIdCard);
      if (bIdDigits.length !== 13) {
        setFormError(`เลขบัตรประจำตัวประชาชนผู้ขอยืมต้องมีครบ 13 หลัก (ปัจจุบันกรอก ${bIdDigits.length} หลัก)`);
        return;
      }
    }
    if (!borrowerForm.patientName.trim()) {
      setFormError('กรุณากรอกชื่อ-สกุล ผู้ป่วย (ผู้ใช้งานอุปกรณ์)');
      return;
    }
    if (borrowerForm.patientIdCard) {
      const pIdDigits = cleanDigits(borrowerForm.patientIdCard);
      if (pIdDigits.length !== 13) {
        setFormError(`เลขบัตรประจำตัวประชาชนผู้ป่วยต้องมีครบ 13 หลัก (ปัจจุบันกรอก ${pIdDigits.length} หลัก)`);
        return;
      }
    }
    setFormError(null);
    setRegStep(2);
  };

  // Final Submission for Registration Form
  const handleFinalSubmit = () => {
    if (!borrowerForm.borrowerName.trim()) {
      setFormError('กรุณากรอกชื่อ-สกุล ผู้ขอยืม (ผู้ยื่นคำขอ)');
      return;
    }
    const phoneDigits = cleanDigits(borrowerForm.borrowerPhone);
    if (!phoneDigits) {
      setFormError('กรุณากรอกเบอร์โทรศัพท์ติดต่อของผู้ขอยืม');
      return;
    }
    if (phoneDigits.length !== 10) {
      setFormError(`เบอร์โทรศัพท์ต้องมีครบ 10 หลัก (ปัจจุบันกรอก ${phoneDigits.length} หลัก)`);
      return;
    }
    if (borrowerForm.borrowerIdCard) {
      const bIdDigits = cleanDigits(borrowerForm.borrowerIdCard);
      if (bIdDigits.length !== 13) {
        setFormError(`เลขบัตรประจำตัวประชาชนผู้ขอยืมต้องมีครบ 13 หลัก (ปัจจุบันกรอก ${bIdDigits.length} หลัก)`);
        return;
      }
    }
    if (!borrowerForm.patientName.trim()) {
      setFormError('กรุณากรอกชื่อ-สกุล ผู้ป่วย (ผู้ใช้งานอุปกรณ์)');
      return;
    }
    if (borrowerForm.patientIdCard) {
      const pIdDigits = cleanDigits(borrowerForm.patientIdCard);
      if (pIdDigits.length !== 13) {
        setFormError(`เลขบัตรประจำตัวประชาชนผู้ป่วยต้องมีครบ 13 หลัก (ปัจจุบันกรอก ${pIdDigits.length} หลัก)`);
        return;
      }
    }
    const allChosenIds = [...selectedEquipmentIds, ...queuedEquipmentIds];
    if (allChosenIds.length === 0) {
      setFormError('กรุณาเลือกอุปกรณ์ที่ต้องการยืมจากระบบเลือกอุปกรณ์ด้านขวาอย่างน้อย 1 รายการ');
      return;
    }
    if (!acceptedTerms) {
      setFormError('กรุณาอ่านและทำเครื่องหมายยอมรับข้อตกลงและเงื่อนไขการยืมอุปกรณ์ด้านล่าง');
      return;
    }
    setFormError(null);

    const chosenEquipments = allChosenIds
      .map((id) => equipmentList.find((e) => e.id === id))
      .filter(Boolean) as MedicalEquipment[];

    const today = new Date();
    const thaiYear = today.getFullYear() + 543;
    const pad = (n: number) => n.toString().padStart(2, '0');
    const loanDateStr = `${pad(today.getDate())}/${pad(today.getMonth() + 1)}/${thaiYear}`;

    let dueDateStr = 'ตามอาการ (ไร้กำหนดคืน)';
    if (loanDurationType === 'fixed_term') {
      const dueObj = new Date(fixedReturnDate || today);
      const dueThaiYear = dueObj.getFullYear() + 543;
      dueDateStr = `${pad(dueObj.getDate())}/${pad(dueObj.getMonth() + 1)}/${dueThaiYear}`;
    }

    const fullBorrowerAddress = [
      borrowerForm.borrowerAddress,
      borrowerForm.borrowerSubdistrict ? `ต.${borrowerForm.borrowerSubdistrict}` : '',
      borrowerForm.borrowerDistrict ? `อ.${borrowerForm.borrowerDistrict}` : '',
      borrowerForm.borrowerProvince ? `จ.${borrowerForm.borrowerProvince}` : '',
    ].filter(Boolean).join(' ') || (borrowerForm.moo ? `หมู่ ${borrowerForm.moo} ต.บางเป้า อ.กันตัง จ.ตรัง` : 'ต.บางเป้า อ.กันตัง จ.ตรัง');

    const rawPatientAddr = sameAddressChecked ? borrowerForm.borrowerAddress : borrowerForm.patientAddress;
    const rawPatientSub = sameAddressChecked ? borrowerForm.borrowerSubdistrict : borrowerForm.patientSubdistrict;
    const rawPatientDist = sameAddressChecked ? borrowerForm.borrowerDistrict : borrowerForm.patientDistrict;
    const rawPatientProv = sameAddressChecked ? borrowerForm.borrowerProvince : borrowerForm.patientProvince;

    const fullPatientAddress = [
      rawPatientAddr,
      rawPatientSub ? `ต.${rawPatientSub}` : '',
      rawPatientDist ? `อ.${rawPatientDist}` : '',
      rawPatientProv ? `จ.${rawPatientProv}` : '',
    ].filter(Boolean).join(' ') || (borrowerForm.moo ? `หมู่ ${borrowerForm.moo} ต.บางเป้า อ.กันตัง จ.ตรัง` : 'ต.บางเป้า อ.กันตัง จ.ตรัง');

    let firstCreatedLoan: EquipmentLoan | null = null;

    chosenEquipments.forEach((eq, index) => {
      const isQueued = queuedEquipmentIds.includes(eq.id);
      const codeId = Date.now() + index;
      const newLoan: EquipmentLoan = {
        id: `LOAN-${codeId}`,
        loanCode: `TR_${codeId}`,
        contractNumber: `TR_${codeId}`,
        docNo: `TR_${codeId}`,
        equipmentId: eq.id,
        equipmentCode: eq.assetCode,
        equipmentName: eq.name,
        equipmentCategory: eq.category,
        borrowerName: borrowerForm.borrowerName,
        borrowerIdCard: borrowerForm.borrowerIdCard,
        borrowerNationalId: borrowerForm.borrowerIdCard,
        borrowerPhone: borrowerForm.borrowerPhone,
        borrowerRelation: borrowerForm.borrowerRelation,
        relationshipWithPatient: borrowerForm.borrowerRelation,
        borrowerAddress: fullBorrowerAddress,
        patientName: borrowerForm.patientName,
        patientIdCard: borrowerForm.patientIdCard,
        patientNationalId: borrowerForm.patientIdCard,
        patientAge: borrowerForm.patientAge,
        patientDiagnosis: borrowerForm.patientDisease,
        address: fullPatientAddress,
        patientAddress: fullPatientAddress,
        phone: borrowerForm.borrowerPhone,
        borrowDate: today.toISOString().split('T')[0],
        loanDate: loanDateStr,
        dueDate: dueDateStr,
        status: 'pending',
        officerInCharge: 'พันจ่าเอกอานัส เด็นหมาด',
        notes: `${borrowerForm.reason} (${loanDurationType === 'open_ended' ? 'ยืมระยะยาวไร้กำหนดคืน' : `ยืมระยะสั้น กำหนดคืน ${dueDateStr}`})${isQueued ? ' [สถานะ: เข้าคิวจองล่วงหน้า]' : ''}`,
        createdAt: new Date().toISOString(),
        moo: borrowerForm.moo,
        latitude: borrowerForm.lat,
        longitude: borrowerForm.lng,
        isPublicCitizenRequest: true,
      };

      if (!firstCreatedLoan) firstCreatedLoan = newLoan;
      if (onAddRegisteredLoan) {
        onAddRegisteredLoan(newLoan);
      }
    });

    setRegisterSuccessMsg(`✅ บันทึกคำขอยืมอุปกรณ์สำเร็จ ${chosenEquipments.length} รายการ สำหรับคุณ "${borrowerForm.patientName}" (สถานะ: รอเสนอผู้บริหารลงนาม)`);
    setTimeout(() => setRegisterSuccessMsg(''), 8000);

    // Auto-open Print Preview for the official 2-page contract!
    if (firstCreatedLoan) {
      setPrintModalLoan(firstCreatedLoan);
    }

    // Reset steps and selected items, staying on registration view to review summary table below
    setRegStep(1);
    setSelectedEquipmentIds([]);
    setQueuedEquipmentIds([]);
    setAcceptedTerms(false);
  };

  // Queue Operations
  const handleMoveQueueItem = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= selectedStopIds.length) return;
    const copy = [...selectedStopIds];
    const temp = copy[idx];
    copy[idx] = copy[targetIdx];
    copy[targetIdx] = temp;
    setSelectedStopIds(copy);
  };

  const handleRemoveFromQueue = (loanId: string) => {
    setSelectedStopIds((prev) => prev.filter((id) => id !== loanId));
  };

  const clearQueueToPickInOrder = () => {
    setSelectedStopIds([]);
    setQueueToastMsg('ล้างคิวแล้ว คลิกเลือกบ้านที่ต้องการไปตามลำดับ');
    setTimeout(() => setQueueToastMsg(null), 3000);
  };

  const selectOnlyPendingLoans = () => {
    const pendingIds = normalizedLoans
      .filter((l) => l.status === 'pending' || l.status === 'approved')
      .map((l) => l.id);
    setSelectedStopIds(pendingIds);
    setQueueToastMsg(`ดึงผู้ขอยืมที่รอส่งมอบ ${pendingIds.length} รายเข้าคิวแล้ว`);
    setTimeout(() => setQueueToastMsg(null), 3000);
  };

  // Nearest Neighbor TSP Auto-sort
  const autoSortNearestFromHq = () => {
    if (selectedStopIds.length === 0) {
      selectOnlyPendingLoans();
      return;
    }
    const currentList = selectedStopIds
      .map((id) => normalizedLoans.find((l) => l.id === id))
      .filter(Boolean) as EquipmentLoan[];

    const remaining = [...currentList];
    const sortedIds: string[] = [];
    let curLat = BANGPAO_MUNICIPALITY_COORDS.lat;
    let curLng = BANGPAO_MUNICIPALITY_COORDS.lng;

    while (remaining.length > 0) {
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const dLat = Number(remaining[i].latitude) - curLat;
        const dLng = Number(remaining[i].longitude) - curLng;
        const dist = dLat * dLat + dLng * dLng;
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      }
      const [closest] = remaining.splice(bestIdx, 1);
      sortedIds.push(closest.id);
      curLat = Number(closest.latitude);
      curLng = Number(closest.longitude);
    }

    setSelectedStopIds(sortedIds);
    setIsRouteDrawn(true);
    setQueueToastMsg(`⚡ เรียงลำดับใกล้สุดจาก ทต.บางเป้า (${sortedIds.length} จุด) เรียบร้อยแล้ว`);
    setTimeout(() => setQueueToastMsg(null), 3500);
  };

  const autoSortByMoo = () => {
    const currentList = (selectedStopIds.length > 0 ? selectedStopIds : normalizedLoans.map((l) => l.id))
      .map((id) => normalizedLoans.find((l) => l.id === id))
      .filter(Boolean) as EquipmentLoan[];

    const sortedIds = [...currentList]
      .sort((a, b) => Number(a.moo || '1') - Number(b.moo || '1'))
      .map((l) => l.id);

    setSelectedStopIds(sortedIds);
    setIsRouteDrawn(true);
    setQueueToastMsg(`เรียงลำดับตาม ม.1 ➔ ม.7 (${sortedIds.length} จุด) เรียบร้อยแล้ว`);
    setTimeout(() => setQueueToastMsg(null), 3500);
  };

  const handleFitAllPins = () => {
    const L = (window as any).L;
    const map = overviewMapInstanceRef.current;
    if (!L || !map) return;
    const loansForMap = filteredLoans.filter((loan) => {
      if (mapPinStatusFilter === 'all') return true;
      if (mapPinStatusFilter === 'borrowed') return loan.status === 'borrowed';
      if (mapPinStatusFilter === 'returned') return loan.status === 'returned';
      if (mapPinStatusFilter === 'pending') return loan.status === 'pending' || loan.status === 'approved';
      return true;
    });
    const pts: [number, number][] = [
      [BANGPAO_MUNICIPALITY_COORDS.lat, BANGPAO_MUNICIPALITY_COORDS.lng],
      ...loansForMap.map((l) => [Number(l.latitude), Number(l.longitude)] as [number, number]),
    ];
    if (pts.length > 1) {
      map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 16 });
    } else {
      map.setView([BANGPAO_MUNICIPALITY_COORDS.lat, BANGPAO_MUNICIPALITY_COORDS.lng], 14);
    }
  };

  // Auto-fit pins when map pin filter changes
  useEffect(() => {
    if (subTab === 'route' && overviewMapInstanceRef.current) {
      const timer = setTimeout(() => {
        handleFitAllPins();
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [mapPinStatusFilter]);

  const getGoogleMapsRouteUrl = () => {
    if (orderedSelectedLoans.length === 0) {
      return `https://www.google.com/maps/search/?api=1&query=${BANGPAO_MUNICIPALITY_COORDS.lat},${BANGPAO_MUNICIPALITY_COORDS.lng}`;
    }
    const origin = `${BANGPAO_MUNICIPALITY_COORDS.lat},${BANGPAO_MUNICIPALITY_COORDS.lng}`;
    const lastStop = orderedSelectedLoans[orderedSelectedLoans.length - 1];
    const destination = `${lastStop.latitude},${lastStop.longitude}`;
    const intermediateStops = orderedSelectedLoans.slice(0, -1);

    if (intermediateStops.length === 0) {
      return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
    }

    const waypoints = intermediateStops.map((s) => `${s.latitude},${s.longitude}`).join('|');
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${encodeURIComponent(
      waypoints
    )}&travelmode=driving`;
  };

  const buildShareableRouteSummaryText = () => {
    const routeUrl = getGoogleMapsRouteUrl();
    const todayStr = new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const stopLines = orderedSelectedLoans.map((s, idx) => {
      return `คิวที่ ${idx + 1}: ${s.patientName} (ม.${s.moo} ${BANGPAO_VILLAGES[s.moo || '1'] || ''})\n   📦 อุปกรณ์: ${s.equipmentName}\n   📞 โทร: ${s.phone || s.borrowerPhone || '-'}\n   📍 พิกัด: https://www.google.com/maps/search/?api=1&query=${s.latitude},${s.longitude}`;
    });

    return `🚚 แผนเส้นทางนำส่งอุปกรณ์การแพทย์ ทต.บางเป้า\nประจำวันที่: ${todayStr}\nจำนวนจุดส่ง: ${orderedSelectedLoans.length} หลัง\n\n${stopLines.join(
      '\n\n'
    )}\n\n🗺️ ลิงก์นำทาง Google Maps รวมทุกจุด:\n${routeUrl}`;
  };

  const handleCopyRouteUrl = () => {
    navigator.clipboard.writeText(getGoogleMapsRouteUrl()).then(() => {
      setIsCopiedShareLink(true);
      setTimeout(() => setIsCopiedShareLink(false), 3000);
    });
  };

  const handleCopyFullRouteSummary = () => {
    navigator.clipboard.writeText(buildShareableRouteSummaryText()).then(() => {
      setIsCopiedRouteText(true);
      setTimeout(() => setIsCopiedRouteText(false), 3000);
    });
  };

  const handleConfirmDelivery = (loan: EquipmentLoan) => {
    if (onUpdateLoanStatus) {
      const staffInfo = deliveryStaff.trim() ? ` โดย ${deliveryStaff.trim()}` : '';
      const notesInfo = deliveryNotes.trim() ? ` [หมายเหตุ: ${deliveryNotes.trim()}]` : '';
      onUpdateLoanStatus(loan.id, 'borrowed', {
        deliveryDate: deliveryDate,
        deliveryStaff: deliveryStaff.trim(),
        notes: `${loan.notes || ''} [ส่งมอบแล้ว: ${deliveryDate}${staffInfo}]${notesInfo}`.trim(),
      });
    }
    setAppointmentLoan(null);
  };

  const handleConfirmReturn = (loan: EquipmentLoan) => {
    onReturnEquipment(loan.id, returnCondition, damageNotes);
    setReturnModalLoan(null);
  };

  const handleSaveEditEquipment = (e?: React.FormEvent) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!editingEquipment) return;
    if (onUpdateEquipment) {
      onUpdateEquipment(editingEquipment);
    }
    setRegisterSuccessMsg('บันทึกการแก้ไข ' + editingEquipment.name + ' เรียบร้อยแล้ว');
    setIsEditEquipModalOpen(false);
    setEditingEquipment(null);
  };

  const handleImageUploadForEdit = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      alert('ขนาดไฟล์รูปภาพเกิน 20MB กรุณาเลือกไฟล์ที่เล็กลง');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rawDataUrl = ev.target?.result as string;
      // High-performance canvas downscaling to max 800x800 for optimal fast rendering & storage
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 800;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.82);
            setEditingEquipment((prev) => (prev ? { ...prev, imageUrl: compressed } : null));
          } else {
            setEditingEquipment((prev) => (prev ? { ...prev, imageUrl: rawDataUrl } : null));
          }
        } catch {
          setEditingEquipment((prev) => (prev ? { ...prev, imageUrl: rawDataUrl } : null));
        }
      };
      img.onerror = () => {
        setEditingEquipment((prev) => (prev ? { ...prev, imageUrl: rawDataUrl } : null));
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleCreateEquipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEquipForm.name.trim()) return;
    const newEquip: MedicalEquipment = {
      id: `EQ-${Date.now()}`,
      assetCode: newEquipForm.assetCode,
      name: newEquipForm.name,
      category: newEquipForm.category,
      totalQuantity: Number(newEquipForm.totalQuantity),
      availableQuantity: Number(newEquipForm.totalQuantity),
      inUseQuantity: 0,
      storageLocation: newEquipForm.storageLocation,
    };
    if (onAddEquipment) {
      onAddEquipment(newEquip);
    }
    setIsAddEquipModalOpen(false);
    setNewEquipForm({
      assetCode: `EQ-${Date.now().toString().slice(-4)}`,
      name: '',
      category: 'bed',
      totalQuantity: 1,
      storageLocation: 'ห้องคลังอุปกรณ์ชั้น 1 กองสาธารณสุข',
    });
  };

  return (
    <div className="space-y-5">
      {/* High-visibility map pin styles */}
      <style>{`
        .custom-status-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .custom-status-tooltip::before {
          display: none !important;
        }
        .custom-status-pin-icon, .custom-hq-pin-icon {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
      {/* 1. Header with 3 Main Sub-Tabs */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-teal-600 to-emerald-700 text-white rounded-xl shadow-xs">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>ระบบบริการยืม-คืนอุปกรณ์ทางการแพทย์</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-teal-100 text-teal-800 border border-teal-200">
                  ทต.บางเป้า
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                ติดตามรอบส่งมอบ • จัดคิว GIS นำทาง • ฟอร์มขอยืมอุปกรณ์ 4 ขั้นตอน • พิมพ์สัญญา A4 2 หน้า
              </p>
            </div>
          </div>

          {/* Sub-Tab Navigation Switcher */}
          <div className="flex items-center bg-slate-100/90 p-1.5 rounded-xl border border-slate-200 self-start md:self-auto overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setSubTab('route')}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                subTab === 'route'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>📊 แดชบอร์ดติดตาม (รอบส่ง/ยืม-คืน)</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab('register')}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                subTab === 'register'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <ClipboardList className="w-4 h-4 shrink-0" />
              <span>📝 ลงทะเบียนขอยืมอุปกรณ์</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab('inventory')}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                subTab === 'inventory'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Package className="w-4 h-4 shrink-0" />
              <span>📦 คลังอุปกรณ์การแพทย์</span>
            </button>
          </div>
        </div>

        {/* Global Toast if register success */}
        {registerSuccessMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs sm:text-sm font-bold flex items-center justify-between">
            <span>{registerSuccessMsg}</span>
            <button
              type="button"
              onClick={() => setRegisterSuccessMsg('')}
              className="text-emerald-700 hover:text-emerald-900 font-bold px-1"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* 2. SUBTAB: 'route' (MAIN LANDING VIEW - DASHBOARD & GIS MAP & QUEUE PLANNER) */}
      {subTab === 'route' && (
        <div className="space-y-4">
          {/* A. Unified Filter & Quick Actions Bar */}
          <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
              {/* Filter 1: Year */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">📅 ปีงบประมาณ</label>
                <select
                  value={selectedYearFilter}
                  onChange={(e) => setSelectedYearFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500 cursor-pointer"
                >
                  <option value="2569">ปีงบ 2569 (ปัจจุบัน)</option>
                  <option value="2568">ปีงบ 2568</option>
                  <option value="2567">ปีงบ 2567</option>
                </select>
              </div>

              {/* Filter 2: Loan Round / Period */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">🔄 วงรอบการยืม/ส่งมอบ</label>
                <select
                  value={selectedRoundFilter}
                  onChange={(e) => setSelectedRoundFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500 cursor-pointer"
                >
                  <option value="all">ทุกวงรอบ / ตลอดปี</option>
                  <option value="q1">ไตรมาส 1 (ต.ค. - ธ.ค.)</option>
                  <option value="q2">ไตรมาส 2 (ม.ค. - มี.ค.)</option>
                  <option value="q3">ไตรมาส 3 (เม.ย. - มิ.ย.)</option>
                  <option value="q4">ไตรมาส 4 (ก.ค. - ก.ย.)</option>
                  <option value="urgent">รอบเร่งด่วน</option>
                </select>
              </div>

              {/* Filter 3: Village Moo 1 - Moo 7 */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">🏡 เขตพื้นที่หมู่บ้าน</label>
                <select
                  value={selectedMooFilter}
                  onChange={(e) => setSelectedMooFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500 cursor-pointer"
                >
                  <option value="all">ทุกหมู่บ้าน (ม.1 - ม.7)</option>
                  {Object.entries(BANGPAO_VILLAGES).map(([m, vName]) => (
                    <option key={m} value={m}>
                      หมู่ที่ {m} {vName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter 4: Equipment Category */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">🦼 ประเภทอุปกรณ์</label>
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500 cursor-pointer"
                >
                  <option value="all">ทั้งหมด ทุกอุปกรณ์</option>
                  <option value="bed">🛏️ เตียงผู้ป่วย (3 ไกร์/2 ไกร์)</option>
                  <option value="wheelchair">🦼 รถเข็นวีลแชร์ (Wheelchair)</option>
                  <option value="oxygen">💨 เครื่องผลิตออกซิเจน 5L/ถัง</option>
                  <option value="mattress">🌊 ที่นอนลมป้องกันแผลกดทับ</option>
                  <option value="suction">🔌 เครื่องดูดเสมหะ</option>
                  <option value="other">🦯 โครงช่วยเดิน / ไม้เท้า</option>
                </select>
              </div>

              {/* Filter 5: Loan Status */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">📌 สถานะการยืม</label>
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500 cursor-pointer"
                >
                  <option value="all">ทุกสถานะ</option>
                  <option value="pending">⏳ รอนำส่งมอบ / รออนุมัติ</option>
                  <option value="borrowed">🟢 ยืมใช้งานอยู่</option>
                  <option value="returned">🔄 ส่งคืนแล้ว</option>
                </select>
              </div>

              {/* Filter 6: Search Query */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">🔍 ค้นหาผู้ป่วย/ผู้ยืม</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="พิมพ์ชื่อ, เบอร์, สัญญา..."
                    className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:ring-2 focus:ring-teal-500"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                </div>
              </div>
            </div>

            {/* Sub-bar Quick Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="text-slate-500 font-medium">
                ผลการกรอง: <strong className="text-teal-800 font-bold">{filteredLoans.length}</strong> รายการ | ในคิวนำส่ง: <strong className="text-indigo-800 font-bold">{orderedSelectedLoans.length}</strong> รายการ
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsShareCitizenFormOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>แชร์ฟอร์มประชาชน</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSubTab('register')}
                  className="px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ ลงทะเบียนขอยืมอุปกรณ์</span>
                </button>
              </div>
            </div>
          </div>

          {/* B. 6 KPI Stat Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* 1. All */}
            <div className="bg-white rounded-xl p-3 border border-teal-200 shadow-2xs">
              <div className="flex items-center justify-between text-teal-700 text-xs mb-1">
                <span className="font-bold">ทะเบียนยืมทั้งหมด</span>
                <ClipboardList className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">{totalLoanCount} <span className="text-xs font-normal text-slate-500">ราย</span></div>
              <div className="text-[11px] text-slate-400 mt-0.5">รวมทุกคำขอในระบบ</div>
            </div>

            {/* 2. Borrowed (In Use) */}
            <div className="bg-white rounded-xl p-3 border border-emerald-300 shadow-2xs bg-emerald-50/20">
              <div className="flex items-center justify-between text-emerald-700 text-xs mb-1">
                <span className="font-bold">🟢 ยืมใช้งานอยู่</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-emerald-800">{activeBorrowedCount} <span className="text-xs font-normal text-emerald-600">ราย</span></span>
                <span className="text-xs font-extrabold text-emerald-700">{deliveredPercent}%</span>
              </div>
              <div className="w-full bg-emerald-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
                <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: `${deliveredPercent}%` }} />
              </div>
            </div>

            {/* 3. Returned (ส่งคืนแล้ว) */}
            <div className="bg-white rounded-xl p-3 border border-purple-300 shadow-2xs bg-purple-50/20">
              <div className="flex items-center justify-between text-purple-700 text-xs mb-1">
                <span className="font-bold">🔄 ส่งคืนแล้ว</span>
                <Undo2 className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-2xl font-black text-purple-800">{returnedCount} <span className="text-xs font-normal text-purple-600">ราย</span></div>
              <div className="text-[11px] text-purple-600 mt-0.5">ส่งคืนอุปกรณ์เรียบร้อย</div>
            </div>

            {/* 4. Pending */}
            <div className="bg-white rounded-xl p-3 border border-amber-300 shadow-2xs bg-amber-50/20">
              <div className="flex items-center justify-between text-amber-700 text-xs mb-1">
                <span className="font-bold">⏳ รอนำส่งมอบ</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-amber-800">{pendingDispatchCount} <span className="text-xs font-normal text-amber-600">ราย</span></div>
              <div className="text-[11px] text-amber-700 font-medium mt-0.5">รอส่งมอบถึงบ้าน</div>
            </div>

            {/* 5. In use assets */}
            <div className="bg-white rounded-xl p-3 border border-sky-200 shadow-2xs">
              <div className="flex items-center justify-between text-sky-700 text-xs mb-1">
                <span className="font-bold">ยอดจัดสรรอุปกรณ์</span>
                <Stethoscope className="w-4 h-4 text-sky-600" />
              </div>
              <div className="text-2xl font-black text-sky-800">{totalAssetsInUse} <span className="text-xs font-normal text-sky-600">ชิ้น</span></div>
              <div className="text-[11px] text-sky-600 mt-0.5">หมุนเวียนดูแลประชาชน</div>
            </div>

            {/* 6. Stock Available */}
            <div className="bg-white rounded-xl p-3 border border-indigo-200 shadow-2xs">
              <div className="flex items-center justify-between text-indigo-700 text-xs mb-1">
                <span className="font-bold">คลังอุปกรณ์คงเหลือ</span>
                <Package className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-black text-indigo-800">{totalAssetsAvailable} <span className="text-xs font-normal text-indigo-600">ชิ้น</span></div>
              <div className="text-[11px] text-indigo-600 font-semibold mt-0.5">พร้อมส่งมอบทันที</div>
            </div>
          </div>

          {/* C. Two-Column Interactive Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Left Column: Leaflet Satellite Hybrid Map */}
            <div
              className={`bg-white rounded-2xl p-4 shadow-xs border border-slate-200 space-y-3 transition-all ${
                isOverviewMapFullscreen ? 'fixed inset-4 z-40 overflow-hidden flex flex-col' : 'lg:col-span-7'
              }`}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-teal-100 text-teal-800 rounded-lg">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                      แผนที่ดาวเทียม / GIS จุดพิกัดผู้ขอยืม & เส้นทางนำส่งอุปกรณ์
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      จุดบริการ: <strong>ทต.บางเป้า (เริ่มต้น)</strong> • แสดงหมุด: <strong>
                        {mapPinStatusFilter === 'all'
                          ? `ทั้งหมด (${filteredLoans.length} จุด)`
                          : mapPinStatusFilter === 'borrowed'
                          ? `ยืมใช้งานอยู่ (${activeBorrowedCount} จุด)`
                          : mapPinStatusFilter === 'returned'
                          ? `ส่งคืนแล้ว (${returnedCount} จุด)`
                          : `รอนำส่ง (${pendingDispatchCount} จุด)`}
                      </strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Map Pin Filter Dropdown */}
                  <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-teal-700" />
                    <label className="text-[11px] font-bold text-slate-700">กรองหมุด:</label>
                    <select
                      value={mapPinStatusFilter}
                      onChange={(e) => setMapPinStatusFilter(e.target.value as any)}
                      className="text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded px-1.5 py-0.5 cursor-pointer focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="all">📌 แสดงหมุดทั้งหมด ({filteredLoans.length} จุด)</option>
                      <option value="borrowed">🟢 เฉพาะที่ยืมใช้งานอยู่ ({activeBorrowedCount} จุด)</option>
                      <option value="returned">🟣 เฉพาะที่ส่งคืนแล้ว ({returnedCount} จุด)</option>
                      <option value="pending">🟡 เฉพาะที่รอนำส่ง ({pendingDispatchCount} จุด)</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowPinLabels(!showPinLabels)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                      showPinLabels ? 'bg-teal-50 text-teal-800 border-teal-300' : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    {showPinLabels ? 'ซ่อนชื่อบนหมุด' : 'แสดงชื่อบนหมุด'}
                  </button>
                  <button
                    type="button"
                    onClick={handleFitAllPins}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors cursor-pointer"
                  >
                    ดูครบทุกหมุด
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOverviewMapFullscreen(!isOverviewMapFullscreen)}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors cursor-pointer"
                    title={isOverviewMapFullscreen ? 'ย่อหน้าต่าง' : 'ขยายเต็มจอ'}
                  >
                    {isOverviewMapFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Status Chips Bar (Legend + Instant 1-click Filter) */}
              <div className="flex flex-wrap items-center gap-1.5 p-2 bg-gradient-to-r from-slate-50 to-teal-50/40 rounded-xl border border-slate-200 text-xs">
                <span className="font-extrabold text-slate-700 text-[11px] shrink-0 mr-1 flex items-center gap-1">
                  <SlidersHorizontal className="w-3 h-3 text-teal-700" />
                  <span>สถานะหมุด:</span>
                </span>

                <button
                  type="button"
                  onClick={() => setMapPinStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    mapPinStatusFilter === 'all'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  📌 ทั้งหมด ({filteredLoans.length})
                </button>

                <button
                  type="button"
                  onClick={() => setMapPinStatusFilter('borrowed')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1.5 ${
                    mapPinStatusFilter === 'borrowed'
                      ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-300'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white shrink-0"></span>
                  <span>🟢 ยืมใช้งานอยู่ ({activeBorrowedCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMapPinStatusFilter('returned')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1.5 ${
                    mapPinStatusFilter === 'returned'
                      ? 'bg-purple-600 text-white shadow-xs ring-2 ring-purple-300'
                      : 'bg-purple-50 text-purple-800 border border-purple-300 hover:bg-purple-100'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 border border-white shrink-0"></span>
                  <span>🟣 ส่งคืนแล้ว ({returnedCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMapPinStatusFilter('pending')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1.5 ${
                    mapPinStatusFilter === 'pending'
                      ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-300'
                      : 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-white shrink-0"></span>
                  <span>🟡 รอนำส่ง ({pendingDispatchCount})</span>
                </button>

                <div className="ml-auto text-[11px] text-sky-800 font-bold flex items-center gap-1 shrink-0 bg-sky-50 px-2 py-1 rounded-lg border border-sky-200">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-600 border border-white"></span>
                  <span>🏢 ศูนย์ ทต.บางเป้า</span>
                </div>
              </div>

              {/* Mini Queue Flow Pill Ribbon */}
              <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2 overflow-x-auto text-[11px] font-semibold text-slate-700">
                <span className="shrink-0 px-2 py-0.5 rounded-md bg-teal-800 text-white font-extrabold text-[10px]">
                  สรุปลำดับคิวส่ง ({orderedSelectedLoans.length} จุด)
                </span>
                <span className="shrink-0 text-slate-400">🏢 ทต.บางเป้า</span>
                {orderedSelectedLoans.map((l, i) => (
                  <React.Fragment key={l.id}>
                    <span className="text-slate-400 shrink-0">➔</span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveLoanPin(l);
                        if (overviewMapInstanceRef.current) {
                          overviewMapInstanceRef.current.setView([Number(l.latitude), Number(l.longitude)], 17);
                          const m = overviewMarkerMapRef.current[l.id];
                          if (m) m.openPopup();
                        }
                      }}
                      className="shrink-0 px-2 py-0.5 rounded-md bg-white hover:bg-teal-50 border border-slate-300 hover:border-teal-400 text-slate-800 cursor-pointer flex items-center gap-1"
                    >
                      <span className="text-teal-700 font-black">#{i + 1}</span>
                      <span>ม.{l.moo} {(l.patientName || '').split(' ')[0]}</span>
                    </button>
                  </React.Fragment>
                ))}
              </div>

              {/* Map Leaflet Container */}
              <div
                className={`relative z-0 isolate w-full rounded-xl border border-slate-300 overflow-hidden shadow-inner bg-slate-100 ${
                  isOverviewMapFullscreen ? 'flex-1 min-h-[420px]' : 'h-[420px] sm:h-[480px] lg:h-[520px]'
                }`}
              >
                <div ref={overviewMapContainerRef} className="w-full h-full" style={{ width: '100%', height: '100%' }} />
              </div>

              {/* Selected Pin Quick Card below Map */}
              {activeLoanPin && (
                <div
                  className={`p-3.5 rounded-xl text-xs space-y-2 border transition-all ${
                    activeLoanPin.status === 'borrowed'
                      ? 'bg-emerald-50/95 border-emerald-300 shadow-xs'
                      : activeLoanPin.status === 'returned'
                      ? 'bg-purple-50/95 border-purple-300 shadow-xs'
                      : 'bg-amber-50/95 border-amber-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-teal-800 text-white font-bold text-[11px]">
                        หมู่ที่ {activeLoanPin.moo} {BANGPAO_VILLAGES[activeLoanPin.moo || '1'] || ''}
                      </span>
                      <span className="font-extrabold text-slate-900 text-sm">
                        {activeLoanPin.patientName}
                      </span>
                      {activeLoanPin.status === 'borrowed' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>🟢 ยืมใช้งานอยู่</span>
                        </span>
                      ) : activeLoanPin.status === 'returned' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-300 inline-flex items-center gap-1">
                          <span>🔄 ส่งคืนแล้ว</span>
                          {activeLoanPin.returnCondition && (
                            <span className="text-[9px] text-purple-700 bg-purple-200/70 px-1 rounded font-bold">
                              {activeLoanPin.returnCondition === 'complete' ? 'อุปกรณ์ครบ' : 'ชำรุด'}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                          ⏳ รอส่งมอบ
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-slate-500">
                        สัญญา: {activeLoanPin.contractNumber || activeLoanPin.loanCode || '-'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveLoanPin(null)}
                        className="text-slate-400 hover:text-slate-600 p-0.5 rounded font-black text-xs cursor-pointer"
                        title="ปิดการ์ดสรุป"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-slate-700">
                    <div>
                      🦼 อุปกรณ์: <strong className="text-teal-900">{activeLoanPin.equipmentName}</strong>
                    </div>
                    <div>
                      👤 ผู้ขอยืม: <strong>{activeLoanPin.borrowerName}</strong> ({activeLoanPin.relationshipWithPatient || activeLoanPin.borrowerRelation || 'ญาติ'})
                    </div>
                    <div>
                      📍 ที่อยู่: <strong>{activeLoanPin.address || activeLoanPin.borrowerAddress || '-'}</strong>
                    </div>
                    <div className="font-mono text-teal-800">
                      พิกัด GPS: <strong>{Number(activeLoanPin.latitude).toFixed(6)}, {Number(activeLoanPin.longitude).toFixed(6)}</strong>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPrintModalLoan(activeLoanPin)}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 text-teal-900 border border-teal-300 rounded-lg font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                      >
                        <Printer className="w-3.5 h-3.5 text-teal-700" />
                        <span>📄 พิมพ์สัญญา A4 2 หน้า</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          exportOfficialMedicalLoanDocx(activeLoanPin, savedSignerSettings || DEFAULT_SIGNER_SETTINGS);
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 text-blue-900 border border-blue-300 rounded-lg font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                        title="ส่งออกเอกสารราชการเป็นไฟล์ Microsoft Word (.docx ตรงตามแม่แบบ 100%)"
                      >
                        <Download className="w-3.5 h-3.5 text-blue-700" />
                        <span>📝 ส่งออก Word (.docx)</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${activeLoanPin.latitude},${activeLoanPin.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold flex items-center gap-1 shadow-2xs text-xs"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>นำทาง Google Maps</span>
                      </a>
                      {activeLoanPin.status === 'borrowed' && (
                        <button
                          type="button"
                          onClick={() => setReturnModalLoan(activeLoanPin)}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer shadow-2xs text-xs"
                        >
                          <Undo2 className="w-3.5 h-3.5" />
                          <span>📥 รับคืนอุปกรณ์</span>
                        </button>
                      )}
                      {activeLoanPin.status !== 'borrowed' && activeLoanPin.status !== 'returned' && (
                        <button
                          type="button"
                          onClick={() => handleOpenAppointmentModal(activeLoanPin)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer shadow-2xs text-xs"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>🩺 บันทึกส่งมอบ</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Route Queue Planner */}
            <div className="lg:col-span-5 bg-white rounded-2xl p-4 shadow-xs border border-slate-200 space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-teal-700 shrink-0" />
                    <span>จัดลำดับแผนการส่งมอบ (เลือกบ้านก่อน-หลังอิสระ)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    คิวจัดรอบส่งมอบ — เลื่อนขึ้น-ลง, เปลี่ยนลำดับ # หรือลากสลับการ์ด
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-[11px] font-extrabold shrink-0">
                  ในคิว {orderedSelectedLoans.length} / {normalizedLoans.length} บ้าน
                </span>
              </div>

              {queueToastMsg && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-between">
                  <span>{queueToastMsg}</span>
                  <button type="button" onClick={() => setQueueToastMsg(null)} className="text-emerald-700 font-black px-1">
                    ✕
                  </button>
                </div>
              )}

              {/* Row 1: Unified Queue Ordering & Selection Toolbar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={clearQueueToPickInOrder}
                  className="flex items-center justify-center gap-1 px-2 py-1.5 font-bold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3 shrink-0" />
                  <span className="truncate">เลือกทีละบ้านใหม่</span>
                </button>

                <button
                  type="button"
                  onClick={autoSortNearestFromHq}
                  className="flex items-center justify-center gap-1 px-2 py-1.5 font-bold rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 shrink-0" />
                  <span className="truncate">เรียงใกล้สุด</span>
                </button>

                <button
                  type="button"
                  onClick={autoSortByMoo}
                  className="flex items-center justify-center px-2 py-1.5 font-bold rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-colors cursor-pointer"
                >
                  <span className="truncate">เรียง ม.1➔ม.7</span>
                </button>

                <button
                  type="button"
                  onClick={selectedStopIds.length === 0 ? selectOnlyPendingLoans : clearQueueToPickInOrder}
                  className="flex items-center justify-center px-2 py-1.5 font-bold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors cursor-pointer"
                >
                  <span className="truncate">
                    {selectedStopIds.length === 0 ? `ดึงรอส่งทั้งหมด (${pendingDispatchCount})` : `ล้างคิว (${orderedSelectedLoans.length})`}
                  </span>
                </button>
              </div>

              {/* Row 2: Action Toolbar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setIsRouteDrawn(!isRouteDrawn)}
                  disabled={orderedSelectedLoans.length === 0}
                  className={`py-2 px-2.5 rounded-xl font-extrabold text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    isRouteDrawn ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white'
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
                      <span className="truncate">วาดเส้นทางบนแผนที่</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => window.open(getGoogleMapsRouteUrl(), '_blank')}
                  disabled={orderedSelectedLoans.length === 0}
                  className="py-2 px-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-40 text-white font-extrabold text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <Navigation className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">นำทาง Google Maps</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(true)}
                  disabled={orderedSelectedLoans.length === 0}
                  className="py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-extrabold text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <Share2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">แชร์เส้นทางส่งของ</span>
                </button>
              </div>

              {/* Delivery Queue Cards List */}
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {orderedSelectedLoans.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                    <Truck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <div>ยังไม่มีบ้านในคิวนำส่ง</div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      กดปุ่ม <strong>"ดึงรอส่งทั้งหมด"</strong> หรือคลิกหมุดบนแผนที่เพื่อเพิ่มเข้าคิว
                    </div>
                  </div>
                ) : (
                  orderedSelectedLoans.map((loan, idx) => (
                    <div
                      key={loan.id}
                      className="p-3 rounded-xl border border-slate-200 bg-white hover:border-teal-400 hover:shadow-xs transition-all space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-teal-800 text-white text-xs font-black flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="font-extrabold text-slate-900 text-xs sm:text-sm">
                              {loan.patientName}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              หมู่ที่ {loan.moo} {BANGPAO_VILLAGES[loan.moo || '1'] || ''} • ผู้ยืม: {loan.borrowerName}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveQueueItem(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-20 text-slate-600 cursor-pointer"
                            title="เลื่อนขึ้น"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveQueueItem(idx, 'down')}
                            disabled={idx === orderedSelectedLoans.length - 1}
                            className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-20 text-slate-600 cursor-pointer"
                            title="เลื่อนลง"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveFromQueue(loan.id)}
                            className="p-1 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                            title="นำออกจากคิว"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] bg-slate-50 p-2 rounded-lg">
                        <span className="font-semibold text-teal-900 truncate">
                          🦼 {loan.equipmentName}
                        </span>
                        <span className="font-mono text-slate-600 shrink-0">
                          📞 {loan.phone || loan.borrowerPhone || '-'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
                        <button
                          type="button"
                          onClick={() => setPrintModalLoan(loan)}
                          className="text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Printer className="w-3 h-3" />
                          <span>สัญญา A4</span>
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveLoanPin(loan);
                              if (overviewMapInstanceRef.current) {
                                overviewMapInstanceRef.current.setView([Number(loan.latitude), Number(loan.longitude)], 17);
                                const m = overviewMarkerMapRef.current[loan.id];
                                if (m) m.openPopup();
                              }
                            }}
                            className="text-sky-700 hover:text-sky-900 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <MapPin className="w-3 h-3" />
                            <span>ดูบนแผนที่</span>
                          </button>
                          {loan.latitude && loan.longitude && (
                            <button
                              type="button"
                              onClick={() => {
                                window.open(
                                  `https://www.google.com/maps/dir/?api=1&destination=${loan.latitude},${loan.longitude}`,
                                  '_blank'
                                );
                              }}
                              className="text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1 cursor-pointer"
                              title="เปิด Google Maps นำทางพนักงานขับรถส่งของ"
                            >
                              <Navigation className="w-3 h-3 text-blue-600" />
                              <span>นำทาง</span>
                            </button>
                          )}
                          {loan.status !== 'borrowed' && (
                            <button
                              type="button"
                              onClick={() => handleOpenAppointmentModal(loan)}
                              className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold text-[11px] cursor-pointer"
                            >
                              ส่งมอบ
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* D. Data Table below Map */}
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Tab 1: Borrowed */}
                <button
                  type="button"
                  onClick={() => setTableTabMode('borrowed')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    tableTabMode === 'borrowed'
                      ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-300'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>🟢 ยืมใช้งานอยู่ ({activeBorrowedCount} ราย)</span>
                </button>

                {/* Tab 2: Returned */}
                <button
                  type="button"
                  onClick={() => setTableTabMode('returned')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    tableTabMode === 'returned'
                      ? 'bg-purple-600 text-white shadow-xs ring-2 ring-purple-300'
                      : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                  <span>🔄 ส่งคืนแล้ว ({returnedCount} ราย)</span>
                </button>

                {/* Tab: Online Requests */}
                <button
                  type="button"
                  onClick={() => setTableTabMode('online')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    tableTabMode === 'online'
                      ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-300'
                      : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                  <span>🌐 คำขอออนไลน์ ({onlineRequestsCount} ราย)</span>
                </button>

                {/* Tab 3: Delivery Queue */}
                <button
                  type="button"
                  onClick={() => setTableTabMode('queue')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    tableTabMode === 'queue'
                      ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-300'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>คิวจัดส่งอุปกรณ์ ({orderedSelectedLoans.length} ราย)</span>
                </button>

                {/* Tab 4: All */}
                <button
                  type="button"
                  onClick={() => setTableTabMode('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    tableTabMode === 'all'
                      ? 'bg-slate-800 text-white shadow-xs ring-2 ring-slate-400'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>📋 ทั้งหมด ({filteredLoans.length} ราย)</span>
                </button>
              </div>

              {/* Status Dropdown Selector on Table Header */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-300">
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  <label className="text-xs font-bold text-slate-600">กรองตาราง:</label>
                  <select
                    value={tableTabMode}
                    onChange={(e) => setTableTabMode(e.target.value as any)}
                    className="text-xs font-bold px-2 py-0.5 rounded border border-slate-200 bg-white text-slate-800 cursor-pointer focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="borrowed">🟢 เฉพาะที่ยืมใช้งานอยู่ ({activeBorrowedCount} ราย)</option>
                    <option value="online">🌐 คำขอออนไลน์รอตรวจสอบ ({onlineRequestsCount} ราย)</option>
                    <option value="returned">🔄 เฉพาะที่ส่งคืนแล้ว ({returnedCount} ราย)</option>
                    <option value="queue">🚗 เฉพาะในคิวจัดส่ง ({orderedSelectedLoans.length} ราย)</option>
                    <option value="all">📋 แสดงทั้งหมด ({filteredLoans.length} ราย)</option>
                  </select>
                </div>

                <div className="hidden xl:block text-xs text-slate-500">
                  คลิกปุ่ม <strong>"📄 สัญญา"</strong> หรือ <strong>"Word"</strong> เพื่อส่งออกเอกสาร
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-extrabold border-b border-slate-200">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">วันที่ขอยืม / สัญญา</th>
                    <th className="py-2.5 px-3">ข้อมูลผู้ป่วย (ผู้ใช้)</th>
                    <th className="py-2.5 px-3">ผู้ขอยืม & เบอร์โทร & พิกัด</th>
                    <th className="py-2.5 px-3">อุปกรณ์ที่ยืม</th>
                    <th className="py-2.5 px-3">กำหนดส่งคืน</th>
                    <th className="py-2.5 px-3">สถานะ</th>
                    <th className="py-2.5 px-3 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    const displayList =
                      tableTabMode === 'queue'
                        ? orderedSelectedLoans
                        : tableTabMode === 'borrowed'
                        ? filteredLoans.filter((l) => l.status === 'borrowed')
                        : tableTabMode === 'returned'
                        ? filteredLoans.filter((l) => l.status === 'returned')
                        : tableTabMode === 'online'
                        ? filteredLoans.filter((l) => l.isPublicCitizenRequest || l.status === 'pending')
                        : filteredLoans;

                    if (displayList.length === 0) {
                      return (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            {tableTabMode === 'borrowed'
                              ? 'ไม่พบรายการที่กำลังยืมใช้งานอยู่'
                              : tableTabMode === 'returned'
                              ? 'ไม่พบรายการที่ส่งคืนอุปกรณ์แล้ว'
                              : tableTabMode === 'queue'
                              ? 'ยังไม่มีรายการในคิวนำส่ง'
                              : tableTabMode === 'online'
                              ? 'ไม่มีคำขอขอยืมออนไลน์ที่รอตรวจสอบ'
                              : 'ไม่พบข้อมูลรายการขอยืมอุปกรณ์'}
                          </td>
                        </tr>
                      );
                    }
                    return displayList.map((loan, idx) => {
                      const isBorrowed = loan.status === 'borrowed';
                      const isReturned = loan.status === 'returned';
                      return (
                        <tr
                          key={loan.id}
                          className={`transition-colors ${
                            isBorrowed
                              ? 'hover:bg-emerald-50/70 bg-emerald-50/20'
                              : isReturned
                              ? 'hover:bg-purple-50/70 bg-purple-50/20'
                              : 'hover:bg-amber-50/70'
                          }`}
                        >
                          <td className="py-2.5 px-3 font-bold text-slate-400">{idx + 1}</td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">{formatThaiDate(loan.borrowDate || loan.loanDate || loan.createdAt)}</div>
                            <div className="text-[10px] font-mono text-teal-800">
                              {loan.contractNumber || loan.loanCode || loan.docNo || '-'}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-extrabold text-slate-900">{loan.patientName}</div>
                            <div className="text-[11px] text-slate-500">
                              {loan.patientDiagnosis || 'ผู้ป่วยพักฟื้นติดบ้าน'}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-800">
                              {loan.borrowerName} <span className="text-[10px] text-slate-500">({loan.relationshipWithPatient || loan.borrowerRelation || 'ญาติ'})</span>
                            </div>
                            <div className="text-[11px] text-slate-600">
                              📞 {loan.phone || loan.borrowerPhone || '-'} • ม.{loan.moo}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveLoanPin(loan);
                                if (overviewMapInstanceRef.current) {
                                  overviewMapInstanceRef.current.setView([Number(loan.latitude), Number(loan.longitude)], 17);
                                  const m = overviewMarkerMapRef.current[loan.id];
                                  if (m) m.openPopup();
                                }
                              }}
                              className="text-[10px] font-mono text-teal-700 hover:text-teal-900 hover:underline cursor-pointer flex items-center gap-0.5 mt-0.5"
                              title="คลิกเพื่อเลื่อนแผนที่ไปยังบ้านหลังนี้"
                            >
                              📍 {Number(loan.latitude).toFixed(4)}, {Number(loan.longitude).toFixed(4)}
                            </button>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-teal-900">{loan.equipmentName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              รหัส: {loan.equipmentCode || '-'}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-600">
                            {formatThaiDate(loan.dueDate)}
                          </td>
                          <td className="py-2.5 px-3">
                            {isBorrowed ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1 shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span>🟢 ยืมใช้งานอยู่</span>
                              </span>
                            ) : isReturned ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-300 inline-flex items-center gap-1 shadow-2xs">
                                <span>🔄 ส่งคืนแล้ว</span>
                                {loan.returnCondition === 'damaged' && (
                                  <span className="text-[9px] text-rose-700 bg-rose-100 px-1 rounded font-bold">ชำรุด</span>
                                )}
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1 shadow-2xs">
                                <span>⏳ รอส่งมอบ</span>
                              </span>
                            )}
                            {loan.isPublicCitizenRequest && (
                              <div className="mt-1">
                                <span className="px-2 py-0.5 rounded text-[9px] font-black bg-indigo-100 text-indigo-800 border border-indigo-200 inline-flex items-center gap-1">
                                  🌐 ยื่นออนไลน์
                                </span>
                              </div>
                            )}
                          </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {loan.status === 'borrowed' ? (
                              <button
                                type="button"
                                onClick={() => setReturnModalLoan(loan)}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-md font-bold text-[11px] cursor-pointer"
                              >
                                รับคืน
                              </button>
                            ) : loan.status !== 'returned' ? (
                              <button
                                type="button"
                                onClick={() => handleOpenAppointmentModal(loan)}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold text-[11px] cursor-pointer shadow-2xs"
                              >
                                ส่งมอบ
                              </button>
                            ) : null}

                            {loan.latitude && loan.longitude && (
                              <button
                                type="button"
                                onClick={() => {
                                  window.open(
                                    `https://www.google.com/maps/dir/?api=1&destination=${loan.latitude},${loan.longitude}`,
                                    '_blank'
                                  );
                                }}
                                className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-md font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                title="เปิด Google Maps นำทางพนักงานขับรถส่งของไปยังบ้านผู้ป่วย"
                              >
                                <Navigation className="w-3 h-3 text-blue-600" />
                                <span>นำทาง</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setPrintModalLoan(loan)}
                              className="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 rounded-md font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                            >
                              <Printer className="w-3 h-3 text-teal-700" />
                              <span>สัญญา</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                exportOfficialMedicalLoanDocx(loan, savedSignerSettings || DEFAULT_SIGNER_SETTINGS);
                              }}
                              className="p-1 bg-slate-50 hover:bg-slate-100 text-blue-700 border border-slate-200 rounded-md cursor-pointer"
                              title="ส่งออก Word (.docx ตรงตามแม่แบบ 100%)"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            {onDeleteLoan && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`คุณต้องการลบคำขอยืมของ "${loan.patientName}" หรือไม่?`)) {
                                    onDeleteLoan(loan.id);
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer"
                                title="ลบรายการ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. SUBTAB: 'register' (4-STEP REGISTRATION WIZARD MATCHING SCREENSHOTS) */}
      {subTab === 'register' && (
        <div className="space-y-4 w-full">
          {formError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold flex items-center justify-between shadow-xs">
              <span className="flex items-center gap-2">
                <span>⚠️</span>
                <span>{formError}</span>
              </span>
              <button type="button" onClick={() => setFormError(null)} className="text-rose-600 font-black px-1.5 hover:bg-rose-100 rounded cursor-pointer">
                ✕
              </button>
            </div>
          )}

          {/* Unified 2-Column Registration (Borrower Form on Left & Equipment + GPS + Satellite Map on Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column: Form Fields (lg:col-span-5 matching LTC) */}
              <div className="lg:col-span-5 bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                        <span>📝 ขั้นตอนที่ 1: ข้อมูลบุคคล (ผู้ขอยืม & ผู้ป่วย)</span>
                      </h2>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        กรอกข้อมูลผู้ยื่นคำขอ ผู้ป่วย และปักหมุดพิกัดสถานที่จัดส่ง/ติดตั้งอุปกรณ์
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSubTab('route')}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs cursor-pointer shrink-0"
                    >
                      ➔ กลับหน้าติดตาม
                    </button>
                  </div>

                  {/* Warning Banner matching screenshot Image 1 */}
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <div className="font-extrabold text-amber-950">
                        แจ้งเตือน: ตรวจสอบสถานะอุปกรณ์ในคลังก่อนยื่นคำขอ
                      </div>
                      <p className="text-[11px] text-amber-800">
                        ขณะนี้ในคลังมีอุปกรณ์พร้อมให้บริการ <strong>{totalAssetsAvailable}</strong> ชิ้น หากอุปกรณ์ที่ต้องการหมด สามารถเลือก <strong>"เข้าคิวจอง"</strong> ในขั้นตอนถัดไปได้ และเจ้าหน้าที่จะติดต่อกลับทันทีเมื่อมีอุปกรณ์พร้อมให้บริการ
                      </p>
                    </div>
                  </div>

                  {/* Card 1: ข้อมูลผู้ขอยืม */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center gap-2 text-teal-800 font-extrabold text-sm border-b border-slate-200/70 pb-2">
                      <User className="w-4 h-4 text-sky-600" />
                      <span>ข้อมูลผู้ขอยืม (ผู้ยื่นคำขอ / ผู้ดูแล)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">ชื่อ-สกุล ผู้ขอยืม *</label>
                        <input
                          type="text"
                          required
                          placeholder="เช่น นายดำ สุขเกษม"
                          value={borrowerForm.borrowerName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBorrowerForm((prev) => ({ ...prev, borrowerName: val }));
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          เบอร์โทรศัพท์ติดต่อ * <span className="text-teal-700 font-semibold">(10 หลัก)</span>
                        </label>
                        <input
                          type="tel"
                          required
                          maxLength={12}
                          placeholder="081-234-5678"
                          value={borrowerForm.borrowerPhone}
                          onChange={(e) => setBorrowerForm({ ...borrowerForm, borrowerPhone: formatPhone10(e.target.value) })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block font-bold text-slate-700 mb-1">
                          เลขบัตร ปชช. ผู้ขอยืม <span className="text-slate-400 font-semibold">(13 หลัก)</span>
                        </label>
                        <input
                          type="text"
                          maxLength={17}
                          placeholder="x-xxxx-xxxxx-xx-x"
                          value={borrowerForm.borrowerIdCard}
                          onChange={(e) => setBorrowerForm({ ...borrowerForm, borrowerIdCard: formatIdCard13(e.target.value) })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block font-bold text-slate-700 mb-1">บ้านเลขที่ / หมู่ / ซอย / ถนน (ผู้ขอยืม)</label>
                        <input
                          type="text"
                          placeholder="เช่น 45/1 หมู่ 1 บ้านชายวัด"
                          value={borrowerForm.borrowerAddress}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBorrowerForm((prev) => ({
                              ...prev,
                              borrowerAddress: val,
                              patientAddress: sameAddressChecked ? val : prev.patientAddress,
                            }));
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                      </div>

                      {/* Cascading Dropdown: จังหวัด (ผู้ขอยืม) */}
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">จังหวัด (ผู้ขอยืม)</label>
                        <select
                          value={borrowerForm.borrowerProvince}
                          onChange={(e) => {
                            const newProv = e.target.value;
                            setBorrowerForm((prev) => ({
                              ...prev,
                              borrowerProvince: newProv,
                              borrowerDistrict: '',
                              borrowerSubdistrict: '',
                              patientProvince: sameAddressChecked ? newProv : prev.patientProvince,
                              patientDistrict: sameAddressChecked ? '' : prev.patientDistrict,
                              patientSubdistrict: sameAddressChecked ? '' : prev.patientSubdistrict,
                            }));
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-teal-500 outline-none cursor-pointer"
                        >
                          <option value="">-- เลือกจังหวัด --</option>
                          {ALL_THAI_PROVINCES.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Cascading Dropdown: อำเภอ (ผู้ขอยืม) */}
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">อำเภอ (ผู้ขอยืม)</label>
                        <select
                          value={borrowerForm.borrowerDistrict}
                          disabled={!borrowerForm.borrowerProvince}
                          onChange={(e) => {
                            const newDist = e.target.value;
                            setBorrowerForm((prev) => ({
                              ...prev,
                              borrowerDistrict: newDist,
                              borrowerSubdistrict: '',
                              patientDistrict: sameAddressChecked ? newDist : prev.patientDistrict,
                              patientSubdistrict: sameAddressChecked ? '' : prev.patientSubdistrict,
                            }));
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-teal-500 outline-none cursor-pointer disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          <option value="">
                            {borrowerForm.borrowerProvince ? '-- เลือกอำเภอ --' : '-- กรุณาเลือกจังหวัดก่อน --'}
                          </option>
                          {borrowerForm.borrowerProvince && THAI_ADMIN_DIVISIONS[borrowerForm.borrowerProvince]
                            ? Object.keys(THAI_ADMIN_DIVISIONS[borrowerForm.borrowerProvince])
                                .sort((a, b) => a.localeCompare(b, 'th'))
                                .map((d) => (
                                  <option key={d} value={d}>
                                    {d}
                                  </option>
                                ))
                            : null}
                        </select>
                      </div>

                      {/* Cascading Dropdown: ตำบล (ผู้ขอยืม) */}
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">ตำบล (ผู้ขอยืม)</label>
                        <select
                          value={borrowerForm.borrowerSubdistrict}
                          disabled={!borrowerForm.borrowerDistrict}
                          onChange={(e) => {
                            const newSub = e.target.value;
                            setBorrowerForm((prev) => ({
                              ...prev,
                              borrowerSubdistrict: newSub,
                              patientSubdistrict: sameAddressChecked ? newSub : prev.patientSubdistrict,
                            }));
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-teal-500 outline-none cursor-pointer disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          <option value="">
                            {borrowerForm.borrowerDistrict ? '-- เลือกตำบล --' : '-- กรุณาเลือกอำเภอก่อน --'}
                          </option>
                          {borrowerForm.borrowerProvince &&
                          borrowerForm.borrowerDistrict &&
                          THAI_ADMIN_DIVISIONS[borrowerForm.borrowerProvince]?.[borrowerForm.borrowerDistrict]
                            ? [...THAI_ADMIN_DIVISIONS[borrowerForm.borrowerProvince][borrowerForm.borrowerDistrict]]
                                .sort((a, b) => a.localeCompare(b, 'th'))
                                .map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))
                            : null}
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">ความสัมพันธ์กับผู้ป่วย</label>
                        <select
                          value={borrowerForm.borrowerRelation}
                          onChange={(e) => setBorrowerForm({ ...borrowerForm, borrowerRelation: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-teal-500 outline-none cursor-pointer"
                        >
                          <option value="">-- เลือกความสัมพันธ์ --</option>
                          {BORROWER_RELATIONS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: ข้อมูลผู้ป่วย (ผู้ใช้งานอุปกรณ์) */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center gap-2 text-rose-800 font-extrabold text-sm border-b border-slate-200/70 pb-2">
                      <UserCheck className="w-4 h-4 text-rose-600" />
                      <span>ข้อมูลผู้ป่วย (ผู้ใช้งานอุปกรณ์)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">ชื่อ-สกุล ผู้ป่วย *</label>
                        <input
                          type="text"
                          required
                          placeholder="เช่น นายแดง สุขเกษม"
                          value={borrowerForm.patientName}
                          onChange={(e) => setBorrowerForm({ ...borrowerForm, patientName: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          เลขบัตรประจำตัวประชาชน (ผู้ป่วย) <span className="text-slate-400 font-semibold">(13 หลัก)</span>
                        </label>
                        <input
                          type="text"
                          maxLength={17}
                          placeholder="x-xxxx-xxxxx-xx-x"
                          value={borrowerForm.patientIdCard}
                          onChange={(e) => setBorrowerForm({ ...borrowerForm, patientIdCard: formatIdCard13(e.target.value) })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                      </div>

                      {/* Same Address Checkbox */}
                      <div className="sm:col-span-2 pt-1">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sameAddressChecked}
                            onChange={(e) => handleToggleSameAddress(e.target.checked)}
                            className="w-4 h-4 text-teal-600 rounded border-slate-300 cursor-pointer"
                          />
                          <span>ที่อยู่ผู้ป่วย (สถานที่ตั้งอุปกรณ์) เป็นที่อยู่เดียวกับผู้ขอยืม</span>
                        </label>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block font-bold text-slate-700 mb-1">บ้านเลขที่ / หมู่ / ซอย / ถนน (ผู้ป่วย)</label>
                        <input
                          type="text"
                          placeholder="เช่น 45/1 หมู่ 1 ต.บางเป้า อ.กันตัง จ.ตรัง"
                          disabled={sameAddressChecked}
                          value={sameAddressChecked ? borrowerForm.borrowerAddress : borrowerForm.patientAddress}
                          onChange={(e) => setBorrowerForm({ ...borrowerForm, patientAddress: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white disabled:bg-slate-100 disabled:text-slate-500 focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">หมู่ที่ (ต.บางเป้า) *</label>
                        <select
                          value={borrowerForm.moo}
                          onChange={(e) => handleMooChange(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold text-teal-900 focus:ring-2 focus:ring-teal-500 outline-none cursor-pointer"
                        >
                          <option value="">-- เลือกโซน/หมู่บ้าน --</option>
                          {Object.entries(BANGPAO_VILLAGES).map(([m, vName]) => (
                            <option key={m} value={m}>
                              หมู่ที่ {m} {vName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">กลุ่มภาวะพึ่งพิง (ADL)</label>
                        <select
                          value={borrowerForm.adlCategory || 'ติดเตียง'}
                          onChange={(e) => setBorrowerForm({ ...borrowerForm, adlCategory: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-bold text-teal-900 focus:ring-2 focus:ring-teal-500 outline-none cursor-pointer"
                        >
                          <option value="ติดเตียง">🔴 ติดเตียง (ADL 0-4 คะแนน)</option>
                          <option value="ติดบ้าน">🟡 ติดบ้าน (ADL 5-11 คะแนน)</option>
                          <option value="ติดสังคม">🟢 ติดสังคม (ADL 12+ คะแนน)</option>
                        </select>
                      </div>

                      {/* Cascading Dropdown: จังหวัด (ผู้ป่วย) */}
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">จังหวัด (ผู้ป่วย)</label>
                        <select
                          disabled={sameAddressChecked}
                          value={sameAddressChecked ? borrowerForm.borrowerProvince : borrowerForm.patientProvince}
                          onChange={(e) => {
                            const newProv = e.target.value;
                            setBorrowerForm((prev) => ({
                              ...prev,
                              patientProvince: newProv,
                              patientDistrict: '',
                              patientSubdistrict: '',
                            }));
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white disabled:bg-slate-100 disabled:text-slate-500 font-medium focus:ring-2 focus:ring-teal-500 outline-none cursor-pointer"
                        >
                          <option value="">-- เลือกจังหวัด --</option>
                          {ALL_THAI_PROVINCES.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Cascading Dropdown: อำเภอ (ผู้ป่วย) */}
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">อำเภอ (ผู้ป่วย)</label>
                        {(() => {
                          const activeProv = sameAddressChecked ? borrowerForm.borrowerProvince : borrowerForm.patientProvince;
                          const activeDist = sameAddressChecked ? borrowerForm.borrowerDistrict : borrowerForm.patientDistrict;
                          const districts = activeProv && THAI_ADMIN_DIVISIONS[activeProv]
                            ? Object.keys(THAI_ADMIN_DIVISIONS[activeProv]).sort((a, b) => a.localeCompare(b, 'th'))
                            : [];
                          return (
                            <select
                              disabled={sameAddressChecked || !activeProv}
                              value={activeDist}
                              onChange={(e) => {
                                const newDist = e.target.value;
                                setBorrowerForm((prev) => ({
                                  ...prev,
                                  patientDistrict: newDist,
                                  patientSubdistrict: '',
                                }));
                              }}
                              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white disabled:bg-slate-100 disabled:text-slate-500 font-medium focus:ring-2 focus:ring-teal-500 outline-none cursor-pointer"
                            >
                              <option value="">
                                {activeProv ? '-- เลือกอำเภอ --' : '-- กรุณาเลือกจังหวัดก่อน --'}
                              </option>
                              {districts.map((d) => (
                                <option key={d} value={d}>
                                  {d}
                                </option>
                              ))}
                            </select>
                          );
                        })()}
                      </div>

                      {/* Cascading Dropdown: ตำบล (ผู้ป่วย) */}
                      <div className="sm:col-span-2">
                        <label className="block font-bold text-slate-700 mb-1">ตำบล (ผู้ป่วย)</label>
                        {(() => {
                          const activeProv = sameAddressChecked ? borrowerForm.borrowerProvince : borrowerForm.patientProvince;
                          const activeDist = sameAddressChecked ? borrowerForm.borrowerDistrict : borrowerForm.patientDistrict;
                          const activeSub = sameAddressChecked ? borrowerForm.borrowerSubdistrict : borrowerForm.patientSubdistrict;
                          const subdistricts = activeProv && activeDist && THAI_ADMIN_DIVISIONS[activeProv]?.[activeDist]
                            ? [...THAI_ADMIN_DIVISIONS[activeProv][activeDist]].sort((a, b) => a.localeCompare(b, 'th'))
                            : [];
                          return (
                            <select
                              disabled={sameAddressChecked || !activeDist}
                              value={activeSub}
                              onChange={(e) => setBorrowerForm((prev) => ({ ...prev, patientSubdistrict: e.target.value }))}
                              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white disabled:bg-slate-100 disabled:text-slate-500 font-medium focus:ring-2 focus:ring-teal-500 outline-none cursor-pointer"
                            >
                              <option value="">
                                {activeDist ? '-- เลือกตำบล --' : '-- กรุณาเลือกอำเภอก่อน --'}
                              </option>
                              {subdistricts.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Step 1 Completion Notice */}
                  <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs flex items-center gap-2.5">
                    <span className="text-base shrink-0">👉</span>
                    <p className="text-[11px] leading-relaxed">
                      <strong>ขั้นตอนที่ 1 ข้อมูลบุคคลครบถ้วน:</strong> โปรดระบุพิกัดปักหมุดบ้านผู้ป่วย (ขั้นตอนที่ 2), เลือกอุปกรณ์ทางการแพทย์ (ขั้นตอนที่ 3), กำหนดระยะเวลายืม (ขั้นตอนที่ 4) และบันทึกข้อตกลง (ขั้นตอนที่ 5) ในคอลัมน์ด้านขวา ➔
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Steps 2 to 5 (lg:col-span-7 space-y-4) */}
              <div className="lg:col-span-7 space-y-4">
                {/* ------------------------------------------------------------- */}
                {/* ขั้นตอนที่ 2: เลือกพิกัด ปักหมุด บ้านที่อุปกรณ์ จะไปอยู่ */}
                {/* ------------------------------------------------------------- */}
                {/* 2A. กล่องระบุพิกัด (GPS Coordinates) */}
                <div className="bg-teal-50/70 border border-teal-200/90 rounded-2xl p-3.5 sm:p-4 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-bold text-teal-900 text-xs sm:text-sm flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-teal-700 shrink-0" />
                      <span>📍 ขั้นตอนที่ 2: พิกัดตำแหน่งบ้านผู้ป่วย (GPS Coordinates)</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleGetGps}
                      disabled={isFetchingGps}
                      className="flex items-center gap-1 px-3 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      <Crosshair className={`w-3.5 h-3.5 ${isFetchingGps ? 'animate-spin' : ''}`} />
                      <span>{isFetchingGps ? 'กำลังดึงพิกัด...' : '🎯 ตำแหน่งปัจจุบัน'}</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">ละติจูด (Latitude)</label>
                      <input
                        type="number"
                        step="0.000001"
                        value={borrowerForm.lat}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          updateRegMapPin(val, borrowerForm.lng, false);
                        }}
                        className="w-full p-2 border border-slate-300 rounded-lg font-mono text-xs bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                        placeholder="7.429578"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">ลองจิจูด (Longitude)</label>
                      <input
                        type="number"
                        step="0.000001"
                        value={borrowerForm.lng}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          updateRegMapPin(borrowerForm.lat, val, false);
                        }}
                        className="w-full p-2 border border-slate-300 rounded-lg font-mono text-xs bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                        placeholder="99.525737"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-teal-700">
                    💡 คลิกบนแผนที่ดาวเทียมด้านล่าง หรือลากหมุดสีแดงเพื่อระบุตำแหน่งบ้านผู้ป่วยได้อย่างแม่นยำ
                  </p>
                </div>

                {/* 2B. แผนที่ปักหมุดบ้าน (Google Satellite Hybrid Map) */}
                <div>
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
                        : 'bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-3'
                    }
                    style={isMapFullscreen ? { zIndex: 9999 } : undefined}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg shrink-0">🗺️</span>
                        <div className="min-w-0">
                          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                            แผนที่ปักหมุดบ้านผู้ป่วย (Google Satellite Map)
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            คลิกบนแผนที่หรือลากหมุดสีแดงเพื่อระบุตำแหน่งบ้านสำหรับจัดส่งและติดตั้งอุปกรณ์
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={handleGetGps}
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

                    {/* Map container with tailored height */}
                    <div
                      className={`relative z-0 isolate w-full rounded-xl border border-slate-300 overflow-hidden shadow-inner bg-slate-100 ${
                        isMapFullscreen
                          ? 'flex-1 min-h-[420px]'
                          : 'h-[320px] sm:h-[360px] lg:h-[380px]'
                      }`}
                      style={{
                        height: isMapFullscreen ? 'calc(100vh - 165px)' : undefined,
                        zIndex: 10,
                      }}
                    >
                      <div
                        ref={regMapContainerRef}
                        className="w-full h-full"
                        style={{ width: '100%', height: '100%', position: 'relative' }}
                      />
                    </div>

                    <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-slate-600 pt-1">
                      <div className="font-mono font-bold text-teal-800">
                        📍 พิกัดที่เลือก: {Number(borrowerForm.lat).toFixed(6)}, {Number(borrowerForm.lng).toFixed(6)}
                      </div>
                      <div className="text-[11px] text-teal-700 font-bold">
                        {borrowerForm.moo ? `หมู่ที่ ${borrowerForm.moo} ${BANGPAO_VILLAGES[borrowerForm.moo] || ''}` : ''}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ------------------------------------------------------------- */}
                {/* ขั้นตอนที่ 3: ระบบเลือกอุปกรณ์ทางการแพทย์ */}
                {/* ------------------------------------------------------------- */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-teal-100 text-teal-800 rounded-lg">
                        <ShoppingCart className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                          🛒 ขั้นตอนที่ 3: ระบบเลือกอุปกรณ์ทางการแพทย์ที่ต้องการยืม
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          เลือกอุปกรณ์จากดรอปดาวน์ และกดปุ่ม "+ เพิ่มรายการ" (สามารถเลือกได้หลายชิ้นในคำขอเดียว)
                        </p>
                      </div>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold flex items-center gap-1.5">
                      <span>เลือกแล้ว</span>
                      <span className="font-extrabold bg-teal-700 text-white px-1.5 py-0.2 rounded-full text-[11px]">
                        {selectedEquipmentIds.length + queuedEquipmentIds.length}
                      </span>
                      <span>รายการ</span>
                    </div>
                  </div>

                  {/* Dropdown Selection Row */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1 min-w-0">
                      <select
                        value={selectedEquipmentToAdd}
                        onChange={(e) => setSelectedEquipmentToAdd(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white font-medium text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none cursor-pointer"
                      >
                        <option value="">-- เลือกอุปกรณ์ทางการแพทย์ที่ต้องการยืม --</option>
                        {equipmentList.map((eq) => {
                          const isAvail = eq.availableQuantity > 0;
                          return (
                            <option key={eq.id} value={eq.id}>
                              {eq.name} ({eq.assetCode}) — {isAvail ? `คงเหลือ ${eq.availableQuantity} ชิ้น (พร้อมจ่าย)` : '❌ หมดในคลัง (เข้าคิวจอง)'}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddEquipmentToList}
                      className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95 shrink-0 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ เพิ่มรายการ</span>
                    </button>
                  </div>

                  {/* Multi-item Chosen Equipment List */}
                  <div className="space-y-2 pt-1">
                    <div className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
                      <span>รายการอุปกรณ์ที่เลือกยืมในคำขอนี้:</span>
                      {(selectedEquipmentIds.length > 0 || queuedEquipmentIds.length > 0) && (
                        <span className="text-[10px] text-slate-400">
                          พร้อมจ่าย {selectedEquipmentIds.length} รายการ • คิวจอง {queuedEquipmentIds.length} รายการ
                        </span>
                      )}
                    </div>

                    {selectedEquipmentIds.length === 0 && queuedEquipmentIds.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 text-center text-slate-400 text-xs">
                        📦 ยังไม่ได้เลือกอุปกรณ์ — กรุณาเลือกจากดรอปดาวน์ด้านบนแล้วกดปุ่ม <strong className="text-teal-700">"+ เพิ่มรายการ"</strong>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {selectedEquipmentIds.map((id) => {
                          const eq = equipmentList.find((e) => e.id === id);
                          if (!eq) return null;
                          return (
                            <div
                              key={id}
                              className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-300 text-xs gap-3 hover:bg-emerald-50 transition-colors"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                                <div className="min-w-0">
                                  <div className="font-extrabold text-slate-900 truncate text-xs sm:text-sm">
                                    {eq.name}
                                  </div>
                                  <div className="font-mono text-[11px] text-emerald-800 flex items-center gap-2 flex-wrap">
                                    <span className="font-bold">{eq.assetCode}</span>
                                    <span>•</span>
                                    <span>{eq.category}</span>
                                    <span className="font-extrabold px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px]">
                                      🟢 พร้อมจ่ายทันที
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveEquipment(id)}
                                className="px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-100 font-bold text-xs cursor-pointer transition-colors shrink-0"
                                title="ลบรายการนี้"
                              >
                                🗑️ ลบ
                              </button>
                            </div>
                          );
                        })}

                        {queuedEquipmentIds.map((id) => {
                          const eq = equipmentList.find((e) => e.id === id);
                          if (!eq) return null;
                          return (
                            <div
                              key={id}
                              className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/80 border border-amber-300 text-xs gap-3 hover:bg-amber-50 transition-colors"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                                <div className="min-w-0">
                                  <div className="font-extrabold text-slate-900 truncate text-xs sm:text-sm">
                                    {eq.name}
                                  </div>
                                  <div className="font-mono text-[11px] text-amber-900 flex items-center gap-2 flex-wrap">
                                    <span className="font-bold">{eq.assetCode}</span>
                                    <span>•</span>
                                    <span>{eq.category}</span>
                                    <span className="font-extrabold px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-[10px]">
                                      🟡 เข้าคิวจองล่วงหน้า
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveEquipment(id)}
                                className="px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-100 font-bold text-xs cursor-pointer transition-colors shrink-0"
                                title="ลบรายการนี้"
                              >
                                🗑️ ลบ
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* ------------------------------------------------------------- */}
                {/* ขั้นตอนที่ 4: กำหนดรูปแบบและระยะเวลาการยืม (ตามภาพ 1) */}
                {/* ------------------------------------------------------------- */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center gap-2 text-slate-800 font-extrabold text-sm border-b border-slate-100 pb-2">
                    <Calendar className="w-4 h-4 text-teal-700" />
                    <span>📅 ขั้นตอนที่ 4: กำหนดรูปแบบและระยะเวลาการยืม</span>
                  </div>

                  <div className="space-y-2.5">
                    {/* Option 1: Open-ended */}
                    <div
                      onClick={() => setLoanDurationType('open_ended')}
                      className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-2.5 ${
                        loanDurationType === 'open_ended'
                          ? 'border-sky-500 bg-sky-50/40 ring-1 ring-sky-200'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="loanType"
                        checked={loanDurationType === 'open_ended'}
                        onChange={() => setLoanDurationType('open_ended')}
                        className="w-4 h-4 text-sky-600 mt-0.5 cursor-pointer"
                      />
                      <div className="space-y-0.5">
                        <div className="font-extrabold text-slate-900 text-xs sm:text-sm">
                          ยืมระยะยาวไร้กำหนดคืน (Open-ended)
                        </div>
                        <p className="text-[11px] text-slate-500">
                          สำหรับเตียงผู้ป่วย เครื่องผลิตออกซิเจน ที่นอนลม (ประเมินอาการตามรอบโดยทีม LTC)
                        </p>
                      </div>
                    </div>

                    {/* Option 2: Fixed-term */}
                    <div
                      onClick={() => setLoanDurationType('fixed_term')}
                      className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-2.5 ${
                        loanDurationType === 'fixed_term'
                          ? 'border-sky-500 bg-sky-50/40 ring-1 ring-sky-200'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="loanType"
                        checked={loanDurationType === 'fixed_term'}
                        onChange={() => setLoanDurationType('fixed_term')}
                        className="w-4 h-4 text-sky-600 mt-0.5 cursor-pointer"
                      />
                      <div className="space-y-1 flex-1">
                        <div className="font-extrabold text-slate-900 text-xs sm:text-sm">
                          ยืมระยะสั้นกำหนดวันคืน (Fixed-term)
                        </div>
                        <p className="text-[11px] text-slate-500">
                          สำหรับการฟื้นฟูชั่วคราว เช่น รถเข็น ไม้เท้า ไม้ค้ำยัน
                        </p>

                        {loanDurationType === 'fixed_term' && (
                          <div className="pt-1.5 flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-bold text-slate-700">กำหนดวันคืน:</span>
                            <input
                              type="date"
                              value={fixedReturnDate}
                              onChange={(e) => setFixedReturnDate(e.target.value)}
                              className="px-2.5 py-1 border border-slate-300 rounded-lg bg-white font-semibold text-slate-800 text-xs"
                            />
                            <div className="flex gap-1">
                              {[1, 3, 6].map((m) => (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    setLoanFixedMonths(m);
                                    const d = new Date();
                                    d.setMonth(d.getMonth() + m);
                                    setFixedReturnDate(d.toISOString().split('T')[0]);
                                  }}
                                  className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors ${
                                    loanFixedMonths === m
                                      ? 'bg-sky-600 text-white border-sky-600'
                                      : 'bg-slate-100 text-slate-700 border-slate-300'
                                  }`}
                                >
                                  {m} ด.
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Purpose / Notes */}
                  <div className="pt-2 text-xs">
                    <label className="block font-bold text-slate-700 mb-1">
                      วัตถุประสงค์และความจำเป็นในการยืมอุปกรณ์:
                    </label>
                    <input
                      type="text"
                      value={borrowerForm.reason}
                      onChange={(e) => setBorrowerForm({ ...borrowerForm, reason: e.target.value })}
                      placeholder="เช่น เพื่อใช้ฟื้นฟูสมรรถภาพร่างกายที่บ้านต่อเนื่อง"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                {/* ------------------------------------------------------------- */}
                {/* ขั้นตอนที่ 5: บันทึกข้อตกลง & ยื่นคำขอ (ตามภาพ 1) */}
                {/* ------------------------------------------------------------- */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3 text-xs text-slate-700">
                  <div className="flex items-center gap-2 text-slate-800 font-extrabold text-sm border-b border-slate-100 pb-2">
                    <FileText className="w-4 h-4 text-teal-700" />
                    <span>📜 ขั้นตอนที่ 5: ข้อตกลง เกี่ยวกับการยืมอุปกรณ์เครื่องช่วยความพิการฟื้นฟูสมรรถภาพที่บ้าน</span>
                  </div>

                  <ol className="list-decimal list-outside pl-4 space-y-1.5 text-slate-600 leading-relaxed text-[11px]">
                    <li>
                      เมื่อผู้ยื่นคำร้องขอยืม ได้ยืมอุปกรณ์ไปแล้ว ผู้ยืมจะต้องจัดซื้อวัสดุสิ้นเปลืองเพื่อประกอบการใช้งานอุปกรณ์ด้วยตนเอง อาทิ สายดูดเสมหะ สายออกซิเจน น้ำกลั่น ฯลฯ
                    </li>
                    <li>
                      ระหว่างการใช้อุปกรณ์ฯ ผู้ป่วยหรือผู้ยื่นคำร้องจะต้องรักษาความสะอาด และก่อนส่งคืนเทศบาลตำบลบางเป้า จะต้องทำความสะอาดอุปกรณ์ให้เรียบร้อย (กรณีเสียหายที่ไม่ใช่จากการเสื่อมสภาพตามปกติ ผู้ยืมจะต้องรับผิดชอบค่าเสียหายทั้งหมด)
                    </li>
                    <li>
                      หลังจากได้รับมอบอุปกรณ์ จะมีเจ้าหน้าที่ลงตรวจเยี่ยมติดตามอาการ เพื่อทำการประเมินกิจวัตรประจำวัน ADL เป็นระยะ
                    </li>
                    <li>
                      กรณีผู้ป่วยไม่มีความจำเป็นต้องใช้อุปกรณ์แล้ว ให้ส่งคืนอุปกรณ์ทั้งหมดแก่เทศบาลตำบลบางเป้าภายใน 7 วัน และห้ามส่งมอบอุปกรณ์ให้บุคคลอื่นต่อโดยไม่ได้รับอนุญาตโดยเด็ดขาด
                    </li>
                    <li>
                      ห้ามทำการขีดฆ่า หรือลบ ทำลายเลขครุภัณฑ์ที่เขียนกำกับไว้ หรือสลับอุปกรณ์กับอุปกรณ์อื่นโดยเด็ดขาด
                    </li>
                  </ol>

                  {/* Consent Checkbox */}
                  <div className="pt-2 border-t border-slate-200">
                    <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-sky-50/70 border border-sky-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        className="w-4 h-4 text-teal-600 rounded border-slate-300 mt-0.5 cursor-pointer shrink-0"
                      />
                      <span className="text-[11px] font-bold text-sky-950 leading-relaxed">
                        ข้าพเจ้าได้อ่าน เข้าใจ ในรายละเอียด และยอมรับข้อตกลงข้างต้นแล้ว ขอรับรองว่าจะดูแลรักษาอุปกรณ์เป็นอย่างดี โดยหากมีความเสียหายใดๆ หรือสูญหายเกิดขึ้น ข้าพเจ้าจะขอรับผิดชอบทุกกรณี
                      </span>
                    </label>
                  </div>

                  {/* Submit Action Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleFinalSubmit}
                      className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
                    >
                      <Save className="w-4 h-4" />
                      <span>💾 บันทึกคำขอยืมอุปกรณ์ & พิมพ์สัญญา A4 ➔</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* ตารางสรุปด้านล่างเหมือนระบบแจกจ่าย (ตามภาพ 2) */}
            {/* ------------------------------------------------------------- */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-teal-100 text-teal-800 rounded-xl">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                        จัดการรายการคำขอยืมอุปกรณ์ & ติดตามกระบวนการ (อนุมัติ / สัญญา / ส่งมอบ)
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-xs font-extrabold">
                        {regTableSearch || regTableMooFilter !== 'all' || regTableStatusFilter !== 'all'
                          ? `พบ ${filteredRegLoans.length} จาก ${loans.length} รายการ`
                          : `ทั้งหมด ${loans.length} รายการ`}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      กระบวนการ: เสนออนุมัติ ➔ พิมพ์สัญญาทางการ A4 / ส่งออก Word ➔ นัดหมายส่งมอบถึงบ้าน ➔ ตรวจรับคืน
                    </p>
                  </div>
                </div>

                {/* Filter and Search Controls */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Moo Filter */}
                  <select
                    value={regTableMooFilter}
                    onChange={(e) => setRegTableMooFilter(e.target.value)}
                    className="px-2.5 py-2 border border-slate-300 rounded-xl text-xs bg-white font-medium text-slate-700 outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                  >
                    <option value="all">📍 ทุกหมู่บ้าน (ม.1 - ม.7)</option>
                    {Object.entries(BANGPAO_VILLAGES).map(([m, name]) => (
                      <option key={m} value={m}>
                        หมู่ {m} {name}
                      </option>
                    ))}
                  </select>

                  {/* Status Filter */}
                  <select
                    value={regTableStatusFilter}
                    onChange={(e) => setRegTableStatusFilter(e.target.value)}
                    className="px-2.5 py-2 border border-slate-300 rounded-xl text-xs bg-white font-medium text-slate-700 outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                  >
                    <option value="all">⚡ ทุกสถานะ</option>
                    <option value="pending">⏳ รอเสนอผู้บริหารลงนาม</option>
                    <option value="approved">✍️ อนุมัติแล้ว (รอนัดส่ง)</option>
                    <option value="borrowed">🟢 ยืมใช้งานอยู่ / ส่งมอบแล้ว</option>
                    <option value="returned">🔄 ส่งคืนเรียบร้อย</option>
                  </select>

                  {/* Search Input */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={regTableSearch}
                      onChange={(e) => setRegTableSearch(e.target.value)}
                      placeholder="ค้นหาชื่อ, เลขบัตร, อุปกรณ์..."
                      className="w-full pl-9 pr-8 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                    {regTableSearch && (
                      <button
                        type="button"
                        onClick={() => setRegTableSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                        title="ล้างคำค้นหา"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Responsive Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200/90 shadow-2xs bg-white">
                <table className="w-full text-left text-xs sm:text-[13px] min-w-[1050px] border-collapse">
                  <thead className="bg-slate-50/90 text-slate-700 font-extrabold border-b border-slate-200 text-xs tracking-wider select-none">
                    <tr>
                      <th className="py-3 px-3.5 w-[240px] min-w-[220px]">ผู้ป่วย & วันที่ยื่นคำขอ</th>
                      <th className="py-3 px-3 w-[150px] min-w-[140px] whitespace-nowrap">โซน/หมู่บ้าน</th>
                      <th className="py-3 px-4 min-w-[280px]">อุปกรณ์ที่ขอยืม & ครุภัณฑ์</th>
                      <th className="py-3 px-3.5 w-[220px] min-w-[200px]">ผู้ขอยืม, เบอร์โทร & พิกัด</th>
                      <th className="py-3 px-3.5 w-[230px] min-w-[210px] text-right whitespace-nowrap">สถานะ & จัดการกระบวนการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRegLoans.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 px-6 text-center text-slate-400">
                          <div className="text-2xl mb-1">🔍</div>
                          <div className="font-bold text-slate-600">ไม่พบรายการคำขอยืมตามเงื่อนไขที่เลือก</div>
                          <div className="text-xs text-slate-400 mt-1">ลองเปลี่ยนคำค้นหา หรือเลือกตัวกรองสถานะเป็น &ldquo;ทุกสถานะ&rdquo;</div>
                        </td>
                      </tr>
                    ) : (
                      filteredRegLoans.map((loan) => {
                        const mooNum = loan.moo ? String(loan.moo).trim() : '1';
                        const villageName = BANGPAO_VILLAGES[mooNum]
                          ? `หมู่ที่ ${mooNum} ${BANGPAO_VILLAGES[mooNum]}`
                          : `หมู่ที่ ${mooNum}`;
                        const isQueued = loan.notes?.includes('คิวจอง');
                        const latNum = Number(loan.latitude);
                        const lngNum = Number(loan.longitude);

                        return (
                          <tr key={loan.id} className="hover:bg-slate-50/80 transition-colors">
                            {/* 1. ผู้ป่วย & วันที่ยื่นคำขอ */}
                            <td className="py-3.5 px-3.5">
                              <div className="space-y-1">
                                <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80 whitespace-nowrap shadow-2xs">
                                  <Calendar className="w-3 h-3 text-teal-600 shrink-0" />
                                  <span>ยื่นคำขอ: {formatThaiDate(loan.borrowDate || loan.loanDate || loan.createdAt, true)}</span>
                                </div>

                                <div className="font-extrabold text-slate-900 text-sm whitespace-nowrap pt-0.5">
                                  {loan.patientName}
                                </div>

                                {(loan.patientIdCard || loan.patientNationalId) && (
                                  <div className="text-[11px] font-mono text-slate-500">
                                    🆔 {formatIdCard13(loan.patientIdCard || loan.patientNationalId)}
                                  </div>
                                )}

                                <div className="text-xs text-slate-500 leading-snug">
                                  {loan.address || loan.patientAddress || 'ต.บางเป้า อ.กันตัง จ.ตรัง'}
                                </div>

                                {loan.patientDiagnosis && (
                                  <div className="text-[11px] text-teal-700 font-medium">
                                    🩺 {loan.patientDiagnosis}
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* 2. โซน/หมู่บ้าน */}
                            <td className="py-3.5 px-3 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-teal-50 text-teal-900 border border-teal-200/80 font-bold text-xs whitespace-nowrap shadow-2xs">
                                {villageName}
                              </span>
                            </td>

                            {/* 3. อุปกรณ์ที่ขอยืม & ครุภัณฑ์ */}
                            <td className="py-3.5 px-4">
                              <div className="space-y-1">
                                <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2 flex-wrap">
                                  <span>{loan.equipmentName}</span>
                                  {isQueued ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                      🟡 เข้าคิวจอง
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                      🟢 พร้อมจ่าย
                                    </span>
                                  )}
                                </div>

                                <div className="font-mono text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                                  <span>รหัส: <strong>{loan.equipmentCode || loan.loanCode || '-'}</strong></span>
                                  <span>•</span>
                                  <span>สัญญา: <strong>{loan.contractNumber || loan.loanCode || '-'}</strong></span>
                                </div>

                                <div className="text-[11px] text-slate-600">
                                  {loan.dueDate?.includes('ตามอาการ') || loan.dueDate?.includes('ไร้กำหนดคืน') ? (
                                    <span className="text-sky-700 font-semibold">♾️ ยืมระยะยาว (ประเมินตามอาการ)</span>
                                  ) : (
                                    <span className="text-amber-800 font-semibold">⏱️ กำหนดคืน: {loan.dueDate}</span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* 4. ผู้ขอยืม, เบอร์โทร & พิกัด */}
                            <td className="py-3.5 px-3.5">
                              <div className="space-y-1">
                                <div className="font-extrabold text-slate-900 text-xs whitespace-nowrap">
                                  {loan.borrowerName || '-'}
                                  {loan.relationshipWithPatient || loan.borrowerRelation ? (
                                    <span className="text-slate-500 font-normal ml-1">
                                      ({loan.relationshipWithPatient || loan.borrowerRelation})
                                    </span>
                                  ) : null}
                                </div>

                                {(loan.borrowerPhone || loan.phone) ? (
                                  <div className="text-[11px] text-teal-700 font-mono font-bold flex items-center gap-1 whitespace-nowrap">
                                    <span>📞</span>
                                    <span>{formatPhone10(loan.borrowerPhone || loan.phone)}</span>
                                  </div>
                                ) : (
                                  <div className="text-[11px] text-slate-400">-</div>
                                )}

                                {!isNaN(latNum) && !isNaN(lngNum) && (
                                  <div className="pt-0.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        updateRegMapPin(latNum, lngNum, true);
                                        window.scrollTo({ top: 350, behavior: 'smooth' });
                                      }}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-slate-200 hover:border-teal-300 font-mono text-[11px] font-semibold whitespace-nowrap shadow-2xs cursor-pointer transition-colors"
                                      title="คลิกเพื่อปักหมุดและดูตำแหน่งบ้านบนแผนที่ด้านบน"
                                    >
                                      <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                                      <span>{latNum.toFixed(5)}, {lngNum.toFixed(5)}</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* 5. สถานะ & จัดการกระบวนการ */}
                            <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                              <div className="space-y-2">
                                <div className="flex justify-end">
                                  {(loan.notes || '').includes('ติดขัด') ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                      ⚠️ ติดขัดปัญหาหน้างาน
                                    </span>
                                  ) : loan.status === 'borrowed' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                      🟢 ส่งมอบแล้ว / ใช้งานอยู่
                                    </span>
                                  ) : loan.status === 'approved' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-300">
                                      ✍️ อนุมัติแล้ว (รอนัดส่ง)
                                    </span>
                                  ) : loan.status === 'returned' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
                                      🔄 ส่งคืนเรียบร้อย
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                      ⏳ รอเสนอผู้บริหารลงนาม
                                    </span>
                                  )}
                                </div>
                                {(loan.notes || '').includes('ติดขัด') && (
                                  <div className="text-[11px] text-rose-700 font-bold text-right max-w-[230px] ml-auto truncate" title={loan.notes}>
                                    {loan.notes}
                                  </div>
                                )}

                                {/* Action Buttons */}
                                <div className="inline-flex items-center justify-end gap-1.5 flex-wrap">
                                  {/* 1. ปุ่มอนุมัติ (ถ้ายังเป็น pending) */}
                                  {loan.status === 'pending' && onUpdateLoanStatus && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onUpdateLoanStatus(loan.id, 'approved');
                                      }}
                                      className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-extrabold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                      title="อนุมัติคำขอยืม"
                                    >
                                      <span>✍️</span>
                                      <span>อนุมัติ</span>
                                    </button>
                                  )}

                                  {/* 2. ปุ่มนัดส่งมอบ (ถ้า approved หรือ pending) */}
                                  {(loan.status === 'approved' || loan.status === 'pending') && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenAppointmentModal(loan)}
                                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                      title="บันทึกนัดหมายส่งมอบอุปกรณ์"
                                    >
                                      <Truck className="w-3.5 h-3.5" />
                                      <span>ส่งมอบ</span>
                                    </button>
                                  )}

                                  {/* 3. ปุ่มรับคืน (ถ้า borrowed) */}
                                  {loan.status === 'borrowed' && (
                                    <button
                                      type="button"
                                      onClick={() => setReturnModalLoan(loan)}
                                      className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-extrabold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                      title="ตรวจรับคืนอุปกรณ์เข้าคลัง"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                      <span>รับคืน</span>
                                    </button>
                                  )}

                                  {/* ปุ่มเปิด Google Maps นำทาง */}
                                   {loan.latitude && loan.longitude && (
                                     <button
                                       type="button"
                                       onClick={() => {
                                         window.open(
                                           `https://www.google.com/maps/dir/?api=1&destination=${loan.latitude},${loan.longitude}`,
                                           '_blank'
                                         );
                                       }}
                                       className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                       title="เปิด Google Maps นำทางพนักงานขับรถส่งของไปยังบ้านผู้ป่วย"
                                     >
                                       <Navigation className="w-3.5 h-3.5 text-blue-600" />
                                       <span>นำทาง</span>
                                     </button>
                                   )}

                                   {/* ปุ่มใบงานภาคสนาม (รับงาน / จบงาน / ติดขัด) */}
                                   <button
                                     type="button"
                                     onClick={() => {
                                       window.location.href = `/?job=${encodeURIComponent(loan.loanCode || loan.contractNumber || loan.id)}`;
                                     }}
                                     className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                     title="เปิดหน้าใบงานภาคสนามสำหรับเจ้าหน้าที่ (กดรับงาน / ปิดจบงาน / รายงานปัญหาติดขัดเข้ากลุ่ม LINE)"
                                   >
                                     <span>👷 แจ้งผลหน้างาน</span>
                                   </button>

                                   {/* 4. พิมพ์สัญญา A4 */}
                                  <button
                                    type="button"
                                    onClick={() => setPrintModalLoan(loan)}
                                    className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                    title="พิมพ์สัญญาทางการ 2 หน้า A4"
                                  >
                                    <Printer className="w-3.5 h-3.5 text-teal-700" />
                                    <span>สัญญา A4</span>
                                  </button>

                                  {/* 5. ส่งออก Word (.docx) */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      exportOfficialMedicalLoanDocx(loan, savedSignerSettings || DEFAULT_SIGNER_SETTINGS);
                                    }}
                                    className="px-2 py-1.5 bg-slate-50 hover:bg-slate-100 text-blue-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                    title="ส่งออกเอกสาร Word (.docx ตรงตามแม่แบบ 100%)"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Word</span>
                                  </button>

                                  {/* 6. ลบรายการ */}
                                  {onDeleteLoan && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (confirm(`คุณต้องการลบคำขอยืมของ "${loan.patientName}" หรือไม่?`)) {
                                          onDeleteLoan(loan.id);
                                        }
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                                      title="ลบคำขอนี้"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
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
          </div>
        )}

      {/* 4. SUBTAB: 'inventory' (MEDICAL EQUIPMENT WAREHOUSE - UNIT-LEVEL TRACKING) */}
      {subTab === 'inventory' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xs border border-slate-200">
            {/* Header & Main Actions */}
            <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-100 pb-4 mb-5">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-teal-700" />
                  <span>คลังอุปกรณ์และครุภัณฑ์การแพทย์ (ระบบติดตามรายชิ้น/รายทะเบียน)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  เทศบาลตำบลบางเป้า • ติดตามชัดเจนว่าอุปกรณ์แต่ละชิ้น <strong>เลขทะเบียนใด อยู่บ้านใคร</strong> ยี่ห้อ สภาพ และความพร้อมใช้งาน
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* View Mode Switcher */}
                <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setInvViewMode('grouped')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      invViewMode === 'grouped'
                        ? 'bg-white text-teal-800 shadow-xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="มุมมองแยกตามประเภทอุปกรณ์ เช่น เตียง 1 อยู่บ้านนายเอ, เตียง 2 นายบี, เตียง 3 ชำรุด..."
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>แยกตามประเภท ({equipmentList.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvViewMode('list')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      invViewMode === 'list'
                        ? 'bg-white text-teal-800 shadow-xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="มุมมองตารางรายการครุภัณฑ์ทุกชิ้นในคลัง"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>ตารางทุกชิ้น ({totalUnitsCount})</span>
                  </button>
                </div>

                {/* Add New Unit Button */}
                <button
                  type="button"
                  onClick={() => setIsAddUnitModalOpen(true)}
                  className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-transform"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ เพิ่มทะเบียนใหม่เข้าคลัง</span>
                </button>
              </div>
            </div>

            {/* Inventory KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <div
                onClick={() => setInvStatusFilter('all')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  invStatusFilter === 'all'
                    ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-300'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                }`}
              >
                <div className="text-xs text-slate-500 font-medium">ยอดครุภัณฑ์ทั้งหมด</div>
                <div className="text-xl font-black text-slate-900 mt-1">{totalUnitsCount} ชิ้น</div>
                <div className="text-[10px] text-slate-400 mt-0.5">ครบทุกเลขทะเบียน 7 หมวด</div>
              </div>

              <div
                onClick={() => setInvStatusFilter(invStatusFilter === 'available' ? 'all' : 'available')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  invStatusFilter === 'available'
                    ? 'bg-emerald-100 border-emerald-500 ring-2 ring-emerald-300'
                    : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100/60'
                }`}
              >
                <div className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>ว่างในคลัง (พร้อมจ่ายทันที)</span>
                </div>
                <div className="text-xl font-black text-emerald-800 mt-1">{availableUnitsCount} ชิ้น</div>
                <div className="text-[10px] text-emerald-600 mt-0.5">เก็บที่ห้องคลังกองสาธารณสุข</div>
              </div>

              <div
                onClick={() => setInvStatusFilter(invStatusFilter === 'borrowed' ? 'all' : 'borrowed')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  invStatusFilter === 'borrowed'
                    ? 'bg-sky-100 border-sky-500 ring-2 ring-sky-300'
                    : 'bg-sky-50 border-sky-200 hover:bg-sky-100/60'
                }`}
              >
                <div className="text-xs text-sky-700 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                  <span>ถูกยืมอยู่ (บ้านประชาชน)</span>
                </div>
                <div className="text-xl font-black text-sky-800 mt-1">{borrowedUnitsCount} ชิ้น</div>
                <div className="text-[10px] text-sky-600 mt-0.5">กระจายอยู่ใน ม.1 - ม.7</div>
              </div>

              <div
                onClick={() => setInvStatusFilter(invStatusFilter === 'maintenance' ? 'all' : 'maintenance')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  invStatusFilter === 'maintenance'
                    ? 'bg-amber-100 border-amber-500 ring-2 ring-amber-300'
                    : 'bg-amber-50 border-amber-200 hover:bg-amber-100/60'
                }`}
              >
                <div className="text-xs text-amber-700 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>ชำรุด / อยู่ระหว่างซ่อม</span>
                </div>
                <div className="text-xl font-black text-amber-800 mt-1">{maintenanceUnitsCount} ชิ้น</div>
                <div className="text-[10px] text-amber-600 mt-0.5">ห้องช่างบำรุงรักษา</div>
              </div>
            </div>

            {/* Smart Search & Multi-Filter Bar */}
            <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-200 mb-5 space-y-3">
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="ค้นหาเลขทะเบียน (เช่น BED-001), ยี่ห้อ/รุ่น, ชื่อผู้ป่วย, ผู้ยืม, หรือที่อยู่/หมู่..."
                    value={invSearchQuery}
                    onChange={(e) => setInvSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                  />
                  {invSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setInvSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Village / Moo Filter */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="text-xs text-slate-600 font-bold shrink-0">พิกัดบ้าน:</span>
                  <select
                    value={invMooFilter}
                    onChange={(e) => setInvMooFilter(e.target.value)}
                    className="py-2 px-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="all">ทุกหมู่ (ม.1 - ม.7)</option>
                    <option value="1">หมู่ 1 บ้านท่าส้ม</option>
                    <option value="2">หมู่ 2 บ้านทุ่งค่าย</option>
                    <option value="3">หมู่ 3 บ้านตลาดใหม่</option>
                    <option value="4">หมู่ 4 บ้านแหลมม่วง</option>
                    <option value="5">หมู่ 5 บ้านไร่ออก</option>
                    <option value="6">หมู่ 6 บ้านในลุ่ม</option>
                    <option value="7">หมู่ 7 บ้านควนทอง</option>
                  </select>
                </div>
              </div>

              {/* Category Pills & Status Filter */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
                {/* Category Pills */}
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-xs text-slate-500 font-bold mr-1">หมวดหมู่:</span>
                  {[
                    { id: 'all', label: 'ทั้งหมด' },
                    { id: 'bed', label: '🛏️ เตียงผู้ป่วย' },
                    { id: 'wheelchair', label: '♿ รถเข็นวีลแชร์' },
                    { id: 'oxygen', label: '💨 ผลิตออกซิเจน' },
                    { id: 'mattress', label: '🌊 ที่นอนลม' },
                    { id: 'suction', label: '🧪 ดูดเสมหะ' },
                    { id: 'walker', label: '🚶 โครงช่วยเดิน' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setInvCategoryFilter(cat.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        invCategoryFilter === cat.id
                          ? 'bg-teal-700 text-white shadow-2xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Status Toggle Pills */}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-500 font-bold mr-1">สถานะ:</span>
                  <button
                    type="button"
                    onClick={() => setInvStatusFilter('all')}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold cursor-pointer ${
                      invStatusFilter === 'all'
                        ? 'bg-slate-700 text-white'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    ทั้งหมด
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvStatusFilter('available')}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold cursor-pointer ${
                      invStatusFilter === 'available'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    🟢 ว่าง ({availableUnitsCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvStatusFilter('borrowed')}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold cursor-pointer ${
                      invStatusFilter === 'borrowed'
                        ? 'bg-sky-600 text-white'
                        : 'bg-sky-50 text-sky-700 border border-sky-200'
                    }`}
                  >
                    🔵 ถูกยืม ({borrowedUnitsCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvStatusFilter('maintenance')}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold cursor-pointer ${
                      invStatusFilter === 'maintenance'
                        ? 'bg-amber-600 text-white'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    🟠 ชำรุด ({maintenanceUnitsCount})
                  </button>
                </div>
              </div>
            </div>

            {/* Content View 1: MODE A - Grouped by Category (ตามที่ผู้ใช้ร้องขอ) */}
            {invViewMode === 'grouped' && (
              <div className="space-y-6">
                {groupedCategories
                  .filter((group) => {
                    if (invCategoryFilter !== 'all') {
                      if (invCategoryFilter === 'bed' && group.equipment.category !== 'bed') return false;
                      if (invCategoryFilter === 'wheelchair' && group.equipment.category !== 'wheelchair') return false;
                      if (invCategoryFilter === 'oxygen' && group.equipment.category !== 'oxygen_concentrator') return false;
                      if (invCategoryFilter === 'mattress' && group.equipment.category !== 'air_mattress') return false;
                      if (invCategoryFilter === 'suction' && group.equipment.category !== 'suction_machine') return false;
                      if (invCategoryFilter === 'walker' && group.equipment.category !== 'walker') return false;
                    }
                    return group.units.length > 0;
                  })
                  .map((group) => (
                    <div
                      key={group.equipment.id}
                      className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs"
                    >
                      {/* Category Header Bar */}
                      <div className="bg-gradient-to-r from-slate-50 to-teal-50/40 p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {group.equipment.imageUrl ? (
                            <img
                              src={group.equipment.imageUrl}
                              alt={group.equipment.name}
                              className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-xs"
                              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                              <Package className="w-6 h-6" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-black text-slate-900">
                                {group.equipment.name}
                              </h3>
                              <span className="font-mono text-xs font-bold text-teal-700 bg-teal-100/70 px-2 py-0.5 rounded">
                                {group.equipment.assetCode}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                              <span>จัดเก็บหลัก: {group.equipment.storageLocation}</span>
                            </div>
                          </div>
                        </div>

                        {/* Category Sub-counts */}
                        <div className="flex items-center gap-2 text-xs">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold border border-slate-200">
                            รวมทั้งหมด: <strong>{group.totalCount} ชิ้น</strong>
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                            🟢 ว่าง: <strong>{group.availCount}</strong>
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 font-bold border border-sky-200">
                            🔵 ถูกยืม: <strong>{group.borrowCount}</strong>
                          </span>
                          {group.maintCount > 0 && (
                            <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 font-bold border border-amber-200">
                              🟠 ชำรุด: <strong>{group.maintCount}</strong>
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingEquipment({ ...group.equipment });
                              setIsEditEquipModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-teal-700 hover:bg-white border border-transparent hover:border-slate-200 transition-colors"
                            title="แก้ไขข้อมูลหลักของประเภทนี้"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Individual Units Grid (ตรงตามที่ผู้ใช้ต้องการ: เตียง 1 นายเอ, เตียง 2 นายบี, เตียง 3 ชำรุด...) */}
                      <div className="p-4 bg-slate-50/40">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                          {group.units.map((u) => {
                            const isAvailable = u.resolvedStatus === 'available';
                            const isBorrowed = u.resolvedStatus === 'borrowed';
                            const isMaintenance = u.resolvedStatus === 'maintenance';

                            return (
                              <div
                                key={u.id}
                                className={`rounded-xl p-3.5 border transition-all flex flex-col justify-between ${
                                  isBorrowed
                                    ? 'bg-white border-sky-200 shadow-2xs hover:border-sky-400 ring-1 ring-sky-100'
                                    : isMaintenance
                                    ? 'bg-amber-50/50 border-amber-300 shadow-2xs'
                                    : 'bg-white border-emerald-200 shadow-2xs hover:border-emerald-400 ring-1 ring-emerald-100'
                                }`}
                              >
                                <div>
                                  {/* Unit Header: Asset Tag & Status Badge */}
                                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5 mb-2.5">
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                          🏷️ {u.assetCode}
                                        </span>
                                        {u.unitNumber && (
                                          <span className="text-xs font-extrabold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                                            ชิ้นที่ {u.unitNumber}
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[11px] font-bold text-slate-600 truncate max-w-[210px]" title={u.brandModel}>
                                        ยี่ห้อ/รุ่น: <span className="text-slate-800">{u.brandModel || 'มาตรฐาน'}</span>
                                      </div>
                                    </div>

                                    {/* Status Badge */}
                                    <div className="shrink-0 text-right">
                                      {isAvailable && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                          <span>ว่างพร้อมยืม</span>
                                        </span>
                                      )}
                                      {isBorrowed && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-100 text-sky-800 border border-sky-300 inline-flex items-center gap-1">
                                          <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                                          <span>ถูกยืมใช้งาน</span>
                                        </span>
                                      )}
                                      {isMaintenance && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1">
                                          <Wrench className="w-3 h-3 text-amber-600" />
                                          <span>ชำรุด/ซ่อม</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Middle Box: Condition & Custodian Location Details */}
                                  <div className="space-y-2 mb-3">
                                    {/* Condition Badge */}
                                    <div className="flex items-center justify-between text-[11px]">
                                      <span className="text-slate-500">สภาพความสมบูรณ์:</span>
                                      <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                                        u.condition === 'good'
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                          : u.condition === 'fair'
                                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                                      }`}>
                                        {u.condition === 'good' ? '✨ สมบูรณ์ 100%' : u.condition === 'fair' ? '👍 สภาพดี/พอใช้' : '⚠️ ชำรุดรอซ่อม'}
                                      </span>
                                    </div>

                                    {/* Detailed Location & Custodian Box */}
                                    {isBorrowed && (
                                      <div className="p-2.5 rounded-xl bg-sky-50/80 border border-sky-200 text-xs space-y-1.5">
                                        <div className="flex items-start gap-1.5 text-sky-950">
                                          <Home className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                                          <div className="leading-tight">
                                            <div className="font-black text-slate-900">
                                              อยู่บ้าน: {u.patientName}
                                            </div>
                                            <div className="text-[11px] text-sky-800 font-medium">
                                              ผู้ยืม: {u.borrowerName} • 📞 {u.phone}
                                            </div>
                                          </div>
                                        </div>

                                        <div className="text-[11px] text-slate-600 flex items-start gap-1 pl-5">
                                          <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                                          <span className="line-clamp-2">{u.address}</span>
                                        </div>

                                        <div className="text-[10px] text-slate-500 flex items-center justify-between border-t border-sky-100 pt-1 mt-1 pl-5">
                                          <span>ยืมเมื่อ: <strong>{formatThaiDate(u.borrowDate)}</strong></span>
                                          <span className="text-sky-700 font-bold">คืน: <strong>{formatThaiDate(u.dueDate)}</strong></span>
                                        </div>
                                      </div>
                                    )}

                                    {isAvailable && (
                                      <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-1">
                                        <div className="flex items-center gap-1.5 text-emerald-900 font-black">
                                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                          <span>อยู่ในคลังพร้อมจ่ายยืม</span>
                                        </div>
                                        <div className="text-[11px] text-emerald-800 pl-5">
                                          ที่เก็บ: <strong>{u.storageLocation}</strong>
                                        </div>
                                        {u.notes && (
                                          <div className="text-[10px] text-slate-500 pl-5 italic">
                                            หมายเหตุ: {u.notes}
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {isMaintenance && (
                                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-xs space-y-1">
                                        <div className="flex items-center gap-1.5 text-amber-950 font-black">
                                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                          <span>ชำรุดรอซ่อมบำรุง</span>
                                        </div>
                                        <div className="text-[11px] text-amber-900 pl-5 font-medium leading-relaxed">
                                          อาการ: <strong>{u.repairNotes || 'รอช่างตรวจเช็คอะไหล่'}</strong>
                                        </div>
                                        <div className="text-[10px] text-slate-500 pl-5">
                                          สถานที่: {u.storageLocation}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Unit Footer: Action Buttons */}
                                <div className="border-t border-slate-100 pt-2 flex items-center justify-between gap-1 text-xs">
                                  <div className="flex items-center gap-1">
                                    {isBorrowed && u.activeLoan && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => setPrintModalLoan(u.activeLoan!)}
                                          className="px-2 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                          title="ดูสัญญาการยืม A4"
                                        >
                                          <Printer className="w-3 h-3 text-teal-600" />
                                          <span>สัญญา A4</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setReturnModalLoan(u.activeLoan!)}
                                          className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                          title="บันทึกรับคืนอุปกรณ์นี้เข้าคลัง"
                                        >
                                          <RotateCcw className="w-3 h-3 text-amber-600" />
                                          <span>รับคืน</span>
                                        </button>
                                      </>
                                    )}

                                    {isAvailable && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedEquipmentIds([u.equipmentId]);
                                          setSubTab('register');
                                        }}
                                        className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                                        title="นำอุปกรณ์ชิ้นนี้ไปเปิดสัญญาจ่ายยืมให้ประชาชน"
                                      >
                                        <ShoppingCart className="w-3 h-3" />
                                        <span>จ่ายยืมชิ้นนี้</span>
                                      </button>
                                    )}

                                    {isMaintenance && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleUpdateUnit({
                                            ...u,
                                            status: 'available',
                                            condition: 'good',
                                            repairNotes: undefined,
                                          });
                                        }}
                                        className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                        title="ซ่อมบำรุงเสร็จแล้ว นำกลับเข้าคลังพร้อมจ่าย"
                                      >
                                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                                        <span>ซ่อมเสร็จ/เข้าคลัง</span>
                                      </button>
                                    )}
                                  </div>

                                  {/* Edit Unit Button */}
                                  <button
                                    type="button"
                                    onClick={() => setEditingUnit(u)}
                                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                    title="แก้ไขข้อมูลเลขทะเบียน สภาพ หรือเปลี่ยนผู้ถือครอง"
                                  >
                                    <Edit3 className="w-3 h-3 text-slate-500" />
                                    <span>แก้ไข</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}

                {groupedCategories.filter((g) => g.units.length > 0).length === 0 && (
                  <div className="py-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 space-y-2">
                    <Package className="w-10 h-10 mx-auto text-slate-300" />
                    <div className="font-bold text-slate-600 text-sm">ไม่พบอุปกรณ์ตามเงื่อนไขที่ค้นหา</div>
                    <div className="text-xs text-slate-400">ลองล้างตัวกรองหรือคำค้นหาด้านบน</div>
                  </div>
                )}
              </div>
            )}

            {/* Content View 2: MODE B - All Units Complete Data Table */}
            {invViewMode === 'list' && (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs text-slate-700 border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200">
                      <th className="py-3 px-3">#</th>
                      <th className="py-3 px-3">เลขทะเบียนครุภัณฑ์</th>
                      <th className="py-3 px-3">ชื่ออุปกรณ์</th>
                      <th className="py-3 px-3">ยี่ห้อ / รุ่น</th>
                      <th className="py-3 px-3 text-center">สถานะ</th>
                      <th className="py-3 px-3">สถานที่จัดเก็บ / อยู่บ้านใคร</th>
                      <th className="py-3 px-3 text-center">สภาพ</th>
                      <th className="py-3 px-3">ระยะเวลายืม-คืน</th>
                      <th className="py-3 px-3 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUnits.map((u, i) => {
                      const isAvailable = u.resolvedStatus === 'available';
                      const isBorrowed = u.resolvedStatus === 'borrowed';
                      const isMaintenance = u.resolvedStatus === 'maintenance';

                      return (
                        <tr key={u.id} className="hover:bg-teal-50/20 transition-colors">
                          <td className="py-2.5 px-3 text-slate-400 font-mono font-bold text-center">
                            {i + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-mono font-black text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 inline-block">
                              🏷️ {u.assetCode}
                            </div>
                            {u.unitNumber && (
                              <div className="text-[10px] text-slate-400 mt-0.5">ชิ้นที่ {u.unitNumber}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            <div>{u.name}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{u.category}</div>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-700">
                            <div>{u.brandModel || '-'}</div>
                            {u.serialNumber && (
                              <div className="text-[10px] text-slate-400 font-mono">S/N: {u.serialNumber}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isAvailable && (
                              <span className="px-2 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                🟢 ว่างในคลัง
                              </span>
                            )}
                            {isBorrowed && (
                              <span className="px-2 py-1 rounded-full text-[10px] font-black bg-sky-100 text-sky-800 border border-sky-300">
                                🔵 ถูกยืมอยู่
                              </span>
                            )}
                            {isMaintenance && (
                              <span className="px-2 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                                🟠 ชำรุด/ซ่อม
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            {isBorrowed ? (
                              <div className="space-y-0.5 max-w-xs">
                                <div className="font-bold text-slate-900 flex items-center gap-1">
                                  <Home className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                                  <span>อยู่บ้าน: {u.patientName}</span>
                                </div>
                                <div className="text-[11px] text-slate-600 truncate" title={u.address}>
                                  {u.address} {u.moo ? `(หมู่ ${u.moo})` : ''}
                                </div>
                                <div className="text-[10px] text-sky-700">
                                  ผู้ยืม: {u.borrowerName} • 📞 {u.phone}
                                </div>
                              </div>
                            ) : isMaintenance ? (
                              <div className="text-amber-900">
                                <div className="font-bold flex items-center gap-1">
                                  <Wrench className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span>ชำรุด: {u.repairNotes || 'รอส่งซ่อม'}</span>
                                </div>
                                <div className="text-[10px] text-slate-400">สถานที่: {u.storageLocation}</div>
                              </div>
                            ) : (
                              <div className="text-slate-600">
                                <div className="font-bold text-emerald-800 flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>อยู่ในคลังพร้อมจ่าย</span>
                                </div>
                                <div className="text-[11px] text-slate-500">{u.storageLocation}</div>
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              u.condition === 'good'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : u.condition === 'fair'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {u.condition === 'good' ? '✨ 100%' : u.condition === 'fair' ? '👍 สภาพดี' : '⚠️ ชำรุด'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 font-medium text-[11px]">
                            {isBorrowed ? (
                              <div>
                                <div>ยืม: {formatThaiDate(u.borrowDate)}</div>
                                <div className="text-sky-700 font-bold">คืน: {formatThaiDate(u.dueDate)}</div>
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {isBorrowed && u.activeLoan && (
                                <button
                                  type="button"
                                  onClick={() => setPrintModalLoan(u.activeLoan!)}
                                  className="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 cursor-pointer"
                                  title="ดูสัญญา A4"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setEditingUnit(u)}
                                className="px-2 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                                title="แก้ไขข้อมูลชิ้นนี้"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>แก้ไข</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. MODALS */}

      {/* A. Queue Confirmation Modal matching screenshot Image 3 */}
      {queueConfirmItem && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 rounded-full bg-sky-50 border-4 border-sky-100 text-sky-500 mx-auto flex items-center justify-center">
              <Info className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                ยืนยันการเข้าคิวจอง?
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                อุปกรณ์ชิ้นนี้กำลังถูกยืมหรือรอฆ่าเชื้อ หากคุณยืนยัน ระบบจะบันทึกเป็นคำขอ <strong>"เข้าคิว"</strong> ไว้
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleConfirmQueueItem}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs shadow-xs cursor-pointer"
              >
                ยืนยันเข้าคิว
              </button>
              <button
                type="button"
                onClick={() => setQueueConfirmItem(null)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs cursor-pointer"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Out of Stock Queue Confirmation Modal */}
      {queueConfirmItem && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-slate-900 text-base">
                  แจ้งเตือน: อุปกรณ์ไม่มีในคลังพร้อมจ่าย
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  อุปกรณ์ <strong className="text-slate-900">"{queueConfirmItem.name}"</strong> (รหัส <code>{queueConfirmItem.assetCode}</code>) ขณะนี้ไม่มีในสต็อกพร้อมจ่าย (ถูกยืม หรืออยู่ระหว่างบำรุงรักษา)
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <span>⏳</span>
                <span>ท่านต้องการ "เข้าคิวจองล่วงหน้า" หรือไม่?</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                หากยืนยัน ระบบจะบันทึกคำขอไว้ในคิวจองล่วงหน้า และเจ้าหน้าที่จะติดต่อกลับทันทีเมื่อมีอุปกรณ์หมุนเวียนกลับเข้าคลัง
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setQueueConfirmItem(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer transition-colors"
              >
                ✕ ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmQueueItem}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <span>✓ ยืนยันเข้าคิวจองล่วงหน้า</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* B. Print Loan Contract Modal (2 Pages Exact A4) */}
      <PrintEquipmentLoanModal
        loan={printModalLoan}
        isOpen={Boolean(printModalLoan)}
        onClose={() => setPrintModalLoan(null)}
        savedSignerSettings={savedSignerSettings}
      />

      {/* C. Share Route Modal for Driver / LINE Team */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-teal-700" />
                <span>แชร์เส้นทางนำส่งอุปกรณ์การแพทย์ ({orderedSelectedLoans.length} จุด)</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">ลิงก์ Google Maps นำทางต่อเนื่องหลายจุด:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getGoogleMapsRouteUrl()}
                    className="flex-1 p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-[11px] select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyRouteUrl}
                    className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-lg cursor-pointer shrink-0"
                  >
                    {isCopiedShareLink ? '✓ คัดลอกแล้ว' : 'คัดลอก'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ข้อความสรุปสำหรับส่งทาง LINE (รายชื่อผู้ป่วย, อุปกรณ์, เบอร์โทร, พิกัด):
                </label>
                <textarea
                  readOnly
                  rows={8}
                  value={buildShareableRouteSummaryText()}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-[11px] select-all"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={handleCopyFullRouteSummary}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer flex items-center gap-1.5"
              >
                <Copy className="w-4 h-4" />
                <span>{isCopiedRouteText ? '✓ คัดลอกข้อความแล้ว' : 'คัดลอกข้อความส่ง LINE'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* D. Share Citizen Public Request Form Modal */}
      {isShareCitizenFormOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 text-center">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-indigo-700" />
                <span>แชร์แบบฟอร์มขอยืมอุปกรณ์ให้ประชาชน</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsShareCitizenFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
              <div className="font-extrabold text-indigo-950 text-sm">
                ลิงก์สำหรับประชาชนขอยืมอุปกรณ์ออนไลน์
              </div>
              <p className="text-xs text-indigo-700">
                ประชาชนสามารถสแกน QR Code หรือกดลิงก์เพื่อกรอกข้อมูลผู้ป่วยและปักหมุดบ้านได้เอง
              </p>
            </div>

            <div className="py-2 flex justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`${window.location.origin}/?portal=citizen&tab=med_loan`)}`}
                alt="QR Code"
                className="w-44 h-44 rounded-xl border border-slate-200 shadow-xs"
              />
            </div>

            <div className="pt-2">
              <a
                href={`${window.location.origin}/?portal=citizen&tab=med_loan`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>เปิดดูหน้าจอที่ประชาชนจะเห็น (พรีวิว)</span>
              </a>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/?portal=citizen&tab=med_loan`}
                className="flex-1 p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono select-all"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/?portal=citizen&tab=med_loan`).then(() => {
                    setIsCopiedShareLink(true);
                    setTimeout(() => setIsCopiedShareLink(false), 3000);
                  });
                }}
                className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-lg text-xs cursor-pointer shrink-0"
              >
                {isCopiedShareLink ? '✓ คัดลอกแล้ว' : 'คัดลอกลิงก์'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* E. Delivery Appointment / Confirm Modal */}
      {appointmentLoan && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-700" />
                <span>บันทึกนำส่งมอบอุปกรณ์ถึงบ้านผู้ป่วย</span>
              </h3>
              <button
                type="button"
                onClick={() => setAppointmentLoan(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl text-xs space-y-1">
              <div>ผู้ป่วย: <strong className="text-emerald-950">{appointmentLoan.patientName}</strong></div>
              <div>อุปกรณ์: <strong className="text-emerald-900">{appointmentLoan.equipmentName}</strong></div>
              <div>ที่อยู่: {appointmentLoan.address || appointmentLoan.borrowerAddress || '-'}</div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">วันที่นำส่งมอบ</label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">เจ้าหน้าที่ผู้รับผิดชอบนำส่ง</label>
                <input
                  type="text"
                  value={deliveryStaff}
                  onChange={(e) => setDeliveryStaff(e.target.value)}
                  placeholder="ระบุชื่อเจ้าหน้าที่ผู้นำส่ง..."
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">บันทึกเพิ่มเติม</label>
                <input
                  type="text"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="ระบุบันทึกเพิ่มเติม (ถ้ามี)..."
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setAppointmentLoan(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDelivery(appointmentLoan)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer shadow-xs"
              >
                ยืนยันส่งมอบอุปกรณ์
              </button>
            </div>
          </div>
        </div>
      )}

      {/* F. Return Inspection Modal */}
      {returnModalLoan && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-700" />
                <span>บันทึกรับคืนอุปกรณ์ & ตรวจสอบสภาพ</span>
              </h3>
              <button
                type="button"
                onClick={() => setReturnModalLoan(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl text-xs space-y-1">
              <div>ผู้ป่วย: <strong className="text-amber-950">{returnModalLoan.patientName}</strong></div>
              <div>อุปกรณ์: <strong className="text-amber-900">{returnModalLoan.equipmentName}</strong></div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">สภาพอุปกรณ์ตอนรับคืน</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="condition"
                      checked={returnCondition === 'complete'}
                      onChange={() => setReturnCondition('complete')}
                    />
                    <span className="font-semibold text-emerald-800">✅ สภาพสมบูรณ์ พร้อมใช้งานต่อ</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="condition"
                      checked={returnCondition === 'damaged'}
                      onChange={() => setReturnCondition('damaged')}
                    />
                    <span className="font-semibold text-rose-800">⚠️ มีจุดชำรุด / ต้องซ่อมแซม</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">หมายเหตุการตรวจสอบ</label>
                <input
                  type="text"
                  placeholder="เช่น ทำความสะอาด ฆ่าเชื้อเรียบร้อย"
                  value={damageNotes}
                  onChange={(e) => setDamageNotes(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setReturnModalLoan(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => handleConfirmReturn(returnModalLoan)}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer shadow-xs"
              >
                ยืนยันรับคืนอุปกรณ์เข้าคลัง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Equipment & Photo Upload Modal */}
      {isEditEquipModalOpen && editingEquipment && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-teal-700" />
                <span>แก้ไขข้อมูล & รูปถ่ายอุปกรณ์จริง</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsEditEquipModalOpen(false);
                  setEditingEquipment(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditEquipment} noValidate className="space-y-4 text-xs sm:text-sm">
              {/* Photo Preview & Upload Box */}
              <div className="p-4 rounded-2xl bg-teal-50/60 border-2 border-dashed border-teal-300 text-center space-y-3">
                <div className="font-bold text-teal-950">
                  รูปถ่ายอุปกรณ์ทางการแพทย์ (แสดงในระบบเจ้าหน้าที่และประชาชน)
                </div>
                {editingEquipment.imageUrl ? (
                  <div className="relative inline-block">
                    <img
                      src={editingEquipment.imageUrl}
                      alt={editingEquipment.name}
                      className="w-44 h-36 object-cover rounded-2xl border-2 border-teal-400 shadow-md mx-auto"
                    />
                    <button
                      type="button"
                      onClick={() => setEditingEquipment({ ...editingEquipment, imageUrl: '' })}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-600 text-white font-bold text-xs flex items-center justify-center shadow-md hover:bg-rose-700 cursor-pointer"
                      title="ลบรูปภาพนี้"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="w-44 h-32 rounded-2xl bg-white border-2 border-slate-200 text-slate-400 flex flex-col items-center justify-center mx-auto text-xs gap-1">
                    <Package className="w-8 h-8 text-slate-300" />
                    <span>ยังไม่มีรูปภาพ</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                  <label className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all">
                    <Camera className="w-3.5 h-3.5" />
                    <span>ถ่ายรูป / อัปโหลดไฟล์ภาพจริง</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUploadForEdit}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="text-left">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">หรือระบุลิงก์รูปภาพ (Image URL):</label>
                  <input
                    type="text"
                    value={editingEquipment.imageUrl || ''}
                    onChange={(e) => setEditingEquipment({ ...editingEquipment, imageUrl: e.target.value })}
                    placeholder="https://... หรือ data:image/..."
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white text-xs font-mono"
                  />
                </div>
              </div>

              {/* Equipment Info Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">รหัสครุภัณฑ์ *</label>
                  <input
                    type="text"
                    required
                    value={editingEquipment.assetCode}
                    onChange={(e) => setEditingEquipment({ ...editingEquipment, assetCode: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-mono font-bold text-teal-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">หมวดหมู่อุปกรณ์ *</label>
                  <select
                    value={editingEquipment.category}
                    onChange={(e) => setEditingEquipment({ ...editingEquipment, category: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-semibold"
                  >
                    <option value="bed">🛏️ เตียงผู้ป่วย</option>
                    <option value="wheelchair">♿ รถเข็นวีลแชร์</option>
                    <option value="oxygen_concentrator">🧪 เครื่องผลิตออกซิเจน</option>
                    <option value="air_mattress">💨 ที่นอนลม</option>
                    <option value="suction_machine">🫁 เครื่องดูดเสมหะ</option>
                    <option value="walker">🦯 ไม้เท้า / โครงช่วยเดิน</option>
                    <option value="other">📦 อุปกรณ์อื่นๆ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ชื่ออุปกรณ์ทางการแพทย์ *</label>
                <input
                  type="text"
                  required
                  value={editingEquipment.name}
                  onChange={(e) => setEditingEquipment({ ...editingEquipment, name: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">จำนวนทั้งหมด (ชิ้น)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={editingEquipment.totalQuantity}
                    onChange={(e) => {
                      const total = Number(e.target.value);
                      const inUse = editingEquipment.inUseQuantity || 0;
                      setEditingEquipment({
                        ...editingEquipment,
                        totalQuantity: total,
                        availableQuantity: Math.max(0, total - inUse),
                      });
                    }}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">พร้อมให้ยืม (ว่าง)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={editingEquipment.availableQuantity}
                    onChange={(e) => setEditingEquipment({ ...editingEquipment, availableQuantity: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-bold text-emerald-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">สถานที่จัดเก็บในสำนักงาน</label>
                <input
                  type="text"
                  value={editingEquipment.storageLocation}
                  onChange={(e) => setEditingEquipment({ ...editingEquipment, storageLocation: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditEquipModalOpen(false);
                    setEditingEquipment(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveEditEquipment()}
                  className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-black cursor-pointer shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>บันทึกการแก้ไข & รูปภาพ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* G. Add Equipment Modal */}
      {isAddEquipModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-teal-700" />
                <span>เพิ่มอุปกรณ์การแพทย์ใหม่เข้าคลัง</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddEquipModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEquipment} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">รหัสครุภัณฑ์</label>
                <input
                  type="text"
                  required
                  value={newEquipForm.assetCode}
                  onChange={(e) => setNewEquipForm({ ...newEquipForm, assetCode: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">ชื่ออุปกรณ์ทางการแพทย์</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น เตียงผู้ป่วย 3 ไกร์"
                  value={newEquipForm.name}
                  onChange={(e) => setNewEquipForm({ ...newEquipForm, name: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">หมวดหมู่อุปกรณ์</label>
                  <select
                    value={newEquipForm.category}
                    onChange={(e) => setNewEquipForm({ ...newEquipForm, category: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="bed">เตียงผู้ป่วย</option>
                    <option value="wheelchair">รถเข็นวีลแชร์</option>
                    <option value="oxygen">เครื่องผลิตออกซิเจน</option>
                    <option value="mattress">ที่นอนลม</option>
                    <option value="suction">เครื่องดูดเสมหะ</option>
                    <option value="other">อื่นๆ</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">จำนวนที่รับเข้า</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newEquipForm.totalQuantity}
                    onChange={(e) => setNewEquipForm({ ...newEquipForm, totalQuantity: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">สถานที่จัดเก็บในสำนักงาน</label>
                <input
                  type="text"
                  value={newEquipForm.storageLocation}
                  onChange={(e) => setNewEquipForm({ ...newEquipForm, storageLocation: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddEquipModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold cursor-pointer shadow-xs"
                >
                  บันทึกเข้าคลัง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* H. Edit Individual Unit Modal (แก้ไขข้อมูลครุภัณฑ์รายชิ้น) */}
      {editingUnit && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-black">
                  🏷️
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    แก้ไขข้อมูลครุภัณฑ์รายชิ้น: {editingUnit.assetCode}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">{editingUnit.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUnit(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdateUnit({ ...editingUnit, updatedAt: new Date().toISOString() });
                setEditingUnit(null);
              }}
              className="space-y-3.5 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    เลขทะเบียน / รหัสครุภัณฑ์ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingUnit.assetCode}
                    onChange={(e) => setEditingUnit({ ...editingUnit, assetCode: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white font-mono font-bold text-teal-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">ลำดับชิ้น (เช่น 1, 2, 3)</label>
                  <input
                    type="number"
                    value={editingUnit.unitNumber || ''}
                    onChange={(e) => setEditingUnit({ ...editingUnit, unitNumber: parseInt(e.target.value) || undefined })}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ยี่ห้อ / รุ่น (Brand & Model)</label>
                  <input
                    type="text"
                    placeholder="เช่น Paramount Bed 2-Crank"
                    value={editingUnit.brandModel || ''}
                    onChange={(e) => setEditingUnit({ ...editingUnit, brandModel: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">หมายเลขเครื่อง (Serial Number / S/N)</label>
                  <input
                    type="text"
                    placeholder="เช่น PB-2C-2567-001"
                    value={editingUnit.serialNumber || ''}
                    onChange={(e) => setEditingUnit({ ...editingUnit, serialNumber: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">สภาพความสมบูรณ์</label>
                  <select
                    value={editingUnit.condition}
                    onChange={(e) => setEditingUnit({ ...editingUnit, condition: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white font-bold cursor-pointer"
                  >
                    <option value="good">✨ สมบูรณ์ 100% พร้อมใช้งาน</option>
                    <option value="fair">👍 สภาพดี / มีรอยใช้งานเล็กน้อย</option>
                    <option value="damaged">⚠️ มีจุดชำรุด</option>
                    <option value="repair_needed">🔧 ต้องซ่อมบำรุงก่อนจ่ายยืม</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">สถานะปัจจุบัน</label>
                  <select
                    value={editingUnit.status}
                    onChange={(e) => setEditingUnit({ ...editingUnit, status: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white font-black cursor-pointer text-slate-800"
                  >
                    <option value="available">🟢 ว่างในคลัง (พร้อมจ่ายยืม)</option>
                    <option value="borrowed">🔵 ถูกยืมใช้งาน (อยู่บ้านประชาชน)</option>
                    <option value="maintenance">🟠 ชำรุด / ส่งซ่อมบำรุง</option>
                    <option value="disposed">⚪ แทงจำหน่าย / ปลดระวาง</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Sub-form: Borrowed Custodian Details (อยู่บ้านใคร) */}
              {editingUnit.status === 'borrowed' && (
                <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 space-y-3">
                  <div className="font-black text-sky-950 flex items-center gap-1.5 text-xs">
                    <Home className="w-4 h-4 text-sky-600" />
                    <span>ข้อมูลผู้ถือครอง / ผู้ป่วยที่ยืมไปใช้งาน (อยู่บ้านใคร)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">ชื่อผู้ป่วย</label>
                      <input
                        type="text"
                        placeholder="เช่น นายแดง สุขเกษม"
                        value={editingUnit.currentPatientName || ''}
                        onChange={(e) => setEditingUnit({ ...editingUnit, currentPatientName: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-xl bg-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">ชื่อผู้ยืม (ญาติ/ผู้ดูแล)</label>
                      <input
                        type="text"
                        placeholder="เช่น นายดำ สุขเกษม"
                        value={editingUnit.currentBorrowerName || ''}
                        onChange={(e) => setEditingUnit({ ...editingUnit, currentBorrowerName: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-xl bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">บ้านเลขที่ / ที่อยู่ผู้ป่วย</label>
                      <input
                        type="text"
                        placeholder="เช่น 1 หมู่ 1 ต.บางเป้า อ.กันตัง จ.ตรัง"
                        value={editingUnit.currentAddress || ''}
                        onChange={(e) => setEditingUnit({ ...editingUnit, currentAddress: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-xl bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">หมู่ที่</label>
                      <select
                        value={editingUnit.currentMoo || '1'}
                        onChange={(e) => setEditingUnit({ ...editingUnit, currentMoo: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-xl bg-white font-bold"
                      >
                        <option value="1">ม.1 ท่าส้ม</option>
                        <option value="2">ม.2 ทุ่งค่าย</option>
                        <option value="3">ม.3 ตลาดใหม่</option>
                        <option value="4">ม.4 แหลมม่วง</option>
                        <option value="5">ม.5 ไร่ออก</option>
                        <option value="6">ม.6 ในลุ่ม</option>
                        <option value="7">ม.7 ควนทอง</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">เบอร์ติดต่อ</label>
                      <input
                        type="tel"
                        placeholder="081-xxx-xxxx"
                        value={editingUnit.currentBorrowerPhone || ''}
                        onChange={(e) => setEditingUnit({ ...editingUnit, currentBorrowerPhone: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-xl bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">วันที่เริ่มยืม</label>
                      <input
                        type="date"
                        value={editingUnit.borrowDate || ''}
                        onChange={(e) => setEditingUnit({ ...editingUnit, borrowDate: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-xl bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">กำหนดส่งคืน</label>
                      <input
                        type="date"
                        value={editingUnit.dueDate || ''}
                        onChange={(e) => setEditingUnit({ ...editingUnit, dueDate: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-xl bg-white font-bold text-sky-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic Sub-form: Maintenance Details */}
              {editingUnit.status === 'maintenance' && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 space-y-2">
                  <div className="font-black text-amber-950 flex items-center gap-1.5 text-xs">
                    <Wrench className="w-4 h-4 text-amber-600" />
                    <span>บันทึกอาการชำรุดและการซ่อมบำรุง</span>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">รายละเอียดอาการชำรุด</label>
                    <textarea
                      rows={2}
                      placeholder="เช่น ราวกั้นข้างเตียงหลวม สลักล็อคไม่แน่น รอเปลี่ยนลูกปืนล้อ"
                      value={editingUnit.repairNotes || ''}
                      onChange={(e) => setEditingUnit({ ...editingUnit, repairNotes: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-xl bg-white leading-relaxed"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">สถานที่จัดเก็บเมื่ออยู่ในคลัง</label>
                <input
                  type="text"
                  value={editingUnit.storageLocation || 'ห้องคลังอุปกรณ์ชั้น 1 กองสาธารณสุข'}
                  onChange={(e) => setEditingUnit({ ...editingUnit, storageLocation: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-xl bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ลิงก์รูปถ่ายอุปกรณ์ชิ้นนี้ (URL)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={editingUnit.imageUrl || ''}
                  onChange={(e) => setEditingUnit({ ...editingUnit, imageUrl: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-xl bg-white font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">หมายเหตุเพิ่มเติม</label>
                <input
                  type="text"
                  placeholder="บันทึกข้อความเสริม..."
                  value={editingUnit.notes || ''}
                  onChange={(e) => setEditingUnit({ ...editingUnit, notes: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-xl bg-white"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`คุณต้องการลบทะเบียน "${editingUnit.assetCode}" ออกจากระบบหรือไม่?`)) {
                      handleDeleteUnit(editingUnit.id);
                      setEditingUnit(null);
                    }
                  }}
                  className="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold cursor-pointer"
                >
                  ลบชิ้นนี้
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingUnit(null)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold cursor-pointer shadow-xs active:scale-95 transition-transform"
                  >
                    บันทึกการแก้ไข
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* I. Add New Unit Modal (เพิ่มอุปกรณ์รายชิ้นใหม่เข้าคลัง) */}
      {isAddUnitModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-black">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    + เพิ่มครุภัณฑ์ใหม่เข้าคลัง (รายชิ้น)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">บันทึกเลขทะเบียนครุภัณฑ์และยี่ห้อเฉพาะชิ้น</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddUnitModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const matchedEq = equipmentList.find((e) => e.category === newUnitForm.category);
                const nextNumber = units.filter((u) => u.category === newUnitForm.category).length + 1;
                const newUnit: MedicalEquipmentUnit = {
                  id: `UNIT-${newUnitForm.category.toUpperCase()}-${Date.now().toString().slice(-4)}`,
                  equipmentId: matchedEq?.id || newUnitForm.equipmentId,
                  assetCode: newUnitForm.assetCode,
                  unitNumber: nextNumber,
                  name: matchedEq?.name || newUnitForm.name,
                  category: newUnitForm.category,
                  brandModel: newUnitForm.brandModel || 'มาตรฐาน',
                  serialNumber: newUnitForm.serialNumber || undefined,
                  condition: newUnitForm.condition,
                  status: newUnitForm.status,
                  storageLocation: newUnitForm.storageLocation || 'ห้องคลังอุปกรณ์ชั้น 1 กองสาธารณสุข',
                  imageUrl: newUnitForm.imageUrl || matchedEq?.imageUrl,
                  notes: newUnitForm.notes || undefined,
                  createdAt: new Date().toISOString(),
                };
                handleAddUnit(newUnit);
                setIsAddUnitModalOpen(false);
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">หมวดหมู่อุปกรณ์การแพทย์</label>
                <select
                  value={newUnitForm.category}
                  onChange={(e) => {
                    const cat = e.target.value as MedicalEquipment['category'];
                    const eq = equipmentList.find((item) => item.category === cat);
                    const prefix = cat === 'bed' ? 'BED' : cat === 'wheelchair' ? 'WCH' : cat === 'oxygen_concentrator' ? 'OXY' : cat === 'air_mattress' ? 'MAT' : cat === 'suction_machine' ? 'SUC' : 'WLK';
                    const nextNum = units.filter((u) => u.category === cat).length + 1;
                    const code = `ทต.บป.${prefix}-${String(nextNum).padStart(3, '0')}`;
                    setNewUnitForm({
                      ...newUnitForm,
                      category: cat,
                      equipmentId: eq?.id || 'EQ-001',
                      name: eq?.name || 'อุปกรณ์การแพทย์',
                      assetCode: code,
                      imageUrl: eq?.imageUrl || '',
                    });
                  }}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-bold cursor-pointer text-slate-800"
                >
                  <option value="bed">🛏️ เตียงผู้ป่วยมือหมุน 2 ไกร์</option>
                  <option value="wheelchair">♿ รถเข็นวีลแชร์มาตรฐานพับได้</option>
                  <option value="oxygen_concentrator">💨 เครื่องผลิตออกซิเจนขนาด 5 ลิตร</option>
                  <option value="air_mattress">🌊 ที่นอนลมป้องกันแผลกดทับแบบลอน</option>
                  <option value="suction_machine">🧪 เครื่องดูดเสมหะแบบพกพา</option>
                  <option value="walker">🚶 โครงช่วยเดินพับได้ 4 ขา</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    เลขทะเบียน / เลขครุภัณฑ์ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newUnitForm.assetCode}
                    onChange={(e) => setNewUnitForm({ ...newUnitForm, assetCode: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white font-mono font-bold text-teal-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">ยี่ห้อ / รุ่น (Brand / Model)</label>
                  <input
                    type="text"
                    placeholder="เช่น Paramount Bed 2-Crank"
                    value={newUnitForm.brandModel}
                    onChange={(e) => setNewUnitForm({ ...newUnitForm, brandModel: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">หมายเลขเครื่อง (Serial Number / S/N)</label>
                  <input
                    type="text"
                    placeholder="เช่น PB-2C-69-016"
                    value={newUnitForm.serialNumber}
                    onChange={(e) => setNewUnitForm({ ...newUnitForm, serialNumber: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">สภาพเริ่มต้น</label>
                  <select
                    value={newUnitForm.condition}
                    onChange={(e) => setNewUnitForm({ ...newUnitForm, condition: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white font-bold"
                  >
                    <option value="good">✨ สมบูรณ์ 100% พร้อมใช้งาน</option>
                    <option value="fair">👍 สภาพดี / มีรอยใช้งานเล็กน้อย</option>
                    <option value="damaged">⚠️ มีจุดชำรุด</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">สถานะเริ่มต้น</label>
                  <select
                    value={newUnitForm.status}
                    onChange={(e) => setNewUnitForm({ ...newUnitForm, status: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white font-bold text-slate-800"
                  >
                    <option value="available">🟢 ว่างในคลัง (พร้อมจ่ายยืม)</option>
                    <option value="maintenance">🟠 ชำรุด / ส่งซ่อม</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">สถานที่จัดเก็บในคลัง</label>
                  <input
                    type="text"
                    value={newUnitForm.storageLocation}
                    onChange={(e) => setNewUnitForm({ ...newUnitForm, storageLocation: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ลิงก์รูปถ่าย (URL)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newUnitForm.imageUrl}
                  onChange={(e) => setNewUnitForm({ ...newUnitForm, imageUrl: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-xl bg-white font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">หมายเหตุ</label>
                <input
                  type="text"
                  placeholder="เช่น รับมอบจากโครงการพระราชทาน..."
                  value={newUnitForm.notes}
                  onChange={(e) => setNewUnitForm({ ...newUnitForm, notes: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-xl bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddUnitModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold cursor-pointer shadow-xs active:scale-95 transition-transform"
                >
                  + เพิ่มเข้าคลัง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
