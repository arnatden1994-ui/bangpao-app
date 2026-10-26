import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MessageSquareWarning,
  LayoutDashboard,
  FileEdit,
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
  Download,
  FileSpreadsheet,
  Settings,
  ChevronRight,
  ExternalLink,
  Navigation,
  Share2,
  Copy,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Layers,
  Crosshair,
  Building2,
  DollarSign,
  X,
  CreditCard,
  CheckSquare,
  Square,
  ClipboardList,
  Compass,
  FileSignature,
  Send,
  Eye,
  Trash2,
} from 'lucide-react';
import {
  PublicPetition,
  PetitionCategory,
  UserRole,
  SignerSettings,
  DEFAULT_SIGNER_SETTINGS,
  PetitionFormData,
  SewageZone,
  PetitionFormType,
} from '../types/index.ts';
import {
  BANGPAO_COORDS,
  BANGPAO_VILLAGES,
  BANGPAO_MUNICIPALITY_COORDS,
  formatThaiDate,
} from './NhsoLtcCombinedView.tsx';
import { PrintPetitionModal } from './PrintPetitionModal.tsx';
import {
  openPetitionPrintWindow,
  exportPetitionDocx,
  exportPetitionRegisterCsv,
  petitionFileBaseName,
  resolvePetitionAddress,
} from '../services/petitionDocGenerator.ts';
import {
  getPetitionForm,
  resolveFormType,
  toThaiDateParts,
  getSewageFee,
  formatMoney,
  normalizeStage,
  generateTrackingCode,
} from '../data/petitionMeta.ts';

interface PublicPetitionsViewProps {
  petitions: PublicPetition[];
  userRole: UserRole;
  onAddNew?: () => void;
  onUpdateStatus: (id: string, status: PublicPetition['status'], notes?: string) => void;
  onDeletePetition?: (id: string) => void;
  onPrintPetition?: (petition: PublicPetition) => void;
  onAddSewagePetition?: (petition: PublicPetition) => void;
  onAddPetition?: (petition: PublicPetition) => void;
  activeSubTab?: 'dashboard' | 'form' | 'general' | 'sewage' | 'print' | 'tracking';
  onSubTabChange?: (tab: 'dashboard' | 'form' | 'general' | 'sewage' | 'print' | 'tracking') => void;
  signerSettings?: SignerSettings;
  onUpdateSignerSettings?: (s: SignerSettings) => void;
}

export const PETITION_CATEGORY_LABELS: Record<PetitionCategory, string> = {
  waste_sewage: 'บริการสูบสิ่งปฏิกูล (ดูดส้วม)',
  nuisance_smell: 'กลิ่นเหม็น / มลพิษทางอากาศ / เผาขยะ',
  nuisance_noise: 'เสียงดังรบกวน / สถานบันเทิง / ก่อสร้าง',
  nuisance_animal: 'เหตุรำคาญสัตว์เลี้ยง / สัตว์จรจัด',
  food_sanitation: 'สุขาภิบาลอาหาร / สุขอนามัยร้านค้า',
  license_request: 'คำขอรับ / ต่อใบอนุญาตประกอบกิจการ',
  fogging_spray: 'ขอรับบริการพ่นหมอกควันกำจัดยุงลาย',
  rabies_vaccine: 'ขอรับบริการฉีดวัคซีนป้องกันพิษสุนัขบ้า',
  stray_animals: 'จัดการปัญหาสุนัขและแมวจรจัดในชุมชน',
  other: 'คำร้องทั่วไปด้านสาธารณสุขและสิ่งแวดล้อม',
};

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

// High-contrast SVG status pins for satellite maps
const createPetitionPinIcon = (
  type: 'sewage' | 'general' | 'resolved' | 'hq',
  title?: string
) => {
  const L = (window as any).L;
  if (!L) return null;

  if (type === 'hq') {
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

  const color =
    type === 'resolved'
      ? '#059669' // Emerald
      : type === 'sewage'
      ? '#ea580c' // Orange
      : '#0d9488'; // Teal

  const emoji =
    type === 'resolved'
      ? '✅'
      : type === 'sewage'
      ? '🚛'
      : '📋';

  return L.divIcon({
    className: 'custom-petition-pin',
    html: `
      <div style="position:relative;width:36px;height:44px;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.45));cursor:pointer;">
        <svg viewBox="0 0 24 32" width="36" height="44">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 20 12 20s12-11 12-20c0-6.63-5.37-12-12-12z" fill="${color}" stroke="#ffffff" stroke-width="2"/>
          <circle cx="12" cy="11" r="7" fill="#ffffff"/>
          <text x="12" y="15" font-size="9" text-anchor="middle">${emoji}</text>
        </svg>
      </div>
    `,
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -44],
  });
};

export const PublicPetitionsView: React.FC<PublicPetitionsViewProps> = ({
  petitions,
  userRole,
  onAddNew,
  onUpdateStatus,
  onDeletePetition,
  onPrintPetition,
  onAddSewagePetition,
  onAddPetition,
  activeSubTab: controlledSubTab,
  onSubTabChange,
  signerSettings: externalSigners,
  onUpdateSignerSettings,
}) => {
  // 4 Primary Sub-tabs matching the user requirements & MedicalEquipmentView UX:
  // 1) 'general' -> 📊 แดชบอร์ดติดตาม & แผนที่ GIS (รอบบริการสูบส้วม/เรื่องร้องเรียน)
  // 2) 'sewage'  -> 📝 ยื่นคำร้องใหม่ (แบบฟอร์มตามแม่แบบราชการ)
  // 3) 'print'   -> 🖨️ เสนออนุมัติ & พิมพ์เอกสาร A4 (Approval & Signer Workflow)
  // 4) 'tracking'-> 🔍 ติดตามผลคำร้องประชาชน (Citizen Tracking Portal)
  const [internalSubTab, setInternalSubTab] = useState<'dashboard' | 'form'>('dashboard');
  const rawSubTab = controlledSubTab || internalSubTab;
  const subTab: 'dashboard' | 'form' = (rawSubTab === 'form' || rawSubTab === 'sewage' || rawSubTab === 'print') ? 'form' : 'dashboard';
  const setSubTab = (t: 'dashboard' | 'form' | 'general' | 'sewage' | 'print' | 'tracking') => {
    const norm: 'dashboard' | 'form' = (t === 'form' || t === 'sewage' || t === 'print') ? 'form' : 'dashboard';
    if (onSubTabChange) onSubTabChange(norm);
    else setInternalSubTab(norm);
  };

  const signers = externalSigners || DEFAULT_SIGNER_SETTINGS;

  // Filter States
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMoo, setSelectedMoo] = useState<string>('all');

  // Citizen Portal Search State
  const [trackingQuery, setTrackingQuery] = useState('');
  const [activeTrackingResult, setActiveTrackingResult] = useState<PublicPetition | null>(null);

  // Selected Petition for A4 Print Modal
  const [selectedPrintPetition, setSelectedPrintPetition] = useState<PublicPetition | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Quick Status & Approval Action Modal
  const [statusActionPetition, setStatusActionPetition] = useState<PublicPetition | null>(null);
  const [selectedWorkflowStep, setSelectedWorkflowStep] = useState<'pending' | 'assigned' | 'resolved' | 'rejected'>('assigned');
  const [actionOfficerName, setActionOfficerName] = useState('นายชนะ สุขด้วง (พนักงานขับรถ)');
  const [actionComment, setActionComment] = useState('');
  const [receiptBookNo, setReceiptBookNo] = useState('01');
  const [receiptNo, setReceiptNo] = useState('');
  const [receiptAmount, setReceiptAmount] = useState('250');

  // Overview Map References (Sub-Tab 1)
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [activeMapPetitionId, setActiveMapPetitionId] = useState<string | null>(null);

  // Registration Pin Map Refs (Sub-Tab 2 - Matches MedicalEquipmentView)
  const regMapContainerRef = useRef<HTMLDivElement | null>(null);
  const regMapInstanceRef = useRef<any>(null);
  const regMarkerRef = useRef<any>(null);
  const [isRegMapFullscreen, setIsRegMapFullscreen] = useState(false);
  const [queueTabMode, setQueueTabMode] = useState<'active' | 'resolved' | 'all'>('active');

  // Summary Tracking Table States (Sub-Tab 2 - Matches MedicalEquipmentView Image 5)
  const [regTableSearch, setRegTableSearch] = useState('');
  const [regTableMooFilter, setRegTableMooFilter] = useState('all');
  const [regTableStatusFilter, setRegTableStatusFilter] = useState('all');
  const [regTableStatusTab, setRegTableStatusTab] = useState<
    'active' | 'pending' | 'assigned' | 'resolved' | 'all'
  >('all');
  const [regTableCategoryFilter, setRegTableCategoryFilter] = useState<'all' | 'sewage' | 'general'>('all');

  // =========================================================================
  // SUB-TAB 2 FORM STATE: แบบฟอร์มยื่นคำร้องใหม่ตามแม่แบบ
  // =========================================================================
  const [formType, setFormType] = useState<PetitionFormType>('general');
  const [formMoo, setFormMoo] = useState<string>('1');
  const [applicantName, setApplicantName] = useState('');
  const [applicantIdCard, setApplicantIdCard] = useState('');
  const [applicantAge, setApplicantAge] = useState('45');
  const [applicantNationality, setApplicantNationality] = useState('ไทย');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [applicantHouseNo, setApplicantHouseNo] = useState('');
  const [applicantTrokSoi, setApplicantTrokSoi] = useState('');
  const [applicantRoad, setApplicantRoad] = useState('');
  const [applicantSubdistrict, setApplicantSubdistrict] = useState('บางเป้า');
  const [applicantDistrict, setApplicantDistrict] = useState('กันตัง');
  const [applicantProvince, setApplicantProvince] = useState('ตรัง');

  // General Petition Specifics
  const [generalSubject, setGeneralSubject] = useState('');
  const [generalPurpose, setGeneralPurpose] = useState('');
  const [generalEvidence, setGeneralEvidence] = useState('สำเนาบัตรประชาชน 1 ฉบับ, สำเนาทะเบียนบ้าน 1 ฉบับ');

  // Sewage Suction Petition Specifics
  const [sewageZone, setSewageZone] = useState<SewageZone>('in_district');
  const [sewagePlace, setSewagePlace] = useState('บ้านพักอาศัย');
  const [sewageTankType, setSewageTankType] = useState('บ่อเกรอะ/บ่อซึมในบ้านพักอาศัย');
  const [sewageTankVol, setSewageTankVol] = useState('1 เที่ยวรถสูบ (ประมาณ 3-4 ลบ.ม.)');
  const [sewagePreferredDate, setSewagePreferredDate] = useState(new Date().toISOString().slice(0, 10));
  const [sewageLandmark, setSewageLandmark] = useState('');
  const [sewageDriver, setSewageDriver] = useState('นายชนะ สุขด้วง (พนักงานขับรถบรรทุกสิ่งปฏิกูล)');
  const [sewageLat, setSewageLat] = useState<number>(BANGPAO_COORDS['1'].lat);
  const [sewageLng, setSewageLng] = useState<number>(BANGPAO_COORDS['1'].lng);
  const [isFetchingGps, setIsFetchingGps] = useState(false);

  // Officer Intake Notes
  const [receivingOfficerName, setReceivingOfficerName] = useState('นางสาวอรัญญา สุขสวัสดิ์');
  const [receivingOfficerPosition, setReceivingOfficerPosition] = useState('เจ้าพนักงานธุรการชำนาญงาน');
  const [receivingOfficerNote, setReceivingOfficerNote] = useState('ตรวจสอบหลักฐานและสถานที่แล้ว ข้อเท็จจริงถูกต้อง เห็นควรเสนอผู้บังคับบัญชา');

  // Feedback Messages
  const [formSuccessMsg, setFormSuccessMsg] = useState('');
  const [formErrorMsg, setFormErrorMsg] = useState('');

  // Helper to update Registration Map Pin & Coords
  const updateRegMapPin = (lat: number, lng: number, recenter = true) => {
    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
      const fixedLat = Number(lat.toFixed(6));
      const fixedLng = Number(lng.toFixed(6));
      setSewageLat(fixedLat);
      setSewageLng(fixedLng);
      if (regMarkerRef.current) {
        regMarkerRef.current.setLatLng([fixedLat, fixedLng]);
      }
      if (recenter && regMapInstanceRef.current) {
        regMapInstanceRef.current.setView([fixedLat, fixedLng], 17, { animate: true });
      }
    }
  };

  // Auto-fill coordinates and center map pin when village moo changes
  useEffect(() => {
    const coords = BANGPAO_COORDS[formMoo];
    if (coords) {
      updateRegMapPin(coords.lat, coords.lng, true);
    }
  }, [formMoo]);

  // Calculated sewage fee based on selected zone
  const calculatedFee = useMemo(() => {
    return getSewageFee(sewageZone);
  }, [sewageZone]);

  // ---------------------------------------------------------------------------
  // Leaflet Map Initialization for Sub-Tab 1
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (subTab !== 'dashboard') {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {}
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
      }
      return;
    }

    const timer = setTimeout(() => {
      const L = (window as any).L;
      const container = mapContainerRef.current as any;
      if (!L || !container) return;

      if (mapInstanceRef.current && mapInstanceRef.current.getContainer() !== container) {
        try {
          mapInstanceRef.current.remove();
        } catch {}
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
      }

      if (!mapInstanceRef.current) {
        if (container._leaflet_id) {
          container._leaflet_id = null;
          container.innerHTML = '';
        }

        const map = L.map(container, {
          center: [BANGPAO_MUNICIPALITY_COORDS.lat, BANGPAO_MUNICIPALITY_COORDS.lng],
          zoom: 14,
          zoomControl: true,
        });

        // Google Satellite Hybrid Tile Layer (Matches MedicalEquipmentView)
        L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
          maxZoom: 20,
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
          attribution: '© Google Maps Satellite Hybrid',
        }).addTo(map);

        // Headquarters Pin
        const hqIcon = createPetitionPinIcon('hq');
        if (hqIcon) {
          L.marker([BANGPAO_MUNICIPALITY_COORDS.lat, BANGPAO_MUNICIPALITY_COORDS.lng], { icon: hqIcon })
            .addTo(map)
            .bindPopup(`
              <div style="font-family:'Prompt',sans-serif;padding:4px;font-size:12px;">
                <strong style="color:#0284c7;font-size:13px;">🏢 สำนักงานเทศบาลตำบลบางเป้า</strong>
                <div style="color:#475569;margin-top:2px;">ศูนย์บริการประชาชนและรับคำร้อง</div>
                <div style="color:#64748b;font-size:11px;">กองสาธารณสุขและสิ่งแวดล้อม</div>
              </div>
            `);
        }

        const markersLayer = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;
        markersLayerRef.current = markersLayer;
      }

      if (markersLayerRef.current) {
        markersLayerRef.current.clearLayers();
        const items = petitions.filter((p) => {
          const q = search.toLowerCase();
          const matchSearch =
            !q ||
            p.trackingCode.toLowerCase().includes(q) ||
            p.title.toLowerCase().includes(q) ||
            p.citizenName.toLowerCase().includes(q) ||
            p.address.toLowerCase().includes(q);
          const matchStatus = selectedStatus === 'all' || p.status === selectedStatus;
          const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
          const matchMoo = selectedMoo === 'all' || p.moo === selectedMoo || p.address.includes(`หมู่ ${selectedMoo}`) || p.address.includes(`หมู่ที่ ${selectedMoo}`);
          return matchSearch && matchStatus && matchCategory && matchMoo;
        });

        items.forEach((p, idx) => {
          const isSewage = resolveFormType(p) === 'sewage';
          const isDone = p.status === 'resolved';
          const mooNum = p.moo || (p.address.match(/หมู่(?:ที่)?\s*(\d+)/)?.[1] ?? String((idx % 7) + 1));
          const baseCoords = BANGPAO_COORDS[mooNum] || BANGPAO_COORDS['1'];
          const lat = p.latitude ?? (baseCoords.lat + ((idx % 4) * 0.0022 - 0.002));
          const lng = p.longitude ?? (baseCoords.lng + (((idx * 2) % 4) * 0.0022 - 0.002));

          const iconType = isDone ? 'resolved' : isSewage ? 'sewage' : 'general';
          const pinIcon = createPetitionPinIcon(iconType);

          if (pinIcon) {
            const marker = L.marker([lat, lng], { icon: pinIcon }).addTo(markersLayerRef.current);
            const feeStr = isSewage ? `<div style="color:#d97706;font-weight:bold;">💰 ค่าธรรมเนียม: ${p.form?.feeAmount || 250} บาท</div>` : '';

            marker.bindPopup(`
              <div style="font-family:'Prompt',sans-serif;padding:6px;font-size:12px;max-width:240px;">
                <div style="font-weight:bold;color:${isSewage ? '#ea580c' : '#0d9488'};font-size:13px;border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin-bottom:4px;">
                  ${isSewage ? '🚛 คำร้องสูบสิ่งปฏิกูล' : '📋 ' + p.title}
                </div>
                <div style="font-size:11px;color:#334155;margin-bottom:2px;"><strong>รหัส:</strong> ${p.trackingCode}</div>
                <div style="font-size:11px;color:#334155;margin-bottom:2px;"><strong>ผู้ยื่น:</strong> ${p.citizenName} (${p.phone})</div>
                <div style="font-size:11px;color:#475569;margin-bottom:4px;"><strong>ที่อยู่:</strong> ${p.address}</div>
                ${feeStr}
                <div style="margin-top:6px;font-size:10px;padding:3px 6px;border-radius:4px;background:#f1f5f9;color:#475569;display:inline-block;">
                  สถานะ: ${p.status === 'resolved' ? 'เสร็จสิ้น' : p.status === 'assigned' ? 'มอบหมายแล้ว' : 'รอดำเนินการ'}
                </div>
              </div>
            `);

            marker.on('click', () => {
              setActiveMapPetitionId(p.id);
            });
          }
        });
      }

      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize({ animate: false });
        }
      }, 80);

      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize({ animate: false });
        }
      }, 300);
    }, 40);

    return () => {
      clearTimeout(timer);
    };
  }, [subTab, petitions, search, selectedCategory, selectedStatus, selectedMoo]);

  // Center Map on a specific petition
  const handleLocateOnMap = (p: PublicPetition) => {
    setSubTab('dashboard');
    setActiveMapPetitionId(p.id);
    const mooNum = p.moo || (p.address.match(/หมู่(?:ที่)?\s*(\d+)/)?.[1] ?? '1');
    const baseCoords = BANGPAO_COORDS[mooNum] || BANGPAO_COORDS['1'];
    const lat = p.latitude ?? baseCoords.lat;
    const lng = p.longitude ?? baseCoords.lng;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], 17, { animate: true });
    }
  };

  // Get current device GPS coordinates (with registration pin auto-update)
  const handleFetchCurrentGps = () => {
    if (!navigator.geolocation) {
      alert('เบราว์เซอร์หรืออุปกรณ์ของคุณไม่รองรับการระบุตำแหน่ง GPS');
      return;
    }
    setIsFetchingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        updateRegMapPin(lat, lng, true);
        setIsFetchingGps(false);
      },
      (err) => {
        setIsFetchingGps(false);
        alert(`ไม่สามารถดึงตำแหน่ง GPS ได้ (${err.message}) กรุณาใช้ตำแหน่งตำบลตามค่าเริ่มต้น หรือคลิกปักหมุดบนแผนที่`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ---------------------------------------------------------------------------
  // Registration Pin Map Lifecycle for Sub-Tab 'sewage' (Matches MedicalEquipmentView)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (subTab !== 'form') {
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

        const initialLat = Number(sewageLat) || BANGPAO_COORDS[formMoo]?.lat || BANGPAO_COORDS['1'].lat;
        const initialLng = Number(sewageLng) || BANGPAO_COORDS[formMoo]?.lng || BANGPAO_COORDS['1'].lng;

        const map = L.map(container, {
          center: [initialLat, initialLng],
          zoom: 16,
        });

        // Google Satellite Hybrid Tile Layer (Identical to MedicalEquipmentView)
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

        marker.bindTooltip('📍 จุดรับบริการ / บ้านผู้ร้อง (คลิกหรือลากเพื่อย้ายพิกัด)', {
          permanent: true,
          direction: 'top',
          offset: [0, -36],
        });

        marker.on('dragend', () => {
          const pt = marker.getLatLng();
          const lat = Number(pt.lat.toFixed(6));
          const lng = Number(pt.lng.toFixed(6));
          setSewageLat(lat);
          setSewageLng(lng);
        });

        map.on('click', (e: any) => {
          const lat = Number(e.latlng.lat.toFixed(6));
          const lng = Number(e.latlng.lng.toFixed(6));
          marker.setLatLng([lat, lng]);
          setSewageLat(lat);
          setSewageLng(lng);
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

  // Smoothly resize & recenter existing registration map when toggling fullscreen
  useEffect(() => {
    if (subTab !== 'form' || !regMapInstanceRef.current) return;
    const syncSize = () => {
      if (!regMapInstanceRef.current) return;
      regMapInstanceRef.current.invalidateSize({ animate: false });
      const center = regMarkerRef.current
        ? regMarkerRef.current.getLatLng()
        : [sewageLat || BANGPAO_COORDS['1'].lat, sewageLng || BANGPAO_COORDS['1'].lng];
      regMapInstanceRef.current.setView(center, regMapInstanceRef.current.getZoom(), { animate: false });
    };
    syncSize();
    const timers = [30, 120, 280].map((ms) => setTimeout(syncSize, ms));
    return () => timers.forEach(clearTimeout);
  }, [isRegMapFullscreen, subTab]);

  // Window resize observer for regMap
  useEffect(() => {
    if (subTab !== 'form' || !regMapContainerRef.current) return;
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

  // Jump to specific map pin and smooth scroll up to map
  const handleJumpToMapPin = (lat?: number, lng?: number) => {
    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
      updateRegMapPin(lat, lng, true);
      if (regMapContainerRef.current) {
        regMapContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // Delete petition with confirmation
  const handleDeletePetition = (id: string, code: string) => {
    if (window.confirm(`ยืนยันการลบรายการคำร้อง ${code} ออกจากระบบ?`)) {
      if (onDeletePetition) {
        onDeletePetition(id);
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Form Submission Handler (Sub-Tab 2)
  // ---------------------------------------------------------------------------
  const handleFormSubmit = (andPrint = false, andExportDocx = false) => {
    if (!applicantName.trim()) {
      setFormErrorMsg('กรุณากรอกชื่อ-นามสกุลของผู้ยื่นคำร้อง');
      setTimeout(() => setFormErrorMsg(''), 4000);
      return;
    }
    if (!applicantPhone.trim()) {
      setFormErrorMsg('กรุณากรอกหมายเลขโทรศัพท์ติดต่อ');
      setTimeout(() => setFormErrorMsg(''), 4000);
      return;
    }
    if (formType === 'general' && !generalSubject.trim()) {
      setFormErrorMsg('กรุณากรอกเรื่องที่ต้องการยื่นคำร้อง');
      setTimeout(() => setFormErrorMsg(''), 4000);
      return;
    }

    setFormErrorMsg('');

    const newId = `PET-${Date.now().toString().slice(-4)}`;
    const trackingCode = generateTrackingCode(formType);
    const todayIso = new Date().toISOString().slice(0, 10);
    const villageName = BANGPAO_VILLAGES[formMoo] || `หมู่ที่ ${formMoo}`;
    const fullAddress = `บ้านเลขที่ ${applicantHouseNo || '-'} หมู่ที่ ${formMoo} ${villageName} ต.${applicantSubdistrict} อ.${applicantDistrict} จ.${applicantProvince}`;

    const newPetition: PublicPetition = {
      id: newId,
      trackingCode,
      title:
        formType === 'sewage'
          ? `คำร้องขอรับบริการกำจัดสิ่งปฏิกูล (ดูดส้วม) - ม.${formMoo} ${villageName}`
          : generalSubject,
      category: formType === 'sewage' ? 'waste_sewage' : 'other',
      citizenName: applicantName,
      citizenIdCard: formatIdCard13(applicantIdCard),
      phone: formatPhone10(applicantPhone),
      address: fullAddress,
      moo: formMoo,
      latitude: sewageLat,
      longitude: sewageLng,
      description:
        formType === 'sewage'
          ? `${sewageTankType} ${sewageTankVol} ค่าธรรมเนียม ${calculatedFee} บาท (นัดหมาย ${sewagePreferredDate}) จุดสังเกต: ${sewageLandmark || '-'}`
          : generalPurpose,
      status: 'assigned',
      assignedOfficer: formType === 'sewage' ? sewageDriver : receivingOfficerName,
      submissionDate: todayIso,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      form: {
        formType,
        docNo: trackingCode,
        filedDate: todayIso,
        citizenName: applicantName,
        idCard: formatIdCard13(applicantIdCard),
        age: applicantAge,
        nationality: applicantNationality,
        phone: formatPhone10(applicantPhone),
        houseNo: applicantHouseNo,
        moo: formMoo,
        trokSoi: applicantTrokSoi,
        road: applicantRoad,
        subdistrict: applicantSubdistrict,
        district: applicantDistrict,
        province: applicantProvince,
        subject: formType === 'general' ? generalSubject : undefined,
        purpose: formType === 'general' ? generalPurpose : undefined,
        evidenceDoc: formType === 'general' ? generalEvidence : undefined,
        sewagePlace: formType === 'sewage' ? sewagePlace : undefined,
        tankType: formType === 'sewage' ? sewageTankType : undefined,
        tankVol: formType === 'sewage' ? sewageTankVol : undefined,
        sewageZone: formType === 'sewage' ? sewageZone : undefined,
        feeAmount: formType === 'sewage' ? calculatedFee : undefined,
        preferredDate: formType === 'sewage' ? sewagePreferredDate : undefined,
        assignedDriver: formType === 'sewage' ? sewageDriver : undefined,
        officerNote: {
          officerName: receivingOfficerName,
          officerPosition: receivingOfficerPosition,
          receivedDate: todayIso,
          opinion: receivingOfficerNote,
        },
      },
    };

    if (formType === 'sewage' && onAddSewagePetition) {
      onAddSewagePetition(newPetition);
    } else if (onAddPetition) {
      onAddPetition(newPetition);
    } else if (onAddNew) {
      onAddNew();
    }

    setFormSuccessMsg(`✅ บันทึกคำร้องสำเร็จ! รหัสติดตาม [${trackingCode}]`);
    setTimeout(() => setFormSuccessMsg(''), 5000);

    if (andPrint) {
      setSelectedPrintPetition(newPetition);
      setIsPrintModalOpen(true);
    } else if (andExportDocx) {
      exportPetitionDocx(newPetition, signers);
    }

    // Reset Form to initial clean state
    setApplicantName('');
    setApplicantIdCard('');
    setApplicantPhone('');
    setApplicantHouseNo('');
    setGeneralSubject('');
    setGeneralPurpose('');
  };

  // ---------------------------------------------------------------------------
  // Quick Status & Approval Actions
  // ---------------------------------------------------------------------------
    // ---------------------------------------------------------------------------
  // Easy 3-Step Status & Approval Workflow (เข้าใจง่าย 3 ขั้นตอน: รออนุมัติ -> จ่ายงาน -> ปิดงาน)
  // ---------------------------------------------------------------------------
  const handleOpenSimpleActionModal = (
    p: PublicPetition,
    suggestedStep?: 'pending' | 'assigned' | 'resolved' | 'rejected'
  ) => {
    setStatusActionPetition(p);
    const isSewage = resolveFormType(p) === 'sewage';

    // Auto-select logical next step
    let step: 'pending' | 'assigned' | 'resolved' | 'rejected' = 'assigned';
    if (suggestedStep) {
      step = suggestedStep;
    } else if (p.status === 'pending' || p.status === 'submitted') {
      step = 'assigned'; // Next: จ่ายงานลงพื้นที่
    } else if (p.status === 'assigned' || p.status === 'investigating' || p.status === 'accepted') {
      step = 'resolved'; // Next: ปิดงานเสร็จสิ้น
    } else if (p.status === 'resolved') {
      step = 'resolved';
    }

    setSelectedWorkflowStep(step);
    setActionOfficerName(
      p.assignedOfficer || (isSewage ? 'นายชนะ สุขด้วง (พนักงานขับรถ)' : 'พันจ่าเอกอานัส เด่นหมาด (จนท.สุขาภิบาล)')
    );
    setActionComment(p.resolutionNotes || (step === 'assigned' ? 'อนุมัติแล้ว มอบหมายเข้าปฏิบัติการ' : ''));
    setReceiptBookNo(p.form?.receiptBook || '01');
    setReceiptNo(p.form?.receiptNumber || '');
    setReceiptAmount(String(p.form?.feeAmount || 250));
  };

  const handleSaveAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusActionPetition) return;

    const nextStatus: PublicPetition['status'] = selectedWorkflowStep;
    let notes = actionComment.trim();

    if (selectedWorkflowStep === 'pending') {
      notes = notes || 'รับคำร้องแล้ว อยู่ระหว่างเสนอผู้บริหารลงนามอนุมัติ';
    } else if (selectedWorkflowStep === 'assigned') {
      notes = notes || `ผู้บริหารอนุมัติแล้ว มอบหมายให้ ${actionOfficerName || 'เจ้าหน้าที่'} ลงพื้นที่ปฏิบัติการ`;
    } else if (selectedWorkflowStep === 'resolved') {
      const isSewage = resolveFormType(statusActionPetition) === 'sewage';
      const receiptStr = (isSewage && (receiptBookNo || receiptNo))
        ? ` (ใบเสร็จเล่ม ${receiptBookNo || '01'} เลขที่ ${receiptNo || '001'} ${receiptAmount} บาท)`
        : '';
      notes = notes || `ปฏิบัติงานเรียบร้อยแล้ว${receiptStr} โดย ${actionOfficerName || statusActionPetition.assignedOfficer || 'ผู้ปฏิบัติงาน'}`;
    } else if (selectedWorkflowStep === 'rejected') {
      notes = notes || 'ยกเลิกคำร้อง';
    }

    onUpdateStatus(statusActionPetition.id, nextStatus, notes);

    // Update in-memory petition
    statusActionPetition.status = nextStatus;
    statusActionPetition.resolutionNotes = notes;
    if (actionOfficerName) {
      statusActionPetition.assignedOfficer = actionOfficerName;
    }
    if (selectedWorkflowStep === 'resolved') {
      statusActionPetition.resolvedDate = new Date().toISOString().split('T')[0];
      if (!statusActionPetition.form) statusActionPetition.form = {} as any;
      statusActionPetition.form!.receiptBook = receiptBookNo;
      statusActionPetition.form!.receiptNumber = receiptNo;
    }

    setStatusActionPetition(null);
  };

  // ---------------------------------------------------------------------------
  // KPI Statistics Summary
  // ---------------------------------------------------------------------------
  const totalCount = petitions.length;
  const pendingCount = petitions.filter((p) => p.status === 'pending' || p.status === 'submitted').length;
  const assignedCount = petitions.filter((p) => p.status === 'assigned' || p.status === 'investigating' || p.status === 'accepted' || p.status === 'in_progress').length;
  const activeCount = pendingCount + assignedCount;
  const resolvedCount = petitions.filter((p) => p.status === 'resolved').length;
  const sewageCount = petitions.filter((p) => p.category === 'waste_sewage').length;
  const generalCount = petitions.filter((p) => p.category !== 'waste_sewage').length;

  // Filtered Petitions List
  const filteredPetitions = useMemo(() => {
    return petitions.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        p.trackingCode.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.citizenName.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        (p.assignedOfficer && p.assignedOfficer.toLowerCase().includes(q));

      const matchStatus = selectedStatus === 'all' || p.status === selectedStatus;
      const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
      const matchMoo =
        selectedMoo === 'all' ||
        p.moo === selectedMoo ||
        p.address.includes(`หมู่ ${selectedMoo}`) ||
        p.address.includes(`หมู่ที่ ${selectedMoo}`);

      return matchSearch && matchStatus && matchCategory && matchMoo;
    });
  }, [petitions, search, selectedStatus, selectedCategory, selectedMoo]);

  // Active Queue Petitions (ตามขั้นตอนที่ 4: เมื่อเสร็จสิ้น/ปิดงาน ไม่ค้างไว้ในคิว แต่เก็บสถิติและประวัติไว้)
  const queuePetitions = useMemo(() => {
    return filteredPetitions.filter((p) => {
      if (selectedStatus === 'resolved') return p.status === 'resolved';
      if (selectedStatus !== 'all') return true;
      if (queueTabMode === 'active') return p.status !== 'resolved' && p.status !== 'rejected';
      if (queueTabMode === 'resolved') return p.status === 'resolved';
      return true;
    });
  }, [filteredPetitions, selectedStatus, queueTabMode]);

  // Filtered Petitions for Sub-Tab 2 Summary Tracking Table with Clear Status Sorting
  const filteredRegPetitions = useMemo(() => {
    const list = petitions.filter((p) => {
      const isSewage = resolveFormType(p) === 'sewage';

      // 1. Status Tab filter (แบ่งชัดเจน: งานที่ต้องทำ vs งานที่ทำเสร็จแล้ว)
      if (regTableStatusTab === 'active') {
        if (p.status === 'resolved' || p.status === 'rejected') return false;
      } else if (regTableStatusTab === 'pending') {
        if (!(p.status === 'pending' || p.status === 'submitted')) return false;
      } else if (regTableStatusTab === 'assigned') {
        if (!(p.status === 'assigned' || p.status === 'investigating' || p.status === 'accepted' || p.status === 'in_progress')) return false;
      } else if (regTableStatusTab === 'resolved') {
        if (p.status !== 'resolved') return false;
      }

      // 2. Category Filter
      if (regTableCategoryFilter === 'sewage' && !isSewage) return false;
      if (regTableCategoryFilter === 'general' && isSewage) return false;

      // 3. Moo filter
      if (regTableMooFilter !== 'all') {
        const parsedAddr = resolvePetitionAddress(p, p.form);
        const pMoo = p.moo ? String(p.moo).trim() : (parsedAddr.moo || '');
        if (String(pMoo).trim() !== String(regTableMooFilter).trim()) return false;
      }

      // 4. Status dropdown filter
      if (regTableStatusFilter !== 'all') {
        if (regTableStatusFilter === 'pending' && !(p.status === 'pending' || p.status === 'submitted')) return false;
        if (regTableStatusFilter === 'assigned' && !(p.status === 'assigned' || p.status === 'investigating' || p.status === 'accepted' || p.status === 'in_progress')) return false;
        if (regTableStatusFilter === 'resolved' && p.status !== 'resolved') return false;
        if (regTableStatusFilter === 'rejected' && p.status !== 'rejected') return false;
      }

      // 5. Search query
      if (regTableSearch.trim()) {
        const q = regTableSearch.toLowerCase().trim();
        const matchName = (p.citizenName || '').toLowerCase().includes(q);
        const matchId = (p.citizenIdCard || p.form?.idCard || '').replace(/\D/g, '').includes(q.replace(/\D/g, ''));
        const matchCode = (p.trackingCode || '').toLowerCase().includes(q);
        const matchTitle = (p.title || '').toLowerCase().includes(q);
        const matchDesc = (p.description || '').toLowerCase().includes(q);
        const matchSubject = (p.form?.subject || '').toLowerCase().includes(q);
        const matchPhone = (p.phone || '').replace(/\D/g, '').includes(q.replace(/\D/g, ''));
        const matchAddr = (p.address || '').toLowerCase().includes(q);
        if (!matchName && !matchId && !matchCode && !matchTitle && !matchDesc && !matchSubject && !matchPhone && !matchAddr) {
          return false;
        }
      }

      return true;
    });

    // 6. Intelligent Status Sorting (งานที่ยังไม่ทำ/รออนุมัติ ขึ้นก่อนเสมอ ตามด้วยกำลังทำ และเสร็จแล้วไว้ท้ายสุด)
    const getStatusPriority = (s: string) => {
      if (s === 'pending' || s === 'submitted') return 1; // รออนุมัติ
      if (s === 'assigned' || s === 'investigating' || s === 'accepted' || s === 'in_progress') return 2; // กำลังลงพื้นที่
      if (s === 'resolved') return 3; // ทำเสร็จแล้ว
      return 4; // ยกเลิก
    };

    return list.sort((a, b) => {
      const prioA = getStatusPriority(a.status);
      const prioB = getStatusPriority(b.status);
      if (prioA !== prioB) return prioA - prioB;
      const dateA = new Date(a.createdAt || a.submissionDate || 0).getTime();
      const dateB = new Date(b.createdAt || b.submissionDate || 0).getTime();
      return dateB - dateA;
    });
  }, [petitions, regTableStatusTab, regTableCategoryFilter, regTableMooFilter, regTableStatusFilter, regTableSearch]);

  // Citizen Portal Search Handler
  const handleTrackingSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = trackingQuery.trim().toLowerCase();
    if (!q) return;

    const found = petitions.find(
      (p) =>
        p.trackingCode.toLowerCase() === q ||
        cleanDigits(p.citizenIdCard) === cleanDigits(q) ||
        cleanDigits(p.phone) === cleanDigits(q) ||
        p.trackingCode.toLowerCase().includes(q)
    );
    setActiveTrackingResult(found || null);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* ===================================================================== */}
      {/* Top Banner & Sub-Navigation Pills (Matching System 4 Excellence)       */}
      {/* ===================================================================== */}
      <div className="bg-gradient-to-r from-teal-900 via-cyan-950 to-slate-900 text-white p-5 sm:p-7 rounded-3xl shadow-lg relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-5 border border-teal-700/40">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-200 text-xs sm:text-[13px] font-bold mb-2 border border-cyan-400/30">
            <MessageSquareWarning className="w-4 h-4 text-cyan-300" />
            <span>ศูนย์บริการเบ็ดเสร็จ (One Stop Service) กองสาธารณสุขและสิ่งแวดล้อม</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight flex items-center gap-2">
            <span>📋 ระบบยื่นคำร้องและบริการประชาชน (ทต.บางเป้า)</span>
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-cyan-100/90 leading-relaxed font-normal">
            รับคำร้องทั่วไป, เรื่องร้องเรียนเหตุรำคาญ, บริการสูบสิ่งปฏิกูล (ดูดส้วม), จัดการคิวงานลงพื้นที่ และพิมพ์เอกสารราชการ A4 ตราครุฑ
          </p>
        </div>

        {/* 2 Main Sub-Navigation Pills (ตามคำสั่งผู้ใช้: 1แดชบอร์ดติดตามคำร้อง 2แบบฟอร์มคำร้อง) */}
        <div className="flex items-center bg-cyan-950/80 p-1.5 rounded-2xl border border-cyan-700/50 shrink-0 overflow-x-auto no-scrollbar shadow-inner">
          <button
            onClick={() => setSubTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all whitespace-nowrap cursor-pointer ${
              subTab === 'dashboard'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-cyan-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>📊 1. แดชบอร์ดติดตามคำร้อง</span>
          </button>

          <button
            onClick={() => setSubTab('form')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all whitespace-nowrap cursor-pointer ${
              subTab === 'form'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-cyan-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <FileEdit className="w-4 h-4" />
            <span>📝 2. แบบฟอร์มคำร้อง</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 6 Summary Stat KPI Cards                                             */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-[11px] sm:text-xs font-bold text-slate-500">คำร้องทั้งหมด</div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">{totalCount} เรื่อง</div>
          <div className="text-[10px] text-slate-400 mt-0.5">ปีงบประมาณ 2569</div>
        </div>

        <div className="bg-amber-50/70 p-3.5 sm:p-4 rounded-2xl border border-amber-200 shadow-2xs">
          <div className="text-[11px] sm:text-xs font-bold text-amber-700">รอดำเนินการ</div>
          <div className="text-xl sm:text-2xl font-black text-amber-800 mt-0.5">{pendingCount} เรื่อง</div>
          <div className="text-[10px] text-amber-600 mt-0.5">รอส่งนายตรวจ/อนุมัติ</div>
        </div>

        <div className="bg-blue-50/70 p-3.5 sm:p-4 rounded-2xl border border-blue-200 shadow-2xs">
          <div className="text-[11px] sm:text-xs font-bold text-blue-700">ลงพื้นที่ / จ่ายงาน</div>
          <div className="text-xl sm:text-2xl font-black text-blue-800 mt-0.5">{assignedCount} เรื่อง</div>
          <div className="text-[10px] text-blue-600 mt-0.5">จนท.เข้าปฏิบัติการ</div>
        </div>

        <div className="bg-emerald-50/70 p-3.5 sm:p-4 rounded-2xl border border-emerald-200 shadow-2xs">
          <div className="text-[11px] sm:text-xs font-bold text-emerald-700">แก้ไขแล้วเสร็จ</div>
          <div className="text-xl sm:text-2xl font-black text-emerald-800 mt-0.5">{resolvedCount} เรื่อง</div>
          <div className="text-[10px] text-emerald-600 mt-0.5">รายงานผลเรียบร้อย</div>
        </div>

        <div className="bg-orange-50/70 p-3.5 sm:p-4 rounded-2xl border border-orange-200 shadow-2xs">
          <div className="text-[11px] sm:text-xs font-bold text-orange-700 flex items-center gap-1">
            <Truck className="w-3.5 h-3.5" />
            <span>สูบสิ่งปฏิกูล</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-orange-800 mt-0.5">{sewageCount} เรื่อง</div>
          <div className="text-[10px] text-orange-600 mt-0.5">รถสูบส้วมเทศบาล</div>
        </div>

        <div className="bg-teal-50/70 p-3.5 sm:p-4 rounded-2xl border border-teal-200 shadow-2xs">
          <div className="text-[11px] sm:text-xs font-bold text-teal-700 flex items-center gap-1">
            <MessageSquareWarning className="w-3.5 h-3.5" />
            <span>เหตุรำคาญ / ทั่วไป</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-teal-800 mt-0.5">{generalCount} เรื่อง</div>
          <div className="text-[10px] text-teal-600 mt-0.5">กลิ่น, เสียง, ขยะ, ยุง</div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SUB-TAB 1: 📊 แดชบอร์ดติดตาม & แผนที่ GIS จัดการคำร้อง                     */}
      {/* ===================================================================== */}
      {subTab === 'dashboard' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาเลขที่คำร้อง (ST-..., REQ-...), ชื่อผู้ยื่น, เบอร์โทร, ที่อยู่..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Village Filter */}
              <select
                value={selectedMoo}
                onChange={(e) => setSelectedMoo(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-700"
              >
                <option value="all">ทุกหมู่บ้าน (ม.1 - ม.7)</option>
                {Object.entries(BANGPAO_VILLAGES).map(([moo, name]) => (
                  <option key={moo} value={moo}>
                    หมู่ {moo} {name}
                  </option>
                ))}
              </select>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-700"
              >
                <option value="all">ทุกประเภทคำร้อง</option>
                <option value="waste_sewage">🚛 สูบสิ่งปฏิกูล (ดูดส้วม)</option>
                <option value="nuisance_smell">💨 กลิ่นเหม็น / เผาขยะ</option>
                <option value="nuisance_noise">🔊 เสียงดังรบกวน</option>
                <option value="fogging_spray">🦟 พ่นหมอกควันกำจัดยุง</option>
                <option value="other">📋 คำร้องทั่วไปอื่นๆ</option>
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-700"
              >
                <option value="all">ทุกสถานะ</option>
                <option value="pending">⏳ รอดำเนินการ</option>
                <option value="assigned">📋 มอบหมาย/นัดหมาย</option>
                <option value="investigating">🔍 กำลังตรวจสอบ</option>
                <option value="resolved">✅ เสร็จสิ้น</option>
              </select>

              {/* Export CSV */}
              <button
                onClick={() => exportPetitionRegisterCsv(filteredPetitions, signers)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                title="ส่งออกรายการคำร้องเป็น Excel/CSV"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span className="hidden sm:inline">ส่งออก CSV</span>
              </button>

              {/* Add New Button */}
              <button
                onClick={() => setSubTab('form')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>+ ยื่นคำร้องใหม่</span>
              </button>
            </div>
          </div>

          {/* Interactive Split View: Left GIS Map + Right Queue Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Column: Interactive GIS Map */}
            <div
              className={`lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col transition-all ${
                isMapFullscreen ? 'fixed inset-4 z-[9999] shadow-2xl' : 'h-[620px]'
              }`}
            >
              {/* Map Header */}
              <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold">แผนที่ดาวเทียมแสดงพิกัดคำร้อง (Google Hybrid)</span>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">• ต.บางเป้า อ.กันตัง</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      if (mapInstanceRef.current) {
                        mapInstanceRef.current.setView(
                          [BANGPAO_MUNICIPALITY_COORDS.lat, BANGPAO_MUNICIPALITY_COORDS.lng],
                          14
                        );
                      }
                    }}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1"
                    title="กลับจุดศูนย์กลางเทศบาล"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">ศูนย์กลาง</span>
                  </button>

                  <button
                    onClick={() => setIsMapFullscreen(!isMapFullscreen)}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title={isMapFullscreen ? 'ย่อแผนที่' : 'ขยายเต็มจอ'}
                  >
                    {isMapFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Map Container */}
              <div className="flex-1 min-h-[460px] h-[520px] relative w-full overflow-hidden bg-slate-100">
                <div
                  ref={mapContainerRef}
                  className="w-full h-full"
                  style={{ width: '100%', height: '100%', minHeight: '460px', position: 'absolute', inset: 0 }}
                />
              </div>

              {/* Map Footer Legend */}
              <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-[11px] flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 font-semibold text-slate-700">
                    <span className="w-3 h-3 rounded-full bg-orange-500 inline-block" /> สูบสิ่งปฏิกูล
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-slate-700">
                    <span className="w-3 h-3 rounded-full bg-teal-600 inline-block" /> เหตุรำคาญ/คำร้องทั่วไป
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-slate-700">
                    <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block" /> เสร็จสิ้น
                  </span>
                </div>
                <span className="text-slate-400">คลิกที่หมุดเพื่อดูข้อมูลและสั่งพิมพ์</span>
              </div>
            </div>

            {/* Right Column: Queue & Petition Cards List */}
            <div className="lg:col-span-5 flex flex-col h-[620px] bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0 flex-wrap gap-2">
                <div className="flex items-center gap-1.5">
                  <ClipboardList className="w-4 h-4 text-teal-700" />
                  <span className="text-xs font-extrabold text-slate-800">
                    {queueTabMode === 'active' ? 'คิวงานรอปฏิบัติ' : queueTabMode === 'resolved' ? 'ประวัติงานเสร็จสิ้น' : 'คำร้องในคิว'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-900 border border-teal-200 text-[10.5px] font-black">
                    {queuePetitions.length}
                  </span>
                </div>

                {/* Queue Active / Resolved Filter Tabs (เมื่อเสร็จสิ้นจะไม่อยู่ในคิวรอปฏิบัติ) */}
                <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setQueueTabMode('active')}
                    className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                      queueTabMode === 'active'
                        ? 'bg-white text-teal-950 shadow-xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    รอปฏิบัติ ({filteredPetitions.filter(p => p.status !== 'resolved' && p.status !== 'rejected').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setQueueTabMode('resolved')}
                    className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                      queueTabMode === 'resolved'
                        ? 'bg-white text-emerald-950 shadow-xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    เสร็จสิ้น ({filteredPetitions.filter(p => p.status === 'resolved').length})
                  </button>
                </div>
              </div>

              {/* Cards Scroll Area */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 no-scrollbar">
                {queuePetitions.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    {queueTabMode === 'active' ? 'ไม่มีงานค้างในคิวรอปฏิบัติการ 🎉' : 'ไม่พบรายการที่ตรงกับเงื่อนไข'}
                  </div>
                ) : (
                  queuePetitions.map((p) => {
                    const isSewage = resolveFormType(p) === 'sewage';
                    const isDone = p.status === 'resolved';
                    const isPending = p.status === 'pending' || p.status === 'submitted';
                    const isActive = activeMapPetitionId === p.id;
                    const mooStr = p.moo ? `ม.${p.moo}` : '';

                    return (
                      <div
                        key={p.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isActive
                            ? 'border-teal-500 bg-teal-50/50 shadow-md ring-2 ring-teal-400/40'
                            : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/60 shadow-2xs'
                        }`}
                      >
                        {/* Header: Tracking Code, Category, Status */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[11px] font-extrabold px-2 py-0.5 bg-slate-900 text-white rounded-lg">
                              {p.trackingCode}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                                isSewage
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-teal-100 text-teal-800'
                              }`}
                            >
                              {isSewage ? '🚛 สูบส้วม' : '📋 คำร้องทั่วไป'}
                            </span>
                            {mooStr && (
                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-600">
                                {mooStr}
                              </span>
                            )}
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                              isDone
                                ? 'bg-emerald-100 text-emerald-800'
                                : isPending
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {isDone
                              ? '✅ เสร็จสิ้น'
                              : isPending
                              ? '⏳ รอดำเนินการ'
                              : '🔍 จ่ายงาน/ลงพื้นที่'}
                          </span>
                        </div>

                        {/* Title & Description */}
                        <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 leading-snug">
                          {p.title}
                        </h4>
                        <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                          {p.description}
                        </p>

                        {/* Applicant details */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1 font-semibold text-slate-700">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span>{p.citizenName}</span>
                            </span>
                            <a
                              href={`tel:${cleanDigits(p.phone)}`}
                              className="text-teal-700 hover:text-teal-800 font-bold inline-flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{p.phone}</span>
                            </a>
                          </div>

                          <div className="flex items-start gap-1 text-[10px] text-slate-400">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-1">{p.address}</span>
                          </div>

                          {p.assignedOfficer && (
                            <div className="text-[10px] text-blue-600 font-medium">
                              ผู้รับผิดชอบ: {p.assignedOfficer}
                            </div>
                          )}
                        </div>

                        {/* Action Toolbar */}
                        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            {/* Locate on Map */}
                            <button
                              onClick={() => handleLocateOnMap(p)}
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-teal-700 text-xs transition-colors cursor-pointer"
                              title="ดูพิกัดบนแผนที่"
                            >
                              <Crosshair className="w-3.5 h-3.5" />
                            </button>

                            {/* Google Maps External Navigation */}
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                `${p.address} ต.บางเป้า อ.กันตัง จ.ตรัง`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-blue-700 text-xs transition-colors"
                              title="เปิดนำทางผ่าน Google Maps"
                            >
                              <Navigation className="w-3.5 h-3.5" />
                            </a>

                            {/* Direct Word Export */}
                            <button
                              onClick={() => exportPetitionDocx(p, signers)}
                              className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 text-xs transition-colors cursor-pointer"
                              title="ส่งออกไฟล์ Word (.docx)"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* Step Action Button */}
                            {p.status === 'resolved' ? (
                              <button
                                type="button"
                                onClick={() => handleOpenSimpleActionModal(p, 'resolved')}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[11px] font-bold border border-emerald-300 transition-all cursor-pointer flex items-center gap-1"
                                title="งานนี้เสร็จสิ้นแล้ว (คลิกเพื่อดูหรือปรับสถานะ)"
                              >
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>ปิดงานแล้ว</span>
                                <Settings className="w-3 h-3 text-emerald-600 opacity-60" />
                              </button>
                            ) : (p.status === 'assigned' || p.status === 'investigating' || p.status === 'accepted' || p.status === 'in_progress') ? (
                              <button
                                type="button"
                                onClick={() => handleOpenSimpleActionModal(p, 'resolved')}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-extrabold flex items-center gap-1 shadow-2xs transition-all active:scale-95 cursor-pointer"
                                title="ทีมงานลงพื้นที่ทำเสร็จแล้ว ➔ บันทึกปิดงาน"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>ปิดงาน ✓</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenSimpleActionModal(p, 'assigned')}
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-extrabold flex items-center gap-1 shadow-2xs transition-all active:scale-95 cursor-pointer"
                                title="ผู้บริหารอนุมัติแล้ว ➔ มอบหมายจ่ายงานลงพื้นที่"
                              >
                                <Truck className="w-3.5 h-3.5" />
                                <span>จ่ายงาน ➔</span>
                              </button>
                            )}

                            {/* Official Print A4 Button */}
                            <button
                              onClick={() => {
                                setSelectedPrintPetition(p);
                                setIsPrintModalOpen(true);
                              }}
                              className="px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-all active:scale-95 cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>พิมพ์ A4</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ================================================================= */}
        {/* ตารางงาน สรุป ต่างๆ ประเภทต่างๆ (ตรงตามภาพ 5 จากระบบยืมคืน)       */}
        {/* ================================================================= */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-xs space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-teal-100 text-teal-800 rounded-xl">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                    จัดการรายการคำร้องบริการประชาชน & ติดตามกระบวนการ (อนุมัติ / ออกหนังสือ / ดำเนินการ)
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-xs font-extrabold">
                    {regTableSearch || regTableMooFilter !== 'all' || regTableStatusFilter !== 'all' || regTableStatusTab !== 'all' || regTableCategoryFilter !== 'all'
                      ? `พบ ${filteredRegPetitions.length} จาก ${petitions.length} รายการ`
                      : `ทั้งหมด ${petitions.length} รายการ`}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  กระบวนการ: ยื่นคำร้อง ➔ เสนอผู้บริหารอนุมัติ ➔ พิมพ์เอกสารราชการ A4 / ส่งออก Word (.docx) ➔ ลงพื้นที่ปฏิบัติงาน ➔ รายงานผลแล้วเสร็จ
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
                <option value="pending">⏳ รอเสนอผู้บริหารลงนาม / อนุมัติ</option>
                <option value="assigned">🚚 จ่ายงาน / ลงพื้นที่ปฏิบัติการ</option>
                <option value="resolved">✅ แก้ไขแล้วเสร็จ</option>
                <option value="rejected">❌ ยกเลิกคำร้อง</option>
              </select>

              {/* Search Input */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={regTableSearch}
                  onChange={(e) => setRegTableSearch(e.target.value)}
                  placeholder="ค้นหาชื่อ, เลขบัตร, เรื่อง, รหัส..."
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

              {/* Signer Settings Button */}
              <button
                type="button"
                onClick={() => {
                  setSelectedPrintPetition(petitions[0] || null);
                  setIsPrintModalOpen(true);
                }}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95 shrink-0"
                title="ตั้งค่าผู้ลงนาม (ผอ.กอง, ปลัดเทศบาล, นายกเทศมนตรี)"
              >
                <Settings className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">ตั้งค่าผู้ลงนาม</span>
              </button>
            </div>
          </div>

          {/* Two-Tier Work Status & Category Navigation */}
          <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto pb-1 text-xs">
            {/* Master Queue / Status Tabs */}
            <button
              type="button"
              onClick={() => setRegTableStatusTab('active')}
              className={`px-3 py-1.5 rounded-xl font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                regTableStatusTab === 'active'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
              }`}
              title="แสดงเฉพาะงานที่ยังไม่เสร็จ (รอเสนออนุมัติ + กำลังลงพื้นที่)"
            >
              <span>⚡ คิวงานที่ต้องดำเนินการ ({activeCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setRegTableStatusTab('pending')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                regTableStatusTab === 'pending'
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>⏳ รอเสนออนุมัติ ({pendingCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setRegTableStatusTab('assigned')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                regTableStatusTab === 'assigned'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Truck className="w-3.5 h-3.5 text-blue-600" />
              <span>🚚 กำลังลงพื้นที่ ({assignedCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setRegTableStatusTab('resolved')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                regTableStatusTab === 'resolved'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}
              title="แสดงเฉพาะงานที่เสร็จสิ้นแล้ว"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>✅ ปฏิบัติงานแล้วเสร็จ ({resolvedCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setRegTableStatusTab('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                regTableStatusTab === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
              title="แสดงรายการทั้งหมด (เรียงลำดับงานที่ยังไม่ทำขึ้นก่อน)"
            >
              <span>📋 ทั้งหมด ({petitions.length})</span>
            </button>

            <div className="h-4 w-px bg-slate-300 mx-1 hidden sm:block" />

            {/* Category Filter Buttons */}
            <button
              type="button"
              onClick={() => setRegTableCategoryFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                regTableCategoryFilter === 'all'
                  ? 'bg-teal-700 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              หมวด: ทั้งหมด
            </button>
            <button
              type="button"
              onClick={() => setRegTableCategoryFilter('sewage')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                regTableCategoryFilter === 'sewage'
                  ? 'bg-orange-600 text-white'
                  : 'bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200'
              }`}
            >
              <Truck className="w-3 h-3" />
              <span>สูบสิ่งปฏิกูล ({sewageCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setRegTableCategoryFilter('general')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                regTableCategoryFilter === 'general'
                  ? 'bg-teal-800 text-white'
                  : 'bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200'
              }`}
            >
              <FileText className="w-3 h-3" />
              <span>คำร้องทั่วไป ({generalCount})</span>
            </button>
          </div>

        {/* Responsive Table Matching Image 5 */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs bg-white">
            <table className="w-full text-left text-xs sm:text-[13px] min-w-[1050px] border-collapse">
              <thead className="bg-slate-50/90 text-slate-700 font-extrabold border-b border-slate-200 text-xs tracking-wider select-none">
                <tr>
                  <th className="py-3.5 px-3.5 w-[210px] min-w-[190px]">รหัส & วันที่ยื่นคำร้อง</th>
                  <th className="py-3.5 px-3.5 w-[230px] min-w-[210px]">ผู้ยื่นคำร้อง & ติดต่อ</th>
                  <th className="py-3.5 px-3.5 w-[230px] min-w-[210px]">ที่อยู่ขอรับบริการ & พิกัด</th>
                  <th className="py-3.5 px-4 min-w-[270px]">รายละเอียดงาน / การนัดหมาย</th>
                  <th className="py-3.5 px-3.5 w-[240px] min-w-[220px] text-right whitespace-nowrap">สถานะ & จัดการกระบวนการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRegPetitions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 px-6 text-center text-slate-400">
                      <div className="text-2xl mb-1">🔍</div>
                      <div className="font-bold text-slate-600">ไม่พบรายการคำร้องตามเงื่อนไขที่เลือก</div>
                      <div className="text-xs text-slate-400 mt-1">ลองเปลี่ยนคำค้นหา หรือเลือกตัวกรองสถานะเป็น &ldquo;ทั้งหมด&rdquo;</div>
                    </td>
                  </tr>
                ) : (
                  filteredRegPetitions.map((p) => {
                    const formTypeP = resolveFormType(p);
                    const isSewage = formTypeP === 'sewage';
                    const parsedAddr = resolvePetitionAddress(p, p.form);
                    const mooNum = p.moo ? String(p.moo).trim() : (parsedAddr.moo || '1');
                    const villageTitle = BANGPAO_VILLAGES[mooNum] ? BANGPAO_VILLAGES[mooNum] : `หมู่ที่ ${mooNum}`;
                    const villageName = `หมู่ที่ ${mooNum} ${villageTitle.replace(/^หมู่ที่\s*\d+\s*/, '')}`;
                    const latNum = Number(p.latitude);
                    const lngNum = Number(p.longitude);
                    const isAssigned = p.status === 'assigned' || p.status === 'investigating' || p.status === 'accepted' || p.status === 'in_progress';
                    const isResolved = p.status === 'resolved';

                    const rowStyle = isResolved
                      ? 'border-l-4 border-l-emerald-500 bg-emerald-50/15 hover:bg-emerald-50/30'
                      : isAssigned
                      ? 'border-l-4 border-l-blue-500 bg-blue-50/20 hover:bg-blue-50/40'
                      : p.status === 'rejected'
                      ? 'border-l-4 border-l-rose-300 bg-rose-50/20 hover:bg-rose-50/40 opacity-70'
                      : 'border-l-4 border-l-amber-500 bg-amber-50/35 hover:bg-amber-50/55';

                    return (
                      <tr
                        key={p.id}
                        className={`transition-colors group ${rowStyle}`}
                      >
                        {/* 1. รหัสคำร้อง & วันที่ยื่น */}
                        <td className="py-3.5 px-3.5 align-top">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-black bg-slate-900 text-white shadow-2xs">
                                {p.trackingCode}
                              </span>
                              <span className="text-[11px] text-slate-500 font-semibold">
                                📅 {formatThaiDate(p.createdAt || p.submissionDate)}
                              </span>
                            </div>
                            <div>
                              {isSewage ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-100 text-orange-800 border border-orange-200">
                                  <Truck className="w-3 h-3 text-orange-600" />
                                  <span>สูบสิ่งปฏิกูล (ดูดส้วม)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-100 text-teal-800 border border-teal-200">
                                  <FileText className="w-3 h-3 text-teal-700" />
                                  <span>{PETITION_CATEGORY_LABELS[p.category] || 'คำร้องทั่วไป'}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 2. ข้อมูลผู้ยื่นคำร้อง & ติดต่อ */}
                        <td className="py-3.5 px-3.5 align-top">
                          <div className="space-y-1">
                            <div className="font-black text-slate-900 text-[13px]">
                              {p.citizenName || '-'}
                            </div>

                            {p.phone ? (
                              <a
                                href={`tel:${cleanDigits(p.phone)}`}
                                className="text-[11px] text-teal-700 hover:text-teal-900 font-mono font-bold flex items-center gap-1 whitespace-nowrap"
                              >
                                <Phone className="w-3 h-3 text-teal-600" />
                                <span>{formatPhone10(p.phone)}</span>
                              </a>
                            ) : (
                              <div className="text-[11px] text-slate-400">-</div>
                            )}

                            {(p.citizenIdCard || p.form?.idCard) && (
                              <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                                <CreditCard className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{formatIdCard13(p.citizenIdCard || p.form?.idCard)}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 3. ที่อยู่ขอรับบริการ & พิกัด GPS */}
                        <td className="py-3.5 px-3.5 align-top">
                          <div className="space-y-1.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-teal-50 text-teal-900 border border-teal-200 font-extrabold text-xs whitespace-nowrap shadow-2xs">
                              📍 {villageName}
                            </span>
                            <div className="text-[11px] text-slate-600 line-clamp-2 leading-tight">
                              {p.address || `หมู่ที่ ${mooNum} ต.บางเป้า`}
                            </div>
                            {!isNaN(latNum) && !isNaN(lngNum) && (
                              <button
                                type="button"
                                onClick={() => handleJumpToMapPin(latNum, lngNum)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-slate-200 hover:border-teal-300 font-mono text-[10px] font-bold whitespace-nowrap shadow-2xs cursor-pointer transition-colors"
                                title="คลิกเพื่อดูหมุดพิกัดบนแผนที่ด้านบน"
                              >
                                <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                                <span>{latNum.toFixed(5)}, {lngNum.toFixed(5)}</span>
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 4. รายละเอียดงาน & การนัดหมาย */}
                        <td className="py-3.5 px-4 align-top">
                          {isSewage ? (
                            <div className="space-y-1 text-xs text-slate-700">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900">
                                  {p.form?.tankType || 'บ่อเกรอะ/บ่อซึม'}
                                </span>
                                <span className="text-slate-400">•</span>
                                <span className="font-semibold text-slate-600">
                                  {p.form?.tankVol || '1 เที่ยว'}
                                </span>
                              </div>

                              <div className="text-[11px] text-teal-800 flex items-center gap-1 font-semibold">
                                <Calendar className="w-3 h-3 text-teal-600" />
                                <span>นัดหมาย: {p.form?.preferredDate ? formatThaiDate(p.form.preferredDate) : 'ตามคิวปกติ'}</span>
                              </div>

                              <div className="flex items-center gap-2 flex-wrap text-[11px]">
                                <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                  p.form?.receiptNo || p.status === 'resolved'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}>
                                  <DollarSign className="w-3 h-3" />
                                  <span>{formatMoney(p.form?.feeAmount || 250)} บ. ({p.form?.receiptNo || p.status === 'resolved' ? 'ชำระแล้ว' : 'รอชำระ'})</span>
                                </span>

                                {p.form?.assignedDriver && (
                                  <span className="text-slate-500 text-[10px]">
                                    🚛 {p.form.assignedDriver}
                                  </span>
                                )}
                              </div>

                              {p.resolutionNotes && (
                                <div className="text-[10px] text-slate-500 bg-white/70 p-1.5 rounded-md border border-slate-200/60 line-clamp-2">
                                  💬 {p.resolutionNotes}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-1 text-xs text-slate-700">
                              <div className="font-extrabold text-slate-900 line-clamp-1">
                                {p.title || p.form?.subject || '-'}
                              </div>
                              <div className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                                {p.description || p.form?.purpose || '-'}
                              </div>
                              {p.form?.evidenceDoc && (
                                <div className="text-[10px] text-slate-500 line-clamp-1">
                                  📎 หลักฐาน: {p.form.evidenceDoc}
                                </div>
                              )}
                              {p.resolutionNotes && (
                                <div className="text-[10px] text-slate-500 bg-white/70 p-1.5 rounded-md border border-slate-200/60 line-clamp-2">
                                  💬 {p.resolutionNotes}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 5. สถานะ & จัดการกระบวนการ */}
                        <td className="py-3.5 px-3.5 align-top text-right whitespace-nowrap">
                          <div className="space-y-2">
                            <div className="flex justify-end">
                              {isResolved ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>แก้ไขแล้วเสร็จ</span>
                                </span>
                              ) : isAssigned ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-800 border border-blue-300">
                                  <Truck className="w-3.5 h-3.5 text-blue-600" />
                                  <span>อยู่ระหว่างลงพื้นที่</span>
                                </span>
                              ) : p.status === 'rejected' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">
                                  <X className="w-3.5 h-3.5 text-rose-600" />
                                  <span>ยกเลิกคำร้อง</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                                  <span>รอเสนออนุมัติ</span>
                                </span>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="inline-flex items-center justify-end gap-1.5 flex-wrap">
                              {/* 1. Direct Next Logical Action Button */}
                              {isResolved ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenSimpleActionModal(p, 'resolved')}
                                  className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 border border-emerald-300"
                                  title="งานนี้เสร็จสิ้นแล้ว (คลิกเพื่อดูรายละเอียดหรือแก้ไข)"
                                >
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="hidden xl:inline">ปิดงานแล้ว</span>
                                  <Settings className="w-3 h-3 text-emerald-600 opacity-60 ml-0.5" />
                                </button>
                              ) : isAssigned ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenSimpleActionModal(p, 'resolved')}
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs active:scale-95"
                                  title="ทีมลงพื้นที่ทำเสร็จแล้ว ➔ บันทึกปิดงาน"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>ปิดงาน ✓</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenSimpleActionModal(p, 'assigned')}
                                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-black transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs active:scale-95"
                                  title="ผู้บริหารอนุมัติแล้ว ➔ มอบหมายจ่ายงานลงพื้นที่"
                                >
                                  <Truck className="w-3.5 h-3.5" />
                                  <span>จ่ายงาน ➔</span>
                                </button>
                              )}

                              {/* 2. Print Official A4 */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPrintPetition(p);
                                  setIsPrintModalOpen(true);
                                }}
                                className="p-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 border border-teal-200"
                                title="พิมพ์แบบฟอร์มทางการ A4 (ตามแม่แบบราชการ)"
                              >
                                <Printer className="w-3.5 h-3.5 text-teal-700" />
                                <span className="hidden xl:inline">พิมพ์ A4</span>
                              </button>

                              {/* 3. Export Word .docx */}
                              <button
                                type="button"
                                onClick={() => exportPetitionDocx(p, signers)}
                                className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 border border-blue-200"
                                title="ดาวน์โหลดไฟล์ Word (.docx) ตามแม่แบบราชการ"
                              >
                                <Download className="w-3.5 h-3.5 text-blue-700" />
                                <span className="hidden xl:inline">Word</span>
                              </button>

                              {/* 4. Delete */}
                              <button
                                type="button"
                                onClick={() => handleDeletePetition(p.id, p.trackingCode)}
                                className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg text-xs transition-colors cursor-pointer border border-transparent hover:border-rose-200"
                                title="ลบคำร้อง"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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

      {/* ===================================================================== */}
      {/* SUB-TAB 2: 📝 ยื่นคำร้องใหม่ (แบบฟอร์มตามแม่แบบราชการ)                 */}
      {/* ===================================================================== */}
      {subTab === 'form' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Main Form Left Column */}
          <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-2xs space-y-6">
            {/* Form Header with Type Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <FileSignature className="w-5 h-5 text-teal-600" />
                  <span>บันทึกแบบคำร้องขอรับบริการ (เทศบาลตำบลบางเป้า)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  กรอกข้อมูลเพื่อสร้างเอกสารราชการ A4 และส่งออกเป็นไฟล์ Word (.docx)
                </p>
              </div>

              {/* Form Switcher Toggle */}
              <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setFormType('general')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    formType === 'general'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>แบบคำร้องทั่วไป</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormType('sewage')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    formType === 'sewage'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>คำร้องสูบสิ่งปฏิกูล</span>
                </button>
              </div>
            </div>

            {/* Notification messages */}
            {formSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{formSuccessMsg}</span>
              </div>
            )}
            {formErrorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span>{formErrorMsg}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleFormSubmit(false, false);
              }}
              className="space-y-6 text-xs text-slate-700"
            >
              {/* SECTION 1: ข้อมูลผู้ยื่นคำร้อง */}
              <div className="space-y-3">
                <div className="text-xs font-extrabold text-teal-800 flex items-center gap-1.5 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-100">
                  <User className="w-3.5 h-3.5" />
                  <span>ส่วนที่ 1: ข้อมูลผู้ยื่นคำร้อง</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-600 font-semibold mb-1">
                      ชื่อ - สกุล ผู้ยื่นคำร้อง <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น นายสมชาย หมายมั่น"
                      value={applicantName}
                      onChange={(e) => setApplicantName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">
                      เบอร์โทรศัพท์ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="08x-xxx-xxxx"
                      value={applicantPhone}
                      onChange={(e) => setApplicantPhone(formatPhone10(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">
                      เลขประจำตัวประชาชน 13 หลัก
                    </label>
                    <input
                      type="text"
                      placeholder="x-xxxx-xxxxx-xx-x"
                      value={applicantIdCard}
                      onChange={(e) => setApplicantIdCard(formatIdCard13(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">สัญชาติ</label>
                    <input
                      type="text"
                      value={applicantNationality}
                      onChange={(e) => setApplicantNationality(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">อายุ (ปี)</label>
                    <input
                      type="number"
                      value={applicantAge}
                      onChange={(e) => setApplicantAge(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* ที่อยู่ตามทะเบียนราษฎร์ / ที่ตั้ง */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">บ้านเลขที่</label>
                    <input
                      type="text"
                      placeholder="เช่น 125/2"
                      value={applicantHouseNo}
                      onChange={(e) => setApplicantHouseNo(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">หมู่ที่ (ตำบลบางเป้า)</label>
                    <select
                      value={formMoo}
                      onChange={(e) => setFormMoo(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800"
                    >
                      {Object.entries(BANGPAO_VILLAGES).map(([moo, name]) => (
                        <option key={moo} value={moo}>
                          หมู่ {moo} {name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">ตรอก/ซอย</label>
                    <input
                      type="text"
                      placeholder="ระบุถ้ามี หรือ เว้นว่าง"
                      value={applicantTrokSoi}
                      onChange={(e) => setApplicantTrokSoi(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">ถนน</label>
                    <input
                      type="text"
                      placeholder="ระบุถ้ามี หรือ เว้นว่าง"
                      value={applicantRoad}
                      onChange={(e) => setApplicantRoad(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                    />
                  </div>
                </div>

                {/* Satellite Pin Map (Matches MedicalEquipmentView) */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-teal-600" />
                        <span>ปักหมุดพิกัดบ้าน / จุดที่ตั้งขอรับบริการ (Google Satellite Hybrid)</span>
                      </label>
                      <p className="text-[11px] text-slate-400">
                        คลิกบนแผนที่ หรือลากหมุดสีแดง เพื่อระบุตำแหน่งบ้านให้เจ้าหน้าที่เดินทางไปบริการได้ถูกต้อง
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleFetchCurrentGps}
                        disabled={isFetchingGps}
                        className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Crosshair className={`w-3.5 h-3.5 ${isFetchingGps ? 'animate-spin' : ''}`} />
                        <span>{isFetchingGps ? 'กำลังดึงพิกัด...' : 'ใช้พิกัดปัจจุบัน'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const coords = BANGPAO_COORDS[formMoo] || BANGPAO_MUNICIPALITY_COORDS;
                          updateRegMapPin(coords.lat, coords.lng, true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>กึ่งกลาง ม.{formMoo}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsRegMapFullscreen(!isRegMapFullscreen)}
                        className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                        title={isRegMapFullscreen ? 'ย่อแผนที่' : 'ขยายเต็มจอ'}
                      >
                        {isRegMapFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Map Container */}
                  {/* Village Quick-Select Pills for Fast Exploration */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 text-xs">
                    <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">ลัดพิกัดหมู่บ้าน:</span>
                    {Object.entries(BANGPAO_VILLAGES).map(([m, name]) => {
                      const isSelected = String(formMoo) === String(m);
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            setFormMoo(m);
                            const coords = BANGPAO_COORDS[m];
                            if (coords) {
                              updateRegMapPin(coords.lat, coords.lng, true);
                            }
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-teal-600 text-white shadow-xs font-bold'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {`ม.${m} ${name}`}
                        </button>
                      );
                    })}
                  </div>

                  <div
                    className={`relative z-0 isolate w-full rounded-2xl border border-slate-300 overflow-hidden shadow-inner bg-slate-100 ${
                      isRegMapFullscreen
                        ? 'fixed inset-4 z-[9999] shadow-2xl h-[calc(100vh-32px)]'
                        : 'min-h-[460px] h-[520px] lg:h-[580px]'
                    }`}
                  >
                    <div
                      ref={regMapContainerRef}
                      className="w-full h-full"
                      style={{ width: '100%', height: '100%', position: 'relative' }}
                    />
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-slate-600 pt-0.5">
                    <div className="font-mono font-bold text-teal-800 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      <span>พิกัดที่เลือก: {Number(sewageLat).toFixed(6)}, {Number(sewageLng).toFixed(6)}</span>
                    </div>
                    <div className="text-[11px] text-teal-700 font-bold">
                      หมู่ที่ {formMoo} {BANGPAO_VILLAGES[formMoo] || ''}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: เนื้อหาคำร้อง (ตามประเภทที่เลือก) */}
              <div className="space-y-3">
                <div className="text-xs font-extrabold text-teal-800 flex items-center gap-1.5 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-100">
                  <FileText className="w-3.5 h-3.5" />
                  <span>
                    ส่วนที่ 2:{' '}
                    {formType === 'sewage'
                      ? 'รายละเอียดบริการกำจัดสิ่งปฏิกูล (ขอดูดส้วม)'
                      : 'รายละเอียดคำร้องทั่วไป'}
                  </span>
                </div>

                {/* A) ฟอร์มคำร้องทั่วไป */}
                {formType === 'general' ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">
                        เรื่องที่ยื่นคำร้อง <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น ร้องเรียนกลิ่นเหม็นจากการเผาขยะ / ขอความอนุเคราะห์พ่นสารเคมียุงลาย"
                        value={generalSubject}
                        onChange={(e) => setGeneralSubject(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">
                        ข้อความ / ความประสงค์โดยละเอียด <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={4}
                        placeholder="ระบุสภาพปัญหา สถานที่เกิดเหตุ ผลกระทบที่ได้รับ หรือสิ่งที่ต้องการให้เทศบาลช่วยเหลือ..."
                        value={generalPurpose}
                        onChange={(e) => setGeneralPurpose(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-teal-500 focus:outline-none leading-relaxed"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">
                        เอกสารหลักฐานที่แนบ (ถ้ามี)
                      </label>
                      <input
                        type="text"
                        value={generalEvidence}
                        onChange={(e) => setGeneralEvidence(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                      />
                    </div>
                  </div>
                ) : (
                  /* B) ฟอร์มคำร้องขอดูดส้วม / สิ่งปฏิกูล */
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">
                          สถานที่ขอรับบริการ
                        </label>
                        <select
                          value={sewagePlace}
                          onChange={(e) => setSewagePlace(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800"
                        >
                          <option value="บ้านพักอาศัย">บ้านพักอาศัย</option>
                          <option value="ร้านค้า / ร้านอาหาร">ร้านค้า / ร้านอาหาร</option>
                          <option value="หอพัก / อพาร์ตเมนต์">หอพัก / อพาร์ตเมนต์</option>
                          <option value="โรงเรียน / ศูนย์เด็กเล็ก">โรงเรียน / ศูนย์เด็กเล็ก</option>
                          <option value="วัด / มัสยิด / ศาสนสถาน">วัด / มัสยิด / ศาสนสถาน</option>
                          <option value="โรงงาน / สถานประกอบการ">โรงงาน / สถานประกอบการ</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">
                          ประเภทบ่อบำบัด
                        </label>
                        <select
                          value={sewageTankType}
                          onChange={(e) => setSewageTankType(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800"
                        >
                          <option value="บ่อเกรอะ/บ่อซึมในบ้านพักอาศัย">บ่อเกรอะ/บ่อซึม</option>
                          <option value="ถังบำบัดสำเร็จรูป (ถังแซทส์)">ถังแซทส์สำเร็จรูป</option>
                          <option value="บ่อดักไขมัน">บ่อดักไขมัน</option>
                          <option value="บ่อพักสิ่งปฏิกูลรวม">บ่อพักสิ่งปฏิกูลรวม</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">
                          วันที่ประสงค์ให้นัดสูบ
                        </label>
                        <input
                          type="date"
                          value={sewagePreferredDate}
                          onChange={(e) => setSewagePreferredDate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                        />
                      </div>
                    </div>

                    {/* Zone & Fee Calculation Card */}
                    <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-900 flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4 text-amber-700" />
                          <span>อัตราค่าธรรมเนียมตามเทศบัญญัติ (ต.บางเป้า)</span>
                        </span>
                        <span className="font-mono text-base font-black text-amber-900 bg-amber-200/70 px-2.5 py-0.5 rounded-lg border border-amber-300">
                          {formatMoney(calculatedFee)} บาท
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <label
                          className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all ${
                            sewageZone === 'in_district'
                              ? 'bg-amber-100 border-amber-400 font-bold text-amber-900'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="sewageZone"
                            value="in_district"
                            checked={sewageZone === 'in_district'}
                            onChange={() => setSewageZone('in_district')}
                            className="text-amber-600"
                          />
                          <span>ในเขตเทศบาลตำบลบางเป้า (250 บาท)</span>
                        </label>

                        <label
                          className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all ${
                            sewageZone === 'out_10'
                              ? 'bg-amber-100 border-amber-400 font-bold text-amber-900'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="sewageZone"
                            value="out_10"
                            checked={sewageZone === 'out_10'}
                            onChange={() => setSewageZone('out_10')}
                            className="text-amber-600"
                          />
                          <span>นอกเขตเทศบาล ไม่เกิน 10 กม. (700 บาท)</span>
                        </label>

                        <label
                          className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all ${
                            sewageZone === 'out_20'
                              ? 'bg-amber-100 border-amber-400 font-bold text-amber-900'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="sewageZone"
                            value="out_20"
                            checked={sewageZone === 'out_20'}
                            onChange={() => setSewageZone('out_20')}
                            className="text-amber-600"
                          />
                          <span>นอกเขตเทศบาล 10 - 20 กม. (1,000 บาท)</span>
                        </label>

                        <label
                          className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all ${
                            sewageZone === 'out_30'
                              ? 'bg-amber-100 border-amber-400 font-bold text-amber-900'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="sewageZone"
                            value="out_30"
                            checked={sewageZone === 'out_30'}
                            onChange={() => setSewageZone('out_30')}
                            className="text-amber-600"
                          />
                          <span>นอกเขตเทศบาล 20 - 30 กม. (1,300 บาท)</span>
                        </label>
                      </div>
                    </div>

                    {/* Landmark & Driver assignment */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">
                          จุดสังเกต / สถานที่ใกล้เคียง
                        </label>
                        <input
                          type="text"
                          placeholder="เช่น ตรงข้ามร้านชำป้าพร, ซอยเข้าวัดควนทองสีห์"
                          value={sewageLandmark}
                          onChange={(e) => setSewageLandmark(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">
                          พนักงานขับรถบรรทุกสิ่งปฏิกูล <span className="text-[11px] text-slate-400 font-normal">(ระบุล่วงหน้า หรือมอบหมายตอนจ่ายงานได้)</span>
                        </label>
                        <input
                          type="text"
                          placeholder="เช่น นายชนะ สุขด้วง (รถ 80-1234 ตรัง)"
                          value={sewageDriver}
                          onChange={(e) => setSewageDriver(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 3: เจ้าหน้าที่ผู้รับคำขอ */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-extrabold text-teal-800 flex items-center gap-1.5 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-100">
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>ส่วนที่ 3: บันทึกเจ้าหน้าที่ผู้รับคำขอ</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">
                      เจ้าหน้าที่ผู้รับคำขอ
                    </label>
                    <input
                      type="text"
                      value={receivingOfficerName}
                      onChange={(e) => setReceivingOfficerName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">ตำแหน่ง</label>
                    <input
                      type="text"
                      value={receivingOfficerPosition}
                      onChange={(e) => setReceivingOfficerPosition(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-600 font-semibold mb-1">
                      ความเห็นเบื้องต้นของเจ้าหน้าที่ผู้รับเรื่อง
                    </label>
                    <input
                      type="text"
                      value={receivingOfficerNote}
                      onChange={(e) => setReceivingOfficerNote(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Submit Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 flex-wrap">
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  💾 บันทึกคำร้อง
                </button>

                <button
                  type="button"
                  onClick={() => handleFormSubmit(false, true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>บันทึก & ส่งออก Word (.docx)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleFormSubmit(true, false)}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-extrabold transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>🖨️ บันทึก & สั่งพิมพ์ A4 ทันที</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Live Form Preview & Quick Help */}
          <div className="lg:col-span-4 space-y-4">
            {/* Live Document Preview Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-teal-600" />
                  <span>สรุปข้อมูลก่อนพิมพ์</span>
                </span>
                <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                  แบบฟอร์ม A4
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="text-[11px] text-slate-400">ประเภทแบบฟอร์ม:</div>
                  <div className="font-bold text-slate-900">
                    {formType === 'sewage'
                      ? 'คำร้องขอรับบริการกำจัดสิ่งปฏิกูล'
                      : 'แบบคำร้องทั่วไป'}
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="text-[11px] text-slate-400">ผู้ยื่นคำร้อง:</div>
                  <div className="font-bold text-slate-900">
                    {applicantName || '(ยังไม่ได้ระบุชื่อ)'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    โทร: {applicantPhone || '-'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    ที่อยู่: หมู่ {formMoo} {BANGPAO_VILLAGES[formMoo]} ต.บางเป้า
                  </div>
                </div>

                {formType === 'sewage' ? (
                  <div className="bg-amber-50/70 p-2.5 rounded-xl border border-amber-200 space-y-1">
                    <div className="text-[11px] text-amber-800 font-bold">สรุปบริการดูดส้วม:</div>
                    <div className="text-[11px] text-slate-700">สถานที่: {sewagePlace}</div>
                    <div className="text-[11px] text-slate-700">บ่อ: {sewageTankType}</div>
                    <div className="text-[11px] text-slate-700 font-bold text-amber-900">
                      ค่าธรรมเนียม: {calculatedFee} บาท
                    </div>
                    <div className="text-[10px] text-slate-500">
                      พนักงานขับรถ: {sewageDriver}
                    </div>
                  </div>
                ) : (
                  <div className="bg-teal-50/70 p-2.5 rounded-xl border border-teal-200 space-y-1">
                    <div className="text-[11px] text-teal-800 font-bold">หัวข้อเรื่อง:</div>
                    <div className="text-[11px] text-slate-800 font-medium">
                      {generalSubject || '(ยังไม่ได้ระบุ)'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Official Guidelines Info Card */}
            <div className="bg-gradient-to-br from-slate-900 to-teal-950 text-white rounded-3xl p-5 shadow-2xs space-y-2.5">
              <div className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-teal-300" />
                <span>ระเบียบงานสารบรรณ & มาตรฐานงาน</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                ระบบถูกออกแบบให้รองรับฟอนต์ <strong>TH SarabunIT๙</strong> ขนาด 15 พอยต์ และมีกรอบบันทึกความเห็นของผู้อำนวยการกอง, ปลัดเทศบาล และนายกเทศมนตรีตามหนังสือราชการจริง 100%
              </p>
              <div className="pt-2 border-t border-white/10 text-[10px] text-slate-400">
                รองรับการสั่งพิมพ์ A4 ตรงผ่านเบราว์เซอร์ และดาวน์โหลดไฟล์ Word (.docx) เพื่อนำไปแก้ไขต่อ
              </div>
            </div>
          </div>
        </div>

        
      </div>
    )}

      {/* ===================================================================== */}
      {/* SUB-TAB 3: 🖨️ เสนออนุมัติ & พิมพ์เอกสาร A4 (Approval & Signers)        */}
      {/* ===================================================================== */}
      {subTab === 'print' && (
        <div className="space-y-4">
          {/* Executive Signer Overview Banner */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-teal-700" />
                <span>ผู้บริหารและผู้มีอำนาจลงนามคำร้อง (เทศบาลตำบลบางเป้า)</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-3 flex-wrap">
                <span>ผอ.กอง: <strong>{signers.directorName}</strong></span>
                <span>•</span>
                <span>ปลัด: <strong>{signers.clerkName}</strong></span>
                <span>•</span>
                <span>ผู้ลงนามอนุมัติ: <strong>{signers.actingMayorName || signers.mayorName}</strong></span>
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedPrintPetition(petitions[0] || null);
                setIsPrintModalOpen(true);
              }}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-cyan-400" />
              <span>ปรับแต่งรายชื่อผู้ลงนาม</span>
            </button>
          </div>

          {/* Table of Petitions for Executive Review */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <FileSignature className="w-4 h-4 text-teal-700" />
                <span>ทะเบียนคุมการเสนออนุมัติและสั่งพิมพ์คำร้อง A4</span>
              </span>
              <span className="text-xs text-slate-400">คลิกที่ปุ่มเพื่ออนุมัติหรือสั่งพิมพ์เอกสาร</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-3 px-3.5">เลขรับ / รหัสติดตาม</th>
                    <th className="py-3 px-3.5">ประเภท & หัวข้อเรื่อง</th>
                    <th className="py-3 px-3.5">ผู้ยื่นคำร้อง</th>
                    <th className="py-3 px-3.5">ที่อยู่ / หมู่บ้าน</th>
                    <th className="py-3 px-3.5">สถานะการเสนออนุมัติ</th>
                    <th className="py-3 px-3.5 text-right">การจัดการ & เอกสาร</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {petitions.map((p) => {
                    const isSewage = resolveFormType(p) === 'sewage';
                    const isDone = p.status === 'resolved';

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3.5">
                          <span className="font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            {p.trackingCode}
                          </span>
                          <div className="text-[10px] text-slate-400 mt-1">
                            {formatThaiDate(p.submissionDate || p.createdAt, false)}
                          </div>
                        </td>

                        <td className="py-3 px-3.5 max-w-[240px]">
                          <div className="font-bold text-slate-900 truncate">{p.title}</div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {p.description}
                          </div>
                          {isSewage && (
                            <span className="inline-block mt-1 font-bold text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              💰 ค่าธรรมเนียม {p.form?.feeAmount || 250} บาท
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3.5">
                          <div className="font-bold text-slate-900">{p.citizenName}</div>
                          <div className="text-[11px] text-slate-500">{p.phone}</div>
                        </td>

                        <td className="py-3 px-3.5 max-w-[180px]">
                          <div className="text-slate-600 truncate">{p.address}</div>
                        </td>

                        <td className="py-3 px-3.5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-block ${
                              isDone
                                ? 'bg-emerald-100 text-emerald-800'
                                : p.status === 'assigned'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isDone
                              ? '✅ เสร็จสิ้นสมบูรณ์'
                              : p.status === 'assigned'
                              ? '📋 อนุมัติ & มอบหมาย'
                              : '⏳ รอเสนออนุมัติ'}
                          </span>
                        </td>

                        <td className="py-3 px-3.5 text-right space-x-1.5 whitespace-nowrap">
                          {/* Step approval action */}
                          <button
                            onClick={() => handleOpenSimpleActionModal(p)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                          >
                            บันทึกผล/เสนอ
                          </button>

                          {/* Print Official Modal Button */}
                          <button
                            onClick={() => {
                              setSelectedPrintPetition(p);
                              setIsPrintModalOpen(true);
                            }}
                            className="px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-[11px] font-bold transition-all shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>พิมพ์ A4</span>
                          </button>

                          {/* Direct Word Export */}
                          <button
                            onClick={() => exportPetitionDocx(p, signers)}
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs transition-all cursor-pointer inline-flex items-center"
                            title="ดาวน์โหลด Word (.docx)"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-TAB 4: 🔍 ติดตามผลคำร้องประชาชน (Citizen Tracking Portal)         */}
      {/* ===================================================================== */}
      {subTab === 'tracking' && (
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Search Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto border border-teal-100">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900">
                ระบบติดตามสถานะคำร้องและข้อร้องเรียนประชาชน
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                กรอกรหัสติดตามคำร้อง (เช่น ST-68001 หรือ REQ-69-0012) หรือเลขประจำตัวประชาชน 13 หลัก
              </p>
            </div>

            <form onSubmit={handleTrackingSearch} className="max-w-xl mx-auto flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="กรอกรหัสติดตามคำร้อง หรือ เลขบัตร ปชช. / เบอร์โทร..."
                  value={trackingQuery}
                  onChange={(e) => setTrackingQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md cursor-pointer transition-all active:scale-95 shrink-0"
              >
                ตรวจสอบ
              </button>
            </form>
          </div>

          {/* Tracking Result View */}
          {activeTrackingResult ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-6 animate-in slide-in-from-bottom duration-200">
              {/* Result Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black px-2.5 py-1 bg-slate-900 text-white rounded-lg">
                      {activeTrackingResult.trackingCode}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      วันที่ยื่น:{' '}
                      {formatThaiDate(
                        activeTrackingResult.submissionDate || activeTrackingResult.createdAt,
                        true
                      )}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 mt-2">
                    {activeTrackingResult.title}
                  </h3>
                </div>

                <button
                  onClick={() => {
                    setSelectedPrintPetition(activeTrackingResult);
                    setIsPrintModalOpen(true);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer self-start sm:self-auto"
                >
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์ใบคำร้อง A4</span>
                </button>
              </div>

              {/* 4-Step Progress Stepper */}
              <div className="py-4">
                <div className="text-xs font-extrabold text-slate-700 mb-4">
                  ความคืบหน้าการดำเนินงาน (Status Timeline)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {/* Step 1 */}
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-800">1. ยื่นคำร้อง</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="text-[10px] text-slate-500">บันทึกเข้าระบบเรียบร้อย</div>
                  </div>

                  {/* Step 2 */}
                  <div
                    className={`p-3 rounded-2xl border space-y-1 ${
                      activeTrackingResult.status !== 'pending' &&
                      activeTrackingResult.status !== 'submitted'
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-amber-50 border-amber-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-800">
                        2. ตรวจสอบข้อเท็จจริง
                      </span>
                      {activeTrackingResult.status !== 'pending' &&
                      activeTrackingResult.status !== 'submitted' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Clock className="w-4 h-4 text-amber-600" />
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500">ผอ.กอง / ปลัด ตรวจสอบ</div>
                  </div>

                  {/* Step 3 */}
                  <div
                    className={`p-3 rounded-2xl border space-y-1 ${
                      activeTrackingResult.status === 'assigned' ||
                      activeTrackingResult.status === 'resolved'
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-800">
                        3. อนุมัติ & มอบหมาย
                      </span>
                      {activeTrackingResult.status === 'assigned' ||
                      activeTrackingResult.status === 'resolved' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-300" />
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500">นายกฯ อนุมัติ / จ่ายงาน</div>
                  </div>

                  {/* Step 4 */}
                  <div
                    className={`p-3 rounded-2xl border space-y-1 ${
                      activeTrackingResult.status === 'resolved'
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-800">
                        4. แก้ไขแล้วเสร็จ
                      </span>
                      {activeTrackingResult.status === 'resolved' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-300" />
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500">ปฏิบัติงาน & รายงานผล</div>
                  </div>
                </div>
              </div>

              {/* Detail Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                  <div className="font-bold text-slate-800">ข้อมูลผู้ยื่นและสถานที่</div>
                  <div className="text-slate-600">
                    <strong>ผู้ยื่น:</strong> {activeTrackingResult.citizenName}
                  </div>
                  <div className="text-slate-600">
                    <strong>เบอร์โทร:</strong> {activeTrackingResult.phone}
                  </div>
                  <div className="text-slate-600">
                    <strong>สถานที่:</strong> {activeTrackingResult.address}
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                  <div className="font-bold text-slate-800">ผลการดำเนินงานของเจ้าหน้าที่</div>
                  <div className="text-slate-600">
                    <strong>ผู้รับผิดชอบ:</strong>{' '}
                    {activeTrackingResult.assignedOfficer || 'กองสาธารณสุขและสิ่งแวดล้อม'}
                  </div>
                  <div className="text-slate-600">
                    <strong>บันทึกผล:</strong>{' '}
                    {activeTrackingResult.resolutionNotes || 'อยู่ระหว่างการดำเนินงานตามขั้นตอน'}
                  </div>
                </div>
              </div>
            </div>
          ) : trackingQuery ? (
            <div className="text-center py-10 text-slate-400 text-xs bg-white rounded-3xl border border-slate-200">
              ไม่พบข้อมูลคำร้องที่ตรงกับรหัส [<strong>{trackingQuery}</strong>]
            </div>
          ) : null}
        </div>
      )}

      {/* ===================================================================== */}
      {/* Quick Action & Executive Approval Modal                               */}
      {/* ===================================================================== */}
      {statusActionPetition && (
        <div className="fixed inset-0 z-[99999] overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-5 sm:p-6 border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-black text-lg shadow-2xs">
                  🔄
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900">
                      ปรับสถานะคำร้อง
                    </h3>
                    <span className="font-mono text-xs px-2 py-0.5 bg-slate-900 text-white rounded-lg font-bold">
                      {statusActionPetition.trackingCode}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {statusActionPetition.citizenName} • {resolveFormType(statusActionPetition) === 'sewage' ? '🚛 คำร้องสูบสิ่งปฏิกูล' : `📋 ${statusActionPetition.title}`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStatusActionPetition(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAction} className="space-y-4 text-xs text-slate-700">
              {/* 3 Large, Intuitive Step Selection Cards */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-700">
                  เลือกขั้นตอนการดำเนินงาน (คลิกเลือก 1 ใน 3 ขั้นตอน):
                </label>

                {/* STEP 1 CARD */}
                <div
                  onClick={() => setSelectedWorkflowStep('pending')}
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                    selectedWorkflowStep === 'pending'
                      ? 'border-amber-500 bg-amber-50/70 shadow-sm ring-2 ring-amber-300/40'
                      : 'border-slate-200 bg-white hover:border-amber-200 hover:bg-amber-50/20'
                  }`}
                >
                  <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black shrink-0 text-sm">
                    1
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-900 text-[13px]">
                        ⏳ ขั้นที่ 1: รอเสนออนุมัติ (รอดำเนินการ)
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                        รอเซ็นแฟ้ม
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      เพิ่งรับคำร้อง พิมพ์ A4 ตราครุฑ เพื่อนำเสนอผู้บริหาร (ผอ.กอง ➔ ปลัด ➔ นายกฯ) ลงนาม
                    </p>
                  </div>
                </div>

                {/* STEP 2 CARD */}
                <div
                  onClick={() => setSelectedWorkflowStep('assigned')}
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                    selectedWorkflowStep === 'assigned'
                      ? 'border-blue-500 bg-blue-50/70 shadow-sm ring-2 ring-blue-300/40'
                      : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/20'
                  }`}
                >
                  <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-black shrink-0 text-sm">
                    2
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-900 text-[13px]">
                        🚚 ขั้นที่ 2: อนุมัติแล้ว ➔ จ่ายงานลงพื้นที่
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
                        อนุมัติแล้ว
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      ผู้บริหารลงนามอนุมัติแล้ว มอบหมายให้เจ้าหน้าที่หรือพนักงานขับรถออกไปปฏิบัติงานจริง
                    </p>
                  </div>
                </div>

                {/* STEP 3 CARD */}
                <div
                  onClick={() => setSelectedWorkflowStep('resolved')}
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                    selectedWorkflowStep === 'resolved'
                      ? 'border-emerald-500 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-300/40'
                      : 'border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/20'
                  }`}
                >
                  <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black shrink-0 text-sm">
                    3
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-900 text-[13px]">
                        ✅ ขั้นที่ 3: ปฏิบัติงานแล้วเสร็จ (ปิดงาน)
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                        เสร็จสิ้น / ตัดจากคิว
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      ทีมงานลงพื้นที่ให้บริการเรียบร้อยแล้ว <strong>ระบบจะตัดออกจากคิวรอปฏิบัติ</strong> และเก็บสถิติถาวร
                    </p>
                  </div>
                </div>
              </div>

              {/* Dynamic Detail Fields Based on Selected Step */}
              {selectedWorkflowStep === 'assigned' && (
                <div className="bg-blue-50/80 p-3.5 rounded-2xl border border-blue-200 space-y-2.5 animate-in fade-in duration-150">
                  <div className="font-bold text-blue-900 text-xs flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-blue-700" />
                    <span>ระบุผู้ปฏิบัติงานลงพื้นที่</span>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">
                      ผู้รับผิดชอบ / พนักงานขับรถ:
                    </label>
                    <input
                      type="text"
                      value={actionOfficerName}
                      onChange={(e) => setActionOfficerName(e.target.value)}
                      placeholder="ระบุชื่อผู้ปฏิบัติงาน เช่น นายชนะ สุขด้วง (พนักงานขับรถ)"
                      className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-400">เลือกเร็ว:</span>
                      <button
                        type="button"
                        onClick={() => setActionOfficerName('นายชนะ สุขด้วง (พนักงานขับรถ)')}
                        className="px-2 py-0.5 rounded bg-white hover:bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-semibold cursor-pointer"
                      >
                        นายชนะ (พขร.)
                      </button>
                      <button
                        type="button"
                        onClick={() => setActionOfficerName('พันจ่าเอกอานัส เด่นหมาด (จนท.สุขาภิบาล)')}
                        className="px-2 py-0.5 rounded bg-white hover:bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-semibold cursor-pointer"
                      >
                        พ.จ.อ.อานัส (สุขาภิบาล)
                      </button>
                      <button
                        type="button"
                        onClick={() => setActionOfficerName('ทีมงานพ่นหมอกควันกำจัดยุง')}
                        className="px-2 py-0.5 rounded bg-white hover:bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-semibold cursor-pointer"
                      >
                        ทีมพ่นยุง
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">
                      เวลานัดหมาย / บันทึกจ่ายงาน:
                    </label>
                    <input
                      type="text"
                      value={actionComment}
                      onChange={(e) => setActionComment(e.target.value)}
                      placeholder="เช่น นัดหมายเข้าดูดส้วมเวลา 13:30 น. โทรแจ้งผู้ร้องล่วงหน้า 30 นาที"
                      className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2"
                    />
                  </div>
                </div>
              )}

              {selectedWorkflowStep === 'resolved' && (
                <div className="bg-emerald-50/80 p-3.5 rounded-2xl border border-emerald-200 space-y-2.5 animate-in fade-in duration-150">
                  <div className="font-bold text-emerald-900 text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>บันทึกผลการปฏิบัติงานเสร็จสิ้น</span>
                  </div>

                  {resolveFormType(statusActionPetition) === 'sewage' && (
                    <div className="grid grid-cols-2 gap-2.5 bg-white p-2.5 rounded-xl border border-emerald-200">
                      <div>
                        <label className="block text-emerald-900 font-bold text-[11px] mb-1">เล่มที่ใบเสร็จ</label>
                        <input
                          type="text"
                          value={receiptBookNo}
                          onChange={(e) => setReceiptBookNo(e.target.value)}
                          placeholder="01"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-emerald-900 font-bold text-[11px] mb-1">เลขที่ใบเสร็จ</label>
                        <input
                          type="text"
                          value={receiptNo}
                          onChange={(e) => setReceiptNo(e.target.value)}
                          placeholder="0015"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-xs"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">
                      บันทึกผลการดำเนินงาน:
                    </label>
                    <input
                      type="text"
                      value={actionComment}
                      onChange={(e) => setActionComment(e.target.value)}
                      placeholder="เช่น ดูดสิ่งปฏิกูลปริมาณ 1 บ่อ เรียบร้อยดี หรือ ตรวจสอบแก้ไขเหตุรำคาญแล้ว"
                      className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2"
                    />
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('ต้องการยกเลิกคำร้องนี้ใช่หรือไม่?')) {
                      onUpdateStatus(statusActionPetition.id, 'rejected', 'ยกเลิกคำร้อง');
                      setStatusActionPetition(null);
                    }
                  }}
                  className="text-[11px] text-rose-600 hover:text-rose-800 font-bold cursor-pointer transition-colors"
                >
                  ❌ ขอยกเลิกคำร้อง
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStatusActionPetition(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    ปิด
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-extrabold shadow-md cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    <span>💾 บันทึกสถานะ</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* Official High-Fidelity A4 Print & Export Modal                        */}
      {/* ===================================================================== */}
      <PrintPetitionModal
        petition={selectedPrintPetition}
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        savedSignerSettings={signers}
        onUpdateSignerSettings={onUpdateSignerSettings}
      />
    </div>
  );
};
