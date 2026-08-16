import { useQuery } from '@tanstack/react-query';

import { BASE_URL } from '@utils/constants';

interface SklandApiErrorBody {
  error?: {
    code?: string;
    message?: string;
  };
}

interface SklandImagesResponse {
  articleId: string;
  title?: string;
  images: string[];
}

const SUPPORTED_HOSTS = new Set(['www.skland.com', 'm.skland.com']);
const SUPPORTED_PATHS = new Set(['/article', '/h/detail']);

export class SklandRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SklandRequestError';
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

export const parseSklandArticleId = (input: string): string | null => {
  if (input.length === 0 || input.length > 2048) return null;

  try {
    const url = new URL(input);
    const ids = url.searchParams.getAll('id');
    if (
      url.protocol !== 'https:' ||
      !SUPPORTED_HOSTS.has(url.hostname) ||
      !SUPPORTED_PATHS.has(url.pathname) ||
      ids.length !== 1 ||
      !/^\d+$/.test(ids[0])
    ) {
      return null;
    }
    return ids[0];
  } catch {
    return null;
  }
};

const parseResponse = (value: unknown): SklandImagesResponse | null => {
  if (!isRecord(value) || typeof value.articleId !== 'string' || !Array.isArray(value.images)) {
    return null;
  }
  if (!value.images.every((image) => typeof image === 'string')) return null;
  if (value.title !== undefined && typeof value.title !== 'string') return null;

  return {
    articleId: value.articleId,
    ...(typeof value.title === 'string' ? { title: value.title } : {}),
    images: value.images,
  };
};

const getErrorMessage = (value: unknown): string => {
  if (!isRecord(value)) return '请求失败，请稍后重试';
  const body: SklandApiErrorBody = value;
  return body.error?.message || '请求失败，请稍后重试';
};

export const getSklandImages = async (articleId: string): Promise<SklandImagesResponse> => {
  const url = `https://www.skland.com/article?id=${articleId}`;
  const response = await fetch(`${BASE_URL}/api/fetchSklandImageUrls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new SklandRequestError('服务返回了无法识别的数据');
  }

  if (!response.ok) throw new SklandRequestError(getErrorMessage(body));

  const parsed = parseResponse(body);
  if (!parsed) throw new SklandRequestError('服务返回了无法识别的数据');
  return parsed;
};

export const useGetSklandImages = (articleId: string | null) => {
  const query = useQuery({
    queryKey: ['skland', articleId],
    queryFn: () => getSklandImages(articleId ?? ''),
    enabled: articleId !== null,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return {
    imageUrls: query.data?.images ?? [],
    title: query.data?.title,
    isLoading: query.isLoading,
    refetch: query.refetch,
    errorMessage:
      query.error instanceof SklandRequestError
        ? query.error.message
        : query.error
          ? '请求失败，请稍后重试'
          : undefined,
  };
};
