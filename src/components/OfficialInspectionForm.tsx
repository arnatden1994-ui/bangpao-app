import React, { useState, useEffect, useMemo } from 'react';
import {
  Save,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Building,
  Printer,
  Settings,
} from 'lucide-react';
import {
  OfficialInspectionFormState,
  RawMaterialItem,
  LicenseRecord,
  SignerSettings,
  DEFAULT_SIGNER_SETTINGS,
  InspectorSignerItem,
} from '../types/index.ts';
import { OFFICIAL_25_CRITERIA, OFFICIAL_BUSINESS_CATEGORIES } from '../data/officialCriteria.ts';

interface OfficialInspectionFormProps {
  existingLicenses: LicenseRecord[];
  initialLicense?: LicenseRecord | null;
  signerSettings?: SignerSettings;
  onOpenSignerSettings?: () => void;
  onSave: (data: OfficialInspectionFormState, newLicense?: LicenseRecord) => void;
  onGoToDashboard: () => void;
  onPrintReportImmediately?: (lic: LicenseRecord) => void;
}

export const OfficialInspectionForm: React.FC<OfficialInspectionFormProps> = ({
  existingLicenses,
  initialLicense,
  signerSettings,
  onOpenSignerSettings,
  onSave,
  onGoToDashboard,
  onPrintReportImmediately,
}) => {
  // Build unified list of signers/inspectors from SignerSettings
  const availableSigners = useMemo<InspectorSignerItem[]>(() => {
    const s = signerSettings || DEFAULT_SIGNER_SETTINGS;
    const baseList: InspectorSignerItem[] =
      s.inspectors && s.inspectors.length > 0
        ? [...s.inspectors]
        : [...(DEFAULT_SIGNER_SETTINGS.inspectors || [])];

    const addIfMissing = (name?: string, position?: string, prefix = 'extra') => {
      if (!name || !name.trim()) return;
      const trimmed = name.trim();
      if (!baseList.some((x) => x.name.trim() === trimmed)) {
        baseList.push({
          id: `${prefix}-${trimmed}`,
          name: trimmed,
          position: (position || '').split('\n')[0].trim() || 'เจ้าหน้าที่สาธารณสุข',
        });
      }
    };

    addIfMissing(s.directorName, s.directorPos, 'dir');
    addIfMissing(s.clerkName, s.clerkPos, 'clerk');
    addIfMissing(s.mayorName, s.mayorPos, 'mayor');

    return baseList;
  }, [signerSettings]);

  const availablePositions = useMemo<string[]>(() => {
    const posSet = new Set<string>();
    availableSigners.forEach((item) => {
      if (item.position && item.position.trim()) {
        posSet.add(item.position.trim());
      }
    });
    [
      'เจ้าพนักงานสาธารณสุขชำนาญงาน',
      'เจ้าพนักงานสาธารณสุขปฏิบัติงาน',
      'เจ้าพนักงานสาธารณสุข',
      'นักวิชาการสุขาภิบาลปฏิบัติการ',
      'นักวิชาการสุขาภิบาลชำนาญการ',
      'ผู้อำนวยการกองสาธารณสุขและสิ่งแวดล้อม',
      'ปลัดเทศบาลตำบลบางเป้า',
    ].forEach((p) => posSet.add(p));
    return Array.from(posSet);
  }, [availableSigners]);

  // Form State — All blank by default except ตำบล=บางเป้า, อำเภอ=กันตัง, ช่วงเวลาเริ่มงาน=08:00, ช่วงเวลาเลิกงาน=17:00
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [addressNo, setAddressNo] = useState('');
  const [moo, setMoo] = useState('');
  const [road, setRoad] = useState('');
  const [subdistrict, setSubdistrict] = useState('บางเป้า');
  const [district, setDistrict] = useState('กันตัง');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [savedLicModal, setSavedLicModal] = useState<LicenseRecord | null>(null);
  const [province, setProvince] = useState('ตรัง');
  const [buildingType, setBuildingType] = useState('');
  const [buildingDetails, setBuildingDetails] = useState('');
  const [machineCount, setMachineCount] = useState<string>('');
  const [horsepower, setHorsepower] = useState<string>('');
  const [workingDaysPerWeek, setWorkingDaysPerWeek] = useState<string>('');
  const [maleWorkers, setMaleWorkers] = useState<string>('');
  const [femaleWorkers, setFemaleWorkers] = useState<string>('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [hadComplaints, setHadComplaints] = useState<boolean | null>(null);
  const [complaintCount, setComplaintCount] = useState<string>('');
  const [complaintIssues, setComplaintIssues] = useState<string[]>([]);
  const [animalType, setAnimalType] = useState('');
  const [animalCount, setAnimalCount] = useState<string>('');

  // Section 2: Raw Materials (blank by default)
  const [rawMaterials, setRawMaterials] = useState<RawMaterialItem[]>([]);

  // Section 3: Criteria Answers (25 items — all unselected/blank by default)
  const [criteriaAnswers, setCriteriaAnswers] = useState<
    Record<string, { answer: 'yes' | 'no' | 'na' | ''; findings: string; recommendations: string }>
  >(() => {
    const initial: Record<string, { answer: 'yes' | 'no' | 'na' | ''; findings: string; recommendations: string }> = {};
    OFFICIAL_25_CRITERIA.forEach((crit) => {
      initial[crit.id] = {
        answer: '',
        findings: '',
        recommendations: '',
      };
    });
    return initial;
  });

  // Footer fields (blank by default)
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [overallResult, setOverallResult] = useState<'passed' | 'failed' | 'needs_improvement' | ''>('');
  const [inspectorName, setInspectorName] = useState('');
  const [inspectorPosition, setInspectorPosition] = useState('');

  // Pre-fill form ONLY when editing an existing license or business
  useEffect(() => {
    if (initialLicense) {
      setBusinessName(initialLicense.businessName || '');
      setOwnerName(initialLicense.ownerName || '');
      setOwnerPhone(initialLicense.ownerPhone || initialLicense.businessPhone || '');
      setBusinessPhone(initialLicense.businessPhone || initialLicense.ownerPhone || '');
      setAddressNo(initialLicense.businessAddressNo || initialLicense.ownerAddressNo || '');
      setMoo(initialLicense.businessMoo || initialLicense.ownerMoo || '');
      setRoad(initialLicense.businessRoad || initialLicense.ownerRoad || '');
      setSubdistrict(initialLicense.businessSubdistrict || 'บางเป้า');
      setDistrict(initialLicense.businessDistrict || 'กันตัง');
      setProvince(initialLicense.businessProvince || 'ตรัง');
      if (initialLicense.businessCategory) {
        setSelectedCategories([initialLicense.businessCategory]);
      }

      if (initialLicense.inspectionData) {
        const d = initialLicense.inspectionData;
        if (d.selectedCategories && d.selectedCategories.length > 0) setSelectedCategories(d.selectedCategories);
        if (d.buildingType) setBuildingType(d.buildingType);
        if (d.buildingDetails) setBuildingDetails(d.buildingDetails);
        if (d.machineCount !== undefined) setMachineCount(String(d.machineCount));
        if (d.horsepower !== undefined) setHorsepower(String(d.horsepower));
        if (d.workingDaysPerWeek !== undefined) setWorkingDaysPerWeek(String(d.workingDaysPerWeek));
        if (d.maleWorkers !== undefined) setMaleWorkers(String(d.maleWorkers));
        if (d.femaleWorkers !== undefined) setFemaleWorkers(String(d.femaleWorkers));
        if (d.startTime) setStartTime(d.startTime);
        if (d.endTime) setEndTime(d.endTime);
        if (d.hadComplaints !== undefined) setHadComplaints(d.hadComplaints);
        if (d.complaintCount !== undefined) setComplaintCount(String(d.complaintCount));
        if (d.complaintIssues) setComplaintIssues(d.complaintIssues);
        if (d.animalType) setAnimalType(d.animalType);
        if (d.animalCount !== undefined) setAnimalCount(String(d.animalCount));
        if (d.rawMaterials && d.rawMaterials.length > 0) setRawMaterials(d.rawMaterials);
        if (d.criteriaAnswers) setCriteriaAnswers(d.criteriaAnswers as any);
        if (d.additionalNotes) setAdditionalNotes(d.additionalNotes);
        if (d.overallResult) setOverallResult(d.overallResult);
        if (d.inspectorName) setInspectorName(d.inspectorName);
        if (d.inspectorPosition) setInspectorPosition(d.inspectorPosition);
      }
    }
  }, [initialLicense]);

  // Auto-fill from existing licenses dropdown ONLY on exact match
  const handleSelectExistingBusiness = (name: string) => {
    setBusinessName(name);
    const trimmed = name.trim();
    if (!trimmed) return;
    const found = existingLicenses.find((l) => l.businessName.trim() === trimmed);
    if (found) {
      setOwnerName(found.ownerName);
      setOwnerPhone(found.ownerPhone || found.businessPhone);
      setBusinessPhone(found.businessPhone || found.ownerPhone);
      setAddressNo(found.businessAddressNo || found.ownerAddressNo || '');
      setMoo(found.businessMoo || found.ownerMoo || '');
      setSubdistrict(found.businessSubdistrict || 'บางเป้า');
      setDistrict(found.businessDistrict || 'กันตัง');
      setProvince(found.businessProvince || 'ตรัง');
      if (found.businessCategory) {
        setSelectedCategories([found.businessCategory]);
      }
    }
  };

  // Toggle category
  const toggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  // Add/Remove Raw Material
  const handleAddRawMaterial = () => {
    setRawMaterials([
      ...rawMaterials,
      { id: Date.now().toString(), name: '', monthlyQuantity: '' },
    ]);
  };

  const handleRemoveRawMaterial = (id: string) => {
    setRawMaterials(rawMaterials.filter((m) => m.id !== id));
  };

  const handleUpdateRawMaterial = (id: string, field: 'name' | 'monthlyQuantity', val: string) => {
    setRawMaterials(
      rawMaterials.map((m) => (m.id === id ? { ...m, [field]: val } : m))
    );
  };

  // Update Criteria Answer
  const handleCriteriaChange = (
    critId: string,
    field: 'answer' | 'findings' | 'recommendations',
    val: string
  ) => {
    setCriteriaAnswers((prev) => ({
      ...prev,
      [critId]: {
        ...prev[critId],
        [field]: val,
      },
    }));
  };

  // Quick set all "Yes"
  const handleSetAllYes = () => {
    const updated = { ...criteriaAnswers };
    OFFICIAL_25_CRITERIA.forEach((crit) => {
      if (!crit.isSubItemHeader) {
        updated[crit.id] = {
          ...updated[crit.id],
          answer: 'yes',
        };
      }
    });
    setCriteriaAnswers(updated);
  };

  const totalWorkersDisplay =
    maleWorkers === '' && femaleWorkers === ''
      ? ''
      : String((parseInt(maleWorkers, 10) || 0) + (parseInt(femaleWorkers, 10) || 0));

  // Form Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      setValidationError('กรุณาระบุชื่อสถานประกอบกิจการก่อนทำการบันทึกข้อมูล');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setValidationError(null);

    const effectiveResult: 'passed' | 'failed' | 'needs_improvement' =
      overallResult || 'passed';

    const formState: OfficialInspectionFormState = {
      selectedCategories,
      businessName,
      ownerName,
      ownerPhone,
      businessPhone,
      addressNo,
      moo,
      road,
      subdistrict,
      district,
      province,
      buildingType,
      buildingDetails,
      machineCount: parseInt(machineCount, 10) || 0,
      horsepower: parseInt(horsepower, 10) || 0,
      workingDaysPerWeek: parseInt(workingDaysPerWeek, 10) || 0,
      maleWorkers: parseInt(maleWorkers, 10) || 0,
      femaleWorkers: parseInt(femaleWorkers, 10) || 0,
      startTime,
      endTime,
      animalType,
      animalCount: parseInt(animalCount, 10) || 0,
      hadComplaints: Boolean(hadComplaints),
      complaintCount: parseInt(complaintCount, 10) || 0,
      complaintIssues,
      rawMaterials,
      criteriaAnswers,
      additionalNotes,
      overallResult: effectiveResult,
      inspectorName,
      inspectorPosition,
    };

    // Auto-create or update license
    const targetLic =
      initialLicense ||
      existingLicenses.find(
        (l) => l.businessName.trim().toLowerCase() === businessName.trim().toLowerCase()
      );

    const isNewlyIssued = !targetLic || targetLic.licenseNumber === 'รอออกเลข' || !targetLic.licenseNumber;

    const updatedLic: LicenseRecord = {
      ...(targetLic || {}),
      id: targetLic?.id || `LIC-${Date.now().toString().slice(-4)}`,
      businessName,
      roundYear: targetLic?.roundYear || 'รอบปี 2569',
      createdAtFormatted:
        targetLic?.createdAtFormatted ||
        new Date().toLocaleDateString('th-TH') +
          ' ' +
          new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      licenseNumber: targetLic?.licenseNumber && targetLic.licenseNumber !== 'รอออกเลข'
        ? targetLic.licenseNumber
        : 'รอออกเลข',
      licenseYear: targetLic?.licenseYear || '2569',
      approvalDate: targetLic?.approvalDate || new Date().toISOString().slice(0, 10),
      expireDate:
        targetLic?.expireDate ||
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      status: isNewlyIssued ? 'pending' : (effectiveResult === 'passed' ? (targetLic?.status || 'normal') : 'pending'),
      remainingDays: targetLic?.remainingDays ?? 365,
      ownerName: ownerName || 'ผู้ประกอบการ',
      nationality: targetLic?.nationality || 'ไทย',
      ownerAddressNo: addressNo,
      ownerMoo: moo,
      ownerTrokSoi: targetLic?.ownerTrokSoi || '',
      ownerRoad: road,
      ownerSubdistrict: subdistrict,
      ownerDistrict: district,
      ownerProvince: province,
      ownerPhone: ownerPhone || businessPhone,
      businessCategory: selectedCategories[0] || 'กิจการอันตรายต่อสุขภาพ',
      useSameAddress: true,
      businessAddressNo: addressNo,
      businessMoo: moo,
      businessSubdistrict: subdistrict,
      businessDistrict: district,
      businessProvince: province,
      businessPhone: businessPhone || ownerPhone,
      inspectionData: formState,
    };

    onSave(formState, updatedLic);
    setSavedLicModal(updatedLic);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-4 sm:p-8 space-y-6 animate-in fade-in duration-200">
      {/* Banner if editing existing shop */}
      {initialLicense && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-950 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
              ✏️
            </span>
            <div>
              <div className="text-xs sm:text-sm font-bold flex items-center gap-1.5 flex-wrap">
                <span>กำลังดึงข้อมูลเดิมมาแก้ไข:</span>
                <span className="text-emerald-800 underline font-black text-sm sm:text-base">
                  {initialLicense.businessName}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900">
                  {initialLicense.roundYear || 'รอบปี 2569'} • ทะเบียน {initialLicense.licenseNumber}
                </span>
              </div>
              <p className="text-[11px] text-amber-800 mt-0.5">
                เจ้าหน้าที่สามารถแก้ไขผลตรวจประเมิน 25 ข้อ, ข้อมูลสถานประกอบการ, และวัตถุดิบ แล้วกดบันทึกผลการตรวจได้ทันที
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onGoToDashboard}
            className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-amber-200 transition-colors cursor-pointer shrink-0 shadow-2xs"
          >
            ✕ ยกเลิกการแก้ไข (กลับไปแดชบอร์ด)
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8 text-sm sm:text-[15px]">
        {/* ===================== ส่วนที่ 1: ข้อมูลทั่วไป ===================== */}
        <div className="space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-7 bg-emerald-600 rounded-full inline-block" />
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                ส่วนที่ 1: ข้อมูลทั่วไปของสถานประกอบกิจการ
              </h2>
            </div>
            <span className="px-3 py-1 rounded-full text-xs sm:text-sm font-semibold bg-slate-100 text-slate-600">
              ขั้นตอนที่ 1 จาก 3
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* ประเภทกิจการ List (Multi-Select box) */}
            <div className="space-y-2">
              <label className="block text-sm sm:text-[15px] font-bold text-slate-800">
                ประเภทกิจการ <span className="text-rose-500">*</span>
              </label>
              <div className="h-52 overflow-y-auto p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-sm text-slate-700">
                {OFFICIAL_BUSINESS_CATEGORIES.map((cat) => {
                  const checked = selectedCategories.includes(cat);
                  return (
                    <label
                      key={cat}
                      className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors leading-snug ${
                        checked ? 'bg-emerald-50 text-emerald-950 font-semibold' : 'hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCategory(cat)}
                        className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 shrink-0"
                      />
                      <span>{cat}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* ชื่อสถานประกอบการ */}
            <div className="space-y-2">
              <label className="block text-sm sm:text-[15px] font-bold text-slate-800">
                ชื่อสถานประกอบกิจการ <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                list="existing-businesses"
                placeholder="พิมพ์ชื่อร้าน หรือเลือกจากรายการ"
                value={businessName}
                onChange={(e) => handleSelectExistingBusiness(e.target.value)}
                className="w-full text-sm sm:text-[15px] py-2.5 px-3.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-900"
                required
              />
              <datalist id="existing-businesses">
                {existingLicenses.map((lic) => (
                  <option key={lic.id} value={lic.businessName} />
                ))}
              </datalist>
              <span className="text-xs text-slate-400 block">อัปเดตล่าสุด: -</span>
            </div>

            {/* ชื่อผู้ดำเนินกิจการ */}
            <div className="space-y-2">
              <label className="block text-sm sm:text-[15px] font-bold text-slate-800">ชื่อผู้ดำเนินกิจการ</label>
              <input
                type="text"
                placeholder="ชื่อ-นามสกุล"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full text-sm sm:text-[15px] py-2.5 px-3.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* เบอร์โทร */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                เบอร์โทรศัพท์ผู้ดำเนินกิจการ
              </label>
              <input
                type="tel"
                placeholder="ระบุเบอร์โทรศัพท์"
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                className="w-full text-sm sm:text-[15px] py-2.5 px-3.5 rounded-xl border border-slate-300"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                เบอร์โทรศัพท์สถานประกอบกิจการ
              </label>
              <input
                type="tel"
                placeholder="ระบุเบอร์โทรศัพท์ร้าน"
                value={businessPhone}
                onChange={(e) => setBusinessPhone(e.target.value)}
                className="w-full text-sm sm:text-[15px] py-2.5 px-3.5 rounded-xl border border-slate-300"
              />
            </div>
          </div>

          {/* ที่อยู่ */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3.5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">ตั้งอยู่เลขที่</label>
              <input
                type="text"
                placeholder="ระบุบ้านเลขที่"
                value={addressNo}
                onChange={(e) => setAddressNo(e.target.value)}
                className="w-full text-sm sm:text-[15px] py-2.5 px-3.5 rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">หมู่ที่</label>
              <input
                type="text"
                placeholder="ระบุหมู่ที่"
                value={moo}
                onChange={(e) => setMoo(e.target.value)}
                className="w-full text-sm sm:text-[15px] py-2.5 px-3.5 rounded-xl border border-slate-300"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">ถนน</label>
              <input
                type="text"
                placeholder="ระบุชื่อถนน (ถ้ามี)"
                value={road}
                onChange={(e) => setRoad(e.target.value)}
                className="w-full text-sm sm:text-[15px] py-2.5 px-3.5 rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">ตำบล</label>
              <input
                type="text"
                value={subdistrict}
                onChange={(e) => setSubdistrict(e.target.value)}
                className="w-full text-sm sm:text-[15px] py-2.5 px-3.5 rounded-xl border border-slate-300 font-semibold text-slate-800"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">อำเภอ</label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full text-sm sm:text-[15px] py-2.5 px-3.5 rounded-xl border border-slate-300 font-semibold text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">ลักษณะอาคาร</label>
              <select
                value={buildingType}
                onChange={(e) => setBuildingType(e.target.value)}
                className="w-full text-sm sm:text-[15px] py-2.5 px-3.5 rounded-xl border border-slate-300 bg-white"
              >
                <option value="">-- เลือกลักษณะอาคาร --</option>
                <option value="อาคารโรงงาน/อาคารเอกเทศ">อาคารโรงงาน/อาคารเอกเทศ</option>
                <option value="อาคารพาณิชย์/ตึกแถว">อาคารพาณิชย์/ตึกแถว</option>
                <option value="โรงเรือนเปิดโครงเหล็ก">โรงเรือนเปิดโครงเหล็ก</option>
                <option value="บ้านพักอาศัยดัดแปลง">บ้านพักอาศัยดัดแปลง</option>
                <option value="โกดัง/คลังสินค้า">โกดัง/คลังสินค้า</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                จำนวนชั้น / โรงเรือน / โกดังรายละเอียดเพิ่มเติม
              </label>
              <input
                type="text"
                placeholder="ระบุรายละเอียดอาคาร เช่น อาคารคอนกรีต 1 ชั้น"
                value={buildingDetails}
                onChange={(e) => setBuildingDetails(e.target.value)}
                className="w-full text-sm sm:text-[15px] py-2.5 px-3.5 rounded-xl border border-slate-300"
              />
            </div>
          </div>

          {/* เครื่องจักรและกำลังแรงม้า */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                จำนวนเครื่องจักร (ตัว)
              </label>
              <input
                type="number"
                placeholder="ระบุจำนวน"
                value={machineCount}
                onChange={(e) => setMachineCount(e.target.value)}
                className="w-full text-sm sm:text-[15px] py-2.5 px-3.5 rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                รวมกำลังแรงม้า (HP)
              </label>
              <input
                type="number"
                placeholder="ระบุแรงม้า"
                value={horsepower}
                onChange={(e) => setHorsepower(e.target.value)}
                className="w-full text-sm sm:text-[15px] py-2.5 px-3.5 rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                จำนวนวันทำงาน (วัน/สัปดาห์)
              </label>
              <input
                type="number"
                placeholder="ระบุจำนวนวัน"
                value={workingDaysPerWeek}
                onChange={(e) => setWorkingDaysPerWeek(e.target.value)}
                className="w-full text-sm sm:text-[15px] py-2.5 px-3.5 rounded-xl border border-slate-300"
              />
            </div>
          </div>

          {/* คนงาน & เวลาทำงาน */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">คนงานชาย (คน)</label>
              <input
                type="number"
                placeholder="ระบุจำนวน"
                value={maleWorkers}
                onChange={(e) => setMaleWorkers(e.target.value)}
                className="w-full text-sm sm:text-[15px] py-2.5 px-3.5 rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">คนงานหญิง (คน)</label>
              <input
                type="number"
                placeholder="ระบุจำนวน"
                value={femaleWorkers}
                onChange={(e) => setFemaleWorkers(e.target.value)}
                className="w-full text-sm sm:text-[15px] py-2.5 px-3.5 rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">รวมบุคลากรทั้งสิ้น (คน)</label>
              <input
                type="text"
                readOnly
                placeholder="-"
                value={totalWorkersDisplay}
                className="w-full text-sm sm:text-[15px] py-2.5 px-3.5 rounded-xl border border-slate-200 bg-slate-100 font-bold text-slate-800"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">ช่วงเวลาเริ่มงาน</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full text-sm sm:text-[15px] py-2.5 px-3.5 rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">ช่วงเวลาเลิกงาน</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full text-sm sm:text-[15px] py-2.5 px-3.5 rounded-xl border border-slate-300"
              />
            </div>
          </div>

          {/* กรณีประกอบกิจการเลี้ยงสัตว์ */}
          {selectedCategories.some((cat) => cat.includes('เลี้ยงสัตว์') || cat.includes('สัตว์และผลิตภัณฑ์')) && (
            <div className="p-4 bg-amber-50/80 rounded-xl border border-amber-200 space-y-2.5">
              <span className="text-sm font-bold text-amber-900 block">
                🐾 3. กรณีประกอบกิจการเลี้ยงสัตว์ (ระบุชนิดสัตว์และจำนวน)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">ชนิดสัตว์ที่เลี้ยง</label>
                  <input
                    type="text"
                    value={animalType}
                    onChange={(e) => setAnimalType(e.target.value)}
                    placeholder="เช่น สุกร, ไก่เนื้อ, โค, สัตว์ปีก"
                    className="w-full text-sm sm:text-[15px] py-2.5 px-3.5 rounded-xl border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">จำนวนสัตว์ (ตัว)</label>
                  <input
                    type="number"
                    placeholder="ระบุจำนวนสัตว์"
                    value={animalCount}
                    onChange={(e) => setAnimalCount(e.target.value)}
                    min={0}
                    className="w-full text-sm sm:text-[15px] py-2.5 px-3.5 rounded-xl border border-slate-300 bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* เคยถูกร้องเรียนหรือไม่ */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="text-sm sm:text-[15px] font-bold text-slate-800 flex items-center gap-1.5">
              <span>📢 8. ในรอบปีที่ผ่านมาแหล่งประกอบกิจการเคยถูกร้องเรียนก่อปัญหาเหตุรำคาญหรือมลพิษหรือไม่</span>
            </div>
            <div className="flex items-center gap-4 text-sm font-semibold">
              <label className="flex items-center gap-2 cursor-pointer py-2 px-3.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900">
                <input
                  type="radio"
                  name="complaint"
                  checked={hadComplaints === false}
                  onChange={() => setHadComplaints(false)}
                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                />
                <span>🟢 ไม่เคยถูกร้องเรียน</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer py-2 px-3.5 rounded-xl border border-rose-300 bg-rose-50 text-rose-900">
                <input
                  type="radio"
                  name="complaint"
                  checked={hadComplaints === true}
                  onChange={() => setHadComplaints(true)}
                  className="w-4 h-4 text-rose-600 focus:ring-rose-500"
                />
                <span>🔴 เคยถูกร้องเรียน</span>
              </label>
            </div>

            {hadComplaints === true && (
              <div className="mt-3 p-4 bg-rose-50 rounded-xl border border-rose-200 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">จำนวนครั้งที่เคยถูกร้องเรียน:</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={complaintCount}
                    onChange={(e) => setComplaintCount(e.target.value)}
                    min={1}
                    className="w-24 text-center text-sm py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white font-bold"
                  />
                  <span className="text-sm text-slate-600">ครั้ง</span>
                </div>
                <div>
                  <span className="text-sm font-semibold text-slate-700 block mb-2">
                    ประเด็นที่ถูกร้องเรียน (เลือกได้หลายข้อตามแบบฟอร์มราชการ):
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-sm">
                    {[
                      'เสียงดัง',
                      'ฝุ่นละออง/เขม่า/เถ้า/ควัน',
                      'กลิ่น',
                      'สารเคมี',
                      'น้ำเสีย',
                      'มูลฝอย/ของเสียอันตราย',
                      'สัตว์หรือแมลงพาหะนำโรค',
                      'อื่นๆ',
                    ].map((issue) => (
                      <label key={issue} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={complaintIssues.includes(issue)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setComplaintIssues([...complaintIssues, issue]);
                            } else {
                              setComplaintIssues(complaintIssues.filter((i) => i !== issue));
                            }
                          }}
                          className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                        />
                        <span className="text-slate-700">{issue}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ===================== ส่วนที่ 2: วัตถุดิบและสารเคมี ===================== */}
        <div className="space-y-4 pt-5 border-t border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-7 bg-amber-600 rounded-full inline-block" />
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                ส่วนที่ 2: วัตถุดิบ และสารเคมีที่ใช้ในกระบวนการผลิต (ไม่บังคับกรอก)
              </h2>
            </div>
            <button
              type="button"
              onClick={handleAddRawMaterial}
              className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ เพิ่มรายการ</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 w-16 text-center">ลำดับ</th>
                  <th className="py-3 px-4">รายการชื่อวัตถุดิบ / สารเคมี</th>
                  <th className="py-3 px-4 w-56">ปริมาณสารที่ใช้จริงต่อเดือน</th>
                  <th className="py-3 px-3 w-20 text-center">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rawMaterials.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-5 text-center text-slate-400 text-sm">
                      ไม่มีรายการวัตถุดิบ (คลิก &quot;+ เพิ่มรายการ&quot; ด้านบนเพื่อเพิ่มข้อมูล)
                    </td>
                  </tr>
                ) : (
                  rawMaterials.map((mat, idx) => (
                    <tr key={mat.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-center text-slate-600 font-bold">{idx + 1}</td>
                      <td className="py-2.5 px-4">
                        <input
                          type="text"
                          placeholder="เช่น น้ำมันเครื่อง, สีทินเนอร์, แป้งมัน"
                          value={mat.name}
                          onChange={(e) => handleUpdateRawMaterial(mat.id, 'name', e.target.value)}
                          className="w-full py-2 px-3 rounded-lg border border-slate-300 text-sm"
                        />
                      </td>
                      <td className="py-2.5 px-4">
                        <input
                          type="text"
                          placeholder="เช่น 50 ลิตร / เดือน"
                          value={mat.monthlyQuantity}
                          onChange={(e) => handleUpdateRawMaterial(mat.id, 'monthlyQuantity', e.target.value)}
                          className="w-full py-2 px-3 rounded-lg border border-slate-300 text-sm"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRawMaterial(mat.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ===================== ส่วนที่ 3: เกณฑ์สาระสำคัญ 25 ข้อ ===================== */}
        <div className="space-y-4 pt-5 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-7 bg-emerald-700 rounded-full inline-block" />
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                ส่วนที่ 3: เกณฑ์สาระสำคัญการตรวจประเมินสุขลักษณะโครงสร้าง
              </h2>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs sm:text-sm text-amber-800 font-medium bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                ⚠️ ระบบจะตรวจสอบความครบถ้วน ห้ามเว้นว่างข้อคำถามก่อนบันทึก
              </span>
              <button
                type="button"
                onClick={handleSetAllYes}
                className="px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
              >
                เลือก &quot;ใช่&quot; ทั้งหมด
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-800 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-3 w-20 text-center">เลขข้อ</th>
                  <th className="py-3.5 px-4 min-w-[300px]">รายการเกณฑ์การตรวจสอบข้อกำหนดแผนผัง</th>
                  <th className="py-3.5 px-4 w-52 text-center">ผลการตรวจประเมินหน้างาน</th>
                  <th className="py-3.5 px-3 w-48">บันทึกข้อเท็จจริงที่พบ</th>
                  <th className="py-3.5 px-3 w-48">ข้อเสนอแนะเพื่อปรับปรุง</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {OFFICIAL_25_CRITERIA.map((crit) => {
                  const state = criteriaAnswers[crit.id] || {
                    answer: '',
                    findings: '',
                    recommendations: '',
                  };

                  if (crit.isSubItemHeader) {
                    return (
                      <tr key={crit.id} className="bg-slate-50/90 font-bold">
                        <td className="py-3.5 px-3 text-center text-slate-900 text-sm sm:text-[15px]">{crit.itemNumber}</td>
                        <td className="py-3.5 px-4 text-slate-900 text-sm sm:text-[15px] leading-relaxed">{crit.title}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2.5 py-1 rounded-md text-xs bg-slate-200 text-slate-700 font-semibold">
                            กรุณาประเมินในข้อย่อย
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <input
                            type="text"
                            placeholder="พบอะไรหน้างาน"
                            value={state.findings}
                            onChange={(e) => handleCriteriaChange(crit.id, 'findings', e.target.value)}
                            className="w-full py-2 px-2.5 rounded-lg border border-slate-300 text-sm"
                          />
                        </td>
                        <td className="py-3.5 px-3">
                          <input
                            type="text"
                            placeholder="สั่งปรับปรุงอะไร"
                            value={state.recommendations}
                            onChange={(e) => handleCriteriaChange(crit.id, 'recommendations', e.target.value)}
                            className="w-full py-2 px-2.5 rounded-lg border border-slate-300 text-sm"
                          />
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={crit.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-3 text-center font-bold text-slate-800 text-sm sm:text-[15px]">
                        {crit.itemNumber}
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 text-sm sm:text-[15px] leading-relaxed">
                        {crit.title}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          {/* ใช่ */}
                          <button
                            type="button"
                            onClick={() => handleCriteriaChange(crit.id, 'answer', 'yes')}
                            className={`px-3 py-1.5 rounded-full border cursor-pointer text-xs sm:text-sm font-semibold transition-all ${
                              state.answer === 'yes'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-400 shadow-xs'
                                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <span>{state.answer === 'yes' ? '●' : '◯'} ใช่</span>
                          </button>

                          {/* ไม่ใช่ */}
                          <button
                            type="button"
                            onClick={() => handleCriteriaChange(crit.id, 'answer', 'no')}
                            className={`px-3 py-1.5 rounded-full border cursor-pointer text-xs sm:text-sm font-semibold transition-all ${
                              state.answer === 'no'
                                ? 'bg-rose-100 text-rose-800 border-rose-400 shadow-xs'
                                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <span>{state.answer === 'no' ? '●' : '◯'} ไม่ใช่</span>
                          </button>

                          {/* N/A */}
                          <button
                            type="button"
                            onClick={() => handleCriteriaChange(crit.id, 'answer', 'na')}
                            className={`px-2.5 py-1.5 rounded-full border cursor-pointer text-xs sm:text-sm font-medium transition-all ${
                              state.answer === 'na'
                                ? 'bg-slate-200 text-slate-800 border-slate-400'
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <span>{state.answer === 'na' ? '●' : '◯'} N/A</span>
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <input
                          type="text"
                          placeholder="พบอะไรหน้างาน"
                          value={state.findings}
                          onChange={(e) => handleCriteriaChange(crit.id, 'findings', e.target.value)}
                          className="w-full py-2 px-2.5 rounded-lg border border-slate-300 text-sm"
                        />
                      </td>
                      <td className="py-3.5 px-3">
                        <input
                          type="text"
                          placeholder="สั่งปรับปรุงอะไร"
                          value={state.recommendations}
                          onChange={(e) => handleCriteriaChange(crit.id, 'recommendations', e.target.value)}
                          className="w-full py-2 px-2.5 rounded-lg border border-slate-300 text-sm"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ===================== ท้ายฟอร์ม: ข้อเสนอแนะ & ลงชื่อ ===================== */}
        <div className="space-y-4 pt-5 border-t border-slate-200">
          <div>
            <label className="block text-sm sm:text-[15px] font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
              <span>📝 ข้อเสนอแนะเพิ่มเติม / สรุปผลการตรวจประเมินหน้างาน</span>
            </label>
            <textarea
              rows={3}
              placeholder="ระบุความคิดเห็นของเจ้าหน้าที่ หรือข้อเสนอแนะเพิ่มเติมเพื่อนำไปประมวลผลแทนที่ตัวแปรในใบสรุปผล..."
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              className="w-full text-sm sm:text-[15px] p-3.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">
                สรุปความเห็นผลการประเมิน
              </label>
              <select
                value={overallResult}
                onChange={(e) =>
                  setOverallResult(e.target.value as 'passed' | 'failed' | 'needs_improvement' | '')
                }
                className="w-full text-sm sm:text-[15px] py-2.5 px-3.5 rounded-xl border border-slate-300 bg-white font-semibold"
              >
                <option value="">-- เลือกสรุปความเห็นผลการประเมิน --</option>
                <option value="passed">🟢 ผ่านเกณฑ์การประเมินโครงสร้างพื้นฐาน</option>
                <option value="needs_improvement">🟡 ต้องปรับปรุงแก้ไขตามข้อสั่งการ</option>
                <option value="failed">🔴 ไม่ผ่านเกณฑ์มาตรฐาน</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className="block text-sm font-bold text-slate-700">
                  ลงชื่อเจ้าหน้าที่ผู้ตรวจประเมิน
                </label>
                {onOpenSignerSettings && (
                  <button
                    type="button"
                    onClick={onOpenSignerSettings}
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
                    title="เพิ่มหรือแก้ไขรายชื่อผู้ลงนามในเมนูตั้งค่าผู้ลงนาม"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>+ เพิ่มรายชื่อ (ตั้งค่าผู้ลงนาม)</span>
                  </button>
                )}
              </div>
              <select
                value={inspectorName}
                onChange={(e) => {
                  const selectedName = e.target.value;
                  setInspectorName(selectedName);
                  const matched = availableSigners.find((s) => s.name === selectedName);
                  if (matched && matched.position) {
                    setInspectorPosition(matched.position);
                  } else if (!selectedName) {
                    setInspectorPosition('');
                  }
                }}
                className="w-full text-sm sm:text-[15px] py-2.5 px-3.5 rounded-xl border border-slate-300 font-semibold text-slate-800 bg-white"
                required
              >
                <option value="">-- เลือกชื่อเจ้าหน้าที่ผู้ตรวจประเมิน --</option>
                {availableSigners.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name} ({s.position})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">
                ตำแหน่งเจ้าหน้าที่
              </label>
              <select
                value={inspectorPosition}
                onChange={(e) => setInspectorPosition(e.target.value)}
                className="w-full text-sm sm:text-[15px] py-2.5 px-3.5 rounded-xl border border-slate-300 font-medium text-slate-800 bg-white"
                required
              >
                <option value="">-- เลือกตำแหน่งเจ้าหน้าที่ --</option>
                {availablePositions.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Validation Alert */}
          {validationError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center gap-3 animate-in fade-in">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <div className="text-sm font-semibold">{validationError}</div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end pt-3">
            <button
              type="submit"
              className="flex items-center gap-2 px-8 py-3.5 text-sm sm:text-base font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all active:scale-98 cursor-pointer"
            >
              <Save className="w-5 h-5" />
              <span>💾 บันทึกและอัปโหลดขึ้นระบบคลาวด์</span>
            </button>
          </div>
        </div>
      </form>

      {/* Post-Save Modal Flow: Inspection -> Print Executive Report -> Await License Issue */}
      {savedLicModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-5 text-center">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-xs shadow-inner">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold">บันทึกผลการตรวจประเมินสำเร็จ</h3>
              <p className="text-xs text-emerald-100 mt-1">
                ข้อมูลสถานประกอบการและผลการตรวจ 25 ข้อ บันทึกขึ้น Cloud Firestore เรียบร้อยแล้ว
              </p>
            </div>

            {/* Info Summary */}
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">สถานประกอบการ:</span>
                  <span className="font-bold text-slate-800">{savedLicModal.businessName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ผู้ประกอบการ:</span>
                  <span className="font-semibold text-slate-700">{savedLicModal.ownerName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">สถานะเลขที่ใบอนุญาต:</span>
                  <span className="font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                    {savedLicModal.licenseNumber === 'รอออกเลข' ? 'รอเสนออนุมัติออกเลขใบอนุญาต' : savedLicModal.licenseNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">เจ้าหน้าที่ผู้ตรวจ:</span>
                  <span className="font-semibold text-slate-700">{savedLicModal.inspectionData?.inspectorName || '-'}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                {onPrintReportImmediately && (
                  <button
                    onClick={() => {
                      const lic = savedLicModal;
                      setSavedLicModal(null);
                      onPrintReportImmediately(lic);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>📄 ปริ้นแบบฟอร์มเสนอผู้บริหาร (ReportTemplate 25 ข้อ)</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setSavedLicModal(null);
                    onGoToDashboard();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold rounded-xl text-xs sm:text-sm transition-all cursor-pointer"
                >
                  <Building className="w-4 h-4" />
                  <span>📊 ไปยังแดชบอร์ดติดตามผลอนุมัติและออกเลข</span>
                </button>

                <button
                  onClick={() => {
                    setSavedLicModal(null);
                    setSelectedCategories([]);
                    setBusinessName('');
                    setOwnerName('');
                    setOwnerPhone('');
                    setBusinessPhone('');
                    setAddressNo('');
                    setMoo('');
                    setRoad('');
                    setSubdistrict('บางเป้า');
                    setDistrict('กันตัง');
                    setBuildingType('');
                    setBuildingDetails('');
                    setMachineCount('');
                    setHorsepower('');
                    setWorkingDaysPerWeek('');
                    setMaleWorkers('');
                    setFemaleWorkers('');
                    setStartTime('08:00');
                    setEndTime('17:00');
                    setHadComplaints(null);
                    setComplaintCount('');
                    setComplaintIssues([]);
                    setAnimalType('');
                    setAnimalCount('');
                    setRawMaterials([]);
                    const blankCriteria: Record<string, { answer: 'yes' | 'no' | 'na' | ''; findings: string; recommendations: string }> = {};
                    OFFICIAL_25_CRITERIA.forEach((crit) => {
                      blankCriteria[crit.id] = { answer: '', findings: '', recommendations: '' };
                    });
                    setCriteriaAnswers(blankCriteria);
                    setAdditionalNotes('');
                    setOverallResult('');
                    setInspectorName('');
                    setInspectorPosition('');
                    setValidationError(null);
                  }}
                  className="w-full py-2 text-center text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  ➕ ตรวจประเมินรายอื่นต่อไป
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
