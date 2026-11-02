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
} from 'lucide-react';
import {
  NhsoProject,
  NhsoFundBudgetLine,
  NhsoFundSettings,
  NHSO_FUND_CATEGORIES,
} from '../types/index.ts';

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

export const NhsoProjectBuilderModal: React.FC<NhsoProjectBuilderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialProject,
  settings,
  existingProjects = [],
}) => {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [fiscalYear, setFiscalYear] = useState<string>(
    initialProject?.fiscalYear || settings.fiscalYear || '2570'
  );
  const [projectCode, setProjectCode] = useState<string>(
    initialProject?.projectCode || `กองทุน-70-00${existingProjects.length + 1}`
  );
  const [projectName, setProjectName] = useState<string>(initialProject?.projectName || '');
  const [categoryNumber, setCategoryNumber] = useState<number>(initialProject?.categoryNumber || 1);
  const [selectedOrgPreset, setSelectedOrgPreset] = useState<string>(() => {
    if (!initialProject?.proposingOrg) return PRESET_ORGS[0];
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

  // 13 Columns Details
  const [activities, setActivities] = useState<string>(initialProject?.activities || '');
  const [objectives, setObjectives] = useState<string>(initialProject?.objectives || '');
  const [targetGroup, setTargetGroup] = useState<string>(initialProject?.targetGroup || '');
  const [targetParticipants, setTargetParticipants] = useState<number>(
    initialProject?.targetParticipants || 0
  );
  const [kpi, setKpi] = useState<string>(initialProject?.kpi || '');
  const [location, setLocation] = useState<string>(
    initialProject?.location || 'พื้นที่ตำบลบางเป้า อำเภอกันตัง จังหวัดตรัง'
  );
  const [duration, setDuration] = useState<string>(
    initialProject?.duration || 'ต.ค. 2569 - ก.ย. 2570'
  );

  // Budget Lines
  const [budgetLines, setBudgetLines] = useState<NhsoFundBudgetLine[]>(
    initialProject?.budgetLines && initialProject.budgetLines.length > 0
      ? initialProject.budgetLines
      : [
          {
            id: 'line_1',
            activityCategory: '1. กิจกรรมอบรมให้ความรู้',
            name: '1.1) ค่าตอบแทนวิทยากร',
            quantity: 6,
            unit: 'ชั่วโมง',
            unitPrice: settings.standardRates?.speakerHourly || 600,
            total: 6 * (settings.standardRates?.speakerHourly || 600),
          },
          {
            id: 'line_2',
            activityCategory: '1. กิจกรรมอบรมให้ความรู้',
            name: '1.2) ค่าอาหารกลางวัน',
            quantity: 50,
            unit: 'มื้อ',
            unitPrice: settings.standardRates?.lunchPerMeal || 75,
            total: 50 * (settings.standardRates?.lunchPerMeal || 75),
          },
          {
            id: 'line_3',
            activityCategory: '1. กิจกรรมอบรมให้ความรู้',
            name: '1.3) ค่าอาหารว่างและเครื่องดื่ม',
            quantity: 50,
            unit: 'ชุด',
            unitPrice: settings.standardRates?.snackPerMeal || 25,
            total: 50 * (settings.standardRates?.snackPerMeal || 25),
          },
        ]
  );

  // Signers
  const defaultOrgProposer = settings.orgProposerDefaults?.[effectiveOrg] || {
    name: responsiblePerson || '',
    title: 'ผู้เสนอโครงการ',
  };

  const [proposerName, setProposerName] = useState<string>(
    initialProject?.signers?.proposerName || defaultOrgProposer.name
  );
  const [proposerTitle, setProposerTitle] = useState<string>(
    initialProject?.signers?.proposerTitle || defaultOrgProposer.title
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

  // Clone from template state
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  // Calculate total budget automatically
  const calculatedBudgetTotal = budgetLines.reduce((sum, item) => sum + (item.total || 0), 0);

  // Auto-update proposer when org preset changes
  useEffect(() => {
    if (selectedOrgPreset !== 'custom' && settings.orgProposerDefaults?.[selectedOrgPreset]) {
      const match = settings.orgProposerDefaults[selectedOrgPreset];
      if (!initialProject?.signers?.proposerName) {
        setProposerName(match.name);
        setProposerTitle(match.title);
      }
    }
  }, [selectedOrgPreset, settings.orgProposerDefaults]);

  if (!isOpen) return null;

  // Add standard rate items
  const handleAddBudgetLine = (
    name = '',
    unit = 'รายการ',
    unitPrice = 0,
    quantity = 1,
    activityCategory = '1. กิจกรรมดำเนินงาน'
  ) => {
    const newLine: NhsoFundBudgetLine = {
      id: `line_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      activityCategory,
      name,
      quantity,
      unit,
      unitPrice,
      total: quantity * unitPrice,
    };
    setBudgetLines([...budgetLines, newLine]);
  };

  const handleUpdateBudgetLine = (
    id: string,
    field: keyof NhsoFundBudgetLine,
    value: string | number
  ) => {
    setBudgetLines((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          const q = field === 'quantity' ? Number(value) : item.quantity;
          const p = field === 'unitPrice' ? Number(value) : item.unitPrice;
          updated.total = q * p;
        }
        return updated;
      })
    );
  };

  const handleRemoveBudgetLine = (id: string) => {
    setBudgetLines(budgetLines.filter((l) => l.id !== id));
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
    setActivities(tmpl.activities || '');
    setObjectives(tmpl.objectives || '');
    setTargetGroup(tmpl.targetGroup || '');
    setTargetParticipants(tmpl.targetParticipants || 0);
    setKpi(tmpl.kpi || '');
    setLocation(tmpl.location || 'พื้นที่ตำบลบางเป้า');
    setDuration(`ต.ค. ${Number(fiscalYear) - 1} - ก.ย. ${fiscalYear}`);
    setResponsiblePerson(tmpl.responsiblePerson || '');

    // Clone budget lines with new IDs
    if (tmpl.budgetLines && tmpl.budgetLines.length > 0) {
      setBudgetLines(
        tmpl.budgetLines.map((l, idx) => ({
          ...l,
          id: `line_clone_${idx}_${Date.now()}`,
        }))
      );
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

      activities: activities.trim(),
      objectives: objectives.trim(),
      targetGroup: targetGroup.trim(),
      targetParticipants: Number(targetParticipants) || 0,
      kpi: kpi.trim(),
      location: location.trim(),
      duration: duration.trim(),

      budgetLines,
      budgetRequested: calculatedBudgetTotal,
      budgetApproved: initialProject?.budgetApproved || calculatedBudgetTotal,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
                แม่แบบมาตรฐาน 13 คอลัมน์ กองทุนหลักประกันสุขภาพตำบลบางเป้า
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Clone Button */}
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

        {/* Wizard Step Navigation */}
        <div className="grid grid-cols-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs">
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
            <span>เนื้อหา & ตัวชี้วัด (13 คอลัมน์)</span>
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
            <span>ตารางงบประมาณ ({calculatedBudgetTotal.toLocaleString()} บ.)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveStep(4)}
            className={`py-3 px-4 font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeStep === 4
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <span className="w-5 h-5 rounded-full flex items-center justify-center bg-emerald-100 text-emerald-700 text-xs font-bold">
              4
            </span>
            <span>ผู้ลงนาม 3 ระดับ</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* STEP 1: GENERAL & CATEGORY */}
          {activeStep === 1 && (
            <div className="space-y-5 animate-in fade-in-50 duration-150">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    placeholder="เช่น 089-xxx-xxxx"
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
                  placeholder="เช่น โครงการตรวจคัดกรองเบาหวานและความดันโลหิตสูงเชิงรุกในชุมชน ประจำปี 2570"
                  required
                />
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="block text-xs text-slate-500 mb-1">เลือกจากรายการมาตรฐาน:</span>
                    <select
                      value={selectedOrgPreset}
                      onChange={(e) => {
                        setSelectedOrgPreset(e.target.value);
                        if (e.target.value !== 'custom') {
                          setCustomOrgText('');
                        }
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                    >
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
                    placeholder="เช่น นางสาวปฐมาภรณ์  จันทร์แจ่ม หรือ ประธาน อสม. ม.1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: DETAILS & 13 COLUMNS */}
          {activeStep === 2 && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  กิจกรรมที่จะดำเนินการ (คอลัมน์ที่ 2) <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={activities}
                  onChange={(e) => setActivities(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-emerald-500"
                  placeholder="1. อบรมให้ความรู้เรื่อง...\n2. จัดกิจกรรมตรวจคัดกรอง...\n3. ติดตามและประเมินผล..."
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  วัตถุประสงค์ (คอลัมน์ที่ 3) <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={objectives}
                  onChange={(e) => setObjectives(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-emerald-500"
                  placeholder="1. เพื่อให้กลุ่มเป้าหมายมีความรู้ความเข้าใจ...\n2. เพื่อส่งเสริมให้เกิดพฤติกรรมสุขภาพที่ดี..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    กลุ่มเป้าหมาย (คอลัมน์ที่ 4)
                  </label>
                  <textarea
                    rows={2}
                    value={targetGroup}
                    onChange={(e) => setTargetGroup(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                    placeholder="เช่น ประชาชนกลุ่มเสี่ยงโรคเรื้อรัง ม.1-7 จำนวน 120 คน"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    จำนวนกลุ่มเป้าหมาย (คน)
                  </label>
                  <input
                    type="number"
                    value={targetParticipants}
                    onChange={(e) => setTargetParticipants(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold"
                    placeholder="120"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ตัวชี้วัดความสำเร็จ (KPI) (คอลัมน์ที่ 5)
                </label>
                <textarea
                  rows={3}
                  value={kpi}
                  onChange={(e) => setKpi(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                  placeholder="1. ร้อยละ 80 ของกลุ่มเป้าหมายมีความรู้เพิ่มขึ้น\n2. ร้อยละ 90 เข้าร่วมกิจกรรมจนเสร็จสิ้น"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    พื้นที่ดำเนินการ (คอลัมน์ที่ 6)
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                    placeholder="เช่น ตำบลบางเป้า อำเภอกันตัง จังหวัดตรัง"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ระยะเวลาดำเนินการ (คอลัมน์ที่ 7)
                  </label>
                  <input
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                    placeholder="เช่น ต.ค. 2569 - ก.ย. 2570 หรือ มี.ค. - เม.ย. 2570"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: BUDGET CALCULATOR */}
          {activeStep === 3 && (
            <div className="space-y-5 animate-in fade-in-50 duration-150">
              {/* Quick Preset Buttons */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  เพิ่มรายการด่วนตามอัตรามาตรฐาน สปสช.:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleAddBudgetLine(
                        'ค่าตอบแทนวิทยากร (6 ชม. x 600 บ.)',
                        'ชั่วโมง',
                        settings.standardRates?.speakerHourly || 600,
                        6
                      )
                    }
                    className="px-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:border-emerald-500 rounded-lg text-slate-700 dark:text-slate-200 shadow-sm transition-colors"
                  >
                    + วิทยากร (600 บ./ชม.)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleAddBudgetLine(
                        'ค่าอาหารกลางวันผู้เข้าร่วมอบรม',
                        'มื้อ',
                        settings.standardRates?.lunchPerMeal || 75,
                        50
                      )
                    }
                    className="px-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:border-emerald-500 rounded-lg text-slate-700 dark:text-slate-200 shadow-sm transition-colors"
                  >
                    + อาหารกลางวัน (75 บ./มื้อ)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleAddBudgetLine(
                        'ค่าอาหารว่างและเครื่องดื่ม',
                        'ชุด',
                        settings.standardRates?.snackPerMeal || 25,
                        50
                      )
                    }
                    className="px-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:border-emerald-500 rounded-lg text-slate-700 dark:text-slate-200 shadow-sm transition-colors"
                  >
                    + อาหารว่าง (25 บ./ชุด)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleAddBudgetLine(
                        'ค่าป้ายไวนิลโครงการ ขนาด 1.2 x 2.5 เมตร',
                        'ป้าย',
                        settings.standardRates?.vinylPerBanner || 450,
                        1
                      )
                    }
                    className="px-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:border-emerald-500 rounded-lg text-slate-700 dark:text-slate-200 shadow-sm transition-colors"
                  >
                    + ป้ายไวนิล (450 บ.)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleAddBudgetLine(
                        'ค่าผ้าอ้อมผู้ใหญ่ สปสช.',
                        'ชิ้น',
                        settings.standardRates?.adultDiaperPerPiece || 9.5,
                        500
                      )
                    }
                    className="px-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:border-emerald-500 rounded-lg text-slate-700 dark:text-slate-200 shadow-sm transition-colors"
                  >
                    + ผ้าอ้อมผู้ใหญ่ (9.50 บ.)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddBudgetLine('', 'รายการ', 0, 1)}
                    className="px-3 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm font-medium flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> เพิ่มแถวใหม่
                  </button>
                </div>
              </div>

              {/* Table of Budget Lines */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">หมวด/รายการค่าใช้จ่าย</th>
                      <th className="py-2.5 px-2 w-20 text-center">จำนวน</th>
                      <th className="py-2.5 px-2 w-20 text-center">หน่วย</th>
                      <th className="py-2.5 px-2 w-28 text-right">ราคา/หน่วย</th>
                      <th className="py-2.5 px-3 w-32 text-right">รวมเงิน (บาท)</th>
                      <th className="py-2.5 px-2 w-10 text-center">ลบ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {budgetLines.map((line) => (
                      <tr key={line.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="p-2">
                          <input
                            type="text"
                            value={line.name}
                            onChange={(e) => handleUpdateBudgetLine(line.id, 'name', e.target.value)}
                            placeholder="เช่น 1.1) ค่าตอบแทนวิทยากร"
                            className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={line.quantity}
                            onChange={(e) =>
                              handleUpdateBudgetLine(line.id, 'quantity', e.target.value)
                            }
                            className="w-full px-1.5 py-1 text-center rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={line.unit}
                            onChange={(e) => handleUpdateBudgetLine(line.id, 'unit', e.target.value)}
                            className="w-full px-1.5 py-1 text-center rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="any"
                            value={line.unitPrice}
                            onChange={(e) =>
                              handleUpdateBudgetLine(line.id, 'unitPrice', e.target.value)
                            }
                            className="w-full px-2 py-1 text-right rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="p-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {(line.total || 0).toLocaleString()}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveBudgetLine(line.id)}
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

              {/* Budget Total Summary Card */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    รวมงบประมาณทั้งสิ้นที่ขอรับการสนับสนุน:
                  </span>
                  <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
                    {calculatedBudgetTotal.toLocaleString()}{' '}
                    <span className="text-sm font-normal text-slate-600 dark:text-slate-400">
                      บาท
                    </span>
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  จำนวนรายการค่าใช้จ่าย: {budgetLines.length} รายการ
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: SIGNERS */}
          {activeStep === 4 && (
            <div className="space-y-5 animate-in fade-in-50 duration-150">
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-xl p-4 text-xs text-blue-800 dark:text-blue-300">
                ✍️ <strong>ผู้ลงนาม 3 ระดับ:</strong> ข้อมูลนี้จะปรากฏในส่วนท้ายของแบบฟอร์ม 13
                คอลัมน์ (สามารถปรับเปลี่ยนเฉพาะโครงการนี้ได้)
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. ผู้เสนอ */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      ระดับที่ 1: ผู้เสนอโครงการ
                    </h4>
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
            {activeStep < 4 && (
              <button
                type="button"
                onClick={() => setActiveStep((prev) => (prev + 1) as any)}
                className="px-4 py-2 text-xs font-medium text-white bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 rounded-xl transition-colors"
              >
                ถัดไป: {activeStep === 1 ? 'เนื้อหาโครงการ' : activeStep === 2 ? 'ตารางงบประมาณ' : 'ผู้ลงนาม'}
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
              บันทึกแบบเสนอโครงการ
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
                  .map((p) => (
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
                          {p.proposingOrg} • ประเภท {p.categoryNumber || 1}
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
                  ))}
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
