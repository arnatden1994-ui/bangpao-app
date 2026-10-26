import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  FileText,
  Truck,
  HeartPulse,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ChevronDown,
  Building2,
  Phone,
  Mail,
  ShieldAlert,
} from 'lucide-react';
import { User as UserType, UserRole } from '../types/index.ts';
import { loginUser, registerUser, INITIAL_USERS } from '../services/authService.ts';

interface LoginGatewayProps {
  onLoginSuccess: (user: UserType) => void;
  onEnterAsCitizen: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const LoginGateway: React.FC<LoginGatewayProps> = ({
  onLoginSuccess,
  onEnterAsCitizen,
  onShowToast,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Register Modal state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regDepartment, setRegDepartment] = useState('กองสาธารณสุขและสิ่งแวดล้อม');
  const [regRole, setRegRole] = useState<UserRole>('staff');

  const [showDemoAccounts, setShowDemoAccounts] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!username.trim()) {
      setErrorMessage('กรุณาระบุชื่อผู้ใช้หรืออีเมล');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const res = loginUser(username.trim(), password);
      setIsLoading(false);

      if (res.success && res.user) {
        onShowToast('success', res.message);
        onLoginSuccess(res.user);
      } else {
        setErrorMessage(res.message);
        onShowToast('error', res.message);
      }
    }, 300);
  };

  const handleAutofill = (u: UserType) => {
    setUsername(u.username);
    setPassword(u.password || '1234');
    setErrorMessage('');
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFullName.trim() || !regUsername.trim() || !regPassword.trim()) {
      onShowToast('error', 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      return;
    }

    const res = registerUser({
      fullName: regFullName.trim(),
      username: regUsername.trim(),
      password: regPassword.trim(),
      email: regEmail.trim() || `${regUsername.trim()}@bangpao.go.th`,
      phone: regPhone.trim(),
      department: regDepartment.trim(),
      role: regRole,
      roleTitle: '',
      status: 'pending', // ต้องรอ Admin ยืนยันสิทธิ์
    });

    if (res.success) {
      onShowToast('success', res.message);
      setShowRegisterModal(false);
      setRegFullName('');
      setRegUsername('');
      setRegPassword('');
      setRegEmail('');
      setRegPhone('');
    } else {
      onShowToast('error', res.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-950 to-emerald-950 flex flex-col justify-between text-slate-100 p-4 sm:p-6 lg:p-8 font-sarabun">
      {/* Top Banner: Logo & Department Info */}
      <header className="max-w-6xl mx-auto w-full flex items-center justify-between py-2 border-b border-emerald-500/20">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-white p-1 shadow-lg ring-2 ring-emerald-400/50 flex items-center justify-center shrink-0">
            <img
              src="/images-Photoroom.png"
              alt="ตราเทศบาลตำบลบางเป้า"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-wide leading-tight">
              กองสาธารณสุขและสิ่งแวดล้อม เทศบาลตำบลบางเป้า
            </h1>
            <p className="text-xs text-emerald-300 font-medium">
              อำเภอกันตัง จังหวัดตรัง • ระบบสารสนเทศและบริการอิเล็กทรอนิกส์ (e-Service)
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-emerald-900/60 border border-emerald-500/30 text-emerald-200">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>ระบบรักษาความปลอดภัยระดับองค์กร (RBAC)</span>
        </div>
      </header>

      {/* Main Content: Split Cards (Officers Login vs Citizens Portal) */}
      <main className="max-w-6xl mx-auto w-full my-auto py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-3">
            <Lock className="w-3.5 h-3.5" />
            <span>กรุณายืนยันตัวตนก่อนเข้าสู่ระบบงาน (Authentication Required)</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            ระบบเข้าสู่ระบบและยืนยันสิทธิ์ปฏิบัติงาน
          </h2>
          <p className="text-sm text-slate-300 max-w-2xl mx-auto mt-2">
            เข้าถึงได้เฉพาะตามสิทธิ์หน้าที่ของแต่ละตำแหน่งเพื่อความปลอดภัยของข้อมูลราชการ 
            สำหรับประชาชนสามารถยื่นคำร้องและติดตามสถานะได้ทันที
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Column: Official Staff Login (7 cols) */}
          <div className="lg:col-span-7 bg-white text-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl border border-emerald-100 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-emerald-100/60 to-transparent rounded-bl-full pointer-events-none" />

            <div>
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-md shadow-emerald-700/20">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 leading-tight">
                      เข้าสู่ระบบสำหรับเจ้าหน้าที่
                    </h3>
                    <p className="text-xs text-slate-500">
                      สำหรับผู้บริหาร, นายตรวจ, เจ้าหน้าที่กองสาธารณสุข
                    </p>
                  </div>
                </div>

                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Officer Only
                </span>
              </div>

              {errorMessage && (
                <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="font-medium leading-relaxed">{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ชื่อผู้ใช้งาน (Username) หรือ อีเมล
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="เช่น anas.inspector หรือ admin"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium text-slate-900 bg-slate-50/50"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      รหัสผ่าน (Password)
                    </label>
                    <span className="text-[11px] text-emerald-700 font-medium">
                      รหัสเริ่มต้น: 1234
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="กรอกรหัสผ่านของท่าน"
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium text-slate-900 bg-slate-50/50"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 hover:from-emerald-800 hover:to-teal-900 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2 active:scale-[0.99]"
                >
                  {isLoading ? (
                    <span>กำลังตรวจสอบสิทธิ์...</span>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>ลงชื่อเข้าสู่ระบบปฏิบัติงาน</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Quick Demo Accounts Drawer & Register Link */}
            <div className="mt-6 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setShowDemoAccounts(!showDemoAccounts)}
                  className="inline-flex items-center gap-1.5 text-emerald-800 hover:text-emerald-950 font-bold cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>ดูข้อมูลบัญชีเจ้าหน้าที่เริ่มต้นสำหรับทดสอบ</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDemoAccounts ? 'rotate-180' : ''}`} />
                </button>

                <button
                  type="button"
                  onClick={() => setShowRegisterModal(true)}
                  className="text-slate-600 hover:text-emerald-700 font-semibold cursor-pointer"
                >
                  + ลงทะเบียนเจ้าหน้าที่ใหม่
                </button>
              </div>

              {showDemoAccounts && (
                <div className="mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 animate-in fade-in duration-150">
                  <div className="text-[11px] text-slate-500 font-semibold mb-1">
                    คลิกที่บัญชีเพื่อกรอกข้อมูลอัตโนมัติ (รหัสผ่าน: 1234):
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {INITIAL_USERS.filter((u) => u.status === 'active' && u.role !== 'citizen').map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleAutofill(u)}
                        className="p-2 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-left transition-all cursor-pointer group shadow-2xs"
                      >
                        <div className="font-bold text-slate-800 text-[11px] truncate group-hover:text-emerald-800">
                          {u.username}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">
                          {u.role === 'admin'
                            ? '👑 ผอ.กอง (Admin)'
                            : u.role === 'inspector'
                            ? '🔍 นายตรวจ (พจ.อ.อานัส)'
                            : u.role === 'executive'
                            ? '🏛️ ผู้บริหาร (รองนายก)'
                            : '📋 เจ้าหน้าที่ (Staff)'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Citizen Public Service Portal (5 cols) */}
          <div className="lg:col-span-5 bg-gradient-to-br from-emerald-900/90 via-teal-900/80 to-slate-900/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-emerald-400/30 flex flex-col justify-between text-white relative">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold mb-4 border border-emerald-400/30">
                <Building2 className="w-3.5 h-3.5" />
                <span>สำหรับประชาชนตำบลบางเป้า</span>
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-white leading-tight mb-2">
                ศูนย์บริการประชาชนออนไลน์ (Citizen e-Service)
              </h3>
              <p className="text-xs text-emerald-200/90 leading-relaxed mb-6">
                ประชาชนทั่วไปไม่ต้องใช้รหัสผ่านเจ้าหน้าที่ สามารถเข้าสู่หน้าแบบฟอร์มเพื่อส่งคำร้องและตรวจสอบสถานะได้ทันที
              </p>

              {/* Service Features List */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-white">ยื่นคำร้องทั่วไป & ร้องเรียนเหตุรำคาญ</div>
                    <div className="text-[11px] text-emerald-200/70">กลิ่นเหม็น, เสียงดัง, ขยะ, น้ำเสีย และเรื่องร้องทุกข์</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-blue-400/20 text-blue-300 flex items-center justify-center shrink-0">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-white">ขอบริการสูบสิ่งปฏิกูล (ดูดส้วม)</div>
                    <div className="text-[11px] text-emerald-200/70">ระบุพิกัดบ้านและนัดหมายวันเข้าให้บริการ</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-rose-400/20 text-rose-300 flex items-center justify-center shrink-0">
                    <HeartPulse className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-white">ขอยืมอุปกรณ์การแพทย์สำหรับผู้ป่วย</div>
                    <div className="text-[11px] text-emerald-200/70">เตียงผู้ป่วย, รถเข็นวีลแชร์, เครื่องผลิตออกซิเจน</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-emerald-400/20 text-emerald-300 flex items-center justify-center shrink-0">
                    <Search className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-white">ตรวจสอบและติดตามสถานะคำร้อง</div>
                    <div className="text-[11px] text-emerald-200/70">เช็กความคืบหน้าด้วยรหัสคำร้องหรือเบอร์โทรศัพท์</div>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onEnterAsCitizen}
              className="w-full py-3.5 px-5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
            >
              <span>เข้าสู่หน้าแบบฟอร์มบริการประชาชน</span>
              <span className="text-base">➔</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto w-full text-center text-xs text-slate-400 py-3 border-t border-emerald-500/10 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>
          © 2569 กองสาธารณสุขและสิ่งแวดล้อม เทศบาลตำบลบางเป้า อ.กันตัง จ.ตรัง
        </div>
        <div className="flex items-center gap-3 text-slate-400 text-[11px]">
          <span>โทร: 075-270569</span>
          <span>•</span>
          <span>แจ้งเหตุฉุกเฉินตลอด 24 ชม.</span>
        </div>
      </footer>

      {/* Modal: ลงทะเบียนขอเปิดบัญชีเจ้าหน้าที่ใหม่ (ต้องรอ Admin อนุมัติ) */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-700" />
                <h3 className="font-bold text-base text-slate-900">
                  ลงทะเบียนขอสิทธิ์เข้าใช้งานเจ้าหน้าที่
                </h3>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs mb-4 flex items-start gap-2">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>หมายเหตุ:</strong> บัญชีที่ลงทะเบียนใหม่จะอยู่ในสถานะ <strong>"รอการอนุมัติ"</strong> 
                โดยผู้อำนวยการกองสาธารณสุข (Admin) จะเป็นผู้ตรวจสอบและยืนยันสิทธิ์ก่อนจึงจะสามารถล็อกอินได้
              </span>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">ชื่อ-นามสกุล จริง *</label>
                <input
                  type="text"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="เช่น นายรักถิ่น บางเป้า"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">ชื่อผู้ใช้งาน (Username) *</label>
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="เช่น rakthin.staff"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">รหัสผ่านที่ต้องการ *</label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="อย่างน้อย 4 ตัวอักษร"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">อีเมลติดต่อ</label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="email@bangpao.go.th"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">เบอร์โทรศัพท์</label>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="08x-xxx-xxxx"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">กลุ่มงาน / สังกัด</label>
                <input
                  type="text"
                  value={regDepartment}
                  onChange={(e) => setRegDepartment(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">บทบาทหน้าที่ที่ขอเปิดสิทธิ์</label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value as UserRole)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium bg-white"
                >
                  <option value="staff">เจ้าหน้าที่ผู้ปฏิบัติงาน (Staff)</option>
                  <option value="inspector">นายตรวจสุขลักษณะ (Inspector)</option>
                  <option value="executive">ผู้บริหารเทศบาล (Executive)</option>
                  <option value="citizen">ประชาชน / ผู้ประกอบการ (Citizen)</option>
                </select>
              </div>

              <div className="pt-3 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 font-bold text-slate-700 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold cursor-pointer"
                >
                  ส่งคำขอเปิดบัญชี
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
