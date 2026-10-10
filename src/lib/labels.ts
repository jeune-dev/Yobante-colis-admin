// Libellés et couleurs des référentiels du backend (constants/*.js de yobnate-colis-back).

export type Ton = 'gris' | 'bleu' | 'vert' | 'orange' | 'rouge' | 'violet' | 'cyan';

export const STATUTS_COLIS: Record<string, { label: string; ton: Ton }> = {
  brouillon: { label: 'Brouillon', ton: 'gris' },
  en_attente_validation: { label: 'À étudier', ton: 'orange' },
  devis_propose: { label: 'Devis proposé', ton: 'violet' },
  refuse: { label: 'Refusé', ton: 'rouge' },
  en_attente: { label: 'En attente', ton: 'orange' },
  enlevement_planifie: { label: 'Enlèvement planifié', ton: 'violet' },
  enleve: { label: 'Enlevé', ton: 'bleu' },
  receptionne: { label: 'Réceptionné', ton: 'bleu' },
  en_preparation: { label: 'En préparation', ton: 'bleu' },
  en_transit: { label: 'En transit', ton: 'cyan' },
  en_douane: { label: 'En douane', ton: 'violet' },
  arrive: { label: 'Arrivé', ton: 'cyan' },
  disponible_retrait: { label: 'Disponible au retrait', ton: 'vert' },
  en_livraison: { label: 'En livraison', ton: 'cyan' },
  livre: { label: 'Livré', ton: 'vert' },
  recupere: { label: 'Récupéré', ton: 'vert' },
  retourne: { label: 'Retourné', ton: 'gris' },
  incident: { label: 'Incident', ton: 'rouge' },
  annule: { label: 'Annulé', ton: 'gris' },
};

/** Événements de suivi (config/colis.js du backend). */
export const EVENEMENTS_SUIVI: Record<string, string> = {
  CRE: 'Expédition enregistrée',
  SOUMIS: 'Demande reçue, en cours d’étude',
  VALIDE: 'Demande validée par nos équipes',
  DEVIS_PROPOSE: 'Proposition tarifaire envoyée',
  DEVIS_ACCEPTE: 'Proposition tarifaire acceptée',
  DEVIS_REFUSE: 'Proposition tarifaire déclinée',
  DEMANDE_REFUSEE: 'Demande refusée',
  ENL_PROG: 'Enlèvement programmé',
  ENL_OK: "Colis enlevé chez l'expéditeur",
  ENL_ECHEC: 'Enlèvement infructueux',
  DEPOT: 'Colis déposé au point de collecte',
  RECEPTION: 'Colis pris en charge par nos équipes',
  TRI: 'Traité au centre de tri',
  MANIFESTE: 'Affecté à une rotation',
  DOUANE_EXP: 'Formalités douanières export en cours',
  DEPART_HUB: 'Expédié vers le port de destination',
  EN_TRANSIT: 'En transit international',
  ARR_PAYS: 'Arrivé au port de destination',
  DOUANE_IMP: 'En cours de dédouanement',
  DOUANE_OK: 'Dédouanement terminé',
  DOUANE_BLOC: 'Retenu par les autorités douanières',
  ARR_AGENCE: 'Arrivé à notre plateforme',
  DISPO: 'Disponible au point de retrait',
  EN_LIVRAISON: 'En cours de livraison',
  LIV_ECHEC: 'Tentative de livraison infructueuse',
  LIVRE: 'Remis au destinataire',
  RETIRE: 'Retiré par le destinataire',
  REFUSE: 'Colis refusé par le destinataire',
  RETOUR: 'Retour expéditeur',
  PERDU: 'Colis déclaré perdu',
  AVARIE: 'Colis endommagé',
  RETARD: "Retard d'acheminement",
  INFO: 'Information',
  ANNULE: 'Expédition annulée',
};

export const CATEGORIES: Record<string, string> = {
  documents: 'Cat. 1 — Documents',
  colis_moyen: 'Cat. 2 — Colis moyen',
  colis_xxl: 'Cat. 3 — Colis XXL',
};

export const CATEGORIES_COURT: Record<string, string> = {
  documents: 'Documents',
  colis_moyen: 'Moyen',
  colis_xxl: 'XXL',
};

export const PAYS: Record<string, string> = { FR: 'France', SN: 'Sénégal' };

export const MODES_DEPOT: Record<string, string> = {
  point_collecte: 'Dépôt en point de collecte',
  enlevement_domicile: 'Collecte à domicile',
  envoi_postal: 'Envoi postal',
  boite_aux_lettres: 'Boîte aux lettres',
};

export const MODES_LIVRAISON: Record<string, string> = {
  point_retrait: 'Retrait en point',
  livraison_domicile: 'Livraison à domicile',
};

export const TYPES_CONTENU: Record<string, string> = {
  document: 'Document',
  marchandise: 'Marchandise',
  cadeau: 'Cadeau',
  echantillon: 'Échantillon',
  effets_personnels: 'Effets personnels',
  retour: 'Retour',
};

export const STATUTS_ROTATION: Record<string, { label: string; ton: Ton }> = {
  planifiee: { label: 'Planifié', ton: 'gris' },
  ouverte: { label: 'Ouvert au chargement', ton: 'bleu' },
  cloturee: { label: 'Clôturé', ton: 'violet' },
  en_transit: { label: 'En transit', ton: 'cyan' },
  arrivee: { label: 'Arrivé', ton: 'vert' },
  en_douane: { label: 'En douane', ton: 'orange' },
  dechargee: { label: 'Déchargé', ton: 'vert' },
  annulee: { label: 'Annulé', ton: 'rouge' },
};

/** Statuts qu'un admin peut appliquer à un conteneur (changerStatutSchema). */
export const STATUTS_ROTATION_CIBLES = [
  'ouverte',
  'cloturee',
  'en_transit',
  'arrivee',
  'en_douane',
  'dechargee',
  'annulee',
];

export const MODES_TRANSPORT: Record<string, string> = {
  aerien: 'Aérien',
  maritime: 'Maritime',
  routier: 'Routier',
};

export const STATUTS_FACTURE: Record<string, { label: string; ton: Ton }> = {
  brouillon: { label: 'Brouillon', ton: 'gris' },
  en_attente: { label: 'En attente', ton: 'orange' },
  partiellement_payee: { label: 'Partiellement payée', ton: 'violet' },
  payee: { label: 'Payée', ton: 'vert' },
  annulee: { label: 'Annulée', ton: 'gris' },
  remboursee: { label: 'Remboursée', ton: 'cyan' },
};

export const STATUTS_PAIEMENT: Record<string, { label: string; ton: Ton }> = {
  en_attente: { label: 'En attente', ton: 'orange' },
  succes: { label: 'Réussi', ton: 'vert' },
  echoue: { label: 'Échoué', ton: 'rouge' },
  rembourse: { label: 'Remboursé', ton: 'cyan' },
  partiel: { label: 'Partiel', ton: 'violet' },
};

export const METHODES_PAIEMENT: Record<string, string> = {
  wave: 'Wave',
  orange_money: 'Orange Money',
  free_money: 'Free Money',
  carte: 'Carte bancaire',
  virement: 'Virement',
  especes: 'Espèces',
  paypal: 'PayPal',
};

export const STATUTS_RECLAMATION: Record<string, { label: string; ton: Ton }> = {
  ouverte: { label: 'Ouverte', ton: 'orange' },
  en_cours: { label: 'En cours', ton: 'bleu' },
  attente_client: { label: 'Attente client', ton: 'violet' },
  resolue: { label: 'Résolue', ton: 'vert' },
  rejetee: { label: 'Rejetée', ton: 'rouge' },
  cloturee: { label: 'Clôturée', ton: 'gris' },
};

/** Machine à états des réclamations (ReclamationService.TRANSITIONS). */
export const TRANSITIONS_RECLAMATION: Record<string, string[]> = {
  ouverte: ['en_cours', 'attente_client', 'rejetee', 'cloturee'],
  en_cours: ['attente_client', 'resolue', 'rejetee'],
  attente_client: ['en_cours', 'resolue', 'rejetee', 'cloturee'],
  resolue: ['cloturee'],
  rejetee: ['cloturee', 'en_cours'],
  cloturee: [],
};

export const TYPES_RECLAMATION: Record<string, string> = {
  perte: 'Perte',
  avarie: 'Avarie',
  retard: 'Retard',
  erreur_livraison: 'Erreur de livraison',
  facturation: 'Facturation',
  douane: 'Douane',
  autre: 'Autre',
};

export const PRIORITES: Record<string, { label: string; ton: Ton }> = {
  basse: { label: 'Basse', ton: 'gris' },
  normale: { label: 'Normale', ton: 'bleu' },
  haute: { label: 'Haute', ton: 'orange' },
  critique: { label: 'Critique', ton: 'rouge' },
};

export const ROLES: Record<string, string> = {
  client: 'Client',
  coursier: 'Coursier',
  agent_point: 'Agent de point',
  admin: 'Administrateur',
  super_admin: 'Super admin',
};

export const TYPES_POINT: Record<string, string> = {
  agence: 'Agence',
  point_relais: 'Point relais',
  casier: 'Casier',
  hub: 'Hub de tri',
  entrepot: 'Entrepôt',
};

export const libelle = (table: Record<string, string>, cle?: string | null) =>
  (cle && table[cle]) || cle || '—';

export const SERVICES_POINT: Record<string, string> = {
  depot: 'Dépôt',
  retrait: 'Retrait',
  paiement: 'Paiement sur place',
  emballage: 'Emballage',
  pesee: 'Pesée',
  declaration_douane: 'Aide douane',
};

export const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

export const OPTIONS_PAYS = { FR: 'France', SN: 'Sénégal' };
export const DEVISES: Record<string, string> = { EUR: 'Euro (€)', XOF: 'Franc CFA (FCFA)' };

export const TYPES_SURCHARGE: Record<string, string> = {
  carburant: 'Carburant',
  zone_eloignee: 'Zone éloignée',
  manutention: 'Manutention',
  hors_gabarit: 'Hors gabarit',
  marchandise_dangereuse: 'Marchandise dangereuse',
  assurance: 'Assurance',
  livraison_domicile: 'Livraison à domicile',
  livraison_samedi: 'Livraison le samedi',
  securite: 'Sécurité',
  formalites_douane: 'Formalités douanières',
  emballage: 'Emballage',
  stockage: 'Stockage',
};

export const MODES_SURCHARGE: Record<string, string> = {
  pourcentage: 'Pourcentage',
  montant_fixe: 'Montant fixe',
  par_kg: 'Par kg',
};

export const ASSIETTES_SURCHARGE: Record<string, string> = {
  fret: 'Fret',
  fret_et_surcharges: 'Fret + surcharges',
  valeur_declaree: 'Valeur déclarée',
};

export const STATUTS_ENLEVEMENT: Record<string, { label: string; ton: Ton }> = {
  demande: { label: 'Demandé', ton: 'orange' },
  planifie: { label: 'Planifié', ton: 'bleu' },
  en_cours: { label: 'En cours', ton: 'cyan' },
  effectue: { label: 'Effectué', ton: 'vert' },
  echoue: { label: 'Échoué', ton: 'rouge' },
  annule: { label: 'Annulé', ton: 'gris' },
};

export const CRENEAUX: Record<string, string> = {
  '08:00-12:00': 'Matin (8 h – 12 h)',
  '12:00-16:00': 'Après-midi (12 h – 16 h)',
  '16:00-20:00': 'Fin de journée (16 h – 20 h)',
};

export const STATUTS_DOUANE: Record<string, { label: string; ton: Ton }> = {
  brouillon: { label: 'Brouillon', ton: 'gris' },
  soumise: { label: 'Soumise', ton: 'bleu' },
  en_cours: { label: 'En cours', ton: 'cyan' },
  bloquee: { label: 'Bloquée', ton: 'rouge' },
  dedouanee: { label: 'Dédouanée', ton: 'vert' },
  refusee: { label: 'Refusée', ton: 'rouge' },
};

export const INCOTERMS: Record<string, string> = {
  DAP: 'DAP — droits payés par le destinataire',
  DDP: 'DDP — droits payés par l’expéditeur',
};

export const UNITES_DOUANE: Record<string, string> = {
  piece: 'Pièce', kg: 'kg', litre: 'Litre', metre: 'Mètre', paire: 'Paire', lot: 'Lot',
};

export const TYPES_DOCUMENT_DOUANE: Record<string, string> = {
  facture_commerciale: 'Facture commerciale',
  certificat_origine: "Certificat d'origine",
  licence: 'Licence',
  autorisation: 'Autorisation',
  justificatif: 'Justificatif',
};

export const ETATS_MARCHANDISE: Record<string, string> = { neuf: 'Neuf', occasion: 'Occasion' };

export const TYPES_FACTURE: Record<string, string> = {
  expedition: 'Expédition',
  enlevement: 'Enlèvement',
  stockage: 'Stockage',
  douane: 'Douane',
  avoir: 'Avoir',
  divers: 'Divers',
};

export const TYPES_EMBALLAGE_CATALOGUE: Record<string, string> = { contenant: 'Contenant', prestation: 'Prestation' };

export const EMPLACEMENTS_ANNONCE: Record<string, string> = { accueil: 'Accueil', banniere: 'Bannière', popup: 'Fenêtre (popup)' };

export const NIVEAUX_ANNONCE: Record<string, { label: string; ton: Ton }> = {
  info: { label: 'Information', ton: 'bleu' },
  succes: { label: 'Bonne nouvelle', ton: 'vert' },
  alerte: { label: 'Alerte', ton: 'orange' },
};

export const STATUTS_TOURNEE: Record<string, { label: string; ton: Ton }> = {
  brouillon: { label: 'Brouillon', ton: 'gris' },
  ouverte: { label: 'Ouverte aux inscriptions', ton: 'bleu' },
  complete: { label: 'Complète', ton: 'violet' },
  en_cours: { label: 'En cours', ton: 'cyan' },
  terminee: { label: 'Terminée', ton: 'vert' },
  annulee: { label: 'Annulée', ton: 'rouge' },
};

export const STATUTS_AVIS: Record<string, { label: string; ton: Ton }> = {
  en_attente: { label: 'À modérer', ton: 'orange' },
  publie: { label: 'Publié', ton: 'vert' },
  rejete: { label: 'Rejeté', ton: 'rouge' },
};

export const RUBRIQUES_FAQ: Record<string, string> = {
  general: 'Général', expedition: 'Expédition', tarifs: 'Tarifs', paiement: 'Paiement',
  suivi: 'Suivi', douane: 'Douane', compte: 'Compte',
};

export const STATUTS_SUPPRESSION: Record<string, { label: string; ton: Ton }> = {
  en_attente: { label: 'En attente', ton: 'orange' },
  traitee: { label: 'Traitée (compte supprimé)', ton: 'vert' },
  rejetee: { label: 'Rejetée', ton: 'gris' },
};

export const PLATEFORMES: Record<string, string> = { android: 'Android', ios: 'iOS' };

/** Objets du journal d'activité (noms de modèles côté API → libellés). */
export const ENTITES_JOURNAL: Record<string, string> = {
  Colis: 'Colis',
  Facture: 'Facture',
  Paiement: 'Paiement',
  User: 'Utilisateur',
  Rotation: 'Conteneur',
  Reclamation: 'Réclamation',
  DemandeEnlevement: 'Enlèvement',
  PointCollecte: 'Point de collecte',
  Tarif: 'Tarif',
  ParametreSysteme: 'Paramètre',
};

const VERBES_JOURNAL: Record<string, string> = {
  login: 'Connexion', register: 'Inscription', logout: 'Déconnexion',
  activate: 'Activation', deactivate: 'Désactivation', create: 'Création', update: 'Modification',
  delete: 'Suppression', effectue: 'Enlèvement effectué', encaisser: 'Encaissement', rembourser: 'Remboursement',
  info: 'Information de suivi', refuse: 'Refus', proposer: 'Proposition tarifaire',
};

/** « admin.personnel.activate » → « Personnel · Activation » (repli : code brut). */
export function libelleAction(code: string): string {
  const parties = code.split('.').filter((p) => p !== 'admin');
  const verbe = VERBES_JOURNAL[parties[parties.length - 1]];
  if (!verbe) return code;
  const objet = parties.slice(0, -1).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  return objet ? `${objet} · ${verbe}` : verbe;
}

/** Rétablit accents et apostrophes sur les libellés saisis en base (« Expedition », « de l enlèvement »). */
export function corrigerTexte(s?: string | null): string {
  if (!s) return '';
  return s
    .replace(/\bExpedition\b/g, 'Expédition')
    .replace(/\b([dDlL]|qu|Qu|n|N) (?=[aeiouyhàâéèêîôûAEIOUYH])/g, "$1’");
}
