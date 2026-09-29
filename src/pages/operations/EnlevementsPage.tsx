import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import type { Liste, Num, Personne, PointRef, VilleRef } from '@/api/types';
import Icon from '@/components/Icon';
import { FormModal } from '@/components/FormModal';
import { Badge, Card, Chips, Empty, ErrorBox, KV, Loader, Modal, Pagination, StatutBadge } from '@/components/ui';
import { CRENEAUX, OPTIONS_PAYS, PAYS, STATUTS_ENLEVEMENT, libelle } from '@/lib/labels';
import { aujourdhui, date, dateHeure, montant, nomComplet } from '@/lib/format';
import { useAction, useFiltres, useInvalider } from '@/lib/hooks';
import { useCoursiersOptions, usePointsOptions } from '@/lib/options';
import { D } from '@/lib/routes';

export interface Enlevement {
  id: string;
  reference: string;
  contactNom: string;
  contactTelephone: string;
  pays: string;
  adresse: string;
  complementAdresse?: string;
  codePostal?: string;
  dateSouhaitee: string;
  creneau: string;
  heureSouhaitee?: string;
  etage?: number;
  ascenseur?: boolean;
  emballageRequis: boolean;
  nbColis: number;
  poidsEstimeKg?: Num;
  instructions?: string;
  statut: string;
  datePlanifiee?: string;
  dateEffective?: string;
  motifEchec?: string;
  fraisEnlevement: Num;
  commentaireCoursier?: string;
  createdAt: string;
  client?: Personne;
  coursier?: Personne | null;
  ville?: VilleRef;
  pointDepot?: PointRef | null;
  colis?: { id: string; reference: string; statut?: string } | null;
}

type Dialogue = { type: 'detail' | 'planifier' | 'cloturer' | 'annuler'; demande: Enlevement } | null;

export default function EnlevementsPage() {
  const [vue, setVue] = useState<'liste' | 'tournee'>('liste');
  const [dialogue, setDialogue] = useState<Dialogue>(null);
  const { filtres, page, set, modifier, setPage } = useFiltres({ statut: '', pays: '', aTraiter: '', sansCoursier: '', dateDebut: '', dateFin: '' });

  const q = useQuery({
    queryKey: ['enlevements', filtres, page],
    queryFn: () => api.get<Liste<'demandes', Enlevement>>('/admin/enlevements', { ...filtres, page, limit: 20 }),
    placeholderData: keepPreviousData,
    enabled: vue === 'liste',
  });
  const demarrer = useAction((d: Enlevement) => api.patch(`/admin/enlevements/${d.id}/demarrer`, {}), {
    succes: 'Tournée démarrée',
    invalider: ['enlevements'],
  });

  const actions = (d: Enlevement) => (
    <div className="actions">
      <button className="btn ghost sm" onClick={() => setDialogue({ type: 'detail', demande: d })}><Icon name="eye" size={14} /></button>
      {['demande', 'planifie', 'echoue'].includes(d.statut) && (
        <button className="btn secondary sm" onClick={() => setDialogue({ type: 'planifier', demande: d })}>Planifier</button>
      )}
      {d.statut === 'planifie' && <button className="btn secondary sm" onClick={() => demarrer.mutate(d)}>Démarrer</button>}
      {['planifie', 'en_cours'].includes(d.statut) && (
        <button className="btn sm" onClick={() => setDialogue({ type: 'cloturer', demande: d })}>Clôturer</button>
      )}
      {!['effectue', 'annule'].includes(d.statut) && (
        <button className="btn ghost sm" title="Annuler" onClick={() => setDialogue({ type: 'annuler', demande: d })}><Icon name="x" size={14} /></button>
      )}
    </div>
  );

  return (
    <>
      <div className="toolbar">
        <Chips options={[{ value: 'liste', label: 'Toutes les demandes' }, { value: 'tournee', label: 'Feuille de route du jour' }]} value={vue} onChange={setVue} />
      </div>

      {vue === 'tournee' ? <FeuilleDeRoute actions={actions} /> : (
        <>
          <div className="toolbar">
            <Chips
              options={[{ value: '', label: 'Toutes' }, { value: 'aTraiter', label: 'À traiter' }, { value: 'sansCoursier', label: 'Sans coursier' }]}
              value={filtres.aTraiter ? 'aTraiter' : filtres.sansCoursier ? 'sansCoursier' : ''}
              onChange={(v) => modifier({ aTraiter: v === 'aTraiter' ? 'true' : '', sansCoursier: v === 'sansCoursier' ? 'true' : '' })}
            />
            <select className="select" value={filtres.statut} onChange={(e) => set('statut', e.target.value)}>
              <option value="">Tous les statuts</option>
              {Object.entries(STATUTS_ENLEVEMENT).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select className="select" value={filtres.pays} onChange={(e) => set('pays', e.target.value)}>
              <option value="">Tous pays</option>
              {Object.entries(OPTIONS_PAYS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input className="input" type="date" title="À partir du" value={filtres.dateDebut} onChange={(e) => set('dateDebut', e.target.value)} />
            <input className="input" type="date" title="Jusqu'au" value={filtres.dateFin} onChange={(e) => set('dateFin', e.target.value)} />
          </div>

          <ErrorBox error={q.error} />
          <Card flush>
            {q.isLoading ? <Loader /> : q.error ? null : !q.data?.demandes.length ? <Empty>Aucune demande d'enlèvement</Empty> : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Référence</th><th>Contact</th><th>Adresse</th><th>Souhaité</th><th>Colis</th><th>Coursier</th><th>Statut</th><th /></tr></thead>
                  <tbody>
                    {q.data.demandes.map((d) => (
                      <tr key={d.id}>
                        <td className="mono">{d.reference}</td>
                        <td>{d.contactNom}<div className="muted small">{d.contactTelephone}</div></td>
                        <td className="small">{d.adresse}<div className="muted">{d.ville?.nom} ({libelle(PAYS, d.pays)})</div></td>
                        <td className="small">{date(d.dateSouhaitee)}<div className="muted">{libelle(CRENEAUX, d.creneau)}</div></td>
                        <td>{d.nbColis}{d.emballageRequis && <> <Badge ton="orange">Emballage</Badge></>}</td>
                        <td className="small">{d.coursier ? nomComplet(d.coursier) : <span className="muted">—</span>}</td>
                        <td><StatutBadge table={STATUTS_ENLEVEMENT} valeur={d.statut} /></td>
                        <td>{actions(d)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination info={q.data?.pagination} onPage={setPage} />
          </Card>
        </>
      )}

      {dialogue?.type === 'detail' && <DialogueDetail id={dialogue.demande.id} onClose={() => setDialogue(null)} />}
      {dialogue?.type === 'planifier' && <DialoguePlanifier demande={dialogue.demande} onClose={() => setDialogue(null)} />}
      {dialogue?.type === 'cloturer' && <DialogueCloturer demande={dialogue.demande} onClose={() => setDialogue(null)} />}
      {dialogue?.type === 'annuler' && <DialogueAnnuler demande={dialogue.demande} onClose={() => setDialogue(null)} />}
    </>
  );
}

function FeuilleDeRoute({ actions }: { actions: (d: Enlevement) => React.ReactNode }) {
  const [coursierId, setCoursierId] = useState('');
  const [pays, setPays] = useState('SN');
  const [jour, setJour] = useState(aujourdhui);
  const coursiers = useCoursiersOptions(pays);

  const q = useQuery({
    queryKey: ['enlevements', 'tournee', coursierId, jour],
    queryFn: () =>
      api.get<{ date: string; demandes: Enlevement[]; totalColis: number }>(
        coursierId ? `/admin/enlevements/tournee/${coursierId}` : '/admin/enlevements/tournee/aujourdhui',
        { date: jour }
      ),
  });

  return (
    <>
      <div className="toolbar">
        <select className="select" value={pays} onChange={(e) => { setPays(e.target.value); setCoursierId(''); }}>
          {Object.entries(OPTIONS_PAYS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="select" value={coursierId} onChange={(e) => setCoursierId(e.target.value)}>
          <option value="">Tous les coursiers</option>
          {coursiers.data?.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <input className="input" type="date" value={jour} onChange={(e) => setJour(e.target.value)} />
        {q.data && <span className="small muted">{q.data.demandes.length} passage(s) · {q.data.totalColis} colis</span>}
      </div>
      <ErrorBox error={q.error} />
      <Card flush>
        {q.isLoading ? <Loader /> : q.error ? null : !q.data?.demandes.length ? <Empty>Aucun enlèvement prévu ce jour-là</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Créneau</th><th>Contact</th><th>Adresse</th><th>Colis</th><th>Coursier</th><th>Statut</th><th /></tr></thead>
              <tbody>
                {q.data.demandes.map((d) => (
                  <tr key={d.id}>
                    <td className="small">{libelle(CRENEAUX, d.creneau)}{d.heureSouhaitee && <div className="muted">vers {d.heureSouhaitee}</div>}</td>
                    <td>{d.contactNom}<div className="muted small">{d.contactTelephone}</div></td>
                    <td className="small">
                      {d.adresse}{d.complementAdresse && `, ${d.complementAdresse}`}
                      <div className="muted">{d.ville?.nom}{d.etage != null && ` · étage ${d.etage}${d.ascenseur ? ' (ascenseur)' : ''}`}</div>
                    </td>
                    <td>{d.nbColis}</td>
                    <td className="small">{d.coursier ? nomComplet(d.coursier) : '—'}</td>
                    <td><StatutBadge table={STATUTS_ENLEVEMENT} valeur={d.statut} /></td>
                    <td>{actions(d)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function DialogueDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const q = useQuery({
    queryKey: ['enlevements', id],
    queryFn: () => api.get<{ demande: Enlevement }>(`/admin/enlevements/${id}`).then((r) => r.demande),
  });
  const d = q.data;
  return (
    <Modal large title={d ? `Enlèvement ${d.reference}` : 'Enlèvement'} onClose={onClose}>
      <ErrorBox error={q.error} />
      {!d ? <Loader /> : (
        <div className="kv">
          <KV label="Statut"><StatutBadge table={STATUTS_ENLEVEMENT} valeur={d.statut} /></KV>
          <KV label="Client">{d.client ? <Link to={`${D.client}/${d.client.id}`}>{nomComplet(d.client)}</Link> : '—'}</KV>
          <KV label="Contact sur place">{d.contactNom} · {d.contactTelephone}</KV>
          <KV label="Adresse">{d.adresse}{d.complementAdresse && `, ${d.complementAdresse}`} — {d.codePostal} {d.ville?.nom}</KV>
          <KV label="Souhaité">{date(d.dateSouhaitee)} · {libelle(CRENEAUX, d.creneau)}{d.heureSouhaitee && ` (vers ${d.heureSouhaitee})`}</KV>
          <KV label="Planifié">{dateHeure(d.datePlanifiee)}</KV>
          <KV label="Accès">{d.etage != null ? `Étage ${d.etage}${d.ascenseur ? ', ascenseur' : ', sans ascenseur'}` : '—'}</KV>
          <KV label="Colis">{d.nbColis}{d.poidsEstimeKg ? ` · ~${Number(d.poidsEstimeKg)} kg` : ''}{d.emballageRequis ? ' · emballage à fournir' : ''}</KV>
          <KV label="Coursier">{d.coursier ? `${nomComplet(d.coursier)} · ${d.coursier.telephone ?? ''}` : '—'}</KV>
          <KV label="Point de dépôt">{d.pointDepot?.nom ?? '—'}</KV>
          <KV label="Frais d'enlèvement">{montant(d.fraisEnlevement, d.pays === 'FR' ? 'EUR' : 'XOF')}</KV>
          <KV label="Expédition liée">{d.colis ? <Link to={`${D.colis}/${d.colis.id}`}>{d.colis.reference}</Link> : '—'}</KV>
          {d.instructions && <KV label="Instructions">{d.instructions}</KV>}
          {d.motifEchec && <KV label="Motif d'échec">{d.motifEchec}</KV>}
          {d.commentaireCoursier && <KV label="Commentaire coursier">{d.commentaireCoursier}</KV>}
          <KV label="Effectué le">{dateHeure(d.dateEffective)}</KV>
        </div>
      )}
    </Modal>
  );
}

function DialoguePlanifier({ demande, onClose }: { demande: Enlevement; onClose: () => void }) {
  const invalider = useInvalider();
  const coursiers = useCoursiersOptions(demande.pays);
  const points = usePointsOptions(demande.pays, { isActive: true });
  if (coursiers.isLoading || points.isLoading) return null;
  return (
    <FormModal
      title={`Planifier ${demande.reference}`}
      intro={<p className="small">Souhaité le {date(demande.dateSouhaitee)} · {libelle(CRENEAUX, demande.creneau)}</p>}
      champs={[
        { name: 'coursierId', label: 'Coursier', type: 'select', options: coursiers.data ?? [], required: true, full: true,
          hint: !coursiers.data?.length ? 'Aucun coursier disponible dans ce pays' : undefined },
        { name: 'datePlanifiee', label: 'Date de passage', type: 'date' },
        { name: 'creneau', label: 'Créneau', type: 'select', options: CRENEAUX },
        { name: 'pointDepotId', label: 'Point de dépôt des colis', type: 'select', options: points.data ?? [], full: true },
      ]}
      initial={{
        coursierId: demande.coursier?.id,
        datePlanifiee: demande.datePlanifiee ?? demande.dateSouhaitee,
        creneau: demande.creneau,
        pointDepotId: demande.pointDepot?.id,
      }}
      succes="Enlèvement planifié, le client est prévenu"
      onSubmit={async (corps) => { await api.patch(`/admin/enlevements/${demande.id}/planifier`, corps); invalider('enlevements'); }}
      onClose={onClose}
    />
  );
}

function DialogueCloturer({ demande, onClose }: { demande: Enlevement; onClose: () => void }) {
  const invalider = useInvalider();
  const points = usePointsOptions(demande.pays, { isActive: true });
  if (points.isLoading) return null;
  return (
    <FormModal
      title={`Clôturer ${demande.reference}`}
      champs={[
        { name: 'statut', label: 'Issue', type: 'select', options: { effectue: 'Effectué', echoue: 'Échoué' }, required: true },
        { name: 'pointDepotId', label: 'Point de dépôt', type: 'select', options: points.data ?? [], visible: (v) => v.statut === 'effectue' },
        { name: 'motifEchec', label: "Motif de l'échec", required: true, full: true, visible: (v) => v.statut === 'echoue' },
        { name: 'commentaire', label: 'Commentaire', type: 'textarea' },
      ]}
      initial={{ statut: 'effectue', pointDepotId: demande.pointDepot?.id }}
      succes="Enlèvement clôturé"
      onSubmit={async (corps) => { await api.patch(`/admin/enlevements/${demande.id}/cloturer`, corps); invalider('enlevements', 'colis'); }}
      onClose={onClose}
    />
  );
}

function DialogueAnnuler({ demande, onClose }: { demande: Enlevement; onClose: () => void }) {
  const invalider = useInvalider();
  return (
    <FormModal
      danger
      title={`Annuler ${demande.reference}`}
      champs={[{ name: 'motif', label: 'Motif', type: 'textarea' }]}
      submitLabel="Annuler la demande"
      succes="Demande annulée"
      onSubmit={async (corps) => { await api.patch(`/admin/enlevements/${demande.id}/annuler`, corps); invalider('enlevements'); }}
      onClose={onClose}
    />
  );
}
