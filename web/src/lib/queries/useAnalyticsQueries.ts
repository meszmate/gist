import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api';
import { queryKeys } from './queryKeys';

export function useAnalyticsOverview() {
  return useQuery({
    queryKey: queryKeys.analytics.overview(),
    queryFn: async () => {
      const response = await analyticsApi.getOverview();
      return response.data;
    },
  });
}

export function useStreakData() {
  return useQuery({
    queryKey: queryKeys.analytics.streak(),
    queryFn: async () => {
      const response = await analyticsApi.getStreak();
      return response.data;
    },
  });
}

export function useActivityData() {
  return useQuery({
    queryKey: queryKeys.analytics.activity(),
    queryFn: async () => {
      const response = await analyticsApi.getActivity();
      return response.data;
    },
  });
}

export function useProgressData() {
  return useQuery({
    queryKey: queryKeys.analytics.progress(),
    queryFn: async () => {
      const response = await analyticsApi.getProgress();
      return response.data;
    },
  });
}
