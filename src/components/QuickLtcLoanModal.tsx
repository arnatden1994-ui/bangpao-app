import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Stethoscope,
  Printer,
  Save,
  Trash2,
  Calendar,
  Phone,
  MapPin,
  User,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Plus,
  Edit3,
  Building2,
  FileText,
} from 'lucide-react';
import {
  LtcPatient,
  EquipmentLoan,
  MedicalEquipmentUnit,
  MedicalEquipment,
  SignerSettings,
} from '../types/index.ts';
import { BANGPAO_VILLAGES, formatThaiDate } from './NhsoLtcCombinedView.tsx';
import { PrintEquipmentLoanModal } from './PrintEquipmentLoanModal.tsx';

interface QuickLtcLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: LtcPatient | null;
  existingLoans?: EquipmentLoan[];
  existingLoan?: EquipmentLoan | null; // For backward compatibility
  equipmentUnits: MedicalEquipmentUnit[];
  equipmentList?: MedicalEquipment[];
  onSaveLoan: (loan: EquipmentLoan) => void;
  onRemoveLoan?: (loanId: string) => void;
  savedSignerSettings?: SignerSettings;
}

const QUICK_EQUIP_TYPES = [
  {
    type: 'bed',
    label: 'เตียงผู้ป่วยมือหมุน 2 ไกร์',
    name: 'เตียงผู้ป่วยมือหมุน 2 ไกร์ พร้อมเบาะรองนอน',
    category: 'bed',
    icon: '🛏️',
    prefix: 'ทต.บป.BED',
  },
  {
    type: 'wheelchair',
    label: 'รถเข็นวีลแชร์',
    name: 'รถเข็นวีลแชร์มาตรฐานพับได้ (Wheelchair)',
    category: 'wheelchair',
    icon: '♿',
    prefix: 'ทต.บป.WCH',
  },
  {
    type: 'air_mattress',
    label: 'ที่นอนลมป้องกันแผลกดทับ',
    name: 'ที่นอนลมป้องกันแผลกดทับแบบลอน (Air Mattress)',
    category: 'air_mattress',
    icon: '💨',
    prefix: 'ทต.บป.MAT',
  },
  {
    type: 'oxygen',
    label: 'เครื่องผลิตออกซิเจน 5 ลิตร',
    name: 'เครื่องผลิตออกซิเจนขนาด 5 ลิตร (Oxygen Concentrator)',
    category: 'oxygen_concentrator',
    icon: '🫁',
    prefix: 'ทต.บป.OXY',
  },
  {
    type: 'walker',
    label: 'อุปกรณ์ช่วยเดิน/วอล์คเกอร์',
    name: 'อุปกรณ์ช่วยเดิน วอล์คเกอร์ 4 ขา (Walker)',
    category: 'walker',
    icon: '🦯',
    prefix: 'ทต.บป.WLK',
  },
];

const BORROWER_RELATIONS = [
  'บุตร/ธิดา',
  'คู่สมรส',
  'บิดา/มารดา',
  'พี่น้อง',
  'ญาติผู้ดูแล',
  'ตนเอง (ผู้ป่วยยืมเอง)',
  'ผู้ดูแล/อสม.',
  'อื่นๆ',
];

export const QuickLtcLoanModal: React.FC<QuickLtcLoanModalProps> = ({
  isOpen,
  onClose,
  patient,
  existingLoans = [],
  existingLoan,
  equipmentUnits,
  onSaveLoan,
  onRemoveLoan,
  savedSignerSettings,
}) => {
  if (!isOpen || !patient) return null;

  // Combine existing loans list
  const activePatientLoans = useMemo(() => {
    if (existingLoans.length > 0) return existingLoans;
    if (existingLoan) return [existingLoan];
    return [];
  }, [existingLoans, existingLoan]);

  // Editing state: whether we are editing an existing loan or adding a new one
  const [editingLoanId, setEditingLoanId] = useState<string | null>(null);

  // Form Fields
  const [selectedType, setSelectedType] = useState<string>('bed');
  const [equipmentCustomName, setEquipmentCustomName] = useState<string>('');
  const [assetCode, setAssetCode] = useState<string>('');
  const [loanDate, setLoanDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [borrowerName, setBorrowerName] = useState<string>('');
  const [borrowerPhone, setBorrowerPhone] = useState<string>('');
  const [borrowerIdCard, setBorrowerIdCard] = useState<string>('');
  const [borrowerRelation, setBorrowerRelation] = useState<string>('ญาติผู้ดูแล');
  const [contractNumber, setContractNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [printModalLoan, setPrintModalLoan] = useState<EquipmentLoan | null>(null);

  // Reset form when patient changes or switching to "Add new"
  const resetToNewLoan = () => {
    setEditingLoanId(null);
    setSelectedType('bed');
    const defaultOpt = QUICK_EQUIP_TYPES[0];
    setEquipmentCustomName(defaultOpt.name);
    setAssetCode('');
    setLoanDate(new Date().toISOString().split('T')[0]);
    setBorrowerName(patient.caregiverName || patient.fullName);
    setBorrowerPhone(patient.caregiverPhone || patient.phone || '');
    setBorrowerIdCard(patient.idCard || '');
    setBorrowerRelation(patient.caregiverName ? 'ญาติผู้ดูแล' : 'ตนเอง (ผู้ป่วยยืมเอง)');
    const thaiYear = new Date().getFullYear() + 543;
    setContractNumber(`LN-${thaiYear}/${Math.floor(100 + Math.random() * 900)}`);
    setNotes('');
  };

  useEffect(() => {
    resetToNewLoan();
  }, [patient]);

  // Load a loan into the edit form
  const handleEditExistingLoan = (loanToEdit: EquipmentLoan) => {
    setEditingLoanId(loanToEdit.id);
    const name = (loanToEdit.equipmentName || '').toLowerCase();
    const cat = (loanToEdit.equipmentCategory || '').toLowerCase();
    let type = 'bed';
    if (name.includes('รถเข็น') || name.includes('wheelchair') || cat === 'wheelchair') {
      type = 'wheelchair';
    } else if (name.includes('ที่นอน') || cat === 'air_mattress') {
      type = 'air_mattress';
    } else if (name.includes('ออกซิเจน') || cat === 'oxygen_concentrator') {
      type = 'oxygen';
    } else if (name.includes('วอล์ค') || name.includes('ไม้เท้า') || cat === 'walker') {
      type = 'walker';
    }
    setSelectedType(type);
    setEquipmentCustomName(loanToEdit.equipmentName);
    setAssetCode(loanToEdit.equipmentCode || '');
    setLoanDate(
      loanToEdit.loanDate || loanToEdit.borrowDate || new Date().toISOString().split('T')[0]
    );
    setBorrowerName(loanToEdit.borrowerName || patient.caregiverName || patient.fullName);
    setBorrowerPhone(loanToEdit.borrowerPhone || loanToEdit.phone || '');
    setBorrowerIdCard(loanToEdit.borrowerIdCard || '');
    setBorrowerRelation(
      loanToEdit.relationshipWithPatient ||
        loanToEdit.borrowerRelation ||
        'ญาติผู้ดูแล'
    );
    setContractNumber(loanToEdit.contractNumber || loanToEdit.loanCode || '');
    setNotes(loanToEdit.notes || '');
  };

  // Switch equipment type
  const handleSelectType = (type: string) => {
    setSelectedType(type);
    const opt = QUICK_EQUIP_TYPES.find((o) => o.type === type);
    if (opt) {
      setEquipmentCustomName(opt.name);
      if (!editingLoanId) {
        // Suggested code
        const matchingUnits = equipmentUnits.filter((u) => {
          if (opt.category === 'bed') return u.category === 'bed';
          if (opt.category === 'wheelchair') return u.category === 'wheelchair';
          if (opt.category === 'air_mattress') return u.category === 'air_mattress';
          if (opt.category === 'oxygen_concentrator') return u.category === 'oxygen_concentrator';
          return u.category === 'other' || u.category === 'walker';
        });
        const firstCode = matchingUnits[0]?.assetCode;
        setAssetCode(firstCode || `${opt.prefix}-001`);
      }
    }
  };

  const activeTypeInfo =
    QUICK_EQUIP_TYPES.find((o) => o.type === selectedType) || QUICK_EQUIP_TYPES[0];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const thaiYear = new Date().getFullYear() + 543;
    const finalCode = assetCode.trim() || `${activeTypeInfo.prefix}-001`;
    const finalContractNo =
      contractNumber.trim() ||
      `LN-${thaiYear}/${Math.floor(100 + Math.random() * 900)}`;

    const savedLoan: EquipmentLoan = {
      id: editingLoanId || `LOAN-LTC-${patient.id}-${selectedType}-${Date.now()}`,
      loanCode: finalContractNo,
      contractNumber: finalContractNo,
      docNo: finalContractNo,
      equipmentId: activeTypeInfo.category || 'EQ-001',
      equipmentCode: finalCode,
      equipmentName: equipmentCustomName.trim() || activeTypeInfo.name,
      equipmentCategory: activeTypeInfo.category,
      borrowerName: borrowerName.trim() || patient.caregiverName || patient.fullName,
      borrowerIdCard: borrowerIdCard.trim() || patient.idCard || '',
      borrowerPhone: borrowerPhone.trim() || patient.caregiverPhone || patient.phone || '',
      phone: borrowerPhone.trim() || patient.caregiverPhone || patient.phone || '',
      borrowerAddress: patient.address,
      borrowerRelation: borrowerRelation.trim(),
      relationshipWithPatient: borrowerRelation.trim(),
      patientName: patient.fullName,
      patientIdCard: patient.idCard,
      patientAge: patient.age,
      patientDiagnosis: patient.diagnosis || 'ผู้มีภาวะพึ่งพิง LTC',
      patientAddress: patient.address,
      address: patient.address,
      moo: patient.moo || '1',
      latitude: patient.latitude,
      longitude: patient.longitude,
      status: 'borrowed',
      loanDate: loanDate,
      borrowDate: loanDate,
      dueDate: '',
      officerInCharge: 'พันจ่าเอกอานัส เด็นหมาด',
      notes: notes.trim() || `ผูกข้อมูลอุปกรณ์สำหรับผู้ป่วย LTC ทต.บางเป้า`,
    };

    onSaveLoan(savedLoan);
    resetToNewLoan();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold">
                  บันทึกและจัดการอุปกรณ์การแพทย์ประจำบ้าน
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-200 text-indigo-900 border border-indigo-300">
                  ✨ ยืมได้หลายอุปกรณ์
                </span>
              </div>
              <p className="text-xs text-teal-200 mt-0.5">
                ผู้ป่วย: <span className="font-extrabold text-white">{patient.fullName}</span> • ม.{patient.moo || '1'} {BANGPAO_VILLAGES[patient.moo || '1'] || ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-5 text-xs sm:text-sm text-slate-800 flex-1">
          {/* Patient Quick Info Card */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="space-y-0.5">
              <div className="font-extrabold text-slate-900 text-sm">{patient.fullName}</div>
              <div className="text-slate-500">{patient.address}</div>
              {patient.landmark && (
                <div className="text-amber-700 font-medium">📍 ใกล้: {patient.landmark}</div>
              )}
            </div>
            <div className="text-right space-y-0.5">
              <span
                className={`inline-block px-2 py-0.5 rounded-full font-bold text-[11px] ${
                  patient.adlCategory === 'ติดเตียง'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {patient.adlCategory || 'ติดเตียง'} ({patient.adlScore || 0} คะแนน)
              </span>
              <div className="text-teal-700 font-mono font-bold">
                📞 {patient.caregiverPhone || patient.phone || '-'}
              </div>
            </div>
          </div>

          {/* Section: รายการอุปกรณ์ที่กำลังยืมอยู่ปัจจุบัน (Active Loans List) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                <span>🛏️ อุปกรณ์ที่กำลังยืมอยู่ปัจจุบัน ({activePatientLoans.length} ชิ้น)</span>
              </h3>
              {editingLoanId && (
                <button
                  type="button"
                  onClick={resetToNewLoan}
                  className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ ยืมอุปกรณ์เพิ่มอีกชิ้น</span>
                </button>
              )}
            </div>

            {activePatientLoans.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center text-slate-500 text-xs">
                ⚪ ขณะนี้ยังไม่มีบันทึกการยืมอุปกรณ์สำหรับผู้ป่วยรายนี้ สามารถเลือกอุปกรณ์ด้านล่างเพื่อบันทึกได้ทันที
              </div>
            ) : (
              <div className="space-y-2">
                {activePatientLoans.map((loanItem) => (
                  <div
                    key={loanItem.id}
                    className={`p-3 rounded-xl border transition-all flex flex-wrap items-center justify-between gap-3 ${
                      editingLoanId === loanItem.id
                        ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-200'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                        <span>{loanItem.equipmentName}</span>
                        {loanItem.equipmentCode && (
                          <span className="font-mono text-[11px] font-extrabold px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 border border-indigo-200">
                            {loanItem.equipmentCode}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                        <span>ผู้ยืม: <strong className="text-slate-700">{loanItem.borrowerName}</strong> ({loanItem.borrowerRelation || 'ญาติ'})</span>
                        <span>•</span>
                        <span>เบอร์: <strong className="font-mono text-teal-700">{loanItem.borrowerPhone || '-'}</strong></span>
                        <span>•</span>
                        <span>วันที่ยืม: {formatThaiDate(loanItem.loanDate || loanItem.borrowDate)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPrintModalLoan(loanItem)}
                        className="px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        title="พิมพ์สัญญายืม A4"
                      >
                        <Printer className="w-3.5 h-3.5 text-teal-700" />
                        <span>สัญญา A4</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEditExistingLoan(loanItem)}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        title="แก้ไขข้อมูลผู้ยืม/อุปกรณ์นี้"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                        <span>แก้ไข</span>
                      </button>

                      {onRemoveLoan && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`ยืนยันการลบรายการยืม "${loanItem.equipmentName}" หรือไม่?`)) {
                              onRemoveLoan(loanItem.id);
                              if (editingLoanId === loanItem.id) resetToNewLoan();
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                          title="ลบรายการนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form: เพิ่มการยืมใหม่ หรือ แก้ไขรายการที่เลือก */}
          <form onSubmit={handleSave} className="space-y-4 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                {editingLoanId ? (
                  <span className="text-amber-800 font-extrabold">✏️ กำลังแก้ไขข้อมูลการยืม: {equipmentCustomName}</span>
                ) : (
                  <span className="text-teal-900 font-extrabold">+ ลงทะเบียนยืมอุปกรณ์ชิ้นใหม่สำหรับผู้ป่วยรายนี้</span>
                )}
              </h3>
              {editingLoanId && (
                <button
                  type="button"
                  onClick={resetToNewLoan}
                  className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  ยกเลิกการแก้ไข (เปลี่ยนเป็นเพิ่มรายการใหม่)
                </button>
              )}
            </div>

            {/* Quick Equipment Types Buttons */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                เลือกประเภทอุปกรณ์การแพทย์ <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {QUICK_EQUIP_TYPES.map((opt) => {
                  const isSel = selectedType === opt.type;
                  return (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => handleSelectType(opt.type)}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition-all ${
                        isSel
                          ? 'bg-teal-700 text-white border-teal-800 shadow-md ring-2 ring-teal-400'
                          : 'bg-white hover:bg-teal-50/50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span className="text-xl shrink-0">{opt.icon}</span>
                      <div className="truncate">
                        <div className="font-extrabold text-xs truncate">{opt.label}</div>
                        <div className={`text-[10px] truncate ${isSel ? 'text-teal-200' : 'text-slate-400'}`}>
                          {opt.prefix}-xxx
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Input Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่ออุปกรณ์ (ตามที่ระบุในสัญญา)
                </label>
                <input
                  type="text"
                  required
                  value={equipmentCustomName}
                  onChange={(e) => setEquipmentCustomName(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs font-bold outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  รหัสครุภัณฑ์ / ทะเบียนอุปกรณ์ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={assetCode}
                  onChange={(e) => setAssetCode(e.target.value)}
                  placeholder={`เช่น ${activeTypeInfo.prefix}-001`}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs font-mono font-extrabold text-teal-900 outline-none focus:ring-1 focus:ring-teal-500"
                  list="quick-assets"
                />
                <datalist id="quick-assets">
                  {equipmentUnits
                    .filter((u) => u.category === activeTypeInfo.category || u.category === 'other')
                    .map((u) => (
                      <option key={u.id} value={u.assetCode} />
                    ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  วันที่ยืม / ส่งมอบ
                </label>
                <input
                  type="date"
                  value={loanDate}
                  onChange={(e) => setLoanDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs font-semibold outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อ-นามสกุล ผู้ยืม (ผู้รับผิดชอบ) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={borrowerName}
                  onChange={(e) => setBorrowerName(e.target.value)}
                  placeholder="เช่น นางสาวสมใจ ใจดี"
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs font-bold outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ความสัมพันธ์กับผู้ป่วย
                </label>
                <select
                  value={borrowerRelation}
                  onChange={(e) => setBorrowerRelation(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs font-semibold outline-none cursor-pointer focus:ring-1 focus:ring-teal-500"
                >
                  {BORROWER_RELATIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  เบอร์โทรศัพท์ผู้ยืม <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={borrowerPhone}
                  onChange={(e) => setBorrowerPhone(e.target.value)}
                  placeholder="เช่น 081-234-5678"
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs font-mono font-bold outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  เลขบัตร ปชช. ผู้ยืม (13 หลัก)
                </label>
                <input
                  type="text"
                  maxLength={17}
                  value={borrowerIdCard}
                  onChange={(e) => setBorrowerIdCard(e.target.value)}
                  placeholder="x-xxxx-xxxxx-xx-x"
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs font-mono font-bold outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  หมายเหตุเพิ่มเติม
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="เช่น ยืมควบคู่กับเตียงผู้ป่วย หรือบ้านอยู่ท้ายซอย"
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                ปิดหน้าต่าง
              </button>

              <button
                type="submit"
                className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer transition-all hover:scale-[1.02]"
              >
                <Save className="w-4 h-4" />
                <span>{editingLoanId ? '💾 บันทึกการแก้ไข' : '💾 บันทึกการยืมอุปกรณ์ชิ้นนี้'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Print Modal target */}
      {printModalLoan && (
        <PrintEquipmentLoanModal
          isOpen={!!printModalLoan}
          onClose={() => setPrintModalLoan(null)}
          loan={printModalLoan}
          equipmentUnits={equipmentUnits}
          signerSettings={savedSignerSettings}
        />
      )}
    </div>
  );
};
