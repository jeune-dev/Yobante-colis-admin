import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import type { Client, Liste } from '@/api/types';
import { Badge, Card, Empty, ErrorBox, Loader, Pagination, SearchInput, ligneCliquable } from '@/components/ui';
import { PAYS, libelle } from '@/lib/labels';
import { date, nomComplet } from '@/lib/format';
import { useFiltres } from '@/lib/hooks';
import { D } from '@/lib/routes';

export default function ClientsPage() {
  const navigate = useNavigate();
  const { filtres, page, set, setPage } = useFiltres({ search: '', pays: '', typeCompte: '', isActive: '' });

  const q = useQuery({
    queryKey: ['clients', filtres, page],
    queryFn: () => api.get<Liste<'utilisateurs', Client>>('/admin/users', { ...filtres, page, limit: 20 }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <div className="toolbar">
        <SearchInput value={filtres.search} onChange={(v) => set('search', v)} placeholder="Nom, email, téléphone…" />
        <select className="select" value={filtres.pays} onChange={(e) => set('pays', e.target.value)}>
          <option value="">Tous pays</option>
          <option value="FR">France</option>
          <option value="SN">Sénégal</option>
        </select>
        <select className="select" value={filtres.typeCompte} onChange={(e) => set('typeCompte', e.target.value)}>
          <option value="">Tous comptes</option>
          <option value="particulier">Particulier</option>
          <option value="entreprise">Professionnel</option>
        </select>
        <select className="select" value={filtres.isActive} onChange={(e) => set('isActive', e.target.value)}>
          <option value="">Actifs et suspendus</option>
          <option value="true">Actifs</option>
          <option value="false">Suspendus</option>
        </select>
      </div>

      <ErrorBox error={q.error} />
      <Card flush>
        {q.isLoading ? <Loader /> : q.error ? null : !q.data?.utilisateurs.length ? <Empty>Aucun client</Empty> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Client</th><th>Contact</th><th>Pays</th><th>Compte</th><th>État</th><th>Inscrit le</th></tr>
              </thead>
              <tbody>
                {q.data.utilisateurs.map((u) => (
                  <tr key={u.id} className="cliquable" {...ligneCliquable(() => navigate(`${D.client}/${u.id}`))}>
                    <td>
                      <strong>{nomComplet(u)}</strong>
                      {u.raisonSociale && <div className="muted small">{u.raisonSociale}</div>}
                    </td>
                    <td className="small">{u.email}<div className="muted">{u.telephone}</div></td>
                    <td>{libelle(PAYS, u.pays)}</td>
                    <td>{u.typeCompte === 'entreprise' ? <Badge ton="violet">Pro</Badge> : <Badge>Particulier</Badge>}</td>
                    <td>{u.isActive ? <Badge ton="vert">Actif</Badge> : <Badge ton="rouge">Suspendu</Badge>}</td>
                    <td className="small muted">{date(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination info={q.data?.pagination} onPage={setPage} />
      </Card>
    </>
  );
}
