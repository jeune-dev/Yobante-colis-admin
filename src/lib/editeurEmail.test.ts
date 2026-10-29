import { describe, expect, it } from 'vitest';
import { depuisEditeur, versEditeur } from './editeurEmail';

describe('éditeur des modèles d’email', () => {
  it('affiche les variables du texte en pastilles', () => {
    expect(versEditeur('<p>Bonjour {{prenom}},</p>')).toBe('<p>Bonjour <span data-variable="prenom"></span>,</p>');
  });

  it('laisse les variables des attributs intactes', () => {
    expect(versEditeur('<a href="{{lien}}">Voir</a>')).toBe('<a href="{{lien}}">Voir</a>');
  });

  it('rend le HTML attendu par l’API, variables comprises', () => {
    const editeur = '<p>Demande <strong><span data-variable="reference" class="variable-pastille">Référence</span></strong> validée</p>';
    expect(depuisEditeur(editeur)).toBe('<p>Demande <strong>{{reference}}</strong> validée</p>');
  });

  it('aller-retour sans perte', () => {
    const html = '<p>Montant : <strong>{{montant}}</strong>. {{instructions}}</p>';
    expect(depuisEditeur(versEditeur(html))).toBe(html);
  });
});
