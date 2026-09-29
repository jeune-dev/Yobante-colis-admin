import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import type { Liste } from '@/api/types';
import Icon from '@/components/Icon';
import { Badge, Card, Empty, ErrorBox, Loader, Pagination, toast, ligneCliquable } from '@/components/ui';
import { dateHeure } from '@/lib/format';
import { useInvalider } from '@/lib/hooks';
import { routeDepuisLien } from '@/lib/liens';

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
        <button className="btn secondary" style={{ marginLeft: 'auto' }}
          onClick={() => agir(() => api.patch('/client/notifications/toutes-lues', {}))}>
          <Icon name="check" size={15} /> Tout marquer comme lu
        </button>
      </div>
      <ErrorBox error={q.error} />
      <Card flush>
        {q.isLoading ? <Loader /> : q.error ? null : !q.data?.notifications.length ? <Empty>Aucune notification</Empty> : (
          <table>
            <tbody>
              {q.data.notifications.map((n) => (
                <tr key={n.id} className="cliquable" {...ligneCliquable(() => ouvrir(n))} style={{ fontWeight: n.isRead ? 400 : 600 }}>
                  <td style={{ width: 14 }}>{!n.isRead && <span className="dot" />}</td>
                  <td>
                    {n.titre} {n.niveau === 'critique' && <Badge ton="rouge">Urgent</Badge>}
                    <div className="small muted" style={{ fontWeight: 400 }}>{n.message}</div>
                  </td>
                  <td className="small muted" style={{ whiteSpace: 'nowrap' }}>{dateHeure(n.createdAt)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn ghost sm"
                      title="Supprimer"
                      aria-label="Supprimer la notification"
                      onClick={() => confirm('Supprimer cette notification ?') && agir(() => api.delete(`/client/notifications/${n.id}`))}
                    >
                      <Icon name="trash-2" size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination info={q.data?.pagination} onPage={setPage} />
      </Card>
    </>
  );
}
