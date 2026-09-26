import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import type { Personne } from '@/api/types';
import { Badge, Card, Chips, Empty, ErrorBox, KV, Loader, Stat } from '@/components/ui';
import { CATEGORIES, CATEGORIES_COURT, PAYS, libelle } from '@/lib/labels';
import { montant, nomComplet } from '@/lib/format';

interface Kpis {
  ventes: { devise: string; commandes: number; chiffreAffaires: number; panierMoyen: number; clients: number; revenuParClient: number }[];
  clientsActifs: number;
  tauxFidelisation: number;
  nouveauxClients: number;
  partCommandesNouveauxClients: number;
  parCategorie: { categorie: string; total: number }[];
  marge?: { devise: string; margeMoyenne: number | null; tauxMarge: number | null; margeTotale: number; colisAvecCout: number; couverture: number }[];
  tauxConversion?: number;
  tauxConversionVisiteurs?: number;
}

interface Conversion {
  simulations: number;
  simulationsConverties: number;
  simulationsSansCompteAbandonnees: number;
  tauxConversionSimulations: number;
  commandes: number;
  partCommandesIssuesDeSimulation: number;
  visiteurs: number;
  tauxConversionVisiteurs: number;
  parCategorie: { categorie: string; simulations: number; converties: number; tauxConversion: number }[];
}

interface Marketing {
  trafic: { visites: number; visiteursUniques: number; pagesVues: number; pagesParVisite: number; tauxRebond: number; parJour: { jour: string; visites: number; visiteurs: number }[] };
  pourcentageVisiteursConnus: number;
  tempsPasse: { moyenneSecondes: number };
  sourcesTrafic: { source: string; visites: number; visiteurs: number; part: number }[];
  parPlateforme: { plateforme: string; visites: number }[];
  principauxReferents: { domaine: string; visites: number }[];
  campagnes: { campagne: string; source: string; visites: number }[];
}

interface Evaluations {
  total: number;
  publies: number;
  enAttente: number;
  rejetes: number;
  noteMoyenne: number | null;
  noteMoyennePubliee: number | null;
  tauxSatisfaction: number;
  tauxAvecCommentaire: number;
  repartition: { note: number; total: number }[];
}

interface Stock {
  seuilAlerte: number;
  emballages: { suivis: number; enRupture: number; sousLeSeuil: number; unitesEnStock: number; articles: { id: string; code: string; libelle: string; stock: number; etat: string }[] };
  pointsCollecte: { colisEnStock: number; satures: number; points: { id: string; code: string; nom: string; pays: string; colisEnStock: number; capaciteMaxColis: number | null; tauxOccupation: number | null }[] };
}

interface Pays { pays: string; libelle: string; devise: string; expeditionsDepart: number; expeditionsArrivee: number; pointsActifs: number; colisEnStock: number; clients: number }

const PERIODES = [
  { value: '7', label: '7 jours' },
  { value: '30', label: '30 jours' },
  { value: '90', label: '90 jours' },
  { value: '365', label: '12 mois' },
];

const pct = (n?: number | null) => (n == null ? '—' : `${n.toLocaleString('fr-FR')} %`);
const duree = (s: number) => (s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`);

function Barres({ lignes }: { lignes: { label: string; valeur: number; suffixe?: string }[] }) {
  const max = Math.max(1, ...lignes.map((l) => l.valeur));
  if (!lignes.length) return <div className="muted small">Aucune donnée</div>;
  return (
    <div className="bars">
      {lignes.map((l) => (
        <div key={l.label} className="bar-row">
          <span>{l.label}</span>
          <div className="bar-track"><div className="bar-fill" style={{ width: `${(l.valeur / max) * 100}%` }} /></div>
          <span className="right">{l.valeur.toLocaleString('fr-FR')}{l.suffixe ?? ''}</span>
        </div>
      ))}
    </div>
  );
}

export default function AnalysesPage() {
  const [jours, setJours] = useState('30');
  const fin = new Date();
  const debut = new Date(fin.getTime() - Number(jours) * 86_400_000);
  const periode = { dateDebut: debut.toISOString().slice(0, 10), dateFin: fin.toISOString().slice(0, 10) };

  const get = <T,>(cle: string, url: string, avecPeriode = true) =>
    useQuery({ queryKey: ['dashboard', cle, avecPeriode ? jours : ''], queryFn: () => api.get<Record<string, T>>(url, avecPeriode ? periode : undefined).then((r) => r[cle]) });

  const kpis = get<Kpis>('kpis', '/admin/dashboard/kpis');
  const conversion = get<Conversion>('conversion', '/admin/dashboard/conversion');
  const marketing = get<Marketing>('marketing', '/admin/dashboard/marketing');
  const evaluations = get<Evaluations>('evaluations', '/admin/dashboard/evaluations');
  const stock = get<Stock>('stock', '/admin/dashboard/stock', false);
  const pays = get<Pays[]>('pays', '/admin/dashboard/par-pays', false);
  const actifs = get<{ client: Personne & { typeCompte?: string }; nbColis: number }[]>('utilisateurs', '/admin/dashboard/utilisateurs-actifs', false);
  const departs = get<{ ville: { nom: string; pays: string } | null; total: number }[]>('villes', '/admin/dashboard/villes-depart', false);
  const arrivees = useQuery({
    queryKey: ['dashboard', 'villes-arrivee'],
    queryFn: () => api.get<{ villes: { ville: { nom: string } | null; total: number }[] }>('/admin/dashboard/villes-arrivee').then((r) => r.villes),
  });

  const k = kpis.data;
  const c = conversion.data;
  const m = marketing.data;
  const e = evaluations.data;

  return (
    <>
      <div className="toolbar">
        <span className="small muted">Période :</span>
        <Chips options={PERIODES} value={jours} onChange={setJours} />
      </div>

      <ErrorBox error={kpis.error ?? conversion.error ?? marketing.error ?? evaluations.error} />

      <div className="section-label">Ventes et clients</div>
      {kpis.isLoading ? <Loader /> : k && (
        <div className="stats">
          {k.ventes.map((v) => (
            <Stat key={v.devise} icon="coins" ton="vert" value={montant(v.chiffreAffaires, v.devise)} label={`Chiffre d'affaires ${v.devise}`}
              hint={`${v.commandes} commandes · panier ${montant(v.panierMoyen, v.devise)} · ${montant(v.revenuParClient, v.devise)}/client`} />
          ))}
          <Stat icon="users" value={k.clientsActifs} label="Clients actifs" hint={`${k.nouveauxClients} nouveaux · ${pct(k.partCommandesNouveauxClients)} des commandes`} />
          <Stat icon="refresh-cw" ton="violet" value={pct(k.tauxFidelisation)} label="Taux de fidélisation" hint="Clients ayant commandé 2 fois ou plus" />
          {k.marge?.map((mg) => (
            <Stat key={mg.devise} icon="scale" ton="cyan"
              value={mg.margeMoyenne != null ? montant(mg.margeMoyenne, mg.devise) : '—'}
              label={`Marge moyenne ${mg.devise}`}
              hint={`${pct(mg.tauxMarge)} · ${mg.colisAvecCout} colis avec coût (${pct(mg.couverture)})`} />
          ))}
        </div>
      )}

      <div className="grid grid-2">
        <Card title="Conversion">
          {conversion.isLoading ? <Loader /> : c && (
            <>
              <div className="kv">
                <KV label="Simulations">{c.simulations.toLocaleString('fr-FR')}</KV>
                <KV label="Converties en commande">{c.simulationsConverties} ({pct(c.tauxConversionSimulations)})</KV>
                <KV label="Abandons sans compte">{c.simulationsSansCompteAbandonnees}</KV>
                <KV label="Commandes issues d'une simulation">{pct(c.partCommandesIssuesDeSimulation)}</KV>
                <KV label="Visiteurs">{c.visiteurs.toLocaleString('fr-FR')}</KV>
                <KV label="Conversion visiteurs → commande">{pct(c.tauxConversionVisiteurs)}</KV>
              </div>
              <div className="section-label">Par catégorie</div>
              <Barres lignes={c.parCategorie.map((x) => ({ label: CATEGORIES_COURT[x.categorie] ?? x.categorie, valeur: x.tauxConversion, suffixe: ' %' }))} />
            </>
          )}
        </Card>

        <Card title="Commandes par catégorie">
          {k && <Barres lignes={k.parCategorie.map((x) => ({ label: libelle(CATEGORIES, x.categorie), valeur: x.total }))} />}
        </Card>
      </div>

      <div className="section-label">Trafic et marketing</div>
      {marketing.isLoading ? <Loader /> : m && (
        <>
          <div className="stats">
            <Stat icon="eye" value={m.trafic.visites.toLocaleString('fr-FR')} label="Visites" hint={`${m.trafic.visiteursUniques} visiteurs uniques`} />
            <Stat icon="layout-template" ton="violet" value={m.trafic.pagesParVisite.toLocaleString('fr-FR')} label="Pages par visite" hint={`${m.trafic.pagesVues} pages vues`} />
            <Stat icon="log-out" ton="orange" value={pct(m.trafic.tauxRebond)} label="Taux de rebond" />
            <Stat icon="clock" ton="cyan" value={duree(m.tempsPasse.moyenneSecondes)} label="Temps moyen passé" />
            <Stat icon="user" ton="vert" value={pct(m.pourcentageVisiteursConnus)} label="Visiteurs identifiés" />
          </div>
          <div className="grid grid-3">
            <Card title="Sources de trafic">
              <Barres lignes={m.sourcesTrafic.map((s) => ({ label: s.source, valeur: s.visites }))} />
            </Card>
            <Card title="Principaux référents">
              <Barres lignes={m.principauxReferents.map((r) => ({ label: r.domaine, valeur: r.visites }))} />
            </Card>
            <Card title="Plateformes et campagnes">
              <Barres lignes={m.parPlateforme.map((p) => ({ label: p.plateforme, valeur: p.visites }))} />
              {!!m.campagnes.length && (
                <>
                  <div className="section-label">Campagnes</div>
                  <Barres lignes={m.campagnes.map((x) => ({ label: `${x.campagne} (${x.source})`, valeur: x.visites }))} />
                </>
              )}
            </Card>
          </div>
          {!!m.trafic.parJour.length && (
            <Card title="Visites par jour">
              <Barres lignes={m.trafic.parJour.map((j) => ({ label: new Date(j.jour).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }), valeur: j.visites }))} />
            </Card>
          )}
        </>
      )}

      <div className="grid grid-2">
        <Card title="Avis clients" right={<Link to="/avis" className="small">Modérer</Link>}>
          {evaluations.isLoading ? <Loader /> : e && (
            <>
              <div className="kv">
                <KV label="Note moyenne">{e.noteMoyenne != null ? `${e.noteMoyenne.toFixed(1)} / 5` : '—'} <span className="muted small">(publiés : {e.noteMoyennePubliee?.toFixed(1) ?? '—'})</span></KV>
                <KV label="Satisfaction">{pct(e.tauxSatisfaction)}</KV>
                <KV label="Avis">{e.total} · {e.publies} publiés · {e.enAttente} à modérer · {e.rejetes} rejetés</KV>
                <KV label="Avec commentaire">{pct(e.tauxAvecCommentaire)}</KV>
              </div>
              <div className="section-label">Répartition</div>
              <Barres lignes={[5, 4, 3, 2, 1].map((n) => ({ label: '★'.repeat(n), valeur: e.repartition.find((r) => r.note === n)?.total ?? 0 }))} />
            </>
          )}
        </Card>

        <Card title="Stock" right={stock.data && <span className="small muted">Alerte sous {stock.data.seuilAlerte} unités</span>}>
          {stock.isLoading ? <Loader /> : stock.data && (
            <>
              <div className="kv">
                <KV label="Emballages suivis">{stock.data.emballages.suivis} · {stock.data.emballages.unitesEnStock} unités</KV>
                <KV label="Alertes">
                  {stock.data.emballages.enRupture > 0 && <Badge ton="rouge">{stock.data.emballages.enRupture} en rupture</Badge>}{' '}
                  {stock.data.emballages.sousLeSeuil > 0 && <Badge ton="orange">{stock.data.emballages.sousLeSeuil} sous le seuil</Badge>}
                  {!stock.data.emballages.enRupture && !stock.data.emballages.sousLeSeuil && 'Aucune'}
                </KV>
                <KV label="Colis dans les points">{stock.data.pointsCollecte.colisEnStock}</KV>
                <KV label="Points saturés">{stock.data.pointsCollecte.satures}</KV>
              </div>
              <div className="section-label">Emballages</div>
              <table>
                <tbody>
                  {stock.data.emballages.articles.map((a) => (
                    <tr key={a.id}>
                      <td className="small">{a.libelle}</td>
                      <td className="right"><Badge ton={a.etat === 'rupture' ? 'rouge' : a.etat === 'faible' ? 'orange' : 'vert'}>{a.stock}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="section-label">Occupation des points</div>
              <Barres lignes={stock.data.pointsCollecte.points.map((p) => ({ label: p.code, valeur: p.colisEnStock }))} />
            </>
          )}
        </Card>
      </div>

      <div className="section-label">Réseau et clientèle</div>
      <div className="grid grid-3">
        <Card title="Par pays">
          {!pays.data ? <Loader /> : pays.data.map((p) => (
            <div key={p.pays} style={{ marginBottom: 10 }}>
              <strong>{p.libelle}</strong>
              <div className="small muted">
                {p.expeditionsDepart} départs · {p.expeditionsArrivee} arrivées · {p.clients} clients · {p.pointsActifs} points · {p.colisEnStock} colis en stock
              </div>
            </div>
          ))}
        </Card>
        <Card title="Villes de départ">
          <Barres lignes={(departs.data ?? []).map((v) => ({ label: v.ville ? `${v.ville.nom}` : '—', valeur: v.total }))} />
        </Card>
        <Card title="Destinations">
          <Barres lignes={(arrivees.data ?? []).map((v) => ({ label: v.ville?.nom ?? '—', valeur: v.total }))} />
        </Card>
      </div>

      <Card title="Clients les plus actifs" flush>
        {!actifs.data?.length ? <Empty>Aucune donnée</Empty> : (
          <table>
            <thead><tr><th>Client</th><th>Email</th><th>Compte</th><th className="right">Colis</th></tr></thead>
            <tbody>
              {actifs.data.map((a) => (
                <tr key={a.client.id}>
                  <td><Link to={`/clients/${a.client.id}`}>{nomComplet(a.client)}</Link></td>
                  <td className="small">{a.client.email}</td>
                  <td>{a.client.typeCompte === 'entreprise' ? <Badge ton="violet">Pro</Badge> : <Badge>Particulier</Badge>}</td>
                  <td className="right">{a.nbColis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <p className="small muted">Pays : {Object.values(PAYS).join(' et ')}. Les indicateurs sont recalculés au plus toutes les minutes par le serveur.</p>
    </>
  );
}
