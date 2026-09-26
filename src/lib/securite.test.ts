import { describe, expect, it } from 'vitest';
import { routeDepuisLien } from './liens';
import { CSP_DOCUMENT, confinerHtml, montant, urlSure } from './format';
import { politiqueSecurite } from './csp';

describe('routeDepuisLien (S-05)', () => {
  it('traduit les liens de l’API en écrans du back-office', () => {
    expect(routeDepuisLien('/admin/colis/f381b0c7-8073-4be1-88bf-6c6d19be34f4')).toBe('/colis/f381b0c7-8073-4be1-88bf-6c6d19be34f4');
    expect(routeDepuisLien('https://api.exemple.com/api/v1/admin/rotations/abc')).toBe('/conteneurs/abc');
    expect(routeDepuisLien('/admin/users/42')).toBe('/clients/42');
  });

  it.each(['//evil.com', '/\\evil.com', '/%5Cevil.com', 'javascript:alert(1)', 'https://evil.com//evil.com', '/colis?x=1', ''])(
    'refuse le lien %j',
    (lien) => expect(routeDepuisLien(lien)).toBeNull()
  );

  it('ne transforme pas un chemin qui commence seulement par « /admin »', () => {
    expect(routeDepuisLien('/administrateurs')).toBe('/administrateurs');
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
