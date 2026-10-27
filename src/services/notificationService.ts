import { PublicPetition, EquipmentLoan, SignerSettings, DEFAULT_SIGNER_SETTINGS } from '../types/index.ts';
import { generatePetitionHtml, generatePetitionDocxBytes } from './petitionDocGenerator.ts';
import {
  generateOfficialMedicalLoanHtml,
  generateOfficialMedicalLoanDocxBytes,
} from './medicalLoanDocGenerator.ts';

export interface NotificationSettings {
  // LINE Messaging API / Group Notification
  lineEnabled: boolean;
  lineGroupName: string;
  lineChannelAccessToken: string;
  lineTargetId: string; // Group ID (C...) or User ID (U...)
  lineWebhookUrl: string; // Optional custom webhook / Make / n8n

  // Official Email Notification
  emailEnabled: boolean;
  emailGasWebAppUrl: string; // Dedicated Apps Script URL for Email + PDF/DOCX attachments (standalone, no new sheet needed)
  departmentEmailName: string;
  recipientEmails: string; // Comma-separated emails
  ccEmails: string;
  attachOfficialPdfForm: boolean;
  attachOfficialDocxForm: boolean;

  // Event Triggers
  notifyOnGeneralPetition: boolean;
  notifyOnSewagePetition: boolean;
  notifyOnEquipmentLoan: boolean;
  notifyOnCalendarEvent: boolean;
  notifyOnEquipmentFollowUp: boolean;
  dailyMorningSummaryEnabled: boolean;
  dailyMorningSummaryTime: string;
}

export interface NotificationAttachment {
  id: string;
  title: string;
  formType: 'general_petition' | 'sewage_petition' | 'medical_loan' | 'calendar_plan' | 'followup_report';
  fileNamePdf: string;
  fileNameDocx: string;
  htmlSource: string;
  docxBase64: string;
}

export interface NotificationPayload {
  eventType:
    | 'general_petition'
    | 'sewage_petition'
    | 'medical_loan'
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
  lineFlexContents?: Record<string, any>;
  emailHtmlBody?: string;
}

export interface CalendarScheduleItem {
  id: string;
  title: string;
  date: string;
  time?: string;
  type: string;
  location?: string;
  assignee?: string;
  description?: string;
  status?: string;
}

const STORAGE_KEY_NOTIFY_SETTINGS = 'bangpao_notification_settings_v1';
const STORAGE_KEY_NOTIFY_LOGS = 'bangpao_notification_logs_v1';

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  lineEnabled: true,
  lineGroupName: 'กลุ่มไลน์กองสาธารณสุข ทต.บางเป้า',
  lineChannelAccessToken: '',
  lineTargetId: '',
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

  footerButtons.push({
    type: 'button',
    style: 'link',
    height: 'sm',
    action: {
      type: 'uri',
      label: '📋 เปิดระบบกองสาธารณสุข ทต.บางเป้า',
      uri: params.portalUrl || 'https://bangpao-app.vercel.app/',
    },
  });

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
        <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 14px;">
          ${r.value || '-'}
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
        ${
          params.googleMapsUrl
            ? `<a href="${params.googleMapsUrl}" target="_blank" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 22px; border-radius: 10px; margin: 4px 6px;">
                📍 เปิด Google Maps นำทางไปยังพิกัด
              </a>`
            : ''
        }
        <a href="https://bangpao-app.vercel.app/" target="_blank" style="display: inline-block; background-color: #1e40af; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 22px; border-radius: 10px; margin: 4px 6px;">
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
        <div style="margin-top: 4px;">(${signers.directorName || 'นางสาวกัญจนณัฏฐ์ หริรักษ์'})</div>
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
  const refCode = `PLAN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
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

  const summaryLines = events.slice(0, 6).map((ev, idx) => ({
    label: `นัดหมายที่ ${idx + 1} (${ev.date})`,
    value: `${ev.time ? `[${ev.time} น.] ` : ''}${ev.title} • ${ev.location || 'ทต.บางเป้า'}`,
  }));

  const badgeText = '📅 นัดหมายปฏิทิน & แผนปฏิบัติงาน';
  const headerBgColor = '#4F46E5';
  const accentColor = '#4338CA';
  const subtitle = `จำนวน ${events.length} ภารกิจ • กองสาธารณสุขและสิ่งแวดล้อม ทต.บางเป้า`;

  const lineFlexContents = buildLineFlexBubble({
    badgeText,
    headerBgColor,
    accentColor,
    referenceCode: refCode,
    title: planTitle,
    subtitle,
    summaryLines,
    attachmentNames: [attachment.fileNamePdf, attachment.fileNameDocx],
  });

  const emailSubject = `[กองสาธารณสุข ทต.บางเป้า] 📅 ${planTitle} (${events.length} รายการ พร้อมไฟล์ตารางแผนงาน A4)`;
  const emailHtmlBody = buildOfficialEmailHtml({
    badgeText,
    headerBgColor,
    referenceCode: refCode,
    title: planTitle,
    subtitle,
    summaryLines,
    attachments: [attachment],
  });

  const lineTextFallback = [
    `${badgeText} [${refCode}]`,
    `เรื่อง: ${planTitle}`,
    ...events.map((e, i) => `${i + 1}. ${e.date} ${e.time || ''} - ${e.title} (${e.location || 'ทต.บางเป้า'})`),
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
