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
  ChevronDown,
  Download,
  Filter,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  Coins,
  Building2,
  Layers,
  Sparkles,
  X,
  CheckCircle,
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
  onUpdateLicense?: (license: LicenseRecord) => Promise<void> | void;
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
  onUpdateLicense,
}) => {
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'normal' | 'expiring' | 'expired' | 'pending'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedFeedback, setSeedFeedback] = useState<string | null>(null);
  const [showSeedConfirmModal, setShowSeedConfirmModal] = useState(false);

  // Extract distinct years dynamically, sorted descending
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    licenses.forEach((l) => {
      const yr = (l.licenseYear || '').trim();
      if (yr) {
        yearsSet.add(yr);
      } else if (l.roundYear) {
        const match = l.roundYear.match(/\d{4}/);
        if (match) yearsSet.add(match[0]);
      }
    });
    if (yearsSet.size === 0) {
      yearsSet.add('2569');
      yearsSet.add('2568');
      yearsSet.add('2567');
    }
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [licenses]);

  // Year-scoped dataset: Primary dataset based on the selected year!
  const yearScopedLicenses = useMemo(() => {
    if (selectedYear === 'all') return licenses;
    return licenses.filter((l) => {
      const yr = (l.licenseYear || '').trim();
      if (yr) return yr === selectedYear;
      if (l.roundYear) return l.roundYear.includes(selectedYear);
      return false;
    });
  }, [licenses, selectedYear]);

  // Metrics calculated directly from the active year scope
  const totalCount = yearScopedLicenses.length;
  const normalCount = yearScopedLicenses.filter((l) => l.status === 'normal').length;
  const expiringCount = yearScopedLicenses.filter((l) => l.status === 'expiring').length;
  const expiredCount = yearScopedLicenses.filter((l) => l.status === 'expired').length;
  const pendingCount = yearScopedLicenses.filter((l) => l.status === 'pending').length;

  // Percentage calculations
  const normalPct = totalCount > 0 ? Math.round((normalCount / totalCount) * 100) : 0;
  const expiredPct = totalCount > 0 ? Math.round((expiredCount / totalCount) * 100) : 0;
  const expiringPct = totalCount > 0 ? Math.round((expiringCount / totalCount) * 100) : 0;
  const pendingPct = totalCount > 0 ? Math.round((pendingCount / totalCount) * 100) : 0;

  // Total collected fee in Thai Baht
  const totalFees = useMemo(() => {
    return yearScopedLicenses.reduce((sum, item) => {
      const val = typeof item.feeAmount === 'number'
        ? item.feeAmount
        : parseFloat(String(item.feeAmount || '0').replace(/[^\d.]/g, '')) || 0;
      return sum + val;
    }, 0);
  }, [yearScopedLicenses]);

  // Available categories for current year filter
  const availableCategories = useMemo(() => {
    const catMap = new Map<string, number>();
    yearScopedLicenses.forEach((l) => {
      const cat = (l.businessCategory || 'ทั่วไป').trim();
      catMap.set(cat, (catMap.get(cat) || 0) + 1);
    });
    return Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]);
  }, [yearScopedLicenses]);

  // Handle year selection
  const handleSelectYear = (yr: string) => {
    setSelectedYear(yr);
    setStatusFilter('all');
    setSelectedCategory('all');
  };

  // Toggle status filter card
  const handleToggleStatusCard = (status: 'all' | 'normal' | 'expiring' | 'expired' | 'pending') => {
    if (statusFilter === status && status !== 'all') {
      setStatusFilter('all');
    } else {
      setStatusFilter(status);
    }
  };

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

  // Quick sequential license number helper
  const generateNextLicenseNumber = (allLicenses: LicenseRecord[], targetYear: string = '2569'): string => {
    let maxSeq = 0;
    for (const lic of allLicenses) {
      if (!lic.licenseNumber || lic.licenseNumber.includes('รอออกเลข')) continue;
      const match = lic.licenseNumber.match(/(\d+)\s*\/\s*(\d+)/);
      if (match) {
        const seq = parseInt(match[1], 10);
        const yr = match[2];
        if (yr === targetYear && !isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }
    const nextSeq = maxSeq > 0 ? maxSeq + 1 : 1;
    const seqStr = nextSeq < 10 ? `0${nextSeq}` : `${nextSeq}`;
    return `เลขที่ ${seqStr}/${targetYear}`;
  };

  // Handle Quick Approve
  const handleQuickApprove = async (item: LicenseRecord) => {
    if (!onUpdateLicense) return;
    const confirmApprove = window.confirm(
      `ยืนยันอนุมัติใบอนุญาตของ "${item.businessName}" ใช่หรือไม่?\n\nระบบจะออกเลขที่ใบอนุญาตให้อัตโนมัติ ปรับสถานะเป็น "ปกติ" และเริ่มนับอายุ 365 วัน`
    );
    if (!confirmApprove) return;

    const targetYear = item.licenseYear || '2569';
    const nextNum = generateNextLicenseNumber(licenses, targetYear);
    const today = new Date();
    const nextYear = new Date();
    nextYear.setFullYear(today.getFullYear() + 1);
    nextYear.setDate(today.getDate() - 1);

    const pad = (n: number) => n.toString().padStart(2, '0');
    const thaiYear = today.getFullYear() + 543;
    const nextThaiYear = nextYear.getFullYear() + 543;
    const startStr = `${pad(today.getDate())}/${pad(today.getMonth() + 1)}/${thaiYear}`;
    const endStr = `${pad(nextYear.getDate())}/${pad(nextYear.getMonth() + 1)}/${nextThaiYear}`;

    const updated: LicenseRecord = {
      ...item,
      status: 'normal',
      licenseNumber: item.licenseNumber.includes('รอออกเลข') || !item.licenseNumber ? nextNum : item.licenseNumber,
      approvalDate: startStr,
      expireDate: endStr,
      remainingDays: 365,
      daysRemaining: 365,
      updatedAt: new Date().toISOString(),
    };

    await onUpdateLicense(updated);
  };

  // Handle Inline Status Change directly from table dropdown
  const handleInlineStatusChange = async (item: LicenseRecord, newStatus: LicenseRecord['status']) => {
    if (!onUpdateLicense) return;
    const isNowNormal = newStatus === 'normal';
    const wasPending = item.status === 'pending';

    let newNumber = item.licenseNumber;
    let newApprovalDate = item.approvalDate;
    let newExpireDate = item.expireDate;
    let newDays = item.remainingDays;

    if (isNowNormal && (wasPending || item.licenseNumber.includes('รอออกเลข'))) {
      const targetYear = item.licenseYear || '2569';
      newNumber = generateNextLicenseNumber(licenses, targetYear);
      const today = new Date();
      const nextYear = new Date();
      nextYear.setFullYear(today.getFullYear() + 1);
      nextYear.setDate(today.getDate() - 1);
      const pad = (n: number) => n.toString().padStart(2, '0');
      const thaiYear = today.getFullYear() + 543;
      const nextThaiYear = nextYear.getFullYear() + 543;
      newApprovalDate = `${pad(today.getDate())}/${pad(today.getMonth() + 1)}/${thaiYear}`;
      newExpireDate = `${pad(nextYear.getDate())}/${pad(nextYear.getMonth() + 1)}/${nextThaiYear}`;
      newDays = 365;
    } else if (newStatus === 'expired') {
      newDays = 0;
    } else if (newStatus === 'normal' && (newDays === 0 || !newDays)) {
      newDays = 365;
    }

    const updated: LicenseRecord = {
      ...item,
      status: newStatus,
      licenseNumber: newNumber,
      approvalDate: newApprovalDate,
      expireDate: newExpireDate,
      remainingDays: newDays,
      daysRemaining: newDays,
      updatedAt: new Date().toISOString(),
    };

    await onUpdateLicense(updated);
  };

  // Filtered List
  const filteredLicenses = useMemo(() => {
    return yearScopedLicenses.filter((l) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        (l.businessName || '').toLowerCase().includes(q) ||
        (l.licenseNumber || '').toLowerCase().includes(q) ||
        (l.ownerName || '').toLowerCase().includes(q) ||
        (l.businessMoo && `หมู่ ${l.businessMoo}`.includes(q));

      const matchStatus = statusFilter === 'all' || l.status === statusFilter;
      const matchCategory = selectedCategory === 'all' || (l.businessCategory || '').trim() === selectedCategory;

      return matchSearch && matchStatus && matchCategory;
    }).sort((a: any, b: any) => {
      const numA = parseInt(String(a.id || '').replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(String(b.id || '').replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });
  }, [yearScopedLicenses, search, statusFilter, selectedCategory]);

  // Export to Excel helper (.xls compatible with all versions of Microsoft Excel with Thai fonts)
  const handleExportExcel = () => {
    if (filteredLicenses.length === 0) return;
    const escapeXls = (str?: string | number | null) => {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };

    const rows = filteredLicenses
      .map((item, idx) => {
        const statusLabel =
          item.status === 'normal'
            ? 'ปกติ'
            : item.status === 'expiring'
            ? 'ใกล้หมดอายุ'
            : item.status === 'expired'
            ? 'หมดอายุ'
            : 'รออนุมัติ';
        const address = `${item.businessAddressNo || ''} ม.${item.businessMoo || ''} ต.${item.businessSubdistrict || 'บางเป้า'}`;
        return `
          <tr>
            <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px;">${idx + 1}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px; font-weight: bold;">${escapeXls(item.businessName || '')}</td>
            <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px;">${escapeXls(item.licenseYear || selectedYear)}</td>
            <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px;">${escapeXls(item.licenseNumber || 'รอออกเลข')}</td>
            <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px;">${escapeXls(item.approvalDate || '-')}</td>
            <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px;">${escapeXls(item.expireDate || '-')}</td>
            <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px;">${escapeXls(statusLabel)}</td>
            <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px;">${item.remainingDays ?? '-'}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px;">${escapeXls(item.ownerName || '')}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px;">${escapeXls(address)}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px;">${escapeXls(item.businessCategory || '')}</td>
            <td style="text-align: right; border: 1px solid #cbd5e1; padding: 6px;">${(item.feeAmount || 0).toLocaleString()}</td>
          </tr>
        `;
      })
      .join('');

    const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>ทะเบียนใบอนุญาต</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body, table, td, th { font-family: 'Sarabun', 'TH SarabunPSK', sans-serif; font-size: 13px; }
          .main-title { font-size: 16px; font-weight: bold; text-align: center; padding: 12px; background-color: #ecfdf5; color: #065f46; }
          .th-header { background-color: #047857; color: white; font-weight: bold; text-align: center; padding: 8px; }
        </style>
      </head>
      <body>
        <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
          <tr>
            <td colspan="12" class="main-title">
              ทะเบียนและสถิติใบอนุญาตกิจการที่เป็นอันตรายต่อสุขภาพ เทศบาลตำบลบางเป้า ประจำปี ${selectedYear === 'all' ? 'ทุกปี' : selectedYear}
            </td>
          </tr>
          <tr>
            <th class="th-header" style="border: 1px solid #cbd5e1;">ลำดับ</th>
            <th class="th-header" style="border: 1px solid #cbd5e1;">ชื่อสถานประกอบการ</th>
            <th class="th-header" style="border: 1px solid #cbd5e1;">รอบปี</th>
            <th class="th-header" style="border: 1px solid #cbd5e1;">เลขที่ใบอนุญาต</th>
            <th class="th-header" style="border: 1px solid #cbd5e1;">วันที่เริ่มมีผล</th>
            <th class="th-header" style="border: 1px solid #cbd5e1;">วันที่สิ้นสุด</th>
            <th class="th-header" style="border: 1px solid #cbd5e1;">สถานะ</th>
            <th class="th-header" style="border: 1px solid #cbd5e1;">วันที่เหลือ</th>
            <th class="th-header" style="border: 1px solid #cbd5e1;">ชื่อผู้ประกอบการ</th>
            <th class="th-header" style="border: 1px solid #cbd5e1;">ที่อยู่สถานประกอบการ</th>
            <th class="th-header" style="border: 1px solid #cbd5e1;">ประเภทกิจการ</th>
            <th class="th-header" style="border: 1px solid #cbd5e1;">ค่าธรรมเนียม (บาท)</th>
          </tr>
          ${rows}
        </table>
      </body>
      </html>
    `;
    const bom = '\uFEFF';
    const blob = new Blob([bom + excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `สถิติใบอนุญาตกิจการอันตราย_ปี_${selectedYear}_${new Date().toISOString().slice(0, 10)}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200 w-full">
      {/* Top Title & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-700/10 flex items-center justify-center text-emerald-800">
            <ShieldCheck className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <span>แดชบอร์ดบันทึกติดตามผลการอนุมัติใบอนุญาต (Post-Approval)</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              ฐานข้อมูลติดตามสถานประกอบการ {licenses.length} แห่ง • กองสาธารณสุขและสิ่งแวดล้อม ทต.บางเป้า • Cloud Firestore
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Seed Data Button */}
          <button
            onClick={() => setShowSeedConfirmModal(true)}
            disabled={isSeeding}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-sm transition-all active:scale-98 cursor-pointer disabled:opacity-50"
            title={`นำเข้าข้อมูลใบอนุญาตจริง ${licenses.length} รายการลงสู่ Cloud Firestore`}
          >
            <Database className={`w-3.5 h-3.5 ${isSeeding ? 'animate-spin' : ''}`} />
            <span>{isSeeding ? 'กำลังนำเข้า Firestore...' : `🚀 นำเข้าข้อมูลจริง ${licenses.length} รายการ (Seed Firestore)`}</span>
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
        <div
          className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
            seedFeedback.includes('✅')
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{seedFeedback}</span>
          <button onClick={() => setSeedFeedback(null)} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      {/* 🌟 1. Yearly Selection Bar (ยกระดับขึ้นด้านบนเพื่อความชัดเจนในการสลับดูข้อมูล) */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-md border border-slate-700/60">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-400">
                  สถิติและการจัดทำใบอนุญาตรายปี
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {selectedYear === 'all' ? 'ภาพรวมสะสมทุกปี' : `รอบปี พ.ศ. ${selectedYear}`}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white mt-0.5">
                เลือกปีงบประมาณเพื่อกรองตัวชี้วัดและข้อมูลสถานประกอบการ
              </h2>
            </div>
          </div>

          {/* Dynamic Year Pills */}
          <div className="flex items-center gap-2 flex-wrap bg-slate-950/60 p-1.5 rounded-xl border border-slate-700/80">
            <button
              onClick={() => handleSelectYear('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedYear === 'all'
                  ? 'bg-emerald-600 text-white shadow-md scale-[1.02]'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>ทุกปี</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedYear === 'all' ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-800 text-slate-400'}`}>
                {licenses.length}
              </span>
            </button>

            {availableYears.map((yr) => {
              const countInYear = licenses.filter((l) => (l.licenseYear || '').trim() === yr || (l.roundYear || '').includes(yr)).length;
              const isSelected = selectedYear === yr;
              return (
                <button
                  key={yr}
                  onClick={() => handleSelectYear(yr)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-md scale-[1.02]'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span>พ.ศ. {yr}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isSelected ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-800 text-slate-400'}`}>
                    {countInYear}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 🌟 2. Interactive Health Compliance Bar & Revenue Highlights */}
        <div className="mt-4 pt-3.5 border-t border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex-1 max-w-xl">
            <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1.5">
              <span className="font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                อัตราความสมบูรณ์ของใบอนุญาต ({selectedYear === 'all' ? 'ทุกปี' : `ปี ${selectedYear}`})
              </span>
              <span className="font-bold text-emerald-400">{normalPct}% สมบูรณ์</span>
            </div>
            {/* Multi-segment Progress Bar */}
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
              <div
                style={{ width: `${normalPct}%` }}
                className="bg-emerald-500 transition-all duration-500"
                title={`ปกติ: ${normalCount} ร้าน (${normalPct}%)`}
              />
              <div
                style={{ width: `${expiringPct}%` }}
                className="bg-amber-400 transition-all duration-500"
                title={`ใกล้หมดอายุ: ${expiringCount} ร้าน (${expiringPct}%)`}
              />
              <div
                style={{ width: `${expiredPct}%` }}
                className="bg-rose-500 transition-all duration-500"
                title={`หมดอายุ: ${expiredCount} ร้าน (${expiredPct}%)`}
              />
              <div
                style={{ width: `${pendingPct}%` }}
                className="bg-indigo-400 transition-all duration-500"
                title={`รออนุมัติ: ${pendingCount} ร้าน (${pendingPct}%)`}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-300">
            <div className="flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>ค่าธรรมเนียมรวม:</span>
              <span className="font-bold text-white text-xs">฿{totalFees.toLocaleString()} บาท</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-teal-400" />
              <span>กิจการในระบบ:</span>
              <span className="font-bold text-white text-xs">{totalCount} แห่ง</span>
            </div>
          </div>
        </div>
      </div>

      {/* 🌟 3. Synchronized KPI Metric Cards (คำนวณตามปีที่เลือกแบบ Real-Time!) */}
      <div className={`grid grid-cols-2 ${expiringCount > 0 ? 'sm:grid-cols-5' : 'sm:grid-cols-4'} gap-3`}>
        {/* 1. ทั้งหมด */}
        <div
          onClick={() => handleToggleStatusCard('all')}
          className={`rounded-2xl p-4 text-center border-2 transition-all cursor-pointer shadow-xs ${
            statusFilter === 'all'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-[1.02]'
              : 'bg-white border-slate-200/80 hover:border-slate-300 text-slate-800'
          }`}
          title="คลิกเพื่อแสดงสถานประกอบการทั้งหมดของปีนี้"
        >
          <div className={`text-xs font-bold ${statusFilter === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>
            ทั้งหมด ({selectedYear === 'all' ? 'ทุกปี' : selectedYear})
          </div>
          <div className={`text-2xl sm:text-3xl font-black mt-1 ${statusFilter === 'all' ? 'text-white' : 'text-slate-900'}`}>
            {totalCount}
          </div>
          <div className={`text-[10px] mt-0.5 font-medium ${statusFilter === 'all' ? 'text-slate-300' : 'text-slate-400'}`}>
            {totalCount} สถานประกอบการ
          </div>
        </div>

        {/* 2. ปกติ */}
        <div
          onClick={() => handleToggleStatusCard('normal')}
          className={`rounded-2xl p-4 text-center border-2 transition-all cursor-pointer shadow-xs ${
            statusFilter === 'normal'
              ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-emerald-600 shadow-md scale-[1.02]'
              : 'bg-emerald-50/50 border-emerald-200/80 hover:border-emerald-300'
          }`}
          title="คลิกเพื่อกรองเฉพาะสถานประกอบการสถานะปกติ"
        >
          <div className={`text-xs font-bold flex items-center justify-center gap-1.5 ${statusFilter === 'normal' ? 'text-emerald-100' : 'text-emerald-700'}`}>
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> ปกติ
          </div>
          <div className={`text-2xl sm:text-3xl font-black mt-1 ${statusFilter === 'normal' ? 'text-white' : 'text-emerald-700'}`}>
            {normalCount}
          </div>
          <div className={`text-[10px] mt-0.5 font-medium ${statusFilter === 'normal' ? 'text-emerald-100' : 'text-emerald-600'}`}>
            สมบูรณ์ ({normalPct}%)
          </div>
        </div>

        {/* 3. ใกล้หมดอายุ (ถ้ามี) */}
        {expiringCount > 0 && (
          <div
            onClick={() => handleToggleStatusCard('expiring')}
            className={`rounded-2xl p-4 text-center border-2 transition-all cursor-pointer shadow-xs ${
              statusFilter === 'expiring'
                ? 'bg-gradient-to-br from-amber-500 to-amber-700 text-white border-amber-600 shadow-md scale-[1.02]'
                : 'bg-amber-50/50 border-amber-200/80 hover:border-amber-300'
            }`}
            title="คลิกเพื่อกรองเฉพาะสถานประกอบการใกล้หมดอายุ (เหลือ <= 30 วัน)"
          >
            <div className={`text-xs font-bold flex items-center justify-center gap-1.5 ${statusFilter === 'expiring' ? 'text-amber-100' : 'text-amber-700'}`}>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> ใกล้หมดอายุ
            </div>
            <div className={`text-2xl sm:text-3xl font-black mt-1 ${statusFilter === 'expiring' ? 'text-white' : 'text-amber-700'}`}>
              {expiringCount}
            </div>
            <div className={`text-[10px] mt-0.5 font-medium ${statusFilter === 'expiring' ? 'text-amber-100' : 'text-amber-600'}`}>
              เหลือ &le; 30 วัน ({expiringPct}%)
            </div>
          </div>
        )}

        {/* 4. หมดอายุ */}
        <div
          onClick={() => handleToggleStatusCard('expired')}
          className={`rounded-2xl p-4 text-center border-2 transition-all cursor-pointer shadow-xs ${
            statusFilter === 'expired'
              ? 'bg-gradient-to-br from-rose-500 to-rose-700 text-white border-rose-600 shadow-md scale-[1.02]'
              : 'bg-rose-50/50 border-rose-200/80 hover:border-rose-300'
          }`}
          title="คลิกเพื่อกรองเฉพาะสถานประกอบการที่หมดอายุแล้ว"
        >
          <div className={`text-xs font-bold flex items-center justify-center gap-1.5 ${statusFilter === 'expired' ? 'text-rose-100' : 'text-rose-700'}`}>
            <span className="w-2 h-2 rounded-full bg-rose-500" /> หมดอายุ
          </div>
          <div className={`text-2xl sm:text-3xl font-black mt-1 ${statusFilter === 'expired' ? 'text-white' : 'text-rose-700'}`}>
            {expiredCount}
          </div>
          <div className={`text-[10px] mt-0.5 font-medium ${statusFilter === 'expired' ? 'text-rose-100' : 'text-rose-600'}`}>
            ต้องต่ออายุ ({expiredPct}%)
          </div>
        </div>

        {/* 5. รออนุมัติ */}
        <div
          onClick={() => handleToggleStatusCard('pending')}
          className={`rounded-2xl p-4 text-center border-2 transition-all cursor-pointer shadow-xs ${
            statusFilter === 'pending'
              ? 'bg-gradient-to-br from-indigo-500 to-indigo-700 text-white border-indigo-600 shadow-md scale-[1.02]'
              : 'bg-indigo-50/50 border-indigo-200/80 hover:border-indigo-300'
          }`}
          title="คลิกเพื่อกรองเฉพาะสถานประกอบการที่รออนุมัติคำขอ"
        >
          <div className={`text-xs font-bold flex items-center justify-center gap-1.5 ${statusFilter === 'pending' ? 'text-indigo-100' : 'text-indigo-700'}`}>
            <span>⏳ รออนุมัติ</span>
          </div>
          <div className={`text-2xl sm:text-3xl font-black mt-1 ${statusFilter === 'pending' ? 'text-white' : 'text-indigo-700'}`}>
            {pendingCount}
          </div>
          <div className={`text-[10px] mt-0.5 font-medium ${statusFilter === 'pending' ? 'text-indigo-100' : 'text-indigo-600'}`}>
            รอดำเนินการ ({pendingPct}%)
          </div>
        </div>
      </div>

      {/* 🌟 4. Actionable Urgent Follow-up Alert (แจ้งเตือนเร่งด่วนเมื่อมีใบอนุญาตหมดอายุของปีที่เลือก) */}
      {expiredCount > 0 && statusFilter !== 'expired' && (
        <div className="bg-gradient-to-r from-rose-50 via-amber-50 to-rose-50 border border-rose-200 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-900 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700 shrink-0">
              <AlertTriangle className="w-4 h-4 text-rose-600 animate-bounce" />
            </div>
            <div>
              <span className="font-bold">
                ตรวจพบใบอนุญาตหมดอายุ {expiredCount} แห่ง
              </span>{' '}
              <span className="text-slate-600">
                (ในรอบปี {selectedYear === 'all' ? 'สะสมทุกปี' : `พ.ศ. ${selectedYear}`}) ที่ผู้ประกอบการยังไม่ได้ยื่นคำขอต่ออายุ
              </span>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter('expired')}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer shrink-0 self-start sm:self-center"
          >
            🔍 ดูกลุ่มหมดอายุ ({expiredCount} รายการ)
          </button>
        </div>
      )}

      {/* 🌟 5. Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Filter Header */}
        <div className="p-4 border-b border-slate-200/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50/60">
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาชื่อร้านค้า, เลขที่ใบอนุญาต, ชื่อผู้ประกอบการ, หรือหมู่ที่..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Filter Dropdown */}
            {availableCategories.length > 1 && (
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="text-xs font-medium pl-3 pr-7 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                  title="กรองตามประเภทกิจการ"
                >
                  <option value="all">ทุกประเภทกิจการ ({yearScopedLicenses.length})</option>
                  {availableCategories.map(([cat, count]) => (
                    <option key={cat} value={cat}>
                      {cat.length > 30 ? cat.slice(0, 30) + '...' : cat} ({count})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
              </div>
            )}

            {/* Active Status Filter Indicator */}
            {statusFilter !== 'all' && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                <span>กรองสถานะ: {statusFilter === 'normal' ? 'ปกติ' : statusFilter === 'expiring' ? 'ใกล้หมดอายุ' : statusFilter === 'expired' ? 'หมดอายุ' : 'รออนุมัติ'}</span>
                <button
                  onClick={() => setStatusFilter('all')}
                  className="hover:text-emerald-950 font-bold ml-1 text-slate-400"
                  title="ล้างตัวกรองสถานะ"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5 justify-between sm:justify-end">
            <span className="text-xs text-slate-500 font-medium">
              แสดง <strong className="text-slate-800">{filteredLicenses.length}</strong> จาก {totalCount} รายการ{' '}
              <span className="text-emerald-700 font-semibold">
                ({selectedYear === 'all' ? 'ทุกปี' : `ปี ${selectedYear}`})
              </span>
            </span>

            {/* Export Excel Button */}
            <button
              onClick={handleExportExcel}
              disabled={filteredLicenses.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-40"
              title="ส่งออกรายชื่อและข้อมูลใบอนุญาตเป็นไฟล์ Excel (.xls)"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>ส่งออก Excel</span>
            </button>
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
                <th className="py-3.5 px-4 min-w-[140px]">สถานะ</th>
                <th className="py-3.5 px-4 text-center min-w-[260px]">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLicenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <div className="text-3xl">🔍</div>
                      <div className="font-bold text-slate-700 text-sm">ไม่พบข้อมูลที่ตรงกับเงื่อนไข</div>
                      <p className="text-xs text-slate-400">
                        ลองเปลี่ยนคำค้นหา หรือล้างตัวกรองปีและสถานะ
                      </p>
                      <button
                        onClick={() => {
                          setSearch('');
                          setStatusFilter('all');
                          setSelectedCategory('all');
                        }}
                        className="mt-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        ล้างตัวกรองทั้งหมด
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLicenses.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-3 text-center font-bold text-slate-600">{idx + 1}</td>

                    {/* ชื่อร้าน & ประเภท & วันที่ */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                        <span>{item.businessName}</span>
                        <span className="text-emerald-700 font-semibold text-[11px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                          {item.roundYear || `รอบปี ${item.licenseYear}`}
                        </span>
                      </div>
                      {item.businessCategory && (
                        <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-xs" title={item.businessCategory}>
                          หมวด: {item.businessCategory}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>ผู้ประกอบการ: {item.ownerName || '-'}</span>
                        {item.businessMoo && <span>• ม.{item.businessMoo}</span>}
                        {item.feeAmount && <span>• ฿{Number(item.feeAmount).toLocaleString()} บ.</span>}
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
                      <div className="relative inline-flex items-center">
                        <select
                          value={item.status || 'pending'}
                          onChange={(e) => handleInlineStatusChange(item, e.target.value as LicenseRecord['status'])}
                          className={`text-xs font-bold pl-2.5 pr-6 py-1 rounded-full border cursor-pointer appearance-none focus:outline-none focus:ring-2 shadow-2xs transition-all ${
                            item.status === 'normal'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 focus:ring-emerald-400/30'
                              : item.status === 'expiring'
                              ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 focus:ring-amber-400/30'
                              : item.status === 'expired'
                              ? 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100 focus:ring-rose-400/30'
                              : 'bg-indigo-50 text-indigo-800 border-indigo-300 hover:bg-indigo-100 focus:ring-indigo-400/30'
                          }`}
                          title="คลิกเพื่อเปลี่ยนสถานะใบอนุญาตและบันทึกทันที"
                        >
                          <option value="normal">
                            ✅ ปกติ {item.remainingDays ? `(เหลือ ${item.remainingDays} วัน)` : '(365 วัน)'}
                          </option>
                          <option value="pending">⏳ รออนุมัติ</option>
                          <option value="expiring">⚠️ ใกล้หมดอายุ</option>
                          <option value="expired">❌ หมดอายุคำขอ</option>
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 opacity-70" />
                      </div>
                    </td>

                    {/* เมนูจัดการ */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5">
                        {/* ปุ่มอนุมัติด่วน (ถ้าสถานะเป็น 'pending' รออนุมัติ) */}
                        {item.status === 'pending' && (
                          <button
                            onClick={() => handleQuickApprove(item)}
                            className="px-2.5 py-1 rounded text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center gap-1 cursor-pointer shadow-xs active:scale-95 animate-pulse"
                            title="อนุมัติและออกเลขที่ใบอนุญาตอัตโนมัติ (เริ่มนับ 365 วัน)"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>อนุมัติ</span>
                          </button>
                        )}

                        {/* 1. ปุ่มแก้ไข */}
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

                        {/* 2. รายงานตรวจ */}
                        <button
                          onClick={() => onPrintInspectionReport(item)}
                          className="px-2 py-1 rounded text-xs font-semibold bg-indigo-50 text-indigo-800 hover:bg-indigo-100 transition-colors flex items-center gap-1 cursor-pointer"
                          title="พิมพ์รายงานการตรวจประเมิน (PDF / Sheet / Word)"
                        >
                          <Printer className="w-3 h-3 text-indigo-600" />
                          <span>รายงานตรวจ</span>
                        </button>

                        {/* 3. ออกใบอนุญาต */}
                        <button
                          onClick={() => onIssueLicense(item)}
                          className="px-2 py-1 rounded text-xs font-semibold bg-teal-50 text-teal-800 hover:bg-teal-100 transition-colors flex items-center gap-1 cursor-pointer"
                          title="ตรวจสอบและแก้ไขข้อมูลก่อนออกใบอนุญาต (อภ.2)"
                        >
                          <FileCheck className="w-3 h-3 text-teal-600" />
                          <span>ออกใบอนุญาต</span>
                        </button>

                        {/* ต่ออายุ (ถ้าหมดอายุ หรือใกล้หมดอายุ <= 30 วัน) */}
                        {(item.status === 'expired' || item.status === 'expiring' || (item.remainingDays !== undefined && item.remainingDays <= 30)) && (
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
                ))
              )}
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
              ระบบจะนำเข้าข้อมูลสถานประกอบการและใบอนุญาตจริงของเทศบาลตำบลบางเป้า เพื่อเป็นฐานข้อมูลหลักบน Cloud Firestore
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
