// Centralized query key factory for TanStack Query
export const queryKeys = {
  // Analytics
  analytics: {
    all: ['analytics'] as const,
    overview: () => [...queryKeys.analytics.all, 'overview'] as const,
    streak: () => [...queryKeys.analytics.all, 'streak'] as const,
    activity: () => [...queryKeys.analytics.all, 'activity'] as const,
    progress: () => [...queryKeys.analytics.all, 'progress'] as const,
  },

  // SRS (Spaced Repetition System)
  srs: {
    all: ['srs'] as const,
    stats: () => [...queryKeys.srs.all, 'stats'] as const,
    due: () => [...queryKeys.srs.all, 'due'] as const,
    dueByMaterial: (materialId: string) => [...queryKeys.srs.all, 'due', materialId] as const,
  },

  // Materials
  materials: {
    all: ['materials'] as const,
    list: (params?: { folder_id?: string; search?: string }) =>
      [...queryKeys.materials.all, 'list', params] as const,
    detail: (id: string) => [...queryKeys.materials.all, 'detail', id] as const,
  },

  // Folders
  folders: {
    all: ['folders'] as const,
    list: () => [...queryKeys.folders.all, 'list'] as const,
  },

  // Tags
  tags: {
    all: ['tags'] as const,
    list: () => [...queryKeys.tags.all, 'list'] as const,
  },

  // Chat
  chat: {
    all: ['chat'] as const,
    history: (materialId: string) => [...queryKeys.chat.all, 'history', materialId] as const,
  },

  // Shared
  shared: {
    all: ['shared'] as const,
    get: (token: string) => [...queryKeys.shared.all, token] as const,
  },
};
