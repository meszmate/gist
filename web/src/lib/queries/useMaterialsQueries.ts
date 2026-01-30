import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { materialsApi, foldersApi, tagsApi } from '@/lib/api';
import type { Material, Folder, Tag } from '@/lib/api';
import { queryKeys } from './queryKeys';

// Materials queries
export function useMaterials(params?: { folder_id?: string; search?: string }) {
  return useQuery({
    queryKey: queryKeys.materials.list(params),
    queryFn: async () => {
      const response = await materialsApi.list(params);
      return response.data;
    },
  });
}

export function useMaterial(id: string) {
  return useQuery({
    queryKey: queryKeys.materials.detail(id),
    queryFn: async () => {
      const response = await materialsApi.get(id);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useDeleteMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await materialsApi.delete(id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.materials.all });
    },
  });
}

export function useShareMaterial() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await materialsApi.share(id);
      return response.data;
    },
  });
}

export function useUpdateMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Material> }) => {
      const response = await materialsApi.update(id, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.materials.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.materials.list() });
    },
  });
}

// Folders queries
export function useFolders() {
  return useQuery({
    queryKey: queryKeys.folders.list(),
    queryFn: async () => {
      const response = await foldersApi.list();
      return response.data;
    },
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; parent_id?: string; color?: string }) => {
      const response = await foldersApi.create(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.folders.all });
    },
  });
}

export function useUpdateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Folder> }) => {
      const response = await foldersApi.update(id, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.folders.all });
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await foldersApi.delete(id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.folders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.materials.all });
    },
  });
}

// Tags queries
export function useTags() {
  return useQuery({
    queryKey: queryKeys.tags.list(),
    queryFn: async () => {
      const response = await tagsApi.list();
      return response.data;
    },
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; color?: string }) => {
      const response = await tagsApi.create(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
    },
  });
}

export function useUpdateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Tag> }) => {
      const response = await tagsApi.update(id, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await tagsApi.delete(id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
    },
  });
}
