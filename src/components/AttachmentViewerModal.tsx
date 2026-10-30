import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Printer,
  ExternalLink,
  FileText,
  Loader2,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Calendar,
  Building,
  Hash,
} from 'lucide-react';
import { CalendarAttachment, CalendarEventItem } from './MunicipalCalendarPanel.tsx';
import { loadFileBlob, downloadBlob } from '../services/fileStorageService.ts';
import { formatFileSize } from '../utils/dateUtils.ts';

interface AttachmentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachment: CalendarAttachment | null;
  event?: CalendarEventItem | null;
}

export const AttachmentViewerModal: React.FC<AttachmentViewerModalProps> = ({
  isOpen,
  onClose,
  attachment,
  event,
}) => {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  useEffect(() => {
    if (!isOpen || !attachment) {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
      setBlob(null);
      setBlobUrl(null);
      setError(null);
      setZoomLevel(1);
      setRotation(0);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setError(null);
    setZoomLevel(1);
    setRotation(0);

    loadFileBlob(attachment.id, attachment.mimeType)
      .then((b) => {
        if (isCancelled) return;
        setBlob(b);
        const url = URL.createObjectURL(b);
        setBlobUrl(url);
      })
      .catch((err) => {
        if (isCancelled) return;
        console.error('Error loading attachment blob:', err);
        setError(err?.message || 'ไม่สามารถโหลดไฟล์ได้');
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [isOpen, attachment?.id]);

  if (!isOpen || !attachment) return null;

  const fileName = attachment.name || 'document';
  const isPdf = attachment.mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
  const isImg = attachment.mimeType.startsWith('image/');
  const isWord = fileName.toLowerCase().endsWith('.doc') || fileName.toLowerCase().endsWith('.docx');
  const isExcel = fileName.toLowerCase().endsWith('.xls') || fileName.toLowerCase().endsWith('.xlsx');

  const handleDownload = () => {
    if (blob) {
      downloadBlob(blob, fileName);
    }
  };

  const handlePrint = () => {
    if (blobUrl && isPdf) {
      const win = window.open(blobUrl);
      if (win) {
        win.focus();
        setTimeout(() => win.print(), 500);
      }
    } else if (blobUrl && isImg) {
      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.write(`
          <html>
            <head><title>${fileName}</title></head>
            <body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fff;">
              <img src="${blobUrl}" style="max-width:100%;max-height:100vh;object-fit:contain;" onload="window.print();" />
            </body>
          </html>
        `);
        printWin.document.close();
      }
    } else {
      handleDownload();
    }
  };

  return (
    <div className="fixed inset-0 z-[999999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 text-white rounded-3xl max-w-5xl w-full h-[92vh] shadow-2xl border border-slate-700/70 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-md">
              {isPdf ? 'PDF' : isImg ? 'IMG' : isWord ? 'DOC' : isExcel ? 'XLS' : 'FILE'}
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-sm text-white truncate leading-snug">{fileName}</h4>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span>{formatFileSize(attachment.size)}</span>
                {event?.title && (
                  <>
                    <span>•</span>
                    <span className="text-violet-300 truncate max-w-md">ภารกิจ: {event.title}</span>
                  </>
                )}
                {event?.fromAgency && (
                  <>
                    <span>•</span>
                    <span className="text-amber-300">จาก: {event.fromAgency}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {isImg && (
              <div className="hidden sm:flex items-center gap-1 bg-slate-800 rounded-xl p-1 border border-slate-700 mr-1">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                  className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white cursor-pointer"
                  title="ซูมออก"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-mono px-1 text-slate-400">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                  className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white cursor-pointer"
                  title="ซูมเข้า"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white cursor-pointer ml-1"
                  title="หมุนรูป"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
            )}

            {(isPdf || isImg) && (
              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                title="พิมพ์เอกสาร A4"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">พิมพ์ A4</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownload}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all hover:scale-105"
              title="ดาวน์โหลดไฟล์ลงเครื่อง"
            >
              <Download className="w-4 h-4" />
              <span>ดาวน์โหลด</span>
            </button>

            {blobUrl && (
              <a
                href={blobUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
                title="เปิดในแท็บใหม่เต็มจอ"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-white border border-slate-700 cursor-pointer transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 bg-slate-950 overflow-auto flex items-center justify-center p-4 relative">
          {isLoading && (
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
              <p className="text-xs">กำลังโหลดเนื้อหาไฟล์...</p>
            </div>
          )}

          {error && (
            <div className="max-w-md p-6 rounded-3xl bg-rose-950/60 border border-rose-800/80 text-center space-y-3">
              <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
              <h4 className="font-bold text-sm text-white">ไม่สามารถเปิดไฟล์ได้</h4>
              <p className="text-xs text-rose-200">{error}</p>
              <button
                type="button"
                onClick={handleDownload}
                className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs cursor-pointer"
              >
                ลองดาวน์โหลดลงเครื่อง
              </button>
            </div>
          )}

          {!isLoading && !error && blobUrl && isPdf && (
            <iframe
              src={blobUrl}
              title={fileName}
              className="w-full h-full rounded-2xl border border-slate-800 bg-white"
            />
          )}

          {!isLoading && !error && blobUrl && isImg && (
            <div className="w-full h-full flex items-center justify-center overflow-auto">
              <img
                src={blobUrl}
                alt={fileName}
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s ease',
                }}
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
              />
            </div>
          )}

          {!isLoading && !error && blobUrl && !isPdf && !isImg && (
            <div className="max-w-lg p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-violet-600/20 text-violet-400 flex items-center justify-center mx-auto border border-violet-500/30">
                <FileText className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-base text-white">{fileName}</h4>
                <p className="text-xs text-slate-400">
                  ไฟล์เอกสารประเภท {isWord ? 'Microsoft Word (.docx)' : isExcel ? 'Microsoft Excel (.xlsx)' : attachment.mimeType}
                </p>
                <p className="text-xs text-slate-500">
                  เบราว์เซอร์ไม่รองรับการแสดงตัวอย่างโดยตรง กรุณากดดาวน์โหลดเพื่อเปิดด้วยโปรแกรมในเครื่องของคุณ
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>ดาวน์โหลดไฟล์ ({formatFileSize(attachment.size)})</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Context Info Footer */}
        {event && (
          <div className="px-5 py-2.5 bg-slate-900 border-t border-slate-800 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-violet-400" />
                <span>วันที่: {event.date} ({event.startTime} - {event.endTime} น.)</span>
              </span>
              {event.location && (
                <span className="text-slate-400">📍 {event.location}</span>
              )}
              {event.docNo && (
                <span className="text-amber-300 font-mono">เลขที่: {event.docNo}</span>
              )}
            </div>
            <div className="text-[11px] text-slate-500">
              กองสาธารณสุขและสิ่งแวดล้อม เทศบาลตำบลบางเป้า
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
