import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Save,
  Coins,
  Building2,
  Users,
  Calendar,
  Calculator,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Info,
  Layers,
  ArrowRight,
  Landmark,
  Percent,
  CheckSquare,
  Square,
  FileText,
  FileCheck,
  TrendingUp,
  RotateCcw,
} from 'lucide-react';
import {
  NhsoFundSettings,
  NhsoFundRevenueSource,
  NhsoClause10_4_BudgetPlan,
  NhsoClause10_4_ExpenseItem,
  NhsoProject,
  NhsoFundBudgetLine,
} from '../types/index.ts';
import {
  getProjectRefundAmount,
  isProjectTrackingCompleted,
  isProjectTrackingRefunded,
} from '../utils/nhsoThemeAndTracking.ts';

interface NhsoFundRevenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  fiscalYear: string;
  settings: NhsoFundSettings;
  projects: NhsoProject[];
  onSaveSettings: (updatedSettings: NhsoFundSettings) => void;
  onUpsertProject?: (project: NhsoProject) => void;
}

export const NhsoFundRevenueModal: React.FC<NhsoFundRevenueModalProps> = ({
  isOpen,
  onClose,
  fiscalYear,
  settings,
  projects,
  onSaveSettings,
  onUpsertProject,
}) => {
  const [activeTab, setActiveTab] = useState<'revenue' | 'clause10_4'>('revenue');
  const [selectedYear, setSelectedYear] = useState<string>(fiscalYear || '2570');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [syncProjectSuccess, setSyncProjectSuccess] = useState(false);

  // Revenue Sources State
  const defaultRev = settings.revenueSourcesByYear?.[selectedYear] || {
    fiscalYear: selectedYear,
    nhsoPerCapitaRate: 45,
    populationCount: 9874,
    nhsoPerCapitaTotal: 444330,
    municipalMatchingRate: 50,
    municipalMatchingTotal: 222165,
    bankInterestTotal: 2500,
    carryOverProjectIds: [],
    carryOverTotal: 0,
    carryOverMeetingRound: '',
    carryOverNote: '',
    totalAnnualBudget: 668995,
  };

  const [nhsoPerCapitaRate, setNhsoPerCapitaRate] = useState<number>(defaultRev.nhsoPerCapitaRate || 45);
  const [populationCount, setPopulationCount] = useState<number>(defaultRev.populationCount || 9874);
  const [nhsoPerCapitaTotal, setNhsoPerCapitaTotal] = useState<number>(
    defaultRev.nhsoPerCapitaTotal || (defaultRev.populationCount || 9874) * (defaultRev.nhsoPerCapitaRate || 45)
  );

  const [municipalMatchingRate, setMunicipalMatchingRate] = useState<number>(defaultRev.municipalMatchingRate || 50);
  const [municipalMatchingTotal, setMunicipalMatchingTotal] = useState<number>(
    defaultRev.municipalMatchingTotal || Math.round(nhsoPerCapitaTotal * 0.5)
  );

  const [bankInterestTotal, setBankInterestTotal] = useState<number>(defaultRev.bankInterestTotal || 0);

  const [carryOverProjectIds, setCarryOverProjectIds] = useState<string[]>(
    defaultRev.carryOverProjectIds || ['NHSO-69-01', 'NHSO-69-16', 'NHSO-69-17']
  );
  const [carryOverTotal, setCarryOverTotal] = useState<number>(
    defaultRev.carryOverTotal !== undefined ? defaultRev.carryOverTotal : 42817
  );
  const [isManualCarryOver, setIsManualCarryOver] = useState<boolean>(
    !!defaultRev.isCarryOverManualOverride
  );
  const [carryOverMeetingRound, setCarryOverMeetingRound] = useState<string>(
    defaultRev.carryOverMeetingRound || ''
  );
  const [carryOverNote, setCarryOverNote] = useState<string>(defaultRev.carryOverNote || '');
  const [carryOverFilterMode, setCarryOverFilterMode] = useState<'refunded_only' | 'all'>(
    'refunded_only'
  );
  const [sourceCarryYear, setSourceCarryYear] = useState<string>('2569');

  // Clause 10(4) State
  const default10_4 = settings.clause10_4_PlansByYear?.[selectedYear] || {
    fiscalYear: selectedYear,
    maxCapPercent: 15,
    maxCapAmount: Math.round((defaultRev.totalAnnualBudget || 668995) * 0.15),
    totalPlanned: 42800,
    notes: `ประมาณการค่าใช้จ่ายบริหารจัดการกองทุนและการประชุมคณะกรรมการ ประจำปีงบ ${selectedYear} ตามข้อ 10(4)`,
    items: [
      {
        id: 'item_10_4_1',
        category: 'meeting_allowance',
        name: 'ค่าตอบแทน/เบี้ยประชุมคณะกรรมการกองทุนหลักประกันสุขภาพฯ',
        quantity: 15,
        unit: 'คน',
        unitPrice: settings.standardRates?.meetingAllowanceBoard || 400,
        meetingCount: 4,
        total: 15 * (settings.standardRates?.meetingAllowanceBoard || 400) * 4,
        note: 'ประชุมตามวาระปีละ 4 ครั้ง (15 คน x 400 บ. x 4 ครั้ง)',
      },
      {
        id: 'item_10_4_2',
        category: 'meal_snack',
        name: 'ค่าอาหารกลางวันในการประชุมคณะกรรมการกองทุนฯ',
        quantity: 15,
        unit: 'มื้อ',
        unitPrice: settings.standardRates?.lunchPerMeal || 75,
        meetingCount: 4,
        total: 15 * (settings.standardRates?.lunchPerMeal || 75) * 4,
        note: '15 คน x 75 บ. x 4 มื้อ',
      },
      {
        id: 'item_10_4_3',
        category: 'meal_snack',
        name: 'ค่าอาหารว่างและเครื่องดื่มในการประชุมคณะกรรมการฯ (2 มื้อ/ครั้ง)',
        quantity: 30,
        unit: 'ชุด',
        unitPrice: settings.standardRates?.snackPerMeal || 25,
        meetingCount: 4,
        total: 30 * (settings.standardRates?.snackPerMeal || 25) * 4,
        note: 'เช้า-บ่าย (30 ชุด x 25 บ. x 4 ครั้ง)',
      },
      {
        id: 'item_10_4_4',
        category: 'meeting_allowance',
        name: 'ค่าตอบแทนคณะทำงาน/อนุกรรมการกลั่นกรองโครงการ',
        quantity: 7,
        unit: 'คน',
        unitPrice: settings.standardRates?.meetingAllowanceSubcommittee || 300,
        meetingCount: 3,
        total: 7 * (settings.standardRates?.meetingAllowanceSubcommittee || 300) * 3,
        note: 'ประชุมกลั่นกรองโครงการ 3 ครั้ง (7 คน x 300 บ. x 3 ครั้ง)',
      },
      {
        id: 'item_10_4_5',
        category: 'materials_office',
        name: 'ค่าวัสดุอุปกรณ์สำนักงาน แฟ้มและเอกสารประกอบการประชุม',
        quantity: 1,
        unit: 'งาน',
        unitPrice: 5000,
        meetingCount: 1,
        total: 5000,
        note: 'กระดาษ แฟ้ม ปากกา และหมึกพิมพ์สำหรับงานบริหารกองทุนฯ',
      },
    ],
  };

  const [maxCapPercent, setMaxCapPercent] = useState<number>(default10_4.maxCapPercent || 15);
  const [clause10_4_Items, setClause10_4_Items] = useState<NhsoClause10_4_ExpenseItem[]>(
    default10_4.items || []
  );
  const [clause10_4_Notes, setClause10_4_Notes] = useState<string>(default10_4.notes || '');

  // Candidate projects for carry-over / refunded budget
  const prevYear = String(Number(selectedYear) - 1);
  useEffect(() => {
    const hasPrevYear = projects.some((p) => p.fiscalYear === prevYear);
    setSourceCarryYear(hasPrevYear ? prevYear : '2569');
  }, [selectedYear, prevYear, projects]);

  const prevYearProjects = useMemo(() => {
    return projects
      .filter((p) => p.fiscalYear === sourceCarryYear)
      .sort((a, b) => (a.orderNumber || 999) - (b.orderNumber || 999));
  }, [projects, sourceCarryYear]);

  const refundedPrevYearProjects = useMemo(() => {
    return prevYearProjects.filter(
      (p) => isProjectTrackingRefunded(p) || getProjectRefundAmount(p) > 0
    );
  }, [prevYearProjects]);

  const displayedCarryOverProjects = useMemo(() => {
    if (carryOverFilterMode === 'refunded_only' && refundedPrevYearProjects.length > 0) {
      return refundedPrevYearProjects;
    }
    return prevYearProjects;
  }, [carryOverFilterMode, refundedPrevYearProjects, prevYearProjects]);

  const getEffectiveProjectCarryOver = (p: NhsoProject): number => {
    const refAmt = getProjectRefundAmount(p);
    if (refAmt > 0) return refAmt;
    return p.budgetApproved || p.budgetRequested || 0;
  };

  const calculatedSelectedRefundSum = useMemo(() => {
    return projects
      .filter((p) => carryOverProjectIds.includes(p.id))
      .reduce((sum, p) => sum + getEffectiveProjectCarryOver(p), 0);
  }, [projects, carryOverProjectIds]);

  const allRefundedSumInSourceYear = useMemo(() => {
    return refundedPrevYearProjects.reduce((sum, p) => sum + getProjectRefundAmount(p), 0);
  }, [refundedPrevYearProjects]);

  // Synchronize state when switching fiscal year or opening modal
  useEffect(() => {
    const rev = settings.revenueSourcesByYear?.[selectedYear];
    if (rev) {
      setNhsoPerCapitaRate(rev.nhsoPerCapitaRate || 45);
      setPopulationCount(rev.populationCount || 9874);
      setNhsoPerCapitaTotal(
        rev.nhsoPerCapitaTotal || (rev.populationCount || 9874) * (rev.nhsoPerCapitaRate || 45)
      );
      setMunicipalMatchingRate(rev.municipalMatchingRate || 50);
      setMunicipalMatchingTotal(rev.municipalMatchingTotal || 0);
      setBankInterestTotal(rev.bankInterestTotal || 0);

      // If no carryOver was set yet and not manually overridden, default to refunded projects from 2569
      const refunded2569 = projects.filter(
        (p) => p.fiscalYear === '2569' && (isProjectTrackingRefunded(p) || getProjectRefundAmount(p) > 0)
      );
      const defaultRefundIds = refunded2569.map((p) => p.id);
      const defaultRefundSum = refunded2569.reduce(
        (s, p) => s + getProjectRefundAmount(p),
        0
      );

      if (
        !rev.isCarryOverManualOverride &&
        (!rev.carryOverTotal || rev.carryOverTotal === 0) &&
        (!rev.carryOverProjectIds || rev.carryOverProjectIds.length === 0) &&
        defaultRefundSum > 0
      ) {
        setCarryOverProjectIds(defaultRefundIds);
        setCarryOverTotal(defaultRefundSum);
        setIsManualCarryOver(false);
      } else {
        setCarryOverProjectIds(rev.carryOverProjectIds || []);
        setCarryOverTotal(rev.carryOverTotal || 0);
        setIsManualCarryOver(!!rev.isCarryOverManualOverride);
      }
      setCarryOverMeetingRound(rev.carryOverMeetingRound || '');
      setCarryOverNote(rev.carryOverNote || '');
    }

    const c10 = settings.clause10_4_PlansByYear?.[selectedYear];
    if (c10) {
      setMaxCapPercent(c10.maxCapPercent || 15);
      setClause10_4_Items(c10.items || []);
      setClause10_4_Notes(c10.notes || '');
    }
  }, [selectedYear, settings, isOpen]);

  if (!isOpen) return null;

  // Auto calculate total annual fund budget
  const totalAnnualBudget =
    Number(nhsoPerCapitaTotal || 0) +
    Number(municipalMatchingTotal || 0) +
    Number(bankInterestTotal || 0) +
    Number(carryOverTotal || 0);

  // Maximum legal cap for Clause 10(4)
  const maxCapAmount = Math.round((totalAnnualBudget * (maxCapPercent || 15)) / 100);

  // Total 10(4) planned expenses
  const totalPlanned10_4 = clause10_4_Items.reduce((sum, item) => sum + (item.total || 0), 0);
  const remaining10_4_Budget = maxCapAmount - totalPlanned10_4;
  const is10_4_OverCap = totalPlanned10_4 > maxCapAmount;

  // Quick calculate handlers for revenue
  const handleRecalculateNhso = () => {
    const calculated = populationCount * nhsoPerCapitaRate;
    setNhsoPerCapitaTotal(calculated);
    // suggest municipal matching 50%
    const suggestedMatching = Math.round(calculated * (municipalMatchingRate / 100));
    setMunicipalMatchingTotal(suggestedMatching);
  };

  const handleApplyMatchingRate = (rate: number) => {
    setMunicipalMatchingRate(rate);
    const suggested = Math.round(nhsoPerCapitaTotal * (rate / 100));
    setMunicipalMatchingTotal(suggested);
  };

  // Toggle candidate carry-over project from previous year
  const handleToggleCarryOverProject = (p: NhsoProject) => {
    const isSelected = carryOverProjectIds.includes(p.id);
    const nextIds = isSelected
      ? carryOverProjectIds.filter((id) => id !== p.id)
      : [...carryOverProjectIds, p.id];

    // Recalculate carry over total based on selected projects' refund amounts
    const sumSelected = projects
      .filter((proj) => nextIds.includes(proj.id))
      .reduce((s, proj) => s + getEffectiveProjectCarryOver(proj), 0);

    setCarryOverProjectIds(nextIds);
    setCarryOverTotal(sumSelected);
    setIsManualCarryOver(false);
  };

  // Inline edit refund amount for a project and auto-update carryOverTotal
  const handleInlineRefundAmountChange = (p: NhsoProject, newAmount: number) => {
    const cleanAmt = Math.max(0, Number(newAmount) || 0);
    const approved = p.budgetApproved || p.budgetRequested || 0;
    const updatedProj: NhsoProject = {
      ...p,
      trackingRefunded: cleanAmt > 0 ? true : p.trackingRefunded,
      refundAmount: cleanAmt,
      disbursedAmount:
        cleanAmt >= approved
          ? 0
          : isProjectTrackingCompleted(p)
          ? Math.max(0, approved - cleanAmt)
          : p.disbursedAmount,
      updatedAt: new Date().toISOString(),
    };

    if (onUpsertProject) {
      onUpsertProject(updatedProj);
    }

    // Ensure it's in carryOverProjectIds if cleanAmt > 0 and recalculate carryOverTotal
    const nextIds =
      cleanAmt > 0 && !carryOverProjectIds.includes(p.id)
        ? [...carryOverProjectIds, p.id]
        : carryOverProjectIds;
    setCarryOverProjectIds(nextIds);

    const nextSum = projects
      .map((item) => (item.id === p.id ? updatedProj : item))
      .filter((proj) => nextIds.includes(proj.id))
      .reduce((s, proj) => {
        const r =
          proj.id === p.id
            ? cleanAmt
            : getEffectiveProjectCarryOver(proj);
        return s + r;
      }, 0);

    setCarryOverTotal(nextSum);
    setIsManualCarryOver(false);
  };

  // Clause 10(4) item handlers
  const handleAdd10_4_Item = (
    name = '',
    category: NhsoClause10_4_ExpenseItem['category'] = 'meeting_allowance',
    quantity = 15,
    unit = 'คน',
    unitPrice = 400,
    meetingCount = 1,
    note = ''
  ) => {
    const newItem: NhsoClause10_4_ExpenseItem = {
      id: `item_10_4_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      category,
      name,
      quantity,
      unit,
      unitPrice,
      meetingCount,
      total: quantity * unitPrice * (meetingCount || 1),
      note,
    };
    setClause10_4_Items([...clause10_4_Items, newItem]);
  };

  const handleUpdate10_4_Item = (
    id: string,
    field: keyof NhsoClause10_4_ExpenseItem,
    val: any
  ) => {
    setClause10_4_Items((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: val };
        if (field === 'quantity' || field === 'unitPrice' || field === 'meetingCount') {
          const q = field === 'quantity' ? Number(val) : item.quantity;
          const p = field === 'unitPrice' ? Number(val) : item.unitPrice;
          const m = field === 'meetingCount' ? Number(val) : item.meetingCount || 1;
          updated.total = q * p * m;
        }
        return updated;
      })
    );
  };

  const handleRemove10_4_Item = (id: string) => {
    setClause10_4_Items((prev) => prev.filter((i) => i.id !== id));
  };

  // Save Settings Handler
  const handleSaveAll = () => {
    const updatedRevSource: NhsoFundRevenueSource = {
      fiscalYear: selectedYear,
      nhsoPerCapitaRate,
      populationCount,
      nhsoPerCapitaTotal,
      municipalMatchingRate,
      municipalMatchingTotal,
      bankInterestTotal,
      carryOverProjectIds,
      carryOverTotal,
      isCarryOverManualOverride: isManualCarryOver,
      carryOverMeetingRound,
      carryOverNote,
      totalAnnualBudget,
      updatedAt: new Date().toISOString(),
    };

    const updated10_4_Plan: NhsoClause10_4_BudgetPlan = {
      fiscalYear: selectedYear,
      maxCapPercent,
      maxCapAmount,
      items: clause10_4_Items,
      totalPlanned: totalPlanned10_4,
      notes: clause10_4_Notes,
      updatedAt: new Date().toISOString(),
    };

    const newSettings: NhsoFundSettings = {
      ...settings,
      fiscalYear: selectedYear,
      totalFundBudget: totalAnnualBudget,
      revenueSourcesByYear: {
        ...(settings.revenueSourcesByYear || {}),
        [selectedYear]: updatedRevSource,
      },
      clause10_4_PlansByYear: {
        ...(settings.clause10_4_PlansByYear || {}),
        [selectedYear]: updated10_4_Plan,
      },
      updatedAt: new Date().toISOString(),
    };

    onSaveSettings(newSettings);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 900);
  };

  // Sync Clause 10(4) plan into project list as a Category 4 project
  const handleSyncAsCategory4Project = () => {
    if (!onUpsertProject) return;

    // Check if a category 4 project already exists for this year
    const existing10_4 = projects.find(
      (p) => p.fiscalYear === selectedYear && p.categoryNumber === 4
    );

    const budgetLines: NhsoFundBudgetLine[] = clause10_4_Items.map((item, idx) => ({
      id: `line_10_4_${idx + 1}`,
      activityCategory: '1. กิจกรรมบริหารจัดการกองทุนและการประชุม',
      name: `${idx + 1}) ${item.name}${item.meetingCount && item.meetingCount > 1 ? ` (${item.meetingCount} ครั้ง)` : ''}`,
      quantity: item.quantity * (item.meetingCount || 1),
      unit: item.unit,
      unitPrice: item.unitPrice,
      total: item.total,
    }));

    const projectToUpsert: NhsoProject = {
      id: existing10_4?.id || `NHSO-${selectedYear.slice(-2)}-CAT4-${Date.now().toString().slice(-4)}`,
      fiscalYear: selectedYear,
      projectCode: existing10_4?.projectCode || `กองทุน-${selectedYear.slice(-2)}-10(4)`,
      projectName: `โครงการบริหารจัดการกองทุนหลักประกันสุขภาพตำบลบางเป้า และการประชุมคณะกรรมการฯ ประจำปีงบประมาณ ${selectedYear}`,
      categoryNumber: 4,
      categoryName: '4. สนับสนุนการบริหารหรือพัฒนากองทุนฯ [ข้อ 10 (4)]',
      proposingOrg: 'กองสาธารณสุขและสิ่งแวดล้อม',
      responsiblePerson: settings.orgProposerDefaults?.['กองสาธารณสุขและสิ่งแวดล้อม']?.name || 'ผู้อำนวยการกองสาธารณสุขและสิ่งแวดล้อม',
      phone: '075-207038',

      activities: '- การประชุมคณะกรรมการกองทุนหลักประกันสุขภาพตำบลบางเป้าตามวาระ\n- การประชุมคณะอนุกรรมการ/คณะทำงานกลั่นกรองโครงการ\n- การจัดหาวัสดุอุปกรณ์สำนักงานและเอกสารประกอบการประชุม',
      objectives: '1. เพื่อสนับสนุนการบริหารจัดการกองทุนหลักประกันสุขภาพตำบลบางเป้าให้เป็นไปอย่างมีประสิทธิภาพ\n2. เพื่อให้คณะกรรมการและคณะทำงานสามารถดำเนินงานประชุมพิจารณาอนุมัติโครงการและติดตามประเมินผลได้อย่างต่อเนื่อง',
      targetGroup: 'คณะกรรมการกองทุนฯ, คณะทำงาน, เจ้าหน้าที่ผู้ปฏิบัติงาน',
      targetParticipants: 22,
      kpi: 'ร้อยละ 100 ของการประชุมคณะกรรมการและคณะทำงานสามารถดำเนินการได้ตามแผนและระเบียบ สปสช.',
      location: 'ห้องประชุมเทศบาลตำบลบางเป้า อำเภอกันตัง จังหวัดตรัง',
      duration: `ต.ค. ${Number(selectedYear) - 1} - ก.ย. ${selectedYear}`,

      budgetLines,
      budgetRequested: totalPlanned10_4,
      budgetApproved: totalPlanned10_4,
      status: 'approved',
      committeeDecision: 'approved',
      meetingRound: `มติที่ประชุม กก. ปีงบ ${selectedYear}`,
      committeeComment: `อนุมัติกรอบค่าใช้จ่ายบริหารจัดการกองทุนและการประชุม ตามข้อ 10(4) วงเงิน ${totalPlanned10_4.toLocaleString()} บาท (ไม่เกินร้อยละ ${maxCapPercent} ของเงินรายรับกองทุน)`,

      signers: {
        proposerName: settings.orgProposerDefaults?.['กองสาธารณสุขและสิ่งแวดล้อม']?.name || 'นางสาวปฐมาภรณ์  จันทร์แจ่ม',
        proposerTitle: settings.orgProposerDefaults?.['กองสาธารณสุขและสิ่งแวดล้อม']?.title || 'ผู้อำนวยการกองสาธารณสุขและสิ่งแวดล้อม',
        endorserName: settings.defaultEndorserName || 'นายโชคชัย  รอดรักษา',
        endorserTitle: settings.defaultEndorserTitle || 'เลขานุการกองทุนฯ ทต.บางเป้า',
        approverName: settings.defaultApproverName || 'นายละดม  เชื้อช่วย',
        approverTitle: settings.defaultApproverTitle || 'ประธานกองทุนฯ ทต.บางเป้า',
      },

      activityGroups: [
        {
          id: 'act_10_4_main',
          activityName: '1. กิจกรรมบริหารจัดการกองทุนและการประชุมคณะกรรมการฯ',
          activities: '- จัดการประชุมคณะกรรมการกองทุนฯ และคณะอนุกรรมการกลั่นกรองโครงการ\n- จัดหาวัสดุอุปกรณ์สำนักงานและเอกสารสำหรับการประชุม',
          objectives: 'เพื่อให้การบริหารกองทุนหลักประกันสุขภาพเป็นไปด้วยความเรียบร้อยและมีประสิทธิภาพ',
          targetGroup: 'คณะกรรมการกองทุนฯ และผู้เกี่ยวข้อง',
          targetParticipants: 22,
          kpi: 'การดำเนินงานกองทุนเป็นไปตามระเบียบ สปสช. ข้อ 10 (4)',
          location: 'ห้องประชุมเทศบาลตำบลบางเป้า',
          duration: `ต.ค. ${Number(selectedYear) - 1} - ก.ย. ${selectedYear}`,
          budgetLines,
          subtotal: totalPlanned10_4,
        },
      ],

      createdAt: existing10_4?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onUpsertProject(projectToUpsert);
    setSyncProjectSuccess(true);
    setTimeout(() => setSyncProjectSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-md">
              <Coins className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                คำนวณที่มาของเงินกองทุน & บริหารงบ 10(4)
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/20 font-semibold">
                  ปีงบ {selectedYear}
                </span>
              </h2>
              <p className="text-xs text-white/80 mt-0.5">
                คิดเงินโอน สปสช. รายหัว, งบเทศบาลสมทบ, ดอกเบี้ย, ยกยอดจากปีก่อน และวางแผนการใช้เงินประชุม 10(4)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-white/15 rounded-xl p-1 text-xs">
              <span className="px-2 text-white/80 font-medium">รอบปี:</span>
              <button
                type="button"
                onClick={() => setSelectedYear('2570')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  selectedYear === '2570' ? 'bg-white text-emerald-800 shadow-sm' : 'text-white hover:bg-white/10'
                }`}
              >
                2570
              </button>
              <button
                type="button"
                onClick={() => setSelectedYear('2569')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  selectedYear === '2569' ? 'bg-white text-emerald-800 shadow-sm' : 'text-white hover:bg-white/10'
                }`}
              >
                2569
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('revenue')}
            className={`py-3.5 px-4 flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'revenue'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Landmark className="w-4 h-4" />
            <span>1. ที่มาของเงินกองทุน (4 แหล่งรายรับ)</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
              {totalAnnualBudget.toLocaleString()} บ.
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('clause10_4')}
            className={`py-3.5 px-4 flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'clause10_4'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>2. การใช้เงินตามข้อ 10(4) (ประชุม & บริหาร)</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                is10_4_OverCap
                  ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                  : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
              }`}
            >
              {totalPlanned10_4.toLocaleString()} / {maxCapAmount.toLocaleString()} บ.
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* ============================================================== */}
          {/* TAB 1: REVENUE SOURCES (4 แหล่งที่มาของเงินกองทุน) */}
          {/* ============================================================== */}
          {activeTab === 'revenue' && (
            <div className="space-y-6 animate-in fade-in-50 duration-150">
              {/* Grand Total Summary Banner */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 border-2 border-emerald-500/40 rounded-2xl p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      รวมกรอบงบประมาณกองทุนทั้งสิ้น ประจำปีงบ {selectedYear}
                    </span>
                    <div className="text-3xl font-black text-emerald-950 dark:text-emerald-100 mt-1">
                      {totalAnnualBudget.toLocaleString()}{' '}
                      <span className="text-base font-semibold text-emerald-700 dark:text-emerald-400">บาท</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-emerald-200 dark:border-emerald-800 text-slate-700 dark:text-slate-300 font-medium">
                      สปสช.: <strong>{Number(nhsoPerCapitaTotal || 0).toLocaleString()}</strong> บ.
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-emerald-200 dark:border-emerald-800 text-slate-700 dark:text-slate-300 font-medium">
                      เทศบาลสมทบ: <strong>{Number(municipalMatchingTotal || 0).toLocaleString()}</strong> บ.
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-emerald-200 dark:border-emerald-800 text-slate-700 dark:text-slate-300 font-medium">
                      ดอกเบี้ย: <strong>{Number(bankInterestTotal || 0).toLocaleString()}</strong> บ.
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-emerald-200 dark:border-emerald-800 text-slate-700 dark:text-slate-300 font-medium">
                      ยกยอด: <strong>{Number(carryOverTotal || 0).toLocaleString()}</strong> บ.
                    </span>
                  </div>
                </div>
              </div>

              {/* 4 Cards for 4 Revenue Sources */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. งบโอนจาก สปสช. */}
                <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                        1
                      </span>
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        งบโอนจาก สปสช. (ตามรายหัวประชากร)
                      </h3>
                    </div>
                    <span className="text-[11px] text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded">
                      อัตรามาตรฐาน 45 บ./หัว
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                        จำนวนประชากร ต.บางเป้า (คน)
                      </label>
                      <input
                        type="number"
                        value={populationCount}
                        onChange={(e) => setPopulationCount(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-bold"
                        placeholder="9874"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                        อัตราเงินจัดสรรต่อหัว (บาท/คน)
                      </label>
                      <input
                        type="number"
                        value={nhsoPerCapitaRate}
                        onChange={(e) => setNhsoPerCapitaRate(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-bold"
                        placeholder="45"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleRecalculateNhso}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Calculator className="w-3.5 h-3.5" /> คำนวณตามสูตร ({populationCount.toLocaleString()} x {nhsoPerCapitaRate})
                    </button>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      ยอดเงินโอนจาก สปสช. ทั้งสิ้น (บาท) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={nhsoPerCapitaTotal}
                      onChange={(e) => setNhsoPerCapitaTotal(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border-2 border-emerald-500 bg-emerald-50/50 dark:bg-slate-900 font-black text-slate-900 dark:text-slate-100 text-base"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      * สามารถแก้ไขตัวเลขได้ทุกส่วนตามยอดจัดสรรจริงจาก สปสช.
                    </p>
                  </div>
                </div>

                {/* 2. งบสมทบจากเทศบาลตำบลบางเป้า */}
                <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                        2
                      </span>
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        งบสมทบจากเทศบาลตำบลบางเป้า (อปท.)
                      </h3>
                    </div>
                    <span className="text-[11px] text-blue-600 font-semibold bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded">
                      ไม่น้อยกว่า 50% ของข้อ 1
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">
                      สัดส่วนเงินสมทบขั้นต่ำตามกฎหมาย (อปท. ขนาดกลาง/ใหญ่):
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleApplyMatchingRate(50)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          municipalMatchingRate === 50
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        สมทบ 50% ({Math.round(nhsoPerCapitaTotal * 0.5).toLocaleString()} บ.)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyMatchingRate(60)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          municipalMatchingRate === 60
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        60%
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyMatchingRate(100)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          municipalMatchingRate === 100
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        100%
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      ยอดเงินที่เทศบาลตำบลบางเป้าสมทบสนับสนุนจริง (บาท) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={municipalMatchingTotal}
                      onChange={(e) => setMunicipalMatchingTotal(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border-2 border-blue-500 bg-blue-50/50 dark:bg-slate-900 font-black text-slate-900 dark:text-slate-100 text-base"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      * แต่ละปีไม่เท่ากัน สามารถกรอกตัวเลขตามเทศบัญญัติงบประมาณจริงได้
                    </p>
                  </div>
                </div>

                {/* 3. ดอกเบี้ยจากธนาคาร */}
                <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center">
                        3
                      </span>
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        ดอกเบี้ยจากธนาคารและรายได้อื่นๆ
                      </h3>
                    </div>
                    <span className="text-[11px] text-amber-600 font-semibold bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded">
                      บัญชีเงินฝากกองทุน
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      ยอดดอกเบี้ยเงินฝากธนาคารสะสมของกองทุน (บาท)
                    </label>
                    <input
                      type="number"
                      value={bankInterestTotal}
                      onChange={(e) => setBankInterestTotal(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-bold text-slate-900 dark:text-slate-100 text-base"
                      placeholder="เช่น 2500"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      ระบุดอกเบี้ยเงินฝากธนาคาร หรือเงินที่มีผู้อุทิศให้กองทุน
                    </p>
                  </div>
                </div>

                {/* 4. เงินยกยอดจากปีเก่า (Summary Card in Grid) */}
                <div className="bg-white dark:bg-slate-800/80 rounded-2xl border-2 border-purple-200 dark:border-purple-800/70 p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center">
                        4
                      </span>
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        เงินยกยอดจากปีเก่า (ไม่ได้ดำเนินการในปีก่อน)
                      </h3>
                    </div>
                    <span className="text-[11px] text-purple-700 dark:text-purple-300 font-bold bg-purple-100 dark:bg-purple-950 px-2.5 py-0.5 rounded-full border border-purple-300 dark:border-purple-800">
                      เลือก {carryOverProjectIds.length} โครงการ
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        ยอดเงินยกยอดรวมที่ได้รับมติ (บาท) <span className="text-purple-600 font-normal">(แก้ไขได้อิสระ)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const refundedIds = refundedPrevYearProjects.map((p) => p.id);
                          const idsToUse =
                            carryOverProjectIds.length > 0 ? carryOverProjectIds : refundedIds;
                          const sumToUse =
                            carryOverProjectIds.length > 0
                              ? calculatedSelectedRefundSum
                              : allRefundedSumInSourceYear;
                          setCarryOverProjectIds(idsToUse);
                          setCarryOverTotal(sumToUse);
                          setIsManualCarryOver(false);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 dark:bg-purple-950 dark:hover:bg-purple-900 text-purple-800 dark:text-purple-200 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer border border-purple-300 dark:border-purple-700"
                        title="ดึงผลรวมยอดเงินที่คืนจากตารางโครงการด้านล่าง"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>
                          ดึงยอดรวมเงินคืน (
                          {(carryOverProjectIds.length > 0
                            ? calculatedSelectedRefundSum
                            : allRefundedSumInSourceYear
                          ).toLocaleString()}{' '}
                          บ.)
                        </span>
                      </button>
                    </div>

                    <input
                      type="number"
                      step="any"
                      value={carryOverTotal}
                      onChange={(e) => {
                        setCarryOverTotal(Number(e.target.value));
                        setIsManualCarryOver(true);
                      }}
                      className="w-full px-3 py-2 rounded-lg border-2 border-purple-500 bg-purple-50/50 dark:bg-slate-900 font-black text-slate-900 dark:text-slate-100 text-base focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />

                    {/* Breakdown summary of selected refund amounts */}
                    {carryOverProjectIds.length > 0 && (
                      <div className="p-2.5 rounded-xl bg-purple-50/80 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 text-[11px] text-purple-900 dark:text-purple-200 space-y-1">
                        <div className="font-bold flex items-center justify-between">
                          <span>รายการเงินคืนที่รวบรวม ({carryOverProjectIds.length} โครงการ):</span>
                          <span>รวม {calculatedSelectedRefundSum.toLocaleString()} บาท</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {projects
                            .filter((p) => carryOverProjectIds.includes(p.id))
                            .map((p) => {
                              const amt = getEffectiveProjectCarryOver(p);
                              const approved = p.budgetApproved || p.budgetRequested || 0;
                              const is100 = amt >= approved && approved > 0;
                              return (
                                <span
                                  key={p.id}
                                  className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700 text-slate-700 dark:text-slate-200 font-medium"
                                >
                                  #{p.orderNumber || '-'}:{' '}
                                  <strong className="text-rose-600 dark:text-rose-400">
                                    {amt.toLocaleString()} บ.
                                  </strong>
                                  {is100 ? ' (100%)' : ''}
                                </span>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    <p className="text-[11px] text-slate-400">
                      สามารถกรอกระบุยอดเงินที่คืนรายโครงการในตารางด้านล่างเพื่อคำนวณอัตโนมัติ หรือพิมพ์แก้ไขตัวเลขในช่องนี้โดยตรงได้เหมือนเดิม
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 4 Detail: Project Carry-Over & Refund Amount Picker */}
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-purple-600" />
                      ระบุยอดจำนวนเงินที่คืนรายโครงการ & เลือกรวบรวมเข้า "งบข้อ 4 เงินยกยอดจากปีเก่า"
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      รองรับทั้งโครงการที่คืนเงิน 100% (ไม่ได้ดำเนินการ เช่น โครงการที่ 1 = 42,300 บ.) และโครงการที่คืนเงินเหลือจ่ายบางส่วน (เช่น โครงการที่ 16 = 400 บ., โครงการที่ 17 = 117 บ.)
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {/* Filter toggle: Only Refunded vs All */}
                    <div className="flex bg-white dark:bg-slate-900 p-0.5 rounded-xl border border-slate-300 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => setCarryOverFilterMode('refunded_only')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                          carryOverFilterMode === 'refunded_only'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        ↩️ โครงการที่คืนเงิน ({refundedPrevYearProjects.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setCarryOverFilterMode('all')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                          carryOverFilterMode === 'all'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        ทั้งหมดปี {sourceCarryYear} ({prevYearProjects.length})
                      </button>
                    </div>

                    <input
                      type="text"
                      value={carryOverMeetingRound}
                      onChange={(e) => setCarryOverMeetingRound(e.target.value)}
                      placeholder="มติที่ประชุม กก. เช่น ครั้งที่ 1/2570"
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>

                {displayedCarryOverProjects.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    ไม่มีรายการโครงการของปีงบ {sourceCarryYear} ในระบบ
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="p-2.5 w-12 text-center">เลือก</th>
                          <th className="p-2.5 w-12 text-center">#</th>
                          <th className="p-2.5">ชื่อโครงการ (ปีงบ {sourceCarryYear})</th>
                          <th className="p-2.5 w-36">หน่วยงานผู้ขอ</th>
                          <th className="p-2.5 w-28 text-right">งบอนุมัติ (บาท)</th>
                          <th className="p-2.5 w-36 text-center">ประเภทการคืนเงิน</th>
                          <th className="p-2.5 w-48 text-right">ระบุยอดเงินที่คืน (บาท)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {displayedCarryOverProjects.map((p, idx) => {
                          const isSelected = carryOverProjectIds.includes(p.id);
                          const approved = p.budgetApproved || p.budgetRequested || 0;
                          const currentRefund = getEffectiveProjectCarryOver(p);
                          const is100Percent = currentRefund >= approved && approved > 0;

                          return (
                            <tr
                              key={p.id || idx}
                              className={`transition-colors ${
                                isSelected
                                  ? 'bg-purple-50/80 dark:bg-purple-950/35 hover:bg-purple-100/70'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                              }`}
                            >
                              <td
                                onClick={() => handleToggleCarryOverProject(p)}
                                className="p-2.5 text-center cursor-pointer"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-purple-600 inline" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-400 inline" />
                                )}
                              </td>
                              <td
                                onClick={() => handleToggleCarryOverProject(p)}
                                className="p-2.5 text-center font-bold text-slate-500 cursor-pointer"
                              >
                                {p.orderNumber || idx + 1}
                              </td>
                              <td
                                onClick={() => handleToggleCarryOverProject(p)}
                                className="p-2.5 font-semibold text-slate-900 dark:text-slate-100 cursor-pointer"
                              >
                                {p.projectName}
                              </td>
                              <td
                                onClick={() => handleToggleCarryOverProject(p)}
                                className="p-2.5 text-slate-600 dark:text-slate-400 cursor-pointer"
                              >
                                {p.proposingOrg}
                              </td>
                              <td
                                onClick={() => handleToggleCarryOverProject(p)}
                                className="p-2.5 text-right font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                              >
                                {approved.toLocaleString()}
                              </td>
                              <td className="p-2.5 text-center">
                                {is100Percent ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                                    คืน 100% (ไม่ได้ทำ)
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                    คืนเงินเหลือจ่าย
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleInlineRefundAmountChange(p, approved)}
                                    className={`px-1.5 py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                      is100Percent
                                        ? 'bg-rose-600 text-white border-rose-600'
                                        : 'bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border-slate-300'
                                    }`}
                                    title={`ตั้งเป็นคืนเต็มจำนวน 100% (${approved.toLocaleString()} บาท)`}
                                  >
                                    100%
                                  </button>
                                  <input
                                    type="number"
                                    step="any"
                                    min={0}
                                    value={currentRefund}
                                    onChange={(e) =>
                                      handleInlineRefundAmountChange(p, Number(e.target.value))
                                    }
                                    className="w-24 px-2 py-1 text-right rounded-lg border-2 border-purple-400 dark:border-purple-600 bg-white dark:bg-slate-900 font-black text-rose-600 dark:text-rose-400 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    title="กรอกระบุยอดจำนวนเงินที่คืน (บาท)"
                                  />
                                  <span className="text-[11px] text-slate-500 font-semibold">บ.</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-purple-50 dark:bg-purple-950/50 font-bold border-t border-purple-200 dark:border-purple-800 text-xs">
                        <tr>
                          <td colSpan={6} className="p-2.5 text-right text-purple-900 dark:text-purple-200">
                            รวมยอดเงินคืนจากโครงการที่ติ๊กเลือก ({carryOverProjectIds.length} โครงการ):
                          </td>
                          <td className="p-2.5 text-right font-black text-sm text-rose-600 dark:text-rose-400">
                            {calculatedSelectedRefundSum.toLocaleString()} บาท
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: CLAUSE 10(4) MANAGEMENT & MEETING EXPENSES */}
          {/* ============================================================== */}
          {activeTab === 'clause10_4' && (
            <div className="space-y-6 animate-in fade-in-50 duration-150">
              {/* Legal Cap Info Banner */}
              <div
                className={`p-5 rounded-2xl border-2 shadow-sm transition-all ${
                  is10_4_OverCap
                    ? 'bg-red-50 dark:bg-red-950/40 border-red-500/60'
                    : 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/30 border-blue-500/40'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">
                        เพดานค่าใช้จ่ายตามระเบียบ สปสช. ข้อ 10 (4)
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-200 font-bold">
                        ไม่เกิน {maxCapPercent}% ของรายรับ
                      </span>
                    </div>

                    <div className="flex items-baseline gap-4 mt-1.5">
                      <div>
                        <span className="text-xs text-slate-500">เพดานสูงสุดที่ใช้ได้:</span>
                        <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
                          {maxCapAmount.toLocaleString()}{' '}
                          <span className="text-xs font-medium text-slate-500">บาท</span>
                        </div>
                      </div>

                      <div className="text-slate-300">/</div>

                      <div>
                        <span className="text-xs text-slate-500">วางแผนใช้จริง:</span>
                        <div
                          className={`text-2xl font-black ${
                            is10_4_OverCap ? 'text-red-600' : 'text-blue-700 dark:text-blue-300'
                          }`}
                        >
                          {totalPlanned10_4.toLocaleString()}{' '}
                          <span className="text-xs font-medium text-slate-500">บาท</span>
                        </div>
                      </div>

                      <div className="text-slate-300">/</div>

                      <div>
                        <span className="text-xs text-slate-500">คงเหลือในกรอบ 10(4):</span>
                        <div
                          className={`text-2xl font-black ${
                            remaining10_4_Budget < 0 ? 'text-red-600' : 'text-emerald-600'
                          }`}
                        >
                          {remaining10_4_Budget.toLocaleString()}{' '}
                          <span className="text-xs font-medium text-slate-500">บาท</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                      <span className="px-2 text-slate-500 font-medium">สัดส่วนเพดาน:</span>
                      <button
                        type="button"
                        onClick={() => setMaxCapPercent(15)}
                        className={`px-2.5 py-1 rounded-lg font-bold ${
                          maxCapPercent === 15 ? 'bg-blue-600 text-white' : 'text-slate-600'
                        }`}
                      >
                        15% (เกณฑ์ทั่วไป)
                      </button>
                      <button
                        type="button"
                        onClick={() => setMaxCapPercent(20)}
                        className={`px-2.5 py-1 rounded-lg font-bold ${
                          maxCapPercent === 20 ? 'bg-blue-600 text-white' : 'text-slate-600'
                        }`}
                      >
                        20% (รายรับไม่เกิน 1 ล้าน)
                      </button>
                    </div>

                    {onUpsertProject && (
                      <button
                        type="button"
                        onClick={handleSyncAsCategory4Project}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all hover:scale-105"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        {syncProjectSuccess ? '✓ ซิงค์เข้าโครงการแล้ว!' : '📌 ซิงค์สร้างเป็นโครงการ 10(4) ในระบบ'}
                      </button>
                    )}
                  </div>
                </div>

                {is10_4_OverCap && (
                  <div className="mt-3 p-3 bg-red-100 dark:bg-red-950/80 border border-red-300 dark:border-red-800 rounded-xl text-xs text-red-800 dark:text-red-200 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>
                      <strong>แจ้งเตือน:</strong> ประมาณการค่าใช้จ่าย 10(4) เกินเพดานสูงสุดที่กฎหมายกำหนดไป{' '}
                      <strong>{Math.abs(remaining10_4_Budget).toLocaleString()} บาท</strong> กรุณาปรับลดรายการ
                    </span>
                  </div>
                )}
              </div>

              {/* Quick Add Presets Bar */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-500 font-semibold flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> เพิ่มรายการด่วน:
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleAdd10_4_Item(
                      'ค่าตอบแทน/เบี้ยประชุมคณะกรรมการกองทุนหลักประกันสุขภาพฯ',
                      'meeting_allowance',
                      15,
                      'คน',
                      400,
                      4,
                      '15 คน x 400 บ. x 4 ครั้ง'
                    )
                  }
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
                >
                  + เบี้ยประชุม กก. (400 บ./คน)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleAdd10_4_Item(
                      'ค่าอาหารกลางวันในการประชุมคณะกรรมการกองทุนฯ',
                      'meal_snack',
                      15,
                      'มื้อ',
                      75,
                      4,
                      '15 คน x 75 บ. x 4 มื้อ'
                    )
                  }
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
                >
                  + อาหารกลางวัน (75 บ./มื้อ)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleAdd10_4_Item(
                      'ค่าอาหารว่างและเครื่องดื่มในการประชุม (2 มื้อ/ครั้ง)',
                      'meal_snack',
                      30,
                      'ชุด',
                      25,
                      4,
                      '30 ชุด x 25 บ. x 4 ครั้ง'
                    )
                  }
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
                >
                  + อาหารว่าง (25 บ./ชุด)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleAdd10_4_Item(
                      'ค่าตอบแทนคณะทำงาน/อนุกรรมการกลั่นกรองโครงการ',
                      'meeting_allowance',
                      7,
                      'คน',
                      300,
                      3,
                      '7 คน x 300 บ. x 3 ครั้ง'
                    )
                  }
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
                >
                  + เบี้ยประชุมอนุกรรมการ (300 บ./คน)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleAdd10_4_Item(
                      'ค่าวัสดุอุปกรณ์สำนักงาน แฟ้มและเอกสารประกอบการประชุม',
                      'materials_office',
                      1,
                      'งาน',
                      5000,
                      1,
                      'กระดาษ หมึกพิมพ์ แฟ้ม'
                    )
                  }
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
                >
                  + วัสดุสำนักงาน/เอกสาร
                </button>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3 w-8 text-center">#</th>
                      <th className="p-3 min-w-[260px]">รายการค่าใช้จ่ายการประชุม & บริหารจัดการ</th>
                      <th className="p-3 w-20 text-center">จำนวน</th>
                      <th className="p-3 w-20 text-center">หน่วย</th>
                      <th className="p-3 w-24 text-right">ราคา/หน่วย</th>
                      <th className="p-3 w-20 text-center">ครั้งประชุม</th>
                      <th className="p-3 w-28 text-right">รวมเงิน (บาท)</th>
                      <th className="p-3 w-10 text-center">ลบ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {clause10_4_Items.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-slate-400">
                          ยังไม่มีรายการค่าใช้จ่าย คลิกปุ่มลัดด้านบนเพื่อเพิ่มรายการ
                        </td>
                      </tr>
                    ) : (
                      clause10_4_Items.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-2.5 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => handleUpdate10_4_Item(item.id, 'name', e.target.value)}
                              placeholder="ระบุรายการ..."
                              className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium"
                            />
                            {item.note && (
                              <span className="text-[10px] text-slate-400 block mt-0.5">{item.note}</span>
                            )}
                          </td>
                          <td className="p-2.5 text-center">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdate10_4_Item(item.id, 'quantity', Number(e.target.value))
                              }
                              className="w-16 px-1.5 py-1 text-center rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                            />
                          </td>
                          <td className="p-2.5 text-center">
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) => handleUpdate10_4_Item(item.id, 'unit', e.target.value)}
                              className="w-16 px-1.5 py-1 text-center rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                            />
                          </td>
                          <td className="p-2.5 text-right">
                            <input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) =>
                                handleUpdate10_4_Item(item.id, 'unitPrice', Number(e.target.value))
                              }
                              className="w-20 px-1.5 py-1 text-right rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                            />
                          </td>
                          <td className="p-2.5 text-center">
                            <input
                              type="number"
                              value={item.meetingCount || 1}
                              onChange={(e) =>
                                handleUpdate10_4_Item(item.id, 'meetingCount', Number(e.target.value))
                              }
                              className="w-14 px-1.5 py-1 text-center rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                            />
                          </td>
                          <td className="p-2.5 text-right font-bold text-slate-900 dark:text-slate-100">
                            {(item.total || 0).toLocaleString()}
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemove10_4_Item(item.id)}
                              className="text-slate-400 hover:text-red-500 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-slate-800 font-bold border-t border-slate-200 dark:border-slate-700">
                    <tr>
                      <td colSpan={6} className="p-3 text-right">
                        รวมงบประมาณค่าใช้จ่ายบริหารและประชุม 10(4) ทั้งสิ้น:
                      </td>
                      <td className="p-3 text-right font-black text-sm text-blue-700 dark:text-blue-300">
                        {totalPlanned10_4.toLocaleString()} บาท
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {savedSuccess && (
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> บันทึกข้อมูลเรียบร้อยแล้ว!
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors"
            >
              ปิดหน้าต่าง
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md transition-all hover:scale-105"
            >
              <Save className="w-4 h-4" /> บันทึกกรอบงบประมาณ ({totalAnnualBudget.toLocaleString()} บ.)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
