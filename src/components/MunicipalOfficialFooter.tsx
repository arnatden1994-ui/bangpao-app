import React from 'react';
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  ExternalLink,
  Shield,
  HeartPulse,
  Stethoscope,
  MessageSquareWarning,
  Building2,
  Settings,
  Sparkles,
  Globe,
  ArrowUp,
  FileSpreadsheet,
  Flame,
  RefreshCw,
  Share2,
} from 'lucide-react';
import { GoogleSheetsConfig, MainNavTab } from '../types/index.ts';

interface MunicipalOfficialFooterProps {
  onNavigateTab?: (tab: MainNavTab) => void;
  onOpenCitizenPortal?: () => void;
  config?: GoogleSheetsConfig;
  isSyncing?: boolean;
  onQuickSync?: () => void;
  onOpenSheetsModal?: () => void;
  onOpenFirebaseModal?: () => void;
  onOpenSignerSettings?: () => void;
}

export const MunicipalOfficialFooter: React.FC<MunicipalOfficialFooterProps> = ({
  onNavigateTab,
  onOpenCitizenPortal,
  config,
  isSyncing = false,
  onQuickSync,
  onOpenSheetsModal,
  onOpenFirebaseModal,
  onOpenSignerSettings,
}) => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-slate-950 text-slate-300 border-t-4 border-emerald-600 print:hidden mt-12 transition-all">
      {/* 1. Top Banner Ribbon: Vision & Municipal Links */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 border-b border-emerald-700/40 py-3.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-emerald-200">
            <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
            <span className="font-semibold text-center sm:text-left">
              วิสัยทัศน์: "มุ่งมั่นพัฒนา เพื่อความเป็นอยู่ที่ดีขึ้นของทุกคน" • เมืองน่าอยู่ ชุมชนสุขภาพดี ทต.บางเป้า
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <a
              href="https://bangpao.go.th/public/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 hover:text-white border border-emerald-400/40 font-bold text-[11px] transition-all cursor-pointer"
            >
              <span>เว็บไซต์หลักเทศบาล bangpao.go.th</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <button
              type="button"
              onClick={scrollToTop}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-[11px] font-semibold border border-slate-700 transition-all cursor-pointer"
              title="เลื่อนขึ้นบนสุด"
            >
              <ArrowUp className="w-3.5 h-3.5" />
              <span>บนสุด</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SYSTEM STATUS & CLOUD TOOLS STRIP (ย้ายมาจากแถบด้านบนตามภาพ 3 -> 4) */}
      {/* ========================================================================= */}
      <div className="bg-slate-900/95 border-b border-slate-800 py-3 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span>ศูนย์จัดการคลาวด์และเครื่องมือระบบ (Cloud & System Tools):</span>
          </div>

          {/* Quick Utility Action Buttons (ย้ายมาจาก Navbar ตามภาพ 3) */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {/* 1. ปุ่มแชร์พอร์ทัลประชาชน */}
            {onOpenCitizenPortal && (
              <button
                type="button"
                onClick={onOpenCitizenPortal}
                title="แชร์ลิงก์ศูนย์บริการประชาชนออนไลน์ (Citizen Portal) และ QR Code"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow-xs transition-all cursor-pointer active:scale-95 border border-emerald-400/50"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
                <span>แชร์พอร์ทัลประชาชน</span>
              </button>
            )}

            {/* 2. ปุ่ม Google Sheets Status */}
            {onOpenSheetsModal && (
              <button
                type="button"
                onClick={onOpenSheetsModal}
                title="ตั้งค่าและสถานะ Google Sheets Sync"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950 hover:bg-emerald-900 text-emerald-300 font-semibold text-xs border border-emerald-500/50 shadow-xs transition-all cursor-pointer active:scale-95"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Sheets</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    config?.autoSync ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                  }`}
                />
              </button>
            )}

            {/* 3. ปุ่ม Firebase Status */}
            {onOpenFirebaseModal && (
              <button
                type="button"
                onClick={onOpenFirebaseModal}
                title="สถานะ Cloud Firestore (Bangpao Public Health)"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-950/80 hover:bg-amber-900 text-amber-200 font-semibold text-xs border border-amber-500/50 shadow-xs transition-all cursor-pointer active:scale-95"
              >
                <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Firebase</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </button>
            )}

            {/* 4. ปุ่ม Sync Refresh */}
            {onQuickSync && (
              <button
                type="button"
                onClick={onQuickSync}
                disabled={isSyncing}
                title="รีเฟรชและซิงค์ข้อมูลกับ Google Sheets ทันที"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-600 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'กำลังซิงค์...' : 'ซิงค์ข้อมูล'}</span>
              </button>
            )}

            {/* 5. ปุ่มตั้งค่าผู้ลงนาม A4 */}
            {onOpenSignerSettings && (
              <button
                type="button"
                onClick={onOpenSignerSettings}
                title="ตั้งค่าผู้บริหารและผู้ลงนามคำร้อง A4"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition-all cursor-pointer active:scale-95"
              >
                <Settings className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>ผู้ลงนามเอกสาร A4</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Col 1: Official Emblem & Identity */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img
                src="/municipal/bangpao_official_logo.png"
                alt="ตราสัญลักษณ์เทศบาลตำบลบางเป้า"
                className="w-14 h-14 object-contain shrink-0 filter drop-shadow-md"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images-Photoroom.png';
                }}
              />
              <div>
                <h4 className="font-black text-white text-base tracking-tight leading-snug">
                  เทศบาลตำบลบางเป้า
                </h4>
                <p className="text-xs text-emerald-400 font-bold">
                  กองสาธารณสุขและสิ่งแวดล้อม
                </p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                  Bang Pao Municipality
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed font-light">
              ระบบสารสนเทศเพื่อการบริหารงานสาธารณสุขและสิ่งแวดล้อม เทศบาลตำบลบางเป้า อำเภอกันตัง จังหวัดตรัง เชื่อมโยง 4 มิติงานบริการเพื่อคุณภาพชีวิตที่ดีของประชาชน
            </p>

            <div className="pt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-950/80 border border-emerald-600/40 text-emerald-300 text-xs font-semibold">
                <span>นายละดม เชื้อช่วย</span>
                <span className="text-slate-400">• นายกเทศมนตรีตำบลบางเป้า</span>
              </span>
            </div>
          </div>

          {/* Col 2: Official Contact Info */}
          <div className="space-y-3.5">
            <h5 className="font-bold text-white text-sm border-b border-slate-800 pb-2 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span>ที่ทำการเทศบาลตำบลบางเป้า</span>
            </h5>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  เลขที่ 109 หมู่ที่ 6 ถนนควนทองสีห์ ตำบลบางเป้า อำเภอกันตัง จังหวัดตรัง 92110
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>โทรศัพท์: 0-7529-2855 (โทรสาร: 0-7529-2857)</span>
              </div>

              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>bangpaohealthy@gmail.com</span>
              </div>

              <div className="flex items-start gap-2.5 pt-1 text-[11px] text-slate-400">
                <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  วันและเวลาทำการ: วันจันทร์ - วันศุกร์ เวลา 08.30 - 16.30 น. (หยุดวันเสาร์-วันอาทิตย์ และวันหยุดนักขัตฤกษ์)
                </span>
              </div>
            </div>
          </div>

          {/* Col 3: Core Service Systems */}
          <div className="space-y-3.5">
            <h5 className="font-bold text-white text-sm border-b border-slate-800 pb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>ระบบงานบริการสาธารณสุข 6 ระบบ</span>
            </h5>

            <ul className="space-y-1.5 text-xs">
              {[
                { tab: 'hazardous' as const, label: '1. กิจการอันตรายต่อสุขภาพ (อภ.2)', icon: Shield },
                { tab: 'nhso_ltc' as const, label: '2. สปสช. & LTC ดูแลผู้สูงอายุ', icon: HeartPulse },
                { tab: 'equipment' as const, label: '3. ระบบยืม-คืนอุปกรณ์การแพทย์', icon: Stethoscope },
                { tab: 'petitions' as const, label: '4. ยื่นคำร้อง & รถสูบสิ่งปฏิกูล', icon: MessageSquareWarning },
                { tab: 'nhso' as const, label: '5. โครงการ สปสช. (กองทุนตำบล)', icon: Building2 },
                { tab: 'settings' as const, label: '6. ตั้งค่าผู้ใช้งาน & ระบบแจ้งเตือน LINE', icon: Settings },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.tab}>
                    <button
                      type="button"
                      onClick={() => onNavigateTab && onNavigateTab(item.tab)}
                      className="group flex items-center gap-2 text-slate-400 hover:text-emerald-300 transition-colors cursor-pointer text-left w-full py-0.5"
                    >
                      <Icon className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Col 4: Citizen Portal & Public Links */}
          <div className="space-y-3.5">
            <h5 className="font-bold text-white text-sm border-b border-slate-800 pb-2 flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>บริการประชาชนออนไลน์ (E-Service)</span>
            </h5>

            <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-600/30 space-y-2.5">
              <p className="text-xs text-slate-300 leading-relaxed font-light">
                ประชาชนในเขตตำบลบางเป้า สามารถยื่นคำร้องสูบส้วม ร้องเรียนเหตุรำคาญ และขอยืมอุปกรณ์การแพทย์ได้ด้วยตนเอง
              </p>

              <div className="space-y-1.5 pt-1">
                <a
                  href="https://bangpao-app.vercel.app/?portal=citizen"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-3 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-emerald-400 hover:from-amber-300 hover:to-emerald-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>เข้าสู่ Citizen Portal (ประชาชน)</span>
                </a>

                <a
                  href="https://bangpao.go.th/public/calendarnew/data/index/menu/5093/ym/2026-11"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white border border-white/10 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>ปฏิทินเทศบาลบน bangpao.go.th</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Copyright & Standards Notice */}
        <div className="mt-10 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            © 2569 กองสาธารณสุขและสิ่งแวดล้อม เทศบาลตำบลบางเป้า อ.กันตัง จ.ตรัง • สงวนลิขสิทธิ์
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span>มาตรฐาน พ.ร.บ.การสาธารณสุข พ.ศ. 2535</span>
            <span>•</span>
            <span>สปสช. กปท. & LTC</span>
            <span>•</span>
            <span className="font-mono text-emerald-500">v2.5.0-cloud</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
