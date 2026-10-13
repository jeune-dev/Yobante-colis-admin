import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { Liste } from '@/api/types';
import Icon from '@/components/Icon';
import { FormModal, type ChampDef } from '@/components/FormModal';
import { Badge, Card, Empty, ErrorBox, Loader, Pagination, SearchInput } from '@/components/ui';
import { OPTIONS_PAYS, PAYS, libelle } from '@/lib/labels';
import { useAction, useFiltres, useInvalider } from '@/lib/hooks';
import { useZonesOptions } from '@/lib/options';
import ResponsiveTable from '@/components/ResponsiveTable';

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
        <button className="btn pousser" onClick={() => setEdition('nouvelle')}>
          <Icon name="plus" size={15} /> Nouvelle ville
        </button>
      </div>

      <ErrorBox error={q.error} />
      <Card flush>
        {q.isLoading ? <Loader /> : !q.data?.villes.length ? <Empty>Aucune ville</Empty> : (
          <ResponsiveTable
            lignes={q.data.villes}
            cleLigne={(v) => v.id}
            colonnes={[
              { cle: 'ville', titre: 'Ville', cellule: (v) => <strong>{v.nom}</strong> },
              { cle: 'pays', titre: 'Pays', cellule: (v) => libelle(PAYS, v.pays) },
              { cle: 'region', titre: 'Région', className: 'small', cellule: (v) => v.region || '—' },
              { cle: 'zone', titre: 'Zone', className: 'small', cellule: (v) => (v.zone ? `${v.zone.code}` : '—') },
              { cle: 'codes', titre: 'Codes postaux', className: 'small', priorite: 'basse', cellule: (v) => v.codesPostaux?.join(', ') || '—' },
              { cle: 'services', titre: 'Services', priorite: 'basse', cellule: (v) => (
                <div className="actions">
                  {v.zoneTarifDakar && <Badge ton="bleu">Tarif Dakar</Badge>}
                  {v.isZoneEloignee && <Badge ton="orange">Éloignée</Badge>}
                  {v.livraisonDomicileDisponible && <Badge>Livraison</Badge>}
                  {v.enlevementDomicileDisponible && <Badge>Enlèvement</Badge>}
                </div>
              ) },
              { cle: 'etat', titre: 'État', mobile: 'badge', cellule: (v) => (v.isActive ? <Badge ton="vert">Active</Badge> : <Badge>Inactive</Badge>) },
              { cle: 'actions', cellule: (v) => (
                <div className="actions">
                  <button className="btn ghost sm" title="Modifier" aria-label="Modifier" onClick={() => setEdition(v)}><Icon name="pencil" size={14} /></button>
                  <button className="btn secondary sm" onClick={() => toggle.mutate(v)}>{v.isActive ? 'Désactiver' : 'Activer'}</button>
                  <button className="btn ghost sm" title="Supprimer" aria-label="Supprimer"
                    onClick={() => confirm(`Supprimer la ville ${v.nom} ?`) && supprimer.mutate(v)}>
                    <Icon name="trash-2" size={14} />
                  </button>
                </div>
              ) },
            ]}
          />
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
          onSubmit={async (corps) => {
            if (edition === 'nouvelle') await api.post('/admin/villes', corps);
            else await api.put(`/admin/villes/${edition.id}`, corps);
            invalider('villes');
          }}
          onClose={() => setEdition(null)}
        />
      )}
    </>
  );
}
