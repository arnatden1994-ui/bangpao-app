import React, { useState } from 'react';
import {
  Cloud,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Database,
  X,
} from 'lucide-react';
import { seedAllDataToFirestore } from '../services/firebaseService.ts';
import { firebaseConfig } from '../services/firebase.ts';

interface FirebaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData?: () => void;
}

export const FirebaseSyncModal: React.FC<FirebaseSyncModalProps> = ({
  isOpen,
  onClose,
  onRefreshData,
}) => {
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [progress, setProgress] = useState(0);

  if (!isOpen) return null;

  const handleSeedFirestore = async () => {
    if (!window.confirm('คุณต้องการอัปโหลดข้อมูลทั้งหมด (ใบอนุญาต, อุปกรณ์การแพทย์, คำร้อง, กปท.) ขึ้นสู่ Firebase Firestore หรือไม่?')) {
      return;
    }

    setLoading(true);
    setStatusMsg('กำลังเริ่มอัปโหลด...');
    setProgress(5);

    const result = await seedAllDataToFirestore((msg, pct) => {
      setStatusMsg(msg);
      setProgress(pct);
    });

    setLoading(false);
    if (result.success) {
      alert('🎉 ' + result.message);
      if (onRefreshData) onRefreshData();
    } else {
      alert('⚠️ ' + result.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Cloud className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">เชื่อมต่อ Firebase & Google AI Studio</h3>
              <p className="text-xs text-orange-100">โปรเจกต์: {firebaseConfig.projectId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Firebase Connection Card */}
          <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-amber-600" />
                <h4 className="font-bold text-gray-900 text-sm">สถานะ Cloud Firestore</h4>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" /> พร้อมใช้งาน (Connected)
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div className="bg-white p-2.5 rounded-lg border border-amber-100">
                <span className="text-gray-400 block text-[10px]">Project ID</span>
                <span className="font-mono font-bold text-gray-800">{firebaseConfig.projectId}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-amber-100">
                <span className="text-gray-400 block text-[10px]">Auth Domain</span>
                <span className="font-mono text-gray-800 truncate block">{firebaseConfig.authDomain}</span>
              </div>
            </div>

            {/* Seed / Sync button */}
            <div className="mt-4 pt-3 border-t border-amber-200/60">
              <button
                type="button"
                onClick={handleSeedFirestore}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl font-bold text-sm shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{statusMsg || 'กำลังบันทึกลง Firebase...'} ({progress}%)</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>อัปโหลดฐานข้อมูลตั้งต้นทุกระบบขึ้น Cloud Firestore</span>
                  </>
                )}
              </button>
              <p className="text-[11px] text-gray-500 mt-2 text-center">
                * กดปุ่มนี้เพื่อถ่ายโอนข้อมูลใบอนุญาต, อุปกรณ์การแพทย์, คำร้อง, กปท. ขึ้นสู่ Cloud ทันที
              </p>
            </div>
          </div>

          {/* Google AI Studio (Gemini) Card */}
          <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h4 className="font-bold text-gray-900 text-sm">Google AI Studio (Gemini Server API)</h4>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" /> พร้อมใช้งานผ่าน Server Proxy
              </span>
            </div>

            <p className="text-xs text-gray-600 mb-2">
              ขับเคลื่อนด้วยโมเดล Gemini 2.5 Flash บนฝั่งเซิร์ฟเวอร์แบบปลอดภัย (Server-Side Proxy) สำหรับการวิเคราะห์ผลการตรวจประเมินสุขลักษณะสถานประกอบการ, สรุปข้อบกพร่อง, และจำแนกคำร้องเรียน
            </p>
            <div className="bg-white p-3 rounded-lg border border-indigo-100 text-xs text-indigo-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>การเชื่อมต่อระบบปัญญาประดิษฐ์ถูกบริหารจัดการโดยอัตโนมัติผ่านสภาพแวดล้อมระบบ ไม่ต้องระบุคีย์ด้วยตนเอง</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs rounded-lg transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
