import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calendar,
  Clock,
  Truck,
  Users,
  MapPin,
  Sparkles,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Plus,
  Trash2,
  Edit3,
  Check,
  CheckCircle2,
  RotateCcw,
  Copy,
  Printer,
  Share2,
  Navigation,
  AlertCircle,
  FileText,
  Package,
  Eye,
  ChevronRight,
  ChevronLeft,
  Search,
  ExternalLink,
  Save,
  Layers,
  Phone,
  Home,
  CheckSquare,
  Square,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import {
  LtcPatient,
  LtcRoundPlan,
  LtcPlanStop,
  LtcRoundItem,
  LtcProjectSourceType,
  UserRole,
} from '../types/index.ts';
import { PrintLtcRegistrationModal } from './PrintLtcRegistrationModal.tsx';
import { INITIAL_LTC_PATIENTS } from '../data/mockData.ts';
import { mergeLtcWithMaster } from '../services/sheetsSync.ts';

export const getProjectSourceInfo = (type: LtcProjectSourceType = 'both') => {
  if (type === 'nhso') {
    return {
      code: 'nhso' as const,
      shortLabel: '🏥 โครงการ สปสช.',
      fullLabel: 'โครงการกองทุนหลักประกันสุขภาพ (สปสช.)',
      desc: 'แจกผ้าอ้อมผู้ใหญ่ แผ่นรองซับ และเวชภัณฑ์ตามโครงการ สปสช. ทต.บางเป้า',
      badgeClass: 'bg-blue-100 text-blue-900 border-blue-300',
      activeCardClass: 'bg-blue-50 border-blue-600 ring-2 ring-blue-300',
      titlePrefix: 'แผนจัดรอบแจกพัสดุโครงการ สปสช.',
    };
  }
  if (type === 'ltc') {
    return {
      code: 'ltc' as const,
      shortLabel: '👵 โครงการ LTC',
      fullLabel: 'โครงการการดูแลระยะยาวด้านสาธารณสุข (LTC)',
      desc: 'แจกนมผงสุขภาพ อาหารเสริมทางการแพทย์ และสิ่งของตาม Care Plan (LTC)',
      badgeClass: 'bg-purple-100 text-purple-900 border-purple-300',
      activeCardClass: 'bg-purple-50 border-purple-600 ring-2 ring-purple-300',
      titlePrefix: 'แผนจัดรอบแจกพัสดุโครงการ LTC',
    };
  }
  return {
    code: 'both' as const,
    shortLabel: '🤝 แจกพร้อมกัน (สปสช. + LTC)',
    fullLabel: 'บูรณาการแจกพร้อมกันทั้งโครงการ สปสช. และโครงการ LTC',
    desc: 'ออกลงพื้นที่ครั้งเดียว ส่งมอบพัสดุครบทั้งโครงการ สปสช. และโครงการ LTC พร้อมกัน',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    activeCardClass: 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-300',
    titlePrefix: 'แผนจัดรอบแจกพัสดุบูรณาการ (สปสช. + LTC)',
  };
};

// Central Municipality Coordinates (Bangpao HQ) - พิกัดจริงสำนักงานเทศบาลตำบลบางเป้า
export const BANGPAO_HQ_COORDS = {
  lat: 7.429625,
  lng: 99.52522,
  name: 'สำนักงานเทศบาลตำบลบางเป้า (กองสาธารณสุข)',
};

// Official 7 Villages of Bangpao Subdistrict
export const BANGPAO_VILLAGES: Record<string, string> = {
  '1': 'บ้านชายวัด',
  '2': 'บ้านเกาะปอม',
  '3': 'บ้านตลาดใหม่',
  '4': 'บ้านแหลมม่วง',
  '5': 'บ้านป่าเตียว',
  '6': 'บ้านควนทองสีห์',
  '7': 'บ้านท่าเรือ',
};

// Approximate Center Coordinates per Village in Bangpao Subdistrict
export const BANGPAO_COORDS: Record<string, { lat: number; lng: number }> = {
  '1': { lat: 7.428587, lng: 99.525876 }, // บ้านชายวัด
  '2': { lat: 7.421512, lng: 99.529104 }, // บ้านเกาะปอม
  '3': { lat: 7.416288, lng: 99.519842 }, // บ้านตลาดใหม่
  '4': { lat: 7.411645, lng: 99.531215 }, // บ้านแหลมม่วง
  '5': { lat: 7.441200, lng: 99.551300 }, // บ้านป่าเตียว
  '6': { lat: 7.391245, lng: 99.508765 }, // บ้านควนทองสีห์
  '7': { lat: 7.402190, lng: 99.514280 }, // บ้านท่าเรือ
};

// Helper to normalize Thai names for resilient comparison and sync
export const normalizeThaiName = (name?: string): string => {
  if (!name) return '';
  return name
    .replace(/\s+/g, '')
    .replace(/^(นาย|นางสาว|นาง|เด็กชาย|เด็กหญิง|ด\.ช\.|ด\.ญ\.)/, '')
    .trim();
};

// Helper to extract clean first name without prefix
export const extractGivenName = (fullName?: string): string => {
  if (!fullName) return '';
  const clean = fullName
    .replace(/\s+/g, ' ')
    .replace(/^(นาย|นางสาว|นาง|เด็กชาย|เด็กหญิง|ด\.ช\.|ด\.ญ\.)\s*/, '')
    .trim();
  return clean.split(' ')[0] || clean;
};

// Exact & resilient matcher between a plan stop and a registered patient
export const matchPlanStopWithPatient = (
  stop: { patientId?: string; fullName?: string; idCard?: string; address?: string },
  patient: LtcPatient
): boolean => {
  // 1. Direct ID match (Best & most accurate)
  if (stop.patientId && patient.id) {
    return stop.patientId === patient.id;
  }

  // 2. ID Card match (only if valid 13 digits)
  if (patient.idCard && stop.idCard && patient.idCard !== '-' && stop.idCard !== '-') {
    const sCard = stop.idCard.replace(/[-\s]/g, '');
    const pCard = patient.idCard.replace(/[-\s]/g, '');
    if (sCard.length === 13 && sCard === pCard) return true;
  }

  // 3. Exact full normalized name match (Never use substring .includes()!)
  if (stop.fullName && patient.fullName) {
    const sNorm = normalizeThaiName(stop.fullName);
    const pNorm = normalizeThaiName(patient.fullName);
    if (sNorm && pNorm && sNorm === pNorm) return true;
  }

  return false;
};

// Haversine distance calculator between two coordinates in kilometers
export function calculateHaversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

export interface LtcRoundPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: LtcPatient[];
  initialYear?: string;
  initialRound?: string;
  configuredYears: string[];
  configuredRounds: string[];
  onAddNewRound?: () => void;
  existingPlans: Record<string, LtcRoundPlan>;
  onSavePlan: (plan: LtcRoundPlan) => void;
  onDeleteRoundPlan?: (fiscalYear: string, round: string, removeRoundSlot?: boolean) => void;
  onClonePlanToRound?: (
    sourcePlan: LtcRoundPlan,
    targetYear: string,
    targetRound: string,
    targetDate: string
  ) => void;
  userRole?: UserRole;
}

export const LtcRoundPlannerModal: React.FC<LtcRoundPlannerModalProps> = ({
  isOpen,
  onClose,
  patients,
  initialYear = '2569',
  initialRound = '1',
  configuredYears,
  configuredRounds,
  onAddNewRound,
  existingPlans,
  onSavePlan,
  onDeleteRoundPlan,
  onClonePlanToRound,
}) => {
  if (!isOpen) return null;

  // Ensure all 14 official patients are present
  const safePatients = useMemo(() => mergeLtcWithMaster(patients), [patients]);

  // Active step / tab in the planner
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Core plan settings state
  const [planYear, setPlanYear] = useState<string>(initialYear);
  const [planRound, setPlanRound] = useState<string>(initialRound);
  const [projectSourceType, setProjectSourceType] = useState<LtcProjectSourceType>('both');

  // Real OSRM road routing metrics for Step 4
  const [osrmRouteMetrics, setOsrmRouteMetrics] = useState<{
    distanceKm: number;
    drivingMin: number;
    legMetrics: { distanceKm: number; durationMin: number }[];
  } | null>(null);
  const [isCalculatingRoadRoute, setIsCalculatingRoadRoute] = useState<boolean>(false);

  // Sync state if props change when opening modal
  useEffect(() => {
    if (isOpen) {
      if (initialYear) setPlanYear(initialYear);
      if (initialRound) setPlanRound(initialRound);
    }
  }, [isOpen, initialYear, initialRound]);
  const [planTitle, setPlanTitle] = useState<string>('');
  const [deliveryDate, setDeliveryDate] = useState<string>(() => {
    const today = new Date();
    today.setDate(today.getDate() + 7);
    return today.toISOString().split('T')[0];
  });
  const [deliveryTimeWindow, setDeliveryTimeWindow] = useState<string>('09:00 - 16:30 น.');
  const [driverName, setDriverName] = useState<string>('นายชนะ สุขด้วง (พนักงานขับรถ)');
  const [staffNames, setStaffNames] = useState<string>(
    'พันจ่าเอกอานัส เด็นหมาด (เจ้าพนักงานสาธารณสุข), นางสาวสุดา (CG)'
  );
  const [vehiclePlate, setVehiclePlate] = useState<string>('ผก-4512 ตรัง (รถกระบะ ทต.บางเป้า)');
  const [planNotes, setPlanNotes] = useState<string>('');

  // Selected stops list for this plan
  const [plannedStops, setPlannedStops] = useState<LtcPlanStop[]>([]);

  // Search & Filters for Patient Selection (Step 3)
  const [patientSearch, setPatientSearch] = useState<string>('');
  const [patientMooFilter, setPatientMooFilter] = useState<string>('all');
  const [patientAdlFilter, setPatientAdlFilter] = useState<string>('all');
  const [selectionViewMode, setSelectionViewMode] = useState<'all' | 'selected' | 'unselected'>('all');
  const [draggedPlannerStopId, setDraggedPlannerStopId] = useState<string | null>(null);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState<boolean>(false);

  // Edit item modal/popover state inside planner
  const [editingStopIndex, setEditingStopIndex] = useState<number | null>(null);
  const [editingItemsStop, setEditingItemsStop] = useState<LtcPlanStop | null>(null);

  // Clone Modal State
  const [isCloneModalOpen, setIsCloneModalOpen] = useState<boolean>(false);
  const [isPrintRegModalOpen, setIsPrintRegModalOpen] = useState<boolean>(false);
  const [cloneTargetYear, setCloneTargetYear] = useState<string>(initialYear);
  const [cloneTargetRound, setCloneTargetRound] = useState<string>('2');
  const [cloneDeliveryDate, setCloneDeliveryDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 4);
    return d.toISOString().split('T')[0];
  });

  // Success toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Convert planned stops to LtcPatient format for 100% exact registration print
  const plannerPatientsForPrint: LtcPatient[] = useMemo(() => {
    return plannedStops.map((s) => ({
      id: s.patientId,
      hn: `HN-${s.patientId}`,
      idCard: s.idCard || '-',
      fullName: s.fullName,
      gender: s.gender,
      age: s.age,
      adlScore: s.adlScore || 5,
      adlGroup: 'group_2',
      adlCategory: s.adlCategory,
      diagnosis: s.notes || 'ผู้สูงอายุที่มีภาวะพึ่งพิง LTC',
      careManagerName: 'พันจ่าเอกอานัส เด็นหมาด (CM)',
      caregiverName: s.caregiverName,
      phone: s.phone,
      address: s.address,
      shortAddress: s.shortAddress,
      allocationText: s.allocationText,
      projectEndDateNote: s.projectEndDateNote,
      moo: s.moo,
      subdistrict: 'บางเป้า',
      carePlanSummary: s.notes || '',
      lastVisitDate: '2026-10-15',
      nextVisitDate: '2026-11-15',
      status: 'active',
      roundItems: { [planRound]: s.items },
      yearRoundItems: { [planYear]: { [planRound]: s.items } },
    }));
  }, [plannedStops, planYear, planRound]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Map container reference for Step 4 Leaflet preview
  const plannerMapContainerRef = useRef<HTMLDivElement | null>(null);
  const plannerMapInstanceRef = useRef<any>(null);
  const plannerRouteLayerRef = useRef<any>(null);
  const plannerMarkersLayerRef = useRef<any>(null);

  // Period key helper
  const periodKey = `${planYear}_${planRound}`;

  // Helper to extract default items for a patient for the given round & project source type
  const extractPatientRoundItems = (
    p: LtcPatient,
    roundKey: string,
    yearKey: string,
    sourceOverride?: LtcProjectSourceType
  ): LtcRoundItem[] => {
    const activeSource = sourceOverride || projectSourceType || 'both';
    let baseItems: LtcRoundItem[] = [];

    // 1. Check yearRoundItems
    if (p.yearRoundItems?.[yearKey]?.[roundKey] && p.yearRoundItems[yearKey][roundKey].length > 0) {
      baseItems = p.yearRoundItems[yearKey][roundKey].map((it) => ({ ...it }));
    } else if (p.roundItems?.[roundKey] && p.roundItems[roundKey].length > 0) {
      // 2. Check roundItems
      baseItems = p.roundItems[roundKey].map((it) => ({ ...it }));
    } else {
      // 3. Fallback based on patient's monthly diaper allowance or ADL
      const diaperSize = p.equipmentNeeded?.includes('XL')
        ? 'XL'
        : p.equipmentNeeded?.includes('L')
        ? 'L'
        : 'M';
      const diaperQty = (p.monthlyDiaperAllowance || 90) * 3; // 3 months per round

      baseItems = [
        {
          itemId: `INV-LTC-DIA-${diaperSize}`,
          itemName: `ผ้าอ้อมผู้ใหญ่ (Size ${diaperSize})`,
          quantity: diaperQty,
          unit: 'ชิ้น',
        },
      ];

      if (p.adlCategory === 'ติดเตียง') {
        baseItems.push({
          itemId: 'INV-LTC-08',
          itemName: 'นมผงสุขภาพ / อาหารเสริมโภชนาการ',
          quantity: 2,
          unit: 'กระป๋อง',
        });
        baseItems.push({
          itemId: 'INV-LTC-06',
          itemName: 'แผ่นรองซับสิ่งขับถ่าย (Underpads)',
          quantity: 60,
          unit: 'แผ่น',
        });
      }
    }

    if (activeSource === 'nhso') {
      const nhsoFiltered = baseItems.filter(
        (it) => it.itemName.includes('ผ้าอ้อม') || it.itemName.includes('แผ่นรองซับ')
      );
      return nhsoFiltered.length > 0 ? nhsoFiltered : baseItems;
    }

    if (activeSource === 'ltc') {
      const ltcFiltered = baseItems.filter(
        (it) =>
          it.itemName.includes('นม') ||
          it.itemName.includes('อาหารเสริม') ||
          it.itemName.includes('แผ่นรองซับ') ||
          it.itemName.includes('เวชภัณฑ์')
      );
      return ltcFiltered.length > 0 ? ltcFiltered : baseItems;
    }

    return baseItems;
  };

  // Switch Project Source Type ('nhso' | 'ltc' | 'both') and update title + stop items
  const handleSwitchProjectSourceType = (nextType: LtcProjectSourceType) => {
    setProjectSourceType(nextType);
    const info = getProjectSourceInfo(nextType);
    setPlanTitle(`${info.titlePrefix} ปีงบ ${planYear} (รอบที่ ${planRound})`);

    if (plannedStops.length > 0) {
      const updatedStops = plannedStops.map((stop) => {
        const matched = safePatients.find((p) => matchPlanStopWithPatient(stop, p));
        if (!matched) return { ...stop, projectType: nextType };
        return {
          ...stop,
          projectType: nextType,
          items: extractPatientRoundItems(matched, planRound, planYear, nextType),
        };
      });
      setPlannedStops(updatedStops);
      showToast(`สลับเป็น "${info.shortLabel}" และอัปเดตรายการสิ่งของตามโครงการแล้ว`);
    }
  };

  // Load existing plan or initialize from registered patients when Year or Round changes
  useEffect(() => {
    const existing = existingPlans[periodKey];
    if (existing) {
      const existingSource = existing.projectSourceType || 'both';
      setProjectSourceType(existingSource);
      setPlanTitle(existing.planTitle);
      setDeliveryDate(existing.deliveryDate || '');
      setDeliveryTimeWindow(existing.deliveryTimeWindow || '09:00 - 16:30 น.');
      setDriverName(existing.driverName || 'นายชนะ สุขด้วง (พนักงานขับรถ)');
      setStaffNames(existing.staffNames || 'พันจ่าเอกอานัส เด็นหมาด (เจ้าพนักงานสาธารณสุข), CG');
      setVehiclePlate(existing.vehiclePlate || 'ผก-4512 ตรัง (รถกระบะ ทต.บางเป้า)');
      setPlanNotes(existing.notes || '');

      // Reconcile and synchronize stops with registered patient database
      const rawStops = existing.stops || [];
      const reconciled = rawStops.map((stop) => {
        const matched = safePatients.find((p) => matchPlanStopWithPatient(stop, p));
        if (matched) {
          const mooFallback = BANGPAO_COORDS[matched.moo || '2'] || BANGPAO_HQ_COORDS;
          const realLat = matched.latitude ?? stop.latitude ?? mooFallback.lat;
          const realLng = matched.longitude ?? stop.longitude ?? mooFallback.lng;
          return {
            ...stop,
            patientId: matched.id, // Guarantee patient ID syncs with registered DB
            fullName: matched.fullName || stop.fullName,
            idCard: matched.idCard || stop.idCard,
            age: matched.age || stop.age,
            gender: matched.gender || stop.gender,
            phone: matched.phone || matched.caregiverPhone || stop.phone,
            caregiverName: matched.caregiverName || stop.caregiverName,
            caregiverPhone: matched.caregiverPhone || stop.caregiverPhone,
            address: matched.address || stop.address,
            landmark: matched.landmark || stop.landmark,
            moo: matched.moo || stop.moo,
            latitude: realLat,
            longitude: realLng,
            adlScore: matched.adlScore ?? stop.adlScore,
            adlCategory: matched.adlCategory || stop.adlCategory,
            projectType: stop.projectType || existingSource,
            items:
              stop.items && stop.items.length > 0
                ? stop.items
                : extractPatientRoundItems(matched, planRound, planYear, existingSource),
          };
        }
        return stop;
      });
      setPlannedStops(reconciled);
    } else {
      // Default: create fresh title and start with empty queue so user can selectively pick villages (e.g. Moo 1 -> Moo 4 -> Moo 6)
      const info = getProjectSourceInfo(projectSourceType);
      const title = `${info.titlePrefix} ปีงบ ${planYear} (รอบที่ ${planRound})`;
      setPlanTitle(title);
      setPlannedStops([]);
    }
  }, [planYear, planRound, existingPlans, safePatients]);

  // Total route metrics (uses real OSRM road distance & driving time when available)
  const routeMetrics = useMemo(() => {
    if (plannedStops.length === 0) return { distanceKm: 0, durationMin: 0, drivingMin: 0 };
    if (osrmRouteMetrics) {
      const serviceMinutes = plannedStops.length * 10; // ~10 mins handover per stop
      return {
        distanceKm: osrmRouteMetrics.distanceKm,
        drivingMin: osrmRouteMetrics.drivingMin,
        durationMin: osrmRouteMetrics.drivingMin + serviceMinutes,
      };
    }

    let totalDist = 0;
    let prevLat = BANGPAO_HQ_COORDS.lat;
    let prevLng = BANGPAO_HQ_COORDS.lng;

    plannedStops.forEach((stop) => {
      const d = calculateHaversineKm(prevLat, prevLng, stop.latitude, stop.longitude) * 1.28;
      totalDist += d;
      prevLat = stop.latitude;
      prevLng = stop.longitude;
    });

    const drivingMinutes = Math.max(2, Math.round((totalDist / 35) * 60));
    const serviceMinutes = plannedStops.length * 10;
    return {
      distanceKm: Number(totalDist.toFixed(1)),
      drivingMin: drivingMinutes,
      durationMin: drivingMinutes + serviceMinutes,
    };
  }, [plannedStops, osrmRouteMetrics]);

  // Requisition items total summary for Step 5
  const suppliesSummary = useMemo(() => {
    const summaryMap: Record<string, { itemName: string; unit: string; totalQty: number }> = {};
    plannedStops.forEach((stop) => {
      stop.items.forEach((it) => {
        const key = it.itemName.trim().toLowerCase();
        if (!summaryMap[key]) {
          summaryMap[key] = {
            itemName: it.itemName,
            unit: it.unit || 'ชิ้น',
            totalQty: 0,
          };
        }
        summaryMap[key].totalQty += it.quantity;
      });
    });
    return Object.values(summaryMap);
  }, [plannedStops]);

  // Leaflet satellite hybrid map renderer in Step 4 with Real OSRM Road Routing
  useEffect(() => {
    if (activeStep !== 4) {
      if (plannerMapInstanceRef.current) {
        try {
          plannerMapInstanceRef.current.remove();
        } catch {}
        plannerMapInstanceRef.current = null;
        plannerRouteLayerRef.current = null;
        plannerMarkersLayerRef.current = null;
      }
      return;
    }

    let isCancelled = false;
    const timer = setTimeout(() => {
      const L = (window as any).L;
      const container = plannerMapContainerRef.current;
      if (!L || !container) return;

      if (!plannerMapInstanceRef.current) {
        if ((container as any)._leaflet_id) {
          (container as any)._leaflet_id = null;
          container.innerHTML = '';
        }

        const map = L.map(container, {
          center: [BANGPAO_HQ_COORDS.lat, BANGPAO_HQ_COORDS.lng],
          zoom: 14,
        });

        L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
          maxZoom: 20,
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
          attribution: '© Google Maps Satellite Hybrid',
        }).addTo(map);

        const routeLayer = L.layerGroup().addTo(map);
        const markersLayer = L.layerGroup().addTo(map);
        plannerMapInstanceRef.current = map;
        plannerRouteLayerRef.current = routeLayer;
        plannerMarkersLayerRef.current = markersLayer;
      }

      const map = plannerMapInstanceRef.current;
      const routeLayer = plannerRouteLayerRef.current;
      const markersLayer = plannerMarkersLayerRef.current;
      if (!map || !routeLayer || !markersLayer) return;

      routeLayer.clearLayers();
      markersLayer.clearLayers();

      // 1. Add Bangpao HQ Marker
      const hqIcon = L.divIcon({
        className: 'hq-pin',
        html: `
          <div style="position:relative;width:38px;height:46px;filter:drop-shadow(0 4px 6px rgba(0,0,0,0.5));">
            <svg viewBox="0 0 24 32" width="38" height="46">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 20 12 20s12-11 12-20c0-6.63-5.37-12-12-12z" fill="#0284c7" stroke="#ffffff" stroke-width="2"/>
              <circle cx="12" cy="11" r="7.5" fill="#ffffff"/>
              <text x="12" y="15" font-size="10" text-anchor="middle" font-family="'Prompt',sans-serif">🏢</text>
            </svg>
          </div>
        `,
        iconSize: [38, 46],
        iconAnchor: [19, 46],
      });
      L.marker([BANGPAO_HQ_COORDS.lat, BANGPAO_HQ_COORDS.lng], { icon: hqIcon })
        .bindTooltip('🏢 เทศบาลตำบลบางเป้า (จุดเริ่มต้นจัดส่ง)', { permanent: false })
        .addTo(markersLayer);

      // 2. Add Stop Markers
      const latLngPoints: [number, number][] = [
        [BANGPAO_HQ_COORDS.lat, BANGPAO_HQ_COORDS.lng],
      ];

      plannedStops.forEach((stop, idx) => {
        const pt: [number, number] = [stop.latitude, stop.longitude];
        latLngPoints.push(pt);

        const stopIcon = L.divIcon({
          className: 'stop-pin',
          html: `
            <div style="position:relative;width:34px;height:44px;filter:drop-shadow(0 3px 5px rgba(0,0,0,0.45));cursor:pointer;">
              <svg viewBox="0 0 24 32" width="34" height="44">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 20 12 20s12-11 12-20c0-6.63-5.37-12-12-12z" fill="#059669" stroke="#ffffff" stroke-width="2.2"/>
                <circle cx="12" cy="11" r="7.5" fill="#ffffff"/>
                <text x="12" y="14.5" font-size="9" text-anchor="middle" font-family="'Prompt',sans-serif" font-weight="900" fill="#065f46">#${idx + 1}</text>
              </svg>
            </div>
          `,
          iconSize: [34, 44],
          iconAnchor: [17, 44],
        });

        const itemsDesc = stop.items.map((i) => `${i.itemName} (${i.quantity})`).join(', ');
        const landmarkHtml = stop.landmark
          ? `<div style="margin-top:2px;color:#b45309;background:#fffbeb;padding:2px 6px;border-radius:4px;border:1px solid #fde68a;font-weight:700;font-size:11px;">📍 ใกล้: ${stop.landmark}</div>`
          : '';

        L.marker(pt, { icon: stopIcon })
          .bindPopup(`
            <div style="font-family:'Prompt',sans-serif;font-size:12px;min-width:210px;">
              <div style="font-weight:800;color:#0f172a;font-size:13px;border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin-bottom:4px;">
                คิว #${idx + 1} — ${stop.fullName}
              </div>
              <div>หมู่ที่ ${stop.moo} ${BANGPAO_VILLAGES[stop.moo] || ''} • ${stop.address}</div>
              ${landmarkHtml}
              <div style="margin-top:2px;">เบอร์โทร: <strong>${stop.phone}</strong></div>
              <div style="margin-top:4px;color:#047857;font-weight:700;">📦 สิ่งของ: ${itemsDesc}</div>
            </div>
          `)
          .addTo(markersLayer);
      });

      // 3. Draw Real Road Route via OSRM Driving API (with driveway snap connectors)
      if (latLngPoints.length > 1) {
        map.fitBounds(L.latLngBounds(latLngPoints), { padding: [40, 40], maxZoom: 16 });

        // Temporary subtle loading line while OSRM calculates actual roads
        L.polyline(latLngPoints, {
          color: '#38bdf8',
          weight: 3.5,
          opacity: 0.6,
          dashArray: '6, 8',
        }).addTo(routeLayer);

        setIsCalculatingRoadRoute(true);
        const coordStr = latLngPoints.map((pt) => `${pt[1]},${pt[0]}`).join(';');
        fetch(`https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson&steps=true`)
          .then((res) => res.json())
          .then((data) => {
            if (isCancelled || !plannerRouteLayerRef.current) return;
            if (data && data.code === 'Ok' && data.routes && data.routes[0]) {
              const route = data.routes[0];
              const roadCoords: [number, number][] = route.geometry.coordinates.map(
                (c: [number, number]) => [c[1], c[0]]
              );

              routeLayer.clearLayers();

              // Draw short driveway/alley connectors ONLY from snapped road access point to house pin
              if (Array.isArray(data.waypoints)) {
                data.waypoints.forEach((wp: any, wpIdx: number) => {
                  if (wp && Array.isArray(wp.location) && latLngPoints[wpIdx]) {
                    const roadSnapPt: [number, number] = [wp.location[1], wp.location[0]];
                    const actualPinPt = latLngPoints[wpIdx];
                    L.polyline([roadSnapPt, actualPinPt], {
                      color: '#fbbf24',
                      weight: 3,
                      opacity: 0.9,
                      dashArray: '4, 5',
                    }).addTo(routeLayer);
                  }
                });
              }

              // Road Outer White Casing
              L.polyline(roadCoords, {
                color: '#ffffff',
                weight: 9,
                opacity: 0.92,
                lineCap: 'round',
                lineJoin: 'round',
              }).addTo(routeLayer);

              // Road Main Blue/Teal Path
              L.polyline(roadCoords, {
                color: '#0284c7',
                weight: 5.5,
                opacity: 0.96,
                lineCap: 'round',
                lineJoin: 'round',
              }).addTo(routeLayer);

              // Road Directional Flow Dashes
              L.polyline(roadCoords, {
                color: '#e0f2fe',
                weight: 2,
                opacity: 0.9,
                dashArray: '8, 12',
              }).addTo(routeLayer);

              // Render leg distance badges along each road leg
              const legs: any[] = route.legs || [];
              const parsedLegs = legs.map((leg: any, legIdx: number) => {
                const legKm = Number(((leg.distance || 0) / 1000).toFixed(1));
                const legMin = Math.max(1, Math.round((leg.duration || 0) / 60));

                // Find midpoint coordinate of this leg from steps if available
                let midCoord: [number, number] | null = null;
                if (leg.steps && leg.steps.length > 0) {
                  const midStep = leg.steps[Math.floor(leg.steps.length / 2)];
                  if (midStep?.maneuver?.location) {
                    midCoord = [midStep.maneuver.location[1], midStep.maneuver.location[0]];
                  }
                }
                if (!midCoord && latLngPoints[legIdx] && latLngPoints[legIdx + 1]) {
                  midCoord = [
                    (latLngPoints[legIdx][0] + latLngPoints[legIdx + 1][0]) / 2,
                    (latLngPoints[legIdx][1] + latLngPoints[legIdx + 1][1]) / 2,
                  ];
                }
                if (midCoord) {
                  const legBadge = L.divIcon({
                    className: '',
                    html: `<div style="background:#0f766e;color:#ffffff;font-family:'Prompt',sans-serif;font-size:10px;font-weight:800;padding:1px 6px;border-radius:999px;border:1.5px solid #ffffff;box-shadow:0 2px 5px rgba(0,0,0,0.35);white-space:nowrap;transform:translate(-50%,-50%);">➔ #${legIdx + 1} (${legKm} กม.)</div>`,
                    iconSize: [0, 0],
                  });
                  L.marker(midCoord, { icon: legBadge, interactive: false }).addTo(routeLayer);
                }

                return { distanceKm: legKm, durationMin: legMin };
              });

              const totalRoadKm = Number(((route.distance || 0) / 1000).toFixed(1));
              const totalDrivingMin = Math.max(2, Math.round((route.duration || 0) / 60));
              setOsrmRouteMetrics({
                distanceKm: totalRoadKm,
                drivingMin: totalDrivingMin,
                legMetrics: parsedLegs,
              });
            }
          })
          .catch(() => {
            // Keep fallback straight line if offline
          })
          .finally(() => {
            if (!isCancelled) setIsCalculatingRoadRoute(false);
          });
      } else {
        setOsrmRouteMetrics(null);
      }

      setTimeout(() => map.invalidateSize(), 100);
    }, 60);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [activeStep, plannedStops]);

  // Multi-stop Google Maps URL generator
  const getGoogleMapsRouteUrl = (): string => {
    if (plannedStops.length === 0) {
      return `https://www.google.com/maps/search/?api=1&query=${BANGPAO_HQ_COORDS.lat},${BANGPAO_HQ_COORDS.lng}`;
    }
    const origin = `${BANGPAO_HQ_COORDS.lat},${BANGPAO_HQ_COORDS.lng}`;
    const lastStop = plannedStops[plannedStops.length - 1];
    const destination = `${lastStop.latitude},${lastStop.longitude}`;
    const waypoints = plannedStops
      .slice(0, -1)
      .map((s) => `${s.latitude},${s.longitude}`)
      .join('|');

    return waypoints
      ? `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`
      : `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
  };

  // Reordering functions
  const handleMoveStop = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= plannedStops.length) return;
    const copy = [...plannedStops];
    const temp = copy[idx];
    copy[idx] = copy[targetIdx];
    copy[targetIdx] = temp;
    // update queue order numbers
    const updated = copy.map((s, i) => ({ ...s, queueOrder: i + 1 }));
    setPlannedStops(updated);
  };

  const handleSetStopPosition = (stopId: string, oneBasedPos: number) => {
    const curIdx = plannedStops.findIndex((s) => s.patientId === stopId);
    if (curIdx === -1) return;
    const targetIdx = Math.max(0, Math.min(plannedStops.length - 1, oneBasedPos - 1));
    if (curIdx === targetIdx) return;
    const copy = [...plannedStops];
    const [moved] = copy.splice(curIdx, 1);
    copy.splice(targetIdx, 0, moved);
    const updated = copy.map((s, i) => ({ ...s, queueOrder: i + 1 }));
    setPlannedStops(updated);
  };

  const handleRemoveStop = (patientId: string) => {
    const filtered = plannedStops
      .filter((s) => s.patientId !== patientId)
      .map((s, i) => ({ ...s, queueOrder: i + 1 }));
    setPlannedStops(filtered);
    showToast('นำรายชื่อออกจากคิวจัดรอบแล้ว');
  };

  // 🚀 Auto-Optimize Nearest Neighbor + 2-Opt using Real Road Driving Distance Matrix (OSRM Table API)
  const handleAutoSortNearest = async () => {
    if (plannedStops.length <= 1) return;
    setIsCalculatingRoadRoute(true);

    try {
      // Index 0 = Bangpao HQ, Index 1..N = plannedStops[0..N-1]
      const allCoords = [
        `${BANGPAO_HQ_COORDS.lng},${BANGPAO_HQ_COORDS.lat}`,
        ...plannedStops.map((s) => `${s.longitude},${s.latitude}`),
      ].join(';');

      const res = await fetch(
        `https://router.project-osrm.org/table/v1/driving/${allCoords}?annotations=duration,distance`
      );
      const data = await res.json();

      if (data && data.code === 'Ok' && Array.isArray(data.durations)) {
        const durations: number[][] = data.durations; // durations[fromIdx][toIdx] in seconds
        const n = plannedStops.length;
        const visited = new Array(n).fill(false);
        const order: number[] = []; // stores 0-based index into plannedStops
        let curNode = 0; // Start at HQ (node 0)

        for (let step = 0; step < n; step++) {
          let bestIdx = -1;
          let minCost = Infinity;
          for (let j = 0; j < n; j++) {
            if (!visited[j]) {
              const cost = durations[curNode]?.[j + 1] ?? Infinity;
              if (cost < minCost) {
                minCost = cost;
                bestIdx = j;
              }
            }
          }
          if (bestIdx === -1) {
            bestIdx = visited.findIndex((v) => !v);
          }
          visited[bestIdx] = true;
          order.push(bestIdx);
          curNode = bestIdx + 1;
        }

        // 2-Opt local refinement to untangle any crossing road segments
        let improved = true;
        let iter = 0;
        const routeNodes = [0, ...order.map((idx) => idx + 1)];
        while (improved && iter < 40) {
          improved = false;
          iter++;
          for (let i = 1; i < routeNodes.length - 2; i++) {
            for (let k = i + 1; k < routeNodes.length - 1; k++) {
              const a = routeNodes[i - 1];
              const b = routeNodes[i];
              const c = routeNodes[k];
              const d = routeNodes[k + 1];
              const currentCost = (durations[a]?.[b] ?? 0) + (durations[c]?.[d] ?? 0);
              const swappedCost = (durations[a]?.[c] ?? 0) + (durations[b]?.[d] ?? 0);
              if (swappedCost + 1 < currentCost) {
                const rev = routeNodes.slice(i, k + 1).reverse();
                routeNodes.splice(i, k - i + 1, ...rev);
                improved = true;
              }
            }
          }
        }

        const sortedStops = routeNodes.slice(1).map((nodeIdx, i) => ({
          ...plannedStops[nodeIdx - 1],
          queueOrder: i + 1,
        }));
        setPlannedStops(sortedStops);
        showToast('🚀 จัดลำดับเส้นทางตามถนนจริงที่สั้นและเร็วที่สุดจาก ทต.บางเป้า เรียบร้อยแล้ว!');
        return;
      }
    } catch {
      // Fallback to Haversine below if offline
    } finally {
      setIsCalculatingRoadRoute(false);
    }

    // Fallback: Haversine Nearest Neighbor
    const unvisited = [...plannedStops];
    const sorted: LtcPlanStop[] = [];
    let curLat = BANGPAO_HQ_COORDS.lat;
    let curLng = BANGPAO_HQ_COORDS.lng;

    while (unvisited.length > 0) {
      let nearestIdx = 0;
      let minDist = Infinity;
      for (let i = 0; i < unvisited.length; i++) {
        const d = calculateHaversineKm(curLat, curLng, unvisited[i].latitude, unvisited[i].longitude);
        if (d < minDist) {
          minDist = d;
          nearestIdx = i;
        }
      }
      const [nextStop] = unvisited.splice(nearestIdx, 1);
      sorted.push(nextStop);
      curLat = nextStop.latitude;
      curLng = nextStop.longitude;
    }

    const updated = sorted.map((s, i) => ({ ...s, queueOrder: i + 1 }));
    setPlannedStops(updated);
    showToast('จัดลำดับเรียงใกล้สุดจาก ทต.บางเป้า เรียบร้อยแล้ว 🚀');
  };

  // 🏘️ Auto-Sort by Village Moo 1 -> 7
  const handleAutoSortByMoo = () => {
    const sorted = [...plannedStops].sort((a, b) => {
      const mooA = parseInt(a.moo, 10) || 99;
      const mooB = parseInt(b.moo, 10) || 99;
      if (mooA !== mooB) return mooA - mooB;
      return a.fullName.localeCompare(b.fullName, 'th');
    });
    const updated = sorted.map((s, i) => ({ ...s, queueOrder: i + 1 }));
    setPlannedStops(updated);
    showToast('จัดลำดับเรียงตามหมู่บ้าน ม.1 ➔ ม.7 เรียบร้อยแล้ว 🏘️');
  };

  // Add/remove a patient to stops from Step 3
  const handleTogglePatientSelection = (p: LtcPatient) => {
    const existingIdx = plannedStops.findIndex((s) => s.patientId === p.id || matchPlanStopWithPatient(s, p));
    if (existingIdx !== -1) {
      const filtered = plannedStops
        .filter((_, idx) => idx !== existingIdx)
        .map((s, i) => ({ ...s, queueOrder: i + 1 }));
      setPlannedStops(filtered);
      showToast(`นำ "${p.fullName}" ออกจากคิวจัดรอบแล้ว`);
    } else {
      const mooFallback = BANGPAO_COORDS[p.moo || '2'] || BANGPAO_HQ_COORDS;
      const lat = p.latitude ?? (mooFallback.lat + 0.001 * (plannedStops.length + 1));
      const lng = p.longitude ?? (mooFallback.lng + 0.001 * (plannedStops.length + 1));
      const newStop: LtcPlanStop = {
        patientId: p.id,
        queueOrder: plannedStops.length + 1,
        fullName: p.fullName,
        idCard: p.idCard,
        age: p.age,
        gender: p.gender,
        phone: p.phone || p.caregiverPhone || '081-000-0000',
        caregiverName: p.caregiverName || 'ญาติผู้ดูแล',
        caregiverPhone: p.caregiverPhone || p.phone || '-',
        address: p.address,
        landmark: p.landmark,
        moo: p.moo || '1',
        latitude: lat,
        longitude: lng,
        adlScore: p.adlScore,
        adlCategory: p.adlCategory || (p.adlScore <= 4 ? 'ติดเตียง' : 'ติดบ้าน'),
        projectType: projectSourceType,
        items: extractPatientRoundItems(p, planRound, planYear),
        scheduledTime: `0${9 + Math.floor(plannedStops.length / 2)}:${(plannedStops.length % 2) * 30 || '00'} น.`,
        deliveryStatus: 'pending',
        notes: p.diagnosis || '',
      };
      setPlannedStops([...plannedStops, newStop]);
      showToast(`เพิ่ม "${p.fullName}" เข้าคิวจัดรอบแล้ว (คิว #${plannedStops.length + 1})`);
    }
  };

  // Select all filtered patients
  const handleSelectAllFiltered = (filteredList: LtcPatient[]) => {
    const toAdd = filteredList.filter(
      (p) => !plannedStops.some((s) => s.patientId === p.id || matchPlanStopWithPatient(s, p))
    );
    if (toAdd.length === 0) return;

    const newStops: LtcPlanStop[] = toAdd.map((p, idx) => {
      const mooFallback = BANGPAO_COORDS[p.moo || '2'] || BANGPAO_HQ_COORDS;
      const lat = p.latitude ?? (mooFallback.lat + 0.001 * (plannedStops.length + idx + 1));
      const lng = p.longitude ?? (mooFallback.lng + 0.001 * (plannedStops.length + idx + 1));
      return {
        patientId: p.id,
        queueOrder: plannedStops.length + idx + 1,
        fullName: p.fullName,
        idCard: p.idCard,
        age: p.age,
        gender: p.gender,
        phone: p.phone || p.caregiverPhone || '081-000-0000',
        caregiverName: p.caregiverName || 'ญาติผู้ดูแล',
        caregiverPhone: p.caregiverPhone || p.phone || '-',
        address: p.address,
        landmark: p.landmark,
        moo: p.moo || '1',
        latitude: lat,
        longitude: lng,
        adlScore: p.adlScore,
        adlCategory: p.adlCategory || (p.adlScore <= 4 ? 'ติดเตียง' : 'ติดบ้าน'),
        projectType: projectSourceType,
        items: extractPatientRoundItems(p, planRound, planYear, projectSourceType),
        scheduledTime: `0${9 + Math.floor((plannedStops.length + idx) / 2)}:${((plannedStops.length + idx) % 2) * 30 || '00'} น.`,
        deliveryStatus: 'pending',
        notes: p.diagnosis || '',
      };
    });

    setPlannedStops([...plannedStops, ...newStops]);
    showToast(`เพิ่มผู้ป่วย ${toAdd.length} ราย เข้าคิวเรียบร้อยแล้ว`);
  };

  // Add all unselected patients in a specific Moo to the queue
  const handleAddMooToQueue = (mooNum: string) => {
    const targetPatients = safePatients.filter(
      (p) => p.status !== 'deceased' && p.moo === mooNum
    );
    const toAdd = targetPatients.filter(
      (p) => !plannedStops.some((s) => s.patientId === p.id || matchPlanStopWithPatient(s, p))
    );
    if (toAdd.length === 0) {
      showToast(`รายชื่อในหมู่ที่ ${mooNum} อยู่ในคิวครบแล้ว`);
      return;
    }

    const newStops: LtcPlanStop[] = toAdd.map((p, idx) => {
      const mooFallback = BANGPAO_COORDS[p.moo || '2'] || BANGPAO_HQ_COORDS;
      const lat = p.latitude ?? (mooFallback.lat + 0.001 * (plannedStops.length + idx + 1));
      const lng = p.longitude ?? (mooFallback.lng + 0.001 * (plannedStops.length + idx + 1));
      return {
        patientId: p.id,
        queueOrder: plannedStops.length + idx + 1,
        fullName: p.fullName,
        idCard: p.idCard,
        age: p.age,
        gender: p.gender,
        phone: p.phone || p.caregiverPhone || '081-000-0000',
        caregiverName: p.caregiverName || 'ญาติผู้ดูแล',
        caregiverPhone: p.caregiverPhone || p.phone || '-',
        address: p.address,
        landmark: p.landmark,
        moo: p.moo || mooNum,
        latitude: lat,
        longitude: lng,
        adlScore: p.adlScore,
        adlCategory: p.adlCategory || (p.adlScore <= 4 ? 'ติดเตียง' : 'ติดบ้าน'),
        projectType: projectSourceType,
        items: extractPatientRoundItems(p, planRound, planYear, projectSourceType),
        scheduledTime: `0${9 + Math.floor((plannedStops.length + idx) / 2)}:${((plannedStops.length + idx) % 2) * 30 || '00'} น.`,
        deliveryStatus: 'pending',
        notes: p.diagnosis || '',
      };
    });

    setPlannedStops([...plannedStops, ...newStops]);
    showToast(`✅ ส่งหมู่ที่ ${mooNum} (${BANGPAO_VILLAGES[mooNum] || ''}) เพิ่ม ${toAdd.length} ราย เข้าคิวเรียบร้อยแล้ว`);
  };

  // Remove all patients in a specific Moo from the queue
  const handleRemoveMooFromQueue = (mooNum: string) => {
    const filtered = plannedStops
      .filter((s) => s.moo !== mooNum)
      .map((s, i) => ({ ...s, queueOrder: i + 1 }));
    setPlannedStops(filtered);
    showToast(`นำรายชื่อหมู่ที่ ${mooNum} ออกจากคิวแล้ว`);
  };

  // Select all registered active patients
  const handleSelectAllPatients = () => {
    const toAdd = safePatients.filter(
      (p) => p.status !== 'deceased' && !plannedStops.some((s) => s.patientId === p.id || matchPlanStopWithPatient(s, p))
    );
    if (toAdd.length === 0) {
      showToast('ผู้ป่วยทุกคนอยู่ในคิวเรียบร้อยแล้ว');
      return;
    }
    const newStops: LtcPlanStop[] = toAdd.map((p, idx) => {
      const mooFallback = BANGPAO_COORDS[p.moo || '2'] || BANGPAO_HQ_COORDS;
      const lat = p.latitude ?? (mooFallback.lat + 0.001 * (plannedStops.length + idx + 1));
      const lng = p.longitude ?? (mooFallback.lng + 0.001 * (plannedStops.length + idx + 1));
      return {
        patientId: p.id,
        queueOrder: plannedStops.length + idx + 1,
        fullName: p.fullName,
        idCard: p.idCard,
        age: p.age,
        gender: p.gender,
        phone: p.phone || p.caregiverPhone || '081-000-0000',
        caregiverName: p.caregiverName || 'ญาติผู้ดูแล',
        caregiverPhone: p.caregiverPhone || p.phone || '-',
        address: p.address,
        landmark: p.landmark,
        moo: p.moo || '1',
        latitude: lat,
        longitude: lng,
        adlScore: p.adlScore,
        adlCategory: p.adlCategory || (p.adlScore <= 4 ? 'ติดเตียง' : 'ติดบ้าน'),
        projectType: projectSourceType,
        items: extractPatientRoundItems(p, planRound, planYear, projectSourceType),
        scheduledTime: `0${9 + Math.floor((plannedStops.length + idx) / 2)}:${((plannedStops.length + idx) % 2) * 30 || '00'} น.`,
        deliveryStatus: 'pending',
        notes: p.diagnosis || '',
      };
    });
    setPlannedStops([...plannedStops, ...newStops]);
    showToast(`ดึงรายชื่อผู้ป่วยทั้งหมด ${toAdd.length} ราย เข้าคิวเรียบร้อยแล้ว`);
  };

  // Reorder stops by Drag & Drop
  const handleReorderStopsByDrag = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const sourceIdx = plannedStops.findIndex((s) => s.patientId === sourceId);
    const targetIdx = plannedStops.findIndex((s) => s.patientId === targetId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const copy = [...plannedStops];
    const [moved] = copy.splice(sourceIdx, 1);
    copy.splice(targetIdx, 0, moved);
    const updated = copy.map((s, i) => ({ ...s, queueOrder: i + 1 }));
    setPlannedStops(updated);
  };

  // Save the plan
  const handleSaveCurrentPlan = () => {
    if (!planTitle.trim()) {
      alert('กรุณาระบุชื่อแผนการจัดรอบ');
      return;
    }
    if (plannedStops.length === 0) {
      alert('กรุณาเลือกผู้รับของอย่างน้อย 1 รายในแผนการจัดรอบนี้');
      return;
    }

    const planToSave: LtcRoundPlan = {
      id: `PLAN-${planYear}-${planRound}`,
      fiscalYear: planYear,
      round: planRound,
      roundName: `งวดรอบที่ ${planRound}`,
      planTitle: planTitle.trim(),
      projectSourceType: projectSourceType,
      deliveryDate: deliveryDate,
      deliveryTimeWindow: deliveryTimeWindow,
      driverName: driverName,
      staffNames: staffNames,
      vehiclePlate: vehiclePlate,
      stops: plannedStops.map((s, idx) => ({
        ...s,
        queueOrder: idx + 1,
        projectType: s.projectType || projectSourceType,
      })),
      totalDistanceKm: routeMetrics.distanceKm,
      totalDurationMin: routeMetrics.durationMin,
      notes: planNotes,
      createdAt: existingPlans[periodKey]?.createdAt || new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString(),
    };

    onSavePlan(planToSave);
    showToast(`✅ บันทึกแผนการจัดรอบ "${planTitle}" เรียบร้อยแล้ว`);
  };

  // Clone to round 2 (or any target round)
  const handleExecuteClone = () => {
    if (!cloneDeliveryDate) {
      alert('กรุณากำหนดวันแจกของรอบใหม่');
      return;
    }

    const projMeta = getProjectSourceInfo(projectSourceType);
    const clonedPlan: LtcRoundPlan = {
      id: `PLAN-${cloneTargetYear}-${cloneTargetRound}`,
      fiscalYear: cloneTargetYear,
      round: cloneTargetRound,
      roundName: `งวดรอบที่ ${cloneTargetRound}`,
      planTitle: `แผนจัดรอบแจกพัสดุ (${projMeta.shortLabel}) ปีงบ ${cloneTargetYear} (รอบที่ ${cloneTargetRound})`,
      projectSourceType: projectSourceType,
      deliveryDate: cloneDeliveryDate,
      deliveryTimeWindow: deliveryTimeWindow,
      driverName: driverName,
      staffNames: staffNames,
      vehiclePlate: vehiclePlate,
      stops: plannedStops.map((s, idx) => ({
        ...s,
        queueOrder: idx + 1,
        projectType: s.projectType || projectSourceType,
        deliveryStatus: 'pending',
        deliveredAt: undefined,
        receiverName: undefined,
      })),
      totalDistanceKm: routeMetrics.distanceKm,
      totalDurationMin: routeMetrics.durationMin,
      notes: `คัดลอกจากแผนงวดรอบที่ ${planRound} ปีงบ ${planYear}`,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString(),
    };

    onSavePlan(clonedPlan);

    // Switch view to the cloned plan immediately!
    setPlanYear(cloneTargetYear);
    setPlanRound(cloneTargetRound);
    setIsCloneModalOpen(false);
    setActiveStep(3); // go to patient list so they can customize round 2 items!
    showToast(
      `🎉 คัดลอกไปเป็นรอบที่ ${cloneTargetRound} ปีงบ ${cloneTargetYear} สำเร็จ! สามารถแก้ไขสิ่งของและรายชื่อได้ทันที`
    );
  };

  // Print official A4 Delivery Manifest Sheet
  const handlePrintDeliverySheet = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=1100');
    if (!printWindow) {
      alert('เบราว์เซอร์บล็อกหน้าต่างพิมพ์ กรุณาอนุญาต Pop-up');
      return;
    }

    const rowsHtml = plannedStops
      .map(
        (stop, idx) => `
        <tr style="border-bottom: 1px solid #cbd5e1;">
          <td style="padding: 8px 6px; text-align: center; font-weight: bold; width: 35px;">#${
            idx + 1
          }</td>
          <td style="padding: 8px 6px; width: 65px; text-align: center; font-family: monospace;">${
            stop.scheduledTime || '-'
          }</td>
          <td style="padding: 8px 6px;">
            <div style="font-weight: bold; color: #0f172a;">${stop.fullName} (${stop.age} ปี)</div>
            <div style="font-size: 11px; color: #64748b;">หมู่ที่ ${stop.moo} ${
          BANGPAO_VILLAGES[stop.moo] || ''
        } • ${stop.adlCategory}</div>
            <div style="font-size: 11px; color: #475569;">📞 ${stop.phone} (ผู้ดูแล: ${
          stop.caregiverName
        })</div>
          </td>
          <td style="padding: 8px 6px; font-size: 11px; max-width: 160px;">
            ${stop.address}
          </td>
          <td style="padding: 8px 6px; width: 220px;">
            ${stop.items
              .map(
                (it) => `
              <div style="font-size: 11px; line-height: 1.4;">
                <span style="font-weight: 700; color: #065f46;">• ${it.itemName}:</span> 
                <strong>${it.quantity}</strong> ${it.unit}
              </div>
            `
              )
              .join('')}
          </td>
          <td style="padding: 8px 6px; width: 110px; text-align: center;">
            <div style="border-bottom: 1px dotted #94a3b8; height: 26px; margin-bottom: 2px;"></div>
            <span style="font-size: 10px; color: #64748b;">(ผู้รับมอบ/CG)</span>
          </td>
        </tr>
      `
      )
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${planTitle} - ใบนำส่งมอบพัสดุ A4</title>
        <meta charset="utf-8" />
        <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          @page { size: A4 portrait; margin: 12mm 15mm; }
          body { font-family: 'Prompt', sans-serif; font-size: 12px; color: #1e293b; margin: 0; padding: 0; }
          .header { text-align: center; border-bottom: 2px solid #0f766e; padding-bottom: 10px; margin-bottom: 12px; }
          .title { font-size: 16px; font-weight: 800; color: #0f766e; }
          .subtitle { font-size: 12px; color: #475569; margin-top: 3px; }
          .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          th { background: #f1f5f9; color: #334155; font-size: 11px; font-weight: 700; text-align: left; padding: 8px 6px; border-bottom: 2px solid #cbd5e1; }
          .summary-card { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 8px 12px; border-radius: 6px; margin-bottom: 16px; font-size: 11px; }
          .sign-area { display: flex; justify-content: space-between; margin-top: 24px; padding: 0 20px; page-break-inside: avoid; }
          .sign-col { text-align: center; width: 220px; font-size: 11px; }
          .sign-line { border-bottom: 1px dotted #475569; margin-bottom: 6px; height: 35px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">เทศบาลตำบลบางเป้า อำเภอกันตัง จังหวัดตรัง</div>
          <div style="font-weight: 700; font-size: 14px; margin-top: 2px;">ใบสรุปแผนการจัดรอบและใบส่งมอบพัสดุ (${getProjectSourceInfo(projectSourceType).fullLabel})</div>
          <div class="subtitle">${planTitle} • ประจำปีงบประมาณ ${planYear}</div>
        </div>

        <div class="meta-box">
          <div><strong>📅 วันที่แจก:</strong> ${deliveryDate || 'ยังไม่ระบุ'}</div>
          <div><strong>⏰ ช่วงเวลา:</strong> ${deliveryTimeWindow}</div>
          <div><strong>🚗 ยานพาหนะ:</strong> ${vehiclePlate}</div>
          <div><strong>🚚 พนักงานขับรถ:</strong> ${driverName}</div>
          <div><strong>🩺 จนท.สาธารณสุข/CG:</strong> ${staffNames}</div>
          <div><strong>📍 จำนวนบ้านในคิว:</strong> ${plannedStops.length} ราย (ระยะทาง ${
      routeMetrics.distanceKm
    } กม.)</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="text-align: center;">คิว</th>
              <th style="text-align: center;">เวลานัด</th>
              <th>ข้อมูลผู้ป่วย & ผู้ดูแล</th>
              <th>ที่อยู่ / พิกัด</th>
              <th>รายการสิ่งของที่ส่งมอบ</th>
              <th style="text-align: center;">ลายมือชื่อผู้รับ</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="summary-card">
          <strong>📦 สรุปยอดสิ่งของรวมที่ต้องเบิกจ่ายในรอบนี้:</strong>
          <div style="margin-top: 4px; display: flex; flex-wrap: wrap; gap: 14px;">
            ${suppliesSummary
              .map(
                (s) =>
                  `<span>• <strong>${s.itemName}:</strong> ${s.totalQty.toLocaleString()} ${
                    s.unit
                  }</span>`
              )
              .join('')}
          </div>
        </div>

        <div class="sign-area">
          <div class="sign-col">
            <div class="sign-line"></div>
            <div>( ${driverName.split(' ')[0]} ${driverName.split(' ')[1] || ''} )</div>
            <div>พนักงานขับรถส่งมอบ</div>
          </div>
          <div class="sign-col">
            <div class="sign-line"></div>
            <div>( พันจ่าเอกอานัส เด็นหมาด )</div>
            <div>เจ้าพนักงานสาธารณสุขชำนาญงาน</div>
          </div>
          <div class="sign-col">
            <div class="sign-line"></div>
            <div>( นายกเทศมนตรีตำบลบางเป้า หรือผู้แทน )</div>
            <div>ผู้อนุมัติแผนการจัดส่ง</div>
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Helper to check if a patient is in the current plan stops
  const isPatientInPlan = (p: LtcPatient): boolean => {
    return plannedStops.some((s) => s.patientId === p.id || matchPlanStopWithPatient(s, p));
  };

  const findPatientStopIndex = (p: LtcPatient): number => {
    return plannedStops.findIndex((s) => s.patientId === p.id || matchPlanStopWithPatient(s, p));
  };

  // Base filtered patients by Moo, ADL, and Search (Step 3)
  const baseFilteredPatients = useMemo(() => {
    return safePatients.filter((p) => {
      if (p.status === 'deceased') return false;
      if (patientMooFilter !== 'all' && p.moo !== patientMooFilter) return false;
      if (patientAdlFilter !== 'all') {
        const cat = p.adlCategory || (p.adlScore <= 4 ? 'ติดเตียง' : 'ติดบ้าน');
        if (patientAdlFilter === 'bedridden' && cat !== 'ติดเตียง') return false;
        if (patientAdlFilter === 'homebound' && cat !== 'ติดบ้าน') return false;
      }
      if (patientSearch.trim()) {
        const q = patientSearch.trim().toLowerCase();
        const matchName = p.fullName.toLowerCase().includes(q);
        const matchHn = p.hn?.toLowerCase().includes(q);
        const matchIdCard = p.idCard?.replace(/-/g, '').includes(q.replace(/-/g, ''));
        const matchPhone = p.phone?.includes(q) || p.caregiverPhone?.includes(q);
        const matchAddr = p.address?.toLowerCase().includes(q);
        const matchLandmark = p.landmark?.toLowerCase().includes(q);
        if (!matchName && !matchHn && !matchIdCard && !matchPhone && !matchAddr && !matchLandmark) return false;
      }
      return true;
    });
  }, [safePatients, patientMooFilter, patientAdlFilter, patientSearch]);

  // Counts within current base filter
  const inQueueCountInFilter = useMemo(() => {
    return baseFilteredPatients.filter((p) => isPatientInPlan(p)).length;
  }, [baseFilteredPatients, plannedStops]);

  const unselectedCountInFilter = useMemo(() => {
    return baseFilteredPatients.length - inQueueCountInFilter;
  }, [baseFilteredPatients, inQueueCountInFilter]);

  // Displayed patients in Step 3 table based on view mode tab
  const displayedPatients = useMemo(() => {
    return baseFilteredPatients.filter((p) => {
      const inPlan = isPatientInPlan(p);
      if (selectionViewMode === 'selected') return inPlan;
      if (selectionViewMode === 'unselected') return !inPlan;
      return true;
    });
  }, [baseFilteredPatients, plannedStops, selectionViewMode]);

  // For backwards compatibility and toolbar
  const filteredPatients = displayedPatients;

  const selectedPatientIds = useMemo(() => new Set(plannedStops.map((s) => s.patientId)), [plannedStops]);

  // Patients who are not yet in the plan stops (for quick add in Step 4)
  const unselectedPatients = useMemo(() => {
    return safePatients.filter((p) => p.status !== 'deceased' && !isPatientInPlan(p));
  }, [safePatients, plannedStops]);

  // Moo-level counts
  const currentMooPatients = useMemo(() => {
    if (patientMooFilter === 'all') return [];
    return safePatients.filter((p) => p.status !== 'deceased' && p.moo === patientMooFilter);
  }, [safePatients, patientMooFilter]);

  const currentMooSelectedCount = useMemo(() => {
    return currentMooPatients.filter((p) => isPatientInPlan(p)).length;
  }, [currentMooPatients, plannedStops]);

  const currentMooUnselectedCount = useMemo(() => {
    return currentMooPatients.length - currentMooSelectedCount;
  }, [currentMooPatients, currentMooSelectedCount]);

  // Selected counts by Moo map across all plannedStops
  const selectedCountByMoo = useMemo(() => {
    const counts: Record<string, number> = {};
    plannedStops.forEach((s) => {
      const m = s.moo || '1';
      counts[m] = (counts[m] || 0) + 1;
    });
    return counts;
  }, [plannedStops]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Top Header Bar */}
        <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-800 text-white px-5 py-4 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-white shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  ระบบจัดรอบ & แผนส่งมอบพัสดุ สปสช. LTC
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-400 text-emerald-950 font-black text-xs">
                  ปีงบ {planYear} • รอบที่ {planRound}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full font-extrabold text-[11px] border ${getProjectSourceInfo(projectSourceType).badgeClass}`}>
                  {getProjectSourceInfo(projectSourceType).shortLabel}
                </span>
                {existingPlans[periodKey] && (
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-white font-bold text-[11px]">
                    💾 บันทึกแล้ว ({plannedStops.length} ราย)
                  </span>
                )}
              </div>
              <p className="text-xs text-teal-100 mt-0.5">
                เทศบาลตำบลบางเป้า • วางแผนจัดรอบ, คัดเลือกรายชื่อ, กำหนดวันแจก, จัดลำดับเส้นทาง และคัดลอกรอบถัดไป
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {existingPlans[periodKey] && onDeleteRoundPlan && (
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      `ยืนยันการลบแผนที่จัดไว้ของ "ปีงบประมาณ ${planYear} • งวดรอบที่ ${planRound}" หรือไม่?\n(รายชื่อผู้ป่วยในฐานข้อมูลหลักจะไม่ถูกลบ ลบเฉพาะแผนและคิวของรอบนี้)`
                    )
                  ) {
                    onDeleteRoundPlan(planYear, planRound, false);
                    setPlannedStops([]);
                    showToast(`🗑️ ลบแผนจัดรอบ ปีงบ ${planYear} รอบที่ ${planRound} เรียบร้อยแล้ว`);
                  }
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/90 hover:bg-rose-600 text-white font-extrabold text-xs shadow-xs transition-all cursor-pointer border border-rose-300/40 whitespace-nowrap shrink-0"
                title="ลบแผนที่จัดไว้ในรอบนี้"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>ลบแผนรอบนี้</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsCloneModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-extrabold text-xs shadow-xs transition-all cursor-pointer whitespace-nowrap shrink-0"
              title="คัดลอกแผนจัดรอบนี้ไปเป็นรอบถัดไป"
            >
              <Copy className="w-3.5 h-3.5 shrink-0" />
              <span>📋 คัดลอกไปจัดรอบ {String(Number(planRound) + 1)}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-sm cursor-pointer transition-colors shrink-0"
              title="ปิดหน้าต่าง"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-xs font-bold text-emerald-900 flex items-center justify-between animate-in slide-in-from-top duration-150">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{toastMessage}</span>
            </span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-emerald-700 font-bold px-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* 5 Guided Step Navigation Tabs */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-3 py-2 flex items-center justify-between gap-1 overflow-x-auto text-xs shrink-0">
          <div className="flex items-center gap-1 min-w-max">
            {/* Step 1 */}
            <button
              type="button"
              onClick={() => setActiveStep(1)}
              className={`px-3 py-1.5 rounded-xl font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeStep === 1
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                1
              </span>
              <span>เลือก ปี พ.ศ. & รอบ</span>
            </button>

            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

            {/* Step 2 */}
            <button
              type="button"
              onClick={() => setActiveStep(2)}
              className={`px-3 py-1.5 rounded-xl font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeStep === 2
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                2
              </span>
              <span>กำหนดวันแจก & ทีมงาน</span>
            </button>

            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

            {/* Step 3 */}
            <button
              type="button"
              onClick={() => setActiveStep(3)}
              className={`px-3 py-1.5 rounded-xl font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeStep === 3
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                3
              </span>
              <span>เลือกรายชื่อ & ดึงข้อมูล ({plannedStops.length})</span>
            </button>

            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

            {/* Step 4 */}
            <button
              type="button"
              onClick={() => setActiveStep(4)}
              className={`px-3 py-1.5 rounded-xl font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeStep === 4
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                4
              </span>
              <span>จัดลำดับคิว & แผนเดินทาง</span>
            </button>

            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

            {/* Step 5 */}
            <button
              type="button"
              onClick={() => setActiveStep(5)}
              className={`px-3 py-1.5 rounded-xl font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeStep === 5
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                5
              </span>
              <span>สรุปยอด & ยืนยันแผน</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveCurrentPlan}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>บันทึกแผน</span>
            </button>
          </div>
        </div>

        {/* Main Body Content based on Active Step */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* ================= STEP 1: เลือก ปี พ.ศ. & เลือกรอบ ================= */}
          {activeStep === 1 && (
            <div className="max-w-4xl mx-auto space-y-5 animate-in fade-in duration-150">
              <div className="bg-teal-50/70 border border-teal-200 rounded-2xl p-4">
                <h3 className="text-sm sm:text-base font-extrabold text-teal-950 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-teal-700" />
                  <span>ขั้นตอนที่ 1: เลือกปีงบประมาณและวงรอบการแจกจ่าย</span>
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  กำหนดปีงบประมาณและวงรอบที่ต้องการจัดรอบส่งมอบพัสดุ LTC โดยระบบจะโหลดแผนที่มีอยู่เดิมอัตโนมัติ หรือให้ท่านจัดรอบใหม่ได้ทันที
                </p>
              </div>

              {/* 1. Fiscal Year Picker */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
                <label className="block text-xs font-bold text-slate-700">
                  📅 เลือกปีงบประมาณ (พ.ศ.):
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {configuredYears.map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => setPlanYear(yr)}
                      className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                        planYear === yr
                          ? 'bg-teal-700 text-white shadow-xs scale-102 ring-2 ring-teal-300'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      ปีงบประมาณ {yr}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const nextYr = String(parseInt(configuredYears[configuredYears.length - 1] || '2570', 10) + 1);
                      setPlanYear(nextYr);
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 text-slate-500 border border-dashed border-slate-300 hover:bg-slate-100 cursor-pointer"
                  >
                    + เพิ่มปีถัดไป
                  </button>
                </div>
              </div>

              {/* 2. Round Picker */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    🔄 เลือกงวดรอบการแจกจ่าย (ประจำปี {planYear}):
                  </label>
                  {onAddNewRound && (
                    <button
                      type="button"
                      onClick={onAddNewRound}
                      className="text-xs text-teal-700 font-extrabold hover:text-teal-900 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>เพิ่มรอบใหม่</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {configuredRounds.map((rd) => {
                    const rdKey = `${planYear}_${rd}`;
                    const hasPlan = Boolean(existingPlans[rdKey]);
                    const stopCount = existingPlans[rdKey]?.stops.length || 0;
                    const rdProjType = existingPlans[rdKey]?.projectSourceType || 'both';
                    const isSelected = planRound === rd;

                    return (
                      <div
                        key={rd}
                        onClick={() => setPlanRound(rd)}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-teal-50 border-teal-500 ring-2 ring-teal-300 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-sm text-slate-900">
                              งวดรอบที่ {rd}
                            </span>
                            <div className="flex items-center gap-1">
                              {isSelected && (
                                <CheckCircle2 className="w-4 h-4 text-teal-700" />
                              )}
                              {onDeleteRoundPlan && (hasPlan || (configuredRounds.length > 1 && rd !== '1')) && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (hasPlan) {
                                      const shouldRemoveSlot =
                                        rd !== '1' &&
                                        window.confirm(
                                          `ยืนยันการลบแผนที่จัดไว้ของ "ปีงบประมาณ ${planYear} • งวดรอบที่ ${rd}" (${stopCount} ราย) หรือไม่?\n\n(กด ตกลง เพื่อลบแผนรอบนี้ — รายชื่อผู้ป่วยในฐานข้อมูลหลักจะไม่ถูกลบ)`
                                        );
                                      if (rd === '1') {
                                        if (
                                          window.confirm(
                                            `ยืนยันการลบแผนที่จัดไว้ของ "ปีงบประมาณ ${planYear} • งวดรอบที่ 1" (${stopCount} ราย) หรือไม่?\n\n(กด ตกลง เพื่อลบแผนและล้างคิวของรอบที่ 1)`
                                          )
                                        ) {
                                          onDeleteRoundPlan(planYear, rd, false);
                                          if (planRound === rd) setPlannedStops([]);
                                          showToast(`🗑️ ลบแผนจัดรอบที่ ${rd} (ปีงบ ${planYear}) เรียบร้อยแล้ว`);
                                        }
                                      } else if (shouldRemoveSlot) {
                                        onDeleteRoundPlan(planYear, rd, true);
                                        if (planRound === rd) {
                                          setPlanRound('1');
                                        }
                                        showToast(`🗑️ ลบแผนและงวดรอบที่ ${rd} เรียบร้อยแล้ว`);
                                      }
                                    } else if (rd !== '1') {
                                      if (window.confirm(`ต้องการลบ "งวดรอบที่ ${rd}" ออกจากรายการรอบหรือไม่?`)) {
                                        onDeleteRoundPlan(planYear, rd, true);
                                        if (planRound === rd) setPlanRound('1');
                                        showToast(`🗑️ ลบงวดรอบที่ ${rd} เรียบร้อยแล้ว`);
                                      }
                                    }
                                  }}
                                  className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                                  title={hasPlan ? `ลบแผนที่จัดไว้ของรอบที่ ${rd}` : `ลบรอบที่ ${rd}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {hasPlan && existingPlans[rdKey]?.deliveryDate
                              ? `กำหนดแจก: ${existingPlans[rdKey].deliveryDate}`
                              : `รอบการแจกจ่ายประจำปี ${planYear}`}
                          </div>
                          {hasPlan && (
                            <div className="mt-1">
                              <span className={`inline-block text-[10px] font-extrabold px-1.5 py-0.5 rounded border ${getProjectSourceInfo(rdProjType).badgeClass}`}>
                                {getProjectSourceInfo(rdProjType).shortLabel}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1 text-[11px]">
                          {hasPlan ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              ✓ มีแผนบันทึกแล้ว ({stopCount} ราย)
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-slate-400 font-medium">
                              ยังไม่มีแผนรอบนี้
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2.5 Project Source Type Picker (สปสช. / LTC / แจกพร้อมกันทั้งคู่) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="block text-xs font-extrabold text-slate-800">
                    🎯 เลือกโครงการที่แจกจ่ายในรอบนี้ (แยกตามแหล่งงบ/โครงการ หรือแจกพร้อมกัน):
                  </label>
                  <span className="text-[11px] text-teal-700 font-bold">
                    ✨ ระบบจะดึงรายการพัสดุและออกใบสรุปแยกตามโครงการที่เลือกอัตโนมัติ
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(['nhso', 'ltc', 'both'] as LtcProjectSourceType[]).map((pType) => {
                    const info = getProjectSourceInfo(pType);
                    const isSelected = projectSourceType === pType;
                    return (
                      <button
                        key={pType}
                        type="button"
                        onClick={() => handleSwitchProjectSourceType(pType)}
                        className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? pType === 'nhso'
                              ? 'bg-sky-50/90 border-sky-600 ring-2 ring-sky-200 shadow-xs'
                              : pType === 'ltc'
                              ? 'bg-purple-50/90 border-purple-600 ring-2 ring-purple-200 shadow-xs'
                              : 'bg-teal-50/90 border-teal-600 ring-2 ring-teal-200 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-black text-xs sm:text-sm text-slate-900">
                              {info.fullLabel}
                            </span>
                            {isSelected && (
                              <span className="w-5 h-5 rounded-full bg-teal-700 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                                ✓
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
                            {info.desc}
                          </p>
                        </div>
                        <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-extrabold">
                          <span className={`px-2 py-0.5 rounded-md border ${info.badgeClass}`}>
                            {info.shortLabel}
                          </span>
                          <span className="text-slate-500">
                            {isSelected ? 'กำลังใช้งานโหมดนี้' : 'คลิกเพื่อเลือก'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Plan Title Name */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  🏷️ ชื่อแผนการจัดรอบ:
                </label>
                <input
                  type="text"
                  value={planTitle}
                  onChange={(e) => setPlanTitle(e.target.value)}
                  placeholder="เช่น แผนจัดรอบแจกพัสดุ สปสช. LTC งวดที่ 1 ปีงบ 2569"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              {/* Bottom Nav */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-extrabold text-xs sm:text-sm flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <span>ถัดไป: กำหนดวันแจก & ทีมงาน</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 2: กำหนดวันแจก & ทีมงาน ================= */}
          {activeStep === 2 && (
            <div className="max-w-4xl mx-auto space-y-5 animate-in fade-in duration-150">
              <div className="bg-teal-50/70 border border-teal-200 rounded-2xl p-4">
                <h3 className="text-sm sm:text-base font-extrabold text-teal-950 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-teal-700" />
                  <span>ขั้นตอนที่ 2: กำหนดวันแจกพัสดุและทีมงานผู้รับผิดชอบ</span>
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  ระบุวันที่นำส่งพัสดุถึงบ้านผู้ป่วย ช่วงเวลานัดหมาย พนักงานขับรถ และเจ้าหน้าที่ผู้ลงพื้นที่ส่งมอบ
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Delivery Date */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2">
                  <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-teal-700" />
                    <span>วันที่แจก / นำส่งอุปกรณ์ (Delivery Date):</span>
                  </label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                  <p className="text-[11px] text-slate-400">
                    กำหนดวันที่รถเทศบาลจะออกวิ่งแจกของถึงบ้านผู้ป่วย
                  </p>
                </div>

                {/* 2. Time Window */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2">
                  <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Clock className="w-4 h-4 text-teal-700" />
                    <span>ช่วงเวลานัดหมายแจกจ่าย:</span>
                  </label>
                  <select
                    value={deliveryTimeWindow}
                    onChange={(e) => setDeliveryTimeWindow(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none cursor-pointer"
                  >
                    <option value="09:00 - 16:30 น.">ตลอดวัน (09:00 - 16:30 น.)</option>
                    <option value="09:00 - 12:00 น.">ช่วงเช้า (09:00 - 12:00 น.)</option>
                    <option value="13:00 - 16:30 น.">ช่วงบ่าย (13:00 - 16:30 น.)</option>
                  </select>
                </div>

                {/* 3. Driver */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2">
                  <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Truck className="w-4 h-4 text-teal-700" />
                    <span>พนักงานขับรถส่งของ:</span>
                  </label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="เช่น นายชนะ สุขด้วง"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>

                {/* 4. Staff / CG */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2">
                  <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Users className="w-4 h-4 text-teal-700" />
                    <span>เจ้าหน้าที่สาธารณสุข & CG ร่วมทีม:</span>
                  </label>
                  <input
                    type="text"
                    value={staffNames}
                    onChange={(e) => setStaffNames(e.target.value)}
                    placeholder="เช่น พันจ่าเอกอานัส เด็นหมาด, CG ประจำหมู่บ้าน"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>

                {/* 5. Vehicle */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2 md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700">
                    🚐 ยานพาหนะที่ใช้จัดส่ง:
                  </label>
                  <input
                    type="text"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    placeholder="เช่น รถกระบะบรรทุก ทต.บางเป้า (ทะเบียน ผก-4512 ตรัง)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>

                {/* 6. Notes */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2 md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700">
                    📝 หมายเหตุการจัดส่ง / คำแนะนำพนักงาน:
                  </label>
                  <textarea
                    rows={2}
                    value={planNotes}
                    onChange={(e) => setPlanNotes(e.target.value)}
                    placeholder="เช่น จัดส่งพร้อมชุดสาธิตพลิกตัว นัดหมายญาติให้เตรียมผู้รับมอบ"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>

              {/* Bottom Nav */}
              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs sm:text-sm cursor-pointer"
                >
                  ย้อนกลับ
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStep(3)}
                  className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-extrabold text-xs sm:text-sm flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <span>ถัดไป: เลือกรายชื่อผู้รับของ</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 3: เลือกรายชื่อ & ดึงข้อมูลอัตโนมัติ ================= */}
          {activeStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-teal-50/70 border border-teal-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-teal-950 flex items-center gap-2">
                    <Users className="w-5 h-5 text-teal-700" />
                    <span>ขั้นตอนที่ 3: เลือกรายชื่อผู้มีภาวะพึ่งพิง (ดึงข้อมูลอัตโนมัติครบถ้วน)</span>
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    ระบบดึงข้อมูลจากทะเบียนผู้ป่วยมาให้อัตโนมัติ: <strong>พิกัด GPS, ที่อยู่, อายุ, เบอร์โทร, ผู้ดูแล และรายการสิ่งของ</strong> โดยสามารถกดแก้ไขสิ่งของของแต่ละคนได้
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-3 py-1.5 rounded-xl bg-teal-700 text-white font-black text-xs shadow-2xs">
                    เลือกแล้ว {plannedStops.length} / {safePatients.length} ราย
                  </span>
                </div>
              </div>

              {/* Village Queue Chips Bar */}
              {plannedStops.length > 0 && (
                <div className="p-3.5 bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50 border border-teal-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-teal-950 flex-wrap gap-2">
                    <span className="flex items-center gap-1.5 font-extrabold text-teal-900">
                      <Home className="w-4 h-4 text-teal-700" />
                      <span>หมู่บ้านที่จัดคิวส่งมอบแล้ว ({Object.keys(selectedCountByMoo).length} หมู่บ้าน • รวม {plannedStops.length} ราย):</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setPlannedStops([])}
                      className="text-rose-600 hover:text-rose-800 text-[11px] font-bold underline cursor-pointer"
                    >
                      ล้างคิวทั้งหมด
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {Object.entries(selectedCountByMoo)
                      .sort(([a], [b]) => Number(a) - Number(b))
                      .map(([moo, count]) => (
                        <div
                          key={moo}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-extrabold shadow-2xs transition-all ${
                            patientMooFilter === moo
                              ? 'bg-teal-700 text-white ring-2 ring-teal-400'
                              : 'bg-white text-teal-900 border border-teal-300 hover:bg-teal-100/70'
                          }`}
                        >
                          <span
                            onClick={() => setPatientMooFilter(moo)}
                            className="cursor-pointer"
                            title="คลิกเพื่อกรองดูรายชื่อหมู่นี้ในตาราง"
                          >
                            🏡 หมู่ {moo} ({BANGPAO_VILLAGES[moo] || ''}): {count} ราย
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveMooFromQueue(moo)}
                            className="p-0.5 rounded hover:bg-black/10 font-black cursor-pointer text-[12px] leading-none text-rose-300 hover:text-white"
                            title={`นำรายชื่อหมู่ที่ ${moo} ออกจากคิว`}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Filter Toolbar for Selection */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-xs space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 text-xs">
                  {/* Search */}
                  <div className="relative">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      🔍 ค้นหาชื่อ/เบอร์โทร:
                    </label>
                    <input
                      type="text"
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      placeholder="พิมพ์ชื่อ, เบอร์..."
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  {/* Moo Filter */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      🏡 หมู่บ้าน (ม.1 - ม.7):
                    </label>
                    <select
                      value={patientMooFilter}
                      onChange={(e) => setPatientMooFilter(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500 cursor-pointer"
                    >
                      <option value="all">ทุกหมู่บ้าน ({safePatients.filter(p => p.status !== 'deceased').length} ราย)</option>
                      {Object.entries(BANGPAO_VILLAGES).map(([m, name]) => {
                        const inMoo = safePatients.filter((p) => p.status !== 'deceased' && p.moo === m).length;
                        const inQueue = selectedCountByMoo[m] || 0;
                        return (
                          <option key={m} value={m}>
                            หมู่ที่ {m} {name} ({inMoo} ราย {inQueue > 0 ? `• ในคิว ${inQueue}` : ''})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* ADL Filter */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      🩺 ภาวะพึ่งพิง:
                    </label>
                    <select
                      value={patientAdlFilter}
                      onChange={(e) => setPatientAdlFilter(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500 cursor-pointer"
                    >
                      <option value="all">ทุกระดับพึ่งพิง</option>
                      <option value="bedridden">เฉพาะติดเตียง</option>
                      <option value="homebound">เฉพาะติดบ้าน</option>
                    </select>
                  </div>

                  {/* Global Quick Action Buttons */}
                  <div className="flex items-end gap-1.5">
                    {patientMooFilter === 'all' && !patientSearch.trim() && patientAdlFilter === 'all' ? (
                      <button
                        type="button"
                        onClick={handleSelectAllPatients}
                        className="flex-1 py-1.5 px-2 bg-teal-100 hover:bg-teal-200 text-teal-900 rounded-lg font-bold text-xs transition-colors cursor-pointer"
                        title="เลือกผู้ป่วยทุกคนทั้งหมดเข้าคิว"
                      >
                        📥 ดึงทุกคน ({safePatients.filter(p => p.status !== 'deceased').length})
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSelectAllFiltered(baseFilteredPatients)}
                        disabled={unselectedCountInFilter === 0}
                        className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                          unselectedCountInFilter > 0
                            ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                        title="เลือกรายชื่อที่กรองไว้ทั้งหมดเข้าคิว"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>✓ เลือกทุกคนที่กรอง ({unselectedCountInFilter})</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setPlannedStops([])}
                      className="py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs transition-colors cursor-pointer"
                      title="ล้างรายชื่อที่เลือกทั้งหมด"
                    >
                      ล้าง
                    </button>
                  </div>
                </div>

                {/* Moo-level bulk actions banner when a specific Moo is selected */}
                {patientMooFilter !== 'all' && (
                  <div className="flex items-center justify-between gap-2 p-2.5 bg-emerald-50/80 border border-emerald-300 rounded-xl flex-wrap text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-emerald-950">
                        🏡 หมู่ที่ {patientMooFilter} {BANGPAO_VILLAGES[patientMooFilter]}:
                      </span>
                      <span className="text-slate-600">
                        ทั้งหมด <strong>{currentMooPatients.length}</strong> ราย (ในคิวแล้ว <strong className="text-emerald-800">{currentMooSelectedCount}</strong> ราย
                        {currentMooUnselectedCount > 0 ? `, รอส่งเข้าคิว ${currentMooUnselectedCount} ราย` : ' • ครบทุกรายในหมู่นี้แล้ว ✅'})
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {currentMooUnselectedCount > 0 && (
                        <button
                          type="button"
                          onClick={() => handleAddMooToQueue(patientMooFilter)}
                          className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-extrabold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>📥 ส่งทั้งหมู่ {patientMooFilter} เข้าคิว (+{currentMooUnselectedCount} ราย)</span>
                        </button>
                      )}
                      {currentMooSelectedCount > 0 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMooFromQueue(patientMooFilter)}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold text-xs cursor-pointer transition-colors"
                          title={`นำรายชื่อหมู่ที่ ${patientMooFilter} ออกจากคิวทั้งหมด`}
                        >
                          <span>✕ นำทั้งหมู่ {patientMooFilter} ออก</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* View Mode Tabs: All Filtered vs In Queue vs Unselected */}
                <div className="flex items-center gap-1.5 border-t border-slate-100 pt-2.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSelectionViewMode('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-colors cursor-pointer ${
                      selectionViewMode === 'all'
                        ? 'bg-teal-700 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    📋 แสดงทั้งหมดที่กรอง ({baseFilteredPatients.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectionViewMode('selected')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-colors cursor-pointer flex items-center gap-1 ${
                      selectionViewMode === 'selected'
                        ? 'bg-emerald-700 text-white shadow-2xs'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>✓ เฉพาะที่อยู่ในคิว ({inQueueCountInFilter} ราย)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectionViewMode('unselected')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-colors cursor-pointer ${
                      selectionViewMode === 'unselected'
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    ⏳ ยังไม่ถูกเลือก ({unselectedCountInFilter} ราย)
                  </button>
                </div>
              </div>

              {/* Patient Selection Table / Cards */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-extrabold border-b border-slate-200">
                        <th className="py-2.5 px-3 text-center w-20">คิว / เลือก</th>
                        <th className="py-2.5 px-3">ผู้ป่วย & อายุ</th>
                        <th className="py-2.5 px-3">ที่อยู่ & หมู่บ้าน & พิกัด</th>
                        <th className="py-2.5 px-3">เบอร์โทร & ผู้ดูแล</th>
                        <th className="py-2.5 px-3">สิ่งของที่ต้องได้รับในรอบนี้</th>
                        <th className="py-2.5 px-3 text-center w-36">จัดการ / แก้ไขของ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayedPatients.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            {selectionViewMode === 'selected'
                              ? 'ยังไม่มีรายชื่อในตัวกรองนี้ที่อยู่ในคิวจัดรอบ'
                              : selectionViewMode === 'unselected'
                              ? 'รายชื่อทั้งหมดในตัวกรองนี้ถูกเลือกเข้าคิวแล้ว'
                              : 'ไม่พบรายชื่อผู้ป่วยตามเงื่อนไขที่เลือก'}
                          </td>
                        </tr>
                      ) : (
                        displayedPatients.map((p) => {
                          const stopIndex = findPatientStopIndex(p);
                          const isSelected = stopIndex >= 0;
                          const matchedStop = isSelected ? plannedStops[stopIndex] : null;
                          const queueNumber = isSelected ? stopIndex + 1 : null;
                          const items = matchedStop
                            ? matchedStop.items
                            : extractPatientRoundItems(p, planRound, planYear);

                          return (
                            <tr
                              key={p.id}
                              className={`transition-colors ${
                                isSelected ? 'bg-teal-50/50 hover:bg-teal-50' : 'hover:bg-slate-50'
                              }`}
                            >
                              <td className="py-2.5 px-3 text-center">
                                <div className="flex flex-col items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleTogglePatientSelection(p)}
                                    className={`w-5 h-5 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                                      isSelected
                                        ? 'bg-teal-700 text-white shadow-2xs'
                                        : 'border border-slate-300 hover:border-teal-500'
                                    }`}
                                    title={isSelected ? 'คลิกเพื่อนำออกจากคิว' : 'คลิกเพื่อส่งเข้าคิว'}
                                  >
                                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                  </button>
                                  {queueNumber && (
                                    <span className="px-1.5 py-0.2 rounded-full bg-teal-800 text-white font-extrabold text-[9px] shadow-2xs">
                                      #{queueNumber}
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="py-2.5 px-3">
                                <div className="font-extrabold text-slate-900 text-xs sm:text-sm">
                                  {p.fullName}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-slate-500">{p.age} ปี</span>
                                  <span
                                    className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                                      p.adlCategory === 'ติดเตียง'
                                        ? 'bg-rose-100 text-rose-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    {p.adlCategory || (p.adlScore <= 4 ? 'ติดเตียง' : 'ติดบ้าน')}
                                  </span>
                                </div>
                              </td>

                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-slate-800">{p.address}</div>
                                {p.landmark && (
                                  <div className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80 font-bold inline-flex items-center gap-1 mt-0.5">
                                    <span>📍 ใกล้:</span>
                                    <span>{p.landmark}</span>
                                  </div>
                                )}
                                <div className="text-[11px] text-teal-800 font-bold">
                                  หมู่ที่ {p.moo} {BANGPAO_VILLAGES[p.moo || '1'] || ''}
                                </div>
                                <div className="text-[10px] font-mono text-slate-400">
                                  📍 {p.latitude ? `${p.latitude.toFixed(4)}, ${p.longitude?.toFixed(4)}` : 'ไม่มีพิกัด'}
                                </div>
                              </td>

                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-800">
                                  📞 {p.phone || p.caregiverPhone || '-'}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  ผู้ดูแล: {p.caregiverName || '-'}
                                </div>
                              </td>

                              <td className="py-2.5 px-3">
                                <div className="space-y-1">
                                  {items.map((it, i) => (
                                    <div
                                      key={i}
                                      className="text-[11px] font-semibold text-teal-900 flex items-center gap-1"
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
                                      <span>
                                        {it.itemName}: <strong>{it.quantity}</strong> {it.unit}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </td>

                              <td className="py-2.5 px-3 text-center">
                                <div className="flex items-center justify-center gap-1 flex-wrap">
                                  {!isSelected ? (
                                    <button
                                      type="button"
                                      onClick={() => handleTogglePatientSelection(p)}
                                      className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-[10px] shadow-2xs flex items-center gap-0.5 cursor-pointer transition-colors"
                                      title="ส่งเข้าคิวจัดรอบ"
                                    >
                                      <Plus className="w-3 h-3" />
                                      <span>เข้าคิว</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleTogglePatientSelection(p)}
                                      className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[10px] cursor-pointer transition-colors"
                                      title="นำออกจากคิว"
                                    >
                                      ✕ ออก
                                    </button>
                                  )}

                                  {isSelected && matchedStop && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingStopIndex(stopIndex);
                                        setEditingItemsStop(JSON.parse(JSON.stringify(matchedStop)));
                                      }}
                                      className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] transition-colors cursor-pointer"
                                      title="แก้ไขสิ่งของ/จำนวนของรายนี้"
                                    >
                                      ✏️ ปรับของ
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

              {/* Bottom Nav */}
              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs sm:text-sm cursor-pointer"
                >
                  ย้อนกลับ
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStep(4)}
                  disabled={plannedStops.length === 0}
                  className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-40 text-white rounded-xl font-extrabold text-xs sm:text-sm flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <span>ถัดไป: จัดลำดับคิว & แผนเดินทาง</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 4: จัดลำดับคิว & แผนเดินทาง ================= */}
          {activeStep === 4 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-teal-50/70 border border-teal-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-teal-950 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-teal-700" />
                    <span>ขั้นตอนที่ 4: จัดลำดับคิวส่งมอบพร้อมแผนการเดินทาง</span>
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    เรียงลำดับใกล้สุดอัตโนมัติจากศูนย์ ทต.บางเป้า หรือปรับเรียงตามหมู่บ้าน และสามารถสลับคิวขึ้น-ลงได้อย่างอิสระ
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-3 py-1.5 rounded-xl bg-teal-800 text-white font-extrabold text-xs">
                    ระยะทางรวม: {routeMetrics.distanceKm} กม. • เวลาโดยประมาณ: {routeMetrics.durationMin} นาที
                  </span>
                </div>
              </div>

              {/* Ordering Action Toolbar */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleAutoSortNearest}
                    className="px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-extrabold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
                    title="ระบบคำนวณเรียงลำดับไปบ้านที่ใกล้ที่สุดต่อๆ กันอัตโนมัติจาก ทต.บางเป้า"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>🚀 จัดลำดับใกล้สุดอัตโนมัติ</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAutoSortByMoo}
                    className="px-3 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-extrabold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
                    title="เรียงตามกลุ่มหมู่บ้าน หมู่ 1 ถึง หมู่ 7"
                  >
                    <span>🏘️ เรียงตามหมู่บ้าน (ม.1 ➔ ม.7)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const reversed = [...plannedStops].reverse().map((s, i) => ({ ...s, queueOrder: i + 1 }));
                      setPlannedStops(reversed);
                    }}
                    className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
                    title="กลับลำดับคิวจากหลังมาหน้า"
                  >
                    สลับกลับหัวคิว
                  </button>

                  {/* Quick Add Stop in Step 4 */}
                  {unselectedPatients.length > 0 && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsQuickAddOpen((prev) => !prev)}
                        className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title="เลือกผู้ป่วยที่ยังไม่ได้อยู่ในคิวเพิ่มเข้ามาในรอบนี้"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ เพิ่มผู้ป่วยเข้าคิว ({unselectedPatients.length} ราย)</span>
                      </button>

                      {isQuickAddOpen && (
                        <div className="absolute left-0 top-full mt-1.5 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 space-y-1 max-h-72 overflow-y-auto">
                          <div className="text-[11px] font-extrabold text-slate-700 px-2 py-1 border-b border-slate-100 flex items-center justify-between">
                            <span>คลิกเพื่อเพิ่มเข้าคิวรอบนี้:</span>
                            <button
                              type="button"
                              onClick={() => setIsQuickAddOpen(false)}
                              className="text-slate-400 hover:text-slate-600 font-bold px-1"
                            >
                              ✕
                            </button>
                          </div>
                          {unselectedPatients.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                handleTogglePatientSelection(p);
                                setIsQuickAddOpen(false);
                              }}
                              className="w-full text-left p-2 rounded-lg hover:bg-teal-50 text-xs flex items-center justify-between gap-1.5 cursor-pointer transition-colors border-b border-slate-50 last:border-0"
                            >
                              <div>
                                <div className="font-bold text-slate-800">{p.fullName}</div>
                                <div className="text-[10px] text-slate-500">
                                  ม.{p.moo} {BANGPAO_VILLAGES[p.moo || '1']} • {p.adlCategory || 'ติดบ้าน'}
                                </div>
                              </div>
                              <span className="text-[10px] font-extrabold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full shrink-0">
                                + เพิ่ม
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.open(getGoogleMapsRouteUrl(), '_blank')}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>นำทาง Google Maps ตลอดสาย</span>
                  </button>
                </div>
              </div>

              {/* Two-Column: Interactive Leaflet Map + Ordered Stop Queue List */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* Left 7 Cols: Map Preview */}
                <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-3 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-600 font-bold px-1 flex-wrap gap-1.5">
                    <span className="flex items-center gap-1.5">
                      <span>🛣️ แผนที่วาดเส้นทางถนนจริง ({plannedStops.length} จุด)</span>
                      {isCalculatingRoadRoute && (
                        <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-extrabold animate-pulse">
                          ⏳ กำลังคำนวณเส้นทางถนนจริง...
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] text-teal-800 font-extrabold">🏢 เริ่มต้น: ทต.บางเป้า (วาดตามถนนที่รถเข้าถึงได้จริง)</span>
                  </div>

                  <div className="w-full h-[400px] sm:h-[460px] rounded-xl overflow-hidden border border-slate-300 relative bg-slate-100">
                    <div ref={plannerMapContainerRef} className="w-full h-full" />
                  </div>
                </div>

                {/* Right 5 Cols: Ordered Cards List */}
                <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="font-extrabold text-slate-800 text-xs sm:text-sm">
                      ลำดับคิวส่งมอบ ({plannedStops.length} บ้าน)
                    </span>
                    <span className="text-[11px] text-slate-400">เลือกเลขคิว, ลากสลับ หรือเลื่อนขึ้น-ลง</span>
                  </div>

                  <div className="space-y-2 max-h-[410px] overflow-y-auto pr-1">
                    {plannedStops.map((stop, idx) => {
                      const legInfo = osrmRouteMetrics?.legMetrics?.[idx];
                      return (
                      <div
                        key={stop.patientId}
                        draggable
                        onDragStart={() => setDraggedPlannerStopId(stop.patientId)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (draggedPlannerStopId && draggedPlannerStopId !== stop.patientId) {
                            handleReorderStopsByDrag(draggedPlannerStopId, stop.patientId);
                          }
                          setDraggedPlannerStopId(null);
                        }}
                        onDragEnd={() => setDraggedPlannerStopId(null)}
                        className={`p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-teal-400 hover:shadow-xs transition-all space-y-2 cursor-grab active:cursor-grabbing ${
                          draggedPlannerStopId === stop.patientId ? 'opacity-40 border-dashed border-teal-500 bg-teal-50/30' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-6 h-6 rounded-full bg-teal-800 text-white font-black text-xs flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="font-extrabold text-slate-900 text-xs truncate">
                                {stop.fullName}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate flex items-center gap-1 flex-wrap">
                                <span>ม.{stop.moo} {BANGPAO_VILLAGES[stop.moo] || ''} • 📞 {stop.phone}</span>
                                {legInfo && (
                                  <span className="px-1.5 py-0.2 rounded bg-sky-100 text-sky-900 font-extrabold text-[9px]">
                                    🛣️ {legInfo.distanceKm} กม. (~{legInfo.durationMin} นาที)
                                  </span>
                                )}
                              </div>
                              {stop.landmark && (
                                <div className="text-[10px] text-amber-800 font-bold truncate">
                                  📍 ใกล้: {stop.landmark}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Direct Queue Selector + Move Buttons + Delete Button */}
                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={idx + 1}
                              onChange={(e) => handleSetStopPosition(stop.patientId, Number(e.target.value))}
                              className="text-[11px] font-extrabold bg-white text-teal-950 border border-slate-300 rounded px-1.5 py-0.5 cursor-pointer outline-none hover:border-teal-500 shadow-2xs"
                              title="เปลี่ยนลำดับคิวโดยตรง"
                            >
                              {plannedStops.map((_, pIdx) => (
                                <option key={pIdx + 1} value={pIdx + 1}>
                                  คิว #{pIdx + 1}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() => handleMoveStop(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 rounded hover:bg-slate-200 disabled:opacity-20 text-slate-600 cursor-pointer"
                              title="เลื่อนขึ้น"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveStop(idx, 'down')}
                              disabled={idx === plannedStops.length - 1}
                              className="p-1 rounded hover:bg-slate-200 disabled:opacity-20 text-slate-600 cursor-pointer"
                              title="เลื่อนลง"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveStop(stop.patientId)}
                              className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                              title="นำออกจากคิว"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="text-[11px] bg-white p-2 rounded-lg border border-slate-200 text-teal-900 font-semibold truncate">
                          📦 {stop.items.map((it) => `${it.itemName} (${it.quantity})`).join(', ')}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bottom Nav */}
              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(3)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs sm:text-sm cursor-pointer"
                >
                  ย้อนกลับ
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStep(5)}
                  className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-extrabold text-xs sm:text-sm flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <span>ถัดไป: สรุปยอดเบิก & ยืนยันบันทึก</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 5: สรุปยอด & ยืนยันบันทึก ================= */}
          {activeStep === 5 && (
            <div className="max-w-4xl mx-auto space-y-5 animate-in fade-in duration-150">
              <div className="bg-teal-50/70 border border-teal-200 rounded-2xl p-4">
                <h3 className="text-sm sm:text-base font-extrabold text-teal-950 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-teal-700" />
                  <span>ขั้นตอนที่ 5: สรุปยอดเบิกพัสดุและยืนยันบันทึกแผนจัดรอบ</span>
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  ตรวจสอบยอดสิ่งของที่ต้องเบิกจากคลัง LTC, วันแจก และทีมงาน สามารถพิมพ์ใบจัดส่ง A4 หรือคัดลอกไปรอบ 2 ได้ทันที
                </p>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
                  <div className="text-xs text-slate-500 font-bold">ปีงบ / งวดรอบ</div>
                  <div className="text-lg font-black text-teal-800 mt-1">
                    {planYear} (รอบที่ {planRound})
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
                  <div className="text-xs text-slate-500 font-bold">วันที่แจกของ</div>
                  <div className="text-lg font-black text-slate-900 mt-1">
                    {deliveryDate || 'ยังไม่กำหนด'}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
                  <div className="text-xs text-slate-500 font-bold">จำนวนบ้านในคิว</div>
                  <div className="text-lg font-black text-blue-700 mt-1">
                    {plannedStops.length} ราย
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
                  <div className="text-xs text-slate-500 font-bold">ระยะทางรวม</div>
                  <div className="text-lg font-black text-emerald-700 mt-1">
                    {routeMetrics.distanceKm} กม.
                  </div>
                </div>
              </div>

              {/* Supply Requisition Summary Box */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
                <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-teal-700" />
                  <span>รายการสิ่งของรวมทั้งหมดที่ต้องเบิกจ่ายในรอบนี้:</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {suppliesSummary.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-extrabold text-xs text-slate-900">{item.itemName}</div>
                        <div className="text-[10px] text-slate-400">หน่วยนับ: {item.unit}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-black text-teal-800">
                          {item.totalQty.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-500 ml-1">{item.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 space-y-3">
                <div className="font-bold text-xs text-teal-950">
                  🚀 ดำเนินการเกี่ยวกับแผนจัดรอบนี้:
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleSaveCurrentPlan}
                    className="flex-1 sm:flex-initial px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>💾 บันทึกแผนจัดรอบนี้</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCloneModalOpen(true)}
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    title="คัดลอกรายชื่อและพิกัดทั้งหมดไปจัดเป็นรอบ 2 ได้ทันที"
                  >
                    <Copy className="w-4 h-4" />
                    <span>📋 คัดลอกไปจัดรอบ 2</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPrintRegModalOpen(true)}
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-xs cursor-pointer ring-1 ring-emerald-300"
                    title="พิมพ์ใบลงทะเบียนรายชื่อผู้ที่มีภาวะพึ่งพิง (เซ็นรับ 100% ตามต้นฉบับ สำหรับให้ผู้รับของเซ็นรับ)"
                  >
                    <Printer className="w-4 h-4 text-emerald-200" />
                    <span>🖨️ พิมพ์ใบลงทะเบียนผู้รับของ (เซ็นรับ 100%)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintDeliverySheet}
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-white hover:bg-slate-100 text-teal-900 border border-teal-300 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-teal-700" />
                    <span>📄 พิมพ์ใบจัดส่ง A4</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.open(getGoogleMapsRouteUrl(), '_blank')}
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>เปิด Google Maps นำทาง</span>
                  </button>
                </div>
              </div>

              {/* Bottom Nav */}
              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(4)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs sm:text-sm cursor-pointer"
                >
                  ย้อนกลับ
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-extrabold text-xs sm:text-sm cursor-pointer"
                >
                  เสร็จสิ้น / ปิดหน้าต่าง
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Edit Items per Stop */}
        {editingItemsStop && editingStopIndex !== null && (
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150"
            style={{ zIndex: 10020 }}
          >
            <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-5 shadow-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
                    ✏️ ปรับปรุงสิ่งของที่ได้รับในรอบนี้
                  </h4>
                  <p className="text-xs text-slate-500">
                    ผู้ป่วย: <strong>{editingItemsStop.fullName}</strong> (ม.{editingItemsStop.moo})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingItemsStop(null);
                    setEditingStopIndex(null);
                  }}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {editingItemsStop.items.map((it, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={it.itemName}
                        onChange={(e) => {
                          const updated = [...editingItemsStop.items];
                          updated[idx].itemName = e.target.value;
                          setEditingItemsStop({ ...editingItemsStop, items: updated });
                        }}
                        className="flex-1 px-2 py-1 rounded-lg border border-slate-300 text-xs font-bold text-slate-900"
                        placeholder="ชื่อสิ่งของ เช่น ผ้าอ้อมผู้ใหญ่"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = editingItemsStop.items.filter((_, i) => i !== idx);
                          setEditingItemsStop({ ...editingItemsStop, items: updated });
                        }}
                        className="text-rose-500 hover:text-rose-700 p-1"
                        title="ลบรายการนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">จำนวน:</span>
                      <input
                        type="number"
                        min="1"
                        value={it.quantity}
                        onChange={(e) => {
                          const updated = [...editingItemsStop.items];
                          updated[idx].quantity = parseInt(e.target.value, 10) || 0;
                          setEditingItemsStop({ ...editingItemsStop, items: updated });
                        }}
                        className="w-24 px-2 py-1 rounded-lg border border-slate-300 text-xs font-black text-teal-800"
                      />
                      <input
                        type="text"
                        value={it.unit}
                        onChange={(e) => {
                          const updated = [...editingItemsStop.items];
                          updated[idx].unit = e.target.value;
                          setEditingItemsStop({ ...editingItemsStop, items: updated });
                        }}
                        className="w-20 px-2 py-1 rounded-lg border border-slate-300 text-xs font-bold text-slate-700"
                        placeholder="หน่วย"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    const updated = [
                      ...editingItemsStop.items,
                      { itemId: `ITEM-${Date.now()}`, itemName: 'สิ่งของเพิ่มเติม', quantity: 1, unit: 'ชิ้น' },
                    ];
                    setEditingItemsStop({ ...editingItemsStop, items: updated });
                  }}
                  className="w-full py-1.5 border border-dashed border-teal-400 rounded-xl text-teal-700 hover:bg-teal-50 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ เพิ่มรายการสิ่งของ</span>
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setEditingItemsStop(null);
                    setEditingStopIndex(null);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (editingStopIndex !== null) {
                      const updatedStops = [...plannedStops];
                      updatedStops[editingStopIndex] = editingItemsStop;
                      setPlannedStops(updatedStops);
                      showToast(`อัปเดตสิ่งของของ ${editingItemsStop.fullName} เรียบร้อย`);
                    }
                    setEditingItemsStop(null);
                    setEditingStopIndex(null);
                  }}
                  className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-extrabold text-xs"
                >
                  บันทึกสิ่งของ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Clone Plan to Round 2 (or any target round) */}
        {isCloneModalOpen && (
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150"
            style={{ zIndex: 10020 }}
          >
            <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center">
                    <Copy className="w-4 h-4" />
                  </div>
                  <h4 className="font-extrabold text-base text-slate-900">
                    คัดลอกแผนจัดรอบไปรอบถัดไป
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCloneModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
                  คัดลอกจาก: <strong>ปีงบ {planYear} • งวดรอบที่ {planRound}</strong> ({plannedStops.length} รายชื่อพร้อมพิกัด)
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    🎯 สร้างเป็นงวดรอบปลายทาง:
                  </label>
                  <select
                    value={cloneTargetRound}
                    onChange={(e) => setCloneTargetRound(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 cursor-pointer"
                  >
                    {configuredRounds.map((r) => {
                      const tKey = `${cloneTargetYear}_${r}`;
                      const tPlan = existingPlans[tKey];
                      const tCount = tPlan?.stops?.length;
                      const statusNote = tCount ? `(มีแผนบันทึกแล้ว ${tCount} ราย)` : '(ยังไม่มีแผน)';
                      return (
                        <option key={r} value={r}>
                          งวดรอบที่ {r} {statusNote}
                        </option>
                      );
                    })}
                    <option value="3">งวดรอบที่ 3 (ยังไม่มีแผน)</option>
                    <option value="urgent">รอบเร่งด่วนพิเศษ</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    📅 กำหนดวันแจกของรอบใหม่:
                  </label>
                  <input
                    type="date"
                    value={cloneDeliveryDate}
                    onChange={(e) => setCloneDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCloneModalOpen(false)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleExecuteClone}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-extrabold text-xs flex items-center gap-1.5 shadow-xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>ยืนยันคัดลอกสร้างรอบ 2</span>
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Modal: Print LTC Registration Sign-Off Sheet 100% */}
      <PrintLtcRegistrationModal
        isOpen={isPrintRegModalOpen}
        onClose={() => setIsPrintRegModalOpen(false)}
        selectedPatients={plannerPatientsForPrint}
        allPatients={safePatients}
        fiscalYear={planYear}
        round={planRound}
        defaultScope="selected"
        deliveryDate={deliveryDate}
      />
    </div>
  );
};
