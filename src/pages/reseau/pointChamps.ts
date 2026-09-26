import type { ChampDef } from '@/components/FormModal';
import { OPTIONS_PAYS, SERVICES_POINT, TYPES_POINT } from '@/lib/labels';

type Opt = { value: string; label: string }[];

/** Champs du formulaire de point de collecte (création et modification). */
export const champsPoint = (villes: Opt, hubs: Opt): ChampDef[] => [
  { name: 'code', label: 'Code', required: true, placeholder: 'SN-DKR-01' },
  { name: 'nom', label: 'Nom', required: true },
  { name: 'type', label: 'Type', type: 'select', options: TYPES_POINT, required: true },
  { name: 'pays', label: 'Pays', type: 'select', options: OPTIONS_PAYS, required: true },
  { name: 'villeId', label: 'Ville', type: 'select', options: villes, required: true },
  { name: 'adresse', label: 'Adresse', required: true },
  { name: 'complementAdresse', label: "Complément d'adresse" },
  { name: 'quartier', label: 'Quartier' },
  { name: 'codePostal', label: 'Code postal' },
  { name: 'telephone', label: 'Téléphone', type: 'tel' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'latitude', label: 'Latitude', type: 'number' },
  { name: 'longitude', label: 'Longitude', type: 'number' },
  { name: 'services', label: 'Prestations', type: 'multiselect', options: SERVICES_POINT },
  { name: 'capaciteMaxColis', label: 'Capacité max (colis)', type: 'number', step: '1' },
  { name: 'poidsMaxColisKg', label: 'Poids max par colis (kg)', type: 'number' },
  { name: 'delaiGardeJours', label: 'Délai de garde (jours)', type: 'number', step: '1' },
  { name: 'hubRattachementId', label: 'Hub de rattachement', type: 'select', options: hubs },
  { name: 'instructionsAcces', label: "Instructions d'accès", type: 'textarea' },
  { name: 'visiblePublic', label: 'Visible dans les applications', type: 'checkbox' },
  { name: 'isActive', label: 'Actif', type: 'checkbox' },
];
