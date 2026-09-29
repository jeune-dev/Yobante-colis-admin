import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, avecVersion } from '@/api/client';
import type { Num } from '@/api/types';
import Icon from '@/components/Icon';
import { FormModal, type ChampDef } from '@/components/FormModal';
import { Badge, Card, Empty, ErrorBox, Loader, Modal, toast } from '@/components/ui';
import { CATEGORIES_COURT, CATEGORIES, DEVISES, TYPES_EMBALLAGE_CATALOGUE, libelle } from '@/lib/labels';
import { montant, urlSure } from '@/lib/format';
import { useAction, useFiltres, useInvalider } from '@/lib/hooks';

interface Emballage {
  id: string;
  code: string;
  libelle: string;
  description?: string;
  type: string;
  longueurCm?: Num;
  largeurCm?: Num;
  hauteurCm?: Num;
  capaciteKg?: Num;
  prix: Num;
  devise: string;
  photos: { url: string; publicId: string }[];
  categoriesEligibles: string[];
  stock?: number | null;
  ordreAffichage?: number;
  isActive: boolean;
}

const CHAMPS: ChampDef[] = [
  { name: 'code', label: 'Code', required: true, placeholder: 'BARIGOT-60' },
  { name: 'libelle', label: 'Libellé', required: true },
  { name: 'type', label: 'Type', type: 'select', options: TYPES_EMBALLAGE_CATALOGUE, required: true },
  { name: 'prix', label: 'Prix', type: 'number', required: true },
  { name: 'devise', label: 'Devise', type: 'select', options: DEVISES, required: true },
  { name: 'stock', label: 'Stock', type: 'number', step: '1', hint: 'Vide = stock non suivi' },
  { name: 'longueurCm', label: 'Longueur (cm)', type: 'number' },
  { name: 'largeurCm', label: 'Largeur (cm)', type: 'number' },
  { name: 'hauteurCm', label: 'Hauteur (cm)', type: 'number' },
  { name: 'capaciteKg', label: 'Capacité (kg)', type: 'number' },
  { name: 'ordreAffichage', label: "Ordre d'affichage", type: 'number', step: '1' },
  { name: 'categoriesEligibles', label: 'Catégories de colis éligibles', type: 'multiselect', options: CATEGORIES },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'isActive', label: 'Actif', type: 'checkbox' },
];

export default function EmballagesPage() {
  const invalider = useInvalider();
  const [edition, setEdition] = useState<Emballage | 'nouveau' | null>(null);
  const [photos, setPhotos] = useState<Emballage | null>(null);
  const { filtres, set } = useFiltres({ type: '', isActive: '' });

  const q = useQuery({
    queryKey: ['emballages', filtres],
    queryFn: () => api.get<{ emballages: Emballage[] }>('/admin/emballages', filtres).then((r) => r.emballages),
  });
  const toggle = useAction((e: Emballage) => api.put(`/admin/emballages/${e.id}`, { isActive: !e.isActive }), {
    succes: 'Emballage mis à jour',
    invalider: ['emballages'],
  });
  const supprimer = useAction((e: Emballage) => api.delete(`/admin/emballages/${e.id}`), { succes: 'Emballage supprimé', invalider: ['emballages'] });

  return (
    <>
      <div className="toolbar">
        <select className="select" value={filtres.type} onChange={(e) => set('type', e.target.value)}>
          <option value="">Tous types</option>
          {Object.entries(TYPES_EMBALLAGE_CATALOGUE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn" style={{ marginLeft: 'auto' }} onClick={() => setEdition('nouveau')}>
          <Icon name="plus" size={15} /> Nouvel emballage
        </button>
      </div>

      <ErrorBox error={q.error} />
      <Card flush>
        {q.isLoading ? <Loader /> : q.error ? null : !q.data?.length ? <Empty>Aucun emballage</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th /><th>Code</th><th>Emballage</th><th>Type</th><th>Dimensions</th><th>Catégories</th><th className="right">Prix</th><th>Stock</th><th>État</th><th /></tr></thead>
              <tbody>
                {q.data.map((e) => (
                  <tr key={e.id}>
                    <td style={{ width: 48 }}>{urlSure(e.photos?.[0]?.url) && <img src={urlSure(e.photos?.[0]?.url)} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }} />}</td>
                    <td className="mono">{e.code}</td>
                    <td><strong>{e.libelle}</strong>{e.description && <div className="muted small">{e.description}</div>}</td>
                    <td>{libelle(TYPES_EMBALLAGE_CATALOGUE, e.type)}</td>
                    <td className="small">
                      {e.longueurCm ? `${Number(e.longueurCm)}×${Number(e.largeurCm)}×${Number(e.hauteurCm)} cm` : '—'}
                      {e.capaciteKg && <div className="muted">{Number(e.capaciteKg)} kg max</div>}
                    </td>
                    <td className="small">{e.categoriesEligibles?.map((c) => CATEGORIES_COURT[c] ?? c).join(', ') || 'Toutes'}</td>
                    <td className="right">{montant(e.prix, e.devise)}</td>
                    <td>
                      {e.stock == null ? <span className="muted small">Non suivi</span>
                        : e.stock === 0 ? <Badge ton="rouge">Rupture</Badge>
                        : e.stock < 5 ? <Badge ton="orange">{e.stock}</Badge> : e.stock}
                    </td>
                    <td>{e.isActive ? <Badge ton="vert">Actif</Badge> : <Badge>Inactif</Badge>}</td>
                    <td>
                      <div className="actions">
                        <button className="btn ghost sm" title="Modifier" onClick={() => setEdition(e)}><Icon name="pencil" size={14} /></button>
                        <button className="btn ghost sm" title="Photos" onClick={() => setPhotos(e)}><Icon name="image" size={14} /></button>
                        <button className="btn secondary sm" onClick={() => toggle.mutate(e)}>{e.isActive ? 'Désactiver' : 'Activer'}</button>
                        <button className="btn ghost sm" title="Supprimer" onClick={() => confirm(`Supprimer ${e.libelle} ?`) && supprimer.mutate(e)}>
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
          title={edition === 'nouveau' ? 'Nouvel emballage' : `Modifier ${edition.libelle}`}
          champs={CHAMPS}
          initial={edition === 'nouveau' ? { type: 'contenant', devise: 'EUR', isActive: true, categoriesEligibles: ['colis_moyen', 'colis_xxl'] } : (edition as never)}
          succes={edition === 'nouveau' ? 'Emballage ajouté' : 'Emballage mis à jour'}
          onSubmit={async (corps, { version }) => {
            const c: Record<string, unknown> = { ...corps, code: typeof corps.code === 'string' ? corps.code.toUpperCase() : corps.code };
            if (Array.isArray(c.categoriesEligibles) && !c.categoriesEligibles.length) delete c.categoriesEligibles;
            if (edition === 'nouveau') await api.post('/admin/emballages', c);
            else await api.put(`/admin/emballages/${edition.id}`, c, avecVersion(version));
            invalider('emballages', 'dashboard');
          }}
          onClose={() => setEdition(null)}
        />
      )}
      {photos && <DialoguePhotos emballage={q.data?.find((e) => e.id === photos.id) ?? photos} onClose={() => setPhotos(null)} />}
    </>
  );
}

function DialoguePhotos({ emballage, onClose }: { emballage: Emballage; onClose: () => void }) {
  const invalider = useInvalider();
  const [fichiers, setFichiers] = useState<File[]>([]);
  const [envoi, setEnvoi] = useState(false);

  const televerser = async () => {
    if (!fichiers.length) return;
    setEnvoi(true);
    try {
      await api.upload(`/admin/emballages/${emballage.id}/photos`, { photos: fichiers });
      toast.success('Photos ajoutées');
      setFichiers([]);
      invalider('emballages');
    } catch (e) {
      toast.error(e);
    } finally {
      setEnvoi(false);
    }
  };
  const retirer = async (publicId: string) => {
    try {
      await api.delete(`/admin/emballages/${emballage.id}/photos`, { publicId });
      toast.success('Photo retirée');
      invalider('emballages');
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <Modal large title={`Photos — ${emballage.libelle}`} onClose={onClose}>
      {!emballage.photos?.length ? <p className="muted small">Aucune photo</p> : (
        <div className="photos">
          {emballage.photos.map((p) => (
            <div key={p.publicId} style={{ position: 'relative' }}>
              <img src={urlSure(p.url)} alt="" />
              <button
                className="btn danger sm"
                style={{ position: 'absolute', top: 4, right: 4 }}
                aria-label="Supprimer la photo"
                onClick={() => confirm('Supprimer définitivement cette photo ?') && retirer(p.publicId)}
              >
                <Icon name="x" size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="actions" style={{ marginTop: 14, alignItems: 'center' }}>
        <input className="input" type="file" multiple accept="image/jpeg,image/png" style={{ maxWidth: 360 }}
          onChange={(e) => setFichiers(Array.from(e.target.files ?? []).slice(0, 6))} />
        <button className="btn" disabled={!fichiers.length || envoi} onClick={televerser}>Ajouter {fichiers.length || ''} photo(s)</button>
      </div>
    </Modal>
  );
}
