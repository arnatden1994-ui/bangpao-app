import React, { useState, useEffect, useMemo } from 'react';
import {
  HeartPulse,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Coins,
  Building2,
  Users,
  Calendar,
  FileCheck,
  TrendingUp,
  FileText,
  Printer,
  Sliders,
  Filter,
  Copy,
  Edit,
  Trash2,
  ChevronRight,
  Eye,
  Check,
  X,
  AlertTriangle,
  Layers,
  ArrowUpDown,
  Download,
  Share2,
  DollarSign,
  Receipt,
  FileCheck2,
  CalendarDays,
  ShieldCheck,
  CheckSquare,
  Square,
  ListChecks,
  FolderPlus,
  RotateCcw,
  Sparkles,
  Table,
  LayoutDashboard,
  BarChart3,
  PieChart,
  ArrowRight,
  ExternalLink,
  FileSpreadsheet,
  Activity,
} from 'lucide-react';
import {
  NhsoProject,
  User,
  UserRole,
  NhsoFundSettings,
  NHSO_FUND_CATEGORIES,
} from '../types/index.ts';
import {
  getStoredNhsoFundProjects,
  saveStoredNhsoFundProjects,
  getStoredNhsoFundSettings,
  saveStoredNhsoFundSettings,
  mergeNhsoFundProjectsWithMaster,
} from '../services/sheetsSync.ts';
import {
  saveNhsoFundProjectToFirestore,
  deleteNhsoFundProjectFromFirestore,
  saveNhsoFundSettingsToFirestore,
} from '../services/firebaseService.ts';
import {
  getCategoryColorTheme,
  getOrgColorTheme,
  getProjectRefundAmount,
  isProjectTrackingCompleted,
  isProjectTrackingExtended,
  isProjectTrackingRefunded,
} from '../utils/nhsoThemeAndTracking.ts';
import { NhsoProjectBuilderModal } from './NhsoProjectBuilderModal.tsx';
import { NhsoFundSettingsModal } from './NhsoFundSettingsModal.tsx';
import { PrintNhsoProjectModal } from './PrintNhsoProjectModal.tsx';
import { NhsoDisbursementModal } from './NhsoDisbursementModal.tsx';
import { NhsoFundRevenueModal } from './NhsoFundRevenueModal.tsx';

export type NhsoMainTab = 'dashboard' | 'attachment2_summary' | 'management_disbursement';

interface NhsoFundViewProps {
  projects?: NhsoProject[];
  userRole?: UserRole;
  currentUser?: User | null;
  onAddNew?: () => void;
  onApproveProject?: (id: string, budget: number) => void;
  onUpdateProject?: (project: NhsoProject) => void;
  onDeleteProject?: (id: string) => void;
  settings?: NhsoFundSettings;
  onSaveSettings?: (newSettings: NhsoFundSettings) => void;
}

export const NhsoFundView: React.FC<NhsoFundViewProps> = ({
  projects: externalProjects,
  userRole = 'admin',
  currentUser,
  onAddNew,
  onApproveProject: externalApprove,
  onUpdateProject: externalUpdate,
  onDeleteProject: externalDelete,
  settings: externalSettings,
  onSaveSettings: externalSaveSettings,
}) => {
  // Local or external state (always merged with 2569 Master Database so 27 projects are never lost)
  const [internalProjects, setInternalProjects] = useState<NhsoProject[]>(() =>
    getStoredNhsoFundProjects()
  );
  const [fundSettings, setFundSettings] = useState<NhsoFundSettings>(() =>
    externalSettings || getStoredNhsoFundSettings()
  );

  const projects = useMemo(() => {
    const raw =
      externalProjects && externalProjects.length > 0 ? externalProjects : internalProjects;
    return mergeNhsoFundProjectsWithMaster(raw);
  }, [externalProjects, internalProjects]);

  // Filter & Search states (Always start at the current fiscal year cycle 2570 when entering the page)
  const [selectedYear, setSelectedYear] = useState<string>(() =>
    fundSettings.fiscalYear && fundSettings.fiscalYear !== '2569'
      ? fundSettings.fiscalYear
      : '2570'
  );
  const [customYears, setCustomYears] = useState<string[]>(['2569', '2570', '2571']);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrgFilter, setSelectedOrgFilter] = useState<string>('all');
  const [trackingFilter, setTrackingFilter] = useState<
    'all' | 'completed' | 'extended' | 'refunded' | 'selected_only'
  >('all');
  const [activeWorkflowTab, setActiveWorkflowTab] = useState<
    'all' | 'under_review' | 'approved' | 'disbursing' | 'completed'
  >('all');

  // Primary Navigation Mode: 1. แดชบอร์ดสรุปแต่ละปี, 2. สรุปโครงการ (เอกสารแนบ 2), 3. ตารางบริหารและเบิกจ่าย
  const [activeMainTab, setActiveMainTab] = useState<NhsoMainTab>('dashboard');

  // Table View Mode: Color-coded Attachment 2 Tracking vs Detailed Management
  const [tableViewMode, setTableViewMode] = useState<
    'attachment2_tracking' | 'detailed_management'
  >('attachment2_tracking');

  // Multi-row Checkbox Selection & Multi-year Carry-Forward states
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [targetCarryYear, setTargetCarryYear] = useState<string>('2570');
  const [actionToast, setActionToast] = useState<string | null>(null);

  // Modals state
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRevenueModalOpen, setIsRevenueModalOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [printMode, setPrintMode] = useState<'single' | 'summary' | 'tracking_attachment2'>(
    'tracking_attachment2'
  );
  const [editingProject, setEditingProject] = useState<NhsoProject | null>(null);
  const [printingProject, setPrintingProject] = useState<NhsoProject | null>(null);
  const [disbursementProject, setDisbursementProject] = useState<NhsoProject | null>(null);

  // Quick edit budget state for 2570
  const [isEditingFundBudget, setIsEditingFundBudget] = useState(false);
  const [tempFundBudget, setTempFundBudget] = useState<string>(
    String(fundSettings.totalFundBudget || '')
  );

  // Enhanced Committee Meeting Resolution Modal
  const [approvalModalProject, setApprovalModalProject] = useState<NhsoProject | null>(null);
  const [approvalDecision, setApprovalDecision] = useState<
    'approve' | 'approve_reduced' | 'revision' | 'reject' | 'verified'
  >('approve');
  const [reducedBudgetAmount, setReducedBudgetAmount] = useState<number>(0);
  const [meetingRound, setMeetingRound] = useState<string>('ครั้งที่ 1/2570');
  const [meetingDate, setMeetingDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const getComputedDefaultRecorder = () => {
    if (fundSettings.defaultRecorderName?.trim()) {
      return `${fundSettings.defaultRecorderName.trim()}${
        fundSettings.defaultRecorderTitle ? ` (${fundSettings.defaultRecorderTitle.trim()})` : ''
      }`;
    }
    if (currentUser?.fullName?.trim()) {
      const role = currentUser.roleTitle?.split(' ')[0] || 'เจ้าพนักงานสาธารณสุข';
      return `${currentUser.fullName.trim()} (${role})`;
    }
    return 'พันจ่าเอกอานัส เด็นหมาด (เจ้าพนักงานสาธารณสุข)';
  };

  const [officerRecorder, setOfficerRecorder] = useState<string>(getComputedDefaultRecorder);

  // Sync recorder when settings or currentUser changes
  useEffect(() => {
    setOfficerRecorder(getComputedDefaultRecorder());
  }, [fundSettings.defaultRecorderName, fundSettings.defaultRecorderTitle, currentUser?.fullName, currentUser?.roleTitle]);
  const [committeeComment, setCommitteeComment] = useState<string>('');
  const [officerNotes, setOfficerNotes] = useState<string>('');

  // Sync settings when external changes
  useEffect(() => {
    if (externalSettings) setFundSettings(externalSettings);
  }, [externalSettings]);

  // Save projects helper
  const handleSaveProject = (projectToSave: NhsoProject) => {
    const isNew = !projects.some((p) => p.id === projectToSave.id);
    let nextList: NhsoProject[];
    if (isNew) {
      nextList = [projectToSave, ...projects];
    } else {
      nextList = projects.map((p) => (p.id === projectToSave.id ? projectToSave : p));
    }
    setInternalProjects(nextList);
    saveStoredNhsoFundProjects(nextList);
    saveNhsoFundProjectToFirestore(projectToSave);

    if (externalUpdate) externalUpdate(projectToSave);
  };

  const handleDeleteProject = (id: string) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบโครงการนี้?')) return;
    const nextList = projects.filter((p) => p.id !== id);
    setInternalProjects(nextList);
    saveStoredNhsoFundProjects(nextList);
    deleteNhsoFundProjectFromFirestore(id);
    if (externalDelete) externalDelete(id);
  };

  const handleSaveSettings = (newSettings: NhsoFundSettings) => {
    setFundSettings(newSettings);
    saveStoredNhsoFundSettings(newSettings);
    saveNhsoFundSettingsToFirestore(newSettings);
    if (externalSaveSettings) externalSaveSettings(newSettings);
  };

  // Quick save fund budget
  const handleSaveFundBudget = () => {
    const val = parseFloat(tempFundBudget) || 0;
    const updated = {
      ...fundSettings,
      totalFundBudget: val,
      updatedAt: new Date().toISOString(),
    };
    handleSaveSettings(updated);
    setIsEditingFundBudget(false);
  };

  const showToast = (msg: string) => {
    setActionToast(msg);
    setTimeout(() => {
      setActionToast((prev) => (prev === msg ? null : prev));
    }, 5500);
  };

  // Helper to sync total refunded amounts from projects into Settings Card 4 (เงินยกยอดจากปีเก่า)
  const syncRefundsIntoSettings = (
    updatedList: NhsoProject[],
    forceOverride = false
  ) => {
    const refundedList = updatedList.filter(
      (p) =>
        (selectedYear === 'all' || p.fiscalYear === selectedYear || p.fiscalYear === '2569') &&
        (isProjectTrackingRefunded(p) || getProjectRefundAmount(p) > 0)
    );
    const refundIds = refundedList.map((p) => p.id);
    const totalRefund = refundedList.reduce((s, p) => s + getProjectRefundAmount(p), 0);

    const nextRevs = { ...(fundSettings.revenueSourcesByYear || {}) };
    ['2569', '2570'].forEach((yr) => {
      const rev = nextRevs[yr];
      if (!rev) return;
      if (!forceOverride && rev.isCarryOverManualOverride) return;
      const nextAnnual =
        Number(rev.nhsoPerCapitaTotal || 0) +
        Number(rev.municipalMatchingTotal || 0) +
        Number(rev.bankInterestTotal || 0) +
        totalRefund;
      nextRevs[yr] = {
        ...rev,
        carryOverProjectIds: refundIds,
        carryOverTotal: totalRefund,
        isCarryOverManualOverride: false,
        totalAnnualBudget: nextAnnual,
        updatedAt: new Date().toISOString(),
      };
    });

    const targetYr = selectedYear !== 'all' ? selectedYear : fundSettings.fiscalYear || '2570';
    const nextSettings: NhsoFundSettings = {
      ...fundSettings,
      totalFundBudget: nextRevs[targetYr]?.totalAnnualBudget || fundSettings.totalFundBudget,
      revenueSourcesByYear: nextRevs,
      updatedAt: new Date().toISOString(),
    };
    handleSaveSettings(nextSettings);
  };

  // Interactive 1-click toggle for ผลการติดตามโครงการ (ดำเนินการแล้ว | ขอขยายเวลา | คืนเงิน)
  const handleToggleProjectTracking = (
    projectId: string,
    field: 'trackingCompleted' | 'trackingExtended' | 'trackingRefunded'
  ) => {
    const target = projects.find((p) => p.id === projectId);
    if (!target) return;

    const currentVal =
      field === 'trackingCompleted'
        ? isProjectTrackingCompleted(target)
        : field === 'trackingExtended'
        ? isProjectTrackingExtended(target)
        : isProjectTrackingRefunded(target);

    const nextVal = !currentVal;
    const approved = target.budgetApproved || target.budgetRequested || 0;
    let nextRefundAmount = target.refundAmount;
    if (field === 'trackingRefunded') {
      if (nextVal && (nextRefundAmount === undefined || nextRefundAmount === 0)) {
        nextRefundAmount = !isProjectTrackingCompleted(target)
          ? approved
          : getProjectRefundAmount({ ...target, trackingRefunded: true }) || approved;
      } else if (!nextVal) {
        nextRefundAmount = 0;
      }
    }

    const updated: NhsoProject = {
      ...target,
      trackingCompleted:
        field === 'trackingCompleted' ? nextVal : isProjectTrackingCompleted(target),
      trackingExtended:
        field === 'trackingExtended' ? nextVal : isProjectTrackingExtended(target),
      trackingRefunded:
        field === 'trackingRefunded' ? nextVal : isProjectTrackingRefunded(target),
      refundAmount: nextRefundAmount,
      updatedAt: new Date().toISOString(),
    };

    const nextList = projects.map((p) => (p.id === updated.id ? updated : p));
    handleSaveProject(updated);
    if (field === 'trackingRefunded') {
      syncRefundsIntoSettings(nextList, false);
    }
  };

  // Direct inline update for refund amount (บาท) of a project
  const handleUpdateProjectRefundAmount = (projectId: string, newAmount: number) => {
    const target = projects.find((p) => p.id === projectId);
    if (!target) return;
    const cleanAmt = Math.max(0, Number(newAmount) || 0);
    const approved = target.budgetApproved || target.budgetRequested || 0;
    const updated: NhsoProject = {
      ...target,
      trackingRefunded: true,
      refundAmount: cleanAmt,
      disbursedAmount:
        cleanAmt >= approved
          ? 0
          : isProjectTrackingCompleted(target)
          ? Math.max(0, approved - cleanAmt)
          : target.disbursedAmount,
      updatedAt: new Date().toISOString(),
    };
    const nextList = projects.map((p) => (p.id === updated.id ? updated : p));
    handleSaveProject(updated);
    syncRefundsIntoSettings(nextList, false);
  };

  // Bulk set tracking status for all selected projects
  const handleBulkSetTracking = (
    mode: 'completed' | 'extended' | 'refunded' | 'clear'
  ) => {
    if (selectedProjectIds.length === 0) return;
    const nextList = projects.map((p) => {
      if (!selectedProjectIds.includes(p.id)) return p;
      const updated: NhsoProject = {
        ...p,
        trackingCompleted: mode === 'completed',
        trackingExtended: mode === 'extended',
        trackingRefunded: mode === 'refunded',
        updatedAt: new Date().toISOString(),
      };
      saveNhsoFundProjectToFirestore(updated);
      if (externalUpdate) externalUpdate(updated);
      return updated;
    });
    setInternalProjects(nextList);
    saveStoredNhsoFundProjects(nextList);
    showToast(
      `อัปเดตสถานะการติดตามผลจำนวน ${selectedProjectIds.length} โครงการเรียบร้อยแล้ว`
    );
  };

  // Checkbox selection helpers
  const toggleSelectProject = (id: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectCategory = (catProjects: NhsoProject[]) => {
    const ids = catProjects.map((p) => p.id);
    const allSelected = ids.length > 0 && ids.every((id) => selectedProjectIds.includes(id));
    if (allSelected) {
      setSelectedProjectIds((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedProjectIds((prev) => Array.from(new Set([...prev, ...ids])));
    }
  };

  // Carry-forward / Copy selected dataset into a target fiscal year (2570, 2571, 2572...)
  const handleBulkCarryForwardToYear = (destYear: string) => {
    const selectedItems = projects
      .filter((p) => selectedProjectIds.includes(p.id))
      .sort((a, b) => (a.orderNumber || 999) - (b.orderNumber || 999));
    if (selectedItems.length === 0) return;

    const existingInDest = projects.filter((p) => p.fiscalYear === destYear);
    let nextOrder =
      existingInDest.reduce((max, p) => Math.max(max, p.orderNumber || 0), 0) + 1;
    const shortYr = destYear.slice(-2);
    const prevYr = String(Number(destYear) - 1);

    const clonedProjects: NhsoProject[] = selectedItems.map((src, idx) => {
      const orderNum = nextOrder + idx;
      const updatedName = (src.projectName || '')
        .replace(/ประจำปี\s*25\d{2}/g, `ประจำปี ${destYear}`)
        .replace(/ปีงบประมาณ\s*25\d{2}/g, `ปีงบประมาณ ${destYear}`);

      return {
        ...src,
        id: `NHSO-${shortYr}-${Date.now().toString().slice(-4)}-${idx + 1}`,
        fiscalYear: destYear,
        orderNumber: orderNum,
        projectCode: `กองทุน-${shortYr}-${String(orderNum).padStart(3, '0')}`,
        projectName: updatedName,
        duration: `ต.ค. ${prevYr} - ก.ย. ${destYear}`,
        status: 'approved',
        committeeDecision: 'approve',
        committeeComment: `ดึงข้อมูลต่อเนื่องมาจากชุดฐานข้อมูลปีงบประมาณ ${src.fiscalYear}`,
        meetingRound: `ครั้งที่ 1/${destYear}`,
        budgetApproved: src.budgetRequested,
        disbursedAmount: 0,
        disbursementRecords: [],
        implementationStatus: 'not_started',
        trackingCompleted: false,
        trackingExtended: false,
        trackingRefunded: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    const nextList = [...clonedProjects, ...projects];
    setInternalProjects(nextList);
    saveStoredNhsoFundProjects(nextList);
    clonedProjects.forEach((cp) => {
      saveNhsoFundProjectToFirestore(cp);
      if (externalUpdate) externalUpdate(cp);
    });

    if (!customYears.includes(destYear)) {
      setCustomYears((prev) => Array.from(new Set([...prev, destYear])).sort());
    }
    setSelectedYear(destYear);
    setSelectedProjectIds(clonedProjects.map((cp) => cp.id));
    showToast(
      `ดึงชุดข้อมูล ${clonedProjects.length} โครงการ ไปเพิ่มในปีงบประมาณ ${destYear} เรียบร้อยแล้ว!`
    );
  };

  // Quick clone single project to target year
  const handleCloneProject = (sourceProj: NhsoProject, destYr = '2570') => {
    const shortYr = destYr.slice(-2);
    const nextOrder =
      projects.filter((p) => p.fiscalYear === destYr).length + 1;
    const cloned: NhsoProject = {
      ...sourceProj,
      id: `NHSO-${shortYr}-${Date.now().toString().slice(-4)}`,
      fiscalYear: destYr,
      orderNumber: nextOrder,
      projectCode: `กองทุน-${shortYr}-${String(nextOrder).padStart(3, '0')}`,
      projectName: `${sourceProj.projectName.replace(/25\d{2}/g, destYr)}`,
      status: 'submitted',
      committeeDecision: 'pending',
      committeeComment: `คัดลอกมาจากแม่แบบปี ${sourceProj.fiscalYear} เพื่อเสนอในรอบปี ${destYr}`,
      budgetApproved: 0,
      disbursedAmount: 0,
      disbursementRecords: [],
      implementationStatus: 'not_started',
      trackingCompleted: false,
      trackingExtended: false,
      trackingRefunded: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEditingProject(cloned);
    setIsBuilderOpen(true);
  };

  // Available fiscal years (sorted)
  const availableYears = useMemo(() => {
    const set = new Set<string>(['2569', '2570', '2571', ...customYears]);
    projects.forEach((p) => {
      if (p.fiscalYear) set.add(p.fiscalYear);
    });
    return Array.from(set).sort();
  }, [projects, customYears]);

  // Filtered project list (sorted by orderNumber)
  const filteredProjects = useMemo(() => {
    return projects
      .filter((p) => {
        // Year match
        if (selectedYear !== 'all' && p.fiscalYear !== selectedYear) return false;
        // Category match
        if (selectedCategory !== 'all' && (p.categoryNumber || 1) !== selectedCategory) return false;
        // Status match
        if (statusFilter !== 'all' && p.status !== statusFilter) return false;
        // Tracking status / Checkbox filter
        if (trackingFilter === 'completed' && !isProjectTrackingCompleted(p)) return false;
        if (trackingFilter === 'extended' && !isProjectTrackingExtended(p)) return false;
        if (trackingFilter === 'refunded' && !isProjectTrackingRefunded(p)) return false;
        if (trackingFilter === 'selected_only' && !selectedProjectIds.includes(p.id))
          return false;
        // Workflow Tab filter (only active in detailed management view)
        if (activeMainTab === 'management_disbursement') {
          if (activeWorkflowTab === 'under_review') {
            if (p.status !== 'submitted' && p.status !== 'under_review' && p.status !== 'draft')
              return false;
          } else if (activeWorkflowTab === 'approved') {
            if (p.status !== 'approved' && p.status !== 'approved_reduced') return false;
          } else if (activeWorkflowTab === 'disbursing') {
            if (
              (p.status !== 'approved' && p.status !== 'approved_reduced') ||
              (p.disbursedAmount || 0) >= (p.budgetApproved || p.budgetRequested)
            )
              return false;
          } else if (activeWorkflowTab === 'completed') {
            if (!isProjectTrackingCompleted(p)) return false;
          }
        }
        // Org match
        if (selectedOrgFilter !== 'all' && p.proposingOrg !== selectedOrgFilter) return false;
        // Search
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchName = (p.projectName || '').toLowerCase().includes(q);
          const matchOrg = (p.proposingOrg || '').toLowerCase().includes(q);
          const matchCode = (p.projectCode || '').toLowerCase().includes(q);
          const matchResp = (p.responsiblePerson || '').toLowerCase().includes(q);
          if (!matchName && !matchOrg && !matchCode && !matchResp) return false;
        }
        return true;
      })
      .sort((a, b) => (a.orderNumber || 999) - (b.orderNumber || 999));
  }, [
    projects,
    selectedYear,
    selectedCategory,
    statusFilter,
    trackingFilter,
    selectedProjectIds,
    selectedOrgFilter,
    activeWorkflowTab,
    activeMainTab,
    search,
  ]);

  // Grouped by category for Attachment 2 Color-coded View
  const filteredGroupedByCategory = useMemo(() => {
    const groups: Record<number, NhsoProject[]> = {};
    for (let c = 1; c <= 8; c++) {
      const matched = filteredProjects.filter((p) => (p.categoryNumber || 1) === c);
      if (matched.length > 0) {
        groups[c] = matched;
      }
    }
    return groups;
  }, [filteredProjects]);

  // Statistics for current selected year
  const yearProjects = useMemo(() => {
    return (
      selectedYear === 'all' ? projects : projects.filter((p) => p.fiscalYear === selectedYear)
    ).sort((a, b) => (a.orderNumber || 999) - (b.orderNumber || 999));
  }, [projects, selectedYear]);

  const yearCompletedCount = yearProjects.filter((p) => isProjectTrackingCompleted(p)).length;
  const yearExtendedCount = yearProjects.filter((p) => isProjectTrackingExtended(p)).length;
  const yearRefundedCount = yearProjects.filter((p) => isProjectTrackingRefunded(p)).length;
  const yearNotExecutedCount = yearProjects.filter(
    (p) => !isProjectTrackingCompleted(p) && !isProjectTrackingExtended(p) && isProjectTrackingRefunded(p)
  ).length;
  const totalYearRefundAmount = yearProjects
    .filter((p) => isProjectTrackingRefunded(p) || getProjectRefundAmount(p) > 0)
    .reduce((sum, p) => sum + getProjectRefundAmount(p), 0);

  const currentRevenueSource = fundSettings.revenueSourcesByYear?.[selectedYear];
  const currentClause10_4_Plan = fundSettings.clause10_4_PlansByYear?.[selectedYear];
  const totalFundBudget =
    currentRevenueSource?.totalAnnualBudget ||
    (selectedYear === fundSettings.fiscalYear ? fundSettings.totalFundBudget : 0) ||
    0;
  const totalBudgetRequested = yearProjects.reduce((acc, p) => acc + (p.budgetRequested || 0), 0);
  const totalBudgetApproved = yearProjects.reduce(
    (acc, p) =>
      acc +
      (p.status === 'approved' ||
      p.status === 'approved_reduced' ||
      p.status === 'completed' ||
      p.committeeDecision === 'approve' ||
      (p.disbursedAmount || 0) > 0
        ? (p.budgetApproved && p.budgetApproved > 0 ? p.budgetApproved : p.budgetRequested)
        : 0),
    0
  );
  const totalDisbursedActual = yearProjects.reduce((acc, p) => acc + (p.disbursedAmount || 0), 0);
  const remainingBudget = totalFundBudget > 0 ? totalFundBudget - totalBudgetApproved : 0;
  const approvedCount = yearProjects.filter(
    (p) =>
      p.status === 'approved' ||
      p.status === 'approved_reduced' ||
      p.status === 'completed' ||
      p.committeeDecision === 'approve' ||
      (p.disbursedAmount || 0) > 0
  ).length;
  const pendingCount = yearProjects.filter(
    (p) =>
      p.status !== 'approved' &&
      p.status !== 'approved_reduced' &&
      p.status !== 'completed' &&
      p.committeeDecision !== 'approve' &&
      !(p.disbursedAmount && p.disbursedAmount > 0)
  ).length;

  // Distinct Orgs for filter
  const distinctOrgs = useMemo(() => {
    const set = new Set<string>();
    yearProjects.forEach((p) => {
      if (p.proposingOrg) set.add(p.proposingOrg);
    });
    return Array.from(set);
  }, [yearProjects]);

  // Multi-Year Comparative Matrix Data (2569 vs 2570 vs 2571...)
  const multiYearSummary = useMemo(() => {
    return availableYears.map((yr) => {
      const projs = projects.filter((p) => p.fiscalYear === yr);
      const count = projs.length;
      const req = projs.reduce((s, p) => s + (p.budgetRequested || 0), 0);
      const rev = fundSettings.revenueSourcesByYear?.[yr];
      const fundFrame =
        rev?.totalAnnualBudget ||
        (yr === fundSettings.fiscalYear ? fundSettings.totalFundBudget : 0) ||
        0;
      const approved = projs.reduce(
        (s, p) =>
          s +
          (p.status === 'approved' ||
          p.status === 'approved_reduced' ||
          p.status === 'completed' ||
          p.committeeDecision === 'approve' ||
          (p.disbursedAmount || 0) > 0
            ? (p.budgetApproved && p.budgetApproved > 0 ? p.budgetApproved : p.budgetRequested)
            : 0),
        0
      );
      const disbursed = projs.reduce((s, p) => s + (p.disbursedAmount || 0), 0);
      const refund = projs
        .filter((p) => isProjectTrackingRefunded(p) || getProjectRefundAmount(p) > 0)
        .reduce((s, p) => s + getProjectRefundAmount(p), 0);
      const completed = projs.filter((p) => isProjectTrackingCompleted(p)).length;
      const extended = projs.filter((p) => isProjectTrackingExtended(p)).length;
      const refundedCount = projs.filter((p) => isProjectTrackingRefunded(p)).length;
      const disbPercent = approved > 0 ? Math.round((disbursed / approved) * 100) : 0;

      return {
        year: yr,
        count,
        fundFrame,
        req,
        approved,
        disbursed,
        refund,
        completed,
        extended,
        refundedCount,
        disbPercent,
      };
    });
  }, [projects, availableYears, fundSettings]);

  // Category 1 to 8 Summary for Dashboard
  const categoryStats = useMemo(() => {
    const targetProjs = yearProjects;
    const totalReq = targetProjs.reduce((s, p) => s + (p.budgetRequested || 0), 0);
    return NHSO_FUND_CATEGORIES.map((cat) => {
      const matched = targetProjs.filter((p) => (p.categoryNumber || 1) === cat.number);
      const count = matched.length;
      const budgetReq = matched.reduce((s, p) => s + (p.budgetRequested || 0), 0);
      const budgetApp = matched.reduce(
        (s, p) =>
          s +
          (p.status === 'approved' ||
          p.status === 'approved_reduced' ||
          p.status === 'completed' ||
          p.committeeDecision === 'approve'
            ? (p.budgetApproved && p.budgetApproved > 0 ? p.budgetApproved : p.budgetRequested)
            : 0),
        0
      );
      const disbursed = matched.reduce((s, p) => s + (p.disbursedAmount || 0), 0);
      const percentShare = totalReq > 0 ? Math.round((budgetReq / totalReq) * 100) : 0;
      const theme = getCategoryColorTheme(cat.number);
      return {
        category: cat,
        count,
        budgetReq,
        budgetApp,
        disbursed,
        percentShare,
        theme,
      };
    });
  }, [yearProjects]);

  // Agency Summary for Dashboard
  const agencyStats = useMemo(() => {
    const targetProjs = yearProjects;
    const totalReq = targetProjs.reduce((s, p) => s + (p.budgetRequested || 0), 0);
    const map: Record<
      string,
      { org: string; count: number; budgetReq: number; budgetApp: number; disbursed: number }
    > = {};
    targetProjs.forEach((p) => {
      const org = p.proposingOrg || 'กองสาธารณสุขและสิ่งแวดล้อม';
      if (!map[org]) {
        map[org] = { org, count: 0, budgetReq: 0, budgetApp: 0, disbursed: 0 };
      }
      map[org].count += 1;
      map[org].budgetReq += p.budgetRequested || 0;
      const isApp =
        p.status === 'approved' ||
        p.status === 'approved_reduced' ||
        p.status === 'completed' ||
        p.committeeDecision === 'approve';
      map[org].budgetApp += isApp
        ? (p.budgetApproved && p.budgetApproved > 0 ? p.budgetApproved : p.budgetRequested)
        : 0;
      map[org].disbursed += p.disbursedAmount || 0;
    });
    return Object.values(map)
      .sort((a, b) => b.budgetReq - a.budgetReq)
      .map((item) => ({
        ...item,
        percentShare: totalReq > 0 ? Math.round((item.budgetReq / totalReq) * 100) : 0,
        disbPercent: item.budgetApp > 0 ? Math.round((item.disbursed / item.budgetApp) * 100) : 0,
      }));
  }, [yearProjects]);

  // Open Approval Modal
  const openApprovalModal = (p: NhsoProject) => {
    setApprovalModalProject(p);
    setApprovalDecision(
      p.status === 'approved_reduced'
        ? 'approve_reduced'
        : p.status === 'rejected'
        ? 'reject'
        : 'approve'
    );
    setReducedBudgetAmount(p.budgetApproved || p.budgetRequested);
    setMeetingRound(p.meetingRound || 'ครั้งที่ 1/2570');
    setMeetingDate(p.meetingDate || new Date().toISOString().split('T')[0]);
    setCommitteeComment(p.committeeComment || 'เห็นชอบอนุมัติตามที่เสนอ');
    setOfficerNotes(p.officerNotes || 'เจ้าหน้าที่กองสาธารณสุขฯ ตรวจสอบเอกสารความถูกต้องเรียบร้อยแล้ว');
  };

  const handleSaveApproval = () => {
    if (!approvalModalProject) return;

    let finalBudget = 0;
    let newStatus = approvalModalProject.status;
    let decision: 'approve' | 'reject' | 'pending' | 'revision' = 'pending';

    if (approvalDecision === 'approve') {
      finalBudget = approvalModalProject.budgetRequested;
      newStatus = 'approved';
      decision = 'approve';
    } else if (approvalDecision === 'approve_reduced') {
      finalBudget = reducedBudgetAmount;
      newStatus = 'approved_reduced';
      decision = 'approve';
    } else if (approvalDecision === 'reject') {
      finalBudget = 0;
      newStatus = 'rejected';
      decision = 'reject';
    } else if (approvalDecision === 'revision') {
      finalBudget = 0;
      newStatus = 'under_review';
      decision = 'revision';
    } else if (approvalDecision === 'verified') {
      finalBudget = approvalModalProject.budgetRequested;
      newStatus = 'under_review';
      decision = 'pending';
    }

    const updated: NhsoProject = {
      ...approvalModalProject,
      budgetApproved: finalBudget,
      status: newStatus as any,
      committeeDecision: decision,
      committeeComment: committeeComment.trim(),
      meetingRound: meetingRound.trim(),
      meetingDate: meetingDate,
      verifiedByOfficer: officerRecorder.trim(),
      verifiedDate: new Date().toISOString(),
      officerNotes: officerNotes.trim(),
      approvedDate: decision === 'approve' ? new Date().toISOString() : approvalModalProject.approvedDate,
      updatedAt: new Date().toISOString(),
    };

    handleSaveProject(updated);
    if (externalApprove) {
      externalApprove(updated.id, finalBudget);
    }
    setApprovalModalProject(null);
  };

  // Reusable KPI Cards Grid
  const renderKpiCardsGrid = (showRefundCard = false) => (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 ${
        showRefundCard ? 'lg:grid-cols-3 xl:grid-cols-6' : 'lg:grid-cols-5'
      } gap-4`}
    >
      {/* 1. กรอบงบกองทุน (พร้อมคำนวณ 4 แหล่งที่มาของเงิน และข้อ 10(4)) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm relative group hover:border-amber-400 dark:hover:border-amber-600 transition-all">
        <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            กรอบงบกองทุน {selectedYear !== 'all' ? `ปี ${selectedYear}` : ''}
          </span>
          <button
            type="button"
            onClick={() => setIsRevenueModalOpen(true)}
            className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900 text-amber-700 dark:text-amber-300 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold cursor-pointer"
            title="เปิดหน้าต่างคำนวณที่มาของเงินกองทุน (สปสช., เทศบาลสมทบ, ดอกเบี้ย, ยกยอด) & ข้อ 10(4)"
          >
            <Coins className="w-3.5 h-3.5" />
            <span>ที่มางบ</span>
          </button>
        </div>

        <div
          onClick={() => setIsRevenueModalOpen(true)}
          className="cursor-pointer rounded-lg p-1 -m-1 transition-colors"
          title="คลิกเพื่อคำนวณที่มาของเงินกองทุน (สปสช., เทศบาลสมทบ, ดอกเบี้ย, ยกยอด) และงบประชุม 10(4)"
        >
          <div className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center justify-between">
            <span>
              {totalFundBudget > 0 ? (
                <>
                  {totalFundBudget.toLocaleString()}{' '}
                  <span className="text-xs font-normal text-slate-500">บาท</span>
                </>
              ) : (
                <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                  ยังไม่ได้ตั้งงบ (คลิกตั้งงบ)
                </span>
              )}
            </span>
            <Coins className="w-4 h-4 text-emerald-600 opacity-60 group-hover:opacity-100 transition-opacity" />
          </div>

          {currentRevenueSource ? (
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 space-y-0.5 border-t border-slate-100 dark:border-slate-800 pt-1.5 leading-tight">
              <div className="flex items-center justify-between">
                <span>สปสช. (45บ. x {currentRevenueSource.populationCount?.toLocaleString()} คน):</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {(currentRevenueSource.nhsoPerCapitaTotal || 0).toLocaleString()} บ.
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>เทศบาลสมทบ ({currentRevenueSource.municipalMatchingRate}%):</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {(currentRevenueSource.municipalMatchingTotal || 0).toLocaleString()} บ.
                </span>
              </div>
              {((currentRevenueSource.bankInterestTotal || 0) > 0 || (currentRevenueSource.carryOverTotal || 0) > 0) && (
                <div className="flex items-center justify-between text-[9.5px]">
                  <span>ดอกเบี้ย + ยกยอด:</span>
                  <span className="font-semibold text-purple-600 dark:text-purple-400">
                    {((currentRevenueSource.bankInterestTotal || 0) + (currentRevenueSource.carryOverTotal || 0)).toLocaleString()} บ.
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 mt-1">
              คลิกเพื่อคำนวณ 4 แหล่งที่มาของเงินกองทุน
            </p>
          )}
        </div>
      </div>

      {/* 2. ยอดขอรับงบรวม */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
          <span>ยอดขอรับงบรวม</span>
          <div className="p-1.5 bg-amber-50 dark:bg-amber-950/50 text-amber-600 rounded-lg">
            <FileCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl font-black text-amber-600 dark:text-amber-400">
          {totalBudgetRequested.toLocaleString()}{' '}
          <span className="text-xs font-normal text-slate-500">บาท</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">จากทั้งหมด {yearProjects.length} โครงการ</p>
      </div>

      {/* 3. ยอดอนุมัติแล้ว */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
          <span>ยอดอนุมัติแล้ว</span>
          <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 rounded-lg">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
          {totalBudgetApproved.toLocaleString()}{' '}
          <span className="text-xs font-normal text-slate-500">บาท</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          อนุมัติ {approvedCount} จาก {yearProjects.length} โครงการ
        </p>
      </div>

      {/* 4. ยอดเบิกจ่ายจริงสะสม (Disbursement Tracking) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
          <span>เบิกจ่ายจริงสะสม</span>
          <div className="p-1.5 bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 rounded-lg">
            <Receipt className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl font-black text-cyan-600 dark:text-cyan-400">
          {totalDisbursedActual.toLocaleString()}{' '}
          <span className="text-xs font-normal text-slate-500">บาท</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          {totalBudgetApproved > 0
            ? `เบิกจ่ายแล้ว ${Math.round((totalDisbursedActual / totalBudgetApproved) * 100)}%`
            : 'รอการเบิกจ่าย'}
        </p>
      </div>

      {/* 5. งบประมาณคงเหลือ */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
          <span>งบประมาณคงเหลือ</span>
          <div className="p-1.5 bg-purple-50 dark:bg-purple-950/50 text-purple-600 rounded-lg">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div
          className={`text-xl font-black ${
            remainingBudget >= 0
              ? 'text-purple-600 dark:text-purple-400'
              : 'text-red-600 dark:text-red-400'
          }`}
        >
          {totalFundBudget > 0 ? (
            <>
              {remainingBudget.toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-500">บาท</span>
            </>
          ) : (
            <span className="text-sm font-semibold text-slate-400">-</span>
          )}
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          {totalFundBudget === 0
            ? 'รอตั้งงบประมาณ'
            : remainingBudget >= 0
            ? 'คงเหลือในกรอบ'
            : '⚠️ เกินกรอบงบประมาณ'}
        </p>
      </div>

      {/* 6. ยอดเงินส่งคืนกองทุน (สำหรับ Dashboard) */}
      {showRefundCard && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm relative group hover:border-rose-300 dark:hover:border-rose-700 transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              ยอดส่งคืนกองทุน
            </span>
            <div className="p-1.5 bg-rose-50 dark:bg-rose-950/50 text-rose-600 rounded-lg">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400">
            {totalYearRefundAmount.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-500">บาท</span>
          </div>
          <div className="flex items-center justify-between mt-1 text-[11px]">
            <span className="text-slate-400">{yearRefundedCount} โครงการที่ส่งคืน</span>
            {totalYearRefundAmount > 0 && (
              <button
                type="button"
                onClick={() => {
                  syncRefundsIntoSettings(projects, true);
                  setIsRevenueModalOpen(true);
                  showToast(
                    `รวบรวมยอดเงินคืนรวม ${totalYearRefundAmount.toLocaleString()} บาท เข้าสู่ "งบข้อ 4 เงินยกยอดจากปีเก่า" เรียบร้อยแล้ว!`
                  );
                }}
                className="text-[10px] font-bold text-purple-600 hover:text-purple-700 underline cursor-pointer"
                title="ส่งยอดคืนไปรวมในงบข้อ 4"
              >
                ส่งเข้างบข้อ 4 ➔
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Top Banner / Executive Header */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-cyan-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md p-2 flex items-center justify-center shadow-inner border border-white/20">
              <img
                src="/nhso_logo.jpg"
                alt="สปสช"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 text-xs font-semibold border border-emerald-400/30">
                  ระบบบริหารและติดตามงบประมาณ สปสช. กองทุนตำบลบางเป้า
                </span>
                <span className="text-xs text-white/70">
                  ตามประกาศคณะกรรมการหลักประกันสุขภาพฯ
                </span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-black tracking-tight">
                โครงการกองทุนหลักประกันสุขภาพตำบลบางเป้า
              </h1>
              <p className="text-xs lg:text-sm text-emerald-100/80 mt-1 max-w-2xl leading-relaxed">
                จัดทำและตรวจสอบโครงการ 13 คอลัมน์ บันทึกมติที่ประชุมกรรมการ ติดตามการเบิกจ่ายจริง และพิมพ์รายงาน A4 แนวนอน
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                setEditingProject(null);
                setIsBuilderOpen(true);
              }}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              เขียนเสนอโครงการใหม่ ({selectedYear === 'all' ? '2570' : selectedYear})
            </button>

            <button
              onClick={() => setIsRevenueModalOpen(true)}
              className="px-3.5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="คำนวณที่มาของเงินกองทุน (สปสช., เทศบาลสมทบ, ดอกเบี้ย, ยกยอด) และงบประชุม 10(4)"
            >
              <Coins className="w-4 h-4 text-slate-950" />
              ที่มาเงินกองทุน & ข้อ 10(4)
            </button>

            <button
              onClick={() => {
                setPrintingProject(null);
                setPrintMode('tracking_attachment2');
                setIsPrintOpen(true);
              }}
              className="px-3.5 py-2.5 bg-emerald-500/25 hover:bg-emerald-500/35 text-emerald-100 font-bold text-xs rounded-xl backdrop-blur-md border border-emerald-400/40 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="พิมพ์สรุปโครงการและผลการติดตาม (เอกสารแนบ 2 - แยกสี)"
            >
              <ListChecks className="w-4 h-4 text-emerald-300" />
              พิมพ์สรุป & ติดตามผล (เอกสารแนบ 2)
            </button>

            <button
              onClick={() => {
                setPrintingProject(null);
                setPrintMode('summary');
                setIsPrintOpen(true);
              }}
              className="px-3.5 py-2.5 bg-white/15 hover:bg-white/25 text-white font-medium text-xs rounded-xl backdrop-blur-md border border-white/20 flex items-center gap-1.5 transition-all cursor-pointer"
              title="พิมพ์แบบสรุปภาพรวมโครงการทั้งหมดเสนอคณะกรรมการฯ"
            >
              <Printer className="w-4 h-4" />
              พิมพ์สรุปเสนอ กก.
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium text-xs rounded-xl backdrop-blur-md border border-white/15 flex items-center gap-1.5 transition-all cursor-pointer"
              title="ตั้งค่าผู้ลงนาม 3 ระดับและอัตราค่าใช้จ่ายมาตรฐาน"
            >
              <Sliders className="w-4 h-4" />
              ตั้งค่าระบบ & ผู้ลงนาม
            </button>
          </div>
        </div>

        {/* Fiscal Year Switcher Bar (Supports 2569, 2570, 2571, and adding future years) */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-emerald-200 font-medium">รอบปีงบประมาณ:</span>
            <div className="flex flex-wrap bg-black/25 p-1 rounded-xl border border-white/10 text-xs gap-1">
              {availableYears.map((yr) => {
                const count = projects.filter((p) => p.fiscalYear === yr).length;
                const isSelected = selectedYear === yr;
                const label =
                  yr === '2569'
                    ? `📜 ปีงบ 2569 (ดำเนินการแล้ว 27 โครงการ)`
                    : yr === '2570'
                    ? `🌟 ปีงบ 2570 (ปีปัจจุบัน / รับคำขอ)`
                    : `📅 ปีงบ ${yr}`;

                return (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => {
                      setSelectedYear(yr);
                      setSelectedProjectIds([]);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950 shadow-md'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span>{label}</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/25">
                      {count}
                    </span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  const maxYr = Math.max(
                    ...availableYears.map((y) => Number(y) || 2570)
                  );
                  const nextYr = String(maxYr + 1);
                  setCustomYears((prev) => Array.from(new Set([...prev, nextYr])).sort());
                  setSelectedYear(nextYr);
                  setTargetCarryYear(nextYr);
                  showToast(
                    `เปิดรอบปีงบประมาณใหม่ พ.ศ. ${nextYr} แล้ว! คุณสามารถกลับไปติ๊กเลือกชุดข้อมูลจากปี 2569 หรือ 2570 เพื่อดึงมาใช้ในปี ${nextYr} ได้ทันที`
                  );
                }}
                className="px-2.5 py-1.5 rounded-lg font-semibold text-emerald-200 hover:text-white hover:bg-emerald-500/20 border border-dashed border-emerald-400/40 transition-all flex items-center gap-1 cursor-pointer"
                title="เพิ่มรอบปีงบประมาณถัดไป (เช่น 2572, 2573...)"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มปีงบถัดไป</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedYear('all')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  selectedYear === 'all'
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                ทั้งหมด ({projects.length})
              </button>
            </div>
          </div>

          <div className="text-xs text-white/80 flex items-center gap-3">
            <span>
              ผู้เห็นชอบ: <strong>{fundSettings.defaultEndorserName}</strong>
            </span>
            <span>•</span>
            <span>
              ผู้อนุมัติ: <strong>{fundSettings.defaultApproverName}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Toast Notification Banner */}
      {actionToast && (
        <div className="bg-emerald-900/95 border border-emerald-400/50 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between gap-3 text-xs font-semibold animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>{actionToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionToast(null)}
            className="text-emerald-200 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 4 PRIMARY NAVIGATION BUTTONS RIBBON (แถบ 4 ปุ่มหลักตามที่ผู้ใช้กำหนด) */}
      {/* 1. หน้าแดชบอร์ดสรุปแต่ละปี                                            */}
      {/* 2. สรุปโครงการ (เอกสารแนบ 2) - เลือกปีสรุปได้                        */}
      {/* 3. ตารางบริหารและเบิกจ่าย                                             */}
      {/* 4. เขียนโครงการใหม่                                                  */}
      {/* ===================================================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-3 border border-slate-200 dark:border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3 sticky top-2 z-20 backdrop-blur-md bg-white/95 dark:bg-slate-900/95">
        <div className="flex flex-wrap items-center gap-2">
          {/* Button 1: หน้าแดชบอร์ด */}
          <button
            type="button"
            onClick={() => setActiveMainTab('dashboard')}
            className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeMainTab === 'dashboard'
                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white shadow-lg shadow-blue-500/30 scale-[1.02] ring-2 ring-blue-400/30'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>📊 หน้าแดชบอร์ด (สรุปข้อมูลแต่ละปี)</span>
          </button>

          {/* Button 2: สรุปโครงการ (เอกสารแนบ 2) */}
          <button
            type="button"
            onClick={() => {
              setActiveMainTab('attachment2_summary');
              setTableViewMode('attachment2_tracking');
            }}
            className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeMainTab === 'attachment2_summary'
                ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-teal-700 text-white shadow-lg shadow-emerald-500/30 scale-[1.02] ring-2 ring-emerald-400/30'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <ListChecks className="w-4 h-4" />
            <span>📑 สรุปโครงการ (เอกสารแบบ 2)</span>
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                activeMainTab === 'attachment2_summary'
                  ? 'bg-white/20 text-white'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              }`}
            >
              เลือกปีสรุปได้
            </span>
          </button>

          {/* Button 3: ตารางบริหารและเบิกจ่าย */}
          <button
            type="button"
            onClick={() => {
              setActiveMainTab('management_disbursement');
              setTableViewMode('detailed_management');
            }}
            className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeMainTab === 'management_disbursement'
                ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-pink-700 text-white shadow-lg shadow-purple-500/30 scale-[1.02] ring-2 ring-purple-400/30'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>📋 ตารางบริหารและเบิกจ่าย</span>
          </button>
        </div>

        {/* Button 4: เขียนโครงการใหม่ */}
        <button
          type="button"
          onClick={() => {
            setEditingProject(null);
            setIsBuilderOpen(true);
          }}
          className="px-4 py-2.5 rounded-2xl font-black text-xs bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer ml-auto border border-emerald-300/40"
        >
          <Plus className="w-4 h-4 stroke-[3] text-slate-950" />
          <span>✍️ + เขียนโครงการใหม่ ({selectedYear === 'all' ? '2570' : selectedYear})</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* 1. EXECUTIVE DASHBOARD (หน้าแดชบอร์ดสรุปภาพรวมแต่ละปี & เปรียบเทียบ) */}
      {/* ===================================================================== */}
      {activeMainTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Dashboard Scope Header */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-200/50 dark:border-blue-800/50">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                    แดชบอร์ดสรุปภาพรวมโครงการกองทุน สปสช.
                  </h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-extrabold">
                    {selectedYear === 'all' ? 'ภาพรวมทุกปีงบประมาณ' : `รอบปีงบประมาณ ${selectedYear}`}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  วิเคราะห์กรอบวงเงินกองทุน, สัดส่วน 8 หมวด (ข้อ 10(1)-(8)), สรุปตามหน่วยงาน และตารางเปรียบเทียบข้อมูลย้อนหลัง
                </p>
              </div>
            </div>

            {/* Scope Year Switcher */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500 font-bold">เลือกปีงบที่ต้องการดู:</span>
              <div className="flex flex-wrap bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs gap-1 shadow-xs">
                {availableYears.map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => {
                      setSelectedYear(yr);
                      setSelectedProjectIds([]);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      selectedYear === yr
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>ปี {yr}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        selectedYear === yr ? 'bg-white/20 text-white' : 'bg-black/10 dark:bg-white/10'
                      }`}
                    >
                      {projects.filter((p) => p.fiscalYear === yr).length}
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedYear('all')}
                  className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    selectedYear === 'all'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  รวมทุกปี ({projects.length})
                </button>
              </div>
            </div>
          </div>

          {/* Financial KPI Cards Grid with Refund Card */}
          {renderKpiCardsGrid(true)}

          {/* Implementation & Tracking Progress Overview */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <h3 className="font-black text-sm text-slate-900 dark:text-slate-100">
                  สถานะและการติดตามผลการดำเนินงาน ({yearProjects.length} โครงการ)
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  ดำเนินการแล้ว {yearCompletedCount} โครงการ
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                  ขอขยายเวลา {yearExtendedCount} โครงการ
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-semibold text-rose-700 dark:text-rose-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                  ส่งคืนเงิน {yearRefundedCount} โครงการ
                </span>
                {pendingCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-semibold text-blue-700 dark:text-blue-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                      รออนุมัติ/เริ่ม {pendingCount} โครงการ
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Visual Segmented Progress Bar */}
            <div className="w-full h-3.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
              {yearProjects.length > 0 ? (
                <>
                  <div
                    style={{
                      width: `${(yearCompletedCount / yearProjects.length) * 100}%`,
                    }}
                    className="bg-emerald-500 h-full transition-all"
                    title={`ดำเนินการแล้ว ${yearCompletedCount} โครงการ (${Math.round(
                      (yearCompletedCount / yearProjects.length) * 100
                    )}%)`}
                  />
                  <div
                    style={{
                      width: `${(yearExtendedCount / yearProjects.length) * 100}%`,
                    }}
                    className="bg-amber-500 h-full transition-all"
                    title={`ขอขยายเวลา ${yearExtendedCount} โครงการ (${Math.round(
                      (yearExtendedCount / yearProjects.length) * 100
                    )}%)`}
                  />
                  <div
                    style={{
                      width: `${(yearRefundedCount / yearProjects.length) * 100}%`,
                    }}
                    className="bg-rose-500 h-full transition-all"
                    title={`ส่งคืนเงิน ${yearRefundedCount} โครงการ (ยอดคืน ${totalYearRefundAmount.toLocaleString()} บ.)`}
                  />
                  <div
                    style={{
                      width: `${(pendingCount / yearProjects.length) * 100}%`,
                    }}
                    className="bg-blue-400 h-full transition-all"
                    title={`รอพิจารณา / กำลังดำเนินการ ${pendingCount} โครงการ`}
                  />
                </>
              ) : (
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-full" />
              )}
            </div>
          </div>

          {/* 8 NHSO Category Allocation Breakdown (ข้อ 10(1) ถึง 10(8)) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-emerald-600" />
                  สัดส่วนการจัดสรรงบประมาณตามประเภทโครงการ สปสช. ทั้ง 8 หมวด (ข้อ 10(1) - (8))
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  จำแนกตามสีทางการของแบบเอกสารแนบ 2 สามารถคลิกที่หมวดเพื่อดูรายการโครงการได้ทันที
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveMainTab('attachment2_summary');
                  setTableViewMode('attachment2_tracking');
                }}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
              >
                <span>ดูตารางสรุปเต็ม (แบบ 2)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {categoryStats.map((item) => (
                <div
                  key={item.category.number}
                  className="bg-white dark:bg-slate-900 rounded-2xl border shadow-sm p-3.5 flex flex-col justify-between transition-all hover:shadow-md hover:scale-[1.01]"
                  style={{ borderColor: item.theme.borderHex }}
                >
                  <div>
                    {/* Header with official category color */}
                    <div
                      className="px-2.5 py-1.5 rounded-xl border mb-2.5 flex items-center justify-between"
                      style={{
                        backgroundColor: item.theme.headerHex,
                        borderColor: item.theme.borderHex,
                      }}
                    >
                      <span className="font-black text-xs text-slate-950">
                        ประเภทที่ {item.category.number}
                      </span>
                      <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-black/10 text-slate-950">
                        {item.count} โครงการ
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-2 min-h-[32px] leading-snug">
                      {item.category.name}
                    </h4>

                    {/* Stats */}
                    <div className="mt-3 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">งบที่ขอรับ:</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {item.budgetReq.toLocaleString()} บ.
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">อนุมัติแล้ว:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {item.budgetApp.toLocaleString()} บ.
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">เบิกจ่ายจริง:</span>
                        <span className="font-bold text-cyan-600 dark:text-cyan-400">
                          {item.disbursed.toLocaleString()} บ.
                        </span>
                      </div>

                      {/* Percentage share bar */}
                      <div className="pt-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                          <span>สัดส่วนงบ</span>
                          <span className="font-bold">{item.percentShare}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, item.percentShare)}%`,
                              backgroundColor:
                                item.theme.headerHex !== '#ffffff'
                                  ? item.theme.headerHex
                                  : '#10b981',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory(item.category.number);
                      setActiveMainTab('attachment2_summary');
                      setTableViewMode('attachment2_tracking');
                    }}
                    className="mt-3 w-full py-1.5 px-2 rounded-xl text-[11px] font-bold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>ดูโครงการกลุ่มนี้ในแบบ 2</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Agency Distribution & Multi-Year Matrix Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Agency Budget Ranking (1 Col) */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <h3 className="font-black text-sm text-slate-900 dark:text-slate-100">
                    งบประมาณตามหน่วยงานผู้ขอ
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-slate-500">
                  {agencyStats.length} หน่วยงาน
                </span>
              </div>

              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {agencyStats.map((ag) => {
                  const orgTheme = getOrgColorTheme(ag.org);
                  return (
                    <div
                      key={ag.org}
                      className="p-3 rounded-2xl border space-y-1.5 transition-all hover:shadow-xs"
                      style={{
                        backgroundColor: orgTheme.bgHex !== '#ffffff' ? orgTheme.bgHex : undefined,
                        borderColor: orgTheme.borderHex,
                      }}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-black text-slate-950 line-clamp-1">{ag.org}</span>
                        <span className="font-extrabold px-1.5 py-0.2 rounded-md bg-black/10 text-slate-950 text-[10px]">
                          {ag.count} โครงการ
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-800">
                        <span className="text-[11px]">งบขอรับรวม:</span>
                        <span className="font-bold">{ag.budgetReq.toLocaleString()} บาท</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-600">
                        <span>เบิกจ่ายแล้ว: {ag.disbursed.toLocaleString()} บ.</span>
                        <span className="font-bold text-emerald-700">{ag.disbPercent}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 rounded-full"
                          style={{ width: `${Math.min(100, ag.percentShare)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Multi-Year Comparative Matrix Table (2 Cols) */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                    <h3 className="font-black text-sm text-slate-900 dark:text-slate-100">
                      ตารางเปรียบเทียบข้อมูลย้อนหลังและแนวโน้ม (2569 vs 2570 vs 2571)
                    </h3>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold">
                    สรุปเสนอคณะกรรมการฯ
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  เปรียบเทียบตัวชี้วัดสำคัญของกองทุนหลักประกันสุขภาพตำบลบางเป้าในแต่ละปีงบประมาณ
                </p>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                      <tr>
                        <th className="py-2.5 px-3">ตัวชี้วัด / รายการ</th>
                        {multiYearSummary.map((my) => (
                          <th key={my.year} className="py-2.5 px-3 text-right">
                            ปีงบ {my.year}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      <tr>
                        <td className="py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">
                          1. จำนวนโครงการที่ขอรับงบ
                        </td>
                        {multiYearSummary.map((my) => (
                          <td
                            key={my.year}
                            className="py-2 px-3 text-right font-bold text-slate-900 dark:text-slate-100"
                          >
                            {my.count} โครงการ
                          </td>
                        ))}
                      </tr>
                      <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                        <td className="py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">
                          2. กรอบวงเงินกองทุน (4 แหล่งที่มา)
                        </td>
                        {multiYearSummary.map((my) => (
                          <td
                            key={my.year}
                            className="py-2 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400"
                          >
                            {my.fundFrame > 0 ? `${my.fundFrame.toLocaleString()} บ.` : '-'}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">
                          3. งบประมาณที่ขอรับรวม
                        </td>
                        {multiYearSummary.map((my) => (
                          <td
                            key={my.year}
                            className="py-2 px-3 text-right font-bold text-amber-600 dark:text-amber-400"
                          >
                            {my.req.toLocaleString()} บ.
                          </td>
                        ))}
                      </tr>
                      <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                        <td className="py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">
                          4. งบประมาณที่อนุมัติแล้ว
                        </td>
                        {multiYearSummary.map((my) => (
                          <td
                            key={my.year}
                            className="py-2 px-3 text-right font-bold text-emerald-700 dark:text-emerald-300"
                          >
                            {my.approved.toLocaleString()} บ.
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">
                          5. งบประมาณที่เบิกจ่ายจริงสะสม
                        </td>
                        {multiYearSummary.map((my) => (
                          <td
                            key={my.year}
                            className="py-2 px-3 text-right font-bold text-cyan-600 dark:text-cyan-400"
                          >
                            {my.disbursed.toLocaleString()} บ.
                          </td>
                        ))}
                      </tr>
                      <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                        <td className="py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">
                          6. ร้อยละการเบิกจ่ายจริง (%)
                        </td>
                        {multiYearSummary.map((my) => (
                          <td
                            key={my.year}
                            className="py-2 px-3 text-right font-black text-cyan-700 dark:text-cyan-300"
                          >
                            {my.disbPercent}%
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">
                          7. ยอดเงินส่งคืนกองทุน (คืนเข้าข้อ 4)
                        </td>
                        {multiYearSummary.map((my) => (
                          <td
                            key={my.year}
                            className="py-2 px-3 text-right font-bold text-rose-600 dark:text-rose-400"
                          >
                            {my.refund > 0 ? `${my.refund.toLocaleString()} บ.` : '0 บ.'}
                          </td>
                        ))}
                      </tr>
                      <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                        <td className="py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">
                          8. โครงการดำเนินการแล้วเสร็จ
                        </td>
                        {multiYearSummary.map((my) => (
                          <td key={my.year} className="py-2 px-3 text-right font-bold text-emerald-600">
                            {my.completed} โครงการ
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">
                          9. สถานะวงรอบปีงบประมาณ
                        </td>
                        {multiYearSummary.map((my) => (
                          <td
                            key={my.year}
                            className="py-2 px-3 text-right text-[11px] font-bold text-slate-600 dark:text-slate-400"
                          >
                            {my.year === '2569'
                              ? 'ปิดงบสมบูรณ์ 100%'
                              : my.year === '2570'
                              ? 'ปีปัจจุบัน (รับคำขอ)'
                              : 'รอบถัดไป'}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom Quick Jump Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveMainTab('attachment2_summary');
                    setTableViewMode('attachment2_tracking');
                  }}
                  className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ListChecks className="w-3.5 h-3.5" />
                  <span>เปิดสรุปโครงการ (เอกสารแบบ 2)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveMainTab('management_disbursement');
                    setTableViewMode('detailed_management');
                  }}
                  className="px-4 py-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>เปิดตารางบริหารและเบิกจ่าย</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. สรุปโครงการ (เอกสารแบบ 2) - เลือกปีงบประมาณที่จะสรุปได้มาแสดง       */}
      {/* ===================================================================== */}
      {activeMainTab === 'attachment2_summary' && (
        <div className="space-y-4">
          {/* Dedicated Fiscal Year Selector & Category Filter Bar for Attachment 2 */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 dark:from-slate-800 dark:via-slate-850 dark:to-slate-900 p-4 rounded-3xl border border-emerald-200 dark:border-emerald-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                เลือกปีงบประมาณที่จะสรุปโครงการ (เอกสารแนบ 2):
              </span>
              <div className="flex flex-wrap bg-white dark:bg-slate-900 p-1 rounded-2xl border border-emerald-200 dark:border-slate-700 text-xs gap-1 shadow-xs">
                {availableYears.map((yr) => {
                  const count = projects.filter((p) => p.fiscalYear === yr).length;
                  const isSelected = selectedYear === yr;
                  return (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => {
                        setSelectedYear(yr);
                        setSelectedProjectIds([]);
                      }}
                      className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span>ปีงบ {yr}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-black/10 dark:bg-white/10'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setSelectedYear('all')}
                  className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    selectedYear === 'all'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  ทุกปี ({projects.length})
                </button>
              </div>
            </div>

            {/* Quick Summary Pill Badges */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200 shadow-xs">
                รวม {filteredProjects.length} โครงการ
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-black shadow-xs">
                งบรวม {filteredProjects.reduce((s, p) => s + p.budgetRequested, 0).toLocaleString()} บ.
              </span>
              {totalYearRefundAmount > 0 && (
                <span className="px-3 py-1.5 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-800 shadow-xs">
                  คืนเงิน {totalYearRefundAmount.toLocaleString()} บ.
                </span>
              )}
            </div>
          </div>

      {/* Multi-Year Dataset Checkbox Selection & Carry-Forward Action Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl p-4 border border-emerald-500/30 shadow-lg flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const filteredIds = filteredProjects.map((p) => p.id);
                const allFilteredSelected =
                  filteredIds.length > 0 &&
                  filteredIds.every((id) => selectedProjectIds.includes(id));
                if (allFilteredSelected) {
                  setSelectedProjectIds((prev) =>
                    prev.filter((id) => !filteredIds.includes(id))
                  );
                } else {
                  setSelectedProjectIds((prev) =>
                    Array.from(new Set([...prev, ...filteredIds]))
                  );
                }
              }}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow transition-all cursor-pointer"
            >
              <CheckSquare className="w-4 h-4" />
              <span>
                {filteredProjects.length > 0 &&
                filteredProjects.every((p) => selectedProjectIds.includes(p.id))
                  ? 'ยกเลิกติ๊กเลือกทั้งหมด'
                  : `ติ๊กเลือกทั้งหมดในหน้านี้ (${filteredProjects.length})`}
              </span>
            </button>

            {selectedProjectIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedProjectIds([])}
                className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl border border-white/15 cursor-pointer"
              >
                ล้างที่เลือก ({selectedProjectIds.length})
              </button>
            )}
          </div>

          <div className="text-xs text-emerald-100 flex flex-wrap items-center gap-2">
            <span>
              ชุดข้อมูลที่ติ๊กเลือก:{' '}
              <strong className="text-emerald-300 text-sm">
                {selectedProjectIds.length}
              </strong>{' '}
              โครงการ
            </span>
            {selectedProjectIds.length > 0 && (
              <>
                <span>•</span>
                <span>
                  งบประมาณรวมที่เลือก:{' '}
                  <strong className="text-amber-300 text-sm">
                    {projects
                      .filter((p) => selectedProjectIds.includes(p.id))
                      .reduce((s, p) => s + p.budgetRequested, 0)
                      .toLocaleString()}
                  </strong>{' '}
                  บาท
                </span>
              </>
            )}
          </div>
        </div>

        {/* Bulk Actions: Carry-forward to future year + Print Selected + Set Tracking Status */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Bulk Set Tracking Status */}
          {selectedProjectIds.length > 0 && (
            <div className="flex items-center gap-1 bg-black/30 px-2.5 py-1 rounded-xl border border-white/10 text-[11px]">
              <span className="text-slate-300 mr-1">ตั้งค่าที่เลือก:</span>
              <button
                type="button"
                onClick={() => handleBulkSetTracking('completed')}
                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg cursor-pointer"
              >
                ✓ ดำเนินการแล้ว
              </button>
              <button
                type="button"
                onClick={() => handleBulkSetTracking('extended')}
                className="px-2 py-0.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg cursor-pointer"
              >
                ⏳ ขอขยายเวลา
              </button>
              <button
                type="button"
                onClick={() => handleBulkSetTracking('refunded')}
                className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg cursor-pointer"
              >
                ↩️ คืนเงิน
              </button>
            </div>
          )}

          {/* Carry-forward selected dataset to future fiscal year */}
          <div className="flex items-center gap-1.5 bg-indigo-950/90 px-2.5 py-1 rounded-xl border border-indigo-400/40 text-xs">
            <FolderPlus className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
            <span className="text-indigo-200 font-medium text-[11px]">ดึงชุดที่ติ๊กไปเพิ่มในปีงบ:</span>
            <select
              value={targetCarryYear}
              onChange={(e) => setTargetCarryYear(e.target.value)}
              className="bg-slate-900 text-white font-bold text-xs px-2 py-1 rounded-lg border border-indigo-400/40"
            >
              <option value="2570">ปีงบ 2570</option>
              <option value="2571">ปีงบ 2571</option>
              <option value="2572">ปีงบ 2572</option>
              <option value="2573">ปีงบ 2573</option>
            </select>
            <button
              type="button"
              disabled={selectedProjectIds.length === 0}
              onClick={() => handleBulkCarryForwardToYear(targetCarryYear)}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1 ${
                selectedProjectIds.length > 0
                  ? 'bg-indigo-500 hover:bg-indigo-400 text-white shadow cursor-pointer'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
              title="คัดลอกชุดโครงการที่ติ๊กเลือกทั้งหมดไปตั้งเป็นโครงการในปีงบประมาณที่เลือกทันที"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ดึงไปปี {targetCarryYear} ({selectedProjectIds.length})</span>
            </button>
          </div>

          {/* Print / Export Summary Report */}
          <button
            type="button"
            onClick={() => {
              setPrintingProject(null);
              setPrintMode('tracking_attachment2');
              setIsPrintOpen(true);
            }}
            className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>
              {selectedProjectIds.length > 0
                ? `สรุป / พิมพ์ชุดที่เลือก (${selectedProjectIds.length} โครงการ)`
                : `สรุป / พิมพ์รายงานกรรมการ (เอกสารแนบ 2)`}
            </span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* Official Attachment 2 Table (เอกสารแนบ 2)                           */}
      {/* ===================================================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-4 sm:p-6 space-y-5">
          {/* Official Peach Title Banner matching เอกสารแนบ 2 */}
          <div
            className="w-full py-3 px-4 rounded-xl text-center border border-[#f4b084] shadow-xs space-y-0.5"
            style={{ backgroundColor: '#fce4d6' }}
          >
            <h2 className="text-base sm:text-lg font-black text-slate-950">
              สรุปโครงการที่ขอรับการสนับสนุนงบประมาณจากกองทุนหลักประกันสุขภาพเทศบาลตำบลบางเป้า &nbsp;&nbsp;(เอกสารแนบ 2)
            </h2>
            <p className="text-sm sm:text-base font-bold text-slate-900">
              ประจำปีงบประมาณ {selectedYear === 'all' ? 'ทุกปีงบประมาณ' : selectedYear}
            </p>
          </div>

          {/* Subheader Bar: Count & Quick Legend */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-3">
              <span className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
                จำนวน {filteredProjects.length} โครงการ
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                งบประมาณรวม {filteredProjects.reduce((s, p) => s + p.budgetRequested, 0).toLocaleString()} บาท
              </span>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <span>💡 คลิกช่องติ๊กด้านซ้ายเพื่อเลือกชุดข้อมูล หรือคลิกช่อง ☑ ด้านขวาเพื่อบันทึกผลการติดตาม</span>
            </div>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-4">
              <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  ยังไม่มีรายการโครงการในรอบปีงบประมาณ {selectedYear === 'all' ? 'ที่เลือก' : selectedYear}
                </p>
                <p className="text-xs text-slate-500">
                  คุณสามารถเริ่มเขียนเสนอโครงการใหม่ (พร้อมผู้ช่วย AI ฟรี) หรือเปิดดูฐานข้อมูลปีงบ 2569 เพื่อติ๊กดึงโครงการต่อเนื่องมาปี {selectedYear === 'all' ? '2570' : selectedYear} ได้ทันที
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setEditingProject(null);
                    setIsBuilderOpen(true);
                  }}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  เขียนเสนอโครงการใหม่ (ปีงบ {selectedYear === 'all' ? '2570' : selectedYear})
                </button>
                {selectedYear !== '2569' && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedYear('2569');
                      setSelectedProjectIds([]);
                    }}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <FolderPlus className="w-4 h-4 text-indigo-600" />
                    📜 ดูฐานข้อมูลปีงบ 2569 (27 โครงการ)
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(filteredGroupedByCategory).map(([catNumStr, projectsInCat]) => {
                const cNum = Number(catNumStr);
                const catTheme = getCategoryColorTheme(cNum);
                const catMeta = NHSO_FUND_CATEGORIES.find((c) => c.number === cNum);
                const subtotal = projectsInCat.reduce((s, p) => s + p.budgetRequested, 0);
                const compCount = projectsInCat.filter((p) => isProjectTrackingCompleted(p)).length;
                const extCount = projectsInCat.filter((p) => isProjectTrackingExtended(p)).length;
                const refCount = projectsInCat.filter((p) => isProjectTrackingRefunded(p)).length;
                const allCatSelected =
                  projectsInCat.length > 0 &&
                  projectsInCat.every((p) => selectedProjectIds.includes(p.id));

                return (
                  <div key={cNum} className="space-y-2">
                    {/* Category Colored Banner + Select Category Button */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div
                        className="inline-flex items-center gap-3 py-1.5 px-3.5 rounded-lg font-black text-slate-950 text-sm shadow-2xs border"
                        style={{
                          backgroundColor: catTheme.headerHex,
                          borderColor: catTheme.borderHex,
                        }}
                      >
                        <span>
                          ประเภทที่ {cNum} &nbsp;&nbsp;&nbsp; จำนวน &nbsp;{projectsInCat.length}&nbsp; โครงการ
                        </span>
                        {catMeta && (
                          <span className="text-xs font-semibold text-slate-800 hidden md:inline">
                            ({catMeta.shortTitle})
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleSelectCategory(projectsInCat)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={allCatSelected}
                          readOnly
                          className="w-3.5 h-3.5 accent-emerald-600 rounded pointer-events-none"
                        />
                        <span>
                          {allCatSelected
                            ? `ยกเลิกเลือกประเภทที่ ${cNum}`
                            : `ติ๊กเลือกทั้งประเภทที่ ${cNum} (${projectsInCat.length})`}
                        </span>
                      </button>
                    </div>

                    {/* Color-Coded Attachment 2 Table */}
                    <div className="overflow-x-auto rounded-lg border border-black shadow-xs">
                      <table className="w-full border-collapse text-xs sm:text-sm text-slate-950 bg-white">
                        <thead>
                          <tr
                            className="font-bold text-center text-slate-950"
                            style={{ backgroundColor: catTheme.headerHex }}
                          >
                            <th
                              rowSpan={2}
                              className="border border-black py-2 px-2 w-10 text-center align-middle"
                              title="ติ๊กเลือกทั้งประเภทนี้"
                            >
                              <input
                                type="checkbox"
                                checked={allCatSelected}
                                onChange={() => toggleSelectCategory(projectsInCat)}
                                className="w-4 h-4 accent-slate-900 rounded cursor-pointer"
                              />
                            </th>
                            <th rowSpan={2} className="border border-black py-2 px-2 w-14 text-center align-middle">
                              ลำดับที่
                            </th>
                            <th rowSpan={2} className="border border-black py-2 px-3 text-center align-middle">
                              ชื่อโครงการ
                            </th>
                            <th rowSpan={2} className="border border-black py-2 px-3 w-48 text-center align-middle">
                              ผู้ขอรับงบ
                            </th>
                            <th rowSpan={2} className="border border-black py-2 px-2 w-28 text-center align-middle leading-tight">
                              งบประมาณ<br />(บาท)
                            </th>
                            <th colSpan={3} className="border border-black py-1.5 px-2 text-center align-middle">
                              ผลการติดตามโครงการ (คลิกติ๊ก ☑ ได้ทันที)
                            </th>
                            <th rowSpan={2} className="border border-black py-2 px-2 w-28 text-center align-middle">
                              จัดการ / พิมพ์
                            </th>
                          </tr>
                          <tr
                            className="font-bold text-center text-slate-950 text-xs"
                            style={{ backgroundColor: catTheme.headerHex }}
                          >
                            <th className="border border-black py-1.5 px-2 w-28">ดำเนินการแล้ว</th>
                            <th className="border border-black py-1.5 px-2 w-28">ขอขยายเวลา</th>
                            <th className="border border-black py-1.5 px-2 w-28">คืนเงิน</th>
                          </tr>
                        </thead>
                        <tbody>
                          {projectsInCat.map((p, idx) => {
                            const orgTheme = getOrgColorTheme(p.proposingOrg);
                            const isSelected = selectedProjectIds.includes(p.id);
                            const isComp = isProjectTrackingCompleted(p);
                            const isExt = isProjectTrackingExtended(p);
                            const isRef = isProjectTrackingRefunded(p);

                            return (
                              <tr
                                key={p.id}
                                className={`transition-colors ${
                                  isSelected ? 'bg-emerald-50/90' : 'bg-white hover:bg-slate-50'
                                }`}
                              >
                                {/* Row Selection Checkbox */}
                                <td
                                  onClick={() => toggleSelectProject(p.id)}
                                  className="border border-black py-2 px-2 text-center align-middle cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {}}
                                    className="w-4 h-4 accent-emerald-600 rounded cursor-pointer pointer-events-none"
                                  />
                                </td>

                                {/* Order Number */}
                                <td className="border border-black py-2 px-2 text-center font-semibold align-middle">
                                  {p.orderNumber || idx + 1}
                                </td>

                                {/* Project Name */}
                                <td className="border border-black py-2 px-3 align-middle">
                                  <div className="font-semibold text-slate-950 leading-snug">
                                    {p.projectName}
                                  </div>
                                </td>

                                {/* Proposing Organization (Color-coded matching เอกสารแนบ 2) */}
                                <td
                                  onClick={() =>
                                    setSelectedOrgFilter(
                                      selectedOrgFilter === p.proposingOrg ? 'all' : p.proposingOrg
                                    )
                                  }
                                  style={{ backgroundColor: orgTheme.bgHex }}
                                  className="border border-black py-2 px-3 font-medium text-slate-950 align-middle cursor-pointer hover:brightness-95 transition-all"
                                  title="คลิกเพื่อกรองเฉพาะหน่วยงานนี้"
                                >
                                  {p.proposingOrg}
                                </td>

                                {/* Budget Requested */}
                                <td className="border border-black py-2 px-3 text-right font-bold text-slate-950 align-middle">
                                  {p.budgetRequested.toLocaleString()}
                                </td>

                                {/* Tracking Column 1: ดำเนินการแล้ว */}
                                <td
                                  onClick={() =>
                                    handleToggleProjectTracking(p.id, 'trackingCompleted')
                                  }
                                  className="border border-black py-2 px-2 text-center align-middle cursor-pointer hover:bg-emerald-50/70 transition-colors select-none"
                                  title="คลิกเพื่อติ๊ก/ยกเลิก 'ดำเนินการแล้ว'"
                                >
                                  {isComp ? (
                                    <span className="inline-flex items-center justify-center w-5 h-5 bg-[#1e1b18] text-white rounded-[4px] text-xs font-bold shadow-xs">
                                      ✓
                                    </span>
                                  ) : (
                                    <span className="inline-block w-5 h-5 rounded-[4px] border border-dashed border-slate-300 hover:border-slate-500" />
                                  )}
                                </td>

                                {/* Tracking Column 2: ขอขยายเวลา */}
                                <td
                                  onClick={() =>
                                    handleToggleProjectTracking(p.id, 'trackingExtended')
                                  }
                                  className="border border-black py-2 px-2 text-center align-middle cursor-pointer hover:bg-amber-50/70 transition-colors select-none"
                                  title="คลิกเพื่อติ๊ก/ยกเลิก 'ขอขยายเวลา'"
                                >
                                  {isExt ? (
                                    <span className="inline-flex items-center justify-center w-5 h-5 bg-[#1e1b18] text-white rounded-[4px] text-xs font-bold shadow-xs">
                                      ✓
                                    </span>
                                  ) : (
                                    <span className="inline-block w-5 h-5 rounded-[4px] border border-dashed border-slate-300 hover:border-slate-500" />
                                  )}
                                </td>

                                {/* Tracking Column 3: คืนเงิน + ช่องกรอกยอดเงินที่คืน */}
                                <td
                                  onClick={() =>
                                    handleToggleProjectTracking(p.id, 'trackingRefunded')
                                  }
                                  className="border border-black py-1.5 px-2 text-center align-middle cursor-pointer hover:bg-rose-50/70 transition-colors select-none"
                                  title="คลิกเพื่อติ๊ก/ยกเลิก 'คืนเงิน' และกรอกระบุยอดเงินที่คืน (บาท)"
                                >
                                  {isRef ? (
                                    <div className="flex flex-col items-center gap-1">
                                      <span className="inline-flex items-center justify-center w-5 h-5 bg-[#1e1b18] text-white rounded-[4px] text-xs font-bold shadow-xs">
                                        ✓
                                      </span>
                                      <div
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex items-center gap-1 bg-rose-50 border border-rose-300 rounded px-1 py-0.5"
                                      >
                                        <input
                                          type="number"
                                          step="any"
                                          min={0}
                                          value={getProjectRefundAmount(p)}
                                          onChange={(e) =>
                                            handleUpdateProjectRefundAmount(
                                              p.id,
                                              Number(e.target.value)
                                            )
                                          }
                                          className="w-16 text-right font-black text-rose-700 bg-white border border-rose-300 rounded px-1 py-0.2 text-[11px] focus:outline-none focus:ring-1 focus:ring-rose-500"
                                          title="ระบุจำนวนเงินที่คืน (บาท)"
                                        />
                                        <span className="text-[10px] font-bold text-rose-800">
                                          บ.
                                        </span>
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="inline-block w-5 h-5 rounded-[4px] border border-dashed border-slate-300 hover:border-slate-500" />
                                  )}
                                </td>

                                {/* Quick Action Buttons */}
                                <td className="border border-black py-1.5 px-1.5 text-center align-middle">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPrintingProject(p);
                                        setPrintMode('single');
                                        setIsPrintOpen(true);
                                      }}
                                      className="p-1 text-slate-700 hover:text-emerald-700 hover:bg-emerald-100 rounded transition-colors cursor-pointer"
                                      title="พิมพ์แบบเสนอโครงการ 13 ช่อง (A4 แนวนอน)"
                                    >
                                      <Printer className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingProject(p);
                                        setIsBuilderOpen(true);
                                      }}
                                      className="p-1 text-slate-700 hover:text-amber-700 hover:bg-amber-100 rounded transition-colors cursor-pointer"
                                      title="แก้ไขรายละเอียดโครงการ"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleCloneProject(p, targetCarryYear)}
                                      className="p-1 text-slate-700 hover:text-indigo-700 hover:bg-indigo-100 rounded transition-colors cursor-pointer"
                                      title={`คัดลอกโครงการนี้ไปปี ${targetCarryYear}`}
                                    >
                                      <Copy className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}

                          {/* Category Colored Subtotal Row */}
                          <tr
                            className="font-black text-slate-950"
                            style={{ backgroundColor: catTheme.headerHex }}
                          >
                            <td className="border border-black py-2 px-2 text-center"></td>
                            <td className="border border-black py-2 px-2 text-center">รวม</td>
                            <td className="border border-black py-2 px-3 text-center">
                              {projectsInCat.length} โครงการ
                            </td>
                            <td className="border border-black py-2 px-3"></td>
                            <td className="border border-black py-2 px-3 text-right">
                              {subtotal.toLocaleString()}
                            </td>
                            <td className="border border-black py-2 px-2 text-center">
                              {compCount > 0 ? compCount : '-'}
                            </td>
                            <td className="border border-black py-2 px-2 text-center">
                              {extCount > 0 ? extCount : '-'}
                            </td>
                            <td className="border border-black py-2 px-2 text-center">
                              {refCount > 0 ? (
                                <div>
                                  <div>{refCount} โครงการ</div>
                                  <div className="text-[11px] text-rose-800 font-bold">
                                    (คืน{' '}
                                    {projectsInCat
                                      .reduce((s, p) => s + getProjectRefundAmount(p), 0)
                                      .toLocaleString()}{' '}
                                    บ.)
                                  </div>
                                </div>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="border border-black py-2 px-2"></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}

              {/* Bottom Grand Total Summary Table (Royal Blue #4472c4 & Green #70ad47 matching เอกสารแนบ 2) */}
              <div className="pt-2 overflow-x-auto">
                <table className="w-full border-collapse border border-black text-xs sm:text-sm">
                  <tbody>
                    <tr
                      className="font-bold text-white text-center"
                      style={{ backgroundColor: '#4472c4' }}
                    >
                      <td
                        rowSpan={2}
                        className="border border-black py-2.5 px-3 w-24 align-middle font-black"
                      >
                        รวมทั้งหมด
                      </td>
                      <td className="border border-black py-2 px-3 align-middle">
                        จำนวนโครงการ
                      </td>
                      <td className="border border-black py-2 px-3 w-48 align-middle"></td>
                      <td className="border border-black py-2 px-3 w-28 align-middle">
                        งบประมาณ
                      </td>
                      <td className="border border-black py-2 px-2 w-28 align-middle">
                        ดำเนินการแล้ว
                      </td>
                      <td className="border border-black py-2 px-2 w-28 align-middle">
                        ขอขยายเวลา
                      </td>
                      <td className="border border-black py-2 px-2 w-28 align-middle">
                        ไม่ได้ดำเนินการ
                      </td>
                      <td className="border border-black py-2 px-2 w-28 align-middle">
                        ที่ติ๊กเลือกไว้
                      </td>
                    </tr>
                    <tr
                      className="font-black text-white text-center text-sm"
                      style={{ backgroundColor: '#70ad47' }}
                    >
                      <td className="border border-black py-2 px-3 align-middle">
                        {filteredProjects.length} โครงการ
                      </td>
                      <td className="border border-black py-2 px-3 align-middle"></td>
                      <td className="border border-black py-2 px-3 text-right align-middle">
                        {filteredProjects
                          .reduce((s, p) => s + p.budgetRequested, 0)
                          .toLocaleString()}
                      </td>
                      <td className="border border-black py-2 px-2 align-middle">
                        {filteredProjects.filter((p) => isProjectTrackingCompleted(p)).length}
                      </td>
                      <td className="border border-black py-2 px-2 align-middle">
                        {filteredProjects.filter((p) => isProjectTrackingExtended(p)).length}
                      </td>
                      <td className="border border-black py-2 px-2 align-middle">
                        {
                          filteredProjects.filter(
                            (p) =>
                              !isProjectTrackingCompleted(p) &&
                              !isProjectTrackingExtended(p) &&
                              isProjectTrackingRefunded(p)
                          ).length
                        }
                      </td>
                      <td className="border border-black py-2 px-2 align-middle bg-emerald-800">
                        {selectedProjectIds.length} โครงการ
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    )}

      {/* ===================================================================== */}
      {/* 3. ตารางบริหารและเบิกจ่าย                                             */}
      {/* ===================================================================== */}
      {activeMainTab === 'management_disbursement' && (
        <div className="space-y-4">
          {/* KPI Cards Grid */}
          {renderKpiCardsGrid(false)}

          {/* Workflow Tabs (For Public Health Officers) */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-2 gap-2 shadow-sm text-xs font-medium">
            <button
              onClick={() => setActiveWorkflowTab('all')}
              className={`px-3 py-2 rounded-xl transition-all ${
                activeWorkflowTab === 'all'
                  ? 'bg-emerald-600 text-white font-bold shadow'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              ทั้งหมด ({yearProjects.length})
            </button>

            <button
              onClick={() => setActiveWorkflowTab('under_review')}
              className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeWorkflowTab === 'under_review'
                  ? 'bg-blue-600 text-white font-bold shadow'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>📥 หน่วยงานเสนอเข้า (รอตรวจ/รอ กก.)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-white/10">
                {pendingCount}
              </span>
            </button>

            <button
              onClick={() => setActiveWorkflowTab('approved')}
              className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeWorkflowTab === 'approved'
                  ? 'bg-emerald-600 text-white font-bold shadow'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>🟢 กก.อนุมัติแล้ว</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-white/10">
                {approvedCount}
              </span>
            </button>

            <button
              onClick={() => setActiveWorkflowTab('disbursing')}
              className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeWorkflowTab === 'disbursing'
                  ? 'bg-cyan-600 text-white font-bold shadow'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>💰 ติดตามการเบิกจ่ายจริง</span>
            </button>

            <button
              onClick={() => setActiveWorkflowTab('completed')}
              className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeWorkflowTab === 'completed'
                  ? 'bg-purple-600 text-white font-bold shadow'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>✅ ส่งรายงานผลและปิดโครงการ</span>
            </button>
          </div>

          {/* Comprehensive Color-Coded Filter Panel (Category, Organization, Tracking Status, Search) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5">
            {/* Row 1: Search + Quick Selects + View Mode Switcher */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ค้นหาชื่อโครงการ, หน่วยงานผู้ขอรับงบ, ผู้รับผิดชอบ หรือรหัส..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Org dropdown */}
                <select
                  value={selectedOrgFilter}
                  onChange={(e) => setSelectedOrgFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-medium"
                >
                  <option value="all">ทุกหน่วยงานผู้ขอ ({distinctOrgs.length} หน่วยงาน)</option>
                  {distinctOrgs.map((org) => (
                    <option key={org} value={org}>
                      {org} ({yearProjects.filter((p) => p.proposingOrg === org).length})
                    </option>
                  ))}
                </select>

                {/* Status dropdown */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-medium"
                >
                  <option value="all">ทุกมติ กก.</option>
                  <option value="submitted">รอพิจารณา / เสนอขอ</option>
                  <option value="approved">อนุมัติแล้ว</option>
                  <option value="approved_reduced">อนุมัติปรับลดงบ</option>
                  <option value="completed">เสร็จสิ้น / รายงานผลแล้ว</option>
                  <option value="draft">ฉบับร่าง</option>
                  <option value="rejected">ไม่อนุมัติ</option>
                </select>

                {/* Reset all filters button */}
                {(selectedCategory !== 'all' ||
                  selectedOrgFilter !== 'all' ||
                  trackingFilter !== 'all' ||
                  statusFilter !== 'all' ||
                  search.trim() !== '') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('all');
                      setSelectedOrgFilter('all');
                      setTrackingFilter('all');
                      setStatusFilter('all');
                      setSearch('');
                    }}
                    className="px-2.5 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>ล้างตัวกรอง</span>
                  </button>
                )}

                {/* View Mode Switcher */}
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMainTab('attachment2_summary');
                      setTableViewMode('attachment2_tracking');
                    }}
                    className="px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  >
                    <ListChecks className="w-3.5 h-3.5" />
                    <span>ตารางแยกสี & ปุ่มติ๊ก (เอกสารแนบ 2)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMainTab('management_disbursement');
                      setTableViewMode('detailed_management');
                    }}
                    className="px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer bg-emerald-600 text-white shadow-sm"
                  >
                    <Table className="w-3.5 h-3.5" />
                    <span>ตารางบริหาร & เบิกจ่ายละเอียด</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Row 2: Color-Coded Category Filter Pills (Matching เอกสารแนบ 2 Colors) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                <span>🎨 กรองตามประเภทโครงการ (แยกสีตามประเภทกองทุน สปสช.):</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-bold transition-all cursor-pointer border ${
                    selectedCategory === 'all'
                      ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                  }`}
                >
                  ทุกประเภท ({yearProjects.length})
                </button>
                {NHSO_FUND_CATEGORIES.map((cat) => {
                  const count = yearProjects.filter((p) => (p.categoryNumber || 1) === cat.number).length;
                  const catTheme = getCategoryColorTheme(cat.number);
                  const isSelected = selectedCategory === cat.number;
                  return (
                    <button
                      key={cat.number}
                      type="button"
                      onClick={() =>
                        setSelectedCategory(isSelected ? 'all' : cat.number)
                      }
                      style={{
                        backgroundColor: isSelected || count > 0 ? catTheme.headerHex : undefined,
                        borderColor: catTheme.borderHex,
                      }}
                      className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 border cursor-pointer ${
                        isSelected
                          ? 'ring-2 ring-offset-1 ring-slate-900 dark:ring-white font-black text-slate-950 shadow-md scale-[1.02]'
                          : count > 0
                          ? 'font-bold text-slate-950 opacity-90 hover:opacity-100'
                          : 'bg-slate-50 dark:bg-slate-800/50 text-slate-400 border-slate-200 dark:border-slate-800 opacity-60'
                      }`}
                      title={cat.title}
                    >
                      <span>ประเภทที่ {cat.number}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/15 text-slate-950 font-extrabold">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row 3: Color-Coded Proposing Organization Filter Pills (แยกสีตามหน่วยงานผู้ขอรับงบ) */}
            {distinctOrgs.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                  <span>🏢 กรองตามหน่วยงาน / กลุ่มองค์กรผู้ขอรับงบ (แยกสีชัดเจน):</span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setSelectedOrgFilter('all')}
                    className={`px-2.5 py-1 rounded-lg whitespace-nowrap font-bold transition-all cursor-pointer border ${
                      selectedOrgFilter === 'all'
                        ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900 shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    ทุกหน่วยงาน ({distinctOrgs.length})
                  </button>
                  {distinctOrgs.map((org) => {
                    const orgTheme = getOrgColorTheme(org);
                    const count = yearProjects.filter((p) => p.proposingOrg === org).length;
                    const isSelected = selectedOrgFilter === org;
                    return (
                      <button
                        key={org}
                        type="button"
                        onClick={() => setSelectedOrgFilter(isSelected ? 'all' : org)}
                        style={{
                          backgroundColor:
                            orgTheme.bgHex !== '#ffffff' ? orgTheme.bgHex : '#f8fafc',
                          borderColor: orgTheme.borderHex,
                        }}
                        className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 border text-slate-950 cursor-pointer ${
                          isSelected
                            ? 'ring-2 ring-offset-1 ring-emerald-600 font-black shadow-sm scale-[1.02]'
                            : 'font-semibold opacity-90 hover:opacity-100'
                        }`}
                      >
                        <span>{org}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 font-bold">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Row 4: Tracking Status Filter Pills & Selection Filter */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-500 font-semibold mr-1">
                  ☑️ กรองผลการติดตามโครงการ:
                </span>
                <button
                  type="button"
                  onClick={() => setTrackingFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer border ${
                    trackingFilter === 'all'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  ทั้งหมด ({yearProjects.length})
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setTrackingFilter(trackingFilter === 'completed' ? 'all' : 'completed')
                  }
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer border flex items-center gap-1 ${
                    trackingFilter === 'completed'
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  }`}
                >
                  <span>☑ ดำเนินการแล้ว ({yearCompletedCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setTrackingFilter(trackingFilter === 'extended' ? 'all' : 'extended')
                  }
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer border flex items-center gap-1 ${
                    trackingFilter === 'extended'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  }`}
                >
                  <span>⏳ ขอขยายเวลา ({yearExtendedCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setTrackingFilter(trackingFilter === 'refunded' ? 'all' : 'refunded')
                  }
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer border flex items-center gap-1 ${
                    trackingFilter === 'refunded'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                  }`}
                >
                  <span>
                    ↩️ คืนเงิน ({yearRefundedCount} โครงการ • รวม {totalYearRefundAmount.toLocaleString()} บ.)
                  </span>
                </button>
                {totalYearRefundAmount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      syncRefundsIntoSettings(projects, true);
                      setIsRevenueModalOpen(true);
                      showToast(
                        `รวบรวมยอดเงินคืนรวม ${totalYearRefundAmount.toLocaleString()} บาท เข้าสู่ "งบข้อ 4 เงินยกยอดจากปีเก่า" เรียบร้อยแล้ว!`
                      );
                    }}
                    className="px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer border bg-purple-600 hover:bg-purple-500 text-white border-purple-500 shadow-xs flex items-center gap-1"
                    title="รวบรวมยอดเงินคืนทั้งหมดไปไว้ในงบข้อ 4 เงินยกยอดจากปีเก่า และเปิดหน้าต่างตั้งค่างบ"
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>ส่งยอดคืน ({totalYearRefundAmount.toLocaleString()} บ.) ไปงบข้อ 4 เงินยกยอด</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    setTrackingFilter(
                      trackingFilter === 'selected_only' ? 'all' : 'selected_only'
                    )
                  }
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer border flex items-center gap-1 ${
                    trackingFilter === 'selected_only'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>เฉพาะชุดที่ติ๊กเลือก ({selectedProjectIds.length})</span>
                </button>
              </div>
            </div>
          </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                รายการโครงการ ({filteredProjects.length} โครงการ)
              </h3>
              <span className="text-xs text-slate-500">
                รวมงบที่ขอ:{' '}
                <strong className="text-emerald-600">
                  {filteredProjects.reduce((s, p) => s + p.budgetRequested, 0).toLocaleString()}
                </strong>{' '}
                บาท
              </span>
              {filteredProjects.some((p) => isProjectTrackingRefunded(p) || getProjectRefundAmount(p) > 0) && (
                <div className="flex flex-wrap items-center gap-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 px-3 py-1 rounded-xl text-xs">
                  <span className="font-bold text-rose-700 dark:text-rose-300">
                    ↩️ ยอดเงินที่คืนรวม:{' '}
                    {filteredProjects
                      .reduce((s, p) => s + getProjectRefundAmount(p), 0)
                      .toLocaleString()}{' '}
                    บาท
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      syncRefundsIntoSettings(projects, true);
                      setIsRevenueModalOpen(true);
                    }}
                    className="px-2.5 py-0.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] shadow-xs transition-colors cursor-pointer"
                  >
                    📥 รวบรวมเข้า "งบข้อ 4 เงินยกยอดจากปีเก่า"
                  </button>
                </div>
              )}
            </div>

            <div className="text-xs text-slate-500">
              แสดงข้อมูลปีงบ: <strong>{selectedYear === 'all' ? 'ทุกปี' : selectedYear}</strong>
            </div>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium">ไม่พบโครงการตามเงื่อนไขที่เลือก</p>
              <p className="text-xs text-slate-500">
                คุณสามารถสร้างโครงการใหม่ หรือคัดลอกจากแม่แบบปี 2569 ได้ทันที
              </p>
              <button
                onClick={() => {
                  setEditingProject(null);
                  setIsBuilderOpen(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition-colors inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> สร้างโครงการใหม่
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-2 w-10 text-center">เลือก</th>
                    <th className="py-3 px-2 w-12 text-center">#</th>
                    <th className="py-3 px-3">ชื่อโครงการ / แผนงาน</th>
                    <th className="py-3 px-3 w-44">ผู้ขอรับงบ / ผู้รับผิดชอบ</th>
                    <th className="py-3 px-3 w-28">ประเภท</th>
                    <th className="py-3 px-3 w-28 text-right">งบที่ขอ (บาท)</th>
                    <th className="py-3 px-3 w-28 text-right">เบิกจ่ายแล้ว</th>
                    <th className="py-3 px-3 w-36 text-center">ผลการติดตาม</th>
                    <th className="py-3 px-3 w-32 text-center">มติกรรมการ</th>
                    <th className="py-3 px-3 w-40 text-center">เมนูจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredProjects.map((p, idx) => {
                    const cat = NHSO_FUND_CATEGORIES.find((c) => c.number === (p.categoryNumber || 1));
                    const catTheme = getCategoryColorTheme(p.categoryNumber || 1);
                    const orgTheme = getOrgColorTheme(p.proposingOrg);
                    const isSelected = selectedProjectIds.includes(p.id);
                    const approvedAmount =
                      p.budgetApproved && p.budgetApproved > 0
                        ? p.budgetApproved
                        : p.budgetRequested;
                    const disbursed = p.disbursedAmount || 0;
                    const percent =
                      approvedAmount > 0 ? Math.round((disbursed / approvedAmount) * 100) : 0;

                    return (
                      <tr
                        key={p.id}
                        className={`transition-colors ${
                          isSelected
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/30'
                            : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td
                          onClick={() => toggleSelectProject(p.id)}
                          className="py-3 px-2 text-center cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-4 h-4 accent-emerald-600 rounded pointer-events-none"
                          />
                        </td>

                        <td className="py-3 px-2 text-center font-bold text-slate-400">
                          {p.orderNumber || idx + 1}
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 dark:text-slate-100 line-clamp-2">
                            {p.projectName}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                            <span>{p.projectCode || `กองทุน-${p.fiscalYear.slice(-2)}`}</span>
                            <span>•</span>
                            <span>ปีงบ {p.fiscalYear}</span>
                            {p.activityGroups && p.activityGroups.length > 1 && (
                              <>
                                <span>•</span>
                                <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200/60 dark:border-indigo-800/60 text-[10px]">
                                  📋 {p.activityGroups.length} กิจกรรม
                                </span>
                              </>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span
                            style={{
                              backgroundColor:
                                orgTheme.bgHex !== '#ffffff' ? orgTheme.bgHex : undefined,
                            }}
                            className="inline-block px-2 py-0.5 rounded font-semibold text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700"
                          >
                            {p.proposingOrg}
                          </span>
                          <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {p.responsiblePerson}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span
                            style={{
                              backgroundColor: catTheme.headerHex,
                              borderColor: catTheme.borderHex,
                            }}
                            className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold text-slate-950 border"
                            title={cat?.title}
                          >
                            ประเภทที่ {p.categoryNumber || 1}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                          {p.budgetRequested.toLocaleString()}
                        </td>

                        {/* Disbursed Amount with Interactive Button */}
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => setDisbursementProject(p)}
                            className="group/disb text-right block w-full p-1 -m-1 rounded-lg hover:bg-cyan-50 dark:hover:bg-cyan-950/40 transition-colors cursor-pointer"
                            title="คลิกเพื่อบันทึกการเบิกจ่าย / ระบุยอดเงินคืนเข้ากองทุนฯ"
                          >
                            {disbursed > 0 ? (
                              <div>
                                <div className="font-bold text-cyan-600 dark:text-cyan-400 group-hover/disb:underline">
                                  {disbursed.toLocaleString()}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {percent}% {disbursed >= approvedAmount && '✓ ครบ'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[11px] text-cyan-600 dark:text-cyan-400 font-semibold group-hover/disb:underline flex items-center justify-end gap-1">
                                <Coins className="w-3 h-3 inline" /> บันทึกเบิก
                              </span>
                            )}
                            {isProjectTrackingRefunded(p) && (
                              <div className="mt-1 inline-block px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 font-bold text-[10px] border border-rose-200 dark:border-rose-800">
                                คืนเงิน {getProjectRefundAmount(p).toLocaleString()} บ.
                                {getProjectRefundAmount(p) >= approvedAmount ? ' (100%)' : ''}
                              </div>
                            )}
                          </button>
                        </td>

                        {/* Quick Tracking Pills + Inline Refund Amount Input */}
                        <td className="py-3 px-2 text-center">
                          <div className="flex flex-col items-center gap-1.5">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  handleToggleProjectTracking(p.id, 'trackingCompleted')
                                }
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                                  isProjectTrackingCompleted(p)
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : 'bg-slate-100 text-slate-400 border-slate-200'
                                }`}
                                title="ดำเนินการแล้ว"
                              >
                                ✓ ดำเนินการ
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleToggleProjectTracking(p.id, 'trackingExtended')
                                }
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                                  isProjectTrackingExtended(p)
                                    ? 'bg-amber-500 text-white border-amber-500'
                                    : 'bg-slate-100 text-slate-400 border-slate-200'
                                }`}
                                title="ขอขยายเวลา"
                              >
                                ⏳ ขยาย
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleToggleProjectTracking(p.id, 'trackingRefunded')
                                }
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                                  isProjectTrackingRefunded(p)
                                    ? 'bg-rose-600 text-white border-rose-600'
                                    : 'bg-slate-100 text-slate-400 border-slate-200'
                                }`}
                                title="คืนเงิน"
                              >
                                ↩️ คืนเงิน
                              </button>
                            </div>

                            {/* Inline Refund Amount Input when คืนเงิน is active */}
                            {isProjectTrackingRefunded(p) && (
                              <div className="flex items-center justify-center gap-1 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 rounded-lg px-2 py-1 shadow-2xs">
                                <span className="text-[10px] font-bold text-rose-800 dark:text-rose-300 whitespace-nowrap">
                                  ยอดคืน:
                                </span>
                                <input
                                  type="number"
                                  step="any"
                                  min={0}
                                  value={getProjectRefundAmount(p)}
                                  onChange={(e) =>
                                    handleUpdateProjectRefundAmount(
                                      p.id,
                                      Number(e.target.value)
                                    )
                                  }
                                  className="w-20 px-1.5 py-0.5 text-right rounded border border-rose-400 bg-white dark:bg-slate-900 font-black text-rose-700 dark:text-rose-300 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                                  title="กรอกระบุยอดจำนวนเงินที่คืน (บาท)"
                                />
                                <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300">
                                  บ.
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateProjectRefundAmount(p.id, approvedAmount)
                                  }
                                  className={`px-1.5 py-0.5 rounded text-[9.5px] font-extrabold border cursor-pointer transition-colors ${
                                    getProjectRefundAmount(p) >= approvedAmount
                                      ? 'bg-rose-600 text-white border-rose-600'
                                      : 'bg-white hover:bg-rose-100 text-rose-700 border-rose-300'
                                  }`}
                                  title={`ตั้งเป็นคืนเงิน 100% (${approvedAmount.toLocaleString()} บาท)`}
                                >
                                  100%
                                </button>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Committee Resolution / Status */}
                        <td className="py-3 px-3 text-center">
                          {p.status === 'completed' && (
                            <button
                              onClick={() => openApprovalModal(p)}
                              className="px-2.5 py-1 bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 hover:bg-purple-200 rounded-full font-bold text-[10px] inline-flex items-center gap-1 transition-colors"
                            >
                              <CheckCircle2 className="w-3 h-3 text-purple-600" />
                              <span>อนุมัติ & เสร็จสิ้น</span>
                            </button>
                          )}
                          {p.status === 'approved' && (
                            <button
                              onClick={() => openApprovalModal(p)}
                              className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 rounded-full font-bold text-[10px] inline-flex items-center gap-1 transition-colors"
                            >
                              <Check className="w-3 h-3" /> อนุมัติเต็ม
                            </button>
                          )}
                          {p.status === 'approved_reduced' && (
                            <button
                              onClick={() => openApprovalModal(p)}
                              className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-200 rounded-full font-bold text-[10px] inline-flex items-center gap-1 transition-colors"
                            >
                              <Check className="w-3 h-3" /> อนุมัติปรับลด
                            </button>
                          )}
                          {p.status === 'rejected' && (
                            <button
                              onClick={() => openApprovalModal(p)}
                              className="px-2.5 py-1 bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 hover:bg-red-200 rounded-full font-bold text-[10px] inline-flex items-center gap-1 transition-colors"
                            >
                              <X className="w-3 h-3" /> ไม่อนุมัติ
                            </button>
                          )}
                          {(p.status === 'submitted' || p.status === 'under_review') && (
                            <button
                              onClick={() => openApprovalModal(p)}
                              className="px-2.5 py-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 rounded-full font-bold text-[10px] inline-flex items-center gap-1 transition-colors"
                            >
                              <Clock className="w-3 h-3" /> บันทึกมติ กก.
                            </button>
                          )}
                          {p.status === 'draft' && (
                            <button
                              onClick={() => openApprovalModal(p)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full font-medium text-[10px]"
                            >
                              ร่างโครงการ
                            </button>
                          )}
                        </td>

                        {/* Action Menu */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                setPrintingProject(p);
                                setPrintMode('single');
                                setIsPrintOpen(true);
                              }}
                              className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="พิมพ์แบบ 13 ช่อง (A4 แนวนอน)"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => {
                                setEditingProject(p);
                                setIsBuilderOpen(true);
                              }}
                              className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="ตรวจสอบ / แก้ไขโครงการ"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => setDisbursementProject(p)}
                              className="p-1.5 text-cyan-700 bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/60 dark:hover:bg-cyan-900 rounded-lg transition-colors font-bold shadow-xs"
                              title="บันทึกการเบิกจ่าย & ติดตามผลการดำเนินงาน"
                            >
                              <Coins className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleCloneProject(p, targetCarryYear)}
                              className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title={`คัดลอกเป็นโครงการปี ${targetCarryYear}`}
                            >
                              <Copy className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleDeleteProject(p.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="ลบโครงการ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )}

      {/* Committee Approval / Resolution Modal */}
      {approvalModalProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-xl shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/15 text-emerald-600 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                    บันทึกมติที่ประชุมคณะกรรมการบริหารกองทุนฯ
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    เจ้าหน้าที่กองสาธารณสุขบันทึกผลการพิจารณาและการแก้ไขสถานะหลังการประชุม
                  </p>
                </div>
              </div>
              <button
                onClick={() => setApprovalModalProject(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1 border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {approvalModalProject.projectName}
                </div>
                <div className="text-slate-500 flex flex-wrap items-center gap-3">
                  <span>ผู้ขอรับงบ: <strong>{approvalModalProject.proposingOrg}</strong></span>
                  <span>•</span>
                  <span>
                    วงเงินที่เสนอขอ:{' '}
                    <strong className="text-emerald-600">
                      {approvalModalProject.budgetRequested.toLocaleString()} บาท
                    </strong>
                  </span>
                </div>
              </div>

              {/* Meeting info inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    ครั้งที่ประชุมกรรมการ:
                  </label>
                  <input
                    type="text"
                    value={meetingRound}
                    onChange={(e) => setMeetingRound(e.target.value)}
                    placeholder="เช่น ครั้งที่ 1/2570"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    วันที่ประชุม:
                  </label>
                  <input
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
              </div>

              {/* Decision Options */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-800 dark:text-slate-200 block">
                  มติที่ประชุมคณะกรรมการฯ:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setApprovalDecision('approve')}
                    className={`py-2 px-2.5 rounded-xl font-bold border transition-all text-center text-xs ${
                      approvalDecision === 'approve'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    🟢 อนุมัติเต็ม
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setApprovalDecision('approve_reduced');
                      setReducedBudgetAmount(approvalModalProject.budgetRequested);
                    }}
                    className={`py-2 px-2.5 rounded-xl font-bold border transition-all text-center text-xs ${
                      approvalDecision === 'approve_reduced'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    🟡 ปรับลดงบ
                  </button>
                  <button
                    type="button"
                    onClick={() => setApprovalDecision('revision')}
                    className={`py-2 px-2.5 rounded-xl font-bold border transition-all text-center text-xs ${
                      approvalDecision === 'revision'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    📝 ส่งกลับแก้ไข
                  </button>
                  <button
                    type="button"
                    onClick={() => setApprovalDecision('reject')}
                    className={`py-2 px-2.5 rounded-xl font-bold border transition-all text-center text-xs ${
                      approvalDecision === 'reject'
                        ? 'bg-red-600 text-white border-red-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    🔴 ไม่อนุมัติ
                  </button>
                </div>
              </div>

              {/* Reduced Amount input */}
              {approvalDecision === 'approve_reduced' && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl space-y-1.5 animate-in fade-in duration-150">
                  <label className="block font-semibold text-amber-900 dark:text-amber-200">
                    ระบุจำนวนเงินที่อนุมัติ (บาท):
                  </label>
                  <input
                    type="number"
                    value={reducedBudgetAmount}
                    onChange={(e) => setReducedBudgetAmount(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 font-bold text-amber-700 dark:text-amber-300"
                  />
                  <span className="text-[10px] text-amber-700 dark:text-amber-400">
                    เดิมเสนอขอ {approvalModalProject.budgetRequested.toLocaleString()} บาท (ปรับลด{' '}
                    {(approvalModalProject.budgetRequested - reducedBudgetAmount).toLocaleString()}{' '}
                    บาท)
                  </span>
                </div>
              )}

              {/* Comment text */}
              <div>
                <label className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">
                  ความเห็น / มติ / เงื่อนไขของคณะกรรมการบริหารกองทุนฯ:
                </label>
                <textarea
                  rows={2}
                  value={committeeComment}
                  onChange={(e) => setCommitteeComment(e.target.value)}
                  placeholder="เช่น เห็นชอบอนุมัติตามที่เสนอ หรือ ปรับลดรายการค่าวิทยากรลงเหลือ 6 ชั่วโมง..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              {/* Officer Notes */}
              <div>
                <label className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">
                  บันทึกข้อความของเจ้าหน้าที่กองสาธารณสุข:
                </label>
                <input
                  type="text"
                  value={officerNotes}
                  onChange={(e) => setOfficerNotes(e.target.value)}
                  placeholder="เช่น เจ้าหน้าที่ตรวจสอบเอกสารและแผนงานตามระเบียบเรียบร้อยแล้ว"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Officer Recorder */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                    <span>เจ้าหน้าที่ผู้บันทึกข้อมูล:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-normal text-[11px]">
                      (สามารถพิมพ์แก้ไขชื่อ-นามสกุล / ตำแหน่งได้อิสระ)
                    </span>
                  </label>
                  {currentUser?.fullName && (
                    <button
                      type="button"
                      onClick={() =>
                        setOfficerRecorder(
                          `${currentUser.fullName} (${currentUser.roleTitle?.split(' ')[0] || 'เจ้าพนักงานสาธารณสุข'})`
                        )
                      }
                      className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
                    >
                      ใช้ชื่อฉัน ({currentUser.fullName.split(' ')[0]})
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={officerRecorder}
                  onChange={(e) => setOfficerRecorder(e.target.value)}
                  placeholder="เช่น พันจ่าเอกอานัส เด็นหมาด (เจ้าพนักงานสาธารณสุข)"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 truncate max-w-[280px]">
                ผู้บันทึก: <strong className="text-slate-700 dark:text-slate-300">{officerRecorder || 'ยังไม่ระบุ'}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setApprovalModalProject(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSaveApproval}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow transition-colors"
                >
                  บันทึกมติที่ประชุม
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Builder Modal */}
      <NhsoProjectBuilderModal
        key={isBuilderOpen ? (editingProject?.id || 'new_builder_project') : 'closed'}
        isOpen={isBuilderOpen}
        onClose={() => {
          setIsBuilderOpen(false);
          setEditingProject(null);
        }}
        onSave={handleSaveProject}
        initialProject={editingProject}
        settings={fundSettings}
        existingProjects={projects}
      />

      {/* Settings Modal */}
      <NhsoFundSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={fundSettings}
        onSave={handleSaveSettings}
      />

      {/* Print View Modal */}
      <PrintNhsoProjectModal
        isOpen={isPrintOpen}
        onClose={() => {
          setIsPrintOpen(false);
          setPrintingProject(null);
        }}
        project={printingProject}
        allProjects={projects}
        settings={fundSettings}
        defaultMode={printMode}
        targetFiscalYear={selectedYear}
        selectedProjectIds={selectedProjectIds}
        onToggleTracking={handleToggleProjectTracking}
      />

      {/* Disbursement & Implementation Tracking Modal */}
      {disbursementProject && (
        <NhsoDisbursementModal
          isOpen={!!disbursementProject}
          onClose={() => setDisbursementProject(null)}
          project={disbursementProject}
          onSave={handleSaveProject}
          currentUserFullName={officerRecorder}
        />
      )}

      {/* Fund Revenue Sources & Clause 10(4) Meeting Budget Modal */}
      <NhsoFundRevenueModal
        isOpen={isRevenueModalOpen}
        onClose={() => setIsRevenueModalOpen(false)}
        fiscalYear={selectedYear !== 'all' ? selectedYear : fundSettings.fiscalYear || '2570'}
        settings={fundSettings}
        projects={projects}
        onSaveSettings={handleSaveSettings}
        onUpsertProject={handleSaveProject}
      />
    </div>
  );
};
