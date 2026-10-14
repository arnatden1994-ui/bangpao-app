import React, { useState } from 'react';
import {
  Shield,
  LayoutDashboard,
  ClipboardCheck,
  Building2,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { LicenseRecord, HazardousBusiness, UserRole, OfficialInspectionFormState } from '../types/index.ts';
import { LicensePostApprovalDashboard } from './LicensePostApprovalDashboard.tsx';
import { OfficialInspectionForm } from './OfficialInspectionForm.tsx';
import { HazardousBusinessView } from './HazardousBusinessView.tsx';
import { OriginalGasAppView } from './OriginalGasAppView.tsx';

interface HazardousModuleViewProps {
  licenses: LicenseRecord[];
  hazardousBusinesses: HazardousBusiness[];
  userRole: UserRole;
  onRefreshData: () => void;
  onEditLicense: (license: LicenseRecord) => void;
  onPrintInspectionReport: (license: LicenseRecord) => void;
  onIssueLicense: (license: LicenseRecord) => void;
  onRenewLicense: (license: LicenseRecord) => void;
  onSaveOfficialInspection: (formState: OfficialInspectionFormState, newLicense?: LicenseRecord) => void;
  onAddNewBusiness: () => void;
  onInspectBusiness: (b: HazardousBusiness) => void;
  onPrintBusinessLicense: (b: HazardousBusiness) => void;
  onDeleteBusiness: (b: HazardousBusiness) => void;
  activeSubTab?: 'gas_app' | 'dashboard' | 'form' | 'directory';
  onSubTabChange?: (tab: 'gas_app' | 'dashboard' | 'form' | 'directory') => void;
  gasUrl?: string;
  sheetId?: string;
}

export const HazardousModuleView: React.FC<HazardousModuleViewProps> = ({
  licenses,
  hazardousBusinesses,
  userRole,
  onRefreshData,
  onEditLicense,
  onPrintInspectionReport,
  onIssueLicense,
  onRenewLicense,
  onSaveOfficialInspection,
  onAddNewBusiness,
  onInspectBusiness,
  onPrintBusinessLicense,
  onDeleteBusiness,
  activeSubTab: controlledSubTab,
  onSubTabChange,
  gasUrl,
  sheetId,
}) => {
  const [internalSubTab, setInternalSubTab] = useState<'dashboard' | 'form' | 'gas_app'>('dashboard');
  const [editingLicenseForForm, setEditingLicenseForForm] = useState<LicenseRecord | null>(null);
  const rawSubTab = controlledSubTab || internalSubTab;
  const subTab = rawSubTab === 'directory' ? 'dashboard' : rawSubTab;

  const handleSubTabClick = (tab: 'dashboard' | 'form' | 'gas_app') => {
    if (onSubTabChange) {
      onSubTabChange(tab as any);
    } else {
      setInternalSubTab(tab);
    }
  };

  const handleEditInspection = (lic: LicenseRecord) => {
    setEditingLicenseForForm(lic);
    handleSubTabClick('form');
  };

  const handleNewInspection = () => {
    setEditingLicenseForForm(null);
    handleSubTabClick('form');
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Tab Switcher */}
      <div className="bg-white p-2.5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => handleSubTabClick('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === 'dashboard'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>📊 แดชบอร์ดติดตามผลอนุมัติ (36 ร้านค้า)</span>
          </button>
          <button
            onClick={() => handleNewInspection()}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === 'form'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>📝 แบบฟอร์มตรวจประเมินสุขลักษณะ (3 ขั้นตอน)</span>
          </button>
          <button
            onClick={() => handleSubTabClick('gas_app')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              subTab === 'gas_app'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Google Apps Script ต้นฉบับ</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {subTab === 'dashboard' && (
            <button
              onClick={() => handleNewInspection()}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors shadow-2xs cursor-pointer"
            >
              <ClipboardCheck className="w-4 h-4 text-emerald-700" />
              <span>+ ตรวจประเมินใหม่</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-view Content: Clean, Direct, Zero Duplication */}
      {subTab === 'dashboard' && (
        <LicensePostApprovalDashboard
          licenses={licenses}
          onRefreshData={onRefreshData}
          onEditInspection={handleEditInspection}
          onEditLicense={handleEditInspection}
          onPrintInspectionReport={onPrintInspectionReport}
          onIssueLicense={onIssueLicense}
          onRenewLicense={onRenewLicense}
          onNewInspection={handleNewInspection}
        />
      )}

      {subTab === 'form' && (
        <OfficialInspectionForm
          existingLicenses={licenses}
          initialLicense={editingLicenseForForm}
          onSave={(rec, lic) => {
            onSaveOfficialInspection(rec, lic);
            setEditingLicenseForForm(null);
            handleSubTabClick('dashboard');
          }}
          onGoToDashboard={() => {
            setEditingLicenseForForm(null);
            handleSubTabClick('dashboard');
          }}
        />
      )}

      {subTab === 'gas_app' && (
        <OriginalGasAppView
          gasUrl={gasUrl || ''}
          sheetId={sheetId || ''}
          hazardousBusinesses={hazardousBusinesses}
          onAddNewBusiness={onAddNewBusiness}
        />
      )}
    </div>
  );
};
