function autoFillPlaceholders() {
  const ss = SpreadsheetApp.openById('1uyFaL2xxUouBM5CV-_WdWlNHWHZWQQ9XhrVldvV3DEY');
  const sheet = ss.getSheetByName('แบบออกรายงานตรวจ');
  if(!sheet) return "No sheet 'แบบออกรายงานตรวจ' found!";
  
  // First, map the questions from 'ตั้งค่าผู้ใช้งาน' to rX indices
  const config = ss.getSheetByName("ตั้งค่าผู้ใช้งาน");
  const configData = config.getDataRange().getValues();
  let dbQuestions = []; // Array of strings from column F
  for (var i = 1; i < configData.length; i++) {
    if (configData[i][5]) {
      dbQuestions.push(configData[i][5].toString().trim());
    }
  }
  
  // Now iterate through rows 37 to 100 in 'แบบออกรายงานตรวจ'
  // Match the text in column B to dbQuestions to find the 'rX' index
  let count = 0;
  for (let r = 37; r <= 100; r++) {
    let cellText = sheet.getRange(r, 2).getValue().toString().trim();
    if (!cellText) continue;
    
    // Find matching question in dbQuestions based on prefix or similarity
    let matchedIndex = -1;
    for (let j = 0; j < dbQuestions.length; j++) {
      let qText = dbQuestions[j];
      // Normalize texts: remove numbers, spaces, punctuation
      let normCell = cellText.replace(/[\\d\\.\\(\\)\\s]/g, '');
      let normQ = qText.replace(/[\\d\\.\\(\\)\\sข้อ:]/g, '');
      
      if (normCell.length > 5 && normQ.length > 5 && (normCell.includes(normQ) || normQ.includes(normCell))) {
        matchedIndex = j + 1; // 1-indexed (r1, r2, ...)
        break;
      }
    }
    
    if (matchedIndex !== -1) {
      // Write placeholders
      // If the question says "กรุณาประเมินในข้อย่อย", it doesn't have Yes/No/NA
      if (!dbQuestions[matchedIndex - 1].includes("กรุณาประเมินในข้อย่อย") && !dbQuestions[matchedIndex - 1].includes("ดังนี้")) {
        sheet.getRange(r, 13).setValue('<<q' + matchedIndex + 'y>>'); // M
        sheet.getRange(r, 14).setValue('<<q' + matchedIndex + 'n>>'); // N
        sheet.getRange(r, 15).setValue('<<q' + matchedIndex + 'na>>'); // O
      }
      sheet.getRange(r, 16).setValue('<<f' + matchedIndex + '>>'); // P (ข้อเท็จจริง)
      sheet.getRange(r, 20).setValue('<<a' + matchedIndex + '>>'); // T (คำแนะนำ)
      count++;
    }
  }
  return "Successfully filled placeholders for " + count + " rows!";
}
