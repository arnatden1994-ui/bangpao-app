import React, { useState } from 'react';
import {
  User,
  Shield,
  CheckCircle2,
  XCircle,
  LogOut,
  Sparkles,
  ChevronDown,
  UserCheck,
} from 'lucide-react';
import { User as UserType, UserRole } from '../types/index.ts';
import { getRolePermissions } from '../services/authService.ts';

interface UserProfileBadgeProps {
  currentUser: UserType | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
}

export const UserProfileBadge: React.FC<UserProfileBadgeProps> = ({
  currentUser,
  onOpenAuthModal,
  onLogout,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  if (!currentUser) {
    return (
      <button
        onClick={onOpenAuthModal}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
      >
        <UserCheck className="w-4 h-4" />
        <span>เข้าสู่ระบบ</span>
      </button>
    );
  }

  const perms = getRolePermissions(currentUser.role);

  const getRoleStyle = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return {
          bg: 'bg-purple-100 text-purple-900 border-purple-300',
          dot: 'bg-purple-600',
          label: '👑 ผอ.กอง (Admin)',
        };
      case 'inspector':
        return {
          bg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          dot: 'bg-emerald-600',
          label: '🔍 นายตรวจ (Inspector)',
        };
      case 'staff':
        return {
          bg: 'bg-blue-100 text-blue-900 border-blue-300',
          dot: 'bg-blue-600',
          label: '📋 เจ้าหน้าที่ (Staff)',
        };
      case 'citizen':
      default:
        return {
          bg: 'bg-amber-100 text-amber-900 border-amber-300',
          dot: 'bg-amber-600',
          label: '👤 ประชาชน (Citizen)',
        };
    }
  };

  const style = getRoleStyle(currentUser.role);

  return (
    <div className="relative">
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all text-left shadow-xs"
      >
        {currentUser.avatar ? (
          <img
            src={currentUser.avatar}
            alt={currentUser.fullName}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-slate-200"
          />
        ) : (
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
            {currentUser.fullName.slice(0, 1)}
          </div>
        )}

        <div className="hidden sm:block text-left">
          <div className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[130px]">
            {currentUser.fullName}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span
              className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold border ${style.bg}`}
            >
              {style.label}
            </span>
          </div>
        </div>

        <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block ml-1" />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-3 px-4 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
          <div className="border-b border-slate-100 pb-3 mb-3">
            <div className="font-bold text-slate-900 text-sm">{currentUser.fullName}</div>
            <div className="text-slate-500 font-mono text-[11px] mt-0.5">{currentUser.email}</div>
            <div className="text-slate-500 text-[11px] mt-0.5">{currentUser.department}</div>
            <div className="mt-2">
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold border ${style.bg}`}>
                {style.label}
              </span>
            </div>
          </div>

          {/* Permissions Matrix */}
          <div className="mb-3 space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <div className="font-semibold text-slate-700 text-[11px] mb-1">
              สิทธิ์การใช้งานของบทบาทนี้:
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-600">ตรวจประเมินสุขลักษณะ / กิจการ</span>
              {perms.canInspect ? (
                <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                  <CheckCircle2 className="w-3 h-3" /> มีสิทธิ์
                </span>
              ) : (
                <span className="text-slate-400 flex items-center gap-0.5">
                  <XCircle className="w-3 h-3" /> ดูได้อย่างเดียว
                </span>
              )}
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-600">แก้ไข / เพิ่มข้อมูล</span>
              {perms.canEdit ? (
                <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                  <CheckCircle2 className="w-3 h-3" /> มีสิทธิ์
                </span>
              ) : (
                <span className="text-slate-400 flex items-center gap-0.5">
                  <XCircle className="w-3 h-3" /> ไม่มีสิทธิ์
                </span>
              )}
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-600">อนุมัติโครงการ สปสช. / คำร้อง</span>
              {perms.canApprove ? (
                <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                  <CheckCircle2 className="w-3 h-3" /> มีสิทธิ์
                </span>
              ) : (
                <span className="text-slate-400 flex items-center gap-0.5">
                  <XCircle className="w-3 h-3" /> ไม่มีสิทธิ์
                </span>
              )}
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-600">พิมพ์รายงานและใบรับรอง</span>
              {perms.canPrintCert ? (
                <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                  <CheckCircle2 className="w-3 h-3" /> มีสิทธิ์
                </span>
              ) : (
                <span className="text-slate-400 flex items-center gap-0.5">
                  <XCircle className="w-3 h-3" /> ไม่มีสิทธิ์
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1 pt-1 border-t border-slate-100">
            <button
              onClick={() => {
                setDropdownOpen(false);
                onOpenAuthModal();
              }}
              className="w-full py-1.5 px-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>สลับบัญชีผู้ใช้ / สมัครสมาชิก</span>
            </button>
            <button
              onClick={() => {
                setDropdownOpen(false);
                onLogout();
              }}
              className="w-full py-1.5 px-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-md transition-colors flex items-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>ออกจากระบบ (Logout)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
