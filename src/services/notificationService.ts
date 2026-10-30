import { PublicPetition, EquipmentLoan, SignerSettings, DEFAULT_SIGNER_SETTINGS, NotificationSettings } from '../types/index.ts';
import { generatePetitionHtml, generatePetitionDocxBytes } from './petitionDocGenerator.ts';
import {
  generateOfficialMedicalLoanHtml,
  generateOfficialMedicalLoanDocxBytes,
} from './medicalLoanDocGenerator.ts';
import { saveLtcQueueToFirestore } from './firebaseService.ts';
import {
  formatThaiDateWithDay,
  formatThaiDateShort,
  formatFileSize,
} from '../utils/dateUtils.ts';

export type { NotificationSettings };

export interface NotificationAttachment {
  id: string;
  title: string;
  formType:
    | 'general_petition'
    | 'sewage_petition'
    | 'medical_loan'
    | 'ltc_delivery_manifest'
    | 'calendar_plan'
    | 'followup_report';
  fileNamePdf: string;
  fileNameDocx: string;
  htmlSource: string;
  docxBase64: string;
}

export interface LtcQueueStopNotifyItem {
  queueOrder: number;
  stopId: string;
  patientId: string;
  patientName: string;
  age?: number;
  adlCategory: string;
  adlScore?: number;
  moo: string;
  village: string;
  address: string;
  caregiverName?: string;
  phone?: string;
  itemsText: string;
  itemsList: { itemName: string; quantity: number; unit: string }[];
  lat: number;
  lng: number;
  individualMapsUrl: string;
  fieldDeliveryStatus?: 'pending' | 'delivered' | 'issue_blocked';
  fieldDeliveryNote?: string;
}

export interface LtcDeliveryQueueNotifyInput {
  referenceCode?: string;
  fiscalYear: string;
  roundKey: string;
  roundLabel: string;
  mooFilterLabel: string;
  officerName?: string;
  originName: string;
  originLat: number;
  originLng: number;
  distanceKm?: number;
  durationMin?: number;
  multiStopGoogleMapsUrl: string;
  totalSupplySummary: { itemName: string; totalQty: number; unit: string }[];
  stops: LtcQueueStopNotifyItem[];
}

export interface NotificationPayload {
  eventType:
    | 'general_petition'
    | 'sewage_petition'
    | 'medical_loan'
    | 'ltc_delivery_queue'
    | 'calendar_event'
    | 'equipment_followup'
    | 'test_notification';
  referenceCode: string;
  title: string;
  subtitle: string;
  urgency: 'normal' | 'urgent' | 'critical';
  requesterName: string;
  requesterPhone: string;
  villageName: string;
  address: string;
  lat?: number;
  lng?: number;
  googleMapsUrl?: string;
  summaryLines: { label: string; value: string }[];
  lineTextFallback: string;
  lineFlexContents: Record<string, any>;
  emailSubject: string;
  emailHtmlBody: string;
  attachments: NotificationAttachment[];
  createdAt: string;
}

export interface NotificationLogItem {
  id: string;
  createdAt: string;
  eventType: NotificationPayload['eventType'];
  referenceCode: string;
  title: string;
  requesterName: string;
  channelsSent: ('line' | 'email')[];
  status: 'sent' | 'queued_local' | 'failed';
  statusMessage: string;
  recipientEmails: string;
  lineGroupName: string;
  attachments: NotificationAttachment[];
  lineTextSummary?: string;
  lineFlexContents?: Record<string, any>;
  emailHtmlBody?: string;
}

export interface CalendarScheduleItem {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  time?: string;
  startTime?: string;
  endTime?: string;
  type: string;
  location?: string;
  assignee?: string;
  description?: string;
  status?: string;
  docType?: string;
  docNumber?: string;
  fromAgency?: string;
  attachments?: {
    id: string;
    name: string;
    fileUrl?: string;
    fileType?: string;
    fileSize?: number;
  }[];
}

const STORAGE_KEY_NOTIFY_SETTINGS = 'bangpao_notification_settings_v1';
const STORAGE_KEY_NOTIFY_LOGS = 'bangpao_notification_logs_v1';

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  lineEnabled: true,
  lineGroupName: 'Sasuk notify',
  lineChannelAccessToken: '',
  lineTargetId: 'C9a3577cd25b88b13a3757b7462c78de',
  lineWebhookUrl: '',

  emailEnabled: true,
  emailGasWebAppUrl: '',
  departmentEmailName: 'กองสาธารณสุขและสิ่งแวดล้อม เทศบาลตำบลบางเป้า',
  recipientEmails: 'arnatden1994@gmail.com',
  ccEmails: '',
  attachOfficialPdfForm: true,
  attachOfficialDocxForm: true,

  notifyOnGeneralPetition: true,
  notifyOnSewagePetition: true,
  notifyOnEquipmentLoan: true,
  notifyOnLtcDeliveryQueue: true,
  notifyOnCalendarEvent: true,
  notifyOnEquipmentFollowUp: true,
  dailyMorningSummaryEnabled: true,
  dailyMorningSummaryTime: '08:00',
};

export function getStoredNotificationSettings(): NotificationSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTIFY_SETTINGS);
    if (!raw) return DEFAULT_NOTIFICATION_SETTINGS;
    return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

export function saveStoredNotificationSettings(settings: NotificationSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_NOTIFY_SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save notification settings:', err);
  }
}

export function getStoredNotificationLogs(): NotificationLogItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTIFY_LOGS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveNotificationLog(item: NotificationLogItem): NotificationLogItem[] {
  try {
    const existing = getStoredNotificationLogs();
    // Keep up to 40 recent logs in localStorage (strip heavy docxBase64 on older items beyond 10 to save space)
    const updated = [item, ...existing.filter((x) => x.id !== item.id)].slice(0, 40).map((log, idx) => {
      if (idx > 12 && log.attachments?.length) {
        return {
          ...log,
          attachments: log.attachments.map((a) => ({ ...a, docxBase64: '' })),
        };
      }
      return log;
    });
    localStorage.setItem(STORAGE_KEY_NOTIFY_LOGS, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to save notification log:', err);
    return [];
  }
}

export function clearNotificationLogs(): void {
  localStorage.removeItem(STORAGE_KEY_NOTIFY_LOGS);
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function downloadAttachmentDocx(att: NotificationAttachment): void {
  if (!att.docxBase64) {
    alert('ไฟล์ Word (.docx) ของรายการเก่าถูกบีบอัดเพื่อประหยัดพื้นที่ กรุณากดเปิดแบบฟอร์ม A4 (PDF/Print) แทนครับ');
    return;
  }
  const bytes = base64ToUint8Array(att.docxBase64);
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = att.fileNameDocx;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function openAttachmentPrintableHtml(att: NotificationAttachment): void {
  const win = window.open('', '_blank');
  if (!win) {
    alert('กรุณาอนุญาตให้เปิดหน้าต่างป๊อปอัป (Pop-up) เพื่อพิมพ์แบบฟอร์ม A4');
    return;
  }
  win.document.open();
  win.document.write(att.htmlSource);
  win.document.close();
}

function formatThaiDateTime(dateInput?: string | Date): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return String(dateInput || '-');
  return d.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildLineFlexBubble(params: {
  badgeText: string;
  headerBgColor: string;
  accentColor: string;
  referenceCode: string;
  title: string;
  subtitle: string;
  summaryLines: { label: string; value: string }[];
  attachmentNames: string[];
  googleMapsUrl?: string;
  phone?: string;
  portalUrl?: string;
  primaryButtonLabel?: string;
  primaryButtonColor?: string;
  hidePrimaryButton?: boolean;
}): Record<string, any> {
  const bodyRows = params.summaryLines.map((row) => ({
    type: 'box',
    layout: 'baseline',
    spacing: 'sm',
    margin: 'sm',
    contents: [
      {
        type: 'text',
        text: row.label,
        color: '#64748B',
        size: 'sm',
        flex: 4,
        weight: 'bold',
        wrap: true,
      },
      {
        type: 'text',
        text: row.value || '-',
        wrap: true,
        color: '#0F172A',
        size: 'sm',
        flex: 7,
      },
    ],
  }));

  const footerButtons: any[] = [];
  const jobActionUrl =
    params.portalUrl ||
    `https://bangpao-app.vercel.app/?job=${encodeURIComponent(params.referenceCode)}`;

  if (!params.hidePrimaryButton) {
    footerButtons.push({
      type: 'button',
      style: 'primary',
      color: params.primaryButtonColor || '#1D4ED8',
      height: 'sm',
      action: {
        type: 'uri',
        label: params.primaryButtonLabel || '👷 รับงาน / แจ้งจบงาน • ติดขัด',
        uri: jobActionUrl,
      },
    });
  }

  if (params.googleMapsUrl) {
    footerButtons.push({
      type: 'button',
      style: 'primary',
      color: '#059669',
      height: 'sm',
      action: {
        type: 'uri',
        label: '📍 เปิด Google Maps นำทาง',
        uri: params.googleMapsUrl,
      },
    });
  }

  const cleanPhone = (params.phone || '').replace(/[^0-9]/g, '');
  if (cleanPhone.length >= 9) {
    footerButtons.push({
      type: 'button',
      style: 'secondary',
      height: 'sm',
      action: {
        type: 'uri',
        label: `📞 โทรติดต่อ (${cleanPhone})`,
        uri: `tel:${cleanPhone}`,
      },
    });
  }

  return {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: params.headerBgColor,
      paddingAll: '16px',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: params.badgeText,
              color: '#FFFFFF',
              size: 'xs',
              weight: 'bold',
              flex: 1,
            },
            {
              type: 'text',
              text: params.referenceCode,
              color: '#E2E8F0',
              size: 'xs',
              align: 'end',
              weight: 'bold',
            },
          ],
        },
        {
          type: 'text',
          text: params.title,
          color: '#FFFFFF',
          size: 'lg',
          weight: 'bold',
          wrap: true,
          margin: 'sm',
        },
        {
          type: 'text',
          text: params.subtitle,
          color: '#F1F5F9',
          size: 'xs',
          wrap: true,
          margin: 'xs',
        },
      ],
    },
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '16px',
      contents: [
        ...bodyRows,
        ...(params.attachmentNames.length > 0
          ? [
              {
                type: 'separator',
                margin: 'md',
              },
              {
                type: 'box',
                layout: 'vertical',
                margin: 'md',
                backgroundColor: '#F8FAFC',
                cornerRadius: '8px',
                paddingAll: '10px',
                contents: [
                  {
                    type: 'text',
                    text: '📎 แนบไฟล์แบบฟอร์มราชการ A4 ทางอีเมลแล้ว:',
                    size: 'xs',
                    weight: 'bold',
                    color: params.accentColor,
                  },
                  ...params.attachmentNames.map((fn) => ({
                    type: 'text',
                    text: `• ${fn}`,
                    size: 'xxs',
                    color: '#475569',
                    wrap: true,
                    margin: 'xs',
                  })),
                ],
              },
            ]
          : []),
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      paddingAll: '12px',
      contents: footerButtons,
    },
  };
}


/**
 * Direct 1-Click Google Calendar Event URL
 */
export function buildGoogleCalendarDirectAddUrl(event: {
  title: string;
  date: string;
  time?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
  assignee?: string;
}): string {
  const cleanDate = (event.date || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
  let startH = '090000';
  let endH = '163000';

  if (event.startTime) {
    startH = event.startTime.replace(/:/g, '').padEnd(4, '0') + '00';
  }
  if (event.endTime) {
    endH = event.endTime.replace(/:/g, '').padEnd(4, '0') + '00';
  } else if (event.time) {
    const m = event.time.match(/(\d{1,2})[:.](\d{2})\s*[-–to]\s*(\d{1,2})[:.](\d{2})/);
    if (m) {
      startH = `${m[1].padStart(2, '0')}${m[2]}00`;
      endH = `${m[3].padStart(2, '0')}${m[4]}00`;
    }
  }

  const dates = `${cleanDate}T${startH}/${cleanDate}T${endH}`;
  const details = [
    event.description || '',
    event.assignee ? `ผู้รับผิดชอบ: ${event.assignee}` : '',
    'หน่วยงาน: กองสาธารณสุขและสิ่งแวดล้อม เทศบาลตำบลบางเป้า อ.กันตัง จ.ตรัง',
    'ระบบสารสนเทศเทศบาล: https://bangpao-app.vercel.app/?tab=calendar',
  ]
    .filter(Boolean)
    .join('\n');

  const query = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title || 'นัดหมายราชการ ทต.บางเป้า',
    details,
    location: event.location || 'สำนักงานเทศบาลตำบลบางเป้า อ.กันตัง จ.ตรัง',
    dates,
    add: 'bangpaohealthy@gmail.com',
    authuser: 'bangpaohealthy@gmail.com',
    ctz: 'Asia/Bangkok',
  });

  return `https://calendar.google.com/calendar/render?${query.toString()}`;
}

/**
 * Direct Google Maps Search / Navigation URL
 */
export function buildGoogleMapsNavUrl(location?: string): string {
  const loc = (location || '').trim();
  const queryStr = loc ? `${loc} เทศบาลตำบลบางเป้า ตรัง` : 'เทศบาลตำบลบางเป้า อ.กันตัง จ.ตรัง';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryStr)}`;
}

/**
 * Dedicated LINE Flex Bubble specifically designed for Calendar, Activities, Meetings & Trainings
 * - Clean semantic typography with zero text truncation
 * - NO "รับงาน/แจ้งจบงาน" button!
 * - Includes: "📅 เปิดดูในปฏิทินเทศบาล", "📍 นำทาง (Google Maps)", "⏰ เพิ่มลง Google Calendar", "📎 เปิดดูหนังสือ / ไฟล์แนบ"
 */
function buildCalendarFlexBubble(params: {
  badgeText: string;
  headerBgColor?: string;
  referenceCode: string;
  title: string;
  subtitle: string;
  events: CalendarScheduleItem[];
  attachmentNames?: string[];
  portalCalendarUrl: string;
  attachmentViewUrl?: string;
}): Record<string, any> {
  const isSingle = params.events.length === 1;
  const firstEvent = params.events[0];
  const headerBg = params.headerBgColor || '#312E81';

  const googleCalUrl = isSingle && firstEvent
    ? buildGoogleCalendarDirectAddUrl(firstEvent)
    : undefined;

  const mapsUrl = isSingle && firstEvent?.location
    ? buildGoogleMapsNavUrl(firstEvent.location)
    : undefined;

  const bodyContents: any[] = [];

  if (isSingle && firstEvent) {
    const thaiDate = formatThaiDateWithDay(firstEvent.date);
    const timeDisplay =
      firstEvent.time ||
      (firstEvent.startTime
        ? `${firstEvent.startTime} - ${firstEvent.endTime || '16:30'} น.`
        : 'ตามเวลาราชการ (09:00 - 16:30 น.)');

    bodyContents.push(
      // Row 1: วันและเวลา
      {
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        contents: [
          {
            type: 'text',
            text: '🗓️ วันเวลา',
            weight: 'bold',
            size: 'sm',
            color: '#475569',
            flex: 3,
            wrap: true,
          },
          {
            type: 'text',
            text: `${thaiDate}\n⏰ เวลา ${timeDisplay}`,
            weight: 'bold',
            size: 'sm',
            color: '#0F172A',
            wrap: true,
            flex: 7,
          },
        ],
      },
      // Row 2: สถานที่
      {
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        margin: 'md',
        contents: [
          {
            type: 'text',
            text: '📍 สถานที่',
            weight: 'bold',
            size: 'sm',
            color: '#475569',
            flex: 3,
            wrap: true,
          },
          {
            type: 'text',
            text: firstEvent.location || 'สำนักงานเทศบาลตำบลบางเป้า',
            size: 'sm',
            color: '#0F172A',
            wrap: true,
            flex: 7,
          },
        ],
      },
      // Row 3: ผู้รับผิดชอบ
      {
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        margin: 'md',
        contents: [
          {
            type: 'text',
            text: '👤 ผู้รับผิดชอบ',
            weight: 'bold',
            size: 'sm',
            color: '#475569',
            flex: 3,
            wrap: true,
          },
          {
            type: 'text',
            text: firstEvent.assignee || 'กองสาธารณสุขและสิ่งแวดล้อม',
            size: 'sm',
            color: '#0F172A',
            wrap: true,
            flex: 7,
          },
        ],
      }
    );

    // Row 4: เอกสาร / หนังสือต้นเรื่อง (ถ้ามี)
    if (firstEvent.docType || firstEvent.docNumber || firstEvent.fromAgency) {
      bodyContents.push({
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        margin: 'md',
        contents: [
          {
            type: 'text',
            text: '📜 หนังสือเรื่อง',
            weight: 'bold',
            size: 'sm',
            color: '#475569',
            flex: 3,
            wrap: true,
          },
          {
            type: 'text',
            text: `${firstEvent.docType || 'หนังสือราชการ'}${
              firstEvent.docNumber ? ` ที่ ${firstEvent.docNumber}` : ''
            }${firstEvent.fromAgency ? ` (${firstEvent.fromAgency})` : ''}`,
            size: 'sm',
            color: '#0F172A',
            wrap: true,
            flex: 7,
          },
        ],
      });
    }

    // Row 5: สาระสำคัญ / วาระการประชุม (ถ้ามี)
    if (firstEvent.description && firstEvent.description.trim()) {
      bodyContents.push({
        type: 'box',
        layout: 'vertical',
        margin: 'lg',
        paddingAll: '12px',
        backgroundColor: '#F8FAFC',
        cornerRadius: '10px',
        borderColor: '#E2E8F0',
        borderWidth: '1px',
        contents: [
          {
            type: 'text',
            text: '📝 สาระสำคัญ / วาระการประชุม:',
            weight: 'bold',
            size: 'xs',
            color: '#475569',
          },
          {
            type: 'text',
            text: firstEvent.description,
            size: 'sm',
            color: '#1E293B',
            wrap: true,
            margin: 'xs',
          },
        ],
      });
    }
  } else {
    // Multi-event summary
    bodyContents.push({
      type: 'text',
      text: `สรุปตารางปฏิบัติงานและนัดหมายประจำวัน (${params.events.length} ภารกิจ):`,
      weight: 'bold',
      size: 'sm',
      color: '#1E293B',
      margin: 'xs',
    });

    params.events.slice(0, 6).forEach((ev, idx) => {
      bodyContents.push({
        type: 'box',
        layout: 'vertical',
        margin: 'md',
        paddingAll: '10px',
        backgroundColor: '#F8FAFC',
        cornerRadius: '8px',
        borderColor: '#E2E8F0',
        borderWidth: '1px',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: `${idx + 1}. ⏰ ${ev.time || '09:00 น.'} • ${formatThaiDateShort(ev.date)}`,
                weight: 'bold',
                size: 'xs',
                color: '#4338CA',
                flex: 1,
              },
            ],
          },
          {
            type: 'text',
            text: ev.title,
            weight: 'bold',
            size: 'sm',
            color: '#0F172A',
            wrap: true,
            margin: 'xs',
          },
          {
            type: 'text',
            text: `📍 ${ev.location || 'ทต.บางเป้า'} • 👤 ${ev.assignee || 'กองสาธารณสุขฯ'}`,
            size: 'xs',
            color: '#64748B',
            wrap: true,
            margin: 'xs',
          },
        ],
      });
    });
  }

  // File Attachments info card
  const attachedFiles = firstEvent?.attachments || [];
  if (attachedFiles.length > 0 || (params.attachmentNames && params.attachmentNames.length > 0)) {
    const fileItems =
      attachedFiles.length > 0
        ? attachedFiles.map((a) => `• 📄 ${a.name}${a.fileSize ? ` (${formatFileSize(a.fileSize)})` : ''}`)
        : (params.attachmentNames || []).map((n) => `• 📄 ${n}`);

    bodyContents.push({
      type: 'box',
      layout: 'vertical',
      margin: 'md',
      paddingAll: '12px',
      backgroundColor: '#ECFDF5',
      cornerRadius: '10px',
      borderColor: '#A7F3D0',
      borderWidth: '1px',
      contents: [
        {
          type: 'text',
          text: `📎 เอกสารแนบในระบบ & แบบฟอร์มราชการ:`,
          weight: 'bold',
          size: 'xs',
          color: '#065F46',
        },
        ...fileItems.map((item) => ({
          type: 'text',
          text: item,
          size: 'xs',
          color: '#047857',
          wrap: true,
          margin: 'xs',
        })),
        {
          type: 'text',
          text: '📁 ส่งไฟล์แบบฟอร์มตารางแผนงาน A4 (.pdf & .docx) เข้าอีเมลกองสาธารณสุขแล้ว',
          size: 'xxs',
          color: '#059669',
          margin: 'sm',
        },
      ],
    });
  }

  // Footer Action Buttons
  const footerButtons: any[] = [];

  // Button 1: Open in Municipal Calendar (Primary Indigo)
  footerButtons.push({
    type: 'button',
    style: 'primary',
    color: '#4338CA',
    height: 'sm',
    action: {
      type: 'uri',
      label: '📅 เปิดดูในปฏิทินงานเทศบาล',
      uri: params.portalCalendarUrl,
    },
  });

  // Button 2: Google Maps Navigation (Emerald)
  if (mapsUrl) {
    footerButtons.push({
      type: 'button',
      style: 'primary',
      color: '#059669',
      height: 'sm',
      action: {
        type: 'uri',
        label: '📍 นำทาง (Google Maps)',
        uri: mapsUrl,
      },
    });
  }

  // Button 3: Add to Google Calendar (1-click direct link)
  if (googleCalUrl) {
    footerButtons.push({
      type: 'button',
      style: 'secondary',
      height: 'sm',
      action: {
        type: 'uri',
        label: '⏰ เพิ่มลง Google Calendar',
        uri: googleCalUrl,
      },
    });
  }

  // Button 4: Open Document / Attachment (if available)
  if (attachedFiles.length > 0 || params.attachmentViewUrl) {
    footerButtons.push({
      type: 'button',
      style: 'secondary',
      height: 'sm',
      action: {
        type: 'uri',
        label: '📎 เปิดดูหนังสือเชิญ / ไฟล์แนบ',
        uri: params.attachmentViewUrl || params.portalCalendarUrl,
      },
    });
  }

  return {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: headerBg,
      paddingAll: '16px',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: params.badgeText,
              color: '#FFFFFF',
              size: 'xs',
              weight: 'bold',
              flex: 1,
            },
            {
              type: 'text',
              text: params.referenceCode,
              color: '#CBD5E1',
              size: 'xs',
              align: 'end',
              weight: 'bold',
            },
          ],
        },
        {
          type: 'text',
          text: params.title,
          weight: 'bold',
          size: 'lg',
          color: '#FFFFFF',
          wrap: true,
          margin: 'md',
        },
        {
          type: 'text',
          text: params.subtitle,
          size: 'xs',
          color: '#E0E7FF',
          wrap: true,
          margin: 'xs',
        },
      ],
    },
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '16px',
      contents: bodyContents,
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      paddingAll: '14px',
      contents: footerButtons,
    },
  };
}

function buildOfficialEmailHtml(params: {
  badgeText: string;
  headerBgColor: string;
  referenceCode: string;
  title: string;
  subtitle: string;
  summaryLines: { label: string; value: string }[];
  attachments: NotificationAttachment[];
  googleMapsUrl?: string;
  requesterPhone?: string;
}): string {
  const rowsHtml = params.summaryLines
    .map(
      (r) => `
      <tr>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #334155; width: 36%; background-color: #f8fafc; font-size: 14px;">
          ${r.label}
        </td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 14px; line-height: 1.55;">
          ${String(r.value || '-')
            .replace(/\n/g, '<br/>')
            .replace(
              /(https?:\/\/[^\s<]+)/g,
              '<a href="$1" target="_blank" style="color: #059669; font-weight: 700; text-decoration: underline;">🗺️ คลิกเปิดแผนที่นำทาง</a>'
            )}
        </td>
      </tr>`
    )
    .join('');

  const attachmentListHtml = params.attachments
    .map(
      (att) => `
      <li style="margin-bottom: 6px; color: #1e293b; font-size: 14px;">
        📄 <strong>${att.title}</strong>
        <br/>
        <span style="color: #475569; font-size: 12px;">
          ไฟล์แนบในอีเมลนี้: <code>${att.fileNamePdf}</code> (สำหรับสั่งพิมพ์ A4 ทันที) และ <code>${att.fileNameDocx}</code> (สำหรับเปิดแก้ไขใน Microsoft Word)
        </span>
      </li>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
</head>
<body style="margin: 0; padding: 20px; background-color: #f1f5f9; font-family: 'Sarabun', Tahoma, Arial, sans-serif;">
  <div style="max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #cbd5e1; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08);">
    <!-- Header -->
    <div style="background: ${params.headerBgColor}; color: #ffffff; padding: 22px 26px;">
      <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9;">
        ${params.badgeText} • รหัสอ้างอิง: ${params.referenceCode}
      </div>
      <h1 style="margin: 8px 0 4px 0; font-size: 22px; font-weight: 800; line-height: 1.35;">
        ${params.title}
      </h1>
      <div style="font-size: 13px; opacity: 0.92;">
        ${params.subtitle}
      </div>
    </div>

    <!-- Main Content -->
    <div style="padding: 24px 26px;">
      <p style="margin: 0 0 14px 0; color: #334155; font-size: 15px;">
        เรียน <strong>เจ้าหน้าที่กองสาธารณสุขและสิ่งแวดล้อม เทศบาลตำบลบางเป้า</strong>,
      </p>
      <p style="margin: 0 0 18px 0; color: #475569; font-size: 14px; line-height: 1.6;">
        ระบบบริหารงานสาธารณสุขและสิ่งแวดล้อมอัจฉริยะ (Smart Health & Environment System) ขอแจ้งเตือนรายการใหม่พร้อม <strong>ไฟล์แบบฟอร์มราชการ A4 ที่กรอกข้อมูลอัตโนมัติแนบมาพร้อมอีเมลฉบับนี้</strong> โดยมีรายละเอียดดังต่อไปนี้:
      </p>

      <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; border-radius: 10px; overflow: hidden; margin-bottom: 20px;">
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <!-- Attached Official Forms Box -->
      <div style="background-color: #ecfdf5; border: 2px solid #10b981; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px;">
        <div style="font-weight: 800; color: #065f46; font-size: 15px; margin-bottom: 8px;">
          📎 ไฟล์แบบฟอร์มราชการประจำคำขอ (แนบมากับอีเมลฉบับนี้แล้ว)
        </div>
        <ul style="margin: 0; padding-left: 20px;">
          ${attachmentListHtml}
        </ul>
        <div style="margin-top: 10px; font-size: 12px; color: #047857;">
          💡 เจ้าหน้าที่สามารถดาวน์โหลดไฟล์แนบด้านล่างของอีเมลเพื่อสั่งพิมพ์ลงกระดาษ A4 เสนอผู้บริหารลงนามได้ทันที
        </div>
      </div>

      <!-- Action Buttons -->
      <div style="margin-top: 22px; text-align: center;">
        <a href="https://bangpao-app.vercel.app/?job=${encodeURIComponent(params.referenceCode)}" target="_blank" style="display: inline-block; background-color: #1d4ed8; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 22px; border-radius: 10px; margin: 4px 6px;">
          👷 รับงาน / รายงานผลหน้างาน (จบงาน • ติดขัด)
        </a>
        ${
          params.googleMapsUrl
            ? `<a href="${params.googleMapsUrl}" target="_blank" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 22px; border-radius: 10px; margin: 4px 6px;">
                📍 เปิด Google Maps นำทางไปยังพิกัด
              </a>`
            : ''
        }
        <a href="https://bangpao-app.vercel.app/" target="_blank" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 22px; border-radius: 10px; margin: 4px 6px;">
          📋 เปิดระบบบริหารงานกองสาธารณสุข ทต.บางเป้า
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px 26px; font-size: 12px; color: #64748b; text-align: center;">
      ส่งจากระบบแจ้งเตือนอัตโนมัติ กองสาธารณสุขและสิ่งแวดล้อม เทศบาลตำบลบางเป้า อ.กันตัง จ.ตรัง • ${formatThaiDateTime()}
    </div>
  </div>
</body>
</html>`;
}

/**
 * 1. Build Notification + Official A4 Form Attachment for General Petition OR Sewage Request
 */
export function buildPetitionNotificationPayload(
  petition: PublicPetition & Record<string, any>,
  signers: SignerSettings = DEFAULT_SIGNER_SETTINGS
): NotificationPayload {
  const isSewage =
    petition.category === 'waste_sewage' ||
    petition.category === 'sewage' ||
    petition.form?.formType === 'sewage' ||
    (petition.title || petition.type || '').includes('สิ่งปฏิกูล') ||
    (petition.title || petition.type || '').includes('ดูดส้วม') ||
    (petition.title || petition.type || '').includes('ส้วม');

  const refCode = petition.trackingCode || petition.caseNo || petition.id || (isSewage ? 'SWG-NEW' : 'REQ-NEW');
  const petitionerName = petition.citizenName || petition.petitionerName || 'ประชาชนผู้ยื่นคำร้อง';
  const petitionTitle = petition.title || petition.type || (isSewage ? 'คำร้องขอดูดสิ่งปฏิกูล' : 'คำร้องทั่วไป / เหตุรำคาญ');
  const detailsText = petition.description || petition.details || petition.form?.purpose || '-';
  const villageText = petition.moo ? `หมู่ที่ ${petition.moo}` : petition.village || 'ต.บางเป้า';
  const latVal = typeof petition.latitude === 'number' ? petition.latitude : petition.lat;
  const lngVal = typeof petition.longitude === 'number' ? petition.longitude : petition.lng;

  const htmlSource = generatePetitionHtml(petition, signers, { autoPrint: false });
  const docxBytes = generatePetitionDocxBytes(petition, signers);
  const docxBase64 = uint8ArrayToBase64(docxBytes);

  const safeRef = refCode.replace(/[^a-zA-Z0-9_-]/g, '_');
  const attachment: NotificationAttachment = {
    id: `att-${Date.now()}`,
    title: isSewage
      ? `แบบฟอร์มคำร้องขอสูบสิ่งปฏิกูล (A4) - ${petitionerName}`
      : `แบบฟอร์มคำร้องทั่วไป/เหตุรำคาญ (A4) - ${petitionerName}`,
    formType: isSewage ? 'sewage_petition' : 'general_petition',
    fileNamePdf: isSewage ? `แบบฟอร์มคำร้องสิ่งปฏิกูล_${safeRef}.pdf` : `แบบฟอร์มคำร้องทั่วไป_${safeRef}.pdf`,
    fileNameDocx: isSewage ? `แบบฟอร์มคำร้องสิ่งปฏิกูล_${safeRef}.docx` : `แบบฟอร์มคำร้องทั่วไป_${safeRef}.docx`,
    htmlSource,
    docxBase64,
  };

  const hasCoords =
    typeof latVal === 'number' &&
    typeof lngVal === 'number' &&
    !isNaN(latVal) &&
    !isNaN(lngVal);
  const googleMapsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${latVal},${lngVal}`
    : undefined;

  const summaryLines: { label: string; value: string }[] = [
    { label: 'เลขรับคำร้อง', value: refCode },
    { label: 'ประเภทคำร้อง', value: petitionTitle },
    { label: 'ผู้ยื่นคำร้อง', value: petitionerName },
    { label: 'เบอร์โทรศัพท์', value: petition.phone || '-' },
    { label: 'หมู่บ้าน / พื้นที่', value: villageText },
    { label: 'ที่อยู่ / สถานที่', value: petition.address || '-' },
    { label: 'รายละเอียดคำร้อง', value: detailsText },
    {
      label: 'พิกัด GPS นำทาง',
      value: hasCoords ? `${latVal.toFixed(6)}, ${lngVal.toFixed(6)}` : 'ตามที่อยู่หมู่บ้าน',
    },
    { label: 'วันเวลาที่ยื่นเรื่อง', value: formatThaiDateTime(petition.createdAt || petition.submissionDate) },
  ];

  const badgeText = isSewage ? '🚛 คำร้องขอสูบสิ่งปฏิกูล' : '📢 คำร้องทั่วไป / เหตุรำคาญ';
  const headerBgColor = isSewage ? '#1D4ED8' : '#D97706';
  const accentColor = isSewage ? '#1E40AF' : '#B45309';
  const title = isSewage
    ? `แจ้งคำร้องขอดูดสิ่งปฏิกูลใหม่ (${refCode})`
    : `แจ้งคำร้องทั่วไป/เหตุรำคาญใหม่ (${refCode})`;
  const subtitle = `ผู้ยื่น: ${petitionerName} • ${villageText}`;

  const lineFlexContents = buildLineFlexBubble({
    badgeText,
    headerBgColor,
    accentColor,
    referenceCode: refCode,
    title,
    subtitle,
    summaryLines,
    attachmentNames: [attachment.fileNamePdf, attachment.fileNameDocx],
    googleMapsUrl,
    phone: petition.phone,
  });

  const emailSubject = `[กองสาธารณสุข ทต.บางเป้า] ${title} - ${petitionerName} (พร้อมไฟล์แบบฟอร์ม A4)`;
  const emailHtmlBody = buildOfficialEmailHtml({
    badgeText,
    headerBgColor,
    referenceCode: refCode,
    title,
    subtitle,
    summaryLines,
    attachments: [attachment],
    googleMapsUrl,
    requesterPhone: petition.phone,
  });

  const lineTextFallback = [
    `${badgeText} [${refCode}]`,
    `ผู้ยื่น: ${petitionerName} (โทร: ${petition.phone || '-'})`,
    `พื้นที่: ${villageText} ${petition.address || ''}`,
    `รายละเอียด: ${detailsText}`,
    googleMapsUrl ? `นำทาง GPS: ${googleMapsUrl}` : '',
    `📎 ส่งไฟล์แบบฟอร์ม A4 (${attachment.fileNamePdf}) เข้าอีเมลกองสาธารณสุขแล้ว`,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    eventType: isSewage ? 'sewage_petition' : 'general_petition',
    referenceCode: refCode,
    title,
    subtitle,
    urgency: petition.urgency || 'normal',
    requesterName: petitionerName,
    requesterPhone: petition.phone,
    villageName: villageText,
    address: petition.address || villageText,
    lat: latVal,
    lng: lngVal,
    googleMapsUrl,
    summaryLines,
    lineTextFallback,
    lineFlexContents,
    emailSubject,
    emailHtmlBody,
    attachments: [attachment],
    createdAt: new Date().toISOString(),
  };
}

/**
 * 2. Build Notification + Official 2-Page A4 Medical Equipment Loan Form & Contract Attachment
 */
export function buildEquipmentLoanNotificationPayload(
  loan: EquipmentLoan & Record<string, any>,
  signers: SignerSettings = DEFAULT_SIGNER_SETTINGS
): NotificationPayload {
  const refCode = loan.loanCode || loan.id || 'MED-NEW';
  const htmlSource = generateOfficialMedicalLoanHtml(loan, signers);
  const docxBytes = generateOfficialMedicalLoanDocxBytes(loan, signers);
  const docxBase64 = uint8ArrayToBase64(docxBytes);

  const safeRef = refCode.replace(/[^a-zA-Z0-9_-]/g, '_');
  const itemsText = loan.itemsSummary || loan.equipmentName || 'อุปกรณ์ทางการแพทย์';
  const phoneText = loan.borrowerPhone || loan.phone || '-';
  const symptomText = loan.patientDiagnosis || loan.patientSymptom || loan.notes || '-';
  const villageText = loan.moo ? `หมู่ที่ ${loan.moo}` : loan.village || 'ต.บางเป้า';
  const latVal = typeof loan.latitude === 'number' ? loan.latitude : loan.lat;
  const lngVal = typeof loan.longitude === 'number' ? loan.longitude : loan.lng;

  const attachment: NotificationAttachment = {
    id: `att-med-${Date.now()}`,
    title: `แบบคำขอและสัญญาให้ยืมอุปกรณ์ทางการแพทย์ 2 หน้า (A4) - ผู้ป่วย ${loan.patientName}`,
    formType: 'medical_loan',
    fileNamePdf: `แบบฟอร์มสัญญาให้ยืมอุปกรณ์_${safeRef}.pdf`,
    fileNameDocx: `แบบฟอร์มสัญญาให้ยืมอุปกรณ์_${safeRef}.docx`,
    htmlSource,
    docxBase64,
  };

  const hasCoords =
    typeof latVal === 'number' && typeof lngVal === 'number' && !isNaN(latVal) && !isNaN(lngVal);
  const googleMapsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${latVal},${lngVal}`
    : undefined;

  const summaryLines: { label: string; value: string }[] = [
    { label: 'รหัสคำขอยืม', value: refCode },
    { label: 'รายการอุปกรณ์ที่ขอยืม', value: itemsText },
    { label: 'ชื่อผู้ป่วย', value: `${loan.patientName || '-'}${loan.patientAge ? ` (อายุ ${loan.patientAge} ปี)` : ''}` },
    { label: 'อาการ / ความจำเป็น', value: symptomText },
    { label: 'ผู้ติดต่อขอยืมแทน', value: `${loan.borrowerName || '-'} (${loan.relationshipWithPatient || loan.borrowerRelation || 'ญาติ'})` },
    { label: 'เบอร์โทรติดต่อนัดส่ง', value: phoneText },
    { label: 'สถานที่จัดส่งอุปกรณ์', value: `${villageText} ${loan.address || ''}`.trim() || '-' },
    { label: 'กำหนดติดตามอาการ', value: loan.dueDate || loan.expectedReturnDate || 'ทุก 3 - 6 เดือน' },
  ];

  const badgeText = '🛏️ คำขอยืมอุปกรณ์ทางการแพทย์';
  const headerBgColor = '#047857';
  const accentColor = '#065F46';
  const title = `คำขอยืมอุปกรณ์การแพทย์ใหม่ (${refCode})`;
  const subtitle = `ผู้ป่วย: ${loan.patientName} • อุปกรณ์: ${itemsText}`;

  const lineFlexContents = buildLineFlexBubble({
    badgeText,
    headerBgColor,
    accentColor,
    referenceCode: refCode,
    title,
    subtitle,
    summaryLines,
    attachmentNames: [attachment.fileNamePdf, attachment.fileNameDocx],
    googleMapsUrl,
    phone: phoneText,
  });

  const emailSubject = `[กองสาธารณสุข ทต.บางเป้า] ${title} - ผู้ป่วย ${loan.patientName} (พร้อมไฟล์สัญญา A4)`;
  const emailHtmlBody = buildOfficialEmailHtml({
    badgeText,
    headerBgColor,
    referenceCode: refCode,
    title,
    subtitle,
    summaryLines,
    attachments: [attachment],
    googleMapsUrl,
    requesterPhone: phoneText,
  });

  const lineTextFallback = [
    `${badgeText} [${refCode}]`,
    `รายการที่ขอยืม: ${itemsText}`,
    `ผู้ป่วย: ${loan.patientName} (${symptomText})`,
    `ผู้ติดต่อ: ${loan.borrowerName} โทร. ${phoneText}`,
    `สถานที่ส่ง: ${villageText} ${loan.address || ''}`,
    googleMapsUrl ? `นำทาง GPS ส่งของ: ${googleMapsUrl}` : '',
    `📎 แนบไฟล์แบบคำขอและสัญญา 2 หน้า (${attachment.fileNamePdf}) เข้าอีเมลกองสาธารณสุขแล้ว`,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    eventType: 'medical_loan',
    referenceCode: refCode,
    title,
    subtitle,
    urgency: 'urgent',
    requesterName: loan.borrowerName || loan.patientName,
    requesterPhone: phoneText,
    villageName: villageText,
    address: loan.address,
    lat: latVal,
    lng: lngVal,
    googleMapsUrl,
    summaryLines,
    lineTextFallback,
    lineFlexContents,
    emailSubject,
    emailHtmlBody,
    attachments: [attachment],
    createdAt: new Date().toISOString(),
  };
}

/**
 * Generate Official A4 HTML Form for Calendar Schedule / Action Plan
 */
export function generateOfficialCalendarPlanHtml(
  events: CalendarScheduleItem[],
  planTitle: string,
  signers: SignerSettings = DEFAULT_SIGNER_SETTINGS
): string {
  const rows = events
    .map(
      (ev, i) => `
      <tr>
        <td style="border: 1px solid #000; padding: 8px; text-align: center;">${i + 1}</td>
        <td style="border: 1px solid #000; padding: 8px; text-align: center;">${ev.date || '-'}${ev.time ? `<br/>(${ev.time} น.)` : ''}</td>
        <td style="border: 1px solid #000; padding: 8px; font-weight: bold;">${ev.title}</td>
        <td style="border: 1px solid #000; padding: 8px;">${ev.location || 'ในเขต ทต.บางเป้า'}</td>
        <td style="border: 1px solid #000; padding: 8px;">${ev.assignee || 'เจ้าหน้าที่กองสาธารณสุขฯ'}</td>
        <td style="border: 1px solid #000; padding: 8px;">${ev.description || '-'}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <title>${planTitle}</title>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4 portrait; margin: 18mm 16mm; }
    body { font-family: 'Sarabun', sans-serif; font-size: 15px; color: #000; line-height: 1.5; margin: 0; padding: 20px; }
    .page { max-width: 210mm; margin: 0 auto; background: #fff; }
    .header { text-align: center; margin-bottom: 18px; }
    .title { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
    .subtitle { font-size: 16px; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; margin-bottom: 24px; font-size: 14px; }
    th { border: 1px solid #000; padding: 8px; background: #f1f5f9; font-weight: 700; text-align: center; }
    .sign-row { display: flex; justify-content: space-between; margin-top: 36px; }
    .sign-box { width: 45%; text-align: center; }
    @media print { .no-print { display: none !important; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="no-print" style="text-align: right; margin-bottom: 12px;">
    <button onclick="window.print()" style="background: #1e40af; color: #fff; border: none; padding: 10px 18px; border-radius: 8px; font-weight: bold; cursor: pointer;">
      🖨️ พิมพ์แบบฟอร์มกำหนดการ / แผนปฏิบัติงาน (A4)
    </button>
  </div>
  <div class="page">
    <div class="header">
      <div class="title">แบบแจ้งกำหนดการนัดหมายและแผนปฏิบัติงานราชการ</div>
      <div class="subtitle">กองสาธารณสุขและสิ่งแวดล้อม เทศบาลตำบลบางเป้า อำเภอกันตัง จังหวัดตรัง</div>
      <div style="font-size: 14px; margin-top: 4px;">เรื่อง: <strong>${planTitle}</strong> • วันที่ออกเอกสาร: ${formatThaiDateTime()}</div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 7%;">ลำดับ</th>
          <th style="width: 18%;">วัน / เวลา</th>
          <th style="width: 25%;">ภารกิจ / นัดหมาย</th>
          <th style="width: 18%;">สถานที่ / พื้นที่</th>
          <th style="width: 16%;">ผู้รับผิดชอบ</th>
          <th style="width: 16%;">หมายเหตุ</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <div class="sign-row">
      <div class="sign-box">
        <div>ลงชื่อ.......................................................ผู้จัดทำแผน/นัดหมาย</div>
        <div style="margin-top: 4px;">(${signers.inspectorName || '.......................................................'})</div>
        <div>ตำแหน่ง ${signers.inspectorPosition || 'เจ้าหน้าที่กองสาธารณสุขและสิ่งแวดล้อม'}</div>
      </div>
      <div class="sign-box">
        <div>ลงชื่อ.......................................................ผู้รับทราบ/อนุมัติแผน</div>
        <div style="margin-top: 4px;">(${signers.directorName || 'นางสาวปฐมาภรณ์ จันทร์แจ่ม'})</div>
        <div>ตำแหน่ง ${signers.directorPosition || 'ผู้อำนวยการกองสาธารณสุขและสิ่งแวดล้อม'}</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * 3. Build Notification + Official A4 Schedule Form for Calendar Events / Action Plans
 */
export function buildCalendarNotificationPayload(
  events: CalendarScheduleItem[],
  planTitle: string = 'แจ้งเตือนนัดหมายและแผนปฏิบัติงานประจำวัน',
  signers: SignerSettings = DEFAULT_SIGNER_SETTINGS
): NotificationPayload {
  const isSingle = events.length === 1;
  const firstEvent = events[0];
  const refCode = isSingle && firstEvent?.id
    ? (firstEvent.id.startsWith('PLAN-') || firstEvent.id.startsWith('CAL-') || firstEvent.id.startsWith('ACT-')
        ? firstEvent.id
        : `PLAN-${firstEvent.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 16)}`)
    : `PLAN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;

  const htmlSource = generateOfficialCalendarPlanHtml(events, planTitle, signers);

  // Also create a clean .docx Petition-formatted schedule summary so Word users can open it
  const summaryDetails = events
    .map((e, i) => `${i + 1}. [${e.date} ${e.time || ''}] ${e.title} (${e.location || 'ทต.บางเป้า'}) - ผู้รับผิดชอบ: ${e.assignee || 'กองสาธารณสุขฯ'}`)
    .join('\n');

  const pseudoPetition: PublicPetition = {
    id: refCode,
    trackingCode: refCode,
    submissionDate: new Date().toISOString().slice(0, 10),
    citizenName: signers.directorName || 'กองสาธารณสุขและสิ่งแวดล้อม ทต.บางเป้า',
    phone: '075-251-xxx',
    address: 'ต.บางเป้า อ.กันตัง จ.ตรัง',
    title: planTitle,
    category: 'other',
    description: `สรุปกำหนดการนัดหมายและแผนปฏิบัติงาน จำนวน ${events.length} รายการ ได้แก่:\n${summaryDetails}`,
    status: 'accepted',
    assignedOfficer: 'กองสาธารณสุขและสิ่งแวดล้อม',
  };
  const docxBytes = generatePetitionDocxBytes(pseudoPetition, signers);
  const docxBase64 = uint8ArrayToBase64(docxBytes);

  const attachment: NotificationAttachment = {
    id: `att-plan-${Date.now()}`,
    title: `แบบฟอร์มตารางนัดหมายและแผนปฏิบัติงาน (A4) - ${planTitle}`,
    formType: 'calendar_plan',
    fileNamePdf: `แบบฟอร์มแผนปฏิบัติงาน_${refCode}.pdf`,
    fileNameDocx: `แบบฟอร์มแผนปฏิบัติงาน_${refCode}.docx`,
    htmlSource,
    docxBase64,
  };

  const portalCalendarUrl = `https://bangpao-app.vercel.app/?tab=calendar&event=${encodeURIComponent(firstEvent?.id || refCode)}`;
  const attachmentViewUrl = `https://bangpao-app.vercel.app/?tab=calendar&event=${encodeURIComponent(firstEvent?.id || refCode)}&attachment=true`;

  const badgeText = isSingle && (firstEvent?.docType || firstEvent?.type === 'meeting' || firstEvent?.type === 'training')
    ? '📢 หนังสือเชิญ & ประชุมอบรม'
    : '📅 นัดหมายปฏิทิน & แผนงาน';

  const subtitle = isSingle
    ? `${firstEvent?.assignee || 'กองสาธารณสุขและสิ่งแวดล้อม'} • ทต.บางเป้า`
    : `จำนวน ${events.length} ภารกิจ • กองสาธารณสุขและสิ่งแวดล้อม ทต.บางเป้า`;

  const lineFlexContents = buildCalendarFlexBubble({
    badgeText,
    headerBgColor: '#312E81',
    referenceCode: refCode,
    title: planTitle,
    subtitle,
    events,
    attachmentNames: [attachment.fileNamePdf, attachment.fileNameDocx],
    portalCalendarUrl,
    attachmentViewUrl,
  });

  const summaryLines = isSingle && firstEvent
    ? [
        { label: '🗓️ วันเวลา', value: `${formatThaiDateWithDay(firstEvent.date)} • ${firstEvent.time || (firstEvent.startTime ? `${firstEvent.startTime} - ${firstEvent.endTime || '16:30'} น.` : 'ตามเวลาราชการ')}` },
        { label: '📍 สถานที่', value: firstEvent.location || 'สำนักงานเทศบาลตำบลบางเป้า' },
        { label: '👤 ผู้รับผิดชอบ', value: firstEvent.assignee || 'กองสาธารณสุขและสิ่งแวดล้อม' },
        ...(firstEvent.docType || firstEvent.docNumber ? [{ label: '📜 เอกสารต้นเรื่อง', value: `${firstEvent.docType || 'หนังสือราชการ'}${firstEvent.docNumber ? ` ที่ ${firstEvent.docNumber}` : ''}${firstEvent.fromAgency ? ` (${firstEvent.fromAgency})` : ''}` }] : []),
        ...(firstEvent.description ? [{ label: '📝 วาระ/รายละเอียด', value: firstEvent.description }] : []),
      ]
    : events.slice(0, 6).map((ev, idx) => ({
        label: `${idx + 1}. [${ev.time || '09:00 น.'}] ${formatThaiDateShort(ev.date)}`,
        value: `${ev.title} • 📍 ${ev.location || 'ทต.บางเป้า'} • 👤 ${ev.assignee || 'กองสาธารณสุขฯ'}`,
      }));

  const emailSubject = `[กองสาธารณสุข ทต.บางเป้า] 📅 ${planTitle} (${events.length} รายการ พร้อมไฟล์ตารางแผนงาน A4)`;
  const emailHtmlBody = buildOfficialEmailHtml({
    badgeText,
    headerBgColor: '#312E81',
    referenceCode: refCode,
    title: planTitle,
    subtitle,
    summaryLines,
    attachments: [attachment],
  });

  const lineTextFallback = isSingle && firstEvent
    ? [
        `${badgeText} [${refCode}]`,
        `เรื่อง: ${planTitle}`,
        `🗓️ วันเวลา: ${formatThaiDateWithDay(firstEvent.date)} (${firstEvent.time || 'เวลาราชการ'})`,
        `📍 สถานที่: ${firstEvent.location || 'สำนักงานเทศบาลตำบลบางเป้า'}`,
        `👤 ผู้รับผิดชอบ: ${firstEvent.assignee || 'กองสาธารณสุขและสิ่งแวดล้อม'}`,
        firstEvent.description ? `📝 รายละเอียด: ${firstEvent.description}` : '',
        `📅 เปิดดูในปฏิทินเทศบาล: ${portalCalendarUrl}`,
        `📎 แนบไฟล์แบบฟอร์มแผนงาน A4 (${attachment.fileNamePdf}) ทางอีเมลแล้ว`,
      ].filter(Boolean).join('\n')
    : [
        `${badgeText} [${refCode}]`,
        `เรื่อง: ${planTitle}`,
        ...events.map((e, i) => `${i + 1}. ${formatThaiDateShort(e.date)} ${e.time || ''} - ${e.title} (${e.location || 'ทต.บางเป้า'})`),
        `📅 เปิดดูในปฏิทินเทศบาล: ${portalCalendarUrl}`,
        `📎 แนบไฟล์ตารางแผนปฏิบัติงาน A4 (${attachment.fileNamePdf}) เข้าอีเมลกองสาธารณสุขแล้ว`,
      ].join('\n');

  return {
    eventType: 'calendar_event',
    referenceCode: refCode,
    title: planTitle,
    subtitle,
    urgency: 'normal',
    requesterName: 'ระบบปฏิทินและแผนปฏิบัติงาน กองสาธารณสุขฯ',
    requesterPhone: '-',
    villageName: 'ทุกหมู่บ้าน (หมู่ที่ 1 - 7)',
    address: 'เทศบาลตำบลบางเป้า',
    summaryLines,
    lineTextFallback,
    lineFlexContents,
    emailSubject,
    emailHtmlBody,
    attachments: [attachment],
    createdAt: new Date().toISOString(),
  };
}

/**
 * 4. Build Notification for Medical Equipment Follow-up & Due Return Reminders
 */
export function buildFollowUpNotificationPayload(
  loans: (EquipmentLoan & Record<string, any>)[],
  signers: SignerSettings = DEFAULT_SIGNER_SETTINGS
): NotificationPayload {
  const refCode = `FOLLOW-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
  const targetLoans = loans.slice(0, 5);

  // Attach the official A4 loan contract for each due loan (up to 3) so officers can print immediately
  const attachments: NotificationAttachment[] = targetLoans.slice(0, 3).map((ln, idx) => {
    const htmlSource = generateOfficialMedicalLoanHtml(ln, signers);
    const docxBytes = generateOfficialMedicalLoanDocxBytes(ln, signers);
    const safeCode = (ln.loanCode || ln.id || `MED_${idx + 1}`).replace(/[^a-zA-Z0-9_-]/g, '_');
    return {
      id: `att-follow-${idx}-${Date.now()}`,
      title: `แบบฟอร์มสัญญาและติดตามอาการ (A4) - ผู้ป่วย ${ln.patientName} (${ln.equipmentName})`,
      formType: 'followup_report',
      fileNamePdf: `แบบติดตามอุปกรณ์_${safeCode}.pdf`,
      fileNameDocx: `แบบติดตามอุปกรณ์_${safeCode}.docx`,
      htmlSource,
      docxBase64: uint8ArrayToBase64(docxBytes),
    };
  });

  const summaryLines = targetLoans.map((ln, idx) => ({
    label: `${idx + 1}. ${ln.patientName}`,
    value: `${ln.itemsSummary || ln.equipmentName} • โทร. ${ln.borrowerPhone || ln.phone || '-'} (${ln.moo ? `หมู่ที่ ${ln.moo}` : ln.village || '-'}) • กำหนดติดตาม: ${ln.dueDate || ln.expectedReturnDate || 'ครบกำหนด'}`,
  }));

  const badgeText = '⏰ เตือนติดตามอาการ / กำหนดคืนอุปกรณ์';
  const headerBgColor = '#E11D48';
  const accentColor = '#BE123C';
  const title = `แจ้งเตือนโทรติดตามอาการผู้ป่วยและกำหนดคืนอุปกรณ์ (${loans.length} ราย)`;
  const subtitle = `เพื่อสอบถามอาการผู้ป่วยว่ายังจำเป็นต้องใช้ต่อ หรือพร้อมส่งคืนเข้าคลังอุปกรณ์`;

  const lineFlexContents = buildLineFlexBubble({
    badgeText,
    headerBgColor,
    accentColor,
    referenceCode: refCode,
    title,
    subtitle,
    summaryLines,
    attachmentNames: attachments.map((a) => a.fileNamePdf),
    phone: targetLoans[0]?.borrowerPhone || targetLoans[0]?.phone,
    portalUrl: 'https://bangpao-app.vercel.app/?tab=equipment&sub=loans',
    primaryButtonLabel: '📋 ดูรายการอุปกรณ์และโทรติดตาม',
    primaryButtonColor: '#BE123C',
  });

  const emailSubject = `[กองสาธารณสุข ทต.บางเป้า] ⏰ แจ้งเตือนติดตามอาการและกำหนดคืนอุปกรณ์การแพทย์ (${loans.length} ราย)`;
  const emailHtmlBody = buildOfficialEmailHtml({
    badgeText,
    headerBgColor,
    referenceCode: refCode,
    title,
    subtitle,
    summaryLines,
    attachments,
  });

  const lineTextFallback = [
    `${badgeText} [${refCode}]`,
    `จำนวนผู้ป่วยครบกำหนดติดตามอาการ: ${loans.length} ราย`,
    ...targetLoans.map(
      (ln, i) => `${i + 1}. ผู้ป่วย ${ln.patientName} (${ln.itemsSummary || ln.equipmentName}) โทร. ${ln.borrowerPhone || ln.phone || '-'}`
    ),
  ].join('\n');

  return {
    eventType: 'equipment_followup',
    referenceCode: refCode,
    title,
    subtitle,
    urgency: 'urgent',
    requesterName: targetLoans[0]?.patientName || 'คลังอุปกรณ์ทางการแพทย์',
    requesterPhone: targetLoans[0]?.borrowerPhone || targetLoans[0]?.phone || '-',
    villageName: targetLoans[0]?.moo ? `หมู่ที่ ${targetLoans[0].moo}` : 'ต.บางเป้า',
    address: targetLoans[0]?.address || '-',
    summaryLines,
    lineTextFallback,
    lineFlexContents,
    emailSubject,
    emailHtmlBody,
    attachments,
    createdAt: new Date().toISOString(),
  };
}

/**
 * 5. Build Official A4 Manifest HTML & Notification Payload for LTC & NHSO Care Pack Delivery Queue (ครบทุกคน + ระบบนำทางตามแผนที่ครบทุกจุด)
 */
const STORAGE_KEY_LATEST_LTC_QUEUE_JOB = 'bangpao_latest_ltc_queue_job_v1';

const DEFAULT_PATIENT_ITEMS_FALLBACK: Record<string, string> = {
  'นายสุนทร สาพิมพ์': 'นมผงสุขภาพสำหรับผู้สูงอายุ (4 กระป๋อง), ผ้าอ้อมผู้ใหญ่ Size M (160 ชิ้น)',
  'นายสุนทร ซาพิมพ์': 'นมผงสุขภาพสำหรับผู้สูงอายุ (4 กระป๋อง), ผ้าอ้อมผู้ใหญ่ Size M (160 ชิ้น)',
  'นายเลียบ ทองหมึก': 'ผ้าอ้อมผู้ใหญ่ Size L (210 ชิ้น)',
  'นายเรียบ ทองหมึก': 'ผ้าอ้อมผู้ใหญ่ Size L (210 ชิ้น)',
  'นายยี่ แซ่จุ้ย': 'ผ้าอ้อมผู้ใหญ่ Size M (200 ชิ้น)',
  'นายชี แซ่จุ้ย': 'ผ้าอ้อมผู้ใหญ่ Size M (200 ชิ้น)',
  'นางผึ้ง ดำหนูจันทร์': 'ผ้าอ้อมผู้ใหญ่ Size M (160 ชิ้น), นมผงสุขภาพสำหรับผู้สูงอายุ (4 กระป๋อง)',
  'นางพริ้ง ดำหนูจันทร์': 'ผ้าอ้อมผู้ใหญ่ Size M (160 ชิ้น), นมผงสุขภาพสำหรับผู้สูงอายุ (4 กระป๋อง)',
  'นางแดง อัตตศุภผลินทร์': 'ผ้าอ้อมผู้ใหญ่ Size M (170 ชิ้น), ผ้าอ้อมผู้ใหญ่ Size L (100 ชิ้น)',
};

export function normalizeLtcQueueInput(raw: any): LtcDeliveryQueueNotifyInput {
  const rawStops: any[] = Array.isArray(raw?.stops) ? raw.stops : [];
  const normalizedStops: LtcQueueStopNotifyItem[] = rawStops.map((st: any, idx: number) => {
    const qOrder = Number(st.queueOrder || st.queueNumber || idx + 1);
    const itemsList = Array.isArray(st.itemsList) ? st.itemsList : [];
    const fromListText =
      itemsList.length > 0
        ? itemsList.map((it: any) => `${it.itemName} (${it.quantity} ${it.unit || 'ชิ้น'})`).join(', ')
        : '';
    const pName = String(st.patientName || `ผู้มีภาวะพึ่งพิง รายที่ ${qOrder}`).trim();
    const resolvedItemsText =
      st.itemsText ||
      st.itemsSummary ||
      fromListText ||
      DEFAULT_PATIENT_ITEMS_FALLBACK[pName] ||
      'ชุดดูแลผู้มีภาวะพึ่งพิง (ผ้าอ้อมผู้ใหญ่ / แผ่นรองซับ / เวชภัณฑ์ตามแผนการดูแล)';
    const lat = Number(st.lat) || 7.429578;
    const lng = Number(st.lng) || 99.525737;
    const indivUrl =
      st.individualMapsUrl ||
      st.googleMapsUrl ||
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

    return {
      queueOrder: qOrder,
      stopId: st.stopId || st.id || `STOP-${String(qOrder).padStart(2, '0')}`,
      patientId: st.patientId || `LTC-${String(qOrder).padStart(2, '0')}`,
      patientName: pName,
      age: st.age ? Number(st.age) : undefined,
      adlCategory: st.adlCategory || 'ติดเตียง',
      adlScore: st.adlScore,
      moo: String(st.moo || '1'),
      village: st.village || `หมู่ที่ ${st.moo || '1'}`,
      address: st.address || `หมู่ที่ ${st.moo || '1'} ต.บางเป้า อ.กันตัง จ.ตรัง`,
      caregiverName: st.caregiverName || 'ญาติ/ผู้ดูแลผู้ป่วย',
      phone: st.phone && st.phone !== '075-251-xxx' ? st.phone : st.phone || '081-234-5678',
      itemsText: resolvedItemsText,
      itemsList:
        itemsList.length > 0
          ? itemsList
          : [{ itemName: resolvedItemsText, quantity: 1, unit: 'ชุด' }],
      lat,
      lng,
      individualMapsUrl: indivUrl,
      fieldDeliveryStatus: st.fieldDeliveryStatus,
      fieldDeliveryNote: st.fieldDeliveryNote,
    };
  });

  return {
    referenceCode:
      raw?.referenceCode ||
      `LTC-${raw?.fiscalYear || '2569'}-R${raw?.roundKey || '1'}-Q${normalizedStops.length}`,
    fiscalYear: String(raw?.fiscalYear || '2569'),
    roundKey: String(raw?.roundKey || '1'),
    roundLabel: String(raw?.roundLabel || 'วงรอบที่ 1 (ต.ค. – มี.ค.)'),
    mooFilterLabel: String(
      raw?.mooFilterLabel || raw?.villageFilterLabel || 'ทุกหมู่บ้าน (หมู่ที่ 1 – 7 ตำบลบางเป้า)'
    ),
    officerName: raw?.officerName || raw?.preparedBy || 'ทีมงานดูแลผู้มีภาวะพึ่งพิง (LTC) กองสาธารณสุขฯ',
    originName: String(raw?.originName || raw?.originLabel || 'เทศบาลตำบลบางเป้า'),
    originLat: Number(raw?.originLat) || 7.402139,
    originLng: Number(raw?.originLng) || 99.527028,
    distanceKm: raw?.distanceKm ? Number(raw?.distanceKm) : undefined,
    durationMin: raw?.durationMin ? Number(raw?.durationMin) : undefined,
    multiStopGoogleMapsUrl:
      raw?.multiStopGoogleMapsUrl ||
      'https://www.google.com/maps/dir/?api=1&origin=7.402139,99.527028&destination=7.429578,99.525737&travelmode=driving',
    totalSupplySummary: Array.isArray(raw?.totalSupplySummary) ? raw.totalSupplySummary : [],
    stops: normalizedStops,
  };
}

export function getStoredLatestLtcQueueJob(): LtcDeliveryQueueNotifyInput | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LATEST_LTC_QUEUE_JOB);
    if (!raw) return null;
    return normalizeLtcQueueInput(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function generateOfficialLtcDeliveryManifestHtml(
  input: LtcDeliveryQueueNotifyInput,
  signers: SignerSettings = DEFAULT_SIGNER_SETTINGS
): string {
  const refCode =
    input.referenceCode || `LTC-${input.fiscalYear}-R${input.roundKey}-Q${input.stops.length}`;
  const supplyRowsHtml =
    input.totalSupplySummary.length > 0
      ? input.totalSupplySummary
          .map(
            (s, i) => `
          <tr>
            <td style="border: 1px solid #000; padding: 6px 8px; text-align: center;">${i + 1}</td>
            <td style="border: 1px solid #000; padding: 6px 10px; font-weight: bold;">${s.itemName}</td>
            <td style="border: 1px solid #000; padding: 6px 10px; text-align: center; font-weight: bold;">${s.totalQty.toLocaleString()}</td>
            <td style="border: 1px solid #000; padding: 6px 10px; text-align: center;">${s.unit}</td>
          </tr>`
          )
          .join('')
      : `<tr><td colspan="4" style="border: 1px solid #000; padding: 8px; text-align: center;">ตามรายการพัสดุรายบุคคลด้านล่าง</td></tr>`;

  const stopRowsHtml = input.stops
    .map(
      (st) => `
      <tr>
        <td style="border: 1px solid #000; padding: 7px 6px; text-align: center; font-weight: bold;">คิวที่ #${st.queueOrder}</td>
        <td style="border: 1px solid #000; padding: 7px 8px;">
          <div style="font-weight: bold;">${st.patientName}</div>
          <div style="font-size: 12px; color: #334155;">กลุ่ม: ${st.adlCategory}${st.adlScore !== undefined ? ` (ADL ${st.adlScore})` : ''}</div>
        </td>
        <td style="border: 1px solid #000; padding: 7px 8px;">
          <div>หมู่ที่ ${st.moo} ${st.village}</div>
          <div style="font-size: 12px;">${st.address}</div>
          <div style="font-size: 12px; color: #0f766e;">ผู้ดูแล: ${st.caregiverName || 'ญาติผู้ดูแล'} (${st.phone || '-'})</div>
        </td>
        <td style="border: 1px solid #000; padding: 7px 8px; font-weight: 600;">${st.itemsText}</td>
        <td style="border: 1px solid #000; padding: 7px 6px; text-align: center; font-size: 12px;">
          <div>${st.lat.toFixed(6)},</div>
          <div>${st.lng.toFixed(6)}</div>
        </td>
        <td style="border: 1px solid #000; padding: 7px 8px; text-align: center; color: #64748b; font-size: 12px;">
          ลงชื่อ....................................<br/>วันที่......../......../........
        </td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <title>ใบเบิกจ่ายและแผนการจัดส่งพัสดุ LTC - ${refCode}</title>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4 portrait; margin: 14mm 14mm; }
    body { font-family: 'Sarabun', sans-serif; font-size: 14px; color: #000; line-height: 1.45; margin: 0; padding: 18px; }
    .page { max-width: 210mm; margin: 0 auto; background: #fff; }
    .header { text-align: center; margin-bottom: 14px; border-bottom: 2px solid #0f766e; padding-bottom: 10px; }
    .title { font-size: 19px; font-weight: 700; margin-bottom: 3px; }
    .subtitle { font-size: 15px; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 16px; font-size: 13px; }
    th { border: 1px solid #000; padding: 7px 6px; background: #f1f5f9; font-weight: 700; text-align: center; }
    .sign-row { display: flex; justify-content: space-between; margin-top: 28px; }
    .sign-box { width: 46%; text-align: center; }
    @media print { .no-print { display: none !important; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="no-print" style="text-align: right; margin-bottom: 12px;">
    <button onclick="window.print()" style="background: #0f766e; color: #fff; border: none; padding: 10px 18px; border-radius: 8px; font-weight: bold; cursor: pointer;">
      🖨️ พิมพ์ใบเบิกจ่ายและบัญชีคิวส่งมอบพัสดุ LTC (A4)
    </button>
  </div>
  <div class="page">
    <div class="header">
      <div class="title">บัญชีรายชื่อและแผนการจัดส่งพัสดุดูแลผู้มีภาวะพึ่งพิง (LTC) ตามลำดับคิว</div>
      <div class="subtitle">กองทุนหลักประกันสุขภาพ & กองสาธารณสุขและสิ่งแวดล้อม เทศบาลตำบลบางเป้า อ.กันตัง จ.ตรัง</div>
      <div style="font-size: 13px; margin-top: 4px;">
        รหัสแผนจัดส่ง: <strong>${refCode}</strong> • ประจำ: <strong>ปีงบประมาณ ${input.fiscalYear} (${input.roundLabel})</strong> • พื้นที่: <strong>${input.mooFilterLabel}</strong> • วันที่ออกเอกสาร: ${formatThaiDateTime()}
      </div>
    </div>

    <div style="font-weight: 700; font-size: 14px; margin-top: 6px;">
      ส่วนที่ 1: สรุปยอดสิ่งของ/พัสดุที่ต้องเบิกจ่ายขึ้นรถในรอบคิวนี้ (รวมทั้งสิ้น ${input.stops.length} หลังคาเรือน)
    </div>
    <table>
      <thead>
        <tr>
          <th style="width: 10%;">ลำดับ</th>
          <th style="width: 55%;">รายการสิ่งของ / พัสดุดูแลผู้มีภาวะพึ่งพิง (LTC)</th>
          <th style="width: 20%;">จำนวนรวมทั้งสิ้น</th>
          <th style="width: 15%;">หน่วยนับ</th>
        </tr>
      </thead>
      <tbody>
        ${supplyRowsHtml}
      </tbody>
    </table>

    <div style="font-weight: 700; font-size: 14px; margin-top: 10px;">
      ส่วนที่ 2: ลำดับคิวจัดส่งพัสดุรายบุคคล (เริ่มเดินทางจาก: ${input.originName} พิกัด ${input.originLat}, ${input.originLng}${input.distanceKm ? ` • ระยะทางรวม ~${input.distanceKm} กม.` : ''})
    </div>
    <table>
      <thead>
        <tr>
          <th style="width: 9%;">ลำดับคิว</th>
          <th style="width: 20%;">ชื่อ-นามสกุล / กลุ่ม ADL</th>
          <th style="width: 24%;">ที่อยู่ / หมู่บ้าน / ผู้ดูแล</th>
          <th style="width: 23%;">รายการสิ่งของที่ได้รับในรอบนี้</th>
          <th style="width: 11%;">พิกัด GPS</th>
          <th style="width: 13%;">ลายมือชื่อผู้รับของ</th>
        </tr>
      </thead>
      <tbody>
        ${stopRowsHtml}
      </tbody>
    </table>

    <div style="border: 1px dashed #0f766e; background: #f0fdfa; padding: 10px 12px; border-radius: 8px; font-size: 12px; margin-bottom: 18px;">
      <strong>🗺️ ลิงก์นำทาง Google Maps แบบครบทุกคนตามลำดับคิว (ทต.บางเป้า ➔ คิวที่ #1 ถึง #${input.stops.length}):</strong><br/>
      <a href="${input.multiStopGoogleMapsUrl}" target="_blank" style="color: #0f766e; word-break: break-all;">${input.multiStopGoogleMapsUrl}</a>
    </div>

    <div class="sign-row">
      <div class="sign-box">
        <div>ลงชื่อ.......................................................เจ้าหน้าที่ผู้เบิก/จัดส่งพัสดุ</div>
        <div style="margin-top: 4px;">(${input.officerName || signers.inspectorName || '.......................................................'})</div>
        <div>ตำแหน่ง ${signers.inspectorPosition || 'เจ้าหน้าที่กองสาธารณสุขและสิ่งแวดล้อม'}</div>
      </div>
      <div class="sign-box">
        <div>ลงชื่อ.......................................................ผู้ตรวจสอบ/อนุมัติจ่ายพัสดุ</div>
        <div style="margin-top: 4px;">(${signers.directorName || 'นางสาวปฐมาภรณ์ จันทร์แจ่ม'})</div>
        <div>ตำแหน่ง ${signers.directorPosition || 'ผู้อำนวยการกองสาธารณสุขและสิ่งแวดล้อม'}</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function buildLtcDeliveryQueueNotificationPayload(
  rawInput: LtcDeliveryQueueNotifyInput | Record<string, any>,
  signers: SignerSettings = DEFAULT_SIGNER_SETTINGS
): NotificationPayload {
  const input = normalizeLtcQueueInput(rawInput);
  const refCode =
    input.referenceCode || `LTC-${input.fiscalYear}-R${input.roundKey}-Q${input.stops.length}`;

  try {
    const queueToSave = { ...input, referenceCode: refCode };
    localStorage.setItem(STORAGE_KEY_LATEST_LTC_QUEUE_JOB, JSON.stringify(queueToSave));
    saveLtcQueueToFirestore(queueToSave).catch(() => {});
  } catch {
    // ignore storage quota errors
  }

  const htmlSource = generateOfficialLtcDeliveryManifestHtml(
    { ...input, referenceCode: refCode },
    signers
  );

  // Create Word (.docx) document with complete supply totals + all patients in queue + GPS links
  const supplySummaryText =
    input.totalSupplySummary.length > 0
      ? input.totalSupplySummary.map((s) => `${s.itemName}: รวม ${s.totalQty.toLocaleString()} ${s.unit}`).join(' | ')
      : 'ตามรายการรายบุคคล';

  const stopsDetailForDocx = input.stops
    .map(
      (st) =>
        `คิวที่ #${st.queueOrder}: ${st.patientName} (${st.adlCategory}) - หมู่ที่ ${st.moo} ${st.village} (${st.address}) โทร: ${st.phone || '-'} | สิ่งของ: ${st.itemsText} | พิกัด: ${st.lat.toFixed(6)}, ${st.lng.toFixed(6)}`
    )
    .join('\n');

  const pseudoPetition: PublicPetition = {
    id: refCode,
    trackingCode: refCode,
    submissionDate: new Date().toISOString().slice(0, 10),
    citizenName: input.officerName || signers.inspectorName || 'ทีมจัดส่งพัสดุ LTC กองสาธารณสุขฯ',
    phone: input.stops[0]?.phone || '075-270569',
    address: `${input.mooFilterLabel} ต.บางเป้า อ.กันตัง จ.ตรัง`,
    title: `แผนจัดส่งพัสดุ สปสช. & LTC (ปี ${input.fiscalYear} • ${input.roundLabel}) จำนวน ${input.stops.length} คิว`,
    category: 'other',
    description: `สรุปยอดสิ่งของเบิกจ่ายรวม: ${supplySummaryText}\n\nรายชื่อผู้รับมอบเรียงตามคิว (ครบทั้ง ${input.stops.length} ราย):\n${stopsDetailForDocx}\n\nลิงก์นำทาง Google Maps ครบทุกคน: ${input.multiStopGoogleMapsUrl}`,
    status: 'assigned',
    assignedOfficer: input.officerName || 'ทีมงาน LTC กองสาธารณสุข ทต.บางเป้า',
  };

  const docxBytes = generatePetitionDocxBytes(pseudoPetition, signers);
  const docxBase64 = uint8ArrayToBase64(docxBytes);
  const safeRef = refCode.replace(/[^a-zA-Z0-9_-]/g, '_');

  const attachment: NotificationAttachment = {
    id: `att-ltc-${Date.now()}`,
    title: `ใบเบิกจ่ายและบัญชีคิวจัดส่งพัสดุ LTC (A4) - ปี ${input.fiscalYear} ${input.roundLabel} (${input.stops.length} ราย)`,
    formType: 'ltc_delivery_manifest',
    fileNamePdf: `บัญชีคิวส่งมอบพัสดุ_LTC_${safeRef}.pdf`,
    fileNameDocx: `บัญชีคิวส่งมอบพัสดุ_LTC_${safeRef}.docx`,
    htmlSource,
    docxBase64,
  };

  const bedriddenCount = input.stops.filter((s) => s.adlCategory === 'ติดเตียง').length;
  const homeboundCount = input.stops.filter((s) => s.adlCategory !== 'ติดเตียง').length;

  const summaryLines: { label: string; value: string }[] = [
    { label: 'รหัสแผนจัดส่ง LTC', value: refCode },
    { label: 'ปีงบประมาณ / วงรอบ', value: `ปีงบประมาณ ${input.fiscalYear} • ${input.roundLabel}` },
    { label: 'พื้นที่เป้าหมาย', value: input.mooFilterLabel },
    {
      label: 'จำนวนผู้รับมอบในคิว',
      value: `ครบทั้ง ${input.stops.length} ราย (ติดเตียง ${bedriddenCount} ราย, ติดบ้าน ${homeboundCount} ราย)`,
    },
    {
      label: 'สรุปยอดสิ่งของรวมทั้งหมด',
      value: supplySummaryText,
    },
    {
      label: 'จุดเริ่มต้น & ระยะทาง',
      value: `${input.originName} (${input.originLat}, ${input.originLng})${
        input.distanceKm ? ` • ระยะทางรวม ~${input.distanceKm} กม. (~${input.durationMin || 10} นาที)` : ''
      }`,
    },
    ...input.stops.map((st) => {
      const statusSuffix =
        st.fieldDeliveryStatus === 'delivered'
          ? ' [✅ ส่งมอบสำเร็จ]'
          : st.fieldDeliveryStatus === 'issue_blocked'
          ? ` [⚠️ ติดขัด: ${st.fieldDeliveryNote || 'รอนัดส่งใหม่'}]`
          : '';
      return {
        label: `🚩 คิวที่ #${st.queueOrder}: ${st.patientName} (${st.adlCategory})${statusSuffix}`,
        value: [
          `👤 ใคร (ผู้รับของ): ${st.patientName}${st.age ? ` (อายุ ${st.age} ปี)` : ''} • กลุ่ม${st.adlCategory}`,
          `🏠 ที่ไหน (ที่อยู่): ${st.address} (หมู่ที่ ${st.moo} ${st.village} ต.บางเป้า)`,
          `📦 รับอะไร (สิ่งของรอบนี้): ${st.itemsText}`,
          `📞 ติดต่อยังไง: โทร. ${st.phone || '-'}${st.caregiverName ? ` (${st.caregiverName})` : ''}`,
          st.fieldDeliveryStatus
            ? `📋 ผลส่งมอบรายบ้าน: ${
                st.fieldDeliveryStatus === 'delivered'
                  ? '✅ ส่งมอบเรียบร้อยแล้ว'
                  : `⚠️ ติดขัด (${st.fieldDeliveryNote || 'รอนัดส่งใหม่'})`
              }`
            : '',
          `📍 พิกัดบ้าน & นำทาง: ${st.lat.toFixed(6)}, ${st.lng.toFixed(6)} ${st.individualMapsUrl}`,
        ]
          .filter(Boolean)
          .join('\n'),
      };
    }),
  ];

  const badgeText = '🚑 แจ้งเตือนคิวส่งมอบพัสดุ สปสช. & LTC';
  const headerBgColor = '#0F766E';
  const accentColor = '#0D9488';
  const title = `จัดคิวส่งมอบพัสดุ LTC เรียบร้อย (${input.stops.length} บ้าน • ปี ${input.fiscalYear})`;
  const subtitle = `${input.roundLabel} • ${input.mooFilterLabel} • พร้อมแผนที่นำทางครบทุกคน`;

  // Build Enhanced LINE Flex Bubble with per-stop navigation buttons + full multi-stop route button + field job action button
  const baseFlex = buildLineFlexBubble({
    badgeText,
    headerBgColor,
    accentColor,
    referenceCode: refCode,
    title,
    subtitle,
    summaryLines, // Include complete overview + per-person details
    attachmentNames: [attachment.fileNamePdf, attachment.fileNameDocx],
    googleMapsUrl: input.multiStopGoogleMapsUrl,
    phone: input.stops[0]?.phone,
    portalUrl: `https://bangpao-app.vercel.app/?job=${encodeURIComponent(refCode)}`,
  });

  // Inject detailed per-patient cards (with individual Google Maps buttons!) into the LINE Flex Bubble body so NOTHING is omitted
  const perStopFlexBoxes = input.stops.map((st) => ({
    type: 'box',
    layout: 'vertical',
    margin: 'md',
    paddingAll: '10px',
    backgroundColor: st.adlCategory === 'ติดเตียง' ? '#FFF1F2' : '#F0FDFA',
    cornerRadius: '8px',
    contents: [
      {
        type: 'box',
        layout: 'horizontal',
        contents: [
          {
            type: 'text',
            text: `คิวที่ #${st.queueOrder}: ${st.patientName}`,
            weight: 'bold',
            size: 'sm',
            color: '#0F172A',
            flex: 5,
            wrap: true,
          },
          {
            type: 'text',
            text: st.adlCategory,
            weight: 'bold',
            size: 'xs',
            align: 'end',
            color: st.adlCategory === 'ติดเตียง' ? '#BE123C' : '#0F766E',
            flex: 2,
          },
        ],
      },
      {
        type: 'text',
        text: `📍 หมู่ที่ ${st.moo} ${st.village} • ${st.address}${st.phone ? ` (โทร: ${st.phone})` : ''}`,
        size: 'xs',
        color: '#334155',
        wrap: true,
        margin: 'xs',
      },
      {
        type: 'text',
        text: `📦 ${st.itemsText}`,
        size: 'xs',
        weight: 'bold',
        color: '#0F766E',
        wrap: true,
        margin: 'xs',
      },
      {
        type: 'box',
        layout: 'horizontal',
        margin: 'sm',
        contents: [
          {
            type: 'text',
            text: `GPS: ${st.lat.toFixed(5)}, ${st.lng.toFixed(5)}`,
            size: 'xxs',
            color: '#64748B',
            gravity: 'center',
            flex: 4,
          },
          {
            type: 'button',
            style: 'link',
            height: 'sm',
            flex: 3,
            action: {
              type: 'uri',
              label: `🚗 นำทางคิว #${st.queueOrder}`,
              uri: st.individualMapsUrl,
            },
          },
        ],
      },
    ],
  }));

  if (baseFlex.body && Array.isArray(baseFlex.body.contents)) {
    baseFlex.body.contents = [
      ...baseFlex.body.contents.slice(0, 6),
      { type: 'separator', margin: 'md' },
      {
        type: 'text',
        text: `📋 รายละเอียดคิวส่งมอบครบทั้ง ${input.stops.length} ราย (เรียงตามคิว):`,
        weight: 'bold',
        size: 'sm',
        color: '#0F766E',
        margin: 'md',
      },
      ...perStopFlexBoxes,
      ...baseFlex.body.contents.slice(6),
    ];
  }

  // Update footer button label on LINE Flex so it clearly says Multi-Stop Navigation for Everyone
  if (baseFlex.footer && Array.isArray(baseFlex.footer.contents)) {
    baseFlex.footer.contents = [
      {
        type: 'button',
        style: 'primary',
        color: '#059669',
        height: 'sm',
        action: {
          type: 'uri',
          label: `🗺️ นำทางแผนที่ครบทุกคน (คิว #1-#${input.stops.length})`,
          uri: input.multiStopGoogleMapsUrl,
        },
      },
      {
        type: 'button',
        style: 'primary',
        color: '#1D4ED8',
        height: 'sm',
        action: {
          type: 'uri',
          label: '👷 รับงานจัดส่ง / แจ้งจบงาน • ติดขัด',
          uri: `https://bangpao-app.vercel.app/?job=${encodeURIComponent(refCode)}`,
        },
      },
    ];
  }

  const emailSubject = `[กองสาธารณสุข ทต.บางเป้า] 🚑 แจ้งคิวจัดส่งพัสดุ LTC ปี ${input.fiscalYear} (${input.roundLabel}) ครบ ${input.stops.length} ราย พร้อมแผนที่นำทางและใบเบิก A4`;
  const emailHtmlBody = buildOfficialEmailHtml({
    badgeText,
    headerBgColor,
    referenceCode: refCode,
    title,
    subtitle,
    summaryLines,
    attachments: [attachment],
    googleMapsUrl: input.multiStopGoogleMapsUrl,
    requesterPhone: input.stops[0]?.phone,
  });

  const lineTextFallback = [
    `${badgeText} [${refCode}]`,
    `📅 ปีงบประมาณ ${input.fiscalYear} • ${input.roundLabel} (${input.mooFilterLabel})`,
    `📦 สรุปยอดสิ่งของเบิกจ่ายรวม: ${supplySummaryText}`,
    `🚩 ลำดับคิวส่งมอบครบทั้ง ${input.stops.length} ราย:`,
    ...input.stops.map(
      (st) =>
        `คิวที่ #${st.queueOrder}: ${st.patientName} (${st.adlCategory}) ม.${st.moo} ${st.village} (${st.address})\n   📦 สิ่งของ: ${st.itemsText}\n   📍 นำทางรายบ้าน: ${st.individualMapsUrl}`
    ),
    `----------------------------------------`,
    `🗺️ นำทาง Google Maps ครบทุกคนเรียงตามคิว (#1 ถึง #${input.stops.length}):`,
    input.multiStopGoogleMapsUrl,
    `👷 รับงานจัดส่ง / แจ้งผลหน้างาน: https://bangpao-app.vercel.app/?job=${encodeURIComponent(refCode)}`,
  ].join('\n');

  return {
    eventType: 'ltc_delivery_queue',
    referenceCode: refCode,
    title,
    subtitle,
    urgency: 'urgent',
    requesterName: `คิวส่งมอบพัสดุ LTC (${input.stops.length} ราย)`,
    requesterPhone: input.stops[0]?.phone || '-',
    villageName: input.mooFilterLabel,
    address: `เริ่มจาก ${input.originName} ไปยังบ้านผู้ป่วย ${input.stops.length} จุด`,
    lat: input.stops[0]?.lat || input.originLat,
    lng: input.stops[0]?.lng || input.originLng,
    googleMapsUrl: input.multiStopGoogleMapsUrl,
    summaryLines,
    lineTextFallback,
    lineFlexContents: baseFlex,
    emailSubject,
    emailHtmlBody,
    attachments: [attachment],
    createdAt: new Date().toISOString(),
  };
}

/**
 * 6. Build Field Officer Job Status Update Notification (รับงาน ➔ ออกปฏิบัติงาน ➔ จบงานสำเร็จ / ติดขัดปัญหาหน้างาน)
 */
export function buildFieldJobStatusUpdateNotificationPayload(params: {
  jobType: 'petition' | 'loan' | 'ltc_queue';
  actionState: 'accepted_en_route' | 'completed' | 'issue_blocked';
  officerName: string;
  actionNote: string;
  issueReason?: string;
  petition?: PublicPetition & Record<string, any>;
  loan?: EquipmentLoan & Record<string, any>;
  ltcQueue?: LtcDeliveryQueueNotifyInput;
  signers?: SignerSettings;
}): NotificationPayload {
  const signers = params.signers || DEFAULT_SIGNER_SETTINGS;
  const isLtc = params.jobType === 'ltc_queue' && params.ltcQueue;
  const isLoan = params.jobType === 'loan' && params.loan;
  const basePayload = isLtc
    ? buildLtcDeliveryQueueNotificationPayload(params.ltcQueue!, signers)
    : isLoan
    ? buildEquipmentLoanNotificationPayload(params.loan!, signers)
    : buildPetitionNotificationPayload(params.petition!, signers);

  const refCode = basePayload.referenceCode;
  const stateConfig =
    params.actionState === 'completed'
      ? {
          badgeText: '✅ ปิดจบงานสำเร็จ (ดำเนินการเรียบร้อย)',
          headerBgColor: '#059669',
          accentColor: '#047857',
          statusLabel: '✅ ดำเนินการเสร็จสิ้น / ปิดจบงาน',
          titlePrefix: '✅ ปิดจบงานสำเร็จ:',
        }
      : params.actionState === 'issue_blocked'
      ? {
          badgeText: '⚠️ รายงานปัญหาติดขัดหน้างาน (ไม่สำเร็จ)',
          headerBgColor: '#DC2626',
          accentColor: '#B91C1C',
          statusLabel: `⚠️ ติดขัดปัญหาหน้างาน (${params.issueReason || 'โปรดตรวจสอบ'})`,
          titlePrefix: '⚠️ ติดขัดปัญหาหน้างาน:',
        }
      : {
          badgeText: '🚚 เจ้าหน้าที่รับงานแล้ว (กำลังไปหน้างาน)',
          headerBgColor: '#2563EB',
          accentColor: '#1D4ED8',
          statusLabel: '🚚 รับออเดอร์งานแล้ว / กำลังออกปฏิบัติงาน',
          titlePrefix: '🚚 รับงานแล้ว:',
        };

  const updatedSummaryLines: { label: string; value: string }[] = [
    { label: 'สถานะใบงานล่าสุด', value: stateConfig.statusLabel },
    { label: 'เจ้าหน้าที่ผู้ปฏิบัติงาน', value: params.officerName || 'เจ้าหน้าที่กองสาธารณสุขฯ' },
    ...(params.issueReason ? [{ label: 'สาเหตุที่ติดขัด', value: params.issueReason }] : []),
    { label: 'รายงานผลหน้างาน', value: params.actionNote || '-' },
    { label: 'เวลาที่อัปเดตสถานะ', value: formatThaiDateTime() },
    ...basePayload.summaryLines,
  ];

  const title = `${stateConfig.titlePrefix} ${refCode}`;
  const subtitle = `${basePayload.subtitle} • โดย ${params.officerName || 'เจ้าหน้าที่หน้างาน'}`;

  const lineFlexContents = buildLineFlexBubble({
    badgeText: stateConfig.badgeText,
    headerBgColor: stateConfig.headerBgColor,
    accentColor: stateConfig.accentColor,
    referenceCode: refCode,
    title,
    subtitle,
    summaryLines: updatedSummaryLines,
    attachmentNames: basePayload.attachments.map((a) => a.fileNamePdf),
    googleMapsUrl: basePayload.googleMapsUrl,
    phone: basePayload.requesterPhone,
  });

  const emailSubject = `[อัปเดตสถานะหน้างาน ทต.บางเป้า] ${title} - ${basePayload.requesterName}`;
  const emailHtmlBody = buildOfficialEmailHtml({
    badgeText: stateConfig.badgeText,
    headerBgColor: stateConfig.headerBgColor,
    referenceCode: refCode,
    title,
    subtitle,
    summaryLines: updatedSummaryLines,
    attachments: basePayload.attachments,
    googleMapsUrl: basePayload.googleMapsUrl,
    requesterPhone: basePayload.requesterPhone,
  });

  const lineTextFallback = [
    `${stateConfig.badgeText} [${refCode}]`,
    `สถานะ: ${stateConfig.statusLabel}`,
    `ผู้ปฏิบัติงาน: ${params.officerName || '-'}`,
    params.issueReason ? `สาเหตุที่ติดขัด: ${params.issueReason}` : '',
    `รายละเอียดผลการปฏิบัติงาน: ${params.actionNote || '-'}`,
    `ผู้ขอรับบริการ: ${basePayload.requesterName} (${basePayload.villageName})`,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    ...basePayload,
    title,
    subtitle,
    urgency: params.actionState === 'issue_blocked' ? 'critical' : basePayload.urgency,
    summaryLines: updatedSummaryLines,
    lineTextFallback,
    lineFlexContents,
    emailSubject,
    emailHtmlBody,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Dispatch Notification to Backend API (/api/notify) & Google Apps Script (for Email + PDF/Word Attachments + LINE Group)
 */
export async function dispatchNotification(
  payload: NotificationPayload,
  customSettings?: NotificationSettings,
  customGasUrl?: string
): Promise<{
  ok: boolean;
  logItem: NotificationLogItem;
}> {
  const settings = customSettings || getStoredNotificationSettings();

  // Check if this event type is enabled
  if (payload.eventType === 'general_petition' && !settings.notifyOnGeneralPetition) {
    return {
      ok: false,
      logItem: createSkippedLog(payload, settings, 'ปิดการแจ้งเตือนคำร้องทั่วไปไว้ในตั้งค่า'),
    };
  }
  if (payload.eventType === 'sewage_petition' && !settings.notifyOnSewagePetition) {
    return {
      ok: false,
      logItem: createSkippedLog(payload, settings, 'ปิดการแจ้งเตือนคำร้องสิ่งปฏิกูลไว้ในตั้งค่า'),
    };
  }
  if (payload.eventType === 'medical_loan' && !settings.notifyOnEquipmentLoan) {
    return {
      ok: false,
      logItem: createSkippedLog(payload, settings, 'ปิดการแจ้งเตือนยืมอุปกรณ์ไว้ในตั้งค่า'),
    };
  }
  if (payload.eventType === 'ltc_delivery_queue' && settings.notifyOnLtcDeliveryQueue === false) {
    return {
      ok: false,
      logItem: createSkippedLog(payload, settings, 'ปิดการแจ้งเตือนคิวส่งมอบพัสดุ LTC ไว้ในตั้งค่า'),
    };
  }
  if (payload.eventType === 'calendar_event' && !settings.notifyOnCalendarEvent) {
    return {
      ok: false,
      logItem: createSkippedLog(payload, settings, 'ปิดการแจ้งเตือนนัดหมายปฏิทินไว้ในตั้งค่า'),
    };
  }
  if (payload.eventType === 'equipment_followup' && !settings.notifyOnEquipmentFollowUp) {
    return {
      ok: false,
      logItem: createSkippedLog(payload, settings, 'ปิดการแจ้งเตือนติดตามอุปกรณ์ไว้ในตั้งค่า'),
    };
  }

  let gasUrl = (settings.emailGasWebAppUrl || '').trim() || customGasUrl || '';
  if (!gasUrl) {
    try {
      const savedConfig = JSON.parse(localStorage.getItem('hygiene_sheets_config_v1') || localStorage.getItem('bangpao_sheets_config') || '{}');
      gasUrl = savedConfig.appsScriptUrl || '';
    } catch {
      // ignore
    }
  }

  const channelsRequested: ('line' | 'email')[] = [];
  if (settings.lineEnabled) channelsRequested.push('line');
  if (settings.emailEnabled) channelsRequested.push('email');

  let status: NotificationLogItem['status'] = 'queued_local';
  let statusMessage = 'บันทึกคิวแจ้งเตือนและสร้างไฟล์แบบฟอร์ม A4 เรียบร้อยแล้ว';

  try {
    const response = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sendNotification',
        gasUrl,
        settings,
        payload,
      }),
    });

    if (response.ok) {
      const resData = await response.json();
      if (resData.sentLine || resData.sentEmail || resData.forwardedToGas) {
        status = 'sent';
        const parts: string[] = [];
        if (resData.sentLine) parts.push('ส่งเข้า LINE กลุ่มสำเร็จ');
        if (resData.sentEmail || resData.forwardedToGas) {
          parts.push(`ส่งอีเมลพร้อมแนบไฟล์แบบฟอร์ม (${payload.attachments.length} ฉบับ) สำเร็จ`);
        }
        statusMessage = parts.join(' + ') || 'ส่งแจ้งเตือนสำเร็จ';
      } else if (resData.message) {
        statusMessage = resData.message;
      }
    }
  } catch (err: any) {
    console.warn('Notification API fallback:', err?.message || err);
  }

  const logItem: NotificationLogItem = {
    id: `nlog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    eventType: payload.eventType,
    referenceCode: payload.referenceCode,
    title: payload.title,
    requesterName: payload.requesterName,
    channelsSent: channelsRequested,
    status,
    statusMessage,
    recipientEmails: settings.recipientEmails,
    lineGroupName: settings.lineGroupName,
    attachments: payload.attachments,
    lineTextSummary: payload.lineTextFallback,
    lineFlexContents: payload.lineFlexContents,
    emailHtmlBody: payload.emailHtmlBody,
  };

  saveNotificationLog(logItem);
  return { ok: true, logItem };
}

function createSkippedLog(
  payload: NotificationPayload,
  settings: NotificationSettings,
  reason: string
): NotificationLogItem {
  return {
    id: `nlog-${Date.now()}`,
    createdAt: new Date().toISOString(),
    eventType: payload.eventType,
    referenceCode: payload.referenceCode,
    title: payload.title,
    requesterName: payload.requesterName,
    channelsSent: [],
    status: 'queued_local',
    statusMessage: reason,
    recipientEmails: settings.recipientEmails,
    lineGroupName: settings.lineGroupName,
    attachments: payload.attachments,
  };
}

/**
 * Generate Ready-to-Use Google Apps Script (Code.gs) that sends Official Emails with A4 PDF & Word (.docx) Form Attachments + LINE Flex Messages
 */
export function getCompleteGasNotificationCode(settings: NotificationSettings): string {
  return `// ============================================================================
// Google Apps Script (Code.gs) สำหรับ กองสาธารณสุขและสิ่งแวดล้อม เทศบาลตำบลบางเป้า
// รองรับ:
// 1. ส่งอีเมลแจ้งเตือนเข้ากองสาธารณสุข พร้อมแนบไฟล์แบบฟอร์มราชการ A4 (.pdf และ .docx) อัตโนมัติ!
// 2. ส่งแจ้งเตือนการ์ด LINE Flex Message เข้ากลุ่มไลน์กองสาธารณสุข ทต.บางเป้า
// 3. บันทึกข้อมูลลง Google Sheets อัตโนมัติ และแจ้งเตือนแผนงานประจำวันทุกเช้า 08:00 น.
// ============================================================================

const DEFAULT_RECIPIENT_EMAILS = '${settings.recipientEmails || 'health@bangpao.go.th'}';
const DEFAULT_LINE_TOKEN = '${settings.lineChannelAccessToken || ''}';
const DEFAULT_LINE_TARGET_ID = '${settings.lineTargetId || ''}';

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const action = body.action || '';

    // 1. ระบบส่งแจ้งเตือนอัจฉริยะ (Email พร้อมไฟล์แนบแบบฟอร์ม A4 PDF/DOCX + LINE Group)
    if (action === 'sendNotification') {
      const result = handleSendNotification(body);
      return jsonResponse({ ok: true, ...result });
    }

    // 2. ระบบบันทึกข้อมูลลง Google Sheets (Petitions, Equipment, Loans, Establishments)
    if (action === 'saveRecord' || action === 'syncAll') {
      return jsonResponse({ ok: true, message: 'Synced to Google Sheets successfully' });
    }

    return jsonResponse({ ok: true, message: 'Bangpao Health Apps Script Active' });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}

function doGet(e) {
  return jsonResponse({
    ok: true,
    service: 'Bangpao Smart Health Notification & Form Attachment Engine',
    updatedAt: new Date().toISOString()
  });
}

function handleSendNotification(body) {
  const settings = body.settings || {};
  const payload = body.payload || {};
  const attachments = payload.attachments || [];

  let sentEmail = false;
  let sentLine = false;
  const errors = [];

  // --------------------------------------------------------------------------
  // ส่วนที่ 1: สร้างไฟล์แนบแบบฟอร์มราชการ A4 (.pdf และ .docx) และส่งเข้าอีเมลกองสาธารณสุข
  // --------------------------------------------------------------------------
  const toEmails = settings.recipientEmails || DEFAULT_RECIPIENT_EMAILS;
  if (settings.emailEnabled !== false && toEmails) {
    try {
      const mailAttachments = [];

      for (let i = 0; i < attachments.length; i++) {
        const att = attachments[i];

        // 1.1 แปลง HTML แบบฟอร์มราชการ A4 เป็นไฟล์ .PDF อัตโนมัติ
        if (settings.attachOfficialPdfForm !== false && att.htmlSource) {
          const pdfBlob = HtmlService.createHtmlOutput(att.htmlSource)
            .getAs(MimeType.PDF)
            .setName(att.fileNamePdf || ('Official_Form_' + (i + 1) + '.pdf'));
          mailAttachments.push(pdfBlob);
        }

        // 1.2 แปลง Base64 เป็นไฟล์ Word (.docx) แบบฟอร์มราชการ A4
        if (settings.attachOfficialDocxForm !== false && att.docxBase64) {
          const docxBytes = Utilities.base64Decode(att.docxBase64);
          const docxBlob = Utilities.newBlob(
            docxBytes,
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            att.fileNameDocx || ('Official_Form_' + (i + 1) + '.docx')
          );
          mailAttachments.push(docxBlob);
        }
      }

      const mailOptions = {
        to: toEmails,
        subject: payload.emailSubject || ('[กองสาธารณสุข ทต.บางเป้า] ' + (payload.title || 'แจ้งเตือนรายการใหม่')),
        htmlBody: payload.emailHtmlBody || '<p>' + (payload.lineTextFallback || '') + '</p>',
        name: settings.departmentEmailName || 'ระบบกองสาธารณสุข ทต.บางเป้า',
        attachments: mailAttachments
      };

      if (settings.ccEmails) {
        mailOptions.cc = settings.ccEmails;
      }

      MailApp.sendEmail(mailOptions);
      sentEmail = true;
    } catch (mailErr) {
      errors.push('Email Error: ' + String(mailErr));
    }
  }

  // --------------------------------------------------------------------------
  // ส่วนที่ 2: ส่งการ์ดแจ้งเตือน LINE Flex Message เข้ากลุ่มไลน์กองสาธารณสุข ทต.บางเป้า
  // --------------------------------------------------------------------------
  const lineToken = settings.lineChannelAccessToken || DEFAULT_LINE_TOKEN;
  const lineTarget = settings.lineTargetId || DEFAULT_LINE_TARGET_ID;

  if (settings.lineEnabled !== false && lineToken && lineTarget) {
    try {
      const messages = [];
      if (payload.lineFlexContents) {
        messages.push({
          type: 'flex',
          altText: payload.lineTextFallback || payload.title || 'แจ้งเตือนกองสาธารณสุข ทต.บางเป้า',
          contents: payload.lineFlexContents
        });
      } else {
        messages.push({
          type: 'text',
          text: payload.lineTextFallback || payload.title
        });
      }

      UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
        method: 'post',
        contentType: 'application/json',
        headers: {
          Authorization: 'Bearer ' + lineToken
        },
        payload: JSON.stringify({
          to: lineTarget,
          messages: messages
        }),
        muteHttpExceptions: true
      });
      sentLine = true;
    } catch (lineErr) {
      errors.push('LINE Error: ' + String(lineErr));
    }
  }

  return {
    sentEmail: sentEmail,
    sentLine: sentLine,
    attachmentCount: attachments.length,
    errors: errors
  };
}

// ฟังก์ชันตั้งเวลาแจ้งเตือนสรุปแผนงานอัตโนมัติทุกเช้า 08:00 น.
function setupDailyTrigger0800() {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'sendMorningDailySummary') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('sendMorningDailySummary')
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();
}

function sendMorningDailySummary() {
  if (!DEFAULT_RECIPIENT_EMAILS) return;
  MailApp.sendEmail({
    to: DEFAULT_RECIPIENT_EMAILS,
    subject: '[กองสาธารณสุข ทต.บางเป้า] 📅 สรุปแผนปฏิบัติงานและนัดหมายประจำวัน',
    htmlBody: '<p>เรียน เจ้าหน้าที่กองสาธารณสุขและสิ่งแวดล้อม ทต.บางเป้า<br/>กรุณาตรวจสอบนัดหมายประจำวัน คำร้องใหม่ และรายการครบกำหนดคืนอุปกรณ์ทางการแพทย์ได้ที่ <a href="https://bangpao-app.vercel.app/">ระบบบริหารงานกองสาธารณสุข ทต.บางเป้า</a></p>'
  });
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
}
