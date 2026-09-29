import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api, avecVersion } from '@/api/client';
import type { Client, Liste } from '@/api/types';
import { estSuperAdmin, useAuth } from '@/auth/store';
import Icon from '@/components/Icon';
import { FormModal, type ChampDef } from '@/components/FormModal';
import { Badge, Card, Empty, ErrorBox, Loader, Pagination, SearchInput } from '@/components/ui';
import { ROLES, libelle } from '@/lib/labels';
import { dateHeure, nomComplet } from '@/lib/format';
import { useAction, useFiltres, useInvalider } from '@/lib/hooks';

const ROLES_ADMIN = { admin: 'Administrateur', super_admin: 'Super administrateur' };

const CHAMPS_CREATION: ChampDef[] = [
  { name: 'prenom', label: 'Prénom', required: true },
  { name: 'nom', label: 'Nom', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'telephone', label: 'Téléphone', type: 'tel', required: true, placeholder: '+221…' },
  { name: 'role', label: 'Rôle', type: 'select', options: ROLES_ADMIN, required: true },
  {
    name: 'password', label: 'Mot de passe provisoire', type: 'password', required: true,
    hint: '8 caractères min., une majuscule, un chiffre et un caractère spécial.',
  },
];

const CHAMPS_EDITION: ChampDef[] = [
  { name: 'prenom', label: 'Prénom' },
  { name: 'nom', label: 'Nom' },
  { name: 'telephone', label: 'Téléphone', type: 'tel' },
  { name: 'role', label: 'Rôle', type: 'select', options: ROLES_ADMIN, required: true },
  { name: 'isActive', label: 'Compte actif', type: 'checkbox' },
];

export default function AdminsPage() {
  const moi = useAuth((s) => s.utilisateur);
  const superAdmin = estSuperAdmin(moi);
  const invalider = useInvalider();
  const [edition, setEdition] = useState<Client | 'nouveau' | null>(null);
  const { filtres, page, set, setPage } = useFiltres({ search: '', role: '' });

  const q = useQuery({
    queryKey: ['admins', filtres, page],
    queryFn: () => api.get<Liste<'administrateurs', Client>>('/admin/admins', { ...filtres, page, limit: 20 }),
    placeholderData: keepPreviousData,
  });
  const basculer = useAction(
    (a: Client) => api.put(`/admin/admins/${a.id}`, { isActive: !a.isActive }),
    { succes: 'Compte mis à jour', invalider: ['admins'] }
  );

  return (
    <>
      <div className="toolbar">
        <SearchInput value={filtres.search} onChange={(v) => set('search', v)} placeholder="Nom, email…" />
        <select className="select" value={filtres.role} onChange={(e) => set('role', e.target.value)}>
          <option value="">Tous les rôles</option>
          {Object.entries(ROLES_ADMIN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {superAdmin && (
          <button className="btn" style={{ marginLeft: 'auto' }} onClick={() => setEdition('nouveau')}>
            <Icon name="plus" size={15} /> Nouvel administrateur
          </button>
        )}
      </div>
      {!superAdmin && (
        <div className="alert info"><Icon name="lock" size={16} /><div>Seul un super administrateur peut créer ou modifier des comptes administrateurs.</div></div>
      )}

      <ErrorBox error={q.error} />
      <Card flush>
        {q.isLoading ? <Loader /> : q.error ? null : !q.data?.administrateurs.length ? <Empty>Aucun administrateur</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Nom</th><th>Contact</th><th>Rôle</th><th>Dernière connexion</th><th>État</th><th /></tr></thead>
              <tbody>
                {q.data.administrateurs.map((a) => (
                  <tr key={a.id}>
                    <td><strong>{nomComplet(a)}</strong>{a.id === moi?.id && <span className="muted small"> (vous)</span>}</td>
                    <td className="small">{a.email}<div className="muted">{a.telephone}</div></td>
                    <td><Badge ton={a.role === 'super_admin' ? 'violet' : 'bleu'}>{libelle(ROLES, a.role)}</Badge></td>
                    <td className="small muted">{dateHeure(a.lastLoginAt)}</td>
                    <td>{a.isActive ? <Badge ton="vert">Actif</Badge> : <Badge ton="rouge">Désactivé</Badge>}</td>
                    <td>
                      {superAdmin && a.id !== moi?.id && (
                        <div className="actions">
                          <button className="btn ghost sm" onClick={() => setEdition(a)}><Icon name="pencil" size={14} /></button>
                          <button className="btn secondary sm" onClick={() => basculer.mutate(a)}>{a.isActive ? 'Désactiver' : 'Activer'}</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination info={q.data?.pagination} onPage={setPage} />
      </Card>

      {edition === 'nouveau' && (
        <FormModal
          title="Nouvel administrateur"
          champs={CHAMPS_CREATION}
          initial={{ role: 'admin' }}
          succes="Administrateur créé"
          onSubmit={async (corps) => { await api.post('/admin/admins', corps); invalider('admins'); }}
          onClose={() => setEdition(null)}
        />
      )}
      {edition && edition !== 'nouveau' && (
        <FormModal
          title={`Modifier ${nomComplet(edition)}`}
          champs={CHAMPS_EDITION}
          initial={edition as never}
          succes="Administrateur mis à jour"
          onSubmit={async (corps, { version }) => { await api.put(`/admin/admins/${edition.id}`, corps, avecVersion(version)); invalider('admins'); }}
          onClose={() => setEdition(null)}
        />
      )}
    </>
  );
}
