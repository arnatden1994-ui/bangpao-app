import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  Shield,
  Package,
  Stethoscope,
  MessageSquareWarning,
  Building2,
  Settings,
  ChevronDown,
  ChevronRight,
  FileCheck2,
  ClipboardCheck,
  HeartPulse,
  MapPin,
  Stamp,
  Users,
  Award,
  FileSpreadsheet,
  Bell,
  Menu,
  X,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { GoogleSheetsConfig, MainNavTab, User } from '../types/index.ts';

export interface NavbarProps {
  currentTab: MainNavTab;
  currentSubTabLabel?: string;
  activeSubTabs?: {
    hazardous?: 'dashboard' | 'form';
    nhso_ltc?: 'route' | 'register' | 'inventory' | 'nhso';
    equipment?: 'route' | 'loans' | 'register' | 'inventory' | 'map';
    petitions?: 'dashboard' | 'form' | 'general' | 'sewage' | 'print' | 'tracking';
    settings?: 'signers' | 'users' | 'approvers' | 'sheets' | 'notifications';
  };
  onNavigate?: (tab: MainNavTab, subTab?: string) => void;
  config?: GoogleSheetsConfig;
  currentUser: User | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  onOpenSheetsModal?: () => void;
  onOpenFirebaseModal?: () => void;
  isSyncing?: boolean;
  onQuickSync?: () => void;
  onOpenSignerSettings?: () => void;
  onOpenCitizenShareModal?: () => void;
  badgeCounts?: {
    petitions?: number;
    expiringLicenses?: number;
    activeLoans?: number;
    ltcPatients?: number;
  };
}

interface NavSubItem {
  id: string;
  title: string;
  desc: string;
  icon: React.ElementType;
}

interface NavModule {
  id: MainNavTab;
  number: string;
  title: string;
  fullTitle: string;
  subtitle: string;
  icon: React.ElementType;
  subItems: NavSubItem[];
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  currentSubTabLabel,
  activeSubTabs,
  onNavigate,
  currentUser,
  onOpenAuthModal,
  onLogout,
}) => {
  const officerName = currentUser?.fullName || 'พันจ่าเอกอานัส เด็นหมาด';
  const officerRole = currentUser?.roleTitle || 'เจ้าพนักงานสาธารณสุขชำนาญงาน (นายตรวจ)';

  // Dropdown state for Desktop
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navContainerRef = useRef<HTMLDivElement | null>(null);

  // Mobile drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileExpandedSection, setMobileExpandedSection] = useState<string | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navContainerRef.current && !navContainerRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMouseEnter = (tabId: string, hasSubItems: boolean) => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
    }
    if (hasSubItems) {
      setActiveDropdown(tabId);
    } else {
      setActiveDropdown(null);
    }
  };

  const handleMouseLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 180);
  };

  // 6 Main Categories strictly matching original structure (NO BADGE NUMBERS 25, 5, 3)
  const navModules: NavModule[] = [
    {
      id: 'overview',
      number: '',
      title: 'หน้าแรก',
      fullTitle: 'แดชบอร์ดหลักทุกระบบ',
      subtitle: 'ศูนย์สั่งการสถิติ & ติดตามภาพรวม',
      icon: LayoutDashboard,
      subItems: [],
    },
    {
      id: 'hazardous',
      number: '1',
      title: '1. กิจการอันตรายต่อสุขภาพ',
      fullTitle: 'กิจการอันตรายต่อสุขภาพ',
      subtitle: 'ตรวจประเมิน & ออกใบอนุญาต อภ.2',
      icon: Shield,
      subItems: [
        {
          id: 'dashboard',
          title: 'แดชบอร์ดติดตามผลอนุมัติ',
          desc: 'ติดตามผลอนุมัติ & พิมพ์รายงาน/ใบอนุญาต',
          icon: FileCheck2,
        },
        {
          id: 'form',
          title: 'ฟอร์มตรวจประเมินสุขลักษณะ',
          desc: 'แบบฟอร์มตรวจประเมิน 3 ขั้นตอน เกณฑ์ 25 ข้อ',
          icon: ClipboardCheck,
        },
      ],
    },
    {
      id: 'nhso_ltc',
      number: '2',
      title: '2. แจกจ่าย สปสช. & LTC',
      fullTitle: 'ระบบแจกจ่าย สปสช. & LTC',
      subtitle: 'การดูแลระยะยาว & ติดตามพิกัด',
      icon: Package,
      subItems: [
        {
          id: 'route',
          title: 'แดชบอร์ดติดตาม',
          desc: 'แผนที่พิกัดผู้มีภาวะพึ่งพิง & สรุปภาพรวม',
          icon: LayoutDashboard,
        },
        {
          id: 'register',
          title: 'ลงทะเบียนผู้มีภาวะพึ่งพิง',
          desc: 'ขึ้นทะเบียนผู้ป่วยติดเตียง/ติดบ้าน',
          icon: HeartPulse,
        },
        {
          id: 'inventory',
          title: 'คลังอุปกรณ์',
          desc: 'ผ้าอ้อมผู้ใหญ่ & แผ่นรองซับ',
          icon: Package,
        },
      ],
    },
    {
      id: 'equipment',
      number: '3',
      title: '3. บริการยืม-คืนอุปกรณ์',
      fullTitle: 'ระบบบริการยืม-คืนอุปกรณ์',
      subtitle: 'อุปกรณ์ทางการแพทย์ & สัญญาขอยืม',
      icon: Stethoscope,
      subItems: [
        {
          id: 'route',
          title: 'แดชบอร์ดติดตาม (รอบส่ง/ยืม-คืน)',
          desc: 'แผนที่ดาวเทียม & จัดคิวนำส่ง',
          icon: MapPin,
        },
        {
          id: 'register',
          title: 'ลงทะเบียนขอยืมอุปกรณ์',
          desc: 'บันทึกขอยืมอุปกรณ์ & ปักหมุด GPS',
          icon: ClipboardCheck,
        },
        {
          id: 'inventory',
          title: 'คลังอุปกรณ์การแพทย์',
          desc: 'เตียง, ถังออกซิเจน, วีลแชร์',
          icon: Stethoscope,
        },
      ],
    },
    {
      id: 'petitions',
      number: '4',
      title: '4. ยื่นคำร้อง & บริการ',
      fullTitle: 'ระบบยื่นคำร้อง & บริการประชาชน',
      subtitle: 'เหตุรำคาญ & สูบสิ่งปฏิกูล ทต.บางเป้า',
      icon: MessageSquareWarning,
      subItems: [
        {
          id: 'dashboard',
          title: '1. แดชบอร์ดติดตามคำร้อง',
          desc: 'แผนที่ GIS, สถิติ, ตารางงานสรุปคำร้อง & สูบส้วม',
          icon: LayoutDashboard,
        },
        {
          id: 'form',
          title: '2. แบบฟอร์มคำร้อง',
          desc: 'ยื่นคำร้องทั่วไป/สูบส้วม & พิมพ์แบบฟอร์ม A4',
          icon: FileCheck2,
        },
      ],
    },
    {
      id: 'nhso',
      number: '5',
      title: '5. โครงการ สปสช. (กองทุน)',
      fullTitle: 'โครงการ สปสช. (กองทุน)',
      subtitle: 'เอกสารแนบ 6 & มติคณะกรรมการ กปท.',
      icon: Building2,
      subItems: [],
    },
    {
      id: 'settings',
      number: '6',
      title: '6. ระบบตั้งค่า',
      fullTitle: 'ระบบตั้งค่าผู้ใช้งานทุกระบบ',
      subtitle: 'ผู้ลงนาม, สิทธิ์, ผังอนุมัติ & Cloud',
      icon: Settings,
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

  const handleItemClick = (tabId: MainNavTab, subId?: string) => {
    setActiveDropdown(null);
    setMobileMenuOpen(false);
    if (onNavigate) {
      onNavigate(tabId, subId);
    }
  };

  const isTabActive = (tabId: MainNavTab) => {
    if (tabId === currentTab) return true;
    if (tabId === 'hazardous' && ['dashboard', 'establishments', 'gas_app', 'inspections'].includes(currentTab)) return true;
    if (tabId === 'nhso_ltc' && currentTab === 'ltc') return true;
    if (tabId === 'petitions' && currentTab === 'reports') return true;
    return false;
  };

  const isSubItemActive = (tabId: MainNavTab, subId: string) => {
    if (!isTabActive(tabId)) return false;
    if (tabId === 'hazardous') return activeSubTabs?.hazardous === subId;
    if (tabId === 'nhso_ltc') return activeSubTabs?.nhso_ltc === subId;
    if (tabId === 'equipment') return activeSubTabs?.equipment === subId;
    if (tabId === 'petitions') return activeSubTabs?.petitions === subId;
    if (tabId === 'settings') return activeSubTabs?.settings === subId;
    return false;
  };

  return (
    <header className="sticky top-0 z-50 select-none shadow-md" ref={navContainerRef}>
      {/* ========================================================== */}
      {/* 1. TOP BRANDING ROW (แถบข้อมูลหน่วยงานแบบเรียบหรู คลีน 100%) */}
      {/* ========================================================== */}
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Official Municipal Seal & Agency Title */}
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Bangpao Official Logo */}
            <div
              onClick={() => handleItemClick('overview')}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white p-0.5 items-center justify-center shrink-0 shadow-md ring-2 ring-emerald-500/40 flex overflow-hidden cursor-pointer hover:scale-105 transition-transform"
              title="เทศบาลตำบลบางเป้า อ.กันตัง จ.ตรัง"
            >
              <img
                src="/municipal/bangpao_official_logo.png"
                alt="ตราเทศบาลตำบลบางเป้า"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/images-Photoroom.png';
                }}
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  onClick={() => handleItemClick('overview')}
                  className="text-base sm:text-lg font-black text-[#0d3b66] hover:text-emerald-700 transition-colors leading-tight cursor-pointer tracking-tight truncate"
                >
                  กองสาธารณสุขและสิ่งแวดล้อม
                </span>
                <span className="hidden md:inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300/80 shrink-0">
                  เทศบาลตำบลบางเป้า
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate flex items-center gap-1.5 font-medium mt-0.5">
                <span>อำเภอกันตัง จังหวัดตรัง</span>
                {currentSubTabLabel && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-emerald-800 font-bold bg-emerald-50 px-2 py-0.2 rounded border border-emerald-200">
                      {currentSubTabLabel}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Right: Only Officer Profile & Logout Button (Clean, No Clutter!) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Officer Profile Badge */}
            <div
              onClick={() => {
                if (currentUser?.role === 'admin') {
                  onOpenAuthModal();
                }
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all text-left shadow-2xs shrink-0 ${
                currentUser?.role === 'admin' ? 'cursor-pointer hover:border-emerald-300' : 'cursor-default'
              }`}
              title={currentUser?.role === 'admin' ? 'คลิกเพื่อจัดการผู้ใช้ / สลับสิทธิ์ (เฉพาะแอดมิน)' : 'ผู้ปฏิบัติงานปัจจุบัน'}
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                {officerName.slice(0, 1)}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-slate-800 leading-snug truncate max-w-[130px]">
                  {officerName}
                </div>
                <div className="text-[10px] text-emerald-700 font-semibold truncate max-w-[130px]">
                  {officerRole}
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              type="button"
              onClick={onLogout}
              title="ออกจากระบบ"
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-xl text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span className="hidden sm:inline">ออก</span>
            </button>

            {/* Mobile Hamburger Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-slate-100 text-slate-800 hover:bg-slate-200 active:scale-95 transition-all cursor-pointer border border-slate-300 ml-1"
              aria-label="เปิดเมนูนำทาง"
              title="เปิดเมนูนำทาง"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MUNICIPAL HORIZONTAL MEGA-MENU BAR (ปรับดีไซน์ใหม่ให้หรูหรา ทันสมัย คลีนตามภาพ 1) */}
      {/* ========================================================================= */}
      <div className="relative bg-gradient-to-r from-[#0a2540] via-[#0d3b66] to-[#0a3a40] text-white shadow-lg border-t border-white/10">
        <div className="w-full px-3 sm:px-6 lg:px-8">
          <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5 h-13 overflow-visible">
            {navModules.map((module) => {
              const active = isTabActive(module.id);
              const hasSub = module.subItems.length > 0;
              const isHovered = activeDropdown === module.id;
              const Icon = module.icon;

              return (
                <div
                  key={module.id}
                  className="relative group h-full flex items-center"
                  onMouseEnter={() => handleMouseEnter(module.id, hasSub)}
                  onMouseLeave={handleMouseLeave}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (!hasSub) {
                        handleItemClick(module.id);
                      } else {
                        setActiveDropdown(isHovered ? null : module.id);
                      }
                    }}
                    className={`relative flex items-center gap-2 px-3 xl:px-4 py-2.5 rounded-xl text-xs xl:text-[13.5px] font-bold tracking-tight transition-all duration-200 cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-white/20 text-amber-300 shadow-sm border border-amber-300/40 backdrop-blur-md'
                        : isHovered
                        ? 'bg-white/12 text-white'
                        : 'text-slate-200 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-transform ${
                        active ? 'text-amber-300' : 'text-slate-300 group-hover:scale-105'
                      }`}
                    />
                    <span>{module.title}</span>

                    {/* Active Bottom Glow Indicator */}
                    {active && (
                      <span className="absolute bottom-1 left-3 right-3 h-0.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 rounded-full shadow-sm" />
                    )}

                    {/* Dropdown Indicator Arrow */}
                    {hasSub && (
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 shrink-0 ${
                          isHovered ? 'rotate-180 text-amber-300' : 'text-slate-300/70'
                        }`}
                      />
                    )}
                  </button>

                  {/* ======================================================== */}
                  {/* MEGA-MENU DROPDOWN PANEL (สไตล์การ์ดสีขาวขอบมน bangpao.go.th) */}
                  {/* ======================================================== */}
                  {hasSub && isHovered && (
                    <div
                      onMouseEnter={() => handleMouseEnter(module.id, true)}
                      onMouseLeave={handleMouseLeave}
                      className="absolute top-full left-0 z-50 pt-2 animate-in fade-in slide-in-from-top-2 duration-150"
                      style={{
                        minWidth: module.subItems.length > 3 ? '580px' : module.subItems.length === 3 ? '520px' : '380px',
                      }}
                    >
                      <div className="bg-white/98 backdrop-blur-xl rounded-2xl rounded-tl-sm shadow-2xl border border-slate-200/90 p-5 text-slate-800 space-y-3.5 ring-1 ring-black/5">
                        {/* Section Header with arrow title */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                          <div className="flex items-center gap-2 text-xs font-black text-[#0d3b66]">
                            <Icon className="w-4 h-4 text-emerald-600" />
                            <span>{module.fullTitle}</span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {module.subtitle}
                          </span>
                        </div>

                        {/* Multi-Column SubItems Grid */}
                        <div
                          className={`grid gap-2.5 ${
                            module.subItems.length > 3
                              ? 'grid-cols-2'
                              : module.subItems.length === 3
                              ? 'grid-cols-3'
                              : 'grid-cols-2'
                          }`}
                        >
                          {module.subItems.map((sub) => {
                            const isSubActive = isSubItemActive(module.id, sub.id);

                            return (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={() => handleItemClick(module.id, sub.id)}
                                className={`text-left p-3.5 rounded-xl transition-all cursor-pointer border group/item flex flex-col justify-between ${
                                  isSubActive
                                    ? 'bg-teal-50 border-teal-400 text-[#0d3b66] shadow-xs'
                                    : 'bg-slate-50/70 hover:bg-emerald-50/80 border-slate-200/80 hover:border-emerald-300 text-slate-700'
                                }`}
                              >
                                <div>
                                  <div className="flex items-start gap-1.5 font-bold text-xs leading-snug group-hover/item:text-emerald-800 transition-colors">
                                    <span className="text-teal-600 font-black text-[13px] shrink-0 leading-none mt-0.5">
                                      ➤
                                    </span>
                                    <span className="line-clamp-2">{sub.title}</span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 mt-1 pl-4 leading-relaxed font-normal group-hover/item:text-slate-600">
                                    {sub.desc}
                                  </p>
                                </div>
                                <div className="mt-2 pl-4 flex items-center gap-1 text-[10px] text-teal-700 font-bold opacity-0 group-hover/item:opacity-100 transition-opacity">
                                  <span>เปิดใช้งาน</span>
                                  <ChevronRight className="w-3 h-3" />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </div>

      {/* ========================================================== */}
      {/* 3. MOBILE & TABLET EXPANDABLE DRAWER MENU (สำหรับมือถือ/แท็บเล็ต) */}
      {/* ========================================================== */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b-2 border-emerald-500 max-h-[80vh] overflow-y-auto shadow-2xl p-4 space-y-2 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-xs font-bold text-slate-500">
            <span>เมนูระบบสารสนเทศ 6 มิติ กองสาธารณสุข</span>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5 pt-1">
            {navModules.map((module) => {
              const active = isTabActive(module.id);
              const hasSub = module.subItems.length > 0;
              const isExpanded = mobileExpandedSection === module.id;
              const Icon = module.icon;

              return (
                <div key={module.id} className="rounded-xl border border-slate-200 overflow-hidden">
                  <div
                    onClick={() => {
                      if (!hasSub) {
                        handleItemClick(module.id);
                      } else {
                        setMobileExpandedSection(isExpanded ? null : module.id);
                      }
                    }}
                    className={`flex items-center justify-between p-3 font-bold text-xs cursor-pointer transition-colors ${
                      active ? 'bg-emerald-50 text-emerald-900 border-l-4 border-l-emerald-600' : 'bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{module.title}</span>
                    </div>
                    {hasSub ? (
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180 text-emerald-700' : ''}`}
                      />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </div>

                  {/* Sub-items accordion */}
                  {hasSub && isExpanded && (
                    <div className="p-2 bg-white space-y-1 border-t border-slate-200">
                      {module.subItems.map((sub) => {
                        const isSubActive = isSubItemActive(module.id, sub.id);
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => handleItemClick(module.id, sub.id)}
                            className={`w-full text-left p-2.5 rounded-lg text-xs font-semibold flex items-center justify-between ${
                              isSubActive
                                ? 'bg-teal-50 text-teal-900 border border-teal-300 font-bold'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              <span className="text-teal-600">➤</span>
                              <span>{sub.title}</span>
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
