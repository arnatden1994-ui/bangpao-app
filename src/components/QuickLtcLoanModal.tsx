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
  existingLoan?: EquipmentLoan | null;
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

export const QuickLtcLoanModal: React.FC<QuickLtcLoanModalProps> = ({
  isOpen,
  onClose,
  patient,
  existingLoan,
  equipmentUnits,
  onSaveLoan,
  onRemoveLoan,
  savedSignerSettings,
}) => {
  if (!isOpen || !patient) return null;

  const [selectedType, setSelectedType] = useState<string>('bed');
  const [assetCode, setAssetCode] = useState<string>('');
  const [loanDate, setLoanDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Sync with existing loan if present
  useEffect(() => {
    if (existingLoan) {
      const name = (existingLoan.equipmentName || '').toLowerCase();
      const cat = (existingLoan.equipmentCategory || '').toLowerCase();
      if (name.includes('รถเข็น') || name.includes('wheelchair') || cat === 'wheelchair') {
        setSelectedType('wheelchair');
      } else if (name.includes('ที่นอน') || cat === 'air_mattress') {
        setSelectedType('air_mattress');
      } else if (name.includes('ออกซิเจน') || cat === 'oxygen_concentrator') {
        setSelectedType('oxygen');
      } else if (name.includes('วอล์ค') || name.includes('ไม้เท้า') || cat === 'walker') {
        setSelectedType('walker');
      } else {
        setSelectedType('bed');
      }
      setAssetCode(existingLoan.equipmentCode || '');
      setLoanDate(existingLoan.loanDate || existingLoan.borrowDate || new Date().toISOString().split('T')[0]);
    } else {
      setSelectedType('bed');
      setAssetCode('');
      setLoanDate(new Date().toISOString().split('T')[0]);
    }
  }, [existingLoan, patient]);

  // Available units for the selected type
  const availableCodes = useMemo(() => {
    const selectedOpt = QUICK_EQUIP_TYPES.find((o) => o.type === selectedType);
    if (!selectedOpt) return [];
    return equipmentUnits
      .filter((u) => {
        if (selectedOpt.category === 'bed') return u.category === 'bed';
        if (selectedOpt.category === 'wheelchair') return u.category === 'wheelchair';
        if (selectedOpt.category === 'air_mattress') return u.category === 'air_mattress';
        if (selectedOpt.category === 'oxygen_concentrator') return u.category === 'oxygen_concentrator';
        return u.category === 'other' || u.category === 'walker';
      })
      .map((u) => u.assetCode)
      .filter(Boolean);
  }, [equipmentUnits, selectedType]);

  const activeTypeInfo = QUICK_EQUIP_TYPES.find((o) => o.type === selectedType) || QUICK_EQUIP_TYPES[0];

  const handleSave = () => {
    const thaiYear = new Date().getFullYear() + 543;
    const finalCode = assetCode.trim() || `${activeTypeInfo.prefix}-001`;
    const contractNo = existingLoan?.contractNumber || `LN-${thaiYear}/${Math.floor(100 + Math.random() * 900)}`;

    const savedLoan: EquipmentLoan = {
      id: existingLoan?.id || `LOAN-LTC-${patient.id}-${Date.now()}`,
      loanCode: contractNo,
      contractNumber: contractNo,
      docNo: contractNo,
      equipmentId: activeTypeInfo.category || 'EQ-001',
      equipmentCode: finalCode,
      equipmentName: activeTypeInfo.name,
      equipmentCategory: activeTypeInfo.category,
      borrowerName: patient.caregiverName || patient.fullName,
      borrowerIdCard: patient.idCard || '',
      borrowerPhone: patient.caregiverPhone || patient.phone || '',
      phone: patient.caregiverPhone || patient.phone || '',
      borrowerAddress: patient.address,
      borrowerRelation: patient.caregiverName ? 'ญาติผู้ดูแล' : 'ตนเอง',
      relationshipWithPatient: patient.caregiverName ? 'ญาติผู้ดูแล' : 'ตนเอง',
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
      notes: `ผูกข้อมูลอุปกรณ์สำหรับผู้ป่วย LTC ทต.บางเป้า`,
    };

    onSaveLoan(savedLoan);
    onClose();
  };

  const handleRemove = () => {
    if (existingLoan && onRemoveLoan) {
      if (window.confirm(`ยืนยันยกเลิกการผูกอุปกรณ์ ${existingLoan.equipmentName} สำหรับ ${patient.fullName} ใช่หรือไม่?`)) {
        onRemoveLoan(existingLoan.id);
        onClose();
      }
    }
  };

  const currentConstructedLoan: EquipmentLoan = useMemo(() => {
    const thaiYear = new Date().getFullYear() + 543;
    const finalCode = assetCode.trim() || `${activeTypeInfo.prefix}-001`;
    const contractNo = existingLoan?.contractNumber || `LN-${thaiYear}/001`;
    return {
      id: existingLoan?.id || `PREVIEW-${Date.now()}`,
      loanCode: contractNo,
      contractNumber: contractNo,
      docNo: contractNo,
      equipmentId: activeTypeInfo.category || 'EQ-001',
      equipmentCode: finalCode,
      equipmentName: activeTypeInfo.name,
      equipmentCategory: activeTypeInfo.category,
      borrowerName: patient.caregiverName || patient.fullName,
      borrowerPhone: patient.caregiverPhone || patient.phone || '',
      phone: patient.caregiverPhone || patient.phone || '',
      borrowerAddress: patient.address,
      borrowerRelation: patient.caregiverName ? 'ญาติผู้ดูแล' : 'ตนเอง',
      relationshipWithPatient: patient.caregiverName ? 'ญาติผู้ดูแล' : 'ตนเอง',
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
      notes: 'สัญญายืมอุปกรณ์สำหรับผู้ป่วย LTC',
    };
  }, [patient, activeTypeInfo, assetCode, existingLoan, loanDate]);

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex justify-center items-start p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-6 flex flex-col border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-teal-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center border border-teal-400/30">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-sm sm:text-base">
                บันทึกการยืมอุปกรณ์การแพทย์สำหรับผู้ป่วย LTC
              </div>
              <div className="text-xs text-teal-200">
                {patient.fullName} (หมู่ {patient.moo || '-'} {BANGPAO_VILLAGES[patient.moo || '1']})
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          
          {/* Patient Info Card */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
            <div>
              <span className="text-slate-400">ผู้ป่วย:</span>{' '}
              <strong className="text-slate-900">{patient.fullName}</strong> ({patient.age} ปี)
            </div>
            <div>
              <span className="text-slate-400">ระดับ ADL:</span>{' '}
              <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${patient.adlCategory === 'ติดเตียง' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
                {patient.adlCategory || 'ติดเตียง'}
              </span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-slate-400">ที่อยู่:</span> {patient.address}
            </div>
            <div>
              <span className="text-slate-400">ผู้ดูแล:</span> {patient.caregiverName || 'ญาติ'}
            </div>
            <div>
              <span className="text-slate-400">เบอร์โทร:</span> {patient.caregiverPhone || patient.phone || '-'}
            </div>
          </div>

          {/* Equipment Selector */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              เลือกประเภทอุปกรณ์ที่ครัวเรือนนี้ยืมใช้งานจริง: *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {QUICK_EQUIP_TYPES.map((opt) => {
                const isSelected = selectedType === opt.type;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => {
                      setSelectedType(opt.type);
                      if (!assetCode) setAssetCode(`${opt.prefix}-001`);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-teal-50 border-teal-600 text-teal-900 ring-2 ring-teal-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{opt.icon}</span>
                      <div>
                        <div className="font-bold text-xs">{opt.label}</div>
                        <div className="text-[10px] text-slate-400">{opt.prefix}-...</div>
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-teal-700" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Asset Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                หมายเลขครุภัณฑ์ / ทะเบียนเตียง *
              </label>
              <input
                type="text"
                value={assetCode}
                onChange={(e) => setAssetCode(e.target.value)}
                placeholder={`เช่น ${activeTypeInfo.prefix}-001`}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs font-bold text-teal-900 outline-none focus:ring-2 focus:ring-teal-500"
              />
              {availableCodes.length > 0 && (
                <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 flex-wrap">
                  <span>เลือกจากในคลัง:</span>
                  {availableCodes.slice(0, 4).map((c) => (
                    <span
                      key={c}
                      onClick={() => setAssetCode(c)}
                      className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-teal-100 text-teal-800 font-mono font-bold cursor-pointer"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">วันที่เริ่มยืม</label>
              <input
                type="date"
                value={loanDate}
                onChange={(e) => setLoanDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            {existingLoan && onRemoveLoan && (
              <button
                type="button"
                onClick={handleRemove}
                className="px-3 py-1.5 rounded-lg text-rose-700 hover:bg-rose-50 border border-rose-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ยกเลิกการผูกอุปกรณ์</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs cursor-pointer"
              title="ดูตัวอย่างและพิมพ์สัญญายืม A4 2 หน้า"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>🖨️ พิมพ์สัญญา A4</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs shadow-sm cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกข้อมูล</span>
            </button>
          </div>
        </div>

      </div>

      {isPrintModalOpen && (
        <PrintEquipmentLoanModal
          loan={currentConstructedLoan}
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          savedSignerSettings={savedSignerSettings}
        />
      )}
    </div>
  );
};
