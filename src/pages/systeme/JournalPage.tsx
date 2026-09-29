import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { Liste, Personne } from '@/api/types';
import { Badge, Card, Empty, ErrorBox, Loader, Pagination, SearchInput } from '@/components/ui';
import { ROLES, libelle } from '@/lib/labels';
import { dateHeure, nomComplet } from '@/lib/format';
import { useFiltres } from '@/lib/hooks';

interface Activite {
  id: string;
  action: string;
  entite?: string;
  entiteId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
  User?: Personne;
}

export default function JournalPage() {
  const { filtres, page, set, setPage } = useFiltres({ action: '', entite: '', dateDebut: '', dateFin: '' });

  const q = useQuery({
    queryKey: ['journal', filtres, page],
    queryFn: () => api.get<Liste<'activites', Activite>>('/admin/activity-logs', { ...filtres, page, limit: 30 }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <div className="toolbar">
        <SearchInput value={filtres.action} onChange={(v) => set('action', v)} placeholder="Action (ex. colis, facture…)" />
        <select className="select" value={filtres.entite} onChange={(e) => set('entite', e.target.value)}>
          <option value="">Tous objets</option>
          {['Colis', 'Facture', 'Paiement', 'User', 'Rotation', 'Reclamation', 'PointCollecte', 'Tarif', 'ParametreSysteme'].map((x) => (
            <option key={x} value={x}>{x}</option>
          ))}
        </select>
        <input className="input" type="date" value={filtres.dateDebut} onChange={(e) => set('dateDebut', e.target.value)} />
        <span className="muted">→</span>
        <input className="input" type="date" value={filtres.dateFin} onChange={(e) => set('dateFin', e.target.value)} />
      </div>

      <ErrorBox error={q.error} />
      <Card flush>
        {q.isLoading ? <Loader /> : q.error ? null : !q.data?.activites.length ? <Empty>Aucune activité</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Auteur</th><th>Action</th><th>Objet</th><th>Détails</th></tr></thead>
              <tbody>
                {q.data.activites.map((a) => (
                  <tr key={a.id}>
                    <td className="small muted" style={{ whiteSpace: 'nowrap' }}>{dateHeure(a.createdAt)}</td>
                    <td>
                      {nomComplet(a.User)}
                      {a.User?.role && <div><Badge>{libelle(ROLES, a.User.role)}</Badge></div>}
                    </td>
                    <td className="mono">{a.action}</td>
                    <td className="small">{a.entite ?? '—'}</td>
                    <td className="small muted" style={{ maxWidth: 380, wordBreak: 'break-word' }}>
                      {a.details && Object.keys(a.details).length ? JSON.stringify(a.details) : '—'}
                    </td>
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
