function debugMatch() {
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
  
  let out = [];
  for (let r = 37; r <= 42; r++) {
    let cellText = sheet.getRange(r, 2).getValue().toString().trim();
    if (!cellText) { out.push("Row " + r + ": EMPTY"); continue; }
    
    let normCell = cellText.replace(/[\\d\\.\\(\\)\\s]/g, '');
    let normQ0 = dbQuestions[0].replace(/[\\d\\.\\(\\)\\sข้อ:]/g, '');
    out.push("Row " + r + ": " + cellText + " | NormCell: " + normCell + " | NormQ0: " + normQ0);
  }
  return out.join("\\n");
}
