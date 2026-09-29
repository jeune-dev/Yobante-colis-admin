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

/**
 * API servie sous la même origine (/api derrière Nginx ou le proxy Vite) : le backend
 * pose le refresh token dans un cookie httpOnly (sameSite strict) que le navigateur
 * renvoie seul. Inutile — et risqué en cas de XSS — de le garder aussi en localStorage.
 * Si l'API est sur un autre site (VITE_API_URL absolue, ex. Render), le cookie
 * sameSite strict n'est pas envoyé : le jeton reste alors conservé côté client.
 */
export const REFRESH_PAR_COOKIE = !/^https?:\/\//i.test(import.meta.env.VITE_API_URL || '');

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      utilisateur: null,
      setSession: (accessToken, refreshToken, utilisateur) =>
        set((s) => ({
          accessToken,
          refreshToken: REFRESH_PAR_COOKIE ? null : refreshToken ?? s.refreshToken,
          utilisateur: utilisateur ?? s.utilisateur,
        })),
      clear: () => set({ accessToken: null, refreshToken: null, utilisateur: null }),
    }),
    {
      name: CLE_SESSION,
      partialize: (s) => ({
        accessToken: s.accessToken,
        refreshToken: REFRESH_PAR_COOKIE ? null : s.refreshToken,
        utilisateur: s.utilisateur,
      }),
    }
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

/**
 * Appelle `purger` quand la session se termine (déconnexion, expiration, autre onglet)
 * ou change de titulaire : les données en cache d'un compte ne doivent pas rester
 * visibles — via « retour » ou le compte suivant sur le même poste.
 */
export function surFinDeSession(purger: () => void) {
  return useAuth.subscribe((s, prec) => {
    const finie = !!prec.accessToken && !s.accessToken;
    const autreCompte = !!prec.utilisateur && !!s.utilisateur && prec.utilisateur.id !== s.utilisateur.id;
    if (finie || autreCompte) purger();
  });
}

export const ROLES_ADMIN = ['admin', 'super_admin'];
export const estAdmin = (u: Utilisateur | null) => ROLES_ADMIN.includes(u?.role ?? '');
export const estSuperAdmin = (u: Utilisateur | null) => u?.role === 'super_admin';
