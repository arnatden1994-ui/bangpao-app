import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  ClipboardCheck,
  Award,
  Printer,
  Edit2,
  Trash2,
  Phone,
  MapPin,
  Calendar,
  User,
  LayoutGrid,
  List,
  CheckCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { Establishment, EstablishmentType } from '../types/index.ts';
import { ESTABLISHMENT_TYPE_LABELS } from '../data/criteria.ts';

interface EstablishmentListViewProps {
  establishments: Establishment[];
  onStartInspect: (establishment: Establishment) => void;
  onViewCertificate: (establishment: Establishment) => void;
  onViewReport: (establishment: Establishment) => void;
  onEditEstablishment: (establishment: Establishment) => void;
  onDeleteEstablishment: (establishment: Establishment) => void;
  onAddNew: () => void;
  initialFilterStatus?: string;
}

export const EstablishmentListView: React.FC<EstablishmentListViewProps> = ({
  establishments,
  onStartInspect,
  onViewCertificate,
  onViewReport,
  onEditEstablishment,
  onDeleteEstablishment,
  onAddNew,
  initialFilterStatus = 'all',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>(initialFilterStatus);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const filteredEstablishments = useMemo(() => {
    return establishments.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.code && item.code.toLowerCase().includes(q)) ||
        item.ownerName.toLowerCase().includes(q) ||
        item.address.toLowerCase().includes(q) ||
        item.subdistrict.toLowerCase().includes(q) ||
        item.district.toLowerCase().includes(q);

      const matchesType = selectedType === 'all' || item.type === selectedType;
      const matchesStatus =
        selectedStatus === 'all' ||
        (selectedStatus === 'passed' && item.status === 'passed') ||
        (selectedStatus === 'needs_reinspection' && item.status === 'needs_reinspection') ||
        (selectedStatus === 'pending' && (item.status === 'pending' || item.latestRating === 'uninspected'));

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [establishments, searchQuery, selectedType, selectedStatus]);

  return (
    <div className="space-y-5">
      {/* Top Filter & Search Bar */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อสถานประกอบการ, รหัสทะเบียน, เจ้าของ, อำเภอ/ตำบล..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                ล้าง
              </button>
            )}
          </div>

          {/* View Mode & Add Button */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md text-xs transition-colors ${
                  viewMode === 'table' ? 'bg-white shadow-xs text-emerald-700 font-medium' : 'text-slate-500'
                }`}
                title="มุมมองตาราง"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md text-xs transition-colors ${
                  viewMode === 'grid' ? 'bg-white shadow-xs text-emerald-700 font-medium' : 'text-slate-500'
                }`}
                title="มุมมองการ์ด"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={onAddNew}
              className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มร้านใหม่</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-500 font-medium flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> สถานะ:
          </span>

          {[
            { id: 'all', label: 'ทั้งหมด' },
            { id: 'passed', label: 'ผ่านเกณฑ์มาตรฐาน' },
            { id: 'needs_reinspection', label: 'ต้องปรับปรุง / ตรวจซ้ำ' },
            { id: 'pending', label: 'ยังไม่ตรวจ / รอตรวจ' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setSelectedStatus(st.id)}
              className={`px-2.5 py-1 rounded-full font-medium transition-colors ${
                selectedStatus === st.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st.label}
            </button>
          ))}

          <span className="text-slate-300 mx-1">|</span>

          {/* Type Filter dropdown */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-2.5 py-1 text-xs bg-slate-100 border-0 rounded-lg text-slate-700 font-medium focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">ทุกประเภทสถานประกอบการ</option>
            {Object.entries(ESTABLISHMENT_TYPE_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>

          <span className="ml-auto text-slate-400 font-medium">
            พบ {filteredEstablishments.length} จาก {establishments.length} แห่ง
          </span>
        </div>
      </div>

      {/* Main Content: Table or Grid */}
      {filteredEstablishments.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">ไม่พบสถานประกอบการที่ตรงกับเงื่อนไข</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            ลองปรับเปลี่ยนคำค้นหา หรือเลือกตัวกรองสถานะเป็น &quot;ทั้งหมด&quot;
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedStatus('all');
              setSelectedType('all');
            }}
            className="mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            ล้างตัวกรองทั้งหมด
          </button>
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">สถานประกอบการ / ทะเบียน</th>
                  <th className="py-3.5 px-4">ประเภท</th>
                  <th className="py-3.5 px-4">เจ้าของ / เบอร์โทร</th>
                  <th className="py-3.5 px-4">ที่อยู่ / พื้นที่</th>
                  <th className="py-3.5 px-4">ผลการตรวจล่าสุด</th>
                  <th className="py-3.5 px-4">สถานะ</th>
                  <th className="py-3.5 px-4 text-right">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEstablishments.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Name & Code */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{item.name}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        {item.code || item.id}
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-3.5 px-4 text-slate-600">
                      <span className="inline-block px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">
                        {ESTABLISHMENT_TYPE_LABELS[item.type] || item.type}
                      </span>
                    </td>

                    {/* Owner & Phone */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-900 font-medium">{item.ownerName}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{item.phone}</span>
                      </div>
                    </td>

                    {/* Address & District */}
                    <td className="py-3.5 px-4 text-slate-600">
                      <div className="text-xs truncate max-w-[200px]" title={item.address}>
                        {item.address}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {item.subdistrict}, {item.district}
                      </div>
                    </td>

                    {/* Latest Score & Rating */}
                    <td className="py-3.5 px-4">
                      {item.latestScore > 0 ? (
                        <div>
                          <div className="font-bold text-slate-900">{item.latestScore} คะแนน</div>
                          <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            <span>{item.latestInspectionDate || '-'}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">ยังไม่ได้ตรวจ</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      {item.status === 'passed' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          <CheckCircle className="w-3 h-3" /> ผ่านเกณฑ์
                        </span>
                      )}
                      {item.status === 'needs_reinspection' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                          <AlertTriangle className="w-3 h-3" /> ตรวจซ้ำ
                        </span>
                      )}
                      {item.status === 'failed' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                          ไม่ผ่านเกณฑ์
                        </span>
                      )}
                      {item.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                          <Clock className="w-3 h-3" /> รอตรวจ
                        </span>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onStartInspect(item)}
                          className="px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                          title="ทำแบบตรวจประเมินสุขลักษณะ"
                        >
                          <ClipboardCheck className="w-3.5 h-3.5 inline mr-1" />
                          ตรวจประเมิน
                        </button>

                        {item.status === 'passed' && (
                          <button
                            onClick={() => onViewCertificate(item)}
                            className="p-1.5 text-amber-700 hover:text-amber-800 rounded-md hover:bg-amber-50 transition-colors"
                            title="พิมพ์ใบรับรองมาตรฐานสุขลักษณะ"
                          >
                            <Award className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => onViewReport(item)}
                          className="p-1.5 text-slate-500 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
                          title="พิมพ์แบบรายงานผลการตรวจ A4"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onEditEstablishment(item)}
                          className="p-1.5 text-slate-500 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
                          title="แก้ไขข้อมูลร้าน"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onDeleteEstablishment(item)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                          title="ลบข้อมูล"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEstablishments.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
            >
              {item.imageUrl && (
                <div className="h-36 w-full bg-slate-100 relative overflow-hidden">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2.5 left-2.5">
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-black/60 text-white backdrop-blur-xs">
                      {ESTABLISHMENT_TYPE_LABELS[item.type] || item.type}
                    </span>
                  </div>
                  <div className="absolute top-2.5 right-2.5">
                    {item.status === 'passed' && (
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-600 text-white shadow-xs">
                        ผ่าน {item.latestScore} คะแนน
                      </span>
                    )}
                    {item.status === 'needs_reinspection' && (
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-500 text-white shadow-xs">
                        ต้องตรวจซ้ำ ({item.latestScore} คะแนน)
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-mono text-slate-400">{item.code || item.id}</div>
                  <h3 className="text-base font-bold text-slate-900 mt-1 line-clamp-1">{item.name}</h3>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-800">{item.ownerName}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{item.phone}</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">
                        {item.address} ต.{item.subdistrict} อ.{item.district} จ.{item.province}
                      </span>
                    </div>
                  </div>

                  {item.notes && (
                    <div className="mt-3 p-2 rounded bg-slate-50 text-[11px] text-slate-600 line-clamp-2 border border-slate-100">
                      <strong>หมายเหตุ:</strong> {item.notes}
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => onStartInspect(item)}
                    className="flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center justify-center gap-1"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" />
                    <span>ตรวจประเมิน</span>
                  </button>

                  <div className="flex items-center gap-1 ml-2">
                    {item.status === 'passed' && (
                      <button
                        onClick={() => onViewCertificate(item)}
                        className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                        title="พิมพ์ใบรับรองมาตรฐาน"
                      >
                        <Award className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => onViewReport(item)}
                      className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                      title="พิมพ์แบบรายงานผลการตรวจ A4"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEditEstablishment(item)}
                      className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                      title="แก้ไขข้อมูลร้าน"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
