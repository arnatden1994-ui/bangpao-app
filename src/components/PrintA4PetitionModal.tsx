import React, { useState } from 'react';
import {
  X,
  Printer,
  UserCheck,
  Check,
  Building2,
  FileText,
  Truck,
  DollarSign,
  ChevronRight,
  Shield,
  Download,
} from 'lucide-react';
import { PublicPetition, SignerSettings, DEFAULT_SIGNER_SETTINGS } from '../types/index.ts';

interface PrintA4PetitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  petition: PublicPetition | null;
  savedSignerSettings?: SignerSettings;
}

export const PrintA4PetitionModal: React.FC<PrintA4PetitionModalProps> = ({
  isOpen,
  onClose,
  petition,
  savedSignerSettings,
}) => {
  const initialSettings = savedSignerSettings || DEFAULT_SIGNER_SETTINGS;

  const [activeTab, setActiveTab] = useState<'configure' | 'preview'>('preview');

  // Signer overrides
  const [directorName, setDirectorName] = useState(initialSettings.directorName);
  const [directorPos, setDirectorPos] = useState(initialSettings.directorPos);
  const [clerkName, setClerkName] = useState(initialSettings.clerkName);
  const [clerkPos, setClerkPos] = useState(initialSettings.clerkPos);

  const [mayorPreset, setMayorPreset] = useState('deputy_acting');
  const [mayorName, setMayorName] = useState(initialSettings.mayorName);
  const [mayorPos, setMayorPos] = useState(initialSettings.mayorPos);

  const [driverName, setDriverName] = useState(initialSettings.driverName);
  const [selectedFee, setSelectedFee] = useState(initialSettings.feeInDistrict);

  if (!isOpen) return null;

  const isSewage =
    petition?.category === 'waste_sewage' ||
    petition?.title.includes('สิ่งปฏิกูล') ||
    petition?.title.includes('ส้วม') ||
    petition?.trackingCode.startsWith('ST-') ||
    false;

  const handleMayorPresetChange = (val: string) => {
    setMayorPreset(val);
    if (val === 'deputy_acting') {
      setMayorName('นายนิติธรรม ดำสุด');
      setMayorPos('รองนายกเทศมนตรี ปฏิบัติราชการแทน\nนายกเทศมนตรีตำบลบางเป้า');
    } else if (val === 'mayor_direct') {
      setMayorName('นายกเทศมนตรีตำบลบางเป้า');
      setMayorPos('นายกเทศมนตรีตำบลบางเป้า');
    } else if (val === 'clerk_acting') {
      setMayorName('นายจตุพร ศรีสุวรรณ');
      setMayorPos('ปลัดเทศบาล ปฏิบัติหน้าที่\nนายกเทศมนตรีตำบลบางเป้า');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const today = new Date();
  const thaiMonths = [
    '',
    'มกราคม',
    'กุมภาพันธ์',
    'มีนาคม',
    'เมษายน',
    'พฤษภาคม',
    'มิถุนายน',
    'กรกฎาคม',
    'สิงหาคม',
    'กันยายน',
    'ตุลาคม',
    'พฤศจิกายน',
    'ธันวาคม',
  ];
  const dayStr = String(today.getDate());
  const monthStr = thaiMonths[today.getMonth() + 1];
  const yearStr = String(today.getFullYear() + 543);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:fixed print:inset-0">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="bg-[#064e3b] px-6 py-4 text-white flex items-center justify-between border-b border-emerald-800 print:hidden shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Printer className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white flex items-center gap-2">
                <span>พิมพ์แบบคำร้องเสนอผู้บริหาร (ขนาด A4 ตามต้นฉบับ)</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  {petition?.trackingCode || 'REQ-001'}
                </span>
              </h2>
              <p className="text-xs text-emerald-200/90 mt-0.5">
                {isSewage ? 'คำร้องขอรับบริการกำจัดสิ่งปฏิกูล (สูบส้วม)' : 'แบบคำร้องทั่วไป'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher */}
            <div className="flex bg-emerald-950/60 p-1 rounded-xl border border-emerald-700/50">
              <button
                onClick={() => setActiveTab('configure')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'configure'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-200 hover:text-white'
                }`}
              >
                เลือกผู้บริหารว่าใครเซ็น
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'preview'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-200 hover:text-white'
                }`}
              >
                ดูตัวอย่าง A4 (Preview)
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>สั่งพิมพ์ / บันทึก PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-emerald-200 hover:text-white hover:bg-emerald-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto bg-slate-100 p-4 sm:p-6 print:p-0 print:bg-white">
          {/* TAB 1: Configure Signers & Options */}
          {activeTab === 'configure' && (
            <div className="max-w-2xl mx-auto bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5 print:hidden">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-emerald-600" />
                  <span>กำหนดรายชื่อผู้บริหารและผู้ลงนามในแบบฟอร์มนี้</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  ปรับเปลี่ยนผู้ลงนามได้ตามสถานการณ์จริง โดยข้อมูลจะถูกใส่ลงในเอกสาร A4 ทันที
                </p>
              </div>

              {/* 1. ผู้อำนวยการกอง */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  1. ผู้อำนวยการกองสาธารณสุขและสิ่งแวดล้อม (ผู้เสนอ)
                </label>
                <input
                  type="text"
                  value={directorName}
                  onChange={(e) => setDirectorName(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 font-semibold"
                  placeholder="ชื่อ-นามสกุล ผอ.กอง"
                />
                <input
                  type="text"
                  value={directorPos}
                  onChange={(e) => setDirectorPos(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg text-slate-500"
                  placeholder="ตำแหน่ง"
                />
              </div>

              {/* 2. ปลัดเทศบาล */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  2. ปลัดเทศบาล (ผู้พิจารณากลั่นกรอง)
                </label>
                <input
                  type="text"
                  value={clerkName}
                  onChange={(e) => setClerkName(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 font-semibold"
                  placeholder="ชื่อ-นามสกุล ปลัดเทศบาล"
                />
                <input
                  type="text"
                  value={clerkPos}
                  onChange={(e) => setClerkPos(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg text-slate-500"
                  placeholder="ตำแหน่ง"
                />
              </div>

              {/* 3. ผู้มีอำนาจลงนาม / นายกเทศมนตรี */}
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-950 block">
                    3. ผู้มีอำนาจลงนาม (นายกเทศมนตรี / ผู้แทน)
                  </label>
                  <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">
                    คำสั่ง / อนุมัติ
                  </span>
                </div>
                <select
                  value={mayorPreset}
                  onChange={(e) => handleMayorPresetChange(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-emerald-300 rounded-lg bg-white font-medium"
                >
                  <option value="deputy_acting">
                    นายนิติธรรม ดำสุด (รองนายกเทศมนตรี ปฏิบัติราชการแทน นายกฯ)
                  </option>
                  <option value="mayor_direct">นายกเทศมนตรีตำบลบางเป้า (เซ็นโดยตรง)</option>
                  <option value="clerk_acting">
                    นายจตุพร ศรีสุวรรณ (ปลัดเทศบาล ปฏิบัติหน้าที่ นายกฯ)
                  </option>
                  <option value="custom">กำหนดชื่อและตำแหน่งเอง...</option>
                </select>

                <input
                  type="text"
                  value={mayorName}
                  onChange={(e) => setMayorName(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg bg-white font-bold text-slate-800"
                  placeholder="ชื่อ-นามสกุล ผู้มีอำนาจลงนาม"
                />
                <textarea
                  value={mayorPos}
                  onChange={(e) => setMayorPos(e.target.value)}
                  rows={2}
                  className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-600 font-medium"
                  placeholder="ตำแหน่งในเอกสาร"
                />
              </div>

              {/* 4. พนักงานขับรถ (ถ้าเป็นคำร้องดูดส้วม) */}
              {isSewage && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    4. พนักงานขับรถดูดสิ่งปฏิกูล (ผู้บันทึกผลงาน)
                  </label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg"
                    placeholder="ชื่อ-นามสกุล พนักงานขับรถ"
                  />
                </div>
              )}

              {/* 5. อัตราค่าบริการ (ถ้าเป็นสิ่งปฏิกูล) */}
              {isSewage && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    5. อัตราค่าบริการกำจัดสิ่งปฏิกูล
                  </label>
                  <select
                    value={selectedFee}
                    onChange={(e) => setSelectedFee(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium"
                  >
                    <option value="250">ในเขตเทศบาลตำบลบางเป้า (250 บาท / บ่อ)</option>
                    <option value="700">นอกเขตเทศบาล ไม่เกิน 10 กม. (700 บาท / บ่อ)</option>
                    <option value="1000">นอกเขตเทศบาล 10 - 20 กม. (1,000 บาท / บ่อ)</option>
                    <option value="1300">นอกเขตเทศบาล 20 - 30 กม. (1,300 บาท / บ่อ)</option>
                  </select>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setActiveTab('preview')}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span>เปิดดูตัวอย่าง A4 (Preview)</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: A4 Printable Document Simulation */}
          {activeTab === 'preview' && (
            <div className="flex justify-center">
              {/* Paper A4 Container */}
              <div
                id="a4-printable-sheet"
                className="bg-white text-black shadow-2xl print:shadow-none p-10 sm:p-14 w-[210mm] min-h-[297mm] font-['Sarabun',sans-serif] leading-relaxed text-[14pt] relative box-border"
                style={{
                  boxSizing: 'border-box',
                  fontFamily: "'Sarabun', sans-serif",
                }}
              >
                {/* Garuda Seal */}
                <div className="text-center mb-1">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Emblem_of_Thailand.svg/200px-Emblem_of_Thailand.svg.png"
                    alt="ตราครุฑ"
                    className="h-24 w-auto mx-auto object-contain"
                  />
                </div>

                {/* Document Title */}
                <h1 className="text-center font-bold text-[16pt] mb-2">
                  {isSewage ? 'คำร้องขอรับบริการกำจัดสิ่งปฏิกูล' : 'แบบคำร้องทั่วไป'}
                </h1>

                {/* Location & Date */}
                <div className="text-right text-[13.5pt]">
                  เขียนที่ สำนักงานเทศบาลตำบลบางเป้า
                </div>
                <div className="text-right text-[13.5pt] mb-3">
                  วันที่ <span className="inline-block border-b border-dotted border-black min-w-8 text-center font-bold">{dayStr}</span>{' '}
                  เดือน <span className="inline-block border-b border-dotted border-black min-w-24 text-center font-bold">{monthStr}</span>{' '}
                  พ.ศ. <span className="inline-block border-b border-dotted border-black min-w-14 text-center font-bold">{yearStr}</span>
                </div>

                {/* To Mayor */}
                {!isSewage && (
                  <div className="text-[13.5pt] mb-1 font-bold">
                    เรื่อง: <span className="font-normal underline decoration-dotted">{petition?.title || 'ขอความอนุเคราะห์'}</span>
                  </div>
                )}
                <div className="text-[13.5pt] mb-2 font-bold">
                  เรียน นายกเทศมนตรีตำบลบางเป้า
                </div>

                {/* Body Paragraph */}
                <div className="text-justify text-[13.5pt] space-y-1">
                  <p className="indent-12 leading-relaxed">
                    ข้าพเจ้า (นาย/นาง/นางสาว){' '}
                    <span className="font-bold underline decoration-dotted px-1">
                      {petition?.citizenName || '.............................................................'}
                    </span>{' '}
                    เบอร์โทรศัพท์{' '}
                    <span className="font-bold underline decoration-dotted px-1">
                      {petition?.phone || '....................................'}
                    </span>
                  </p>
                  <p className="leading-relaxed">
                    อยู่บ้านเลขที่ / สถานที่บริการ{' '}
                    <span className="font-bold underline decoration-dotted px-1">
                      {petition?.address || '................................................................................................'}
                    </span>
                  </p>

                  {isSewage ? (
                    <>
                      <p className="indent-12 leading-relaxed pt-1">
                        มีความประสงค์จะขอรับบริการกำจัดสิ่งปฏิกูล จากสำนักงานเทศบาลตำบลบางเป้า ณ สถานที่ดังกล่าวข้างต้น
                        โดยข้าพเจ้า ยินยอมชำระค่าธรรมเนียมในการบริการกำจัดสิ่งปฏิกูล ตามข้อบัญญัติของเทศบาลตำบลบางเป้าดังนี้
                      </p>
                      <div className="pl-6 text-[12.5pt] space-y-0.5 my-2">
                        <div>
                          <strong>ในเขตเทศบาลตำบลบางเป้า</strong> เหมาจ่าย ครั้งละ {selectedFee} บาท / บ่อ
                        </div>
                        <div>
                          <strong>นอกเขตเทศบาลตำบลบางเป้า</strong> ไม่เกิน 10 กิโลเมตร ครั้งละ 700 บาท / บ่อ
                        </div>
                        <div>
                          เกิน 10 กิโลเมตร แต่ไม่เกิน 20 กิโลเมตร ครั้งละ 1,000 บาท / บ่อ
                        </div>
                        <div>
                          เกิน 20 กิโลเมตร แต่ไม่เกิน 30 กิโลเมตร ครั้งละ 1,300 บาท / บ่อ
                        </div>
                      </div>
                      <p className="indent-12 leading-relaxed">
                        พร้อมคำขอนี้ ข้าพเจ้าได้แนบบัตรประจำตัวประชาชน มาเพื่อเป็นหลักฐาน จำนวน 1 ฉบับ
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="indent-12 leading-relaxed pt-1">
                        ขอยื่นคำร้องต่อนายกเทศมนตรีตำบลบางเป้า ดังต่อไปนี้
                      </p>
                      <div className="p-2 border border-slate-300 rounded my-1 text-[13pt] bg-slate-50 min-h-16">
                        {petition?.description ||
                          'ข้าพเจ้ามีความประสงค์ขอรับการสนับสนุนและความอนุเคราะห์ด้านงานสาธารณสุขและสิ่งแวดล้อม'}
                      </div>
                      <p className="indent-12 leading-relaxed">
                        จึงเรียนมาเพื่อโปรดทราบและพิจารณาดำเนินการต่อไป
                      </p>
                    </>
                  )}
                </div>

                {/* Signer Row 1: ผอ.กอง & ผู้ยื่น */}
                <div className="grid grid-cols-2 gap-4 mt-6 text-[13pt] leading-tight">
                  <div>
                    <div className="text-slate-600 mb-1">
                      {isSewage ? 'ความเห็น ผอ.กองสาธารณสุข:' : 'เรียน นายกเทศมนตรีตำบลบางเป้า'}
                    </div>
                    <div>- เพื่อโปรดทราบและพิจารณา</div>
                    <div className="mt-6">ลงชื่อ......................................................</div>
                    <div className="font-bold">({directorName})</div>
                    <div className="text-xs text-slate-700">{directorPos}</div>
                  </div>

                  <div className="text-right">
                    <div className="invisible mb-1">-</div>
                    <div className="invisible">-</div>
                    <div className="mt-6">ลงชื่อ......................................................ผู้ยื่นคำร้อง</div>
                    <div className="font-bold">({petition?.citizenName || '......................................................'})</div>
                    <div className="text-xs text-slate-700">ผู้ขอรับบริการ</div>
                  </div>
                </div>

                {/* Signer Row 2: ปลัดเทศบาล & นายกเทศมนตรี */}
                <div className="grid grid-cols-2 gap-4 mt-6 text-[13pt] leading-tight pt-3 border-t border-slate-300">
                  <div>
                    <div className="text-slate-600 mb-1">ความเห็นปลัดเทศบาล:</div>
                    <div>เห็นควรอนุมัติ / มอบหมายงาน</div>
                    <div className="mt-6">ลงชื่อ......................................................</div>
                    <div className="font-bold">({clerkName})</div>
                    <div className="text-xs text-slate-700">{clerkPos}</div>
                  </div>

                  <div className="text-center bg-slate-50 p-3 rounded-lg border border-slate-300">
                    <div className="font-bold mb-1">ความคิดเห็นนายกเทศมนตรีตำบลบางเป้า/ผู้แทน</div>
                    <div className="flex justify-center gap-4 text-xs my-1 font-semibold">
                      <span>[  ] อนุมัติ</span>
                      <span>[  ] ไม่อนุมัติ เพราะ..............</span>
                    </div>
                    <div className="mt-5">ลงชื่อ......................................................</div>
                    <div className="font-bold">({mayorName})</div>
                    <div className="text-xs text-slate-700 whitespace-pre-line">{mayorPos}</div>
                  </div>
                </div>

                {/* Bottom Boxes: ผลการปฏิบัติงาน & เจ้าหน้าที่รับเรื่อง */}
                {isSewage ? (
                  <div className="grid grid-cols-2 gap-3 mt-6 border border-slate-400 p-3 text-[12pt] rounded leading-snug">
                    <div>
                      <div className="font-bold">ผลการปฏิบัติงาน:</div>
                      <div>ดำเนินการแล้ว เมื่อวันที่........เดือน........พ.ศ........</div>
                      <div className="mt-3">ลงชื่อ..........................................พนักงานขับรถ</div>
                      <div className="font-bold">({driverName})</div>
                    </div>
                    <div>
                      <div className="font-bold">บันทึกเจ้าหน้าที่เก็บค่าธรรมเนียม:</div>
                      <div>ได้รับค่าธรรมเนียม {selectedFee} บาท เรียบร้อยแล้ว</div>
                      <div className="mt-3">ลงชื่อ..........................................ผู้จัดเก็บรายได้</div>
                      <div>(......................................................)</div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 mt-6 border border-slate-400 p-3 text-[12pt] rounded leading-snug">
                    <div>
                      <div className="font-bold">บันทึกเจ้าหน้าที่ผู้รับคำขอ:</div>
                      <div>ได้รับคำร้องและลงบันทึกรับเรื่องในระบบแล้ว</div>
                      <div className="mt-3">ลงชื่อ..........................................เจ้าหน้าที่</div>
                      <div>(......................................................)</div>
                    </div>
                    <div>
                      <div className="font-bold">ผลการปฏิบัติงาน:</div>
                      <div>[  ] ดำเนินการแล้วเสร็จ  [  ] รอดำเนินการ</div>
                      <div className="mt-3">ลงชื่อ..........................................ผู้รายงาน</div>
                      <div>(......................................................)</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
