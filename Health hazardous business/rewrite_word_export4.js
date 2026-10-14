const fs = require('fs');

const krutData = fs.readFileSync('krut-3-cm-Photoroom.png');
const krutBase64 = 'data:image/png;base64,' + krutData.toString('base64').replace(/\r?\n|\r/g, "");

let html = fs.readFileSync('JavaScript.html', 'utf8');
const start = html.indexOf('function triggerWordExportFromModal');
const end = html.indexOf('</script>', start);

if (start !== -1 && end !== -1) {
    let block = html.substring(start, end);
    const htmlStart = block.indexOf('let htmlContent');
    const htmlEnd = block.lastIndexOf('`;');
    
    if (htmlStart !== -1 && htmlEnd !== -1) {
        const newHtmlContent = `let htmlContent = \`
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>License</title>
<style>
@page WordSection1 {
size: 21cm 29.7cm;
margin: 1.5cm 2.0cm 2.0cm 2.5cm;
mso-page-orientation: portrait;
}
div.WordSection1 { page: WordSection1; }
body, p, table, tr, td, th {
font-family: 'TH SarabunPSK', 'TH Sarabun New', 'Sarabun', sans-serif;
}
body {
font-size: 16pt;
line-height: 1.4;
color: #000;
}
p {
margin: 0 0 5pt 0;
text-align: justify;
}
.center { text-align: center; }
.bold { font-weight: bold; }
.indent { text-indent: 1.5cm; }
table.border {
width: 100%;
border-collapse: collapse;
font-size: 14pt;
}
table.border th, table.border td {
border: 1pt solid windowtext;
padding: 4pt;
text-align: center;
vertical-align: middle;
font-weight: normal;
}
</style>
</head>
<body>
<div class="WordSection1">

<p class="center" style="margin-top: 0; margin-bottom: 5pt;">
<img src="${krutBase64}" width="90" height="95">
</p>
<p class="center bold" style="font-size: 18pt; margin-top: 0pt; margin-bottom: 2pt;">ใบอนุญาต</p>
<p class="center bold" style="font-size: 18pt; margin-bottom: 15pt;">ประกอบกิจการที่เป็นอันตรายต่อสุขภาพ</p>

<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 5pt;">
<tr>
<td width="15%"></td>
<td width="85%" align="left" style="text-align: left; padding-left: 0;">
เล่มที่-........\${p.bNo}........ เลขที่........\${p.lNo}......../........\${p.docYear}........
</td>
</tr>
</table>

<p class="indent">
(1)เจ้าพนักงานท้องถิ่นอนุญาตให้........\${p.owner}........สัญชาติ........\${p.nat}........
อยู่บ้านเลขที่........\${p.oAddrNo}........หมู่ที่........\${p.oMoo}........ตรอก/ซอย........\${p.oTrok}........ถนน........\${p.oRoad}........
ตำบล/แขวง........\${p.oTumbon}........อำเภอ/เขต........\${p.oAmphoe}........จังหวัด........\${p.oProv}........
หมายเลขโทรศัพท์........\${p.oPhone}........
</p>

<p class="indent" style="margin-top: 10pt;">
ชื่อสถานประกอบกิจการที่เป็นอันตรายต่อสุขภาพ ประเภท........\${p.bType}........
โดยใช้ชื่อสถานที่........\${p.bName}........
ตั้งอยู่บ้านเลขที่........\${p.bAddrNo}........หมู่ที่........\${p.bMoo}........ตำบล/แขวง........\${p.bTumbon}........อำเภอ/เขต........\${p.bAmphoe}........จังหวัด........\${p.bProv}........
หมายเลขโทรศัพท์........\${p.bPhone}........
</p>

<p class="indent" style="margin-top: 10pt;">
เสียค่าธรรมเนียมปีละ........\${p.fee}........บาท (........\${p.feeT}........)
ตามใบเสร็จรับเงินเล่มที่........\${p.rBook}........เลขที่........\${p.rNo}........ลงวันที่........\${p.rDate.d}........เดือน........\${p.rDate.m}........พ.ศ.........\${p.rDate.y}........<br>
ผู้รับใบอนุญาตต้องปฏิบัติตามหลักเกณฑ์ วิธีการและเงื่อนไขที่กำหนดในข้อกำหนดของท้องถิ่น
</p>

<p class="indent" style="margin-top: 10pt;">
(2) หากปรากฏในภายหลังว่าการประกอบกิจการที่ได้รับอนุญาตนี้เป็นการขัดต่อกฎหมายอื่นที่เกี่ยวข้อง โดยมิอาจแก้ไขได้ เจ้าพนักงานท้องถิ่นอาจพิจารณาให้เพิกถอนการอนุญาตนี้ได้
</p>
<p class="indent">
(3) ผู้รับใบอนุญาตต้องปฏิบัติตามเงื่อนไขเฉพาะดังต่อไปนี้อีกด้วย คือ
</p>
<div style="padding-left: 1.5cm; margin-bottom: 10pt;">
3.1)........\${p.condition31 !== '-' && p.condition31 ? p.condition31 : '....................................................................................................................................'}........<br>
<span style="display:inline-block; margin-top:5pt;">3.2)........\${p.condition32 !== '-' && p.condition32 ? p.condition32 : '....................................................................................................................................'}........</span>
</div>

<p class="indent" style="margin-top: 10pt;">
(4) ใบอนุญาตฉบับนี้ออกให้เมื่อวันที่........\${p.sDate.d}........เดือน........\${p.sDate.m}........พ.ศ.........\${p.sDate.y}........<br>
(5) ใบอนุญาตฉบับนี้สิ้นอายุวันที่........\${p.eDate.d}........เดือน........\${p.eDate.m}........พ.ศ.........\${p.eDate.y}........
</p>

<table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 20pt; border: none;">
<tr>
<td width="50%" style="border: none;"></td>
<td width="50%" align="center" style="border: none; line-height: 1.5;">
(ลงชื่อ)................................................................<br>
( \${p.execName} )<br>
ตำแหน่ง \${p.execPos}<br>
เจ้าพนักงานท้องถิ่น
</td>
</tr>
</table>

<p style="margin-top: 25pt; font-size: 14pt; line-height: 1.35;">
คำเตือน (1) ผู้รับใบอนุญาตต้องแสดงใบอนุญาตนี้ไว้โดยเปิดเผยและเห็นได้ง่าย ณ สถานที่ประกอบกิจการตลอดเวลาที่ประกอบกิจการ หากฝ่าฝืนมีโทษปรับไม่เกิน ห้าร้อยบาท<br>
(2) หากประสงค์จะประกอบกิจการในปีต่อไปต้องยื่นคำขอต่ออายุใบอนุญาต<u>ก่อน</u>ใบอนุญาตสิ้นอายุ
</p>

<br clear="all" style="page-break-before:always" />

<p class="center bold" style="margin-top: 30pt; margin-bottom: 15pt; font-size: 16pt;">รายการเสียค่าธรรมเนียมหนังสือรับรองการแจ้ง</p>

<table class="border" style="margin-top: 20pt;">
<thead>
<tr>
<th rowspan="2" style="width: 15%;">วัน/เดือน/ปี<br>ที่ออกใบอนุญาต</th>
<th rowspan="2" style="width: 15%;">วัน/เดือน/ปี<br>ที่สิ้นอายุใบอนุญาต</th>
<th colspan="3" style="width: 45%;">ใบเสร็จรับเงิน</th>
<th rowspan="2" style="width: 25%;">(ลงชื่อ)<br>เจ้าพนักงานท้องถิ่น</th>
</tr>
<tr>
<th style="width: 15%;">เล่มที่</th>
<th style="width: 15%;">เลขที่</th>
<th style="width: 15%;">วัน/เดือน/ปี</th>
</tr>
</thead>
<tbody>
<tr style="height: 45pt;">
<td>\${p.sDate.full}</td>
<td>\${p.eDate.full}</td>
<td>\${p.rBook !== '-' ? p.rBook : '-'}</td>
<td>\${p.rNo !== '-' ? p.rNo : '-'}</td>
<td>\${p.rDate.full}</td>
<td>\${p.execName}<br>\${p.execPos}</td>
</tr>
<tr style="height: 45pt;"><td></td><td></td><td></td><td></td><td></td><td></td></tr>
<tr style="height: 45pt;"><td></td><td></td><td></td><td></td><td></td><td></td></tr>
<tr style="height: 45pt;"><td></td><td></td><td></td><td></td><td></td><td></td></tr>
<tr style="height: 45pt;"><td></td><td></td><td></td><td></td><td></td><td></td></tr>
<tr style="height: 45pt;"><td></td><td></td><td></td><td></td><td></td><td></td></tr>
</tbody>
</table>

</div>
</body>
</html>\``;
        
        block = block.substring(0, htmlStart) + newHtmlContent + block.substring(htmlEnd + 2);
        html = html.substring(0, start) + block + html.substring(end);
        fs.writeFileSync('JavaScript.html', html);
        console.log('Fixed export license html format perfectly.');
    } else {
        console.log('Could not find htmlStart or htmlEnd');
    }
} else {
    console.log('Could not find bounds');
}
