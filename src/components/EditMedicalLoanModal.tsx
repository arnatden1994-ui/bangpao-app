import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  User,
  Phone,
  Calendar,
  Building2,
  Stethoscope,
  MapPin,
  FileText,
  AlertCircle,
  Clock,
  Printer,
  Download,
  RotateCcw,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import {
  EquipmentLoan,
  MedicalEquipmentUnit,
  MedicalEquipment,
  SignerSettings,
  DEFAULT_SIGNER_SETTINGS,
} from '../types/index.ts';
import { BANGPAO_VILLAGES } from './NhsoLtcCombinedView.tsx';
import { exportOfficialMedicalLoanDocx } from '../services/medicalLoanDocGenerator.ts';

interface EditMedicalLoanModalProps {
  isOpen: boolean;
  loan: EquipmentLoan | null;
  onClose: () => void;
  onSaveLoan: (updatedLoan: EquipmentLoan) => void;
  equipmentUnits?: MedicalEquipmentUnit[];
  equipmentList?: MedicalEquipment[];
  savedSignerSettings?: SignerSettings;
}

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

const EQUIPMENT_CATEGORIES = [
  { id: 'bed', name: 'เตียงผู้ป่วย / เตียงเฟาว์เลอร์' },
  { id: 'wheelchair', name: 'รถเข็นวีลแชร์ (Wheelchair)' },
  { id: 'air_mattress', name: 'ที่นอนลมป้องกันแผลกดทับ' },
  { id: 'oxygen_concentrator', name: 'เครื่องผลิตออกซิเจน (Oxygen Concentrator)' },
  { id: 'suction_machine', name: 'เครื่องดูดเสมหะ (Suction Machine)' },
  { id: 'walker', name: 'อุปกรณ์ช่วยเดิน / วอล์คเกอร์ / ไม้เท้า' },
  { id: 'other', name: 'อุปกรณ์การแพทย์อื่นๆ' },
];

export const EditMedicalLoanModal: React.FC<EditMedicalLoanModalProps> = ({
  isOpen,
  loan,
  onClose,
  onSaveLoan,
  equipmentUnits = [],
  equipmentList = [],
  savedSignerSettings,
}) => {
  if (!isOpen || !loan) return null;

  // Form State
  const [borrowerName, setBorrowerName] = useState(loan.borrowerName || '');
  const [borrowerRelation, setBorrowerRelation] = useState(
    loan.relationshipWithPatient || loan.borrowerRelation || 'ญาติผู้ดูแล'
  );
  const [borrowerPhone, setBorrowerPhone] = useState(
    loan.borrowerPhone || loan.phone || ''
  );
  const [borrowerIdCard, setBorrowerIdCard] = useState(loan.borrowerIdCard || '');
  const [borrowerAddress, setBorrowerAddress] = useState(
    loan.borrowerAddress || loan.address || ''
  );
  const [moo, setMoo] = useState(loan.moo ? String(loan.moo).trim() : '1');

  const [patientName, setPatientName] = useState(loan.patientName || '');
  const [patientIdCard, setPatientIdCard] = useState(
    loan.patientIdCard || loan.patientNationalId || ''
  );
  const [patientAge, setPatientAge] = useState(
    loan.patientAge !== undefined ? String(loan.patientAge) : '75'
  );
  const [patientDiagnosis, setPatientDiagnosis] = useState(
    loan.patientDiagnosis || ''
  );
  const [patientAddress, setPatientAddress] = useState(
    loan.patientAddress || loan.address || ''
  );

  const [equipmentName, setEquipmentName] = useState(loan.equipmentName || '');
  const [equipmentCategory, setEquipmentCategory] = useState(
    loan.equipmentCategory || 'bed'
  );
  const [equipmentCode, setEquipmentCode] = useState(
    loan.equipmentCode || loan.loanCode || ''
  );
  const [contractNumber, setContractNumber] = useState(
    loan.contractNumber || loan.loanCode || ''
  );
  const [loanDate, setLoanDate] = useState(
    loan.loanDate || loan.borrowDate || loan.createdAt?.slice(0, 10) || ''
  );
  const [dueDate, setDueDate] = useState(loan.dueDate || '');
  const [status, setStatus] = useState<EquipmentLoan['status']>(
    loan.status || 'borrowed'
  );
  const [officerInCharge, setOfficerInCharge] = useState(
    loan.officerInCharge || 'พันจ่าเอกอานัส เด็นหมาด'
  );
  const [notes, setNotes] = useState(loan.notes || '');
  const [latitude, setLatitude] = useState(
    loan.latitude !== undefined ? String(loan.latitude) : ''
  );
  const [longitude, setLongitude] = useState(
    loan.longitude !== undefined ? String(loan.longitude) : ''
  );

  // Sync state if loan changes
  useEffect(() => {
    if (loan) {
      setBorrowerName(loan.borrowerName || '');
      setBorrowerRelation(
        loan.relationshipWithPatient || loan.borrowerRelation || 'ญาติผู้ดูแล'
      );
      setBorrowerPhone(loan.borrowerPhone || loan.phone || '');
      setBorrowerIdCard(loan.borrowerIdCard || '');
      setBorrowerAddress(loan.borrowerAddress || loan.address || '');
      setMoo(loan.moo ? String(loan.moo).trim() : '1');

      setPatientName(loan.patientName || '');
      setPatientIdCard(loan.patientIdCard || loan.patientNationalId || '');
      setPatientAge(loan.patientAge !== undefined ? String(loan.patientAge) : '75');
      setPatientDiagnosis(loan.patientDiagnosis || '');
      setPatientAddress(loan.patientAddress || loan.address || '');

      setEquipmentName(loan.equipmentName || '');
      setEquipmentCategory(loan.equipmentCategory || 'bed');
      setEquipmentCode(loan.equipmentCode || loan.loanCode || '');
      setContractNumber(loan.contractNumber || loan.loanCode || '');
      setLoanDate(loan.loanDate || loan.borrowDate || loan.createdAt?.slice(0, 10) || '');
      setDueDate(loan.dueDate || '');
      setStatus(loan.status || 'borrowed');
      setOfficerInCharge(loan.officerInCharge || 'พันจ่าเอกอานัส เด็นหมาด');
      setNotes(loan.notes || '');
      setLatitude(loan.latitude !== undefined ? String(loan.latitude) : '');
      setLongitude(loan.longitude !== undefined ? String(loan.longitude) : '');
    }
  }, [loan]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loan) return;

    const updatedLoan: EquipmentLoan = {
      ...loan,
      borrowerName: borrowerName.trim(),
      borrowerRelation: borrowerRelation.trim(),
      relationshipWithPatient: borrowerRelation.trim(),
      borrowerPhone: borrowerPhone.trim(),
      phone: borrowerPhone.trim(),
      borrowerIdCard: borrowerIdCard.trim(),
      borrowerAddress: borrowerAddress.trim(),
      address: borrowerAddress.trim() || patientAddress.trim(),
      moo: moo,

      patientName: patientName.trim(),
      patientIdCard: patientIdCard.trim(),
      patientNationalId: patientIdCard.trim(),
      patientAge: patientAge ? parseInt(patientAge, 10) : undefined,
      patientDiagnosis: patientDiagnosis.trim(),
      patientAddress: patientAddress.trim(),

      equipmentName: equipmentName.trim(),
      equipmentCategory: equipmentCategory,
      equipmentCode: equipmentCode.trim(),
      contractNumber: contractNumber.trim(),
      docNo: contractNumber.trim(),
      loanDate: loanDate,
      borrowDate: loanDate,
      dueDate: dueDate.trim(),
      status: status,
      officerInCharge: officerInCharge.trim(),
      notes: notes.trim(),
      latitude: latitude ? parseFloat(latitude) : loan.latitude,
      longitude: longitude ? parseFloat(longitude) : loan.longitude,
    };

    onSaveLoan(updatedLoan);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <FileText className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold flex items-center gap-2">
                <span>✏️ แก้ไขข้อมูลการยืมอุปกรณ์ทางการแพทย์</span>
              </h2>
              <p className="text-xs text-teal-200 mt-0.5">
                สัญญาเลขที่: <span className="font-mono font-bold text-white">{contractNumber || loan.contractNumber || loan.loanCode || '-'}</span> • อุปกรณ์: {loan.equipmentName}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 sm:p-6 space-y-6 flex-1 text-slate-800 text-xs sm:text-sm">
          {/* Section 1: ข้อมูลผู้ยืม (Borrower Details) */}
          <div className="bg-teal-50/40 border border-teal-200/80 rounded-xl p-4 space-y-3.5 shadow-2xs">
            <div className="flex items-center gap-2 pb-2 border-b border-teal-200/60">
              <User className="w-4 h-4 text-teal-700" />
              <h3 className="font-extrabold text-teal-900 text-sm">
                1. ข้อมูลผู้ยืม (ผู้ติดต่อ / ผู้รับผิดชอบดูแลอุปกรณ์)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อ-นามสกุล ผู้ยืม <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={borrowerName}
                  onChange={(e) => setBorrowerName(e.target.value)}
                  placeholder="เช่น นางสาวสมใจ ใจดี"
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-xs font-semibold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ความสัมพันธ์กับผู้ป่วย
                </label>
                <select
                  value={borrowerRelation}
                  onChange={(e) => setBorrowerRelation(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-xs font-semibold outline-none cursor-pointer"
                >
                  {BORROWER_RELATIONS.map((rel) => (
                    <option key={rel} value={rel}>
                      {rel}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  เบอร์โทรศัพท์ติดต่อ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={borrowerPhone}
                  onChange={(e) => setBorrowerPhone(e.target.value)}
                  placeholder="เช่น 081-234-5678"
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-xs font-mono font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  เลขบัตรประจำตัวประชาชนผู้ยืม (13 หลัก)
                </label>
                <input
                  type="text"
                  maxLength={17}
                  value={borrowerIdCard}
                  onChange={(e) => setBorrowerIdCard(e.target.value)}
                  placeholder="x-xxxx-xxxxx-xx-x"
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-xs font-mono font-bold outline-none"
                />
              </div>

              <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ที่อยู่บ้านเลขที่ / ซอย / ถนน
                  </label>
                  <input
                    type="text"
                    value={borrowerAddress}
                    onChange={(e) => setBorrowerAddress(e.target.value)}
                    placeholder="เช่น 12/4 หมู่ 2 บ้านเกาะป่อม ต.บางเป้า"
                    className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-xs font-semibold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    หมู่ที่ (ต.บางเป้า)
                  </label>
                  <select
                    value={moo}
                    onChange={(e) => setMoo(e.target.value)}
                    className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-xs font-semibold outline-none cursor-pointer"
                  >
                    {Object.entries(BANGPAO_VILLAGES).map(([m, name]) => (
                      <option key={m} value={m}>
                        ม.{m} {name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: ข้อมูลผู้ป่วย (Patient Details) */}
          <div className="bg-sky-50/40 border border-sky-200/80 rounded-xl p-4 space-y-3.5 shadow-2xs">
            <div className="flex items-center gap-2 pb-2 border-b border-sky-200/60">
              <Stethoscope className="w-4 h-4 text-sky-700" />
              <h3 className="font-extrabold text-sky-900 text-sm">
                2. ข้อมูลผู้ป่วย / ผู้ใช้งานอุปกรณ์
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อ-นามสกุล ผู้ป่วย <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="เช่น นายแดง อัตตศุภนาพันธ์"
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-xs font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  อายุ (ปี)
                </label>
                <input
                  type="number"
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                  placeholder="เช่น 75"
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-xs font-semibold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  เลขบัตร ปชช. ผู้ป่วย (13 หลัก)
                </label>
                <input
                  type="text"
                  maxLength={17}
                  value={patientIdCard}
                  onChange={(e) => setPatientIdCard(e.target.value)}
                  placeholder="x-xxxx-xxxxx-xx-x"
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-xs font-mono font-bold outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  การวินิจฉัยโรค / ภาวะพึ่งพิง
                </label>
                <input
                  type="text"
                  value={patientDiagnosis}
                  onChange={(e) => setPatientDiagnosis(e.target.value)}
                  placeholder="เช่น ติดเตียง, อัมพาตครึ่งซีก (Stroke), โรคปอดอุดกั้นเรื้อรัง (COPD)"
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-xs font-semibold outline-none"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ที่อยู่ผู้ป่วย (สถานที่นำอุปกรณ์ไปติดตั้งใช้งาน)
                </label>
                <input
                  type="text"
                  value={patientAddress}
                  onChange={(e) => setPatientAddress(e.target.value)}
                  placeholder="เช่น 72 หมู่ที่ 2 บ้านเกาะป่อม ต.บางเป้า อ.กันตัง จ.ตรัง"
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-xs font-semibold outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: รายละเอียดอุปกรณ์ & สัญญา (Equipment & Contract Details) */}
          <div className="bg-indigo-50/40 border border-indigo-200/80 rounded-xl p-4 space-y-3.5 shadow-2xs">
            <div className="flex items-center gap-2 pb-2 border-b border-indigo-200/60">
              <Building2 className="w-4 h-4 text-indigo-700" />
              <h3 className="font-extrabold text-indigo-900 text-sm">
                3. ข้อมูลอุปกรณ์การแพทย์, รหัสครุภัณฑ์ & สถานะสัญญา
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่ออุปกรณ์การแพทย์ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={equipmentName}
                  onChange={(e) => setEquipmentName(e.target.value)}
                  placeholder="เช่น เตียงผู้ป่วยมือหมุน 2 ไกร์ พร้อมเบาะรองนอน"
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs font-extrabold text-indigo-950 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  หมวดหมู่อุปกรณ์
                </label>
                <select
                  value={equipmentCategory}
                  onChange={(e) => setEquipmentCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs font-semibold outline-none cursor-pointer"
                >
                  {EQUIPMENT_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  รหัสครุภัณฑ์ / ทะเบียนอุปกรณ์ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={equipmentCode}
                  onChange={(e) => setEquipmentCode(e.target.value)}
                  placeholder="เช่น ทต.บป.BED-001"
                  list="inventory-asset-codes"
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs font-mono font-extrabold text-indigo-900 outline-none"
                />
                <datalist id="inventory-asset-codes">
                  {equipmentUnits.map((u) => (
                    <option key={u.id} value={u.assetCode}>
                      {u.assetCode} ({u.category}) - สภาพ: {u.condition || 'พร้อมใช้'}
                    </option>
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  เลขที่สัญญา / บันทึกข้อตกลง
                </label>
                <input
                  type="text"
                  value={contractNumber}
                  onChange={(e) => setContractNumber(e.target.value)}
                  placeholder="เช่น LN-2569/001"
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs font-mono font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  สถานะการยืม <span className="text-rose-500">*</span>
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as EquipmentLoan['status'])}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="borrowed">🟢 ส่งมอบแล้ว / กำลังใช้งานอยู่</option>
                  <option value="approved">✍️ อนุมัติแล้ว (รอนัดส่งมอบ)</option>
                  <option value="pending">⏳ รอเสนอผู้บริหารพิจารณา</option>
                  <option value="returned">🔄 ส่งคืนเรียบร้อยแล้ว</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  วันที่ยืม / ส่งมอบ
                </label>
                <input
                  type="date"
                  value={loanDate}
                  onChange={(e) => setLoanDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs font-semibold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  กำหนดส่งคืน
                </label>
                <input
                  type="text"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  placeholder="เช่น 2027-11-11 หรือ ยืมระยะยาว (ประเมินตามอาการ)"
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs font-semibold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  เจ้าหน้าที่ผู้รับผิดชอบ
                </label>
                <input
                  type="text"
                  value={officerInCharge}
                  onChange={(e) => setOfficerInCharge(e.target.value)}
                  placeholder="เช่น พันจ่าเอกอานัส เด็นหมาด"
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs font-semibold outline-none"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  หมายเหตุ / รายงานปัญหาหน้างาน (ถ้ามี)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ระบุข้อความเพิ่มเติมหรือบันทึกปัญหาหน้างาน เช่น มีเตียงอยู่แล้ว หรือบ้านอยู่ท้ายซอย"
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs font-medium outline-none resize-none"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  exportOfficialMedicalLoanDocx(
                    {
                      ...loan,
                      borrowerName,
                      borrowerPhone,
                      borrowerIdCard,
                      borrowerRelation,
                      patientName,
                      patientIdCard,
                      equipmentName,
                      equipmentCode,
                      contractNumber,
                      dueDate,
                      loanDate,
                    },
                    savedSignerSettings || DEFAULT_SIGNER_SETTINGS
                  );
                }}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                title="ดาวน์โหลดสัญญา Word (.docx)"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>ดาวน์โหลด Word (.docx)</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-extrabold cursor-pointer transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>💾 บันทึกการแก้ไขข้อมูล</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
