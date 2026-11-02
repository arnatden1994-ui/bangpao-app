import React, { useState } from 'react';
import {
  X,
  Coins,
  Plus,
  Trash2,
  Calendar,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Save,
  DollarSign,
  TrendingUp,
  Receipt,
  FileCheck2,
} from 'lucide-react';
import {
  NhsoProject,
  NhsoDisbursementRecord,
  NhsoImplementationStatus,
} from '../types/index.ts';

interface NhsoDisbursementModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: NhsoProject;
  onSave: (updatedProject: NhsoProject) => void;
  currentUserFullName?: string;
}

export const NhsoDisbursementModal: React.FC<NhsoDisbursementModalProps> = ({
  isOpen,
  onClose,
  project,
  onSave,
  currentUserFullName = 'เจ้าหน้าที่กองสาธารณสุข',
}) => {
  const approvedBudget = project.budgetApproved || project.budgetRequested || 0;
  const [records, setRecords] = useState<NhsoDisbursementRecord[]>(
    project.disbursementRecords || []
  );
  const [implStatus, setImplStatus] = useState<NhsoImplementationStatus>(
    project.implementationStatus || (project.status === 'approved' ? 'in_progress' : 'not_started')
  );
  const [outcomesSummary, setOutcomesSummary] = useState<string>(
    project.outcomesSummary || ''
  );

  // New disbursement entry state
  const [disbursementDate, setDisbursementDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [amount, setAmount] = useState<number | ''>('');
  const [documentNumber, setDocumentNumber] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [disbursementRound, setDisbursementRound] = useState<number>(records.length + 1);

  if (!isOpen) return null;

  // Calculate totals
  const totalDisbursed = records.reduce((sum, r) => sum + (r.amount || 0), 0);
  const remainingBudget = approvedBudget - totalDisbursed;
  const percentDisbursed =
    approvedBudget > 0 ? Math.min(100, Math.round((totalDisbursed / approvedBudget) * 100)) : 0;

  const handleAddRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      alert('กรุณากรอกจำนวนเงินที่ถูกต้อง');
      return;
    }

    const newRecord: NhsoDisbursementRecord = {
      id: `disb_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      disbursementDate: disbursementDate || new Date().toISOString().split('T')[0],
      amount: numAmount,
      disbursementRound: Number(disbursementRound) || records.length + 1,
      documentNumber: documentNumber.trim() || `ฎีกาที่ ${records.length + 1}/${project.fiscalYear}`,
      description: description.trim() || `เบิกจ่ายงวดที่ ${records.length + 1}`,
      recordedBy: currentUserFullName,
      createdAt: new Date().toISOString(),
    };

    const nextRecords = [newRecord, ...records];
    setRecords(nextRecords);

    // Reset inputs
    setAmount('');
    setDocumentNumber('');
    setDescription('');
    setDisbursementRound(nextRecords.length + 1);
  };

  const handleDeleteRecord = (id: string) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการเบิกจ่ายนี้?')) return;
    setRecords(records.filter((r) => r.id !== id));
  };

  const handleSaveAll = () => {
    const updatedProject: NhsoProject = {
      ...project,
      disbursedAmount: totalDisbursed,
      disbursementRecords: records,
      implementationStatus: implStatus,
      outcomesSummary: outcomesSummary.trim(),
      // Automatically update main status to completed if reported
      status: implStatus === 'completed_reported' ? 'completed' : project.status,
      updatedAt: new Date().toISOString(),
    };

    onSave(updatedProject);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-md">
              <Coins className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                ติดตามการเบิกจ่ายจริง & ผลการดำเนินโครงการ
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/20 font-semibold">
                  ปีงบ {project.fiscalYear}
                </span>
              </h2>
              <p className="text-xs text-white/80 mt-0.5 line-clamp-1">
                {project.projectCode} • {project.projectName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* 1. Financial Status KPI Card */}
          <div className="bg-gradient-to-br from-slate-50 to-emerald-50/40 dark:from-slate-800/60 dark:to-emerald-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  งบประมาณที่ได้รับอนุมัติ:
                </span>
                <div className="text-xl font-black text-slate-900 dark:text-slate-100">
                  {approvedBudget.toLocaleString()}{' '}
                  <span className="text-xs font-normal text-slate-500">บาท</span>
                </div>
                <span className="text-[11px] text-slate-400">หน่วยงาน: {project.proposingOrg}</span>
              </div>

              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  เบิกจ่ายจริงแล้ว (สะสม):
                </span>
                <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                  {totalDisbursed.toLocaleString()}{' '}
                  <span className="text-xs font-normal text-slate-500">บาท</span>
                </div>
                <span className="text-[11px] text-emerald-600 font-semibold">
                  เบิกจ่ายไปแล้ว {percentDisbursed}%
                </span>
              </div>

              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  งบประมาณคงเหลือรอเบิก:
                </span>
                <div
                  className={`text-xl font-black ${
                    remainingBudget >= 0
                      ? 'text-purple-600 dark:text-purple-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {remainingBudget.toLocaleString()}{' '}
                  <span className="text-xs font-normal text-slate-500">บาท</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {remainingBudget === 0 ? 'เบิกจ่ายครบถ้วนแล้ว' : 'ยังเบิกไม่ครบตามกรอบ'}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-500">
                <span>ความก้าวหน้าการเบิกจ่ายงบประมาณ</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">{percentDisbursed}%</span>
              </div>
              <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                  style={{ width: `${percentDisbursed}%` }}
                />
              </div>
            </div>
          </div>

          {/* 2. New Disbursement Form */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              บันทึกการเบิกจ่ายเงิน (งวดใหม่)
            </h3>
            <form onSubmit={handleAddRecord} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    วันที่เบิกจ่าย <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={disbursementDate}
                    onChange={(e) => setDisbursementDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    จำนวนเงินที่เบิก (บาท) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                    placeholder="เช่น 15000"
                    className="w-full px-3 py-1.5 rounded-lg border border-emerald-400 dark:border-emerald-700 bg-white dark:bg-slate-900 text-xs font-bold text-emerald-700 dark:text-emerald-300 focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    งวดที่
                  </label>
                  <input
                    type="number"
                    value={disbursementRound}
                    onChange={(e) => setDisbursementRound(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    เลขที่ฎีกา / เช็ค / ใบสำคัญ
                  </label>
                  <input
                    type="text"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    placeholder="เช่น ฎีกา 12/2570"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    รายละเอียดการเบิกจ่าย
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="เช่น ค่าจัดซื้อวัสดุอุปกรณ์ และค่าตอบแทนวิทยากร"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" /> บันทึกการเบิกเงิน
                </button>
              </div>
            </form>
          </div>

          {/* 3. Disbursement History Table */}
          <div className="space-y-2">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span>ประวัติการเบิกจ่ายเงิน ({records.length} รายการ)</span>
              <span className="text-xs text-slate-500 font-normal">
                เบิกสะสม: <strong className="text-emerald-600">{totalDisbursed.toLocaleString()}</strong> บาท
              </span>
            </h3>

            {records.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-xs">
                ยังไม่มีการบันทึกการเบิกจ่ายเงินสำหรับโครงการนี้
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3 w-16 text-center">งวดที่</th>
                      <th className="py-2.5 px-3 w-28">วันที่เบิก</th>
                      <th className="py-2.5 px-3 w-32">เลขที่เอกสาร/ฎีกา</th>
                      <th className="py-2.5 px-3">รายละเอียด</th>
                      <th className="py-2.5 px-3 w-28 text-right">จำนวนเงิน (บาท)</th>
                      <th className="py-2.5 px-3 w-32">ผู้บันทึก</th>
                      <th className="py-2.5 px-2 w-10 text-center">ลบ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {records.map((r, idx) => (
                      <tr key={r.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 text-center font-bold text-slate-500">
                          {r.disbursementRound || records.length - idx}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                          {r.disbursementDate}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                          {r.documentNumber || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                          {r.description || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {r.amount.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                          {r.recordedBy || '-'}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteRecord(r.id)}
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
            )}
          </div>

          {/* 4. Implementation Status & Outcomes Reporting */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-blue-600" />
              การติดตามผลการดำเนินงาน & การส่งรายงานสรุปผล
            </h3>

            {/* Implementation Status Selector */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                สถานะการดำเนินงานโครงการจริง:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setImplStatus('not_started')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                    implStatus === 'not_started'
                      ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  ⏳ ยังไม่เริ่มดำเนินงาน
                </button>
                <button
                  type="button"
                  onClick={() => setImplStatus('in_progress')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                    implStatus === 'in_progress'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  🔄 กำลังดำเนินกิจกรรม
                </button>
                <button
                  type="button"
                  onClick={() => setImplStatus('completed_waiting_report')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                    implStatus === 'completed_waiting_report'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  📋 เสร็จสิ้น (รอส่งรายงาน)
                </button>
                <button
                  type="button"
                  onClick={() => setImplStatus('completed_reported')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                    implStatus === 'completed_reported'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  ✅ ส่งรายงานผลและปิดโครงการ
                </button>
              </div>
            </div>

            {/* Outcomes Summary */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                สรุปผลการดำเนินงานจริง (ผลผลิต / ผลลัพธ์ / จำนวนผู้เข้าร่วม / ปัญหาอุปสรรค):
              </label>
              <textarea
                rows={3}
                value={outcomesSummary}
                onChange={(e) => setOutcomesSummary(e.target.value)}
                placeholder="เช่น ดำเนินการจัดอบรมและตรวจคัดกรองเสร็จสิ้นเมื่อวันที่ ... มีผู้เข้าร่วม 125 คน (เป้าหมาย 120 คน) พบกลุ่มเสี่ยง 14 คน ส่งต่อ รพ.สต. เพื่อดูแลต่อเนื่อง เบิกจ่ายงบประมาณครบถ้วนตามแผนงาน"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            บันทึกโดย: <strong>{currentUserFullName}</strong>
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
              onClick={handleSaveAll}
              className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-md flex items-center gap-2 transition-all hover:scale-[1.02]"
            >
              <Save className="w-4 h-4" />
              บันทึกข้อมูลการเบิกจ่าย & ติดตามผล
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
