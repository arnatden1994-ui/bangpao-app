import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Code2,
  UploadCloud,
  DownloadCloud,
  HelpCircle,
} from 'lucide-react';
import { GoogleSheetsConfig } from '../types/index.ts';
import {
  DEFAULT_GAS_URL,
  GOOGLE_APPS_SCRIPT_TEMPLATE,
  testAppsScriptConnection,
} from '../services/sheetsSync.ts';

interface GoogleSheetsSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: GoogleSheetsConfig;
  onSaveConfig: (newConfig: GoogleSheetsConfig) => void;
  onSyncPush: () => Promise<void>;
  onSyncPull: () => Promise<void>;
  isSyncing: boolean;
  onResetMockData: () => void;
}

export const GoogleSheetsSettingsModal: React.FC<GoogleSheetsSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onSyncPush,
  onSyncPull,
  isSyncing,
  onResetMockData,
}) => {
  if (!isOpen) return null;

  const [url, setUrl] = useState(config.appsScriptUrl || DEFAULT_GAS_URL);
  const [autoSync, setAutoSync] = useState(config.autoSync ?? true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: unknown;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'settings' | 'code' | 'guide'>('settings');
  const [copiedCode, setCopiedCode] = useState(false);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testAppsScriptConnection(url.trim());
      setTestResult(result);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setTestResult({
        success: false,
        message: 'เกิดข้อผิดพลาดในการทดสอบ: ' + msg,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    onSaveConfig({
      ...config,
      appsScriptUrl: url.trim(),
      autoSync,
    });
    onClose();
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                การเชื่อมต่อฐานข้อมูล Google Sheets & Apps Script
              </h2>
              <p className="text-xs text-emerald-100/80 mt-0.5">
                ซิงค์ข้อมูลสถานประกอบการและผลการตรวจประเมินกับ Google Spreadsheet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-2 text-xs font-medium">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2.5 border-b-2 transition-colors ${
              activeTab === 'settings'
                ? 'border-emerald-600 text-emerald-700 font-bold bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            ตั้งค่า URL & ซิงค์ข้อมูล
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-4 py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'code'
                ? 'border-emerald-600 text-emerald-700 font-bold bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>โค้ด Apps Script (Code.gs)</span>
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-4 py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'guide'
                ? 'border-emerald-600 text-emerald-700 font-bold bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>วิธีติดตั้ง 3 ขั้นตอน</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {activeTab === 'settings' && (
            <div className="space-y-5">
              {/* URL Input */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Google Apps Script Web App URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-300 font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testing || !url.trim()}
                    className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-900 text-white transition-colors disabled:opacity-50 shrink-0 flex items-center gap-1.5"
                  >
                    {testing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>กำลังทดสอบ...</span>
                      </>
                    ) : (
                      <span>ทดสอบการเชื่อมต่อ</span>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  * แอปพลิเคชันตั้งค่าเริ่มต้นเป็นลิงก์ Web App ตามที่คุณระบุไว้เรียบร้อยแล้ว
                </p>
              </div>

              {/* Test Result Message Box */}
              {testResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs ${
                    testResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold">{testResult.message}</div>
                      {!testResult.success && (
                        <p className="text-[11px] text-amber-800/90 mt-1 leading-relaxed">
                          คำแนะนำ: หากเปิดใช้ Google Sheet ของคุณเอง ให้ตรวจดูว่าตอนกด <strong>Deploy</strong> ได้เลือก <em>&quot;Who has access: Anyone&quot;</em> หรือยัง หากเลือกเป็น Only myself เบราว์เซอร์จะไม่สามารถซิงค์ได้
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Auto-Sync Toggle Card */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <RefreshCw className={`w-4 h-4 ${autoSync ? 'animate-spin-slow' : ''}`} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-950 flex items-center gap-2">
                      <span>บันทึกและซิงค์อัตโนมัติ (Auto-Sync)</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800 font-semibold">แนะนำ</span>
                    </div>
                    <p className="text-[11px] text-emerald-800/80 mt-0.5 leading-relaxed">
                      เมื่อเปิดใช้งาน ทุกครั้งที่มีการบันทึกผลตรวจ ยื่นคำร้อง ออกใบอนุญาต หรือแก้ไขข้อมูล ระบบจะส่งขึ้น Google Sheets ในพื้นหลังทันทีโดยอัตโนมัติ (ไม่ต้องกดปุ่มเอง)
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={autoSync}
                    onChange={(e) => setAutoSync(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Two-way Sync Actions */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                <div className="text-xs font-bold text-slate-800">การซิงค์ข้อมูลกับ Google Sheets:</div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={onSyncPush}
                    disabled={isSyncing}
                    className="p-3 rounded-lg border border-emerald-200 bg-white hover:bg-emerald-50/80 text-emerald-800 transition-colors flex items-center gap-3 text-left shadow-xs disabled:opacity-50"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <UploadCloud className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold">ส่งข้อมูลขึ้น Sheets (Push)</div>
                      <div className="text-[11px] text-slate-500">
                        อัปเดตสถานประกอบการ & ผลตรวจ
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={onSyncPull}
                    disabled={isSyncing}
                    className="p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-800 transition-colors flex items-center gap-3 text-left shadow-xs disabled:opacity-50"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                      <DownloadCloud className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold">ดึงข้อมูลจาก Sheets (Pull)</div>
                      <div className="text-[11px] text-slate-500">
                        โหลดรายการใหม่จาก Google Sheet
                      </div>
                    </div>
                  </button>
                </div>

                {config.lastSyncTime && (
                  <div className="text-[11px] text-slate-500 pt-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>ซิงค์ล่าสุดเมื่อ: {new Date(config.lastSyncTime).toLocaleString('th-TH')}</span>
                  </div>
                )}
              </div>

              {/* Reset to initial mock data */}
              <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100">
                <span>ต้องการรีเซ็ตข้อมูลตัวอย่างร้านอาหารและเกณฑ์มาตรฐาน?</span>
                <button
                  type="button"
                  onClick={onResetMockData}
                  className="text-slate-600 hover:text-rose-600 underline font-medium"
                >
                  โหลดข้อมูลตัวอย่างเริ่มต้น
                </button>
              </div>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800">
                    สคริปต์ Google Apps Script สำหรับใส่ใน Google Sheets
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    สร้างแท็บ &quot;Establishments&quot; และ &quot;Inspections&quot; อัตโนมัติเมื่อกดซิงค์
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-xs transition-all"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'คัดลอกแล้ว!' : 'คัดลอกโค้ดทั้งหมด'}</span>
                </button>
              </div>

              <div className="relative">
                <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto max-h-[350px] leading-relaxed border border-slate-800">
                  {GOOGLE_APPS_SCRIPT_TEMPLATE}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs text-slate-700">
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <h4 className="font-bold text-emerald-900 mb-1">
                  ขั้นตอนการนำไปใช้กับ Google Spreadsheet ส่วนตัวของคุณ:
                </h4>
                <ol className="list-decimal pl-5 space-y-2 mt-2 leading-relaxed text-emerald-950">
                  <li>
                    เปิด <strong>script.google.com</strong> แล้วสร้างโครงการ Apps Script ใหม่สำหรับการเชื่อมต่อโดยเฉพาะ
                    (ห้ามแทนที่สคริปต์เดิมของระบบตรวจกิจการ)
                  </li>
                  <li>
                    วางโค้ดจากแท็บ{' '}
                    <strong>&quot;โค้ด Apps Script&quot;</strong> ที่เตรียมไว้ให้ลงไป จากนั้นกดไอคอนบันทึก
                    (แผ่นดิสก์)
                  </li>
                  <li>
                    คลิกปุ่มสีน้ำเงิน <strong>&quot;ทำให้ใช้งานได้ (Deploy)&quot; &gt; &quot;การทำให้ใช้งานได้รายการใหม่ (New deployment)&quot;</strong>
                  </li>
                  <li>
                    เลือกประเภทเป็น <strong>เว็บแอป (Web app)</strong>
                  </li>
                  <li>
                    ตรง <strong>&quot;ผู้ที่มีสิทธิ์เข้าถึง (Who has access)&quot;</strong> ให้เลือกเป็น{' '}
                    <span className="font-bold text-rose-700 underline">ทุกคน (Anyone)</span>{' '}
                    <em>(สำคัญมาก เพื่อให้ระบบหน้าเว็บสามารถส่งและดึงข้อมูลได้โดยไม่ติดหน้าล็อกอิน)</em>
                  </li>
                  <li>
                    กด Deploy แล้วคัดลอก <strong>Web app URL</strong> มาวางในช่อง URL ของโปรแกรมนี้!
                  </li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            ปิด
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
          >
            บันทึกการตั้งค่า
          </button>
        </div>
      </div>
    </div>
  );
};
