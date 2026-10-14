const fs = require('fs');

let funcStr = `
function exportReportUsingSheetTemplate(shopName, targetYear) {
  try {
    const data = getCompleteReportData(shopName, targetYear);
    const g = data.general || {};
    const ev = data.evaluation || {};
    if (!g['ชื่อสถานประกอบการ']) return { success: false, error: "ไม่พบข้อมูลร้านค้า กรุณาบันทึกข้อมูลก่อนส่งออก" };
    
    // Assuming the template is the active spreadsheet
    const ssActive = SpreadsheetApp.getActiveSpreadsheet();
    let templateSheet = ssActive.getSheetByName('แบบออกรายงานตรวจ');
    
    if (!templateSheet) {
      return { success: false, error: "ไม่พบแผ่นงาน 'แบบออกรายงานตรวจ' ในฐานข้อมูล" };
    }
    
    let ss = SpreadsheetApp.create('รายงานตรวจ_' + shopName);
    let file = DriveApp.getFileById(ss.getId());
    const newSheet = templateSheet.copyTo(ss);
    newSheet.setName('รายงานตรวจ');
    
    const defaultSheet = ss.getSheets()[0];
    if (defaultSheet && defaultSheet.getName() !== 'รายงานตรวจ') {
      ss.deleteSheet(defaultSheet);
    }
    
    // Process General Info
    let bType = g['ประเภทกิจการ'] || '';
    let bType1 = bType; let bType2 = '';
    if (bType.length > 90) {
       let splitIndex = bType.lastIndexOf(' ', 90);
       if (splitIndex === -1) splitIndex = 90;
       bType1 = bType.substring(0, splitIndex);
       bType2 = bType.substring(splitIndex).trim();
    }
    
    let bldgStyle = String(g['ลักษณะอาคาร'] || '');
    let bldgDet = String(g['รายละเอียดจำนวนชั้น'] || g['รายละเอียดอาคาร'] || g['รายละเอียดชั้น/โรงเรือน/โกดังรายละเอียดเพิ่มเติม'] || g['รายละเอียดชั้น/โรงเรือน/โกดัง'] || '');
    if (!bldgDet) { // Try to get it from raw array index 15
       if (g['_raw'] && g['_raw'].length > 15) bldgDet = String(g['_raw'][15]);
    }
    
    // Setup building placeholders
    let b1c='☐', b2c='☐', b3c='☐', b4c='☐', b5c='☐', boc='☐';
    let b1n='', b2n='', b3n='', b4n='', b5n='', bot='';
    
    if (bldgStyle.indexOf('อาคารโรงงาน') > -1 || bldgStyle.indexOf('เอกเทศ') > -1) { b1c = '☑'; b1n = bldgDet; }
    else if (bldgStyle.indexOf('พาณิชย์') > -1) { b2c = '☑'; b2n = bldgDet; }
    else if (bldgStyle.indexOf('สำนักงาน') > -1) { b3c = '☑'; b3n = bldgDet; }
    else if (bldgStyle.indexOf('โรงเรือน') > -1) { b4c = '☑'; b4n = bldgDet; }
    else if (bldgStyle.indexOf('โกดัง') > -1) { b5c = '☑'; b5n = bldgDet; }
    else if (bldgStyle) { boc = '☑'; bot = bldgStyle + (bldgDet ? ' ' + bldgDet : ''); }
    
    // Complaint logic
    let compIssues = String(g['ปัญหาที่เคยถูกร้องเรียน'] || g['ปัญหา/ข้อร้องเรียน'] || '');
    if (!compIssues && g['_raw'] && g['_raw'].length > 25) compIssues = String(g['_raw'][25]);
    
    let compText = String(g['การถูกร้องเรียน'] || '');
    if (!compText && g['_raw'] && g['_raw'].length > 24) compText = String(g['_raw'][24]);
    
    let compCount = "0";
    if (compText.includes('เคยถูกร้องเรียน')) {
       let m = compText.match(/\\d+/);
       if (m) compCount = m[0];
       else compCount = "1";
    }
    
    // Materials logic
    let matsRaw = String(g['วัตถุดิบและสารเคมี'] || '');
    if (!matsRaw && g['_raw'] && g['_raw'].length > 26) matsRaw = String(g['_raw'][26]);
    let matLines = matsRaw.split('\\n');
    let m1n='', m1q='', m2n='', m2q='', m3n='', m3q='', m4n='', m4q='';
    
    for (let i = 0; i < matLines.length && i < 4; i++) {
        let line = matLines[i].replace(/^\\d+\\.\\s*/, '').trim(); // remove "1. "
        let match = line.match(/^(.*?)\\((.*?)\\)$/);
        let n = line, q = '';
        if (match) { n = match[1].trim(); q = match[2].trim(); }
        if (i===0) { m1n = n; m1q = q; }
        if (i===1) { m2n = n; m2q = q; }
        if (i===2) { m3n = n; m3q = q; }
        if (i===3) { m4n = n; m4q = q; }
    }
    
    // Comment split
    let comment = String(ev['หมายเหตุ/ข้อเสนอแนะเพิ่มเติม'] || ev['ข้อเสนอแนะ/สรุปผลการตรวจประเมิน'] || '');
    let sum1 = comment; let sum2 = '';
    if (comment.length > 100) {
       let sIdx = comment.lastIndexOf(' ', 100);
       if (sIdx === -1) sIdx = 100;
       sum1 = comment.substring(0, sIdx);
       sum2 = comment.substring(sIdx).trim();
    }
    
    let inspDate = ev['วันที่ลงบันทึก'] || g['Timestamp'] || new Date();
    if (inspDate instanceof Date) inspDate = Utilities.formatDate(inspDate, "GMT+7", "dd/MM/yyyy");
    else inspDate = String(inspDate).split(' ')[0];
    
    const replacements = {
        '<<bType1>>': bType1,
        '<<bType2>>': bType2,
        
        '<<animalType>>': String(g['ชนิดสัตว์ที่เลี้ยง'] || g['_raw']?.[12] || ''),
        '<<animalCount>>': String(g['จำนวนสัตว์ (ตัว)'] || g['_raw']?.[13] || '0'),
        
        '<<bldg1Check>>': b1c, '<<bldg1Count>>': b1n,
        '<<bldg2Check>>': b2c, '<<bldg2Count>>': b2n,
        '<<bldg3Check>>': b3c, '<<bldg3Count>>': b3n,
        '<<bldg4Check>>': b4c, '<<bldg4Count>>': b4n,
        '<<bldg5Check>>': b5c, '<<bldg5Count>>': b5n,
        '<<bldgOtherCheck>>': boc, '<<bldgOtherText>>': bot,
        
        '<<machineCount>>': String(g['จำนวนเครื่องจักร (ตัว)'] || g['_raw']?.[16] || '0'),
        '<<machineHp>>': String(g['รวมกำลังแรงม้า (HP)'] || g['_raw']?.[17] || '0'),
        
        '<<workDays>>': String(g['จำนวนวันทำงาน (วัน/สัปดาห์)'] || g['_raw']?.[21] || '0'),
        '<<workStart>>': String(g['ช่วงเวลาเริ่มงาน'] || g['_raw']?.[22] || '-'),
        '<<workEnd>>': String(g['ช่วงเวลาเลิกงาน'] || g['_raw']?.[23] || '-'),
        
        '<<compNo>>': compText.includes('ไม่เคย') ? '☑' : '☐',
        '<<compYes>>': compText.includes('ไม่เคย') ? '☐' : '☑',
        '<<compCount>>': compCount,
        
        '<<c1>>': compIssues.includes('เสียงดัง') ? '☑' : '☐',
        '<<c2>>': compIssues.includes('ฝุ่น') || compIssues.includes('ควัน') ? '☑' : '☐',
        '<<c3>>': compIssues.includes('กลิ่น') ? '☑' : '☐',
        '<<c4>>': compIssues.includes('สารเคมี') ? '☑' : '☐',
        '<<c5>>': compIssues.includes('น้ำเสีย') ? '☑' : '☐',
        '<<c6>>': compIssues.includes('ขยะ') || compIssues.includes('สิ่งปฏิกูล') ? '☑' : '☐',
        '<<pestType>>': '',
        '<<compOtherText>>': '',
        
        '<<mat1Name>>': m1n, '<<mat1Qty>>': m1q,
        '<<mat2Name>>': m2n, '<<mat2Qty>>': m2q,
        '<<mat3Name>>': m3n, '<<mat3Qty>>': m3q,
        '<<mat4Name>>': m4n, '<<mat4Qty>>': m4q,
        
        '<<sumText1>>': sum1,
        '<<sumText2>>': sum2,
        '<<inspName>>': String(ev['ชื่อผู้ตรวจประเมิน'] || ''),
        '<<inspPos>>': String(ev['ตำแหน่งผู้ตรวจประเมิน'] || ''),
        '<<inspDate>>': inspDate
    };
    
    // Add Q1 to Q30 evaluation results
    for (let i = 1; i <= 35; i++) {
        let rVal = String(ev['r' + i] || '');
        replacements['<<q' + i + 'y>>'] = rVal === 'ใช่' ? '☑' : '☐';
        replacements['<<q' + i + 'n>>'] = rVal === 'ไม่ใช่' ? '☑' : '☐';
        replacements['<<q' + i + 'na>>'] = (rVal === 'ไม่เกี่ยวข้อง' || rVal === 'N/A') ? '☑' : '☐';
        replacements['<<f' + i + '>>'] = String(ev['f' + i] || '');
        replacements['<<a' + i + '>>'] = String(ev['c' + i] || '');
    }
    
    for (let key in replacements) {
        let finder = newSheet.createTextFinder(key);
        finder.replaceAllWith(replacements[key] || ' ');
    }
    
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const fileId = file.getId();
    const pdfUrl = \`https://docs.google.com/spreadsheets/d/\${fileId}/export?format=pdf&portrait=true&size=A4&fitw=true\`;
    const excelUrl = \`https://docs.google.com/spreadsheets/d/\${fileId}/export?format=xlsx\`;
    
    return { success: true, pdfUrl: pdfUrl, excelUrl: excelUrl, sheetUrl: file.getUrl() };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}
`;

fs.appendFileSync('รหัส.js', funcStr);
`;
fs.writeFileSync('append_export.js', c);
