import express, { type Request, type Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Gemini Server-Side Endpoints
  app.post('/api/gemini/analyze-inspection', async (req: Request, res: Response) => {
    const { businessName, category, score, defectsSummary } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.json({
        success: true,
        text: `สรุปผลการประเมินเบื้องต้น (${businessName || 'สถานประกอบการ'}):\n1. กิจการประเภท ${category || '-'} ได้รับคะแนนประเมิน ${score ?? 0}%\n2. ข้อบกพร่องที่พบ: ${defectsSummary || 'ผ่านเกณฑ์มาตรฐานครบถ้วน'}\n3. ข้อเสนอแนะ: ควรดูแลรักษาความสะอาดและการจัดการสุขอนามัยตาม พ.ร.บ.การสาธารณสุขอย่างสม่ำเสมอ`,
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
คุณคือผู้เชี่ยวชาญด้านสาธารณสุขและสุขาภิบาลสิ่งแวดล้อม ประจำกองสาธารณสุขและสิ่งแวดล้อม เทศบาลตำบลบางเป้า
โปรดวิเคราะห์ผลการตรวจประเมินสุขลักษณะสถานประกอบการตาม พ.ร.บ. การสาธารณสุข พ.ศ. 2535 ดังนี้:
- ชื่อสถานประกอบการ: ${businessName}
- ประเภทกิจการ: ${category}
- คะแนนที่ได้: ${score}%
- ข้อบกพร่องที่พบ: ${defectsSummary || 'ไม่มีข้อบกพร่องสำคัญ'}

สิ่งที่ต้องให้คำแนะนำ:
1. สรุปความเสี่ยงด้านสาธารณสุขและสุขลักษณะ
2. มาตรการแก้ไขเร่งด่วนสำหรับผู้ประกอบการ
3. คำแนะนำเจ้าพนักงานสาธารณสุขในการติดตามผล
(ตอบเป็นภาษาไทย เป็นทางการ กระชับ เข้าใจง่าย)
      `;
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });
      res.json({ success: true, text: response.text || '' });
    } catch (err: unknown) {
      console.warn('Gemini inspection analysis fallback:', err);
      res.json({
        success: true,
        text: `สรุปผลการประเมินสุขลักษณะสถานประกอบการ (${businessName || 'สถานประกอบการ'}):\n\n1. สรุปความเสี่ยงด้านสาธารณสุขและสุขลักษณะ: กิจการประเภท ${category || 'ทั่วไป'} ได้รับคะแนนประเมิน ${score ?? 0}% อยู่ในเกณฑ์${(score ?? 0) >= 80 ? 'ดีมาก/ผ่านเกณฑ์มาตรฐาน' : 'ต้องปรับปรุงแก้ไข'}\n2. ข้อบกพร่องที่พบ: ${defectsSummary || 'ผ่านเกณฑ์มาตรฐานครบถ้วน ไม่พบข้อบกพร่องสำคัญ'}\n3. มาตรการและคำแนะนำ: หมั่นรักษามาตรฐานสุขอนามัยสถานที่ อุปกรณ์ และการจัดการสุขาภิบาลสิ่งแวดล้อมตามข้อบัญญัติและระเบียบเทศบาลตำบลบางเป้าอย่างสม่ำเสมอ`,
      });
    }
  });

  app.post('/api/gemini/analyze-petition', async (req: Request, res: Response) => {
    const { title, category, description } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.json({
        success: true,
        data: {
          summary: `คำร้องเรื่อง: ${title || 'คำร้องทั่วไป'} (${category || 'ทั่วไป'})`,
          urgency: 'ปกติ',
          suggestedAction: 'ลงพื้นที่ตรวจสอบข้อเท็จจริงและจัดทำบันทึกข้อความรายงานผู้บังคับบัญชา',
        },
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
ในฐานะเจ้าหน้าที่รับเรื่องราวร้องทุกข์ กองสาธารณสุขและสิ่งแวดล้อม เทศบาลตำบลบางเป้า
โปรดวิเคราะห์คำร้องของประชาชนต่อไปนี้:
- เรื่อง: ${title}
- หมวดหมู่: ${category}
- รายละเอียด: ${description}

ตอบกลับในรูปแบบ JSON ตามโครงสร้างนี้เท่านั้น:
{
  "summary": "สรุปสาระสำคัญของคำร้องใน 1-2 ประโยค",
  "urgency": "ด่วนมาก / ด่วน / ปกติ",
  "suggestedAction": "ข้อเสนอแนะในการลงพื้นที่หรือแนวทางแก้ไขเสนอผู้บริหาร"
}
      `;
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });
      let parsed = {};
      try {
        parsed = JSON.parse(response.text || '{}');
      } catch {
        parsed = {
          summary: response.text || '',
          urgency: 'ปกติ',
          suggestedAction: 'ตรวจสอบข้อเท็จจริงในพื้นที่',
        };
      }
      res.json({ success: true, data: parsed });
    } catch (err: unknown) {
      console.warn('Gemini petition analysis fallback:', err);
      res.json({
        success: true,
        data: {
          summary: `คำร้องเรียน/ขอรับบริการ: ${title || 'คำร้องทั่วไป'} (${category || 'สาธารณสุขและสิ่งแวดล้อม'})`,
          urgency: 'ปกติ',
          suggestedAction: 'มอบหมายเจ้าพนักงานลงพื้นที่ตรวจสอบข้อเท็จจริง และรายงานผลภายใน 3 วันทำการ',
        },
      });
    }
  });

  // Live Google Sheets sync endpoint
  app.post('/api/sheets/live-data', async (req: Request, res: Response) => {
    const sheetId = req.body?.sheetId || '1uyFaL2xxUouBM5CV-_WdWlNHWHZWQQ9XhrVldvV3DEY';
    try {
      const [licRes, setupRes] = await Promise.all([
        fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=LicenseData`),
        fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=Setup`).catch(() => null),
      ]);

      if (!licRes.ok) {
        throw new Error(`Google Sheets HTTP ${licRes.status}`);
      }

      const licTxt = await licRes.text();
      const parseGviz = (txt: string) => {
        const jsonStr = txt.replace(/^[^{]*(\{.*\})[^}]*$/, '$1');
        const parsed = JSON.parse(jsonStr);
        return parsed.table?.rows?.map((r: any) =>
          r.c ? r.c.map((cell: any) => (cell ? (cell.f || cell.v) : '')) : []
        ) || [];
      };

      const licRows = parseGviz(licTxt);
      const setupMap: Record<string, any> = {};
      if (setupRes && setupRes.ok) {
        const setupTxt = await setupRes.text();
        const setupRows = parseGviz(setupTxt);
        setupRows.forEach((r: any[]) => {
          const name = String(r[1] || '').trim();
          if (name) {
            setupMap[name] = {
              category: r[2] || '',
              ownerName: r[3] || '',
              addressNo: r[4] || '',
              moo: r[5] || '',
              road: r[6] || '',
              subdistrict: r[7] || 'บางเป้า',
              district: r[8] || 'กันตัง',
              province: r[9] || 'ตรัง',
              ownerPhone: r[10] || '',
              businessPhone: r[11] || '',
              buildingStyle: r[14] || '',
            };
          }
        });
      }

      const parseThaiDate = (str: any) => {
        if (!str) return '-';
        const clean = String(str).split(',')[0].trim();
        const parts = clean.split('/');
        if (parts.length === 3) {
          const d = parts[0].padStart(2, '0');
          const m = parts[1].padStart(2, '0');
          let y = parseInt(parts[2], 10);
          if (y < 2500) y += 543;
          return `${d}/${m}/${y}`;
        }
        return String(str);
      };

      const calcRemainingDays = (expireDateStr: string) => {
        if (!expireDateStr || expireDateStr === '-') return 999;
        const parts = expireDateStr.split('/');
        if (parts.length === 3) {
          const d = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          let y = parseInt(parts[2], 10);
          if (y > 2500) y -= 543;
          const expDate = new Date(y, m, d);
          const now = new Date();
          return Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        }
        return 999;
      };

      const licenses = licRows.map((r: any[], idx: number) => {
        const businessName = String(r[1] || '').trim();
        const setupInfo = setupMap[businessName] || {};
        const approvalDate = parseThaiDate(r[3]);
        const expireDate = parseThaiDate(r[4]);
        const remainingDays = calcRemainingDays(expireDate);
        let status: 'normal' | 'expiring' | 'expired' = 'normal';
        if (remainingDays <= 0) {
          status = 'expired';
        } else if (remainingDays <= 60) {
          status = 'expiring';
        }

        const rawLicenseNo = String(r[2] || '').trim();
        let bookNo = '';
        let licenseNo = rawLicenseNo;
        if (rawLicenseNo.includes('เล่มที่')) {
          const match = rawLicenseNo.match(/เล่มที่\s*([^\s]+)/);
          if (match) bookNo = match[1];
          const noMatch = rawLicenseNo.match(/เลขที่\s*([^\s]+)/);
          if (noMatch) licenseNo = noMatch[1];
        }

        const year = r[6] ? String(r[6]) : '2569';

        return {
          id: `LIC-${String(idx + 1).padStart(2, '0')}`,
          businessName: businessName || `ร้านค้า ${idx + 1}`,
          roundYear: `รอบปี ${year}`,
          createdAtFormatted: String(r[0] || '').split(',')[0] || '01/07/2026',
          licenseBookNo: bookNo,
          licenseNumber: licenseNo.includes('/') ? licenseNo : `${licenseNo}/${year}`,
          licenseYear: year,
          approvalDate,
          expireDate,
          status,
          remainingDays,
          remarks: r[5] || '',
          ownerName: setupInfo.ownerName || 'ผู้ประกอบการ',
          nationality: 'ไทย',
          ownerAddressNo: setupInfo.addressNo || '',
          ownerMoo: setupInfo.moo || '',
          ownerTrokSoi: '',
          ownerRoad: setupInfo.road || '',
          ownerSubdistrict: setupInfo.subdistrict || 'บางเป้า',
          ownerDistrict: setupInfo.district || 'กันตัง',
          ownerProvince: setupInfo.province || 'ตรัง',
          ownerPhone: setupInfo.ownerPhone || setupInfo.businessPhone || '',
          businessCategory: setupInfo.category || 'กิจการอันตรายต่อสุขภาพตาม พ.ร.บ. การสาธารณสุข',
          useSameAddress: true,
          businessAddressNo: setupInfo.addressNo || '',
          businessMoo: setupInfo.moo || '',
          businessSubdistrict: setupInfo.subdistrict || 'บางเป้า',
          businessDistrict: setupInfo.district || 'กันตัง',
          businessProvince: setupInfo.province || 'ตรัง',
          businessPhone: setupInfo.businessPhone || setupInfo.ownerPhone || '',
        };
      });

      res.json({
        success: true,
        message: `ดึงข้อมูลจาก Google Sheets สำเร็จ (${licenses.length} รายการ)`,
        sheetId,
        licenses,
        count: licenses.length,
        timestamp: new Date().toISOString(),
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, message: 'ข้อผิดพลาดในการดึงข้อมูลจาก Google Sheets: ' + errorMsg });
    }
  });

  // Test endpoint for Apps Script
  app.post('/api/test-gas', async (req: Request, res: Response) => {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      res.status(400).json({ success: false, message: 'URL is required' });
      return;
    }

    try {
      const startTime = Date.now();
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'HygieneInspectionApp/1.0',
        },
        redirect: 'follow',
      });
      const responseTime = Date.now() - startTime;
      const text = await response.text();
      let parsed = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        // Not JSON
      }

      const isPermissionDenied = text.includes('accounts.google.com') || 
                                 text.includes('Sign in to continue') ||
                                 text.includes('warning-bar-table') ||
                                 response.status === 403;

      res.json({
        success: response.ok && !isPermissionDenied,
        status: response.status,
        responseTimeMs: responseTime,
        isJson: parsed !== null,
        data: parsed,
        isPermissionDenied,
        htmlTitle: text.match(/<title>([^<]+)<\/title>/i)?.[1] || null,
        rawPreview: text.slice(0, 300),
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, message: errorMsg });
    }
  });

  // Proxy endpoint to communicate with Google Apps Script Web App
  app.post('/api/gas-proxy', async (req: Request, res: Response) => {
    const { scriptUrl, method = 'POST', payload, queryParams } = req.body;

    if (!scriptUrl) {
      res.status(400).json({ success: false, message: 'scriptUrl is required' });
      return;
    }

    try {
      let targetUrl = scriptUrl;
      if (queryParams && typeof queryParams === 'object') {
        const urlObj = new URL(scriptUrl);
        Object.entries(queryParams).forEach(([key, val]) => {
          if (val !== undefined && val !== null) {
            urlObj.searchParams.set(key, String(val));
          }
        });
        targetUrl = urlObj.toString();
      }

      const fetchOptions: RequestInit = {
        method: method.toUpperCase(),
        headers: {
          'Accept': 'application/json, text/plain, */*',
        },
        redirect: 'follow',
      };

      if (method.toUpperCase() === 'POST' && payload) {
        fetchOptions.headers = {
          ...fetchOptions.headers,
          'Content-Type': 'application/json',
        };
        fetchOptions.body = JSON.stringify(payload);
      }

      const response = await fetch(targetUrl, fetchOptions);
      const text = await response.text();

      let data: unknown = text;
      try {
        data = JSON.parse(text);
      } catch {
        // keep text
      }

      res.status(response.status).json({
        ok: response.ok,
        status: response.status,
        data,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, message: errorMsg });
    }
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
