import React from 'react';
import { X, Printer, Download, Stethoscope, CheckCircle2 } from 'lucide-react';
import { EquipmentLoan, SignerSettings, DEFAULT_SIGNER_SETTINGS } from '../types/index.ts';
import { generateEquipmentLoanHtml, exportHtmlAsWord } from '../services/officialDocGenerator.ts';

interface PrintEquipmentLoanModalProps {
  loan: EquipmentLoan | null;
  isOpen: boolean;
  onClose: () => void;
  savedSignerSettings?: SignerSettings;
}

export const PrintEquipmentLoanModal: React.FC<PrintEquipmentLoanModalProps> = ({
  loan,
  isOpen,
  onClose,
  savedSignerSettings,
}) => {
  if (!isOpen || !loan) return null;

  const signers = savedSignerSettings || DEFAULT_SIGNER_SETTINGS;

  const contractNo = loan.contractNumber || 'EQ-69/001';
  const borrowerName = loan.borrowerName || 'นางมาลี สุขใจ';
  const patientName = loan.patientName || 'นายสมศักดิ์ สุขใจ';
  const phone = loan.borrowerPhone || '089-123-4567';
  const address = loan.borrowerAddress || '12/4 หมู่ 2 ต.บางเป้า อ.กันตัง จ.ตรัง';
  const relationship = loan.relationshipWithPatient || 'บุตร/ผู้ดูแล';
  const borrowDate = loan.borrowDate || '1 ตุลาคม 2569';
  const dueDate = loan.dueDate || '1 เมษายน 2570';

  const eqName = loan.equipmentName || 'เตียงเฟาว์เลอร์ชนิดมือหมุน';
  const assetCode = loan.equipmentCode || 'ครุภัณฑ์ 69-04-001';

  // Which item is checked
  const isBed = eqName.includes('เตียง');
  const isOxygen = eqName.includes('ออกซิเจน');
  const isWheelchair = eqName.includes('รถนั่ง') || eqName.includes('วีลแชร์');
  const isSuction = eqName.includes('ดูดเสมหะ');
  const isAirMattress = eqName.includes('ที่นอนลม');

  const handlePrint = () => {
    window.print();
  };

  const handleExportWord = () => {
    const html = generateEquipmentLoanHtml(loan, signers);
    exportHtmlAsWord(html, `สัญญายืมอุปกรณ์_${loan.borrowerName.replace(/\s+/g, '_')}`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:inset-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col print:shadow-none print:w-full print:max-w-none">
        {/* Top Control Bar */}
        <div className="bg-slate-900 text-white p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-emerald-400" />
            <div>
              <div className="font-bold text-sm sm:text-base flex items-center gap-2">
                <span>แบบฟอร์มขอยืมอุปกรณ์การแพทย์ (ศูนย์สาธิตฯ บางเป้า)</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-700 text-emerald-100">
                  ต้นฉบับทางการ
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                เลขที่สัญญา: {contractNo} • ผู้ยืม: {borrowerName} • อุปกรณ์: {eqName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportWord}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>ส่งออก Word</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs sm:text-sm font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์สัญญา (A4)</span>
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
            id="equipment-loan-contract-a4"
            className="w-[21cm] bg-white p-[1.8cm_2cm_1.8cm_2.2cm] shadow-xl text-slate-900 font-serif leading-[1.65] text-[13.5pt] relative print:shadow-none print:p-[1.8cm_2cm_1.8cm_2.2cm] print:w-[21cm]"
          >
            {/* Header */}
            <div className="text-center font-bold text-[15pt] leading-tight mb-2">
              <div>ศูนย์สาธิตและยืมอุปกรณ์เครื่องช่วยความพิการฟื้นฟูสมรรถภาพที่บ้าน</div>
              <div>เทศบาลตำบลบางเป้า</div>
            </div>

            <div className="flex justify-between items-baseline mt-3 mb-2 text-[13pt]">
              <span className="font-bold text-[14pt]">แบบฟอร์มขอยืมอุปกรณ์การแพทย์</span>
              <span>
                เลขที่ <span className="border-b border-dotted border-black px-3 font-bold">{contractNo}</span>
              </span>
            </div>

            <div className="text-right text-[13pt] mb-3">
              วันที่ <span className="border-b border-dotted border-black px-4 font-bold">{borrowDate}</span>
            </div>

            {/* Borrower & Patient Info */}
            <div className="space-y-1.5 text-[13pt] text-justify">
              <div>
                ชื่อผู้ขอยืม <span className="border-b border-dotted border-black px-3 font-bold">{borrowerName}</span>{' '}
                ที่อยู่ <span className="border-b border-dotted border-black px-3 font-bold">{address}</span>{' '}
                เบอร์โทรศัพท์ <span className="border-b border-dotted border-black px-3 font-bold">{phone}</span>
              </div>

              <div>
                เพื่อให้ผู้ป่วยชื่อ <span className="border-b border-dotted border-black px-3 font-bold">{patientName}</span>{' '}
                ที่อยู่ <span className="border-b border-dotted border-black px-3 font-bold">{address}</span>{' '}
                มีความสัมพันธ์กับผู้ป่วย <span className="border-b border-dotted border-black px-3 font-bold">{relationship}</span>
              </div>
            </div>

            {/* Equipment Checklist */}
            <div className="mt-3 mb-2 font-bold text-[13.5pt]">ประเภทอุปกรณ์ที่ยืม:</div>
            <div className="space-y-1.5 pl-3 text-[12.5pt]">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="mr-2 font-bold">{isBed ? '[✓]' : '[ ]'}</span>
                  <span>เตียงเฟาว์เลอร์ชนิดมือหมุน</span>
                </div>
                <div>
                  จำนวน <span className="border-b border-dotted border-black px-2 font-bold">{isBed ? '1' : '-'}</span> เตียง
                  &nbsp;&nbsp;หมายเลขครุภัณฑ์ <span className="border-b border-dotted border-black px-2 font-mono font-bold">{isBed ? assetCode : '................................'}</span>
                </div>
              </div>

              <div className="flex items-baseline justify-between">
                <div>
                  <span className="mr-2 font-bold">{isOxygen ? '[✓]' : '[ ]'}</span>
                  <span>ถังออกซิเจนพร้อมอุปกรณ์การใช้ครบชุด</span>
                </div>
                <div>
                  จำนวน <span className="border-b border-dotted border-black px-2 font-bold">{isOxygen ? '1' : '-'}</span> ถัง
                  &nbsp;&nbsp;หมายเลขครุภัณฑ์ <span className="border-b border-dotted border-black px-2 font-mono font-bold">{isOxygen ? assetCode : '................................'}</span>
                </div>
              </div>

              <div className="flex items-baseline justify-between">
                <div>
                  <span className="mr-2 font-bold">{isWheelchair ? '[✓]' : '[ ]'}</span>
                  <span>รถนั่งคนพิการชนิดพับได้ทำด้วยโลหะ</span>
                </div>
                <div>
                  จำนวน <span className="border-b border-dotted border-black px-2 font-bold">{isWheelchair ? '1' : '-'}</span> คัน
                  &nbsp;&nbsp;หมายเลขครุภัณฑ์ <span className="border-b border-dotted border-black px-2 font-mono font-bold">{isWheelchair ? assetCode : '................................'}</span>
                </div>
              </div>

              <div className="flex items-baseline justify-between">
                <div>
                  <span className="mr-2 font-bold">{isSuction ? '[✓]' : '[ ]'}</span>
                  <span>เครื่องดูดเสมหะ</span>
                </div>
                <div>
                  จำนวน <span className="border-b border-dotted border-black px-2 font-bold">{isSuction ? '1' : '-'}</span> เครื่อง
                  &nbsp;&nbsp;หมายเลขครุภัณฑ์ <span className="border-b border-dotted border-black px-2 font-mono font-bold">{isSuction ? assetCode : '................................'}</span>
                </div>
              </div>

              <div className="flex items-baseline justify-between">
                <div>
                  <span className="mr-2 font-bold">{isAirMattress ? '[✓]' : '[ ]'}</span>
                  <span>ที่นอนลม</span>
                </div>
                <div>
                  จำนวน <span className="border-b border-dotted border-black px-2 font-bold">{isAirMattress ? '1' : '-'}</span> ชุด
                  &nbsp;&nbsp;หมายเลขครุภัณฑ์ <span className="border-b border-dotted border-black px-2 font-mono font-bold">{isAirMattress ? assetCode : '................................'}</span>
                </div>
              </div>
            </div>

            {/* Terms and Conditions (5 Clauses) */}
            <div className="mt-3 mb-1 font-bold text-[13pt] text-center border-t border-slate-300 pt-2">
              ข้อตกลง เกี่ยวกับการยืมอุปกรณ์เครื่องช่วยความพิการฟื้นฟูสมรรถภาพที่บ้าน
            </div>
            <div className="text-[11.5pt] space-y-1 text-justify leading-snug text-slate-800">
              <div>
                (1) เมื่อผู้ยื่นคำร้องขอยืม ได้ยืมอุปกรณ์ไปแล้ว ผู้ยืมจะต้องจัดซื้อวัสดุสิ้นเปลืองเพื่อประกอบการใช้งานอุปกรณ์ด้วยตนเอง อาทิ สายดูดเสมหะ สายออกซิเจน (Nasal Cannula) น้ำกลั่นสำหรับเครื่องผลิตออกซิเจน ฯลฯ
              </div>
              <div>
                (2) ระหว่างการใช้อุปกรณ์ฯ ผู้ป่วย หรือผู้ที่ยื่นคำร้อง จะต้องรักษาความสะอาดของอุปกรณ์ทุกชิ้นที่ยืมไป และก่อนจะนำส่งคืนเทศบาลตำบลบางเป้า จะต้องทำความสะอาดอุปกรณ์ที่ยืมไปให้เรียบร้อย (กรณีอุปกรณ์ฯ ชำรุดเสียหายที่ไม่ใช่จากการเสื่อมสภาพตามการใช้งาน ผู้ยืมจะต้องเป็นผู้รับผิดชอบค่าเสียหายทั้งหมด)
              </div>
              <div>
                (3) หลังจากที่ได้รับมอบอุปกรณ์ฯ จากทางเทศบาลตำบลบางเป้า จะมีเจ้าหน้าที่ลงตรวจเยี่ยม ติดตามอาการ เพื่อทำการประเมินกิจวัตรประจำวัน ดัชนีบาร์เธลเอดีแอล (Barthel Activities of Daily Living : ADL)
              </div>
              <div>
                (4) ในกรณีที่ผลการประเมิน ADL ของผู้ป่วยต่ำกว่าเกณฑ์ หรือไม่มีความจำเป็นต้องใช้อุปกรณ์ที่ได้ยืมแล้ว ให้ผู้ยื่นคำร้องทำการส่งคืนอุปกรณ์ทั้งหมดให้แก่เทศบาลตำบลบางเป้า ภายในระยะเวลา 7 วัน โดยห้ามส่งมอบอุปกรณ์ให้บุคคลอื่นต่อโดยเด็ดขาด
              </div>
              <div>
                (5) ห้ามผู้ใดทำการขีดฆ่า หรือลบ ทำลายเลขครุภัณฑ์ที่เขียนกำกับไว้ หรือสลับอุปกรณ์กับอุปกรณ์อื่น โดยเด็ดขาดเนื่องจากเป็นทรัพย์สินของทางราชการ
              </div>
            </div>

            <p className="text-[11.5pt] text-justify indent-8 mt-2">
              ข้าพเจ้าได้อ่าน เข้าใจ ในรายละเอียด และยอมรับข้อตกลงข้างต้นแล้ว จึงขอรับรองว่าจะดูแลรักษาอุปกรณ์ที่ยืมเป็นอย่างดี โดยหากมีความเสียหายใดๆ หรือมีการสูญหายเกิดขึ้น ข้าพเจ้าจะขอรับผิดชอบทั้งหมดทุกกรณีโดยไม่มีเงื่อนไข
            </p>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-4 text-center mt-3 text-[12pt] leading-snug">
              <div>
                <div>ลงชื่อ......................................................... ผู้ยืม</div>
                <div className="font-bold mt-0.5">({borrowerName})</div>
                <div className="mt-0.5">วันที่ {borrowDate}</div>
              </div>
              <div>
                <div>ลงชื่อ......................................................... ผู้ให้ยืม</div>
                <div className="font-bold mt-0.5">({signers.directorName || 'นางสาวปฐมาภรณ์ จันทร์แจ่ม'})</div>
                <div className="mt-0.5">ผู้อำนวยการกองสาธารณสุขและสิ่งแวดล้อม</div>
              </div>
            </div>

            {/* Approval Box */}
            <div className="border border-black p-2 mt-3 text-center text-[12pt] leading-snug">
              <div className="font-bold mb-1">
                คำสั่งการ: &nbsp;&nbsp;&nbsp;&nbsp; [✓] อนุมัติ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; [ ] ไม่อนุมัติ
              </div>
              <div>ลงชื่อ.......................................................................</div>
              <div className="font-bold mt-0.5">({signers.actingMayorName || 'นายนิติธรรม ดำสุด'})</div>
              <div className="mt-0.5">
                ตำแหน่ง {signers.actingMayorPosition || 'รองนายกเทศมนตรี ปฏิบัติราชการแทน'} {signers.actingMayorFor || 'นายกเทศมนตรีตำบลบางเป้า'}
              </div>
            </div>

            {/* Return Equipment Section */}
            <div className="border-t border-black mt-2 pt-1 text-[11.5pt] leading-tight">
              <div className="font-bold text-center">บันทึกการส่งคืนอุปกรณ์</div>
              <div className="flex justify-center gap-8 mt-0.5">
                <span>[ ] อุปกรณ์ครบถ้วน สภาพสมบูรณ์</span>
                <span>[ ] อุปกรณ์ชำรุด ระบุสาเหตุ: ............................................................</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center mt-2">
                <div>
                  <div>ลงชื่อ................................................... ผู้ส่งคืน</div>
                  <div className="mt-0.5">วันที่ ...................................................</div>
                </div>
                <div>
                  <div>ลงชื่อ................................................... ผู้ตรวจสอบรับคืน</div>
                  <div className="mt-0.5">วันที่ ...................................................</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
