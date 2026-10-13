import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import type { Liste } from '@/api/types';
import Icon from '@/components/Icon';
import { Badge, Card, Empty, ErrorBox, Loader, Pagination, toast } from '@/components/ui';
import { dateHeure } from '@/lib/format';
import { useInvalider } from '@/lib/hooks';
import { routeDepuisLien } from '@/lib/liens';
import ResponsiveTable from '@/components/ResponsiveTable';

export interface Notification {
  id: string;
  titre: string;
  message: string;
  type?: string;
  niveau?: string;
  isRead: boolean;
  lienCible?: string;
  createdAt: string;
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const invalider = useInvalider();
  const [page, setPage] = useState(1);

  const q = useQuery({
    queryKey: ['notifications', page],
    queryFn: () => api.get<Liste<'notifications', Notification>>('/client/notifications', { page, limit: 20 }),
    placeholderData: keepPreviousData,
  });

  const agir = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      invalider('notifications');
    } catch (e) {
      toast.error(e);
    }
  };
  const ouvrir = async (n: Notification) => {
    if (!n.isRead) await agir(() => api.patch(`/client/notifications/${n.id}/lue`, {}));
    const route = routeDepuisLien(n.lienCible);
    if (route) navigate(route);
  };

  return (
    <>
      <div className="toolbar">
        <button className="btn secondary pousser"
          onClick={() => agir(() => api.patch('/client/notifications/toutes-lues', {}))}>
          <Icon name="check" size={15} /> Tout marquer comme lu
        </button>
      </div>
      <ErrorBox error={q.error} />
      <Card flush>
        {q.isLoading ? <Loader /> : !q.data?.notifications.length ? <Empty>Aucune notification</Empty> : (
          <ResponsiveTable
            sansEntete
            lignes={q.data.notifications}
            cleLigne={(n) => n.id}
            onLigne={ouvrir}
            classeLigne={(n) => (n.isRead ? undefined : 'non-lue')}
            colonnes={[
              { cle: 'pastille', mobile: 'masque', className: 'col-pastille', cellule: (n) => !n.isRead && <span className="dot" /> },
              { cle: 'notification', mobile: 'titre', cellule: (n) => <>
                {n.titre} {n.niveau === 'critique' && <Badge ton="rouge">Urgent</Badge>}
                <div className="small muted message-notif">{n.message}</div>
              </> },
              { cle: 'date', mobile: 'soustitre', className: 'small muted nowrap', cellule: (n) => dateHeure(n.createdAt) },
              { cle: 'actions', cellule: (n) => (
                <button className="btn ghost sm" title="Supprimer" aria-label="Supprimer" onClick={() => agir(() => api.delete(`/client/notifications/${n.id}`))}>
                  <Icon name="trash-2" size={14} />
                </button>
              ) },
            ]}
          />
        )}
        <Pagination info={q.data?.pagination} onPage={setPage} />
      </Card>
    </>
  );
}
