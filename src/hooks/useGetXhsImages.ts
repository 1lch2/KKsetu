import { useQuery } from '@tanstack/react-query';
import { getXhsImageUrls } from '@/utils/xiaohongshuExtract';

interface UseXiaohongshuImagesOptions {
  enabled?: boolean;
}

export const useGetXhsImages = (
  shareContent: string,
  options: UseXiaohongshuImagesOptions = {}
) => {
  const { enabled = true } = options;

  const {
    data: imageUrls,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['xiaohongshu', shareContent],
    queryFn: async () => {
      return await getXhsImageUrls(shareContent);
    },
    enabled: enabled && shareContent.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  return {
    imageUrls: imageUrls || [],
    isLoading,
    error,
  };
};
