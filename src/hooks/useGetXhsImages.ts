import { useQuery } from '@tanstack/react-query';
import { getImageUrls } from '@/utils/xiaohongshuExtract';

interface UseXiaohongshuImagesOptions {
  enabled?: boolean;
}

export const ussGetXhsImages = (
  shareContent: string,
  options: UseXiaohongshuImagesOptions = {}
) => {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['xiaohongshu', shareContent],
    queryFn: () => getImageUrls(shareContent),
    enabled: enabled && shareContent.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};
