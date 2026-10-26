import { DEFAULT_GAS_URL } from './sheetsSync.ts';
import { LicenseRecord } from '../types/index.ts';

export interface GasExportResult {
  success: boolean;
  pdfUrl?: string;
  excelUrl?: string;
  sheetUrl?: string;
  error?: string;
}

async function callGasProxy(body: object): Promise<{ ok: boolean; status: number; data?: any; error?: string }> {
  try {
    const response = await fetch('/api/gas-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let result: any;
    try {
      result = JSON.parse(text);
    } catch {
      return {
        ok: false,
        status: response.status,
        error: `เซิร์ฟเวอร์ proxy ตอบกลับไม่ใช่ JSON (HTTP ${response.status}): ${text.slice(0, 100)}`,
      };
    }

    return {
      ok: response.ok && result.ok !== false,
      status: response.status,
      data: result.data || result,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      status: 500,
      error: errorMsg,
    };
  }
}

/**
 * ส่งออกรายงานการตรวจประเมินสุขลักษณะลง Google Sheet ฉบับใหม่ (สร้างสำเนาจาก แบบออกรายงานตรวจ)
 */
export async function exportReportSheetViaGas(
  shopName: string,
  targetYear?: string,
  gasUrl: string = DEFAULT_GAS_URL
): Promise<GasExportResult> {
  const res = await callGasProxy({
    scriptUrl: gasUrl,
    method: 'GET',
    queryParams: {
      action: 'exportReportSheet',
      shopName: shopName.trim(),
      targetYear: targetYear || '',
    },
  });

  if (res.ok && res.data && res.data.success) {
    return {
      success: true,
      pdfUrl: res.data.pdfUrl,
      excelUrl: res.data.excelUrl,
      sheetUrl: res.data.sheetUrl || res.data.excelUrl,
    };
  }

  return {
    success: false,
    error: res.data?.error || res.error || 'ไม่สามารถสร้างไฟล์ชีตรายงานได้',
  };
}

/**
 * ส่งออกรายงานการตรวจประเมินสุขลักษณะเป็น PDF จาก Google Sheet แบบฟอร์มทางการ
 */
export async function exportReportPdfViaGas(
  shopName: string,
  targetYear?: string,
  gasUrl: string = DEFAULT_GAS_URL
): Promise<GasExportResult> {
  const res = await callGasProxy({
    scriptUrl: gasUrl,
    method: 'GET',
    queryParams: {
      action: 'exportReportPdf',
      shopName: shopName.trim(),
      targetYear: targetYear || '',
    },
  });

  if (res.ok && res.data && res.data.success) {
    return {
      success: true,
      pdfUrl: res.data.pdfUrl,
      excelUrl: res.data.excelUrl,
      sheetUrl: res.data.sheetUrl,
    };
  }

  return {
    success: false,
    error: res.data?.error || res.error || 'ไม่สามารถสร้างไฟล์ PDF รายงานได้',
  };
}

/**
 * ส่งออกใบอนุญาต (อภ.2) ลง Google Sheet ฉบับใหม่ (สร้างสำเนาจาก แบบฟอร์มใบอนุญาต)
 */
export async function exportLicenseSheetViaGas(
  shopName: string,
  gasUrl: string = DEFAULT_GAS_URL
): Promise<GasExportResult> {
  const res = await callGasProxy({
    scriptUrl: gasUrl,
    method: 'GET',
    queryParams: {
      action: 'exportLicenseSheet',
      shopName: shopName.trim(),
    },
  });

  if (res.ok && res.data && res.data.success) {
    return {
      success: true,
      pdfUrl: res.data.pdfUrl,
      excelUrl: res.data.excelUrl,
      sheetUrl: res.data.sheetUrl || res.data.excelUrl,
    };
  }

  return {
    success: false,
    error: res.data?.error || res.error || 'ไม่สามารถสร้างไฟล์ชีตใบอนุญาตได้',
  };
}

/**
 * ส่งออกใบอนุญาต (อภ.2) เป็น PDF ผ่าน Google Apps Script
 */
export async function exportLicensePdfViaGas(
  shopName: string,
  gasUrl: string = DEFAULT_GAS_URL
): Promise<GasExportResult> {
  const res = await callGasProxy({
    scriptUrl: gasUrl,
    method: 'GET',
    queryParams: {
      action: 'exportLicensePdf',
      shopName: shopName.trim(),
    },
  });

  if (res.ok && res.data && res.data.success) {
    return {
      success: true,
      pdfUrl: res.data.pdfUrl,
      excelUrl: res.data.excelUrl,
      sheetUrl: res.data.sheetUrl,
    };
  }

  return {
    success: false,
    error: res.data?.error || res.error || 'ไม่สามารถสร้างไฟล์ PDF ใบอนุญาตได้',
  };
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

    const res = await callGasProxy({
      scriptUrl: gasUrl,
      method: 'POST',
      payload,
    });

    return {
      success: res.ok,
      message: res.data?.message || (res.ok ? 'บันทึกข้อมูลใบอนุญาตเรียบร้อยครับ' : (res.error || 'เกิดข้อผิดพลาดในการบันทึก')),
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, message: errorMsg };
  }
}
