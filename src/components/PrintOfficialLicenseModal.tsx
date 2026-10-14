import React, { useState } from 'react';
import { X, Printer, Download, UserCheck, Shield, FileText, CheckCircle2 } from 'lucide-react';
import { LicenseRecord, SignerSettings, DEFAULT_SIGNER_SETTINGS } from '../types/index.ts';
import { generateLicenseHtml, exportHtmlAsWord } from '../services/officialDocGenerator.ts';

interface PrintOfficialLicenseModalProps {
  license: LicenseRecord | null;
  isOpen: boolean;
  onClose: () => void;
  savedSignerSettings?: SignerSettings;
}

export const PrintOfficialLicenseModal: React.FC<PrintOfficialLicenseModalProps> = ({
  license,
  isOpen,
  onClose,
  savedSignerSettings,
}) => {
  const [activePage, setActivePage] = useState<'page1' | 'page2'>('page1');
  const [customFee, setCustomFee] = useState<string>('200');
  const [customFeeText, setCustomFeeText] = useState<string>('สองร้อยบาทถ้วน');
  const [receiptBook, setReceiptBook] = useState<string>('-');
  const [receiptNo, setReceiptNo] = useState<string>('RCPT-00637/69');

  if (!isOpen || !license) return null;

  const signers = savedSignerSettings || DEFAULT_SIGNER_SETTINGS;

  // Derive values
  const licenseNumberClean = license.licenseNumber.replace('เลขที่', '').trim();
  const yearMatch = licenseNumberClean.match(/\/(25\d{2})/);
  const docYear = yearMatch ? yearMatch[1] : (license.licenseYear || '2569');
  const docNumber = licenseNumberClean.includes('/') ? licenseNumberClean.split('/')[0] : licenseNumberClean;

  const bookNo = '-';
  const ownerName = license.ownerName || 'นายโกวิทย์ กุ้งอุย';
  const nationality = 'ไทย';
  const addressNo = license.businessAddressNo || '195/1';
  const moo = license.businessMoo || '5';
  const road = license.businessStreet && license.businessStreet !== '-' ? license.businessStreet : '-';
  const soi = license.businessSoi && license.businessSoi !== '-' ? license.businessSoi : '-';
  const subdistrict = license.businessSubdistrict || 'บางเป้า';
  const district = license.businessDistrict || 'กันตัง';
  const province = license.businessProvince || 'ตรัง';
  const phone = license.businessPhone || license.ownerPhone || '0812736558';

  const businessType = license.businessCategory || '7. กิจการเกี่ยวกับยานยนต์ เครื่องจักรหรือเครื่องกล';
  const businessName = license.businessName || 'ร้าน ช่างกุย';

  const approvalDate = license.approvalDate || '22 กรกฎาคม 2569';
  const expireDate = license.expireDate || '22 กรกฎาคม 2570';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:inset-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col print:shadow-none print:w-full print:max-w-none">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="bg-slate-900 text-white p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <div>
              <div className="font-bold text-sm sm:text-base flex items-center gap-2">
                <span>ใบอนุญาตประกอบกิจการที่เป็นอันตรายต่อสุขภาพ (อภ.2)</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-700 text-emerald-100">
                  ต้นฉบับตราครุฑ
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {businessName} • เลขที่ {license.licenseNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Page switcher preview */}
            <div className="flex items-center bg-slate-800 p-1 rounded-lg text-xs">
              <button
                onClick={() => setActivePage('page1')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activePage === 'page1' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                หน้า 1 (ตัวใบอนุญาต)
              </button>
              <button
                onClick={() => setActivePage('page2')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activePage === 'page2' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                หน้า 2 (ตารางค่าธรรมเนียม)
              </button>
            </div>

            <button
              onClick={() => {
                const html = generateLicenseHtml(license, signers, {
                  fee: customFee,
                  feeText: customFeeText,
                  receiptBook,
                  receiptNo,
                });
                exportHtmlAsWord(html, `ใบอนุญาต_${businessName.replace(/\s+/g, '_')}`);
              }}
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
              <span>พิมพ์ใบอนุญาต (A4)</span>
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
          <div className="w-[21cm] min-h-[29.7cm] bg-white p-[2cm_2cm_2cm_2.5cm] shadow-xl text-slate-900 font-serif leading-[2.1] text-[15pt] relative print:shadow-none print:p-[2cm_2cm_2cm_2.5cm] print:w-[21cm] print:min-h-[29.7cm]">
            
            {/* PAGE 1: Front License */}
            {(activePage === 'page1' || true) && (
              <div className={activePage === 'page2' ? 'hidden print:block print:break-before-page' : 'block'}>
                {/* Garuda Crest */}
                <div className="text-center mb-3">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Garuda_Emblem_of_Thailand.svg/150px-Garuda_Emblem_of_Thailand.svg.png"
                    alt="ตราครุฑ"
                    className="w-24 h-auto mx-auto"
                  />
                </div>

                {/* Title */}
                <div className="text-center font-bold text-[18pt] leading-tight mb-4">
                  <div>ใบอนุญาต</div>
                  <div>ประกอบกิจการที่เป็นอันตรายต่อสุขภาพ</div>
                </div>

                {/* Book & Number */}
                <div className="text-left mb-3 pl-[8.5cm] text-[15pt]">
                  <div>
                    เล่มที่ <span className="border-b border-dotted border-black px-3 font-bold">{bookNo}</span>{' '}
                    เลขที่ <span className="border-b border-dotted border-black px-3 font-bold">{docNumber}</span> /{' '}
                    <span className="border-b border-dotted border-black px-3 font-bold">{docYear}</span>
                  </div>
                </div>

                {/* Paragraph 1: Licensee Information */}
                <p className="indent-[1.5cm] text-justify mb-2">
                  (1) เจ้าพนักงานท้องถิ่นอนุญาตให้{' '}
                  <span className="border-b border-dotted border-black px-4 font-bold min-w-[220px] inline-block text-center">
                    {ownerName}
                  </span>{' '}
                  สัญชาติ{' '}
                  <span className="border-b border-dotted border-black px-2 font-bold min-w-[70px] inline-block text-center">
                    {nationality}
                  </span>{' '}
                  อยู่บ้านเลขที่{' '}
                  <span className="border-b border-dotted border-black px-2 font-bold min-w-[60px] inline-block text-center">
                    {addressNo}
                  </span>{' '}
                  หมู่ที่{' '}
                  <span className="border-b border-dotted border-black px-2 font-bold min-w-[40px] inline-block text-center">
                    {moo}
                  </span>{' '}
                  ตรอก/ซอย{' '}
                  <span className="border-b border-dotted border-black px-2 font-bold min-w-[90px] inline-block text-center">
                    {soi}
                  </span>{' '}
                  ถนน{' '}
                  <span className="border-b border-dotted border-black px-2 font-bold min-w-[110px] inline-block text-center">
                    {road}
                  </span>{' '}
                  ตำบล/แขวง{' '}
                  <span className="border-b border-dotted border-black px-2 font-bold min-w-[100px] inline-block text-center">
                    {subdistrict}
                  </span>{' '}
                  อำเภอ/เขต{' '}
                  <span className="border-b border-dotted border-black px-2 font-bold min-w-[100px] inline-block text-center">
                    {district}
                  </span>{' '}
                  จังหวัด{' '}
                  <span className="border-b border-dotted border-black px-2 font-bold min-w-[100px] inline-block text-center">
                    {province}
                  </span>{' '}
                  หมายเลขโทรศัพท์{' '}
                  <span className="border-b border-dotted border-black px-2 font-bold min-w-[150px] inline-block text-center">
                    {phone}
                  </span>
                </p>

                {/* Paragraph 2: Business details */}
                <p className="indent-[1.5cm] text-justify mb-2">
                  ชื่อสถานประกอบกิจการที่เป็นอันตรายต่อสุขภาพ ประเภท{' '}
                  <span className="border-b border-dotted border-black px-3 font-bold min-w-[320px] inline-block text-center">
                    {businessType}
                  </span>{' '}
                  โดยใช้ชื่อสถานที่{' '}
                  <span className="border-b border-dotted border-black px-3 font-bold min-w-[320px] inline-block text-center">
                    {businessName}
                  </span>{' '}
                  ตั้งอยู่อยู่บ้านเลขที่{' '}
                  <span className="border-b border-dotted border-black px-2 font-bold min-w-[60px] inline-block text-center">
                    {addressNo}
                  </span>{' '}
                  หมู่ที่{' '}
                  <span className="border-b border-dotted border-black px-2 font-bold min-w-[40px] inline-block text-center">
                    {moo}
                  </span>{' '}
                  ตรอก/ซอย{' '}
                  <span className="border-b border-dotted border-black px-2 font-bold min-w-[90px] inline-block text-center">
                    {soi}
                  </span>{' '}
                  ถนน{' '}
                  <span className="border-b border-dotted border-black px-2 font-bold min-w-[110px] inline-block text-center">
                    {road}
                  </span>{' '}
                  ตำบล/แขวง{' '}
                  <span className="border-b border-dotted border-black px-2 font-bold min-w-[100px] inline-block text-center">
                    {subdistrict}
                  </span>{' '}
                  อำเภอ/เขต{' '}
                  <span className="border-b border-dotted border-black px-2 font-bold min-w-[100px] inline-block text-center">
                    {district}
                  </span>{' '}
                  จังหวัด{' '}
                  <span className="border-b border-dotted border-black px-2 font-bold min-w-[100px] inline-block text-center">
                    {province}
                  </span>{' '}
                  หมายเลขโทรศัพท์{' '}
                  <span className="border-b border-dotted border-black px-2 font-bold min-w-[150px] inline-block text-center">
                    {phone}
                  </span>
                </p>

                {/* Paragraph 3: Fee */}
                <p className="indent-[1.5cm] text-justify mb-2">
                  เสียค่าธรรมเนียมปีละ{' '}
                  <span className="border-b border-dotted border-black px-2 font-bold min-w-[80px] inline-block text-center">
                    {customFee}.-
                  </span>{' '}
                  บาท ({' '}
                  <span className="border-b border-dotted border-black px-3 font-bold min-w-[200px] inline-block text-center">
                    -{customFeeText}-
                  </span>{' '}
                  ) ตามใบเสร็จรับเงินเล่มที่{' '}
                  <span className="border-b border-dotted border-black px-2 font-bold min-w-[60px] inline-block text-center">
                    {receiptBook}
                  </span>{' '}
                  เลขที่{' '}
                  <span className="border-b border-dotted border-black px-2 font-bold min-w-[110px] inline-block text-center">
                    {receiptNo}
                  </span>{' '}
                  ลงวันที่{' '}
                  <span className="border-b border-dotted border-black px-2 font-bold min-w-[140px] inline-block text-center">
                    {approvalDate}
                  </span>
                </p>
                <p className="text-justify mb-2">
                  ผู้รับใบอนุญาตต้องปฏิบัติตามหลักเกณฑ์ วิธีการและเงื่อนไขที่กำหนดในข้อกำหนดของท้องถิ่น
                </p>

                {/* Paragraph 4: Terms (2) and (3) */}
                <p className="indent-[1.5cm] text-justify mb-2">
                  (2) หากปรากฏในภายหลังว่าการประกอบกิจการที่ได้รับอนุญาตนี้เป็นการขัดต่อกฎหมายอื่นที่เกี่ยวข้อง โดยมิอาจแก้ไขได้ เจ้าพนักงานท้องถิ่นอาจพิจารณาให้เพิกถอนการอนุญาตนี้ได้
                </p>
                <p className="indent-[1.5cm] text-justify mb-1">
                  (3) ผู้รับใบอนุญาตต้องปฏิบัติตามเงื่อนไขเฉพาะดังต่อไปนี้อีกด้วย คือ
                </p>
                <div className="pl-[1.5cm] text-[14pt] leading-normal mb-2 text-slate-700">
                  <div>3.1) ......................................................................................................................................................................</div>
                  <div>3.2) ......................................................................................................................................................................</div>
                </div>

                {/* Dates (4) & (5) */}
                <p className="indent-[1.5cm] text-justify mb-1">
                  (4) ใบอนุญาตฉบับนี้ออกให้เมื่อวันที่{' '}
                  <span className="border-b border-dotted border-black px-3 font-bold min-w-[150px] inline-block text-center">
                    {approvalDate}
                  </span>
                </p>
                <p className="indent-[1.5cm] text-justify mb-4">
                  (5) ใบอนุญาตฉบับนี้สิ้นอายุวันที่{' '}
                  <span className="border-b border-dotted border-black px-3 font-bold min-w-[150px] inline-block text-center">
                    {expireDate}
                  </span>
                </p>

                {/* Signature Box */}
                <div className="w-[50%] float-right text-center mt-4 mb-4 text-[15pt] leading-snug">
                  <div>(ลงชื่อ).......................................................................</div>
                  <div className="font-bold mt-1">({signers.actingMayorName || 'นายนิติธรรม ดำสุด'})</div>
                  <div className="mt-0.5">
                    ตำแหน่ง {signers.actingMayorPosition || 'รองนายกเทศมนตรี ปฏิบัติราชการแทน'}
                  </div>
                  <div className="mt-0.5">{signers.actingMayorFor || 'นายกเทศมนตรีตำบลบางเป้า'} เจ้าพนักงานท้องถิ่น</div>
                </div>

                {/* Warning Footnote */}
                <div className="clear-both text-[12pt] leading-normal pt-4 border-t border-slate-300/40 text-slate-800">
                  <div className="flex items-start gap-1">
                    <span className="font-bold">คำเตือน</span>
                    <span>
                      (1) ผู้รับใบอนุญาตต้องแสดงใบอนุญาตนี้ไว้โดยเปิดเผยและเห็นได้ง่าย ณ สถานที่ประกอบกิจการตลอดเวลาที่ประกอบกิจการ หากฝ่าฝืนมีโทษปรับไม่เกิน ห้าร้อยบาท
                    </span>
                  </div>
                  <div className="pl-11 mt-0.5">
                    (2) หากประสงค์จะประกอบกิจการในปีต่อไปต้องยื่นคำขอต่ออายุใบอนุญาต<u>ก่อน</u>ใบอนุญาตสิ้นอายุ
                  </div>
                </div>
              </div>
            )}

            {/* PAGE 2: Back page (ตารางรายการเสียค่าธรรมเนียม) */}
            {(activePage === 'page2' || true) && (
              <div className={activePage === 'page1' ? 'hidden print:block print:break-before-page print:mt-[2cm]' : 'block pt-6'}>
                <div className="text-center font-bold text-[16pt] mb-6">
                  รายการเสียค่าธรรมเนียมหนังสือรับรองการแจ้ง
                </div>

                <table className="w-full border-collapse border border-black text-center text-[13pt] leading-snug">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="border border-black p-2 w-[18%] font-normal" rowSpan={2}>
                        วัน/เดือน/ปี<br />ที่ออกใบอนุญาต
                      </th>
                      <th className="border border-black p-2 w-[18%] font-normal" rowSpan={2}>
                        วัน/เดือน/ปี<br />ที่สิ้นอายุใบอนุญาต
                      </th>
                      <th className="border border-black p-1 w-[44%] font-normal" colSpan={3}>
                        ใบเสร็จรับเงิน
                      </th>
                      <th className="border border-black p-2 w-[20%] font-normal" rowSpan={2}>
                        (ลงชื่อ)<br />เจ้าพนักงานท้องถิ่น
                      </th>
                    </tr>
                    <tr className="bg-slate-50">
                      <th className="border border-black p-1 font-normal w-[12%]">เล่มที่</th>
                      <th className="border border-black p-1 font-normal w-[18%]">เลขที่</th>
                      <th className="border border-black p-1 font-normal w-[14%]">วัน/เดือน/ปี</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-black p-2 font-bold">{approvalDate}</td>
                      <td className="border border-black p-2 font-bold">{expireDate}</td>
                      <td className="border border-black p-2">{receiptBook}</td>
                      <td className="border border-black p-2 font-mono">{receiptNo}</td>
                      <td className="border border-black p-2">{approvalDate}</td>
                      <td className="border border-black p-2 font-bold text-xs">
                        ({signers.actingMayorName || 'นายนิติธรรม ดำสุด'})<br />
                        <span className="font-normal text-[10pt]">รองนายกเทศมนตรี</span>
                      </td>
                    </tr>
                    {/* Empty placeholder rows for future renewals */}
                    {[1, 2, 3, 4, 5, 6].map((rowIdx) => (
                      <tr key={rowIdx}>
                        <td className="border border-black p-3">&nbsp;</td>
                        <td className="border border-black p-3">&nbsp;</td>
                        <td className="border border-black p-3">&nbsp;</td>
                        <td className="border border-black p-3">&nbsp;</td>
                        <td className="border border-black p-3">&nbsp;</td>
                        <td className="border border-black p-3">&nbsp;</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
