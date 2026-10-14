/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Establishment,
  GoogleSheetsConfig,
  HazardousBusiness,
  InspectionRecord,
  LicenseRecord,
  LtcPatient,
  MedicalEquipment,
  EquipmentLoan,
  NhsoProject,
  PublicPetition,
  MainNavTab,
  User,
  OfficialInspectionFormState,
  SignerSettings,
  DEFAULT_SIGNER_SETTINGS,
} from './types/index.ts';
import {
  getCurrentUser,
  setCurrentUser,
  logoutUser,
  getRolePermissions,
} from './services/authService.ts';
import {
  getStoredConfig,
  getStoredEstablishments,
  getStoredInspections,
  getStoredHazardous,
  getStoredPetitions,
  getStoredNhso,
  getStoredLtc,
  getStoredEquipment,
  getStoredLoans,
  getStoredLicenses,
  saveStoredConfig,
  saveStoredEstablishments,
  saveStoredInspections,
  saveStoredHazardous,
  saveStoredPetitions,
  saveStoredNhso,
  saveStoredLtc,
  saveStoredEquipment,
  saveStoredLoans,
  saveStoredLicenses,
  syncToGoogleSheets,
  fetchFromGoogleSheets,
  exportToCSV,
  DEFAULT_GAS_URL,
  DEFAULT_SHEET_ID,
} from './services/sheetsSync.ts';
import {
  INITIAL_ESTABLISHMENTS,
  INITIAL_INSPECTIONS,
  INITIAL_HAZARDOUS_BUSINESSES,
  INITIAL_PETITIONS,
  INITIAL_NHSO_PROJECTS,
  INITIAL_LTC_PATIENTS,
  INITIAL_MEDICAL_EQUIPMENT,
  INITIAL_EQUIPMENT_LOANS,
  INITIAL_LICENSE_RECORDS,
} from './data/mockData.ts';

// 100% Original Google Apps Script Live View
import { OriginalGasAppView } from './components/OriginalGasAppView.tsx';

// Main Navigation & Command Dashboard
import { Navbar } from './components/Navbar.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { ExecutiveCommandDashboard } from './components/ExecutiveCommandDashboard.tsx';
import { SettingsModuleView } from './components/SettingsModuleView.tsx';

// Inspection & License Components matching User Screenshots
import { OfficialInspectionForm } from './components/OfficialInspectionForm.tsx';
import { LicensePostApprovalDashboard } from './components/LicensePostApprovalDashboard.tsx';
import { PrintReportOptionsModal } from './components/PrintReportOptionsModal.tsx';
import { PrintLicenseOptionsModal } from './components/PrintLicenseOptionsModal.tsx';
import { EditLicenseModal } from './components/EditLicenseModal.tsx';
import { generateLicenseHtml, printHtmlInNewWindow } from './services/officialDocGenerator.ts';
import {
  exportLicenseSheetViaGas,
  exportLicensePdfViaGas,
  updateLicenseRecordInGas,
} from './services/gasExportService.ts';

import { HazardousModuleView } from './components/HazardousModuleView.tsx';
// Extended Public Health ERP Components
import { HazardousBusinessView } from './components/HazardousBusinessView.tsx';
import { PublicPetitionsView } from './components/PublicPetitionsView.tsx';
import { NhsoFundView } from './components/NhsoFundView.tsx';
import { LtcCareView } from './components/LtcCareView.tsx';
import { NhsoLtcCombinedView } from './components/NhsoLtcCombinedView.tsx';
import { MedicalEquipmentView } from './components/MedicalEquipmentView.tsx';
import { ReportsCenterView } from './components/ReportsCenterView.tsx';

// Modals
import { AuthModal } from './components/AuthModal.tsx';
import { PrintCertificateModal } from './components/PrintCertificateModal.tsx';
import { PrintInspectionReportModal } from './components/PrintInspectionReportModal.tsx';
import { GoogleSheetsSettingsModal } from './components/GoogleSheetsSettingsModal.tsx';
import { PrintA4PetitionModal } from './components/PrintA4PetitionModal.tsx';
import { SignerSettingsModal } from './components/SignerSettingsModal.tsx';
import { PrintEquipmentLoanModal } from './components/PrintEquipmentLoanModal.tsx';
import {
  NewHazardousModal,
  NewPetitionModal,
  NewEquipmentLoanModal,
} from './components/PublicHealthModals.tsx';
import { FirebaseSyncModal } from './components/FirebaseSyncModal.tsx';
import { subscribeCollection, COLLECTIONS } from './services/firebaseService.ts';

import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

export default function App() {
  const [firebaseModalOpen, setFirebaseModalOpen] = useState(false);
  // Current logged in officer (Default: น.ส. พิมลภัส ศรีสุข / นายตรวจ ตามคำสั่งผู้ใช้งาน)
  const [currentUser, setCurrentUserState] = useState<User>(() => {
    return {
      id: 'USR-002',
      username: 'inspector',
      fullName: 'น.ส. พิมลภัส ศรีสุข',
      email: 'pimonpat.sanitation@gov.th',
      role: 'inspector',
      roleTitle: 'นายตรวจ / เจ้าพนักงานสาธารณสุข',
      department: 'กองสาธารณสุขและสิ่งแวดล้อม เทศบาลตำบลบางเป้า',
      phone: '086-444-3322',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      createdAt: '2026-01-05T09:00:00Z',
    };
  });
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Licenses matching Image 6 (36 items)
  const [licenses, setLicenses] = useState<LicenseRecord[]>(() => getStoredLicenses());

  // Other Public Health datasets
  const [establishments, setEstablishments] = useState<Establishment[]>(() =>
    getStoredEstablishments()
  );
  const [inspections, setInspections] = useState<InspectionRecord[]>(() =>
    getStoredInspections()
  );
  const [hazardousBusinesses, setHazardousBusinesses] = useState<HazardousBusiness[]>(() =>
    getStoredHazardous()
  );
  const [petitions, setPetitions] = useState<PublicPetition[]>(() =>
    getStoredPetitions()
  );
  const [nhsoProjects, setNhsoProjects] = useState<NhsoProject[]>(() =>
    getStoredNhso()
  );
  const [ltcPatients, setLtcPatients] = useState<LtcPatient[]>(() =>
    getStoredLtc()
  );
  const [equipmentList, setEquipmentList] = useState<MedicalEquipment[]>(() =>
    getStoredEquipment()
  );
  const [loans, setLoans] = useState<EquipmentLoan[]>(() =>
    getStoredLoans()
  );

  const [config, setConfig] = useState<GoogleSheetsConfig>(() => getStoredConfig());
  
  // Sidebar & Navigation State for 6 Modules
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentTab, setCurrentTab] = useState<MainNavTab>('overview');

  // Sub-tabs for each of the 6 modules
  const [hazardousSubTab, setHazardousSubTab] = useState<'dashboard' | 'form'>('dashboard');
  const [nhsoLtcSubTab, setNhsoLtcSubTab] = useState<'route' | 'register' | 'inventory' | 'nhso'>('route');
  const [equipmentSubTab, setEquipmentSubTab] = useState<'loans' | 'register' | 'inventory'>('loans');
  const [petitionsSubTab, setPetitionsSubTab] = useState<'general' | 'sewage' | 'print' | 'tracking'>('general');
  const [settingsSubTab, setSettingsSubTab] = useState<'signers' | 'users' | 'approvers' | 'sheets'>('signers');

  const handleSidebarNavigate = (tab: MainNavTab, sub?: string) => {
    setCurrentTab(tab);
    if (sub) {
      if (tab === 'hazardous') setHazardousSubTab((sub as 'dashboard' | 'form') || 'dashboard');
      else if (tab === 'nhso_ltc') setNhsoLtcSubTab(sub as any);
      else if (tab === 'equipment') setEquipmentSubTab(sub as any);
      else if (tab === 'petitions') setPetitionsSubTab(sub as any);
      else if (tab === 'settings') setSettingsSubTab(sub as any);
    }
  };

  const getCurrentSubTabLabel = () => {
    if (currentTab === 'hazardous' || currentTab === 'gas_app' || currentTab === 'dashboard' || currentTab === 'establishments') {
      if (hazardousSubTab === 'dashboard') return '📊 แดชบอร์ดติดตามผลอนุมัติ (Post-Approval)';
      if (hazardousSubTab === 'form') return '📝 แบบฟอร์มตรวจประเมินสุขลักษณะ (3 ขั้นตอน)';
    } else if (currentTab === 'nhso_ltc') {
      if (nhsoLtcSubTab === 'route') return '🗺️ ระบบนำทางแจกจ่ายของ';
      if (nhsoLtcSubTab === 'register') return '📝 ลงทะเบียนผู้ป่วย LTC';
      if (nhsoLtcSubTab === 'inventory') return '📦 คลังอุปกรณ์ LTC';
      if (nhsoLtcSubTab === 'nhso') return '🏥 โครงการ สปสช.';
    } else if (currentTab === 'equipment') {
      if (equipmentSubTab === 'loans') return '🔄 ระบบยืม-คืน & สัญญาขอยืม A4';
      if (equipmentSubTab === 'register') return '📝 ลงทะเบียนผู้ยืม';
      if (equipmentSubTab === 'inventory') return '🦼 คลังอุปกรณ์การแพทย์';
    } else if (currentTab === 'petitions') {
      if (petitionsSubTab === 'general') return '📑 คำร้องทั่วไป & เหตุรำคาญ';
      if (petitionsSubTab === 'sewage') return '🚛 คำร้องขอดูดส้วม / สิ่งปฏิกูล';
      if (petitionsSubTab === 'print') return '🖨️ พิมพ์เสนอผู้บริหาร (A4 ตราครุฑ)';
      if (petitionsSubTab === 'tracking') return '🔍 ติดตามผลคำร้อง';
    } else if (currentTab === 'settings') {
      if (settingsSubTab === 'signers') return '✍️ ตั้งค่าผู้เซ็นเอกสารทุกระบบ';
      if (settingsSubTab === 'users') return '👤 ทะเบียนผู้ใช้งาน & สลับสิทธิ์';
      if (settingsSubTab === 'approvers') return '⚖️ ตั้งค่าผู้มีอำนาจพิจารณา';
      if (settingsSubTab === 'sheets') return '📊 เชื่อมต่อ Google Sheets & Apps Script';
    }
    return undefined;
  };

  // Screenshot 7 & 8 Modal states
  const [printOptionsModalOpen, setPrintOptionsModalOpen] = useState(false);
  const [licenseOptionsModalOpen, setLicenseOptionsModalOpen] = useState(false);
  const [selectedLicenseForPrint, setSelectedLicenseForPrint] = useState<LicenseRecord | null>(null);

  const [editLicenseModalOpen, setEditLicenseModalOpen] = useState(false);
  const [selectedLicenseForEdit, setSelectedLicenseForEdit] = useState<LicenseRecord | null>(null);
  const [selectedLicenseForInspectionEdit, setSelectedLicenseForInspectionEdit] = useState<LicenseRecord | null>(null);

  // Certificate / Report print modals
  const [certificateModalOpen, setCertificateModalOpen] = useState(false);
  const [selectedEstablishmentForCertificate, setSelectedEstablishmentForCertificate] =
    useState<Establishment | null>(null);

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedEstablishmentForReport, setSelectedEstablishmentForReport] =
    useState<Establishment | null>(null);

  const [sheetsModalOpen, setSheetsModalOpen] = useState(false);

  // Secondary Modals
  const [newHazardousModalOpen, setNewHazardousModalOpen] = useState(false);
  const [newPetitionModalOpen, setNewPetitionModalOpen] = useState(false);
  const [newLoanModalOpen, setNewLoanModalOpen] = useState(false);

  const [signerSettingsModalOpen, setSignerSettingsModalOpen] = useState(false);
  const [printPetitionModalOpen, setPrintPetitionModalOpen] = useState(false);
  const [selectedPetitionForA4Print, setSelectedPetitionForA4Print] = useState<PublicPetition | null>(null);

  const [selectedLicenseForOfficialDoc, setSelectedLicenseForOfficialDoc] = useState<LicenseRecord | null>(null);
  const [selectedLicenseForOfficialReport, setSelectedLicenseForOfficialReport] = useState<LicenseRecord | null>(null);

  const [equipmentLoanModalOpen, setEquipmentLoanModalOpen] = useState(false);
  const [selectedLoanForPrint, setSelectedLoanForPrint] = useState<EquipmentLoan | null>(null);

  const [signerSettings, setSignerSettings] = useState<SignerSettings>(() => {
    try {
      const saved = localStorage.getItem('bangpao_signer_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse signer settings', e);
    }
    return DEFAULT_SIGNER_SETTINGS;
  });

  const [isSyncing, setIsSyncing] = useState(false);

  // Toast
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const perms = getRolePermissions(currentUser.role);

  // Sync to LocalStorage
  useEffect(() => {
    saveStoredLicenses(licenses);
  }, [licenses]);

  useEffect(() => {
    saveStoredEstablishments(establishments);
  }, [establishments]);

  useEffect(() => {
    saveStoredInspections(inspections);
  }, [inspections]);

  useEffect(() => {
    saveStoredHazardous(hazardousBusinesses);
  }, [hazardousBusinesses]);

  useEffect(() => {
    saveStoredPetitions(petitions);
  }, [petitions]);

  useEffect(() => {
    saveStoredNhso(nhsoProjects);
  }, [nhsoProjects]);

  useEffect(() => {
    saveStoredLtc(ltcPatients);
  }, [ltcPatients]);

  useEffect(() => {
    saveStoredEquipment(equipmentList);
  }, [equipmentList]);

  useEffect(() => {
    saveStoredLoans(loans);
  }, [loans]);

  useEffect(() => {
    saveStoredConfig(config);
  }, [config]);

  useEffect(() => {
    try {
      localStorage.setItem('bangpao_signer_settings', JSON.stringify(signerSettings));
    } catch (e) {
      console.warn('Failed to save signer settings to localStorage', e);
    }
  }, [signerSettings]);

  // Real-time synchronization from Cloud Firestore
  useEffect(() => {
    const unsubLicenses = subscribeCollection<LicenseRecord>(COLLECTIONS.LICENSES, (items) => {
      if (items && items.length > 0) setLicenses(items);
    });
    const unsubPetitions = subscribeCollection<PublicPetition>(COLLECTIONS.PETITIONS, (items) => {
      if (items && items.length > 0) setPetitions(items);
    });
    const unsubEquipment = subscribeCollection<MedicalEquipment>(COLLECTIONS.EQUIPMENT, (items) => {
      if (items && items.length > 0) setEquipmentList(items);
    });
    const unsubLoans = subscribeCollection<EquipmentLoan>(COLLECTIONS.LOANS, (items) => {
      if (items && items.length > 0) setLoans(items);
    });
    const unsubNhso = subscribeCollection<NhsoProject>(COLLECTIONS.NHSO, (items) => {
      if (items && items.length > 0) setNhsoProjects(items);
    });

    return () => {
      unsubLicenses();
      unsubPetitions();
      unsubEquipment();
      unsubLoans();
      unsubNhso();
    };
  }, []);

  // Auth Handlers
  const handleUserChange = (u: User) => {
    setCurrentUserState(u);
    setCurrentUser(u);
  };

  const handleLogout = () => {
    logoutUser();
    const guestUser: User = {
      id: 'GUEST-001',
      username: 'guest',
      fullName: 'ผู้ใช้ทั่วไป (Citizen)',
      email: 'guest@public.gov.th',
      role: 'citizen',
      roleTitle: 'ประชาชนทั่วไป',
      department: 'ผู้รับบริการ',
      phone: '',
      createdAt: new Date().toISOString(),
    };
    handleUserChange(guestUser);
    showToast('info', 'ออกจากระบบแล้ว สลับเป็นสิทธิ์ผู้ใช้งานทั่วไป');
  };

  // Official Form Submit Handler (Section 1 + 2 + 3)
  const handleSaveOfficialInspection = async (
    formState: OfficialInspectionFormState,
    newLicense?: LicenseRecord
  ) => {
    if (newLicense) {
      // Add or update in licenses list
      const existingIdx = licenses.findIndex(
        (l) => l.businessName.toLowerCase() === newLicense.businessName.toLowerCase()
      );
      if (existingIdx >= 0) {
        const updated = [...licenses];
        updated[existingIdx] = {
          ...updated[existingIdx],
          ...newLicense,
        };
        setLicenses(updated);
      } else {
        setLicenses([newLicense, ...licenses]);
      }
    }

    // Also record in establishments table
    const estCode = `อม.1-69${Math.floor(100 + Math.random() * 900)}`;
    const newEst: Establishment = {
      id: `EST-${Date.now().toString().slice(-4)}`,
      code: estCode,
      name: formState.businessName,
      type: 'restaurant',
      ownerName: formState.ownerName || 'ผู้ประกอบการ',
      phone: formState.ownerPhone || formState.businessPhone,
      address: `${formState.addressNo} ม.${formState.moo} ${formState.road}`,
      subdistrict: formState.subdistrict,
      district: formState.district,
      province: formState.province,
      status: formState.overallResult === 'passed' ? 'passed' : 'needs_reinspection',
      latestScore: formState.overallResult === 'passed' ? 95 : 65,
      latestRating: formState.overallResult === 'passed' ? 'excellent' : 'poor',
      latestInspectionDate: new Date().toISOString().slice(0, 10),
      nextInspectionDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      certificateNo: `HYG-TRG-69-${Math.floor(10000 + Math.random() * 90000)}`,
      certificateExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      inspectorName: formState.inspectorName,
      notes: formState.additionalNotes || 'ผ่านเกณฑ์การประเมินสุขลักษณะโครงสร้าง',
      syncedToSheets: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setEstablishments([newEst, ...establishments]);

    showToast(
      'success',
      `บันทึกข้อมูลและอัปโหลดผลการตรวจ "${formState.businessName}" ขึ้นระบบคลาวด์เรียบร้อยแล้ว`
    );

    // If Google Sheets URL configured, trigger background sync
    if (config.appsScriptUrl) {
      try {
        await syncToGoogleSheets(
          config.appsScriptUrl,
          [newEst, ...establishments],
          inspections,
          hazardousBusinesses,
          petitions,
          loans,
          licenses
        );
      } catch {
        // Fallback silently
      }
    }

    // Switch to Dashboard
    setCurrentTab('hazardous');
    setHazardousSubTab('dashboard');
  };

  // Dashboard License Actions
  // 1. ปุ่มแก้ไข (✏️ แก้ไข): ดึงข้อมูลเดิมเข้าฟอร์มตรวจประเมินสุขลักษณะ 3 ขั้นตอน
  const handleEditLicense = (lic: LicenseRecord) => {
    setSelectedLicenseForInspectionEdit(lic);
    setCurrentTab('hazardous');
    setHazardousSubTab('form');
    showToast('info', `กำลังเปิดฟอร์มตรวจประเมินสุขลักษณะของ "${lic.businessName}" เพื่อแก้ไขข้อมูลเดิม`);
  };

  // 2. พิมพ์รายงานตรวจ (🖨️ รายงานตรวจ): เปิด modal เลือกพิมพ์ PDF, Google Sheet, Word
  const handlePrintInspectionReport = (lic: LicenseRecord) => {
    setSelectedLicenseForPrint(lic);
    setSelectedLicenseForOfficialReport(lic);
    setPrintOptionsModalOpen(true);
  };

  // 3. ออกใบอนุญาต (🖊️ ออกใบอนุญาต): เปิด modal ตรวจสอบและแก้ไขข้อมูลใบอนุญาต อภ.2
  const handleIssueLicense = (lic: LicenseRecord) => {
    setSelectedLicenseForEdit(lic);
    setEditLicenseModalOpen(true);
  };

  // 4. ต่ออายุ (🔄 ต่ออายุ): อัปเดตอายุใบอนุญาต +365 วัน และเปิดหน้าใบอนุญาตฉบับต่ออายุ
  const handleRenewLicense = (lic: LicenseRecord) => {
    if (!perms.canEdit) {
      showToast('error', 'สิทธิ์ของคุณไม่สามารถต่ออายุใบอนุญาตได้');
      return;
    }
    const today = new Date();
    const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const thaiCurrentYear = today.getFullYear() + 543;
    const nextThaiYear = thaiCurrentYear + 1;
    
    // Format DD/MM/YYYY
    const pad = (n: number) => n.toString().padStart(2, '0');
    const startStr = `${pad(today.getDate())}/${pad(today.getMonth() + 1)}/${thaiCurrentYear}`;
    const endStr = `${pad(nextYear.getDate())}/${pad(nextYear.getMonth() + 1)}/${nextThaiYear}`;

    const updated = licenses.map((l) =>
      l.id === lic.id
        ? {
            ...l,
            status: 'normal' as const,
            remainingDays: 365,
            approvalDate: startStr,
            expireDate: endStr,
            roundYear: `รอบปี ${thaiCurrentYear}`,
            licenseYear: String(thaiCurrentYear),
          }
        : l
    );
    setLicenses(updated);
    showToast('success', `ต่ออายุใบอนุญาต ${lic.businessName} สำเร็จ (รอบปี พ.ศ. ${thaiCurrentYear}, คงเหลือ 365 วัน)`);
    const renewed = updated.find((l) => l.id === lic.id) || lic;
    setSelectedLicenseForEdit(renewed);
    setEditLicenseModalOpen(true);
  };

  // Edit License Modal Handlers
  const handleSaveLicenseOnly = async (updated: LicenseRecord) => {
    setLicenses(licenses.map((l) => (l.id === updated.id ? updated : l)));
    showToast('success', `บันทึกข้อมูลใบอนุญาต ${updated.businessName} สำเร็จ`);
    try {
      await updateLicenseRecordInGas(updated, config.appsScriptUrl || DEFAULT_GAS_URL);
    } catch (e) {
      console.warn('Sync license warning:', e);
    }
  };

  const handleSaveAndExportPdf = async (updated: LicenseRecord) => {
    setLicenses(licenses.map((l) => (l.id === updated.id ? updated : l)));
    showToast('info', `กำลังส่งข้อมูลและสร้าง PDF ใบอนุญาตแบบทางการของ ${updated.businessName}...`);
    try {
      await updateLicenseRecordInGas(updated, config.appsScriptUrl || DEFAULT_GAS_URL);
      const res = await exportLicensePdfViaGas(updated.businessName, config.appsScriptUrl || DEFAULT_GAS_URL);
      if (res.success && res.pdfUrl) {
        showToast('success', `สร้าง PDF ใบอนุญาต ${updated.businessName} สำเร็จ!`);
        window.open(res.pdfUrl, '_blank');
      } else {
        const html = generateLicenseHtml(updated, signerSettings);
        printHtmlInNewWindow(html);
      }
    } catch {
      const html = generateLicenseHtml(updated, signerSettings);
      printHtmlInNewWindow(html);
    }
  };

  const handleSaveAndOpenGoogleSheet = async (updated: LicenseRecord) => {
    setLicenses(licenses.map((l) => (l.id === updated.id ? updated : l)));
    showToast('info', `กำลังสร้าง Google Sheet ใบอนุญาต (สร้างสำเนาเฉพาะร้านค้า) ของ ${updated.businessName}...`);
    try {
      await updateLicenseRecordInGas(updated, config.appsScriptUrl || DEFAULT_GAS_URL);
      const res = await exportLicenseSheetViaGas(updated.businessName, config.appsScriptUrl || DEFAULT_GAS_URL);
      if (res.success && (res.excelUrl || res.sheetUrl)) {
        showToast('success', `สร้าง Google Sheet ใบอนุญาต ${updated.businessName} สำเร็จ!`);
        window.open(res.excelUrl || res.sheetUrl, '_blank');
      } else {
        const redirectUrl = `${config.appsScriptUrl || DEFAULT_GAS_URL}?action=exportLicenseSheet&shopName=${encodeURIComponent(
          updated.businessName
        )}&redirect=true`;
        window.open(redirectUrl, '_blank');
      }
    } catch {
      const redirectUrl = `${config.appsScriptUrl || DEFAULT_GAS_URL}?action=exportLicenseSheet&shopName=${encodeURIComponent(
        updated.businessName
      )}&redirect=true`;
      window.open(redirectUrl, '_blank');
    }
  };

  // Google Sheets Sync
  const handleQuickSync = async () => {
    if (!config.appsScriptUrl) {
      setSheetsModalOpen(true);
      return;
    }
    setIsSyncing(true);
    try {
      const res = await syncToGoogleSheets(
        config.appsScriptUrl,
        establishments,
        inspections,
        hazardousBusinesses,
        petitions,
        loans,
        licenses
      );
      if (res.success) {
        setConfig((prev) => ({
          ...prev,
          lastSyncTime: new Date().toISOString(),
          syncStatus: 'success',
          syncMessage: 'ซิงค์ข้อมูลสำเร็จ',
        }));
        showToast('success', 'ส่งข้อมูลขึ้น Google Sheets สำเร็จเรียบร้อย');
      } else {
        showToast('error', res.message);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      showToast('error', 'ไม่สามารถเชื่อมต่อได้: ' + msg);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncPull = async () => {
    if (!config.appsScriptUrl) return;
    setIsSyncing(true);
    try {
      const res = await fetchFromGoogleSheets(config.appsScriptUrl);
      if (res.success && res.establishments && res.establishments.length > 0) {
        setEstablishments(res.establishments);
        if (res.inspections) setInspections(res.inspections);
        if (res.licenses) setLicenses(res.licenses);
        if (res.petitions) setPetitions(res.petitions);
        showToast('success', res.message);
      } else {
        showToast('info', res.message || 'ไม่พบรายการข้อมูลใหม่');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      showToast('error', msg);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleResetMockData = () => {
    if (window.confirm('คุณต้องการรีเซ็ตข้อมูลตัวอย่างทั้งหมดเป็นค่าเริ่มต้น (36 ร้านค้า) หรือไม่?')) {
      setLicenses(INITIAL_LICENSE_RECORDS);
      setEstablishments(INITIAL_ESTABLISHMENTS);
      setInspections(INITIAL_INSPECTIONS);
      setHazardousBusinesses(INITIAL_HAZARDOUS_BUSINESSES);
      setPetitions(INITIAL_PETITIONS);
      setNhsoProjects(INITIAL_NHSO_PROJECTS);
      setLtcPatients(INITIAL_LTC_PATIENTS);
      setEquipmentList(INITIAL_MEDICAL_EQUIPMENT);
      setLoans(INITIAL_EQUIPMENT_LOANS);
      showToast('info', 'รีเซ็ตข้อมูลตัวอย่างตามต้นฉบับ 36 รายการเรียบร้อยแล้ว');
    }
  };

  const badgeCounts = {
    petitions: petitions.filter((p) => p.status === 'submitted' || p.status === 'accepted').length,
    expiringLicenses: licenses.filter((l) => (l.remainingDays ?? l.daysRemaining ?? 999) <= 60).length,
    activeLoans: loans.filter((l) => l.status === 'borrowed').length,
    ltcPatients: ltcPatients.length,
  };

  return (
    <div className="h-screen bg-[#f4f7fa] flex overflow-hidden font-sans text-slate-800 antialiased">
      {/* 1. Sidebar Navigation (Left Panel: 6 Strictly Ordered Modules) */}
      <Sidebar
        currentTab={currentTab}
        activeSubTabs={{
          hazardous: hazardousSubTab,
          nhso_ltc: nhsoLtcSubTab,
          equipment: equipmentSubTab,
          petitions: petitionsSubTab,
          settings: settingsSubTab,
        }}
        onNavigate={handleSidebarNavigate}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        badgeCounts={badgeCounts}
        currentUser={currentUser}
        onOpenAuthModal={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* 2. Main Container with Top Header and Scrollable Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header Bar without horizontal pills */}
        <Navbar
          currentTab={currentTab}
          currentSubTabLabel={getCurrentSubTabLabel()}
          config={config}
          currentUser={currentUser}
          onOpenAuthModal={() => setAuthModalOpen(true)}
          onLogout={handleLogout}
          onOpenSheetsModal={() => setSheetsModalOpen(true)}
          onOpenFirebaseModal={() => setFirebaseModalOpen(true)}
          isSyncing={isSyncing}
          onQuickSync={handleQuickSync}
          onOpenSignerSettings={() => setSignerSettingsModalOpen(true)}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          badgeCounts={badgeCounts}
        />

        {/* Scrollable View Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
          <main className={`flex-1 w-full max-w-7xl mx-auto ${(currentTab === 'hazardous' || currentTab === 'gas_app' || currentTab === 'dashboard' || currentTab === 'establishments') ? 'px-2 sm:px-4 py-3' : 'px-3 sm:px-6 lg:px-8 py-5'} print:p-0 print:m-0 print:max-w-none`}>
            {/* 1. 🏠 แดชบอร์ดหลักทุกระบบ (Master Overview Dashboard) */}
            {currentTab === 'overview' && (
              <ExecutiveCommandDashboard
                establishments={establishments}
                licenses={licenses}
                hazardousBusinesses={hazardousBusinesses}
                petitions={petitions}
                nhsoProjects={nhsoProjects}
                ltcPatients={ltcPatients}
                equipmentList={equipmentList}
                loans={loans}
                inspections={inspections}
                onNavigateTab={(tab) => {
                  const t = tab as string;
                  if (t === 'establishments' || t === 'form') {
                    setCurrentTab('hazardous');
                    setHazardousSubTab('form');
                  } else if (t === 'dashboard' || t === 'hazardous') {
                    setCurrentTab('hazardous');
                    setHazardousSubTab('dashboard');
                  } else if (t === 'nhso') {
                    setCurrentTab('nhso_ltc');
                    setNhsoLtcSubTab('nhso');
                  } else if (t === 'ltc') {
                    setCurrentTab('nhso_ltc');
                    setNhsoLtcSubTab('route');
                  } else if (t === 'petitions') {
                    setCurrentTab('petitions');
                    setPetitionsSubTab('sewage');
                  } else if (t === 'equipment') {
                    setCurrentTab('equipment');
                    setEquipmentSubTab('loans');
                  } else {
                    setCurrentTab(tab as MainNavTab);
                  }
                }}
                onOpenPrintModal={(petition) => {
                  setSelectedPetitionForA4Print(petition || petitions[0]);
                  setPrintPetitionModalOpen(true);
                }}
              />
            )}

            {/* 2. 🛡️ กิจการอันตรายต่อสุขภาพ (Web App เต็มรูปแบบ: แดชบอร์ดใบอนุญาต & ฟอร์มตรวจประเมิน) */}
            {(currentTab === 'hazardous' || currentTab === 'gas_app' || currentTab === 'dashboard' || currentTab === 'establishments') && (
              <HazardousModuleView
                licenses={licenses}
                hazardousBusinesses={hazardousBusinesses}
                userRole={currentUser.role}
                onRefreshData={handleQuickSync}
                onEditLicense={handleEditLicense}
                onPrintInspectionReport={handlePrintInspectionReport}
                onIssueLicense={handleIssueLicense}
                onRenewLicense={handleRenewLicense}
                onSaveOfficialInspection={handleSaveOfficialInspection}
                onAddNewBusiness={() => setNewHazardousModalOpen(true)}
                onInspectBusiness={(b) => {
                  setHazardousSubTab('form');
                }}
                onPrintBusinessLicense={(b) => {
                  const lic = licenses.find((l) => l.businessName === b.name);
                  if (lic) handleIssueLicense(lic);
                }}
                onDeleteBusiness={(b) => {
                  setHazardousBusinesses(hazardousBusinesses.filter((x) => x.id !== b.id));
                  showToast('info', `ลบกิจการ ${b.name} เรียบร้อย`);
                }}
                activeSubTab={hazardousSubTab}
                onSubTabChange={(tab) => setHazardousSubTab(tab as any)}
                selectedLicenseForInspectionEdit={selectedLicenseForInspectionEdit}
                onClearInspectionEdit={() => setSelectedLicenseForInspectionEdit(null)}
                gasUrl={config.appsScriptUrl || DEFAULT_GAS_URL}
                sheetId={config.sheetId || DEFAULT_SHEET_ID}
              />
            )}

            {/* 3. 📦 ระบบแจกจ่ายโครงการ สปสช. LTC (ระบบนำทางแผนที่, หน้าลงทะเบียน, หน้าคลังอุปกรณ์, โครงการ สปสช.) */}
            {(currentTab === 'nhso_ltc' || currentTab === 'nhso' || currentTab === 'ltc') && (
              <NhsoLtcCombinedView
                projects={nhsoProjects}
                patients={ltcPatients}
                userRole={currentUser.role}
                activeSubTab={nhsoLtcSubTab}
                onSubTabChange={(st) => setNhsoLtcSubTab(st)}
                onAddNewProject={() => {
                  const name = window.prompt('ชื่อโครงการ สปสช.:');
                  if (name) {
                    const newProj: NhsoProject = {
                      id: `NHSO-${Date.now()}`,
                      projectCode: `สปสช-69-00${nhsoProjects.length + 1}`,
                      projectName: name,
                      proposingOrg: 'ชมรม อสม. ตำบลบางเป้า',
                      category: 'disease_prevention',
                      budgetRequested: 35000,
                      budgetApproved: 0,
                      status: 'submitted',
                      fiscalYear: '2569',
                      startDate: '2026-11-01',
                      endDate: '2027-02-28',
                      targetParticipants: 150,
                      responsiblePerson: currentUser.fullName,
                      phone: '081-xxx-xxxx',
                    };
                    setNhsoProjects([newProj, ...nhsoProjects]);
                    showToast('success', `เสนอโครงการ ${name} แล้ว`);
                  }
                }}
                onApproveProject={(id, b) => {
                  if (perms.canApprove) {
                    setNhsoProjects((prev) =>
                      prev.map((p) => (p.id === id ? { ...p, status: 'approved', budgetApproved: b } : p))
                    );
                    showToast('success', 'อนุมัติงบโครงการเรียบร้อย');
                  }
                }}
                onAddNewPatient={() => setNhsoLtcSubTab('register')}
                onAddRegisteredPatient={(newPatient) => {
                  setLtcPatients((prev) => [newPatient, ...prev]);
                  showToast('success', `ขึ้นทะเบียนผู้ป่วย LTC "${newPatient.fullName}" สำเร็จ`);
                }}
                onRecordVisit={(p) => {
                  const notes = window.prompt(`บันทึกเยี่ยมบ้าน ${p.fullName}:`, 'สัญญาณชีพปกติ ทำแผลแล้ว มอบชุดดูแลเรียบร้อย');
                  if (notes) {
                    setLtcPatients((prev) =>
                      prev.map((item) =>
                        item.id === p.id
                          ? { ...item, lastVisitDate: new Date().toISOString().slice(0, 10), receivedCarePack: true }
                          : item
                      )
                    );
                    showToast('success', `บันทึกเยี่ยมบ้าน ${p.fullName} เรียบร้อย`);
                  }
                }}
                onPrintCarePlan={() => window.print()}
              />
            )}

            {/* 4. 🩺 ระบบยืมอุปกรณ์ทางการแพทย์ (หน้าลงทะเบียน, ระบบยืม-คืน & สัญญา A4, คลังอุปกรณ์) */}
            {currentTab === 'equipment' && (
              <MedicalEquipmentView
                equipmentList={equipmentList}
                loans={loans}
                userRole={currentUser.role}
                activeSubTab={equipmentSubTab}
                onSubTabChange={(st) => setEquipmentSubTab(st)}
                onNewLoan={() => setEquipmentSubTab('register')}
                onReturnEquipment={(loanId) => {
                  const targetLoan = loans.find((l) => l.id === loanId);
                  setLoans((prev) =>
                    prev.map((l) => (l.id === loanId ? { ...l, status: 'returned' } : l))
                  );
                  if (targetLoan && targetLoan.status !== 'returned') {
                    setEquipmentList((prev) =>
                      prev.map((eq) =>
                        eq.id === targetLoan.equipmentId
                          ? {
                              ...eq,
                              availableQuantity: eq.availableQuantity + 1,
                              inUseQuantity: Math.max(0, eq.inUseQuantity - 1),
                            }
                          : eq
                      )
                    );
                  }
                  showToast('success', 'บันทึกรับคืนอุปกรณ์เรียบร้อยและคืนยอดสต็อกแล้ว');
                }}
                onPrintContract={(loan) => {
                  setSelectedLoanForPrint(loan);
                  setEquipmentLoanModalOpen(true);
                }}
                onAddRegisteredLoan={(newLoan) => {
                  setLoans([newLoan, ...loans]);
                  setEquipmentList((prev) =>
                    prev.map((eq) =>
                      eq.id === newLoan.equipmentId
                        ? {
                            ...eq,
                            availableQuantity: Math.max(0, eq.availableQuantity - 1),
                            inUseQuantity: eq.inUseQuantity + 1,
                          }
                        : eq
                    )
                  );
                  showToast('success', `บันทึกการขอยืม ${newLoan.equipmentName} เรียบร้อย (ตัดสต็อกแล้ว)`);
                }}
              />
            )}

            {/* 5. 📋 ระบบยื่นคำร้องต่างๆ (คำร้องทั่วไป, คำร้องขอดูดส้วม, หน้าปริ้นเสนอผู้บริหาร, หน้าติดตามผล) */}
            {(currentTab === 'petitions' || currentTab === 'reports') && (
              <PublicPetitionsView
                petitions={petitions}
                userRole={currentUser.role}
                activeSubTab={petitionsSubTab}
                onSubTabChange={(st) => setPetitionsSubTab(st)}
                onAddNew={() => setNewPetitionModalOpen(true)}
                onUpdateStatus={(id, st, notes) => {
                  setPetitions((prev) =>
                    prev.map((p) => (p.id === id ? { ...p, status: st, resolutionNotes: notes } : p))
                  );
                  showToast('success', 'อัปเดตคำร้องเรียบร้อย');
                }}
                onPrintPetition={(p) => {
                  setSelectedPetitionForA4Print(p);
                  setPrintPetitionModalOpen(true);
                }}
                onAddSewagePetition={(newSewage) => {
                  setPetitions([newSewage, ...petitions]);
                  showToast('success', `บันทึกคำร้องขอดูดส้วม ${newSewage.trackingCode} เรียบร้อย`);
                }}
              />
            )}

            {/* 6. ⚙️ ระบบตั้งค่าหน้าผู้ใช้งานของทุกระบบ (ผู้เซ็นเอกสาร, ผู้ใช้งาน, ผู้มีอำนาจพิจารณา, Sheets) */}
            {currentTab === 'settings' && (
              <SettingsModuleView
                signerSettings={signerSettings}
                onSaveSignerSettings={(s) => {
                  setSignerSettings(s);
                  showToast('success', 'บันทึกการตั้งค่าผู้ลงนามเรียบร้อยแล้ว');
                }}
                currentUser={currentUser}
                onUserChange={(u) => setCurrentUserState(u)}
                config={config}
                onSaveConfig={(cfg) => setConfig(cfg)}
                onSyncPush={handleQuickSync}
                onSyncPull={handleSyncPull}
                isSyncing={isSyncing}
                onResetMockData={handleResetMockData}
                activeSubTab={settingsSubTab}
                onSubTabChange={(st) => setSettingsSubTab(st)}
                showToast={showToast}
              />
            )}
          </main>

          {/* Footer */}
          <footer className="bg-white border-t border-slate-200 py-3.5 px-4 text-center text-xs text-slate-500 print:hidden mt-auto">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
              <div>
                ระบบงานสารสนเทศสาธารณสุขและจัดการเมืองอัจฉริยะ • เทศบาลตำบลบางเป้า อ.กันตัง จ.ตรัง
              </div>
              <div className="flex items-center gap-3 text-slate-400">
                <span>เจ้าหน้าที่: <strong className="text-slate-700">{currentUser.fullName}</strong> ({currentUser.roleTitle || currentUser.role})</span>
                <span>•</span>
                <button onClick={() => setAuthModalOpen(true)} className="text-emerald-700 hover:underline cursor-pointer">
                  สลับผู้ใช้
                </button>
                <span>•</span>
                <button onClick={() => setSheetsModalOpen(true)} className="text-emerald-700 hover:underline cursor-pointer">
                  Google Sheets Sync
                </button>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-xs font-semibold ${
              toast.type === 'success'
                ? 'bg-emerald-800 text-white'
                : toast.type === 'error'
                ? 'bg-rose-800 text-white'
                : 'bg-slate-800 text-white'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />}
            {toast.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0" />}
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-white/70 hover:text-white cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Modal: พิมพ์แบบคำร้องขนาด A4 เสนอผู้บริหาร (ต้นฉบับตราครุฑ) */}
      <PrintA4PetitionModal
        isOpen={printPetitionModalOpen}
        onClose={() => setPrintPetitionModalOpen(false)}
        petition={selectedPetitionForA4Print}
        savedSignerSettings={signerSettings}
      />

      {/* Modal: ตั้งค่าผู้บริหารและผู้ลงนามคำร้อง A4 */}
      <SignerSettingsModal
        isOpen={signerSettingsModalOpen}
        onClose={() => setSignerSettingsModalOpen(false)}
        settings={signerSettings}
        onSave={(newSettings) => {
          setSignerSettings(newSettings);
          showToast('success', 'บันทึกการตั้งค่าผู้บริหารและผู้ลงนามเรียบร้อยแล้ว');
        }}
      />



      {/* Modal: แบบฟอร์มขอยืมอุปกรณ์การแพทย์ (ตรงตาม Medical Equipment Loan Scheme docx & doc_text_utf8.txt) */}
      <PrintEquipmentLoanModal
        isOpen={equipmentLoanModalOpen}
        onClose={() => setEquipmentLoanModalOpen(false)}
        loan={selectedLoanForPrint}
        savedSignerSettings={signerSettings}
      />

      {/* Modal 1: เลือกรูปแบบพิมพ์รายงานตรวจ (ตรงตาม ภาพ 3: PDF / Sheet / Word) */}
      <PrintReportOptionsModal
        license={selectedLicenseForPrint}
        isOpen={printOptionsModalOpen}
        onClose={() => setPrintOptionsModalOpen(false)}
        signerSettings={signerSettings}
        gasUrl={config.appsScriptUrl || DEFAULT_GAS_URL}
        onOpenGoogleSheet={() => {
          const sheetId = config.sheetId || DEFAULT_SHEET_ID;
          window.open(`https://docs.google.com/spreadsheets/d/${sheetId}/edit`, '_blank');
        }}
      />

      {/* Modal 1.1: เลือกรูปแบบพิมพ์/ออกใบอนุญาต อภ.2 (PDF / Sheet / Word) */}
      <PrintLicenseOptionsModal
        license={selectedLicenseForOfficialDoc}
        isOpen={licenseOptionsModalOpen}
        onClose={() => setLicenseOptionsModalOpen(false)}
        signerSettings={signerSettings}
        gasUrl={config.appsScriptUrl || DEFAULT_GAS_URL}
        onOpenGoogleSheet={async () => {
          if (!selectedLicenseForOfficialDoc) return;
          showToast('info', `กำลังสร้าง Google Sheet ใบอนุญาตของ ${selectedLicenseForOfficialDoc.businessName}...`);
          try {
            const res = await exportLicenseSheetViaGas(
              selectedLicenseForOfficialDoc.businessName,
              config.appsScriptUrl || DEFAULT_GAS_URL
            );
            if (res.success && (res.excelUrl || res.sheetUrl)) {
              showToast('success', `สร้าง Google Sheet สำเร็จ!`);
              window.open(res.excelUrl || res.sheetUrl, '_blank');
            } else {
              const redirectUrl = `${config.appsScriptUrl || DEFAULT_GAS_URL}?action=exportLicenseSheet&shopName=${encodeURIComponent(
                selectedLicenseForOfficialDoc.businessName
              )}&redirect=true`;
              window.open(redirectUrl, '_blank');
            }
          } catch {
            const redirectUrl = `${config.appsScriptUrl || DEFAULT_GAS_URL}?action=exportLicenseSheet&shopName=${encodeURIComponent(
              selectedLicenseForOfficialDoc.businessName
            )}&redirect=true`;
            window.open(redirectUrl, '_blank');
          }
        }}
        onEditBeforePrint={() => {
          if (selectedLicenseForOfficialDoc) {
            setSelectedLicenseForEdit(selectedLicenseForOfficialDoc);
            setEditLicenseModalOpen(true);
          }
        }}
      />

      {/* Modal 2: ตรวจสอบและแก้ไขข้อมูลใบอนุญาต (Matching Image 8) */}
      <EditLicenseModal
        license={selectedLicenseForEdit}
        isOpen={editLicenseModalOpen}
        onClose={() => setEditLicenseModalOpen(false)}
        signerSettings={signerSettings}
        gasUrl={config.appsScriptUrl || DEFAULT_GAS_URL}
        onSaveOnly={handleSaveLicenseOnly}
        onSaveAndExportPdf={handleSaveAndExportPdf}
        onSaveAndOpenGoogleSheet={handleSaveAndOpenGoogleSheet}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        currentUser={currentUser}
        onUserChange={handleUserChange}
        onShowToast={showToast}
      />

      {/* Certificate Modal */}
      {selectedEstablishmentForCertificate && (
        <PrintCertificateModal
          establishment={selectedEstablishmentForCertificate}
          isOpen={certificateModalOpen}
          onClose={() => setCertificateModalOpen(false)}
        />
      )}

      {/* Report Modal */}
      {selectedEstablishmentForReport && (
        <PrintInspectionReportModal
          establishment={selectedEstablishmentForReport}
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
        />
      )}

      {/* Google Sheets Settings */}
      <GoogleSheetsSettingsModal
        isOpen={sheetsModalOpen}
        onClose={() => setSheetsModalOpen(false)}
        config={config}
        onSaveConfig={setConfig}
        onSyncPush={handleQuickSync}
        onSyncPull={handleSyncPull}
        isSyncing={isSyncing}
        onResetMockData={handleResetMockData}
      />

      {/* Firebase Cloud Firestore & AI Studio Modal */}
      <FirebaseSyncModal
        isOpen={firebaseModalOpen}
        onClose={() => setFirebaseModalOpen(false)}
      />

      {/* Secondary Add Modals */}
      <NewHazardousModal
        isOpen={newHazardousModalOpen}
        onClose={() => setNewHazardousModalOpen(false)}
        onSave={(h) => {
          setHazardousBusinesses([h, ...hazardousBusinesses]);
          showToast('success', `เพิ่มกิจการอันตราย ${h.name} เรียบร้อย`);
        }}
      />

      <NewPetitionModal
        isOpen={newPetitionModalOpen}
        onClose={() => setNewPetitionModalOpen(false)}
        onSave={(p) => {
          setPetitions([p, ...petitions]);
          showToast('success', `ยื่นคำร้อง ${p.trackingCode} สำเร็จ`);
        }}
      />

      <NewEquipmentLoanModal
        isOpen={newLoanModalOpen}
        onClose={() => setNewLoanModalOpen(false)}
        equipmentList={equipmentList}
        onSave={(l) => {
          setLoans([l, ...loans]);
          showToast('success', `บันทึกการยืม ${l.equipmentName} เรียบร้อย`);
        }}
      />
    </div>
  );
}
