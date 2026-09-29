import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api, avecVersion } from '@/api/client';
import type { Liste } from '@/api/types';
import Icon from '@/components/Icon';
import { FormModal, type ChampDef } from '@/components/FormModal';
import { Badge, Card, Empty, ErrorBox, Loader, Pagination, SearchInput } from '@/components/ui';
import { OPTIONS_PAYS, PAYS, libelle } from '@/lib/labels';
import { useAction, useFiltres, useInvalider } from '@/lib/hooks';
import { useZonesOptions } from '@/lib/options';

interface Ville {
  id: string;
  nom: string;
  pays: string;
  region?: string;
  zoneId?: string;
  zone?: { id: string; code: string; nom: string };
  codesPostaux?: string[];
  latitude?: number;
  longitude?: number;
  isZoneEloignee: boolean;
  zoneTarifDakar?: boolean;
  livraisonDomicileDisponible: boolean;
  enlevementDomicileDisponible: boolean;
  isActive: boolean;
}

export default function VillesPage() {
  const invalider = useInvalider();
  const [edition, setEdition] = useState<Ville | 'nouvelle' | null>(null);
  const { filtres, page, set, setPage } = useFiltres({ search: '', pays: '', zoneId: '', isZoneEloignee: '', isActive: '' });
  const zones = useZonesOptions(filtres.pays || undefined);

  const q = useQuery({
    queryKey: ['villes', filtres, page],
    queryFn: () => api.get<Liste<'villes', Ville>>('/admin/villes', { ...filtres, page, limit: 30 }),
    placeholderData: keepPreviousData,
  });
  const toggle = useAction((v: Ville) => api.patch(`/admin/villes/${v.id}/statut`, { isActive: !v.isActive }), {
    succes: 'Ville mise à jour',
    invalider: ['villes'],
  });
  const supprimer = useAction((v: Ville) => api.delete(`/admin/villes/${v.id}`), { succes: 'Ville supprimée', invalider: ['villes'] });

  const pays = edition && edition !== 'nouvelle' ? edition.pays : undefined;
  const champs: ChampDef[] = [
    { name: 'nom', label: 'Nom', required: true },
    { name: 'pays', label: 'Pays', type: 'select', options: OPTIONS_PAYS, required: true },
    { name: 'region', label: 'Région' },
    { name: 'zoneId', label: 'Zone tarifaire', type: 'select', options: zones.data ?? [], hint: pays ? undefined : 'Zones de tous pays : choisir une zone du même pays' },
    { name: 'codesPostaux', label: 'Codes postaux', type: 'tags', hint: 'Séparés par des virgules', full: true },
    { name: 'latitude', label: 'Latitude', type: 'number' },
    { name: 'longitude', label: 'Longitude', type: 'number' },
    { name: 'isZoneEloignee', label: 'Zone éloignée (surcharge automatique)', type: 'checkbox' },
    { name: 'livraisonDomicileDisponible', label: 'Livraison à domicile disponible', type: 'checkbox' },
    { name: 'enlevementDomicileDisponible', label: 'Enlèvement à domicile disponible', type: 'checkbox' },
    { name: 'isActive', label: 'Active', type: 'checkbox' },
  ];

  return (
    <>
      <div className="toolbar">
        <SearchInput value={filtres.search} onChange={(v) => set('search', v)} placeholder="Nom de ville…" />
        <select className="select" value={filtres.pays} onChange={(e) => set('pays', e.target.value)}>
          <option value="">Tous pays</option>
          {Object.entries(OPTIONS_PAYS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="select" value={filtres.zoneId} onChange={(e) => set('zoneId', e.target.value)}>
          <option value="">Toutes zones</option>
          {zones.data?.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
        </select>
        <select className="select" value={filtres.isZoneEloignee} onChange={(e) => set('isZoneEloignee', e.target.value)}>
          <option value="">Éloignées ou non</option>
          <option value="true">Zones éloignées</option>
          <option value="false">Zones non éloignées</option>
        </select>
        <button className="btn" style={{ marginLeft: 'auto' }} onClick={() => setEdition('nouvelle')}>
          <Icon name="plus" size={15} /> Nouvelle ville
        </button>
      </div>

      <ErrorBox error={q.error} />
      <Card flush>
        {q.isLoading ? <Loader /> : q.error ? null : !q.data?.villes.length ? <Empty>Aucune ville</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Ville</th><th>Pays</th><th>Région</th><th>Zone</th><th>Codes postaux</th><th>Services</th><th>État</th><th /></tr></thead>
              <tbody>
                {q.data.villes.map((v) => (
                  <tr key={v.id}>
                    <td><strong>{v.nom}</strong></td>
                    <td>{libelle(PAYS, v.pays)}</td>
                    <td className="small">{v.region || '—'}</td>
                    <td className="small">{v.zone ? `${v.zone.code}` : '—'}</td>
                    <td className="small">{v.codesPostaux?.join(', ') || '—'}</td>
                    <td>
                      <div className="actions">
                        {v.zoneTarifDakar && <Badge ton="bleu">Tarif Dakar</Badge>}
                        {v.isZoneEloignee && <Badge ton="orange">Éloignée</Badge>}
                        {v.livraisonDomicileDisponible && <Badge>Livraison</Badge>}
                        {v.enlevementDomicileDisponible && <Badge>Enlèvement</Badge>}
                      </div>
                    </td>
                    <td>{v.isActive ? <Badge ton="vert">Active</Badge> : <Badge>Inactive</Badge>}</td>
                    <td>
                      <div className="actions">
                        <button className="btn ghost sm" title="Modifier" onClick={() => setEdition(v)}><Icon name="pencil" size={14} /></button>
                        <button className="btn secondary sm" onClick={() => toggle.mutate(v)}>{v.isActive ? 'Désactiver' : 'Activer'}</button>
                        <button className="btn ghost sm" title="Supprimer"
                          onClick={() => confirm(`Supprimer la ville ${v.nom} ?`) && supprimer.mutate(v)}>
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

      {edition && (
        <FormModal
          title={edition === 'nouvelle' ? 'Nouvelle ville' : `Modifier ${edition.nom}`}
          champs={champs}
          initial={edition === 'nouvelle'
            ? { pays: 'SN', livraisonDomicileDisponible: true, enlevementDomicileDisponible: true, isActive: true }
            : (edition as never)}
          succes={edition === 'nouvelle' ? 'Ville créée' : 'Ville mise à jour'}
          onSubmit={async (corps, { version }) => {
            if (edition === 'nouvelle') await api.post('/admin/villes', corps);
            else await api.put(`/admin/villes/${edition.id}`, corps, avecVersion(version));
            invalider('villes');
          }}
          onClose={() => setEdition(null)}
        />
      )}
    </>
  );
}
