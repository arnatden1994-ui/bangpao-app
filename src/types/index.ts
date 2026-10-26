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
export interface NhsoProject {
  id: string;
  projectCode: string;
  projectName: string;
  proposingOrg: string; // เช่น ชมรม อสม., ชมรมผู้สูงอายุ, รพ.สต., กองสาธารณสุข
  category: 'health_promotion' | 'disease_prevention' | 'rehabilitation' | 'elderly_care' | 'dental';
  budgetRequested: number;
  budgetApproved: number;
  status: 'submitted' | 'under_review' | 'approved' | 'in_progress' | 'completed' | 'rejected';
  fiscalYear: string;
  startDate: string;
  endDate: string;
  targetParticipants: number;
  responsiblePerson: string;
  phone: string;
  outcomesSummary?: string;
}

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
  clerkPos: 'ปลัดเทศบาลตำบลบางเป้า',
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
      name: 'พันจ่าเอกอานัส เด่นหมาด',
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
