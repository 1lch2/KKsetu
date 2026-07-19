// HEIF/HEIC brand 列表，出现在 ISO-BMFF 文件头部的 ftyp box 中
const HEIF_BRANDS = new Set([
  'heic', 'heix', 'heim', 'heis',
  'hevc', 'hevx', 'hevm', 'hevs',
  'mif1', 'msf1', 'mif2',
]);

/**
 * 通过魔数（magic bytes）判断二进制数据是否为 HEIF/HEIC 图片。
 *
 * HEIF/HEIC 是 ISO-BMFF 容器格式，文件以 `....ftyp<brand>` 开头。
 * 小红书海外 CDN 会把 HEIC 原图的 Content-Type 误标成 image/jpeg，
 * 因此不能信任 Content-Type，改为按文件头判断。
 *
 * @param buffer 图片二进制数据
 * @returns 是否为 HEIF/HEIC 格式
 */
export const isHeif = (buffer: ArrayBuffer): boolean => {
  if (buffer.byteLength < 12) return false;
  const bytes = new Uint8Array(buffer);
  const read4 = (i: number) =>
    String.fromCharCode(bytes[i], bytes[i + 1], bytes[i + 2], bytes[i + 3]);

  if (read4(4) !== 'ftyp') return false;
  if (HEIF_BRANDS.has(read4(8))) return true; // major brand

  // 扫描 ftyp box 内的 compatible brands
  const boxSize = (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
  const end = Math.min(boxSize || bytes.length, bytes.length);
  for (let i = 16; i + 4 <= end; i += 4) {
    if (HEIF_BRANDS.has(read4(i))) return true;
  }
  return false;
};
