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
} from 'lucide-react';
import {
  NhsoProject,
  UserRole,
  NhsoFundSettings,
  NHSO_FUND_CATEGORIES,
} from '../types/index.ts';
import {
  getStoredNhsoFundProjects,
  saveStoredNhsoFundProjects,
  getStoredNhsoFundSettings,
  saveStoredNhsoFundSettings,
} from '../services/sheetsSync.ts';
import {
  saveNhsoFundProjectToFirestore,
  deleteNhsoFundProjectFromFirestore,
  saveNhsoFundSettingsToFirestore,
} from '../services/firebaseService.ts';
import { NhsoProjectBuilderModal } from './NhsoProjectBuilderModal.tsx';
import { NhsoFundSettingsModal } from './NhsoFundSettingsModal.tsx';
import { PrintNhsoProjectModal } from './PrintNhsoProjectModal.tsx';
import { NhsoDisbursementModal } from './NhsoDisbursementModal.tsx';

interface NhsoFundViewProps {
  projects?: NhsoProject[];
  userRole?: UserRole;
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
  onAddNew,
  onApproveProject: externalApprove,
  onUpdateProject: externalUpdate,
  onDeleteProject: externalDelete,
  settings: externalSettings,
  onSaveSettings: externalSaveSettings,
}) => {
  // Local or external state
  const [internalProjects, setInternalProjects] = useState<NhsoProject[]>(() =>
    getStoredNhsoFundProjects()
  );
  const [fundSettings, setFundSettings] = useState<NhsoFundSettings>(() =>
    externalSettings || getStoredNhsoFundSettings()
  );

  const projects = externalProjects && externalProjects.length > 0 ? externalProjects : internalProjects;

  // Filter & Search states
  const [selectedYear, setSelectedYear] = useState<string>('2570');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrgFilter, setSelectedOrgFilter] = useState<string>('all');
  const [activeWorkflowTab, setActiveWorkflowTab] = useState<'all' | 'under_review' | 'approved' | 'disbursing' | 'completed'>('all');

  // Modals state
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [printMode, setPrintMode] = useState<'single' | 'summary'>('single');
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
  const [officerRecorder, setOfficerRecorder] = useState<string>(
    'พันจ่าเอกอานัส  เด่นหมัด (เจ้าพนักงานสาธารณสุข)'
  );
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

  // Quick clone from template
  const handleCloneProject = (sourceProj: NhsoProject) => {
    const cloned: NhsoProject = {
      ...sourceProj,
      id: `NHSO-70-${Date.now().toString().slice(-4)}`,
      fiscalYear: '2570',
      projectCode: `กองทุน-70-00${projects.filter((p) => p.fiscalYear === '2570').length + 1}`,
      projectName: `${sourceProj.projectName.replace('2569', '2570')} (ฉบับร่าง 2570)`,
      status: 'submitted',
      committeeDecision: 'pending',
      committeeComment: 'คัดลอกมาจากแม่แบบปี 2569 เพื่อเสนอในรอบปี 2570',
      budgetApproved: 0,
      disbursedAmount: 0,
      disbursementRecords: [],
      implementationStatus: 'not_started',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEditingProject(cloned);
    setIsBuilderOpen(true);
  };

  // Filtered project list
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // Year match
      if (selectedYear !== 'all' && p.fiscalYear !== selectedYear) return false;
      // Category match
      if (selectedCategory !== 'all' && (p.categoryNumber || 1) !== selectedCategory) return false;
      // Status match
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      // Workflow Tab filter
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
        if (p.status !== 'completed' && p.implementationStatus !== 'completed_reported')
          return false;
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
    });
  }, [
    projects,
    selectedYear,
    selectedCategory,
    statusFilter,
    selectedOrgFilter,
    activeWorkflowTab,
    search,
  ]);

  // Statistics for current selected year
  const yearProjects = useMemo(() => {
    return selectedYear === 'all' ? projects : projects.filter((p) => p.fiscalYear === selectedYear);
  }, [projects, selectedYear]);

  const totalFundBudget = fundSettings.totalFundBudget || 0;
  const totalBudgetRequested = yearProjects.reduce((acc, p) => acc + (p.budgetRequested || 0), 0);
  const totalBudgetApproved = yearProjects.reduce(
    (acc, p) =>
      acc +
      (p.status === 'approved' || p.status === 'approved_reduced'
        ? p.budgetApproved || p.budgetRequested
        : 0),
    0
  );
  const totalDisbursedActual = yearProjects.reduce((acc, p) => acc + (p.disbursedAmount || 0), 0);
  const remainingBudget = totalFundBudget > 0 ? totalFundBudget - totalBudgetApproved : 0;
  const approvedCount = yearProjects.filter(
    (p) =>
      p.status === 'approved' ||
      p.status === 'approved_reduced' ||
      p.committeeDecision === 'approve'
  ).length;
  const pendingCount = yearProjects.filter(
    (p) => p.status === 'submitted' || p.status === 'under_review' || p.status === 'draft'
  ).length;

  // Distinct Orgs for filter
  const distinctOrgs = useMemo(() => {
    const set = new Set<string>();
    yearProjects.forEach((p) => {
      if (p.proposingOrg) set.add(p.proposingOrg);
    });
    return Array.from(set);
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
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              เขียนเสนอโครงการใหม่ ({selectedYear})
            </button>

            <button
              onClick={() => {
                setPrintingProject(null);
                setPrintMode('summary');
                setIsPrintOpen(true);
              }}
              className="px-3.5 py-2.5 bg-white/15 hover:bg-white/25 text-white font-medium text-xs rounded-xl backdrop-blur-md border border-white/20 flex items-center gap-1.5 transition-all"
              title="พิมพ์แบบสรุปภาพรวมโครงการทั้งหมดเสนอคณะกรรมการฯ"
            >
              <Printer className="w-4 h-4" />
              พิมพ์สรุปภาพรวม A4
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium text-xs rounded-xl backdrop-blur-md border border-white/15 flex items-center gap-1.5 transition-all"
              title="ตั้งค่าผู้ลงนาม 3 ระดับและอัตราค่าใช้จ่ายมาตรฐาน"
            >
              <Sliders className="w-4 h-4" />
              ตั้งค่าระบบ & ผู้ลงนาม
            </button>
          </div>
        </div>

        {/* Fiscal Year Switcher Bar */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-emerald-200 font-medium">รอบปีงบประมาณ:</span>
            <div className="flex bg-black/25 p-1 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => setSelectedYear('2570')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  selectedYear === '2570'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                <span>🌟 ปีงบ 2570 (ปีปัจจุบัน / รับคำขอ)</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/20">
                  {projects.filter((p) => p.fiscalYear === '2570').length}
                </span>
              </button>

              <button
                onClick={() => setSelectedYear('2569')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  selectedYear === '2569'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                <span>📜 ปีงบ 2569 (ประวัติ / 27 แม่แบบ)</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/20">
                  {projects.filter((p) => p.fiscalYear === '2569').length}
                </span>
              </button>

              <button
                onClick={() => setSelectedYear('all')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
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

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. กรอบงบกองทุน (พร้อมช่องแก้ไขโดยตรงสำหรับปี 70 ที่ยังไม่ได้ตั้งงบ) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm relative group">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>กรอบงบกองทุน {selectedYear !== 'all' ? `ปี ${selectedYear}` : ''}</span>
            <div className="p-1.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 rounded-lg">
              <Coins className="w-4 h-4" />
            </div>
          </div>

          {isEditingFundBudget ? (
            <div className="mt-1 space-y-1.5 animate-in fade-in-50 duration-150">
              <input
                type="number"
                value={tempFundBudget}
                onChange={(e) => setTempFundBudget(e.target.value)}
                placeholder="ระบุงบประมาณ เช่น 650000"
                className="w-full px-2 py-1 text-sm font-bold border border-emerald-500 rounded-lg bg-emerald-50/50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                autoFocus
              />
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSaveFundBudget}
                  className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded"
                >
                  บันทึก
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingFundBudget(false)}
                  className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] rounded"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => {
                setTempFundBudget(String(totalFundBudget || ''));
                setIsEditingFundBudget(true);
              }}
              className="cursor-pointer group-hover:bg-slate-50 dark:group-hover:bg-slate-800/40 rounded-lg p-1 -m-1 transition-colors"
              title="คลิกเพื่อแก้ไขกรอบงบประมาณ"
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
                      ยังไม่ได้ตั้งงบ (คลิกกรอก)
                    </span>
                  )}
                </span>
                <Edit className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {totalFundBudget > 0 ? 'คลิกที่ตัวเลขเพื่อแก้ไข' : 'คลิกเพื่อระบุวงเงินปี 70'}
              </p>
            </div>
          )}
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
      </div>

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

      {/* Filter and Categories Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        {/* Search & Select Controls */}
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อโครงการ, หน่วยงานผู้ขอ, ผู้รับผิดชอบ หรือรหัส..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Org filter */}
            <select
              value={selectedOrgFilter}
              onChange={(e) => setSelectedOrgFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300"
            >
              <option value="all">ทุกหน่วยงานผู้ขอ ({distinctOrgs.length})</option>
              {distinctOrgs.map((org) => (
                <option key={org} value={org}>
                  {org}
                </option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="submitted">รอพิจารณา / เสนอขอ</option>
              <option value="approved">อนุมัติแล้ว</option>
              <option value="approved_reduced">อนุมัติปรับลดงบ</option>
              <option value="draft">ฉบับร่าง</option>
              <option value="rejected">ไม่อนุมัติ</option>
            </select>
          </div>
        </div>

        {/* 8 Categories Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 text-xs no-scrollbar">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all ${
              selectedCategory === 'all'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            ทุกประเภท ({yearProjects.length})
          </button>
          {NHSO_FUND_CATEGORIES.map((cat) => {
            const count = yearProjects.filter((p) => (p.categoryNumber || 1) === cat.number).length;
            return (
              <button
                key={cat.number}
                onClick={() => setSelectedCategory(cat.number)}
                className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all flex items-center gap-1.5 border ${
                  selectedCategory === cat.number
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm font-semibold'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
                title={cat.title}
              >
                <span>ประเภท {cat.number}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Projects Table & List View */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
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
                  <th className="py-3 px-3 w-12 text-center">#</th>
                  <th className="py-3 px-3">ชื่อโครงการ / แผนงาน</th>
                  <th className="py-3 px-3 w-44">ผู้ขอรับงบ / ผู้รับผิดชอบ</th>
                  <th className="py-3 px-3 w-28">ประเภท</th>
                  <th className="py-3 px-3 w-28 text-right">งบที่ขอ (บาท)</th>
                  <th className="py-3 px-3 w-28 text-right">งบอนุมัติ</th>
                  <th className="py-3 px-3 w-28 text-right">เบิกจ่ายแล้ว</th>
                  <th className="py-3 px-3 w-32 text-center">มติกรรมการ</th>
                  <th className="py-3 px-3 w-44 text-center">เมนูจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredProjects.map((p, idx) => {
                  const cat = NHSO_FUND_CATEGORIES.find((c) => c.number === (p.categoryNumber || 1));
                  const isApproved =
                    p.status === 'approved' ||
                    p.status === 'approved_reduced' ||
                    p.committeeDecision === 'approve';
                  const approvedAmount = p.budgetApproved || p.budgetRequested;
                  const disbursed = p.disbursedAmount || 0;
                  const percent =
                    approvedAmount > 0 ? Math.round((disbursed / approvedAmount) * 100) : 0;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-3 text-center font-bold text-slate-400">
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
                          {p.meetingRound && (
                            <>
                              <span>•</span>
                              <span className="text-blue-600 font-medium">
                                มติ: {p.meetingRound}
                              </span>
                            </>
                          )}
                          {p.implementationStatus === 'completed_reported' && (
                            <span className="text-emerald-700 bg-emerald-100 dark:bg-emerald-950/80 px-1.5 py-0.2 rounded text-[10px] font-semibold">
                              ✓ ส่งรายงานแล้ว
                            </span>
                          )}
                          {p.implementationStatus === 'in_progress' && (
                            <span className="text-blue-700 bg-blue-100 dark:bg-blue-950/80 px-1.5 py-0.2 rounded text-[10px] font-semibold">
                              🔄 กำลังดำเนินกิจกรรม
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {p.proposingOrg}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">
                          {p.responsiblePerson}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                            cat?.badgeColor || 'bg-slate-100 text-slate-700'
                          }`}
                          title={cat?.title}
                        >
                          ประเภท {p.categoryNumber || 1}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                        {p.budgetRequested.toLocaleString()}
                      </td>

                      <td className="py-3 px-3 text-right font-bold">
                        {isApproved ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {approvedAmount.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Disbursed Amount with Progress */}
                      <td className="py-3 px-3 text-right">
                        {isApproved ? (
                          <div>
                            <div className="font-bold text-cyan-600 dark:text-cyan-400">
                              {disbursed.toLocaleString()}
                            </div>
                            <div className="text-[10px] text-slate-400">{percent}%</div>
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Committee Resolution / Status */}
                      <td className="py-3 px-3 text-center">
                        {p.status === 'approved' && (
                          <button
                            onClick={() => openApprovalModal(p)}
                            className="px-2 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 rounded-full font-bold text-[10px] inline-flex items-center gap-1 transition-colors"
                            title="คลิกเพื่อแก้ไขมติกรรมการ"
                          >
                            <Check className="w-3 h-3" /> อนุมัติเต็ม
                          </button>
                        )}
                        {p.status === 'approved_reduced' && (
                          <button
                            onClick={() => openApprovalModal(p)}
                            className="px-2 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-200 rounded-full font-bold text-[10px] inline-flex items-center gap-1 transition-colors"
                            title="คลิกเพื่อแก้ไขมติกรรมการ"
                          >
                            <Check className="w-3 h-3" /> อนุมัติปรับลด
                          </button>
                        )}
                        {p.status === 'rejected' && (
                          <button
                            onClick={() => openApprovalModal(p)}
                            className="px-2 py-1 bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 hover:bg-red-200 rounded-full font-bold text-[10px] inline-flex items-center gap-1 transition-colors"
                            title="คลิกเพื่อแก้ไขมติกรรมการ"
                          >
                            <X className="w-3 h-3" /> ไม่อนุมัติ
                          </button>
                        )}
                        {(p.status === 'submitted' || p.status === 'under_review') && (
                          <button
                            onClick={() => openApprovalModal(p)}
                            className="px-2.5 py-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 rounded-full font-bold text-[10px] inline-flex items-center gap-1 transition-colors"
                            title="เจ้าหน้าที่กองสาธาคลิกเพื่อบันทึกมติที่ประชุมกรรมการ"
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
                          {/* Print 13 columns */}
                          <button
                            onClick={() => {
                              setPrintingProject(p);
                              setPrintMode('single');
                              setIsPrintOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="พิมพ์แบบ 13 ช่อง (A4 แนวนอน)"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Committee Review / Approve */}
                          <button
                            onClick={() => openApprovalModal(p)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="บันทึกมติที่ประชุมกรรมการ (โดยเจ้าหน้าที่กองสาธา)"
                          >
                            <CheckSquare className="w-4 h-4" />
                          </button>

                          {/* Disbursement Tracking */}
                          <button
                            onClick={() => setDisbursementProject(p)}
                            className="p-1.5 text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="บันทึกการเบิกจ่าย & ติดตามผลการดำเนินงาน"
                          >
                            <Coins className="w-4 h-4" />
                          </button>

                          {/* Edit / Verify (Public Health Officer) */}
                          <button
                            onClick={() => {
                              setEditingProject(p);
                              setIsBuilderOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="ตรวจสอบ / แก้ไขโครงการ (เจ้าหน้าที่กองสาธา)"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Clone */}
                          <button
                            onClick={() => handleCloneProject(p)}
                            className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="คัดลอกเป็นโครงการปี 70"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          {/* Delete */}
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
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                ผู้บันทึก: <strong>{officerRecorder}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setApprovalModalProject(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
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
    </div>
  );
};
