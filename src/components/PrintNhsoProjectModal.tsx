import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Printer,
  FileText,
  Table,
  FileSpreadsheet,
  CheckSquare,
  ListChecks,
} from 'lucide-react';
import { NhsoProject, NhsoFundSettings, NHSO_FUND_CATEGORIES, NhsoActivityGroup, NhsoBudgetLine } from '../types/index.ts';
import {
  exportSingleProjectToMasterXlsx,
  exportSummaryToMasterXlsx,
  exportAttachment2ToMasterXlsx,
} from '../utils/exportNhsoXlsx.ts';
import {
  getCategoryColorTheme,
  getOrgColorTheme,
  isProjectTrackingCompleted,
  isProjectTrackingExtended,
  isProjectTrackingRefunded,
} from '../utils/nhsoThemeAndTracking.ts';

interface PrintNhsoProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: NhsoProject | null;
  allProjects?: NhsoProject[];
  settings: NhsoFundSettings;
  defaultMode?: 'single' | 'summary' | 'tracking_attachment2';
  targetFiscalYear?: string;
  selectedProjectIds?: string[];
  onToggleTracking?: (
    projectId: string,
    field: 'trackingCompleted' | 'trackingExtended' | 'trackingRefunded'
  ) => void;
}

const escapeHtml = (str?: string) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br/>');
};

const getOfficialCategoryHeader = (categoryNum: number, rawTitle?: string) => {
  const officialTitles: Record<number, string> = {
    1: 'ประเภทที่ 1 สนับสนุนและส่งเสริมการจัดบริการสาธารณสุขของหน่วยบริการ สถานบริการ หรือหน่วยงานสาธารณสุข',
    2: 'ประเภทที่ 2 สนับสนุนและส่งเสริมการจัดกระบวนการหรือกิจกรรมสร้างเสริมสุขภาพ และการป้องกันโรคขององค์กรหรือกลุ่มประชาชน หรือหน่วยงานอื่น',
    3: 'ประเภทที่ 3 สนับสนุนและส่งเสริมการจัดบริการสาธารณสุขของศูนย์พัฒนาเด็กเล็ก ศูนย์พัฒนาคุณภาพชีวิตผู้สูงอายุ หรือศูนย์บริการคนพิการ',
    4: 'ประเภทที่ 4 สนับสนุนการบริหารหรือพัฒนากองทุนหลักประกันสุขภาพ และการพัฒนาระบบบริหารจัดการกองทุน',
    5: 'ประเภทที่ 5 สนับสนุนและส่งเสริมกรณีเกิดโรคระบาดหรือภัยพิบัติในพื้นที่',
    6: 'ประเภทที่ 6 สนับสนุนและส่งเสริมการจัดบริการสาธารณสุขสำหรับผู้ที่มีภาวะพึ่งพิง (LTC)',
    7: 'ประเภทที่ 7 สนับสนุนและส่งเสริมการจัดบริการสาธารณสุขสำหรับผ้าอ้อมผู้ใหญ่และแผ่นรองซับ',
    8: 'ประเภทที่ 8 สนับสนุนการจัดบริการสาธารณสุขตามชุดสิทธิประโยชน์เพิ่มเติม',
  };
  if (officialTitles[categoryNum]) return officialTitles[categoryNum];
  if (rawTitle) {
    return rawTitle
      .replace(/\[.*?\]/g, '')
      .replace(/^\d+\.\s*/, `ประเภทที่ ${categoryNum} `)
      .trim();
  }
  return `ประเภทที่ ${categoryNum}`;
};

interface FlattenedRow {
  id: string;
  type: 'activity_header' | 'budget_line' | 'empty_line';
  headerText?: string;
  groupIndex: number;
  group: NhsoActivityGroup;
  lineIndex?: number;
  line?: NhsoBudgetLine;
  isFirstRowOfGroup: boolean;
  isFirstRowOfProject: boolean;
}

export const PrintNhsoProjectModal: React.FC<PrintNhsoProjectModalProps> = ({
  isOpen,
  onClose,
  project,
  allProjects = [],
  settings,
  defaultMode = 'single',
  targetFiscalYear,
  selectedProjectIds = [],
  onToggleTracking,
}) => {
  const [printMode, setPrintMode] = useState<'single' | 'summary' | 'tracking_attachment2'>(
    project ? defaultMode : defaultMode === 'single' ? 'tracking_attachment2' : defaultMode
  );
  const [onlySelectedScope, setOnlySelectedScope] = useState<boolean>(
    selectedProjectIds.length > 0
  );

  useEffect(() => {
    if (isOpen) {
      setPrintMode(
        project ? defaultMode : defaultMode === 'single' ? 'tracking_attachment2' : defaultMode
      );
      setOnlySelectedScope(selectedProjectIds.length > 0);
    }
  }, [isOpen, project, defaultMode, selectedProjectIds.length]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const currentProject = project || allProjects[0];
  const targetYear =
    targetFiscalYear && targetFiscalYear !== 'all'
      ? targetFiscalYear
      : currentProject?.fiscalYear || settings.fiscalYear || '2570';

  const yearMatchedProjects = allProjects
    .filter((p) => (targetFiscalYear === 'all' ? true : p.fiscalYear === targetYear))
    .sort((a, b) => (a.orderNumber || 999) - (b.orderNumber || 999));

  const summaryProjects =
    onlySelectedScope && selectedProjectIds.length > 0
      ? yearMatchedProjects.filter((p) => selectedProjectIds.includes(p.id))
      : yearMatchedProjects;

  const totalSummaryBudget = summaryProjects.reduce((sum, p) => sum + p.budgetRequested, 0);
  const grandTotalCompleted = summaryProjects.filter((p) => isProjectTrackingCompleted(p)).length;
  const grandTotalExtended = summaryProjects.filter((p) => isProjectTrackingExtended(p)).length;
  const grandTotalNotExecuted = summaryProjects.filter(
    (p) => !isProjectTrackingCompleted(p) && !isProjectTrackingExtended(p) && isProjectTrackingRefunded(p)
  ).length;

  const groupedByCategory: Record<number, NhsoProject[]> = {};
  for (let c = 1; c <= 8; c++) {
    const matched = summaryProjects.filter((p) => (p.categoryNumber || 1) === c);
    if (matched.length > 0) {
      groupedByCategory[c] = matched;
    }
  }

  // Normalize activity groups for single project mode
  const rawGroups: NhsoActivityGroup[] =
    currentProject?.activityGroups && currentProject.activityGroups.length > 0
      ? currentProject.activityGroups
      : [
          {
            id: 'act_default',
            activityName: '',
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

  // Show activity header row (H6:L6 merged in master_nhso.xlsx) whenever activityName is provided
  const activityGroups = rawGroups.map((g) => {
    const validLines = (g.budgetLines || []).filter(
      (l) => Boolean(l.name?.trim()) || (l.total && l.total > 0)
    );
    const trimmedActName = (g.activityName || '').trim();
    const firstLineName = (validLines[0]?.name || '').trim();
    const hasDistinctHeader = Boolean(trimmedActName) && trimmedActName !== firstLineName;
    return {
      ...g,
      budgetLines: validLines,
      showHeaderRow: hasDistinctHeader,
    };
  });

  // Flatten all table rows to calculate exact pagination (including intermediate H:L sub-headers)
  const flattenedRows: FlattenedRow[] = [];
  activityGroups.forEach((group, gIdx) => {
    const lines = group.budgetLines;
    let currentSubHeader = (group.activityName || '').trim();
    let groupRowStarted = false;

    if (group.showHeaderRow) {
      flattenedRows.push({
        id: `gh_${group.id || gIdx}`,
        type: 'activity_header',
        headerText: group.activityName,
        groupIndex: gIdx,
        group,
        isFirstRowOfGroup: true,
        isFirstRowOfProject: flattenedRows.length === 0,
      });
      groupRowStarted = true;
    }

    if (lines.length > 0) {
      lines.forEach((line, lIdx) => {
        const lineCat = (line.activityCategory || '').trim();
        if (lineCat && lineCat !== currentSubHeader && lineCat !== (line.name || '').trim()) {
          flattenedRows.push({
            id: `subgh_${group.id || gIdx}_${lIdx}`,
            type: 'activity_header',
            headerText: lineCat,
            groupIndex: gIdx,
            group,
            isFirstRowOfGroup: !groupRowStarted,
            isFirstRowOfProject: flattenedRows.length === 0,
          });
          currentSubHeader = lineCat;
          groupRowStarted = true;
        }

        flattenedRows.push({
          id: `line_${group.id || gIdx}_${line.id || lIdx}`,
          type: 'budget_line',
          groupIndex: gIdx,
          group,
          lineIndex: lIdx,
          line,
          isFirstRowOfGroup: !groupRowStarted,
          isFirstRowOfProject: flattenedRows.length === 0,
        });
        groupRowStarted = true;
      });
    } else if (!group.showHeaderRow) {
      flattenedRows.push({
        id: `empty_${group.id || gIdx}`,
        type: 'empty_line',
        groupIndex: gIdx,
        group,
        isFirstRowOfGroup: true,
        isFirstRowOfProject: flattenedRows.length === 0,
      });
    }
  });

  // Pagination split matching master_nhso.xlsx:
  // - Single-page projects (<= 11 rows, e.g. 1_จมน้ำ70 with 10 rows): 1 sheet (all rows + Total row + 3-Signer block)
  // - Multi-page projects (>= 12 rows):
  //     Page 1 takes up to 8 rows
  //     Page 2 takes remaining row(s) + Total row + 3-Signer block
  const paginateRows = (rows: FlattenedRow[]): FlattenedRow[][] => {
    if (rows.length <= 11) {
      return [rows];
    }
    const result: FlattenedRow[][] = [];
    let rem = [...rows];

    // Page 1 gets up to 8 rows, leaving breathing room for continuation
    const p1Count = Math.min(8, Math.max(1, rem.length - 1));
    result.push(rem.slice(0, p1Count));
    rem = rem.slice(p1Count);

    while (rem.length > 9) {
      const nextCount = Math.min(8, Math.max(1, rem.length - 1));
      result.push(rem.slice(0, nextCount));
      rem = rem.slice(nextCount);
    }
    if (rem.length > 0) {
      result.push(rem);
    }
    return result;
  };

  const pages = paginateRows(flattenedRows);

  const categoryNum = currentProject?.categoryNumber || 1;
  const categoryTitle = getOfficialCategoryHeader(categoryNum, currentProject?.categoryName);
  const projectOrderNum = currentProject?.orderNumber || 1;

  // Generate HTML for Word (.doc) export (matching master_nhso.xlsx 100%)
  const generateExportHtml = (isExcel = false) => {
    const isSingle = printMode === 'single';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    if (isSingle && currentProject) {
      const catHeader = getOfficialCategoryHeader(currentProject.categoryNumber || 1, currentProject.categoryName);
      const totalBodyRowsWithTotal = flattenedRows.length + 1;

      return `
        <div style="margin-bottom:4px;">
          <table style="width:100%; border:none; margin-bottom:2px; font-family:'TH SarabunPSK', 'TH Sarabun PSK', 'TH Sarabun New', sans-serif;">
            <tr>
              <td style="border:none; vertical-align:bottom; width:78%; padding-bottom:2px; font-family:'TH SarabunPSK', 'TH Sarabun PSK', 'TH Sarabun New', sans-serif; font-size:15.5pt; font-weight:bold;">
                ${catHeader}
              </td>
              <td style="border:none; vertical-align:bottom; width:22%; text-align:right; padding-bottom:2px;">
                <img src="${origin}/Logo_NHSO_MASTER_Thai_2.jpg" width="150" height="46" style="height:46px; width:150px; object-fit:contain;" alt="สปสช." />
              </td>
            </tr>
          </table>
        </div>

        <table style="border-collapse:collapse; width:100%; table-layout:fixed; font-size:14pt; font-family:'TH SarabunPSK', 'TH Sarabun PSK', 'TH Sarabun New', sans-serif;">
          <thead>
            <tr style="text-align:center; font-weight:bold; font-size:14pt; background-color:#ffffff;">
              <th rowspan="2" style="border:1pt solid #000; padding:3px 2px; width:8.5%; vertical-align:middle; font-family:'TH SarabunPSK', 'TH Sarabun PSK', sans-serif;">แผนงาน/โครงการ</th>
              <th rowspan="2" style="border:1pt solid #000; padding:3px 2px; width:10.2%; vertical-align:middle; font-family:'TH SarabunPSK', 'TH Sarabun PSK', sans-serif;">กิจกรรม</th>
              <th rowspan="2" style="border:1pt solid #000; padding:3px 2px; width:10.2%; vertical-align:middle; font-family:'TH SarabunPSK', 'TH Sarabun PSK', sans-serif;">วัตถุประสงค์</th>
              <th rowspan="2" style="border:1pt solid #000; padding:3px 2px; width:8.5%; vertical-align:middle; font-family:'TH SarabunPSK', 'TH Sarabun PSK', sans-serif;">กลุ่มเป้าหมาย</th>
              <th rowspan="2" style="border:1pt solid #000; padding:3px 2px; width:9.4%; vertical-align:middle; font-family:'TH SarabunPSK', 'TH Sarabun PSK', sans-serif;">ตัวชี้วัด (KPI)</th>
              <th rowspan="2" style="border:1pt solid #000; padding:3px 2px; width:7.2%; vertical-align:middle; font-family:'TH SarabunPSK', 'TH Sarabun PSK', sans-serif;">พื้นที่ดำเนินการ</th>
              <th rowspan="2" style="border:1pt solid #000; padding:3px 2px; width:6.2%; vertical-align:middle; font-family:'TH SarabunPSK', 'TH Sarabun PSK', sans-serif;">ระยะเวลา<br/>ดำเนินการ</th>
              <th colspan="5" style="border:1pt solid #000; padding:3px 2px; width:32.8%; vertical-align:middle; font-family:'TH SarabunPSK', 'TH Sarabun PSK', sans-serif;">งบประมาณ</th>
              <th rowspan="2" style="border:1pt solid #000; padding:3px 2px; width:7.0%; vertical-align:middle; font-family:'TH SarabunPSK', 'TH Sarabun PSK', sans-serif;">ผู้รับผิดชอบ</th>
            </tr>
            <tr style="text-align:center; font-weight:bold; font-size:13.5pt; background-color:#ffffff; line-height:1.25;">
              <th style="border:1pt solid #000; padding:2px; width:11.0%; font-family:'TH SarabunPSK', 'TH Sarabun PSK', sans-serif;">รายการค่าใช้จ่าย</th>
              <th style="border:1pt solid #000; padding:2px; width:3.7%; font-family:'TH SarabunPSK', 'TH Sarabun PSK', sans-serif;">จำนวน</th>
              <th style="border:1pt solid #000; padding:2px; width:3.7%; font-family:'TH SarabunPSK', 'TH Sarabun PSK', sans-serif;">หน่วย</th>
              <th style="border:1pt solid #000; padding:2px; width:6.9%; font-family:'TH SarabunPSK', 'TH Sarabun PSK', sans-serif;">ราคาต่อหน่วย</th>
              <th style="border:1pt solid #000; padding:2px; width:7.5%; font-family:'TH SarabunPSK', 'TH Sarabun PSK', sans-serif;">รวมเงิน (บาท)</th>
            </tr>
          </thead>
          <tbody>
            ${activityGroups
              .map((group, gIdx) => {
                const groupRows = flattenedRows.filter((r) => r.groupIndex === gIdx);
                const groupRowsCount = groupRows.length;
                if (groupRowsCount === 0) return '';

                return groupRows
                  .map((rowItem, rIdx) => {
                    const isFirstInGroup = rIdx === 0;
                    const isFirstInProject = flattenedRows.indexOf(rowItem) === 0;
                    let trHtml = '<tr style="vertical-align:top;">';

                    if (isFirstInProject) {
                      trHtml += `<td rowspan="${flattenedRows.length}" style="border:1pt solid #000; padding:3px 4px; vertical-align:top;">${escapeHtml(currentProject.projectName)}</td>`;
                    }
                    if (isFirstInGroup) {
                      trHtml += `<td rowspan="${groupRowsCount}" style="border:1pt solid #000; padding:3px 4px; vertical-align:top;">${escapeHtml(group.activities || '')}</td>`;
                      trHtml += `<td rowspan="${groupRowsCount}" style="border:1pt solid #000; padding:3px 4px; vertical-align:top;">${escapeHtml(group.objectives || '')}</td>`;
                      trHtml += `<td rowspan="${groupRowsCount}" style="border:1pt solid #000; padding:3px 4px; vertical-align:top;">${escapeHtml(group.targetGroup || '')}</td>`;
                      trHtml += `<td rowspan="${groupRowsCount}" style="border:1pt solid #000; padding:3px 4px; vertical-align:top;">${escapeHtml(group.kpi || '')}</td>`;
                      trHtml += `<td rowspan="${groupRowsCount}" style="border:1pt solid #000; padding:3px 4px; vertical-align:top;">${escapeHtml(group.location || '')}</td>`;
                      trHtml += `<td rowspan="${groupRowsCount}" style="border:1pt solid #000; padding:3px 4px; text-align:center; vertical-align:top;">${escapeHtml(group.duration || '')}</td>`;
                    }

                    if (rowItem.type === 'activity_header') {
                      trHtml += `<td colspan="5" style="border:1pt solid #000; padding:3px 4px; background-color:#ffffff;">${escapeHtml(rowItem.headerText || rowItem.group.activityName || '')}</td>`;
                    } else if (rowItem.line) {
                      trHtml += `<td style="border:1pt solid #000; padding:3px 4px;">${escapeHtml(rowItem.line.name)}</td>`;
                      trHtml += `<td style="border:1pt solid #000; padding:3px 2px; text-align:center;">${rowItem.line.quantity}</td>`;
                      trHtml += `<td style="border:1pt solid #000; padding:3px 2px; text-align:center;">${escapeHtml(rowItem.line.unit)}</td>`;
                      trHtml += `<td style="border:1pt solid #000; padding:3px 2px; text-align:center;">${(rowItem.line.unitPrice || 0).toLocaleString()}</td>`;
                      trHtml += `<td style="border:1pt solid #000; padding:3px 2px; text-align:center;">${(rowItem.line.total || 0).toLocaleString()}</td>`;
                    } else {
                      trHtml += `<td colspan="4" style="border:1pt solid #000; padding:3px 4px;"></td><td style="border:1pt solid #000; padding:3px 2px; text-align:center;">0</td>`;
                    }

                    if (isFirstInProject) {
                      trHtml += `<td rowspan="${totalBodyRowsWithTotal}" style="border:1pt solid #000; padding:3px 2px; text-align:center; vertical-align:top;">${escapeHtml(currentProject.responsiblePerson || currentProject.proposingOrg)}</td>`;
                    }

                    trHtml += '</tr>';
                    return trHtml;
                  })
                  .join('');
              })
              .join('')}
            <tr style="font-weight:bold; font-size:14.5pt; background-color:#ffffff;">
              <td colspan="11" style="border:1pt solid #000; padding:3px 8px; text-align:right; font-weight:bold;">รวมเป็นเงินทั้งสิ้น (บาท)</td>
              <td style="border:1pt solid #000; padding:3px 2px; text-align:center; font-weight:bold;">${currentProject.budgetRequested.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top:24px; width:100%;">
          <table style="width:100%; border:none; text-align:center; font-family:'TH Sarabun PSK', 'TH Sarabun New', sans-serif; font-size:15pt;">
            <tr>
              <td style="border:none; width:33%; vertical-align:top; text-align:center; padding:4px;">
                ผู้เสนอ ........................................................<br/>
                (${escapeHtml(currentProject.signers?.proposerName || '................................................')})<br/>
                <span>${escapeHtml(currentProject.signers?.proposerTitle || 'ผู้เสนอโครงการ')}</span>
              </td>
              <td style="border:none; width:33%; vertical-align:top; text-align:center; padding:4px;">
                ผู้เห็นชอบ ..................................................<br/>
                (${escapeHtml(currentProject.signers?.endorserName || settings.defaultEndorserName)})<br/>
                <span>${escapeHtml(currentProject.signers?.endorserTitle || settings.defaultEndorserTitle)}</span>
              </td>
              <td style="border:none; width:33%; vertical-align:top; text-align:center; padding:4px;">
                ผู้อนุมัติ ........................................................<br/>
                (${escapeHtml(currentProject.signers?.approverName || settings.defaultApproverName)})<br/>
                <span>${escapeHtml(currentProject.signers?.approverTitle || settings.defaultApproverTitle)}</span>
              </td>
            </tr>
          </table>
        </div>
      `;
    }

    if (printMode === 'tracking_attachment2') {
      return `
        <div style="background-color:#fce4d6; padding:6px 10px; text-align:center; margin-bottom:10px; font-family:'TH SarabunPSK', 'TH Sarabun PSK', 'TH Sarabun New', sans-serif;">
          <div style="font-size:16pt; font-weight:bold; color:#000000;">
            สรุปโครงการที่ขอรับการสนับสนุนงบประมาณจากกองทุนหลักประกันสุขภาพเทศบาลตำบลบางเป้า &nbsp;&nbsp;(เอกสารแนบ 2)
          </div>
          <div style="font-size:16pt; font-weight:bold; color:#000000;">
            ประจำปีงบประมาณ ${targetYear}
          </div>
        </div>
        <div style="text-align:left; font-size:15pt; font-weight:bold; margin-bottom:6px; font-family:'TH SarabunPSK', 'TH Sarabun PSK', 'TH Sarabun New', sans-serif;">
          จำนวน ${summaryProjects.length} โครงการ
        </div>

        ${Object.entries(groupedByCategory)
          .map(([catNumStr, projectsInCat]) => {
            const cNum = Number(catNumStr);
            const catTheme = getCategoryColorTheme(cNum);
            const subtotal = projectsInCat.reduce((s, p) => s + p.budgetRequested, 0);
            const compCount = projectsInCat.filter((p) => isProjectTrackingCompleted(p)).length;
            const extCount = projectsInCat.filter((p) => isProjectTrackingExtended(p)).length;
            const refCount = projectsInCat.filter((p) => isProjectTrackingRefunded(p)).length;

            return `
              <div style="margin-top:10px; margin-bottom:6px; font-family:'TH SarabunPSK', 'TH Sarabun PSK', 'TH Sarabun New', sans-serif;">
                <div style="display:inline-block; min-width:60%; background-color:${catTheme.headerHex}; padding:3px 10px; font-size:15pt; font-weight:bold; color:#000000;">
                  ประเภทที่ ${cNum} &nbsp;&nbsp;&nbsp;&nbsp; จำนวน &nbsp;${projectsInCat.length}&nbsp; โครงการ
                </div>
              </div>
              <table style="border-collapse:collapse; width:100%; font-size:14.5pt; font-family:'TH SarabunPSK', 'TH Sarabun PSK', 'TH Sarabun New', sans-serif; margin-bottom:12px;">
                <thead>
                  <tr style="text-align:center; font-weight:bold; background-color:${catTheme.headerHex}; color:#000000;">
                    <th rowspan="2" style="border:1pt solid #000; padding:4px; width:5.5%;">ลำดับที่</th>
                    <th rowspan="2" style="border:1pt solid #000; padding:4px; width:44.5%;">ชื่อโครงการ</th>
                    <th rowspan="2" style="border:1pt solid #000; padding:4px; width:14.0%;">ผู้ขอรับงบ</th>
                    <th rowspan="2" style="border:1pt solid #000; padding:4px; width:8.5%;">งบประมาณ<br/>(บาท)</th>
                    <th colspan="3" style="border:1pt solid #000; padding:4px; width:27.5%;">ผลการติดตามโครงการ</th>
                  </tr>
                  <tr style="text-align:center; font-weight:bold; background-color:${catTheme.headerHex}; color:#000000;">
                    <th style="border:1pt solid #000; padding:3px; width:9.2%;">ดำเนินการแล้ว</th>
                    <th style="border:1pt solid #000; padding:3px; width:9.2%;">ขอขยายเวลา</th>
                    <th style="border:1pt solid #000; padding:3px; width:9.1%;">คืนเงิน</th>
                  </tr>
                </thead>
                <tbody>
                  ${projectsInCat
                    .map((p, idx) => {
                      const orgTheme = getOrgColorTheme(p.proposingOrg);
                      const isComp = isProjectTrackingCompleted(p);
                      const isExt = isProjectTrackingExtended(p);
                      const isRef = isProjectTrackingRefunded(p);
                      return `
                        <tr>
                          <td style="border:1pt solid #000; padding:3px 4px; text-align:center;">${p.orderNumber || idx + 1}</td>
                          <td style="border:1pt solid #000; padding:3px 6px;">${escapeHtml(p.projectName)}</td>
                          <td style="border:1pt solid #000; padding:3px 6px; background-color:${orgTheme.bgHex};">${escapeHtml(p.proposingOrg)}</td>
                          <td style="border:1pt solid #000; padding:3px 6px; text-align:right;">${p.budgetRequested.toLocaleString()}</td>
                          <td style="border:1pt solid #000; padding:3px 4px; text-align:center; font-weight:bold; font-size:15pt;">${isComp ? '☑' : ''}</td>
                          <td style="border:1pt solid #000; padding:3px 4px; text-align:center; font-weight:bold; font-size:15pt;">${isExt ? '☑' : ''}</td>
                          <td style="border:1pt solid #000; padding:3px 4px; text-align:center; font-weight:bold; font-size:15pt;">${isRef ? '☑' : ''}</td>
                        </tr>
                      `;
                    })
                    .join('')}
                  <tr style="font-weight:bold; background-color:${catTheme.headerHex}; color:#000000;">
                    <td style="border:1pt solid #000; padding:3px 4px; text-align:center;">รวม</td>
                    <td style="border:1pt solid #000; padding:3px 6px; text-align:center;">${projectsInCat.length} โครงการ</td>
                    <td style="border:1pt solid #000; padding:3px 4px;"></td>
                    <td style="border:1pt solid #000; padding:3px 6px; text-align:right;">${subtotal.toLocaleString()}</td>
                    <td style="border:1pt solid #000; padding:3px 4px; text-align:center;">${compCount > 0 ? compCount : '-'}</td>
                    <td style="border:1pt solid #000; padding:3px 4px; text-align:center;">${extCount > 0 ? extCount : '-'}</td>
                    <td style="border:1pt solid #000; padding:3px 4px; text-align:center;">${refCount > 0 ? `${refCount} โครงการ` : '-'}</td>
                  </tr>
                </tbody>
              </table>
            `;
          })
          .join('')}

        <table style="border-collapse:collapse; width:100%; font-size:14.5pt; font-family:'TH SarabunPSK', 'TH Sarabun PSK', 'TH Sarabun New', sans-serif; margin-top:14px;">
          <thead>
            <tr style="text-align:center; font-weight:bold; background-color:#4472c4; color:#ffffff;">
              <th rowspan="2" style="border:1pt solid #000; padding:6px 4px; width:5.5%; vertical-align:middle;">รวมทั้งหมด</th>
              <th style="border:1pt solid #000; padding:4px; width:44.5%;">จำนวนโครงการ</th>
              <th style="border:1pt solid #000; padding:4px; width:14.0%;"></th>
              <th style="border:1pt solid #000; padding:4px; width:8.5%;">งบประมาณ</th>
              <th style="border:1pt solid #000; padding:4px; width:9.2%;">ดำเนินการแล้ว</th>
              <th style="border:1pt solid #000; padding:4px; width:9.2%;">ขอขยายเวลา</th>
              <th style="border:1pt solid #000; padding:4px; width:9.1%;">ไม่ได้ดำเนินการ</th>
            </tr>
            <tr style="text-align:center; font-weight:bold; background-color:#70ad47; color:#ffffff;">
              <td style="border:1pt solid #000; padding:4px;">${summaryProjects.length} โครงการ</td>
              <td style="border:1pt solid #000; padding:4px;"></td>
              <td style="border:1pt solid #000; padding:4px;">${totalSummaryBudget.toLocaleString()}</td>
              <td style="border:1pt solid #000; padding:4px;">${grandTotalCompleted}</td>
              <td style="border:1pt solid #000; padding:4px;">${grandTotalExtended}</td>
              <td style="border:1pt solid #000; padding:4px;">${grandTotalNotExecuted}</td>
            </tr>
          </thead>
        </table>
      `;
    }

    // Summary Mode (Sheet 1 replica)
    return `
      <div style="text-align:center; margin-bottom:10px; font-family:'TH Sarabun PSK', 'TH Sarabun New', sans-serif;">
        <div style="font-size:16pt; font-weight:bold;">
          สรุปโครงการที่ขอรับการสนับสนุนงบประมาณกองทุนหลักประกันสุขภาพระดับท้องถิ่น เทศบาลตำบลบางเป้า
        </div>
        <div style="font-size:16pt; font-weight:bold;">
          ครั้งที่ 1 ประจำปีงบประมาณ ${targetYear}
        </div>
        <div style="text-align:left; font-size:15pt; font-weight:bold; margin-top:6px;">
          จำนวน ${summaryProjects.length} โครงการ
        </div>
      </div>

      ${Object.entries(groupedByCategory)
        .map(([catNumStr, projectsInCat]) => {
          const cNum = Number(catNumStr);
          const subtotal = projectsInCat.reduce((s, p) => s + p.budgetRequested, 0);
          return `
            <div style="font-size:15pt; font-weight:bold; margin-top:10px; margin-bottom:4px; font-family:'TH Sarabun PSK', 'TH Sarabun New', sans-serif;">
              ประเภทที่ ${cNum} &nbsp;&nbsp;&nbsp; จำนวน ${projectsInCat.length} โครงการ
            </div>
            <table style="border-collapse:collapse; width:100%; font-size:14.5pt; font-family:'TH Sarabun PSK', 'TH Sarabun New', sans-serif; margin-bottom:8px;">
              <thead>
                <tr style="text-align:center; font-weight:bold; background-color:${isExcel ? '#f1f5f9' : '#ffffff'};">
                  <th rowspan="2" style="border:1pt solid #000; padding:4px; width:6.5%;">ลำดับที่</th>
                  <th rowspan="2" style="border:1pt solid #000; padding:4px; width:52.5%;">ชื่อโครงการ</th>
                  <th rowspan="2" style="border:1pt solid #000; padding:4px; width:16.0%;">ผู้ขอรับงบ</th>
                  <th rowspan="2" style="border:1pt solid #000; padding:4px; width:9.0%;">งบประมาณ<br/>(บาท)</th>
                  <th colspan="2" style="border:1pt solid #000; padding:4px; width:16.0%;">ความเห็นกรรมการฯ</th>
                </tr>
                <tr style="text-align:center; font-weight:bold; background-color:${isExcel ? '#f1f5f9' : '#ffffff'};">
                  <th style="border:1pt solid #000; padding:3px; width:8.0%;">อนุมัติ</th>
                  <th style="border:1pt solid #000; padding:3px; width:8.0%;">ไม่อนุมัติ</th>
                </tr>
              </thead>
              <tbody>
                ${projectsInCat
                  .map(
                    (p, idx) => `
                  <tr>
                    <td style="border:1pt solid #000; padding:3px 4px; text-align:center;">${p.orderNumber || idx + 1}</td>
                    <td style="border:1pt solid #000; padding:3px 6px;">${escapeHtml(p.projectName)}</td>
                    <td style="border:1pt solid #000; padding:3px 4px; text-align:center;">${escapeHtml(p.proposingOrg)}</td>
                    <td style="border:1pt solid #000; padding:3px 6px; text-align:center;">${p.budgetRequested.toLocaleString()}</td>
                    <td style="border:1pt solid #000; padding:3px 4px; text-align:center; font-weight:bold;">
                      ${p.status === 'approved' || p.committeeDecision === 'approve' ? '✓' : ''}
                    </td>
                    <td style="border:1pt solid #000; padding:3px 4px; text-align:center; font-weight:bold;">
                      ${p.status === 'rejected' || p.committeeDecision === 'reject' ? '✗' : ''}
                    </td>
                  </tr>
                `
                  )
                  .join('')}
                <tr style="font-weight:bold;">
                  <td style="border:1pt solid #000; padding:3px 4px; text-align:center;">รวม</td>
                  <td style="border:1pt solid #000; padding:3px 6px; text-align:center;">${projectsInCat.length} โครงการ</td>
                  <td style="border:1pt solid #000; padding:3px 4px;"></td>
                  <td style="border:1pt solid #000; padding:3px 6px; text-align:center;">${subtotal.toLocaleString()}</td>
                  <td style="border:1pt solid #000; padding:3px 4px;"></td>
                  <td style="border:1pt solid #000; padding:3px 4px;"></td>
                </tr>
              </tbody>
            </table>
          `;
        })
        .join('')}

      <div style="margin-top:12px; font-size:16pt; font-weight:bold; font-family:'TH Sarabun PSK', 'TH Sarabun New', sans-serif;">
        รวมทั้งหมด ${summaryProjects.length} โครงการ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${totalSummaryBudget.toLocaleString()} บาท
      </div>
    `;
  };

  // Export to Microsoft Word (.doc)
  const handleExportWord = () => {
    const isSingle = printMode === 'single';
    const filename = isSingle
      ? `${currentProject.orderNumber || 1}_${(currentProject.projectName || 'โครงการ_สปสช').replace(/[\\/:*?"<>|]/g, '_')}.doc`
      : printMode === 'tracking_attachment2'
      ? `สรุปผลการติดตามโครงการ_เอกสารแนบ2_ปี${targetYear}.doc`
      : `แบบสรุปภาพรวม_สปสช_${targetYear}.doc`;

    const htmlBody = generateExportHtml(false);
    const docTemplate = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${isSingle ? currentProject.projectName : 'แบบสรุปโครงการ สปสช'}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page Section1 {
            size: 29.7cm 21.0cm;
            mso-page-orientation: landscape;
            margin: 0.6cm 0.6cm 0.6cm 0.6cm;
          }
          div.Section1 { page: Section1; }
          body, table, th, td, div, span, p {
            font-family: 'TH SarabunPSK', 'TH Sarabun PSK', 'TH Sarabun New', sans-serif;
            font-size: 14pt;
          }
          table { border-collapse: collapse; width: 100%; }
        </style>
      </head>
      <body>
        <div class="Section1">
          ${htmlBody}
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', docTemplate], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export to native Microsoft Excel (.xlsx) matching master_nhso.xlsx 100%
  const handleExportExcel = async () => {
    const isSingle = printMode === 'single';
    if (isSingle && currentProject) {
      const filename = `${currentProject.orderNumber || 1}_${(
        currentProject.projectName || 'โครงการ_สปสช'
      ).replace(/[\\/:*?"<>|\r\n]+/g, '_')}.xlsx`;
      await exportSingleProjectToMasterXlsx({
        project: currentProject,
        categoryTitle,
        activityGroups,
        flattenedRows,
        settings,
        filename,
      });
    } else if (printMode === 'tracking_attachment2') {
      const filename = `สรุปผลการติดตามโครงการ_เอกสารแนบ2_ปี${targetYear}.xlsx`;
      await exportAttachment2ToMasterXlsx({
        targetYear,
        summaryProjects,
        groupedByCategory,
        totalSummaryBudget,
        filename,
      });
    } else {
      const filename = `แบบสรุปภาพรวม_สปสช_${targetYear}.xlsx`;
      await exportSummaryToMasterXlsx({
        targetYear,
        summaryProjects,
        groupedByCategory,
        totalSummaryBudget,
        filename,
      });
    }
  };

  const modalContent = (
    <div id="nhso-print-portal">
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto font-sans nhso-modal-overlay">
        {/* Main Modal Card */}
        <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-700/90 w-full max-w-[1380px] max-h-[96vh] flex flex-col overflow-hidden nhso-modal-card">
          {/* Top Control Bar (Hidden when printing) - Tier 1: Header & Status, Tier 2: Modes & Actions */}
          <div className="print:hidden font-sans border-b border-slate-800 shadow-lg">
            {/* Tier 1: Title & Document Specs */}
            <div className="px-6 sm:px-8 py-4 sm:py-5 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800/95 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/25 to-teal-500/15 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-md shadow-emerald-950/50 shrink-0">
                  <Printer className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                      ตัวอย่างก่อนพิมพ์และส่งออกเอกสาร
                    </h2>
                    <span className="text-xs sm:text-sm px-3.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold shadow-sm">
                      แม่แบบทางการ สปสช.
                    </span>
                    <span className="text-xs sm:text-sm px-3.5 py-1 rounded-full bg-slate-800 text-slate-200 border border-slate-600/80 font-semibold">
                      TH Sarabun PSK 16pt
                    </span>
                    <span className="text-xs sm:text-sm px-3.5 py-1 rounded-full bg-slate-800 text-slate-200 border border-slate-600/80 font-semibold">
                      A4 แนวนอน
                    </span>
                  </div>
                  <p className="text-sm sm:text-base text-slate-300 mt-1 font-medium">
                    แบบฟอร์ม 13 ช่อง & เอกสารแนบ 2 แยกสีตรงตามต้นฉบับ • รองรับการพิมพ์ตรงขนาด A4 และส่งออกไฟล์ Word (.doc) / Excel (.xlsx)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 shrink-0 flex-wrap">
                {/* Scope Toggle when user selected specific rows */}
                {printMode !== 'single' && selectedProjectIds.length > 0 && (
                  <div className="flex bg-slate-800/95 rounded-2xl p-1 border-2 border-emerald-500/40 text-xs sm:text-sm shadow-inner">
                    <button
                      type="button"
                      onClick={() => setOnlySelectedScope(true)}
                      className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                        onlySelectedScope
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      ☑ เฉพาะที่ติ๊กเลือก ({selectedProjectIds.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setOnlySelectedScope(false)}
                      className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                        !onlySelectedScope
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      ทั้งหมดปี {targetYear} ({yearMatchedProjects.length})
                    </button>
                  </div>
                )}

                {/* Page / Status indicator */}
                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-800/95 border border-slate-600/90 text-sm sm:text-base font-bold text-emerald-300 shadow-inner">
                  <span className="text-base sm:text-lg">📄</span>
                  <span>
                    {printMode === 'single'
                      ? pages.length === 1
                        ? 'โครงการ 1 แผ่นสมบูรณ์'
                        : `เอกสาร ${pages.length} แผ่น (หน้า 1-${pages.length})`
                      : printMode === 'tracking_attachment2'
                      ? `เอกสารแนบ 2 (${summaryProjects.length} โครงการ • ${totalSummaryBudget.toLocaleString()} บาท)`
                      : `สรุปภาพรวม ${summaryProjects.length} โครงการ`}
                  </span>
                </div>

                {/* Close button */}
                <button
                  onClick={onClose}
                  type="button"
                  className="p-2.5 text-slate-300 hover:text-white rounded-2xl bg-slate-800/70 hover:bg-rose-600/90 transition-all cursor-pointer border border-slate-700 hover:border-rose-500 shadow-sm"
                  title="ปิดหน้าต่าง (ESC)"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Tier 2: Document Mode Switcher & Export / Print Actions */}
            <div className="px-6 sm:px-8 py-3.5 bg-slate-900/95 flex flex-wrap items-center justify-between gap-4">
              {/* Left: Mode Switcher */}
              <div className="flex flex-wrap bg-slate-800/95 rounded-2xl p-1.5 border border-slate-700 shadow-inner gap-1.5">
                {project && (
                  <button
                    type="button"
                    onClick={() => setPrintMode('single')}
                    className={`px-4 sm:px-5 py-2.5 rounded-xl text-sm sm:text-base font-bold flex items-center gap-2.5 transition-all cursor-pointer ${
                      printMode === 'single'
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50 ring-1 ring-emerald-400/40'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                    }`}
                  >
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                    <span>แบบเสนอโครงการ (13 ช่อง)</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPrintMode('tracking_attachment2')}
                  className={`px-4 sm:px-5 py-2.5 rounded-xl text-sm sm:text-base font-bold flex items-center gap-2.5 transition-all cursor-pointer ${
                    printMode === 'tracking_attachment2'
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50 ring-1 ring-emerald-400/40'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                  }`}
                >
                  <ListChecks className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                  <span>สรุปและติดตามผล (เอกสารแนบ 2 - แยกสี)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintMode('summary')}
                  className={`px-4 sm:px-5 py-2.5 rounded-xl text-sm sm:text-base font-bold flex items-center gap-2.5 transition-all cursor-pointer ${
                    printMode === 'summary'
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50 ring-1 ring-emerald-400/40'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                  }`}
                >
                  <Table className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                  <span>แบบสรุปภาพรวมเสนอ กก.</span>
                </button>
              </div>

              {/* Right: Export & Print Action Buttons */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Export Word */}
                <button
                  onClick={handleExportWord}
                  type="button"
                  className="px-4 sm:px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm sm:text-base font-bold rounded-xl flex items-center gap-2.5 shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer border border-blue-400/40"
                  title="ส่งออกไฟล์ Word (.doc) ฟอนต์ TH Sarabun PSK เปิดแก้ไขได้ใน MS Word"
                >
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                  <span>ส่งออก Word</span>
                </button>

                {/* Export Excel */}
                <button
                  onClick={handleExportExcel}
                  type="button"
                  className="px-4 sm:px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white text-sm sm:text-base font-bold rounded-xl flex items-center gap-2.5 shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer border border-emerald-500/40"
                  title="ส่งออกไฟล์ Excel (.xlsx) รูปแบบแม่แบบทางการ สปสช. พร้อมสูตรคำนวณ"
                >
                  <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                  <span>ส่งออก Excel</span>
                </button>

                <div className="h-7 w-px bg-slate-700 mx-1 hidden sm:block" />

                {/* Primary Print Button */}
                <button
                  onClick={handlePrint}
                  type="button"
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:from-emerald-600 active:to-teal-600 text-white text-base sm:text-lg font-extrabold rounded-xl flex items-center gap-2.5 shadow-lg shadow-emerald-950/60 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer ring-2 ring-emerald-300/40"
                >
                  <Printer className="w-5 h-5 shrink-0" />
                  <span>พิมพ์ / บันทึก PDF</span>
                </button>
              </div>
            </div>
          </div>

          {/* Printable Canvas Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/80 nhso-modal-scroll">
            {/* ============================================================== */}
            {/* MODE 1: SINGLE PROJECT PROPOSAL (100% REPLICA OF MASTER XLSX) */}
            {/* ============================================================== */}
            {printMode === 'single' && currentProject && (
              <div className="nhso-print-canvas space-y-8 print:space-y-0">
                {pages.map((pageRows, pageIdx) => {
                  const isLastPage = pageIdx === pages.length - 1;
                  const groupIndicesOnPage = Array.from(new Set(pageRows.map((r) => r.groupIndex)));
                  const pageNum = pageIdx + 1;
                  const totalPages = pages.length;
                  // In master_nhso.xlsx (M6:M16), Column 13 spans all data rows PLUS the Total row on the last page!
                  const col13RowSpan = pageRows.length + (isLastPage ? 1 : 0);

                  return (
                    <div
                      key={`page_sheet_${pageIdx}`}
                      className="nhso-screen-sheet-wrapper max-w-[1140px] mx-auto mb-8 print:mb-0 print:max-w-none"
                    >
                      {/* On-screen Page Badge Indicator (Hidden when printing) */}
                      <div className="nhso-screen-badge print:hidden flex flex-wrap items-center justify-between gap-3 mb-3 px-1 text-slate-200 font-sans text-sm sm:text-base">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-bold flex items-center gap-2 bg-emerald-500/20 text-emerald-300 px-4 py-1.5 rounded-xl border border-emerald-500/40 shadow-sm text-sm sm:text-base">
                            📄 แผ่นที่ {pageNum} จาก {totalPages}
                          </span>
                          <span className="text-slate-200 font-semibold text-sm sm:text-base">
                            {totalPages === 1
                              ? 'โครงร่างเอกสารฉบับสมบูรณ์ (ตาราง 13 ช่อง + ยอดงบรวม + ลายมือชื่อ 3 ฝ่าย)'
                              : pageIdx === 0
                              ? `แผ่นที่ 1 : ตารางกิจกรรมหลักและรายละเอียดโครงการ (${pageRows.length} รายการ)`
                              : `แผ่นที่ 2 : ตารางกิจกรรมต่อเนื่อง + ยอดรวมงบประมาณสุทธิ + ผู้มีอำนาจลงนาม 3 ฝ่าย`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5 text-slate-300 text-xs sm:text-sm font-semibold">
                          <span className="px-3 py-1 rounded-lg bg-slate-800/95 border border-slate-700">
                            A4 Landscape (297 × 210 มม.)
                          </span>
                          <span className="px-3 py-1 rounded-lg bg-slate-800/95 border border-slate-700">
                            TH Sarabun PSK 16pt
                          </span>
                        </div>
                      </div>

                      {/* The Printable Page Sheet */}
                      <div
                        className="nhso-page bg-white text-black px-6 py-5 sm:px-8 sm:py-6 shadow-[0_12px_40px_rgba(0,0,0,0.45)] rounded-md border border-slate-200/80 print:border-none print:shadow-none print:p-0 print:m-0 w-full"
                        style={{
                          fontFamily: "'TH Sarabun PSK', 'TH Sarabun New', 'Sarabun', sans-serif",
                        }}
                      >
                        {/* Top Header Layout matching master_nhso.xlsx:
                            - Left: Category Title aligned at bottom (right above table top border)
                            - Right: Official NHSO Master Logo flush right (no project order number at top right)
                        */}
                        <div className="flex items-end justify-between mb-1">
                          {/* Left: Category Title */}
                          <div className="max-w-[78%] pb-0.5">
                            <h2
                              className="font-bold text-black leading-tight"
                              style={{ fontSize: '15.5pt' }}
                            >
                              {categoryTitle}
                            </h2>
                          </div>

                          {/* Right: Official NHSO Master Logo */}
                          <div className="flex flex-col items-end shrink-0">
                            <img
                              src="/Logo_NHSO_MASTER_Thai_2.jpg"
                              alt="สปสช. สำนักงานหลักประกันสุขภาพแห่งชาติ"
                              className="h-[46px] w-auto object-contain block"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/nhso_logo.jpg';
                              }}
                            />
                          </div>
                        </div>

                        {/* 13-Column Table Grid (Balanced non-overlapping column widths) */}
                        <div className="w-full">
                          <table
                            className="w-full border-collapse border border-black text-black"
                            style={{
                              tableLayout: 'fixed',
                              fontSize: '13.5pt',
                              lineHeight: 1.08,
                            }}
                          >
                            <colgroup>
                              <col style={{ width: '8.5%' }} />
                              <col style={{ width: '10.2%' }} />
                              <col style={{ width: '10.2%' }} />
                              <col style={{ width: '8.5%' }} />
                              <col style={{ width: '9.4%' }} />
                              <col style={{ width: '7.2%' }} />
                              <col style={{ width: '6.2%' }} />
                              <col style={{ width: '11.0%' }} />
                              <col style={{ width: '3.7%' }} />
                              <col style={{ width: '3.7%' }} />
                              <col style={{ width: '6.9%' }} />
                              <col style={{ width: '7.5%' }} />
                              <col style={{ width: '7.0%' }} />
                            </colgroup>
                            <thead>
                              <tr
                                className="text-center font-bold text-black bg-white"
                                style={{ fontSize: '13.5pt', lineHeight: 1.15 }}
                              >
                                <th rowSpan={2} className="border border-black py-1 px-0.5 align-middle font-bold overflow-hidden">
                                  แผนงาน/โครงการ
                                </th>
                                <th rowSpan={2} className="border border-black py-1 px-0.5 align-middle font-bold overflow-hidden">
                                  กิจกรรม
                                </th>
                                <th rowSpan={2} className="border border-black py-1 px-0.5 align-middle font-bold overflow-hidden">
                                  วัตถุประสงค์
                                </th>
                                <th rowSpan={2} className="border border-black py-1 px-0.5 align-middle font-bold overflow-hidden">
                                  กลุ่มเป้าหมาย
                                </th>
                                <th rowSpan={2} className="border border-black py-1 px-0.5 align-middle font-bold overflow-hidden">
                                  ตัวชี้วัด (KPI)
                                </th>
                                <th rowSpan={2} className="border border-black py-1 px-0.5 align-middle font-bold overflow-hidden">
                                  พื้นที่ดำเนินการ
                                </th>
                                <th rowSpan={2} className="border border-black py-1 px-0.5 align-middle font-bold overflow-hidden">
                                  ระยะเวลา<br />ดำเนินการ
                                </th>
                                <th colSpan={5} className="border border-black py-0.5 px-1 align-middle font-bold overflow-hidden">
                                  งบประมาณ
                                </th>
                                <th rowSpan={2} className="border border-black py-1 px-0.5 align-middle font-bold overflow-hidden">
                                  ผู้รับผิดชอบ
                                </th>
                              </tr>
                              <tr
                                className="text-center font-bold text-black bg-white"
                                style={{ fontSize: '13pt', lineHeight: 1.25 }}
                              >
                                <th className="border border-black py-0.5 px-0.5 align-middle font-bold overflow-hidden">
                                  รายการค่าใช้จ่าย
                                </th>
                                <th className="border border-black py-0.5 px-0.5 align-middle font-bold overflow-hidden">
                                  จำนวน
                                </th>
                                <th className="border border-black py-0.5 px-0.5 align-middle font-bold overflow-hidden">
                                  หน่วย
                                </th>
                                <th className="border border-black py-0.5 px-0.5 align-middle font-bold overflow-hidden leading-tight">
                                  ราคาต่อหน่วย
                                </th>
                                <th className="border border-black py-0.5 px-0.5 align-middle font-bold overflow-hidden leading-tight">
                                  รวมเงิน (บาท)
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {groupIndicesOnPage.map((gIdx) => {
                                const groupRows = pageRows.filter((r) => r.groupIndex === gIdx);
                                const group = activityGroups[gIdx];

                                return groupRows.map((rowItem, rIdx) => {
                                  const isFirstInGroupOnThisPage = rIdx === 0;
                                  const isFirstInProjectOnThisPage = pageRows.indexOf(rowItem) === 0;
                                  // Show group metadata on Page 1 or if a new activity group starts on this page;
                                  // leave blank ('') on continuation rows of Page 2 (matching Screenshot 4 & 5!)
                                  const showGroupInfo = pageIdx === 0 || rowItem.isFirstRowOfGroup;

                                  return (
                                    <tr key={rowItem.id} className="align-top">
                                      {/* Column 1: แผนงาน/โครงการ */}
                                      {isFirstInProjectOnThisPage && (
                                        <td
                                          rowSpan={pageRows.length}
                                          className="border border-black py-[2px] px-[4px] text-black whitespace-pre-line align-top break-words"
                                        >
                                          {pageIdx === 0 ? currentProject.projectName : ''}
                                        </td>
                                      )}

                                      {/* Columns 2-7: กิจกรรม, วัตถุประสงค์, กลุ่มเป้าหมาย, KPI, พื้นที่, ระยะเวลา */}
                                      {isFirstInGroupOnThisPage && (
                                        <>
                                          <td
                                            rowSpan={groupRows.length}
                                            className="border border-black py-[2px] px-[4px] whitespace-pre-line text-black align-top break-words"
                                          >
                                            {showGroupInfo ? group.activities || '' : ''}
                                          </td>
                                          <td
                                            rowSpan={groupRows.length}
                                            className="border border-black py-[2px] px-[4px] whitespace-pre-line text-black align-top break-words"
                                          >
                                            {showGroupInfo ? group.objectives || '' : ''}
                                          </td>
                                          <td
                                            rowSpan={groupRows.length}
                                            className="border border-black py-[2px] px-[4px] whitespace-pre-line text-black align-top break-words"
                                          >
                                            {showGroupInfo ? group.targetGroup || '' : ''}
                                          </td>
                                          <td
                                            rowSpan={groupRows.length}
                                            className="border border-black py-[2px] px-[4px] whitespace-pre-line text-black align-top break-words"
                                          >
                                            {showGroupInfo ? group.kpi || '' : ''}
                                          </td>
                                          <td
                                            rowSpan={groupRows.length}
                                            className="border border-black py-[2px] px-[3px] whitespace-pre-line text-black align-top break-words"
                                          >
                                            {showGroupInfo ? group.location || '' : ''}
                                          </td>
                                          <td
                                            rowSpan={groupRows.length}
                                            className="border border-black py-[2px] px-[3px] text-center whitespace-pre-line text-black align-top break-words"
                                          >
                                            {showGroupInfo ? group.duration || '' : ''}
                                          </td>
                                        </>
                                      )}

                                      {/* Columns 8-12: งบประมาณ */}
                                      {rowItem.type === 'activity_header' ? (
                                        <td
                                          className="border border-black py-[2px] px-[4px] text-black bg-white"
                                          colSpan={5}
                                        >
                                          {rowItem.headerText || rowItem.group.activityName}
                                        </td>
                                      ) : rowItem.line ? (
                                        <>
                                          <td className="border border-black py-[2px] px-[4px] text-black break-words">
                                            {rowItem.line.name}
                                          </td>
                                          <td className="border border-black py-[2px] px-[2px] text-center text-black">
                                            {rowItem.line.quantity}
                                          </td>
                                          <td className="border border-black py-[2px] px-[2px] text-center text-black">
                                            {rowItem.line.unit}
                                          </td>
                                          <td className="border border-black py-[2px] px-[2px] text-center text-black">
                                            {rowItem.line.unitPrice?.toLocaleString()}
                                          </td>
                                          <td className="border border-black py-[2px] px-[2px] text-center text-black">
                                            {(rowItem.line.total || 0).toLocaleString()}
                                          </td>
                                        </>
                                      ) : (
                                        <>
                                          <td className="border border-black py-[2px] px-[4px]" colSpan={4}></td>
                                          <td className="border border-black py-[2px] px-[2px] text-center">0</td>
                                        </>
                                      )}

                                      {/* Column 13: ผู้รับผิดชอบ (merged through Total row on final page per M6:M16) */}
                                      {isFirstInProjectOnThisPage && (
                                        <td
                                          rowSpan={col13RowSpan}
                                          className="border border-black py-[2px] px-[3px] text-center text-black whitespace-pre-line align-top break-words"
                                        >
                                          {pageIdx === 0
                                            ? currentProject.responsiblePerson || currentProject.proposingOrg
                                            : ''}
                                        </td>
                                      )}
                                    </tr>
                                  );
                                });
                              })}

                              {/* Total Row (Rendered on final page: A16:K16 merged colSpan=11 right-aligned, L16 bold centered) */}
                              {isLastPage && (
                                <tr className="font-bold text-black bg-white" style={{ fontSize: '14pt' }}>
                                  <td
                                    colSpan={11}
                                    className="border border-black py-[3px] pr-2 text-right font-bold"
                                  >
                                    รวมเป็นเงินทั้งสิ้น (บาท)
                                  </td>
                                  <td
                                    className="border border-black py-[3px] px-1 text-center font-bold"
                                    style={{ fontSize: '14pt' }}
                                  >
                                    {currentProject.budgetRequested.toLocaleString()}
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* 3-Signer Signature Block (Only rendered on final page) */}
                        {isLastPage && (
                          <div
                            className="pt-4 pb-1 grid grid-cols-3 gap-4 text-center text-black nhso-signature-block"
                            style={{ fontSize: '15pt', lineHeight: 1.25 }}
                          >
                            {/* Proposer */}
                            <div className="space-y-0.5">
                              <div>
                                ผู้เสนอ ........................................................
                              </div>
                              <div>
                                ({currentProject.signers?.proposerName || '................................................'})
                              </div>
                              <div className="text-black">
                                {currentProject.signers?.proposerTitle || 'ผู้เสนอโครงการ'}
                              </div>
                            </div>

                            {/* Endorser */}
                            <div className="space-y-0.5">
                              <div>
                                ผู้เห็นชอบ ..................................................
                              </div>
                              <div>
                                ({currentProject.signers?.endorserName || settings.defaultEndorserName})
                              </div>
                              <div className="text-black">
                                {currentProject.signers?.endorserTitle || settings.defaultEndorserTitle}
                              </div>
                            </div>

                            {/* Approver */}
                            <div className="space-y-0.5">
                              <div>
                                ผู้อนุมัติ ........................................................
                              </div>
                              <div>
                                ({currentProject.signers?.approverName || settings.defaultApproverName})
                              </div>
                              <div className="text-black">
                                {currentProject.signers?.approverTitle || settings.defaultApproverTitle}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ============================================================== */}
            {/* MODE 2: SUMMARY OVERVIEW TABLE (100% REPLICA OF SHEET 1)       */}
            {/* ============================================================== */}
            {printMode === 'summary' && (
              <div className="nhso-print-canvas max-w-[1140px] mx-auto">
                <div className="nhso-screen-badge print:hidden flex flex-wrap items-center justify-between gap-3 mb-3.5 px-1 text-slate-200 font-sans text-sm sm:text-base">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-bold flex items-center gap-2 bg-emerald-500/20 text-emerald-300 px-4 py-1.5 rounded-xl border border-emerald-500/40 shadow-sm text-sm sm:text-base">
                      📋 แบบสรุปภาพรวมโครงการ (เสนอคณะกรรมการบริหารกองทุนฯ)
                    </span>
                    <span className="text-slate-200 font-semibold text-sm sm:text-base">
                      รวมทั้งหมด {summaryProjects.length} โครงการ • งบประมาณรวม {totalSummaryBudget.toLocaleString()} บาท
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-300 text-xs sm:text-sm font-semibold">
                    <span className="px-3 py-1 rounded-lg bg-slate-800/95 border border-slate-700">
                      A4 Landscape
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-slate-800/95 border border-slate-700">
                      TH Sarabun PSK 16pt
                    </span>
                  </div>
                </div>

                <div
                  className="nhso-page nhso-summary-page bg-white text-black p-6 sm:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.45)] rounded-md border border-slate-200/80 print:border-none print:shadow-none print:p-0 print:m-0 w-full space-y-3"
                  style={{
                    fontFamily: "'TH Sarabun PSK', 'TH Sarabun New', 'Sarabun', sans-serif",
                  }}
                >
                  {/* Header matching Sheet 1 Rows 1, 2, 4 */}
                  <div className="text-center space-y-0.5">
                    <h1 className="font-bold text-black" style={{ fontSize: '16pt' }}>
                      สรุปโครงการที่ขอรับการสนับสนุนงบประมาณกองทุนหลักประกันสุขภาพระดับท้องถิ่น เทศบาลตำบลบางเป้า
                    </h1>
                    <p className="font-bold text-black" style={{ fontSize: '16pt' }}>
                      ครั้งที่ 1 ประจำปีงบประมาณ {targetYear}
                    </p>
                  </div>

                  <div className="font-bold text-black" style={{ fontSize: '15pt' }}>
                    จำนวน {summaryProjects.length} โครงการ
                  </div>

                  {/* Category Sections matching Sheet 1 (each category has its header + table) */}
                  <div className="space-y-4">
                    {Object.entries(groupedByCategory).map(([catNumStr, projectsInCat]) => {
                      const cNum = Number(catNumStr);
                      const subtotal = projectsInCat.reduce((s, p) => s + p.budgetRequested, 0);

                      return (
                        <div key={cNum} className="space-y-1">
                          <div className="font-bold text-black" style={{ fontSize: '15pt' }}>
                            ประเภทที่ {cNum} &nbsp;&nbsp;&nbsp;&nbsp; จำนวน &nbsp;{projectsInCat.length}&nbsp; โครงการ
                          </div>

                          <table
                            className="w-full border-collapse border border-black text-black"
                            style={{ tableLayout: 'fixed', fontSize: '14pt', lineHeight: 1.15 }}
                          >
                            <colgroup>
                              <col style={{ width: '6.5%' }} />
                              <col style={{ width: '52.5%' }} />
                              <col style={{ width: '16.0%' }} />
                              <col style={{ width: '9.0%' }} />
                              <col style={{ width: '8.0%' }} />
                              <col style={{ width: '8.0%' }} />
                            </colgroup>
                            <thead>
                              <tr className="bg-white text-black font-bold text-center" style={{ fontSize: '14.5pt' }}>
                                <th rowSpan={2} className="border border-black py-1 px-1 align-middle">
                                  ลำดับที่
                                </th>
                                <th rowSpan={2} className="border border-black py-1 px-2 text-center align-middle">
                                  ชื่อโครงการ
                                </th>
                                <th rowSpan={2} className="border border-black py-1 px-1 text-center align-middle">
                                  ผู้ขอรับงบ
                                </th>
                                <th rowSpan={2} className="border border-black py-1 px-1 text-center align-middle leading-tight">
                                  งบประมาณ<br />(บาท)
                                </th>
                                <th colSpan={2} className="border border-black py-1 px-1 text-center align-middle">
                                  ความเห็นกรรมการฯ
                                </th>
                              </tr>
                              <tr className="bg-white text-center font-bold text-black" style={{ fontSize: '14pt' }}>
                                <th className="border border-black py-0.5 px-1">อนุมัติ</th>
                                <th className="border border-black py-0.5 px-1">ไม่อนุมัติ</th>
                              </tr>
                            </thead>
                            <tbody>
                              {projectsInCat.map((p, idx) => (
                                <tr key={p.id}>
                                  <td className="border border-black py-0.5 px-1 text-center">
                                    {p.orderNumber || idx + 1}
                                  </td>
                                  <td className="border border-black py-0.5 px-2 text-black whitespace-pre-line">
                                    {p.projectName}
                                  </td>
                                  <td className="border border-black py-0.5 px-1 text-center text-black">
                                    {p.proposingOrg}
                                  </td>
                                  <td className="border border-black py-0.5 px-1 text-center text-black">
                                    {p.budgetRequested.toLocaleString()}
                                  </td>
                                  <td className="border border-black py-0.5 px-1 text-center font-bold text-emerald-700">
                                    {p.status === 'approved' || p.committeeDecision === 'approve'
                                      ? '✓'
                                      : ''}
                                  </td>
                                  <td className="border border-black py-0.5 px-1 text-center font-bold text-red-600">
                                    {p.status === 'rejected' || p.committeeDecision === 'reject'
                                      ? '✗'
                                      : ''}
                                  </td>
                                </tr>
                              ))}
                              {/* Category Subtotal Row matching R18, R39, R48, R55 in sheet1.xml */}
                              <tr className="font-bold text-black bg-white" style={{ fontSize: '14.5pt' }}>
                                <td className="border border-black py-1 px-1 text-center font-bold">
                                  รวม
                                </td>
                                <td className="border border-black py-1 px-2 text-center font-bold">
                                  {projectsInCat.length} โครงการ
                                </td>
                                <td className="border border-black py-1 px-1"></td>
                                <td className="border border-black py-1 px-1 text-center font-bold">
                                  {subtotal.toLocaleString()}
                                </td>
                                <td className="border border-black py-1 px-1"></td>
                                <td className="border border-black py-1 px-1"></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>

                  {/* Grand Total Row matching R57 in sheet1.xml */}
                  <div className="pt-3 flex items-center gap-12 font-bold text-black" style={{ fontSize: '16pt' }}>
                    <span>รวมทั้งหมด {summaryProjects.length} โครงการ</span>
                    <span>{totalSummaryBudget.toLocaleString()} บาท</span>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* MODE 3: ATTACHMENT 2 TRACKING TABLE (100% COLOR-CODED REPLICA) */}
            {/* ============================================================== */}
            {printMode === 'tracking_attachment2' && (
              <div className="nhso-print-canvas max-w-[1140px] mx-auto">
                <div className="nhso-screen-badge print:hidden flex flex-wrap items-center justify-between gap-3 mb-3.5 px-1 text-slate-200 font-sans text-sm sm:text-base">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-bold flex items-center gap-2 bg-emerald-500/20 text-emerald-300 px-4 py-1.5 rounded-xl border border-emerald-500/40 shadow-sm text-sm sm:text-base">
                      🎨 แบบสรุปโครงการและผลการติดตาม (เอกสารแนบ 2 - แยกสีประเภท & หน่วยงาน)
                    </span>
                    <span className="text-slate-200 font-semibold text-sm sm:text-base">
                      รวม {summaryProjects.length} โครงการ • งบประมาณรวม {totalSummaryBudget.toLocaleString()} บาท • ดำเนินการแล้ว {grandTotalCompleted} • ขอขยายเวลา {grandTotalExtended} • ไม่ได้ดำเนินการ {grandTotalNotExecuted}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-300 text-xs sm:text-sm font-semibold">
                    {onToggleTracking && (
                      <span className="px-3 py-1 rounded-lg bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 font-bold">
                        💡 คลิกที่ช่องติ๊ก ☑ ในตารางเพื่อสลับสถานะได้ทันที
                      </span>
                    )}
                    <span className="px-3 py-1 rounded-lg bg-slate-800/95 border border-slate-700">
                      A4 Landscape
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-slate-800/95 border border-slate-700">
                      TH Sarabun PSK 16pt
                    </span>
                  </div>
                </div>

                <div
                  className="nhso-page nhso-summary-page bg-white text-black p-6 sm:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.45)] rounded-md border border-slate-200/80 print:border-none print:shadow-none print:p-0 print:m-0 w-full space-y-3"
                  style={{
                    fontFamily: "'TH Sarabun PSK', 'TH Sarabun New', 'Sarabun', sans-serif",
                  }}
                >
                  {/* Peach Top Header Banner matching เอกสารแนบ 2 */}
                  <div
                    className="w-full py-2 px-4 text-center space-y-0.5"
                    style={{ backgroundColor: '#fce4d6' }}
                  >
                    <h1 className="font-bold text-black leading-snug" style={{ fontSize: '16.5pt' }}>
                      สรุปโครงการที่ขอรับการสนับสนุนงบประมาณจากกองทุนหลักประกันสุขภาพเทศบาลตำบลบางเป้า &nbsp;&nbsp;(เอกสารแนบ 2)
                    </h1>
                    <p className="font-bold text-black leading-snug" style={{ fontSize: '16pt' }}>
                      ประจำปีงบประมาณ {targetYear}
                    </p>
                  </div>

                  <div className="font-bold text-black pt-1" style={{ fontSize: '15pt' }}>
                    จำนวน {summaryProjects.length} โครงการ
                  </div>

                  {/* Color-coded Category Sections */}
                  <div className="space-y-5">
                    {Object.entries(groupedByCategory).map(([catNumStr, projectsInCat]) => {
                      const cNum = Number(catNumStr);
                      const catTheme = getCategoryColorTheme(cNum);
                      const subtotal = projectsInCat.reduce((s, p) => s + p.budgetRequested, 0);
                      const compCount = projectsInCat.filter((p) => isProjectTrackingCompleted(p)).length;
                      const extCount = projectsInCat.filter((p) => isProjectTrackingExtended(p)).length;
                      const refCount = projectsInCat.filter((p) => isProjectTrackingRefunded(p)).length;

                      return (
                        <div key={cNum} className="space-y-2">
                          {/* Category Colored Title Bar (spanning left ~62% width like เอกสารแนบ 2) */}
                          <div
                            className="inline-block min-w-[62%] py-1 px-2.5 font-bold text-black"
                            style={{
                              backgroundColor: catTheme.headerHex,
                              fontSize: '15pt',
                            }}
                          >
                            ประเภทที่ {cNum} &nbsp;&nbsp;&nbsp;&nbsp; จำนวน &nbsp;{projectsInCat.length}&nbsp; โครงการ
                          </div>

                          <table
                            className="w-full border-collapse border border-black text-black"
                            style={{ tableLayout: 'fixed', fontSize: '14.5pt', lineHeight: 1.18 }}
                          >
                            <colgroup>
                              <col style={{ width: '5.5%' }} />
                              <col style={{ width: '44.5%' }} />
                              <col style={{ width: '14.5%' }} />
                              <col style={{ width: '8.5%' }} />
                              <col style={{ width: '9.0%' }} />
                              <col style={{ width: '9.0%' }} />
                              <col style={{ width: '9.0%' }} />
                            </colgroup>
                            <thead>
                              <tr
                                className="text-black font-bold text-center"
                                style={{
                                  backgroundColor: catTheme.headerHex,
                                  fontSize: '14.5pt',
                                }}
                              >
                                <th rowSpan={2} className="border border-black py-1 px-1 align-middle">
                                  ลำดับที่
                                </th>
                                <th rowSpan={2} className="border border-black py-1 px-2 text-center align-middle">
                                  ชื่อโครงการ
                                </th>
                                <th rowSpan={2} className="border border-black py-1 px-1 text-center align-middle">
                                  ผู้ขอรับงบ
                                </th>
                                <th rowSpan={2} className="border border-black py-1 px-1 text-center align-middle leading-tight">
                                  งบประมาณ<br />(บาท)
                                </th>
                                <th colSpan={3} className="border border-black py-1 px-1 text-center align-middle">
                                  ผลการติดตามโครงการ
                                </th>
                              </tr>
                              <tr
                                className="text-center font-bold text-black"
                                style={{
                                  backgroundColor: catTheme.headerHex,
                                  fontSize: '14pt',
                                }}
                              >
                                <th className="border border-black py-0.5 px-1">ดำเนินการแล้ว</th>
                                <th className="border border-black py-0.5 px-1">ขอขยายเวลา</th>
                                <th className="border border-black py-0.5 px-1">คืนเงิน</th>
                              </tr>
                            </thead>
                            <tbody>
                              {projectsInCat.map((p, idx) => {
                                const orgTheme = getOrgColorTheme(p.proposingOrg);
                                const isComp = isProjectTrackingCompleted(p);
                                const isExt = isProjectTrackingExtended(p);
                                const isRef = isProjectTrackingRefunded(p);

                                return (
                                  <tr key={p.id} className="bg-white">
                                    <td className="border border-black py-1 px-1 text-center align-middle">
                                      {p.orderNumber || idx + 1}
                                    </td>
                                    <td className="border border-black py-1 px-2 text-black whitespace-pre-line align-middle">
                                      {p.projectName}
                                    </td>
                                    <td
                                      className="border border-black py-1 px-2 text-left text-black align-middle"
                                      style={{ backgroundColor: orgTheme.bgHex }}
                                    >
                                      {p.proposingOrg}
                                    </td>
                                    <td className="border border-black py-1 px-2 text-right text-black align-middle">
                                      {p.budgetRequested.toLocaleString()}
                                    </td>

                                    {/* 1. ดำเนินการแล้ว */}
                                    <td
                                      onClick={() =>
                                        onToggleTracking && onToggleTracking(p.id, 'trackingCompleted')
                                      }
                                      className={`border border-black py-1 px-1 text-center align-middle ${
                                        onToggleTracking ? 'cursor-pointer hover:bg-slate-100 print:hover:bg-transparent' : ''
                                      }`}
                                      title={onToggleTracking ? 'คลิกเพื่อติ๊ก/ยกเลิก "ดำเนินการแล้ว"' : ''}
                                    >
                                      {isComp ? (
                                        <span className="inline-flex items-center justify-center w-[18px] h-[18px] bg-[#1e1b18] text-white rounded-[3px] text-[12px] font-bold leading-none shadow-2xs">
                                          ✓
                                        </span>
                                      ) : null}
                                    </td>

                                    {/* 2. ขอขยายเวลา */}
                                    <td
                                      onClick={() =>
                                        onToggleTracking && onToggleTracking(p.id, 'trackingExtended')
                                      }
                                      className={`border border-black py-1 px-1 text-center align-middle ${
                                        onToggleTracking ? 'cursor-pointer hover:bg-slate-100 print:hover:bg-transparent' : ''
                                      }`}
                                      title={onToggleTracking ? 'คลิกเพื่อติ๊ก/ยกเลิก "ขอขยายเวลา"' : ''}
                                    >
                                      {isExt ? (
                                        <span className="inline-flex items-center justify-center w-[18px] h-[18px] bg-[#1e1b18] text-white rounded-[3px] text-[12px] font-bold leading-none shadow-2xs">
                                          ✓
                                        </span>
                                      ) : null}
                                    </td>

                                    {/* 3. คืนเงิน */}
                                    <td
                                      onClick={() =>
                                        onToggleTracking && onToggleTracking(p.id, 'trackingRefunded')
                                      }
                                      className={`border border-black py-1 px-1 text-center align-middle ${
                                        onToggleTracking ? 'cursor-pointer hover:bg-slate-100 print:hover:bg-transparent' : ''
                                      }`}
                                      title={onToggleTracking ? 'คลิกเพื่อติ๊ก/ยกเลิก "คืนเงิน"' : ''}
                                    >
                                      {isRef ? (
                                        <span className="inline-flex items-center justify-center w-[18px] h-[18px] bg-[#1e1b18] text-white rounded-[3px] text-[12px] font-bold leading-none shadow-2xs">
                                          ✓
                                        </span>
                                      ) : null}
                                    </td>
                                  </tr>
                                );
                              })}

                              {/* Category Colored Subtotal Row */}
                              <tr
                                className="font-bold text-black"
                                style={{
                                  backgroundColor: catTheme.headerHex,
                                  fontSize: '14.5pt',
                                }}
                              >
                                <td className="border border-black py-1 px-1 text-center font-bold">
                                  รวม
                                </td>
                                <td className="border border-black py-1 px-2 text-center font-bold">
                                  {projectsInCat.length} โครงการ
                                </td>
                                <td className="border border-black py-1 px-1"></td>
                                <td className="border border-black py-1 px-2 text-right font-bold">
                                  {subtotal.toLocaleString()}
                                </td>
                                <td className="border border-black py-1 px-1 text-center font-bold">
                                  {compCount > 0 ? compCount : '-'}
                                </td>
                                <td className="border border-black py-1 px-1 text-center font-bold">
                                  {extCount > 0 ? extCount : '-'}
                                </td>
                                <td className="border border-black py-1 px-1 text-center font-bold">
                                  {refCount > 0 ? `${refCount} โครงการ` : '-'}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bottom Grand Total Summary Table (Royal Blue #4472c4 & Green #70ad47) */}
                  <div className="pt-2">
                    <table
                      className="w-full border-collapse border border-black"
                      style={{ tableLayout: 'fixed', fontSize: '14.5pt', lineHeight: 1.2 }}
                    >
                      <colgroup>
                        <col style={{ width: '5.5%' }} />
                        <col style={{ width: '44.5%' }} />
                        <col style={{ width: '14.5%' }} />
                        <col style={{ width: '8.5%' }} />
                        <col style={{ width: '9.0%' }} />
                        <col style={{ width: '9.0%' }} />
                        <col style={{ width: '9.0%' }} />
                      </colgroup>
                      <tbody>
                        <tr
                          className="font-bold text-white text-center"
                          style={{ backgroundColor: '#4472c4' }}
                        >
                          <td rowSpan={2} className="border border-black py-1.5 px-1 align-middle leading-tight">
                            รวมทั้งหมด
                          </td>
                          <td className="border border-black py-1 px-2 align-middle">
                            จำนวนโครงการ
                          </td>
                          <td className="border border-black py-1 px-1 align-middle"></td>
                          <td className="border border-black py-1 px-1 align-middle">
                            งบประมาณ
                          </td>
                          <td className="border border-black py-1 px-1 align-middle">
                            ดำเนินการแล้ว
                          </td>
                          <td className="border border-black py-1 px-1 align-middle">
                            ขอขยายเวลา
                          </td>
                          <td className="border border-black py-1 px-1 align-middle">
                            ไม่ได้ดำเนินการ
                          </td>
                        </tr>
                        <tr
                          className="font-bold text-white text-center"
                          style={{ backgroundColor: '#70ad47' }}
                        >
                          <td className="border border-black py-1 px-2 align-middle">
                            {summaryProjects.length} โครงการ
                          </td>
                          <td className="border border-black py-1 px-1 align-middle"></td>
                          <td className="border border-black py-1 px-2 text-right align-middle">
                            {totalSummaryBudget.toLocaleString()}
                          </td>
                          <td className="border border-black py-1 px-1 align-middle">
                            {grandTotalCompleted}
                          </td>
                          <td className="border border-black py-1 px-1 align-middle">
                            {grandTotalExtended}
                          </td>
                          <td className="border border-black py-1 px-1 align-middle">
                            {grandTotalNotExecuted}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,700&display=swap');

        @font-face {
          font-family: 'TH Sarabun PSK';
          src: local('TH SarabunPSK'), local('TH Sarabun PSK'), local('THSarabunPSK'), local('TH Sarabun New'), local('THSarabunNew');
          font-weight: normal;
          font-style: normal;
        }
        @font-face {
          font-family: 'TH Sarabun PSK';
          src: local('TH SarabunPSK Bold'), local('TH Sarabun PSK Bold'), local('THSarabunPSK-Bold'), local('TH Sarabun New Bold'), local('THSarabunNew-Bold');
          font-weight: bold;
          font-style: normal;
        }

        .nhso-page,
        .nhso-page * {
          font-family: 'TH SarabunPSK', 'TH Sarabun PSK', 'TH Sarabun New', 'Sarabun', sans-serif !important;
        }

        @media print {
          @page {
            size: A4 landscape;
            margin: 5mm 6mm;
          }

          html, body {
            width: 100% !important;
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            font-family: 'TH Sarabun PSK', 'TH Sarabun New', 'Sarabun', sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Completely hide the main application and all background elements */
          #root {
            display: none !important;
          }

          /* Only show the print portal */
          #nhso-print-portal {
            display: block !important;
            position: static !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            overflow: visible !important;
          }

          .nhso-modal-overlay {
            position: static !important;
            display: block !important;
            overflow: visible !important;
            height: auto !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
          }

          .nhso-modal-card {
            position: static !important;
            display: block !important;
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
            border-radius: 0 !important;
          }

          .nhso-modal-scroll {
            position: static !important;
            display: block !important;
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
          }

          .nhso-screen-sheet-wrapper {
            margin-bottom: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }

          .nhso-screen-badge,
          .print\\:hidden {
            display: none !important;
          }

          .nhso-print-canvas {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            min-height: 0 !important;
            height: auto !important;
            font-family: 'TH Sarabun PSK', 'TH Sarabun New', 'Sarabun', sans-serif !important;
          }

          .nhso-page {
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-height: 198mm !important;
            box-sizing: border-box !important;
            min-height: 0 !important;
            height: auto !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
          }

          .nhso-summary-page {
            page-break-inside: auto !important;
            break-inside: auto !important;
          }

          .nhso-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }

          .nhso-page table,
          .nhso-page th,
          .nhso-page td {
            border: 1px solid #000000 !important;
          }

          .nhso-signature-block {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );

  return createPortal(modalContent, document.body);
};
