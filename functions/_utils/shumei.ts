import { B64, HEX, UTF8, des, ecb, md5, NO_PAD, pkcs1_es_1_5, rsa } from 'mima-kit';

// 以下配置来自森空岛公开 Web 客户端，仅在服务端用于生成匿名设备 ID。
const SHUMEI_ENDPOINT = 'https://fp-it.portal101.cn/deviceprofile/v4';
const SHUMEI_ORGANIZATION = 'UWXspnCCJN4sfYlNfqps';
const SHUMEI_PUBLIC_KEY =
  'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCmxMNr7n8ZeT0tE1R9j/mPixoinPkeM+k4VGIn/' +
  's0k7N5rJAfnZ0eMER+QhwFvshzo0LNmeUkpR8uIlU/GEVr8mN28sKmwd2gpygqj0ePnBmOW4v0ZVw' +
  'bSYK+izkhVFk2V/doLoMbWy6b+UnA8mkjvg0iYWRByfRsK2gdl7llqCwIDAQAB';
const AES_IV = '0102030405060708';
const DEVICE_ID_TTL_MS = 5 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 8_000;

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
type FingerprintValue = string | number;

interface DesRule {
  encrypted: boolean;
  key?: string;
  outputName: string;
}

export interface ShumeiDependencies {
  fetcher?: Fetcher;
  now?: () => number;
  randomUUID?: () => string;
  timeoutMs?: number;
}

export interface ShumeiRequestBody {
  appId: 'default';
  compress: 2;
  data: string;
  encode: 5;
  ep: string;
  organization: string;
  os: 'web';
}

interface ShumeiResponse {
  code: number;
  detail: {
    deviceId: string;
  };
}

interface ShumeiBodyDependencies {
  now: () => number;
  randomUUID: () => string;
}

// 数美协议会同时混淆字段名和值；未列入规则的字段不会进入最终指纹数据。
const DES_RULES: Record<string, DesRule> = {
  appId: { encrypted: true, key: 'uy7mzc4h', outputName: 'xx' },
  box: { encrypted: false, outputName: 'jf' },
  canvas: { encrypted: true, key: 'snrn887t', outputName: 'yk' },
  clientSize: { encrypted: true, key: 'cpmjjgsu', outputName: 'zx' },
  organization: { encrypted: true, key: '78moqjfc', outputName: 'dp' },
  os: { encrypted: true, key: 'je6vk6t4', outputName: 'pj' },
  platform: { encrypted: true, key: 'pakxhcd2', outputName: 'gm' },
  plugins: { encrypted: true, key: 'v51m3pzl', outputName: 'kq' },
  pmf: { encrypted: true, key: '2mdeslu3', outputName: 'vw' },
  protocol: { encrypted: false, outputName: 'protocol' },
  referer: { encrypted: true, key: 'y7bmrjlc', outputName: 'ab' },
  res: { encrypted: true, key: 'whxqm2a7', outputName: 'hf' },
  rtype: { encrypted: true, key: 'x8o2h2bl', outputName: 'lo' },
  sdkver: { encrypted: true, key: '9q3dcxp2', outputName: 'sc' },
  status: { encrypted: true, key: '2jbrxxw4', outputName: 'an' },
  subVersion: { encrypted: true, key: 'eo3i2puh', outputName: 'ns' },
  svm: { encrypted: true, key: 'fzj3kaeh', outputName: 'qr' },
  time: { encrypted: true, key: 'q2t3odsk', outputName: 'nb' },
  timezone: { encrypted: true, key: '1uv05lj5', outputName: 'as' },
  tn: { encrypted: true, key: 'x9nzj1bp', outputName: 'py' },
  trees: { encrypted: true, key: 'acfs0xo4', outputName: 'pi' },
  ua: { encrypted: true, key: 'k92crp1t', outputName: 'bj' },
  url: { encrypted: true, key: 'y95hjkoo', outputName: 'cf' },
  version: { encrypted: false, outputName: 'version' },
  vpw: { encrypted: true, key: 'r9924ab5', outputName: 'ca' },
};

// 使用稳定的浏览器环境模板，动态字段在每次生成请求体时单独注入。
const BROWSER_ENV: Record<string, FingerprintValue> = {
  plugins:
    'MicrosoftEdgePDFPluginPortableDocumentFormatinternal-pdf-viewer1,' +
    'MicrosoftEdgePDFViewermhjfbmdgcfjbbpaeojofohoefgiehjai1',
  ua:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0',
  canvas: '259ffe69',
  timezone: -480,
  platform: 'Win32',
  url: 'https://www.skland.com/',
  referer: '',
  res: '1920_1080_24_1.25',
  clientSize: '0_0_1080_1920_1920_1080_1920_1080',
  status: '0011',
};

export class ShumeiDeviceError extends Error {
  constructor() {
    super('Shumei device ID generation failed');
    this.name = 'ShumeiDeviceError';
  }
}

export class UpstreamTimeoutError extends Error {
  constructor() {
    super('Upstream request timed out');
    this.name = 'UpstreamTimeoutError';
  }
}

let cachedDeviceId: { value: string; expiresAt: number } | null = null;
let pendingDeviceId: Promise<string> | null = null;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const hashMd5 = (value: string): string => {
  return md5(UTF8(value)).to(HEX);
};

const bytesToBase64 = (bytes: Uint8Array): string => {
  return B64(bytes);
};

const formatTimestamp = (milliseconds: number): string => {
  const date = new Date(milliseconds);
  const parts = [
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
  ];

  return parts.map((part, index) => String(part).padStart(index === 0 ? 4 : 2, '0')).join('');
};

const stringifyFingerprint = (value: Record<string, FingerprintValue>): string => {
  return JSON.stringify(value).replace(/":"/g, '": "').replace(/","/g, '", "');
};

/**
 * 按数美 Web 协议使用 DES-ECB 和零填充加密单个指纹字段。
 * 上游参考实现使用三把相同密钥的 3DES，其结果与单 DES 等价。
 */
export const encryptDes = (value: FingerprintValue, key: string): string => {
  const input = String(value);
  const paddingLength = (8 - (UTF8(input).length % 8)) % 8;
  const paddedInput = `${input}${'\0'.repeat(paddingLength)}`;
  const cipher = ecb(des, NO_PAD)(UTF8(key));

  return bytesToBase64(cipher.encrypt(UTF8(paddedInput)));
};

/** 按字段名排序并拼接值，数值乘以 10000，用作指纹完整性摘要的输入。 */
export const calculateTnSource = (value: Record<string, FingerprintValue>): string => {
  return Object.keys(value)
    .sort()
    .map((key) => {
      const item = value[key];
      return typeof item === 'number' ? String(item * 10000) : item;
    })
    .join('');
};

/** 将可读指纹字段转换为数美协议要求的混淆字段。 */
export const encryptFingerprintFields = (
  value: Record<string, FingerprintValue>
): Record<string, FingerprintValue> => {
  const result: Record<string, FingerprintValue> = {};

  for (const [key, item] of Object.entries(value)) {
    const rule = DES_RULES[key];
    if (!rule) continue;

    if (rule.encrypted && rule.key) {
      result[rule.outputName] = encryptDes(item, rule.key);
    } else {
      result[rule.outputName] = item;
    }
  }

  return result;
};

/** gzip 压缩指纹 JSON，并修正 gzip OS 标志以匹配协议参考实现。 */
export const gzipFingerprint = async (
  value: Record<string, FingerprintValue>
): Promise<string> => {
  const encoded = new TextEncoder().encode(stringifyFingerprint(value));
  const compressed = await new Response(
    new Blob([encoded]).stream().pipeThrough(new CompressionStream('gzip'))
  ).arrayBuffer();
  const bytes = new Uint8Array(compressed);
  bytes[9] = 19;

  return bytesToBase64(bytes);
};

/** 使用 UUID 的 MD5 前 16 位作为 AES-128-CBC 密钥封装压缩后的指纹。 */
export const encryptAes = async (value: string, key: string): Promise<string> => {
  const cryptoKey = await crypto.subtle.importKey('raw', UTF8(key), 'AES-CBC', false, [
    'encrypt',
  ]);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv: UTF8(AES_IV) },
    cryptoKey,
    UTF8(value)
  );

  return HEX(new Uint8Array(encrypted));
};

const base64UrlToBigInt = (value: string): bigint => {
  const base64 = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(base64);
  let result = 0n;

  for (let index = 0; index < binary.length; index += 1) {
    result = (result << 8n) | BigInt(binary.charCodeAt(index));
  }

  return result;
};

export const encryptRsa = async (value: string): Promise<string> => {
  // Web Crypto 不支持 RSAES-PKCS1-v1_5 加密，因此先用它解析 SPKI 公钥参数，
  // 再交给 mima-kit 完成协议要求的 PKCS#1 v1.5 加密。
  const publicKey = Uint8Array.from(atob(SHUMEI_PUBLIC_KEY), (character) =>
    character.charCodeAt(0)
  );
  const cryptoKey = await crypto.subtle.importKey(
    'spki',
    publicKey,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['encrypt']
  );
  const jwk = await crypto.subtle.exportKey('jwk', cryptoKey);

  if (!('n' in jwk) || !jwk.n || !jwk.e) throw new ShumeiDeviceError();

  const cipher = pkcs1_es_1_5(
    rsa({ n: base64UrlToBigInt(jwk.n), e: base64UrlToBigInt(jwk.e) })
  );
  return bytesToBase64(cipher.encrypt(UTF8(value)));
};

const createSmId = (uuid: string, now: number): string => {
  const prefix = `${formatTimestamp(now)}${hashMd5(uuid)}00`;
  const suffix = hashMd5(`smsk_web_${prefix}`).slice(0, 14);
  return `${prefix}${suffix}0`;
};

export const createShumeiRequestBody = async (
  dependencies: ShumeiBodyDependencies
): Promise<ShumeiRequestBody> => {
  // 一次请求中的 UUID 同时关联 RSA 加密的 ep 与 AES 私有密钥，不能分别生成。
  const uuid = dependencies.randomUUID();
  const now = dependencies.now();
  const privateId = hashMd5(uuid).slice(0, 16);
  const fingerprint: Record<string, FingerprintValue> = {
    ...BROWSER_ENV,
    vpw: dependencies.randomUUID(),
    svm: now,
    trees: dependencies.randomUUID(),
    pmf: now,
    protocol: 102,
    organization: SHUMEI_ORGANIZATION,
    appId: 'default',
    os: 'web',
    version: '3.0.0',
    sdkver: '3.0.0',
    box: '',
    rtype: 'all',
    smid: createSmId(uuid, now),
    subVersion: '1.0.0',
    time: 0,
  };
  // tn 必须在加入自身之前计算，否则摘要输入会形成循环依赖。
  fingerprint.tn = hashMd5(calculateTnSource(fingerprint));

  // 指纹的封装顺序固定为：字段 DES/混淆 -> gzip/Base64 -> AES/hex。
  const encryptedFingerprint = encryptFingerprintFields(fingerprint);
  const compressedFingerprint = await gzipFingerprint(encryptedFingerprint);

  return {
    appId: 'default',
    compress: 2,
    data: await encryptAes(compressedFingerprint, privateId),
    encode: 5,
    ep: await encryptRsa(uuid),
    organization: SHUMEI_ORGANIZATION,
    os: 'web',
  };
};

/** 为每次固定上游请求添加可主动取消的独立超时。 */
export const fetchWithTimeout = async (
  fetcher: Fetcher,
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetcher(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) throw new UpstreamTimeoutError();
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

const parseShumeiResponse = (value: unknown): ShumeiResponse | null => {
  if (!isRecord(value) || value.code !== 1100 || !isRecord(value.detail)) return null;
  if (typeof value.detail.deviceId !== 'string' || value.detail.deviceId.length === 0) return null;

  return { code: 1100, detail: { deviceId: value.detail.deviceId } };
};

const requestDeviceId = async (dependencies: Required<ShumeiDependencies>): Promise<string> => {
  try {
    const body = await createShumeiRequestBody(dependencies);
    const response = await fetchWithTimeout(
      dependencies.fetcher,
      SHUMEI_ENDPOINT,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      dependencies.timeoutMs
    );

    if (!response.ok) throw new ShumeiDeviceError();

    const parsed = parseShumeiResponse(await response.json());
    if (!parsed) throw new ShumeiDeviceError();

    // 森空岛请求头要求在数美原始 deviceId 前增加 B 前缀。
    return `B${parsed.detail.deviceId}`;
  } catch (error) {
    if (error instanceof UpstreamTimeoutError) throw error;
    if (error instanceof ShumeiDeviceError) throw error;
    throw new ShumeiDeviceError();
  }
};

export const invalidateShumeiDeviceId = (): void => {
  cachedDeviceId = null;
  pendingDeviceId = null;
};

export const getShumeiDeviceId = async (
  dependencies: ShumeiDependencies = {}
): Promise<string> => {
  const resolved: Required<ShumeiDependencies> = {
    fetcher: dependencies.fetcher ?? fetch,
    now: dependencies.now ?? Date.now,
    randomUUID: dependencies.randomUUID ?? crypto.randomUUID.bind(crypto),
    timeoutMs: dependencies.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  };
  const now = resolved.now();

  if (cachedDeviceId && cachedDeviceId.expiresAt > now) return cachedDeviceId.value;
  // 冷启动并发请求共享同一个 Promise，避免同时向数美生成多个设备 ID。
  if (pendingDeviceId) return pendingDeviceId;

  pendingDeviceId = requestDeviceId(resolved)
    .then((deviceId) => {
      cachedDeviceId = { value: deviceId, expiresAt: resolved.now() + DEVICE_ID_TTL_MS };
      return deviceId;
    })
    .finally(() => {
      pendingDeviceId = null;
    });

  return pendingDeviceId;
};
