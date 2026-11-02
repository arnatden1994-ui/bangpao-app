export type UserRole = 'admin' | 'executive' | 'inspector' | 'staff' | 'citizen';

export interface RawMaterialItem {
  id: string;
  name: string;
  monthlyQuantity: string;
}

export interface LicenseRecord {
  id: string;
  businessName: string;
  roundYear: string; // e.g. "รอบปี 2569"
  createdAtFormatted: string; // e.g. "21/07/2026 10:50"
  licenseBookNo?: string;
  licenseNumber: string; // e.g. "11/2569"
  licenseYear: string; // e.g. "2569"
  approvalDate: string; // e.g. "22/07/2026"
  expireDate: string; // e.g. "22/07/2027"
  status: 'normal' | 'expiring' | 'expired' | 'pending';
  remainingDays: number;
  daysRemaining?: number;
  
  // Owner details
  ownerName: string;
  nationality: string;
  ownerAddressNo: string;
  ownerMoo: string;
  ownerTrokSoi: string;
  ownerRoad: string;
  ownerSubdistrict: string;
  ownerDistrict: string;
  ownerProvince: string;
  ownerPhone: string;

  // Establishment details
  businessCategory: string;
  useSameAddress: boolean;
  businessAddressNo: string;
  businessMoo: string;
  businessSubdistrict: string;
  businessDistrict: string;
  businessProvince: string;
  businessPhone: string;

  // Additional address fields
  businessStreet?: string;
  businessRoad?: string;
  businessSoi?: string;
  businessTrokSoi?: string;

  // Fee & Receipt details
  feeAmount?: string | number;
  feeText?: string;
  receiptBookNo?: string;
  receiptNo?: string;
  receiptDate?: string;

  // Executive Signer & Conditions
  execName?: string;
  execPos?: string;
  condition31?: string;
  condition32?: string;
  
  inspectionScore?: number;
  inspectionSummary?: string;
  inspectionData?: Partial<OfficialInspectionFormState>;
}

export interface OfficialInspectionFormState {
  // Section 1
  selectedCategories: string[];
  businessName: string;
  ownerName: string;
  ownerPhone: string;
  businessPhone: string;
  addressNo: string;
  moo: string;
  road: string;
  subdistrict: string;
  district: string;
  province: string;
  buildingType: string;
  buildingDetails: string;
  machineCount: number;
  horsepower: number;
  workingDaysPerWeek: number;
  maleWorkers: number;
  femaleWorkers: number;
  startTime: string;
  endTime: string;
  animalType?: string;
  animalCount?: number;
  hadComplaints: boolean;
  complaintCount?: number;
  complaintIssues?: string[];

  // Section 2
  rawMaterials: RawMaterialItem[];

  // Section 3
  criteriaAnswers: Record<
    string,
    { answer: 'yes' | 'no' | 'na' | ''; findings: string; recommendations: string }
  >;

  // Footer
  additionalNotes: string;
  overallResult: 'passed' | 'failed' | 'needs_improvement';
  inspectorName: string;
  inspectorPosition: string;
}

export interface User {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  email: string;
  role: UserRole;
  roleTitle: string;
  department: string;
  phone: string;
  avatar?: string;
  createdAt: string;
  status?: 'active' | 'pending' | 'suspended';
}

export interface RolePermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canInspect: boolean;
  canPrintCert: boolean;
  canApprove: boolean;
  canManageUsers: boolean;
}

export type EstablishmentType =
  | 'restaurant'
  | 'beverage_cafe'
  | 'fresh_market'
  | 'school_canteen'
  | 'food_factory'
  | 'street_food'
  | 'hazardous_business';

export type InspectionRating = 'excellent' | 'good' | 'fair' | 'poor' | 'uninspected';

export type EstablishmentStatus = 'passed' | 'needs_reinspection' | 'failed' | 'pending';

export interface Establishment {
  id: string;
  code: string;
  name: string;
  type: EstablishmentType;
  ownerName: string;
  phone: string;
  address: string;
  subdistrict: string;
  district: string;
  province: string;
  status: EstablishmentStatus;
  latestScore: number;
  latestRating: InspectionRating;
  latestInspectionDate: string;
  nextInspectionDate: string;
  certificateNo: string;
  certificateExpiryDate: string;
  inspectorName: string;
  notes: string;
  syncedToSheets: boolean;
  createdAt: string;
  updatedAt: string;
  imageUrl?: string;
}

export type CriteriaCategory =
  | 'environment'
  | 'personnel'
  | 'raw_materials'
  | 'utensils'
  | 'waste_and_pest';

export interface CriteriaItem {
  id: string;
  category: CriteriaCategory;
  categoryTitle: string;
  code: string;
  title: string;
  description: string;
  maxScore: number;
}

export interface EvaluationItemResult {
  criteriaId: string;
  result: 'pass' | 'partial' | 'fail';
  score: number;
  remarks: string;
}

export interface InspectionRecord {
  id: string;
  establishmentId: string;
  establishmentCode: string;
  establishmentName: string;
  establishmentType: EstablishmentType;
  inspectorName: string;
  inspectorPosition: string;
  inspectionDate: string;
  totalScore: number;
  rating: InspectionRating;
  status: 'passed' | 'needs_reinspection' | 'failed';
  itemResults: Record<string, EvaluationItemResult>;
  categoryScores: Record<CriteriaCategory, { score: number; max: number }>;
  defectsSummary: string[];
  recommendations: string;
  reinspectionDueDate?: string;
  inspectorSignature: string;
  recipientSignature: string;
  evidencePhotoUrl?: string;
  createdAt: string;
}

// 1. กิจการที่เป็นอันตรายต่อสุขภาพ (Health Hazardous Businesses)
export type HazardousCategory =
  | 'auto_repair'
  | 'recycling_waste'
  | 'slaughterhouse'
  | 'wood_furniture'
  | 'livestock_farm'
  | 'chemical_paint'
  | 'industrial_laundry'
  | 'metal_welding'
  | 'dormitory_rental'
  | 'other';

export interface HazardousBusiness {
  id: string;
  code: string;
  name: string;
  category: HazardousCategory;
  ownerName: string;
  phone: string;
  address: string;
  subdistrict: string;
  riskLevel: 'high' | 'medium' | 'low';
  licenseStatus: 'valid' | 'expired' | 'pending' | 'revoked';
  licenseNumber: string;
  licenseExpireDate: string;
  latestInspectionDate: string;
  latestScore: number;
  inspectorName: string;
  notes: string;
  createdAt: string;
}

// 2. ระบบคำร้องทั่วไป & เรื่องร้องเรียนเหตุรำคาญ (Public Petitions & Complaints)
export type PetitionCategory =
  | 'nuisance_smell'
  | 'nuisance_noise'
  | 'waste_sewage'
  | 'license_request'
  | 'fogging_spray'
  | 'rabies_vaccine'
  | 'stray_animals'
  | 'other';

// ชนิดแบบฟอร์มคำร้องตามแม่แบบของเทศบาล (ระบบที่ 5)
export type PetitionFormType = 'general' | 'sewage';

// เขตค่าธรรมเนียมบริการกำจัดสิ่งปฏิกูล ตามข้อบัญญัติเทศบาลตำบลบางเป้า
export type SewageZone = 'in_district' | 'out_10' | 'out_20' | 'out_30';

export interface PetitionAddress {
  houseNo: string;
  soi: string;
  road: string;
  moo: string;
  subdistrict: string;
  district: string;
  province: string;
  phone?: string;
}

// เส้นทางเสนออนุมัติ: ผอ.กองสาธารณสุขฯ -> ปลัดเทศบาล -> นายกเทศมนตรี/ผู้แทน
export interface PetitionApprovalTrail {
  proposedAt?: string;
  proposedBy?: string;
  clerkAt?: string;
  clerkBy?: string;
  decision?: 'approved' | 'rejected';
  decisionAt?: string;
  decisionBy?: string;
  rejectReason?: string;
}

export interface PetitionFeeReceipt {
  paidAmount?: number;
  bookNo?: string;
  receiptNo?: string;
  receiptDate?: string;
  collector?: string;
}

export interface PetitionOperationResult {
  done?: boolean;
  doneDate?: string;
  byName?: string;
  byPosition?: string;
  pendingReason?: string;
}

// ข้อมูลที่ใช้เติมลงแบบฟอร์ม (คำร้องทั่วไป / คำร้องขอรับบริการกำจัดสิ่งปฏิกูล)
export interface PetitionFormData {
  formType: PetitionFormType;
  docNo?: string;
  filedDate: string; // YYYY-MM-DD
  subject?: string; // เรื่อง (คำร้องทั่วไป)
  purpose?: string; // ข้าพเจ้ามีความประสงค์ (คำร้องทั่วไป)
  recommendation?: string; // ความเห็นเจ้าหน้าที่ - เพื่อโปรดทราบและพิจารณา
  directorOrder?: string; // คำสั่ง ผอ.กอง (คำร้องทั่วไป)
  applicantAddress: PetitionAddress;
  serviceAddress?: PetitionAddress; // สถานที่ขอรับบริการ (คำร้องขอสูบสิ่งปฏิกูล)
  sewageZone?: SewageZone;
  feeAmount?: number;
  tankType?: string;
  appointmentDate?: string;
  attachIdCopy?: boolean;
  receivedDate?: string;
  receivedBy?: string;
  feeReceipt?: PetitionFeeReceipt;
  operation?: PetitionOperationResult;
}

export interface PublicPetition {
  id: string;
  trackingCode: string;
  title: string;
  category: PetitionCategory;
  citizenName: string;
  citizenIdCard?: string;
  phone: string;
  address: string;
  description: string;
  status: 'submitted' | 'accepted' | 'investigating' | 'resolved' | 'rejected' | 'pending' | 'assigned';
  assignedOfficer: string;
  submissionDate: string;
  resolvedDate?: string;
  resolutionNotes?: string;
  createdAt?: string;
  updatedAt?: string;
  // ระบบที่ 5 (ฟอร์มคำร้องตามแม่แบบ / เส้นทางเสนออนุมัติ / พิกัด)
  form?: PetitionFormData;
  approval?: PetitionApprovalTrail;
  moo?: string;
  latitude?: number;
  longitude?: number;
}

// 3. ระบบโครงการกองทุนหลักประกันสุขภาพระดับท้องถิ่น (NHSO Fund Projects)
export type NhsoFundCategoryClause =
  | 'ข้อ 10 (1)'
  | 'ข้อ 10 (2)'
  | 'ข้อ 10 (3)'
  | 'ข้อ 10 (4)'
  | 'ข้อ 10 (5)'
  | 'ข้อ 10 (6)'
  | 'ข้อ 10 (7)'
  | 'ข้อ 10 (8)';

export interface NhsoFundCategoryInfo {
  number: number;
  clause: NhsoFundCategoryClause;
  title: string;
  shortTitle: string;
  description: string;
  badgeColor: string;
}

export const NHSO_FUND_CATEGORIES: NhsoFundCategoryInfo[] = [
  {
    number: 1,
    clause: 'ข้อ 10 (1)',
    shortTitle: 'บริการสาธารณสุขของหน่วยบริการ/สถานบริการ',
    title: '1. สนับสนุนและส่งเสริมการจัดบริการสาธารณสุขของหน่วยบริการ สถานบริการ หรือหน่วยงานสาธารณสุข [ข้อ 10 (1)]',
    description: 'สนับสนุนและส่งเสริมการจัดบริการสาธารณสุขของหน่วยบริการ สถานบริการ หรือหน่วยงานสาธารณสุข',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  },
  {
    number: 2,
    clause: 'ข้อ 10 (2)',
    shortTitle: 'สร้างเสริมสุขภาพ/ป้องกันโรคโดยองค์กร/ชุมชน',
    title: '2. สนับสนุนและส่งเสริมการจัดกระบวนการหรือกิจกรรมสร้างเสริมสุขภาพ และการป้องกันโรคขององค์กรหรือกลุ่มประชาชน [ข้อ 10 (2)]',
    description: 'สนับสนุนและส่งเสริมการจัดกระบวนการหรือกิจกรรมสร้างเสริมสุขภาพ และการป้องกันโรคขององค์กรหรือกลุ่มประชาชน',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  },
  {
    number: 3,
    clause: 'ข้อ 10 (3)',
    shortTitle: 'ศูนย์พัฒนาเด็กเล็ก/ผู้สูงอายุ/คนพิการ',
    title: '3. สนับสนุนและส่งเสริมการจัดบริการสาธารณสุขของศูนย์ฯ หรือหน่วยงานที่รับผิดชอบศูนย์ฯ (เด็กเล็ก/ผู้สูงอายุ/คนพิการ) [ข้อ 10 (3)]',
    description: 'สนับสนุนและส่งเสริมการจัดบริการสาธารณสุขของศูนย์ฯ หรือหน่วยงานที่รับผิดชอบศูนย์ฯ (เด็กเล็ก/ผู้สูงอายุ/คนพิการ)',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
  },
  {
    number: 4,
    clause: 'ข้อ 10 (4)',
    shortTitle: 'การบริหาร/พัฒนากองทุนฯ',
    title: '4. สนับสนุนการบริหารหรือพัฒนากองทุนฯ [ข้อ 10 (4)]',
    description: 'สนับสนุนการบริหารหรือพัฒนากองทุนฯ ให้มีประสิทธิภาพ',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  },
  {
    number: 5,
    clause: 'ข้อ 10 (5)',
    shortTitle: 'กรณีโรคระบาดหรือภัยพิบัติ',
    title: '5. สนับสนุนและส่งเสริมกิจกรรมกรณีเกิดโรคระบาดหรือภัยพิบัติ [ข้อ 10 (5)]',
    description: 'สนับสนุนและส่งเสริมกิจกรรมกรณีเกิดโรคระบาดหรือภัยพิบัติในพื้นที่',
    badgeColor: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
  },
  {
    number: 6,
    clause: 'ข้อ 10 (6)',
    shortTitle: 'ค่าตอบแทนผู้ช่วยเหลือดูแลผู้มีภาวะพึ่งพิง (CG)',
    title: '6. สนับสนุนเป็นค่าจ้างค่าตอบแทนหรือค่าป่วยการของผู้ช่วยเหลือดูแลผู้ที่มีภาวะพึ่งพิง [ข้อ 10 (6)]',
    description: 'สนับสนุนเป็นค่าจ้างค่าตอบแทนหรือค่าป่วยการของผู้ช่วยเหลือดูแลผู้ที่มีภาวะพึ่งพิงในชุมชน',
    badgeColor: 'bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-950 dark:text-pink-300 dark:border-pink-800',
  },
  {
    number: 7,
    clause: 'ข้อ 10 (7)',
    shortTitle: 'บริการสาธารณสุขตามมติคณะกรรมการฯ (ผ้าอ้อมฯลฯ)',
    title: '7. สนับสนุนและส่งเสริมการจัดบริการสาธารณสุขตามมติคณะกรรมการหลักประกันสุขภาพแห่งชาติ [ข้อ 10 (7)]',
    description: 'สนับสนุนและส่งเสริมการจัดบริการสาธารณสุขตามมติคณะกรรมการหลักประกันสุขภาพแห่งชาติ เช่น ผ้าอ้อมผู้ใหญ่ แผ่นรองซับ',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800',
  },
  {
    number: 8,
    clause: 'ข้อ 10 (8)',
    shortTitle: 'บริการพาหนะรับส่งผู้ทุพพลภาพ',
    title: '8. สนับสนุนและส่งเสริมการจัดบริการพาหนะรับส่งผู้ทุพพลภาพเพื่อเข้ารับบริการสาธารณสุข [ข้อ 10 (8)]',
    description: 'สนับสนุนและส่งเสริมการจัดบริการพาหนะรับส่งผู้ทุพพลภาพเพื่อเข้ารับบริการสาธารณสุข',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800',
  },
];

export interface NhsoFundBudgetLine {
  id: string;
  activityCategory?: string; // เช่น 1. กิจกรรมอบรมให้ความรู้
  name: string; // รายการค่าใช้จ่าย เช่น 1.1) ค่าตอบแทนวิทยากร
  quantity: number;
  unit: string; // ชั่วโมง, มื้อ, ชุด, ผืน, ป้าย, ชิ้น, คน
  unitPrice: number;
  total: number;
  note?: string; // เช่น (50 คน x 3 ชิ้น x 95 วัน x 9.50 บาท)
}

export interface NhsoFundSigners {
  proposerName: string; // ผู้เสนอ
  proposerTitle: string; // ตำแหน่งผู้เสนอ
  endorserName: string; // ผู้เห็นชอบ เช่น นายโชคชัย รอดรักษา
  endorserTitle: string; // ตำแหน่งผู้เห็นชอบ เช่น เลขานุการกองทุนฯ ทต.บางเป้า
  approverName: string; // ผู้อนุมัติ เช่น นายละดม เชื้อช่วย
  approverTitle: string; // ตำแหน่งผู้อนุมัติ เช่น ประธานกองทุนฯ ทต.บางเป้า
}

export interface NhsoFundSettings {
  fiscalYear: string;
  totalFundBudget: number; // กรอบงบประมาณรวมของกองทุน เช่น 600000
  defaultEndorserName: string;
  defaultEndorserTitle: string;
  defaultApproverName: string;
  defaultApproverTitle: string;
  standardRates: {
    speakerHourly: number; // 600
    lunchPerMeal: number; // 75
    snackPerMeal: number; // 25
    vinylPerBanner: number; // 450
    adultDiaperPerPiece: number; // 9.50
  };
  orgProposerDefaults?: Record<string, { name: string; title: string }>;
  updatedAt?: string;
}

export interface NhsoProject {
  id: string;
  orderNumber?: number;
  projectCode: string;
  projectName: string;
  proposingOrg: string; // เช่น ชมรม อสม., ชมรมผู้สูงอายุ, รพ.สต., กองสาธารณสุข
  category?: 'health_promotion' | 'disease_prevention' | 'rehabilitation' | 'elderly_care' | 'dental';
  categoryNumber?: number; // 1 - 8
  categoryName?: string; // ข้อ 10 (1) - (8)
  budgetRequested: number;
  budgetApproved: number;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'approved_reduced' | 'in_progress' | 'completed' | 'rejected';
  fiscalYear: string;
  roundNumber?: number;
  startDate?: string;
  endDate?: string;
  targetParticipants?: number;
  responsiblePerson: string;
  phone?: string;
  outcomesSummary?: string;

  // 13 Columns detail & Management
  activities?: string;
  objectives?: string;
  targetGroup?: string;
  kpi?: string;
  location?: string;
  duration?: string;
  budgetLines?: NhsoFundBudgetLine[];
  signers?: NhsoFundSigners;
  committeeDecision?: 'approve' | 'reject' | 'revision' | 'pending';
  committeeComment?: string;
  approvedDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type NhsoFundProject = NhsoProject;


export interface LtcRoundItem {
  itemId: string;
  itemName: string;
  quantity: number;
  unit: string;
}

export interface RoundDeliveryRecord {
  patientId: string;
  year: string;
  round: string;
  status: 'pending' | 'delivered';
  deliveredAt?: string;
  receiverName?: string;
  deliveryNote?: string;
  itemsDelivered?: LtcRoundItem[];
}

// แผนการจัดรอบส่งมอบพัสดุและสิ่งของ LTC (LTC Round Delivery Plan)
export interface LtcPlanStop {
  patientId: string;
  queueOrder: number; // 1, 2, 3...
  fullName: string;
  idCard?: string;
  age: number;
  gender?: 'male' | 'female';
  phone: string;
  caregiverName: string;
  caregiverPhone: string;
  relationshipWithPatient?: string;
  address: string;
  moo: string;
  subdistrict?: string;
  latitude: number;
  longitude: number;
  adlScore?: number;
  adlCategory: string; // 'ติดเตียง' | 'ติดบ้าน' | 'สูงอายุ'
  items: LtcRoundItem[];
  scheduledTime?: string;
  deliveryStatus: 'pending' | 'delivered';
  deliveredAt?: string;
  receiverName?: string;
  notes?: string;
}

export interface LtcRoundPlan {
  id: string; // e.g. "PLAN-2569-1"
  fiscalYear: string; // "2569"
  round: string; // "1", "2", "3", "urgent"
  roundName: string; // "งวดรอบที่ 1 (ต.ค. - มี.ค.)"
  planTitle: string; // "แผนจัดรอบส่งมอบพัสดุ LTC งวดที่ 1 ปีงบ 2569"
  deliveryDate: string; // "2026-11-15" (กำหนดวันแจก)
  deliveryTimeWindow: string; // "09:00 - 16:30 น."
  driverName: string; // "นายชนะ สุขด้วง (พนักงานขับรถ)"
  staffNames: string; // "พันจ่าเอกอานัส เด็นหมาด (เจ้าพนักงานสาธารณสุข), CG"
  vehiclePlate: string; // "ผก-4512 ตรัง"
  stops: LtcPlanStop[];
  totalDistanceKm: number;
  totalDurationMin: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// 4. ระบบการดูแลระยะยาวผู้สูงอายุที่มีภาวะพึ่งพิง (LTC - Long Term Care)
export interface LtcPatient {
  id: string;
  hn: string;
  idCard: string;
  fullName: string;
  gender?: 'male' | 'female';
  age: number;
  adlScore: number; // 0 - 20
  adlGroup: 'group_1' | 'group_2' | 'group_3' | 'group_4'; // กลุ่ม 1 เคลื่อนไหวได้บ้าง, กลุ่ม 4 ติดเตียงรุนแรง
  adlCategory?: string;
  monthlyDiaperAllowance?: number;
  equipmentNeeded?: string;
  fiscalYear?: string;
  roundItems?: Record<string, LtcRoundItem[]>;
  yearRoundItems?: Record<string, Record<string, LtcRoundItem[]>>;
  queuedPeriods?: string[];
  caregiverPhone?: string;
  moo?: string;
  diagnosis: string;
  careManagerName: string;
  caregiverName: string;
  phone: string;
  address: string;
  subdistrict: string;
  carePlanSummary: string;
  lastVisitDate: string;
  nextVisitDate: string;
  status: 'active' | 'deceased' | 'relocated';
  receivedCarePack?: boolean;
  latitude?: number;
  longitude?: number;
  createdAt?: string;
}

// 5. ระบบบริการยืม-คืนอุปกรณ์ทางการแพทย์และกายอุปกรณ์ (Medical Equipment Lending)
export type EquipmentCategory =
  | 'bed'
  | 'wheelchair'
  | 'oxygen_concentrator'
  | 'air_mattress'
  | 'suction_machine'
  | 'walker'
  | 'commode_chair';

export interface MedicalEquipment {
  id: string;
  assetCode: string;
  name: string;
  category: EquipmentCategory;
  totalQuantity: number;
  availableQuantity: number;
  inUseQuantity: number;
  maintenanceQuantity: number;
  condition: 'good' | 'fair' | 'maintenance';
  storageLocation: string;
  imageUrl?: string;
  status?: string;
}

export type EquipmentUnitCondition = 'good' | 'fair' | 'damaged' | 'repair_needed';
export type EquipmentUnitStatus = 'available' | 'borrowed' | 'maintenance' | 'disposed';

export interface MedicalEquipmentUnit {
  id: string; // e.g. 'UNIT-BED-001'
  equipmentId: string; // category id, e.g. 'EQ-001'
  assetCode: string; // เลขทะเบียน/เลขครุภัณฑ์ e.g. 'BED-001'
  unitNumber?: number; // ลำดับชิ้น เช่น 1, 2, 3, 4, 5
  name: string; // ชื่ออุปกรณ์ e.g. 'เตียงผู้ป่วยมือหมุน 2 ไกร์'
  category: EquipmentCategory;
  brandModel: string; // ยี่ห้อ / รุ่น เช่น 'Paramount Bed 2-Crank'
  serialNumber?: string; // หมายเลขเครื่อง / S/N
  condition: EquipmentUnitCondition; // สภาพ: 'good' (สมบูรณ์ 100%) | 'fair' (ดี/พอใช้) | 'damaged' (ชำรุด) | 'repair_needed' (ต้องซ่อม)
  status: EquipmentUnitStatus; // 'available' (ว่างพร้อมยืม) | 'borrowed' (ถูกยืมใช้งาน) | 'maintenance' (ชำรุด/ซ่อมบำรุง) | 'disposed' (จำหน่าย)
  storageLocation: string; // สถานที่จัดเก็บเมื่ออยู่ในคลัง e.g. 'ห้องคลังอุปกรณ์ชั้น 1 กองสาธารณสุข'
  imageUrl?: string;
  // ข้อมูลผู้ยืม/ผู้ถือครองปัจจุบัน (กรณีถูกยืม - แสดงว่าอยู่บ้านใคร)
  currentLoanId?: string; // ID สัญญา
  currentLoanCode?: string; // เลขที่สัญญา เช่น 'LN-2569-001'
  currentBorrowerName?: string; // ชื่อผู้ยืม เช่น 'นายสมชาย ใจดี'
  currentBorrowerPhone?: string; // เบอร์ติดต่อผู้ยืม
  currentPatientName?: string; // ชื่อผู้ป่วย เช่น 'ตาแดง สุขดี'
  currentAddress?: string; // บ้านเลขที่ / ที่อยู่ผู้ป่วย
  currentMoo?: string; // หมู่ที่ เช่น '1'
  borrowDate?: string; // วันที่เริ่มยืม
  dueDate?: string; // วันที่ครบกำหนดส่งคืน
  // รายละเอียดการซ่อมบำรุง
  repairNotes?: string; // อาการชำรุด หรือรายการซ่อมบำรุง
  notes?: string; // บันทึกเพิ่มเติม
  createdAt?: string;
  updatedAt?: string;
}

export interface EquipmentLoan {
  id: string;
  loanCode: string;
  contractNumber?: string;
  docNo?: string;
  equipmentId: string;
  equipmentCode?: string;
  equipmentCategory?: string;
  equipmentName: string;
  borrowerName: string;
  borrowerIdCard?: string;
  borrowerNationalId?: string;
  borrowerCitizenId?: string;
  borrowerRelation?: string;
  patientName: string;
  patientIdCard?: string;
  patientNationalId?: string;
  patientAge?: string | number;
  patientDiagnosis?: string;
  patientAddress?: string;
  patientPhone?: string;
  phone: string;
  borrowerPhone?: string;
  address: string;
  borrowerAddress?: string;
  relationshipWithPatient?: string;
  borrowDate?: string;
  loanDate: string;
  dueDate: string;
  returnDate?: string;
  deliveryDate?: string;
  deliveryStaff?: string;
  status: 'pending' | 'approved' | 'borrowed' | 'returned' | 'overdue';
  officerInCharge: string;
  approvedBy?: string;
  approvedDate?: string;
  returnCondition?: 'complete' | 'damaged';
  damageNotes?: string;
  returnedBy?: string;
  returnInspector?: string;
  depositAmount?: number;
  notes: string;
  createdAt?: string;
  latitude?: number;
  longitude?: number;
  moo?: string;
  isPublicCitizenRequest?: boolean;
  itemsSummary?: string;
}

export interface GoogleSheetsConfig {
  appsScriptUrl: string;
  sheetId: string;
  autoSync: boolean;
  lastSyncTime: string | null;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  syncMessage: string;
}

export type MainNavTab =
  | 'overview'
  | 'hazardous'
  | 'nhso_ltc'
  | 'equipment'
  | 'petitions'
  | 'gas_app'
  | 'dashboard'
  | 'establishments'
  | 'nhso'
  | 'ltc'
  | 'inspections'
  | 'reports'
  | 'settings';

export interface InspectorSignerItem {
  id: string;
  name: string;
  position: string;
}

export interface SignerSettings {
  directorName: string;
  directorPos: string;
  directorPosition?: string;
  clerkName: string;
  clerkPos: string;
  mayorName: string;
  mayorPos: string;
  actingMayorName?: string;
  actingMayorPosition?: string;
  actingMayorFor?: string;
  driverName: string;
  feeInDistrict: string;
  feeOut10km: string;
  feeOut20km: string;
  feeOut30km: string;
  inspectors?: InspectorSignerItem[];
}

export const DEFAULT_SIGNER_SETTINGS: SignerSettings = {
  directorName: 'นางสาวปฐมาภรณ์ จันทร์แจ่ม',
  directorPos: 'ผู้อำนวยการกองสาธารณสุขและสิ่งแวดล้อม',
  directorPosition: 'ผู้อำนวยการกองสาธารณสุขและสิ่งแวดล้อม',
  clerkName: 'นายจตุพร ศรีสุวรรณ',
  clerkPos: 'ปลัดเทศบาล',
  mayorName: 'นายนิติธรรม ดำสุด',
  mayorPos: 'รองนายกเทศมนตรี ปฏิบัติราชการแทน\nนายกเทศมนตรีตำบลบางเป้า',
  actingMayorName: 'นายนิติธรรม ดำสุด',
  actingMayorPosition: 'รองนายกเทศมนตรี ปฏิบัติราชการแทน',
  actingMayorFor: 'นายกเทศมนตรีตำบลบางเป้า',
  driverName: 'นายชนะ สุขด้วง',
  feeInDistrict: '250',
  feeOut10km: '700',
  feeOut20km: '1000',
  feeOut30km: '1300',
  inspectors: [
    {
      id: 'insp-1',
      name: 'พันจ่าเอกอานัส เด็นหมาด',
      position: 'เจ้าพนักงานสาธารณสุขชำนาญงาน',
    },
    {
      id: 'insp-2',
      name: 'นางสาวปฐมาภรณ์ จันทร์แจ่ม',
      position: 'ผู้อำนวยการกองสาธารณสุขและสิ่งแวดล้อม',
    },
    {
      id: 'insp-3',
      name: 'นายจตุพร ศรีสุวรรณ',
      position: 'ปลัดเทศบาลตำบลบางเป้า',
    },
    {
      id: 'insp-4',
      name: 'นายนิติธรรม ดำสุด',
      position: 'รองนายกเทศมนตรีตำบลบางเป้า',
    },
  ],
};

export interface NotificationSettings {
  // LINE Messaging API / Group Notification
  lineEnabled: boolean;
  lineGroupName: string;
  lineChannelAccessToken: string;
  lineTargetId: string; // Group ID (C...) or User ID (U...)
  lineWebhookUrl: string; // Optional custom webhook / Make / n8n

  // Official Email Notification
  emailEnabled: boolean;
  emailGasWebAppUrl: string; // Dedicated Apps Script URL for Email + PDF/DOCX attachments
  departmentEmailName: string;
  recipientEmails: string; // Comma-separated emails
  ccEmails: string;
  attachOfficialPdfForm: boolean;
  attachOfficialDocxForm: boolean;

  // Event Triggers
  notifyOnGeneralPetition: boolean;
  notifyOnSewagePetition: boolean;
  notifyOnEquipmentLoan: boolean;
  notifyOnLtcDeliveryQueue: boolean;
  notifyOnCalendarEvent: boolean;
  notifyOnEquipmentFollowUp: boolean;
  dailyMorningSummaryEnabled: boolean;
  dailyMorningSummaryTime: string;
}

