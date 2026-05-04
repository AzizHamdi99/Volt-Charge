import { create } from "zustand";

interface User {
  name: string;
  email: string;
  keycloakId: string;
  role: "admin" | "user";
}

interface AuthStore {
  user: User | null;
  setUser: (user: User) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));