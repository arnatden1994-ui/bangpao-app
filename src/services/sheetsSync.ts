import {
  Establishment,
  GoogleSheetsConfig,
  HazardousBusiness,
  InspectionRecord,
  LtcPatient,
  MedicalEquipment,
  EquipmentLoan,
  NhsoProject,
  PublicPetition,
  LicenseRecord,
} from '../types/index.ts';
import {
  INITIAL_ESTABLISHMENTS,
  INITIAL_INSPECTIONS,
  INITIAL_HAZARDOUS_BUSINESSES,
  INITIAL_PETITIONS,
  INITIAL_NHSO_PROJECTS,
  INITIAL_LTC_PATIENTS,
  INITIAL_MEDICAL_EQUIPMENT,
  INITIAL_EQUIPMENT_LOANS,
  INITIAL_LICENSE_RECORDS,
} from '../data/mockData.ts';

const STORAGE_KEYS = {
  ESTABLISHMENTS: 'hygiene_establishments_v1',
  INSPECTIONS: 'hygiene_inspections_v1',
  HAZARDOUS: 'ph_hazardous_businesses_v1',
  PETITIONS: 'ph_petitions_v2',
  NHSO: 'ph_nhso_projects_v2',
  LTC: 'ph_ltc_patients_v2',
  EQUIPMENT: 'ph_medical_equipment_v2',
  LOANS: 'ph_equipment_loans_v2',
  LICENSES: 'ph_license_records_v1',
  CONFIG: 'hygiene_sheets_config_v1',
};

// A Web App URL is deliberately not hard-coded.  Each deployment has its own
// permission boundary and must belong to the spreadsheet used by this system.
export const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbylXgoGf29KGky_izyoeq3Gx3nyJwFyPJM7u5ZSRyXGAXNndM1PCu6gy4SMhCssCJY/exec';
export const DEFAULT_SHEET_ID = '1uyFaL2xxUouBM5CV-_WdWlNHWHZWQQ9XhrVldvV3DEY';

export function getStoredConfig(): GoogleSheetsConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (raw) {
      const cfg = JSON.parse(raw);
      let changed = false;
      // Auto upgrade if config was using old default URL
      if (!cfg.appsScriptUrl || cfg.appsScriptUrl.includes('AKfycbw8') || cfg.appsScriptUrl.includes('AKfycbylNXKt')) {
        cfg.appsScriptUrl = DEFAULT_GAS_URL;
        cfg.sheetId = DEFAULT_SHEET_ID;
        changed = true;
      }
      // Auto enable autoSync by default
      if (cfg.autoSync === undefined || cfg.autoSync === false) {
        cfg.autoSync = true;
        changed = true;
      }
      if (changed) {
        localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(cfg));
      }
      return cfg;
    }
  } catch (e) {
    console.error('Error loading config:', e);
  }

  return {
    appsScriptUrl: DEFAULT_GAS_URL,
    sheetId: DEFAULT_SHEET_ID,
    autoSync: true,
    lastSyncTime: null,
    syncStatus: 'idle',
    syncMessage: 'พร้อมเชื่อมต่อ Google Sheets',
  };
}

export function saveStoredConfig(config: GoogleSheetsConfig) {
  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
}

// Establishments
export function getStoredEstablishments(): Establishment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ESTABLISHMENTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error(e);
  }
  localStorage.setItem(STORAGE_KEYS.ESTABLISHMENTS, JSON.stringify(INITIAL_ESTABLISHMENTS));
  return INITIAL_ESTABLISHMENTS;
}

export function saveStoredEstablishments(items: Establishment[]) {
  localStorage.setItem(STORAGE_KEYS.ESTABLISHMENTS, JSON.stringify(items));
}

// Inspections
export function getStoredInspections(): InspectionRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INSPECTIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error(e);
  }
  localStorage.setItem(STORAGE_KEYS.INSPECTIONS, JSON.stringify(INITIAL_INSPECTIONS));
  return INITIAL_INSPECTIONS;
}

export function saveStoredInspections(items: InspectionRecord[]) {
  localStorage.setItem(STORAGE_KEYS.INSPECTIONS, JSON.stringify(items));
}

// Hazardous Businesses
export function getStoredHazardous(): HazardousBusiness[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HAZARDOUS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error(e);
  }
  localStorage.setItem(STORAGE_KEYS.HAZARDOUS, JSON.stringify(INITIAL_HAZARDOUS_BUSINESSES));
  return INITIAL_HAZARDOUS_BUSINESSES;
}

export function saveStoredHazardous(items: HazardousBusiness[]) {
  localStorage.setItem(STORAGE_KEYS.HAZARDOUS, JSON.stringify(items));
}

// Petitions
export function getStoredPetitions(): PublicPetition[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PETITIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error(e);
  }
  localStorage.setItem(STORAGE_KEYS.PETITIONS, JSON.stringify(INITIAL_PETITIONS));
  return INITIAL_PETITIONS;
}

export function saveStoredPetitions(items: PublicPetition[]) {
  localStorage.setItem(STORAGE_KEYS.PETITIONS, JSON.stringify(items));
}

// NHSO
export function getStoredNhso(): NhsoProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NHSO);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error(e);
  }
  localStorage.setItem(STORAGE_KEYS.NHSO, JSON.stringify(INITIAL_NHSO_PROJECTS));
  return INITIAL_NHSO_PROJECTS;
}

export function saveStoredNhso(items: NhsoProject[]) {
  localStorage.setItem(STORAGE_KEYS.NHSO, JSON.stringify(items));
}

// LTC
export function getStoredLtc(): LtcPatient[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LTC);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure standard patients like LTC-6900 (นายเอกชัย สุขเกษม / นายเอ) are always available
        const existingIds = new Set(parsed.map((p: LtcPatient) => p.id));
        const missingDefaults = INITIAL_LTC_PATIENTS.filter((p) => !existingIds.has(p.id));
        const combined = missingDefaults.length > 0 ? [...missingDefaults, ...parsed] : parsed;
        const normalized = combined.map((p: LtcPatient) => {
          const matched = INITIAL_LTC_PATIENTS.find((init) => init.id === p.id);
          return {
            ...p,
            createdAt: p.createdAt || matched?.createdAt || p.lastVisitDate || '2026-10-01',
          };
        });
        localStorage.setItem(STORAGE_KEYS.LTC, JSON.stringify(normalized));
        return normalized;
      }
    }
  } catch (e) {
    console.error(e);
  }
  localStorage.setItem(STORAGE_KEYS.LTC, JSON.stringify(INITIAL_LTC_PATIENTS));
  return INITIAL_LTC_PATIENTS;
}

export function saveStoredLtc(items: LtcPatient[]) {
  localStorage.setItem(STORAGE_KEYS.LTC, JSON.stringify(items));
}

// Medical Equipment
export function getStoredEquipment(): MedicalEquipment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EQUIPMENT);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error(e);
  }
  localStorage.setItem(STORAGE_KEYS.EQUIPMENT, JSON.stringify(INITIAL_MEDICAL_EQUIPMENT));
  return INITIAL_MEDICAL_EQUIPMENT;
}

export function saveStoredEquipment(items: MedicalEquipment[]) {
  localStorage.setItem(STORAGE_KEYS.EQUIPMENT, JSON.stringify(items));
}

// Equipment Loans
export function getStoredLoans(): EquipmentLoan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOANS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error(e);
  }
  localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(INITIAL_EQUIPMENT_LOANS));
  return INITIAL_EQUIPMENT_LOANS;
}

export function saveStoredLoans(items: EquipmentLoan[]) {
  localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(items));
}

// License Records
export function getStoredLicenses(): LicenseRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LICENSES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error(e);
  }
  localStorage.setItem(STORAGE_KEYS.LICENSES, JSON.stringify(INITIAL_LICENSE_RECORDS));
  return INITIAL_LICENSE_RECORDS;
}

export function saveStoredLicenses(items: LicenseRecord[]) {
  localStorage.setItem(STORAGE_KEYS.LICENSES, JSON.stringify(items));
}

// Test connection to Google Apps Script
export async function testAppsScriptConnection(url: string): Promise<{
  success: boolean;
  message: string;
  details?: unknown;
}> {
  try {
    const response = await fetch('/api/test-gas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    const text = await response.text();
    let result: any;
    try {
      result = JSON.parse(text);
    } catch {
      return {
        success: false,
        message: `ระบบตอบกลับไม่ใช่ JSON (HTTP ${response.status}): ${text.slice(0, 120)}`,
      };
    }

    if (result.success) {
      return {
        success: true,
        message: `เชื่อมต่อสำเร็จ (${result.responseTimeMs}ms) - ตรวจพบ Web App ปลายทาง`,
        details: result,
      };
    } else if (result.isPermissionDenied) {
      return {
        success: false,
        message:
          'ตรวจพบสิทธิ์การเข้าถึงถูกจำกัด (403 หรือติดหน้าเข้าสู่ระบบ Google): กรุณาตรวจสอบการตั้งค่า Deploy ของ Google Apps Script ให้เป็น "Who has access: Anyone"',
        details: result,
      };
    } else {
      return {
        success: false,
        message: result.message || 'ไม่สามารถติดต่อ Google Apps Script ได้ (HTTP ' + result.status + ')',
        details: result,
      };
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: 'เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + errorMsg,
    };
  }
}

// Sync full ERP data to Google Apps Script
export async function syncToGoogleSheets(
  url: string,
  establishments: Establishment[],
  inspections: InspectionRecord[],
  hazardous?: HazardousBusiness[],
  petitions?: PublicPetition[],
  loans?: EquipmentLoan[],
  licenses?: LicenseRecord[]
): Promise<{ success: boolean; message: string; data?: unknown }> {
  try {
    const payload = {
      action: 'syncData',
      timestamp: new Date().toISOString(),
      establishments,
      inspections,
      hazardous,
      petitions,
      loans,
      licenses,
    };

    const response = await fetch('/api/gas-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scriptUrl: url,
        method: 'POST',
        payload,
      }),
    });

    const text = await response.text();
    let result: any;
    try {
      result = JSON.parse(text);
    } catch {
      return {
        success: false,
        message: `ระบบ Proxy ตอบกลับไม่ใช่ JSON (HTTP ${response.status}): ${text.slice(0, 120)}`,
      };
    }

    if (response.ok && result.ok !== false) {
      return {
        success: true,
        message: 'ส่งข้อมูลสาธารณสุขขึ้น Google Sheets สำเร็จเรียบร้อย',
        data: result,
      };
    } else {
      return {
        success: false,
        message: 'ส่งข้อมูลไม่สำเร็จ: ' + (result?.data?.message || result?.message || response.statusText),
        data: result,
      };
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: 'ข้อผิดพลาด: ' + errorMsg,
    };
  }
}

// Fetch data from Google Apps Script
export async function fetchFromGoogleSheets(url: string): Promise<{
  success: boolean;
  message: string;
  establishments?: Establishment[];
  inspections?: InspectionRecord[];
  licenses?: LicenseRecord[];
  petitions?: PublicPetition[];
}> {
  try {
    const response = await fetch('/api/gas-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scriptUrl: url,
        method: 'GET',
        queryParams: { action: 'getInspectionSystemData' },
      }),
    });

    const text = await response.text();
    let result: any;
    try {
      result = JSON.parse(text);
    } catch {
      return {
        success: false,
        message: `ระบบ Proxy ตอบกลับไม่ใช่ JSON (HTTP ${response.status}): ${text.slice(0, 120)}`,
      };
    }

    if (response.ok && result.data) {
      const data = result.data.data || result.data;
      const items: Establishment[] = Array.isArray(data.establishments) ? data.establishments : [];
      if (items.length > 0) {
        return {
          success: true,
          message: `ดึงข้อมูลสถานประกอบการสำเร็จ ${items.length} รายการ`,
          establishments: items,
          inspections: Array.isArray(data.inspections) ? data.inspections : [],
          licenses: Array.isArray(data.licenses) ? data.licenses : [],
          petitions: Array.isArray(data.petitions) ? data.petitions : [],
        };
      }
    }

    return {
      success: false,
      message: 'ปลายทางยังไม่มีข้อมูลรูปแบบตาราง หรือส่งกลับมาเป็นหน้าเว็บ HTML',
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: 'ไม่สามารถดึงข้อมูลได้: ' + errorMsg,
    };
  }
}

// Export establishments to CSV
export function exportToCSV(items: Establishment[]): void {
  const headers = [
    'รหัสสถานประกอบการ',
    'ชื่อสถานประกอบการ',
    'ประเภท',
    'เจ้าของ/ผู้จัดการ',
    'เบอร์โทรศัพท์',
    'ที่อยู่',
    'ตำบล/แขวง',
    'อำเภอ/เขต',
    'จังหวัด',
    'สถานะ',
    'คะแนนล่าสุด',
    'ระดับการประเมิน',
    'วันที่ตรวจล่าสุด',
    'กำหนดตรวจครั้งถัดไป',
    'เลขที่ใบรับรอง',
    'ผู้ตรวจประเมิน',
    'หมายเหตุ',
  ];

  const rows = items.map((item) => [
    `"${item.code || ''}"`,
    `"${item.name.replace(/"/g, '""')}"`,
    `"${item.type}"`,
    `"${item.ownerName.replace(/"/g, '""')}"`,
    `"${item.phone}"`,
    `"${item.address.replace(/"/g, '""')}"`,
    `"${item.subdistrict}"`,
    `"${item.district}"`,
    `"${item.province}"`,
    `"${item.status}"`,
    item.latestScore || 0,
    `"${item.latestRating}"`,
    `"${item.latestInspectionDate || ''}"`,
    `"${item.nextInspectionDate || ''}"`,
    `"${item.certificateNo || ''}"`,
    `"${item.inspectorName || ''}"`,
    `"${(item.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `public_health_data_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Pre-built Google Apps Script Template code for multi-sheet Public Health ERP
const LEGACY_GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * Google Apps Script สำหรับระบบสารสนเทศกองสาธารณสุขและสิ่งแวดล้อม
 * คัดลอกโค้ดนี้ไปวางใน Extensions (ส่วนขยาย) > Apps Script ใน Google Sheets
 */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'getEstablishments';
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === 'getEstablishments') {
    var sheet = getOrCreateSheet(ss, 'Establishments');
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return jsonResponse({ status: 'success', data: [] });
    
    var headers = data[0];
    var list = [];
    for (var i = 1; i < data.length; i++) {
      var row = {};
      for (var j = 0; j < headers.length; j++) {
        row[headers[j]] = data[i][j];
      }
      list.push(row);
    }
    return jsonResponse({ status: 'success', count: list.length, data: list });
  }
  
  return jsonResponse({ status: 'ok', message: 'Public Health ERP API Ready' });
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action || 'syncData';
    
    if (action === 'syncData') {
      // 1. Establishments
      if (body.establishments) {
        var estSheet = getOrCreateSheet(ss, 'Establishments');
        var headers = ['code', 'name', 'type', 'ownerName', 'phone', 'address', 'subdistrict', 'district', 'status', 'latestScore', 'latestRating', 'certificateNo'];
        estSheet.clear();
        estSheet.appendRow(headers);
        body.establishments.forEach(function(item) {
          estSheet.appendRow([item.code, item.name, item.type, item.ownerName, item.phone, item.address, item.subdistrict, item.district, item.status, item.latestScore, item.latestRating, item.certificateNo]);
        });
      }
      
      // 2. Hazardous Businesses
      if (body.hazardous) {
        var hazSheet = getOrCreateSheet(ss, 'Hazardous');
        var hazHeaders = ['code', 'name', 'category', 'ownerName', 'phone', 'riskLevel', 'licenseStatus', 'licenseNumber', 'latestScore'];
        hazSheet.clear();
        hazSheet.appendRow(hazHeaders);
        body.hazardous.forEach(function(item) {
          hazSheet.appendRow([item.code, item.name, item.category, item.ownerName, item.phone, item.riskLevel, item.licenseStatus, item.licenseNumber, item.latestScore]);
        });
      }

      // 3. Petitions
      if (body.petitions) {
        var petSheet = getOrCreateSheet(ss, 'Petitions');
        var petHeaders = ['trackingCode', 'title', 'category', 'citizenName', 'phone', 'address', 'status', 'submissionDate'];
        petSheet.clear();
        petSheet.appendRow(petHeaders);
        body.petitions.forEach(function(item) {
          petSheet.appendRow([item.trackingCode, item.title, item.category, item.citizenName, item.phone, item.address, item.status, item.submissionDate]);
        });
      }
      
      return jsonResponse({ success: true, message: 'All Health ERP modules synced successfully' });
    }
    
    return jsonResponse({ success: false, message: 'Unknown action' });
  } catch(err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function getOrCreateSheet(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  return sheet;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

// Script for the supplied "สาสุข" workbook.  It reads the actual workbook
// tabs and updates rows by a stable business name / licence number; it never
// clears a worksheet.
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/** Code.gs — ระบบตรวจกิจการ */
var SPREADSHEET_ID = '1uyFaL2xxUouBM5CV-_WdWlNHWHZWQQ9XhrVldvV3DEY';
var SHEETS = {
  general: 'GeneralInfo',
  evaluation: 'EvaluationAnswers',
  licence: 'LicenseData',
  requests: 'Requests_Data'
};

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'getInspectionSystemData';
  if (action === 'getInspectionSystemData') {
    return json({ success: true, data: getInspectionSystemData() });
  }
  return json({ success: true, message: 'Inspection system API is ready' });
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents || '{}');
    if (body.action !== 'syncData') return json({ success: false, message: 'Unknown action' });
    var ss = workbook();
    var changed = syncInspectionData(ss, body);
    return json({ success: true, message: 'Synced without clearing existing worksheet data', changed: changed });
  } catch (error) {
    return json({ success: false, message: String(error) });
  }
}

function getInspectionSystemData() {
  var ss = workbook();
  var general = rows(ss, SHEETS.general);
  var licences = rows(ss, SHEETS.licence);
  var evaluations = rows(ss, SHEETS.evaluation);
  var requests = rows(ss, SHEETS.requests);
  var licenceByShop = {};
  licences.forEach(function(row) { licenceByShop[key(row.Shop_Name)] = row; });

  var establishments = general.map(function(row, index) {
    var licence = licenceByShop[key(row['ชื่อสถานประกอบกิจการ (ตัวเชื่อม)'])] || {};
    var businessName = text(row['ชื่อสถานประกอบกิจการ (ตัวเชื่อม)']);
    var complaint = text(row['ประวัติการถูกร้องเรียน']);
    return {
      id: 'SHEET-EST-' + (index + 1),
      code: text(licence.License_No) || 'SHEET-' + (index + 1),
      name: businessName,
      type: 'hazardous_business',
      ownerName: text(row['ชื่อผู้ดำเนินกิจการ']),
      phone: text(row['โทรศัพท์ผู้ดำเนิน']) || text(row['โทรศัพท์ร้าน']),
      address: [row['ตั้งอยู่เลขที่'], row['หมู่ที่'] ? 'หมู่ ' + row['หมู่ที่'] : '', row['ถนน']].filter(Boolean).join(' '),
      subdistrict: text(row['ตำบล']),
      district: text(row['อำเภอ']),
      province: text(row['จังหวัด']),
      status: complaint.indexOf('เคย') === 0 ? 'needs_reinspection' : 'pending',
      latestScore: 0,
      latestRating: 'uninspected',
      latestInspectionDate: '',
      nextInspectionDate: '',
      certificateNo: text(licence.License_No) || text(row['เลขที่ใบอนุญาต']),
      certificateExpiryDate: text(licence.End_Date),
      inspectorName: '',
      notes: [
        'ประเภทกิจการ: ' + text(row['ประเภทกิจการ']),
        'อาคาร: ' + text(row['ลักษณะอาคาร']),
        'เครื่องจักร: ' + text(row['จำนวนเครื่องจักร (ตัว)']) + ' ตัว / ' + text(row['รวมจำนวนแรงม้า']) + ' แรงม้า',
        'พนักงาน: ' + text(row['รวมพนักงาน (คน)']) + ' คน',
        'เวลาทำการ: ' + text(row['ตั้งแต่เวลา']) + '-' + text(row['ถึงเวลา']),
        'ร้องเรียน: ' + complaint,
        'ประเด็น: ' + text(row['ประเด็นที่ถูกร้องเรียน']),
        'วัตถุดิบ/สารเคมี: ' + text(row['วัตถุดิบและสารเคมี'])
      ].join('\\n'),
      syncedToSheets: true,
      createdAt: text(row['Timestamp (ตัวเชื่อม)']),
      updatedAt: text(row['Timestamp (ตัวเชื่อม)'])
    };
  }).filter(function(item) { return item.name; });

  return {
    establishments: establishments,
    licences: licences.map(function(row, index) { return licenceRecord(row, index); }),
    licenses: licences.map(function(row, index) { return licenceRecord(row, index); }),
    inspections: evaluations.filter(function(row) { return text(row.Shop_Name); }).map(function(row, index) {
      return {
        id: 'SHEET-INS-' + (index + 1), establishmentId: '', establishmentCode: '',
        establishmentName: text(row.Shop_Name), establishmentType: 'hazardous_business',
        inspectorName: '', inspectorPosition: '', inspectionDate: text(row.Timestamp),
        totalScore: 0, rating: 'uninspected', status: 'needs_reinspection', itemResults: {},
        categoryScores: {}, defectsSummary: [], recommendations: '', inspectorSignature: '',
        recipientSignature: '', createdAt: text(row.Timestamp)
      };
    }),
    petitions: requests.map(function(row, index) {
      return {
        id: 'SHEET-REQ-' + (index + 1), trackingCode: text(row['รหัสคำร้อง']) || 'REQ-' + (index + 1),
        title: text(row['ประเภทคำร้อง']), category: 'other', citizenName: text(row['ชื่อผู้แจ้ง']),
        phone: text(row['เบอร์โทร']), address: text(row['พิกัด GPS']), description: text(row['รายละเอียดเพิ่มเติม']),
        status: petitionStatus(text(row['สถานะคำร้อง'])), assignedOfficer: '', submissionDate: text(row['วันที่แจ้ง'])
      };
    })
  };
}

function licenceRecord(row, index) {
  var start = text(row.Start_Date), end = text(row.End_Date);
  return {
    id: 'SHEET-LIC-' + (index + 1), businessName: text(row.Shop_Name), roundYear: text(row.Thai_Year),
    createdAtFormatted: text(row.Timestamp), licenseNumber: text(row.License_No), licenseYear: text(row.Thai_Year),
    approvalDate: start, expireDate: end, status: end ? 'normal' : 'pending', remainingDays: 0,
    ownerName: '', nationality: '', ownerAddressNo: '', ownerMoo: '', ownerTrokSoi: '', ownerRoad: '',
    ownerSubdistrict: '', ownerDistrict: '', ownerProvince: '', ownerPhone: '', businessCategory: '',
    useSameAddress: true, businessAddressNo: '', businessMoo: '', businessSubdistrict: '',
    businessDistrict: '', businessProvince: '', businessPhone: '', inspectionSummary: text(row.Memo)
  };
}

function syncInspectionData(ss, body) {
  var changes = { establishments: 0, licences: 0 };
  (body.establishments || []).forEach(function(item) {
    upsert(ss, SHEETS.general, 'ชื่อสถานประกอบกิจการ (ตัวเชื่อม)', item.name, {
      'Timestamp (ตัวเชื่อม)': new Date(), 'ชื่อสถานประกอบกิจการ (ตัวเชื่อม)': item.name,
      'ประเภทกิจการ': item.notes || item.type, 'ชื่อผู้ดำเนินกิจการ': item.ownerName,
      'ตั้งอยู่เลขที่': item.address, 'ตำบล': item.subdistrict, 'อำเภอ': item.district,
      'จังหวัด': item.province, 'โทรศัพท์ผู้ดำเนิน': item.phone, 'เลขที่ใบอนุญาต': item.certificateNo
    });
    changes.establishments++;
  });
  (body.licenses || []).forEach(function(item) {
    upsert(ss, SHEETS.licence, 'License_No', item.licenseNumber, {
      Timestamp: new Date(), Shop_Name: item.businessName, License_No: item.licenseNumber,
      Start_Date: item.approvalDate, End_Date: item.expireDate, Memo: item.inspectionSummary || '', Thai_Year: item.licenseYear
    });
    changes.licences++;
  });
  return changes;
}

function rows(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  var values = sheet.getDataRange().getDisplayValues();
  var headers = values[0];
  return values.slice(1).filter(function(row) { return row.some(function(value) { return value !== ''; }); }).map(function(row) {
    var item = {}; headers.forEach(function(header, i) { item[header] = row[i] || ''; }); return item;
  });
}

function upsert(ss, sheetName, keyHeader, keyValue, fields) {
  if (!keyValue) return;
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Missing worksheet: ' + sheetName);
  var values = sheet.getDataRange().getValues();
  var headers = values[0], index = {};
  headers.forEach(function(header, i) { index[header] = i; });
  if (index[keyHeader] === undefined) throw new Error('Missing column ' + keyHeader + ' in ' + sheetName);
  var rowNumber = 0;
  for (var r = 1; r < values.length; r++) if (key(values[r][index[keyHeader]]) === key(keyValue)) { rowNumber = r + 1; break; }
  if (!rowNumber) { rowNumber = sheet.getLastRow() + 1; sheet.getRange(rowNumber, 1, 1, headers.length).setValues([headers.map(function() { return ''; })]); }
  Object.keys(fields).forEach(function(field) { if (index[field] !== undefined) sheet.getRange(rowNumber, index[field] + 1).setValue(fields[field]); });
}

function petitionStatus(value) {
  if (value.indexOf('เสร็จ') >= 0 || value.indexOf('ยุติ') >= 0) return 'resolved';
  if (value.indexOf('ดำเนิน') >= 0) return 'investigating';
  if (value.indexOf('รับ') >= 0) return 'accepted';
  return 'submitted';
}
function text(value) { return value === undefined || value === null ? '' : String(value); }
function key(value) { return text(value).trim().toLowerCase(); }
function workbook() { return SpreadsheetApp.openById(SPREADSHEET_ID); }
function json(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
`;
