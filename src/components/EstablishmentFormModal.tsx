import React, { useState } from 'react';
import { X, Building2, Save } from 'lucide-react';
import { Establishment, EstablishmentType } from '../types/index.ts';
import { ESTABLISHMENT_TYPE_LABELS } from '../data/criteria.ts';

interface EstablishmentFormModalProps {
  establishment?: Establishment | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Establishment>) => void;
}

export const EstablishmentFormModal: React.FC<EstablishmentFormModalProps> = ({
  establishment,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  const isEdit = !!establishment;

  const [formData, setFormData] = useState({
    code: establishment?.code || `อม.1-69${Math.floor(100 + Math.random() * 900)}`,
    name: establishment?.name || '',
    type: (establishment?.type || 'restaurant') as EstablishmentType,
    ownerName: establishment?.ownerName || '',
    phone: establishment?.phone || '',
    address: establishment?.address || '',
    subdistrict: establishment?.subdistrict || '',
    district: establishment?.district || '',
    province: establishment?.province || 'กรุงเทพมหานคร',
    notes: establishment?.notes || '',
    imageUrl: establishment?.imageUrl || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    onSave({
      ...formData,
      id: establishment?.id || `EST-2569-${Math.floor(100 + Math.random() * 900)}`,
      status: establishment?.status || 'pending',
      latestScore: establishment?.latestScore || 0,
      latestRating: establishment?.latestRating || 'uninspected',
      latestInspectionDate: establishment?.latestInspectionDate || '',
      nextInspectionDate: establishment?.nextInspectionDate || '',
      certificateNo: establishment?.certificateNo || '',
      certificateExpiryDate: establishment?.certificateExpiryDate || '',
      inspectorName: establishment?.inspectorName || '',
      syncedToSheets: false,
      createdAt: establishment?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Building2 className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                {isEdit ? 'แก้ไขข้อมูลสถานประกอบการ' : 'ลงทะเบียนสถานประกอบการใหม่'}
              </h2>
              <p className="text-xs text-emerald-100/80 mt-0.5">
                ฐานข้อมูลผู้ประกอบกิจการด้านอาหารและสุขลักษณะ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 sm:p-6 space-y-4 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                รหัสทะเบียนสถานประกอบการ
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-300 font-mono focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                placeholder="อม.1-69001"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ประเภทสถานประกอบการ
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as EstablishmentType })}
                className="w-full text-xs p-2.5 rounded-lg bg-white border border-slate-300 text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
              >
                {Object.entries(ESTABLISHMENT_TYPE_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ชื่อสถานประกอบการ / ร้าน <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full text-xs p-2.5 rounded-lg bg-white border border-slate-300 font-bold text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
              placeholder="เช่น ร้านอาหารบ้านสวนริมน้ำ"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ชื่อเจ้าของ / ผู้ขอรับการประเมิน <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.ownerName}
                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                className="w-full text-xs p-2.5 rounded-lg bg-white border border-slate-300 text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                placeholder="นาย/นาง/น.ส. นามสกุล"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                เบอร์โทรศัพท์ติดต่อ
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full text-xs p-2.5 rounded-lg bg-white border border-slate-300 text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                placeholder="081-234-5678"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ที่อยู่ / เลขที่ / ซอย / ถนน
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full text-xs p-2.5 rounded-lg bg-white border border-slate-300 text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
              placeholder="99/4 หมู่ 2 ถนนสุขุมวิท"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ตำบล / แขวง</label>
              <input
                type="text"
                value={formData.subdistrict}
                onChange={(e) => setFormData({ ...formData, subdistrict: e.target.value })}
                className="w-full text-xs p-2.5 rounded-lg bg-white border border-slate-300 text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                placeholder="คลองตัน"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">อำเภอ / เขต</label>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="w-full text-xs p-2.5 rounded-lg bg-white border border-slate-300 text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                placeholder="คลองเตย"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">จังหวัด</label>
              <input
                type="text"
                value={formData.province}
                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                className="w-full text-xs p-2.5 rounded-lg bg-white border border-slate-300 text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                placeholder="กรุงเทพมหานคร"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              รูปภาพหน้าร้าน / สถานที่ (URL)
            </label>
            <input
              type="url"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              className="w-full text-xs p-2.5 rounded-lg bg-white border border-slate-300 text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
              placeholder="https://images.unsplash.com/photo-..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">หมายเหตุเพิ่มเติม</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full text-xs p-2.5 rounded-lg bg-white border border-slate-300 text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
              placeholder="รายละเอียดบันทึกเพิ่มเติมของสถานประกอบการ..."
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all active:scale-98"
            >
              <Save className="w-4 h-4" />
              <span>{isEdit ? 'บันทึกการแก้ไข' : 'บันทึกสถานประกอบการ'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
