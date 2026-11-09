import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Truck,
  Navigation,
  MapPin,
  CheckCircle2,
  Clock,
  Phone,
  Users,
  Package,
  Compass,
  Crosshair,
  ChevronRight,
  Share2,
  Copy,
  ExternalLink,
  RotateCcw,
  Maximize2,
  Minimize2,
  Sparkles,
  Check,
  AlertCircle,
  Calendar,
  ArrowLeft,
  QrCode,
  X,
} from 'lucide-react';
import {
  LtcPatient,
  LtcRoundItem,
  LtcProjectSourceType,
  RoundDeliveryRecord,
  LtcRoundPlan,
} from '../types/index.ts';
import {
  subscribeCollection,
  saveToFirestore,
  COLLECTIONS,
} from '../services/firebaseService.ts';
import { mergeLtcWithMaster } from '../services/sheetsSync.ts';

const BANGPAO_MUNICIPALITY_COORDS = {
  lat: 7.429625,
  lng: 99.52522,
  name: 'เทศบาลตำบลบางเป้า',
};

const BANGPAO_VILLAGES: Record<string, string> = {
  '1': 'บ้านชายวัด',
  '2': 'บ้านเกาะปอม',
  '3': 'บ้านตลาดใหม่',
  '4': 'บ้านแหลมม่วง',
  '5': 'บ้านป่าเตียว',
  '6': 'บ้านควนทองสีห์',
  '7': 'บ้านท่าเรือ',
};

const BANGPAO_COORDS: Record<string, { lat: number; lng: number }> = {
  '1': { lat: 7.4312, lng: 99.5218 },
  '2': { lat: 7.4245, lng: 99.5312 },
  '3': { lat: 7.4198, lng: 99.5248 },
  '4': { lat: 7.4239, lng: 99.5164 },
  '5': { lat: 7.4385, lng: 99.5342 },
  '6': { lat: 7.4307, lng: 99.5246 },
  '7': { lat: 7.4152, lng: 99.5189 },
};

export interface ConvoyStopItem {
  id: string;
  patientId: string;
  queueOrder: number;
  patientName: string;
  age?: number;
  moo: string;
  village: string;
  address: string;
  landmark?: string;
  phone: string;
  caregiverName?: string;
  lat: number;
  lng: number;
  adlCategory: string;
  itemsSummary: string;
  itemsList: LtcRoundItem[];
}

interface LiveConvoyMobileAppProps {
  convoyParam: string; // e.g. "2569_1" or "2569-1"
  patients: LtcPatient[];
  onExitToMainSystem?: () => void;
}

export const LiveConvoyMobileApp: React.FC<LiveConvoyMobileAppProps> = ({
  convoyParam,
  patients,
  onExitToMainSystem,
}) => {
  // Parse fiscalYear and round from convoyParam (supports "2569_1", "2569-1", "PLAN-2569-R1", etc.)
  const parsedPeriod = useMemo(() => {
    const clean = (convoyParam || '2569_1').trim();
    const match = clean.match(/(25\d{2})[_-]?R?(\d+|urgent)/i);
    if (match) {
      return { year: match[1], round: match[2], key: `${match[1]}_${match[2]}` };
    }
    return { year: '2569', round: '1', key: '2569_1' };
  }, [convoyParam]);

  const [activeYear, setActiveYear] = useState<string>(parsedPeriod.year);
  const [activeRound, setActiveRound] = useState<string>(parsedPeriod.round);
  const activePlanKey = `${activeYear}_${activeRound}`;

  // Role mode: Strictly 'follower' (Read-Only) by default when opened via shared link!
  // Only unlocks 'lead' (Driver/Staff control mode) if opened with ?role=lead&pin=2569 or unlocked via Officer PIN modal
  const [roleMode, setRoleMode] = useState<'follower' | 'lead'>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('role') === 'lead' && p.get('pin') === '2569') return 'lead';
    }
    return 'follower';
  });
  const [isStaffPinModalOpen, setIsStaffPinModalOpen] = useState(false);
  const [staffPinInput, setStaffPinInput] = useState('');
  const [staffPinError, setStaffPinError] = useState('');

  const [remotePatients, setRemotePatients] = useState<LtcPatient[]>([]);
  const effectivePatients = useMemo(() => {
    const combined = remotePatients.length > 0 ? remotePatients : patients;
    return mergeLtcWithMaster(combined);
  }, [remotePatients, patients]);

  // Cloud-synced states
  const [cloudConvoyDoc, setCloudConvoyDoc] = useState<any>(null);
  const [cloudPlanDoc, setCloudPlanDoc] = useState<any>(null);
  const [deliveryRecords, setDeliveryRecords] = useState<Record<string, RoundDeliveryRecord>>(() => {
    try {
      const saved = localStorage.getItem('bangpao_ltc_round_deliveries_v2');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  // GPS & Road Route state
  const [myGps, setMyGps] = useState<{
    lat: number;
    lng: number;
    updatedAt: string;
    distToTargetKm?: number;
    durToTargetMin?: number;
    distToNextKm?: number;
    durToNextMin?: number;
  } | null>(null);
  const [isLocatingMyGps, setIsLocatingMyGps] = useState(false);
  const [isSharingLeadGps, setIsSharingLeadGps] = useState(false);
  const leadGpsTimerRef = useRef<any>(null);

  // Route metrics & per-leg road info from OSRM
  const [roadRouteMetrics, setRoadRouteMetrics] = useState<{
    distanceKm: number;
    durationMin: number;
    legMetrics: { distanceKm: number; durationMin: number }[];
  } | null>(null);
  const [isCalculatingRoad, setIsCalculatingRoad] = useState(false);

  // UI Modals & Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [isShareQrOpen, setIsShareQrOpen] = useState(false);
  const [handoverModalStop, setHandoverModalStop] = useState<ConvoyStopItem | null>(null);
  const [receiverName, setReceiverName] = useState('ญาติผู้ดูแลผู้ป่วย');
  const [receiverRelation, setReceiverRelation] = useState('ญาติผู้ดูแล');
  const [handoverNote, setHandoverNote] = useState('');
  const [queueFilterTab, setQueueFilterTab] = useState<'pending' | 'delivered' | 'all'>('pending');

  // Map refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const markerMapRef = useRef<Record<string, any>>({});

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Subscribe to Firestore LTC_QUEUES and LTC patients in real-time
  useEffect(() => {
    const unsubLtc = subscribeCollection<LtcPatient>(COLLECTIONS.LTC, (items) => {
      if (items && items.length > 0) {
        setRemotePatients(items);
      }
    });

    const unsubQueues = subscribeCollection<any>(COLLECTIONS.LTC_QUEUES, (docs) => {
      if (!docs) return;

      // 1. Shared Delivery Records
      const sharedDeliv = docs.find((d) => d.id === 'LTC_SHARED_DELIVERY_RECORDS');
      if (sharedDeliv?.recordsMap) {
        setDeliveryRecords((prev) => ({
          ...prev,
          ...sharedDeliv.recordsMap,
        }));
      }

      // 2. Live Convoy Document for activePlanKey
      const liveDoc = docs.find((d) => d.id === `LIVE_CONVOY_${activePlanKey}`);
      if (liveDoc) {
        setCloudConvoyDoc(liveDoc);
      } else {
        setCloudConvoyDoc(null);
      }

      // 3. Saved Round Plan Document for activePlanKey (match all ID conventions & fiscalYear/round fields)
      const planDoc = docs.find(
        (d) =>
          d.id === `PLAN_${activeYear}_R${activeRound}` ||
          d.id === `LTC_${activeYear}_R${activeRound}` ||
          d.id === `PLAN-${activeYear}-R${activeRound}` ||
          d.id === `LTC-${activeYear}-R${activeRound}` ||
          (String(d.fiscalYear) === String(activeYear) &&
            String(d.round) === String(activeRound) &&
            (Array.isArray(d.stops) || Array.isArray(d.fullPlanData?.stops)))
      );
      if (planDoc) {
        setCloudPlanDoc(planDoc);
      } else {
        setCloudPlanDoc(null);
      }
    });

    return () => {
      unsubLtc();
      unsubQueues();
    };
  }, [activePlanKey, activeYear, activeRound]);

  // Helper to enrich any stop item with latest landmark & round items from effectivePatients
  const enrichStopWithPatientData = (rawStop: any, idx: number): ConvoyStopItem => {
    const ptId = rawStop.patientId || rawStop.id || `STOP-${idx + 1}`;
    const ptName = rawStop.patientName || rawStop.fullName || 'ผู้มีภาวะพึ่งพิง';
    const matchedPt = effectivePatients.find(
      (p) => p.id === ptId || (p.fullName && ptName && p.fullName.trim() === ptName.trim())
    );
    const moo = String(rawStop.moo || matchedPt?.moo || '1');
    const fallbackCoord = BANGPAO_COORDS[moo] || BANGPAO_MUNICIPALITY_COORDS;

    const rawItemsList: LtcRoundItem[] = Array.isArray(rawStop.itemsList) && rawStop.itemsList.length > 0
      ? rawStop.itemsList
      : Array.isArray(rawStop.items) && rawStop.items.length > 0
      ? rawStop.items
      : matchedPt?.yearRoundItems?.[activeYear]?.[activeRound] ||
        matchedPt?.roundItems?.[activeRound] ||
        [];

    const rawSummary =
      rawStop.itemsSummary && rawStop.itemsSummary !== '-' && rawStop.itemsSummary !== 'ชุดดูแลสุขภาพ สปสช. LTC'
        ? rawStop.itemsSummary.replace(/^รอบที่\s*\d+\s*:\s*/, '')
        : rawItemsList.length > 0
        ? rawItemsList.map((it: any) => `${it.itemName} (${it.quantity} ${it.unit})`).join(', ')
        : matchedPt?.equipmentNeeded || `ผ้าอ้อมผู้ใหญ่ (${matchedPt?.monthlyDiaperAllowance || 90} ชิ้น)`;

    return {
      id: rawStop.id || ptId,
      patientId: ptId,
      queueOrder: idx + 1,
      patientName: ptName,
      age: rawStop.age ?? matchedPt?.age,
      moo,
      village: rawStop.village || BANGPAO_VILLAGES[moo] || '',
      address: rawStop.address || matchedPt?.address || '',
      landmark: rawStop.landmark || matchedPt?.landmark || '',
      phone: rawStop.phone || rawStop.caregiverPhone || matchedPt?.caregiverPhone || matchedPt?.phone || '-',
      caregiverName: rawStop.caregiverName || matchedPt?.caregiverName || 'ญาติผู้ดูแล',
      lat: Number(rawStop.lat ?? rawStop.latitude ?? matchedPt?.latitude ?? fallbackCoord.lat),
      lng: Number(rawStop.lng ?? rawStop.longitude ?? matchedPt?.longitude ?? fallbackCoord.lng),
      adlCategory: rawStop.adlCategory || matchedPt?.adlCategory || 'ติดเตียง',
      itemsSummary: rawSummary,
      itemsList: rawItemsList,
    };
  };

  // Build complete list of stops strictly from this round's arranged plan/queue!
  const allConvoyStops: ConvoyStopItem[] = useMemo(() => {
    // Priority 1: Explicit stops snapshot inside Cloud LIVE_CONVOY_${activePlanKey}
    if (
      cloudConvoyDoc?.stopsSnapshot &&
      Array.isArray(cloudConvoyDoc.stopsSnapshot) &&
      cloudConvoyDoc.stopsSnapshot.length > 0
    ) {
      return cloudConvoyDoc.stopsSnapshot.map((s: any, idx: number) => enrichStopWithPatientData(s, idx));
    }

    // Priority 2: Saved Round Plan stops from Cloud Firestore (PLAN-2569-R1 / LTC-2569-R1)
    const cloudPlanStops = cloudPlanDoc?.fullPlanData?.stops || cloudPlanDoc?.stops;
    if (Array.isArray(cloudPlanStops) && cloudPlanStops.length > 0) {
      return cloudPlanStops.map((s: any, idx: number) => enrichStopWithPatientData(s, idx));
    }

    // Priority 3: LocalStorage live convoy cache (`bangpao_live_convoy_${activePlanKey}`)
    try {
      const localConvoyRaw = localStorage.getItem(`bangpao_live_convoy_${activePlanKey}`);
      if (localConvoyRaw) {
        const parsed = JSON.parse(localConvoyRaw);
        if (Array.isArray(parsed?.stopsSnapshot) && parsed.stopsSnapshot.length > 0) {
          return parsed.stopsSnapshot.map((s: any, idx: number) => enrichStopWithPatientData(s, idx));
        }
      }
    } catch {}

    // Priority 4: LocalStorage saved round plans (`bangpao_ltc_round_plans_v1`)
    try {
      const localPlansRaw = localStorage.getItem('bangpao_ltc_round_plans_v1');
      if (localPlansRaw) {
        const plansMap = JSON.parse(localPlansRaw);
        const targetPlan = plansMap?.[activePlanKey];
        if (Array.isArray(targetPlan?.stops) && targetPlan.stops.length > 0) {
          return targetPlan.stops.map((s: any, idx: number) => enrichStopWithPatientData(s, idx));
        }
      }
    } catch {}

    // Priority 5: LocalStorage period queues (`bangpao_ltc_period_queues_v2`)
    try {
      const localQueuesRaw = localStorage.getItem('bangpao_ltc_period_queues_v2');
      if (localQueuesRaw) {
        const queuesMap = JSON.parse(localQueuesRaw);
        const queueIds: string[] = queuesMap?.[`${activeYear}-${activeRound}`] || [];
        if (Array.isArray(queueIds) && queueIds.length > 0) {
          const matchedStops = queueIds
            .map((qid) =>
              effectivePatients.find(
                (p) => p.id === qid || `STOP-${p.id}` === qid || qid.endsWith(p.id)
              )
            )
            .filter((p): p is LtcPatient => Boolean(p));
          if (matchedStops.length > 0) {
            return matchedStops.map((p, idx) => enrichStopWithPatientData(p, idx));
          }
        }
      }
    } catch {}

    // Priority 6: If cloudConvoyDoc has queueIds, filter strictly by queueIds
    if (Array.isArray(cloudConvoyDoc?.queueIds) && cloudConvoyDoc.queueIds.length > 0) {
      const matched = cloudConvoyDoc.queueIds
        .map((qid: string) =>
          effectivePatients.find((p) => p.id === qid || `STOP-${p.id}` === qid || qid.endsWith(p.id))
        )
        .filter((p: LtcPatient | undefined): p is LtcPatient => Boolean(p));
      if (matched.length > 0) {
        return matched.map((p: LtcPatient, idx: number) => enrichStopWithPatientData(p, idx));
      }
    }

    // Fallback if no round plan exists yet
    return effectivePatients
      .filter((p) => p.status !== 'deceased')
      .map((p, idx) => enrichStopWithPatientData(p, idx));
  }, [cloudConvoyDoc, cloudPlanDoc, effectivePatients, activeYear, activeRound, activePlanKey]);

  // Auto-heal Cloud Firestore: if this device has the round's stops from localStorage/Plan but LIVE_CONVOY_${activePlanKey} in Firestore doesn't have stopsSnapshot yet, push it once!
  useEffect(() => {
    if (
      allConvoyStops.length > 0 &&
      (!cloudConvoyDoc || !Array.isArray(cloudConvoyDoc.stopsSnapshot) || cloudConvoyDoc.stopsSnapshot.length === 0)
    ) {
      saveToFirestore(
        COLLECTIONS.LTC_QUEUES,
        {
          id: `LIVE_CONVOY_${activePlanKey}`,
          planKey: activePlanKey,
          fiscalYear: activeYear,
          round: activeRound,
          isActive: true,
          targetStopId: cloudConvoyDoc?.targetStopId || allConvoyStops[0].id,
          stopsSnapshot: allConvoyStops,
          updatedAt: new Date().toISOString(),
        },
        `LIVE_CONVOY_${activePlanKey}`
      ).catch(() => {});
    }
  }, [allConvoyStops.length, activePlanKey, cloudConvoyDoc?.stopsSnapshot?.length]);

  // Check if a stop is delivered in this year & round
  const getStopDeliveryInfo = (patientId: string) => {
    const key = `${patientId}_${activeYear}_${activeRound}`;
    const rec = deliveryRecords[key];
    if (rec && rec.status === 'delivered') {
      return {
        isDelivered: true,
        deliveredAt: rec.deliveredAt,
        receiverName: rec.receiverName,
        deliveryNote: rec.deliveryNote,
      };
    }
    return { isDelivered: false };
  };

  const pendingStops = useMemo(
    () => allConvoyStops.filter((s) => !getStopDeliveryInfo(s.patientId).isDelivered),
    [allConvoyStops, deliveryRecords, activeYear, activeRound]
  );

  const deliveredStops = useMemo(
    () => allConvoyStops.filter((s) => getStopDeliveryInfo(s.patientId).isDelivered),
    [allConvoyStops, deliveryRecords, activeYear, activeRound]
  );

  // Determine current target stop & next target stop
  const currentTargetStop: ConvoyStopItem | null = useMemo(() => {
    if (pendingStops.length === 0) return null;
    if (cloudConvoyDoc?.targetStopId) {
      const found = pendingStops.find(
        (s) => s.id === cloudConvoyDoc.targetStopId || s.patientId === cloudConvoyDoc.targetStopId
      );
      if (found) return found;
    }
    return pendingStops[0];
  }, [pendingStops, cloudConvoyDoc]);

  const nextTargetStop: ConvoyStopItem | null = useMemo(() => {
    if (!currentTargetStop || pendingStops.length <= 1) return null;
    const curIdx = pendingStops.findIndex((s) => s.patientId === currentTargetStop.patientId);
    return pendingStops[curIdx + 1] || null;
  }, [pendingStops, currentTargetStop]);

  // Project source type badge
  const projectSourceType: LtcProjectSourceType =
    cloudConvoyDoc?.projectSourceType ||
    cloudPlanDoc?.projectSourceType ||
    cloudPlanDoc?.fullPlanData?.projectSourceType ||
    'both';

  const projectBadge = useMemo(() => {
    if (projectSourceType === 'nhso') {
      return {
        label: '🏥 โครงการ สปสช. (กองทุนหลักประกันสุขภาพ)',
        short: '🏥 โครงการ สปสช.',
        cls: 'bg-sky-500/20 text-sky-200 border-sky-400/40',
      };
    }
    if (projectSourceType === 'ltc') {
      return {
        label: '👵 โครงการ LTC (ดูแลระยะยาวด้านสาธารณสุข)',
        short: '👵 โครงการ LTC',
        cls: 'bg-purple-500/20 text-purple-200 border-purple-400/40',
      };
    }
    return {
      label: '🤝 แจกพร้อมกัน 2 โครงการ (สปสช. + LTC)',
      short: '🤝 สปสช. + LTC',
      cls: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
    };
  }, [projectSourceType]);

  // Update target stop in Cloud Firestore
  const handleSelectTargetStop = async (stop: ConvoyStopItem) => {
    try {
      await saveToFirestore(
        COLLECTIONS.LTC_QUEUES,
        {
          ...(cloudConvoyDoc || {}),
          id: `LIVE_CONVOY_${activePlanKey}`,
          planKey: activePlanKey,
          isActive: true,
          targetStopId: stop.id,
          updatedAt: new Date().toISOString(),
        },
        `LIVE_CONVOY_${activePlanKey}`
      );
      showToast(`🎯 เปลี่ยนเป้าหมายปัจจุบันเป็น คิว #${stop.queueOrder}: ${stop.patientName}`);
    } catch {}
  };

  // Confirm Delivery Handover & Advance Convoy to Next Stop in Real-Time!
  const handleConfirmHandover = async () => {
    if (!handoverModalStop) return;
    const key = `${handoverModalStop.patientId}_${activeYear}_${activeRound}`;
    const newRec: RoundDeliveryRecord = {
      patientId: handoverModalStop.patientId,
      year: activeYear,
      round: activeRound,
      status: 'delivered',
      deliveredAt: new Date().toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }),
      receiverName: `${receiverName.trim() || 'ญาติผู้ดูแล'} (${receiverRelation})`,
      deliveryNote: handoverNote.trim(),
      itemsDelivered: handoverModalStop.itemsList,
    };

    const nextRecords = {
      ...deliveryRecords,
      [key]: newRec,
    };
    setDeliveryRecords(nextRecords);
    try {
      localStorage.setItem('bangpao_ltc_round_deliveries_v2', JSON.stringify(nextRecords));
    } catch {}

    // Determine the next pending stop after this one
    const remainingAfterThis = pendingStops.filter(
      (s) => s.patientId !== handoverModalStop.patientId
    );
    const nextStop = remainingAfterThis.length > 0 ? remainingAfterThis[0] : null;

    try {
      await saveToFirestore(
        COLLECTIONS.LTC_QUEUES,
        {
          id: 'LTC_SHARED_DELIVERY_RECORDS',
          recordsMap: nextRecords,
          updatedAt: new Date().toISOString(),
        },
        'LTC_SHARED_DELIVERY_RECORDS'
      );

      await saveToFirestore(
        COLLECTIONS.LTC_QUEUES,
        {
          ...(cloudConvoyDoc || {}),
          id: `LIVE_CONVOY_${activePlanKey}`,
          planKey: activePlanKey,
          isActive: remainingAfterThis.length > 0,
          targetStopId: nextStop ? nextStop.id : null,
          updatedAt: new Date().toISOString(),
        },
        `LIVE_CONVOY_${activePlanKey}`
      );
    } catch (e) {
      console.warn('Failed to sync handover to cloud:', e);
    }

    setHandoverModalStop(null);
    setHandoverNote('');
    if (nextStop) {
      showToast(
        `✅ ส่งมอบคิว #${handoverModalStop.queueOrder} สำเร็จ! เลื่อนเป้าไป คิว #${nextStop.queueOrder} (${nextStop.patientName}) แล้ว`
      );
    } else {
      showToast('🎉 ส่งมอบครบทุกบ้านในรอบนี้เรียบร้อยแล้ว!');
    }
  };

  // Revert delivery if clicked by mistake
  const handleRevertStopDelivery = async (stop: ConvoyStopItem) => {
    const key = `${stop.patientId}_${activeYear}_${activeRound}`;
    const nextRecords = { ...deliveryRecords };
    delete nextRecords[key];
    setDeliveryRecords(nextRecords);
    try {
      localStorage.setItem('bangpao_ltc_round_deliveries_v2', JSON.stringify(nextRecords));
      await saveToFirestore(
        COLLECTIONS.LTC_QUEUES,
        {
          id: 'LTC_SHARED_DELIVERY_RECORDS',
          recordsMap: nextRecords,
          updatedAt: new Date().toISOString(),
        },
        'LTC_SHARED_DELIVERY_RECORDS'
      );
    } catch {}
    showToast(`↩️ ยกเลิกสถานะส่งมอบของ ${stop.patientName} แล้ว`);
  };

  // Locate Follower/Officer Current GPS & Calculate Real Road Distance/ETA to Current Target & Next Stop
  const handleLocateMyGps = () => {
    if (!navigator.geolocation) {
      alert('เบราว์เซอร์ไม่รองรับการดึงพิกัด GPS');
      return;
    }
    setIsLocatingMyGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const nowStr = new Date().toLocaleTimeString('th-TH', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        let distToTargetKm: number | undefined;
        let durToTargetMin: number | undefined;
        let distToNextKm: number | undefined;
        let durToNextMin: number | undefined;

        try {
          if (currentTargetStop) {
            const r1 = await fetch(
              `https://router.project-osrm.org/route/v1/driving/${lng},${lat};${currentTargetStop.lng},${currentTargetStop.lat}?overview=false`
            ).then((r) => r.json());
            if (r1?.routes?.[0]) {
              distToTargetKm = Number((r1.routes[0].distance / 1000).toFixed(1));
              durToTargetMin = Math.max(1, Math.round(r1.routes[0].duration / 60));
            }
          }
          if (nextTargetStop) {
            const r2 = await fetch(
              `https://router.project-osrm.org/route/v1/driving/${lng},${lat};${nextTargetStop.lng},${nextTargetStop.lat}?overview=false`
            ).then((r) => r.json());
            if (r2?.routes?.[0]) {
              distToNextKm = Number((r2.routes[0].distance / 1000).toFixed(1));
              durToNextMin = Math.max(1, Math.round(r2.routes[0].duration / 60));
            }
          }
        } catch {}

        setMyGps({
          lat,
          lng,
          updatedAt: nowStr,
          distToTargetKm,
          durToTargetMin,
          distToNextKm,
          durToNextMin,
        });
        setIsLocatingMyGps(false);
        showToast(`📍 อัปเดตพิกัดปัจจุบันของคุณแล้ว พร้อมคำนวณเส้นทางตามขบวน!`);
      },
      () => {
        setIsLocatingMyGps(false);
        const lat = BANGPAO_MUNICIPALITY_COORDS.lat;
        const lng = BANGPAO_MUNICIPALITY_COORDS.lng;
        setMyGps({
          lat,
          lng,
          updatedAt: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        });
        showToast('📍 ใช้พิกัดเริ่มต้น ทต.บางเป้า ในการคำนวณเส้นทาง');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Toggle Live Lead Vehicle GPS Broadcasting
  const handleToggleLeadGpsBroadcast = () => {
    if (isSharingLeadGps) {
      if (leadGpsTimerRef.current) clearInterval(leadGpsTimerRef.current);
      leadGpsTimerRef.current = null;
      setIsSharingLeadGps(false);
      showToast('หยุดแชร์พิกัดรถขนของคันหลักแล้ว');
      return;
    }
    if (!navigator.geolocation) {
      alert('อุปกรณ์ไม่รองรับ GPS');
      return;
    }
    setIsSharingLeadGps(true);
    const pushPos = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          const timeStr = new Date().toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
          saveToFirestore(
            COLLECTIONS.LTC_QUEUES,
            {
              ...(cloudConvoyDoc || {}),
              id: `LIVE_CONVOY_${activePlanKey}`,
              planKey: activePlanKey,
              isActive: true,
              leadLat: lat,
              leadLng: lng,
              leadUpdatedAt: timeStr,
              updatedAt: new Date().toISOString(),
            },
            `LIVE_CONVOY_${activePlanKey}`
          ).catch(() => {});
        },
        () => {},
        { enableHighAccuracy: true, timeout: 7000 }
      );
    };
    pushPos();
    leadGpsTimerRef.current = setInterval(pushPos, 12000);
    showToast('🛰️ กำลังแชร์พิกัด GPS รถขนของคันหลักสดให้คณะผู้ติดตาม!');
  };

  useEffect(() => {
    return () => {
      if (leadGpsTimerRef.current) clearInterval(leadGpsTimerRef.current);
    };
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    let timer = setTimeout(() => {
      const L = (window as any).L;
      const container = mapContainerRef.current as any;
      if (!L || !container) return;

      if (mapInstanceRef.current && mapInstanceRef.current.getContainer() !== container) {
        try {
          mapInstanceRef.current.remove();
        } catch {}
        mapInstanceRef.current = null;
      }

      if (!mapInstanceRef.current) {
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

        const rLayer = L.layerGroup().addTo(map);
        const mLayer = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;
        routeLayerRef.current = rLayer;
        markersLayerRef.current = mLayer;
      }
    }, 60);

    return () => clearTimeout(timer);
  }, []);

  // Resize map when expanded changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const timers = [40, 150, 300].map((ms) =>
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize({ animate: false });
      }, ms)
    );
    return () => timers.forEach(clearTimeout);
  }, [isMapExpanded]);

  // Render Markers & Real Road OSRM Geometry on Map
  useEffect(() => {
    let isCancelled = false;
    const L = (window as any).L;
    const map = mapInstanceRef.current;
    const mLayer = markersLayerRef.current;
    const rLayer = routeLayerRef.current;
    if (!L || !map || !mLayer || !rLayer) return;

    mLayer.clearLayers();
    rLayer.clearLayers();
    markerMapRef.current = {};

    // 1. HQ Pin
    const hqIcon = L.divIcon({
      className: '',
      html: `<div style="background:#1d4ed8;color:#fff;font-family:'Prompt',sans-serif;font-weight:800;font-size:10px;padding:3px 8px;border-radius:999px;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4);white-space:nowrap;transform:translate(-50%,-50%);">🏢 ทต.บางเป้า</div>`,
      iconSize: [0, 0],
    });
    L.marker([BANGPAO_MUNICIPALITY_COORDS.lat, BANGPAO_MUNICIPALITY_COORDS.lng], {
      icon: hqIcon,
      zIndexOffset: 900,
    }).addTo(mLayer);

    // 2. All Convoy Stop Pins
    allConvoyStops.forEach((stop) => {
      const deliv = getStopDeliveryInfo(stop.patientId);
      const isCurrentTarget = currentTargetStop?.patientId === stop.patientId;
      const isNextTarget = nextTargetStop?.patientId === stop.patientId;

      const bg = deliv.isDelivered
        ? '#16a34a'
        : isCurrentTarget
        ? '#dc2626'
        : isNextTarget
        ? '#d97706'
        : '#0f766e';
      const ring = isCurrentTarget
        ? '0 0 0 5px rgba(220,38,38,0.45), 0 4px 12px rgba(0,0,0,0.5)'
        : '0 2px 6px rgba(0,0,0,0.4)';
      const badgeLabel = deliv.isDelivered
        ? `✓ #${stop.queueOrder}`
        : isCurrentTarget
        ? `🎯 #${stop.queueOrder} (เป้าหมาย)`
        : `#${stop.queueOrder}`;

      const stopIcon = L.divIcon({
        className: '',
        html: `<div style="background:${bg};color:#fff;font-family:'Prompt',sans-serif;font-weight:900;font-size:11px;padding:3px 8px;border-radius:999px;border:2px solid #fff;box-shadow:${ring};white-space:nowrap;transform:translate(-50%,-50%);">${badgeLabel} ${stop.patientName.split(' ')[0]}</div>`,
        iconSize: [0, 0],
      });

      const marker = L.marker([stop.lat, stop.lng], {
        icon: stopIcon,
        zIndexOffset: isCurrentTarget ? 1800 : deliv.isDelivered ? 200 : 1000 - stop.queueOrder,
      }).addTo(mLayer);

      marker.bindPopup(
        `<div style="font-family:'Prompt',sans-serif;font-size:12px;line-height:1.45;min-width:210px;">
          <div style="font-weight:900;color:#0f172a;font-size:13px;">คิว #${stop.queueOrder}: ${stop.patientName}</div>
          <div style="font-size:11px;color:#334155;margin-top:2px;">📍 หมู่ที่ ${stop.moo} ${stop.village} • ${stop.address}</div>
          ${stop.landmark ? `<div style="font-size:11px;color:#b45309;font-weight:700;">🚩 ใกล้: ${stop.landmark}</div>` : ''}
          <div style="font-size:11px;color:#0f766e;margin-top:4px;font-weight:700;">📦 ${stop.itemsSummary}</div>
          <div style="margin-top:6px;padding-top:6px;border-top:1px solid #e2e8f0;">
            <a href="https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}&travelmode=driving" target="_blank" rel="noopener noreferrer" style="color:#2563eb;font-weight:800;text-decoration:none;font-size:11px;">🚗 เปิด Google Maps นำทางไปบ้านนี้ ➔</a>
          </div>
        </div>`
      );

      markerMapRef.current[stop.patientId] = marker;
    });

    // 3. Lead Vehicle Live GPS Marker (if shared)
    if (cloudConvoyDoc?.leadLat && cloudConvoyDoc?.leadLng) {
      const truckIcon = L.divIcon({
        className: '',
        html: `<div style="background:#e11d48;color:#fff;font-family:'Prompt',sans-serif;font-size:11px;font-weight:900;padding:4px 10px;border-radius:999px;border:2px solid #fff;box-shadow:0 4px 12px rgba(225,29,72,0.6);white-space:nowrap;transform:translate(-50%,-50%);">🚚 รถขนของคันหลัก (${cloudConvoyDoc.leadUpdatedAt || 'สด'})</div>`,
        iconSize: [0, 0],
      });
      L.marker([cloudConvoyDoc.leadLat, cloudConvoyDoc.leadLng], {
        icon: truckIcon,
        zIndexOffset: 2200,
      }).addTo(mLayer);
    }

    // 4. Follower's Own GPS Marker + Catch-up Road Line
    if (myGps) {
      const myIcon = L.divIcon({
        className: '',
        html: `<div style="background:#7c3aed;color:#fff;font-family:'Prompt',sans-serif;font-size:11px;font-weight:900;padding:4px 10px;border-radius:999px;border:2px solid #fff;box-shadow:0 4px 12px rgba(124,58,237,0.6);white-space:nowrap;transform:translate(-50%,-50%);">🚗 พิกัดของคุณ</div>`,
        iconSize: [0, 0],
      });
      L.marker([myGps.lat, myGps.lng], {
        icon: myIcon,
        zIndexOffset: 2300,
      }).addTo(mLayer);

      if (currentTargetStop) {
        fetch(
          `https://router.project-osrm.org/route/v1/driving/${myGps.lng},${myGps.lat};${currentTargetStop.lng},${currentTargetStop.lat}?overview=full&geometries=geojson`
        )
          .then((r) => r.json())
          .then((cData) => {
            if (isCancelled || !routeLayerRef.current) return;
            if (cData?.routes?.[0]) {
              const coords: [number, number][] = cData.routes[0].geometry.coordinates.map(
                (c: [number, number]) => [c[1], c[0]]
              );
              L.polyline(coords, {
                color: '#a855f7',
                weight: 5,
                opacity: 0.95,
                dashArray: '8, 6',
              }).addTo(rLayer);
            }
          })
          .catch(() => {});
      }
    }

    // 5. Fetch & Draw Real Road Route for the Convoy Queue via OSRM
    const activeRouteStops = pendingStops.length > 0 ? pendingStops : allConvoyStops;
    if (activeRouteStops.length > 0) {
      const waypoints = [
        { lat: BANGPAO_MUNICIPALITY_COORDS.lat, lng: BANGPAO_MUNICIPALITY_COORDS.lng },
        ...activeRouteStops.map((s) => ({ lat: s.lat, lng: s.lng })),
      ];
      const coordStr = waypoints.map((w) => `${w.lng},${w.lat}`).join(';');
      setIsCalculatingRoad(true);

      fetch(`https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`)
        .then((res) => res.json())
        .then((data) => {
          if (isCancelled || !routeLayerRef.current) return;
          if (data?.code === 'Ok' && data.routes?.[0]) {
            const route = data.routes[0];
            const roadCoords: [number, number][] = route.geometry.coordinates.map(
              (c: [number, number]) => [c[1], c[0]]
            );

            // Access dashed lines from road snap point to each house pin
            if (Array.isArray(data.waypoints)) {
              data.waypoints.forEach((wp: any, idx: number) => {
                if (idx > 0 && wp?.location) {
                  const targetPt = waypoints[idx];
                  L.polyline(
                    [
                      [wp.location[1], wp.location[0]],
                      [targetPt.lat, targetPt.lng],
                    ],
                    {
                      color: '#fbbf24',
                      weight: 3,
                      opacity: 0.9,
                      dashArray: '4, 5',
                    }
                  ).addTo(rLayer);
                }
              });
            }

            // Road Outer White Casing
            L.polyline(roadCoords, {
              color: '#ffffff',
              weight: 8,
              opacity: 0.9,
              lineCap: 'round',
              lineJoin: 'round',
            }).addTo(rLayer);

            // Road Main Blue/Cyan Line
            L.polyline(roadCoords, {
              color: '#0284c7',
              weight: 5,
              opacity: 0.95,
              lineCap: 'round',
              lineJoin: 'round',
            }).addTo(rLayer);

            const legs: { distanceKm: number; durationMin: number }[] = Array.isArray(route.legs)
              ? route.legs.map((lg: any) => ({
                  distanceKm: Number((lg.distance / 1000).toFixed(1)),
                  durationMin: Math.max(1, Math.round(lg.duration / 60)),
                }))
              : [];

            setRoadRouteMetrics({
              distanceKm: Number((route.distance / 1000).toFixed(1)),
              durationMin: Math.max(2, Math.round(route.duration / 60)),
              legMetrics: legs,
            });
          }
        })
        .catch(() => {})
        .finally(() => {
          if (!isCancelled) setIsCalculatingRoad(false);
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [allConvoyStops, pendingStops, currentTargetStop, nextTargetStop, cloudConvoyDoc, myGps, deliveryRecords]);

  // Fit map bounds to all stops on first load
  useEffect(() => {
    const L = (window as any).L;
    const map = mapInstanceRef.current;
    if (!L || !map || allConvoyStops.length === 0) return;
    const timer = setTimeout(() => {
      const pts: [number, number][] = [
        [BANGPAO_MUNICIPALITY_COORDS.lat, BANGPAO_MUNICIPALITY_COORDS.lng],
        ...allConvoyStops.map((s) => [s.lat, s.lng] as [number, number]),
      ];
      if (pts.length > 1) {
        map.fitBounds(L.latLngBounds(pts), { padding: [36, 36], maxZoom: 16 });
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [allConvoyStops.length]);

  const focusStopOnMap = (stop: ConvoyStopItem) => {
    const map = mapInstanceRef.current;
    const marker = markerMapRef.current[stop.patientId];
    if (map) {
      map.setView([stop.lat, stop.lng], 18, { animate: true });
      if (marker) marker.openPopup();
    }
  };

  // Multi-stop Google Maps URL for remaining stops
  const getMultiStopGoogleMapsUrl = () => {
    const list = pendingStops.length > 0 ? pendingStops : allConvoyStops;
    if (list.length === 0) {
      return `https://www.google.com/maps/search/?api=1&query=${BANGPAO_MUNICIPALITY_COORDS.lat},${BANGPAO_MUNICIPALITY_COORDS.lng}`;
    }
    const origin = myGps
      ? `${myGps.lat},${myGps.lng}`
      : `${BANGPAO_MUNICIPALITY_COORDS.lat},${BANGPAO_MUNICIPALITY_COORDS.lng}`;
    const last = list[list.length - 1];
    const dest = `${last.lat},${last.lng}`;
    const mid = list.slice(0, -1);
    if (mid.length === 0) {
      return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=driving`;
    }
    const wp = mid.map((s) => `${s.lat},${s.lng}`).join('|');
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&waypoints=${encodeURIComponent(wp)}&travelmode=driving`;
  };

  const shareableConvoyUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}${window.location.pathname}?convoy=${activePlanKey}`;
  }, [activePlanKey]);

  const handleShareToLine = () => {
    const msg = [
      `🛰️ ลิงก์ติดตามขบวนแจกพัสดุ สปสช. LTC ทต.บางเป้า (สด Real-Time)`,
      `📅 ปีงบประมาณ ${activeYear} • งวดรอบที่ ${activeRound}`,
      `🎯 ประเภท: ${projectBadge.short}`,
      `📍 จำนวนจุดส่งมอบ: ${allConvoyStops.length} บ้าน (ส่งแล้ว ${deliveredStops.length} บ้าน • รอส่ง ${pendingStops.length} บ้าน)`,
      currentTargetStop
        ? `🚚 ขณะนี้ขบวนกำลังไปที่: คิว #${currentTargetStop.queueOrder} ${currentTargetStop.patientName} (ม.${currentTargetStop.moo} ${currentTargetStop.village})`
        : `🎉 ส่งมอบครบทุกบ้านแล้ว`,
      ``,
      `📲 กดลิงก์ด้านล่างเพื่อเปิดแผนที่นำทางและดูคิวสดบนมือถือ (ไม่ต้องล็อกอิน):`,
      shareableConvoyUrl,
    ].join('\n');

    window.open(`https://line.me/R/msg/text/?${encodeURIComponent(msg)}`, '_blank');
  };

  const displayedQueueList = useMemo(() => {
    if (queueFilterTab === 'pending') return pendingStops;
    if (queueFilterTab === 'delivered') return deliveredStops;
    return allConvoyStops;
  }, [queueFilterTab, pendingStops, deliveredStops, allConvoyStops]);

  const progressPercent =
    allConvoyStops.length > 0
      ? Math.round((deliveredStops.length / allConvoyStops.length) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans pb-16">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-emerald-400 text-xs font-extrabold flex items-center justify-between gap-2 animate-in fade-in">
          <span>{toastMsg}</span>
          <button onClick={() => setToastMsg(null)} className="font-black px-1">
            ✕
          </button>
        </div>
      )}

      {/* Top Sticky App Header */}
      <div className="sticky top-0 z-30 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 border-b border-teal-800/60 px-3.5 py-3 shadow-lg">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <h1 className="font-black text-xs sm:text-sm tracking-tight text-white truncate">
                  ระบบนำทาง & ติดตามขบวนแจกพัสดุ ทต.บางเป้า
                </h1>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-teal-200 flex-wrap mt-0.5">
                <span className="font-extrabold text-amber-300">
                  ปีงบ {activeYear} • รอบที่ {activeRound}
                </span>
                <span>•</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold border ${projectBadge.cls}`}>
                  {projectBadge.short}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsShareQrOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1 cursor-pointer shadow-sm"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>แชร์ลิงก์/QR</span>
            </button>

            {onExitToMainSystem && (
              <button
                type="button"
                onClick={onExitToMainSystem}
                className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-teal-100 font-bold text-xs flex items-center gap-1 cursor-pointer border border-white/15"
                title="เข้าสู่ระบบหลัก"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ระบบหลัก</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-3xl mx-auto px-3 sm:px-4 pt-3 space-y-3.5">
        {/* Top Status Banner: Clean Follower Read-Only Mode by default; Officer Mode only when unlocked with PIN */}
        {roleMode === 'follower' ? (
          <div className="bg-slate-900/95 border border-teal-800/60 rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-black text-[11px] flex items-center gap-1">
                🚗 สำหรับคณะผู้ติดตาม / ผู้บริหาร
              </span>
              <span className="text-teal-200 text-[11px] font-semibold">
                ดูสถานะสดว่าขบวนอยู่บ้านไหน • แจกอะไรบ้าง • จุดสังเกตใกล้ที่ไหน และกดนำทางตามได้ทันที
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setStaffPinInput('');
                setStaffPinError('');
                setIsStaffPinModalOpen(true);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
              title="เฉพาะเจ้าหน้าที่ประจำรถขนของ (ต้องใช้รหัสยืนยันเพื่อป้องกันการกดผิด)"
            >
              <span>🔒 สำหรับเจ้าหน้าที่รถส่งของ</span>
            </button>
          </div>
        ) : (
          <div className="bg-emerald-950/90 border-2 border-emerald-400 rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-400 text-slate-950 font-black text-[11px]">
                🚚 โหมดเจ้าหน้าที่รถขนของ / ทีมมอบของ (ปลดล็อกแล้ว)
              </span>
              <span className="text-emerald-200 text-[11px] font-semibold">
                สามารถกดบันทึกส่งมอบสำเร็จ เปลี่ยนคิวเป้าหมาย และแชร์พิกัดรถหลักได้
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setRoleMode('follower');
                showToast('🔒 สลับกลับเป็นโหมดผู้ติดตาม (ป้องกันการกดปุ่มโดยไม่ตั้งใจ)');
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-400/50 text-[11px] font-extrabold cursor-pointer shrink-0"
            >
              🔒 ล็อกกลับเป็นหน้าผู้ติดตาม
            </button>
          </div>
        )}

        {/* Live Progress & Mission Status Card */}
        <div className="bg-gradient-to-br from-teal-950 via-slate-900 to-slate-900 border-2 border-teal-600/70 rounded-3xl p-4 shadow-xl space-y-3.5">
          {/* Progress Header */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold flex-wrap gap-1">
              <span className="text-teal-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>
                  ส่งมอบแล้วในรอบนี้ <strong className="text-emerald-400 text-sm">{deliveredStops.length}</strong> /{' '}
                  {allConvoyStops.length} บ้าน ({progressPercent}%)
                </span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 font-black text-[11px]">
                ⏳ เหลืออีก {pendingStops.length} บ้านในรอบนี้
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-400 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {roadRouteMetrics && (
              <div className="flex items-center justify-between text-[11px] text-sky-300 font-semibold pt-0.5 flex-wrap gap-1">
                <span>
                  🛣️ ระยะทางตามถนนรวมรอบนี้ ({allConvoyStops.length} บ้าน): <strong>~{roadRouteMetrics.distanceKm} กม.</strong> (~{roadRouteMetrics.durationMin} นาที)
                </span>
                {(cloudConvoyDoc?.driverName || cloudPlanDoc?.driverName) && (
                  <span className="text-slate-300">
                    🚚 ทีมส่ง: {cloudConvoyDoc?.driverName || cloudPlanDoc?.driverName}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Current Target & Next Target Highlight Boxes (Simple, Clear, Prominent Landmark & Supplies) */}
          {currentTargetStop ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Box 1: Current Target House */}
                <div
                  onClick={() => focusStopOnMap(currentTargetStop)}
                  className="p-3.5 rounded-2xl bg-slate-950/95 border-2 border-emerald-400 shadow-md cursor-pointer hover:border-emerald-300 transition-all flex flex-col justify-between space-y-2.5"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-black text-[11px]">
                        🎯 ตอนนี้ขบวนอยู่ที่ / มุ่งหน้าไป
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-400/30 text-[10px] font-extrabold">
                        {currentTargetStop.adlCategory}
                      </span>
                    </div>

                    <div className="font-black text-base sm:text-lg text-white pt-0.5">
                      คิว #{currentTargetStop.queueOrder}: {currentTargetStop.patientName}
                    </div>

                    <div className="text-xs text-teal-200 font-semibold">
                      🏡 หมู่ที่ {currentTargetStop.moo} {currentTargetStop.village} • บ้านเลขที่ {currentTargetStop.address}
                    </div>

                    {/* Prominent Landmark Badge */}
                    <div className="p-2 rounded-xl bg-amber-400/15 border border-amber-400/50 text-amber-300 text-xs font-extrabold flex items-start gap-1.5">
                      <span className="shrink-0">📍 จุดอ้างอิงใกล้เคียง:</span>
                      <span className="text-white">
                        {currentTargetStop.landmark
                          ? currentTargetStop.landmark
                          : `พื้นที่หมู่ที่ ${currentTargetStop.moo} ${currentTargetStop.village}`}
                      </span>
                    </div>

                    {/* Prominent Supplies Badge */}
                    <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-600/60 text-emerald-200 text-xs font-bold flex items-start gap-1.5">
                      <span className="shrink-0 text-emerald-400">📦 สิ่งของที่แจก:</span>
                      <span className="text-white">{currentTargetStop.itemsSummary}</span>
                    </div>

                    {myGps?.distToTargetKm !== undefined && (
                      <div className="text-xs font-black text-amber-300 pt-0.5">
                        🛣️ ห่างจากคุณตอนนี้: {myGps.distToTargetKm} กม. (~{myGps.durToTargetMin} นาที)
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const origin = myGps ? `&origin=${myGps.lat},${myGps.lng}` : '';
                      window.open(
                        `https://www.google.com/maps/dir/?api=1${origin}&destination=${currentTargetStop.lat},${currentTargetStop.lng}&travelmode=driving`,
                        '_blank'
                      );
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-98"
                  >
                    <Navigation className="w-4 h-4 shrink-0" />
                    <span>🚗 กดนำทางตามไปบ้านนี้ (คิว #{currentTargetStop.queueOrder})</span>
                  </button>
                </div>

                {/* Box 2: Next Target House (For Followers who missed the current house) */}
                <div
                  onClick={() => nextTargetStop && focusStopOnMap(nextTargetStop)}
                  className="p-3.5 rounded-2xl bg-slate-950/90 border-2 border-sky-400/60 cursor-pointer hover:border-sky-300 transition-all flex flex-col justify-between space-y-2.5"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="px-2.5 py-0.5 rounded-full bg-sky-400 text-slate-950 font-black text-[11px]">
                        ⏭️ ต่อไปคือที่ไหน (บ้านถัดไปตามแผน)
                      </span>
                      {nextTargetStop && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10px] font-extrabold">
                          {nextTargetStop.adlCategory}
                        </span>
                      )}
                    </div>

                    {nextTargetStop ? (
                      <>
                        <div className="font-black text-base sm:text-lg text-white pt-0.5">
                          คิว #{nextTargetStop.queueOrder}: {nextTargetStop.patientName}
                        </div>

                        <div className="text-xs text-teal-200 font-semibold">
                          🏡 หมู่ที่ {nextTargetStop.moo} {nextTargetStop.village} • บ้านเลขที่ {nextTargetStop.address}
                        </div>

                        {/* Prominent Landmark Badge */}
                        <div className="p-2 rounded-xl bg-amber-400/15 border border-amber-400/50 text-amber-300 text-xs font-extrabold flex items-start gap-1.5">
                          <span className="shrink-0">📍 จุดอ้างอิงใกล้เคียง:</span>
                          <span className="text-white">
                            {nextTargetStop.landmark
                              ? nextTargetStop.landmark
                              : `พื้นที่หมู่ที่ ${nextTargetStop.moo} ${nextTargetStop.village}`}
                          </span>
                        </div>

                        {/* Prominent Supplies Badge */}
                        <div className="p-2 rounded-xl bg-sky-950/80 border border-sky-700/60 text-sky-200 text-xs font-bold flex items-start gap-1.5">
                          <span className="shrink-0 text-sky-400">📦 สิ่งของที่แจก:</span>
                          <span className="text-white">{nextTargetStop.itemsSummary}</span>
                        </div>

                        {myGps?.distToNextKm !== undefined && (
                          <div className="text-xs font-black text-sky-300 pt-0.5">
                            🛣️ ห่างจากคุณตอนนี้: {myGps.distToNextKm} กม. (~{myGps.durToNextMin} นาที)
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="py-8 text-center text-xs text-slate-400">
                        บ้านปัจจุบันเป็นคิวสุดท้ายของรอบนี้แล้ว
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={!nextTargetStop}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!nextTargetStop) return;
                      const origin = myGps ? `&origin=${myGps.lat},${myGps.lng}` : '';
                      window.open(
                        `https://www.google.com/maps/dir/?api=1${origin}&destination=${nextTargetStop.lat},${nextTargetStop.lng}&travelmode=driving`,
                        '_blank'
                      );
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-98"
                  >
                    <Navigation className="w-4 h-4 shrink-0" />
                    <span>
                      {nextTargetStop
                        ? `⏭️ ไปไม่ทัน? กดนำทางลัดไปดักรอบ้านถัดไป (#${nextTargetStop.queueOrder})`
                        : 'ไม่มีบ้านถัดไป'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Helper GPS Button for Follower OR Officer Control Bar */}
              {roleMode === 'follower' ? (
                <div className="flex items-center justify-between gap-2 bg-slate-950/70 border border-slate-800 rounded-2xl p-2.5 flex-wrap">
                  <span className="text-xs text-slate-300">
                    💡 อยากรู้ว่าคุณอยู่ห่างจากขบวนกี่กิโลเมตร/กี่นาที?
                  </span>
                  <button
                    type="button"
                    disabled={isLocatingMyGps}
                    onClick={handleLocateMyGps}
                    className="py-2 px-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                  >
                    <Crosshair className={`w-3.5 h-3.5 shrink-0 ${isLocatingMyGps ? 'animate-spin' : ''}`} />
                    <span>{isLocatingMyGps ? 'กำลังคำนวณระยะห่าง...' : '📍 เช็คระยะห่างจากจุดที่ฉันยืนอยู่'}</span>
                  </button>
                </div>
              ) : (
                /* Lead Vehicle / Officer Mode Buttons (Only visible when unlocked via Officer PIN!) */
                <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 space-y-2">
                  <div className="text-xs font-extrabold text-emerald-300 flex items-center justify-between">
                    <span>🛠️ แผงควบคุมสำหรับเจ้าหน้าที่รถขนของ (เมื่อส่งมอบของถึงมือผู้ป่วยแล้ว):</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setReceiverName(currentTargetStop.caregiverName || 'ญาติผู้ดูแลผู้ป่วย');
                        setHandoverModalStop(currentTargetStop);
                      }}
                      className="py-3 px-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all ring-2 ring-emerald-300"
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>✅ บันทึกส่งมอบสำเร็จ & เลื่อนไปบ้านถัดไป</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleLeadGpsBroadcast}
                      className={`py-3 px-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all ${
                        isSharingLeadGps
                          ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                          : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-600'
                      }`}
                    >
                      <Compass className="w-4 h-4 shrink-0" />
                      <span>
                        {isSharingLeadGps ? 'กำลังแชร์พิกัดรถหลักสด...' : '🛰️ แชร์พิกัด GPS รถคันหลัก'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 text-center space-y-2">
              <div className="text-3xl">🎉</div>
              <div className="font-black text-base text-emerald-300">
                ส่งมอบพัสดุครบทุกบ้านในรอบนี้เรียบร้อยแล้ว ({deliveredStops.length} บ้าน)!
              </div>
              <p className="text-xs text-teal-200">
                สามารถตรวจสอบรายชื่อที่ส่งมอบแล้วได้ที่รายการด้านล่าง
              </p>
            </div>
          )}
        </div>

        {/* Real Road Satellite Map Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-3 sm:p-4 shadow-lg space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-extrabold text-xs sm:text-sm text-white">
                แผนที่เส้นทางถนนจริง & พิกัดขบวน ({allConvoyStops.length} บ้าน)
              </span>
              {isCalculatingRoad && (
                <span className="text-[10px] text-sky-300 animate-pulse font-bold">
                  กำลังวาดถนนจริง...
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => window.open(getMultiStopGoogleMapsUrl(), '_blank')}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <Navigation className="w-3 h-3" />
                <span>เปิด Google Maps รวมทุกจุด</span>
              </button>
              <button
                type="button"
                onClick={() => setIsMapExpanded((p) => !p)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] flex items-center gap-1 cursor-pointer border border-slate-700"
              >
                {isMapExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                <span>{isMapExpanded ? 'ย่อแผนที่' : 'ขยายแผนที่'}</span>
              </button>
            </div>
          </div>

          <div
            className={`w-full rounded-2xl overflow-hidden border border-slate-700 relative bg-slate-800 transition-all ${
              isMapExpanded ? 'h-[480px] sm:h-[580px]' : 'h-[290px] sm:h-[360px]'
            }`}
          >
            <div ref={mapContainerRef} className="w-full h-full" />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 flex-wrap gap-2 px-1">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" />
                <span>แดง: บ้านเป้าหมายปัจจุบัน</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                <span>ส้ม: บ้านถัดไป</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                <span>เขียว: ส่งแล้ว</span>
              </span>
            </div>
            <span>แตะที่หมุดเพื่อดูข้อมูลหรือนำทางรายบ้าน</span>
          </div>
        </div>

        {/* Full Ordered Queue List */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-3.5 sm:p-4 shadow-lg space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-800 pb-2.5">
            <h2 className="font-black text-sm text-white flex items-center gap-1.5">
              <Users className="w-4 h-4 text-teal-400" />
              <span>ลำดับคิวบ้านผู้รับพัสดุในรอบนี้</span>
            </h2>

            {/* Filter Tabs */}
            <div className="inline-flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-extrabold">
              <button
                type="button"
                onClick={() => setQueueFilterTab('pending')}
                className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all ${
                  queueFilterTab === 'pending'
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ⏳ รอส่ง ({pendingStops.length})
              </button>
              <button
                type="button"
                onClick={() => setQueueFilterTab('delivered')}
                className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all ${
                  queueFilterTab === 'delivered'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ✅ ส่งแล้ว ({deliveredStops.length})
              </button>
              <button
                type="button"
                onClick={() => setQueueFilterTab('all')}
                className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all ${
                  queueFilterTab === 'all'
                    ? 'bg-teal-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ทั้งหมด ({allConvoyStops.length})
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {displayedQueueList.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                ไม่มีรายการในหมวดหมู่นี้
              </div>
            ) : (
              displayedQueueList.map((stop) => {
                const deliv = getStopDeliveryInfo(stop.patientId);
                const isTarget = currentTargetStop?.patientId === stop.patientId;
                const isNext = nextTargetStop?.patientId === stop.patientId;
                const pendingIdx = pendingStops.findIndex((s) => s.patientId === stop.patientId);
                const legInfo = pendingIdx >= 0 ? roadRouteMetrics?.legMetrics?.[pendingIdx] : undefined;

                return (
                  <div
                    key={stop.patientId}
                    onClick={() => focusStopOnMap(stop)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                      deliv.isDelivered
                        ? 'bg-emerald-950/25 border-emerald-700/40'
                        : isTarget
                        ? 'bg-teal-950/80 border-2 border-emerald-400 shadow-md'
                        : isNext
                        ? 'bg-slate-950/90 border border-amber-400/60'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span
                          className={`px-2.5 py-1 rounded-xl font-black text-xs shrink-0 ${
                            deliv.isDelivered
                              ? 'bg-emerald-600 text-white'
                              : isTarget
                              ? 'bg-emerald-400 text-slate-950'
                              : isNext
                              ? 'bg-amber-400 text-slate-950'
                              : 'bg-slate-800 text-teal-300'
                          }`}
                        >
                          คิว #{stop.queueOrder}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-sm text-white">
                              {stop.patientName}
                            </span>
                            {isTarget && !deliv.isDelivered && (
                              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-black text-[10px]">
                                🎯 เป้าหมายปัจจุบัน
                              </span>
                            )}
                            {isNext && !deliv.isDelivered && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 font-black text-[10px]">
                                ⏭️ บ้านถัดไป
                              </span>
                            )}
                            {deliv.isDelivered && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black text-[10px]">
                                ✅ ส่งมอบแล้ว ({deliv.deliveredAt})
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-300 mt-0.5">
                            🏡 หมู่ที่ {stop.moo} {stop.village} • บ้านเลขที่ {stop.address}
                          </div>
                          <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-400/15 border border-amber-400/40 text-[11px] text-amber-300 font-bold">
                            <span>📍 จุดอ้างอิงใกล้เคียง:</span>
                            <span className="text-white">
                              {stop.landmark || `หมู่ที่ ${stop.moo} ${stop.village}`}
                            </span>
                          </div>
                          {legInfo && !deliv.isDelivered && (
                            <div className="text-[11px] text-sky-300 font-bold mt-1">
                              🛣️ ระยะทางจากจุดก่อนหน้า: {legInfo.distanceKm} กม. (~{legInfo.durationMin} นาที)
                            </div>
                          )}
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold shrink-0 ${
                          stop.adlCategory === 'ติดเตียง'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {stop.adlCategory}
                      </span>
                    </div>

                    <div className="text-xs bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 text-teal-200 font-semibold">
                      <span className="text-emerald-400 font-extrabold mr-1">📦 สิ่งของที่แจก:</span>
                      <span className="text-white">{stop.itemsSummary}</span>
                    </div>

                    {/* Action Row per Stop: Strict Role Separation! Followers ONLY get Navigation & Phone (cannot accidentally click Deliver or Change Target!) */}
                    <div
                      className="flex items-center justify-between gap-2 pt-1 flex-wrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-1.5">
                        {stop.phone && stop.phone !== '-' && (
                          <a
                            href={`tel:${stop.phone}`}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-200 font-bold text-xs flex items-center gap-1 border border-slate-700"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>โทร {stop.phone}</span>
                          </a>
                        )}
                        {roleMode === 'lead' && !deliv.isDelivered && !isTarget && (
                          <button
                            type="button"
                            onClick={() => handleSelectTargetStop(stop)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs cursor-pointer border border-slate-700"
                          >
                            🎯 ตั้งเป็นเป้าหมายตอนนี้
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const origin = myGps ? `&origin=${myGps.lat},${myGps.lng}` : '';
                            window.open(
                              `https://www.google.com/maps/dir/?api=1${origin}&destination=${stop.lat},${stop.lng}&travelmode=driving`,
                              '_blank'
                            );
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>นำทาง Google Maps</span>
                        </button>

                        {roleMode === 'lead' && (
                          !deliv.isDelivered ? (
                            <button
                              type="button"
                              onClick={() => {
                                setReceiverName(stop.caregiverName || 'ญาติผู้ดูแลผู้ป่วย');
                                setHandoverModalStop(stop);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1 cursor-pointer shadow-xs"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>ส่งมอบแล้ว</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRevertStopDelivery(stop)}
                              className="px-2.5 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700/50 font-bold text-xs cursor-pointer"
                            >
                              ↩️ ยกเลิก
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal: Officer PIN Verification to Unlock Lead Vehicle Controls */}
      {isStaffPinModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-teal-700 rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-black text-amber-400">
                  🔒 ยืนยันสิทธิ์เจ้าหน้าที่ประจำรถขนของ
                </span>
                <h3 className="font-black text-base text-white mt-0.5">
                  เข้าสู่โหมดควบคุมขบวน & บันทึกส่งของ
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsStaffPinModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              เพื่อป้องกันไม่ให้คณะผู้ติดตามเผลอกดปุ่มส่งมอบของหรือเปลี่ยนคิวโดยไม่ตั้งใจ กรุณากรอกรหัสเจ้าหน้าที่ประจำรถขนของ (รหัสมาตรฐาน: <strong className="text-amber-300">2569</strong>)
            </p>

            <div className="space-y-2">
              <input
                type="password"
                inputMode="numeric"
                value={staffPinInput}
                onChange={(e) => {
                  setStaffPinInput(e.target.value);
                  setStaffPinError('');
                }}
                placeholder="กรอกรหัสเจ้าหน้าที่ 4 หลัก (เช่น 2569)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-black text-center text-base tracking-widest outline-none focus:border-emerald-400"
              />
              {staffPinError && (
                <div className="text-xs text-rose-400 font-bold text-center">{staffPinError}</div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsStaffPinModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  if (staffPinInput.trim() === '2569' || staffPinInput.trim() === '1234') {
                    setRoleMode('lead');
                    setIsStaffPinModalOpen(false);
                    showToast('🔓 ปลดล็อกโหมดเจ้าหน้าที่รถขนของเรียบร้อยแล้ว');
                  } else {
                    setStaffPinError('รหัสไม่ถูกต้อง (รหัสเจ้าหน้าที่คือ 2569)');
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer shadow-md"
              >
                🔓 ยืนยันเข้าโหมดรถส่งของ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Handover Confirmation */}
      {handoverModalStop && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-teal-700 rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-black text-emerald-400">
                  ยืนยันการส่งมอบพัสดุ • คิวที่ #{handoverModalStop.queueOrder}
                </span>
                <h3 className="font-black text-base text-white mt-0.5">
                  {handoverModalStop.patientName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setHandoverModalStop(null)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1">
              <div className="text-slate-300">
                📍 หมู่ที่ {handoverModalStop.moo} {handoverModalStop.village} • {handoverModalStop.address}
              </div>
              <div className="text-emerald-300 font-bold">
                📦 {handoverModalStop.itemsSummary}
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">ชื่อผู้รับมอบของ:</label>
                <input
                  type="text"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold"
                  placeholder="ระบุชื่อผู้รับมอบ / ญาติ"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">ความสัมพันธ์:</label>
                <select
                  value={receiverRelation}
                  onChange={(e) => setReceiverRelation(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold"
                >
                  <option value="ผู้ป่วยรับด้วยตนเอง">ผู้ป่วยรับด้วยตนเอง</option>
                  <option value="ญาติผู้ดูแล">ญาติผู้ดูแล</option>
                  <option value="บุตร/หลาน">บุตร / หลาน</option>
                  <option value="CG / อสม. ประจำหมู่บ้าน">CG / อสม. ประจำหมู่บ้าน</option>
                  <option value="ผู้นำชุมชนรับแทน">ผู้นำชุมชน / ผู้ใหญ่บ้านรับแทน</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">หมายเหตุเพิ่มเติม (ถ้ามี):</label>
                <input
                  type="text"
                  value={handoverNote}
                  onChange={(e) => setHandoverNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  placeholder="เช่น มอบครบถ้วน ผู้ป่วยอาการดี"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setHandoverModalStop(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmHandover}
                className="flex-2 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm cursor-pointer shadow-md"
              >
                ✅ ยืนยันส่งมอบ & ไปบ้านถัดไป ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Share Link & QR Code */}
      {isShareQrOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white text-slate-900 rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-base text-slate-900">
                  📲 แชร์ลิงก์แอปติดตามขบวนแจกของ (รอบที่ {activeRound})
                </h3>
                <p className="text-xs text-slate-500">
                  ส่งเข้ากลุ่ม LINE ให้ผู้บริหารและคณะผู้ติดตามเปิดดูสดโดยไม่ต้องล็อกอิน
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsShareQrOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  shareableConvoyUrl
                )}`}
                alt="QR Code ติดตามขบวน"
                className="w-40 h-40 object-contain bg-white p-2 rounded-xl border border-slate-200"
              />
              <span className="text-[11px] font-bold text-slate-600 mt-2 text-center">
                สแกน QR Code นี้ด้วยกล้องมือถือหรือ LINE เพื่อเปิดหน้าติดตามขบวนทันที
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">ลิงก์สำหรับแชร์รอบนี้:</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={shareableConvoyUrl}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-100 border border-slate-300 text-xs font-mono text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(shareableConvoyUrl);
                    showToast('✅ คัดลอกลิงก์เรียบร้อยแล้ว!');
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer"
                >
                  คัดลอก
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleShareToLine}
                className="py-2.5 px-4 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <ExternalLink className="w-4 h-4" />
                <span>💬 ส่งเข้ากลุ่ม LINE ทันที</span>
              </button>
              <button
                type="button"
                onClick={() => setIsShareQrOpen(false)}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
