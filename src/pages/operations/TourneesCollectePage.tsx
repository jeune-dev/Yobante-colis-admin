import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import type { Liste, Personne, PointRef } from '@/api/types';
import Icon from '@/components/Icon';
import { FormModal, type ChampDef } from '@/components/FormModal';
import { Badge, Card, Chips, Empty, ErrorBox, KV, Loader, Modal, Pagination, StatutBadge, toast } from '@/components/ui';
import { OPTIONS_PAYS, PAYS, STATUTS_COLIS, STATUTS_ENLEVEMENT, STATUTS_TOURNEE, libelle } from '@/lib/labels';
import { date, dateHeure, nomComplet } from '@/lib/format';
import { useAction, useFiltres, useInvalider } from '@/lib/hooks';
import { useCoursiersOptions, usePointsOptions, useVillesOptions } from '@/lib/options';
import { ouvrirDocument } from '@/lib/format';

interface Tournee {
  id: string;
  reference: string;
  titre: string;
  pays: string;
  dateCollecte: string;
  heureDebut?: string;
  heureFin?: string;
  dateLimiteInscription?: string;
  villeIds: string[];
  codesPostaux: string[];
  capaciteMax?: number;
  nbInscrits: number;
  statut: string;
  messageBanniere?: string;
  afficherBanniere: boolean;
  coursierId?: string;
  pointDepotId?: string;
  notificationEnvoyeeAt?: string;
  commentaire?: string;
  coursier?: Personne | null;
  pointDepot?: PointRef | null;
  estComplete?: boolean;
  accepteInscriptions?: boolean;
  demandes?: { id: string; reference: string; contactNom: string; adresse: string; statut: string; nbColis: number }[];
  colis?: { id: string; reference: string; statut: string; destinataireNom?: string }[];
}

export default function TourneesCollectePage() {
  const invalider = useInvalider();
  const [edition, setEdition] = useState<Tournee | 'nouvelle' | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [statut, setStatut] = useState<Tournee | null>(null);
  const { filtres, page, set, setPage } = useFiltres({ statut: '', pays: '', aVenir: 'true' });

  const q = useQuery({
    queryKey: ['tournees-collecte', filtres, page],
    queryFn: () => api.get<Liste<'tournees', Tournee>>('/admin/tournees-collecte', { ...filtres, page, limit: 20 }),
    placeholderData: keepPreviousData,
  });
  const supprimer = useAction((t: Tournee) => api.delete(`/admin/tournees-collecte/${t.id}`), {
    succes: 'Tournée supprimée',
    invalider: ['tournees-collecte'],
  });

  return (
    <>
      <div className="alert info">
        <Icon name="truck" size={16} />
        <div>Une tournée programme une collecte à domicile (date, villes, codes postaux). À l'ouverture, les clients de la zone sont prévenus et une bannière s'affiche dans l'application.</div>
      </div>
      <div className="toolbar">
        <Chips options={[{ value: 'true', label: 'À venir' }, { value: '', label: 'Toutes' }]} value={filtres.aVenir} onChange={(v) => set('aVenir', v)} />
        <select className="select" value={filtres.statut} onChange={(e) => set('statut', e.target.value)}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUTS_TOURNEE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="select" value={filtres.pays} onChange={(e) => set('pays', e.target.value)}>
          <option value="">Tous pays</option>
          {Object.entries(OPTIONS_PAYS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn" style={{ marginLeft: 'auto' }} onClick={() => setEdition('nouvelle')}>
          <Icon name="plus" size={15} /> Nouvelle tournée
        </button>
      </div>

      <ErrorBox error={q.error} />
      <Card flush>
        {q.isLoading ? <Loader /> : !q.data?.tournees.length ? <Empty>Aucune tournée</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Référence</th><th>Tournée</th><th>Date</th><th>Pays</th><th>Inscrits</th><th>Coursier</th><th>Statut</th><th /></tr></thead>
              <tbody>
                {q.data.tournees.map((t) => (
                  <tr key={t.id}>
                    <td className="mono"><a style={{ cursor: 'pointer' }} onClick={() => setDetail(t.id)}>{t.reference}</a></td>
                    <td><strong>{t.titre}</strong>{t.codesPostaux?.length ? <div className="muted small">CP : {t.codesPostaux.slice(0, 6).join(', ')}{t.codesPostaux.length > 6 ? '…' : ''}</div> : null}</td>
                    <td className="small">{date(t.dateCollecte)}{t.heureDebut && <div className="muted">{t.heureDebut}–{t.heureFin}</div>}</td>
                    <td>{libelle(PAYS, t.pays)}</td>
                    <td>{t.nbInscrits}{t.capaciteMax ? ` / ${t.capaciteMax}` : ''}</td>
                    <td className="small">{t.coursier ? nomComplet(t.coursier) : '—'}</td>
                    <td><StatutBadge table={STATUTS_TOURNEE} valeur={t.statut} /></td>
                    <td>
                      <div className="actions">
                        <button className="btn secondary sm" onClick={() => setStatut(t)}>Statut</button>
                        <button className="btn ghost sm" title="Modifier" onClick={() => setEdition(t)}><Icon name="pencil" size={14} /></button>
                        <button className="btn ghost sm" title="Supprimer" onClick={() => confirm(`Supprimer la tournée ${t.titre} ?`) && supprimer.mutate(t)}>
                          <Icon name="trash-2" size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination info={q.data?.pagination} onPage={setPage} />
      </Card>

      {edition && <DialogueTournee tournee={edition === 'nouvelle' ? null : edition} onClose={() => setEdition(null)} onOk={() => invalider('tournees-collecte')} />}
      {detail && <DialogueDetail id={detail} onClose={() => setDetail(null)} />}
      {statut && (
        <FormModal
          title={`Statut — ${statut.titre}`}
          champs={[
            { name: 'statut', label: 'Nouveau statut', type: 'select', required: true, full: true,
              options: Object.fromEntries(Object.entries(STATUTS_TOURNEE).map(([k, v]) => [k, v.label])) },
            { name: 'notifierClients', label: 'Prévenir les clients concernés (ouverture, annulation…)', type: 'checkbox' },
          ]}
          initial={{ statut: statut.statut, notifierClients: true }}
          succes={false}
          onSubmit={async (corps) => {
            const r = await api.patch<{ clientsPrevenus?: number }>(`/admin/tournees-collecte/${statut.id}/statut`, corps);
            toast.success(`Statut mis à jour${r?.clientsPrevenus ? ` · ${r.clientsPrevenus} client(s) prévenu(s)` : ''}`);
            invalider('tournees-collecte');
          }}
          onClose={() => setStatut(null)}
        />
      )}
    </>
  );
}

function DialogueTournee({ tournee, onClose, onOk }: { tournee: Tournee | null; onClose: () => void; onOk: () => void }) {
  const pays = tournee?.pays ?? 'FR';
  const villes = useVillesOptions(pays);
  const coursiers = useCoursiersOptions(pays);
  const points = usePointsOptions(pays);
  if (villes.isLoading || coursiers.isLoading || points.isLoading) return null;

  const champs: ChampDef[] = [
    { name: 'titre', label: 'Titre', required: true, full: true, placeholder: 'Collecte Île-de-France — octobre' },
    { name: 'pays', label: 'Pays', type: 'select', options: OPTIONS_PAYS, required: true, disabled: !!tournee,
      hint: tournee ? undefined : 'Villes, coursiers et points proposés : ceux de la France. Changez après création si besoin.' },
    { name: 'dateCollecte', label: 'Date de collecte', type: 'date', required: true },
    { name: 'heureDebut', label: 'Heure de début', type: 'time' },
    { name: 'heureFin', label: 'Heure de fin', type: 'time' },
    { name: 'dateLimiteInscription', label: "Date limite d'inscription", type: 'date' },
    { name: 'capaciteMax', label: 'Capacité (inscriptions)', type: 'number', step: '1' },
    { name: 'villeIds', label: 'Villes desservies', type: 'multiselect', options: villes.data ?? [] },
    { name: 'codesPostaux', label: 'Codes postaux desservis', type: 'tags', full: true, hint: 'Séparés par des virgules' },
    { name: 'coursierId', label: 'Coursier', type: 'select', options: coursiers.data ?? [] },
    { name: 'pointDepotId', label: 'Point de dépôt', type: 'select', options: points.data ?? [] },
    { name: 'messageBanniere', label: 'Message de la bannière', type: 'textarea' },
    { name: 'afficherBanniere', label: "Afficher la bannière dans l'application", type: 'checkbox' },
    { name: 'commentaire', label: 'Commentaire interne', type: 'textarea' },
  ];

  return (
    <FormModal
      large
      title={tournee ? `Modifier ${tournee.titre}` : 'Nouvelle tournée de collecte'}
      champs={champs}
      initial={tournee ? (tournee as never) : { pays, afficherBanniere: true }}
      succes={tournee ? 'Tournée mise à jour' : 'Tournée créée : ouvrez-la pour la proposer aux clients'}
      onSubmit={async (corps) => {
        if (tournee) await api.put(`/admin/tournees-collecte/${tournee.id}`, corps);
        else await api.post('/admin/tournees-collecte', corps);
        onOk();
      }}
      onClose={onClose}
    />
  );
}

function DialogueDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const q = useQuery({
    queryKey: ['tournees-collecte', id],
    queryFn: () => api.get<{ tournee: Tournee }>(`/admin/tournees-collecte/${id}`).then((r) => r.tournee),
  });
  const t = q.data;
  const inventaire = async () => {
    try {
      ouvrirDocument(await api.html('/admin/inventaire', { tourneeCollecteId: id, format: 'html' }));
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <Modal large title={t ? `${t.reference} — ${t.titre}` : 'Tournée'} onClose={onClose}
      footer={t && <button className="btn secondary" onClick={inventaire}><Icon name="printer" size={14} /> Inventaire imprimable</button>}>
      <ErrorBox error={q.error} />
      {!t ? <Loader /> : (
        <>
          <div className="kv">
            <KV label="Statut"><StatutBadge table={STATUTS_TOURNEE} valeur={t.statut} /></KV>
            <KV label="Date">{date(t.dateCollecte)}{t.heureDebut && ` · ${t.heureDebut}–${t.heureFin}`}</KV>
            <KV label="Inscriptions">{t.nbInscrits}{t.capaciteMax ? ` / ${t.capaciteMax}` : ''}{t.accepteInscriptions ? ' · ouvertes' : ' · fermées'}</KV>
            <KV label="Limite d'inscription">{date(t.dateLimiteInscription)}</KV>
            <KV label="Coursier">{t.coursier ? nomComplet(t.coursier) : '—'}</KV>
            <KV label="Point de dépôt">{t.pointDepot?.nom ?? '—'}</KV>
            <KV label="Clients prévenus le">{dateHeure(t.notificationEnvoyeeAt)}</KV>
            <KV label="Bannière">{t.afficherBanniere ? t.messageBanniere || 'Affichée' : 'Masquée'}</KV>
          </div>
          <div className="section-label">Demandes d'enlèvement ({t.demandes?.length ?? 0})</div>
          {!t.demandes?.length ? <p className="muted small">Aucune inscription</p> : (
            <table>
              <tbody>
                {t.demandes.map((d) => (
                  <tr key={d.id}>
                    <td className="mono">{d.reference}</td><td>{d.contactNom}</td><td className="small">{d.adresse}</td>
                    <td>{d.nbColis} colis</td><td><StatutBadge table={STATUTS_ENLEVEMENT} valeur={d.statut} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="section-label">Colis rattachés ({t.colis?.length ?? 0})</div>
          {!t.colis?.length ? <p className="muted small">Aucun colis</p> : (
            <div className="chips">
              {t.colis.map((c) => (
                <Link key={c.id} to={`/colis/${c.id}`} className="chip">{c.reference} <Badge ton={STATUTS_COLIS[c.statut]?.ton}>{STATUTS_COLIS[c.statut]?.label}</Badge></Link>
              ))}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
