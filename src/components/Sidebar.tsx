import React, { useState } from 'react';
import {
  LayoutDashboard,
  Shield,
  Package,
  Stethoscope,
  MessageSquareWarning,
  Settings,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  FileCheck2,
  ClipboardCheck,
  Building2,
  Globe,
  MapPin,
  HeartPulse,
  Truck,
  RotateCcw,
  Users,
  Award,
  FileSpreadsheet,
  Stamp,
  Printer,
  Search,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { MainNavTab, User } from '../types/index.ts';

interface SidebarProps {
  currentTab: MainNavTab;
  activeSubTabs: {
    hazardous?: 'dashboard' | 'form';
    nhso_ltc?: 'route' | 'register' | 'inventory' | 'nhso';
    equipment?: 'register' | 'loans' | 'inventory';
    petitions?: 'general' | 'sewage' | 'print' | 'tracking';
    settings?: 'signers' | 'users' | 'approvers' | 'sheets';
  };
  onNavigate: (tab: MainNavTab, subTab?: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  badgeCounts: {
    petitions: number;
    expiringLicenses: number;
    activeLoans: number;
    ltcPatients: number;
  };
  currentUser: User | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  activeSubTabs,
  onNavigate,
  isOpen,
  onToggle,
  badgeCounts,
  currentUser,
  onOpenAuthModal,
  onLogout,
}) => {
  // Track open accordion sections (default expand all)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    hazardous: true,
    nhso_ltc: true,
    equipment: true,
    petitions: true,
    settings: true,
  });

  const toggleSection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // 6 Main Categories strictly ordered:
  // 1 แดชบอร์ดหลักทุกระบบ
  // 2. กิจการอันตรายต่อสุขภาพ (Apps Script 100%)
  // 3. 📦 ระบบแจกจ่ายโครงการ สปสช. & การดูแลระยะยาว (LTC)
  // 4. 🩺 ระบบบริการยืม-คืนอุปกรณ์ทางการแพทย์
  // 5. 📋 ระบบยื่นคำร้องและบริการประชาชน
  // 6. ⚙️ ระบบตั้งค่าหน้าผู้ใช้งานทุกระบบ
  const navModules = [
    {
      id: 'overview' as MainNavTab,
      number: '1',
      title: 'แดชบอร์ดหลักทุกระบบ',
      subtitle: 'ศูนย์สั่งการสถิติ & ติดตามภาพรวม',
      icon: LayoutDashboard,
      badge: null,
      numberColor: 'bg-sky-500/20 text-sky-300 border-sky-400/40',
      subItems: [],
    },
    {
      id: 'hazardous' as MainNavTab,
      number: '2',
      title: 'กิจการอันตรายต่อสุขภาพ',
      subtitle: 'ตรวจประเมิน & ออกใบอนุญาต อภ.2',
      icon: Shield,
      badge: badgeCounts.expiringLicenses > 0 ? `${badgeCounts.expiringLicenses}` : null,
      badgeColor: 'bg-amber-500 text-white',
      numberColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
      subItems: [
        {
          id: 'dashboard',
          title: '📊 แดชบอร์ดติดตามผลอนุมัติ',
          desc: 'ติดตามผลอนุมัติ & พิมพ์รายงาน/ใบอนุญาต',
          icon: FileCheck2,
        },
        {
          id: 'form',
          title: '📝 ฟอร์มตรวจประเมินสุขลักษณะ',
          desc: 'แบบฟอร์มตรวจประเมิน 3 ขั้นตอน เกณฑ์ 25 ข้อ',
          icon: ClipboardCheck,
        },
      ],
    },
    {
      id: 'nhso_ltc' as MainNavTab,
      number: '3',
      title: 'ระบบแจกจ่าย สปสช. & LTC',
      subtitle: 'การดูแลระยะยาว & นำทางแจกของ',
      icon: Package,
      badge: badgeCounts.ltcPatients > 0 ? `${badgeCounts.ltcPatients}` : null,
      badgeColor: 'bg-pink-500 text-white',
      numberColor: 'bg-rose-500/20 text-rose-300 border-rose-400/40',
      subItems: [
        {
          id: 'route',
          title: '🗺️ ระบบนำทางแจกจ่ายของ',
          desc: 'Smart Route Optimizer แผนที่บ้าน',
          icon: Truck,
        },
        {
          id: 'register',
          title: '📝 หน้าลงทะเบียนผู้ป่วย LTC',
          desc: 'ขึ้นทะเบียนผู้ป่วยติดเตียง/ติดบ้าน',
          icon: HeartPulse,
        },
        {
          id: 'inventory',
          title: '📦 หน้าคลังอุปกรณ์ LTC',
          desc: 'ผ้าอ้อมผู้ใหญ่ & แผ่นรองซับ',
          icon: Package,
        },
        {
          id: 'nhso',
          title: '🏥 โครงการ สปสช. (กองทุน)',
          desc: 'เอกสารแนบ 6 & มติกรรมการ',
          icon: Building2,
        },
      ],
    },
    {
      id: 'equipment' as MainNavTab,
      number: '4',
      title: 'ระบบบริการยืม-คืนอุปกรณ์',
      subtitle: 'อุปกรณ์ทางการแพทย์ & สัญญาขอยืม',
      icon: Stethoscope,
      badge: badgeCounts.activeLoans > 0 ? `${badgeCounts.activeLoans}` : null,
      badgeColor: 'bg-indigo-500 text-white',
      numberColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/40',
      subItems: [
        {
          id: 'loans',
          title: '🔄 ระบบยืม-คืน & สัญญา A4',
          desc: 'รายการยืมอุปกรณ์ & สัญญาตราครุฑ',
          icon: RotateCcw,
        },
        {
          id: 'register',
          title: '📝 หน้าลงทะเบียนผู้ยืม',
          desc: 'บันทึกขอยืมอุปกรณ์ชิ้นใหม่',
          icon: ClipboardCheck,
        },
        {
          id: 'inventory',
          title: '🦼 คลังอุปกรณ์ทางการแพทย์',
          desc: 'เตียง, ถังออกซิเจน, วีลแชร์',
          icon: Stethoscope,
        },
      ],
    },
    {
      id: 'petitions' as MainNavTab,
      number: '5',
      title: 'ระบบยื่นคำร้อง & บริการประชาชน',
      subtitle: 'เหตุรำคาญ & สูบสิ่งปฏิกูล ทต.บางเป้า',
      icon: MessageSquareWarning,
      badge: badgeCounts.petitions > 0 ? `${badgeCounts.petitions}` : null,
      badgeColor: 'bg-amber-400 text-slate-950 font-bold',
      numberColor: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
      subItems: [
        {
          id: 'general',
          title: '📑 คำร้องทั่วไป & เหตุรำคาญ',
          desc: 'มลพิษ, กลิ่นเหม็น, เสียงรบกวน',
          icon: MessageSquareWarning,
        },
        {
          id: 'sewage',
          title: '🚛 คำร้องขอดูดส้วม / สิ่งปฏิกูล',
          desc: 'บริการสูบส้วมเทศบาลตำบลบางเป้า',
          icon: Truck,
        },
        {
          id: 'print',
          title: '🖨️ หน้าปริ้นเสนอผู้บริหาร A4',
          desc: 'พิมพ์บันทึกข้อความตราครุฑ',
          icon: Printer,
        },
        {
          id: 'tracking',
          title: '🔍 หน้าติดตามผลคำร้อง',
          desc: 'ค้นหาด้วย Tracking Code',
          icon: Search,
        },
      ],
    },
    {
      id: 'settings' as MainNavTab,
      number: '6',
      title: 'ระบบตั้งค่าหน้าผู้ใช้งานทุกระบบ',
      subtitle: 'ผู้ลงนาม, สิทธิ์, ผังอนุมัติ & Cloud',
      icon: Settings,
      badge: null,
      numberColor: 'bg-purple-500/20 text-purple-300 border-purple-400/40',
      subItems: [
        {
          id: 'signers',
          title: '✍️ ตั้งค่าผู้เซ็นเอกสารทุกระบบ',
          desc: 'ผอ.กอง, ปลัด, นายก, พขร.',
          icon: Stamp,
        },
        {
          id: 'users',
          title: '👤 ทะเบียนใช้งาน & สลับผู้ใช้',
          desc: 'จัดการเจ้าหน้าที่ & สิทธิ์เข้าถึง',
          icon: Users,
        },
        {
          id: 'approvers',
          title: '⚖️ ตั้งค่าผู้มีอำนาจพิจารณา',
          desc: 'คำสั่งมอบหมาย & ลำดับอนุมัติ',
          icon: Award,
        },
        {
          id: 'sheets',
          title: '📊 เชื่อมต่อ Google Sheets',
          desc: 'Apps Script URL & Cloud Sync',
          icon: FileSpreadsheet,
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onToggle}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen z-50 flex flex-col bg-gradient-to-b from-[#04241b] via-[#031d16] to-[#02130e] border-r border-emerald-800/40 text-white transition-all duration-300 ease-in-out shrink-0 select-none shadow-2xl lg:shadow-none ${
          isOpen ? 'w-76 sm:w-82 translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-20'
        }`}
      >
        {/* Brand & Municipal Identity Header */}
        <div className="h-18 px-4 flex items-center justify-between border-b border-emerald-700/40 bg-gradient-to-r from-[#063f31] to-[#084c3c] shrink-0 shadow-sm">
          <div className="flex items-center gap-3 overflow-hidden min-w-0">
            <div className="w-11 h-11 rounded-full bg-white p-0.5 shrink-0 shadow-md flex items-center justify-center border border-emerald-300/40 overflow-hidden">
              <img
                src="/bangpao-logo.png"
                alt="ตราเทศบาลตำบลบางเป้า จังหวัดตรัง"
                className="w-full h-full object-contain"
              />
            </div>
            {isOpen && (
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold text-[14px] sm:text-[15px] text-white tracking-tight truncate leading-tight">
                  ทต.บางเป้า อ.กันตัง จ.ตรัง
                </span>
                <span className="text-xs text-emerald-200/90 font-medium truncate mt-0.5">
                  กองสาธารณสุขและสิ่งแวดล้อม
                </span>
              </div>
            )}
          </div>

          {/* Toggle / Collapse Button */}
          <button
            onClick={onToggle}
            className="p-1.5 text-emerald-200 hover:text-white hover:bg-emerald-800/80 rounded-xl transition-colors cursor-pointer shrink-0"
            title={isOpen ? 'ย่อแถบเมนู' : 'ขยายแถบเมนู'}
          >
            {isOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>

        {/* Scrollable Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-3.5 space-y-2 scrollbar-thin scrollbar-thumb-emerald-900/60 scrollbar-track-transparent">
          {isOpen && (
            <div className="px-3 py-1 text-xs font-bold text-emerald-400/90 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>เมนูหลัก 6 ระบบงานสาธารณสุข</span>
            </div>
          )}

          {navModules.map((mod) => {
            const Icon = mod.icon;
            const isTabActive = currentTab === mod.id;
            const hasSub = mod.subItems && mod.subItems.length > 0;
            const isExpanded = expandedSections[mod.id] ?? true;

            return (
              <div key={mod.id} className="space-y-1">
                {/* Main Module Button */}
                <div
                  onClick={() => {
                    if (hasSub) {
                      const firstSub = mod.subItems[0]?.id;
                      onNavigate(mod.id, firstSub);
                      if (!isExpanded) {
                        setExpandedSections((prev) => ({ ...prev, [mod.id]: true }));
                      }
                    } else {
                      onNavigate(mod.id);
                    }
                  }}
                  title={!isOpen ? `${mod.number}. ${mod.title}` : undefined}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-[13px] sm:text-sm font-bold transition-all cursor-pointer group relative ${
                    isTabActive
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950/50 ring-1 ring-emerald-300/40'
                      : 'text-emerald-100 hover:bg-emerald-900/60 hover:text-white'
                  }`}
                >
                  <div className="relative shrink-0">
                    <Icon
                      className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                        isTabActive ? 'text-white' : 'text-emerald-300'
                      }`}
                    />
                    <span
                      className={`absolute -top-1.5 -right-2 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center border shadow-xs ${
                        mod.numberColor || 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                      }`}
                    >
                      {mod.number}
                    </span>
                  </div>

                  {isOpen && (
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] sm:text-sm font-bold text-white tracking-tight">{mod.title}</span>
                      </div>
                      <div className="text-xs text-emerald-200/80 font-normal truncate mt-0.5">
                        {mod.subtitle}
                      </div>
                    </div>
                  )}

                  {isOpen && mod.badge && (
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full shrink-0 font-extrabold ${
                        mod.badgeColor || 'bg-emerald-800 text-white'
                      }`}
                    >
                      {mod.badge}
                    </span>
                  )}

                  {isOpen && hasSub && (
                    <button
                      onClick={(e) => toggleSection(mod.id, e)}
                      className="p-1 hover:bg-black/20 rounded-lg transition-colors text-emerald-300"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  )}

                  {/* Flyout Tooltip for Collapsed Sidebar */}
                  {!isOpen && (
                    <div className="absolute left-full ml-3 px-3.5 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-2xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 min-w-[210px] border border-emerald-700">
                      <div className="font-bold text-emerald-300 text-sm">
                        {mod.number}. {mod.title}
                      </div>
                      <div className="text-xs text-slate-300 mt-0.5">{mod.subtitle}</div>
                      {hasSub && (
                        <div className="mt-2 pt-2 border-t border-slate-800 space-y-1 text-xs text-slate-200">
                          {mod.subItems.map((s) => (
                            <div key={s.id} className="truncate">
                              • {s.title}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Sub-menu Items (Expanded View) */}
                {isOpen && hasSub && isExpanded && (
                  <div className="pl-3 pr-1 py-1 space-y-1.5 ml-5 border-l-2 border-emerald-600/50">
                    {mod.subItems.map((sub) => {
                      let isSubActive = false;
                      if (mod.id === 'hazardous') {
                        isSubActive = isTabActive && (activeSubTabs.hazardous || 'dashboard') === sub.id;
                      } else if (mod.id === 'nhso_ltc') {
                        isSubActive = isTabActive && (activeSubTabs.nhso_ltc || 'route') === sub.id;
                      } else if (mod.id === 'equipment') {
                        isSubActive = isTabActive && (activeSubTabs.equipment || 'loans') === sub.id;
                      } else if (mod.id === 'petitions') {
                        isSubActive = isTabActive && (activeSubTabs.petitions || 'general') === sub.id;
                      } else if (mod.id === 'settings') {
                        isSubActive = isTabActive && (activeSubTabs.settings || 'signers') === sub.id;
                      }

                      return (
                        <button
                          key={sub.id}
                          onClick={() => {
                            onNavigate(mod.id, sub.id);
                            if (window.innerWidth < 1024) onToggle();
                          }}
                          className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs sm:text-[13px] font-semibold transition-all cursor-pointer text-left ${
                            isSubActive
                              ? 'bg-gradient-to-r from-emerald-600/90 to-teal-700/90 text-white font-bold shadow-xs ring-1 ring-emerald-300/40 pl-3.5'
                              : 'text-emerald-100/90 hover:bg-emerald-800/40 hover:text-white'
                          }`}
                        >
                          <span className="truncate">{sub.title}</span>
                          {isSubActive && (
                            <span className="w-2 h-2 rounded-full bg-emerald-300 shrink-0 shadow-xs" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* User Profile Card & Signout at Bottom */}
        <div className="p-3.5 border-t border-emerald-800/40 bg-[#031d16] shrink-0 shadow-lg">
          {currentUser ? (
            <div className="flex items-center justify-between gap-2">
              <div
                onClick={onOpenAuthModal}
                className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer hover:opacity-90 transition-opacity"
                title="คลิกเพื่อสลับผู้ใช้งาน / แก้ไขโปรไฟล์"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-600 to-teal-500 border border-emerald-300/60 flex items-center justify-center font-extrabold text-sm text-white shrink-0 shadow-md">
                  {currentUser.fullName ? currentUser.fullName[0] : 'U'}
                </div>
                {isOpen && (
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-white truncate leading-tight">
                      {currentUser.fullName}
                    </span>
                    <span className="text-xs text-emerald-300 font-medium truncate mt-0.5">
                      {currentUser.roleTitle || currentUser.role}
                    </span>
                  </div>
                )}
              </div>

              {isOpen && (
                <button
                  onClick={onLogout}
                  title="ออกจากระบบ"
                  className="p-2 text-emerald-200 hover:text-rose-300 hover:bg-emerald-800/80 rounded-xl transition-colors cursor-pointer shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold transition-all shadow-md cursor-pointer"
            >
              <UserIcon className="w-4 h-4" />
              {isOpen && <span>เข้าสู่ระบบเจ้าหน้าที่</span>}
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
