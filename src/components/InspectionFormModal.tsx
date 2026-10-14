import React, { useState, useMemo } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Award,
  Calendar,
  User,
  Camera,
  Save,
  Check,
  Building2,
  FileText,
  AlertTriangle,
  Info,
} from 'lucide-react';
import {
  Establishment,
  EvaluationItemResult,
  InspectionRating,
  InspectionRecord,
  CriteriaCategory,
} from '../types/index.ts';
import { INSPECTION_CRITERIA, CATEGORY_LABELS, ESTABLISHMENT_TYPE_LABELS } from '../data/criteria.ts';

interface InspectionFormModalProps {
  establishment: Establishment;
  isOpen: boolean;
  onClose: () => void;
  onSaveInspection: (record: InspectionRecord, updatedEstablishment: Establishment) => void;
}

export const InspectionFormModal: React.FC<InspectionFormModalProps> = ({
  establishment,
  isOpen,
  onClose,
  onSaveInspection,
}) => {
  if (!isOpen) return null;

  // Initialize evaluation item results
  const [itemResults, setItemResults] = useState<Record<string, EvaluationItemResult>>(() => {
    const initial: Record<string, EvaluationItemResult> = {};
    INSPECTION_CRITERIA.forEach((item) => {
      initial[item.id] = {
        criteriaId: item.id,
        result: 'pass',
        score: item.maxScore,
        remarks: '',
      };
    });
    return initial;
  });

  const [activeCategory, setActiveCategory] = useState<CriteriaCategory | 'all'>('all');
  const [inspectorName, setInspectorName] = useState(
    establishment.inspectorName || 'น.ส. พิมลภัส ศรีสุข'
  );
  const [inspectorPosition, setInspectorPosition] = useState('นักวิชาการสาธารณสุขชำนาญการ');
  const [inspectionDate, setInspectionDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [recommendations, setRecommendations] = useState('');
  const [reinspectionDueDate, setReinspectionDueDate] = useState('');
  const [inspectorSignature, setInspectorSignature] = useState(
    establishment.inspectorName ? establishment.inspectorName.split(' ')[0] : 'พิมลภัส'
  );
  const [recipientSignature, setRecipientSignature] = useState(establishment.ownerName);
  const [evidencePhotoUrl, setEvidencePhotoUrl] = useState(establishment.imageUrl || '');

  // Handle score change
  const handleItemResultChange = (
    criteriaId: string,
    result: 'pass' | 'partial' | 'fail',
    maxScore: number
  ) => {
    let score = maxScore;
    if (result === 'partial') score = Math.round(maxScore * 0.5);
    if (result === 'fail') score = 0;

    setItemResults((prev) => ({
      ...prev,
      [criteriaId]: {
        ...prev[criteriaId],
        result,
        score,
      },
    }));
  };

  const handleItemRemarksChange = (criteriaId: string, remarks: string) => {
    setItemResults((prev) => ({
      ...prev,
      [criteriaId]: {
        ...prev[criteriaId],
        remarks,
      },
    }));
  };

  // Quick fill all pass
  const handleSetAllPass = () => {
    const allPass: Record<string, EvaluationItemResult> = {};
    INSPECTION_CRITERIA.forEach((item) => {
      allPass[item.id] = {
        criteriaId: item.id,
        result: 'pass',
        score: item.maxScore,
        remarks: '',
      };
    });
    setItemResults(allPass);
  };

  // Calculate scores
  const { totalScore, rating, passed, categoryScores, defectsSummary } = useMemo(() => {
    let total = 0;
    const catScores: Record<CriteriaCategory, { score: number; max: number }> = {
      environment: { score: 0, max: 0 },
      personnel: { score: 0, max: 0 },
      raw_materials: { score: 0, max: 0 },
      utensils: { score: 0, max: 0 },
      waste_and_pest: { score: 0, max: 0 },
    };

    const defects: string[] = [];

    INSPECTION_CRITERIA.forEach((crit) => {
      const res = itemResults[crit.id];
      const itemScore = res ? res.score : 0;
      total += itemScore;

      catScores[crit.category].max += crit.maxScore;
      catScores[crit.category].score += itemScore;

      if (res && (res.result === 'fail' || res.result === 'partial')) {
        const text = `${crit.title}${res.remarks ? ` (${res.remarks})` : ''}`;
        defects.push(text);
      }
    });

    let currentRating: InspectionRating = 'poor';
    if (total >= 90) currentRating = 'excellent';
    else if (total >= 80) currentRating = 'good';
    else if (total >= 70) currentRating = 'fair';
    else currentRating = 'poor';

    const isPassed = total >= 70;

    return {
      totalScore: total,
      rating: currentRating,
      passed: isPassed,
      categoryScores: catScores,
      defectsSummary: defects,
    };
  }, [itemResults]);

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const inspectionId = `INS-${new Date().getFullYear() + 543}-${Math.floor(1000 + Math.random() * 9000)}`;

    const certYear = new Date().getFullYear() + 543;
    const certNumber = passed
      ? establishment.certificateNo || `HYG-BKK-${String(certYear).slice(-2)}-${Math.floor(10000 + Math.random() * 90000)}`
      : '';

    // Next inspection date: 1 year for passed, 15-30 days for failed/reinspection
    let nextDate = reinspectionDueDate;
    if (passed && !nextDate) {
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      nextDate = nextYear.toISOString().slice(0, 10);
    } else if (!passed && !nextDate) {
      const reDate = new Date();
      reDate.setDate(reDate.getDate() + 20);
      nextDate = reDate.toISOString().slice(0, 10);
    }

    const expiryDate = passed ? nextDate : '';

    const newInspectionRecord: InspectionRecord = {
      id: inspectionId,
      establishmentId: establishment.id,
      establishmentCode: establishment.code || establishment.id,
      establishmentName: establishment.name,
      establishmentType: establishment.type,
      inspectorName,
      inspectorPosition,
      inspectionDate,
      totalScore,
      rating,
      status: passed ? 'passed' : 'needs_reinspection',
      itemResults,
      categoryScores,
      defectsSummary,
      recommendations: recommendations || (passed ? 'สุขลักษณะได้มาตรฐาน ควรดูแลรักษาต่อเนื่อง' : 'ต้องแก้ไขข้อบกพร่องตามที่ระบุ'),
      reinspectionDueDate: passed ? undefined : nextDate,
      inspectorSignature,
      recipientSignature,
      evidencePhotoUrl,
      createdAt: new Date().toISOString(),
    };

    const updatedEstablishment: Establishment = {
      ...establishment,
      status: passed ? 'passed' : 'needs_reinspection',
      latestScore: totalScore,
      latestRating: rating,
      latestInspectionDate: inspectionDate,
      nextInspectionDate: nextDate,
      certificateNo: certNumber,
      certificateExpiryDate: expiryDate,
      inspectorName,
      notes: recommendations || establishment.notes,
      updatedAt: new Date().toISOString(),
    };

    onSaveInspection(newInspectionRecord, updatedEstablishment);
  };

  const filteredCriteria =
    activeCategory === 'all'
      ? INSPECTION_CRITERIA
      : INSPECTION_CRITERIA.filter((c) => c.category === activeCategory);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <FileText className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">แบบตรวจประเมินสุขลักษณะสถานประกอบการ</h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/30 text-emerald-200 border border-emerald-400/20">
                  มาตรฐาน 100 คะแนน
                </span>
              </div>
              <p className="text-xs text-emerald-100/80 mt-0.5">
                {establishment.name} ({ESTABLISHMENT_TYPE_LABELS[establishment.type]})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Score Floating Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-500">คะแนนปัจจุบัน:</div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900">{totalScore}</span>
              <span className="text-xs text-slate-500">/ 100</span>
            </div>

            {/* Rating badge */}
            {rating === 'excellent' && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-emerald-600" /> ดีเยี่ยม (ทอง)
              </span>
            )}
            {rating === 'good' && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> ดี (เงิน)
              </span>
            )}
            {rating === 'fair' && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                ผ่านเกณฑ์ขั้นต่ำ
              </span>
            )}
            {rating === 'poor' && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> ต้องปรับปรุง / ตรวจซ้ำ
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSetAllPass}
              className="px-3 py-1.5 text-xs font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 transition-colors flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>ผ่านทุกข้อ (Pass All)</span>
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-6 flex-1">
          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeCategory === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ทั้งหมด (20 ข้อ)
            </button>
            {Object.entries(CATEGORY_LABELS).map(([catKey, val]) => (
              <button
                key={catKey}
                type="button"
                onClick={() => setActiveCategory(catKey as CriteriaCategory)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  activeCategory === catKey
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {val.title} ({categoryScores[catKey as CriteriaCategory]?.score || 0}/
                {categoryScores[catKey as CriteriaCategory]?.max || 0})
              </button>
            ))}
          </div>

          {/* Criteria Checklist Items */}
          <div className="space-y-4">
            {filteredCriteria.map((item) => {
              const currentRes = itemResults[item.id] || {
                result: 'pass',
                score: item.maxScore,
                remarks: '',
              };

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all ${
                    currentRes.result === 'pass'
                      ? 'border-slate-200 bg-white hover:border-emerald-200'
                      : currentRes.result === 'partial'
                      ? 'border-amber-300 bg-amber-50/30'
                      : 'border-rose-300 bg-rose-50/30'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {item.code}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                      </div>
                      <p className="text-xs text-slate-500 pl-8 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    {/* Result buttons */}
                    <div className="flex items-center gap-1.5 pl-8 sm:pl-0 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleItemResultChange(item.id, 'pass', item.maxScore)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                          currentRes.result === 'pass'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>ผ่าน ({item.maxScore} คะแนน)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleItemResultChange(item.id, 'partial', item.maxScore)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                          currentRes.result === 'partial'
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                        }`}
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>ปรับปรุง ({Math.round(item.maxScore * 0.5)})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleItemResultChange(item.id, 'fail', item.maxScore)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                          currentRes.result === 'fail'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>ไม่ผ่าน (0)</span>
                      </button>
                    </div>
                  </div>

                  {/* Remarks input if not full pass or user wants to add note */}
                  {(currentRes.result !== 'pass' || currentRes.remarks) && (
                    <div className="mt-3 pl-8">
                      <input
                        type="text"
                        placeholder="ระบุข้อบกพร่องที่พบ หรือคำแนะนำเฉพาะข้อนี้..."
                        value={currentRes.remarks}
                        onChange={(e) => handleItemRemarksChange(item.id, e.target.value)}
                        className="w-full text-xs p-2 rounded-lg bg-white border border-slate-200 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Section: Inspection Summary & Signatures */}
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-600" />
              <span>ข้อมูลการบันทึกผลการตรวจและลงนาม</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  ชื่อ-สกุล ผู้ตรวจประเมิน
                </label>
                <input
                  type="text"
                  value={inspectorName}
                  onChange={(e) => setInspectorName(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-white border border-slate-200 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">ตำแหน่ง</label>
                <input
                  type="text"
                  value={inspectorPosition}
                  onChange={(e) => setInspectorPosition(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-white border border-slate-200 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  วันที่ลงพื้นที่ตรวจ
                </label>
                <input
                  type="date"
                  value={inspectionDate}
                  onChange={(e) => setInspectionDate(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-white border border-slate-200 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {passed ? 'กำหนดตรวจรอบถัดไป (1 ปี)' : 'กำหนดวันนัดตรวจซ้ำ (Re-inspection Due)'}
                </label>
                <input
                  type="date"
                  value={reinspectionDueDate}
                  onChange={(e) => setReinspectionDueDate(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-white border border-slate-200 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                ข้อเสนอแนะและข้อสั่งการให้ปรับปรุงแก้ไข
              </label>
              <textarea
                rows={3}
                placeholder="ระบุข้อสั่งการ หรือมาตรการที่ให้สถานประกอบการดำเนินการ เช่น แก้ไขบ่อดักไขมัน, สวมหมวกคลุมผม..."
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg bg-white border border-slate-200 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            {/* Evidence Photo */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-slate-500" />
                <span>ลิงก์รูปถ่ายสถานที่ประกอบการ / หลักฐานตรวจประเมิน</span>
              </label>
              <input
                type="text"
                placeholder="https://example.com/photo.jpg หรือปล่อยว่างเพื่อใช้รูปเดิม"
                value={evidencePhotoUrl}
                onChange={(e) => setEvidencePhotoUrl(e.target.value)}
                className="w-full text-xs p-2 rounded-lg bg-white border border-slate-200 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  ผู้ตรวจประเมิน (ลงลายมือชื่อดิจิทัล)
                </label>
                <input
                  type="text"
                  value={inspectorSignature}
                  onChange={(e) => setInspectorSignature(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-white border border-slate-200 font-serif italic text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  ผู้รับการตรวจ / เจ้าของกิจการ (ลงนามรับทราบ)
                </label>
                <input
                  type="text"
                  value={recipientSignature}
                  onChange={(e) => setRecipientSignature(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-white border border-slate-200 font-serif italic text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-white flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            ยกเลิก
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              className="flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 transition-all active:scale-98"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกผลการตรวจประเมิน ({totalScore} คะแนน)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
