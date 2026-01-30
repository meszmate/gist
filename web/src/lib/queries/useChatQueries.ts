import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '@/lib/api';
import { queryKeys } from './queryKeys';

export function useChatHistory(materialId: string) {
  return useQuery({
    queryKey: queryKeys.chat.history(materialId),
    queryFn: async () => {
      const response = await chatApi.getHistory(materialId);
      return response.data;
    },
    enabled: !!materialId,
  });
}

export function useClearChatHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (materialId: string) => {
      await chatApi.clearHistory(materialId);
      return materialId;
    },
    onSuccess: (materialId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.history(materialId) });
    },
  });
}
