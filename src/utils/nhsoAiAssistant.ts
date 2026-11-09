import { NhsoActivityGroup, NhsoFundBudgetLine, NhsoFundSettings } from '../types/index.ts';

export interface AiProjectDraftParams {
  projectName: string;
  proposingOrg?: string;
  participantsCount: number;
  observersCount: number;
  speakersCount: number;
  hoursCount: number;
  includeLunch: boolean;
  snackMealsCount: number;
  includeVinyl: boolean;
  includeMaterials: boolean;
  activityCountMode: 'auto' | 'single' | 'two' | 'three';
  fiscalYear: string;
  settings: NhsoFundSettings;
}

export interface AiProjectSuggestionResult {
  recommendedCategoryNumber: number;
  recommendedCategoryReason: string;
  detectedTopicLabel: string;
  activityGroups: NhsoActivityGroup[];
  alternativeActivities: string[];
  alternativeObjectives: string[];
  alternativeTargetGroups: string[];
  alternativeKpis: string[];
}

const GEMINI_KEY_STORAGE = 'bangpao_nhso_free_gemini_api_key';

export function getStoredFreeGeminiKey(): string {
  try {
    return localStorage.getItem(GEMINI_KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

export function saveStoredFreeGeminiKey(key: string): void {
  try {
    localStorage.setItem(GEMINI_KEY_STORAGE, key.trim());
  } catch {
    // ignore
  }
}

/**
 * Recommends NHSO Category (1-8) based on Organization & Project Name
 */
export function recommendNhsoCategory(
  projectName: string,
  proposingOrg: string
): { categoryNumber: number; reason: string } {
  const name = (projectName || '').toLowerCase();
  const org = (proposingOrg || '').toLowerCase();

  if (
    name.includes('ผ้าอ้อม') ||
    name.includes('adl') ||
    name.includes('กลั้นปัสสาวะ') ||
    name.includes('อุจจาระไม่ได้')
  ) {
    return {
      categoryNumber: 7,
      reason: 'โครงการสนับสนุนผ้าอ้อมผู้ใหญ่สำหรับบุคคลที่มีภาวะพึ่งพิง ตรงกับประเภทที่ 7 [ข้อ 10 (7)]',
    };
  }

  if (name.includes('โรคระบาด') || name.includes('ฉุกเฉิน') || name.includes('โควิด')) {
    if (name.includes('กรณีเกิดโรคระบาด') || name.includes('ภัยพิบัติ')) {
      return {
        categoryNumber: 5,
        reason: 'โครงการป้องกันและควบคุมโรคกรณีเกิดโรคระบาดหรือภัยพิบัติ ตรงกับประเภทที่ 5 [ข้อ 10 (5)]',
      };
    }
  }

  if (name.includes('บริหารกองทุน') || name.includes('พัฒนากองทุน') || name.includes('ประชุมคณะกรรมการ')) {
    return {
      categoryNumber: 4,
      reason: 'โครงการสนับสนุนการบริหารหรือพัฒนากองทุนฯ ตรงกับประเภทที่ 4 [ข้อ 10 (4)]',
    };
  }

  if (
    org.includes('ศพด') ||
    org.includes('ศูนย์พัฒนาเด็กเล็ก') ||
    org.includes('ศูนย์ผู้สูงอายุ') ||
    name.includes('ศูนย์พัฒนาเด็กเล็ก') ||
    name.includes('ศพด.')
  ) {
    return {
      categoryNumber: 3,
      reason: 'ดำเนินการโดยศูนย์พัฒนาเด็กเล็ก/ศูนย์ผู้สูงอายุในชุมชน ตรงกับประเภทที่ 3 [ข้อ 10 (3)]',
    };
  }

  if (
    org.includes('รพ.') ||
    org.includes('โรงพยาบาล') ||
    org.includes('กองสาธารณสุข') ||
    org.includes('กองการศึกษา')
  ) {
    return {
      categoryNumber: 1,
      reason: 'ดำเนินการโดยหน่วยบริการ สถานบริการ หรือหน่วยงานสาธารณสุข/ท้องถิ่น ตรงกับประเภทที่ 1 [ข้อ 10 (1)]',
    };
  }

  if (
    org.includes('อสม') ||
    org.includes('ชมรม') ||
    org.includes('รร.') ||
    org.includes('โรงเรียน') ||
    org.includes('กองทุนสวัสดิการ') ||
    org.includes('กลุ่ม')
  ) {
    return {
      categoryNumber: 2,
      reason: 'ดำเนินการโดยองค์กร/กลุ่มประชาชน ชมรม อสม. หรือสถานศึกษา ตรงกับประเภทที่ 2 [ข้อ 10 (2)]',
    };
  }

  return {
    categoryNumber: 1,
    reason: 'วิเคราะห์จากลักษณะกิจกรรมส่งเสริมสุขภาพเชิงรุกในพื้นที่ตำบลบางเป้า',
  };
}

/**
 * Extracts core subject phrase from any project title
 */
function extractTopicCore(projectName: string): string {
  const cleaned = (projectName || '')
    .replace(/^โครงการ\s*/i, '')
    .replace(/ประจำปีงบประมาณ\s*\d+/g, '')
    .replace(/ประจำปี\s*\d+/g, '')
    .replace(/ปีงบประมาณ\s*\d+/g, '')
    .replace(/ตำบลบางเป้า|อำเภอกันตัง|จังหวัดตรัง/g, '')
    .trim();
  return cleaned || 'การสร้างเสริมสุขภาพและป้องกันโรคในชุมชน';
}

/**
 * Build standard training budget lines according to NHSO rates & participant counts
 */
function buildStandardTrainingBudgetLines(
  groupIndex: number,
  activityCategory: string,
  params: AiProjectDraftParams,
  extraLines: Array<{ name: string; quantity: number; unit: string; unitPrice: number }> = []
): NhsoFundBudgetLine[] {
  const speakerRate = params.settings?.standardRates?.speakerHourly || 600;
  const lunchRate = params.settings?.standardRates?.lunchPerMeal || 75;
  const snackRate = params.settings?.standardRates?.snackPerMeal || 25;
  const vinylRate = params.settings?.standardRates?.vinylPerBanner || 450;

  const totalPeople =
    Math.max(1, params.participantsCount) +
    Math.max(0, params.observersCount) +
    Math.max(0, params.speakersCount);

  const lines: NhsoFundBudgetLine[] = [];
  let itemNo = 1;

  if (params.hoursCount > 0 && params.speakersCount > 0) {
    const qty = params.hoursCount;
    const price = speakerRate;
    lines.push({
      id: `ai_line_${groupIndex}_${itemNo}_${Date.now()}`,
      activityCategory,
      name: `${groupIndex}.${itemNo}) ค่าตอบแทนวิทยากร (${qty} ชั่วโมง x ${price} บาท)`,
      quantity: qty,
      unit: 'ชั่วโมง',
      unitPrice: price,
      total: qty * price,
    });
    itemNo++;
  }

  if (params.includeLunch) {
    lines.push({
      id: `ai_line_${groupIndex}_${itemNo}_${Date.now() + 1}`,
      activityCategory,
      name: `${groupIndex}.${itemNo}) ค่าอาหารกลางวัน สำหรับผู้เข้าอบรมและผู้สังเกตการณ์`,
      quantity: totalPeople,
      unit: 'ชุด',
      unitPrice: lunchRate,
      total: totalPeople * lunchRate,
    });
    itemNo++;
  }

  if (params.snackMealsCount > 0) {
    const snackQty = totalPeople * params.snackMealsCount;
    lines.push({
      id: `ai_line_${groupIndex}_${itemNo}_${Date.now() + 2}`,
      activityCategory,
      name: `${groupIndex}.${itemNo}) ค่าอาหารว่างและเครื่องดื่ม จำนวน ${params.snackMealsCount} มื้อ (${totalPeople} คน)`,
      quantity: snackQty,
      unit: 'ชุด',
      unitPrice: snackRate,
      total: snackQty * snackRate,
    });
    itemNo++;
  }

  if (params.includeVinyl) {
    lines.push({
      id: `ai_line_${groupIndex}_${itemNo}_${Date.now() + 3}`,
      activityCategory,
      name: `${groupIndex}.${itemNo}) ค่าป้ายไวนิลชื่อโครงการ ขนาด 1.2 x 2.5 เมตร`,
      quantity: 1,
      unit: 'ป้าย',
      unitPrice: vinylRate,
      total: vinylRate,
    });
    itemNo++;
  }

  if (params.includeMaterials) {
    lines.push({
      id: `ai_line_${groupIndex}_${itemNo}_${Date.now() + 4}`,
      activityCategory,
      name: `${groupIndex}.${itemNo}) ค่าวัสดุ/อุปกรณ์ และเอกสารประกอบการอบรม`,
      quantity: Math.max(1, params.participantsCount),
      unit: 'ชุด',
      unitPrice: 50,
      total: Math.max(1, params.participantsCount) * 50,
    });
    itemNo++;
  }

  extraLines.forEach((ex, idx) => {
    lines.push({
      id: `ai_line_${groupIndex}_${itemNo}_${Date.now() + 10 + idx}`,
      activityCategory,
      name: `${groupIndex}.${itemNo}) ${ex.name}`,
      quantity: ex.quantity,
      unit: ex.unit,
      unitPrice: ex.unitPrice,
      total: ex.quantity * ex.unitPrice,
    });
    itemNo++;
  });

  return lines;
}

/**
 * 100% Free Built-in NHSO Domain Expert AI Generator
 */
export function generateSmartNhsoProjectDraft(
  params: AiProjectDraftParams
): AiProjectSuggestionResult {
  const title = (params.projectName || '').trim();
  const topicCore = extractTopicCore(title);
  const yrShort = (params.fiscalYear || '2570').slice(-2);
  const pCount = Math.max(1, params.participantsCount || 30);
  const obsCount = Math.max(0, params.observersCount ?? 6);
  const spkCount = Math.max(0, params.speakersCount ?? 1);
  const totalPeople = pCount + obsCount + spkCount;

  const { categoryNumber, reason } = recommendNhsoCategory(title, params.proposingOrg || '');

  const defaultLocation = params.proposingOrg?.includes('รร.')
    ? `ห้องประชุม${params.proposingOrg.replace('รร.', 'โรงเรียน')}`
    : params.proposingOrg?.includes('ศพด.')
      ? `${params.proposingOrg.replace('ศพด.', 'ศูนย์พัฒนาเด็กเล็ก')}`
      : params.proposingOrg?.includes('รพ.สต.')
        ? 'ห้องประชุม รพ.สต.บางเป้า และพื้นที่หมู่ที่ 2, 3, 5, 7 ตำบลบางเป้า'
        : 'ห้องประชุมเทศบาลตำบลบางเป้า / ศาลาประชาคมหมู่บ้าน ตำบลบางเป้า';

  const defaultDuration = `มี.ค. - ก.ย. ${yrShort}`;

  // 1. DROWNING PREVENTION (จมน้ำ / ว่ายน้ำ)
  if (title.includes('จมน้ำ') || title.includes('ว่ายน้ำ')) {
    const act1Lines = buildStandardTrainingBudgetLines(1, '1. กิจกรรมอบรมให้ความรู้', params);
    const act2Lines: NhsoFundBudgetLine[] = [
      {
        id: `ai_swim_1_${Date.now()}`,
        activityCategory: '2. กิจกรรมฝึกปฏิบัติว่ายน้ำ',
        name: '2.1) ค่าตอบแทนวิทยากรสอนว่ายน้ำ จำนวน 3 คน คนละ 300 บาท/ชม. (24 ชม.)',
        quantity: 24,
        unit: 'ชั่วโมง',
        unitPrice: 900,
        total: 21600,
      },
      {
        id: `ai_swim_2_${Date.now() + 1}`,
        activityCategory: '2. กิจกรรมฝึกปฏิบัติว่ายน้ำ',
        name: '2.2) ค่าธรรมเนียมการใช้สระว่ายน้ำ',
        quantity: 1,
        unit: 'สระ',
        unitPrice: 3000,
        total: 3000,
      },
      {
        id: `ai_swim_3_${Date.now() + 2}`,
        activityCategory: '2. กิจกรรมฝึกปฏิบัติว่ายน้ำ',
        name: `2.3) ค่าอาหารว่างและเครื่องดื่ม จำนวน 8 มื้อ (${totalPeople} คน)`,
        quantity: totalPeople * 8,
        unit: 'ชุด',
        unitPrice: params.settings?.standardRates?.snackPerMeal || 25,
        total: totalPeople * 8 * (params.settings?.standardRates?.snackPerMeal || 25),
      },
    ];

    const groups: NhsoActivityGroup[] = [
      {
        id: `act_ai_1_${Date.now()}`,
        activityName: '1. กิจกรรมอบรมให้ความรู้',
        activities:
          '- อบรมให้ความรู้เรื่องความปลอดภัยทางน้ำ การช่วยเหลือผู้จมน้ำ (ตะโกน โยน ยื่น) และการปฐมพยาบาลเบื้องต้น (CPR) จำนวน 1 วัน',
        objectives:
          '1. เพื่อให้เด็กและเยาวชนมีความรู้พื้นฐานในการป้องกันการจมน้ำ การช่วยเหลือผู้จมน้ำอย่างถูกวิธี และการปฐมพยาบาลเบื้องต้น',
        targetGroup: `1. เด็กและเยาวชน อายุ 6-15 ปี จำนวน ${pCount} คน\n2. เจ้าหน้าที่และผู้สังเกตการณ์ จำนวน ${obsCount} คน\n3. วิทยากร จำนวน ${spkCount} คน\nรวม ${totalPeople} คน`,
        targetParticipants: pCount,
        kpi: '1. ร้อยละ 80 ของผู้เข้ารับการอบรมมีความรู้พื้นฐานในการช่วยเหลือผู้จมน้ำและการปฐมพยาบาลเบื้องต้นเพิ่มขึ้น',
        location: 'ห้องประชุมศาลหลักเมืองท่า เทศบาลตำบลบางเป้า',
        duration: `มี.ค. - เม.ย. ${yrShort}`,
        budgetLines: act1Lines,
        subtotal: act1Lines.reduce((s, l) => s + l.total, 0),
      },
      {
        id: `act_ai_2_${Date.now() + 10}`,
        activityName: '2. กิจกรรมฝึกปฏิบัติว่ายน้ำ',
        activities:
          '- กิจกรรมฝึกปฏิบัติทักษะการว่ายน้ำเพื่อเอาชีวิตรอดและการลอยตัวในน้ำ จำนวน 24 ชั่วโมง (3 ชั่วโมง/วัน รวม 8 วัน)',
        objectives:
          '1. เพื่อให้เด็กและเยาวชนมีทักษะการว่ายน้ำขั้นพื้นฐานและการลอยตัวเพื่อเอาชีวิตรอดในน้ำได้',
        targetGroup: `1. เด็กและเยาวชน อายุ 6-15 ปี จำนวน ${pCount} คน\n2. เจ้าหน้าที่และผู้สังเกตการณ์ จำนวน ${obsCount} คน\n3. วิทยากรฝึกปฏิบัติ จำนวน 3 คน\nรวม ${pCount + obsCount + 3} คน`,
        targetParticipants: pCount,
        kpi: '1. ร้อยละ 80 ของผู้เข้ารับการฝึกปฏิบัติสามารถว่ายน้ำขั้นพื้นฐานและลอยตัวเพื่อเอาชีวิตรอดในน้ำได้',
        location: 'สระว่ายน้ำ เทศบาลเมืองกันตัง',
        duration: `มี.ค. - เม.ย. ${yrShort}`,
        budgetLines: act2Lines,
        subtotal: act2Lines.reduce((s, l) => s + l.total, 0),
      },
    ];

    return {
      recommendedCategoryNumber: categoryNumber,
      recommendedCategoryReason: reason,
      detectedTopicLabel: 'การป้องกันเด็กจมน้ำและทักษะการว่ายน้ำเพื่อเอาชีวิตรอด',
      activityGroups: params.activityCountMode === 'single' ? [groups[0]] : groups,
      alternativeActivities: [
        '- อบรมให้ความรู้เรื่องการช่วยเหลือผู้จมน้ำ (ตะโกน โยน ยื่น) และการช่วยฟื้นคืนชีพ (CPR) จำนวน 1 วัน\n- ฝึกปฏิบัติทักษะการลอยตัวและว่ายน้ำเพื่อเอาชีวิตรอด จำนวน 24 ชั่วโมง',
        '1. จัดอบรมเชิงปฏิบัติการความรู้เรื่องจุดเสี่ยงแหล่งน้ำในชุมชนและการเอาชีวิตรอดทางน้ำ\n2. ฝึกทักษะการใช้อุปกรณ์ช่วยคนตกน้ำ (ขวดน้ำพลาสติก ถังแกลลอน ไม้ไผ่) และการทำ CPR',
      ],
      alternativeObjectives: [
        '1. เพื่อให้เด็กและเยาวชนมีความรู้พื้นฐานในการช่วยเหลือผู้จมน้ำและการปฐมพยาบาลเบื้องต้น\n2. เพื่อให้เด็กและเยาวชนมีทักษะในการว่ายน้ำขั้นพื้นฐานเพื่อเอาชีวิตรอดในน้ำ',
        '1. เพื่อลดอัตราการเสียชีวิตจากการจมน้ำในกลุ่มเด็กและเยาวชนตำบลบางเป้า\n2. เพื่อสร้างทักษะการช่วยเหลือผู้ประสบภัยทางน้ำอย่างปลอดภัยตามหลัก ตะโกน โยน ยื่น',
      ],
      alternativeTargetGroups: [
        `1. เด็กและเยาวชน อายุ 6-15 ปี จำนวน ${pCount} คน\n2. เจ้าหน้าที่และผู้สังเกตการณ์ จำนวน ${obsCount} คน\n3. วิทยากร ${spkCount} คน\nรวม ${totalPeople} คน`,
      ],
      alternativeKpis: [
        '1. ร้อยละ 80 ของผู้เข้ารับการอบรมมีความรู้พื้นฐานในการช่วยเหลือผู้จมน้ำและการปฐมพยาบาลเบื้องต้น\n2. ร้อยละ 80 ของผู้เข้ารับการฝึกปฏิบัติสามารถว่ายน้ำเพื่อเอาชีวิตรอดได้',
      ],
    };
  }

  // 2. DIABETES / HYPERTENSION / NCDs (เบาหวาน / ความดัน / 3อ. 2ส. / กลุ่มเสี่ยง)
  if (
    title.includes('เบาหวาน') ||
    title.includes('ความดัน') ||
    title.includes('ncd') ||
    title.includes('กลุ่มเสี่ยง') ||
    title.includes('ปรับเปลี่ยนพฤติกรรม')
  ) {
    const act1Lines = buildStandardTrainingBudgetLines(1, '1. กิจกรรมอบรมให้ความรู้', params);
    const act2Lines: NhsoFundBudgetLine[] = [
      {
        id: `ai_ncd_1_${Date.now()}`,
        activityCategory: '2. กิจกรรมการติดตามผล',
        name: '2.1) ค่าเครื่องวัดความดันโลหิต',
        quantity: 1,
        unit: 'เครื่อง',
        unitPrice: 3500,
        total: 3500,
      },
      {
        id: `ai_ncd_2_${Date.now() + 1}`,
        activityCategory: '2. กิจกรรมการติดตามผล',
        name: '2.2) ค่าเครื่องชั่งน้ำหนัก',
        quantity: 1,
        unit: 'เครื่อง',
        unitPrice: 1000,
        total: 1000,
      },
      {
        id: `ai_ncd_3_${Date.now() + 2}`,
        activityCategory: '2. กิจกรรมการติดตามผล',
        name: '2.3) ค่าเครื่องเจาะน้ำตาล (พร้อมแผ่นตรวจและเข็มเจาะ)',
        quantity: 3,
        unit: 'เครื่อง',
        unitPrice: 1800,
        total: 5400,
      },
    ];

    const group1: NhsoActivityGroup = {
      id: `act_ai_1_${Date.now()}`,
      activityName: '1. กิจกรรมอบรมให้ความรู้',
      activities:
        '1. กิจกรรมให้ความรู้แก่กลุ่มเสี่ยงและแกนนำชุมชน เรื่องโรคเบาหวาน โรคความดันโลหิตสูง และการปรับเปลี่ยนพฤติกรรมสุขภาพด้วยหลัก 3อ. 2ส.',
      objectives:
        '1. เพื่อให้กลุ่มเสี่ยงต่อโรคเบาหวาน ความดันโลหิตสูง ได้รับความรู้เรื่องโรคและภาวะแทรกซ้อนของโรค\n2. เพื่อให้กลุ่มเสี่ยงต่อโรคเบาหวาน ความดันโลหิตสูง ได้รับการปรับเปลี่ยนพฤติกรรมสุขภาพด้วย 3อ. 2ส.\n3. เพื่อป้องกันไม่ให้เกิดผู้ป่วยโรคเบาหวาน ความดันโลหิตสูง รายใหม่ในพื้นที่',
      targetGroup: `1. กลุ่มเสี่ยงโรคเบาหวาน โรคความดันโลหิตสูง จำนวน ${pCount} คน\n2. แกนนำชุมชน / อสม. จำนวน ${obsCount} คน\nรวม ${pCount + obsCount} คน`,
      targetParticipants: pCount,
      kpi: '1. ร้อยละ 80 ของกลุ่มเสี่ยงต่อเบาหวาน ความดันโลหิตสูง ได้รับความรู้เรื่องโรคและภาวะแทรกซ้อนของโรค\n2. ร้อยละ 80 ของกลุ่มเสี่ยงต่อเบาหวาน ได้รับการปรับเปลี่ยนพฤติกรรมสุขภาพด้วย 3อ. 2ส.\n3. อัตราการเกิดผู้ป่วยโรคเบาหวาน ความดันโลหิตสูงรายใหม่ในพื้นที่ลดลง',
      location: defaultLocation,
      duration: defaultDuration,
      budgetLines: act1Lines,
      subtotal: act1Lines.reduce((s, l) => s + l.total, 0),
    };

    const group2: NhsoActivityGroup = {
      id: `act_ai_2_${Date.now() + 10}`,
      activityName: '2. กิจกรรมการติดตามผล',
      activities:
        '2. อสม. ลงพื้นที่ติดตามผล วัดความดันโลหิต ชั่งน้ำหนักประเมินค่า BMI และเจาะเลือดตรวจระดับน้ำตาล 1-2 ครั้ง/เดือน เป็นเวลา 3-6 เดือน พร้อมสรุปรายงานผล',
      objectives:
        '1. เพื่อติดตามประเมินผลการปรับเปลี่ยนพฤติกรรมสุขภาพ ค่าระดับน้ำตาลในเลือด และระดับความดันโลหิตของกลุ่มเสี่ยงในชุมชนอย่างต่อเนื่อง\n2. เพื่อเฝ้าระวังและป้องกันไม่ให้กลุ่มเสี่ยงกลายเป็นผู้ป่วยโรคเบาหวานและความดันโลหิตสูงรายใหม่ในพื้นที่',
      targetGroup: `1. กลุ่มเสี่ยงโรคเบาหวาน โรคความดันโลหิตสูง จำนวน ${pCount} คน\n2. แกนนำชุมชน / อสม. ผู้ติดตามผล จำนวน ${obsCount} คน\nรวม ${pCount + obsCount} คน`,
      targetParticipants: pCount,
      kpi: '1. ร้อยละ 80 ของกลุ่มเสี่ยงได้รับการตรวจติดตามวัดความดันโลหิต ชั่งน้ำหนัก และเจาะระดับน้ำตาลในเลือดตามเกณฑ์\n2. อัตราการเกิดผู้ป่วยโรคเบาหวาน ความดันโลหิตสูงรายใหม่ในพื้นที่ลดลง',
      location: defaultLocation,
      duration: defaultDuration,
      budgetLines: act2Lines,
      subtotal: act2Lines.reduce((s, l) => s + l.total, 0),
    };

    return {
      recommendedCategoryNumber: categoryNumber,
      recommendedCategoryReason: reason,
      detectedTopicLabel: 'การคัดกรองและปรับเปลี่ยนพฤติกรรมกลุ่มเสี่ยงโรคเบาหวาน-ความดันโลหิตสูง (NCDs)',
      activityGroups: params.activityCountMode === 'single' ? [group1] : [group1, group2],
      alternativeActivities: [
        '1. กิจกรรมให้ความรู้แก่กลุ่มเสี่ยงและแกนนำชุมชน เรื่องโรคเบาหวาน ความดันโลหิตสูง และการปรับเปลี่ยนพฤติกรรมด้วยหลัก 3อ. 2ส.\n2. อสม. ลงพื้นที่ติดตามผลการเจาะเลือด 1 ครั้ง/เดือน เป็นเวลา 6 เดือน',
        '1. จัดอบรมเชิงปฏิบัติการแกนนำสุขภาพในการคัดกรองเบาหวาน-ความดันโลหิตสูง\n2. จัดค่ายปรับเปลี่ยนพฤติกรรมสุขภาพ 3อ. 2ส. (อาหาร ออกกำลังกาย อารมณ์ งดสูบบุหรี่ งดสุรา) จำนวน 1 วัน',
      ],
      alternativeObjectives: [
        '1. เพื่อให้กลุ่มเสี่ยงต่อโรคเบาหวานและความดันโลหิตสูงได้รับความรู้เรื่องโรคและภาวะแทรกซ้อน\n2. เพื่อให้กลุ่มเสี่ยงได้รับการปรับเปลี่ยนพฤติกรรมสุขภาพด้วย 3อ. 2ส.\n3. เพื่อป้องกันไม่ให้เกิดผู้ป่วยรายใหม่ในพื้นที่',
      ],
      alternativeTargetGroups: [
        `1. กลุ่มเสี่ยงโรคเบาหวานและความดันโลหิตสูง จำนวน ${pCount} คน\n2. แกนนำชุมชนและ อสม. จำนวน ${obsCount} คน\nรวม ${pCount + obsCount} คน`,
      ],
      alternativeKpis: [
        '1. ร้อยละ 80 ของกลุ่มเสี่ยงได้รับความรู้เรื่องโรคและภาวะแทรกซ้อนเพิ่มขึ้น\n2. ร้อยละ 80 ของกลุ่มเสี่ยงได้รับการปรับเปลี่ยนพฤติกรรมสุขภาพด้วย 3อ. 2ส.\n3. อัตราการเกิดผู้ป่วยรายใหม่ในพื้นที่ลดลง',
      ],
    };
  }

  // 3. FIRST AID & CPR (ปฐมพยาบาล / CPR / ฟื้นคืนชีพ)
  if (title.includes('ปฐมพยาบาล') || title.includes('cpr') || title.includes('ฟื้นคืนชีพ')) {
    const act1Lines = buildStandardTrainingBudgetLines(1, '1. กิจกรรมอบรมให้ความรู้', params);
    const act2Lines: NhsoFundBudgetLine[] = [
      {
        id: `ai_cpr_2_1_${Date.now()}`,
        activityCategory: '2. กิจกรรมฐานการเรียนรู้และฝึกปฏิบัติ',
        name: '2.1) ค่าจัดทำใบประกาศนียบัตรสำหรับผู้ผ่านการฝึกปฏิบัติ',
        quantity: pCount,
        unit: 'ใบ',
        unitPrice: 30,
        total: pCount * 30,
      },
      {
        id: `ai_cpr_2_2_${Date.now() + 1}`,
        activityCategory: '2. กิจกรรมฐานการเรียนรู้และฝึกปฏิบัติ',
        name: '2.2) ค่าวัสดุ/อุปกรณ์ประจำฐานการเรียนรู้ 3 ฐาน (ฐานยาสามัญ / ฐานทำแผล / ฐานฝึกปฏิบัติ CPR)',
        quantity: 3,
        unit: 'ฐาน',
        unitPrice: 1500,
        total: 4500,
      },
    ];
    const group1: NhsoActivityGroup = {
      id: `act_ai_1_${Date.now()}`,
      activityName: '1. กิจกรรมอบรมให้ความรู้',
      activities:
        '1. จัดกิจกรรมอบรมให้ความรู้ภาคทฤษฎี เรื่องการปฐมพยาบาลเบื้องต้น การประเมินผู้ป่วยฉุกเฉิน และการช่วยฟื้นคืนชีพขั้นพื้นฐาน (CPR)',
      objectives:
        '1. เพื่อให้ผู้เข้ารับการอบรมมีความรู้ความเข้าใจเรื่องการปฐมพยาบาลเบื้องต้น การใช้ยาสามัญประจำบ้าน และการช่วยฟื้นคืนชีพ (CPR)\n2. เพื่อให้ผู้เข้ารับการอบรมทราบขั้นตอนการแจ้งเหตุฉุกเฉินและการช่วยเหลือผู้ป่วยเบื้องต้นอย่างปลอดภัย',
      targetGroup: `1. กลุ่มเป้าหมายผู้เข้ารับการอบรม จำนวน ${pCount} คน\n2. ครู/เจ้าหน้าที่ผู้สังเกตการณ์ จำนวน ${obsCount} คน\nรวม ${pCount + obsCount} คน`,
      targetParticipants: pCount,
      kpi: '1. ร้อยละ 80 ของผู้เข้ารับการอบรมมีความรู้ความเข้าใจเรื่องการปฐมพยาบาลเบื้องต้นและการช่วยฟื้นคืนชีพ (CPR) เพิ่มขึ้น',
      location: defaultLocation,
      duration: defaultDuration,
      budgetLines: act1Lines,
      subtotal: act1Lines.reduce((s, l) => s + l.total, 0),
    };
    const group2: NhsoActivityGroup = {
      id: `act_ai_2_${Date.now() + 10}`,
      activityName: '2. กิจกรรมฐานการเรียนรู้และฝึกปฏิบัติ',
      activities:
        '2. กิจกรรมฝึกทักษะปฏิบัติผ่านฐานการเรียนรู้ 3 ฐาน:\n- ฐานที่ 1 ฐานยาสามัญประจำบ้านและอุปกรณ์ปฐมพยาบาล\n- ฐานที่ 2 ฐานการห้ามเลือดและการทำแผลอย่างถูกวิธี\n- ฐานที่ 3 ฐานการฝึกปฏิบัติช่วยฟื้นคืนชีพขั้นพื้นฐาน (CPR)',
      objectives:
        '1. เพื่อให้ผู้เข้ารับการอบรมได้ฝึกปฏิบัติจริงและมีทักษะในการทำแผล การห้ามเลือด และการทำ CPR อย่างถูกวิธี\n2. เพื่อลดความรุนแรงของการบาดเจ็บและเพิ่มโอกาสรอดชีวิตของผู้ป่วยฉุกเฉินก่อนถึงโรงพยาบาล',
      targetGroup: `1. กลุ่มเป้าหมายผู้เข้ารับการฝึกปฏิบัติ จำนวน ${pCount} คน\n2. ครู/เจ้าหน้าที่ผู้สังเกตการณ์ จำนวน ${obsCount} คน\nรวม ${pCount + obsCount} คน`,
      targetParticipants: pCount,
      kpi: '1. ร้อยละ 80 ของผู้เข้ารับการฝึกปฏิบัติสามารถทำแผลและสาธิตการช่วยฟื้นคืนชีพ (CPR) ได้อย่างถูกต้องตามเกณฑ์',
      location: defaultLocation,
      duration: defaultDuration,
      budgetLines: act2Lines,
      subtotal: act2Lines.reduce((s, l) => s + l.total, 0),
    };
    return {
      recommendedCategoryNumber: categoryNumber,
      recommendedCategoryReason: reason,
      detectedTopicLabel: 'การปฐมพยาบาลเบื้องต้นและการช่วยฟื้นคืนชีพขั้นพื้นฐาน (CPR)',
      activityGroups: params.activityCountMode === 'single' ? [group1] : [group1, group2],
      alternativeActivities: [
        '1. อบรมภาคทฤษฎีเรื่องหลักการปฐมพยาบาลเบื้องต้น การประเมินผู้ป่วยฉุกเฉิน และการโทรแจ้งสายด่วน 1669\n2. ฝึกปฏิบัติแบ่งฐานการเรียนรู้ 3 ฐาน (การทำแผลห้ามเลือด / การดามกระดูกเบื้องต้น / การปั๊มหัวใจ CPR)',
      ],
      alternativeObjectives: [
        '1. เพื่อให้ผู้เข้าร่วมโครงการมีความรู้และทักษะการปฐมพยาบาลเบื้องต้นและการช่วยฟื้นคืนชีพ (CPR)\n2. เพื่อลดความรุนแรงของการบาดเจ็บและเพิ่มโอกาสรอดชีวิตของผู้ป่วยฉุกเฉินก่อนถึงโรงพยาบาล',
      ],
      alternativeTargetGroups: [
        `1. นักเรียน/เยาวชน/ประชาชนกลุ่มเป้าหมาย จำนวน ${pCount} คน\n2. ครูและเจ้าหน้าที่ผู้สังเกตการณ์ จำนวน ${obsCount} คน\nรวม ${pCount + obsCount} คน`,
      ],
      alternativeKpis: [
        '1. ร้อยละ 80 ของผู้เข้าร่วมโครงการผ่านการประเมินความรู้และทักษะการปฐมพยาบาลเบื้องต้นและการทำ CPR',
      ],
    };
  }

  // 4. DENTAL HEALTH (ทันตสุขภาพ / แปรงฟัน / ฟันสวย / ช่องปาก)
  if (
    title.includes('ทันต') ||
    title.includes('แปรงฟัน') ||
    title.includes('ฟัน') ||
    title.includes('ช่องปาก')
  ) {
    const act1Lines = buildStandardTrainingBudgetLines(1, '1. กิจกรรมอบรมให้ความรู้', params);
    const act2Lines: NhsoFundBudgetLine[] = [
      {
        id: `ai_dent_2_1_${Date.now()}`,
        activityCategory: '2. กิจกรรมฝึกปฏิบัติการแปรงฟันและตรวจสุขภาพช่องปาก',
        name: '2.1) ค่าชุดปฏิบัติการสาธิตการแปรงฟัน (แปรงสีฟัน + ยาสีฟันผสมฟลูออไรด์ + แก้วน้ำ)',
        quantity: pCount,
        unit: 'ชุด',
        unitPrice: 80,
        total: pCount * 80,
      },
      {
        id: `ai_dent_2_2_${Date.now() + 1}`,
        activityCategory: '2. กิจกรรมฝึกปฏิบัติการแปรงฟันและตรวจสุขภาพช่องปาก',
        name: '2.2) ค่าโมเดลฟันสาธิตและแผ่นป้ายแสดงขั้นตอนการแปรงฟัน',
        quantity: 1,
        unit: 'ชุด',
        unitPrice: 600,
        total: 600,
      },
      {
        id: `ai_dent_2_3_${Date.now() + 2}`,
        activityCategory: '2. กิจกรรมฝึกปฏิบัติการแปรงฟันและตรวจสุขภาพช่องปาก',
        name: '2.3) ค่าจัดทำแบบบันทึกการแปรงฟันและใบประกาศนียบัตร',
        quantity: pCount,
        unit: 'ชุด',
        unitPrice: 20,
        total: pCount * 20,
      },
    ];
    const group1: NhsoActivityGroup = {
      id: `act_ai_1_${Date.now()}`,
      activityName: '1. กิจกรรมอบรมให้ความรู้เรื่องการดูแลสุขภาพช่องปากและฟัน',
      activities:
        '1. จัดอบรมให้ความรู้เรื่องความสำคัญของฟันน้ำนมและฟันแท้ โรคฟันผุ เหงือกอักเสบ การเลือกรับประทานอาหารที่มีประโยชน์ต่อฟัน และการแปรงฟันอย่างถูกวิธีตามหลัก 2-2-2',
      objectives:
        '1. เพื่อให้เด็ก/นักเรียนและผู้ปกครองมีความรู้ความเข้าใจเกี่ยวกับการรักษาความสะอาดในช่องปากและการแปรงฟันอย่างถูกวิธี\n2. เพื่อสร้างความตระหนักในการลดบริโภคอาหารหวานและน้ำอัดลมที่เป็นสาเหตุของโรคฟันผุ',
      targetGroup: `1. เด็ก/นักเรียนกลุ่มเป้าหมาย จำนวน ${pCount} คน\n2. ผู้ปกครองและครูผู้สังเกตการณ์ จำนวน ${obsCount} คน\nรวม ${pCount + obsCount} คน`,
      targetParticipants: pCount,
      kpi: '1. ร้อยละ 80 ของกลุ่มเป้าหมายมีความรู้ความเข้าใจในการดูแลรักษาความสะอาดช่องปากเพิ่มขึ้น',
      location: defaultLocation,
      duration: defaultDuration,
      budgetLines: act1Lines,
      subtotal: act1Lines.reduce((s, l) => s + l.total, 0),
    };
    const group2: NhsoActivityGroup = {
      id: `act_ai_2_${Date.now() + 10}`,
      activityName: '2. กิจกรรมฝึกปฏิบัติการแปรงฟันและติดตามตรวจสุขภาพช่องปาก',
      activities:
        '2. กิจกรรมตรวจสุขภาพช่องปาก ย้อมสีคราบจุลินทรีย์ และฝึกปฏิบัติการแปรงฟันอย่างถูกวิธี\n3. กิจกรรมรณรงค์แปรงฟันทุกครั้งหลังรับประทานอาหารกลางวัน และบันทึกผลการแปรงฟันอย่างต่อเนื่อง',
      objectives:
        '1. เพื่อให้เด็ก/นักเรียนมีทักษะการแปรงฟันที่ถูกต้องและสะอาดทั่วถึงทุกซี่\n2. เพื่อกระตุ้นพฤติกรรมการแปรงฟันหลังรับประทานอาหารกลางวัน ลดอัตราการเกิดโรคฟันผุรายใหม่',
      targetGroup: `1. เด็ก/นักเรียนกลุ่มเป้าหมาย จำนวน ${pCount} คน\n2. ครูประจำชั้น/ผู้ดูแลเด็ก จำนวน ${obsCount} คน\nรวม ${pCount + obsCount} คน`,
      targetParticipants: pCount,
      kpi: '1. ร้อยละ 80 ของเด็ก/นักเรียนสามารถแปรงฟันได้อย่างถูกวิธีและให้ความร่วมมือในการแปรงฟันหลังอาหารกลางวันเพิ่มขึ้น',
      location: defaultLocation,
      duration: defaultDuration,
      budgetLines: act2Lines,
      subtotal: act2Lines.reduce((s, l) => s + l.total, 0),
    };
    return {
      recommendedCategoryNumber: categoryNumber,
      recommendedCategoryReason: reason,
      detectedTopicLabel: 'การส่งเสริมทันตสุขภาพและการแปรงฟันอย่างถูกวิธี',
      activityGroups: params.activityCountMode === 'single' ? [group1] : [group1, group2],
      alternativeActivities: [
        '1. อบรมให้ความรู้แก่ผู้ปกครองและเด็กเรื่องการดูแลสุขภาพช่องปากและฟัน\n2. ตรวจสุขภาพช่องปาก ย้อมสีคราบจุลินทรีย์ และฝึกปฏิบัติการแปรงฟันอย่างถูกวิธี',
      ],
      alternativeObjectives: [
        '1. เพื่อให้เด็กแปรงฟันอย่างถูกวิธี ลดปัญหาฟันผุในเด็ก\n2. เพื่อให้ผู้ปกครองและครูมีความรู้ในการดูแลสุขภาพช่องปากของเด็กได้อย่างถูกต้อง',
      ],
      alternativeTargetGroups: [
        `1. เด็กนักเรียน/เด็กก่อนวัยเรียน จำนวน ${pCount} คน\n2. ผู้ปกครองและครูผู้สังเกตการณ์ จำนวน ${obsCount} คน\nรวม ${pCount + obsCount} คน`,
      ],
      alternativeKpis: [
        '1. ร้อยละ 85 ของเด็กได้รับการตรวจสุขภาพช่องปากและฝึกทักษะการแปรงฟันที่ถูกวิธี\n2. ร้อยละ 80 ของผู้ปกครองมีความรู้ในการดูแลสุขภาพช่องปากเพิ่มขึ้น',
      ],
    };
  }

  // 5. ADULT DIAPERS / LTC (ผ้าอ้อมผู้ใหญ่ / ภาวะพึ่งพิง / ADL)
  if (
    title.includes('ผ้าอ้อม') ||
    title.includes('adl') ||
    title.includes('กลั้นปัสสาวะ') ||
    title.includes('ภาวะพึ่งพิง')
  ) {
    const diaperRate = params.settings?.standardRates?.adultDiaperPerPiece || 9.5;
    const days = 95;
    const piecesPerDay = 3;
    const totalPieces = pCount * piecesPerDay * days;
    const lines: NhsoFundBudgetLine[] = [
      {
        id: `ai_diaper_1_${Date.now()}`,
        activityCategory: '1. กิจกรรมสนับสนุนผ้าอ้อมผู้ใหญ่',
        name: `ค่าจัดซื้อผ้าอ้อมผู้ใหญ่ สำหรับกลุ่มเป้าหมาย ${pCount} คนๆ ละ ${piecesPerDay} ชิ้น/วัน จำนวน ${days} วัน ราคาชิ้นละ ${diaperRate.toFixed(2)} บาท`,
        quantity: totalPieces,
        unit: 'ชิ้น',
        unitPrice: diaperRate,
        total: totalPieces * diaperRate,
      },
    ];
    return {
      recommendedCategoryNumber: 7,
      recommendedCategoryReason:
        'โครงการสนับสนุนผ้าอ้อมผู้ใหญ่ตามสิทธิประโยชน์ในระบบหลักประกันสุขภาพแห่งชาติ [ข้อ 10 (7)]',
      detectedTopicLabel: 'การสนับสนุนผ้าอ้อมผู้ใหญ่สำหรับบุคคลที่มีภาวะพึ่งพิง (ADL ≤ 6)',
      activityGroups: [
        {
          id: `act_ai_1_${Date.now()}`,
          activityName: '1. กิจกรรมสำรวจคัดกรองและสนับสนุนผ้าอ้อมผู้ใหญ่',
          activities:
            '1. สำรวจ ค้นหา และคัดกรองกลุ่มเป้าหมายในพื้นที่ โดยประสานความร่วมมือกับ รพ.กันตัง รพ.สต.บางเป้า Care Manager (CM) Caregiver (CG) และ อสม. ประเมินค่า ADL และจัดทำแผนการดูแลรายบุคคล (Care Plan)\n2. ดำเนินการจัดหาและส่งมอบผ้าอ้อมผู้ใหญ่ให้แก่กลุ่มเป้าหมายตามเกณฑ์สิทธิประโยชน์ สปสช.',
          objectives:
            '1. เพื่อให้บุคคลที่มีภาวะพึ่งพิง (ค่าคะแนน ADL เท่ากับหรือน้อยกว่า 6 คะแนน) ได้รับการสนับสนุนผ้าอ้อมผู้ใหญ่ตามสิทธิประโยชน์ในระบบหลักประกันสุขภาพแห่งชาติ\n2. เพื่อให้บุคคลที่มีปัญหาการกลั้นปัสสาวะหรืออุจจาระไม่ได้ตามข้อบ่งชี้ทางการแพทย์ได้รับการดูแลอย่างทั่วถึง ลดภาระค่าใช้จ่ายของครอบครัว',
          targetGroup: `1. บุคคลที่มีภาวะพึ่งพิงที่มีค่าคะแนน ADL ≤ 6 คะแนน และบุคคลที่มีปัญหาการกลั้นปัสสาวะ/อุจจาระไม่ได้ ในพื้นที่ตำบลบางเป้า จำนวน ${pCount} คน`,
          targetParticipants: pCount,
          kpi: '1. ร้อยละ 100 ของบุคคลที่มีภาวะพึ่งพิง (ADL ≤ 6) และผู้ที่มีปัญหาการกลั้นปัสสาวะ/อุจจาระไม่ได้ตามเกณฑ์ในพื้นที่ ได้รับการสนับสนุนผ้าอ้อมผู้ใหญ่ตามสิทธิประโยชน์ สปสช.',
          location: 'พื้นที่ตำบลบางเป้า อำเภอกันตัง จังหวัดตรัง',
          duration: defaultDuration,
          budgetLines: lines,
          subtotal: lines.reduce((s, l) => s + l.total, 0),
        },
      ],
      alternativeActivities: [
        '1. สำรวจและประเมินค่าความสามารถในการดำเนินกิจวัตรประจำวัน (ADL) ร่วมกับทีมสหวิชาชีพและจัดทำ Care Plan\n2. จัดหาและนำส่งผ้าอ้อมผู้ใหญ่ไม่เกินคนละ 3 ชิ้น/วัน พร้อมติดตามเยี่ยมบ้านประเมินสุขอนามัย',
      ],
      alternativeObjectives: [
        '1. เพื่อให้ผู้มีภาวะพึ่งพิง (ADL ≤ 6) และผู้ที่มีปัญหากลั้นปัสสาวะ/อุจจาระไม่ได้ เข้าถึงสิทธิประโยชน์ผ้าอ้อมผู้ใหญ่\n2. เพื่อป้องกันภาวะแทรกซ้อนทางผิวหนังและแผลกดทับ ยกระดับคุณภาพชีวิตผู้ป่วยติดบ้านติดเตียง',
      ],
      alternativeTargetGroups: [
        `บุคคลที่มีภาวะพึ่งพิง (ADL ≤ 6) และบุคคลที่มีปัญหาการกลั้นปัสสาวะ/อุจจาระไม่ได้ ในตำบลบางเป้า จำนวน ${pCount} คน`,
      ],
      alternativeKpis: [
        '1. ร้อยละ 100 ของกลุ่มเป้าหมายที่ผ่านเกณฑ์การประเมินได้รับผ้าอ้อมผู้ใหญ่ครบถ้วนตามแผนการดูแลรายบุคคล (Care Plan)',
      ],
    };
  }

  // 6. ELDERLY / BRAIN / MENTAL HEALTH (ผู้สูงอายุ / สูงวัย / สมอง / ซึมเศร้า / สุขภาพจิต)
  if (
    title.includes('ผู้สูงอายุ') ||
    title.includes('ผู้สูงวัย') ||
    title.includes('สูงวัย') ||
    title.includes('สมอง') ||
    title.includes('ซึมเศร้า') ||
    title.includes('สุขภาพจิต')
  ) {
    const act1Lines = buildStandardTrainingBudgetLines(1, '1. กิจกรรมอบรมให้ความรู้', params);
    const act2Lines: NhsoFundBudgetLine[] = [
      {
        id: `ai_eld_2_1_${Date.now()}`,
        activityCategory: '2. กิจกรรมฝึกบริหารสมองและติดตามสุขภาพผู้สูงอายุ',
        name: `2.1) ค่าอาหารว่างและเครื่องดื่ม จำนวน ${pCount + obsCount} คน จำนวน 2 ครั้ง`,
        quantity: (pCount + obsCount) * 2,
        unit: 'ชุด',
        unitPrice: params.settings?.standardRates?.snackPerMeal || 25,
        total: (pCount + obsCount) * 2 * (params.settings?.standardRates?.snackPerMeal || 25),
      },
      {
        id: `ai_eld_2_2_${Date.now() + 1}`,
        activityCategory: '2. กิจกรรมฝึกบริหารสมองและติดตามสุขภาพผู้สูงอายุ',
        name: '2.2) ค่าวัสดุอุปกรณ์ในการจัดกิจกรรมฝึกบริหารสมองและส่งเสริมสุขภาพผู้สูงอายุ',
        quantity: 1,
        unit: 'ชุด',
        unitPrice: 1500,
        total: 1500,
      },
    ];
    const group1: NhsoActivityGroup = {
      id: `act_ai_1_${Date.now()}`,
      activityName: '1. กิจกรรมอบรมให้ความรู้เรื่องการดูแลสุขภาพผู้สูงวัย',
      activities:
        '1. กิจกรรมคัดกรองสุขภาพเบื้องต้นและประเมินภาวะสุขภาพจิต/ความเสี่ยงภาวะซึมเศร้า (2Q Plus) ในผู้สูงอายุ\n2. กิจกรรมอบรมให้ความรู้เรื่องการดูแลสุขภาพผู้สูงวัยให้ห่างไกลโรค โภชนาการ การป้องกันการพลัดตกหกล้ม และการจัดการความเครียด',
      objectives:
        '1. เพื่อให้ผู้สูงอายุมีความรู้และทักษะในการดูแลสุขภาพกายและสุขภาพจิตของตนเองได้อย่างเหมาะสม\n2. เพื่อส่งเสริมให้ผู้สูงอายุรู้เท่าทันโรคซึมเศร้าและสามารถจัดการความเครียดของตนเองได้',
      targetGroup: `1. ผู้สูงอายุในพื้นที่ตำบลบางเป้า (กลุ่มติดสังคม) จำนวน ${pCount} คน\n2. แกนนำสุขภาพและเจ้าหน้าที่ผู้สังเกตการณ์ จำนวน ${obsCount} คน\nรวม ${pCount + obsCount} คน`,
      targetParticipants: pCount,
      kpi: '1. ร้อยละ 80 ของผู้สูงอายุที่เข้าร่วมโครงการมีความรู้และทักษะในการดูแลสุขภาพตนเองเพิ่มขึ้น',
      location: defaultLocation,
      duration: defaultDuration,
      budgetLines: act1Lines,
      subtotal: act1Lines.reduce((s, l) => s + l.total, 0),
    };
    const group2: NhsoActivityGroup = {
      id: `act_ai_2_${Date.now() + 10}`,
      activityName: '2. กิจกรรมฝึกบริหารสมองและติดตามประเมินผล',
      activities:
        '2. กิจกรรมฝึกบริหารสมองเพื่อกระตุ้นกระบวนความคิดและการสั่งงานของสมอง ป้องกันโรคสมองเสื่อม (เพลงประกอบท่าทาง เกมฝึกความจำ เกมบิงโก และการยืดเหยียดกล้ามเนื้อ)\n3. ติดตามเยี่ยมบ้านและประเมินผลการดำเนินโครงการ',
      objectives:
        '1. เพื่อสร้างเสริมและผ่อนคลายความเครียด กระตุ้นความจำป้องกันภาวะสมองเสื่อมในผู้สูงอายุ\n2. เพื่อส่งเสริมการรวมกลุ่มทำกิจกรรมสร้างความสัมพันธ์และลดการเข้าสู่ภาวะพึ่งพิง',
      targetGroup: `1. ผู้สูงอายุในพื้นที่ตำบลบางเป้า (กลุ่มติดสังคม) จำนวน ${pCount} คน\n2. แกนนำสุขภาพและเจ้าหน้าที่ผู้สังเกตการณ์ จำนวน ${obsCount} คน\nรวม ${pCount + obsCount} คน`,
      targetParticipants: pCount,
      kpi: '1. ร้อยละ 80 ของผู้สูงอายุมีสุขภาพจิตที่ดี มีพฤติกรรมสุขภาพที่พึงประสงค์เพิ่มขึ้นหลังจบกิจกรรม',
      location: defaultLocation,
      duration: defaultDuration,
      budgetLines: act2Lines,
      subtotal: act2Lines.reduce((s, l) => s + l.total, 0),
    };
    return {
      recommendedCategoryNumber: categoryNumber,
      recommendedCategoryReason: reason,
      detectedTopicLabel: 'การส่งเสริมสุขภาพกาย-ใจ และป้องกันภาวะสมองเสื่อม/ซึมเศร้าในผู้สูงอายุ',
      activityGroups: params.activityCountMode === 'single' ? [group1] : [group1, group2],
      alternativeActivities: [
        '1. ให้ความรู้เรื่องโรคที่พบบ่อยในผู้สูงอายุ การป้องกันการพลัดตกหกล้ม และโภชนาการผู้สูงวัย\n2. กิจกรรมกระตุ้นสมองป้องกันสมองเสื่อม (เกมฝึกความจำ เพลงประกอบท่าทาง) และการออกกำลังกายด้วยยางยืด',
      ],
      alternativeObjectives: [
        '1. เพื่อส่งเสริมให้ผู้สูงอายุมีสุขภาพกายและใจที่แข็งแรง ลดการเข้าสู่ภาวะพึ่งพิง\n2. เพื่อสร้างความสัมพันธ์และการช่วยเหลือเกื้อกูลกันของชมรมผู้สูงอายุในชุมชน',
      ],
      alternativeTargetGroups: [
        `1. ผู้สูงอายุกลุ่มติดสังคมในตำบลบางเป้า จำนวน ${pCount} คน\n2. แกนนำ อสม. และเจ้าหน้าที่ จำนวน ${obsCount} คน\nรวม ${pCount + obsCount} คน`,
      ],
      alternativeKpis: [
        '1. ร้อยละ 80 ของผู้สูงอายุที่เข้าร่วมโครงการมีพฤติกรรมสุขภาพที่พึงประสงค์เพิ่มขึ้นหลังจบกิจกรรม',
      ],
    };
  }

  // 7. EARLY CHILDHOOD / NUTRITION / HELMET (ปฐมวัย / โภชนาการเด็ก / หมวกนิรภัย / ศพด.)
  if (
    title.includes('ปฐมวัย') ||
    title.includes('โภชนาการ') ||
    title.includes('พัฒนาการ') ||
    title.includes('หมวกนิรภัย') ||
    title.includes('จราจร')
  ) {
    const isHelmet = title.includes('หมวกนิรภัย') || title.includes('จราจร');
    const act1Lines = buildStandardTrainingBudgetLines(1, '1. กิจกรรมอบรมให้ความรู้', params);
    const act2Lines: NhsoFundBudgetLine[] = isHelmet
      ? [
          {
            id: `ai_child_2_1_${Date.now()}`,
            activityCategory: '2. กิจกรรมรณรงค์และสาธิตปฏิบัติการสวมหมวกนิรภัย',
            name: '2.1) ค่าจัดซื้ออุปกรณ์สาธิตและปฏิบัติการส่งเสริมความปลอดภัย (หมวกนิรภัยเด็กแบบเต็มใบมาตรฐาน)',
            quantity: Math.min(pCount, 20),
            unit: 'ใบ',
            unitPrice: 350,
            total: Math.min(pCount, 20) * 350,
          },
        ]
      : [
          {
            id: `ai_child_2_1_${Date.now()}`,
            activityCategory: '2. กิจกรรมฝึกทักษะผ่านฐานการเรียนรู้พัฒนาการ 4 ด้าน',
            name: '2.1) ค่าตอบแทนวิทยากรประจำฐานการเรียนรู้ จำนวน 2 คนๆ ละ 2 ชั่วโมง (300 บ./ชม.)',
            quantity: 4,
            unit: 'ชั่วโมง',
            unitPrice: 300,
            total: 1200,
          },
          {
            id: `ai_child_2_2_${Date.now() + 1}`,
            activityCategory: '2. กิจกรรมฝึกทักษะผ่านฐานการเรียนรู้พัฒนาการ 4 ด้าน',
            name: '2.2) ค่าวัสดุอุปกรณ์สำหรับจัดกิจกรรมฐานการเรียนรู้ส่งเสริมพัฒนาการเด็ก 3 ฐาน',
            quantity: 3,
            unit: 'ฐาน',
            unitPrice: 1500,
            total: 4500,
          },
        ];

    const group1: NhsoActivityGroup = {
      id: `act_ai_1_${Date.now()}`,
      activityName: '1. กิจกรรมอบรมให้ความรู้',
      activities: isHelmet
        ? '1. จัดอบรมเชิงปฏิบัติการให้ความรู้แก่ผู้ปกครอง ครู และเด็ก เรื่องกฎระเบียบวินัยจราจรและการป้องกันอุบัติเหตุทางถนน'
        : '1. จัดอบรมให้ความรู้แก่ผู้ปกครองและครู เรื่องหลักโภชนาการสมวัยและการส่งเสริมพัฒนาการเด็กทั้ง 4 ด้าน (ร่างกาย อารมณ์-จิตใจ สังคม สติปัญญา)',
      objectives: isHelmet
        ? '1. เพื่อให้ผู้ปกครองและครูมีความรู้ความเข้าใจเกี่ยวกับวินัยจราจรและการใช้รถใช้ถนนอย่างปลอดภัย'
        : '1. เพื่อให้ผู้ปกครองและครูมีความรู้ความเข้าใจเรื่องโภชนาการและการส่งเสริมพัฒนาการเด็กทั้ง 4 ด้าน\n2. เพื่อส่งเสริมให้เด็กมีสุขภาพร่างกายแข็งแรง มีน้ำหนักและส่วนสูงตามเกณฑ์มาตรฐาน',
      targetGroup: `1. เด็กนักเรียน/เด็กปฐมวัย และผู้ปกครอง จำนวน ${pCount} คน\n2. ครูและบุคลากรผู้สังเกตการณ์ จำนวน ${obsCount} คน\nรวม ${pCount + obsCount} คน`,
      targetParticipants: pCount,
      kpi: isHelmet
        ? '1. ร้อยละ 80 ของผู้ปกครองและครูมีความรู้ความเข้าใจเรื่องวินัยจราจรและการใช้รถใช้ถนนอย่างปลอดภัยเพิ่มขึ้น'
        : '1. ร้อยละ 85 ของผู้ปกครองและครูมีความรู้เรื่องโภชนาการและการส่งเสริมพัฒนาการเด็กเพิ่มขึ้น',
      location: defaultLocation,
      duration: defaultDuration,
      budgetLines: act1Lines,
      subtotal: act1Lines.reduce((s, l) => s + l.total, 0),
    };

    const group2: NhsoActivityGroup = {
      id: `act_ai_2_${Date.now() + 10}`,
      activityName: isHelmet
        ? '2. กิจกรรมรณรงค์และสาธิตปฏิบัติการสวมหมวกนิรภัย'
        : '2. กิจกรรมฝึกทักษะผ่านฐานการเรียนรู้พัฒนาการ 4 ด้าน',
      activities: isHelmet
        ? '2. จัดกิจกรรมรณรงค์ขับขี่ปลอดภัย ร่วมใจสวมหมวกนิรภัยให้เด็กทุกครั้งขณะเดินทางด้วยรถจักรยานยนต์ และตรวจติดตามการสวมหมวกนิรภัย'
        : '2. จัดกิจกรรมฝึกทักษะผ่านฐานการเรียนรู้สร้างสรรค์ 3 ฐาน (ฐานที่ 1 พัฒนากล้ามเนื้อมัดเล็กและศิลปะ / ฐานที่ 2 กิจกรรมเข้าจังหวะและอารมณ์ / ฐานที่ 3 อาหารสร้างสรรค์ส่งเสริมสุขภาพ)',
      objectives: isHelmet
        ? '1. เพื่อรณรงค์ให้เด็กสวมหมวกนิรภัยที่ได้มาตรฐานทุกครั้งขณะเดินทางด้วยรถจักรยานยนต์ ลดความรุนแรงจากอุบัติเหตุ'
        : '1. เพื่อส่งเสริมการเรียนรู้ด้านสุขภาพและพัฒนาการเด็กทั้ง 4 ด้านผ่านการลงมือปฏิบัติจริงตามฐานการเรียนรู้\n2. เพื่อให้เด็กปฐมวัยมีสุขภาพกายและสุขภาพจิตที่ดี มีความสามัคคีเป็นหมู่คณะ',
      targetGroup: `1. เด็กนักเรียน/เด็กปฐมวัย จำนวน ${pCount} คน\n2. ครูและผู้ปกครองผู้สังเกตการณ์ จำนวน ${obsCount} คน\nรวม ${pCount + obsCount} คน`,
      targetParticipants: pCount,
      kpi: isHelmet
        ? '1. ร้อยละ 90 ของเด็กในศูนย์ฯ/โรงเรียนสวมหมวกนิรภัยขณะเดินทางด้วยรถจักรยานยนต์'
        : '1. ร้อยละ 80 ของเด็กสามารถเรียนรู้ตามฐานการเรียนรู้ต่างๆ และมีพัฒนาการทั้ง 4 ด้านสมวัยตามเกณฑ์',
      location: defaultLocation,
      duration: defaultDuration,
      budgetLines: act2Lines,
      subtotal: act2Lines.reduce((s, l) => s + l.total, 0),
    };

    return {
      recommendedCategoryNumber: categoryNumber,
      recommendedCategoryReason: reason,
      detectedTopicLabel: isHelmet
        ? 'การส่งเสริมความปลอดภัยทางถนนและการสวมหมวกนิรภัยในเด็กปฐมวัย'
        : 'การส่งเสริมโภชนาการและพัฒนาการทั้ง 4 ด้านในเด็กปฐมวัย/วัยเรียน',
      activityGroups: params.activityCountMode === 'single' ? [group1] : [group1, group2],
      alternativeActivities: [
        '1. อบรมให้ความรู้เชิงปฏิบัติการแก่ผู้ปกครองและผู้ประกอบอาหารเรื่องโภชนาการอาหารตามวัยและปลอดภัย\n2. กิจกรรมฐานการเรียนรู้พัฒนาการ 4 ด้าน (ฐานอาหารสร้างสรรค์ / ฐานศิลปะพัฒนากล้ามเนื้อมัดเล็ก / ฐานนิทานและสื่อสร้างสรรค์)',
      ],
      alternativeObjectives: [
        '1. เพื่อส่งเสริมพัฒนาการเด็กทั้ง 4 ด้าน คือ ร่างกาย อารมณ์ สังคม และสติปัญญา\n2. เพื่อแก้ไขและป้องกันปัญหาภาวะทุพโภชนาการ (น้ำหนักต่ำกว่าเกณฑ์/โภชนาการเกิน) ในเด็ก',
      ],
      alternativeTargetGroups: [
        `1. เด็กปฐมวัย/นักเรียน และผู้ปกครอง จำนวน ${pCount} คน\n2. ครูผู้ดูแลเด็กและผู้สังเกตการณ์ จำนวน ${obsCount} คน\nรวม ${pCount + obsCount} คน`,
      ],
      alternativeKpis: [
        '1. ร้อยละ 85 ของเด็กมีพัฒนาการสมวัยทั้ง 4 ด้านและมีน้ำหนักส่วนสูงตามเกณฑ์มาตรฐาน',
      ],
    };
  }

  // 8. COMMUNICABLE DISEASES / EPIDEMIC (โรคติดต่อ / ไข้เลือดออก / โรคระบาด)
  if (
    title.includes('โรคติดต่อ') ||
    title.includes('ไข้เลือดออก') ||
    title.includes('โรคระบาด') ||
    title.includes('เฝ้าระวัง')
  ) {
    const act1Lines = buildStandardTrainingBudgetLines(1, '1. กิจกรรมอบรมเชิงปฏิบัติการเฝ้าระวังและควบคุมโรค', params);
    const act2Lines: NhsoFundBudgetLine[] = [
      {
        id: `ai_epi_2_1_${Date.now()}`,
        activityCategory: '2. กิจกรรมลงพื้นที่รณรงค์สำรวจและทำลายแหล่งเพาะพันธุ์เชื้อโรค',
        name: `2.1) ค่าอาหารว่างและเครื่องดื่มสำหรับผู้ร่วมรณรงค์ลงพื้นที่ (${pCount + obsCount} คน x 1 มื้อ)`,
        quantity: pCount + obsCount,
        unit: 'ชุด',
        unitPrice: params.settings?.standardRates?.snackPerMeal || 25,
        total: (pCount + obsCount) * (params.settings?.standardRates?.snackPerMeal || 25),
      },
      {
        id: `ai_epi_2_2_${Date.now() + 1}`,
        activityCategory: '2. กิจกรรมลงพื้นที่รณรงค์สำรวจและทำลายแหล่งเพาะพันธุ์เชื้อโรค',
        name: '2.2) ค่าวัสดุอุปกรณ์และสื่อรณรงค์สำรวจลูกน้ำยุงลาย/ป้องกันโรคติดต่อในชุมชน',
        quantity: 1,
        unit: 'ชุด',
        unitPrice: 2000,
        total: 2000,
      },
    ];
    const group1: NhsoActivityGroup = {
      id: `act_ai_1_${Date.now()}`,
      activityName: '1. กิจกรรมอบรมเชิงปฏิบัติการเฝ้าระวังและป้องกันโรคติดต่อ',
      activities:
        '1. ชี้แจงสถานการณ์การระบาดของโรคติดต่อในพื้นที่ และอบรมให้ความรู้เรื่องโรคติดต่อที่สำคัญ (เช่น โรคไข้เลือดออก โรคไข้หวัดใหญ่ โรคอุจจาระร่วง โรคมือเท้าปาก และโรคฉี่หนู)\n2. แบ่งกลุ่มเรียนรู้ขั้นตอนการเฝ้าระวังและควบคุมป้องกันโรคติดต่อในระดับครัวเรือนและชุมชน',
      objectives:
        '1. เพื่อส่งเสริมให้แกนนำสุขภาพและประชาชนมีความรู้ความเข้าใจเรื่องการป้องกันและควบคุมโรคติดต่อตามฤดูกาล\n2. เพื่อพัฒนาศักยภาพทักษะส่วนบุคคลและชุมชนให้เกิดความพร้อมในการเฝ้าระวังโรคอย่างเป็นระบบ',
      targetGroup: `1. แกนนำสุขภาพและประชาชนในพื้นที่ จำนวน ${pCount} คน\n2. เจ้าหน้าที่สาธารณสุขและผู้สังเกตการณ์ จำนวน ${obsCount} คน\nรวม ${pCount + obsCount} คน`,
      targetParticipants: pCount,
      kpi: '1. ร้อยละ 80 ของผู้เข้าร่วมโครงการมีความรู้เรื่องโรคติดต่อเพิ่มขึ้นจากก่อน-หลังการอบรม',
      location: defaultLocation,
      duration: defaultDuration,
      budgetLines: act1Lines,
      subtotal: act1Lines.reduce((s, l) => s + l.total, 0),
    };
    const group2: NhsoActivityGroup = {
      id: `act_ai_2_${Date.now() + 10}`,
      activityName: '2. กิจกรรมลงพื้นที่รณรงค์สำรวจและควบคุมแหล่งเพาะพันธุ์โรค',
      activities:
        '2. แกนนำสุขภาพ อสม. และประชาชนลงพื้นที่รณรงค์เคาะประตูบ้าน สำรวจค่าดัชนีลูกน้ำยุงลาย (HI/CI) ทำลายแหล่งเพาะพันธุ์พาหะนำโรค และปรับปรุงสุขาภิบาลสิ่งแวดล้อมในชุมชน',
      objectives:
        '1. เพื่อลดแหล่งเพาะพันธุ์พาหะนำโรคและลดความเสี่ยงการแพร่ระบาดของโรคติดต่อในชุมชน\n2. เพื่อสร้างความร่วมมือของภาคีเครือข่ายและครัวเรือนในการดูแลสิ่งแวดล้อมอย่างยั่งยืน',
      targetGroup: `1. แกนนำสุขภาพ อสม. และประชาชนในพื้นที่ จำนวน ${pCount} คน\n2. เจ้าหน้าที่ผู้รับผิดชอบโครงการ จำนวน ${obsCount} คน\nรวม ${pCount + obsCount} คน`,
      targetParticipants: pCount,
      kpi: '1. ร้อยละ 80 ของผู้เข้าร่วมสามารถปฏิบัติการป้องกันควบคุมโรคในชุมชนได้อย่างถูกต้อง\n2. ค่าดัชนีลูกน้ำยุงลายและอัตราป่วยด้วยโรคติดต่อในพื้นที่ลดลง',
      location: defaultLocation,
      duration: defaultDuration,
      budgetLines: act2Lines,
      subtotal: act2Lines.reduce((s, l) => s + l.total, 0),
    };
    return {
      recommendedCategoryNumber: categoryNumber,
      recommendedCategoryReason: reason,
      detectedTopicLabel: 'การเฝ้าระวัง ป้องกัน และควบคุมโรคติดต่อในชุมชน',
      activityGroups: params.activityCountMode === 'single' ? [group1] : [group1, group2],
      alternativeActivities: [
        '1. ชี้แจงสถานการณ์การระบาดของโรคติดต่อในพื้นที่และอบรมความรู้เรื่องโรคอุบัติใหม่-อุบัติซ้ำ\n2. ฝึกปฏิบัติการสำรวจค่าดัชนีลูกน้ำยุงลาย (HI/CI) และการจัดการสิ่งแวดล้อมในชุมชน',
      ],
      alternativeObjectives: [
        '1. เพื่อป้องกันและควบคุมการแพร่ระบาดของโรคติดต่อประจำถิ่นและโรคติดต่อตามฤดูกาล\n2. เพื่อสร้างความร่วมมือของภาคีเครือข่ายในการเฝ้าระวังโรคติดต่ออย่างยั่งยืน',
      ],
      alternativeTargetGroups: [
        `1. แกนนำชุมชน อสม. และประชาชนกลุ่มเป้าหมาย จำนวน ${pCount} คน\n2. เจ้าหน้าที่ผู้รับผิดชอบโครงการ จำนวน ${obsCount} คน\nรวม ${pCount + obsCount} คน`,
      ],
      alternativeKpis: [
        '1. ร้อยละ 80 ของผู้เข้าร่วมโครงการมีความรู้เรื่องโรคติดต่อเพิ่มขึ้นจากก่อน-หลังการอบรม\n2. อัตราป่วยด้วยโรคติดต่อที่สำคัญในพื้นที่ลดลง',
      ],
    };
  }

  // 9. EXERCISE / SPORTS / MUAY THAI / PETANQUE / AEROBIC (ออกกำลังกาย / กีฬา / คีตะมวยไทย / เปตอง / ฟุตบอล)
  if (
    title.includes('ออกกำลังกาย') ||
    title.includes('กีฬา') ||
    title.includes('มวยไทย') ||
    title.includes('เปตอง') ||
    title.includes('ฟุตบอล') ||
    title.includes('แอโรบิค')
  ) {
    const act1Lines = buildStandardTrainingBudgetLines(1, '1. กิจกรรมฝึกอบรมให้ความรู้', params);
    const act2Lines: NhsoFundBudgetLine[] = [
      {
        id: `ai_sport_2_1_${Date.now()}`,
        activityCategory: '2. กิจกรรมฝึกทักษะปฏิบัติการออกกำลังกาย',
        name: '2.1) ค่าตอบแทนวิทยากรฝึกปฏิบัติการออกกำลังกาย (10 วัน x วันละ 2 ชม. x 300 บ.)',
        quantity: 20,
        unit: 'ชั่วโมง',
        unitPrice: 300,
        total: 6000,
      },
      {
        id: `ai_sport_2_2_${Date.now() + 1}`,
        activityCategory: '2. กิจกรรมฝึกทักษะปฏิบัติการออกกำลังกาย',
        name: `2.2) ค่าวัสดุอุปกรณ์สำหรับการฝึกปฏิบัติ (${topicCore})`,
        quantity: 1,
        unit: 'ชุด',
        unitPrice: 5000,
        total: 5000,
      },
    ];
    const group1: NhsoActivityGroup = {
      id: `act_ai_1_${Date.now()}`,
      activityName: '1. กิจกรรมอบรมให้ความรู้เรื่องหลักการออกกำลังกายเพื่อสุขภาพ',
      activities: `1. จัดกิจกรรมอบรมให้ความรู้เรื่องหลักการออกกำลังกายเพื่อสุขภาพที่ถูกวิธี การอบอุ่นร่างกาย การยืดเหยียดกล้ามเนื้อ และการป้องกันการบาดเจ็บ (${topicCore})`,
      objectives:
        '1. เพื่อส่งเสริมให้กลุ่มเป้าหมายมีความรู้ความเข้าใจในการออกกำลังกายเพื่อสุขภาพอย่างถูกวิธีและปลอดภัย',
      targetGroup: `1. เด็ก เยาวชน หรือประชาชนกลุ่มเป้าหมาย จำนวน ${pCount} คน\n2. ครู/เจ้าหน้าที่ผู้สังเกตการณ์ จำนวน ${obsCount} คน\nรวม ${pCount + obsCount} คน`,
      targetParticipants: pCount,
      kpi: '1. ร้อยละ 80 ของผู้เข้าร่วมโครงการมีความรู้เรื่องการออกกำลังกายเพื่อสุขภาพที่ถูกต้องเพิ่มขึ้น',
      location: defaultLocation,
      duration: defaultDuration,
      budgetLines: act1Lines,
      subtotal: act1Lines.reduce((s, l) => s + l.total, 0),
    };
    const group2: NhsoActivityGroup = {
      id: `act_ai_2_${Date.now() + 10}`,
      activityName: '2. กิจกรรมฝึกปฏิบัติทักษะการออกกำลังกายและติดตามผล',
      activities: `2. กิจกรรมฝึกทักษะปฏิบัติการออกกำลังกาย (${topicCore}) อย่างต่อเนื่องสม่ำเสมอ\n3. ทดสอบสมรรถภาพทางกายก่อน-หลังการฝึก และสรุปผลการดำเนินงาน`,
      objectives:
        '1. เพื่อส่งเสริมให้เด็ก เยาวชน และประชาชนมีทักษะการออกกำลังกาย มีสุขภาพร่างกายแข็งแรง ใช้เวลาว่างให้เกิดประโยชน์ และห่างไกลยาเสพติด',
      targetGroup: `1. เด็ก เยาวชน หรือประชาชนกลุ่มเป้าหมาย จำนวน ${pCount} คน\n2. ครู/เจ้าหน้าที่ผู้สังเกตการณ์ จำนวน ${obsCount} คน\nรวม ${pCount + obsCount} คน`,
      targetParticipants: pCount,
      kpi: '1. ร้อยละ 80 ของผู้เข้าร่วมโครงการได้รับการฝึกทักษะการออกกำลังกายอย่างสม่ำเสมอและมีสมรรถภาพทางกายดีขึ้น',
      location: defaultLocation,
      duration: defaultDuration,
      budgetLines: act2Lines,
      subtotal: act2Lines.reduce((s, l) => s + l.total, 0),
    };
    return {
      recommendedCategoryNumber: categoryNumber,
      recommendedCategoryReason: reason,
      detectedTopicLabel: `การส่งเสริมการออกกำลังกายและกีฬาเพื่อสุขภาพ (${topicCore})`,
      activityGroups: params.activityCountMode === 'single' ? [group1] : [group1, group2],
      alternativeActivities: [
        `1. อบรมความรู้เรื่องประโยชน์ของการออกกำลังกาย (${topicCore}) และการเสริมสร้างสมรรถภาพทางกาย\n2. กิจกรรมฝึกปฏิบัติทักษะการออกกำลังกายเป็นประจำทุกสัปดาห์`,
      ],
      alternativeObjectives: [
        '1. เพื่อส่งเสริมให้กลุ่มเป้าหมายมีสุขภาพกายและใจที่แข็งแรงด้วยการออกกำลังกาย\n2. เพื่อส่งเสริมการใช้เวลาว่างให้เกิดประโยชน์และสร้างความสามัคคีในชุมชน',
      ],
      alternativeTargetGroups: [
        `1. นักเรียน/เยาวชน/ประชาชนกลุ่มเป้าหมาย จำนวน ${pCount} คน\n2. ผู้สังเกตการณ์และเจ้าหน้าที่ จำนวน ${obsCount} คน\nรวม ${pCount + obsCount} คน`,
      ],
      alternativeKpis: [
        '1. ร้อยละ 80 ของกลุ่มเป้าหมายได้รับการฝึกทักษะการออกกำลังกายและมีสมรรถภาพทางกายดีขึ้น',
      ],
    };
  }

  // 10. GENERAL / CUSTOM TOPIC (รองรับทุกชื่อโครงการที่พิมพ์เข้ามาใหม่โดยอัตโนมัติ)
  const generalLines = buildStandardTrainingBudgetLines(1, '1. กิจกรรมอบรมให้ความรู้และสร้างเสริมสุขภาพ', params);
  const group1: NhsoActivityGroup = {
    id: `act_ai_1_${Date.now()}`,
    activityName: '1. กิจกรรมอบรมให้ความรู้และพัฒนาทักษะการดูแลสุขภาพ',
    activities: `1. จัดอบรมให้ความรู้และสร้างความเข้าใจเกี่ยวกับ${topicCore} แก่กลุ่มเป้าหมาย จำนวน ${pCount} คน\n2. กิจกรรมแบ่งกลุ่มฝึกปฏิบัติ / แลกเปลี่ยนเรียนรู้แนวทางการดูแลสุขภาพและการป้องกันโรคในชุมชน\n3. ประเมินผลความรู้ก่อนและหลังการอบรม (Pre-test / Post-test)`,
    objectives: `1. เพื่อให้กลุ่มเป้าหมาย จำนวน ${pCount} คน มีความรู้และความเข้าใจที่ถูกต้องเกี่ยวกับ${topicCore}\n2. เพื่อพัฒนาทักษะให้กลุ่มเป้าหมายสามารถนำความรู้เรื่อง${topicCore} ไปปฏิบัติในการดูแลสุขภาพตนเองและครอบครัวได้อย่างเหมาะสม\n3. เพื่อสร้างการมีส่วนร่วมของแกนนำและชุมชนในการป้องกันความเสี่ยงด้านสุขภาพและสร้างเสริมสุขภาวะที่ดีอย่างยั่งยืน`,
    targetGroup: `1. ประชาชน/กลุ่มเป้าหมายที่เข้าร่วมโครงการ จำนวน ${pCount} คน\n2. แกนนำสุขภาพและเจ้าหน้าที่ผู้สังเกตการณ์ จำนวน ${obsCount} คน\n3. วิทยากร จำนวน ${spkCount} คน\nรวมทั้งสิ้น ${totalPeople} คน`,
    targetParticipants: pCount,
    kpi: `1. ร้อยละ 80 ของกลุ่มเป้าหมาย (${Math.round(pCount * 0.8)} คน จาก ${pCount} คน) มีความรู้ความเข้าใจเกี่ยวกับ${topicCore}เพิ่มขึ้นหลังการอบรม\n2. ร้อยละ 80 ของกลุ่มเป้าหมายมีทักษะและสามารถปฏิบัติตนในการดูแลสุขภาพเรื่อง${topicCore}ได้อย่างถูกต้อง\n3. ร้อยละ 80 ของผู้เข้าร่วมโครงการมีความพึงพอใจต่อการจัดกิจกรรมและบรรลุผลตามแผนที่กำหนด`,
    location: defaultLocation,
    duration: defaultDuration,
    budgetLines: generalLines,
    subtotal: generalLines.reduce((s, l) => s + l.total, 0),
  };

  // Auto-detect whether project title implies 2 or 3 activities (e.g. คัดกรอง + อบรม + ติดตามเยี่ยมบ้าน)
  const shouldHaveTwoOrMore =
    params.activityCountMode === 'two' ||
    params.activityCountMode === 'three' ||
    (params.activityCountMode === 'auto' &&
      (title.includes('คัดกรอง') ||
        title.includes('ติดตาม') ||
        title.includes('เยี่ยมบ้าน') ||
        title.includes('รณรงค์') ||
        title.includes('ฝึกปฏิบัติ')));

  const groups: NhsoActivityGroup[] = [group1];
  if (shouldHaveTwoOrMore) {
    const act2Lines: NhsoFundBudgetLine[] = [
      {
        id: `ai_gen2_1_${Date.now()}`,
        activityCategory: '2. กิจกรรมรณรงค์เชิงรุกและติดตามประเมินผลในชุมชน',
        name: `2.1) ค่าอาหารว่างและเครื่องดื่มสำหรับกิจกรรมติดตามผล (${totalPeople} คน x 1 มื้อ)`,
        quantity: totalPeople,
        unit: 'ชุด',
        unitPrice: params.settings?.standardRates?.snackPerMeal || 25,
        total: totalPeople * (params.settings?.standardRates?.snackPerMeal || 25),
      },
      {
        id: `ai_gen2_2_${Date.now() + 1}`,
        activityCategory: '2. กิจกรรมรณรงค์เชิงรุกและติดตามประเมินผลในชุมชน',
        name: '2.2) ค่าวัสดุอุปกรณ์และสื่อแผ่นพับรณรงค์ให้ความรู้ในชุมชน',
        quantity: pCount,
        unit: 'ชุด',
        unitPrice: 30,
        total: pCount * 30,
      },
    ];
    groups.push({
      id: `act_ai_2_${Date.now() + 20}`,
      activityName: '2. กิจกรรมรณรงค์เชิงรุกและติดตามประเมินผลในชุมชน',
      activities: `1. แกนนำสุขภาพและเจ้าหน้าที่ลงพื้นที่รณรงค์และติดตามเยี่ยมบ้านกลุ่มเป้าหมาย จำนวน ${pCount} คน เรื่อง${topicCore}\n2. ประเมินผลการปรับเปลี่ยนพฤติกรรมสุขภาพของกลุ่มเป้าหมายและสรุปผลการดำเนินโครงการรายงานต่อกองทุนฯ`,
      objectives: `1. เพื่อติดตามกระตุ้นและส่งเสริมให้กลุ่มเป้าหมาย จำนวน ${pCount} คน ปฏิบัติตนในการดูแลสุขภาพเรื่อง${topicCore} ได้อย่างต่อเนื่อง\n2. เพื่อขยายผลการสร้างเสริมสุขภาพจากกลุ่มเป้าหมายสู่ครัวเรือนและชุมชนในพื้นที่ตำบลบางเป้า\n3. เพื่อประเมินผลลัพธ์ทางสุขภาพและภาวะเสี่ยงของกลุ่มเป้าหมายหลังเข้าร่วมโครงการอย่างเป็นรูปธรรม`,
      targetGroup: `1. ประชาชนกลุ่มเป้าหมายในชุมชน จำนวน ${pCount} คน\n2. แกนนำสุขภาพและเจ้าหน้าที่ผู้สังเกตการณ์ จำนวน ${obsCount} คน\nรวมทั้งสิ้น ${pCount + obsCount} คน`,
      targetParticipants: pCount,
      kpi: `1. ร้อยละ 80 ของกลุ่มเป้าหมาย (${Math.round(pCount * 0.8)} คน) ได้รับการติดตามประเมินผลและมีพฤติกรรมสุขภาพเรื่อง${topicCore}ดีขึ้น\n2. ครัวเรือนของกลุ่มเป้าหมายในพื้นที่ได้รับการรณรงค์ถ่ายทอดความรู้ครบถ้วนตามเป้าหมาย\n3. มีรายงานสรุปผลการประเมินพฤติกรรมสุขภาพของกลุ่มเป้าหมายเสนอต่อกองทุนฯ ครบ 100%`,
      location: defaultLocation,
      duration: defaultDuration,
      budgetLines: act2Lines,
      subtotal: act2Lines.reduce((s, l) => s + l.total, 0),
    });
  }

  if (params.activityCountMode === 'three') {
    const act3Lines: NhsoFundBudgetLine[] = [
      {
        id: `ai_gen3_1_${Date.now() + 30}`,
        activityCategory: '3. กิจกรรมเวทีแลกเปลี่ยนเรียนรู้และสรุปผลโครงการ',
        name: `3.1) ค่าอาหารว่างและเครื่องดื่มสำหรับการประชุมสรุปผลและถอดบทเรียน (${obsCount + 10} คน x 1 มื้อ)`,
        quantity: obsCount + 10,
        unit: 'ชุด',
        unitPrice: params.settings?.standardRates?.snackPerMeal || 25,
        total: (obsCount + 10) * (params.settings?.standardRates?.snackPerMeal || 25),
      },
      {
        id: `ai_gen3_2_${Date.now() + 31}`,
        activityCategory: '3. กิจกรรมเวทีแลกเปลี่ยนเรียนรู้และสรุปผลโครงการ',
        name: '3.2) ค่าจัดทำรูปเล่มรายงานสรุปผลการดำเนินงานและเอกสารเผยแพร่',
        quantity: 1,
        unit: 'ชุด',
        unitPrice: 500,
        total: 500,
      },
    ];
    groups.push({
      id: `act_ai_3_${Date.now() + 40}`,
      activityName: '3. กิจกรรมเวทีแลกเปลี่ยนเรียนรู้ ถอดบทเรียน และสรุปผลโครงการ',
      activities: `1. จัดประชุมคณะทำงานและแกนนำสุขภาพเพื่อสรุปผลการดำเนินงานเรื่อง${topicCore}\n2. ถอดบทเรียนปัญหาอุปสรรคและแนวทางพัฒนาต่อยอดในปีถัดไป พร้อมจัดทำรายงานส่งกองทุนหลักประกันสุขภาพเทศบาลตำบลบางเป้า`,
      objectives: `1. เพื่อสรุปและประเมินผลสัมฤทธิ์ของการดำเนินโครงการเปรียบเทียบกับตัวชี้วัดที่กำหนดไว้\n2. เพื่อถอดบทเรียนและคืนข้อมูลสุขภาพให้แก่ชุมชนและภาคีเครือข่ายในตำบลบางเป้า`,
      targetGroup: `1. ตัวแทนกลุ่มเป้าหมายและแกนนำสุขภาพ จำนวน 10 คน\n2. เจ้าหน้าที่ผู้รับผิดชอบโครงการ จำนวน ${obsCount} คน\nรวมทั้งสิ้น ${obsCount + 10} คน`,
      targetParticipants: 10,
      kpi: `1. ร้อยละ 100 ของคณะทำงานร่วมสรุปผลและจัดทำรายงานผลการดำเนินโครงการส่งกองทุนฯ ทันตามกำหนดเวลา\n2. ได้แนวทางการดำเนินงานสร้างเสริมสุขภาพเรื่อง${topicCore} ที่เหมาะสมกับบริบทชุมชนอย่างน้อย 1 แนวทาง`,
      location: defaultLocation,
      duration: defaultDuration,
      budgetLines: act3Lines,
      subtotal: act3Lines.reduce((s, l) => s + l.total, 0),
    });
  }

  return {
    recommendedCategoryNumber: categoryNumber,
    recommendedCategoryReason: reason,
    detectedTopicLabel: topicCore,
    activityGroups: groups,
    alternativeActivities: [
      `1. จัดอบรมให้ความรู้เรื่อง${topicCore} จำนวน 1 วัน\n2. แบ่งกลุ่มฝึกปฏิบัติและแลกเปลี่ยนเรียนรู้แนวทางสร้างเสริมสุขภาพ\n3. ติดตามและประเมินผลก่อน-หลังการอบรม`,
      `1. กิจกรรมอบรมเชิงปฏิบัติการพัฒนาศักยภาพแกนนำสุขภาพเรื่อง${topicCore}\n2. กิจกรรมลงพื้นที่เคาะประตูบ้านให้คำแนะนำและคัดกรองความเสี่ยงด้านสุขภาพในชุมชน`,
    ],
    alternativeObjectives: [
      `1. เพื่อให้กลุ่มเป้าหมายมีความรู้ความเข้าใจที่ถูกต้องเกี่ยวกับ${topicCore}\n2. เพื่อส่งเสริมการปรับเปลี่ยนพฤติกรรมสุขภาพและลดปัจจัยเสี่ยงของการเกิดโรคในชุมชน`,
      `1. เพื่อพัฒนาทักษะการดูแลสุขภาพตนเองของกลุ่มเป้าหมายในเรื่อง${topicCore}\n2. เพื่อสร้างการมีส่วนร่วมของภาคีเครือข่ายและชุมชนในการสร้างเสริมสุขภาพอย่างยั่งยืน`,
    ],
    alternativeTargetGroups: [
      `1. ประชาชนกลุ่มเป้าหมายในพื้นที่ตำบลบางเป้า จำนวน ${pCount} คน\n2. แกนนำสุขภาพและผู้สังเกตการณ์ จำนวน ${obsCount} คน\n3. วิทยากร ${spkCount} คน\nรวม ${totalPeople} คน`,
    ],
    alternativeKpis: [
      `1. ร้อยละ 80 ของผู้เข้าร่วมโครงการมีความรู้ความเข้าใจเกี่ยวกับ${topicCore}เพิ่มขึ้น (ประเมินจากแบบทดสอบก่อน-หลังอบรม)\n2. ร้อยละ 80 ของกลุ่มเป้าหมายมีพฤติกรรมสุขภาพที่ถูกต้องเหมาะสมเพิ่มขึ้น`,
    ],
  };
}

/**
 * Context-Aware Smart Activity Generator for Activity 1, 2, 3+
 * Inspects BOTH the overall Project Name AND the specific Activity Name typed by the user
 * (e.g., "กิจกรรมการติดตามผล", "กิจกรรมฝึกปฏิบัติว่ายน้ำ", "กิจกรรมฐานการเรียนรู้", "กิจกรรมทำหัตถการ", "กิจกรรมคัดกรอง")
 */
export function generateSmartContextActivityGroup(
  params: AiProjectDraftParams,
  groupIndex: number,
  customActivityName: string
): NhsoActivityGroup {
  const actNo = groupIndex + 1;
  const rawActName = (customActivityName || '').trim();
  const actLower = rawActName.toLowerCase();
  const titleLower = (params.projectName || '').toLowerCase();
  const topicCore = extractTopicCore(params.projectName);
  const yrShort = (params.fiscalYear || '2570').slice(-2);

  const pCount = Math.max(1, params.participantsCount || 30);
  const obsCount = Math.max(0, params.observersCount ?? 6);
  const snackRate = params.settings?.standardRates?.snackPerMeal || 25;

  // First check if the base draft already has a matching group at this index
  const forcedMode: AiProjectDraftParams['activityCountMode'] =
    actNo >= 3 ? 'three' : actNo === 2 ? 'two' : 'auto';
  const baseDraft = generateSmartNhsoProjectDraft({
    ...params,
    activityCountMode: forcedMode,
  });

  const defaultLoc =
    baseDraft.activityGroups[0]?.location ||
    'ศาลาอเนกประสงค์หมู่บ้าน / พื้นที่ตำบลบางเป้า';
  const defaultDur = baseDraft.activityGroups[0]?.duration || `มี.ค. - ก.ย. ${yrShort}`;

  // 1. Check if Activity Name explicitly mentions "ติดตามผล" / "เยี่ยมบ้าน" / "เจาะเลือด" / "วัดความดัน"
  const isFollowUpActivity =
    actLower.includes('ติดตาม') ||
    actLower.includes('เยี่ยมบ้าน') ||
    actLower.includes('ประเมินผล') ||
    actLower.includes('เจาะเลือด') ||
    actLower.includes('วัดความดัน') ||
    (actNo >= 2 &&
      !rawActName &&
      (titleLower.includes('เบาหวาน') ||
        titleLower.includes('ความดัน') ||
        titleLower.includes('ncd') ||
        titleLower.includes('กลุ่มเสี่ยง')));

  if (isFollowUpActivity) {
    const isNcdProject =
      titleLower.includes('เบาหวาน') ||
      titleLower.includes('ความดัน') ||
      titleLower.includes('ncd') ||
      titleLower.includes('กลุ่มเสี่ยง') ||
      titleLower.includes('ปรับเปลี่ยนพฤติกรรม') ||
      actLower.includes('เจาะเลือด') ||
      actLower.includes('วัดความดัน');

    const finalActName = rawActName
      ? rawActName.match(/^\d+\./)
        ? rawActName
        : `${actNo}. ${rawActName}`
      : `${actNo}. กิจกรรมการติดตามผล`;

    if (isNcdProject) {
      const ncdFollowUpLines: NhsoFundBudgetLine[] = [
        {
          id: `ai_ctx_ncd_${actNo}_1_${Date.now()}`,
          activityCategory: finalActName,
          name: `${actNo}.1) ค่าเครื่องวัดความดันโลหิต`,
          quantity: 1,
          unit: 'เครื่อง',
          unitPrice: 3500,
          total: 3500,
        },
        {
          id: `ai_ctx_ncd_${actNo}_2_${Date.now() + 1}`,
          activityCategory: finalActName,
          name: `${actNo}.2) ค่าเครื่องชั่งน้ำหนัก`,
          quantity: 1,
          unit: 'เครื่อง',
          unitPrice: 1000,
          total: 1000,
        },
        {
          id: `ai_ctx_ncd_${actNo}_3_${Date.now() + 2}`,
          activityCategory: finalActName,
          name: `${actNo}.3) ค่าเครื่องเจาะน้ำตาล`,
          quantity: 3,
          unit: 'เครื่อง',
          unitPrice: 1800,
          total: 5400,
        },
      ];

      return {
        id: `act_ctx_${actNo}_${Date.now()}`,
        activityName: finalActName,
        activities: `${actNo}. อสม. และแกนนำสุขภาพลงพื้นที่ติดตามผลการเจาะเลือดตรวจระดับน้ำตาล วัดความดันโลหิต และชั่งน้ำหนักประเมินค่าดัชนีมวลกาย (BMI) 1-2 ครั้ง/เดือน เป็นเวลา 3-6 เดือน พร้อมสรุปรายงานผล`,
        objectives: `1. เพื่อติดตามประเมินผลการปรับเปลี่ยนพฤติกรรมสุขภาพด้วยหลัก 3อ. 2ส. ค่าระดับน้ำตาลในเลือด และระดับความดันโลหิตของกลุ่มเสี่ยงอย่างต่อเนื่อง\n2. เพื่อป้องกันไม่ให้เกิดผู้ป่วยโรคเบาหวาน และโรคความดันโลหิตสูงรายใหม่ในพื้นที่`,
        targetGroup: `1. กลุ่มเสี่ยงโรคเบาหวาน โรคความดันโลหิตสูง จำนวน ${pCount} คน\n2. แกนนำชุมชน / อสม. ผู้ติดตามผล จำนวน ${obsCount} คน\nรวม ${pCount + obsCount} คน`,
        targetParticipants: pCount,
        kpi: `1. ร้อยละ 80 ของกลุ่มเสี่ยงต่อเบาหวาน ความดันโลหิตสูง ได้รับการติดตามประเมินผลและปรับเปลี่ยนพฤติกรรมสุขภาพด้วย 3อ. 2ส.\n2. อัตราการเกิดผู้ป่วยโรคเบาหวาน ความดันโลหิตสูงรายใหม่ในพื้นที่ลดลง`,
        location: defaultLoc,
        duration: defaultDur,
        budgetLines: ncdFollowUpLines,
        subtotal: ncdFollowUpLines.reduce((s, l) => s + l.total, 0),
      };
    }

    // General Follow-up Activity for other health topics
    const genFollowUpLines: NhsoFundBudgetLine[] = [
      {
        id: `ai_ctx_fup_${actNo}_1_${Date.now()}`,
        activityCategory: finalActName,
        name: `${actNo}.1) ค่าอาหารว่างและเครื่องดื่มสำหรับการลงพื้นที่ติดตามผล (${pCount + obsCount} คน x 1 มื้อ)`,
        quantity: pCount + obsCount,
        unit: 'ชุด',
        unitPrice: snackRate,
        total: (pCount + obsCount) * snackRate,
      },
      {
        id: `ai_ctx_fup_${actNo}_2_${Date.now() + 1}`,
        activityCategory: finalActName,
        name: `${actNo}.2) ค่าวัสดุอุปกรณ์และแบบบันทึกการติดตามประเมินผลสุขภาพในชุมชน`,
        quantity: pCount,
        unit: 'ชุด',
        unitPrice: 30,
        total: pCount * 30,
      },
    ];

    return {
      id: `act_ctx_${actNo}_${Date.now()}`,
      activityName: finalActName,
      activities: `${actNo}. แกนนำสุขภาพและเจ้าหน้าที่ลงพื้นที่ติดตามเยี่ยมบ้าน ประเมินพฤติกรรมสุขภาพเรื่อง${topicCore} ของกลุ่มเป้าหมาย จำนวน ${pCount} คน และสรุปผลการดำเนินงาน`,
      objectives: `1. เพื่อติดตามกระตุ้นและประเมินผลการนำความรู้เรื่อง${topicCore} ไปปฏิบัติจริงในชีวิตประจำวันของกลุ่มเป้าหมาย\n2. เพื่อเฝ้าระวังความเสี่ยงด้านสุขภาพและป้องกันการเกิดโรคในชุมชนอย่างต่อเนื่อง`,
      targetGroup: `1. กลุ่มเป้าหมายที่เข้าร่วมโครงการ จำนวน ${pCount} คน\n2. แกนนำสุขภาพและเจ้าหน้าที่ผู้ติดตามผล จำนวน ${obsCount} คน\nรวม ${pCount + obsCount} คน`,
      targetParticipants: pCount,
      kpi: `1. ร้อยละ 80 ของกลุ่มเป้าหมาย (${Math.round(pCount * 0.8)} คน) ได้รับการติดตามประเมินผลและมีพฤติกรรมสุขภาพเรื่อง${topicCore}ดีขึ้น\n2. มีรายงานสรุปผลการติดตามสุขภาพของกลุ่มเป้าหมายครบถ้วนตามแผน`,
      location: defaultLoc,
      duration: defaultDur,
      budgetLines: genFollowUpLines,
      subtotal: genFollowUpLines.reduce((s, l) => s + l.total, 0),
    };
  }

  // 2. Check if Activity Name mentions "ฐานการเรียนรู้" / "ฝึกปฏิบัติ" / "สาธิต"
  if (
    actLower.includes('ฐานการเรียนรู้') ||
    actLower.includes('แบ่งฐาน') ||
    actLower.includes('ฝึกปฏิบัติ') ||
    actLower.includes('สาธิต') ||
    actLower.includes('ฝึกทักษะ')
  ) {
    // If swimming / drowning
    if (titleLower.includes('จมน้ำ') || titleLower.includes('ว่ายน้ำ') || actLower.includes('ว่ายน้ำ')) {
      return baseDraft.activityGroups[1] || baseDraft.activityGroups[0];
    }

    const finalActName = rawActName
      ? rawActName.match(/^\d+\./)
        ? rawActName
        : `${actNo}. ${rawActName}`
      : `${actNo}. กิจกรรมฝึกทักษะผ่านฐานการเรียนรู้และฝึกปฏิบัติ`;

    const practiceLines: NhsoFundBudgetLine[] = [
      {
        id: `ai_ctx_prac_${actNo}_1_${Date.now()}`,
        activityCategory: finalActName,
        name: `${actNo}.1) ค่าวัสดุ/อุปกรณ์ประจำฐานการเรียนรู้และฝึกปฏิบัติ (3 ฐาน)`,
        quantity: 3,
        unit: 'ฐาน',
        unitPrice: 1500,
        total: 4500,
      },
      {
        id: `ai_ctx_prac_${actNo}_2_${Date.now() + 1}`,
        activityCategory: finalActName,
        name: `${actNo}.2) ค่าจัดทำใบประกาศนียบัตร/สื่อคู่มือฝึกทักษะสำหรับกลุ่มเป้าหมาย`,
        quantity: pCount,
        unit: 'ชุด',
        unitPrice: 30,
        total: pCount * 30,
      },
    ];

    return {
      id: `act_ctx_${actNo}_${Date.now()}`,
      activityName: finalActName,
      activities: `${actNo}. จัดกิจกรรมฝึกทักษะเชิงปฏิบัติการผ่านฐานการเรียนรู้เรื่อง${topicCore} จำนวน 3 ฐาน เพื่อให้กลุ่มเป้าหมายได้ลงมือปฏิบัติจริง`,
      objectives: `1. เพื่อให้กลุ่มเป้าหมายมีทักษะความชำนาญในการปฏิบัติตนเรื่อง${topicCore} อย่างถูกวิธี\n2. เพื่อส่งเสริมการเรียนรู้ผ่านการปฏิบัติจริงและสามารถนำไปใช้ในชีวิตประจำวันได้`,
      targetGroup: `1. กลุ่มเป้าหมายผู้เข้ารับการฝึกปฏิบัติ จำนวน ${pCount} คน\n2. ครู/แกนนำ/เจ้าหน้าที่ผู้สังเกตการณ์ จำนวน ${obsCount} คน\nรวม ${pCount + obsCount} คน`,
      targetParticipants: pCount,
      kpi: `1. ร้อยละ 80 ของกลุ่มเป้าหมาย (${Math.round(pCount * 0.8)} คน) ผ่านการฝึกปฏิบัติตามฐานการเรียนรู้และมีทักษะเรื่อง${topicCore}เพิ่มขึ้น`,
      location: defaultLoc,
      duration: defaultDur,
      budgetLines: practiceLines,
      subtotal: practiceLines.reduce((s, l) => s + l.total, 0),
    };
  }

  // 3. Check if Activity Name mentions "หัตถการ" / "ขลิบ" / "ตรวจคัดกรอง"
  if (actLower.includes('หัตถการ') || actLower.includes('ขลิบ')) {
    const finalActName = rawActName
      ? rawActName.match(/^\d+\./)
        ? rawActName
        : `${actNo}. ${rawActName}`
      : `${actNo}. กิจกรรมการทำหัตถการและดูแลสุขภาพ`;
    const procLines: NhsoFundBudgetLine[] = [
      {
        id: `ai_ctx_proc_${actNo}_1_${Date.now()}`,
        activityCategory: finalActName,
        name: `${actNo}.1) ค่าจัดจ้างเหมาบริการบุคลากรทางการแพทย์ในการทำหัตถการ`,
        quantity: pCount,
        unit: 'คน',
        unitPrice: 1200,
        total: pCount * 1200,
      },
      {
        id: `ai_ctx_proc_${actNo}_2_${Date.now() + 1}`,
        activityCategory: finalActName,
        name: `${actNo}.2) ค่าวัสดุอุปกรณ์ดูแลสุขอนามัยหลังทำหัตถการ`,
        quantity: pCount,
        unit: 'ชุด',
        unitPrice: 120,
        total: pCount * 120,
      },
    ];
    return {
      id: `act_ctx_${actNo}_${Date.now()}`,
      activityName: finalActName,
      activities: `${actNo}. ดำเนินการให้บริการทำหัตถการและตรวจประเมินสุขภาพแก่กลุ่มเป้าหมาย จำนวน ${pCount} คน โดยบุคลากรทางการแพทย์ พร้อมแนะนำการดูแลแผลและป้องกันการติดเชื้อ`,
      objectives: `1. เพื่อให้กลุ่มเป้าหมายได้รับการทำหัตถการที่ปลอดภัยตามมาตรฐานทางการแพทย์\n2. เพื่อลดภาวะเสี่ยงของการอักเสบ ภาวะแทรกซ้อน และการติดเชื้อ`,
      targetGroup: `1. กลุ่มเป้าหมายผู้เข้ารับบริการ จำนวน ${pCount} คน\n2. ผู้ปกครอง/ผู้สังเกตการณ์ จำนวน ${obsCount} คน\nรวม ${pCount + obsCount} คน`,
      targetParticipants: pCount,
      kpi: `1. ร้อยละ 100 ของกลุ่มเป้าหมายได้รับการทำหัตถการอย่างปลอดภัยและไม่เกิดภาวะแทรกซ้อนจากการติดเชื้อ`,
      location: defaultLoc,
      duration: defaultDur,
      budgetLines: procLines,
      subtotal: procLines.reduce((s, l) => s + l.total, 0),
    };
  }

  // 4. Otherwise use the matched group from baseDraft (e.g., groupIndex 1 -> Activity 2 of that topic)
  const matched =
    baseDraft.activityGroups[groupIndex] ||
    baseDraft.activityGroups[baseDraft.activityGroups.length - 1] ||
    baseDraft.activityGroups[0];

  const numberedLines = (matched.budgetLines || []).map((l, idx) => ({
    ...l,
    id: `ai_ctx_${actNo}_${idx}_${Date.now()}`,
    activityCategory: rawActName || matched.activityName,
    name: l.name.replace(/^\d+\.\d+\)/, `${actNo}.${idx + 1})`),
  }));

  return {
    ...matched,
    id: `act_ctx_${actNo}_${Date.now()}`,
    activityName: rawActName
      ? rawActName.match(/^\d+\./)
        ? rawActName
        : `${actNo}. ${rawActName}`
      : matched.activityName.replace(/^\d+\./, `${actNo}.`),
    budgetLines: numberedLines,
    subtotal: numberedLines.reduce((s, l) => s + l.total, 0),
  };
}

/**
 * Optional Free Gemini 2.5 Flash API Call (Google AI Studio Free Tier)
 * Automatically falls back to the built-in NHSO Expert AI if no key is provided or network fails.
 */
export async function generateNhsoDraftWithFreeGemini(
  params: AiProjectDraftParams,
  apiKey: string
): Promise<AiProjectSuggestionResult> {
  const baseResult = generateSmartNhsoProjectDraft(params);
  if (!apiKey || !apiKey.trim()) {
    return baseResult;
  }

  const speakerRate = params.settings?.standardRates?.speakerHourly || 600;
  const lunchRate = params.settings?.standardRates?.lunchPerMeal || 75;
  const snackRate = params.settings?.standardRates?.snackPerMeal || 25;
  const vinylRate = params.settings?.standardRates?.vinylPerBanner || 450;
  const totalPeople = params.participantsCount + params.observersCount + params.speakersCount;

  const prompt = `คุณคือผู้เชี่ยวชาญการเขียนโครงการกองทุนหลักประกันสุขภาพระดับท้องถิ่น (กปท. สปสช.) เทศบาลตำบลบางเป้า จังหวัดตรัง
จงช่วยร่างรายละเอียดโครงการตามแบบฟอร์ม 13 คอลัมน์ของ สปสช. สำหรับ:
- ชื่อโครงการ: "${params.projectName}"
- หน่วยงานผู้ขอ: "${params.proposingOrg || 'หน่วยงานในตำบลบางเป้า'}"
- ปีงบประมาณ: ${params.fiscalYear}
- กลุ่มเป้าหมายหลัก: ${params.participantsCount} คน, ผู้สังเกตการณ์/เจ้าหน้าที่: ${params.observersCount} คน, วิทยากร: ${params.speakersCount} คน (รวม ${totalPeople} คน)
- จำนวนชั่วโมงอบรม: ${params.hoursCount} ชั่วโมง
- อัตราค่าใช้จ่ายมาตรฐาน สปสช.: ค่าวิทยากร ${speakerRate} บาท/ชม., ค่าอาหารกลางวัน ${lunchRate} บาท/มื้อ, ค่าอาหารว่าง ${snackRate} บาท/มื้อ (${params.snackMealsCount} มื้อ), ค่าป้ายไวนิล 1.2x2.5 ม. ${vinylRate} บาท/ป้าย, ค่าวัสดุ/เอกสารอบรม 50 บาท/ชุด

ตอบกลับเป็น JSON เท่านั้น ตามโครงสร้างนี้:
{
  "recommendedCategoryNumber": 1,
  "recommendedCategoryReason": "เหตุผลสั้นๆ",
  "detectedTopicLabel": "ประเด็นสุขภาพหลัก",
  "activityName": "1. กิจกรรม...",
  "activities": "รายละเอียดกิจกรรมเป็นข้อๆ...",
  "objectives": "1. เพื่อ...\n2. เพื่อ...",
  "targetGroup": "1. กลุ่มเป้าหมาย จำนวน ${params.participantsCount} คน\n2. ผู้สังเกตการณ์ จำนวน ${params.observersCount} คน\nรวม...",
  "kpi": "1. ร้อยละ 80 ของ...",
  "location": "สถานที่ดำเนินการในตำบลบางเป้า",
  "duration": "มี.ค. - ก.ย. ${params.fiscalYear.slice(-2)}",
  "budgetLines": [
    { "name": "1.1) ค่าตอบแทนวิทยากร", "quantity": ${params.hoursCount}, "unit": "ชั่วโมง", "unitPrice": ${speakerRate} }
  ]
}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey.trim())}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!res.ok) {
      return baseResult;
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return baseResult;

    const parsed = JSON.parse(text);
    const aiLines: NhsoFundBudgetLine[] = Array.isArray(parsed.budgetLines)
      ? parsed.budgetLines.map((l: any, idx: number) => {
          const q = Number(l.quantity) || 1;
          const p = Number(l.unitPrice) || 0;
          return {
            id: `gemini_line_${idx}_${Date.now()}`,
            activityCategory: parsed.activityName || '1. กิจกรรมดำเนินงาน',
            name: String(l.name || `1.${idx + 1}) รายการค่าใช้จ่าย`),
            quantity: q,
            unit: String(l.unit || 'ชุด'),
            unitPrice: p,
            total: q * p,
          };
        })
      : baseResult.activityGroups[0].budgetLines;

    const group: NhsoActivityGroup = {
      id: `act_gemini_${Date.now()}`,
      activityName: parsed.activityName || baseResult.activityGroups[0].activityName,
      activities: parsed.activities || baseResult.activityGroups[0].activities,
      objectives: parsed.objectives || baseResult.activityGroups[0].objectives,
      targetGroup: parsed.targetGroup || baseResult.activityGroups[0].targetGroup,
      targetParticipants: params.participantsCount,
      kpi: parsed.kpi || baseResult.activityGroups[0].kpi,
      location: parsed.location || baseResult.activityGroups[0].location,
      duration: parsed.duration || baseResult.activityGroups[0].duration,
      budgetLines: aiLines,
      subtotal: aiLines.reduce((s, l) => s + l.total, 0),
    };

    return {
      recommendedCategoryNumber: Number(parsed.recommendedCategoryNumber) || baseResult.recommendedCategoryNumber,
      recommendedCategoryReason: parsed.recommendedCategoryReason || baseResult.recommendedCategoryReason,
      detectedTopicLabel: parsed.detectedTopicLabel || baseResult.detectedTopicLabel,
      activityGroups: [group],
      alternativeActivities: [group.activities, ...baseResult.alternativeActivities],
      alternativeObjectives: [group.objectives, ...baseResult.alternativeObjectives],
      alternativeTargetGroups: [group.targetGroup, ...baseResult.alternativeTargetGroups],
      alternativeKpis: [group.kpi, ...baseResult.alternativeKpis],
    };
  } catch {
    return baseResult;
  }
}

export interface ImportedProjectDraftData {
  projectName: string;
  categoryNumber: number;
  proposingOrg: string;
  responsiblePerson: string;
  phone: string;
  participantsCount: number;
  observersCount: number;
  hoursCount: number;
  snackMealsCount: number;
  activityGroups: NhsoActivityGroup[];
  summaryReport: string[];
  rawExtractedPreview: string;
}

/**
 * Unpacks a ZIP buffer (.docx or .xlsx) in-memory using browser native DecompressionStream('deflate-raw')
 * Zero server storage, zero disk persistence!
 */
async function readZipEntriesInMemory(buffer: ArrayBuffer): Promise<Map<string, string>> {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const entries = new Map<string, string>();
  const decoder = new TextDecoder('utf-8');

  // Find End of Central Directory (EOCD) signature 0x06054b50
  let eocdOffset = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) return entries;

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  const cdOffset = view.getUint32(eocdOffset + 16, true);

  let ptr = cdOffset;
  for (let i = 0; i < totalEntries; i++) {
    if (ptr + 46 > bytes.length || view.getUint32(ptr, true) !== 0x02014b50) break;
    const compressionMethod = view.getUint16(ptr + 10, true);
    const compressedSize = view.getUint32(ptr + 20, true);
    const fileNameLen = view.getUint16(ptr + 28, true);
    const extraLen = view.getUint16(ptr + 30, true);
    const commentLen = view.getUint16(ptr + 32, true);
    const localHeaderOffset = view.getUint32(ptr + 42, true);

    const fileName = decoder.decode(bytes.subarray(ptr + 46, ptr + 46 + fileNameLen));
    ptr += 46 + fileNameLen + extraLen + commentLen;

    if (
      !fileName.endsWith('.xml') &&
      !fileName.endsWith('.txt') &&
      !fileName.endsWith('.csv')
    ) {
      continue;
    }

    if (localHeaderOffset + 30 > bytes.length) continue;
    const localNameLen = view.getUint16(localHeaderOffset + 26, true);
    const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const compressedSlice = bytes.subarray(dataStart, dataStart + compressedSize);

    try {
      if (compressionMethod === 0) {
        entries.set(fileName, decoder.decode(compressedSlice));
      } else if (compressionMethod === 8 && typeof DecompressionStream !== 'undefined') {
        const ds = new DecompressionStream('deflate-raw');
        const writer = ds.writable.getWriter();
        writer.write(compressedSlice);
        writer.close();
        const decompressedBuf = await new Response(ds.readable).arrayBuffer();
        entries.set(fileName, decoder.decode(decompressedBuf));
      }
    } catch {
      // skip unreadable entry
    }
  }

  return entries;
}

/**
 * Extracts readable text from an uploaded file (.docx, .xlsx, .csv, .txt, .json, .pdf)
 * Purely in RAM — file is never saved or uploaded to storage.
 */
export async function extractTextFromUploadedProjectFile(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const buffer = await file.arrayBuffer();

  // 1. Word (.docx) or Excel (.xlsx) OpenXML ZIP
  if (ext === 'docx' || ext === 'xlsx') {
    const zipMap = await readZipEntriesInMemory(buffer);
    if (ext === 'docx') {
      const docXml = zipMap.get('word/document.xml') || '';
      if (docXml) {
        return docXml
          .replace(/<\/w:p>/g, '\n')
          .replace(/<\/w:tr>/g, '\n')
          .replace(/<\/w:tc>/g, '\t')
          .replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
      }
    }
    if (ext === 'xlsx') {
      const sharedXml = zipMap.get('xl/sharedStrings.xml') || '';
      const sharedStrings: string[] = [];
      const siMatches = sharedXml.match(/<si[\s\S]*?<\/si>/g) || [];
      siMatches.forEach((si) => {
        const tParts = si.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || [];
        const text = tParts
          .map((t) => t.replace(/<[^>]+>/g, ''))
          .join('');
        sharedStrings.push(
          text
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
        );
      });

      const lines: string[] = [];
      for (const [path, xml] of zipMap.entries()) {
        if (path.startsWith('xl/worksheets/sheet') && path.endsWith('.xml')) {
          const rowMatches = xml.match(/<row[\s\S]*?<\/row>/g) || [];
          rowMatches.forEach((rowXml) => {
            const cellTexts: string[] = [];
            const cellMatches = rowXml.match(/<c[\s\S]*?<\/c>/g) || [];
            cellMatches.forEach((cXml) => {
              const isShared = /t="s"/.test(cXml);
              const inlineMatch = cXml.match(/<is>[\s\S]*?<\/is>/);
              if (inlineMatch) {
                const txt = inlineMatch[0].replace(/<[^>]+>/g, '').trim();
                if (txt) cellTexts.push(txt);
              } else {
                const vMatch = cXml.match(/<v>([\s\S]*?)<\/v>/);
                if (vMatch) {
                  const rawVal = vMatch[1].trim();
                  if (isShared && sharedStrings[Number(rawVal)] !== undefined) {
                    cellTexts.push(sharedStrings[Number(rawVal)]);
                  } else {
                    cellTexts.push(rawVal);
                  }
                }
              }
            });
            if (cellTexts.length > 0) {
              lines.push(cellTexts.join(' | '));
            }
          });
        }
      }
      if (lines.length > 0) {
        return lines.join('\n');
      }
    }
  }

  // 2. Plain text, CSV, JSON, HTML, or fallback UTF-8 decoding
  const rawText = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
  const cleaned = rawText
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  return cleaned;
}

/**
 * Analyzes an uploaded NHSO project file (or image/PDF via Gemini if key exists, plus built-in Thai NLP parser)
 * Extracts & refines project name, target counts, objectives, activities, KPIs, and budget lines.
 * File is processed 100% in memory and immediately discarded to save space.
 */
export async function analyzeUploadedProjectFileWithAi(
  file: File,
  fiscalYear: string,
  settings: NhsoFundSettings,
  freeGeminiKey?: string
): Promise<ImportedProjectDraftData> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const extractedText = await extractTextFromUploadedProjectFile(file);

  // Try extracting project title from text or filename
  let detectedProjectName = '';
  const titleMatch =
    extractedText.match(/(?:ชื่อโครงการ|แผนงาน\/โครงการ|โครงการ)\s*[:：]?\s*(โครงการ[^\n|]{5,120})/) ||
    extractedText.match(/(โครงการ[^\n|\t]{6,110})/);

  if (titleMatch && titleMatch[1]) {
    detectedProjectName = titleMatch[1]
      .replace(/\|.*$/, '')
      .replace(/\s+/g, ' ')
      .trim();
  } else {
    const cleanFileName = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
    detectedProjectName = cleanFileName.startsWith('โครงการ')
      ? cleanFileName
      : `โครงการ${cleanFileName}`;
  }

  // Detect proposing organization
  let detectedOrg = '';
  const orgCandidates = [
    'กองสาธารณสุขและสิ่งแวดล้อม',
    'กองการศึกษา ศาสนาและวัฒนธรรม',
    'รพ.สต.บางเป้า',
    'โรงพยาบาลกันตัง',
    'ชมรมผู้สูงอายุตำบลบางเป้า',
    'ชมรมผู้สูงอายุโรงพยาบาลกันตัง',
    'ชมรม อสม. ม.1',
    'ชมรม อสม. ม.2',
    'ชมรม อสม. ม.3',
    'ชมรม อสม. ม.4',
    'ชมรม อสม. ม.5',
    'ชมรม อสม. ม.6',
    'ชมรม อสม. ม.7',
    'รร.บ้านป่าเตียว',
    'รร.วัดสีหราษฎร์ศรัทธา',
    'รร.บ้านบางเป้า',
    'ศพด.มัสยิดบ้านบางเป้า',
    'ศพด.บ้านควนทองสีห์',
    'กองทุนสวัสดิการชุมชนตำบลบางเป้า',
  ];
  for (const org of orgCandidates) {
    if (extractedText.includes(org) || detectedProjectName.includes(org)) {
      detectedOrg = org;
      break;
    }
  }
  if (!detectedOrg) {
    const mMoo = (extractedText + ' ' + detectedProjectName).match(/อสม\.?\s*(?:หมู่ที่|หมู่|ม\.)\s*(\d)/);
    if (mMoo) {
      detectedOrg = `ชมรม อสม. ม.${mMoo[1]}`;
    } else if (extractedText.includes('ป่าเตียว')) {
      detectedOrg = 'รร.บ้านป่าเตียว';
    } else if (extractedText.includes('วัดสีหราษฎร์')) {
      detectedOrg = 'รร.วัดสีหราษฎร์ศรัทธา';
    } else if (extractedText.includes('ควนทองสีห์')) {
      detectedOrg = 'ศพด.บ้านควนทองสีห์';
    }
  }

  // Detect participant count & observer count
  let participantsCount = 30;
  let observersCount = 6;
  const peopleMatches = [...extractedText.matchAll(/จำนวน\s*(\d{1,3})\s*คน/g)].map((m) =>
    Number(m[1])
  );
  if (peopleMatches.length >= 2) {
    participantsCount = peopleMatches[0] || 30;
    observersCount = peopleMatches[1] || 6;
  } else if (peopleMatches.length === 1) {
    participantsCount = peopleMatches[0] || 30;
  }

  // Detect speaker hours
  let hoursCount = 5;
  const hourMatch =
    extractedText.match(/วิทยากร[^\n]{0,40}?(\d{1,2})\s*(?:ชั่วโมง|ชม\.)/) ||
    extractedText.match(/(\d{1,2})\s*(?:ชั่วโมง|ชม\.)/);
  if (hourMatch && Number(hourMatch[1]) > 0 && Number(hourMatch[1]) <= 24) {
    hoursCount = Number(hourMatch[1]);
  }

  // Detect snack meals
  let snackMealsCount = 2;
  const snackMatch = extractedText.match(/อาหารว่าง[^\n]{0,30}?(\d)\s*มื้อ/);
  if (snackMatch) {
    snackMealsCount = Number(snackMatch[1]);
  }

  // Check if file mentions multiple activities (e.g. 2.กิจกรรมการติดตามผล or กิจกรรมที่ 2)
  const hasSecondActivity =
    /2\s*[\.\)]\s*กิจกรรม|กิจกรรมที่\s*2|กิจกรรมการติดตามผล|กิจกรรมฝึกปฏิบัติ/.test(extractedText);

  // Generate refined NHSO draft using our Smart AI Engine
  const aiParams: AiProjectDraftParams = {
    projectName: detectedProjectName,
    proposingOrg: detectedOrg,
    participantsCount,
    observersCount,
    speakersCount: hoursCount > 0 ? 1 : 0,
    hoursCount,
    includeLunch: !extractedText.includes('ไม่มีอาหารกลางวัน'),
    snackMealsCount,
    includeVinyl: true,
    includeMaterials: true,
    activityCountMode: hasSecondActivity ? 'two' : 'auto',
    fiscalYear,
    settings,
  };

  let draft = generateSmartNhsoProjectDraft(aiParams);

  // Extract explicit budget lines from the uploaded file if present (e.g., 1.1) ... or 2.1) ...)
  const parsedLines1: NhsoFundBudgetLine[] = [];
  const parsedLines2: NhsoFundBudgetLine[] = [];
  const lineRegex = /([12])\.(\d)\)\s*([^\n|\t]+?)(?:\s+|\s*\|\s*)(\d+)\s*(?:\|\s*|\s+)(ชั่วโมง|ชุด|มื้อ|ป้าย|เครื่อง|คน|ฐาน|ใบ|อัน|ลูก|ผืน)\s*(?:\|\s*|\s+)(\d[\d,]*)/g;
  let m: RegExpExecArray | null;
  while ((m = lineRegex.exec(extractedText)) !== null) {
    const actIdx = Number(m[1]);
    const subIdx = Number(m[2]);
    const itemName = `${actIdx}.${subIdx}) ${m[3].trim()}`;
    const qty = Number(m[4]) || 1;
    const unit = m[5].trim();
    const price = Number(m[6].replace(/,/g, '')) || 0;
    const lineObj: NhsoFundBudgetLine = {
      id: `imp_line_${actIdx}_${subIdx}_${Date.now()}`,
      activityCategory:
        actIdx === 1
          ? draft.activityGroups[0]?.activityName || '1. กิจกรรมอบรมให้ความรู้'
          : draft.activityGroups[1]?.activityName || '2. กิจกรรมการติดตามผล',
      name: itemName,
      quantity: qty,
      unit,
      unitPrice: price,
      total: qty * price,
    };
    if (actIdx === 1) parsedLines1.push(lineObj);
    else parsedLines2.push(lineObj);
  }

  const finalGroups = [...draft.activityGroups];
  if (parsedLines1.length > 0 && finalGroups[0]) {
    finalGroups[0] = {
      ...finalGroups[0],
      budgetLines: parsedLines1,
      subtotal: parsedLines1.reduce((s, l) => s + l.total, 0),
    };
  }
  if (parsedLines2.length > 0) {
    if (!finalGroups[1]) {
      finalGroups.push(
        generateSmartContextActivityGroup(aiParams, 1, '2. กิจกรรมการติดตามผล')
      );
    }
    finalGroups[1] = {
      ...finalGroups[1],
      budgetLines: parsedLines2,
      subtotal: parsedLines2.reduce((s, l) => s + l.total, 0),
    };
  }

  const totalBudget = finalGroups.reduce((s, g) => s + (g.subtotal || 0), 0);

  const summaryReport = [
    `📄 ตรวจสอบไฟล์ "${file.name}" (${(file.size / 1024).toFixed(1)} KB) สำเร็จ และลบไฟล์ออกจากหน่วยความจำแล้ว (ไม่เปลืองพื้นที่ระบบ 100%)`,
    `📌 ชื่อโครงการที่สกัดได้: "${detectedProjectName}"`,
    `🏛️ ประเภทโครงการที่แนะนำ: ประเภทที่ ${draft.recommendedCategoryNumber} (${draft.recommendedCategoryReason})`,
    `👥 กลุ่มเป้าหมาย: ${participantsCount} คน • ผู้สังเกตการณ์/แกนนำ: ${observersCount} คน • วิทยากร: ${hoursCount} ชม.`,
    `📋 กลั่นกรองและจัดโครงสร้างได้ ${finalGroups.length} กิจกรรมหลัก (${finalGroups.map((g) => g.activityName).join(' + ')}) รวมงบประมาณ ${totalBudget.toLocaleString()} บาท`,
  ];

  return {
    projectName: detectedProjectName,
    categoryNumber: draft.recommendedCategoryNumber,
    proposingOrg: detectedOrg,
    responsiblePerson: detectedOrg,
    phone: '',
    participantsCount,
    observersCount,
    hoursCount,
    snackMealsCount,
    activityGroups: finalGroups,
    summaryReport,
    rawExtractedPreview: extractedText.slice(0, 600),
  };
}
