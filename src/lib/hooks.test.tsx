import { describe, expect, it, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { appliquerFiltres, lireFiltres, useFiltres } from './hooks';

const params = (s: string) => new URLSearchParams(s);

describe('appliquerFiltres', () => {
  it('retire un filtre revenu à sa valeur par défaut', () => {
    expect(appliquerFiltres(params('statut=livre'), { statut: '' }, { statut: '' }).toString()).toBe('');
  });

  it('conserve une valeur vide quand le défaut ne l’est pas (« Tous »)', () => {
    const next = appliquerFiltres(params(''), { statut: 'en_attente' }, { statut: '' });
    expect(next.toString()).toBe('statut=');
    expect(lireFiltres(next, { statut: 'en_attente' }).statut).toBe('');
  });

  it('applique plusieurs changements en une fois', () => {
    const next = appliquerFiltres(params('enRetard=true'), { aEtudier: '', enRetard: '' }, { aEtudier: 'true', enRetard: '' });
    expect(next.get('aEtudier')).toBe('true');
    expect(next.has('enRetard')).toBe(false);
  });

  it('revient à la première page quand un filtre change, pas quand la page change', () => {
    expect(appliquerFiltres(params('page=3'), { statut: '' }, { statut: 'livre' }).has('page')).toBe(false);
    expect(appliquerFiltres(params('statut=livre'), { statut: '' }, { page: 2 }).get('page')).toBe('2');
  });

  it('préserve les paramètres étrangers aux filtres', () => {
    expect(appliquerFiltres(params('autre=x'), { statut: '' }, { statut: 'livre' }).get('autre')).toBe('x');
  });
});

describe('useFiltres', () => {
  const wrapper = ({ children }: { children: ReactNode }) => <BrowserRouter>{children}</BrowserRouter>;
  beforeEach(() => window.history.replaceState(null, '', '/colis'));

  it('cumule deux appels successifs dans le même événement (bug F-01)', () => {
    const { result } = renderHook(() => useFiltres({ aEtudier: '', enRetard: '' }), { wrapper });
    act(() => {
      result.current.set('aEtudier', 'true');
      result.current.set('enRetard', 'true');
    });
    expect(result.current.filtres).toEqual({ aEtudier: 'true', enRetard: 'true' });
  });

  it('permet de choisir « Tous » pour un filtre dont le défaut est non vide (bug F-02)', () => {
    const { result } = renderHook(() => useFiltres({ statut: 'en_attente' }), { wrapper });
    expect(result.current.filtres.statut).toBe('en_attente');
    act(() => result.current.set('statut', ''));
    expect(result.current.filtres.statut).toBe('');
    act(() => result.current.set('statut', 'en_attente'));
    expect(window.location.search).toBe('');
  });

  it('modifier() change plusieurs filtres d’un coup', () => {
    const { result } = renderHook(() => useFiltres({ impayees: '', echues: '' }), { wrapper });
    act(() => result.current.modifier({ impayees: 'true', echues: '' }));
    act(() => result.current.modifier({ impayees: '', echues: 'true' }));
    expect(result.current.filtres).toEqual({ impayees: '', echues: 'true' });
  });
});
