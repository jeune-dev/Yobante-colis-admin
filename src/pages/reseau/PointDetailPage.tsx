import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/api/client';
import type { Num, PaginationInfo } from '@/api/types';
import Icon from '@/components/Icon';
import { FormModal } from '@/components/FormModal';
import { Badge, Card, Empty, ErrorBox, KV, Loader, Modal, Pagination, Stat, StatutBadge, toast } from '@/components/ui';
import { JOURS, PAYS, SERVICES_POINT, STATUTS_COLIS, TYPES_POINT, libelle } from '@/lib/labels';
import { date, nomComplet, poids } from '@/lib/format';
import { useAction, useInvalider } from '@/lib/hooks';
import { usePointsOptions } from '@/lib/options';
import { DialoguePoint, type Point } from './PointsCollectePage';

type Creneau = { debut: string; fin: string };
type Horaires = Record<string, Creneau[]>;

interface PointDetail extends Point {
  complementAdresse?: string;
  quartier?: string;
  codePostal?: string;
  horaires?: Horaires;
  poidsMaxColisKg?: Num;
  delaiGardeJours?: number;
  instructionsAcces?: string;
  photoUrl?: string;
  typeLibelle?: string;
  responsable?: { id: string; nom: string; prenom: string; telephone?: string };
  hubRattachement?: { id: string; code: string; nom: string };
}

interface Stock {
  colis: { id: string; reference: string; statut: string; destinataireNom: string; destinataireTelephone?: string; nbPieces: number; poidsFactureKg: Num; dateLimiteRetrait?: string; createdAt: string; enSouffrance: boolean }[];
  pagination: PaginationInfo;
}

interface Statistiques {
  colisDeposes: number;
  colisAffectesAuRetrait: number;
  colisEnStock: number;
  colisRetires: number;
  tauxOccupation: number | null;
}

type Dialogue = null | 'modifier' | 'horaires' | 'transfert' | 'photo' | 'maintenance';

export default function PointDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const invalider = useInvalider();
  const [dialogue, setDialogue] = useState<Dialogue>(null);
  const [page, setPage] = useState(1);

  const q = useQuery({
    queryKey: ['points-collecte', id],
    queryFn: () => api.get<{ point: PointDetail }>(`/admin/points-collecte/${id}`).then((r) => r.point),
  });
  const stock = useQuery({
    queryKey: ['points-collecte', id, 'stock', page],
    queryFn: () => api.get<Stock>(`/admin/points-collecte/${id}/stock`, { page, limit: 20 }),
    placeholderData: keepPreviousData,
  });
  const stats = useQuery({
    queryKey: ['points-collecte', id, 'statistiques'],
    queryFn: () => api.get<{ statistiques: Statistiques }>(`/admin/points-collecte/${id}/statistiques`).then((r) => r.statistiques),
  });

  const statut = useAction((isActive: boolean) => api.patch(`/admin/points-collecte/${id}/statut`, { isActive }), {
    succes: 'Point mis à jour',
    invalider: ['points-collecte'],
  });
  const supprimer = useAction(() => api.delete(`/admin/points-collecte/${id}`), { succes: 'Point supprimé', invalider: ['points-collecte'] });

  if (q.isLoading) return <Loader />;
  if (q.error) return <ErrorBox error={q.error} />;
  const p = q.data!;
  const fermer = () => setDialogue(null);

  return (
    <>
      <span className="back" onClick={() => navigate('/points-collecte')}><Icon name="arrow-left" size={15} /> Points de collecte</span>
      <div className="hero">
        <span className="hero-ref">{p.code}</span>
        <strong>{p.nom}</strong>
        {!p.isActive ? <Badge>Inactif</Badge> : p.enMaintenance ? <Badge ton="orange">Maintenance</Badge> : <Badge ton="vert">Actif</Badge>}
        {p.ouvertMaintenant && <Badge ton="cyan">Ouvert maintenant</Badge>}
        {p.sature && <Badge ton="rouge">Saturé</Badge>}
        <div className="actions">
          <button className="btn secondary" onClick={() => setDialogue('modifier')}><Icon name="pencil" size={15} /> Modifier</button>
          <button className="btn secondary" onClick={() => setDialogue('horaires')}><Icon name="clock" size={15} /> Horaires</button>
          <button className="btn secondary" onClick={() => setDialogue('maintenance')}>
            {p.enMaintenance ? 'Fin de maintenance' : 'Maintenance'}
          </button>
          <button className="btn secondary" onClick={() => setDialogue('transfert')}><Icon name="truck" size={15} /> Transférer le stock</button>
          <button className="btn secondary" onClick={() => setDialogue('photo')}><Icon name="image" size={15} /> Photo</button>
          <button className={`btn ${p.isActive ? 'secondary' : 'success'}`} onClick={() => statut.mutate(!p.isActive)}>
            {p.isActive ? 'Désactiver' : 'Activer'}
          </button>
          <button className="btn danger"
            onClick={() => confirm('Supprimer définitivement ce point ? Refusé si des colis y sont rattachés.') &&
              supprimer.mutate(undefined, { onSuccess: () => navigate('/points-collecte') })}>
            <Icon name="trash-2" size={15} />
          </button>
        </div>
      </div>

      {p.enMaintenance && p.motifMaintenance && <div className="alert warn"><Icon name="alert-triangle" size={16} /><div>Maintenance : {p.motifMaintenance}</div></div>}

      <div className="stats">
        <Stat icon="inbox" value={stats.data?.colisEnStock ?? '—'} label="Colis en stock" hint={stats.data?.tauxOccupation != null ? `${stats.data.tauxOccupation} % d'occupation` : undefined} />
        <Stat icon="arrow-down" ton="bleu" value={stats.data?.colisDeposes ?? '—'} label="Colis déposés" />
        <Stat icon="map-pin" ton="violet" value={stats.data?.colisAffectesAuRetrait ?? '—'} label="Affectés au retrait" />
        <Stat icon="check-circle" ton="vert" value={stats.data?.colisRetires ?? '—'} label="Colis retirés" />
      </div>

      <div className="grid grid-main-side">
        <Card title={`Stock (${stock.data?.pagination.totalItems ?? 0})`} flush>
          {stock.isLoading ? <Loader /> : !stock.data?.colis.length ? <Empty>Aucun colis présent</Empty> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Référence</th><th>Destinataire</th><th>Pièces</th><th>Poids</th><th>Statut</th><th>Retrait avant</th></tr></thead>
                <tbody>
                  {stock.data.colis.map((c) => (
                    <tr key={c.id} className="cliquable" onClick={() => navigate(`/colis/${c.id}`)}>
                      <td className="mono">{c.reference}</td>
                      <td>{c.destinataireNom}<div className="muted small">{c.destinataireTelephone}</div></td>
                      <td>{c.nbPieces}</td>
                      <td className="small">{poids(c.poidsFactureKg)}</td>
                      <td><StatutBadge table={STATUTS_COLIS} valeur={c.statut} /></td>
                      <td className="small">{date(c.dateLimiteRetrait)}{c.enSouffrance && <> <Badge ton="rouge">Souffrance</Badge></>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination info={stock.data?.pagination} onPage={setPage} />
        </Card>

        <div>
          {p.photoUrl && <img src={p.photoUrl} alt={p.nom} style={{ width: '100%', borderRadius: 11, marginBottom: '1.2rem', border: '1px solid var(--border)' }} />}
          <Card title="Informations">
            <div className="kv one">
              <KV label="Type">{p.typeLibelle ?? libelle(TYPES_POINT, p.type)}</KV>
              <KV label="Adresse">
                {p.adresse}{p.complementAdresse && `, ${p.complementAdresse}`}
                <div className="muted small">{[p.quartier, p.codePostal, p.ville?.nom, libelle(PAYS, p.pays)].filter(Boolean).join(' · ')}</div>
              </KV>
              <KV label="Contact">{p.telephone || '—'}{p.email && <div className="muted small">{p.email}</div>}</KV>
              <KV label="Prestations">{p.services?.map((s) => libelle(SERVICES_POINT, s)).join(', ') || '—'}</KV>
              <KV label="Capacité">{p.capaciteMaxColis ? `${p.capaciteMaxColis} colis` : 'Illimitée'}{p.poidsMaxColisKg ? ` · ${poids(p.poidsMaxColisKg)} max par colis` : ''}</KV>
              <KV label="Délai de garde">{p.delaiGardeJours ? `${p.delaiGardeJours} jours` : '—'}</KV>
              <KV label="Responsable">{p.responsable ? nomComplet(p.responsable) : '—'}</KV>
              <KV label="Hub de rattachement">{p.hubRattachement ? `${p.hubRattachement.code} — ${p.hubRattachement.nom}` : '—'}</KV>
              {p.instructionsAcces && <KV label="Accès">{p.instructionsAcces}</KV>}
            </div>
          </Card>
          <Card title="Horaires">
            <table>
              <tbody>
                {JOURS.map((j) => (
                  <tr key={j}>
                    <td style={{ textTransform: 'capitalize', padding: '0.35rem 0' }}>{j}</td>
                    <td className="small" style={{ padding: '0.35rem 0' }}>
                      {p.horaires?.[j]?.length ? p.horaires[j].map((c) => `${c.debut}–${c.fin}`).join(', ') : <span className="muted">Fermé</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>

      {dialogue === 'modifier' && <DialoguePoint point={p} onClose={fermer} onOk={() => invalider('points-collecte')} />}
      {dialogue === 'horaires' && <DialogueHoraires point={p} onClose={fermer} />}
      {dialogue === 'maintenance' && (
        <FormModal
          title={p.enMaintenance ? 'Fin de maintenance' : 'Mettre en maintenance'}
          intro={<p className="small">{p.enMaintenance ? 'Le point accepte de nouveau les flux.' : "Le point reste au réseau mais n'accepte plus de flux."}</p>}
          champs={p.enMaintenance ? [] : [{ name: 'motif', label: 'Motif', full: true }]}
          submitLabel="Confirmer"
          succes="Maintenance mise à jour"
          onSubmit={async (corps) => {
            await api.patch(`/admin/points-collecte/${id}/maintenance`, { enMaintenance: !p.enMaintenance, ...corps });
            invalider('points-collecte');
          }}
          onClose={fermer}
        />
      )}
      {dialogue === 'transfert' && <DialogueTransfert point={p} onClose={fermer} />}
      {dialogue === 'photo' && (
        <FormModal
          title="Photo du point"
          champs={[{ name: 'photo', label: 'Photo (JPEG ou PNG, 5 Mo max.)', type: 'file', accept: 'image/jpeg,image/png', required: true }]}
          submitLabel="Téléverser"
          succes="Photo mise à jour"
          onSubmit={async (corps) => { await api.upload(`/admin/points-collecte/${id}/photo`, corps); invalider('points-collecte'); }}
          onClose={fermer}
        />
      )}
    </>
  );
}

function DialogueTransfert({ point, onClose }: { point: PointDetail; onClose: () => void }) {
  const invalider = useInvalider();
  const points = usePointsOptions(point.pays, { isActive: true });
  if (points.isLoading) return null;
  return (
    <FormModal
      title="Transférer tout le stock"
      intro={<p className="small">Tous les colis présents à « {point.nom} » sont déplacés vers le point choisi (avant une fermeture ou une réorganisation).</p>}
      champs={[{
        name: 'destinationId', label: 'Point de destination', type: 'select', required: true, full: true,
        options: (points.data ?? []).filter((o) => o.value !== point.id),
      }]}
      submitLabel="Transférer"
      succes={false}
      onSubmit={async (corps) => {
        const r = await api.post<{ nbColis: number }>(`/admin/points-collecte/${point.id}/transfert-stock`, corps);
        toast.success(`${r.nbColis} colis transféré(s)`);
        invalider('points-collecte', 'colis');
      }}
      onClose={onClose}
    />
  );
}

function DialogueHoraires({ point, onClose }: { point: PointDetail; onClose: () => void }) {
  const invalider = useInvalider();
  const [h, setH] = useState<Horaires>(() => Object.fromEntries(JOURS.map((j) => [j, point.horaires?.[j] ?? []])));
  const [envoi, setEnvoi] = useState(false);

  const maj = (jour: string, i: number, champ: keyof Creneau, v: string) =>
    setH({ ...h, [jour]: h[jour].map((c, k) => (k === i ? { ...c, [champ]: v } : c)) });

  const enregistrer = async () => {
    setEnvoi(true);
    try {
      await api.put(`/admin/points-collecte/${point.id}`, { horaires: h });
      toast.success('Horaires enregistrés');
      invalider('points-collecte');
      onClose();
    } catch (e) {
      toast.error(e);
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Modal title={`Horaires — ${point.nom}`} onClose={onClose} large footer={
      <>
        <button className="btn secondary" onClick={onClose}>Annuler</button>
        <button className="btn secondary" onClick={() => setH({ ...h, ...Object.fromEntries(JOURS.slice(1, 5).map((j) => [j, h.lundi])) })}>
          Copier lundi → vendredi
        </button>
        <button className="btn" onClick={enregistrer} disabled={envoi}>Enregistrer</button>
      </>
    }>
      <table>
        <tbody>
          {JOURS.map((j) => (
            <tr key={j}>
              <td style={{ textTransform: 'capitalize', width: 110 }}>{j}</td>
              <td>
                <div className="actions" style={{ alignItems: 'center' }}>
                  {!h[j].length && <span className="muted small">Fermé</span>}
                  {h[j].map((c, i) => (
                    <span key={i} className="actions" style={{ alignItems: 'center', gap: 4 }}>
                      <input className="input" type="time" style={{ width: 110 }} value={c.debut} onChange={(e) => maj(j, i, 'debut', e.target.value)} />
                      –
                      <input className="input" type="time" style={{ width: 110 }} value={c.fin} onChange={(e) => maj(j, i, 'fin', e.target.value)} />
                      <button className="btn ghost sm" onClick={() => setH({ ...h, [j]: h[j].filter((_, k) => k !== i) })}><Icon name="x" size={13} /></button>
                    </span>
                  ))}
                  <button className="btn ghost sm" onClick={() => setH({ ...h, [j]: [...h[j], { debut: '09:00', fin: '18:00' }] })}>
                    <Icon name="plus" size={13} /> Créneau
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
}
