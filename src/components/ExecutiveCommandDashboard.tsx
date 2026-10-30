import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ClipboardCheck,
  FileCheck2,
  HeartPulse,
  Stethoscope,
  MessageSquareWarning,
  Truck,
  Printer,
  TrendingUp,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Activity,
  Layers,
  Award,
  Calendar,
  AlertCircle,
  MapPin,
  ChevronRight,
  Eye,
  X,
  Wind,
  ThermometerSun,
  Maximize2,
  HeartHandshake,
  UtensilsCrossed,
  Shield,
  Package,
  Settings,
  Share2,
  Globe,
  Copy,
  Check,
  ExternalLink,
  Bell,
  Send,
  Mail,
  Paperclip,
  Megaphone,
  FileText,
  Plus,
} from 'lucide-react';
import { GoogleCalendarModal } from './GoogleCalendarModal.tsx';
import { CitizenPortalShareModal } from './CitizenPortalShareModal.tsx';
import { ActivityAnnouncementModal } from './ActivityAnnouncementModal.tsx';
import { AttachmentViewerModal } from './AttachmentViewerModal.tsx';
import {
  MunicipalCalendarPanel,
  CalendarEventItem,
  INITIAL_CALENDAR_EVENTS,
  CalendarAttachment,
  ACTIVITY_DOC_TYPES,
  getEventDisplayStatus,
} from './MunicipalCalendarPanel.tsx';
import {
  saveToFirestore,
  deleteFromFirestore,
  subscribeCollection,
  COLLECTIONS,
} from '../services/firebaseService.ts';
import {
  buildCalendarNotificationPayload,
  dispatchNotification,
  openAttachmentPrintableHtml,
} from '../services/notificationService.ts';
import {
  formatRelativeThai,
  parseFlexibleDate,
  formatFileSize,
  toLocalDateStr,
} from '../utils/dateUtils.ts';
import {
  Establishment,
  HazardousBusiness,
  InspectionRecord,
  LicenseRecord,
  LtcPatient,
  MedicalEquipment,
  EquipmentLoan,
  NhsoProject,
  PublicPetition,
  MainNavTab,
} from '../types/index.ts';

interface ExecutiveCommandDashboardProps {
  establishments: Establishment[];
  licenses: LicenseRecord[];
  hazardousBusinesses: HazardousBusiness[];
  petitions: PublicPetition[];
  nhsoProjects: NhsoProject[];
  ltcPatients: LtcPatient[];
  equipmentList: MedicalEquipment[];
  loans: EquipmentLoan[];
  inspections: InspectionRecord[];
  onNavigateTab: (tab: MainNavTab, subTab?: string) => void;
  onOpenPrintModal: (petition?: PublicPetition) => void;
  onOpenCitizenShareModal?: () => void;
  onShowToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const ExecutiveCommandDashboard: React.FC<ExecutiveCommandDashboardProps> = ({
  establishments = [],
  licenses = [],
  hazardousBusinesses = [],
  petitions = [],
  nhsoProjects = [],
  ltcPatients = [],
  equipmentList = [],
  loans = [],
  inspections = [],
  onNavigateTab,
  onOpenPrintModal,
  onOpenCitizenShareModal,
  onShowToast,
}) => {
  // 1. KPI Calculations
  const pendingPetitions = petitions.filter((p) => p.status !== 'resolved');
  const sewagePetitions = petitions.filter(
    (p) => p.category === 'waste_sewage' || p.title.includes('สิ่งปฏิกูล') || p.title.includes('ส้วม')
  );
  const pendingSewage = sewagePetitions.filter((p) => p.status !== 'resolved').length;

  const expiredLicenses = licenses.filter(
    (l) => l.status === 'expired' || (l.remainingDays !== undefined && l.remainingDays <= 0)
  ).length;
  const expiringLicenses = licenses.filter(
    (l) => l.status === 'expiring' || (l.remainingDays !== undefined && l.remainingDays > 0 && l.remainingDays <= 30)
  ).length;
  const normalLicenses = licenses.filter(
    (l) => l.status === 'normal' && (l.remainingDays === undefined || l.remainingDays > 30)
  ).length;

  const ltcDeliveredCount = ltcPatients.filter((p) => p.receivedCarePack).length;
  const ltcPercentage = ltcPatients.length > 0 ? Math.round((ltcDeliveredCount / ltcPatients.length) * 100) : 0;

  const activeLoans = loans.filter((l) => l.status === 'borrowed').length;
  const totalEquipmentUnits = equipmentList.reduce((acc, eq) => acc + (eq.totalQuantity || 0), 0) || 86;
  const availableEquipmentUnits = equipmentList.reduce((acc, eq) => acc + (eq.availableQuantity || 0), 0) || 26;
  const inUseEquipmentUnits = equipmentList.reduce((acc, eq) => acc + (eq.inUseQuantity || 0), 0) || 58;

  // 2. Ratings breakdown calculated dynamically from establishments / inspections
  const totalEstablishmentsCount = establishments.length || 36;
  const ratingCounts = (() => {
    let excellent = 0;
    let good = 0;
    let fair = 0;
    let reinspect = 0;

    establishments.forEach((est) => {
      const score = est.latestScore;
      const rating = est.latestRating;
      if (est.status === 'needs_reinspection' || est.status === 'failed' || (score !== undefined && score < 60)) {
        reinspect++;
      } else if (rating === 'excellent' || (score !== undefined && score >= 85)) {
        excellent++;
      } else if (rating === 'good' || (score !== undefined && score >= 70)) {
        good++;
      } else if (rating === 'fair' || (score !== undefined && score >= 60)) {
        fair++;
      } else {
        if (est.status === 'passed') good++;
        else fair++;
      }
    });

    if (excellent + good + fair + reinspect === 0) {
      return { excellent: 11, good: 18, fair: 5, reinspect: 2 };
    }
    return { excellent, good, fair, reinspect };
  })();

  const passingRatePercent = totalEstablishmentsCount > 0
    ? Math.round(((totalEstablishmentsCount - ratingCounts.reinspect) / totalEstablishmentsCount) * 100)
    : 94;

  const [isArtworkModalOpen, setIsArtworkModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isCitizenShareModalOpen, setIsCitizenShareModalOpen] = useState(false);
  const [isCopiedDirectLink, setIsCopiedDirectLink] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Activity Announcement & Attachment Viewer Modals State
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [activityEditingEvent, setActivityEditingEvent] = useState<CalendarEventItem | null>(null);
  const [activityPresetDate, setActivityPresetDate] = useState<string | undefined>(undefined);
  const [isViewerModalOpen, setIsViewerModalOpen] = useState(false);
  const [viewerAttachment, setViewerAttachment] = useState<CalendarAttachment | null>(null);
  const [viewerLinkedEvent, setViewerLinkedEvent] = useState<CalendarEventItem | null>(null);

  // Shared Calendar Events State
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventItem[]>(() => {
    try {
      const stored = localStorage.getItem('bangpao_calendar_events_v2');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse local calendar events', e);
    }
    return INITIAL_CALENDAR_EVENTS;
  });

  // Real-time Firestore synchronization for Calendar Events & Announcements
  useEffect(() => {
    const unsub = subscribeCollection<CalendarEventItem>(COLLECTIONS.CALENDAR_EVENTS, (remoteItems) => {
      if (remoteItems && Array.isArray(remoteItems)) {
        setCalendarEvents((prev) => {
          const map = new Map<string, CalendarEventItem>();
          prev.forEach((e) => map.set(e.id, e));
          remoteItems.forEach((e) => map.set(e.id, e));
          const merged = Array.from(map.values());
          try {
            localStorage.setItem('bangpao_calendar_events_v2', JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
    });
    return () => unsub();
  }, []);

  // 3. Dynamic Activity Feed / Audit Log generated from real events & records
  interface AuditActivityItem {
    id: string;
    title: string;
    detail: string;
    time: string;
    timestamp: number;
    type: 'petition' | 'inspection' | 'license' | 'ltc' | 'equipment' | 'activity';
    icon: any;
    color: string;
    actionTab?: MainNavTab;
  }

  const activities: AuditActivityItem[] = (() => {
    const list: AuditActivityItem[] = [];

    // A. Real Petitions
    petitions.forEach((p) => {
      const dt = parseFlexibleDate(p.createdAt || p.submissionDate) || new Date();
      const isSewage = p.category === 'waste_sewage' || p.title.includes('สิ่งปฏิกูล') || p.title.includes('ส้วม');
      const statusLabel = p.status === 'resolved' ? 'ดำเนินการแล้ว' : p.status === 'assigned' ? 'จ่ายงานแล้ว' : 'รอดำเนินการ';
      list.push({
        id: `pet-${p.id}`,
        title: isSewage ? `คำร้องสูบสิ่งปฏิกูล (${statusLabel})` : `คำร้อง: ${p.title} (${statusLabel})`,
        detail: `${p.trackingCode || p.id} • ${p.address || 'ต.บางเป้า'} (${p.citizenName || 'ประชาชน'})`,
        time: formatRelativeThai(dt),
        timestamp: dt.getTime(),
        type: 'petition',
        icon: isSewage ? Truck : MessageSquareWarning,
        color: isSewage ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800',
        actionTab: 'petitions',
      });
    });

    // B. Real Inspections
    inspections.forEach((ins) => {
      const dt = parseFlexibleDate(ins.createdAt || ins.inspectionDate) || new Date();
      const statusText = ins.status === 'passed' ? 'ผ่านเกณฑ์' : 'ต้องตรวจซ้ำ';
      list.push({
        id: `ins-${ins.id}`,
        title: `ตรวจสุขลักษณะ ${ins.establishmentName} (${statusText} ${ins.totalScore}%)`,
        detail: `${ins.establishmentType || 'สถานประกอบการ'} • ผู้ตรวจ: ${ins.inspectorName || 'เจ้าพนักงานสาธารณสุข'}`,
        time: formatRelativeThai(dt),
        timestamp: dt.getTime(),
        type: 'inspection',
        icon: ClipboardCheck,
        color: ins.status === 'passed' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800',
        actionTab: 'hazardous',
      });
    });

    // C. Real Equipment Loans
    loans.forEach((l) => {
      const dt = parseFlexibleDate(l.createdAt || l.loanDate) || new Date();
      const isReturned = l.status === 'returned';
      list.push({
        id: `loan-${l.id}`,
        title: isReturned ? `ส่งคืนอุปกรณ์การแพทย์ (${l.equipmentName})` : `ทำสัญญายืมอุปกรณ์ (${l.equipmentName})`,
        detail: `${l.loanCode || l.id} • ผู้ยืม: ${l.borrowerName || l.patientName || 'ประชาชน'} (${l.address || 'ต.บางเป้า'})`,
        time: formatRelativeThai(dt),
        timestamp: dt.getTime(),
        type: 'equipment',
        icon: Stethoscope,
        color: isReturned ? 'bg-teal-100 text-teal-800' : 'bg-indigo-100 text-indigo-800',
        actionTab: 'equipment',
      });
    });

    // D. Real License Records
    licenses.forEach((lic) => {
      const dt = parseFlexibleDate(lic.approvalDate || lic.createdAtFormatted) || new Date();
      list.push({
        id: `lic-${lic.id}`,
        title: `ใบอนุญาต อภ.2: ${lic.businessName}`,
        detail: `เลขที่ ${lic.licenseNumber || '-'}/${lic.licenseYear || '2569'} • เจ้าของ: ${lic.ownerName || '-'}`,
        time: formatRelativeThai(dt),
        timestamp: dt.getTime(),
        type: 'license',
        icon: FileCheck2,
        color: 'bg-teal-100 text-teal-800',
        actionTab: 'hazardous',
      });
    });

    // E. Calendar Announcements & Events with attachments
    calendarEvents.forEach((ev) => {
      if (ev.category === 'activity' || (ev.attachments && ev.attachments.length > 0)) {
        const dt = parseFlexibleDate(ev.createdAt || ev.date) || new Date();
        const docInfo = ev.docType ? ACTIVITY_DOC_TYPES[ev.docType] : null;
        list.push({
          id: `cal-${ev.id}`,
          title: `${docInfo ? docInfo.emoji + ' ' : ''}${ev.title}`,
          detail: `${ev.fromAgency ? `จาก: ${ev.fromAgency} • ` : ''}${ev.location || 'ต.บางเป้า'}${ev.attachments?.length ? ` (${ev.attachments.length} ไฟล์แนบ)` : ''}`,
          time: formatRelativeThai(dt),
          timestamp: dt.getTime(),
          type: 'activity',
          icon: Megaphone,
          color: 'bg-violet-100 text-violet-800',
        });
      }
    });

    list.sort((a, b) => b.timestamp - a.timestamp);

    if (list.length === 0) {
      return [
        {
          id: 'fb-1',
          title: 'พร้อมใช้งานระบบบริหารข้อมูลสาธารณสุข',
          detail: 'ข้อมูลจะอัปเดตแบบเรียลไทม์เมื่อมีการยื่นคำร้อง หรือบันทึกภารกิจ',
          time: 'พร้อมใช้งาน',
          timestamp: Date.now(),
          type: 'petition',
          icon: Activity,
          color: 'bg-emerald-100 text-emerald-800',
        },
      ];
    }

    return list.slice(0, 10);
  })();

  const [isNotifyCalendarSending, setIsNotifyCalendarSending] = useState(false);

  const handleAddCalendarEvent = (newEvent: CalendarEventItem) => {
    setCalendarEvents((prev) => [newEvent, ...prev.filter((e) => e.id !== newEvent.id)]);
    saveToFirestore(COLLECTIONS.CALENDAR_EVENTS, newEvent).catch(() => {});

    // Automatically dispatch notification + A4 Schedule Form attachment for the new calendar appointment/plan
    const payload = buildCalendarNotificationPayload(
      [
        {
          id: newEvent.id,
          title: newEvent.title,
          date: newEvent.date,
          endDate: newEvent.endDate,
          startTime: newEvent.startTime,
          endTime: newEvent.endTime,
          time: newEvent.startTime
            ? `${newEvent.startTime} - ${newEvent.endTime || '16:30'} น.`
            : '09:00 - 16:30 น.',
          type: newEvent.category,
          location: newEvent.location,
          assignee: newEvent.responsibleOfficer,
          description: newEvent.details,
          docType: (newEvent as any).docType,
          docNumber: (newEvent as any).docNumber,
          fromAgency: (newEvent as any).fromAgency,
          attachments: (newEvent as any).attachments,
        },
      ],
      newEvent.title
    );
    dispatchNotification(payload).then(() => {
      if (onShowToast) {
        onShowToast('success', `บันทึกนัดหมาย "${newEvent.title}" และส่งแจ้งเตือน LINE & อีเมลพร้อมไฟล์แบบฟอร์มแผนงาน A4 แล้ว`);
      }
    });
  };

  const handleSendDailyScheduleNotification = async (openPrintPreview = false) => {
    setIsNotifyCalendarSending(true);
    try {
      const mapped = calendarEvents.slice(0, 8).map((ev) => ({
        id: ev.id,
        title: ev.title,
        date: ev.date,
        time: `${ev.startTime || '09:00'} - ${ev.endTime || '12:00'} น.`,
        type: ev.category,
        location: ev.location,
        assignee: ev.responsibleOfficer,
        description: ev.details,
      }));
      const payload = buildCalendarNotificationPayload(
        mapped,
        'สรุปกำหนดการนัดหมายและแผนปฏิบัติงาน กองสาธารณสุขและสิ่งแวดล้อม ทต.บางเป้า'
      );
      if (openPrintPreview && payload.attachments[0]) {
        openAttachmentPrintableHtml(payload.attachments[0]);
      }
      await dispatchNotification(payload);
      if (onShowToast) {
        onShowToast('success', 'ส่งแจ้งเตือนตารางนัดหมายและแผนงาน พร้อมแนบไฟล์แบบฟอร์ม A4 เข้า LINE & อีเมลเรียบร้อยแล้ว!');
      } else {
        alert('ส่งแจ้งเตือนตารางนัดหมายและแผนงาน พร้อมแนบไฟล์แบบฟอร์ม A4 เข้า LINE & อีเมลเรียบร้อยแล้ว!');
      }
    } finally {
      setIsNotifyCalendarSending(false);
    }
  };

  const handleUpdateCalendarEvent = (updatedEvent: CalendarEventItem) => {
    setCalendarEvents((prev) => prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e)));
    saveToFirestore(COLLECTIONS.CALENDAR_EVENTS, updatedEvent).catch(() => {});
  };

  const handleDeleteCalendarEvent = (id: string) => {
    setCalendarEvents((prev) => prev.filter((e) => e.id !== id));
    deleteFromFirestore(COLLECTIONS.CALENDAR_EVENTS, id).catch(() => {});
  };

  useEffect(() => {
    try {
      localStorage.setItem('bangpao_calendar_events_v2', JSON.stringify(calendarEvents));
    } catch (e) {
      console.warn('Failed to save calendar events', e);
    }
  }, [calendarEvents]);

  // Support deep-linking to specific calendar event from LINE or URL (?event=... or ?tab=calendar)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const search = new URLSearchParams(window.location.search);
    const eventParam = search.get('event') || search.get('job');
    const isAttachmentParam = search.get('attachment') === 'true';
    const tabParam = search.get('tab');

    if (tabParam === 'calendar' || eventParam) {
      setTimeout(() => {
        const calSec = document.getElementById('calendar-panel-section');
        if (calSec) calSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }

    if (!eventParam) return;

    const cleanParam = eventParam.trim().toLowerCase();
    const matched = calendarEvents.find((ev) => {
      const idMatch = (ev.id || '').toLowerCase() === cleanParam;
      const refMatch = ((ev as any).referenceCode || '').toLowerCase() === cleanParam;
      const titleMatch = cleanParam.length > 5 && (ev.title || '').toLowerCase().includes(cleanParam);
      return idMatch || refMatch || titleMatch;
    });

    if (matched) {
      if (isAttachmentParam && matched.attachments && matched.attachments.length > 0) {
        setViewerAttachment(matched.attachments[0]);
        setViewerLinkedEvent(matched);
        setIsViewerModalOpen(true);
      }
    }
  }, [calendarEvents]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = String(currentTime.getHours()).padStart(2, '0');
  const minutes = String(currentTime.getMinutes()).padStart(2, '0');
  const seconds = String(currentTime.getSeconds()).padStart(2, '0');
  const timeString = `${hours}:${minutes}:${seconds}`;

  const thaiDays = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const dayName = thaiDays[currentTime.getDay()];
  const dateNum = currentTime.getDate();
  const monthName = thaiMonths[currentTime.getMonth()];
  const buddhistYear = currentTime.getFullYear() + 543;
  const thaiDateString = `${dayName}ที่ ${dateNum} ${monthName} ${buddhistYear}`;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ========================================== */}
      {/* HERO COMMAND BANNER (Smart Command HUD) */}
      {/* ========================================== */}
      <div className="relative w-full rounded-[28px] overflow-hidden shadow-2xl border border-emerald-800/40 bg-[#022c22] text-white select-none">
        
        {/* 1. ชั้นภาพกราฟิกพื้นหลังด้านขวา (ใช้ CSS Mask เกลี่ยขอบซ้ายให้เนียนกริบ ไร้รอยต่อเส้นตรง) */}
        <div className="absolute inset-y-0 right-0 w-full lg:w-[62%] overflow-hidden pointer-events-none">
          <div
            className="w-full h-full bg-cover bg-center transition-all duration-500 scale-105"
            style={{
              backgroundImage: "url('/bangpao_health_banner.jpg')",
              maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.2) 18%, rgba(0,0,0,0.85) 45%, black 75%)',
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.2) 18%, rgba(0,0,0,0.85) 45%, black 75%)',
            }}
          />
        </div>

        {/* 2. ชั้น Gradient Overlay เกลี่ยแสงสีเขียวมรกตจากซ้ายไปขวา เพื่อให้อ่านตัวหนังสือชัดเจน 100% และกลมกลืนกับภาพ */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, #022c22 0%, #053b2f 42%, rgba(6, 78, 59, 0.82) 62%, rgba(6, 78, 59, 0.35) 100%)',
          }}
        />

        {/* 3. ชั้นตาราง Cyber Grid และแสง Ambient Glow เพิ่มมิติความล้ำสมัย */}
        <div className="absolute inset-0 bg-cyber-grid pointer-events-none opacity-80" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 left-1/3 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />

        {/* 4. เนื้อหาหลักภายใน Banner (จัดองค์ประกอบใหม่ให้สมส่วน สวยงาม กะทัดรัด และไม่บดบังภาพกราฟิก) */}
        <div className="relative z-10 p-6 sm:p-8 lg:p-9 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          
          {/* ฝั่งซ้าย: ข้อมูลหน่วยงาน (ขยายใหญ่ขึ้นตามข้อ 2), หัวข้อระบบ, HUD แถบนาฬิกาแบบกะทัดรัดสมส่วน และ มิติบริการ 2-7 */}
          <div className="w-full lg:max-w-2xl xl:max-w-[50%] space-y-4 sm:space-y-4.5">
            
            {/* 1. ส่วนภาพ 2: แถบป้ายกำกับหน่วยงานหลัก (จัดให้อยู่กึ่งกลางของข้อมูลรวมตามภาพ 1) */}
            <div className="w-full flex justify-center">
              <div className="inline-flex items-center gap-3.5 sm:gap-4 px-4.5 sm:px-6 py-3 sm:py-3.5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-emerald-950/95 via-teal-950/90 to-emerald-900/95 border-2 border-emerald-400/70 backdrop-blur-md shadow-2xl shadow-emerald-950/80">
                <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full bg-white/20 p-1 sm:p-1.5 flex items-center justify-center shrink-0 border-2 border-emerald-300/60 shadow-lg shadow-emerald-950/60">
                  <img
                    src="/images-Photoroom.png"
                    alt="ตราเทศบาลตำบลบางเป้า"
                    className="w-full h-full object-contain rounded-full"
                    onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                  />
                </div>
                <div className="flex flex-col justify-center">
                  <span className="text-base sm:text-lg lg:text-xl font-black tracking-wide text-white drop-shadow-sm leading-snug">
                    กองสาธารณสุขและสิ่งแวดล้อม เทศบาลตำบลบางเป้า
                  </span>
                  <span className="text-xs sm:text-[13px] text-emerald-300 font-semibold flex items-center gap-2 mt-0.5">
                    <span>อำเภอกันตัง จังหวัดตรัง</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-amber-300 font-bold">ศูนย์บัญชาการข้อมูลและบริการดิจิทัล</span>
                  </span>
                </div>
              </div>
            </div>

            {/* 2. ชื่อระบบและพันธกิจ (จัดกึ่งกลางให้สมส่วนกับข้อมูลรวมตามภาพ 1) */}
            <div className="space-y-2 text-center w-full">
              <h2 className="text-2xl sm:text-3xl lg:text-[34px] font-black tracking-tight text-white leading-tight drop-shadow-sm text-center">
                ศูนย์สั่งการภาพรวมบริหาร
              </h2>
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <p className="text-lg sm:text-xl font-black bg-gradient-to-r from-amber-300 via-yellow-200 to-emerald-300 bg-clip-text text-transparent">
                  Executive Command Center
                </p>
                <span className="hidden sm:inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300/90 bg-emerald-950/70 px-2.5 py-0.5 rounded-md border border-emerald-700/60">
                  <Activity className="w-3 h-3 text-emerald-400" /> บูรณาการ 4 มิติ
                </span>
              </div>
              <p className="text-xs sm:text-[13px] text-emerald-100/90 leading-relaxed font-light text-center max-w-xl mx-auto">
                เทศบาลตำบลบางเป้า อำเภอกันตัง จังหวัดตรัง • บูรณาการระบบสารสนเทศเพื่อการบริหารงานสาธารณสุขครบ 4 มิติ โปร่งใส แม่นยำ และรวดเร็ว เพื่อคุณภาพชีวิตของประชาชน
              </p>
            </div>

            {/* 3. แผงนาฬิกาและสถานะเมืองแบบกะทัดรัด สมส่วน (Sleek Low-Profile HUD Strip - แก้ปัญหากล่องใหญ่เกินไป) */}
            <div className="backdrop-blur-xl bg-emerald-950/85 border border-emerald-400/35 rounded-2xl px-3.5 sm:px-4 py-2 sm:py-2.5 shadow-xl flex flex-wrap items-center justify-between gap-2.5">
              {/* ส่วนนาฬิกา และสถานะ LIVE */}
              <div className="flex items-center gap-2 sm:gap-2.5">
                <span className="relative w-2.5 h-2.5 rounded-full bg-emerald-400 pulse-dot shrink-0" />
                <span className="text-[10px] font-black tracking-wider uppercase text-emerald-300 bg-emerald-900/70 px-2 py-0.5 rounded border border-emerald-500/30 shrink-0">
                  LIVE COMMAND
                </span>
                <div className="flex items-baseline gap-1 font-mono-clock">
                  <span className="text-lg sm:text-xl font-black text-white clock-glow tracking-wider">
                    {timeString}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-300 uppercase">น.</span>
                </div>
              </div>

              {/* วันที่ภาษาไทย (คลิกเปิดปฏิทิน) */}
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('calendar-panel-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                  else setIsCalendarModalOpen(true);
                }}
                className="group inline-flex items-center gap-1.5 text-xs text-emerald-100 hover:text-amber-200 font-medium transition-colors cursor-pointer"
                title="คลิกเพื่อเลื่อนไปดูแผงปฏิทิน (bangpaohealthy@gmail.com)"
              >
                <Calendar className="w-3.5 h-3.5 text-amber-300 group-hover:scale-110 transition-transform shrink-0" />
                <span className="underline decoration-dotted decoration-emerald-400/50 underline-offset-2">
                  {thaiDateString}
                </span>
                <span className="text-[9px] text-amber-300 bg-amber-400/15 px-1.5 py-0.2 rounded border border-amber-400/30 shrink-0">
                  Gmail Sync
                </span>
              </button>

              {/* มินิดัชนีสิ่งแวดล้อม และปุ่ม Google Calendar */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-emerald-900/60 px-2 py-1 rounded-lg border border-emerald-500/25">
                    <Wind className="w-3 h-3 text-emerald-400" />
                    <span>22 AQI</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-emerald-900/60 px-2 py-1 rounded-lg border border-emerald-500/25">
                    <ThermometerSun className="w-3 h-3 text-amber-400" />
                    <span>29.4°C</span>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('calendar-panel-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                    else setIsCalendarModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-200 hover:text-white border border-emerald-400/30 text-[11px] font-semibold transition-all shadow-xs cursor-pointer group"
                  title="เปิดดูแผงปฏิทิน Google Calendar"
                >
                  <Calendar className="w-3 h-3 text-amber-300 group-hover:scale-110 transition-transform" />
                  <span>Google Cal</span>
                </button>
              </div>
            </div>

            {/* 4. หมวดหมู่ระบบงานบริการหลัก (หัวข้อ 1 - 6): จัด 3 คอลัมน์ x 2 บรรทัด สมส่วนพอดีเป๊ะ */}
            <div className="pt-0.5 space-y-2">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>มิติงานบริการหลัก (หัวข้อ 1 - 6):</span>
              </div>

              {/* Grid 3 คอลัมน์ต่อบรรทัด (รวม 2 บรรทัด พอดี 6 หัวข้อ) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-2.5">
                {/* บรรทัด 1 - ข้อ 1 */}
                <button
                  type="button"
                  onClick={() => onNavigateTab('hazardous')}
                  className="group flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-950/85 hover:bg-emerald-900 border border-emerald-500/35 hover:border-emerald-300 backdrop-blur-md text-xs font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 shadow-xs cursor-pointer truncate"
                  title="1. กิจการอันตรายต่อสุขภาพ (ตรวจประเมิน & ออกใบอนุญาต อภ.2)"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 group-hover:scale-125 transition-transform" />
                  <Shield className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                  <span className="truncate">1. กิจการอันตรายต่อสุขภาพ</span>
                </button>

                {/* บรรทัด 1 - ข้อ 2 */}
                <button
                  type="button"
                  onClick={() => onNavigateTab('nhso_ltc')}
                  className="group flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-950/85 hover:bg-emerald-900 border border-emerald-500/35 hover:border-rose-400 backdrop-blur-md text-xs font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 shadow-xs cursor-pointer truncate"
                  title="2. ระบบแจกจ่าย สปสช. & LTC (ดูแลระยะยาว & ติดตามพิกัด)"
                >
                  <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0 group-hover:scale-125 transition-transform" />
                  <Package className="w-3.5 h-3.5 text-rose-300 shrink-0" />
                  <span className="truncate">2. ระบบแจกจ่าย สปสช. & LTC</span>
                </button>

                {/* บรรทัด 1 - ข้อ 3 */}
                <button
                  type="button"
                  onClick={() => onNavigateTab('equipment')}
                  className="group flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-950/85 hover:bg-emerald-900 border border-emerald-500/35 hover:border-indigo-400 backdrop-blur-md text-xs font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 shadow-xs cursor-pointer truncate"
                  title="3. ระบบบริการยืม-คืนอุปกรณ์ (อุปกรณ์ทางการแพทย์ & สัญญาขอยืม)"
                >
                  <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0 group-hover:scale-125 transition-transform" />
                  <Stethoscope className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                  <span className="truncate">3. ระบบบริการยืม-คืนอุปกรณ์</span>
                </button>

                {/* บรรทัด 2 - ข้อ 4 */}
                <button
                  type="button"
                  onClick={() => onNavigateTab('petitions')}
                  className="group flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-950/85 hover:bg-emerald-900 border border-emerald-500/35 hover:border-amber-400 backdrop-blur-md text-xs font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 shadow-xs cursor-pointer truncate"
                  title="4. ระบบยื่นคำร้อง & บริการประชาชน (เหตุรำคาญ & สูบสิ่งปฏิกูล ทต.บางเป้า)"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 group-hover:scale-125 transition-transform" />
                  <MessageSquareWarning className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span className="truncate">4. ระบบยื่นคำร้อง & บริการ</span>
                </button>

                {/* บรรทัด 2 - ข้อ 5 */}
                <button
                  type="button"
                  onClick={() => onNavigateTab('nhso')}
                  className="group flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-950/85 hover:bg-emerald-900 border border-emerald-500/35 hover:border-sky-400 backdrop-blur-md text-xs font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 shadow-xs cursor-pointer truncate"
                  title="5. โครงการ สปสช. (กองทุน) (เอกสารแนบ 6 & มติคณะกรรมการ กปท.)"
                >
                  <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0 group-hover:scale-125 transition-transform" />
                  <Building2 className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                  <span className="truncate">5. โครงการ สปสช. (กองทุน)</span>
                </button>

                {/* บรรทัด 2 - ข้อ 6 */}
                <button
                  type="button"
                  onClick={() => onNavigateTab('settings')}
                  className="group flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-950/85 hover:bg-emerald-900 border border-emerald-500/35 hover:border-purple-400 backdrop-blur-md text-xs font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 shadow-xs cursor-pointer truncate"
                  title="6. ระบบตั้งค่าผู้ใช้งานทุกระบบ (ผู้ลงนาม, สิทธิ์, ผังอนุมัติ & Cloud)"
                >
                  <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0 group-hover:scale-125 transition-transform" />
                  <Settings className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                  <span className="truncate">6. ระบบตั้งค่าผู้ใช้งาน</span>
                </button>
              </div>
            </div>
          </div>

          {/* ฝั่งขวา: พื้นที่เปิดโล่งโชว์ภาพวิสัยทัศน์งานสาธารณสุขและสิ่งแวดล้อมอย่างสง่างาม พร้อมปุ่มดูภาพเต็ม */}
          <div className="w-full lg:w-auto flex flex-col items-start lg:items-end justify-between self-stretch gap-4 ml-auto pt-2 lg:pt-0">
            {/* ป้ายวิสัยทัศน์ลอยตัวด้านบนขวา */}
            <div className="hidden lg:inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-950/70 border border-emerald-400/30 backdrop-blur-md text-xs font-semibold text-emerald-200 shadow-xl">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>เมืองน่าอยู่ ชุมชนสุขภาพดี ทต.บางเป้า</span>
            </div>

            {/* ปุ่มกดดูภาพขนาดใหญ่ด้านล่างขวา & ปุ่มแชร์พอร์ทัลประชาชน */}
            <div className="flex flex-wrap items-center gap-2 mt-auto">
              <button
                type="button"
                onClick={() => (onOpenCitizenShareModal ? onOpenCitizenShareModal() : setIsCitizenShareModalOpen(true))}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-emerald-400 hover:from-amber-300 hover:to-emerald-300 text-slate-950 font-black text-xs transition-all shadow-xl hover:scale-105 cursor-pointer ring-2 ring-amber-300/80 animate-pulse"
                title="แชร์ลิงก์ศูนย์บริการประชาชนออนไลน์ (Citizen Portal) และ QR Code"
              >
                <Share2 className="w-4 h-4 text-slate-950" />
                <span>แชร์พอร์ทัลประชาชน</span>
              </button>

              <button
                type="button"
                onClick={() => setIsArtworkModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-400/40 backdrop-blur-md text-xs font-bold text-white transition-all shadow-xl hover:scale-105 cursor-pointer"
                title="คลิกเพื่อดูภาพวิสัยทัศน์งานสาธารณสุขและสิ่งแวดล้อมขนาดใหญ่"
              >
                <Maximize2 className="w-3.5 h-3.5 text-amber-300" />
                <span>ดูภาพวิสัยทัศน์เต็ม</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* CITIZEN PORTAL SHARE & ACCESS BANNER (เด่นชัด แดชบอร์ดหลัก) */}
      {/* ======================================================== */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 border-2 border-emerald-400/50 p-4 sm:p-5.5 text-white shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Left Info */}
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-300 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-emerald-500/30 shrink-0">
              <Globe className="w-7 h-7 text-slate-950" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-400/20 text-emerald-300 border border-emerald-400/40">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>พอร์ทัลบริการประชาชนออนไลน์ (Citizen Portal)</span>
                </span>
                <span className="text-[11px] text-emerald-200/80 font-medium hidden sm:inline">
                  ไม่ต้องล็อกอิน • ประชาชนยื่นเรื่องและปักหมุดบ้านได้เอง 24 ชม.
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white mt-1">
                ลิงก์สำหรับแชร์ให้ประชาชนยื่นคำร้อง & ขอยืมอุปกรณ์ทางการแพทย์
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-emerald-300 font-mono bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-700/60 select-all font-semibold">
                  https://bangpao-app.vercel.app/?portal=citizen
                </span>
              </div>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText('https://bangpao-app.vercel.app/?portal=citizen');
                setIsCopiedDirectLink(true);
                setTimeout(() => setIsCopiedDirectLink(false), 2500);
              }}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              {isCopiedDirectLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">คัดลอกลิงก์แล้ว!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>คัดลอกลิงก์</span>
                </>
              )}
            </button>

            <a
              href="https://bangpao-app.vercel.app/?portal=citizen"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-teal-800/80 hover:bg-teal-700 border border-teal-500/40 text-teal-100 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>เปิดดูมุมมองประชาชน</span>
            </a>

            <button
              type="button"
              onClick={() => (onOpenCitizenShareModal ? onOpenCitizenShareModal() : setIsCitizenShareModalOpen(true))}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-emerald-400 hover:from-amber-300 hover:to-emerald-300 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer transition-all hover:scale-105 active:scale-95 ring-2 ring-amber-300/80"
            >
              <Share2 className="w-4 h-4 text-slate-950" />
              <span>📱 แชร์ลิงก์ & QR Code ให้ประชาชน</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Hero KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* KPI 1: คำร้องรอดำเนินการ */}
        <div
          onClick={() => onNavigateTab('petitions')}
          className="bg-gradient-to-br from-white via-white to-amber-50/40 rounded-2xl p-5 sm:p-6 border-l-4 border-l-amber-500 border border-slate-200/90 shadow-xs hover:shadow-lg transition-all cursor-pointer group hover:border-amber-400 relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-xs sm:text-[13px] font-bold text-slate-600 uppercase tracking-wide">
              คำร้องบริการประชาชน
            </span>
            <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
              <MessageSquareWarning className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              {pendingPetitions.length}
            </span>
            <span className="text-xs sm:text-[13px] text-amber-700 font-bold bg-amber-100/90 px-2.5 py-0.5 rounded-full">
              รอดำเนินการ
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs sm:text-[13px] text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-amber-600" /> รอสูบส้วม: <strong className="text-slate-800 font-bold">{pendingSewage}</strong>
            </span>
            <span className="text-amber-700 font-bold group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
              จัดการ <ChevronRight className="w-4 h-4" />
            </span>
          </div>
        </div>

        {/* KPI 2: ใบอนุญาตสถานประกอบกิจการ */}
        <div
          onClick={() => onNavigateTab('dashboard')}
          className="bg-gradient-to-br from-white via-white to-emerald-50/40 rounded-2xl p-5 sm:p-6 border-l-4 border-l-emerald-500 border border-slate-200/90 shadow-xs hover:shadow-lg transition-all cursor-pointer group hover:border-emerald-400 relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-xs sm:text-[13px] font-bold text-slate-600 uppercase tracking-wide">
              ใบอนุญาตสถานประกอบกิจการ
            </span>
            <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              {licenses.length || 36}
            </span>
            <span className="text-xs sm:text-[13px] text-emerald-800 font-bold bg-emerald-100/90 px-2.5 py-0.5 rounded-full">
              สถานประกอบการ (แห่ง)
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs sm:text-[13px] text-slate-500 font-medium">
            <span>หมดอายุ <strong className="text-rose-600 font-bold">{expiredLicenses}</strong> • ใกล้หมด <strong className="text-amber-600 font-bold">{expiringLicenses}</strong></span>
            <span className="text-emerald-700 font-bold group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
              ตรวจติดตาม <ChevronRight className="w-4 h-4" />
            </span>
          </div>
        </div>

        {/* KPI 3: ผู้ป่วย LTC ได้รับของแล้ว */}
        <div
          onClick={() => onNavigateTab('ltc')}
          className="bg-gradient-to-br from-white via-white to-rose-50/40 rounded-2xl p-5 sm:p-6 border-l-4 border-l-rose-500 border border-slate-200/90 shadow-xs hover:shadow-lg transition-all cursor-pointer group hover:border-rose-400 relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-xs sm:text-[13px] font-bold text-slate-600 uppercase tracking-wide">
              สปสช. LTC ดูแลผู้สูงอายุ
            </span>
            <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
              <HeartPulse className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              {ltcDeliveredCount}/{ltcPatients.length || 12}
            </span>
            <span className="text-xs sm:text-[13px] text-rose-700 font-bold bg-rose-100/90 px-2.5 py-0.5 rounded-full">
              ส่งมอบแล้ว ({ltcPercentage}%)
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs sm:text-[13px] text-slate-500 font-medium">
            <span>รอส่งมอบ: <strong className="text-slate-800 font-bold">{(ltcPatients.length || 12) - ltcDeliveredCount}</strong> ราย (7 หมู่บ้าน)</span>
            <span className="text-rose-700 font-bold group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
              จัดเส้นทาง <ChevronRight className="w-4 h-4" />
            </span>
          </div>
        </div>

        {/* KPI 4: อุปกรณ์การแพทย์พร้อมใช้/ถูกยืม */}
        <div
          onClick={() => onNavigateTab('equipment')}
          className="bg-gradient-to-br from-white via-white to-indigo-50/40 rounded-2xl p-5 sm:p-6 border-l-4 border-l-indigo-500 border border-slate-200/90 shadow-xs hover:shadow-lg transition-all cursor-pointer group hover:border-indigo-400 relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-xs sm:text-[13px] font-bold text-slate-600 uppercase tracking-wide">
              ยืม-คืน อุปกรณ์การแพทย์
            </span>
            <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
              <Stethoscope className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">{activeLoans}</span>
            <span className="text-xs sm:text-[13px] text-indigo-800 font-bold bg-indigo-100/90 px-2.5 py-0.5 rounded-full">
              สัญญาขอยืม (รวม {inUseEquipmentUnits} ชิ้น)
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs sm:text-[13px] text-slate-500 font-medium">
            <span>พร้อมให้ยืม: <strong className="text-slate-800 font-bold">{availableEquipmentUnits}</strong> ชิ้น (ทั้งหมด {totalEquipmentUnits} ชิ้น)</span>
            <span className="text-indigo-700 font-bold group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
              คลังอุปกรณ์ <ChevronRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>

      {/* แผงปฏิทินกิจกรรมสาธารณสุข & รายการแจ้งเตือนนัดหมาย (เชื่อมต่อ Google Calendar: bangpaohealthy@gmail.com) */}
      <div id="calendar-panel-section" className="space-y-3">
        <div className="bg-gradient-to-r from-indigo-950 via-blue-950 to-emerald-950 rounded-2xl p-4 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-3 border border-indigo-500/40 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2 flex-wrap">
                <span>🔔 ระบบแจ้งเตือนนัดหมายปฏิทิน & แผนงาน เข้ากลุ่ม LINE และอีเมลกองสาธารณสุข</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[11px]">
                  พร้อมแนบไฟล์ตารางแผนงาน A4 (.PDF & .DOCX)
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-indigo-200 mt-0.5">
                เมื่อเพิ่มนัดหมายหรือแผนงานใหม่ ระบบจะแจ้งเตือนเข้ากลุ่ม LINE และส่งไฟล์แบบฟอร์มตารางแผนปฏิบัติงาน A4 เข้าอีเมลกองสาธารณสุขโดยอัตโนมัติ
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={isNotifyCalendarSending}
              onClick={() => handleSendDailyScheduleNotification(false)}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isNotifyCalendarSending ? 'กำลังส่งแจ้งเตือน...' : 'ส่งสรุปแผนงานเข้า LINE & อีเมลทันที'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSendDailyScheduleNotification(true)}
              className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Printer className="w-3.5 h-3.5 text-amber-300" />
              <span>พิมพ์แบบฟอร์มตารางแผนงาน A4</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('settings', 'notifications')}
              className="px-3.5 py-2 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border border-amber-400/40 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>ตั้งค่าแจ้งเตือน & ไฟล์แนบ</span>
            </button>
          </div>
        </div>

        <MunicipalCalendarPanel
          events={calendarEvents}
          onAddEvent={handleAddCalendarEvent}
          onUpdateEvent={handleUpdateCalendarEvent}
          onDeleteEvent={handleDeleteCalendarEvent}
          onOpenCreateEventModal={() => setIsCalendarModalOpen(true)}
          onOpenAttachment={(att, ev) => {
            setViewerAttachment(att);
            setViewerLinkedEvent(ev || null);
            setIsViewerModalOpen(true);
          }}
          onOpenActivityEditor={(ev, presetDate) => {
            setActivityEditingEvent(ev || null);
            setActivityPresetDate(presetDate);
            setIsActivityModalOpen(true);
          }}
        />
      </div>

      {/* ========================================================================= */}
      {/* SECTION: ประชาสัมพันธ์กิจกรรม & คลังเอกสารหนังสือราชการล่าสุด (อัปโหลด & เปิดดูไฟล์) */}
      {/* ========================================================================= */}
      {(() => {
        const activityEvents = calendarEvents.filter(
          (e) => e.category === 'activity' || (e.attachments && e.attachments.length > 0)
        );

        return (
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base sm:text-lg text-slate-900 flex items-center gap-2">
                      <span>ศูนย์ประชาสัมพันธ์กิจกรรม & คลังหนังสือราชการ (อบรม / ประชุม / ร่วมงาน)</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-violet-100 text-violet-800">
                        {activityEvents.length} รายการ
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      บันทึกกิจกรรม ประชาสัมพันธ์กำหนดการ แนบไฟล์หนังสือเชิญ A4/PDF และคลิกเปิดดูเอกสารตัวจริงได้ทันที
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setActivityEditingEvent(null);
                    setActivityPresetDate(undefined);
                    setIsActivityModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all hover:scale-105 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ บันทึกกิจกรรม / แนบหนังสือเชิญ</span>
                </button>
              </div>
            </div>

            {/* List or Grid of Recent Activities */}
            {activityEvents.length === 0 ? (
              <div className="p-8 rounded-2xl bg-gradient-to-br from-violet-50/50 to-fuchsia-50/30 border border-dashed border-violet-200 text-center space-y-2.5">
                <div className="w-12 h-12 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center mx-auto">
                  <Megaphone className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-800 text-sm">ยังไม่มีรายการประชาสัมพันธ์หรือหนังสือเชิญ</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  คลิกปุ่มด้านบนเพื่อบันทึกหนังสือเชิญอบรม, หนังสือเชิญประชุม หรือกิจกรรมสาธารณสุข พร้อมอัปโหลดไฟล์หนังสือราชการ A4/PDF
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActivityEditingEvent(null);
                    setActivityPresetDate(undefined);
                    setIsActivityModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>เริ่มบันทึกกิจกรรมแรก</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                {activityEvents.slice(0, 6).map((act) => {
                  const docMeta = act.docType ? ACTIVITY_DOC_TYPES[act.docType] : null;
                  const isDone = act.status === 'completed';
                  const attCount = act.attachments?.length || 0;

                  return (
                    <div
                      key={act.id}
                      className="p-4 rounded-2xl border border-slate-200/90 hover:border-violet-400 bg-white hover:shadow-md transition-all space-y-2.5 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        {/* Header: DocType Tag + Status */}
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                              docMeta ? docMeta.color : 'bg-violet-50 text-violet-800 border-violet-200'
                            }`}
                          >
                            <span>{docMeta ? docMeta.emoji : '📢'}</span>
                            <span>{docMeta ? docMeta.label : 'กิจกรรมประชาสัมพันธ์'}</span>
                          </span>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              isDone ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isDone ? '✅ เสร็จสิ้นแล้ว' : 'รอดำเนินการ'}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                          {act.title}
                        </h4>

                        {/* Meta info: Doc No / Agency */}
                        {(act.docNo || act.fromAgency) && (
                          <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl space-y-0.5">
                            {act.docNo && (
                              <div>
                                <span className="text-slate-400">เลขที่: </span>
                                <strong className="font-mono text-slate-800">{act.docNo}</strong>
                              </div>
                            )}
                            {act.fromAgency && (
                              <div>
                                <span className="text-slate-400">จาก: </span>
                                <strong className="text-slate-800">{act.fromAgency}</strong>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Date & Location */}
                        <div className="text-xs text-slate-500 space-y-1">
                          <div className="flex items-center gap-1.5 truncate">
                            <Calendar className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                            <span className="font-medium">
                              {act.date}
                              {act.endDate && act.endDate !== act.date ? ` ถึง ${act.endDate}` : ''} ({act.startTime} - {act.endTime} น.)
                            </span>
                          </div>
                          {act.location && (
                            <div className="flex items-center gap-1.5 truncate">
                              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              <span className="truncate">{act.location}</span>
                            </div>
                          )}
                        </div>

                        {/* Attachments Chips (Clickable to open) */}
                        {attCount > 0 && (
                          <div className="space-y-1 pt-1 border-t border-slate-100">
                            <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                              <Paperclip className="w-3 h-3 text-violet-500" />
                              <span>เอกสารแนบ ({attCount} ไฟล์) — คลิกเพื่อเปิดดู:</span>
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {act.attachments!.map((att) => (
                                <button
                                  key={att.id}
                                  type="button"
                                  onClick={() => {
                                    setViewerAttachment(att);
                                    setViewerLinkedEvent(act);
                                    setIsViewerModalOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-900 border border-violet-200 text-[11px] font-medium transition-all hover:scale-105 cursor-pointer max-w-full"
                                  title={`เปิดดู ${att.name}`}
                                >
                                  <FileText className="w-3 h-3 text-violet-600 shrink-0" />
                                  <span className="truncate max-w-[130px]">{att.name}</span>
                                  <Eye className="w-3 h-3 text-violet-400 shrink-0" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Card Footer Actions */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setActivityEditingEvent(act);
                            setIsActivityModalOpen(true);
                          }}
                          className="text-slate-500 hover:text-violet-700 font-semibold cursor-pointer"
                        >
                          แก้ไขข้อมูล
                        </button>

                        {attCount > 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              setViewerAttachment(act.attachments![0]);
                              setViewerLinkedEvent(act);
                              setIsViewerModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-[11px] shadow-2xs transition-all cursor-pointer hover:scale-105"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>เปิดดูเอกสาร</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setActivityEditingEvent(act);
                              setIsActivityModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 text-violet-700 hover:text-violet-900 font-bold text-[11px] cursor-pointer"
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                            <span>+ แนบไฟล์</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Quick Action Bar (ปุ่มลัดไปยังงานเร่งด่วน) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs">
        <h3 className="text-xs sm:text-[13px] font-bold text-slate-600 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>ทางลัดงานเร่งด่วนสำหรับเจ้าหน้าที่และผู้บริหาร (Quick Actions)</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Action 1 */}
          <button
            onClick={() => onNavigateTab('petitions')}
            className="flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-amber-50/60 to-white hover:bg-amber-100/60 border border-amber-200/70 hover:border-amber-400 hover:shadow-md transition-all text-center group cursor-pointer"
          >
            <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition-transform">
              <Truck className="w-5 h-5" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-800">จ่ายงานรถสูบส้วม</span>
            <span className="text-xs text-amber-700 font-semibold mt-0.5">คำร้องค้าง {pendingSewage} งาน</span>
          </button>

          {/* Action 2 */}
          <button
            onClick={() => onNavigateTab('establishments')}
            className="flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-emerald-50/60 to-white hover:bg-emerald-100/60 border border-emerald-200/70 hover:border-emerald-400 hover:shadow-md transition-all text-center group cursor-pointer"
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition-transform">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-800">ตรวจประเมิน 25 ข้อ</span>
            <span className="text-xs text-emerald-700 font-semibold mt-0.5">เปิดฟอร์มตรวจใหม่</span>
          </button>

          {/* Action 3 */}
          <button
            onClick={() => onNavigateTab('dashboard')}
            className="flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-teal-50/60 to-white hover:bg-teal-100/60 border border-teal-200/70 hover:border-teal-400 hover:shadow-md transition-all text-center group cursor-pointer"
          >
            <div className="w-11 h-11 rounded-xl bg-teal-600 text-white flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition-transform">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-800">ออกใบอนุญาต</span>
            <span className="text-xs text-teal-700 font-semibold mt-0.5">36 สถานประกอบการ</span>
          </button>

          {/* Action 4 */}
          <button
            onClick={() => onNavigateTab('ltc')}
            className="flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-rose-50/60 to-white hover:bg-rose-100/60 border border-rose-200/70 hover:border-rose-400 hover:shadow-md transition-all text-center group cursor-pointer"
          >
            <div className="w-11 h-11 rounded-xl bg-rose-500 text-white flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition-transform">
              <HeartPulse className="w-5 h-5" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-800">แผนแจกของ LTC</span>
            <span className="text-xs text-rose-700 font-semibold mt-0.5">Smart Delivery Route</span>
          </button>

          {/* Action 5 */}
          <button
            onClick={() => onNavigateTab('equipment')}
            className="flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-indigo-50/60 to-white hover:bg-indigo-100/60 border border-indigo-200/70 hover:border-indigo-400 hover:shadow-md transition-all text-center group cursor-pointer"
          >
            <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition-transform">
              <Stethoscope className="w-5 h-5" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-800">ทำสัญญายืมอุปกรณ์</span>
            <span className="text-xs text-indigo-700 font-semibold mt-0.5">เตียง / ออกซิเจน</span>
          </button>

          {/* Action 6 */}
          <button
            onClick={() => onOpenPrintModal()}
            className="flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-slate-50 to-white hover:bg-slate-100 border border-slate-200 hover:border-slate-400 hover:shadow-md transition-all text-center group cursor-pointer"
          >
            <div className="w-11 h-11 rounded-xl bg-slate-700 text-white flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition-transform">
              <Printer className="w-5 h-5" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-800">พิมพ์คำร้องเสนอ A4</span>
            <span className="text-xs text-slate-600 font-semibold mt-0.5">เลือกผู้บริหารเซ็น</span>
          </button>
        </div>
      </div>

      {/* 2-Column Section: Charts Breakdown & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Breakdown & Metrics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: ผลตรวจประเมินสุขลักษณะสถานประกอบกิจการ */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-base sm:text-lg text-slate-900">
                  มาตรฐานสุขาภิบาลสถานประกอบกิจการ (EHWA Ratings)
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">ผลการประเมินสถานประกอบกิจการ 36 แห่งในเขตพื้นที่เทศบาลตำบลบางเป้า</p>
              </div>
              <button
                onClick={() => onNavigateTab('dashboard')}
                className="text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer bg-emerald-50 px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition-colors"
              >
                ดูทั้งหมด <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-5">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200/70">
                <span className="text-xs font-bold text-emerald-800 block">ดีมาก (85-100%)</span>
                <span className="text-3xl font-black text-emerald-900 mt-1 block">{ratingCounts.excellent}</span>
                <span className="text-[11px] text-emerald-700 font-semibold block mt-1">🏆 มาตรฐานระดับทอง</span>
              </div>
              <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-50 to-teal-100/50 border border-teal-200/70">
                <span className="text-xs font-bold text-teal-800 block">ดี (70-84%)</span>
                <span className="text-3xl font-black text-teal-900 mt-1 block">{ratingCounts.good}</span>
                <span className="text-[11px] text-teal-700 font-semibold block mt-1">🥈 มาตรฐานระดับเงิน</span>
              </div>
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200/70">
                <span className="text-xs font-bold text-amber-800 block">พอใช้ (60-69%)</span>
                <span className="text-3xl font-black text-amber-900 mt-1 block">{ratingCounts.fair}</span>
                <span className="text-[11px] text-amber-700 font-semibold block mt-1">⚠️ ต้องเฝ้าระวัง</span>
              </div>
              <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50 to-rose-100/50 border border-rose-200/70">
                <span className="text-xs font-bold text-rose-800 block">ต้องตรวจซ้ำ</span>
                <span className="text-3xl font-black text-rose-900 mt-1 block">{ratingCounts.reinspect}</span>
                <span className="text-[11px] text-rose-700 font-semibold block mt-1">❌ ถูกร้องเรียน/ไม่ผ่าน</span>
              </div>
            </div>

            {/* Visual Bar */}
            <div className="space-y-2">
              <div className="h-4 rounded-full overflow-hidden flex bg-slate-100 shadow-inner">
                <div
                  style={{ width: `${Math.round((ratingCounts.excellent / totalEstablishmentsCount) * 100)}%` }}
                  className="bg-emerald-500 transition-all duration-500"
                  title={`ดีมาก ${Math.round((ratingCounts.excellent / totalEstablishmentsCount) * 100)}%`}
                />
                <div
                  style={{ width: `${Math.round((ratingCounts.good / totalEstablishmentsCount) * 100)}%` }}
                  className="bg-teal-500 transition-all duration-500"
                  title={`ดี ${Math.round((ratingCounts.good / totalEstablishmentsCount) * 100)}%`}
                />
                <div
                  style={{ width: `${Math.round((ratingCounts.fair / totalEstablishmentsCount) * 100)}%` }}
                  className="bg-amber-400 transition-all duration-500"
                  title={`พอใช้ ${Math.round((ratingCounts.fair / totalEstablishmentsCount) * 100)}%`}
                />
                <div
                  style={{ width: `${Math.round((ratingCounts.reinspect / totalEstablishmentsCount) * 100)}%` }}
                  className="bg-rose-500 transition-all duration-500"
                  title={`ต้องตรวจซ้ำ ${Math.round((ratingCounts.reinspect / totalEstablishmentsCount) * 100)}%`}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-semibold">
                <span className="text-emerald-700">อัตราผ่านเกณฑ์สะสม {passingRatePercent}%</span>
                <span>เป้าหมายประจำปี 100%</span>
              </div>
            </div>
          </div>

          {/* Card: สถิติการให้บริการประชาชน 4 มิติ */}
          {(() => {
            const totalCount = Math.max(petitions.length, 1);
            const sewCount = petitions.filter(
              (p) => p.category === 'waste_sewage' || p.title.includes('สิ่งปฏิกูล') || p.title.includes('ส้วม')
            ).length;
            const nuisanceCount = petitions.filter(
              (p) => p.category === 'nuisance_smell' || p.category === 'nuisance_noise'
            ).length;
            const licCount = petitions.filter((p) => p.category === 'license_request').length;

            const sewPct = Math.round((sewCount / totalCount) * 100) || (sewCount > 0 ? 100 : 0);
            const nuisancePct = Math.round((nuisanceCount / totalCount) * 100);
            const licPct = Math.round((licCount / totalCount) * 100);

            return (
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs">
                <h3 className="font-bold text-base sm:text-lg text-slate-900 mb-1">
                  สัดส่วนคำร้องบริการประชาชนแยกตามประเภทงาน
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mb-5">
                  สถิติการยื่นคำร้องผ่านระบบออนไลน์และจุดบริการ One Stop Service กองสาธารณสุข
                </p>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs sm:text-[13px] font-bold text-slate-700 mb-1.5">
                      <span className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-amber-500" /> ขอรับบริการกำจัดสิ่งปฏิกูล (สูบส้วม)
                      </span>
                      <span className="text-amber-700 font-black">
                        {sewCount} งาน ({sewPct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${sewPct}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs sm:text-[13px] font-bold text-slate-700 mb-1.5">
                      <span className="flex items-center gap-2">
                        <MessageSquareWarning className="w-4 h-4 text-rose-500" /> ร้องเรียนเหตุเดือดร้อนรำคาญ / มลพิษ
                      </span>
                      <span className="text-rose-700 font-black">
                        {nuisanceCount} งาน ({nuisancePct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                      <div
                        className="bg-rose-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${nuisancePct}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs sm:text-[13px] font-bold text-slate-700 mb-1.5">
                      <span className="flex items-center gap-2">
                        <FileCheck2 className="w-4 h-4 text-teal-600" /> ยื่นขอรับ / ต่ออายุใบอนุญาตประกอบกิจการ
                      </span>
                      <span className="text-teal-700 font-black">
                        {licCount} งาน ({licPct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                      <div
                        className="bg-teal-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${licPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Right Column (1 Col): Activity Feed (Audit Log) */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-base sm:text-lg text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              <span>ความเคลื่อนไหวล่าสุด (Audit Log)</span>
            </h3>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mb-5">
            บันทึกการปฏิบัติงานและคำขอที่เกิดขึ้นแบบเรียลไทม์
          </p>

          <div className="space-y-3.5 flex-1 overflow-y-auto pr-1">
            {activities.map((act) => {
              const Icon = act.icon;
              return (
                <div
                  key={act.id}
                  onClick={() => {
                    if (act.actionTab) onNavigateTab(act.actionTab);
                  }}
                  className={`flex items-start gap-3 p-3 rounded-2xl transition-all border border-slate-100 hover:border-slate-300 shadow-2xs ${
                    act.actionTab ? 'cursor-pointer hover:bg-slate-50/90' : 'hover:bg-slate-50/50'
                  }`}
                  title={act.actionTab ? 'คลิกเพื่อเปิดไปยังระบบงานนี้' : undefined}
                >
                  <div className={`w-9 h-9 rounded-xl ${act.color} flex items-center justify-center shrink-0 mt-0.5 shadow-xs`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{act.title}</h4>
                      <span className="text-xs text-slate-400 font-medium shrink-0">{act.time}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{act.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-5 border-t border-slate-100 mt-5 text-center">
            <button
              onClick={() => onNavigateTab('reports')}
              className="text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1.5 cursor-pointer bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-xl transition-all"
            >
              <span>เปิดศูนย์รายงานและสรุปข้อมูลสถิติ</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Full Size Artwork */}
      {isArtworkModalOpen && (
        <div className="fixed inset-0 z-[99999] bg-slate-900/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black leading-tight">
                    วิสัยทัศน์งานบริการ กองสาธารณสุขและสิ่งแวดล้อม เทศบาลตำบลบางเป้า
                  </h3>
                  <p className="text-xs text-emerald-200">
                    บูรณาการงานบริการครบวงจรเพื่อสุขภาพและสิ่งแวดล้อมที่ดีของประชาชน
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsArtworkModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center font-bold cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto bg-slate-50 flex flex-col items-center">
              <img
                src="/bangpao_health_banner.jpg"
                alt="วิสัยทัศน์กองสาธารณสุขและสิ่งแวดล้อม เทศบาลตำบลบางเป้า"
                className="w-full max-h-[65vh] object-contain rounded-2xl shadow-md border border-slate-200"
              />
              <div className="mt-3 text-center text-xs text-slate-600 font-medium">
                🏛️ กองสาธารณสุขและสิ่งแวดล้อม เทศบาลตำบลบางเป้า อ.กันตัง จ.ตรัง • ศูนย์บริการสาธารณสุขและจัดการเมืองอัจฉริยะ (Smart Portal)
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal: Google Calendar & Gmail Integration */}
      <GoogleCalendarModal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        onAddEvent={handleAddCalendarEvent}
      />

      {/* Modal: Citizen Portal Share Modal */}
      <CitizenPortalShareModal
        isOpen={isCitizenShareModalOpen}
        onClose={() => setIsCitizenShareModalOpen(false)}
      />

      {/* Modal: Activity Announcement & Document Upload Modal */}
      <ActivityAnnouncementModal
        isOpen={isActivityModalOpen}
        onClose={() => {
          setIsActivityModalOpen(false);
          setActivityEditingEvent(null);
          setActivityPresetDate(undefined);
        }}
        onSave={async (savedEvent) => {
          if (activityEditingEvent) {
            handleUpdateCalendarEvent(savedEvent);
          } else {
            handleAddCalendarEvent(savedEvent);
          }
          if (onShowToast) {
            onShowToast('success', `บันทึกกิจกรรม "${savedEvent.title}" พร้อมไฟล์แนบเรียบร้อยแล้ว`);
          }
        }}
        editingEvent={activityEditingEvent}
        presetDate={activityPresetDate}
        onOpenAttachment={(att) => {
          setViewerAttachment(att);
          setViewerLinkedEvent(activityEditingEvent || null);
          setIsViewerModalOpen(true);
        }}
      />

      {/* Modal: Universal Attachment & Document Viewer Modal */}
      <AttachmentViewerModal
        isOpen={isViewerModalOpen}
        onClose={() => {
          setIsViewerModalOpen(false);
          setViewerAttachment(null);
          setViewerLinkedEvent(null);
        }}
        attachment={viewerAttachment}
        event={viewerLinkedEvent}
      />
    </div>
  );
};
