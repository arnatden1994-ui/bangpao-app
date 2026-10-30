import React, { useState, useEffect } from 'react';
import {
  X,
  Megaphone,
  Upload,
  FileText,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  User,
  Building,
  Hash,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ExternalLink,
  Eye,
  Bell,
} from 'lucide-react';
import {
  CalendarEventItem,
  ActivityDocType,
  ACTIVITY_DOC_TYPES,
  CalendarAttachment,
} from './MunicipalCalendarPanel.tsx';
import {
  uploadFileToCloud,
  deleteFileFromCloud,
  ACCEPTED_FILE_TYPES,
} from '../services/fileStorageService.ts';
import { toLocalDateStr, formatFileSize } from '../utils/dateUtils.ts';

interface ActivityAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: CalendarEventItem) => Promise<void> | void;
  /** กิจกรรมที่มีอยู่เดิมสำหรับแก้ไข (ถ้าไม่มี = สร้างใหม่) */
  editingEvent?: CalendarEventItem | null;
  /** วันที่เริ่มต้นที่เลือกไว้จากปฏิทิน */
  presetDate?: string;
  onOpenAttachment?: (att: CalendarAttachment, ev?: CalendarEventItem) => void;
}

export const ActivityAnnouncementModal: React.FC<ActivityAnnouncementModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingEvent,
  presetDate,
  onOpenAttachment,
}) => {
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState<ActivityDocType>('invitation_training');
  const [docNo, setDocNo] = useState('');
  const [fromAgency, setFromAgency] = useState('');
  const [date, setDate] = useState(() => presetDate || toLocalDateStr());
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('16:30');
  const [location, setLocation] = useState('ห้องประชุมเทศบาลตำบลบางเป้า');
  const [responsibleOfficer, setResponsibleOfficer] = useState('กองสาธารณสุขและสิ่งแวดล้อม');
  const [details, setDetails] = useState('');
  const [notifyLine, setNotifyLine] = useState(true);
  const [notifyTiming, setNotifyTiming] = useState<'instant' | 'on_date_morning' | 'day_before' | 'custom'>('instant');
  const [customNotifyDate, setCustomNotifyDate] = useState('');
  const [status, setStatus] = useState<CalendarEventItem['status']>('pending');

  const [attachments, setAttachments] = useState<CalendarAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Quick preset templates
  const applyPreset = (preset: {
    type: ActivityDocType;
    sampleTitle: string;
    sampleAgency: string;
    sampleLoc: string;
    sampleDetails: string;
  }) => {
    setDocType(preset.type);
    setTitle(preset.sampleTitle);
    setFromAgency(preset.sampleAgency);
    setLocation(preset.sampleLoc);
    setDetails(preset.sampleDetails);
  };

  useEffect(() => {
    if (editingEvent) {
      setTitle(editingEvent.title || '');
      setDocType(editingEvent.docType || 'invitation_training');
      setDocNo(editingEvent.docNo || '');
      setFromAgency(editingEvent.fromAgency || '');
      setDate(editingEvent.date || toLocalDateStr());
      setEndDate(editingEvent.endDate || '');
      setStartTime(editingEvent.startTime || '09:00');
      setEndTime(editingEvent.endTime || '16:30');
      setLocation(editingEvent.location || 'ห้องประชุมเทศบาลตำบลบางเป้า');
      setResponsibleOfficer(editingEvent.responsibleOfficer || 'กองสาธารณสุขและสิ่งแวดล้อม');
      setDetails(editingEvent.details || '');
      setStatus(editingEvent.status || 'pending');
      setAttachments(editingEvent.attachments || []);
    } else {
      setTitle('');
      setDocType('invitation_training');
      setDocNo('');
      setFromAgency('');
      setDate(presetDate || toLocalDateStr());
      setEndDate('');
      setStartTime('09:00');
      setEndTime('16:30');
      setLocation('ห้องประชุมเทศบาลตำบลบางเป้า');
      setResponsibleOfficer('กองสาธารณสุขและสิ่งแวดล้อม');
      setDetails('');
      setStatus('pending');
      setAttachments([]);
    }
    setUploadError(null);
    setUploadProgress(0);
  }, [editingEvent, presetDate, isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setUploadError(null);

    try {
      const newAtts: CalendarAttachment[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(Math.round(((i + 0.1) / files.length) * 100));
        const att = await uploadFileToCloud(file, (p) => {
          setUploadProgress(Math.round(((i + p / 100) / files.length) * 100));
        });
        newAtts.push(att);
      }
      setAttachments((prev) => [...prev, ...newAtts]);
    } catch (err: any) {
      console.error('File upload error:', err);
      setUploadError(err?.message || 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = async (attId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attId));
    deleteFileFromCloud(attId).catch((err) => console.warn('Delete chunk warning:', err));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('กรุณากรอกหัวข้อกิจกรรมหรือชื่อหนังสือ');
      return;
    }

    setIsSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const eventItem: CalendarEventItem = {
        id: editingEvent?.id || `act-${Date.now()}`,
        title: title.trim(),
        category: 'activity',
        docType,
        docNo: docNo.trim() || undefined,
        fromAgency: fromAgency.trim() || undefined,
        date: date || toLocalDateStr(),
        endDate: endDate && endDate >= date ? endDate : undefined,
        startTime,
        endTime,
        location: location.trim() || 'ตำบลบางเป้า อ.กันตัง จ.ตรัง',
        responsibleOfficer: responsibleOfficer.trim() || 'กองสาธารณสุขและสิ่งแวดล้อม',
        details: details.trim(),
        status,
        attachments,
        notifyLine,
        notifyTiming,
        customNotifyDate: notifyTiming === 'custom' ? customNotifyDate : undefined,
        createdAt: editingEvent?.createdAt || nowIso,
        updatedAt: nowIso,
        completedAt: status === 'completed' ? editingEvent?.completedAt || nowIso : undefined,
      };

      await onSave(eventItem);
      onClose();
    } catch (err: any) {
      alert(`บันทึกไม่สำเร็จ: ${err?.message || String(err)}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 relative overflow-hidden animate-in zoom-in-95 duration-150 my-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 text-white flex items-center justify-center shadow-md shadow-violet-600/20 shrink-0">
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                {editingEvent ? 'แก้ไขกิจกรรม / หนังสือราชการ' : '📢 ประชาสัมพันธ์กิจกรรม & หนังสือเชิญ'}
              </h3>
              <p className="text-xs text-slate-500">
                บันทึกแผนลงปฏิทินกลาง อัปโหลดไฟล์หนังสือราชการ A4/PDF และเปิดดูได้ทุกอุปกรณ์
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 py-4 space-y-4 text-xs">
          {/* Quick presets (only when creating new) */}
          {!editingEvent && (
            <div className="space-y-1.5 p-3 rounded-2xl bg-gradient-to-r from-violet-50 to-fuchsia-50 border border-violet-200">
              <div className="flex items-center gap-1.5 font-bold text-violet-900">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>เลือกแม่แบบด่วน (1-Click Template):</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    applyPreset({
                      type: 'invitation_training',
                      sampleTitle: 'ขอเชิญเข้ารับการฝึกอบรมการบริหารจัดการสุขาภิบาลสิ่งแวดล้อม',
                      sampleAgency: 'สำนักงานสาธารณสุขจังหวัดตรัง (สสจ.ตรัง)',
                      sampleLoc: 'โรงแรมเรือรัษฎา อ.เมือง จ.ตรัง',
                      sampleDetails: 'ฝึกอบรมพัฒนาศักยภาพเจ้าหน้าที่และผู้ปฏิบัติงานด้านสาธารณสุขท้องถิ่น',
                    })
                  }
                  className="px-2.5 py-1 rounded-xl bg-white hover:bg-violet-100 text-violet-900 border border-violet-200 font-semibold cursor-pointer shadow-2xs"
                >
                  🎓 เชิญอบรม สสจ.ตรัง
                </button>
                <button
                  type="button"
                  onClick={() =>
                    applyPreset({
                      type: 'invitation_meeting',
                      sampleTitle: 'ขอเชิญประชุมคณะกรรมการหลักประกันสุขภาพตำบลบางเป้า (กปท.) ครั้งที่ 1/2570',
                      sampleAgency: 'กองทุนหลักประกันสุขภาพตำบลบางเป้า',
                      sampleLoc: 'ห้องประชุมเทศบาลตำบลบางเป้า',
                      sampleDetails: 'พิจารณาอนุมัติแผนงานโครงการส่งเสริมสุขภาพชุมชนและผู้สูงอายุ LTC',
                    })
                  }
                  className="px-2.5 py-1 rounded-xl bg-white hover:bg-sky-100 text-sky-900 border border-sky-200 font-semibold cursor-pointer shadow-2xs"
                >
                  🗂️ ประชุม กปท.
                </button>
                <button
                  type="button"
                  onClick={() =>
                    applyPreset({
                      type: 'invitation_event',
                      sampleTitle: 'ขอเชิญร่วมกิจกรรมจิตอาสาพัฒนาสิ่งแวดล้อมและกำจัดแหล่งเพาะพันธุ์ยุงลาย',
                      sampleAgency: 'อำเภอกันตัง / ทต.บางเป้า',
                      sampleLoc: 'บริเวณคูระบายน้ำตลาดสดและหมู่ที่ 3 ต.บางเป้า',
                      sampleDetails: 'กิจกรรม Big Cleaning Day รณรงค์ป้องกันโรคไข้เลือดออกร่วมกับ อสม. และประชาชน',
                    })
                  }
                  className="px-2.5 py-1 rounded-xl bg-white hover:bg-pink-100 text-pink-900 border border-pink-200 font-semibold cursor-pointer shadow-2xs"
                >
                  🎉 ร่วมกิจกรรม/จิตอาสา
                </button>
                <button
                  type="button"
                  onClick={() =>
                    applyPreset({
                      type: 'announcement',
                      sampleTitle: 'ประชาสัมพันธ์กำหนดการฉีดวัคซีนป้องกันโรคพิษสุนัขบ้า ประจำปีงบประมาณ 2570',
                      sampleAgency: 'กองสาธารณสุขและสิ่งแวดล้อม เทศบาลตำบลบางเป้า',
                      sampleLoc: 'ศาลาอเนกประสงค์ หมู่ที่ 1-7 ตำบลบางเป้า',
                      sampleDetails: 'ให้บริการฉีดวัคซีนป้องกันโรคพิษสุนัขบ้าฟรีแก่สุนัขและแมวในเขตเทศบาล',
                    })
                  }
                  className="px-2.5 py-1 rounded-xl bg-white hover:bg-orange-100 text-orange-900 border border-orange-200 font-semibold cursor-pointer shadow-2xs"
                >
                  📢 ประชาสัมพันธ์ฉีดวัคซีน
                </button>
              </div>
            </div>
          )}

          {/* Type of Document */}
          <div className="space-y-1">
            <label className="block font-bold text-slate-700">
              ประเภทหนังสือ / กิจกรรม: <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(ACTIVITY_DOC_TYPES) as ActivityDocType[]).map((key) => {
                const meta = ACTIVITY_DOC_TYPES[key];
                const isSelected = docType === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDocType(key)}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-violet-500 bg-violet-50 text-violet-900 font-bold shadow-xs ring-1 ring-violet-400'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="text-base">{meta.emoji}</span>
                    <span className="truncate">{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              หัวข้อกิจกรรม / ชื่อเรื่องหนังสือ: <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น ขอเชิญเข้าร่วมการประชุมเชิงปฏิบัติการพัฒนาศักยภาพผู้ดูแลผู้มีภาวะพึ่งพิง (Caregiver)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-violet-600 bg-white font-medium"
            />
          </div>

          {/* Doc No & Issuing Agency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                <span>เลขที่หนังสือราชการ (ถ้ามี):</span>
              </label>
              <input
                type="text"
                value={docNo}
                onChange={(e) => setDocNo(e.target.value)}
                placeholder="เช่น ตง 0023.4/ว 1234"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-violet-600 bg-white font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>หน่วยงานต้นสังกัด / ผู้เชิญ:</span>
              </label>
              <input
                type="text"
                value={fromAgency}
                onChange={(e) => setFromAgency(e.target.value)}
                placeholder="เช่น สสจ.ตรัง, อำเภอกันตัง, รพ.สต."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-violet-600 bg-white"
              />
            </div>
          </div>

          {/* Dates & Times */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6">
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>วันที่เริ่มกิจกรรม: <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-violet-600 bg-white"
              />
            </div>
            <div className="sm:col-span-6">
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>ถึงวันที่ (กรณีหลายวัน):</span>
              </label>
              <input
                type="date"
                value={endDate}
                min={date}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="เว้นว่างถ้าจัดวันเดียว"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-violet-600 bg-white"
              />
            </div>

            <div className="sm:col-span-6">
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>เวลาเริ่ม:</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-violet-600 bg-white"
              />
            </div>
            <div className="sm:col-span-6">
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>เวลาสิ้นสุด:</span>
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-violet-600 bg-white"
              />
            </div>
          </div>

          {/* Location & Responsible Officer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <span>สถานที่จัดกิจกรรม / พิกัด:</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="เช่น ห้องประชุมเทศบาลตำบลบางเป้า หรือ โรงแรมเรือรัษฎา"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-violet-600 bg-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>ผู้รับผิดชอบ / เจ้าหน้าที่ผู้เข้าร่วม:</span>
              </label>
              <input
                type="text"
                value={responsibleOfficer}
                onChange={(e) => setResponsibleOfficer(e.target.value)}
                placeholder="เช่น พันจ่าเอกอานัส เด็นหมาด, เจ้าหน้าที่กองสาธารณสุข"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-violet-600 bg-white"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">สถานะกิจกรรม:</label>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="pending"
                  checked={status === 'pending'}
                  onChange={() => setStatus('pending')}
                  className="accent-violet-600"
                />
                <span className="font-semibold text-slate-700">รอดำเนินการ / นัดหมายไว้</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="in_progress"
                  checked={status === 'in_progress'}
                  onChange={() => setStatus('in_progress')}
                  className="accent-amber-600"
                />
                <span className="font-semibold text-slate-700">กำลังดำเนินการ</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="completed"
                  checked={status === 'completed'}
                  onChange={() => setStatus('completed')}
                  className="accent-emerald-600"
                />
                <span className="font-semibold text-emerald-800">✅ เข้าร่วมแล้ว / เสร็จสิ้นภารกิจ</span>
              </label>
            </div>
          </div>

          {/* Details / Agenda */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              รายละเอียด / กำหนดการ / วาระการประชุม:
            </label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="ระบุวาระการประชุม วัตถุประสงค์ หรือเอกสารที่ต้องจัดเตรียมไป..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-violet-600 bg-white resize-none"
            />
          </div>

          {/* FILE UPLOAD ZONE (ระบบอัปโหลดไฟล์หนังสือเชิญ / รูปภาพ / เอกสารประกอบ) */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                <Paperclip className="w-4 h-4 text-violet-600" />
                <span>ไฟล์แนบหนังสือราชการ / เอกสารประกอบ / ภาพกิจกรรม:</span>
              </label>
              <span className="text-[11px] text-slate-400">รองรับ PDF, Word, Excel, รูปภาพ (สูงสุด 15MB/ไฟล์)</span>
            </div>

            {/* Drag & Drop / Click Upload Box */}
            <label className="relative flex flex-col items-center justify-center p-4 border-2 border-dashed border-violet-300 hover:border-violet-500 rounded-2xl bg-violet-50/40 hover:bg-violet-50/80 transition-all cursor-pointer group">
              <input
                type="file"
                multiple
                accept={ACCEPTED_FILE_TYPES}
                disabled={isUploading}
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="w-10 h-10 rounded-2xl bg-white border border-violet-200 text-violet-600 flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform mb-1.5">
                {isUploading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-violet-600" />
                ) : (
                  <Upload className="w-5 h-5 text-violet-600" />
                )}
              </div>
              <p className="text-xs font-bold text-slate-800">
                {isUploading ? `กำลังอัปโหลดไฟล์ (${uploadProgress}%)...` : 'คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                หนังสือเชิญตัวจริง (.PDF), ไฟล์นำเสนอ (.PPTX), รายชื่อผู้เข้าร่วม (.DOCX/.XLSX)
              </p>
            </label>

            {uploadError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* List of Uploaded Attachments */}
            {attachments.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-600">
                  ไฟล์ที่แนบแล้ว ({attachments.length} ไฟล์):
                </span>
                <div className="space-y-1.5">
                  {attachments.map((att) => {
                    const isPdf = att.mimeType === 'application/pdf' || att.name.toLowerCase().endsWith('.pdf');
                    const isImg = att.mimeType.startsWith('image/');
                    return (
                      <div
                        key={att.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-violet-300 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center shrink-0 font-bold text-[10px]">
                            {isPdf ? 'PDF' : isImg ? 'IMG' : 'DOC'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-800 truncate leading-snug">{att.name}</p>
                            <p className="text-[10px] text-slate-400">{formatFileSize(att.size)}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {onOpenAttachment && (
                            <button
                              type="button"
                              onClick={() => onOpenAttachment(att)}
                              className="px-2.5 py-1 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>เปิดดู</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(att.id)}
                            className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="ลบไฟล์นี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>


          {/* 🔔 ตั้งค่าการแจ้งเตือนเข้ากลุ่ม LINE & อีเมล */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50/70 via-purple-50/60 to-emerald-50/60 border border-indigo-200/80 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="inline-flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyLine}
                  onChange={(e) => setNotifyLine(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-indigo-600" />
                    <span>ส่งแจ้งเตือนเข้ากลุ่ม LINE กองสาธารณสุข & อีเมล</span>
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    (ปลดเครื่องหมายถูกออก หากต้องการบันทึกเงียบๆ โดยไม่รบกวนกลุ่ม LINE)
                  </span>
                </div>
              </label>
            </div>

            {notifyLine && (
              <div className="space-y-2 pt-2 border-t border-indigo-100 animate-in fade-in duration-200">
                <label className="block text-[11px] font-bold text-slate-700">
                  เลือกช่วงเวลาที่ต้องการให้ระบบส่งแจ้งเตือน:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setNotifyTiming('instant')}
                    className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold transition-all text-center cursor-pointer ${
                      notifyTiming === 'instant'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    ⚡ ส่งทันทีที่บันทึก
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotifyTiming('on_date_morning')}
                    className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold transition-all text-center cursor-pointer ${
                      notifyTiming === 'on_date_morning'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    🌅 เช้าวันจัดงาน (07:30 น.)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotifyTiming('day_before')}
                    className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold transition-all text-center cursor-pointer ${
                      notifyTiming === 'day_before'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    ⏰ ล่วงหน้า 1 วัน (08:00 น.)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotifyTiming('custom')}
                    className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold transition-all text-center cursor-pointer ${
                      notifyTiming === 'custom'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    🗓️ กำหนดวันเอง
                  </button>
                </div>

                {notifyTiming === 'custom' && (
                  <div className="pt-1 flex items-center gap-2">
                    <span className="text-xs text-slate-600 font-medium">ระบุวันที่ต้องการให้ส่งแจ้งเตือน:</span>
                    <input
                      type="date"
                      value={customNotifyDate}
                      onChange={(e) => setCustomNotifyDate(e.target.value)}
                      className="px-2.5 py-1 text-xs rounded-lg border border-purple-300 focus:outline-purple-500 bg-white"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-slate-600 cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white font-bold text-xs shadow-md transition-all hover:scale-105 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>💾 บันทึกลงปฏิทิน & คลังเอกสาร</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
