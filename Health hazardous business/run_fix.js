function fixBadTargetYear() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const lic = ss.getSheetByName('LicenseData');
  if(lic) {
    let data = lic.getDataRange().getValues();
    for(let i=1; i<data.length; i++){
      if(data[i][1] === 'ร้าน ช่างกุย' && data[i][6] === 2570) {
        lic.getRange(i+1, 7).setValue(2569);
      }
    }
  }
}
