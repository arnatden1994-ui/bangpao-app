import React, { useState, useEffect, useRef } from 'react';
import {
  Maximize2,
  Minimize2,
  ExternalLink,
  RotateCcw,
  FileSpreadsheet,
  Shield,
  ClipboardCheck,
  FileCheck2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { HazardousBusiness } from '../types/index.ts';
import { DEFAULT_GAS_URL, DEFAULT_SHEET_ID } from '../services/sheetsSync.ts';

interface OriginalGasAppViewProps {
  gasUrl: string;
  sheetId?: string;
  activeView?: 'dashboard' | 'form';
  onViewChange?: (view: 'dashboard' | 'form') => void;
  hazardousBusinesses?: HazardousBusiness[];
  onAddNewBusiness?: () => void;
}

export const OriginalGasAppView: React.FC<OriginalGasAppViewProps> = ({
  gasUrl,
  sheetId,
  activeView = 'dashboard',
  onViewChange,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const effectiveGasUrl = gasUrl || DEFAULT_GAS_URL;
  const effectiveSheetId = sheetId || DEFAULT_SHEET_ID;

  // Build target URL with parameter
  const viewParam = activeView === 'form' ? 'assessment' : 'dashboard';
  const iframeUrl = `${effectiveGasUrl}${effectiveGasUrl.includes('?') ? '&' : '?'}view=${viewParam}&tab=${viewParam}#${viewParam}`;

  // Listen to postMessage from inside iframe (when user clicks menu buttons inside the Apps Script page)
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      try {
        if (e.data && e.data.type === 'view_changed' && (e.data.view === 'form' || e.data.view === 'dashboard')) {
          if (onViewChange) onViewChange(e.data.view);
        }
      } catch {
        // Ignored
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onViewChange]);

  const handleReload = () => {
    setIsLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = iframeUrl;
    }
  };

  return (
    <div className={`space-y-3 ${isFullscreen ? 'fixed inset-0 z-50 bg-[#f4f7fa] p-3 flex flex-col' : 'w-full'} animate-in fade-in duration-200`}>
      {/* Top Control Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-100/80 text-emerald-800 flex items-center justify-center shrink-0 shadow-xs">
            <Shield className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                {activeView === 'form'
                  ? '📝 ฟอร์มตรวจประเมินสุขลักษณะสถานประกอบการ'
                  : '📊 แดชบอร์ดติดตามผลอนุมัติใบอนุญาต (36 ร้านค้า)'}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                🟢 Google Apps Script ต้นฉบับ 100%
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              กองสาธารณสุขและสิ่งแวดล้อม เทศบาลตำบลบางเป้า อ.กันตัง จ.ตรัง • เชื่อมต่อฐานข้อมูลจริงออนไลน์
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-stretch lg:self-auto flex-wrap">
          {/* Switch Sub-View Button */}
          <button
            onClick={() => {
              const target = activeView === 'form' ? 'dashboard' : 'form';
              if (onViewChange) onViewChange(target);
            }}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            {activeView === 'form' ? (
              <>
                <FileCheck2 className="w-4 h-4 text-emerald-700" />
                <span>เปิดหน้าแดชบอร์ดใบอนุญาต</span>
              </>
            ) : (
              <>
                <ClipboardCheck className="w-4 h-4 text-emerald-700" />
                <span>เปิดหน้าฟอร์มตรวจประเมิน</span>
              </>
            )}
          </button>

          {/* Reload Button */}
          <button
            onClick={handleReload}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
            title="รีเฟรชระบบ Apps Script"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">รีเฟรช</span>
          </button>

          {/* Google Sheets Link */}
          <button
            onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${effectiveSheetId}/edit`, '_blank')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
            title="เปิด Google Sheets ฐานข้อมูลจริง"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Google Sheets</span>
          </button>

          {/* Open in New Window */}
          <button
            onClick={() => window.open(iframeUrl, '_blank')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
            title="เปิดหน้าต่างแยกใหม่ในเบราว์เซอร์"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">เปิดแท็บใหม่</span>
          </button>

          {/* Fullscreen Toggle Button */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
            title={isFullscreen ? 'ย่อหน้าต่างกลับ' : 'ขยายเต็มจอ (Fullscreen)'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Guide Banner for User Navigation inside Apps Script */}
      <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-xl px-4 py-2 text-xs text-emerald-900 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>
            <strong>วิธีสลับหน้าในระบบ Apps Script:</strong> สามารถคลิกปุ่ม <strong>[แบบฟอร์มตรวจประเมิน]</strong> หรือ <strong>[แดชบอร์ดติดตามผลอนุมัติ]</strong> บนแถบเมนูสีเขียวเข้มด้านบนของหน้าต่างได้ทันที
          </span>
        </div>
        <a
          href={iframeUrl}
          target="_blank"
          rel="noreferrer"
          className="text-emerald-700 hover:underline font-bold shrink-0 hidden md:inline"
        >
          เปิดหน้าต่างแยก ↗
        </a>
      </div>

      {/* Embedded 100% Live Apps Script Iframe */}
      <div
        className={`relative bg-white rounded-2xl overflow-hidden border border-slate-200/90 shadow-xs ${
          isFullscreen ? 'flex-1 w-full' : 'w-full h-[calc(100vh-215px)] min-h-[760px]'
        }`}
      >
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-50/90 backdrop-blur-xs">
            <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-3 text-xs font-bold text-slate-700">กำลังเชื่อมต่อ Google Apps Script เดิม 100%...</p>
            <p className="text-[11px] text-slate-500 mt-1">
              {activeView === 'form' ? 'กำลังเปิดหน้าฟอร์มตรวจประเมินสุขลักษณะ' : 'กำลังเปิดหน้าแดชบอร์ดใบอนุญาต (36 ร้านค้า)'}
            </p>
          </div>
        )}

        <iframe
          ref={iframeRef}
          key={`${activeView}-${effectiveGasUrl}`}
          src={iframeUrl}
          title={`ระบบตรวจประเมินสุขลักษณะ EHWA - ทต.บางเป้า (Google Apps Script ต้นฉบับ 100%)`}
          className="w-full h-full border-0"
          onLoad={() => {
            setIsLoading(false);
          }}
          allow="accelerometer; autoplay; camera; microphone; clipboard-read; clipboard-write; encrypted-media; fullscreen; geolocation; gyroscope; picture-in-picture; web-share"
          sandbox="allow-downloads allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-top-navigation-by-user-activation allow-storage-access-by-user-activation"
        />
      </div>
    </div>
  );
};
