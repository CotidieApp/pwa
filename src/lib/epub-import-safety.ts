// pako is also used by epub.js/JSZip. Streaming chunks avoid allocating an expanded archive.
const { Inflate } = require('pako') as { Inflate: new (options: { raw: boolean; chunkSize: number }) => {
  onData: (chunk: Uint8Array) => void; push: (data: Uint8Array, final: boolean) => boolean; err: number;
  strm: { total_in: number }; ended: boolean;
} };
export const MAX_EPUB_BYTES = 25 * 1024 * 1024;
const MAX_EXPANDED_BYTES = 150 * 1024 * 1024;
const MAX_ENTRY_BYTES = 32 * 1024 * 1024;
const fail = (): never => { throw new Error('El EPUB está dañado o supera los límites de lectura segura.'); };

export function validateEpubArchive(buffer: ArrayBuffer): void {
  if (buffer.byteLength > MAX_EPUB_BYTES || buffer.byteLength < 22) fail();
  const bytes = new Uint8Array(buffer), view = new DataView(buffer);
  const u16 = (offset: number) => view.getUint16(offset, true);
  const u32 = (offset: number) => view.getUint32(offset, true);
  const decoder = new TextDecoder();
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (u32(i) === 0x06054b50 && i + 22 + u16(i + 20) === bytes.length) { end = i; break; }
  }
  if (end < 0 || u16(end + 4) || u16(end + 6) || u16(end + 8) !== u16(end + 10)) fail();
  const count = u16(end + 10), centralSize = u32(end + 12), central = u32(end + 16);
  if (!count || count > 4096 || central + centralSize !== end) fail();
  let offset = central, expanded = 0, hasMime = false, hasContainer = false;
  const names = new Set<string>();
  const ranges: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    if (offset + 46 > end || u32(offset) !== 0x02014b50) fail();
    const flags = u16(offset + 8), method = u16(offset + 10);
    const compressed = u32(offset + 20), size = u32(offset + 24);
    const nameLength = u16(offset + 28), extraLength = u16(offset + 30), commentLength = u16(offset + 32);
    const local = u32(offset + 42), next = offset + 46 + nameLength + extraLength + commentLength;
    if (next > end || flags & 1 || (method !== 0 && method !== 8) || size > MAX_ENTRY_BYTES ||
        (expanded += size) > MAX_EXPANDED_BYTES || size > Math.max(1024 * 1024, compressed * 250)) fail();
    const nameBytes = bytes.subarray(offset + 46, offset + 46 + nameLength);
    const name = decoder.decode(nameBytes);
    if (!name || name.includes('\0') || name.includes('\\') || name.startsWith('/') ||
        /^[a-z]:/i.test(name) || name.split('/').some(part => part === '..') || names.has(name)) fail();
    names.add(name);
    if (local + 30 > central || u32(local) !== 0x04034b50 || u16(local + 6) !== flags || u16(local + 8) !== method) fail();
    const start = local + 30 + u16(local + 26) + u16(local + 28);
    if (start + compressed > central || u16(local + 26) !== nameLength ||
        !nameBytes.every((byte, n) => byte === bytes[local + 30 + n])) fail();
    if (!(flags & 8) && (u32(local + 18) !== compressed || u32(local + 22) !== size)) fail();
    ranges.push([local, start + compressed]);
    const data = bytes.subarray(start, start + compressed);
    if (method === 0) { if (compressed !== size) fail(); }
    else {
      let actual = 0;
      const inflater = new Inflate({ raw: true, chunkSize: 65536 });
      inflater.onData = chunk => { actual += chunk.byteLength; if (actual > size || actual > MAX_ENTRY_BYTES) fail(); };
      inflater.push(data, true);
      if (inflater.err || !inflater.ended || actual !== size || inflater.strm.total_in !== compressed) fail();
    }
    if (name === 'mimetype') {
      if (method !== 0 || decoder.decode(data) !== 'application/epub+zip') fail();
      hasMime = true;
    }
    if (name === 'META-INF/container.xml') hasContainer = true;
    offset = next;
  }
  ranges.sort((a, b) => a[0] - b[0]);
  if (ranges.some((range, i) => i > 0 && range[0] < ranges[i - 1][1]) || offset !== end || !hasMime || !hasContainer) fail();
}
