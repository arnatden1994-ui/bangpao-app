import React from 'react';
import {
  FileSpreadsheet,
  RefreshCw,
  Settings,
  Menu,
  ExternalLink,
  Flame,
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
  config,
  currentUser,
  onOpenAuthModal,
  onOpenSheetsModal,
  onOpenFirebaseModal,
  isSyncing,
  onQuickSync,
  onOpenSignerSettings,
  onToggleSidebar,
}) => {
  const officerName = currentUser?.fullName || 'น.ส. พิมลภัส ศรีสุข';
  const officerRole = currentUser?.roleTitle || 'นายตรวจ / เจ้าพนักงานสาธารณสุข';

  return (
    <header className="bg-gradient-to-r from-[#063f31] via-[#074737] to-[#043327] text-white sticky top-0 z-40 shadow-md border-b border-emerald-600/40 backdrop-blur-md">
      <div className="w-full px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18 gap-3">
          {/* Left: Sidebar Toggle Button */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className="p-2 text-emerald-200 hover:text-white hover:bg-emerald-800/80 rounded-xl transition-colors cursor-pointer shrink-0"
                title="เปิด/ปิด แถบเมนูด้านข้าง"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Right: [ตั้งค่าผู้ลงนาม] | [Google Sheets Online] | [เปิดแท็บใหม่] | [รีเฟรช] | โปรไฟล์เจ้าหน้าที่ */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Quick Action: ตั้งค่าผู้ลงนาม */}
            {onOpenSignerSettings && (
              <button
                onClick={onOpenSignerSettings}
                title="ตั้งค่าผู้บริหารและผู้ลงนามคำร้อง A4"
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-[13px] font-bold rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <Settings className="w-4 h-4 text-emerald-300" />
                <span className="hidden md:inline">ตั้งค่าผู้ลงนาม</span>
              </button>
            )}

            {/* Quick Action: Firebase & AI Studio */}
            {onOpenFirebaseModal && (
              <button
                onClick={onOpenFirebaseModal}
                title="สถานะ Cloud Firestore (Bangpao Public Health) & Google AI Studio"
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-[13px] font-bold rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white border border-amber-400/50 transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <Flame className="w-4 h-4 text-yellow-300" />
                <span className="hidden sm:inline">Firebase Cloud</span>
                <span className="inline-flex items-center gap-1 ml-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] text-amber-200 hidden lg:inline font-mono font-bold">🟢 Active</span>
                </span>
              </button>
            )}

            {/* Quick Action: Google Sheets Status */}
            <button
              onClick={onOpenSheetsModal}
              title="ตรวจสอบสถานะการเชื่อมต่อ Google Sheets & Apps Script"
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-[13px] font-bold rounded-xl bg-emerald-800/90 hover:bg-emerald-700 text-white border border-emerald-500/50 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
              <span className="hidden sm:inline">Google Sheets</span>
              <span className="inline-flex items-center gap-1 ml-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] text-emerald-200 hidden lg:inline font-mono font-bold">🟢 Online</span>
              </span>
            </button>

            {/* Quick Action: เปิด Apps Script แท็บใหม่ */}
            {(currentTab === 'hazardous' || currentTab === 'gas_app' || currentTab === 'dashboard' || currentTab === 'establishments') && (
              <button
                onClick={() => window.open(config.appsScriptUrl || 'https://script.google.com/macros/s/AKfycbylNXKtc6ldvAA6BnxUHmosX4hxhLM_a3uXw_A6xn-f18yar0RF_uZaj-ns6Yrlgax8/exec', '_blank')}
                title="เปิดระบบ Google Apps Script ต้นฉบับ 100% ในหน้าต่างแยกใหม่"
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-[13px] font-bold rounded-xl bg-teal-800/90 hover:bg-teal-700 text-white border border-teal-500/50 transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <ExternalLink className="w-4 h-4 text-teal-300" />
                <span className="hidden md:inline">เปิดแท็บใหม่</span>
              </button>
            )}

            {/* Quick Action: Sync Refresh */}
            <button
              onClick={onQuickSync}
              disabled={isSyncing}
              title="รีเฟรชและซิงค์ข้อมูลกับ Google Sheets ทันที"
              className="p-2 sm:p-2.5 text-emerald-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors disabled:opacity-50 cursor-pointer border border-transparent hover:border-emerald-600/40"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>

            {/* Officer Profile Badge */}
            <div
              onClick={onOpenAuthModal}
              className="flex items-center gap-2 p-1.5 sm:px-3.5 sm:py-2 rounded-xl border border-emerald-600/50 bg-emerald-900/70 hover:bg-emerald-800/90 transition-all text-left shadow-xs cursor-pointer"
              title="คลิกเพื่อสลับผู้ใช้งาน / ดูโปรไฟล์เจ้าหน้าที่"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-300 text-emerald-950 font-black flex items-center justify-center text-xs shrink-0 shadow-inner">
                {officerName.slice(0, 1)}
              </div>

              <div className="hidden sm:block text-left">
                <div className="text-xs sm:text-[13px] font-bold text-white leading-tight truncate max-w-[140px]">
                  {officerName}
                </div>
                <div className="text-[11px] text-emerald-300 font-medium truncate max-w-[140px] mt-0.5">
                  {officerRole}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
