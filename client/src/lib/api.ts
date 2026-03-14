const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface Profile {
  id: number;
  name: string;
  avatar: string;
  created_at: string;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}

export interface Category {
  id: number;
  name: string;
  color: string;
  icon: string;
  description: string;
  sort_order: number;
  subcategories: Subcategory[];
}

export interface Subcategory {
  id: number;
  category_id: number;
  name: string;
  icon: string;
}

export interface Entry {
  id: number;
  profile_id: number;
  subcategory_id: number;
  date: string;
  start_time: string | null;
  duration_minutes: number;
  tags: string;
  note: string | null;
  is_active?: boolean;
  created_at: string;
  subcategory_name?: string;
  subcategory_icon?: string;
  category_name?: string;
  category_color?: string;
  category_icon?: string;
  category_id?: number;
}

export interface DailyStat {
  id: number;
  name: string;
  color: string;
  icon: string;
  total_minutes: number;
}

export interface FrequentActivity {
  subcategory_id: number;
  subcategory_name: string;
  subcategory_icon: string;
  category_id: number;
  category_name: string;
  category_color: string;
  category_icon: string;
  use_count: string;
}

export const api = {
  getProfiles: () => request<Profile[]>('/profiles'),
  updateProfile: (id: number, data: Partial<Profile>) => request<Profile>(`/profiles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getCategories: () => request<Category[]>('/categories'),
  getFrequentActivities: (profileId: number) =>
    request<FrequentActivity[]>(`/entries/frequent?profile_id=${profileId}`),
  getEntries: (profileId: number, date: string) =>
    request<Entry[]>(`/entries?profile_id=${profileId}&date=${date}`),
  createEntry: (data: {
    profile_id: number;
    subcategory_id: number;
    date: string;
    start_time?: string;
    duration_minutes?: number;
    tags?: string[];
    note?: string;
  }) => request<any>('/entries', { method: 'POST', body: JSON.stringify(data) }),
  updateEntry: (id: number, data: Partial<Entry>) =>
    request<Entry>(`/entries/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  startEntry: (data: { profile_id: number; subcategory_id: number; date: string; start_time: string; tags?: string[]; note?: string }) =>
    request<Entry>('/entries', { method: 'POST', body: JSON.stringify({ ...data, duration_minutes: 15, is_active: true }) }),
  finishEntry: (id: number) => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return request<Entry>(`/entries/${id}/finish`, {
      method: 'POST',
      body: JSON.stringify({ end_time: `${hh}:${mm}` }),
    });
  },
  deleteEntry: (id: number) =>
    request<void>(`/entries/${id}`, { method: 'DELETE' }),
  getDailyStats: (profileId: number, date: string) =>
    request<DailyStat[]>(`/stats/daily?profile_id=${profileId}&date=${date}`),
  getWeeklyStats: (profileId: number, startDate: string, endDate: string) =>
    request<any>(`/stats/weekly?profile_id=${profileId}&start_date=${startDate}&end_date=${endDate}`),
  getInsight: (profileId: number, startDate: string, endDate: string) =>
    request<{ insight: string | null; generatedAt?: string }>(`/insights/weekly?profile_id=${profileId}&start_date=${startDate}&end_date=${endDate}`),
  generateInsight: (profileId: number, startDate: string, endDate: string, content: string) =>
    request<{ insight: string; generatedAt: string }>('/insights/weekly', {
      method: 'POST',
      body: JSON.stringify({ profile_id: profileId, start_date: startDate, end_date: endDate, content }),
    }),
  createCategory: (data: { name: string; color: string; icon: string; description?: string }) =>
    request<Category>('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: number, data: { name: string; color: string; icon: string; description?: string }) =>
    request<Category>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id: number) =>
    request<void>(`/categories/${id}`, { method: 'DELETE' }),
  createSubcategory: (data: { category_id: number; name: string; icon: string }) =>
    request<Subcategory>('/subcategories', { method: 'POST', body: JSON.stringify(data) }),
  deleteSubcategory: (id: number) =>
    request<void>(`/subcategories/${id}`, { method: 'DELETE' }),
};
