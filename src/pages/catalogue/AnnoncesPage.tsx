import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, avecVersion } from '@/api/client';
import Icon from '@/components/Icon';
import { FormModal, type ChampDef } from '@/components/FormModal';
import { Badge, Card, Empty, ErrorBox, Loader, StatutBadge } from '@/components/ui';
import { EMPLACEMENTS_ANNONCE, NIVEAUX_ANNONCE, libelle } from '@/lib/labels';
import { dateHeure, urlSure } from '@/lib/format';
import { useAction, useFiltres, useInvalider } from '@/lib/hooks';

interface Annonce {
  id: string;
  titre: string;
  message: string;
  emplacement: string;
  niveau: string;
  lienUrl?: string;
  lienLibelle?: string;
  imageUrl?: string;
  dateDebut?: string;
  dateFin?: string;
  priorite: number;
  isActive: boolean;
}

const CHAMPS: ChampDef[] = [
  { name: 'titre', label: 'Titre', required: true, full: true },
  { name: 'message', label: 'Message', type: 'textarea', required: true },
  { name: 'emplacement', label: 'Emplacement', type: 'select', options: EMPLACEMENTS_ANNONCE, required: true },
  { name: 'niveau', label: 'Niveau', type: 'select', options: Object.fromEntries(Object.entries(NIVEAUX_ANNONCE).map(([k, v]) => [k, v.label])), required: true },
  { name: 'lienUrl', label: 'Lien (URL)', placeholder: 'https://…' },
  { name: 'lienLibelle', label: 'Texte du lien' },
  { name: 'dateDebut', label: 'Affichée à partir du', type: 'datetime-local' },
  { name: 'dateFin', label: "Affichée jusqu'au", type: 'datetime-local' },
  { name: 'priorite', label: 'Priorité (0–100)', type: 'number', step: '1' },
  { name: 'isActive', label: 'Active', type: 'checkbox' },
];

// Les dates saisies en heure locale sont envoyées en ISO (UTC)
const versIso = (corps: Record<string, unknown>) => {
  // Le lien est affiché tel quel dans les applications clientes : http(s) uniquement
  if (typeof corps.lienUrl === 'string' && !/^https?:\/\//i.test(corps.lienUrl)) {
    throw new Error('Le lien doit commencer par http:// ou https://');
  }
  for (const k of ['dateDebut', 'dateFin']) {
    if (typeof corps[k] === 'string') corps[k] = new Date(corps[k] as string).toISOString();
  }
  return corps;
};

export default function AnnoncesPage() {
  const invalider = useInvalider();
  const [edition, setEdition] = useState<Annonce | 'nouvelle' | null>(null);
  const [image, setImage] = useState<Annonce | null>(null);
  const { filtres, set } = useFiltres({ emplacement: '', isActive: '' });

  const q = useQuery({
    queryKey: ['annonces', filtres],
    queryFn: () => api.get<{ annonces: Annonce[] }>('/admin/annonces', filtres).then((r) => r.annonces),
  });
  const toggle = useAction((a: Annonce) => api.put(`/admin/annonces/${a.id}`, { isActive: !a.isActive }), {
    succes: 'Annonce mise à jour',
    invalider: ['annonces'],
  });
  const supprimer = useAction((a: Annonce) => api.delete(`/admin/annonces/${a.id}`), { succes: 'Annonce supprimée', invalider: ['annonces'] });

  return (
    <>
      <div className="alert info">
        <Icon name="message-square" size={16} />
        <div>Annonces affichées sur l'accueil de l'application client (bandeau, bloc d'accueil ou fenêtre).</div>
      </div>
      <div className="toolbar">
        <select className="select" value={filtres.emplacement} onChange={(e) => set('emplacement', e.target.value)}>
          <option value="">Tous emplacements</option>
          {Object.entries(EMPLACEMENTS_ANNONCE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="select" value={filtres.isActive} onChange={(e) => set('isActive', e.target.value)}>
          <option value="">Actives et inactives</option>
          <option value="true">Actives</option>
          <option value="false">Inactives</option>
        </select>
        <button className="btn" style={{ marginLeft: 'auto' }} onClick={() => setEdition('nouvelle')}>
          <Icon name="plus" size={15} /> Nouvelle annonce
        </button>
      </div>

      <ErrorBox error={q.error} />
      <Card flush>
        {q.isLoading ? <Loader /> : q.error ? null : !q.data?.length ? <Empty>Aucune annonce</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th /><th>Annonce</th><th>Emplacement</th><th>Niveau</th><th>Période</th><th>Priorité</th><th>État</th><th /></tr></thead>
              <tbody>
                {q.data.map((a) => (
                  <tr key={a.id}>
                    <td style={{ width: 60 }}>{urlSure(a.imageUrl) && <img src={urlSure(a.imageUrl)} alt="" style={{ width: 52, height: 36, objectFit: 'cover', borderRadius: 6 }} />}</td>
                    <td>
                      <strong>{a.titre}</strong>
                      <div className="muted small" style={{ maxWidth: 420 }}>{a.message.length > 140 ? `${a.message.slice(0, 140)}…` : a.message}</div>
                    </td>
                    <td>{libelle(EMPLACEMENTS_ANNONCE, a.emplacement)}</td>
                    <td><StatutBadge table={NIVEAUX_ANNONCE} valeur={a.niveau} /></td>
                    <td className="small">{a.dateDebut || a.dateFin ? `${dateHeure(a.dateDebut)} → ${dateHeure(a.dateFin)}` : 'Permanente'}</td>
                    <td>{a.priorite}</td>
                    <td>{a.isActive ? <Badge ton="vert">Active</Badge> : <Badge>Inactive</Badge>}</td>
                    <td>
                      <div className="actions">
                        <button className="btn ghost sm" title="Modifier" onClick={() => setEdition(a)}><Icon name="pencil" size={14} /></button>
                        <button className="btn ghost sm" title="Image" onClick={() => setImage(a)}><Icon name="image" size={14} /></button>
                        <button className="btn secondary sm" onClick={() => toggle.mutate(a)}>{a.isActive ? 'Désactiver' : 'Activer'}</button>
                        <button className="btn ghost sm" title="Supprimer" onClick={() => confirm(`Supprimer « ${a.titre} » ?`) && supprimer.mutate(a)}>
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
          title={edition === 'nouvelle' ? 'Nouvelle annonce' : `Modifier « ${edition.titre} »`}
          champs={CHAMPS}
          initial={edition === 'nouvelle' ? { emplacement: 'accueil', niveau: 'info', priorite: 0, isActive: true } : (edition as never)}
          succes={edition === 'nouvelle' ? 'Annonce publiée' : 'Annonce mise à jour'}
          onSubmit={async (corps, { version }) => {
            if (edition === 'nouvelle') await api.post('/admin/annonces', versIso(corps));
            else await api.put(`/admin/annonces/${edition.id}`, versIso(corps), avecVersion(version));
            invalider('annonces');
          }}
          onClose={() => setEdition(null)}
        />
      )}
      {image && (
        <FormModal
          title={`Image — ${image.titre}`}
          champs={[{ name: 'image', label: 'Image (JPEG ou PNG, 5 Mo max.)', type: 'file', accept: 'image/jpeg,image/png', maxMo: 5, required: true, full: true }]}
          submitLabel="Téléverser"
          succes="Image mise à jour"
          onSubmit={async (corps) => { await api.upload(`/admin/annonces/${image.id}/image`, corps); invalider('annonces'); }}
          onClose={() => setImage(null)}
        />
      )}
    </>
  );
}
