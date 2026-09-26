import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/api/client';
import type { Colis, Rotation } from '@/api/types';
import Icon from '@/components/Icon';
import { Card, Empty, ErrorBox, Field, KV, Loader, Modal, StatutBadge, toast } from '@/components/ui';
import { MODES_TRANSPORT, PAYS, STATUTS_COLIS, STATUTS_ROTATION, STATUTS_ROTATION_CIBLES, libelle } from '@/lib/labels';
import { date, ouvrirDocument, poids } from '@/lib/format';
import { useAction, useInvalider } from '@/lib/hooks';
import { FormModal } from '@/components/FormModal';
import { DEVISES } from '@/lib/labels';

export default function ConteneurDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [chargement, setChargement] = useState(false);
  const [statut, setStatut] = useState(false);
  const [edition, setEdition] = useState<null | 'modifier' | 'cout'>(null);
  const invalider = useInvalider();

  const q = useQuery({
    queryKey: ['rotations', id],
    queryFn: () => api.get<{ rotation: Rotation }>(`/admin/rotations/${id}`).then((r) => r.rotation),
  });

  const decharger = useAction(
    (colisIds: string[]) => api.delete(`/admin/rotations/${id}/colis`, { colisIds }),
    { succes: 'Colis retiré du conteneur', invalider: ['rotations', 'colis'] }
  );

  const manifeste = async () => {
    try {
      ouvrirDocument(await api.html(`/admin/rotations/${id}/manifeste`));
    } catch (e) {
      toast.error(e);
    }
  };

  if (q.isLoading) return <Loader />;
  if (q.error) return <ErrorBox error={q.error} />;
  const r = q.data!;

  return (
    <>
      <span className="back" onClick={() => navigate('/conteneurs')}>
        <Icon name="arrow-left" size={15} /> Conteneurs
      </span>
      <div className="hero">
        <span className="hero-ref">{r.reference}</span>
        <StatutBadge table={STATUTS_ROTATION} valeur={r.statut} />
        <div className="actions">
          {r.estOuverteAuChargement && (
            <button className="btn" onClick={() => setChargement(true)}>
              <Icon name="plus" size={15} /> Charger des colis
            </button>
          )}
          <button className="btn secondary" onClick={() => setStatut(true)}>
            <Icon name="refresh-cw" size={15} /> Changer le statut
          </button>
          <button className="btn secondary" onClick={manifeste}>
            <Icon name="printer" size={15} /> Manifeste
          </button>
          <button className="btn secondary" onClick={() => setEdition('modifier')}>
            <Icon name="pencil" size={15} /> Modifier
          </button>
          <button className="btn secondary" onClick={() => setEdition('cout')}>
            <Icon name="coins" size={15} /> Coût du conteneur
          </button>
        </div>
      </div>

      <div className="grid grid-main-side">
        <Card title={`Colis chargés (${r.colis?.length ?? 0})`} flush>
          {!r.colis?.length ? <Empty>Aucun colis chargé</Empty> : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Référence</th><th>Expéditeur</th><th>Destinataire</th><th>Destination</th><th>Poids</th><th>Statut</th><th /></tr>
                </thead>
                <tbody>
                  {r.colis.map((c) => (
                    <tr key={c.id}>
                      <td className="mono"><a onClick={() => navigate(`/colis/${c.id}`)} style={{ cursor: 'pointer' }}>{c.reference}</a></td>
                      <td>{c.expediteurNom}</td>
                      <td>{c.destinataireNom}</td>
                      <td className="small">{c.villeArrivee?.nom ?? '—'}</td>
                      <td className="small">{poids(c.poidsFactureKg)}</td>
                      <td><StatutBadge table={STATUTS_COLIS} valeur={c.statut} /></td>
                      <td>
                        {r.estOuverteAuChargement && (
                          <button className="btn ghost sm" title="Retirer du conteneur"
                            onClick={() => confirm(`Retirer ${c.reference} du conteneur ?`) && decharger.mutate([c.id])}>
                            <Icon name="trash-2" size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Informations">
          <div className="kv one">
            <KV label="Mode">{libelle(MODES_TRANSPORT, r.modeTransport)}</KV>
            <KV label="Trajet">{libelle(PAYS, r.paysDepart)} → {libelle(PAYS, r.paysArrivee)}</KV>
            <KV label="N° conteneur / vol">{r.numeroConteneur || r.numeroVol || '—'}</KV>
            <KV label="Transporteur">{r.transporteur || '—'}</KV>
            <KV label="Départ">{date(r.dateDepartEffective ?? r.dateDepartPrevue)}{!r.dateDepartEffective && ' (prévu)'}</KV>
            <KV label="Arrivée">{date(r.dateArriveeEffective ?? r.dateArriveePrevue)}{!r.dateArriveeEffective && ' (prévue)'}</KV>
            <KV label="Chargement">
              {r.nbColisCharges ?? 0} colis{r.capaciteColis ? ` / ${r.capaciteColis}` : ''} · {poids(r.poidsCharge ?? 0)}
              {r.capacitePoidsKg ? ` / ${poids(r.capacitePoidsKg)}` : ''}
              {r.tauxRemplissagePoids != null && (
                <div className="bar-track" style={{ marginTop: 6 }}>
                  <div className="bar-fill" style={{ width: `${Math.min(100, r.tauxRemplissagePoids)}%` }} />
                </div>
              )}
            </KV>
            {r.commentaire && <KV label="Commentaire">{r.commentaire}</KV>}
          </div>
        </Card>
      </div>

      {chargement && <DialogueChargement rotation={r} onClose={() => setChargement(false)} />}
      {statut && <DialogueStatut rotation={r} onClose={() => setStatut(false)} />}
      {edition === 'modifier' && (
        <FormModal
          large
          title={`Modifier ${r.reference}`}
          champs={[
            { name: 'numeroOrdre', label: 'N° de conteneur', type: 'number', step: '1' },
            { name: 'numeroConteneur', label: 'N° de conteneur (armateur)' },
            { name: 'numeroVol', label: 'N° de vol' },
            { name: 'transporteur', label: 'Transporteur' },
            { name: 'dateCloture', label: 'Clôture du chargement', type: 'date' },
            { name: 'dateDepartPrevue', label: 'Départ prévu', type: 'date' },
            { name: 'dateArriveePrevue', label: 'Arrivée prévue', type: 'date' },
            { name: 'capacitePoidsKg', label: 'Capacité (kg)', type: 'number' },
            { name: 'capaciteColis', label: 'Capacité (colis)', type: 'number', step: '1' },
            { name: 'commentaire', label: 'Commentaire', type: 'textarea' },
          ]}
          initial={r as never}
          succes="Conteneur mis à jour"
          onSubmit={async (corps) => { await api.put(`/admin/rotations/${r.id}`, corps); invalider('rotations'); }}
          onClose={() => setEdition(null)}
        />
      )}
      {edition === 'cout' && (
        <FormModal
          title="Coût du conteneur"
          intro={
            <p className="small">
              Le coût total (fret, dédouanement…) est réparti sur les {r.colis?.length ?? 0} colis embarqués au prorata de leur poids
              facturé, converti dans la devise de chaque colis. Il alimente la marge du tableau de bord.
            </p>
          }
          champs={[
            { name: 'coutTotal', label: 'Coût total', type: 'number', step: '0.01', required: true },
            { name: 'devise', label: 'Devise', type: 'select', options: DEVISES, required: true },
          ]}
          initial={{ devise: r.paysDepart === 'FR' ? 'EUR' : 'XOF' }}
          submitLabel="Répartir"
          succes={false}
          onSubmit={async (corps) => {
            const res = await api.post<{ nbColis: number }>(`/admin/rotations/${r.id}/cout`, corps);
            toast.success(`Coût réparti sur ${res.nbColis} colis`);
            invalider('rotations', 'colis', 'dashboard');
          }}
          onClose={() => setEdition(null)}
        />
      )}
    </>
  );
}

function DialogueChargement({ rotation, onClose }: { rotation: Rotation; onClose: () => void }) {
  const [choix, setChoix] = useState<string[]>([]);
  const q = useQuery({
    queryKey: ['embarquables', rotation.paysDepart, rotation.paysArrivee],
    queryFn: () =>
      api.get<{ colis: Colis[] }>('/admin/rotations/embarquables', {
        paysDepart: rotation.paysDepart, paysArrivee: rotation.paysArrivee, limit: 100,
      }),
  });
  const a = useAction(
    () => api.post<{ charges: unknown[]; refuses: { reference?: string; motif?: string }[] }>(`/admin/rotations/${rotation.id}/colis`, { colisIds: choix }),
    { invalider: ['rotations', 'colis'] }
  );
  const basculer = (id: string) => setChoix((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  const charger = () =>
    a.mutate(undefined, {
      onSuccess: (res) => {
        toast.success(`${res.charges?.length ?? 0} colis chargé(s)`);
        if (res.refuses?.length) toast.error(`${res.refuses.length} colis refusé(s) : ${res.refuses.map((x) => x.motif).filter(Boolean).join(', ')}`);
        onClose();
      },
    });

  return (
    <Modal large title="Charger des colis" onClose={onClose} footer={
      <>
        <button className="btn secondary" onClick={onClose}>Annuler</button>
        <button className="btn" disabled={!choix.length || a.isPending} onClick={charger}>Charger {choix.length || ''} colis</button>
      </>
    }>
      <p className="small muted" style={{ marginBottom: 10 }}>Colis réceptionnés sur ce trajet et pas encore affectés à un conteneur.</p>
      <ErrorBox error={q.error} />
      {q.isLoading ? <Loader /> : !q.data?.colis.length ? <Empty>Aucun colis prêt à embarquer</Empty> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th /><th>Référence</th><th>Destinataire</th><th>Destination</th><th>Poids</th><th>Statut</th></tr></thead>
            <tbody>
              {q.data.colis.map((c) => (
                <tr key={c.id} className="cliquable" onClick={() => basculer(c.id)}>
                  <td><input type="checkbox" readOnly checked={choix.includes(c.id)} /></td>
                  <td className="mono">{c.reference}</td>
                  <td>{c.destinataireNom}</td>
                  <td className="small">{c.villeArrivee?.nom ?? '—'}</td>
                  <td className="small">{poids(c.poidsFactureKg)}</td>
                  <td><StatutBadge table={STATUTS_COLIS} valeur={c.statut} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

function DialogueStatut({ rotation, onClose }: { rotation: Rotation; onClose: () => void }) {
  const [statut, setStatut] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const a = useAction(
    () => api.patch<{ colisMisAJour?: number }>(`/admin/rotations/${rotation.id}/statut`, { statut, commentaire: commentaire || undefined }),
    { invalider: ['rotations', 'colis'] }
  );
  const valider = () =>
    statut
      ? a.mutate(undefined, {
          onSuccess: (r) => {
            toast.success(`Statut mis à jour${r?.colisMisAJour ? ` (${r.colisMisAJour} colis mis à jour)` : ''}`);
            onClose();
          },
        })
      : toast.error('Choisissez un statut');

  return (
    <Modal title="Changer le statut du conteneur" onClose={onClose} footer={
      <>
        <button className="btn secondary" onClick={onClose}>Annuler</button>
        <button className="btn" onClick={valider} disabled={a.isPending}>Appliquer</button>
      </>
    }>
      <p className="small" style={{ marginBottom: 12 }}>
        Les étapes (expédié, arrivé, en douane…) sont propagées aux colis chargés et notifiées aux clients.
      </p>
      <Field label="Nouveau statut">
        <select className="select" value={statut} onChange={(e) => setStatut(e.target.value)}>
          <option value="">— Choisir —</option>
          {STATUTS_ROTATION_CIBLES.filter((s) => s !== rotation.statut).map((s) => (
            <option key={s} value={s}>{STATUTS_ROTATION[s].label}</option>
          ))}
        </select>
      </Field>
      <Field label="Commentaire"><textarea className="textarea" value={commentaire} onChange={(e) => setCommentaire(e.target.value)} /></Field>
    </Modal>
  );
}
