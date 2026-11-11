import React, { useState, useMemo } from 'react';
import {
  X,
  Stethoscope,
  Printer,
  Save,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  Building2,
  Calendar,
  Sparkles,
  Phone,
  MapPin,
  FileText,
  User,
  ExternalLink,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  LtcPatient,
  EquipmentLoan,
  MedicalEquipmentUnit,
  MedicalEquipment,
  SignerSettings,
} from '../types/index.ts';
import { BANGPAO_VILLAGES, formatThaiDate } from './NhsoLtcCombinedView.tsx';
import {
  createBlankMedicalLoan,
  openOfficialMedicalLoanPrintWindow,
} from '../services/medicalLoanDocGenerator.ts';
import { PrintEquipmentLoanModal } from './PrintEquipmentLoanModal.tsx';

interface LtcEquipmentAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: LtcPatient[];
  loans: EquipmentLoan[];
  equipmentUnits: MedicalEquipmentUnit[];
  equipmentList?: MedicalEquipment[];
  onSaveBatchLoans: (updatedLoans: EquipmentLoan[]) => void;
  savedSignerSettings?: SignerSettings;
}

export type FastEquipmentType =
  | 'none'
  | 'bed'
  | 'wheelchair'
  | 'air_mattress'
  | 'oxygen'
  | 'walker';

export interface PatientEquipmentItem {
  type: FastEquipmentType;
  equipmentName: string;
  assetCode: string;
  existingLoanId?: string;
  loanDate: string;
}

export interface AuditPatientItem {
  patient: LtcPatient;
  equipments: PatientEquipmentItem[];
}

const EQUIPMENT_OPTIONS: {
  type: FastEquipmentType;
  label: string;
  name: string;
  category: string;
  icon: string;
  defaultPrefix: string;
  color: string;
  activeColor: string;
}[] = [
  {
    type: 'none',
    label: 'ไม่มียืมอุปกรณ์',
    name: '',
    category: '',
    icon: '❌',
    defaultPrefix: '',
    color: 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200',
    activeColor: 'bg-slate-700 text-white border-slate-800 shadow-sm',
  },
  {
    type: 'bed',
    label: 'เตียงผู้ป่วย 2 ไกร์',
    name: 'เตียงผู้ป่วยมือหมุน 2 ไกร์ พร้อมเบาะรองนอน',
    category: 'bed',
    icon: '🛏️',
    defaultPrefix: 'ทต.บป.BED',
    color: 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100',
    activeColor: 'bg-indigo-700 text-white border-indigo-800 shadow-sm ring-2 ring-indigo-400',
  },
  {
    type: 'wheelchair',
    label: 'รถเข็นวีลแชร์',
    name: 'รถเข็นวีลแชร์มาตรฐานพับได้ (Wheelchair)',
    category: 'wheelchair',
    icon: '♿',
    defaultPrefix: 'ทต.บป.WCH',
    color: 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100',
    activeColor: 'bg-sky-700 text-white border-sky-800 shadow-sm ring-2 ring-sky-400',
  },
  {
    type: 'air_mattress',
    label: 'ที่นอนลม',
    name: 'ที่นอนลมป้องกันแผลกดทับแบบลอน (Air Mattress)',
    category: 'air_mattress',
    icon: '💨',
    defaultPrefix: 'ทต.บป.MAT',
    color: 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100',
    activeColor: 'bg-emerald-700 text-white border-emerald-800 shadow-sm ring-2 ring-emerald-400',
  },
  {
    type: 'oxygen',
    label: 'เครื่องผลิต O2',
    name: 'เครื่องผลิตออกซิเจนขนาด 5 ลิตร (Oxygen Concentrator)',
    category: 'oxygen_concentrator',
    icon: '🫁',
    defaultPrefix: 'ทต.บป.OXY',
    color: 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100',
    activeColor: 'bg-teal-700 text-white border-teal-800 shadow-sm ring-2 ring-teal-400',
  },
  {
    type: 'walker',
    label: 'ไม้เท้า/วอล์คเกอร์',
    name: 'อุปกรณ์ช่วยเดิน วอล์คเกอร์ 4 ขา (Walker)',
    category: 'walker',
    icon: '🦯',
    defaultPrefix: 'ทต.บป.WLK',
    color: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100',
    activeColor: 'bg-amber-700 text-white border-amber-800 shadow-sm ring-2 ring-amber-400',
  },
];

export const LtcEquipmentAuditModal: React.FC<LtcEquipmentAuditModalProps> = ({
  isOpen,
  onClose,
  patients,
  loans,
  equipmentUnits,
  onSaveBatchLoans,
  savedSignerSettings,
}) => {
  if (!isOpen) return null;

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [villageFilter, setVillageFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'borrowing' | 'none'>('all');
  const [printLoanTarget, setPrintLoanTarget] = useState<EquipmentLoan | null>(null);

  // Initialize Audit Items based on patients and existing active loans (supporting multi-borrowing!)
  const [auditItems, setAuditItems] = useState<AuditPatientItem[]>(() => {
    return patients.map((pt) => {
      // Find ALL active loans for this patient in loans
      const activeLoans = loans.filter(
        (l) =>
          (l.status === 'borrowed' || l.status === 'approved') &&
          ((l.patientIdCard && pt.idCard && l.patientIdCard === pt.idCard) ||
            (l.patientName &&
              (l.patientName.includes(pt.fullName) || pt.fullName.includes(l.patientName))) ||
            (l.borrowerIdCard && pt.idCard && l.borrowerIdCard === pt.idCard) ||
            (l.borrowerName &&
              (l.borrowerName.includes(pt.fullName) || pt.fullName.includes(l.borrowerName))))
      );

      const items: PatientEquipmentItem[] = activeLoans.map((l) => {
        let type: FastEquipmentType = 'bed';
        const name = (l.equipmentName || '').toLowerCase();
        const cat = (l.equipmentCategory || '').toLowerCase();
        if (name.includes('รถเข็น') || name.includes('วีลแชร์') || cat === 'wheelchair') {
          type = 'wheelchair';
        } else if (name.includes('ที่นอน') || cat === 'air_mattress') {
          type = 'air_mattress';
        } else if (name.includes('ออกซิเจน') || cat === 'oxygen_concentrator') {
          type = 'oxygen';
        } else if (name.includes('วอล์ค') || name.includes('ไม้เท้า') || cat === 'walker') {
          type = 'walker';
        } else {
          type = 'bed';
        }

        return {
          type,
          equipmentName: l.equipmentName || '',
          assetCode: l.equipmentCode || '',
          existingLoanId: l.id,
          loanDate: l.loanDate || l.borrowDate || new Date().toISOString().split('T')[0],
        };
      });

      return {
        patient: pt,
        equipments: items,
      };
    });
  });

  // Calculate Available Asset Codes by category
  const availableUnitsByCat = useMemo(() => {
    const map: Record<string, string[]> = {
      bed: [],
      wheelchair: [],
      air_mattress: [],
      oxygen: [],
      walker: [],
    };
    equipmentUnits.forEach((u) => {
      const code = u.assetCode || u.unitNumber?.toString() || '';
      if (!code) return;
      if (u.category === 'bed') map.bed.push(code);
      else if (u.category === 'wheelchair') map.wheelchair.push(code);
      else if (u.category === 'air_mattress') map.air_mattress.push(code);
      else if (u.category === 'oxygen_concentrator') map.oxygen.push(code);
      else map.walker.push(code);
    });
    return map;
  }, [equipmentUnits]);

  // Toggle Equipment (allows multi-select: 1 patient can borrow multiple equipment!)
  const handleToggleEquipmentType = (patientId: string, type: FastEquipmentType) => {
    const nowIso = new Date().toISOString().split('T')[0];
    setAuditItems((prev) =>
      prev.map((item) => {
        if (item.patient.id !== patientId) return item;

        if (type === 'none') {
          // Clear all equipment for this patient
          return {
            ...item,
            equipments: [],
          };
        }

        const exists = item.equipments.some((e) => e.type === type);
        if (exists) {
          // Toggle off
          return {
            ...item,
            equipments: item.equipments.filter((e) => e.type !== type),
          };
        } else {
          // Toggle on: add this equipment
          const opt = EQUIPMENT_OPTIONS.find((o) => o.type === type);
          const suggestedCodes = availableUnitsByCat[type] || [];
          const nextCode = suggestedCodes.length > 0 ? suggestedCodes[0] : `${opt?.defaultPrefix || 'EQ'}-001`;
          const newItem: PatientEquipmentItem = {
            type,
            equipmentName: opt?.name || '',
            assetCode: nextCode,
            loanDate: nowIso,
          };
          return {
            ...item,
            equipments: [...item.equipments, newItem],
          };
        }
      })
    );
  };

  const handleUpdateAssetCode = (patientId: string, type: FastEquipmentType, code: string) => {
    setAuditItems((prev) =>
      prev.map((item) => {
        if (item.patient.id !== patientId) return item;
        return {
          ...item,
          equipments: item.equipments.map((eq) =>
            eq.type === type ? { ...eq, assetCode: code } : eq
          ),
        };
      })
    );
  };

  // Filtered List
  const filteredItems = useMemo(() => {
    return auditItems.filter((item) => {
      const pt = item.patient;
      if (villageFilter !== 'all' && (pt.moo || '1') !== villageFilter) return false;
      const isBorrowing = item.equipments.length > 0;
      if (statusFilter === 'borrowing' && !isBorrowing) return false;
      if (statusFilter === 'none' && isBorrowing) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = pt.fullName.toLowerCase().includes(q);
        const matchesIdCard = pt.idCard?.includes(q);
        const matchesAddr = pt.address.toLowerCase().includes(q);
        const matchesEquip = item.equipments.some(
          (eq) =>
            eq.assetCode.toLowerCase().includes(q) ||
            eq.equipmentName.toLowerCase().includes(q)
        );
        if (!matchesName && !matchesIdCard && !matchesAddr && !matchesEquip) return false;
      }
      return true;
    });
  }, [auditItems, villageFilter, statusFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    let bed = 0;
    let wheelchair = 0;
    let airMattress = 0;
    let oxygen = 0;
    let walker = 0;
    let householdsBorrowing = 0;
    let householdsNone = 0;
    let totalEquipmentUnits = 0;

    auditItems.forEach((item) => {
      if (item.equipments.length === 0) {
        householdsNone++;
      } else {
        householdsBorrowing++;
        item.equipments.forEach((eq) => {
          totalEquipmentUnits++;
          if (eq.type === 'bed') bed++;
          else if (eq.type === 'wheelchair') wheelchair++;
          else if (eq.type === 'air_mattress') airMattress++;
          else if (eq.type === 'oxygen') oxygen++;
          else if (eq.type === 'walker') walker++;
        });
      }
    });

    return {
      totalPatients: auditItems.length,
      householdsBorrowing,
      householdsNone,
      totalEquipmentUnits,
      bed,
      wheelchair,
      airMattress,
      oxygen,
      walker,
    };
  }, [auditItems]);

  // Batch Save all loans for all patients (supporting multiple equipment per patient!)
  const handleSaveAll = () => {
    const thaiYear = new Date().getFullYear() + 543;
    const nowIso = new Date().toISOString().split('T')[0];

    // Filter out previous loans for these patients
    const patientIds = new Set(patients.map((p) => p.id));
    const patientNames = new Set(patients.map((p) => p.fullName));

    // Keep loans from other sources (e.g. general public), remove old matches for these patients
    const preservedLoans = loans.filter((l) => {
      if (l.patientIdCard && patients.some((p) => p.idCard === l.patientIdCard)) return false;
      if (l.patientName && patientNames.has(l.patientName)) return false;
      return true;
    });

    const newCreatedLoans: EquipmentLoan[] = [];
    let count = 1;

    auditItems.forEach((item) => {
      const pt = item.patient;
      item.equipments.forEach((eq) => {
        const opt = EQUIPMENT_OPTIONS.find((o) => o.type === eq.type);
        const codeStr =
          eq.assetCode.trim() ||
          `${opt?.defaultPrefix || 'EQ'}-${String(count).padStart(3, '0')}`;
        const contractNo = `LN-${thaiYear}/${String(count).padStart(3, '0')}`;

        const newLoan: EquipmentLoan = {
          id: eq.existingLoanId || `LOAN-LTC-${pt.id}-${eq.type}-${Date.now()}-${count}`,
          loanCode: contractNo,
          contractNumber: contractNo,
          docNo: contractNo,
          equipmentId: opt?.category || 'EQ-001',
          equipmentCode: codeStr,
          equipmentName: eq.equipmentName || opt?.name || 'อุปกรณ์การแพทย์',
          equipmentCategory: opt?.category || 'bed',
          borrowerName: pt.caregiverName || pt.fullName,
          borrowerIdCard: pt.idCard || '',
          borrowerPhone: pt.caregiverPhone || pt.phone || '',
          phone: pt.caregiverPhone || pt.phone || '',
          borrowerAddress: pt.address,
          borrowerRelation: pt.caregiverName ? 'ญาติผู้ดูแล' : 'ตนเอง',
          relationshipWithPatient: pt.caregiverName ? 'ญาติผู้ดูแล' : 'ตนเอง',
          patientName: pt.fullName,
          patientIdCard: pt.idCard,
          patientAge: pt.age,
          patientDiagnosis: pt.diagnosis || 'ผู้มีภาวะพึ่งพิง LTC',
          patientAddress: pt.address,
          address: pt.address,
          moo: pt.moo || '1',
          latitude: pt.latitude,
          longitude: pt.longitude,
          status: 'borrowed',
          loanDate: eq.loanDate || nowIso,
          borrowDate: eq.loanDate || nowIso,
          dueDate: `${parseInt(nowIso.split('-')[0]) + 1}-${nowIso.split('-')[1]}-${nowIso.split('-')[2]}`,
          officerInCharge: 'พันจ่าเอกอานัส เด็นหมาด',
          notes: `บันทึกจากการสำรวจอุปกรณ์ผู้ป่วย LTC ทต.บางเป้า (ประจำบ้านผู้ป่วย)`,
          createdAt: nowIso,
        };

        newCreatedLoans.push(newLoan);
        count++;
      });
    });

    const finalLoans = [...newCreatedLoans, ...preservedLoans];
    onSaveBatchLoans(finalLoans);
    onClose();
  };

  // Quick Print for a specific equipment of a patient
  const handlePrintSingleItem = (pt: LtcPatient, eq: PatientEquipmentItem) => {
    const thaiYear = new Date().getFullYear() + 543;
    const opt = EQUIPMENT_OPTIONS.find((o) => o.type === eq.type);
    const contractNo = `LN-${thaiYear}/001`;

    const tempLoan: EquipmentLoan = {
      id: eq.existingLoanId || `TEMP-${Date.now()}`,
      loanCode: contractNo,
      contractNumber: contractNo,
      docNo: contractNo,
      equipmentId: opt?.category || 'EQ-001',
      equipmentCode: eq.assetCode || 'ทต.บป.EQ-001',
      equipmentName: eq.equipmentName || opt?.name || 'เตียงผู้ป่วย',
      equipmentCategory: opt?.category || 'bed',
      borrowerName: pt.caregiverName || pt.fullName,
      borrowerIdCard: pt.idCard || '.............................',
      borrowerPhone: pt.caregiverPhone || pt.phone || '......................',
      phone: pt.caregiverPhone || pt.phone || '',
      borrowerAddress: pt.address,
      borrowerRelation: pt.caregiverName ? 'ญาติผู้ดูแล' : 'ตนเอง',
      relationshipWithPatient: pt.caregiverName ? 'ญาติผู้ดูแล' : 'ตนเอง',
      patientName: pt.fullName,
      patientIdCard: pt.idCard,
      patientAge: pt.age,
      patientDiagnosis: pt.diagnosis || 'ผู้มีภาวะพึ่งพิง LTC',
      patientAddress: pt.address,
      address: pt.address,
      moo: pt.moo || '1',
      status: 'borrowed',
      loanDate: eq.loanDate || new Date().toISOString().split('T')[0],
      borrowDate: eq.loanDate || new Date().toISOString().split('T')[0],
      dueDate: '1 ปีนับจากวันที่ได้รับอุปกรณ์',
      officerInCharge: 'พันจ่าเอกอานัส เด็นหมาด',
      notes: 'สัญญายืมอุปกรณ์การแพทย์ตำบลบางเป้า',
    };

    setPrintLoanTarget(tempLoan);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-2xl max-w-6xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[94vh]">
        {/* 1. Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shadow-inner">
              <Stethoscope className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight">
                  ตารางสำรวจและจับคู่อุปกรณ์ผู้มีภาวะพึ่งพิง LTC ({patients.length} ราย ทต.บางเป้า)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-400 text-emerald-950 border border-emerald-300">
                  อัปเดตตรงหน้างาน 100%
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-200 text-indigo-900 border border-indigo-300">
                  ✨ 1 คน ยืมได้หลายอุปกรณ์
                </span>
              </div>
              <p className="text-xs text-teal-200 mt-0.5">
                เลือกบันทึกเฉพาะครัวเรือนที่ยืมอุปกรณ์จริง (เตียง, รถเข็น, ที่นอนลม ฯลฯ) โดยผู้ที่ไม่ได้ยืมให้คงไว้เป็น &ldquo;ไม่มียืมอุปกรณ์&rdquo;
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Print Blank Template Button */}
            <button
              type="button"
              onClick={() => setPrintLoanTarget(createBlankMedicalLoan())}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-sm cursor-pointer transition-colors"
              title="พิมพ์แม่แบบสัญญายืมอุปกรณ์ A4 (แบบฟอร์มเปล่าสำหรับถือไปให้เซ็นหน้างาน)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>🖨️ พิมพ์แบบฟอร์มเปล่า A4</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Top Statistics Cards */}
        <div className="p-3 sm:px-5 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-xs">
            {/* Total Patients */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-semibold text-slate-500">ผู้ป่วยทั้งหมด</div>
              <div className="text-lg font-black text-slate-900 mt-0.5">
                {stats.totalPatients} <span className="text-xs font-normal text-slate-500">ราย</span>
              </div>
            </div>

            {/* Bed */}
            <div className="bg-white p-2.5 rounded-xl border border-indigo-100 shadow-2xs">
              <div className="text-[11px] font-bold text-indigo-700 flex items-center gap-1">
                <span>🛏️</span>
                <span>เตียงผู้ป่วย</span>
              </div>
              <div className="text-lg font-black text-indigo-900 mt-0.5">
                {stats.bed} <span className="text-xs font-normal text-slate-500">หลัง</span>
              </div>
            </div>

            {/* Wheelchair */}
            <div className="bg-white p-2.5 rounded-xl border border-sky-100 shadow-2xs">
              <div className="text-[11px] font-bold text-sky-700 flex items-center gap-1">
                <span>♿</span>
                <span>รถเข็นวีลแชร์</span>
              </div>
              <div className="text-lg font-black text-sky-900 mt-0.5">
                {stats.wheelchair} <span className="text-xs font-normal text-slate-500">คัน</span>
              </div>
            </div>

            {/* Air Mattress */}
            <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs">
              <div className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                <span>💨</span>
                <span>ที่นอนลม</span>
              </div>
              <div className="text-lg font-black text-emerald-900 mt-0.5">
                {stats.airMattress} <span className="text-xs font-normal text-slate-500">หลัง</span>
              </div>
            </div>

            {/* Oxygen */}
            <div className="bg-white p-2.5 rounded-xl border border-teal-100 shadow-2xs">
              <div className="text-[11px] font-bold text-teal-700 flex items-center gap-1">
                <span>🫁</span>
                <span>เครื่อง O2</span>
              </div>
              <div className="text-lg font-black text-teal-900 mt-0.5">
                {stats.oxygen} <span className="text-xs font-normal text-slate-500">เครื่อง</span>
              </div>
            </div>

            {/* Walker */}
            <div className="bg-white p-2.5 rounded-xl border border-amber-100 shadow-2xs">
              <div className="text-[11px] font-bold text-amber-700 flex items-center gap-1">
                <span>🦯</span>
                <span>วอล์คเกอร์/อื่นๆ</span>
              </div>
              <div className="text-lg font-black text-amber-900 mt-0.5">
                {stats.walker} <span className="text-xs font-normal text-slate-500">ชิ้น</span>
              </div>
            </div>

            {/* Non-borrowers summary */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                <span>⚪</span>
                <span>ไม่มียืมอุปกรณ์</span>
              </div>
              <div className="text-lg font-black text-slate-600 mt-0.5">
                {stats.householdsNone}{' '}
                <span className="text-[11px] font-normal text-slate-400">
                  ({Math.round((stats.householdsNone / (stats.totalPatients || 1)) * 100)}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Toolbar Filters */}
        <div className="p-3 sm:px-5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative w-56 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อผู้ป่วย, เลขบัตร, หรือรหัส..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs outline-none focus:ring-2 focus:ring-teal-500 font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Village Filter */}
            <select
              value={villageFilter}
              onChange={(e) => setVillageFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">📍 ทุกหมู่บ้าน (หมู่ 1 - 7)</option>
              {Object.entries(BANGPAO_VILLAGES).map(([moo, vName]) => (
                <option key={moo} value={moo}>
                  หมู่ที่ {moo} {vName}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-white text-teal-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ทั้งหมด ({auditItems.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('borrowing')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                  statusFilter === 'borrowing'
                    ? 'bg-white text-teal-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                มียืม ({stats.householdsBorrowing})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('none')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                  statusFilter === 'none'
                    ? 'bg-white text-slate-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ไม่มียืม ({stats.householdsNone})
              </button>
            </div>
          </div>

          <div className="text-slate-500 text-[11px]">
            แสดง <strong className="text-teal-800 font-bold">{filteredItems.length}</strong> จาก {auditItems.length} ครัวเรือน
          </div>
        </div>

        {/* 4. Table Area (Scrollable) */}
        <div className="overflow-y-auto flex-1 p-3 sm:p-5">
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/90 text-slate-700 font-extrabold border-b border-slate-200 text-[11px] sticky top-0 z-10 shadow-2xs select-none">
                <tr>
                  <th className="py-2.5 px-3 w-[60px] text-center">ลำดับ</th>
                  <th className="py-2.5 px-3 w-[220px]">ผู้มีภาวะพึ่งพิง & ระดับ ADL</th>
                  <th className="py-2.5 px-3 w-[170px]">ที่อยู่ & จุดอ้างอิง</th>
                  <th className="py-2.5 px-3 w-[150px]">ผู้ดูแล & เบอร์โทร</th>
                  <th className="py-2.5 px-3 min-w-[370px]">
                    อุปกรณ์ที่ยืมใช้งานจริง (คลิกเพื่อเลือก/ยกเลิก - ยืมได้หลายอุปกรณ์)
                  </th>
                  <th className="py-2.5 px-3 w-[180px]">รหัสครุภัณฑ์ / หมายเลข</th>
                  <th className="py-2.5 px-3 w-[100px] text-center">พิมพ์สัญญา</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-xs">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      🔍 ไม่พบข้อมูลตามเงื่อนไขที่เลือก
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => {
                    const pt = item.patient;
                    const mooNum = pt.moo || '1';
                    const village = BANGPAO_VILLAGES[mooNum] || `หมู่ ${mooNum}`;
                    const isBorrowing = item.equipments.length > 0;

                    return (
                      <tr
                        key={pt.id}
                        className={`transition-colors ${
                          isBorrowing ? 'bg-teal-50/20 hover:bg-teal-50/40' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* 1. Sequence & Village */}
                        <td className="py-3 px-3 text-center align-top">
                          <span className="font-mono font-bold text-slate-600">#{idx + 1}</span>
                          <div className="text-[10px] text-slate-400 font-medium">ม.{mooNum}</div>
                        </td>

                        {/* 2. Patient Info */}
                        <td className="py-3 px-3 align-top">
                          <div className="font-extrabold text-slate-900 text-sm">{pt.fullName}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                pt.adlCategory === 'ติดเตียง'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {pt.adlCategory || 'ติดเตียง'}
                            </span>
                            <span className="text-[11px] text-slate-500">อายุ {pt.age} ปี</span>
                          </div>
                          {pt.diagnosis && (
                            <div className="text-[11px] text-slate-500 truncate max-w-[200px]" title={pt.diagnosis}>
                              {pt.diagnosis}
                            </div>
                          )}
                        </td>

                        {/* 3. Address & Village */}
                        <td className="py-3 px-3 align-top">
                          <div className="font-semibold text-slate-800">{pt.shortAddress || pt.address}</div>
                          <div className="text-[11px] text-teal-700 font-medium">ม.{mooNum} {village}</div>
                          {pt.landmark && (
                            <div className="text-[10px] text-amber-700 truncate max-w-[160px]" title={pt.landmark}>
                              📍 {pt.landmark}
                            </div>
                          )}
                        </td>

                        {/* 4. Caregiver */}
                        <td className="py-3 px-3 align-top">
                          <div className="font-semibold text-slate-800">{pt.caregiverName || 'ญาติผู้ดูแล'}</div>
                          {pt.caregiverPhone || pt.phone ? (
                            <div className="text-[11px] text-teal-700 font-mono font-bold flex items-center gap-1">
                              <span>📞</span>
                              <span>{pt.caregiverPhone || pt.phone}</span>
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-400">-</div>
                          )}
                        </td>

                        {/* 5. Fast Equipment Options Pills (Multi-select toggles!) */}
                        <td className="py-3 px-3 align-top">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {EQUIPMENT_OPTIONS.map((opt) => {
                              const isNoneOpt = opt.type === 'none';
                              const isSelected = isNoneOpt
                                ? item.equipments.length === 0
                                : item.equipments.some((e) => e.type === opt.type);

                              return (
                                <button
                                  key={opt.type}
                                  type="button"
                                  onClick={() => handleToggleEquipmentType(pt.id, opt.type)}
                                  className={`px-2 py-1 rounded-lg text-xs font-extrabold border transition-all flex items-center gap-1 cursor-pointer select-none ${
                                    isSelected
                                      ? opt.activeColor
                                      : `${opt.color} opacity-85 hover:opacity-100`
                                  }`}
                                  title={
                                    isNoneOpt
                                      ? 'ล้างอุปกรณ์ทั้งหมด (ไม่มีการยืม)'
                                      : `คลิกเพื่อเลือกหรือยกเลิกการยืม ${opt.label}`
                                  }
                                >
                                  <span>{opt.icon}</span>
                                  <span>{opt.label}</span>
                                  {isSelected && !isNoneOpt && (
                                    <CheckCircle2 className="w-3 h-3 text-white ml-0.5 shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                          {item.equipments.length > 1 && (
                            <div className="mt-1.5 text-[10px] text-indigo-700 font-bold flex items-center gap-1">
                              <span>✨</span>
                              <span>ยืม {item.equipments.length} รายการ</span>
                            </div>
                          )}
                        </td>

                        {/* 6. Asset Code / Serial for Each Selected Equipment */}
                        <td className="py-3 px-3 align-top">
                          {isBorrowing ? (
                            <div className="space-y-2">
                              {item.equipments.map((eq) => {
                                const opt = EQUIPMENT_OPTIONS.find((o) => o.type === eq.type);
                                return (
                                  <div key={eq.type} className="space-y-0.5 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-700">
                                      <span className="flex items-center gap-1 truncate">
                                        <span>{opt?.icon}</span>
                                        <span className="truncate">{opt?.label}</span>
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleToggleEquipmentType(pt.id, eq.type)}
                                        className="text-slate-400 hover:text-rose-600 cursor-pointer text-[10px]"
                                        title="ลบรายการนี้"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                    <input
                                      type="text"
                                      value={eq.assetCode}
                                      onChange={(e) => handleUpdateAssetCode(pt.id, eq.type, e.target.value)}
                                      placeholder="ระบุเลขครุภัณฑ์..."
                                      className="w-full px-2 py-0.5 bg-white border border-teal-300 rounded font-mono text-[11px] font-extrabold text-teal-950 outline-none focus:ring-1 focus:ring-teal-500"
                                      list={`assets-${eq.type}`}
                                    />
                                    <datalist id={`assets-${eq.type}`}>
                                      {(availableUnitsByCat[eq.type] || []).map((code) => (
                                        <option key={code} value={code} />
                                      ))}
                                    </datalist>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic">- ไม่ได้ยืม -</span>
                          )}
                        </td>

                        {/* 7. Print Contract per equipment */}
                        <td className="py-3 px-3 text-center align-top">
                          {isBorrowing ? (
                            <div className="flex flex-col items-center gap-1">
                              {item.equipments.map((eq) => {
                                const opt = EQUIPMENT_OPTIONS.find((o) => o.type === eq.type);
                                return (
                                  <button
                                    key={eq.type}
                                    type="button"
                                    onClick={() => handlePrintSingleItem(pt, eq)}
                                    className="w-full inline-flex items-center justify-center gap-1 px-1.5 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 text-[10px] font-extrabold cursor-pointer transition-colors shadow-2xs"
                                    title={`พิมพ์สัญญายืม ${eq.equipmentName} (${eq.assetCode})`}
                                  >
                                    <Printer className="w-3 h-3 text-teal-700 shrink-0" />
                                    <span>{opt?.icon} {eq.assetCode ? eq.assetCode.slice(-6) : 'สัญญา'}</span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-slate-300 text-xs">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. Bottom Save Bar */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-600 font-semibold">
              กำลังผูกอุปกรณ์จริง: <strong className="text-emerald-800">{stats.householdsBorrowing} ครัวเรือน</strong> (รวม {stats.totalEquipmentUnits} รายการอุปกรณ์) | ไม่มียืมอุปกรณ์: <strong className="text-slate-600">{stats.householdsNone} ครัวเรือน</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 cursor-pointer transition-colors"
            >
              ยกเลิก
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              className="px-5 py-2 rounded-xl text-xs font-black text-white bg-teal-700 hover:bg-teal-800 shadow-md flex items-center gap-1.5 cursor-pointer transition-all hover:scale-[1.02]"
            >
              <Save className="w-4 h-4" />
              <span>💾 บันทึกข้อมูลการยืมทั้งหมด ({stats.totalEquipmentUnits} รายการ)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Print Modal target */}
      {printLoanTarget && (
        <PrintEquipmentLoanModal
          isOpen={!!printLoanTarget}
          onClose={() => setPrintLoanTarget(null)}
          loan={printLoanTarget}
          equipmentUnits={equipmentUnits}
          signerSettings={savedSignerSettings}
        />
      )}
    </div>
  );
};
