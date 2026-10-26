import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Mail,
  ExternalLink,
  Plus,
  Clock,
  MapPin,
  Sparkles,
  X,
  Settings2,
  CheckCircle2,
  HeartPulse,
  Truck,
  Building2,
  Shield,
  Copy,
  ChevronRight,
  Info,
  Save,
  Download,
} from 'lucide-react';
import { CalendarEventItem } from './MunicipalCalendarPanel.tsx';

interface GoogleCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddEvent?: (newEvent: CalendarEventItem) => void;
}

export const GoogleCalendarModal: React.FC<GoogleCalendarModalProps> = ({
  isOpen,
  onClose,
  onAddEvent,
}) => {
  // Config state
  const [calendarEmail, setCalendarEmail] = useState<string>(() => {
    return localStorage.getItem('bangpao_calendar_email') || 'bangpaohealthy@gmail.com';
  });
  const [customEmbedUrl, setCustomEmbedUrl] = useState<string>(() => {
    return localStorage.getItem('bangpao_calendar_embed_url') || '';
  });
  const [isEditingSettings, setIsEditingSettings] = useState<boolean>(false);
  const [tempEmail, setTempEmail] = useState<string>(calendarEmail);
  const [tempEmbedUrl, setTempEmbedUrl] = useState<string>(customEmbedUrl);

  // Active sub-tab inside modal
  const [activeTab, setActiveTab] = useState<'quick_add' | 'embed' | 'mail' | 'upcoming'>('quick_add');

  // Custom Quick Event Form
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [eventStartTime, setEventStartTime] = useState('09:00');
  const [eventEndTime, setEventEndTime] = useState('12:00');
  const [eventLocation, setEventLocation] = useState('ตำบลบางเป้า อ.กันตัง จ.ตรัง');
  const [eventDetails, setEventDetails] = useState('');
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [modalToast, setModalToast] = useState<string | null>(null);

  // Gmail Compose Form
  const [mailTo, setMailTo] = useState('');
  const [mailSubject, setMailSubject] = useState('');
  const [mailBody, setMailBody] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTempEmail(calendarEmail);
      setTempEmbedUrl(customEmbedUrl);
    }
  }, [isOpen, calendarEmail, customEmbedUrl]);

  if (!isOpen) return null;

  // Save Settings
  const handleSaveSettings = () => {
    const trimmedEmail = tempEmail.trim() || 'bangpaohealthy@gmail.com';
    setCalendarEmail(trimmedEmail);
    setCustomEmbedUrl(tempEmbedUrl.trim());
    localStorage.setItem('bangpao_calendar_email', trimmedEmail);
    localStorage.setItem('bangpao_calendar_embed_url', tempEmbedUrl.trim());
    setIsEditingSettings(false);
  };

  // Helper to determine category
  const detectCategory = (title: string): CalendarEventItem['category'] => {
    if (title.includes('LTC') || title.includes('ผู้ป่วย')) return 'ltc';
    if (title.includes('สุขาภิบาล') || title.includes('ตรวจ')) return 'inspection';
    if (title.includes('ส้วม') || title.includes('สิ่งปฏิกูล')) return 'sewage';
    if (title.includes('สปสช') || title.includes('กปท')) return 'nhso';
    if (title.includes('กายอุปกรณ์') || title.includes('เตียง') || title.includes('ยืม')) return 'equipment';
    return 'general';
  };

  // 1. Direct Save to System (Does not bounce to personal email!)
  const handleSaveToSystem = (alsoOpenGoogleCal: boolean = false) => {
    if (!eventTitle.trim()) {
      alert('กรุณาระบุหัวข้อกิจกรรมหรือนัดหมาย');
      return;
    }

    const newEvent: CalendarEventItem = {
      id: `cal-${Date.now()}`,
      title: eventTitle.trim(),
      category: detectCategory(eventTitle),
      date: eventDate,
      startTime: eventStartTime,
      endTime: eventEndTime,
      location: eventLocation.trim() || 'เทศบาลตำบลบางเป้า',
      responsibleOfficer: 'กองสาธารณสุขและสิ่งแวดล้อม',
      details: eventDetails.trim() || 'กำหนดการปฏิบัติงานกองสาธารณสุขฯ ทต.บางเป้า',
      status: 'pending',
    };

    if (onAddEvent) {
      onAddEvent(newEvent);
    } else {
      try {
        const stored = localStorage.getItem('bangpao_calendar_events_v2');
        const list = stored ? JSON.parse(stored) : [];
        localStorage.setItem('bangpao_calendar_events_v2', JSON.stringify([newEvent, ...list]));
      } catch (e) {
        console.warn('Failed to cache event', e);
      }
    }

    setModalToast(`บันทึกนัดหมาย "${newEvent.title}" ลงในระบบเรียบร้อยแล้ว!`);
    setTimeout(() => {
      setModalToast(null);
      if (!alsoOpenGoogleCal) {
        onClose();
      }
    }, 1500);

    if (alsoOpenGoogleCal) {
      const url = buildGoogleCalendarUrl({
        title: eventTitle,
        details: eventDetails,
        location: eventLocation,
        date: eventDate,
        startTime: eventStartTime,
        endTime: eventEndTime,
      });
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // 2. Download .ics iCalendar file
  const handleDownloadIcs = () => {
    if (!eventTitle.trim()) {
      alert('กรุณาระบุหัวข้อกิจกรรมหรือนัดหมาย');
      return;
    }
    const cleanDate = eventDate.replace(/-/g, '');
    const start = `${cleanDate}T${eventStartTime.replace(/:/g, '')}00`;
    const end = `${cleanDate}T${eventEndTime.replace(/:/g, '')}00`;
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Bangpao Municipality//Health Calendar//TH',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:bangpao-${Date.now()}@bangpaohealthy.gmail.com`,
      `DTSTAMP:${cleanDate}T000000Z`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${eventTitle}`,
      `DESCRIPTION:${eventDetails.replace(/\n/g, '\\n')}`,
      `LOCATION:${eventLocation}`,
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

  // Helper: Open Google Calendar in browser with current Gmail (Fixed 404 URL)
  const openDirectGoogleCalendar = () => {
    // Correct URL syntax using authuser query param avoids Google 404 error
    const url = calendarEmail
      ? `https://calendar.google.com/calendar/r?authuser=${encodeURIComponent(calendarEmail)}`
      : 'https://calendar.google.com/calendar/r';
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Helper: Open Gmail Web App (Fixed URL)
  const openDirectGmail = () => {
    const url = calendarEmail
      ? `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(calendarEmail)}`
      : 'https://mail.google.com';
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Helper: Generate Google Calendar Web Intent Link
  const buildGoogleCalendarUrl = (params: {
    title: string;
    details: string;
    location: string;
    date: string;
    startTime: string;
    endTime: string;
  }) => {
    const cleanDate = params.date.replace(/-/g, '');
    const cleanStartTime = params.startTime.replace(/:/g, '') + '00';
    const cleanEndTime = params.endTime.replace(/:/g, '') + '00';
    const datesParam = `${cleanDate}T${cleanStartTime}/${cleanDate}T${cleanEndTime}`;

    const query = new URLSearchParams({
      action: 'TEMPLATE',
      text: params.title,
      details: params.details,
      location: params.location,
      dates: datesParam,
      add: calendarEmail,
      authuser: calendarEmail,
      ctz: 'Asia/Bangkok',
    });

    return `https://calendar.google.com/calendar/render?${query.toString()}`;
  };

  // 1-Click Launch Custom Event into Google Calendar
  const handleLaunchGoogleCalendarEvent = () => {
    if (!eventTitle.trim()) {
      alert('กรุณาระบุหัวข้อกิจกรรมหรือนัดหมาย');
      return;
    }
    const url = buildGoogleCalendarUrl({
      title: eventTitle,
      details: eventDetails,
      location: eventLocation,
      date: eventDate,
      startTime: eventStartTime,
      endTime: eventEndTime,
    });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // 1-Click Pre-filled Templates
  const handleApplyTemplate = (type: 'ltc' | 'inspection' | 'sewage' | 'nhso') => {
    const today = new Date().toISOString().split('T')[0];
    setEventDate(today);

    if (type === 'ltc') {
      setEventTitle('[LTC บางเป้า] ลงพื้นที่เยี่ยมบ้านและส่งมอบชุดดูแลกายอุปกรณ์');
      setEventStartTime('09:30');
      setEventEndTime('12:00');
      setEventLocation('ตำบลบางเป้า อ.กันตัง จ.ตรัง');
      setEventDetails(
        'กิจกรรม: ลงพื้นที่เยี่ยมบ้านผู้มีภาวะพึ่งพิง/ผู้ป่วยติดเตียง ตรวจประเมินสุขภาพ และมอบชุดดูแล LTC พร้อมผ้าอ้อมผู้ใหญ่ สปสช.\nหน่วยงาน: กองสาธารณสุขและสิ่งแวดล้อม เทศบาลตำบลบางเป้า'
      );
    } else if (type === 'inspection') {
      setEventTitle('[ตรวจสุขาภิบาล] ตรวจประเมินสุขลักษณะสถานประกอบการประจำปี 2569');
      setEventStartTime('10:00');
      setEventEndTime('12:00');
      setEventLocation('สถานประกอบการ เขตเทศบาลตำบลบางเป้า');
      setEventDetails(
        'กิจกรรม: นายตรวจสุขาภิบาลลงพื้นที่ตรวจประเมิน 25 ข้อ ตาม พ.ร.บ.การสาธารณสุข พ.ศ. 2535 เพื่อประกอบการพิจารณาออก/ต่ออายุใบอนุญาต อภ.2\nหน่วยงาน: กองสาธารณสุขและสิ่งแวดล้อม ทต.บางเป้า'
      );
    } else if (type === 'sewage') {
      setEventTitle('[บริการสูบส้วม] ให้บริการสูบสิ่งปฏิกูลตามคิวคำร้องประชาชน');
      setEventStartTime('13:30');
      setEventEndTime('15:30');
      setEventLocation('บ้านผู้ยื่นคำร้อง ตำบลบางเป้า อ.กันตัง');
      setEventDetails(
        'กิจกรรม: รถบรรทุกสิ่งปฏิกูล ทต.บางเป้า ออกให้บริการสูบส้วมและสิ่งปฏิกูลตามที่ได้รับคำร้อง\nหน่วยงาน: งานรักษาความสะอาดและสิ่งแวดล้อม ทต.บางเป้า'
      );
    } else if (type === 'nhso') {
      setEventTitle('[กปท. บางเป้า] ประชุมคณะกรรมการกองทุนหลักประกันสุขภาพตำบลบางเป้า');
      setEventStartTime('13:30');
      setEventEndTime('16:30');
      setEventLocation('ห้องประชุมเทศบาลตำบลบางเป้า');
      setEventDetails(
        'กิจกรรม: ประชุมพิจารณากลั่นกรองและอนุมัติโครงการส่งเสริมสุขภาพ เอกสารแนบ 6 กองทุน สปสช. ประจำปีงบประมาณ 2569\nประธาน: นายกเทศมนตรีตำบลบางเป้า'
      );
    }
  };

  // Helper: Open Gmail Compose
  const handleLaunchGmailCompose = () => {
    const query = new URLSearchParams({
      view: 'cm',
      fs: '1',
      to: mailTo,
      su: mailSubject,
      body: mailBody,
    });
    const url = `https://mail.google.com/mail/?${query.toString()}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Embed URL fallback
  const finalEmbedUrl =
    customEmbedUrl ||
    `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(
      calendarEmail
    )}&ctz=Asia%2FBangkok&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=1&showCalendars=0&showTz=0&mode=MONTH`;

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-800 via-teal-800 to-cyan-900 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/25 shadow-xs">
              <CalendarIcon className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white leading-tight">
                  ระบบปฏิทิน Google Calendar & Gmail
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-900 border border-amber-300 shadow-xs">
                  เชื่อมต่อสด
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                กองสาธารณสุขและสิ่งแวดล้อม เทศบาลตำบลบางเป้า • บันทึกนัดหมายและตารางงานสาธารณสุข
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditingSettings(!isEditingSettings)}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
              title="ตั้งค่าบัญชี Gmail / ลิงก์ปฏิทิน"
            >
              <Settings2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
              title="ปิดหน้าต่าง"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Gmail Connection Bar */}
        <div className="bg-emerald-50 px-4 py-2.5 border-b border-emerald-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-600">บัญชี Gmail ที่ผูกไว้:</span>
            <strong className="text-emerald-800 bg-white px-2.5 py-0.5 rounded-md border border-emerald-200 font-mono">
              {calendarEmail}
            </strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openDirectGoogleCalendar}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-xs cursor-pointer hover:scale-105"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-amber-200" />
              <span>เปิด Google Calendar</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </button>

            <button
              type="button"
              onClick={openDirectGmail}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold transition-all shadow-xs cursor-pointer hover:scale-105"
            >
              <Mail className="w-3.5 h-3.5 text-rose-300" />
              <span>เปิด Gmail</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </button>
          </div>
        </div>

        {/* Settings Drawer (Toggleable) */}
        {isEditingSettings && (
          <div className="bg-slate-50 p-4 border-b border-slate-200 animate-in slide-in-from-top-2 duration-150">
            <div className="max-w-xl mx-auto space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Settings2 className="w-3.5 h-3.5 text-emerald-600" /> ตั้งค่าบัญชี Google และลิงก์ปฏิทิน
                </span>
                <span className="text-[11px] text-slate-500">บันทึกลงเบราว์เซอร์อัตโนมัติ</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    อีเมล Gmail ของกอง/เจ้าหน้าที่:
                  </label>
                  <input
                    type="email"
                    value={tempEmail}
                    onChange={(e) => setTempEmail(e.target.value)}
                    placeholder="health.bangpao@gmail.com"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-emerald-600 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    URL ฝัง Google Calendar Embed (ถ้ามี):
                  </label>
                  <input
                    type="text"
                    value={tempEmbedUrl}
                    onChange={(e) => setTempEmbedUrl(e.target.value)}
                    placeholder="https://calendar.google.com/calendar/embed?src=..."
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-emerald-600 bg-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditingSettings(false)}
                  className="px-3 py-1 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="px-3.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition-all cursor-pointer shadow-xs"
                >
                  บันทึกการตั้งค่า
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Navigation Sub-tabs */}
        <div className="bg-slate-100/90 px-4 sm:px-6 pt-3 border-b border-slate-200 flex items-center gap-2 overflow-x-auto text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('quick_add')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'quick_add'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>สร้างนัดหมายลง Google Calendar ด่วน</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('embed')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'embed'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>ดูปฏิทิน Google Calendar สด</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mail')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'mail'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>ส่งแจ้งเตือนผ่าน Gmail</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50/50 space-y-5">
          {/* TAB 1: QUICK ADD TO GOOGLE CALENDAR */}
          {activeTab === 'quick_add' && (
            <div className="space-y-5">
              {/* Quick Template Selector */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  เลือกแม่แบบงานบริการสาธารณสุขเพื่อสร้างนัดหมายด่วน (1-Click Template):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate('ltc')}
                    className="p-2.5 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-900 text-left transition-all hover:scale-[1.02] cursor-pointer shadow-xs"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <HeartPulse className="w-3.5 h-3.5 text-rose-600" />
                      <span>เยี่ยมบ้าน & LTC</span>
                    </div>
                    <p className="text-[10px] text-rose-700/80 mt-1 truncate">ส่งมอบชุดดูแล LTC</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyTemplate('inspection')}
                    className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 text-left transition-all hover:scale-[1.02] cursor-pointer shadow-xs"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Shield className="w-3.5 h-3.5 text-emerald-600" />
                      <span>ตรวจสุขาภิบาล</span>
                    </div>
                    <p className="text-[10px] text-emerald-700/80 mt-1 truncate">ตรวจกิจการ 25 ข้อ</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyTemplate('sewage')}
                    className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-amber-900 text-left transition-all hover:scale-[1.02] cursor-pointer shadow-xs"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Truck className="w-3.5 h-3.5 text-amber-600" />
                      <span>บริการสูบส้วม</span>
                    </div>
                    <p className="text-[10px] text-amber-700/80 mt-1 truncate">คิวสูบสิ่งปฏิกูล</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyTemplate('nhso')}
                    className="p-2.5 rounded-xl border border-sky-200 bg-sky-50/70 hover:bg-sky-100 text-sky-900 text-left transition-all hover:scale-[1.02] cursor-pointer shadow-xs"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Building2 className="w-3.5 h-3.5 text-sky-600" />
                      <span>ประชุม สปสช.</span>
                    </div>
                    <p className="text-[10px] text-sky-700/80 mt-1 truncate">กองทุน กปท. บางเป้า</p>
                  </button>
                </div>
              </div>

              {/* Event Editor Form */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <CalendarIcon className="w-4 h-4 text-emerald-600" /> รายละเอียดกิจกรรม / นัดหมาย
                  </h4>
                  <span className="text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                    ซิงก์เข้า Google Calendar ของคุณทันที
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ชื่อกิจกรรม / นัดหมาย: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    placeholder="เช่น นัดลงพื้นที่เยี่ยมบ้านผู้ป่วย LTC หมู่ 3 หรือ ตรวจสุขาภิบาลร้านค้า"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-emerald-600 text-xs sm:text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      <Clock className="w-3 h-3 inline mr-1 text-slate-400" /> วันที่จัดกิจกรรม:
                    </label>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-emerald-600 text-xs bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">เวลาเริ่ม:</label>
                    <input
                      type="time"
                      value={eventStartTime}
                      onChange={(e) => setEventStartTime(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-emerald-600 text-xs bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">เวลาสิ้นสุด:</label>
                    <input
                      type="time"
                      value={eventEndTime}
                      onChange={(e) => setEventEndTime(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-emerald-600 text-xs bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    <MapPin className="w-3 h-3 inline mr-1 text-slate-400" /> สถานที่ / พิกัด:
                  </label>
                  <input
                    type="text"
                    value={eventLocation}
                    onChange={(e) => setEventLocation(e.target.value)}
                    placeholder="ตำบลบางเป้า อ.กันตัง จ.ตรัง"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-emerald-600 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    บันทึกข้อความ / รายละเอียดเพิ่มเติม:
                  </label>
                  <textarea
                    rows={3}
                    value={eventDetails}
                    onChange={(e) => setEventDetails(e.target.value)}
                    placeholder="ระบุวัตถุประสงค์ ผู้รับผิดชอบ หรือรายชื่อผู้ป่วย/ผู้ประกอบการ..."
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-emerald-600 text-xs resize-none"
                  />
                </div>

                {/* Toast inside modal */}
                {modalToast && (
                  <div className="p-3 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-2 shadow-md animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-amber-300" />
                    <span>{modalToast}</span>
                  </div>
                )}

                <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>
                      อีเมลเป้าหมาย: <strong className="font-mono text-emerald-800">{calendarEmail}</strong>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 ml-auto">
                    {/* iCal download */}
                    <button
                      type="button"
                      onClick={handleDownloadIcs}
                      className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                      title="ดาวน์โหลดไฟล์ปฏิทิน .ics สำหรับนำเข้าอุปกรณ์"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      <span>ดาวน์โหลด .ics</span>
                    </button>

                    {/* Secondary: Save to system AND open Google Calendar */}
                    <button
                      type="button"
                      onClick={() => handleSaveToSystem(true)}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs hover:scale-105 cursor-pointer"
                      title="บันทึกเข้าสู่ระบบ และเปิด Google Calendar เพื่อส่งคำเชิญไปยัง bangpaohealthy@gmail.com"
                    >
                      <CalendarIcon className="w-3.5 h-3.5 text-amber-300" />
                      <span>บันทึก + เปิด Google Calendar</span>
                      <ExternalLink className="w-3 h-3 opacity-80" />
                    </button>

                    {/* Primary: Direct save into system without jumping to personal calendar */}
                    <button
                      type="button"
                      onClick={() => handleSaveToSystem(false)}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md hover:scale-105 cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>💾 บันทึกลงในระบบทันที</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EMBEDDED GOOGLE CALENDAR VIEW */}
          {activeTab === 'embed' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold flex items-center gap-1.5">
                  <CalendarIcon className="w-4 h-4 text-emerald-600" /> ตารางปฏิทิน Google Calendar แบบฝังสด
                </span>
                <button
                  type="button"
                  onClick={openDirectGoogleCalendar}
                  className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>เปิดเต็มจอใน Google Calendar</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              <div className="w-full h-[450px] bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative">
                <iframe
                  src={finalEmbedUrl}
                  title="Google Calendar เทศบาลตำบลบางเป้า"
                  className="w-full h-full border-0"
                />
              </div>
              <p className="text-[11px] text-slate-400 text-center">
                *หากปฏิทินไม่แสดงผล อาจเกิดจากสิทธิ์การแชร์ของ Google Calendar ต้องตั้งเป็นสาธารณะ (Public) หรือเปิดผ่านปุ่มด้านบน
              </p>
            </div>
          )}

          {/* TAB 3: GMAIL NOTIFICATION COMPOSE */}
          {activeTab === 'mail' && (
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-rose-600" /> ส่งหนังสือแจ้งเตือน / นัดหมายผ่าน Gmail
                </h4>
                <span className="text-[11px] text-slate-500">เปิดส่งผ่านแอป Gmail ทันที</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ส่งถึง (Email ผู้รับ):
                </label>
                <input
                  type="email"
                  value={mailTo}
                  onChange={(e) => setMailTo(e.target.value)}
                  placeholder="citizen@example.com หรือเจ้าหน้าที่ผู้เกี่ยวข้อง"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-emerald-600 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หัวข้ออีเมล (Subject):
                </label>
                <input
                  type="text"
                  value={mailSubject}
                  onChange={(e) => setMailSubject(e.target.value)}
                  placeholder="แจ้งกำหนดการลงพื้นที่ / แจ้งเตือนการต่ออายุใบอนุญาต กองสาธารณสุขฯ"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-emerald-600 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เนื้อหาอีเมล (Message):
                </label>
                <textarea
                  rows={4}
                  value={mailBody}
                  onChange={(e) => setMailBody(e.target.value)}
                  placeholder="เรียน ประชาชน/เจ้าหน้าที่... ขอแจ้งกำหนดการปฏิบัติงานของกองสาธารณสุขและสิ่งแวดล้อม..."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-emerald-600 text-xs resize-none"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleLaunchGmailCompose}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md hover:scale-105 cursor-pointer"
                >
                  <Mail className="w-4 h-4 text-rose-300" />
                  <span>เปิดส่งด้วย Gmail ทันที</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-90" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-3 sm:p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>เชื่อมต่อ Google Workspace & Gmail กองสาธารณสุขและสิ่งแวดล้อม ทต.บางเป้า</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold transition-colors cursor-pointer"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
