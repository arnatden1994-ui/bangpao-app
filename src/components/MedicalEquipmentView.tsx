import React, { useState } from 'react';
import {
  Stethoscope,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  Calendar,
  User,
  Phone,
  FileText,
  RotateCcw,
  ClipboardList,
  Building2,
  Check,
} from 'lucide-react';
import { EquipmentLoan, MedicalEquipment, UserRole } from '../types/index.ts';

interface MedicalEquipmentViewProps {
  equipmentList: MedicalEquipment[];
  loans: EquipmentLoan[];
  userRole: UserRole;
  onNewLoan: () => void;
  onReturnEquipment: (loanId: string) => void;
  onPrintContract: (loan: EquipmentLoan) => void;
  onAddRegisteredLoan?: (loan: EquipmentLoan) => void;
  activeSubTab?: 'register' | 'loans' | 'inventory';
  onSubTabChange?: (tab: 'register' | 'loans' | 'inventory') => void;
}

export const MedicalEquipmentView: React.FC<MedicalEquipmentViewProps> = ({
  equipmentList,
  loans,
  userRole,
  onNewLoan,
  onReturnEquipment,
  onPrintContract,
  onAddRegisteredLoan,
  activeSubTab: controlledTab,
  onSubTabChange,
}) => {
  // 3 Sub-tabs requested by user:
  // 1) หน้าลงทะเบียนผู้ยืม
  // 2) ระบบยืม (ระบบยืม-คืน & สัญญาขอยืม A4)
  // 3) คลังอุปกรณ์การแพทย์
  const [internalTab, setInternalTab] = useState<'register' | 'loans' | 'inventory'>('loans');
  const tab = controlledTab || internalTab;
  const setTab = (t: 'register' | 'loans' | 'inventory') => {
    if (onSubTabChange) onSubTabChange(t);
    else setInternalTab(t);
  };
  const [search, setSearch] = useState('');

  // Form State for Registering a New Loan
  const [borrowerForm, setBorrowerForm] = useState({
    borrowerName: '',
    borrowerIdCard: '',
    borrowerPhone: '',
    borrowerAddress: '',
    borrowerRelation: 'บุตร/ธิดา',
    patientName: '',
    patientIdCard: '',
    patientAge: '',
    patientDisease: 'อัมพาตครึ่งซีก / ผู้ป่วยติดเตียง',
    equipmentId: equipmentList[0]?.id || '',
    quantity: 1,
    loanPeriodMonths: 6,
    reason: 'เพื่อใช้ฟื้นฟูสมรรถภาพร่างกายที่บ้าน',
  });

  const [registerSuccessMsg, setRegisterSuccessMsg] = useState('');

  const totalAssets = equipmentList.reduce((acc, eq) => acc + eq.totalQuantity, 0);
  const inUseAssets = equipmentList.reduce((acc, eq) => acc + eq.inUseQuantity, 0);
  const availableAssets = equipmentList.reduce((acc, eq) => acc + eq.availableQuantity, 0);

  const canManage = userRole === 'admin' || userRole === 'inspector' || userRole === 'staff';

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!borrowerForm.borrowerName || !borrowerForm.patientName) {
      alert('กรุณากรอกชื่อผู้ยืม และชื่อผู้ป่วยให้ครบถ้วน');
      return;
    }

    const selectedEq = equipmentList.find((e) => e.id === borrowerForm.equipmentId) || equipmentList[0];
    const today = new Date();
    const thaiYear = today.getFullYear() + 543;
    const pad = (n: number) => n.toString().padStart(2, '0');
    const loanDateStr = `${pad(today.getDate())}/${pad(today.getMonth() + 1)}/${thaiYear}`;
    
    const dueDateObj = new Date(today);
    dueDateObj.setMonth(dueDateObj.getMonth() + Number(borrowerForm.loanPeriodMonths));
    const dueYear = dueDateObj.getFullYear() + 543;
    const dueDateStr = `${pad(dueDateObj.getDate())}/${pad(dueDateObj.getMonth() + 1)}/${dueYear}`;

    const newLoan: EquipmentLoan = {
      id: `LOAN-${Date.now().toString().slice(-4)}`,
      loanCode: `LN-69-${Math.floor(100 + Math.random() * 900)}`,
      equipmentId: selectedEq.id,
      equipmentName: selectedEq.name,
      equipmentCategory: selectedEq.category,
      borrowerName: borrowerForm.borrowerName,
      borrowerNationalId: borrowerForm.borrowerIdCard || '1929900123456',
      borrowerRelation: borrowerForm.borrowerRelation,
      patientName: borrowerForm.patientName,
      patientNationalId: borrowerForm.patientIdCard || '3929900654321',
      address: borrowerForm.borrowerAddress || 'ต.บางเป้า อ.กันตัง จ.ตรัง',
      phone: borrowerForm.borrowerPhone || '081-xxxxxxx',
      loanDate: loanDateStr,
      dueDate: dueDateStr,
      status: 'borrowed',
      officerInCharge: 'น.ส. พิมลภัส ศรีสุข',
      notes: `${borrowerForm.reason} (ระยะเวลายืม ${borrowerForm.loanPeriodMonths} เดือน)`,
      createdAt: new Date().toISOString(),
    };

    if (onAddRegisteredLoan) {
      onAddRegisteredLoan(newLoan);
    }

    setRegisterSuccessMsg(`✅ บันทึกขึ้นทะเบียนขอยืม "${selectedEq.name}" สำหรับคุณ "${borrowerForm.patientName}" สำเร็จแล้ว`);
    setTimeout(() => setRegisterSuccessMsg(''), 4000);
    setTab('loans');
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-950 to-slate-900 text-white p-6 sm:p-7 rounded-3xl shadow-lg relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-5 border border-emerald-700/40">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 text-xs sm:text-[13px] font-bold mb-2 border border-emerald-400/30">
            <Stethoscope className="w-4 h-4 text-emerald-300" />
            <span>ศูนย์บริการกายอุปกรณ์และอุปกรณ์การแพทย์เพื่อประชาชน</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight">
            🩺 ระบบบริการยืม-คืนอุปกรณ์ทางการแพทย์ กองสาธารณสุข
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-emerald-100/95 leading-relaxed font-normal">
            เทศบาลตำบลบางเป้า • สนับสนุนเตียงผู้ป่วย รถเข็นวีลแชร์ ถังออกซิเจน ที่นอนลม สำหรับผู้ป่วยติดเตียงและผู้พิการ
          </p>
        </div>

        {/* 3 Main Sub-Navigation Pills */}
        <div className="flex items-center bg-emerald-950/80 p-1.5 rounded-2xl border border-emerald-700/50 shrink-0 shadow-inner">
          <button
            onClick={() => setTab('register')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all cursor-pointer ${
              tab === 'register' ? 'bg-emerald-600 text-white shadow-md' : 'text-emerald-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <User className="w-4 h-4" />
            <span>หน้าลงทะเบียน</span>
          </button>

          <button
            onClick={() => setTab('loans')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all cursor-pointer ${
              tab === 'loans' ? 'bg-emerald-600 text-white shadow-md' : 'text-emerald-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>ระบบยืม-คืน ({loans.length})</span>
          </button>

          <button
            onClick={() => setTab('inventory')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all cursor-pointer ${
              tab === 'inventory' ? 'bg-emerald-600 text-white shadow-md' : 'text-emerald-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>คลังอุปกรณ์</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs">
          <div className="text-xs sm:text-[13px] font-bold text-slate-500">จำนวนอุปกรณ์ทั้งหมดในคลัง</div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{totalAssets} ชิ้น</div>
          <div className="text-xs text-slate-400 mt-1">ครอบคลุม 6 หมวดกายอุปกรณ์</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-emerald-200 bg-emerald-50/40 shadow-xs">
          <div className="text-xs sm:text-[13px] font-bold text-emerald-700">พร้อมให้บริการยืมขณะนี้</div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-800 mt-1">{availableAssets} ชิ้น</div>
          <div className="text-xs text-emerald-600 mt-1">ตรวจเช็กสภาพสมบูรณ์พร้อมใช้</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-teal-200 bg-teal-50/40 shadow-xs">
          <div className="text-xs sm:text-[13px] font-bold text-teal-700">ประชาชนกำลังยืมใช้งานที่บ้าน</div>
          <div className="text-2xl sm:text-3xl font-black text-teal-800 mt-1">{inUseAssets} ชิ้น</div>
          <div className="text-xs text-teal-600 mt-1">ผู้ป่วยได้รับการดูแลในชุมชน</div>
        </div>
      </div>

      {/* SUB-VIEW 1: หน้าลงทะเบียนผู้ยืม */}
      {tab === 'register' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-800">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                📝 แบบฟอร์มลงทะเบียนขอรับบริการยืมอุปกรณ์ทางการแพทย์
              </h3>
              <p className="text-[11px] text-slate-500">
                บันทึกคำขอยืมเพื่อจัดเตรียมอุปกรณ์และพิมพ์สัญญาขอยืม (บันทึกข้อตกลงศูนย์สาธิตและยืมอุปกรณ์ A4)
              </p>
            </div>
          </div>

          {registerSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold">
              {registerSuccessMsg}
            </div>
          )}

          <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
            {/* ส่วนที่ 1: ข้อมูลผู้ยืม (ผู้รับผิดชอบสัญญา) */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <span className="w-2 h-4 bg-teal-600 rounded-xs inline-block" />
                ส่วนที่ 1: ข้อมูลผู้ยืม (ผู้ทำสัญญาแทน)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ชื่อ-สกุล ผู้ยืม *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น นายสมเกียรติ ยิ่งยืน"
                    value={borrowerForm.borrowerName}
                    onChange={(e) => setBorrowerForm({ ...borrowerForm, borrowerName: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">เลขบัตร ปชช. 13 หลัก</label>
                  <input
                    type="text"
                    maxLength={13}
                    placeholder="1929900xxxxxx"
                    value={borrowerForm.borrowerIdCard}
                    onChange={(e) => setBorrowerForm({ ...borrowerForm, borrowerIdCard: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ความสัมพันธ์กับผู้ป่วย</label>
                  <select
                    value={borrowerForm.borrowerRelation}
                    onChange={(e) => setBorrowerForm({ ...borrowerForm, borrowerRelation: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="บุตร/ธิดา">บุตร / ธิดา</option>
                    <option value="คู่สมรส">คู่สมรส (สามี/ภรรยา)</option>
                    <option value="บิดา/มารดา">บิดา / มารดา</option>
                    <option value="ญาติ">ญาติ / ผู้ดูแล</option>
                    <option value="ตนเอง">ตนเอง (ผู้ป่วยยืมเอง)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">เบอร์โทรศัพท์ติดต่อ *</label>
                  <input
                    type="text"
                    required
                    placeholder="081-xxxxxxx"
                    value={borrowerForm.borrowerPhone}
                    onChange={(e) => setBorrowerForm({ ...borrowerForm, borrowerPhone: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ที่อยู่ปัจจุบันของผู้ยืม</label>
                  <input
                    type="text"
                    placeholder="เลขที่ หมู่ ซอย ตำบลบางเป้า"
                    value={borrowerForm.borrowerAddress}
                    onChange={(e) => setBorrowerForm({ ...borrowerForm, borrowerAddress: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>
            </div>

            {/* ส่วนที่ 2: ข้อมูลผู้ป่วยที่ใช้งาน */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <span className="w-2 h-4 bg-teal-600 rounded-xs inline-block" />
                ส่วนที่ 2: ข้อมูลผู้ป่วย / ผู้ใช้งานอุปกรณ์
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ชื่อ-สกุล ผู้ป่วย *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น นางจำเนียร ยิ่งยืน"
                    value={borrowerForm.patientName}
                    onChange={(e) => setBorrowerForm({ ...borrowerForm, patientName: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">เลขบัตร ปชช. ผู้ป่วย</label>
                  <input
                    type="text"
                    maxLength={13}
                    placeholder="3929900xxxxxx"
                    value={borrowerForm.patientIdCard}
                    onChange={(e) => setBorrowerForm({ ...borrowerForm, patientIdCard: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">อายุ (ปี)</label>
                  <input
                    type="number"
                    placeholder="เช่น 78"
                    value={borrowerForm.patientAge}
                    onChange={(e) => setBorrowerForm({ ...borrowerForm, patientAge: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">โรคประจำตัว / สภาพความเจ็บป่วย</label>
                <input
                  type="text"
                  placeholder="เช่น หลอดเลือดสมองอัมพาตครึ่งซีก ติดเตียงช่วยเหลือตัวเองไม่ได้"
                  value={borrowerForm.patientDisease}
                  onChange={(e) => setBorrowerForm({ ...borrowerForm, patientDisease: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>

            {/* ส่วนที่ 3: อุปกรณ์ที่ต้องการยืม */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <span className="w-2 h-4 bg-teal-600 rounded-xs inline-block" />
                ส่วนที่ 3: ระบุอุปกรณ์และระยะเวลาการยืม
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">เลือกอุปกรณ์การแพทย์ที่ขอยืม *</label>
                  <select
                    value={borrowerForm.equipmentId}
                    onChange={(e) => setBorrowerForm({ ...borrowerForm, equipmentId: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold text-teal-800 bg-white"
                  >
                    {equipmentList.map((eq) => (
                      <option key={eq.id} value={eq.id} disabled={eq.availableQuantity <= 0}>
                        {eq.name} (ว่าง {eq.availableQuantity} ชิ้น)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">ระยะเวลาการยืม (ตามระเบียบ)</label>
                  <select
                    value={borrowerForm.loanPeriodMonths}
                    onChange={(e) => setBorrowerForm({ ...borrowerForm, loanPeriodMonths: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value={3}>3 เดือน</option>
                    <option value={6}>6 เดือน (มาตรฐาน)</option>
                    <option value={12}>12 เดือน (1 ปี)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">เหตุผลความจำเป็นในการขอยืม</label>
                <input
                  type="text"
                  placeholder="เช่น มีความจำเป็นต้องพักฟื้นที่บ้านตามแพทย์สั่ง"
                  value={borrowerForm.reason}
                  onChange={(e) => setBorrowerForm({ ...borrowerForm, reason: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setTab('loans')}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-bold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold shadow-xs cursor-pointer"
              >
                ✓ บันทึกการลงทะเบียนขอยืม
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUB-VIEW 2: ระบบยืม-คืน & สัญญาขอยืม A4 */}
      {tab === 'loans' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-3 p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหารหัสยืม (LN-...), ชื่อผู้ยืม, ผู้ป่วย, หรืออุปกรณ์..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <button
              onClick={() => setTab('register')}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-teal-700 hover:bg-teal-800 text-white transition-all shadow-xs shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ บันทึกขอยืมอุปกรณ์ใหม่</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">รหัสยืม / อุปกรณ์</th>
                  <th className="py-3 px-3">ผู้ยืม / ผู้ป่วย</th>
                  <th className="py-3 px-3">วันที่ยืม - ครบกำหนด</th>
                  <th className="py-3 px-3 text-center">สถานะ</th>
                  <th className="py-3 px-3 text-center">พิมพ์สัญญา A4</th>
                  <th className="py-3 px-3 text-center">บันทึกรับคืน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loans
                  .filter((loan) => {
                    const q = search.toLowerCase();
                    return (
                      !q ||
                      loan.loanCode.toLowerCase().includes(q) ||
                      loan.borrowerName.toLowerCase().includes(q) ||
                      loan.patientName.toLowerCase().includes(q) ||
                      loan.equipmentName.toLowerCase().includes(q)
                    );
                  })
                  .map((loan) => (
                    <tr key={loan.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-teal-800">{loan.loanCode}</div>
                        <div className="font-bold text-slate-900 mt-0.5">{loan.equipmentName}</div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="text-slate-900 font-semibold">{loan.borrowerName}</div>
                        <div className="text-[11px] text-slate-500">
                          ผู้ป่วย: {loan.patientName} ({loan.phone})
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div>ยืม: {loan.loanDate}</div>
                        <div className="text-[11px] text-slate-500">คืน: {loan.dueDate}</div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        {loan.status === 'borrowed' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                            กำลังยืมใช้งาน
                          </span>
                        )}
                        {loan.status === 'returned' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            ส่งคืนแล้ว
                          </span>
                        )}
                        {loan.status === 'overdue' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            เกินกำหนด
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => onPrintContract(loan)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-md font-bold text-[11px] cursor-pointer"
                          title="พิมพ์สัญญาบันทึกข้อตกลงศูนย์สาธิตและยืมอุปกรณ์ A4 ตราครุฑ"
                        >
                          <Printer className="w-3 h-3" />
                          <span>พิมพ์สัญญา A4</span>
                        </button>
                      </td>

                      <td className="py-3 px-3 text-center">
                        {loan.status === 'borrowed' ? (
                          <button
                            onClick={() => onReturnEquipment(loan.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-md font-bold text-[11px] cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>รับคืน</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">เรียบร้อย</span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: คลังอุปกรณ์การแพทย์ */}
      {tab === 'inventory' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipmentList.map((eq) => (
            <div
              key={eq.id}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-teal-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-[11px] font-bold text-slate-400">{eq.assetCode}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      eq.availableQuantity > 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {eq.availableQuantity > 0 ? '🟢 พร้อมบริการ' : '🔴 ถูกยืมหมด'}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mt-1">{eq.name}</h3>
                <div className="text-[11px] text-slate-500 mt-0.5">ที่เก็บ: {eq.storageLocation}</div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded bg-slate-50">
                  <div className="text-slate-400 text-[10px]">ทั้งหมด</div>
                  <div className="font-extrabold text-slate-900 mt-0.5">{eq.totalQuantity}</div>
                </div>
                <div className="p-2 rounded bg-emerald-50">
                  <div className="text-emerald-700 text-[10px] font-bold">พร้อมยืม</div>
                  <div className="font-extrabold text-emerald-800 mt-0.5">{eq.availableQuantity}</div>
                </div>
                <div className="p-2 rounded bg-blue-50">
                  <div className="text-blue-700 text-[10px] font-bold">กำลังยืม</div>
                  <div className="font-extrabold text-blue-800 mt-0.5">{eq.inUseQuantity}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
