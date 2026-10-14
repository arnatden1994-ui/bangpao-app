import React, { useState } from 'react';
import {
  X,
  Settings,
  Save,
  CheckCircle2,
  Building2,
  UserCheck,
  DollarSign,
  RotateCcw,
} from 'lucide-react';
import { SignerSettings, DEFAULT_SIGNER_SETTINGS } from '../types/index.ts';

interface SignerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SignerSettings;
  onSave: (newSettings: SignerSettings) => void;
}

export const SignerSettingsModal: React.FC<SignerSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const [form, setForm] = useState<SignerSettings>(settings || DEFAULT_SIGNER_SETTINGS);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleReset = () => {
    setForm(DEFAULT_SIGNER_SETTINGS);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#064e3b] px-6 py-4 text-white flex items-center justify-between border-b border-emerald-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Settings className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white">ตั้งค่าระบบ & ผู้ลงนามในเอกสารราชการ</h2>
              <p className="text-xs text-emerald-200/90 mt-0.5">
                กำหนดรายชื่อผู้บริหารและอัตราค่าบริการเริ่มต้น เพื่อใช้ในแบบฟอร์มและการพิมพ์ทุกส่วน
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-emerald-200 hover:text-white hover:bg-emerald-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-bold animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>บันทึกการตั้งค่าผู้ลงนามเรียบร้อยแล้ว</span>
            </div>
          )}

          {/* ผอ.กอง */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 uppercase">
              <UserCheck className="w-4 h-4" /> 1. ผู้อำนวยการกองสาธารณสุขและสิ่งแวดล้อม (ผู้เสนอ)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-500">ชื่อ-นามสกุล</label>
                <input
                  type="text"
                  value={form.directorName}
                  onChange={(e) => setForm({ ...form, directorName: e.target.value })}
                  className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500">ตำแหน่ง</label>
                <input
                  type="text"
                  value={form.directorPos}
                  onChange={(e) => setForm({ ...form, directorPos: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
                  required
                />
              </div>
            </div>
          </div>

          {/* ปลัดเทศบาล */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 uppercase">
              <UserCheck className="w-4 h-4" /> 2. ปลัดเทศบาล (ผู้พิจารณากลั่นกรอง)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-500">ชื่อ-นามสกุล</label>
                <input
                  type="text"
                  value={form.clerkName}
                  onChange={(e) => setForm({ ...form, clerkName: e.target.value })}
                  className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500">ตำแหน่ง</label>
                <input
                  type="text"
                  value={form.clerkPos}
                  onChange={(e) => setForm({ ...form, clerkPos: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
                  required
                />
              </div>
            </div>
          </div>

          {/* นายกเทศมนตรี / ผู้แทน */}
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-2">
            <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5 uppercase">
              <UserCheck className="w-4 h-4 text-emerald-700" /> 3. ผู้มีอำนาจลงนาม / นายกเทศมนตรี (ผู้อนุมัติ)
            </span>
            <div className="space-y-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-500">ชื่อ-นามสกุล ผู้มีอำนาจลงนาม</label>
                <input
                  type="text"
                  value={form.mayorName}
                  onChange={(e) => setForm({ ...form, mayorName: e.target.value })}
                  className="w-full text-xs font-bold px-3 py-2 bg-white border border-emerald-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500">ตำแหน่งในเอกสาร</label>
                <textarea
                  value={form.mayorPos}
                  onChange={(e) => setForm({ ...form, mayorPos: e.target.value })}
                  rows={2}
                  className="w-full text-xs font-medium px-3 py-1.5 bg-white border border-emerald-300 rounded-lg"
                  required
                />
              </div>
            </div>
          </div>

          {/* พนักงานขับรถ & อัตราค่าบริการ */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase">
              <DollarSign className="w-4 h-4 text-amber-500" /> 4. พนักงานขับรถ & อัตราค่าบริการกำจัดสิ่งปฏิกูล
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500">พนักงานขับรถสูบสิ่งปฏิกูล</label>
                <input
                  type="text"
                  value={form.driverName}
                  onChange={(e) => setForm({ ...form, driverName: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500">ในเขตเทศบาล (บาท/บ่อ)</label>
                <input
                  type="text"
                  value={form.feeInDistrict}
                  onChange={(e) => setForm({ ...form, feeInDistrict: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>คืนค่าเริ่มต้น</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>บันทึกการตั้งค่า</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
