import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, avecVersion } from '@/api/client';
import type { Num } from '@/api/types';
import Icon from '@/components/Icon';
import { FormModal, type ChampDef } from '@/components/FormModal';
import { Badge, Card, Empty, ErrorBox, Loader } from '@/components/ui';
import { MODES_TRANSPORT, TYPES_CONTENU, libelle } from '@/lib/labels';
import { poids } from '@/lib/format';
import { useAction, useFiltres, useInvalider } from '@/lib/hooks';

interface Service {
  id: string;
  code: string;
  nom: string;
  description?: string;
  modeTransport: string;
  delaiMinJours: number;
  delaiMaxJours: number;
  joursOuvresUniquement: boolean;
  heureLimiteDepot?: string;
  coefficientVolumetrique: number;
  poidsMinKg: Num;
  poidsMaxKg: Num;
  dimensionsMaxCm?: number;
  typesContenuAutorises: string[];
  assuranceIncluse: Num;
  suiviDetaille: boolean;
  livraisonSamedi: boolean;
  ordreAffichage: number;
  isActive: boolean;
}

const CHAMPS: ChampDef[] = [
  { name: 'code', label: 'Code', required: true, placeholder: 'STD' },
  { name: 'nom', label: 'Nom', required: true },
  { name: 'modeTransport', label: 'Mode de transport', type: 'select', options: MODES_TRANSPORT, required: true },
  { name: 'ordreAffichage', label: "Ordre d'affichage", type: 'number', step: '1' },
  { name: 'delaiMinJours', label: 'Délai minimum (jours)', type: 'number', step: '1', required: true },
  { name: 'delaiMaxJours', label: 'Délai maximum (jours)', type: 'number', step: '1', required: true },
  { name: 'heureLimiteDepot', label: 'Heure limite de dépôt', type: 'time' },
  { name: 'coefficientVolumetrique', label: 'Coefficient volumétrique', type: 'number', step: '1', hint: 'Diviseur L×l×h (cm) → kg, ex. 5000' },
  { name: 'poidsMinKg', label: 'Poids min (kg)', type: 'number' },
  { name: 'poidsMaxKg', label: 'Poids max (kg)', type: 'number' },
  { name: 'dimensionsMaxCm', label: 'Plus grande dimension max (cm)', type: 'number', step: '1' },
  { name: 'assuranceIncluse', label: 'Assurance incluse (montant)', type: 'number' },
  { name: 'typesContenuAutorises', label: 'Contenus autorisés', type: 'multiselect', options: TYPES_CONTENU },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'joursOuvresUniquement', label: 'Délais comptés en jours ouvrés', type: 'checkbox' },
  { name: 'suiviDetaille', label: 'Suivi détaillé', type: 'checkbox' },
  { name: 'livraisonSamedi', label: 'Livraison le samedi', type: 'checkbox' },
  { name: 'isActive', label: 'Actif', type: 'checkbox' },
];

const DEFAUTS = {
  modeTransport: 'aerien', coefficientVolumetrique: 5000, poidsMinKg: 0.1, poidsMaxKg: 70, assuranceIncluse: 0,
  typesContenuAutorises: Object.keys(TYPES_CONTENU), joursOuvresUniquement: true, suiviDetaille: true, isActive: true, ordreAffichage: 0,
};

export default function ServicesPage() {
  const invalider = useInvalider();
  const [edition, setEdition] = useState<Service | 'nouveau' | null>(null);
  const { filtres, set } = useFiltres({ modeTransport: '', isActive: '' });

  const q = useQuery({
    queryKey: ['services', filtres],
    queryFn: () => api.get<{ services: Service[] }>('/admin/services', filtres).then((r) => r.services),
  });
  const toggle = useAction((s: Service) => api.patch(`/admin/services/${s.id}/statut`, { isActive: !s.isActive }), {
    succes: 'Service mis à jour',
    invalider: ['services'],
  });
  const supprimer = useAction((s: Service) => api.delete(`/admin/services/${s.id}`), {
    succes: 'Service et grille associée supprimés',
    invalider: ['services', 'tarifs'],
  });

  return (
    <>
      <div className="toolbar">
        <select className="select" value={filtres.modeTransport} onChange={(e) => set('modeTransport', e.target.value)}>
          <option value="">Tous modes</option>
          {Object.entries(MODES_TRANSPORT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="select" value={filtres.isActive} onChange={(e) => set('isActive', e.target.value)}>
          <option value="">Actifs et inactifs</option>
          <option value="true">Actifs</option>
          <option value="false">Inactifs</option>
        </select>
        <button className="btn" style={{ marginLeft: 'auto' }} onClick={() => setEdition('nouveau')}>
          <Icon name="plus" size={15} /> Nouveau service
        </button>
      </div>

      <ErrorBox error={q.error} />
      <Card flush>
        {q.isLoading ? <Loader /> : q.error ? null : !q.data?.length ? <Empty>Aucun service</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Code</th><th>Service</th><th>Mode</th><th>Délai</th><th>Poids</th><th>Coef. vol.</th><th>État</th><th /></tr></thead>
              <tbody>
                {q.data.map((s) => (
                  <tr key={s.id}>
                    <td className="mono">{s.code}</td>
                    <td><strong>{s.nom}</strong>{s.description && <div className="muted small">{s.description}</div>}</td>
                    <td>{libelle(MODES_TRANSPORT, s.modeTransport)}</td>
                    <td className="small">{s.delaiMinJours}–{s.delaiMaxJours} j{s.joursOuvresUniquement ? ' ouvrés' : ''}</td>
                    <td className="small">{poids(s.poidsMinKg)} → {poids(s.poidsMaxKg)}</td>
                    <td className="small">{s.coefficientVolumetrique}</td>
                    <td>{s.isActive ? <Badge ton="vert">Actif</Badge> : <Badge>Inactif</Badge>}</td>
                    <td>
                      <div className="actions">
                        <button className="btn ghost sm" title="Modifier" onClick={() => setEdition(s)}><Icon name="pencil" size={14} /></button>
                        <button className="btn secondary sm" onClick={() => toggle.mutate(s)}>{s.isActive ? 'Désactiver' : 'Activer'}</button>
                        <button className="btn ghost sm" title="Supprimer"
                          onClick={() => confirm(`Supprimer le service ${s.nom} et toute sa grille tarifaire ?`) && supprimer.mutate(s)}>
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
      </Card>

      {edition && (
        <FormModal
          large
          title={edition === 'nouveau' ? "Nouveau service d'expédition" : `Modifier ${edition.nom}`}
          champs={CHAMPS}
          initial={edition === 'nouveau' ? DEFAUTS : (edition as never)}
          succes={edition === 'nouveau' ? 'Service créé' : 'Service mis à jour'}
          onSubmit={async (corps, { version }) => {
            if (edition === 'nouveau') await api.post('/admin/services', corps);
            else await api.put(`/admin/services/${edition.id}`, corps, avecVersion(version));
            invalider('services');
          }}
          onClose={() => setEdition(null)}
        />
      )}
    </>
  );
}
