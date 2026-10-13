import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import type { Liste, Paiement } from '@/api/types';
import Icon from '@/components/Icon';
import { FormModal } from '@/components/FormModal';
import { Card, Empty, ErrorBox, Field, KV, Loader, Modal, Pagination, SearchInput, Stat, StatutBadge, toast } from '@/components/ui';
import { METHODES_PAIEMENT, STATUTS_PAIEMENT, libelle } from '@/lib/labels';
import { dateHeure, montant, nomComplet, telecharger } from '@/lib/format';
import { useFiltres, useInvalider } from '@/lib/hooks';
import { usePointsOptions } from '@/lib/options';
import ResponsiveTable from '@/components/ResponsiveTable';

interface StatsPaiements {
  parMethode: { methode: string; devise: string; nombre: number; total: number }[];
  parDevise: { devise: string; encaisse: number; rembourse: number; net: number }[];
}

type PaiementDetail = Paiement & { commentaire?: string; montantRembourse?: string; motifRemboursement?: string; rembourseAt?: string };

export default function PaiementsPage() {
  const invalider = useInvalider();
  const [detail, setDetail] = useState<string | null>(null);
  const [action, setAction] = useState<{ type: 'rembourser' | 'echec'; paiement: Paiement } | null>(null);
  const [caisse, setCaisse] = useState(false);
  const { filtres, page, set, setPage } = useFiltres({ reference: '', statut: '', methode: '', devise: '', pointCollecteId: '', dateDebut: '', dateFin: '' });
  const points = usePointsOptions();

  const q = useQuery({
    queryKey: ['paiements', filtres, page],
    queryFn: () => api.get<Liste<'paiements', Paiement>>('/admin/paiements', { ...filtres, page, limit: 20 }),
    placeholderData: keepPreviousData,
  });
  const stats = useQuery({
    queryKey: ['paiements', 'statistiques', filtres],
    queryFn: () => api.get<{ statistiques: StatsPaiements }>('/admin/paiements/statistiques', filtres).then((r) => r.statistiques),
    placeholderData: keepPreviousData,
  });

  const exporter = async () => {
    try {
      telecharger(await api.blob('/admin/paiements/export', filtres), 'paiements.csv');
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <>
      <div className="stats">
        {stats.data?.parDevise.map((d) => (
          <Stat key={d.devise} icon="coins" ton="vert" value={montant(d.net, d.devise)} label={`Encaissé net (${d.devise})`}
            hint={`Brut ${montant(d.encaisse, d.devise)} · remboursé ${montant(d.rembourse, d.devise)}`} />
        ))}
        {stats.data?.parMethode.slice(0, 4).map((m) => (
          <Stat key={`${m.methode}-${m.devise}`} icon="credit-card" ton="bleu" value={montant(m.total, m.devise)}
            label={libelle(METHODES_PAIEMENT, m.methode)} hint={`${m.nombre} opération(s)`} onClick={() => set('methode', m.methode)} />
        ))}
      </div>

      <div className="toolbar">
        <SearchInput value={filtres.reference} onChange={(v) => set('reference', v)} placeholder="Référence…" />
        <select className="select" value={filtres.statut} onChange={(e) => set('statut', e.target.value)}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUTS_PAIEMENT).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="select" value={filtres.methode} onChange={(e) => set('methode', e.target.value)}>
          <option value="">Toutes méthodes</option>
          {Object.entries(METHODES_PAIEMENT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="select" value={filtres.pointCollecteId} onChange={(e) => set('pointCollecteId', e.target.value)}>
          <option value="">Tous points</option>
          {points.data?.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <input className="input" type="date" title="À partir du" value={filtres.dateDebut} onChange={(e) => set('dateDebut', e.target.value)} />
        <input className="input" type="date" title="Jusqu'au" value={filtres.dateFin} onChange={(e) => set('dateFin', e.target.value)} />
        <div className="actions pousser">
          <button className="btn secondary" onClick={() => setCaisse(true)}><Icon name="inbox" size={15} /> Caisse d'un point</button>
          <button className="btn secondary" onClick={exporter}><Icon name="download" size={15} /> CSV</button>
        </div>
      </div>

      <ErrorBox error={q.error} />
      <Card flush>
        {q.isLoading ? <Loader /> : !q.data?.paiements.length ? <Empty>Aucun paiement</Empty> : (
          <ResponsiveTable
            lignes={q.data.paiements}
            cleLigne={(p) => p.id}
            colonnes={[
              { cle: 'reference', titre: 'Référence', className: 'mono', cellule: (p) => <button type="button" className="lien" onClick={() => setDetail(p.id)}>{p.reference}</button> },
              { cle: 'client', titre: 'Client', cellule: (p) => nomComplet(p.User) },
              { cle: 'facture', titre: 'Facture', className: 'mono', cellule: (p) => (p.facture ? <Link to={`/factures/${p.facture.id}`}>{p.facture.reference}</Link> : '—') },
              { cle: 'methode', titre: 'Méthode', cellule: (p) => libelle(METHODES_PAIEMENT, p.methode) },
              { cle: 'montant', titre: 'Montant', className: 'right', cellule: (p) => montant(p.montant, p.devise) },
              { cle: 'statut', titre: 'Statut', cellule: (p) => <StatutBadge table={STATUTS_PAIEMENT} valeur={p.statut} /> },
              { cle: 'encaisse', titre: 'Encaissé par', className: 'small', priorite: 'basse', cellule: (p) => (p.enregistrePar ? nomComplet(p.enregistrePar) : p.pointEncaissement?.nom ?? 'En ligne') },
              { cle: 'date', titre: 'Date', className: 'small muted', priorite: 'basse', cellule: (p) => dateHeure(p.payeAt ?? p.createdAt) },
              { cle: 'actions', cellule: (p) => (
                <div className="actions">
                  {['succes', 'partiel'].includes(p.statut) && (
                    <button className="btn secondary sm" onClick={() => setAction({ type: 'rembourser', paiement: p })}>Rembourser</button>
                  )}
                  {p.statut === 'en_attente' && (
                    <button className="btn ghost sm" onClick={() => setAction({ type: 'echec', paiement: p })}>Échec</button>
                  )}
                </div>
              ) },
            ]}
          />
        )}
        <Pagination info={q.data?.pagination} onPage={setPage} />
      </Card>

      {detail && <DialogueDetail id={detail} onClose={() => setDetail(null)} />}
      {action?.type === 'rembourser' && (
        <FormModal
          title={`Rembourser ${action.paiement.reference}`}
          intro={<p className="small">Montant encaissé : {montant(action.paiement.montant, action.paiement.devise)}. Laisser le montant vide pour rembourser tout le reste. Par défaut, la somme rendue n'est plus due : un avoir du même montant est imputé sur la facture.</p>}
          champs={[
            { name: 'montant', label: `Montant (${action.paiement.devise})`, type: 'number', step: '0.01' },
            { name: 'motif', label: 'Motif', required: true, full: true },
            { name: 'rouvrirFacture', label: 'La somme redevient due (paiement contesté, encaissement erroné)', type: 'checkbox', full: true },
          ]}
          submitLabel="Rembourser"
          danger
          succes="Remboursement effectué"
          onSubmit={async (corps) => { await api.patch(`/admin/paiements/${action.paiement.id}/rembourser`, corps); invalider('paiements', 'factures'); }}
          onClose={() => setAction(null)}
        />
      )}
      {action?.type === 'echec' && (
        <FormModal
          title={`Marquer ${action.paiement.reference} en échec`}
          champs={[{ name: 'motif', label: 'Motif', full: true }]}
          submitLabel="Confirmer"
          danger
          succes="Paiement marqué en échec"
          onSubmit={async (corps) => { await api.patch(`/admin/paiements/${action.paiement.id}/echec`, corps); invalider('paiements', 'factures'); }}
          onClose={() => setAction(null)}
        />
      )}
      {caisse && <DialogueCaisse onClose={() => setCaisse(false)} />}
    </>
  );
}

function DialogueDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const q = useQuery({
    queryKey: ['paiements', id],
    queryFn: () => api.get<{ paiement: PaiementDetail }>(`/admin/paiements/${id}`).then((r) => r.paiement),
  });
  const p = q.data;
  return (
    <Modal title={p ? `Paiement ${p.reference}` : 'Paiement'} onClose={onClose}>
      <ErrorBox error={q.error} />
      {!p ? <Loader /> : (
        <div className="kv">
          <KV label="Statut"><StatutBadge table={STATUTS_PAIEMENT} valeur={p.statut} /></KV>
          <KV label="Montant">{montant(p.montant, p.devise)}</KV>
          <KV label="Méthode">{libelle(METHODES_PAIEMENT, p.methode)}</KV>
          <KV label="Réf. transaction">{p.referenceTransaction || '—'}</KV>
          <KV label="Client">{nomComplet(p.User)}</KV>
          <KV label="Facture">{p.facture ? <Link to={`/factures/${p.facture.id}`} onClick={onClose}>{p.facture.reference}</Link> : '—'}</KV>
          <KV label="Point d'encaissement">{p.pointEncaissement?.nom ?? '—'}</KV>
          <KV label="Enregistré par">{p.enregistrePar ? nomComplet(p.enregistrePar) : 'En ligne'}</KV>
          <KV label="Payé le">{dateHeure(p.payeAt)}</KV>
          <KV label="Remboursé">{p.montantRembourse ? `${montant(p.montantRembourse, p.devise)} le ${dateHeure(p.rembourseAt)}` : '—'}</KV>
          {p.motifRemboursement && <KV label="Motif du remboursement">{p.motifRemboursement}</KV>}
          {p.commentaire && <KV label="Commentaire">{p.commentaire}</KV>}
        </div>
      )}
    </Modal>
  );
}

interface Caisse {
  point: { nom: string; pays: string };
  date: string;
  nbOperations: number;
  total: number;
  parMethode: Record<string, number>;
  operations: Paiement[];
}

function DialogueCaisse({ onClose }: { onClose: () => void }) {
  const points = usePointsOptions();
  const [pointId, setPointId] = useState('');
  const [jour, setJour] = useState(new Date().toISOString().slice(0, 10));
  const q = useQuery({
    queryKey: ['paiements', 'caisse', pointId, jour],
    queryFn: () => api.get<{ caisse: Caisse }>(`/admin/paiements/caisse/${pointId}`, { date: jour }).then((r) => r.caisse),
    enabled: !!pointId,
  });
  const devise = q.data?.point.pays === 'FR' ? 'EUR' : 'XOF';

  return (
    <Modal large title="État de caisse" onClose={onClose}>
      <div className="form-row">
        <Field label="Point de collecte">
          <select className="select" value={pointId} onChange={(e) => setPointId(e.target.value)}>
            <option value="">— Choisir —</option>
            {points.data?.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </Field>
        <Field label="Journée"><input className="input" type="date" value={jour} onChange={(e) => setJour(e.target.value)} /></Field>
      </div>
      <ErrorBox error={q.error} />
      {q.isFetching && <Loader />}
      {q.data && (
        <>
          <div className="stats">
            <Stat icon="coins" ton="vert" value={montant(q.data.total, devise)} label="Total encaissé" hint={`${q.data.nbOperations} opération(s)`} />
            {Object.entries(q.data.parMethode).map(([m, t]) => (
              <Stat key={m} icon="credit-card" value={montant(t, devise)} label={libelle(METHODES_PAIEMENT, m)} />
            ))}
          </div>
          {!q.data.operations.length ? <Empty>Aucune opération ce jour-là</Empty> : (
            <ResponsiveTable
              lignes={q.data.operations}
              cleLigne={(o) => o.id}
              colonnes={[
                { cle: 'heure', titre: 'Heure', className: 'small', mobile: 'soustitre', cellule: (o) => dateHeure(o.payeAt ?? o.createdAt) },
                { cle: 'reference', titre: 'Référence', className: 'mono', mobile: 'titre', cellule: (o) => o.reference },
                { cle: 'methode', titre: 'Méthode', cellule: (o) => libelle(METHODES_PAIEMENT, o.methode) },
                { cle: 'montant', titre: 'Montant', className: 'right', cellule: (o) => montant(o.montant, o.devise) },
              ]}
            />
          )}
        </>
      )}
    </Modal>
  );
}
