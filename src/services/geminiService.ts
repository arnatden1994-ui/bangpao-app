import { GoogleGenAI } from '@google/genai';

const LOCAL_STORAGE_KEY_GEMINI_KEY = 'bangpao_gemini_api_key';

/**
 * Get stored Gemini API Key from localStorage or environment
 */
export function getGeminiApiKey(): string {
  if (typeof window !== 'undefined') {
    const key = localStorage.getItem(LOCAL_STORAGE_KEY_GEMINI_KEY);
    if (key) return key;
  }
  return (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
}

/**
 * Set stored Gemini API Key
 */
export function setGeminiApiKey(apiKey: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEY_GEMINI_KEY, apiKey.trim());
  }
}

/**
 * Initialize Google GenAI client
 */
function getAIClient(customKey?: string): GoogleGenAI | null {
  const key = customKey || getGeminiApiKey();
  if (!key) return null;
  return new GoogleGenAI({ apiKey: key });
}

/**
 * AI Assistant: Analyze Sanitary Inspection
 */
export async function analyzeInspectionWithGemini(params: {
  businessName: string;
  category: string;
  score: number;
  defectsSummary: string;
}): Promise<string> {
  const ai = getAIClient();
  if (!ai) {
    throw new Error('กรุณาระบุ Google AI Studio (Gemini) API Key ในเมนูตั้งค่าก่อนใช้งาน AI');
  }

  const prompt = `
คุณคือผู้เชี่ยวชาญด้านสาธารณสุขและสุขาภิบาลสิ่งแวดล้อม ประจำกองสาธารณสุขและสิ่งแวดล้อม เทศบาลตำบลบางเป้า
โปรดวิเคราะห์ผลการตรวจประเมินสุขลักษณะสถานประกอบการตาม พ.ร.บ. การสาธารณสุข พ.ศ. 2535 ดังนี้:
- ชื่อสถานประกอบการ: ${params.businessName}
- ประเภทกิจการ: ${params.category}
- คะแนนที่ได้: ${params.score}%
- ข้อบกพร่องที่พบ: ${params.defectsSummary || 'ไม่มีข้อบกพร่องสำคัญ'}

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

  return response.text || 'ไม่สามารถสร้างบทวิเคราะห์ได้ในขณะนี้';
}

/**
 * AI Assistant: Categorize and analyze citizen petition / request
 */
export async function analyzePetitionWithGemini(params: {
  title: string;
  category: string;
  description: string;
}): Promise<{ summary: string; urgency: string; suggestedAction: string }> {
  const ai = getAIClient();
  if (!ai) {
    throw new Error('กรุณาระบุ Google AI Studio (Gemini) API Key ในเมนูตั้งค่าก่อนใช้งาน AI');
  }

  const prompt = `
ในฐานะเจ้าหน้าที่รับเรื่องราวร้องทุกข์ กองสาธารณสุขและสิ่งแวดล้อม เทศบาลตำบลบางเป้า
โปรดวิเคราะห์คำร้องของประชาชนต่อไปนี้:
- เรื่อง: ${params.title}
- หมวดหมู่: ${params.category}
- รายละเอียด: ${params.description}

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

  try {
    return JSON.parse(response.text || '{}');
  } catch {
    return {
      summary: response.text || '',
      urgency: 'ปกติ',
      suggestedAction: 'ตรวจสอบข้อเท็จจริงในพื้นที่',
    };
  }
}
