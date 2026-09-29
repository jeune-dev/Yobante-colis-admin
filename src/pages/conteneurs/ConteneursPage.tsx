import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import type { Liste, Rotation } from '@/api/types';
import Icon from '@/components/Icon';
import { Card, Empty, ErrorBox, Field, Loader, Modal, Pagination, StatutBadge, toast, ligneCliquable } from '@/components/ui';
import { MODES_TRANSPORT, PAYS, STATUTS_ROTATION, libelle } from '@/lib/labels';
import { date, poids } from '@/lib/format';
import { useAction, useFiltres } from '@/lib/hooks';
import { D } from '@/lib/routes';

export default function ConteneursPage() {
  const navigate = useNavigate();
  const [creation, setCreation] = useState(false);
  const { filtres, page, set, setPage } = useFiltres({ statut: '', modeTransport: '', paysDepart: '' });

  const q = useQuery({
    queryKey: ['rotations', filtres, page],
    queryFn: () => api.get<Liste<'rotations', Rotation>>('/admin/rotations', { ...filtres, page, limit: 20 }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <div className="toolbar">
        <select className="select" value={filtres.statut} onChange={(e) => set('statut', e.target.value)}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUTS_ROTATION).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="select" value={filtres.modeTransport} onChange={(e) => set('modeTransport', e.target.value)}>
          <option value="">Tous modes</option>
          {Object.entries(MODES_TRANSPORT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="select" value={filtres.paysDepart} onChange={(e) => set('paysDepart', e.target.value)}>
          <option value="">Tous sens</option>
          <option value="FR">France → Sénégal</option>
          <option value="SN">Sénégal → France</option>
        </select>
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn" onClick={() => setCreation(true)}>
            <Icon name="plus" size={15} /> Nouveau conteneur
          </button>
        </div>
      </div>

      <ErrorBox error={q.error} />
      <Card flush>
        {q.isLoading ? <Loader /> : q.error ? null : !q.data?.rotations.length ? <Empty>Aucun conteneur</Empty> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Référence</th><th>Mode</th><th>Trajet</th><th>Départ prévu</th><th>Arrivée prévue</th><th>Chargement</th><th>Statut</th></tr>
              </thead>
              <tbody>
                {q.data.rotations.map((r) => (
                  <tr key={r.id} className="cliquable" {...ligneCliquable(() => navigate(`${D.conteneur}/${r.id}`))}>
                    <td className="mono">{r.reference}</td>
                    <td>{libelle(MODES_TRANSPORT, r.modeTransport)}</td>
                    <td className="small">{libelle(PAYS, r.paysDepart)} → {libelle(PAYS, r.paysArrivee)}</td>
                    <td className="small">{date(r.dateDepartPrevue)}</td>
                    <td className="small">{date(r.dateArriveePrevue)}</td>
                    <td className="small">
                      {r.nbColisCharges ?? 0} colis · {poids(r.poidsCharge ?? 0)}
                      {r.capacitePoidsKg && <span className="muted"> / {poids(r.capacitePoidsKg)}</span>}
                    </td>
                    <td><StatutBadge table={STATUTS_ROTATION} valeur={r.statut} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination info={q.data?.pagination} onPage={setPage} />
      </Card>

      {creation && <DialogueCreation onClose={() => setCreation(false)} onCree={(id) => navigate(`${D.conteneur}/${id}`)} />}
    </>
  );
}

function DialogueCreation({ onClose, onCree }: { onClose: () => void; onCree: (id: string) => void }) {
  const [f, setF] = useState({
    modeTransport: 'maritime', paysDepart: 'FR', paysArrivee: 'SN', numeroConteneur: '', transporteur: '',
    dateDepartPrevue: '', dateArriveePrevue: '', capacitePoidsKg: '', capaciteColis: '', commentaire: '',
  });
  const maj = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const a = useAction(
    () =>
      api.post<{ rotation: Rotation }>('/admin/rotations', {
        ...f,
        numeroConteneur: f.numeroConteneur || undefined,
        transporteur: f.transporteur || undefined,
        commentaire: f.commentaire || undefined,
        capacitePoidsKg: f.capacitePoidsKg ? Number(f.capacitePoidsKg) : undefined,
        capaciteColis: f.capaciteColis ? Number(f.capaciteColis) : undefined,
      }),
    { succes: 'Conteneur créé', invalider: ['rotations'] }
  );

  const valider = () => {
    if (!f.dateDepartPrevue || !f.dateArriveePrevue) return toast.error('Les dates de départ et d’arrivée sont obligatoires');
    a.mutate(undefined, { onSuccess: (r) => onCree(r.rotation.id) });
  };

  return (
    <Modal title="Nouveau conteneur" onClose={onClose} footer={
      <>
        <button className="btn secondary" onClick={onClose}>Annuler</button>
        <button className="btn" onClick={valider} disabled={a.isPending}>Créer</button>
      </>
    }>
      <div className="form-row">
        <Field label="Mode de transport">
          <select className="select" value={f.modeTransport} onChange={maj('modeTransport')}>
            {Object.entries(MODES_TRANSPORT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Sens">
          <select className="select" value={f.paysDepart}
            onChange={(e) => setF({ ...f, paysDepart: e.target.value, paysArrivee: e.target.value === 'FR' ? 'SN' : 'FR' })}>
            <option value="FR">France → Sénégal</option>
            <option value="SN">Sénégal → France</option>
          </select>
        </Field>
        <Field label="Départ prévu"><input className="input" type="date" value={f.dateDepartPrevue} onChange={maj('dateDepartPrevue')} /></Field>
        <Field label="Arrivée prévue"><input className="input" type="date" value={f.dateArriveePrevue} onChange={maj('dateArriveePrevue')} /></Field>
        <Field label="N° de conteneur"><input className="input" value={f.numeroConteneur} onChange={maj('numeroConteneur')} /></Field>
        <Field label="Transporteur"><input className="input" value={f.transporteur} onChange={maj('transporteur')} /></Field>
        <Field label="Capacité (kg)"><input className="input" type="number" value={f.capacitePoidsKg} onChange={maj('capacitePoidsKg')} /></Field>
        <Field label="Capacité (colis)"><input className="input" type="number" value={f.capaciteColis} onChange={maj('capaciteColis')} /></Field>
      </div>
      <Field label="Commentaire"><textarea className="textarea" value={f.commentaire} onChange={maj('commentaire')} /></Field>
    </Modal>
  );
}
