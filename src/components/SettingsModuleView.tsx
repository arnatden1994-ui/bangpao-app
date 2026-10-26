import React, { useState, useEffect } from 'react';
import {
  Settings,
  UserCheck,
  DollarSign,
  Shield,
  Save,
  RotateCcw,
  CheckCircle2,
  Users,
  UserPlus,
  FileSpreadsheet,
  Link,
  ExternalLink,
  RefreshCw,
  Key,
  AlertTriangle,
  Building2,
  FileCheck2,
  Stamp,
  Award,
  ChevronRight,
  Database,
  Lock,
  Edit2,
  Trash2,
  UserCog,
  Plus,
} from 'lucide-react';
import {
  SignerSettings,
  DEFAULT_SIGNER_SETTINGS,
  InspectorSignerItem,
  User,
  UserRole,
  GoogleSheetsConfig,
} from '../types/index.ts';
import { getAllUsers, registerUser, updateUser, deleteUser, setCurrentUser } from '../services/authService.ts';
import { saveUserToFirestore, deleteUserFromFirestore } from '../services/firebaseService.ts';

interface SettingsModuleViewProps {
  signerSettings: SignerSettings;
  onSaveSignerSettings: (newSettings: SignerSettings) => void;
  currentUser: User;
  onUserChange: (user: User) => void;
  config: GoogleSheetsConfig;
  onSaveConfig: (newConfig: GoogleSheetsConfig) => void;
  onSyncPush: () => void;
  onSyncPull: () => void;
  isSyncing: boolean;
  onResetMockData: () => void;
  activeSubTab?: 'signers' | 'users' | 'approvers' | 'sheets';
  onSubTabChange?: (tab: 'signers' | 'users' | 'approvers' | 'sheets') => void;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const SettingsModuleView: React.FC<SettingsModuleViewProps> = ({
  signerSettings,
  onSaveSignerSettings,
  currentUser,
  onUserChange,
  config,
  onSaveConfig,
  onSyncPush,
  onSyncPull,
  isSyncing,
  onResetMockData,
  activeSubTab: controlledSubTab,
  onSubTabChange,
  showToast,
}) => {
  const [internalSubTab, setInternalSubTab] = useState<'signers' | 'users' | 'approvers' | 'sheets'>('signers');
  const subTab = controlledSubTab || internalSubTab;

  const handleSubTabSwitch = (tab: 'signers' | 'users' | 'approvers' | 'sheets') => {
    if (onSubTabChange) {
      onSubTabChange(tab);
    } else {
      setInternalSubTab(tab);
    }
  };

  // Signers Form State
  const [signerForm, setSignerForm] = useState<SignerSettings>(() => ({
    ...DEFAULT_SIGNER_SETTINGS,
    ...signerSettings,
    inspectors:
      signerSettings?.inspectors && signerSettings.inspectors.length > 0
        ? signerSettings.inspectors
        : DEFAULT_SIGNER_SETTINGS.inspectors,
  }));
  const [signerSaved, setSignerSaved] = useState(false);

  useEffect(() => {
    setSignerForm({
      ...DEFAULT_SIGNER_SETTINGS,
      ...signerSettings,
      inspectors:
        signerSettings?.inspectors && signerSettings.inspectors.length > 0
          ? signerSettings.inspectors
          : DEFAULT_SIGNER_SETTINGS.inspectors,
    });
  }, [signerSettings]);

  const inspectorsList: InspectorSignerItem[] =
    signerForm.inspectors || DEFAULT_SIGNER_SETTINGS.inspectors || [];

  const handleAddInspectorInSettings = () => {
    setSignerForm({
      ...signerForm,
      inspectors: [
        ...inspectorsList,
        { id: `insp-${Date.now()}`, name: '', position: 'เจ้าพนักงานสาธารณสุข' },
      ],
    });
  };

  const handleUpdateInspectorInSettings = (id: string, field: 'name' | 'position', value: string) => {
    setSignerForm({
      ...signerForm,
      inspectors: inspectorsList.map((i) => (i.id === id ? { ...i, [field]: value } : i)),
    });
  };

  const handleRemoveInspectorInSettings = (id: string) => {
    setSignerForm({
      ...signerForm,
      inspectors: inspectorsList.filter((i) => i.id !== id),
    });
  };

  // Sheets Config Form State
  const [sheetsForm, setSheetsForm] = useState<GoogleSheetsConfig>(config);
  const [sheetsSaved, setSheetsSaved] = useState(false);

  // Users State
  const [usersList, setUsersList] = useState<User[]>(() => getAllUsers());
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    username: '',
    fullName: '',
    email: '',
    phone: '',
    role: 'inspector' as UserRole,
    roleTitle: 'เจ้าพนักงานสาธารณสุข / นายตรวจ',
    department: 'กองสาธารณสุขและสิ่งแวดล้อม เทศบาลตำบลบางเป้า',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  });

  // Approver delegation state
  const [approvalSettings, setApprovalSettings] = useState({
    orderNumber: 'คำสั่งเทศบาลตำบลบางเป้า ที่ 128/2568',
    orderDate: '15 มกราคม 2568',
    orderTitle: 'เรื่อง มอบหมายอำนาจในการปฏิบัติราชการแทนและการลงนามในเอกสารราชการ',
    maxBudgetDirector: 100000,
    maxBudgetClerk: 500000,
    allowAutoApprovePetitions: false,
    requireMayorSignatureOnLicenses: true,
  });

  const handleSignerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSignerSettings(signerForm);
    localStorage.setItem('bangpao_signer_settings', JSON.stringify(signerForm));
    setSignerSaved(true);
    showToast('success', 'บันทึกการตั้งค่าผู้บริหารและผู้ลงนามเรียบร้อยแล้ว');
    setTimeout(() => setSignerSaved(false), 2500);
  };

  const handleResetSigners = () => {
    setSignerForm(DEFAULT_SIGNER_SETTINGS);
    onSaveSignerSettings(DEFAULT_SIGNER_SETTINGS);
    localStorage.setItem('bangpao_signer_settings', JSON.stringify(DEFAULT_SIGNER_SETTINGS));
    showToast('info', 'คืนค่าเริ่มต้นของผู้บริหารและผู้ลงนาม ทต.บางเป้า เรียบร้อยแล้ว');
  };

  const handleSaveSheetsConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(sheetsForm);
    setSheetsSaved(true);
    showToast('success', 'บันทึกการตั้งค่าเชื่อมต่อ Google Sheets สำเร็จ');
    setTimeout(() => setSheetsSaved(false), 2500);
  };

  const handleRegisterNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.username || !newUserForm.fullName) {
      showToast('error', 'กรุณากรอกชื่อผู้ใช้และชื่อ-นามสกุลให้ครบถ้วน');
      return;
    }

    const res = registerUser(newUserForm);
    if (res.success && res.user) {
      setUsersList(getAllUsers());
      saveUserToFirestore(res.user).catch((err) => console.warn('Firestore user sync warning:', err));
      setShowAddUserModal(false);
      setNewUserForm({
        username: '',
        fullName: '',
        email: '',
        phone: '',
        role: 'inspector',
        roleTitle: 'เจ้าพนักงานสาธารณสุข / นายตรวจ',
        department: 'กองสาธารณสุขและสิ่งแวดล้อม เทศบาลตำบลบางเป้า',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      });
      showToast('success', `เพิ่มเจ้าหน้าที่ "${res.user.fullName}" เข้าสู่ระบบและบันทึกลง Cloud Firestore สำเร็จ`);
    } else {
      showToast('error', res.message || 'ไม่สามารถเพิ่มผู้ใช้งานได้');
    }
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    const res = updateUser(editingUser);
    if (res.success && res.user) {
      setUsersList(getAllUsers());
      saveUserToFirestore(res.user).catch((err) => console.warn('Firestore user sync warning:', err));
      if (currentUser.id === res.user.id) {
        onUserChange(res.user);
      }
      showToast('success', res.message);
      setEditingUser(null);
    } else {
      showToast('error', res.message);
    }
  };

  const handleDeleteUserConfirm = async () => {
    if (!deleteConfirmUser) return;
    const targetId = deleteConfirmUser.id;
    const targetName = deleteConfirmUser.fullName;
    const res = deleteUser(targetId);
    if (res.success) {
      setUsersList(getAllUsers());
      deleteUserFromFirestore(targetId).catch((err) => console.warn('Firestore user delete warning:', err));
      showToast('success', res.message);
      setDeleteConfirmUser(null);
    } else {
      showToast('error', res.message);
    }
  };

  const handleSwitchUser = (user: User) => {
    setCurrentUser(user);
    onUserChange(user);
    showToast('success', `สลับเข้าใช้งานในฐานะ: ${user.fullName} (${user.roleTitle || user.role})`);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white flex items-center justify-center shadow-md shrink-0">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                ⚙️ ระบบตั้งค่าผู้ใช้งานและการปฏิบัติงานทุกระบบ
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                ทต.บางเป้า จ.ตรัง
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              ศูนย์กลางจัดการผู้ลงนามเอกสารทางการ, สิทธิ์ผู้ใช้งาน, ผู้มีอำนาจพิจารณาอนุมัติ และการเชื่อมโยงฐานข้อมูลคลาวด์
            </p>
          </div>
        </div>

        {/* Current Active Officer Badge */}
        <div className="flex items-center gap-3 bg-emerald-50/80 border border-emerald-200 px-4 py-2.5 rounded-2xl shrink-0">
          <div className="w-9 h-9 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
            {currentUser.fullName ? currentUser.fullName[0] : 'U'}
          </div>
          <div>
            <div className="text-[11px] text-emerald-700 font-medium">ผู้ใช้งานปัจจุบัน</div>
            <div className="text-xs font-bold text-emerald-950 truncate max-w-[180px]">
              {currentUser.fullName}
            </div>
            <div className="text-[10px] text-emerald-800/80 font-semibold truncate max-w-[180px]">
              {currentUser.roleTitle || currentUser.role}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Sub-tab Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        <button
          onClick={() => handleSubTabSwitch('signers')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            subTab === 'signers'
              ? 'bg-[#064e3b] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Stamp className="w-4 h-4 text-amber-300" />
          <span>✍️ ตั้งค่าผู้เซ็นเอกสารทุกระบบ</span>
        </button>

        <button
          onClick={() => handleSubTabSwitch('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            subTab === 'users'
              ? 'bg-[#064e3b] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4 text-emerald-300" />
          <span>👤 ทะเบียนผู้ใช้งาน & สลับสิทธิ์ ({usersList.length} คน)</span>
        </button>

        <button
          onClick={() => handleSubTabSwitch('approvers')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            subTab === 'approvers'
              ? 'bg-[#064e3b] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Award className="w-4 h-4 text-cyan-300" />
          <span>⚖️ ตั้งค่าผู้มีอำนาจพิจารณา & คำสั่งมอบหมาย</span>
        </button>

        <button
          onClick={() => handleSubTabSwitch('sheets')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            subTab === 'sheets'
              ? 'bg-[#064e3b] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>📊 เชื่อมต่อ Google Sheets & Apps Script</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-1" />
        </button>
      </div>

      {/* 3. Sub-tab Contents */}

      {/* 3.1 Signers Tab */}
      {subTab === 'signers' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main Edit Form */}
          <div className="lg:col-span-2 space-y-4">
            <form onSubmit={handleSignerSubmit} className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                  <Stamp className="w-5 h-5 text-emerald-700" />
                  <span>รายชื่อผู้บริหารและผู้ลงนามในแบบฟอร์มทางการ (ตราครุฑ)</span>
                </div>
                <button
                  type="button"
                  onClick={handleResetSigners}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>คืนค่าเริ่มต้น</span>
                </button>
              </div>

              {signerSaved && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>บันทึกการตั้งค่าผู้ลงนามเรียบร้อยแล้ว ข้อมูลจะมีผลต่อการพิมพ์เอกสารทันที</span>
                </div>
              )}

              {/* รายชื่อเจ้าหน้าที่ผู้ตรวจประเมิน (ตัวเลือกดรอปดาวน์ในฟอร์มประเมิน) */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-emerald-950 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-emerald-700" />
                      <span>รายชื่อเจ้าหน้าที่ผู้ตรวจประเมิน / ผู้ลงนาม (ตัวเลือกดรอปดาวน์ในฟอร์มประเมิน)</span>
                    </span>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      เพิ่มหรือแก้ไขชื่อและตำแหน่ง เพื่อใช้เลือกในดรอปดาวน์หน้าฟอร์มตรวจประเมินสุขลักษณะ
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddInspectorInSettings}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>เพิ่มรายชื่อ</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {inspectorsList.map((item, idx) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-xl border border-emerald-200/80 shadow-2xs"
                    >
                      <div className="sm:col-span-5">
                        <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                          ชื่อ-นามสกุล ลำดับที่ {idx + 1}
                        </label>
                        <input
                          type="text"
                          placeholder="เช่น พันจ่าเอกอานัส เด่นหมาด"
                          value={item.name}
                          onChange={(e) => handleUpdateInspectorInSettings(item.id, 'name', e.target.value)}
                          className="w-full text-xs sm:text-sm font-semibold px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div className="sm:col-span-6">
                        <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                          ตำแหน่ง
                        </label>
                        <input
                          type="text"
                          placeholder="เช่น เจ้าพนักงานสาธารณสุขชำนาญงาน"
                          value={item.position}
                          onChange={(e) => handleUpdateInspectorInSettings(item.id, 'position', e.target.value)}
                          className="w-full text-xs sm:text-sm px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div className="sm:col-span-1 flex justify-end sm:pt-4">
                        <button
                          type="button"
                          onClick={() => handleRemoveInspectorInSettings(item.id)}
                          title="ลบรายชื่อนี้"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 1. Director */}
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 uppercase">
                    <UserCheck className="w-4 h-4" /> 1. ผู้อำนวยการกองสาธารณสุขและสิ่งแวดล้อม (ผู้เสนอความเห็น)
                  </span>
                  <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                    ลงนามข้อเสนอและรายงานตรวจ
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">ชื่อ-นามสกุล</label>
                    <input
                      type="text"
                      value={signerForm.directorName}
                      onChange={(e) => setSignerForm({ ...signerForm, directorName: e.target.value })}
                      className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">ตำแหน่งทางการ</label>
                    <input
                      type="text"
                      value={signerForm.directorPos}
                      onChange={(e) => setSignerForm({ ...signerForm, directorPos: e.target.value })}
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* 2. Clerk */}
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 uppercase">
                    <UserCheck className="w-4 h-4" /> 2. ปลัดเทศบาลตำบลบางเป้า (ผู้พิจารณากลั่นกรอง)
                  </span>
                  <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                    ลงนามพิจารณาเพื่อเสนอนายก
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">ชื่อ-นามสกุล</label>
                    <input
                      type="text"
                      value={signerForm.clerkName}
                      onChange={(e) => setSignerForm({ ...signerForm, clerkName: e.target.value })}
                      className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">ตำแหน่งทางการ</label>
                    <input
                      type="text"
                      value={signerForm.clerkPos}
                      onChange={(e) => setSignerForm({ ...signerForm, clerkPos: e.target.value })}
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* 3. Mayor / Acting Mayor */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5 uppercase">
                    <UserCheck className="w-4 h-4 text-emerald-700" /> 3. ผู้มีอำนาจลงนาม / นายกเทศมนตรี (ผู้อนุมัติขั้นสุดท้าย)
                  </span>
                  <span className="text-[10px] text-emerald-800 font-bold bg-white px-2 py-0.5 rounded-full border border-emerald-300">
                    ลงนามใบอนุญาต อภ.2 / อนุมัติคำร้อง
                  </span>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">ชื่อ-นามสกุล ผู้มีอำนาจลงนาม</label>
                    <input
                      type="text"
                      value={signerForm.mayorName}
                      onChange={(e) => setSignerForm({ ...signerForm, mayorName: e.target.value })}
                      className="w-full text-xs font-bold px-3 py-2 bg-white border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">
                      ตำแหน่งในเอกสาร (ขึ้นบรรทัดใหม่ตามที่ต้องการให้พิมพ์ เช่น รองนายกเทศมนตรี ปฏิบัติราชการแทน...)
                    </label>
                    <textarea
                      value={signerForm.mayorPos}
                      onChange={(e) => setSignerForm({ ...signerForm, mayorPos: e.target.value })}
                      rows={2}
                      className="w-full text-xs font-medium px-3 py-2 bg-white border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* 4. Driver & Fees */}
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase">
                    <DollarSign className="w-4 h-4 text-amber-500" /> 4. พนักงานขับรถ & อัตราค่าบริการสูบสิ่งปฏิกูล
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">พนักงานขับรถสูบสิ่งปฏิกูล</label>
                    <input
                      type="text"
                      value={signerForm.driverName}
                      onChange={(e) => setSignerForm({ ...signerForm, driverName: e.target.value })}
                      className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-300 rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">ในเขตเทศบาล (บาท/บ่อ)</label>
                    <input
                      type="text"
                      value={signerForm.feeInDistrict}
                      onChange={(e) => setSignerForm({ ...signerForm, feeInDistrict: e.target.value })}
                      className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500">นอกเขต ไม่เกิน 10 กม.</label>
                    <input
                      type="text"
                      value={signerForm.feeOut10km}
                      onChange={(e) => setSignerForm({ ...signerForm, feeOut10km: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-center font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500">นอกเขต 10-20 กม.</label>
                    <input
                      type="text"
                      value={signerForm.feeOut20km}
                      onChange={(e) => setSignerForm({ ...signerForm, feeOut20km: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-center font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500">นอกเขต 20-30 กม.</label>
                    <input
                      type="text"
                      value={signerForm.feeOut30km}
                      onChange={(e) => setSignerForm({ ...signerForm, feeOut30km: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-center font-semibold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>บันทึกการตั้งค่าผู้ลงนามทั้งหมด</span>
                </button>
              </div>
            </form>
          </div>

          {/* Live Signature & Document Preview */}
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase mb-3 pb-2 border-b border-slate-100">
                <Stamp className="w-4 h-4 text-emerald-600" />
                <span>ตัวอย่างบล็อกลงนามในเอกสารราชการจริง</span>
              </div>

              <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 font-serif">
                {/* 1. ผอ. กอง */}
                <div className="text-right text-xs space-y-1">
                  <div className="text-[11px] text-slate-400 font-sans">ลงนาม (ความเห็นผู้อำนวยการกอง)</div>
                  <div className="h-6"></div>
                  <div className="font-bold text-slate-800">({signerForm.directorName})</div>
                  <div className="text-[11px] text-slate-600">{signerForm.directorPos}</div>
                </div>

                <div className="border-t border-dashed border-slate-300 pt-2" />

                {/* 2. ปลัด */}
                <div className="text-right text-xs space-y-1">
                  <div className="text-[11px] text-slate-400 font-sans">ลงนาม (ความเห็นปลัดเทศบาล)</div>
                  <div className="h-6"></div>
                  <div className="font-bold text-slate-800">({signerForm.clerkName})</div>
                  <div className="text-[11px] text-slate-600">{signerForm.clerkPos}</div>
                </div>

                <div className="border-t border-dashed border-slate-300 pt-2" />

                {/* 3. นายกเทศมนตรี */}
                <div className="text-right text-xs space-y-1">
                  <div className="text-[11px] text-slate-400 font-sans">ลงนาม (คำสั่งอนุมัติ / ใบอนุญาต อภ.2)</div>
                  <div className="h-7 flex items-center justify-end">
                    <span className="text-[10px] text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded font-sans font-bold">
                      ตราครุฑประทับ
                    </span>
                  </div>
                  <div className="font-bold text-slate-900">({signerForm.mayorName})</div>
                  <div className="text-[11px] text-slate-700 whitespace-pre-line leading-tight">
                    {signerForm.mayorPos}
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-[11px] text-amber-800 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>เอกสารที่ได้รับผลกระทบทันที:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[10px] text-amber-900/80">
                  <li>ใบอนุญาต อภ.2 (36 ร้านค้ากิจการอันตราย)</li>
                  <li>รายงานตรวจประเมินสุขลักษณะ 25 ข้อ เสนอผู้บริหาร</li>
                  <li>แบบคำร้องดูดส้วมและบันทึกข้อความเสนอผู้บริหาร A4</li>
                  <li>สัญญายืม-คืนอุปกรณ์ทางการแพทย์</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3.2 Users & Roles Tab */}
      {subTab === 'users' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-700" />
                  <span>ระบบลงทะเบียนใช้งานและจัดการสิทธิ์เจ้าหน้าที่</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  เลือกสลับผู้ใช้งานได้ทันที หรือลงทะเบียนเจ้าหน้าที่คนใหม่เข้าสู่ระบบ
                </p>
              </div>

              <button
                onClick={() => setShowAddUserModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer self-start sm:self-auto"
              >
                <UserPlus className="w-4 h-4" />
                <span>ลงทะเบียนเจ้าหน้าที่ใหม่</span>
              </button>
            </div>

            {/* Quick Switch Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {usersList.map((u) => {
                const isActive = currentUser.id === u.id;
                return (
                  <div
                    key={u.id}
                    onClick={() => handleSwitchUser(u)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                      isActive
                        ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-sm shrink-0 shadow-xs">
                        {u.fullName ? u.fullName[0] : 'U'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-800 truncate">
                            {u.fullName}
                          </span>
                        </div>
                        <div className="text-[10px] text-emerald-700 font-semibold truncate">
                          {u.roleTitle || u.role}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          @{u.username} • {u.phone}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                      <span className={`px-2 py-0.5 rounded-full font-bold ${
                        u.role === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : u.role === 'inspector'
                          ? 'bg-emerald-100 text-emerald-800'
                          : u.role === 'staff'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}>
                        สิทธิ์: {u.role.toUpperCase()}
                      </span>

                      {isActive ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> ใช้งานอยู่
                        </span>
                      ) : (
                        <span className="text-slate-400 group-hover:text-emerald-700 font-medium">
                          คลิกเพื่อสลับ
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Personnel & Roles Management Table */}
            <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                    <UserCog className="w-4 h-4 text-emerald-600" />
                    <span>ทำเนียบบุคลากรและการจัดการตำแหน่งเจ้าหน้าที่ (Personnel & Roles)</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    รองรับการโยกย้าย เปลี่ยนตำแหน่ง เพิ่มบุคลากรใหม่ หรือลบรายชื่อผู้ที่ลาออก ซิงค์สดกับ Cloud Firestore
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(true)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer self-start sm:self-auto"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ เพิ่มเจ้าหน้าที่</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold text-[11px]">
                      <th className="py-2.5 px-3">ชื่อ-นามสกุล / บัญชี</th>
                      <th className="py-2.5 px-3">ตำแหน่งที่ปรากฏในระบบ / เอกสาร</th>
                      <th className="py-2.5 px-3 text-center">สิทธิ์การทำงาน</th>
                      <th className="py-2.5 px-3">กลุ่มงาน / สังกัด</th>
                      <th className="py-2.5 px-3">เบอร์ติดต่อ</th>
                      <th className="py-2.5 px-3 text-center min-w-[160px]">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {usersList.map((u) => {
                      const isActive = currentUser.id === u.id;
                      return (
                        <tr key={u.id} className={`hover:bg-slate-50/70 transition-colors ${isActive ? 'bg-emerald-50/40' : ''}`}>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-xs shrink-0">
                                {u.fullName ? u.fullName[0] : 'U'}
                              </div>
                              <div>
                                <div className="font-bold flex items-center gap-1">
                                  <span>{u.fullName}</span>
                                  {isActive && (
                                    <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                                      ปัจจุบัน
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">@{u.username} • {u.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-700">
                            {u.roleTitle || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              u.role === 'admin'
                                ? 'bg-purple-100 text-purple-800'
                                : u.role === 'inspector'
                                ? 'bg-emerald-100 text-emerald-800'
                                : u.role === 'staff'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-800'
                            }`}>
                              {u.role.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {u.department || 'กองสาธารณสุขและสิ่งแวดล้อม'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">
                            {u.phone || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Edit Button */}
                              <button
                                type="button"
                                onClick={() => setEditingUser({ ...u })}
                                className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors cursor-pointer"
                                title="แก้ไขตำแหน่งและข้อมูล"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Switch User Button */}
                              {!isActive && (
                                <button
                                  type="button"
                                  onClick={() => handleSwitchUser(u)}
                                  className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold text-[10px] transition-colors cursor-pointer"
                                  title="สลับเป็นผู้ใช้งานนี้"
                                >
                                  สลับ
                                </button>
                              )}

                              {/* Delete Button */}
                              {!isActive && usersList.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmUser(u)}
                                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                                  title="ลบรายชื่อบุคลากร (กรณีลาออก/ย้าย)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Role Permissions Matrix */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-700 uppercase mb-3 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-emerald-600" />
                <span>ตารางระดับสิทธิ์การเข้าถึงระบบตามบทบาทหน้าที่ (Access Control Matrix)</span>
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-y border-slate-200 font-bold text-[11px]">
                      <th className="py-2.5 px-3">สิทธิ์การทำงาน</th>
                      <th className="py-2.5 px-3 text-center">Admin (ผอ.กอง/นายก)</th>
                      <th className="py-2.5 px-3 text-center">Inspector (นายตรวจ)</th>
                      <th className="py-2.5 px-3 text-center">Staff (ธุรการ/LTC)</th>
                      <th className="py-2.5 px-3 text-center">Citizen (ประชาชน)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    <tr>
                      <td className="py-2 px-3 font-medium">1. ตรวจประเมิน 25 ข้อ & บันทึกผลตรวจ</td>
                      <td className="py-2 px-3 text-center text-emerald-600 font-bold">✓ เต็มรูปแบบ</td>
                      <td className="py-2 px-3 text-center text-emerald-600 font-bold">✓ เต็มรูปแบบ</td>
                      <td className="py-2 px-3 text-center text-slate-400">-</td>
                      <td className="py-2 px-3 text-center text-slate-400">-</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium">2. ออกใบอนุญาต อภ.2 & พิมพ์รายงานผู้บริหาร</td>
                      <td className="py-2 px-3 text-center text-emerald-600 font-bold">✓ เต็มรูปแบบ</td>
                      <td className="py-2 px-3 text-center text-emerald-600 font-bold">✓ เต็มรูปแบบ</td>
                      <td className="py-2 px-3 text-center text-amber-600">✓ พิมพ์ได้</td>
                      <td className="py-2 px-3 text-center text-slate-400">-</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium">3. อนุมัติงบโครงการ สปสช. & ลงนามคำสั่ง</td>
                      <td className="py-2 px-3 text-center text-emerald-600 font-bold">✓ มีอำนาจอนุมัติ</td>
                      <td className="py-2 px-3 text-center text-slate-400">-</td>
                      <td className="py-2 px-3 text-center text-slate-400">-</td>
                      <td className="py-2 px-3 text-center text-slate-400">-</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium">4. แจกจ่ายของ LTC & Smart Route</td>
                      <td className="py-2 px-3 text-center text-emerald-600 font-bold">✓ เต็มรูปแบบ</td>
                      <td className="py-2 px-3 text-center text-emerald-600 font-bold">✓ เต็มรูปแบบ</td>
                      <td className="py-2 px-3 text-center text-emerald-600 font-bold">✓ เต็มรูปแบบ</td>
                      <td className="py-2 px-3 text-center text-slate-400">-</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium">5. จัดการคลังอุปกรณ์ & สัญญายืม-คืน</td>
                      <td className="py-2 px-3 text-center text-emerald-600 font-bold">✓ เต็มรูปแบบ</td>
                      <td className="py-2 px-3 text-center text-emerald-600 font-bold">✓ เต็มรูปแบบ</td>
                      <td className="py-2 px-3 text-center text-emerald-600 font-bold">✓ เต็มรูปแบบ</td>
                      <td className="py-2 px-3 text-center text-slate-400">ยื่นคำขอได้</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3.3 Approvers & Workflow Tab */}
      {subTab === 'approvers' && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-700" />
              <span>ลำดับขั้นตอนและผู้มีอำนาจพิจารณาอนุมัติ (Approval Hierarchy)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              กำหนดเกณฑ์การมอบหมายอำนาจปฏิบัติราชการแทน และขั้นตอนเสนอแฟ้มเอกสารภายใน ทต.บางเป้า
            </p>
          </div>

          {/* 4-Step Workflow Diagram */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-2 relative">
              <div className="w-6 h-6 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center">
                1
              </div>
              <div className="font-bold text-xs text-emerald-950">นายตรวจ / เจ้าพนักงาน</div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                ลงพื้นที่ตรวจสถานประกอบการ 25 ข้อ, รับคำร้อง, ตรวจสอบเอกสารความครบถ้วน
              </p>
              <div className="text-[10px] text-emerald-800 font-bold">
                ผู้รับผิดชอบ: {currentUser.fullName}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200 space-y-2 relative">
              <div className="w-6 h-6 rounded-full bg-teal-700 text-white font-bold text-xs flex items-center justify-center">
                2
              </div>
              <div className="font-bold text-xs text-teal-950">ผอ.กองสาธารณสุขฯ</div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                กลั่นกรองและให้ความเห็นชอบทางวิชาการและการจัดการ เสนอแนวทางต่อปลัด
              </p>
              <div className="text-[10px] text-teal-800 font-bold">
                ผู้รับผิดชอบ: {signerForm.directorName}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-cyan-50/60 border border-cyan-200 space-y-2 relative">
              <div className="w-6 h-6 rounded-full bg-cyan-700 text-white font-bold text-xs flex items-center justify-center">
                3
              </div>
              <div className="font-bold text-xs text-cyan-950">ปลัดเทศบาลตำบลบางเป้า</div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                ตรวจสอบความถูกต้องตามระเบียบกฎหมายท้องถิ่น ก่อนส่งรายงานถึงนายก
              </p>
              <div className="text-[10px] text-cyan-800 font-bold">
                ผู้รับผิดชอบ: {signerForm.clerkName}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2 relative">
              <div className="w-6 h-6 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center">
                4
              </div>
              <div className="font-bold text-xs text-amber-950">นายกเทศมนตรี / ผู้แทน</div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                ลงนามอนุมัติใบอนุญาต อภ.2, อนุมัติงบโครงการ สปสช., สั่งการข้อร้องเรียน
              </p>
              <div className="text-[10px] text-amber-900 font-bold">
                ผู้รับผิดชอบ: {signerForm.mayorName}
              </div>
            </div>
          </div>

          {/* Delegation Settings Form */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>การตั้งค่าคำสั่งมอบหมายอำนาจปฏิบัติราชการแทน</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600">เลขที่คำสั่งมอบอำนาจ</label>
                <input
                  type="text"
                  value={approvalSettings.orderNumber}
                  onChange={(e) => setApprovalSettings({ ...approvalSettings, orderNumber: e.target.value })}
                  className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600">วันที่ลงนามคำสั่ง</label>
                <input
                  type="text"
                  value={approvalSettings.orderDate}
                  onChange={(e) => setApprovalSettings({ ...approvalSettings, orderDate: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={approvalSettings.requireMayorSignatureOnLicenses}
                  onChange={(e) => setApprovalSettings({ ...approvalSettings, requireMayorSignatureOnLicenses: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span>ต้องได้รับลายมือชื่อผู้มีอำนาจลงนามในใบอนุญาต อภ.2 ทุกฉบับ (หากไม่ติ๊ก ให้ใช้ลายเซ็นอิเล็กทรอนิกส์)</span>
              </label>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => showToast('success', 'บันทึกการตั้งค่าผู้มีอำนาจพิจารณาเรียบร้อยแล้ว')}
                className="flex items-center gap-1.5 px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>บันทึกข้อกำหนดอำนาจ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3.4 Google Sheets & Cloud Sync Tab */}
      {subTab === 'sheets' && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                <span>การเชื่อมต่อฐานข้อมูล Google Sheets & Apps Script Web App</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                ซิงค์ข้อมูลสถานประกอบการ 36 แห่ง, ผลตรวจ 25 ข้อ, โครงการ สปสช. และคำร้องขึ้นคลาวด์แบบเรียลไทม์
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full border border-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>🟢 สถานะออนไลน์ (Live)</span>
              </span>
            </div>
          </div>

          {sheetsSaved && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>บันทึกการตั้งค่าการเชื่อมต่อเรียบร้อยแล้ว</span>
            </div>
          )}

          <form onSubmit={handleSaveSheetsConfig} className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Link className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Google Apps Script Web App URL (ระบบเดิม 100%)</span>
                </label>
                <input
                  type="url"
                  value={sheetsForm.appsScriptUrl}
                  onChange={(e) => setSheetsForm({ ...sheetsForm, appsScriptUrl: e.target.value })}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full text-xs font-mono px-3 py-2.5 bg-white border border-slate-300 rounded-xl mt-1 focus:ring-2 focus:ring-emerald-500"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  URL ของ Google Apps Script ที่ Deploy เป็น Web App (Who has access: Anyone)
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Google Spreadsheet ID</span>
                </label>
                <input
                  type="text"
                  value={sheetsForm.sheetId}
                  onChange={(e) => setSheetsForm({ ...sheetsForm, sheetId: e.target.value })}
                  placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  className="w-full text-xs font-mono px-3 py-2.5 bg-white border border-slate-300 rounded-xl mt-1 focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onSyncPush}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>ส่งข้อมูลขึ้น Google Sheets (Force Push)</span>
                </button>

                <button
                  type="button"
                  onClick={onSyncPull}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>ดึงข้อมูลล่าสุด (Pull Sync)</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const id = sheetsForm.sheetId;
                    if (id) {
                      window.open(`https://docs.google.com/spreadsheets/d/${id}/edit`, '_blank');
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>เปิด Google Sheets บนแท็บใหม่</span>
                </button>

                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 bg-[#064e3b] hover:bg-[#022c22] text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>บันทึกการตั้งค่า</span>
                </button>
              </div>
            </div>
          </form>

          {/* Reset Mock Data Safety Zone */}
          <div className="mt-6 pt-5 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-rose-50/50 p-4 rounded-2xl border border-rose-200">
            <div>
              <div className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>โซนจัดการข้อมูลตัวอย่าง (Reset Demo Dataset)</span>
              </div>
              <p className="text-[11px] text-rose-700 mt-0.5">
                รีเซ็ตข้อมูลทุกระบบกลับเป็นค่าเริ่มต้นตามต้นฉบับ 36 ร้านค้า และข้อมูลตั้งต้นของ ทต.บางเป้า
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowResetConfirmModal(true)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer self-start sm:self-auto shrink-0"
            >
              รีเซ็ตข้อมูลตัวอย่าง 36 รายการ
            </button>
          </div>
        </div>
      )}

      {/* Modal: Confirm Reset Mock Data */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-800">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">ยืนยันรีเซ็ตข้อมูลตัวอย่าง</h3>
                <p className="text-xs text-slate-500">คืนค่าเริ่มต้นตามต้นฉบับ 36 ร้านค้า</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              คุณต้องการรีเซ็ตข้อมูลตัวอย่างทั้งหมดกลับเป็นค่าเริ่มต้นตามต้นฉบับ (36 สถานประกอบการ, คำร้อง, กายอุปกรณ์ และผู้ป่วย) หรือไม่?
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowResetConfirmModal(false);
                  onResetMockData();
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                ยืนยันรีเซ็ตข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add New User */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-[#064e3b] px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-sm text-white">ลงทะเบียนเจ้าหน้าที่คนใหม่</h3>
              </div>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-emerald-200 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterNewUser} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600">ชื่อผู้ใช้ (Username)</label>
                <input
                  type="text"
                  value={newUserForm.username}
                  onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                  placeholder="e.g. officer_sompong"
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl mt-1"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">ชื่อ-นามสกุล (พร้อมคำนำหน้า)</label>
                <input
                  type="text"
                  value={newUserForm.fullName}
                  onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })}
                  placeholder="e.g. นายสมพงษ์ ใจภักดี"
                  className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-300 rounded-xl mt-1"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">บทบาทสิทธิ์ (Role)</label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => {
                      const r = e.target.value as UserRole;
                      const roleTitles: Record<UserRole, string> = {
                        admin: 'นายกเทศมนตรี / ผู้บริหารระดับสูง',
                        executive: 'ผู้บริหารเทศบาลตำบลบางเป้า',
                        inspector: 'นายตรวจ / เจ้าพนักงานสาธารณสุข',
                        staff: 'เจ้าหน้าที่ธุรการ / แคร์กีฟเวอร์',
                        citizen: 'ประชาชน / ผู้ประกอบการ',
                      };
                      setNewUserForm({ ...newUserForm, role: r, roleTitle: roleTitles[r] || 'เจ้าหน้าที่' });
                    }}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl mt-1 font-semibold"
                  >
                    <option value="inspector">นายตรวจ (Inspector)</option>
                    <option value="admin">ผู้บริหาร / Admin</option>
                    <option value="staff">เจ้าหน้าที่ธุรการ / LTC (Staff)</option>
                    <option value="citizen">ประชาชน / ผู้ประกอบการ</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">เบอร์โทรศัพท์</label>
                  <input
                    type="tel"
                    value={newUserForm.phone}
                    onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                    placeholder="08x-xxx-xxxx"
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">กลุ่มงาน / สังกัด</label>
                <input
                  type="text"
                  value={newUserForm.department}
                  onChange={(e) => setNewUserForm({ ...newUserForm, department: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl mt-1"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  บันทึกเจ้าหน้าที่ใหม่
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal: Edit Existing Staff */}
      {editingUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-emerald-800 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <UserCog className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-sm text-white">แก้ไขข้อมูลและตำแหน่งเจ้าหน้าที่</h3>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-emerald-200 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditUserSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600">ชื่อ-นามสกุล (พร้อมคำนำหน้า)</label>
                <input
                  type="text"
                  value={editingUser.fullName}
                  onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
                  className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-300 rounded-xl mt-1"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">ตำแหน่งงาน / ชื่อตำแหน่งในเอกสารราชการ</label>
                <input
                  type="text"
                  value={editingUser.roleTitle}
                  onChange={(e) => setEditingUser({ ...editingUser, roleTitle: e.target.value })}
                  placeholder="e.g. เจ้าพนักงานสาธารณสุขชำนาญงาน"
                  className="w-full text-xs font-semibold px-3 py-2 bg-white border border-emerald-300 rounded-xl mt-1 focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">ระดับสิทธิ์ (Role)</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl mt-1 font-semibold"
                  >
                    <option value="inspector">นายตรวจ (Inspector)</option>
                    <option value="admin">ผู้บริหาร / ผอ.กอง (Admin)</option>
                    <option value="executive">ผู้บริหารสูงสุด / นายกฯ (Executive)</option>
                    <option value="staff">เจ้าหน้าที่ธุรการ / LTC (Staff)</option>
                    <option value="citizen">ประชาชน / ผู้ประกอบการ</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">เบอร์โทรศัพท์</label>
                  <input
                    type="tel"
                    value={editingUser.phone}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">สังกัดกลุ่มงาน / ฝ่าย</label>
                <input
                  type="text"
                  value={editingUser.department}
                  onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">อีเมลติดต่อ</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl mt-1"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>บันทึกการเปลี่ยนแปลง</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation Modal */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150 p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">ยืนยันการลบบุคลากร</h3>
                <p className="text-xs text-slate-500">การดำเนินการนี้จะลบข้อมูลออกจากระบบและ Firestore</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
              <div><span className="font-bold">ชื่อ:</span> {deleteConfirmUser.fullName}</div>
              <div><span className="font-bold">ตำแหน่ง:</span> {deleteConfirmUser.roleTitle}</div>
              <div><span className="font-bold">สังกัด:</span> {deleteConfirmUser.department}</div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDeleteUserConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>ยืนยันการลบ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
