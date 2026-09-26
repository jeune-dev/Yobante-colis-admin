import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/api/client';
import type { Client, Colis, Liste } from '@/api/types';
import Icon from '@/components/Icon';
import { Badge, Card, Empty, ErrorBox, Field, KV, Loader, Modal, Pagination, Stat, StatutBadge } from '@/components/ui';
import { CATEGORIES_COURT, PAYS, STATUTS_COLIS, libelle } from '@/lib/labels';
import { date, dateHeure, montant, nomComplet } from '@/lib/format';
import { useAction } from '@/lib/hooks';

type ClientDetail = Client & { stats: { nbColisEnvoyes: number; nbColisLivres: number; encours: number } };

export default function ClientDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [conditions, setConditions] = useState(false);

  const q = useQuery({
    queryKey: ['clients', id],
    queryFn: () => api.get<{ utilisateur: ClientDetail }>(`/admin/users/${id}`).then((r) => r.utilisateur),
  });
  const colis = useQuery({
    queryKey: ['clients', id, 'colis', page],
    queryFn: () => api.get<Liste<'colis', Colis>>(`/admin/users/${id}/colis`, { page, limit: 10 }),
    placeholderData: keepPreviousData,
  });
  const statut = useAction((isActive: boolean) => api.patch(`/admin/users/${id}/statut`, { isActive }), {
    succes: 'Compte mis à jour',
    invalider: ['clients'],
  });

  if (q.isLoading) return <Loader />;
  if (q.error) return <ErrorBox error={q.error} />;
  const u = q.data!;

  return (
    <>
      <span className="back" onClick={() => navigate(-1)}><Icon name="arrow-left" size={15} /> Retour</span>
      <div className="hero">
        <span className="hero-ref" style={{ fontFamily: 'inherit' }}>{nomComplet(u)}</span>
        {u.isActive ? <Badge ton="vert">Actif</Badge> : <Badge ton="rouge">Suspendu</Badge>}
        {u.typeCompte === 'entreprise' && <Badge ton="violet">Professionnel</Badge>}
        <div className="actions">
          <button className="btn secondary" onClick={() => setConditions(true)}>
            <Icon name="settings" size={15} /> Conditions commerciales
          </button>
          <button className={`btn ${u.isActive ? 'danger' : 'success'}`}
            onClick={() => confirm(u.isActive ? 'Suspendre ce compte ?' : 'Réactiver ce compte ?') && statut.mutate(!u.isActive)}>
            {u.isActive ? 'Suspendre' : 'Réactiver'}
          </button>
        </div>
      </div>

      <div className="stats">
        <Stat icon="package" value={u.stats.nbColisEnvoyes} label="Colis envoyés" />
        <Stat icon="check-circle" ton="vert" value={u.stats.nbColisLivres} label="Colis livrés" />
        <Stat icon="coins" ton="orange" value={montant(u.stats.encours, u.pays === 'FR' ? 'EUR' : 'XOF')} label="Encours impayé" />
      </div>

      <div className="grid grid-main-side">
        <Card title="Expéditions" flush>
          {colis.isLoading ? <Loader /> : !colis.data?.colis.length ? <Empty>Aucune expédition</Empty> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Référence</th><th>Cat.</th><th>Destinataire</th><th className="right">Montant</th><th>Statut</th><th>Date</th></tr></thead>
                <tbody>
                  {colis.data.colis.map((c) => (
                    <tr key={c.id} className="cliquable" onClick={() => navigate(`/colis/${c.id}`)}>
                      <td className="mono">{c.reference}</td>
                      <td><Badge ton="bleu">{CATEGORIES_COURT[c.categorie] ?? c.categorie}</Badge></td>
                      <td>{c.destinataireNom}</td>
                      <td className="right">{montant(c.montantTotal, c.devise)}</td>
                      <td><StatutBadge table={STATUTS_COLIS} valeur={c.statut} /></td>
                      <td className="small muted">{date(c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination info={colis.data?.pagination} onPage={setPage} />
        </Card>

        <Card title="Profil">
          <div className="kv one">
            <KV label="Email">{u.email}{u.emailVerifie === false && <> <Badge ton="orange">non vérifié</Badge></>}</KV>
            <KV label="Téléphone">{u.telephone}</KV>
            <KV label="Pays / ville">{libelle(PAYS, u.pays)}{u.ville && ` — ${u.ville.nom}`}</KV>
            <KV label="Adresse">{u.adresse || '—'}</KV>
            {u.typeCompte === 'entreprise' && (
              <>
                <KV label="Raison sociale">{u.raisonSociale}</KV>
                <KV label="NINEA / SIRET">{u.numeroIdentificationFiscale || '—'}</KV>
                <KV label="Justificatif pro">
                  {u.justificatifProUrl ? <a href={u.justificatifProUrl} target="_blank" rel="noreferrer">Voir le document</a> : '—'}
                  {u.justificatifProValide && <> <Badge ton="vert">validé</Badge></>}
                </KV>
              </>
            )}
            <KV label="Remise contractuelle">{u.remiseContractuelle ? `${u.remiseContractuelle} %` : '—'}</KV>
            <KV label="Paiement différé">{u.paiementDiffereAutorise ? `Oui (plafond ${u.plafondEncours ?? '—'})` : 'Non'}</KV>
            <KV label="Code parrainage">{u.codeParrainage || '—'}</KV>
            <KV label="Dernière connexion">{dateHeure(u.lastLoginAt)}</KV>
            <KV label="Inscrit le">{date(u.createdAt)}</KV>
          </div>
        </Card>
      </div>

      {conditions && <DialogueConditions client={u} onClose={() => setConditions(false)} />}
    </>
  );
}

function DialogueConditions({ client, onClose }: { client: Client; onClose: () => void }) {
  const [remise, setRemise] = useState(String(client.remiseContractuelle ?? 0));
  const [differe, setDiffere] = useState(!!client.paiementDiffereAutorise);
  const [plafond, setPlafond] = useState(client.plafondEncours != null ? String(client.plafondEncours) : '');
  const [justificatif, setJustificatif] = useState(!!client.justificatifProValide);

  const a = useAction(
    () => api.patch(`/admin/users/${client.id}/conditions-commerciales`, {
      remiseContractuelle: Number(remise) || 0,
      paiementDiffereAutorise: differe,
      plafondEncours: plafond === '' ? null : Number(plafond),
      justificatifProValide: justificatif,
    }),
    { succes: 'Conditions commerciales enregistrées', invalider: ['clients'] }
  );

  return (
    <Modal title="Conditions commerciales" onClose={onClose} footer={
      <>
        <button className="btn secondary" onClick={onClose}>Annuler</button>
        <button className="btn" onClick={() => a.mutate(undefined, { onSuccess: onClose })} disabled={a.isPending}>Enregistrer</button>
      </>
    }>
      <Field label="Remise contractuelle (%)">
        <input className="input" type="number" min="0" max="100" value={remise} onChange={(e) => setRemise(e.target.value)} />
      </Field>
      <label className="check">
        <input type="checkbox" checked={differe} onChange={(e) => setDiffere(e.target.checked)} /> Paiement différé autorisé
      </label>
      {differe && (
        <Field label="Plafond d'encours" hint="Vide = sans plafond">
          <input className="input" type="number" min="0" value={plafond} onChange={(e) => setPlafond(e.target.value)} />
        </Field>
      )}
      {client.typeCompte === 'entreprise' && (
        <label className="check">
          <input type="checkbox" checked={justificatif} onChange={(e) => setJustificatif(e.target.checked)} />
          Justificatif professionnel (NINEA / Kbis) validé — active le tarif pro
        </label>
      )}
    </Modal>
  );
}
