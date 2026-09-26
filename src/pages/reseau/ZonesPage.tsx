import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { Liste, Num } from '@/api/types';
import Icon from '@/components/Icon';
import { FormModal, type ChampDef } from '@/components/FormModal';
import { Badge, Card, Empty, ErrorBox, Loader, Modal, Pagination, SearchInput, toast } from '@/components/ui';
import { OPTIONS_PAYS, PAYS, libelle } from '@/lib/labels';
import { useAction, useFiltres, useInvalider } from '@/lib/hooks';

interface Zone {
  id: string;
  code: string;
  nom: string;
  pays: string;
  description?: string;
  majorationPourcent: Num;
  delaiSupplementaireJours: number;
  isActive: boolean;
  villes?: { id: string; nom: string }[];
}

const CHAMPS: ChampDef[] = [
  { name: 'code', label: 'Code', required: true, placeholder: 'SN-DKR' },
  { name: 'nom', label: 'Nom', required: true },
  { name: 'pays', label: 'Pays', type: 'select', options: OPTIONS_PAYS, required: true },
  { name: 'majorationPourcent', label: 'Majoration (%)', type: 'number' },
  { name: 'delaiSupplementaireJours', label: 'Délai supplémentaire (jours)', type: 'number', step: '1' },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'isActive', label: 'Active', type: 'checkbox' },
];

export default function ZonesPage() {
  const invalider = useInvalider();
  const [edition, setEdition] = useState<Zone | 'nouvelle' | null>(null);
  const [villes, setVilles] = useState<Zone | null>(null);
  const { filtres, page, set, setPage } = useFiltres({ search: '', pays: '', isActive: '' });

  const q = useQuery({
    queryKey: ['zones', filtres, page],
    queryFn: () => api.get<Liste<'zones', Zone>>('/admin/zones', { ...filtres, page, limit: 20 }),
    placeholderData: keepPreviousData,
  });
  const supprimer = useAction((z: Zone) => api.delete(`/admin/zones/${z.id}`), {
    succes: 'Zone supprimée : ses villes relèvent du tarif national',
    invalider: ['zones', 'villes'],
  });

  return (
    <>
      <div className="alert info">
        <Icon name="map-pin" size={16} />
        <div>Une zone regroupe des villes d'un même pays et peut majorer le tarif ou allonger le délai. Une ville sans zone relève du tarif national.</div>
      </div>
      <div className="toolbar">
        <SearchInput value={filtres.search} onChange={(v) => set('search', v)} placeholder="Code, nom…" />
        <select className="select" value={filtres.pays} onChange={(e) => set('pays', e.target.value)}>
          <option value="">Tous pays</option>
          {Object.entries(OPTIONS_PAYS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn" style={{ marginLeft: 'auto' }} onClick={() => setEdition('nouvelle')}>
          <Icon name="plus" size={15} /> Nouvelle zone
        </button>
      </div>

      <ErrorBox error={q.error} />
      <Card flush>
        {q.isLoading ? <Loader /> : !q.data?.zones.length ? <Empty>Aucune zone</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Code</th><th>Nom</th><th>Pays</th><th>Majoration</th><th>Délai +</th><th>Villes</th><th>État</th><th /></tr></thead>
              <tbody>
                {q.data.zones.map((z) => (
                  <tr key={z.id}>
                    <td className="mono">{z.code}</td>
                    <td><strong>{z.nom}</strong>{z.description && <div className="muted small">{z.description}</div>}</td>
                    <td>{libelle(PAYS, z.pays)}</td>
                    <td>{Number(z.majorationPourcent)} %</td>
                    <td>{z.delaiSupplementaireJours} j</td>
                    <td className="small">{z.villes?.map((v) => v.nom).join(', ') || '—'}</td>
                    <td>{z.isActive ? <Badge ton="vert">Active</Badge> : <Badge>Inactive</Badge>}</td>
                    <td>
                      <div className="actions">
                        <button className="btn secondary sm" onClick={() => setVilles(z)}>Villes</button>
                        <button className="btn ghost sm" title="Modifier" onClick={() => setEdition(z)}><Icon name="pencil" size={14} /></button>
                        <button className="btn ghost sm" title="Supprimer"
                          onClick={() => confirm(`Supprimer la zone ${z.nom} ?`) && supprimer.mutate(z)}>
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
          title={edition === 'nouvelle' ? 'Nouvelle zone' : `Modifier ${edition.nom}`}
          // Le pays d'une zone est fixé à sa création (PUT ne l'accepte pas)
          champs={CHAMPS.map((c) => (c.name === 'pays' && edition !== 'nouvelle' ? { ...c, disabled: true } : c))}
          initial={edition === 'nouvelle' ? { pays: 'SN', majorationPourcent: 0, delaiSupplementaireJours: 0, isActive: true } : (edition as never)}
          succes={edition === 'nouvelle' ? 'Zone créée' : 'Zone mise à jour'}
          onSubmit={async (corps) => {
            if (edition === 'nouvelle') await api.post('/admin/zones', corps);
            else await api.put(`/admin/zones/${edition.id}`, corps);
            invalider('zones');
          }}
          onClose={() => setEdition(null)}
        />
      )}
      {villes && <DialogueVilles zone={villes} onClose={() => setVilles(null)} />}
    </>
  );
}

function DialogueVilles({ zone, onClose }: { zone: Zone; onClose: () => void }) {
  const invalider = useInvalider();
  const detail = useQuery({
    queryKey: ['zones', zone.id],
    queryFn: () => api.get<{ zone: Zone }>(`/admin/zones/${zone.id}`).then((r) => r.zone),
  });
  const libres = useQuery({
    queryKey: ['villes', 'sans-zone', zone.pays],
    queryFn: () => api.get<{ villes: { id: string; nom: string }[] }>('/admin/villes', { pays: zone.pays, sansZone: true, limit: 100 }).then((r) => r.villes),
  });
  const [ajout, setAjout] = useState<string[]>([]);

  const agir = async (methode: 'post' | 'delete', villeIds: string[]) => {
    try {
      if (methode === 'post') await api.post(`/admin/zones/${zone.id}/villes`, { villeIds });
      else await api.delete(`/admin/zones/${zone.id}/villes`, { villeIds });
      toast.success(methode === 'post' ? 'Villes rattachées' : 'Ville détachée');
      setAjout([]);
      invalider('zones', 'villes');
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <Modal title={`Villes de la zone ${zone.nom}`} onClose={onClose} large>
      <div className="section-label">Villes rattachées</div>
      {detail.isLoading ? <Loader /> : !detail.data?.villes?.length ? <p className="muted small">Aucune ville</p> : (
        <div className="chips">
          {detail.data.villes.map((v) => (
            <span key={v.id} className="chip">
              {v.nom}{' '}
              <button className="btn ghost sm" style={{ padding: 0 }} title="Détacher" onClick={() => agir('delete', [v.id])}>
                <Icon name="x" size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="section-label">Rattacher des villes sans zone ({libelle(PAYS, zone.pays)})</div>
      {libres.isLoading ? <Loader /> : !libres.data?.length ? <p className="muted small">Toutes les villes de ce pays ont une zone.</p> : (
        <>
          <div className="chips">
            {libres.data.map((v) => (
              <button key={v.id} type="button" className={`chip${ajout.includes(v.id) ? ' active' : ''}`}
                onClick={() => setAjout((a) => (a.includes(v.id) ? a.filter((x) => x !== v.id) : [...a, v.id]))}>
                {v.nom}
              </button>
            ))}
          </div>
          <button className="btn" style={{ marginTop: 12 }} disabled={!ajout.length} onClick={() => agir('post', ajout)}>
            Rattacher {ajout.length || ''} ville(s)
          </button>
        </>
      )}
    </Modal>
  );
}
