import React from 'react';
import { X, Printer, Download, FileText, CheckCircle2 } from 'lucide-react';
import { LicenseRecord, SignerSettings, DEFAULT_SIGNER_SETTINGS } from '../types/index.ts';
import { generateInspectionReportHtml, exportHtmlAsWord } from '../services/officialDocGenerator.ts';

interface PrintOfficialInspectionReportModalProps {
  license: LicenseRecord | null;
  isOpen: boolean;
  onClose: () => void;
  savedSignerSettings?: SignerSettings;
}

export const PrintOfficialInspectionReportModal: React.FC<PrintOfficialInspectionReportModalProps> = ({
  license,
  isOpen,
  onClose,
  savedSignerSettings,
}) => {
  if (!isOpen || !license) return null;

  const signers = savedSignerSettings || DEFAULT_SIGNER_SETTINGS;

  const businessName = license.businessName || 'ร้าน ช่างกุย';
  const ownerName = license.ownerName || 'นายโกวิทย์ กุ้งอุย';
  const phone = license.businessPhone || license.ownerPhone || '0812736558';
  const businessType = license.businessCategory || '7. กิจการเกี่ยวกับยานยนต์ เครื่องจักรหรือเครื่องกล';
  const addressNo = license.businessAddressNo || '195/1';
  const moo = license.businessMoo || '5';
  const road = license.businessStreet && license.businessStreet !== '-' ? license.businessStreet : '-';
  const subdistrict = license.businessSubdistrict || 'บางเป้า';
  const district = license.businessDistrict || 'กันตัง';
  const province = license.businessProvince || 'ตรัง';
  const inspectDate = license.approvalDate || '23 กรกฎาคม 2569';

  // Questions and default evaluation matching original template
  const criteriaList = [
    { group: 'สถานที่ตั้งและลักษณะอาคาร', isHeader: true },
    { num: '1', text: 'สถานที่ตั้งเหมาะสม ระยะห่างเป็นไปตามกฎหมาย', result: 'yes', fact: '', advice: '' },
    { num: '2', text: 'อาคารมีความมั่นคง แข็งแรง', result: 'yes', fact: 'ลักษณะเป็นบ้านแถวติดกัน พื้นที่โล่ง', advice: '' },
    { num: '3', text: 'มีทางหนีไฟ บันไดหนีไฟ หรือทางออกฉุกเฉิน ไม่มีสิ่งกีดขวาง มีป้ายหรือเครื่องหมายแสดงชัดเจน เป็นไปตามกฎหมายว่าด้วยการควบคุมอาคาร', result: 'na', fact: '', advice: '' },
    { num: '4', text: 'สถานประกอบกิจการมีการจัดแสงสว่างเหมาะสม เพียงพอ เป็นไปตามกฎหมายว่าด้วยการควบคุมอาคาร', result: 'yes', fact: '', advice: '' },
    { num: '5', text: 'สถานประกอบกิจการมีการระบายอากาศเหมาะสม เพียงพอ เป็นไปตามกฎหมายว่าด้วยการควบคุมอาคาร', result: 'yes', fact: '', advice: '' },
    { num: '6', text: 'สถานประกอบกิจการมีความสะอาด จัดวางสิ่งของเป็นระเบียบเรียบร้อย ปลอดภัย เป็นสัดส่วน และดูแลรักษาความสะอาดให้ถูกสุขลักษณะอย่างสม่ำเสมอ', result: 'yes', fact: '', advice: '' },
    
    { group: 'การสุขาภิบาลสถานประกอบกิจการ', isHeader: true },
    { num: '7', text: 'สถานประกอบกิจการมีห้องน้ำ ห้องส้วม อ่างหรือที่ล้างมือที่ สะอาด เพียงพอ ถูกสุขลักษณะ ดูแลรักษาความสะอาดเป็นประจำ', result: 'yes', fact: '', advice: '' },
    { num: '8', text: 'สถานประกอบกิจการมีการเก็บ รวบรวม กำจัดมูลฝอย และของเสียอันตรายที่ถูกสุขลักษณะ ดังนี้', result: '', isSubHeader: true },
    { num: '8.(1)', text: 'มีภาชนะบรรจุหรือภาชนะรองรับมูลฝอย สะอาด มีฝาปิด ไม่แตกหรือรั่วซึม และเพียงพอกับประเภทและปริมาณของมูลฝอย', result: 'yes', fact: 'รถขยะเทศบาลจัดเก็บ', advice: '' },
    { num: '8.(2)', text: 'บริเวณที่เก็บวางภาชนะรองรับมูลฝอย หรือสถานที่พักรวมมูลฝอย สะอาด ไม่มีกลิ่นเหม็น ไม่มีน้ำขัง และไม่เป็นแหล่งเพาะพันธุ์สัตว์และแมลงนำโรค', result: 'yes', fact: 'รถขยะเทศบาลจัดเก็บ', advice: '' },
    { num: '8.(3)', text: 'มีการกำจัดมูลฝอยอย่างถูกต้อง และเป็นไปตามข้อบัญญัติของท้องถิ่น', result: 'yes', fact: '', advice: '' },
    { num: '8.(4)', text: 'กรณีที่มีของเสียอันตราย วัตถุอันตราย มูลฝอยปนเปื้อนสารพิษ มูลฝอยอันตราย หรือมูลฝอยปนเปื้อนเลือดหรือสารคัดหลั่ง ดำเนินการเป็นไปตามกฎหมาย', result: 'na', fact: '', advice: '' },
    { num: '9', text: 'สถานประกอบกิจการมีการป้องกัน ควบคุม กำจัดแมลงและสัตว์พาหะนำโรค มิให้เป็นแหล่งเพาะพันธุ์และแพร่ระบาดของโรค', result: 'yes', fact: '', advice: '' },
    { num: '10', text: 'สถานประกอบกิจการมีการระบายน้ำที่เหมาะสม และดูแลมิให้มีน้ำท่วมขังบริเวณสถานประกอบกิจการ', result: 'yes', fact: '', advice: '' },
    { num: '11', text: 'สถานประกอบกิจการที่มีโรงอาหารหรือห้องครัวที่จัดไว้เพื่อการปรุงประกอบอาหารสำหรับผู้ปฏิบัติงาน มีการดำเนินการอย่างถูกต้องตามหลักสุขาภิบาลอาหาร', result: 'na', fact: '', advice: '' },
    { num: '12', text: 'สถานประกอบกิจการมีน้ำดื่มที่สะอาด เพียงพอสำหรับผู้ปฏิบัติงาน และมีภาชนะรองรับน้ำดื่มที่สะอาด', result: 'na', fact: '', advice: '' },

    { group: 'การควบคุมมลพิษ', isHeader: true },
    { num: '13', text: 'สถานประกอบกิจการมีระบบบำบัดน้ำเสียที่เหมาะสม สภาพใช้งานได้ดี และมีการจัดการน้ำเสียที่ถูกสุขลักษณะ หรือได้มาตรฐานตามที่กฎหมายกำหนด', result: 'na', fact: '', advice: '' },
    { num: '14', text: 'สถานประกอบกิจการมีการป้องกันควบคุมระดับเสียงรบกวน เป็นไปตามประกาศกระทรวงสาธารณสุข หรือกฎหมายว่าด้วยโรงงาน', result: 'yes', fact: '', advice: '' },
    { num: '15', text: 'สถานประกอบกิจการมีการป้องกันควบคุมฝุ่นละออง เป็นไปตามกฎหมายว่าด้วยโรงงาน หรือกฎหมายว่าด้วยการส่งเสริมและรักษาคุณภาพสิ่งแวดล้อม', result: 'na', fact: '', advice: '' },
    { num: '16', text: 'สถานประกอบกิจการมีการป้องกันควบคุมกลิ่นหรือไอสารเคมี เป็นไปตามกฎหมายว่าด้วยโรงงาน', result: 'na', fact: '', advice: '' },

    { group: 'ความปลอดภัยและอาชีวอนามัย', isHeader: true },
    { num: '17', text: 'อุปกรณ์ เครื่องมือ เครื่องจักร สายไฟ มีสภาพปลอดภัยต่อการใช้งาน มีการติดตั้งในลักษณะที่แข็งแรง มั่นคง ปลอดภัย โดยมีคำแนะนำในการป้องกันอันตราย และกรณีชำรุดต้องมีป้ายเตือน', result: 'yes', fact: '', advice: '' },
    { num: '18', text: 'มีการจัดวางหรือการจัดเก็บอุปกรณ์ เครื่องมือ เครื่องจักร หรือสายไฟ ต้องเป็นระเบียบ ไม่กีดขวางทางเดินและการปฏิบัติงาน และมีการดูแล ตรวจสอบ บำรุงรักษาให้อยู่ในสภาพดีตลอดเวลา', result: 'yes', fact: '', advice: '' },
    { num: '19', text: 'สถานประกอบกิจการมีการติดตั้งอุปกรณ์หรือเครื่องดับเพลิงอย่างเพียงพอ เหมาะสม สภาพดี พร้อมใช้งาน มีการฝึกซ้อมดับเพลิงและอพยพหนีไฟ หรือซ้อมแผนฉุกเฉิน', result: 'yes', fact: 'มีถังดับเพลิง 1 ถัง', advice: 'ควรตรวจสอบเป็นประจำ ตามวงรอบ' },
    { num: '20', text: 'สถานประกอบกิจการที่มีสารเคมีหรือวัตถุอันตราย ต้องจัดสถานที่ที่ปลอดภัยสำหรับจัดเก็บสารเคมีหรือวัตถุอันตราย มีป้ายแสดงชนิดหรือประเภทของสารเคมีหรือวัตถุอันตราย และเอกสารข้อมูลความปลอดภัย', result: 'na', fact: '', advice: '' },
    { num: '21', text: 'สถานประกอบกิจการที่มีความเสี่ยงจากการสัมผัสสารเคมี/วัตถุอันตราย ต้องจัดให้มีที่ชำระร่างกาย และที่ล้างตาฉุกเฉิน', result: 'na', fact: '', advice: '' },
    { num: '22', text: 'สถานประกอบกิจการมีอุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคลสำหรับผู้ปฏิบัติงานที่เพียงพอ เหมาะสมตามลักษณะงาน', result: 'na', fact: '', advice: '' },
    { num: '23', text: 'สถานประกอบกิจการมีการตรวจสุขภาพผู้ปฏิบัติงาน ตามกฎหมายว่าด้วยความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน', result: 'yes', fact: 'ตรวจสุขภาพประจำปีล่าสุดปี 68', advice: '' },

    { group: 'การป้องกันเหตุรำคาญ', isHeader: true },
    { num: '24', text: 'สถานประกอบกิจการมีมาตรการควบคุมและป้องกันปัญหาเหตุรำคาญแก่ชุมชนและประชาชนที่อยู่ใกล้เคียง', result: 'yes', fact: '', advice: '' },

    { group: 'การป้องกันควบคุมโรค', isHeader: true },
    { num: '25', text: 'สถานประกอบกิจการมีมาตรการป้องกันควบคุมโรคติดต่อตามหลักเกณฑ์ที่ราชการหรือกฎหมายกำหนด', result: 'na', fact: '', advice: '' },
  ];

  const handlePrint = () => {
    window.print();
  };

  const handleExportWord = () => {
    const html = generateInspectionReportHtml(license, signers);
    exportHtmlAsWord(html, `รายงานตรวจ_${businessName.replace(/\s+/g, '_')}`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:inset-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col print:shadow-none print:w-full print:max-w-none">
        {/* Top Control Bar */}
        <div className="bg-slate-900 text-white p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <div>
              <div className="font-bold text-sm sm:text-base flex items-center gap-2">
                <span>แบบประเมินมาตรฐานการจัดการอนามัยสิ่งแวดล้อม (25 ข้อ)</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-700 text-emerald-100">
                  ตามกฎกระทรวง
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {businessName} • ผู้ดำเนินกิจการ: {ownerName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportWord}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer"
              title="ส่งออกเอกสาร Word (.doc)"
            >
              <Download className="w-4 h-4" />
              <span>ส่งออก Word</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs sm:text-sm font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์รายงาน (A4)</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Area (A4) */}
        <div className="p-4 sm:p-8 bg-slate-200 overflow-x-auto flex justify-center print:p-0 print:bg-white print:m-0">
          <div
            id="inspection-report-a4-doc"
            className="w-[21cm] bg-white p-[1.5cm_1.5cm_1.5cm_2cm] shadow-xl text-slate-900 font-serif leading-[1.35] text-[13pt] relative print:shadow-none print:p-[1.5cm_1.5cm_1.5cm_2cm] print:w-[21cm]"
          >
            {/* Header Title */}
            <div className="text-center font-bold text-[15pt] leading-snug mb-3">
              แบบประเมินมาตรฐานการจัดการอนามัยสิ่งแวดล้อมสำหรับสถานประกอบกิจการ<br />
              ที่เป็นอันตรายต่อสุขภาพ ตามกฎกระทรวงควบคุมสถานประกอบกิจการ
            </div>

            {/* SECTION 1 */}
            <div className="font-bold text-[13pt] mt-3 mb-1">ส่วนที่ 1 ข้อมูลทั่วไป</div>
            <div className="space-y-1 text-[12pt] pl-1">
              <div className="flex items-baseline">
                <span className="whitespace-nowrap">1. สถานประกอบกิจการประเภท</span>
                <span className="flex-1 border-b border-dashed border-black mx-2 text-center font-semibold">
                  {businessType}
                </span>
              </div>

              <div className="flex items-baseline flex-wrap">
                <span className="whitespace-nowrap">2. ชื่อ-สกุลผู้ดำเนินกิจการ</span>
                <span className="border-b border-dashed border-black px-3 text-center font-semibold min-w-[200px]">
                  {ownerName}
                </span>
                <span className="whitespace-nowrap ml-2">โทรศัพท์</span>
                <span className="border-b border-dashed border-black px-3 text-center font-semibold flex-1 min-w-[120px]">
                  {phone}
                </span>
              </div>

              <div className="flex items-baseline">
                <span className="whitespace-nowrap pl-4">ชื่อสถานประกอบกิจการ</span>
                <span className="flex-1 border-b border-dashed border-black mx-2 text-center font-semibold">
                  {businessName}
                </span>
              </div>

              <div className="flex items-baseline flex-wrap">
                <span className="whitespace-nowrap pl-4">ตั้งอยู่เลขที่</span>
                <span className="border-b border-dashed border-black px-2 text-center font-semibold min-w-[60px]">{addressNo}</span>
                <span className="whitespace-nowrap ml-2">หมู่ที่</span>
                <span className="border-b border-dashed border-black px-2 text-center font-semibold min-w-[40px]">{moo}</span>
                <span className="whitespace-nowrap ml-2">ถนน</span>
                <span className="border-b border-dashed border-black px-2 text-center font-semibold min-w-[80px]">{road}</span>
                <span className="whitespace-nowrap ml-2">ตำบล</span>
                <span className="border-b border-dashed border-black px-2 text-center font-semibold min-w-[80px]">{subdistrict}</span>
              </div>

              <div className="flex items-baseline flex-wrap">
                <span className="whitespace-nowrap pl-4">อำเภอ</span>
                <span className="border-b border-dashed border-black px-2 text-center font-semibold min-w-[100px]">{district}</span>
                <span className="whitespace-nowrap ml-2">จังหวัด</span>
                <span className="border-b border-dashed border-black px-2 text-center font-semibold min-w-[100px]">{province}</span>
                <span className="whitespace-nowrap ml-2">โทรศัพท์ร้าน</span>
                <span className="border-b border-dashed border-black px-2 text-center font-semibold flex-1 min-w-[120px]">{phone}</span>
              </div>

              <div className="flex items-baseline">
                <span className="whitespace-nowrap">3. กรณีประกอบกิจการเลี้ยงสัตว์ (ระบุ) ชนิดสัตว์</span>
                <span className="border-b border-dashed border-black px-3 text-center min-w-[150px]">-</span>
                <span className="whitespace-nowrap ml-2">จำนวน</span>
                <span className="border-b border-dashed border-black px-3 text-center min-w-[60px]">0</span>
                <span className="ml-1">ตัว</span>
              </div>

              <div className="mt-1">
                <div>4. ลักษณะอาคารประกอบกิจการ</div>
                <div className="grid grid-cols-2 gap-1 pl-4 text-[11.5pt] mt-0.5">
                  <div>[✓] อาคารโรงงาน/อาคารเอกเทศ จำนวน 1 ชั้น</div>
                  <div>[ ] อาคารพาณิชย์/พาณิชย์-พักอาศัย จำนวน - ชั้น</div>
                  <div>[ ] อาคารสำนักงาน จำนวน - ชั้น</div>
                  <div>[ ] โรงเรือน จำนวน - โรงเรือน</div>
                  <div>[ ] โกดัง จำนวน - โกดัง</div>
                  <div>[ ] อื่นๆ ระบุ -</div>
                </div>
              </div>

              <div className="flex items-baseline flex-wrap pt-1">
                <span className="whitespace-nowrap">5. จำนวนเครื่องจักร</span>
                <span className="border-b border-dashed border-black px-2 text-center font-semibold min-w-[60px]">1</span>
                <span>ตัว</span>
                <span className="whitespace-nowrap ml-4">รวมจำนวนแรงม้า</span>
                <span className="border-b border-dashed border-black px-2 text-center font-semibold min-w-[60px]">15</span>
                <span>แรงม้า</span>
              </div>

              <div className="flex items-baseline flex-wrap">
                <span className="whitespace-nowrap">6. จำนวนพนักงานทั้งหมด</span>
                <span className="border-b border-dashed border-black px-2 text-center font-semibold min-w-[50px]">1</span>
                <span>คน</span>
                <span className="whitespace-nowrap ml-3">ชาย</span>
                <span className="border-b border-dashed border-black px-2 text-center font-semibold min-w-[50px]">1</span>
                <span>คน</span>
                <span className="whitespace-nowrap ml-3">หญิง</span>
                <span className="border-b border-dashed border-black px-2 text-center font-semibold min-w-[50px]">0</span>
                <span>คน</span>
              </div>

              <div className="flex items-baseline flex-wrap">
                <span className="whitespace-nowrap">7. ระยะเวลาการทำงาน</span>
                <span className="border-b border-dashed border-black px-2 text-center font-semibold min-w-[50px]">6</span>
                <span>วัน/สัปดาห์</span>
                <span className="whitespace-nowrap ml-3">ตั้งแต่เวลา</span>
                <span className="border-b border-dashed border-black px-2 text-center font-semibold min-w-[60px]">8:00</span>
                <span>น. ถึงเวลา</span>
                <span className="border-b border-dashed border-black px-2 text-center font-semibold min-w-[60px]">17:00</span>
                <span>น.</span>
              </div>

              <div className="pt-1">
                <div>8. ในรอบปีที่ผ่านมา สถานประกอบกิจการเคยถูกร้องเรียนก่อปัญหาเหตุรำคาญหรือมลพิษสิ่งแวดล้อม</div>
                <div className="pl-4 text-[11.5pt] flex items-center gap-4 mt-0.5">
                  <span>[✓] ไม่เคย</span>
                  <span>[ ] เคย จำนวน - ครั้ง</span>
                </div>
              </div>
            </div>

            {/* SECTION 2 */}
            <div className="font-bold text-[13pt] mt-3 mb-1">
              ส่วนที่ 2 วัตถุดิบและสารเคมีที่ใช้ในกระบวนการผลิต (ระบุชนิดและปริมาณ/เดือน)
            </div>
            <div className="pl-4 text-[11.5pt] space-y-1">
              <div className="flex items-baseline">
                <span className="w-6">1)</span>
                <span className="border-b border-dashed border-black px-2 font-semibold min-w-[250px]">
                  น้ำมันเครื่องเก่าสำหรับขาย
                </span>
                <span className="ml-4 whitespace-nowrap">ปริมาณที่ใช้ (ต่อปี/เดือน)</span>
                <span className="border-b border-dashed border-black px-2 font-semibold min-w-[140px] text-center">
                  30 ลิตร/เดือน
                </span>
              </div>
              <div className="flex items-baseline">
                <span className="w-6">2)</span>
                <span className="border-b border-dashed border-black px-2 min-w-[250px]">&nbsp;</span>
                <span className="ml-4 whitespace-nowrap">ปริมาณที่ใช้ (ต่อปี/เดือน)</span>
                <span className="border-b border-dashed border-black px-2 min-w-[140px]">&nbsp;</span>
              </div>
            </div>

            {/* SECTION 3: Criteria Table 25 Questions */}
            <div className="font-bold text-[13pt] mt-4 mb-1">
              ส่วนที่ 3 รายการตรวจสอบสุขลักษณะสถานประกอบกิจการ
            </div>
            <table className="w-full border-collapse border border-black text-[11pt] leading-tight">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-black p-1 text-center font-bold align-middle" rowSpan={2} style={{ width: '44%' }}>
                    รายการตรวจสอบสุขลักษณะ
                  </th>
                  <th className="border border-black p-1 text-center font-bold align-middle" colSpan={3} style={{ width: '26%' }}>
                    ผลการตรวจสอบ
                  </th>
                  <th className="border border-black p-1 text-center font-bold align-middle" rowSpan={2} style={{ width: '15%' }}>
                    ข้อเท็จจริงที่พบ
                  </th>
                  <th className="border border-black p-1 text-center font-bold align-middle" rowSpan={2} style={{ width: '15%' }}>
                    คำแนะนำ
                  </th>
                </tr>
                <tr className="bg-slate-100 text-[10pt]">
                  <th className="border border-black p-1 font-semibold text-center whitespace-nowrap align-middle" style={{ width: '6%' }}>ใช่</th>
                  <th className="border border-black p-1 font-semibold text-center whitespace-nowrap align-middle" style={{ width: '6.5%' }}>ไม่ใช่</th>
                  <th className="border border-black p-1 font-semibold text-center whitespace-nowrap align-middle" style={{ width: '13.5%' }}>ไม่เกี่ยวข้อง</th>
                </tr>
              </thead>
              <tbody>
                {criteriaList.map((item, idx) => {
                  if (item.isHeader) {
                    return (
                      <tr key={idx} className="bg-slate-50 font-bold">
                        <td colSpan={6} className="border border-black px-2 py-1 text-left">
                          {item.group}
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={idx} className={item.isSubHeader ? 'font-semibold' : ''}>
                      <td className="border border-black p-1 text-left align-top">
                        {item.num}. {item.text}
                      </td>
                      <td className="border border-black p-1 text-center align-middle font-bold">
                        {item.result === 'yes' ? '✓' : ''}
                      </td>
                      <td className="border border-black p-1 text-center align-middle font-bold">
                        {item.result === 'no' ? '✓' : ''}
                      </td>
                      <td className="border border-black p-1 text-center align-middle font-bold">
                        {item.result === 'na' ? '✓' : ''}
                      </td>
                      <td className="border border-black p-1 text-left align-top text-[10pt]">
                        {item.fact}
                      </td>
                      <td className="border border-black p-1 text-left align-top text-[10pt]">
                        {item.advice}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Recommendations & Inspector Signature */}
            <div className="mt-4 text-[12pt]">
              <div className="font-bold">ข้อเสนอแนะ/สรุปผลการตรวจประเมิน:</div>
              <div className="border-b border-dashed border-black min-h-[30px] pl-2 pt-1">
                สถานประกอบการมีสุขลักษณะทั่วไปอยู่ในเกณฑ์ดี มีการจัดการที่เป็นระเบียบเรียบร้อย สมควรต่ออายุใบอนุญาต
              </div>

              <div className="w-[50%] float-right text-center mt-5 text-[12pt] leading-snug">
                <div>ลงชื่อ....................................................................... ผู้ตรวจประเมิน</div>
                <div className="font-bold mt-1">({license.inspectionData?.inspectorName || 'พันจ่าเอกอานัส เด่นหมาด'})</div>
                <div className="mt-0.5">
                  ตำแหน่ง {license.inspectionData?.inspectorPosition || 'เจ้าพนักงานสาธารณสุขชำนาญงาน'}
                </div>
                <div className="mt-0.5">วันที่ตรวจ {inspectDate}</div>
              </div>
              <div className="clear-both" />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
