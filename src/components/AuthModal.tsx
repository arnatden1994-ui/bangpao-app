import React, { useState } from 'react';
import {
  X,
  Lock,
  UserCheck,
  ShieldCheck,
  UserPlus,
  LogIn,
  Building,
  Phone,
  Mail,
  CheckCircle2,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { User, UserRole } from '../types/index.ts';
import { INITIAL_USERS, loginUser, registerUser } from '../services/authService.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onUserChange: (user: User) => void;
  onShowToast: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChange,
  onShowToast,
}) => {
  if (!isOpen) return null;

  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Login inputs
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register inputs
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regDepartment, setRegDepartment] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('citizen');
  const [regPassword, setRegPassword] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier.trim()) {
      onShowToast('error', 'กรุณาระบุชื่อผู้ใช้หรืออีเมล');
      return;
    }

    const res = loginUser(loginIdentifier, loginPassword);
    if (res.success && res.user) {
      onUserChange(res.user);
      onShowToast('success', `ยินดีต้อนรับคุณ ${res.user.fullName} (${res.user.roleTitle})`);
      onClose();
    } else {
      onShowToast('error', res.message);
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername.trim() || !regFullName.trim()) {
      onShowToast('error', 'กรุณากรอกข้อมูลสำคัญให้ครบถ้วน');
      return;
    }

    const res = registerUser({
      username: regUsername.trim(),
      fullName: regFullName.trim(),
      email: regEmail.trim() || `${regUsername.trim()}@ph-health.local`,
      phone: regPhone.trim(),
      department: regDepartment.trim() || 'ประชาชนในพื้นที่',
      role: regRole,
      roleTitle: '',
    });

    if (res.success && res.user) {
      onUserChange(res.user);
      onShowToast('success', `ลงทะเบียนสำเร็จ! เข้าสู่ระบบในบทบาท ${res.user.roleTitle}`);
      onClose();
    } else {
      onShowToast('error', res.message);
    }
  };

  const handleQuickSwitch = (u: User) => {
    onUserChange(u);
    onShowToast('info', `สลับบทบาทเป็น: ${u.fullName} (${u.roleTitle})`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-teal-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <ShieldCheck className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                {mode === 'login' ? 'เข้าสู่ระบบสารสนเทศกองสาธารณสุข' : 'ลงทะเบียนผู้ใช้งานใหม่'}
              </h2>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                ระบบจัดการสิทธิ์ผู้ใช้งาน (Role-Based Access Control)
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

        {/* Quick Demo Switcher Banner (Admin Only Privilege) */}
        {currentUser?.role === 'admin' && (
          <div className="bg-slate-50 border-b border-slate-200 p-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>สลับบทบาทผู้ใช้งาน (สิทธิ์เฉพาะผู้ดูแลระบบ / Admin):</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {INITIAL_USERS.map((u) => {
                const isCurrent = currentUser?.id === u.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleQuickSwitch(u)}
                    className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                      isCurrent
                        ? 'border-emerald-500 bg-emerald-50/80 font-bold text-emerald-900 ring-1 ring-emerald-400'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold truncate text-[11px]">{u.username}</span>
                      {isCurrent && <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">
                      {u.role === 'admin'
                        ? '👑 ผอ.กอง (Admin)'
                        : u.role === 'inspector'
                        ? '🔍 นายตรวจ (Inspector)'
                        : u.role === 'staff'
                        ? '📋 เจ้าหน้าที่ (Staff)'
                        : '👤 ประชาชน (Citizen)'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab switch between Login and Register */}
        <div className="flex border-b border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-3 text-center transition-colors flex items-center justify-center gap-1.5 ${
              mode === 'login'
                ? 'border-b-2 border-emerald-600 text-emerald-700 font-bold bg-white'
                : 'text-slate-500 hover:text-slate-800 bg-slate-50'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>เข้าสู่ระบบ (Login)</span>
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex-1 py-3 text-center transition-colors flex items-center justify-center gap-1.5 ${
              mode === 'register'
                ? 'border-b-2 border-emerald-600 text-emerald-700 font-bold bg-white'
                : 'text-slate-500 hover:text-slate-800 bg-slate-50'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>สมัครสมาชิกใหม่ (Register)</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อผู้ใช้งาน (Username) หรือ อีเมล
                </label>
                <input
                  type="text"
                  placeholder="เช่น admin, inspector, staff หรือ citizen"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รหัสผ่าน (Password)
                </label>
                <input
                  type="password"
                  placeholder="กรอกรหัสผ่าน (หรือเว้นว่างสำหรับบัญชีทดสอบ)"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 text-xs sm:text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <LogIn className="w-4 h-4" />
                  <span>เข้าสู่ระบบ</span>
                </button>
              </div>

              <div className="text-center text-xs text-slate-500 pt-2">
                ยังไม่มีบัญชีผู้ใช้งาน?{' '}
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-emerald-700 font-semibold hover:underline"
                >
                  สมัครสมาชิกใหม่ที่นี่
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ชื่อ-นามสกุล <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="นายสมชาย มั่นคง"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ชื่อผู้ใช้ (Username) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="somchai2026"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    อีเมล (Email)
                  </label>
                  <input
                    type="email"
                    placeholder="somchai@gmail.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    เบอร์โทรศัพท์
                  </label>
                  <input
                    type="tel"
                    placeholder="081-xxx-xxxx"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  สังกัด / แผนก / ที่อยู่ร้าน
                </label>
                <input
                  type="text"
                  placeholder="เช่น กองสาธารณสุข หรือ ชื่อร้านค้า/ชุมชน"
                  value={regDepartment}
                  onChange={(e) => setRegDepartment(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  บทบาทและสิทธิ์การใช้งาน (User Role)
                </label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value as UserRole)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                >
                  <option value="citizen">👤 ผู้ประกอบการ / ประชาชนทั่วไป (ดูสถานะ, ยื่นคำร้อง, พิมพ์ใบรับรอง)</option>
                  <option value="staff">📋 เจ้าหน้าที่ธุรการ / บริการ (บันทึกคำร้อง, จัดการยืมอุปกรณ์, ดูแล LTC)</option>
                  <option value="inspector">🔍 นักวิชาการสาธารณสุข / ผู้ตรวจ (ตรวจประเมินสุขลักษณะ, กิจการอันตราย)</option>
                  <option value="admin">👑 ผู้อำนวยการกอง / ผู้ดูแลระบบ (สิทธิ์สูงสุด อนุมัติและจัดการระบบ)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รหัสผ่าน (Password)
                </label>
                <input
                  type="password"
                  placeholder="กำหนดรหัสผ่าน"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 text-xs sm:text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>บันทึกและสมัครสมาชิก</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
