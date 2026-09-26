import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import type { Liste, PointRef, VilleRef } from '@/api/types';
import Icon from '@/components/Icon';
import { FormModal } from '@/components/FormModal';
import { Badge, Card, Empty, ErrorBox, Loader, Pagination, SearchInput, Stat } from '@/components/ui';
import { OPTIONS_PAYS, PAYS, SERVICES_POINT, TYPES_POINT, libelle } from '@/lib/labels';
import { useFiltres, useInvalider } from '@/lib/hooks';
import { usePointsOptions, useVillesOptions } from '@/lib/options';
import { champsPoint } from './pointChamps';

export interface Point extends PointRef {
  type: string;
  villeId: string;
  telephone?: string;
  email?: string;
  colisEnStock?: number;
  capaciteMaxColis?: number;
  isActive: boolean;
  enMaintenance: boolean;
  motifMaintenance?: string;
  visiblePublic?: boolean;
  ville?: VilleRef;
  services?: string[];
  ouvertMaintenant?: boolean;
  sature?: boolean;
}

interface Reseau {
  pays: string;
  libelle: string;
  total: number;
  parType: Record<string, number>;
  colisEnStock: number;
}

export default function PointsCollectePage() {
  const navigate = useNavigate();
  const invalider = useInvalider();
  const [creation, setCreation] = useState(false);
  const { filtres, page, set, setPage } = useFiltres({ search: '', pays: '', type: '', isActive: '', enMaintenance: '', service: '' });

  const q = useQuery({
    queryKey: ['points-collecte', filtres, page],
    queryFn: () => api.get<Liste<'points', Point>>('/admin/points-collecte', { ...filtres, page, limit: 20 }),
    placeholderData: keepPreviousData,
  });
  const reseau = useQuery({
    queryKey: ['points-collecte', 'reseau'],
    queryFn: () => api.get<{ reseau: Reseau[] }>('/admin/points-collecte/reseau').then((r) => r.reseau),
  });

  return (
    <>
      <div className="stats">
        {reseau.data?.map((r) => (
          <Stat
            key={r.pays}
            icon="map-pin"
            ton={r.pays === 'SN' ? 'vert' : 'bleu'}
            value={r.total}
            label={`Points — ${r.libelle}`}
            hint={`${r.colisEnStock} colis en stock · ${Object.entries(r.parType).filter(([, n]) => n).map(([t, n]) => `${n} ${libelle(TYPES_POINT, t).toLowerCase()}`).join(', ') || 'aucun'}`}
            onClick={() => set('pays', r.pays)}
          />
        ))}
      </div>

      <div className="toolbar">
        <SearchInput value={filtres.search} onChange={(v) => set('search', v)} placeholder="Code, nom, adresse…" />
        <select className="select" value={filtres.pays} onChange={(e) => set('pays', e.target.value)}>
          <option value="">Tous pays</option>
          {Object.entries(OPTIONS_PAYS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="select" value={filtres.type} onChange={(e) => set('type', e.target.value)}>
          <option value="">Tous types</option>
          {Object.entries(TYPES_POINT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="select" value={filtres.service} onChange={(e) => set('service', e.target.value)}>
          <option value="">Toutes prestations</option>
          {Object.entries(SERVICES_POINT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="select" value={filtres.enMaintenance} onChange={(e) => set('enMaintenance', e.target.value)}>
          <option value="">Maintenance ou non</option>
          <option value="true">En maintenance</option>
          <option value="false">Hors maintenance</option>
        </select>
        <button className="btn" style={{ marginLeft: 'auto' }} onClick={() => setCreation(true)}>
          <Icon name="plus" size={15} /> Nouveau point
        </button>
      </div>

      <ErrorBox error={q.error} />
      <Card flush>
        {q.isLoading ? <Loader /> : !q.data?.points.length ? <Empty>Aucun point de collecte</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Code</th><th>Nom</th><th>Type</th><th>Ville</th><th>Prestations</th><th>Stock</th><th>État</th></tr></thead>
              <tbody>
                {q.data.points.map((p) => (
                  <tr key={p.id} className="cliquable" onClick={() => navigate(`/points-collecte/${p.id}`)}>
                    <td className="mono">{p.code}</td>
                    <td><strong>{p.nom}</strong><div className="muted small">{p.adresse}</div></td>
                    <td>{libelle(TYPES_POINT, p.type)}</td>
                    <td className="small">{p.ville?.nom ?? '—'} ({libelle(PAYS, p.pays)})</td>
                    <td className="small">{p.services?.map((s) => libelle(SERVICES_POINT, s)).join(', ') || '—'}</td>
                    <td className="small">
                      {p.colisEnStock ?? 0}{p.capaciteMaxColis ? ` / ${p.capaciteMaxColis}` : ''}
                      {p.sature && <> <Badge ton="rouge">Saturé</Badge></>}
                    </td>
                    <td>
                      {!p.isActive ? <Badge ton="gris">Inactif</Badge>
                        : p.enMaintenance ? <Badge ton="orange">Maintenance</Badge>
                        : <Badge ton="vert">Actif</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination info={q.data?.pagination} onPage={setPage} />
      </Card>

      {creation && <DialoguePoint onClose={() => setCreation(false)} onOk={() => invalider('points-collecte')} />}
    </>
  );
}

/** Création ou modification d'un point ; la liste des villes suit le pays du point. */
export function DialoguePoint({ point, onClose, onOk }: { point?: Point; onClose: () => void; onOk: () => void }) {
  const pays = point?.pays ?? 'SN';
  const villes = useVillesOptions();
  const hubs = usePointsOptions(undefined, { type: 'hub' });
  if (villes.isLoading || hubs.isLoading) return null;

  return (
    <FormModal
      large
      title={point ? `Modifier ${point.nom}` : 'Nouveau point de collecte'}
      champs={champsPoint(villes.data ?? [], (hubs.data ?? []).filter((h) => h.value !== point?.id))}
      initial={point ? (point as never) : { pays, type: 'agence', services: ['depot', 'retrait'], delaiGardeJours: 15, visiblePublic: true, isActive: true }}
      intro={!point && <p className="small muted">Les horaires se règlent ensuite depuis la fiche du point.</p>}
      succes={point ? 'Point mis à jour' : 'Point de collecte créé'}
      onSubmit={async (corps) => {
        if (point) await api.put(`/admin/points-collecte/${point.id}`, corps);
        else await api.post('/admin/points-collecte', corps);
        onOk();
      }}
      onClose={onClose}
    />
  );
}
