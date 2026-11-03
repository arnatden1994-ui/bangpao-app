import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Users,
  Building2,
  Coins,
  Calendar,
  Plus,
  Trash2,
  CheckCircle,
  FileSignature,
  Sliders,
  DollarSign,
  RotateCcw,
} from 'lucide-react';
import { NhsoFundSettings } from '../types/index.ts';
import { DEFAULT_NHSO_FUND_SETTINGS } from '../data/initialNhsoFundProjects.ts';

interface NhsoFundSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: NhsoFundSettings;
  onSave: (newSettings: NhsoFundSettings) => void;
}

export const NhsoFundSettingsModal: React.FC<NhsoFundSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const [formData, setFormData] = useState<NhsoFundSettings>({ ...settings });
  const [activeTab, setActiveTab] = useState<'signers' | 'rates' | 'proposers'>('signers');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [sync2569Message, setSync2569Message] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData({ ...settings });
      setSync2569Message(null);
    }
  }, [settings, isOpen]);

  // New Proposer form state
  const [newOrgName, setNewOrgName] = useState('');
  const [newProposerName, setNewProposerName] = useState('');
  const [newProposerTitle, setNewProposerTitle] = useState('');

  if (!isOpen) return null;

  const handleSyncFrom2569 = () => {
    const master2569Defaults = {
      ...(DEFAULT_NHSO_FUND_SETTINGS.orgProposerDefaults || {}),
    };
    const updatedSettings: NhsoFundSettings = {
      ...formData,
      orgProposerDefaults: master2569Defaults,
      updatedAt: new Date().toISOString(),
    };
    setFormData(updatedSettings);
    onSave(updatedSettings);
    setSync2569Message('อัปเดตรายชื่อและตำแหน่งผู้เสนอทั้ง 16 หน่วยงานตามข้อมูลจริงปีงบประมาณ 2569 เรียบร้อยแล้ว!');
    setTimeout(() => setSync2569Message(null), 4000);
  };

  const handleSave = () => {
    const updated = {
      ...formData,
      updatedAt: new Date().toISOString(),
    };
    onSave(updated);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 900);
  };

  const handleAddOrgProposer = () => {
    if (!newOrgName.trim() || !newProposerName.trim()) return;
    setFormData((prev) => ({
      ...prev,
      orgProposerDefaults: {
        ...(prev.orgProposerDefaults || {}),
        [newOrgName.trim()]: {
          name: newProposerName.trim(),
          title: newProposerTitle.trim() || 'ผู้รับผิดชอบโครงการ',
        },
      },
    }));
    setNewOrgName('');
    setNewProposerName('');
    setNewProposerTitle('');
  };

  const handleRemoveOrgProposer = (org: string) => {
    setFormData((prev) => {
      const copy = { ...(prev.orgProposerDefaults || {}) };
      delete copy[org];
      return {
        ...prev,
        orgProposerDefaults: copy,
      };
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-md">
              <FileSignature className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                ตั้งค่าระบบกองทุน สปสช. ตำบลบางเป้า
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/20 font-normal">
                  รอบปีงบ {formData.fiscalYear}
                </span>
              </h2>
              <p className="text-xs text-white/80 mt-0.5">
                กำหนดผู้ลงนาม 3 ระดับ, อัตราค่าใช้จ่ายมาตรฐาน และรายชื่อผู้เสนอตามหน่วยงาน
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('signers')}
            className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm rounded-t-xl transition-all border-b-2 ${
              activeTab === 'signers'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 border-emerald-500 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            ผู้ลงนามหลัก (เห็นชอบ & อนุมัติ)
          </button>
          <button
            onClick={() => setActiveTab('proposers')}
            className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm rounded-t-xl transition-all border-b-2 ${
              activeTab === 'proposers'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 border-emerald-500 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            ผู้เสนอเริ่มต้นตามหน่วยงาน ({Object.keys(formData.orgProposerDefaults || {}).length})
          </button>
          <button
            onClick={() => setActiveTab('rates')}
            className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm rounded-t-xl transition-all border-b-2 ${
              activeTab === 'rates'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 border-emerald-500 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Coins className="w-4 h-4" />
            อัตราค่าใช้จ่ายมาตรฐาน & กรอบวงเงิน
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: SIGNERS */}
          {activeTab === 'signers' && (
            <div className="space-y-6">
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-4 text-xs text-amber-800 dark:text-amber-300">
                💡 <strong>คำชี้แจง:</strong> รายชื่อผู้ลงนามนี้จะถูกนำไปใช้อัตโนมัติในใบเสนอโครงการ 13 คอลัมน์ และแบบสรุปโครงการ โดยสามารถแก้ไขชื่อเฉพาะโครงการได้เสมอ
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* ผู้เห็นชอบ */}
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-5 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-base">
                      ผู้เห็นชอบโครงการ (เลขานุการกองทุนฯ)
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        ชื่อ-นามสกุล (ผู้เห็นชอบ)
                      </label>
                      <input
                        type="text"
                        value={formData.defaultEndorserName}
                        onChange={(e) =>
                          setFormData({ ...formData, defaultEndorserName: e.target.value })
                        }
                        className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        placeholder="เช่น นายโชคชัย  รอดรักษา"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        ตำแหน่งผู้เห็นชอบ
                      </label>
                      <input
                        type="text"
                        value={formData.defaultEndorserTitle}
                        onChange={(e) =>
                          setFormData({ ...formData, defaultEndorserTitle: e.target.value })
                        }
                        className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        placeholder="เช่น เลขานุการกองทุนฯ ทต.บางเป้า"
                      />
                    </div>
                  </div>
                </div>

                {/* ผู้อนุมัติ */}
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-5 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-base">
                      ผู้อนุมัติโครงการ (ประธานกองทุนฯ)
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        ชื่อ-นามสกุล (ผู้อนุมัติ)
                      </label>
                      <input
                        type="text"
                        value={formData.defaultApproverName}
                        onChange={(e) =>
                          setFormData({ ...formData, defaultApproverName: e.target.value })
                        }
                        className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        placeholder="เช่น นายละอม  เชื้อช่วย"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        ตำแหน่งผู้อนุมัติ
                      </label>
                      <input
                        type="text"
                        value={formData.defaultApproverTitle}
                        onChange={(e) =>
                          setFormData({ ...formData, defaultApproverTitle: e.target.value })
                        }
                        className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        placeholder="เช่น ประธานกองทุนฯ ทต.บางเป้า"
                      />
                    </div>
                  </div>
                </div>

                {/* เจ้าหน้าที่ผู้บันทึกข้อมูลกองทุน สปสช. (เริ่มต้น) */}
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-5 border border-slate-200 dark:border-slate-800 md:col-span-2">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-base">
                      เจ้าหน้าที่ผู้บันทึกข้อมูลกองทุน สปสช. (ค่าเริ่มต้น)
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        ชื่อ-นามสกุล (ผู้บันทึกข้อมูล)
                      </label>
                      <input
                        type="text"
                        value={formData.defaultRecorderName || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, defaultRecorderName: e.target.value })
                        }
                        className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        placeholder="เช่น พันจ่าเอกอานัส เด็นหมาด"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        ตำแหน่งผู้บันทึกข้อมูล
                      </label>
                      <input
                        type="text"
                        value={formData.defaultRecorderTitle || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, defaultRecorderTitle: e.target.value })
                        }
                        className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        placeholder="เช่น เจ้าพนักงานสาธารณสุข"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Fiscal Year Setting */}
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-5 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h4 className="font-medium text-slate-800 dark:text-slate-200 text-sm">
                    ปีงบประมาณที่กำลังเปิดดำเนินการ (Active Fiscal Year)
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    โครงการใหม่ที่สร้างจะถูกผูกกับปีงบประมาณนี้โดยค่าเริ่มต้น
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={formData.fiscalYear}
                    onChange={(e) => setFormData({ ...formData, fiscalYear: e.target.value })}
                    className="w-28 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-center text-emerald-600 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROPOSERS BY ORG */}
          {activeTab === 'proposers' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-base">
                    รายชื่อผู้เสนอโครงการค่าเริ่มต้น (จำแนกตามหน่วยงาน)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    เมื่อเลือกหน่วยงานในแบบฟอร์ม ระบบจะกรอกชื่อและตำแหน่งผู้เสนอให้อัตโนมัติ (อ้างอิงฐานข้อมูลปีงบประมาณ 2569)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSyncFrom2569}
                  className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  ดึงรายชื่อและตำแหน่งปี 2569 มาอัปเดตทั้งหมด
                </button>
              </div>

              {sync2569Message && (
                <div className="px-4 py-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  {sync2569Message}
                </div>
              )}

              {/* Add New Org */}
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-4">
                <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  เพิ่มหน่วยงาน / ผู้เสนอโครงการใหม่
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <div>
                    <input
                      type="text"
                      placeholder="ชื่อหน่วยงาน เช่น รร.บ้านบางเป้า"
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="ชื่อ-สกุล ผู้เสนอ เช่น นาย..."
                      value={newProposerName}
                      onChange={(e) => setNewProposerName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="ตำแหน่ง เช่น ผู้อำนวยการโรงเรียน..."
                      value={newProposerTitle}
                      onChange={(e) => setNewProposerTitle(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddOrgProposer}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> บันทึกหน่วยงานนี้
                </button>
              </div>

              {/* Table of Org Defaults */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">หน่วยงานผู้ขอ</th>
                      <th className="py-2.5 px-3">ชื่อผู้เสนอโครงการ</th>
                      <th className="py-2.5 px-3">ตำแหน่งผู้เสนอ</th>
                      <th className="py-2.5 px-2 text-center w-12">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {Object.entries(formData.orgProposerDefaults || {}).map(([org, item]) => (
                      <tr key={org} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                          {org}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => {
                              const newName = e.target.value;
                              setFormData((prev) => ({
                                ...prev,
                                orgProposerDefaults: {
                                  ...prev.orgProposerDefaults,
                                  [org]: { ...item, name: newName },
                                },
                              }));
                            }}
                            className="w-full px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-emerald-500 bg-transparent text-xs"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => {
                              const newTitle = e.target.value;
                              setFormData((prev) => ({
                                ...prev,
                                orgProposerDefaults: {
                                  ...prev.orgProposerDefaults,
                                  [org]: { ...item, title: newTitle },
                                },
                              }));
                            }}
                            className="w-full px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-emerald-500 bg-transparent text-xs"
                          />
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveOrgProposer(org)}
                            className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                            title="ลบหน่วยงานนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: RATES & FUND BUDGET */}
          {activeTab === 'rates' && (
            <div className="space-y-6">
              {/* Fund Budget */}
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-5 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="w-5 h-5 text-amber-500" />
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-base">
                    กรอบวงเงินงบประมาณกองทุนฯ ประจำปี (บาท)
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  ยอดงบประมาณจัดสรรทั้งหมดของกองทุนสุขภาพตำบลบางเป้า เพื่อใช้คำนวณงบคงเหลือ
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={formData.totalFundBudget}
                    onChange={(e) =>
                      setFormData({ ...formData, totalFundBudget: parseFloat(e.target.value) || 0 })
                    }
                    className="w-48 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-lg text-emerald-600 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-400">บาท</span>
                </div>
              </div>

              {/* Standard Rates */}
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-5 border border-slate-200 dark:border-slate-800">
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-base mb-1">
                  อัตราค่าใช้จ่ายมาตรฐานตามระเบียบ สปสช.
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  ใช้อ้างอิงและช่วยเติมงบประมาณในแบบเสนอโครงการโดยอัตโนมัติ (1-Click)
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      ค่าตอบแทนวิทยากร (บาท/ชม.)
                    </label>
                    <input
                      type="number"
                      value={formData.standardRates.speakerHourly}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          standardRates: {
                            ...formData.standardRates,
                            speakerHourly: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                      className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-sm font-semibold"
                    />
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      ค่าอาหารกลางวัน (บาท/มื้อ)
                    </label>
                    <input
                      type="number"
                      value={formData.standardRates.lunchPerMeal}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          standardRates: {
                            ...formData.standardRates,
                            lunchPerMeal: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                      className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-sm font-semibold"
                    />
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      ค่าอาหารว่างและเครื่องดื่ม (บาท/มื้อ)
                    </label>
                    <input
                      type="number"
                      value={formData.standardRates.snackPerMeal}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          standardRates: {
                            ...formData.standardRates,
                            snackPerMeal: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                      className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-sm font-semibold"
                    />
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      ป้ายไวนิล 1.2 x 2.5 ม. (บาท/ป้าย)
                    </label>
                    <input
                      type="number"
                      value={formData.standardRates.vinylPerBanner}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          standardRates: {
                            ...formData.standardRates,
                            vinylPerBanner: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                      className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-sm font-semibold"
                    />
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      ผ้าอ้อมผู้ใหญ่ สปสช. (บาท/ชิ้น)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.standardRates.adultDiaperPerPiece}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          standardRates: {
                            ...formData.standardRates,
                            adultDiaperPerPiece: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                      className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-sm font-semibold"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {savedSuccess && (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" /> บันทึกการตั้งค่าเรียบร้อยแล้ว
              </span>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-md flex items-center gap-2 transition-all hover:scale-[1.02]"
            >
              <Save className="w-4 h-4" />
              บันทึกข้อมูลการตั้งค่า
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
