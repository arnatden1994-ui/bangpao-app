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
  Bell,
  X,
} from 'lucide-react';
import { MainNavTab, User } from '../types/index.ts';

interface SidebarProps {
  currentTab: MainNavTab;
  activeSubTabs: {
    hazardous?: 'dashboard' | 'form';
    nhso_ltc?: 'route' | 'register' | 'inventory' | 'nhso';
    equipment?: 'route' | 'loans' | 'register' | 'inventory' | 'map';
    petitions?: 'dashboard' | 'form' | 'general' | 'sewage' | 'print' | 'tracking';
    settings?: 'signers' | 'users' | 'approvers' | 'sheets' | 'notifications';
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

  // 6 Main Categories strictly ordered
  const navModules = [
    {
      id: 'overview' as MainNavTab,
      number: '',
      title: 'แดชบอร์ดหลักทุกระบบ',
      subtitle: 'ศูนย์สั่งการสถิติ & ติดตามภาพรวม',
      icon: LayoutDashboard,
      badge: null,
      iconBg: 'bg-sky-100 text-sky-700 border-sky-200',
      subItems: [],
    },
    {
      id: 'hazardous' as MainNavTab,
      number: '1',
      title: 'กิจการอันตรายต่อสุขภาพ',
      subtitle: 'ตรวจประเมิน & ออกใบอนุญาต อภ.2',
      icon: Shield,
      badge: badgeCounts.expiringLicenses > 0 ? `${badgeCounts.expiringLicenses}` : null,
      badgeColor: 'bg-amber-500 text-white',
      iconBg: 'bg-emerald-100 text-emerald-700 border-emerald-200',
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
      number: '2',
      title: 'ระบบแจกจ่าย สปสช. & LTC',
      subtitle: 'การดูแลระยะยาว & ติดตามพิกัด',
      icon: Package,
      badge: badgeCounts.ltcPatients > 0 ? `${badgeCounts.ltcPatients}` : null,
      badgeColor: 'bg-pink-500 text-white',
      iconBg: 'bg-rose-100 text-rose-700 border-rose-200',
      subItems: [
        {
          id: 'route',
          title: '📊 แดชบอร์ดติดตาม',
          desc: 'แผนที่พิกัดผู้มีภาวะพึ่งพิง & สรุปภาพรวม',
          icon: LayoutDashboard,
        },
        {
          id: 'register',
          title: '📝 ลงทะเบียนผู้มีภาวะพึ่งพิง',
          desc: 'ขึ้นทะเบียนผู้ป่วยติดเตียง/ติดบ้าน',
          icon: HeartPulse,
        },
        {
          id: 'inventory',
          title: '📦 คลังอุปกรณ์',
          desc: 'ผ้าอ้อมผู้ใหญ่ & แผ่นรองซับ',
          icon: Package,
        },
      ],
    },
    {
      id: 'equipment' as MainNavTab,
      number: '3',
      title: 'ระบบบริการยืม-คืนอุปกรณ์',
      subtitle: 'อุปกรณ์ทางการแพทย์ & สัญญาขอยืม',
      icon: Stethoscope,
      badge: badgeCounts.activeLoans > 0 ? `${badgeCounts.activeLoans}` : null,
      badgeColor: 'bg-indigo-600 text-white',
      iconBg: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      subItems: [
        {
          id: 'route',
          title: '📊 แดชบอร์ดติดตาม (รอบส่ง/ยืม-คืน)',
          desc: 'แผนที่ดาวเทียม & จัดคิวนำส่ง',
          icon: MapPin,
        },
        {
          id: 'register',
          title: '📝 ลงทะเบียนขอยืมอุปกรณ์',
          desc: 'บันทึกขอยืมอุปกรณ์ & ปักหมุด GPS',
          icon: ClipboardCheck,
        },
        {
          id: 'inventory',
          title: '📦 คลังอุปกรณ์การแพทย์',
          desc: 'เตียง, ถังออกซิเจน, วีลแชร์',
          icon: Stethoscope,
        },
      ],
    },
    {
      id: 'petitions' as MainNavTab,
      number: '4',
      title: 'ระบบยื่นคำร้อง & บริการประชาชน',
      subtitle: 'เหตุรำคาญ & สูบสิ่งปฏิกูล ทต.บางเป้า',
      icon: MessageSquareWarning,
      badge: badgeCounts.petitions > 0 ? `${badgeCounts.petitions}` : null,
      badgeColor: 'bg-amber-500 text-white',
      iconBg: 'bg-amber-100 text-amber-700 border-amber-200',
      subItems: [
        {
          id: 'dashboard',
          title: '📊 1. แดชบอร์ดติดตามคำร้อง',
          desc: 'แผนที่ GIS, สถิติ, ตารางงานสรุปคำร้อง',
          icon: LayoutDashboard,
        },
        {
          id: 'form',
          title: '📝 2. แบบฟอร์มคำร้อง',
          desc: 'ยื่นคำร้องทั่วไป/สูบส้วม & พิมพ์ A4',
          icon: FileCheck2,
        },
      ],
    },
    {
      id: 'nhso' as MainNavTab,
      number: '5',
      title: 'โครงการ สปสช. (กองทุน)',
      subtitle: 'เอกสารแนบ 6 & มติคณะกรรมการ กปท.',
      icon: Building2,
      badge: null,
      iconBg: 'bg-blue-100 text-blue-700 border-blue-200',
      subItems: [],
    },
    {
      id: 'settings' as MainNavTab,
      number: '6',
      title: 'ระบบตั้งค่าผู้ใช้งานทุกระบบ',
      subtitle: 'ผู้ลงนาม, สิทธิ์, ผังอนุมัติ & Cloud',
      icon: Settings,
      badge: null,
      iconBg: 'bg-purple-100 text-purple-700 border-purple-200',
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
        {
          id: 'notifications',
          title: '🔔 แจ้งเตือน LINE & อีเมล',
          desc: 'ส่งการ์ด LINE & แนบไฟล์แบบฟอร์ม A4',
          icon: Bell,
        },
      ],
    },
  ];

  // Filter modules based on role: only admin sees Module 6 (Settings)
  const visibleNavModules = navModules.filter((m) => {
    if (m.id === 'settings') {
      return currentUser?.role === 'admin';
    }
    return true;
  });

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onToggle}
          className="fixed inset-0 bg-slate-900/35 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Main Sidebar - Light, Airy, Non-Opaque Glassmorphic Surface */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen z-50 flex flex-col bg-gradient-to-b from-emerald-50/90 via-white/95 to-teal-50/85 backdrop-blur-xl border-r border-emerald-200/80 text-slate-800 transition-all duration-300 ease-in-out shrink-0 select-none shadow-xl shadow-emerald-950/5 lg:shadow-xs ${
          isOpen ? 'w-80 sm:w-86 translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-20'
        }`}
      >
        {/* Brand & Municipal Identity Header (Swapped hierarchy + Official Bangpao Seal) */}
        <div className="min-h-20 px-4 py-2.5 flex items-center justify-between border-b border-emerald-200/80 bg-gradient-to-r from-emerald-100/75 via-teal-50/80 to-white/90 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden min-w-0">
            <div className="w-12 h-12 rounded-full bg-white p-0.5 shrink-0 shadow-sm ring-2 ring-emerald-500/40 flex items-center justify-center overflow-hidden">
              <img
                src="/images-Photoroom.png"
                alt="ตราเทศบาลตำบลบางเป้า"
                className="w-full h-full object-contain"
              />
            </div>
            {isOpen && (
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-[15px] sm:text-[16px] text-emerald-950 leading-snug truncate">
                  กองสาธารณสุขและสิ่งแวดล้อม
                </span>
                <span className="text-[12.5px] text-emerald-700 font-medium truncate mt-0.5">
                  ทต.บางเป้า อ.กันตัง จ.ตรัง
                </span>
              </div>
            )}
          </div>

          {/* Toggle / Collapse / Close Button */}
          <button
            type="button"
            onClick={onToggle}
            className="flex items-center justify-center p-2 text-emerald-800 hover:text-emerald-950 hover:bg-emerald-200/80 bg-emerald-100/70 lg:bg-transparent rounded-xl transition-colors cursor-pointer shrink-0 border border-emerald-300/70 lg:border-transparent select-none active:scale-95"
            title={isOpen ? 'ย่อ/ปิด แถบเมนู' : 'ขยายแถบเมนู'}
            aria-label={isOpen ? 'ปิดแถบเมนู' : 'เปิดแถบเมนู'}
          >
            <span className="lg:hidden text-xs font-bold text-emerald-900 mr-1">ปิด</span>
            {isOpen ? (
              <>
                <X className="w-5 h-5 lg:hidden text-emerald-900" />
                <ChevronLeft className="w-5 h-5 hidden lg:block" />
              </>
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Scrollable Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-3.5 space-y-2">
          {isOpen && (
            <div className="px-3 py-1 text-xs font-bold text-emerald-800 tracking-wide flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>เมนูหลัก {visibleNavModules.length - 1} ระบบงานสาธารณสุข</span>
            </div>
          )}

          {visibleNavModules.map((mod) => {
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
                      if (window.innerWidth < 1024) onToggle();
                    } else {
                      onNavigate(mod.id);
                      if (window.innerWidth < 1024) onToggle();
                    }
                  }}
                  title={!isOpen ? (mod.number ? `${mod.number}. ${mod.title}` : mod.title) : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all cursor-pointer group relative border ${
                    isTabActive
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                      : 'bg-white/70 hover:bg-emerald-50/90 text-slate-800 border-emerald-100/80 hover:border-emerald-200'
                  }`}
                >
                  {/* Icon Box with Corner Number Badge (No overlap with icon or title text) */}
                  <div
                    className={`relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 ${
                      isTabActive
                        ? 'bg-white/20 text-white border-white/30'
                        : mod.iconBg || 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {mod.number && (
                      <span
                        className={`absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full text-[10.5px] font-bold flex items-center justify-center shadow-xs border ${
                          isTabActive
                            ? 'bg-white text-emerald-800 border-emerald-500'
                            : 'bg-emerald-700 text-white border-white'
                        }`}
                      >
                        {mod.number}
                      </span>
                    )}
                  </div>

                  {isOpen && (
                    <div className="flex-1 min-w-0 text-left">
                      <div
                        className={`truncate text-[14px] sm:text-[14.5px] font-semibold leading-snug ${
                          isTabActive ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        {mod.title}
                      </div>
                      <div
                        className={`text-[12px] truncate mt-0.5 ${
                          isTabActive ? 'text-emerald-50 font-normal' : 'text-slate-500 font-normal'
                        }`}
                      >
                        {mod.subtitle}
                      </div>
                    </div>
                  )}

                  {isOpen && hasSub && (
                    <button
                      onClick={(e) => toggleSection(mod.id, e)}
                      className={`p-1 rounded-lg transition-colors shrink-0 ${
                        isTabActive
                          ? 'text-white hover:bg-white/20'
                          : 'text-slate-500 hover:bg-emerald-100/80 hover:text-emerald-800'
                      }`}
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
                    <div className="absolute left-full ml-3 px-3.5 py-2.5 bg-white text-slate-800 text-xs font-semibold rounded-xl shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 min-w-[220px] border border-emerald-200">
                      <div className="font-bold text-emerald-800 text-sm">
                        {mod.number}. {mod.title}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{mod.subtitle}</div>
                      {hasSub && (
                        <div className="mt-2 pt-2 border-t border-slate-100 space-y-1 text-xs text-slate-700">
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
                  <div className="pl-3 pr-1 py-1 space-y-1 ml-5 border-l-2 border-emerald-300/80">
                    {mod.subItems.map((sub) => {
                      let isSubActive = false;
                      if (mod.id === 'hazardous') {
                        isSubActive = isTabActive && (activeSubTabs.hazardous || 'dashboard') === sub.id;
                      } else if (mod.id === 'nhso_ltc') {
                        isSubActive = isTabActive && (activeSubTabs.nhso_ltc || 'route') === sub.id;
                      } else if (mod.id === 'equipment') {
                        const curEq = activeSubTabs.equipment || 'route';
                        const isRouteMatch = (curEq === 'route' || curEq === 'loans' || curEq === 'map') && (sub.id === 'route' || sub.id === 'loans' || sub.id === 'map');
                        isSubActive = isTabActive && (isRouteMatch || curEq === sub.id);
                      } else if (mod.id === 'petitions') {
                        const curPet = activeSubTabs.petitions || 'dashboard';
                        const isDashMatch = (curPet === 'dashboard' || curPet === 'general' || curPet === 'tracking') && sub.id === 'dashboard';
                        const isFormMatch = (curPet === 'form' || curPet === 'sewage' || curPet === 'print') && sub.id === 'form';
                        isSubActive = isTabActive && (isDashMatch || isFormMatch || curPet === sub.id);
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
                          className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-[13px] sm:text-[13.5px] transition-all cursor-pointer text-left ${
                            isSubActive
                              ? 'bg-emerald-100/95 text-emerald-950 font-semibold border border-emerald-300 shadow-2xs pl-3.5'
                              : 'text-slate-700 font-medium hover:bg-emerald-50/90 hover:text-emerald-900'
                          }`}
                        >
                          <span className="truncate leading-snug">{sub.title}</span>
                          {isSubActive && (
                            <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
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
        <div className="p-3.5 border-t border-emerald-200/80 bg-emerald-50/70 shrink-0">
          {currentUser ? (
            <div className="flex items-center justify-between gap-2">
              <div
                onClick={() => {
                  if (currentUser.role === 'admin') {
                    onOpenAuthModal();
                  }
                }}
                className={`flex items-center gap-3 min-w-0 flex-1 ${
                  currentUser.role === 'admin'
                    ? 'cursor-pointer hover:opacity-90'
                    : 'cursor-default'
                }`}
                title={
                  currentUser.role === 'admin'
                    ? 'คลิกเพื่อจัดการผู้ใช้ / สลับสิทธิ์ (เฉพาะแอดมิน)'
                    : 'ผู้ปฏิบัติงานปัจจุบัน'
                }
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 border border-emerald-400 flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-xs">
                  {currentUser.fullName ? currentUser.fullName[0] : 'U'}
                </div>
                {isOpen && (
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13.5px] font-bold text-slate-900 truncate leading-snug">
                      {currentUser.fullName}
                    </span>
                    <span className="text-xs text-emerald-700 font-medium truncate mt-0.5">
                      {currentUser.roleTitle || currentUser.role}
                    </span>
                  </div>
                )}
              </div>

              {isOpen && (
                <button
                  onClick={onLogout}
                  title="ออกจากระบบ"
                  className="px-2.5 py-1.5 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer shrink-0 border border-slate-200/80 flex items-center gap-1.5 text-xs font-bold"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  <span>ออก</span>
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer"
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
