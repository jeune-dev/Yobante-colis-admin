import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';
import { construireCorps, type ChampDef } from './FormModal';

describe('ErrorBoundary (R-02)', () => {
  const Boum = () => {
    throw new Error('donnée inattendue');
  };

  it('affiche un message au lieu d’une page blanche', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary><Boum /></ErrorBoundary>);
    expect(screen.getByRole('alert').textContent).toContain('erreur inattendue');
  });

  it('s’efface quand la page change', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = render(<ErrorBoundary cle="/a"><Boum /></ErrorBoundary>);
    rerender(<ErrorBoundary cle="/b"><p>page suivante</p></ErrorBoundary>);
    expect(screen.getByText('page suivante')).toBeTruthy();
  });
});

describe('construireCorps (formulaires)', () => {
  const champs: ChampDef[] = [
    { name: 'nom', label: 'Nom' },
    { name: 'poids', label: 'Poids', type: 'number' },
    { name: 'codes', label: 'Codes', type: 'tags' },
    { name: 'actif', label: 'Actif', type: 'checkbox' },
    { name: 'motif', label: 'Motif', visible: (v) => v.actif === false },
  ];

  it('convertit les types et omet les champs vides à la création', () => {
    expect(construireCorps(champs, { nom: ' Dakar ', poids: '2.5', codes: '75001, 75002', actif: true, motif: 'x' })).toEqual({
      nom: 'Dakar',
      poids: 2.5,
      codes: ['75001', '75002'],
      actif: true,
    });
  });

  it('envoie null pour effacer une valeur existante', () => {
    expect(construireCorps(champs, { nom: '', actif: true }, { nom: 'Dakar' })).toEqual({ nom: null, actif: true });
  });
});
