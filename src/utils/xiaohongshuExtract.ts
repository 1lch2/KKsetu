import heic2any from 'heic2any';
import { BASE_URL } from './constants';

interface PostInfo {
  postId: string;
  xsecToken: string;
}

/**
 * 检查内容是否包含小红书短链接
 */
const isShortLink = (input: string): boolean => {
  return /https?:\/\/xhslink\.com\/[a-zA-Z0-9\/]+/.test(input);
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

const heicToJpg = async (response: Response) => {
  const heicBlob = await response.blob();
  const convertedBlob = await heic2any({
    blob: heicBlob,
    toType: 'image/png',
  });
  const finalBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
  return URL.createObjectURL(finalBlob);
};

/**
 * Fetch xiaohongshu image
 * @param urls Xiaohongshu image URLs
 */
const fetchSourceImagesFromUrls = async (urls: string[]): Promise<string[]> => {
  const results: string[] = [];

  for (const url of urls) {
    try {
      const proxyUrl = `${BASE_URL}/api/getXhsSourceImage?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);

      if (!response.ok) throw new Error('Download failed');

      const contentType = response.headers.get('content-type') || '';
      const isHeic = contentType.includes('image/heic') || contentType.includes('image/heif');

      if (isHeic) {
        const imageUrl = await heicToJpg(response);
        results.push(imageUrl);
      } else {
        // For non-HEIC images, return the original URL
        results.push(url);
      }
    } catch (err) {
      console.error('Conversion failed:', err);
    }
  }

  return results;
};

export const getXhsImageUrls = async (rawShareContent: string) => {
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

  try {
    const res = await fetch(
      `${BASE_URL}/api/fetchXhsImageUrls?postId=${info.postId}&xsecToken=${info.xsecToken}`
    );
    const data = await res.json();

    if (data.images) {
      return fetchSourceImagesFromUrls(data.images);
    }
  } catch (err) {
    console.error('请求失败', err);
  }
};
