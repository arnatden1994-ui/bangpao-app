import React, { useState, useEffect } from 'react';
import {
  Save,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  Building,
  Clock,
  User,
  Phone,
  Check,
} from 'lucide-react';
import { OfficialInspectionFormState, RawMaterialItem, LicenseRecord } from '../types/index.ts';
import { OFFICIAL_25_CRITERIA, OFFICIAL_BUSINESS_CATEGORIES } from '../data/officialCriteria.ts';

interface OfficialInspectionFormProps {
  existingLicenses: LicenseRecord[];
  initialLicense?: LicenseRecord | null;
  onSave: (data: OfficialInspectionFormState, newLicense?: LicenseRecord) => void;
  onGoToDashboard: () => void;
}

export const OfficialInspectionForm: React.FC<OfficialInspectionFormProps> = ({
  existingLicenses,
  initialLicense,
  onSave,
  onGoToDashboard,
}) => {
  // Form State
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    '3. กิจการเกี่ยวกับอาหาร เครื่องดื่ม น้ำดื่ม',
  ]);
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [addressNo, setAddressNo] = useState('195/1');
  const [moo, setMoo] = useState('5');
  const [road, setRoad] = useState('');
  const [subdistrict, setSubdistrict] = useState('บางเป้า');
  const [district, setDistrict] = useState('กันตัง');
  const [province, setProvince] = useState('ตรัง');
  const [buildingType, setBuildingType] = useState('อาคารโรงงาน/อาคารเอกเทศ');
  const [buildingDetails, setBuildingDetails] = useState(
    'อาคารคอนกรีต 2 ชั้น, โรงเรือนเปิดโครงเหล็ก 1 หลัง หรือ โกดังเก็บของขนาดใหญ่'
  );
  const [machineCount, setMachineCount] = useState(0);
  const [horsepower, setHorsepower] = useState(0);
  const [workingDaysPerWeek, setWorkingDaysPerWeek] = useState(6);
  const [maleWorkers, setMaleWorkers] = useState(0);
  const [femaleWorkers, setFemaleWorkers] = useState(0);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [hadComplaints, setHadComplaints] = useState(false);
  const [complaintCount, setComplaintCount] = useState(1);
  const [complaintIssues, setComplaintIssues] = useState<string[]>([]);
  const [animalType, setAnimalType] = useState('');
  const [animalCount, setAnimalCount] = useState(0);

  // Section 2: Raw Materials
  const [rawMaterials, setRawMaterials] = useState<RawMaterialItem[]>([
    { id: '1', name: 'น้ำมันหล่อลื่น / จาระบี', monthlyQuantity: '20 ลิตร' },
  ]);

  // Section 3: Criteria Answers (25 items)
  const [criteriaAnswers, setCriteriaAnswers] = useState<
    Record<string, { answer: 'yes' | 'no' | 'na' | ''; findings: string; recommendations: string }>
  >(() => {
    const initial: Record<string, { answer: 'yes' | 'no' | 'na' | ''; findings: string; recommendations: string }> = {};
    OFFICIAL_25_CRITERIA.forEach((crit) => {
      initial[crit.id] = {
        answer: crit.isSubItemHeader ? '' : 'yes',
        findings: '',
        recommendations: '',
      };
    });
    return initial;
  });

  // Footer fields
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [overallResult, setOverallResult] = useState<'passed' | 'failed' | 'needs_improvement'>('passed');
  const [inspectorName, setInspectorName] = useState('พันจ่าเอกอานัส เด่นหมาด');
  const [inspectorPosition, setInspectorPosition] = useState('เจ้าพนักงานสาธารณสุข');

  // Pre-fill form when editing an existing license or business
  useEffect(() => {
    if (initialLicense) {
      setBusinessName(initialLicense.businessName || '');
      setOwnerName(initialLicense.ownerName || '');
      setOwnerPhone(initialLicense.ownerPhone || initialLicense.businessPhone || '');
      setBusinessPhone(initialLicense.businessPhone || initialLicense.ownerPhone || '');
      setAddressNo(initialLicense.businessAddressNo || initialLicense.ownerAddressNo || '195/1');
      setMoo(initialLicense.businessMoo || initialLicense.ownerMoo || '5');
      setRoad(initialLicense.businessRoad || initialLicense.ownerRoad || '');
      setSubdistrict(initialLicense.businessSubdistrict || 'บางเป้า');
      setDistrict(initialLicense.businessDistrict || 'กันตัง');
      setProvince(initialLicense.businessProvince || 'ตรัง');
      if (initialLicense.businessCategory) {
        setSelectedCategories([initialLicense.businessCategory]);
      }

      // If license has previously saved inspectionData, load it directly
      if (initialLicense.inspectionData) {
        const d = initialLicense.inspectionData;
        if (d.selectedCategories && d.selectedCategories.length > 0) setSelectedCategories(d.selectedCategories);
        if (d.buildingType) setBuildingType(d.buildingType);
        if (d.buildingDetails) setBuildingDetails(d.buildingDetails);
        if (d.machineCount !== undefined) setMachineCount(d.machineCount);
        if (d.horsepower !== undefined) setHorsepower(d.horsepower);
        if (d.workingDaysPerWeek !== undefined) setWorkingDaysPerWeek(d.workingDaysPerWeek);
        if (d.maleWorkers !== undefined) setMaleWorkers(d.maleWorkers);
        if (d.femaleWorkers !== undefined) setFemaleWorkers(d.femaleWorkers);
        if (d.startTime) setStartTime(d.startTime);
        if (d.endTime) setEndTime(d.endTime);
        if (d.hadComplaints !== undefined) setHadComplaints(d.hadComplaints);
        if (d.complaintCount !== undefined) setComplaintCount(d.complaintCount);
        if (d.complaintIssues) setComplaintIssues(d.complaintIssues);
        if (d.animalType) setAnimalType(d.animalType);
        if (d.animalCount !== undefined) setAnimalCount(d.animalCount);
        if (d.rawMaterials && d.rawMaterials.length > 0) setRawMaterials(d.rawMaterials);
        if (d.criteriaAnswers) setCriteriaAnswers(d.criteriaAnswers as any);
        if (d.additionalNotes) setAdditionalNotes(d.additionalNotes);
        if (d.overallResult) setOverallResult(d.overallResult);
        if (d.inspectorName) setInspectorName(d.inspectorName);
        if (d.inspectorPosition) setInspectorPosition(d.inspectorPosition);
      }
    }
  }, [initialLicense]);

  // Auto-fill from existing licenses dropdown
  const handleSelectExistingBusiness = (name: string) => {
    setBusinessName(name);
    const found = existingLicenses.find((l) => l.businessName.includes(name));
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

  // Form Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      alert('กรุณากรอกชื่อสถานประกอบกิจการ');
      return;
    }

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
      machineCount,
      horsepower,
      workingDaysPerWeek,
      maleWorkers,
      femaleWorkers,
      startTime,
      endTime,
      animalType,
      animalCount,
      hadComplaints,
      complaintCount,
      complaintIssues,
      rawMaterials,
      criteriaAnswers,
      additionalNotes,
      overallResult,
      inspectorName,
      inspectorPosition,
    };

    // Auto-create or update license
    const targetLic =
      initialLicense ||
      existingLicenses.find(
        (l) => l.businessName.trim().toLowerCase() === businessName.trim().toLowerCase()
      );

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
      licenseNumber: targetLic?.licenseNumber || `${Math.floor(10 + Math.random() * 90)}/2569`,
      licenseYear: targetLic?.licenseYear || '2569',
      approvalDate: targetLic?.approvalDate || new Date().toISOString().slice(0, 10),
      expireDate:
        targetLic?.expireDate ||
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      status: overallResult === 'passed' ? 'normal' : 'pending',
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

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ===================== ส่วนที่ 1: ข้อมูลทั่วไป ===================== */}
        <div className="space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-6 bg-emerald-600 rounded-full inline-block" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                ส่วนที่ 1: ข้อมูลทั่วไปของสถานประกอบกิจการ
              </h2>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
              ขั้นตอนที่ 1 จาก 3
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* ประเภทกิจการ List (Multi-Select box) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                ประเภทกิจการ <span className="text-rose-500">*</span>
              </label>
              <div className="h-44 overflow-y-auto p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs text-slate-700">
                {OFFICIAL_BUSINESS_CATEGORIES.map((cat) => {
                  const checked = selectedCategories.includes(cat);
                  return (
                    <label
                      key={cat}
                      className={`flex items-start gap-2 p-1.5 rounded cursor-pointer transition-colors ${
                        checked ? 'bg-emerald-50 text-emerald-900 font-semibold' : 'hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCategory(cat)}
                        className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>{cat}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* ชื่อสถานประกอบการ */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                ชื่อสถานประกอบกิจการ <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                list="existing-businesses"
                placeholder="พิมพ์ชื่อร้าน หรือเลือกจากรายการ"
                value={businessName}
                onChange={(e) => handleSelectExistingBusiness(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 font-bold text-slate-900"
                required
              />
              <datalist id="existing-businesses">
                {existingLicenses.map((lic) => (
                  <option key={lic.id} value={lic.businessName} />
                ))}
              </datalist>
              <span className="text-[11px] text-slate-400 block">อัปเดตล่าสุด: -</span>
            </div>

            {/* ชื่อผู้ดำเนินกิจการ */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">ชื่อผู้ดำเนินกิจการ</label>
              <input
                type="text"
                placeholder="ชื่อ-นามสกุล"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* เบอร์โทร */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                เบอร์โทรศัพท์ผู้ดำเนินกิจการ
              </label>
              <input
                type="tel"
                placeholder="ระบุเบอร์โทรศัพท์"
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                เบอร์โทรศัพท์สถานประกอบกิจการ
              </label>
              <input
                type="tel"
                placeholder="ระบุเบอร์โทรศัพท์ร้าน"
                value={businessPhone}
                onChange={(e) => setBusinessPhone(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          {/* ที่อยู่ */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ตั้งอยู่เลขที่</label>
              <input
                type="text"
                value={addressNo}
                onChange={(e) => setAddressNo(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">หมู่ที่</label>
              <input
                type="text"
                value={moo}
                onChange={(e) => setMoo(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">ถนน</label>
              <input
                type="text"
                placeholder="ระบุชื่อถนน (ถ้ามี)"
                value={road}
                onChange={(e) => setRoad(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ตำบล</label>
              <input
                type="text"
                value={subdistrict}
                onChange={(e) => setSubdistrict(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-semibold text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">อำเภอ</label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-semibold text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ลักษณะอาคาร</label>
              <select
                value={buildingType}
                onChange={(e) => setBuildingType(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
              >
                <option value="อาคารโรงงาน/อาคารเอกเทศ">อาคารโรงงาน/อาคารเอกเทศ</option>
                <option value="อาคารพาณิชย์/ตึกแถว">อาคารพาณิชย์/ตึกแถว</option>
                <option value="โรงเรือนเปิดโครงเหล็ก">โรงเรือนเปิดโครงเหล็ก</option>
                <option value="บ้านพักอาศัยดัดแปลง">บ้านพักอาศัยดัดแปลง</option>
                <option value="โกดัง/คลังสินค้า">โกดัง/คลังสินค้า</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                จำนวนชั้น / โรงเรือน / โกดังรายละเอียดเพิ่มเติม
              </label>
              <input
                type="text"
                value={buildingDetails}
                onChange={(e) => setBuildingDetails(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          {/* เครื่องจักรและกำลังแรงม้า */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                จำนวนเครื่องจักร (ตัว)
              </label>
              <input
                type="number"
                value={machineCount}
                onChange={(e) => setMachineCount(parseInt(e.target.value, 10) || 0)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                รวมกำลังแรงม้า (HP)
              </label>
              <input
                type="number"
                value={horsepower}
                onChange={(e) => setHorsepower(parseInt(e.target.value, 10) || 0)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                จำนวนวันทำงาน (วัน/สัปดาห์)
              </label>
              <input
                type="number"
                value={workingDaysPerWeek}
                onChange={(e) => setWorkingDaysPerWeek(parseInt(e.target.value, 10) || 6)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          {/* คนงาน & เวลาทำงาน */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">คนงานชาย (คน)</label>
              <input
                type="number"
                value={maleWorkers}
                onChange={(e) => setMaleWorkers(parseInt(e.target.value, 10) || 0)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">คนงานหญิง (คน)</label>
              <input
                type="number"
                value={femaleWorkers}
                onChange={(e) => setFemaleWorkers(parseInt(e.target.value, 10) || 0)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">รวมบุคลากรทั้งสิ้น (คน)</label>
              <input
                type="number"
                readOnly
                value={maleWorkers + femaleWorkers}
                className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-slate-100 font-bold text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ช่วงเวลาเริ่มงาน</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ช่วงเวลาเลิกงาน</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          {/* กรณีประกอบกิจการเลี้ยงสัตว์ */}
          {selectedCategories.some((cat) => cat.includes('เลี้ยงสัตว์') || cat.includes('สัตว์และผลิตภัณฑ์')) && (
            <div className="p-3.5 bg-amber-50/80 rounded-xl border border-amber-200 space-y-2">
              <span className="text-xs font-bold text-amber-900 block">
                🐾 3. กรณีประกอบกิจการเลี้ยงสัตว์ (ระบุชนิดสัตว์และจำนวน)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ชนิดสัตว์ที่เลี้ยง</label>
                  <input
                    type="text"
                    value={animalType}
                    onChange={(e) => setAnimalType(e.target.value)}
                    placeholder="เช่น สุกร, ไก่เนื้อ, โค, สัตว์ปีก"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">จำนวนสัตว์ (ตัว)</label>
                  <input
                    type="number"
                    value={animalCount}
                    onChange={(e) => setAnimalCount(parseInt(e.target.value, 10) || 0)}
                    min={0}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* เคยถูกร้องเรียนหรือไม่ */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span>📢 8. ในรอบปีที่ผ่านมาแหล่งประกอบกิจการเคยถูกร้องเรียนก่อปัญหาเหตุรำคาญหรือมลพิษหรือไม่</span>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-900">
                <input
                  type="radio"
                  name="complaint"
                  checked={!hadComplaints}
                  onChange={() => setHadComplaints(false)}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span>🟢 ไม่เคยถูกร้องเรียน</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-rose-300 bg-rose-50 text-rose-900">
                <input
                  type="radio"
                  name="complaint"
                  checked={hadComplaints}
                  onChange={() => setHadComplaints(true)}
                  className="text-rose-600 focus:ring-rose-500"
                />
                <span>🔴 เคยถูกร้องเรียน</span>
              </label>
            </div>

            {hadComplaints && (
              <div className="mt-2.5 p-3.5 bg-rose-50 rounded-xl border border-rose-200 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700">จำนวนครั้งที่เคยถูกร้องเรียน:</span>
                  <input
                    type="number"
                    value={complaintCount}
                    onChange={(e) => setComplaintCount(parseInt(e.target.value, 10) || 1)}
                    min={1}
                    className="w-20 text-center text-xs p-1.5 rounded-lg border border-slate-300 bg-white font-bold"
                  />
                  <span className="text-xs text-slate-600">ครั้ง</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-700 block mb-1.5">
                    ประเด็นที่ถูกร้องเรียน (เลือกได้หลายข้อตามแบบฟอร์มราชการ):
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
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
                      <label key={issue} className="flex items-center space-x-1.5 cursor-pointer">
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
                          className="rounded text-rose-600 focus:ring-rose-500"
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
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-6 bg-amber-600 rounded-full inline-block" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                ส่วนที่ 2: วัตถุดิบ และสารเคมีที่ใช้ในกระบวนการผลิต (ไม่บังคับกรอก)
              </h2>
            </div>
            <button
              type="button"
              onClick={handleAddRawMaterial}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ เพิ่มรายการ</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-16 text-center">ลำดับ</th>
                  <th className="py-2.5 px-3">รายการชื่อวัตถุดิบ / สารเคมี</th>
                  <th className="py-2.5 px-3 w-48">ปริมาณสารที่ใช้จริงต่อเดือน</th>
                  <th className="py-2.5 px-3 w-20 text-center">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rawMaterials.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-400">
                      ไม่มีรายการวัตถุดิบ (คลิก &quot;+ เพิ่มรายการ&quot; ด้านบนเพื่อเพิ่มข้อมูล)
                    </td>
                  </tr>
                ) : (
                  rawMaterials.map((mat, idx) => (
                    <tr key={mat.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-center text-slate-500 font-bold">{idx + 1}</td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          placeholder="เช่น น้ำมันเครื่อง, สีทินเนอร์, แป้งมัน"
                          value={mat.name}
                          onChange={(e) => handleUpdateRawMaterial(mat.id, 'name', e.target.value)}
                          className="w-full p-1.5 rounded border border-slate-300"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          placeholder="เช่น 50 ลิตร / เดือน"
                          value={mat.monthlyQuantity}
                          onChange={(e) => handleUpdateRawMaterial(mat.id, 'monthlyQuantity', e.target.value)}
                          className="w-full p-1.5 rounded border border-slate-300"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRawMaterial(mat.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
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
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-6 bg-emerald-700 rounded-full inline-block" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                ส่วนที่ 3: เกณฑ์สาระสำคัญการตรวจประเมินสุขลักษณะโครงสร้าง
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-amber-700 font-medium bg-amber-50 px-2 py-1 rounded border border-amber-200">
                ⚠️ ระบบจะตรวจสอบความครบถ้วน ห้ามเว้นว่างข้อคำถามก่อนบันทึก
              </span>
              <button
                type="button"
                onClick={handleSetAllYes}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
              >
                เลือก &quot;ใช่&quot; ทั้งหมด
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 w-16 text-center">เลขข้อ</th>
                  <th className="py-3 px-4 min-w-[280px]">รายการเกณฑ์การตรวจสอบข้อกำหนดแผนผัง</th>
                  <th className="py-3 px-4 w-44 text-center">ผลการตรวจประเมินหน้างาน</th>
                  <th className="py-3 px-3 w-40">บันทึกข้อเท็จจริงที่พบ</th>
                  <th className="py-3 px-3 w-40">ข้อเสนอแนะเพื่อปรับปรุง</th>
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
                      <tr key={crit.id} className="bg-slate-50/80 font-bold">
                        <td className="py-3 px-3 text-center text-slate-900">{crit.itemNumber}</td>
                        <td className="py-3 px-4 text-slate-900">{crit.title}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-1 rounded text-[11px] bg-slate-200 text-slate-600 font-medium">
                            กรุณาประเมินในข้อย่อย
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            placeholder="พบอะไรหน้างาน"
                            value={state.findings}
                            onChange={(e) => handleCriteriaChange(crit.id, 'findings', e.target.value)}
                            className="w-full p-1.5 rounded border border-slate-300 text-xs"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            placeholder="สั่งปรับปรุงอะไร"
                            value={state.recommendations}
                            onChange={(e) => handleCriteriaChange(crit.id, 'recommendations', e.target.value)}
                            className="w-full p-1.5 rounded border border-slate-300 text-xs"
                          />
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={crit.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 text-center font-bold text-slate-800">{crit.itemNumber}</td>
                      <td className="py-3 px-4 text-slate-800 leading-relaxed">{crit.title}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          {/* ใช่ */}
                          <label
                            className={`px-2.5 py-1 rounded-full border cursor-pointer font-semibold transition-all ${
                              state.answer === 'yes'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-400 shadow-xs'
                                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`answer-${crit.id}`}
                              checked={state.answer === 'yes'}
                              onChange={() => handleCriteriaChange(crit.id, 'answer', 'yes')}
                              className="sr-only"
                            />
                            <span>◯ ใช่</span>
                          </label>

                          {/* ไม่ใช่ */}
                          <label
                            className={`px-2.5 py-1 rounded-full border cursor-pointer font-semibold transition-all ${
                              state.answer === 'no'
                                ? 'bg-rose-100 text-rose-800 border-rose-400 shadow-xs'
                                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`answer-${crit.id}`}
                              checked={state.answer === 'no'}
                              onChange={() => handleCriteriaChange(crit.id, 'answer', 'no')}
                              className="sr-only"
                            />
                            <span>◯ ไม่ใช่</span>
                          </label>

                          {/* N/A */}
                          <label
                            className={`px-2 py-1 rounded-full border cursor-pointer font-medium transition-all ${
                              state.answer === 'na'
                                ? 'bg-slate-200 text-slate-800 border-slate-400'
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`answer-${crit.id}`}
                              checked={state.answer === 'na'}
                              onChange={() => handleCriteriaChange(crit.id, 'answer', 'na')}
                              className="sr-only"
                            />
                            <span>◯ N/A</span>
                          </label>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="text"
                          placeholder="พบอะไรหน้างาน"
                          value={state.findings}
                          onChange={(e) => handleCriteriaChange(crit.id, 'findings', e.target.value)}
                          className="w-full p-1.5 rounded border border-slate-300 text-xs"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="text"
                          placeholder="สั่งปรับปรุงอะไร"
                          value={state.recommendations}
                          onChange={(e) => handleCriteriaChange(crit.id, 'recommendations', e.target.value)}
                          className="w-full p-1.5 rounded border border-slate-300 text-xs"
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
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
              <span>📝 ข้อเสนอแนะเพิ่มเติม / สรุปผลการตรวจประเมินหน้างาน</span>
            </label>
            <textarea
              rows={3}
              placeholder="ระบุความคิดเห็นของเจ้าหน้าที่ หรือข้อเสนอแนะเพิ่มเติมเพื่อนำไปประมวลผลแทนที่ตัวแปรในใบสรุปผล..."
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                สรุปความเห็นผลการประเมิน
              </label>
              <select
                value={overallResult}
                onChange={(e) => setOverallResult(e.target.value as 'passed' | 'failed' | 'needs_improvement')}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white font-bold"
              >
                <option value="passed">🟢 ผ่านเกณฑ์การประเมินโครงสร้างพื้นฐาน</option>
                <option value="needs_improvement">🟡 ต้องปรับปรุงแก้ไขตามข้อสั่งการ</option>
                <option value="failed">🔴 ไม่ผ่านเกณฑ์มาตรฐาน</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ลงชื่อเจ้าหน้าที่ผู้ตรวจประเมิน
              </label>
              <input
                type="text"
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-semibold text-slate-800 bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ตำแหน่งเจ้าหน้าที่
              </label>
              <input
                type="text"
                value={inspectorPosition}
                onChange={(e) => setInspectorPosition(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 text-slate-800 bg-white"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-3">
            <button
              type="submit"
              className="flex items-center gap-2 px-8 py-3 text-sm font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all active:scale-98"
            >
              <Save className="w-4 h-4" />
              <span>💾 บันทึกและอัปโหลดขึ้นระบบคลาวด์</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
