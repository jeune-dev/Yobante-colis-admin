import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '@/api/client';
import type { Facture } from '@/api/types';
import Icon from '@/components/Icon';
import { Card, ErrorBox, Field, KV, Loader, Modal, StatutBadge, toast } from '@/components/ui';
import { METHODES_PAIEMENT, STATUTS_FACTURE, STATUTS_PAIEMENT, libelle } from '@/lib/labels';
import { date, dateHeure, montant, nomComplet, ouvrirDocument } from '@/lib/format';
import { useAction } from '@/lib/hooks';

type Dialogue = null | 'paiement' | 'remise' | 'annuler' | 'echeance' | 'avoir';

export default function FactureDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [dialogue, setDialogue] = useState<Dialogue>(null);

  const q = useQuery({
    queryKey: ['factures', id],
    queryFn: () => api.get<{ facture: Facture }>(`/admin/factures/${id}`).then((r) => r.facture),
  });
  const relancer = useAction(() => api.post(`/admin/factures/${id}/relance`), { succes: 'Relance envoyée au client' });

  if (q.isLoading) return <Loader />;
  if (q.error) return <ErrorBox error={q.error} />;
  const f = q.data!;
  const reste = Number(f.montantTotal) - Number(f.montantPaye);
  const ouverte = ['en_attente', 'partiellement_payee', 'brouillon'].includes(f.statut);
  const fermer = () => setDialogue(null);

  const document = async () => {
    try {
      ouvrirDocument(await api.html(`/admin/factures/${id}/document`));
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <>
      <span className="back" onClick={() => navigate(-1)}><Icon name="arrow-left" size={15} /> Retour</span>
      <div className="hero">
        <span className="hero-ref">{f.reference}</span>
        <StatutBadge table={STATUTS_FACTURE} valeur={f.statut} />
        <div className="actions">
          {ouverte && reste > 0 && (
            <button className="btn success" onClick={() => setDialogue('paiement')}><Icon name="coins" size={15} /> Encaisser</button>
          )}
          {ouverte && <button className="btn secondary" onClick={() => relancer.mutate()}><Icon name="mail" size={15} /> Relancer</button>}
          {ouverte && <button className="btn secondary" onClick={() => setDialogue('remise')}><Icon name="tag" size={15} /> Remise</button>}
          {ouverte && <button className="btn secondary" onClick={() => setDialogue('echeance')}><Icon name="calendar" size={15} /> Échéance</button>}
          <button className="btn secondary" onClick={document}><Icon name="printer" size={15} /> Imprimer</button>
          {ouverte && Number(f.montantPaye) === 0 && (
            <button className="btn danger" onClick={() => setDialogue('annuler')}>Annuler</button>
          )}
          {f.type !== 'avoir' && ['payee', 'partiellement_payee'].includes(f.statut) && (
            <button className="btn secondary" onClick={() => setDialogue('avoir')}><Icon name="arrow-down" size={15} /> Émettre un avoir</button>
          )}
        </div>
      </div>

      <div className="grid grid-main-side">
        <div>
          <Card title="Lignes" flush>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Désignation</th><th className="right">Montant</th></tr></thead>
                <tbody>
                  {f.lignes?.map((l, i) => (
                    <tr key={i}><td>{l.libelle ?? l.designation}</td><td className="right">{montant(l.montant, f.devise)}</td></tr>
                  ))}
                  {Number(f.remise) > 0 && <tr><td>Remise</td><td className="right">− {montant(f.remise, f.devise)}</td></tr>}
                  <tr><td className="muted">Montant HT</td><td className="right">{montant(f.montantHt, f.devise)}</td></tr>
                  <tr><td className="muted">TVA</td><td className="right">{montant(f.montantTva, f.devise)}</td></tr>
                  <tr><td><strong>Total</strong></td><td className="right"><strong>{montant(f.montantTotal, f.devise)}</strong></td></tr>
                </tbody>
              </table>
            </div>
          </Card>

          <Card title={`Paiements (${f.paiements?.length ?? 0})`} flush>
            {!f.paiements?.length ? <div className="card-body muted small">Aucun paiement</div> : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Référence</th><th>Méthode</th><th className="right">Montant</th><th>Statut</th><th>Date</th></tr></thead>
                  <tbody>
                    {f.paiements.map((p) => (
                      <tr key={p.id}>
                        <td className="mono">{p.reference}</td>
                        <td>{libelle(METHODES_PAIEMENT, p.methode)}</td>
                        <td className="right">{montant(p.montant, p.devise)}</td>
                        <td><StatutBadge table={STATUTS_PAIEMENT} valeur={p.statut} /></td>
                        <td className="small muted">{dateHeure(p.payeAt ?? p.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <Card title="Résumé">
          <div className="kv one">
            <KV label="Client">{f.User ? <>{f.User.raisonSociale || nomComplet(f.User)}<div className="muted small">{f.User.email}</div></> : '—'}</KV>
            <KV label="Colis">{f.colis ? <Link to={`/colis/${f.colis.id}`}>{f.colis.reference}</Link> : '—'}</KV>
            <KV label="Émise le">{date(f.dateEmission ?? f.createdAt)}</KV>
            <KV label="Échéance">{date(f.dateLimitePaiement)}</KV>
            <KV label="Payé">{montant(f.montantPaye, f.devise)}</KV>
            <KV label="Reste à payer"><strong>{montant(Math.max(reste, 0), f.devise)}</strong></KV>
          </div>
        </Card>
      </div>

      {dialogue === 'paiement' && <DialoguePaiement facture={f} reste={reste} onClose={fermer} />}
      {dialogue === 'remise' && <DialogueSimple facture={f} onClose={fermer} titre="Appliquer une remise" chemin="remise" methode="patch"
        champs={[{ cle: 'remise', label: `Remise (${f.devise})`, type: 'number', requis: true }, { cle: 'motif', label: 'Motif' }]} />}
      {dialogue === 'echeance' && <DialogueSimple facture={f} onClose={fermer} titre="Prolonger l'échéance" chemin="echeance" methode="patch"
        champs={[{ cle: 'dateLimitePaiement', label: 'Nouvelle date limite', type: 'date', requis: true }]} />}
      {dialogue === 'avoir' && <DialogueSimple facture={f} onClose={fermer} titre="Émettre un avoir" chemin="avoir" methode="post"
        champs={[{ cle: 'montant', label: `Montant de l'avoir (${f.devise})`, type: 'number', requis: true }, { cle: 'motif', label: 'Motif', requis: true }]} />}
      {dialogue === 'annuler' && <DialogueSimple facture={f} onClose={fermer} titre="Annuler la facture" chemin="annuler" methode="patch" danger
        champs={[{ cle: 'motif', label: "Motif de l'annulation" }]} />}
    </>
  );
}

function DialoguePaiement({ facture, reste, onClose }: { facture: Facture; reste: number; onClose: () => void }) {
  const [methode, setMethode] = useState('especes');
  const [montantPaye, setMontant] = useState(String(reste));
  const [referenceTransaction, setRef] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const a = useAction(
    () => api.post(`/admin/paiements/factures/${facture.id}`, {
      methode, montant: Number(montantPaye), referenceTransaction: referenceTransaction || undefined, commentaire: commentaire || undefined,
    }),
    { succes: 'Paiement enregistré', invalider: ['factures', 'paiements', 'colis', 'dashboard'] }
  );
  return (
    <Modal title="Enregistrer un paiement" onClose={onClose} footer={
      <>
        <button className="btn secondary" onClick={onClose}>Annuler</button>
        <button className="btn" disabled={a.isPending}
          onClick={() => (Number(montantPaye) > 0 ? a.mutate(undefined, { onSuccess: onClose }) : toast.error('Montant invalide'))}>Enregistrer</button>
      </>
    }>
      <div className="form-row">
        <Field label="Méthode">
          <select className="select" value={methode} onChange={(e) => setMethode(e.target.value)}>
            {Object.entries(METHODES_PAIEMENT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label={`Montant (${facture.devise})`}>
          <input className="input" type="number" min="0" value={montantPaye} onChange={(e) => setMontant(e.target.value)} />
        </Field>
      </div>
      <Field label="Référence de transaction"><input className="input" value={referenceTransaction} onChange={(e) => setRef(e.target.value)} /></Field>
      <Field label="Commentaire"><textarea className="textarea" value={commentaire} onChange={(e) => setCommentaire(e.target.value)} /></Field>
    </Modal>
  );
}

interface Champ { cle: string; label: string; type?: string; requis?: boolean }

function DialogueSimple({ facture, onClose, titre, chemin, methode, champs, danger }: {
  facture: Facture; onClose: () => void; titre: string; chemin: string; methode: 'patch' | 'post'; champs: Champ[]; danger?: boolean;
}) {
  const [valeurs, setValeurs] = useState<Record<string, string>>({});
  const a = useAction(
    () => {
      const corps = Object.fromEntries(
        champs.filter((c) => valeurs[c.cle]).map((c) => [c.cle, c.type === 'number' ? Number(valeurs[c.cle]) : valeurs[c.cle]])
      );
      return api[methode](`/admin/factures/${facture.id}/${chemin}`, corps);
    },
    { succes: 'Facture mise à jour', invalider: ['factures'] }
  );
  const valider = () => {
    const manquant = champs.find((c) => c.requis && !valeurs[c.cle]);
    if (manquant) return toast.error(`${manquant.label} : champ obligatoire`);
    a.mutate(undefined, { onSuccess: onClose });
  };
  return (
    <Modal title={titre} onClose={onClose} footer={
      <>
        <button className="btn secondary" onClick={onClose}>Fermer</button>
        <button className={`btn${danger ? ' danger' : ''}`} onClick={valider} disabled={a.isPending}>Confirmer</button>
      </>
    }>
      {champs.map((c) => (
        <Field key={c.cle} label={c.label}>
          <input className="input" type={c.type ?? 'text'} value={valeurs[c.cle] ?? ''}
            onChange={(e) => setValeurs({ ...valeurs, [c.cle]: e.target.value })} />
        </Field>
      ))}
    </Modal>
  );
}
