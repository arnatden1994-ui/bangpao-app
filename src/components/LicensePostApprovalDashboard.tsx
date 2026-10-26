import React, { useState, useMemo } from 'react';
import {
  RotateCw,
  Search,
  Edit2,
  Printer,
  FileCheck,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  FileText,
  PlusCircle,
  Database,
  Check,
} from 'lucide-react';
import { LicenseRecord } from '../types/index.ts';
import { seedLicensesToFirestore } from '../services/firebaseService.ts';

interface LicensePostApprovalDashboardProps {
  licenses: LicenseRecord[];
  onRefreshData: () => void;
  onEditInspection?: (license: LicenseRecord) => void;
  onEditLicense?: (license: LicenseRecord) => void;
  onPrintInspectionReport: (license: LicenseRecord) => void;
  onIssueLicense: (license: LicenseRecord) => void;
  onRenewLicense: (license: LicenseRecord) => void;
  onNewInspection?: () => void;
}

export const LicensePostApprovalDashboard: React.FC<LicensePostApprovalDashboardProps> = ({
  licenses,
  onRefreshData,
  onEditInspection,
  onEditLicense,
  onPrintInspectionReport,
  onIssueLicense,
  onRenewLicense,
  onNewInspection,
}) => {
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'normal' | 'expiring' | 'expired' | 'pending'>('all');
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedFeedback, setSeedFeedback] = useState<string | null>(null);

  // Counts calculated directly from Firestore-synced `licenses` prop
  const totalCount = licenses.length;
  const normalCount = licenses.filter((l) => l.status === 'normal').length;
  const expiringCount = licenses.filter((l) => l.status === 'expiring').length;
  const expiredCount = licenses.filter((l) => l.status === 'expired').length;
  const pendingCount = licenses.filter((l) => l.status === 'pending').length;

  const [showSeedConfirmModal, setShowSeedConfirmModal] = useState(false);

  // Handle Seed Data directly into Firestore collection "licenses"
  const executeSeed = async () => {
    setIsSeeding(true);
    setSeedFeedback(null);
    try {
      const res = await seedLicensesToFirestore();
      if (res.success) {
        setSeedFeedback(`✅ นำเข้าข้อมูลใบอนุญาต ${res.count} รายการลง Firestore สำเร็จ!`);
        onRefreshData();
      } else {
        setSeedFeedback(`❌ ${res.message}`);
      }
    } catch (e: any) {
      setSeedFeedback(`❌ เกิดข้อผิดพลาด: ${e?.message || String(e)}`);
    } finally {
      setIsSeeding(false);
      setTimeout(() => setSeedFeedback(null), 6000);
    }
  };

  // Filtered List
  const filteredLicenses = useMemo(() => {
    return licenses.filter((l) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        l.businessName.toLowerCase().includes(q) ||
        l.licenseNumber.toLowerCase().includes(q) ||
        l.ownerName.toLowerCase().includes(q);

      const matchYear = selectedYear === 'all' || l.licenseYear === selectedYear;
      const matchStatus = statusFilter === 'all' || l.status === statusFilter;

      return matchSearch && matchYear && matchStatus;
    });
  }, [licenses, search, selectedYear, statusFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 w-full">
      {/* Top Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-7 bg-emerald-700 rounded-full inline-block" />
          <div>
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <span>🛡️ แดชบอร์ดบันทึกติดตามผลการอนุมัติใบอนุญาต (Post-Approval)</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              ระบบติดตามสถานประกอบการ 36 แห่ง • เทศบาลตำบลบางเป้า อ.กันตัง จ.ตรัง • Cloud Firestore เชื่อมต่อสด
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Seed Data Button */}
          <button
            onClick={() => setShowSeedConfirmModal(true)}
            disabled={isSeeding}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-sm transition-all active:scale-98 cursor-pointer disabled:opacity-50"
            title="นำเข้าข้อมูลใบอนุญาตเริ่มต้น 36 รายการลงสู่ Cloud Firestore"
          >
            <Database className={`w-3.5 h-3.5 ${isSeeding ? 'animate-spin' : ''}`} />
            <span>{isSeeding ? 'กำลังนำเข้า Firestore...' : '🚀 นำเข้าข้อมูลเริ่มต้น 36 รายการ (Seed Firestore)'}</span>
          </button>

          {onNewInspection && (
            <button
              onClick={onNewInspection}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition-all active:scale-98 cursor-pointer"
              title="เปิดแบบฟอร์มบันทึกตรวจประเมินสถานประกอบการ 25 ข้อ"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ ตรวจประเมินใหม่</span>
            </button>
          )}

          <button
            onClick={onRefreshData}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors shadow-xs cursor-pointer"
            title="รีเฟรชข้อมูลจากฐานข้อมูล"
          >
            <RotateCw className="w-3.5 h-3.5 text-slate-500" />
            <span>รีเฟรช</span>
          </button>
        </div>
      </div>

      {/* Seed Feedback Alert */}
      {seedFeedback && (
        <div className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
          seedFeedback.includes('✅')
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <span>{seedFeedback}</span>
          <button onClick={() => setSeedFeedback(null)} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      {/* KPI Metric Cards (ทั้งหมด 36, ปกติ 11, หมดอายุ 24, รออนุมัติ 1) */}
      <div className={`grid grid-cols-2 ${expiringCount > 0 ? 'sm:grid-cols-5' : 'sm:grid-cols-4'} gap-3`}>
        {/* 1. ทั้งหมด */}
        <div
          onClick={() => setStatusFilter('all')}
          className={`rounded-2xl p-4 text-center border-2 transition-all cursor-pointer shadow-xs ${
            statusFilter === 'all'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-[1.02]'
              : 'bg-white border-slate-200/80 hover:border-slate-300 text-slate-800'
          }`}
        >
          <div className={`text-xs font-bold ${statusFilter === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>ทั้งหมด</div>
          <div className={`text-2xl sm:text-3xl font-black mt-1 ${statusFilter === 'all' ? 'text-white' : 'text-slate-900'}`}>{totalCount}</div>
          <div className={`text-[10px] mt-0.5 font-medium ${statusFilter === 'all' ? 'text-slate-400' : 'text-slate-400'}`}>36 สถานประกอบการ</div>
        </div>

        {/* 2. ปกติ */}
        <div
          onClick={() => setStatusFilter('normal')}
          className={`rounded-2xl p-4 text-center border-2 transition-all cursor-pointer shadow-xs ${
            statusFilter === 'normal'
              ? 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white border-emerald-600 shadow-md scale-[1.02]'
              : 'bg-emerald-50/50 border-emerald-200/80 hover:border-emerald-300'
          }`}
        >
          <div className={`text-xs font-bold flex items-center justify-center gap-1.5 ${statusFilter === 'normal' ? 'text-emerald-100' : 'text-emerald-700'}`}>
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> ปกติ
          </div>
          <div className={`text-2xl sm:text-3xl font-black mt-1 ${statusFilter === 'normal' ? 'text-white' : 'text-emerald-700'}`}>{normalCount}</div>
          <div className={`text-[10px] mt-0.5 font-medium ${statusFilter === 'normal' ? 'text-emerald-100' : 'text-emerald-600'}`}>ใบอนุญาตสมบูรณ์</div>
        </div>

        {/* ใกล้หมดอายุ (แสดงเมื่อมีรายการใกล้หมดอายุ <= 30 วัน) */}
        {expiringCount > 0 && (
          <div
            onClick={() => setStatusFilter('expiring')}
            className={`rounded-2xl p-4 text-center border-2 transition-all cursor-pointer shadow-xs ${
              statusFilter === 'expiring'
                ? 'bg-gradient-to-br from-amber-500 to-amber-700 text-white border-amber-600 shadow-md scale-[1.02]'
                : 'bg-amber-50/50 border-amber-200/80 hover:border-amber-300'
            }`}
          >
            <div className={`text-xs font-bold flex items-center justify-center gap-1.5 ${statusFilter === 'expiring' ? 'text-amber-100' : 'text-amber-700'}`}>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> ใกล้หมดอายุ
            </div>
            <div className={`text-2xl sm:text-3xl font-black mt-1 ${statusFilter === 'expiring' ? 'text-white' : 'text-amber-700'}`}>{expiringCount}</div>
            <div className={`text-[10px] mt-0.5 font-medium ${statusFilter === 'expiring' ? 'text-amber-100' : 'text-amber-600'}`}>เหลือ &le; 30 วัน</div>
          </div>
        )}

        {/* 3. หมดอายุ */}
        <div
          onClick={() => setStatusFilter('expired')}
          className={`rounded-2xl p-4 text-center border-2 transition-all cursor-pointer shadow-xs ${
            statusFilter === 'expired'
              ? 'bg-gradient-to-br from-rose-500 to-rose-700 text-white border-rose-600 shadow-md scale-[1.02]'
              : 'bg-rose-50/50 border-rose-200/80 hover:border-rose-300'
          }`}
        >
          <div className={`text-xs font-bold flex items-center justify-center gap-1.5 ${statusFilter === 'expired' ? 'text-rose-100' : 'text-rose-700'}`}>
            <span className="w-2 h-2 rounded-full bg-rose-500" /> หมดอายุ
          </div>
          <div className={`text-2xl sm:text-3xl font-black mt-1 ${statusFilter === 'expired' ? 'text-white' : 'text-rose-700'}`}>{expiredCount}</div>
          <div className={`text-[10px] mt-0.5 font-medium ${statusFilter === 'expired' ? 'text-rose-100' : 'text-rose-600'}`}>ต้องต่ออายุทันที</div>
        </div>

        {/* 4. รออนุมัติ */}
        <div
          onClick={() => setStatusFilter('pending')}
          className={`rounded-2xl p-4 text-center border-2 transition-all cursor-pointer shadow-xs ${
            statusFilter === 'pending'
              ? 'bg-gradient-to-br from-indigo-500 to-indigo-700 text-white border-indigo-600 shadow-md scale-[1.02]'
              : 'bg-indigo-50/50 border-indigo-200/80 hover:border-indigo-300'
          }`}
        >
          <div className={`text-xs font-bold flex items-center justify-center gap-1.5 ${statusFilter === 'pending' ? 'text-indigo-100' : 'text-indigo-700'}`}>
            <span>⏳ รออนุมัติ</span>
          </div>
          <div className={`text-2xl sm:text-3xl font-black mt-1 ${statusFilter === 'pending' ? 'text-white' : 'text-indigo-700'}`}>{pendingCount}</div>
          <div className={`text-[10px] mt-0.5 font-medium ${statusFilter === 'pending' ? 'text-indigo-100' : 'text-indigo-600'}`}>รอดำเนินการ</div>
        </div>
      </div>

      {/* Yearly Filter Banner */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            📊
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-800">
              สถิติการขอใบอนุญาตรายปี
            </h3>
            <p className="text-[11px] text-slate-500">
              คำนวณอัตโนมัติจากข้อมูล Cloud Firestore ของแต่ละร้านค้า
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSelectedYear('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedYear === 'all'
                ? 'bg-slate-800 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ทุกปี ({licenses.length})
          </button>
          <button
            onClick={() => setSelectedYear('2569')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedYear === '2569'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            พ.ศ. 2569 ({licenses.filter((l) => l.licenseYear === '2569').length})
          </button>
          <button
            onClick={() => setSelectedYear('2568')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedYear === '2568'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            พ.ศ. 2568 ({licenses.filter((l) => l.licenseYear === '2568').length})
          </button>
          <button
            onClick={() => setSelectedYear('2567')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedYear === '2567'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            พ.ศ. 2567 ({licenses.filter((l) => l.licenseYear === '2567').length})
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Filter Header */}
        <div className="p-4 border-b border-slate-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาชื่อร้านค้า, เลขที่ใบอนุญาต, หรือชื่อผู้ประกอบการ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">
              แสดง {filteredLicenses.length} จาก {licenses.length} รายการ
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-100/70 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-3 text-center w-12">#</th>
                <th className="py-3.5 px-4 min-w-[220px]">ชื่อสถานประกอบการ</th>
                <th className="py-3.5 px-4 min-w-[120px]">เลขที่ใบอนุญาต</th>
                <th className="py-3.5 px-4 min-w-[100px]">วันที่เริ่มมีผล</th>
                <th className="py-3.5 px-4 min-w-[100px]">วันที่สิ้นสุด</th>
                <th className="py-3.5 px-4 min-w-[130px]">สถานะ</th>
                <th className="py-3.5 px-4 text-center min-w-[260px]">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLicenses.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-3 text-center font-bold text-slate-600">{idx + 1}</td>

                  {/* ชื่อร้าน & วันที่ */}
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">
                      {item.businessName}{' '}
                      <span className="text-emerald-700 font-normal">({item.roundYear})</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      บันทึกเมื่อ: {item.createdAtFormatted}
                    </div>
                  </td>

                  {/* เลขทะเบียน */}
                  <td className="py-3.5 px-4 font-mono font-medium text-slate-800">
                    {item.licenseNumber}
                  </td>

                  {/* วันที่เริ่ม */}
                  <td className="py-3.5 px-4 text-slate-700">{item.approvalDate}</td>

                  {/* วันที่หมดอายุ */}
                  <td className="py-3.5 px-4 text-slate-700">{item.expireDate}</td>

                  {/* สถานะ */}
                  <td className="py-3.5 px-4">
                    {item.status === 'normal' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        ปกติ (เหลือ {item.remainingDays} วัน)
                      </span>
                    )}
                    {item.status === 'expiring' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        ใกล้หมดอายุ (เหลือ {item.remainingDays} วัน)
                      </span>
                    )}
                    {item.status === 'expired' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        หมดอายุคำขอ
                      </span>
                    )}
                    {item.status === 'pending' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                        ⏳ รออนุมัติ
                      </span>
                    )}
                  </td>

                  {/* เมนูจัดการ */}
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5">
                      {/* 1. ปุ่มแก้ไข (เปิด modal แก้ไขข้อมูลใบอนุญาตและบันทึกอัปเดตลง Firestore ทันที) */}
                      <button
                        onClick={() => {
                          if (onEditLicense) {
                            onEditLicense(item);
                          } else if (onEditInspection) {
                            onEditInspection(item);
                          }
                        }}
                        className="px-2 py-1 rounded text-xs font-semibold bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors flex items-center gap-1 cursor-pointer"
                        title="แก้ไขข้อมูลใบอนุญาต (บันทึกลง Firestore ได้ทันที)"
                      >
                        <Edit2 className="w-3 h-3 text-amber-600" />
                        <span>แก้ไข</span>
                      </button>

                      {/* 2. รายงานตรวจ (เปิด modal ส่งออก: PDF, Sheet, Word) */}
                      <button
                        onClick={() => onPrintInspectionReport(item)}
                        className="px-2 py-1 rounded text-xs font-semibold bg-indigo-50 text-indigo-800 hover:bg-indigo-100 transition-colors flex items-center gap-1 cursor-pointer"
                        title="พิมพ์รายงานการตรวจประเมิน (PDF / Sheet / Word)"
                      >
                        <Printer className="w-3 h-3 text-indigo-600" />
                        <span>รายงานตรวจ</span>
                      </button>

                      {/* 3. ออกใบอนุญาต (เปิด modal ตรวจสอบและแก้ไขข้อมูลก่อนออกใบอนุญาต อภ.2) */}
                      <button
                        onClick={() => onIssueLicense(item)}
                        className="px-2 py-1 rounded text-xs font-semibold bg-teal-50 text-teal-800 hover:bg-teal-100 transition-colors flex items-center gap-1 cursor-pointer"
                        title="ตรวจสอบและแก้ไขข้อมูลก่อนออกใบอนุญาต (อภ.2)"
                      >
                        <FileCheck className="w-3 h-3 text-teal-600" />
                        <span>ออกใบอนุญาต</span>
                      </button>

                      {/* ต่ออายุ (ถ้าหมดอายุ หรือใกล้หมดอายุ <= 30 วัน) */}
                      {(item.status === 'expired' || item.status === 'expiring' || item.remainingDays <= 30) && (
                        <button
                          onClick={() => onRenewLicense(item)}
                          className="px-2 py-1 rounded text-xs font-medium bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors flex items-center gap-1 cursor-pointer"
                          title="ต่ออายุใบอนุญาตประจำปี"
                        >
                          <RefreshCw className="w-3 h-3 text-emerald-600" />
                          <span>ต่ออายุ</span>
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

      {/* Seed Firestore Confirmation Modal */}
      {showSeedConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">ยืนยันนำเข้าข้อมูลใบอนุญาต</h3>
                <p className="text-xs text-slate-500">Cloud Firestore Collection: &quot;licenses&quot;</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              ระบบจะนำเข้าข้อมูลสถานประกอบการและใบอนุญาตเริ่มต้นทั้ง 36 แห่งของเทศบาลตำบลบางเป้า เพื่อเป็นฐานข้อมูลหลักบน Cloud Firestore
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowSeedConfirmModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSeedConfirmModal(false);
                  executeSeed();
                }}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                ยืนยันนำเข้าข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
