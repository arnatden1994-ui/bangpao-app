import React, { useState, useEffect } from 'react';
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
  Calendar,
  Building2,
  MapPin,
  ArrowRight,
} from 'lucide-react';
import { User as UserType, UserRole } from '../types/index.ts';
import { loginUser, registerUser } from '../services/authService.ts';

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

  // Live Thai Clock & Date State
  const [currentDateTime, setCurrentDateTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatThaiDate = (date: Date) => {
    const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    const dayName = thaiDays[date.getDay()];
    const dayNum = date.getDate();
    const monthName = thaiMonths[date.getMonth()];
    const yearBE = date.getFullYear() + 543;
    return `วัน${dayName}ที่ ${dayNum} ${monthName} พ.ศ. ${yearBE}`;
  };

  const formatThaiTime = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds} น.`;
  };

  // Register Modal state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regDepartment, setRegDepartment] = useState('กองสาธารณสุขและสิ่งแวดล้อม');
  const [regRole, setRegRole] = useState<UserRole>('staff');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!username.trim()) {
      setErrorMessage('กรุณากรอกชื่อผู้ใช้งาน หรือ อีเมล');
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
    }, 250);
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
      phone: '',
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
    } else {
      onShowToast('error', res.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#04281f] via-[#063a2d] to-[#031d17] flex flex-col justify-between text-slate-100 font-sarabun selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Header: Large Logo, Municipal Titles & Live Digital Clock */}
      <header className="w-full bg-slate-950/60 backdrop-blur-md border-b border-emerald-500/20 py-4 px-4 sm:px-8 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo & Municipal Hierarchy */}
          <div className="flex items-center gap-4 sm:gap-5 text-center md:text-left">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white p-1.5 shadow-2xl ring-4 ring-emerald-400/50 flex items-center justify-center shrink-0 transition-transform hover:scale-105">
              <img
                src="/images-Photoroom.png"
                alt="ตราเทศบาลตำบลบางเป้า"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-wide leading-tight drop-shadow-md">
                กองสาธารณสุขและสิ่งแวดล้อม เทศบาลตำบลบางเป้า
              </h1>
              <p className="text-sm sm:text-base text-emerald-300 font-semibold mt-0.5">
                อำเภอกันตัง จังหวัดตรัง
              </p>
              <div className="text-xs sm:text-sm text-emerald-100/80 font-medium mt-1">
                ระบบสารสนเทศการจัดการงานสาธารณสุขและบริการประชาชนอิเล็กทรอนิกส์ (e-Service)
              </div>
            </div>
          </div>

          {/* Live Digital Clock Widget with Thai Day, Date, Month, B.E. Year */}
          <div className="flex flex-col items-center md:items-end bg-gradient-to-r from-emerald-950/90 to-slate-900/90 border border-emerald-400/30 px-5 py-3 rounded-2xl shadow-xl">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-300">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>{formatThaiDate(currentDateTime)}</span>
            </div>
            <div className="flex items-center gap-2 text-lg sm:text-xl font-black text-white font-mono tracking-widest mt-0.5">
              <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
              <span>{formatThaiTime(currentDateTime)}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container: Welcome Banner & 2 Prominent Cards */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10 my-auto flex-1 flex flex-col justify-center">
        {/* Welcome Banner */}
        <div className="text-center max-w-4xl mx-auto mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs sm:text-sm font-bold mb-3 shadow-inner">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>ระบบยืนยันตัวตนและจัดการสิทธิ์ตามตำแหน่ง (Official Access Gateway)</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-snug drop-shadow-sm">
            ยินดีต้อนรับสู่ระบบสารสนเทศและการบริการประชาชน
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-emerald-100/90 mt-2 font-medium max-w-2xl mx-auto leading-relaxed">
            เจ้าหน้าที่โปรดยืนยันตัวตนเพื่อเข้าสู่ระบบงานตามบทบาทหน้าที่ 
            สำหรับประชาชนสามารถเข้าสู่หน้าแบบฟอร์มเพื่อส่งคำร้องและปักหมุดที่อยู่ได้ทันที
          </p>
        </div>

        {/* 2 Big Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch max-w-6xl mx-auto w-full">
          {/* Card 1: สำหรับเจ้าหน้าที่เทศบาล (Officer Authentication - 6 cols) */}
          <div className="lg:col-span-6 bg-white text-slate-900 rounded-3xl p-7 sm:p-9 shadow-2xl border-2 border-emerald-200/80 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-emerald-100/60 to-transparent rounded-bl-full pointer-events-none" />

            <div>
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-800 text-white flex items-center justify-center shadow-lg shadow-emerald-800/20 shrink-0">
                    <ShieldCheck className="w-7 h-7 text-emerald-300" />
                  </div>
                  <div>
                    <h3 className="font-black text-xl sm:text-2xl text-slate-900 leading-tight">
                      เข้าสู่ระบบสำหรับเจ้าหน้าที่
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium">
                      ผู้บริหาร, นายตรวจ, เจ้าหน้าที่ปฏิบัติงานกองสาธารณสุข
                    </p>
                  </div>
                </div>

                <span className="text-xs font-black px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                  เจ้าหน้าที่
                </span>
              </div>

              {errorMessage && (
                <div className="mb-6 p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-900 text-sm flex items-start gap-3 animate-in fade-in duration-200 shadow-xs">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <span className="font-bold leading-relaxed">{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-sm sm:text-base font-bold text-slate-800 mb-2">
                    ชื่อผู้ใช้งาน (Username) หรือ อีเมล
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <User className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="กรอกชื่อผู้ใช้งาน หรือ อีเมลของท่าน"
                      className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-slate-300 text-base focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-all font-semibold text-slate-900 bg-slate-50"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm sm:text-base font-bold text-slate-800 mb-2">
                    รหัสผ่าน (Password)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="กรอกรหัสผ่าน"
                      className="w-full pl-12 pr-12 py-3.5 rounded-2xl border-2 border-slate-300 text-base focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-all font-semibold text-slate-900 bg-slate-50"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 hover:from-emerald-900 hover:to-teal-950 text-white font-black text-base sm:text-lg shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 mt-4 active:scale-[0.99]"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Clock className="w-5 h-5 animate-spin" />
                      กำลังตรวจสอบสิทธิ์...
                    </span>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      <span>ลงชื่อเข้าสู่ระบบปฏิบัติงาน</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Register New Account Link */}
            <div className="mt-6 pt-4 border-t border-slate-200 text-center">
              <button
                type="button"
                onClick={() => setShowRegisterModal(true)}
                className="text-xs sm:text-sm font-bold text-emerald-800 hover:text-emerald-950 hover:underline cursor-pointer inline-flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>ลงทะเบียนขอสิทธิ์ใช้งานสำหรับเจ้าหน้าที่คนใหม่</span>
              </button>
            </div>
          </div>

          {/* Card 2: สำหรับประชาชนทั่วไป (Citizen Portal with Address Pinning - 6 cols) */}
          <div className="lg:col-span-6 bg-gradient-to-br from-[#074737] via-[#0a5240] to-[#043327] rounded-3xl p-7 sm:p-9 shadow-2xl border-2 border-emerald-400/40 flex flex-col justify-between text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-400/10 rounded-bl-full pointer-events-none blur-xl" />

            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-400/20 text-emerald-200 text-xs sm:text-sm font-bold mb-4 border border-emerald-300/30">
                <Building2 className="w-4 h-4" />
                <span>ศูนย์บริการประชาชนออนไลน์ (Citizen e-Service)</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-2">
                สำหรับประชาชน ยื่นคำร้อง & ปักหมุดที่อยู่
              </h3>
              <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed mb-6 font-medium">
                ประชาชนทั่วไปไม่ต้องใช้รหัสผ่านเจ้าหน้าที่ สามารถเข้าสู่แบบฟอร์มเพื่อส่งคำร้องและระบุตำแหน่งพิกัดที่อยู่ได้ทันที
              </p>

              {/* Service Highlights */}
              <div className="space-y-3.5 mb-6">
                <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/10 border border-white/15 hover:bg-white/15 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm sm:text-base">
                      ยื่นคำร้องทั่วไป & ร้องเรียนเหตุรำคาญ
                    </div>
                    <div className="text-xs sm:text-sm text-emerald-200/80">
                      กลิ่นเหม็น, เสียงดัง, ขยะล้น, น้ำเสีย พร้อมระบบปักหมุดจุดเกิดเหตุ
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/10 border border-white/15 hover:bg-white/15 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-blue-400/20 text-blue-300 flex items-center justify-center shrink-0">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm sm:text-base">
                      ขอบริการสูบสิ่งปฏิกูล (ดูดส้วม)
                    </div>
                    <div className="text-xs sm:text-sm text-emerald-200/80">
                      นัดหมายวันเข้าสูบสิ่งปฏิกูล และปักหมุดตำแหน่งบ้านเลขที่อย่างแม่นยำ
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/10 border border-white/15 hover:bg-white/15 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-emerald-400/20 text-emerald-300 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm sm:text-base">
                      ปักหมุดแผนที่พิกัดบ้าน (GPS Location)
                    </div>
                    <div className="text-xs sm:text-sm text-emerald-200/80">
                      เลือกตำแหน่งบนแผนที่ หรือใช้ GPS พิกัดปัจจุบันเพื่อให้ทีมงานไปถึงจุดหมายได้ถูกต้อง
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/10 border border-white/15 hover:bg-white/15 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-teal-400/20 text-teal-300 flex items-center justify-center shrink-0">
                    <Search className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm sm:text-base">
                      ติดตามสถานะคำร้องแบบเรียลไทม์
                    </div>
                    <div className="text-xs sm:text-sm text-emerald-200/80">
                      ตรวจสอบความคืบหน้าการดำเนินงานของเทศบาลได้ทันที
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onEnterAsCitizen}
              className="w-full py-4 px-6 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-base sm:text-lg shadow-2xl shadow-emerald-400/30 transition-all flex items-center justify-center gap-2.5 cursor-pointer hover:scale-[1.01] active:scale-[0.99] mt-2"
            >
              <span>เข้าสู่หน้าแบบฟอร์มบริการประชาชน & ปักหมุดที่อยู่</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </main>

      {/* Footer: Dignified Municipal Attribution (NO phone numbers) */}
      <footer className="w-full bg-slate-950/80 border-t border-emerald-500/20 py-4 px-4 sm:px-8 text-center text-xs sm:text-sm text-emerald-300/80 font-medium">
        <div>
          © 2569 กองสาธารณสุขและสิ่งแวดล้อม เทศบาลตำบลบางเป้า อำเภอกันตัง จังหวัดตรัง
        </div>
      </footer>

      {/* Modal: ลงทะเบียนขอเปิดบัญชีเจ้าหน้าที่ใหม่ (ต้องรอ Admin อนุมัติ) */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border-2 border-emerald-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-6 h-6 text-emerald-800" />
                <h3 className="font-black text-lg text-slate-900">
                  ลงทะเบียนขอสิทธิ์เข้าใช้งานเจ้าหน้าที่
                </h3>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-300 text-amber-950 text-xs sm:text-sm mb-4 flex items-start gap-2.5">
              <Clock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <span className="font-medium leading-relaxed">
                <strong>เงื่อนไขความปลอดภัย:</strong> บัญชีที่ลงทะเบียนใหม่จะอยู่ในสถานะ <strong>"รอการอนุมัติ"</strong> 
                โดยผู้อำนวยการกองสาธารณสุข (Admin) จะเป็นผู้ตรวจสอบและยืนยันสิทธิ์ก่อนจึงจะสามารถล็อกอินได้
              </span>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="font-bold text-slate-800 block mb-1">ชื่อ-นามสกุล จริง *</label>
                <input
                  type="text"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="กรอกชื่อ-นามสกุล พร้อมคำนำหน้า"
                  className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">ชื่อผู้ใช้งาน (Username) *</label>
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="เช่น somchai.staff"
                    className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-800 block mb-1">รหัสผ่านที่ต้องการ *</label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="กำหนดรหัสผ่าน"
                    className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">อีเมลติดต่อ</label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="name@bangpao.go.th"
                  className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">กลุ่มงาน / สังกัด</label>
                <input
                  type="text"
                  value={regDepartment}
                  onChange={(e) => setRegDepartment(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">บทบาทหน้าที่ที่ขอเปิดสิทธิ์</label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value as UserRole)}
                  className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold bg-white"
                >
                  <option value="staff">เจ้าหน้าที่ผู้ปฏิบัติงาน (Staff)</option>
                  <option value="inspector">นายตรวจสุขลักษณะ (Inspector)</option>
                  <option value="executive">ผู้บริหารเทศบาล (Executive)</option>
                </select>
              </div>

              <div className="pt-3 flex gap-2.5 justify-end">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 font-bold text-slate-700 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-black cursor-pointer shadow-md"
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
