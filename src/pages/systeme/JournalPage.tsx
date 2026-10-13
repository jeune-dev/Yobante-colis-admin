import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { Liste, Personne } from '@/api/types';
import { Badge, Card, Empty, ErrorBox, Loader, Pagination, SearchInput } from '@/components/ui';
import { ENTITES_JOURNAL, ROLES, libelle, libelleAction } from '@/lib/labels';
import { dateHeure, nomComplet } from '@/lib/format';
import { useFiltres } from '@/lib/hooks';
import ResponsiveTable from '@/components/ResponsiveTable';

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

const resume = (d: Record<string, unknown>) =>
  Object.entries(d)
    .filter(([, v]) => v !== null && v !== undefined && v !== '' && typeof v !== 'object')
    .map(([k, v]) => `${k} : ${typeof v === 'boolean' ? (v ? 'oui' : 'non') : v}`)
    .join(' · ') || '—';

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
          {Object.entries(ENTITES_JOURNAL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <input className="input" type="date" value={filtres.dateDebut} onChange={(e) => set('dateDebut', e.target.value)} />
        <span className="muted">→</span>
        <input className="input" type="date" value={filtres.dateFin} onChange={(e) => set('dateFin', e.target.value)} />
      </div>

      <ErrorBox error={q.error} />
      <Card flush>
        {q.isLoading ? <Loader /> : !q.data?.activites.length ? <Empty>Aucune activité</Empty> : (
          <ResponsiveTable
            lignes={q.data.activites}
            cleLigne={(a) => a.id}
            colonnes={[
              { cle: 'date', titre: 'Date', className: 'small muted nowrap', mobile: 'soustitre', cellule: (a) => dateHeure(a.createdAt) },
              { cle: 'auteur', titre: 'Auteur', cellule: (a) => <>
                {nomComplet(a.User)}
                {a.User?.role && <div><Badge>{libelle(ROLES, a.User.role)}</Badge></div>}
              </> },
              { cle: 'action', titre: 'Action', mobile: 'titre', cellule: (a) => <span title={a.action}>{libelleAction(a.action)}</span> },
              { cle: 'objet', titre: 'Objet', className: 'small', cellule: (a) => (a.entite ? (ENTITES_JOURNAL[a.entite] ?? a.entite) : '—') },
              { cle: 'details', titre: 'Détails', className: 'small muted texte-limite', cellule: (a) => (a.details && Object.keys(a.details).length ? resume(a.details) : '—') },
            ]}
          />
        )}
        <Pagination info={q.data?.pagination} onPage={setPage} />
      </Card>
    </>
  );
}
