import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Plus,
  Trash2,
  Calculator,
  FileText,
  Building2,
  Users,
  Calendar,
  Layers,
  Sparkles,
  Info,
  DollarSign,
  Copy,
  ChevronDown,
  ChevronUp,
  Coins,
} from 'lucide-react';
import {
  NhsoProject,
  NhsoFundBudgetLine,
  NhsoFundSettings,
  NHSO_FUND_CATEGORIES,
  NhsoActivityGroup,
} from '../types/index.ts';
import {
  generateSmartNhsoProjectDraft,
  generateNhsoDraftWithFreeGemini,
  getStoredFreeGeminiKey,
  saveStoredFreeGeminiKey,
} from '../utils/nhsoAiAssistant.ts';

interface NhsoProjectBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: NhsoProject) => void;
  initialProject?: NhsoProject | null;
  settings: NhsoFundSettings;
  existingProjects?: NhsoProject[];
}

const PRESET_ORGS = [
  'กองสาธารณสุขและสิ่งแวดล้อม',
  'กองการศึกษา ศาสนาและวัฒนธรรม',
  'รพ.สต.บางเป้า',
  'โรงพยาบาลกันตัง',
  'ชมรมผู้สูงอายุตำบลบางเป้า',
  'ชมรมผู้สูงอายุโรงพยาบาลกันตัง',
  'ชมรม อสม. ม.1',
  'ชมรม อสม. ม.2',
  'ชมรม อสม. ม.3',
  'ชมรม อสม. ม.4',
  'ชมรม อสม. ม.5',
  'ชมรม อสม. ม.6',
  'ชมรม อสม. ม.7',
  'รร.บ้านป่าเตียว',
  'รร.วัดสีหราษฎร์ศรัทธา',
  'รร.บ้านบางเป้า',
  'ศพด.มัสยิดบ้านบางเป้า',
  'ศพด.บ้านควนทองสีห์',
  'กองทุนสวัสดิการชุมชนตำบลบางเป้า',
];

export const KNOWN_PROPOSERS = [
  { org: 'กองสาธารณสุขและสิ่งแวดล้อม', name: 'นางสาวปฐมาภรณ์  จันทร์แจ่ม', title: 'ผู้อำนวยการกองสาธารณสุขและสิ่งแวดล้อม' },
  { org: 'กองการศึกษา ศาสนาและวัฒนธรรม', name: 'นางสาวมนัสญา  ทองเรือง', title: 'นักวิชาการศึกษา รักษาราชการแทน ผู้อำนวยการกองการศึกษา' },
  { org: 'รพ.สต.บางเป้า', name: 'นางสาวธนพร  ฉีดเนียม', title: 'ผู้อำนวยการ รพ.สต.บางเป้า' },
  { org: 'โรงพยาบาลกันตัง', name: 'นายสมเกียรติ  พยุหเสนารักษ์', title: 'ผู้อำนวยการโรงพยาบาลกันตัง' },
  { org: 'ชมรมผู้สูงอายุโรงพยาบาลกันตัง', name: 'นางเพียงใจ  ปานาพุฒ', title: 'ประธานชมรมผู้สูงอายุโรงพยาบาลกันตัง' },
  { org: 'ชมรมผู้สูงอายุตำบลบางเป้า', name: 'นางสมจิตต์  แก้วมณี', title: 'ประธานชมรมผู้สูงอายุตำบลบางเป้า' },
  { org: 'ชมรม อสม. ม.1', name: 'นางดวงพร  ฤทธิพรพันธ์', title: 'ประธานชมรมอาสาสมัครสาธารณสุขประจำหมู่บ้าน หมู่ที่ 1' },
  { org: 'ชมรม อสม. ม.2', name: 'นางมาลี  โสะเด็น', title: 'ประธานชมรมอาสาสมัครสาธารณสุขประจำหมู่บ้าน หมู่ที่ 2' },
  { org: 'ชมรม อสม. ม.3', name: 'นายสมพงษ์  หมาดเทียน', title: 'ประธานชมรมอาสาสมัครสาธารณสุขประจำหมู่บ้าน หมู่ที่ 3' },
  { org: 'ชมรม อสม. ม.4', name: 'นางสาวยาจาใจ อ่อนไหว', title: 'ประธานชมรมอาสาสมัครสาธารณสุขประจำหมู่บ้าน หมู่ที่ 4' },
  { org: 'ชมรม อสม. ม.5', name: 'นางสาววรรณี  จิตรพงษ์', title: 'ประธานชมรมอาสาสมัครสาธารณสุขประจำหมู่บ้าน หมู่ที่ 5' },
  { org: 'ชมรม อสม. ม.6', name: 'นางสาวชุลี ช่องสมบัติ', title: 'ประธานชมรมอาสาสมัครสาธารณสุขประจำหมู่บ้าน หมู่ที่ 6' },
  { org: 'ชมรม อสม. ม.7', name: 'นางศรีพรรณ  ชาตรีวงศ์', title: 'ประธานชมรมอาสาสมัครสาธารณสุขประจำหมู่บ้าน หมู่ที่ 7' },
  { org: 'รร.บ้านป่าเตียว', name: 'นายธีระพงษ์  ปานทอง', title: 'ผู้อำนวยการโรงเรียนบ้านป่าเตียว' },
  { org: 'รร.วัดสีหราษฎร์ศรัทธา', name: 'นายฉลอง  ภักดี', title: 'ผู้อำนวยการโรงเรียนวัดสีหราษฎร์ศรัทธา' },
  { org: 'รร.บ้านบางเป้า', name: 'นายฉัตรชัย  จันทโท', title: 'ผู้อำนวยการโรงเรียนบ้านบางเป้า' },
  { org: 'ศพด.มัสยิดบ้านบางเป้า', name: 'นางสาวอามนะ  ไขสระ', title: 'รักษาการหัวหน้า ศพด.มัสยิดบ้านบางเป้า' },
  { org: 'ศพด.บ้านควนทองสีห์', name: 'นางสาววณิชา ผดุงกิจอนันต์', title: 'ครู ศพด.บ้านควนทองสีห์' },
  { org: 'กองทุนสวัสดิการชุมชนตำบลบางเป้า', name: 'นางสาวศศิธร เกลือกลิ่น', title: 'ประธานกองทุนสวัสดิการชุมชนเทศบาลตำบลบางเป้า' },
];

export const NhsoProjectBuilderModal: React.FC<NhsoProjectBuilderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialProject,
  settings,
  existingProjects = [],
}) => {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

  // Form General State
  const [fiscalYear, setFiscalYear] = useState<string>(
    initialProject?.fiscalYear || settings.fiscalYear || '2570'
  );
  const [projectCode, setProjectCode] = useState<string>(
    initialProject?.projectCode || `กองทุน-70-00${existingProjects.length + 1}`
  );
  const [projectName, setProjectName] = useState<string>(initialProject?.projectName || '');
  const [categoryNumber, setCategoryNumber] = useState<number>(initialProject?.categoryNumber || 1);
  const [selectedOrgPreset, setSelectedOrgPreset] = useState<string>(() => {
    if (!initialProject?.proposingOrg) return '';
    return PRESET_ORGS.includes(initialProject.proposingOrg)
      ? initialProject.proposingOrg
      : 'custom';
  });
  const [customOrgText, setCustomOrgText] = useState<string>(() => {
    if (!initialProject?.proposingOrg) return '';
    return PRESET_ORGS.includes(initialProject.proposingOrg) ? '' : initialProject.proposingOrg;
  });

  const effectiveOrg = selectedOrgPreset === 'custom' ? customOrgText : selectedOrgPreset;

  const [responsiblePerson, setResponsiblePerson] = useState<string>(
    initialProject?.responsiblePerson || ''
  );
  const [phone, setPhone] = useState<string>(initialProject?.phone || '');

  // AI Project Assistant States (100% Free Built-in + Optional Free Gemini Key)
  const [aiParticipants, setAiParticipants] = useState<number>(30);
  const [aiObservers, setAiObservers] = useState<number>(6);
  const [aiSpeakers, setAiSpeakers] = useState<number>(1);
  const [aiHours, setAiHours] = useState<number>(5);
  const [aiIncludeLunch, setAiIncludeLunch] = useState<boolean>(true);
  const [aiSnackMeals, setAiSnackMeals] = useState<number>(2);
  const [aiIncludeVinyl, setAiIncludeVinyl] = useState<boolean>(true);
  const [aiIncludeMaterials, setAiIncludeMaterials] = useState<boolean>(true);
  const [aiActivityCountMode, setAiActivityCountMode] = useState<'auto' | 'single' | 'two'>('auto');
  const [aiStatusBanner, setAiStatusBanner] = useState<string | null>(null);
  const [showGeminiKeyBox, setShowGeminiKeyBox] = useState<boolean>(false);
  const [freeGeminiKey, setFreeGeminiKey] = useState<string>(() => getStoredFreeGeminiKey());
  const [isAiGenerating, setIsAiGenerating] = useState<boolean>(false);

  // Activity Groups State (Multiple Activities support - starts BLANK for new project!)
  const [activityGroups, setActivityGroups] = useState<NhsoActivityGroup[]>(() => {
    if (initialProject?.activityGroups && initialProject.activityGroups.length > 0) {
      return initialProject.activityGroups;
    }
    return [
      {
        id: `act_${Date.now()}_1`,
        activityName: '',
        activities: initialProject?.activities || '',
        objectives: initialProject?.objectives || '',
        targetGroup: initialProject?.targetGroup || '',
        targetParticipants: initialProject?.targetParticipants || 0,
        kpi: initialProject?.kpi || '',
        location: initialProject?.location || '',
        duration: initialProject?.duration || '',
        budgetLines:
          initialProject?.budgetLines && initialProject.budgetLines.length > 0
            ? initialProject.budgetLines
            : [
                {
                  id: 'line_1_1',
                  activityCategory: '',
                  name: '',
                  quantity: 0,
                  unit: '',
                  unitPrice: 0,
                  total: 0,
                },
              ],
        subtotal: 0,
      },
    ];
  });

  // Signers State (Proposer starts blank for new project until org is selected)
  const [proposerName, setProposerName] = useState<string>(
    initialProject?.signers?.proposerName || ''
  );
  const [proposerTitle, setProposerTitle] = useState<string>(
    initialProject?.signers?.proposerTitle || ''
  );
  const [endorserName, setEndorserName] = useState<string>(
    initialProject?.signers?.endorserName || settings.defaultEndorserName
  );
  const [endorserTitle, setEndorserTitle] = useState<string>(
    initialProject?.signers?.endorserTitle || settings.defaultEndorserTitle
  );
  const [approverName, setApproverName] = useState<string>(
    initialProject?.signers?.approverName || settings.defaultApproverName
  );
  const [approverTitle, setApproverTitle] = useState<string>(
    initialProject?.signers?.approverTitle || settings.defaultApproverTitle
  );

  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  // Reset form cleanly whenever modal opens or initialProject changes
  useEffect(() => {
    if (!isOpen) return;

    if (initialProject) {
      setFiscalYear(initialProject.fiscalYear || settings.fiscalYear || '2570');
      setProjectCode(initialProject.projectCode || `กองทุน-70-00${existingProjects.length + 1}`);
      setProjectName(initialProject.projectName || '');
      setCategoryNumber(initialProject.categoryNumber || 1);

      const org = initialProject.proposingOrg || '';
      if (!org) {
        setSelectedOrgPreset('');
        setCustomOrgText('');
      } else if (PRESET_ORGS.includes(org)) {
        setSelectedOrgPreset(org);
        setCustomOrgText('');
      } else {
        setSelectedOrgPreset('custom');
        setCustomOrgText(org);
      }

      setResponsiblePerson(initialProject.responsiblePerson || '');
      setPhone(initialProject.phone || '');

      if (initialProject.activityGroups && initialProject.activityGroups.length > 0) {
        setActivityGroups(initialProject.activityGroups);
      } else {
        setActivityGroups([
          {
            id: `act_${Date.now()}_1`,
            activityName: '',
            activities: initialProject.activities || '',
            objectives: initialProject.objectives || '',
            targetGroup: initialProject.targetGroup || '',
            targetParticipants: initialProject.targetParticipants || 0,
            kpi: initialProject.kpi || '',
            location: initialProject.location || '',
            duration: initialProject.duration || '',
            budgetLines: initialProject.budgetLines || [],
            subtotal: initialProject.budgetRequested || 0,
          },
        ]);
      }

      setProposerName(initialProject.signers?.proposerName || '');
      setProposerTitle(initialProject.signers?.proposerTitle || '');
      setEndorserName(initialProject.signers?.endorserName || settings.defaultEndorserName);
      setEndorserTitle(initialProject.signers?.endorserTitle || settings.defaultEndorserTitle);
      setApproverName(initialProject.signers?.approverName || settings.defaultApproverName);
      setApproverTitle(initialProject.signers?.approverTitle || settings.defaultApproverTitle);
      setAiStatusBanner(null);
      setActiveStep(1);
    } else {
      // RESET TO 100% CLEAN BLANK NEW PROJECT (All fields empty, examples shown via placeholders!)
      const targetYear = settings.fiscalYear || '2570';
      const yearCount = existingProjects.filter((p) => p.fiscalYear === targetYear).length;
      setFiscalYear(targetYear);
      setProjectCode(`กองทุน-${targetYear.slice(-2)}-00${yearCount + 1}`);
      setProjectName('');
      setCategoryNumber(1);
      setSelectedOrgPreset('');
      setCustomOrgText('');
      setResponsiblePerson('');
      setPhone('');

      setActivityGroups([
        {
          id: `act_${Date.now()}_1`,
          activityName: '',
          activities: '',
          objectives: '',
          targetGroup: '',
          targetParticipants: 0,
          kpi: '',
          location: '',
          duration: '',
          budgetLines: [
            {
              id: `line_init_1`,
              activityCategory: '',
              name: '',
              quantity: 0,
              unit: '',
              unitPrice: 0,
              total: 0,
            },
          ],
          subtotal: 0,
        },
      ]);

      setProposerName('');
      setProposerTitle('');
      setEndorserName(settings.defaultEndorserName || 'นายโชคชัย  รอดรักษา');
      setEndorserTitle(settings.defaultEndorserTitle || 'เลขานุการกองทุนฯ ทต.บางเป้า');
      setApproverName(settings.defaultApproverName || 'นายละดม  เชื้อช่วย');
      setApproverTitle(settings.defaultApproverTitle || 'ประธานกองทุนฯ ทต.บางเป้า');
      setAiStatusBanner(null);
      setActiveStep(1);
    }
  }, [isOpen, initialProject]);

  if (!isOpen) return null;

  // Calculate Grand Total across all activity groups
  const grandTotal = activityGroups.reduce((sum, g) => {
    const groupSum = (g.budgetLines || []).reduce((s, line) => s + (line.total || 0), 0);
    return sum + groupSum;
  }, 0);

  // Add new activity group (starts completely blank with example placeholders)
  const handleAddActivityGroup = () => {
    const newIdx = activityGroups.length + 1;
    const newGroup: NhsoActivityGroup = {
      id: `act_${Date.now()}_${newIdx}`,
      activityName: '',
      activities: '',
      objectives: '',
      targetGroup: '',
      targetParticipants: 0,
      kpi: '',
      location: '',
      duration: '',
      budgetLines: [
        {
          id: `line_${Date.now()}_1`,
          activityCategory: '',
          name: '',
          quantity: 0,
          unit: '',
          unitPrice: 0,
          total: 0,
        },
      ],
      subtotal: 0,
    };
    setActivityGroups([...activityGroups, newGroup]);
  };

  // Build AI parameters helper
  const getAiParams = () => ({
    projectName: projectName.trim() || 'โครงการสร้างเสริมสุขภาพและป้องกันโรคในชุมชน',
    proposingOrg: effectiveOrg,
    participantsCount: aiParticipants || 30,
    observersCount: aiObservers ?? 6,
    speakersCount: aiSpeakers ?? 1,
    hoursCount: aiHours || 5,
    includeLunch: aiIncludeLunch,
    snackMealsCount: aiSnackMeals,
    includeVinyl: aiIncludeVinyl,
    includeMaterials: aiIncludeMaterials,
    activityCountMode: aiActivityCountMode,
    fiscalYear: fiscalYear || '2570',
    settings,
  });

  // 1-Click AI Full Project Draft Generator (100% Free)
  const handleRunFullAiDraft = async (goToStep2 = true) => {
    if (!projectName.trim()) {
      alert('กรุณาพิมพ์ "ชื่อโครงการ" ก่อน เพื่อให้ AI วิเคราะห์และช่วยคิดกิจกรรม วัตถุประสงค์ กลุ่มเป้าหมาย KPI และงบประมาณที่เหมาะสม');
      return;
    }
    setIsAiGenerating(true);
    try {
      const params = getAiParams();
      const result = freeGeminiKey.trim()
        ? await generateNhsoDraftWithFreeGemini(params, freeGeminiKey.trim())
        : generateSmartNhsoProjectDraft(params);

      setCategoryNumber(result.recommendedCategoryNumber);
      setActivityGroups(result.activityGroups);
      const totalGen = result.activityGroups.reduce((s, g) => s + (g.subtotal || 0), 0);
      setAiStatusBanner(
        `✨ AI วิเคราะห์หัวข้อ "${result.detectedTopicLabel}" สำเร็จ! แนะนำประเภทที่ ${result.recommendedCategoryNumber} (${result.recommendedCategoryReason}) • สร้าง ${result.activityGroups.length} กิจกรรม งบประมาณรวม ${totalGen.toLocaleString()} บาท (แก้ไขปรับแต่งต่อได้ทุกช่อง)`
      );
      if (goToStep2) {
        setActiveStep(2);
      }
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Individual Field AI Generator inside an Activity Card
  const handleAiSuggestSingleField = (
    groupId: string,
    field: 'activities' | 'objectives' | 'targetGroup' | 'kpi' | 'location_duration' | 'budgetLines'
  ) => {
    const result = generateSmartNhsoProjectDraft(getAiParams());
    const sampleGroup = result.activityGroups[0];
    if (!sampleGroup) return;

    setActivityGroups((prev) =>
      prev.map((g, idx) => {
        if (g.id !== groupId) return g;
        const matchedGroup = result.activityGroups[idx] || sampleGroup;
        if (field === 'activities') {
          return {
            ...g,
            activityName: g.activityName || matchedGroup.activityName,
            activities: matchedGroup.activities,
          };
        }
        if (field === 'objectives') {
          return { ...g, objectives: matchedGroup.objectives };
        }
        if (field === 'targetGroup') {
          return {
            ...g,
            targetGroup: matchedGroup.targetGroup,
            targetParticipants: matchedGroup.targetParticipants,
          };
        }
        if (field === 'kpi') {
          return { ...g, kpi: matchedGroup.kpi };
        }
        if (field === 'location_duration') {
          return {
            ...g,
            location: g.location || matchedGroup.location,
            duration: g.duration || matchedGroup.duration,
          };
        }
        if (field === 'budgetLines') {
          return {
            ...g,
            budgetLines: matchedGroup.budgetLines,
            subtotal: matchedGroup.subtotal,
          };
        }
        return g;
      })
    );
  };

  const handleRemoveActivityGroup = (groupId: string) => {
    if (activityGroups.length <= 1) {
      alert('โครงการต้องมีอย่างน้อย 1 กิจกรรม');
      return;
    }
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบกิจกรรมนี้?')) return;
    setActivityGroups(activityGroups.filter((g) => g.id !== groupId));
  };

  const handleUpdateActivityGroup = (
    groupId: string,
    field: keyof NhsoActivityGroup,
    value: any
  ) => {
    setActivityGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        return { ...g, [field]: value };
      })
    );
  };

  // Add budget line to a specific activity group
  const handleAddBudgetLineToGroup = (
    groupId: string,
    name = '',
    unit = 'รายการ',
    unitPrice = 0,
    quantity = 1
  ) => {
    setActivityGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const newLine: NhsoFundBudgetLine = {
          id: `line_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          activityCategory: g.activityName,
          name,
          quantity,
          unit,
          unitPrice,
          total: quantity * unitPrice,
        };
        const nextLines = [...(g.budgetLines || []), newLine];
        return {
          ...g,
          budgetLines: nextLines,
          subtotal: nextLines.reduce((s, l) => s + (l.total || 0), 0),
        };
      })
    );
  };

  const handleUpdateBudgetLineInGroup = (
    groupId: string,
    lineId: string,
    field: keyof NhsoFundBudgetLine,
    value: string | number
  ) => {
    setActivityGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const nextLines = (g.budgetLines || []).map((l) => {
          if (l.id !== lineId) return l;
          const updated = { ...l, [field]: value };
          if (field === 'quantity' || field === 'unitPrice') {
            const q = field === 'quantity' ? Number(value) : l.quantity;
            const p = field === 'unitPrice' ? Number(value) : l.unitPrice;
            updated.total = q * p;
          }
          return updated;
        });
        return {
          ...g,
          budgetLines: nextLines,
          subtotal: nextLines.reduce((s, l) => s + (l.total || 0), 0),
        };
      })
    );
  };

  const handleRemoveBudgetLineFromGroup = (groupId: string, lineId: string) => {
    setActivityGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const nextLines = (g.budgetLines || []).filter((l) => l.id !== lineId);
        return {
          ...g,
          budgetLines: nextLines,
          subtotal: nextLines.reduce((s, l) => s + (l.total || 0), 0),
        };
      })
    );
  };

  // Copy from an existing project template
  const handleApplyTemplate = (tmpl: NhsoProject) => {
    setProjectName(tmpl.projectName.replace('2569', fiscalYear));
    setCategoryNumber(tmpl.categoryNumber || 1);
    if (PRESET_ORGS.includes(tmpl.proposingOrg)) {
      setSelectedOrgPreset(tmpl.proposingOrg);
      setCustomOrgText('');
    } else {
      setSelectedOrgPreset('custom');
      setCustomOrgText(tmpl.proposingOrg);
    }
    setResponsiblePerson(tmpl.responsiblePerson || '');

    // Clone activity groups
    if (tmpl.activityGroups && tmpl.activityGroups.length > 0) {
      setActivityGroups(
        tmpl.activityGroups.map((g, gIdx) => ({
          ...g,
          id: `act_clone_${gIdx}_${Date.now()}`,
          budgetLines: (g.budgetLines || []).map((l, lIdx) => ({
            ...l,
            id: `line_clone_${gIdx}_${lIdx}_${Date.now()}`,
          })),
        }))
      );
    } else {
      // Fallback single group
      setActivityGroups([
        {
          id: `act_clone_${Date.now()}`,
          activityName: '1. กิจกรรมดำเนินงาน',
          activities: tmpl.activities || '',
          objectives: tmpl.objectives || '',
          targetGroup: tmpl.targetGroup || '',
          targetParticipants: tmpl.targetParticipants || 0,
          kpi: tmpl.kpi || '',
          location: tmpl.location || 'พื้นที่ตำบลบางเป้า',
          duration: tmpl.duration || `ต.ค. ${Number(fiscalYear) - 1} - ก.ย. ${fiscalYear}`,
          budgetLines: (tmpl.budgetLines || []).map((l, lIdx) => ({
            ...l,
            id: `line_clone_${lIdx}_${Date.now()}`,
          })),
          subtotal: tmpl.budgetRequested || 0,
        },
      ]);
    }

    if (tmpl.signers?.proposerName) {
      setProposerName(tmpl.signers.proposerName);
      setProposerTitle(tmpl.signers.proposerTitle);
    }

    setShowTemplatePicker(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) {
      alert('กรุณากรอกชื่อโครงการ');
      setActiveStep(1);
      return;
    }

    const categoryInfo = NHSO_FUND_CATEGORIES.find((c) => c.number === categoryNumber);

    // Flatten all budget lines
    const allLines: NhsoFundBudgetLine[] = [];
    activityGroups.forEach((g) => {
      (g.budgetLines || []).forEach((l) => allLines.push(l));
    });

    const projectToSave: NhsoProject = {
      id: initialProject?.id || `NHSO-${fiscalYear.slice(-2)}-${Date.now().toString().slice(-4)}`,
      fiscalYear,
      projectCode,
      projectName: projectName.trim(),
      categoryNumber,
      categoryName: categoryInfo?.title || `ประเภทที่ ${categoryNumber}`,
      proposingOrg: effectiveOrg.trim() || 'หน่วยงานในตำบลบางเป้า',
      responsiblePerson: responsiblePerson.trim() || effectiveOrg,
      phone: phone.trim(),

      // Activity Groups
      activityGroups,

      // Top-level fallbacks
      activities: activityGroups.map((g) => g.activities).filter(Boolean).join('\n\n'),
      objectives: activityGroups.map((g) => g.objectives).filter(Boolean).join('\n\n'),
      targetGroup: activityGroups.map((g) => g.targetGroup).filter(Boolean).join('\n\n'),
      targetParticipants: activityGroups.reduce((s, g) => s + (g.targetParticipants || 0), 0),
      kpi: activityGroups.map((g) => g.kpi).filter(Boolean).join('\n\n'),
      location: activityGroups.map((g) => g.location).filter(Boolean).join(' / '),
      duration: activityGroups.map((g) => g.duration).filter(Boolean).join(' / '),

      budgetLines: allLines,
      budgetRequested: grandTotal,
      budgetApproved: initialProject?.budgetApproved || grandTotal,
      status: initialProject?.status || 'submitted',
      committeeDecision: initialProject?.committeeDecision || 'pending',
      committeeComment: initialProject?.committeeComment || '',

      signers: {
        proposerName: proposerName.trim(),
        proposerTitle: proposerTitle.trim(),
        endorserName: endorserName.trim() || settings.defaultEndorserName,
        endorserTitle: endorserTitle.trim() || settings.defaultEndorserTitle,
        approverName: approverName.trim() || settings.defaultApproverName,
        approverTitle: approverTitle.trim() || settings.defaultApproverTitle,
      },
      createdAt: initialProject?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(projectToSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-md">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                {initialProject ? 'แก้ไขแบบเสนอโครงการ' : 'เขียนแบบเสนอโครงการขอรับงบ สปสช.'}
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/20 font-semibold">
                  ปีงบ {fiscalYear}
                </span>
              </h2>
              <p className="text-xs text-white/80 mt-0.5">
                รองรับหลายกิจกรรม (เช่น อบรม + ฝึกปฏิบัติว่ายน้ำ) และคิดคำนวณงบประมาณอัตโนมัติ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {existingProjects.length > 0 && (
              <button
                type="button"
                onClick={() => setShowTemplatePicker(true)}
                className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
                title="คัดลอกจากโครงการปี 69 มาเป็นแม่แบบ"
              >
                <Copy className="w-3.5 h-3.5" />
                คัดลอกจากโครงการเดิม
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 3 Step Wizard Navigation */}
        <div className="grid grid-cols-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs">
          <button
            type="button"
            onClick={() => setActiveStep(1)}
            className={`py-3 px-4 font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeStep === 1
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <span className="w-5 h-5 rounded-full flex items-center justify-center bg-emerald-100 text-emerald-700 text-xs font-bold">
              1
            </span>
            <span>ข้อมูลทั่วไป & ประเภท</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveStep(2)}
            className={`py-3 px-4 font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeStep === 2
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <span className="w-5 h-5 rounded-full flex items-center justify-center bg-emerald-100 text-emerald-700 text-xs font-bold">
              2
            </span>
            <span>
              กิจกรรม & งบประมาณ ({activityGroups.length} กิจกรรม • {grandTotal.toLocaleString()} บ.)
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveStep(3)}
            className={`py-3 px-4 font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeStep === 3
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <span className="w-5 h-5 rounded-full flex items-center justify-center bg-emerald-100 text-emerald-700 text-xs font-bold">
              3
            </span>
            <span>ผู้ลงนาม 3 ระดับ</span>
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* STEP 1: GENERAL INFO */}
          {activeStep === 1 && (
            <div className="space-y-5 animate-in fade-in-50 duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ปีงบประมาณ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={fiscalYear}
                    onChange={(e) => setFiscalYear(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold"
                    placeholder="2570"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    รหัสโครงการ / ลำดับ
                  </label>
                  <input
                    type="text"
                    value={projectCode}
                    onChange={(e) => setProjectCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                    placeholder="เช่น กองทุน-70-001"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    เบอร์โทรศัพท์ติดต่อ
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                    placeholder="ตัวอย่าง: 075-207038 หรือ 089-xxx-xxxx"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ชื่อโครงการ (แผนงาน/โครงการ) <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="ตัวอย่าง: โครงการบางเป้าเฝ้าระวัง ป้องกันเด็กจมน้ำ ประจำปี 2570 หรือ โครงการใส่ใจดูแลกลุ่มเสี่ยงเบาหวาน-ความดันโลหิตสูง"
                  required
                />
              </div>

              {/* 100% FREE AI PROJECT ASSISTANT PANEL */}
              <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-emerald-50 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-emerald-950/30 border-2 border-indigo-200 dark:border-indigo-800/70 rounded-2xl p-4 space-y-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-sm">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-extrabold text-indigo-950 dark:text-indigo-200">
                          AI ผู้ช่วยคิดและร่างโครงการ สปสช. อัตโนมัติ
                        </h4>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                          ฟรี 100% ไม่มีค่าใช้จ่าย
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        เพียงพิมพ์ <strong>"ชื่อโครงการ"</strong> ด้านบน แล้วกำหนดจำนวนคน ระบบ AI จะช่วยคิดกิจกรรม วัตถุประสงค์ กลุ่มเป้าหมาย ตัวชี้วัด (KPI) และคำนวณรายการค่าใช้จ่ายตามเรต สปสช. ให้ครบทันที
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowGeminiKeyBox((v) => !v)}
                    className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 hover:underline"
                  >
                    {showGeminiKeyBox ? 'ซ่อนตั้งค่า Gemini API' : '⚙️ เชื่อมต่อ Google Gemini ฟรี (ทางเลือกเสริม)'}
                  </button>
                </div>

                {showGeminiKeyBox && (
                  <div className="p-3 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-indigo-200 dark:border-indigo-800 text-xs space-y-2">
                    <div className="font-semibold text-slate-700 dark:text-slate-200">
                      🤖 โหมด AI อัจฉริยะ 2 ระบบ (ฟรี 100% ทั้งคู่):
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                      • <strong>ระบบที่ 1 (ทำงานทันทีโดยไม่ต้องใส่คีย์):</strong> NHSO Expert AI ในตัวเครื่อง วิเคราะห์จากคลังความรู้ระเบียบ สปสช. และฐานข้อมูล 27 โครงการจริงของ ทต.บางเป้า ฟรีถาวร 100%<br />
                      • <strong>ระบบที่ 2 (ทางเลือกเสริม ฟรี):</strong> หากต้องการใช้ Google Gemini 2.5 Flash ช่วยแต่งประโยคเพิ่มเติม สามารถขอ Free API Key ได้ฟรีที่ aistudio.google.com แล้ววางด้านล่าง (ไม่ใส่ก็ใช้งานได้ทันที)
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        value={freeGeminiKey}
                        onChange={(e) => {
                          setFreeGeminiKey(e.target.value);
                          saveStoredFreeGeminiKey(e.target.value);
                        }}
                        placeholder="วาง Gemini API Key ฟรี (AIza...) หรือเว้นว่างเพื่อใช้ AI ในตัวเครื่องฟรีทันที"
                        className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* Quick Parameters for AI Calculation */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1 text-xs">
                  <div className="bg-white/90 dark:bg-slate-900/80 p-2 rounded-xl border border-indigo-100 dark:border-slate-700">
                    <label className="block text-[11px] text-slate-500 font-medium">
                      กลุ่มเป้าหมาย (คน)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={aiParticipants}
                      onChange={(e) => setAiParticipants(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full mt-0.5 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 font-bold text-indigo-700 dark:text-indigo-300 text-xs"
                    />
                  </div>
                  <div className="bg-white/90 dark:bg-slate-900/80 p-2 rounded-xl border border-indigo-100 dark:border-slate-700">
                    <label className="block text-[11px] text-slate-500 font-medium">
                      ผู้สังเกตการณ์/จนท. (คน)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={aiObservers}
                      onChange={(e) => setAiObservers(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full mt-0.5 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 font-bold text-indigo-700 dark:text-indigo-300 text-xs"
                    />
                  </div>
                  <div className="bg-white/90 dark:bg-slate-900/80 p-2 rounded-xl border border-indigo-100 dark:border-slate-700">
                    <label className="block text-[11px] text-slate-500 font-medium">
                      ชั่วโมงวิทยากร (ชม.)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={aiHours}
                      onChange={(e) => setAiHours(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full mt-0.5 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 font-bold text-indigo-700 dark:text-indigo-300 text-xs"
                    />
                  </div>
                  <div className="bg-white/90 dark:bg-slate-900/80 p-2 rounded-xl border border-indigo-100 dark:border-slate-700">
                    <label className="block text-[11px] text-slate-500 font-medium">
                      อาหารว่าง (มื้อ)
                    </label>
                    <select
                      value={aiSnackMeals}
                      onChange={(e) => setAiSnackMeals(Number(e.target.value))}
                      className="w-full mt-0.5 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 font-bold text-xs bg-white dark:bg-slate-800"
                    >
                      <option value={2}>2 มื้อ (เช้า-บ่าย)</option>
                      <option value={1}>1 มื้อ</option>
                      <option value={0}>ไม่มีอาหารว่าง</option>
                    </select>
                  </div>
                  <div className="bg-white/90 dark:bg-slate-900/80 p-2 rounded-xl border border-indigo-100 dark:border-slate-700">
                    <label className="block text-[11px] text-slate-500 font-medium">
                      รูปแบบกิจกรรม
                    </label>
                    <select
                      value={aiActivityCountMode}
                      onChange={(e) => setAiActivityCountMode(e.target.value as any)}
                      className="w-full mt-0.5 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 font-bold text-xs bg-white dark:bg-slate-800"
                    >
                      <option value="auto">AI วิเคราะห์อัตโนมัติ</option>
                      <option value="single">1 กิจกรรมหลัก</option>
                      <option value="two">2 กิจกรรม (อบรม+ติดตาม)</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-700 dark:text-slate-300">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={aiIncludeLunch}
                        onChange={(e) => setAiIncludeLunch(e.target.checked)}
                        className="rounded text-indigo-600"
                      />
                      <span>มีอาหารกลางวัน (75 บ.)</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={aiIncludeVinyl}
                        onChange={(e) => setAiIncludeVinyl(e.target.checked)}
                        className="rounded text-indigo-600"
                      />
                      <span>มีป้ายไวนิล (450 บ.)</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={aiIncludeMaterials}
                        onChange={(e) => setAiIncludeMaterials(e.target.checked)}
                        className="rounded text-indigo-600"
                      />
                      <span>มีค่าเอกสาร/วัสดุอบรม (50 บ./ชุด)</span>
                    </label>
                  </div>

                  <button
                    type="button"
                    disabled={isAiGenerating}
                    onClick={() => handleRunFullAiDraft(true)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 hover:from-indigo-700 hover:via-purple-700 hover:to-emerald-700 text-white text-xs font-extrabold shadow-md flex items-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    {isAiGenerating
                      ? 'กำลังให้ AI วิเคราะห์และร่างโครงการ...'
                      : '✨ ให้ AI ช่วยคิดกิจกรรม + วัตถุประสงค์ + กลุ่มเป้าหมาย + KPI + งบประมาณ'}
                  </button>
                </div>

                {aiStatusBanner && (
                  <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs font-semibold">
                    {aiStatusBanner}
                  </div>
                )}
              </div>

              {/* Category Dropdown (All 8 categories) */}
              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-4">
                <label className="block text-xs font-bold text-emerald-900 dark:text-emerald-300 mb-1.5 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  ประเภทโครงการ สปสช. (ตามข้อ 10 ทั้ง 8 ประเภท) <span className="text-red-500">*</span>
                </label>
                <select
                  value={categoryNumber}
                  onChange={(e) => setCategoryNumber(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                >
                  {NHSO_FUND_CATEGORIES.map((cat) => (
                    <option key={cat.number} value={cat.number}>
                      {cat.title}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  📌 {NHSO_FUND_CATEGORIES.find((c) => c.number === categoryNumber)?.description}
                </p>
              </div>

              {/* Organization Selection (Dropdown + Custom Free-Text) */}
              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  หน่วยงานผู้ขอรับการสนับสนุนงบประมาณ <span className="text-red-500">*</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="block text-xs text-slate-500 mb-1">เลือกจากรายการมาตรฐาน:</span>
                    <select
                      value={selectedOrgPreset}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedOrgPreset(val);
                        if (!val) {
                          setCustomOrgText('');
                          setResponsiblePerson('');
                          setProposerName('');
                          setProposerTitle('');
                          return;
                        }
                        if (val !== 'custom') {
                          setCustomOrgText('');
                          const orgDefault =
                            settings.orgProposerDefaults?.[val] ||
                            KNOWN_PROPOSERS.find((kp) => kp.org === val);
                          if (orgDefault) {
                            setProposerName(orgDefault.name);
                            setProposerTitle(orgDefault.title);
                            setResponsiblePerson(val);
                          }
                        }
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                    >
                      <option value="">-- คลิกเพื่อเลือกหน่วยงานผู้ขอรับงบประมาณ --</option>
                      {PRESET_ORGS.map((org) => (
                        <option key={org} value={org}>
                          {org}
                        </option>
                      ))}
                      <option value="custom">✏️ พิมพ์ระบุหน่วยงานเอง (อิสระ)</option>
                    </select>
                  </div>

                  <div>
                    <span className="block text-xs text-slate-500 mb-1">
                      หรือพิมพ์ชื่อหน่วยงานโดยอิสระ:
                    </span>
                    <input
                      type="text"
                      value={customOrgText}
                      onChange={(e) => {
                        setCustomOrgText(e.target.value);
                        if (selectedOrgPreset !== 'custom') {
                          setSelectedOrgPreset('custom');
                        }
                      }}
                      placeholder="พิมพ์ชื่อหน่วยงาน/กลุ่มประชาชนใหม่..."
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${
                        selectedOrgPreset === 'custom'
                          ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-white dark:bg-slate-900'
                          : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                    ผู้รับผิดชอบโครงการ (ระบุชื่อ-สกุล)
                  </label>
                  <input
                    type="text"
                    value={responsiblePerson}
                    onChange={(e) => setResponsiblePerson(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                    placeholder="เช่น กองสาธารณสุขและสิ่งแวดล้อม หรือ นางสาวปฐมาภรณ์  จันทร์แจ่ม"
                  />
                </div>

                {/* Quick Proposer Selector */}
                <div className="pt-2.5 border-t border-slate-200 dark:border-slate-700/60">
                  <span className="block text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-1 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-emerald-600" />
                    เลือกผู้เสนอโครงการ / ผู้รับผิดชอบ จากรายชื่อมาตรฐาน (แนะนำ - กรอกให้อัตโนมัติทุกช่อง):
                  </span>
                  <select
                    onChange={(e) => {
                      const idx = Number(e.target.value);
                      if (!isNaN(idx) && KNOWN_PROPOSERS[idx]) {
                        const chosen = KNOWN_PROPOSERS[idx];
                        setSelectedOrgPreset(chosen.org);
                        setCustomOrgText('');
                        setResponsiblePerson(chosen.name);
                        setProposerName(chosen.name);
                        setProposerTitle(chosen.title);
                      }
                    }}
                    defaultValue=""
                    className="w-full px-3 py-2 rounded-lg border border-emerald-400 dark:border-emerald-600 bg-emerald-50/50 dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200"
                  >
                    <option value="" disabled>-- คลิกเพื่อเลือกผู้เสนอโครงการ / หน่วยงาน --</option>
                    {KNOWN_PROPOSERS.map((kp, idx) => (
                      <option key={idx} value={idx}>
                        {kp.org} — {kp.name} ({kp.title})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: ACTIVITIES & BUDGET (13 COLUMNS WITH MULTIPLE ACTIVITIES) */}
          {activeStep === 2 && (
            <div className="space-y-6 animate-in fade-in-50 duration-150">
              {/* Top Bar: Multi-Activity Info + 1-Click Free AI Draft */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-violet-50 via-fuchsia-50 to-blue-50 dark:from-violet-950/30 dark:via-fuchsia-950/20 dark:to-blue-950/30 border border-violet-200 dark:border-violet-800/60 rounded-xl p-3.5 text-xs text-slate-800 dark:text-slate-200">
                <div className="space-y-0.5">
                  <div className="font-bold text-violet-900 dark:text-violet-200 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-violet-600" />
                    ผู้ช่วย AI อัจฉริยะ (ฟรี 100%): ช่วยคิดรายช่อง หรือร่างครบทั้งโครงการ
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400">
                    โครงการนี้มี <strong>{activityGroups.length}</strong> กิจกรรมหลัก • กดปุ่ม{' '}
                    <span className="font-bold text-violet-700 dark:text-violet-300">✨ AI ช่วยคิด</span>{' '}
                    ที่หัวช่องใดก็ได้เพื่อให้ AI เติมเฉพาะช่องนั้น หรือกดร่างทั้งหมดในคลิกเดียว
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRunFullAiDraft}
                    disabled={aiGenerating}
                    className="px-3 py-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    ✨ ให้ AI ร่างกิจกรรม + งบทั้งหมด
                  </button>
                  <button
                    type="button"
                    onClick={handleAddActivityGroup}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1 shadow-sm transition-colors whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" /> เพิ่มกิจกรรมที่ {activityGroups.length + 1}
                  </button>
                </div>
              </div>

              {aiStatusBanner && (
                <div className="px-3.5 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-center justify-between gap-2">
                  <span>{aiStatusBanner}</span>
                  <button
                    type="button"
                    onClick={() => setAiStatusBanner(null)}
                    className="text-emerald-600 hover:text-emerald-800 font-bold"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Render each activity group card */}
              {activityGroups.map((group, gIdx) => {
                const groupSubtotal = (group.budgetLines || []).reduce(
                  (s, l) => s + (l.total || 0),
                  0
                );

                return (
                  <div
                    key={group.id || gIdx}
                    className="border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-5 bg-slate-50/60 dark:bg-slate-800/30 space-y-4 shadow-sm relative"
                  >
                    {/* Activity Header Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                        <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                          {gIdx + 1}
                        </span>
                        <input
                          type="text"
                          value={group.activityName}
                          onChange={(e) =>
                            handleUpdateActivityGroup(group.id, 'activityName', e.target.value)
                          }
                          placeholder={`ตัวอย่าง: ${gIdx + 1}. กิจกรรมอบรมให้ความรู้และปรับเปลี่ยนพฤติกรรม`}
                          className="font-bold text-sm px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 flex-1"
                        />
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-3 py-1 rounded-lg">
                          งบกิจกรรมนี้: {groupSubtotal.toLocaleString()} บาท
                        </span>
                        {activityGroups.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveActivityGroup(group.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors"
                            title="ลบกิจกรรมนี้"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Columns 2 to 7 Form */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-semibold text-slate-700 dark:text-slate-300">
                            กิจกรรม (คอลัมน์ที่ 2) <span className="text-red-500">*</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => handleAiSuggestSingleField(group.id, 'activities')}
                            className="text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:text-violet-800 flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800 transition-colors"
                          >
                            <Sparkles className="w-3 h-3" /> ✨ AI ช่วยคิดกิจกรรม
                          </button>
                        </div>
                        <textarea
                          rows={3}
                          value={group.activities}
                          onChange={(e) =>
                            handleUpdateActivityGroup(group.id, 'activities', e.target.value)
                          }
                          placeholder="ตัวอย่าง: - อบรมให้ความรู้เรื่องการช่วยเหลือผู้จมน้ำและการปฐมพยาบาลเบื้องต้น จำนวน 1 วัน"
                          className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-semibold text-slate-700 dark:text-slate-300">
                            วัตถุประสงค์ (คอลัมน์ที่ 3) <span className="text-red-500">*</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => handleAiSuggestSingleField(group.id, 'objectives')}
                            className="text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:text-violet-800 flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800 transition-colors"
                          >
                            <Sparkles className="w-3 h-3" /> ✨ AI ช่วยคิดวัตถุประสงค์
                          </button>
                        </div>
                        <textarea
                          rows={3}
                          value={group.objectives}
                          onChange={(e) =>
                            handleUpdateActivityGroup(group.id, 'objectives', e.target.value)
                          }
                          placeholder="ตัวอย่าง: 1. เพื่อให้กลุ่มเป้าหมายมีความรู้ความเข้าใจในการดูแลสุขภาพและการป้องกันโรคเพิ่มขึ้น"
                          className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-semibold text-slate-700 dark:text-slate-300">
                            กลุ่มเป้าหมาย (คอลัมน์ที่ 4)
                          </label>
                          <button
                            type="button"
                            onClick={() => handleAiSuggestSingleField(group.id, 'targetGroup')}
                            className="text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:text-violet-800 flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800 transition-colors"
                          >
                            <Sparkles className="w-3 h-3" /> ✨ AI ช่วยคิดกลุ่มเป้าหมาย
                          </button>
                        </div>
                        <textarea
                          rows={3}
                          value={group.targetGroup}
                          onChange={(e) =>
                            handleUpdateActivityGroup(group.id, 'targetGroup', e.target.value)
                          }
                          placeholder="ตัวอย่าง: 1. เด็กและเยาวชน อายุ 6-15 ปี จำนวน 30 คน / 2. วิทยากรและเจ้าหน้าที่ 7 คน (รวม 37 คน)"
                          className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-semibold text-slate-700 dark:text-slate-300">
                            ตัวชี้วัด (KPI) (คอลัมน์ที่ 5)
                          </label>
                          <button
                            type="button"
                            onClick={() => handleAiSuggestSingleField(group.id, 'kpi')}
                            className="text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:text-violet-800 flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800 transition-colors"
                          >
                            <Sparkles className="w-3 h-3" /> ✨ AI ช่วยคิดตัวชี้วัด (KPI)
                          </button>
                        </div>
                        <textarea
                          rows={3}
                          value={group.kpi}
                          onChange={(e) =>
                            handleUpdateActivityGroup(group.id, 'kpi', e.target.value)
                          }
                          placeholder="ตัวอย่าง: 1. ร้อยละ 80 ของผู้เข้ารับการอบรมมีความรู้และทักษะการดูแลสุขภาพเพิ่มขึ้น"
                          className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-semibold text-slate-700 dark:text-slate-300">
                            พื้นที่ดำเนินการ (คอลัมน์ที่ 6)
                          </label>
                          <button
                            type="button"
                            onClick={() => handleAiSuggestSingleField(group.id, 'location_duration')}
                            className="text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:text-violet-800 flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800 transition-colors"
                          >
                            <Sparkles className="w-3 h-3" /> ✨ AI แนะนำพื้นที่ & ระยะเวลา
                          </button>
                        </div>
                        <input
                          type="text"
                          value={group.location}
                          onChange={(e) =>
                            handleUpdateActivityGroup(group.id, 'location', e.target.value)
                          }
                          placeholder="ตัวอย่าง: ห้องประชุมศาลหลักเมืองท่า หรือ พื้นที่ตำบลบางเป้า"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          ระยะเวลาดำเนินการ (คอลัมน์ที่ 7)
                        </label>
                        <input
                          type="text"
                          value={group.duration}
                          onChange={(e) =>
                            handleUpdateActivityGroup(group.id, 'duration', e.target.value)
                          }
                          placeholder={`ตัวอย่าง: ต.ค. ${Number(fiscalYear) - 1} - ก.ย. ${fiscalYear}`}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                        />
                      </div>
                    </div>

                    {/* Budget Table for this Activity Group */}
                    <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5 text-emerald-600" />
                          รายการค่าใช้จ่ายในกิจกรรมนี้ ({group.budgetLines?.length || 0} รายการ)
                        </span>

                        {/* Quick Presets + AI Budget Button */}
                        <div className="flex flex-wrap gap-1.5 text-[11px]">
                          <button
                            type="button"
                            onClick={() => handleAiSuggestSingleField(group.id, 'budgetLines')}
                            className="px-2.5 py-0.5 rounded bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold hover:from-violet-700 hover:to-fuchsia-700 flex items-center gap-1 shadow-sm"
                          >
                            <Sparkles className="w-3 h-3" /> ✨ AI ช่วยคิดรายการค่าใช้จ่าย
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleAddBudgetLineToGroup(
                                group.id,
                                `${gIdx + 1}.${(group.budgetLines?.length || 0) + 1}) ค่าตอบแทนวิทยากร`,
                                'ชั่วโมง',
                                settings.standardRates?.speakerHourly || 600,
                                5
                              )
                            }
                            className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-emerald-500"
                          >
                            + วิทยากร (600 บ.)
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleAddBudgetLineToGroup(
                                group.id,
                                `${gIdx + 1}.${(group.budgetLines?.length || 0) + 1}) ค่าอาหารกลางวัน`,
                                'ชุด',
                                settings.standardRates?.lunchPerMeal || 75,
                                37
                              )
                            }
                            className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-emerald-500"
                          >
                            + อาหารกลางวัน (75 บ.)
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleAddBudgetLineToGroup(
                                group.id,
                                `${gIdx + 1}.${(group.budgetLines?.length || 0) + 1}) ค่าอาหารว่างและเครื่องดื่ม`,
                                'ชุด',
                                settings.standardRates?.snackPerMeal || 25,
                                74
                              )
                            }
                            className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-emerald-500"
                          >
                            + อาหารว่าง (25 บ.)
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleAddBudgetLineToGroup(
                                group.id,
                                `${gIdx + 1}.${(group.budgetLines?.length || 0) + 1}) ค่าป้ายไวนิลขนาด 1.2*2.5 เมตร`,
                                'ป้าย',
                                settings.standardRates?.vinylPerBanner || 450,
                                1
                              )
                            }
                            className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-emerald-500"
                          >
                            + ไวนิล (450 บ.)
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleAddBudgetLineToGroup(
                                group.id,
                                '',
                                '',
                                0,
                                0
                              )
                            }
                            className="px-2.5 py-0.5 rounded bg-emerald-600 text-white font-medium hover:bg-emerald-700 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> เพิ่มแถวว่าง
                          </button>
                        </div>
                      </div>

                      {/* Line Items Table */}
                      <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-slate-900">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                            <tr>
                              <th className="py-2 px-3">รายการค่าใช้จ่าย</th>
                              <th className="py-2 px-2 w-20 text-center">จำนวน</th>
                              <th className="py-2 px-2 w-20 text-center">หน่วย</th>
                              <th className="py-2 px-2 w-28 text-right">ราคา/หน่วย</th>
                              <th className="py-2 px-3 w-28 text-right">รวมเงิน (บาท)</th>
                              <th className="py-2 px-2 w-10 text-center">ลบ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {(group.budgetLines || []).map((line, lIdx) => (
                              <tr key={line.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                <td className="p-1.5">
                                  <input
                                    type="text"
                                    value={line.name}
                                    onChange={(e) =>
                                      handleUpdateBudgetLineInGroup(
                                        group.id,
                                        line.id,
                                        'name',
                                        e.target.value
                                      )
                                    }
                                    placeholder={`ตัวอย่าง: ${gIdx + 1}.${lIdx + 1}) ค่าตอบแทนวิทยากร`}
                                    className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-xs"
                                  />
                                </td>
                                <td className="p-1.5">
                                  <input
                                    type="number"
                                    value={line.quantity === 0 ? '' : line.quantity}
                                    onChange={(e) =>
                                      handleUpdateBudgetLineInGroup(
                                        group.id,
                                        line.id,
                                        'quantity',
                                        e.target.value === '' ? 0 : e.target.value
                                      )
                                    }
                                    placeholder="เช่น 5"
                                    className="w-full px-1 py-1 text-center rounded border border-slate-200 dark:border-slate-700 text-xs"
                                  />
                                </td>
                                <td className="p-1.5">
                                  <input
                                    type="text"
                                    value={line.unit}
                                    onChange={(e) =>
                                      handleUpdateBudgetLineInGroup(
                                        group.id,
                                        line.id,
                                        'unit',
                                        e.target.value
                                      )
                                    }
                                    placeholder="เช่น ชั่วโมง/ชุด"
                                    className="w-full px-1 py-1 text-center rounded border border-slate-200 dark:border-slate-700 text-xs"
                                  />
                                </td>
                                <td className="p-1.5">
                                  <input
                                    type="number"
                                    step="any"
                                    value={line.unitPrice === 0 ? '' : line.unitPrice}
                                    onChange={(e) =>
                                      handleUpdateBudgetLineInGroup(
                                        group.id,
                                        line.id,
                                        'unitPrice',
                                        e.target.value === '' ? 0 : e.target.value
                                      )
                                    }
                                    placeholder="เช่น 600"
                                    className="w-full px-2 py-1 text-right rounded border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                                  />
                                </td>
                                <td className="p-1.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                  {(line.total || 0).toLocaleString()}
                                </td>
                                <td className="p-1.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveBudgetLineFromGroup(group.id, line.id)}
                                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Add Activity Button */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={handleAddActivityGroup}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow transition-transform hover:scale-105"
                >
                  <Plus className="w-4 h-4 text-emerald-400" />
                  เพิ่มกิจกรรมที่ {activityGroups.length + 1} ในโครงการนี้
                </button>
              </div>

              {/* Grand Total Summary Banner */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-5 shadow-lg flex items-center justify-between">
                <div>
                  <span className="text-xs text-white/80 font-medium">
                    รวมงบประมาณทั้งสิ้นของโครงการ (ทุกกิจกรรมรวมกัน):
                  </span>
                  <div className="text-3xl font-black tracking-tight">
                    {grandTotal.toLocaleString()}{' '}
                    <span className="text-base font-normal text-white/80">บาท</span>
                  </div>
                </div>
                <div className="text-right text-xs text-white/80">
                  <div>จำนวนกิจกรรมทั้งหมด: {activityGroups.length} กิจกรรม</div>
                  <div>
                    จำนวนรายการค่าใช้จ่ายรวม:{' '}
                    {activityGroups.reduce((s, g) => s + (g.budgetLines?.length || 0), 0)} รายการ
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SIGNERS */}
          {activeStep === 3 && (
            <div className="space-y-5 animate-in fade-in-50 duration-150">
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-xl p-4 text-xs text-blue-800 dark:text-blue-300">
                ✍️ <strong>ผู้ลงนาม 3 ระดับ:</strong> ข้อมูลนี้จะปรากฏในส่วนท้ายของแบบฟอร์ม 13
                คอลัมน์ (สามารถปรับเปลี่ยนเฉพาะโครงการนี้ได้)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 1. ผู้เสนอ */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      ระดับที่ 1: ผู้เสนอโครงการ
                    </h4>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-500 mb-1">
                      เลือกจากรายชื่อผู้เสนอมาตรฐาน:
                    </span>
                    <select
                      onChange={(e) => {
                        const idx = Number(e.target.value);
                        if (!isNaN(idx) && KNOWN_PROPOSERS[idx]) {
                          setProposerName(KNOWN_PROPOSERS[idx].name);
                          setProposerTitle(KNOWN_PROPOSERS[idx].title);
                        }
                      }}
                      defaultValue=""
                      className="w-full px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200"
                    >
                      <option value="" disabled>-- เลือกชื่อ-ตำแหน่งผู้เสนอ --</option>
                      {KNOWN_PROPOSERS.map((kp, idx) => (
                        <option key={idx} value={idx}>
                          {kp.name} ({kp.title})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      ชื่อ-สกุล ผู้เสนอ
                    </label>
                    <input
                      type="text"
                      value={proposerName}
                      onChange={(e) => setProposerName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      placeholder="เช่น นางสาวปฐมาภรณ์  จันทร์แจ่ม"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      ตำแหน่ง
                    </label>
                    <input
                      type="text"
                      value={proposerTitle}
                      onChange={(e) => setProposerTitle(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      placeholder="เช่น ผู้อำนวยการกองสาธารณสุขและสิ่งแวดล้อม"
                    />
                  </div>
                </div>

                {/* 2. ผู้เห็นชอบ */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      ระดับที่ 2: ผู้เห็นชอบโครงการ
                    </h4>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      ชื่อ-สกุล ผู้เห็นชอบ
                    </label>
                    <input
                      type="text"
                      value={endorserName}
                      onChange={(e) => setEndorserName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      placeholder="เช่น นายโชคชัย  รอดรักษา"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      ตำแหน่ง
                    </label>
                    <input
                      type="text"
                      value={endorserTitle}
                      onChange={(e) => setEndorserTitle(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      placeholder="เช่น เลขานุการกองทุนฯ ทต.บางเป้า"
                    />
                  </div>
                </div>

                {/* 3. ผู้อนุมัติ */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      ระดับที่ 3: ผู้อนุมัติโครงการ
                    </h4>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      ชื่อ-สกุล ผู้อนุมัติ
                    </label>
                    <input
                      type="text"
                      value={approverName}
                      onChange={(e) => setApproverName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      placeholder="เช่น นายละดม  เชื้อช่วย"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      ตำแหน่ง
                    </label>
                    <input
                      type="text"
                      value={approverTitle}
                      onChange={(e) => setApproverTitle(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      placeholder="เช่น ประธานกองทุนฯ ทต.บางเป้า"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {activeStep > 1 && (
              <button
                type="button"
                onClick={() => setActiveStep((prev) => (prev - 1) as any)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                ย้อนกลับ
              </button>
            )}
            {activeStep < 3 && (
              <button
                type="button"
                onClick={() => setActiveStep((prev) => (prev + 1) as any)}
                className="px-4 py-2 text-xs font-medium text-white bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 rounded-xl transition-colors"
              >
                ถัดไป: {activeStep === 1 ? 'กิจกรรม & ตารางงบประมาณ' : 'ผู้ลงนาม 3 ระดับ'}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-6 py-2.5 text-xs font-medium text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-md flex items-center gap-2 transition-all hover:scale-[1.02]"
            >
              <Save className="w-4 h-4" />
              บันทึกแบบเสนอโครงการ ({grandTotal.toLocaleString()} บ.)
            </button>
          </div>
        </div>

        {/* Template Picker Sub-Modal */}
        {showTemplatePicker && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Copy className="w-4 h-4 text-emerald-600" />
                  เลือกโครงการแม่แบบปี 2569 เพื่อนำมาแก้ไข
                </h3>
                <button
                  onClick={() => setShowTemplatePicker(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 my-3">
                {existingProjects
                  .filter((p) => p.fiscalYear === '2569')
                  .map((p) => {
                    const actsCount = p.activityGroups?.length || 1;
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleApplyTemplate(p)}
                        className="py-3 px-3 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl cursor-pointer transition-colors flex items-center justify-between"
                      >
                        <div className="pr-4">
                          <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            {p.orderNumber ? `${p.orderNumber}. ` : ''}
                            {p.projectName.split('\n')[0]}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {p.proposingOrg} • ประเภท {p.categoryNumber || 1} • {actsCount} กิจกรรม
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            {p.budgetRequested.toLocaleString()} บาท
                          </div>
                          <span className="text-[10px] text-emerald-700 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                            คลิกเพื่อใช้แม่แบบนี้
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-right">
                <button
                  type="button"
                  onClick={() => setShowTemplatePicker(false)}
                  className="px-4 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
