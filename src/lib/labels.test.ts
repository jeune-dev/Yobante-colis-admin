import { describe, expect, it } from 'vitest';
import { libelleAction } from './labels';

describe('libelleAction', () => {
  it('nomme les actions de remise au destinataire', () => {
    expect(libelleAction('colis.remise.confirmee')).toBe('Remise · Confirmée dans l’application du destinataire');
    expect(libelleAction('colis.remise.sans_application')).toBe('Remise · Sans l’application (code de retrait)');
    expect(libelleAction('admin.colis.remise_sans_reglement')).toBe('Remise · Malgré une facture impayée');
  });

  it('nomme les étapes de suivi et le dépôt d’un avis', () => {
    expect(libelleAction('colis.suivi.retire')).toBe('Suivi · Retiré par le destinataire');
    expect(libelleAction('colis.suivi.livre')).toBe('Suivi · Remis au destinataire');
    expect(libelleAction('avis.deposer')).toBe('Avis · Dépôt');
  });

  it('déduit les autres du dernier segment, ou rend le code brut', () => {
    expect(libelleAction('admin.personnel.activate')).toBe('Personnel · Activation');
    expect(libelleAction('admin.inconnu.truc')).toBe('admin.inconnu.truc');
  });
});
