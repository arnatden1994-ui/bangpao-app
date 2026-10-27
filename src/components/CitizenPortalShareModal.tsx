import React, { useState } from 'react';
import {
  Globe,
  Share2,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Download,
  X,
  Stethoscope,
  Truck,
  FileText,
  Search,
  MessageSquare,
  Sparkles,
  Info,
  CheckCircle2,
} from 'lucide-react';

interface CitizenPortalShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CitizenPortalShareModal: React.FC<CitizenPortalShareModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<'main' | 'med_loan' | 'sewage' | 'general' | 'tracking'>('main');

  if (!isOpen) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://bangpao-app.vercel.app';

  const serviceLinks = {
    main: {
      title: 'ศูนย์บริการประชาชนรวมทุกบริการ (แนะนำ)',
      shortTitle: 'พอร์ทัลรวม 4 บริการ',
      desc: 'เข้าสู่หน้าหลักของประชาชน มีเมนูครบทั้ง 4 บริการในที่เดียว',
      url: `${origin}/?portal=citizen`,
      icon: Globe,
      color: 'emerald',
    },
    med_loan: {
      title: 'บริการยืม-คืนอุปกรณ์ทางการแพทย์',
      shortTitle: 'ยืมอุปกรณ์การแพทย์',
      desc: 'เข้าสู่แบบฟอร์มขอยืมเตียง, วีลแชร์, ที่นอนลม, ออกซิเจน พร้อมปักหมุดบ้าน',
      url: `${origin}/?portal=citizen&tab=med_loan`,
      icon: Stethoscope,
      color: 'teal',
    },
    sewage: {
      title: 'คำร้องขอรับบริการดูดสิ่งปฏิกูล (ส้วมเต็ม)',
      shortTitle: 'ขอดูดยานพาหนะสิ่งปฏิกูล',
      desc: 'เข้าสู่แบบฟอร์มขอรถดูดส้วม/สิ่งปฏิกูลของเทศบาลตำบลบางเป้า',
      url: `${origin}/?portal=citizen&tab=sewage`,
      icon: Truck,
      color: 'blue',
    },
    general: {
      title: 'ยื่นคำร้องทั่วไป & ร้องเรียนสุขาภิบาล',
      shortTitle: 'คำร้องทั่วไป / ร้องเรียน',
      desc: 'เข้าสู่แบบฟอร์มแจ้งเรื่องร้องเรียน กลิ่นเหม็น เสียงดัง หรือเหตุรำคาญ',
      url: `${origin}/?portal=citizen&tab=general`,
      icon: FileText,
      color: 'amber',
    },
    tracking: {
      title: 'ระบบติดตามสถานะคำร้อง & อุปกรณ์',
      shortTitle: 'ติดตามสถานะคำขอ',
      desc: 'เข้าสู่หน้าตรวจสอบความคืบหน้าคำขอด้วยหมายเลขโทรศัพท์หรือรหัสคำขอ',
      url: `${origin}/?portal=citizen&tab=tracking`,
      icon: Search,
      color: 'purple',
    },
  };

  const currentService = serviceLinks[selectedService];
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
    currentService.url
  )}`;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    });
  };

  const lineShareTemplate = `📢 เทศบาลตำบลบางเป้า ขอเชิญชวนประชาชนใช้บริการออนไลน์:
1. ขอยืมอุปกรณ์ทางการแพทย์ (เตียง, วีลแชร์, ที่นอนลม ฯลฯ)
2. ขอรับบริการดูดสิ่งปฏิกูล (ส้วมเต็ม)
3. ยื่นคำร้องทั่วไปและเหตุรำคาญ
4. ติดตามสถานะคำร้องแบบเรียลไทม์

📲 กดเข้าใช้งานได้ทันทีจากสมาร์ตโฟน:
${currentService.url}`;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-[28px] max-w-2xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 space-y-5 my-auto max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-700 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-700/30 shrink-0">
              <Share2 className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300/60 mb-1">
                <Globe className="w-3 h-3 text-emerald-600" />
                <span>ศูนย์บริการประชาชนออนไลน์ เทศบาลตำบลบางเป้า</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
                แชร์ลิงก์ & QR Code ให้ประชาชน
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer transition-colors shrink-0"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice Info Banner */}
        <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-start gap-3 text-xs text-emerald-950">
          <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-extrabold text-emerald-900">
              ประชาชนเปิดลิงก์นี้จากมือถือ จะเข้าหน้าบริการประชาชนได้ทันที 100%
            </div>
            <div className="text-emerald-800/90 leading-relaxed text-[11.5px]">
              ระบบได้ตั้งค่าข้ามหน้าจอล็อกอินของเจ้าหน้าที่อัตโนมัติ ประชาชนไม่ต้องจำรหัสผ่าน สามารถกรอกข้อมูล ปักหมุดพิกัด GPS บ้าน และยื่นเรื่องได้ทันที
            </div>
          </div>
        </div>

        {/* Service Selector Pills */}
        <div className="space-y-1.5">
          <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
            <span>เลือกลิงก์ปลายทางที่ต้องการแชร์:</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
            {(Object.keys(serviceLinks) as Array<keyof typeof serviceLinks>).map((key) => {
              const item = serviceLinks[key];
              const Icon = item.icon;
              const isSelected = selectedService === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedService(key)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-300 font-black'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 font-bold hover:border-slate-300'
                  }`}
                >
                  <Icon className={`w-4 h-4 mb-1 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                  <span className="text-[11px] leading-tight line-clamp-1">{item.shortTitle}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Service Card with QR Code and Link */}
        <div className="p-4 sm:p-5 bg-gradient-to-br from-slate-50 to-emerald-50/40 rounded-2xl border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            {/* QR Code */}
            <div className="flex flex-col items-center shrink-0">
              <div className="p-2.5 bg-white rounded-2xl border-2 border-emerald-300/80 shadow-md">
                <img
                  src={qrCodeUrl}
                  alt={`QR Code สำหรับ ${currentService.title}`}
                  className="w-40 h-40 sm:w-44 sm:h-44 object-contain rounded-lg"
                />
              </div>
              <a
                href={qrCodeUrl}
                target="_blank"
                rel="noopener noreferrer"
                download={`qrcode-bangpao-${selectedService}.png`}
                className="mt-2 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Download className="w-3 h-3" />
                <span>บันทึกรูป QR Code</span>
              </a>
            </div>

            {/* Link details & Actions */}
            <div className="flex-1 min-w-0 space-y-3 w-full">
              <div>
                <h4 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  <span>{currentService.title}</span>
                </h4>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  {currentService.desc}
                </p>
              </div>

              {/* URL Box */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={currentService.url}
                    className="flex-1 p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800 select-all font-semibold shadow-inner focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(currentService.url, 'url')}
                    className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all shrink-0 active:scale-95"
                  >
                    {copiedKey === 'url' ? (
                      <>
                        <Check className="w-4 h-4 text-white" />
                        <span>คัดลอกแล้ว</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>คัดลอก</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Action Buttons: Preview + Share Message */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <a
                  href={currentService.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 min-w-[150px] py-2 px-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                  <span>เปิดดูมุมมองประชาชน (พรีวิว)</span>
                </a>

                <button
                  type="button"
                  onClick={() => handleCopy(lineShareTemplate, 'line')}
                  className="flex-1 min-w-[150px] py-2 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  {copiedKey === 'line' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>คัดลอกข้อความ LINE แล้ว</span>
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>คัดลอกข้อความสำหรับส่ง LINE</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
          <span className="text-slate-500 font-medium hidden sm:inline">
            📍 เทศบาลตำบลบางเป้า อ.กันตัง จ.ตรัง
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
