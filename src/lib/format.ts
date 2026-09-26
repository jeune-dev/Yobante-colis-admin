const SYMBOLES: Record<string, string> = { EUR: '€', XOF: 'FCFA' };

/** Montant dans sa devise ; le franc CFA n'a pas de décimales. */
export const montant = (valeur?: number | string | null, devise = 'XOF') => {
  if (valeur === null || valeur === undefined || valeur === '') return '—';
  const n = Number(valeur);
  const dec = devise === 'XOF' ? 0 : 2;
  return `${n.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec })} ${SYMBOLES[devise] ?? devise}`;
};

export const date = (valeur?: string | null) =>
  valeur ? new Date(valeur).toLocaleDateString('fr-FR') : '—';

export const dateHeure = (valeur?: string | null) =>
  valeur
    ? new Date(valeur).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
    : '—';

export const poids = (kg?: number | string | null) =>
  kg === null || kg === undefined ? '—' : `${Number(kg).toLocaleString('fr-FR')} kg`;

export const nomComplet = (p?: { prenom?: string; nom?: string } | null) =>
  p ? `${p.prenom ?? ''} ${p.nom ?? ''}`.trim() || '—' : '—';

export const initiales = (p?: { prenom?: string; nom?: string } | null) =>
  `${p?.prenom?.[0] ?? ''}${p?.nom?.[0] ?? ''}`.toUpperCase() || 'A';

/** Ouvre un document HTML du backend (étiquettes, bordereau, manifeste…) dans un onglet. */
export const ouvrirDocument = (html: string) => {
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

export const telecharger = (blob: Blob, nom: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  a.click();
  URL.revokeObjectURL(url);
};
