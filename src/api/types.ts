// Formes des objets renvoyés par yobnate-colis-back (modèles Sequelize sérialisés).
// Les DECIMAL PostgreSQL arrivent en chaînes : on les type `string | number`.

import type { PaginationInfo } from '@/components/ui';

export type { PaginationInfo };

export type Num = string | number;

export interface Personne {
  id: string;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
  role?: string;
}

export interface VilleRef {
  id: string;
  nom: string;
  pays?: string;
}

export interface PointRef {
  id: string;
  code: string;
  nom: string;
  pays?: string;
  adresse?: string;
}

export interface Piece {
  id: string;
  numeroSuivi?: string;
  designation?: string;
  typeEmballage?: string;
  poidsKg: Num;
  longueurCm?: Num;
  largeurCm?: Num;
  hauteurCm?: Num;
}

export interface Evenement {
  id: string;
  codeEvenement: string;
  libelle?: string;
  statut?: string;
  lieu?: string;
  pays?: string;
  commentaire?: string;
  motif?: string;
  dateEvenement: string;
  visiblePublic?: boolean;
  auteur?: Personne;
}

export interface Paiement {
  id: string;
  reference: string;
  montant: Num;
  devise: string;
  methode: string;
  statut: string;
  referenceTransaction?: string;
  payeAt?: string;
  createdAt: string;
  facture?: { id: string; reference: string; colis?: { id: string; reference: string } };
  User?: Personne;
  enregistrePar?: Personne;
  pointEncaissement?: PointRef;
}

export interface Facture {
  id: string;
  reference: string;
  type: string;
  statut: string;
  devise: string;
  montantHt: Num;
  montantTva: Num;
  montantTotal: Num;
  montantPaye: Num;
  /** Avoirs imputés sur la facture : ils réduisent le reste dû. */
  montantAvoirs?: Num;
  soldeDu?: Num;
  remise: Num;
  montantFret?: Num;
  montantSurcharges?: Num;
  montantAssurance?: Num;
  montantDroitsDouane?: Num;
  dateEmission?: string;
  dateLimitePaiement?: string;
  createdAt: string;
  lignes?: { libelle?: string; designation?: string; quantite?: Num; montant?: Num; prixUnitaire?: Num }[];
  colis?: { id: string; reference: string; statut: string };
  User?: Personne & { raisonSociale?: string };
  paiements?: Paiement[];
}

export interface Colis {
  id: string;
  reference: string;
  referenceClient?: string;
  categorie: string;
  statut: string;
  typeContenu?: string;
  description?: string;
  fragile?: boolean;
  marchandiseDangereuse?: boolean;
  expediteurNom: string;
  expediteurTelephone?: string;
  expediteurEmail?: string;
  expediteurEntreprise?: string;
  adresseDepart?: string;
  paysDepart: string;
  destinataireNom: string;
  destinataireTelephone?: string;
  destinataireEmail?: string;
  adresseLivraison?: string;
  destinataireQuartier?: string;
  destinataireArrondissement?: string;
  destinataireDepartement?: string;
  destinatairePointRepere?: string;
  instructionsLivraison?: string;
  paysArrivee: string;
  modeDepot?: string;
  modeLivraison?: string;
  nbPieces?: number;
  poidsReelKg?: Num;
  poidsVolumetriqueKg?: Num;
  poidsFactureKg?: Num;
  poidsVerifieKg?: Num;
  valeurDeclaree?: Num;
  deviseValeur?: string;
  assuranceSouscrite?: boolean;
  incoterm?: string;
  devise: string;
  montantFret?: Num;
  montantSurcharges?: Num;
  montantAssurance?: Num;
  montantTva?: Num;
  montantDroitsDouane?: Num;
  montantTotal?: Num;
  lignesForfait?: { libelle?: string; quantite?: number; prixUnitaire?: Num; montant?: Num }[];
  codeRetrait?: string;
  dateLivraisonEstimee?: string;
  dateLimiteEtude?: string;
  dateLimiteRetrait?: string;
  notesInternes?: string;
  photos?: unknown[];
  coutRevient?: Num | null;
  createdAt: string;
  enRetard?: boolean;
  transitionsPossibles?: string[];
  /** Événements que l'utilisateur connecté peut enregistrer maintenant (rôle, étape, transition). */
  evenementsPossibles?: CodeEvenement[];
  /** Remise en attente : le destinataire a un compte et confirme la remise dans son application. */
  destinataireACompte?: boolean;
  /** Remise en attente : solde à encaisser avant toute remise (faux en paiement différé). */
  reglementAvantRemise?: boolean;
  client?: Personne;
  villeDepart?: VilleRef;
  villeArrivee?: VilleRef;
  service?: { id: string; code: string; nom: string };
  pointActuel?: PointRef;
  pointCollecteDepart?: PointRef;
  pointRetrait?: PointRef;
  rotation?: { id: string; reference: string; statut: string; dateDepartPrevue?: string };
  coursierEnlevement?: Personne;
  coursierLivraison?: Personne;
  facture?: Facture;
  pieces?: Piece[];
  historique?: Evenement[];
  validateur?: Personne;
}

export interface Rotation {
  id: string;
  reference: string;
  numeroOrdre?: number;
  modeTransport: string;
  paysDepart: string;
  paysArrivee: string;
  transporteur?: string;
  numeroVol?: string;
  numeroConteneur?: string;
  dateCloture?: string;
  dateDepartPrevue: string;
  dateArriveePrevue: string;
  dateDepartEffective?: string;
  dateArriveeEffective?: string;
  capacitePoidsKg?: Num;
  capaciteColis?: number;
  poidsCharge?: Num;
  nbColisCharges?: number;
  statut: string;
  commentaire?: string;
  tauxRemplissagePoids?: number;
  estOuverteAuChargement?: boolean;
  colis?: Colis[];
}

export interface Client extends Personne {
  pays: string;
  typeCompte: string;
  raisonSociale?: string;
  numeroIdentificationFiscale?: string;
  isActive: boolean;
  emailVerifie?: boolean;
  remiseContractuelle?: Num;
  paiementDiffereAutorise?: boolean;
  plafondEncours?: Num;
  justificatifProUrl?: string;
  justificatifProValide?: boolean;
  codeParrainage?: string;
  creditParrainage?: Num;
  lastLoginAt?: string;
  createdAt: string;
  adresse?: string;
  ville?: VilleRef;
  pointCollecte?: PointRef;
}

export interface Reclamation {
  id: string;
  reference: string;
  type: string;
  objet: string;
  description: string;
  statut: string;
  priorite: string;
  montantReclame: Num;
  montantAccorde?: Num;
  devise: string;
  resolution?: string;
  motifRejet?: string;
  dateEcheance?: string;
  createdAt: string;
  client?: Personne;
  agentAssigne?: Personne;
  colis?: { id: string; reference: string; statut: string };
  messages?: {
    id: string;
    message: string;
    origine?: string;
    interne?: boolean;
    piecesJointes?: unknown[];
    createdAt: string;
    auteur?: Personne;
  }[];
}

export type Liste<K extends string, T> = { [key in K]: T[] } & { pagination: PaginationInfo };

/** Événement de suivi enregistrable (catalogue ou possibles pour un colis). */
export interface CodeEvenement {
  code: string;
  libelle: string;
  statutInduit: string | null;
}
