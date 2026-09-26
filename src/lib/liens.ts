/**
 * Les liens des notifications visent les routes de l'API (« /admin/colis/:id ») : on
 * les ramène aux écrans du back-office, qui portent les mêmes chemins sans « /admin ».
 *
 * Seuls des chemins internes simples sont acceptés (lettres, chiffres, tirets, barres
 * obliques) : « //site », « /\site » ou « javascript: » renvoient null. React Router
 * interprète certains de ces motifs comme des URL externes (open redirect, GHSA-wrjc).
 */
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
  return CHEMIN_INTERNE.test(route) ? route : null;
};
