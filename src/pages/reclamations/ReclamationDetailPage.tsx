import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '@/api/client';
import { toutesLesPages } from '@/lib/options';
import type { Personne, Reclamation } from '@/api/types';
import { useAuth } from '@/auth/store';
import Icon from '@/components/Icon';
import { Card, ErrorBox, Field, KV, Loader, Modal, StatutBadge, toast } from '@/components/ui';
import { PRIORITES, STATUTS_RECLAMATION, TRANSITIONS_RECLAMATION, TYPES_RECLAMATION, libelle } from '@/lib/labels';
import { dateHeure, montant, nomComplet, urlSure } from '@/lib/format';
import { useAction } from '@/lib/hooks';
import { R, D } from '@/lib/routes';

export default function ReclamationDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const moi = useAuth((s) => s.utilisateur);
  const [message, setMessage] = useState('');
  const [interne, setInterne] = useState(false);
  const [pieces, setPieces] = useState<File[]>([]);
  const [cleFichier, setCleFichier] = useState(0);
  const [traitement, setTraitement] = useState(false);

  const q = useQuery({
    queryKey: ['reclamations', id],
    queryFn: () => api.get<{ reclamation: Reclamation }>(`/admin/reclamations/${id}`).then((r) => r.reclamation),
  });

  // Réponse en multipart : le message peut porter jusqu'à 5 pièces jointes
  const repondre = useAction(() => api.upload(`/admin/reclamations/${id}/messages`, { message, interne, pieces }), {
    succes: interne ? 'Note interne ajoutée' : 'Réponse envoyée au client',
    invalider: ['reclamations'],
  });
  const priorite = useAction((p: string) => api.patch(`/admin/reclamations/${id}/priorite`, { priorite: p }), {
    succes: 'Priorité mise à jour',
    invalider: ['reclamations'],
  });
  const agents = useQuery({
    queryKey: ['admins', 'options'],
    queryFn: () => toutesLesPages<Personne>('/admin/admins', 'administrateurs'),
    staleTime: 5 * 60_000,
  });
  // agentId null : retire l'assignation (la réclamation retourne dans la file commune)
  const assigner = useAction((agentId: string | null) => api.patch(`/admin/reclamations/${id}/assigner`, { agentId }), {
    succes: 'Assignation mise à jour',
    invalider: ['reclamations'],
  });

  // isPending (pas isLoading) : un nouvel essai mis en pause (onglet masqué, hors ligne)
  // laisse la requête sans donnée ni erreur, et `q.data` serait indéfini
  if (q.isPending) return <Loader />;
  if (q.error) return <ErrorBox error={q.error} onRetry={() => q.refetch()} />;
  const r = q.data!;
  const transitions = TRANSITIONS_RECLAMATION[r.statut] ?? [];

  const envoyer = () =>
    message.trim() ? repondre.mutate(undefined, { onSuccess: () => { setMessage(''); setPieces([]); setCleFichier((k) => k + 1); } }) : toast.error('Le message est vide');

  return (
    <>
      <button type="button" className="back" onClick={() => navigate(R.reclamations)}>
        <Icon name="arrow-left" size={15} /> Réclamations
      </button>
      <div className="hero">
        <span className="hero-ref">{r.reference}</span>
        <StatutBadge table={STATUTS_RECLAMATION} valeur={r.statut} />
        <StatutBadge table={PRIORITES} valeur={r.priorite} />
        <div className="actions">
          {r.agentAssigne?.id !== moi?.id && (
            <button className="btn secondary" onClick={() => moi && assigner.mutate(moi.id)}>
              <Icon name="user" size={15} /> M'assigner
            </button>
          )}
          {transitions.length > 0 && (
            <button className="btn" onClick={() => setTraitement(true)}>
              <Icon name="check-circle" size={15} /> Traiter
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-main-side">
        <div>
          <Card title={r.objet}>
            <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.88rem' }}>{r.description}</div>
            {r.resolution && <div className="alert info" style={{ marginTop: 12 }}>Résolution : {r.resolution}</div>}
            {r.motifRejet && <div className="alert error" style={{ marginTop: 12 }}>Rejet : {r.motifRejet}</div>}
          </Card>

          <Card title="Échanges">
            <div className="messages">
              {!r.messages?.length && <div className="muted small">Aucun message</div>}
              {r.messages?.map((m) => {
                const support = m.auteur?.role && m.auteur.role !== 'client';
                return (
                  <div key={m.id} className={`msg${support ? ' support' : ''}${m.interne ? ' interne' : ''}`}>
                    <div className="msg-meta">
                      {nomComplet(m.auteur)} · {dateHeure(m.createdAt)}
                      {m.interne && ' · note interne'}
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{m.message}</div>
                    {!!m.piecesJointes?.length && (
                      <div className="small" style={{ marginTop: 4 }}>
                        {m.piecesJointes.map((pj, i) => {
                          const url = urlSure(typeof pj === 'string' ? pj : (pj as { url?: string }).url);
                          return url ? <a key={i} href={url} target="_blank" rel="noreferrer" style={{ marginRight: 8 }}>Pièce {i + 1}</a> : null;
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {r.statut !== 'cloturee' && (
              <div style={{ marginTop: 14 }}>
                <textarea className="textarea" placeholder="Votre réponse…" value={message} onChange={(e) => setMessage(e.target.value)} />
                <input key={cleFichier} className="input" type="file" multiple accept="image/jpeg,image/png,application/pdf" style={{ marginTop: 8 }}
                  onChange={(e) => setPieces(Array.from(e.target.files ?? []).slice(0, 5))} />
                <div className="actions" style={{ marginTop: 8, alignItems: 'center' }}>
                  <label className="check" style={{ margin: 0 }}>
                    <input type="checkbox" checked={interne} onChange={(e) => setInterne(e.target.checked)} />
                    Note interne (non visible du client)
                  </label>
                  <button className="btn" style={{ marginLeft: 'auto' }} onClick={envoyer} disabled={repondre.isPending}>
                    <Icon name="send" size={14} /> Envoyer
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>

        <Card title="Dossier">
          <div className="kv one">
            <KV label="Type">{libelle(TYPES_RECLAMATION, r.type)}</KV>
            <KV label="Client">{r.client ? <Link to={`${D.client}/${r.client.id}`}>{nomComplet(r.client)}</Link> : '—'}</KV>
            <KV label="Contact">{r.client?.email}{r.client?.telephone && <div className="muted small">{r.client.telephone}</div>}</KV>
            <KV label="Colis">{r.colis ? <Link to={`${D.colis}/${r.colis.id}`}>{r.colis.reference}</Link> : '—'}</KV>
            <KV label="Montant réclamé">{montant(r.montantReclame, r.devise)}</KV>
            <KV label="Montant accordé">{montant(r.montantAccorde, r.devise)}</KV>
            <KV label="Agent">
              <select className="select" aria-label="Agent assigné" value={r.agentAssigne?.id ?? ''} onChange={(e) => assigner.mutate(e.target.value || null)} disabled={assigner.isPending}>
                <option value="">— Non assignée —</option>
                {agents.data?.map((a) => <option key={a.id} value={a.id}>{nomComplet(a)}</option>)}
              </select>
            </KV>
            <KV label="Ouverte le">{dateHeure(r.createdAt)}</KV>
            <KV label="Échéance">{dateHeure(r.dateEcheance)}</KV>
            <KV label="Priorité">
              <select className="select" value={r.priorite} onChange={(e) => priorite.mutate(e.target.value)}>
                {Object.entries(PRIORITES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </KV>
          </div>
        </Card>
      </div>

      {traitement && <DialogueTraitement reclamation={r} transitions={transitions} onClose={() => setTraitement(false)} />}
    </>
  );
}

function DialogueTraitement({ reclamation, transitions, onClose }: { reclamation: Reclamation; transitions: string[]; onClose: () => void }) {
  const [statut, setStatut] = useState(transitions[0]);
  const [resolution, setResolution] = useState('');
  const [motifRejet, setMotifRejet] = useState('');
  const [montantAccorde, setMontant] = useState('');

  const a = useAction(
    () =>
      api.patch(`/admin/reclamations/${reclamation.id}/resoudre`, {
        statut,
        resolution: statut === 'resolue' ? resolution : undefined,
        motifRejet: statut === 'rejetee' ? motifRejet : undefined,
        montantAccorde: statut === 'resolue' && montantAccorde ? Number(montantAccorde) : undefined,
      }),
    // Une indemnité accordée génère un avoir : la facturation change aussi
    { succes: 'Réclamation mise à jour', invalider: ['reclamations', 'dashboard', 'factures'] }
  );

  const valider = () => {
    if (statut === 'resolue' && !resolution.trim()) return toast.error('Décrivez la résolution');
    if (statut === 'rejetee' && !motifRejet.trim()) return toast.error('Le motif de rejet est obligatoire');
    a.mutate(undefined, { onSuccess: onClose });
  };

  return (
    <Modal title="Traiter la réclamation" onClose={onClose} footer={
      <>
        <button className="btn secondary" onClick={onClose}>Annuler</button>
        <button className="btn" onClick={valider} disabled={a.isPending}>Appliquer</button>
      </>
    }>
      <Field label="Nouveau statut">
        <select className="select" value={statut} onChange={(e) => setStatut(e.target.value)}>
          {transitions.map((s) => <option key={s} value={s}>{STATUTS_RECLAMATION[s]?.label ?? s}</option>)}
        </select>
      </Field>
      {statut === 'resolue' && (
        <>
          <Field label="Résolution"><textarea className="textarea" value={resolution} onChange={(e) => setResolution(e.target.value)} /></Field>
          <Field label={`Indemnisation accordée (${reclamation.devise})`} hint="Un avoir est émis si un montant est accordé.">
            <input className="input" type="number" min="0" value={montantAccorde} onChange={(e) => setMontant(e.target.value)} />
          </Field>
        </>
      )}
      {statut === 'rejetee' && (
        <Field label="Motif du rejet"><textarea className="textarea" value={motifRejet} onChange={(e) => setMotifRejet(e.target.value)} /></Field>
      )}
    </Modal>
  );
}
