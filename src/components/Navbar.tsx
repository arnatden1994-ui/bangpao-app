import React from 'react';
import {
  FileSpreadsheet,
  RefreshCw,
  Settings,
  Menu,
  ExternalLink,
  Flame,
  LogOut,
} from 'lucide-react';
import { GoogleSheetsConfig, MainNavTab, User } from '../types/index.ts';

interface NavbarProps {
  currentTab: MainNavTab;
  currentSubTabLabel?: string;
  config: GoogleSheetsConfig;
  currentUser: User | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  onOpenSheetsModal: () => void;
  onOpenFirebaseModal?: () => void;
  isSyncing: boolean;
  onQuickSync: () => void;
  onOpenSignerSettings?: () => void;
  onToggleSidebar?: () => void;
  badgeCounts?: {
    petitions?: number;
    expiringLicenses?: number;
    activeLoans?: number;
    ltcPatients?: number;
  };
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  currentSubTabLabel,
  config,
  currentUser,
  onOpenAuthModal,
  onLogout,
  onOpenSheetsModal,
  onOpenFirebaseModal,
  isSyncing,
  onQuickSync,
  onOpenSignerSettings,
  onToggleSidebar,
}) => {
  const officerName = currentUser?.fullName || 'พันจ่าเอกอานัส เด่นหมาด';
  const officerRole = currentUser?.roleTitle || 'เจ้าพนักงานสาธารณสุขชำนาญงาน (นายตรวจ)';

  const tabTitleMap: Record<MainNavTab, string> = {
    overview: '🏠 แดชบอร์ดหลักทุกระบบ',
    hazardous: '1. 🛡️ กิจการอันตรายต่อสุขภาพ',
    gas_app: '1. 🛡️ กิจการอันตรายต่อสุขภาพ (Apps Script)',
    dashboard: '1. 🛡️ กิจการอันตรายต่อสุขภาพ (แดชบอร์ด)',
    establishments: '1. 🛡️ กิจการอันตรายต่อสุขภาพ (ตรวจประเมิน)',
    nhso_ltc: '2. 📦 ระบบแจกจ่ายโครงการ สปสช. & LTC',
    ltc: '2. 📦 การดูแลระยะยาว LTC',
    equipment: '3. 🩺 ระบบบริการยืม-คืนอุปกรณ์ทางการแพทย์',
    petitions: '4. 📋 ระบบยื่นคำร้องและบริการประชาชน',
    reports: '4. 📋 พิมพ์เอกสารราชการเสนอผู้บริหาร',
    inspections: '1. 🛡️ บันทึกการตรวจประเมิน',
    nhso: '5. 🏥 โครงการ สปสช. (กองทุน)',
    settings: '6. ⚙️ ระบบตั้งค่าผู้ใช้งานทุกระบบ',
  };

  return (
    <header className="bg-white/85 backdrop-blur-xl text-slate-800 sticky top-0 z-40 shadow-xs border-b border-emerald-200/80">
      <div className="w-full px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18 gap-3">
          {/* Left: Sidebar Toggle Button + Bangpao Seal + Department Hierarchy + Breadcrumb */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className="p-2 text-emerald-700 hover:text-emerald-950 hover:bg-emerald-100/80 rounded-xl transition-colors cursor-pointer shrink-0"
                title="เปิด/ปิด แถบเมนูด้านข้าง"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            <div className="w-10 h-10 rounded-full bg-white p-0.5 items-center justify-center shrink-0 shadow-xs ring-2 ring-emerald-500/40 hidden xl:flex overflow-hidden">
              <img
                src="/images-Photoroom.png"
                alt="ตราเทศบาลตำบลบางเป้า"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="min-w-0 overflow-hidden">
              <div className="flex items-center gap-2 overflow-hidden">
                <h1 className="text-[14.5px] sm:text-[16px] font-bold text-emerald-950 leading-snug truncate whitespace-nowrap">
                  กองสาธารณสุขและสิ่งแวดล้อม
                </h1>
                <span className="hidden 2xl:inline-block shrink-0 whitespace-nowrap px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100/90 text-emerald-800 border border-emerald-300/70">
                  เทศบาลตำบลบางเป้า อ.กันตัง จ.ตรัง
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs sm:text-[13px] text-slate-600 font-medium truncate whitespace-nowrap mt-0.5">
                <span className="text-emerald-700 font-semibold truncate">{tabTitleMap[currentTab] || 'ระบบสาธารณสุข'}</span>
                {currentSubTabLabel && (
                  <>
                    <span className="text-slate-400 shrink-0">/</span>
                    <span className="text-slate-800 font-semibold truncate">{currentSubTabLabel}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: [ตั้งค่าผู้ลงนาม] | [Firebase] | [Google Sheets] | [เปิดแท็บใหม่] | [รีเฟรช] | โปรไฟล์เจ้าหน้าที่ */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Quick Action: ตั้งค่าผู้ลงนาม */}
            {onOpenSignerSettings && (
              <button
                onClick={onOpenSignerSettings}
                title="ตั้งค่าผู้บริหารและผู้ลงนามคำร้อง A4"
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-[13px] font-semibold rounded-xl bg-slate-100/90 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 border border-slate-200/90 hover:border-emerald-300 transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                <Settings className="w-4 h-4 text-emerald-600" />
                <span className="hidden md:inline">ตั้งค่าผู้ลงนาม</span>
              </button>
            )}

            {/* Quick Action: Firebase & AI Studio */}
            {onOpenFirebaseModal && (
              <button
                onClick={onOpenFirebaseModal}
                title="สถานะ Cloud Firestore (Bangpao Public Health) & Google AI Studio"
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-[13px] font-semibold rounded-xl bg-amber-50/90 hover:bg-amber-100/90 text-amber-900 border border-amber-300/80 transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                <Flame className="w-4 h-4 text-amber-600" />
                <span className="hidden sm:inline">Firebase Cloud</span>
                <span className="inline-flex items-center gap-1 ml-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] text-emerald-700 hidden lg:inline font-semibold">Active</span>
                </span>
              </button>
            )}

            {/* Quick Action: Google Sheets Status */}
            <button
              onClick={onOpenSheetsModal}
              title="ตรวจสอบสถานะการเชื่อมต่อ Google Sheets & Apps Script"
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-[13px] font-semibold rounded-xl bg-emerald-50/90 hover:bg-emerald-100/90 text-emerald-900 border border-emerald-300/80 transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Google Sheets</span>
              <span className="inline-flex items-center gap-1 ml-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] text-emerald-700 hidden lg:inline font-semibold">Online</span>
              </span>
            </button>

            {/* Quick Action: เปิด Apps Script แท็บใหม่ */}
            {(currentTab === 'hazardous' || currentTab === 'gas_app' || currentTab === 'dashboard' || currentTab === 'establishments') && (
              <button
                onClick={() => window.open(config.appsScriptUrl || 'https://script.google.com/macros/s/AKfycbylNXKtc6ldvAA6BnxUHmosX4hxhLM_a3uXw_A6xn-f18yar0RF_uZaj-ns6Yrlgax8/exec', '_blank')}
                title="เปิดระบบ Google Apps Script ต้นฉบับ 100% ในหน้าต่างแยกใหม่"
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-[13px] font-semibold rounded-xl bg-teal-50/90 hover:bg-teal-100/90 text-teal-900 border border-teal-300/80 transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                <ExternalLink className="w-4 h-4 text-teal-700" />
                <span className="hidden md:inline">เปิดแท็บใหม่</span>
              </button>
            )}

            {/* Quick Action: Sync Refresh */}
            <button
              onClick={onQuickSync}
              disabled={isSyncing}
              title="รีเฟรชและซิงค์ข้อมูลกับ Google Sheets ทันที"
              className="p-2 sm:p-2.5 text-emerald-700 hover:text-emerald-950 hover:bg-emerald-100/70 rounded-xl transition-colors disabled:opacity-50 cursor-pointer border border-transparent hover:border-emerald-200"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>

            {/* Officer Profile Badge */}
            <div
              onClick={() => {
                if (currentUser?.role === 'admin') {
                  onOpenAuthModal();
                }
              }}
              className={`flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-emerald-200/90 bg-emerald-50/70 transition-all text-left shadow-2xs ${
                currentUser?.role === 'admin' ? 'hover:bg-emerald-100/80 cursor-pointer' : 'cursor-default'
              }`}
              title={currentUser?.role === 'admin' ? 'คลิกเพื่อจัดการผู้ใช้ / สลับสิทธิ์ (เฉพาะแอดมิน)' : 'ผู้ปฏิบัติงานปัจจุบัน'}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                {officerName.slice(0, 1)}
              </div>

              <div className="hidden sm:block text-left">
                <div className="text-xs sm:text-[13px] font-bold text-slate-900 leading-snug truncate max-w-[150px]">
                  {officerName}
                </div>
                <div className="text-[11.5px] text-emerald-700 font-medium truncate max-w-[150px]">
                  {officerRole}
                </div>
              </div>
            </div>

            {/* Logout Button in Navbar */}
            <button
              onClick={onLogout}
              title="ออกจากระบบ"
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-bold rounded-xl text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden md:inline">ออกจากระบบ</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
