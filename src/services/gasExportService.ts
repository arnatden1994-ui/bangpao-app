import { DEFAULT_GAS_URL } from './sheetsSync.ts';
import { LicenseRecord } from '../types/index.ts';

export interface GasExportResult {
  success: boolean;
  pdfUrl?: string;
  excelUrl?: string;
  sheetUrl?: string;
  error?: string;
}

/**
 * ส่งออกรายงานการตรวจประเมินสุขลักษณะลง Google Sheet ฉบับใหม่ (สร้างสำเนาจาก แบบออกรายงานตรวจ)
 */
export async function exportReportSheetViaGas(
  shopName: string,
  targetYear?: string,
  gasUrl: string = DEFAULT_GAS_URL
): Promise<GasExportResult> {
  try {
    const response = await fetch('/api/gas-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scriptUrl: gasUrl,
        method: 'GET',
        queryParams: {
          action: 'exportReportSheet',
          shopName: shopName.trim(),
          targetYear: targetYear || '',
        },
      }),
    });

    const result = await response.json();
    if (result.ok && result.data && result.data.success) {
      return {
        success: true,
        pdfUrl: result.data.pdfUrl,
        excelUrl: result.data.excelUrl,
        sheetUrl: result.data.sheetUrl || result.data.excelUrl,
      };
    }

    return {
      success: false,
      error: result.data?.error || result.message || 'ไม่สามารถสร้างไฟล์ชีตรายงานได้',
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
}

/**
 * ส่งออกรายงานการตรวจประเมินสุขลักษณะเป็น PDF จาก Google Sheet แบบฟอร์มทางการ
 */
export async function exportReportPdfViaGas(
  shopName: string,
  targetYear?: string,
  gasUrl: string = DEFAULT_GAS_URL
): Promise<GasExportResult> {
  try {
    const response = await fetch('/api/gas-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scriptUrl: gasUrl,
        method: 'GET',
        queryParams: {
          action: 'exportReportPdf',
          shopName: shopName.trim(),
          targetYear: targetYear || '',
        },
      }),
    });

    const result = await response.json();
    if (result.ok && result.data && result.data.success) {
      return {
        success: true,
        pdfUrl: result.data.pdfUrl,
        excelUrl: result.data.excelUrl,
        sheetUrl: result.data.sheetUrl,
      };
    }

    return {
      success: false,
      error: result.data?.error || result.message || 'ไม่สามารถสร้างไฟล์ PDF รายงานได้',
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
}

/**
 * ส่งออกใบอนุญาต (อภ.2) ลง Google Sheet ฉบับใหม่ (สร้างสำเนาจาก แบบฟอร์มใบอนุญาต)
 */
export async function exportLicenseSheetViaGas(
  shopName: string,
  gasUrl: string = DEFAULT_GAS_URL
): Promise<GasExportResult> {
  try {
    const response = await fetch('/api/gas-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scriptUrl: gasUrl,
        method: 'GET',
        queryParams: {
          action: 'exportLicenseSheet',
          shopName: shopName.trim(),
        },
      }),
    });

    const result = await response.json();
    if (result.ok && result.data && result.data.success) {
      return {
        success: true,
        pdfUrl: result.data.pdfUrl,
        excelUrl: result.data.excelUrl,
        sheetUrl: result.data.sheetUrl || result.data.excelUrl,
      };
    }

    return {
      success: false,
      error: result.data?.error || result.message || 'ไม่สามารถสร้างไฟล์ชีตใบอนุญาตได้',
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
}

/**
 * ส่งออกใบอนุญาต (อภ.2) เป็น PDF ผ่าน Google Apps Script
 */
export async function exportLicensePdfViaGas(
  shopName: string,
  gasUrl: string = DEFAULT_GAS_URL
): Promise<GasExportResult> {
  try {
    const response = await fetch('/api/gas-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scriptUrl: gasUrl,
        method: 'GET',
        queryParams: {
          action: 'exportLicensePdf',
          shopName: shopName.trim(),
        },
      }),
    });

    const result = await response.json();
    if (result.ok && result.data && result.data.success) {
      return {
        success: true,
        pdfUrl: result.data.pdfUrl,
        excelUrl: result.data.excelUrl,
        sheetUrl: result.data.sheetUrl,
      };
    }

    return {
      success: false,
      error: result.data?.error || result.message || 'ไม่สามารถสร้างไฟล์ PDF ใบอนุญาตได้',
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
}

/**
 * บันทึกการแก้ไขข้อมูลใบอนุญาตกลับไปยัง Google Apps Script (updateLicenseRecord)
 */
export async function updateLicenseRecordInGas(
  license: LicenseRecord,
  gasUrl: string = DEFAULT_GAS_URL
): Promise<{ success: boolean; message: string }> {
  try {
    const rawNo = (license.licenseNumber || '').split('/')[0].replace('เลขที่', '').trim();
    const docYear = license.licenseYear || '2569';

    const payload = {
      action: 'updateLicenseRecord',
      name: license.businessName,
      no: rawNo,
      s: license.approvalDate || '',
      e: license.expireDate || '',
      m: '-',
      bookNo: license.licenseBookNo || '-',
      feeAmount: license.feeAmount || '500',
      feeText: license.feeText || 'ห้าร้อยบาทถ้วน',
      receiptBookNo: license.receiptBookNo || '-',
      receiptNo: license.receiptNo || '-',
      receiptDate: license.receiptDate || license.approvalDate || '',
      execName: license.execName || '(นายละดม เชื้อช่วย)',
      execPos: license.execPos || 'นายกเทศมนตรีตำบลบางเป้า',
      cond31: license.condition31 || '-',
      cond32: license.condition32 || '-',
      bAddrNo: license.businessAddressNo || '',
      bMoo: license.businessMoo || '',
      bTumbon: license.businessSubdistrict || 'บางเป้า',
      bAmphoe: license.businessDistrict || 'กันตัง',
      bProv: license.businessProvince || 'ตรัง',
      bPhone: license.businessPhone || '',
      nat: license.nationality || 'ไทย',
      owner: license.ownerName || '',
      oAddrNo: license.ownerAddressNo || '',
      oMoo: license.ownerMoo || '',
      oTrok: license.ownerTrokSoi || '-',
      oRoad: license.ownerRoad || '-',
      oTumbon: license.ownerSubdistrict || 'คลองชีล้อม',
      oAmphoe: license.ownerDistrict || 'กันตัง',
      oProv: license.ownerProvince || 'ตรัง',
      oPhone: license.ownerPhone || '',
      bName: license.businessName || '',
      bType: license.businessCategory || '',
      docYear: docYear,
    };

    const response = await fetch('/api/gas-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scriptUrl: gasUrl,
        method: 'POST',
        payload,
      }),
    });

    const result = await response.json();
    return {
      success: response.ok,
      message: result.data?.message || 'บันทึกข้อมูลใบอนุญาตเรียบร้อยครับ',
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, message: errorMsg };
  }
}
