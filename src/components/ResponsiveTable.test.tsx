import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ResponsiveTable, { type Colonne } from './ResponsiveTable';

// Simule la largeur d'écran : mobile (< 768 px) ou non
const ecran = (mobile: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((requete: string) => ({
    matches: mobile && requete.includes('max-width: 767.98px'),
    media: requete,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

type Colis = { id: string; reference: string; destinataire: string; statut: string };
const LIGNES: Colis[] = [
  { id: '1', reference: 'PNC001', destinataire: 'Awa Diop', statut: 'Livré' },
  { id: '2', reference: 'PNC002', destinataire: 'Moussa Ba', statut: 'En transit' },
];

const monter = (props: { onLigne?: (c: Colis) => void; onSupprimer?: (c: Colis) => void; selection?: boolean } = {}) => {
  const colonnes: Colonne<Colis>[] = [
    ...(props.selection
      ? [{ cle: 'sel', mobile: 'selection' as const, titre: <input type="checkbox" aria-label="Tout cocher" />, cellule: (c: Colis) => <input type="checkbox" aria-label={`Cocher ${c.reference}`} /> }]
      : []),
    { cle: 'reference', titre: 'Référence', cellule: (c) => c.reference },
    { cle: 'destinataire', titre: 'Destinataire', cellule: (c) => c.destinataire },
    { cle: 'statut', titre: 'Statut', cellule: (c) => <span className="badge">{c.statut}</span> },
    { cle: 'actions', cellule: (c) => <button onClick={() => props.onSupprimer?.(c)}>Supprimer {c.reference}</button> },
  ];
  return render(<ResponsiveTable lignes={LIGNES} cleLigne={(c) => c.id} onLigne={props.onLigne} colonnes={colonnes} />);
};

afterEach(cleanup);

describe('ResponsiveTable', () => {
  it('affiche un tableau sur tablette et desktop', () => {
    ecran(false);
    const { container } = monter();
    expect(container.querySelector('table')).toBeTruthy();
    expect(container.querySelector('.rt-carte')).toBeNull();
    expect(screen.getAllByRole('columnheader').map((th) => th.textContent)).toEqual(['Référence', 'Destinataire', 'Statut', '']);
  });

  it('affiche des cartes, jamais de tableau, sur mobile', () => {
    ecran(true);
    const { container } = monter();
    expect(container.querySelector('table')).toBeNull();
    const cartes = container.querySelectorAll('.rt-carte');
    expect(cartes).toHaveLength(2);
    // 1re colonne = titre, « statut » = badge, autres colonnes = libellé / valeur
    expect(cartes[0].querySelector('.rt-carte-titre')?.textContent).toBe('PNC001');
    expect(cartes[0].querySelector('.rt-carte-badge')?.textContent).toBe('Livré');
    expect(cartes[0].querySelector('dt')?.textContent).toBe('Destinataire');
    expect(cartes[0].querySelector('dd')?.textContent).toBe('Awa Diop');
  });

  it.each([false, true])('garde les actions dans les deux modes (mobile : %s)', (mobile) => {
    ecran(mobile);
    const onSupprimer = vi.fn();
    monter({ onSupprimer });
    fireEvent.click(screen.getByText('Supprimer PNC002'));
    expect(onSupprimer).toHaveBeenCalledWith(LIGNES[1]);
  });

  it.each([false, true])('ouvre la fiche au clic, mais pas depuis un bouton (mobile : %s)', (mobile) => {
    ecran(mobile);
    const onLigne = vi.fn();
    monter({ onLigne });
    fireEvent.click(screen.getByText('Supprimer PNC001'));
    expect(onLigne).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Awa Diop'));
    expect(onLigne).toHaveBeenCalledWith(LIGNES[0]);
  });

  it('ouvre la fiche au clavier (Entrée)', () => {
    ecran(true);
    const onLigne = vi.fn();
    const { container } = monter({ onLigne });
    fireEvent.keyDown(container.querySelectorAll('.rt-carte')[1], { key: 'Enter' });
    expect(onLigne).toHaveBeenCalledWith(LIGNES[1]);
  });

  it('garde la case « tout cocher » au-dessus des cartes', () => {
    ecran(true);
    monter({ selection: true });
    expect(screen.getByLabelText('Tout cocher')).toBeTruthy();
    expect(screen.getByLabelText('Cocher PNC002')).toBeTruthy();
  });

  it('textes extrêmes : un nom de 80 caractères reste dans la carte', () => {
    ecran(true);
    const long = 'A'.repeat(80);
    const { container } = render(
      <ResponsiveTable lignes={[{ id: 'x', nom: long }]} cleLigne={(l) => l.id} colonnes={[{ cle: 'nom', titre: 'Nom', cellule: (l) => l.nom }]} />
    );
    expect(container.querySelector('.rt-carte-titre')?.textContent).toBe(long);
  });
});
