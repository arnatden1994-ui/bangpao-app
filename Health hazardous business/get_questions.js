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
