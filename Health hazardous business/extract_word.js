const fs = require('fs');

let oldFile = fs.readFileSync('JavaScript_version_180.html', 'utf8');
let lines = oldFile.split('\n');

let start = -1;
let end = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('function exportToWord(shopName) {')) {
        start = i;
    }
    if (start !== -1 && lines[i].includes('function togglePasswordVisibility() {')) {
        end = i - 1;
        break;
    }
}

if (start !== -1 && end !== -1) {
    let funcBody = lines.slice(start, end).join('\n');
    // Replace showCustomModal and closeCustomModal with Swal.fire
    funcBody = funcBody.replace(/showCustomModal\('⏳ รอสักครู่',\s*'กำลังแปลงข้อมูลลงในไฟล์ Word...',\s*'⏳'\);/g, 
        "Swal.fire({ title: 'กำลังสร้างไฟล์ Word...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });");
    funcBody = funcBody.replace(/showCustomModal\('⚠️ แจ้งเตือน',\s*'กรุณาระบุหรือเลือกชื่อร้านค้าก่อนส่งออกครับ',\s*'⚠️'\);/g, 
        "Swal.fire('ข้อผิดพลาด', 'กรุณาระบุหรือเลือกชื่อร้านค้าก่อนส่งออกครับ', 'warning');");
    funcBody = funcBody.replace(/showCustomModal\('❌ ไม่พบข้อมูล',\s*`ไม่พบข้อมูลของร้าน \"\${shopName}\" บนระบบคลาวด์ครับ`,\s*'❌'\);/g, 
        "Swal.fire('ข้อผิดพลาด', `ไม่พบข้อมูลของร้าน \"${shopName}\" บนระบบคลาวด์ครับ`, 'error');");
    funcBody = funcBody.replace(/closeCustomModal\(\);/g, "Swal.close();");
    
    // Add to JavaScript.html
    let target = fs.readFileSync('JavaScript.html', 'utf8');
    target += '\n\n' + funcBody;
    fs.writeFileSync('JavaScript.html', target);
    console.log("Successfully appended exportToWord to JavaScript.html");
} else {
    console.log("Failed to find function bounds");
}
