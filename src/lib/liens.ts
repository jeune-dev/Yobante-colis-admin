/**
 * Les liens des notifications visent les routes de l'API (« /admin/colis/:id ») : on
 * les traduit vers les écrans du back-office (« /admin/detail-colis/:id »).
 *
 * Seuls des chemins internes simples sont acceptés (lettres, chiffres, tirets, barres
 * obliques) : « //site », « /\site » ou « javascript: » renvoient null. React Router
 * interprète certains de ces motifs comme des URL externes (open redirect, GHSA-wrjc).
 */
import { nouvelleAdresse } from './routes';

const CHEMIN_INTERNE = /^\/(?!\/)[A-Za-z0-9_\-/]*$/;

const CORRESPONDANCES: [RegExp, string][] = [
  [/^\/rotations\//, '/conteneurs/'],
  [/^\/users\//, '/clients/'],
];

export const routeDepuisLien = (lien?: string | null): string | null => {
  if (!lien) return null;
  const chemin = lien
    .trim()
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/^\/api\/v1/, '')
    .replace(/^\/admin(?=\/|$)/, '');
  const route = CORRESPONDANCES.reduce((c, [re, dest]) => c.replace(re, dest), chemin);
  // Puis traduction vers l'écran explicite sous /admin (liste ou détail) ; inconnu = null
  return CHEMIN_INTERNE.test(route) ? nouvelleAdresse(route) : null;
};
