import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import heic2any from 'heic2any';

import { BASE_URL } from '../utils/constants';

interface PostInfo {
  postId: string;
  xsecToken: string;
  xsecSource?: string;
}

interface XhsImageResponse {
  images: string[];
}

interface XhsImages {
  images: Blob[];
  failedCount: number;
}

const isXhsImageResponse = (value: unknown): value is XhsImageResponse => {
  if (typeof value !== 'object' || value === null || !('images' in value)) return false;
  return Array.isArray(value.images) && value.images.every((image) => typeof image === 'string');
};

const readJsonResponse = async (response: Response, stage: string): Promise<unknown> => {
  let value: unknown;
  try {
    value = await response.json();
  } catch {
    throw new Error(`${stage}返回了非 JSON 响应（HTTP ${response.status}），请稍后重试`);
  }
  if (!response.ok) {
    const message =
      typeof value === 'object' &&
      value !== null &&
      'error' in value &&
      typeof value.error === 'string'
        ? value.error
        : `HTTP ${response.status}`;
    throw new Error(`${stage}失败：${message}`);
  }
  return value;
};

const parseShortLink = async (content: string, signal?: AbortSignal): Promise<string> => {
  const response = await fetch(
    `${BASE_URL}/api/parseXhsShort?content=${encodeURIComponent(content)}`,
    { signal }
  );
  const data = await readJsonResponse(response, '短链接解析');
  if (
    typeof data !== 'object' ||
    data === null ||
    !('fullLink' in data) ||
    typeof data.fullLink !== 'string'
  ) {
    throw new Error('短链接解析未返回完整链接，请重新复制小红书分享链接');
  }
  return data.fullLink;
};

const extractPostInfo = (input: string): PostInfo => {
  const match = input.match(/https?:\/\/(?:www\.)?xiaohongshu\.com\/[^\s]+/);
  if (!match) throw new Error('未找到小红书链接，请粘贴完整分享内容');
  const url = new URL(match[0]);
  const idMatch = url.pathname.match(/^\/(?:explore|discovery\/item)\/([a-f0-9]{24})\/?$/i);
  if (!idMatch) throw new Error('请使用小红书帖子分享链接，而不是个人主页链接');
  const xsecToken = url.searchParams.get('xsec_token');
  if (!xsecToken) throw new Error('链接缺少访问参数，请从小红书重新复制完整分享链接');
  return {
    postId: idMatch[1],
    xsecToken,
    xsecSource: url.searchParams.get('xsec_source') || undefined,
  };
};

const fetchImage = async (imageUrl: string, signal?: AbortSignal): Promise<Blob> => {
  const response = await fetch(
    `${BASE_URL}/api/getXhsSourceImage?url=${encodeURIComponent(imageUrl)}`,
    { signal }
  );
  if (!response.ok) throw new Error(`图片下载失败（HTTP ${response.status}）`);
  const blob = await response.blob();
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('image/heic') || contentType.includes('image/heif')) {
    try {
      const converted = await heic2any({ blob, toType: 'image/png' });
      const result = Array.isArray(converted) ? converted[0] : converted;
      if (!result) throw new Error('Empty conversion');
      return result;
    } catch {
      throw new Error('图片格式转换失败，请重试或换用其他浏览器');
    }
  }
  return blob;
};

// Cache binary data; the mounted hook owns and revokes all display Blob URLs.
export const getXhsImages = async (
  rawShareContent: string,
  signal?: AbortSignal
): Promise<XhsImages> => {
  const content = /https?:\/\/xhslink\.(?:com|cn)\//.test(rawShareContent)
    ? await parseShortLink(rawShareContent, signal)
    : rawShareContent;
  const info = extractPostInfo(content);
  const cookie = localStorage.getItem('xhs_cookie') || '';
  const response = await fetch(`${BASE_URL}/api/fetchXhsImageUrls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...info, cookie }),
    signal,
  });
  const data = await readJsonResponse(response, '帖子提取');
  if (!isXhsImageResponse(data)) throw new Error('小红书接口返回了无效的图片数据');
  if (data.images.length === 0) throw new Error('该帖子没有可提取的图片');

  const images: Blob[] = [];
  let failedCount = 0;
  let firstError: unknown;
  // Limit simultaneous downloads and HEIC conversions on mobile devices.
  for (let offset = 0; offset < data.images.length; offset += 3) {
    signal?.throwIfAborted();
    const results = await Promise.allSettled(
      data.images.slice(offset, offset + 3).map((url) => fetchImage(url, signal))
    );
    signal?.throwIfAborted();
    for (const result of results) {
      if (result.status === 'fulfilled') images.push(result.value);
      else {
        failedCount += 1;
        firstError ??= result.reason;
      }
    }
  }
  if (images.length === 0) {
    throw firstError instanceof Error ? firstError : new Error('图片加载失败，请重试');
  }
  return { images, failedCount };
};

export const useGetXhsImages = (shareContent: string, cookieRevision: number) => {
  const query = useQuery({
    // A revision invalidates credentials without storing the Cookie in query keys.
    queryKey: ['xiaohongshu', shareContent, cookieRevision],
    queryFn: ({ signal }) => getXhsImages(shareContent, signal),
    enabled: shareContent.trim().length > 0,
    staleTime: 60 * 60 * 1000,
    gcTime: 0,
    retry: false,
  });
  const [display, setDisplay] = useState<{ data: XhsImages; urls: string[] } | null>(null);
  useEffect(() => {
    if (!query.data || query.error) {
      setDisplay(null);
      return;
    }
    const urls = query.data.images.map((blob) => URL.createObjectURL(blob));
    setDisplay({ data: query.data, urls });
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [query.data, query.error]);

  return {
    imageUrls: display?.data === query.data ? (display?.urls ?? []) : [],
    failedCount: query.data?.failedCount ?? 0,
    isLoading: query.isFetching,
    error: query.error,
    retry: query.refetch,
  };
};
