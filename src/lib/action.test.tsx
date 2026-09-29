import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAction } from './hooks';
import { FormModal, construireCorps, verifierFichiers, type ChampDef } from '@/components/FormModal';
import { Field, messageErreur } from '@/components/ui';
import { avecVersion } from '@/api/client';

// Pas de nettoyage automatique (globals désactivés) : on démonte après chaque test
afterEach(cleanup);

const avecClient = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe('double soumission', () => {
  it('useAction : deux appels rapprochés ne lancent qu’une opération', async () => {
    let terminer!: () => void;
    const fn = vi.fn(() => new Promise<void>((r) => (terminer = r)));
    const { result } = renderHook(() => useAction(fn), { wrapper: avecClient });
    act(() => {
      result.current.mutate();
      result.current.mutate();
    });
    await waitFor(() => expect(fn).toHaveBeenCalledTimes(1));
    await act(async () => terminer());
    // Une fois l'opération terminée, une nouvelle action est de nouveau possible
    act(() => result.current.mutate());
    await waitFor(() => expect(fn).toHaveBeenCalledTimes(2));
  });

  it('FormModal : un double clic sur « Enregistrer » n’envoie qu’une requête', async () => {
    let terminer!: () => void;
    const onSubmit = vi.fn(() => new Promise<void>((r) => (terminer = r)));
    render(<FormModal title="Test" champs={[{ name: 'nom', label: 'Nom' }]} onSubmit={onSubmit} onClose={() => {}} />, { wrapper: avecClient });
    const bouton = screen.getByRole('button', { name: 'Enregistrer' });
    fireEvent.click(bouton);
    fireEvent.click(bouton);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    await act(async () => terminer());
  });
});

describe('formulaires', () => {
  const tags: ChampDef[] = [{ name: 'codesPostaux', label: 'Codes postaux', type: 'tags' }];

  it('une liste vidée est envoyée comme tableau vide, jamais null (refusé par le backend)', () => {
    expect(construireCorps(tags, { codesPostaux: '' }, { codesPostaux: [] })).toEqual({ codesPostaux: [] });
    expect(construireCorps(tags, { codesPostaux: '' }, { codesPostaux: ['75001'] })).toEqual({ codesPostaux: [] });
    expect(construireCorps(tags, { codesPostaux: '' })).toEqual({});
  });

  it('contrôle le type et la taille des fichiers avant envoi', () => {
    const champ: ChampDef = { name: 'photo', label: 'Photo', type: 'file', accept: 'image/jpeg,image/png', maxMo: 5 };
    const png = new File(['x'], 'a.png', { type: 'image/png' });
    const exe = new File(['x'], 'a.exe', { type: 'application/x-msdownload' });
    const gros = new File([new Uint8Array(6 * 1024 * 1024)], 'b.jpg', { type: 'image/jpeg' });
    expect(verifierFichiers(champ, png)).toBeNull();
    expect(verifierFichiers(champ, exe)).toMatch(/format non accepté/);
    expect(verifierFichiers(champ, gros)).toMatch(/5 Mo/);
  });

  it('associe le libellé au champ (accessibilité)', () => {
    render(<Field label="Email"><input /></Field>);
    expect(screen.getByLabelText('Email')).toBeTruthy();
  });
});

describe('messages d’erreur', () => {
  it('masque les erreurs techniques JavaScript', () => {
    expect(messageErreur(new TypeError("Cannot read properties of undefined (reading 'map')"))).not.toMatch(/Cannot read/);
    expect(messageErreur(new Error('Montant invalide'))).toBe('Montant invalide');
  });
});

describe('verrou optimiste', () => {
  it('FormModal transmet la version (updatedAt) de la donnée éditée', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <FormModal title="Test" champs={[{ name: 'nom', label: 'Nom' }]} initial={{ nom: 'Dakar', updatedAt: '2026-09-29T10:00:00.123Z' }} onSubmit={onSubmit} onClose={() => {}} />,
      { wrapper: avecClient }
    );
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' })));
    expect(onSubmit).toHaveBeenCalledWith({ nom: 'Dakar' }, { version: '2026-09-29T10:00:00.123Z' });
  });

  it('avecVersion : en-tête X-Version seulement si la version est connue', () => {
    expect(avecVersion('2026-09-29T10:00:00.123Z')).toEqual({ headers: { 'X-Version': '2026-09-29T10:00:00.123Z' } });
    expect(avecVersion(undefined)).toBeUndefined();
  });
});

describe('XSS', () => {
  it('une donnée d’API contenant du HTML est affichée comme texte, jamais interprétée', () => {
    const charge = '<img src=x onerror="window.__xss=1">';
    const { container } = render(<Field label={charge}><input defaultValue={charge} /></Field>);
    render(<FormModal title={charge} champs={[{ name: 'n', label: charge }]} onSubmit={vi.fn()} onClose={() => {}} />, { wrapper: avecClient });
    expect(container.querySelector('img')).toBeNull();
    expect(document.querySelector('img[src="x"]')).toBeNull();
    expect((window as { __xss?: number }).__xss).toBeUndefined();
    expect(screen.getAllByText(charge).length).toBeGreaterThan(0);
  });
});
