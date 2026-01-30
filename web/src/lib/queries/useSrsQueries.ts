import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { srsApi } from '@/lib/api';
import { queryKeys } from './queryKeys';

export function useSrsStats() {
  return useQuery({
    queryKey: queryKeys.srs.stats(),
    queryFn: async () => {
      const response = await srsApi.getStats();
      return response.data;
    },
  });
}

export function useDueCards(materialId?: string) {
  return useQuery({
    queryKey: materialId ? queryKeys.srs.dueByMaterial(materialId) : queryKeys.srs.due(),
    queryFn: async () => {
      const response = materialId
        ? await srsApi.getDueByMaterial(materialId)
        : await srsApi.getDue();
      return response.data;
    },
  });
}

export function useReviewCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ cardId, rating }: { cardId: string; rating: number }) => {
      const response = await srsApi.review(cardId, rating);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate due cards and stats after review
      queryClient.invalidateQueries({ queryKey: queryKeys.srs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.overview() });
    },
  });
}
