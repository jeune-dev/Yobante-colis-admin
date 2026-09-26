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

/**
 * Politique appliquée aux documents du backend : ils ne contiennent que du HTML et du
 * CSS en ligne, donc aucun script n'est autorisé. Une URL blob s'exécute avec l'origine
 * du back-office (accès à la session) : si une donnée mal échappée côté serveur glissait
 * un script dans un document, il serait bloqué ici.
 */
export const CSP_DOCUMENT =
  "default-src 'none'; style-src 'unsafe-inline'; img-src data: blob: https:; font-src data: https:; base-uri 'none'; form-action 'none'";

export const confinerHtml = (html: string) => {
  const meta = `<meta http-equiv="Content-Security-Policy" content="${CSP_DOCUMENT}">`;
  // La balise doit précéder tout contenu actif pour s'appliquer à l'ensemble du document
  return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (h) => `${h}${meta}`) : `${meta}${html}`;
};

/** Ouvre un document HTML du backend (étiquettes, bordereau, manifeste…) dans un onglet. */
export const ouvrirDocument = (html: string) => {
  const url = URL.createObjectURL(new Blob([confinerHtml(html)], { type: 'text/html' }));
  // noopener : le document ouvert n'a pas de référence vers la fenêtre du back-office
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

export const telecharger = (blob: Blob, nom: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  a.click();
  // Révocation différée : certains navigateurs lisent l'URL après le clic
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
};

/** N'accepte que les liens http(s) venant de l'API (refuse `javascript:`, `data:`…). */
export const urlSure = (url?: string | null) => {
  if (!url) return undefined;
  try {
    const u = new URL(url, window.location.origin);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : undefined;
  } catch {
    return undefined;
  }
};
