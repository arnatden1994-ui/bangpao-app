import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Printer,
  FileDown,
  RotateCcw,
  Sparkles,
  Save,
  Copy,
  Eye,
  Columns,
  Code2,
  CheckCircle2,
  Trash2,
  PlusCircle,
  FileText,
  Calculator,
  RefreshCw,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo2,
  Redo2,
  Type,
  Sliders,
  Layout,
  Table,
  Settings2,
  FileSpreadsheet,
  ExternalLink,
} from 'lucide-react';
import { LicenseRecord, SignerSettings, DEFAULT_SIGNER_SETTINGS } from '../types/index.ts';
import { GARUDA_BASE64 } from '../data/garudaBase64.ts';
import { thaiBahtText } from './EditLicenseModal.tsx';
import { formatThaiDateParts, shortThaiMonth } from '../services/officialDocGenerator.ts';
import {
  exportOfficialLicenseDocx,
  cleanBoilerplateCondition,
  cleanSignerPosition,
  formatSignerPositionLines,
  splitBizCategoryForDocx,
} from '../services/docxTemplateExporter.ts';
import {
  exportOfficialLicenseXlsx,
  GOOGLE_SHEET_TEMPLATE_URL,
} from '../services/xlsxTemplateExporter.ts';

export interface DocLayoutState {
  fontFamily: string;
  fontSize: number; // body font size in pt, default 16
  titleFontSize: number; // Page 1 title font size in pt, default 20 (matching official template w:sz=40)
  page2TitleFontSize: number; // Page 2 title font size in pt, default 16
  garudaSize: number; // Garuda width in px, default 100 (~3.13cm)
  garudaMarginTop: number; // Garuda top offset in px, default 0
  garudaOffsetX: number; // Garuda horizontal offset in px, default 0
  titleMarginBottom: number; // Title bottom spacing in px, default 5
  indentSize: number; // Main paragraph indent in cm, default 1.25
  subIndentSize: number; // Sub-clause indent in cm, default 2.5
  lineHeight: number; // default 1.15
  rowMinHeight: number; // in mm, default 6.2
  sigWidth: number; // Signature block width in %, default 54
  sigMarginTop: number; // Signature block top margin in px, default 8
  sigOffsetX: number; // Signature block horizontal offset in px, default 0
  sigFontSize: number; // Signature block font size in pt, default 16
  warningFontSize: number; // Footer warning font size in pt, default 16 (matching official template w:sz=32)
  warningMarginTop: number; // Footer warning top margin in px, default 8
  underlineStyle: 'dotted' | 'dashed' | 'solid' | 'none'; // default 'dotted'
  dataBold: boolean; // default false (matching official template)
  marginTop: number; // in cm, default 1.5
  marginBottom: number; // in cm, default 0.9
  marginLeft: number; // in cm, default 2.54
  marginRight: number; // in cm, default 1.75
  tablePadding: number; // in px, default 6
  tableRowHeight: number; // in px, default 40
  tableFontSize: number; // in pt, default 16 (matching official template w:sz=32)
  tableColWidths: number[]; // [16.5, 18.5, 8.0, 17.5, 14.5, 25.0]
  isFullEditMode: boolean; // default true
}

export const DEFAULT_DOC_LAYOUT: DocLayoutState = {
  fontFamily: "'TH Sarabun PSK', 'TH Sarabun New', 'Sarabun', sans-serif",
  fontSize: 16,
  titleFontSize: 20,
  page2TitleFontSize: 16,
  garudaSize: 100,
  garudaMarginTop: 0,
  garudaOffsetX: 0,
  titleMarginBottom: 5,
  indentSize: 1.25,
  subIndentSize: 2.5,
  lineHeight: 1.15,
  rowMinHeight: 6.2,
  sigWidth: 54,
  sigMarginTop: 8,
  sigOffsetX: 0,
  sigFontSize: 16,
  warningFontSize: 16,
  warningMarginTop: 8,
  underlineStyle: 'dotted',
  dataBold: false,
  marginTop: 1.5,
  marginBottom: 0.9,
  marginLeft: 2.54,
  marginRight: 1.75,
  tablePadding: 6,
  tableRowHeight: 40,
  tableFontSize: 16,
  tableColWidths: [16.5, 18.5, 8.0, 17.5, 14.5, 25.0],
  isFullEditMode: true,
};


interface BackRowItem {
  issueDate: string;
  expireDate: string;
  book: string;
  no: string;
  date: string;
  signer: string;
}

interface LicenseFormState {
  bookNo: string;
  docNo: string;
  docYear: string;
  applicantName: string;
  nationality: string;
  houseNo: string;
  moo: string;
  soi: string;
  road: string;
  subdistrict: string;
  district: string;
  province: string;
  phone: string;
  bizType: string;
  bizTypeLine2: string;
  bizName: string;
  bizHouseNo: string;
  bizMoo: string;
  bizSoi: string;
  bizRoad: string;
  bizSubdistrict: string;
  bizDistrict: string;
  bizProvince: string;
  bizPhone: string;
  feeAmount: string;
  feeText: string;
  receiptBook: string;
  receiptNo: string;
  receiptDay: string;
  receiptMonth: string;
  receiptYear: string;
  cond1: string;
  cond2: string;
  issueDay: string;
  issueMonth: string;
  issueYear: string;
  expireDay: string;
  expireMonth: string;
  expireYear: string;
  signerName: string;
  signerTitle: string;
  backRows: BackRowItem[];
}

export interface PrintOfficialLicenseModalProps {
  license: LicenseRecord | null;
  isOpen: boolean;
  onClose: () => void;
  savedSignerSettings?: SignerSettings;
  onSaveLicense?: (updated: LicenseRecord) => Promise<void> | void;
}

// Sample data exactly from the official Word document template
const sampleWordData: LicenseFormState = {
  bookNo: '-',
  docNo: '04',
  docYear: '2568',
  applicantName: 'นายจรูญ หนวดงาม',
  nationality: 'ไทย',
  houseNo: '138/6',
  moo: '2',
  soi: '-',
  road: '-',
  subdistrict: 'บางเป้า',
  district: 'กันตัง',
  province: 'ตรัง',
  phone: '081-0833853',
  bizType: 'กิจการเกี่ยวกับโลหะ หรือแร่ การ',
  bizTypeLine2: 'กลึง การเคาะ การเชื่อม การตัด การประสาน การรีด การอัดโลหะด้วยเครื่องจักร หรือก๊าซ หรือไฟฟ้า',
  bizName: 'ส.เจริญยนต์ (เกาะปอม)',
  bizHouseNo: '151/1',
  bizMoo: '2',
  bizSoi: '-',
  bizRoad: '-',
  bizSubdistrict: 'บางเป้า',
  bizDistrict: 'กันตัง',
  bizProvince: 'ตรัง',
  bizPhone: '081-0833853',
  feeAmount: '500.-',
  feeText: '- ห้าร้อยบาทถ้วน -',
  receiptBook: '-',
  receiptNo: '/2568',
  receiptDay: '',
  receiptMonth: 'กุมภาพันธ์',
  receiptYear: '2568',
  cond1: '',
  cond2: '',
  issueDay: '',
  issueMonth: 'กุมภาพันธ์',
  issueYear: '2568',
  expireDay: '',
  expireMonth: 'กุมภาพันธ์',
  expireYear: '2569',
  signerName: 'นายละดม  เชื้อช่วย',
  signerTitle: 'นายกเทศมนตรีตำบลบางเป้า',
  backRows: [
    { issueDate: 'ก.พ. 2568', expireDate: 'ก.พ. 2569', book: '-', no: '/2568', date: 'ก.พ. 2568', signer: '(นายละดม  เชื้อช่วย)' },
    { issueDate: '', expireDate: '', book: '', no: '', date: '', signer: '' },
    { issueDate: '', expireDate: '', book: '', no: '', date: '', signer: '' },
    { issueDate: '', expireDate: '', book: '', no: '', date: '', signer: '' },
    { issueDate: '', expireDate: '', book: '', no: '', date: '', signer: '' },
    { issueDate: '', expireDate: '', book: '', no: '', date: '', signer: '' },
  ],
};

// Helper: Extract and auto-populate existing data from LicenseRecord & SignerSettings
function populateFromLicense(license: LicenseRecord, signers: SignerSettings): LicenseFormState {
  const licenseNumberClean = (license.licenseNumber || '').replace('เลขที่', '').trim();
  const yearMatch = licenseNumberClean.match(/\/(25\d{2})/);
  const docYear = yearMatch ? yearMatch[1] : (license.licenseYear || '2568');
  const docNo = licenseNumberClean.includes('/') ? licenseNumberClean.split('/')[0].trim() : (licenseNumberClean || '04');
  const rawBook = (license.licenseBookNo || '').trim();
  const bookNo = rawBook && !rawBook.includes('/') ? rawBook : '-';

  const applicantName = license.ownerName || '';
  const nationality = license.nationality || 'ไทย';
  const houseNo = license.ownerAddressNo || license.businessAddressNo || '';
  const moo = license.ownerMoo || license.businessMoo || '';
  const soi = (license.ownerTrokSoi && license.ownerTrokSoi !== '-')
    ? license.ownerTrokSoi
    : ((license.businessSoi && license.businessSoi !== '-') ? license.businessSoi : '-');
  const road = (license.ownerRoad && license.ownerRoad !== '-')
    ? license.ownerRoad
    : ((license.businessStreet && license.businessStreet !== '-') ? license.businessStreet : '-');
  const subdistrict = license.ownerSubdistrict || license.businessSubdistrict || 'บางเป้า';
  const district = license.ownerDistrict || license.businessDistrict || 'กันตัง';
  const province = license.ownerProvince || license.businessProvince || 'ตรัง';
  const phone = license.ownerPhone || license.businessPhone || '';

  // Smart splitting for business type category lines matching the official Word template
  const { b1: bizType, b2: bizTypeLine2 } = splitBizCategoryForDocx(license.businessCategory || '', '');

  const bizName = license.businessName || '';
  const bizHouseNo = license.businessAddressNo || license.ownerAddressNo || '';
  const bizMoo = license.businessMoo || license.ownerMoo || '';
  const bizSoi = (license.businessSoi && license.businessSoi !== '-')
    ? license.businessSoi
    : ((license.businessTrokSoi && license.businessTrokSoi !== '-') ? license.businessTrokSoi : '-');
  const bizRoad = (license.businessRoad && license.businessRoad !== '-')
    ? license.businessRoad
    : ((license.businessStreet && license.businessStreet !== '-') ? license.businessStreet : '-');
  const bizSubdistrict = license.businessSubdistrict || 'บางเป้า';
  const bizDistrict = license.businessDistrict || 'กันตัง';
  const bizProvince = license.businessProvince || 'ตรัง';
  const bizPhone = license.businessPhone || license.ownerPhone || '';

  const rawFee = license.feeAmount !== undefined && license.feeAmount !== null ? String(license.feeAmount).replace(/[^0-9]/g, '') : '500';
  const feeAmount = rawFee ? `${rawFee}.-` : '500.-';
  const feeText = license.feeText
    ? (license.feeText.startsWith('-') ? license.feeText : `- ${license.feeText} -`)
    : (rawFee ? `- ${thaiBahtText(rawFee)} -` : '- ห้าร้อยบาทถ้วน -');

  const rawReceiptBook = (license.receiptBookNo || '').trim();
  const receiptBook = rawReceiptBook && !rawReceiptBook.includes('/') ? rawReceiptBook : '-';
  const receiptNo = license.receiptNo || '/2568';

  const approvalDate = license.approvalDate || '';
  const expireDate = license.expireDate || '';
  const receiptDate = license.receiptDate || approvalDate || '';

  const sDate = formatThaiDateParts(approvalDate);
  const eDate = formatThaiDateParts(expireDate);
  const rDate = formatThaiDateParts(receiptDate);

  const receiptDay = rDate.d || '';
  const receiptMonth = rDate.m || 'กุมภาพันธ์';
  const receiptYear = rDate.y || '2568';

  const issueDay = sDate.d || '';
  const issueMonth = sDate.m || 'กุมภาพันธ์';
  const issueYear = sDate.y || '2568';

  const expireDay = eDate.d || '';
  const expireMonth = eDate.m || 'กุมภาพันธ์';
  const expireYear = eDate.y || '2569';

  const cond1 = cleanBoilerplateCondition(license.condition31);
  const cond2 = cleanBoilerplateCondition(license.condition32);

  const rawExName = license.execName || signers.actingMayorName || signers.mayorName || 'นายละดม  เชื้อช่วย';
  const cleanExName = rawExName.replace(/^\s*\(+|\)+\s*$/g, '').trim();
  const signerName = cleanExName || 'นายละดม  เชื้อช่วย';
  const rawSignerTitle = license.execPos || (signers.actingMayorPosition ? `${signers.actingMayorPosition} ${signers.actingMayorFor || 'นายกเทศมนตรีตำบลบางเป้า'}` : signers.mayorPos) || 'นายกเทศมนตรีตำบลบางเป้า';
  const signerTitle = cleanSignerPosition(rawSignerTitle);

  const row1Issue = `${sDate.d ? sDate.d + ' ' : ''}${shortThaiMonth(sDate.m) || sDate.m} ${sDate.y}`.trim();
  const row1Expire = `${eDate.d ? eDate.d + ' ' : ''}${shortThaiMonth(eDate.m) || eDate.m} ${eDate.y}`.trim();
  const row1ReceiptDate = `${rDate.d ? rDate.d + ' ' : ''}${shortThaiMonth(rDate.m) || rDate.m} ${rDate.y}`.trim();

  const backRows: BackRowItem[] = [
    { issueDate: row1Issue, expireDate: row1Expire, book: receiptBook, no: receiptNo, date: row1ReceiptDate, signer: `(${signerName})` },
    { issueDate: '', expireDate: '', book: '', no: '', date: '', signer: '' },
    { issueDate: '', expireDate: '', book: '', no: '', date: '', signer: '' },
    { issueDate: '', expireDate: '', book: '', no: '', date: '', signer: '' },
    { issueDate: '', expireDate: '', book: '', no: '', date: '', signer: '' },
    { issueDate: '', expireDate: '', book: '', no: '', date: '', signer: '' },
  ];

  return {
    bookNo,
    docNo,
    docYear,
    applicantName,
    nationality,
    houseNo,
    moo,
    soi,
    road,
    subdistrict,
    district,
    province,
    phone,
    bizType,
    bizTypeLine2,
    bizName,
    bizHouseNo,
    bizMoo,
    bizSoi,
    bizRoad,
    bizSubdistrict,
    bizDistrict,
    bizProvince,
    bizPhone,
    feeAmount,
    feeText,
    receiptBook,
    receiptNo,
    receiptDay,
    receiptMonth,
    receiptYear,
    cond1,
    cond2,
    issueDay,
    issueMonth,
    issueYear,
    expireDay,
    expireMonth,
    expireYear,
    signerName,
    signerTitle,
    backRows,
  };
}

export const PrintOfficialLicenseModal: React.FC<PrintOfficialLicenseModalProps> = ({
  license,
  isOpen,
  onClose,
  savedSignerSettings,
  onSaveLicense,
}) => {
  const signers = savedSignerSettings || DEFAULT_SIGNER_SETTINGS;

  const [activeTab, setActiveTab] = useState<'preview' | 'sideBySide' | 'code'>('preview');
  const [printScope, setPrintScope] = useState<'both' | 'page1' | 'page2'>('both');
  const [signerPlacement, setSignerPlacement] = useState<'bottom' | 'row1' | 'blank' | 'perRow'>('bottom');
  const [canvasKey, setCanvasKey] = useState<number>(0);
  const [allowContentEditable, setAllowContentEditable] = useState<boolean>(true);
  const [codeTemplateMode, setCodeTemplateMode] = useState<'current' | 'handlebars'>('current');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // MS Word-like typography & independent section layout state
  const [docLayout, setDocLayout] = useState<DocLayoutState>(DEFAULT_DOC_LAYOUT);
  const [showElementsCustom, setShowElementsCustom] = useState<boolean>(false);
  const [showMarginCustom, setShowMarginCustom] = useState<boolean>(false);
  const [showTableCustom, setShowTableCustom] = useState<boolean>(false);

  const handleResetLayout = () => {
    setDocLayout(DEFAULT_DOC_LAYOUT);
    setSignerPlacement('bottom');
    setPrintScope('both');
    setCanvasKey((k) => k + 1);
    showToast('คืนค่าการจัดหน้า ฟอนต์ ขนาดครุฑ ย่อหน้า และตาราง เป็นค่ามาตรฐานราชการแล้ว');
  };

  const formatSelection = (command: string, value: string | undefined = undefined) => {
    try {
      document.execCommand(command, false, value);
    } catch (err) {
      console.error('execCommand error:', err);
    }
  };

  const [formData, setFormData] = useState<LicenseFormState>(() => {
    if (license) {
      return populateFromLicense(license, signers);
    }
    return JSON.parse(JSON.stringify(sampleWordData));
  });

  // Re-sync when license or signers change
  useEffect(() => {
    if (license) {
      setFormData(populateFromLicense(license, signers));
    }
  }, [license?.id, license?.approvalDate, license?.licenseNumber]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  const handleFieldChange = (key: keyof LicenseFormState, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleBackRowChange = (idx: number, col: keyof BackRowItem, value: string) => {
    setFormData((prev) => {
      const rows = [...prev.backRows];
      rows[idx] = { ...rows[idx], [col]: value };
      return { ...prev, backRows: rows };
    });
  };

  const handleAddBackRow = () => {
    setFormData((prev) => {
      const rows = [...prev.backRows];
      // Insert new row right before the 2 signature rows at the bottom
      const insertIdx = Math.max(0, rows.length - 2);
      rows.splice(insertIdx, 0, {
        issueDate: '',
        expireDate: '',
        book: '',
        no: '',
        date: '',
        signer: '',
      });
      return { ...prev, backRows: rows };
    });
  };

  const handleRemoveBackRow = (idx: number) => {
    setFormData((prev) => {
      if (prev.backRows.length <= 1) return prev;
      const rows = prev.backRows.filter((_, i) => i !== idx);
      return { ...prev, backRows: rows };
    });
  };

  const handleClearForm = () => {
    setFormData({
      bookNo: '-',
      docNo: '',
      docYear: '',
      applicantName: '',
      nationality: '',
      houseNo: '',
      moo: '',
      soi: '',
      road: '',
      subdistrict: '',
      district: '',
      province: '',
      phone: '',
      bizType: '',
      bizTypeLine2: '',
      bizName: '',
      bizHouseNo: '',
      bizMoo: '',
      bizSoi: '',
      bizRoad: '',
      bizSubdistrict: '',
      bizDistrict: '',
      bizProvince: '',
      bizPhone: '',
      feeAmount: '',
      feeText: '',
      receiptBook: '',
      receiptNo: '',
      receiptDay: '',
      receiptMonth: '',
      receiptYear: '',
      cond1: '',
      cond2: '',
      issueDay: '',
      issueMonth: '',
      issueYear: '',
      expireDay: '',
      expireMonth: '',
      expireYear: '',
      signerName: 'นายละดม  เชื้อช่วย',
      signerTitle: 'นายกเทศมนตรีตำบลบางเป้า',
      backRows: [
        { issueDate: '', expireDate: '', book: '-', no: '', date: '', signer: '' },
        { issueDate: '', expireDate: '', book: '', no: '', date: '', signer: '' },
        { issueDate: '', expireDate: '', book: '', no: '', date: '', signer: '' },
        { issueDate: '', expireDate: '', book: '', no: '', date: '', signer: '' },
        { issueDate: '', expireDate: '', book: '', no: '', date: '', signer: '' },
        { issueDate: '', expireDate: '', book: '', no: '', date: '', signer: '' },
      ],
    });
    setSignerPlacement('bottom');
    setCanvasKey((k) => k + 1);
    showToast('ล้างข้อมูลเป็นแบบฟอร์มเปล่าตามแม่แบบแล้ว');
  };

  const handleReloadLicenseData = () => {
    if (license) {
      setFormData(populateFromLicense(license, signers));
      setSignerPlacement('bottom');
      setCanvasKey((k) => k + 1);
      showToast('ดึงข้อมูลล่าสุดจากระบบสำเร็จแล้ว');
    }
  };

  const handleLoadSample = () => {
    setFormData(JSON.parse(JSON.stringify(sampleWordData)));
    setSignerPlacement('bottom');
    setCanvasKey((k) => k + 1);
    showToast('โหลดข้อมูลตัวอย่างจากไฟล์ต้นฉบับสำเร็จ');
  };

  const handleAutoThaiBaht = () => {
    const raw = formData.feeAmount.replace(/[^0-9.]/g, '');
    if (raw) {
      const text = thaiBahtText(raw);
      handleFieldChange('feeText', `- ${text} -`);
      setCanvasKey((k) => k + 1);
      showToast(`แปลงเป็น "${text}" แล้ว`);
    }
  };

  const handleSaveToSystem = async () => {
    if (!license || !onSaveLicense) {
      showToast('ไม่มีฟังก์ชันบันทึกข้อมูล');
      return;
    }
    setIsSaving(true);
    try {
      const updated: LicenseRecord = {
        ...license,
        licenseBookNo: formData.bookNo,
        licenseNumber: `เลขที่ ${formData.docNo}/${formData.docYear}`,
        licenseYear: formData.docYear,
        ownerName: formData.applicantName,
        nationality: formData.nationality,
        ownerAddressNo: formData.houseNo,
        ownerMoo: formData.moo,
        ownerTrokSoi: formData.soi,
        ownerRoad: formData.road,
        ownerSubdistrict: formData.subdistrict,
        ownerDistrict: formData.district,
        ownerProvince: formData.province,
        ownerPhone: formData.phone,
        businessCategory: formData.bizTypeLine2 ? `${formData.bizType} ${formData.bizTypeLine2}` : formData.bizType,
        businessName: formData.bizName,
        businessAddressNo: formData.bizHouseNo,
        businessMoo: formData.bizMoo,
        businessSoi: formData.bizSoi,
        businessStreet: formData.bizRoad,
        businessSubdistrict: formData.bizSubdistrict,
        businessDistrict: formData.bizDistrict,
        businessProvince: formData.bizProvince,
        businessPhone: formData.bizPhone,
        feeAmount: parseFloat(formData.feeAmount.replace(/[^0-9.]/g, '')) || license.feeAmount,
        feeText: formData.feeText.replace(/^\s*-\s*|\s*-\s*$/g, '').trim(),
        receiptBookNo: formData.receiptBook,
        receiptNo: formData.receiptNo,
        receiptDate: `${formData.receiptDay ? formData.receiptDay + ' ' : ''}${formData.receiptMonth} ${formData.receiptYear}`.trim(),
        approvalDate: `${formData.issueDay ? formData.issueDay + ' ' : ''}${formData.issueMonth} ${formData.issueYear}`.trim(),
        expireDate: `${formData.expireDay ? formData.expireDay + ' ' : ''}${formData.expireMonth} ${formData.expireYear}`.trim(),
        condition31: formData.cond1,
        condition32: formData.cond2,
        execName: formData.signerName.startsWith('(') ? formData.signerName : `(${formData.signerName})`,
        execPos: formData.signerTitle,
      };

      await onSaveLicense(updated);
      showToast('บันทึกข้อมูลใบอนุญาตลงระบบเรียบร้อยแล้ว!');
    } catch (e) {
      console.error(e);
      showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetSignerPlacement = (mode: 'row1' | 'bottom' | 'blank') => {
    setSignerPlacement(mode);
    setFormData((prev) => {
      const cleanName = prev.signerName.replace(/^\s*\(+|\)+\s*$/g, '').trim();
      const rows = prev.backRows.map((r) => ({ ...r, signer: '' }));
      while (rows.length < 6) {
        rows.push({ issueDate: '', expireDate: '', book: '', no: '', date: '', signer: '' });
      }
      if (mode === 'row1') {
        rows[0].signer = cleanName ? `(${cleanName})` : '';
      } else if (mode === 'bottom') {
        const n = rows.length;
        rows[n - 2].signer = cleanName ? `(${cleanName})` : '';
        rows[n - 1].signer = prev.signerTitle || '';
      }
      return { ...prev, backRows: rows };
    });
    setCanvasKey((k) => k + 1);
    if (mode === 'row1') showToast('ย้ายชื่อผู้ลงนามในตารางหน้า 2 ไปที่แถวที่ 1 แล้ว');
    else if (mode === 'bottom') showToast('ย้ายชื่อผู้ลงนามในตารางหน้า 2 ไปที่แถวล่าง (แบบแม่แบบต้นฉบับ) แล้ว');
    else showToast('เว้นว่างช่องผู้ลงนามในตารางหน้า 2 สำหรับเซ็นสดแล้ว');
  };

  const handlePrint = (scope: 'both' | 'page1' | 'page2' = 'both') => {
    setPrintScope('both');
    if (activeTab === 'code') {
      setActiveTab('preview');
    }

    setTimeout(() => {
      const frontEl = document.getElementById('officialPageFront');
      const backEl = document.getElementById('officialPageBack');

      // Build clean WYSIWYG HTML from the live canvas DOM so all direct edits, fonts, margins & sizes print 100% accurately
      let pagesHtml = '';
      if ((scope === 'both' || scope === 'page1') && frontEl) {
        const clone1 = frontEl.cloneNode(true) as HTMLElement;
        clone1.classList.remove('word-edit-mode');
        clone1.style.boxShadow = 'none';
        clone1.style.margin = '0';
        clone1.style.pageBreakAfter = scope === 'both' ? 'always' : 'auto';
        pagesHtml += clone1.outerHTML;
      }
      if ((scope === 'both' || scope === 'page2') && backEl) {
        const clone2 = backEl.cloneNode(true) as HTMLElement;
        clone2.classList.remove('word-edit-mode');
        clone2.style.boxShadow = 'none';
        clone2.style.margin = '0';
        clone2.style.pageBreakAfter = 'auto';
        pagesHtml += clone2.outerHTML;
      }

      if (!pagesHtml) {
        window.print();
        return;
      }

      const printDoc = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <title>พิมพ์ใบอนุญาต - ${formData.bizName || 'อภ.2'}</title>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/gh/lazywasabi/thai-web-fonts@7/fonts/THSarabunNew/THSarabunNew.css" rel="stylesheet">
  <style>
    @font-face {
      font-family: 'TH Sarabun PSK';
      src: local('TH Sarabun PSK'), local('THSarabunPSK'), local('TH Sarabun New'), local('THSarabunNew'),
           url('https://cdn.jsdelivr.net/gh/lazywasabi/thai-web-fonts@7/fonts/THSarabunNew/THSarabunNew.woff2') format('woff2');
      font-weight: normal;
      font-style: normal;
    }
    @font-face {
      font-family: 'TH Sarabun PSK';
      src: local('TH Sarabun PSK Bold'), local('THSarabunPSK-Bold'), local('TH Sarabun New Bold'), local('THSarabunNew-Bold'),
           url('https://cdn.jsdelivr.net/gh/lazywasabi/thai-web-fonts@7/fonts/THSarabunNew/THSarabunNew-Bold.woff2') format('woff2');
      font-weight: bold;
      font-style: normal;
    }
    @page {
      size: A4 portrait;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #000000 !important;
    }
    .official-row {
      display: flex;
      align-items: baseline;
      width: 100%;
      min-height: ${docLayout.rowMinHeight}mm;
      line-height: ${docLayout.rowMinHeight}mm;
    }
    .official-row > span {
      flex-shrink: 0;
      white-space: nowrap;
    }
    .fill-dot {
      border-bottom: ${docLayout.underlineStyle === 'none' ? '1px solid transparent' : docLayout.underlineStyle === 'solid' ? '1px solid #000' : docLayout.underlineStyle === 'dashed' ? '1.2px dashed #334155' : '1.5px dotted #1e293b'};
      display: inline-block;
      text-align: center;
      padding: 0 5px;
      font-weight: ${docLayout.dataBold ? 'bold' : 'normal'};
      vertical-align: bottom;
      height: 6.0mm;
      line-height: 6.0mm;
      outline: none;
      white-space: nowrap;
    }
    .fill-dot:empty::after {
      content: "\\00a0";
      visibility: hidden;
    }
    .fill-dot-left {
      border-bottom: ${docLayout.underlineStyle === 'none' ? '1px solid transparent' : docLayout.underlineStyle === 'solid' ? '1px solid #000' : docLayout.underlineStyle === 'dashed' ? '1.2px dashed #334155' : '1.5px dotted #1e293b'};
      display: inline-block;
      text-align: left;
      padding: 0 5px;
      font-weight: ${docLayout.dataBold ? 'bold' : 'normal'};
      vertical-align: bottom;
      height: 6.0mm;
      line-height: 6.0mm;
      outline: none;
      white-space: nowrap;
    }
    .fill-dot-left:empty::after {
      content: "\\00a0";
      visibility: hidden;
    }
    .fill-grow {
      flex: 1 1 0% !important;
      flex-shrink: 1 !important;
    }
    [contenteditable="true"] {
      outline: none !important;
      background: transparent !important;
    }
  </style>
</head>
<body>
${pagesHtml}
</body>
</html>`;

      let printIframe = document.getElementById('officialLicensePrintIframe') as HTMLIFrameElement | null;
      if (!printIframe) {
        printIframe = document.createElement('iframe');
        printIframe.id = 'officialLicensePrintIframe';
        printIframe.style.position = 'fixed';
        printIframe.style.right = '0';
        printIframe.style.bottom = '0';
        printIframe.style.width = '0';
        printIframe.style.height = '0';
        printIframe.style.border = '0';
        document.body.appendChild(printIframe);
      }

      const iframeDoc = printIframe.contentWindow?.document;
      if (iframeDoc && printIframe.contentWindow) {
        iframeDoc.open();
        iframeDoc.write(printDoc);
        iframeDoc.close();
        setTimeout(() => {
          try {
            printIframe!.contentWindow!.focus();
            printIframe!.contentWindow!.print();
          } catch {
            window.print();
          }
        }, 350);
      } else {
        window.print();
      }
    }, 100);
  };

  const generateWordDocHtml = (d: LicenseFormState, layout: DocLayoutState = docLayout): string => {
    const cond31Line = d.cond1 && d.cond1 !== '-' ? d.cond1 : '...............................................................................................................................';
    const cond32Line = d.cond2 && d.cond2 !== '-' ? d.cond2 : '...............................................................................................................................';

    const execNameClean = (d.signerName || '').replace(/^\s*\(+|\)+\s*$/g, '').trim();
    const uTagStart = layout.underlineStyle === 'none' ? '<span>' : '<u>';
    const uTagEnd = layout.underlineStyle === 'none' ? '</span>' : '</u>';
    const dataWeight = layout.dataBold ? 'font-weight:bold;' : 'font-weight:normal;';
    const wrapData = (val: string) => `${uTagStart}<span style="${dataWeight}">&nbsp;&nbsp;${val}&nbsp;&nbsp;</span>${uTagEnd}`;

    const rowsHtml = d.backRows
      .map(
        (r) => `
    <tr style="height: ${Math.round(layout.tableRowHeight * 0.75)}pt;">
      <td>${r.issueDate || ''}</td>
      <td>${r.expireDate || ''}</td>
      <td>${r.book && r.book !== '-' ? r.book : '-'}</td>
      <td>${r.no && r.no !== '-' ? r.no : ''}</td>
      <td>${r.date || ''}</td>
      <td style="font-weight: bold;">${r.signer || ''}</td>
    </tr>`
      )
      .join('\n');

    return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>License</title>
<style>
@page WordSection1 {
  size: 21cm 29.7cm;
  margin: ${layout.marginTop}cm ${layout.marginRight}cm ${layout.marginBottom}cm ${layout.marginLeft}cm;
  mso-page-orientation: portrait;
}
div.WordSection1 { page: WordSection1; }
body, p, table, tr, td, th {
  font-family: ${layout.fontFamily};
}
body {
  font-size: ${layout.fontSize}pt;
  line-height: ${layout.lineHeight};
  color: #000;
}
p {
  margin: 0 0 4pt 0;
  text-align: justify;
}
.center { text-align: center; }
.bold { font-weight: bold; }
.indent { text-indent: ${layout.indentSize}cm; }
table.border {
  width: 100%;
  border-collapse: collapse;
  font-size: ${layout.tableFontSize}pt;
}
table.border th, table.border td {
  border: 1pt solid windowtext;
  padding: ${layout.tablePadding}pt;
  text-align: center;
  vertical-align: middle;
  font-weight: normal;
}

</style>
</head>
<body>
<div class="WordSection1">

<p class="center" style="margin-top: ${layout.garudaMarginTop}pt; margin-bottom: 5pt;">
<img src="${GARUDA_BASE64}" width="${layout.garudaSize}" height="${layout.garudaSize}">
</p>
<p class="center bold" style="font-size: ${layout.titleFontSize}pt; margin-top: 0pt; margin-bottom: 2pt;">ใบอนุญาต</p>
<p class="center bold" style="font-size: ${layout.titleFontSize}pt; margin-bottom: ${layout.titleMarginBottom + 8}pt;">ประกอบกิจการที่เป็นอันตรายต่อสุขภาพ</p>

<p align="left" style="margin-top: 8pt; margin-bottom: 5pt; text-align: left;">
เล่มที่ ${wrapData(d.bookNo && d.bookNo !== '-' ? d.bookNo : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;')} 
เลขที่ ${wrapData(d.docNo && d.docNo !== '-' ? d.docNo : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;')} / 
${wrapData(d.docYear && d.docYear !== '-' ? d.docYear : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;')}
</p>

<p class="indent" align="justify" style="text-align: justify; margin-top: 5pt;">
(1) เจ้าพนักงานท้องถิ่นอนุญาตให้ ${wrapData(d.applicantName)} สัญชาติ ${wrapData(d.nationality)}
</p>
<p align="justify" style="text-align: justify; margin-top: 4pt;">
อยู่บ้านเลขที่ ${wrapData(d.houseNo)} หมู่ที่ ${wrapData(d.moo)} ตรอก/ซอย ${wrapData(d.soi)} ถนน ${wrapData(d.road)}
</p>
<p align="justify" style="text-align: justify; margin-top: 4pt;">
ตำบล/แขวง ${wrapData(d.subdistrict)} อำเภอ/เขต ${wrapData(d.district)} จังหวัด ${wrapData(d.province)}
</p>
<p align="justify" style="text-align: justify; margin-top: 4pt;">
หมายเลขโทรศัพท์ ${wrapData(d.phone)}
</p>

<p style="padding-left: ${layout.subIndentSize}cm; margin-top: 6pt; text-align: justify;">
ชื่อสถานประกอบกิจการที่เป็นอันตรายต่อสุขภาพ ประเภท ${wrapData(d.bizType)}
</p>
<p style="margin-top: 4pt; text-align: justify;">
${wrapData(d.bizTypeLine2 || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;')} โดยใช้ชื่อ
</p>
<p style="margin-top: 4pt; text-align: justify;">
สถานที่ ${wrapData(d.bizName)} ตั้งอยู่บ้านเลขที่ ${wrapData(d.bizHouseNo)} หมู่ที่ ${wrapData(d.bizMoo)} ตำบล ${wrapData(d.bizSubdistrict)}
</p>
<p style="margin-top: 4pt; text-align: justify;">
อำเภอ ${wrapData(d.bizDistrict)} จังหวัด ${wrapData(d.bizProvince)} หมายเลขโทรศัพท์ ${wrapData(d.bizPhone)}
</p>

<p style="padding-left: ${layout.subIndentSize}cm; margin-top: 6pt; text-align: justify;">
เสียค่าธรรมเนียมปีละ ${wrapData(d.feeAmount)} บาท ( ${wrapData(d.feeText)} )
</p>
<p style="margin-top: 4pt; text-align: justify;">
ตามใบเสร็จรับเงินเล่มที่ ${wrapData(d.receiptBook)} เลขที่ ${wrapData(d.receiptNo)} ลงวันที่ ${wrapData(d.receiptDay)} เดือน ${wrapData(d.receiptMonth)} พ.ศ. ${wrapData(d.receiptYear)}
</p>
<p style="margin-top: 4pt; text-align: justify;">
ผู้รับใบอนุญาตต้องปฏิบัติตามหลักเกณฑ์ วิธีการและเงื่อนไขที่กำหนดในข้อกำหนดของท้องถิ่น
</p>

<p class="indent" style="margin-top: 6pt;">
(2) หากปรากฏในภายหลังว่าการประกอบกิจการที่ได้รับอนุญาตนี้เป็นการขัดต่อกฎหมายอื่นที่เกี่ยวข้อง
</p>
<p style="margin-top: 2pt;">
โดยมิอาจแก้ไขได้ เจ้าพนักงานท้องถิ่นอาจพิจารณาให้เพิกถอนการอนุญาตนี้ได้
</p>

<p class="indent" style="margin-top: 6pt;">
(3) ผู้รับใบอนุญาตต้องปฏิบัติตามเงื่อนไขเฉพาะดังต่อไปนี้อีกด้วย คือ
</p>
<p style="padding-left: ${layout.subIndentSize}cm; margin-top: 3pt;">
3.1) ${wrapData(cond31Line)}
</p>
<p style="padding-left: ${layout.subIndentSize}cm; margin-top: 3pt;">
3.2) ${wrapData(cond32Line)}
</p>

<p class="indent" style="margin-top: 6pt;">
(4) ใบอนุญาตฉบับนี้ออกให้เมื่อวันที่ ${wrapData(d.issueDay)} เดือน ${wrapData(d.issueMonth)} พ.ศ. ${wrapData(d.issueYear)}
</p>
<p class="indent" style="margin-top: 3pt;">
(5) ใบอนุญาตฉบับนี้สิ้นอายุวันที่ ${wrapData(d.expireDay)} เดือน ${wrapData(d.expireMonth)} พ.ศ. ${wrapData(d.expireYear)}
</p>

<table width="100%" cellpadding="0" cellspacing="0" style="margin-top: ${layout.sigMarginTop}pt; border: none; font-size: ${layout.sigFontSize}pt;">
<tr>
<td width="${100 - layout.sigWidth}%" style="border: none;"></td>
<td width="${layout.sigWidth}%" align="center" style="border: none; line-height: 1.45;">
(ลงชื่อ)................................................................<br>
<b>(&nbsp;${execNameClean}&nbsp;)</b><br>
ตำแหน่ง ${d.signerTitle}<br>
เจ้าพนักงานท้องถิ่น
</td>
</tr>
</table>

<div style="margin-top: ${layout.warningMarginTop}pt; font-size: ${layout.warningFontSize}pt; line-height: 1.35;">
<p style="margin: 0;">คำเตือน &nbsp;&nbsp;&nbsp;&nbsp; (1) ผู้รับใบอนุญาตต้องแสดงใบอนุญาตนี้ไว้โดยเปิดเผยและเห็นได้ง่าย ณ สถานที่ประกอบกิจการ</p>
<p style="margin: 0; padding-left: 1.8cm;">ตลอดเวลาที่ประกอบกิจการ หากฝ่าฝืนมีโทษปรับไม่เกิน ห้าร้อยบาท</p>
<p style="margin-top: 2pt; padding-left: 1.8cm;">(2) หากประสงค์จะประกอบกิจการในปีต่อไปต้องยื่นคำขอต่ออายุใบอนุญาต<u>ก่อน</u>ใบอนุญาตสิ้นอายุ</p>
</div>

<br clear="all" style="page-break-before:always" />

<p class="center bold" style="margin-top: 30pt; margin-bottom: 15pt; font-size: ${layout.page2TitleFontSize}pt;">รายการเสียค่าธรรมเนียมหนังสือรับรองการแจ้ง</p>

<table class="border" style="margin-top: 20pt;">
<thead>
<tr>
<th rowspan="2" style="width: ${layout.tableColWidths[0]}%;">วัน/เดือน/ปี<br>ที่ออกใบอนุญาต</th>
<th rowspan="2" style="width: ${layout.tableColWidths[1]}%;">วัน/เดือน/ปี<br>ที่สิ้นอายุใบอนุญาต</th>
<th colspan="3" style="width: ${layout.tableColWidths[2] + layout.tableColWidths[3] + layout.tableColWidths[4]}%;">ใบเสร็จรับเงิน</th>
<th rowspan="2" style="width: ${layout.tableColWidths[5]}%;">(ลงชื่อ)<br>เจ้าพนักงานท้องถิ่น</th>
</tr>
<tr>
<th style="width: ${layout.tableColWidths[2]}%;">เล่มที่</th>
<th style="width: ${layout.tableColWidths[3]}%;">เลขที่</th>
<th style="width: ${layout.tableColWidths[4]}%;">วัน/เดือน/ปี</th>
</tr>
</thead>
<tbody>
${rowsHtml}
</tbody>
</table>

</div>
</body>
</html>`;
  };

  const handleExportWordDoc = () => {
    const filename = `ใบอนุญาต_${(formData.bizName || 'อภ2').replace(/\s+/g, '_')}.docx`;
    exportOfficialLicenseDocx(formData, filename, {
      fontSize: docLayout.fontSize,
      dataBold: docLayout.dataBold,
      underlineStyle: docLayout.underlineStyle,
      marginTopCm: docLayout.marginTop,
      marginBottomCm: docLayout.marginBottom,
      marginLeftCm: docLayout.marginLeft,
      marginRightCm: docLayout.marginRight,
    });
    showToast('ส่งออกไฟล์ Microsoft Word (.docx) มาตรฐานต้นฉบับ 2 หน้า A4 เรียบร้อยแล้ว');
  };

  const handleExportSheetXlsx = (useTemplatePlaceholders = false) => {
    const suffix = useTemplatePlaceholders ? '_แม่แบบ_Tag' : '';
    const filename = `ใบอนุญาต_${(formData.bizName || 'อภ2').replace(/\s+/g, '_')}${suffix}.xlsx`;
    exportOfficialLicenseXlsx(formData, filename, { useTemplatePlaceholders });
    showToast(
      useTemplatePlaceholders
        ? 'ส่งออกไฟล์ชีตแม่แบบ (<<Tag>>) ตามแบบฟอร์มใบอนุญาตเรียบร้อยแล้ว'
        : 'ส่งออกไฟล์ชีต (.xlsx) ตามแม่แบบใบอนุญาต (พร้อมข้อมูลและตารางหน้าหลัง) เรียบร้อยแล้ว'
    );
  };

  const generateStandAloneHtml = (d: LicenseFormState, mode: 'current' | 'handlebars'): string => {
    const v = (key: keyof LicenseFormState) => (mode === 'handlebars' ? `{{${key}}}` : d[key] || '');
    const cond31Val = mode === 'handlebars' ? `{{cond1}}` : cleanBoilerplateCondition(d.cond1);
    const cond32Val = mode === 'handlebars' ? `{{cond2}}` : cleanBoilerplateCondition(d.cond2);
    const cleanSigner = (d.signerName || '').replace(/^\s*\(+|\)+\s*$/g, '').trim();
    const posLines = formatSignerPositionLines(d.signerTitle);
    const posLinesHtml = posLines.map((l) => `<div>${l}</div>`).join('');

    const rowsHtml =
      mode === 'handlebars'
        ? `      {{#each feeRows}}\n      <tr>\n        <td>{{issueDate}}</td>\n        <td>{{expireDate}}</td>\n        <td>{{book}}</td>\n        <td>{{no}}</td>\n        <td>{{date}}</td>\n        <td>{{signer}}</td>\n      </tr>\n      {{/each}}`
        : d.backRows
            .map((r, i) => {
              const bookCell = i === 0 ? (r.book || '-') : (r.book && r.book !== '-' ? r.book : '');
              if (i === 0) {
                return `      <tr style="height:${docLayout.tableRowHeight}px;">\n        <td>${r.issueDate || ''}</td>\n        <td>${r.expireDate || ''}</td>\n        <td>${bookCell}</td>\n        <td>${r.no || ''}</td>\n        <td>${r.date || ''}</td>\n        <td rowspan="${d.backRows.length}" style="vertical-align:bottom; padding-bottom:14px; line-height:1.45;">\n          <div>(${cleanSigner})</div>\n          ${posLinesHtml}\n        </td>\n      </tr>`;
              }
              return `      <tr style="height:${docLayout.tableRowHeight}px;">\n        <td>${r.issueDate || ''}</td>\n        <td>${r.expireDate || ''}</td>\n        <td>${bookCell}</td>\n        <td>${r.no || ''}</td>\n        <td>${r.date || ''}</td>\n      </tr>`;
            })
            .join('\n');

    return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <title>ใบอนุญาตประกอบกิจการที่เป็นอันตรายต่อสุขภาพ - ${v('bizName')}</title>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/gh/lazywasabi/thai-web-fonts@7/fonts/THSarabunNew/THSarabunNew.css" rel="stylesheet">
  <style>
    @font-face {
      font-family: 'TH Sarabun PSK';
      src: local('TH Sarabun PSK'), local('THSarabunPSK'), local('TH Sarabun New'), local('THSarabunNew'),
           url('https://cdn.jsdelivr.net/gh/lazywasabi/thai-web-fonts@7/fonts/THSarabunNew/THSarabunNew.woff2') format('woff2');
    }
    @font-face {
      font-family: 'TH Sarabun New';
      src: local('TH Sarabun New'), local('THSarabunNew'), local('TH Sarabun PSK'), local('THSarabunPSK'),
           url('https://cdn.jsdelivr.net/gh/lazywasabi/thai-web-fonts@7/fonts/THSarabunNew/THSarabunNew.woff2') format('woff2');
    }
    
    @page {
      size: A4;
      margin: 0;
    }
    
    body {
      font-family: ${docLayout.fontFamily};
      font-size: ${docLayout.fontSize}pt;
      line-height: ${docLayout.lineHeight};
      color: #000;
      margin: 0;
      padding: 0;
      background: #e2e8f0;
      -webkit-print-color-adjust: exact;
    }
    
    .page {
      background: white;
      width: 21cm;
      height: 29.7cm;
      padding: ${docLayout.marginTop}cm ${docLayout.marginRight}cm ${docLayout.marginBottom}cm ${docLayout.marginLeft}cm;
      margin: 1cm auto;
      box-sizing: border-box;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      position: relative;
    }
    
    .garuda {
      text-align: center;
      margin-top: ${docLayout.garudaMarginTop}px;
      margin-bottom: 5px;
    }
    
    .garuda img {
      width: ${docLayout.garudaSize}px;
      height: auto;
    }
    
    .title {
      text-align: center;
      font-weight: bold;
      font-size: ${docLayout.titleFontSize}pt;
      margin-bottom: ${docLayout.titleMarginBottom}px;
      line-height: 1.2;
    }
    
    .official-row {
      display: flex;
      align-items: baseline;
      width: 100%;
      min-height: ${docLayout.rowMinHeight}mm;
      line-height: ${docLayout.rowMinHeight}mm;
    }
    .official-row > span {
      flex-shrink: 0;
      white-space: nowrap;
    }
    .fill-dot {
      border-bottom: 1.5px dotted #1e293b;
      display: inline-block;
      text-align: center;
      padding: 0 5px;
      font-weight: ${docLayout.dataBold ? 'bold' : 'normal'};
      vertical-align: bottom;
      height: 6.0mm;
      line-height: 6.0mm;
      outline: none;
      white-space: nowrap;
    }
    .fill-dot:empty::after {
      content: "\\00a0";
      visibility: hidden;
    }
    .fill-dot-left {
      border-bottom: 1.5px dotted #1e293b;
      display: inline-block;
      text-align: left;
      padding: 0 5px;
      font-weight: ${docLayout.dataBold ? 'bold' : 'normal'};
      vertical-align: bottom;
      height: 6.0mm;
      line-height: 6.0mm;
      outline: none;
      white-space: nowrap;
    }
    .fill-dot-left:empty::after {
      content: "\\00a0";
      visibility: hidden;
    }
    .fill-grow {
      flex: 1 1 0% !important;
      flex-shrink: 1 !important;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      font-size: ${docLayout.tableFontSize}pt;
    }
    
    th, td {
      border: 1px solid #000;
      text-align: center;
      padding: ${docLayout.tablePadding}px;
      font-weight: normal;
    }

    @media print {
      body {
        background: none;
        margin: 0;
        padding: 0;
      }
      .page {
        margin: 0;
        box-shadow: none;
        width: 21cm;
        height: 29.7cm;
        padding: ${docLayout.marginTop}cm ${docLayout.marginRight}cm ${docLayout.marginBottom}cm ${docLayout.marginLeft}cm;
        page-break-after: always;
        box-sizing: border-box;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <!-- Page 1: License Front -->
  <div class="page">
    <div class="garuda">
      <img src="${GARUDA_BASE64}" alt="ตราครุฑ">
    </div>
    
    <div class="title">
      <div>ใบอนุญาต</div>
      <div>ประกอบกิจการที่เป็นอันตรายต่อสุขภาพ</div>
    </div>
    
    <!-- Header Info -->
    <div class="official-row" style="margin-bottom: 6px;">
      <span>เล่มที่</span>
      <span class="fill-dot" style="min-width: 28px; padding: 0 4px;">${v('bookNo')}</span>
      <span>เลขที่</span>
      <span class="fill-dot" style="min-width: 52px; padding: 0 4px;">${v('docNo')}</span>
      <span>/</span>
      <span class="fill-dot" style="min-width: 55px; padding: 0 4px;">${v('docYear')}</span><span>.</span>
    </div>

    <!-- Section (1) Permitted Person Details -->
    <div style="margin-bottom: 4px;">
      <div class="official-row">
        <span style="width: ${docLayout.indentSize}cm;"></span>
        <span>(1) เจ้าพนักงานท้องถิ่นอนุญาตให้&nbsp;</span>
        <span class="fill-dot fill-grow" style="min-width: 150px;">${v('applicantName')}</span>
        <span>&nbsp;สัญชาติ&nbsp;</span>
        <span class="fill-dot" style="min-width: 110px;">${v('nationality')}</span>
      </div>

      <div class="official-row">
        <span>อยู่บ้านเลขที่&nbsp;</span>
        <span class="fill-dot" style="min-width: 85px;">${v('houseNo')}</span>
        <span>&nbsp;หมู่ที่&nbsp;</span>
        <span class="fill-dot" style="min-width: 55px;">${v('moo')}</span>
        <span>&nbsp;ตรอก/ซอย&nbsp;</span>
        <span class="fill-dot fill-grow" style="min-width: 80px;">${v('soi')}</span>
        <span>&nbsp;ถนน&nbsp;</span>
        <span class="fill-dot fill-grow" style="min-width: 100px;">${v('road')}</span>
      </div>

      <div class="official-row">
        <span>ตำบล/<del>แขวง</del>&nbsp;</span>
        <span class="fill-dot fill-grow" style="min-width: 100px;">${v('subdistrict')}</span>
        <span>&nbsp;อำเภอ/<del>เขต</del>&nbsp;</span>
        <span class="fill-dot fill-grow" style="min-width: 100px;">${v('district')}</span>
        <span>&nbsp;จังหวัด&nbsp;</span>
        <span class="fill-dot fill-grow" style="min-width: 100px;">${v('province')}</span>
      </div>

      <div class="official-row">
        <span>หมายเลขโทรศัพท์&nbsp;</span>
        <span class="fill-dot-left fill-grow" style="padding-left: 8px;">${v('phone')}</span>
      </div>
    </div>

    <!-- Establishment Section -->
    <div style="margin-bottom: 4px;">
      <div class="official-row">
        <span style="width: ${docLayout.subIndentSize}cm;"></span>
        <span>ชื่อสถานประกอบกิจการที่เป็นอันตรายต่อสุขภาพ ประเภท&nbsp;</span>
        <span class="fill-dot-left fill-grow" style="padding-left: 6px;">${d.bizType || ''}</span>
      </div>

      <div class="official-row">
        <span class="fill-dot-left fill-grow" style="padding-left: 6px;">${d.bizTypeLine2 || ''}</span>
        <span>&nbsp;โดยใช้ชื่อ</span>
      </div>

      <div class="official-row">
        <span>สถานที่&nbsp;</span>
        <span class="fill-dot fill-grow" style="min-width: 120px;">${v('bizName')}</span>
        <span>&nbsp;ตั้งอยู่บ้านเลขที่&nbsp;</span>
        <span class="fill-dot" style="min-width: 65px;">${v('bizHouseNo')}</span>
        <span>&nbsp;หมู่ที่&nbsp;</span>
        <span class="fill-dot" style="min-width: 45px;">${v('bizMoo')}</span>
        <span>&nbsp;ตำบล&nbsp;</span>
        <span class="fill-dot fill-grow" style="min-width: 80px;">${v('bizSubdistrict')}</span>
      </div>

      <div class="official-row">
        <span>อำเภอ&nbsp;</span>
        <span class="fill-dot fill-grow" style="min-width: 80px;">${v('bizDistrict')}</span>
        <span>&nbsp;จังหวัด&nbsp;</span>
        <span class="fill-dot fill-grow" style="min-width: 80px;">${v('bizProvince')}</span>
        <span>&nbsp;หมายเลขโทรศัพท์&nbsp;</span>
        <span class="fill-dot-left fill-grow" style="min-width: 110px; padding-left: 8px;">${v('bizPhone')}</span>
      </div>
    </div>

    <!-- Fee & Receipt Section -->
    <div style="margin-bottom: 4px;">
      <div class="official-row">
        <span style="width: ${docLayout.subIndentSize}cm;"></span>
        <span>เสียค่าธรรมเนียมปีละ&nbsp;</span>
        <span class="fill-dot" style="min-width: 90px;">${v('feeAmount')}</span>
        <span>&nbsp;บาท (&nbsp;</span>
        <span class="fill-dot fill-grow" style="min-width: 140px;">${v('feeText')}</span>
        <span>&nbsp;)</span>
      </div>

      <div class="official-row">
        <span>ตามใบเสร็จรับเงินเล่มที่&nbsp;</span>
        <span class="fill-dot" style="min-width: 45px; padding: 0 3px;">${v('receiptBook')}</span>
        <span>&nbsp;เลขที่&nbsp;</span>
        <span class="fill-dot fill-grow" style="min-width: 65px; padding: 0 4px;">${v('receiptNo')}</span>
        <span>&nbsp;ลงวันที่&nbsp;</span>
        <span class="fill-dot" style="min-width: 32px; padding: 0 3px;">${v('receiptDay')}</span>
        <span>&nbsp;เดือน&nbsp;</span>
        <span class="fill-dot" style="min-width: 75px; padding: 0 4px;">${v('receiptMonth')}</span>
        <span>&nbsp;พ.ศ.&nbsp;</span>
        <span class="fill-dot fill-grow" style="min-width: 45px; padding: 0 3px;">${v('receiptYear')}</span>
      </div>

      <div class="official-row">
        <span>ผู้รับใบอนุญาตต้องปฏิบัติตามหลักเกณฑ์ วิธีการและเงื่อนไขที่กำหนดในข้อกำหนดของท้องถิ่น</span>
      </div>
    </div>

    <!-- Clause (2): Legal Notice -->
    <div style="margin-bottom: 4px;">
      <div class="official-row">
        <span style="width: ${docLayout.indentSize}cm;"></span>
        <span>(2) หากปรากฏในภายหลังว่าการประกอบกิจการที่ได้รับอนุญาตนี้เป็นการขัดต่อกฎหมายอื่นที่เกี่ยวข้อง</span>
      </div>
      <div class="official-row">
        <span>โดยมิอาจแก้ไขได้ เจ้าพนักงานท้องถิ่นอาจพิจารณาให้เพิกถอนการอนุญาตนี้ได้</span>
      </div>
    </div>

    <!-- Clause (3): Specific Conditions -->
    <div style="margin-bottom: 4px;">
      <div class="official-row">
        <span style="width: ${docLayout.indentSize}cm;"></span>
        <span>(3) ผู้รับใบอนุญาตต้องปฏิบัติตามเงื่อนไขเฉพาะดังต่อไปนี้อีกด้วย คือ</span>
      </div>
      <div class="official-row">
        <span style="width: ${docLayout.subIndentSize}cm;"></span>
        <span>3.1)&nbsp;</span>
        <span class="fill-dot-left fill-grow" style="padding-left: 6px;">${cond31Val}</span>
      </div>
      <div class="official-row">
        <span style="width: ${docLayout.subIndentSize}cm;"></span>
        <span>3.2)&nbsp;</span>
        <span class="fill-dot-left fill-grow" style="padding-left: 6px;">${cond32Val}</span>
      </div>
    </div>

    <!-- Clauses (4) & (5): Issue Date & Expire Date -->
    <div style="margin-bottom: 4px;">
      <div class="official-row">
        <span style="display: inline-flex; align-items: baseline; width: 54%; flex-shrink: 0;">
          <span style="width: ${docLayout.indentSize}cm; flex-shrink: 0;"></span>
          <span style="flex-shrink: 0;">(4) ใบอนุญาตฉบับนี้ออกให้เมื่อวันที่&nbsp;</span>
          <span class="fill-dot fill-grow" style="min-width: 35px;">${v('issueDay')}</span>
        </span>
        <span style="display: inline-flex; align-items: baseline; width: 25%; flex-shrink: 0;">
          <span style="flex-shrink: 0;">&nbsp;เดือน&nbsp;</span>
          <span class="fill-dot fill-grow" style="min-width: 65px;">${v('issueMonth')}</span>
        </span>
        <span style="display: inline-flex; align-items: baseline; width: 21%; flex-shrink: 0;">
          <span style="flex-shrink: 0;">&nbsp;พ.ศ.&nbsp;</span>
          <span class="fill-dot fill-grow" style="min-width: 45px;">${v('issueYear')}</span><span>.</span>
        </span>
      </div>

      <div class="official-row">
        <span style="display: inline-flex; align-items: baseline; width: 54%; flex-shrink: 0;">
          <span style="width: ${docLayout.indentSize}cm; flex-shrink: 0;"></span>
          <span style="flex-shrink: 0;">(5) ใบอนุญาตฉบับนี้สิ้นอายุวันที่&nbsp;</span>
          <span class="fill-dot fill-grow" style="min-width: 35px;">${v('expireDay')}</span>
        </span>
        <span style="display: inline-flex; align-items: baseline; width: 25%; flex-shrink: 0;">
          <span style="flex-shrink: 0;">&nbsp;เดือน&nbsp;</span>
          <span class="fill-dot fill-grow" style="min-width: 65px;">${v('expireMonth')}</span>
        </span>
        <span style="display: inline-flex; align-items: baseline; width: 21%; flex-shrink: 0;">
          <span style="flex-shrink: 0;">&nbsp;พ.ศ.&nbsp;</span>
          <span class="fill-dot fill-grow" style="min-width: 45px;">${v('expireYear')}</span><span>.</span>
        </span>
      </div>
    </div>

    <!-- Signature Box -->
    <div style="float: right; width: ${docLayout.sigWidth}%; margin-top: ${docLayout.sigMarginTop}px; margin-bottom: 6px; line-height: 1.4; font-size: ${docLayout.sigFontSize}pt;">
      <div style="display: flex; align-items: baseline;">
        <span style="width: 52px; flex-shrink: 0;">(ลงชื่อ)</span>
        <span class="fill-dot" style="display: inline-block; width: 195px;"></span>
      </div>
      <div style="display: flex; align-items: baseline; margin-top: 3px;">
        <span style="width: 52px; flex-shrink: 0;"></span>
        <span style="width: 195px; text-align: center;">(<span class="fill-dot" style="min-width: 150px; padding: 0 8px;">${cleanSigner}</span>)</span>
      </div>
      <div style="display: flex; align-items: flex-start; margin-top: 2px;">
        <span style="width: 52px; flex-shrink: 0;">ตำแหน่ง</span>
        <span style="width: 195px; text-align: center;">${posLinesHtml}</span>
      </div>
      <div style="display: flex; align-items: baseline; margin-top: 2px;">
        <span style="width: 52px; flex-shrink: 0;"></span>
        <span style="width: 195px; text-align: center;">เจ้าพนักงานท้องถิ่น</span>
      </div>
    </div>

    <!-- Warnings Footer -->
    <div style="clear: both; font-size: ${docLayout.warningFontSize}pt; margin-top: ${docLayout.warningMarginTop}px; line-height: 1.35;">
      <div class="official-row" style="align-items: baseline; margin-bottom: 1px;">
        <span>คำเตือน</span>
        <span style="margin-left: 0.8cm;">(1) ผู้รับใบอนุญาตต้องแสดงใบอนุญาตนี้ไว้โดยเปิดเผยและเห็นได้ง่าย ณ สถานที่ประกอบกิจการ</span>
      </div>
      <div style="line-height: 1.35;">ตลอดเวลาที่ประกอบกิจการ หากฝ่าฝืนมีโทษปรับไม่เกิน ห้าร้อยบาท</div>
      <div style="margin-top: 2px; margin-left: 1.65cm; line-height: 1.35;">(2) หากประสงค์จะประกอบกิจการในปีต่อไปต้องยื่นคำขอต่ออายุใบอนุญาต<u><b>ก่อน</b></u>ใบอนุญาตสิ้นอายุ</div>
    </div>
  </div>

  <!-- Page 2: License Back -->
  <div class="page page-break" style="page-break-before: always; padding-left: 1.25cm; padding-right: 1.25cm;">
    <div class="title" style="margin-top: 20px; font-size: ${docLayout.page2TitleFontSize}pt; font-weight: bold;">รายการเสียค่าธรรมเนียมหนังสือรับรองการแจ้ง</div>
    
    <table>
      <thead>
        <tr>
          <th rowspan="2" style="width: ${docLayout.tableColWidths[0]}%;">วัน/เดือน/ปี<br>ที่ออกใบอนุญาต</th>
          <th rowspan="2" style="width: ${docLayout.tableColWidths[1]}%;">วัน/เดือน/ปี<br>ที่สิ้นอายุใบอนุญาต</th>
          <th colspan="3" style="width: ${docLayout.tableColWidths[2] + docLayout.tableColWidths[3] + docLayout.tableColWidths[4]}%;">ใบเสร็จรับเงิน</th>
          <th rowspan="2" style="width: ${docLayout.tableColWidths[5]}%;">(ลงชื่อ)<br>เจ้าพนักงานท้องถิ่น</th>
        </tr>
        <tr>
          <th style="width: ${docLayout.tableColWidths[2]}%;">เล่มที่</th>
          <th style="width: ${docLayout.tableColWidths[3]}%;">เลขที่</th>
          <th style="width: ${docLayout.tableColWidths[4]}%;">วัน/เดือน/ปี</th>
        </tr>
      </thead>
      <tbody>
${rowsHtml}
      </tbody>
    </table>
  </div>
</body>
</html>`;
  };

  const handleCopyCode = () => {
    const code = generateStandAloneHtml(formData, codeTemplateMode);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(code)
        .then(() => showToast('คัดลอกโค้ด HTML ลงคลิปบอร์ดแล้ว'))
        .catch(() => showToast('โปรดคลุมดำและคัดลอกโค้ด'));
    } else {
      showToast('โปรดคลุมดำและคัดลอกโค้ด');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex flex-col items-center justify-center p-0 sm:p-2 overflow-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="no-print fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs sm:text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Modal Container */}
      <div className="bg-slate-100 h-screen sm:h-[98vh] w-full max-w-[1720px] flex flex-col shadow-2xl rounded-none sm:rounded-2xl overflow-hidden border border-slate-300">
        
        {/* Navigation & Action Header (Pinned Top - No Print) */}
        <header className="no-print shrink-0 z-40 bg-white border-b border-slate-200 px-4 py-2.5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            
            {/* Title / Badge */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                อภ.2
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-bold text-slate-900">
                    ระบบออกใบอนุญาต & จัดหน้าอิสระเสมือน MS Word (A4 หน้า-หลัง)
                  </h1>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    MS Word Studio
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {formData.bizName ? (
                    <>สถานประกอบการ: <strong className="text-slate-800 font-semibold">{formData.bizName}</strong> | ผู้รับอนุญาต: {formData.applicantName} | เลขที่: {formData.docNo}/{formData.docYear}</>
                  ) : (
                    'คลิกแก้ข้อความได้ทุกจุด • ปรับขนาดครุฑ หัวเรื่อง ย่อหน้า ลายเซ็น เส้นประ ขอบกระดาษ และตารางได้โดยอิสระ'
                  )}
                </p>
              </div>
            </div>

            {/* View Mode Tabs & Primary Actions */}
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                    activeTab === 'preview' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5 text-indigo-600" />
                  <span>พรีวิว & ฟอร์มกรอก</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('sideBySide')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                    activeTab === 'sideBySide' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Columns className="w-3.5 h-3.5 text-blue-600" />
                  <span>มุมมองคู่ หน้า-หลัง</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('code')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                    activeTab === 'code' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>โค้ด HTML</span>
                </button>
              </div>

              {license && (
                <button
                  type="button"
                  onClick={handleReloadLicenseData}
                  className="px-2 py-1 rounded-lg text-xs font-medium border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition cursor-pointer flex items-center gap-1"
                  title="ดึงข้อมูลที่บันทึกไว้ในระบบเข้ามาใหม่อีกครั้ง"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden md:inline">ดึงข้อมูลระบบ</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleClearForm}
                className="px-2 py-1 rounded-lg text-xs font-medium border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer"
                title="ล้างข้อความทั้งหมดเป็นแบบฟอร์มว่าง"
              >
                ล้างฟอร์ม
              </button>

              <button
                type="button"
                onClick={handleLoadSample}
                className="px-2 py-1 rounded-lg text-xs font-medium border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition cursor-pointer flex items-center gap-1"
                title="โหลดข้อมูลตัวอย่างต้นฉบับ"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span className="hidden md:inline">ตัวอย่าง</span>
              </button>

              {onSaveLicense && license && (
                <button
                  type="button"
                  onClick={handleSaveToSystem}
                  disabled={isSaving}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                  title="บันทึกข้อมูลที่แก้ไขลงฐานข้อมูลใบอนุญาต"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกลงระบบ'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleExportWordDoc}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1 transition cursor-pointer"
                title="ส่งออกเอกสารเป็นไฟล์ Microsoft Word (.docx) มาตรฐานต้นฉบับ 2 หน้า A4"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Word (.docx)</span>
              </button>

              {/* Sheet (.xlsx) Export Buttons matching Google Sheet Template */}
              <div className="relative inline-flex items-center rounded-lg bg-teal-600 hover:bg-teal-700 shadow-xs text-white transition">
                <button
                  type="button"
                  onClick={() => handleExportSheetXlsx(false)}
                  className="px-2.5 py-1 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  title="ส่งออกเป็นไฟล์ชีต (.xlsx) ตามแม่แบบใบอนุญาต (พร้อมข้อมูลและตารางหน้าหลัง)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Sheet (.xlsx)</span>
                </button>
                <div className="h-4 w-px bg-teal-400"></div>
                <button
                  type="button"
                  onClick={() => handleExportSheetXlsx(true)}
                  className="px-2 py-1 text-[11px] hover:bg-teal-800 cursor-pointer"
                  title="ส่งออกไฟล์ชีตแม่แบบที่มีตัวแปร <<Tag>> ตามต้นฉบับ Google Sheets"
                >
                  แม่แบบ Tag
                </button>
                <div className="h-4 w-px bg-teal-400"></div>
                <a
                  href={GOOGLE_SHEET_TEMPLATE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1 text-[11px] hover:bg-teal-800 rounded-r-lg flex items-center gap-0.5 cursor-pointer"
                  title="เปิดไฟล์แม่แบบ Google Sheets ต้นฉบับ"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Print Buttons */}
              <div className="relative inline-flex items-center rounded-lg bg-indigo-600 hover:bg-indigo-700 shadow-sm text-white transition">
                <button
                  type="button"
                  onClick={() => handlePrint('both')}
                  className="px-3 py-1 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  title="สั่งพิมพ์ A4 แบบ 2 หน้า (หน้า-หลัง)"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>พิมพ์ 2 หน้า</span>
                </button>
                <div className="h-4 w-px bg-indigo-400"></div>
                <button
                  type="button"
                  onClick={() => handlePrint('page1')}
                  className="px-2 py-1 text-[11px] hover:bg-indigo-800 cursor-pointer"
                  title="พิมพ์เฉพาะด้านหน้า (หน้าที่ 1)"
                >
                  หน้า 1
                </button>
                <div className="h-4 w-px bg-indigo-400"></div>
                <button
                  type="button"
                  onClick={() => handlePrint('page2')}
                  className="px-2 py-1 text-[11px] hover:bg-indigo-800 rounded-r-lg cursor-pointer"
                  title="พิมพ์เฉพาะด้านหลัง (หน้าที่ 2)"
                >
                  หน้า 2
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                title="ปิดหน้าต่าง"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* ================= PINNED MS WORD STUDIO RIBBON TOOLBAR (No Print - Never Scrolls Out) ================= */}
        {(activeTab === 'preview' || activeTab === 'sideBySide') && (
          <div className="no-print shrink-0 z-30 bg-white border-b border-slate-300 shadow-xs text-slate-800">
            {/* Ribbon Row 1: Font, Size, B/I/U, Align, Underline Style, Spacing, and Drawer Toggles */}
            <div className="px-3 py-1.5 bg-slate-50 flex flex-wrap items-center justify-between gap-x-2.5 gap-y-1.5 text-xs">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                {/* 1. Font Family */}
                <div className="flex items-center gap-1 pr-2 border-r border-slate-200">
                  <Type className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <select
                    value={docLayout.fontFamily}
                    onChange={(e) => setDocLayout((prev) => ({ ...prev, fontFamily: e.target.value }))}
                    className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    title="เปลี่ยนแบบอักษร (Font Family)"
                  >
                    <option value="'TH Sarabun PSK', 'TH Sarabun New', 'Sarabun', sans-serif">TH SarabunPSK (ราชการ)</option>
                    <option value="'TH Sarabun New', 'TH Sarabun PSK', 'Sarabun', sans-serif">TH Sarabun New</option>
                    <option value="'Sarabun', 'TH Sarabun New', sans-serif">Sarabun (Google Font)</option>
                    <option value="'Angsana New', 'AngsanaUPC', 'Sarabun', sans-serif">Angsana New (อังสนา)</option>
                    <option value="'Cordia New', 'CordiaUPC', 'Sarabun', sans-serif">Cordia New (คอร์เดีย)</option>
                    <option value="'Browallia New', 'BrowalliaUPC', 'Sarabun', sans-serif">Browallia New (บราววาเลีย)</option>
                  </select>
                </div>

                {/* 2. Body Font Size */}
                <div className="flex items-center gap-1 pr-2 border-r border-slate-200">
                  <span className="text-[11px] text-slate-500 font-medium">ฟอนต์:</span>
                  <select
                    value={docLayout.fontSize}
                    onChange={(e) => setDocLayout((prev) => ({ ...prev, fontSize: Number(e.target.value) }))}
                    className="rounded border border-slate-300 bg-white px-1 py-0.5 text-xs font-bold text-slate-800 focus:outline-none"
                    title="ขนาดตัวอักษรเนื้อหา (pt)"
                  >
                    {[12, 13, 14, 15, 16, 17, 18, 19, 20, 22].map((sz) => (
                      <option key={sz} value={sz}>{sz} pt{sz === 16 ? ' (มาตรฐาน)' : ''}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setDocLayout((prev) => ({ ...prev, fontSize: Math.max(11, prev.fontSize - 1) }))}
                    className="w-6 h-6 rounded border border-slate-300 bg-white hover:bg-slate-100 flex items-center justify-center font-bold text-[10px] text-slate-700 cursor-pointer"
                    title="ลดขนาดตัวอักษร (A-)"
                  >
                    A-
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocLayout((prev) => ({ ...prev, fontSize: Math.min(26, prev.fontSize + 1) }))}
                    className="w-6 h-6 rounded border border-slate-300 bg-white hover:bg-slate-100 flex items-center justify-center font-bold text-[10px] text-slate-700 cursor-pointer"
                    title="เพิ่มขนาดตัวอักษร (A+)"
                  >
                    A+
                  </button>
                </div>

                {/* 3. Rich Text Formatting (B, I, U, Align, Undo/Redo) */}
                <div className="flex items-center gap-0.5 pr-2 border-r border-slate-200">
                  <button
                    type="button"
                    onClick={() => formatSelection('bold')}
                    className="w-6 h-6 rounded border border-slate-300 bg-white hover:bg-blue-50 flex items-center justify-center text-slate-800 cursor-pointer"
                    title="ทำตัวหนาเฉพาะข้อความที่คลุมดำ (Ctrl+B)"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => formatSelection('italic')}
                    className="w-6 h-6 rounded border border-slate-300 bg-white hover:bg-blue-50 flex items-center justify-center text-slate-800 cursor-pointer"
                    title="ทำตัวเอียงเฉพาะข้อความที่คลุมดำ (Ctrl+I)"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => formatSelection('underline')}
                    className="w-6 h-6 rounded border border-slate-300 bg-white hover:bg-blue-50 flex items-center justify-center text-slate-800 cursor-pointer"
                    title="ขีดเส้นใต้เฉพาะข้อความที่คลุมดำ (Ctrl+U)"
                  >
                    <Underline className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-px h-4 bg-slate-300 mx-0.5"></span>
                  <button
                    type="button"
                    onClick={() => formatSelection('justifyLeft')}
                    className="w-6 h-6 rounded border border-slate-300 bg-white hover:bg-blue-50 flex items-center justify-center text-slate-700 cursor-pointer"
                    title="ชิดซ้าย"
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => formatSelection('justifyCenter')}
                    className="w-6 h-6 rounded border border-slate-300 bg-white hover:bg-blue-50 flex items-center justify-center text-slate-700 cursor-pointer"
                    title="กึ่งกลาง"
                  >
                    <AlignCenter className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => formatSelection('justifyRight')}
                    className="w-6 h-6 rounded border border-slate-300 bg-white hover:bg-blue-50 flex items-center justify-center text-slate-700 cursor-pointer"
                    title="ชิดขวา"
                  >
                    <AlignRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => formatSelection('justifyFull')}
                    className="w-6 h-6 rounded border border-slate-300 bg-white hover:bg-blue-50 flex items-center justify-center text-slate-700 cursor-pointer"
                    title="กระจายเท่ากัน"
                  >
                    <AlignJustify className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-px h-4 bg-slate-300 mx-0.5"></span>
                  <button
                    type="button"
                    onClick={() => formatSelection('undo')}
                    className="w-6 h-6 rounded border border-slate-300 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-700 cursor-pointer"
                    title="เลิกทำ (Undo)"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => formatSelection('redo')}
                    className="w-6 h-6 rounded border border-slate-300 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-700 cursor-pointer"
                    title="ทำซ้ำ (Redo)"
                  >
                    <Redo2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 4. Underline Style & Data Bold */}
                <div className="flex items-center gap-1.5 pr-2 border-r border-slate-200">
                  <span className="text-[11px] text-slate-500 font-medium">เส้นช่องว่าง:</span>
                  <select
                    value={docLayout.underlineStyle}
                    onChange={(e) => setDocLayout((prev) => ({ ...prev, underlineStyle: e.target.value as any }))}
                    className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs font-medium text-slate-800 focus:outline-none"
                    title="รูปแบบเส้นใต้ข้อมูล"
                  >
                    <option value="dotted">เส้นจุดไข่ปลา (...)</option>
                    <option value="dashed">เส้นประ (---)</option>
                    <option value="solid">เส้นทึบ (___)</option>
                    <option value="none">ซ่อนเส้น (พิมพ์ลงฟอร์มเปล่า)</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setDocLayout((prev) => ({ ...prev, dataBold: !prev.dataBold }))}
                    className={`px-1.5 py-0.5 rounded border text-[11px] font-semibold cursor-pointer transition ${
                      docLayout.dataBold
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                    }`}
                    title="สลับตัวหนา/ตัวปกติ สำหรับข้อมูลที่กรอกทั้งหมด"
                  >
                    ข้อมูลหนา
                  </button>
                </div>

                {/* 5. Line & Row Spacing */}
                <div className="flex items-center gap-1 pr-2 border-r border-slate-200">
                  <span className="text-[11px] text-slate-500 font-medium">บรรทัด:</span>
                  <select
                    value={docLayout.lineHeight}
                    onChange={(e) => setDocLayout((prev) => ({ ...prev, lineHeight: Number(e.target.value) }))}
                    className="rounded border border-slate-300 bg-white px-1 py-0.5 text-xs font-medium text-slate-800 focus:outline-none"
                    title="ระยะห่างบรรทัด (Line Height)"
                  >
                    <option value={1.05}>1.05x</option>
                    <option value={1.1}>1.10x</option>
                    <option value={1.15}>1.15x</option>
                    <option value={1.2}>1.20x</option>
                    <option value={1.25}>1.25x (มาตรฐาน)</option>
                    <option value={1.35}>1.35x</option>
                    <option value={1.5}>1.50x</option>
                  </select>
                  <select
                    value={docLayout.rowMinHeight}
                    onChange={(e) => setDocLayout((prev) => ({ ...prev, rowMinHeight: Number(e.target.value) }))}
                    className="rounded border border-slate-300 bg-white px-1 py-0.5 text-xs font-medium text-slate-800 focus:outline-none"
                    title="ความสูงแต่ละบรรทัดข้อมูล (มม.)"
                  >
                    <option value={5.5}>แถว 5.5 มม.</option>
                    <option value={6.0}>แถว 6.0 มม.</option>
                    <option value={6.2}>แถว 6.2 มม. (ตามแม่แบบ)</option>
                    <option value={6.5}>แถว 6.5 มม.</option>
                    <option value={7.0}>แถว 7.0 มม.</option>
                    <option value={7.5}>แถว 7.5 มม.</option>
                    <option value={8.0}>แถว 8.0 มม.</option>
                    <option value={9.0}>แถว 9.0 มม.</option>
                  </select>
                </div>

                {/* 6. Independent Element / Margin / Table Drawer Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowElementsCustom(!showElementsCustom)}
                    className={`px-2 py-0.5 rounded border text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ${
                      showElementsCustom
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                        : 'bg-indigo-50 border-indigo-200 text-indigo-800 hover:bg-indigo-100'
                    }`}
                    title="ปรับขนาดและตำแหน่งของ ครุฑ, หัวเรื่อง, ย่อหน้า, ลายเซ็น, คำเตือน อย่างอิสระ"
                  >
                    <Sliders className="w-3 h-3" />
                    <span>🎛️ ปรับแยกทุกส่วนอิสระ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowMarginCustom(!showMarginCustom)}
                    className={`px-2 py-0.5 rounded border text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ${
                      showMarginCustom
                        ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                        : 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100'
                    }`}
                    title="ปรับระยะขอบกระดาษ A4 ทั้ง 4 ด้าน"
                  >
                    <Layout className="w-3 h-3" />
                    <span>📏 ขอบกระดาษ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowTableCustom(!showTableCustom)}
                    className={`px-2 py-0.5 rounded border text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ${
                      showTableCustom
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                    }`}
                    title="ปรับตารางด้านหลัง ความกว้างแต่ละคอลัมน์ ความสูงแถว และตำแหน่งผู้ลงนาม"
                  >
                    <Table className="w-3 h-3" />
                    <span>📐 ตารางหน้า 2 & ผู้ลงนาม</span>
                  </button>
                </div>
              </div>

              {/* Right-side: Direct Edit Toggle & Reset */}
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1 cursor-pointer text-[11px] font-semibold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-300">
                  <input
                    type="checkbox"
                    checked={docLayout.isFullEditMode}
                    onChange={(e) => {
                      setDocLayout((prev) => ({ ...prev, isFullEditMode: e.target.checked }));
                      if (e.target.checked) setAllowContentEditable(true);
                    }}
                    className="rounded text-indigo-600 focus:ring-0"
                  />
                  <span>โหมดแก้ทุกจุด (เส้นประช่วยจัดหน้า)</span>
                </label>

                <button
                  type="button"
                  onClick={handleResetLayout}
                  className="px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-[11px] font-medium text-slate-700 flex items-center gap-1 cursor-pointer"
                  title="คืนค่าการจัดหน้าทั้งหมดกลับเป็นค่ามาตรฐานราชการ"
                >
                  <RotateCcw className="w-3 h-3 text-rose-600" />
                  <span>รีเซ็ตค่าจัดหน้า</span>
                </button>
              </div>
            </div>

            {/* ================= DRAWER 1: INDEPENDENT ELEMENT CONTROLS (ปรับแยกทุกส่วนอิสระ) ================= */}
            {showElementsCustom && (
              <div className="px-3.5 py-2 bg-indigo-50/90 border-t border-indigo-200 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 text-xs">
                {/* Group A: ตราครุฑ */}
                <div className="bg-white p-2 rounded-lg border border-indigo-200/80 shadow-2xs space-y-1.5">
                  <div className="font-bold text-indigo-900 flex items-center justify-between text-[11px]">
                    <span>🦅 1. ตราครุฑ (Garuda)</span>
                    <span className="text-[10px] text-slate-400">มาตรฐาน 100px</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <div>
                      <label className="block text-[10px] text-slate-500">ขนาด (px)</label>
                      <input
                        type="number"
                        min={40}
                        max={200}
                        step={2}
                        value={docLayout.garudaSize}
                        onChange={(e) => setDocLayout((prev) => ({ ...prev, garudaSize: Number(e.target.value) }))}
                        className="w-full rounded border border-slate-300 px-1.5 py-0.5 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500">ขึ้น/ลง (px)</label>
                      <input
                        type="number"
                        min={-40}
                        max={60}
                        step={1}
                        value={docLayout.garudaMarginTop}
                        onChange={(e) => setDocLayout((prev) => ({ ...prev, garudaMarginTop: Number(e.target.value) }))}
                        className="w-full rounded border border-slate-300 px-1.5 py-0.5 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500">ซ้าย/ขวา (px)</label>
                      <input
                        type="number"
                        min={-150}
                        max={150}
                        step={2}
                        value={docLayout.garudaOffsetX}
                        onChange={(e) => setDocLayout((prev) => ({ ...prev, garudaOffsetX: Number(e.target.value) }))}
                        className="w-full rounded border border-slate-300 px-1.5 py-0.5 text-xs font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* Group B: หัวเรื่องหน้า 1 & หน้า 2 */}
                <div className="bg-white p-2 rounded-lg border border-indigo-200/80 shadow-2xs space-y-1.5">
                  <div className="font-bold text-indigo-900 flex items-center justify-between text-[11px]">
                    <span>📌 2. หัวเรื่อง (Titles)</span>
                    <span className="text-[10px] text-slate-400">หน้า 1 & หน้า 2</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <div>
                      <label className="block text-[10px] text-slate-500">หัวหน้า 1 (pt)</label>
                      <input
                        type="number"
                        min={14}
                        max={28}
                        value={docLayout.titleFontSize}
                        onChange={(e) => setDocLayout((prev) => ({ ...prev, titleFontSize: Number(e.target.value) }))}
                        className="w-full rounded border border-slate-300 px-1.5 py-0.5 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500">ห่างล่าง (px)</label>
                      <input
                        type="number"
                        min={0}
                        max={40}
                        value={docLayout.titleMarginBottom}
                        onChange={(e) => setDocLayout((prev) => ({ ...prev, titleMarginBottom: Number(e.target.value) }))}
                        className="w-full rounded border border-slate-300 px-1.5 py-0.5 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500">หัวหน้า 2 (pt)</label>
                      <input
                        type="number"
                        min={14}
                        max={28}
                        value={docLayout.page2TitleFontSize}
                        onChange={(e) => setDocLayout((prev) => ({ ...prev, page2TitleFontSize: Number(e.target.value) }))}
                        className="w-full rounded border border-slate-300 px-1.5 py-0.5 text-xs font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* Group C: ระยะย่อหน้า (Indents) */}
                <div className="bg-white p-2 rounded-lg border border-indigo-200/80 shadow-2xs space-y-1.5">
                  <div className="font-bold text-indigo-900 flex items-center justify-between text-[11px]">
                    <span>⇥ 3. ระยะย่อหน้า (Indents)</span>
                    <span className="text-[10px] text-slate-400">หน่วย: ซม.</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500">ย่อหน้าข้อ (1)-(5) (ซม.)</label>
                      <input
                        type="number"
                        step={0.1}
                        min={0}
                        max={5}
                        value={docLayout.indentSize}
                        onChange={(e) => setDocLayout((prev) => ({ ...prev, indentSize: Number(e.target.value) }))}
                        className="w-full rounded border border-slate-300 px-1.5 py-0.5 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500">ย่อหน้าย่อย 3.1/กิจการ (ซม.)</label>
                      <input
                        type="number"
                        step={0.1}
                        min={0}
                        max={6}
                        value={docLayout.subIndentSize}
                        onChange={(e) => setDocLayout((prev) => ({ ...prev, subIndentSize: Number(e.target.value) }))}
                        className="w-full rounded border border-slate-300 px-1.5 py-0.5 text-xs font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* Group D: กล่องลายเซ็น (Signature Block) */}
                <div className="bg-white p-2 rounded-lg border border-indigo-200/80 shadow-2xs space-y-1.5">
                  <div className="font-bold text-indigo-900 flex items-center justify-between text-[11px]">
                    <span>✍️ 4. กล่องลายเซ็น (Signature)</span>
                    <span className="text-[10px] text-slate-400">ขยับอิสระ</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    <div>
                      <label className="block text-[10px] text-slate-500">กว้าง (%)</label>
                      <input
                        type="number"
                        min={30}
                        max={100}
                        value={docLayout.sigWidth}
                        onChange={(e) => setDocLayout((prev) => ({ ...prev, sigWidth: Number(e.target.value) }))}
                        className="w-full rounded border border-slate-300 px-1 py-0.5 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500">ห่างบน (px)</label>
                      <input
                        type="number"
                        min={-20}
                        max={100}
                        value={docLayout.sigMarginTop}
                        onChange={(e) => setDocLayout((prev) => ({ ...prev, sigMarginTop: Number(e.target.value) }))}
                        className="w-full rounded border border-slate-300 px-1 py-0.5 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500">ซ้าย/ขวา</label>
                      <input
                        type="number"
                        min={-150}
                        max={100}
                        value={docLayout.sigOffsetX}
                        onChange={(e) => setDocLayout((prev) => ({ ...prev, sigOffsetX: Number(e.target.value) }))}
                        className="w-full rounded border border-slate-300 px-1 py-0.5 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500">ฟอนต์ (pt)</label>
                      <input
                        type="number"
                        min={12}
                        max={22}
                        value={docLayout.sigFontSize}
                        onChange={(e) => setDocLayout((prev) => ({ ...prev, sigFontSize: Number(e.target.value) }))}
                        className="w-full rounded border border-slate-300 px-1 py-0.5 text-xs font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* Group E: คำเตือนท้ายกระดาษ (Footer Warnings) */}
                <div className="bg-white p-2 rounded-lg border border-indigo-200/80 shadow-2xs space-y-1.5">
                  <div className="font-bold text-indigo-900 flex items-center justify-between text-[11px]">
                    <span>⚠️ 5. คำเตือนท้ายหน้า 1</span>
                    <span className="text-[10px] text-slate-400">มาตรฐาน 14pt</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500">ขนาดฟอนต์ (pt)</label>
                      <input
                        type="number"
                        min={10}
                        max={20}
                        value={docLayout.warningFontSize}
                        onChange={(e) => setDocLayout((prev) => ({ ...prev, warningFontSize: Number(e.target.value) }))}
                        className="w-full rounded border border-slate-300 px-1.5 py-0.5 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500">ระยะห่างบน (px)</label>
                      <input
                        type="number"
                        min={0}
                        max={80}
                        value={docLayout.warningMarginTop}
                        onChange={(e) => setDocLayout((prev) => ({ ...prev, warningMarginTop: Number(e.target.value) }))}
                        className="w-full rounded border border-slate-300 px-1.5 py-0.5 text-xs font-semibold"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= DRAWER 2: PAGE MARGINS (ระยะขอบกระดาษ 4 ด้าน) ================= */}
            {showMarginCustom && (
              <div className="px-3.5 py-2 bg-blue-50/90 border-t border-blue-200 flex flex-wrap items-center gap-3 text-xs">
                <span className="font-bold text-blue-900">📏 ระยะขอบกระดาษ A4 (ซม.):</span>
                <select
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'official') {
                      setDocLayout((prev) => ({ ...prev, marginTop: 1.5, marginBottom: 0.9, marginLeft: 2.5, marginRight: 2.0 }));
                      showToast('ใช้ระยะขอบมาตรฐานราชการ');
                    } else if (val === 'wordOrig') {
                      setDocLayout((prev) => ({ ...prev, marginTop: 1.5, marginBottom: 0.9, marginLeft: 2.54, marginRight: 1.75 }));
                      showToast('ใช้ระยะขอบตามไฟล์ Word ต้นฉบับ');
                    } else if (val === 'compact') {
                      setDocLayout((prev) => ({ ...prev, marginTop: 1.0, marginBottom: 0.6, marginLeft: 1.8, marginRight: 1.5 }));
                      showToast('ใช้ระยะขอบแบบกะทัดรัด');
                    } else if (val === 'equal') {
                      setDocLayout((prev) => ({ ...prev, marginTop: 1.5, marginBottom: 1.5, marginLeft: 2.0, marginRight: 2.0 }));
                      showToast('ใช้ระยะขอบสมดุล');
                    }
                  }}
                  className="rounded border border-blue-300 bg-white px-2 py-0.5 text-xs font-medium text-slate-800"
                >
                  <option value="official">มาตรฐาน (บน 1.5 / ซ้าย 2.5 / ขวา 2.0 / ล่าง 0.9 ซม.)</option>
                  <option value="wordOrig">Word ต้นฉบับ (บน 1.5 / ซ้าย 2.54 / ขวา 1.75 / ล่าง 0.9 ซม.)</option>
                  <option value="compact">กะทัดรัด (บน 1.0 / ซ้าย 1.8 / ขวา 1.5 / ล่าง 0.6 ซม.)</option>
                  <option value="equal">สมดุล (บน 1.5 / ซ้าย 2.0 / ขวา 2.0 / ล่าง 1.5 ซม.)</option>
                </select>

                {[
                  { label: 'ขอบบน', key: 'marginTop' as const },
                  { label: 'ขอบล่าง', key: 'marginBottom' as const },
                  { label: 'ขอบซ้าย', key: 'marginLeft' as const },
                  { label: 'ขอบขวา', key: 'marginRight' as const },
                ].map((m) => (
                  <div key={m.key} className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-blue-200">
                    <label className="text-[11px] text-slate-600 font-medium">{m.label}:</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.3"
                      max="4.5"
                      value={docLayout[m.key]}
                      onChange={(e) => setDocLayout((prev) => ({ ...prev, [m.key]: Number(e.target.value) }))}
                      className="w-14 rounded border border-slate-300 px-1 py-0.5 text-center text-xs font-bold text-slate-800"
                    />
                    <span className="text-[10px] text-slate-500">ซม.</span>
                  </div>
                ))}
              </div>
            )}

            {/* ================= DRAWER 3: TABLE & SIGNER PLACEMENT (ตารางหน้า 2 & ผู้ลงนาม) ================= */}
            {showTableCustom && (
              <div className="px-3.5 py-2 bg-emerald-50/90 border-t border-emerald-200 space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-bold text-emerald-900">📐 ตั้งค่าตารางหน้า 2:</span>
                    <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-emerald-200">
                      <span className="text-[11px] text-slate-600">ความสูงแถว:</span>
                      <input
                        type="number"
                        min={28}
                        max={90}
                        step={2}
                        value={docLayout.tableRowHeight}
                        onChange={(e) => setDocLayout((prev) => ({ ...prev, tableRowHeight: Number(e.target.value) }))}
                        className="w-14 rounded border border-slate-300 px-1 py-0.5 text-center font-bold"
                      />
                      <span className="text-[10px] text-slate-500">px</span>
                    </div>

                    <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-emerald-200">
                      <span className="text-[11px] text-slate-600">Padding:</span>
                      <select
                        value={docLayout.tablePadding}
                        onChange={(e) => setDocLayout((prev) => ({ ...prev, tablePadding: Number(e.target.value) }))}
                        className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs font-semibold"
                      >
                        <option value={4}>4px (แน่น)</option>
                        <option value={6}>6px (มาตรฐาน)</option>
                        <option value={8}>8px (โปร่ง)</option>
                        <option value={10}>10px (กว้าง)</option>
                        <option value={14}>14px (กว้างพิเศษ)</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-emerald-200">
                      <span className="text-[11px] text-slate-600">ฟอนต์ตาราง:</span>
                      <select
                        value={docLayout.tableFontSize}
                        onChange={(e) => setDocLayout((prev) => ({ ...prev, tableFontSize: Number(e.target.value) }))}
                        className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs font-semibold"
                      >
                        {[12, 13, 14, 15, 16, 18].map((sz) => (
                          <option key={sz} value={sz}>{sz} pt{sz === 14 ? ' (มาตรฐาน)' : ''}</option>
                        ))}
                      </select>
                    </div>

                    {/* Signer Placement Quick Switch */}
                    <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-emerald-300">
                      <span className="text-[11px] font-semibold text-emerald-900">ตำแหน่งผู้ลงนามในตาราง:</span>
                      <button
                        type="button"
                        onClick={() => handleSetSignerPlacement('row1')}
                        className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold cursor-pointer"
                        title="วางชื่อผู้ลงนามในแถวที่ 1 ของตาราง"
                      >
                        แถวที่ 1
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetSignerPlacement('bottom')}
                        className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-800 text-white text-[11px] font-semibold cursor-pointer"
                        title="วางชื่อและตำแหน่งในแถวที่ 5-6 แบบฟอร์มต้นฉบับ"
                      >
                        แถวล่าง (แบบต้นฉบับ)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetSignerPlacement('blank')}
                        className="px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-semibold cursor-pointer"
                        title="เว้นว่างช่องผู้ลงนามสำหรับเซ็นสด"
                      >
                        เว้นว่างเซ็นสด
                      </button>
                    </div>
                  </div>

                  {/* Add / Remove Table Rows */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleAddBackRow}
                      className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-semibold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>เพิ่มแถว</span>
                    </button>
                    {formData.backRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveBackRow(formData.backRows.length - 1)}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-semibold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>ลบแถว</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Individual Column Widths (6 Columns) */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-emerald-200/70">
                  <span className="text-[11px] font-bold text-emerald-950">ความกว้างแต่ละคอลัมน์ (%):</span>
                  {[
                    { idx: 0, label: '1.วันออก' },
                    { idx: 1, label: '2.วันสิ้นอายุ' },
                    { idx: 2, label: '3.เล่มที่' },
                    { idx: 3, label: '4.เลขที่ใบเสร็จ' },
                    { idx: 4, label: '5.วันใบเสร็จ' },
                    { idx: 5, label: '6.ผู้ลงนาม' },
                  ].map((col) => (
                    <div key={col.idx} className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-emerald-200">
                      <span className="text-[10px] text-slate-600 font-medium">{col.label}:</span>
                      <input
                        type="number"
                        step="0.5"
                        min="5"
                        max="50"
                        value={docLayout.tableColWidths[col.idx]}
                        onChange={(e) => {
                          const next = [...docLayout.tableColWidths];
                          next[col.idx] = Number(e.target.value);
                          setDocLayout((prev) => ({ ...prev, tableColWidths: next }));
                        }}
                        className="w-14 rounded border border-slate-300 px-1 py-0.5 text-center text-xs font-bold"
                      />
                      <span className="text-[10px] text-slate-400">%</span>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setDocLayout((prev) => ({ ...prev, tableColWidths: [16.2, 18.9, 8.1, 17.6, 14.9, 24.3] }))}
                    className="px-2 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-[11px] font-semibold cursor-pointer"
                  >
                    คืนค่าสัดส่วนมาตรฐาน
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Workspace Scrollable Body */}
        <main className="flex-1 w-full p-3 sm:p-5 overflow-y-auto">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start max-w-[1680px] mx-auto">
            
            {/* ================= LEFT COLUMN: Form Data Editor Panel ================= */}
            {activeTab === 'preview' && (
              <aside className="no-print xl:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 max-h-[80vh] overflow-y-auto space-y-4 sticky top-0">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">กรอก / แก้ไขข้อมูลในแบบฟอร์ม</h2>
                    <p className="text-[11px] text-slate-500">พิมพ์แก้ที่นี่ หรือคลิกพิมพ์บนกระดาษ A4 ด้านขวาก็ได้ (Live Sync)</p>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Live Sync
                  </span>
                </div>

                {/* Section 1: ข้อมูลเลขที่และผู้รับใบอนุญาต */}
                <div className="space-y-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                    <span className="w-1.5 h-3.5 rounded bg-indigo-600 inline-block"></span>
                    <span>1. ข้อมูลเลขที่และผู้รับใบอนุญาต (ด้านหน้า)</span>
                  </h3>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-0.5">เล่มที่</label>
                      <input
                        type="text"
                        value={formData.bookNo}
                        onChange={(e) => handleFieldChange('bookNo', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-0.5">เลขที่</label>
                      <input
                        type="text"
                        value={formData.docNo}
                        onChange={(e) => handleFieldChange('docNo', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-0.5">ปี พ.ศ.</label>
                      <input
                        type="text"
                        value={formData.docYear}
                        onChange={(e) => handleFieldChange('docYear', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-[11px] font-medium text-slate-700 mb-0.5">อนุญาตให้ (ชื่อ-สกุล / นิติบุคคล)</label>
                      <input
                        type="text"
                        value={formData.applicantName}
                        onChange={(e) => handleFieldChange('applicantName', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-0.5">สัญชาติ</label>
                      <input
                        type="text"
                        value={formData.nationality}
                        onChange={(e) => handleFieldChange('nationality', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-0.5">บ้านเลขที่</label>
                      <input
                        type="text"
                        value={formData.houseNo}
                        onChange={(e) => handleFieldChange('houseNo', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-0.5">หมู่ที่</label>
                      <input
                        type="text"
                        value={formData.moo}
                        onChange={(e) => handleFieldChange('moo', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-0.5">ตรอก/ซอย</label>
                      <input
                        type="text"
                        value={formData.soi}
                        onChange={(e) => handleFieldChange('soi', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-0.5">ถนน</label>
                      <input
                        type="text"
                        value={formData.road}
                        onChange={(e) => handleFieldChange('road', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-0.5">ตำบล/แขวง</label>
                      <input
                        type="text"
                        value={formData.subdistrict}
                        onChange={(e) => handleFieldChange('subdistrict', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-0.5">อำเภอ/เขต</label>
                      <input
                        type="text"
                        value={formData.district}
                        onChange={(e) => handleFieldChange('district', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-0.5">จังหวัด</label>
                      <input
                        type="text"
                        value={formData.province}
                        onChange={(e) => handleFieldChange('province', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-0.5">หมายเลขโทรศัพท์ (ผู้รับอนุญาต)</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => handleFieldChange('phone', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <hr className="border-slate-200" />

                {/* Section 2: ข้อมูลสถานประกอบกิจการ */}
                <div className="space-y-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                    <span className="w-1.5 h-3.5 rounded bg-indigo-600 inline-block"></span>
                    <span>2. ข้อมูลสถานประกอบกิจการ</span>
                  </h3>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                      ประเภทกิจการ (บรรทัดที่ 1 หลังคำว่า ประเภท)
                    </label>
                    <input
                      type="text"
                      value={formData.bizType}
                      onChange={(e) => handleFieldChange('bizType', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                      ประเภทกิจการ (บรรทัดที่ 2 ก่อนคำว่า โดยใช้ชื่อ)
                    </label>
                    <input
                      type="text"
                      value={formData.bizTypeLine2}
                      onChange={(e) => handleFieldChange('bizTypeLine2', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-0.5">ชื่อสถานที่ประกอบกิจการ</label>
                    <input
                      type="text"
                      value={formData.bizName}
                      onChange={(e) => handleFieldChange('bizName', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none font-semibold text-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-0.5">บ้านเลขที่</label>
                      <input
                        type="text"
                        value={formData.bizHouseNo}
                        onChange={(e) => handleFieldChange('bizHouseNo', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-0.5">หมู่ที่</label>
                      <input
                        type="text"
                        value={formData.bizMoo}
                        onChange={(e) => handleFieldChange('bizMoo', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-0.5">ตำบล</label>
                      <input
                        type="text"
                        value={formData.bizSubdistrict}
                        onChange={(e) => handleFieldChange('bizSubdistrict', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-0.5">อำเภอ</label>
                      <input
                        type="text"
                        value={formData.bizDistrict}
                        onChange={(e) => handleFieldChange('bizDistrict', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-0.5">จังหวัด</label>
                      <input
                        type="text"
                        value={formData.bizProvince}
                        onChange={(e) => handleFieldChange('bizProvince', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-0.5">โทรศัพท์สถานที่</label>
                      <input
                        type="text"
                        value={formData.bizPhone}
                        onChange={(e) => handleFieldChange('bizPhone', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-slate-200" />

                {/* Section 3: ค่าธรรมเนียม วันออก-สิ้นอายุ & ผู้ลงนาม */}
                <div className="space-y-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                    <span className="w-1.5 h-3.5 rounded bg-indigo-600 inline-block"></span>
                    <span>3. ค่าธรรมเนียม วันออก-สิ้นอายุ & ผู้ลงนาม</span>
                  </h3>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="block text-[11px] font-medium text-slate-700">ค่าธรรมเนียม (บาท)</label>
                        <button
                          type="button"
                          onClick={handleAutoThaiBaht}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                        >
                          แปลงบาทถ้วน
                        </button>
                      </div>
                      <input
                        type="text"
                        value={formData.feeAmount}
                        onChange={(e) => handleFieldChange('feeAmount', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-0.5">ตัวอักษรบาท</label>
                      <input
                        type="text"
                        value={formData.feeText}
                        onChange={(e) => handleFieldChange('feeText', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-0.5">ใบเสร็จรับเงินเล่มที่</label>
                      <input
                        type="text"
                        value={formData.receiptBook}
                        onChange={(e) => handleFieldChange('receiptBook', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-0.5">ใบเสร็จรับเงินเลขที่</label>
                      <input
                        type="text"
                        value={formData.receiptNo}
                        onChange={(e) => handleFieldChange('receiptNo', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-0.5">ใบเสร็จ ลงวันที่</label>
                      <input
                        type="text"
                        value={formData.receiptDay}
                        onChange={(e) => handleFieldChange('receiptDay', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-0.5">เดือน</label>
                      <input
                        type="text"
                        value={formData.receiptMonth}
                        onChange={(e) => handleFieldChange('receiptMonth', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-0.5">พ.ศ.</label>
                      <input
                        type="text"
                        value={formData.receiptYear}
                        onChange={(e) => handleFieldChange('receiptYear', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-0.5">เงื่อนไขเฉพาะ 3.1)</label>
                      <input
                        type="text"
                        value={formData.cond1}
                        onChange={(e) => handleFieldChange('cond1', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-0.5">เงื่อนไขเฉพาะ 3.2)</label>
                      <input
                        type="text"
                        value={formData.cond2}
                        onChange={(e) => handleFieldChange('cond2', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-0.5">ออกให้เมื่อวันที่</label>
                      <input
                        type="text"
                        value={formData.issueDay}
                        onChange={(e) => handleFieldChange('issueDay', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-0.5">เดือน</label>
                      <input
                        type="text"
                        value={formData.issueMonth}
                        onChange={(e) => handleFieldChange('issueMonth', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-0.5">พ.ศ.</label>
                      <input
                        type="text"
                        value={formData.issueYear}
                        onChange={(e) => handleFieldChange('issueYear', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-0.5">สิ้นอายุวันที่</label>
                      <input
                        type="text"
                        value={formData.expireDay}
                        onChange={(e) => handleFieldChange('expireDay', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-0.5">เดือน</label>
                      <input
                        type="text"
                        value={formData.expireMonth}
                        onChange={(e) => handleFieldChange('expireMonth', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-0.5">พ.ศ.</label>
                      <input
                        type="text"
                        value={formData.expireYear}
                        onChange={(e) => handleFieldChange('expireYear', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-medium text-slate-700">ผู้ลงนาม (เลือกด่วน):</label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              signerName: 'นายละดม  เชื้อช่วย',
                              signerTitle: 'นายกเทศมนตรีตำบลบางเป้า',
                            }));
                            setCanvasKey((k) => k + 1);
                            showToast('ตั้งค่าผู้ลงนามเป็น นายละดม เชื้อช่วย (นายกเทศมนตรีฯ ตามแม่แบบ) แล้ว');
                          }}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 cursor-pointer"
                        >
                          นายกฯ ละดม (ตามแม่แบบ)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              signerName: 'นายนิติธรรม ดำสุด',
                              signerTitle: 'รองนายกเทศมนตรี ปฏิบัติราชการแทน นายกเทศมนตรีตำบลบางเป้า',
                            }));
                            setCanvasKey((k) => k + 1);
                            showToast('ตั้งค่าผู้ลงนามเป็น นายนิติธรรม ดำสุด (รองนายกฯ ปฏิบัติราชการแทน) แล้ว');
                          }}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 cursor-pointer"
                        >
                          รองนายกฯ นิติธรรม
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-0.5">ชื่อผู้ลงนาม</label>
                        <input
                          type="text"
                          value={formData.signerName}
                          onChange={(e) => handleFieldChange('signerName', e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-0.5">ตำแหน่ง</label>
                        <input
                          type="text"
                          value={formData.signerTitle}
                          onChange={(e) => handleFieldChange('signerTitle', e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="border-slate-200" />

                {/* Section 4: ตารางรายการเสียค่าธรรมเนียม (ด้านหลัง) */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                      <span className="w-1.5 h-3.5 rounded bg-indigo-600 inline-block"></span>
                      <span>4. ตารางค่าธรรมเนียม (ด้านหลัง)</span>
                    </h3>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSetSignerPlacement('row1')}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-semibold cursor-pointer"
                      >
                        ผู้ลงนามแถว 1
                      </button>
                      <button
                        type="button"
                        onClick={handleAddBackRow}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer ml-1"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>เพิ่มแถว</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {formData.backRows.map((row, idx) => (
                      <div key={idx} className="p-2 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                          <span>แถวที่ {idx + 1}</span>
                          {formData.backRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveBackRow(idx)}
                              className="text-rose-500 hover:text-rose-700 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          <input
                            type="text"
                            placeholder="วันออก"
                            value={row.issueDate}
                            onChange={(e) => handleBackRowChange(idx, 'issueDate', e.target.value)}
                            className="rounded border border-slate-300 px-1.5 py-0.5 text-[11px]"
                          />
                          <input
                            type="text"
                            placeholder="วันสิ้นอายุ"
                            value={row.expireDate}
                            onChange={(e) => handleBackRowChange(idx, 'expireDate', e.target.value)}
                            className="rounded border border-slate-300 px-1.5 py-0.5 text-[11px]"
                          />
                          <input
                            type="text"
                            placeholder="ผู้ลงนาม/ตำแหน่ง"
                            value={row.signer}
                            onChange={(e) => handleBackRowChange(idx, 'signer', e.target.value)}
                            className="rounded border border-slate-300 px-1.5 py-0.5 text-[11px]"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          <input
                            type="text"
                            placeholder="เล่มที่"
                            value={row.book}
                            onChange={(e) => handleBackRowChange(idx, 'book', e.target.value)}
                            className="rounded border border-slate-300 px-1.5 py-0.5 text-[11px]"
                          />
                          <input
                            type="text"
                            placeholder="เลขที่"
                            value={row.no}
                            onChange={(e) => handleBackRowChange(idx, 'no', e.target.value)}
                            className="rounded border border-slate-300 px-1.5 py-0.5 text-[11px]"
                          />
                          <input
                            type="text"
                            placeholder="ลงวันที่"
                            value={row.date}
                            onChange={(e) => handleBackRowChange(idx, 'date', e.target.value)}
                            className="rounded border border-slate-300 px-1.5 py-0.5 text-[11px]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </aside>
            )}

            {/* ================= RIGHT COLUMN: Live A4 Print Canvas (Front & Back) ================= */}
            {(activeTab === 'preview' || activeTab === 'sideBySide') && (
              <section
                className={`${
                  activeTab === 'preview' ? 'xl:col-span-8' : 'xl:col-span-12'
                } w-full overflow-x-auto pb-8`}
              >
                <div
                  key={canvasKey}
                  className={`print-container flex ${
                    activeTab === 'sideBySide' ? 'flex-col 2xl:flex-row justify-center items-start gap-8' : 'flex-col items-center gap-8'
                  }`}
                >
                  
                  {/* ========== PAGE 1: FRONT (ด้านหน้า) ========== */}
                  {(printScope === 'both' || printScope === 'page1') && (
                    <div className="relative">
                      <div className="page-badge no-print mb-2 flex items-center justify-between text-xs font-semibold text-slate-600 px-1">
                        <span>หน้าที่ 1 : ด้านหน้า (คลิกแก้ข้อความได้ทุกจุดทั้งหัวเรื่อง คำนำหน้า และข้อมูล)</span>
                        <span className="text-slate-400">ขนาด A4 มาตรฐาน (210 × 297 มม.)</span>
                      </div>

                      <article
                        id="officialPageFront"
                        className={`a4-sheet ${docLayout.isFullEditMode ? 'word-edit-mode' : ''} underline-${docLayout.underlineStyle} ${!docLayout.dataBold ? 'data-weight-normal' : ''}`}
                        style={{
                          width: '21cm',
                          minHeight: '29.7cm',
                          height: '29.7cm',
                          backgroundColor: '#ffffff',
                          color: '#000000',
                          fontFamily: docLayout.fontFamily,
                          fontSize: `${docLayout.fontSize}pt`,
                          lineHeight: docLayout.lineHeight,
                          padding: `${docLayout.marginTop}cm ${docLayout.marginRight}cm ${docLayout.marginBottom}cm ${docLayout.marginLeft}cm`,
                          boxSizing: 'border-box',
                          position: 'relative',
                          overflow: 'hidden',
                          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15)',
                        }}
                      >
                        {/* Garuda Emblem (Independently Resizable & Movable) */}
                        <div
                          className="garuda"
                          style={{
                            textAlign: 'center',
                            marginTop: `${docLayout.garudaMarginTop}px`,
                            marginBottom: '5px',
                            transform: `translateX(${docLayout.garudaOffsetX}px)`,
                          }}
                        >
                          <img
                            src={GARUDA_BASE64}
                            alt="ตราครุฑ"
                            style={{ width: `${docLayout.garudaSize}px`, height: 'auto', display: 'inline-block' }}
                          />
                        </div>

                        {/* Document Title (Independently Editable & Sizable) */}
                        <div
                          className="title"
                          contentEditable={allowContentEditable || docLayout.isFullEditMode}
                          suppressContentEditableWarning
                          style={{
                            textAlign: 'center',
                            fontWeight: 'bold',
                            fontSize: `${docLayout.titleFontSize}pt`,
                            marginBottom: `${docLayout.titleMarginBottom}px`,
                            lineHeight: 1.2,
                          }}
                        >
                          <div>ใบอนุญาต</div>
                          <div>ประกอบกิจการที่เป็นอันตรายต่อสุขภาพ</div>
                        </div>

                        {/* Header Info: เล่มที่ / เลขที่ / ปี (Compact on left matching แม่แบบ.docx & Image 4) */}
                        <div className="official-row" style={{ minHeight: `${docLayout.rowMinHeight}mm`, marginBottom: '6px' }}>
                          <span contentEditable={allowContentEditable || docLayout.isFullEditMode} suppressContentEditableWarning>เล่มที่</span>
                          <span
                            className="fill-dot"
                            style={{ minWidth: '28px', padding: '0 4px' }}
                            contentEditable={allowContentEditable || docLayout.isFullEditMode}
                            suppressContentEditableWarning
                            onBlur={(e) => handleFieldChange('bookNo', e.currentTarget.textContent || '')}
                          >
                            {formData.bookNo}
                          </span>
                          <span contentEditable={allowContentEditable || docLayout.isFullEditMode} suppressContentEditableWarning>เลขที่</span>
                          <span
                            className="fill-dot"
                            style={{ minWidth: '52px', padding: '0 4px' }}
                            contentEditable={allowContentEditable || docLayout.isFullEditMode}
                            suppressContentEditableWarning
                            onBlur={(e) => handleFieldChange('docNo', e.currentTarget.textContent || '')}
                          >
                            {formData.docNo}
                          </span>
                          <span contentEditable={allowContentEditable || docLayout.isFullEditMode} suppressContentEditableWarning>/</span>
                          <span
                            className="fill-dot"
                            style={{ minWidth: '55px', padding: '0 4px' }}
                            contentEditable={allowContentEditable || docLayout.isFullEditMode}
                            suppressContentEditableWarning
                            onBlur={(e) => handleFieldChange('docYear', e.currentTarget.textContent || '')}
                          >
                            {formData.docYear}
                          </span>
                          <span>.</span>
                        </div>

                        {/* Section (1) Permitted Person Details */}
                        <div style={{ marginBottom: '4px' }}>
                          {/* Line 1 */}
                          <div className="official-row" style={{ minHeight: `${docLayout.rowMinHeight}mm` }}>
                            <span style={{ width: `${docLayout.indentSize}cm`, display: 'inline-block', flexShrink: 0 }}></span>
                            <span contentEditable={allowContentEditable || docLayout.isFullEditMode} suppressContentEditableWarning>(1) เจ้าพนักงานท้องถิ่นอนุญาตให้&nbsp;</span>
                            <span
                              className="fill-dot fill-grow"
                              style={{ minWidth: '150px' }}
                              contentEditable={allowContentEditable || docLayout.isFullEditMode}
                              suppressContentEditableWarning
                              onBlur={(e) => handleFieldChange('applicantName', e.currentTarget.textContent || '')}
                            >
                              {formData.applicantName}
                            </span>
                            <span contentEditable={allowContentEditable || docLayout.isFullEditMode} suppressContentEditableWarning>&nbsp;สัญชาติ&nbsp;</span>
                            <span
                              className="fill-dot"
                              style={{ minWidth: '110px' }}
                              contentEditable={allowContentEditable || docLayout.isFullEditMode}
                              suppressContentEditableWarning
                              onBlur={(e) => handleFieldChange('nationality', e.currentTarget.textContent || '')}
                            >
                              {formData.nationality}
                            </span>
                          </div>

                          {/* Line 2 */}
                          <div className="official-row" style={{ minHeight: `${docLayout.rowMinHeight}mm` }}>
                            <span contentEditable={allowContentEditable || docLayout.isFullEditMode} suppressContentEditableWarning>อยู่บ้านเลขที่&nbsp;</span>
                            <span
                              className="fill-dot"
                              style={{ minWidth: '85px' }}
                              contentEditable={allowContentEditable || docLayout.isFullEditMode}
                              suppressContentEditableWarning
                              onBlur={(e) => handleFieldChange('houseNo', e.currentTarget.textContent || '')}
                            >
                              {formData.houseNo}
                            </span>
                            <span contentEditable={allowContentEditable || docLayout.isFullEditMode} suppressContentEditableWarning>&nbsp;หมู่ที่&nbsp;</span>
                            <span
                              className="fill-dot"
                              style={{ minWidth: '55px' }}
                              contentEditable={allowContentEditable || docLayout.isFullEditMode}
                              suppressContentEditableWarning
                              onBlur={(e) => handleFieldChange('moo', e.currentTarget.textContent || '')}
                            >
                              {formData.moo}
                            </span>
                            <span contentEditable={allowContentEditable || docLayout.isFullEditMode} suppressContentEditableWarning>&nbsp;ตรอก/ซอย&nbsp;</span>
                            <span
                              className="fill-dot fill-grow"
                              style={{ minWidth: '75px' }}
                              contentEditable={allowContentEditable || docLayout.isFullEditMode}
                              suppressContentEditableWarning
                              onBlur={(e) => handleFieldChange('soi', e.currentTarget.textContent || '')}
                            >
                              {formData.soi}
                            </span>
                            <span contentEditable={allowContentEditable || docLayout.isFullEditMode} suppressContentEditableWarning>&nbsp;ถนน&nbsp;</span>
                            <span
                              className="fill-dot fill-grow"
                              style={{ minWidth: '90px' }}
                              contentEditable={allowContentEditable || docLayout.isFullEditMode}
                              suppressContentEditableWarning
                              onBlur={(e) => handleFieldChange('road', e.currentTarget.textContent || '')}
                            >
                              {formData.road}
                            </span>
                          </div>

                          {/* Line 3 */}
                          <div className="official-row" style={{ minHeight: `${docLayout.rowMinHeight}mm` }}>
                            <span contentEditable={allowContentEditable || docLayout.isFullEditMode} suppressContentEditableWarning>ตำบล/<del>แขวง</del>&nbsp;</span>
                            <span
                              className="fill-dot fill-grow"
                              style={{ minWidth: '90px' }}
                              contentEditable={allowContentEditable || docLayout.isFullEditMode}
                              suppressContentEditableWarning
                              onBlur={(e) => handleFieldChange('subdistrict', e.currentTarget.textContent || '')}
                            >
                              {formData.subdistrict}
                            </span>
                            <span contentEditable={allowContentEditable || docLayout.isFullEditMode} suppressContentEditableWarning>&nbsp;อำเภอ/<del>เขต</del>&nbsp;</span>
                            <span
                              className="fill-dot fill-grow"
                              style={{ minWidth: '90px' }}
                              contentEditable={allowContentEditable || docLayout.isFullEditMode}
                              suppressContentEditableWarning
                              onBlur={(e) => handleFieldChange('district', e.currentTarget.textContent || '')}
                            >
                              {formData.district}
                            </span>
                            <span contentEditable={allowContentEditable || docLayout.isFullEditMode} suppressContentEditableWarning>&nbsp;จังหวัด&nbsp;</span>
                            <span
                              className="fill-dot fill-grow"
                              style={{ minWidth: '90px' }}
                              contentEditable={allowContentEditable || docLayout.isFullEditMode}
                              suppressContentEditableWarning
                              onBlur={(e) => handleFieldChange('province', e.currentTarget.textContent || '')}
                            >
                              {formData.province}
                            </span>
                          </div>

                          {/* Line 4 */}
                          <div className="official-row" style={{ minHeight: `${docLayout.rowMinHeight}mm` }}>
                            <span contentEditable={allowContentEditable || docLayout.isFullEditMode} suppressContentEditableWarning>หมายเลขโทรศัพท์&nbsp;</span>
                            <span
                              className="fill-dot-left fill-grow"
                              style={{ paddingLeft: '8px' }}
                              contentEditable={allowContentEditable || docLayout.isFullEditMode}
                              suppressContentEditableWarning
                              onBlur={(e) => handleFieldChange('phone', e.currentTarget.textContent || '')}
                            >
                              {formData.phone}
                            </span>
                          </div>
                        </div>

                        {/* Establishment Section */}
                        <div style={{ marginBottom: '4px' }}>
                          {/* Line 1 */}
                          <div className="official-row" style={{ minHeight: `${docLayout.rowMinHeight}mm` }}>
                            <span style={{ width: `${docLayout.subIndentSize}cm`, display: 'inline-block', flexShrink: 0 }}></span>
                            <span contentEditable={allowContentEditable || docLayout.isFullEditMode} suppressContentEditableWarning>ชื่อสถานประกอบกิจการที่เป็นอันตรายต่อสุขภาพ ประเภท&nbsp;</span>
                            <span
                              className="fill-dot-left fill-grow"
                              style={{ paddingLeft: '6px' }}
                              contentEditable={allowContentEditable || docLayout.isFullEditMode}
                              suppressContentEditableWarning
                              onBlur={(e) => handleFieldChange('bizType', e.currentTarget.textContent || '')}
                            >
                              {formData.bizType}
                            </span>
                          </div>

                          {/* Line 2 */}
                          <div className="official-row" style={{ minHeight: `${docLayout.rowMinHeight}mm` }}>
                            <span
                              className="fill-dot-left fill-grow"
                              style={{ paddingLeft: '6px' }}
                              contentEditable={allowContentEditable || docLayout.isFullEditMode}
                              suppressContentEditableWarning
                              onBlur={(e) => handleFieldChange('bizTypeLine2', e.currentTarget.textContent || '')}
                            >
                              {formData.bizTypeLine2}
                            </span>
                            <span contentEditable={allowContentEditable || docLayout.isFullEditMode} suppressContentEditableWarning>&nbsp;โดยใช้ชื่อ</span>
                          </div>

                          {/* Line 3 */}
                          <div className="official-row" style={{ minHeight: `${docLayout.rowMinHeight}mm` }}>
                            <span contentEditable={allowContentEditable || docLayout.isFullEditMode} suppressContentEditableWarning>สถานที่&nbsp;</span>
                            <span
                              className="fill-dot fill-grow"
                              style={{ minWidth: '120px' }}
                              contentEditable={allowContentEditable || docLayout.isFullEditMode}
                              suppressContentEditableWarning
                              onBlur={(e) => handleFieldChange('bizName', e.currentTarget.textContent || '')}
                            >
                              {formData.bizName}
                            </span>
                            <span contentEditable={allowContentEditable || docLayout.isFullEditMode} suppressContentEditableWarning>&nbsp;ตั้งอยู่บ้านเลขที่&nbsp;</span>
                            <span
                              className="fill-dot"
                              style={{ minWidth: '65px' }}
                              contentEditable={allowContentEditable || docLayout.isFullEditMode}
                              suppressContentEditableWarning
                              onBlur={(e) => handleFieldChange('bizHouseNo', e.currentTarget.textContent || '')}
                            >
                              {formData.bizHouseNo}
                            </span>
                            <span contentEditable={allowContentEditable || docLayout.isFullEditMode} suppressContentEditableWarning>&nbsp;หมู่ที่&nbsp;</span>
                            <span
                              className="fill-dot"
                              style={{ minWidth: '45px' }}
                              contentEditable={allowContentEditable || docLayout.isFullEditMode}
                              suppressContentEditableWarning
                              onBlur={(e) => handleFieldChange('bizMoo', e.currentTarget.textContent || '')}
                            >
                              {formData.bizMoo}
                            </span>
                            <span contentEditable={allowContentEditable || docLayout.isFullEditMode} suppressContentEditableWarning>&nbsp;ตำบล&nbsp;</span>
                            <span
                              className="fill-dot fill-grow"
                              style={{ minWidth: '80px' }}
                              contentEditable={allowContentEditable || docLayout.isFullEditMode}
                              suppressContentEditableWarning
                              onBlur={(e) => handleFieldChange('bizSubdistrict', e.currentTarget.textContent || '')}
                            >
                              {formData.bizSubdistrict}
                            </span>
                          </div>

                          {/* Line 4 */}
                          <div className="official-row" style={{ minHeight: `${docLayout.rowMinHeight}mm` }}>
                            <span contentEditable={allowContentEditable || docLayout.isFullEditMode} suppressContentEditableWarning>อำเภอ&nbsp;</span>
                            <span
                              className="fill-dot fill-grow"
                              style={{ minWidth: '80px' }}
                              contentEditable={allowContentEditable || docLayout.isFullEditMode}
                              suppressContentEditableWarning
                              onBlur={(e) => handleFieldChange('bizDistrict', e.currentTarget.textContent || '')}
                            >
                              {formData.bizDistrict}
                            </span>
                            <span contentEditable={allowContentEditable || docLayout.isFullEditMode} suppressContentEditableWarning>&nbsp;จังหวัด&nbsp;</span>
                            <span
                              className="fill-dot fill-grow"
                              style={{ minWidth: '80px' }}
                              contentEditable={allowContentEditable || docLayout.isFullEditMode}
                              suppressContentEditableWarning
                              onBlur={(e) => handleFieldChange('bizProvince', e.currentTarget.textContent || '')}
                            >
                              {formData.bizProvince}
                            </span>
                            <span contentEditable={allowContentEditable || docLayout.isFullEditMode} suppressContentEditableWarning>&nbsp;หมายเลขโทรศัพท์&nbsp;</span>
                            <span
                              className="fill-dot-left fill-grow"
                              style={{ minWidth: '120px', paddingLeft: '8px' }}
                              contentEditable={allowContentEditable || docLayout.isFullEditMode}
                              suppressContentEditableWarning
                              onBlur={(e) => handleFieldChange('bizPhone', e.currentTarget.textContent || '')}
                            >
                              {formData.bizPhone}
                            </span>
                          </div>
                        </div>

                        {/* Fee & Receipt Section (Non-truncating minWidth fields) */}
                        <div style={{ marginBottom: '4px' }}>
                          {/* Line 1 */}
                          <div className="official-row" style={{ minHeight: `${docLayout.rowMinHeight}mm` }}>
                            <span style={{ width: `${docLayout.subIndentSize}cm`, display: 'inline-block', flexShrink: 0 }}></span>
                            <span contentEditable={allowContentEditable || docLayout.isFullEditMode} suppressContentEditableWarning>เสียค่าธรรมเนียมปีละ&nbsp;</span>
                            <span
                              className="fill-dot"
                              style={{ minWidth: '100px' }}
                              contentEditable={allowContentEditable || docLayout.isFullEditMode}
                              suppressContentEditableWarning
                              onBlur={(e) => handleFieldChange('feeAmount', e.currentTarget.textContent || '')}
                            >
                              {formData.feeAmount}
                            </span>
                            <span contentEditable={allowContentEditable || docLayout.isFullEditMode} suppressContentEditableWarning>&nbsp;บาท (&nbsp;</span>
                            <span
                              className="fill-dot fill-grow"
                              style={{ minWidth: '140px' }}
                              contentEditable={allowContentEditable || docLayout.isFullEditMode}
                              suppressContentEditableWarning
                              onBlur={(e) => handleFieldChange('feeText', e.currentTarget.textContent || '')}
                            >
                              {formData.feeText}
                            </span>
                            <span contentEditable={allowContentEditable || docLayout.isFullEditMode} suppressContentEditableWarning>&nbsp;)</span>
                          </div>

                          {/* Line 2: ตามใบเสร็จรับเงินเล่มที่ + เลขที่ (ขยายอัตโนมัติ พอดีขอบขวา ไม่ล้นหลังคำว่า 2569) */}
                          <div className="official-row" style={{ minHeight: `${docLayout.rowMinHeight}mm` }}>
                            <span contentEditable={allowContentEditable || docLayout.isFullEditMode} suppressContentEditableWarning>ตามใบเสร็จรับเงินเล่มที่&nbsp;</span>
                            <span
                              className="fill-dot"
                              style={{ minWidth: '45px', padding: '0 3px' }}
                              contentEditable={allowContentEditable || docLayout.isFullEditMode}
                              suppressContentEditableWarning
                              onBlur={(e) => handleFieldChange('receiptBook', e.currentTarget.textContent || '')}
                            >
                              {formData.receiptBook}
                            </span>
                            <span contentEditable={allowContentEditable || docLayout.isFullEditMode} suppressContentEditableWarning>&nbsp;เลขที่&nbsp;</span>
                            <span
                              className="fill-dot fill-grow"
                              style={{ minWidth: '65px', padding: '0 4px' }}
                              contentEditable={allowContentEditable || docLayout.isFullEditMode}
                              suppressContentEditableWarning
                              onBlur={(e) => handleFieldChange('receiptNo', e.currentTarget.textContent || '')}
                            >
                              {formData.receiptNo}
                            </span>
                            <span contentEditable={allowContentEditable || docLayout.isFullEditMode} suppressContentEditableWarning>&nbsp;ลงวันที่&nbsp;</span>
                            <span
                              className="fill-dot"
                              style={{ minWidth: '32px', padding: '0 3px' }}
                              contentEditable={allowContentEditable || docLayout.isFullEditMode}
                              suppressContentEditableWarning
                              onBlur={(e) => handleFieldChange('receiptDay', e.currentTarget.textContent || '')}
                            >
                              {formData.receiptDay}
                            </span>
                            <span contentEditable={allowContentEditable || docLayout.isFullEditMode} suppressContentEditableWarning>&nbsp;เดือน&nbsp;</span>
                            <span
                              className="fill-dot"
                              style={{ minWidth: '75px', padding: '0 4px' }}
                              contentEditable={allowContentEditable || docLayout.isFullEditMode}
                              suppressContentEditableWarning
                              onBlur={(e) => handleFieldChange('receiptMonth', e.currentTarget.textContent || '')}
                            >
                              {formData.receiptMonth}
                            </span>
                            <span contentEditable={allowContentEditable || docLayout.isFullEditMode} suppressContentEditableWarning>&nbsp;พ.ศ.&nbsp;</span>
                            <span
                              className="fill-dot fill-grow"
                              style={{ minWidth: '45px', padding: '0 3px' }}
                              contentEditable={allowContentEditable || docLayout.isFullEditMode}
                              suppressContentEditableWarning
                              onBlur={(e) => handleFieldChange('receiptYear', e.currentTarget.textContent || '')}
                            >
                              {formData.receiptYear}
                            </span>
                          </div>

                          {/* Line 3 */}
                          <div className="official-row" style={{ minHeight: `${docLayout.rowMinHeight}mm` }}>
                            <span contentEditable={allowContentEditable || docLayout.isFullEditMode} suppressContentEditableWarning>
                              ผู้รับใบอนุญาตต้องปฏิบัติตามหลักเกณฑ์ วิธีการและเงื่อนไขที่กำหนดในข้อกำหนดของท้องถิ่น
                            </span>
                          </div>
                        </div>

                        {/* Clause (2): Legal Notice */}
                        <div style={{ marginBottom: '4px' }}>
                          <div className="official-row" style={{ minHeight: `${docLayout.rowMinHeight}mm` }}>
                            <span style={{ width: `${docLayout.indentSize}cm`, display: 'inline-block', flexShrink: 0 }}></span>
                            <span contentEditable={allowContentEditable || docLayout.isFullEditMode} suppressContentEditableWarning>
                              (2) หากปรากฏในภายหลังว่าการประกอบกิจการที่ได้รับอนุญาตนี้เป็นการขัดต่อกฎหมายอื่นที่เกี่ยวข้อง
                            </span>
                          </div>
                          <div className="official-row" style={{ minHeight: `${docLayout.rowMinHeight}mm` }}>
                            <span contentEditable={allowContentEditable || docLayout.isFullEditMode} suppressContentEditableWarning>
                              โดยมิอาจแก้ไขได้ เจ้าพนักงานท้องถิ่นอาจพิจารณาให้เพิกถอนการอนุญาตนี้ได้
                            </span>
                          </div>
                        </div>

                        {/* Clause (3): Specific Conditions */}
                        <div style={{ marginBottom: '4px' }}>
                          <div className="official-row" style={{ minHeight: `${docLayout.rowMinHeight}mm` }}>
                            <span style={{ width: `${docLayout.indentSize}cm`, display: 'inline-block', flexShrink: 0 }}></span>
                            <span contentEditable={allowContentEditable || docLayout.isFullEditMode} suppressContentEditableWarning>
                              (3) ผู้รับใบอนุญาตต้องปฏิบัติตามเงื่อนไขเฉพาะดังต่อไปนี้อีกด้วย คือ
                            </span>
                          </div>
                          <div className="official-row" style={{ minHeight: `${docLayout.rowMinHeight}mm` }}>
                            <span style={{ width: '1.75cm', display: 'inline-block', flexShrink: 0 }}></span>
                            <span contentEditable={allowContentEditable || docLayout.isFullEditMode} suppressContentEditableWarning>3.1)&nbsp;</span>
                            <span
                              className="fill-dot-left fill-grow"
                              style={{ paddingLeft: '6px' }}
                              contentEditable={allowContentEditable || docLayout.isFullEditMode}
                              suppressContentEditableWarning
                              onBlur={(e) => handleFieldChange('cond1', e.currentTarget.textContent || '')}
                            >
                              {formData.cond1}
                            </span>
                          </div>
                          <div className="official-row" style={{ minHeight: `${docLayout.rowMinHeight}mm` }}>
                            <span style={{ width: '1.75cm', display: 'inline-block', flexShrink: 0 }}></span>
                            <span contentEditable={allowContentEditable || docLayout.isFullEditMode} suppressContentEditableWarning>3.2)&nbsp;</span>
                            <span
                              className="fill-dot-left fill-grow"
                              style={{ paddingLeft: '6px' }}
                              contentEditable={allowContentEditable || docLayout.isFullEditMode}
                              suppressContentEditableWarning
                              onBlur={(e) => handleFieldChange('cond2', e.currentTarget.textContent || '')}
                            >
                              {formData.cond2}
                            </span>
                          </div>
                        </div>

                        {/* Clauses (4) & (5): Issue Date & Expire Date (Aligned 3-column tab stops matching แม่แบบ.docx & Image 4) */}
                        <div style={{ marginBottom: '4px' }}>
                          <div className="official-row" style={{ minHeight: `${docLayout.rowMinHeight}mm` }}>
                            <span style={{ display: 'inline-flex', alignItems: 'baseline', width: '54%', flexShrink: 0 }}>
                              <span style={{ width: `${docLayout.indentSize}cm`, display: 'inline-block', flexShrink: 0 }}></span>
                              <span style={{ flexShrink: 0 }} contentEditable={allowContentEditable || docLayout.isFullEditMode} suppressContentEditableWarning>(4) ใบอนุญาตฉบับนี้ออกให้เมื่อวันที่&nbsp;</span>
                              <span
                                className="fill-dot fill-grow"
                                style={{ minWidth: '35px' }}
                                contentEditable={allowContentEditable || docLayout.isFullEditMode}
                                suppressContentEditableWarning
                                onBlur={(e) => handleFieldChange('issueDay', e.currentTarget.textContent || '')}
                              >
                                {formData.issueDay}
                              </span>
                            </span>
                            <span style={{ display: 'inline-flex', alignItems: 'baseline', width: '25%', flexShrink: 0 }}>
                              <span style={{ flexShrink: 0 }} contentEditable={allowContentEditable || docLayout.isFullEditMode} suppressContentEditableWarning>&nbsp;เดือน&nbsp;</span>
                              <span
                                className="fill-dot fill-grow"
                                style={{ minWidth: '65px' }}
                                contentEditable={allowContentEditable || docLayout.isFullEditMode}
                                suppressContentEditableWarning
                                onBlur={(e) => handleFieldChange('issueMonth', e.currentTarget.textContent || '')}
                              >
                                {formData.issueMonth}
                              </span>
                            </span>
                            <span style={{ display: 'inline-flex', alignItems: 'baseline', width: '21%', flexShrink: 0 }}>
                              <span style={{ flexShrink: 0 }} contentEditable={allowContentEditable || docLayout.isFullEditMode} suppressContentEditableWarning>&nbsp;พ.ศ.&nbsp;</span>
                              <span
                                className="fill-dot fill-grow"
                                style={{ minWidth: '45px' }}
                                contentEditable={allowContentEditable || docLayout.isFullEditMode}
                                suppressContentEditableWarning
                                onBlur={(e) => handleFieldChange('issueYear', e.currentTarget.textContent || '')}
                              >
                                {formData.issueYear}
                              </span>
                              <span>.</span>
                            </span>
                          </div>

                          <div className="official-row" style={{ minHeight: `${docLayout.rowMinHeight}mm` }}>
                            <span style={{ display: 'inline-flex', alignItems: 'baseline', width: '54%', flexShrink: 0 }}>
                              <span style={{ width: `${docLayout.indentSize}cm`, display: 'inline-block', flexShrink: 0 }}></span>
                              <span style={{ flexShrink: 0 }} contentEditable={allowContentEditable || docLayout.isFullEditMode} suppressContentEditableWarning>(5) ใบอนุญาตฉบับนี้สิ้นอายุวันที่&nbsp;</span>
                              <span
                                className="fill-dot fill-grow"
                                style={{ minWidth: '35px' }}
                                contentEditable={allowContentEditable || docLayout.isFullEditMode}
                                suppressContentEditableWarning
                                onBlur={(e) => handleFieldChange('expireDay', e.currentTarget.textContent || '')}
                              >
                                {formData.expireDay}
                              </span>
                            </span>
                            <span style={{ display: 'inline-flex', alignItems: 'baseline', width: '25%', flexShrink: 0 }}>
                              <span style={{ flexShrink: 0 }} contentEditable={allowContentEditable || docLayout.isFullEditMode} suppressContentEditableWarning>&nbsp;เดือน&nbsp;</span>
                              <span
                                className="fill-dot fill-grow"
                                style={{ minWidth: '65px' }}
                                contentEditable={allowContentEditable || docLayout.isFullEditMode}
                                suppressContentEditableWarning
                                onBlur={(e) => handleFieldChange('expireMonth', e.currentTarget.textContent || '')}
                              >
                                {formData.expireMonth}
                              </span>
                            </span>
                            <span style={{ display: 'inline-flex', alignItems: 'baseline', width: '21%', flexShrink: 0 }}>
                              <span style={{ flexShrink: 0 }} contentEditable={allowContentEditable || docLayout.isFullEditMode} suppressContentEditableWarning>&nbsp;พ.ศ.&nbsp;</span>
                              <span
                                className="fill-dot fill-grow"
                                style={{ minWidth: '45px' }}
                                contentEditable={allowContentEditable || docLayout.isFullEditMode}
                                suppressContentEditableWarning
                                onBlur={(e) => handleFieldChange('expireYear', e.currentTarget.textContent || '')}
                              >
                                {formData.expireYear}
                              </span>
                              <span>.</span>
                            </span>
                          </div>
                        </div>

                        {/* Signature Box (Aligned to match แม่แบบ.docx & Image 4) */}
                        <div
                          style={{
                            float: 'right',
                            width: `${docLayout.sigWidth}%`,
                            marginTop: `${docLayout.sigMarginTop}px`,
                            marginBottom: '6px',
                            lineHeight: 1.35,
                            fontSize: `${docLayout.sigFontSize}pt`,
                            transform: `translateX(${docLayout.sigOffsetX}px)`,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'baseline' }}>
                            <span style={{ width: '52px', flexShrink: 0 }} contentEditable={allowContentEditable || docLayout.isFullEditMode} suppressContentEditableWarning>
                              (ลงชื่อ)
                            </span>
                            <span className="fill-dot" style={{ display: 'inline-block', width: '195px' }}></span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '3px', fontWeight: docLayout.dataBold ? 'bold' : 'normal' }}>
                            <span style={{ width: '52px', flexShrink: 0 }}></span>
                            <span style={{ width: '195px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                              (
                              <span
                                className="fill-dot"
                                style={{ minWidth: '150px', padding: '0 8px' }}
                                contentEditable={allowContentEditable || docLayout.isFullEditMode}
                                suppressContentEditableWarning
                                onBlur={(e) => handleFieldChange('signerName', e.currentTarget.textContent || '')}
                              >
                                {formData.signerName.replace(/^\s*\(+|\)+\s*$/g, '')}
                              </span>
                              )
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: '2px' }}>
                            <span style={{ width: '52px', flexShrink: 0 }} contentEditable={allowContentEditable || docLayout.isFullEditMode} suppressContentEditableWarning>
                              ตำแหน่ง
                            </span>
                            <div
                              style={{ width: '195px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', whiteSpace: 'nowrap' }}
                              contentEditable={allowContentEditable || docLayout.isFullEditMode}
                              suppressContentEditableWarning
                              onBlur={(e) => handleFieldChange('signerTitle', e.currentTarget.innerText || '')}
                            >
                              {formatSignerPositionLines(formData.signerTitle).map((line, i) => (
                                <div key={i} style={{ whiteSpace: 'nowrap', fontSize: line.length > 26 ? `${Math.max(14, docLayout.sigFontSize - 1)}pt` : undefined }}>
                                  {line}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '2px' }}>
                            <span style={{ width: '52px', flexShrink: 0 }}></span>
                            <span
                              style={{ width: '195px', textAlign: 'center' }}
                              contentEditable={allowContentEditable || docLayout.isFullEditMode}
                              suppressContentEditableWarning
                            >
                              เจ้าพนักงานท้องถิ่น
                            </span>
                          </div>
                        </div>

                        {/* Warnings Footer (Matching แม่แบบ.docx & Image 4) */}
                        <div
                          contentEditable={allowContentEditable || docLayout.isFullEditMode}
                          suppressContentEditableWarning
                          style={{
                            clear: 'both',
                            fontSize: `${docLayout.warningFontSize}pt`,
                            marginTop: `${docLayout.warningMarginTop}px`,
                            lineHeight: 1.3,
                          }}
                        >
                          <div className="official-row" style={{ alignItems: 'baseline', marginBottom: '1px', minHeight: 'auto' }}>
                            <span>คำเตือน</span>
                            <span style={{ marginLeft: '0.8cm' }}>
                              (1) ผู้รับใบอนุญาตต้องแสดงใบอนุญาตนี้ไว้โดยเปิดเผยและเห็นได้ง่าย ณ สถานที่ประกอบกิจการ
                            </span>
                          </div>
                          <div style={{ lineHeight: 1.3 }}>
                            ตลอดเวลาที่ประกอบกิจการ หากฝ่าฝืนมีโทษปรับไม่เกิน ห้าร้อยบาท
                          </div>
                          <div style={{ marginTop: '2px', marginLeft: '1.65cm', lineHeight: 1.3 }}>
                            (2) หากประสงค์จะประกอบกิจการในปีต่อไปต้องยื่นคำขอต่ออายุใบอนุญาต<u><b>ก่อน</b></u>ใบอนุญาตสิ้นอายุ
                          </div>
                        </div>
                      </article>
                    </div>
                  )}

                  {/* ========== PAGE 2: BACK (ด้านหลัง) ========== */}
                  {(printScope === 'both' || printScope === 'page2') && (
                    <div className="relative">
                      <div className="page-badge no-print mb-2 flex items-center justify-between text-xs font-semibold text-slate-600 px-1">
                        <span>หน้าที่ 2 : ด้านหลัง (คลิกแก้หัวตารางและช่องข้อมูลได้ทุกช่อง)</span>
                        <span className="text-slate-400">ขนาด A4 มาตรฐาน (210 × 297 มม.)</span>
                      </div>

                      <article
                        id="officialPageBack"
                        className={`a4-sheet ${docLayout.isFullEditMode ? 'word-edit-mode' : ''} underline-${docLayout.underlineStyle} ${!docLayout.dataBold ? 'data-weight-normal' : ''}`}
                        style={{
                          width: '21cm',
                          minHeight: '29.7cm',
                          height: '29.7cm',
                          backgroundColor: '#ffffff',
                          color: '#000000',
                          fontFamily: docLayout.fontFamily,
                          fontSize: `${docLayout.fontSize}pt`,
                          lineHeight: docLayout.lineHeight,
                          padding: `${docLayout.marginTop}cm 1.25cm ${docLayout.marginBottom}cm 1.25cm`,
                          boxSizing: 'border-box',
                          position: 'relative',
                          overflow: 'hidden',
                          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15)',
                        }}
                      >
                        {/* Page 2 Title */}
                        <div
                          style={{
                            textAlign: 'center',
                            fontSize: `${docLayout.page2TitleFontSize}pt`,
                            fontWeight: 'bold',
                            marginTop: '20px',
                            marginBottom: '15px',
                            lineHeight: 1.2,
                          }}
                          contentEditable={docLayout.isFullEditMode || allowContentEditable}
                          suppressContentEditableWarning
                        >
                          รายการเสียค่าธรรมเนียมหนังสือรับรองการแจ้ง
                        </div>

                        {/* Back Fee Table */}
                        <table
                          style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            marginTop: '20px',
                            fontSize: `${docLayout.tableFontSize}pt`,
                            color: '#000000',
                          }}
                        >
                          <thead>
                            <tr>
                              <th
                                rowSpan={2}
                                contentEditable={allowContentEditable || docLayout.isFullEditMode}
                                suppressContentEditableWarning
                                style={{
                                  border: '1px solid #000',
                                  padding: `${docLayout.tablePadding}px`,
                                  width: `${docLayout.tableColWidths[0]}%`,
                                  fontWeight: 'normal',
                                  textAlign: 'center',
                                  whiteSpace: 'nowrap',
                                  lineHeight: 1.3,
                                }}
                              >
                                วัน/เดือน/ปี<br />ที่ออกใบอนุญาต
                              </th>
                              <th
                                rowSpan={2}
                                contentEditable={allowContentEditable || docLayout.isFullEditMode}
                                suppressContentEditableWarning
                                style={{
                                  border: '1px solid #000',
                                  padding: `${docLayout.tablePadding}px`,
                                  width: `${docLayout.tableColWidths[1]}%`,
                                  fontWeight: 'normal',
                                  textAlign: 'center',
                                  whiteSpace: 'nowrap',
                                  lineHeight: 1.3,
                                }}
                              >
                                วัน/เดือน/ปี<br />ที่สิ้นอายุใบอนุญาต
                              </th>
                              <th
                                colSpan={3}
                                contentEditable={allowContentEditable || docLayout.isFullEditMode}
                                suppressContentEditableWarning
                                style={{
                                  border: '1px solid #000',
                                  padding: `${docLayout.tablePadding}px`,
                                  width: `${docLayout.tableColWidths[2] + docLayout.tableColWidths[3] + docLayout.tableColWidths[4]}%`,
                                  fontWeight: 'normal',
                                  textAlign: 'center',
                                  lineHeight: 1.3,
                                }}
                              >
                                ใบเสร็จรับเงิน
                              </th>
                              <th
                                rowSpan={2}
                                contentEditable={allowContentEditable || docLayout.isFullEditMode}
                                suppressContentEditableWarning
                                style={{
                                  border: '1px solid #000',
                                  padding: `${docLayout.tablePadding}px`,
                                  width: `${docLayout.tableColWidths[5]}%`,
                                  fontWeight: 'normal',
                                  textAlign: 'center',
                                  whiteSpace: 'nowrap',
                                  lineHeight: 1.3,
                                }}
                              >
                                (ลงชื่อ)<br />เจ้าพนักงานท้องถิ่น
                              </th>
                            </tr>
                            <tr>
                              <th
                                contentEditable={allowContentEditable || docLayout.isFullEditMode}
                                suppressContentEditableWarning
                                style={{
                                  border: '1px solid #000',
                                  padding: `${docLayout.tablePadding}px`,
                                  width: `${docLayout.tableColWidths[2]}%`,
                                  fontWeight: 'normal',
                                  textAlign: 'center',
                                }}
                              >
                                เล่มที่
                              </th>
                              <th
                                contentEditable={allowContentEditable || docLayout.isFullEditMode}
                                suppressContentEditableWarning
                                style={{
                                  border: '1px solid #000',
                                  padding: `${docLayout.tablePadding}px`,
                                  width: `${docLayout.tableColWidths[3]}%`,
                                  fontWeight: 'normal',
                                  textAlign: 'center',
                                }}
                              >
                                เลขที่
                              </th>
                              <th
                                contentEditable={allowContentEditable || docLayout.isFullEditMode}
                                suppressContentEditableWarning
                                style={{
                                  border: '1px solid #000',
                                  padding: `${docLayout.tablePadding}px`,
                                  width: `${docLayout.tableColWidths[4]}%`,
                                  fontWeight: 'normal',
                                  textAlign: 'center',
                                }}
                              >
                                วัน/เดือน/ปี
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const cleanSigner = (formData.signerName || '').replace(/^\s*\(+|\)+\s*$/g, '').trim();
                              const posLines = formatSignerPositionLines(formData.signerTitle);

                              return formData.backRows.map((row, idx) => {
                                const bookVal = idx === 0 ? (row.book || '-') : (row.book && row.book !== '-' ? row.book : '');
                                return (
                                  <tr key={idx} style={{ height: `${docLayout.tableRowHeight}px` }}>
                                    <td
                                      contentEditable={allowContentEditable || docLayout.isFullEditMode}
                                      suppressContentEditableWarning
                                      onBlur={(e) => handleBackRowChange(idx, 'issueDate', e.currentTarget.textContent || '')}
                                      style={{ border: '1px solid #000', padding: `${docLayout.tablePadding}px`, textAlign: 'center', fontWeight: docLayout.dataBold ? 'bold' : 'normal' }}
                                    >
                                      {row.issueDate}
                                    </td>
                                    <td
                                      contentEditable={allowContentEditable || docLayout.isFullEditMode}
                                      suppressContentEditableWarning
                                      onBlur={(e) => handleBackRowChange(idx, 'expireDate', e.currentTarget.textContent || '')}
                                      style={{ border: '1px solid #000', padding: `${docLayout.tablePadding}px`, textAlign: 'center', fontWeight: docLayout.dataBold ? 'bold' : 'normal' }}
                                    >
                                      {row.expireDate}
                                    </td>
                                    <td
                                      contentEditable={allowContentEditable || docLayout.isFullEditMode}
                                      suppressContentEditableWarning
                                      onBlur={(e) => handleBackRowChange(idx, 'book', e.currentTarget.textContent || '')}
                                      style={{ border: '1px solid #000', padding: `${docLayout.tablePadding}px`, textAlign: 'center', fontWeight: docLayout.dataBold ? 'bold' : 'normal' }}
                                    >
                                      {bookVal}
                                    </td>
                                    <td
                                      contentEditable={allowContentEditable || docLayout.isFullEditMode}
                                      suppressContentEditableWarning
                                      onBlur={(e) => handleBackRowChange(idx, 'no', e.currentTarget.textContent || '')}
                                      style={{ border: '1px solid #000', padding: `${docLayout.tablePadding}px`, textAlign: 'center', fontWeight: docLayout.dataBold ? 'bold' : 'normal' }}
                                    >
                                      {row.no}
                                    </td>
                                    <td
                                      contentEditable={allowContentEditable || docLayout.isFullEditMode}
                                      suppressContentEditableWarning
                                      onBlur={(e) => handleBackRowChange(idx, 'date', e.currentTarget.textContent || '')}
                                      style={{ border: '1px solid #000', padding: `${docLayout.tablePadding}px`, textAlign: 'center', fontWeight: docLayout.dataBold ? 'bold' : 'normal' }}
                                    >
                                      {row.date}
                                    </td>
                                    {idx === 0 ? (
                                      <td
                                        rowSpan={formData.backRows.length}
                                        contentEditable={allowContentEditable || docLayout.isFullEditMode}
                                        suppressContentEditableWarning
                                        style={{
                                          border: '1px solid #000',
                                          padding: `${docLayout.tablePadding}px 2px`,
                                          textAlign: 'center',
                                          verticalAlign: signerPlacement === 'row1' ? 'top' : 'bottom',
                                          paddingTop: signerPlacement === 'row1' ? '10px' : `${docLayout.tablePadding}px`,
                                          paddingBottom: signerPlacement === 'bottom' ? '10px' : `${docLayout.tablePadding}px`,
                                          lineHeight: 1.35,
                                          fontWeight: docLayout.dataBold ? 'bold' : 'normal',
                                        }}
                                      >
                                        {signerPlacement !== 'blank' && (
                                          <>
                                            <div style={{ whiteSpace: 'nowrap' }}>({cleanSigner})</div>
                                            {posLines.map((line, lIdx) => (
                                              <div
                                                key={lIdx}
                                                style={{
                                                  whiteSpace: 'nowrap',
                                                  fontSize: line.length > 24 ? `${Math.max(13.5, docLayout.tableFontSize - 1.5)}pt` : undefined,
                                                }}
                                              >
                                                {line}
                                              </div>
                                            ))}
                                          </>
                                        )}
                                      </td>
                                    ) : null}
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </article>
                    </div>
                  )}

                </div>
              </section>
            )}

            {/* ================= CODE SECTION: Standalone HTML View Panel ================= */}
            {activeTab === 'code' && (
              <section className="no-print xl:col-span-12 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">โค้ด HTML + CSS สำหรับนำไปใช้ในระบบเว็บหรือ Google Apps Script</h2>
                    <p className="text-xs text-slate-500">
                      รองรับการสั่งพิมพ์สองหน้าอัตโนมัติด้วย <code>@media print</code> และ <code>page-break-after: always</code> พร้อมค่าจัดหน้าปัจจุบัน
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={codeTemplateMode}
                      onChange={(e) => setCodeTemplateMode(e.target.value as 'current' | 'handlebars')}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none"
                    >
                      <option value="current">โค้ดพร้อมข้อมูลปัจจุบัน</option>
                      <option value="handlebars">โค้ดตัวแปร Template (&#123;&#123;variable&#125;&#125;) สำหรับ Backend</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>คัดลอกโค้ด HTML</span>
                    </button>
                  </div>
                </div>
                <div className="p-4 bg-slate-950 text-slate-100 overflow-x-auto max-h-[75vh]">
                  <pre className="text-xs font-mono leading-relaxed whitespace-pre">
                    {generateStandAloneHtml(formData, codeTemplateMode)}
                  </pre>
                </div>
              </section>
            )}

          </div>
        </main>
      </div>
    </div>
  );
};
