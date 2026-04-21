import { useQuery } from '@tanstack/react-query';
import { getXhsImageUrls } from '@/utils/xiaohongshuExtract';

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
