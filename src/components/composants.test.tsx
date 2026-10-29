import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';
import { Confirmation, Confirmations, confirmer } from './ui';
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

describe('Confirmation', () => {
  afterEach(cleanup);

  it('confirme dans une fenêtre de l’admin, sans la boîte du navigateur', async () => {
    const onConfirmer = vi.fn();
    const onClose = vi.fn();
    const { getByText } = render(
      <Confirmation titre="Rétablir ?" message="Définitif." libelleOk="Rétablir" danger onConfirmer={onConfirmer} onClose={onClose} />
    );
    fireEvent.click(getByText('Rétablir'));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onConfirmer).toHaveBeenCalledTimes(1);
  });

  it('Annuler ferme sans confirmer', () => {
    const onConfirmer = vi.fn();
    const onClose = vi.fn();
    const { getByText } = render(<Confirmation titre="Rétablir ?" message="Définitif." onConfirmer={onConfirmer} onClose={onClose} />);
    fireEvent.click(getByText('Annuler'));
    expect(onClose).toHaveBeenCalled();
    expect(onConfirmer).not.toHaveBeenCalled();
  });
});

describe('confirmer()', () => {
  afterEach(cleanup);

  it('ouvre la fenêtre de l’admin et résout selon la réponse', async () => {
    const { getByText } = render(<Confirmations />);
    let reponse: Promise<boolean>;
    act(() => {
      reponse = confirmer('Supprimer la zone Dakar ?');
    });
    // Verbe repris sur le bouton, action destructive en rouge
    const bouton = getByText('Supprimer');
    expect(bouton.className).toContain('danger');
    fireEvent.click(bouton);
    await expect(reponse!).resolves.toBe(true);
  });

  it('Annuler résout à faux', async () => {
    const { getByText } = render(<Confirmations />);
    let reponse: Promise<boolean>;
    act(() => {
      reponse = confirmer('Relancer tous les clients ?');
    });
    expect(getByText('Relancer').className).not.toContain('danger');
    fireEvent.click(getByText('Annuler'));
    await expect(reponse!).resolves.toBe(false);
  });
});
