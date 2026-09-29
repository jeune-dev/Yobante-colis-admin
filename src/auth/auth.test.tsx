import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '@/App';
import { surFinDeSession, useAuth } from './store';

// Pas de nettoyage automatique (globals désactivés) : on démonte après chaque test
afterEach(cleanup);

const admin = { id: 'u1', nom: 'Diop', prenom: 'Awa', email: 'a@x.sn', role: 'admin' };

// Requêtes désactivées : on teste l'aiguillage, pas les appels réseau
const monter = (url: string) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, enabled: false } } })}>
      <MemoryRouter initialEntries={[url]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>
  );

describe('routes protégées', () => {
  beforeEach(() => useAuth.getState().clear());

  it('un visiteur non connecté est renvoyé vers la connexion', async () => {
    monter('/admin/liste-colis');
    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeTruthy();
  });

  it('une session sans rôle d’administration ne donne pas accès au back-office', async () => {
    useAuth.setState({ accessToken: 'jeton', utilisateur: { ...admin, role: 'coursier' } });
    monter('/admin/tableau-de-bord');
    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeTruthy();
  });

  it('une route inconnue affiche « Page introuvable » à un administrateur connecté', async () => {
    useAuth.setState({ accessToken: 'jeton', utilisateur: admin });
    monter('/admin/route-inexistante');
    expect(await screen.findByText(/ne correspond à aucun écran/)).toBeTruthy();
  });
});

describe('adresses /admin', () => {
  beforeEach(() => useAuth.getState().clear());

  it.each(['/admin', '/admin/tableau-de-bord', '/admin/liste-clients', '/admin/parametres-systeme', '/admin/detail-colis/123', '/admin/../../'])(
    'non connecté : %s renvoie vers la connexion',
    async (url) => {
      monter(url);
      expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeTruthy();
    }
  );

  it('une ancienne adresse redirige vers son équivalent /admin', async () => {
    useAuth.setState({ accessToken: 'jeton', utilisateur: admin });
    monter('/parametres');
    expect(await screen.findByText('Paramètres', { selector: '.page-title' })).toBeTruthy();
  });

  it('?redirect= externe ignoré : la connexion ne renvoie jamais hors du back-office', async () => {
    useAuth.setState({ accessToken: 'jeton', utilisateur: admin });
    monter('/admin/connexion?redirect=https://evil.example&returnUrl=//evil.example');
    expect(await screen.findByText('Tableau de bord', { selector: '.page-title' })).toBeTruthy();
  });
});

describe('fin de session', () => {
  it('purge le cache à la déconnexion et au changement de compte', () => {
    useAuth.setState({ accessToken: 'a', utilisateur: admin });
    const purger = vi.fn();
    const stop = surFinDeSession(purger);
    act(() => useAuth.getState().setSession('b', undefined, { ...admin, id: 'u2' }));
    expect(purger).toHaveBeenCalledTimes(1);
    act(() => useAuth.getState().clear());
    expect(purger).toHaveBeenCalledTimes(2);
    stop();
  });

  it('ne conserve pas le refresh token dans le stockage quand l’API est servie sous /api (cookie httpOnly)', () => {
    useAuth.getState().setSession('a', 'refresh-secret', admin);
    expect(localStorage.getItem('yobante-colis-admin-auth') ?? '').not.toContain('refresh-secret');
  });
});

describe('plusieurs onglets', () => {
  it('une déconnexion dans l’onglet A ferme la session de l’onglet B', async () => {
    useAuth.setState({ accessToken: 'jeton', utilisateur: admin });
    // L'onglet A écrit la session vide puis le navigateur prévient l'onglet B
    localStorage.setItem('yobante-colis-admin-auth', JSON.stringify({ state: { accessToken: null, refreshToken: null, utilisateur: null }, version: 0 }));
    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'yobante-colis-admin-auth' }));
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(useAuth.getState().accessToken).toBeNull();
  });
});
