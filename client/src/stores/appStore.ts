import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format } from 'date-fns';
import type { Profile, Category } from '../lib/api';

interface AppState {
  profiles: Profile[];
  activeProfileId: number;
  selectedDate: string;
  categories: Category[];
  setProfiles: (profiles: Profile[]) => void;
  setActiveProfile: (id: number) => void;
  setSelectedDate: (date: string) => void;
  setCategories: (categories: Category[]) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      profiles: [],
      activeProfileId: 1,
      selectedDate: format(new Date(), 'yyyy-MM-dd'),
      categories: [],
      setProfiles: (profiles) => set({ profiles }),
      setActiveProfile: (id) => set({ activeProfileId: id }),
      setSelectedDate: (date) => set({ selectedDate: date }),
      setCategories: (categories) => set({ categories }),
    }),
    {
      name: 'pulse-app-storage',
      partialize: (state) => ({ activeProfileId: state.activeProfileId }),
    }
  )
);
