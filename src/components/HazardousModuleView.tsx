import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ClipboardCheck,
} from 'lucide-react';
import {
  LicenseRecord,
  HazardousBusiness,
  UserRole,
  OfficialInspectionFormState,
  SignerSettings,
} from '../types/index.ts';
import { LicensePostApprovalDashboard } from './LicensePostApprovalDashboard.tsx';
import { OfficialInspectionForm } from './OfficialInspectionForm.tsx';

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
  activeSubTab?: 'dashboard' | 'form' | 'directory';
  onSubTabChange?: (tab: 'dashboard' | 'form' | 'directory') => void;
  selectedLicenseForInspectionEdit?: LicenseRecord | null;
  onClearInspectionEdit?: () => void;
  formResetKey?: number;
  signerSettings?: SignerSettings;
  onOpenSignerSettings?: () => void;
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
  selectedLicenseForInspectionEdit,
  onClearInspectionEdit,
  formResetKey = 0,
  signerSettings,
  onOpenSignerSettings,
}) => {
  const [internalSubTab, setInternalSubTab] = useState<'dashboard' | 'form'>('dashboard');
  const [editingLicenseForForm, setEditingLicenseForForm] = useState<LicenseRecord | null>(null);
  const [localFormResetKey, setLocalFormResetKey] = useState(0);

  useEffect(() => {
    if (formResetKey > 0) {
      setEditingLicenseForForm(null);
    }
  }, [formResetKey]);
  const rawSubTab = controlledSubTab || internalSubTab;
  const subTab = rawSubTab === 'directory' || rawSubTab === ('gas_app' as any) ? 'dashboard' : rawSubTab;

  const handleSubTabClick = (tab: 'dashboard' | 'form') => {
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
    if (onClearInspectionEdit) onClearInspectionEdit();
    setLocalFormResetKey((prev) => prev + 1);
    handleSubTabClick('form');
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200 w-full">
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
          onEditLicense={onEditLicense}
          onPrintInspectionReport={onPrintInspectionReport}
          onIssueLicense={onIssueLicense}
          onRenewLicense={onRenewLicense}
          onNewInspection={handleNewInspection}
        />
      )}

      {subTab === 'form' && (
        <OfficialInspectionForm
          key={`form-${formResetKey}-${localFormResetKey}-${(selectedLicenseForInspectionEdit || editingLicenseForForm)?.id || 'blank'}`}
          existingLicenses={licenses}
          initialLicense={selectedLicenseForInspectionEdit || editingLicenseForForm}
          signerSettings={signerSettings}
          onOpenSignerSettings={onOpenSignerSettings}
          onSave={(rec, lic) => {
            onSaveOfficialInspection(rec, lic);
          }}
          onPrintReportImmediately={(lic) => {
            setEditingLicenseForForm(null);
            if (onClearInspectionEdit) onClearInspectionEdit();
            handleSubTabClick('dashboard');
            onPrintInspectionReport(lic);
          }}
          onGoToDashboard={() => {
            setEditingLicenseForForm(null);
            if (onClearInspectionEdit) onClearInspectionEdit();
            handleSubTabClick('dashboard');
          }}
        />
      )}
    </div>
  );
};
