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

export interface AuditPatientItem {
  patient: LtcPatient;
  equipmentType: FastEquipmentType;
  equipmentName: string;
  assetCode: string;
  existingLoanId?: string;
  loanDate: string;
}

const EQUIPMENT_OPTIONS: {
  type: FastEquipmentType;
  label: string;
  name: string;
  category: string;
  icon: string;
  defaultPrefix: string;
  color: string;
}[] = [
  {
    type: 'none',
    label: 'ไม่มียืมอุปกรณ์',
    name: '',
    category: '',
    icon: '❌',
    defaultPrefix: '',
    color: 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200',
  },
  {
    type: 'bed',
    label: 'เตียงผู้ป่วย 2 ไกร์',
    name: 'เตียงผู้ป่วยมือหมุน 2 ไกร์ พร้อมเบาะรองนอน',
    category: 'bed',
    icon: '🛏️',
    defaultPrefix: 'ทต.บป.BED',
    color: 'bg-indigo-50 text-indigo-800 border-indigo-300 hover:bg-indigo-100',
  },
  {
    type: 'wheelchair',
    label: 'รถเข็นวีลแชร์',
    name: 'รถเข็นวีลแชร์มาตรฐานพับได้ (Wheelchair)',
    category: 'wheelchair',
    icon: '♿',
    defaultPrefix: 'ทต.บป.WCH',
    color: 'bg-sky-50 text-sky-800 border-sky-300 hover:bg-sky-100',
  },
  {
    type: 'air_mattress',
    label: 'ที่นอนลม',
    name: 'ที่นอนลมป้องกันแผลกดทับแบบลอน (Air Mattress)',
    category: 'air_mattress',
    icon: '💨',
    defaultPrefix: 'ทต.บป.MAT',
    color: 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100',
  },
  {
    type: 'oxygen',
    label: 'เครื่องผลิต O2',
    name: 'เครื่องผลิตออกซิเจนขนาด 5 ลิตร (Oxygen Concentrator)',
    category: 'oxygen_concentrator',
    icon: '🫁',
    defaultPrefix: 'ทต.บป.OXY',
    color: 'bg-teal-50 text-teal-800 border-teal-300 hover:bg-teal-100',
  },
  {
    type: 'walker',
    label: 'ไม้เท้า/วอล์คเกอร์',
    name: 'อุปกรณ์ช่วยเดิน วอล์คเกอร์ 4 ขา (Walker)',
    category: 'walker',
    icon: '🦯',
    defaultPrefix: 'ทต.บป.WLK',
    color: 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100',
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

  // Initialize Audit Items based on patients and existing active loans
  const [auditItems, setAuditItems] = useState<AuditPatientItem[]>(() => {
    return patients.map((pt) => {
      // Find if this patient already has an active loan in loans
      const activeLoan = loans.find(
        (l) =>
          (l.status === 'borrowed' || l.status === 'approved') &&
          ((l.patientIdCard && pt.idCard && l.patientIdCard === pt.idCard) ||
            (l.patientName &&
              (l.patientName.includes(pt.fullName) || pt.fullName.includes(l.patientName))))
      );

      if (activeLoan) {
        let type: FastEquipmentType = 'bed';
        const name = (activeLoan.equipmentName || '').toLowerCase();
        const cat = (activeLoan.equipmentCategory || '').toLowerCase();
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
          patient: pt,
          equipmentType: type,
          equipmentName: activeLoan.equipmentName,
          assetCode: activeLoan.equipmentCode || '',
          existingLoanId: activeLoan.id,
          loanDate: activeLoan.loanDate || activeLoan.borrowDate || new Date().toISOString().split('T')[0],
        };
      }

      // Default: ไม่มียืมอุปกรณ์ (ตามที่ผู้ใช้ระบุ: ไม่ได้ยืมทุกราย)
      return {
        patient: pt,
        equipmentType: 'none',
        equipmentName: '',
        assetCode: '',
        loanDate: new Date().toISOString().split('T')[0],
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

  // Update item
  const handleSelectEquipmentType = (patientId: string, type: FastEquipmentType) => {
    setAuditItems((prev) =>
      prev.map((item) => {
        if (item.patient.id !== patientId) return item;
        if (type === 'none') {
          return {
            ...item,
            equipmentType: 'none',
            equipmentName: '',
            assetCode: '',
          };
        }
        const opt = EQUIPMENT_OPTIONS.find((o) => o.type === type);
        // Suggested asset code
        const suggestedCodes = availableUnitsByCat[type] || [];
        const nextCode = suggestedCodes.length > 0 ? suggestedCodes[0] : `${opt?.defaultPrefix || 'EQ'}-001`;

        return {
          ...item,
          equipmentType: type,
          equipmentName: opt?.name || '',
          assetCode: item.assetCode || nextCode,
        };
      })
    );
  };

  const handleUpdateAssetCode = (patientId: string, code: string) => {
    setAuditItems((prev) =>
      prev.map((item) => {
        if (item.patient.id !== patientId) return item;
        return { ...item, assetCode: code };
      })
    );
  };

  // Filtered List
  const filteredItems = useMemo(() => {
    return auditItems.filter((item) => {
      const pt = item.patient;
      if (villageFilter !== 'all' && (pt.moo || '1') !== villageFilter) return false;
      if (statusFilter === 'borrowing' && item.equipmentType === 'none') return false;
      if (statusFilter === 'none' && item.equipmentType !== 'none') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = pt.fullName.toLowerCase().includes(q);
        const matchesIdCard = pt.idCard?.includes(q);
        const matchesAddr = pt.address.toLowerCase().includes(q);
        const matchesEquip = item.assetCode.toLowerCase().includes(q) || item.equipmentName.toLowerCase().includes(q);
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
    let none = 0;

    auditItems.forEach((item) => {
      if (item.equipmentType === 'bed') bed++;
      else if (item.equipmentType === 'wheelchair') wheelchair++;
      else if (item.equipmentType === 'air_mattress') airMattress++;
      else if (item.equipmentType === 'oxygen') oxygen++;
      else if (item.equipmentType === 'walker') walker++;
      else none++;
    });

    const totalBorrowing = auditItems.length - none;
    return {
      total: auditItems.length,
      bed,
      wheelchair,
      airMattress,
      oxygen,
      walker,
      none,
      totalBorrowing,
    };
  }, [auditItems]);

  // Batch Save
  const handleSaveAll = () => {
    const thaiYear = new Date().getFullYear() + 543;
    const nowIso = new Date().toISOString().split('T')[0];

    // Filter out previous dummy loans that belonged to these patients
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
      if (item.equipmentType === 'none') return; // Do not create loan for non-borrowers!

      const pt = item.patient;
      const opt = EQUIPMENT_OPTIONS.find((o) => o.type === item.equipmentType);
      const codeStr = item.assetCode.trim() || `${opt?.defaultPrefix || 'EQ'}-${String(count).padStart(3, '0')}`;
      const contractNo = `LN-${thaiYear}/${String(count).padStart(3, '0')}`;

      const newLoan: EquipmentLoan = {
        id: item.existingLoanId || `LOAN-LTC-${pt.id}-${Date.now()}`,
        loanCode: contractNo,
        contractNumber: contractNo,
        docNo: contractNo,
        equipmentId: opt?.category || 'EQ-001',
        equipmentCode: codeStr,
        equipmentName: item.equipmentName || opt?.name || 'เตียงผู้ป่วย',
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
        loanDate: item.loanDate || nowIso,
        borrowDate: item.loanDate || nowIso,
        dueDate: `${parseInt(nowIso.split('-')[0]) + 1}-${nowIso.split('-')[1]}-${nowIso.split('-')[2]}`,
        officerInCharge: 'พันจ่าเอกอานัส เด็นหมาด',
        notes: `บันทึกจากการสำรวจอุปกรณ์ผู้ป่วย LTC ทต.บางเป้า (ประจำบ้านผู้ป่วย)`,
        createdAt: nowIso,
      };

      newCreatedLoans.push(newLoan);
      count++;
    });

    const finalLoans = [...newCreatedLoans, ...preservedLoans];
    onSaveBatchLoans(finalLoans);
    onClose();
  };

  // Quick Print for an item
  const handlePrintItem = (item: AuditPatientItem) => {
    const thaiYear = new Date().getFullYear() + 543;
    const pt = item.patient;
    const opt = EQUIPMENT_OPTIONS.find((o) => o.type === item.equipmentType);
    const contractNo = `LN-${thaiYear}/001`;

    const tempLoan: EquipmentLoan = {
      id: item.existingLoanId || `TEMP-${Date.now()}`,
      loanCode: contractNo,
      contractNumber: contractNo,
      docNo: contractNo,
      equipmentId: opt?.category || 'EQ-001',
      equipmentCode: item.assetCode || 'ทต.บป.______',
      equipmentName: item.equipmentName || opt?.name || 'เตียงผู้ป่วยมือหมุน 2 ไกร์',
      equipmentCategory: opt?.category || 'bed',
      borrowerName: pt.caregiverName || pt.fullName,
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
      loanDate: item.loanDate,
      borrowDate: item.loanDate,
      dueDate: '',
      officerInCharge: 'พันจ่าเอกอานัส เด็นหมาด',
      notes: 'สัญญายืมอุปกรณ์การแพทย์สำหรับผู้ป่วย LTC',
    };

    setPrintLoanTarget(tempLoan);
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex justify-center items-start p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl my-3 flex flex-col max-h-[94vh] border border-slate-200 overflow-hidden">
        
        {/* 1. Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-800 via-teal-900 to-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center border border-teal-400/30">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="font-extrabold text-base sm:text-lg flex items-center gap-2">
                <span>ตารางสำรวจและจับคู่อุปกรณ์ผู้มีภาวะพึ่งพิง LTC ({patients.length} ราย ทต.บางเป้า)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-teal-500/30 text-teal-200 border border-teal-400/30 font-bold">
                  อัปเดตตรงหน้างาน 100%
                </span>
              </div>
              <p className="text-xs text-teal-200/80 mt-0.5">
                เลือกบันทึกเฉพาะครัวเรือนที่ยืมอุปกรณ์จริง (เตียง, รถเข็น, ที่นอนลม ฯลฯ) โดยผู้ที่ไม่ได้ยืมให้คงไว้เป็น "ไม่มียืมอุปกรณ์"
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Print Blank Template */}
            <button
              type="button"
              onClick={() => setPrintLoanTarget(createBlankMedicalLoan())}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="พิมพ์แบบฟอร์มเปล่าขนาด A4 สำหรับนำไปให้ประชาชนลงนามที่บ้าน"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>🖨️ พิมพ์แบบฟอร์มเปล่า A4</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. KPI Summary Stat Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 p-3 sm:px-5 bg-slate-50 border-b border-slate-200 text-xs shrink-0">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] text-slate-500 font-bold">ผู้ป่วยทั้งหมด</div>
            <div className="text-xl font-black text-slate-800">{stats.total} <span className="text-[11px] font-normal text-slate-400">ราย</span></div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-indigo-200 shadow-2xs bg-indigo-50/30">
            <div className="text-[11px] text-indigo-700 font-bold">🛏️ เตียงผู้ป่วย</div>
            <div className="text-xl font-black text-indigo-900">{stats.bed} <span className="text-[11px] font-normal text-indigo-500">หลัง</span></div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-sky-200 shadow-2xs bg-sky-50/30">
            <div className="text-[11px] text-sky-700 font-bold">♿ รถเข็นวีลแชร์</div>
            <div className="text-xl font-black text-sky-900">{stats.wheelchair} <span className="text-[11px] font-normal text-sky-500">คัน</span></div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-emerald-200 shadow-2xs bg-emerald-50/30">
            <div className="text-[11px] text-emerald-700 font-bold">💨 ที่นอนลม</div>
            <div className="text-xl font-black text-emerald-900">{stats.airMattress} <span className="text-[11px] font-normal text-emerald-500">หลัง</span></div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-teal-200 shadow-2xs bg-teal-50/30">
            <div className="text-[11px] text-teal-700 font-bold">🫁 เครื่อง O2</div>
            <div className="text-xl font-black text-teal-900">{stats.oxygen} <span className="text-[11px] font-normal text-teal-500">เครื่อง</span></div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-amber-200 shadow-2xs bg-amber-50/30">
            <div className="text-[11px] text-amber-700 font-bold">🦯 วอล์คเกอร์/อื่นๆ</div>
            <div className="text-xl font-black text-amber-900">{stats.walker} <span className="text-[11px] font-normal text-amber-500">ชิ้น</span></div>
          </div>

          {/* Highlight: ไม่มียืมอุปกรณ์ */}
          <div className="bg-white p-2.5 rounded-xl border border-slate-300 shadow-2xs bg-slate-100/60 col-span-2 sm:col-span-1">
            <div className="text-[11px] text-slate-600 font-bold">⚪ ไม่มียืมอุปกรณ์</div>
            <div className="text-xl font-black text-slate-700">
              {stats.none}{' '}
              <span className="text-[10px] font-bold text-slate-500">
                ({Math.round((stats.none / (stats.total || 1)) * 100)}%)
              </span>
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
                  statusFilter === 'all' ? 'bg-white text-teal-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ทั้งหมด ({auditItems.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('borrowing')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                  statusFilter === 'borrowing' ? 'bg-white text-teal-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                มียืม ({stats.totalBorrowing})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('none')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                  statusFilter === 'none' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ไม่มียืม ({stats.none})
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
                  <th className="py-2.5 px-3 min-w-[340px]">
                    อุปกรณ์ที่ยืมใช้งานจริง (คลิกเพื่อเปลี่ยน)
                  </th>
                  <th className="py-2.5 px-3 w-[160px]">รหัสครุภัณฑ์ / หมายเลข</th>
                  <th className="py-2.5 px-3 w-[90px] text-center">พิมพ์สัญญา</th>
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
                    const isBorrowing = item.equipmentType !== 'none';

                    return (
                      <tr
                        key={pt.id}
                        className={`transition-colors ${
                          isBorrowing ? 'bg-teal-50/20 hover:bg-teal-50/40' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* 1. Sequence & Village */}
                        <td className="py-3 px-3 text-center">
                          <span className="font-mono font-bold text-slate-600">#{idx + 1}</span>
                          <div className="text-[10px] text-slate-400 font-medium">ม.{mooNum}</div>
                        </td>

                        {/* 2. Patient Info */}
                        <td className="py-3 px-3">
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
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800">{pt.shortAddress || pt.address}</div>
                          <div className="text-[11px] text-teal-700 font-medium">ม.{mooNum} {village}</div>
                          {pt.landmark && (
                            <div className="text-[10px] text-amber-700 truncate max-w-[160px]" title={pt.landmark}>
                              📍 {pt.landmark}
                            </div>
                          )}
                        </td>

                        {/* 4. Caregiver */}
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800">{pt.caregiverName || 'ญาติผู้ดูแล'}</div>
                          {(pt.caregiverPhone || pt.phone) ? (
                            <div className="text-[11px] text-teal-700 font-mono font-bold flex items-center gap-1">
                              <span>📞</span>
                              <span>{pt.caregiverPhone || pt.phone}</span>
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-400">-</div>
                          )}
                        </td>

                        {/* 5. Fast Equipment Options Pills */}
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {EQUIPMENT_OPTIONS.map((opt) => {
                              const isSelected = item.equipmentType === opt.type;
                              return (
                                <button
                                  key={opt.type}
                                  type="button"
                                  onClick={() => handleSelectEquipmentType(pt.id, opt.type)}
                                  className={`px-2 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                                    isSelected
                                      ? opt.type === 'none'
                                        ? 'bg-slate-700 text-white border-slate-800 shadow-xs'
                                        : 'bg-teal-700 text-white border-teal-800 shadow-xs ring-1 ring-teal-500'
                                      : opt.color
                                  }`}
                                >
                                  <span>{opt.icon}</span>
                                  <span>{opt.label}</span>
                                  {isSelected && <CheckCircle2 className="w-3 h-3 text-white ml-0.5" />}
                                </button>
                              );
                            })}
                          </div>
                        </td>

                        {/* 6. Asset Code / Serial */}
                        <td className="py-3 px-3">
                          {isBorrowing ? (
                            <div className="space-y-1">
                              <input
                                type="text"
                                value={item.assetCode}
                                onChange={(e) => handleUpdateAssetCode(pt.id, e.target.value)}
                                placeholder="รหัสครุภัณฑ์ เช่น BED-001"
                                className="w-full px-2 py-1 bg-white border border-teal-300 rounded-md font-mono text-xs font-bold text-teal-900 outline-none focus:ring-2 focus:ring-teal-500"
                              />
                              {/* Suggestions from stock if available */}
                              {availableUnitsByCat[item.equipmentType]?.length > 0 && (
                                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <span>ในคลัง:</span>
                                  <span
                                    onClick={() => handleUpdateAssetCode(pt.id, availableUnitsByCat[item.equipmentType][0])}
                                    className="text-teal-700 underline cursor-pointer font-mono font-bold"
                                    title="คลิกเพื่อใช้รหัสนี้"
                                  >
                                    {availableUnitsByCat[item.equipmentType][0]}
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">- ไม่ได้ยืม -</span>
                          )}
                        </td>

                        {/* 7. Print Contract */}
                        <td className="py-3 px-3 text-center">
                          {isBorrowing ? (
                            <button
                              type="button"
                              onClick={() => handlePrintItem(item)}
                              className="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-colors inline-flex items-center justify-center cursor-pointer shadow-2xs"
                              title="พิมพ์แบบฟอร์มสัญญายืม A4 2 หน้าสำหรับรายนี้"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-300">-</span>
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

        {/* 5. Modal Footer Action Bar */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>
              กำลังผูกอุปกรณ์จริง: <strong className="text-teal-900 font-extrabold">{stats.totalBorrowing}</strong> ครัวเรือน | ไม่มียืมอุปกรณ์: <strong className="text-slate-700 font-extrabold">{stats.none}</strong> ครัวเรือน
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>💾 บันทึกข้อมูลการยืมทั้งหมด ({stats.totalBorrowing} รายการ)</span>
            </button>
          </div>
        </div>

      </div>

      {/* Sub-Modal: Print Contract / Template */}
      {printLoanTarget && (
        <PrintEquipmentLoanModal
          loan={printLoanTarget}
          isOpen={Boolean(printLoanTarget)}
          onClose={() => setPrintLoanTarget(null)}
          savedSignerSettings={savedSignerSettings}
        />
      )}
    </div>
  );
};
