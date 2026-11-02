import React, { useState } from 'react';
import {
  X,
  Printer,
  FileText,
  Table,
  FileSpreadsheet,
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
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      return `
        <div style="margin-bottom:10px;">
          <table style="width:100%; border:none; margin-bottom:6px;">
            <tr>
              <td style="border:none; vertical-align:top; width:75%;">
                <div style="font-size:16pt; font-weight:bold; font-family:'TH Sarabun PSK', 'TH Sarabun New', sans-serif;">
                  ${catHeader}
                </div>
              </td>
              <td style="border:none; vertical-align:top; width:25%; text-align:right;">
                <div style="font-size:16pt; font-weight:bold; margin-bottom:4px; font-family:'TH Sarabun PSK', 'TH Sarabun New', sans-serif;">
                  ${currentProject.orderNumber || 1}
                </div>
                <div style="border:1pt solid #000; padding:2px; display:inline-block; background-color:#fff;">
                  <img src="${origin}/Logo_NHSO_MASTER_Thai_2.jpg" style="height:48px; max-width:180px; object-fit:contain;" alt="สปสช." />
                </div>
              </td>
            </tr>
          </table>
        </div>

        <table style="border-collapse:collapse; width:100%; font-size:14.5pt; font-family:'TH Sarabun PSK', 'TH Sarabun New', sans-serif;">
          <thead>
            <tr style="text-align:center; font-weight:bold; font-size:15pt; background-color:${isExcel ? '#e2e8f0' : '#ffffff'};">
              <th rowspan="2" style="border:1pt solid #000; padding:5px 3px; width:12%; vertical-align:middle;">แผนงาน/โครงการ</th>
              <th rowspan="2" style="border:1pt solid #000; padding:5px 3px; width:13%; vertical-align:middle;">กิจกรรม</th>
              <th rowspan="2" style="border:1pt solid #000; padding:5px 3px; width:13%; vertical-align:middle;">วัตถุประสงค์</th>
              <th rowspan="2" style="border:1pt solid #000; padding:5px 3px; width:11%; vertical-align:middle;">กลุ่มเป้าหมาย</th>
              <th rowspan="2" style="border:1pt solid #000; padding:5px 3px; width:10%; vertical-align:middle;">ตัวชี้วัด (KPI)</th>
              <th rowspan="2" style="border:1pt solid #000; padding:5px 3px; width:7%; vertical-align:middle;">พื้นที่ดำเนินการ</th>
              <th rowspan="2" style="border:1pt solid #000; padding:5px 3px; width:6%; vertical-align:middle;">ระยะเวลา<br/>ดำเนินการ</th>
              <th colspan="5" style="border:1pt solid #000; padding:4px; width:20%; vertical-align:middle;">งบประมาณ</th>
              <th rowspan="2" style="border:1pt solid #000; padding:5px 3px; width:8%; vertical-align:middle;">ผู้รับผิดชอบ</th>
            </tr>
            <tr style="text-align:center; font-weight:bold; font-size:14pt; background-color:${isExcel ? '#e2e8f0' : '#ffffff'};">
              <th style="border:1pt solid #000; padding:3px 2px; width:9%;">รายการค่าใช้จ่าย</th>
              <th style="border:1pt solid #000; padding:3px 2px; width:2.5%;">จำนวน</th>
              <th style="border:1pt solid #000; padding:3px 2px; width:2.5%;">หน่วย</th>
              <th style="border:1pt solid #000; padding:3px 2px; width:3%;">ราคาต่อหน่วย</th>
              <th style="border:1pt solid #000; padding:3px 2px; width:3%;">รวมเงิน (บาท)</th>
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
                  rowsHtml += `<td rowspan="${totalProjectRows}" style="border:1pt solid #000; padding:4px; font-weight:bold; vertical-align:top;">${escapeHtml(currentProject.projectName)}</td>`;
                }
                rowsHtml += `<td rowspan="${groupRowsCount}" style="border:1pt solid #000; padding:4px; vertical-align:top;">${escapeHtml(group.activities || '-')}</td>`;
                rowsHtml += `<td rowspan="${groupRowsCount}" style="border:1pt solid #000; padding:4px; vertical-align:top;">${escapeHtml(group.objectives || '-')}</td>`;
                rowsHtml += `<td rowspan="${groupRowsCount}" style="border:1pt solid #000; padding:4px; vertical-align:top;">${escapeHtml(group.targetGroup || '-')}</td>`;
                rowsHtml += `<td rowspan="${groupRowsCount}" style="border:1pt solid #000; padding:4px; vertical-align:top;">${escapeHtml(group.kpi || '-')}</td>`;
                rowsHtml += `<td rowspan="${groupRowsCount}" style="border:1pt solid #000; padding:4px; text-align:center; vertical-align:top;">${escapeHtml(group.location || '-')}</td>`;
                rowsHtml += `<td rowspan="${groupRowsCount}" style="border:1pt solid #000; padding:4px; text-align:center; vertical-align:top;">${escapeHtml(group.duration || '-')}</td>`;

                if (hasHeader) {
                  rowsHtml += `<td colspan="5" style="border:1pt solid #000; padding:4px; font-weight:bold; background-color:#fafafa;">${escapeHtml(group.activityName || '')}</td>`;
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
                  rowsHtml += `<td rowspan="${totalProjectRows}" style="border:1pt solid #000; padding:4px; text-align:center; vertical-align:top;">${escapeHtml(currentProject.responsiblePerson || currentProject.proposingOrg)}</td>`;
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
            <tr style="font-weight:bold; font-size:15pt; background-color:${isExcel ? '#f8fafc' : '#ffffff'};">
              <td colspan="7" style="border:1pt solid #000; padding:5px;"></td>
              <td colspan="4" style="border:1pt solid #000; padding:5px; text-align:center;">รวมเป็นเงินทั้งสิ้น (บาท)</td>
              <td style="border:1pt solid #000; padding:5px; text-align:right; font-weight:bold;">${currentProject.budgetRequested.toLocaleString()}</td>
              <td style="border:1pt solid #000; padding:5px;"></td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top:35px; width:100%;">
          <table style="width:100%; border:none; text-align:center; font-family:'TH Sarabun PSK', 'TH Sarabun New', sans-serif; font-size:16pt;">
            <tr>
              <td style="border:none; width:33%; vertical-align:top; text-align:center; padding:8px;">
                ผู้เสนอ ................................................<br/>
                <b>(${escapeHtml(currentProject.signers?.proposerName || '................................................')})</b><br/>
                <span style="font-size:15pt;">${escapeHtml(currentProject.signers?.proposerTitle || 'ผู้เสนอโครงการ')}</span>
              </td>
              <td style="border:none; width:33%; vertical-align:top; text-align:center; padding:8px;">
                ผู้เห็นชอบ ................................................<br/>
                <b>(${escapeHtml(currentProject.signers?.endorserName || settings.defaultEndorserName)})</b><br/>
                <span style="font-size:15pt;">${escapeHtml(currentProject.signers?.endorserTitle || settings.defaultEndorserTitle)}</span>
              </td>
              <td style="border:none; width:33%; vertical-align:top; text-align:center; padding:8px;">
                ผู้อนุมัติ ................................................<br/>
                <b>(${escapeHtml(currentProject.signers?.approverName || settings.defaultApproverName)})</b><br/>
                <span style="font-size:15pt;">${escapeHtml(currentProject.signers?.approverTitle || settings.defaultApproverTitle)}</span>
              </td>
            </tr>
          </table>
        </div>
      `;
    }

    // Summary Mode
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `
      <div style="text-align:center; margin-bottom:16px; font-family:'TH Sarabun PSK', 'TH Sarabun New', sans-serif;">
        <div style="margin-bottom:8px;">
          <img src="${origin}/Logo_NHSO_MASTER_Thai_2.jpg" style="height:48px; object-fit:contain;" alt="สปสช." />
        </div>
        <h2 style="font-size:18pt; font-weight:bold; margin-bottom:4px;">
          แบบสรุปโครงการที่ขอรับการสนับสนุนงบประมาณกองทุนหลักประกันสุขภาพระดับท้องถิ่น เทศบาลตำบลบางเป้า
        </h2>
        <p style="font-size:15pt; font-weight:bold;">
          ครั้งที่ 1 ประจำปีงบประมาณ ${targetYear} • รวมทั้งสิ้น ${summaryProjects.length} โครงการ • งบประมาณรวม ${totalSummaryBudget.toLocaleString()} บาท
        </p>
      </div>

      <table style="border-collapse:collapse; width:100%; font-size:14.5pt; font-family:'TH Sarabun PSK', 'TH Sarabun New', sans-serif;">
        <thead>
          <tr style="background-color:${isExcel ? '#e2e8f0' : '#f1f5f9'}; text-align:center; font-weight:bold; font-size:15pt;">
            <th rowspan="2" style="border:1pt solid #000; padding:5px; width:6%;">ลำดับที่</th>
            <th rowspan="2" style="border:1pt solid #000; padding:5px; text-align:left;">ชื่อโครงการ</th>
            <th rowspan="2" style="border:1pt solid #000; padding:5px; width:22%; text-align:left;">ผู้ขอรับงบ</th>
            <th rowspan="2" style="border:1pt solid #000; padding:5px; width:14%; text-align:right;">งบประมาณ (บาท)</th>
            <th colspan="2" style="border:1pt solid #000; padding:5px; width:20%;">ความเห็นกรรมการฯ</th>
          </tr>
          <tr style="text-align:center; font-weight:bold; font-size:14pt; background-color:${isExcel ? '#e2e8f0' : '#f1f5f9'};">
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
                <tr style="background-color:#f8fafc; font-weight:bold; font-size:15pt;">
                  <td colspan="6" style="border:1pt solid #000; padding:5px;">
                    ${getOfficialCategoryHeader(cNum, cInfo?.title)} (${projectsInCat.length} โครงการ)
                  </td>
                </tr>
                ${projectsInCat
                  .map(
                    (p, idx) => `
                  <tr>
                    <td style="border:1pt solid #000; padding:4px; text-align:center;">${p.orderNumber || idx + 1}</td>
                    <td style="border:1pt solid #000; padding:4px;">${escapeHtml(p.projectName)}</td>
                    <td style="border:1pt solid #000; padding:4px;">${escapeHtml(p.proposingOrg)}</td>
                    <td style="border:1pt solid #000; padding:4px; text-align:right;">${p.budgetRequested.toLocaleString()}</td>
                    <td style="border:1pt solid #000; padding:4px; text-align:center; font-weight:bold;">
                      ${p.status === 'approved' || p.committeeDecision === 'approve' ? '✓ อนุมัติ' : ''}
                    </td>
                    <td style="border:1pt solid #000; padding:4px; text-align:center; font-weight:bold; color:red;">
                      ${p.status === 'rejected' || p.committeeDecision === 'reject' ? '✗ ไม่อนุมัติ' : ''}
                    </td>
                  </tr>
                `
                  )
                  .join('')}
                <tr style="font-weight:bold; font-size:15pt;">
                  <td colspan="3" style="border:1pt solid #000; padding:5px; text-align:right;">
                    รวมประเภทที่ ${cNum} (${projectsInCat.length} โครงการ):
                  </td>
                  <td style="border:1pt solid #000; padding:5px; text-align:right;">${subtotal.toLocaleString()}</td>
                  <td colspan="2" style="border:1pt solid #000; padding:5px; text-align:center;">บาท</td>
                </tr>
              `;
            })
            .join('')}
          <tr style="background-color:${isExcel ? '#e2e8f0' : '#f1f5f9'}; font-weight:bold; font-size:15pt;">
            <td colspan="3" style="border:1pt solid #000; padding:5px; text-align:right;">
              รวมทั้งหมด (${summaryProjects.length} โครงการ):
            </td>
            <td style="border:1pt solid #000; padding:5px; text-align:right; font-size:16pt;">
              ${totalSummaryBudget.toLocaleString()}
            </td>
            <td colspan="2" style="border:1pt solid #000; padding:5px; text-align:center;">บาทถ้วน</td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top:35px; width:100%;">
        <table style="width:100%; border:none; text-align:center; font-family:'TH Sarabun PSK', 'TH Sarabun New', sans-serif; font-size:16pt;">
          <tr>
            <td style="border:none; width:50%; vertical-align:top; text-align:center; padding:10px;">
              (ลงชื่อ) ................................................................ ผู้ตรวจสอบ<br/>
              <b>(${escapeHtml(settings.defaultEndorserName)})</b><br/>
              <span style="font-size:15pt;">${escapeHtml(settings.defaultEndorserTitle)}</span>
            </td>
            <td style="border:none; width:50%; vertical-align:top; text-align:center; padding:10px;">
              (ลงชื่อ) ................................................................ ประธานกรรมการ<br/>
              <b>(${escapeHtml(settings.defaultApproverName)})</b><br/>
              <span style="font-size:15pt;">${escapeHtml(settings.defaultApproverTitle)}</span>
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
            margin: 1.2cm 1.2cm 1.2cm 1.2cm;
          }
          div.Section1 { page: Section1; }
          body { font-family: 'TH Sarabun PSK', 'TH Sarabun New', sans-serif; font-size: 16pt; }
          table { border-collapse: collapse; width: 100%; font-family: 'TH Sarabun PSK', 'TH Sarabun New', sans-serif; }
          th, td { font-family: 'TH Sarabun PSK', 'TH Sarabun New', sans-serif; }
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
          th, td { border: 0.5pt solid black; font-family: 'TH Sarabun PSK', 'TH Sarabun New', sans-serif; font-size: 14pt; vertical-align: top; }
          th { font-weight: bold; background-color: #f2f2f2; text-align: center; font-size: 15pt; }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto font-sarabun">
      {/* Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-[1280px] max-h-[96vh] flex flex-col overflow-hidden">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900 text-white print:hidden font-sans">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold flex items-center gap-2">
                ตัวอย่างก่อนพิมพ์ & ส่งออกเอกสาร (TH Sarabun 16 PSK - A4 แนวนอน)
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-normal">
                  แม่แบบทางการ สปสช.
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                ฟอนต์ราชการ TH Sarabun PSK 16pt • โลโก้ทางการ สปสช. MASTER • พิมพ์ PDF / ส่งออก Word / Excel
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
              title="ส่งออกไฟล์ Word (.doc) ฟอนต์ TH Sarabun PSK 16pt นำไปเปิดแก้ไขได้ทันที"
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200 dark:bg-slate-950/80 print:p-0 print:bg-white print:overflow-visible">
          <div
            className="nhso-print-canvas bg-white text-black p-8 mx-auto shadow-2xl rounded-none border border-slate-400 print:shadow-none print:border-none print:p-1 print:m-0 w-full max-w-[1140px] min-h-[750px]"
            style={{ fontFamily: "'TH Sarabun PSK', 'TH Sarabun New', 'Sarabun', sans-serif" }}
          >
            {/* ============================================================== */}
            {/* MODE 1: SINGLE PROJECT PROPOSAL (EXACT REPLICA) */}
            {/* ============================================================== */}
            {printMode === 'single' && currentProject && (
              <div className="space-y-2 text-black">
                {/* Top Header Layout: Category Title on Left, Logo Box on Right */}
                <div className="flex items-start justify-between pb-1">
                  {/* Left: Category Title (16pt bold) */}
                  <div className="max-w-[76%] pt-1">
                    <h2
                      className="font-bold text-black leading-snug"
                      style={{ fontSize: '16pt' }}
                    >
                      {categoryTitle}
                    </h2>
                  </div>

                  {/* Right: Page number & NHSO Master Logo Box */}
                  <div className="flex flex-col items-end">
                    <span
                      className="font-bold text-black pr-1 mb-1 leading-none"
                      style={{ fontSize: '16pt' }}
                    >
                      {currentProject.orderNumber || 1}
                    </span>
                    {/* Official NHSO Master Logo Box */}
                    <div className="border border-black p-1 bg-white flex items-center justify-center rounded-none shadow-none w-44 h-12">
                      <img
                        src="/Logo_NHSO_MASTER_Thai_2.jpg"
                        alt="สปสช. สำนักงานหลักประกันสุขภาพแห่งชาติ"
                        className="max-h-full max-w-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/nhso_logo.jpg';
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* 13-Column Table Grid (TH Sarabun PSK 16pt / 15pt exact official proportions) */}
                <div className="w-full">
                  <table
                    className="w-full border-collapse border border-black leading-tight"
                    style={{ fontSize: '15pt', lineHeight: 1.15 }}
                  >
                    <thead>
                      <tr className="text-center font-bold text-black bg-white" style={{ fontSize: '15pt' }}>
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
                      <tr className="text-center font-bold text-black bg-white" style={{ fontSize: '14pt' }}>
                        <th className="border border-black p-0.5 w-[9%]">รายการค่าใช้จ่าย</th>
                        <th className="border border-black p-0.5 w-[2.5%]">จำนวน</th>
                        <th className="border border-black p-0.5 w-[2.5%]">หน่วย</th>
                        <th className="border border-black p-0.5 w-[3%]">ราคาต่อหน่วย</th>
                        <th className="border border-black p-0.5 w-[3%]">รวมเงิน (บาท)</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontSize: '14.5pt' }}>
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
                                  className="border border-black p-1 font-bold text-black whitespace-pre-line align-top"
                                >
                                  {currentProject.projectName}
                                </td>
                              )}

                              {/* Activity Description */}
                              <td
                                rowSpan={groupRowsCount}
                                className="border border-black p-1 whitespace-pre-line text-black align-top"
                              >
                                {group.activities || '-'}
                              </td>

                              {/* Objectives */}
                              <td
                                rowSpan={groupRowsCount}
                                className="border border-black p-1 whitespace-pre-line text-black align-top"
                              >
                                {group.objectives || '-'}
                              </td>

                              {/* Target Group */}
                              <td
                                rowSpan={groupRowsCount}
                                className="border border-black p-1 whitespace-pre-line text-black align-top"
                              >
                                {group.targetGroup || '-'}
                              </td>

                              {/* KPI */}
                              <td
                                rowSpan={groupRowsCount}
                                className="border border-black p-1 whitespace-pre-line text-black align-top"
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
                                  className="border border-black p-1 text-center font-medium text-black whitespace-pre-line align-top"
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

                      {/* Total Row (Directly below data with NO empty rows - 16pt bold) */}
                      <tr className="font-bold text-black bg-white" style={{ fontSize: '15.5pt' }}>
                        <td colSpan={7} className="border border-black p-1.5 text-center"></td>
                        <td colSpan={4} className="border border-black p-1.5 text-center font-bold">
                          รวมเป็นเงินทั้งสิ้น (บาท)
                        </td>
                        <td className="border border-black p-1.5 text-right font-bold" style={{ fontSize: '16pt' }}>
                          {currentProject.budgetRequested.toLocaleString()}
                        </td>
                        <td className="border border-black p-1.5"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 3-Signer Signature Block Matching Official Layout (TH Sarabun 16pt) */}
                <div
                  className="pt-8 pb-3 grid grid-cols-3 gap-6 text-center text-black"
                  style={{ fontSize: '16pt', lineHeight: 1.25 }}
                >
                  {/* Proposer */}
                  <div className="space-y-1">
                    <div>
                      ผู้เสนอ ................................................
                    </div>
                    <div className="font-bold">
                      ({currentProject.signers?.proposerName || '................................................'})
                    </div>
                    <div style={{ fontSize: '15pt' }} className="text-slate-800">
                      {currentProject.signers?.proposerTitle || 'ผู้เสนอโครงการ'}
                    </div>
                  </div>

                  {/* Endorser */}
                  <div className="space-y-1">
                    <div>
                      ผู้เห็นชอบ ................................................
                    </div>
                    <div className="font-bold">
                      ({currentProject.signers?.endorserName || settings.defaultEndorserName})
                    </div>
                    <div style={{ fontSize: '15pt' }} className="text-slate-800">
                      {currentProject.signers?.endorserTitle || settings.defaultEndorserTitle}
                    </div>
                  </div>

                  {/* Approver */}
                  <div className="space-y-1">
                    <div>
                      ผู้อนุมัติ ................................................
                    </div>
                    <div className="font-bold">
                      ({currentProject.signers?.approverName || settings.defaultApproverName})
                    </div>
                    <div style={{ fontSize: '15pt' }} className="text-slate-800">
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
              <div className="space-y-3 text-black">
                {/* Header */}
                <div className="text-center pb-2 border-b-2 border-black space-y-1">
                  <div className="flex items-center justify-center gap-3 mb-1">
                    <img
                      src="/Logo_NHSO_MASTER_Thai_2.jpg"
                      alt="สปสช"
                      className="h-12 object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <h1 className="font-bold text-black" style={{ fontSize: '18pt' }}>
                      แบบสรุปโครงการที่ขอรับการสนับสนุนงบประมาณกองทุนหลักประกันสุขภาพระดับท้องถิ่น เทศบาลตำบลบางเป้า
                    </h1>
                  </div>
                  <p className="font-bold text-black" style={{ fontSize: '15pt' }}>
                    ครั้งที่ 1 ประจำปีงบประมาณ {targetYear} • รวมทั้งสิ้น {summaryProjects.length}{' '}
                    โครงการ • งบประมาณรวม {totalSummaryBudget.toLocaleString()} บาท
                  </p>
                </div>

                {/* Summary Table (rowspan=2 on row 1, no dash row, TH Sarabun) */}
                <div className="overflow-x-auto">
                  <table
                    className="w-full border-collapse border border-black"
                    style={{ fontSize: '14.5pt', lineHeight: 1.15 }}
                  >
                    <thead>
                      <tr className="bg-slate-100 text-black font-bold text-center" style={{ fontSize: '15pt' }}>
                        <th rowSpan={2} className="border border-black p-1.5 w-12 align-middle">ลำดับที่</th>
                        <th rowSpan={2} className="border border-black p-1.5 text-left align-middle">ชื่อโครงการ</th>
                        <th rowSpan={2} className="border border-black p-1.5 w-44 text-left align-middle">ผู้ขอรับงบ</th>
                        <th rowSpan={2} className="border border-black p-1.5 w-28 text-right align-middle">งบประมาณ (บาท)</th>
                        <th colSpan={2} className="border border-black p-1.5 w-44 text-center align-middle">
                          ความเห็นกรรมการฯ
                        </th>
                      </tr>
                      <tr className="bg-slate-100 text-center font-bold" style={{ fontSize: '14pt' }}>
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
                            <tr className="bg-slate-50 font-bold text-black" style={{ fontSize: '15pt' }}>
                              <td colSpan={6} className="border border-black px-2 py-1">
                                {getOfficialCategoryHeader(cNum, cInfo?.title)} ({projectsInCat.length} โครงการ)
                              </td>
                            </tr>
                            {projectsInCat.map((p, idx) => (
                              <tr key={p.id}>
                                <td className="border border-black p-1 text-center font-semibold">
                                  {p.orderNumber || idx + 1}
                                </td>
                                <td className="border border-black p-1 text-black font-medium whitespace-pre-line">
                                  {p.projectName}
                                </td>
                                <td className="border border-black p-1 text-black">
                                  {p.proposingOrg}
                                </td>
                                <td className="border border-black p-1 text-right font-semibold">
                                  {p.budgetRequested.toLocaleString()}
                                </td>
                                <td className="border border-black p-1 text-center font-bold text-emerald-700">
                                  {p.status === 'approved' || p.committeeDecision === 'approve'
                                    ? '✓ อนุมัติ'
                                    : ''}
                                </td>
                                <td className="border border-black p-1 text-center font-bold text-red-600">
                                  {p.status === 'rejected' || p.committeeDecision === 'reject'
                                    ? '✗ ไม่อนุมัติ'
                                    : ''}
                                </td>
                              </tr>
                            ))}
                            <tr className="font-bold text-black bg-slate-50/50" style={{ fontSize: '15pt' }}>
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
                      <tr className="bg-slate-100 font-bold text-black" style={{ fontSize: '15.5pt' }}>
                        <td colSpan={3} className="border border-black p-1.5 text-right">
                          รวมทั้งหมด ({summaryProjects.length} โครงการ):
                        </td>
                        <td className="border border-black p-1.5 text-right font-bold" style={{ fontSize: '16pt' }}>
                          {totalSummaryBudget.toLocaleString()}
                        </td>
                        <td colSpan={2} className="border border-black p-1.5 text-center">
                          บาทถ้วน
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Summary Signature */}
                <div
                  className="pt-8 grid grid-cols-2 gap-16 text-center text-black"
                  style={{ fontSize: '16pt', lineHeight: 1.25 }}
                >
                  <div className="space-y-1">
                    <div>(ลงชื่อ) ................................................................ ผู้ตรวจสอบ</div>
                    <div className="font-bold">({settings.defaultEndorserName})</div>
                    <div style={{ fontSize: '15pt' }} className="text-slate-700">{settings.defaultEndorserTitle}</div>
                  </div>
                  <div className="space-y-1">
                    <div>(ลงชื่อ) ................................................................ ประธานกรรมการ</div>
                    <div className="font-bold">({settings.defaultApproverName})</div>
                    <div style={{ fontSize: '15pt' }} className="text-slate-700">{settings.defaultApproverTitle}</div>
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
          src: local('TH Sarabun PSK'), local('THSarabunPSK'), local('TH Sarabun New'), local('THSarabunNew');
          font-weight: normal;
          font-style: normal;
        }
        @font-face {
          font-family: 'TH Sarabun PSK';
          src: local('TH Sarabun PSK Bold'), local('THSarabunPSK-Bold'), local('TH Sarabun New Bold'), local('THSarabunNew-Bold');
          font-weight: bold;
          font-style: normal;
        }

        .nhso-print-canvas,
        .nhso-print-canvas * {
          font-family: 'TH Sarabun PSK', 'TH Sarabun New', 'Sarabun', sans-serif !important;
        }

        @media print {
          @page {
            size: landscape;
            margin: 5mm 8mm;
          }
          body, html {
            font-family: 'TH Sarabun PSK', 'TH Sarabun New', 'Sarabun', sans-serif !important;
            background: #ffffff !important;
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
            font-family: 'TH Sarabun PSK', 'TH Sarabun New', 'Sarabun', sans-serif !important;
          }
          .nhso-print-canvas * {
            font-family: 'TH Sarabun PSK', 'TH Sarabun New', 'Sarabun', sans-serif !important;
          }
        }
      `}</style>
    </div>
  );
};
