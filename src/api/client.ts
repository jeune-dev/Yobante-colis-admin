import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import { useAuth } from '@/auth/store';

export const API_URL = import.meta.env.VITE_API_URL || '/api';

/** Erreur normalisée renvoyée par tous les appels : message lisible + code HTTP. */
export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

const http = axios.create({ baseURL: API_URL, withCredentials: true });

http.interceptors.request.use((config) => {
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
    { withCredentials: true }
  );
  const data = res.data?.data;
  setSession(data.accessToken, data.refreshToken, data.utilisateur);
  return data.accessToken;
};

http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    const estAuth = original?.url?.startsWith('/auth/');

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
        window.location.assign('/login');
      }
    }

    // Les téléchargements (CSV, HTML) reçoivent aussi leurs erreurs en blob ou en texte
    const brut: unknown = error.response?.data;
    const corps: { message?: string; details?: string[] } | undefined =
      brut instanceof Blob ? await lireJson(await brut.text())
      : typeof brut === 'string' ? await lireJson(brut)
      : (brut as never);

    let message = corps?.message || error.message || 'Erreur inattendue';
    if (corps?.details?.length) message += ` : ${corps.details.join(' · ')}`;
    if (!error.response) message = "Impossible de joindre l'API. Le backend est-il démarré ?";
    if (error.response?.status === 429) message = 'Trop de requêtes : patientez quelques minutes.';
    return Promise.reject(new ApiError(message, error.response?.status));
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

/** Le backend répond { success, message, data } : on ne renvoie que `data`. */
export const api = {
  get: async <T>(url: string, params?: Record<string, unknown>) =>
    (await http.get(url, { params: nettoyer(params) })).data.data as T,
  post: async <T>(url: string, body?: unknown) => (await http.post(url, body)).data.data as T,
  put: async <T>(url: string, body?: unknown) => (await http.put(url, body)).data.data as T,
  patch: async <T>(url: string, body?: unknown) => (await http.patch(url, body)).data.data as T,
  delete: async <T>(url: string, body?: unknown) =>
    (await http.delete(url, { data: body })).data.data as T,
  /** Documents HTML (étiquettes, bordereaux, manifestes) : protégés par le jeton. */
  html: async (url: string, params?: Record<string, unknown>) =>
    (await http.get(url, { params: nettoyer(params), responseType: 'text' })).data as string,
  blob: async (url: string, params?: Record<string, unknown>) =>
    (await http.get(url, { params: nettoyer(params), responseType: 'blob' })).data as Blob,
  /** Envoi multipart (photos, documents) ; `methode` POST par défaut. */
  upload: async <T>(url: string, champs: Record<string, unknown>, methode: 'post' | 'put' = 'post') =>
    (await http[methode](url, formData(champs))).data.data as T,
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
