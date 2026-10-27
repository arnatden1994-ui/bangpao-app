import React, { useState, useMemo, useEffect } from 'react';
import {
  Truck,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Phone,
  Camera,
  Send,
  ArrowLeft,
  Clock,
  UserCheck,
  FileText,
  Printer,
  Download,
  Navigation,
  Stethoscope,
  Megaphone,
  ClipboardCheck,
  X,
} from 'lucide-react';
import { PublicPetition, EquipmentLoan, SignerSettings, DEFAULT_SIGNER_SETTINGS, User } from '../types/index.ts';
import { getAllUsers, getCurrentUser, syncUsersFromRemote } from '../services/authService.ts';
import { subscribeCollection, fetchUsersFromFirestore, COLLECTIONS } from '../services/firebaseService.ts';
import {
  buildFieldJobStatusUpdateNotificationPayload,
  dispatchNotification,
  openAttachmentPrintableHtml,
  downloadAttachmentDocx,
  getStoredLatestLtcQueueJob,
  LtcDeliveryQueueNotifyInput,
} from '../services/notificationService.ts';

interface FieldJobActionViewProps {
  initialJobCode: string;
  petitions: PublicPetition[];
  loans: EquipmentLoan[];
  signerSettings?: SignerSettings;
  gasUrl?: string;
  onUpdatePetition: (updated: PublicPetition) => void;
  onUpdateLoan: (updated: EquipmentLoan) => void;
  onClose: () => void;
  onShowToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

const sanitizeOfficerText = (text: string): string =>
  (text || '')
    .replace(/เด่นหมาด/g, 'เด็นหมาด')
    .replace(/นางสาวกัญจนณัฏฐ์\s*หริรักษ์/g, 'นางสาวปฐมาภรณ์ จันทร์แจ่ม')
    .replace(/กัญจนณัฏฐ์\s*หริรักษ์/g, 'ปฐมาภรณ์ จันทร์แจ่ม');

const OFFICER_PRESETS = [
  'พันจ่าเอกอานัส เด็นหมาด (เจ้าพนักงานสาธารณสุข (นายตรวจ))',
  'นางสาวปฐมาภรณ์ จันทร์แจ่ม (ผู้อำนวยการกองสาธารณสุขและสิ่งแวดล้อม)',
  'นายชนะ สุขด้วง (พนักงานขับรถบรรทุกสิ่งปฏิกูล)',
  'นายจตุพร ศรีสุวรรณ (ปลัดเทศบาลตำบลบางเป้า)',
  'นายนิติธรรม ดำสุด (รองนายกเทศมนตรี ปฏิบัติราชการแทน นายกเทศมนตรีตำบลบางเป้า)',
];

const ISSUE_REASON_PRESETS = [
  'ติดต่อผู้ขอรับบริการไม่ได้ / ไม่มีคนอยู่บ้าน',
  'ซอยแคบรถเข้าไม่ได้ / สายดูดยาวไม่ถึงจุดบ่อเกรอะ',
  'บ่อเกรอะชำรุด / หน้างานยังไม่พร้อมรับบริการ',
  'ผู้ขอแจ้งขอเลื่อนวันนัดหมายรับบริการ',
  'อุปกรณ์ไม่พอดีกับพื้นที่บ้าน / ต้องเปลี่ยนขนาดอุปกรณ์',
];

export const FieldJobActionView: React.FC<FieldJobActionViewProps> = ({
  initialJobCode,
  petitions,
  loans,
  signerSettings = DEFAULT_SIGNER_SETTINGS,
  gasUrl,
  onUpdatePetition,
  onUpdateLoan,
  onClose,
  onShowToast,
}) => {
  const [selectedCode, setSelectedCode] = useState<string>(initialJobCode);
  const [activeActionTab, setActiveActionTab] = useState<'accepted_en_route' | 'completed' | 'issue_blocked'>('completed');
  const [registeredUsers, setRegisteredUsers] = useState<User[]>(() => getAllUsers());
  const [isCustomOfficerInput, setIsCustomOfficerInput] = useState<boolean>(false);

  // Sync officer list dynamically with ระบบลงทะเบียนใช้งานและจัดการสิทธิ์เจ้าหน้าที่ (LocalStorage + Cloud Firestore) + ตั้งค่าผู้บริหารและผู้ลงนาม
  const officerOptions = useMemo(() => {
    const seenNames = new Set<string>();
    const result: string[] = [];

    const addOption = (rawName: string, rawPos?: string) => {
      const cleanName = sanitizeOfficerText(rawName || '').replace(/\s+/g, ' ').trim();
      if (!cleanName || cleanName.includes('สมชาย พิทักษ์ไทย') || cleanName.includes('สำรอง วัฒนา')) return;
      const normKey = cleanName
        .replace(/^พ\.จ\.อ\./, 'พันจ่าเอก')
        .replace(/\s+/g, '');
      if (seenNames.has(normKey)) return;
      seenNames.add(normKey);

      const cleanTitle = sanitizeOfficerText(rawPos || '')
        .replace(/\s*\(Staff\)/gi, '')
        .replace(/\s*\(Citizen\)/gi, '')
        .replace(/\s*\(Inspector\)/gi, '')
        .replace(/\s*\(รออนุมัติ\)/gi, '')
        .trim();
      result.push(cleanTitle ? `${cleanName} (${cleanTitle})` : cleanName);
    };

    // 1. เจ้าหน้าที่จากระบบลงทะเบียนใช้งานและจัดการสิทธิ์เจ้าหน้าที่
    const activeStaff = registeredUsers.filter(
      (u) => u.role !== 'citizen' && u.status !== 'suspended'
    );
    activeStaff.forEach((u) => addOption(u.fullName, u.roleTitle));

    // 2. ผอ.กองสาธารณสุขฯ และบุคลากรหลักจากตั้งค่าผู้ลงนาม (SignerSettings)
    if (signerSettings?.directorName) {
      addOption(
        signerSettings.directorName,
        signerSettings.directorPosition || signerSettings.directorPos || 'ผู้อำนวยการกองสาธารณสุขและสิ่งแวดล้อม'
      );
    } else {
      addOption('นางสาวปฐมาภรณ์ จันทร์แจ่ม', 'ผู้อำนวยการกองสาธารณสุขและสิ่งแวดล้อม');
    }

    (signerSettings?.inspectors || []).forEach((insp) => {
      if (insp.name) addOption(insp.name, insp.position);
    });

    if (signerSettings?.driverName) {
      addOption(signerSettings.driverName, 'พนักงานขับรถบรรทุกสิ่งปฏิกูล');
    } else {
      addOption('นายชนะ สุขด้วง', 'พนักงานขับรถบรรทุกสิ่งปฏิกูล');
    }

    return result.length > 0 ? result : OFFICER_PRESETS;
  }, [registeredUsers, signerSettings]);

  const [officerName, setOfficerName] = useState<string>(() => {
    const loggedIn = getCurrentUser();
    if (loggedIn && loggedIn.role !== 'citizen') {
      const cleanName = sanitizeOfficerText(loggedIn.fullName);
      const cleanTitle = sanitizeOfficerText(loggedIn.roleTitle || '')
        .replace(/\s*\(Staff\)/gi, '')
        .replace(/\s*\(Inspector\)/gi, '')
        .trim();
      return cleanTitle ? `${cleanName} (${cleanTitle})` : cleanName;
    }
    const allStaff = getAllUsers().filter((u) => u.role !== 'citizen' && u.status !== 'suspended');
    if (allStaff.length > 0) {
      const first = allStaff[0];
      const cleanName = sanitizeOfficerText(first.fullName);
      const cleanTitle = sanitizeOfficerText(first.roleTitle || '')
        .replace(/\s*\(Staff\)/gi, '')
        .replace(/\s*\(Inspector\)/gi, '')
        .trim();
      return cleanTitle ? `${cleanName} (${cleanTitle})` : cleanName;
    }
    return OFFICER_PRESETS[0];
  });

  useEffect(() => {
    let mounted = true;
    fetchUsersFromFirestore()
      .then((remoteUsers) => {
        if (mounted && remoteUsers && remoteUsers.length > 0) {
          syncUsersFromRemote(remoteUsers as any);
          setRegisteredUsers(getAllUsers());
        }
      })
      .catch(() => {});

    const unsub = subscribeCollection<any>(COLLECTIONS.USERS, (remoteUsers) => {
      if (mounted && remoteUsers && remoteUsers.length > 0) {
        syncUsersFromRemote(remoteUsers);
        setRegisteredUsers(getAllUsers());
      }
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  // Keep officerName synced when officerOptions updates from Firestore if not custom
  useEffect(() => {
    if (!isCustomOfficerInput && officerOptions.length > 0 && !officerOptions.includes(officerName)) {
      setOfficerName(officerOptions[0]);
    }
  }, [officerOptions, isCustomOfficerInput]);
  const [actionNote, setActionNote] = useState<string>('');
  const [issueReason, setIssueReason] = useState<string>(ISSUE_REASON_PRESETS[0]);
  const [receiptBookNo, setReceiptBookNo] = useState<string>('01');
  const [receiptNo, setReceiptNo] = useState<string>('');
  const [receiptAmount, setReceiptAmount] = useState<string>('250');
  const [evidencePhoto, setEvidencePhoto] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [lastUpdatedResult, setLastUpdatedResult] = useState<{
    actionState: 'accepted_en_route' | 'completed' | 'issue_blocked';
    message: string;
    attachment?: any;
  } | null>(null);

  // Locate target job in petitions or loans
  const matchedJob = useMemo(() => {
    const cleanCode = (selectedCode || '').trim().toLowerCase();
    if (cleanCode) {
      const foundPetition = petitions.find(
        (p: any) =>
          (p.id || '').toLowerCase() === cleanCode ||
          (p.trackingCode || '').toLowerCase() === cleanCode ||
          (p.caseNo || '').toLowerCase() === cleanCode
      );
      if (foundPetition) {
        return { jobType: 'petition' as const, petition: foundPetition, loan: undefined };
      }

      const foundLoan = loans.find(
        (l: any) =>
          (l.id || '').toLowerCase() === cleanCode ||
          (l.loanCode || '').toLowerCase() === cleanCode ||
          (l.contractNumber || '').toLowerCase() === cleanCode ||
          (l.docNo || '').toLowerCase() === cleanCode
      );
      if (foundLoan) {
        return { jobType: 'loan' as const, petition: undefined, loan: foundLoan };
      }
    }

    // Check if this is an LTC Delivery Queue Job (e.g. LTC-2569-R1-Q5)
    if (cleanCode.startsWith('ltc')) {
      const savedLtc = getStoredLatestLtcQueueJob();
      const fallbackLtc: LtcDeliveryQueueNotifyInput = savedLtc || {
        referenceCode: selectedCode || 'LTC-2569-R1-Q5',
        fiscalYear: '2569',
        roundKey: '1',
        roundLabel: 'วงรอบที่ 1 (ต.ค. – มี.ค.)',
        mooFilterLabel: 'ทุกหมู่บ้าน (ม.1 – ม.7)',
        originName: 'เทศบาลตำบลบางเป้า',
        originLat: 7.429625,
        originLng: 99.52522,
        multiStopGoogleMapsUrl:
          'https://www.google.com/maps/dir/?api=1&origin=7.429625,99.52522&destination=7.4342,99.5198&waypoints=7.4258,99.5381|7.4281,99.5245|7.4265,99.5392|7.4335,99.5205&travelmode=driving',
        totalSupplySummary: [
          { itemName: 'นมผงสุขภาพ', totalQty: 8, unit: 'กระป๋อง' },
          { itemName: 'ผ้าอ้อมผู้ใหญ่ (M)', totalQty: 690, unit: 'ชิ้น' },
          { itemName: 'ผ้าอ้อมผู้ใหญ่ (L)', totalQty: 310, unit: 'ชิ้น' },
        ],
        stops: [
          {
            queueOrder: 1,
            stopId: 'STOP-01',
            patientId: 'LTC-01',
            patientName: 'นายสุนทร ซาพิมพ์',
            adlCategory: 'ติดบ้าน',
            moo: '4',
            village: 'บ้านแหลมม่วง',
            address: '69 หมู่ที่ 4 บ้านแหลมม่วง',
            phone: '081-234-5678',
            itemsText: 'รอบที่ 1: นมผงสุขภาพ (3 กระป๋อง)',
            itemsList: [{ itemName: 'นมผงสุขภาพ', quantity: 3, unit: 'กระป๋อง' }],
            lat: 7.4258,
            lng: 99.5381,
            individualMapsUrl: 'https://www.google.com/maps/dir/?api=1&destination=7.4258,99.5381',
          },
          {
            queueOrder: 2,
            stopId: 'STOP-02',
            patientId: 'LTC-02',
            patientName: 'นายเรียบ ทองหมึก',
            adlCategory: 'ติดเตียง',
            moo: '1',
            village: 'บ้านชายวัด',
            address: '63 หมู่ที่ 1 บ้านชายวัด',
            phone: '089-876-5432',
            itemsText: 'รอบที่ 1: ผ้าอ้อมผู้ใหญ่ (M) (390 ชิ้น)',
            itemsList: [{ itemName: 'ผ้าอ้อมผู้ใหญ่ (M)', quantity: 390, unit: 'ชิ้น' }],
            lat: 7.4281,
            lng: 99.5245,
            individualMapsUrl: 'https://www.google.com/maps/dir/?api=1&destination=7.4281,99.5245',
          },
        ],
      };
      return {
        jobType: 'ltc_queue' as const,
        petition: undefined,
        loan: undefined,
        ltcQueue: fallbackLtc,
      };
    }

    // Fallback if test code from notification test button was clicked
    if (cleanCode.startsWith('swg') || cleanCode.startsWith('req')) {
      const samplePet: PublicPetition = {
        id: selectedCode || 'SWG-2569-042',
        trackingCode: selectedCode || 'SWG-2569-042',
        title: cleanCode.startsWith('swg') ? 'คำร้องขอดูดสิ่งปฏิกูล / ส้วมเต็ม' : 'คำร้องทั่วไป / เหตุรำคาญ',
        category: cleanCode.startsWith('swg') ? 'waste_sewage' : 'nuisance_smell',
        citizenName: cleanCode.startsWith('swg') ? 'นางสาวมาลี ศรีตรัง' : 'นายสมชาย รักบางเป้า',
        phone: '089-876-5432',
        moo: '1',
        address: 'บ้านเลขที่ 112 หมู่ที่ 1 บ้านชายวัด ต.บางเป้า อ.กันตัง จ.ตรัง',
        description: 'ขอรับบริการรถดูดสิ่งปฏิกูลของเทศบาลตำบลบางเป้า เนื่องจากบ่อเกรอะเต็ม',
        status: 'pending',
        assignedOfficer: OFFICER_PRESETS[0],
        submissionDate: new Date().toISOString().slice(0, 10),
        latitude: 7.429578,
        longitude: 99.525737,
      };
      return { jobType: 'petition' as const, petition: samplePet, loan: undefined };
    }

    if (cleanCode.startsWith('med') || cleanCode.startsWith('tr_') || cleanCode.startsWith('ln-')) {
      const sampleLoan: EquipmentLoan = {
        id: selectedCode || 'MED-2569-108',
        loanCode: selectedCode || 'MED-2569-108',
        equipmentId: 'EQ-BED-001',
        equipmentName: 'เตียงผู้ป่วยปรับระดับ 2 ไกร์ พร้อมเบาะรองนอน',
        patientName: 'นายบุญมี สุขใจ',
        patientDiagnosis: 'พักฟื้นติดบ้าน / ผู้ป่วยติดเตียง',
        borrowerName: 'นางสุดา สุขใจ',
        phone: '086-555-9988',
        borrowerPhone: '086-555-9988',
        moo: '2',
        address: 'บ้านเลขที่ 89 หมู่ที่ 2 บ้านเกาะปอม ต.บางเป้า อ.กันตัง จ.ตรัง',
        loanDate: new Date().toISOString().slice(0, 10),
        dueDate: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
        status: 'pending',
        officerInCharge: OFFICER_PRESETS[3],
        notes: '',
        latitude: 7.421512,
        longitude: 99.529104,
      };
      return { jobType: 'loan' as const, petition: undefined, loan: sampleLoan };
    }

    // Default to newest petition or loan if none specified
    if (petitions.length > 0) {
      return { jobType: 'petition' as const, petition: petitions[0], loan: undefined };
    }
    if (loans.length > 0) {
      return { jobType: 'loan' as const, petition: undefined, loan: loans[0] };
    }
    return null;
  }, [selectedCode, petitions, loans]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          setEvidencePhoto(canvas.toDataURL('image/jpeg', 0.8));
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  if (!matchedJob) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 max-w-md w-full text-center space-y-4 shadow-xl">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
          <h3 className="text-lg font-extrabold text-slate-900">ไม่พบข้อมูลใบงานรหัส {selectedCode}</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-emerald-700 text-white font-bold cursor-pointer"
          >
            กลับสู่หน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  const isLtcQueue = matchedJob.jobType === 'ltc_queue';
  const isLoan = matchedJob.jobType === 'loan';
  const pet = matchedJob.petition;
  const ln = matchedJob.loan;
  const ltcQ = (matchedJob as any).ltcQueue as LtcDeliveryQueueNotifyInput | undefined;

  const isSewage =
    !isLoan &&
    !isLtcQueue &&
    (pet?.category === 'waste_sewage' ||
      pet?.form?.formType === 'sewage' ||
      (pet?.title || '').includes('สิ่งปฏิกูล') ||
      (pet?.title || '').includes('ส้วม'));

  const refCode = isLtcQueue
    ? ltcQ?.referenceCode || selectedCode || 'LTC-2569-R1'
    : isLoan
    ? ln?.loanCode || ln?.id || 'MED-NEW'
    : pet?.trackingCode || pet?.id || 'REQ-NEW';

  const requesterName = isLtcQueue
    ? `คิวส่งมอบพัสดุ LTC ครบ ${ltcQ?.stops.length || 0} หลังคาเรือน (${ltcQ?.roundLabel || ''})`
    : isLoan
    ? `${ln?.patientName} (ผู้ติดต่อ: ${ln?.borrowerName || '-'})`
    : pet?.citizenName || '-';

  const phone = isLtcQueue
    ? ltcQ?.stops[0]?.phone || ''
    : isLoan
    ? ln?.borrowerPhone || ln?.phone || ''
    : pet?.phone || '';
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const addressText = isLtcQueue
    ? `เริ่มจาก ${ltcQ?.originName || 'ทต.บางเป้า'} ➔ ส่งมอบตามคิว #1 ถึง #${ltcQ?.stops.length || 0}`
    : isLoan
    ? ln?.address || '-'
    : pet?.address || '-';
  const mooText = isLtcQueue
    ? ltcQ?.mooFilterLabel || 'ทุกหมู่บ้าน (ม.1 – ม.7)'
    : isLoan
    ? ln?.moo
      ? `หมู่ที่ ${ln.moo}`
      : 'ต.บางเป้า'
    : pet?.moo
    ? `หมู่ที่ ${pet.moo}`
    : 'ต.บางเป้า';

  const jobTitle = isLtcQueue
    ? `แผนจัดส่งพัสดุ สปสช. & LTC (ปี ${ltcQ?.fiscalYear || '2569'} • ${ltcQ?.roundLabel || ''})`
    : isLoan
    ? `นำส่งอุปกรณ์: ${ln?.itemsSummary || ln?.equipmentName}`
    : pet?.title || 'คำร้องบริการประชาชน';

  const jobDetail = isLtcQueue
    ? `สรุปยอดพัสดุรวม: ${
        ltcQ?.totalSupplySummary
          .map((s) => `${s.itemName} ${s.totalQty.toLocaleString()} ${s.unit}`)
          .join(' • ') || '-'
      }`
    : isLoan
    ? `อาการผู้ป่วย: ${ln?.patientDiagnosis || '-'} ${ln?.notes ? `• ${ln.notes}` : ''}`
    : pet?.description || '-';

  const lat = isLtcQueue ? ltcQ?.stops[0]?.lat : isLoan ? ln?.latitude : pet?.latitude;
  const lng = isLtcQueue ? ltcQ?.stops[0]?.lng : isLoan ? ln?.longitude : pet?.longitude;
  const googleMapsUrl = isLtcQueue
    ? ltcQ?.multiStopGoogleMapsUrl ||
      `https://www.google.com/maps/search/?api=1&query=7.429625,99.52522`
    : typeof lat === 'number' && typeof lng === 'number'
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressText + ' ตำบลบางเป้า กันตัง ตรัง')}`;

  const currentStatus = isLtcQueue ? 'assigned' : isLoan ? ln?.status : pet?.status;

  const getCurrentStageNumber = () => {
    if (lastUpdatedResult?.actionState === 'completed') return 3;
    if (
      currentStatus === 'resolved' ||
      currentStatus === 'borrowed' ||
      currentStatus === 'returned'
    ) {
      return 3;
    }
    if (
      currentStatus === 'assigned' ||
      currentStatus === 'investigating' ||
      currentStatus === 'accepted' ||
      currentStatus === 'approved'
    ) {
      return 2;
    }
    return 1;
  };

  const stageNum = getCurrentStageNumber();

  const handleSubmitStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let finalNote = actionNote.trim();
      if (activeActionTab === 'accepted_en_route') {
        finalNote =
          finalNote ||
          (isLtcQueue
            ? `รับคิวจัดส่งพัสดุ LTC ทั้ง ${ltcQ?.stops.length || 0} จุดแล้ว กำลังออกเดินทางส่งมอบตามลำดับคิว โดย ${officerName}`
            : `รับออเดอร์งานแล้ว กำลังเดินทางไปพื้นที่หน้างาน โดย ${officerName}`);
      } else if (activeActionTab === 'completed') {
        const receiptInfo =
          isSewage && receiptNo
            ? ` (ใบเสร็จเล่มที่ ${receiptBookNo} เลขที่ ${receiptNo} จำนวน ${receiptAmount} บาท)`
            : '';
        finalNote =
          finalNote ||
          (isLtcQueue
            ? `ดำเนินการส่งมอบพัสดุดูแลผู้มีภาวะพึ่งพิง (LTC) ครบทั้ง ${ltcQ?.stops.length || 0} คิวเรียบร้อยแล้ว โดย ${officerName}`
            : isLoan
            ? `ส่งมอบและติดตั้งอุปกรณ์การแพทย์ให้ผู้ป่วยเรียบร้อยแล้ว โดย ${officerName}`
            : isSewage
            ? `ดำเนินการสูบสิ่งปฏิกูลหน้างานเรียบร้อยแล้ว${receiptInfo} โดย ${officerName}`
            : `ลงพื้นที่ตรวจสอบและดำเนินการแก้ไขเรียบร้อยแล้ว โดย ${officerName}`);
      } else if (activeActionTab === 'issue_blocked') {
        finalNote = `[ติดขัดปัญหาหน้างาน: ${issueReason}] ${finalNote || 'ไม่สามารถดำเนินการให้แล้วเสร็จได้ รอประสานงานแก้ไข'}`;
      }

      if (isLtcQueue && ltcQ) {
        const notifyPayload = buildFieldJobStatusUpdateNotificationPayload({
          jobType: 'ltc_queue',
          actionState: activeActionTab,
          officerName,
          actionNote: finalNote,
          issueReason: activeActionTab === 'issue_blocked' ? issueReason : undefined,
          ltcQueue: ltcQ,
          signers: signerSettings,
        });
        await dispatchNotification(notifyPayload, undefined, gasUrl);
        setLastUpdatedResult({
          actionState: activeActionTab,
          message: finalNote,
          attachment: notifyPayload.attachments?.[0],
        });
      } else if (isLoan && ln) {
        const nextLoanStatus: EquipmentLoan['status'] =
          activeActionTab === 'completed'
            ? 'borrowed'
            : activeActionTab === 'accepted_en_route'
            ? 'approved'
            : 'pending';

        const updatedLoan: EquipmentLoan = {
          ...ln,
          status: nextLoanStatus,
          deliveryStaff: officerName,
          officerInCharge: officerName,
          deliveryDate:
            activeActionTab === 'completed'
              ? new Date().toISOString().slice(0, 10)
              : ln.deliveryDate,
          notes: finalNote,
        };
        onUpdateLoan(updatedLoan);

        const notifyPayload = buildFieldJobStatusUpdateNotificationPayload({
          jobType: 'loan',
          actionState: activeActionTab,
          officerName,
          actionNote: finalNote,
          issueReason: activeActionTab === 'issue_blocked' ? issueReason : undefined,
          loan: updatedLoan,
          signers: signerSettings,
        });
        await dispatchNotification(notifyPayload, undefined, gasUrl);
        setLastUpdatedResult({
          actionState: activeActionTab,
          message: finalNote,
          attachment: notifyPayload.attachments?.[0],
        });
      } else if (pet) {
        const nextPetStatus: PublicPetition['status'] =
          activeActionTab === 'completed'
            ? 'resolved'
            : activeActionTab === 'accepted_en_route'
            ? 'assigned'
            : 'investigating';

        const updatedForm = {
          ...(pet.form || {
            formType: isSewage ? ('sewage' as const) : ('general' as const),
            filedDate: pet.submissionDate || new Date().toISOString().slice(0, 10),
            applicantAddress: {
              houseNo: '',
              soi: '',
              road: '',
              moo: pet.moo || '1',
              subdistrict: 'บางเป้า',
              district: 'กันตัง',
              province: 'ตรัง',
            },
          }),
          operation: {
            done: activeActionTab === 'completed',
            doneDate: new Date().toISOString().slice(0, 10),
            byName: officerName.replace(/\s*\(.*\)/, ''),
            byPosition: 'เจ้าหน้าที่ผู้ปฏิบัติงาน',
            pendingReason:
              activeActionTab === 'issue_blocked'
                ? `${issueReason} ${actionNote ? `(${actionNote})` : ''}`
                : undefined,
          },
          ...(isSewage && activeActionTab === 'completed' && receiptNo
            ? {
                feeReceipt: {
                  paidAmount: Number(receiptAmount) || 250,
                  bookNo: receiptBookNo,
                  receiptNo,
                  receiptDate: new Date().toISOString().slice(0, 10),
                  collector: officerName,
                },
              }
            : {}),
        };

        const updatedPetition: PublicPetition = {
          ...pet,
          status: nextPetStatus,
          assignedOfficer: officerName,
          resolutionNotes: finalNote,
          resolvedDate:
            activeActionTab === 'completed'
              ? new Date().toISOString().slice(0, 10)
              : pet.resolvedDate,
          form: updatedForm,
        };
        onUpdatePetition(updatedPetition);

        const notifyPayload = buildFieldJobStatusUpdateNotificationPayload({
          jobType: 'petition',
          actionState: activeActionTab,
          officerName,
          actionNote: finalNote,
          issueReason: activeActionTab === 'issue_blocked' ? issueReason : undefined,
          petition: updatedPetition,
          signers: signerSettings,
        });
        await dispatchNotification(notifyPayload, undefined, gasUrl);
        setLastUpdatedResult({
          actionState: activeActionTab,
          message: finalNote,
          attachment: notifyPayload.attachments?.[0],
        });
      }

      if (onShowToast) {
        onShowToast(
          'success',
          activeActionTab === 'completed'
            ? `✅ บันทึกปิดจบงาน ${refCode} และส่งแจ้งเตือนเข้ากลุ่ม LINE & อีเมลเรียบร้อยแล้ว!`
            : activeActionTab === 'issue_blocked'
            ? `⚠️ รายงานปัญหาหน้างาน ${refCode} เข้ากลุ่ม LINE & อีเมลเรียบร้อยแล้ว!`
            : `🚚 ยืนยันรับงาน ${refCode} และแจ้งเข้ากลุ่ม LINE เรียบร้อยแล้ว!`
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900/95 text-slate-900 py-4 px-3 sm:px-6 flex flex-col items-center justify-start">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Top Banner */}
        <div
          className={`p-5 sm:p-6 text-white ${
            isLoan
              ? 'bg-gradient-to-r from-emerald-800 to-teal-900'
              : isSewage
              ? 'bg-gradient-to-r from-blue-800 to-indigo-900'
              : 'bg-gradient-to-r from-amber-700 to-orange-800'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-extrabold tracking-wide">
              {isLoan
                ? '🛏️ ใบสั่งงานนำส่งอุปกรณ์การแพทย์'
                : isSewage
                ? '🚛 ใบสั่งงานรถดูดสิ่งปฏิกูล'
                : '📢 ใบสั่งงานตรวจสอบคำร้อง/เหตุรำคาญ'}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-black/25 hover:bg-black/40 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>กลับระบบหลัก</span>
            </button>
          </div>

          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <h1 className="text-xl sm:text-2xl font-black leading-tight">{jobTitle}</h1>
            <span className="font-mono text-sm font-extrabold bg-black/25 px-3 py-1 rounded-xl">
              {refCode}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-white/90 mt-1">
            ระบบติดตามสถานะและรายงานผลการปฏิบัติงานภาคสนาม • กองสาธารณสุขและสิ่งแวดล้อม ทต.บางเป้า
          </p>

          {/* Job Switcher so officer can switch between active jobs easily */}
          <div className="mt-4 pt-3 border-t border-white/20 flex items-center gap-2">
            <span className="text-xs font-bold text-white/90 shrink-0">เปลี่ยนใบงาน:</span>
            <select
              value={selectedCode}
              onChange={(e) => {
                setSelectedCode(e.target.value);
                setLastUpdatedResult(null);
              }}
              className="flex-1 bg-white/15 hover:bg-white/25 text-white border border-white/30 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none cursor-pointer"
            >
              <option value={refCode} className="text-slate-900">
                📌 ใบงานปัจจุบัน: {refCode} ({requesterName})
              </option>
              <optgroup label="🚛 คำร้องสูบสิ่งปฏิกูล & เหตุรำคาญล่าสุด" className="text-slate-900">
                {petitions.slice(0, 10).map((p) => (
                  <option key={p.id} value={p.trackingCode || p.id} className="text-slate-900">
                    [{p.trackingCode || p.id}] {p.title} - {p.citizenName}
                  </option>
                ))}
              </optgroup>
              <optgroup label="🛏️ คำขอยืมอุปกรณ์การแพทย์ล่าสุด" className="text-slate-900">
                {loans.slice(0, 10).map((l) => (
                  <option key={l.id} value={l.loanCode || l.id} className="text-slate-900">
                    [{l.loanCode || l.id}] {l.equipmentName} - ผู้ป่วย {l.patientName}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        {/* 3-Step Visual Progress Stepper */}
        <div className="bg-slate-50 px-5 py-4 border-b border-slate-200">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div
              className={`p-2.5 rounded-2xl border text-xs font-extrabold ${
                stageNum >= 1
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-white border-slate-200 text-slate-400'
              }`}
            >
              <div>1. รับออเดอร์งาน</div>
              <div className="text-[11px] font-normal mt-0.5">ยื่นคำขอเข้าระบบแล้ว</div>
            </div>

            <div
              className={`p-2.5 rounded-2xl border text-xs font-extrabold ${
                stageNum >= 2
                  ? 'bg-blue-50 border-blue-300 text-blue-900'
                  : 'bg-white border-slate-200 text-slate-400'
              }`}
            >
              <div>2. ออกหน้างาน</div>
              <div className="text-[11px] font-normal mt-0.5">เจ้าหน้าที่รับงาน/เดินทาง</div>
            </div>

            <div
              className={`p-2.5 rounded-2xl border text-xs font-extrabold ${
                lastUpdatedResult?.actionState === 'issue_blocked' ||
                (pet?.resolutionNotes || ln?.notes || '').includes('ติดขัด')
                  ? 'bg-rose-50 border-rose-400 text-rose-900'
                  : stageNum >= 3
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-900'
                  : 'bg-white border-slate-200 text-slate-400'
              }`}
            >
              <div>3. ผลปฏิบัติงาน</div>
              <div className="text-[11px] font-normal mt-0.5">
                {lastUpdatedResult?.actionState === 'issue_blocked' ||
                (pet?.resolutionNotes || ln?.notes || '').includes('ติดขัด')
                  ? '⚠️ ติดขัดปัญหาหน้างาน'
                  : stageNum >= 3
                  ? '✅ ปิดจบงานสำเร็จ'
                  : 'รอสรุปผลหน้างาน'}
              </div>
            </div>
          </div>
        </div>

        {/* Main Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Success / Updated Banner if just submitted */}
          {lastUpdatedResult && (
            <div
              className={`p-4 rounded-2xl border-2 space-y-2 ${
                lastUpdatedResult.actionState === 'completed'
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                  : lastUpdatedResult.actionState === 'issue_blocked'
                  ? 'bg-rose-50 border-rose-400 text-rose-950'
                  : 'bg-blue-50 border-blue-400 text-blue-950'
              }`}
            >
              <div className="font-black text-base flex items-center gap-2">
                {lastUpdatedResult.actionState === 'completed' ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>✅ บันทึกปิดจบงานสำเร็จ & แจ้งเข้ากลุ่ม LINE เรียบร้อยแล้ว!</span>
                  </>
                ) : lastUpdatedResult.actionState === 'issue_blocked' ? (
                  <>
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>⚠️ บันทึกรายงานปัญหาติดขัด & แจ้งเข้ากลุ่ม LINE เรียบร้อยแล้ว!</span>
                  </>
                ) : (
                  <>
                    <Truck className="w-5 h-5 text-blue-600 shrink-0" />
                    <span>🚚 ยืนยันรับงานแล้ว & แจ้งเข้ากลุ่ม LINE เรียบร้อยแล้ว!</span>
                  </>
                )}
              </div>
              <p className="text-xs sm:text-sm font-medium">{lastUpdatedResult.message}</p>

              {lastUpdatedResult.attachment && (
                <div className="pt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openAttachmentPrintableHtml(lastUpdatedResult.attachment)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>เปิดดู/พิมพ์แบบฟอร์ม A4 ที่อัปเดตผลแล้ว</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadAttachmentDocx(lastUpdatedResult.attachment)}
                    className="px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>ดาวน์โหลด Word (.DOCX)</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Customer & GPS Navigation Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs font-bold text-slate-500">ผู้ขอรับบริการ / ผู้ป่วย</div>
                <div className="font-extrabold text-slate-900 text-base">{requesterName}</div>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500">เบอร์โทรศัพท์ติดต่อ</div>
                <div className="font-extrabold text-emerald-700 text-base">{phone || '-'}</div>
              </div>
              <div className="sm:col-span-2">
                <div className="text-xs font-bold text-slate-500">สถานที่ / บ้านเลขที่ / หมู่บ้าน</div>
                <div className="font-bold text-slate-800">
                  {mooText} • {addressText}
                </div>
              </div>
              <div className="sm:col-span-2">
                <div className="text-xs font-bold text-slate-500">รายละเอียดงาน</div>
                <div className="text-slate-700 font-medium">{jobDetail}</div>
              </div>
            </div>

              {/* Direct Navigation & Call Buttons for Field Officer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <Navigation className="w-4 h-4" />
                <span>
                  {isLtcQueue
                    ? `🗺️ นำทาง Google Maps ครบทุกคน (${ltcQ?.stops.length || 0} คิว)`
                    : '📍 เปิด Google Maps นำทางไปหน้างาน'}
                </span>
              </a>

              {cleanPhone.length >= 9 && (
                <a
                  href={`tel:${cleanPhone}`}
                  className="py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md transition-all"
                >
                  <Phone className="w-4 h-4" />
                  <span>📞 โทรหาผู้ขอ ({phone})</span>
                </a>
              )}
            </div>

            {/* If LTC Queue Job: Show Complete Ordered Queue List with Individual Navigation */}
            {isLtcQueue && ltcQ && ltcQ.stops.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                <div className="text-xs font-extrabold text-teal-900">
                  📋 รายชื่อผู้รับมอบพัสดุ LTC เรียงตามคิว (ครบทั้ง {ltcQ.stops.length} ราย):
                </div>
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {ltcQ.stops.map((st, idx) => {
                    const qNum = st.queueOrder || (st as any).queueNumber || idx + 1;
                    const itemsDesc = st.itemsText || (st as any).itemsSummary || 'ชุดดูแลผู้มีภาวะพึ่งพิง (LTC)';
                    const mapLink =
                      st.individualMapsUrl ||
                      (st as any).googleMapsUrl ||
                      `https://www.google.com/maps/dir/?api=1&destination=${st.lat},${st.lng}`;
                    return (
                      <div
                        key={st.stopId || idx}
                        className="p-3 rounded-xl bg-white border border-slate-200 flex items-start justify-between gap-2.5 text-xs shadow-2xs"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="font-black text-slate-900 text-sm">
                            คิวที่ #{qNum}: {st.patientName}{' '}
                            <span className="text-xs font-extrabold text-rose-700">
                              ({st.adlCategory || 'ติดเตียง'})
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-700 font-medium">
                            🏠 <strong>ที่ไหน:</strong> บ้านเลขที่ {st.address} (หมู่ที่ {st.moo} {st.village} ต.บางเป้า)
                          </div>
                          <div className="text-[11px] font-extrabold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200 inline-block">
                            📦 รับอะไร: {itemsDesc}
                          </div>
                          <div className="text-[11px] text-slate-600 font-semibold">
                            📞 <strong>ติดต่อ:</strong> {st.phone || '-'}{' '}
                            {st.caregiverName ? `(${st.caregiverName})` : ''} • 📍 พิกัด: {Number(st.lat).toFixed(5)},{' '}
                            {Number(st.lng).toFixed(5)}
                          </div>
                        </div>
                        <a
                          href={mapLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[11px] shrink-0 shadow-xs"
                        >
                          🚗 นำทาง #{qNum}
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Field Officer Action Selector (3 Big Buttons) */}
          <form onSubmit={handleSubmitStatusUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-extrabold text-slate-900 mb-2">
                👷 เลือกสถานะการปฏิบัติงานหน้างาน (จะแจ้งเตือนเข้ากลุ่ม LINE & อัปเดตระบบทันที):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setActiveActionTab('accepted_en_route')}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    activeActionTab === 'accepted_en_route'
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-[1.01]'
                      : 'bg-white border-slate-200 text-slate-800 hover:border-blue-300'
                  }`}
                >
                  <div className="font-black text-sm flex items-center gap-1.5">
                    <Truck className="w-4 h-4 shrink-0" />
                    <span>1. รับงาน / ออกเดินทาง</span>
                  </div>
                  <div
                    className={`text-xs mt-1 ${
                      activeActionTab === 'accepted_en_route' ? 'text-blue-100' : 'text-slate-500'
                    }`}
                  >
                    รับออเดอร์แล้ว กำลังไปหน้างาน
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveActionTab('completed')}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    activeActionTab === 'completed'
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg scale-[1.01]'
                      : 'bg-white border-slate-200 text-slate-800 hover:border-emerald-300'
                  }`}
                >
                  <div className="font-black text-sm flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>2. สำเร็จ / ปิดจบงาน</span>
                  </div>
                  <div
                    className={`text-xs mt-1 ${
                      activeActionTab === 'completed' ? 'text-emerald-100' : 'text-slate-500'
                    }`}
                  >
                    ดำเนินการหน้างานเรียบร้อยแล้ว
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveActionTab('issue_blocked')}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    activeActionTab === 'issue_blocked'
                      ? 'bg-rose-600 border-rose-600 text-white shadow-lg scale-[1.01]'
                      : 'bg-white border-slate-200 text-slate-800 hover:border-rose-300'
                  }`}
                >
                  <div className="font-black text-sm flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>3. ไม่สำเร็จ / ติดขัด</span>
                  </div>
                  <div
                    className={`text-xs mt-1 ${
                      activeActionTab === 'issue_blocked' ? 'text-rose-100' : 'text-slate-500'
                    }`}
                  >
                    แจ้งปัญหาหน้างานให้ทีมทราบ
                  </div>
                </button>
              </div>
            </div>

            {/* Officer Name Selector (Synced with ระบบลงทะเบียนใช้งานและจัดการสิทธิ์เจ้าหน้าที่) */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  ชื่อเจ้าหน้าที่ผู้รับงาน / ผู้รายงานผลหน้างาน *
                </label>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  ซิงค์รายชื่อจริงจากระบบจัดการสิทธิ์เจ้าหน้าที่ ({officerOptions.length} ท่าน)
                </span>
              </div>
              <select
                value={isCustomOfficerInput ? '__CUSTOM__' : officerName}
                onChange={(e) => {
                  if (e.target.value === '__CUSTOM__') {
                    setIsCustomOfficerInput(true);
                    setOfficerName('');
                  } else {
                    setIsCustomOfficerInput(false);
                    setOfficerName(e.target.value);
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 bg-white focus:ring-2 focus:ring-emerald-600"
              >
                {officerOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
                <option value="__CUSTOM__">✏️ พิมพ์ระบุชื่อเจ้าหน้าที่หรือทีมงานเอง...</option>
              </select>
              {isCustomOfficerInput && (
                <input
                  type="text"
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                  placeholder="พิมพ์ชื่อ-นามสกุล และตำแหน่งเจ้าหน้าที่ผู้ปฏิบัติงาน..."
                  className="mt-2 w-full px-3.5 py-2 rounded-xl border border-emerald-400 text-sm font-bold text-slate-900 bg-emerald-50/30 focus:ring-2 focus:ring-emerald-600"
                />
              )}
            </div>

            {/* Specific Fields for 'issue_blocked' */}
            {activeActionTab === 'issue_blocked' && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-3">
                <label className="block text-xs font-extrabold text-rose-900">
                  ⚠️ เลือกสาเหตุที่ติดขัด / ไม่สามารถดำเนินการได้สำเร็จ:
                </label>
                <div className="grid grid-cols-1 gap-1.5">
                  {ISSUE_REASON_PRESETS.map((reason) => (
                    <label
                      key={reason}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-bold cursor-pointer ${
                        issueReason === reason
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-white text-slate-800 border-rose-200 hover:bg-rose-100/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="issueReason"
                        checked={issueReason === reason}
                        onChange={() => setIssueReason(reason)}
                        className="w-4 h-4"
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Specific Quick Notes & Receipt Fields for 'completed' */}
            {activeActionTab === 'completed' && (
              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-3">
                <div className="text-xs font-extrabold text-emerald-950">
                  💡 กดเลือกข้อความสรุปผลด่วน (หรือพิมพ์เพิ่มเติมด้านล่าง):
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(isLoan
                    ? [
                        'ส่งมอบและติดตั้งอุปกรณ์การแพทย์ให้ผู้ป่วยเรียบร้อยแล้ว',
                        'ผู้ยืมตรวจรับอุปกรณ์และลงนามในสัญญา 2 หน้าเรียบร้อยแล้ว',
                      ]
                    : isSewage
                    ? [
                        'สูบสิ่งปฏิกูลหน้างานเรียบร้อยแล้ว (1 เที่ยว)',
                        'สูบสิ่งปฏิกูลและชำระค่าธรรมเนียมเรียบร้อยแล้ว',
                      ]
                    : [
                        'ลงพื้นที่ตรวจสอบและแก้ไขปัญหาเหตุรำคาญเรียบร้อยแล้ว',
                        'ประสานผู้ร้องเรียนและดำเนินการแก้ไขเสร็จสิ้น',
                      ]
                  ).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setActionNote(preset)}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-600 hover:text-white text-emerald-900 border border-emerald-300 text-xs font-bold transition-colors cursor-pointer"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>

                {isSewage && (
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-200/80">
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-900 mb-0.5">
                        ใบเสร็จเล่มที่
                      </label>
                      <input
                        type="text"
                        value={receiptBookNo}
                        onChange={(e) => setReceiptBookNo(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-emerald-300 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-900 mb-0.5">
                        เลขที่ใบเสร็จ
                      </label>
                      <input
                        type="text"
                        value={receiptNo}
                        onChange={(e) => setReceiptNo(e.target.value)}
                        placeholder="เช่น 045"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-emerald-300 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-900 mb-0.5">
                        ค่าธรรมเนียม (บาท)
                      </label>
                      <input
                        type="text"
                        value={receiptAmount}
                        onChange={(e) => setReceiptAmount(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-emerald-300 text-xs font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Additional Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                รายละเอียดผลการปฏิบัติงาน / หมายเหตุหน้างานเพิ่มเติม
              </label>
              <textarea
                rows={2}
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder={
                  activeActionTab === 'issue_blocked'
                    ? 'ระบุปัญหาที่พบหน้างาน เช่น รถเข้าซอยไม่ได้ ต้องใช้สายต่อเพิ่ม หรือวันนัดหมายใหม่...'
                    : 'ระบุรายละเอียดเพิ่มเติม (ถ้ามี)...'
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            {/* Optional Photo Attachment from Mobile Camera */}
            <div>
              <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold cursor-pointer">
                <Camera className="w-4 h-4 text-emerald-700" />
                <span>📷 ถ่ายรูปหน้างาน / แนบรูปหลักฐาน (ถ้ามี)</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
              {evidencePhoto && (
                <div className="mt-2 relative inline-block">
                  <img
                    src={evidencePhoto}
                    alt="รูปถ่ายหน้างาน"
                    className="h-28 rounded-xl border border-slate-300 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setEvidencePhoto('')}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-600 text-white text-xs font-bold flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-4 rounded-2xl text-white font-black text-base shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all ${
                activeActionTab === 'completed'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : activeActionTab === 'issue_blocked'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <Send className="w-5 h-5" />
              <span>
                {isSubmitting
                  ? 'กำลังบันทึกและส่งแจ้งเตือนเข้ากลุ่ม LINE...'
                  : activeActionTab === 'completed'
                  ? '✅ ยืนยันปิดจบงานสำเร็จ & แจ้งเข้ากลุ่ม LINE'
                  : activeActionTab === 'issue_blocked'
                  ? '⚠️ ยืนยันรายงานปัญหาติดขัด & แจ้งเข้ากลุ่ม LINE ด่วน'
                  : '🚚 ยืนยันรับงาน / ออกเดินทาง & แจ้งเข้ากลุ่ม LINE'}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
