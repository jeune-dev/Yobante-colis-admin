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

export const CLE_SESSION = 'yobante-colis-admin-auth';

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
    { name: CLE_SESSION }
  )
);

// Synchronisation entre onglets : le refresh token est à usage unique. Sans cela, un
// onglet garderait en mémoire un jeton déjà consommé par un autre et serait déconnecté
// à son prochain rafraîchissement ; une déconnexion est aussi répercutée partout.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === CLE_SESSION) void useAuth.persist.rehydrate();
  });
}

export const ROLES_ADMIN = ['admin', 'super_admin'];
export const estAdmin = (u: Utilisateur | null) => ROLES_ADMIN.includes(u?.role ?? '');
export const estSuperAdmin = (u: Utilisateur | null) => u?.role === 'super_admin';
