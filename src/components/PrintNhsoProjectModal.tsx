import React, { useState } from 'react';
import {
  X,
  Printer,
  FileText,
  Table,
  FileSpreadsheet,
  Download,
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

  // Only show sub-activity header row if project has multiple activities
  const isMultiActivity = rawGroups.length > 1;
  const activityGroups = rawGroups.map((g) => {
    const validLines = (g.budgetLines || []).filter(
      (l) => Boolean(l.name?.trim()) || (l.total && l.total > 0)
    );
    return {
      ...g,
      budgetLines: validLines,
      showHeaderRow: isMultiActivity && Boolean(g.activityName?.trim()),
    };
  });

  // Calculate total table rows for rowSpan
  let totalProjectRows = 0;
  activityGroups.forEach((g) => {
    const linesCount = g.budgetLines.length > 0 ? g.budgetLines.length : 1;
    totalProjectRows += (g.showHeaderRow ? 1 : 0) + linesCount;
  });

  const categoryNum = currentProject?.categoryNumber || 1;
  const categoryTitle = getOfficialCategoryHeader(categoryNum, currentProject?.categoryName);

  // Generate HTML for Word / Excel export
  const generateExportHtml = (isExcel = false) => {
    const isSingle = printMode === 'single';

    if (isSingle) {
      const catHeader = getOfficialCategoryHeader(currentProject.categoryNumber || 1, currentProject.categoryName);
      return `
        <div style="margin-bottom:12px;">
          <table style="width:100%; border:none; margin-bottom:8px;">
            <tr>
              <td style="border:none; vertical-align:top; width:75%;">
                <div style="font-size:15pt; font-weight:bold; font-family:'TH Sarabun New', sans-serif;">
                  ${catHeader}
                </div>
              </td>
              <td style="border:none; vertical-align:top; width:25%; text-align:right;">
                <div style="font-size:14pt; font-weight:bold; margin-bottom:4px; font-family:'TH Sarabun New', sans-serif;">
                  ${currentProject.orderNumber || 1}
                </div>
                <div style="border:1pt solid #1e3a8a; padding:4px 8px; display:inline-block; text-align:left;">
                  <b style="color:#1e3a8a; font-size:14pt;">สปสช.</b><br/>
                  <span style="font-size:8.5pt; color:#333;">สำนักงานหลักประกันสุขภาพแห่งชาติ</span>
                </div>
              </td>
            </tr>
          </table>
        </div>

        <table style="border-collapse:collapse; width:100%; font-size:12pt; font-family:'TH Sarabun New', sans-serif;">
          <thead>
            <tr style="text-align:center; font-weight:bold; background-color:${isExcel ? '#e2e8f0' : '#ffffff'};">
              <th rowspan="2" style="border:1pt solid #000; padding:6px 4px; width:12%; vertical-align:middle;">แผนงาน/โครงการ</th>
              <th rowspan="2" style="border:1pt solid #000; padding:6px 4px; width:13%; vertical-align:middle;">กิจกรรม</th>
              <th rowspan="2" style="border:1pt solid #000; padding:6px 4px; width:13%; vertical-align:middle;">วัตถุประสงค์</th>
              <th rowspan="2" style="border:1pt solid #000; padding:6px 4px; width:11%; vertical-align:middle;">กลุ่มเป้าหมาย</th>
              <th rowspan="2" style="border:1pt solid #000; padding:6px 4px; width:10%; vertical-align:middle;">ตัวชี้วัด (KPI)</th>
              <th rowspan="2" style="border:1pt solid #000; padding:6px 4px; width:7%; vertical-align:middle;">พื้นที่ดำเนินการ</th>
              <th rowspan="2" style="border:1pt solid #000; padding:6px 4px; width:6%; vertical-align:middle;">ระยะเวลา<br/>ดำเนินการ</th>
              <th colspan="5" style="border:1pt solid #000; padding:4px; width:20%; vertical-align:middle;">งบประมาณ</th>
              <th rowspan="2" style="border:1pt solid #000; padding:6px 4px; width:8%; vertical-align:middle;">ผู้รับผิดชอบ</th>
            </tr>
            <tr style="text-align:center; font-weight:bold; background-color:${isExcel ? '#e2e8f0' : '#ffffff'};">
              <th style="border:1pt solid #000; padding:3px 2px; font-size:10.5pt; width:9%;">รายการค่าใช้จ่าย</th>
              <th style="border:1pt solid #000; padding:3px 2px; font-size:10.5pt; width:2.5%;">จำนวน</th>
              <th style="border:1pt solid #000; padding:3px 2px; font-size:10.5pt; width:2.5%;">หน่วย</th>
              <th style="border:1pt solid #000; padding:3px 2px; font-size:10.5pt; width:3%;">ราคาต่อหน่วย</th>
              <th style="border:1pt solid #000; padding:3px 2px; font-size:10.5pt; width:3%;">รวมเงิน (บาท)</th>
            </tr>
          </thead>
          <tbody>
            ${activityGroups
              .map((group, gIdx) => {
                const hasHeader = group.showHeaderRow;
                const lines = group.budgetLines;
                const groupRowsCount = (hasHeader ? 1 : 0) + (lines.length > 0 ? lines.length : 1);
                let rowsHtml = '';

                // First row of this group
                rowsHtml += '<tr style="vertical-align:top;">';
                if (gIdx === 0) {
                  rowsHtml += `<td rowspan="${totalProjectRows}" style="border:1pt solid #000; padding:5px; font-weight:bold; vertical-align:top;">${escapeHtml(currentProject.projectName)}</td>`;
                }
                rowsHtml += `<td rowspan="${groupRowsCount}" style="border:1pt solid #000; padding:5px; vertical-align:top;">${escapeHtml(group.activities || '-')}</td>`;
                rowsHtml += `<td rowspan="${groupRowsCount}" style="border:1pt solid #000; padding:5px; vertical-align:top;">${escapeHtml(group.objectives || '-')}</td>`;
                rowsHtml += `<td rowspan="${groupRowsCount}" style="border:1pt solid #000; padding:5px; vertical-align:top;">${escapeHtml(group.targetGroup || '-')}</td>`;
                rowsHtml += `<td rowspan="${groupRowsCount}" style="border:1pt solid #000; padding:5px; vertical-align:top;">${escapeHtml(group.kpi || '-')}</td>`;
                rowsHtml += `<td rowspan="${groupRowsCount}" style="border:1pt solid #000; padding:5px; text-align:center; vertical-align:top;">${escapeHtml(group.location || '-')}</td>`;
                rowsHtml += `<td rowspan="${groupRowsCount}" style="border:1pt solid #000; padding:5px; text-align:center; vertical-align:top;">${escapeHtml(group.duration || '-')}</td>`;

                if (hasHeader) {
                  rowsHtml += `<td colspan="5" style="border:1pt solid #000; padding:5px; font-weight:bold; background-color:#fafafa;">${escapeHtml(group.activityName || '')}</td>`;
                } else if (lines.length > 0) {
                  rowsHtml += `<td style="border:1pt solid #000; padding:4px;">${escapeHtml(lines[0].name)}</td>`;
                  rowsHtml += `<td style="border:1pt solid #000; padding:4px; text-align:center;">${lines[0].quantity}</td>`;
                  rowsHtml += `<td style="border:1pt solid #000; padding:4px; text-align:center;">${escapeHtml(lines[0].unit)}</td>`;
                  rowsHtml += `<td style="border:1pt solid #000; padding:4px; text-align:right;">${(lines[0].unitPrice || 0).toLocaleString()}</td>`;
                  rowsHtml += `<td style="border:1pt solid #000; padding:4px; text-align:right;">${(lines[0].total || 0).toLocaleString()}</td>`;
                } else {
                  rowsHtml += `<td colspan="4" style="border:1pt solid #000; padding:4px;">-</td><td style="border:1pt solid #000; padding:4px; text-align:right;">0</td>`;
                }

                if (gIdx === 0) {
                  rowsHtml += `<td rowspan="${totalProjectRows}" style="border:1pt solid #000; padding:5px; text-align:center; vertical-align:top;">${escapeHtml(currentProject.responsiblePerson || currentProject.proposingOrg)}</td>`;
                }
                rowsHtml += '</tr>';

                // Subsequent budget lines
                lines.forEach((line, lIdx) => {
                  if (!hasHeader && lIdx === 0) return;
                  rowsHtml += `
                    <tr style="vertical-align:top;">
                      <td style="border:1pt solid #000; padding:4px;">${escapeHtml(line.name)}</td>
                      <td style="border:1pt solid #000; padding:4px; text-align:center;">${line.quantity}</td>
                      <td style="border:1pt solid #000; padding:4px; text-align:center;">${escapeHtml(line.unit)}</td>
                      <td style="border:1pt solid #000; padding:4px; text-align:right;">${(line.unitPrice || 0).toLocaleString()}</td>
                      <td style="border:1pt solid #000; padding:4px; text-align:right;">${(line.total || 0).toLocaleString()}</td>
                    </tr>
                  `;
                });
                return rowsHtml;
              })
              .join('')}
            <tr style="font-weight:bold; background-color:${isExcel ? '#f8fafc' : '#ffffff'};">
              <td colspan="7" style="border:1pt solid #000; padding:5px;"></td>
              <td colspan="4" style="border:1pt solid #000; padding:5px; text-align:center;">รวมเป็นเงินทั้งสิ้น (บาท)</td>
              <td style="border:1pt solid #000; padding:5px; text-align:right; font-weight:bold;">${currentProject.budgetRequested.toLocaleString()}</td>
              <td style="border:1pt solid #000; padding:5px;"></td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top:40px; width:100%;">
          <table style="width:100%; border:none; text-align:center; font-family:'TH Sarabun New', sans-serif; font-size:12pt;">
            <tr>
              <td style="border:none; width:33%; vertical-align:top; text-align:center; padding:10px;">
                ผู้เสนอ ................................................<br/>
                (${escapeHtml(currentProject.signers?.proposerName || '................................................')})<br/>
                ${escapeHtml(currentProject.signers?.proposerTitle || 'ผู้เสนอโครงการ')}
              </td>
              <td style="border:none; width:33%; vertical-align:top; text-align:center; padding:10px;">
                ผู้เห็นชอบ ................................................<br/>
                (${escapeHtml(currentProject.signers?.endorserName || settings.defaultEndorserName)})<br/>
                ${escapeHtml(currentProject.signers?.endorserTitle || settings.defaultEndorserTitle)}
              </td>
              <td style="border:none; width:33%; vertical-align:top; text-align:center; padding:10px;">
                ผู้อนุมัติ ................................................<br/>
                (${escapeHtml(currentProject.signers?.approverName || settings.defaultApproverName)})<br/>
                ${escapeHtml(currentProject.signers?.approverTitle || settings.defaultApproverTitle)}
              </td>
            </tr>
          </table>
        </div>
      `;
    }

    // Summary Mode
    return `
      <div style="text-align:center; margin-bottom:16px; font-family:'TH Sarabun New', sans-serif;">
        <h2 style="font-size:16pt; font-weight:bold; margin-bottom:4px;">
          แบบสรุปโครงการที่ขอรับการสนับสนุนงบประมาณกองทุนหลักประกันสุขภาพระดับท้องถิ่น เทศบาลตำบลบางเป้า
        </h2>
        <p style="font-size:13pt; font-weight:bold;">
          ครั้งที่ 1 ประจำปีงบประมาณ ${targetYear} • รวมทั้งสิ้น ${summaryProjects.length} โครงการ • งบประมาณรวม ${totalSummaryBudget.toLocaleString()} บาท
        </p>
      </div>

      <table style="border-collapse:collapse; width:100%; font-size:12pt; font-family:'TH Sarabun New', sans-serif;">
        <thead>
          <tr style="background-color:${isExcel ? '#e2e8f0' : '#f1f5f9'}; text-align:center; font-weight:bold;">
            <th rowspan="2" style="border:1pt solid #000; padding:6px; width:6%;">ลำดับที่</th>
            <th rowspan="2" style="border:1pt solid #000; padding:6px; text-align:left;">ชื่อโครงการ</th>
            <th rowspan="2" style="border:1pt solid #000; padding:6px; width:22%; text-align:left;">ผู้ขอรับงบ</th>
            <th rowspan="2" style="border:1pt solid #000; padding:6px; width:14%; text-align:right;">งบประมาณ (บาท)</th>
            <th colspan="2" style="border:1pt solid #000; padding:6px; width:20%;">ความเห็นกรรมการฯ</th>
          </tr>
          <tr style="text-align:center; font-weight:bold; background-color:${isExcel ? '#e2e8f0' : '#f1f5f9'};">
            <th style="border:1pt solid #000; padding:4px;">อนุมัติ</th>
            <th style="border:1pt solid #000; padding:4px;">ไม่อนุมัติ</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(groupedByCategory)
            .map(([catNumStr, projectsInCat]) => {
              const cNum = Number(catNumStr);
              const cInfo = NHSO_FUND_CATEGORIES.find((c) => c.number === cNum);
              const subtotal = projectsInCat.reduce((s, p) => s + p.budgetRequested, 0);
              return `
                <tr style="background-color:#f8fafc; font-weight:bold;">
                  <td colspan="6" style="border:1pt solid #000; padding:6px;">
                    ${getOfficialCategoryHeader(cNum, cInfo?.title)} (${projectsInCat.length} โครงการ)
                  </td>
                </tr>
                ${projectsInCat
                  .map(
                    (p, idx) => `
                  <tr>
                    <td style="border:1pt solid #000; padding:5px; text-align:center;">${p.orderNumber || idx + 1}</td>
                    <td style="border:1pt solid #000; padding:5px;">${escapeHtml(p.projectName)}</td>
                    <td style="border:1pt solid #000; padding:5px;">${escapeHtml(p.proposingOrg)}</td>
                    <td style="border:1pt solid #000; padding:5px; text-align:right;">${p.budgetRequested.toLocaleString()}</td>
                    <td style="border:1pt solid #000; padding:5px; text-align:center; font-weight:bold;">
                      ${p.status === 'approved' || p.committeeDecision === 'approve' ? '✓ อนุมัติ' : ''}
                    </td>
                    <td style="border:1pt solid #000; padding:5px; text-align:center; font-weight:bold; color:red;">
                      ${p.status === 'rejected' || p.committeeDecision === 'reject' ? '✗ ไม่อนุมัติ' : ''}
                    </td>
                  </tr>
                `
                  )
                  .join('')}
                <tr style="font-weight:bold;">
                  <td colspan="3" style="border:1pt solid #000; padding:5px; text-align:right;">
                    รวมประเภทที่ ${cNum} (${projectsInCat.length} โครงการ):
                  </td>
                  <td style="border:1pt solid #000; padding:5px; text-align:right;">${subtotal.toLocaleString()}</td>
                  <td colspan="2" style="border:1pt solid #000; padding:5px; text-align:center;">บาท</td>
                </tr>
              `;
            })
            .join('')}
          <tr style="background-color:${isExcel ? '#e2e8f0' : '#f1f5f9'}; font-weight:bold;">
            <td colspan="3" style="border:1pt solid #000; padding:6px; text-align:right;">
              รวมทั้งหมด (${summaryProjects.length} โครงการ):
            </td>
            <td style="border:1pt solid #000; padding:6px; text-align:right; font-size:13pt;">
              ${totalSummaryBudget.toLocaleString()}
            </td>
            <td colspan="2" style="border:1pt solid #000; padding:6px; text-align:center;">บาทถ้วน</td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top:35px; width:100%;">
        <table style="width:100%; border:none; text-align:center; font-family:'TH Sarabun New', sans-serif; font-size:12pt;">
          <tr>
            <td style="border:none; width:50%; vertical-align:top; text-align:center; padding:10px;">
              (ลงชื่อ) ................................................................ ผู้ตรวจสอบ<br/>
              (${escapeHtml(settings.defaultEndorserName)})<br/>
              ${escapeHtml(settings.defaultEndorserTitle)}
            </td>
            <td style="border:none; width:50%; vertical-align:top; text-align:center; padding:10px;">
              (ลงชื่อ) ................................................................ ประธานกรรมการ<br/>
              (${escapeHtml(settings.defaultApproverName)})<br/>
              ${escapeHtml(settings.defaultApproverTitle)}
            </td>
          </tr>
        </table>
      </div>
    `;
  };

  // Export to Microsoft Word (.doc)
  const handleExportWord = () => {
    const isSingle = printMode === 'single';
    const filename = isSingle
      ? `${currentProject.orderNumber || 1}_${(currentProject.projectName || 'โครงการ_สปสช').replace(/[\\/:*?"<>|]/g, '_')}.doc`
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
            margin: 1.5cm 1.5cm 1.5cm 1.5cm;
          }
          div.Section1 { page: Section1; }
          body { font-family: 'TH Sarabun New', 'Angsana New', sans-serif; font-size: 14pt; }
          table { border-collapse: collapse; width: 100%; }
          th, td { font-family: 'TH Sarabun New', 'Angsana New', sans-serif; }
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

  // Export to Microsoft Excel (.xls)
  const handleExportExcel = () => {
    const isSingle = printMode === 'single';
    const filename = isSingle
      ? `${currentProject.orderNumber || 1}_${(currentProject.projectName || 'โครงการ_สปสช').replace(/[\\/:*?"<>|]/g, '_')}.xls`
      : `แบบสรุปภาพรวม_สปสช_${targetYear}.xls`;

    const htmlBody = generateExportHtml(true);
    const excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>${isSingle ? 'แบบเสนอโครงการ' : 'สรุปภาพรวม'}</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                  <x:Orientation>Landscape</x:Orientation>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          table { border-collapse: collapse; }
          th, td { border: 0.5pt solid black; font-family: 'TH Sarabun New', sans-serif; font-size: 11pt; vertical-align: top; }
          th { font-weight: bold; background-color: #f2f2f2; text-align: center; }
        </style>
      </head>
      <body>
        ${htmlBody}
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      {/* Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-[1240px] max-h-[96vh] flex flex-col overflow-hidden">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold flex items-center gap-2">
                ตัวอย่างก่อนพิมพ์ & ส่งออกเอกสาร (A4 แนวนอน)
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-normal">
                  แม่แบบทางการ สปสช.
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                รองรับการพิมพ์ PDF, ส่งออก Word (.doc) และ Excel (.xls) ตามฟอร์ม 13 คอลัมน์
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Mode Switch */}
            <div className="flex bg-slate-800 rounded-xl p-1 border border-slate-700">
              {project && (
                <button
                  type="button"
                  onClick={() => setPrintMode('single')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
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
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  printMode === 'summary'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                แบบสรุปภาพรวมเสนอ กก.
              </button>
            </div>

            {/* Export Word */}
            <button
              onClick={handleExportWord}
              type="button"
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow transition-colors cursor-pointer"
              title="ส่งออกไฟล์ Word (.doc) นำไปเปิดแก้ไขได้ทันที"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>ส่งออก Word</span>
            </button>

            {/* Export Excel */}
            <button
              onClick={handleExportExcel}
              type="button"
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow transition-colors cursor-pointer"
              title="ส่งออกไฟล์ Excel (.xls) ตารางคำนวณ 13 ช่อง"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>ส่งออก Excel</span>
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              type="button"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow transition-transform hover:scale-105 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์ / บันทึก PDF</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              type="button"
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
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
                  <div className="max-w-[78%] pt-2">
                    <h2 className="text-[13px] font-bold text-black leading-snug">
                      {categoryTitle}
                    </h2>
                  </div>

                  {/* Right: Page number & NHSO Logo Box */}
                  <div className="flex flex-col items-end">
                    <span className="text-[11px] font-bold text-black pr-1 mb-1">
                      {currentProject.orderNumber || 1}
                    </span>
                    <div className="border border-black px-2.5 py-1 bg-white flex items-center gap-2 rounded shadow-none w-44 h-11">
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

                {/* 13-Column Table Grid (Exact Official Structure with rowspan=2 on row 1) */}
                <div className="w-full">
                  <table className="w-full border-collapse border border-black text-[10.5px] leading-snug">
                    <thead>
                      <tr className="text-center font-bold text-black bg-white">
                        <th rowSpan={2} className="border border-black p-1 w-[12%] align-middle font-bold">
                          แผนงาน/โครงการ
                        </th>
                        <th rowSpan={2} className="border border-black p-1 w-[13%] align-middle font-bold">
                          กิจกรรม
                        </th>
                        <th rowSpan={2} className="border border-black p-1 w-[13%] align-middle font-bold">
                          วัตถุประสงค์
                        </th>
                        <th rowSpan={2} className="border border-black p-1 w-[11%] align-middle font-bold">
                          กลุ่มเป้าหมาย
                        </th>
                        <th rowSpan={2} className="border border-black p-1 w-[10%] align-middle font-bold">
                          ตัวชี้วัด (KPI)
                        </th>
                        <th rowSpan={2} className="border border-black p-1 w-[7%] align-middle font-bold">
                          พื้นที่ดำเนินการ
                        </th>
                        <th rowSpan={2} className="border border-black p-1 w-[6%] align-middle font-bold">
                          ระยะเวลา<br />ดำเนินการ
                        </th>
                        <th colSpan={5} className="border border-black p-1 w-[20%] align-middle font-bold">
                          งบประมาณ
                        </th>
                        <th rowSpan={2} className="border border-black p-1 w-[8%] align-middle font-bold">
                          ผู้รับผิดชอบ
                        </th>
                      </tr>
                      <tr className="text-center font-bold text-black bg-white">
                        <th className="border border-black p-0.5 text-[9.5px] w-[9%]">รายการค่าใช้จ่าย</th>
                        <th className="border border-black p-0.5 text-[9.5px] w-[2.5%]">จำนวน</th>
                        <th className="border border-black p-0.5 text-[9.5px] w-[2.5%]">หน่วย</th>
                        <th className="border border-black p-0.5 text-[9.5px] w-[3%]">ราคาต่อหน่วย</th>
                        <th className="border border-black p-0.5 text-[9.5px] w-[3%]">รวมเงิน (บาท)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activityGroups.map((group, gIdx) => {
                        const hasHeaderRow = group.showHeaderRow;
                        const lines = group.budgetLines;
                        const groupRowsCount = (hasHeaderRow ? 1 : 0) + (lines.length > 0 ? lines.length : 1);

                        return (
                          <React.Fragment key={group.id || gIdx}>
                            {/* First row of this activity group */}
                            <tr className="align-top">
                              {/* Project Name (Only on very first row of the table, spans all groups) */}
                              {gIdx === 0 && (
                                <td
                                  rowSpan={totalProjectRows}
                                  className="border border-black p-1.5 font-bold text-black whitespace-pre-line align-top"
                                >
                                  {currentProject.projectName}
                                </td>
                              )}

                              {/* Activity Description */}
                              <td
                                rowSpan={groupRowsCount}
                                className="border border-black p-1.5 whitespace-pre-line text-black align-top"
                              >
                                {group.activities || '-'}
                              </td>

                              {/* Objectives */}
                              <td
                                rowSpan={groupRowsCount}
                                className="border border-black p-1.5 whitespace-pre-line text-black align-top"
                              >
                                {group.objectives || '-'}
                              </td>

                              {/* Target Group */}
                              <td
                                rowSpan={groupRowsCount}
                                className="border border-black p-1.5 whitespace-pre-line text-black align-top"
                              >
                                {group.targetGroup || '-'}
                              </td>

                              {/* KPI */}
                              <td
                                rowSpan={groupRowsCount}
                                className="border border-black p-1.5 whitespace-pre-line text-black align-top"
                              >
                                {group.kpi || '-'}
                              </td>

                              {/* Location */}
                              <td
                                rowSpan={groupRowsCount}
                                className="border border-black p-1 text-center whitespace-pre-line text-black align-top"
                              >
                                {group.location || '-'}
                              </td>

                              {/* Duration */}
                              <td
                                rowSpan={groupRowsCount}
                                className="border border-black p-1 text-center whitespace-pre-line text-black align-top"
                              >
                                {group.duration || '-'}
                              </td>

                              {/* Budget Header or First Line */}
                              {hasHeaderRow ? (
                                <td
                                  className="border border-black p-1 font-bold text-black bg-slate-50"
                                  colSpan={5}
                                >
                                  {group.activityName}
                                </td>
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
                              // If there was no header row, index 0 was already rendered on the row above
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

                      {/* Total Row (Directly below data with NO empty rows) */}
                      <tr className="font-bold text-black bg-white">
                        <td colSpan={7} className="border border-black p-1.5 text-center"></td>
                        <td colSpan={4} className="border border-black p-1.5 text-center font-bold">
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

                {/* 3-Signer Signature Block Matching Official Layout Exactly */}
                <div className="pt-10 pb-4 grid grid-cols-3 gap-6 text-center text-[11px] text-black">
                  {/* Proposer */}
                  <div className="space-y-1.5">
                    <div>
                      ผู้เสนอ ................................................
                    </div>
                    <div className="font-medium">
                      ({currentProject.signers?.proposerName || '................................................'})
                    </div>
                    <div className="text-[10.5px] text-slate-800">
                      {currentProject.signers?.proposerTitle || 'ผู้เสนอโครงการ'}
                    </div>
                  </div>

                  {/* Endorser */}
                  <div className="space-y-1.5">
                    <div>
                      ผู้เห็นชอบ ................................................
                    </div>
                    <div className="font-medium">
                      ({currentProject.signers?.endorserName || settings.defaultEndorserName})
                    </div>
                    <div className="text-[10.5px] text-slate-800">
                      {currentProject.signers?.endorserTitle || settings.defaultEndorserTitle}
                    </div>
                  </div>

                  {/* Approver */}
                  <div className="space-y-1.5">
                    <div>
                      ผู้อนุมัติ ................................................
                    </div>
                    <div className="font-medium">
                      ({currentProject.signers?.approverName || settings.defaultApproverName})
                    </div>
                    <div className="text-[10.5px] text-slate-800">
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

                {/* Summary Table (rowspan=2 on row 1, no dash row) */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-black text-[10px]">
                    <thead>
                      <tr className="bg-slate-100 text-black font-bold text-center">
                        <th rowSpan={2} className="border border-black p-1.5 w-12 align-middle">ลำดับที่</th>
                        <th rowSpan={2} className="border border-black p-1.5 text-left align-middle">ชื่อโครงการ</th>
                        <th rowSpan={2} className="border border-black p-1.5 w-44 text-left align-middle">ผู้ขอรับงบ</th>
                        <th rowSpan={2} className="border border-black p-1.5 w-28 text-right align-middle">งบประมาณ (บาท)</th>
                        <th colSpan={2} className="border border-black p-1.5 w-44 text-center align-middle">
                          ความเห็นกรรมการฯ
                        </th>
                      </tr>
                      <tr className="bg-slate-100 text-[9.5px] text-center font-bold">
                        <th className="border border-black p-1 w-22">อนุมัติ</th>
                        <th className="border border-black p-1 w-22">ไม่อนุมัติ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(groupedByCategory).map(([catNumStr, projectsInCat]) => {
                        const cNum = Number(catNumStr);
                        const cInfo = NHSO_FUND_CATEGORIES.find((c) => c.number === cNum);
                        const subtotal = projectsInCat.reduce((s, p) => s + p.budgetRequested, 0);

                        return (
                          <React.Fragment key={cNum}>
                            <tr className="bg-slate-50 font-bold text-black">
                              <td colSpan={6} className="border border-black px-2 py-1.5 text-[11px]">
                                {getOfficialCategoryHeader(cNum, cInfo?.title)} ({projectsInCat.length} โครงการ)
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
                                <td className="border border-black p-1.5 text-center font-bold text-emerald-700">
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
                            <tr className="font-bold text-black text-[10px] bg-slate-50/50">
                              <td colSpan={3} className="border border-black p-1 text-right">
                                รวมประเภทที่ {cNum} ({projectsInCat.length} โครงการ):
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
                <div className="pt-8 grid grid-cols-2 gap-16 text-center text-[11px] text-black">
                  <div className="space-y-1.5">
                    <div>(ลงชื่อ) ................................................................ ผู้ตรวจสอบ</div>
                    <div className="font-medium">({settings.defaultEndorserName})</div>
                    <div className="text-[10px] text-slate-700">{settings.defaultEndorserTitle}</div>
                  </div>
                  <div className="space-y-1.5">
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
            margin: 6mm 8mm;
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
