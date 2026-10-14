/**
 * Service for calling AI capabilities via server-side proxy (/api/gemini/*)
 */

/**
 * AI Assistant: Analyze Sanitary Inspection via server-side Gemini API
 */
export async function analyzeInspectionWithGemini(params: {
  businessName: string;
  category: string;
  score: number;
  defectsSummary: string;
}): Promise<string> {
  try {
    const res = await fetch('/api/gemini/analyze-inspection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (data.success && data.text) {
      return data.text;
    }
    return data.message || 'ไม่สามารถสร้างบทวิเคราะห์ได้ในขณะนี้';
  } catch (err: unknown) {
    console.error('Failed to analyze inspection via Gemini server proxy:', err);
    return `สรุปผลการประเมินเบื้องต้น (${params.businessName}):\n1. กิจการประเภท ${params.category} ได้รับคะแนน ${params.score}%\n2. ข้อบกพร่องที่พบ: ${params.defectsSummary || 'ผ่านเกณฑ์มาตรฐานครบถ้วน'}\n3. แนะนำให้เจ้าพนักงานตรวจสอบติดตามผลอย่างต่อเนื่อง`;
  }
}

/**
 * AI Assistant: Categorize and analyze citizen petition / request via server-side Gemini API
 */
export async function analyzePetitionWithGemini(params: {
  title: string;
  category: string;
  description: string;
}): Promise<{ summary: string; urgency: string; suggestedAction: string }> {
  try {
    const res = await fetch('/api/gemini/analyze-petition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (data.success && data.data) {
      return data.data;
    }
  } catch (err: unknown) {
    console.error('Failed to analyze petition via Gemini server proxy:', err);
  }
  return {
    summary: `เรื่องร้องทุกข์: ${params.title} (${params.category})`,
    urgency: 'ปกติ',
    suggestedAction: 'ตรวจสอบข้อเท็จจริงในพื้นที่และจัดทำบันทึกข้อความรายงานผู้บังคับบัญชา',
  };
}

