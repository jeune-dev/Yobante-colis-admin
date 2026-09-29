import { describe, expect, it } from 'vitest';
import { routeDepuisLien } from './liens';
import { nouvelleAdresse } from './routes';
import { CSP_DOCUMENT, confinerHtml, montant, urlSure } from './format';
import { politiqueSecurite } from './csp';

describe('routeDepuisLien (S-05)', () => {
  it('traduit les liens de l’API en écrans du back-office', () => {
    expect(routeDepuisLien('/admin/colis/f381b0c7-8073-4be1-88bf-6c6d19be34f4')).toBe('/admin/detail-colis/f381b0c7-8073-4be1-88bf-6c6d19be34f4');
    expect(routeDepuisLien('https://api.exemple.com/api/v1/admin/rotations/abc')).toBe('/admin/detail-conteneur/abc');
    expect(routeDepuisLien('/admin/users/42')).toBe('/admin/detail-client/42');
    expect(routeDepuisLien('/admin/reclamations')).toBe('/admin/liste-reclamations');
    expect(routeDepuisLien('/admin/inconnu/1')).toBeNull();
  });

  it.each(['//evil.com', '/\\evil.com', '/%5Cevil.com', 'javascript:alert(1)', 'https://evil.com//evil.com', '/colis?x=1', ''])(
    'refuse le lien %j',
    (lien) => expect(routeDepuisLien(lien)).toBeNull()
  );

  it('ne transforme pas un chemin qui commence seulement par « /admin »', () => {
    expect(routeDepuisLien('/administrateurs')).toBe('/admin/liste-administrateurs');
  });
});

describe('urlSure (S-06)', () => {
  it('accepte http et https', () => {
    expect(urlSure('https://res.cloudinary.com/x.png')).toBe('https://res.cloudinary.com/x.png');
  });

  it.each(['javascript:alert(1)', 'JAVASCRIPT:alert(1)', 'data:text/html,<script>alert(1)</script>', 'vbscript:x'])(
    'refuse %j',
    (url) => expect(urlSure(url)).toBeUndefined()
  );

  it('ignore les valeurs vides', () => {
    expect(urlSure(null)).toBeUndefined();
    expect(urlSure('')).toBeUndefined();
  });
});

describe('confinerHtml (S-02)', () => {
  it('place la CSP juste après <head>, avant tout contenu', () => {
    const html = confinerHtml('<!doctype html><html><head><title>x</title></head><body><script>alert(1)</script></body></html>');
    expect(html.indexOf('Content-Security-Policy')).toBeLessThan(html.indexOf('<title>'));
    expect(html).toContain(CSP_DOCUMENT);
  });

  it('interdit tout script dans les documents', () => {
    expect(CSP_DOCUMENT).toContain("default-src 'none'");
    expect(CSP_DOCUMENT).not.toMatch(/script-src/);
  });

  it('s’applique aussi à un script placé avant <head> (S-02 bis)', () => {
    const html = confinerHtml('<!doctype html><script>alert(1)</script><html><head></head><body></body></html>');
    expect(html.startsWith('<!doctype html><meta http-equiv="Content-Security-Policy"')).toBe(true);
    expect(html.indexOf('Content-Security-Policy')).toBeLessThan(html.indexOf('<script>'));
  });

  it('fonctionne aussi sans balise <head>', () => {
    expect(confinerHtml('<p>x</p>').startsWith('<meta http-equiv="Content-Security-Policy"')).toBe(true);
  });
});

describe('politiqueSecurite (S-03)', () => {
  it('autorise l’origine de l’API et elle seule en plus du site', () => {
    const csp = politiqueSecurite('https://yobnate-colis-back.onrender.com/api/v1');
    expect(csp).toContain("connect-src 'self' https://yobnate-colis-back.onrender.com;");
    expect(csp).toContain("script-src 'self';");
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it('reste en même origine quand l’API est relayée sous /api', () => {
    expect(politiqueSecurite('/api')).toContain("connect-src 'self';");
    expect(politiqueSecurite(undefined)).toContain("connect-src 'self';");
  });
});

describe('montant', () => {
  it('formate le franc CFA sans décimales et l’euro avec deux', () => {
    expect(montant('1500.00', 'XOF').replace(/\s/g, ' ')).toBe('1 500 FCFA');
    expect(montant(12.5, 'EUR').replace(/\s/g, ' ')).toBe('12,50 €');
    expect(montant(null)).toBe('—');
  });
});

describe('anciennes adresses (redirection sans sortie du back-office)', () => {
  it('traduit listes et détails vers /admin', () => {
    expect(nouvelleAdresse('/colis')).toBe('/admin/liste-colis');
    expect(nouvelleAdresse('/colis/abc-123')).toBe('/admin/detail-colis/abc-123');
    expect(nouvelleAdresse('/')).toBe('/admin/tableau-de-bord');
    expect(nouvelleAdresse('/admin')).toBe('/admin/tableau-de-bord');
  });

  it.each(['//evil.com', '/\\evil.com', '/colis/../../x', '/colis/a/b', '/inconnu', '/colis/%2F%2Fevil.com', '/admin/../../'])(
    'refuse %j',
    (c) => expect(nouvelleAdresse(c)).toBeNull()
  );
});
