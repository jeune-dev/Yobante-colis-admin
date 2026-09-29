import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import { ROLES_ADMIN, useAuth } from '@/auth/store';
import { R } from '@/lib/routes';

export const API_URL = import.meta.env.VITE_API_URL || '/api';

/** Erreur normalisée renvoyée par tous les appels : message lisible + code HTTP. */
export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

// Sans délai, une requête bloquée (réseau mobile, backend figé) laisse un bouton
// « Envoi… » indéfiniment ; les téléversements disposent d'un délai plus long.
export const DELAI_MS = 30_000;
export const DELAI_UPLOAD_MS = 120_000;

/** Exporté pour les tests (adaptateur simulé) ; les écrans passent par `api`. */
export const http = axios.create({ baseURL: API_URL, withCredentials: true, timeout: DELAI_MS });

// Routes d'authentification appelées sans session valide : un 401 y signifie
// « identifiants refusés », pas « jeton expiré ». Les autres (change-password…)
// exigent un jeton et doivent pouvoir le rafraîchir comme n'importe quel appel.
const AUTH_PUBLIQUES = ['/auth/login', '/auth/refresh-token', '/auth/logout', '/auth/forgot-password', '/auth/reset-password'];

/** Messages affichés quand le backend ne fournit pas d'explication exploitable. */
const MESSAGES_STATUT: Record<number, string> = {
  401: 'Votre session a expiré. Reconnectez-vous.',
  403: "Vous n'avez pas les droits nécessaires pour cette action.",
  404: 'Élément introuvable : il a peut-être été supprimé.',
  409: 'Conflit : cette donnée a été modifiée entre-temps. Rechargez la page.',
  413: 'Fichier trop volumineux.',
  429: 'Trop de requêtes : patientez quelques minutes.',
};

export const messageHttp = (status?: number, messageApi?: string, code?: string) => {
  if (code === 'ECONNABORTED' || code === 'ETIMEDOUT') return 'Le serveur met trop de temps à répondre. Réessayez.';
  if (!status) return "Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.";
  if (status === 429) return MESSAGES_STATUT[429];
  // Les erreurs 5xx n'exposent pas de détail technique à l'utilisateur
  if (status >= 500) return status === 502 || status === 503 || status === 504
    ? 'Service momentanément indisponible. Réessayez dans quelques instants.'
    : 'Erreur interne du serveur. Réessayez ; si le problème persiste, contactez le support.';
  return messageApi || MESSAGES_STATUT[status] || 'La requête a été refusée.';
};

http.interceptors.request.use((config) => {
  // Les identifiants viennent souvent de l'URL (useParams) : un segment « .. » ou « . »
  // ferait viser une autre route de l'API (ex. /admin/colis/.. → /admin/). Refusé.
  if (/(^|\/)\.{1,2}(\/|$|\?)/.test(config.url ?? '')) {
    return Promise.reject(new ApiError('Adresse invalide.', 400));
  }
  const token = useAuth.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Un seul rafraîchissement à la fois : les requêtes qui échouent en 401 pendant
// qu'il est en cours attendent son résultat au lieu d'en lancer chacune un.
let refreshEnCours: Promise<string> | null = null;

const rafraichir = async (): Promise<string> => {
  const { refreshToken, setSession } = useAuth.getState();
  const res = await axios.post(
    `${API_URL}/auth/refresh-token`,
    refreshToken ? { refreshToken } : {},
    { withCredentials: true, timeout: DELAI_MS }
  );
  const data = res.data?.data;
  // Un compte rétrogradé entre-temps ne doit pas prolonger sa session d'administration
  if (data?.utilisateur && !ROLES_ADMIN.includes(data.utilisateur.role)) throw new Error('Rôle non autorisé');
  setSession(data.accessToken, data.refreshToken, data.utilisateur);
  return data.accessToken;
};

http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    // Refus émis avant l'envoi (intercepteur de requête) : déjà une erreur présentable
    if (error instanceof ApiError) return Promise.reject(error);
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    const estAuth = AUTH_PUBLIQUES.some((u) => original?.url?.startsWith(u));

    if (error.response?.status === 401 && original && !original._retry && !estAuth) {
      original._retry = true;
      const jetonUtilise = useAuth.getState().accessToken;
      try {
        refreshEnCours ??= rafraichir().finally(() => (refreshEnCours = null));
        const token = await refreshEnCours;
        original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
        return http(original);
      } catch {
        // Un autre onglet a peut-être rafraîchi la session au même moment (le refresh
        // token ne sert qu'une fois) : on relit la session avant de déconnecter.
        await useAuth.persist.rehydrate();
        const jetonActuel = useAuth.getState().accessToken;
        if (jetonActuel && jetonActuel !== jetonUtilise) {
          original.headers = { ...original.headers, Authorization: `Bearer ${jetonActuel}` };
          return http(original);
        }
        useAuth.getState().clear();
        window.location.assign(R.connexion);
      }
    }

    // Les téléchargements (CSV, HTML) reçoivent aussi leurs erreurs en blob ou en texte
    const brut: unknown = error.response?.data;
    const corps: { message?: string; details?: string[]; code?: string } | undefined =
      brut instanceof Blob ? await lireJson(await brut.text())
      : typeof brut === 'string' ? await lireJson(brut)
      : (brut as never);

    let messageApi = typeof corps?.message === 'string' ? corps.message : undefined;
    if (messageApi && corps?.details?.length) messageApi += ` : ${corps.details.join(' · ')}`;
    const status = error.response?.status;

    // Compte désactivé par un administrateur : la session prend fin immédiatement
    // (un 403 ordinaire, lui, signifie seulement « droit manquant pour cette action »)
    if (status === 403 && corps?.code === 'COMPTE_DESACTIVE' && useAuth.getState().accessToken) {
      useAuth.getState().clear();
      window.location.assign(`${R.connexion}?raison=desactive`);
    }
    return Promise.reject(new ApiError(messageHttp(status, messageApi, error.code), status));
  }
);

const lireJson = async (texte: string) => {
  try {
    return JSON.parse(texte);
  } catch {
    return undefined;
  }
};

/** Corps multipart : fichiers + champs texte (objets et tableaux encodés en JSON). */
export const formData = (champs: Record<string, unknown>) => {
  const fd = new FormData();
  for (const [cle, valeur] of Object.entries(champs)) {
    if (valeur === undefined || valeur === null) continue;
    if (valeur instanceof File) fd.append(cle, valeur);
    else if (Array.isArray(valeur) && valeur[0] instanceof File) valeur.forEach((f) => fd.append(cle, f));
    else if (typeof valeur === 'object') fd.append(cle, JSON.stringify(valeur));
    else fd.append(cle, String(valeur));
  }
  return fd;
};

/**
 * Verrou optimiste : transmet la version (`updatedAt`) de la donnée telle qu'elle a été
 * affichée. Si quelqu'un l'a modifiée entre-temps, le backend refuse en 409 au lieu
 * d'écraser sa modification. Sans version connue, aucun en-tête n'est envoyé.
 */
export const avecVersion = (version?: unknown): AxiosRequestConfig | undefined =>
  typeof version === 'string' && version ? { headers: { 'X-Version': version } } : undefined;

/** Le backend répond { success, message, data } : on ne renvoie que `data`. */
export const api = {
  get: async <T>(url: string, params?: Record<string, unknown>) =>
    (await http.get(url, { params: nettoyer(params) })).data.data as T,
  post: async <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    (await http.post(url, body, config)).data.data as T,
  put: async <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    (await http.put(url, body, config)).data.data as T,
  patch: async <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    (await http.patch(url, body, config)).data.data as T,
  delete: async <T>(url: string, body?: unknown) =>
    (await http.delete(url, { data: body })).data.data as T,
  /** Documents HTML (étiquettes, bordereaux, manifestes) : protégés par le jeton. */
  html: async (url: string, params?: Record<string, unknown>) =>
    (await http.get(url, { params: nettoyer(params), responseType: 'text' })).data as string,
  blob: async (url: string, params?: Record<string, unknown>) =>
    (await http.get(url, { params: nettoyer(params), responseType: 'blob' })).data as Blob,
  /** Envoi multipart (photos, documents) ; `methode` POST par défaut. */
  upload: async <T>(url: string, champs: Record<string, unknown>, methode: 'post' | 'put' = 'post') =>
    (await http[methode](url, formData(champs), { timeout: DELAI_UPLOAD_MS })).data.data as T,
  /** HTML renvoyé par un POST (aperçu de modèle d'email…). */
  postHtml: async (url: string, body?: unknown) =>
    (await http.post(url, body, { responseType: 'text' })).data as string,
};

/** Retire les filtres vides pour ne pas envoyer `?statut=` au backend. */
function nettoyer(params?: Record<string, unknown>) {
  if (!params) return undefined;
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null)
  );
}
