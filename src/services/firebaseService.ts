import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  query,
} from 'firebase/firestore';
import { db } from './firebase.ts';
import {
  Establishment,
  HazardousBusiness,
  InspectionRecord,
  LicenseRecord,
  LtcPatient,
  MedicalEquipment,
  EquipmentLoan,
  NhsoProject,
  PublicPetition,
  SignerSettings,
  DEFAULT_SIGNER_SETTINGS,
  User,
} from '../types/index.ts';
import { INITIAL_USERS } from './authService.ts';
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
} from '../data/mockData.ts';

export const COLLECTIONS = {
  LICENSES: 'licenses',
  ESTABLISHMENTS: 'establishments',
  INSPECTIONS: 'inspections',
  HAZARDOUS: 'hazardous_businesses',
  PETITIONS: 'petitions',
  NHSO: 'nhso_projects',
  LTC: 'ltc_patients',
  EQUIPMENT: 'medical_equipment',
  LOANS: 'equipment_loans',
  SETTINGS: 'system_settings',
  USERS: 'users',
  CALENDAR_EVENTS: 'calendar_events',
  LTC_QUEUES: 'ltc_delivery_queues',
} as const;

/**
 * Generic listener for real-time Firestore updates
 */
export function subscribeCollection<T extends { id: string }>(
  collectionName: string,
  onData: (items: T[]) => void,
  onError?: (err: Error) => void
): () => void {
  try {
    const q = query(collection(db, collectionName));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: T[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        onData(items);
      },
      (error) => {
        console.warn(`Firestore subscription warning on [${collectionName}]:`, error);
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (err: any) {
    console.error(`Failed to setup subscription for [${collectionName}]:`, err);
    return () => {};
  }
}

/**
 * Save or update single document in Firestore
 */
export async function saveToFirestore<T extends { id?: string }>(
  collectionName: string,
  data: T,
  customId?: string
): Promise<string> {
  const docId = customId || data.id || `${Date.now()}`;
  const docRef = doc(db, collectionName, docId);
  const payload = { ...data, id: docId, updatedAt: new Date().toISOString() };
  await setDoc(docRef, payload, { merge: true });
  return docId;
}

/**
 * Delete a document from Firestore
 */
export async function deleteFromFirestore(collectionName: string, docId: string): Promise<void> {
  const docRef = doc(db, collectionName, docId);
  await deleteDoc(docRef);
}

/**
 * Fetch all documents in a collection once
 */
export async function fetchCollection<T>(collectionName: string): Promise<T[]> {
  const querySnapshot = await getDocs(collection(db, collectionName));
  const items: T[] = [];
  querySnapshot.forEach((docSnap) => {
    items.push({ id: docSnap.id, ...(docSnap.data() as any) });
  });
  return items;
}

/**
 * Save Signer Settings (นายก, ปลัด, ผอ.กอง)
 */
export async function saveSignerSettingsToFirestore(settings: SignerSettings): Promise<void> {
  const docRef = doc(db, COLLECTIONS.SETTINGS, 'signers');
  await setDoc(docRef, settings, { merge: true });
}

/**
 * Load Signer Settings
 */
export async function loadSignerSettingsFromFirestore(): Promise<SignerSettings> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.SETTINGS));
    let found: SignerSettings | null = null;
    snapshot.forEach((d) => {
      if (d.id === 'signers') {
        found = d.data() as SignerSettings;
      }
    });
    return found || DEFAULT_SIGNER_SETTINGS;
  } catch (e) {
    console.warn('Could not load signer settings from Firestore, using default:', e);
    return DEFAULT_SIGNER_SETTINGS;
  }
}

/**
 * One-click Initial Migration: Upload all default data into Cloud Firestore
 */
export async function seedAllDataToFirestore(
  onProgress?: (msg: string, percent: number) => void
): Promise<{ success: boolean; message: string }> {
  try {
    const updateProgress = (msg: string, pct: number) => {
      if (onProgress) onProgress(msg, pct);
    };

    updateProgress('กำลังเตรียมอัปโหลดใบอนุญาตก่อเหตุอันตราย...', 10);
    const batch = writeBatch(db);

    // 1. Licenses
    INITIAL_LICENSE_RECORDS.forEach((lic) => {
      const ref = doc(db, COLLECTIONS.LICENSES, lic.id);
      batch.set(ref, lic, { merge: true });
    });

    // 2. Establishments
    INITIAL_ESTABLISHMENTS.forEach((est) => {
      const ref = doc(db, COLLECTIONS.ESTABLISHMENTS, est.id);
      batch.set(ref, est, { merge: true });
    });

    // 3. Inspections
    INITIAL_INSPECTIONS.forEach((insp) => {
      const ref = doc(db, COLLECTIONS.INSPECTIONS, insp.id);
      batch.set(ref, insp, { merge: true });
    });

    // 4. Hazardous Businesses
    INITIAL_HAZARDOUS_BUSINESSES.forEach((haz) => {
      const ref = doc(db, COLLECTIONS.HAZARDOUS, haz.id);
      batch.set(ref, haz, { merge: true });
    });

    // 5. Petitions
    INITIAL_PETITIONS.forEach((pet) => {
      const ref = doc(db, COLLECTIONS.PETITIONS, pet.id);
      batch.set(ref, pet, { merge: true });
    });

    // 6. NHSO Projects
    INITIAL_NHSO_PROJECTS.forEach((nhso) => {
      const ref = doc(db, COLLECTIONS.NHSO, nhso.id);
      batch.set(ref, nhso, { merge: true });
    });

    // 7. LTC Patients
    INITIAL_LTC_PATIENTS.forEach((ltc) => {
      const ref = doc(db, COLLECTIONS.LTC, ltc.id);
      batch.set(ref, ltc, { merge: true });
    });

    // 8. Medical Equipment
    INITIAL_MEDICAL_EQUIPMENT.forEach((eq) => {
      const ref = doc(db, COLLECTIONS.EQUIPMENT, eq.id);
      batch.set(ref, eq, { merge: true });
    });

    // 9. Equipment Loans
    INITIAL_EQUIPMENT_LOANS.forEach((loan) => {
      const ref = doc(db, COLLECTIONS.LOANS, loan.id);
      batch.set(ref, loan, { merge: true });
    });

    // 10. Signer Settings
    const signerRef = doc(db, COLLECTIONS.SETTINGS, 'signers');
    batch.set(signerRef, DEFAULT_SIGNER_SETTINGS, { merge: true });

    // 11. Users / Staff Registry
    INITIAL_USERS.forEach((u) => {
      const uRef = doc(db, COLLECTIONS.USERS, u.id);
      batch.set(uRef, u, { merge: true });
    });

    updateProgress('กำลังบันทึกลง Cloud Firestore...', 80);
    await batch.commit();

    updateProgress('อัปโหลดข้อมูลขึ้น Firebase สำเร็จ 100%!', 100);
    return {
      success: true,
      message: 'บันทึกข้อมูลทุกระบบขึ้น Cloud Firestore (Bangpao Public Health) เรียบร้อยแล้ว!',
    };
  } catch (error: any) {
    console.error('Error seeding data to Firestore:', error);
    return {
      success: false,
      message: error?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ Firebase',
    };
  }
}

/**
 * Seed all 36 authentic licenses into Firestore Collection "licenses"
 */
export async function seedLicensesToFirestore(): Promise<{ success: boolean; message: string; count: number }> {
  try {
    const batch = writeBatch(db);
    INITIAL_LICENSE_RECORDS.forEach((lic) => {
      const ref = doc(db, COLLECTIONS.LICENSES, lic.id);
      batch.set(ref, lic, { merge: true });
    });
    await batch.commit();
    return {
      success: true,
      message: `นำเข้าข้อมูลใบอนุญาต ${INITIAL_LICENSE_RECORDS.length} รายการลง Cloud Firestore สำเร็จ!`,
      count: INITIAL_LICENSE_RECORDS.length,
    };
  } catch (error: any) {
    console.error('Error seeding licenses to Firestore:', error);
    return {
      success: false,
      message: error?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลลง Firebase',
      count: 0,
    };
  }
}

/**
 * Staff / Users Firestore helpers
 */
export async function saveUserToFirestore(user: User): Promise<string> {
  return saveToFirestore(COLLECTIONS.USERS, user, user.id);
}

export async function deleteUserFromFirestore(userId: string): Promise<void> {
  return deleteFromFirestore(COLLECTIONS.USERS, userId);
}

export async function fetchUsersFromFirestore(): Promise<User[]> {
  return fetchCollection<User>(COLLECTIONS.USERS);
}

/**
 * LTC Delivery Queue Firestore helpers (for cross-device PC -> Mobile LINE link sync)
 */
export async function saveLtcQueueToFirestore(queueJob: any): Promise<string> {
  const docId = (queueJob.referenceCode || queueJob.id || `LTC-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_');
  await saveToFirestore(COLLECTIONS.LTC_QUEUES, { ...queueJob, id: docId }, docId);
  await saveToFirestore(COLLECTIONS.LTC_QUEUES, { ...queueJob, id: 'LATEST_LTC_QUEUE' }, 'LATEST_LTC_QUEUE');
  return docId;
}

export async function fetchLtcQueuesFromFirestore(): Promise<any[]> {
  return fetchCollection<any>(COLLECTIONS.LTC_QUEUES);
}



