import React, { useState } from 'react';
import {
  X,
  Printer,
  FileText,
  Table,
} from 'lucide-react';
import { NhsoProject, NhsoFundSettings, NHSO_FUND_CATEGORIES, NhsoActivityGroup } from '../types/index.ts';

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

  const summaryProjects = allProjects.filter((p) => p.fiscalYear === targetYear);
  const totalSummaryBudget = summaryProjects.reduce((sum, p) => sum + p.budgetRequested, 0);

  const groupedByCategory: Record<number, NhsoProject[]> = {};
  for (let c = 1; c <= 8; c++) {
    const matched = summaryProjects.filter((p) => (p.categoryNumber || 1) === c);
    if (matched.length > 0) {
      groupedByCategory[c] = matched;
    }
  }

  // Normalize activity groups for single project mode
  const activityGroups: NhsoActivityGroup[] =
    currentProject?.activityGroups && currentProject.activityGroups.length > 0
      ? currentProject.activityGroups
      : [
          {
            id: 'act_default',
            activityName: '1. กิจกรรมดำเนินงาน',
            activities: currentProject?.activities || '',
            objectives: currentProject?.objectives || '',
            targetGroup: currentProject?.targetGroup || '',
            targetParticipants: currentProject?.targetParticipants || 0,
            kpi: currentProject?.kpi || '',
            location: currentProject?.location || '',
            duration: currentProject?.duration || '',
            budgetLines: currentProject?.budgetLines || [],
            subtotal: currentProject?.budgetRequested || 0,
          },
        ];

  // Calculate total table rows
  let totalProjectRows = 0;
  activityGroups.forEach((g) => {
    const hasHeader = !!g.activityName;
    const linesCount = g.budgetLines && g.budgetLines.length > 0 ? g.budgetLines.length : 1;
    totalProjectRows += (hasHeader ? 1 : 0) + linesCount;
  });

  const categoryTitle =
    currentProject?.categoryName ||
    NHSO_FUND_CATEGORIES.find((c) => c.number === (currentProject?.categoryNumber || 1))?.title ||
    `ประเภทที่ ${currentProject?.categoryNumber || 1}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      {/* Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-[1200px] max-h-[96vh] flex flex-col overflow-hidden">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold flex items-center gap-2">
                ตัวอย่างก่อนพิมพ์ (Print Preview - A4 แนวนอน)
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-normal">
                  ตรงตามต้นฉบับ สปสช.
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                รองรับหลายกิจกรรมในโครงการเดียว จัดวางโลโก้และส่วนหัวเหมือนเอกสารจริง 100%
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
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

        {/* Printable Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200 dark:bg-slate-950/80 print:p-0 print:bg-white print:overflow-visible">
          <div className="nhso-print-canvas bg-white text-black p-8 mx-auto shadow-2xl rounded border border-slate-400 print:shadow-none print:border-none print:p-2 print:m-0 w-full max-w-[1120px] min-h-[750px]">
            {/* ============================================================== */}
            {/* MODE 1: SINGLE PROJECT PROPOSAL (EXACT REPLICA) */}
            {/* ============================================================== */}
            {printMode === 'single' && currentProject && (
              <div className="space-y-2 text-black font-sans">
                {/* Top Header Layout: Category Title on Left, Logo Box on Right */}
                <div className="flex items-start justify-between pb-1">
                  {/* Left: Category Title */}
                  <div className="max-w-[75%] pt-3">
                    <h2 className="text-[13px] font-bold text-black leading-snug">
                      {categoryTitle}
                    </h2>
                  </div>

                  {/* Right: Page number & NHSO Logo Box */}
                  <div className="flex flex-col items-end">
                    <span className="text-[11px] font-semibold text-black pr-1 mb-1">
                      {currentProject.orderNumber || 1}
                    </span>
                    <div className="border border-slate-800 px-2.5 py-1 bg-white flex items-center gap-2 rounded shadow-none w-44 h-11">
                      <img
                        src="/nhso_logo.jpg"
                        alt="สปสช"
                        className="h-8 w-8 object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="text-left leading-tight">
                        <div className="text-[13px] font-black text-blue-900 tracking-tight">สปสช.</div>
                        <div className="text-[7.5px] text-slate-800 font-medium whitespace-nowrap">
                          สำนักงานหลักประกันสุขภาพแห่งชาติ
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 13-Column Table Grid */}
                <div className="w-full">
                  <table className="w-full border-collapse border border-black text-[10.5px] leading-snug">
                    <thead>
                      <tr className="text-center font-bold text-black bg-white">
                        <th className="border border-black p-1 w-[12%] align-middle">แผนงาน/โครงการ</th>
                        <th className="border border-black p-1 w-[13%] align-middle">กิจกรรม</th>
                        <th className="border border-black p-1 w-[13%] align-middle">วัตถุประสงค์</th>
                        <th className="border border-black p-1 w-[11%] align-middle">กลุ่มเป้าหมาย</th>
                        <th className="border border-black p-1 w-[10%] align-middle">ตัวชี้วัด (KPI)</th>
                        <th className="border border-black p-1 w-[7%] align-middle">พื้นที่ดำเนินการ</th>
                        <th className="border border-black p-1 w-[6%] align-middle">ระยะเวลา<br/>ดำเนินการ</th>
                        <th colSpan={5} className="border border-black p-1 w-[20%] align-middle">
                          งบประมาณ
                        </th>
                        <th className="border border-black p-1 w-[8%] align-middle">ผู้รับผิดชอบ</th>
                      </tr>
                      <tr className="text-center font-semibold text-black bg-white">
                        <th className="border border-black p-0.5 text-[9px]">-</th>
                        <th className="border border-black p-0.5 text-[9px]">-</th>
                        <th className="border border-black p-0.5 text-[9px]">-</th>
                        <th className="border border-black p-0.5 text-[9px]">-</th>
                        <th className="border border-black p-0.5 text-[9px]">-</th>
                        <th className="border border-black p-0.5 text-[9px]">-</th>
                        <th className="border border-black p-0.5 text-[9px]">-</th>
                        <th className="border border-black p-0.5 text-[9px] w-[9%]">รายการค่าใช้จ่าย</th>
                        <th className="border border-black p-0.5 text-[9px] w-[2.5%]">จำนวน</th>
                        <th className="border border-black p-0.5 text-[9px] w-[2.5%]">หน่วย</th>
                        <th className="border border-black p-0.5 text-[9px] w-[3%]">ราคาต่อหน่วย</th>
                        <th className="border border-black p-0.5 text-[9px] w-[3%]">รวมเงิน (บาท)</th>
                        <th className="border border-black p-0.5 text-[9px]">-</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activityGroups.map((group, gIdx) => {
                        const hasHeaderRow = !!group.activityName;
                        const lines = group.budgetLines && group.budgetLines.length > 0 ? group.budgetLines : [];
                        const groupRowsCount = (hasHeaderRow ? 1 : 0) + (lines.length > 0 ? lines.length : 1);

                        return (
                          <React.Fragment key={group.id || gIdx}>
                            {/* First row of this activity group */}
                            <tr className="align-top">
                              {/* Project Name (Only on very first row of the table, spans all groups) */}
                              {gIdx === 0 && (
                                <td
                                  rowSpan={totalProjectRows}
                                  className="border border-black p-1.5 font-bold text-black whitespace-pre-line"
                                >
                                  {currentProject.projectName}
                                </td>
                              )}

                              {/* Activity Description */}
                              <td
                                rowSpan={groupRowsCount}
                                className="border border-black p-1.5 whitespace-pre-line text-black"
                              >
                                {group.activities || '-'}
                              </td>

                              {/* Objectives */}
                              <td
                                rowSpan={groupRowsCount}
                                className="border border-black p-1.5 whitespace-pre-line text-black"
                              >
                                {group.objectives || '-'}
                              </td>

                              {/* Target Group */}
                              <td
                                rowSpan={groupRowsCount}
                                className="border border-black p-1.5 whitespace-pre-line text-black"
                              >
                                {group.targetGroup || '-'}
                              </td>

                              {/* KPI */}
                              <td
                                rowSpan={groupRowsCount}
                                className="border border-black p-1.5 whitespace-pre-line text-black"
                              >
                                {group.kpi || '-'}
                              </td>

                              {/* Location */}
                              <td
                                rowSpan={groupRowsCount}
                                className="border border-black p-1 text-center whitespace-pre-line text-black"
                              >
                                {group.location || '-'}
                              </td>

                              {/* Duration */}
                              <td
                                rowSpan={groupRowsCount}
                                className="border border-black p-1 text-center whitespace-pre-line text-black"
                              >
                                {group.duration || '-'}
                              </td>

                              {/* Budget Header or First Line */}
                              {hasHeaderRow ? (
                                <>
                                  <td className="border border-black p-1 font-bold text-black" colSpan={5}>
                                    {group.activityName}
                                  </td>
                                </>
                              ) : lines.length > 0 ? (
                                <>
                                  <td className="border border-black p-1 text-black">{lines[0].name}</td>
                                  <td className="border border-black p-1 text-center text-black">
                                    {lines[0].quantity}
                                  </td>
                                  <td className="border border-black p-1 text-center text-black">
                                    {lines[0].unit}
                                  </td>
                                  <td className="border border-black p-1 text-right text-black">
                                    {lines[0].unitPrice?.toLocaleString()}
                                  </td>
                                  <td className="border border-black p-1 text-right font-medium text-black">
                                    {(lines[0].total || 0).toLocaleString()}
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="border border-black p-1" colSpan={4}>
                                    -
                                  </td>
                                  <td className="border border-black p-1 text-right">0</td>
                                </>
                              )}

                              {/* Responsible Person (Only on very first row, spans all groups) */}
                              {gIdx === 0 && (
                                <td
                                  rowSpan={totalProjectRows}
                                  className="border border-black p-1.5 text-center font-medium text-black whitespace-pre-line align-top"
                                >
                                  {currentProject.responsiblePerson || currentProject.proposingOrg}
                                </td>
                              )}
                            </tr>

                            {/* Remaining budget lines for this activity */}
                            {lines.map((line, lIdx) => {
                              // If there was no header row, index 0 was already rendered
                              if (!hasHeaderRow && lIdx === 0) return null;
                              return (
                                <tr key={line.id || lIdx} className="align-top">
                                  <td className="border border-black p-1 text-black">{line.name}</td>
                                  <td className="border border-black p-1 text-center text-black">
                                    {line.quantity}
                                  </td>
                                  <td className="border border-black p-1 text-center text-black">
                                    {line.unit}
                                  </td>
                                  <td className="border border-black p-1 text-right text-black">
                                    {line.unitPrice?.toLocaleString()}
                                  </td>
                                  <td className="border border-black p-1 text-right font-medium text-black">
                                    {(line.total || 0).toLocaleString()}
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}

                      {/* Total Row */}
                      <tr className="font-bold text-black bg-white">
                        <td colSpan={7} className="border border-black p-1.5 text-center"></td>
                        <td colSpan={4} className="border border-black p-1.5 text-center">
                          รวมเป็นเงินทั้งสิ้น (บาท)
                        </td>
                        <td className="border border-black p-1.5 text-right font-bold text-[11px]">
                          {currentProject.budgetRequested.toLocaleString()}
                        </td>
                        <td className="border border-black p-1.5"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 3-Signer Signature Block Matching Official Layout */}
                <div className="pt-8 pb-4 grid grid-cols-3 gap-4 text-center text-[10.5px] text-black">
                  {/* Proposer */}
                  <div className="space-y-1">
                    <div>
                      ผู้เสนอ ................................................................
                    </div>
                    <div className="font-medium">
                      ({currentProject.signers?.proposerName || '................................................'})
                    </div>
                    <div className="text-[10px] text-slate-800">
                      {currentProject.signers?.proposerTitle || 'ผู้เสนอโครงการ'}
                    </div>
                  </div>

                  {/* Endorser */}
                  <div className="space-y-1">
                    <div>
                      ผู้เห็นชอบ ................................................................
                    </div>
                    <div className="font-medium">
                      ({currentProject.signers?.endorserName || settings.defaultEndorserName})
                    </div>
                    <div className="text-[10px] text-slate-800">
                      {currentProject.signers?.endorserTitle || settings.defaultEndorserTitle}
                    </div>
                  </div>

                  {/* Approver */}
                  <div className="space-y-1">
                    <div>
                      ผู้อนุมัติ ................................................................
                    </div>
                    <div className="font-medium">
                      ({currentProject.signers?.approverName || settings.defaultApproverName})
                    </div>
                    <div className="text-[10px] text-slate-800">
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
              <div className="space-y-4 text-xs font-sans text-black">
                {/* Header */}
                <div className="text-center pb-2 border-b-2 border-black space-y-1">
                  <div className="flex items-center justify-center gap-3 mb-1">
                    <img
                      src="/nhso_logo.jpg"
                      alt="สปสช"
                      className="w-10 h-10 object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <h1 className="text-base font-bold text-black">
                      แบบสรุปโครงการที่ขอรับการสนับสนุนงบประมาณกองทุนหลักประกันสุขภาพระดับท้องถิ่น เทศบาลตำบลบางเป้า
                    </h1>
                  </div>
                  <p className="text-xs text-black font-semibold">
                    ครั้งที่ 1 ประจำปีงบประมาณ {targetYear} • รวมทั้งสิ้น {summaryProjects.length}{' '}
                    โครงการ • งบประมาณรวม {totalSummaryBudget.toLocaleString()} บาท
                  </p>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-black text-[10px]">
                    <thead>
                      <tr className="bg-slate-100 text-black font-bold text-center">
                        <th className="border border-black p-1.5 w-12">ลำดับที่</th>
                        <th className="border border-black p-1.5 text-left">ชื่อโครงการ</th>
                        <th className="border border-black p-1.5 w-44 text-left">ผู้ขอรับงบ</th>
                        <th className="border border-black p-1.5 w-28 text-right">งบประมาณ (บาท)</th>
                        <th colSpan={2} className="border border-black p-1.5 w-44 text-center">
                          ความเห็นกรรมการฯ
                        </th>
                      </tr>
                      <tr className="bg-white text-[9px] text-center font-semibold">
                        <th className="border border-black p-1">-</th>
                        <th className="border border-black p-1">-</th>
                        <th className="border border-black p-1">-</th>
                        <th className="border border-black p-1">-</th>
                        <th className="border border-black p-1 w-22">อนุมัติ</th>
                        <th className="border border-black p-1 w-22">ไม่อนุมัติ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(groupedByCategory).map(([catNumStr, projectsInCat]) => {
                        const catNum = Number(catNumStr);
                        const catInfo = NHSO_FUND_CATEGORIES.find((c) => c.number === catNum);
                        const subtotal = projectsInCat.reduce((s, p) => s + p.budgetRequested, 0);

                        return (
                          <React.Fragment key={catNum}>
                            <tr className="bg-slate-50 font-bold text-black">
                              <td colSpan={6} className="border border-black px-2 py-1.5 text-[11px]">
                                {catInfo?.title || `ประเภทที่ ${catNum}`} ({projectsInCat.length} โครงการ)
                              </td>
                            </tr>
                            {projectsInCat.map((p, idx) => (
                              <tr key={p.id}>
                                <td className="border border-black p-1.5 text-center font-semibold">
                                  {p.orderNumber || idx + 1}
                                </td>
                                <td className="border border-black p-1.5 text-black font-medium whitespace-pre-line">
                                  {p.projectName}
                                </td>
                                <td className="border border-black p-1.5 text-black">
                                  {p.proposingOrg}
                                </td>
                                <td className="border border-black p-1.5 text-right font-semibold">
                                  {p.budgetRequested.toLocaleString()}
                                </td>
                                <td className="border border-black p-1.5 text-center font-bold">
                                  {p.status === 'approved' || p.committeeDecision === 'approve'
                                    ? '✓ อนุมัติ'
                                    : ''}
                                </td>
                                <td className="border border-black p-1.5 text-center font-bold text-red-600">
                                  {p.status === 'rejected' || p.committeeDecision === 'reject'
                                    ? '✗ ไม่อนุมัติ'
                                    : ''}
                                </td>
                              </tr>
                            ))}
                            <tr className="font-bold text-black text-[10px]">
                              <td colSpan={3} className="border border-black p-1 text-right">
                                รวมประเภทที่ {catNum} ({projectsInCat.length} โครงการ):
                              </td>
                              <td className="border border-black p-1 text-right font-bold">
                                {subtotal.toLocaleString()}
                              </td>
                              <td colSpan={2} className="border border-black p-1 text-center">
                                บาท
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      })}
                      <tr className="bg-slate-100 font-bold text-black text-xs">
                        <td colSpan={3} className="border border-black p-2 text-right">
                          รวมทั้งหมด ({summaryProjects.length} โครงการ):
                        </td>
                        <td className="border border-black p-2 text-right font-extrabold text-[12px]">
                          {totalSummaryBudget.toLocaleString()}
                        </td>
                        <td colSpan={2} className="border border-black p-2 text-center text-[10px]">
                          บาทถ้วน
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Summary Signature */}
                <div className="pt-6 grid grid-cols-2 gap-12 text-center text-[11px] text-black">
                  <div className="space-y-1">
                    <div>(ลงชื่อ) ................................................................ ผู้ตรวจสอบ</div>
                    <div className="font-medium">({settings.defaultEndorserName})</div>
                    <div className="text-[10px] text-slate-700">{settings.defaultEndorserTitle}</div>
                  </div>
                  <div className="space-y-1">
                    <div>(ลงชื่อ) ................................................................ ประธานกรรมการ</div>
                    <div className="font-medium">({settings.defaultApproverName})</div>
                    <div className="text-[10px] text-slate-700">{settings.defaultApproverTitle}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 8mm;
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
