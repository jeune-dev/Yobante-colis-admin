import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axios, { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { api, ApiError, http, messageHttp } from './client';
import { useAuth } from '@/auth/store';

/** Réponse simulée ; un statut ≥ 400 est rejeté comme le ferait axios. */
const repondre = (config: InternalAxiosRequestConfig, status: number, data: unknown) => {
  const res = { data, status, statusText: '', headers: {}, config };
  if (status >= 400) throw new AxiosError('Request failed', undefined, config, null, res);
  return res;
};

const admin = { id: 'u1', nom: 'Diop', prenom: 'Awa', email: 'a@x.sn', role: 'admin' };
const adapterHttp = http.defaults.adapter;
const adapterAxios = axios.defaults.adapter;

describe('messageHttp', () => {
  it('ne montre jamais le détail technique d’une erreur 5xx', () => {
    expect(messageHttp(500, 'SequelizeDatabaseError: relation "x" does not exist')).not.toMatch(/Sequelize/);
    expect(messageHttp(503)).toMatch(/indisponible/);
  });
  it('garde le message métier du backend pour les 4xx', () => {
    expect(messageHttp(422, 'Le poids doit être positif')).toBe('Le poids doit être positif');
    expect(messageHttp(403)).toMatch(/droits/);
    expect(messageHttp(404)).toMatch(/introuvable/);
    expect(messageHttp(409)).toMatch(/modifiée entre-temps/);
  });
  it('distingue délai dépassé et serveur injoignable', () => {
    expect(messageHttp(undefined, undefined, 'ECONNABORTED')).toMatch(/trop de temps/);
    expect(messageHttp(undefined)).toMatch(/joindre le serveur/);
  });
});

describe('client API', () => {
  const assign = vi.fn();
  beforeEach(() => {
    useAuth.setState({ accessToken: 'ancien', refreshToken: 'r1', utilisateur: admin });
    vi.stubGlobal('location', { ...window.location, assign });
    assign.mockClear();
  });
  afterEach(() => {
    http.defaults.adapter = adapterHttp;
    axios.defaults.adapter = adapterAxios;
    vi.unstubAllGlobals();
  });

  it('envoie le jeton et renvoie `data`', async () => {
    http.defaults.adapter = (async (c: InternalAxiosRequestConfig) => {
      expect(c.headers.Authorization).toBe('Bearer ancien');
      return repondre(c, 200, { success: true, data: { ok: 1 } });
    }) as AxiosAdapter;
    await expect(api.get('/admin/villes')).resolves.toEqual({ ok: 1 });
  });

  it('rafraîchit le jeton expiré puis rejoue la requête (y compris /auth/change-password)', async () => {
    const vus: string[] = [];
    http.defaults.adapter = (async (c: InternalAxiosRequestConfig) => {
      vus.push(`${c.url} ${c.headers.Authorization}`);
      return c.headers.Authorization === 'Bearer neuf'
        ? repondre(c, 200, { data: 'ok' })
        : repondre(c, 401, { message: 'Token expiré' });
    }) as AxiosAdapter;
    axios.defaults.adapter = (async (c: InternalAxiosRequestConfig) =>
      repondre(c, 200, { data: { accessToken: 'neuf', refreshToken: 'r2', utilisateur: admin } })) as AxiosAdapter;

    await expect(api.put('/auth/change-password', {})).resolves.toBe('ok');
    expect(vus).toEqual(['/auth/change-password Bearer ancien', '/auth/change-password Bearer neuf']);
    expect(useAuth.getState().accessToken).toBe('neuf');
  });

  it('ne tente pas de rafraîchir sur un échec de connexion (401 = identifiants refusés)', async () => {
    const refresh = vi.fn();
    axios.defaults.adapter = refresh as unknown as AxiosAdapter;
    http.defaults.adapter = (async (c: InternalAxiosRequestConfig) =>
      repondre(c, 401, { message: 'Identifiant ou mot de passe incorrect' })) as AxiosAdapter;
    await expect(api.post('/auth/login', {})).rejects.toMatchObject({
      status: 401,
      message: 'Identifiant ou mot de passe incorrect',
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it('déconnecte et renvoie vers /admin/connexion si le rafraîchissement échoue', async () => {
    http.defaults.adapter = (async (c: InternalAxiosRequestConfig) => repondre(c, 401, {})) as AxiosAdapter;
    axios.defaults.adapter = (async (c: InternalAxiosRequestConfig) => repondre(c, 401, { message: 'révoqué' })) as AxiosAdapter;
    await expect(api.get('/admin/colis')).rejects.toBeInstanceOf(ApiError);
    expect(useAuth.getState().accessToken).toBeNull();
    expect(assign).toHaveBeenCalledWith('/admin/connexion');
  });

  it('refuse de prolonger la session d’un compte qui n’est plus administrateur', async () => {
    http.defaults.adapter = (async (c: InternalAxiosRequestConfig) => repondre(c, 401, {})) as AxiosAdapter;
    axios.defaults.adapter = (async (c: InternalAxiosRequestConfig) =>
      repondre(c, 200, { data: { accessToken: 'neuf', utilisateur: { ...admin, role: 'coursier' } } })) as AxiosAdapter;
    await expect(api.get('/admin/colis')).rejects.toBeInstanceOf(ApiError);
    expect(useAuth.getState().accessToken).toBeNull();
  });

  it('403 : message de droits, session conservée', async () => {
    http.defaults.adapter = (async (c: InternalAxiosRequestConfig) => repondre(c, 403, {})) as AxiosAdapter;
    await expect(api.get('/admin/admins')).rejects.toMatchObject({ status: 403, message: expect.stringMatching(/droits/) });
    expect(useAuth.getState().accessToken).toBe('ancien');
  });

  it('500 : message générique, sans détail serveur', async () => {
    http.defaults.adapter = (async (c: InternalAxiosRequestConfig) =>
      repondre(c, 500, { message: 'TypeError: x is undefined at service.js:12' })) as AxiosAdapter;
    const e = await api.get('/admin/colis').catch((err: ApiError) => err);
    expect(e).toMatchObject({ status: 500 });
    expect((e as ApiError).message).not.toMatch(/service\.js/);
  });

  it('timeout et erreur réseau : messages lisibles', async () => {
    http.defaults.adapter = (async (c: InternalAxiosRequestConfig) => {
      throw new AxiosError('timeout of 30000ms exceeded', 'ECONNABORTED', c);
    }) as AxiosAdapter;
    await expect(api.get('/admin/colis')).rejects.toMatchObject({ message: expect.stringMatching(/trop de temps/) });
    http.defaults.adapter = (async (c: InternalAxiosRequestConfig) => {
      throw new AxiosError('Network Error', 'ERR_NETWORK', c);
    }) as AxiosAdapter;
    await expect(api.get('/admin/colis')).rejects.toMatchObject({ message: expect.stringMatching(/joindre le serveur/) });
  });

  it('refuse un identifiant de route qui remonte l’arborescence de l’API', async () => {
    const appel = vi.fn();
    http.defaults.adapter = appel as unknown as AxiosAdapter;
    await expect(api.get('/admin/colis/..')).rejects.toMatchObject({ status: 400 });
    await expect(api.get('/admin/colis/../users')).rejects.toMatchObject({ status: 400 });
    expect(appel).not.toHaveBeenCalled();
  });

  it('applique un délai maximal aux requêtes', () => {
    expect(http.defaults.timeout).toBeGreaterThan(0);
  });
});

describe('compte désactivé', () => {
  const assign = vi.fn();
  beforeEach(() => {
    useAuth.setState({ accessToken: 'jeton', refreshToken: null, utilisateur: admin });
    vi.stubGlobal('location', { ...window.location, assign });
    assign.mockClear();
  });
  afterEach(() => {
    http.defaults.adapter = adapterHttp;
    vi.unstubAllGlobals();
  });

  it('403 COMPTE_DESACTIVE : session fermée et retour à la connexion', async () => {
    http.defaults.adapter = (async (c: InternalAxiosRequestConfig) =>
      repondre(c, 403, { message: 'Ce compte a été désactivé', code: 'COMPTE_DESACTIVE' })) as AxiosAdapter;
    await expect(api.get('/admin/colis')).rejects.toMatchObject({ status: 403 });
    expect(useAuth.getState().accessToken).toBeNull();
    expect(assign).toHaveBeenCalledWith('/admin/connexion?raison=desactive');
  });

  it('403 ordinaire (droit manquant) : la session est conservée', async () => {
    http.defaults.adapter = (async (c: InternalAxiosRequestConfig) =>
      repondre(c, 403, { message: 'Permissions insuffisantes' })) as AxiosAdapter;
    await expect(api.get('/admin/admins')).rejects.toMatchObject({ status: 403 });
    expect(useAuth.getState().accessToken).toBe('jeton');
    expect(assign).not.toHaveBeenCalled();
  });
});
