import React, { useState } from 'react';
import { X, Save, AlertOctagon, MessageSquareWarning, Stethoscope, Accessibility, HeartPulse } from 'lucide-react';
import {
  HazardousBusiness,
  HazardousCategory,
  PublicPetition,
  PetitionCategory,
  EquipmentLoan,
  MedicalEquipment,
  LtcPatient,
  NhsoProject,
} from '../types/index.ts';
import { HAZARDOUS_CATEGORY_LABELS } from './HazardousBusinessView.tsx';
import { PETITION_CATEGORY_LABELS } from './PublicPetitionsView.tsx';

// 1. New Hazardous Business Modal
interface NewHazardousModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: HazardousBusiness) => void;
}

export const NewHazardousModal: React.FC<NewHazardousModalProps> = ({ isOpen, onClose, onSave }) => {
  if (!isOpen) return null;

  const [name, setName] = useState('');
  const [category, setCategory] = useState<HazardousCategory>('auto_repair');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [subdistrict, setSubdistrict] = useState('');
  const [riskLevel, setRiskLevel] = useState<'high' | 'medium' | 'low'>('medium');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newItem: HazardousBusiness = {
      id: `HAZ-${Date.now().toString().slice(-4)}`,
      code: `อภ.2-69${Math.floor(100 + Math.random() * 900)}`,
      name,
      category,
      ownerName,
      phone,
      address,
      subdistrict: subdistrict || 'ในเขตเทศบาล',
      riskLevel,
      licenseStatus: 'pending',
      licenseNumber: '',
      licenseExpireDate: '',
      latestInspectionDate: '',
      latestScore: 0,
      inspectorName: '',
      notes,
      createdAt: new Date().toISOString(),
    };
    onSave(newItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-amber-800 to-orange-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertOctagon className="w-5 h-5 text-amber-300" />
            <h2 className="text-base font-bold">ขึ้นทะเบียนกิจการที่เป็นอันตรายต่อสุขภาพ</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">ชื่อกิจการ / ร้าน / โรงงาน *</label>
            <input
              type="text"
              required
              placeholder="เช่น อู่สมบูรณ์การช่าง"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-300 font-bold focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">กลุ่มประเภทกิจการอันตราย</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as HazardousCategory)}
              className="w-full p-2.5 rounded-lg border border-slate-300 bg-white"
            >
              {Object.entries(HAZARDOUS_CATEGORY_LABELS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">เจ้าของกิจการ *</label>
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">ที่ตั้งสถานประกอบการ</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">ตำบล / แขวง</label>
              <input
                type="text"
                value={subdistrict}
                onChange={(e) => setSubdistrict(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">ระดับความเสี่ยง</label>
              <select
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value as 'high' | 'medium' | 'low')}
                className="w-full p-2.5 rounded-lg border border-slate-300 bg-white"
              >
                <option value="high">🔴 เสี่ยงสูง (High Risk)</option>
                <option value="medium">🟡 เสี่ยงปานกลาง (Medium)</option>
                <option value="low">🟢 เสี่ยงต่ำ (Low)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">รายละเอียด / หมายเหตุ</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-300"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-between">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100">
              ยกเลิก
            </button>
            <button type="submit" className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold">
              บันทึกข้อมูล
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 2. New Petition Modal
interface NewPetitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PublicPetition) => void;
}

export const NewPetitionModal: React.FC<NewPetitionModalProps> = ({ isOpen, onClose, onSave }) => {
  if (!isOpen) return null;

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<PetitionCategory>('nuisance_smell');
  const [citizenName, setCitizenName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !citizenName.trim()) return;

    const newPet: PublicPetition = {
      id: `PET-${Date.now().toString().slice(-4)}`,
      trackingCode: `REQ-69-${Math.floor(1000 + Math.random() * 9000)}`,
      title,
      category,
      citizenName,
      phone,
      address,
      description,
      status: 'submitted',
      assignedOfficer: 'เจ้าหน้าที่กลุ่มงานอนามัยสิ่งแวดล้อม',
      submissionDate: new Date().toISOString().slice(0, 10),
    };
    onSave(newPet);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-teal-800 to-cyan-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <MessageSquareWarning className="w-5 h-5 text-cyan-300" />
            <h2 className="text-base font-bold">ยื่นคำร้องทั่วไป & ร้องเรียนเหตุรำคาญ</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">หัวข้อเรื่องคำร้อง / เรื่องร้องเรียน *</label>
            <input
              type="text"
              required
              placeholder="เช่น ร้องเรียนกลิ่นเหม็นจากฟาร์ม, ขอรับบริการพ่นยุงลาย"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-300 font-bold focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">ประเภทเรื่องคำร้อง</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as PetitionCategory)}
              className="w-full p-2.5 rounded-lg border border-slate-300 bg-white"
            >
              {Object.entries(PETITION_CATEGORY_LABELS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">ชื่อผู้ร้องเรียน / ผู้ยื่นคำร้อง *</label>
              <input
                type="text"
                required
                value={citizenName}
                onChange={(e) => setCitizenName(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์ติดต่อ *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">สถานที่เกิดเหตุ / ที่อยู่</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-300"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">รายละเอียดข้อเท็จจริงและความประสงค์</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-300"
              placeholder="ระบุวันเวลา สถานที่ และสิ่งที่ต้องการให้เจ้าหน้าที่ดำเนินการช่วยเหลือ..."
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-between">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100">
              ยกเลิก
            </button>
            <button type="submit" className="px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold">
              ส่งคำร้องเข้าสู่ระบบ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 3. New Equipment Loan Modal
interface NewEquipmentLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipmentList: MedicalEquipment[];
  onSave: (data: EquipmentLoan) => void;
}

export const NewEquipmentLoanModal: React.FC<NewEquipmentLoanModalProps> = ({
  isOpen,
  onClose,
  equipmentList,
  onSave,
}) => {
  if (!isOpen) return null;

  const [equipmentId, setEquipmentId] = useState(equipmentList[0]?.id || '');
  const [borrowerName, setBorrowerName] = useState('');
  const [borrowerIdCard, setBorrowerIdCard] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientDiagnosis, setPatientDiagnosis] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState('');

  const selectedEq = equipmentList.find((e) => e.id === equipmentId) || equipmentList[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!borrowerName.trim() || !patientName.trim()) return;

    const newLoan: EquipmentLoan = {
      id: `LOAN-${Date.now().toString().slice(-4)}`,
      loanCode: `LN-2569-${Math.floor(100 + Math.random() * 900)}`,
      equipmentId: selectedEq?.id || '',
      equipmentName: selectedEq?.name || 'กายอุปกรณ์',
      borrowerName,
      borrowerIdCard: borrowerIdCard || '1-xxxx-xxxxx-xx-x',
      patientName,
      patientDiagnosis,
      phone,
      address,
      loanDate: new Date().toISOString().slice(0, 10),
      dueDate,
      status: 'borrowed',
      officerInCharge: 'เจ้าพนักงานสาธารณสุขชุมชน',
      depositAmount: 0,
      notes: notes || 'เพื่อการฟื้นฟูสุขภาพที่บ้าน',
    };
    onSave(newLoan);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Stethoscope className="w-5 h-5 text-emerald-300" />
            <h2 className="text-base font-bold">บันทึกสัญญายืมกายอุปกรณ์การแพทย์</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">เลือกอุปกรณ์ทางการแพทย์ *</label>
            <select
              value={equipmentId}
              onChange={(e) => setEquipmentId(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-bold"
            >
              {equipmentList.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.name} (คงเหลือ {eq.availableQuantity} ชิ้น)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">ชื่อผู้ขอยืม (ญาติ/ผู้ดูแล) *</label>
              <input
                type="text"
                required
                value={borrowerName}
                onChange={(e) => setBorrowerName(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">เลขบัตรประชาชนผู้ยืม</label>
              <input
                type="text"
                placeholder="1-xxxx-xxxxx-xx-x"
                value={borrowerIdCard}
                onChange={(e) => setBorrowerIdCard(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">ชื่อผู้ป่วย / ผู้ใช้งาน *</label>
              <input
                type="text"
                required
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">การวินิจฉัย / อาการ</label>
              <input
                type="text"
                placeholder="เช่น ผู้ป่วยติดเตียง, Stroke"
                value={patientDiagnosis}
                onChange={(e) => setPatientDiagnosis(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์ติดต่อ *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">กำหนดวันส่งคืนอุปกรณ์</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">ที่อยู่นำอุปกรณ์ไปใช้งาน</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-300"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-between">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100">
              ยกเลิก
            </button>
            <button type="submit" className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
              บันทึกการยืม
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
