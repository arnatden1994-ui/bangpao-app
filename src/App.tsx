/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
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
  getActiveSession,
  setActiveSession,
  syncUsersFromRemote,
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
import { LoginGateway } from './components/LoginGateway.tsx';
import { CitizenPortalView } from './components/CitizenPortalView.tsx';
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
import { PrintOfficialLicenseModal } from './components/PrintOfficialLicenseModal.tsx';
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
import { CitizenPortalShareModal } from './components/CitizenPortalShareModal.tsx';
import { FieldJobActionView } from './components/FieldJobActionView.tsx';
import {
  buildPetitionNotificationPayload,
  buildEquipmentLoanNotificationPayload,
  dispatchNotification,
} from './services/notificationService.ts';
import {
  subscribeCollection,
  COLLECTIONS,
  saveToFirestore,
  deleteFromFirestore,
  saveSignerSettingsToFirestore,
  loadSignerSettingsFromFirestore,
} from './services/firebaseService.ts';

import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

const isCitizenDirectLink = (): boolean => {
  if (typeof window === 'undefined') return false;
  const p = new URLSearchParams(window.location.search);
  return (
    p.get('portal') === 'citizen' ||
    p.get('mode') === 'citizen' ||
    p.get('service') === 'med_loan' ||
    p.get('tab') === 'med_loan' ||
    p.get('service') === 'sewage' ||
    p.get('tab') === 'sewage' ||
    p.get('tab') === 'tracking' ||
    window.location.hash.includes('citizen') ||
    window.location.hash.includes('med_loan')
  );
};

const CITIZEN_GUEST_USER: User = {
  id: 'USR-CITIZEN-ONLINE',
  username: 'citizen',
  fullName: 'ประชาชนทั่วไป / ผู้รับบริการออนไลน์',
  email: 'citizen@bangpao.go.th',
  role: 'citizen',
  roleTitle: 'ประชาชนตำบลบางเป้า (Citizen)',
  department: 'ประชาชนตำบลบางเป้า',
  phone: '',
  createdAt: new Date().toISOString(),
  status: 'active',
};

export default function App() {
  const [firebaseModalOpen, setFirebaseModalOpen] = useState(false);
  const [citizenShareModalOpen, setCitizenShareModalOpen] = useState(false);
  const [activeFieldJobCode, setActiveFieldJobCode] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('job');
  });
  // Current logged in officer (Default: พันจ่าเอกอานัส เด่นหมาด / นายตรวจ ตามคำสั่งผู้ใช้งาน)
  const [currentUser, setCurrentUserState] = useState<User | null>(() => {
    if (isCitizenDirectLink()) return CITIZEN_GUEST_USER;
    return getActiveSession();
  });
  const [isCitizenMode, setIsCitizenMode] = useState<boolean>(() => {
    if (isCitizenDirectLink()) return true;
    const s = getActiveSession();
    return s?.role === 'citizen';
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
  const [inspectionFormResetKey, setInspectionFormResetKey] = useState(0);
  const [nhsoLtcSubTab, setNhsoLtcSubTab] = useState<'route' | 'register' | 'inventory' | 'nhso'>('route');
  const [equipmentSubTab, setEquipmentSubTab] = useState<'route' | 'register' | 'inventory' | 'loans' | 'map'>('route');
  const [petitionsSubTab, setPetitionsSubTab] = useState<'dashboard' | 'form'>('dashboard');
  const [settingsSubTab, setSettingsSubTab] = useState<'signers' | 'users' | 'approvers' | 'sheets' | 'notifications'>('signers');

  
  const lastNotifiedLoanCodeRef = React.useRef<string>('');
  const triggerPetitionNotification = (newP: PublicPetition) => {
    try {
      const payload = buildPetitionNotificationPayload(newP as any, signerSettings);
      dispatchNotification(payload, undefined, config.appsScriptUrl).catch(() => {});
    } catch (e) {
      console.warn('Notify petition error:', e);
    }
  };
  const triggerLoanNotification = (newLoan: EquipmentLoan) => {
    try {
      const codeKey = newLoan.loanCode || newLoan.id;
      if (lastNotifiedLoanCodeRef.current === codeKey) return;
      lastNotifiedLoanCodeRef.current = codeKey;
      setTimeout(() => {
        if (lastNotifiedLoanCodeRef.current === codeKey) lastNotifiedLoanCodeRef.current = '';
      }, 4000);
      const payload = buildEquipmentLoanNotificationPayload(newLoan as any, signerSettings);
      dispatchNotification(payload, undefined, config.appsScriptUrl).catch(() => {});
    } catch (e) {
      console.warn('Notify loan error:', e);
    }
  };

  const handleSidebarNavigate = (tab: MainNavTab, sub?: string) => {
    if (tab === 'settings' && currentUser?.role !== 'admin') {
      showToast('error', 'สิทธิ์ไม่เพียงพอ: เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถเข้าถึงระบบตั้งค่าได้');
      return;
    }
    setCurrentTab(tab);
    if (sub) {
      if (tab === 'hazardous') {
        setHazardousSubTab((sub as 'dashboard' | 'form') || 'dashboard');
        if (sub === 'form') {
          setSelectedLicenseForInspectionEdit(null);
          setInspectionFormResetKey((prev) => prev + 1);
        }
      }
      else if (tab === 'nhso_ltc') setNhsoLtcSubTab(sub as any);
      else if (tab === 'equipment') setEquipmentSubTab(sub as any);
      else if (tab === 'petitions') {
        const normSub = (sub === 'form' || sub === 'sewage' || sub === 'print') ? 'form' : 'dashboard';
        setPetitionsSubTab(normSub as any);
      }
      else if (tab === 'settings') setSettingsSubTab(sub as any);
    }
  };

  const getCurrentSubTabLabel = () => {
    if (currentTab === 'hazardous' || currentTab === 'gas_app' || currentTab === 'dashboard' || currentTab === 'establishments') {
      if (hazardousSubTab === 'dashboard') return '📊 แดชบอร์ดติดตามผลอนุมัติ (Post-Approval)';
      if (hazardousSubTab === 'form') return '📝 แบบฟอร์มตรวจประเมินสุขลักษณะ (3 ขั้นตอน)';
    } else if (currentTab === 'nhso_ltc') {
      if (nhsoLtcSubTab === 'route') return '📊 แดชบอร์ดติดตาม';
      if (nhsoLtcSubTab === 'register') return '📝 ลงทะเบียนผู้มีภาวะพึ่งพิง';
      if (nhsoLtcSubTab === 'inventory') return '📦 คลังอุปกรณ์';
      if (nhsoLtcSubTab === 'nhso') return '🏥 โครงการ สปสช. (กองทุน)';
    } else if (currentTab === 'nhso') {
      return '🏥 กองทุนหลักประกันสุขภาพตำบลบางเป้า (กปท.)';
    } else if (currentTab === 'equipment') {
      if (equipmentSubTab === 'route' || equipmentSubTab === 'loans' || equipmentSubTab === 'map') return '📊 แดชบอร์ดติดตาม (รอบส่ง/ยืม-คืน)';
      if (equipmentSubTab === 'register') return '📝 ลงทะเบียนขอยืมอุปกรณ์';
      if (equipmentSubTab === 'inventory') return '📦 คลังอุปกรณ์การแพทย์';

    } else if (currentTab === 'petitions') {
      if (petitionsSubTab === 'dashboard' || petitionsSubTab === 'general') return '📊 1. แดชบอร์ดติดตามคำร้อง';
      if (petitionsSubTab === 'form' || petitionsSubTab === 'sewage' || petitionsSubTab === 'print' || petitionsSubTab === 'tracking') return '📝 2. แบบฟอร์มคำร้อง';
    } else if (currentTab === 'settings') {
      if (settingsSubTab === 'signers') return '✍️ ตั้งค่าผู้เซ็นเอกสารทุกระบบ';
      if (settingsSubTab === 'users') return '👤 ทะเบียนผู้ใช้งาน & สลับสิทธิ์';
      if (settingsSubTab === 'approvers') return '⚖️ ตั้งค่าผู้มีอำนาจพิจารณา';
      if (settingsSubTab === 'sheets') return '📊 เชื่อมต่อ Google Sheets & Apps Script';
      if (settingsSubTab === 'notifications') return '🔔 แจ้งเตือน LINE กลุ่ม & อีเมล (แนบไฟล์แบบฟอร์ม A4)';
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
  const [officialLicenseModalOpen, setOfficialLicenseModalOpen] = useState(false);
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

  const perms = getRolePermissions(currentUser?.role || 'citizen');

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

  // Load signer settings from Firestore if available
  useEffect(() => {
    loadSignerSettingsFromFirestore().then((loaded) => {
      if (loaded && loaded.directorName && loaded.mayorName) {
        setSignerSettings(loaded);
      }
    }).catch(() => {});
  }, []);

  // Real-time synchronization from Cloud Firestore for all 5 core systems
  useEffect(() => {
    const unsubLicenses = subscribeCollection<LicenseRecord>(COLLECTIONS.LICENSES, (items) => {
      if (items && items.length > 0) setLicenses(items);
    });
    const unsubEstablishments = subscribeCollection<Establishment>(COLLECTIONS.ESTABLISHMENTS, (items) => {
      if (items && items.length > 0) setEstablishments(items);
    });
    const unsubHazardous = subscribeCollection<HazardousBusiness>(COLLECTIONS.HAZARDOUS, (items) => {
      if (items && items.length > 0) setHazardousBusinesses(items);
    });
    const unsubInspections = subscribeCollection<InspectionRecord>(COLLECTIONS.INSPECTIONS, (items) => {
      if (items && items.length > 0) setInspections(items);
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
    const unsubLtc = subscribeCollection<LtcPatient>(COLLECTIONS.LTC, (items) => {
      if (items && items.length > 0) setLtcPatients(items);
    });
    const unsubUsers = subscribeCollection<User>(COLLECTIONS.USERS, (items) => {
      if (items && items.length > 0) syncUsersFromRemote(items);
    });

    return () => {
unsubLicenses();
      unsubEstablishments();
      unsubHazardous();
      unsubInspections();
      unsubPetitions();
      unsubEquipment();
      unsubLoans();
      unsubNhso();
      unsubLtc();
      unsubUsers();
    };
  }, []);


  // Global Field Job (?job=...) URL & In-App Click Interceptor
  useEffect(() => {
    const handleCustomJobOpen = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail === 'string') {
        setActiveFieldJobCode(detail);
      }
    };
    const handlePopState = () => {
      const j = new URLSearchParams(window.location.search).get('job');
      setActiveFieldJobCode(j);
    };
    const handleDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.('a') as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute('href') || '';
      if (href.includes('?job=') || href.includes('&job=')) {
        try {
          const urlObj = new URL(href, window.location.origin);
          const jobParam = urlObj.searchParams.get('job');
          if (jobParam) {
            e.preventDefault();
            e.stopPropagation();
            setActiveFieldJobCode(jobParam);
          }
        } catch {}
      }
    };
    window.addEventListener('bangpao:open-field-job', handleCustomJobOpen);
    window.addEventListener('popstate', handlePopState);
    document.addEventListener('click', handleDocClick, true);
    return () => {
      window.removeEventListener('bangpao:open-field-job', handleCustomJobOpen);
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('click', handleDocClick, true);
    };
  }, []);

  // Auth Handlers
  const handleUserChange = (u: User) => {
    setCurrentUserState(u);
    setActiveSession(u);
    setIsCitizenMode(u.role === 'citizen');
  };

  const handleLoginSuccess = (u: User) => {
    setCurrentUserState(u);
    setActiveSession(u);
    setIsCitizenMode(u.role === 'citizen');
    showToast('success', `ยินดีต้อนรับ ${u.fullName} (${u.roleTitle || u.role})`);
  };

  const handleEnterAsCitizen = () => {
    const citizenUser: User = {
      id: 'USR-005',
      username: 'citizen',
      fullName: 'ประชาชนทั่วไป / ผู้รับบริการ',
      email: 'citizen@bangpao.go.th',
      role: 'citizen',
      roleTitle: 'ประชาชนตำบลบางเป้า (Citizen)',
      department: 'ประชาชนตำบลบางเป้า',
      phone: '',
      createdAt: new Date().toISOString(),
      status: 'active',
    };
    setCurrentUserState(citizenUser);
    setActiveSession(citizenUser);
    setIsCitizenMode(true);
    showToast('info', 'เข้าสู่ศูนย์บริการประชาชนออนไลน์ เทศบาลตำบลบางเป้า');
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUserState(null);
    setIsCitizenMode(false);
    if (typeof window !== 'undefined' && window.location.search) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    showToast('info', 'ออกจากระบบเรียบร้อยแล้ว');
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
      saveToFirestore(COLLECTIONS.LICENSES, newLicense).catch(() => {});
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
    saveToFirestore(COLLECTIONS.ESTABLISHMENTS, newEst).catch(() => {});

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

  // 3. ออกใบอนุญาต (🖊️ ออกใบอนุญาต): เปิดระบบออกใบอนุญาต & พิมพ์เทมเพลตมาตรฐาน (หน้า-หลัง A4)
  const handleIssueLicense = (lic: LicenseRecord) => {
    setSelectedLicenseForOfficialDoc(lic);
    setOfficialLicenseModalOpen(true);
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
    saveToFirestore(COLLECTIONS.LICENSES, renewed).catch(() => {});
    setSelectedLicenseForEdit(renewed);
    setEditLicenseModalOpen(true);
  };

  // Edit License Modal Handlers
  const handleSaveLicenseOnly = async (updated: LicenseRecord) => {
    setLicenses(licenses.map((l) => (l.id === updated.id ? updated : l)));
    saveToFirestore(COLLECTIONS.LICENSES, updated).catch(() => {});
    showToast('success', `บันทึกข้อมูลใบอนุญาต ${updated.businessName} สำเร็จ`);
    try {
      await updateLicenseRecordInGas(updated, config.appsScriptUrl || DEFAULT_GAS_URL);
    } catch (e) {
      console.warn('Sync license warning:', e);
    }
  };

  const handleSaveAndExportPdf = async (updated: LicenseRecord) => {
    setLicenses(licenses.map((l) => (l.id === updated.id ? updated : l)));
    saveToFirestore(COLLECTIONS.LICENSES, updated).catch(() => {});
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
    saveToFirestore(COLLECTIONS.LICENSES, updated).catch(() => {});
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

  // Google Sheets Sync (รองรับทั้งแบบกดเองและ Auto-Sync อัตโนมัติในพื้นหลัง)
  const handleQuickSync = async (
    silent = false,
    customData?: {
      establishments?: Establishment[];
      inspections?: InspectionRecord[];
      hazardousBusinesses?: HazardousBusiness[];
      petitions?: PublicPetition[];
      loans?: EquipmentLoan[];
      licenses?: LicenseRecord[];
    }
  ) => {
    if (!config.appsScriptUrl) {
      if (!silent) setSheetsModalOpen(true);
      return;
    }
    setIsSyncing(true);
    try {
      const res = await syncToGoogleSheets(
        config.appsScriptUrl,
        customData?.establishments ?? establishments,
        customData?.inspections ?? inspections,
        customData?.hazardousBusinesses ?? hazardousBusinesses,
        customData?.petitions ?? petitions,
        customData?.loans ?? loans,
        customData?.licenses ?? licenses
      );
      if (res.success) {
        const now = new Date().toISOString();
        setConfig((prev) => {
          const updated = {
            ...prev,
            lastSyncTime: now,
            syncStatus: 'success' as const,
            syncMessage: 'ซิงค์ข้อมูลสำเร็จ',
          };
          saveStoredConfig(updated);
          return updated;
        });
        if (!silent) {
          showToast('success', 'ส่งข้อมูลขึ้น Google Sheets สำเร็จเรียบร้อย');
        }
      } else {
        if (!silent) {
          showToast('error', res.message);
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!silent) {
        showToast('error', 'ไม่สามารถเชื่อมต่อได้: ' + msg);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-Sync Engine: ซิงค์อัตโนมัติเมื่อมีการเปลี่ยนแปลง แก้ไข ปรับปรุงข้อมูล
  const isInitialMount = useRef(true);
  const autoSyncDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  // 1. Debounced Auto-Sync เมื่อข้อมูลหลักมีการเปลี่ยนแปลง (เพิ่ม/แก้/ลบ)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (config.autoSync === false || !config.appsScriptUrl) return;

    if (autoSyncDebounceTimer.current) {
      clearTimeout(autoSyncDebounceTimer.current);
    }

    // หน่วงเวลา 2.5 วินาทีหลังจากพิมพ์/แก้ไขเสร็จ เพื่อยิงซิงค์ขึ้นชีตในพื้นหลัง
    autoSyncDebounceTimer.current = setTimeout(() => {
      handleQuickSync(true);
    }, 2500);

    return () => {
      if (autoSyncDebounceTimer.current) {
        clearTimeout(autoSyncDebounceTimer.current);
      }
    };
  }, [
    config.autoSync,
    config.appsScriptUrl,
    establishments,
    inspections,
    hazardousBusinesses,
    petitions,
    loans,
    licenses,
  ]);

  // 2. Periodic Auto-Sync ทุกๆ 5 นาทีเพื่อความสม่ำเสมอ
  useEffect(() => {
    if (config.autoSync === false || !config.appsScriptUrl) return;

    const interval = setInterval(() => {
      handleQuickSync(true);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [
    config.autoSync,
    config.appsScriptUrl,
    establishments,
    inspections,
    hazardousBusinesses,
    petitions,
    loans,
    licenses,
  ]);

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
  };

  const badgeCounts = {
    petitions: petitions.filter((p) => p.status === 'submitted' || p.status === 'accepted').length,
    expiringLicenses: licenses.filter((l) => (l.remainingDays ?? l.daysRemaining ?? 999) <= 60).length,
    activeLoans: loans.filter((l) => l.status === 'borrowed').length,
    ltcPatients: ltcPatients.length,
  };

  // 0. If Field Officer opened a Job Action Link (?job=...), show FieldJobActionView directly without requiring login
  if (activeFieldJobCode) {
    return (
      <div className="relative min-h-screen">
        {toast && (
          <div
            className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-sm animate-in slide-in-from-bottom-5 duration-200 ${
              toast.type === 'success'
                ? 'bg-emerald-900 border-emerald-500 text-emerald-100'
                : toast.type === 'error'
                ? 'bg-rose-900 border-rose-500 text-rose-100'
                : 'bg-teal-900 border-teal-500 text-teal-100'
            }`}
          >
            <span className="font-medium">{toast.message}</span>
          </div>
        )}
        <FieldJobActionView
          initialJobCode={activeFieldJobCode}
          petitions={petitions}
          loans={loans}
          signerSettings={signerSettings}
          gasUrl={config.appsScriptUrl}
          onUpdatePetition={(updatedP) => {
            setPetitions((prev) => {
              const exists = prev.some((p) => p.id === updatedP.id);
              return exists ? prev.map((p) => (p.id === updatedP.id ? updatedP : p)) : [updatedP, ...prev];
            });
            saveToFirestore(COLLECTIONS.PETITIONS, updatedP).catch(() => {});
          }}
          onUpdateLoan={(updatedL) => {
            setLoans((prev) => {
              const exists = prev.some((l) => l.id === updatedL.id);
              return exists ? prev.map((l) => (l.id === updatedL.id ? updatedL : l)) : [updatedL, ...prev];
            });
            saveToFirestore(COLLECTIONS.LOANS, updatedL).catch(() => {});
          }}
          onClose={() => {
            setActiveFieldJobCode(null);
            if (typeof window !== 'undefined' && window.location.search.includes('job=')) {
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          }}
          onShowToast={showToast}
        />
      </div>
    );
  }

  // 1. If not authenticated, require identity verification via LoginGateway
  if (!currentUser) {
    return (
      <div className="relative min-h-screen">
        {toast && (
          <div
            className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-sm animate-in slide-in-from-bottom-5 duration-200 ${
              toast.type === 'success'
                ? 'bg-emerald-900 border-emerald-500 text-emerald-100'
                : toast.type === 'error'
                ? 'bg-rose-900 border-rose-500 text-rose-100'
                : 'bg-teal-900 border-teal-500 text-teal-100'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : toast.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
            )}
            <span className="font-medium">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <LoginGateway
          onLoginSuccess={handleLoginSuccess}
          onEnterAsCitizen={handleEnterAsCitizen}
          onShowToast={showToast}
        />
      </div>
    );
  }

  // 2. If citizen, show dedicated Citizen Portal (forms & tracking only, no internal administrative access)
  if (isCitizenMode || currentUser.role === 'citizen') {
    return (
      <div className="relative min-h-screen">
        {toast && (
          <div
            className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-sm animate-in slide-in-from-bottom-5 duration-200 ${
              toast.type === 'success'
                ? 'bg-emerald-900 border-emerald-500 text-emerald-100'
                : toast.type === 'error'
                ? 'bg-rose-900 border-rose-500 text-rose-100'
                : 'bg-teal-900 border-teal-500 text-teal-100'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : toast.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
            )}
            <span className="font-medium">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <CitizenPortalView
          petitions={petitions}
          loans={loans}
          equipmentList={equipmentList}
          onAddPetition={(newP) => {
            setPetitions((prev) => [newP, ...prev]);
            saveToFirestore(COLLECTIONS.PETITIONS, newP).catch(() => {});
            triggerPetitionNotification(newP);
          }}
          onAddEquipmentLoan={(newLoan) => {
            setLoans((prev) => [newLoan, ...prev]);
            saveToFirestore(COLLECTIONS.LOANS, newLoan).catch(() => {});
            triggerLoanNotification(newLoan);
            showToast('success', 'ส่งคำขอยืมอุปกรณ์พร้อมแจ้งเตือน LINE & อีเมล (แนบไฟล์แบบฟอร์มสัญญา A4) เรียบร้อยแล้ว');
          }}
          onExitCitizenMode={handleLogout}
          onShowToast={showToast}
        />
      </div>
    );
  }

  return (
    <div className="relative h-screen bg-[#f4f7fa] flex overflow-hidden font-sans text-slate-800 antialiased">
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
      <div className="relative flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
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
          onOpenCitizenShareModal={() => setCitizenShareModalOpen(true)}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          badgeCounts={badgeCounts}
        />

        {/* Scrollable View Area */}
        <div className="relative flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
          <main className="flex-1 w-full px-3 sm:px-5 lg:px-6 xl:px-8 py-4 max-w-[1920px] mx-auto print:p-0 print:m-0 print:max-w-none">
            {/* 1. 🏠 แดชบอร์ดหลักทุกระบบ (Master Overview Dashboard) */}
            {currentTab === 'overview' && (
              <ExecutiveCommandDashboard
                onOpenCitizenShareModal={() => setCitizenShareModalOpen(true)}
                establishments={establishments}
                licenses={licenses}
                hazardousBusinesses={hazardousBusinesses}
                petitions={petitions}
                nhsoProjects={nhsoProjects}
                ltcPatients={ltcPatients}
                equipmentList={equipmentList}
                loans={loans}
                inspections={inspections}
                onShowToast={showToast}
                onNavigateTab={(tab, subTab) => {
                  if (tab === 'settings' && subTab) {
                    handleSidebarNavigate('settings', subTab);
                    return;
                  }
                  const t = tab as string;
                  if (t === 'establishments' || t === 'form') {
                    setCurrentTab('hazardous');
                    setHazardousSubTab('form');
                  } else if (t === 'dashboard' || t === 'hazardous') {
                    setCurrentTab('hazardous');
                    setHazardousSubTab('dashboard');
                  } else if (t === 'nhso') {
                    setCurrentTab('nhso');
                  } else if (t === 'ltc') {
                    setCurrentTab('nhso_ltc');
                    setNhsoLtcSubTab('route');
                  } else if (t === 'petitions') {
                    setCurrentTab('petitions');
                    setPetitionsSubTab('dashboard');
                  } else if (t === 'equipment') {
                    setCurrentTab('equipment');
                    setEquipmentSubTab('route');
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
                  deleteFromFirestore(COLLECTIONS.HAZARDOUS, b.id).catch(() => {});
                  showToast('info', `ลบกิจการ ${b.name} เรียบร้อย`);
                }}
                activeSubTab={hazardousSubTab}
                onSubTabChange={(tab) => setHazardousSubTab(tab as any)}
                selectedLicenseForInspectionEdit={selectedLicenseForInspectionEdit}
                onClearInspectionEdit={() => setSelectedLicenseForInspectionEdit(null)}
                formResetKey={inspectionFormResetKey}
                signerSettings={signerSettings}
                onOpenSignerSettings={() => setSignerSettingsModalOpen(true)}
                gasUrl={config.appsScriptUrl || DEFAULT_GAS_URL}
                sheetId={config.sheetId || DEFAULT_SHEET_ID}
              />
            )}

            {/* 3. 📦 ระบบแจกจ่ายโครงการ สปสช. LTC (ระบบนำทางแผนที่, ลงทะเบียนผู้มีภาวะพึ่งพิง, คลังอุปกรณ์) */}
            {(currentTab === 'nhso_ltc' || currentTab === 'ltc') && (
              <NhsoLtcCombinedView
                projects={nhsoProjects}
                signerSettings={signerSettings}
                gasUrl={config.appsScriptUrl}
                onShowToast={showToast}
                patients={ltcPatients}
                userRole={currentUser.role}
                activeSubTab={nhsoLtcSubTab}
                onSubTabChange={(st) => setNhsoLtcSubTab(st)}
                onAddNewProject={() => {
                  const newProj: NhsoProject = {
                    id: `NHSO-${Date.now()}`,
                    projectCode: `สปสช-69-00${nhsoProjects.length + 1}`,
                    projectName: `โครงการฟื้นฟูสมรรถภาพผู้มีภาวะพึ่งพิงตำบลบางเป้า ครั้งที่ ${nhsoProjects.length + 1}`,
                    proposingOrg: 'ชมรม อสม. ตำบลบางเป้า',
                    category: 'rehabilitation',
                    budgetRequested: 40000,
                    budgetApproved: 0,
                    status: 'submitted',
                    fiscalYear: '2569',
                    startDate: '2026-11-01',
                    endDate: '2027-03-31',
                    targetParticipants: 150,
                    responsiblePerson: currentUser.fullName,
                    phone: '081-456-7890',
                  };
                  setNhsoProjects([newProj, ...nhsoProjects]);
                  saveToFirestore(COLLECTIONS.NHSO, newProj).catch(() => {});
                  showToast('success', `บันทึกเสนอโครงการใหม่ "${newProj.projectName}" เรียบร้อย`);
                }}
                onApproveProject={(id, b) => {
                  if (perms.canApprove) {
                    setNhsoProjects((prev) =>
                      prev.map((p) => {
                        if (p.id === id) {
                          const updatedP = { ...p, status: 'approved' as const, budgetApproved: b };
                          saveToFirestore(COLLECTIONS.NHSO, updatedP).catch(() => {});
                          return updatedP;
                        }
                        return p;
                      })
                    );
                    showToast('success', 'อนุมัติงบโครงการเรียบร้อย');
                  }
                }}
                onAddNewPatient={() => setNhsoLtcSubTab('register')}
                onAddRegisteredPatient={(newPatient) => {
                  setLtcPatients((prev) => [newPatient, ...prev]);
                  saveToFirestore(COLLECTIONS.LTC, newPatient).catch(() => {});
                  showToast('success', `ขึ้นทะเบียนผู้มีภาวะพึ่งพิง "${newPatient.fullName}" สำเร็จ`);
                }}
                onUpdatePatient={(updatedPatient) => {
                  setLtcPatients((prev) =>
                    prev.map((p) => (p.id === updatedPatient.id ? updatedPatient : p))
                  );
                  saveToFirestore(COLLECTIONS.LTC, updatedPatient).catch(() => {});
                  showToast('success', `อัปเดตข้อมูลผู้มีภาวะพึ่งพิง "${updatedPatient.fullName}" สำเร็จ`);
                }}
                onDeletePatient={(patientId) => {
                  const target = ltcPatients.find((p) => p.id === patientId);
                  setLtcPatients((prev) => prev.filter((p) => p.id !== patientId));
                  deleteFromFirestore(COLLECTIONS.LTC, patientId).catch(() => {});
                  if (target) {
                    showToast('info', `ลบรายชื่อ "${target.fullName}" เรียบร้อยแล้ว`);
                  }
                }}
                onRecordVisit={(p) => {
                  setLtcPatients((prev) =>
                    prev.map((item) => {
                      if (item.id === p.id) {
                        const updatedItem = {
                          ...item,
                          lastVisitDate: new Date().toISOString().slice(0, 10),
                          receivedCarePack: true,
                        };
                        saveToFirestore(COLLECTIONS.LTC, updatedItem).catch(() => {});
                        return updatedItem;
                      }
                      return item;
                    })
                  );
                  showToast('success', `บันทึกการลงพื้นที่เยี่ยมบ้านและมอบชุดดูแลผู้ป่วยแก่ "${p.fullName}" สำเร็จ`);
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
                savedSignerSettings={signerSettings}
                onDeleteLoan={(loanId) => {
                  setLoans((prev) => prev.filter((l) => l.id !== loanId));
                  deleteFromFirestore(COLLECTIONS.LOANS, loanId).catch(() => {});
                  showToast('info', 'ลบรายการขอยืมอุปกรณ์เรียบร้อยแล้ว');
                }}
                onReturnEquipment={(loanId, returnCondition, notes) => {
                  const targetLoan = loans.find((l) => l.id === loanId);
                  setLoans((prev) =>
                    prev.map((l) => {
                      if (l.id === loanId) {
                        const updatedL = {
                          ...l,
                          status: 'returned' as const,
                          returnDate: new Date().toISOString().split('T')[0],
                          returnCondition: returnCondition || 'complete',
                          damageNotes: notes || '',
                        };
                        saveToFirestore(COLLECTIONS.LOANS, updatedL).catch(() => {});
                        return updatedL;
                      }
                      return l;
                    })
                  );
                  if (targetLoan && targetLoan.status !== 'returned') {
                    setEquipmentList((prev) =>
                      prev.map((eq) => {
                        if (eq.id === targetLoan.equipmentId) {
                          const updatedEq = {
                            ...eq,
                            availableQuantity: eq.availableQuantity + 1,
                            inUseQuantity: Math.max(0, eq.inUseQuantity - 1),
                          };
                          saveToFirestore(COLLECTIONS.EQUIPMENT, updatedEq).catch(() => {});
                          return updatedEq;
                        }
                        return eq;
                      })
                    );
                  }
                  showToast('success', 'บันทึกรับคืนอุปกรณ์เรียบร้อยและคืนยอดสต็อกแล้ว');
                }}
                onUpdateLoanStatus={(loanId, newStatus, extra) => {
                  const targetLoan = loans.find((l) => l.id === loanId);
                  setLoans((prev) =>
                    prev.map((l) => {
                      if (l.id === loanId) {
                        const updatedL = { ...l, status: newStatus, ...extra };
                        saveToFirestore(COLLECTIONS.LOANS, updatedL).catch(() => {});
                        return updatedL;
                      }
                      return l;
                    })
                  );
                  // If transitioning from pending/approved to borrowed, cut stock
                  if (targetLoan && targetLoan.status !== 'borrowed' && newStatus === 'borrowed') {
                    setEquipmentList((prev) =>
                      prev.map((eq) => {
                        if (eq.id === targetLoan.equipmentId) {
                          const updatedEq = {
                            ...eq,
                            availableQuantity: Math.max(0, eq.availableQuantity - 1),
                            inUseQuantity: eq.inUseQuantity + 1,
                          };
                          saveToFirestore(COLLECTIONS.EQUIPMENT, updatedEq).catch(() => {});
                          return updatedEq;
                        }
                        return eq;
                      })
                    );
                  }
                  // If transitioning from borrowed to returned, return stock
                  if (targetLoan && targetLoan.status === 'borrowed' && newStatus === 'returned') {
                    setEquipmentList((prev) =>
                      prev.map((eq) => {
                        if (eq.id === targetLoan.equipmentId) {
                          const updatedEq = {
                            ...eq,
                            availableQuantity: eq.availableQuantity + 1,
                            inUseQuantity: Math.max(0, eq.inUseQuantity - 1),
                          };
                          saveToFirestore(COLLECTIONS.EQUIPMENT, updatedEq).catch(() => {});
                          return updatedEq;
                        }
                        return eq;
                      })
                    );
                  }
                  showToast('success', 'อัปเดตสถานะรายการขอยืมเรียบร้อยแล้ว');
                }}
                onAddEquipment={(newEq) => {
                  setEquipmentList((prev) => [newEq, ...prev]);
                  saveToFirestore(COLLECTIONS.EQUIPMENT, newEq).catch(() => {});
                  showToast('success', `เพิ่ม ${newEq.name} เข้าคลังเรียบร้อยแล้ว`);
                }}
                onUpdateEquipment={(updatedEq) => {
                  setEquipmentList((prev) => {
                    const next = prev.map((eq) => (eq.id === updatedEq.id ? updatedEq : eq));
                    try {
                      saveStoredEquipment(next);
                    } catch (e) {
                      console.warn('LocalStorage save error:', e);
                    }
                    return next;
                  });
                  saveToFirestore(COLLECTIONS.EQUIPMENT, updatedEq).catch((err) => {
                    console.warn('Firestore equipment error:', err);
                  });
                  showToast('success', 'อัปเดตข้อมูลและรูปภาพ ' + (updatedEq.name || '') + ' เรียบร้อยแล้ว');
                }}
                onPrintContract={(loan) => {
                  setSelectedLoanForPrint(loan);
                  setEquipmentLoanModalOpen(true);
                }}
                onAddRegisteredLoan={(newLoan) => {
                  setLoans((prev) => [newLoan, ...prev]);
                  saveToFirestore(COLLECTIONS.LOANS, newLoan).catch(() => {});
                  // If newLoan is already borrowed, cut stock. If pending, don't cut yet!
                  if (newLoan.status === 'borrowed') {
                    setEquipmentList((prev) =>
                      prev.map((eq) => {
                        if (eq.id === newLoan.equipmentId) {
                          const updatedEq = {
                            ...eq,
                            availableQuantity: Math.max(0, eq.availableQuantity - 1),
                            inUseQuantity: eq.inUseQuantity + 1,
                          };
                          saveToFirestore(COLLECTIONS.EQUIPMENT, updatedEq).catch(() => {});
                          return updatedEq;
                        }
                        return eq;
                      })
                    );
                  }
                  triggerLoanNotification(newLoan);
                  showToast('success', `บันทึกคำขอยืม ${newLoan.equipmentName} และส่งแจ้งเตือนพร้อมไฟล์สัญญา A4 เข้าอีเมลแล้ว`);
                }}
              />
            )}

            {/* 5. 📋 ระบบยื่นคำร้องต่างๆ (คำร้องทั่วไป, คำร้องขอดูดส้วม, หน้าปริ้นเสนอผู้บริหาร, หน้าติดตามผล) */}
            {(currentTab === 'petitions' || currentTab === 'reports') && (
              <PublicPetitionsView
                petitions={petitions}
                userRole={currentUser.role}
                currentUser={currentUser}
                activeSubTab={petitionsSubTab}
                onSubTabChange={(st) => setPetitionsSubTab(st)}
                signerSettings={signerSettings}
                onUpdateSignerSettings={setSignerSettings}
                onAddNew={() => setNewPetitionModalOpen(true)}
                onUpdateStatus={(id, st, notes) => {
                  setPetitions((prev) =>
                    prev.map((p) => {
                      if (p.id === id) {
                        const updatedP = { ...p, status: st, resolutionNotes: notes };
                        saveToFirestore(COLLECTIONS.PETITIONS, updatedP).catch(() => {});
                        return updatedP;
                      }
                      return p;
                    })
                  );
                  showToast('success', 'อัปเดตคำร้องเรียบร้อย');
                }}
                onDeletePetition={(id) => {
                  setPetitions((prev) => prev.filter((p) => p.id !== id));
                  deleteFromFirestore(COLLECTIONS.PETITIONS, id).catch(() => {});
                  showToast('info', 'ลบรายการคำร้องเรียบร้อยแล้ว');
                }}
                onPrintPetition={(p) => {
                  setSelectedPetitionForA4Print(p);
                  setPrintPetitionModalOpen(true);
                }}
                onAddPetition={(newP) => {
                  setPetitions([newP, ...petitions]);
                  saveToFirestore(COLLECTIONS.PETITIONS, newP).catch(() => {});
                  triggerPetitionNotification(newP);
                  showToast('success', `บันทึกคำร้องและส่งแจ้งเตือนพร้อมแนบแบบฟอร์ม A4 เรียบร้อย`);
                }}
                onAddSewagePetition={(newSewage) => {
                  setPetitions([newSewage, ...petitions]);
                  saveToFirestore(COLLECTIONS.PETITIONS, newSewage).catch(() => {});
                  triggerPetitionNotification(newSewage);
                  showToast('success', `บันทึกคำร้องขอดูดส้วม ${newSewage.trackingCode} และส่งแจ้งเตือนพร้อมแนบแบบฟอร์ม A4 เรียบร้อย`);
                }}
              />
            )}

            {/* 6. 🏥 โครงการ สปสช. (กองทุนหลักประกันสุขภาพตำบลบางเป้า) */}
            {currentTab === 'nhso' && (
              <NhsoFundView
                projects={nhsoProjects}
                userRole={currentUser.role}
                onAddNew={() => {
                  const newProj: NhsoProject = {
                    id: `NHSO-${Date.now()}`,
                    projectCode: `สปสช-69-00${nhsoProjects.length + 1}`,
                    projectName: `โครงการฟื้นฟูสมรรถภาพผู้มีภาวะพึ่งพิงตำบลบางเป้า ครั้งที่ ${nhsoProjects.length + 1}`,
                    proposingOrg: 'ชมรม อสม. ตำบลบางเป้า',
                    category: 'rehabilitation',
                    budgetRequested: 40000,
                    budgetApproved: 0,
                    status: 'submitted',
                    fiscalYear: '2569',
                    startDate: '2026-11-01',
                    endDate: '2027-03-31',
                    targetParticipants: 150,
                    responsiblePerson: currentUser.fullName,
                    phone: '081-456-7890',
                  };
                  setNhsoProjects([newProj, ...nhsoProjects]);
                  saveToFirestore(COLLECTIONS.NHSO, newProj).catch(() => {});
                  showToast('success', `บันทึกเสนอโครงการใหม่ "${newProj.projectName}" เรียบร้อย`);
                }}
                onApproveProject={(id, b) => {
                  if (perms.canApprove) {
                    setNhsoProjects((prev) =>
                      prev.map((p) => {
                        if (p.id === id) {
                          const updatedP = { ...p, status: 'approved' as const, budgetApproved: b };
                          saveToFirestore(COLLECTIONS.NHSO, updatedP).catch(() => {});
                          return updatedP;
                        }
                        return p;
                      })
                    );
                    showToast('success', 'อนุมัติงบโครงการเรียบร้อย');
                  }
                }}
              />
            )}

            {/* 7. ⚙️ ระบบตั้งค่าหน้าผู้ใช้งานของทุกระบบ (ผู้เซ็นเอกสาร, ผู้ใช้งาน, ผู้มีอำนาจพิจารณา, Sheets) */}
            {currentTab === 'settings' && (
              <SettingsModuleView
                signerSettings={signerSettings}
                onSaveSignerSettings={(s) => {
                  setSignerSettings(s);
                  saveSignerSettingsToFirestore(s).catch(() => {});
                  showToast('success', 'บันทึกการตั้งค่าผู้ลงนามเรียบร้อยแล้ว');
                }}
                currentUser={currentUser}
                onUserChange={(u) => setCurrentUserState(u)}
                config={config}
                onSaveConfig={(cfg) => { setConfig(cfg); saveStoredConfig(cfg); }}
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
            <div className="max-w-[1920px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
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
          saveSignerSettingsToFirestore(newSettings).catch(() => {});
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
          setLicenseOptionsModalOpen(false);
          setOfficialLicenseModalOpen(true);
        }}
        onOpenOfficialPrint={() => {
          setLicenseOptionsModalOpen(false);
          setOfficialLicenseModalOpen(true);
        }}
      />

      {/* Modal 1.2: ระบบออกใบอนุญาต & พิมพ์เทมเพลตมาตรฐาน Word-XML (หน้า-หลัง A4) */}
      <PrintOfficialLicenseModal
        license={selectedLicenseForOfficialDoc}
        isOpen={officialLicenseModalOpen}
        onClose={() => setOfficialLicenseModalOpen(false)}
        savedSignerSettings={signerSettings}
        onSaveLicense={handleSaveLicenseOnly}
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
        onSaveConfig={(cfg) => { setConfig(cfg); saveStoredConfig(cfg); }}
        onSyncPush={handleQuickSync}
        onSyncPull={handleSyncPull}
        isSyncing={isSyncing}
        onResetMockData={handleResetMockData}
      />

      {/* Citizen Portal Share Modal */}
      <CitizenPortalShareModal
        isOpen={citizenShareModalOpen}
        onClose={() => setCitizenShareModalOpen(false)}
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
          saveToFirestore(COLLECTIONS.HAZARDOUS, h).catch(() => {});
          showToast('success', `เพิ่มกิจการอันตราย ${h.name} เรียบร้อย`);
        }}
      />

      <NewPetitionModal
        isOpen={newPetitionModalOpen}
        onClose={() => setNewPetitionModalOpen(false)}
        onSave={(p) => {
          setPetitions([p, ...petitions]);
          saveToFirestore(COLLECTIONS.PETITIONS, p).catch(() => {});
          triggerPetitionNotification(p);
          showToast('success', `ยื่นคำร้อง ${p.trackingCode} และส่งแจ้งเตือนพร้อมแนบแบบฟอร์ม A4 สำเร็จ`);
        }}
      />

      <NewEquipmentLoanModal
        isOpen={newLoanModalOpen}
        onClose={() => setNewLoanModalOpen(false)}
        equipmentList={equipmentList}
        onSave={(l) => {
          setLoans([l, ...loans]);
          saveToFirestore(COLLECTIONS.LOANS, l).catch(() => {});
          triggerLoanNotification(l);
          showToast('success', `บันทึกการยืม ${l.equipmentName} และส่งแจ้งเตือนพร้อมไฟล์สัญญา A4 เรียบร้อย`);
        }}
      />
    </div>
  );
}
