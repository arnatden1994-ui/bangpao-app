import React, { useState } from 'react';
import {
  AlertOctagon,
  Search,
  Plus,
  ShieldAlert,
  Calendar,
  Phone,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Printer,
  Edit2,
  Trash2,
} from 'lucide-react';
import { HazardousBusiness, HazardousCategory, UserRole } from '../types/index.ts';

interface HazardousBusinessViewProps {
  businesses: HazardousBusiness[];
  userRole: UserRole;
  onAddNew: () => void;
  onInspect: (item: HazardousBusiness) => void;
  onPrintLicense: (item: HazardousBusiness) => void;
  onDelete: (item: HazardousBusiness) => void;
}

export const HAZARDOUS_CATEGORY_LABELS: Record<HazardousCategory, string> = {
  auto_repair: 'อู่เคาะพ่นสี / ซ่อมรถยนต์ / คาร์แคร์',
  recycling_waste: 'กิจการรับซื้อของเก่า / คัดแยกขยะ',
  wood_furniture: 'โรงงานไม้ / เฟอร์นิเจอร์ / เลื่อยไม้',
  livestock_farm: 'ฟาร์มเลี้ยงสัตว์ (สุกร/สัตว์ปีก)',
  slaughterhouse: 'โรงฆ่าสัตว์และชำแหละเนื้อสัตว์',
  chemical_paint: 'ผสมสี / ทินเนอร์ / สารเคมีอุตสาหกรรม',
  industrial_laundry: 'ซักอบรีดอุตสาหกรรม',
  metal_welding: 'เชื่อมโลหะ / กลึง / หล่อหลอมโลหะ',
  dormitory_rental: 'หอพัก / อพาร์ตเมนต์ / ห้องเช่าเกิน 50 ห้อง',
  other: 'กิจการอันตรายประเภทอื่นตามข้อบัญญัติ',
};

export const HazardousBusinessView: React.FC<HazardousBusinessViewProps> = ({
  businesses,
  userRole,
  onAddNew,
  onInspect,
  onPrintLicense,
  onDelete,
}) => {
  const [search, setSearch] = useState('');
  const [selectedRisk, setSelectedRisk] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const filtered = businesses.filter((item) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.code.toLowerCase().includes(q) ||
      item.ownerName.toLowerCase().includes(q) ||
      item.address.toLowerCase().includes(q);

    const matchesRisk = selectedRisk === 'all' || item.riskLevel === selectedRisk;
    const matchesStatus = selectedStatus === 'all' || item.licenseStatus === selectedStatus;

    return matchesSearch && matchesRisk && matchesStatus;
  });

  const canEdit = userRole === 'admin' || userRole === 'inspector';

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-amber-900 via-orange-900 to-slate-900 text-white p-6 sm:p-7 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-200 text-xs font-semibold mb-2.5 border border-amber-400/20">
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>พ.ร.บ. การสาธารณสุข พ.ศ. 2535 หมวด 7</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold">
            ระบบทะเบียนและตรวจประเมินกิจการที่เป็นอันตรายต่อสุขภาพ
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-amber-100/90 leading-relaxed">
            ควบคุมมลพิษ เสียง กลิ่น ควัน และความปลอดภัยในการประกอบกิจการ 13 กลุ่ม ควบคุมใบอนุญาต อภ.2
            และเฝ้าระวังผลกระทบต่อสุขอนามัยของชุมชน
          </p>
        </div>
      </div>

      {/* Filter and Actions Bar */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหากิจการอันตราย, ทะเบียน อภ.2, เจ้าของ, ที่อยู่..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {canEdit && (
            <button
              onClick={onAddNew}
              className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-all shadow-xs shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>ขึ้นทะเบียนกิจการอันตรายใหม่</span>
            </button>
          )}
        </div>

        {/* Filter Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-500 font-medium">ระดับความเสี่ยง:</span>
          {['all', 'high', 'medium', 'low'].map((risk) => (
            <button
              key={risk}
              onClick={() => setSelectedRisk(risk)}
              className={`px-2.5 py-1 rounded-full font-medium transition-colors ${
                selectedRisk === risk
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {risk === 'all'
                ? 'ทุกระดับ'
                : risk === 'high'
                ? '🔴 เสี่ยงสูง'
                : risk === 'medium'
                ? '🟡 เสี่ยงปานกลาง'
                : '🟢 เสี่ยงต่ำ'}
            </button>
          ))}

          <span className="text-slate-300 mx-1">|</span>

          <span className="text-slate-500 font-medium">ใบอนุญาต อภ.2:</span>
          {['all', 'valid', 'expired', 'pending'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-2.5 py-1 rounded-full font-medium transition-colors ${
                selectedStatus === st
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'all'
                ? 'ทั้งหมด'
                : st === 'valid'
                ? 'มีผลใช้ได้'
                : st === 'expired'
                ? 'หมดอายุ'
                : 'รอพิจารณา'}
            </button>
          ))}

          <span className="ml-auto text-slate-400 font-medium">
            พบ {filtered.length} กิจการ
          </span>
        </div>
      </div>

      {/* Table of Hazardous Businesses */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">ชื่อสถานประกอบการ / รหัส อภ.2</th>
                <th className="py-3.5 px-4">กลุ่มประเภทกิจการ</th>
                <th className="py-3.5 px-4">เจ้าของ / เบอร์โทร</th>
                <th className="py-3.5 px-4">ระดับความเสี่ยง</th>
                <th className="py-3.5 px-4">สถานะใบอนุญาต</th>
                <th className="py-3.5 px-4">คะแนนตรวจล่าสุด</th>
                <th className="py-3.5 px-4 text-right">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{item.name}</div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">{item.code}</div>
                    <div className="text-[11px] text-slate-500 truncate max-w-[220px]">
                      {item.address} ต.{item.subdistrict}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-slate-700">
                    <span className="inline-block px-2 py-0.5 rounded text-xs bg-slate-100">
                      {HAZARDOUS_CATEGORY_LABELS[item.category] || item.category}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="text-slate-900 font-medium">{item.ownerName}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" />
                      <span>{item.phone}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    {item.riskLevel === 'high' && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                        เสี่ยงสูง (High)
                      </span>
                    )}
                    {item.riskLevel === 'medium' && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                        เสี่ยงปานกลาง
                      </span>
                    )}
                    {item.riskLevel === 'low' && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                        เสี่ยงต่ำ
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    {item.licenseStatus === 'valid' && (
                      <div>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> ใบอนุญาตมีผล
                        </span>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {item.licenseNumber}
                        </div>
                      </div>
                    )}
                    {item.licenseStatus === 'expired' && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="w-3 h-3" /> ใบอนุญาตหมดอายุ
                      </span>
                    )}
                    {item.licenseStatus === 'pending' && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                        รอตรวจประเมิน
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    {item.latestScore > 0 ? (
                      <span className="font-bold text-slate-900">{item.latestScore} / 100</span>
                    ) : (
                      <span className="text-slate-400 italic">ยังไม่ตรวจ</span>
                    )}
                    {item.latestInspectionDate && (
                      <div className="text-[11px] text-slate-400">{item.latestInspectionDate}</div>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {canEdit && (
                        <button
                          onClick={() => onInspect(item)}
                          className="px-2.5 py-1 text-xs font-semibold rounded bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors"
                          title="ตรวจสุขลักษณะกิจการอันตราย"
                        >
                          ตรวจประเมิน
                        </button>
                      )}

                      <button
                        onClick={() => onPrintLicense(item)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                        title="พิมพ์แบบอนุญาต / รายงานการตรวจ"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      {userRole === 'admin' && (
                        <button
                          onClick={() => onDelete(item)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="ลบข้อมูล"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
