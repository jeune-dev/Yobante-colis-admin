import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import type { Liste } from '@/api/types';
import Icon from './Icon';
import { dateHeure } from '@/lib/format';
import { useInvalider } from '@/lib/hooks';
import { routeDepuisLien } from '@/lib/liens';
import type { Notification } from '@/pages/compte/NotificationsPage';

/** Cloche du bandeau : compteur de non-lues (rafraîchi chaque minute) et aperçu des dernières. */
export default function NotificationsBell() {
  const navigate = useNavigate();
  const invalider = useInvalider();
  const [ouvert, setOuvert] = useState(false);

  const compteur = useQuery({
    queryKey: ['notifications', 'non-lues'],
    queryFn: () => api.get<{ total: number }>('/client/notifications/non-lues').then((r) => r.total),
    refetchInterval: 60_000,
    retry: false,
  });
  const dernieres = useQuery({
    queryKey: ['notifications', 'apercu'],
    queryFn: () => api.get<Liste<'notifications', Notification>>('/client/notifications', { limit: 6 }).then((r) => r.notifications),
    enabled: ouvert,
  });

  const ouvrir = async (n: Notification) => {
    setOuvert(false);
    if (!n.isRead) {
      try {
        await api.patch(`/client/notifications/${n.id}/lue`, {});
        invalider('notifications');
      } catch {
        // La navigation reste possible même si le marquage échoue
      }
    }
    const route = routeDepuisLien(n.lienCible);
    if (route) navigate(route);
  };

  const total = compteur.data ?? 0;
  return (
    <div style={{ position: 'relative' }}>
      <button className="btn ghost sm" onClick={() => setOuvert((o) => !o)} title="Notifications" style={{ position: 'relative' }}>
        <Icon name="inbox" size={19} />
        {total > 0 && <span className="bell-count">{total > 99 ? '99+' : total}</span>}
      </button>
      {ouvert && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 60 }} onClick={() => setOuvert(false)} />
          <div className="bell-pop">
            <div className="bell-head">
              <strong>Notifications</strong>
              <Link to="/notifications" className="small" onClick={() => setOuvert(false)}>Tout voir</Link>
            </div>
            {!dernieres.data ? <div className="muted small" style={{ padding: 12 }}>Chargement…</div>
              : !dernieres.data.length ? <div className="muted small" style={{ padding: 12 }}>Aucune notification</div>
              : dernieres.data.map((n) => (
                <div key={n.id} className={`bell-item${n.isRead ? '' : ' non-lue'}`} onClick={() => ouvrir(n)}>
                  <div className="small" style={{ fontWeight: n.isRead ? 500 : 700 }}>{n.titre}</div>
                  <div className="small muted">{n.message}</div>
                  <div className="muted" style={{ fontSize: '0.7rem' }}>{dateHeure(n.createdAt)}</div>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
