/**
 * Content Security Policy du build de production, injectée dans index.html.
 * Générée ici plutôt que dans render.yaml : `connect-src` doit suivre VITE_API_URL,
 * qui n'est connu qu'au build. (frame-ancestors, ignoré dans une balise meta, est
 * envoyé en en-tête HTTP par render.yaml.)
 */
export function politiqueSecurite(apiUrl?: string) {
  let origineApi = '';
  if (apiUrl && /^https?:\/\//i.test(apiUrl)) origineApi = ` ${new URL(apiUrl).origin}`;
  return [
    "default-src 'self'",
    "script-src 'self'",
    // Inline autorisé pour les styles seulement : aperçu des emails et documents imprimables
    "style-src 'self' 'unsafe-inline'",
    // Photos, avatars et images d'annonces servis par Cloudinary ; blob: pour les documents
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self'${origineApi}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}
