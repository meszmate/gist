import axios, { AxiosError, AxiosInstance } from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Create axios instance with default config
export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;

    // Handle 401 - try to refresh token
    if (error.response?.status === 401 && originalRequest && !(originalRequest as { _retry?: boolean })._retry) {
      (originalRequest as { _retry?: boolean })._retry = true;

      try {
        await api.post('/auth/refresh');
        return api(originalRequest);
      } catch {
        // Refresh failed, redirect to login
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    // Handle rate limit
    if (error.response?.status === 429) {
      const data = error.response.data as { message?: string; reset_at?: string };
      toast.error(data.message || 'Rate limit exceeded. Please try again later.');
    }

    return Promise.reject(error);
  }
);

// Types
export interface Material {
  id: string;
  user_id: string;
  folder_id?: string;
  title: string;
  summary: string;
  original_content?: string;
  difficulty: 'beginner' | 'standard' | 'advanced';
  is_public: boolean;
  share_token?: string;
  created_at: string;
  updated_at: string;
  flashcards?: Flashcard[];
  quiz_questions?: QuizQuestion[];
  tags?: Tag[];
}

export interface Flashcard {
  id: string;
  study_material_id: string;
  question: string;
  answer: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_date?: string;
  last_reviewed_at?: string;
}

export interface QuizQuestion {
  id: string;
  study_material_id: string;
  question: string;
  options: string[];
  correct: string;
}

export interface Folder {
  id: string;
  user_id: string;
  parent_id?: string;
  name: string;
  color: string;
  children?: Folder[];
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
}

export interface DueCardsResponse {
  cards: Flashcard[];
  total_due: number;
  material_id?: string;
}

export interface SRSStats {
  total_cards: number;
  due_today: number;
  new_cards: number;
  learned_cards: number;
  mature_cards: number;
  average_ease: number;
  reviewed_today: number;
}

export interface AnalyticsOverview {
  total_materials: number;
  total_flashcards: number;
  total_quizzes: number;
  cards_reviewed_today: number;
  current_streak: number;
  longest_streak: number;
  average_quiz_score: number;
  total_study_time: number;
  due_cards_count: number;
}

export interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_active?: string;
  calendar: CalendarDay[];
}

export interface CalendarDay {
  date: string;
  cards_reviewed: number;
  study_time_mins: number;
  has_activity: boolean;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  study_material_id?: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

// API functions
export const materialsApi = {
  list: (params?: { folder_id?: string; search?: string }) =>
    api.get<{ materials: Material[]; total: number }>('/materials', { params }),
  get: (id: string) => api.get<Material>(`/materials/${id}`),
  create: (data: {
    prompt: string;
    summary?: boolean;
    flashcards?: boolean;
    quiz?: boolean;
    difficulty?: string;
    flashcard_count?: number;
    quiz_count?: number;
    folder_id?: string;
  }) => api.post<Material>('/materials', data),
  update: (id: string, data: Partial<Material>) => api.patch<Material>(`/materials/${id}`, data),
  delete: (id: string) => api.delete(`/materials/${id}`),
  share: (id: string) => api.post<{ share_token: string; share_url: string }>(`/materials/${id}/share`),
};

export const flashcardsApi = {
  add: (materialId: string, data: { question: string; answer: string }) =>
    api.post<Flashcard>(`/materials/${materialId}/flashcards`, data),
  update: (materialId: string, cardId: string, data: Partial<Flashcard>) =>
    api.patch<Flashcard>(`/materials/${materialId}/flashcards/${cardId}`, data),
  delete: (materialId: string, cardId: string) =>
    api.delete(`/materials/${materialId}/flashcards/${cardId}`),
};

export const quizApi = {
  add: (materialId: string, data: { question: string; options: string[]; correct: string }) =>
    api.post<QuizQuestion>(`/materials/${materialId}/quiz`, data),
  update: (materialId: string, qId: string, data: Partial<QuizQuestion>) =>
    api.patch<QuizQuestion>(`/materials/${materialId}/quiz/${qId}`, data),
  delete: (materialId: string, qId: string) =>
    api.delete(`/materials/${materialId}/quiz/${qId}`),
  submit: (materialId: string, answers: Record<string, string>) =>
    api.post<{
      total_questions: number;
      correct_answers: number;
      score: number;
      results: { question_id: string; user_answer: string; correct_answer: string; is_correct: boolean }[];
    }>(`/materials/${materialId}/quiz/submit`, { answers }),
};

export const srsApi = {
  getDue: () => api.get<DueCardsResponse>('/srs/due'),
  getDueByMaterial: (materialId: string) =>
    api.get<DueCardsResponse>(`/srs/due/${materialId}`),
  review: (cardId: string, rating: number) =>
    api.post<{ card_id: string; ease_factor: number; interval_days: number; next_review_date: string }>(
      '/srs/review',
      { card_id: cardId, rating }
    ),
  getStats: () => api.get<SRSStats>('/srs/stats'),
};

export const foldersApi = {
  list: () => api.get<{ folders: Folder[] }>('/folders'),
  create: (data: { name: string; parent_id?: string; color?: string }) =>
    api.post<Folder>('/folders', data),
  update: (id: string, data: Partial<Folder>) => api.patch<Folder>(`/folders/${id}`, data),
  delete: (id: string) => api.delete(`/folders/${id}`),
};

export const tagsApi = {
  list: () => api.get<{ tags: Tag[] }>('/tags'),
  create: (data: { name: string; color?: string }) => api.post<Tag>('/tags', data),
  update: (id: string, data: Partial<Tag>) => api.patch<Tag>(`/tags/${id}`, data),
  delete: (id: string) => api.delete(`/tags/${id}`),
};

export const analyticsApi = {
  getOverview: () => api.get<AnalyticsOverview>('/analytics/overview'),
  getStreak: () => api.get<StreakData>('/analytics/streak'),
  getActivity: () => api.get<{ calendar: CalendarDay[] }>('/analytics/activity'),
  getProgress: () =>
    api.get<{
      weekly_cards: { date: string; value: number }[];
      weekly_scores: { date: string; value: number }[];
      weekly_time: { date: string; value: number }[];
      weak_topics: { material_id: string; material_name: string; avg_ease_factor: number; due_cards: number }[];
    }>('/analytics/progress'),
};

export const chatApi = {
  getHistory: (materialId: string) =>
    api.get<{ messages: ChatMessage[]; material_id?: string; material_name: string }>(
      `/chat/${materialId}`
    ),
  sendMessage: (materialId: string, content: string) => {
    // For SSE streaming, use fetch instead of axios
    return fetch(`${API_URL}/chat/${materialId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ content }),
    });
  },
  clearHistory: (materialId: string) => api.delete(`/chat/${materialId}`),
};

export const exportApi = {
  anki: (id: string) => `${API_URL}/export/anki/${id}`,
  pdf: (id: string) => `${API_URL}/export/pdf/${id}`,
};

export const sharedApi = {
  get: (token: string) => api.get<Material>(`/shared/${token}`),
};
