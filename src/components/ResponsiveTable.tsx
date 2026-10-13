import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { MOBILE, useMediaQuery } from '@/lib/hooks';

/**
 * Place d'une colonne dans la carte mobile :
 * - titre / soustitre : en-tête de la carte
 * - badge : à droite du titre (statut, catégorie…)
 * - selection : case à cocher, en haut à droite
 * - champ : grille « libellé / valeur » (par défaut)
 * - actions : rangée de boutons en pied de carte
 * - masque : absente de la carte
 */
export type RoleMobile = 'titre' | 'soustitre' | 'badge' | 'selection' | 'champ' | 'actions' | 'masque';

export interface Colonne<T> {
  cle: string;
  /** En-tête du tableau ; sert aussi de libellé dans la carte. */
  titre?: ReactNode;
  /** Libellé de la carte quand le titre n'est pas un texte (case « tout cocher »…). */
  libelle?: string;
  cellule: (ligne: T, index: number) => ReactNode;
  /** Classes de la cellule et de l'en-tête (right, mono, small…). */
  className?: string;
  /** « basse » : colonne masquée en tablette (768-1023 px), visible sur la fiche détail. */
  priorite?: 'haute' | 'basse';
  mobile?: RoleMobile;
}

interface Props<T> {
  colonnes: Colonne<T>[];
  lignes: T[];
  cleLigne: (ligne: T, index: number) => string | number;
  /** Ligne / carte cliquable (ouvre la fiche). Les boutons et liens internes gardent leur propre clic. */
  onLigne?: (ligne: T) => void;
  classeLigne?: (ligne: T) => string | undefined;
  /**
   * « cartes » (défaut) : une carte par ligne sur mobile.
   * « liste » : petits tableaux libellé / valeur, une ligne compacte par entrée sur mobile.
   */
  variante?: 'cartes' | 'liste';
  /** Masque l'en-tête du tableau (listes libellé / valeur). */
  sansEntete?: boolean;
}

// Le clic sur un bouton, un lien ou un champ ne doit pas ouvrir la fiche
const depuisInteractif = (e: MouseEvent | KeyboardEvent) =>
  (e.target as HTMLElement).closest('a, button, input, select, textarea, label') !== null;

const role = <T,>(c: Colonne<T>, i: number): RoleMobile => {
  if (c.mobile) return c.mobile;
  if (c.cle === 'actions') return 'actions';
  if (c.cle === 'statut') return 'badge';
  return i === 0 ? 'titre' : 'champ';
};

const texte = (c: { titre?: ReactNode; libelle?: string }) =>
  c.libelle ?? (typeof c.titre === 'string' ? c.titre : '');

export default function ResponsiveTable<T>({
  colonnes,
  lignes,
  cleLigne,
  onLigne,
  classeLigne,
  variante = 'cartes',
  sansEntete,
}: Props<T>) {
  const mobile = useMediaQuery(MOBILE);

  const ouvrir = (ligne: T) => (e: MouseEvent | KeyboardEvent) => {
    if (!onLigne || depuisInteractif(e)) return;
    if ('key' in e && e.key !== 'Enter') return;
    onLigne(ligne);
  };
  const cliquable = (ligne: T) =>
    onLigne ? { tabIndex: 0, onClick: ouvrir(ligne), onKeyDown: ouvrir(ligne) } : {};

  if (!mobile) {
    return (
      // Défilement horizontal volontaire limité au tableau (jamais à la page)
      <div className="table-wrap" data-scroll-x>
        <table className="rt">
          {!sansEntete && (
            <thead>
              <tr>
                {colonnes.map((c) => (
                  <th key={c.cle} className={cx(c.className, c.priorite === 'basse' && 'rt-basse')}>{c.titre}</th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {lignes.map((l, i) => (
              <tr key={cleLigne(l, i)} className={cx(onLigne && 'cliquable', classeLigne?.(l))} {...cliquable(l)}>
                {colonnes.map((c) => (
                  <td key={c.cle} className={cx(c.className, c.priorite === 'basse' && 'rt-basse')}>{c.cellule(l, i)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const roles = colonnes.map((c, i) => ({ c, r: role(c, i) }));
  const de = (r: RoleMobile) => roles.filter((x) => x.r === r).map((x) => x.c);

  if (variante === 'liste') {
    return (
      <ul className="rt-liste">
        {lignes.map((l, i) => (
          <li key={cleLigne(l, i)} className={cx(onLigne && 'cliquable', classeLigne?.(l))} {...cliquable(l)}>
            {roles.filter((x) => x.r !== 'masque').map(({ c }) => (
              <div key={c.cle} className={cx('rt-liste-cellule', c.className)}>{c.cellule(l, i)}</div>
            ))}
          </li>
        ))}
      </ul>
    );
  }

  const selection = de('selection');
  const aTete = ['titre', 'soustitre', 'badge', 'selection'].some((r) => de(r as RoleMobile).length > 0);
  return (
    <div className="rt-cartes">
      {/* La case « tout cocher » de l'en-tête reste disponible au-dessus des cartes */}
      {selection.some((c) => c.titre) && (
        <div className="rt-cartes-barre">
          {selection.map((c) => (
            <label key={c.cle} className="rt-tout">
              {c.titre}
              <span>{texte(c) || 'Tout sélectionner'}</span>
            </label>
          ))}
        </div>
      )}
      {lignes.map((l, i) => {
        const champs = de('champ');
        const actions = de('actions');
        return (
          <article key={cleLigne(l, i)} className={cx('rt-carte', onLigne && 'cliquable', classeLigne?.(l))} {...cliquable(l)}>
            {aTete && <div className="rt-carte-tete">
              <div className="rt-carte-titres">
                {de('titre').map((c) => (
                  <div key={c.cle} className={cx('rt-carte-titre', c.className)}>{c.cellule(l, i)}</div>
                ))}
                {de('soustitre').map((c) => (
                  <div key={c.cle} className="rt-carte-soustitre">{c.cellule(l, i)}</div>
                ))}
              </div>
              {de('badge').map((c) => (
                <div key={c.cle} className="rt-carte-badge">{c.cellule(l, i)}</div>
              ))}
              {selection.map((c) => (
                <div key={c.cle} className="rt-carte-selection">{c.cellule(l, i)}</div>
              ))}
            </div>}
            {champs.length > 0 && (
              <dl className="rt-carte-champs">
                {champs.map((c) => (
                  <div key={c.cle}>
                    <dt>{texte(c)}</dt>
                    <dd className={c.className}>{c.cellule(l, i)}</dd>
                  </div>
                ))}
              </dl>
            )}
            {actions.length > 0 && (
              <div className="rt-carte-actions">
                {actions.map((c) => (
                  <div key={c.cle}>{c.cellule(l, i)}</div>
                ))}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function cx(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ') || undefined;
}
