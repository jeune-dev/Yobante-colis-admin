import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, avecVersion } from '@/api/client';
import type { Num } from '@/api/types';
import Icon from '@/components/Icon';
import { FormModal, type ChampDef } from '@/components/FormModal';
import { Badge, Card, Empty, ErrorBox, Loader } from '@/components/ui';
import { CATEGORIES, DEVISES, MODES_TRANSPORT, OPTIONS_PAYS, PAYS, libelle } from '@/lib/labels';
import { montant, urlSure } from '@/lib/format';
import { useAction, useFiltres, useInvalider } from '@/lib/hooks';

interface Article {
  id: string;
  code: string;
  libelle: string;
  description?: string;
  categorie: string;
  modeTransport: string;
  paysDepart: string;
  paysArrivee: string;
  prixDakar: Num;
  prixAutresRegions: Num;
  devise: string;
  prixAPartirDe?: boolean;
  poidsMaxKg?: Num;
  longueurCm?: Num;
  largeurCm?: Num;
  hauteurCm?: Num;
  photoUrl?: string;
  ordreAffichage?: number;
  isActive: boolean;
}

const CHAMPS: ChampDef[] = [
  { name: 'code', label: 'Code', required: true, placeholder: 'SMARTPHONE', hint: 'Majuscules, chiffres, - et _' },
  { name: 'libelle', label: 'Libellé', required: true },
  { name: 'categorie', label: 'Catégorie', type: 'select', options: CATEGORIES, required: true },
  { name: 'modeTransport', label: 'Mode de transport', type: 'select', options: MODES_TRANSPORT, required: true },
  { name: 'paysDepart', label: 'Départ', type: 'select', options: OPTIONS_PAYS, required: true },
  { name: 'paysArrivee', label: 'Arrivée', type: 'select', options: OPTIONS_PAYS, required: true },
  { name: 'prixDakar', label: 'Prix Dakar', type: 'number', required: true },
  { name: 'prixAutresRegions', label: 'Prix autres régions', type: 'number', required: true },
  { name: 'devise', label: 'Devise', type: 'select', options: DEVISES, required: true },
  { name: 'ordreAffichage', label: "Ordre d'affichage", type: 'number', step: '1' },
  { name: 'poidsMaxKg', label: 'Poids max (kg)', type: 'number' },
  { name: 'longueurCm', label: 'Longueur (cm)', type: 'number' },
  { name: 'largeurCm', label: 'Largeur (cm)', type: 'number' },
  { name: 'hauteurCm', label: 'Hauteur (cm)', type: 'number' },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'prixAPartirDe', label: 'Afficher « à partir de » (prix ajustable à l’étude)', type: 'checkbox' },
  { name: 'isActive', label: 'Actif', type: 'checkbox' },
];

export default function GrilleTarifairePage() {
  const invalider = useInvalider();
  const [edition, setEdition] = useState<Article | 'nouveau' | null>(null);
  const [photo, setPhoto] = useState<Article | null>(null);
  const { filtres, set } = useFiltres({ categorie: '', modeTransport: '', paysDepart: '', isActive: '' });

  const q = useQuery({
    queryKey: ['articles-tarif', filtres],
    queryFn: () => api.get<{ articles: Article[] }>('/admin/articles-tarif', filtres).then((r) => r.articles),
  });
  const toggle = useAction((a: Article) => api.put(`/admin/articles-tarif/${a.id}`, { isActive: !a.isActive }), {
    succes: 'Article mis à jour',
    invalider: ['articles-tarif'],
  });
  const supprimer = useAction((a: Article) => api.delete(`/admin/articles-tarif/${a.id}`), {
    succes: 'Article retiré de la grille',
    invalider: ['articles-tarif'],
  });

  return (
    <>
      <div className="toolbar">
        <select className="select" value={filtres.categorie} onChange={(e) => set('categorie', e.target.value)}>
          <option value="">Toutes catégories</option>
          {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
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
        <button className="btn" style={{ marginLeft: 'auto' }} onClick={() => setEdition('nouveau')}>
          <Icon name="plus" size={15} /> Nouvel article
        </button>
      </div>

      <div className="alert info">
        <Icon name="tag" size={16} />
        <div>Prix forfaitaire par article : une colonne Dakar et une colonne autres régions (villes marquées « tarif Dakar »). Supprimer un article n'affecte pas les expéditions déjà enregistrées.</div>
      </div>

      <ErrorBox error={q.error} />
      <Card flush>
        {q.isLoading ? <Loader /> : q.error ? null : !q.data?.length ? <Empty>Aucun article</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th /><th>Code</th><th>Article</th><th>Catégorie</th><th>Mode</th><th>Sens</th><th className="right">Dakar</th><th className="right">Autres régions</th><th>État</th><th /></tr></thead>
              <tbody>
                {q.data.map((a) => (
                  <tr key={a.id}>
                    <td style={{ width: 48 }}>
                      {urlSure(a.photoUrl) ? <img src={urlSure(a.photoUrl)} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }} /> : null}
                    </td>
                    <td className="mono">{a.code}</td>
                    <td><strong>{a.libelle}</strong>{a.description && <div className="muted small">{a.description}</div>}</td>
                    <td className="small">{libelle(CATEGORIES, a.categorie)}</td>
                    <td>{libelle(MODES_TRANSPORT, a.modeTransport)}</td>
                    <td className="small">{libelle(PAYS, a.paysDepart)} → {libelle(PAYS, a.paysArrivee)}</td>
                    <td className="right">{a.prixAPartirDe && 'dès '}{montant(a.prixDakar, a.devise)}</td>
                    <td className="right">{a.prixAPartirDe && 'dès '}{montant(a.prixAutresRegions, a.devise)}</td>
                    <td>{a.isActive ? <Badge ton="vert">Actif</Badge> : <Badge>Inactif</Badge>}</td>
                    <td>
                      <div className="actions">
                        <button className="btn ghost sm" title="Modifier" onClick={() => setEdition(a)}><Icon name="pencil" size={14} /></button>
                        <button className="btn ghost sm" title="Photo" onClick={() => setPhoto(a)}><Icon name="image" size={14} /></button>
                        <button className="btn secondary sm" onClick={() => toggle.mutate(a)}>{a.isActive ? 'Désactiver' : 'Activer'}</button>
                        <button className="btn ghost sm" title="Supprimer" onClick={() => confirm(`Retirer ${a.libelle} de la grille ?`) && supprimer.mutate(a)}>
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
          title={edition === 'nouveau' ? 'Nouvel article' : `Modifier ${edition.libelle}`}
          champs={CHAMPS}
          initial={edition === 'nouveau'
            ? { categorie: 'colis_moyen', modeTransport: 'maritime', paysDepart: 'FR', paysArrivee: 'SN', devise: 'EUR', isActive: true }
            : (edition as never)}
          succes={edition === 'nouveau' ? 'Article ajouté à la grille' : 'Article mis à jour'}
          onSubmit={async (corps, { version }) => {
            const c = { ...corps, code: typeof corps.code === 'string' ? corps.code.toUpperCase() : corps.code };
            if (edition === 'nouveau') await api.post('/admin/articles-tarif', c);
            else await api.put(`/admin/articles-tarif/${edition.id}`, c, avecVersion(version));
            invalider('articles-tarif');
          }}
          onClose={() => setEdition(null)}
        />
      )}
      {photo && (
        <FormModal
          title={`Photo — ${photo.libelle}`}
          champs={[{ name: 'photo', label: 'Photo (JPEG ou PNG, 5 Mo max.)', type: 'file', accept: 'image/jpeg,image/png', maxMo: 5, required: true, full: true }]}
          submitLabel="Téléverser"
          succes="Photo mise à jour"
          onSubmit={async (corps) => { await api.upload(`/admin/articles-tarif/${photo.id}/photo`, corps); invalider('articles-tarif'); }}
          onClose={() => setPhoto(null)}
        />
      )}
    </>
  );
}
