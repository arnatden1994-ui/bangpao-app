import React, { useState, useEffect } from 'react';
import {
  Bell,
  Mail,
  MessageSquare,
  FileText,
  Download,
  Printer,
  Send,
  CheckCircle2,
  Copy,
  Check,
  Eye,
  Trash2,
  Sparkles,
  Calendar,
  Stethoscope,
  Truck,
  Megaphone,
  Clock,
  ExternalLink,
  Save,
  RefreshCw,
} from 'lucide-react';
import { SignerSettings, PublicPetition, EquipmentLoan } from '../types/index.ts';
import {
  NotificationSettings,
  NotificationLogItem,
  NotificationAttachment,
  getStoredNotificationSettings,
  saveStoredNotificationSettings,
  getStoredNotificationLogs,
  clearNotificationLogs,
  buildPetitionNotificationPayload,
  buildEquipmentLoanNotificationPayload,
  buildCalendarNotificationPayload,
  dispatchNotification,
  downloadAttachmentDocx,
  openAttachmentPrintableHtml,
  getCompleteGasNotificationCode,
} from '../services/notificationService.ts';

interface NotificationSettingsPanelProps {
  signerSettings: SignerSettings;
  gasUrl?: string;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const NotificationSettingsPanel: React.FC<NotificationSettingsPanelProps> = ({
  signerSettings,
  gasUrl,
  showToast,
}) => {
  const [settings, setSettings] = useState<NotificationSettings>(() => getStoredNotificationSettings());
  const [logs, setLogs] = useState<NotificationLogItem[]>(() => getStoredNotificationLogs());
  const [isSendingTest, setIsSendingTest] = useState<string | null>(null);
  const [copiedGasCode, setCopiedGasCode] = useState(false);
  const [showGasCodeModal, setShowGasCodeModal] = useState(false);
  const [previewLog, setPreviewLog] = useState<NotificationLogItem | null>(null);

  useEffect(() => {
    setLogs(getStoredNotificationLogs());
  }, []);

  const handleSaveSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    saveStoredNotificationSettings(settings);
    showToast('success', 'บันทึกการตั้งค่าระบบแจ้งเตือน LINE กลุ่ม & อีเมลพร้อมไฟล์แนบแบบฟอร์มเรียบร้อยแล้ว');
  };

  const handleSendTest = async (
    testType: 'general_petition' | 'sewage_petition' | 'medical_loan' | 'calendar_event'
  ) => {
    setIsSendingTest(testType);
    saveStoredNotificationSettings(settings);

    try {
      let payload;
      if (testType === 'general_petition') {
        const samplePetition: PublicPetition & Record<string, any> = {
          id: 'REQ-2569-TEST01',
          trackingCode: 'REQ-2569-089',
          submissionDate: new Date().toISOString().slice(0, 10),
          citizenName: 'นายสมชาย รักบางเป้า',
          citizenIdCard: '1-9203-00145-88-9',
          phone: '081-234-5678',
          moo: '3',
          village: 'หมู่ที่ 3 บ้านตลาดใหม่',
          address: 'บ้านเลขที่ 45/2 หมู่ที่ 3 บ้านตลาดใหม่ ต.บางเป้า อ.กันตัง จ.ตรัง',
          title: 'เหตุรำคาญ (กลิ่น/ควัน/น้ำเสีย/ขยะ)',
          category: 'nuisance_smell',
          description:
            'ขอความอนุเคราะห์เจ้าหน้าที่กองสาธารณสุขฯ ลงพื้นที่ตรวจสอบปัญหาน้ำเสียและกลิ่นรบกวนบริเวณคูระบายน้ำข้างตลาดใหม่ เพื่อบรรเทาความเดือดร้อนของประชาชน',
          status: 'pending',
          assignedOfficer: 'นายตรวจสุขาภิบาล กองสาธารณสุขฯ',
          latitude: 7.416288,
          longitude: 99.519842,
          createdAt: new Date().toISOString(),
        };
        payload = buildPetitionNotificationPayload(samplePetition, signerSettings);
      } else if (testType === 'sewage_petition') {
        const sampleSewage: PublicPetition & Record<string, any> = {
          id: 'SWG-2569-TEST02',
          trackingCode: 'SWG-2569-042',
          submissionDate: new Date().toISOString().slice(0, 10),
          citizenName: 'นางสาวมาลี ศรีตรัง',
          citizenIdCard: '3-9203-00412-19-4',
          phone: '089-876-5432',
          moo: '1',
          village: 'หมู่ที่ 1 บ้านชายวัด',
          address: 'บ้านเลขที่ 112 หมู่ที่ 1 บ้านชายวัด ต.บางเป้า อ.กันตัง จ.ตรัง',
          title: 'คำร้องขอดูดสิ่งปฏิกูล / ส้วมเต็ม',
          category: 'waste_sewage',
          description: 'ขอรับบริการรถดูดสิ่งปฏิกูลของเทศบาลตำบลบางเป้า เนื่องจากบ่อเกรอะที่บ้านพักอาศัยเต็ม (ประมาณ 1 เที่ยว)',
          status: 'pending',
          assignedOfficer: 'ทีมงานรถดูดสิ่งปฏิกูล กองสาธารณสุขฯ',
          latitude: 7.429578,
          longitude: 99.525737,
          createdAt: new Date().toISOString(),
        };
        payload = buildPetitionNotificationPayload(sampleSewage, signerSettings);
      } else if (testType === 'medical_loan') {
        const sampleLoan: EquipmentLoan & Record<string, any> = {
          id: 'MED-2569-TEST03',
          loanCode: 'MED-2569-108',
          equipmentId: 'EQ-BED-001',
          equipmentCode: 'EQ-BED-001, EQ-AIR-002, EQ-WHL-003',
          equipmentName: 'เตียงผู้ป่วยชนิดมือหมุน 3 ไกร์ + ที่นอนลมป้องกันแผลกดทับ + รถเข็นนั่ง (วีลแชร์)',
          equipmentCategory: 'bed',
          itemsSummary:
            '1) เตียงผู้ป่วยปรับระดับได้ (EQ-BED-001), 2) ที่นอนลมป้องกันแผลกดทับ (EQ-AIR-002), 3) รถเข็นนั่งวีลแชร์ (EQ-WHL-003)',
          patientName: 'นายบุญมี สุขใจ',
          patientIdCard: '3-9203-00098-11-2',
          patientAge: 76,
          patientDiagnosis: 'ผู้ป่วยติดเตียง อ่อนแรงครึ่งซีก ต้องใช้เตียงปรับระดับ ที่นอนลมป้องกันแผลกดทับ และวีลแชร์พาพบแพทย์',
          borrowerName: 'นางสุดา สุขใจ',
          borrowerIdCard: '1-9203-00551-22-1',
          relationshipWithPatient: 'บุตรสาว',
          phone: '086-555-9988',
          borrowerPhone: '086-555-9988',
          moo: '2',
          village: 'หมู่ที่ 2 บ้านเกาะปอม',
          address: 'บ้านเลขที่ 89 หมู่ที่ 2 บ้านเกาะปอม ต.บางเป้า อ.กันตัง จ.ตรัง',
          loanDate: new Date().toISOString().slice(0, 10),
          dueDate: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
          status: 'borrowed',
          officerInCharge: 'เจ้าหน้าที่กองสาธารณสุขฯ',
          notes: 'ทดสอบส่งสัญญาให้ยืมอุปกรณ์ 2 หน้า A4',
          latitude: 7.421512,
          longitude: 99.529104,
        };
        payload = buildEquipmentLoanNotificationPayload(sampleLoan, signerSettings);
      } else {
        payload = buildCalendarNotificationPayload(
          [
            {
              id: 'ev-1',
              date: new Date().toISOString().slice(0, 10),
              time: '09:00',
              title: 'ลงพื้นที่ตรวจประเมินสุขลักษณะตลาดสดและร้านอาหาร หมู่ที่ 3 บ้านตลาดใหม่',
              type: 'inspection',
              location: 'หมู่ที่ 3 บ้านตลาดใหม่ ต.บางเป้า',
              assignee: 'ทีมเจ้าพนักงานสาธารณสุข',
              description: 'ตรวจตามแผนปฏิบัติงานประจำเดือน พร้อมเก็บตัวอย่างอาหาร',
            },
            {
              id: 'ev-2',
              date: new Date().toISOString().slice(0, 10),
              time: '13:30',
              title: 'นำส่งเตียงผู้ป่วยและที่นอนลม + ติดตามอาการผู้ป่วย LTC หมู่ที่ 2 บ้านเกาะปอม',
              type: 'ltc_visit',
              location: 'หมู่ที่ 2 บ้านเกาะปอม ต.บางเป้า',
              assignee: 'ทีมศูนย์สาธิตและยืมอุปกรณ์การแพทย์',
              description: 'ให้ผู้ขอยืมลงนามในสัญญา 2 หน้า พร้อมแนะนำวิธีใช้งาน',
            },
          ],
          'แผนปฏิบัติงานและนัดหมายประจำวัน กองสาธารณสุขและสิ่งแวดล้อม',
          signerSettings
        );
      }

      const result = await dispatchNotification(payload, settings, gasUrl);
      setLogs(getStoredNotificationLogs());
      setPreviewLog(result.logItem);
      showToast(
        'success',
        `สร้างแจ้งเตือนและไฟล์แบบฟอร์ม A4 (${payload.attachments[0]?.fileNamePdf}) เรียบร้อยแล้ว!`
      );
    } catch (err: any) {
      showToast('error', `เกิดข้อผิดพลาดในการทดสอบแจ้งเตือน: ${err?.message || String(err)}`);
    } finally {
      setIsSendingTest(null);
    }
  };

  const handleCopyGasCode = () => {
    const code = getCompleteGasNotificationCode(settings);
    navigator.clipboard.writeText(code);
    setCopiedGasCode(true);
    showToast('success', 'คัดลอกโค้ด Google Apps Script (รองรับส่งอีเมลพร้อมแนบไฟล์แบบฟอร์ม PDF/DOCX + LINE) แล้ว');
    setTimeout(() => setCopiedGasCode(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Hero Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-800 to-cyan-900 rounded-3xl p-6 text-white shadow-lg border border-emerald-700/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-emerald-200 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>ระบบแจ้งเตือนอัตโนมัติ + แนบไฟล์แบบฟอร์มราชการ A4 (PDF & Word)</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              🔔 ศูนย์แจ้งเตือน LINE กลุ่ม & อีเมลกองสาธารณสุข ทต.บางเป้า
            </h3>
            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
              ทุกครั้งที่ประชาชนหรือเจ้าหน้าที่ยื่นคำร้องทั่วไป, ขอดูดสิ่งปฏิกูล, ขอยืมอุปกรณ์ทางการแพทย์ หรือเพิ่มนัดหมายตามปฏิทิน/แผนงาน ระบบจะส่ง <strong>การ์ดแจ้งเตือนพร้อมพิกัด GPS เข้ากลุ่ม LINE</strong> และส่ง <strong>อีเมลพร้อมแนบไฟล์แบบฟอร์มราชการ A4 (.PDF และ .DOCX) ของคำขอนั้นๆ</strong> เข้าอีเมลกองสาธารณสุขโดยอัตโนมัติ
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowGasCodeModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs sm:text-sm shadow-md flex items-center gap-2 cursor-pointer transition-all"
            >
              <Copy className="w-4 h-4" />
              <span>รับโค้ด Apps Script ส่งเมลแนบไฟล์ฟรี</span>
            </button>
            <button
              type="button"
              onClick={() => handleSaveSettings()}
              className="px-5 py-2.5 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-950 font-extrabold text-xs sm:text-sm shadow-md flex items-center gap-2 cursor-pointer transition-all"
            >
              <Save className="w-4 h-4 text-emerald-700" />
              <span>บันทึกการตั้งค่า</span>
            </button>
          </div>
        </div>

        {/* Instant Test Bar for All 4 Official Form Types */}
        <div className="mt-5 pt-5 border-t border-white/15">
          <div className="text-xs font-bold text-emerald-200 mb-2.5 flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5" />
            <span>ทดสอบส่งแจ้งเตือนจริง + สร้างไฟล์แนบแบบฟอร์มราชการ A4 ทันที (คลิกเพื่อทดสอบและดูตัวอย่างไฟล์แนบ):</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
            <button
              type="button"
              disabled={!!isSendingTest}
              onClick={() => handleSendTest('general_petition')}
              className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-left transition-all cursor-pointer flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                <Megaphone className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-extrabold text-white truncate">
                  {isSendingTest === 'general_petition' ? 'กำลังสร้างไฟล์แนบ...' : '1. ทดสอบคำร้องทั่วไป'}
                </div>
                <div className="text-[11px] text-emerald-200 truncate">+ แนบฟอร์มคำร้องทั่วไป A4</div>
              </div>
            </button>

            <button
              type="button"
              disabled={!!isSendingTest}
              onClick={() => handleSendTest('sewage_petition')}
              className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-left transition-all cursor-pointer flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-extrabold text-white truncate">
                  {isSendingTest === 'sewage_petition' ? 'กำลังสร้างไฟล์แนบ...' : '2. ทดสอบดูดสิ่งปฏิกูล'}
                </div>
                <div className="text-[11px] text-emerald-200 truncate">+ แนบฟอร์มสิ่งปฏิกูล A4</div>
              </div>
            </button>

            <button
              type="button"
              disabled={!!isSendingTest}
              onClick={() => handleSendTest('medical_loan')}
              className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-left transition-all cursor-pointer flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-extrabold text-white truncate">
                  {isSendingTest === 'medical_loan' ? 'กำลังสร้างไฟล์แนบ...' : '3. ทดสอบยืมอุปกรณ์การแพทย์'}
                </div>
                <div className="text-[11px] text-emerald-200 truncate">+ แนบสัญญาให้ยืม 2 หน้า A4</div>
              </div>
            </button>

            <button
              type="button"
              disabled={!!isSendingTest}
              onClick={() => handleSendTest('calendar_event')}
              className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-left transition-all cursor-pointer flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-500 text-white flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-extrabold text-white truncate">
                  {isSendingTest === 'calendar_event' ? 'กำลังสร้างไฟล์แนบ...' : '4. ทดสอบนัดหมาย/แผนงาน'}
                </div>
                <div className="text-[11px] text-emerald-200 truncate">+ แนบฟอร์มตารางแผนงาน A4</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Main Configuration Grid */}
      <form onSubmit={handleSaveSettings} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: Official Email + Attached A4 Forms */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-base">
                  1. อีเมลกองสาธารณสุข & ไฟล์แนบแบบฟอร์ม A4
                </h4>
                <p className="text-xs text-slate-500">
                  ส่งอีเมลพร้อมแนบไฟล์แบบฟอร์มราชการ (.PDF และ .DOCX) ของแต่ละคำขอโดยอัตโนมัติ
                </p>
              </div>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.emailEnabled}
                onChange={(e) => setSettings({ ...settings, emailEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all relative peer-checked:bg-emerald-600" />
            </label>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                อีเมลกองสาธารณสุขผู้รับหลัก (ใส่ได้หลายอีเมล คั่นด้วยเครื่องหมายจุลภาค ,) *
              </label>
              <input
                type="text"
                value={settings.recipientEmails}
                onChange={(e) => setSettings({ ...settings, recipientEmails: e.target.value })}
                placeholder="เช่น health@bangpao.go.th, director@bangpao.go.th"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อผู้ส่งในหัวจดหมายอีเมล
                </label>
                <input
                  type="text"
                  value={settings.departmentEmailName}
                  onChange={(e) => setSettings({ ...settings, departmentEmailName: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  สำเนาเรียน (CC Emails - ถ้ามี)
                </label>
                <input
                  type="text"
                  value={settings.ccEmails}
                  onChange={(e) => setSettings({ ...settings, ccEmails: e.target.value })}
                  placeholder="เช่น mayor@bangpao.go.th"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                />
              </div>
            </div>

            {/* Form Attachment Selection Box */}
            <div className="p-4 rounded-2xl bg-emerald-50/80 border-2 border-emerald-300 space-y-3">
              <div className="flex items-center gap-2 text-emerald-950 font-extrabold text-xs sm:text-sm">
                <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>รูปแบบไฟล์แบบฟอร์มราชการ A4 ที่แนบไปกับอีเมลทุกคำขอ:</span>
              </div>

              <label className="flex items-start gap-3 p-2.5 rounded-xl bg-white border border-emerald-200 cursor-pointer hover:bg-emerald-50/50 transition-colors">
                <input
                  type="checkbox"
                  checked={settings.attachOfficialPdfForm}
                  onChange={(e) => setSettings({ ...settings, attachOfficialPdfForm: e.target.checked })}
                  className="mt-1 w-4 h-4 accent-emerald-600 rounded"
                />
                <div>
                  <div className="text-xs sm:text-sm font-extrabold text-slate-900">
                    📄 แนบไฟล์ PDF แบบฟอร์มราชการ A4 (.pdf) อัตโนมัติ
                  </div>
                  <div className="text-[11px] text-slate-600">
                    พร้อมสั่งพิมพ์ลงกระดาษ A4 เสนอ ผอ.กอง / ปลัด / นายกเทศมนตรี ลงนามได้ทันที
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-2.5 rounded-xl bg-white border border-emerald-200 cursor-pointer hover:bg-emerald-50/50 transition-colors">
                <input
                  type="checkbox"
                  checked={settings.attachOfficialDocxForm}
                  onChange={(e) => setSettings({ ...settings, attachOfficialDocxForm: e.target.checked })}
                  className="mt-1 w-4 h-4 accent-emerald-600 rounded"
                />
                <div>
                  <div className="text-xs sm:text-sm font-extrabold text-slate-900">
                    📝 แนบไฟล์ Microsoft Word แบบฟอร์มราชการ A4 (.docx) อัตโนมัติ
                  </div>
                  <div className="text-[11px] text-slate-600">
                    กรณีเจ้าหน้าที่ธุรการต้องการเปิดแก้ไขข้อความเพิ่มเติมในโปรแกรม Word
                  </div>
                </div>
              </label>

              <div className="text-[11px] text-emerald-800 bg-emerald-100/70 px-3 py-2 rounded-xl font-medium">
                ✓ <strong>รายการแบบฟอร์มที่ระบบแนบให้อัตโนมัติตามประเภทเรื่อง:</strong>
                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                  <li>คำร้องทั่วไป/เหตุรำคาญ ➔ แนบ <strong>แบบฟอร์มคำร้องทั่วไป (A4)</strong></li>
                  <li>ขอดูดสิ่งปฏิกูล/ส้วมเต็ม ➔ แนบ <strong>แบบฟอร์มคำร้องขอสูบสิ่งปฏิกูล (A4)</strong></li>
                  <li>ขอยืมอุปกรณ์การแพทย์ ➔ แนบ <strong>แบบคำขอและสัญญาให้ยืมอุปกรณ์ 2 หน้า (A4)</strong></li>
                  <li>นัดหมายปฏิทิน/แผนงาน ➔ แนบ <strong>แบบฟอร์มตารางกำหนดการและแผนปฏิบัติงาน (A4)</strong></li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: LINE Group Notification + Event Toggles */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base">
                    2. แจ้งเตือนเข้ากลุ่ม LINE กองสาธารณสุข ทต.บางเป้า
                  </h4>
                  <p className="text-xs text-slate-500">
                    ส่งการ์ด LINE Flex Message พร้อมปุ่มกดเปิด Google Maps นำทาง & ปุ่มโทรกลับ
                  </p>
                </div>
              </div>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.lineEnabled}
                  onChange={(e) => setSettings({ ...settings, lineEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all relative peer-checked:bg-emerald-600" />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อกลุ่ม LINE กองสาธารณสุข
                </label>
                <input
                  type="text"
                  value={settings.lineGroupName}
                  onChange={(e) => setSettings({ ...settings, lineGroupName: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  LINE Group ID / User ID (เช่น C1234... หรือ U1234...)
                </label>
                <input
                  type="text"
                  value={settings.lineTargetId}
                  onChange={(e) => setSettings({ ...settings, lineTargetId: e.target.value })}
                  placeholder="ใส่ Group ID ของกลุ่มไลน์กองสาธารณสุข"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                LINE Messaging API Channel Access Token (Long-lived)
              </label>
              <input
                type="password"
                value={settings.lineChannelAccessToken}
                onChange={(e) => setSettings({ ...settings, lineChannelAccessToken: e.target.value })}
                placeholder="วาง Channel Access Token จาก LINE Developers Console"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono"
              />
            </div>
          </div>

          {/* Event Triggers Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3.5">
            <div className="flex items-center gap-2 font-extrabold text-slate-900 text-sm border-b border-slate-100 pb-2.5">
              <Bell className="w-4 h-4 text-emerald-700" />
              <span>3. เลือกเรื่องราวที่ต้องการให้แจ้งเตือนอัตโนมัติ (ทุกระบบงาน)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                {
                  key: 'notifyOnGeneralPetition' as const,
                  label: '📢 คำร้องทั่วไป / เหตุรำคาญ',
                  desc: 'แนบฟอร์มคำร้องทั่วไป A4',
                },
                {
                  key: 'notifyOnSewagePetition' as const,
                  label: '🚛 คำร้องขอดูดสิ่งปฏิกูล / ส้วม',
                  desc: 'แนบฟอร์มขอสูบสิ่งปฏิกูล A4',
                },
                {
                  key: 'notifyOnEquipmentLoan' as const,
                  label: '🛏️ ขอยืมอุปกรณ์ทางการแพทย์',
                  desc: 'แนบสัญญาให้ยืมอุปกรณ์ 2 หน้า A4',
                },
                {
                  key: 'notifyOnCalendarEvent' as const,
                  label: '📅 นัดหมายปฏิทิน & แผนปฏิบัติงาน',
                  desc: 'แนบตารางแผนปฏิบัติงาน A4',
                },
                {
                  key: 'notifyOnEquipmentFollowUp' as const,
                  label: '⏰ เตือนติดตามอาการ / คืนอุปกรณ์',
                  desc: 'เมื่อครบกำหนด 3 เดือน / 6 เดือน',
                },
                {
                  key: 'dailyMorningSummaryEnabled' as const,
                  label: '🌅 สรุปแผนงานประจำวัน (08:00 น.)',
                  desc: 'ส่งสรุปนัดหมายทุกเช้าวันราชการ',
                },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(settings[item.key])}
                    onChange={(e) => setSettings({ ...settings, [item.key]: e.target.checked })}
                    className="mt-1 w-4 h-4 accent-emerald-600 rounded"
                  />
                  <div>
                    <div className="text-xs font-extrabold text-slate-800">{item.label}</div>
                    <div className="text-[11px] text-slate-500">{item.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#064e3b] hover:bg-[#043d2e] text-white font-bold text-xs sm:text-sm shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>บันทึกตั้งค่าการแจ้งเตือนทั้งหมด</span>
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Notification History & Attached Official A4 Forms Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h4 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-700" />
              <span>ประวัติการแจ้งเตือน & ดาวน์โหลดไฟล์แบบฟอร์มราชการที่แนบในอีเมล ({logs.length} รายการ)</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              เจ้าหน้าที่สามารถกดดูตัวอย่างการ์ด LINE, ตัวอย่างอีเมล หรือดาวน์โหลดไฟล์แบบฟอร์ม A4 (.PDF / .DOCX) ของแต่ละคำขอได้ทันที
            </p>
          </div>
          {logs.length > 0 && (
            <button
              type="button"
              onClick={() => {
                clearNotificationLogs();
                setLogs([]);
                showToast('info', 'ล้างประวัติการแจ้งเตือนเรียบร้อยแล้ว');
              }}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer self-start"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>ล้างประวัติ</span>
            </button>
          )}
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
            <Bell className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="text-sm font-bold text-slate-700">ยังไม่มีประวัติการส่งแจ้งเตือน</div>
            <div className="text-xs text-slate-500">
              กดปุ่ม <strong>"ทดสอบคำร้องทั่วไป / ดูดสิ่งปฏิกูล / ยืมอุปกรณ์ / นัดหมาย"</strong> ด้านบนเพื่อสร้างตัวอย่างแจ้งเตือนและไฟล์แนบแบบฟอร์ม A4 ได้ทันทีครับ
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 bg-slate-50/60 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 font-extrabold text-xs">
                      {log.referenceCode}
                    </span>
                    <span className="font-extrabold text-slate-900 text-sm sm:text-base">{log.title}</span>
                    <span className="text-xs text-slate-500">
                      • {new Date(log.createdAt).toLocaleString('th-TH')}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600">
                    ผู้ยื่น/ผู้เกี่ยวข้อง: <strong>{log.requesterName}</strong> • ส่งไปที่:{' '}
                    <span className="text-emerald-700 font-semibold">{log.lineGroupName}</span> และอีเมล{' '}
                    <span className="text-blue-700 font-semibold">{log.recipientEmails}</span>
                  </div>
                  <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{log.statusMessage}</span>
                  </div>
                </div>

                {/* Action & Form Attachment Buttons */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {log.attachments?.map((att) => (
                    <React.Fragment key={att.id}>
                      <button
                        type="button"
                        onClick={() => openAttachmentPrintableHtml(att)}
                        className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                        title={`เปิดพิมพ์แบบฟอร์ม ${att.fileNamePdf}`}
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>เปิดพิมพ์แบบฟอร์ม A4 (.PDF)</span>
                      </button>
                      {att.docxBase64 && (
                        <button
                          type="button"
                          onClick={() => downloadAttachmentDocx(att)}
                          className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                          title={`ดาวน์โหลดไฟล์ Word ${att.fileNameDocx}`}
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>ดาวน์โหลด Word (.DOCX)</span>
                        </button>
                      )}
                    </React.Fragment>
                  ))}

                  <button
                    type="button"
                    onClick={() => setPreviewLog(log)}
                    className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>ดูตัวอย่าง LINE & อีเมล</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal 1: Preview LINE Flex Message & Email with Attached Forms */}
      {previewLog && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base sm:text-lg">
                  👁️ ตัวอย่างการแจ้งเตือน LINE กลุ่ม & อีเมลพร้อมไฟล์แนบแบบฟอร์มราชการ A4
                </h3>
                <p className="text-xs text-slate-300">{previewLog.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewLog(null)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold cursor-pointer"
              >
                ✕ ปิดหน้าต่าง
              </button>
            </div>

            <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-100">
              {/* Left: Simulated LINE Group Chat Card */}
              <div className="lg:col-span-5 space-y-3">
                <div className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>ตัวอย่างการ์ดแจ้งเตือนในกลุ่ม LINE กองสาธารณสุข</span>
                </div>

                <div className="bg-[#8CABD9] p-4 rounded-3xl shadow-inner space-y-3">
                  <div className="text-[11px] text-white/90 text-center font-semibold bg-black/15 rounded-full py-1 px-3 mx-auto w-fit">
                    {previewLog.lineGroupName}
                  </div>

                  {/* Simulated Flex Bubble */}
                  <div className="bg-white rounded-2xl overflow-hidden shadow-md border border-slate-200/80">
                    <div
                      className="p-4 text-white"
                      style={{
                        backgroundColor:
                          previewLog.lineFlexContents?.header?.backgroundColor || '#047857',
                      }}
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold opacity-90">
                        <span>แจ้งเตือนกองสาธารณสุข ทต.บางเป้า</span>
                        <span>{previewLog.referenceCode}</span>
                      </div>
                      <div className="font-extrabold text-base mt-1 leading-snug">
                        {previewLog.title}
                      </div>
                    </div>

                    <div className="p-4 space-y-2 text-xs">
                      {(previewLog.lineFlexContents?.body?.contents || [])
                        .filter((c: any) => c.type === 'box' && c.layout === 'baseline')
                        .map((row: any, i: number) => (
                          <div key={i} className="grid grid-cols-12 gap-2">
                            <span className="col-span-5 font-bold text-slate-500">
                              {row.contents?.[0]?.text}:
                            </span>
                            <span className="col-span-7 font-semibold text-slate-900">
                              {row.contents?.[1]?.text}
                            </span>
                          </div>
                        ))}

                      {previewLog.attachments?.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-200 bg-emerald-50 p-2.5 rounded-xl">
                          <div className="font-extrabold text-emerald-800 text-[11px] mb-1">
                            📎 แนบไฟล์แบบฟอร์มราชการ A4 ทางอีเมลแล้ว:
                          </div>
                          {previewLog.attachments.map((att) => (
                            <div key={att.id} className="text-[11px] text-slate-700 font-medium">
                              • {att.fileNamePdf}
                              <br />• {att.fileNameDocx}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="p-3 pt-0 space-y-1.5">
                      <div className="w-full py-2 rounded-xl bg-emerald-600 text-white text-center font-bold text-xs">
                        📍 เปิด Google Maps นำทาง
                      </div>
                      <div className="w-full py-2 rounded-xl bg-slate-100 text-slate-800 text-center font-bold text-xs">
                        📞 โทรติดต่อผู้ยื่นคำขอ
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Email Preview + Direct Form Download/Print */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    <span>ตัวอย่างอีเมลกองสาธารณสุข & ไฟล์แนบแบบฟอร์ม A4 ประจำคำขอ</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {previewLog.attachments?.map((att) => (
                      <React.Fragment key={att.id}>
                        <button
                          type="button"
                          onClick={() => openAttachmentPrintableHtml(att)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>เปิดดู/พิมพ์แบบฟอร์ม A4 ({att.fileNamePdf})</span>
                        </button>
                        {att.docxBase64 && (
                          <button
                            type="button"
                            onClick={() => downloadAttachmentDocx(att)}
                            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>ดาวน์โหลด Word (.DOCX)</span>
                          </button>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  {previewLog.emailHtmlBody ? (
                    <iframe
                      title="Email Preview"
                      srcDoc={previewLog.emailHtmlBody}
                      className="w-full h-[460px] border-0"
                    />
                  ) : (
                    <div className="p-6 text-sm text-slate-600">ไม่มีตัวอย่างเนื้อหาอีเมล</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Complete Google Apps Script (Code.gs) Setup */}
      {showGasCodeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-emerald-950 text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base sm:text-lg">
                  📜 โค้ด Google Apps Script (Code.gs) สำหรับส่งอีเมลพร้อมแนบไฟล์แบบฟอร์ม A4 (.PDF & .DOCX)
                </h3>
                <p className="text-xs text-emerald-200">
                  คัดลอกไปวางใน Google Apps Script ของกองสาธารณสุข เพื่อเปิดใช้งานการส่งอีเมลพร้อมแนบไฟล์แบบฟอร์มฟรี 100%
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGasCodeModal(false)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold cursor-pointer"
              >
                ✕ ปิด
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1.5">
                <div className="font-extrabold text-sm">วิธีติดตั้งง่ายๆ ใน 3 ขั้นตอน:</div>
                <div>
                  1. เปิดไฟล์ Google Sheets ของกองสาธารณสุข ➔ ไปที่เมนู <strong>ส่วนขยาย (Extensions) &gt; Apps Script</strong>
                </div>
                <div>
                  2. กดปุ่ม <strong>"คัดลอกโค้ดทั้งหมด"</strong> ด้านล่างนี้ ไปวางทับในไฟล์ <code>Code.gs</code> แล้วกดบันทึก (💾)
                </div>
                <div>
                  3. กดปุ่ม <strong>การทำให้ใช้งานได้ (Deploy) &gt; การทำให้ใช้งานได้รายการใหม่ (New deployment)</strong> เลือกเป็น <strong>เว็บแอป (Web app)</strong> ตั้งค่าผู้มีสิทธิ์เข้าถึงเป็น <strong>ทุกคน (Anyone)</strong> แล้วนำ URL มาวางในแท็บเชื่อมต่อ Google Sheets
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleCopyGasCode}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  {copiedGasCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedGasCode ? 'คัดลอกโค้ดเรียบร้อยแล้ว!' : 'คัดลอกโค้ด Google Apps Script ทั้งหมด'}</span>
                </button>
              </div>

              <pre className="p-4 rounded-2xl bg-slate-900 text-emerald-300 text-xs font-mono overflow-x-auto max-h-[380px]">
                {getCompleteGasNotificationCode(settings)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
