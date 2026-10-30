/**
 * Free file storage for invitation letters / announcements / meeting documents.
 *
 * Why Firestore chunks instead of Firebase Storage?
 *  - Since Oct 2024 new Cloud Storage buckets require the paid Blaze plan.
 *  - Firestore (Spark / free plan) gives 1 GB of storage for free and works on every
 *    device instantly, so we split each file into ~600 KB base64 chunks
 *    (Firestore's per-document limit is 1 MiB).
 *
 * Collections:
 *  - file_store/{fileId}            → metadata (name, mimeType, size, chunkCount)
 *  - file_chunks/{fileId}_{index}   → { fileId, index, data(base64) }
 */
import { doc, getDoc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase.ts';

export const FILE_COLLECTIONS = {
  META: 'file_store',
  CHUNKS: 'file_chunks',
} as const;

/** Raw bytes per chunk (base64 grows ×1.33 → ~800 KB per Firestore document) */
const CHUNK_SIZE = 600 * 1024;

/** Maximum upload size per file */
export const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

/** Images larger than this are re-encoded to JPEG to save space */
const IMAGE_COMPRESS_THRESHOLD = 900 * 1024;
const IMAGE_MAX_DIMENSION = 2200;

export const ACCEPTED_FILE_TYPES =
  '.pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,application/pdf,image/*';

export interface StoredFileAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  /** Optional external link (e.g. Google Drive) instead of an uploaded file */
  externalUrl?: string;
}

const blobCache = new Map<string, Blob>();

function generateFileId(): string {
  return `FILE-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error || new Error('อ่านไฟล์ไม่สำเร็จ'));
    reader.readAsDataURL(blob);
  });
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** Downscale/re-encode big photos (e.g. phone camera shots of a letter) */
async function maybeCompressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.size <= IMAGE_COMPRESS_THRESHOLD) {
    return file;
  }
  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('decode failed'));
      el.src = url;
    });
    const scale = Math.min(1, IMAGE_MAX_DIMENSION / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
    if (blob && blob.size < file.size) return blob;
  } catch (e) {
    console.warn('Image compression skipped:', e);
  }
  return file;
}

/**
 * Upload a file to Firestore (chunked). Returns attachment metadata to be stored
 * inside the calendar event / announcement document.
 */
export async function uploadFileToCloud(
  file: File,
  onProgress?: (percent: number) => void
): Promise<StoredFileAttachment> {
  if (file.size > MAX_FILE_SIZE * 1.5) {
    throw new Error(`ไฟล์ "${file.name}" มีขนาดใหญ่เกิน 15 MB`);
  }

  const processed = await maybeCompressImage(file);
  if (processed.size > MAX_FILE_SIZE) {
    throw new Error(`ไฟล์ "${file.name}" มีขนาดใหญ่เกิน 15 MB กรุณาลดขนาดไฟล์ก่อนอัปโหลด`);
  }

  const isCompressedImage = processed !== file;
  const mimeType = isCompressedImage ? 'image/jpeg' : file.type || 'application/octet-stream';
  const name = isCompressedImage ? file.name.replace(/\.[^.]+$/, '') + '.jpg' : file.name;

  const id = generateFileId();
  const chunkCount = Math.max(1, Math.ceil(processed.size / CHUNK_SIZE));

  for (let i = 0; i < chunkCount; i++) {
    const slice = processed.slice(i * CHUNK_SIZE, Math.min(processed.size, (i + 1) * CHUNK_SIZE));
    const data = await blobToBase64(slice);
    await setDoc(doc(db, FILE_COLLECTIONS.CHUNKS, `${id}_${i}`), { fileId: id, index: i, data });
    if (onProgress) onProgress(Math.round(((i + 1) / chunkCount) * 100));
  }

  const meta: StoredFileAttachment & { chunkCount: number } = {
    id,
    name,
    mimeType,
    size: processed.size,
    uploadedAt: new Date().toISOString(),
    chunkCount,
  };
  await setDoc(doc(db, FILE_COLLECTIONS.META, id), meta);

  blobCache.set(id, new Blob([processed], { type: mimeType }));

  const { chunkCount: _omit, ...attachment } = meta;
  return attachment;
}

/** Download a stored file back into a Blob (cached in memory per session) */
export async function loadFileBlob(fileId: string, fallbackMime?: string): Promise<Blob> {
  const cached = blobCache.get(fileId);
  if (cached) return cached;

  const metaSnap = await getDoc(doc(db, FILE_COLLECTIONS.META, fileId));
  if (!metaSnap.exists()) {
    throw new Error('ไม่พบไฟล์ในระบบ (อาจถูกลบไปแล้ว)');
  }
  const meta = metaSnap.data() as { mimeType?: string; chunkCount?: number };
  const chunkCount = Number(meta.chunkCount || 1);

  const parts = await Promise.all(
    Array.from({ length: chunkCount }).map(async (_, i) => {
      const snap = await getDoc(doc(db, FILE_COLLECTIONS.CHUNKS, `${fileId}_${i}`));
      if (!snap.exists()) throw new Error('ไฟล์ไม่สมบูรณ์ (ข้อมูลบางส่วนหายไป)');
      return base64ToBytes(String((snap.data() as any).data || ''));
    })
  );

  const blob = new Blob(parts as BlobPart[], { type: meta.mimeType || fallbackMime || 'application/octet-stream' });
  blobCache.set(fileId, blob);
  return blob;
}

/** Permanently delete a stored file (metadata + all chunks) */
export async function deleteFileFromCloud(fileId: string): Promise<void> {
  try {
    const metaSnap = await getDoc(doc(db, FILE_COLLECTIONS.META, fileId));
    const chunkCount = metaSnap.exists() ? Number((metaSnap.data() as any).chunkCount || 1) : 1;
    const batch = writeBatch(db);
    for (let i = 0; i < chunkCount; i++) {
      batch.delete(doc(db, FILE_COLLECTIONS.CHUNKS, `${fileId}_${i}`));
    }
    batch.delete(doc(db, FILE_COLLECTIONS.META, fileId));
    await batch.commit();
  } finally {
    blobCache.delete(fileId);
  }
}

/** True when the browser can preview this file type inline */
export function isPreviewable(mimeType: string): boolean {
  return mimeType === 'application/pdf' || mimeType.startsWith('image/') || mimeType.startsWith('text/');
}

/** Trigger a download of a Blob */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
