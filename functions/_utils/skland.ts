import { HEX, UTF8, hmac, md5, sha256 } from 'mima-kit';

import {
  getShumeiDeviceId,
  invalidateShumeiDeviceId,
  ShumeiDeviceError,
  UpstreamTimeoutError,
  fetchWithTimeout,
  type ShumeiDependencies,
} from './shumei';

// 用户输入只用于提取数字 ID；实际 fetch 目标始终由这些固定地址构造，避免开放代理和 SSRF。
const REFRESH_URL = 'https://zonai.skland.com/web/v1/auth/refresh';
const ITEM_URL = 'https://zonai.skland.com/web/v1/item';
const DEFAULT_TIMEOUT_MS = 8_000;
const TOTAL_TIMEOUT_MS = 20_000;
const SUPPORTED_HOSTS = new Set(['www.skland.com', 'm.skland.com']);
const SUPPORTED_PATHS = new Set(['/article', '/h/detail']);

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type SklandErrorCode =
  | 'INVALID_REQUEST'
  | 'INVALID_SKLAND_URL'
  | 'ARTICLE_NOT_FOUND'
  | 'SHUMEI_DEVICE_FAILED'
  | 'UPSTREAM_AUTH_FAILED'
  | 'UPSTREAM_RESPONSE_INVALID'
  | 'UPSTREAM_TIMEOUT'
  | 'INTERNAL_ERROR';

export interface SklandImagesResult {
  articleId: string;
  title?: string;
  images: string[];
}

export interface SklandDependencies extends ShumeiDependencies {
  fetcher?: Fetcher;
}

interface BaseHeaders {
  platform: '3';
  timestamp: string;
  dId: string;
  vName: '1.0.0';
}

interface RefreshResult {
  token: string;
}

interface ResolvedSklandDependencies extends Required<SklandDependencies> {
  deadline: number;
}

export class SklandError extends Error {
  readonly code: SklandErrorCode;

  constructor(code: SklandErrorCode) {
    super(code);
    this.name = 'SklandError';
    this.code = code;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const getBusinessCode = (value: unknown): string | number | undefined => {
  if (!isRecord(value)) return undefined;
  return typeof value.code === 'string' || typeof value.code === 'number' ? value.code : undefined;
};

/** 严格校验公开帖子 URL，并只返回十进制帖子 ID。 */
export const parseSklandArticleId = (input: string): string => {
  if (input.length === 0 || input.length > 2048) throw new SklandError('INVALID_SKLAND_URL');

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new SklandError('INVALID_SKLAND_URL');
  }

  const ids = url.searchParams.getAll('id');
  if (
    url.protocol !== 'https:' ||
    !SUPPORTED_HOSTS.has(url.hostname) ||
    !SUPPORTED_PATHS.has(url.pathname) ||
    ids.length !== 1 ||
    !/^\d+$/.test(ids[0])
  ) {
    throw new SklandError('INVALID_SKLAND_URL');
  }

  return ids[0];
};

/** 创建签名和实际请求共用的基础头，字段顺序不可调整。 */
export const createBaseHeaders = (deviceId: string, now: number): BaseHeaders => {
  return {
    platform: '3',
    timestamp: String(Math.floor(now / 1000)),
    dId: deviceId,
    vName: '1.0.0',
  };
};

/**
 * 签名原文为 path + query（不含 ?）+ timestamp + 基础头 JSON。
 * 先计算 HMAC-SHA256 十六进制字符串，再对该字符串计算 MD5。
 */
export const createSklandSignature = (
  token: string,
  pathname: string,
  query: string,
  headers: BaseHeaders
): string => {
  const text = `${pathname}${query}${headers.timestamp}${JSON.stringify(headers)}`;
  const hmacHex = hmac(sha256)(UTF8(token), UTF8(text)).to(HEX);
  return md5(UTF8(hmacHex)).to(HEX);
};

/** 仅移除 bbs.hycdn.cn 的图片处理参数；其它 HTTPS 地址保持上游原样。 */
export const normalizeSklandImageUrl = (value: string): string | null => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.protocol !== 'https:') return null;
  if (url.hostname === 'bbs.hycdn.cn') {
    url.search = '';
    url.hash = '';
  }

  return url.toString();
};

/** 从帖子响应的 imageListSlice 中过滤、规范化并稳定去重静态图片。 */
export const parseSklandItemResponse = (
  value: unknown,
  articleId: string
): SklandImagesResult => {
  if (!isRecord(value)) throw new SklandError('UPSTREAM_RESPONSE_INVALID');

  if (value.code === 1019) throw new SklandError('ARTICLE_NOT_FOUND');
  if (typeof value.code === 'number' && value.code !== 0) {
    throw new SklandError('UPSTREAM_RESPONSE_INVALID');
  }

  if (!isRecord(value.data) || !isRecord(value.data.item)) {
    throw new SklandError('UPSTREAM_RESPONSE_INVALID');
  }

  const item = value.data.item;
  if (item.imageListSlice !== undefined && !Array.isArray(item.imageListSlice)) {
    throw new SklandError('UPSTREAM_RESPONSE_INVALID');
  }

  const images: string[] = [];
  const seen = new Set<string>();
  const imageList = Array.isArray(item.imageListSlice) ? item.imageListSlice : [];

  for (const image of imageList) {
    if (!isRecord(image) || typeof image.url !== 'string') continue;
    const normalized = normalizeSklandImageUrl(image.url);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    images.push(normalized);
  }

  return {
    articleId,
    ...(typeof item.title === 'string' && item.title.length > 0 ? { title: item.title } : {}),
    images,
  };
};

const parseRefreshResponse = (value: unknown): RefreshResult => {
  if (!isRecord(value) || !isRecord(value.data) || typeof value.data.token !== 'string') {
    throw new SklandError('UPSTREAM_AUTH_FAILED');
  }

  if (value.data.token.length === 0) throw new SklandError('UPSTREAM_AUTH_FAILED');
  return { token: value.data.token };
};

const fetchJson = async (
  fetcher: Fetcher,
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<{ response: Response; body: unknown }> => {
  let response: Response;
  try {
    response = await fetchWithTimeout(fetcher, url, init, timeoutMs);
  } catch (error) {
    if (error instanceof UpstreamTimeoutError) throw error;
    throw new SklandError('UPSTREAM_RESPONSE_INVALID');
  }
  let body: unknown;

  try {
    body = await response.json();
  } catch {
    throw new SklandError('UPSTREAM_RESPONSE_INVALID');
  }

  return { response, body };
};

// 每一段请求都受独立超时和同一个总预算约束，重建 dId 时不会重新计算总预算。
const getRemainingTimeout = (dependencies: ResolvedSklandDependencies): number => {
  const remaining = dependencies.deadline - dependencies.now();
  if (remaining <= 0) throw new UpstreamTimeoutError();
  return Math.min(dependencies.timeoutMs, remaining);
};

/** 执行单轮 dId -> refresh token -> signed item 请求。 */
const fetchArticleOnce = async (
  articleId: string,
  dependencies: ResolvedSklandDependencies
): Promise<SklandImagesResult> => {
  let deviceId: string;
  try {
    deviceId = await getShumeiDeviceId({
      fetcher: dependencies.fetcher,
      now: dependencies.now,
      randomUUID: dependencies.randomUUID,
      timeoutMs: getRemainingTimeout(dependencies),
    });
  } catch (error) {
    if (error instanceof UpstreamTimeoutError) throw error;
    if (error instanceof ShumeiDeviceError) throw new SklandError('SHUMEI_DEVICE_FAILED');
    throw error;
  }

  const headers = createBaseHeaders(deviceId, dependencies.now());
  const refresh = await fetchJson(
    dependencies.fetcher,
    REFRESH_URL,
    { headers: { ...headers } },
    getRemainingTimeout(dependencies)
  );

  if (!refresh.response.ok) {
    console.warn('Skland refresh rejected', {
      status: refresh.response.status,
      businessCode: getBusinessCode(refresh.body),
    });
    throw new SklandError('UPSTREAM_AUTH_FAILED');
  }

  let token: string;
  try {
    token = parseRefreshResponse(refresh.body).token;
  } catch (error) {
    console.warn('Skland refresh response invalid', {
      status: refresh.response.status,
      businessCode: getBusinessCode(refresh.body),
    });
    throw error;
  }

  const serverDateHeader = refresh.response.headers.get('date');
  const serverTime = serverDateHeader ? Date.parse(serverDateHeader) : Number.NaN;
  // item 接口的时间校验比 refresh 更严格，优先使用 refresh 响应的标准 Date 头消除时钟漂移。
  const itemHeaders = createBaseHeaders(
    deviceId,
    Number.isFinite(serverTime) ? serverTime : dependencies.now()
  );

  const query = new URLSearchParams({ id: articleId }).toString();
  const sign = createSklandSignature(token, '/web/v1/item', query, itemHeaders);
  const item = await fetchJson(
    dependencies.fetcher,
    `${ITEM_URL}?${query}`,
    { headers: { ...itemHeaders, sign } },
    getRemainingTimeout(dependencies)
  );

  if (item.response.status === 404) throw new SklandError('ARTICLE_NOT_FOUND');
  if (item.response.status === 401 || item.response.status === 403) {
    console.warn('Skland item request rejected', {
      status: item.response.status,
      businessCode: getBusinessCode(item.body),
    });
    throw new SklandError('UPSTREAM_AUTH_FAILED');
  }
  if (getBusinessCode(item.body) === 1019) throw new SklandError('ARTICLE_NOT_FOUND');
  if (!item.response.ok) {
    console.warn('Skland item request failed', {
      status: item.response.status,
      businessCode: getBusinessCode(item.body),
    });
    throw new SklandError('UPSTREAM_RESPONSE_INVALID');
  }

  const itemBusinessCode = getBusinessCode(item.body);
  if (itemBusinessCode !== undefined && itemBusinessCode !== 0) {
    console.warn('Skland item business response rejected', {
      status: item.response.status,
      businessCode: itemBusinessCode,
    });
  }

  return parseSklandItemResponse(item.body, articleId);
};

/**
 * 提取公开帖子图片。设备或鉴权失败时仅清理 dId 并完整重试一次，
 * 其它错误直接返回，避免对未公开上游形成无界重试。
 */
export const extractSklandImages = async (
  input: string,
  dependencies: SklandDependencies = {}
): Promise<SklandImagesResult> => {
  const articleId = parseSklandArticleId(input);
  const now = dependencies.now ?? Date.now;
  const resolved: ResolvedSklandDependencies = {
    fetcher: dependencies.fetcher ?? fetch,
    now,
    randomUUID: dependencies.randomUUID ?? crypto.randomUUID.bind(crypto),
    timeoutMs: dependencies.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    deadline: now() + TOTAL_TIMEOUT_MS,
  };

  try {
    return await fetchArticleOnce(articleId, resolved);
  } catch (error) {
    const shouldRebuildDevice =
      error instanceof SklandError &&
      (error.code === 'SHUMEI_DEVICE_FAILED' || error.code === 'UPSTREAM_AUTH_FAILED');

    if (!shouldRebuildDevice) {
      if (error instanceof UpstreamTimeoutError) throw new SklandError('UPSTREAM_TIMEOUT');
      throw error;
    }

    invalidateShumeiDeviceId();

    try {
      return await fetchArticleOnce(articleId, resolved);
    } catch (retryError) {
      if (retryError instanceof UpstreamTimeoutError) throw new SklandError('UPSTREAM_TIMEOUT');
      throw retryError;
    }
  }
};
