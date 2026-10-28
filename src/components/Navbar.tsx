import React from 'react';
import {
  FileSpreadsheet,
  RefreshCw,
  Settings,
  Menu,
  ExternalLink,
  Flame,
  LogOut,
  Share2,
  Globe,
} from 'lucide-react';
import { GoogleSheetsConfig, MainNavTab, User } from '../types/index.ts';
import { DEFAULT_GAS_URL } from '../services/sheetsSync.ts';

interface NavbarProps {
  currentTab: MainNavTab;
  currentSubTabLabel?: string;
  config: GoogleSheetsConfig;
  currentUser: User | null;
  sidebarOpen?: boolean;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  onOpenSheetsModal: () => void;
  onOpenFirebaseModal?: () => void;
  isSyncing: boolean;
  onQuickSync: () => void;
  onOpenSignerSettings?: () => void;
  onOpenCitizenShareModal?: () => void;
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
  sidebarOpen = true,
  onOpenAuthModal,
  onLogout,
  onOpenSheetsModal,
  onOpenFirebaseModal,
  isSyncing,
  onQuickSync,
  onOpenSignerSettings,
  onOpenCitizenShareModal,
  onToggleSidebar,
}) => {
  const officerName = currentUser?.fullName || 'พันจ่าเอกอานัส เด็นหมาด';
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
        <div className="flex items-center justify-between h-16 sm:h-18 gap-2 sm:gap-3">
          {/* Left: Sidebar Toggle Button + Bangpao Seal + Department Hierarchy + Breadcrumb */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {onToggleSidebar && (
              <button
                type="button"
                onClick={onToggleSidebar}
                aria-label="เปิด/ปิด แถบเมนูด้านข้าง"
                title="เปิด/ปิด แถบเมนูด้านข้าง"
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-emerald-950 bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 lg:bg-emerald-50/90 lg:hover:bg-emerald-100/90 border-2 border-emerald-400/90 lg:border-emerald-300/80 rounded-xl transition-all cursor-pointer shrink-0 shadow-xs active:scale-95 ring-2 ring-emerald-500/20 select-none"
              >
                <Menu className="w-5 h-5 text-emerald-900 shrink-0" />
                <span className="text-xs font-black text-emerald-950 lg:hidden shrink-0">เมนู</span>
              </button>
            )}

            {/* Bangpao Seal in Navbar: shown when sidebar is collapsed or on 2xl ultra-wide screens */}
            {(!sidebarOpen) && (
              <div className="w-10 h-10 rounded-full bg-white p-0.5 items-center justify-center shrink-0 shadow-xs ring-2 ring-emerald-500/40 hidden xl:flex overflow-hidden">
                <img
                  src="/images-Photoroom.png"
                  alt="ตราเทศบาลตำบลบางเป้า"
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            <div className="min-w-0 overflow-hidden">
              <div className="flex items-center gap-2 overflow-hidden">
                <h1 className="text-[14px] sm:text-[15.5px] lg:text-[16px] font-bold text-emerald-950 leading-snug shrink-0 whitespace-nowrap">
                  กองสาธารณสุขและสิ่งแวดล้อม
                </h1>
                <span className="hidden xl:inline-block shrink-0 whitespace-nowrap px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100/90 text-emerald-800 border border-emerald-300/70">
                  เทศบาลตำบลบางเป้า อ.กันตัง จ.ตรัง
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs lg:text-[13px] text-slate-600 font-medium truncate whitespace-nowrap mt-0.5">
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

          {/* Right: Quick Action Controls + Cloud Sync Status + Profile Badge + Logout */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Quick Action: แชร์พอร์ทัลประชาชน (Citizen Portal) */}
            {onOpenCitizenShareModal && (
              <button
                type="button"
                onClick={onOpenCitizenShareModal}
                title="แชร์ลิงก์ศูนย์บริการประชาชนออนไลน์ (Citizen Portal) และ QR Code"
                className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-[13px] font-black rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white shadow-xs transition-all cursor-pointer active:scale-95 ring-1 ring-emerald-300/60 shrink-0"
              >
                <Share2 className="w-4 h-4 text-emerald-100 shrink-0" />
                <span className="hidden 2xl:inline">แชร์พอร์ทัล</span>
                <span className="hidden sm:inline 2xl:hidden">พอร์ทัล</span>
              </button>
            )}

            {/* Quick Action: ตั้งค่าผู้ลงนาม */}
            {onOpenSignerSettings && (
              <button
                type="button"
                onClick={onOpenSignerSettings}
                title="ตั้งค่าผู้บริหารและผู้ลงนามคำร้อง A4"
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-[13px] font-semibold rounded-xl bg-slate-100/90 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 border border-slate-200/90 hover:border-emerald-300 transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
              >
                <Settings className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="hidden 2xl:inline">ผู้ลงนาม</span>
              </button>
            )}

            {/* Quick Action: Firebase & AI Studio */}
            {onOpenFirebaseModal && (
              <button
                type="button"
                onClick={onOpenFirebaseModal}
                title="สถานะ Cloud Firestore (Bangpao Public Health) & Google AI Studio"
                className="hidden sm:flex items-center gap-1.5 px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-[13px] font-semibold rounded-xl bg-amber-50/90 hover:bg-amber-100/90 text-amber-900 border border-amber-300/80 transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
              >
                <Flame className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="hidden 2xl:inline">Firebase</span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="text-[11px] text-emerald-700 hidden 2xl:inline font-semibold">Active</span>
                </span>
              </button>
            )}

            {/* Quick Action: Google Sheets Status */}
            <button
              type="button"
              onClick={onOpenSheetsModal}
              title={`สถานะการเชื่อมต่อ Google Sheets: ${config.autoSync ? 'ซิงค์อัตโนมัติ (เปิดใช้งาน)' : 'ซิงค์แบบกดเอง'}${config.lastSyncTime ? ` | บันทึกล่าสุด: ${new Date(config.lastSyncTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.` : ''}`}
              className="hidden sm:flex items-center gap-1.5 px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-[13px] font-semibold rounded-xl bg-emerald-50/90 hover:bg-emerald-100/90 text-emerald-900 border border-emerald-300/80 transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="hidden 2xl:inline">Sheets</span>
              <span className="inline-flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full shrink-0 ${config.autoSync ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                <span className="text-[11px] text-emerald-700 hidden 2xl:inline font-semibold">
                  {config.autoSync ? 'Auto-Sync' : 'Manual'}
                </span>
              </span>
            </button>

            {/* Quick Action: เปิด Apps Script แท็บใหม่ */}
            {(currentTab === 'hazardous' || currentTab === 'gas_app' || currentTab === 'dashboard' || currentTab === 'establishments') && (
              <button
                type="button"
                onClick={() => window.open(config.appsScriptUrl || DEFAULT_GAS_URL, '_blank')}
                title="เปิดระบบ Google Apps Script ต้นฉบับ 100% ในหน้าต่างแยกใหม่"
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-[13px] font-semibold rounded-xl bg-teal-50/90 hover:bg-teal-100/90 text-teal-900 border border-teal-300/80 transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
              >
                <ExternalLink className="w-4 h-4 text-teal-700 shrink-0" />
                <span className="hidden 2xl:inline">เปิดแท็บใหม่</span>
              </button>
            )}

            {/* Quick Action: Sync Refresh */}
            <button
              type="button"
              onClick={onQuickSync}
              disabled={isSyncing}
              title="รีเฟรชและซิงค์ข้อมูลกับ Google Sheets ทันที"
              className="p-2 sm:p-2.5 text-emerald-700 hover:text-emerald-950 hover:bg-emerald-100/70 rounded-xl transition-colors disabled:opacity-50 cursor-pointer border border-transparent hover:border-emerald-200 shrink-0 active:scale-95"
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
              className={`flex items-center gap-2 p-1 sm:p-1.5 2xl:px-3 2xl:py-1.5 rounded-xl border border-emerald-200/90 bg-emerald-50/70 transition-all text-left shadow-2xs shrink-0 ${
                currentUser?.role === 'admin' ? 'hover:bg-emerald-100/80 cursor-pointer' : 'cursor-default'
              }`}
              title={currentUser?.role === 'admin' ? 'คลิกเพื่อจัดการผู้ใช้ / สลับสิทธิ์ (เฉพาะแอดมิน)' : 'ผู้ปฏิบัติงานปัจจุบัน'}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                {officerName.slice(0, 1)}
              </div>

              <div className="hidden 2xl:block text-left">
                <div className="text-xs sm:text-[13px] font-bold text-slate-900 leading-snug truncate max-w-[130px]">
                  {officerName}
                </div>
                <div className="text-[11px] text-emerald-700 font-medium truncate max-w-[130px]">
                  {officerRole}
                </div>
              </div>
            </div>

            {/* Logout Button in Navbar */}
            <button
              type="button"
              onClick={onLogout}
              title="ออกจากระบบ"
              className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-bold rounded-xl text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span className="hidden 2xl:inline">ออก</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
