import { useQuery } from '@tanstack/react-query';
import heic2any from 'heic2any';

import { BASE_URL } from '../utils/constants';

interface PostInfo {
  postId: string;
  xsecToken: string;
}

interface XhsImageResponse {
  images: string[];
}

const isXhsImageResponse = (value: unknown): value is XhsImageResponse => {
  if (typeof value !== 'object' || value === null || !('images' in value)) return false;
  return Array.isArray(value.images) && value.images.every((image) => typeof image === 'string');
};

const getResponseError = (value: unknown): string | null => {
  if (typeof value !== 'object' || value === null || !('error' in value)) return null;
  return typeof value.error === 'string' ? value.error : null;
};

/**
 * 检查内容是否包含小红书短链接
 */
const isShortLink = (input: string): boolean => {
  return /https?:\/\/xhslink\.(?:com|cn)\/[a-zA-Z0-9\/]+/.test(input);
};

/**
 * 解析短链接获取完整链接
 */
const parseShortLink = async (content: string): Promise<string | null> => {
  try {
    const res = await fetch(`${BASE_URL}/api/parseXhsShort?content=${encodeURIComponent(content)}`);
    const data = await res.json();

    if (data.fullLink) {
      return data.fullLink;
    }
    return null;
  } catch (err) {
    console.error('解析短链接失败', err);
    return null;
  }
};

/**
 * 从复杂的分享文本或直接 URL 中提取 ID 和 Token
 */
const extractPostInfo = (input: string): PostInfo | null => {
  // 提取 URL 部分
  const urlRegex = /https?:\/\/(www\.)?xiaohongshu\.com\/[^\s?]+(\?[^\s]*)?/;
  const match = input.match(urlRegex);
  if (!match) return null;

  const urlObj = new URL(match[0]);
  const path = urlObj.pathname;

  // 提取 Post ID (兼容 explore, discovery/item, user/profile)
  const idMatch = path.match(/(?:explore|item|profile)\/([a-z0-9]+)/i);
  const postId = idMatch ? idMatch[1] : null;

  // 提取 xsec_token
  const xsecToken = urlObj.searchParams.get('xsec_token');

  if (!postId || !xsecToken) return null;

  return { postId, xsecToken };
};

const heicToJpg = async (response: Response): Promise<string> => {
  const heicBlob = await response.blob();
  const convertedBlob = await heic2any({
    blob: heicBlob,
    toType: 'image/png',
  });
  const finalBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
  return URL.createObjectURL(finalBlob);
};

const checkAndConvertHeic = async (imageUrl: string): Promise<string> => {
  const proxyUrl = `${BASE_URL}/api/getXhsSourceImage?url=${encodeURIComponent(imageUrl)}`;
  const response = await fetch(proxyUrl);

  if (!response.ok) throw new Error('Failed to fetch image');

  const contentType = response.headers.get('content-type') || '';
  const isHeic = contentType.includes('image/heic') || contentType.includes('image/heif');

  if (isHeic) {
    return heicToJpg(response);
  }

  return imageUrl;
};

/**
 * 获取小红书帖子的图片 URL，分两步：
 * 1. 调用 /api/fetchXhsImageUrls —— 服务端通过 postId + xsecToken 请求小红书接口，
 *    拿到原始图片 URL 列表（需要携带 cookie 和反爬参数，必须在服务端完成）。
 * 2. 调用 /api/getXhsSourceImage —— 逐张代理拉取图片二进制流，
 *    解决浏览器直接请求小红书 CDN 的跨域问题，
 *    同时根据 content-type 检测 HEIC 格式并就地转换为 PNG。
 */
export const getXhsImageUrls = async (rawShareContent: string): Promise<string[]> => {
  let contentToProcess = rawShareContent;

  // 如果是短链接，先解析获取完整链接
  if (isShortLink(rawShareContent)) {
    const fullLink = await parseShortLink(rawShareContent);
    if (!fullLink) {
      console.log('短链接解析失败');
      return [];
    }
    contentToProcess = fullLink;
  }

  const info = extractPostInfo(contentToProcess);

  if (!info) {
    console.log('无效链接');
    return [];
  }

  const cookie = localStorage.getItem('xhs_cookie') || '';
  const res = await fetch(`${BASE_URL}/api/fetchXhsImageUrls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postId: info.postId, xsecToken: info.xsecToken, cookie }),
  });
  const data: unknown = await res.json();

  if (!res.ok) {
    throw new Error(getResponseError(data) || `请求失败（HTTP ${res.status}）`);
  }

  if (!isXhsImageResponse(data)) throw new Error('小红书接口返回了无效的图片数据');
  if (data.images.length === 0) return [];

  return Promise.all(data.images.map((url) => checkAndConvertHeic(url)));
};

export const useGetXhsImages = (shareContent: string) => {
  const {
    data: imageUrls,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['xiaohongshu', shareContent],
    queryFn: async () => {
      return await getXhsImageUrls(shareContent);
    },
    enabled: shareContent.length > 0,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });

  return {
    imageUrls: imageUrls || [],
    isLoading,
    error,
  };
};
