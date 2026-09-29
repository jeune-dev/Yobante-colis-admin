/**
 * Adresses du back-office, toutes sous /admin et explicites. Source unique : les écrans,
 * le menu, les liens de notifications et les redirections des anciennes adresses en dépendent.
 */
export const R = {
  connexion: '/admin/connexion',
  motDePasseOublie: '/admin/mot-de-passe-oublie',
  tableauDeBord: '/admin/tableau-de-bord',
  analyses: '/admin/analyses',
  colis: '/admin/liste-colis',
  conteneurs: '/admin/liste-conteneurs',
  enlevements: '/admin/liste-enlevements',
  tournees: '/admin/tournees-collecte',
  douane: '/admin/declarations-douane',
  inventaire: '/admin/inventaire',
  reclamations: '/admin/liste-reclamations',
  factures: '/admin/liste-factures',
  paiements: '/admin/liste-paiements',
  clients: '/admin/liste-clients',
  parrainage: '/admin/parrainage',
  personnel: '/admin/liste-personnel',
  administrateurs: '/admin/liste-administrateurs',
  pointsCollecte: '/admin/liste-points-collecte',
  villes: '/admin/liste-villes',
  zones: '/admin/liste-zones',
  services: '/admin/services-expedition',
  tarifs: '/admin/tarifs-au-poids',
  grilleTarifaire: '/admin/grille-tarifaire-forfaitaire',
  surcharges: '/admin/surcharges',
  joursFeries: '/admin/jours-feries',
  emballages: '/admin/emballages',
  annonces: '/admin/annonces',
  avis: '/admin/avis-clients',
  faq: '/admin/faq',
  versionsApp: '/admin/versions-application',
  parametres: '/admin/parametres-systeme',
  modelesEmails: '/admin/modeles-emails',
  suppressionsCompte: '/admin/suppressions-compte',
  journal: '/admin/journal-activite',
  profil: '/admin/mon-profil',
  notifications: '/admin/mes-notifications',
} as const;

/** Pages de détail : préfixe suivi de l'identifiant. */
export const D = {
  colis: '/admin/detail-colis',
  conteneur: '/admin/detail-conteneur',
  douane: '/admin/detail-declaration-douane',
  reclamation: '/admin/detail-reclamation',
  facture: '/admin/detail-facture',
  client: '/admin/detail-client',
  pointCollecte: '/admin/detail-point-collecte',
} as const;

/** Chemin d'un détail ; l'identifiant est encodé (jamais interprété comme un chemin). */
export const detail = (prefixe: (typeof D)[keyof typeof D], id: string) => `${prefixe}/${encodeURIComponent(id)}`;

/** Anciennes adresses (avant /admin) → nouvelles, pour les favoris et liens déjà partagés. */
export const ANCIENNES: [string, string][] = [
  ['/login', R.connexion],
  ['/mot-de-passe-oublie', R.motDePasseOublie],
  ['/analyses', R.analyses],
  ['/colis', R.colis],
  ['/conteneurs', R.conteneurs],
  ['/enlevements', R.enlevements],
  ['/tournees', R.tournees],
  ['/douane', R.douane],
  ['/inventaire', R.inventaire],
  ['/reclamations', R.reclamations],
  ['/factures', R.factures],
  ['/paiements', R.paiements],
  ['/clients', R.clients],
  ['/parrainage', R.parrainage],
  ['/personnel', R.personnel],
  ['/administrateurs', R.administrateurs],
  ['/points-collecte', R.pointsCollecte],
  ['/villes', R.villes],
  ['/zones', R.zones],
  ['/services', R.services],
  ['/tarifs', R.tarifs],
  ['/grille-tarifaire', R.grilleTarifaire],
  ['/surcharges', R.surcharges],
  ['/jours-feries', R.joursFeries],
  ['/emballages', R.emballages],
  ['/annonces', R.annonces],
  ['/avis', R.avis],
  ['/faq', R.faq],
  ['/versions-app', R.versionsApp],
  ['/parametres', R.parametres],
  ['/modeles-emails', R.modelesEmails],
  ['/suppressions-compte', R.suppressionsCompte],
  ['/journal', R.journal],
  ['/profil', R.profil],
  ['/notifications', R.notifications],
];

const DETAILS_ANCIENS: Record<string, (typeof D)[keyof typeof D]> = {
  '/colis': D.colis,
  '/conteneurs': D.conteneur,
  '/douane': D.douane,
  '/reclamations': D.reclamation,
  '/factures': D.facture,
  '/clients': D.client,
  '/points-collecte': D.pointCollecte,
};

/**
 * Traduit une ancienne adresse en nouvelle (null si inconnue). Seuls des segments simples
 * sont acceptés pour l'identifiant : aucune redirection hors du back-office n'est possible.
 */
export function nouvelleAdresse(chemin: string): string | null {
  if (chemin === '/' || chemin === '/admin' || chemin === '/admin/') return R.tableauDeBord;
  const m = /^(\/[a-z-]+)(?:\/([A-Za-z0-9_-]+))?\/?$/.exec(chemin);
  if (!m) return null;
  const [, base, id] = m;
  if (id) return DETAILS_ANCIENS[base] ? detail(DETAILS_ANCIENS[base], id) : null;
  return ANCIENNES.find(([a]) => a === base)?.[1] ?? null;
}
