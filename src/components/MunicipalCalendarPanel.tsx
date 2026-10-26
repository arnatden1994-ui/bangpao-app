import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Plus,
  ExternalLink,
  Mail,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
  HeartPulse,
  Truck,
  Shield,
  Building2,
  Sparkles,
  User,
  Bell,
  CalendarCheck,
  Search,
  Eye,
  Trash2,
  Save,
  X,
  Download,
  Check,
  Pencil,
} from 'lucide-react';

export interface CalendarEventItem {
  id: string;
  title: string;
  category: 'ltc' | 'inspection' | 'sewage' | 'nhso' | 'equipment' | 'general';
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  location: string;
  responsibleOfficer: string;
  details: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export const INITIAL_CALENDAR_EVENTS: CalendarEventItem[] = [
  {
    id: 'cal-1',
    title: 'ลงพื้นที่เยี่ยมบ้านผู้ป่วยติดเตียง LTC หมู่ 2 ต.บางเป้า (มอบชุดดูแลและผ้าอ้อม)',
    category: 'ltc',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:30',
    endTime: '12:00',
    location: 'บ้านผู้ป่วยติดเตียง หมู่ 2 ตำบลบางเป้า',
    responsibleOfficer: 'พยาบาลวิชาชีพ & อสม. หมู่ 2',
    details: 'ตรวจประเมินสุขภาพผู้มีภาวะพึ่งพิง และมอบชุดดูแล LTC พร้อมผ้าอ้อมผู้ใหญ่ สปสช.',
    status: 'in_progress',
  },
  {
    id: 'cal-2',
    title: 'ตรวจประเมินสุขลักษณะสถานประกอบกิจการ 25 ข้อ (ร้าน ก.ไก่)',
    category: 'inspection',
    date: new Date().toISOString().split('T')[0],
    startTime: '13:30',
    endTime: '15:30',
    location: 'ร้าน ก.ไก่ ต.บางเป้า อ.กันตัง',
    responsibleOfficer: 'นายตรวจสุขาภิบาล ทต.บางเป้า',
    details: 'ตรวจประเมินสุขลักษณะ 3 หมวด 25 ข้อ เพื่อพิจารณาต่ออายุใบอนุญาต อภ.2',
    status: 'pending',
  },
  {
    id: 'cal-3',
    title: 'คิวรถบรรทุกสูบสิ่งปฏิกูล ทต.บางเป้า ให้บริการบ้านเลขที่ 195/1 ม.5 (คำร้อง ST-68004)',
    category: 'sewage',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '11:30',
    location: 'บ้านเลขที่ 195/1 หมู่ 5 ต.บางเป้า (นายนิรันดร์ ใจดี)',
    responsibleOfficer: 'พนักงานขับรถสูบสิ่งปฏิกูล ทต.บางเป้า',
    details: 'ให้บริการสูบสิ่งปฏิกูลและตรวจวัดปริมาตร ออกใบเสร็จรับเงินค่าธรรมเนียม',
    status: 'pending',
  },
  {
    id: 'cal-4',
    title: 'ตรวจติดตามและเตือนต่ออายุใบอนุญาต บ.เอสทีเอส กันตัง โลจิสติกส์ (ใกล้ครบกำหนด)',
    category: 'inspection',
    date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    startTime: '14:00',
    endTime: '15:00',
    location: 'บ.เอสทีเอส กันตัง โลจิสติกส์',
    responsibleOfficer: 'เจ้าพนักงานสาธารณสุข',
    details: 'ติดตามเอกสารการต่ออายุใบอนุญาตประกอบกิจการที่เป็นอันตรายต่อสุขภาพ',
    status: 'pending',
  },
  {
    id: 'cal-5',
    title: 'ส่งมอบเตียงผู้ป่วย 3 ไกร์ (EQ-002) แก่นายวิเชียร สุขเกษม ม.1 (ทำสัญญาขอยืม)',
    category: 'equipment',
    date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    startTime: '10:30',
    endTime: '12:00',
    location: 'หมู่ 1 ตำบลบางเป้า',
    responsibleOfficer: 'เจ้าหน้าที่งานกายอุปกรณ์',
    details: 'นำส่งเตียงผู้ป่วยพร้อมสาธิตวิธีการใช้งาน และลงนามในสัญญายืมอุปกรณ์มาตรฐาน',
    status: 'pending',
  },
  {
    id: 'cal-6',
    title: 'ประชุมคณะกรรมการกองทุนหลักประกันสุขภาพตำบลบางเป้า (กปท.) พิจารณาโครงการ สปสช.',
    category: 'nhso',
    date: new Date(Date.now() + 86400000 * 6).toISOString().split('T')[0],
    startTime: '13:30',
    endTime: '16:30',
    location: 'ห้องประชุมเทศบาลตำบลบางเป้า',
    responsibleOfficer: 'เลขาธิการกองทุนหลักประกันสุขภาพฯ',
    details: 'พิจารณาอนุมัติโครงการส่งเสริมสุขภาพ เอกสารแนบ 6 ของชุมชนและโรงเรียน',
    status: 'pending',
  },
];

interface MunicipalCalendarPanelProps {
  events?: CalendarEventItem[];
  onAddEvent?: (newEvent: CalendarEventItem) => void;
  onUpdateEvent?: (updatedEvent: CalendarEventItem) => void;
  onDeleteEvent?: (id: string) => void;
  onOpenCreateEventModal?: () => void;
}

export const MunicipalCalendarPanel: React.FC<MunicipalCalendarPanelProps> = ({
  events: propEvents,
  onAddEvent: propOnAddEvent,
  onUpdateEvent: propOnUpdateEvent,
  onDeleteEvent: propOnDeleteEvent,
  onOpenCreateEventModal,
}) => {
  const calendarEmail = 'bangpaohealthy@gmail.com';

  // Internal events fallback if not provided via props
  const [internalEvents, setInternalEvents] = useState<CalendarEventItem[]>(() => {
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

  const events = propEvents || internalEvents;

  // Custom Delete Modal State
  const [eventToDelete, setEventToDelete] = useState<CalendarEventItem | null>(null);

  // Custom Edit Modal State
  const [editingEvent, setEditingEvent] = useState<CalendarEventItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<CalendarEventItem['category']>('ltc');
  const [editDate, setEditDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('09:30');
  const [editEndTime, setEditEndTime] = useState('12:00');
  const [editLocation, setEditLocation] = useState('');
  const [editOfficer, setEditOfficer] = useState('');
  const [editDetails, setEditDetails] = useState('');
  const [editStatus, setEditStatus] = useState<CalendarEventItem['status']>('pending');

  const handleAddEventInternal = (newEvent: CalendarEventItem) => {
    if (propOnAddEvent) {
      propOnAddEvent(newEvent);
    } else {
      setInternalEvents((prev) => [newEvent, ...prev]);
    }
    try {
      const currentList = propEvents || internalEvents;
      localStorage.setItem('bangpao_calendar_events_v2', JSON.stringify([newEvent, ...currentList]));
    } catch (e) {
      console.warn('Failed to cache event', e);
    }
  };

  const handleStartEdit = (ev: CalendarEventItem) => {
    setEditingEvent(ev);
    setEditTitle(ev.title);
    setEditCategory(ev.category);
    setEditDate(ev.date);
    setEditStartTime(ev.startTime);
    setEditEndTime(ev.endTime);
    setEditLocation(ev.location);
    setEditOfficer(ev.responsibleOfficer);
    setEditDetails(ev.details);
    setEditStatus(ev.status || 'pending');
  };

  const handleSaveEdit = () => {
    if (!editingEvent) return;
    if (!editTitle.trim()) {
      alert('กรุณาระบุหัวข้อนัดหมาย');
      return;
    }

    const updated: CalendarEventItem = {
      ...editingEvent,
      title: editTitle.trim(),
      category: editCategory,
      date: editDate,
      startTime: editStartTime,
      endTime: editEndTime,
      location: editLocation.trim() || 'ตำบลบางเป้า อ.กันตัง จ.ตรัง',
      responsibleOfficer: editOfficer.trim() || 'กองสาธารณสุขและสิ่งแวดล้อม',
      details: editDetails.trim() || 'กำหนดการปฏิบัติงานกองสาธารณสุขและสิ่งแวดล้อม ทต.บางเป้า',
      status: editStatus,
    };

    if (propOnUpdateEvent) {
      propOnUpdateEvent(updated);
    } else {
      setInternalEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    }

    try {
      const currentList = (propEvents || internalEvents).map((e) => (e.id === updated.id ? updated : e));
      localStorage.setItem('bangpao_calendar_events_v2', JSON.stringify(currentList));
    } catch (e) {
      console.warn('Failed to update event in localStorage', e);
    }

    setToastMessage(`แก้ไขข้อมูลนัดหมาย "${updated.title}" เรียบร้อยแล้ว`);
    setTimeout(() => setToastMessage(null), 4000);
    setEditingEvent(null);
  };

  const handleConfirmDelete = () => {
    if (!eventToDelete) return;
    const deletedTitle = eventToDelete.title;
    const id = eventToDelete.id;

    if (propOnDeleteEvent) {
      propOnDeleteEvent(id);
    } else {
      setInternalEvents((prev) => prev.filter((e) => e.id !== id));
    }

    try {
      const currentList = (propEvents || internalEvents).filter((e) => e.id !== id);
      localStorage.setItem('bangpao_calendar_events_v2', JSON.stringify(currentList));
    } catch (e) {
      console.warn('Failed to delete event from localStorage', e);
    }

    setToastMessage(`ลบรายการนัดหมาย "${deletedTitle}" สำเร็จ`);
    setTimeout(() => setToastMessage(null), 4000);
    setEventToDelete(null);
  };

  // Calendar View Date Navigation
  const [currentViewDate, setCurrentViewDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'interactive' | 'embed'>('interactive');

  // Quick Add Event Form state
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [formCategory, setFormCategory] = useState<CalendarEventItem['category']>('ltc');
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formStartTime, setFormStartTime] = useState('09:30');
  const [formEndTime, setFormEndTime] = useState('12:00');
  const [formLocation, setFormLocation] = useState('ตำบลบางเป้า อ.กันตัง จ.ตรัง');
  const [formOfficer, setFormOfficer] = useState('เจ้าหน้าที่กองสาธารณสุขและสิ่งแวดล้อม');
  const [formDetails, setFormDetails] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Month & Year calculations
  const year = currentViewDate.getFullYear();
  const month = currentViewDate.getMonth();
  const thaiYear = year + 543;

  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ];
  const thaiMonthName = thaiMonths[month];

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const handlePrevMonth = () => setCurrentViewDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentViewDate(new Date(year, month + 1, 1));
  const handleGoToday = () => {
    const today = new Date();
    setCurrentViewDate(today);
    setSelectedDate(today.toISOString().split('T')[0]);
  };

  // Safe Google Calendar link
  const openGoogleCalendarDirect = () => {
    const url = `https://calendar.google.com/calendar/r?authuser=${encodeURIComponent(calendarEmail)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Safe Gmail link
  const openGmailDirect = () => {
    const url = `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(calendarEmail)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Template Click Handler
  const applyQuickTemplate = (cat: CalendarEventItem['category']) => {
    setFormCategory(cat);
    const today = new Date().toISOString().split('T')[0];
    setFormDate(today);

    if (cat === 'ltc') {
      setFormTitle('[LTC บางเป้า] ลงพื้นที่เยี่ยมบ้านผู้ป่วยติดเตียงและส่งมอบชุดดูแล LTC');
      setFormStartTime('09:30');
      setFormEndTime('12:00');
      setFormLocation('ตำบลบางเป้า อ.กันตัง จ.ตรัง');
      setFormOfficer('พยาบาลวิชาชีพ & อสม. บางเป้า');
      setFormDetails('ตรวจประเมินสุขภาพผู้มีภาวะพึ่งพิง และมอบชุดดูแล LTC พร้อมผ้าอ้อมผู้ใหญ่ สปสช.');
    } else if (cat === 'inspection') {
      setFormTitle('[ตรวจสุขาภิบาล] ตรวจประเมินสุขลักษณะสถานประกอบกิจการ 25 ข้อ');
      setFormStartTime('13:30');
      setFormEndTime('15:30');
      setFormLocation('สถานประกอบการ เขตเทศบาลตำบลบางเป้า');
      setFormOfficer('นายตรวจสุขาภิบาล ทต.บางเป้า');
      setFormDetails('ตรวจประเมิน 25 ข้อ ตาม พ.ร.บ.การสาธารณสุข ประกอบการพิจารณาออกใบอนุญาต อภ.2');
    } else if (cat === 'sewage') {
      setFormTitle('[บริการสูบส้วม] ให้บริการสูบสิ่งปฏิกูลตามคำร้องประชาชน');
      setFormStartTime('10:00');
      setFormEndTime('11:30');
      setFormLocation('บ้านผู้ยื่นคำร้อง ตำบลบางเป้า');
      setFormOfficer('พนักงานขับรถสูบสิ่งปฏิกูล ทต.บางเป้า');
      setFormDetails('นำรถบรรทุกสิ่งปฏิกูลออกปฏิบัติงานตามคิวคำร้องประชาชน');
    } else if (cat === 'nhso') {
      setFormTitle('[กปท. บางเป้า] ประชุมคณะกรรมการกองทุนหลักประกันสุขภาพตำบลบางเป้า');
      setFormStartTime('13:30');
      setFormEndTime('16:30');
      setFormLocation('ห้องประชุมเทศบาลตำบลบางเป้า');
      setFormOfficer('เลขาธิการกองทุน กปท. บางเป้า');
      setFormDetails('พิจารณาอนุมัติโครงการส่งเสริมสุขภาพ เอกสารแนบ 6 ของชุมชนและโรงเรียน');
    } else if (cat === 'equipment') {
      setFormTitle('[กายอุปกรณ์] ส่งมอบอุปกรณ์การแพทย์และจัดทำสัญญาขอยืม A4');
      setFormStartTime('10:30');
      setFormEndTime('12:00');
      setFormLocation('บ้านผู้ขอยืมอุปกรณ์ ต.บางเป้า');
      setFormOfficer('เจ้าหน้าที่งานกายอุปกรณ์');
      setFormDetails('นำส่งเตียง/วีลแชร์/ถังออกซิเจน พร้อมลงนามสัญญาขอยืมมาตรฐาน');
    }
  };

  // Save new event directly to system
  const handleSaveQuickEvent = (openGoogleCalendarAlso: boolean = false) => {
    if (!formTitle.trim()) {
      alert('กรุณาระบุหัวข้อนัดหมาย');
      return;
    }

    const newEvent: CalendarEventItem = {
      id: `cal-${Date.now()}`,
      title: formTitle.trim(),
      category: formCategory,
      date: formDate,
      startTime: formStartTime,
      endTime: formEndTime,
      location: formLocation.trim() || 'เทศบาลตำบลบางเป้า',
      responsibleOfficer: formOfficer.trim() || 'กองสาธารณสุขและสิ่งแวดล้อม',
      details: formDetails.trim() || 'กำหนดการปฏิบัติงานกองสาธารณสุขและสิ่งแวดล้อม ทต.บางเป้า',
      status: 'pending',
    };

    // 1. Add to system
    handleAddEventInternal(newEvent);
    setSelectedDate(formDate);

    // 2. Show toast
    setToastMessage(`บันทึกนัดหมาย "${newEvent.title}" ลงในระบบสำเร็จ!`);
    setTimeout(() => setToastMessage(null), 4000);

    // 3. If requested, also launch into Google Calendar inviting bangpaohealthy@gmail.com
    if (openGoogleCalendarAlso) {
      launchEventInGoogleCalendar(newEvent);
    }

    // Reset & close form
    setFormTitle('');
    setFormDetails('');
    setIsQuickAddOpen(false);
  };

  // Google Calendar URL generator with add=bangpaohealthy@gmail.com
  const launchEventInGoogleCalendar = (ev: CalendarEventItem) => {
    const cleanDate = ev.date.replace(/-/g, '');
    const cleanStart = ev.startTime.replace(/:/g, '') + '00';
    const cleanEnd = ev.endTime.replace(/:/g, '') + '00';
    const dates = `${cleanDate}T${cleanStart}/${cleanDate}T${cleanEnd}`;

    const query = new URLSearchParams({
      action: 'TEMPLATE',
      text: ev.title,
      details: `${ev.details}\nผู้รับผิดชอบ: ${ev.responsibleOfficer}\nหน่วยงาน: กองสาธารณสุขและสิ่งแวดล้อม เทศบาลตำบลบางเป้า`,
      location: ev.location,
      dates: dates,
      add: calendarEmail, // Invites bangpaohealthy@gmail.com so it always receives the event!
      authuser: calendarEmail,
      ctz: 'Asia/Bangkok',
    });

    const url = `https://calendar.google.com/calendar/render?${query.toString()}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Gmail Notification launcher
  const sendEventViaGmail = (ev: CalendarEventItem) => {
    const subject = `[แจ้งเตือนกำหนดการ] ${ev.title} - กองสาธารณสุขฯ ทต.บางเป้า`;
    const body = `เรียน เจ้าหน้าที่ / ผู้เกี่ยวข้อง\n\nขอแจ้งกำหนดการนัดหมายการปฏิบัติงาน:\nหัวข้อ: ${ev.title}\nวันที่: ${ev.date}\nเวลา: ${ev.startTime} - ${ev.endTime} น.\nสถานที่: ${ev.location}\nผู้รับผิดชอบ: ${ev.responsibleOfficer}\nรายละเอียด: ${ev.details}\n\nกองสาธารณสุขและสิ่งแวดล้อม เทศบาลตำบลบางเป้า อ.กันตัง จ.ตรัง`;

    const query = new URLSearchParams({
      view: 'cm',
      fs: '1',
      to: calendarEmail,
      su: subject,
      body: body,
    });
    window.open(`https://mail.google.com/mail/?${query.toString()}`, '_blank', 'noopener,noreferrer');
  };

  // iCalendar (.ics) download
  const downloadIcs = (ev: CalendarEventItem) => {
    const cleanDate = ev.date.replace(/-/g, '');
    const start = `${cleanDate}T${ev.startTime.replace(/:/g, '')}00`;
    const end = `${cleanDate}T${ev.endTime.replace(/:/g, '')}00`;
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Bangpao Municipality//Health Calendar//TH',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:bangpao-${ev.id}@bangpaohealthy.gmail.com`,
      `DTSTAMP:${cleanDate}T000000Z`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${ev.title}`,
      `DESCRIPTION:${ev.details.replace(/\n/g, '\\n')}`,
      `LOCATION:${ev.location}`,
      `ORGANIZER;CN=กองสาธารณสุขและสิ่งแวดล้อม ทต.บางเป้า:mailto:${calendarEmail}`,
      `ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED:mailto:${calendarEmail}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bangpao-event-${cleanDate}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredEvents = events.filter((ev) => {
    if (selectedDate && ev.date !== selectedDate) return false;
    if (categoryFilter === 'all') return true;
    if (categoryFilter === 'today') return ev.date === todayStr;
    if (categoryFilter === 'urgent') return ev.date <= todayStr;
    return ev.category === categoryFilter;
  });

  const getCategoryBadge = (cat: CalendarEventItem['category']) => {
    switch (cat) {
      case 'ltc':
        return {
          label: 'LTC ผู้ป่วยติดเตียง',
          color: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500',
          icon: HeartPulse,
        };
      case 'inspection':
        return {
          label: 'ตรวจสุขาภิบาล 25 ข้อ',
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
          icon: Shield,
        };
      case 'sewage':
        return {
          label: 'บริการสูบส้วม/สิ่งปฏิกูล',
          color: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
          icon: Truck,
        };
      case 'nhso':
        return {
          label: 'โครงการ สปสช. (กปท.)',
          color: 'bg-sky-50 text-sky-700 border-sky-200',
          dot: 'bg-sky-500',
          icon: Building2,
        };
      case 'equipment':
        return {
          label: 'ยืม-คืนกายอุปกรณ์',
          color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          dot: 'bg-indigo-500',
          icon: Sparkles,
        };
      default:
        return {
          label: 'งานสาธารณสุขทั่วไป',
          color: 'bg-slate-50 text-slate-700 border-slate-200',
          dot: 'bg-slate-500',
          icon: CalendarIcon,
        };
    }
  };

  const getUrgencyText = (eventDate: string) => {
    if (eventDate === todayStr) return { text: '🚨 วันนี้', color: 'bg-red-500 text-white' };
    const diffDays = Math.ceil(
      (new Date(eventDate).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays === 1) return { text: '⚡ พรุ่งนี้', color: 'bg-amber-500 text-white' };
    if (diffDays > 1 && diffDays <= 3) return { text: `ใน ${diffDays} วัน`, color: 'bg-sky-600 text-white' };
    if (diffDays > 3 && diffDays <= 7) return { text: 'สัปดาห์นี้', color: 'bg-emerald-600 text-white' };
    return { text: 'เร็วๆ นี้', color: 'bg-slate-600 text-white' };
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-md space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-600 text-white font-bold text-xs sm:text-sm flex items-center justify-between shadow-lg animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-amber-300 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-emerald-700 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Header Bar: Title, Gmail Connection Status & Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-700/20 shrink-0">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight">
                แผงปฏิทินกิจกรรม & การแจ้งเตือนนัดหมาย กองสาธารณสุขฯ
              </h3>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Google Calendar Sync</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
              <span>เชื่อมต่อปฏิทินกลางของกองสาธารณสุขและสิ่งแวดล้อม:</span>
              <strong className="text-emerald-700 font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {calendarEmail}
              </strong>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Main Direct Add Button */}
          <button
            type="button"
            onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md hover:scale-105 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isQuickAddOpen ? 'ปิดฟอร์มเพิ่มนัดหมาย' : '+ เพิ่มนัดหมายลงระบบ'}</span>
          </button>

          <button
            type="button"
            onClick={openGoogleCalendarDirect}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="เปิด Google Calendar ในแท็บใหม่ด้วยบัญชี bangpaohealthy@gmail.com"
          >
            <CalendarIcon className="w-3.5 h-3.5 text-emerald-600" />
            <span>เปิด Google Calendar</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </button>

          <button
            type="button"
            onClick={openGmailDirect}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="เปิดกล่องจดหมาย Gmail ของ bangpaohealthy@gmail.com"
          >
            <Mail className="w-3.5 h-3.5 text-rose-300" />
            <span>เปิด Gmail</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </button>

          {/* View mode toggle */}
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'interactive' ? 'embed' : 'interactive')}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            title="สลับมุมมองระหว่างปฏิทินอัจฉริยะ และ Google Calendar Embed"
          >
            <Eye className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">
              {viewMode === 'interactive' ? 'ดู Google Calendar ฝังสด' : 'ดูแผงปฏิทินในระบบ'}
            </span>
          </button>
        </div>
      </div>

      {/* 2. INLINE QUICK ADD EVENT FORM (Direct in-system save without jumping out to personal Gmail!) */}
      {isQuickAddOpen && (
        <div className="bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 rounded-2xl p-4 sm:p-5 border-2 border-emerald-400 shadow-md animate-in slide-in-from-top-3 duration-200 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                <Plus className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  เพิ่มนัดหมายใหม่ลงในระบบกองสาธารณสุขฯ
                </h4>
                <p className="text-[11px] text-slate-500">
                  บันทึกลงระบบทันที แสดงผลบนแผงปฏิทินและรายการแจ้งเตือน โดยไม่ต้องเด้งไปอีเมลส่วนตัว
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsQuickAddOpen(false)}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Template Chips */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" /> เลือกแม่แบบด่วน (1-Click Fill):
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => applyQuickTemplate('ltc')}
                className="px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
              >
                <HeartPulse className="w-3 h-3 text-rose-600" />
                <span>เยี่ยมบ้าน & LTC</span>
              </button>

              <button
                type="button"
                onClick={() => applyQuickTemplate('inspection')}
                className="px-2.5 py-1 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
              >
                <Shield className="w-3 h-3 text-emerald-600" />
                <span>ตรวจสุขาภิบาล 25 ข้อ</span>
              </button>

              <button
                type="button"
                onClick={() => applyQuickTemplate('sewage')}
                className="px-2.5 py-1 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
              >
                <Truck className="w-3 h-3 text-amber-600" />
                <span>บริการสูบส้วม</span>
              </button>

              <button
                type="button"
                onClick={() => applyQuickTemplate('nhso')}
                className="px-2.5 py-1 rounded-lg border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
              >
                <Building2 className="w-3 h-3 text-sky-600" />
                <span>ประชุม สปสช. (กปท.)</span>
              </button>

              <button
                type="button"
                onClick={() => applyQuickTemplate('equipment')}
                className="px-2.5 py-1 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
              >
                <Sparkles className="w-3 h-3 text-indigo-600" />
                <span>ยืม-คืนกายอุปกรณ์</span>
              </button>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
            <div className="sm:col-span-8">
              <label className="block font-bold text-slate-700 mb-1">
                หัวข้อนัดหมาย / ภารกิจ: <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="เช่น ลงพื้นที่มอบกายอุปกรณ์ ม.2 หรือ ตรวจสุขาภิบาลประจำปี"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-emerald-600 bg-white"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block font-bold text-slate-700 mb-1">หมวดหมู่ระบบงาน:</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-emerald-600 bg-white"
              >
                <option value="ltc">🦼 LTC ผู้ป่วยติดเตียง</option>
                <option value="inspection">🏪 ตรวจสุขาภิบาล 25 ข้อ</option>
                <option value="sewage">🚛 บริการสูบส้วม/สิ่งปฏิกูล</option>
                <option value="nhso">🏥 โครงการ สปสช. (กปท.)</option>
                <option value="equipment">🩺 ยืม-คืนกายอุปกรณ์</option>
                <option value="general">📌 งานสาธารณสุขทั่วไป</option>
              </select>
            </div>

            <div className="sm:col-span-4">
              <label className="block font-semibold text-slate-700 mb-1">วันที่จัดกิจกรรม:</label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-emerald-600 bg-white"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block font-semibold text-slate-700 mb-1">เวลาเริ่ม:</label>
              <input
                type="time"
                value={formStartTime}
                onChange={(e) => setFormStartTime(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-emerald-600 bg-white"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block font-semibold text-slate-700 mb-1">เวลาสิ้นสุด:</label>
              <input
                type="time"
                value={formEndTime}
                onChange={(e) => setFormEndTime(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-emerald-600 bg-white"
              />
            </div>

            <div className="sm:col-span-6">
              <label className="block font-semibold text-slate-700 mb-1">สถานที่ / พิกัด:</label>
              <input
                type="text"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                placeholder="ตำบลบางเป้า อ.กันตัง จ.ตรัง"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-emerald-600 bg-white"
              />
            </div>

            <div className="sm:col-span-6">
              <label className="block font-semibold text-slate-700 mb-1">เจ้าหน้าที่ผู้รับผิดชอบ:</label>
              <input
                type="text"
                value={formOfficer}
                onChange={(e) => setFormOfficer(e.target.value)}
                placeholder="พยาบาลวิชาชีพ / นายตรวจสุขาภิบาล"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-emerald-600 bg-white"
              />
            </div>

            <div className="sm:col-span-12">
              <label className="block font-semibold text-slate-700 mb-1">รายละเอียดเพิ่มเติม:</label>
              <textarea
                rows={2}
                value={formDetails}
                onChange={(e) => setFormDetails(e.target.value)}
                placeholder="ระบุรายละเอียดเป้าหมาย อุปกรณ์ที่ต้องเตรียม หรือหมายเหตุ..."
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-emerald-600 bg-white resize-none"
              />
            </div>
          </div>

          {/* Form Action Buttons: 2 Clear options */}
          <div className="pt-2 border-t border-emerald-100 flex flex-wrap items-center justify-between gap-2.5">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>
                ผูกอีเมลหน่วยงาน: <strong className="text-emerald-800 font-mono">{calendarEmail}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setIsQuickAddOpen(false)}
                className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-slate-600 cursor-pointer"
              >
                ยกเลิก
              </button>

              {/* Primary: Direct save into system without jumping to personal calendar */}
              <button
                type="button"
                onClick={() => handleSaveQuickEvent(false)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all hover:scale-105 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>💾 บันทึกลงในระบบทันที</span>
              </button>

              {/* Secondary: Save to system AND invite bangpaohealthy@gmail.com on Google Calendar */}
              <button
                type="button"
                onClick={() => handleSaveQuickEvent(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-sm transition-all hover:scale-105 cursor-pointer"
                title="บันทึกลงระบบ พร้อมเปิดหน้า Google Calendar เพื่อส่งคำเชิญเข้า bangpaohealthy@gmail.com"
              >
                <CalendarIcon className="w-3.5 h-3.5 text-amber-300" />
                <span>บันทึก + ส่งเข้า Google Calendar</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Embedded Google Calendar Mode */}
      {viewMode === 'embed' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="font-bold flex items-center gap-1.5">
              <CalendarIcon className="w-4 h-4 text-emerald-600" /> Google Calendar สด ({calendarEmail})
            </span>
            <button
              type="button"
              onClick={openGoogleCalendarDirect}
              className="text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>เปิดเต็มจอใน Google Calendar</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
          <div className="w-full h-[480px] bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
            <iframe
              src={`https://calendar.google.com/calendar/embed?src=${encodeURIComponent(
                calendarEmail
              )}&ctz=Asia%2FBangkok&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=1&showCalendars=0&showTz=0&mode=MONTH`}
              title="Google Calendar bangpaohealthy@gmail.com"
              className="w-full h-full border-0"
            />
          </div>
        </div>
      )}

      {/* 4. Interactive 2-Column Grid: Calendar Board (Left) + Notification Agenda List (Right) */}
      {viewMode === 'interactive' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (5 Cols): Monthly Interactive Calendar Board */}
          <div className="lg:col-span-5 bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  {thaiMonthName} {thaiYear}
                </h4>
                <p className="text-[11px] text-slate-500">
                  {selectedDate ? `แสดงรายการของวันที่: ${selectedDate}` : 'คลิกเลือกวันที่เพื่อกรองรายการ'}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleGoToday}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer mr-1"
                >
                  วันนี้
                </button>
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition-all shadow-xs cursor-pointer"
                  title="เดือนก่อนหน้า"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition-all shadow-xs cursor-pointer"
                  title="เดือนถัดไป"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Days of Week Row */}
            <div className="grid grid-cols-7 text-center text-xs font-bold text-slate-500 py-1 border-b border-slate-200">
              <span className="text-rose-500">อา</span>
              <span>จ</span>
              <span>อ</span>
              <span>พ</span>
              <span>พฤ</span>
              <span>ศ</span>
              <span className="text-sky-600">ส</span>
            </div>

            {/* Calendar Days Matrix */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center text-xs font-semibold">
              {Array.from({ length: firstDayOfMonth }).map((_, i) => {
                const dayNum = prevMonthDays - firstDayOfMonth + i + 1;
                return (
                  <div key={`prev-${i}`} className="py-2 rounded-xl text-slate-300 pointer-events-none">
                    {dayNum}
                  </div>
                );
              })}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const formattedDay = String(dayNum).padStart(2, '0');
                const formattedMonth = String(month + 1).padStart(2, '0');
                const dateKey = `${year}-${formattedMonth}-${formattedDay}`;

                const isToday = dateKey === todayStr;
                const isSelected = dateKey === selectedDate;
                const dayEvents = events.filter((e) => e.date === dateKey);
                const hasEvents = dayEvents.length > 0;

                return (
                  <button
                    key={`day-${dayNum}`}
                    type="button"
                    onClick={() => {
                      if (selectedDate === dateKey) setSelectedDate(null);
                      else setSelectedDate(dateKey);
                    }}
                    className={`relative py-2 sm:py-2.5 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white font-black shadow-md scale-105'
                        : isToday
                        ? 'bg-emerald-100 text-emerald-900 font-black border-2 border-emerald-500'
                        : 'bg-white hover:bg-emerald-50 text-slate-700 border border-slate-100 hover:border-emerald-200'
                    }`}
                  >
                    <span>{dayNum}</span>

                    {hasEvents && (
                      <span className="flex items-center gap-0.5 mt-0.5">
                        {dayEvents.slice(0, 3).map((ev, idx) => {
                          const badge = getCategoryBadge(ev.category);
                          return (
                            <span
                              key={idx}
                              className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-amber-300' : badge.dot}`}
                            />
                          );
                        })}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Calendar Legend */}
            <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> ตรวจสุขาภิบาล
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> LTC เยี่ยมบ้าน
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> สูบส้วม
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" /> สปสช.
              </span>
            </div>
          </div>

          {/* Right Column (7 Cols): Calendar Notification Agenda List */}
          <div className="lg:col-span-7 space-y-4">
            {/* Filter Pills & Reset Button */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setCategoryFilter('all')}
                  className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                    categoryFilter === 'all'
                      ? 'bg-slate-900 text-white font-bold shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  ทั้งหมด ({events.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryFilter('urgent')}
                  className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                    categoryFilter === 'urgent'
                      ? 'bg-rose-600 text-white font-bold shadow-xs'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  🚨 เร่งด่วน / วันนี้
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryFilter('ltc')}
                  className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                    categoryFilter === 'ltc'
                      ? 'bg-rose-600 text-white font-bold shadow-xs'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  LTC เยี่ยมบ้าน
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryFilter('inspection')}
                  className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                    categoryFilter === 'inspection'
                      ? 'bg-emerald-600 text-white font-bold shadow-xs'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  ตรวจสุขาภิบาล
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryFilter('sewage')}
                  className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                    categoryFilter === 'sewage'
                      ? 'bg-amber-600 text-white font-bold shadow-xs'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  สูบส้วม
                </button>
              </div>

              {selectedDate && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="text-xs text-rose-600 hover:underline font-bold cursor-pointer"
                >
                  ล้างตัวกรองวันที่ ({selectedDate})
                </button>
              )}
            </div>

            {/* List of Notification Cards */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {filteredEvents.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                  <CalendarIcon className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <span>ไม่มีรายการนัดหมายในวันที่หรือหมวดหมู่ที่เลือก</span>
                </div>
              ) : (
                filteredEvents.map((ev) => {
                  const badge = getCategoryBadge(ev.category);
                  const urgency = getUrgencyText(ev.date);
                  const CategoryIcon = badge.icon;

                  return (
                    <div
                      key={ev.id}
                      className="bg-white rounded-2xl p-4 sm:p-4.5 border border-slate-200/80 hover:border-emerald-400 hover:shadow-md transition-all space-y-2.5 relative group"
                    >
                      {/* Top Meta Line: Urgency + Category Badge + Time + Delete Button */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide ${urgency.color}`}
                          >
                            {urgency.text}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.color}`}
                          >
                            <CategoryIcon className="w-3 h-3" />
                            <span>{badge.label}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-500 font-semibold flex items-center gap-1 mr-1">
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            <span>
                              {ev.date} • {ev.startTime} - {ev.endTime} น.
                            </span>
                          </span>

                          {/* ปุ่มแก้ไขข้อมูล */}
                          <button
                            type="button"
                            onClick={() => handleStartEdit(ev)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                            title="แก้ไขข้อมูลนัดหมายนี้"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {/* ปุ่มลบ (เปิดหน้าต่างยืนยันการลบแบบสวยงาม) */}
                          <button
                            type="button"
                            onClick={() => setEventToDelete(ev)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="ลบนัดหมายนี้ออกจากระบบ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Title */}
                      <h5 className="text-sm font-bold text-slate-900 group-hover:text-emerald-800 transition-colors leading-snug">
                        {ev.title}
                      </h5>

                      {/* Location & Officer */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 font-medium">
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span className="truncate">{ev.location}</span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">{ev.responsibleOfficer}</span>
                        </div>
                      </div>

                      {/* Details Snippet */}
                      <p className="text-xs text-slate-500 leading-relaxed bg-slate-50/80 p-2 rounded-xl border border-slate-100">
                        {ev.details}
                      </p>

                      {/* Card Footer: 1-Click Action Buttons */}
                      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="text-[11px] text-slate-400">
                          ซิงก์กับ: <span className="font-mono text-emerald-700">{calendarEmail}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* ปุ่มแก้ไขในแถบล่าง */}
                          <button
                            type="button"
                            onClick={() => handleStartEdit(ev)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold transition-all cursor-pointer hover:scale-105 shadow-2xs"
                            title="แก้ไขรายละเอียดนัดหมาย"
                          >
                            <Pencil className="w-3 h-3 text-amber-600" />
                            <span>แก้ไข</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => downloadIcs(ev)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 font-semibold transition-all cursor-pointer"
                            title="ดาวน์โหลดไฟล์ปฏิทิน .ics สำหรับนำเข้า"
                          >
                            <Download className="w-3 h-3 text-slate-500" />
                            <span>.ics</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => sendEventViaGmail(ev)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all cursor-pointer"
                            title="เปิดส่งอีเมลแจ้งเตือนผ่าน Gmail"
                          >
                            <Mail className="w-3 h-3 text-rose-500" />
                            <span>แจ้งทาง Gmail</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => launchEventInGoogleCalendar(ev)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-xs cursor-pointer hover:scale-105"
                            title="เปิดและบันทึกลงใน Google Calendar (เชิญ bangpaohealthy@gmail.com)"
                          >
                            <CalendarIcon className="w-3 h-3 text-amber-200" />
                            <span>เปิดใน Google Calendar</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-80" />
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
      )}

      {/* ==================================================== */}
      {/* 5. CUSTOM CONFIRMATION MODAL FOR DELETION (ข้อ 1)    */}
      {/* ==================================================== */}
      {eventToDelete && (
        <div className="fixed inset-0 z-[99999] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative overflow-hidden animate-in zoom-in-95 duration-150 space-y-4">
            {/* Top Warning Icon */}
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shadow-inner">
              <AlertTriangle className="w-7 h-7" />
            </div>

            {/* Modal Heading */}
            <div className="text-center space-y-1">
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                ยืนยันการลบรายการนัดหมาย
              </h3>
              <p className="text-xs text-slate-500">
                คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้ออกจากระบบการแจ้งเตือน? การกระทำนี้ไม่สามารถย้อนกลับได้
              </p>
            </div>

            {/* Event Summary Card */}
            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-2 text-xs">
              <div className="font-bold text-slate-800 text-sm leading-snug">
                {eventToDelete.title}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-slate-600">
                <span className="flex items-center gap-1 font-semibold">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>{eventToDelete.date} • {eventToDelete.startTime} - {eventToDelete.endTime} น.</span>
                </span>
              </div>
              <div className="flex items-center gap-1 text-slate-500 truncate">
                <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span className="truncate">{eventToDelete.location}</span>
              </div>
              <div className="flex items-center gap-1 text-slate-500 truncate">
                <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">{eventToDelete.responsibleOfficer}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setEventToDelete(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all hover:scale-105 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>ยืนยันการลบ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 6. CUSTOM MODAL FOR EDITING APPOINTMENT (ข้อ 2)      */}
      {/* ==================================================== */}
      {editingEvent && (
        <div className="fixed inset-0 z-[99999] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 relative overflow-hidden animate-in zoom-in-95 duration-150 space-y-4 my-8">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-xs">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    แก้ไขข้อมูลการนัดหมาย / ภารกิจ
                  </h3>
                  <p className="text-xs text-slate-500">
                    ปรับปรุงรายละเอียดในระบบปฏิทินกลางของกองสาธารณสุขและสิ่งแวดล้อม
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingEvent(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
              <div className="sm:col-span-8">
                <label className="block font-bold text-slate-700 mb-1">
                  หัวข้อนัดหมาย / ภารกิจ: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-emerald-600 bg-white"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block font-bold text-slate-700 mb-1">หมวดหมู่ระบบงาน:</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-emerald-600 bg-white"
                >
                  <option value="ltc">🦼 LTC ผู้ป่วยติดเตียง</option>
                  <option value="inspection">🏪 ตรวจสุขาภิบาล 25 ข้อ</option>
                  <option value="sewage">🚛 บริการสูบส้วม/สิ่งปฏิกูล</option>
                  <option value="nhso">🏥 โครงการ สปสช. (กปท.)</option>
                  <option value="equipment">🩺 ยืม-คืนกายอุปกรณ์</option>
                  <option value="general">📌 งานสาธารณสุขทั่วไป</option>
                </select>
              </div>

              <div className="sm:col-span-4">
                <label className="block font-semibold text-slate-700 mb-1">วันที่จัดกิจกรรม:</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-emerald-600 bg-white"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block font-semibold text-slate-700 mb-1">เวลาเริ่ม:</label>
                <input
                  type="time"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-emerald-600 bg-white"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block font-semibold text-slate-700 mb-1">เวลาสิ้นสุด:</label>
                <input
                  type="time"
                  value={editEndTime}
                  onChange={(e) => setEditEndTime(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-emerald-600 bg-white"
                />
              </div>

              <div className="sm:col-span-6">
                <label className="block font-semibold text-slate-700 mb-1">สถานที่ / พิกัด:</label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-emerald-600 bg-white"
                />
              </div>

              <div className="sm:col-span-6">
                <label className="block font-semibold text-slate-700 mb-1">เจ้าหน้าที่ผู้รับผิดชอบ:</label>
                <input
                  type="text"
                  value={editOfficer}
                  onChange={(e) => setEditOfficer(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-emerald-600 bg-white"
                />
              </div>

              <div className="sm:col-span-12">
                <label className="block font-semibold text-slate-700 mb-1">สถานะการดำเนินงาน:</label>
                <div className="flex flex-wrap items-center gap-4 py-1">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                    <input
                      type="radio"
                      name="editStatus"
                      value="pending"
                      checked={editStatus === 'pending'}
                      onChange={() => setEditStatus('pending')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>รอดำเนินการ</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                    <input
                      type="radio"
                      name="editStatus"
                      value="in_progress"
                      checked={editStatus === 'in_progress'}
                      onChange={() => setEditStatus('in_progress')}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span>กำลังดำเนินการ</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                    <input
                      type="radio"
                      name="editStatus"
                      value="completed"
                      checked={editStatus === 'completed'}
                      onChange={() => setEditStatus('completed')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>เสร็จสิ้นแล้ว</span>
                  </label>
                </div>
              </div>

              <div className="sm:col-span-12">
                <label className="block font-semibold text-slate-700 mb-1">รายละเอียดเพิ่มเติม:</label>
                <textarea
                  rows={3}
                  value={editDetails}
                  onChange={(e) => setEditDetails(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-emerald-600 bg-white resize-none"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditingEvent(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-slate-600 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all hover:scale-105 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>💾 บันทึกการแก้ไข</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
