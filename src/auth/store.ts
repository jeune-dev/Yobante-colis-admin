import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Utilisateur {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  telephone?: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  utilisateur: Utilisateur | null;
  setSession: (access: string, refresh: string | undefined, u?: Utilisateur) => void;
  clear: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      utilisateur: null,
      setSession: (accessToken, refreshToken, utilisateur) =>
        set((s) => ({
          accessToken,
          refreshToken: refreshToken ?? s.refreshToken,
          utilisateur: utilisateur ?? s.utilisateur,
        })),
      clear: () => set({ accessToken: null, refreshToken: null, utilisateur: null }),
    }),
    { name: 'yobante-colis-admin-auth' }
  )
);

export const ROLES_ADMIN = ['admin', 'super_admin'];
export const estAdmin = (u: Utilisateur | null) => ROLES_ADMIN.includes(u?.role ?? '');
export const estSuperAdmin = (u: Utilisateur | null) => u?.role === 'super_admin';
