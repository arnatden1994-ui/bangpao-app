import React from 'react';
import { X, Printer, Download, Stethoscope, ExternalLink } from 'lucide-react';
import { EquipmentLoan, SignerSettings, DEFAULT_SIGNER_SETTINGS } from '../types/index.ts';
import {
  MED_LOAN_IMG_LEFT,
  MED_LOAN_IMG_CENTER,
  MED_LOAN_IMG_RIGHT,
} from '../data/medLoanTemplate.ts';
import {
  parseThaiLoanDate,
  parseThaiNameParts,
  parseThaiAddressParts,
  getEquipmentChecklist,
  exportOfficialMedicalLoanDocx,
  openOfficialMedicalLoanPrintWindow,
} from '../services/medicalLoanDocGenerator.ts';

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

  const docNo = loan.contractNumber || loan.docNo || loan.loanCode || '';
  const dateObj = parseThaiLoanDate(loan.borrowDate || loan.loanDate || loan.createdAt);
  const chk = getEquipmentChecklist(loan);

  const borrowerRaw = loan.borrowerName || '';
  const bNameParts = parseThaiNameParts(borrowerRaw);
  const bAddr = parseThaiAddressParts(loan.borrowerAddress || loan.address);
  const phone = loan.borrowerPhone || loan.phone || '';

  const patientRaw = loan.patientName || borrowerRaw;
  const pNameParts = parseThaiNameParts(patientRaw);
  const pAddr = parseThaiAddressParts(loan.patientAddress || loan.address || loan.borrowerAddress);
  const relation = loan.relationshipWithPatient || loan.borrowerRelation || 'ตนเอง';

  const mayorName = signers.actingMayorName || 'นายนิติธรรม ดำสุด';
  const mayorPos = signers.actingMayorPosition || 'รองนายกเทศมนตรี ปฏิบัติราชการแทน';
  const mayorFor = signers.actingMayorFor || 'นายกเทศมนตรีตำบลบางเป้า';

  const isApproved =
    loan.status === 'approved' ||
    loan.status === 'borrowed' ||
    loan.status === 'returned' ||
    !!loan.approvedBy;

  const handlePrintSystem = () => {
    openOfficialMedicalLoanPrintWindow(loan, signers);
  };

  const handlePrintCurrent = () => {
    window.print();
  };

  const handleExportWord = () => {
    exportOfficialMedicalLoanDocx(loan, signers);
  };

  const bNameStr = bNameParts.first
    ? `${bNameParts.prefix ? bNameParts.prefix + ' ' : ''}${bNameParts.first}  นามสกุล  ${bNameParts.last || '-'}`
    : borrowerRaw;

  const pNameStr = pNameParts.first
    ? `${pNameParts.prefix ? pNameParts.prefix + ' ' : ''}${pNameParts.first}  นามสกุล  ${pNameParts.last || '-'}`
    : patientRaw;

  return (
    <div className="fixed inset-0 z-[99999] overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex justify-center items-start p-2 sm:p-4 print:p-0 print:bg-white print:static print:inset-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-4 flex flex-col print:shadow-none print:w-full print:max-w-none print:m-0 print:rounded-none">
        
        {/* Sticky Top Control Bar (Always visible during scrolling) */}
        <div className="sticky top-0 z-30 bg-slate-900 text-white p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 print:hidden shrink-0 border-b border-slate-800 shadow-lg rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-sm sm:text-base flex items-center gap-2">
                <span>แบบฟอร์มขอยืมอุปกรณ์การแพทย์ (ขนาด A4 2 หน้า)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-teal-600/90 text-white font-bold">
                  ฟอนต์ TH SarabunIT๙ ตรงแม่แบบ 100%
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                เลขที่: {docNo || '-'} • ผู้ยืม: {borrowerRaw} • อุปกรณ์: {loan.equipmentName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Primary Action: Direct System Print Window */}
            <button
              onClick={handlePrintSystem}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
              title="เปิดหน้าต่างพิมพ์ทางการ และเรียกคำสั่งพิมพ์ A4 ทันที"
            >
              <Printer className="w-4 h-4" />
              <span>🖨️ สั่งพิมพ์ผ่านระบบ (A4)</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </button>

            {/* Word Export (.docx) */}
            <button
              onClick={handleExportWord}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer active:scale-95"
              title="ส่งออกเอกสารราชการเป็นไฟล์ Microsoft Word (.docx มีข้อมูลครบ 100%)"
            >
              <Download className="w-4 h-4" />
              <span>ส่งออก Word (.docx)</span>
            </button>

            {/* In-page print */}
            <button
              onClick={handlePrintCurrent}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              title="พิมพ์หน้านี้โดยตรง"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span>พิมพ์หน้านี้</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Area (Exact A4 2-Page Layout with Official Page Borders) */}
        <div className="p-4 sm:p-6 bg-slate-200 overflow-x-auto flex flex-col items-center gap-6 print:p-0 print:bg-white print:m-0 print:gap-0">
          
          {/* ===================== PAGE 1 ===================== */}
          <div
            id="equipment-loan-contract-page1"
            className="w-[210mm] h-[297mm] max-h-[297mm] bg-white shadow-xl text-black relative overflow-hidden print:shadow-none print:m-0 print:w-[210mm] print:h-[297mm] print:max-h-[297mm]"
            style={{
              fontFamily: "'TH SarabunIT๙', 'TH Sarabun New', 'TH SarabunPSK', 'Sarabun', sans-serif",
              fontSize: '15pt',
              lineHeight: 1.2,
              pageBreakAfter: 'always',
              breakAfter: 'page',
            }}
          >
            {/* Black Page Border Frame: ALWAYS covers the entire A4 page */}
            <div
              className="absolute top-[8.5mm] left-[8.5mm] right-[8.5mm] bottom-[8.5mm] border border-black pointer-events-none z-10 box-border"
            />

            {/* Page Content */}
            <div className="p-[13mm_15mm_15mm_22mm] h-full flex flex-col justify-between relative z-[1] box-border">
              <div>
                {/* 3 Logos Header */}
                <div className="flex justify-center items-center gap-10 mb-1">
                  <img src={MED_LOAN_IMG_LEFT} alt="อบจ.ตรัง" className="h-[56px] w-auto object-contain" />
                  <img src={MED_LOAN_IMG_CENTER} alt="เทศบาลตำบลบางเป้า" className="h-[62px] w-auto object-contain" />
                  <img src={MED_LOAN_IMG_RIGHT} alt="กองทุนฟื้นฟูสมรรถภาพจังหวัดตรัง" className="h-[56px] w-auto object-contain" />
                </div>

                {/* Header Titles */}
                <div className="text-center font-bold text-[17pt] leading-[1.18] mb-0.5">
                  <div>ศูนย์สาธิตและยืมอุปกรณ์เครื่องช่วยความพิการฟื้นฟูสมรรถภาพที่บ้าน</div>
                  <div>เทศบาลตำบลบางเป้า</div>
                </div>

                {/* Sub-Header & Doc Number */}
                <div className="flex justify-between items-baseline text-[15pt] mt-0.5 mb-0.5">
                  <div className="font-bold w-[65%] text-right pr-4">
                    แบบฟอร์มขอยืมอุปกรณ์การแพทย์
                  </div>
                  <div className="w-[35%] text-right">
                    เลขที่ <span className="border-b border-dotted border-black px-2 font-bold min-w-[110px] inline-block text-center">{docNo || '.......................'}</span>
                  </div>
                </div>

                {/* Date */}
                <div className="text-right text-[15pt] mb-0.5">
                  วันที่ <span className="border-b border-dotted border-black px-1 font-bold min-w-[35px] inline-block text-center">{dateObj.day}</span>
                  &nbsp;เดือน <span className="border-b border-dotted border-black px-2 font-bold min-w-[60px] inline-block text-center">{dateObj.month}</span>
                  &nbsp;พ.ศ. <span className="border-b border-dotted border-black px-1 font-bold min-w-[50px] inline-block text-center">{dateObj.year}</span>
                </div>

                {/* Borrower Info (3 Distinct Lines matching template) */}
                <div className="text-[15pt] leading-[1.25] space-y-0.5">
                  <div className="whitespace-nowrap">
                    ชื่อผู้ขอยืม(นาย/นาง/นางสาว) <span className="border-b border-dotted border-black px-2 font-bold min-w-[135px] inline-block text-center">{bNameParts.prefix ? bNameParts.prefix + ' ' : ''}{bNameParts.first || '-'}</span>
                    &nbsp;นามสกุล <span className="border-b border-dotted border-black px-2 font-bold min-w-[135px] inline-block text-center">{bNameParts.last || '-'}</span>
                    &nbsp;ที่อยู่ เลขที่ <span className="border-b border-dotted border-black px-2 font-bold min-w-[60px] inline-block text-center">{bAddr.houseNo || '-'}</span>
                  </div>
                  <div className="whitespace-nowrap">
                    หมู่ที่ <span className="border-b border-dotted border-black px-2 font-bold min-w-[35px] inline-block text-center">{bAddr.moo || '-'}</span>
                    &nbsp;(ถนน/ตรอก/ซอย) <span className="border-b border-dotted border-black px-2 font-bold min-w-[95px] inline-block text-center">{bAddr.soi || '-'}</span>
                    &nbsp;ตำบล <span className="border-b border-dotted border-black px-2 font-bold min-w-[95px] inline-block text-center">{bAddr.subdistrict || 'บางเป้า'}</span>
                    &nbsp;อำเภอ <span className="border-b border-dotted border-black px-2 font-bold min-w-[95px] inline-block text-center">{bAddr.district || 'กันตัง'}</span>
                  </div>
                  <div className="whitespace-nowrap">
                    จังหวัด <span className="border-b border-dotted border-black px-2 font-bold min-w-[135px] inline-block text-center">{bAddr.province || 'ตรัง'}</span>
                    &nbsp;เบอร์โทรศัพท์ <span className="border-b border-dotted border-black px-2 font-bold min-w-[135px] inline-block text-center">{phone || '.............................'}</span>
                  </div>

                  {/* Patient Info (3 Distinct Lines matching template) */}
                  <div className="whitespace-nowrap">
                    เพื่อให้ผู้ป่วยชื่อ(นาย/นาง/นางสาว) <span className="border-b border-dotted border-black px-2 font-bold min-w-[135px] inline-block text-center">{pNameParts.prefix ? pNameParts.prefix + ' ' : ''}{pNameParts.first || '-'}</span>
                    &nbsp;นามสกุล <span className="border-b border-dotted border-black px-2 font-bold min-w-[135px] inline-block text-center">{pNameParts.last || '-'}</span>
                    &nbsp;ที่อยู่ เลขที่ <span className="border-b border-dotted border-black px-2 font-bold min-w-[60px] inline-block text-center">{pAddr.houseNo || '-'}</span>
                  </div>
                  <div className="whitespace-nowrap">
                    หมู่ที่ <span className="border-b border-dotted border-black px-2 font-bold min-w-[35px] inline-block text-center">{pAddr.moo || '-'}</span>
                    &nbsp;(ถนน/ตรอก/ซอย) <span className="border-b border-dotted border-black px-2 font-bold min-w-[95px] inline-block text-center">{pAddr.soi || '-'}</span>
                    &nbsp;ตำบล <span className="border-b border-dotted border-black px-2 font-bold min-w-[95px] inline-block text-center">{pAddr.subdistrict || 'บางเป้า'}</span>
                    &nbsp;อำเภอ <span className="border-b border-dotted border-black px-2 font-bold min-w-[95px] inline-block text-center">{pAddr.district || 'กันตัง'}</span>
                  </div>
                  <div className="whitespace-nowrap">
                    จังหวัด <span className="border-b border-dotted border-black px-2 font-bold min-w-[135px] inline-block text-center">{pAddr.province || 'ตรัง'}</span>
                    &nbsp;มีความสัมพันธ์กับผู้ป่วย <span className="border-b border-dotted border-black px-2 font-bold min-w-[135px] inline-block text-center">{relation}</span>
                  </div>
                </div>

                {/* Equipment Checklist (6 Items matching template) */}
                <div className="mt-1 mb-0.5 font-bold text-[15pt]">ประเภทอุปกรณ์ที่ยืม</div>
                <table className="w-full border-collapse text-[15pt] mb-1 leading-[1.22]">
                  <tbody>
                    <tr>
                      <td className="w-[44%] py-0.5 whitespace-nowrap">
                        <span className="inline-block w-[13pt] h-[13pt] border border-black text-center leading-[13pt] text-[11pt] font-bold align-[-2px] mr-1.5">
                          {chk.isBed ? '✓' : ''}
                        </span>
                        เตียงเฟาว์เลอร์ชนิดมือหมุน
                      </td>
                      <td className="w-[20%] py-0.5 whitespace-nowrap">
                        จำนวน <span className="border-b border-dotted border-black px-1 font-bold min-w-[32px] inline-block text-center">{chk.isBed ? '1' : '.....'}</span> เตียง
                      </td>
                      <td className="w-[36%] py-0.5 whitespace-nowrap">
                        หมายเลขครุภัณฑ์ <span className="border-b border-dotted border-black px-1 font-bold min-w-[120px] inline-block text-center">{chk.isBed ? chk.code : '.................................'}</span>
                      </td>
                    </tr>

                    <tr>
                      <td className="py-0.5 whitespace-nowrap">
                        <span className="inline-block w-[13pt] h-[13pt] border border-black text-center leading-[13pt] text-[11pt] font-bold align-[-2px] mr-1.5">
                          {chk.isOxygen ? '✓' : ''}
                        </span>
                        ถังออกซิเจนพร้อมอุปกรณ์การใช้ครบชุด
                      </td>
                      <td className="py-0.5 whitespace-nowrap">
                        จำนวน <span className="border-b border-dotted border-black px-1 font-bold min-w-[32px] inline-block text-center">{chk.isOxygen ? '1' : '.....'}</span> ถัง
                      </td>
                      <td className="py-0.5 whitespace-nowrap">
                        หมายเลขครุภัณฑ์ <span className="border-b border-dotted border-black px-1 font-bold min-w-[120px] inline-block text-center">{chk.isOxygen ? chk.code : '................................'}</span>
                      </td>
                    </tr>

                    <tr>
                      <td className="py-0.5 whitespace-nowrap">
                        <span className="inline-block w-[13pt] h-[13pt] border border-black text-center leading-[13pt] text-[11pt] font-bold align-[-2px] mr-1.5">
                          {chk.isWheelchair ? '✓' : ''}
                        </span>
                        รถนั่งคนพิการชนิดพับได้ทำด้วยโลหะ
                      </td>
                      <td className="py-0.5 whitespace-nowrap">
                        จำนวน <span className="border-b border-dotted border-black px-1 font-bold min-w-[32px] inline-block text-center">{chk.isWheelchair ? '1' : '.....'}</span> คัน
                      </td>
                      <td className="py-0.5 whitespace-nowrap">
                        หมายเลขครุภัณฑ์ <span className="border-b border-dotted border-black px-1 font-bold min-w-[120px] inline-block text-center">{chk.isWheelchair ? chk.code : '.................................'}</span>
                      </td>
                    </tr>

                    <tr>
                      <td className="py-0.5 whitespace-nowrap">
                        <span className="inline-block w-[13pt] h-[13pt] border border-black text-center leading-[13pt] text-[11pt] font-bold align-[-2px] mr-1.5">
                          {chk.isSuction ? '✓' : ''}
                        </span>
                        เครื่องดูดเสมหะ
                      </td>
                      <td className="py-0.5 whitespace-nowrap">
                        จำนวน <span className="border-b border-dotted border-black px-1 font-bold min-w-[32px] inline-block text-center">{chk.isSuction ? '1' : '.....'}</span> เครื่อง
                      </td>
                      <td className="py-0.5 whitespace-nowrap">
                        หมายเลขครุภัณฑ์ <span className="border-b border-dotted border-black px-1 font-bold min-w-[120px] inline-block text-center">{chk.isSuction ? chk.code : '.................................'}</span>
                      </td>
                    </tr>

                    <tr>
                      <td className="py-0.5 whitespace-nowrap">
                        <span className="inline-block w-[13pt] h-[13pt] border border-black text-center leading-[13pt] text-[11pt] font-bold align-[-2px] mr-1.5">
                          {chk.isAirMattress ? '✓' : ''}
                        </span>
                        ที่นอนลม
                      </td>
                      <td className="py-0.5 whitespace-nowrap">
                        จำนวน <span className="border-b border-dotted border-black px-1 font-bold min-w-[32px] inline-block text-center">{chk.isAirMattress ? '1' : '.....'}</span> ชุด
                      </td>
                      <td className="py-0.5 whitespace-nowrap">
                        หมายเลขครุภัณฑ์ <span className="border-b border-dotted border-black px-1 font-bold min-w-[120px] inline-block text-center">{chk.isAirMattress ? chk.code : '.................................'}</span>
                      </td>
                    </tr>

                    <tr>
                      <td className="py-0.5 whitespace-nowrap">
                        <span className="inline-block w-[13pt] h-[13pt] border border-black text-center leading-[13pt] text-[11pt] font-bold align-[-2px] mr-1.5">
                          {chk.isOther ? '✓' : ''}
                        </span>
                        อื่นๆ ระบุ <span className="border-b border-dotted border-black px-1 font-bold min-w-[110px] inline-block text-center">{chk.isOther ? (loan.equipmentName || '') : '.........................'}</span>
                      </td>
                      <td className="py-0.5 whitespace-nowrap">
                        จำนวน <span className="border-b border-dotted border-black px-1 font-bold min-w-[32px] inline-block text-center">{chk.isOther ? '1' : '.....'}</span> &nbsp;&nbsp;&nbsp;&nbsp;
                      </td>
                      <td className="py-0.5 whitespace-nowrap">
                        หมายเลขครุภัณฑ์ <span className="border-b border-dotted border-black px-1 font-bold min-w-[120px] inline-block text-center">{chk.isOther ? chk.code : '.................................'}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Terms Title */}
                <div className="text-center font-bold text-[15pt] mt-1 mb-0.5">
                  ข้อตกลง เกี่ยวกับการยืมอุปกรณ์เครื่องช่วยความพิการฟื้นฟูสมรรถภาพที่บ้าน
                </div>

                {/* Terms Body Clauses (1) to (4) */}
                <div className="text-[14.5pt] space-y-0.5 text-justify leading-[1.2] text-black">
                  <p>
                    (๑) เมื่อผู้ยื่นคำร้องขอยืม ได้ยืมอุปกรณ์ไปแล้ว ผู้ยืมจะต้องจัดซื้อวัสดุสิ้นเปลืองเพื่อประกอบการใช้งานอุปกรณ์ด้วยตนเอง อาทิ สายดูดเสมหะ สายออกซิเจน (Nasal Cannula) น้ำกลั่นสำหรับเครื่องผลิตออกซิเจน ฯลฯ
                  </p>
                  <p>
                    (๒) ระหว่างการใช้อุปกรณ์ฯผู้ป่วย หรือผู้ที่ยื่นคำร้อง จะต้องรักษาความสะอาดของอุปกรณ์ทุกชิ้นที่ยืมไป และก่อนจะนำส่งคืนเทศบาลตำบลบางเป้า จะต้องทำความสะอาดอุปกรณ์ที่ยืมไปให้เรียบร้อย (กรณีอุปกรณ์ฯชำรุดเสียหายที่ไม่ใช่จากการเสื่อมสภาพของอุปกรณ์ฯผู้ป่วย หรือผู้ที่ยื่นคำร้อง จะต้องเป็นผู้รับผิดชอบค่าเสียหายทั้งหมด)
                  </p>
                  <p>
                    (๓) หลังจากที่ได้รับมอบอุปกรณ์เครื่องช่วยความพิการฟื้นฟูสมรรถภาพที่บ้านจากทางเทศบาลตำบลบางเป้า จะมีเจ้าหน้าที่ลงตรวจเยี่ยม ติดตามอาการ เพื่อทำการประเมินกิจวัตรประจำวัน ดัชนีบาร์เธลเอดีแอล (Barthel Activities of Daily Living : ADL)
                  </p>
                  <p>
                    (๔) ในกรณีที่ผลการประเมินกิจวัตรประจำวัน ดัชนีบาร์เธลเอดีแอล (Barthel Activities of Daily Living : ADL) ของผู้ป่วยต่ำกว่าเกณฑ์หรือไม่มีความจำเป็นต้องใช้อุปกรณ์ที่ได้ยืมกับทางเทศบาลตำบลบางเป้าแล้ว นั้น
                  </p>
                  <div className="pl-6 space-y-0.5">
                    <div>- ให้ผู้ที่ยื่นคำร้อง จะต้องทำการส่งคืนอุปกรณ์ทั้งหมดให้แก่เทศบาลตำบลบางเป้า ภายในระยะเวลา 7 วัน</div>
                    <div>- โดยจะต้องแจ้งให้เจ้าหน้าที่เทศบาลตำบลบางเป้าทราบก่อนส่งคืนทุกครั้ง เพื่อทำการตรวจ สภาพอุปกรณ์ก่อน ส่งคืน</div>
                  </div>
                </div>
              </div>

              {/* Bottom line of Page 1 */}
              <div className="text-right text-[14pt] mt-0.5">/- ห้ามส่ง…</div>
            </div>
          </div>


          {/* ===================== PAGE 2 ===================== */}
          <div
            id="equipment-loan-contract-page2"
            className="w-[210mm] h-[297mm] max-h-[297mm] bg-white shadow-xl text-black relative overflow-hidden print:shadow-none print:m-0 print:w-[210mm] print:h-[297mm] print:max-h-[297mm]"
            style={{
              fontFamily: "'TH SarabunIT๙', 'TH Sarabun New', 'TH SarabunPSK', 'Sarabun', sans-serif",
              fontSize: '15pt',
              lineHeight: 1.2,
              pageBreakBefore: 'always',
              breakBefore: 'page',
            }}
          >
            {/* Black Page Border Frame: ALWAYS covers the entire A4 page */}
            <div
              className="absolute top-[8.5mm] left-[8.5mm] right-[8.5mm] bottom-[8.5mm] border border-black pointer-events-none z-10 box-border"
            />

            {/* Page Content */}
            <div className="p-[13mm_15mm_15mm_22mm] h-full flex flex-col justify-between relative z-[1] box-border">
              <div>
                {/* Page 2 Number */}
                <div className="text-center font-bold text-[15pt] mb-1">-๒-</div>

                {/* Sub-item 3 & 4 and Clause (5) */}
                <div className="text-[14.5pt] space-y-0.5 text-justify leading-[1.2] text-black">
                  <div>
                    - ห้ามส่งมอบอุปกรณ์ที่ขอยืมกับทางเทศบาลตำบลบางเป้าให้บุคคลอื่นต่อ โดยไม่ได้รับอนุญาต โดยเด็ดขาด หากทรัพย์สินเกิดการชำรุดหรือสูญหาย ผู้ที่ลงชื่อขอยืมจะต้องรับผิดชอบต่อทรัพย์สิน นั้น
                  </div>
                  <div className="mt-0.5">
                    - ผู้ที่ยื่นคำร้องขอยืมอุปกรณ์ เมื่อต้องการนำส่งอุปกรณ์คืน จะต้องมาลงลายมือชื่อต่อเจ้าหน้าที่ ณ กองสาธารณสุขและสิ่งแวดล้อม เทศบาลตำบลบางเป้า เท่านั้น
                  </div>
                  <p className="mt-0.5">
                    (๕) ห้ามผู้ใดทำการขีดฆ่า หรือลบ ทำลายเลขครุภัณฑ์ที่เขียนกำกับไว้ หรือสลับอุปกรณ์กับอุปกรณ์อื่น โดยเด็ดขาดเนื่องจากเป็นทรัพย์สินของทางราชการ (การทำลายทรัพย์สินของทางราชการหรือพยายามเก็บไว้เป็นของตน มีความผิดตามกฎหมาย)
                  </p>

                  <p className="indent-8 mt-1.5 font-bold leading-normal">
                    ข้าพเจ้าได้อ่าน เข้าใจ ในรายละเอียด และยอมรับข้อตกลงข้างต้นแล้ว จึงขอรับรองว่า จะดูแลรักษาอุปกรณ์ที่ยืมเป็นอย่างดี โดยหากมีความเสียหายใดๆ หรือมีการสูญหายเกิดขึ้น ข้าพเจ้าจะขอรับผิดชอบทั้งหมดทุกกรณีโดยไม่มีเงื่อนไข
                  </p>
                </div>

                {/* Signatures Table: Borrower & Lender */}
                <table className="w-full text-center mt-3 text-[15pt]">
                  <tbody>
                    <tr>
                      <td className="w-[50%] align-top leading-[1.28]">
                        <div>ลงชื่อ.........................................................ผู้ยืม</div>
                        <div className="font-bold mt-0.5">(&nbsp;{borrowerRaw || '.................................................'}&nbsp;)</div>
                        <div className="mt-0.5">วันที่.........................................................</div>
                      </td>
                      <td className="w-[50%] align-top leading-[1.28]">
                        <div>ลงชื่อ.........................................................ผู้ให้ยืม</div>
                        <div className="font-bold mt-0.5">(&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)</div>
                        <div className="mt-0.5">วันที่.........................................................</div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Approval Section */}
                <div className="mt-2.5 text-[15pt] pl-5">
                  <span className="inline-block w-[13pt] h-[13pt] border border-black text-center leading-[13pt] text-[11pt] font-bold align-[-2px] mr-1.5">
                    {isApproved ? '✓' : ''}
                  </span>
                  อนุมัติ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                  <span className="inline-block w-[13pt] h-[13pt] border border-black text-center leading-[13pt] text-[11pt] font-bold align-[-2px] mr-1.5">
                    {loan.status === 'overdue' ? '✓' : ''}
                  </span>
                  ไม่อนุมัติ
                </div>

                {/* Executive Signature (Left) & Witness/Recipient (Right) */}
                <table className="w-full text-center mt-2 text-[15pt]">
                  <tbody>
                    <tr>
                      <td className="w-[50%] align-top leading-[1.25]">
                        <div>ลงชื่อ.........................................................</div>
                        <div className="font-bold mt-0.5">(&nbsp;{mayorName}&nbsp;)</div>
                        <div>{mayorPos}</div>
                        <div>{mayorFor}</div>
                      </td>
                      <td className="w-[50%] align-top leading-[1.25]">
                        <div>ลงชื่อ.........................................................</div>
                        <div className="font-bold mt-0.5">(&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)</div>
                        <div className="mt-0.5">วันที่.........................................................</div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Return Section (ส่งคืนอุปกรณ์) */}
                <div className="border-t border-dashed border-black mt-2.5 pt-1.5 text-[15pt]">
                  <div className="font-bold text-[15pt] mb-0.5">ส่งคืนอุปกรณ์</div>
                  <div className="pl-5 space-y-0.5 leading-normal text-[15pt]">
                    <div>
                      <span className="inline-block w-[13pt] h-[13pt] border border-black text-center leading-[13pt] text-[11pt] font-bold align-[-2px] mr-1.5">
                        {loan.status === 'returned' && loan.returnCondition === 'complete' ? '✓' : ''}
                      </span>
                      อุปกรณ์ครบถ้วน
                    </div>
                    <div>
                      <span className="inline-block w-[13pt] h-[13pt] border border-black text-center leading-[13pt] text-[11pt] font-bold align-[-2px] mr-1.5">
                        {loan.status === 'returned' && loan.returnCondition === 'damaged' ? '✓' : ''}
                      </span>
                      อุปกรณ์ชำรุด เนื่องจาก...........................................................................................
                    </div>
                  </div>

                  <table className="w-full text-center mt-1.5 text-[15pt]">
                    <tbody>
                      <tr>
                        <td className="w-[50%] align-top leading-[1.28]">
                          <div>ลงชื่อ.........................................................ผู้ส่งคืน</div>
                          <div className="font-bold mt-0.5">(&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)</div>
                          <div className="mt-0.5">วันที่.........................................................</div>
                        </td>
                        <td className="w-[50%] align-top leading-[1.28]">
                          <div>ลงชื่อ.........................................................ผู้ตรวจสอบ</div>
                          <div className="font-bold mt-0.5">(&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)</div>
                          <div className="mt-0.5">วันที่.........................................................</div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
