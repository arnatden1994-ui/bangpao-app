
function extractYear(dateVal) {
  if (dateVal instanceof Date) {
    return (dateVal.getFullYear() + 543).toString();
  } else if (typeof dateVal === 'string') {
    let parts = dateVal.split(' ')[0].split('/');
    if (parts.length === 3) {
      let yr = parseInt(parts[2], 10);
      if (yr < 2500) yr += 543;
      return yr.toString();
    }
  }
  return (new Date().getFullYear() + 543).toString();
}
function doGet(e) {
  if (e && e.parameter && e.parameter.view === 'setupTemplate') {
    let url = createLicenseTemplateDoc();
    return HtmlService.createHtmlOutput('<h1>สร้าง Template สำเร็จแล้ว</h1><p>คุณสามารถเข้าไปปรับแต่งหน้าตาเอกสารได้ที่ลิงก์นี้: <a href="'+url+'" target="_blank">คลิกที่นี่</a></p><p>ระบบได้จดจำไฟล์นี้เป็น Template หลักของคุณเรียบร้อยแล้ว ไม่ต้องตั้งค่าอะไรเพิ่มเติมครับ ปิดหน้านี้ได้เลย</p>');
  } else if (e && e.parameter && e.parameter.view === 'fixTemplate') {
    let result = fixTemplatePlaceholders();
    return HtmlService.createHtmlOutput('<h1>Fix Result: ' + result + '</h1>');
  } else if (e && e.parameter && e.parameter.view === 'autoFill') {
    let result = autoFillPlaceholders();
    return HtmlService.createHtmlOutput('<h1>AutoFill Result: ' + result + '</h1>');
  } else if (e && e.parameter && e.parameter.view === 'getQuestions') {
    let result = getQuestionsList();
    return ContentService.createTextOutput(result).setMimeType(ContentService.MimeType.JSON);
  } else if (e && e.parameter && e.parameter.view === 'report') {
    let template = HtmlService.createTemplateFromFile('ReportTemplate'); 
    template.shopName = e.parameter.shopName || '';              
    return template.evaluate()
                   .setTitle('รายงานการตรวจประเมินสุขลักษณะ')
                   .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } else if (e && e.parameter && e.parameter.view === 'license') {
    let template = HtmlService.createTemplateFromFile('LicenseTemplate');
    template.shopName = e.parameter.shopName || '';
    return template.evaluate()
                   .setTitle('ใบอนุญาตประกอบกิจการ')
                   .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  return HtmlService.createTemplateFromFile('Index') 
                    .evaluate()
                    .setTitle('ระบบงานตรวจประเมินสุขลักษณะสถานประกอบการ')
                    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getWebAppUrl() { return ScriptApp.getService().getUrl(); }

function fixTemplatePlaceholders() {
  const ss = SpreadsheetApp.openById('1uyFaL2xxUouBM5CV-_WdWlNHWHZWQQ9XhrVldvV3DEY');
  const sheet = ss.getSheetByName('แบบออกรายงานตรวจ');
  if(!sheet) return "No sheet 'แบบออกรายงานตรวจ' found!";
  
  let count = 0;
  for(let i=1; i<=35; i++) {
    count += sheet.createTextFinder('<+q' + i + 'y>+').useRegularExpression(true).replaceAllWith('<<q' + i + 'y>>');
    count += sheet.createTextFinder('<+q' + i + 'n>+').useRegularExpression(true).replaceAllWith('<<q' + i + 'n>>');
    count += sheet.createTextFinder('<+q' + i + 'na>+').useRegularExpression(true).replaceAllWith('<<q' + i + 'na>>');
    
    count += sheet.createTextFinder('<+f' + i + '>+').useRegularExpression(true).replaceAllWith('<<f' + i + '>>');
    count += sheet.createTextFinder('<+a' + i + '>+').useRegularExpression(true).replaceAllWith('<<a' + i + '>>');
  }
  return "Replaced " + count + " incorrect brackets!";
}

function getQuestionsList() {
  const ss = SpreadsheetApp.openById('1uyFaL2xxUouBM5CV-_WdWlNHWHZWQQ9XhrVldvV3DEY');
  const config = ss.getSheetByName("ตั้งค่าผู้ใช้งาน");
  if (!config) return "No config sheet";
  const data = config.getDataRange().getValues();
  let questions = [];
  for (var i = 1; i < data.length; i++) {
      if (data[i][5]) {
        var str = data[i][5].toString().trim();
        var match = str.match(/^(?:ข้อ\\s*)?([\\d\\.]+)\\s*[:\\.]?\\s*(.*)$/);
        if (match) { questions.push({ num: match[1].trim(), text: match[2].trim() }); } 
        else if (str !== "") { questions.push({ num: "-", text: str }); }
      }
  }
  return JSON.stringify(questions, null, 2);
}

function autoFillPlaceholders() {
  const ss = SpreadsheetApp.openById('1uyFaL2xxUouBM5CV-_WdWlNHWHZWQQ9XhrVldvV3DEY');
  const sheet = ss.getSheetByName('แบบออกรายงานตรวจ');
  if(!sheet) return "No sheet 'แบบออกรายงานตรวจ' found!";
  
  const config = ss.getSheetByName("ตั้งค่าผู้ใช้งาน");
  const configData = config.getDataRange().getValues();
  let dbQuestions = []; 
  for (var i = 1; i < configData.length; i++) {
    if (configData[i][5]) {
      dbQuestions.push(configData[i][5].toString().trim());
    }
  }
  
  let count = 0;
  for (let r = 37; r <= 100; r++) {
    let rowValues = sheet.getRange(r, 1, 1, 10).getValues()[0];
    let cellText = rowValues.join(" ").trim();
    if (!cellText || cellText.length < 5) continue;
    
    let matchedIndex = -1;
    for (let j = 0; j < dbQuestions.length; j++) {
      let qText = dbQuestions[j];
      let normCell = cellText.replace(/[\\d\\.\\(\\)\\s]/g, '');
      let normQ = qText.replace(/[\\d\\.\\(\\)\\sข้อ:]/g, '');
      
      if (normCell.length > 5 && normQ.length > 5 && (normCell.includes(normQ) || normQ.includes(normCell))) {
        matchedIndex = j + 1; 
        break;
      }
    }
    
    if (matchedIndex !== -1) {
      if (!dbQuestions[matchedIndex - 1].includes("กรุณาประเมินในข้อย่อย") && !dbQuestions[matchedIndex - 1].includes("ดังนี้")) {
        sheet.getRange(r, 13).setValue('<<q' + matchedIndex + 'y>>'); 
        sheet.getRange(r, 14).setValue('<<q' + matchedIndex + 'n>>'); 
        sheet.getRange(r, 15).setValue('<<q' + matchedIndex + 'na>>'); 
      }
      sheet.getRange(r, 16).setValue('<<f' + matchedIndex + '>>'); 
      sheet.getRange(r, 20).setValue('<<a' + matchedIndex + '>>'); 
      count++;
    }
  }
  return "Successfully filled placeholders for " + count + " rows!";
}

function checkLogin(username, password) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ตั้งค่าผู้ใช้งาน");
  if (!sheet) return { success: false, msg: "⚠️ ไม่พบแท็บตั้งค่าผู้ใช้งาน" };
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0].toString().trim() === username.trim() && data[i][1].toString().trim() === password.trim()) {
      return { success: true, name: data[i][2], position: data[i][3] };
    }
  }
  return { success: false, msg: "❌ รหัสผ่านไม่ถูกต้อง หรือไม่พบผู้ใช้งานนี้" };
}
// Version update
function getFormSetupData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var config = ss.getSheetByName("ตั้งค่าผู้ใช้งาน");
  var info = ss.getSheetByName("GeneralInfo");
  var res = { types: [], buildingStyles: [], questions: [], shops: [] };
  
  if (config) {
    var data = config.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][4] && res.types.indexOf(data[i][4].toString()) === -1) res.types.push(data[i][4].toString());
      if (data[i][6] && res.buildingStyles.indexOf(data[i][6].toString()) === -1) res.buildingStyles.push(data[i][6].toString());
      if (data[i][5]) {
        var str = data[i][5].toString().trim();
        var match = str.match(/^(?:ข้อ\s*)?([\d\.]+)\s*[:\.]?\s*(.*)$/);
        if (match) { res.questions.push({ num: match[1].trim(), text: match[2].trim() }); } 
        else if (str !== "") { res.questions.push({ num: "-", text: str }); }
      }
    }
  }
  if (info) {
    var infoData = info.getDataRange().getValues();
    for (var k = 1; k < infoData.length; k++) {
      if (infoData[k][1] && res.shops.indexOf(infoData[k][1].toString()) === -1) res.shops.push(infoData[k][1].toString());
    }
  }
  return res;
}

function saveEHWAData(formData) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var infoSheet = ss.getSheetByName("GeneralInfo");
  var ansSheet = ss.getSheetByName("EvaluationAnswers");
  var licenseSheet = ss.getSheetByName("LicenseData");
  var timestamp = new Date();
  var baseYear = timestamp.getFullYear() + 543; 
  var mode = formData.formActionType || "edit";
  
  var complainText = formData.complaint_yes === "✓" ? "เคยถูกร้องเรียน (" + formData.complaint_count + " ครั้ง)" : "ไม่เคยถูกร้องเรียน";
  var infoRowData = [
    timestamp, formData.shopName, formData.businessType, formData.ownerName || "",
    formData.address_no || "", formData.moo || "", formData.street || "", formData.tumbon || "บางเป้า",
    formData.amphoe || "กันตัง", formData.changwat || "ตรัง", keepPhoneText_(formData.phone_owner), keepPhoneText_(formData.phone_shop),
    formData.animal_type || "", formData.animal_count || "0", formData.buildingStyle || formData.building_details || "", 
    formData.building_details || "", formData.machine_count || "0", formData.machine_power || "0", 
    formData.worker_male || "0", formData.worker_female || "0", formData.worker_total || "0", 
    formData.work_days || "6", formData.time_start || "08:00", formData.time_end || "17:00",    
    complainText, formData.complaint_issues || "", formData.materials || ""
  ];
  
  if (infoSheet) {
    var infoRowFound = -1;
    var infoData = infoSheet.getDataRange().getValues();
    for (var i = infoData.length - 1; i > 0; i--) {
      var rowYear = extractYear(infoData[i][0]);
      if (infoData[i][1] === formData.shopName && rowYear === formData.thaiYear) { infoRowFound = i + 1; break; }
    }
    if (mode === "edit" && infoRowFound != -1) {
      infoRowData[0] = infoSheet.getRange(infoRowFound, 1).getValue(); 
      infoSheet.getRange(infoRowFound, 1, 1, infoRowData.length).setValues([infoRowData]);
    } else { infoSheet.appendRow(infoRowData); }
  }
  
  if (ansSheet) {
    var ansRowFound = -1;
    var ansData = ansSheet.getDataRange().getValues();
    for (var k = ansData.length - 1; k > 0; k--) {
      var rowYear = extractYear(ansData[k][0]);
      if (ansData[k][1] === formData.shopName && rowYear === formData.thaiYear) { ansRowFound = k + 1; break; }
    }
    
    var ansRowData = [timestamp, formData.shopName];
    // 🎯 ดึงจำนวนข้อคำถามจาก Sheet ตั้งค่า หรือใช้ 29 เป็นค่าเริ่มต้น
    var setupData = getFormSetupData();
    var questionCount = (setupData && setupData.questions) ? setupData.questions.length : 29;
    if (questionCount === 0) questionCount = 29;
    
    for (var j = 1; j <= questionCount; j++) {
      ansRowData.push(formData["r" + j] || "ใช่");
      ansRowData.push(formData["f" + j] || "");
      ansRowData.push(formData["c" + j] || "");
    }
    ansRowData.push(
      formData.comment_notes || "", 
      formData.summary_result || "ผ่านเกณฑ์การประเมินโครงสร้างพื้นฐาน",
      formData.inspector_name || formData.currentUserRealName || "",  
      formData.inspector_position || formData.currentUserPosition || "", 
      Utilities.formatDate(timestamp, "GMT+7", "yyyy-MM-dd")
    );
    
    if (mode === "edit" && ansRowFound != -1) {
      ansRowData[0] = ansSheet.getRange(ansRowFound, 1).getValue(); 
      ansSheet.getRange(ansRowFound, 1, 1, ansRowData.length).setValues([ansRowData]);
    } else { ansSheet.appendRow(ansRowData); }
  }

  if (licenseSheet) {
    var licData = licenseSheet.getDataRange().getValues();
    var targetYear = baseYear; // ต่อใบอนุญาตให้เป็นปีปัจจุบัน (ปีที่ทำการต่อ)
    var licRowFound = -1;
    for (var m = licData.length - 1; m > 0; m--) {
      if (licData[m][1] === formData.shopName && Number(licData[m][6]) === targetYear) { licRowFound = m + 1; break; }
    }
    var licenseRowData = [
      timestamp, formData.shopName, "-", "-", "-", 
      (mode === "renew") ? "คำขอต่ออายุรายปีฉบับใหม่" : "อัปเดตข้อมูลประเมินร้านค้า", targetYear 
    ];
    if (mode === "edit" && licRowFound != -1) {
      licenseRowData[0] = licenseSheet.getRange(licRowFound, 1).getValue();
      licenseRowData[2] = licenseSheet.getRange(licRowFound, 3).getValue();
      licenseRowData[3] = licenseSheet.getRange(licRowFound, 4).getValue();
      licenseRowData[4] = licenseSheet.getRange(licRowFound, 5).getValue();
      licenseSheet.getRange(licRowFound, 1, 1, 7).setValues([licenseRowData]);
    } else if (mode === "renew" || licRowFound == -1) {
      licenseSheet.appendRow(licenseRowData);
    }
  }

  if (mode === "renew") return "✅ บันทึกคำขอต่ออายุประจำปี พ.ศ. " + baseYear + " สำเร็จ!";
  return "✅ ปรับปรุงฐานข้อมูลเรียบร้อยแล้วครับ";
}

function fetchInspectionAndLicenses() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ans = ss.getSheetByName("EvaluationAnswers");
  var lic = ss.getSheetByName("LicenseData");
  var mapEvaluation = {};
  
  if (ans) {
    var ad = ans.getDataRange().getValues();
    for (var j = ad.length - 1; j >= 1; j--) {
      var name = ad[j][1];
      if (!name) continue;
      var evalYear = ad[j][0] instanceof Date ? ad[j][0].getFullYear() + 543 : new Date().getFullYear() + 543;
      var evalKey = name + "_" + evalYear;
      if (!mapEvaluation[evalKey]) {
        var rawTimestamp = ad[j][0];
        mapEvaluation[evalKey] = rawTimestamp instanceof Date ? Utilities.formatDate(rawTimestamp, "GMT+7", "dd/MM/yyyy HH:mm") : String(rawTimestamp);
      }
    }
  }
  
  var list = [];
  if (lic) {
    var d = lic.getDataRange().getValues();
    for (var i = d.length - 1; i >= 1; i--) {
      var shopName = d[i][1];
      if (!shopName) continue;
      var thaiYear = d[i][6] ? Number(d[i][6]) : (d[i][0] instanceof Date ? d[i][0].getFullYear() + 543 : new Date().getFullYear() + 543);
      var comboKey = shopName + "_" + thaiYear;
      var importTimestamp = mapEvaluation[comboKey] || (d[i][0] instanceof Date ? Utilities.formatDate(d[i][0], "GMT+7", "dd/MM/yyyy HH:mm") : "-");
      var startD = d[i][3];
      var endD = d[i][4];
      
      var safeLicNo = d[i][2] ? (d[i][2] instanceof Date ? Utilities.formatDate(d[i][2], "GMT+7", "dd/MM/yyyy") : String(d[i][2])) : '-';
      var safeMemo = d[i][5] ? (d[i][5] instanceof Date ? Utilities.formatDate(d[i][5], "GMT+7", "dd/MM/yyyy") : String(d[i][5])) : '-';
      var safeStart = startD ? (startD instanceof Date ? Utilities.formatDate(startD, "GMT+7", "dd/MM/yyyy") : String(startD)) : '-';
      var safeEnd = endD ? (endD instanceof Date ? Utilities.formatDate(endD, "GMT+7", "dd/MM/yyyy") : String(endD)) : '-';

      list.push({
        shopName: String(shopName), 
        licenseNo: safeLicNo, 
        memo: safeMemo,
        importDate: String(importTimestamp), 
        thaiYear: thaiYear || 0, 
        startDate: safeStart,
        endDate: safeEnd
      });
    }
  }
  return list;
}

function updateLicenseRecord(
  name, no, s, e, m, bookNo, feeAmount, feeText, receiptBookNo, receiptNo, receiptDate, execName, execPos,
  cond31, cond32, bAddrNo, bMoo, bTumbon, bAmphoe, bProv, bPhone, nat, owner, oAddrNo, oMoo, oTrok, oRoad, oTumbon, oAmphoe, oProv, oPhone, bName, bType, docYear
) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("LicenseData");
  if (!sheet) return "⚠️ ไม่พบแท็บแผ่นงาน LicenseData";
  var data = sheet.getDataRange().getValues();
  var targetRow = -1;
  var inputYear = docYear ? Number(docYear) : (new Date().getFullYear() + 543);
  for (var i = data.length - 1; i > 0; i--) {
    if (data[i][1] == name && (data[i][6] ? Number(data[i][6]) : "") == inputYear) { targetRow = i + 1; break; }
  }
  
  var cleanExec = execName || "(นายละดม เชื้อช่วย)";
  if (cleanExec === "(นายสะดม เชื้อช่วย)") cleanExec = "(นายละดม เชื้อช่วย)";
  
  var val = [
    new Date(), 
    name, 
    no, 
    s ? new Date(s) : "-", 
    e ? new Date(e) : "-", 
    m || "-", 
    inputYear,
    bookNo || "-",
    feeAmount || "-",
    feeText || "-",
    receiptBookNo || "-",
    receiptNo || "-",
    receiptDate ? new Date(receiptDate) : "-",
    cleanExec,
    execPos || "นายกเทศมนตรีตำบลบางเป้า",
    cond31 || "-",
    cond32 || "-",
    bAddrNo || "-",
    bMoo || "-",
    bTumbon || "-",
    bAmphoe || "-",
    bProv || "-",
    bPhone || "-",
    nat || "-",
    owner || "-",
    oAddrNo || "-",
    oMoo || "-",
    oTrok || "-",
    oRoad || "-",
    oTumbon || "-",
    oAmphoe || "-",
    oProv || "-",
    oPhone || "-",
    bName || "-",
    bType || "-"
  ];
  
  // Expand sheet columns if less than 35
  if (sheet.getMaxColumns() < 35) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), 35 - sheet.getMaxColumns());
  }
  
  if (targetRow != -1) {
    val[0] = sheet.getRange(targetRow, 1).getValue(); 
    sheet.getRange(targetRow, 1, 1, 35).setValues([val]);
    return "✅ อัปเดตข้อมูลอนุมัติใบอนุญาตประจำปี " + inputYear + " เรียบร้อยครับ!";
  } else {
    sheet.appendRow(val);
    return "✅ ขึ้นทะเบียนใบอนุญาตฉบับใหม่เรียบร้อยครับ!";
  }
}

function getCompleteReportData(shopName, targetYear) {
  if (!shopName) return { general: {}, evaluation: {} };
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let generalObj = {}; let evalObj = {};
  try {
    const generalSheet = ss.getSheetByName('GeneralInfo');
    if (generalSheet) {
      const generalData = generalSheet.getDataRange().getDisplayValues(); 
      const generalHeaders = generalData[0];
      for (let i = generalData.length - 1; i > 0; i--) {
        let dateStr = String(generalData[i][0]).split(' ')[0];
        let parts = dateStr.split('/');
        let rYear = "";
        if (parts.length === 3) {
          let y = parseInt(parts[2], 10);
          if (y < 2500) y += 543;
          rYear = String(y);
        }
        if (generalData[i][1] === shopName && (!targetYear || rYear === String(targetYear))) { 
          for (let j = 0; j < generalHeaders.length; j++) {
            let key = generalHeaders[j] ? generalHeaders[j].toString().trim() : '';
            if (key) generalObj[key] = generalData[i][j];
          }
          generalObj['_raw'] = generalData[i];
          if (generalObj['วัตถุดิบและสารเคมี'] === undefined && generalData[i].length > 26) {
            generalObj['วัตถุดิบและสารเคมี'] = generalData[i][26] || "";
          }
          break; 
        }
      }
    }
    const evalSheet = ss.getSheetByName('EvaluationAnswers');
    if (evalSheet) {
      const evalData = evalSheet.getDataRange().getDisplayValues();
      const evalHeaders = evalData[0];
      for (let i = evalData.length - 1; i > 0; i--) {
        let dateStr = String(evalData[i][0]).split(' ')[0];
        let parts = dateStr.split('/');
        let rYear = "";
        if (parts.length === 3) {
          let y = parseInt(parts[2], 10);
          if (y < 2500) y += 543;
          rYear = String(y);
        }
        if (evalData[i][1] === shopName && (!targetYear || rYear === String(targetYear))) { 
          evalObj['rowIndex'] = i + 1; 
          for (let j = 0; j < evalHeaders.length; j++) {
            let key = evalHeaders[j] ? evalHeaders[j].toString().trim() : '';
            if (key) evalObj[key] = evalData[i][j];
          }
          evalObj['_raw'] = evalData[i];
          break; 
        }
      }
    }
    return { general: generalObj, evaluation: evalObj };
  } catch (e) { return { general: {}, evaluation: {} }; }
}

function keepPhoneText_(value) { return "'" + String(value || '').trim(); }

function getShopGeneralInfo(shopName) {
  try {
    var reportData = getCompleteReportData(shopName);
    if (!reportData || !reportData.general) return null;
    var g = reportData.general;
    var raw = g._raw || [];
      return {
        businessType: g['ประเภทกิจการ'] || raw[2] || '', ownerName: g['ชื่อผู้ดำเนินกิจการ'] || raw[3] || '',
        addressNo: g['ตั้งอยู่เลขที่'] || raw[4] || '', moo: g['หมู่ที่'] || raw[5] || '', road: g['ถนน'] || raw[6] || '',
        phoneOwner: g['โทรศัพท์ผู้ดำเนิน'] || raw[10] || '', phoneShop: g['โทรศัพท์ร้าน'] || raw[11] || '',
        buildingType: g['ลักษณะอาคาร'] || '', buildingDetail: g['จำนวนชั้น/โรงเรือน/โกดัง'] || g['รายละเอียดอาคารเพิ่ม'] || '',
        machineCount: g['จำนวนเครื่องจักร (ตัว)'] || g['จำนวนเครื่องจักร'] || '0', machineHp: g['รวมจำนวนแรงม้า'] || g['รวมกำลังแรงม้า'] || '0',
        workDays: g['ระยะเวลาการทำงาน (วัน/สัปดาห์)'] || g['จำนวนวันทำงาน'] || '6', workerMale: g['พนักงานชาย (คน)'] || g['คนงานชาย'] || '0', workerFemale: g['พนักงานหญิง (คน)'] || g['คนงานหญิง'] || '0',
        workerTotal: g['รวมพนักงาน (คน)'] || g['รวมบุคลากร'] || '0', startTime: g['ตั้งแต่เวลา'] || g['ช่วงเวลาเริ่มงาน'] || '08:00',
        endTime: g['ถึงเวลา'] || g['ช่วงเวลาเลิกงาน'] || '17:00', materials: g['วัตถุดิบและสารเคมี'] || g['วัสดุและสารเคมี'] || ''
      };
  } catch (e) { return null; }
}  

function getLicensePrintData(shopName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var generalData = ss.getSheetByName("GeneralInfo") ? ss.getSheetByName("GeneralInfo").getDataRange().getDisplayValues() : [];
  var licenseData = ss.getSheetByName("LicenseData") ? ss.getSheetByName("LicenseData").getDataRange().getDisplayValues() : [];
  
  var info = {};
  if (generalData.length > 0) {
    var headers = generalData[0];
    for (var i = generalData.length - 1; i > 0; i--) {
      if (generalData[i][1] === shopName) {
        for (var j = 0; j < headers.length; j++) {
            info[headers[j]] = generalData[i][j];
          }
          info['_raw'] = generalData[i];
          break;
      }
    }
  }
  
  var licInfo = {};
  if (licenseData.length > 0) {
    for (var k = licenseData.length - 1; k > 0; k--) {
      if (licenseData[k][1] === shopName) {
        // Read existing fields
        licInfo.bookNo = licenseData[k][7] || "";
        licInfo.licenseNo = licenseData[k][2] || "";
        licInfo.startDate = licenseData[k][3] || "";
        licInfo.endDate = licenseData[k][4] || "";
        licInfo.feeAmount = licenseData[k][8] || "";
        licInfo.feeText = licenseData[k][9] || "";
        licInfo.receiptBookNo = licenseData[k][10] || "";
        licInfo.receiptNo = licenseData[k][11] || "";
        licInfo.receiptDate = licenseData[k][12] || "";
        licInfo.execName = licenseData[k][13] || "";
        licInfo.execPos = licenseData[k][14] || "";
        licInfo.condition31 = licenseData[k][15] || "";
        licInfo.condition32 = licenseData[k][16] || "";
        
        // Read custom fields
        licInfo.bAddrNo = licenseData[k][17] || "";
        licInfo.bMoo = licenseData[k][18] || "";
        licInfo.bTumbon = licenseData[k][19] || "";
        licInfo.bAmphoe = licenseData[k][20] || "";
        licInfo.bProv = licenseData[k][21] || "";
        licInfo.bPhone = licenseData[k][22] || "";
        licInfo.nat = licenseData[k][23] || "";
        
        licInfo.owner = licenseData[k][24] || "";
        licInfo.oAddrNo = licenseData[k][25] || "";
        licInfo.oMoo = licenseData[k][26] || "";
        licInfo.oTrok = licenseData[k][27] || "";
        licInfo.oRoad = licenseData[k][28] || "";
        licInfo.oTumbon = licenseData[k][29] || "";
        licInfo.oAmphoe = licenseData[k][30] || "";
        licInfo.oProv = licenseData[k][31] || "";
        licInfo.oPhone = licenseData[k][32] || "";
        licInfo.bName = licenseData[k][33] || "";
        licInfo.bType = licenseData[k][34] || "";
        break;
      }
    }
  }
  
  return { general: info, license: licInfo };
}

function createLicenseTemplateDoc() {
  const doc = DocumentApp.create('แบบฟอร์มใบอนุญาต (แม่แบบ)');
  const body = doc.getBody();
  
  body.appendParagraph('(ตราครุฑ)').setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendParagraph('ใบอนุญาต').setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendParagraph('ประกอบกิจการที่เป็นอันตรายต่อสุขภาพ').setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendParagraph('');
  body.appendParagraph('เล่มที่ {{bookNo}} เลขที่ {{licenseNo}} / {{docYear}}');
  body.appendParagraph('');
  body.appendParagraph('(1) เจ้าพนักงานท้องถิ่นอนุญาตให้ {{owner}} สัญชาติ {{nat}}');
  body.appendParagraph('อยู่บ้านเลขที่ {{oAddrNo}} หมู่ที่ {{oMoo}} ตรอก/ซอย {{oTrok}} ถนน {{oRoad}}');
  body.appendParagraph('ตำบล/แขวง {{oTumbon}} อำเภอ/เขต {{oAmphoe}} จังหวัด {{oProv}}');
  body.appendParagraph('หมายเลขโทรศัพท์ {{oPhone}}');
  body.appendParagraph('');
  body.appendParagraph('ชื่อสถานประกอบกิจการที่เป็นอันตรายต่อสุขภาพ ประเภท {{bType}}');
  body.appendParagraph('โดยใช้ชื่อสถานที่ {{bName}}');
  body.appendParagraph('ตั้งอยู่บ้านเลขที่ {{oAddrNo}} หมู่ที่ {{oMoo}} ตำบล {{oTumbon}} อำเภอ {{oAmphoe}} จังหวัด {{oProv}}');
  body.appendParagraph('หมายเลขโทรศัพท์ {{oPhone}}');
  body.appendParagraph('');
  body.appendParagraph('เสียค่าธรรมเนียมปีละ {{fee}} บาท ({{feeT}})');
  body.appendParagraph('ตามใบเสร็จรับเงินเล่มที่ {{rBook}} เลขที่ {{rNo}} ลงวันที่ {{rDateD}} เดือน {{rDateM}} พ.ศ. {{rDateY}}');
  body.appendParagraph('ผู้รับใบอนุญาตต้องปฏิบัติตามหลักเกณฑ์ วิธีการและเงื่อนไขที่กำหนดในข้อกำหนดของท้องถิ่น');
  body.appendParagraph('');
  body.appendParagraph('(2) หากปรากฏในภายหลังว่าการประกอบกิจการที่ได้รับอนุญาตนี้เป็นการขัดต่อกฎหมายอื่นที่เกี่ยวข้อง โดยมิอาจแก้ไขได้ เจ้าพนักงานท้องถิ่นอาจพิจารณาให้เพิกถอนการอนุญาตนี้ได้');
  body.appendParagraph('(3) ผู้รับใบอนุญาตต้องปฏิบัติตามเงื่อนไขเฉพาะดังต่อไปนี้อีกด้วย คือ');
  body.appendParagraph('   3.1) ...............................................................................................................................');
  body.appendParagraph('   3.2) ...............................................................................................................................');
  body.appendParagraph('');
  body.appendParagraph('(4) ใบอนุญาตฉบับนี้ออกให้เมื่อวันที่ {{sDateD}} เดือน {{sDateM}} พ.ศ. {{sDateY}}');
  body.appendParagraph('(5) ใบอนุญาตฉบับนี้สิ้นอายุวันที่ {{eDateD}} เดือน {{eDateM}} พ.ศ. {{eDateY}}');
  body.appendParagraph('');
  body.appendParagraph('(ลงชื่อ).......................................................');
  body.appendParagraph('{{execName}}');
  body.appendParagraph('ตำแหน่ง {{execPos}}');
  body.appendParagraph('เจ้าพนักงานท้องถิ่น');
  
  const file = DriveApp.getFileById(doc.getId());
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);
  PropertiesService.getScriptProperties().setProperty('LICENSE_TEMPLATE_ID', doc.getId());
  
  return doc.getUrl();
}

function saveLicenseTemplateId(id) {
  PropertiesService.getScriptProperties().setProperty('LICENSE_TEMPLATE_ID', id);
  return "บันทึก ID สำเร็จ";
}

function generateLicenseFromDocTemplate(shopName) {
  const templateId = PropertiesService.getScriptProperties().getProperty('LICENSE_TEMPLATE_ID');
  if (!templateId) return { error: 'NO_TEMPLATE_ID' };
  
  const data = getLicensePrintData(shopName);
  let g = data.general || {};
  let l = data.license || {};
  
  let bNo = l.bookNo && l.bookNo !== '-' ? l.bookNo : '.......';
  let lNo = l.licenseNo && l.licenseNo !== '-' ? l.licenseNo : '................';
  let yearMatch = lNo.match(/\/(25\d{2})/);
  let docYear = yearMatch ? yearMatch[1] : (new Date().getFullYear() + 543).toString();
  if(lNo.includes('/')) lNo = lNo.split('/')[0];
  
  function formatThaiDate(dateStr) {
    if(!dateStr || dateStr === '-') return {d:'.......', m:'................', y:'.......'};
    let parts = dateStr.split('T')[0].split('-');
    if(parts.length < 3 && dateStr.includes('/')) {
      parts = dateStr.split('/');
      if(parts.length === 3) {
        let yStr = parts[2];
        let yNum = parseInt(yStr, 10);
        if (yStr.length !== 4) yNum += 2500;
        if (yNum < 2500) yNum += 543;
        return { d: parseInt(parts[0]).toString(), m: getThaiMonth(parseInt(parts[1])), y: yNum.toString() };
      }
    }
    if(parts.length === 3) {
      let yNum = parseInt(parts[0], 10);
      if (yNum < 2500) yNum += 543;
      return { d: parseInt(parts[2]).toString(), m: getThaiMonth(parseInt(parts[1])), y: yNum.toString() };
    }
    return {d:'.......', m:'................', y:'.......'};
  }
  function getThaiMonth(m) {
    const months = ["", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    return months[m] || '................';
  }
  
  let rDate = formatThaiDate(l.receiptDate);
  let sDate = formatThaiDate(l.startDate);
  let eDate = formatThaiDate(l.endDate);
  
  let exName = l.execName && l.execName !== '-' ? l.execName : '(นายสะดม เชื้อช่วย)';
  if (exName === '(นายละดม เชื้อช่วย)') exName = '(นายสะดม เชื้อช่วย)';
  let exPos = l.execPos && l.execPos !== '-' ? l.execPos : 'นายกเทศมนตรีตำบลบางเป้า';
  
  const file = DriveApp.getFileById(templateId).makeCopy('ใบอนุญาต_' + shopName);
  const doc = DocumentApp.openById(file.getId());
  const body = doc.getBody();
  
  body.replaceText('{{bookNo}}', bNo);
  body.replaceText('{{licenseNo}}', lNo);
  body.replaceText('{{docYear}}', docYear);
  body.replaceText('{{owner}}', g['ชื่อผู้ดำเนินกิจการ'] || '...........................................');
  body.replaceText('{{nat}}', 'ไทย');
  body.replaceText('{{oAddrNo}}', g['เลขที่'] || '.......');
  body.replaceText('{{oMoo}}', g['หมู่'] || '...');
  body.replaceText('{{oTrok}}', '.......');
  body.replaceText('{{oRoad}}', g['ถนน'] || '.......');
  body.replaceText('{{oTumbon}}', g['ตำบล'] || 'บางเป้า');
  body.replaceText('{{oAmphoe}}', g['อำเภอ'] || 'กันตัง');
  body.replaceText('{{oProv}}', g['จังหวัด'] || 'ตรัง');
  body.replaceText('{{oPhone}}', g['โทรศัพท์ร้าน'] || g['โทรศัพท์ผู้ดำเนินกิจการ'] || '..........................');
  
  body.replaceText('{{bType}}', g['ประเภทกิจการ'] || '...................................................');
  body.replaceText('{{bName}}', g['ชื่อสถานประกอบการ'] || '...........................................');
  
  body.replaceText('{{fee}}', formatFeeAmount(l.feeAmount) || '...........');
  body.replaceText('{{feeT}}', formatFeeText(l.feeText) || '.......................................');
  body.replaceText('{{rBook}}', l.receiptBookNo && l.receiptBookNo !== '-' ? l.receiptBookNo : '.......');
  body.replaceText('{{rNo}}', l.receiptNo && l.receiptNo !== '-' ? l.receiptNo : '.......');
  
  body.replaceText('{{rDateD}}', rDate.d);
  body.replaceText('{{rDateM}}', rDate.m);
  body.replaceText('{{rDateY}}', rDate.y);
  body.replaceText('{{sDateD}}', sDate.d);
  body.replaceText('{{sDateM}}', sDate.m);
  body.replaceText('{{sDateY}}', sDate.y);
  body.replaceText('{{eDateD}}', eDate.d);
  body.replaceText('{{eDateM}}', eDate.m);
  body.replaceText('{{eDateY}}', eDate.y);
  
  body.replaceText('{{execName}}', exName);
  body.replaceText('{{execPos}}', exPos);
  
  doc.saveAndClose();
  
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  return { docId: file.getId() };
}

function formatPhoneForSheet(numStr) {
  let s = String(numStr).trim();
  if (s && !s.startsWith('0') && s.length >= 8) s = '0' + s;
  return s ? "'" + s : "";
}

function formatThaiDate(dateStr) {
  if (!dateStr) return "";
  let d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    let parts = String(dateStr).split(/[\/\- ]/);
    if (parts.length >= 3) {
      if (parts[0].length === 4) d = new Date(parts[0], parts[1]-1, parts[2].substring(0,2));
      else d = new Date(parts[2].substring(0,4), parts[1]-1, parts[0]);
    }
  }
  if (isNaN(d.getTime())) return String(dateStr).split(' ')[0];
  
  const thaiMonths = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
  return d.getDate() + " " + thaiMonths[d.getMonth()] + " " + (d.getFullYear() + 543);
}

function formatFeeAmount(val) {
  if (!val || val === '-') return '';
  let s = String(val).trim();
  if (!s.endsWith('.-')) s += '.-';
  return s;
}

function formatFeeText(val) {
  if (!val || val === '-') return '';
  let s = String(val).trim();
  if (!s.startsWith('-')) s = '-' + s;
  if (!s.endsWith('-')) s = s + '-';
  return s;
}

function exportUsingSheetTemplate(shopName) {
  try {
    const templateId = '1uyFaL2xxUouBM5CV-_WdWlNHWHZWQQ9XhrVldvV3DEY';
    
    const data = getLicensePrintData(shopName);
    let g = data.general || {};
    let l = data.license || {};
    
    let bNo = l.bookNo && l.bookNo !== '-' ? l.bookNo : '';
    let lNo = l.licenseNo && l.licenseNo !== '-' ? l.licenseNo : '';
    let yearMatch = lNo.match(/\/(25\d{2})/);
    let docYear = yearMatch ? yearMatch[1] : (new Date().getFullYear() + 543).toString();
    if(lNo.includes('/')) lNo = lNo.split('/')[0];
    
    function formatThaiDate(dateStr) {
      if(!dateStr || dateStr === '-') return {d:'', m:'', y:'', full:''};
      dateStr = String(dateStr).trim();
      let parts = dateStr.split('T')[0].split('-');
      if(parts.length < 3 && dateStr.includes('/')) {
        parts = dateStr.split('/');
        if(parts.length === 3) {
          let yStr = parts[2].trim();
          let yNum = parseInt(yStr, 10);
          if (yStr.length !== 4 && yNum < 100) yNum += 2500;
          if (yNum < 2500) yNum += 543;
          let y = yNum.toString();
          return { d: parseInt(parts[0]).toString(), m: getThaiMonth(parseInt(parts[1])), y: y, full: parseInt(parts[0]) + ' ' + getThaiMonth(parseInt(parts[1])) + ' ' + y };
        }
      }
      if(parts.length === 3) {
        let yNum = parseInt(parts[0].trim(), 10);
        if (yNum < 2500) yNum += 543;
        let y = yNum.toString();
        return { d: parseInt(parts[2]).toString(), m: getThaiMonth(parseInt(parts[1])), y: y, full: parseInt(parts[2]) + ' ' + getThaiMonth(parseInt(parts[1])) + ' ' + y };
      }
      return {d:'', m:'', y:'', full:''};
    }
    function getThaiMonth(m) {
      const months = ["", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
      return months[m] || '';
    }
    
    let rDate = formatThaiDate(l.receiptDate);
    let sDate = formatThaiDate(l.startDate);
    let eDate = formatThaiDate(l.endDate);
    
    let bType = g['ประเภทกิจการ'] || '';
    let bType1 = bType;
    let bType2 = '';
    if (bType.length > 90) {
       let splitIndex = bType.lastIndexOf(' ', 90);
       if (splitIndex === -1) splitIndex = 90;
       bType1 = bType.substring(0, splitIndex);
       bType2 = bType.substring(splitIndex).trim();
    }
    
    let exName = l.execName && l.execName !== '-' ? l.execName : '';
    let exPos = l.execPos && l.execPos !== '-' ? l.execPos : '';
    
    const sourceSs = SpreadsheetApp.openById(templateId);
    let templateSheet = sourceSs.getSheetByName('แบบฟอร์มใบอนุญาต');
    
    // Fallback in case they didn't name it exactly or haven't moved it yet
    let ss, file, sheets;
    if (templateSheet) {
      ss = SpreadsheetApp.create('ใบอนุญาต_' + shopName);
      file = DriveApp.getFileById(ss.getId());
      const newSheet = templateSheet.copyTo(ss);
      newSheet.setName('ใบอนุญาต');
      const defaultSheet = ss.getSheets()[0];
      if (defaultSheet && defaultSheet.getName() !== 'ใบอนุญาต') {
        ss.deleteSheet(defaultSheet);
      }
      sheets = [newSheet];
    } else {
      // Fallback: Just copy the whole file like before (if it's the old template)
      file = DriveApp.getFileById(templateId).makeCopy('ใบอนุญาต_' + shopName);
      ss = SpreadsheetApp.openById(file.getId());
      sheets = ss.getSheets();
    }
    
    for (let i = 0; i < sheets.length; i++) {
       let sheet = sheets[i];
       
       const replacements = {
         '<<bNo>>': bNo,
         '<<lNo>>': lNo,
         '<<docYear>>': docYear,
         '<<owner>>': g['ชื่อผู้ดำเนินกิจการ'] || '',
         '<<nat>>': l.nat && l.nat !== '-' ? l.nat : 'ไทย',
         '<<oAddrNo>>': g['ตั้งอยู่เลขที่'] || l.oAddrNo || '',
         '<<oMoo>>': g['หมู่ที่'] || l.oMoo || '',
         '<<oSoi>>': l.oSoi || l.oTrok || '',
         '<<oRoad>>': g['ถนน'] || l.oRoad || '',
         '<<oTumbon>>': g['ตำบล'] || l.oTumbon || 'บางเป้า',
         '<<oAmphoe>>': g['อำเภอ'] || l.oAmphoe || 'กันตัง',
         '<<oProv>>': g['จังหวัด'] || l.oProv || 'ตรัง',
         '<<oPhone>>': formatPhoneForSheet(g['โทรศัพท์ผู้ดำเนิน'] || l.oPhone || ''),
         
         '<<bType1>>': bType1,
         '<<bType2>>': bType2,
         '<<bName>>': g['ชื่อสถานประกอบการ'] || g['ชื่อสถานประกอบกิจการ'] || (g._raw ? g._raw[1] : null) || l.bName || '',
         '<<bAddrNo>>': l.bAddrNo && l.bAddrNo !== '-' ? l.bAddrNo : (g['ตั้งอยู่เลขที่'] || ''),
         '<<bMoo>>': l.bMoo && l.bMoo !== '-' ? l.bMoo : (g['หมู่ที่'] || ''),
         '<<bTumbon>>': l.bTumbon && l.bTumbon !== '-' ? l.bTumbon : (g['ตำบล'] || 'บางเป้า'),
         '<<bAmphoe>>': l.bAmphoe && l.bAmphoe !== '-' ? l.bAmphoe : (g['อำเภอ'] || 'กันตัง'),
         '<<bProv>>': l.bProv && l.bProv !== '-' ? l.bProv : (g['จังหวัด'] || 'ตรัง'),
         '<<bPhone>>': formatPhoneForSheet(l.bPhone && l.bPhone !== '-' ? l.bPhone : (g['โทรศัพท์ร้าน'] || '')),
         
         '<<fee>>': formatFeeAmount(l.feeAmount),
         '<<feeT>>': formatFeeText(l.feeText),
         '<<rBook>>': l.receiptBookNo && l.receiptBookNo !== '-' ? l.receiptBookNo : '',
         '<<rNo>>': l.receiptNo && l.receiptNo !== '-' ? l.receiptNo : '',
         
         '<<rDate.d>>': rDate.d,
         '<<rDate.m>>': rDate.m,
         '<<rDate.y>>': rDate.y,
         '<<rDate.full>>': rDate.full,
         
         '<<sDate.d>>': sDate.d,
         '<<sDate.m>>': sDate.m,
         '<<sDate.y>>': sDate.y,
         '<<sDate.full>>': sDate.full,
         
         '<<eDate.d>>': eDate.d,
         '<<eDate.m>>': eDate.m,
         '<<eDate.y>>': eDate.y,
         '<<eDate.full>>': eDate.full,
         
         '<<condition31>>': l.condition31 && l.condition31 !== '-' ? l.condition31 : '',
         '<<condition32>>': l.condition32 && l.condition32 !== '-' ? l.condition32 : '',
         
         '<<execName>>': exName,
         '<<execPos>>': exPos
       };
       
       for (let key in replacements) {
         let finder = sheet.createTextFinder(key);
         if (key === '<<execPos>>' || key.includes('condition')) {
           let ranges = finder.findAll();
           for (let i = 0; i < ranges.length; i++) {
             ranges[i].setWrap(true);
           }
         }
         finder.replaceAllWith(replacements[key] || ' ');
       }
    }
    
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    const fileId = file.getId();
    
    const pdfUrl = `https://docs.google.com/spreadsheets/d/${fileId}/export?format=pdf&portrait=true&size=A4&fitw=true`;
    const excelUrl = file.getUrl();
    
    return { success: true, pdfUrl: pdfUrl, excelUrl: excelUrl, sheetUrl: file.getUrl() };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}
  

function exportReportUsingSheetTemplate(shopName, targetYear) {
  try {
    const data = getCompleteReportData(shopName, targetYear);
    const g = data.general || {};
    const ev = data.evaluation || {};
    if (!g || !g._raw || g._raw.length === 0) return { success: false, error: "ไม่พบข้อมูลร้านค้า กรุณาบันทึกข้อมูลก่อนส่งออก" };
    const shopNameVal = shopName;
    
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
    let raw = g['_raw'] || [];
    let bType = g['ประเภทกิจการ'] || raw[2] || '';
    let bType1 = bType; let bType2 = '';
    if (bType.length > 90) {
       let splitIndex = bType.lastIndexOf(' ', 90);
       if (splitIndex === -1) splitIndex = 90;
       bType1 = bType.substring(0, splitIndex);
       bType2 = bType.substring(splitIndex).trim();
    }
    
    let bldgStyle = String(g['ลักษณะอาคาร'] || raw[14] || '');
    let bldgDet = String(g['รายละเอียดจำนวนชั้น'] || g['รายละเอียดอาคาร'] || raw[15] || '');
    
    // Setup building placeholders
    let b1c='[  ]', b2c='[  ]', b3c='[  ]', b4c='[  ]', b5c='[  ]', boc='[  ]';
    let b1n='', b2n='', b3n='', b4n='', b5n='', bot='';
    
    if (bldgStyle.indexOf('อาคารโรงงาน') > -1 || bldgStyle.indexOf('เอกเทศ') > -1) { b1c = '[✓]'; b1n = bldgDet; }
    else if (bldgStyle.indexOf('พาณิชย์') > -1) { b2c = '[✓]'; b2n = bldgDet; }
    else if (bldgStyle.indexOf('สำนักงาน') > -1) { b3c = '[✓]'; b3n = bldgDet; }
    else if (bldgStyle.indexOf('โรงเรือน') > -1) { b4c = '[✓]'; b4n = bldgDet; }
    else if (bldgStyle.indexOf('โกดัง') > -1) { b5c = '[✓]'; b5n = bldgDet; }
    else if (bldgStyle) { boc = '[✓]'; bot = bldgStyle + (bldgDet ? ' ' + bldgDet : ''); }
    
    // Complaint logic
    let compIssues = String(g['ปัญหาที่เคยถูกร้องเรียน'] || g['ปัญหา/ข้อร้องเรียน'] || raw[25] || '');
    let compText = String(g['ประวัติการถูกร้องเรียน'] || g['การถูกร้องเรียน'] || raw[24] || '');
    
    let compCount = "0";
    if (compText.includes('เคย')) {
       let m = compText.match(/\d+/);
       if (m) compCount = m[0];
       else compCount = "1";
    }
    
    // Materials logic
    let matsRaw = String(g['วัตถุดิบและสารเคมี'] || raw[26] || '');
    let matLines = matsRaw.split(/[\n,;]+/);
    let m1n='', m1q='', m2n='', m2q='', m3n='', m3q='', m4n='', m4q='';
    
    for (let i = 0; i < matLines.length && i < 4; i++) {
        let line = matLines[i].replace(/^\d+[\.\)]\s*/, '').trim(); 
        if(!line || line === 'ไม่มีการระบุวัตถุดิบและสารเคมี') continue;
        let match = line.match(/^(.*?)\s+([\d,]+(?:\.\d+)?\s*\/.*)$/);
        let n = line, q = '';
        if (match) { n = match[1].trim(); q = match[2].trim(); }
        else {
           let m2 = line.match(/^(.*?)\((.*?)\)$/);
           if (m2) { n = m2[1].trim(); q = m2[2].trim(); }
        }
        if (i===0) { m1n = n; m1q = q; }
        if (i===1) { m2n = n; m2q = q; }
        if (i===2) { m3n = n; m3q = q; }
        if (i===3) { m4n = n; m4q = q; }
    }
    
    // Comment split
    let evRaw = ev['_raw'] || [];
    let comment = String(ev['หมายเหตุ/ข้อเสนอแนะเพิ่มเติม'] || ev['ข้อเสนอแนะเพิ่มเติม'] || ev['ข้อเสนอแนะ/สรุปผลการตรวจประเมิน'] || ev['ข้อเสนอแนะ'] || evRaw[evRaw.length - 5] || '');
    let sum1 = comment; let sum2 = '';
    if (comment.length > 100) {
       let sIdx = comment.lastIndexOf(' ', 100);
       if (sIdx === -1) sIdx = 100;
       sum1 = comment.substring(0, sIdx);
       sum2 = comment.substring(sIdx).trim();
    }
    
    let inspDate = ev['วันที่ลงบันทึก'] || evRaw[evRaw.length - 1] || g['Timestamp'] || new Date();
    inspDate = formatThaiDate(inspDate);
    
    const replacements = {
        '<<ownerName>>': String(g['ชื่อผู้ดำเนินกิจการ'] || raw[3] || ''),
        '<<ownerPhone>>': formatPhoneForSheet(g['โทรศัพท์ผู้ดำเนิน'] || raw[10] || ''),
        '<<shopName>>': String(g['ชื่อสถานประกอบกิจการ'] || raw[1] || ''),
        '<<addrNo>>': String(g['ตั้งอยู่เลขที่'] || raw[5] || ''),
        '<<moo>>': String(g['หมู่ที่'] || raw[6] || ''),
        '<<road>>': String(g['ถนน'] || raw[7] || ''),
        '<<tumbon>>': String(g['ตำบล'] || raw[8] || ''),
        '<<amphoe>>': String(g['อำเภอ'] || raw[9] || ''),
        '<<prov>>': String(g['จังหวัด'] || raw[4] || ''),
        '<<phone>>': formatPhoneForSheet(g['โทรศัพท์ร้าน'] || raw[11] || ''),
        
        '<<bType1>>': bType1,
        '<<bType2>>': bType2,
        
        '<<animalType>>': String(g['ชนิดสัตว์ที่เลี้ยง'] || raw[12] || ''),
        '<<animalCount>>': String(g['จำนวนสัตว์ (ตัว)'] || raw[13] || '0'),
        
        '<<bldg1Check>>': b1c, '<<bldg1Count>>': b1n,
        '<<bldg2Check>>': b2c, '<<bldg2Count>>': b2n,
        '<<bldg3Check>>': b3c, '<<bldg3Count>>': b3n,
        '<<bldg4Check>>': b4c, '<<bldg4Count>>': b4n,
        '<<bldg5Check>>': b5c, '<<bldg5Count>>': b5n,
        '<<bldgOtherCheck>>': boc, '<<bldgOtherText>>': bot,
        
        '<<machineCount>>': String(g['จำนวนเครื่องจักร (ตัว)'] || raw[16] || '0'),
        '<<machineHp>>': String(g['รวมกำลังแรงม้า (HP)'] || raw[17] || '0'),
        
        '<<workerTotal>>': String(g['รวมพนักงาน (คน)'] || raw[18] || '0'),
        '<<workerMale>>': String(g['พนักงานชาย (คน)'] || raw[19] || '0'),
        '<<workerFemale>>': String(g['พนักงานหญิง (คน)'] || raw[20] || '0'),
        
        '<<workDays>>': String(g['จำนวนวันทำงาน (วัน/สัปดาห์)'] || raw[21] || '0'),
        '<<workStart>>': String(g['ช่วงเวลาเริ่มงาน'] || raw[22] || '-'),
        '<<workEnd>>': String(g['ช่วงเวลาเลิกงาน'] || raw[23] || '-'),
        
        '<<compNo>>': compText.includes('ไม่เคย') ? '[✓]' : '[  ]',
        '<<compYes>>': (!compText.includes('ไม่เคย') && compText.includes('เคย')) ? '[✓]' : '[  ]',
        '<<compCount>>': compCount,
        
        '<<c1>>': compIssues.includes('เสียงดัง') ? '[✓]' : '[  ]',
        '<<c2>>': compIssues.includes('ฝุ่น') || compIssues.includes('ควัน') ? '[✓]' : '[  ]',
        '<<c3>>': compIssues.includes('กลิ่น') ? '[✓]' : '[  ]',
        '<<c4>>': compIssues.includes('สารเคมี') ? '[✓]' : '[  ]',
        '<<c5>>': compIssues.includes('น้ำเสีย') ? '[✓]' : '[  ]',
        '<<c6>>': compIssues.includes('ขยะ') || compIssues.includes('สิ่งปฏิกูล') ? '[✓]' : '[  ]',
        '<<c7>>': compIssues.includes('พาหะ') ? '[✓]' : '[  ]',
        '<<c8>>': compIssues.includes('อื่นๆ') ? '[✓]' : '[  ]',
        '<<pestType>>': compIssues.includes('พาหะ') ? '........................' : '',
        '<<compOtherText>>': compIssues.includes('อื่นๆ') ? '........................' : '',
        
        '<<mat1Name>>': m1n, '<<mat1Qty>>': m1q,
        '<<mat2Name>>': m2n, '<<mat2Qty>>': m2q,
        '<<mat3Name>>': m3n, '<<mat3Qty>>': m3q,
        '<<mat4Name>>': m4n, '<<mat4Qty>>': m4q,
        
        '<<sumText1>>': sum1,
        '<<sumText2>>': sum2,
        '<<inspName>>': String(ev['ชื่อผู้ตรวจประเมิน'] || ev['ชื่อผู้ตรวจ'] || evRaw[evRaw.length - 3] || ''),
        '<<inspPos>>': String(ev['ตำแหน่งผู้ตรวจประเมิน'] || ev['ตำแหน่ง'] || evRaw[evRaw.length - 2] || ''),
        '<<inspDate>>': inspDate
    };
    
    // Add Q1 to Q35 evaluation results
    for (let i = 1; i <= 35; i++) {
        let rIndex = 2 + (i - 1) * 3;
        let fIndex = 3 + (i - 1) * 3;
        let cIndex = 4 + (i - 1) * 3;
        
        let rVal = String(evRaw[rIndex] || '');
        replacements['<<q' + i + 'y>>'] = (rVal === 'ใช่' || rVal === 'TRUE' || rVal === '✓') ? '✓' : '';
        replacements['<<q' + i + 'n>>'] = rVal === 'ไม่ใช่' ? '✓' : '';
        replacements['<<q' + i + 'na>>'] = (rVal === 'ไม่เกี่ยวข้อง' || rVal === 'N/A') ? '✓' : '';
        replacements['<<f' + i + '>>'] = String(evRaw[fIndex] || '');
        replacements['<<a' + i + '>>'] = String(evRaw[cIndex] || '');
    }
    
    // Fast memory replacement
    let dataRange = newSheet.getDataRange();
    let sheetData = dataRange.getValues();
    let formulas = dataRange.getFormulas();
    let dataChanged = false;
    for (let r = 0; r < sheetData.length; r++) {
      for (let c = 0; c < sheetData[r].length; c++) {
        if (formulas[r][c]) continue;
        let cellText = sheetData[r][c];
        if (cellText && typeof cellText === 'string' && cellText.includes('<<')) {
          let orig = cellText;
          for (let key in replacements) {
            if (cellText.includes(key)) {
              cellText = cellText.split(key).join(replacements[key] || '');
            }
          }
          if (orig !== cellText) {
            sheetData[r][c] = cellText;
            dataChanged = true;
          }
        }
      }
    }
    if (dataChanged) {
      dataRange.setValues(sheetData);
    }
    
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const fileId = file.getId();
    const pdfUrl = `https://docs.google.com/spreadsheets/d/${fileId}/export?format=pdf&portrait=true&size=A4&fitw=true`;
    const excelUrl = file.getUrl();
    
    return { success: true, pdfUrl: pdfUrl, excelUrl: excelUrl, sheetUrl: file.getUrl() };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}
function getPlaceholders() {
  const ss = SpreadsheetApp.openById('1uyFaL2xxUouBM5CV-_WdWlNHWHZWQQ9XhrVldvV3DEY');
  const sheet = ss.getSheetByName('แบบออกรายงานตรวจ');
  const data = sheet.getDataRange().getValues();
  let matches = new Set();
  for (let r=0; r<data.length; r++) {
    for (let c=0; c<data[r].length; c++) {
      let val = String(data[r][c]);
      let matchArr = val.match(/<<.*?>>/g);
      if (matchArr) {
        matchArr.forEach(m => matches.add(m));
      }
    }
  }
  return Array.from(matches).join(', ');
}
