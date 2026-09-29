import { Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Icon from './Icon';
import NotificationsBell from './NotificationsBell';
import { Loader } from './ui';
import ErrorBoundary from './ErrorBoundary';
import logo from '@/logo.png';
import { useAuth } from '@/auth/store';
import { api } from '@/api/client';
import { ROLES } from '@/lib/labels';
import { initiales, nomComplet } from '@/lib/format';
import { D, R } from '@/lib/routes';

type Page = { to: string; label: string; icon: string; sub: string };
type Entree = { section: string } | Page;

const NAV: Entree[] = [
  { section: 'Pilotage' },
  { to: R.tableauDeBord, label: 'Tableau de bord', icon: 'layout-dashboard', sub: "Vue d'ensemble de l'activité" },
  { to: R.analyses, label: 'Analyses', icon: 'activity', sub: 'Ventes, conversion, trafic, avis et stock' },
  { section: 'Opérations' },
  { to: R.colis, label: 'Colis', icon: 'package', sub: 'Expéditions, étude des demandes et suivi' },
  { to: R.conteneurs, label: 'Conteneurs', icon: 'ship', sub: 'Départs groupés, chargement et coûts' },
  { to: R.enlevements, label: 'Enlèvements', icon: 'truck', sub: 'Collectes à domicile et feuilles de route' },
  { to: R.tournees, label: 'Tournées de collecte', icon: 'calendar', sub: 'Collectes programmées par zone' },
  { to: R.douane, label: 'Douane', icon: 'file-text', sub: 'Déclarations et dédouanement' },
  { to: R.inventaire, label: 'Inventaire', icon: 'clipboard-list', sub: 'Produits chargés par conteneur ou tournée' },
  { to: R.reclamations, label: 'Réclamations', icon: 'life-buoy', sub: 'Service après-vente' },
  { section: 'Finance' },
  { to: R.factures, label: 'Factures', icon: 'file-text', sub: 'Facturation multi-devise, avoirs, relances' },
  { to: R.paiements, label: 'Paiements', icon: 'credit-card', sub: 'Encaissements, caisse et remboursements' },
  { section: 'Clients & équipe' },
  { to: R.clients, label: 'Clients', icon: 'users', sub: 'Comptes clients et conditions commerciales' },
  { to: R.parrainage, label: 'Parrainage', icon: 'sparkles', sub: 'Parrains, filleuls et crédits' },
  { to: R.personnel, label: 'Personnel', icon: 'user', sub: 'Coursiers et agents de point' },
  { to: R.administrateurs, label: 'Administrateurs', icon: 'lock', sub: 'Comptes du back-office' },
  { section: 'Réseau' },
  { to: R.pointsCollecte, label: 'Points de collecte', icon: 'map-pin', sub: 'Réseau France et Sénégal' },
  { to: R.villes, label: 'Villes', icon: 'building', sub: 'Référentiel géographique' },
  { to: R.zones, label: 'Zones', icon: 'grid', sub: 'Zones tarifaires' },
  { section: 'Tarification' },
  { to: R.services, label: 'Services', icon: 'ship', sub: "Offres d'expédition et délais" },
  { to: R.tarifs, label: 'Tarifs au poids', icon: 'scale', sub: 'Grille service × corridor × poids' },
  { to: R.grilleTarifaire, label: 'Grille forfaitaire', icon: 'tag', sub: 'Prix forfaitaires par article' },
  { to: R.surcharges, label: 'Surcharges', icon: 'coins', sub: 'Carburant, zone éloignée, options…' },
  { to: R.joursFeries, label: 'Jours fériés', icon: 'calendar', sub: 'Calendrier des jours non ouvrés' },
  { section: 'Catalogue & contenus' },
  { to: R.emballages, label: 'Emballages', icon: 'shopping-bag', sub: 'Barigots, cartons et prestations' },
  { to: R.annonces, label: 'Annonces', icon: 'message-square', sub: "Messages sur l'accueil de l'application" },
  { to: R.avis, label: 'Avis clients', icon: 'star', sub: 'Modération des évaluations' },
  { to: R.faq, label: 'FAQ', icon: 'inbox', sub: 'Questions fréquentes' },
  { to: R.versionsApp, label: "Versions de l'app", icon: 'smartphone', sub: "Mises à jour de l'application mobile" },
  { section: 'Système' },
  { to: R.parametres, label: 'Paramètres', icon: 'settings', sub: 'Réglages du moteur métier' },
  { to: R.modelesEmails, label: "Modèles d'email", icon: 'mail', sub: 'Emails envoyés aux clients' },
  { to: R.suppressionsCompte, label: 'Suppressions de compte', icon: 'trash-2', sub: 'Demandes RGPD' },
  { to: R.journal, label: "Journal d'activité", icon: 'activity', sub: 'Traçabilité des actions' },
];

// Pages accessibles hors menu (bandeau), pour le titre
const AUTRES: Page[] = [
  { to: R.profil, label: 'Mon profil', icon: 'user', sub: 'Informations, mot de passe et notifications' },
  { to: R.notifications, label: 'Notifications', icon: 'inbox', sub: 'Alertes du back-office' },
];

const PAGES = [...NAV.filter((e): e is Page => 'to' in e), ...AUTRES];

// Page de détail → écran de liste dont elle dépend (titre du bandeau, entrée de menu active)
const LISTE_DU_DETAIL: [string, string][] = [
  [D.colis, R.colis],
  [D.conteneur, R.conteneurs],
  [D.douane, R.douane],
  [D.reclamation, R.reclamations],
  [D.facture, R.factures],
  [D.client, R.clients],
  [D.pointCollecte, R.pointsCollecte],
];
const ecranDe = (chemin: string) => LISTE_DU_DETAIL.find(([d]) => chemin.startsWith(`${d}/`))?.[1] ?? chemin;

export default function Layout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { utilisateur, refreshToken, clear } = useAuth();
  const [ouvert, setOuvert] = useState(false);
  const [sortie, setSortie] = useState(false);

  // Menu mobile : Échap le referme
  useEffect(() => {
    if (!ouvert) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOuvert(false);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [ouvert]);

  // Page courante : la plus longue route qui préfixe l'URL (/colis/123 → Colis)
  const page =
    PAGES.filter((p) => ecranDe(pathname).startsWith(p.to)).sort(
      (a, b) => b.to.length - a.to.length
    )[0] ?? { to: pathname, label: 'Page introuvable', icon: 'alert-triangle', sub: '' };

  const deconnexion = async () => {
    if (sortie) return;
    setSortie(true);
    try {
      await api.post('/auth/logout', { refreshToken });
    } catch {
      // La session locale est effacée même si l'API ne répond pas
    }
    clear();
    navigate(R.connexion);
  };

  return (
    <div className="app">
      {ouvert && <div className="sb-voile" onClick={() => setOuvert(false)} aria-hidden="true" />}
      <aside className={`sb${ouvert ? ' open' : ''}`}>
        <div className="sb-top">
          <img className="sb-logo" src={logo} alt="Yobante" />
          <div>
            <div className="sb-name">Yobante Colis</div>
            <div className="sb-sub">Administration France ⇄ Sénégal</div>
          </div>
        </div>
        <nav className="nav" aria-label="Navigation principale">
          {NAV.map((e, i) =>
            'section' in e ? (
              <div key={i} className="nav-section">
                {e.section}
              </div>
            ) : (
              <NavLink
                key={e.to}
                to={e.to}
                className={({ isActive }) => `nav-item${isActive || ecranDe(pathname) === e.to ? ' active' : ''}`}
                onClick={() => setOuvert(false)}
              >
                <Icon name={e.icon} size={17} />
                {e.label}
              </NavLink>
            )
          )}
        </nav>
        <div className="sb-foot">
          <div className="user-pill">
            <Link to={R.profil} className="ava" title="Mon profil" onClick={() => setOuvert(false)}>{initiales(utilisateur)}</Link>
            <Link to={R.profil} className="user-info" style={{ color: 'inherit' }} onClick={() => setOuvert(false)}>
              <div className="user-name">{nomComplet(utilisateur)}</div>
              <div className="user-role">{ROLES[utilisateur?.role ?? ''] ?? utilisateur?.role}</div>
            </Link>
            <button className="btn ghost sm" onClick={deconnexion} disabled={sortie} title="Déconnexion" aria-label="Déconnexion">
              <Icon name="log-out" size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="btn ghost sm burger" onClick={() => setOuvert((o) => !o)} aria-label="Menu" aria-expanded={ouvert}>
            <Icon name="grid" size={18} />
          </button>
          <div>
            <div className="page-title">{page.label}</div>
            <div className="page-sub">{page.sub}</div>
          </div>
          <div className="topbar-right">
            <NotificationsBell />
          </div>
        </header>
        <div className="content">
          {/* La barre latérale reste affichée pendant le chargement d'une page */}
          <ErrorBoundary cle={pathname}>
            <Suspense fallback={<Loader />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
