/**
 * 小红书原图提取工具
 */

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
    const res = await fetch(
      `${BASE_URL}/api/parse?content=${encodeURIComponent(content)}`
    );
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

export const getImageUrls = async (rawShareContent: string) => {
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
      `${BASE_URL}/api/fetch-xhs?postId=${info.postId}&xsecToken=${info.xsecToken}`
    );
    const data = await res.json();

    if (data.images) {
      return data.images;
    }
  } catch (err) {
    console.error('请求失败', err);
  }
};

/**
 * 1. 信息提取器：从复杂的分享文本或直接 URL 中提取 ID 和 Token
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

/**
 * 2. URL 转换器：将预览图/CDN地址转换为高清原图地址 (基于 Ruby 逻辑)
 */
export const getOriginalImageUrl = (sampleUrl: string): string => {
  try {
    const url = new URL(sampleUrl);
    const { hostname, pathname } = url;

    // 情况 A: xhscdn.com 格式转换
    if (hostname.includes('xhscdn.com')) {
      const segments = pathname.split('/').filter(Boolean);
      // 提取最后一节并去掉 ! 后缀
      const lastSegment = segments[segments.length - 1];
      const imageId = lastSegment.split('!')[0];

      // 检查路径中是否包含 spectrum 等子目录
      const subdirs = segments.slice(2, -1); // 跳过日期和哈希段

      const pathParts = [...subdirs, imageId].join('/');
      return `https://ci.xiaohongshu.com/${pathParts}`;
    }

    // 情况 B: ci.xiaohongshu.com 格式
    if (hostname === 'ci.xiaohongshu.com') {
      return `${url.origin}${pathname}`;
    }

    // 情况 C: 头像格式
    if (hostname === 'img.xiaohongshu.com' && pathname.includes('/avatar/')) {
      const avatarId = pathname.split('/').pop()?.split('@')[0];
      return `https://img.xiaohongshu.com/avatar/${avatarId}`;
    }

    return sampleUrl;
  } catch {
    return sampleUrl;
  }
};

/**
 * 3. 数据获取器：获取帖子详情（包含图片列表）
 * 注意：在浏览器环境直接请求会有 CORS 限制，通常需要后端代理或使用特定 Header
 */
export const fetchPostImages = async (info: PostInfo): Promise<string[]> => {
  const { postId, xsecToken } = info;

  // 小红书 Web 端常用的详情接口 (示例地址，实际可能随平台更新变化)
  const apiUrl = `https://www.xiaohongshu.com/explore/${postId}?xsec_token=${xsecToken}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    const html = await response.text();

    // 从 HTML 的 window.__INITIAL_STATE__ 中提取数据 (这是 Web 端最简单的提取方式)
    const stateRegex = /window\.__INITIAL_STATE__\s*=\s*({.*?});/s;
    const stateMatch = html.match(stateRegex);

    if (stateMatch) {
      const state = JSON.parse(stateMatch[1].replace(/undefined/g, 'null'));
      const noteData = state.note?.noteDetailMap?.[postId]?.note;

      if (noteData && noteData.imageList) {
        // 提取所有预览图并转换为原图
        return noteData.imageList.map((img: any) => getOriginalImageUrl(img.urlDefault || img.url));
      }
    }
    return [];
  } catch (error) {
    console.error('Failed to fetch XHS images:', error);
    return [];
  }
};
