import React, { useState } from 'react';
import {
  X,
  Printer,
  FileText,
  Table,
  CheckCircle2,
  XCircle,
  Building2,
  Layers,
} from 'lucide-react';
import { NhsoProject, NhsoFundSettings, NHSO_FUND_CATEGORIES } from '../types/index.ts';

interface PrintNhsoProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: NhsoProject | null;
  allProjects?: NhsoProject[];
  settings: NhsoFundSettings;
  defaultMode?: 'single' | 'summary';
}

export const PrintNhsoProjectModal: React.FC<PrintNhsoProjectModalProps> = ({
  isOpen,
  onClose,
  project,
  allProjects = [],
  settings,
  defaultMode = 'single',
}) => {
  const [printMode, setPrintMode] = useState<'single' | 'summary'>(
    project ? defaultMode : 'summary'
  );

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const currentProject = project || allProjects[0];
  const targetYear = currentProject?.fiscalYear || settings.fiscalYear || '2570';

  // Filter projects for summary mode by the selected fiscal year
  const summaryProjects = allProjects.filter((p) => p.fiscalYear === targetYear);
  const totalSummaryBudget = summaryProjects.reduce((sum, p) => sum + p.budgetRequested, 0);

  // Group summary projects by category 1-8
  const groupedByCategory: Record<number, NhsoProject[]> = {};
  for (let c = 1; c <= 8; c++) {
    const matched = summaryProjects.filter((p) => (p.categoryNumber || 1) === c);
    if (matched.length > 0) {
      groupedByCategory[c] = matched;
    }
  }

  const categoryInfo = NHSO_FUND_CATEGORIES.find(
    (c) => c.number === (currentProject?.categoryNumber || 1)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      {/* Modal Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-6xl max-h-[96vh] flex flex-col overflow-hidden">
        {/* Top Control Bar (Hidden during print) */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                พิมพ์เอกสารแบบฟอร์ม สปสช. (A4 แนวนอน)
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-normal">
                  พร้อมตราสัญลักษณ์ สปสช.
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                รองรับการสั่งพิมพ์ หรือบันทึกเป็น PDF สวยงามตรงตามแบบฟอร์ม 13 คอลัมน์แท้จริง
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Mode Switcher */}
            <div className="flex bg-slate-800 rounded-xl p-1 border border-slate-700">
              {project && (
                <button
                  type="button"
                  onClick={() => setPrintMode('single')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    printMode === 'single'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  แบบเสนอโครงการ (13 ช่อง)
                </button>
              )}
              <button
                type="button"
                onClick={() => setPrintMode('summary')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  printMode === 'summary'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                แบบสรุปภาพรวมเสนอ กก.
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg transition-transform hover:scale-105"
            >
              <Printer className="w-4 h-4" /> สั่งพิมพ์ / บันทึก PDF
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-slate-950/60 print:p-0 print:bg-white print:overflow-visible">
          {/* Print container with Landscape styling */}
          <div className="nhso-print-canvas bg-white text-black p-8 mx-auto shadow-xl rounded-lg border border-slate-300 print:shadow-none print:border-none print:p-2 print:m-0 w-full max-w-[1100px] min-h-[750px]">
            {/* ============================================================== */}
            {/* MODE 1: SINGLE PROJECT PROPOSAL (13 COLUMNS LANDSCAPE) */}
            {/* ============================================================== */}
            {printMode === 'single' && currentProject && (
              <div className="space-y-4 text-xs font-sans">
                {/* Header with Logo */}
                <div className="flex items-center justify-between pb-3 border-b-2 border-slate-900">
                  <div className="flex items-center gap-3">
                    <img
                      src="/nhso_logo.jpg"
                      alt="สปสช Logo"
                      className="w-16 h-16 object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div>
                      <h1 className="text-sm font-bold text-slate-900">
                        กองทุนหลักประกันสุขภาพระดับท้องถิ่น เทศบาลตำบลบางเป้า
                      </h1>
                      <p className="text-[11px] text-slate-700">
                        อำเภอกันตัง จังหวัดตรัง • แบบเสนอโครงการขอรับการสนับสนุนงบประมาณ ประจำปีงบประมาณ{' '}
                        {currentProject.fiscalYear}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-bold text-slate-800">
                      รหัสโครงการ: {currentProject.projectCode || `กองทุน-${currentProject.fiscalYear?.slice(-2)}-001`}
                    </div>
                    <div className="text-[10px] text-slate-600">
                      หน่วยงานผู้ขอ: {currentProject.proposingOrg}
                    </div>
                  </div>
                </div>

                {/* Category Banner */}
                <div className="bg-slate-100 p-2 border border-slate-300 rounded font-semibold text-[11px] text-slate-900">
                  {currentProject.categoryName || categoryInfo?.title || `ประเภทที่ ${currentProject.categoryNumber || 1}`}
                </div>

                {/* 13-Column Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-slate-400 text-[10px] leading-tight">
                    <thead>
                      <tr className="bg-slate-200 text-center font-bold text-slate-900">
                        <th className="border border-slate-400 p-1.5 w-[14%]">แผนงาน/โครงการ</th>
                        <th className="border border-slate-400 p-1.5 w-[13%]">กิจกรรม</th>
                        <th className="border border-slate-400 p-1.5 w-[13%]">วัตถุประสงค์</th>
                        <th className="border border-slate-400 p-1.5 w-[10%]">กลุ่มเป้าหมาย</th>
                        <th className="border border-slate-400 p-1.5 w-[10%]">ตัวชี้วัด (KPI)</th>
                        <th className="border border-slate-400 p-1.5 w-[7%]">พื้นที่</th>
                        <th className="border border-slate-400 p-1.5 w-[7%]">ระยะเวลา</th>
                        <th colSpan={5} className="border border-slate-400 p-1.5 w-[18%]">
                          งบประมาณ
                        </th>
                        <th className="border border-slate-400 p-1.5 w-[8%]">ผู้รับผิดชอบ</th>
                      </tr>
                      <tr className="bg-slate-100 text-center font-semibold text-slate-800">
                        <th className="border border-slate-400 p-1 text-[9px]">-</th>
                        <th className="border border-slate-400 p-1 text-[9px]">-</th>
                        <th className="border border-slate-400 p-1 text-[9px]">-</th>
                        <th className="border border-slate-400 p-1 text-[9px]">-</th>
                        <th className="border border-slate-400 p-1 text-[9px]">-</th>
                        <th className="border border-slate-400 p-1 text-[9px]">-</th>
                        <th className="border border-slate-400 p-1 text-[9px]">-</th>
                        <th className="border border-slate-400 p-1 text-[9px] w-[9%]">รายการค่าใช้จ่าย</th>
                        <th className="border border-slate-400 p-1 text-[9px] w-[2%]">จำนวน</th>
                        <th className="border border-slate-400 p-1 text-[9px] w-[2%]">หน่วย</th>
                        <th className="border border-slate-400 p-1 text-[9px] w-[2.5%]">ราคา/หน่วย</th>
                        <th className="border border-slate-400 p-1 text-[9px] w-[2.5%]">รวมเงิน</th>
                        <th className="border border-slate-400 p-1 text-[9px]">-</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* First line contains the merged project fields */}
                      {currentProject.budgetLines && currentProject.budgetLines.length > 0 ? (
                        currentProject.budgetLines.map((line, idx) => (
                          <tr key={line.id || idx} className="align-top">
                            {idx === 0 && (
                              <>
                                <td
                                  rowSpan={currentProject.budgetLines!.length}
                                  className="border border-slate-400 p-1.5 font-bold text-slate-900 whitespace-pre-line"
                                >
                                  {currentProject.projectName}
                                </td>
                                <td
                                  rowSpan={currentProject.budgetLines!.length}
                                  className="border border-slate-400 p-1.5 whitespace-pre-line"
                                >
                                  {currentProject.activities || '-'}
                                </td>
                                <td
                                  rowSpan={currentProject.budgetLines!.length}
                                  className="border border-slate-400 p-1.5 whitespace-pre-line"
                                >
                                  {currentProject.objectives || '-'}
                                </td>
                                <td
                                  rowSpan={currentProject.budgetLines!.length}
                                  className="border border-slate-400 p-1.5 whitespace-pre-line"
                                >
                                  {currentProject.targetGroup || '-'}
                                  {currentProject.targetParticipants ? (
                                    <div className="font-semibold mt-1">
                                      ({currentProject.targetParticipants} คน)
                                    </div>
                                  ) : null}
                                </td>
                                <td
                                  rowSpan={currentProject.budgetLines!.length}
                                  className="border border-slate-400 p-1.5 whitespace-pre-line"
                                >
                                  {currentProject.kpi || '-'}
                                </td>
                                <td
                                  rowSpan={currentProject.budgetLines!.length}
                                  className="border border-slate-400 p-1 text-center"
                                >
                                  {currentProject.location || '-'}
                                </td>
                                <td
                                  rowSpan={currentProject.budgetLines!.length}
                                  className="border border-slate-400 p-1 text-center"
                                >
                                  {currentProject.duration || '-'}
                                </td>
                              </>
                            )}

                            {/* Budget Line Items */}
                            <td className="border border-slate-400 p-1 text-slate-800">
                              {line.name}
                            </td>
                            <td className="border border-slate-400 p-1 text-center">
                              {line.quantity}
                            </td>
                            <td className="border border-slate-400 p-1 text-center">
                              {line.unit}
                            </td>
                            <td className="border border-slate-400 p-1 text-right">
                              {line.unitPrice?.toLocaleString()}
                            </td>
                            <td className="border border-slate-400 p-1 text-right font-semibold">
                              {(line.total || 0).toLocaleString()}
                            </td>

                            {idx === 0 && (
                              <td
                                rowSpan={currentProject.budgetLines!.length}
                                className="border border-slate-400 p-1.5 text-center font-medium"
                              >
                                {currentProject.responsiblePerson || currentProject.proposingOrg}
                              </td>
                            )}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="border border-slate-400 p-2 font-bold">
                            {currentProject.projectName}
                          </td>
                          <td className="border border-slate-400 p-2 whitespace-pre-line">
                            {currentProject.activities}
                          </td>
                          <td className="border border-slate-400 p-2 whitespace-pre-line">
                            {currentProject.objectives}
                          </td>
                          <td className="border border-slate-400 p-2 whitespace-pre-line">
                            {currentProject.targetGroup}
                          </td>
                          <td className="border border-slate-400 p-2 whitespace-pre-line">
                            {currentProject.kpi}
                          </td>
                          <td className="border border-slate-400 p-2 text-center">
                            {currentProject.location}
                          </td>
                          <td className="border border-slate-400 p-2 text-center">
                            {currentProject.duration}
                          </td>
                          <td className="border border-slate-400 p-2">งบประมาณดำเนินโครงการ</td>
                          <td className="border border-slate-400 p-2 text-center">1</td>
                          <td className="border border-slate-400 p-2 text-center">โครงการ</td>
                          <td className="border border-slate-400 p-2 text-right">
                            {currentProject.budgetRequested.toLocaleString()}
                          </td>
                          <td className="border border-slate-400 p-2 text-right font-bold">
                            {currentProject.budgetRequested.toLocaleString()}
                          </td>
                          <td className="border border-slate-400 p-2 text-center">
                            {currentProject.responsiblePerson || currentProject.proposingOrg}
                          </td>
                        </tr>
                      )}

                      {/* Total Row */}
                      <tr className="bg-slate-100 font-bold">
                        <td colSpan={7} className="border border-slate-400 p-1.5 text-center">
                          รวมเป็นเงินทั้งสิ้น (บาท)
                        </td>
                        <td colSpan={4} className="border border-slate-400 p-1.5 text-right">
                          -
                        </td>
                        <td className="border border-slate-400 p-1.5 text-right text-emerald-800 text-xs">
                          {currentProject.budgetRequested.toLocaleString()}
                        </td>
                        <td className="border border-slate-400 p-1.5 text-center text-[9px] text-slate-500">
                          บาทถ้วน
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 3-Signer Signature Block */}
                <div className="pt-6 grid grid-cols-3 gap-6 text-center text-[10px] text-slate-800">
                  {/* Proposer */}
                  <div className="space-y-1">
                    <div>
                      ผู้เสนอ ................................................................
                    </div>
                    <div className="font-semibold">
                      ({currentProject.signers?.proposerName || '................................................'})
                    </div>
                    <div className="text-slate-600">
                      {currentProject.signers?.proposerTitle || 'ผู้เสนอโครงการ'}
                    </div>
                  </div>

                  {/* Endorser */}
                  <div className="space-y-1">
                    <div>
                      ผู้เห็นชอบ ................................................................
                    </div>
                    <div className="font-semibold">
                      ({currentProject.signers?.endorserName || settings.defaultEndorserName})
                    </div>
                    <div className="text-slate-600">
                      {currentProject.signers?.endorserTitle || settings.defaultEndorserTitle}
                    </div>
                  </div>

                  {/* Approver */}
                  <div className="space-y-1">
                    <div>
                      ผู้อนุมัติ ................................................................
                    </div>
                    <div className="font-semibold">
                      ({currentProject.signers?.approverName || settings.defaultApproverName})
                    </div>
                    <div className="text-slate-600">
                      {currentProject.signers?.approverTitle || settings.defaultApproverTitle}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* MODE 2: SUMMARY OVERVIEW TABLE (SHEET 1 REPLICA) */}
            {/* ============================================================== */}
            {printMode === 'summary' && (
              <div className="space-y-5 text-xs font-sans">
                {/* Header */}
                <div className="text-center pb-3 border-b-2 border-slate-900 space-y-1">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <img
                      src="/nhso_logo.jpg"
                      alt="สปสช Logo"
                      className="w-12 h-12 object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <h1 className="text-base font-bold text-slate-900">
                      แบบสรุปโครงการที่ขอรับการสนับสนุนงบประมาณกองทุนหลักประกันสุขภาพระดับท้องถิ่น เทศบาลตำบลบางเป้า
                    </h1>
                  </div>
                  <p className="text-xs text-slate-700 font-semibold">
                    ครั้งที่ 1 ประจำปีงบประมาณ {targetYear} • รวมทั้งสิ้น {summaryProjects.length}{' '}
                    โครงการ • งบประมาณรวม {totalSummaryBudget.toLocaleString()} บาท
                  </p>
                </div>

                {/* Table by Category */}
                <div className="overflow-x-auto space-y-4">
                  <table className="w-full border-collapse border border-slate-400 text-[10px]">
                    <thead>
                      <tr className="bg-slate-200 text-slate-900 font-bold text-center">
                        <th className="border border-slate-400 p-1.5 w-12">ลำดับที่</th>
                        <th className="border border-slate-400 p-1.5 text-left">ชื่อโครงการ</th>
                        <th className="border border-slate-400 p-1.5 w-44 text-left">ผู้ขอรับงบ</th>
                        <th className="border border-slate-400 p-1.5 w-28 text-right">งบประมาณ (บาท)</th>
                        <th colSpan={2} className="border border-slate-400 p-1.5 w-48 text-center">
                          ความเห็นกรรมการฯ
                        </th>
                      </tr>
                      <tr className="bg-slate-100 text-[9px] text-center font-semibold">
                        <th className="border border-slate-400 p-1">-</th>
                        <th className="border border-slate-400 p-1">-</th>
                        <th className="border border-slate-400 p-1">-</th>
                        <th className="border border-slate-400 p-1">-</th>
                        <th className="border border-slate-400 p-1 w-24 text-emerald-800">อนุมัติ</th>
                        <th className="border border-slate-400 p-1 w-24 text-red-800">ไม่อนุมัติ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(groupedByCategory).map(([catNumStr, projectsInCat]) => {
                        const catNum = Number(catNumStr);
                        const catInfo = NHSO_FUND_CATEGORIES.find((c) => c.number === catNum);
                        const subtotal = projectsInCat.reduce((s, p) => s + p.budgetRequested, 0);

                        return (
                          <React.Fragment key={catNum}>
                            {/* Category Group Header */}
                            <tr className="bg-slate-100/90 font-bold text-slate-900">
                              <td
                                colSpan={6}
                                className="border border-slate-400 px-2 py-1.5 text-[11px]"
                              >
                                {catInfo?.title || `ประเภทที่ ${catNum}`} ({projectsInCat.length} โครงการ)
                              </td>
                            </tr>

                            {/* Projects in this category */}
                            {projectsInCat.map((p, idx) => (
                              <tr key={p.id} className="hover:bg-slate-50">
                                <td className="border border-slate-400 p-1.5 text-center font-semibold">
                                  {p.orderNumber || idx + 1}
                                </td>
                                <td className="border border-slate-400 p-1.5 text-slate-900 font-medium whitespace-pre-line">
                                  {p.projectName}
                                </td>
                                <td className="border border-slate-400 p-1.5 text-slate-700">
                                  {p.proposingOrg}
                                </td>
                                <td className="border border-slate-400 p-1.5 text-right font-semibold">
                                  {p.budgetRequested.toLocaleString()}
                                </td>
                                <td className="border border-slate-400 p-1.5 text-center text-emerald-700 font-bold">
                                  {p.status === 'approved' || p.committeeDecision === 'approve'
                                    ? '✓ อนุมัติ'
                                    : ''}
                                </td>
                                <td className="border border-slate-400 p-1.5 text-center text-red-700 font-bold">
                                  {p.status === 'rejected' || p.committeeDecision === 'reject'
                                    ? '✗ ไม่อนุมัติ'
                                    : ''}
                                </td>
                              </tr>
                            ))}

                            {/* Subtotal Row */}
                            <tr className="bg-slate-50 font-bold text-slate-800 text-[10px]">
                              <td colSpan={3} className="border border-slate-400 p-1 text-right">
                                รวมประเภทที่ {catNum} ({projectsInCat.length} โครงการ):
                              </td>
                              <td className="border border-slate-400 p-1 text-right text-emerald-800">
                                {subtotal.toLocaleString()}
                              </td>
                              <td colSpan={2} className="border border-slate-400 p-1 text-center">
                                บาท
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      })}

                      {/* Grand Total Row */}
                      <tr className="bg-slate-200 font-bold text-slate-900 text-xs">
                        <td colSpan={3} className="border border-slate-400 p-2 text-right">
                          รวมทั้งหมด ({summaryProjects.length} โครงการ):
                        </td>
                        <td className="border border-slate-400 p-2 text-right text-emerald-900 font-extrabold">
                          {totalSummaryBudget.toLocaleString()}
                        </td>
                        <td colSpan={2} className="border border-slate-400 p-2 text-center text-[10px]">
                          บาทถ้วน
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Summary Signature Section */}
                <div className="pt-8 grid grid-cols-2 gap-12 text-center text-[11px] text-slate-800">
                  <div className="space-y-1">
                    <div>
                      (ลงชื่อ) ................................................................ ผู้ตรวจสอบ
                    </div>
                    <div className="font-semibold">
                      ({settings.defaultEndorserName})
                    </div>
                    <div className="text-slate-600">
                      {settings.defaultEndorserTitle}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div>
                      (ลงชื่อ) ................................................................ ประธานกรรมการ
                    </div>
                    <div className="font-semibold">
                      ({settings.defaultApproverName})
                    </div>
                    <div className="text-slate-600">
                      {settings.defaultApproverTitle}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Global CSS for Print Media */}
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 10mm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .nhso-print-canvas {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
};
