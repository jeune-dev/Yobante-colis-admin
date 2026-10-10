import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import type { Client, Colis, Personne } from '@/api/types';

import { Badge, Card, Empty, ErrorBox, Loader, Stat, StatutBadge } from '@/components/ui';
import { PAYS, STATUTS_COLIS, libelle } from '@/lib/labels';
import { date, dateHeure, montant, nomComplet } from '@/lib/format';

interface PointsAttention {
  colisEnRetard: { id: string; reference: string; dateLivraisonEstimee?: string }[];
  colisEnSouffrance: { id: string; reference: string; dateLimiteRetrait?: string }[];
}

interface Activite { id: string; action: string; createdAt: string; User?: Personne }

interface Stats {
  clients: { total: number; actifs: number; nouveauxCeMois: number };
  colis: {
    total: number;
    parStatut: { statut: string; total: number }[];
    enRetard: number;
    enSouffrance: number;
    nouveauxAujourdhui: number;
    nouveauxCeMois: number;
    tauxLivraison: number;
  };
  chiffreAffaires: { devise: string; encaisse: number }[];
  alertes: { reclamationsOuvertes: number; enlevementsEnAttente: number };
}

interface Kpis {
  etude: { aEtudier: number; etudeEnRetard: number; propositionsEnAttente: number };
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const stats = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => api.get<{ stats: Stats }>('/admin/dashboard/stats').then((r) => r.stats),
  });
  const kpis = useQuery({
    queryKey: ['dashboard', 'kpis'],
    queryFn: () => api.get<{ kpis: Kpis }>('/admin/dashboard/kpis').then((r) => r.kpis),
  });
  const derniers = useQuery({
    queryKey: ['dashboard', 'derniers-colis'],
    queryFn: () =>
      api.get<{ colis: Colis[] }>('/admin/dashboard/derniers-colis', { limit: 8 }).then((r) => r.colis),
  });

  const attention = useQuery({
    queryKey: ['dashboard', 'points-attention'],
    queryFn: () =>
      api.get<{ pointsAttention: PointsAttention }>('/admin/dashboard/points-attention', { limit: 8 }).then((r) => r.pointsAttention),
  });
  const activites = useQuery({
    queryKey: ['dashboard', 'activites'],
    queryFn: () => api.get<{ activites: Activite[] }>('/admin/dashboard/activites', { limit: 10 }).then((r) => r.activites),
  });
  const nouveauxClients = useQuery({
    queryKey: ['dashboard', 'derniers-utilisateurs'],
    queryFn: () => api.get<{ utilisateurs: Client[] }>('/admin/dashboard/derniers-utilisateurs', { limit: 6 }).then((r) => r.utilisateurs),
  });

  if (stats.isLoading) return <Loader />;
  if (stats.error) return <ErrorBox error={stats.error} />;
  const s = stats.data!;
  const etude = kpis.data?.etude;
  const incidents = s.colis.parStatut.find((p) => p.statut === 'incident')?.total ?? 0;
  const max = Math.max(1, ...s.colis.parStatut.map((p) => p.total));

  return (
    <>
      <div className="stats">
        <Stat icon="package" value={s.colis.total} label="Colis au total" hint={`+${s.colis.nouveauxAujourdhui} aujourd'hui · +${s.colis.nouveauxCeMois} ce mois`} onClick={() => navigate('/colis')} />
        <Stat icon="clipboard-list" ton="orange" value={etude?.aEtudier ?? '—'} label="Demandes à étudier" hint={etude ? `${etude.etudeEnRetard} en retard · ${etude.propositionsEnAttente} devis en attente` : undefined} onClick={() => navigate('/colis?aEtudier=true')} />
        <Stat icon="alert-triangle" ton="rouge" value={s.colis.enRetard} label="Colis en retard" hint={`${s.colis.enSouffrance} en souffrance au retrait`} onClick={() => navigate('/colis?enRetard=true')} />
        <Stat icon="check-circle" ton="vert" value={`${s.colis.tauxLivraison} %`} label="Taux de livraison" hint="Colis au statut « Livré » / total des colis" />
        <Stat icon="users" ton="violet" value={s.clients.total} label="Clients" hint={`${s.clients.actifs} actifs · +${s.clients.nouveauxCeMois} ce mois`} />
        <Stat icon="coins" ton="cyan" value={s.chiffreAffaires.map((c) => montant(c.encaisse, c.devise)).join(' · ') || '—'} label="Encaissé" />
        <Stat icon="life-buoy" ton="orange" value={s.alertes.reclamationsOuvertes} label="Réclamations ouvertes" />
        <Stat icon="truck" ton="bleu" value={s.alertes.enlevementsEnAttente} label="Enlèvements en attente" />
      </div>

      <div className="grid grid-main-side">
        <Card title="Dernières expéditions" flush>
          {derniers.isLoading ? (
            <Loader />
          ) : !derniers.data?.length ? (
            <Empty>Aucune expédition</Empty>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Référence</th><th>Client</th><th>Trajet</th><th>Statut</th><th>Créé le</th></tr>
                </thead>
                <tbody>
                  {derniers.data.map((c) => (
                    <tr key={c.id} className="cliquable" onClick={() => navigate(`/colis/${c.id}`)}>
                      <td className="mono">{c.reference}</td>
                      <td>{c.client ? `${c.client.prenom} ${c.client.nom}` : c.expediteurNom}</td>
                      <td className="small">{c.villeDepart?.nom ?? c.paysDepart} → {c.villeArrivee?.nom ?? c.paysArrivee}</td>
                      <td><StatutBadge table={STATUTS_COLIS} valeur={c.statut} /></td>
                      <td className="small muted">{date(c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Colis par statut">
          <div className="bars">
            {s.colis.parStatut.filter((p) => p.total > 0).map((p) => (
              <div key={p.statut} className="bar-row cliquable" onClick={() => navigate(`/colis?statut=${p.statut}`)}>
                <span>{STATUTS_COLIS[p.statut]?.label ?? p.statut}</span>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${(p.total / max) * 100}%` }} /></div>
                <span className="right">{p.total}</span>
              </div>
            ))}
            {s.colis.total === 0 && <Empty>Aucun colis</Empty>}
          </div>
        </Card>
      </div>

      <div className="grid grid-3">
        <Card title="Points d'attention" right={<Link className="small" to="/colis?enRetard=true">Tout voir</Link>}>
          {!attention.data ? <Loader /> : !attention.data.colisEnRetard.length && !attention.data.colisEnSouffrance.length && !incidents ? (
            <div className="muted small">Rien à signaler</div>
          ) : (
            <div className="bars">
              {incidents > 0 && (
                <div className="small">
                  <Badge ton="rouge">Incident</Badge> <Link to="/colis?statut=incident">{incidents} colis en incident</Link>
                </div>
              )}
              {attention.data.colisEnRetard.map((c) => (
                <div key={c.id} className="small">
                  <Badge ton="rouge">Retard</Badge> <Link to={`/colis/${c.id}`} className="mono">{c.reference}</Link>
                  <span className="muted"> · prévu le {date(c.dateLivraisonEstimee)}</span>
                </div>
              ))}
              {attention.data.colisEnSouffrance.map((c) => (
                <div key={c.id} className="small">
                  <Badge ton="orange">Souffrance</Badge> <Link to={`/colis/${c.id}`} className="mono">{c.reference}</Link>
                  <span className="muted"> · retrait avant le {date(c.dateLimiteRetrait)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Nouveaux clients" right={<Link className="small" to="/clients">Tous</Link>}>
          {!nouveauxClients.data ? <Loader /> : !nouveauxClients.data.length ? <div className="muted small">Aucun</div> : (
            <div className="bars">
              {nouveauxClients.data.map((u) => (
                <div key={u.id} className="small">
                  <Link to={`/clients/${u.id}`}>{nomComplet(u)}</Link>
                  <span className="muted"> · {libelle(PAYS, u.pays)} · {date(u.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Dernières activités" right={<Link className="small" to="/journal">Journal</Link>}>
          {!activites.data ? <Loader /> : !activites.data.length ? <div className="muted small">Aucune</div> : (
            <div className="bars">
              {activites.data.map((a) => (
                <div key={a.id} className="small">
                  <span className="mono">{a.action}</span>
                  <span className="muted"> · {nomComplet(a.User)} · {dateHeure(a.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
