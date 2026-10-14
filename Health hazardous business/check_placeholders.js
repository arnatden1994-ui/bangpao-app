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
