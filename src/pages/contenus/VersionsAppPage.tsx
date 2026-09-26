import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import Icon from '@/components/Icon';
import { FormModal, type ChampDef } from '@/components/FormModal';
import { Badge, Card, Empty, ErrorBox, Loader } from '@/components/ui';
import { PLATEFORMES, libelle } from '@/lib/labels';
import { dateHeure } from '@/lib/format';
import { useAction, useInvalider } from '@/lib/hooks';

interface Version {
  id: string;
  plateforme: string;
  derniereVersion: string;
  versionMinimale: string;
  miseAJourForcee: boolean;
  titre?: string;
  message?: string;
  lienStore: string;
  isActive: boolean;
  updatedAt: string;
}

const CHAMPS: ChampDef[] = [
  { name: 'plateforme', label: 'Plateforme', type: 'select', options: PLATEFORMES, required: true },
  { name: 'lienStore', label: 'Lien vers le store', required: true, placeholder: 'https://play.google.com/…' },
  { name: 'derniereVersion', label: 'Dernière version', required: true, placeholder: '1.4.0', hint: 'Format X.Y.Z' },
  { name: 'versionMinimale', label: 'Version minimale acceptée', required: true, placeholder: '1.2.0', hint: 'En dessous, la mise à jour est exigée' },
  { name: 'titre', label: 'Titre du message', full: true },
  { name: 'message', label: 'Message affiché', type: 'textarea' },
  { name: 'miseAJourForcee', label: 'Mise à jour forcée (bloque l’application tant qu’elle n’est pas faite)', type: 'checkbox' },
  { name: 'isActive', label: 'Active', type: 'checkbox' },
];

export default function VersionsAppPage() {
  const invalider = useInvalider();
  const [edition, setEdition] = useState<Version | 'nouvelle' | null>(null);
  const q = useQuery({
    queryKey: ['app-version'],
    queryFn: () => api.get<{ versions: Version[] }>('/admin/app-version').then((r) => r.versions),
  });
  const supprimer = useAction((v: Version) => api.delete(`/admin/app-version/${v.id}`), {
    succes: 'Configuration supprimée',
    invalider: ['app-version'],
  });

  return (
    <>
      <div className="alert info">
        <Icon name="smartphone" size={16} />
        <div>L'application mobile compare sa version à ces réglages au démarrage et propose ou impose la mise à jour.</div>
      </div>
      <div className="toolbar">
        <button className="btn" style={{ marginLeft: 'auto' }} onClick={() => setEdition('nouvelle')}>
          <Icon name="plus" size={15} /> Nouvelle configuration
        </button>
      </div>
      <ErrorBox error={q.error} />
      <Card flush>
        {q.isLoading ? <Loader /> : !q.data?.length ? <Empty>Aucune configuration de version</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Plateforme</th><th>Dernière</th><th>Minimale</th><th>Mise à jour</th><th>Message</th><th>Modifiée</th><th>État</th><th /></tr></thead>
              <tbody>
                {q.data.map((v) => (
                  <tr key={v.id}>
                    <td><strong>{libelle(PLATEFORMES, v.plateforme)}</strong></td>
                    <td className="mono">{v.derniereVersion}</td>
                    <td className="mono">{v.versionMinimale}</td>
                    <td>{v.miseAJourForcee ? <Badge ton="rouge">Forcée</Badge> : <Badge>Conseillée</Badge>}</td>
                    <td className="small">{v.titre}<div className="muted">{v.message}</div></td>
                    <td className="small muted">{dateHeure(v.updatedAt)}</td>
                    <td>{v.isActive ? <Badge ton="vert">Active</Badge> : <Badge>Inactive</Badge>}</td>
                    <td>
                      <div className="actions">
                        <button className="btn ghost sm" title="Modifier" onClick={() => setEdition(v)}><Icon name="pencil" size={14} /></button>
                        <button className="btn ghost sm" title="Supprimer" onClick={() => confirm('Supprimer cette configuration ?') && supprimer.mutate(v)}>
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
          title={edition === 'nouvelle' ? 'Nouvelle configuration de version' : `Version ${libelle(PLATEFORMES, edition.plateforme)}`}
          champs={CHAMPS}
          initial={edition === 'nouvelle' ? { plateforme: 'android', miseAJourForcee: false, isActive: true } : (edition as never)}
          succes="Configuration enregistrée"
          onSubmit={async (corps) => {
            if (edition === 'nouvelle') await api.post('/admin/app-version', corps);
            else await api.put(`/admin/app-version/${edition.id}`, corps);
            invalider('app-version');
          }}
          onClose={() => setEdition(null)}
        />
      )}
    </>
  );
}
