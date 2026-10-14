import React, { useState } from 'react';
import {
  HeartPulse,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Coins,
  Building2,
  Users,
  Calendar,
  FileCheck,
  TrendingUp,
} from 'lucide-react';
import { NhsoProject, UserRole } from '../types/index.ts';

interface NhsoFundViewProps {
  projects: NhsoProject[];
  userRole: UserRole;
  onAddNew: () => void;
  onApproveProject: (id: string, budget: number) => void;
}

export const NhsoFundView: React.FC<NhsoFundViewProps> = ({
  projects,
  userRole,
  onAddNew,
  onApproveProject,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const totalBudgetRequested = projects.reduce((acc, p) => acc + p.budgetRequested, 0);
  const totalBudgetApproved = projects.reduce((acc, p) => acc + p.budgetApproved, 0);
  const completedProjects = projects.filter((p) => p.status === 'completed').length;

  const filtered = projects.filter((p) => {
    const q = search.toLowerCase().trim();
    const matchSearch =
      !q ||
      p.projectName.toLowerCase().includes(q) ||
      p.projectCode.toLowerCase().includes(q) ||
      p.proposingOrg.toLowerCase().includes(q) ||
      p.responsiblePerson.toLowerCase().includes(q);

    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const canApprove = userRole === 'admin';

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-7 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold mb-2.5 border border-blue-400/20">
            <HeartPulse className="w-3.5 h-3.5" />
            <span>กองทุนหลักประกันสุขภาพระดับท้องถิ่น (กปท. สปสช.)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold">
            ระบบบริหารโครงการกองทุนสุขภาพตำบล สปสช.
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-blue-100/90 leading-relaxed">
            สนับสนุนงบประมาณสร้างเสริมสุขภาพ ป้องกันโรค และฟื้นฟูสมรรถภาพของชุมชน ชมรม อสม. และหน่วยบริการสาธารณสุข
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">งบประมาณเสนอขอรวม</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            ฿{totalBudgetRequested.toLocaleString('th-TH')}
          </div>
          <div className="text-xs text-slate-400 mt-1">จาก {projects.length} โครงการในระบบ</div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">งบประมาณที่อนุมัติแล้ว</div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-2">
            ฿{totalBudgetApproved.toLocaleString('th-TH')}
          </div>
          <div className="text-xs text-emerald-700 mt-1 font-medium">
            อนุมัติแล้ว {Math.round((totalBudgetApproved / (totalBudgetRequested || 1)) * 100)}%
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">โครงการดำเนินการเสร็จสิ้น</div>
          <div className="text-2xl font-extrabold text-indigo-600 mt-2">
            {completedProjects} / {projects.length}
          </div>
          <div className="text-xs text-slate-400 mt-1">ประเมินผลลัพธ์สุขภาพชุมชนแล้ว</div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อโครงการ, รหัส, หน่วยงานเสนอขอ (เช่น ชมรม อสม.)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={onAddNew}
          className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>เสนอโครงการใหม่</span>
        </button>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-blue-300 transition-all space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-blue-900">
                    {item.projectCode}
                  </span>
                  <span className="text-xs text-slate-500">ปีงบประมาณ {item.fiscalYear}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">{item.projectName}</h3>
                <div className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>หน่วยงานเสนอขอ: <strong className="text-slate-800">{item.proposingOrg}</strong></span>
                  <span className="text-slate-300">|</span>
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>เป้าหมาย: {item.targetParticipants} คน</span>
                </div>
              </div>

              {/* Status */}
              <div className="shrink-0 text-right">
                {item.status === 'in_progress' && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                    กำลังดำเนินโครงการ
                  </span>
                )}
                {item.status === 'completed' && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    ดำเนินโครงการเสร็จสิ้น
                  </span>
                )}
                {item.status === 'approved' && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
                    อนุมัติงบประมาณแล้ว
                  </span>
                )}
                {item.status === 'submitted' && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                    รอพิจารณาอนุมัติ
                  </span>
                )}

                <div className="mt-2 text-xs">
                  <span className="text-slate-400">งบอนุมัติ: </span>
                  <strong className="text-slate-900 font-bold">
                    ฿{item.budgetApproved.toLocaleString('th-TH')}
                  </strong>
                </div>
              </div>
            </div>

            {item.outcomesSummary && (
              <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-200/60 text-xs text-blue-900">
                <strong>ผลลัพธ์ความสำเร็จ:</strong> {item.outcomesSummary}
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 border-t border-slate-100 gap-2">
              <div className="flex items-center gap-3">
                <span>ผู้รับผิดชอบ: {item.responsiblePerson} ({item.phone})</span>
                <span>ระยะเวลา: {item.startDate} ถึง {item.endDate}</span>
              </div>

              {canApprove && item.status === 'submitted' && (
                <button
                  onClick={() => onApproveProject(item.id, item.budgetRequested)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors self-end"
                >
                  อนุมัติโครงการ (฿{item.budgetRequested.toLocaleString('th-TH')})
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
