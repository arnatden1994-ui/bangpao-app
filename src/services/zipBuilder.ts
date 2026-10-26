/**
 * ตัวสร้างไฟล์ ZIP แบบ STORE (ไม่บีบอัด) ด้วย JavaScript ล้วน
 * ใช้ประกอบไฟล์ OpenXML (.docx) โดยไม่ต้องพึ่งไลบรารีภายนอก
 */

export interface ZipEntryInput {
  name: string;
  data: Uint8Array;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function writeU16(buf: Uint8Array, val: number, offset: number) {
  buf[offset] = val & 0xff;
  buf[offset + 1] = (val >>> 8) & 0xff;
}

function writeU32(buf: Uint8Array, val: number, offset: number) {
  buf[offset] = val & 0xff;
  buf[offset + 1] = (val >>> 8) & 0xff;
  buf[offset + 2] = (val >>> 16) & 0xff;
  buf[offset + 3] = (val >>> 24) & 0xff;
}

export function buildZip(entries: ZipEntryInput[]): Uint8Array {
  const encoder = new TextEncoder();
  const parts = entries.map((e) => ({
    nameBytes: encoder.encode(e.name),
    data: e.data,
    crc: crc32(e.data),
  }));

  let localSize = 0;
  let centralSize = 0;
  for (const p of parts) {
    localSize += 30 + p.nameBytes.length + p.data.length;
    centralSize += 46 + p.nameBytes.length;
  }

  const out = new Uint8Array(localSize + centralSize + 22);
  let localOffset = 0;
  let centralOffset = localSize;

  for (const p of parts) {
    const entryStart = localOffset;

    // Local file header
    writeU32(out, 0x04034b50, localOffset);
    writeU16(out, 20, localOffset + 4); // version needed
    writeU16(out, 0x0800, localOffset + 6); // flags: UTF-8 file names
    writeU16(out, 0, localOffset + 8); // method: STORE
    writeU16(out, 0, localOffset + 10);
    writeU16(out, 0x0021, localOffset + 12);
    writeU32(out, p.crc, localOffset + 14);
    writeU32(out, p.data.length, localOffset + 18);
    writeU32(out, p.data.length, localOffset + 22);
    writeU16(out, p.nameBytes.length, localOffset + 26);
    writeU16(out, 0, localOffset + 28);
    out.set(p.nameBytes, localOffset + 30);
    localOffset += 30 + p.nameBytes.length;
    out.set(p.data, localOffset);
    localOffset += p.data.length;

    // Central directory header
    writeU32(out, 0x02014b50, centralOffset);
    writeU16(out, 45, centralOffset + 4);
    writeU16(out, 20, centralOffset + 6);
    writeU16(out, 0x0800, centralOffset + 8);
    writeU16(out, 0, centralOffset + 10);
    writeU16(out, 0, centralOffset + 12);
    writeU16(out, 0x0021, centralOffset + 14);
    writeU32(out, p.crc, centralOffset + 16);
    writeU32(out, p.data.length, centralOffset + 20);
    writeU32(out, p.data.length, centralOffset + 24);
    writeU16(out, p.nameBytes.length, centralOffset + 28);
    writeU16(out, 0, centralOffset + 30);
    writeU16(out, 0, centralOffset + 32);
    writeU16(out, 0, centralOffset + 34);
    writeU16(out, 0, centralOffset + 36);
    writeU32(out, 0, centralOffset + 38);
    writeU32(out, entryStart, centralOffset + 42);
    out.set(p.nameBytes, centralOffset + 46);
    centralOffset += 46 + p.nameBytes.length;
  }

  // End of central directory
  writeU32(out, 0x06054b50, centralOffset);
  writeU16(out, 0, centralOffset + 4);
  writeU16(out, 0, centralOffset + 6);
  writeU16(out, parts.length, centralOffset + 8);
  writeU16(out, parts.length, centralOffset + 10);
  writeU32(out, centralSize, centralOffset + 12);
  writeU32(out, localSize, centralOffset + 16);
  writeU16(out, 0, centralOffset + 20);

  return out;
}
