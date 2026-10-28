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
} from 'lucide-react';
import {
  LtcPatient,
  LtcRoundPlan,
  LtcPlanStop,
  LtcRoundItem,
  UserRole,
} from '../types/index.ts';

// Central Municipality Coordinates (Bangpao HQ)
const BANGPAO_HQ_COORDS = { lat: 7.425574, lng: 99.529854 };

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
  onClonePlanToRound,
}) => {
  if (!isOpen) return null;

  // Active step / tab in the planner
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Core plan settings state
  const [planYear, setPlanYear] = useState<string>(initialYear);
  const [planRound, setPlanRound] = useState<string>(initialRound);

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

  // Edit item modal/popover state inside planner
  const [editingStopIndex, setEditingStopIndex] = useState<number | null>(null);
  const [editingItemsStop, setEditingItemsStop] = useState<LtcPlanStop | null>(null);

  // Clone Modal State
  const [isCloneModalOpen, setIsCloneModalOpen] = useState<boolean>(false);
  const [cloneTargetYear, setCloneTargetYear] = useState<string>(initialYear);
  const [cloneTargetRound, setCloneTargetRound] = useState<string>('2');
  const [cloneDeliveryDate, setCloneDeliveryDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 4);
    return d.toISOString().split('T')[0];
  });

  // Success toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  // Helper to extract default items for a patient for the given round
  const extractPatientRoundItems = (
    p: LtcPatient,
    roundKey: string,
    yearKey: string
  ): LtcRoundItem[] => {
    // 1. Check yearRoundItems
    if (p.yearRoundItems?.[yearKey]?.[roundKey] && p.yearRoundItems[yearKey][roundKey].length > 0) {
      return p.yearRoundItems[yearKey][roundKey].map((it) => ({ ...it }));
    }
    // 2. Check roundItems
    if (p.roundItems?.[roundKey] && p.roundItems[roundKey].length > 0) {
      return p.roundItems[roundKey].map((it) => ({ ...it }));
    }
    // 3. Fallback based on patient's monthly diaper allowance or ADL
    const diaperSize = p.equipmentNeeded?.includes('XL')
      ? 'XL'
      : p.equipmentNeeded?.includes('L')
      ? 'L'
      : 'M';
    const diaperQty = (p.monthlyDiaperAllowance || 90) * 3; // 3 months per round

    const items: LtcRoundItem[] = [
      {
        itemId: `INV-LTC-DIA-${diaperSize}`,
        itemName: `ผ้าอ้อมผู้ใหญ่ (Size ${diaperSize})`,
        quantity: diaperQty,
        unit: 'ชิ้น',
      },
    ];

    if (p.adlCategory === 'ติดเตียง') {
      items.push({
        itemId: 'INV-LTC-08',
        itemName: 'นมผงสุขภาพ / อาหารเสริมโภชนาการ',
        quantity: 2,
        unit: 'กระป๋อง',
      });
      items.push({
        itemId: 'INV-LTC-06',
        itemName: 'แผ่นรองซับสิ่งขับถ่าย (Underpads)',
        quantity: 60,
        unit: 'แผ่น',
      });
    }

    return items;
  };

  // Load existing plan or initialize from registered patients when Year or Round changes
  useEffect(() => {
    const existing = existingPlans[periodKey];
    if (existing) {
      setPlanTitle(existing.planTitle);
      setDeliveryDate(existing.deliveryDate || '');
      setDeliveryTimeWindow(existing.deliveryTimeWindow || '09:00 - 16:30 น.');
      setDriverName(existing.driverName || 'นายชนะ สุขด้วง (พนักงานขับรถ)');
      setStaffNames(existing.staffNames || 'พันจ่าเอกอานัส เด็นหมาด (เจ้าพนักงานสาธารณสุข), CG');
      setVehiclePlate(existing.vehiclePlate || 'ผก-4512 ตรัง (รถกระบะ ทต.บางเป้า)');
      setPlanNotes(existing.notes || '');
      setPlannedStops(existing.stops || []);
    } else {
      // Default: create fresh title and pre-select active registered patients
      const title = `แผนจัดรอบแจกพัสดุ สปสช. LTC ปีงบ ${planYear} (รอบที่ ${planRound})`;
      setPlanTitle(title);
      // Auto-pull all registered patients with coordinates
      const defaultStops: LtcPlanStop[] = patients
        .filter((p) => p.status !== 'deceased')
        .map((p, idx) => {
          const lat = p.latitude || BANGPAO_HQ_COORDS.lat + 0.003 * (idx + 1);
          const lng = p.longitude || BANGPAO_HQ_COORDS.lng + 0.003 * (idx + 1);
          return {
            patientId: p.id,
            queueOrder: idx + 1,
            fullName: p.fullName,
            idCard: p.idCard,
            age: p.age,
            gender: p.gender,
            phone: p.phone || p.caregiverPhone || '081-000-0000',
            caregiverName: p.caregiverName || 'ญาติผู้ดูแล',
            caregiverPhone: p.caregiverPhone || p.phone || '-',
            address: p.address,
            moo: p.moo || '1',
            latitude: lat,
            longitude: lng,
            adlScore: p.adlScore,
            adlCategory: p.adlCategory || (p.adlScore <= 4 ? 'ติดเตียง' : 'ติดบ้าน'),
            items: extractPatientRoundItems(p, planRound, planYear),
            scheduledTime: `0${9 + Math.floor(idx / 2)}:${(idx % 2) * 30 || '00'}`,
            deliveryStatus: 'pending',
            notes: p.diagnosis || '',
          };
        });
      setPlannedStops(defaultStops);
    }
  }, [planYear, planRound]);

  // Total route metrics
  const routeMetrics = useMemo(() => {
    if (plannedStops.length === 0) return { distanceKm: 0, durationMin: 0 };
    let totalDist = 0;
    let prevLat = BANGPAO_HQ_COORDS.lat;
    let prevLng = BANGPAO_HQ_COORDS.lng;

    plannedStops.forEach((stop) => {
      const d = calculateHaversineKm(prevLat, prevLng, stop.latitude, stop.longitude);
      totalDist += d;
      prevLat = stop.latitude;
      prevLng = stop.longitude;
    });

    // Estimate: 30 km/h average speed in rural/village roads + 20 mins per patient stop
    const drivingMinutes = Math.round((totalDist / 30) * 60);
    const serviceMinutes = plannedStops.length * 20;
    return {
      distanceKm: Number(totalDist.toFixed(1)),
      durationMin: drivingMinutes + serviceMinutes,
    };
  }, [plannedStops]);

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

  // Leaflet satellite hybrid map renderer in Step 4
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

    const timer = setTimeout(() => {
      const L = (window as any).L;
      const container = plannerMapContainerRef.current;
      if (!L || !container) return;

      if (!plannerMapInstanceRef.current) {
        if (container._leaflet_id) {
          container._leaflet_id = null;
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

        L.marker(pt, { icon: stopIcon })
          .bindPopup(`
            <div style="font-family:'Prompt',sans-serif;font-size:12px;min-width:200px;">
              <div style="font-weight:800;color:#0f172a;font-size:13px;border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin-bottom:4px;">
                คิว #${idx + 1} — ${stop.fullName}
              </div>
              <div>หมู่ที่ ${stop.moo} ${BANGPAO_VILLAGES[stop.moo] || ''}</div>
              <div>เบอร์โทร: <strong>${stop.phone}</strong></div>
              <div style="margin-top:4px;color:#047857;font-weight:700;">📦 สิ่งของ: ${itemsDesc}</div>
            </div>
          `)
          .addTo(markersLayer);
      });

      // 3. Draw Connecting Route Polyline
      if (latLngPoints.length > 1) {
        L.polyline(latLngPoints, {
          color: '#10b981',
          weight: 4.5,
          opacity: 0.88,
          dashArray: '8, 8',
        }).addTo(routeLayer);

        map.fitBounds(L.latLngBounds(latLngPoints), { padding: [40, 40], maxZoom: 16 });
      }

      setTimeout(() => map.invalidateSize(), 100);
    }, 60);

    return () => clearTimeout(timer);
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

  // 🚀 Auto-Optimize Nearest Neighbor from HQ
  const handleAutoSortNearest = () => {
    if (plannedStops.length <= 1) return;
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

  // Add a patient to stops from Step 3
  const handleTogglePatientSelection = (p: LtcPatient) => {
    const existingIdx = plannedStops.findIndex((s) => s.patientId === p.id);
    if (existingIdx !== -1) {
      handleRemoveStop(p.id);
    } else {
      const lat = p.latitude || BANGPAO_HQ_COORDS.lat + 0.002 * (plannedStops.length + 1);
      const lng = p.longitude || BANGPAO_HQ_COORDS.lng + 0.002 * (plannedStops.length + 1);
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
        moo: p.moo || '1',
        latitude: lat,
        longitude: lng,
        adlScore: p.adlScore,
        adlCategory: p.adlCategory || (p.adlScore <= 4 ? 'ติดเตียง' : 'ติดบ้าน'),
        items: extractPatientRoundItems(p, planRound, planYear),
        scheduledTime: '09:30',
        deliveryStatus: 'pending',
        notes: p.diagnosis || '',
      };
      setPlannedStops([...plannedStops, newStop]);
      showToast(`เพิ่ม "${p.fullName}" เข้าคิวจัดรอบแล้ว`);
    }
  };

  // Select all filtered patients
  const handleSelectAllFiltered = (filteredList: LtcPatient[]) => {
    const currentIds = new Set(plannedStops.map((s) => s.patientId));
    const toAdd = filteredList.filter((p) => !currentIds.has(p.id));
    if (toAdd.length === 0) return;

    const newStops: LtcPlanStop[] = toAdd.map((p, idx) => {
      const lat = p.latitude || BANGPAO_HQ_COORDS.lat + 0.002 * (plannedStops.length + idx + 1);
      const lng = p.longitude || BANGPAO_HQ_COORDS.lng + 0.002 * (plannedStops.length + idx + 1);
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
        moo: p.moo || '1',
        latitude: lat,
        longitude: lng,
        adlScore: p.adlScore,
        adlCategory: p.adlCategory || (p.adlScore <= 4 ? 'ติดเตียง' : 'ติดบ้าน'),
        items: extractPatientRoundItems(p, planRound, planYear),
        scheduledTime: '09:30',
        deliveryStatus: 'pending',
        notes: p.diagnosis || '',
      };
    });

    setPlannedStops([...plannedStops, ...newStops]);
    showToast(`เพิ่มผู้ป่วย ${toAdd.length} ราย เข้าคิวเรียบร้อยแล้ว`);
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
      deliveryDate: deliveryDate,
      deliveryTimeWindow: deliveryTimeWindow,
      driverName: driverName,
      staffNames: staffNames,
      vehiclePlate: vehiclePlate,
      stops: plannedStops,
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

    const clonedPlan: LtcRoundPlan = {
      id: `PLAN-${cloneTargetYear}-${cloneTargetRound}`,
      fiscalYear: cloneTargetYear,
      round: cloneTargetRound,
      roundName: `งวดรอบที่ ${cloneTargetRound}`,
      planTitle: `แผนจัดรอบแจกพัสดุ สปสช. LTC ปีงบ ${cloneTargetYear} (รอบที่ ${cloneTargetRound})`,
      deliveryDate: cloneDeliveryDate,
      deliveryTimeWindow: deliveryTimeWindow,
      driverName: driverName,
      staffNames: staffNames,
      vehiclePlate: vehiclePlate,
      stops: plannedStops.map((s) => ({
        ...s,
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
          <div style="font-weight: 700; font-size: 14px; margin-top: 2px;">ใบสรุปแผนการจัดรอบและใบส่งมอบพัสดุ สปสช. LTC (กองทุนสุขภาพตำบล)</div>
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

  // Filtered patients for selection in Step 3
  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
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
        if (!matchName && !matchHn && !matchIdCard && !matchPhone) return false;
      }
      return true;
    });
  }, [patients, patientMooFilter, patientAdlFilter, patientSearch]);

  const selectedPatientIds = new Set(plannedStops.map((s) => s.patientId));

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

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCloneModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-extrabold text-xs shadow-xs transition-all cursor-pointer"
              title="คัดลอกแผนจัดรอบนี้ไปเป็นรอบถัดไป (เช่น รอบ 2)"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>📋 คัดลอกไปจัดรอบ 2</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-sm cursor-pointer transition-colors"
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
                    const isSelected = planRound === rd;

                    return (
                      <button
                        key={rd}
                        type="button"
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
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-teal-700" />
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {rd === '1'
                              ? 'ไตรมาส 1-2 (ต.ค. - มี.ค.)'
                              : rd === '2'
                              ? 'ไตรมาส 3-4 (เม.ย. - ก.ย.)'
                              : `รอบพิเศษประจำปี ${planYear}`}
                          </div>
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          {hasPlan ? (
                            <span className="text-emerald-700 font-bold">
                              ✓ มีแผนแล้ว ({stopCount} ราย)
                            </span>
                          ) : (
                            <span className="text-slate-400">ยังไม่มีแผนรอบนี้</span>
                          )}
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
                    เลือกแล้ว {plannedStops.length} / {patients.length} ราย
                  </span>
                </div>
              </div>

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
                      <option value="all">ทุกหมู่บ้าน</option>
                      {Object.entries(BANGPAO_VILLAGES).map(([m, name]) => (
                        <option key={m} value={m}>
                          หมู่ที่ {m} {name}
                        </option>
                      ))}
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

                  {/* Quick Select Buttons */}
                  <div className="flex items-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSelectAllFiltered(filteredPatients)}
                      className="flex-1 py-1.5 px-2 bg-teal-100 hover:bg-teal-200 text-teal-900 rounded-lg font-bold text-xs transition-colors cursor-pointer"
                    >
                      ✓ เลือกทุกคนที่กรอง ({filteredPatients.length})
                    </button>
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
              </div>

              {/* Patient Selection Table / Cards */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-extrabold border-b border-slate-200">
                        <th className="py-2.5 px-3 text-center w-12">เลือก</th>
                        <th className="py-2.5 px-3">ผู้ป่วย & อายุ</th>
                        <th className="py-2.5 px-3">ที่อยู่ & หมู่บ้าน & พิกัด</th>
                        <th className="py-2.5 px-3">เบอร์โทร & ผู้ดูแล</th>
                        <th className="py-2.5 px-3">สิ่งของที่ต้องได้รับในรอบนี้</th>
                        <th className="py-2.5 px-3 text-center w-24">แก้ไขของ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredPatients.map((p) => {
                        const isSelected = selectedPatientIds.has(p.id);
                        const matchedStop = plannedStops.find((s) => s.patientId === p.id);
                        const stopIndex = plannedStops.findIndex((s) => s.patientId === p.id);
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
                              <button
                                type="button"
                                onClick={() => handleTogglePatientSelection(p)}
                                className={`w-5 h-5 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-teal-700 text-white'
                                    : 'border border-slate-300 hover:border-teal-500'
                                }`}
                              >
                                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </button>
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
                              {isSelected && matchedStop ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingStopIndex(stopIndex);
                                    setEditingItemsStop(JSON.parse(JSON.stringify(matchedStop)));
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 font-extrabold text-[11px] transition-colors cursor-pointer"
                                  title="แก้ไขสิ่งของ/จำนวนของรายนี้"
                                >
                                  ✏️ แก้ไขของ
                                </button>
                              ) : (
                                <span className="text-slate-300 text-[11px]">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
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
                    title="ระบบคำนวณเรียงลำดับไปบ้านที่ใกล้ที่สุดต่อๆ กันอัตโนมัติ"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>🚀 จัดลำดับใกล้สุดอัตโนมัติ</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAutoSortByMoo}
                    className="px-3 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-extrabold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
                    title="เรียงตามหมู่บ้าน หมู่ 1 ถึง หมู่ 7"
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
                  >
                    สลับกลับหัวคิว
                  </button>
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
                  <div className="flex items-center justify-between text-xs text-slate-600 font-bold px-1">
                    <span>🗺️ แผนที่ดาวเทียมจุดส่งมอบ ({plannedStops.length} จุด)</span>
                    <span className="text-[11px] text-teal-800 font-extrabold">🏢 เริ่มต้น: ทต.บางเป้า</span>
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
                    <span className="text-[11px] text-slate-400">เลื่อนขึ้น-ลง หรือพิมพ์เลขคิว</span>
                  </div>

                  <div className="space-y-2 max-h-[410px] overflow-y-auto pr-1">
                    {plannedStops.map((stop, idx) => (
                      <div
                        key={stop.patientId}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-teal-400 hover:shadow-xs transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-teal-800 text-white font-black text-xs flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="font-extrabold text-slate-900 text-xs">
                                {stop.fullName}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                ม.{stop.moo} {BANGPAO_VILLAGES[stop.moo] || ''} • 📞 {stop.phone}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
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
                    ))}
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
                    <option value="2">งวดรอบที่ 2 (เม.ย. - ก.ย.)</option>
                    <option value="3">งวดรอบที่ 3</option>
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
    </div>
  );
};
